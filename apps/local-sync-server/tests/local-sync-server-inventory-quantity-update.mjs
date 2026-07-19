import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const tempDir = await mkdtemp(join(tmpdir(), "pug-local-sync-quantity-"))
const databasePath = join(tempDir, "store-sync.sqlite")
let currentTime = new Date("2026-06-24T12:00:00.000Z")
const now = () => currentTime

try {
  const firstStore = createLocalSyncStore({
    databasePath,
    now,
    seedDemoInventory: true,
  })
  const managerAuth = firstStore.createSession({ pin: "9999" })
  assert.equal(managerAuth.status, "ok")

  const absoluteUpdate = await firstStore.updateInventoryItem(managerAuth.session.token, "inv-1001", {
    set_quantity: 5,
    reason: "absolute shelf count",
  })
  assert.equal(absoluteUpdate.status, "ok")
  assert.equal(absoluteUpdate.quantity_update_mode, "absolute")
  assert.equal(absoluteUpdate.previous_quantity_on_hand, 1)
  assert.equal(absoluteUpdate.quantity_on_hand, 5)
  assert.equal(absoluteUpdate.quantity_delta, 4)
  assert.equal(absoluteUpdate.item.quantity_on_hand, 5)

  currentTime = new Date("2026-06-24T12:05:00.000Z")
  const deltaUpdate = await firstStore.updateInventoryItem(managerAuth.session.token, "inv-1001", {
    quantityDelta: -2,
    reason: "sold through manual count",
  })
  assert.equal(deltaUpdate.status, "ok")
  assert.equal(deltaUpdate.quantity_update_mode, "delta")
  assert.equal(deltaUpdate.previous_quantity_on_hand, 5)
  assert.equal(deltaUpdate.quantity_on_hand, 3)
  assert.equal(deltaUpdate.quantity_delta, -2)
  assert.equal(deltaUpdate.item.quantity_on_hand, 3)

  const stackedIntake = await firstStore.createInventoryIntake(managerAuth.session.token, {
    card_name: "Stacked Quantity Test",
    set_name: "Regression Set",
    condition: "NM",
    barcode: "PUG-STACK",
    price_minor_units: 500,
    quantity: 5,
  })
  assert.equal(stackedIntake.status, "ok")
  assert.equal(stackedIntake.quantity_added, 5)
  assert.equal(stackedIntake.items.every((item) => item.barcode.length <= 13), true)
  assert.deepEqual(stackedIntake.items.map((item) => item.barcode), [
    "PUG-STACK1",
    "PUG-STACK2",
    "PUG-STACK3",
    "PUG-STACK4",
    "PUG-STACK5",
  ])

  const longBarcodeIntake = await firstStore.createInventoryIntake(managerAuth.session.token, {
    card_name: "Too Long Barcode Test",
    set_name: "Regression Set",
    condition: "NM",
    barcode: "PUG-07D72CB7-01",
    price_minor_units: 500,
  })
  assert.equal(longBarcodeIntake.status, "blocked")
  assert.equal(longBarcodeIntake.code, "barcode_too_long_for_scanner")

  for (const item of stackedIntake.items) {
    const activate = await firstStore.updateInventoryItem(managerAuth.session.token, item.public_id, {
      status: "available",
      set_quantity: 1,
      reason: "activate duplicate-count regression fixture",
    })
    assert.equal(activate.status, "ok")
  }

  const stackedBefore = firstStore.searchInventory("Stacked Quantity Test")
  assert.equal(stackedBefore.status, "ok")
  assert.equal(
    stackedBefore.items
      .filter((item) => item.card_name === "Stacked Quantity Test")
      .filter((item) => item.status === "available")
      .reduce((total, item) => total + item.quantity_on_hand, 0),
    5,
  )

  const groupedAbsoluteUpdate = await firstStore.updateInventoryItem(
    managerAuth.session.token,
    stackedBefore.items.find((item) => item.card_name === "Stacked Quantity Test" && item.status === "available").public_id,
    {
      status: "available",
      set_quantity: 6,
      consolidate_inventory_group: true,
      reason: "set shelf count to six",
    },
  )
  assert.equal(groupedAbsoluteUpdate.status, "ok")
  assert.equal(groupedAbsoluteUpdate.quantity_update_mode, "absolute")
  assert.equal(groupedAbsoluteUpdate.previous_quantity_on_hand, 5)
  assert.equal(groupedAbsoluteUpdate.quantity_on_hand, 6)
  assert.equal(groupedAbsoluteUpdate.quantity_delta, 1)
  assert.equal(groupedAbsoluteUpdate.consolidated_count, 4)
  assert.equal(groupedAbsoluteUpdate.consolidated_items.length, 4)
  assert.equal(groupedAbsoluteUpdate.consolidated_items.every((item) => item.status === "removed"), true)
  assert.equal(groupedAbsoluteUpdate.consolidated_items.every((item) => item.quantity_on_hand === 0), true)

  const statusOnlyRemoval = await firstStore.updateInventoryItem(managerAuth.session.token, "inv-1002", {
    status: "removed",
    reason: "staff removed from saleable inventory",
  })
  assert.equal(statusOnlyRemoval.status, "ok")
  assert.equal(statusOnlyRemoval.quantity_update_mode, "absolute")
  assert.equal(statusOnlyRemoval.previous_quantity_on_hand, 1)
  assert.equal(statusOnlyRemoval.quantity_on_hand, 0)
  assert.equal(statusOnlyRemoval.quantity_delta, -1)
  assert.equal(statusOnlyRemoval.item.status, "removed")
  assert.equal(statusOnlyRemoval.item.quantity_on_hand, 0)

  const zeroQuantityIntake = await firstStore.createInventoryIntake(managerAuth.session.token, {
    card_name: "Zero Quantity Removal Test",
    set_name: "Regression Set",
    condition: "NM",
    barcode: "PUG-ZERO-QTY",
    price_minor_units: 500,
    quantity: 1,
  })
  assert.equal(zeroQuantityIntake.status, "ok")

  const activateZeroQuantityFixture = await firstStore.updateInventoryItem(
    managerAuth.session.token,
    zeroQuantityIntake.item.public_id,
    {
      status: "available",
      set_quantity: 1,
      reason: "activate zero-count regression fixture",
    },
  )
  assert.equal(activateZeroQuantityFixture.status, "ok")

  const quantityToZeroRemoval = await firstStore.updateInventoryItem(managerAuth.session.token, zeroQuantityIntake.item.public_id, {
    quantity_delta: -1,
    reason: "staff counted shelf to zero",
  })
  assert.equal(quantityToZeroRemoval.status, "ok")
  assert.equal(quantityToZeroRemoval.quantity_update_mode, "delta")
  assert.equal(quantityToZeroRemoval.previous_quantity_on_hand, 1)
  assert.equal(quantityToZeroRemoval.quantity_on_hand, 0)
  assert.equal(quantityToZeroRemoval.quantity_delta, -1)
  assert.equal(quantityToZeroRemoval.item.status, "removed")
  assert.equal(quantityToZeroRemoval.item.quantity_on_hand, 0)
  assert.equal(quantityToZeroRemoval.item.online_visibility, "hidden")
  assert.equal(quantityToZeroRemoval.item.kiosk_visibility, "hidden")
  assert.equal(quantityToZeroRemoval.item.pos_visibility, "hidden")

  const quantityFromZeroRestore = await firstStore.updateInventoryItem(managerAuth.session.token, zeroQuantityIntake.item.public_id, {
    set_quantity: 1,
    reason: "staff found one copy on shelf",
  })
  assert.equal(quantityFromZeroRestore.status, "ok")
  assert.equal(quantityFromZeroRestore.quantity_update_mode, "absolute")
  assert.equal(quantityFromZeroRestore.previous_quantity_on_hand, 0)
  assert.equal(quantityFromZeroRestore.quantity_on_hand, 1)
  assert.equal(quantityFromZeroRestore.quantity_delta, 1)
  assert.equal(quantityFromZeroRestore.item.status, "available")
  assert.equal(quantityFromZeroRestore.item.quantity_on_hand, 1)
  assert.equal(quantityFromZeroRestore.item.online_visibility, "visible")
  assert.equal(quantityFromZeroRestore.item.kiosk_visibility, "visible")
  assert.equal(quantityFromZeroRestore.item.pos_visibility, "visible")

  const stackedAfter = firstStore.searchInventory("Stacked Quantity Test")
  assert.equal(stackedAfter.status, "ok")
  assert.equal(
    stackedAfter.items
      .filter((item) => item.card_name === "Stacked Quantity Test")
      .filter((item) => item.status === "available")
      .reduce((total, item) => total + item.quantity_on_hand, 0),
    6,
  )

  const ambiguousUpdate = await firstStore.updateInventoryItem(managerAuth.session.token, "inv-1001", {
    quantity_on_hand: 4,
    quantity_delta: 1,
    reason: "ambiguous count",
  })
  assert.equal(ambiguousUpdate.status, "blocked")
  assert.equal(ambiguousUpdate.code, "inventory_quantity_update_ambiguous")

  firstStore.close()

  const secondStore = createLocalSyncStore({
    databasePath,
    now,
    seedDemoInventory: true,
  })
  const persistedSearch = secondStore.searchInventory("charizard")
  assert.equal(persistedSearch.status, "ok")
  assert.equal(persistedSearch.items[0].quantity_on_hand, 3)
  secondStore.close()
} finally {
  try {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch (error) {
    if (error?.code !== "EBUSY") {
      throw error
    }
  }
}

console.log("PASS local sync inventory quantity update")
