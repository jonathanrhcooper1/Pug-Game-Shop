import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..", "..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-run-migration-rehearsal.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:migration-rehearsal"],
  "node scripts/staging-run-migration-rehearsal.mjs",
)
assert.ok(packageJson.devDependencies.ssh2, "ssh2 dev dependency is required for SSH/SFTP rehearsal")
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/staging-migration-rehearsal-contract.mjs",
  ),
  "staging migration rehearsal contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "PUG_STAGING_CONFIRM_MIGRATION_REHEARSAL",
  "run-staging-migration-rehearsal",
  "PUG_STAGING_BACKUP_CONFIRMED",
  "backup-complete",
  "PUG_STAGING_BACKUP_REFERENCE",
  "PUG_STAGING_WP_PATH",
  "PUG_STAGING_WP_CLI",
  "PUG_STAGING_REMOTE_REHEARSAL_DIR",
  "wordpress-migration-rehearsal.php",
  "TCG_ALLOW_DESTRUCTIVE_MIGRATION_REHEARSAL=1",
  "/html/wp-content/uploads",
  "eval-file",
  "staging_migration_rehearsal_dry_run",
  "staging_migration_rehearsal_passed",
  "executesWpCli: true",
  "destructiveMigrationRehearsal: true",
  "backupConfirmed: true",
  "backupReferenceProvided: true",
  "activatesPlugin: false",
  "overwritesActivePluginFiles: false",
  "deploysProduction: false",
  "credentialsPrinted: false",
  "cleansTemporaryRehearsalFile: true",
  "tempCleanupAttempted: true",
  "tempCleanupComplete: true",
  "redactReference",
  "fastPut",
  "sftp.unlink",
  "stdoutTail",
  "stderrTail",
]) {
  assert.ok(
    scriptSource.includes(requiredMarker),
    `Missing staging migration rehearsal marker: ${requiredMarker}`,
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
  "console.log(process.env.PUG_STAGING_BACKUP_REFERENCE",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden staging migration rehearsal marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging migration rehearsal contract")
