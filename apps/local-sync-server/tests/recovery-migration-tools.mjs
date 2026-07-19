import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"
import {
  isPrintableScannerBarcode,
  planBarcodeAliasMigration,
} from "../tools/lib/barcode-alias-migration.mjs"
import { parseRecoveryCliArgs } from "../tools/lib/recovery-common.mjs"
import {
  expectedTradeInventoryIdentity,
  planTradeReconciliation,
} from "../tools/lib/trade-reconciliation.mjs"

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const tempDirectory = await mkdtemp(join(tmpdir(), "pug-recovery-tools-"))

try {
  assert.throws(() => parseRecoveryCliArgs([]), (error) => error.code === "recovery_mode_required")
  assert.throws(
    () => parseRecoveryCliArgs(["--dry-run", "--apply"]),
    (error) => error.code === "recovery_mode_required",
  )
  assert.equal(parseRecoveryCliArgs(["--dry-run"]).mode, "dry-run")
  assert.equal(parseRecoveryCliArgs(["--apply"]).mode, "apply")
  assert.equal(isPrintableScannerBarcode(" SAFE0001 "), false)

  await testTradeReconciliationCli()
  await testBarcodeAliasMigrationCli()

  console.log("PASS recovery migration tools")
} finally {
  await rm(tempDirectory, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
}

async function testTradeReconciliationCli() {
  const databasePath = join(tempDirectory, "trade-recovery.sqlite")
  const dryReportPath = join(tempDirectory, "trade-dry-run.json")
  const applyReportPath = join(tempDirectory, "trade-apply.json")
  const now = () => new Date("2026-07-18T18:00:00.000Z")
  const store = createLocalSyncStore({
    databasePath,
    now,
    seedDemoData: true,
    seedDemoInventory: true,
  })
  const auth = store.createSession({ pin: "9999" })
  assert.equal(auth.status, "ok")

  const created = store.createTradeInOrder(auth.session.token, {
    customer_name: "Recovery Fixture",
    items: [
      {
        id: "repair-line-1",
        product_type: "raw",
        card_name: "Recovery Test Card",
        set_name: "Recovery Set",
        condition: "NM",
        market_mid_minor_units: 2500,
        trade_in_percentage_basis_points: 6000,
        payout_type: "cash",
        quantity: 2,
      },
    ],
  })
  assert.equal(created.status, "ok")
  const approved = store.updateTradeInOrderStatus(auth.session.token, created.order.order_id, {
    status: "approved",
    customer_id_number: "TN-RECOVERY-100",
    customer_id_state: "TN",
  })
  assert.equal(approved.status, "ok")
  assert.equal(approved.inventory_creation.created_count, 2)
  store.close()

  const firstIdentity = expectedTradeInventoryIdentity(created.order.order_id, "repair-line-1", 1)
  const secondIdentity = expectedTradeInventoryIdentity(created.order.order_id, "repair-line-1", 2)
  const corrupt = new DatabaseSync(databasePath)
  corrupt.prepare("DELETE FROM operation_queue WHERE entity_id = ?").run(secondIdentity.public_id)
  corrupt.prepare("DELETE FROM inventory_ledger_entries WHERE inventory_public_id = ?").run(secondIdentity.public_id)
  corrupt.prepare("DELETE FROM inventory_items WHERE public_id = ?").run(secondIdentity.public_id)
  corrupt.prepare("UPDATE inventory_items SET quantity_on_hand = 4 WHERE public_id = ?").run(firstIdentity.public_id)
  corrupt
    .prepare("UPDATE trade_in_orders SET inventory_public_ids_json = ? WHERE order_id = ?")
    .run(JSON.stringify([firstIdentity.public_id, "inv-1001"]), created.order.order_id)
  const beforePlan = planTradeReconciliation(corrupt)
  assert.equal(beforePlan.status, "ok")
  assert.equal(beforePlan.summary.inventory_rows_to_create, 1)
  assert.equal(beforePlan.summary.planned_quantity_add, 1)
  assert.equal(beforePlan.summary.planned_quantity_decrease, 0)
  assert.deepEqual(beforePlan.orders[0].legacy_inventory_public_ids_preserved, ["inv-1001"])
  corrupt.close()

  const dryRun = runCli("tools/reconcile-trade-inventory.mjs", [
    "--dry-run",
    "--database",
    databasePath,
    "--report",
    dryReportPath,
  ])
  assert.equal(dryRun.status, 0, dryRun.stderr)
  const dryReport = readJson(dryReportPath)
  assert.equal(dryReport.mode, "dry-run")
  assert.equal(dryReport.summary.inventory_rows_to_create, 1)
  assert.equal(dryReport.backup.status, "not_requested")

  const afterDry = new DatabaseSync(databasePath, { readOnly: true })
  assert.equal(
    afterDry.prepare("SELECT COUNT(*) AS count FROM inventory_items WHERE public_id = ?").get(secondIdentity.public_id).count,
    0,
  )
  assert.equal(
    afterDry.prepare("SELECT quantity_on_hand FROM inventory_items WHERE public_id = ?").get(firstIdentity.public_id)
      .quantity_on_hand,
    4,
  )
  afterDry.close()

  const apply = runCli("tools/reconcile-trade-inventory.mjs", [
    "--apply",
    "--database",
    databasePath,
    "--report",
    applyReportPath,
  ])
  assert.equal(apply.status, 0, apply.stderr)
  const applyReport = readJson(applyReportPath)
  assert.equal(applyReport.mode, "apply")
  assert.equal(applyReport.applied.inventory_rows_created, 1)
  assert.equal(applyReport.applied.ledger_entries_backfilled, 1)
  assert.equal(applyReport.applied.quantity_added, 1)
  assert.equal(applyReport.applied.quantity_decreased, 0)
  assert.equal(applyReport.verification.changes_remaining, 0)
  assert.equal(existsSync(applyReport.backup.backup_path), true)

  const repaired = new DatabaseSync(databasePath, { readOnly: true })
  assert.equal(
    repaired.prepare("SELECT quantity_on_hand FROM inventory_items WHERE public_id = ?").get(firstIdentity.public_id)
      .quantity_on_hand,
    4,
  )
  assert.equal(
    repaired.prepare("SELECT quantity_on_hand FROM inventory_items WHERE public_id = ?").get(secondIdentity.public_id)
      .quantity_on_hand,
    1,
  )
  const repairedLinks = JSON.parse(
    repaired.prepare("SELECT inventory_public_ids_json FROM trade_in_orders WHERE order_id = ?").get(created.order.order_id)
      .inventory_public_ids_json,
  )
  assert.ok(repairedLinks.includes(firstIdentity.public_id))
  assert.ok(repairedLinks.includes(secondIdentity.public_id))
  assert.ok(repairedLinks.includes("inv-1001"))
  assert.equal(
    repaired
      .prepare("SELECT COUNT(*) AS count FROM inventory_ledger_entries WHERE idempotency_key = ?")
      .get(`trade-accept:${created.order.order_id}:repair-line-1:2`).count,
    1,
  )
  const repairedOperation = repaired
    .prepare("SELECT operation_id FROM operation_queue WHERE entity_id = ? AND operation_type = 'inventory_intake'")
    .get(secondIdentity.public_id)
  assert.ok(repairedOperation.operation_id)
  assert.equal(
    repaired.prepare("SELECT aggregate_type FROM sync_outbox_events WHERE idempotency_key = ?").get(repairedOperation.operation_id)
      .aggregate_type,
    "inventory",
  )
  repaired.close()
}

async function testBarcodeAliasMigrationCli() {
  const databasePath = join(tempDirectory, "barcode-recovery.sqlite")
  const dryReportPath = join(tempDirectory, "barcode-dry-run.json")
  const applyReportPath = join(tempDirectory, "barcode-apply.json")
  const store = createLocalSyncStore({
    databasePath,
    now: () => new Date("2026-07-18T19:00:00.000Z"),
    seedDemoInventory: true,
  })
  store.close()

  const prepare = new DatabaseSync(databasePath)
  const rows = prepare.prepare("SELECT public_id FROM inventory_items ORDER BY public_id").all()
  rows.forEach((row, index) => {
    prepare.prepare("UPDATE inventory_items SET barcode = ? WHERE public_id = ?").run(
      `SAFE${String(index + 1).padStart(4, "0")}`,
      row.public_id,
    )
  })
  prepare
    .prepare("UPDATE inventory_items SET barcode = ?, quantity_on_hand = 7 WHERE public_id = 'inv-1001'")
    .run("PUG-LEGACY-BARCODE-000001")

  const collisionPlan = planBarcodeAliasMigration(prepare, { aliasFactory: () => "SAFE0002" })
  assert.equal(collisionPlan.status, "blocked")
  assert.ok(collisionPlan.blockers.some((blocker) => blocker.code === "barcode_alias_collides_with_existing_barcode"))
  assert.equal(
    prepare.prepare("SELECT barcode FROM inventory_items WHERE public_id = 'inv-1001'").get().barcode,
    "PUG-LEGACY-BARCODE-000001",
  )
  const quantitySnapshot = new Map(
    prepare
      .prepare("SELECT public_id, quantity_on_hand FROM inventory_items")
      .all()
      .map((row) => [row.public_id, row.quantity_on_hand]),
  )
  prepare.close()

  const dryRun = runCli("tools/migrate-barcode-aliases.mjs", [
    "--dry-run",
    "--database",
    databasePath,
    "--report",
    dryReportPath,
  ])
  assert.equal(dryRun.status, 0, dryRun.stderr)
  const dryReport = readJson(dryReportPath)
  assert.equal(dryReport.mode, "dry-run")
  assert.equal(dryReport.summary.barcode_aliases_to_apply, 1)
  assert.equal(dryReport.mappings[0].original_barcode, "PUG-LEGACY-BARCODE-000001")

  const afterDry = new DatabaseSync(databasePath, { readOnly: true })
  assert.equal(afterDry.prepare("SELECT barcode FROM inventory_items WHERE public_id = 'inv-1001'").get().barcode, "PUG-LEGACY-BARCODE-000001")
  afterDry.close()

  const apply = runCli("tools/migrate-barcode-aliases.mjs", [
    "--apply",
    "--database",
    databasePath,
    "--report",
    applyReportPath,
  ])
  assert.equal(apply.status, 0, apply.stderr)
  const applyReport = readJson(applyReportPath)
  assert.equal(applyReport.applied.barcode_aliases_applied, 1)
  assert.equal(applyReport.applied.quantity_changed, 0)
  assert.equal(applyReport.applied.inventory_rows_deleted, 0)
  assert.equal(applyReport.verification.unsafe_barcodes_remaining, 0)
  assert.equal(existsSync(applyReport.backup.backup_path), true)

  const migrated = new DatabaseSync(databasePath, { readOnly: true })
  const migratedRows = migrated.prepare("SELECT public_id, barcode, quantity_on_hand FROM inventory_items").all()
  assert.equal(migratedRows.length, quantitySnapshot.size)
  for (const row of migratedRows) {
    assert.equal(row.quantity_on_hand, quantitySnapshot.get(row.public_id))
    assert.equal(isPrintableScannerBarcode(row.barcode), true)
  }
  const migratedBarcode = migratedRows.find((row) => row.public_id === "inv-1001").barcode
  assert.equal(migratedBarcode.length <= 13, true)
  const operation = migrated
    .prepare("SELECT operation_id, payload_json FROM operation_queue WHERE entity_id = 'inv-1001' AND operation_type = 'inventory_update' ORDER BY queued_at_utc DESC LIMIT 1")
    .get()
  const operationPayload = JSON.parse(operation.payload_json)
  assert.equal(operationPayload.previous_barcode, "PUG-LEGACY-BARCODE-000001")
  assert.equal(operationPayload.barcode, migratedBarcode)
  assert.equal(operationPayload.quantity_delta, 0)
  assert.equal(
    migrated.prepare("SELECT aggregate_type FROM sync_outbox_events WHERE idempotency_key = ?").get(operation.operation_id)
      .aggregate_type,
    "inventory",
  )
  migrated.close()
}

function runCli(script, args) {
  return spawnSync(process.execPath, [resolve(appRoot, script), ...args], {
    cwd: appRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  })
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}
