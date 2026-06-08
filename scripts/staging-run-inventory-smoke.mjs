import { existsSync, statSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const localSmokePath = resolve(
  root,
  process.env.PUG_STAGING_INVENTORY_SMOKE_FILE ??
    "apps/wordpress-plugin/tests/wordpress-staging-inventory-smoke.php",
)
const remoteSmokeDir = normalizeRemoteDir(
  process.env.PUG_STAGING_REMOTE_SMOKE_DIR ?? "/html/wp-content/uploads",
)
const remoteSmokePath = `${remoteSmokeDir}/wordpress-staging-inventory-smoke-${timestampForRemoteName(
  new Date(),
)}.php`
const wpPath = process.env.PUG_STAGING_WP_PATH ?? "/html"
const wpCli = process.env.PUG_STAGING_WP_CLI ?? "wp"
const dryRun = process.argv.includes("--dry-run")

const requiredEnv = {
  PUG_STAGING_SSH_HOST: process.env.PUG_STAGING_SSH_HOST,
  PUG_STAGING_SSH_USER: process.env.PUG_STAGING_SSH_USER,
  PUG_STAGING_SSH_PASSWORD: process.env.PUG_STAGING_SSH_PASSWORD,
}

if (!existsSync(localSmokePath)) {
  throw new Error(`Missing local staging smoke file: ${localSmokePath}`)
}

const smokeSize = statSync(localSmokePath).size

if (smokeSize <= 0) {
  throw new Error(`Staging smoke file is empty: ${localSmokePath}`)
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missingEnv.length > 0) {
  throw new Error(`Missing staging smoke environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_STAGING_CONFIRM_SMOKE !== "run-staging-inventory-smoke") {
  throw new Error("Set PUG_STAGING_CONFIRM_SMOKE=run-staging-inventory-smoke to run staging smoke.")
}

const wpCommand = [
  shellQuote(wpCli),
  "eval-file",
  shellQuote(remoteSmokePath),
  `--path=${shellQuote(wpPath)}`,
].join(" ")

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "staging_inventory_smoke_dry_run",
        localSmokeFile: basename(localSmokePath),
        localSizeBytes: smokeSize,
        remoteSmokePath,
        wpPath,
        wpCliCommand: wpCommand,
        executesWpCli: true,
        uploadsTemporarySmokeFile: true,
        cleansTemporarySmokeFile: true,
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

        sftp.fastPut(localSmokePath, remoteSmokePath, (uploadError) => {
          if (uploadError) {
            connection.end()
            reject(uploadError)
            return
          }

          connection.exec(wpCommand, (execError, stream) => {
            if (execError) {
              cleanupUploadedSmoke(connection, sftp, remoteSmokePath)
                .then((cleanupResult) => {
                  execError.message = `${execError.message} Temporary smoke cleanup attempted: ${cleanupResult.tempCleanupAttempted}.`
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
                cleanupUploadedSmoke(connection, sftp, remoteSmokePath)
                  .then((cleanupResult) => {
                    if (exitCode !== 0) {
                      reject(
                        new Error(
                          `Staging inventory smoke failed with exit code ${exitCode}: ${tailForLog(
                            stderr || stdout,
                          )}`,
                        ),
                      )
                      return
                    }

                    resolveResult({
                      action: "staging_inventory_smoke_passed",
                      localSmokeFile: basename(localSmokePath),
                      remoteSmokePath,
                      wpPath,
                      exitCode,
                      stdoutTail: tailForLog(stdout),
                      stderrTail: tailForLog(stderr),
                      ...cleanupResult,
                      uploadsTemporarySmokeFile: true,
                      cleansTemporarySmokeFile: true,
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

function cleanupUploadedSmoke(connection, sftp, path) {
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
