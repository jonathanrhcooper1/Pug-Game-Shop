import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"
import { stagingSshConnectConfig } from "./lib/staging-ssh.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const defaultPackagePath = resolve(root, "dist", `tcg-store-platform-${packageJson.version}.zip`)
const customPackageZip = String(process.env.PUG_STAGING_PLUGIN_ZIP ?? "").trim()
const localPackagePath = resolve(root, customPackageZip || defaultPackagePath)
const uploadDir = normalizeRemoteDir(process.env.PUG_STAGING_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteFileName =
  process.env.PUG_STAGING_REMOTE_FILE ??
  `tcg-store-platform-${packageJson.version}-${timestampForRemoteName(new Date())}.zip`
const remotePath = `${uploadDir}/${remoteFileName}`
const dryRun = process.argv.includes("--dry-run")

const requiredEnv = {
  PUG_STAGING_SSH_HOST: process.env.PUG_STAGING_SSH_HOST,
  PUG_STAGING_SSH_USER: process.env.PUG_STAGING_SSH_USER,
  PUG_STAGING_SSH_PASSWORD: process.env.PUG_STAGING_SSH_PASSWORD,
}

if (!customPackageZip && !dryRun) {
  execFileSync("npm", ["run", "package:wordpress"], {
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

if (missingEnv.length > 0) {
  throw new Error(`Missing staging upload environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_STAGING_CONFIRM_UPLOAD !== "upload-to-staging") {
  throw new Error("Set PUG_STAGING_CONFIRM_UPLOAD=upload-to-staging to upload the package.")
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "staging_plugin_package_upload_dry_run",
        localPackage: localPackagePath,
        localSizeBytes: packageSize,
        localPackageExists: packageExists,
        buildsFreshPackageFromSource: !customPackageZip,
        customPackageZipProvided: Boolean(customPackageZip),
        remotePath,
        uploadOnly: true,
        activatesPlugin: false,
        overwritesActivePluginFiles: false,
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

        sftp.fastPut(localPackagePath, remotePath, (uploadError) => {
          if (uploadError) {
            connection.end()
            reject(uploadError)
            return
          }

          sftp.stat(remotePath, (statError, remoteStats) => {
            connection.end()
            if (statError) {
              reject(statError)
              return
            }

            resolveResult({
              action: "staging_plugin_package_uploaded",
              localPackage: basename(localPackagePath),
              localSizeBytes: packageSize,
              builtFreshPackageFromSource: !customPackageZip,
              customPackageZipProvided: Boolean(customPackageZip),
              remotePath,
              remoteSizeBytes: remoteStats.size,
              sizeMatched: remoteStats.size === packageSize,
              uploadOnly: true,
              activatesPlugin: false,
              overwritesActivePluginFiles: false,
              credentialsPrinted: false,
            })
          })
        })
      })
    })
    .on("error", reject)
    .connect(stagingSshConnectConfig(requiredEnv))
})

if (!result.sizeMatched) {
  throw new Error(
    `Uploaded package size mismatch: local ${result.localSizeBytes}, remote ${result.remoteSizeBytes}`,
  )
}

console.log(JSON.stringify(result, null, 2))

function normalizeRemoteDir(value) {
  return `/${String(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}
