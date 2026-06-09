import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-verify-public-shortcodes.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:verify-public-shortcodes"],
  "node scripts/production-verify-public-shortcodes.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/production-public-shortcodes-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  ".env.production.local",
  "PUG_PROD_EXPECT_PLUGIN_VERSION",
  "PUG_PROD_PUBLIC_INVENTORY_QUERY",
  "PUG_PROD_PUBLIC_INVENTORY_GAME",
  "PUG_PROD_PUBLIC_INVENTORY_LIMIT",
  "PUG_PROD_PUBLIC_EVENT_LIMIT",
  "production_public_shortcodes_verify_dry_run",
  "production_public_shortcodes_verified",
  "tcg_inventory_search",
  "tcg_product_shelf",
  "tcg_events",
  "tcg_event_detail",
  "tcg-store-public-inventory",
  "tcg-store-public-events",
  "inventory_style_enqueued",
  "product_shelf_markup_shell",
  "events_style_enqueued",
  "event_detail_contract",
  "no_raw_shortcodes_left",
  "readOnly: true",
  "writesWordPressSettings: false",
  "writesWordPressData: false",
  "runsProviderNetworkRequest: false",
  "productionApprovalRequired: false",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production public shortcode marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_PROD_SSH_PASSWORD",
  "console.log(process.env.SCRYDEX_API_KEY",
  "PUG_PROD_CONFIRM",
  "credentialsPrinted: true",
  "rawResponsePrinted: true",
  "writesWordPressData: true",
  "runsProviderNetworkRequest: true",
  "db export",
  "plugin install",
  "plugin delete",
  "wp db reset",
  "wp db import",
  "wp post create",
  "wp post update",
  "rm -rf",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production public shortcode marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production public shortcode contract")
