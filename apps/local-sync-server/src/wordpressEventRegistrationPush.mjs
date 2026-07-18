import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressEventRegistrationPush(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function") {
    return null
  }

  return async function wordpressEventRegistrationPush({ operation } = {}) {
    const body = eventRegistrationBody(operation)
    const eventSlug = cleanSlug(
      operation?.payload?.event?.slug ??
        operation?.payload?.event?.event_slug ??
        operation?.payload?.event?.event_id ??
        body.event_slug,
    )

    if (!eventSlug || !body.first_name || !body.last_name || !body.email) {
      return {
        status: "blocked",
        code: "wordpress_event_registration_payload_invalid",
        message: "Queued event registration is missing an event slug, attendee name, or email.",
        errors: ["event_slug_or_attendee_required"],
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    }

    const endpoint = new URL(`${endpointBase}/events/${encodeURIComponent(eventSlug)}/register`)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: cleanHeaders({
          accept: "application/json",
          authorization: authorizationHeader,
          "content-type": "application/json",
          "idempotency-key": String(operation?.operation_id ?? body.idempotency_key),
        }),
        body: JSON.stringify(body),
        signal: controller?.signal,
      })
      const responseBody = await safeJson(response)

      if (!response?.ok || !responseBody?.success) {
        return {
          status: "blocked",
          code: "wordpress_event_registration_rejected",
          http_status: Number(response?.status ?? 0),
          wordpress_code: String(responseBody?.code ?? ""),
          message: "WordPress event registration rejected this queued registration.",
          errors: Array.isArray(responseBody?.errors) ? responseBody.errors : [],
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      return {
        status: "ok",
        code: "wordpress_event_registration_created",
        http_status: Number(response.status ?? 201),
        wordpress_code: String(responseBody.code ?? "registered"),
        registration: eventRegistrationResponseData(responseBody),
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_event_registration_unavailable",
        message: error instanceof Error ? error.message : "WordPress event registration push unavailable.",
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

export function eventRegistrationBody(operation = {}) {
  const payload = operation?.payload && typeof operation.payload === "object" ? operation.payload : {}
  const registration = payload.registration && typeof payload.registration === "object" ? payload.registration : {}
  const event = payload.event && typeof payload.event === "object" ? payload.event : {}
  const label = cleanAttendeeLabel(registration.attendee_label ?? payload.attendee_label)
  const names = splitAttendeeName(label)
  const registrationId = cleanId(registration.registration_id ?? operation.entity_id ?? operation.operation_id)
  const email = cleanEmail(registration.email) || syntheticEmail(registrationId || cleanId(operation.operation_id))
  const firstName = cleanAttendeeLabel(registration.first_name) || names.firstName
  const lastName = cleanAttendeeLabel(registration.last_name) || names.lastName

  return {
    first_name: firstName,
    last_name: lastName,
    email,
    phone: cleanPhone(registration.phone),
    idempotency_key: cleanId(operation.operation_id ?? registrationId),
    event_slug: cleanSlug(event.slug ?? event.event_slug ?? event.event_id),
    local_registration_id: registrationId,
    source: "offline_lan_sync",
  }
}

function eventRegistrationResponseData(body) {
  const registration = body?.registration && typeof body.registration === "object" ? body.registration : {}

  return {
    public_id: String(registration.public_id ?? ""),
    event_id: Number.parseInt(String(registration.event_id ?? "0"), 10) || 0,
    status: String(registration.status ?? ""),
    payment_status: String(registration.payment_status ?? ""),
    email: String(registration.email ?? ""),
    created_at: String(registration.created_at ?? ""),
  }
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function cleanHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, value]) => typeof value === "string" && value.trim() !== ""),
  )
}

function secretSafeEndpoint(endpoint) {
  const safe = new URL(endpoint.toString())
  safe.searchParams.delete("token")
  safe.searchParams.delete("key")
  safe.searchParams.delete("api_key")

  return safe.toString()
}

function splitAttendeeName(label) {
  const parts = cleanAttendeeLabel(label).split(" ").filter(Boolean)

  if (parts.length === 0) {
    return { firstName: "Offline", lastName: "Guest" }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Guest" }
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1),
  }
}

function syntheticEmail(value) {
  const id = cleanId(value) || "offline-registration"

  return `${id.toLowerCase()}@offline-registration.example.invalid`
}

function cleanAttendeeLabel(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 160)
}

function cleanEmail(value) {
  const email = String(value ?? "").trim().toLowerCase().slice(0, 191)

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""
}

function cleanPhone(value) {
  return String(value ?? "").replace(/[^0-9+().\-\s]/g, "").trim().replace(/\s+/g, " ").slice(0, 50)
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

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "10000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 10000
}
