import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..", "..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-install-wordpress-package.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:install-package"],
  "node scripts/staging-install-wordpress-package.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes("node scripts/tests/staging-install-contract.mjs"),
  "staging install contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "PUG_STAGING_CONFIRM_INSTALL",
  "install-to-staging",
  "PUG_STAGING_REMOTE_UPLOAD_DIR",
  "PUG_STAGING_PLUGIN_ZIP",
  "/html/wp-content/uploads",
  "PUG_STAGING_PLUGIN_SLUG",
  "tcg-store-platform",
  "PUG_STAGING_PLUGIN_FILE",
  "tcg-store-platform/tcg-store-platform.php",
  "staging_plugin_package_install_dry_run",
  "staging_plugin_package_installed",
  "buildsFreshPackageFromSource",
  "builtFreshPackageFromSource",
  "customPackageZipProvided",
  "uploadThenInstall: true",
  "activatesPlugin: true",
  "overwritesActivePluginFiles: true",
  "productionAllowed: false",
  "credentialsPrinted: false",
  "wp plugin install",
  "--force --activate",
  "wp plugin is-active",
  "wp plugin list --format=json --fields=name,status,version,title",
  "fastPut",
  "sftp.stat",
  "sizeMatched",
  "stagingSshConnectConfig(requiredEnv)",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing staging install marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "wp plugin delete",
  "rm -rf",
  "console.log(process.env.PUG_STAGING_SSH_PASSWORD",
  "credentialsPrinted: true",
  "productionAllowed: true",
  "activatesPlugin: false",
]) {
  assert.equal(scriptSource.includes(forbiddenMarker), false, `Forbidden staging install marker found: ${forbiddenMarker}`)
}

console.log("PASS staging install contract")
