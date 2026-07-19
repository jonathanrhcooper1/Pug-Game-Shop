import assert from "node:assert/strict"

import { createWordPressInventoryUpdatePush } from "../src/wordpressInventoryPush.mjs"

let observedRequest = null
const push = createWordPressInventoryUpdatePush({
  websiteUrl: "https://example.test",
  username: "sync-user",
  applicationPassword: "application password",
  fetcher: async (url, init) => {
    const body = JSON.parse(init.body)
    observedRequest = { url: url.toString(), body, headers: init.headers }

    return Response.json(
      {
        status: "updated",
        code: "inventory_projection_updated",
        data: {
          inventory_id: 42,
          public_id: "wp-card-42",
          barcode: body.barcode,
          sku: body.sku,
          status: body.status,
          quantity_on_hand: body.quantity_on_hand,
          sale_price_minor_units: body.sale_price_minor_units,
          minimum_sale_price_minor_units: body.minimum_sale_price_minor_units,
          market_price_minor_units: body.market_price_minor_units,
          sale_currency: "USD",
          online_visibility: body.online_visibility,
          kiosk_visibility: body.kiosk_visibility,
          pos_visibility: body.pos_visibility,
          woocommerce_product_id: 777,
          external_sync_state: "synced",
          row_version: 9,
          woocommerce: { available: true, product_id: 777, stock_quantity: 6 },
        },
        meta: {
          woocommerce_product_sync: {
            status: "executed",
            requested: true,
            synced: true,
            verified: true,
            product_ids: [777],
          },
        },
      },
      { status: 200 },
    )
  },
})

const result = await push({
  operation: {
    operation_id: "inventory-update-42-v9",
    payload: {
      quantity_on_hand: 6,
      status: "available",
      price_minor_units: 1500,
      minimum_sale_price_minor_units: 1000,
      market_price_minor_units: 1300,
    },
  },
  item: {
    public_id: "local-card-42",
    wordpress_public_id: "wp-card-42",
    barcode: "PUG-CARD-42",
    online_visibility: "visible",
    kiosk_visibility: "visible",
    pos_visibility: "visible",
  },
})

assert.equal(result.status, "ok")
assert.equal(result.readback_verified, true)
assert.equal(result.inventory.quantity_on_hand, 6)
assert.equal(result.inventory.sale_price_minor_units, 1500)
assert.equal(result.inventory.minimum_sale_price_minor_units, 1000)
assert.equal(result.inventory.market_price_minor_units, 1300)
assert.equal(result.woocommerce_product_sync.synced, true)
assert.deepEqual(result.woocommerce_product_sync.product_ids, [777])
assert.equal(observedRequest.url, "https://example.test/wp-json/tcg-store/v1/inventory-projections/wp-card-42")
assert.equal(observedRequest.body.quantity_on_hand, 6)
assert.equal(observedRequest.headers["idempotency-key"], "inventory-update-42-v9")

const mismatchPush = createWordPressInventoryUpdatePush({
  websiteUrl: "https://example.test",
  authHeader: "Bearer fixture-token",
  fetcher: async (_url, init) => {
    const body = JSON.parse(init.body)
    return Response.json(
      {
        status: "updated",
        code: "inventory_projection_updated",
        data: {
          public_id: "wp-card-42",
          barcode: body.barcode,
          sku: body.sku,
          status: body.status,
          quantity_on_hand: 5,
          sale_price_minor_units: body.sale_price_minor_units,
          minimum_sale_price_minor_units: body.minimum_sale_price_minor_units,
          online_visibility: body.online_visibility,
          kiosk_visibility: body.kiosk_visibility,
          pos_visibility: body.pos_visibility,
        },
        meta: { woocommerce_product_sync: { verified: true } },
      },
      { status: 200 },
    )
  },
})

const mismatch = await mismatchPush({
  operation: { operation_id: "mismatch", payload: { quantity_on_hand: 6, price_minor_units: 1500 } },
  item: {
    wordpress_public_id: "wp-card-42",
    barcode: "PUG-CARD-42",
    minimum_sale_price_minor_units: 1000,
    status: "available",
  },
})

assert.equal(mismatch.status, "blocked")
assert.equal(mismatch.readback_verified, false)
assert.ok(mismatch.errors.includes("quantity"))

console.log("PASS WordPress absolute inventory update and readback")
