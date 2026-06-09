import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-run-scrydex-index.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:run-scrydex-index"],
  "node scripts/production-run-scrydex-index.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/production-scrydex-index-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_SCRYDEX_INDEX",
  "run-production-scrydex-index",
  ".env.production.local",
  "SCRYDEX_INDEX_GAME",
  "SCRYDEX_INDEX_PAGE_SIZE",
  "SCRYDEX_INDEX_MAX_PAGES",
  "SCRYDEX_INDEX_ROUNDS",
  "SCRYDEX_INDEX_EXPANSIONS",
  "SCRYDEX_INDEX_BY_SET",
  "SCRYDEX_INDEX_SET_LIMIT",
  "SCRYDEX_INDEX_SET_OFFSET",
  "/tcg-store/v1/scrydex/catalog/index",
  "/tcg-store/v1/scrydex/catalog/status",
  "tcg_production_scrydex_reference_sets",
  "tcg_production_scrydex_catalog_request",
  "index_by_set",
  "sets_selected",
  "skip_cards",
  "db export",
  "$HOME/tcg-production-backups",
  "production_scrydex_index_dry_run",
  "production_scrydex_index_ran",
  "boundedPages: true",
  "writesWordPressData: true",
  "runsProviderNetworkRequest: true",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
  "provider_result_bodies_not_logged",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production ScryDex index marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_PROD_SSH_PASSWORD",
  "console.log(process.env.SCRYDEX_API_KEY",
  "primary_api_key",
  "secondary_api_key",
  "rawResponsePrinted: true",
  "credentialsPrinted: true",
  "wp db reset",
  "wp db import",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production ScryDex index marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production ScryDex index contract")
