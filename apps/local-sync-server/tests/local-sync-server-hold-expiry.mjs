import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

let currentTime = new Date("2026-06-09T14:00:00.000Z")

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://example.test/",
  storeOptions: {
    cardHoldSeconds: 60,
    databasePath: ":memory:",
    now: () => currentTime,
  },
})

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`

  const inventory = await fetchJson(`${baseUrl}/inventory/search?q=pikachu`)
  assert.equal(inventory.items[0].status, "available")

  const order = await fetchJson(`${baseUrl}/kiosk/orders`, {
    method: "POST",
    body: {
      first_name: "Timed",
      last_name: "Pickup",
      inventory_public_ids: [inventory.items[0].public_id],
    },
  })

  assert.equal(order.status, "ok")
  assert.equal(order.order.status, "queued")
  assert.equal(order.order.hold_expires_at_utc, "2026-06-09T14:01:00.000Z")
  assert.equal(order.reservations[0].expires_at_utc, "2026-06-09T14:01:00.000Z")

  const reserved = await fetchJson(`${baseUrl}/inventory/search?q=pikachu`)
  assert.equal(reserved.items[0].status, "reserved")

  currentTime = new Date("2026-06-09T14:01:01.000Z")

  const released = await fetchJson(`${baseUrl}/inventory/search?q=pikachu`)
  assert.equal(released.items[0].status, "available")

  const auth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1234" },
  })

  const expiredOrders = await fetchJson(`${baseUrl}/kiosk/orders?status=expired`, {
    token: auth.session.token,
  })

  assert.equal(expiredOrders.status, "ok")
  assert.equal(expiredOrders.order_count, 1)
  assert.equal(expiredOrders.orders[0].status, "expired")
  assert.equal(expiredOrders.orders[0].hold_seconds_remaining, 0)

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)
  assert.equal(syncStatus.status, "ok")
  assert.equal(syncStatus.card_hold_seconds, 60)
  assert.equal(syncStatus.queue_depth, 0)

  console.log("PASS local sync card hold expiry")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

const tempDirectory = mkdtempSync(join(tmpdir(), "pug-legacy-hold-expiry-"))
const legacyDatabasePath = join(tempDirectory, "store-sync.sqlite")

currentTime = new Date("2026-06-09T15:00:00.000Z")

let legacyServer = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://example.test/",
  storeOptions: {
    cardHoldSeconds: 60,
    databasePath: legacyDatabasePath,
    now: () => currentTime,
  },
})

await new Promise((resolve) => legacyServer.listen(0, "127.0.0.1", resolve))

try {
  const { port } = legacyServer.address()
  const baseUrl = `http://127.0.0.1:${port}`

  const inventory = await fetchJson(`${baseUrl}/inventory/search?q=pikachu`)
  const order = await fetchJson(`${baseUrl}/kiosk/orders`, {
    method: "POST",
    body: {
      first_name: "Legacy",
      last_name: "Hold",
      inventory_public_ids: [inventory.items[0].public_id],
    },
  })

  assert.equal(order.order.hold_expires_at_utc, "2026-06-09T15:01:00.000Z")
} finally {
  await new Promise((resolve) => legacyServer.close(resolve))
}

const legacyDatabase = new DatabaseSync(legacyDatabasePath)
legacyDatabase.prepare("UPDATE kiosk_orders SET hold_expires_at_utc = ''").run()
legacyDatabase.prepare("DELETE FROM operation_queue WHERE operation_type = 'inventory_reservation'").run()
legacyDatabase.close()

currentTime = new Date("2026-06-09T15:01:01.000Z")

legacyServer = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://example.test/",
  storeOptions: {
    cardHoldSeconds: 60,
    databasePath: legacyDatabasePath,
    now: () => currentTime,
  },
})

await new Promise((resolve) => legacyServer.listen(0, "127.0.0.1", resolve))

try {
  const { port } = legacyServer.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const auth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1234" },
  })

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)
  assert.equal(syncStatus.status, "ok")
  assert.equal(syncStatus.queue_depth, 0)

  const expiredOrders = await fetchJson(`${baseUrl}/kiosk/orders?status=expired`, {
    token: auth.session.token,
  })
  assert.equal(expiredOrders.order_count, 1)

  const releasedInventory = await fetchJson(`${baseUrl}/inventory/search?q=pikachu`)
  assert.equal(releasedInventory.items[0].status, "available")
} finally {
  await new Promise((resolve) => legacyServer.close(resolve))
  try {
    rmSync(tempDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch (error) {
    if (error?.code !== "EPERM") {
      throw error
    }
  }
}

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

  assert.equal(
    response.status,
    options.expectedStatus ?? 200,
    `${url} returned ${response.status}: ${JSON.stringify(body)}`,
  )

  return body
}
