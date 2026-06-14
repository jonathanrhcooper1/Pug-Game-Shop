import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressFulfillmentPull(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)
  const defaultLimit = boundedLimit(options.limit)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressFulfillmentPull({ limit = defaultLimit, statuses = [] } = {}) {
    const endpoint = new URL(`${endpointBase}/fulfillment/orders`)
    endpoint.searchParams.set("limit", String(boundedLimit(limit)))

    const statusList = cleanStatusList(statuses)
    if (statusList.length > 0) {
      endpoint.searchParams.set("status", statusList.join(","))
    }

    return fetchFulfillmentEndpoint({
      endpoint,
      fetcher,
      timeoutMs,
      authorizationHeader,
      method: "GET",
      okCode: "wordpress_fulfillment_pull_ok",
      blockedCode: "wordpress_fulfillment_pull_http_error",
      unavailableCode: "wordpress_fulfillment_pull_unavailable",
    })
  }
}

export function createWordPressFulfillmentStatusPush(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressFulfillmentStatusPush({ orderId, status, operationId = "" } = {}) {
    const normalizedOrderId = positiveInt(orderId)
    const normalizedStatus = cleanFulfillmentStatus(status)

    if (!normalizedOrderId || !normalizedStatus) {
      return {
        status: "blocked",
        code: "wordpress_fulfillment_status_payload_invalid",
        message: "WooCommerce order ID and fulfillment status are required.",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    }

    const endpoint = new URL(`${endpointBase}/fulfillment/orders/${normalizedOrderId}/status`)

    return fetchFulfillmentEndpoint({
      endpoint,
      fetcher,
      timeoutMs,
      authorizationHeader,
      method: "PATCH",
      body: { status: normalizedStatus },
      idempotencyKey: cleanId(operationId) || `fulfillment-status-${normalizedOrderId}-${normalizedStatus}`,
      okCode: "wordpress_fulfillment_status_updated",
      blockedCode: "wordpress_fulfillment_status_http_error",
      unavailableCode: "wordpress_fulfillment_status_unavailable",
    })
  }
}

export function fulfillmentOrdersFromWordPressResponse(body) {
  const data = body?.data && typeof body.data === "object" ? body.data : body
  const candidates = Array.isArray(data?.orders) ? data.orders : []

  return candidates
    .filter((order) => order && typeof order === "object")
    .map(fulfillmentOrderResponseData)
    .filter((order) => order.order_id > 0 && order.items.length > 0)
}

export function fulfillmentOrderFromWordPressStatusResponse(body) {
  const data = body?.data && typeof body.data === "object" ? body.data : {}
  const order = data.order && typeof data.order === "object" ? data.order : null

  return order ? fulfillmentOrderResponseData(order) : null
}

async function fetchFulfillmentEndpoint({
  endpoint,
  fetcher,
  timeoutMs,
  authorizationHeader,
  method,
  body,
  idempotencyKey,
  okCode,
  blockedCode,
  unavailableCode,
}) {
  const controller = typeof AbortController === "function" ? new AbortController() : null
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const response = await fetcher(endpoint, {
      method,
      headers: cleanHeaders({
        accept: "application/json",
        authorization: authorizationHeader,
        "content-type": body ? "application/json" : "",
        "idempotency-key": idempotencyKey,
      }),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    })
    const responseBody = await safeJson(response)

    if (!response?.ok) {
      return {
        status: "blocked",
        code: blockedCode,
        http_status: Number(response?.status ?? 0),
        wordpress_code: String(responseBody?.error?.code ?? responseBody?.data?.code ?? ""),
        message: "WordPress fulfillment endpoint rejected this request.",
        orders: [],
        order: null,
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    }

    const order = fulfillmentOrderFromWordPressStatusResponse(responseBody)
    const orders = order ? [order] : fulfillmentOrdersFromWordPressResponse(responseBody)

    return {
      status: "ok",
      code: okCode,
      http_status: Number(response.status ?? 200),
      wordpress_code: String(responseBody?.data?.code ?? okCode),
      orders,
      order,
      order_count: orders.length,
      credentials_synced_to_client: false,
      authorization_header_printed: false,
      endpoint: secretSafeEndpoint(endpoint),
    }
  } catch (error) {
    return {
      status: "blocked",
      code: unavailableCode,
      message: error instanceof Error ? error.message : "WordPress fulfillment endpoint unavailable.",
      orders: [],
      order: null,
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

function fulfillmentOrderResponseData(order = {}) {
  return {
    order_id: positiveInt(order.order_id),
    order_number: cleanText(order.order_number),
    customer_name: cleanText(order.customer_name),
    order_status: cleanStatus(order.order_status),
    fulfillment_status: cleanFulfillmentStatus(order.fulfillment_status) || "awaiting_pull",
    payment_status: cleanText(order.payment_status) || "paid",
    shipping_method_id: cleanText(order.shipping_method_id),
    shipping_method_title: cleanText(order.shipping_method_title),
    local_pickup: order.local_pickup !== false,
    item_count: nonNegativeInt(order.item_count),
    total_minor_units: nonNegativeInt(order.total_minor_units),
    currency: cleanCurrency(order.currency),
    paid_at_utc: cleanIsoTimestamp(order.paid_at_utc),
    created_at_utc: cleanIsoTimestamp(order.created_at_utc),
    items: fulfillmentItems(order.items),
  }
}

function fulfillmentItems(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      order_item_id: positiveInt(item.order_item_id),
      inventory_id: positiveInt(item.inventory_id),
      reservation_id: positiveInt(item.reservation_id),
      barcode: cleanId(item.barcode),
      card_name: cleanText(item.card_name),
      set_name: cleanText(item.set_name),
      condition: cleanText(item.condition),
      price_minor_units: nonNegativeInt(item.price_minor_units),
      currency: cleanCurrency(item.currency),
      quantity: Math.max(1, nonNegativeInt(item.quantity) || 1),
    }))
    .filter((item) => item.inventory_id > 0 || item.reservation_id > 0 || item.card_name)
}

function cleanStatusList(value) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",")

  return raw.map(cleanStatus).filter(Boolean).slice(0, 12)
}

function cleanFulfillmentStatus(value) {
  const status = cleanStatus(value)

  return ["awaiting_pull", "pulling", "ready_for_pickup", "completed"].includes(status) ? status : ""
}

function cleanStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64)
}

function cleanCurrency(value) {
  const currency = String(value ?? "USD").trim().toUpperCase()

  return /^[A-Z]{3}$/.test(currency) ? currency : "USD"
}

function cleanHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, value]) => typeof value === "string" && value.trim() !== ""),
  )
}

function cleanId(value) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 191)
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 191)
}

function cleanIsoTimestamp(value) {
  const parsed = Date.parse(String(value ?? ""))

  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : ""
}

function positiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function nonNegativeInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function boundedLimit(value) {
  const parsed = Number.parseInt(String(value ?? "50"), 10)

  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 50
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "10000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 10000
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
