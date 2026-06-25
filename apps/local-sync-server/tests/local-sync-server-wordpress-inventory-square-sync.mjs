import assert from "node:assert/strict"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

let pullRows = [wordpressInventoryRow({ quantity_on_hand: 3, row_version: 1, sale_price: "5.00" })]
const pullInputs = []
const squareCalls = []

const store = createLocalSyncStore({
  databasePath: ":memory:",
  seedDemoInventory: false,
  squareLocationId: "LB1B9Z4GVG1BH",
  wordpressInventoryPull: async (input) => {
    pullInputs.push(input)

    return {
      status: "ok",
      items: pullRows,
      meta: {
        page: input.page ?? 1,
        page_size: input.pageSize ?? 100,
        total: pullRows.length,
        has_more: false,
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
      squareCalls.push({
        operation_id: operation.operation_id,
        sync_intent: operation.payload?.sync_intent,
        barcode: item.barcode,
        quantity_on_hand: item.quantity_on_hand,
        price_minor_units: item.price_minor_units,
      })

      return {
        status: "ok",
        code: "square_catalog_inventory_synced",
        square_catalog_item_id: item.square_catalog_item_id || "SQ-WP-ITEM-1",
        square_catalog_variation_id: item.square_catalog_variation_id || "SQ-WP-VARIATION-1",
        square_location_id: "LB1B9Z4GVG1BH",
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
  const firstPull = await store.pullWebsiteInventoryForSystem({
    domains: ["inventory"],
    page: 1,
    page_size: 100,
    updated_after: "2026-06-25T12:00:00Z",
  })

  assert.equal(firstPull.status, "ok")
  assert.equal(firstPull.inserted_count, 1)
  assert.equal(firstPull.square_catalog_inventory_sync_accepted_count, 1)
  assert.equal(squareCalls.length, 1)
  assert.equal(squareCalls[0].sync_intent, "wordpress_inventory_pull_square_catalog_inventory_update")
  assert.equal(squareCalls[0].quantity_on_hand, 3)
  assert.equal(pullInputs[0].updatedAfter, "2026-06-25T12:00:00Z")

  const secondPull = await store.pullWebsiteInventoryForSystem({
    domains: ["inventory"],
    page: 1,
    page_size: 100,
    updated_after: "2026-06-25T12:01:00Z",
  })

  assert.equal(secondPull.status, "ok")
  assert.equal(secondPull.unchanged_count, 1)
  assert.equal(secondPull.square_catalog_inventory_sync_accepted_count, 0)
  assert.equal(squareCalls.length, 1)

  pullRows = [wordpressInventoryRow({ quantity_on_hand: 1, row_version: 2, sale_price: "6.00" })]
  const quantityChangePull = await store.pullWebsiteInventoryForSystem({
    domains: ["inventory"],
    page: 1,
    page_size: 100,
    updated_after: "2026-06-25T12:02:00Z",
  })

  assert.equal(quantityChangePull.status, "ok")
  assert.equal(quantityChangePull.updated_count, 1)
  assert.equal(quantityChangePull.square_catalog_inventory_sync_accepted_count, 1)
  assert.equal(squareCalls.length, 2)
  assert.equal(squareCalls[1].quantity_on_hand, 1)
  assert.equal(squareCalls[1].price_minor_units, 600)

  const status = store.syncStatus()
  assert.equal(status.last_website_inventory_pull.status, "ok")
  assert.equal(status.last_website_inventory_pull.square_catalog_inventory_sync_accepted_count, 1)
  assert.equal(JSON.stringify(status).includes("EAAA"), false)
} finally {
  store.close()
}

console.log("PASS local sync WordPress inventory to Square sync")

function wordpressInventoryRow(overrides = {}) {
  return {
    public_id: "wp-square-source-1",
    row_version: 1,
    provider_card_id: "scrydex-pokemon-wp-square-source",
    game: "pokemon",
    card_name: "Website Square Source",
    set_name: "Connector Test",
    set_code: "CONN",
    card_number: "25",
    printed_number: "25/100",
    condition_code: "NM",
    barcode: "PUG-WP-SQUARE-SOURCE-1",
    sale_price: "5.00",
    minimum_sale_price: "5.00",
    sale_currency: "USD",
    quantity_on_hand: 3,
    status: "available",
    front_image_url: "https://images.example.test/card.png",
    online_visibility: "visible",
    kiosk_visibility: "visible",
    pos_visibility: "visible",
    square_catalog_item_id: "SQ-WP-ITEM-1",
    square_catalog_variation_id: "SQ-WP-VARIATION-1",
    square_location_id: "LB1B9Z4GVG1BH",
    external_sync_state: "square_synced",
    ...overrides,
  }
}
