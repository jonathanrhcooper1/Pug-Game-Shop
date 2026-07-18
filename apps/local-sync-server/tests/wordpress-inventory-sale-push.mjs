import assert from "node:assert/strict"

import { createWordPressInventorySalePush } from "../src/wordpressInventoryPush.mjs"

let observedRequest = null
const salePush = createWordPressInventorySalePush({
  websiteUrl: "https://example.test",
  username: "sync-user",
  applicationPassword: "secret app password",
  fetcher: async (url, init) => {
    observedRequest = {
      url: url.toString(),
      headers: init.headers,
      body: JSON.parse(init.body),
    }

    return Response.json(
      {
        status: "updated",
        code: "inventory_projection_updated",
        data: {
          inventory_id: 41,
          public_id: "wp-inventory-001",
          sku: "PUG-WP-CHARIZARD",
          barcode: "PUG-WP-CHARIZARD",
          status: "sold",
          quantity_on_hand: 0,
          sale_price_minor_units: 25000,
          minimum_sale_price_minor_units: 25000,
          market_price_minor_units: 0,
          sale_currency: "USD",
          online_visibility: "visible",
          kiosk_visibility: "visible",
          pos_visibility: "visible",
          row_version: 8,
          woocommerce_product_id: 9001,
        },
        meta: {
          woocommerce_product_sync: {
            requested: true,
            synced: true,
            verified: true,
            status: "executed",
            product_ids: [9001],
            payment_capture_deferred: true,
            square_inventory_deferred: true,
            errors: [],
          },
        },
      },
      { status: 200 },
    )
  },
})

assert.ok(salePush)

const result = await salePush({
  operation: {
    operation_id: "op-square-sale-001",
    operation_type: "square_pos_sale",
    entity_id: "local-inventory-001",
    payload: {
      inventory_public_id: "wp-inventory-001",
      barcode: "PUG-WP-CHARIZARD",
      square_receipt_reference: "SQ-SALE-9001",
      square_order_id: "SQ-ORDER-9001",
      sale_total_minor_units: 25000,
      sale_price_minor_units: 25000,
      actor_id: "staff-front-counter",
    },
  },
  item: {
    public_id: "local-inventory-001",
    wordpress_public_id: "wp-inventory-001",
    barcode: "PUG-WP-CHARIZARD",
    price_minor_units: 25000,
  },
})

assert.equal(result.status, "ok")
assert.equal(result.wordpress_code, "inventory_projection_updated")
assert.equal(result.inventory.public_id, "wp-inventory-001")
assert.equal(result.inventory.status, "sold")
assert.equal(result.inventory.quantity_on_hand, 0)
assert.equal(result.readback_verified, true)
assert.equal(result.woocommerce_product_sync.requested, true)
assert.equal(result.woocommerce_product_sync.synced, true)
assert.deepEqual(result.woocommerce_product_sync.product_ids, [9001])
assert.equal(result.square_payment_capture_supported, false)
assert.equal(result.payment_capture_authority, "official_woocommerce_square_extension")
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.equal(observedRequest.url, "https://example.test/wp-json/tcg-store/v1/inventory-projections/wp-inventory-001")
assert.equal(observedRequest.headers["idempotency-key"], "op-square-sale-001")
assert.ok(observedRequest.headers.authorization.startsWith("Basic "))
assert.equal(observedRequest.body.barcode, "PUG-WP-CHARIZARD")
assert.equal(observedRequest.body.sale_price_minor_units, 25000)
assert.equal(observedRequest.body.quantity_on_hand, 0)
assert.equal(observedRequest.body.status, "sold")
assert.equal(observedRequest.body.sync_woocommerce_product, true)
assert.equal(observedRequest.body.production_write_approval, "woocommerce-product-sync")

const rejectedPush = createWordPressInventorySalePush({
  websiteUrl: "https://example.test",
  authHeader: "Bearer test-token",
  fetcher: async () =>
    Response.json(
      {
        status: "invalid",
        code: "square_reference_required",
        errors: ["square_reference_required"],
      },
      { status: 400 },
    ),
})

const rejected = await rejectedPush({
  operation: { operation_id: "op-rejected", payload: { inventory_public_id: "wp-inventory-001" } },
  item: { public_id: "local-inventory-001", wordpress_public_id: "wp-inventory-001" },
})

assert.equal(rejected.status, "blocked")
assert.equal(rejected.code, "wordpress_inventory_sale_rejected")
assert.equal(rejected.wordpress_code, "square_reference_required")
assert.ok(rejected.errors.includes("square_reference_required"))
assert.equal(rejected.credentials_synced_to_client, false)

assert.equal(createWordPressInventorySalePush({ websiteUrl: "https://example.test" }), null)

console.log("PASS WordPress inventory sale push")
