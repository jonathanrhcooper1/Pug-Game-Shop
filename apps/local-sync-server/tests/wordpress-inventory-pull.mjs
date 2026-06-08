import assert from "node:assert/strict"

import {
  createWordPressInventoryPull,
  inventoryItemsFromWordPressSearchResponse,
  inventoryMetaFromWordPressSearchResponse,
} from "../src/wordpressInventoryPull.mjs"

let capturedUrl = ""
const pull = createWordPressInventoryPull({
  websiteUrl: "https://example.test",
  username: "sync-user",
  applicationPassword: "secret app password",
  pageSize: 25,
  fetcher: async (url, init) => {
    capturedUrl = url.toString()
    assert.equal(init.headers.accept, "application/json")
    assert.ok(init.headers.authorization.startsWith("Basic "))

    return {
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            public_id: "wp-inventory-charizard",
            card_name: "Charizard",
            set_name: "Base Set",
            set_code: "BASE1",
            printed_number: "4/102",
            condition_code: "LP",
            barcode: "PUG-WP-CHARIZARD",
            sale_price: "250.00",
            sale_currency: "USD",
            status: "available",
            location_id: 7,
            front_image_url: "https://images.pokemontcg.io/base1/4_hires.png",
          },
        ],
        meta: {
          page: 1,
          page_size: 25,
          total: 1,
          has_more: false,
        },
      }),
    }
  },
})

assert.equal(typeof pull, "function")

const result = await pull({ query: "charizard", page: 2 })

assert.equal(result.status, "ok")
assert.equal(result.items.length, 1)
assert.equal(result.items[0].public_id, "wp-inventory-charizard")
assert.equal(result.meta.page_size, 25)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.ok(capturedUrl.startsWith("https://example.test/wp-json/tcg-store/v1/inventory/search?"))
assert.ok(capturedUrl.includes("q=charizard"))
assert.ok(capturedUrl.includes("visibility=staff"))
assert.ok(capturedUrl.includes("status=available"))
assert.ok(capturedUrl.includes("page=2"))
assert.ok(capturedUrl.includes("page_size=25"))

const unavailablePull = createWordPressInventoryPull({
  websiteUrl: "https://example.test",
  authHeader: "Bearer sync-token",
  fetcher: async () => ({
    ok: false,
    status: 503,
    json: async () => ({}),
  }),
})
const unavailable = await unavailablePull()

assert.equal(unavailable.status, "blocked")
assert.equal(unavailable.code, "wordpress_inventory_pull_http_error")
assert.equal(unavailable.http_status, 503)
assert.equal(unavailable.items.length, 0)

assert.equal(inventoryItemsFromWordPressSearchResponse({ data: { items: [{ public_id: "one" }] } }).length, 1)
assert.equal(inventoryItemsFromWordPressSearchResponse({ items: "bad" }).length, 0)
assert.deepEqual(inventoryMetaFromWordPressSearchResponse({ meta: { page: 1, page_size: 500, total: 0 } }), {
  page: 1,
  page_size: 100,
  total: 0,
  has_more: false,
})

console.log("PASS WordPress inventory pull")
