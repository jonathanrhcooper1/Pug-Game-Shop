import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressEventCheckinPush(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressEventCheckinPush({ operation } = {}) {
    const body = eventCheckinBody(operation)
    const eventSlug = cleanSlug(
      operation?.payload?.event?.slug ??
        operation?.payload?.event?.event_slug ??
        operation?.payload?.event?.event_id ??
        body.event_slug,
    )

    if (!eventSlug || (!body.registration_public_id && !body.email && !body.attendee_label) || !body.local_checkin_id) {
      return {
        status: "blocked",
        code: "wordpress_event_checkin_payload_invalid",
        message: "Queued event check-in is missing an event slug, attendee identity, or local check-in ID.",
        errors: ["event_checkin_identity_required"],
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    }

    const endpoint = new URL(`${endpointBase}/events/${encodeURIComponent(eventSlug)}/check-ins`)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: authorizationHeader,
          "content-type": "application/json",
          "idempotency-key": String(operation?.operation_id ?? body.local_checkin_id),
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      })
      const responseBody = await safeJson(response)
      const data = responseBody?.data && typeof responseBody.data === "object" ? responseBody.data : {}

      if (!response?.ok || data.accepted !== true) {
        return {
          status: "blocked",
          code: "wordpress_event_checkin_rejected",
          http_status: Number(response?.status ?? 0),
          wordpress_code: String(data?.code ?? responseBody?.error?.code ?? ""),
          message: "WordPress event check-in endpoint rejected this queued check-in.",
          errors: Array.isArray(responseBody?.error?.details?.errors) ? responseBody.error.details.errors : [],
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      return {
        status: "ok",
        code: "wordpress_event_checkin_recorded",
        http_status: Number(response.status ?? 201),
        wordpress_code: String(data.code ?? "event_checked_in"),
        checkin: eventCheckinResponseData(data.checkin, data),
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_event_checkin_unavailable",
        message: error instanceof Error ? error.message : "WordPress event check-in push unavailable.",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }
}

export function eventCheckinBody(operation = {}) {
  const payload = operation?.payload && typeof operation.payload === "object" ? operation.payload : {}
  const checkin = payload.checkin && typeof payload.checkin === "object" ? payload.checkin : {}
  const event = payload.event && typeof payload.event === "object" ? payload.event : {}

  return {
    event_slug: cleanSlug(event.slug ?? event.event_slug ?? event.event_id),
    registration_public_id: cleanId(checkin.registration_public_id),
    email: cleanEmail(checkin.email),
    attendee_label: cleanText(checkin.attendee_label),
    checkin_method: cleanMethod(checkin.checkin_method),
    local_checkin_id: cleanId(checkin.checkin_id ?? operation.entity_id ?? operation.operation_id),
    source: "offline_lan_sync",
  }
}

function eventCheckinResponseData(checkin = {}, data = {}) {
  return {
    checkin_id: positiveInt(checkin.checkin_id) ?? 0,
    event_public_id: cleanId(checkin.event_public_id),
    event_slug: cleanSlug(checkin.event_slug),
    registration_id: positiveInt(checkin.registration_id) ?? 0,
    checkin_method: cleanMethod(checkin.checkin_method),
    device_id: cleanText(checkin.device_id),
    checked_in_at: cleanText(checkin.checked_in_at),
    accepted: true,
    idempotent: Boolean(data.idempotent),
  }
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function secretSafeEndpoint(endpoint) {
  const safe = new URL(endpoint.toString())
  safe.searchParams.delete("token")
  safe.searchParams.delete("key")
  safe.searchParams.delete("api_key")

  return safe.toString()
}

function positiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function cleanEmail(value) {
  const email = String(value ?? "").trim().toLowerCase().slice(0, 191)

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 191)
}

function cleanId(value) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 191)
}

function cleanSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 191)
}

function cleanMethod(value) {
  const method = String(value ?? "manual_lookup")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/(^_|_$)/g, "")
    .slice(0, 64)

  return method || "manual_lookup"
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "10000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 10000
}
