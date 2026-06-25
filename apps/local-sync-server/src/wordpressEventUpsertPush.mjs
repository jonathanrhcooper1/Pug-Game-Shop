import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressEventUpsertPush(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressEventUpsertPush({ operation } = {}) {
    const body = eventUpsertBody(operation)

    if (!body.title || !body.starts_at_utc) {
      return {
        status: "blocked",
        code: "wordpress_event_payload_invalid",
        message: "Queued event is missing title or start date/time.",
        errors: ["event_identity_required"],
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    }

    const endpoint = new URL(`${endpointBase}/events`)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: authorizationHeader,
          "content-type": "application/json",
          "idempotency-key": String(operation?.operation_id ?? body.event_id ?? body.slug),
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      })
      const responseBody = await safeJson(response)
      const data = responseBody?.data && typeof responseBody.data === "object" ? responseBody.data : {}

      if (!response?.ok || data.accepted !== true) {
        return {
          status: "blocked",
          code: "wordpress_event_push_rejected",
          http_status: Number(response?.status ?? 0),
          wordpress_code: String(data?.code ?? responseBody?.error?.code ?? ""),
          message: "WordPress event endpoint rejected this queued event.",
          errors: Array.isArray(responseBody?.error?.errors)
            ? responseBody.error.errors
            : Array.isArray(responseBody?.error?.details?.errors)
              ? responseBody.error.details.errors
              : [],
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      return {
        status: "ok",
        code: "wordpress_event_created",
        http_status: Number(response.status ?? 201),
        wordpress_code: String(data.code ?? "event_created"),
        event: eventResponseData(data.event),
        woocommerce_product_created: Boolean(data.woocommerce_product_created),
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_event_push_unavailable",
        message: error instanceof Error ? error.message : "WordPress event push unavailable.",
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

export function eventUpsertBody(operation = {}) {
  const event = operation?.payload?.event && typeof operation.payload.event === "object" ? operation.payload.event : {}

  return {
    event_id: cleanText(event.event_id ?? operation.entity_id),
    slug: cleanSlug(event.slug),
    title: cleanText(event.title),
    starts_at_utc: cleanText(event.starts_at_utc),
    event_type: cleanSlug(event.event_type || "tournament"),
    game: cleanSlug(event.game || "pokemon"),
    capacity: positiveInt(event.capacity) ?? 16,
    entry_fee: moneyFromMinorUnits(event.entry_fee_minor_units),
    registration_deadline: cleanText(event.registration_deadline_utc),
    location_label: cleanText(event.location_label),
    description: cleanText(event.note),
    published: true,
    source: "offline_lan_sync",
    actor_id: cleanText(operation?.payload?.actor_id),
    actor_name: cleanText(operation?.payload?.actor_name),
  }
}

function eventResponseData(event = {}) {
  return {
    event_id: cleanText(event.public_id ?? event.event_id ?? event.id),
    slug: cleanSlug(event.slug),
    row_version: positiveInt(event.row_version) ?? 1,
    title: cleanText(event.title),
    starts_at_utc: cleanText(event.start_datetime ?? event.starts_at_utc),
    starts_at_label: cleanText(event.starts_at_label),
    event_type: cleanSlug(event.event_type),
    game: cleanSlug(event.game),
    entry_fee_minor_units: moneyMinorUnits(event.entry_fee),
    registration_deadline_utc: cleanText(event.registration_deadline),
    woocommerce_product_id: positiveInt(event.woocommerce_product_id) ?? 0,
    registration_status: cleanSlug(event.registration_status),
    capacity: positiveInt(event.player_cap ?? event.capacity) ?? 0,
    registered_count: positiveInt(event.registered_count) ?? 0,
    location_label: cleanText(event.location_label ?? event.event_type),
    note: cleanText(event.description),
    source: "accepted",
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

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 191)
}

function cleanSlug(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 191)
}

function moneyFromMinorUnits(value) {
  const minorUnits = Number.parseInt(String(value ?? "0"), 10)

  return Number.isFinite(minorUnits) ? (Math.max(0, minorUnits) / 100).toFixed(2) : "0.00"
}

function moneyMinorUnits(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""))

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "10000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 10000
}
