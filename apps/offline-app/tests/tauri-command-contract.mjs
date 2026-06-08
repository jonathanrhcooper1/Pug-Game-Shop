import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const cargoToml = await readFile(path.join(appRoot, "src-tauri/Cargo.toml"), "utf8")
const libSource = await readFile(path.join(appRoot, "src-tauri/src/lib.rs"), "utf8")
const adapterSource = await readFile(path.join(appRoot, "src/data/tauriQueueAdapter.ts"), "utf8")

for (const dependency of [
  "rusqlite = { version = \"0.32\", features = [\"bundled\"] }",
  "serde = { version = \"1\", features = [\"derive\"] }",
  "serde_json = \"1\"",
]) {
  assert.ok(cargoToml.includes(dependency), `Missing Rust dependency: ${dependency}`)
}

for (const marker of [
  "#[tauri::command]",
  "queue_offline_operation",
  "list_offline_operations",
  "tauri::generate_handler![",
  "persisted_to_local_queue",
  "already_queued_local_queue",
  "loaded_local_queue",
  "sqlite",
  "Connection::open",
  "CREATE TABLE IF NOT EXISTS operation_queue",
  "SELECT client_operation_id",
  "SQLITE_QUEUE_INSERT_SQL",
  "SQLITE_QUEUE_SELECT_PENDING_SQL",
  "sqlite_database_file",
  "sqlite_rows_affected",
  "operation_count",
  "sqlite_persistence_deferred",
  "queue_replay_deferred",
  "canonical_mutations_deferred",
  "inventory_update",
  "inventory_reservation",
  "event_reservation",
  "credit_redemption",
  "direct_mysql_access: false",
  "network_write: false",
  "invalid_payload_json",
  "invalid_authorization_context_json",
  "unsupported_operation",
  "offline_queue_row_invalid",
]) {
  assert.ok(libSource.includes(marker), `Missing Tauri command marker: ${marker}`)
}

for (const marker of [
  "@tauri-apps/api/core",
  "__TAURI_INTERNALS__",
  "createTauriQueueAdapter",
  "OfflineQueueCommandAdapter",
]) {
  assert.ok(adapterSource.includes(marker), `Missing Tauri adapter marker: ${marker}`)
}

for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage"]) {
  assert.equal(adapterSource.includes(forbidden), false, `Forbidden adapter marker: ${forbidden}`)
  assert.equal(libSource.includes(forbidden), false, `Forbidden command marker: ${forbidden}`)
}

console.log("PASS offline app Tauri command contract")
