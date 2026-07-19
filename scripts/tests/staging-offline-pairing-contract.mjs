import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-configure-offline-pairing.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:configure-offline-pairing"],
  "node scripts/staging-configure-offline-pairing.mjs",
  "staging offline pairing configuration script must be available through npm",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/staging-offline-pairing-contract.mjs",
  ),
  "staging offline pairing contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "TCG_OFFLINE_PAIRING_CODE",
  "OFFLINE_PAIRING_CODE",
  "PUG_STAGING_CONFIRM_OFFLINE_PAIRING",
  "configure-staging-offline-pairing",
  "staging_offline_pairing_configure_dry_run",
  "staging_offline_pairing_configured",
  "staging_offline_pairing_status_checked",
  "stream_get_contents(STDIN)",
  "wp eval-file",
  "TCGStorePlatform\\\\Settings\\\\Settings",
  "OfflinePairingAuthorizationSettings::policy",
  "OfflineRouteRuntimeSettings::from_settings",
  "pairing_code_hash_count",
  "pairing_code_values_redacted",
  "pairing_code_hashes_redacted",
  "device_pairing_route_enabled",
  "pull_route_enabled",
  "push_route_enabled",
  "conflict_routes_enabled",
  "issuesDeviceTokens: false",
  "writesWordPressData: false",
  "runsSyncNetworkRequest: false",
  "pairingCodePrinted: false",
  "pairingCodeHashPrinted: false",
  "rawResponsePrinted: false",
  "runnerRemoved",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing offline pairing marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.TCG_OFFLINE_PAIRING_CODE",
  "console.log(process.env.OFFLINE_PAIRING_CODE",
  "TCG_OFFLINE_PAIRING_CODE=",
  "OFFLINE_PAIRING_CODE=",
  "pairingCodePrinted: true",
  "pairingCodeHashPrinted: true",
  "issuesDeviceTokens: true",
  "writesWordPressData: true",
  "runsSyncNetworkRequest: true",
  "fastPut",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden offline pairing marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging offline pairing contract")
