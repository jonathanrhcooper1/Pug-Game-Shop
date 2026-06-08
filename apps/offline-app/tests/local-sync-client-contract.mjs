import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const clientSource = await readFile(path.join(appRoot, "src/data/localSyncServerClient.ts"), "utf8")

for (const requiredExport of [
  "LocalSyncServerClient",
  "LocalSyncAccessSection",
  "LocalSyncUser",
  "LocalSyncSession",
  "LocalSyncAuthResult",
  "LocalSyncAccessPolicyResult",
  "LocalSyncInventorySearchResult",
  "LocalSyncReservationResult",
  "LocalSyncKioskOrderResult",
  "LocalSyncStatusResult",
  "createLocalSyncServerClient",
  "normalizeLocalSyncServerUrl",
  "updateUserAccess",
]) {
  assert.ok(clientSource.includes(requiredExport), `Missing local sync client export: ${requiredExport}`)
}

for (const route of [
  "/auth/pin",
  "/users/access-policy",
  "/users",
  "/users/${encodeURIComponent(userId)}/access",
  "/inventory/search?q=",
  "/inventory/reservations",
  "/kiosk/orders",
  "/sync/status",
]) {
  assert.ok(clientSource.includes(route), `Missing local sync client route: ${route}`)
}

for (const marker of [
  "Bearer ${options.sessionToken}",
  "raw_pin_returned: false",
  "pin_hash_returned: false",
  "pin_credentials_returned: false",
  "local_sync_server_unavailable",
  "The LAN local sync server is unavailable.",
  "http://127.0.0.1:8787",
  "store-sync.sqlite",
  "local_operations_preserved: true",
  "wordpress_acceptance_required: true",
  "first_name",
  "last_name",
  "inventory_public_ids",
  "hold_reason",
  "inventory_public_id",
]) {
  assert.ok(clientSource.includes(marker), `Missing local sync client marker: ${marker}`)
}

for (const forbidden of [
  "direct_mysql_access: true",
  "rawTokenReturned",
  "password",
  "api_key",
  "private_key",
]) {
  assert.equal(clientSource.includes(forbidden), false, `Forbidden local sync client marker found: ${forbidden}`)
}

console.log("PASS offline app local sync client contract")
