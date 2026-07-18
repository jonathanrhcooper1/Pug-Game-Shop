import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..", "..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-run-inventory-smoke.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:inventory-smoke"],
  "node scripts/staging-run-inventory-smoke.mjs",
)
assert.ok(packageJson.devDependencies.ssh2, "ssh2 dev dependency is required for SSH/SFTP smoke")
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/staging-inventory-smoke-contract.mjs",
  ),
  "staging inventory smoke contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "PUG_STAGING_CONFIRM_SMOKE",
  "run-staging-inventory-smoke",
  "PUG_STAGING_WP_PATH",
  "PUG_STAGING_WP_CLI",
  "PUG_STAGING_REMOTE_SMOKE_DIR",
  "wordpress-staging-inventory-smoke.php",
  "/html/wp-content/uploads",
  "eval-file",
  "staging_inventory_smoke_dry_run",
  "staging_inventory_smoke_passed",
  "executesWpCli: true",
  "activatesPlugin: false",
  "overwritesActivePluginFiles: false",
  "deploysProduction: false",
  "credentialsPrinted: false",
  "cleansTemporarySmokeFile: true",
  "tempCleanupAttempted: true",
  "tempCleanupComplete: true",
  "fastPut",
  "sftp.unlink",
  "stdoutTail",
  "stderrTail",
  "stagingSshConnectConfig(requiredEnv)",
]) {
  assert.ok(
    scriptSource.includes(requiredMarker),
    `Missing staging inventory smoke marker: ${requiredMarker}`,
  )
}

for (const forbiddenMarker of [
  "wp plugin activate",
  "wp plugin install",
  "wp plugin update",
  "wp db",
  "wp eval ",
  "rm -rf",
  "deploy production",
  "console.log(process.env.PUG_STAGING_SSH_PASSWORD",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden staging inventory smoke marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging inventory smoke contract")
