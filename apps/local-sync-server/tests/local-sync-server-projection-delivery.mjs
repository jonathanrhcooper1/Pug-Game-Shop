import assert from "node:assert/strict"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

let wordpressCallCount = 0
let squareCallCount = 0
let squareAvailable = false

const store = createLocalSyncStore({
  databasePath: ":memory:",
  wordpressInventoryUpdatePush: async ({ item }) => {
    wordpressCallCount += 1
    return {
      status: "ok",
      readback_verified: true,
      wordpress_readback: { quantity_on_hand: item.quantity_on_hand },
      wordpress_verification: { verified: true },
      code: "wordpress_inventory_item_updated",
      wordpress_code: "inventory_item_updated",
      http_status: 200,
      inventory: {
        public_id: item.wordpress_public_id || `wp-${item.public_id}`,
        status: item.status,
        quantity_on_hand: item.quantity_on_hand,
      },
    }
  },
  squareCatalogInventorySyncer: {
    status: () => ({ configured: true }),
    syncInventoryItem: async ({ item }) => {
      squareCallCount += 1
      if (!squareAvailable) {
        return {
          status: "blocked",
          code: "square_fixture_temporarily_unavailable",
          message: "Square is unavailable for the first projection attempt.",
          http_status: 503,
        }
      }

      return {
        status: "ok",
        readback_verified: true,
        verification: { verified: true },
        readback: { quantity_on_hand: item.quantity_on_hand },
        code: "square_catalog_inventory_synced",
        http_status: 200,
        square_catalog_item_id: "SQ-DELIVERY-ITEM",
        square_catalog_variation_id: "SQ-DELIVERY-VARIATION",
        square_location_id: "SQ-DELIVERY-LOCATION",
        quantity_on_hand: item.quantity_on_hand,
      }
    },
  },
})

try {
  const auth = store.createSession({ pin: "1420" })
  assert.equal(auth.status, "ok")

  const update = await store.updateInventoryItem(auth.session.token, "inv-1001", {
    quantity_on_hand: 2,
    quantity_update_mode: "absolute",
    reason: "projection delivery independence contract",
  })

  assert.equal(update.status, "ok")
  assert.equal(update.quantity_on_hand, 2)
  assert.equal(update.wordpress_accepted_count, 0)
  assert.equal(update.wordpress_retry_count, 1)
  assert.equal(update.local_queue_depth, 1)
  assert.equal(update.auto_sync_results[0].wordpress_inventory_projection.status, "accepted")
  assert.equal(update.auto_sync_results[0].square_catalog_inventory_sync.status, "retry")
  assert.equal(wordpressCallCount, 1)
  assert.equal(squareCallCount, 1)

  squareAvailable = true
  const retry = await store.pushQueuedOperations(auth.session.token)

  assert.equal(retry.status, "ok")
  assert.equal(retry.accepted_count, 1)
  assert.equal(retry.retry_count, 0)
  assert.equal(retry.local_queue_depth, 0)
  assert.equal(retry.results[0].wordpress_inventory_projection.code, "wordpress_projection_already_delivered")
  assert.equal(retry.results[0].square_catalog_inventory_sync.status, "accepted")
  assert.equal(wordpressCallCount, 1)
  assert.equal(squareCallCount, 2)

  const idempotent = await store.pushQueuedOperations(auth.session.token)
  assert.equal(idempotent.operation_count, 0)
  assert.equal(wordpressCallCount, 1)
  assert.equal(squareCallCount, 2)

  const inventory = store.searchInventory({ query: "PUG-000001" })
  assert.equal(inventory.items[0].quantity_on_hand, 2)
  assert.equal(inventory.items[0].external_sync_state, "synced")
  assert.equal(inventory.items[0].square_catalog_variation_id, "SQ-DELIVERY-VARIATION")
} finally {
  store.close()
}

console.log("PASS independent WordPress and Square projection delivery")
