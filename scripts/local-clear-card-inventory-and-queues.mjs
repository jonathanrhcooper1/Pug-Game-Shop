import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import { loadLocalEnv } from "./lib/local-env.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
loadLocalEnv([resolve(root, ".env.local-sync"), resolve(root, ".env.local")])

const dryRun = process.argv.includes("--dry-run")
const localDatabasePath = resolve(
  root,
  firstEnv("LOCAL_SYNC_SQLITE_PATH", "PUG_LOCAL_SYNC_DB") ??
    "apps/local-sync-server/store-sync.sqlite",
)
const backupPath = resolve(
  root,
  ".local",
  "backups",
  `store-sync-before-live-inventory-${timestampForFileName(new Date())}.sqlite`,
)

if (!existsSync(localDatabasePath)) {
  throw new Error(`Local sync SQLite database was not found: ${localDatabasePath}`)
}

const database = new DatabaseSync(localDatabasePath)

try {
  const before = snapshotCounts(database)

  if (!dryRun) {
    mkdirSync(dirname(backupPath), { recursive: true })
    copyFileSync(localDatabasePath, backupPath)

    database.exec("BEGIN IMMEDIATE")
    try {
      deleteAllIfExists(database, "fulfillment_orders")
      deleteAllIfExists(database, "kiosk_orders")
      deleteAllIfExists(database, "operation_queue")
      deleteAllIfExists(database, "inventory_items")
      database.exec("COMMIT")
    } catch (error) {
      database.exec("ROLLBACK")
      throw error
    }

    try {
      database.exec("VACUUM")
    } catch {
      // Vacuum is a best-effort size cleanup; the row deletes above are the authority.
    }
  }

  const after = dryRun ? before : snapshotCounts(database)

  console.log(
    JSON.stringify(
      {
        action: dryRun ? "local_live_inventory_cleanup_dry_run" : "local_live_inventory_cleanup",
        status: "ok",
        localDatabasePath,
        backupPath: dryRun ? null : backupPath,
        dryRun,
        clearedTables: ["inventory_items", "operation_queue", "kiosk_orders", "fulfillment_orders"],
        preservedTables: ["reference_cards", "customers", "credit_ledger_entries", "event_snapshots"],
        before,
        after,
        inventoryRowsCleared: Math.max(0, before.inventory_items - after.inventory_items),
        queuedRowsCleared: Math.max(0, before.operation_queue - after.operation_queue),
        kioskOrdersCleared: Math.max(0, before.kiosk_orders - after.kiosk_orders),
        fulfillmentOrdersCleared: Math.max(0, before.fulfillment_orders - after.fulfillment_orders),
        credentialsPrinted: false,
      },
      null,
      2,
    ),
  )
} finally {
  database.close()
}

function snapshotCounts(database) {
  return {
    inventory_items: countRows(database, "inventory_items"),
    operation_queue: countRows(database, "operation_queue"),
    kiosk_orders: countRows(database, "kiosk_orders"),
    fulfillment_orders: countRows(database, "fulfillment_orders"),
    reference_cards: countRows(database, "reference_cards"),
    customers: countRows(database, "customers"),
    credit_ledger_entries: countRows(database, "credit_ledger_entries"),
    event_snapshots: countRows(database, "event_snapshots"),
  }
}

function countRows(database, table) {
  if (!tableExists(database, table)) {
    return 0
  }

  return Number(database.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count ?? 0)
}

function deleteAllIfExists(database, table) {
  if (!tableExists(database, table)) {
    return 0
  }

  return Number(database.prepare(`DELETE FROM "${table}"`).run().changes ?? 0)
}

function tableExists(database, table) {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table)

  return Boolean(row?.name)
}

function firstEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] ?? "").trim()
    if (value !== "") {
      return value
    }
  }

  return null
}

function timestampForFileName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}
