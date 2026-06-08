import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..", "..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-upload-wordpress-package.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:upload-package"],
  "node scripts/staging-upload-wordpress-package.mjs",
)
assert.ok(packageJson.devDependencies.ssh2, "ssh2 dev dependency is required for SFTP upload")

for (const requiredMarker of [
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "PUG_STAGING_CONFIRM_UPLOAD",
  "upload-to-staging",
  "PUG_STAGING_REMOTE_UPLOAD_DIR",
  "/html/wp-content/uploads",
  "staging_plugin_package_uploaded",
  "staging_plugin_package_upload_dry_run",
  "uploadOnly: true",
  "activatesPlugin: false",
  "overwritesActivePluginFiles: false",
  "credentialsPrinted: false",
  "fastPut",
  "sftp.stat",
  "sizeMatched",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing staging upload marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "wp plugin activate",
  "wp plugin install",
  "wp plugin update",
  "rm -rf",
  "delete",
  "unlink",
  "console.log(process.env.PUG_STAGING_SSH_PASSWORD",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden staging upload marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging upload contract")
