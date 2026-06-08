import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressInventoryPull(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)
  const defaultPageSize = boundedPageSize(options.pageSize)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressInventoryPull({ query = "", page = 1, pageSize = defaultPageSize } = {}) {
    const endpoint = new URL(`${endpointBase}/inventory/search`)
    const normalizedQuery = String(query ?? "").trim()

    if (normalizedQuery) {
      endpoint.searchParams.set("q", normalizedQuery)
    }

    endpoint.searchParams.set("visibility", "staff")
    endpoint.searchParams.set("status", "available")
    endpoint.searchParams.set("page", String(positivePage(page, 1)))
    endpoint.searchParams.set("page_size", String(boundedPageSize(pageSize)))
    endpoint.searchParams.set("sort", "updated_desc")

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

      if (!response?.ok) {
        return {
          status: "blocked",
          code: "wordpress_inventory_pull_http_error",
          http_status: Number(response?.status ?? 0),
          items: [],
          meta: null,
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      const body = await response.json()

      return {
        status: "ok",
        items: inventoryItemsFromWordPressSearchResponse(body),
        meta: inventoryMetaFromWordPressSearchResponse(body),
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_inventory_pull_unavailable",
        message: error instanceof Error ? error.message : "WordPress inventory pull unavailable.",
        items: [],
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

export function inventoryItemsFromWordPressSearchResponse(body) {
  const candidates = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body?.data?.items)
      ? body.data.items
      : []

  return candidates.filter((item) => item && typeof item === "object")
}

export function inventoryMetaFromWordPressSearchResponse(body) {
  const meta = body?.meta ?? body?.data?.meta ?? null

  return meta && typeof meta === "object"
    ? {
        page: positivePage(meta.page, 1),
        page_size: boundedPageSize(meta.page_size),
        total: nonNegativeInt(meta.total, 0),
        has_more: Boolean(meta.has_more),
      }
    : null
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

function positivePage(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function nonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function boundedPageSize(value) {
  const parsed = Number.parseInt(String(value ?? "50"), 10)

  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 50
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "10000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 10000
}
