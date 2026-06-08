import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const appRoot = resolve(root, "apps/offline-app")
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
}
const args = ["build", "--target", "x86_64-pc-windows-msvc", "--bundles", "nsis"]
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
