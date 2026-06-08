import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const localQueueSource = await readFile(
  path.join(appRoot, "src/data/offlineLocalQueue.ts"),
  "utf8",
)
const bridgeSource = await readFile(path.join(appRoot, "src/data/offlineQueueBridge.ts"), "utf8")
const appSource = await readFile(path.join(appRoot, "src/App.tsx"), "utf8")
const libSource = await readFile(path.join(appRoot, "src-tauri/src/lib.rs"), "utf8")

for (const marker of [
  "OfflineSqliteQueueInsertPlan",
  "offlineQueueInsertColumns",
  "buildOfflineQueueInsertPlan",
  "offline.sqlite",
  "operation_queue",
  "INSERT OR IGNORE INTO",
  "client_operation_id_unique_insert_or_ignore",
  "sqlitePersistenceDeferred: true",
  "queueReplayDeferred: true",
  "canonicalMutationsDeferred: true",
  "directMysqlAccess: false",
  "networkWrite: false",
  "\"pending\"",
  "retry_count",
]) {
  assert.ok(localQueueSource.includes(marker), `Missing local queue marker: ${marker}`)
}

for (const column of [
  "client_operation_id",
  "device_id",
  "location_id",
  "actor_id",
  "operation_type",
  "entity_type",
  "entity_id",
  "base_row_version",
  "occurred_at_local",
  "queued_at_utc",
  "payload_json",
  "authorization_context_json",
  "schema_version",
  "status",
  "retry_count",
]) {
  assert.ok(localQueueSource.includes(column), `Missing local queue column: ${column}`)
}

assert.ok(bridgeSource.includes("buildOfflineQueueInsertPlan(operation)"))
assert.ok(bridgeSource.includes("sqlitePlan: OfflineSqliteQueueInsertPlan"))
assert.ok(appSource.includes("queueSubmission?.sqlitePlan.table"))
assert.ok(appSource.includes("insert planned"))

for (const marker of [
  "SQLITE_QUEUE_TABLE",
  "SQLITE_QUEUE_INSERT_SQL",
  "SQLITE_QUEUE_SELECT_PENDING_SQL",
  "SQLITE_QUEUE_MARK_SYNCED_SQL",
  "SQLITE_QUEUE_PARAMETER_COUNT",
  "SQLITE_QUEUE_CREATE_TABLE_SQL",
  "mark_offline_operations_synced",
  "marked_local_queue_synced",
  "sqlite_table",
  "sqlite_database_file",
  "sqlite_statement",
  "sqlite_parameter_count",
  "sqlite_rows_affected",
  "queue_replay_applied",
  "loaded_local_queue",
  "operation_count",
  "sqlite_persistence_deferred: false",
  "queue_replay_deferred: true",
  "canonical_mutations_deferred: true",
]) {
  assert.ok(libSource.includes(marker), `Missing Tauri queue plan marker: ${marker}`)
}

for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "http://", "https://"]) {
  assert.equal(localQueueSource.includes(forbidden), false, `Forbidden local queue marker: ${forbidden}`)
}

console.log("PASS offline app local queue persistence contract")
