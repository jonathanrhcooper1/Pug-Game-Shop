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
  await rm(tempDir, { recursive: true, force: true })
}

console.log("PASS local sync inventory quantity update")
