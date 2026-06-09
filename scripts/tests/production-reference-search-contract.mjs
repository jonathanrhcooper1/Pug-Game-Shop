import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-verify-reference-search.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:verify-reference-search"],
  "node scripts/production-verify-reference-search.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/production-reference-search-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  ".env.production.local",
  "PUG_PROD_EXPECT_PLUGIN_VERSION",
  "PUG_PROD_REFERENCE_SEARCH_QUERY",
  "PUG_PROD_REFERENCE_SEARCH_GAME",
  "PUG_PROD_REFERENCE_SEARCH_LIMIT",
  "production_reference_search_verify_dry_run",
  "production_reference_search_verified",
  "/tcg-store/v1/reference/search",
  "reference_search_http_status",
  "wordpress_catalog_cache",
  "lookup_order",
  "market_price_amount",
  "market_price_minor_units",
  "variant_count",
  "price_point_count",
  "image_present",
  "first_result_price_format",
  "readOnly: true",
  "writesWordPressSettings: false",
  "writesWordPressData: false",
  "runsProviderNetworkRequest: false",
  "productionApprovalRequired: false",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production reference search marker: ${requiredMarker}`)
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
  "rm -rf",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production reference search marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production reference search contract")
