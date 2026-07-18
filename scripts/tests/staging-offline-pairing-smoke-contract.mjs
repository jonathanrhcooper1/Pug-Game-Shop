import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-run-offline-pairing-smoke.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:offline-pairing-smoke"],
  "node scripts/staging-run-offline-pairing-smoke.mjs",
  "staging offline pairing smoke script must be available through npm",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/staging-offline-pairing-smoke-contract.mjs",
  ),
  "staging offline pairing smoke contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_SITE_URL",
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "PUG_STAGING_CONFIRM_OFFLINE_PAIRING_SMOKE",
  "run-staging-offline-pairing-smoke",
  "staging_offline_pairing_smoke_dry_run",
  "staging_offline_pairing_smoke_setup",
  "staging_offline_pairing_smoke_cleanup",
  "/wp-json/tcg-store/v1/offline/devices/register",
  "temporarilyEnablesFeatureFlag",
  "temporarilyEnablesRoutes",
  "keepsRoutesDisabled",
  "restoresPreviousRouteAndFeatureSettings",
  "removesSmokeDeviceRow",
  "pairingCodePrinted: false",
  "deviceTokenPrinted: false",
  "credentialsPrinted: false",
  "writesBusinessData: false",
  "productionAllowed: false",
  "pairing_code_redacted",
  "device_token_printed",
  "device_pairing_route_enabled",
  "pull_route_enabled",
  "push_route_enabled",
  "conflict_routes_enabled",
  "offline_sync",
  "DELETE FROM {$table}",
  "Number.parseInt(String(cleanup?.parsed?.smoke_device_rows_deleted",
  "tokenReceived",
  "tokenPrinted: false",
  "pairingCodeRedacted: true",
  "remoteRunnerRemoved",
  "stream_get_contents(STDIN)",
  "wp eval-file",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing offline pairing smoke marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(pairingCode",
  "console.log(token",
  "console.log(process.env.PUG_STAGING_SSH_PASSWORD",
  "device_token: token",
  "deviceTokenPrinted: true",
  "pairingCodePrinted: true",
  "credentialsPrinted: true",
  "writesBusinessData: true",
  "productionAllowed: true",
  "pull_route_enabled' => true",
  "push_route_enabled' => true",
  "conflict_routes_enabled' => true",
  "installation_id = %s",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden offline pairing smoke marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging offline pairing smoke contract")
