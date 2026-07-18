import { once } from "node:events"
import { createWriteStream, existsSync } from "node:fs"
import { mkdir, readFile } from "node:fs/promises"
import { DatabaseSync } from "node:sqlite"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { createScryDexCatalogIndexer } from "../src/scrydexCatalogIndexer.mjs"
import {
  calculateAutomaticSalePrice,
  convertSourcePriceToUsd,
  decimalPriceToSourceMinorUnits,
  normalizePriceCurrency,
  priceChangeBasisPoints,
  priceChangeRequiresReview,
  selectExactVariantPricePoint,
} from "../src/pricingEngine.mjs"

export const DEFAULT_CARDS_PER_SET = 200
export const DEFAULT_VALIDATION_OUTPUT_PATH = fileURLToPath(
  new URL("../../../PUG_SCRYDEX_VALIDATION.csv", import.meta.url),
)
export const DEFAULT_SANITIZED_FIXTURE_PATH = fileURLToPath(
  new URL("../tests/fixtures/scrydex-validation-pages.json", import.meta.url),
)

export const VALIDATION_CSV_COLUMNS = Object.freeze([
  "row_type",
  "sample_scope",
  "game",
  "expansion_id",
  "set_name",
  "set_code",
  "sample_position",
  "expected_identity",
  "matched_identity",
  "identity_match_status",
  "match_method",
  "provider_card_id",
  "card_name",
  "card_number",
  "expected_provider_variant_id",
  "matched_provider_variant_id",
  "expected_reference_variant_id",
  "matched_reference_variant_id",
  "expected_language",
  "matched_language",
  "expected_finish",
  "matched_finish",
  "expected_treatment",
  "matched_treatment",
  "local_reference_match_count",
  "local_inventory_match_count",
  "local_inventory_public_ids",
  "wordpress_public_ids",
  "square_variation_ids",
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
  "source_provider",
  "source_record_id",
  "source_variant",
  "raw_or_graded",
  "requested_condition",
  "selected_condition",
  "requested_grading_company",
  "selected_grading_company",
  "requested_grade",
  "selected_grade",
  "fallback_used",
  "fallback_reason",
  "source_currency",
  "source_value_minor_units",
  "fx_provider",
  "fx_rate",
  "fx_value_minor_units",
  "markup_basis_points",
  "rounded_sale_minor_units",
  "floor_minor_units",
  "floor_applied",
  "current_price_minor_units",
  "percent_change_basis_points",
  "final_publication_decision",
  "price_observed_at_utc",
  "catalog_source",
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
  const snapshot = resolveCatalogSnapshot(options)
  const catalogRows = snapshot.catalogRows
  const inventoryRows = snapshot.inventoryRows
  const representedSets = representedCatalogSets(catalogRows, inventoryRows)
  const localIndexes = buildLocalIndexes(catalogRows, inventoryRows)
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
    catalog_snapshot_status: snapshot.status,
    represented_set_count: representedSets.length,
    represented_set_unresolved_count: 0,
    sample_scope: representedSets.length > 0 ? "local_pug_catalog" : "provider_catalog_fallback",
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
      const gameRepresentedSets = representedSets.filter((set) => set.game === game)
      const selection = selectRepresentedExpansionIds(expansionIds, gameRepresentedSets)
      const selectedExpansionIds = gameRepresentedSets.length > 0 ? selection.expansionIds : expansionIds

      for (const unresolved of selection.unresolved) {
        summary.represented_set_unresolved_count += 1
        await writeCsvRow(writer, csvValues(errorRow({
          rowType: "set_error",
          sampleScope: "local_pug_catalog",
          game,
          expansionId: unresolved.providerSetId,
          setName: unresolved.setName,
          setCode: unresolved.setCode,
          validationCode: "represented_set_provider_id_unresolved",
        })))
      }

      for (const expansionId of selectedExpansionIds) {
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
            sampleScope: gameRepresentedSets.length > 0 ? "local_pug_catalog" : "provider_catalog_fallback",
            localIndexes,
            options,
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
    || summary.represented_set_unresolved_count > 0
  ) {
    summary.status = "failed"
  }

  return summary
}

export async function runSanitizedFixtureValidation(options = {}) {
  const fixturePath = resolve(cleanText(options.fixturePath) || DEFAULT_SANITIZED_FIXTURE_PATH)
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"))
  const catalogRows = validObjects(fixture.local_catalog_rows)
  const inventoryRows = validObjects(fixture.inventory_rows)
  const games = uniqueValues(
    [...catalogRows, ...inventoryRows, ...validObjects(fixture.expansions)].map((row) => cleanGame(row.game || "pokemon")),
  )
  const summary = await runScryDexValidation({
    ...options,
    apiKey: "sanitized-fixture-key",
    teamId: "sanitized-fixture-team",
    baseUrl: "https://scrydex.fixture.invalid",
    fetcher: createSanitizedFixtureFetcher(fixture),
    catalogRows,
    inventoryRows,
    games: games.length > 0 ? games : ["pokemon"],
    requestsPerSecond: 99,
    sleep: async () => {},
    nowDate: new Date("2026-01-01T00:00:00.000Z"),
  })
  return { ...summary, action: "scrydex_sanitized_fixture_validation_completed", sanitized_fixture: true }
}

function createSanitizedFixtureFetcher(fixture) {
  return async (input) => {
    const endpoint = new URL(String(input))
    const [, game] = endpoint.pathname.split("/")
    const page = boundedInteger(endpoint.searchParams.get("page"), 1, 100000, 1)
    const pageSize = boundedInteger(endpoint.searchParams.get("page_size"), 1, MAX_PROVIDER_PAGE_SIZE, MAX_PROVIDER_PAGE_SIZE)
    if (endpoint.pathname === `/${game}/v1/expansions`) {
      return sanitizedFixtureResponse({ data: pageSlice(validObjects(fixture.expansions), page, pageSize) })
    }
    const match = endpoint.pathname.match(/^\/([^/]+)\/v1\/expansions\/([^/]+)\/cards$/)
    if (!match) return sanitizedFixtureResponse({ error: "fixture_endpoint_not_found" }, 404)
    const expansionId = decodeURIComponent(match[2])
    return sanitizedFixtureResponse({
      data: pageSlice(validObjects(fixture.cards_by_expansion?.[expansionId]), page, pageSize),
    })
  }
}

function pageSlice(values, page, pageSize) {
  const start = (page - 1) * pageSize
  return values.slice(start, start + pageSize)
}

function sanitizedFixtureResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Fixture Error",
    headers: { get: () => null },
    json: async () => body,
  }
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
  const local = findLocalMatches(card, context.game, context.localIndexes)
  const expected = local.inventoryMatches[0] ?? local.referenceMatches[0] ?? null
  const requested = requestedPricingIdentity(expected, pricePoints)
  const selection = selectExactVariantPricePoint(pricePoints, {
    raw_or_graded: requested.rawOrGraded,
    provider_variant_id: requested.providerVariantId,
    reference_variant_id: requested.referenceVariantId,
    variant_count: variants.length,
    condition: requested.condition,
    grading_company: requested.gradingCompany,
    grade: requested.grade,
  })
  const conversion = selection.status === "ok"
    ? convertSourcePriceToUsd({
        sourceAmountMinorUnits: selection.source_amount_minor_units,
        sourceCurrency: selection.source_currency,
        fxQuote: resolveFxQuote(context.options, selection.source_currency),
        now: context.options.nowDate ?? new Date(),
        maxFxAgeMs: context.options.maxFxAgeMs,
      })
    : { status: "review_required", reason_code: selection.reason_code || "exact_variant_price_missing" }
  const currentPriceMinorUnits = nonNegativeInteger(expected?.price_minor_units ?? expected?.sale_price_minor_units)
  const floorMinorUnits = nonNegativeInteger(
    expected?.minimum_sale_price_minor_units ?? expected?.minimum_price_minor_units,
  )
  const markupBasisPoints = boundedInteger(context.options.markupBasisPoints, 0, 10000, 1000)
  const calculation = conversion.status === "ok"
    ? calculateAutomaticSalePrice({
        sourceUsdMinorUnits: conversion.converted_usd_minor_units,
        markupBasisPoints,
        effectiveFloorMinorUnits: floorMinorUnits,
      })
    : null
  const decision = publicationDecision({
    expected,
    selection,
    conversion,
    calculation,
    currentPriceMinorUnits,
    thresholdBasisPoints: context.options.reviewThresholdBasisPoints,
  })
  const failureCodes = []
  const warningCodes = []
  const identityKey = `${context.game}:${providerCardId}`
  const identity = compareIdentity(expected, card, context.game)
  const matchedVariant = findMatchedVariant(variants, selection?.provider_variant_id)
  const expectedProviderVariantId = cleanText(expected?.provider_variant_id ?? expected?.providerVariantId)
  const expectedReferenceVariantId = positiveInteger(expected?.reference_variant_id ?? expected?.referenceVariantId)
  const matchedProviderVariantId = cleanText(selection?.provider_variant_id)
  const matchedReferenceVariantId = positiveInteger(selection?.reference_variant_id)
  const expectedLanguage = cleanText(expected?.language)
  const expectedFinish = cleanText(expected?.finish ?? expected?.printing ?? expected?.variant)
  const expectedTreatment = cleanText(expected?.treatment ?? expected?.border ?? expected?.frame)
  const matchedLanguage = cleanText(matchedVariant?.language ?? card?.language)
  const matchedFinish = cleanText(matchedVariant?.finish ?? matchedVariant?.printing ?? matchedVariant?.name ?? card?.finish)
  const matchedTreatment = cleanText(
    matchedVariant?.treatment ?? matchedVariant?.border ?? matchedVariant?.frame ?? card?.treatment,
  )

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
  if (expected && identity.status !== "match") failureCodes.push("local_identity_mismatch")
  if (expectedProviderVariantId && matchedProviderVariantId && expectedProviderVariantId !== matchedProviderVariantId) {
    failureCodes.push("provider_variant_mismatch")
  }
  if (expectedReferenceVariantId && matchedReferenceVariantId && expectedReferenceVariantId !== matchedReferenceVariantId) {
    failureCodes.push("reference_variant_mismatch")
  }
  if (expectedLanguage && matchedLanguage && normalizeComparable(expectedLanguage) !== normalizeComparable(matchedLanguage)) {
    failureCodes.push("language_mismatch")
  }
  if (expectedFinish && matchedFinish && normalizeComparable(expectedFinish) !== normalizeComparable(matchedFinish)) {
    failureCodes.push("finish_mismatch")
  }
  if (expectedTreatment && matchedTreatment && normalizeComparable(expectedTreatment) !== normalizeComparable(matchedTreatment)) {
    failureCodes.push("treatment_mismatch")
  }
  if (selection.status !== "ok") warningCodes.push(cleanCode(selection.reason_code) || "price_review_required")
  if (selection.status === "ok" && conversion.status !== "ok") {
    warningCodes.push(cleanCode(conversion.reason_code) || "currency_review_required")
  }
  if (context.sampleScope === "local_pug_catalog" && local.referenceMatches.length === 0) {
    warningCodes.push("local_reference_mapping_missing")
  }
  if (local.referenceMatches.length > 1) failureCodes.push("duplicate_local_reference_mapping")

  const validationCodes = [...new Set([...failureCodes, ...warningCodes])]
  const amounts = pricePoints.flatMap((point) => [
    point.market_price_minor_units,
    point.mid_price_minor_units,
    point.low_price_minor_units,
    point.high_price_minor_units,
  ]).filter((value) => value > 0)
  const currencies = [...new Set(pricePoints.map((point) => point.currency).filter(Boolean))].sort(compareText)
  const pricedVariantIds = new Set(pricePoints.map((point) => point.provider_variant_id).filter(Boolean))
  const fallbackReasons = [selection?.condition_fallback_reason, selection?.grade_fallback_reason]
    .map(cleanCode)
    .filter(Boolean)
  const inventoryPublicIds = uniqueValues(local.inventoryMatches.map((row) => row.public_id))
  const wordpressPublicIds = uniqueValues(local.inventoryMatches.map((row) => row.wordpress_public_id))
  const squareVariationIds = uniqueValues(local.inventoryMatches.map((row) => row.square_catalog_variation_id))

  return {
    row_type: "card",
    sample_scope: context.sampleScope,
    game: context.game,
    expansion_id: context.expansionId,
    set_name: setName,
    set_code: setCode,
    sample_position: context.samplePosition,
    expected_identity: identity.expected,
    matched_identity: identity.matched,
    identity_match_status: identity.status,
    match_method: local.matchMethod,
    provider_card_id: providerCardId,
    card_name: cardName,
    card_number: cardNumber,
    expected_provider_variant_id: expectedProviderVariantId,
    matched_provider_variant_id: matchedProviderVariantId,
    expected_reference_variant_id: expectedReferenceVariantId ?? "",
    matched_reference_variant_id: matchedReferenceVariantId ?? "",
    expected_language: expectedLanguage,
    matched_language: matchedLanguage,
    expected_finish: expectedFinish,
    matched_finish: matchedFinish,
    expected_treatment: expectedTreatment,
    matched_treatment: matchedTreatment,
    local_reference_match_count: local.referenceMatches.length,
    local_inventory_match_count: local.inventoryMatches.length,
    local_inventory_public_ids: inventoryPublicIds.join("|"),
    wordpress_public_ids: wordpressPublicIds.join("|"),
    square_variation_ids: squareVariationIds.join("|"),
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
      : selection.status === "ok"
        ? "ok"
        : "review_required",
    source_provider: "scrydex",
    source_record_id: cleanText(selection?.source_record_id) || providerCardId,
    source_variant: sourceVariantIdentity(matchedVariant, selection),
    raw_or_graded: requested.rawOrGraded,
    requested_condition: selection?.requested_condition || requested.condition,
    selected_condition: selection?.selected_condition || "",
    requested_grading_company: selection?.requested_grading_company || requested.gradingCompany,
    selected_grading_company: selection?.selected_grading_company || "",
    requested_grade: selection?.requested_grade || requested.grade,
    selected_grade: selection?.selected_grade || "",
    fallback_used: selection?.condition_fallback_used === true || selection?.grade_fallback_used === true ? "yes" : "no",
    fallback_reason: fallbackReasons.join("|"),
    source_currency: selection?.source_currency || "",
    source_value_minor_units: selection?.source_amount_minor_units ?? "",
    fx_provider: conversion?.fx_provider || "",
    fx_rate: conversion?.fx_rate || "",
    fx_value_minor_units: conversion?.converted_usd_minor_units ?? "",
    markup_basis_points: calculation ? markupBasisPoints : "",
    rounded_sale_minor_units: calculation?.rounded_minor_units ?? "",
    floor_minor_units: floorMinorUnits,
    floor_applied: calculation ? (calculation.floor_applied ? "yes" : "no") : "",
    current_price_minor_units: currentPriceMinorUnits,
    percent_change_basis_points: calculation
      ? priceChangeBasisPoints(currentPriceMinorUnits, calculation.candidate_price_minor_units)
      : "",
    final_publication_decision: decision,
    price_observed_at_utc: selection?.observed_at_utc || cleanText(card?.price_observed_at_utc),
    catalog_source: cleanText(expected?.catalog_source) || "scrydex_provider_validation",
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
    source_record_id: cleanText(point.source_record_id ?? point.sourceRecordId ?? point.id),
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

function resolveCatalogSnapshot(options) {
  if (Array.isArray(options.catalogRows) || Array.isArray(options.inventoryRows)) {
    return {
      status: "provided",
      catalogRows: validObjects(options.catalogRows),
      inventoryRows: validObjects(options.inventoryRows),
    }
  }

  const databasePath = cleanText(options.databasePath)
  if (!databasePath || !existsSync(resolve(databasePath))) {
    return { status: "unavailable", catalogRows: [], inventoryRows: [] }
  }

  const database = new DatabaseSync(resolve(databasePath), { readOnly: true })
  try {
    return {
      status: "local_sqlite",
      catalogRows: readTableIfPresent(database, "reference_cards"),
      inventoryRows: readTableIfPresent(database, "inventory_items"),
    }
  } finally {
    database.close()
  }
}

function readTableIfPresent(database, tableName) {
  const exists = database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
  ).get(tableName)
  return exists ? database.prepare(`SELECT * FROM ${tableName}`).all() : []
}

function representedCatalogSets(catalogRows, inventoryRows) {
  const sets = new Map()
  for (const row of [...catalogRows, ...inventoryRows]) {
    const game = cleanGame(row.game)
    const providerSetId = cleanText(row.provider_set_id ?? row.expansion_id ?? row.set_id)
    const setName = cleanText(row.set_name ?? row.name)
    const setCode = cleanText(row.set_code ?? row.code)
    if (!game || (!providerSetId && !setName && !setCode)) continue
    const key = [game, providerSetId || normalizeComparable(setCode) || normalizeComparable(setName)].join("|")
    if (!sets.has(key)) sets.set(key, { game, providerSetId, setName, setCode })
  }
  return [...sets.values()].sort((left, right) => compareText(
    `${left.game}|${left.providerSetId}|${left.setCode}|${left.setName}`,
    `${right.game}|${right.providerSetId}|${right.setCode}|${right.setName}`,
  ))
}

function selectRepresentedExpansionIds(providerExpansionIds, representedSets) {
  if (representedSets.length === 0) return { expansionIds: providerExpansionIds, unresolved: [] }

  const providerIds = new Map(providerExpansionIds.map((id) => [normalizeComparable(id), id]))
  const expansionIds = []
  const unresolved = []
  for (const set of representedSets) {
    const candidates = uniqueValues([set.providerSetId, set.setCode, set.setName])
    const matched = candidates.map(normalizeComparable).map((key) => providerIds.get(key)).find(Boolean)
    if (matched) {
      expansionIds.push(matched)
    } else if (set.providerSetId) {
      expansionIds.push(set.providerSetId)
    } else {
      unresolved.push(set)
    }
  }

  return { expansionIds: uniqueValues(expansionIds).sort(compareText), unresolved }
}

function buildLocalIndexes(catalogRows, inventoryRows) {
  return {
    references: indexLocalRows(catalogRows),
    inventory: indexLocalRows(inventoryRows),
  }
}

function indexLocalRows(rows) {
  const byProviderCardId = new Map()
  const byComposite = new Map()
  for (const row of rows) {
    appendIndex(byProviderCardId, cleanText(row.provider_card_id ?? row.providerCardId), row)
    appendIndex(byComposite, localIdentityKey(row, row.game), row)
  }
  return { byProviderCardId, byComposite }
}

function appendIndex(index, key, value) {
  if (!key) return
  const current = index.get(key) ?? []
  current.push(value)
  index.set(key, current)
}

function findLocalMatches(card, game, indexes) {
  const providerCardId = cleanText(card?.provider_card_id ?? card?.providerCardId ?? card?.id)
  const composite = localIdentityKey(card, game)
  const providerReferenceMatches = indexes.references.byProviderCardId.get(providerCardId) ?? []
  const providerInventoryMatches = indexes.inventory.byProviderCardId.get(providerCardId) ?? []
  if (providerReferenceMatches.length > 0 || providerInventoryMatches.length > 0) {
    return {
      referenceMatches: providerReferenceMatches,
      inventoryMatches: providerInventoryMatches,
      matchMethod: "provider_card_id",
    }
  }
  const referenceMatches = indexes.references.byComposite.get(composite) ?? []
  const inventoryMatches = indexes.inventory.byComposite.get(composite) ?? []
  return {
    referenceMatches,
    inventoryMatches,
    matchMethod: referenceMatches.length > 0 || inventoryMatches.length > 0 ? "game_set_number_name" : "not_in_local_catalog",
  }
}

function localIdentityKey(row, fallbackGame) {
  const expansion = objectValue(row?.expansion) ?? objectValue(row?.set) ?? {}
  const game = cleanGame(row?.game ?? fallbackGame)
  const set = normalizeComparable(
    row?.provider_set_id ?? row?.expansion_id ?? row?.set_id ?? row?.set_code ?? row?.set_name ?? expansion.id ?? expansion.code ?? expansion.name,
  )
  const number = normalizeComparable(row?.card_number ?? row?.number ?? row?.printed_number)
  const name = normalizeComparable(row?.card_name ?? row?.name)
  return game && set && (number || name) ? `${game}|${set}|${number}|${name}` : ""
}

function compareIdentity(expected, card, fallbackGame) {
  const providerCardId = cleanText(card?.provider_card_id ?? card?.providerCardId ?? card?.id)
  const matched = identityText(card, fallbackGame)
  if (!expected) return { expected: matched, matched, status: "provider_only" }

  const expectedText = identityText(expected, fallbackGame)
  const mismatches = []
  compareField(mismatches, "game", cleanGame(expected.game), cleanGame(card.game ?? fallbackGame))
  compareField(mismatches, "provider_card_id", cleanText(expected.provider_card_id), providerCardId)
  if (!setsEquivalent(expected, card)) mismatches.push("set")
  compareField(
    mismatches,
    "card_number",
    normalizeComparable(expected.card_number ?? expected.printed_number),
    normalizeComparable(card.card_number ?? card.number),
  )
  compareField(mismatches, "card_name", normalizeComparable(expected.card_name), normalizeComparable(card.card_name ?? card.name))
  return { expected: expectedText, matched, status: mismatches.length === 0 ? "match" : `mismatch:${mismatches.join("|")}` }
}

function compareField(mismatches, name, expected, matched) {
  if (expected && matched && expected !== matched) mismatches.push(name)
}

function identityText(row, fallbackGame) {
  const providerCardId = cleanText(row?.provider_card_id ?? row?.providerCardId ?? row?.id)
  return [
    cleanGame(row?.game ?? fallbackGame),
    cleanText(row?.provider_set_id ?? row?.expansion_id ?? row?.set_id ?? row?.set_code ?? row?.set_name ?? row?.expansion?.id),
    cleanText(row?.card_number ?? row?.number ?? row?.printed_number),
    cleanText(row?.card_name ?? row?.name),
    providerCardId,
  ].join("|")
}

function setIdentityAliases(row) {
  const expansion = objectValue(row?.expansion) ?? objectValue(row?.set) ?? {}
  return new Set(uniqueValues([
    row?.provider_set_id,
    row?.expansion_id,
    row?.set_id,
    row?.set_code,
    row?.set_name,
    expansion.id,
    expansion.code,
    expansion.name,
  ]).map(normalizeComparable).filter(Boolean))
}

function setsEquivalent(expected, matched) {
  const expectedAliases = setIdentityAliases(expected)
  const matchedAliases = setIdentityAliases(matched)
  if (expectedAliases.size === 0 || matchedAliases.size === 0) return true
  return [...expectedAliases].some((alias) => matchedAliases.has(alias))
}

function requestedPricingIdentity(expected, points) {
  const firstPriced = points.find((point) => point.has_positive_amount) ?? {}
  return {
    rawOrGraded: cleanText(expected?.raw_or_graded ?? expected?.product_type ?? firstPriced.raw_or_graded).toLowerCase() === "graded"
      ? "graded"
      : "raw",
    providerVariantId: cleanText(expected?.provider_variant_id ?? firstPriced.provider_variant_id),
    referenceVariantId: positiveInteger(expected?.reference_variant_id ?? firstPriced.reference_variant_id),
    condition: cleanText(expected?.condition ?? expected?.condition_code ?? firstPriced.condition_code) || "NM",
    gradingCompany: cleanText(expected?.grading_company ?? firstPriced.grading_company),
    grade: cleanText(expected?.grade ?? firstPriced.grade),
  }
}

function publicationDecision({ expected, selection, conversion, calculation, currentPriceMinorUnits, thresholdBasisPoints }) {
  if (selection.status !== "ok" || conversion.status !== "ok" || !calculation) return "manual_review"
  if (!expected || !cleanText(expected.public_id)) return "reference_catalog_only"
  if (
    expected.manual_price_override_active === true ||
    ["manual", "manager_override"].includes(cleanText(expected.price_mode ?? expected.pricing_mode).toLowerCase())
  ) {
    return "preserve_manual_override"
  }
  return priceChangeRequiresReview(
    currentPriceMinorUnits,
    calculation.candidate_price_minor_units,
    boundedInteger(thresholdBasisPoints, 0, 100000, 1000),
  ) ? "manual_review" : "publish"
}

function resolveFxQuote(options, currency) {
  const key = normalizePriceCurrency(currency)
  return objectValue(options.fxQuotes)?.[key] ?? options.fxQuote
}

function findMatchedVariant(variants, providerVariantId) {
  if (!providerVariantId) return variants.length === 1 ? variants[0] : null
  return variants.find((variant) => cleanText(
    variant.provider_variant_id ?? variant.providerVariantId ?? variant.variant_id ?? variant.variantId ?? variant.id,
  ) === providerVariantId) ?? null
}

function sourceVariantIdentity(variant, selection) {
  return [
    cleanText(selection?.provider_variant_id),
    cleanText(variant?.language),
    cleanText(variant?.finish ?? variant?.printing ?? variant?.name),
    cleanText(variant?.treatment ?? variant?.border ?? variant?.frame),
  ].join("|")
}

function normalizeComparable(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function validObjects(value) {
  return (Array.isArray(value) ? value : []).filter(objectValue)
}

function uniqueValues(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(cleanText).filter(Boolean))]
}

function nonNegativeInteger(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
}

function errorRow({
  rowType,
  game,
  expansionId = "",
  setName = "",
  setCode = "",
  sampleScope = "provider_catalog_fallback",
  validationStatus = "fail",
  validationCode,
}) {
  return {
    row_type: rowType,
    sample_scope: sampleScope,
    game,
    expansion_id: expansionId,
    set_name: setName,
    set_code: setCode,
    pricing_selection_status: "not_applicable",
    final_publication_decision: "manual_review",
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
    if (argument === "--sanitized-fixture") {
      parsed.sanitizedFixture = true
      continue
    }
    if (!["--games", "--output", "--base-url", "--requests-per-second", "--max-expansion-pages", "--database", "--fixture"].includes(argument)) {
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
    if (argument === "--database") parsed.databasePath = value
    if (argument === "--fixture") parsed.fixturePath = value
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
    "  --database <path>              Read represented sets and mappings from local SQLite.",
    "  --sanitized-fixture            Generate a deterministic non-live report from sanitized fixtures.",
    "  --fixture <path>               Override the sanitized fixture JSON path.",
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

    if (cli.sanitizedFixture) {
      const summary = await runSanitizedFixtureValidation(cli)
      console.log(JSON.stringify(summary, null, 2))
      if (summary.status !== "ok") process.exitCode = 1
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
      databasePath: cli.databasePath || firstEnv("LOCAL_SYNC_SQLITE_PATH", "PUG_LOCAL_SYNC_DB"),
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
