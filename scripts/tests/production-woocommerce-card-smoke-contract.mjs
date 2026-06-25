import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-run-woocommerce-card-smoke.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:woocommerce-card-smoke"],
  "node scripts/production-run-woocommerce-card-smoke.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/production-woocommerce-card-smoke-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_WOOCOMMERCE_CARD_SMOKE",
  "run-production-woocommerce-card-smoke",
  ".env.production.local",
  "production_woocommerce_card_smoke_dry_run",
  "production_woocommerce_card_smoke",
  "CODEX-WOO-",
  "createsTemporaryWooCommerceProduct: true",
  "createsTemporaryVisibleInventoryRows: true",
  "verifiesGroupedCardProductMetadata: true",
  "verifiesCardImageFallback: true",
  "verifiesSelectedConditionStockPriceUi: true",
  "verifiesExactInventoryReservationRelease: true",
  "verifiesExactInventoryOrderConversion: true",
  "cleansTemporaryRowsAndProduct: true",
  "woocommerce-product-sync",
  "GroupedInventoryProductHooks",
  "WooCommerceInventoryProductWriter",
  "InventoryExternalMappingRepository",
  "ReservationService",
  "render_condition_selector",
  "selector_ui",
  "condition_selector_ui",
  "data-tcg-selected-stock",
  "data-price=\"0.99\"",
  "quantity.max=\"1\"",
  "online_visibility' => 'visible'",
  "kiosk_visibility' => 'hidden'",
  "pos_visibility' => 'hidden'",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production WooCommerce card smoke marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_PROD_SSH_PASSWORD",
  "credentialsPrinted: true",
  "rawResponsePrinted: true",
  "wp db reset",
  "wp db import",
  "rm -rf",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production WooCommerce card smoke marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production WooCommerce card smoke contract")
