import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

const REPORT_KEYS = Object.freeze([
  "customers",
  "sales",
  "inventory",
  "trade_ins",
  "fulfillment",
  "scrydex",
  "square_reconciliation",
  "audit",
])

export function createWordPressReportsPull(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressReportsPull({ report = "inventory", filters = {} } = {}) {
    const reportKey = cleanReportKey(report)
    const endpoint = new URL(`${endpointBase}/reports/${reportKey}`)

    for (const [key, value] of Object.entries(cleanFilters(filters))) {
      if (value !== "") {
        endpoint.searchParams.set(key, value)
      }
    }

    return fetchReportEndpoint({
      endpoint,
      fetcher,
      timeoutMs,
      authorizationHeader,
      report: reportKey,
    })
  }
}

export function reportDataFromWordPressResponse(body, report = "inventory") {
  const data = body?.data && typeof body.data === "object" ? body.data : {}
  const meta = body?.meta && typeof body.meta === "object" ? body.meta : {}

  return {
    report: cleanReportKey(data.report ?? report),
    report_status: cleanText(body?.status ?? "planned"),
    plan: data,
    meta,
    rows: Array.isArray(data.rows) ? data.rows : [],
    dashboard_plan: meta.dashboard_plan && typeof meta.dashboard_plan === "object" ? meta.dashboard_plan : null,
    csv_header: String(meta.csv_header ?? "").slice(0, 5000),
    credentials_synced_to_client: false,
    authorization_header_printed: false,
  }
}

async function fetchReportEndpoint({ endpoint, fetcher, timeoutMs, authorizationHeader, report }) {
  const controller = typeof AbortController === "function" ? new AbortController() : null
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const response = await fetcher(endpoint, {
      method: "GET",
      headers: cleanHeaders({
        accept: "application/json",
        authorization: authorizationHeader,
      }),
      signal: controller?.signal,
    })
    const responseBody = await safeJson(response)

    if (!response?.ok) {
      return {
        status: "blocked",
        code: "wordpress_reports_pull_http_error",
        http_status: Number(response?.status ?? 0),
        wordpress_code: String(responseBody?.error?.code ?? responseBody?.data?.code ?? ""),
        message: "WordPress reports endpoint rejected this request.",
        report,
        rows: [],
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    }

    return {
      code: "wordpress_reports_pull_ok",
      http_status: Number(response.status ?? 200),
      ...reportDataFromWordPressResponse(responseBody, report),
      status: "ok",
      endpoint: secretSafeEndpoint(endpoint),
    }
  } catch (error) {
    return {
      status: "blocked",
      code: "wordpress_reports_pull_unavailable",
      message: error instanceof Error ? error.message : "WordPress reports endpoint unavailable.",
      report,
      rows: [],
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

function cleanReportKey(value) {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "")

  return REPORT_KEYS.includes(key) ? key : "inventory"
}

function cleanFilters(filters = {}) {
  return {
    date_from: cleanDate(filters.date_from ?? filters.dateFrom),
    date_to: cleanDate(filters.date_to ?? filters.dateTo),
    customer_id: positiveIntString(filters.customer_id ?? filters.customerId),
    staff_user_id: positiveIntString(filters.staff_user_id ?? filters.staffUserId),
    channel: cleanSlug(filters.channel),
    game: cleanSlug(filters.game),
    product_type: cleanSlug(filters.product_type ?? filters.productType),
    condition: cleanSlug(filters.condition).toUpperCase(),
    grade: cleanText(filters.grade),
    grading_company: cleanText(filters.grading_company ?? filters.gradingCompany),
    order_status: cleanSlug(filters.order_status ?? filters.orderStatus),
    source: cleanSlug(filters.source),
    page: positiveIntString(filters.page || 1),
    page_size: boundedPageSize(filters.page_size ?? filters.pageSize),
  }
}

function cleanDate(value) {
  const date = String(value ?? "").trim()

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ""
}

function cleanSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "")
    .slice(0, 64)
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 191)
}

function positiveIntString(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : ""
}

function boundedPageSize(value) {
  const parsed = Number.parseInt(String(value ?? "50"), 10)
  const size = Number.isFinite(parsed) ? Math.min(250, Math.max(10, parsed)) : 50

  return String(size)
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "10000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 10000
}

function cleanHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, value]) => typeof value === "string" && value.trim() !== ""),
  )
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
