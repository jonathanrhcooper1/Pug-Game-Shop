import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-configure-inventory-runtime.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:configure-inventory-runtime"],
  "node scripts/staging-configure-inventory-runtime.mjs",
  "staging inventory runtime configuration script must be available through npm",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/staging-inventory-runtime-config-contract.mjs",
  ),
  "staging inventory runtime configuration contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "PUG_STAGING_CONFIRM_INVENTORY_RUNTIME",
  "configure-staging-inventory-runtime",
  "PUG_STAGING_INVENTORY_PRICING_ENABLED",
  "PUG_STAGING_INVENTORY_STAFF_SEARCH_ENABLED",
  "PUG_STAGING_INVENTORY_STAFF_CREATE_ENABLED",
  "PUG_STAGING_INVENTORY_PUBLIC_SEARCH_ENABLED",
  "staging_inventory_runtime_configure_dry_run",
  "staging_inventory_runtime_configured",
  "staging_inventory_runtime_status_checked",
  "stream_get_contents(STDIN)",
  "wp eval-file",
  "TCGStorePlatform\\\\Settings\\\\Settings",
  "TCGStorePlatform\\\\FeatureFlags\\\\FeatureFlags",
  "InventoryRouteDependencyFactory::from_settings",
  "inventory_pricing",
  "staff_search_route_enabled",
  "staff_create_route_enabled",
  "public_search_route_enabled",
  "next_request_registers_routes",
  "writesWordPressSettings",
  "writesWordPressData: false",
  "deploysProduction: false",
  "credentialsPrinted: false",
  "runnerRemoved",
]) {
  assert.ok(
    scriptSource.includes(requiredMarker),
    `Missing inventory runtime config marker: ${requiredMarker}`,
  )
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_STAGING_SSH_PASSWORD",
  "wp plugin activate",
  "wp plugin install",
  "wp plugin update",
  "wp db",
  "wp eval ",
  "rm -rf",
  "deploy production",
  "credentialsPrinted: true",
  "writesWordPressData: true",
  "deploysProduction: true",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden inventory runtime config marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging inventory runtime configuration contract")
