import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const tempDir = await mkdtemp(join(tmpdir(), "pug-local-sync-"))
const databasePath = join(tempDir, "store-sync.sqlite")

try {
  const firstStore = createLocalSyncStore({ databasePath })
  const managerAuth = firstStore.createSession({ pin: "9999" })
  assert.equal(managerAuth.status, "ok")

  const createdUser = firstStore.addUser(managerAuth.session.token, {
    name: "Persistent Cashier",
    pin: "1357",
    role: "staff",
    access: ["Inventory", "Kiosk", "Queue"],
  })
  assert.equal(createdUser.status, "ok")

  const cashierAuth = firstStore.createSession({ pin: "1357" })
  assert.equal(cashierAuth.status, "ok")

  const firstReservation = firstStore.reserveInventory(cashierAuth.session.token, {
    inventory_public_id: "inv-1001",
    hold_reason: "restart persistence check",
  })
  assert.equal(firstReservation.status, "ok")

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
    reason: "restart credit use",
  })
  assert.equal(creditRedemption.status, "ok")
  assert.equal(creditRedemption.customer.credit.balance_minor_units, 1200)

  const firstStatus = firstStore.syncStatus()
  assert.equal(firstStatus.persistence_mode, "sqlite")
  assert.equal(firstStatus.queue_depth, 5)
  firstStore.close()

  const restartedStore = createLocalSyncStore({ databasePath })
  const persistedCashierAuth = restartedStore.createSession({ pin: "1357" })
  assert.equal(persistedCashierAuth.status, "ok")
  assert.equal(persistedCashierAuth.user.name, "Persistent Cashier")

  const persistedInventory = restartedStore.searchInventory({ query: "charizard" })
  assert.equal(persistedInventory.items[0].status, "reserved")
  assert.equal(persistedInventory.items[0].row_version, 2)

  const persistedCustomers = restartedStore.searchCustomers({ query: "persistent.customer@example.test" })
  assert.equal(persistedCustomers.customers.length, 1)
  assert.equal(persistedCustomers.customers[0].credit.balance_minor_units, 1200)

  const duplicateReservation = restartedStore.reserveInventory(persistedCashierAuth.session.token, {
    inventory_public_id: "inv-1001",
    hold_reason: "duplicate after restart",
  })
  assert.equal(duplicateReservation.status, "blocked")
  assert.equal(duplicateReservation.code, "inventory_unavailable")

  const restartedStatus = restartedStore.syncStatus()
  assert.equal(restartedStatus.queue_depth, 5)
  assert.ok(restartedStatus.customer_count >= 4)
  assert.ok(restartedStatus.credit_ledger_entry_count >= 5)
  assert.equal(restartedStatus.local_operations_preserved, true)
  restartedStore.close()

  console.log("PASS local sync server persistence")
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
