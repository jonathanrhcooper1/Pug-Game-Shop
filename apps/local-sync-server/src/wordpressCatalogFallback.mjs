export function createWordPressCatalogFallback(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function") {
    return null
  }

  return async function wordpressCatalogFallback({ query = "", game = "pokemon", limit = 250 } = {}) {
    if (isUnlimitedLimit(limit)) {
      return fetchAllCatalogFallbackPages({
        endpointBase,
        fetcher,
        timeoutMs,
        authorizationHeader,
        query,
        game,
      })
    }

    const requestedLimit = boundedLimit(limit)
    const primaryResult = await fetchCatalogFallbackPage({
      endpointBase,
      fetcher,
      timeoutMs,
      authorizationHeader,
      query,
      game,
      limit: requestedLimit,
      page: 1,
      retriedWithLegacyLimit: false,
    })

    if (primaryResult.retry_with_legacy_limit === true && requestedLimit > 50) {
      return fetchCatalogFallbackPage({
        endpointBase,
        fetcher,
        timeoutMs,
        authorizationHeader,
        query,
        game,
        limit: 50,
        page: 1,
        retriedWithLegacyLimit: true,
      })
    }

    return primaryResult
  }
}

async function fetchAllCatalogFallbackPages({
  endpointBase,
  fetcher,
  timeoutMs,
  authorizationHeader,
  query = "",
  game = "pokemon",
} = {}) {
  let page = 1
  let pageSize = 250
  let retriedWithLegacyLimit = false
  let lastResult = null
  const cards = []

  while (true) {
    const result = await fetchCatalogFallbackPage({
      endpointBase,
      fetcher,
      timeoutMs,
      authorizationHeader,
      query,
      game,
      limit: pageSize,
      page,
      retriedWithLegacyLimit,
    })

    if (result.retry_with_legacy_limit === true && pageSize > 50) {
      page = 1
      pageSize = 50
      retriedWithLegacyLimit = true
      lastResult = null
      cards.length = 0
      continue
    }

    lastResult = result

    if (result.status !== "ok") {
      return cards.length > 0
        ? {
            ...result,
            status: "ok",
            cards,
            requested_limit: "all",
            partial_catalog: true,
          }
        : result
    }

    cards.push(...result.cards)

    const total = Number.isFinite(Number(result.total)) ? Number(result.total) : 0
    if (result.cards.length < pageSize || (total > 0 && cards.length >= total)) {
      break
    }

    page += 1
  }

  return {
    ...(lastResult ?? {}),
    status: "ok",
    cards,
    requested_limit: "all",
    total: cards.length,
    retried_with_legacy_limit: retriedWithLegacyLimit,
  }
}

async function fetchCatalogFallbackPage({
  endpointBase,
  fetcher,
  timeoutMs,
  authorizationHeader,
  query = "",
  game = "pokemon",
  limit = 250,
  page = 1,
  retriedWithLegacyLimit = false,
} = {}) {
  const endpoint = new URL(`${endpointBase}/reference/search`)
  endpoint.searchParams.set("q", String(query ?? "").trim())
  endpoint.searchParams.set("game", String(game ?? "").trim())
  endpoint.searchParams.set("limit", String(boundedLimit(limit)))
  endpoint.searchParams.set("page", String(Math.max(1, Number.parseInt(String(page ?? "1"), 10) || 1)))

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
    const body = await safeCatalogJson(response)

    if (!response?.ok) {
      return {
        status: "blocked",
        code: "wordpress_catalog_proxy_http_error",
        http_status: Number(response?.status ?? 0),
        cards: [],
        retry_with_legacy_limit: catalogPageSizeTooLarge(body),
        live_provider_request_performed: false,
        credentials_synced_to_client: false,
        auth_configured: Boolean(authorizationHeader),
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    }

    if (catalogPageSizeTooLarge(body)) {
      return {
        status: "blocked",
        code: "wordpress_catalog_proxy_page_size_too_large",
        http_status: Number(response?.status ?? 0),
        cards: [],
        retry_with_legacy_limit: true,
        live_provider_request_performed: false,
        credentials_synced_to_client: false,
        auth_configured: Boolean(authorizationHeader),
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    }

    const cards = cardsFromWordPressCatalogResponse(body)

    return {
      status: "ok",
      cards,
      total: catalogResponseTotal(body),
      requested_limit: boundedLimit(limit),
      retried_with_legacy_limit: retriedWithLegacyLimit,
      live_provider_request_performed: Boolean(
        body?.live_provider_request_performed ??
          body?.data?.meta?.live_provider_request ??
          body?.meta?.live_provider_request,
      ),
      credentials_synced_to_client: false,
      auth_configured: Boolean(authorizationHeader),
      authorization_header_printed: false,
      endpoint: secretSafeEndpoint(endpoint),
    }
  } catch (error) {
    return {
      status: "blocked",
      code: "wordpress_catalog_proxy_unavailable",
      message: error instanceof Error ? error.message : "WordPress catalog proxy unavailable.",
      cards: [],
      live_provider_request_performed: false,
      credentials_synced_to_client: false,
      auth_configured: Boolean(authorizationHeader),
      authorization_header_printed: false,
      endpoint: secretSafeEndpoint(endpoint),
    }
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

export function catalogAuthorizationHeader(options = {}) {
  const explicit = String(options.authHeader ?? "").trim()

  if (isSafeAuthorizationHeader(explicit)) {
    return explicit
  }

  const username = String(options.username ?? "").trim()
  const applicationPassword = String(options.applicationPassword ?? "").trim()

  if (!username || !applicationPassword) {
    return ""
  }

  return `Basic ${Buffer.from(`${username}:${applicationPassword}`, "utf8").toString("base64")}`
}

export function normalizeWordPressCatalogBaseUrl(websiteUrl, restBasePath = "/wp-json/tcg-store/v1") {
  const raw = String(websiteUrl ?? "").trim()

  if (!raw) {
    return ""
  }

  let parsed

  try {
    parsed = new URL(raw)
  } catch {
    return ""
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return ""
  }

  parsed.search = ""
  parsed.hash = ""
  parsed.pathname = parsed.pathname.replace(/\/+$/, "")

  const basePath = String(restBasePath ?? "/wp-json/tcg-store/v1")
    .trim()
    .replace(/^\/?/, "/")
    .replace(/\/+$/, "")

  if (!parsed.pathname.endsWith(basePath)) {
    parsed.pathname = `${parsed.pathname}${basePath}`.replace(/\/{2,}/g, "/")
  }

  return parsed.toString().replace(/\/+$/, "")
}

export function cardsFromWordPressCatalogResponse(body) {
  const candidates = Array.isArray(body?.cards)
    ? body.cards
    : Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.data?.cards)
        ? body.data.cards
        : Array.isArray(body?.data?.items)
          ? body.data.items
          : []

  return candidates.filter((card) => card && typeof card === "object")
}

function catalogResponseTotal(body) {
  const total = Number(
    body?.total ??
      body?.data?.meta?.total ??
      body?.meta?.total ??
      body?.data?.total ??
      0,
  )

  return Number.isFinite(total) && total > 0 ? total : 0
}

async function safeCatalogJson(response) {
  try {
    return typeof response?.json === "function" ? await response.json() : null
  } catch {
    return null
  }
}

function catalogPageSizeTooLarge(body) {
  const errors = [
    ...(Array.isArray(body?.errors) ? body.errors : []),
    ...(Array.isArray(body?.data?.errors) ? body.data.errors : []),
    ...(Array.isArray(body?.meta?.errors) ? body.meta.errors : []),
  ].map((error) => String(error))

  return errors.includes("page_size_too_large")
}

function secretSafeEndpoint(endpoint) {
  const safe = new URL(endpoint.toString())
  safe.searchParams.delete("token")
  safe.searchParams.delete("key")
  safe.searchParams.delete("api_key")

  return safe.toString()
}

function cleanHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, value]) => typeof value === "string" && value.trim() !== ""),
  )
}

function isSafeAuthorizationHeader(value) {
  return /^(Bearer|Basic)\s+[A-Za-z0-9+/_=:.~,-]+$/i.test(value)
}

function boundedLimit(value) {
  const limit = Number.parseInt(String(value ?? "250"), 10)

  return Number.isFinite(limit) ? Math.min(250, Math.max(1, limit)) : 250
}

function isUnlimitedLimit(value) {
  const raw = String(value ?? "").trim().toLowerCase()

  return raw === "all" || raw === "0" || raw === ""
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "8000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 8000
}
