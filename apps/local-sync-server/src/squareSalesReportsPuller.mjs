const DEFAULT_SQUARE_API_VERSION = "2026-05-20"
const SQUARE_PRODUCTION_BASE_URL = "https://connect.squareup.com"
const SQUARE_SANDBOX_BASE_URL = "https://connect.squareupsandbox.com"
const DAY_MS = 24 * 60 * 60 * 1000

export function createSquareSalesReportsPuller(options = {}) {
  const accessToken = cleanSecret(options.accessToken)
  const locationId = cleanExternalId(options.locationId)
  const environment = cleanEnvironment(options.environment)
  const apiVersion = cleanApiVersion(options.apiVersion)
  const baseUrl = cleanBaseUrl(options.baseUrl) || squareBaseUrl(environment)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedInt(options.timeoutMs, 2_000, 120_000, 20_000)
  const maxPages = boundedInt(options.maxPages, 1, 50, 10)
  const defaultLookbackDays = boundedInt(options.defaultLookbackDays, 1, 90, 7)
  const now = typeof options.now === "function" ? options.now : () => new Date()
  let discoveredLocationId = ""

  function status() {
    return {
      configured: Boolean(accessToken && typeof fetcher === "function"),
      environment,
      location_id_configured: Boolean(locationId),
      location_auto_discovery_enabled: !locationId,
      discovered_location_id_configured: Boolean(discoveredLocationId),
      access_token_configured: Boolean(accessToken),
      api_version: apiVersion,
      max_pages: maxPages,
      default_lookback_days: defaultLookbackDays,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function pullSalesReport(input = {}) {
    if (!accessToken || typeof fetcher !== "function") {
      return blocked("square_sales_report_puller_unconfigured", "Square sales report polling is not configured.")
    }

    const requestedLocationId = cleanExternalId(input.locationId ?? input.location_id) || locationId
    const resolvedLocation = requestedLocationId
      ? { status: "ok", location_id: requestedLocationId, source: "configured" }
      : await discoverDefaultLocationId()

    if (resolvedLocation.status !== "ok") {
      return resolvedLocation
    }

    const range = cleanReportRange(input, { now, defaultLookbackDays })
    const paymentsResult = await listPayments({
      beginTime: range.date_from_utc,
      endTime: range.date_to_utc,
      locationId: resolvedLocation.location_id,
    })

    if (paymentsResult.status !== "ok") {
      return paymentsResult
    }

    const orderIds = uniqueValues(paymentsResult.payments.map((payment) => payment.order_id))
    const ordersResult = await batchRetrieveOrders(orderIds, resolvedLocation.location_id)

    if (ordersResult.status !== "ok") {
      return ordersResult
    }

    const report = buildSalesReport({
      payments: paymentsResult.payments,
      orders: ordersResult.orders,
      range,
      environment,
      locationId: resolvedLocation.location_id,
      locationIdSource: resolvedLocation.source,
      paymentCursorExhausted: paymentsResult.cursor_exhausted,
      paymentMaxPageGuardHit: paymentsResult.max_page_guard_hit,
      paymentPageCount: paymentsResult.page_count,
      orderRequestCount: ordersResult.request_count,
    })

    return {
      status: "ok",
      action: "square_sales_report_pulled",
      code: "square_sales_report_pulled",
      ...report,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function listPayments({ beginTime, endTime, locationId }) {
    const payments = []
    let cursor = ""
    let page = 0

    do {
      page += 1
      const endpoint = new URL(`${baseUrl}/v2/payments`)
      endpoint.searchParams.set("begin_time", beginTime)
      endpoint.searchParams.set("end_time", endTime)
      endpoint.searchParams.set("sort_order", "ASC")
      endpoint.searchParams.set("location_id", locationId)
      endpoint.searchParams.set("limit", "100")

      if (cursor) {
        endpoint.searchParams.set("cursor", cursor)
      }

      const result = await squareRequest(endpoint, { method: "GET" })

      if (result.status !== "ok") {
        return {
          ...result,
          code: result.code || "square_payments_pull_failed",
          message: result.message || "Square payments could not be pulled.",
        }
      }

      payments.push(...cleanPayments(result.payload?.payments))
      cursor = cleanExternalId(result.payload?.cursor)
    } while (cursor && page < maxPages)

    return {
      status: "ok",
      payments,
      page_count: page,
      cursor_exhausted: !cursor,
      max_page_guard_hit: Boolean(cursor),
    }
  }

  async function batchRetrieveOrders(orderIds, locationId) {
    if (orderIds.length === 0) {
      return {
        status: "ok",
        orders: [],
        request_count: 0,
      }
    }

    const orders = []
    let requestCount = 0

    for (const chunk of chunks(orderIds, 100)) {
      requestCount += 1
      const endpoint = new URL(`${baseUrl}/v2/orders/batch-retrieve`)
      const result = await squareRequest(endpoint, {
        method: "POST",
        body: {
          location_id: locationId,
          order_ids: chunk,
        },
      })

      if (result.status !== "ok") {
        return {
          ...result,
          code: result.code || "square_orders_pull_failed",
          message: result.message || "Square orders could not be pulled for payment line-item reporting.",
        }
      }

      orders.push(...cleanOrders(result.payload?.orders))
    }

    return {
      status: "ok",
      orders,
      request_count: requestCount,
    }
  }

  async function discoverDefaultLocationId() {
    if (discoveredLocationId) {
      return { status: "ok", location_id: discoveredLocationId, source: "discovered" }
    }

    const endpoint = new URL(`${baseUrl}/v2/locations`)
    const result = await squareRequest(endpoint, { method: "GET" })

    if (result.status !== "ok") {
      return {
        ...result,
        code: result.code || "square_locations_pull_failed",
        message:
          result.message ||
          "Square rejected the locations request; set PUG_SQUARE_LOCATION_ID manually or verify the access token.",
      }
    }

    const locations = Array.isArray(result.payload?.locations) ? result.payload.locations : []
    const activeLocations = locations.filter((location) => cleanExternalId(location?.id))
    const preferredLocation =
      activeLocations.find((location) => cleanText(location?.status).toUpperCase() === "ACTIVE") ??
      activeLocations[0]
    const nextLocationId = cleanExternalId(preferredLocation?.id)

    if (!nextLocationId) {
      return blocked(
        "square_location_id_required",
        "Square location auto-discovery found no active locations; set PUG_SQUARE_LOCATION_ID on the LAN server.",
      )
    }

    discoveredLocationId = nextLocationId
    return { status: "ok", location_id: discoveredLocationId, source: "discovered" }
  }

  async function squareRequest(endpoint, { method = "GET", body = null } = {}) {
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "square-version": apiVersion,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller?.signal,
      })
      const payload = await safeJson(response)

      if (!response?.ok) {
        return {
          status: "blocked",
          code: "square_report_pull_http_error",
          http_status: Number(response?.status ?? 0),
          message: "Square rejected the report request.",
          errors: publicSquareErrors(payload),
          endpoint: secretSafeEndpoint(endpoint),
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
      }

      return {
        status: "ok",
        http_status: Number(response.status ?? 200),
        payload,
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "square_report_pull_unavailable",
        message: error instanceof Error ? error.message : "Square report request unavailable.",
        endpoint: secretSafeEndpoint(endpoint),
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }

  return {
    configured: status().configured,
    status,
    pullSalesReport,
  }
}

function buildSalesReport({
  payments,
  orders,
  range,
  environment,
  locationId,
  locationIdSource,
  paymentCursorExhausted,
  paymentMaxPageGuardHit,
  paymentPageCount,
  orderRequestCount,
}) {
  const orderById = new Map(orders.map((order) => [order.order_id, order]))
  const rows = []

  for (const payment of payments) {
    const order = orderById.get(payment.order_id)
    const lineItems = Array.isArray(order?.line_items) ? order.line_items : []

    if (lineItems.length === 0) {
      rows.push(squarePaymentOnlyRow(payment))
      continue
    }

    for (const lineItem of lineItems) {
      rows.push(squareLineItemRow(payment, order, lineItem))
    }
  }

  const completedRows = rows.filter((row) => row.payment_status === "COMPLETED")
  const grossSalesMinorUnits = completedRows.reduce((total, row) => total + row.gross_sales_minor_units, 0)
  const refundedMinorUnits = payments.reduce((total, payment) => total + payment.refunded_money.amount, 0)
  const processingFeeMinorUnits = payments.reduce((total, payment) => total + payment.processing_fee_minor_units, 0)
  const currency = cleanCurrency(completedRows[0]?.currency ?? payments[0]?.total_money?.currency)

  return {
    report: "square_sales",
    environment,
    location_id: locationId,
    location_id_source: locationIdSource,
    date_from_utc: range.date_from_utc,
    date_to_utc: range.date_to_utc,
    payment_count: payments.length,
    completed_payment_count: payments.filter((payment) => payment.status === "COMPLETED").length,
    order_count: orders.length,
    line_item_count: rows.length,
    gross_sales_minor_units: grossSalesMinorUnits,
    gross_sales: formatMoney(grossSalesMinorUnits, currency),
    refunded_minor_units: refundedMinorUnits,
    refunded: formatMoney(refundedMinorUnits, currency),
    processing_fee_minor_units: processingFeeMinorUnits,
    processing_fee: formatMoney(processingFeeMinorUnits, currency),
    currency,
    rows,
    payments,
    orders,
    summary_by_date: summarizeRows(rows, (row) => row.date),
    summary_by_item: summarizeRows(rows, (row) =>
      [
        row.catalog_object_id || "unmapped",
        row.item_name || "Payment without line item",
      ].join("|"),
    ),
    payment_page_count: paymentPageCount,
    order_request_count: orderRequestCount,
    cursor_exhausted: paymentCursorExhausted,
    max_page_guard_hit: paymentMaxPageGuardHit,
    payment_capture_authority: "square_payments_api_read_only",
    customer_credit_authority: "local_store_credit_ledger_not_square",
    square_payment_capture_supported: false,
  }
}

function squareLineItemRow(payment, order, lineItem) {
  const grossSalesMoney = lineItem.total_money.amount > 0
    ? lineItem.total_money
    : lineItem.gross_sales_money.amount > 0
      ? lineItem.gross_sales_money
      : payment.total_money
  const currency = cleanCurrency(grossSalesMoney.currency || payment.total_money.currency)

  return {
    date: payment.created_at.slice(0, 10),
    channel: "square_pos_live",
    payment_id: payment.payment_id,
    payment_status: payment.status,
    order_id: order.order_id,
    receipt_number: payment.receipt_number,
    receipt_url: payment.receipt_url,
    payment_method: payment.source_type,
    card_brand: payment.card_brand,
    card_last_4: payment.card_last_4,
    team_member_id: payment.team_member_id,
    location_id: payment.location_id,
    item_name: lineItem.name,
    quantity: lineItem.quantity,
    catalog_object_id: lineItem.catalog_object_id,
    catalog_version: lineItem.catalog_version,
    sku: "",
    barcode: "",
    gross_sales_minor_units: grossSalesMoney.amount,
    gross_sales: formatMoney(grossSalesMoney.amount, currency),
    currency,
    source: "square_api_report",
  }
}

function squarePaymentOnlyRow(payment) {
  const currency = cleanCurrency(payment.total_money.currency)

  return {
    date: payment.created_at.slice(0, 10),
    channel: "square_pos_live",
    payment_id: payment.payment_id,
    payment_status: payment.status,
    order_id: payment.order_id,
    receipt_number: payment.receipt_number,
    receipt_url: payment.receipt_url,
    payment_method: payment.source_type,
    card_brand: payment.card_brand,
    card_last_4: payment.card_last_4,
    team_member_id: payment.team_member_id,
    location_id: payment.location_id,
    item_name: "Square payment without order line item",
    quantity: 1,
    catalog_object_id: "",
    catalog_version: null,
    sku: "",
    barcode: "",
    gross_sales_minor_units: payment.total_money.amount,
    gross_sales: formatMoney(payment.total_money.amount, currency),
    currency,
    source: "square_api_report",
  }
}

function summarizeRows(rows, keyFn) {
  const groups = new Map()

  for (const row of rows) {
    const key = cleanText(keyFn(row)) || "unknown"
    const current = groups.get(key) ?? {
      key,
      date: row.date,
      item_name: row.item_name,
      catalog_object_id: row.catalog_object_id,
      sku: row.sku,
      barcode: row.barcode,
      quantity: 0,
      gross_sales_minor_units: 0,
      gross_sales: "$0.00",
      currency: cleanCurrency(row.currency),
    }

    current.quantity += Number(row.quantity) || 0
    current.gross_sales_minor_units += Math.max(0, minorUnits(row.gross_sales_minor_units))
    current.gross_sales = formatMoney(current.gross_sales_minor_units, current.currency)
    groups.set(key, current)
  }

  return [...groups.values()]
}

function cleanPayments(value) {
  const payments = Array.isArray(value) ? value : []

  return payments
    .map((payment) => ({
      payment_id: cleanExternalId(payment?.id),
      created_at: cleanIsoTimestamp(payment?.created_at),
      updated_at: cleanIsoTimestamp(payment?.updated_at),
      status: cleanText(payment?.status).toUpperCase() || "UNKNOWN",
      source_type: cleanText(payment?.source_type).toUpperCase() || "UNKNOWN",
      location_id: cleanExternalId(payment?.location_id),
      order_id: cleanExternalId(payment?.order_id),
      receipt_number: cleanExternalId(payment?.receipt_number),
      receipt_url: cleanHttpUrl(payment?.receipt_url),
      total_money: cleanMoney(payment?.total_money ?? payment?.amount_money),
      amount_money: cleanMoney(payment?.amount_money),
      approved_money: cleanMoney(payment?.approved_money),
      refunded_money: cleanMoney(payment?.refunded_money),
      processing_fee_minor_units: cleanProcessingFeeMinorUnits(payment?.processing_fee),
      employee_id: cleanExternalId(payment?.employee_id),
      team_member_id: cleanExternalId(payment?.team_member_id ?? payment?.employee_id),
      card_brand: cleanText(payment?.card_details?.card?.card_brand).toUpperCase(),
      card_last_4: cleanExternalId(payment?.card_details?.card?.last_4),
      application_square_product: cleanText(payment?.application_details?.square_product),
    }))
    .filter((payment) => payment.payment_id && payment.created_at)
}

function cleanOrders(value) {
  const orders = Array.isArray(value) ? value : []

  return orders
    .map((order) => ({
      order_id: cleanExternalId(order?.id),
      location_id: cleanExternalId(order?.location_id),
      created_at: cleanIsoTimestamp(order?.created_at),
      updated_at: cleanIsoTimestamp(order?.updated_at),
      state: cleanText(order?.state).toUpperCase(),
      line_items: cleanLineItems(order?.line_items),
      tenders: Array.isArray(order?.tenders) ? order.tenders.map(cleanTender).filter(Boolean) : [],
      total_money: cleanMoney(order?.total_money),
      net_amount_due_money: cleanMoney(order?.net_amount_due_money),
    }))
    .filter((order) => order.order_id)
}

function cleanLineItems(value) {
  const items = Array.isArray(value) ? value : []

  return items
    .map((item) => ({
      uid: cleanExternalId(item?.uid),
      name: cleanText(item?.name) || "Square line item",
      quantity: cleanQuantity(item?.quantity),
      catalog_object_id: cleanExternalId(item?.catalog_object_id),
      catalog_version: positiveInt(item?.catalog_version),
      variation_name: cleanText(item?.variation_name),
      note: cleanText(item?.note),
      total_money: cleanMoney(item?.total_money),
      gross_sales_money: cleanMoney(item?.gross_sales_money),
      variation_total_price_money: cleanMoney(item?.variation_total_price_money),
    }))
    .filter((item) => item.name || item.catalog_object_id)
}

function cleanTender(value) {
  if (!value || typeof value !== "object") {
    return null
  }

  return {
    id: cleanExternalId(value.id),
    type: cleanText(value.type).toUpperCase(),
    amount_money: cleanMoney(value.amount_money),
    processing_fee_money: cleanMoney(value.processing_fee_money),
    created_at: cleanIsoTimestamp(value.created_at),
  }
}

function cleanReportRange(input, { now, defaultLookbackDays }) {
  const end = cleanIsoTimestampForBoundary(input.dateTo ?? input.date_to ?? input.endTime ?? input.end_time, "end")
    || now().toISOString()
  const fallbackBegin = new Date(Date.parse(end) - defaultLookbackDays * DAY_MS).toISOString()
  const begin =
    cleanIsoTimestampForBoundary(input.dateFrom ?? input.date_from ?? input.beginTime ?? input.begin_time, "begin")
    || fallbackBegin

  return {
    date_from_utc: begin,
    date_to_utc: end,
  }
}

function cleanIsoTimestampForBoundary(value, boundary) {
  const text = String(value ?? "").trim()

  if (!text) {
    return ""
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return boundary === "end" ? `${text}T23:59:59.999Z` : `${text}T00:00:00.000Z`
  }

  return cleanIsoTimestamp(text)
}

function cleanMoney(value) {
  const amount = Number.parseInt(String(value?.amount ?? "0"), 10)

  return {
    amount: Number.isFinite(amount) ? amount : 0,
    currency: cleanCurrency(value?.currency),
  }
}

function cleanProcessingFeeMinorUnits(value) {
  const fees = Array.isArray(value) ? value : []

  return fees.reduce((total, fee) => total + Math.max(0, minorUnits(fee?.amount_money?.amount)), 0)
}

function cleanQuantity(value) {
  const quantity = Number.parseFloat(String(value ?? "1"))

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

function squareBaseUrl(environment) {
  return environment === "production" ? SQUARE_PRODUCTION_BASE_URL : SQUARE_SANDBOX_BASE_URL
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function publicSquareErrors(payload = {}) {
  const errors = Array.isArray(payload.errors) ? payload.errors : []

  return errors.slice(0, 5).map((error) => ({
    category: cleanText(error?.category),
    code: cleanText(error?.code),
    detail: cleanText(error?.detail),
    field: cleanText(error?.field),
  }))
}

function blocked(code, message, extra = {}) {
  return {
    status: "blocked",
    code,
    message,
    ...extra,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

function cleanEnvironment(value) {
  const text = String(value ?? "").trim().toLowerCase()

  return text === "production" || text === "prod" || text === "live" ? "production" : "sandbox"
}

function cleanBaseUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim())
    if (url.protocol !== "https:") {
      return ""
    }
    return url.origin
  } catch {
    return ""
  }
}

function cleanApiVersion(value) {
  const text = String(value ?? "").trim()

  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : DEFAULT_SQUARE_API_VERSION
}

function cleanSecret(value) {
  return String(value ?? "").trim()
}

function cleanExternalId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w:./#-]/g, "")
    .slice(0, 220)
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 220)
}

function cleanCurrency(value) {
  const currency = String(value ?? "USD").trim().toUpperCase().replace(/[^A-Z]/g, "")

  return currency.length === 3 ? currency : "USD"
}

function cleanHttpUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim())

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : ""
  } catch {
    return ""
  }
}

function cleanIsoTimestamp(value) {
  const text = String(value ?? "").trim()
  if (!text) {
    return ""
  }

  const timestamp = Date.parse(text)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : ""
}

function positiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function minorUnits(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10)

  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(minorUnitsValue, currency) {
  return new Intl.NumberFormat("en-US", {
    currency: cleanCurrency(currency),
    style: "currency",
  }).format(Math.max(0, minorUnits(minorUnitsValue)) / 100)
}

function boundedInt(value, minimum, maximum, fallback) {
  const number = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(number)) {
    return fallback
  }

  return Math.min(maximum, Math.max(minimum, number))
}

function uniqueValues(values) {
  return [...new Set(values.map(cleanExternalId).filter(Boolean))]
}

function chunks(values, chunkSize) {
  const result = []

  for (let index = 0; index < values.length; index += chunkSize) {
    result.push(values.slice(index, index + chunkSize))
  }

  return result
}

function secretSafeEndpoint(endpoint) {
  try {
    const url = new URL(endpoint)
    url.searchParams.delete("cursor")
    return url.toString()
  } catch {
    return ""
  }
}
