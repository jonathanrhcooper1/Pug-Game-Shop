import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL, fileURLToPath } from "node:url"
import ts from "typescript"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const workspacePath = path.join(appRoot, "src/data/offlineWorkspace.ts")
const workspaceSource = await readFile(workspacePath, "utf8")
const compiledWorkspace = ts.transpileModule(workspaceSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: workspacePath,
})

const tempDir = await mkdtemp(path.join(os.tmpdir(), "pug-offline-workspace-"))

try {
  const modulePath = path.join(tempDir, "offlineWorkspace.mjs")
  await writeFile(modulePath, compiledWorkspace.outputText, "utf8")

  const { applyOfflinePullInventoryRecordsToCache } = await import(pathToFileURL(modulePath))
  const existingItems = [
    {
      id: 7,
      publicId: "inv-1001",
      rowVersion: 10,
      cardName: "Charizard",
      setName: "Base Set",
      number: "4/102",
      condition: "NM",
      barcode: "PKM-BASE-004-HOLO",
      price: "$125.00",
      priceMinorUnits: 12500,
      currency: "USD",
      location: "Case A3",
      status: "available",
      source: "cached",
    },
  ]
  const result = applyOfflinePullInventoryRecordsToCache(existingItems, [
    {
      public_id: "inv-1001",
      row_version: 9,
      card_name: "Stale Charizard",
      set_name: "Base Set",
      card_number: "4/102",
      condition: "DMG",
      barcode: "STALE",
      sale_price_minor_units: 1,
      sale_currency: "USD",
      location_label: "Old Case",
      status: "conflict",
      updated_at_utc: "2026-06-08T12:00:00Z",
    },
    {
      public_id: "inv-1001",
      row_version: 11,
      card_name: "Charizard",
      set_name: "Base Set",
      card_number: "4/102",
      condition: "LP",
      barcode: "PKM-BASE-004-HOLO",
      sale_price_minor_units: 11900,
      sale_currency: "USD",
      location_label: "Case B1",
      status: "reserved",
      updated_at_utc: "2026-06-08T12:05:00Z",
    },
    {
      public_id: "inv-2002",
      row_version: 1,
      card_name: "Pikachu",
      set_name: "Jungle",
      card_number: "60/64",
      condition: "LP",
      barcode: "PKM-JGL-060-YLW",
      sale_price_minor_units: 1800,
      sale_currency: "USD",
      location_label: "Binder 2",
      status: "available",
      updated_at_utc: "2026-06-08T12:10:00Z",
    },
    {
      public_id: "inv-invalid-currency",
      row_version: 1,
      card_name: "Invalid Currency",
      set_name: "Test",
      card_number: "1",
      condition: "NM",
      barcode: "BAD-CURRENCY",
      sale_price_minor_units: 200,
      sale_currency: "EUR",
      location_label: "Ignored",
      status: "available",
      updated_at_utc: "2026-06-08T12:15:00Z",
    },
  ])

  assert.equal(result.appliedCount, 2)
  assert.equal(result.insertedCount, 1)
  assert.equal(result.updatedCount, 1)
  assert.equal(result.ignoredCount, 1)
  assert.deepEqual(result.changedPublicIds, ["inv-1001", "inv-2002"])
  assert.equal(result.items.length, 2)

  const updatedItem = result.items.find((item) => item.publicId === "inv-1001")
  assert.equal(updatedItem.rowVersion, 11)
  assert.equal(updatedItem.condition, "LP")
  assert.equal(updatedItem.price, "$119.00")
  assert.equal(updatedItem.location, "Case B1")
  assert.equal(updatedItem.status, "reserved")
  assert.equal(updatedItem.source, "accepted")

  const insertedItem = result.items.find((item) => item.publicId === "inv-2002")
  assert.equal(insertedItem.id, 8)
  assert.equal(insertedItem.cardName, "Pikachu")
  assert.equal(insertedItem.priceMinorUnits, 1800)
  assert.equal(insertedItem.source, "accepted")
} finally {
  await rm(tempDir, { force: true, recursive: true })
}

console.log("PASS offline app pull inventory cache contract")
