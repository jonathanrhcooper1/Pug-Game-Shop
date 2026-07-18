import assert from "node:assert/strict"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

let orderedQuantity = 2
const squareCalls = []

const store = createLocalSyncStore({
  databasePath: ":memory:",
  seedDemoInventory: false,
  wordpressInventoryPull: async () => ({
    status: "ok",
    items: [wordpressInventoryRow()],
    meta: { page: 1, page_size: 100, total: 1, has_more: false },
  }),
  wordpressFulfillmentPull: async () => ({
    status: "ok",
    order_count: 1,
    orders: [woocommerceOrder(orderedQuantity)],
  }),
  squareCatalogInventorySyncer: {
    status: () => ({ configured: true }),
    syncInventoryItem: async ({ operation, item }) => {
      squareCalls.push({
        operation_id: operation.operation_id,
        quantity_on_hand: item.quantity_on_hand,
      })
      return {
        status: "ok",
        readback_verified: true,
        verification: { verified: true },
        readback: { quantity_on_hand: item.quantity_on_hand },
        code: "square_catalog_inventory_synced",
        square_catalog_item_id: "SQ-ATOMIC-ITEM",
        square_catalog_variation_id: "SQ-ATOMIC-VARIATION",
        square_location_id: "SQ-LOCATION",
        quantity_on_hand: item.quantity_on_hand,
      }
    },
  },
})

try {
  const seeded = await store.pullWebsiteInventoryForSystem({
    domains: ["inventory"],
    manual_remote_authority: true,
    square_sync: false,
  })
  assert.equal(seeded.status, "ok")
  assert.equal(seeded.inserted_count, 1)

  const insufficient = await store.pullWebsiteInventoryForSystem({ domains: ["fulfillment"] })
  assert.equal(insufficient.status, "ok")
  assert.equal(insufficient.fulfillment_inventory_sale_retry_count, 1)
  assert.equal(
    insufficient.fulfillment_inventory_sale_results[0].code,
    "woocommerce_sale_inventory_insufficient_local_stock",
  )
  assert.equal(insufficient.fulfillment_inventory_sale_results[0].applied_quantity, 0)
  assert.equal(insufficient.fulfillment_inventory_sale_results[0].planned_quantity, 1)
  assert.equal(insufficient.fulfillment_inventory_sale_results[0].unmatched_quantity, 1)
  assert.equal(insufficient.fulfillment_orders[0].inventory_sale_applied_at_utc, "")
  assert.equal(store.searchInventory({ query: "Atomic Woo Card" }).items[0].quantity_on_hand, 1)
  assert.equal(squareCalls.length, 0)

  orderedQuantity = 1
  const applied = await store.pullWebsiteInventoryForSystem({ domains: ["fulfillment"] })
  assert.equal(applied.status, "ok")
  assert.equal(applied.fulfillment_inventory_sale_applied_count, 1)
  assert.equal(applied.fulfillment_inventory_sale_results[0].applied_quantity, 1)
  assert.equal(applied.fulfillment_inventory_sale_results[0].unmatched_quantity, 0)
  assert.match(applied.fulfillment_orders[0].inventory_sale_applied_at_utc, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(store.searchInventory({ query: "Atomic Woo Card" }).items[0].quantity_on_hand, 0)
  assert.equal(store.searchInventory({ query: "Atomic Woo Card" }).items[0].status, "sold")
  assert.equal(squareCalls.length, 1)
  assert.equal(squareCalls[0].quantity_on_hand, 0)

  const repeated = await store.pullWebsiteInventoryForSystem({ domains: ["fulfillment"] })
  assert.equal(repeated.status, "ok")
  assert.equal(repeated.fulfillment_inventory_sale_skipped_count, 1)
  assert.equal(
    repeated.fulfillment_inventory_sale_results[0].code,
    "woocommerce_sale_inventory_delta_not_applicable",
  )
  assert.equal(store.searchInventory({ query: "Atomic Woo Card" }).items[0].quantity_on_hand, 0)
  assert.equal(squareCalls.length, 1)
} finally {
  store.close()
}

console.log("PASS local sync WooCommerce sale atomicity")

function wordpressInventoryRow() {
  return {
    public_id: "wp-atomic-501",
    row_version: 1,
    provider_card_id: "scrydex-atomic-501",
    game: "magic",
    card_name: "Atomic Woo Card",
    set_name: "Connector Test",
    set_code: "CONN",
    card_number: "501",
    printed_number: "501/501",
    condition_code: "NM",
    barcode: "PUG-WOO-ATOMIC-501",
    sale_price: "10.00",
    minimum_sale_price: "8.00",
    sale_currency: "USD",
    quantity_on_hand: 1,
    status: "available",
    online_visibility: "visible",
    kiosk_visibility: "visible",
    pos_visibility: "visible",
  }
}

function woocommerceOrder(quantity) {
  return {
    order_id: 99501,
    order_number: "99501",
    customer_name: "Atomic Customer",
    order_status: "processing",
    fulfillment_status: "awaiting_pull",
    payment_status: "paid",
    shipping_method_id: "local_pickup",
    shipping_method_title: "Local pickup",
    local_pickup: true,
    item_count: quantity,
    total_minor_units: quantity * 1000,
    currency: "USD",
    created_at_utc: "2026-07-18T12:00:00.000Z",
    paid_at_utc: "2026-07-18T12:01:00.000Z",
    items: [
      {
        order_item_id: 88501,
        inventory_id: 501,
        barcode: "PUG-WOO-ATOMIC-501",
        card_name: "Atomic Woo Card",
        set_name: "Connector Test",
        condition: "NM",
        price_minor_units: 1000,
        currency: "USD",
        quantity,
      },
    ],
  }
}
