import { readFileSync } from "node:fs"
import { basename } from "node:path"
import { Client } from "ssh2"
import { stagingSshConnectConfig } from "./lib/staging-ssh.mjs"

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
const dryRun = process.argv.includes("--dry-run")
const remoteUploadDir = normalizeRemoteDir(
  process.env.PUG_STAGING_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads",
)
const remoteRunnerPath = `${remoteUploadDir}/pending-migrations-${timestampForRemoteName(new Date())}.php`
const wpPath = process.env.PUG_STAGING_WP_PATH ?? "/html"
const wpCli = process.env.PUG_STAGING_WP_CLI ?? "wp"
const backupFileName = `pug-staging-before-migrations-${timestampForRemoteName(new Date())}.sql`

const requiredEnv = {
  PUG_STAGING_SSH_HOST: process.env.PUG_STAGING_SSH_HOST,
  PUG_STAGING_SSH_USER: process.env.PUG_STAGING_SSH_USER,
  PUG_STAGING_SSH_PASSWORD: process.env.PUG_STAGING_SSH_PASSWORD,
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "staging_pending_migrations_dry_run",
        remoteRunnerPath,
        wpPath,
        wpCli,
        packageVersion: packageJson.version,
        requiresEnv: [
          "PUG_STAGING_SSH_HOST",
          "PUG_STAGING_SSH_USER",
          "PUG_STAGING_SSH_PASSWORD",
          "PUG_STAGING_CONFIRM_PENDING_MIGRATIONS",
        ],
        createsStagingDatabaseBackup: true,
        backupLocation: "$HOME/tcg-staging-backups",
        runsPluginMigrationRunner: true,
        deploysProduction: false,
        credentialsPrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing staging pending migration environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_STAGING_CONFIRM_PENDING_MIGRATIONS !== "run-staging-pending-migrations") {
  throw new Error(
    "Set PUG_STAGING_CONFIRM_PENDING_MIGRATIONS=run-staging-pending-migrations to run staging migrations.",
  )
}

const runnerSource = `<?php
if (!defined('WP_ENVIRONMENT_TYPE') || 'staging' !== WP_ENVIRONMENT_TYPE) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'staging_environment_required'));
	exit(1);
}
if (!class_exists('TCGStorePlatform\\\\Migrations\\\\MigrationRunner') || !class_exists('TCGStorePlatform\\\\Version')) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
	exit(1);
}
$runner = new TCGStorePlatform\\Migrations\\MigrationRunner();
$before = $runner->current_version();
$applied = $runner->migrate();
$after = $runner->current_version();
global $wpdb;
$reference_table = $wpdb->prefix . 'tcg_reference_cards';
$front_column = $wpdb->get_var($wpdb->prepare('SHOW COLUMNS FROM ' . $reference_table . ' LIKE %s', 'front_image_url'));
$back_column = $wpdb->get_var($wpdb->prepare('SHOW COLUMNS FROM ' . $reference_table . ' LIKE %s', 'back_image_url'));
echo wp_json_encode(array(
	'action' => 'staging_pending_migrations_ran',
	'status' => 'ok',
	'before_version' => $before,
	'after_version' => $after,
	'target_version' => TCGStorePlatform\\Version::DATABASE,
	'applied_versions' => $applied,
	'reference_image_columns_present' => null !== $front_column && null !== $back_column,
	'deploysProduction' => false,
	'credentialsPrinted' => false,
));
`

const result = await withStagingConnection(async (connection) => {
  await writeRemoteFile(connection, remoteRunnerPath, runnerSource)

  try {
    const backupCommand = [
      'BACKUP_DIR="$HOME/tcg-staging-backups"',
      "mkdir -p \"$BACKUP_DIR\"",
      `${shellQuote(wpCli)} db export "$BACKUP_DIR/${backupFileName}" --path=${shellQuote(wpPath)}`,
    ].join(" && ")
    const backup = await exec(connection, backupCommand)

    if (backup.code !== 0) {
      throw new Error(`Staging database backup failed: ${tailForLog(backup.stderr || backup.stdout)}`)
    }

    const migration = await exec(
      connection,
      `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
    )
    const parsed = parseJson(migration.stdout)

    return {
      action: "staging_pending_migrations_ran",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: migration.code,
      status: parsed?.status ?? "unknown",
      beforeVersion: parsed?.before_version ?? null,
      afterVersion: parsed?.after_version ?? null,
      targetVersion: parsed?.target_version ?? null,
      appliedVersions: parsed?.applied_versions ?? null,
      referenceImageColumnsPresent: parsed?.reference_image_columns_present ?? null,
      backupCreated: true,
      backupLocation: `$HOME/tcg-staging-backups/${backupFileName}`,
      runnerRemoved: false,
      deploysProduction: false,
      credentialsPrinted: false,
      stdoutTail: tailForLog(migration.stdout),
      stderrTail: tailForLog(migration.stderr),
    }
  } finally {
    await exec(connection, `rm -f ${shellQuote(remoteRunnerPath)}`)
  }
})

result.runnerRemoved = true

console.log(JSON.stringify(result, null, 2))

if (
  result.exitCode !== 0 ||
  result.status !== "ok" ||
  result.afterVersion !== result.targetVersion ||
  result.referenceImageColumnsPresent !== true
) {
  process.exitCode = 1
}

function withStagingConnection(callback) {
  const connection = new Client()

  return new Promise((resolveResult, reject) => {
    connection
      .on("ready", async () => {
        try {
          resolveResult(await callback(connection))
        } catch (error) {
          reject(error)
        } finally {
          connection.end()
        }
      })
      .on("error", reject)
      .connect(stagingSshConnectConfig(requiredEnv))
  })
}

function writeRemoteFile(connection, remotePath, content) {
  return new Promise((resolveResult, reject) => {
    connection.sftp((sftpError, sftp) => {
      if (sftpError) {
        reject(sftpError)
        return
      }

      sftp.open(remotePath, "w", 0o600, (openError, handle) => {
        if (openError) {
          sftp.end()
          reject(openError)
          return
        }

        const buffer = Buffer.from(content, "utf8")
        sftp.write(handle, buffer, 0, buffer.length, 0, (writeError) => {
          sftp.close(handle, () => {
            sftp.end()
            if (writeError) {
              reject(writeError)
              return
            }

            resolveResult()
          })
        })
      })
    })
  })
}

function exec(connection, command) {
  return new Promise((resolveResult, reject) => {
    connection.exec(command, (error, stream) => {
      if (error) {
        reject(error)
        return
      }

      let stdout = ""
      let stderr = ""

      stream.on("data", (chunk) => {
        stdout += chunk.toString()
      })
      stream.stderr.on("data", (chunk) => {
        stderr += chunk.toString()
      })
      stream.on("close", (code) => {
        resolveResult({ code, stdout, stderr })
      })
    })
  })
}

function parseJson(value) {
  try {
    return JSON.parse(value.trim())
  } catch {
    return null
  }
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
