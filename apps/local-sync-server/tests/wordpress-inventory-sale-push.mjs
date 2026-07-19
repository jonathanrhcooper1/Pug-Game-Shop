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
        status: "sold",
        code: "inventory_item_marked_sold",
        data: {
          inventory_id: 41,
          public_id: "wp-inventory-001",
          sku: "PUG-WP-CHARIZARD",
          barcode: "PUG-WP-CHARIZARD",
          previous_status: "available",
          status: "sold",
          date_sold: "2026-07-18 20:00:00",
          row_version: 8,
          woocommerce_product_id: 9001,
          square_receipt_reference: "SQ-SALE-9001",
        },
        meta: {
          idempotent: false,
          woocommerce_product_sync: {
            requested: true,
            synced: true,
            status: "executed",
            execution: { product_ids: [9001] },
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
assert.equal(result.wordpress_code, "inventory_item_marked_sold")
assert.equal(result.inventory.public_id, "wp-inventory-001")
assert.equal(result.inventory.status, "sold")
assert.equal(result.inventory.square_receipt_reference, "SQ-SALE-9001")
assert.equal(result.readback_verified, true)
assert.equal(result.wordpress_verification.checks.square_receipt_reference, true)
assert.equal(result.woocommerce_product_sync.requested, true)
assert.equal(result.woocommerce_product_sync.synced, true)
assert.deepEqual(result.woocommerce_product_sync.product_ids, [9001])
assert.equal(result.square_payment_capture_supported, false)
assert.equal(result.payment_capture_authority, "official_woocommerce_square_extension")
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.equal(observedRequest.url, "https://example.test/wp-json/tcg-store/v1/inventory/wp-inventory-001/mark-sold")
assert.equal(observedRequest.headers["idempotency-key"], "op-square-sale-001")
assert.ok(observedRequest.headers.authorization.startsWith("Basic "))
assert.equal(observedRequest.body.barcode, "PUG-WP-CHARIZARD")
assert.equal(observedRequest.body.sale_price_minor_units, 25000)
assert.equal(observedRequest.body.square_receipt_reference, "SQ-SALE-9001")
assert.equal(observedRequest.body.square_order_id, "SQ-ORDER-9001")
assert.equal(observedRequest.body.sold_by_user_id, "staff-front-counter")
assert.equal(observedRequest.body.sync_woocommerce_product, true)
assert.equal(observedRequest.body.production_write_approval, "woocommerce-product-sync")

const unverifiedPush = createWordPressInventorySalePush({
  websiteUrl: "https://example.test",
  authHeader: "Bearer test-token",
  fetcher: async () =>
    Response.json(
      {
        status: "sold",
        code: "inventory_item_marked_sold",
        data: {
          inventory_id: 41,
          public_id: "wp-inventory-001",
          status: "sold",
          square_receipt_reference: "WRONG-RECEIPT",
        },
        meta: {
          woocommerce_product_sync: { requested: true, synced: true, status: "executed" },
        },
      },
      { status: 200 },
    ),
})

const unverified = await unverifiedPush({
  operation: {
    operation_id: "op-unverified",
    payload: {
      inventory_public_id: "wp-inventory-001",
      square_receipt_reference: "SQ-SALE-EXPECTED",
    },
  },
  item: { wordpress_public_id: "wp-inventory-001" },
})

assert.equal(unverified.status, "blocked")
assert.equal(unverified.code, "wordpress_inventory_sale_readback_unverified")
assert.equal(unverified.readback_verified, false)
assert.ok(unverified.errors.includes("square_receipt_reference"))

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
