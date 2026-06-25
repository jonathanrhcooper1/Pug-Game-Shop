import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-configure-scrydex.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:configure-scrydex"],
  "node scripts/staging-configure-scrydex.mjs",
  "staging ScryDex configuration script must be available through npm",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/staging-scrydex-config-contract.mjs",
  ),
  "staging ScryDex configuration contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "SCRYDEX_TEAM_ID",
  "SCRYDEX_API_KEY",
  "SCRYDEX_PRIMARY_API_KEY",
  "SCRYDEX_SECONDARY_API_KEY",
  "SCRYDEX_BASE_URL",
  "PUG_STAGING_CONFIRM_SCRYDEX_CONFIG",
  "configure-staging-scrydex",
  "staging_scrydex_configure_dry_run",
  "staging_scrydex_configured",
  "staging_scrydex_status_checked",
  "stream_get_contents(STDIN)",
  "wp eval-file",
  "TCGStorePlatform\\\\Settings\\\\Settings",
  "ScryDexProviderSettings::public_status",
  "ScryDexUsageBudgetSettings::public_status",
  "credential_values_redacted",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
  "runsProviderNetworkRequest: false",
  "writesWordPressData: false",
  "runnerRemoved",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing ScryDex config marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.SCRYDEX_API_KEY",
  "console.log(process.env.SCRYDEX_PRIMARY_API_KEY",
  "console.log(process.env.SCRYDEX_SECONDARY_API_KEY",
  "console.log(process.env.SCRYDEX_TEAM_ID",
  "fastPut",
  "SCRYDEX_API_KEY=",
  "SCRYDEX_PRIMARY_API_KEY=",
  "SCRYDEX_SECONDARY_API_KEY=",
  "runProviderNetworkRequest: true",
  "credentialsPrinted: true",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden ScryDex config marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging ScryDex configuration contract")
