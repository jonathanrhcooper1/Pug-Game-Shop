#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"

const DEFAULT_SERVER_URL = "http://127.0.0.1:8787"
const DEFAULT_OUTPUT_DIR = path.join("dist", "imports")
const DEFAULT_LOCATION = "Square CSV Import"
const VARIABLE_PRICE_PLACEHOLDER_MINOR_UNITS = 100

loadLocalEnv(path.join(process.cwd(), ".env.local-sync"))
loadLocalEnv(path.join(process.cwd(), ".env.local"))

const args = parseArgs(process.argv.slice(2))
const inputPath = args.input || args.i
const execute = Boolean(args.execute)
const serverUrl = String(args.server || args.serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, "")
const pin = String(args.pin || process.env.PUG_LOCAL_SYNC_PIN || "")
const hydrateScryDex = args["no-hydrate-scrydex"] !== "true" && args["no-hydrate-scrydex"] !== true
const requirePublishLocation =
  execute && args["allow-missing-wordpress-location"] !== "true" && args["allow-missing-wordpress-location"] !== true
const outputPath =
  args.output ||
  path.join(DEFAULT_OUTPUT_DIR, `square-local-inventory-import-${timestampForFileName()}-summary.json`)
const startLine = parsePositiveInteger(args.startLine || args["start-line"])
const endLine = parsePositiveInteger(args.endLine || args["end-line"])

if (!inputPath) {
  console.error(
    "Usage: node scripts/import-square-catalog-local-inventory.mjs --input <square-catalog.csv> --pin <local-pin> [--execute]",
  )
  process.exit(1)
}

if (execute && !pin) {
  console.error("A local sync PIN is required when --execute is used.")
  process.exit(1)
}

if (requirePublishLocation && !String(process.env.PUG_WORDPRESS_DEFAULT_LOCATION_ID || "").trim()) {
  console.error(
    "PUG_WORDPRESS_DEFAULT_LOCATION_ID is required for live CSV imports so WordPress receives available inventory and creates WooCommerce products. Set the location ID or pass --allow-missing-wordpress-location=true to import as pending/local-only.",
  )
  process.exit(1)
}

const rawCsv = await readFile(inputPath, "utf8")
const rows = parseCsv(rawCsv)

if (rows.length === 0) {
  throw new Error("The Square catalog CSV did not contain any rows.")
}

const [headers, ...records] = rows
const sourceRows = records
  .map((fields, index) => rowObject(headers, fields, index + 2))
  .filter((record) => Object.values(record).some((value) => String(value).trim() !== ""))

const plannedSourceRows = sourceRows.filter((record) => {
  const line = Number(record.__line)
  return (!startLine || line >= startLine) && (!endLine || line <= endLine)
})
const planRows = plannedSourceRows.map(planImportRow).filter((row) => row.include)
const skippedRows = plannedSourceRows.map(planImportRow).filter((row) => !row.include)
const summary = emptySummary({ inputPath, outputPath, serverUrl, execute })

summary.total_csv_rows = sourceRows.length
summary.filtered_csv_rows = plannedSourceRows.length
summary.start_line = startLine
summary.end_line = endLine
summary.planned_rows = planRows.length
summary.planned_quantity_from_ah = sum(planRows.map((row) => row.quantity))
summary.skipped_rows = skippedRows.length
summary.skipped_reasons = countBy(skippedRows, (row) => row.skipReason)
summary.planned_categories = countBy(planRows, (row) => row.importGroup)
summary.planned_games = countBy(planRows, (row) => row.payload.game)
summary.planned_samples = planRows.slice(0, 10).map((row) => ({
  line: row.line,
  item_name: row.sourceItemName,
  card_name: row.payload.card_name,
  set_name: row.payload.set_name,
  set_code: row.payload.set_code,
  game: row.payload.game,
  quantity: row.quantity,
}))
summary.variable_price_rows = planRows.filter((row) => row.variablePrice).length
summary.graded_rows = planRows.filter((row) => row.payload.raw_or_graded === "graded").length
summary.quantity_source_column = "AH: Current Quantity The PUG"

let sessionToken = ""
const scryDexHydrationCache = new Map()

if (execute) {
  sessionToken = await createSession()
}

for (const [index, row] of planRows.entries()) {
  if (!execute) {
    continue
  }

  const payload = hydrateScryDex
    ? await hydratedInventoryPayload(row.payload, sessionToken, scryDexHydrationCache, summary)
    : row.payload

  let result = await postJson(`${serverUrl}/inventory/intake`, payload, sessionToken)

  if (isSessionError(result)) {
    sessionToken = await createSession()
    result = await postJson(`${serverUrl}/inventory/intake`, payload, sessionToken)
  }
  const acceptedCount = Number(result.wordpress_accepted_count ?? 0)
  const retryCount = Number(result.wordpress_retry_count ?? 0)
  const quantityAdded = Number(result.quantity_added ?? 0)
  const syncStatuses = wordpressSyncStatuses(result)

  if (result.status === "ok") {
    summary.imported_rows += 1
    summary.imported_quantity += quantityAdded
    summary.wordpress_accepted_count += acceptedCount
    summary.wordpress_retry_count += retryCount
    for (const status of syncStatuses.statuses) {
      summary.woocommerce_product_sync_statuses[status] =
        (summary.woocommerce_product_sync_statuses[status] ?? 0) + 1
    }
    for (const error of syncStatuses.errors) {
      summary.woocommerce_product_sync_errors[error] =
        (summary.woocommerce_product_sync_errors[error] ?? 0) + 1
    }
    summary.imported_categories[row.importGroup] = (summary.imported_categories[row.importGroup] ?? 0) + 1
    summary.imported_games[row.payload.game] = (summary.imported_games[row.payload.game] ?? 0) + quantityAdded
  } else {
    summary.failed_rows += 1
    summary.failures.push({
      line: row.line,
      item_name: row.sourceItemName,
      sku: row.sourceSku,
      quantity: row.quantity,
      code: result.code ?? "unknown",
      message: result.message ?? "Import failed.",
    })
  }

  if ((index + 1) % 25 === 0 || index === planRows.length - 1) {
    console.log(
      JSON.stringify({
        status: "progress",
        processed_rows: index + 1,
        planned_rows: planRows.length,
        imported_quantity: summary.imported_quantity,
        failed_rows: summary.failed_rows,
        local_queue_depth: result.local_queue_depth ?? "",
      }),
    )
  }
}

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8")

console.log(JSON.stringify(summary, null, 2))

function planImportRow(record) {
  const categories = cleanString(record.Categories)
  const reportingCategory = cleanString(record["Reporting Category"])
  const sourceItemName = cleanString(record["Item Name"] || record["Customer-facing Name"])
  const sourceVariationName = cleanString(record["Variation Name"])
  const sourceSku = cleanString(record.SKU)
  const normalizedCategoryText = normalizeText(`${categories} ${reportingCategory}`)
  const normalizedItemText = normalizeText(sourceItemName)
  const quantity = parseInteger(record["Current Quantity The PUG"])
  const line = Number(record.__line)

  if (quantity <= 0) {
    return skipped(record, "zero_or_missing_ah_quantity")
  }

  const isMtgSingles = normalizedCategoryText.includes("mtg singles")
  const isPokemon = /\bpokemon\b/.test(normalizedCategoryText) && categoryLooksLikeSingles(normalizedCategoryText)
  const isOnePiece = /\bone piece\b/.test(normalizedCategoryText)

  if (!isMtgSingles && !isPokemon && !isOnePiece) {
    return skipped(record, "category_not_requested")
  }

  if (isOnePiece && normalizedCategoryText.includes("supplies")) {
    return skipped(record, "one_piece_supply_excluded")
  }

  if (isOnePiece && /\bevent\b/.test(normalizedItemText)) {
    return skipped(record, "one_piece_event_excluded")
  }

  if (isSealedOrNonSingleRow({ normalizedCategoryText, normalizedItemText })) {
    return skipped(record, "sealed_or_non_single_excluded")
  }

  const game = isMtgSingles ? "magicthegathering" : isOnePiece ? "onepiece" : "pokemon"
  const importGroup = isMtgSingles ? "MTG Singles" : isOnePiece ? "One Piece" : "Pokemon"
  const price = parseMoney(record.Price)
  const variablePrice = price === null
  const priceMinorUnits = variablePrice
    ? VARIABLE_PRICE_PLACEHOLDER_MINOR_UNITS
    : Math.max(VARIABLE_PRICE_PLACEHOLDER_MINOR_UNITS, Math.round(price * 100))
  const parsedName = parseCardName(sourceItemName, game)
  const grading = parseGrading(sourceVariationName)
  const rawOrGraded = grading.company ? "graded" : "raw"
  const condition = rawOrGraded === "graded" ? "GRADED" : conditionFromVariation(sourceVariationName)
  const visibility = variablePrice ? "hidden" : visibilityFromSquare(record["Square Online Item Visibility"])
  const barcode = localBarcode(sourceSku || record.Token || `CSV-${line}`, line)

  return {
    include: true,
    line,
    importGroup,
    sourceItemName,
    sourceVariationName,
    sourceSku,
    quantity,
    variablePrice,
    payload: {
      card_name: parsedName.cardName || sourceItemName,
      set_name: parsedName.setName,
      set_code: parsedName.setCode,
      card_number: parsedName.cardNumber,
      printed_number: parsedName.cardNumber,
      game,
      variant: parsedName.variantLabel,
      finish: finishFromVariation(sourceVariationName),
      language: "EN",
      raw_or_graded: rawOrGraded,
      grading_company: grading.company,
      grade: grading.grade,
      condition,
      barcode,
      quantity,
      price_minor_units: priceMinorUnits,
      sale_price_minor_units: priceMinorUnits,
      minimum_sale_price_minor_units: priceMinorUnits,
      market_price_minor_units: variablePrice ? 0 : priceMinorUnits,
      suggested_price_minor_units: variablePrice ? 0 : priceMinorUnits,
      auto_price_minor_units: priceMinorUnits,
      price_source: variablePrice ? "scrydex_required_square_variable_price" : "square_catalog_csv_price",
      price_observed_at_utc: new Date().toISOString(),
      price_override_reason: variablePrice ? "Square CSV variable price; hidden until ScryDex reprices" : "",
      location: DEFAULT_LOCATION,
      online_visibility: visibility,
      kiosk_visibility: visibility === "visible" ? "visible" : "hidden",
      pos_visibility: "visible",
      square_catalog_item_id: cleanString(record.Token),
      square_catalog_variation_id: sourceSku,
      image_url: "",
      back_image_url: "",
    },
  }
}

function skipped(record, skipReason) {
  return {
    include: false,
    line: Number(record.__line),
    skipReason,
    sourceItemName: cleanString(record["Item Name"] || record["Customer-facing Name"]),
    sourceSku: cleanString(record.SKU),
    quantity: parseInteger(record["Current Quantity The PUG"]),
  }
}

async function postJson(url, body, sessionToken = "") {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  return {
    ...data,
    http_status: response.status,
  }
}

async function createSession() {
  const authResult = await postJson(`${serverUrl}/auth/pin`, { pin })

  if (authResult.status !== "ok" || !authResult.session?.token) {
    throw new Error(`Local sync login failed: ${authResult.message || authResult.code || "unknown error"}`)
  }

  return authResult.session.token
}

async function hydratedInventoryPayload(payload, sessionToken, cache, summary) {
  if (!payload || payload.provider_card_id || payload.image_url) {
    return payload
  }

  const cacheKey = [
    payload.game,
    normalizeText(payload.card_name),
    normalizeText(payload.set_name),
    normalizeText(payload.card_number || payload.printed_number),
  ].join("|")

  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, await fetchScryDexHydration(payload, sessionToken))
  }

  const card = cache.get(cacheKey)

  if (!card) {
    summary.scrydex_hydration_misses += 1
    summary.scrydex_hidden_unmatched_rows += 1
    return hideUnmatchedScryDexPayload(payload, "ScryDex could not match this card/image automatically; hidden pending staff review")
  }

  const variant = bestScryDexVariant(card, payload)
  const priceMinorUnits = bestScryDexPriceMinorUnits(card, payload)
  const nextPayload = {
    ...payload,
    provider_card_id: payload.provider_card_id || cleanString(card.provider_card_id),
    reference_variant_id: payload.reference_variant_id || positiveNumber(variant?.reference_variant_id),
    provider_variant_id: payload.provider_variant_id || cleanString(variant?.provider_variant_id),
    set_name: cleanString(card.set_name) || payload.set_name,
    set_code: cleanString(card.set_code) || payload.set_code,
    card_number: cleanString(card.card_number) || payload.card_number,
    printed_number: cleanString(card.printed_number || card.card_number) || payload.printed_number,
    variant: payload.variant || cleanString(variant?.variant),
    finish: payload.finish || cleanString(variant?.finish),
    language: payload.language || cleanString(variant?.language) || "EN",
    image_url: payload.image_url || cleanHttpUrl(variant?.front_image_url || variant?.image_url || card.image_url),
    back_image_url: payload.back_image_url || cleanHttpUrl(variant?.back_image_url),
  }

  if (payload.price_source === "scrydex_required_square_variable_price" && priceMinorUnits > 0) {
    nextPayload.price_minor_units = priceMinorUnits
    nextPayload.sale_price_minor_units = priceMinorUnits
    nextPayload.minimum_sale_price_minor_units = priceMinorUnits
    nextPayload.market_price_minor_units = priceMinorUnits
    nextPayload.suggested_price_minor_units = priceMinorUnits
    nextPayload.auto_price_minor_units = priceMinorUnits
    nextPayload.price_source = "scrydex_catalog_reference_price"
    nextPayload.price_override_reason = ""
    nextPayload.online_visibility = "visible"
    nextPayload.kiosk_visibility = "visible"
  }

  if (!nextPayload.image_url) {
    summary.scrydex_hidden_unmatched_rows += 1
    return hideUnmatchedScryDexPayload(nextPayload, "ScryDex matched this card but no image was available; hidden pending staff review")
  }

  summary.scrydex_hydrated_rows += 1
  if (nextPayload.image_url) {
    summary.scrydex_image_hydrated_rows += 1
  }

  return nextPayload
}

function hideUnmatchedScryDexPayload(payload, reason) {
  const existingReason = cleanString(payload.price_override_reason)
  return {
    ...payload,
    online_visibility: "hidden",
    kiosk_visibility: "hidden",
    price_override_reason: [existingReason, reason].filter(Boolean).join("; "),
  }
}

async function fetchScryDexHydration(payload, sessionToken) {
  const params = new URLSearchParams({
    q: payload.card_name,
    game: payload.game || "pokemon",
    limit: "all",
    raw_or_graded: payload.raw_or_graded || "",
  })

  if (payload.set_code || payload.set_name) {
    params.set("set", payload.set_code || payload.set_name)
  }

  let result = await getJson(`${serverUrl}/scrydex/cards/search?${params.toString()}`, sessionToken)

  if (isSessionError(result)) {
    sessionToken = await createSession()
    result = await getJson(`${serverUrl}/scrydex/cards/search?${params.toString()}`, sessionToken)
  }

  const cards = Array.isArray(result.cards) ? result.cards : []
  const bestMatch = bestScryDexHydrationMatch(cards, payload)
  if (bestMatch || (!payload.set_code && !payload.set_name)) {
    return bestMatch
  }

  params.delete("set")
  result = await getJson(`${serverUrl}/scrydex/cards/search?${params.toString()}`, sessionToken)

  if (isSessionError(result)) {
    sessionToken = await createSession()
    result = await getJson(`${serverUrl}/scrydex/cards/search?${params.toString()}`, sessionToken)
  }

  return bestScryDexHydrationMatch(Array.isArray(result.cards) ? result.cards : [], payload)
}

function bestScryDexHydrationMatch(cards, payload) {
  return cards
    .map((card) => ({ card, score: scryDexHydrationScore(card, payload) }))
    .filter((entry) => entry.score >= 800)
    .sort((left, right) => right.score - left.score)[0]?.card ?? null
}

async function getJson(url, sessionToken = "") {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  return {
    ...data,
    http_status: response.status,
  }
}

function scryDexHydrationScore(card, payload) {
  const needle = normalizeText(payload.card_name)
  const cardName = normalizeText(card.card_name || card.name)
  const setNeedle = normalizeText(payload.set_code || payload.set_name)
  const setText = normalizeText([card.set_code, card.set_name].join(" "))
  const numberNeedle = normalizeText(payload.card_number || payload.printed_number)
  const numberText = normalizeText([card.card_number, card.printed_number].join(" "))
  let score = 0

  if (!needle || !cardName) return 0
  if (cardName === needle) score += 1000
  else if (cardName.startsWith(needle) || needle.startsWith(cardName)) score += 900
  else if (cardName.includes(needle) || needle.includes(cardName)) score += 800

  if (score === 0) return 0
  if (setNeedle && !genericSetName(setNeedle) && setText.includes(setNeedle)) score += 250
  if (numberNeedle && numberText.includes(numberNeedle)) score += 300
  if (cleanHttpUrl(card.image_url)) score += 50
  if (bestScryDexPriceMinorUnits(card, payload) > 0) score += 25

  return score
}

function bestScryDexVariant(card, payload) {
  const variants = Array.isArray(card.variants) ? card.variants : []
  const finish = normalizeText(payload.finish || payload.variant)
  return (finish
    ? variants.find((variant) => normalizeText([variant.variant, variant.finish, variant.parallel_name].join(" ")).includes(finish))
    : null) ||
    variants.find((variant) => cleanHttpUrl(variant.front_image_url || variant.image_url)) ||
    variants[0] ||
    null
}

function bestScryDexPriceMinorUnits(card, payload) {
  const points = Array.isArray(card.price_points) ? card.price_points : []
  const condition = cleanString(payload.condition || payload.condition_code).toUpperCase()
  const rawOrGraded = cleanString(payload.raw_or_graded || "raw").toLowerCase()
  const matched = points.find((point) =>
    cleanString(point.raw_or_graded || "raw").toLowerCase() === rawOrGraded &&
    (!condition || cleanString(point.condition_code || point.condition).toUpperCase() === condition),
  ) || points.find((point) => cleanString(point.raw_or_graded || "raw").toLowerCase() === rawOrGraded) || points[0]

  return positiveNumber(
    matched?.market_price_minor_units ||
      matched?.mid_price_minor_units ||
      matched?.low_price_minor_units ||
      card.market_price_minor_units,
  )
}

function genericSetName(value) {
  const text = normalizeText(value)
  return !text ||
    text.includes("singles") ||
    text.includes("square category") ||
    text.includes("manual intake") ||
    text === "pokemon" ||
    text === "magic the gathering" ||
    text === "one piece" ||
    text === "mtg"
}

function cleanHttpUrl(value) {
  const raw = cleanString(value)
  if (!raw) return ""
  try {
    const parsed = new URL(raw)
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : ""
  } catch {
    return ""
  }
}

function positiveNumber(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function isSessionError(result) {
  return ["session_expired", "session_required"].includes(String(result?.code ?? ""))
}

function parseCardName(sourceItemName, game) {
  if (game === "onepiece") {
    const onePieceSetMatch = sourceItemName.match(/\((OP[^)]*|EB-[^)]+|PRB-[^)]+|ST-[^)]+)\)\s*$/i)
    const setCode = onePieceSetMatch ? cleanString(onePieceSetMatch[1]).toUpperCase() : ""
    const cardNumberMatch = sourceItemName.match(/\b((?:OP|ST|EB|PRB|P)-?\d{1,3}\/?\d*)\b/i)
    return {
      cardName: cleanCardNameForLookup(sourceItemName.replace(/\s*-\s*\([^)]*\)\s*$/g, "").replace(/\s*\([^)]*\)\s*$/g, "")),
      setName: setCode,
      setCode,
      cardNumber: cardNumberMatch ? cleanString(cardNumberMatch[1]).toUpperCase() : "",
      variantLabel: "",
    }
  }

  const groups = [...sourceItemName.matchAll(/\(([^()]+)\)/g)].map((match) => cleanString(match[1]))
  const baseName = cleanCardNameForLookup(sourceItemName.replace(/\s*\([^()]+\)\s*/g, " "))
  const likelyCardNumber = [...groups].reverse().find((group) => /\d+\s*\/\s*\d+/.test(group)) || ""
  const likelySetCode = [...groups].reverse().find((group) => /^[A-Z0-9]{2,10}$/.test(group)) || ""
  const likelySetName = groups.find(
    (group) => group !== likelyCardNumber && group !== likelySetCode && !isDisplayVariantLabel(group),
  ) || ""
  const variantLabel = groups.find((group) => isDisplayVariantLabel(group)) || ""

  return {
    cardName: baseName || sourceItemName,
    setName: likelySetName,
    setCode: likelySetCode,
    cardNumber: likelyCardNumber,
    variantLabel,
  }
}

function isDisplayVariantLabel(value) {
  const text = normalizeText(value)
  return [
    "borderless",
    "extended art",
    "showcase",
    "retro frame",
    "alternate art",
    "alt art",
    "surge foil",
    "foil etched",
    "etched foil",
    "full art",
    "promo",
    "prerelease",
    "serialized",
    "textured foil",
  ].some((label) => text === label || text.includes(label))
}

function cleanCardNameForLookup(value) {
  return cleanString(value)
    .replace(/\s+/g, " ")
    .replace(/\s+-\s*$/g, "")
    .replace(/\s+\u2013\s*$/g, "")
    .replace(/\s+\u2014\s*$/g, "")
    .replace(/\s+\|\s*$/g, "")
    .replace(/\s*-\s*(near mint|light play|lightly played|moderate play|moderately played|heavy play|heavily played|damaged|nm|lp|mp|hp|dmg)\s*$/gi, "")
    .replace(/\s*-\s*(foil|holofoil|reverse holofoil|regular)\s*$/gi, "")
    .trim()
}

function parseGrading(variationName) {
  const text = cleanString(variationName)
  const match = text.match(/\b(PSA|CGC|BGS|BECKETT|SGC|TAG|SLAB)\s*(?:PRISTINE|PRIST\.|GEM MINT|MINT)?\s*(\d+(?:\.\d+)?)\b/i)

  if (!match) {
    return { company: "", grade: "" }
  }

  const company = match[1].toUpperCase() === "BECKETT" ? "BGS" : match[1].toUpperCase()
  return {
    company,
    grade: match[2],
  }
}

function conditionFromVariation(variationName) {
  const text = normalizeText(variationName)

  if (/\bnear mint\b|\bneat mint\b|\bnm\b/.test(text)) return "NM"
  if (/\blight play\b|\blightly played\b|\blp\b/.test(text)) return "LP"
  if (/\bmoderate play\b|\bmod play\b|\bmoderately played\b|\bmp\b/.test(text)) return "MP"
  if (/\bheavy play\b|\bheavily played\b|\bhp\b/.test(text)) return "HP"
  if (/\bdamaged\b|\bdmg\b/.test(text)) return "DMG"
  if (/\bregular\b/.test(text) || !text) return "RAW"

  return cleanString(variationName).toUpperCase().slice(0, 16) || "RAW"
}

function finishFromVariation(variationName) {
  return normalizeText(variationName).includes("foil") ? "foil" : "normal"
}

function visibilityFromSquare(value) {
  const text = normalizeText(value)
  return text === "visible" ? "visible" : "hidden"
}

function isSealedOrNonSingleRow({ normalizedCategoryText, normalizedItemText }) {
  if (/\b(sealed|supplies|accessories|events?)\b/.test(normalizedCategoryText)) {
    return true
  }

  return [
    /\bbooster\s+(pack|box|bundle)\b/,
    /\bbooster\b.*\bpack\b/,
    /\bextra\s+booster\b/,
    /\bdouble\s+pack\s+set\b/,
    /\bsleeved\s+booster\b/,
    /\bstarter\s+deck\b/,
    /\bbattle\s+deck\b/,
    /\belite\s+trainer\s+box\b/,
    /\betb\b/,
    /\btrainer\s+box\b/,
    /\bblister\b/,
    /\btin\b/,
    /\bdeck\s+box\b/,
    /\bsleeves?\b/,
    /\bposter\s+collection\b/,
    /\bultra\s+premium\s+collection\b/,
    /\bsuper-?premium\s+collection\b/,
    /\bpremium\s+figure\s+collection\b/,
    /\bcollectible\s+tin\b/,
  ].some((pattern) => pattern.test(normalizedItemText))
}

function localBarcode(value, line) {
  const cleaned = cleanString(value)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)

  return `${cleaned || "CSV"}-L${line}`
}

function parseArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--execute") {
      parsed.execute = true
      continue
    }
    if (!arg.startsWith("--")) continue
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2)
    const key = rawKey.trim()
    const nextValue = inlineValue ?? argv[index + 1]
    if (inlineValue === undefined) index += 1
    parsed[key] = nextValue
  }
  return parsed
}

function loadLocalEnv(filePath) {
  if (!existsSync(filePath)) {
    return
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue
    }

    const [key, ...valueParts] = trimmed.split("=")
    const cleanKey = key.trim()
    if (!cleanKey || process.env[cleanKey] !== undefined) {
      continue
    }

    process.env[cleanKey] = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "")
  }
}

function parseCsv(input) {
  const rows = []
  let row = []
  let field = ""
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (char !== "\r") {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function rowObject(headers, fields, line) {
  const record = { __line: line }
  headers.forEach((header, index) => {
    record[cleanString(header)] = cleanString(fields[index] ?? "")
  })
  return record
}

function wordpressSyncStatuses(result) {
  const statuses = []
  const errors = []
  const autoSyncResults = Array.isArray(result?.auto_sync_results) ? result.auto_sync_results : []

  for (const autoSyncResult of autoSyncResults) {
    const sync = autoSyncResult?.woocommerce_product_sync || {}
    const status = cleanString(sync.status || autoSyncResult.status || "unknown")
    statuses.push(status || "unknown")

    if (Array.isArray(sync.errors)) {
      for (const error of sync.errors) {
        const cleaned = cleanString(error)
        if (cleaned) {
          errors.push(cleaned)
        }
      }
    }
  }

  return {
    statuses: statuses.length > 0 ? statuses : ["not_reported"],
    errors,
  }
}

function emptySummary({ inputPath, outputPath, serverUrl, execute }) {
  return {
    status: execute ? "executed" : "dry_run",
    input_path: inputPath,
    output_path: outputPath,
    server_url: serverUrl,
    quantity_source_column: "AH: Current Quantity The PUG",
    total_csv_rows: 0,
    filtered_csv_rows: 0,
    start_line: null,
    end_line: null,
    planned_rows: 0,
    planned_quantity_from_ah: 0,
    skipped_rows: 0,
    skipped_reasons: {},
    planned_categories: {},
    planned_games: {},
    planned_samples: [],
    variable_price_rows: 0,
    graded_rows: 0,
    imported_rows: 0,
    imported_quantity: 0,
    imported_categories: {},
    imported_games: {},
    wordpress_accepted_count: 0,
    wordpress_retry_count: 0,
    woocommerce_product_sync_statuses: {},
    woocommerce_product_sync_errors: {},
    scrydex_hydrated_rows: 0,
    scrydex_image_hydrated_rows: 0,
    scrydex_hydration_misses: 0,
    scrydex_hidden_unmatched_rows: 0,
    failed_rows: 0,
    failures: [],
    notes: [
      "Rows with Square variable pricing are imported hidden with a $1 placeholder and price_source=scrydex_required_square_variable_price.",
      "One Piece supplies and event products are skipped so they do not become card inventory.",
      "Local barcodes include the CSV line number to preserve Square SKU while keeping local physical-copy barcodes unique.",
    ],
  }
}

function countBy(rows, keyFn) {
  return rows.reduce((counts, row) => {
    const key = keyFn(row) || "unknown"
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0)
}

function categoryLooksLikeSingles(value) {
  const text = normalizeText(value)

  return (
    text.includes("singles") ||
    text.includes("graded") ||
    text.includes("single cards") ||
    text.includes("individual cards")
  )
}

function parseMoney(value) {
  const cleaned = cleanString(value)
  if (!cleaned || cleaned.toLowerCase() === "variable") return null
  const parsed = Number(cleaned.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function parseInteger(value) {
  const parsed = Number.parseInt(cleanString(value).replace(/[^0-9-]/g, ""), 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function cleanString(value) {
  return String(value ?? "").trim()
}

function normalizeText(value) {
  return cleanString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function timestampForFileName() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}
