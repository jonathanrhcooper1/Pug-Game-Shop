const DEFAULT_SCRYDEX_BASE_URL = "https://api.scrydex.com"
const DEFAULT_PAGE_SIZE = 250
const MAX_EXPANSION_PAGE_SIZE = 250
const DEFAULT_MAX_RETRIES = 3
const CARD_PAGE_SIZE_LIMITS = {}

export function createScryDexCatalogIndexer(options = {}) {
  const apiKey = cleanText(options.apiKey)
  const teamId = cleanText(options.teamId)
  const baseUrl = cleanBaseUrl(options.baseUrl) || DEFAULT_SCRYDEX_BASE_URL
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const maxRetries = boundedRetryCount(options.maxRetries ?? options.max_retries)

  if (!apiKey || !teamId || typeof fetcher !== "function") {
    return null
  }

  return async function scryDexCatalogIndex(input = {}) {
    const game = cleanGame(input.game)
    const requestedPageSize = input.pageSize ?? input.page_size
    const expansionPageSize = boundedExpansionPageSize(input.expansionPageSize ?? input.expansion_page_size ?? requestedPageSize)
    const cardPageSize = boundedCardPageSize(requestedPageSize, game)
    const maxPages = boundedMaxPages(input.maxPages ?? input.max_pages)
    const maxExpansionPages = boundedMaxPages(input.maxExpansionPages ?? input.max_expansion_pages)
    const expansionId = cleanText(input.expansionId ?? input.expansion_id)
    const indexExpansions = input.indexExpansions === true || input.index_expansions === true
    const skipCards = input.skipCards === true || input.skip_cards === true
    const onProgress = typeof input.onProgress === "function" ? input.onProgress : null

    const expansionResult = indexExpansions
      ? await fetchExpansionPages({
          fetcher,
          baseUrl,
          apiKey,
          teamId,
          timeoutMs,
          maxRetries,
          game,
          pageSize: expansionPageSize,
          maxPages: maxExpansionPages,
          onProgress,
        })
      : {
          status: "skipped",
          expansion_index_requested: false,
          provider_request_count: 0,
          page_count: 0,
          provider_set_ids: expansionId ? [expansionId] : [],
          continuation_available: false,
        }

    if (expansionResult.status === "blocked") {
      return blocked("scrydex_catalog_expansion_index_blocked", expansionResult.message, {
        game,
        expansion_result: expansionResult,
      })
    }

    const expansionIds = expansionId
      ? [expansionId]
      : Array.isArray(expansionResult.provider_set_ids)
        ? expansionResult.provider_set_ids
        : []

    const cardResult = skipCards
      ? {
          status: "skipped",
          cards_index_requested: false,
          provider_request_count: 0,
          page_count: 0,
          reference_row_count: 0,
          continuation_available: false,
        }
      : await fetchCardPages({
          fetcher,
          baseUrl,
          apiKey,
          teamId,
          timeoutMs,
          maxRetries,
          game,
          pageSize: cardPageSize,
          maxPages,
          expansionIds,
          onProgress,
        })

    if (cardResult.status === "blocked") {
      return blocked("scrydex_catalog_card_index_blocked", cardResult.message, {
        game,
        expansion_result: expansionResult,
        cards: cardResult,
      })
    }

    const referenceCards = Array.isArray(cardResult.reference_cards) ? cardResult.reference_cards : []

    return {
      status: "ok",
      action: "scrydex_local_catalog_index_completed",
      code: "scrydex_local_catalog_index_completed",
      accepted: true,
      game,
      expansion_id: expansionId,
      page_size: cardPageSize,
      card_page_size: cardPageSize,
      expansion_page_size: expansionPageSize,
      max_pages: maxPages,
      expansion_result: expansionResult,
      cards: cardResult,
      reference_cards: referenceCards,
      variants: referenceCards.reduce((total, card) => total + arrayLength(card.variants), 0),
      prices: referenceCards.reduce((total, card) => total + arrayLength(card.price_points ?? card.prices), 0),
      provider: "scrydex",
      source_of_truth: "local_sync_server",
      local_database_write_source: "lan_server_sqlite",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }
}

async function fetchExpansionPages({ fetcher, baseUrl, apiKey, teamId, timeoutMs, maxRetries, game, pageSize, maxPages, onProgress }) {
  const providerSetIds = []
  let providerRequestCount = 0
  let rowCount = 0
  let continuationAvailable = false
  let lastPage = 0

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchScryDexJson({
      fetcher,
      baseUrl,
      apiKey,
      teamId,
      timeoutMs,
      maxRetries,
      path: `/${game}/v1/expansions`,
      params: { page, page_size: pageSize },
    })
    providerRequestCount += 1
    lastPage = page

    if (result.status !== "ok") {
      return {
        status: "blocked",
        message: result.message,
        code: result.code,
        http_status: result.http_status,
        provider_request_count: providerRequestCount,
        failed_page: page,
        provider_body_logged: false,
      }
    }

    const rows = providerList(result.body, [
      ["data"],
      ["data", "expansions"],
      ["data", "sets"],
      ["data", "results"],
      ["data", "items"],
      ["expansions"],
      ["sets"],
      ["results"],
      ["items"],
    ]).slice(0, pageSize)
    rowCount += rows.length
    const currentExpansionId = cleanText(rows.at(-1)?.id ?? rows.at(-1)?.provider_set_id ?? rows.at(-1)?.set_id)
    const currentExpansionName = cleanText(rows.at(-1)?.name ?? rows.at(-1)?.set_name ?? rows.at(-1)?.title)
    onProgress?.({
      game,
      phase: "expansions",
      status: "running",
      expansion_pages: lastPage,
      expansion_rows: rowCount,
      current_expansion_id: currentExpansionId,
      current_expansion_name: currentExpansionName,
      provider_request_count: providerRequestCount,
      message: `Fetched ${rowCount} ${game} expansion rows.`,
    })
    for (const row of rows) {
      const id = cleanText(row.id ?? row.provider_set_id ?? row.set_id)
      if (id) {
        providerSetIds.push(id)
      }
    }

    continuationAvailable = rows.length >= pageSize
    if (!continuationAvailable) {
      break
    }
  }

  return {
    status: continuationAvailable && lastPage >= maxPages ? "page_limit_reached" : "completed",
    expansion_index_requested: true,
    provider_request_count: providerRequestCount,
    page_count: lastPage,
    row_count: rowCount,
    provider_set_ids: [...new Set(providerSetIds)],
    continuation_available: continuationAvailable && lastPage >= maxPages,
    database_writes_deferred: true,
    provider_body_logged: false,
  }
}

async function fetchCardPages({ fetcher, baseUrl, apiKey, teamId, timeoutMs, maxRetries, game, pageSize, maxPages, expansionIds, onProgress }) {
  const cards = []
  const failedSets = []
  let providerRequestCount = 0
  let pageCount = 0
  let variantCount = 0
  let pricePointCount = 0
  let continuationAvailable = false
  const ids = Array.isArray(expansionIds) && expansionIds.length > 0 ? expansionIds : [""]

  for (const expansionId of ids) {
    for (let page = 1; page <= maxPages; page += 1) {
      const path = expansionId
        ? `/${game}/v1/expansions/${encodeURIComponent(expansionId)}/cards`
        : `/${game}/v1/cards`
      const result = await fetchScryDexJson({
        fetcher,
        baseUrl,
        apiKey,
        teamId,
        timeoutMs,
        maxRetries,
        path,
        params: { page, page_size: pageSize, include: "images,prices,pop_reports" },
      })
      providerRequestCount += 1
      pageCount += 1

      if (result.status !== "ok") {
        failedSets.push({
          expansion_id: expansionId,
          page,
          code: result.code,
          message: result.message,
          http_status: result.http_status,
        })
        break
      }

      const rows = providerList(result.body, [
        ["data"],
        ["data", "cards"],
        ["data", "results"],
        ["data", "items"],
        ["cards"],
        ["results"],
        ["items"],
      ]).slice(0, pageSize)
      const pageCards = rows.map((card) => ({ ...card, game }))
      cards.push(...pageCards)
      variantCount += pageCards.reduce((total, card) => total + countVariants(card), 0)
      pricePointCount += pageCards.reduce((total, card) => total + countPricePoints(card), 0)
      const currentCard = pageCards.at(-1) ?? {}
      onProgress?.({
        game,
        phase: "cards",
        status: "running",
        expansion_id: expansionId,
        current_expansion_id: expansionId,
        current_expansion_name: cleanText(currentCard.set_name ?? currentCard.set?.name ?? currentCard.expansion_name),
        card_pages: pageCount,
        stored_cards: cards.length,
        variants: variantCount,
        prices: pricePointCount,
        provider_request_count: providerRequestCount,
        message: `Fetched ${cards.length} ${game} card rows.`,
      })
      continuationAvailable = rows.length >= pageSize

      if (!continuationAvailable) {
        break
      }
    }
  }

  return {
    status: failedSets.length > 0 && cards.length === 0 ? "blocked" : "completed",
    cards_index_requested: true,
    provider_request_count: providerRequestCount,
    page_count: pageCount,
    reference_row_count: cards.length,
    continuation_available: continuationAvailable,
    reference_cards: cards,
    failed_sets: failedSets,
    provider_body_logged: false,
  }
}

async function fetchScryDexJson({ fetcher, baseUrl, apiKey, teamId, timeoutMs, maxRetries = DEFAULT_MAX_RETRIES, path, params }) {
  const endpoint = new URL(`${baseUrl}${path}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (cleanText(value)) {
      endpoint.searchParams.set(key, String(value))
    }
  }

  let lastResult = null
  const attempts = Math.max(1, maxRetries + 1)

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        headers: {
          "X-Api-Key": apiKey,
          "X-Team-ID": teamId,
          Accept: "application/json",
        },
        signal: controller?.signal,
      })
      const body = await safeJson(response)

      if (!response?.ok) {
        lastResult = {
          status: "blocked",
          code: errorCode(body),
          message: providerMessage(body, response),
          http_status: Number(response?.status ?? 0),
          attempts: attempt,
        }
      } else {
        return {
          status: "ok",
          body: body && typeof body === "object" ? body : {},
          attempts: attempt,
        }
      }
    } catch (error) {
      lastResult = {
        status: "blocked",
        code: error?.name === "AbortError" ? "scrydex_catalog_timeout" : "scrydex_catalog_unavailable",
        message: error instanceof Error ? error.message : "ScryDex catalog request failed.",
        http_status: 0,
        attempts: attempt,
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }

    if (attempt >= attempts || !retryableScryDexResult(lastResult)) {
      break
    }

    await delay(Math.min(5000, 250 * attempt * attempt))
  }

  return lastResult ?? {
    status: "blocked",
    code: "scrydex_catalog_request_failed",
    message: "ScryDex catalog request failed.",
    http_status: 0,
    attempts,
  }
}

function retryableScryDexResult(result) {
  const status = Number(result?.http_status ?? 0)

  return status === 0 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function boundedRetryCount(value) {
  const parsed = Number.parseInt(String(value ?? DEFAULT_MAX_RETRIES), 10)

  return Number.isFinite(parsed) ? Math.min(10, Math.max(0, parsed)) : DEFAULT_MAX_RETRIES
}

function providerList(body, paths) {
  for (const path of paths) {
    let value = body
    for (const segment of path) {
      value = value && typeof value === "object" ? value[segment] : undefined
    }
    if (Array.isArray(value)) {
      return value.filter((row) => row && typeof row === "object")
    }
  }

  return []
}

async function safeJson(response) {
  try {
    return typeof response?.json === "function" ? await response.json() : null
  } catch {
    return null
  }
}

function blocked(code, message, extra = {}) {
  return {
    status: "blocked",
    code,
    message: message || "ScryDex catalog index did not complete.",
    ...extra,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

function errorCode(body) {
  const raw = cleanText(body?.error ?? body?.code ?? "scrydex_catalog_request_failed")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")

  return raw.startsWith("scrydex_") ? raw : `scrydex_${raw || "catalog_request_failed"}`
}

function providerMessage(body, response) {
  return cleanText(body?.message ?? body?.detail ?? body?.error_description ?? body?.error) ||
    cleanText(response?.statusText) ||
    "ScryDex catalog request failed without a JSON error message."
}

function cleanBaseUrl(value) {
  const raw = cleanText(value).replace(/\/+$/g, "")
  if (!raw) {
    return ""
  }

  try {
    const parsed = new URL(raw)
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString().replace(/\/+$/g, "") : ""
  } catch {
    return ""
  }
}

function cleanGame(value) {
  const raw = cleanText(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")
  const aliases = {
    magic: "magicthegathering",
    mtg: "magicthegathering",
    "magic-the-gathering": "magicthegathering",
    "one-piece": "onepiece",
    "one-piece-card-game": "onepiece",
    "yu-gi-oh": "yugioh",
    "yu-gi-oh-tcg": "yugioh",
  }

  return aliases[raw] ?? (raw || "pokemon")
}

function cleanText(value) {
  return String(value ?? "").trim()
}

function boundedExpansionPageSize(value) {
  const parsed = Number.parseInt(String(value ?? DEFAULT_PAGE_SIZE), 10)

  return Number.isFinite(parsed)
    ? Math.min(MAX_EXPANSION_PAGE_SIZE, Math.max(1, parsed))
    : DEFAULT_PAGE_SIZE
}

function boundedCardPageSize(value, game) {
  const maxPageSize = CARD_PAGE_SIZE_LIMITS[cleanGame(game)] ?? DEFAULT_PAGE_SIZE
  const parsed = Number.parseInt(String(value ?? maxPageSize), 10)

  return Number.isFinite(parsed) ? Math.min(maxPageSize, Math.max(1, parsed)) : maxPageSize
}

function boundedMaxPages(value) {
  const parsed = Number.parseInt(String(value ?? "1000"), 10)

  return Number.isFinite(parsed) ? Math.min(10000, Math.max(1, parsed)) : 1000
}

function boundedTimeout(value) {
  const parsed = Number.parseInt(String(value ?? "120000"), 10)

  return Number.isFinite(parsed) ? Math.min(300000, Math.max(1000, parsed)) : 120000
}

function arrayLength(value) {
  return Array.isArray(value) ? value.length : 0
}

function countVariants(card) {
  return arrayLength(card?.variants)
}

function countPricePoints(card) {
  const direct = card?.price_points ?? card?.pricePoints ?? card?.prices
  const directCount = arrayLength(direct)
  const variants = Array.isArray(card?.variants) ? card.variants : []

  return variants.reduce((total, variant) => {
    return total + arrayLength(variant?.price_points ?? variant?.pricePoints ?? variant?.prices)
  }, directCount)
}
