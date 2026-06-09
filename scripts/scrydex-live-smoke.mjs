import { loadLocalEnv } from "./lib/local-env.mjs"

loadLocalEnv([".env.production.local", ".env.local", ".env"])

const baseUrl = normalizeBaseUrl(process.env.SCRYDEX_BASE_URL ?? "https://api.scrydex.com")
const apiKey = String(
  process.env.SCRYDEX_API_KEY ?? process.env.SCRYDEX_PRIMARY_API_KEY ?? "",
).trim()
const teamId = String(process.env.SCRYDEX_TEAM_ID ?? "").trim()
const game = gameKey(process.env.SCRYDEX_SMOKE_GAME ?? "pokemon")
const query = String(process.env.SCRYDEX_SMOKE_QUERY ?? "").trim()
const expansionIdFromEnv = String(process.env.SCRYDEX_SMOKE_EXPANSION_ID ?? "").trim()
const pageSize = clampInt(process.env.SCRYDEX_SMOKE_PAGE_SIZE, 1, 100, 3)
const dryRun = process.argv.includes("--dry-run")

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "scrydex_smoke_dry_run",
        endpoints: [`/${game}/v1/expansions`, `/${game}/v1/expansions/{id}/cards`],
        method: "GET",
        game,
        query,
        expansionIdConfigured: Boolean(expansionIdFromEnv),
        pageSize,
        requiresEnv: ["SCRYDEX_API_KEY", "SCRYDEX_TEAM_ID", "SCRYDEX_SMOKE_CONFIRM"],
        optionalEnv: [
          "SCRYDEX_BASE_URL",
          "SCRYDEX_PRIMARY_API_KEY",
          "SCRYDEX_SMOKE_GAME",
          "SCRYDEX_SMOKE_EXPANSION_ID",
          "SCRYDEX_SMOKE_QUERY",
        ],
        readsIgnoredEnvFiles: [".env.production.local", ".env.local", ".env"],
        readonly: true,
        writesWordPressData: false,
        expansionThenCardsPath: true,
        credentialsPrinted: false,
        rawResponsePrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const missingEnv = []

if (!apiKey) {
  missingEnv.push("SCRYDEX_API_KEY or SCRYDEX_PRIMARY_API_KEY")
}

if (!teamId) {
  missingEnv.push("SCRYDEX_TEAM_ID")
}

if (missingEnv.length > 0) {
  throw new Error(`Missing ScryDex live smoke environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.SCRYDEX_SMOKE_CONFIRM !== "pull-live-scrydex") {
  throw new Error("Set SCRYDEX_SMOKE_CONFIRM=pull-live-scrydex to run the live ScryDex smoke.")
}

const expansionsUrl = new URL(`/${game}/v1/expansions`, baseUrl)
expansionsUrl.searchParams.set("page", "1")
expansionsUrl.searchParams.set("page_size", "2")

const expansionsResult = await getJson(expansionsUrl)
const expansions = extractList(expansionsResult.body, ["data", "expansions", "sets", "results", "items"])
const selectedExpansion = expansionIdFromEnv || String(expansions[0]?.id ?? expansions[0]?.provider_set_id ?? "").trim()

let cardsResult = {
  response: { status: 0, ok: false },
  body: {},
}

if (selectedExpansion) {
  const cardsUrl = new URL(`/${game}/v1/expansions/${encodeURIComponent(selectedExpansion)}/cards`, baseUrl)
  if (query) {
    cardsUrl.searchParams.set("q", query)
  }
  cardsUrl.searchParams.set("page", "1")
  cardsUrl.searchParams.set("page_size", String(pageSize))
  cardsUrl.searchParams.set("include", "prices")
  cardsResult = await getJson(cardsUrl)
}

const cards = extractCards(cardsResult.body)
const total = extractTotal(cardsResult.body, cards.length)
const firstCard = summarizeCard(cards[0])

const result = {
  action: "scrydex_smoke_pulled",
  endpoints: {
    expansions: `/${game}/v1/expansions`,
    expansionCards: selectedExpansion ? `/${game}/v1/expansions/{id}/cards` : null,
  },
  method: "GET",
  game,
  query,
  selectedExpansion,
  pageSize,
  expansionsHttpStatus: expansionsResult.response.status,
  expansionsOk: expansionsResult.response.ok,
  expansionCount: expansions.length,
  cardsHttpStatus: cardsResult.response.status,
  cardsOk: cardsResult.response.ok,
  resultCount: cards.length,
  total,
  firstCard,
  readonly: true,
  writesWordPressData: false,
  expansionThenCardsPath: true,
  credentialsPrinted: false,
  rawResponsePrinted: false,
}

if (!expansionsResult.response.ok || !cardsResult.response.ok) {
  result.error = sanitizeValue(
    String(
      cardsResult.body?.message ??
        cardsResult.body?.error ??
        cardsResult.body?.code ??
        expansionsResult.body?.message ??
        expansionsResult.body?.error ??
        expansionsResult.body?.code ??
        "ScryDex live smoke failed.",
    ),
    [apiKey, teamId],
  )
}

console.log(JSON.stringify(result, null, 2))

if (!expansionsResult.response.ok || !cardsResult.response.ok || !selectedExpansion || cards.length === 0) {
  process.exitCode = 1
}

async function getJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
      "X-Team-ID": teamId,
    },
  })

  let body = {}

  try {
    body = await response.json()
  } catch {
    body = {}
  }

  return { response, body }
}

function normalizeBaseUrl(value) {
  const trimmed = String(value).trim()

  if (!trimmed) {
    return "https://api.scrydex.com"
  }

  return trimmed.replace(/\/+$/, "")
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

function gameKey(value) {
  const key = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/(^-|-$)/g, "")

  return key || "pokemon"
}

function extractCards(body) {
  return extractList(body, ["data", "cards", "results", "items"])
}

function extractList(body, keys) {
  if (Array.isArray(body)) {
    return body
  }

  for (const key of keys) {
    if (Array.isArray(body?.[key])) {
      return body[key]
    }
  }

  return []
}

function extractTotal(body, fallback) {
  for (const value of [
    body?.total,
    body?.count,
    body?.pagination?.total,
    body?.pagination?.count,
    body?.meta?.total,
    body?.meta?.count,
  ]) {
    const parsed = Number.parseInt(String(value ?? ""), 10)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function summarizeCard(card) {
  if (!card || typeof card !== "object") {
    return null
  }

  return {
    providerId: sanitizeCardField(card.id ?? card.providerId ?? card.provider_id),
    name: sanitizeCardField(card.name ?? card.cardName ?? card.card_name),
    number: sanitizeCardField(card.number ?? card.cardNumber ?? card.card_number),
    expansion: sanitizeCardField(card.expansion?.name ?? card.set?.name ?? card.expansionName),
    hasFrontImage: Boolean(firstImage(card)),
    variantCount: Array.isArray(card.variants) ? card.variants.length : 0,
    directPriceCount: Array.isArray(card.prices) ? card.prices.length : 0,
    variantPriceCount: variantPriceCount(card),
  }
}

function firstImage(card) {
  const images = card?.images

  if (typeof card?.image_url === "string" || typeof card?.imageUrl === "string") {
    return card.image_url || card.imageUrl
  }

  if (!images || typeof images !== "object") {
    return ""
  }

  if (typeof images.front === "string" || typeof images.large === "string" || typeof images.url === "string") {
    return images.front || images.large || images.url
  }

  if (Array.isArray(images)) {
    const image = images.find((item) => item && typeof item === "object" && (item.url || item.large || item.image_url))
    return image?.url ?? image?.large ?? image?.image_url ?? ""
  }

  return ""
}

function variantPriceCount(card) {
  if (!Array.isArray(card?.variants)) {
    return 0
  }

  return card.variants.reduce((count, variant) => {
    return count + (Array.isArray(variant?.prices) ? variant.prices.length : 0)
  }, 0)
}

function sanitizeCardField(value) {
  const text = String(value ?? "").trim()

  if (!text) {
    return ""
  }

  return text.slice(0, 120)
}

function sanitizeValue(value, sensitiveValues) {
  let sanitized = value

  for (const sensitiveValue of sensitiveValues) {
    if (sensitiveValue) {
      sanitized = sanitized.split(sensitiveValue).join("[redacted]")
    }
  }

  return sanitized.slice(0, 240)
}
