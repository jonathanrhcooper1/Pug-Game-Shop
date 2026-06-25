import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-run-local-pickup-fulfillment-smoke.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:local-pickup-fulfillment-smoke"],
  "node scripts/production-run-local-pickup-fulfillment-smoke.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/production-local-pickup-fulfillment-smoke-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_LOCAL_PICKUP_FULFILLMENT_SMOKE",
  "run-production-local-pickup-fulfillment-smoke",
  ".env.production.local",
  ".env.local-sync",
  "production_local_pickup_fulfillment_smoke_dry_run",
  "production_local_pickup_fulfillment_smoke",
  "createsTemporaryPaidWooCommerceOrder: true",
  "usesWooCommerceLocalPickup: true",
  "usesSerializedCardLineMetadata: true",
  "capturesRealPayment: false",
  "verifiesLanFulfillmentPull: true",
  "verifiesPullingReadyAndCompletedStatuses: true",
  "cleansTemporaryWooCommerceOrder: true",
  "cleansLocalFulfillmentCache: true",
  "/fulfillment/orders?limit=100&refresh=true",
  "ready_for_pickup",
  "_tcg_serialized_inventory",
  "_tcg_fulfillment_smoke_id",
  "real_payment_capture_performed: false",
  "inventory_mutation_performed_by_status: false",
  "payment_capture_performed_by_status: false",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production pickup smoke marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_PROD_SSH_PASSWORD",
  "console.log(process.env.PUG_WORDPRESS_APP_PASSWORD",
  "credentialsPrinted: true",
  "rawResponsePrinted: true",
  "payment_complete(",
  "process_payment(",
  "capture_payment",
  "wp db reset",
  "wp db import",
  "rm -rf",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production pickup smoke marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production local pickup fulfillment smoke contract")
