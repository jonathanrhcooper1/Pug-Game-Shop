import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-run-local-sync-square-sale-smoke.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:local-sync-square-sale-smoke"],
  "node scripts/production-run-local-sync-square-sale-smoke.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/production-local-sync-square-sale-smoke-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_LOCAL_SYNC_SQUARE_SALE_SMOKE",
  "run-production-local-sync-square-sale-smoke",
  ".env.production.local",
  ".env.local-sync",
  "production_local_sync_square_sale_smoke_dry_run",
  "production_local_sync_square_sale_smoke",
  "createsVisibleInventory: true",
  "autoPublishesWooCommerceProduct: true",
  "finalizesSquareSale: true",
  "verifiesWordPressSoldStatus: true",
  "cleansWordPressRowsByBarcode: true",
  "cleansWooCommerceProductsByBarcode: true",
  "cleansLocalRowsByBarcode: true",
  "/inventory/intake",
  "/sync/push",
  "/pos/square/sales/finalize",
  "/inventory/search",
  "online_visibility: \"visible\"",
  "kiosk_visibility: \"visible\"",
  "pos_visibility: \"visible\"",
  "wordpressAutoSyncPerformed",
  "woocommerceProductSync",
  "squareReceiptReference",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production Square sale smoke marker: ${requiredMarker}`)
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
    `Forbidden production Square sale smoke marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production local sync Square sale smoke contract")
