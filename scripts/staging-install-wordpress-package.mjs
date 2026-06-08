import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"
import { stagingSshConnectConfig } from "./lib/staging-ssh.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const defaultPackagePath = resolve(root, "dist", `tcg-store-platform-${packageJson.version}.zip`)
const localPackagePath = resolve(root, process.env.PUG_STAGING_PLUGIN_ZIP ?? defaultPackagePath)
const uploadDir = normalizeRemoteDir(process.env.PUG_STAGING_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteFileName =
  process.env.PUG_STAGING_REMOTE_FILE ??
  `tcg-store-platform-${packageJson.version}-${timestampForRemoteName(new Date())}.zip`
const remotePath = `${uploadDir}/${remoteFileName}`
const pluginSlug = process.env.PUG_STAGING_PLUGIN_SLUG ?? "tcg-store-platform"
const pluginFile = process.env.PUG_STAGING_PLUGIN_FILE ?? "tcg-store-platform/tcg-store-platform.php"
const dryRun = process.argv.includes("--dry-run")

const requiredEnv = {
  PUG_STAGING_SSH_HOST: process.env.PUG_STAGING_SSH_HOST,
  PUG_STAGING_SSH_USER: process.env.PUG_STAGING_SSH_USER,
  PUG_STAGING_SSH_PASSWORD: process.env.PUG_STAGING_SSH_PASSWORD,
}

if (!existsSync(localPackagePath)) {
  execFileSync("npm", ["run", "package:wordpress"], {
    cwd: root,
    stdio: "inherit",
  })
}

const packageSize = statSync(localPackagePath).size

if (packageSize <= 0) {
  throw new Error(`WordPress plugin package is empty: ${localPackagePath}`)
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "staging_plugin_package_install_dry_run",
        localPackage: localPackagePath,
        localSizeBytes: packageSize,
        remotePath,
        pluginSlug,
        pluginFile,
        uploadThenInstall: true,
        activatesPlugin: true,
        overwritesActivePluginFiles: true,
        productionAllowed: false,
        credentialsPrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing staging install environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_STAGING_CONFIRM_INSTALL !== "install-to-staging") {
  throw new Error("Set PUG_STAGING_CONFIRM_INSTALL=install-to-staging to install the package on staging.")
}

const connection = new Client()

const result = await new Promise((resolveResult, reject) => {
  connection
    .on("ready", async () => {
      try {
        await uploadFile(connection, localPackagePath, remotePath)
        const remoteStats = await statRemoteFile(connection, remotePath)
        const install = await execRemote(
          connection,
          `cd /html && wp plugin install ${shellQuote(remotePath)} --force --activate`,
        )
        const active = await execRemote(connection, `cd /html && wp plugin is-active ${shellQuote(pluginSlug)}`)
        const list = await execRemote(
          connection,
          `cd /html && wp plugin list --format=json --fields=name,status,version,title`,
        )

        const plugins = parseJson(list.stdout)
        const plugin = Array.isArray(plugins)
          ? plugins.find((item) => item.name === pluginSlug || item.name === pluginFile)
          : null

        resolveResult({
          action: "staging_plugin_package_installed",
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
          uploadThenInstall: true,
          activatesPlugin: true,
          overwritesActivePluginFiles: true,
          productionAllowed: false,
          credentialsPrinted: false,
        })
      } catch (error) {
        reject(error)
      } finally {
        connection.end()
      }
    })
    .on("error", reject)
    .connect(stagingSshConnectConfig(requiredEnv))
})

if (!result.sizeMatched) {
  throw new Error(
    `Uploaded package size mismatch: local ${result.localSizeBytes}, remote ${result.remoteSizeBytes}`,
  )
}

if (!result.active || result.installExitCode !== 0 || result.statusExitCode !== 0) {
  throw new Error(`Staging plugin install did not activate ${pluginSlug}.`)
}

console.log(JSON.stringify(result, null, 2))

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

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}
