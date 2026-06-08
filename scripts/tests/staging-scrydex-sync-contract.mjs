import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(path.join(root, "scripts/staging-run-scrydex-sync.mjs"), "utf8")

assert.equal(
  packageJson.scripts["staging:run-scrydex-sync"],
  "node scripts/staging-run-scrydex-sync.mjs",
  "staging ScryDex sync runner must be available through npm",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes("node scripts/tests/staging-scrydex-sync-contract.mjs"),
  "staging ScryDex sync contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_CONFIRM_SCRYDEX_SYNC",
  "run-staging-scrydex-sync",
  "WP_ENVIRONMENT_TYPE",
  "staging_environment_required",
  "ScryDexScheduledRefreshRunner",
  "scrydex_sync",
  "SCRYDEX_SYNC_GAMES",
  "SCRYDEX_SYNC_PAGE_SIZE",
  "SCRYDEX_SYNC_MAX_PAGES",
  "boundedPages",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
  "provider_result_bodies_not_logged",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing staging ScryDex sync marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_STAGING_SSH_PASSWORD",
  "console.log(process.env.SCRYDEX_API_KEY",
  "primary_api_key",
  "secondary_api_key",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden staging ScryDex sync marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging ScryDex sync contract")
