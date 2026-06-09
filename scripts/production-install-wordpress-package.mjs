import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"
import { STAGING_SSH_ALGORITHMS } from "./lib/staging-ssh.mjs"
import { loadLocalEnv } from "./lib/local-env.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
loadLocalEnv([resolve(root, ".env.production.local"), resolve(root, ".env.local")])

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const defaultPackagePath = resolve(root, "dist", `tcg-store-platform-${packageJson.version}.zip`)
const localPackagePath = resolve(root, process.env.PUG_PROD_PLUGIN_ZIP ?? defaultPackagePath)
const uploadDir = normalizeRemoteDir(process.env.PUG_PROD_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteFileName =
  process.env.PUG_PROD_REMOTE_FILE ??
  `tcg-store-platform-${packageJson.version}-${timestampForRemoteName(new Date())}.zip`
const remotePath = `${uploadDir}/${remoteFileName}`
const pluginSlug = process.env.PUG_PROD_PLUGIN_SLUG ?? "tcg-store-platform"
const pluginFile = process.env.PUG_PROD_PLUGIN_FILE ?? "tcg-store-platform/tcg-store-platform.php"
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const backupWpContent = envFlag(process.env.PUG_PROD_BACKUP_WP_CONTENT, true)
const dryRun = process.argv.includes("--dry-run")
const databaseBackupFileName = `pug-production-before-plugin-${timestampForRemoteName(new Date())}.sql`
const wpContentBackupFileName = `pug-production-wp-content-${timestampForRemoteName(new Date())}.tgz`
const remoteRunnerPath = `${uploadDir}/production-migrations-${timestampForRemoteName(new Date())}.php`

const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

if (!existsSync(localPackagePath) && !dryRun) {
  execFileSync(npmCommand(), ["run", "package:wordpress"], {
    cwd: root,
    stdio: "inherit",
  })
}

const packageExists = existsSync(localPackagePath)
const packageSize = packageExists ? statSync(localPackagePath).size : 0

if (!dryRun && packageSize <= 0) {
  throw new Error(`WordPress plugin package is empty: ${localPackagePath}`)
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_plugin_package_install_dry_run",
        localPackage: localPackagePath,
        localSizeBytes: packageSize,
        localPackageExists: packageExists,
        remotePath,
        pluginSlug,
        pluginFile,
        wpPath,
        wpCli,
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_INSTALL",
        ],
        optionalEnv: [
          "PUG_PROD_PLUGIN_ZIP",
          "PUG_PROD_REMOTE_UPLOAD_DIR",
          "PUG_PROD_WP_PATH",
          "PUG_PROD_BACKUP_WP_CONTENT",
        ],
        readsIgnoredEnvFile: ".env.production.local",
        createsProductionDatabaseBackup: true,
        createsWpContentBackup: backupWpContent,
        backupLocation: "$HOME/tcg-production-backups",
        uploadThenInstall: true,
        activatesPlugin: true,
        runsPluginMigrationRunner: true,
        overwritesActivePluginFiles: true,
        productionApprovalRequired: true,
        credentialsPrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing production install environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_INSTALL !== "install-to-production") {
  throw new Error("Set PUG_PROD_CONFIRM_INSTALL=install-to-production to install the package on production.")
}

const runnerSource = `<?php
if (!class_exists('TCGStorePlatform\\\\Migrations\\\\MigrationRunner') || !class_exists('TCGStorePlatform\\\\Version')) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
	exit(1);
}
$runner = new TCGStorePlatform\\Migrations\\MigrationRunner();
$before = $runner->current_version();
$applied = $runner->migrate();
$after = $runner->current_version();
$routes = rest_get_server()->get_routes();
echo wp_json_encode(array(
	'action' => 'production_pending_migrations_ran',
	'status' => 'ok',
	'before_version' => $before,
	'after_version' => $after,
	'target_version' => TCGStorePlatform\\Version::DATABASE,
	'applied_versions' => $applied,
	'scrydex_catalog_status_route_registered' => isset($routes['/tcg-store/v1/scrydex/catalog/status']),
	'scrydex_catalog_index_route_registered' => isset($routes['/tcg-store/v1/scrydex/catalog/index']),
	'credentialsPrinted' => false,
));
`

const connection = new Client()

const result = await new Promise((resolveResult, reject) => {
  connection
    .on("ready", async () => {
      try {
        const backup = await execRemote(connection, backupCommand())

        if (backup.code !== 0) {
          throw new Error(`Production backup failed: ${tailForLog(backup.stderr || backup.stdout)}`)
        }

        await uploadFile(connection, localPackagePath, remotePath)
        await writeRemoteFile(connection, remoteRunnerPath, runnerSource)
        const remoteStats = await statRemoteFile(connection, remotePath)
        const install = await execRemote(
          connection,
          `${shellQuote(wpCli)} plugin install ${shellQuote(remotePath)} --force --activate --path=${shellQuote(wpPath)}`,
        )
        const active = await execRemote(
          connection,
          `${shellQuote(wpCli)} plugin is-active ${shellQuote(pluginSlug)} --path=${shellQuote(wpPath)}`,
        )
        const migration = await execRemote(
          connection,
          `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
        )
        const list = await execRemote(
          connection,
          `${shellQuote(wpCli)} plugin list --format=json --fields=name,status,version,title --path=${shellQuote(wpPath)}`,
        )
        const plugins = parseJson(list.stdout)
        const plugin = Array.isArray(plugins)
          ? plugins.find((item) => item.name === pluginSlug || item.name === pluginFile)
          : null
        const migrationResult = parseJson(migration.stdout)

        resolveResult({
          action: "production_plugin_package_installed",
          localPackage: basename(localPackagePath),
          localSizeBytes: packageSize,
          remotePath,
          remoteSizeBytes: remoteStats.size,
          sizeMatched: remoteStats.size === packageSize,
          pluginSlug,
          pluginFile,
          pluginTitle: plugin?.title ?? "Pug Game Shop Card Manager",
          pluginVersion: plugin?.version ?? null,
          pluginStatus: plugin?.status ?? null,
          active: active.code === 0,
          installExitCode: install.code,
          statusExitCode: active.code,
          migrationExitCode: migration.code,
          migrationStatus: migrationResult?.status ?? "unknown",
          beforeVersion: migrationResult?.before_version ?? null,
          afterVersion: migrationResult?.after_version ?? null,
          targetVersion: migrationResult?.target_version ?? null,
          scrydexCatalogStatusRouteRegistered:
            migrationResult?.scrydex_catalog_status_route_registered ?? null,
          scrydexCatalogIndexRouteRegistered:
            migrationResult?.scrydex_catalog_index_route_registered ?? null,
          backupCreated: true,
          databaseBackupLocation: `$HOME/tcg-production-backups/${databaseBackupFileName}`,
          wpContentBackupCreated: backupWpContent,
          wpContentBackupLocation: backupWpContent
            ? `$HOME/tcg-production-backups/${wpContentBackupFileName}`
            : null,
          runnerRemoved: false,
          uploadThenInstall: true,
          activatesPlugin: true,
          runsPluginMigrationRunner: true,
          overwritesActivePluginFiles: true,
          productionApprovalRequired: true,
          credentialsPrinted: false,
          stdoutTail: tailForLog(install.stdout),
          stderrTail: tailForLog(install.stderr || migration.stderr),
        })
      } catch (error) {
        reject(error)
      } finally {
        await execRemote(connection, `rm -f ${shellQuote(remoteRunnerPath)}`).catch(() => null)
        connection.end()
      }
    })
    .on("error", reject)
    .connect(productionSshConnectConfig(requiredEnv))
})

result.runnerRemoved = true

if (!result.sizeMatched) {
  throw new Error(
    `Uploaded package size mismatch: local ${result.localSizeBytes}, remote ${result.remoteSizeBytes}`,
  )
}

if (
  !result.active ||
  result.installExitCode !== 0 ||
  result.statusExitCode !== 0 ||
  result.migrationExitCode !== 0 ||
  result.migrationStatus !== "ok" ||
  result.afterVersion !== result.targetVersion
) {
  throw new Error(`Production plugin install did not complete cleanly for ${pluginSlug}.`)
}

console.log(JSON.stringify(result, null, 2))

function backupCommand() {
  const commands = [
    'BACKUP_DIR="$HOME/tcg-production-backups"',
    'mkdir -p "$BACKUP_DIR"',
    `${shellQuote(wpCli)} db export "$BACKUP_DIR/${databaseBackupFileName}" --path=${shellQuote(wpPath)}`,
  ]

  if (backupWpContent) {
    commands.push(`tar -czf "$BACKUP_DIR/${wpContentBackupFileName}" -C ${shellQuote(wpPath)} wp-content`)
  }

  return commands.join(" && ")
}

function productionSshConnectConfig(env, options = {}) {
  return {
    host: env.PUG_PROD_SSH_HOST,
    username: env.PUG_PROD_SSH_USER,
    password: env.PUG_PROD_SSH_PASSWORD,
    readyTimeout: options.readyTimeout ?? 20000,
    algorithms: STAGING_SSH_ALGORITHMS,
  }
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm"
}

function uploadFile(connection, localPath, remotePathValue) {
  return new Promise((resolveResult, reject) => {
    connection.sftp((sftpError, sftp) => {
      if (sftpError) {
        reject(sftpError)
        return
      }

      sftp.fastPut(localPath, remotePathValue, (uploadError) => {
        sftp.end()
        if (uploadError) {
          reject(uploadError)
          return
        }

        resolveResult()
      })
    })
  })
}

function writeRemoteFile(connection, remotePathValue, content) {
  return new Promise((resolveResult, reject) => {
    connection.sftp((sftpError, sftp) => {
      if (sftpError) {
        reject(sftpError)
        return
      }

      sftp.open(remotePathValue, "w", 0o600, (openError, handle) => {
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

function statRemoteFile(connection, remotePathValue) {
  return new Promise((resolveResult, reject) => {
    connection.sftp((sftpError, sftp) => {
      if (sftpError) {
        reject(sftpError)
        return
      }

      sftp.stat(remotePathValue, (statError, remoteStats) => {
        sftp.end()
        if (statError) {
          reject(statError)
          return
        }

        resolveResult(remoteStats)
      })
    })
  })
}

function execRemote(connection, command) {
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

function normalizeRemoteDir(value) {
  return `/${String(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`
}

function parseJson(value) {
  try {
    return JSON.parse(String(value).trim())
  } catch {
    return null
  }
}

function envFlag(value, fallback) {
  if (value === undefined) {
    return fallback
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase())
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}

function tailForLog(value, maxLength = 500) {
  const text = String(value ?? "").trim()
  return text.length > maxLength ? text.slice(-maxLength) : text
}
