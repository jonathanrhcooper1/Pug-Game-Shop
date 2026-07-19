import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressKioskOrderPush(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressKioskOrderPush({ operation, inventoryPublicIds = [] } = {}) {
    const body = kioskOrderBody(operation, inventoryPublicIds)

    if (!body.order_id || !body.first_name || !body.last_name || body.inventory_public_ids.length === 0) {
      return {
        status: "blocked",
        code: "wordpress_kiosk_order_payload_invalid",
        message: "Queued kiosk order is missing pickup name, order ID, or inventory items.",
        errors: ["kiosk_order_identity_required"],
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    }

    const endpoint = new URL(`${endpointBase}/kiosk/orders`)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: authorizationHeader,
          "content-type": "application/json",
          "idempotency-key": String(operation?.operation_id ?? body.order_id),
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      })
      const responseBody = await safeJson(response)
      const data = responseBody?.data && typeof responseBody.data === "object" ? responseBody.data : {}

      if (!response?.ok || data.accepted !== true) {
        return {
          status: "blocked",
          code: "wordpress_kiosk_order_push_rejected",
          http_status: Number(response?.status ?? 0),
          wordpress_code: String(data?.code ?? responseBody?.error?.code ?? ""),
          message: "WordPress kiosk order endpoint rejected this queued pickup order.",
          errors: Array.isArray(responseBody?.error?.details?.errors) ? responseBody.error.details.errors : [],
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      return {
        status: "ok",
        code: "wordpress_kiosk_order_reserved",
        http_status: Number(response.status ?? 201),
        wordpress_code: String(data.code ?? "kiosk_order_reserved"),
        order: kioskOrderResponseData(data.order),
        reservations: Array.isArray(data.reservations) ? data.reservations.map(kioskReservationResponseData) : [],
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_kiosk_order_push_unavailable",
        message: error instanceof Error ? error.message : "WordPress kiosk order push unavailable.",
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

export function kioskOrderBody(operation = {}, inventoryPublicIds = []) {
  const payload = operation?.payload && typeof operation.payload === "object" ? operation.payload : {}

  return {
    order_id: cleanId(payload.order_id ?? operation.entity_id ?? operation.operation_id),
    first_name: cleanText(payload.first_name),
    last_name: cleanText(payload.last_name),
    inventory_public_ids: [...new Set(inventoryPublicIds.map(cleanId).filter(Boolean))],
    source: "offline_lan_sync",
  }
}

function kioskOrderResponseData(order = {}) {
  return {
    order_id: cleanId(order.order_id),
    first_name: cleanText(order.first_name),
    last_name: cleanText(order.last_name),
    status: cleanText(order.status),
    reservation_count: positiveInt(order.reservation_count) ?? 0,
  }
}

function kioskReservationResponseData(reservation = {}) {
  return {
    reservation_id: positiveInt(reservation.reservation_id) ?? 0,
    inventory_public_id: cleanId(reservation.inventory_public_id),
    status: cleanText(reservation.status),
    expires_at: cleanText(reservation.expires_at),
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

function cleanId(value) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 191)
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "10000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 10000
}
