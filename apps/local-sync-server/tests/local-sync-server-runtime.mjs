import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

const server = createLocalSyncHttpServer()
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const health = await fetchJson(`${baseUrl}/health`)

  assert.equal(health.status, "ok")
  assert.equal(health.local_database, "store-sync.sqlite")

  const managerAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "9999" },
  })

  assert.equal(managerAuth.status, "ok")
  assert.equal(managerAuth.user.role, "manager")
  assert.equal(managerAuth.raw_pin_returned, false)
  assert.equal(managerAuth.pin_hash_returned, false)
  assertNoSecrets(managerAuth)

  const managerToken = managerAuth.session.token
  const policy = await fetchJson(`${baseUrl}/users/access-policy`, {
    token: managerToken,
  })

  assert.equal(policy.status, "ok")
  assert.equal(policy.pin_credentials_returned, false)
  assert.ok(policy.users.some((user) => user.id === "staff-front-counter"))
  assertNoSecrets(policy)

  const createdUser = await fetchJson(`${baseUrl}/users`, {
    method: "POST",
    token: managerToken,
    body: {
      name: "Test Cashier",
      pin: "2468",
      role: "staff",
      access: ["Inventory", "Kiosk", "Queue"],
    },
  })

  assert.equal(createdUser.status, "ok")
  assert.equal(createdUser.user.name, "Test Cashier")
  assert.deepEqual(createdUser.user.access, ["Inventory", "Kiosk", "Queue"])
  assertNoSecrets(createdUser)

  const cashierAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "2468" },
  })

  assert.equal(cashierAuth.status, "ok")
  assert.equal(cashierAuth.user.name, "Test Cashier")
  assert.deepEqual(cashierAuth.user.access, ["Inventory", "Kiosk", "Queue"])

  const inventory = await fetchJson(`${baseUrl}/inventory/search?q=lotus`)
  assert.equal(inventory.status, "ok")
  assert.equal(inventory.items.length, 1)
  assert.equal(inventory.items[0].status, "available")

  const reserve = await fetchJson(`${baseUrl}/inventory/reservations`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      inventory_public_id: inventory.items[0].public_id,
      hold_reason: "staff counter hold",
    },
  })

  assert.equal(reserve.status, "ok")
  assert.equal(reserve.item.status, "reserved")
  assert.equal(reserve.wordpress_acceptance_required, true)

  const duplicateReservation = await fetchJson(`${baseUrl}/inventory/reservations`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      inventory_public_id: inventory.items[0].public_id,
      hold_reason: "second counter hold",
    },
    expectedStatus: 409,
  })

  assert.equal(duplicateReservation.status, "blocked")
  assert.equal(duplicateReservation.code, "inventory_unavailable")

  const kioskInventory = await fetchJson(`${baseUrl}/inventory/search?q=pikachu`)
  const kioskOrder = await fetchJson(`${baseUrl}/kiosk/orders`, {
    method: "POST",
    body: {
      first_name: "Ada",
      last_name: "Lovelace",
      inventory_public_ids: [kioskInventory.items[0].public_id],
    },
  })

  assert.equal(kioskOrder.status, "ok")
  assert.equal(kioskOrder.order.status, "queued")
  assert.equal(kioskOrder.reservations.length, 1)

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)
  assert.equal(syncStatus.status, "ok")
  assert.equal(syncStatus.local_operations_preserved, true)
  assert.ok(syncStatus.queue_depth >= 4)

  console.log("PASS local sync server runtime")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

async function fetchJson(url, options = {}) {
  const headers = {
    "content-type": "application/json",
  }

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await response.json()
  const expectedStatus = options.expectedStatus ?? 200

  assert.equal(response.status, expectedStatus, `${url} returned ${response.status}: ${JSON.stringify(body)}`)

  return body
}

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value)

  assert.equal(serialized.includes("pinHash"), false)
  assert.equal(serialized.includes("pinSalt"), false)
  assert.equal(serialized.includes("1234"), false)
  assert.equal(serialized.includes("9999"), false)
  assert.equal(serialized.includes("2468"), false)
}
