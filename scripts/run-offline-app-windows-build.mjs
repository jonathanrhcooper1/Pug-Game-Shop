import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const appRoot = resolve(root, "apps/offline-app")
const tmpDir = resolve(root, ".codex-tmp")
const profile = cleanProfile(process.env.PUG_WINDOWS_APP_PROFILE || "store")
const profileConfigPath = resolve(tmpDir, `tauri-${profile}.conf.json`)
const homeDir = process.env.USERPROFILE || process.env.HOME || ""
const cargoBinDir = homeDir ? join(homeDir, ".cargo", "bin") : ""
const pathValue = process.env.PATH || process.env.Path || ""
const separator = process.platform === "win32" ? ";" : ":"
const tauriBin = process.platform === "win32"
  ? join(appRoot, "node_modules", ".bin", "tauri.cmd")
  : join(appRoot, "node_modules", ".bin", "tauri")
const tauriCandidates = [
  process.env.TAURI_CLI,
  tauriBin,
  process.platform === "win32" ? "tauri.cmd" : "tauri",
].filter(Boolean)

const env = {
  ...process.env,
  PATH: cargoBinDir ? `${cargoBinDir}${separator}${pathValue}` : pathValue,
  VITE_PUG_APP_MODE: profile === "kiosk" ? "kiosk" : "store",
}
mkdirSync(tmpDir, { recursive: true })
writeFileSync(profileConfigPath, JSON.stringify(buildProfileConfig(profile), null, 2) + "\n")

const args = [
  "build",
  "--target",
  "x86_64-pc-windows-msvc",
  "--bundles",
  "nsis",
  "--config",
  profileConfigPath,
]
let lastError = null

for (const tauri of tauriCandidates) {
  if (tauri.includes("node_modules") && !existsSync(tauri)) {
    continue
  }

  const result = spawnSync(tauri, args, {
    cwd: appRoot,
    env,
    shell: process.platform === "win32" && tauri.endsWith(".cmd"),
    stdio: "inherit",
  })

  if (!result.error) {
    process.exit(result.status ?? 1)
  }

  lastError = result.error
}

throw new Error(
  `Tauri CLI was not found for the offline app Windows build. Run npm install first. ${lastError?.message ?? ""}`.trim(),
)

function cleanProfile(value) {
  const normalized = String(value || "store").trim().toLowerCase()

  if (normalized === "kiosk") {
    return "kiosk"
  }

  if (normalized === "store") {
    return "store"
  }

  throw new Error(`Unknown PUG_WINDOWS_APP_PROFILE "${value}". Use "store" or "kiosk".`)
}

function buildProfileConfig(targetProfile) {
  const kiosk = targetProfile === "kiosk"
  const productName = kiosk ? "Pug Kiosk App" : "Pug Store App"

  return {
    productName,
    identifier: kiosk ? "com.thepug.kiosk" : "com.thepug.storeapp",
    app: {
      windows: [
        {
          title: productName,
          width: kiosk ? 1180 : 1280,
          height: kiosk ? 760 : 800,
          minWidth: kiosk ? 900 : 1024,
          minHeight: kiosk ? 640 : 720,
          resizable: false,
          fullscreen: true,
          decorations: false,
        },
      ],
    },
    bundle: {
      shortDescription: kiosk
        ? "Customer kiosk for in-store inventory browsing and pickup requests."
        : "Local store app with live sync and offline fallback for trading-card store operations.",
      longDescription: kiosk
        ? "Fullscreen customer kiosk for browsing live inventory, placing pickup requests, and syncing through the Pug LAN server."
        : "Local store app with live sync and offline fallback for inventory, customer credit, trade-in, fulfillment, report, label, and staff workflows.",
    },
  }
}
