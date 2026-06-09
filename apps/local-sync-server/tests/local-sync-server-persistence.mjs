import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const tempDir = await mkdtemp(join(tmpdir(), "pug-local-sync-"))
const databasePath = join(tempDir, "store-sync.sqlite")
let currentTime = new Date("2026-06-09T12:00:00.000Z")
const now = () => currentTime

try {
  const firstStore = createLocalSyncStore({ databasePath, now, heartbeatTimeoutSeconds: 90 })
  const managerAuth = firstStore.createSession({ pin: "9999" })
  assert.equal(managerAuth.status, "ok")

  const setupConfig = firstStore.updateSetupConfig(managerAuth.session.token, {
    store_id: "the-pug",
    server_url: "http://192.168.1.20:8787",
    website_url: "https://cards.example.test/",
    rest_base_path: "/wp-json/tcg-store/v1",
  })
  assert.equal(setupConfig.status, "ok")
  assert.equal(setupConfig.config.website_url, "https://cards.example.test/")
  assert.equal(setupConfig.config.wordpress_connector_restart_required, true)

  const createdUser = firstStore.addUser(managerAuth.session.token, {
    name: "Persistent Cashier",
    pin: "1357",
    role: "staff",
    access: ["Inventory", "Kiosk", "Queue"],
  })
  assert.equal(createdUser.status, "ok")

  const cashierAuth = firstStore.createSession({ pin: "1357" })
  assert.equal(cashierAuth.status, "ok")

  const firstHeartbeat = firstStore.recordDeviceHeartbeat({
    device_id: "front-counter-01",
    device_label: "Front Counter 01",
    mode: "employee",
    app_version: "0.2.0",
    platform: "windows",
    network_status: "online",
    setup_status: "ready",
    server_url: "http://127.0.0.1:8787",
    website_url: "https://vbf.2a7.myftpupload.com/",
    capabilities: ["Inventory", "Customers", "Sync", "Status"],
  })
  assert.equal(firstHeartbeat.status, "ok")
  assert.equal(firstHeartbeat.device.connection_status, "online")
  assert.equal(firstHeartbeat.device.setup_status, "ready")

  const firstReservation = firstStore.reserveInventory(cashierAuth.session.token, {
    inventory_public_id: "inv-1001",
    hold_reason: "restart persistence check",
  })
  assert.equal(firstReservation.status, "ok")

  const intake = await firstStore.createInventoryIntake(cashierAuth.session.token, {
    card_name: "Persistent Dragonite",
    set_name: "Fossil",
    condition: "LP",
    barcode: "PUG-PERSIST-DRAGONITE",
    price_minor_units: 8800,
    location: "Restart Bin",
    online_visibility: "staff_only",
    kiosk_visibility: "visible",
    pos_visibility: "hidden",
  })
  assert.equal(intake.status, "ok")
  assert.equal(intake.item.status, "pending_intake")
  assert.equal(intake.item.online_visibility, "staff_only")
  assert.equal(intake.item.kiosk_visibility, "visible")
  assert.equal(intake.item.pos_visibility, "hidden")

  const createdCustomer = firstStore.createCustomer(managerAuth.session.token, {
    first_name: "Persistent",
    last_name: "Customer",
    email: "persistent.customer@example.test",
  })
  assert.equal(createdCustomer.status, "ok")

  const creditAdjustment = firstStore.createCreditAdjustment(managerAuth.session.token, {
    customer_public_id: createdCustomer.customer.customer_public_id,
    amount_minor_units: 2000,
    reason: "restart credit add",
  })
  assert.equal(creditAdjustment.status, "ok")

  const creditRedemption = firstStore.createCreditRedemption(managerAuth.session.token, {
    customer_public_id: createdCustomer.customer.customer_public_id,
    amount_minor_units: 800,
    sale_total_minor_units: 3000,
    square_receipt_reference: "SQ-PERSIST-1001",
    square_cashier_confirmed: true,
    reason: "restart credit use",
  })
  assert.equal(creditRedemption.status, "ok")
  assert.equal(creditRedemption.customer.credit.balance_minor_units, 1200)

  const eventRegistration = firstStore.createEventRegistration(managerAuth.session.token, {
    event_id: "event-100",
    attendee_label: "Persistent Event Guest",
    payment_status: "not_required",
  })
  assert.equal(eventRegistration.status, "ok")
  assert.equal(eventRegistration.event.registered_count, 11)

  const firstStatus = firstStore.syncStatus()
  assert.equal(firstStatus.persistence_mode, "sqlite")
  assert.equal(firstStatus.queue_depth, 6)
  assert.equal(firstStatus.client_device_count, 1)
  assert.equal(firstStatus.online_client_device_count, 1)
  assert.ok(firstStatus.reference_card_count >= 5)
  firstStore.close()

  currentTime = new Date("2026-06-09T12:02:01.000Z")
  const restartedStore = createLocalSyncStore({ databasePath, now, heartbeatTimeoutSeconds: 90 })
  const persistedSetupConfig = restartedStore.getSetupConfig()
  assert.equal(persistedSetupConfig.website_url, "https://cards.example.test/")
  assert.equal(persistedSetupConfig.wordpress_rest_base, "https://cards.example.test/wp-json/tcg-store/v1")
  assert.equal(persistedSetupConfig.config_source, "manager_app_settings")
  assert.equal(persistedSetupConfig.wordpress_connector_restart_required, true)

  const persistedCashierAuth = restartedStore.createSession({ pin: "1357" })
  assert.equal(persistedCashierAuth.status, "ok")
  assert.equal(persistedCashierAuth.user.name, "Persistent Cashier")

  const persistedInventory = restartedStore.searchInventory({ query: "charizard" })
  assert.equal(persistedInventory.items[0].status, "reserved")
  assert.equal(persistedInventory.items[0].row_version, 2)

  const persistedIntake = restartedStore.searchInventory({ query: "dragonite" })
  assert.equal(persistedIntake.items.length, 1)
  assert.equal(persistedIntake.items[0].status, "pending_intake")
  assert.equal(persistedIntake.items[0].source, "queued")
  assert.equal(persistedIntake.items[0].online_visibility, "staff_only")
  assert.equal(persistedIntake.items[0].kiosk_visibility, "visible")
  assert.equal(persistedIntake.items[0].pos_visibility, "hidden")

  const persistedCustomers = restartedStore.searchCustomers({ query: "persistent.customer@example.test" })
  assert.equal(persistedCustomers.customers.length, 1)
  assert.equal(persistedCustomers.customers[0].credit.balance_minor_units, 1200)

  const persistedEvents = restartedStore.listEvents()
  const persistedEvent = persistedEvents.events.find((event) => event.event_id === "event-100")
  assert.equal(persistedEvent.registered_count, 11)
  assert.equal(persistedEvent.source, "queued")

  const persistedDeviceStatus = restartedStore.deviceStatus()
  assert.equal(persistedDeviceStatus.device_count, 1)
  assert.equal(persistedDeviceStatus.online_count, 0)
  assert.equal(persistedDeviceStatus.offline_count, 1)
  assert.equal(persistedDeviceStatus.devices[0].device_id, "front-counter-01")
  assert.equal(persistedDeviceStatus.devices[0].connection_status, "offline")
  assert.equal(persistedDeviceStatus.devices[0].setup_status, "ready")

  const restartedHeartbeat = restartedStore.recordDeviceHeartbeat({
    device_id: "front-counter-01",
    mode: "employee",
    network_status: "online",
    setup_status: "ready",
  })
  assert.equal(restartedHeartbeat.status, "ok")
  assert.equal(restartedHeartbeat.online_count, 1)
  assert.equal(restartedHeartbeat.device.first_seen_at_utc, "2026-06-09T12:00:00.000Z")
  assert.equal(restartedHeartbeat.device.last_seen_at_utc, "2026-06-09T12:02:01.000Z")

  const duplicateReservation = restartedStore.reserveInventory(persistedCashierAuth.session.token, {
    inventory_public_id: "inv-1001",
    hold_reason: "duplicate after restart",
  })
  assert.equal(duplicateReservation.status, "blocked")
  assert.equal(duplicateReservation.code, "inventory_unavailable")

  const restartedStatus = restartedStore.syncStatus()
  assert.equal(restartedStatus.queue_depth, 6)
  assert.equal(restartedStatus.client_device_count, 1)
  assert.equal(restartedStatus.online_client_device_count, 1)
  assert.ok(restartedStatus.reference_card_count >= 5)
  assert.ok(restartedStatus.customer_count >= 4)
  assert.ok(restartedStatus.credit_ledger_entry_count >= 5)
  assert.ok(restartedStatus.event_count >= 2)
  assert.equal(restartedStatus.local_operations_preserved, true)
  restartedStore.close()

  console.log("PASS local sync server persistence")
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
