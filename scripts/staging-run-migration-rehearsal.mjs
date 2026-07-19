import { existsSync, statSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"
import { stagingSshConnectConfig } from "./lib/staging-ssh.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const localRehearsalPath = resolve(
  root,
  process.env.PUG_STAGING_MIGRATION_REHEARSAL_FILE ??
    "apps/wordpress-plugin/tests/wordpress-migration-rehearsal.php",
)
const remoteRehearsalDir = normalizeRemoteDir(
  process.env.PUG_STAGING_REMOTE_REHEARSAL_DIR ?? "/html/wp-content/uploads",
)
const remoteRehearsalPath = `${remoteRehearsalDir}/wordpress-migration-rehearsal-${timestampForRemoteName(
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

if (!existsSync(localRehearsalPath)) {
  throw new Error(`Missing local migration rehearsal file: ${localRehearsalPath}`)
}

const rehearsalSize = statSync(localRehearsalPath).size

if (rehearsalSize <= 0) {
  throw new Error(`Migration rehearsal file is empty: ${localRehearsalPath}`)
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missingEnv.length > 0) {
  throw new Error(`Missing staging migration rehearsal environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_STAGING_CONFIRM_MIGRATION_REHEARSAL !== "run-staging-migration-rehearsal") {
  throw new Error(
    "Set PUG_STAGING_CONFIRM_MIGRATION_REHEARSAL=run-staging-migration-rehearsal to run staging migration rehearsal.",
  )
}

if (process.env.PUG_STAGING_BACKUP_CONFIRMED !== "backup-complete") {
  throw new Error("Set PUG_STAGING_BACKUP_CONFIRMED=backup-complete after creating a staging database backup.")
}

if (!process.env.PUG_STAGING_BACKUP_REFERENCE) {
  throw new Error("Set PUG_STAGING_BACKUP_REFERENCE to the staging backup or clone reference.")
}

const wpCommand = [
  "TCG_ALLOW_DESTRUCTIVE_MIGRATION_REHEARSAL=1",
  shellQuote(wpCli),
  "eval-file",
  shellQuote(remoteRehearsalPath),
  `--path=${shellQuote(wpPath)}`,
].join(" ")

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "staging_migration_rehearsal_dry_run",
        localRehearsalFile: basename(localRehearsalPath),
        localSizeBytes: rehearsalSize,
        remoteRehearsalPath,
        wpPath,
        wpCliCommand: wpCommand,
        executesWpCli: true,
        uploadsTemporaryRehearsalFile: true,
        cleansTemporaryRehearsalFile: true,
        destructiveMigrationRehearsal: true,
        backupConfirmed: true,
        backupReferenceProvided: true,
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

        sftp.fastPut(localRehearsalPath, remoteRehearsalPath, (uploadError) => {
          if (uploadError) {
            connection.end()
            reject(uploadError)
            return
          }

          connection.exec(wpCommand, (execError, stream) => {
            if (execError) {
              cleanupUploadedRehearsal(connection, sftp, remoteRehearsalPath)
                .then((cleanupResult) => {
                  execError.message = `${execError.message} Temporary rehearsal cleanup attempted: ${cleanupResult.tempCleanupAttempted}.`
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
                cleanupUploadedRehearsal(connection, sftp, remoteRehearsalPath)
                  .then((cleanupResult) => {
                    if (exitCode !== 0) {
                      reject(
                        new Error(
                          `Staging migration rehearsal failed with exit code ${exitCode}: ${tailForLog(
                            stderr || stdout,
                          )}`,
                        ),
                      )
                      return
                    }

                    resolveResult({
                      action: "staging_migration_rehearsal_passed",
                      localRehearsalFile: basename(localRehearsalPath),
                      remoteRehearsalPath,
                      wpPath,
                      exitCode,
                      stdoutTail: tailForLog(stdout),
                      stderrTail: tailForLog(stderr),
                      ...cleanupResult,
                      uploadsTemporaryRehearsalFile: true,
                      cleansTemporaryRehearsalFile: true,
                      destructiveMigrationRehearsal: true,
                      backupReference: redactReference(process.env.PUG_STAGING_BACKUP_REFERENCE),
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
    .connect(stagingSshConnectConfig(requiredEnv))
})

console.log(JSON.stringify(result, null, 2))

function cleanupUploadedRehearsal(connection, sftp, path) {
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

function redactReference(value) {
  const text = String(value ?? "").trim()
  if (text.length <= 8) {
    return text ? "[set]" : ""
  }

  return `${text.slice(0, 4)}...${text.slice(-4)}`
}
