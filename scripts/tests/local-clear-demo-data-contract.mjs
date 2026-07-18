import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..", "..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const script = await readFile(path.join(root, "scripts/local-clear-card-inventory-and-queues.mjs"), "utf8")
const workspaceSource = await readFile(
  path.join(root, "apps/offline-app/src/data/offlineWorkspace.ts"),
  "utf8",
)

assert.equal(
  packageJson.scripts["local-sync:clear-demo-data"],
  "node scripts/local-clear-card-inventory-and-queues.mjs",
)

for (const marker of [
  "store-sync-before-live-inventory",
  "inventory_items",
  "operation_queue",
  "kiosk_orders",
  "fulfillment_orders",
  "reference_cards",
  "credit_ledger_entries",
  "credentialsPrinted: false",
]) {
  assert.ok(script.includes(marker), `Missing local clear marker: ${marker}`)
}

for (const marker of [
  '{ label: "Queued writes", value: "0" }',
  '{ label: "Cached cards", value: "0" }',
  '{ label: "Open conflicts", value: "0" }',
  "inventoryItems: []",
  "queueItems: []",
  "conflicts: []",
]) {
  assert.ok(workspaceSource.includes(marker), `Missing clean seed marker: ${marker}`)
}

for (const forbidden of ["PKM-BASE-004-HOLO", "Mox Amber location mismatch"]) {
  assert.equal(workspaceSource.includes(forbidden), false, `Demo seed marker still present: ${forbidden}`)
}

console.log("PASS local clear demo data contract")
