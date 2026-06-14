import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

let currentTime = new Date("2026-06-09T14:00:00.000Z")

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://j84.285.myftpupload.com/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath: ":memory:",
    heartbeatTimeoutSeconds: 60,
    now: () => currentTime,
  },
})

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`

  const employeeHeartbeat = await fetchJson(`${baseUrl}/devices/heartbeat`, {
    method: "POST",
    body: {
      device_id: "front-counter-employee",
      device_label: "Front Counter Employee",
      mode: "employee",
      app_version: "0.189.0",
      platform: "windows",
      network_status: "online",
      setup_status: "ready",
      server_url: baseUrl,
      website_url: "https://j84.285.myftpupload.com/",
      capabilities: ["Inventory", "Kiosk", "Queue", "Customers", "Sync", "Status"],
    },
  })

  assert.equal(employeeHeartbeat.status, "ok")
  assert.equal(employeeHeartbeat.online_count, 1)
  assert.equal(employeeHeartbeat.device.credentials_synced_to_client, false)
  assertNoSecrets(employeeHeartbeat)

  const kioskHeartbeat = await fetchJson(`${baseUrl}/devices/heartbeat`, {
    method: "POST",
    body: {
      device_id: "customer-kiosk-01",
      device_label: "Customer Kiosk 01",
      mode: "kiosk",
      app_version: "0.189.0",
      platform: "windows",
      network_status: "online",
      setup_status: "ready",
      server_url: baseUrl,
      website_url: "https://j84.285.myftpupload.com/",
      capabilities: ["Kiosk", "Status"],
    },
  })

  assert.equal(kioskHeartbeat.status, "ok")
  assert.equal(kioskHeartbeat.device_count, 2)
  assert.equal(kioskHeartbeat.online_count, 2)
  assertNoSecrets(kioskHeartbeat)

  const backCounterHeartbeat = await fetchJson(`${baseUrl}/devices/heartbeat`, {
    method: "POST",
    body: {
      device_id: "back-counter-employee",
      device_label: "Back Counter Employee",
      mode: "employee",
      app_version: "0.189.0",
      platform: "windows",
      network_status: "online",
      setup_status: "ready",
      server_url: baseUrl,
      website_url: "https://j84.285.myftpupload.com/",
      capabilities: ["Inventory", "Kiosk", "Queue", "Status"],
    },
  })

  assert.equal(backCounterHeartbeat.status, "ok")
  assert.equal(backCounterHeartbeat.device_count, 3)
  assert.equal(backCounterHeartbeat.online_count, 3)
  assertNoSecrets(backCounterHeartbeat)

  const deviceStatus = await fetchJson(`${baseUrl}/devices/status`)

  assert.equal(deviceStatus.status, "ok")
  assert.equal(deviceStatus.device_count, 3)
  assert.equal(deviceStatus.online_count, 3)
  assert.equal(deviceStatus.offline_count, 0)
  assert.equal(deviceStatus.employee_count, 2)
  assert.equal(deviceStatus.kiosk_count, 1)
  assert.equal(deviceStatus.credentials_synced_to_client, false)
  assertNoSecrets(deviceStatus)

  const staffAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1234", ttlMinutes: 15 },
  })
  assert.equal(staffAuth.status, "ok")
  assert.ok(staffAuth.user.access.includes("Kiosk"))
  assertNoSecrets(staffAuth)

  const managerAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1420", ttlMinutes: 15 },
  })
  assert.equal(managerAuth.status, "ok")
  assert.equal(managerAuth.user.role, "owner")
  assert.ok(managerAuth.user.access.includes("Kiosk"))
  assertNoSecrets(managerAuth)

  const kioskInventory = await fetchJson(`${baseUrl}/inventory/search?q=pikachu`)
  assert.equal(kioskInventory.status, "ok")
  assert.equal(kioskInventory.items.length, 1)
  assert.equal(kioskInventory.items[0].public_id, "inv-1002")
  assert.equal(kioskInventory.items[0].status, "available")
  assert.equal(kioskInventory.items[0].kiosk_visibility, "visible")

  const kioskOrder = await fetchJson(`${baseUrl}/kiosk/orders`, {
    method: "POST",
    body: {
      first_name: "Grace",
      last_name: "Hopper",
      inventory_public_ids: ["inv-1002"],
    },
  })

  assert.equal(kioskOrder.status, "ok")
  assert.equal(kioskOrder.order.first_name, "Grace")
  assert.equal(kioskOrder.order.last_name, "Hopper")
  assert.equal(kioskOrder.order.status, "queued")
  assert.equal(kioskOrder.order.items.length, 1)
  assert.equal(kioskOrder.order.items[0].card_name, "Pikachu")
  assert.equal(kioskOrder.order.items[0].barcode, "PUG-000002")
  assert.equal(kioskOrder.order.items[0].price_minor_units, 3200)
  assert.equal(kioskOrder.order.item_count, 1)
  assert.equal(kioskOrder.order.total_minor_units, 3200)
  assertNoSecrets(kioskOrder)

  const duplicateKioskOrder = await fetchJson(`${baseUrl}/kiosk/orders`, {
    method: "POST",
    expectedStatus: 409,
    body: {
      first_name: "Duplicate",
      last_name: "Pickup",
      inventory_public_ids: ["inv-1002"],
    },
  })

  assert.equal(duplicateKioskOrder.status, "blocked")
  assert.equal(duplicateKioskOrder.code, "inventory_unavailable")

  const employeeQueue = await fetchJson(`${baseUrl}/kiosk/orders?limit=10`, {
    token: staffAuth.session.token,
  })

  assert.equal(employeeQueue.status, "ok")
  assert.equal(employeeQueue.shared_queue_source, "local_sync_server")
  assert.equal(employeeQueue.credentials_synced_to_client, false)
  assert.equal(employeeQueue.order_count, 1)
  assert.equal(employeeQueue.orders[0].order_id, kioskOrder.order.order_id)
  assert.equal(employeeQueue.orders[0].status, "queued")
  assert.equal(employeeQueue.orders[0].items[0].public_id, "inv-1002")
  assertNoSecrets(employeeQueue)

  const employeeStatusUpdate = await fetchJson(
    `${baseUrl}/kiosk/orders/${encodeURIComponent(kioskOrder.order.order_id)}/status`,
    {
      method: "PATCH",
      token: staffAuth.session.token,
      body: { status: "pulling" },
    },
  )

  assert.equal(employeeStatusUpdate.status, "ok")
  assert.equal(employeeStatusUpdate.order.status, "pulling")
  assert.equal(employeeStatusUpdate.inventory_mutation_performed, false)
  assert.equal(employeeStatusUpdate.wordpress_status_sync_deferred, true)
  assertNoSecrets(employeeStatusUpdate)

  const secondEmployeeQueue = await fetchJson(`${baseUrl}/kiosk/orders?status=pulling`, {
    token: managerAuth.session.token,
  })

  assert.equal(secondEmployeeQueue.status, "ok")
  assert.equal(secondEmployeeQueue.order_count, 1)
  assert.equal(secondEmployeeQueue.orders[0].order_id, kioskOrder.order.order_id)
  assert.equal(secondEmployeeQueue.orders[0].status, "pulling")
  assert.equal(secondEmployeeQueue.orders[0].items[0].card_name, "Pikachu")
  assert.equal(secondEmployeeQueue.orders[0].updated_at_utc, "2026-06-09T14:00:00.000Z")
  assertNoSecrets(secondEmployeeQueue)

  currentTime = new Date("2026-06-09T14:01:05.000Z")

  const staleDeviceStatus = await fetchJson(`${baseUrl}/devices/status`)

  assert.equal(staleDeviceStatus.status, "ok")
  assert.equal(staleDeviceStatus.device_count, 3)
  assert.equal(staleDeviceStatus.online_count, 0)
  assert.equal(staleDeviceStatus.offline_count, 3)
  assert.equal(staleDeviceStatus.setup_ready_count, 3)
  assertNoSecrets(staleDeviceStatus)

  const refreshedEmployee = await fetchJson(`${baseUrl}/devices/heartbeat`, {
    method: "POST",
    body: {
      device_id: "front-counter-employee",
      mode: "employee",
      network_status: "online",
      setup_status: "ready",
      server_url: baseUrl,
      website_url: "https://j84.285.myftpupload.com/",
    },
  })

  assert.equal(refreshedEmployee.status, "ok")
  assert.equal(refreshedEmployee.device_count, 3)
  assert.equal(refreshedEmployee.online_count, 1)
  assert.equal(refreshedEmployee.offline_count, 2)
  assert.equal(refreshedEmployee.device.first_seen_at_utc, "2026-06-09T14:00:00.000Z")
  assert.equal(refreshedEmployee.device.last_seen_at_utc, "2026-06-09T14:01:05.000Z")
  assertNoSecrets(refreshedEmployee)

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)

  assert.equal(syncStatus.status, "ok")
  assert.equal(syncStatus.client_device_count, 3)
  assert.equal(syncStatus.online_client_device_count, 1)
  assert.equal(syncStatus.offline_client_device_count, 2)
  assert.equal(syncStatus.kiosk_order_count, 1)
  assert.equal(syncStatus.active_session_count, 2)
  assertNoSecrets(syncStatus)

  console.log("PASS local sync server multi-client")
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
  assert.equal(serialized.includes('"pin":'), false)
  assert.equal(serialized.includes('"raw_pin"'), false)
  assert.equal(serialized.includes('"pin_hash"'), false)
  assert.equal(serialized.includes('"pin_salt"'), false)
  assert.equal(serialized.includes("api_key"), false)
  assert.equal(serialized.includes("X-Api-Key"), false)
  assert.equal(serialized.includes("private_key"), false)
  assert.equal(serialized.includes("applicationPassword"), false)
}
