import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressCatalogExportPull(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)
  const defaultPageSize = boundedPageSize(options.pageSize)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressCatalogExportPull({
    table = "reference_cards",
    page = 1,
    pageSize = defaultPageSize,
  } = {}) {
    const endpoint = new URL(`${endpointBase}/scrydex/catalog/export`)
    endpoint.searchParams.set("table", cleanCatalogTable(table))
    endpoint.searchParams.set("page", String(positivePage(page, 1)))
    endpoint.searchParams.set("page_size", String(boundedPageSize(pageSize)))

    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        headers: cleanHeaders({
          accept: "application/json",
          authorization: authorizationHeader,
        }),
        signal: controller?.signal,
      })
      const body = await safeJson(response)

      if (!response?.ok) {
        return {
          status: "blocked",
          code: "wordpress_catalog_export_http_error",
          http_status: Number(response?.status ?? 0),
          rows: [],
          meta: null,
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      const data = catalogExportData(body)
      const rows = Array.isArray(data.rows) ? data.rows.filter((row) => row && typeof row === "object") : []

      return {
        status: "ok",
        table: String(data.table ?? cleanCatalogTable(table)),
        rows,
        meta: {
          page: positivePage(data.page ?? page, 1),
          page_size: boundedPageSize(data.page_size ?? pageSize),
          total: nonNegativeInt(data.total, rows.length),
          has_more: Boolean(data.has_more),
          manifest: data.manifest && typeof data.manifest === "object" ? data.manifest : null,
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_catalog_export_unavailable",
        message: error instanceof Error ? error.message : "WordPress catalog export unavailable.",
        rows: [],
        meta: null,
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

export function catalogExportData(body) {
  return body?.data && typeof body.data === "object" ? body.data : {}
}

function cleanCatalogTable(value) {
  const table = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_")

  return [
    "reference_sets",
    "reference_cards",
    "reference_variants",
    "provider_price_observations",
    "provider_price_points",
    "sync_checkpoints",
  ].includes(table)
    ? table
    : "reference_cards"
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

async function safeJson(response) {
  try {
    return typeof response?.json === "function" ? await response.json() : null
  } catch {
    return null
  }
}

function positivePage(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function nonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function boundedPageSize(value) {
  const parsed = Number.parseInt(String(value ?? "500"), 10)

  return Number.isFinite(parsed) ? Math.min(1000, Math.max(1, parsed)) : 500
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "30000"), 10)

  return Number.isFinite(timeout) ? Math.min(60000, Math.max(1000, timeout)) : 30000
}
