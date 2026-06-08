export function createWordPressCatalogFallback(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function") {
    return null
  }

  return async function wordpressCatalogFallback({ query = "", game = "pokemon", limit = 8 } = {}) {
    const endpoint = new URL(`${endpointBase}/reference/search`)
    endpoint.searchParams.set("q", String(query ?? "").trim())
    endpoint.searchParams.set("game", String(game ?? "").trim())
    endpoint.searchParams.set("limit", String(boundedLimit(limit)))

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
          code: "wordpress_catalog_proxy_http_error",
          http_status: Number(response?.status ?? 0),
          cards: [],
          live_provider_request_performed: false,
          credentials_synced_to_client: false,
          auth_configured: Boolean(authorizationHeader),
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      const body = await response.json()
      const cards = cardsFromWordPressCatalogResponse(body)

      return {
        status: "ok",
        cards,
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
  const limit = Number.parseInt(String(value ?? "8"), 10)

  return Number.isFinite(limit) ? Math.min(50, Math.max(1, limit)) : 8
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "8000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 8000
}
