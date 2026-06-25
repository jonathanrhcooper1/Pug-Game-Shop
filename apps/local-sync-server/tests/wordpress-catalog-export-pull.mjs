import assert from "node:assert/strict"

import {
  catalogExportData,
  createWordPressCatalogExportPull,
} from "../src/wordpressCatalogExportPull.mjs"

let capturedUrl = ""
const pull = createWordPressCatalogExportPull({
  websiteUrl: "https://example.test/",
  authHeader: "Bearer preview-token",
  pageSize: 750,
  fetcher: async (url, init) => {
    capturedUrl = url.toString()
    assert.equal(init.headers.accept, "application/json")
    assert.equal(init.headers.authorization, "Bearer preview-token")

    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          table: "reference_cards",
          page: 2,
          page_size: 750,
          total: 17001,
          has_more: true,
          manifest: {
            format: "json",
          },
          rows: [
            {
              provider_card_id: "scrydex-pokemon-evs-215",
              card_name: "Umbreon VMAX",
              set_name: "Evolving Skies",
              market_price_minor_units: 112045,
            },
          ],
        },
      }),
    }
  },
})

assert.equal(typeof pull, "function")

const result = await pull({ page: 2, pageSize: 750 })

assert.equal(result.status, "ok")
assert.equal(result.table, "reference_cards")
assert.equal(result.rows.length, 1)
assert.equal(result.meta.page, 2)
assert.equal(result.meta.page_size, 750)
assert.equal(result.meta.total, 17001)
assert.equal(result.meta.has_more, true)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.ok(capturedUrl.startsWith("https://example.test/wp-json/tcg-store/v1/scrydex/catalog/export?"))
assert.ok(capturedUrl.includes("table=reference_cards"))
assert.ok(capturedUrl.includes("page=2"))
assert.ok(capturedUrl.includes("page_size=750"))

const invalidTable = await pull({ table: "../bad", pageSize: 5000 })
assert.ok(invalidTable.endpoint.includes("table=reference_cards"))
assert.ok(invalidTable.endpoint.includes("page_size=1000"))

const unavailablePull = createWordPressCatalogExportPull({
  websiteUrl: "https://example.test/",
  authHeader: "Bearer preview-token",
  fetcher: async () => ({
    ok: false,
    status: 403,
    json: async () => ({}),
  }),
})
const unavailable = await unavailablePull()

assert.equal(unavailable.status, "blocked")
assert.equal(unavailable.code, "wordpress_catalog_export_http_error")
assert.equal(unavailable.http_status, 403)
assert.equal(unavailable.rows.length, 0)

assert.deepEqual(catalogExportData({ data: { rows: [] } }), { rows: [] })
assert.deepEqual(catalogExportData({ rows: [] }), {})
assert.equal(createWordPressCatalogExportPull({ websiteUrl: "https://example.test/" }), null)

console.log("PASS WordPress catalog export pull")
