import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressEventsPull(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)
  const defaultPageSize = boundedPageSize(options.pageSize)

  if (!endpointBase || typeof fetcher !== "function") {
    return null
  }

  return async function wordpressEventsPull({ page = 1, pageSize = defaultPageSize, filters = {} } = {}) {
    const endpoint = new URL(`${endpointBase}/events`)
    endpoint.searchParams.set("page", String(positivePage(page, 1)))
    endpoint.searchParams.set("per_page", String(boundedPageSize(pageSize)))

    for (const key of ["game", "format", "event_type", "registration_status"]) {
      const value = cleanFilter(filters?.[key])

      if (value) {
        endpoint.searchParams.set(key, value)
      }
    }

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
          code: "wordpress_events_pull_http_error",
          http_status: Number(response?.status ?? 0),
          events: [],
          meta: null,
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      const body = await response.json()
      const events = eventsFromWordPressEventsResponse(body)

      return {
        status: "ok",
        events,
        meta: eventsMetaFromWordPressEventsResponse(body, {
          page,
          pageSize,
          eventCount: events.length,
        }),
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_events_pull_unavailable",
        message: error instanceof Error ? error.message : "WordPress events pull unavailable.",
        events: [],
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

export function eventsFromWordPressEventsResponse(body) {
  const candidates = Array.isArray(body?.events)
    ? body.events
    : Array.isArray(body?.data?.events)
      ? body.data.events
      : []

  return candidates.filter((event) => event && typeof event === "object")
}

export function eventsMetaFromWordPressEventsResponse(body, fallback = {}) {
  const meta = body?.meta ?? body?.data?.meta ?? null
  const page = positivePage(meta?.page ?? fallback.page, 1)
  const pageSize = boundedPageSize(meta?.page_size ?? meta?.per_page ?? fallback.pageSize)
  const eventCount = nonNegativeInt(fallback.eventCount, 0)

  return meta && typeof meta === "object"
    ? {
        page,
        page_size: pageSize,
        total: nonNegativeInt(meta.total, eventCount),
        has_more: Boolean(meta.has_more),
      }
    : {
        page,
        page_size: pageSize,
        total: eventCount,
        has_more: eventCount >= pageSize,
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

function cleanFilter(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80)
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
