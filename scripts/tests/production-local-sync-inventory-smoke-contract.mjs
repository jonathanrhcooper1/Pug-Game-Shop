import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-run-local-sync-inventory-smoke.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:local-sync-inventory-smoke"],
  "node scripts/production-run-local-sync-inventory-smoke.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/production-local-sync-inventory-smoke-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_LOCAL_SYNC_INVENTORY_SMOKE",
  "run-production-local-sync-inventory-smoke",
  ".env.production.local",
  ".env.local-sync",
  "production_local_sync_inventory_smoke_dry_run",
  "production_local_sync_inventory_smoke",
  "CODEX-LSYNC-",
  "/inventory/intake",
  "/sync/push",
  "/inventory/search",
  "online_visibility: \"hidden\"",
  "kiosk_visibility: \"hidden\"",
  "pos_visibility: \"hidden\"",
  "cleansWordPressRowsByBarcode: true",
  "cleansLocalRowsByBarcode: true",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production local sync smoke marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_PROD_SSH_PASSWORD",
  "console.log(process.env.PUG_WORDPRESS_APP_PASSWORD",
  "credentialsPrinted: true",
  "rawResponsePrinted: true",
  "online_visibility: \"visible\"",
  "kiosk_visibility: \"visible\"",
  "pos_visibility: \"visible\"",
  "wp db reset",
  "wp db import",
  "rm -rf",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production local sync smoke marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production local sync inventory smoke contract")
