import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const routeCheckSource = await readFile(
  path.join(root, "scripts/staging-check-routes.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:route-check"],
  "node scripts/staging-check-routes.mjs",
  "staging route-check script must be available through npm",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/staging-route-check-contract.mjs",
  ),
  "staging route-check contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_SITE_URL",
  "staging_route_check",
  "/wp-json/",
  "/wp-json/tcg-store/v1/health",
  "/wp-json/tcg-store/v1/offline/connector-manifest",
  "tcg-store/v1",
  "rest_no_route",
  "offline_connector_manifest",
  "credentials_synced_to_app: false",
  "x-robots-tag",
  "noindex",
  "Route is not registered",
]) {
  assert.ok(routeCheckSource.includes(requiredMarker), `Missing route-check marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "PUG_STAGING_SSH_PASSWORD",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_HOST",
  "wp-login.php",
  "Authorization",
  "password",
]) {
  assert.equal(
    routeCheckSource.includes(forbiddenMarker),
    false,
    `Forbidden route-check marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging route check contract")
