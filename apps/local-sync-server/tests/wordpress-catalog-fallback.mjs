import assert from "node:assert/strict"

import {
  cardsFromWordPressCatalogResponse,
  createWordPressCatalogFallback,
  normalizeWordPressCatalogBaseUrl,
} from "../src/wordpressCatalogFallback.mjs"

assert.equal(
  normalizeWordPressCatalogBaseUrl("https://example.test/"),
  "https://example.test/wp-json/tcg-store/v1",
)
assert.equal(
  normalizeWordPressCatalogBaseUrl("https://example.test/wp-json/tcg-store/v1"),
  "https://example.test/wp-json/tcg-store/v1",
)
assert.equal(normalizeWordPressCatalogBaseUrl("not a url"), "")

let capturedUrl = ""
const fallback = createWordPressCatalogFallback({
  websiteUrl: "https://example.test/",
  fetcher: async (url, init) => {
    capturedUrl = url.toString()
    assert.equal(init.headers.accept, "application/json")

    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          cards: [
            {
              provider_card_id: "scrydex-pokemon-evs-215",
              card_name: "Umbreon VMAX",
              image_url: "https://images.pokemontcg.io/swsh7/215_hires.png",
              market_price_minor_units: 112045,
            },
          ],
          meta: {
            live_provider_request: false,
          },
        },
      }),
    }
  },
})

assert.equal(typeof fallback, "function")

const result = await fallback({ query: "moonbreon", game: "pokemon", limit: 8 })

assert.equal(result.status, "ok")
assert.equal(result.cards.length, 1)
assert.equal(result.cards[0].provider_card_id, "scrydex-pokemon-evs-215")
assert.equal(result.live_provider_request_performed, false)
assert.equal(result.credentials_synced_to_client, false)
assert.ok(capturedUrl.startsWith("https://example.test/wp-json/tcg-store/v1/reference/search?"))
assert.ok(capturedUrl.includes("q=moonbreon"))
assert.ok(capturedUrl.includes("game=pokemon"))
assert.ok(capturedUrl.includes("limit=8"))

const unavailableFallback = createWordPressCatalogFallback({
  websiteUrl: "https://example.test/",
  fetcher: async () => ({
    ok: false,
    status: 503,
    json: async () => ({}),
  }),
})
const unavailable = await unavailableFallback({ query: "missing" })

assert.equal(unavailable.status, "blocked")
assert.equal(unavailable.cards.length, 0)
assert.equal(unavailable.http_status, 503)
assert.equal(unavailable.live_provider_request_performed, false)

assert.equal(cardsFromWordPressCatalogResponse({ data: { cards: [{ id: "one" }] } }).length, 1)
assert.equal(cardsFromWordPressCatalogResponse({ items: [{ id: "two" }] }).length, 1)
assert.equal(cardsFromWordPressCatalogResponse({ data: { cards: "bad" } }).length, 0)

console.log("PASS WordPress catalog fallback")
