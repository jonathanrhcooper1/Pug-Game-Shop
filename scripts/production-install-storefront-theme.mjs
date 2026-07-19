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
const themeSlug = process.env.PUG_PROD_THEME_SLUG ?? "pug-arcade-commerce-v2"
const defaultPackagePath = resolve(root, "dist", `${themeSlug}-${packageJson.version}.zip`)
const localPackagePath = resolve(root, process.env.PUG_PROD_THEME_ZIP ?? defaultPackagePath)
const uploadDir = normalizeRemoteDir(process.env.PUG_PROD_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteFileName =
  process.env.PUG_PROD_THEME_REMOTE_FILE ??
  `${themeSlug}-${packageJson.version}-${timestampForRemoteName(new Date())}.zip`
const remotePath = `${uploadDir}/${remoteFileName}`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const backupWpContent = envFlag(process.env.PUG_PROD_BACKUP_WP_CONTENT, true)
const dryRun = process.argv.includes("--dry-run")
const wpContentBackupFileName = `pug-production-before-theme-${timestampForRemoteName(new Date())}.tgz`

const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

if (!existsSync(localPackagePath) && !dryRun) {
  execFileSync(npmCommand(), ["run", "package:wordpress-theme"], {
    cwd: root,
    stdio: "inherit",
  })
}

const packageExists = existsSync(localPackagePath)
const packageSize = packageExists ? statSync(localPackagePath).size : 0

if (!dryRun && packageSize <= 0) {
  throw new Error(`WordPress theme package is empty: ${localPackagePath}`)
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_storefront_theme_install_dry_run",
        localPackage: localPackagePath,
        localSizeBytes: packageSize,
        localPackageExists: packageExists,
        remotePath,
        themeSlug,
        wpPath,
        wpCli,
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_THEME_INSTALL",
        ],
        optionalEnv: [
          "PUG_PROD_THEME_ZIP",
          "PUG_PROD_THEME_SLUG",
          "PUG_PROD_REMOTE_UPLOAD_DIR",
          "PUG_PROD_WP_PATH",
          "PUG_PROD_BACKUP_WP_CONTENT",
        ],
        readsIgnoredEnvFile: ".env.production.local",
        createsWpContentBackup: backupWpContent,
        backupLocation: "$HOME/tcg-production-backups",
        uploadThenInstall: true,
        activatesTheme: true,
        changesActiveTheme: true,
        writesWordPressData: true,
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
  throw new Error(`Missing production theme install environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_THEME_INSTALL !== "install-storefront-theme") {
  throw new Error("Set PUG_PROD_CONFIRM_THEME_INSTALL=install-storefront-theme to install the storefront theme.")
}

const connection = new Client()

const result = await new Promise((resolveResult, reject) => {
  connection
    .on("ready", async () => {
      try {
        if (backupWpContent) {
          const backup = await execRemote(connection, backupCommand())

          if (backup.code !== 0) {
            throw new Error(`Production wp-content backup failed: ${tailForLog(backup.stderr || backup.stdout)}`)
          }
        }

        await uploadFile(connection, localPackagePath, remotePath)
        const remoteStats = await statRemoteFile(connection, remotePath)
        const install = await execRemote(
          connection,
          `${shellQuote(wpCli)} theme install ${shellQuote(remotePath)} --force --activate --path=${shellQuote(wpPath)}`,
        )
        const active = await execRemote(
          connection,
          `${shellQuote(wpCli)} theme is-active ${shellQuote(themeSlug)} --path=${shellQuote(wpPath)}`,
        )
        const themeStatus = await execRemote(
          connection,
          `${shellQuote(wpCli)} theme list --format=json --fields=name,status,version --path=${shellQuote(wpPath)}`,
        )
        const themes = parseJson(themeStatus.stdout)
        const theme = Array.isArray(themes) ? themes.find((item) => item.name === themeSlug) : null

        resolveResult({
          action: "production_storefront_theme_installed",
          localPackage: basename(localPackagePath),
          localSizeBytes: packageSize,
          remotePath,
          remoteSizeBytes: remoteStats.size,
          sizeMatched: remoteStats.size === packageSize,
          themeSlug,
          themeVersion: theme?.version ?? null,
          themeStatus: theme?.status ?? null,
          active: active.code === 0,
          installExitCode: install.code,
          statusExitCode: active.code,
          installed: install.code === 0 && active.code === 0 && remoteStats.size === packageSize,
          createsWpContentBackup: backupWpContent,
          changesActiveTheme: true,
          productionApprovalRequired: true,
          credentialsPrinted: false,
          installStderrTail: tailForLog(install.stderr),
        })
      } catch (error) {
        reject(error)
      } finally {
        connection.end()
      }
    })
    .on("error", reject)
    .connect(productionSshConnectConfig(requiredEnv))
})

console.log(JSON.stringify(result, null, 2))

if (!result.installed) {
  process.exitCode = 1
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

function backupCommand() {
  const backupDir = "$HOME/tcg-production-backups"
  const wpContent = `${wpPath.replace(/\/+$/, "")}/wp-content`

  return `mkdir -p ${shellQuote(backupDir)} && tar -czf ${shellQuote(
    `${backupDir}/${wpContentBackupFileName}`,
  )} -C ${shellQuote(wpContent)} themes plugins uploads`
}

function uploadFile(connection, localPath, remotePath) {
  return new Promise((resolveResult, reject) => {
    connection.sftp((sftpError, sftp) => {
      if (sftpError) {
        reject(sftpError)
        return
      }

      sftp.fastPut(localPath, remotePath, (uploadError) => {
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

function statRemoteFile(connection, remotePath) {
  return new Promise((resolveResult, reject) => {
    connection.sftp((sftpError, sftp) => {
      if (sftpError) {
        reject(sftpError)
        return
      }

      sftp.stat(remotePath, (statError, stats) => {
        sftp.end()
        if (statError) {
          reject(statError)
          return
        }

        resolveResult(stats)
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

function parseJson(value) {
  try {
    return JSON.parse(String(value).trim())
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

function tailForLog(value, maxLength = 500) {
  const text = String(value ?? "").trim()
  return text.length > maxLength ? text.slice(-maxLength) : text
}

function envFlag(value, fallback) {
  if (typeof value === "undefined") {
    return fallback
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase())
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm"
}
