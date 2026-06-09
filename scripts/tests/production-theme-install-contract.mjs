import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/production-install-storefront-theme.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["production:install-theme"],
  "node scripts/production-install-storefront-theme.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes("node scripts/tests/production-theme-install-contract.mjs"),
)

for (const requiredMarker of [
  "production_storefront_theme_install_dry_run",
  "production_storefront_theme_installed",
  "package:wordpress-theme",
  "pug-arcade-commerce-v2",
  "PUG_PROD_SSH_HOST",
  "PUG_PROD_SSH_USER",
  "PUG_PROD_SSH_PASSWORD",
  "PUG_PROD_CONFIRM_THEME_INSTALL",
  "install-storefront-theme",
  ".env.production.local",
  "theme install",
  "--force --activate",
  "theme is-active",
  "createsWpContentBackup",
  "changesActiveTheme: true",
  "productionApprovalRequired: true",
  "credentialsPrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing production theme install marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_PROD_SSH_PASSWORD",
  "credentialsPrinted: true",
  "rawContentPrinted: true",
  "wp db reset",
  "wp db import",
  "rm -rf",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden production theme install marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS production theme install contract")
