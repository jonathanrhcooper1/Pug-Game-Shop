import assert from "node:assert/strict"

import {
  catalogAuthorizationHeader,
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
  authHeader: "Bearer preview-token",
  fetcher: async (url, init) => {
    capturedUrl = url.toString()
    assert.equal(init.headers.accept, "application/json")
    assert.equal(init.headers.authorization, "Bearer preview-token")

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
assert.equal(result.auth_configured, true)
assert.equal(result.authorization_header_printed, false)
assert.ok(capturedUrl.startsWith("https://example.test/wp-json/tcg-store/v1/reference/search?"))
assert.ok(capturedUrl.includes("q=moonbreon"))
assert.ok(capturedUrl.includes("game=pokemon"))
assert.ok(capturedUrl.includes("limit=8"))
assert.ok(capturedUrl.includes("page=1"))

const pagedUrls = []
const pagedFallback = createWordPressCatalogFallback({
  websiteUrl: "https://example.test/",
  fetcher: async (url) => {
    const parsed = new URL(url)
    const page = Number(parsed.searchParams.get("page") ?? "1")
    pagedUrls.push(url.toString())

    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          cards: page === 1
            ? Array.from({ length: 250 }, (_, index) => ({ provider_card_id: `card-${index}` }))
            : [{ provider_card_id: "card-250" }],
          meta: {
            total: 251,
          },
        },
      }),
    }
  },
})
const pagedResult = await pagedFallback({ query: "charizard", game: "pokemon", limit: "all" })

assert.equal(pagedResult.status, "ok")
assert.equal(pagedResult.cards.length, 251)
assert.equal(pagedResult.requested_limit, "all")
assert.equal(pagedUrls.length, 2)
assert.ok(pagedUrls[0].includes("limit=250"))
assert.ok(pagedUrls[0].includes("page=1"))
assert.ok(pagedUrls[1].includes("page=2"))

const retriedUrls = []
const retryingFallback = createWordPressCatalogFallback({
  websiteUrl: "https://example.test/",
  fetcher: async (url) => {
    retriedUrls.push(url.toString())

    if (retriedUrls.length === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "invalid",
          errors: ["page_size_too_large"],
        }),
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          cards: [
            {
              provider_card_id: "scrydex-pokemon-clc-033",
              card_name: "Basic Fire Energy",
              set_name: "Pokemon TCG Classic - Charizard",
            },
          ],
        },
      }),
    }
  },
})
const retryResult = await retryingFallback({ query: "energy", game: "pokemon", limit: 250 })

assert.equal(retryResult.status, "ok")
assert.equal(retryResult.cards.length, 1)
assert.equal(retryResult.requested_limit, 50)
assert.equal(retryResult.retried_with_legacy_limit, true)
assert.equal(retriedUrls.length, 2)
assert.ok(retriedUrls[0].includes("limit=250"))
assert.ok(retriedUrls[1].includes("limit=50"))

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
assert.equal(unavailable.auth_configured, false)

assert.equal(cardsFromWordPressCatalogResponse({ data: { cards: [{ id: "one" }] } }).length, 1)
assert.equal(cardsFromWordPressCatalogResponse({ items: [{ id: "two" }] }).length, 1)
assert.equal(cardsFromWordPressCatalogResponse({ data: { cards: "bad" } }).length, 0)
assert.equal(catalogAuthorizationHeader({ authHeader: "Digest nope" }), "")
assert.equal(catalogAuthorizationHeader({ username: "staff", applicationPassword: "abcd efgh ijkl mnop" }).startsWith("Basic "), true)

console.log("PASS WordPress catalog fallback")
