import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  createRateLimitAwareFetcher,
  DEFAULT_CARDS_PER_SET,
  DEFAULT_VALIDATION_OUTPUT_PATH,
  runScryDexValidation,
  VALIDATION_CSV_COLUMNS,
} from "../tools/scrydex-validation.mjs"

const fixture = JSON.parse(await readFile(new URL("./fixtures/scrydex-validation-pages.json", import.meta.url), "utf8"))
const temporaryDirectory = await mkdtemp(join(tmpdir(), "pug-scrydex-validation-"))

try {
  await testDeterministicStreamingValidation()
  await testTwoPageTwoHundredCardCap()
  await testRetryAfterRateLimitHandling()
  await testRemainingAndResetRateLimitHandling()
  console.log("PASS read-only deterministic ScryDex validation harness")
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
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
