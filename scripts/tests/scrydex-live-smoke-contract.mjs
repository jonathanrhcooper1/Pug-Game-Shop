import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..", "..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(path.join(root, "scripts/scrydex-live-smoke.mjs"), "utf8")

assert.equal(packageJson.scripts["scrydex:live-smoke"], "node scripts/scrydex-live-smoke.mjs")
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/scrydex-live-smoke-contract.mjs",
  ),
  "ScryDex live smoke contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "SCRYDEX_API_KEY",
  "SCRYDEX_PRIMARY_API_KEY",
  "SCRYDEX_TEAM_ID",
  "SCRYDEX_BASE_URL",
  "SCRYDEX_SMOKE_CONFIRM",
  "pull-live-scrydex",
  "SCRYDEX_SMOKE_QUERY",
  "Charizard",
  "loadLocalEnv",
  ".env.production.local",
  "readsIgnoredEnvFiles",
  "/pokemon/v1/cards",
  "X-Api-Key",
  "X-Team-ID",
  "scrydex_smoke_dry_run",
  "scrydex_smoke_pulled",
  "readonly: true",
  "writesWordPressData: false",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
  "summarizeCard",
  "sanitizeValue",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing ScryDex live smoke marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "wp_remote_request",
  "wp eval",
  "wp plugin",
  "wp db",
  "insert",
  "update_option",
  "console.log(process.env.SCRYDEX_API_KEY",
  "console.log(process.env.SCRYDEX_PRIMARY_API_KEY",
  "console.log(process.env.SCRYDEX_TEAM_ID",
  "console.log(body",
  "JSON.stringify(body",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden ScryDex live smoke marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS ScryDex live smoke contract")
