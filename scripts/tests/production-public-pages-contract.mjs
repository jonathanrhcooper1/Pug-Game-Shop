import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-configure-public-pages.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:configure-public-pages"],
  "node scripts/production-configure-public-pages.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes("node scripts/tests/production-public-pages-contract.mjs"),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_PUBLIC_PAGES",
  "configure-public-pages",
  ".env.production.local",
  "production_public_pages_configure_dry_run",
  "production_public_pages_configured",
  "shop-singles",
  "shop-sealed-products",
  "shop-accessories",
  "card-inventory",
  "events",
  "singles",
  "sealed-products",
  "accessories",
  "productCategories",
  "createsOrUpdatesProductCategories: true",
  "[tcg_inventory_search",
  "[products category=\"sealed-products\"",
  "[products category=\"accessories\"",
  "[tcg_events",
  "backsUpExistingPageContentToPostMeta: true",
  "changesHomepage: false",
  "changesNavigationMenus: false",
  "writesWordPressSettings: false",
  "writesWordPressData: true",
  "runsProviderNetworkRequest: false",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
  "rawContentPrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production public page marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_PROD_SSH_PASSWORD",
  "console.log(process.env.SCRYDEX_API_KEY",
  "credentialsPrinted: true",
  "rawContentPrinted: true",
  "runsProviderNetworkRequest: true",
  "db export",
  "plugin install",
  "plugin delete",
  "wp db reset",
  "wp db import",
  "wp option update show_on_front",
  "wp menu",
  "rm -rf",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production public page marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production public pages contract")
