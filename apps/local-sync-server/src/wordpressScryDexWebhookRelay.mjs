export function createWordPressScryDexWebhookRelay(options = {}) {
  const endpointBase = restEndpointBase(options)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const authorization = authorizationHeader(options)
  const timeoutMs = boundedTimeout(options.timeoutMs)

  if (!endpointBase || typeof fetcher !== "function") {
    return null
  }

  async function request(endpoint, requestOptions = {}) {
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        ...requestOptions,
        headers: cleanHeaders({
          accept: "application/json",
          authorization,
          ...(requestOptions.body ? { "content-type": "application/json" } : {}),
          ...requestOptions.headers,
        }),
        signal: controller?.signal,
      })
      const body = await safeJson(response)

      if (!response?.ok) {
        return {
          status: "blocked",
          code: "wordpress_scrydex_webhook_relay_http_error",
          http_status: Number(response?.status ?? 0),
          message: cleanText(body?.data?.message ?? body?.message ?? "WordPress webhook relay request failed."),
          endpoint: secretSafeEndpoint(endpoint),
          credentials_synced_to_client: false,
          authorization_header_printed: false,
        }
      }

      return {
        status: "ok",
        data: body?.data ?? body,
        http_status: Number(response.status ?? 200),
        endpoint: secretSafeEndpoint(endpoint),
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_scrydex_webhook_relay_unavailable",
        message: error instanceof Error ? error.message : "WordPress webhook relay unavailable.",
        endpoint: secretSafeEndpoint(endpoint),
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }

  return {
    status() {
      return {
        configured: Boolean(endpointBase && authorization),
        endpoint: secretSafeEndpoint(new URL(`${endpointBase}/scrydex/webhook-events`)),
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },

    async pull({ limit = 25 } = {}) {
      const endpoint = new URL(`${endpointBase}/scrydex/webhook-events`)
      endpoint.searchParams.set("limit", String(boundedLimit(limit)))
      const result = await request(endpoint)

      return result.status === "ok"
        ? {
            ...result,
            events: relayEvents(result.data?.events),
            count: nonNegativeInt(result.data?.count),
          }
        : { ...result, events: [], count: 0 }
    },

    async transition(eventId, input = {}) {
      const safeEventId = cleanEventId(eventId)
      if (!safeEventId) {
        return {
          status: "blocked",
          code: "wordpress_scrydex_webhook_relay_event_id_invalid",
          credentials_synced_to_client: false,
          authorization_header_printed: false,
        }
      }

      const endpoint = new URL(`${endpointBase}/scrydex/webhook-events/${encodeURIComponent(safeEventId)}`)
      const result = await request(endpoint, {
        method: "POST",
        body: JSON.stringify({
          status: cleanTransitionStatus(input.status),
          result_reference: cleanText(input.result_reference ?? input.resultReference).slice(0, 191),
          error_code: cleanText(input.error_code ?? input.errorCode).slice(0, 100),
          error_message: cleanText(input.error_message ?? input.errorMessage).slice(0, 255),
        }),
      })

      return result.status === "ok" ? { ...result, transition: result.data } : result
    },
  }
}

function relayEvents(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((event) => ({
      id: cleanEventId(event?.id),
      name: cleanText(event?.name).toLowerCase(),
      data: {
        expansion_ids: Array.from(
          new Set(
            (Array.isArray(event?.data?.expansion_ids) ? event.data.expansion_ids : [])
              .map(cleanProviderId)
              .filter(Boolean),
          ),
        ),
      },
      payload_hash: cleanSha256(event?.payload_hash),
      processing_status: cleanText(event?.processing_status),
      relay_attempt_count: nonNegativeInt(event?.relay_attempt_count),
      received_at: cleanText(event?.received_at),
      next_attempt_at: cleanText(event?.next_attempt_at),
    }))
    .filter((event) => event.id && event.name && event.data.expansion_ids.length > 0)
}

function restEndpointBase(options) {
  const websiteUrl = cleanText(options.websiteUrl).replace(/\/+$/, "")
  if (!websiteUrl) {
    return ""
  }

  const restBasePath = cleanText(options.restBasePath) || "/wp-json/tcg-store/v1"
  return `${websiteUrl}/${restBasePath.replace(/^\/+|\/+$/g, "")}`
}

function authorizationHeader(options) {
  const direct = cleanText(options.authHeader)
  if (direct) {
    return direct
  }

  const username = cleanText(options.username)
  const applicationPassword = cleanText(options.applicationPassword)
  if (!username || !applicationPassword) {
    return ""
  }

  return `Basic ${Buffer.from(`${username}:${applicationPassword}`, "utf8").toString("base64")}`
}

async function safeJson(response) {
  try {
    return await response?.json()
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
  for (const key of ["token", "key", "api_key", "secret", "password"]) {
    safe.searchParams.delete(key)
  }
  return safe.toString()
}

function cleanTransitionStatus(value) {
  const status = cleanText(value).toLowerCase()
  return ["processing", "processed", "retry", "dead_letter"].includes(status) ? status : ""
}

function cleanEventId(value) {
  const text = cleanText(value)
  return /^[A-Za-z0-9_:-]{1,191}$/.test(text) ? text : ""
}

function cleanProviderId(value) {
  const text = cleanText(value)
  return /^[A-Za-z0-9_:-]{1,191}$/.test(text) ? text : ""
}

function cleanSha256(value) {
  const text = cleanText(value).toLowerCase()
  return /^[a-f0-9]{64}$/.test(text) ? text : ""
}

function cleanText(value) {
  return String(value ?? "").trim()
}

function nonNegativeInt(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function boundedLimit(value) {
  const parsed = Number.parseInt(String(value ?? "25"), 10)
  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 25
}

function boundedTimeout(value) {
  const parsed = Number.parseInt(String(value ?? "10000"), 10)
  return Number.isFinite(parsed) ? Math.min(30000, Math.max(1000, parsed)) : 10000
}
