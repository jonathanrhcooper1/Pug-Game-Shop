import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const bridgeSource = await readFile(path.join(appRoot, "src/data/offlineQueueBridge.ts"), "utf8")
const appSource = await readFile(path.join(appRoot, "src/App.tsx"), "utf8")

for (const marker of [
  "queue_offline_operation",
  "list_offline_operations",
  "mark_offline_operations_synced",
  "void_offline_operations",
  "preview_only",
  "tauri_command",
  "submitOfflineOperation",
  "restoreDesktopQueuedOperations",
  "markOfflineOperationsSynced",
  "voidOfflineOperations",
  "previewOfflineOperation",
  "sanitizeOperationIds",
  "sanitizeRestoredOperations",
  "buildOfflineQueueInsertPlan",
  "sqlitePlan",
  "OfflineQueueCommandAdapter",
  "directMysqlAccess: false",
  "networkWrite: false",
]) {
  assert.ok(bridgeSource.includes(marker), `Missing queue bridge marker: ${marker}`)
}

assert.ok(appSource.includes("submitOfflineOperation(operation, queueAdapter)"))
assert.ok(appSource.includes("restoreDesktopQueuedOperations(queueAdapter)"))
assert.ok(appSource.includes("markOfflineOperationsSynced(queueApplyResult.removedOperationIds, queueAdapter)"))
assert.ok(appSource.includes("voidOfflineOperations("))
assert.ok(appSource.includes("handleRefreshDesktopQueue"))
assert.ok(appSource.includes("handleVoidSelectedQueueOperation"))
assert.ok(appSource.includes("Refresh Desktop Queue"))
assert.ok(appSource.includes("Void Selected Operation"))
assert.ok(appSource.includes("OfflineQueueSubmissionResult"))
assert.ok(appSource.includes("queueSubmission?.message"))
assert.ok(appSource.includes("createTauriQueueAdapter"))
assert.ok(appSource.includes("Desktop queue restored"))

for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage"]) {
  assert.equal(bridgeSource.includes(forbidden), false, `Forbidden queue bridge marker: ${forbidden}`)
}

console.log("PASS offline app queue bridge contract")
