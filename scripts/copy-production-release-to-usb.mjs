import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packageJson = JSON.parse(readFileSyncText(resolve(root, "package.json")))
const version = packageJson.version
const distDir = resolve(root, "dist")
const releaseDir = resolve(distDir, `the-pug-store-deliverables-${version}`)
const releaseZip = resolve(distDir, `the-pug-store-deliverables-${version}.zip`)
const localServerZip = resolve(distDir, "pug-lan-server.zip")
const deployScript = resolve(root, "scripts/Deploy-Pug-LAN-Server-Patch.ps1")
const targetRoot = resolveUsbTarget()
const usbReleaseDir = resolve(targetRoot, `the-pug-store-deliverables-${version}`)
const copiedAt = new Date().toISOString()
const installers = findInstallers(releaseDir)

if (!existsSync(releaseDir) || !existsSync(releaseZip)) {
  throw new Error(
    [
      `Production release artifacts were not found for version ${version}.`,
      "Run this first:",
      "  npm.cmd run package:production-release",
      "Then copy to USB with:",
      "  npm.cmd run release:copy-usb",
    ].join("\n"),
  )
}

mkdirSync(targetRoot, { recursive: true })
rmSync(usbReleaseDir, { recursive: true, force: true })
cpSync(releaseDir, usbReleaseDir, { recursive: true, force: true })
copyFileSync(releaseZip, resolve(targetRoot, basename(releaseZip)))

if (existsSync(localServerZip)) {
  copyFileSync(localServerZip, resolve(targetRoot, basename(localServerZip)))
}

if (existsSync(deployScript)) {
  copyFileSync(deployScript, resolve(targetRoot, basename(deployScript)))
  const usbLanPackageDir = resolve(usbReleaseDir, "LAN Server + Pug Store App")
  if (existsSync(usbLanPackageDir)) {
    copyFileSync(deployScript, resolve(usbLanPackageDir, basename(deployScript)))
  }
}

for (const installer of installers) {
  copyFileSync(installer, resolve(targetRoot, basename(installer)))
}

writeFileSync(
  resolve(targetRoot, "READ ME - The Pug Patch Install Steps.txt"),
  [
    "The Pug Patch Install Steps",
    "",
    `Copied: ${copiedAt}`,
    `Version: ${version}`,
    "",
    "Install order:",
    "1. On the LAN server PC, open the folder:",
    `   ${basename(usbReleaseDir)}\\LAN Server + Pug Store App`,
    "2. Run Deploy-Pug-LAN-Server-Patch.ps1 from this USB, or from that LAN Server + Pug Store App folder.",
    "3. The script copies the patch to C:\\PugGameShop\\LANServer, preserves local-sync.env, refreshes the extracted server files, installs the startup task, and starts the server.",
    "4. If this is the first install, open C:\\PugGameShop\\LANServer\\local-sync.env and fill the secret values.",
    "   The first startup auto-runs SQLite schema migrations and advertises the LAN IP.",
    "   Manual fallback: run C:\\PugGameShop\\LANServer\\Start-Pug-LAN-Server.ps1.",
    "5. Install Pug Store App on staff PCs.",
    "6. Install Pug Kiosk App on kiosk PCs.",
    "7. Open each app and confirm it auto-connects to the LAN server.",
    "8. If auto-discovery is blocked, enter the LAN server URL manually, for example http://SERVER-IP:8787.",
    "",
    "What this patch updates:",
    "- LAN server auto-advertises the real LAN IP instead of the old placeholder server URL.",
    "- LAN server startup attempts to add Windows Firewall rules for TCP 8787 and UDP 8788.",
    "- Store App Settings now has manager LAN Server Maintenance controls: status, database backup, database cleanup, website pull, server patch upload, and server restart.",
    "- LAN server contract version 5 now advertises the live inventory update route plus maintenance routes.",
    "- Trade-in acceptance requires DL number and two-letter state, logs it, and shows only a masked ID in app history.",
    "- Past events no longer appear as active event selections after their start date has passed.",
    "- Updated staff app, kiosk app, LAN server package, WordPress plugin/theme ZIPs, release docs, and manifests are included.",
    "",
    "Files copied to this USB folder:",
    `- ${basename(releaseZip)}`,
    existsSync(localServerZip) ? "- pug-lan-server.zip" : "- pug-lan-server.zip was not found at copy time",
    existsSync(deployScript) ? `- ${basename(deployScript)}` : "- Deploy-Pug-LAN-Server-Patch.ps1 was not found at copy time",
    ...installers.map((installer) => `- ${basename(installer)}`),
    `- ${basename(usbReleaseDir)}\\`,
    "",
  ].join("\r\n"),
)

console.log(
  JSON.stringify(
    {
      action: "copied_production_release_to_usb",
      version,
      targetRoot,
      releaseDirectory: usbReleaseDir,
      releaseZip: resolve(targetRoot, basename(releaseZip)),
      localServerZip: existsSync(localServerZip) ? resolve(targetRoot, basename(localServerZip)) : null,
      deployScript: existsSync(deployScript) ? resolve(targetRoot, basename(deployScript)) : null,
      installers: installers.map((installer) => resolve(targetRoot, basename(installer))),
      readme: resolve(targetRoot, "READ ME - The Pug Patch Install Steps.txt"),
    },
    null,
    2,
  ),
)

function resolveUsbTarget() {
  const explicit = process.argv[2] || process.env.PUG_USB_INSTALLER_DIR

  if (explicit) {
    return resolve(explicit)
  }

  for (const drive of "DEFGHIJKLMNOPQRSTUVWXYZ") {
    const candidate = `${drive}:\\The Pug Installers`

    if (existsSync(candidate)) {
      return candidate
    }
  }

  for (const drive of "DEFGHIJKLMNOPQRSTUVWXYZ") {
    const rootPath = `${drive}:\\`

    if (existsSync(rootPath)) {
      return resolve(rootPath, "The Pug Installers")
    }
  }

  throw new Error(
    "No USB target was found. Plug in the USB drive or pass a path, for example: npm.cmd run release:copy-usb -- D:\\The Pug Installers",
  )
}

function findInstallers(directory) {
  if (!existsSync(directory)) {
    return []
  }

  const entries = []
  const stack = [directory]

  while (stack.length > 0) {
    const current = stack.pop()

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = resolve(current, entry.name)

      if (entry.isDirectory()) {
        stack.push(fullPath)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".exe")) {
        entries.push(fullPath)
      }
    }
  }

  const newestByName = new Map()

  for (const entry of entries) {
    const name = basename(entry)
    const existing = newestByName.get(name)

    if (!existing || statSync(entry).mtimeMs > statSync(existing).mtimeMs) {
      newestByName.set(name, entry)
    }
  }

  return [...newestByName.values()].sort((left, right) => {
    const nameCompare = basename(left).localeCompare(basename(right))

    return nameCompare || statSync(right).mtimeMs - statSync(left).mtimeMs
  })
}

function readFileSyncText(path) {
  return readFileSync(path, "utf8")
}
