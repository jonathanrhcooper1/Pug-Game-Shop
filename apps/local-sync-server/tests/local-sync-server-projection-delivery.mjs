import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"
import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const tempDirectory = await mkdtemp(join(tmpdir(), "pug-outbox-delivery-"))
const databasePath = join(tempDirectory, "store-sync.sqlite")
let currentTime = new Date("2026-07-18T20:00:00.000Z")
const now = () => currentTime
let wordpressCallCount = 0
let squareCallCount = 0
let squareAvailable = false

const connectorOptions = () => ({
  databasePath,
  now,
  seedDemoData: true,
  seedDemoInventory: true,
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
          message: "Authorization Bearer test-secret must never leave diagnostics.",
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

let store = createLocalSyncStore(connectorOptions())
let server = null

try {
  let managerAuth = store.createSession({ pin: "1420" })
  let staffAuth = store.createSession({ pin: "1234" })
  assert.equal(managerAuth.status, "ok")
  assert.equal(staffAuth.status, "ok")

  const update = await store.updateInventoryItem(managerAuth.session.token, "inv-1001", {
    quantity_on_hand: 2,
    quantity_update_mode: "absolute",
    reason: "projection delivery independence contract",
  })

  assert.equal(update.status, "ok", JSON.stringify(update))
  assert.equal(update.quantity_on_hand, 2)
  assert.equal(update.wordpress_retry_count, 1)
  assert.equal(wordpressCallCount, 1)
  assert.equal(squareCallCount, 1)

  squareAvailable = true
  const notDue = await store.pushQueuedOperations(managerAuth.session.token)
  assert.equal(notDue.status, "ok")
  assert.equal(notDue.accepted_count, 0)
  assert.equal(notDue.deferred_count, 1)
  assert.equal(notDue.results[0].status, "deferred")
  assert.equal(notDue.local_queue_depth, 1)
  assert.equal(wordpressCallCount, 1)
  assert.equal(squareCallCount, 1)

  currentTime = new Date("2026-07-18T20:00:11.000Z")
  const dueRetry = await store.pushQueuedOperations(managerAuth.session.token)
  assert.equal(dueRetry.accepted_count, 1)
  assert.equal(dueRetry.retry_count, 0)
  assert.equal(dueRetry.local_queue_depth, 0)
  assert.equal(dueRetry.results[0].wordpress_inventory_projection.code, "wordpress_projection_already_delivered")
  assert.equal(dueRetry.results[0].square_catalog_inventory_sync.status, "accepted")
  assert.equal(wordpressCallCount, 1)
  assert.equal(squareCallCount, 2)

  squareAvailable = false
  currentTime = new Date("2026-07-18T20:01:00.000Z")
  await store.updateInventoryItem(managerAuth.session.token, "inv-1001", {
    quantity_on_hand: 3,
    quantity_update_mode: "absolute",
    reason: "dead-letter and replay contract",
  })
  assert.equal(squareCallCount, 3)

  const retryRows = store.listOutboxDeliveries(managerAuth.session.token, {
    status: "retry",
    destination: "square",
  })
  assert.equal(retryRows.status, "ok")
  assert.equal(retryRows.delivery_count, 1)
  const replayOperationId = retryRows.deliveries[0].operation_id

  const database = new DatabaseSync(databasePath)
  try {
    database.prepare(`
      UPDATE sync_outbox_deliveries
      SET max_attempts = 2
      WHERE event_id = (SELECT event_id FROM sync_outbox_events WHERE idempotency_key = ?)
        AND destination = 'square'
    `).run(replayOperationId)
  } finally {
    database.close()
  }

  currentTime = new Date("2026-07-18T20:01:11.000Z")
  const finalFailure = await store.pushQueuedOperations(managerAuth.session.token)
  assert.equal(finalFailure.dead_letter_count, 1, JSON.stringify(finalFailure))
  assert.equal(squareCallCount, 4)

  squareAvailable = true
  const deadLetterExcluded = await store.pushQueuedOperations(managerAuth.session.token)
  assert.equal(deadLetterExcluded.dead_letter_count, 1)
  assert.equal(deadLetterExcluded.local_queue_depth, 1)
  assert.equal(squareCallCount, 4)

  server = createLocalSyncHttpServer({ store })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`

  const staffListing = await fetchJson(`${baseUrl}/sync/outbox/deliveries?status=dead_letter`, {
    token: staffAuth.session.token,
    expectedStatus: 409,
  })
  assert.equal(staffListing.code, "manager_required")

  const managerListing = await fetchJson(`${baseUrl}/sync/outbox/deliveries?status=dead_letter`, {
    token: managerAuth.session.token,
  })
  assert.equal(managerListing.delivery_count, 1)
  assert.equal(managerListing.deliveries[0].operation_id, replayOperationId)
  assert.equal(managerListing.deliveries[0].last_error_message.includes("test-secret"), false)
  assert.match(managerListing.deliveries[0].last_error_message, /\[redacted\]/)

  const replayBody = {
    operation_id: replayOperationId,
    destination: "square",
    request_id: "manager-replay-001",
    reason: "Connector recovered after a verified outage",
  }
  const replay = await fetchJson(`${baseUrl}/sync/outbox/replay`, {
    method: "POST",
    token: managerAuth.session.token,
    body: replayBody,
  })
  assert.equal(replay.idempotent, false)
  assert.equal(replay.aggregate_revalidated, true)
  assert.equal(replay.delivery.status, "pending")
  assert.equal(replay.audit.previous_status, "dead_letter")
  assert.equal(replay.audit.requested_by_user_name, "Store Owner")

  const repeatedReplay = await fetchJson(`${baseUrl}/sync/outbox/replay`, {
    method: "POST",
    token: managerAuth.session.token,
    body: replayBody,
  })
  assert.equal(repeatedReplay.idempotent, true)
  assert.equal(repeatedReplay.audit.replay_id, replay.audit.replay_id)

  await new Promise((resolve) => server.close(resolve))
  server = null
  store.close()

  store = createLocalSyncStore(connectorOptions())
  managerAuth = store.createSession({ pin: "1420" })
  const afterRestart = store.listOutboxDeliveries(managerAuth.session.token, {
    status: "pending",
    destination: "square",
  })
  assert.equal(afterRestart.delivery_count, 1)
  assert.equal(afterRestart.deliveries[0].operation_id, replayOperationId)

  const persistedReplay = store.replayOutboxDelivery(managerAuth.session.token, replayBody)
  assert.equal(persistedReplay.status, "ok")
  assert.equal(persistedReplay.idempotent, true)

  const replayedPush = await store.pushQueuedOperations(managerAuth.session.token)
  assert.equal(replayedPush.accepted_count, 1)
  assert.equal(replayedPush.local_queue_depth, 0)
  assert.equal(squareCallCount, 5)
  assert.equal(wordpressCallCount, 2)

  const inventory = store.searchInventory({ query: "PUG-000001" })
  assert.equal(inventory.items[0].quantity_on_hand, 3)
  assert.equal(inventory.items[0].external_sync_state, "synced")

  const verification = new DatabaseSync(databasePath)
  try {
    assert.equal(
      verification.prepare("SELECT COUNT(*) AS count FROM sync_outbox_replay_audit WHERE operation_id = ?")
        .get(replayOperationId).count,
      1,
    )
  } finally {
    verification.close()
  }
} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }
  store.close()
  await rm(tempDirectory, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
}

console.log("PASS transactional outbox due-time, dead-letter, manager replay, and restart persistence")

async function fetchJson(url, options = {}) {
  const headers = { "content-type": "application/json" }
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`
  }
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await response.json()
  assert.equal(response.status, options.expectedStatus ?? 200, JSON.stringify(body))
  return body
}
