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
const credentialApplyScript = resolve(root, "scripts/Apply-Pug-Middleman-Credentials.ps1")
const middlemanPrompt = resolve(root, "docs/runbooks/MIDDLEMAN_CODEX_DEPLOYMENT_PROMPT.md")
const lanServerCodexInstallPrompt = resolve(root, "docs/runbooks/LAN_SERVER_CODEX_INSTALL.md")
const dymoDiagnosticScript = resolve(root, "scripts/Diagnose-Pug-Dymo-Printing.ps1")
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
const staleArtifactsRemoved = cleanupStaleReleaseArtifacts(targetRoot, version)
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

if (existsSync(credentialApplyScript)) {
  copyFileSync(credentialApplyScript, resolve(targetRoot, basename(credentialApplyScript)))
  const usbLanPackageDir = resolve(usbReleaseDir, "LAN Server + Pug Store App")
  if (existsSync(usbLanPackageDir)) {
    copyFileSync(credentialApplyScript, resolve(usbLanPackageDir, basename(credentialApplyScript)))
  }
}

if (existsSync(middlemanPrompt)) {
  copyFileSync(middlemanPrompt, resolve(targetRoot, basename(middlemanPrompt)))
  const usbLanPackageDir = resolve(usbReleaseDir, "LAN Server + Pug Store App")
  if (existsSync(usbLanPackageDir)) {
    copyFileSync(middlemanPrompt, resolve(usbLanPackageDir, basename(middlemanPrompt)))
  }
}

if (existsSync(lanServerCodexInstallPrompt)) {
  copyFileSync(lanServerCodexInstallPrompt, resolve(targetRoot, basename(lanServerCodexInstallPrompt)))
  const usbLanPackageDir = resolve(usbReleaseDir, "LAN Server + Pug Store App")
  if (existsSync(usbLanPackageDir)) {
    copyFileSync(lanServerCodexInstallPrompt, resolve(usbLanPackageDir, basename(lanServerCodexInstallPrompt)))
  }
}

if (existsSync(dymoDiagnosticScript)) {
  copyFileSync(dymoDiagnosticScript, resolve(targetRoot, basename(dymoDiagnosticScript)))
  const usbPugStoreAppDir = resolve(usbReleaseDir, "Pug Store App")
  const usbLanPackageDir = resolve(usbReleaseDir, "LAN Server + Pug Store App")
  if (existsSync(usbPugStoreAppDir)) {
    copyFileSync(dymoDiagnosticScript, resolve(usbPugStoreAppDir, basename(dymoDiagnosticScript)))
  }
  if (existsSync(usbLanPackageDir)) {
    copyFileSync(dymoDiagnosticScript, resolve(usbLanPackageDir, basename(dymoDiagnosticScript)))
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
    "4. If the package includes LAN Server + Pug Store App\\local-sync.env, the connector config installs automatically.",
    "   If the server already has C:\\PugGameShop\\LANServer\\local-sync.env, it is preserved unless you run Deploy-Pug-LAN-Server-Patch.ps1 -ReplaceLocalEnv.",
    "   If no bundled config is present, open C:\\PugGameShop\\LANServer\\local-sync.env and fill the connector values.",
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
    "- Release revision bump forces a fresh middleman/server/app install instead of reusing the previous package.",
    "- Square connector credential applier and middleman Codex prompt are included; the USB-only secret env file must stay off GitHub and out of release ZIPs.",
    "- DYMO diagnostic collector is included. Run Diagnose-Pug-Dymo-Printing.ps1 on any workstation that will not print local labels and send Codex the generated ZIP.",
    "- Updated staff app, kiosk app, LAN server package, WordPress plugin/theme ZIPs, release docs, and manifests are included.",
    "",
    "Files copied to this USB folder:",
    `- ${basename(releaseZip)}`,
    existsSync(localServerZip) ? "- pug-lan-server.zip" : "- pug-lan-server.zip was not found at copy time",
    existsSync(deployScript) ? `- ${basename(deployScript)}` : "- Deploy-Pug-LAN-Server-Patch.ps1 was not found at copy time",
    existsSync(credentialApplyScript) ? `- ${basename(credentialApplyScript)}` : "- Apply-Pug-Middleman-Credentials.ps1 was not found at copy time",
    existsSync(middlemanPrompt) ? `- ${basename(middlemanPrompt)}` : "- MIDDLEMAN_CODEX_DEPLOYMENT_PROMPT.md was not found at copy time",
    existsSync(lanServerCodexInstallPrompt) ? `- ${basename(lanServerCodexInstallPrompt)}` : "- LAN_SERVER_CODEX_INSTALL.md was not found at copy time",
    existsSync(dymoDiagnosticScript) ? `- ${basename(dymoDiagnosticScript)}` : "- Diagnose-Pug-Dymo-Printing.ps1 was not found at copy time",
    existsSync(resolve(targetRoot, "LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env"))
      ? "- LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env is present as a USB-only secret handoff file"
      : "- LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env is not present; add it before asking Codex on the middleman to apply connector credentials",
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
      credentialApplyScript: existsSync(credentialApplyScript) ? resolve(targetRoot, basename(credentialApplyScript)) : null,
      middlemanPrompt: existsSync(middlemanPrompt) ? resolve(targetRoot, basename(middlemanPrompt)) : null,
      lanServerCodexInstallPrompt: existsSync(lanServerCodexInstallPrompt)
        ? resolve(targetRoot, basename(lanServerCodexInstallPrompt))
        : null,
      dymoDiagnosticScript: existsSync(dymoDiagnosticScript) ? resolve(targetRoot, basename(dymoDiagnosticScript)) : null,
      usbSecretHandoffPresent: existsSync(resolve(targetRoot, "LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env")),
      staleArtifactsRemoved,
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

function cleanupStaleReleaseArtifacts(directory, currentVersion) {
  const removed = []
  const releasePattern = /^the-pug-store-deliverables-(\d+\.\d+\.\d+)(?:\.zip)?$/i
  const installerPattern = /^Pug (?:Store|Kiosk) App-(\d+\.\d+\.\d+)\.exe$/i

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const releaseMatch = entry.name.match(releasePattern)
    const installerMatch = entry.name.match(installerPattern)
    const version = releaseMatch?.[1] || installerMatch?.[1] || ""

    if (!version || version === currentVersion) {
      continue
    }

    const fullPath = resolve(directory, entry.name)
    rmSync(fullPath, { recursive: true, force: true })
    removed.push(entry.name)
  }

  return removed.sort()
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
