import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const cargoToml = await readFile(path.join(appRoot, "src-tauri/Cargo.toml"), "utf8")
const libSource = await readFile(path.join(appRoot, "src-tauri/src/lib.rs"), "utf8")
const adapterSource = await readFile(path.join(appRoot, "src/data/tauriQueueAdapter.ts"), "utf8")
const secureStoreAdapterSource = await readFile(
  path.join(appRoot, "src/data/tauriSecureStoreAdapter.ts"),
  "utf8",
)
const devicePairingAdapterSource = await readFile(
  path.join(appRoot, "src/data/tauriDevicePairingAdapter.ts"),
  "utf8",
)

for (const dependency of [
  "keyring = { version = \"3\", features = [\"windows-native\"] }",
  "reqwest = { version = \"0.12\", default-features = false, features = [\"json\", \"rustls-tls\"] }",
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
  "store_device_token",
  "get_device_token_status",
  "delete_device_token",
  "pair_offline_device",
  "paired_and_stored_in_desktop_secure_store",
  "offline_device_pairing_endpoint_https_required",
  "offline_device_pairing_request_failed",
  "offline_device_pairing_response_invalid",
  "offline_device_registered",
  "DEVICE_TOKEN_KEYRING_SERVICE",
  "desktop_secure_store",
  "stored_in_desktop_secure_store",
  "device_token_available",
  "device_token_missing",
  "device_token_deleted",
  "token_persisted",
  "raw_token_returned: false",
  "credentials_synced_to_app: false",
  "keyring_account",
  "device_token_too_short",
  "device_token_scopes_incomplete",
  "device_token_secure_store_write_failed",
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

for (const marker of [
  "@tauri-apps/api/core",
  "createTauriSecureStoreAdapter",
  "store_device_token",
  "get_device_token_status",
  "delete_device_token",
  "desktop_secure_store",
  "raw_token_returned: false",
  "credentials_synced_to_app: false",
]) {
  assert.ok(secureStoreAdapterSource.includes(marker), `Missing secure-store adapter marker: ${marker}`)
}

for (const marker of [
  "@tauri-apps/api/core",
  "createTauriDevicePairingAdapter",
  "pair_offline_device",
  "paired_and_stored_in_desktop_secure_store",
  "raw_token_returned: false",
  "credentials_synced_to_app: false",
]) {
  assert.ok(devicePairingAdapterSource.includes(marker), `Missing device pairing adapter marker: ${marker}`)
}

for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage"]) {
  assert.equal(adapterSource.includes(forbidden), false, `Forbidden adapter marker: ${forbidden}`)
  assert.equal(secureStoreAdapterSource.includes(forbidden), false, `Forbidden adapter marker: ${forbidden}`)
  assert.equal(devicePairingAdapterSource.includes(forbidden), false, `Forbidden adapter marker: ${forbidden}`)
  assert.equal(libSource.includes(forbidden), false, `Forbidden command marker: ${forbidden}`)
}

console.log("PASS offline app Tauri command contract")
