import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-run-local-sync-workflows-smoke.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:local-sync-workflows-smoke"],
  "node scripts/production-run-local-sync-workflows-smoke.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/production-local-sync-workflows-smoke-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_LOCAL_SYNC_WORKFLOWS_SMOKE",
  "run-production-local-sync-workflows-smoke",
  ".env.production.local",
  ".env.local-sync",
  "production_local_sync_workflows_smoke_dry_run",
  "production_local_sync_workflows_smoke",
  "createsTemporaryWordPressEvent: true",
  "createsHiddenInventory: true",
  "createsTemporaryCustomerCredit: true",
  "createsKioskReservation: true",
  "createsEventRegistrationAndCheckin: true",
  "cleansWordPressRowsBySmokeId: true",
  "cleansLocalRowsBySmokeId: true",
  "/sync/pull",
  "/events/registrations",
  "/events/check-ins",
  "/customers",
  "/credit/adjustments",
  "/credit/redemptions",
  "/inventory/intake",
  "/kiosk/orders",
  "online_visibility: \"hidden\"",
  "kiosk_visibility: \"hidden\"",
  "pos_visibility: \"hidden\"",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production workflows smoke marker: ${requiredMarker}`)
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
    `Forbidden production workflows smoke marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production local sync workflows smoke contract")
