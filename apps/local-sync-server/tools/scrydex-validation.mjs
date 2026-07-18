import { once } from "node:events"
import { createWriteStream } from "node:fs"
import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { createScryDexCatalogIndexer } from "../src/scrydexCatalogIndexer.mjs"
import {
  decimalPriceToSourceMinorUnits,
  normalizePriceCurrency,
  selectExactVariantPricePoint,
} from "../src/pricingEngine.mjs"

export const DEFAULT_CARDS_PER_SET = 200
export const DEFAULT_VALIDATION_OUTPUT_PATH = fileURLToPath(
  new URL("../../../PUG_SCRYDEX_VALIDATION.csv", import.meta.url),
)

export const VALIDATION_CSV_COLUMNS = Object.freeze([
  "row_type",
  "game",
  "expansion_id",
  "set_name",
  "set_code",
  "sample_position",
  "provider_card_id",
  "card_name",
  "card_number",
  "variant_count",
  "price_point_count",
  "raw_price_point_count",
  "graded_price_point_count",
  "priced_variant_count",
  "currency_codes",
  "image_present",
  "selectable_price_point_count",
  "pricing_error_count",
  "minimum_price_minor_units",
  "maximum_price_minor_units",
  "pricing_selection_status",
  "validation_status",
  "validation_codes",
])

const DEFAULT_GAMES = Object.freeze([
  "pokemon",
  "magicthegathering",
  "lorcana",
  "onepiece",
  "gundam",
  "riftbound",
])
const MAX_PROVIDER_PAGE_SIZE = 100
const DEFAULT_REQUESTS_PER_SECOND = 20
const MAX_REQUESTS_PER_SECOND = 99

export async function runScryDexValidation(options = {}) {
  const apiKey = cleanText(options.apiKey)
  const teamId = cleanText(options.teamId)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch

  if (!apiKey || !teamId) {
    throw new Error("ScryDex validation requires server-side API key and team ID environment values.")
  }
  if (typeof fetcher !== "function") {
    throw new Error("ScryDex validation requires a fetch implementation.")
  }

  const outputPath = resolve(cleanText(options.outputPath) || DEFAULT_VALIDATION_OUTPUT_PATH)
  const games = normalizeGames(options.games)
  const cardsPerSet = boundedInteger(options.cardsPerSet, 1, DEFAULT_CARDS_PER_SET, DEFAULT_CARDS_PER_SET)
  const pageSize = boundedInteger(options.pageSize, 1, MAX_PROVIDER_PAGE_SIZE, MAX_PROVIDER_PAGE_SIZE)
  const expansionPageSize = boundedInteger(
    options.expansionPageSize,
    1,
    MAX_PROVIDER_PAGE_SIZE,
    MAX_PROVIDER_PAGE_SIZE,
  )
  const maxExpansionPages = boundedInteger(options.maxExpansionPages, 1, 10000, 1000)
  const rateLimitedFetcher = createRateLimitAwareFetcher({
    fetcher: createReadOnlyFetcher(fetcher),
    requestsPerSecond: options.requestsPerSecond,
    maxRateLimitRetries: options.maxRateLimitRetries,
    sleep: options.sleep,
    now: options.now,
    onThrottle: options.onThrottle,
  })
  const indexer = createScryDexCatalogIndexer({
    apiKey,
    teamId,
    baseUrl: options.baseUrl,
    fetcher: rateLimitedFetcher,
    timeoutMs: options.timeoutMs,
    maxRetries: 0,
  })

  if (!indexer) {
    throw new Error("The existing ScryDex catalog index API could not be configured.")
  }

  await mkdir(dirname(outputPath), { recursive: true })
  const writer = createWriteStream(outputPath, { encoding: "utf8", flags: "w" })
  const summary = {
    status: "ok",
    action: "scrydex_read_only_validation_completed",
    output_path: outputPath,
    games,
    cards_per_set: cardsPerSet,
    provider_page_size: pageSize,
    set_count: 0,
    sampled_card_count: 0,
    passed_card_count: 0,
    warning_card_count: 0,
    failed_card_count: 0,
    empty_set_count: 0,
    provider_error_count: 0,
    expansion_listing_truncated_count: 0,
    provider_request_method: "GET",
    database_writes: false,
    credentials_printed: false,
  }
  const seenProviderCardIds = new Set()

  try {
    await writeCsvRow(writer, VALIDATION_CSV_COLUMNS)

    for (const game of games) {
      const expansionResult = await indexer({
        game,
        indexExpansions: true,
        skipCards: true,
        pageSize: expansionPageSize,
        expansionPageSize,
        maxExpansionPages,
      })

      if (expansionResult.status !== "ok") {
        summary.provider_error_count += 1
        await writeCsvRow(writer, csvValues(errorRow({
          rowType: "game_error",
          game,
          validationCode: cleanCode(expansionResult.code) || "expansion_listing_failed",
        })))
        continue
      }

      if (expansionResult.expansion_result?.continuation_available === true) {
        summary.expansion_listing_truncated_count += 1
        await writeCsvRow(writer, csvValues(errorRow({
          rowType: "game_error",
          game,
          validationCode: "expansion_page_limit_reached",
        })))
      }

      const expansionIds = uniqueSortedIds(expansionResult.expansion_result?.provider_set_ids)

      for (const expansionId of expansionIds) {
        summary.set_count += 1
        const cardResult = await indexer({
          game,
          expansionId,
          pageSize,
          maxPages: Math.ceil(cardsPerSet / pageSize),
        })

        if (cardResult.status !== "ok") {
          summary.provider_error_count += 1
          await writeCsvRow(writer, csvValues(errorRow({
            rowType: "set_error",
            game,
            expansionId,
            validationCode: cleanCode(cardResult.code) || "set_cards_failed",
          })))
          continue
        }

        const cards = sortedCards(cardResult.reference_cards).slice(0, cardsPerSet)

        if (cards.length === 0) {
          summary.empty_set_count += 1
          await writeCsvRow(writer, csvValues(errorRow({
            rowType: "set",
            game,
            expansionId,
            validationStatus: "warning",
            validationCode: "no_cards_returned",
          })))
          continue
        }

        for (const [index, card] of cards.entries()) {
          const row = validateCard(card, {
            game,
            expansionId,
            samplePosition: index + 1,
            seenProviderCardIds,
          })
          summary.sampled_card_count += 1
          if (row.validation_status === "pass") summary.passed_card_count += 1
          if (row.validation_status === "warning") summary.warning_card_count += 1
          if (row.validation_status === "fail") summary.failed_card_count += 1
          await writeCsvRow(writer, csvValues(row))
        }
      }
    }
  } finally {
    await closeWriter(writer)
  }

  if (
    summary.failed_card_count > 0 ||
    summary.provider_error_count > 0 ||
    summary.expansion_listing_truncated_count > 0
  ) {
    summary.status = "failed"
  }

  return summary
}

export function createRateLimitAwareFetcher(options = {}) {
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  if (typeof fetcher !== "function") {
    throw new Error("A fetch implementation is required.")
  }

  const requestsPerSecond = boundedInteger(
    options.requestsPerSecond,
    1,
    MAX_REQUESTS_PER_SECOND,
    DEFAULT_REQUESTS_PER_SECOND,
  )
  const intervalMs = Math.ceil(1000 / requestsPerSecond)
  const maxRateLimitRetries = boundedInteger(options.maxRateLimitRetries, 0, 10, 4)
  const sleep = typeof options.sleep === "function" ? options.sleep : delay
  const now = typeof options.now === "function" ? options.now : Date.now
  const onThrottle = typeof options.onThrottle === "function" ? options.onThrottle : null
  let nextRequestAt = 0
  let providerBlockedUntil = 0
  let queue = Promise.resolve()

  return async function rateLimitAwareFetch(...args) {
    const previous = queue
    let releaseQueue
    queue = new Promise((resolveQueue) => {
      releaseQueue = resolveQueue
    })
    await previous

    try {
      for (let retry = 0; retry <= maxRateLimitRetries; retry += 1) {
        const waitUntil = Math.max(nextRequestAt, providerBlockedUntil)
        const waitMs = Math.max(0, waitUntil - now())
        if (waitMs > 0) {
          onThrottle?.({ reason: providerBlockedUntil >= nextRequestAt ? "provider_limit" : "request_pacing", wait_ms: waitMs })
          await sleep(waitMs)
        }
        nextRequestAt = Math.max(waitUntil, now()) + intervalMs

        const response = await fetcher(...args)
        const responseNow = now()
        const resetAt = rateLimitResetAt(response?.headers, responseNow)
        const remaining = numericHeader(response?.headers, [
          "x-ratelimit-remaining",
          "x-rate-limit-remaining",
          "ratelimit-remaining",
        ])

        if (remaining !== null && remaining <= 0) {
          providerBlockedUntil = Math.max(providerBlockedUntil, resetAt || responseNow + intervalMs)
        } else if (resetAt > 0 && responseNow >= providerBlockedUntil) {
          providerBlockedUntil = 0
        }

        if (Number(response?.status ?? 0) !== 429 || retry >= maxRateLimitRetries) {
          return response
        }

        const retryAfter = retryAfterMilliseconds(response?.headers, responseNow)
        const fallbackBackoff = Math.min(30000, 1000 * (2 ** retry))
        providerBlockedUntil = Math.max(providerBlockedUntil, responseNow + (retryAfter || fallbackBackoff))
        await discardResponseBody(response)
      }
    } finally {
      releaseQueue()
    }

    throw new Error("ScryDex rate-limit retry loop ended unexpectedly.")
  }
}

export function csvCell(value) {
  let text = String(value ?? "")
    .replace(/\0/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`
  }

  return `"${text.replace(/"/g, '""')}"`
}

function validateCard(card, context) {
  const providerCardId = cleanText(card?.provider_card_id ?? card?.providerCardId ?? card?.id)
  const cardName = cleanText(card?.card_name ?? card?.name)
  const expansion = objectValue(card?.expansion) ?? objectValue(card?.set) ?? {}
  const cardExpansionId = cleanText(
    card?.expansion_id ?? card?.expansionId ?? card?.set_id ?? card?.setId ?? expansion.id,
  )
  const setName = cleanText(card?.set_name ?? card?.setName ?? expansion.name)
  const setCode = cleanText(card?.set_code ?? card?.setCode ?? expansion.code).toUpperCase()
  const cardNumber = cleanText(card?.card_number ?? card?.cardNumber ?? card?.number)
  const variants = Array.isArray(card?.variants) ? card.variants.filter(objectValue) : []
  const pricePoints = normalizeCardPricePoints(card, variants)
  const pricing = validatePricingSelections(pricePoints, variants.length)
  const failureCodes = []
  const warningCodes = []
  const identityKey = `${context.game}:${providerCardId}`

  if (!providerCardId) failureCodes.push("missing_provider_card_id")
  if (!cardName) failureCodes.push("missing_card_name")
  if (cardExpansionId && cardExpansionId !== context.expansionId) failureCodes.push("set_id_mismatch")
  if (providerCardId && context.seenProviderCardIds.has(identityKey)) failureCodes.push("duplicate_provider_card_id")
  if (providerCardId) context.seenProviderCardIds.add(identityKey)
  if (!cardExpansionId) warningCodes.push("missing_set_id")
  if (!setName) warningCodes.push("missing_set_name")
  if (!cardNumber) warningCodes.push("missing_card_number")
  if (!hasCardImage(card, variants)) warningCodes.push("missing_image")
  if (variants.length === 0) warningCodes.push("missing_variants")
  if (pricePoints.length === 0) warningCodes.push("missing_prices")
  if (pricePoints.some((point) => point.has_positive_amount && !point.currency)) {
    failureCodes.push("price_currency_missing")
  }
  if (pricing.errorCount > 0) failureCodes.push("pricing_api_selection_failed")
  if (pricePoints.length > 0 && pricing.selectableCount === 0) warningCodes.push("unselectable_price_metadata")

  const validationCodes = [...new Set([...failureCodes, ...warningCodes])]
  const amounts = pricePoints.flatMap((point) => [
    point.market_price_minor_units,
    point.mid_price_minor_units,
    point.low_price_minor_units,
    point.high_price_minor_units,
  ]).filter((value) => value > 0)
  const currencies = [...new Set(pricePoints.map((point) => point.currency).filter(Boolean))].sort(compareText)
  const pricedVariantIds = new Set(pricePoints.map((point) => point.provider_variant_id).filter(Boolean))

  return {
    row_type: "card",
    game: context.game,
    expansion_id: context.expansionId,
    set_name: setName,
    set_code: setCode,
    sample_position: context.samplePosition,
    provider_card_id: providerCardId,
    card_name: cardName,
    card_number: cardNumber,
    variant_count: variants.length,
    price_point_count: pricePoints.length,
    raw_price_point_count: pricePoints.filter((point) => point.raw_or_graded === "raw").length,
    graded_price_point_count: pricePoints.filter((point) => point.raw_or_graded === "graded").length,
    priced_variant_count: pricedVariantIds.size,
    currency_codes: currencies.join("|"),
    image_present: hasCardImage(card, variants) ? "yes" : "no",
    selectable_price_point_count: pricing.selectableCount,
    pricing_error_count: pricing.errorCount,
    minimum_price_minor_units: amounts.length > 0 ? Math.min(...amounts) : "",
    maximum_price_minor_units: amounts.length > 0 ? Math.max(...amounts) : "",
    pricing_selection_status: pricing.errorCount > 0
      ? "failed"
      : pricing.selectableCount > 0
        ? "ok"
        : "not_applicable",
    validation_status: failureCodes.length > 0 ? "fail" : warningCodes.length > 0 ? "warning" : "pass",
    validation_codes: validationCodes.join("|"),
  }
}

function normalizeCardPricePoints(card, variants) {
  const sources = []
  appendArrayPriceSources(sources, card, "")
  appendGradedPriceSources(sources, card?.graded_prices ?? card?.gradedPrices, "")

  for (const variant of variants) {
    const providerVariantId = cleanText(
      variant.provider_variant_id ?? variant.providerVariantId ?? variant.variant_id ?? variant.variantId ?? variant.id,
    )
    appendArrayPriceSources(sources, variant, providerVariantId)
    appendGradedPriceSources(sources, variant.graded_prices ?? variant.gradedPrices, providerVariantId)
  }

  return sources.map(({ point, providerVariantId }) => normalizePricePoint(point, providerVariantId))
}

function appendArrayPriceSources(target, source, providerVariantId) {
  const values = source?.price_points ?? source?.pricePoints ?? source?.prices
  if (!Array.isArray(values)) return

  for (const point of values) {
    if (objectValue(point)) target.push({ point, providerVariantId })
  }
}

function appendGradedPriceSources(target, value, providerVariantId) {
  if (!objectValue(value)) return

  for (const [companyKey, companyValue] of Object.entries(value)) {
    if (!objectValue(companyValue)) continue
    const parsedCompany = parseCompanyAndGrade(companyKey)

    if (looksLikePricePoint(companyValue)) {
      target.push({
        providerVariantId,
        point: {
          ...companyValue,
          type: "graded",
          company: companyValue.company ?? parsedCompany.company,
          grade: companyValue.grade ?? parsedCompany.grade,
        },
      })
      continue
    }

    for (const [grade, priceValue] of Object.entries(companyValue)) {
      const point = objectValue(priceValue) ? priceValue : { market: priceValue }
      target.push({
        providerVariantId,
        point: {
          ...point,
          type: "graded",
          company: point.company ?? parsedCompany.company,
          grade: point.grade ?? grade,
        },
      })
    }
  }
}

function normalizePricePoint(point, fallbackProviderVariantId) {
  const currency = normalizePriceCurrency(point.currency) || cleanCurrency(point.currency)
  const rawOrGraded = cleanText(
    point.raw_or_graded ?? point.rawOrGraded ?? point.type ?? (point.is_perfect === true ? "graded" : "raw"),
  ).toLowerCase() === "graded" ? "graded" : "raw"
  const normalized = {
    reference_variant_id: positiveInteger(point.reference_variant_id ?? point.referenceVariantId),
    provider_variant_id: cleanText(
      point.provider_variant_id ?? point.providerVariantId ?? fallbackProviderVariantId,
    ),
    condition_code: cleanText(point.condition_code ?? point.condition),
    raw_or_graded: rawOrGraded,
    grading_company: cleanText(point.grading_company ?? point.gradingCompany ?? point.grader ?? point.company),
    grade: cleanText(point.grade ?? point.grading_grade ?? point.gradingGrade ?? (point.is_perfect === true ? "10" : "")),
    market_price_minor_units: priceMinorUnits(
      point.market_price_minor_units,
      point.market_price ?? point.market ?? point.market_value ?? point.marketValue ?? point.value,
      currency,
    ),
    low_price_minor_units: priceMinorUnits(
      point.low_price_minor_units,
      point.low_price ?? point.lowPrice ?? point.low ?? point.market_low ?? point.marketLow,
      currency,
    ),
    mid_price_minor_units: priceMinorUnits(
      point.mid_price_minor_units,
      point.mid_price ?? point.midPrice ?? point.mid ?? point.market_mid ?? point.marketMid,
      currency,
    ),
    high_price_minor_units: priceMinorUnits(
      point.high_price_minor_units,
      point.high_price ?? point.highPrice ?? point.high ?? point.market_high ?? point.marketHigh,
      currency,
    ),
    currency,
    observed_at_utc: cleanText(
      point.observed_at_utc ?? point.observedAtUtc ?? point.observed_at ?? point.source_observed_at,
    ),
  }

  return {
    ...normalized,
    has_positive_amount: [
      normalized.market_price_minor_units,
      normalized.low_price_minor_units,
      normalized.mid_price_minor_units,
      normalized.high_price_minor_units,
    ].some((value) => value > 0),
  }
}

function validatePricingSelections(points, variantCount) {
  let selectableCount = 0
  let errorCount = 0

  for (const point of points) {
    if (!point.has_positive_amount || !point.currency) continue

    const request = point.raw_or_graded === "graded"
      ? {
          raw_or_graded: "graded",
          provider_variant_id: point.provider_variant_id,
          reference_variant_id: point.reference_variant_id,
          variant_count: point.provider_variant_id || point.reference_variant_id ? variantCount : 0,
          grading_company: point.grading_company,
          grade: point.grade,
        }
      : {
          raw_or_graded: "raw",
          provider_variant_id: point.provider_variant_id,
          reference_variant_id: point.reference_variant_id,
          variant_count: point.provider_variant_id || point.reference_variant_id ? variantCount : 0,
          condition: point.condition_code,
        }

    if (point.raw_or_graded === "raw" && !point.condition_code) continue
    if (point.raw_or_graded === "graded" && !point.grading_company && !point.grade) continue

    selectableCount += 1
    if (selectExactVariantPricePoint(points, request).status !== "ok") errorCount += 1
  }

  return { selectableCount, errorCount }
}

function errorRow({ rowType, game, expansionId = "", validationStatus = "fail", validationCode }) {
  return {
    row_type: rowType,
    game,
    expansion_id: expansionId,
    pricing_selection_status: "not_applicable",
    validation_status: validationStatus,
    validation_codes: validationCode,
  }
}

function csvValues(row) {
  return VALIDATION_CSV_COLUMNS.map((column) => row[column] ?? "")
}

async function writeCsvRow(writer, values) {
  if (!writer.write(`${values.map(csvCell).join(",")}\n`)) {
    await once(writer, "drain")
  }
}

async function closeWriter(writer) {
  if (writer.destroyed || writer.writableFinished) return

  await new Promise((resolveClose, rejectClose) => {
    writer.once("finish", resolveClose)
    writer.once("error", rejectClose)
    writer.end()
  })
}

function uniqueSortedIds(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(cleanText).filter(Boolean))].sort(compareText)
}

function sortedCards(value) {
  return (Array.isArray(value) ? [...value] : [])
    .filter(objectValue)
    .sort((left, right) => compareText(cardSortKey(left), cardSortKey(right)))
}

function cardSortKey(card) {
  return [
    cleanText(card?.provider_card_id ?? card?.providerCardId ?? card?.id),
    cleanText(card?.card_number ?? card?.cardNumber ?? card?.number),
    cleanText(card?.card_name ?? card?.name),
  ].join("\u0000")
}

function hasCardImage(card, variants) {
  const direct = [card?.image_url, card?.front_image_url, card?.frontImageUrl]
  if (direct.some(isHttpUrl)) return true
  if (imageCollectionHasUrl(card?.images)) return true

  return variants.some((variant) =>
    [variant?.image_url, variant?.front_image_url, variant?.frontImageUrl].some(isHttpUrl) ||
    imageCollectionHasUrl(variant?.images),
  )
}

function imageCollectionHasUrl(images) {
  if (Array.isArray(images)) {
    return images.some((image) => objectValue(image) && Object.values(image).some(isHttpUrl))
  }
  if (objectValue(images)) {
    return Object.values(images).some((value) => isHttpUrl(value) || (objectValue(value) && Object.values(value).some(isHttpUrl)))
  }
  return false
}

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(cleanText(value)).protocol)
  } catch {
    return false
  }
}

function priceMinorUnits(minorValue, decimalValue, currency) {
  if (minorValue !== undefined && minorValue !== null && minorValue !== "") {
    const parsed = Number(minorValue)
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
  }
  return decimalPriceToSourceMinorUnits(decimalValue, currency)
}

function createReadOnlyFetcher(fetcher) {
  return async function readOnlyFetch(input, init = {}) {
    const method = cleanText(init?.method ?? input?.method ?? "GET").toUpperCase() || "GET"
    if (method !== "GET" || init?.body !== undefined) {
      throw new Error("ScryDex validation blocked a non-read-only provider request.")
    }
    return fetcher(input, init)
  }
}

async function discardResponseBody(response) {
  try {
    if (typeof response?.body?.cancel === "function") {
      await response.body.cancel()
    }
  } catch {
    // The retry is still safe when a test double or transport has no cancellable body.
  }
}

function rateLimitResetAt(headers, nowMs) {
  const headerNames = ["x-ratelimit-reset", "x-rate-limit-reset", "ratelimit-reset"]
  for (const name of headerNames) {
    const raw = headerValue(headers, name)
    if (!raw) continue
    const parsedDate = Date.parse(raw)
    if (Number.isFinite(parsedDate) && !/^\d+(?:\.\d+)?$/.test(raw)) return parsedDate

    const number = Number(raw)
    if (!Number.isFinite(number) || number < 0) continue
    if (name === "ratelimit-reset") return nowMs + (number * 1000)
    if (number > 1000000000000) return number
    if (number > 1000000000) return number * 1000
    return nowMs + (number * 1000)
  }
  return 0
}

function retryAfterMilliseconds(headers, nowMs) {
  const raw = headerValue(headers, "retry-after")
  if (!raw) return 0
  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000)
  const date = Date.parse(raw)
  return Number.isFinite(date) ? Math.max(0, date - nowMs) : 0
}

function numericHeader(headers, names) {
  for (const name of names) {
    const value = Number(headerValue(headers, name))
    if (Number.isFinite(value)) return value
  }
  return null
}

function headerValue(headers, name) {
  if (!headers || typeof headers.get !== "function") return ""
  return cleanText(headers.get(name))
}

function looksLikePricePoint(value) {
  return [
    "market",
    "market_price",
    "marketValue",
    "value",
    "low",
    "mid",
    "high",
    "currency",
  ].some((key) => value[key] !== undefined)
}

function parseCompanyAndGrade(value) {
  const text = cleanText(value)
  const match = text.match(/^(.*?)(?:\s+)(10|[0-9](?:\.5)?)$/)
  return match ? { company: cleanText(match[1]), grade: match[2] } : { company: text, grade: "" }
}

function normalizeGames(value) {
  const requested = Array.isArray(value)
    ? value
    : cleanText(value).split(",")
  const games = requested.map(cleanGame).filter(Boolean)
  return [...new Set(games.length > 0 ? games : DEFAULT_GAMES)].sort(compareText)
}

function cleanGame(value) {
  const game = cleanText(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")
  const aliases = {
    magic: "magicthegathering",
    mtg: "magicthegathering",
    "magic-the-gathering": "magicthegathering",
    "one-piece": "onepiece",
  }
  return aliases[game] ?? game
}

function cleanCurrency(value) {
  const currency = cleanText(value).toUpperCase()
  return /^[A-Z]{3}$/.test(currency) ? currency : ""
}

function cleanCode(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "")
}

function cleanText(value) {
  return String(value ?? "").trim()
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null
}

function positiveInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}

function compareText(left, right) {
  const normalizedLeft = String(left).toLowerCase()
  const normalizedRight = String(right).toLowerCase()
  if (normalizedLeft < normalizedRight) return -1
  if (normalizedLeft > normalizedRight) return 1
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
}

function firstEnv(...names) {
  for (const name of names) {
    const value = cleanText(process.env[name])
    if (value) return value
  }
  return ""
}

function parseCliArguments(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--help" || argument === "-h") {
      parsed.help = true
      continue
    }
    if (!["--games", "--output", "--base-url", "--requests-per-second", "--max-expansion-pages"].includes(argument)) {
      throw new Error(`Unknown ScryDex validation option: ${argument}`)
    }
    const value = argv[index + 1]
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}.`)
    index += 1
    if (argument === "--games") parsed.games = value
    if (argument === "--output") parsed.outputPath = value
    if (argument === "--base-url") parsed.baseUrl = value
    if (argument === "--requests-per-second") parsed.requestsPerSecond = value
    if (argument === "--max-expansion-pages") parsed.maxExpansionPages = value
  }
  return parsed
}

function printHelp() {
  console.log([
    "Generate a deterministic, read-only 200-card-per-set ScryDex validation CSV.",
    "",
    "Usage: node tools/scrydex-validation.mjs [options]",
    "",
    "Options:",
    "  --games <csv>                 Games to validate (defaults to the LAN server supported list).",
    "  --output <path>               CSV path (defaults to repository PUG_SCRYDEX_VALIDATION.csv).",
    "  --base-url <url>              Override SCRYDEX_BASE_URL.",
    "  --requests-per-second <1-99>  Client-side request ceiling (defaults to 20).",
    "  --max-expansion-pages <n>     Expansion-listing page ceiling (defaults to 1000).",
    "  --help                        Show this help.",
    "",
    "Credentials are read only from SCRYDEX_API_KEY/PUG_SCRYDEX_API_KEY and",
    "SCRYDEX_TEAM_ID/PUG_SCRYDEX_TEAM_ID. The harness performs GET requests only.",
  ].join("\n"))
}

async function main() {
  let apiKey = ""
  let teamId = ""
  try {
    const cli = parseCliArguments(process.argv.slice(2))
    if (cli.help) {
      printHelp()
      return
    }

    apiKey = firstEnv("SCRYDEX_API_KEY", "PUG_SCRYDEX_API_KEY")
    teamId = firstEnv("SCRYDEX_TEAM_ID", "PUG_SCRYDEX_TEAM_ID")
    const summary = await runScryDexValidation({
      ...cli,
      apiKey,
      teamId,
      baseUrl: cli.baseUrl || firstEnv("SCRYDEX_BASE_URL", "PUG_SCRYDEX_BASE_URL"),
      timeoutMs: firstEnv("SCRYDEX_CATALOG_TIMEOUT_MS", "PUG_SCRYDEX_CATALOG_TIMEOUT_MS"),
    })
    console.log(JSON.stringify(summary, null, 2))
    if (summary.status !== "ok") process.exitCode = 1
  } catch (error) {
    let message = error instanceof Error ? error.message : "ScryDex validation failed."
    for (const secret of [apiKey, teamId].filter(Boolean)) message = message.replaceAll(secret, "[redacted]")
    console.error(JSON.stringify({
      status: "failed",
      code: "scrydex_validation_failed",
      message: message.slice(0, 500),
      credentials_printed: false,
      database_writes: false,
    }, null, 2))
    process.exitCode = 1
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
if (isMain) await main()
