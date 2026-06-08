import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const cargoToml = await readFile(path.join(appRoot, "src-tauri/Cargo.toml"), "utf8")
const libSource = await readFile(path.join(appRoot, "src-tauri/src/lib.rs"), "utf8")
const adapterSource = await readFile(path.join(appRoot, "src/data/tauriQueueAdapter.ts"), "utf8")

for (const dependency of ["serde = { version = \"1\", features = [\"derive\"] }", "serde_json = \"1\""]) {
  assert.ok(cargoToml.includes(dependency), `Missing Rust dependency: ${dependency}`)
}

for (const marker of [
  "#[tauri::command]",
  "queue_offline_operation",
  "tauri::generate_handler![queue_offline_operation]",
  "accepted_for_local_queue",
  "command_scaffold",
  "inventory_update",
  "inventory_reservation",
  "event_reservation",
  "credit_redemption",
  "direct_mysql_access: false",
  "network_write: false",
  "invalid_payload_json",
  "invalid_authorization_context_json",
  "unsupported_operation",
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
