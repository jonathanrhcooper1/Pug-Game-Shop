import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-install-wordpress-package.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:install-package"],
  "node scripts/production-install-wordpress-package.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes("node scripts/tests/production-install-contract.mjs"),
)

for (const requiredMarker of [
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_INSTALL",
  "install-to-production",
  ".env.production.local",
  "production_plugin_package_install_dry_run",
  "production_plugin_package_installed",
  "wp-content",
  "db export",
  "$HOME/tcg-production-backups",
  "plugin install",
  "--force --activate",
  "plugin is-active",
  "TCGStorePlatform\\\\Migrations\\\\MigrationRunner",
  "scrydex_catalog_status_route_registered",
  "scrydex_catalog_index_route_registered",
  "backupCreated: true",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production install marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_PROD_SSH_PASSWORD",
  "credentialsPrinted: true",
  "wp plugin delete",
  "rm -rf",
  "wp db reset",
  "wp db import",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production install marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production install contract")
