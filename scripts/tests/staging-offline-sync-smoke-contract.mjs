import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-run-offline-sync-smoke.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:offline-sync-smoke"],
  "node scripts/staging-run-offline-sync-smoke.mjs",
  "staging offline sync smoke script must be available through npm",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/staging-offline-sync-smoke-contract.mjs",
  ),
  "staging offline sync smoke contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_SITE_URL",
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "PUG_STAGING_CONFIRM_OFFLINE_SYNC_SMOKE",
  "run-staging-offline-sync-smoke",
  "staging_offline_sync_smoke_dry_run",
  "staging_offline_sync_smoke_setup",
  "staging_offline_sync_smoke_cleanup",
  "/wp-json/tcg-store/v1/offline/devices/register",
  "/wp-json/tcg-store/v1/offline/pull",
  "/wp-json/tcg-store/v1/offline/push",
  "temporarilyEnablesFeatureFlag",
  "temporarilyEnablesRoutes",
  "restoresPreviousRouteAndFeatureSettings",
  "writesTemporarySyncQueueRows",
  "removesSmokeQueueRows",
  "removesSmokeConflictRows",
  "removesSmokeDeviceRow",
  "canonicalInventoryWrites: false",
  "squareWrites: false",
  "paymentCapture: false",
  "pairingCodePrinted: false",
  "deviceTokenPrinted: false",
  "credentialsPrinted: false",
  "productionAllowed: false",
  "pairing_code_redacted",
  "device_token_printed",
  "device_pairing_route_enabled",
  "pull_route_enabled",
  "push_route_enabled",
  "conflict_routes_enabled",
  "offline_sync",
  "tcg_offline_sync_queue",
  "tcg_sync_conflicts",
  "tcg_offline_devices",
  "DELETE FROM {$conflict_table}",
  "DELETE FROM {$queue_table}",
  "DELETE FROM {$device_table}",
  "push_queue_persistence_deferred",
  "push_canonical_mutations_deferred",
  "push_canonical_mutation_transaction_execution_deferred",
  "Authorization",
  "Bearer",
  "Idempotency-Key",
  "wp eval-file",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing offline sync smoke marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(pairingCode",
  "console.log(token",
  "console.log(process.env.PUG_STAGING_SSH_PASSWORD",
  "device_token: token",
  "deviceTokenPrinted: true",
  "pairingCodePrinted: true",
  "credentialsPrinted: true",
  "productionAllowed: true",
  "canonicalInventoryWrites: true",
  "squareWrites: true",
  "paymentCapture: true",
  "conflict_routes_enabled' => true",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden offline sync smoke marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging offline sync smoke contract")
