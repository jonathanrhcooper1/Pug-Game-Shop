import assert from "node:assert/strict"

import { createExchangeRateProvider } from "../src/exchangeRateProvider.mjs"

const requests = []
const provider = createExchangeRateProvider({
  baseUrl: "https://fx.example.test",
  provider: "ECB",
  fetcher: async (url, options) => {
    requests.push({ url: String(url), options })
    return {
      ok: true,
      json: async () => ({ date: "2026-07-17", base: "JPY", quote: "USD", rate: 0.00616 }),
    }
  },
})

assert.deepEqual(await provider({ source_currency: "JPY", target_currency: "USD" }), {
  rate: 0.00616,
  provider: "Frankfurter/ECB",
  observed_at_utc: "2026-07-17T23:59:59.999Z",
})
assert.match(requests[0].url, /^https:\/\/fx\.example\.test\/v2\/rate\/JPY\/USD\?providers=ECB$/)
assert.equal(requests[0].options.headers.Accept, "application/json")
assert.equal(provider.status().credentials_required, false)

const rejected = createExchangeRateProvider({
  fetcher: async () => ({
    ok: true,
    json: async () => ({ date: "2026-07-17", base: "USD", quote: "JPY", rate: 162.3 }),
  }),
})
assert.equal(await rejected({ source_currency: "JPY", target_currency: "USD" }), null)

const unavailable = createExchangeRateProvider({
  fetcher: async () => {
    throw new Error("network unavailable")
  },
})
assert.equal(await unavailable({ source_currency: "JPY", target_currency: "USD" }), null)

console.log("PASS configurable exchange-rate provider fails closed and preserves quote provenance")
