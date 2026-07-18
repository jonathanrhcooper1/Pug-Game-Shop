import assert from "node:assert/strict"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const squareSyncCalls = []

const store = createLocalSyncStore({
  databasePath: ":memory:",
  seedDemoInventory: true,
  squareLocationId: "LOC-PUG-1",
  wordpressInventorySalePush: async ({ operation, item }) => {
    assert.equal(operation.operation_type, "square_pos_sale")
    assert.equal(item.status, "sold")
    assert.equal(item.quantity_on_hand, 0)
    assert.equal(operation.payload.quantity_on_hand, 0)
    assert.equal(operation.payload.quantity_delta, -1)

    return {
      status: "ok",
      code: "wordpress_inventory_item_marked_sold",
      http_status: 200,
      wordpress_code: "inventory_item_marked_sold",
      inventory: {
        public_id: item.wordpress_public_id || item.public_id,
        sku: item.barcode,
        barcode: item.barcode,
        previous_status: "available",
        status: "sold",
        quantity_on_hand: 0,
        row_version: item.row_version + 1,
      },
      woocommerce_product_sync: {
        requested: true,
        synced: true,
        status: "executed",
        product_ids: [1001],
        errors: [],
        payment_capture_deferred: true,
        square_inventory_deferred: true,
      },
      credentials_synced_to_client: false,
      authorization_header_printed: false,
    }
  },
  squareCatalogInventorySyncer: {
    status: () => ({
      configured: true,
      environment: "production",
      location_id_configured: true,
      access_token_configured: true,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }),
    syncInventoryItem: async ({ operation, item }) => {
      squareSyncCalls.push({
        operation_type: operation.operation_type,
        sync_intent: operation.payload?.sync_intent,
        status: item.status,
        quantity_on_hand: item.quantity_on_hand,
      })

      return {
        status: "ok",
        code: "square_catalog_inventory_synced",
        square_catalog_item_id: item.square_catalog_item_id || "SQ-SALE-ITEM-1",
        square_catalog_variation_id: item.square_catalog_variation_id || "SQ-SALE-VAR-1",
        square_location_id: "LOC-PUG-1",
        quantity_on_hand: item.quantity_on_hand,
        item_created: false,
        variation_reused: true,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    },
  },
})

try {
  const managerAuth = store.createSession({ pin: "9999" })
  assert.equal(managerAuth.status, "ok")

  const search = store.searchInventory("charizard")
  assert.equal(search.status, "ok")
  const item = search.items.find((candidate) => candidate.status === "available")
  assert.ok(item)

  const sale = await store.finalizeSquarePosSale(managerAuth.session.token, {
    inventory_public_ids: [item.public_id],
    square_receipt_reference: "SQ-SALE-REMOVAL-1",
    sale_total_minor_units: item.price_minor_units,
  })

  assert.equal(sale.status, "ok")
  assert.equal(sale.wordpress_accepted_count, 1)
  assert.equal(sale.items[0].status, "sold")
  assert.equal(sale.items[0].quantity_on_hand, 0)
  assert.equal(sale.auto_sync_results[0].status, "accepted")
  assert.equal(sale.auto_sync_results[0].square_catalog_inventory_sync.status, "accepted")
  assert.equal(squareSyncCalls.length, 1)
  assert.equal(squareSyncCalls[0].operation_type, "square_pos_sale")
  assert.equal(squareSyncCalls[0].status, "sold")
  assert.equal(squareSyncCalls[0].quantity_on_hand, 0)

  const after = store.searchInventory(item.card_name)
  const soldItem = after.items.find((candidate) => candidate.public_id === item.public_id)
  assert.equal(soldItem.quantity_on_hand, 0)
  assert.equal(soldItem.status, "sold")
} finally {
  store.close()
}

console.log("PASS local sync Square sale removal sync")
