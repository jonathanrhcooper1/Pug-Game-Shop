import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..", "..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(
  path.join(root, "scripts/staging-run-search-benchmark.mjs"),
  "utf8",
)

assert.equal(
  packageJson.scripts["staging:search-benchmark"],
  "node scripts/staging-run-search-benchmark.mjs",
)
assert.ok(packageJson.devDependencies.ssh2, "ssh2 dev dependency is required for SSH/SFTP benchmark")
assert.ok(
  packageJson.scripts["test:packaging"].includes(
    "node scripts/tests/staging-search-benchmark-contract.mjs",
  ),
  "staging search benchmark contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
  "PUG_STAGING_CONFIRM_SEARCH_BENCHMARK",
  "run-staging-search-benchmark",
  "PUG_STAGING_BENCHMARK_ROW_ACK",
  "seed-50000-staging-rows",
  "PUG_STAGING_SEARCH_BENCHMARK_KEEP_ROWS",
  "PUG_STAGING_SEARCH_BENCHMARK_MAX_MS",
  "PUG_STAGING_WP_PATH",
  "PUG_STAGING_WP_CLI",
  "PUG_STAGING_REMOTE_BENCHMARK_DIR",
  "wordpress-inventory-search-benchmark.php",
  "TCG_ALLOW_INVENTORY_SEARCH_BENCHMARK=1",
  "TCG_INVENTORY_SEARCH_BENCHMARK_CLEANUP",
  "/html/wp-content/uploads",
  "eval-file",
  "staging_inventory_search_benchmark_dry_run",
  "staging_inventory_search_benchmark_passed",
  "executesWpCli: true",
  "seedsFixtureRows: 50000",
  "cleanupFixtureRows",
  "benchmarkRowAcknowledged: true",
  "activatesPlugin: false",
  "overwritesActivePluginFiles: false",
  "deploysProduction: false",
  "credentialsPrinted: false",
  "cleansTemporaryBenchmarkFile: true",
  "tempCleanupAttempted: true",
  "tempCleanupComplete: true",
  "fastPut",
  "sftp.unlink",
  "stdoutTail",
  "stderrTail",
]) {
  assert.ok(
    scriptSource.includes(requiredMarker),
    `Missing staging search benchmark marker: ${requiredMarker}`,
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
    `Forbidden staging search benchmark marker found: ${forbiddenMarker}`,
  )
}

console.log("PASS staging search benchmark contract")
