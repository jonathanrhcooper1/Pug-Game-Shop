import { existsSync, statSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const localBenchmarkPath = resolve(
  root,
  process.env.PUG_STAGING_SEARCH_BENCHMARK_FILE ??
    "apps/wordpress-plugin/tests/wordpress-inventory-search-benchmark.php",
)
const remoteBenchmarkDir = normalizeRemoteDir(
  process.env.PUG_STAGING_REMOTE_BENCHMARK_DIR ?? "/html/wp-content/uploads",
)
const remoteBenchmarkPath = `${remoteBenchmarkDir}/wordpress-inventory-search-benchmark-${timestampForRemoteName(
  new Date(),
)}.php`
const wpPath = process.env.PUG_STAGING_WP_PATH ?? "/html"
const wpCli = process.env.PUG_STAGING_WP_CLI ?? "wp"
const dryRun = process.argv.includes("--dry-run")
const cleanupRows = process.env.PUG_STAGING_SEARCH_BENCHMARK_KEEP_ROWS === "keep" ? "0" : "1"
const maxElapsedMs = process.env.PUG_STAGING_SEARCH_BENCHMARK_MAX_MS

const requiredEnv = {
  PUG_STAGING_SSH_HOST: process.env.PUG_STAGING_SSH_HOST,
  PUG_STAGING_SSH_USER: process.env.PUG_STAGING_SSH_USER,
  PUG_STAGING_SSH_PASSWORD: process.env.PUG_STAGING_SSH_PASSWORD,
}

if (!existsSync(localBenchmarkPath)) {
  throw new Error(`Missing local inventory search benchmark file: ${localBenchmarkPath}`)
}

const benchmarkSize = statSync(localBenchmarkPath).size

if (benchmarkSize <= 0) {
  throw new Error(`Inventory search benchmark file is empty: ${localBenchmarkPath}`)
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missingEnv.length > 0) {
  throw new Error(`Missing staging search benchmark environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_STAGING_CONFIRM_SEARCH_BENCHMARK !== "run-staging-search-benchmark") {
  throw new Error(
    "Set PUG_STAGING_CONFIRM_SEARCH_BENCHMARK=run-staging-search-benchmark to run staging search benchmark.",
  )
}

if (process.env.PUG_STAGING_BENCHMARK_ROW_ACK !== "seed-50000-staging-rows") {
  throw new Error(
    "Set PUG_STAGING_BENCHMARK_ROW_ACK=seed-50000-staging-rows to acknowledge the staging benchmark fixture.",
  )
}

const commandEnvironment = [
  "TCG_ALLOW_INVENTORY_SEARCH_BENCHMARK=1",
  `TCG_INVENTORY_SEARCH_BENCHMARK_CLEANUP=${cleanupRows}`,
]

if (maxElapsedMs) {
  commandEnvironment.push(`TCG_INVENTORY_SEARCH_BENCHMARK_MAX_MS=${shellQuote(maxElapsedMs)}`)
}

const wpCommand = [
  ...commandEnvironment,
  shellQuote(wpCli),
  "eval-file",
  shellQuote(remoteBenchmarkPath),
  `--path=${shellQuote(wpPath)}`,
].join(" ")

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "staging_inventory_search_benchmark_dry_run",
        localBenchmarkFile: basename(localBenchmarkPath),
        localSizeBytes: benchmarkSize,
        remoteBenchmarkPath,
        wpPath,
        wpCliCommand: wpCommand,
        executesWpCli: true,
        uploadsTemporaryBenchmarkFile: true,
        cleansTemporaryBenchmarkFile: true,
        seedsFixtureRows: 50000,
        cleanupFixtureRows: cleanupRows === "1",
        benchmarkRowAcknowledged: true,
        activatesPlugin: false,
        overwritesActivePluginFiles: false,
        deploysProduction: false,
        credentialsPrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const connection = new Client()

const result = await new Promise((resolveResult, reject) => {
  connection
    .on("ready", () => {
      connection.sftp((sftpError, sftp) => {
        if (sftpError) {
          connection.end()
          reject(sftpError)
          return
        }

        sftp.fastPut(localBenchmarkPath, remoteBenchmarkPath, (uploadError) => {
          if (uploadError) {
            connection.end()
            reject(uploadError)
            return
          }

          connection.exec(wpCommand, (execError, stream) => {
            if (execError) {
              cleanupUploadedBenchmark(connection, sftp, remoteBenchmarkPath)
                .then((cleanupResult) => {
                  execError.message = `${execError.message} Temporary benchmark cleanup attempted: ${cleanupResult.tempCleanupAttempted}.`
                  reject(execError)
                })
                .catch(reject)
              return
            }

            let stdout = ""
            let stderr = ""
            let exitCode = 1

            stream
              .on("close", (code) => {
                exitCode = typeof code === "number" ? code : 1
                cleanupUploadedBenchmark(connection, sftp, remoteBenchmarkPath)
                  .then((cleanupResult) => {
                    if (exitCode !== 0) {
                      reject(
                        new Error(
                          `Staging inventory search benchmark failed with exit code ${exitCode}: ${tailForLog(
                            stderr || stdout,
                          )}`,
                        ),
                      )
                      return
                    }

                    resolveResult({
                      action: "staging_inventory_search_benchmark_passed",
                      localBenchmarkFile: basename(localBenchmarkPath),
                      remoteBenchmarkPath,
                      wpPath,
                      exitCode,
                      stdoutTail: tailForLog(stdout, 4000),
                      stderrTail: tailForLog(stderr),
                      ...cleanupResult,
                      uploadsTemporaryBenchmarkFile: true,
                      cleansTemporaryBenchmarkFile: true,
                      seedsFixtureRows: 50000,
                      cleanupFixtureRows: cleanupRows === "1",
                      activatesPlugin: false,
                      overwritesActivePluginFiles: false,
                      deploysProduction: false,
                      credentialsPrinted: false,
                    })
                  })
                  .catch(reject)
              })
              .on("data", (data) => {
                stdout += data.toString()
              })

            stream.stderr.on("data", (data) => {
              stderr += data.toString()
            })
          })
        })
      })
    })
    .on("error", reject)
    .connect({
      host: requiredEnv.PUG_STAGING_SSH_HOST,
      username: requiredEnv.PUG_STAGING_SSH_USER,
      password: requiredEnv.PUG_STAGING_SSH_PASSWORD,
      readyTimeout: 20000,
    })
})

console.log(JSON.stringify(result, null, 2))

function cleanupUploadedBenchmark(connection, sftp, path) {
  return new Promise((resolveCleanup, rejectCleanup) => {
    sftp.unlink(path, (unlinkError) => {
      connection.end()
      if (unlinkError) {
        rejectCleanup(unlinkError)
        return
      }

      resolveCleanup({
        tempCleanupAttempted: true,
        tempCleanupComplete: true,
      })
    })
  })
}

function normalizeRemoteDir(value) {
  return `/${String(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}

function tailForLog(value, maxLength = 2000) {
  const text = String(value ?? "").trim()
  return text.length > maxLength ? text.slice(-maxLength) : text
}
