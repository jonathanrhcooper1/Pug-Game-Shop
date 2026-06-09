import { loadLocalEnv } from "./lib/local-env.mjs"

loadLocalEnv([".env.production.local", ".env.local", ".env"])

const baseUrl = normalizeBaseUrl(process.env.SCRYDEX_BASE_URL ?? "https://api.scrydex.com")
const apiKey = String(
  process.env.SCRYDEX_API_KEY ?? process.env.SCRYDEX_PRIMARY_API_KEY ?? "",
).trim()
const teamId = String(process.env.SCRYDEX_TEAM_ID ?? "").trim()
const query = String(process.env.SCRYDEX_SMOKE_QUERY ?? "Charizard").trim()
const pageSize = clampInt(process.env.SCRYDEX_SMOKE_PAGE_SIZE, 1, 10, 2)
const dryRun = process.argv.includes("--dry-run")

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "scrydex_smoke_dry_run",
        endpoint: "/pokemon/v1/cards",
        method: "GET",
        query,
        pageSize,
        requiresEnv: ["SCRYDEX_API_KEY", "SCRYDEX_TEAM_ID", "SCRYDEX_SMOKE_CONFIRM"],
        optionalEnv: ["SCRYDEX_BASE_URL", "SCRYDEX_PRIMARY_API_KEY", "SCRYDEX_SMOKE_QUERY"],
        readsIgnoredEnvFiles: [".env.production.local", ".env.local", ".env"],
        readonly: true,
        writesWordPressData: false,
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

const url = new URL("/pokemon/v1/cards", baseUrl)
url.searchParams.set("q", query)
url.searchParams.set("page", "1")
url.searchParams.set("pageSize", String(pageSize))

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

const cards = extractCards(body)
const total = extractTotal(body, cards.length)
const firstCard = summarizeCard(cards[0])

const result = {
  action: "scrydex_smoke_pulled",
  endpoint: "/pokemon/v1/cards",
  method: "GET",
  query,
  pageSize,
  httpStatus: response.status,
  ok: response.ok,
  resultCount: cards.length,
  total,
  firstCard,
  readonly: true,
  writesWordPressData: false,
  credentialsPrinted: false,
  rawResponsePrinted: false,
}

if (!response.ok) {
  result.error = sanitizeValue(
    String(body?.message ?? body?.error ?? body?.code ?? "ScryDex live smoke failed."),
    [apiKey, teamId],
  )
}

console.log(JSON.stringify(result, null, 2))

if (!response.ok) {
  process.exitCode = 1
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

function extractCards(body) {
  if (Array.isArray(body)) {
    return body
  }

  for (const key of ["data", "cards", "results", "items"]) {
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
  }
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
