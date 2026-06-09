import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-configure-commerce-menu.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:configure-commerce-menu"],
  "node scripts/production-configure-commerce-menu.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes("node scripts/tests/production-commerce-menu-contract.mjs"),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_COMMERCE_MENU",
  "configure-production-commerce-menu",
  ".env.production.local",
  "production_commerce_menu_configure_dry_run",
  "production_commerce_menu_configured",
  "Pug Storefront Menu",
  "primary",
  "Home",
  "Singles",
  "Sealed",
  "Graded",
  "Accessories",
  "Events",
  "Buying",
  "Contact",
  "custom",
  "shop-singles",
  "shop-sealed-products",
  "shop-graded-cards",
  "shop-accessories",
  "events",
  "excludedPageSlugs",
  "shop",
  "get_registered_nav_menus",
  "get_nav_menu_locations",
  "set_theme_mod('nav_menu_locations'",
  "wp_create_nav_menu",
  "wp_update_nav_menu_item",
  "wp_get_nav_menu_items",
  "backsUpPreviousMenuAssignmentToOption: true",
  "touchesThemeFiles: false",
  "changesHomepage: false",
  "writesWordPressSettings: true",
  "writesWordPressData: true",
  "runsProviderNetworkRequest: false",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
  "rawContentPrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production commerce menu marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_PROD_SSH_PASSWORD",
  "console.log(process.env.SCRYDEX_API_KEY",
  "credentialsPrinted: true",
  "rawContentPrinted: true",
  "runsProviderNetworkRequest: true",
  "plugin install",
  "plugin delete",
  "theme install",
  "theme delete",
  "wp db reset",
  "wp db import",
  "wp option update show_on_front",
  "rm -rf",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production commerce menu marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production commerce menu contract")
