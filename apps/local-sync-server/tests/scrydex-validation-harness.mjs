import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  createRateLimitAwareFetcher,
  DEFAULT_CARDS_PER_SET,
  DEFAULT_SANITIZED_FIXTURE_PATH,
  DEFAULT_VALIDATION_OUTPUT_PATH,
  runScryDexValidation,
  runSanitizedFixtureValidation,
  VALIDATION_CSV_COLUMNS,
} from "../tools/scrydex-validation.mjs"

const fixture = JSON.parse(await readFile(new URL("./fixtures/scrydex-validation-pages.json", import.meta.url), "utf8"))
const temporaryDirectory = await mkdtemp(join(tmpdir(), "pug-scrydex-validation-"))

try {
  await testDeterministicStreamingValidation()
  await testTwoPageTwoHundredCardCap()
  await testRepresentedLocalCatalogSetScoping()
  await testExpansionAliasAndLanguageNormalization()
  await testSanitizedFixtureReportGeneration()
  await testRetryAfterRateLimitHandling()
  await testRemainingAndResetRateLimitHandling()
  console.log("PASS read-only deterministic ScryDex validation harness")
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}

async function testRepresentedLocalCatalogSetScoping() {
  const cardRequests = []
  const fetcher = async (url) => {
    const endpoint = new URL(String(url))
    const page = Number(endpoint.searchParams.get("page"))
    const pageSize = Number(endpoint.searchParams.get("page_size"))
    if (endpoint.pathname === "/pokemon/v1/expansions") {
      return jsonResponse({ data: pageSlice(fixture.expansions, page, pageSize) })
    }
    cardRequests.push(endpoint.pathname)
    const expansionId = decodeURIComponent(endpoint.pathname.match(/expansions\/([^/]+)\/cards$/)?.[1] ?? "")
    return jsonResponse({ data: pageSlice(fixture.cards_by_expansion[expansionId] ?? [], page, pageSize) })
  }
  const outputPath = join(temporaryDirectory, "represented-set.csv")
  const summary = await runScryDexValidation({
    apiKey: "represented-fixture-key",
    teamId: "represented-fixture-team",
    baseUrl: "https://scrydex.example.test",
    fetcher,
    games: ["pokemon"],
    catalogRows: fixture.local_catalog_rows.filter((row) => row.provider_set_id === "fixture-set-alpha"),
    inventoryRows: fixture.inventory_rows,
    cardsPerSet: 200,
    outputPath,
    requestsPerSecond: 99,
    sleep: async () => {},
  })

  assert.equal(summary.sample_scope, "local_pug_catalog")
  assert.equal(summary.represented_set_count, 1)
  assert.equal(summary.set_count, 1)
  assert.equal(summary.sampled_card_count, 2)
  assert.ok(cardRequests.length > 0)
  assert.ok(cardRequests.every((path) => path.includes("/fixture-set-alpha/cards")))
}

async function testExpansionAliasAndLanguageNormalization() {
  const cardRequests = []
  const providerCard = structuredClone(fixture.cards_by_expansion["fixture-set-alpha"][0])
  providerCard.variants[0].language = "English"
  providerCard.variants[0].finish = "regular"
  const fetcher = async (url) => {
    const endpoint = new URL(String(url))
    const page = Number(endpoint.searchParams.get("page"))
    const pageSize = Number(endpoint.searchParams.get("page_size"))
    if (endpoint.pathname === "/pokemon/v1/expansions") {
      return jsonResponse({ data: pageSlice(fixture.expansions, page, pageSize) })
    }
    cardRequests.push(endpoint.pathname)
    const expansionId = decodeURIComponent(endpoint.pathname.match(/expansions\/([^/]+)\/cards$/)?.[1] ?? "")
    return jsonResponse({ data: pageSlice(expansionId === "fixture-set-alpha" ? [providerCard] : [], page, pageSize) })
  }
  const localRow = {
    ...fixture.local_catalog_rows.find((row) => row.provider_card_id === providerCard.id),
    provider_set_id: "",
    set_code: "FXA",
    language: "EN",
    finish: "normal",
  }
  const summary = await runScryDexValidation({
    apiKey: "alias-fixture-key",
    teamId: "alias-fixture-team",
    baseUrl: "https://scrydex.example.test",
    fetcher,
    games: ["pokemon"],
    catalogRows: [localRow],
    inventoryRows: [],
    cardsPerSet: 200,
    outputPath: join(temporaryDirectory, "expansion-alias.csv"),
    requestsPerSecond: 99,
    sleep: async () => {},
  })

  assert.equal(summary.status, "ok")
  assert.equal(summary.represented_set_unresolved_count, 0)
  assert.equal(summary.set_count, 1)
  assert.equal(summary.failed_card_count, 0)
  assert.ok(cardRequests.every((path) => path.includes("/fixture-set-alpha/cards")))
}

async function testSanitizedFixtureReportGeneration() {
  const outputPath = join(temporaryDirectory, "sanitized-report.csv")
  const summary = await runSanitizedFixtureValidation({ outputPath })
  const csv = await readFile(outputPath, "utf8")
  const requiredColumns = [
    "expected_identity",
    "matched_identity",
    "match_method",
    "source_record_id",
    "requested_condition",
    "selected_condition",
    "requested_grading_company",
    "selected_grading_company",
    "requested_grade",
    "selected_grade",
    "fallback_reason",
    "source_currency",
    "source_value_minor_units",
    "fx_value_minor_units",
    "rounded_sale_minor_units",
    "floor_minor_units",
    "percent_change_basis_points",
    "final_publication_decision",
    "wordpress_public_ids",
    "square_variation_ids",
  ]

  assert.equal(DEFAULT_SANITIZED_FIXTURE_PATH.endsWith("scrydex-validation-pages.json"), true)
  assert.equal(summary.status, "ok")
  assert.equal(summary.sanitized_fixture, true)
  assert.equal(summary.catalog_snapshot_status, "provided")
  assert.equal(summary.represented_set_count, 2)
  assert.equal(summary.sampled_card_count, 3)
  assert.equal(csv.trimEnd().split("\n").length, 4)
  assert.ok(requiredColumns.every((column) => VALIDATION_CSV_COLUMNS.includes(column)))
  assert.ok(csv.includes("fixture-wordpress-alpha-001"))
  assert.ok(csv.includes("fixture-square-alpha-001"))
  assert.ok(csv.includes("manual_review"))
  assert.ok(csv.includes("publish"))
  assert.ok(csv.includes("'=SUM(1,1) Formula-safe card"))
  assert.equal(csv.includes("sanitized-fixture-key"), false)
  assert.equal(csv.includes("sanitized-fixture-team"), false)
}

async function testDeterministicStreamingValidation() {
  const requests = []
  const fetcher = async (url, init = {}) => {
    const endpoint = new URL(String(url))
    requests.push({ endpoint, init })
    const page = Number(endpoint.searchParams.get("page"))
    const pageSize = Number(endpoint.searchParams.get("page_size"))

    if (endpoint.pathname === "/pokemon/v1/expansions") {
      return jsonResponse({ data: pageSlice(fixture.expansions, page, pageSize) })
    }

    const match = endpoint.pathname.match(/^\/pokemon\/v1\/expansions\/([^/]+)\/cards$/)
    assert.ok(match, `Unexpected fixture URL: ${endpoint}`)
    const expansionId = decodeURIComponent(match[1])
    const cards = fixture.cards_by_expansion[expansionId] ?? []
    return jsonResponse({ data: pageSlice(cards, page, pageSize) })
  }
  const firstOutput = join(temporaryDirectory, "first.csv")
  const secondOutput = join(temporaryDirectory, "second.csv")
  const options = {
    apiKey: "fixture-api-key-not-secret",
    teamId: "fixture-team-id",
    baseUrl: "https://scrydex.example.test",
    fetcher,
    games: ["pokemon"],
    cardsPerSet: 2,
    pageSize: 1,
    expansionPageSize: 1,
    maxExpansionPages: 3,
    requestsPerSecond: 99,
    sleep: async () => {},
  }

  const firstSummary = await runScryDexValidation({ ...options, outputPath: firstOutput })
  const firstRequestCount = requests.length
  const secondSummary = await runScryDexValidation({ ...options, outputPath: secondOutput })
  const firstCsv = await readFile(firstOutput, "utf8")
  const secondCsv = await readFile(secondOutput, "utf8")

  assert.equal(DEFAULT_CARDS_PER_SET, 200)
  assert.equal(DEFAULT_VALIDATION_OUTPUT_PATH.endsWith("PUG_SCRYDEX_VALIDATION.csv"), true)
  assert.equal(firstSummary.status, "ok")
  assert.equal(firstSummary.set_count, 2)
  assert.equal(firstSummary.sampled_card_count, 3)
  assert.equal(firstSummary.passed_card_count, 2)
  assert.equal(firstSummary.warning_card_count, 1)
  assert.equal(firstSummary.failed_card_count, 0)
  assert.equal(firstSummary.database_writes, false)
  assert.equal(secondSummary.sampled_card_count, firstSummary.sampled_card_count)
  assert.equal(firstCsv, secondCsv)
  assert.equal(firstCsv.trimEnd().split("\n").length, 4)
  assert.ok(firstCsv.startsWith(VALIDATION_CSV_COLUMNS.map((column) => `"${column}"`).join(",")))
  assert.ok(firstCsv.indexOf("fixture-set-alpha") < firstCsv.indexOf("fixture-set-zeta"))
  assert.ok(firstCsv.indexOf("fixture-alpha-001") < firstCsv.indexOf("fixture-alpha-002"))
  assert.ok(firstCsv.includes("' =SUM") === false)
  assert.ok(firstCsv.includes("'=SUM(1,1) Formula-safe card"))
  assert.ok(firstCsv.includes("fixture-api-key-not-secret") === false)
  assert.ok(firstCsv.includes("missing_image|missing_variants|missing_prices"))

  const firstRunRequests = requests.slice(0, firstRequestCount)
  assert.ok(firstRunRequests.every(({ init }) => !init.method || init.method === "GET"))
  assert.ok(firstRunRequests.every(({ init }) => init.headers["X-Api-Key"] === "fixture-api-key-not-secret"))
  assert.ok(firstRunRequests.every(({ init }) => init.headers["X-Team-ID"] === "fixture-team-id"))
  assert.deepEqual(
    firstRunRequests
      .filter(({ endpoint }) => endpoint.pathname.includes("/cards"))
      .map(({ endpoint }) => endpoint.pathname),
    [
      "/pokemon/v1/expansions/fixture-set-alpha/cards",
      "/pokemon/v1/expansions/fixture-set-alpha/cards",
      "/pokemon/v1/expansions/fixture-set-zeta/cards",
      "/pokemon/v1/expansions/fixture-set-zeta/cards",
    ],
  )
}

async function testTwoPageTwoHundredCardCap() {
  const cardRequests = []
  const cards = Array.from({ length: 205 }, (_, index) => ({
    id: `fixture-cap-${String(index + 1).padStart(3, "0")}`,
    game: "pokemon",
    name: `Fixture Cap Card ${index + 1}`,
    number: String(index + 1),
    expansion: {
      id: "fixture-cap-set",
      name: "Fixture Cap Set",
      code: "FXC",
    },
    images: {
      large: `https://images.example.test/fixture-cap-${index + 1}.png`,
    },
    variants: [{
      id: `fixture-cap-${index + 1}-normal`,
      name: "normal",
      prices: [{ condition: "NM", type: "raw", market: "1.00", currency: "USD" }],
    }],
  }))
  const fetcher = async (url) => {
    const endpoint = new URL(String(url))
    const page = Number(endpoint.searchParams.get("page"))
    const pageSize = Number(endpoint.searchParams.get("page_size"))
    if (endpoint.pathname === "/pokemon/v1/expansions") {
      return jsonResponse({ data: page === 1 ? [{ id: "fixture-cap-set" }] : [] })
    }
    cardRequests.push(endpoint)
    return jsonResponse({ data: pageSlice(cards, page, pageSize) })
  }
  const outputPath = join(temporaryDirectory, "two-hundred-cap.csv")
  const summary = await runScryDexValidation({
    apiKey: "fixture-cap-key",
    teamId: "fixture-cap-team",
    baseUrl: "https://scrydex.example.test",
    fetcher,
    games: ["pokemon"],
    cardsPerSet: 999,
    outputPath,
    requestsPerSecond: 99,
    sleep: async () => {},
  })
  const csv = await readFile(outputPath, "utf8")

  assert.equal(summary.cards_per_set, 200)
  assert.equal(summary.provider_page_size, 100)
  assert.equal(summary.sampled_card_count, 200)
  assert.equal(cardRequests.length, 2)
  assert.deepEqual(cardRequests.map((endpoint) => endpoint.searchParams.get("page")), ["1", "2"])
  assert.equal(csv.trimEnd().split("\n").length, 201)
  assert.equal(csv.includes("fixture-cap-201"), false)
}

async function testRetryAfterRateLimitHandling() {
  let currentTime = 0
  let requestCount = 0
  const sleeps = []
  const fetcher = createRateLimitAwareFetcher({
    requestsPerSecond: 99,
    maxRateLimitRetries: 2,
    now: () => currentTime,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds)
      currentTime += milliseconds
    },
    fetcher: async () => {
      requestCount += 1
      return requestCount === 1
        ? jsonResponse({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "2" } })
        : jsonResponse({ data: [] })
    },
  })

  const response = await fetcher("https://scrydex.example.test/pokemon/v1/cards")

  assert.equal(response.status, 200)
  assert.equal(requestCount, 2)
  assert.deepEqual(sleeps, [2000])
}

async function testRemainingAndResetRateLimitHandling() {
  let currentTime = 0
  let requestCount = 0
  const sleeps = []
  const fetcher = createRateLimitAwareFetcher({
    requestsPerSecond: 99,
    now: () => currentTime,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds)
      currentTime += milliseconds
    },
    fetcher: async () => {
      requestCount += 1
      return requestCount === 1
        ? jsonResponse({ data: [] }, {
            headers: {
              "x-ratelimit-remaining": "0",
              "x-ratelimit-reset": "5",
            },
          })
        : jsonResponse({ data: [] })
    },
  })

  await fetcher("https://scrydex.example.test/pokemon/v1/cards?page=1")
  await fetcher("https://scrydex.example.test/pokemon/v1/cards?page=2")

  assert.equal(requestCount, 2)
  assert.deepEqual(sleeps, [5000])
}

function pageSlice(values, page, pageSize) {
  const start = (page - 1) * pageSize
  return values.slice(start, start + pageSize)
}

function jsonResponse(body, options = {}) {
  const headers = new Map(
    Object.entries(options.headers ?? {}).map(([name, value]) => [name.toLowerCase(), String(value)]),
  )
  const status = Number(options.status ?? 200)

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 429 ? "Too Many Requests" : "OK",
    headers: {
      get(name) {
        return headers.get(String(name).toLowerCase()) ?? null
      },
    },
    json: async () => body,
  }
}
