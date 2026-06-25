import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-verify-scrydex-catalog.mjs"),
  "utf8",
)
const envExample = await readFile(path.join(root, ".env.example"), "utf8")

assert.equal(
  packageJson.scripts["production:verify-scrydex-catalog"],
  "node scripts/production-verify-scrydex-catalog.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/production-scrydex-verify-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  ".env.production.local",
  "PUG_PROD_EXPECT_PLUGIN_VERSION",
  "SCRYDEX_VERIFY_MIN_CARDS",
  "SCRYDEX_VERIFY_MIN_IMAGE_COVERAGE",
  "SCRYDEX_VERIFY_MIN_VARIANT_COVERAGE",
  "SCRYDEX_VERIFY_MIN_PRICE_COVERAGE",
  "SCRYDEX_VERIFY_MIN_PRICE_POINTS",
  "production_scrydex_catalog_verify_dry_run",
  "production_scrydex_catalog_verified",
  "/tcg-store/v1/scrydex/catalog/status",
  "cards_with_images",
  "cards_with_variants",
  "cards_with_price_points",
  "image_coverage_percent",
  "variant_coverage_percent",
  "price_coverage_percent",
  "latest_cards",
  "readOnly: true",
  "writesWordPressSettings: false",
  "writesWordPressData: false",
  "runsProviderNetworkRequest: false",
  "productionApprovalRequired: false",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production ScryDex verify marker: ${requiredMarker}`)
}

for (const requiredEnvMarker of [
  "PUG_PROD_EXPECT_PLUGIN_VERSION",
  "SCRYDEX_VERIFY_MIN_CARDS",
  "SCRYDEX_VERIFY_MIN_IMAGE_COVERAGE",
  "SCRYDEX_VERIFY_MIN_VARIANT_COVERAGE",
  "SCRYDEX_VERIFY_MIN_PRICE_COVERAGE",
  "SCRYDEX_VERIFY_MIN_PRICE_POINTS",
]) {
  assert.ok(envExample.includes(requiredEnvMarker), `Missing .env.example marker: ${requiredEnvMarker}`)
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
    `Forbidden production ScryDex verify marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production ScryDex verify contract")
