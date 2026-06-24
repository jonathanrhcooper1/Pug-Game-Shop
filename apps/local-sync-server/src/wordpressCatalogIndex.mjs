import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressCatalogIndexer(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs ?? options.indexTimeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function") {
    return null
  }

  return async function wordpressCatalogIndex(input = {}) {
    const endpoint = new URL(`${endpointBase}/scrydex/catalog/index`)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: cleanHeaders({
          accept: "application/json",
          authorization: authorizationHeader,
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          game: cleanCatalogGame(input.game),
          expansion_id: cleanCatalogText(input.expansionId ?? input.expansion_id),
          page_size: boundedPageSize(input.pageSize ?? input.page_size),
          max_pages: boundedMaxPages(input.maxPages ?? input.max_pages),
          expansions_page: boundedPositiveInt(input.expansionsPage ?? input.expansions_page, 1),
          max_expansion_pages: boundedMaxPages(input.maxExpansionPages ?? input.max_expansion_pages),
          index_expansions: input.indexExpansions === true || input.index_expansions === true,
          skip_cards: input.skipCards === true || input.skip_cards === true,
          execute_database_writes: input.executeDatabaseWrites !== false && input.execute_database_writes !== false,
          include_usage_snapshot: input.includeUsageSnapshot === true || input.include_usage_snapshot === true,
        }),
        signal: controller?.signal,
      })
      const body = await safeJson(response)

      if (!response?.ok) {
        return {
          status: "blocked",
          code: "wordpress_scrydex_catalog_index_http_error",
          message: catalogIndexMessage(body) || "WordPress ScryDex catalog index request was rejected.",
          http_status: Number(response?.status ?? 0),
          endpoint: secretSafeEndpoint(endpoint),
          auth_configured: Boolean(authorizationHeader),
          authorization_header_printed: false,
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
      }

      const data = body?.data && typeof body.data === "object" ? body.data : body

      return {
        status: "ok",
        action: "wordpress_scrydex_catalog_index_completed",
        code: "wordpress_scrydex_catalog_index_completed",
        accepted: Boolean(data?.accepted ?? true),
        game: cleanCatalogGame(data?.game ?? input.game),
        expansion_id: cleanCatalogText(data?.expansion_id ?? input.expansionId ?? input.expansion_id),
        page_size: boundedPageSize(data?.page_size ?? input.pageSize ?? input.page_size),
        max_pages: boundedMaxPages(data?.max_pages ?? input.maxPages ?? input.max_pages),
        cards: normalizeCatalogIndexCards(data?.cards),
        expansion_result: normalizeCatalogIndexBlock(data?.expansion_result),
        card_result: normalizeCatalogIndexBlock(data?.cards),
        rate_limit_plan: normalizeCatalogIndexBlock(data?.rate_limit_plan),
        usage_budget_plan: normalizeCatalogIndexBlock(data?.usage_budget_plan),
        endpoint: secretSafeEndpoint(endpoint),
        auth_configured: Boolean(authorizationHeader),
        authorization_header_printed: false,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_scrydex_catalog_index_unavailable",
        message: error instanceof Error ? error.message : "WordPress ScryDex catalog index route is unavailable.",
        endpoint: secretSafeEndpoint(endpoint),
        auth_configured: Boolean(authorizationHeader),
        authorization_header_printed: false,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }
}

function normalizeCatalogIndexCards(value) {
  if (!value || typeof value !== "object") {
    return {
      status: "unknown",
      page_count: 0,
      provider_request_count: 0,
      reference_row_count: 0,
      database_writes_deferred: false,
      continuation_available: false,
    }
  }

  return {
    status: cleanCatalogText(value.status),
    page_count: boundedNonNegativeInt(value.page_count, 0),
    provider_request_count: boundedNonNegativeInt(value.provider_request_count, 0),
    reference_row_count: boundedNonNegativeInt(value.reference_row_count, 0),
    database_writes_deferred: Boolean(value.database_writes_deferred),
    continuation_available: Boolean(value.continuation_available),
  }
}

function normalizeCatalogIndexBlock(value) {
  return value && typeof value === "object" ? value : {}
}

function catalogIndexMessage(body) {
  const errors = [
    ...(Array.isArray(body?.errors) ? body.errors : []),
    ...(Array.isArray(body?.data?.errors) ? body.data.errors : []),
  ]

  return errors.map((error) => String(error)).filter(Boolean).join(", ")
}

async function safeJson(response) {
  try {
    return typeof response?.json === "function" ? await response.json() : null
  } catch {
    return null
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

function cleanCatalogGame(value) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "")

  return text || "pokemon"
}

function cleanCatalogText(value) {
  return String(value ?? "").trim().slice(0, 191)
}

function boundedPageSize(value) {
  const parsed = Number.parseInt(String(value ?? "100"), 10)

  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 100
}

function boundedMaxPages(value) {
  const parsed = Number.parseInt(String(value ?? "1000"), 10)

  return Number.isFinite(parsed) ? Math.min(10000, Math.max(1, parsed)) : 1000
}

function boundedPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function boundedNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}
