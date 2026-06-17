import assert from "node:assert/strict"

import {
  createGradedPricingLookup,
  createPriceChartingProvider,
  priceChartingCardGradePriceKey,
} from "../src/gradedPricingProviders.mjs"

assert.deepEqual(priceChartingCardGradePriceKey("PSA", "10"), {
  key: "manual-only-price",
  label: "PSA/Grade 10",
  confidence: 96,
})
assert.deepEqual(priceChartingCardGradePriceKey("Beckett/BGS", "10"), {
  key: "bgs-10-price",
  label: "BGS 10",
  confidence: 96,
})
assert.deepEqual(priceChartingCardGradePriceKey("CGC", "10"), {
  key: "condition-17-price",
  label: "CGC 10",
  confidence: 96,
})
assert.deepEqual(priceChartingCardGradePriceKey("SGC", "10"), {
  key: "condition-18-price",
  label: "SGC 10",
  confidence: 96,
})
assert.deepEqual(priceChartingCardGradePriceKey("PSA", "9.5"), {
  key: "box-only-price",
  label: "Grade 9.5",
  confidence: 92,
})
assert.deepEqual(priceChartingCardGradePriceKey("PSA", "9"), {
  key: "graded-price",
  label: "Grade 9",
  confidence: 92,
})
assert.deepEqual(priceChartingCardGradePriceKey("PSA", "8"), {
  key: "new-price",
  label: "Grade 8/8.5",
  confidence: 92,
})
assert.deepEqual(priceChartingCardGradePriceKey("PSA", "7"), {
  key: "cib-price",
  label: "Grade 7/7.5",
  confidence: 92,
})
assert.equal(priceChartingCardGradePriceKey("PSA", "6"), null)

let requestCount = 0
let requestedUrl = ""
const provider = createPriceChartingProvider({
  token: "pc-test-token",
  minRequestIntervalMs: 0,
  fetcher: async (url, options) => {
    requestCount += 1
    requestedUrl = url.toString()
    assert.equal(options.method, "GET")
    assert.equal(options.headers.accept, "application/json")

    return {
      ok: true,
      json: async () => ({
        status: "success",
        id: "pokemon-base-charizard-4",
        "product-name": "Pokemon Base Charizard #4",
        "manual-only-price": 420000,
      }),
    }
  },
})

const providerResult = await provider.lookup({
  card_name: "Charizard",
  set_name: "Base",
  card_number: "4/102",
  game: "pokemon",
  grading_company: "PSA",
  grade: "10",
})

assert.equal(requestCount, 1)
assert.ok(requestedUrl.startsWith("https://www.pricecharting.com/api/product?"))
assert.ok(requestedUrl.includes("t=pc-test-token"))
assert.ok(requestedUrl.includes("q=Charizard"))
assert.equal(providerResult.provider_request_performed, true)
assert.equal(providerResult.valuation.market_price_minor_units, 420000)
assert.equal(providerResult.valuation.source_label, "PriceCharting graded market")
assert.equal(providerResult.valuation.credentials_synced_to_client, false)
assert.equal(providerResult.provider.credentials_synced_to_client, false)
assert.equal(JSON.stringify(providerResult).includes("pc-test-token"), false)

let noTokenRequestCount = 0
const noTokenProvider = createPriceChartingProvider({
  token: "",
  fetcher: async () => {
    noTokenRequestCount += 1
    throw new Error("No request should be made without a token")
  },
})

const noTokenResult = await noTokenProvider.lookup({
  card_name: "Charizard",
  grading_company: "PSA",
  grade: "10",
})

assert.equal(noTokenProvider.configured, false)
assert.equal(noTokenRequestCount, 0)
assert.equal(noTokenResult.provider_request_performed, false)
assert.equal(noTokenResult.provider.status, "not_configured")
assert.equal(JSON.stringify(noTokenResult).includes("PUG_PRICECHARTING_API_TOKEN"), false)
assert.equal(JSON.stringify(noTokenResult).includes("PRICECHARTING_API_TOKEN"), false)

const aggregateLookup = createGradedPricingLookup({ priceChartingToken: "" })
const aggregateResult = await aggregateLookup({
  card_name: "Charizard",
  grading_company: "PSA",
  grade: "10",
})

assert.equal(aggregateLookup.configured, false)
assert.equal(aggregateResult.provider_request_performed, false)
assert.equal(aggregateResult.providers[0].provider, "pricecharting")
assert.equal(aggregateResult.providers[0].credentials_synced_to_client, false)
assert.equal(JSON.stringify(aggregateResult).includes("PUG_PRICECHARTING_API_TOKEN"), false)
assert.equal(JSON.stringify(aggregateResult).includes("PRICECHARTING_API_TOKEN"), false)

console.log("PASS graded pricing providers")
