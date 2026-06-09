import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-configure-scrydex.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:configure-scrydex"],
  "node scripts/production-configure-scrydex.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/production-scrydex-config-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_SCRYDEX_CONFIG",
  "configure-production-scrydex",
  ".env.production.local",
  "SCRYDEX_TEAM_ID",
  "SCRYDEX_API_KEY or SCRYDEX_PRIMARY_API_KEY",
  "SCRYDEX_SECONDARY_API_KEY",
  "production_scrydex_configure_dry_run",
  "production_scrydex_configured",
  "primary_api_key",
  "secondary_api_key",
  "credential_values_redacted",
  "writesWordPressSettings: !statusOnly",
  "runsProviderNetworkRequest: false",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production ScryDex config marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.SCRYDEX_API_KEY",
  "console.log(process.env.SCRYDEX_PRIMARY_API_KEY",
  "console.log(process.env.SCRYDEX_TEAM_ID",
  "rawResponsePrinted: true",
  "credentialsPrinted: true",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production ScryDex config marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production ScryDex config contract")
