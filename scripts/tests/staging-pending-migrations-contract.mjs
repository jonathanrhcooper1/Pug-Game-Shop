import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-run-pending-migrations.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:run-pending-migrations"],
  "node scripts/staging-run-pending-migrations.mjs",
)
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/staging-pending-migrations-contract.mjs",
  ),
)

for (const requiredMarker of [
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "PUG_STAGING_CONFIRM_PENDING_MIGRATIONS",
  "run-staging-pending-migrations",
  "staging_pending_migrations_dry_run",
  "staging_pending_migrations_ran",
  "db export",
  "$HOME/tcg-staging-backups",
  "eval-file",
  "TCGStorePlatform\\\\Migrations\\\\MigrationRunner",
  "TCGStorePlatform\\\\Version",
  "reference_image_columns_present",
  "front_image_url",
  "back_image_url",
  "backupCreated: true",
  "deploysProduction: false",
  "credentialsPrinted: false",
  "runnerRemoved",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing pending migration marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log(process.env.PUG_STAGING_SSH_PASSWORD",
  "wp plugin activate",
  "wp plugin install",
  "wp plugin update",
  "wp db reset",
  "wp db import",
  "rm -rf",
  "deploy production",
  "credentialsPrinted: true",
  "deploysProduction: true",
]) {
  assert.equal(
    scriptSource.includes(forbiddenMarker),
    false,
    `Forbidden pending migration marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging pending migrations contract")
