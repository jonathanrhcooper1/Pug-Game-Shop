import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const tauriRoot = resolve(root, "apps/offline-app/src-tauri")
const homeDir = process.env.USERPROFILE || process.env.HOME || ""
const cargoBinDir = homeDir ? join(homeDir, ".cargo", "bin") : ""
const cargoExe = process.platform === "win32" ? "cargo.exe" : "cargo"
const cargoCandidates = [
  process.env.CARGO,
  cargoBinDir ? join(cargoBinDir, cargoExe) : "",
  "cargo",
].filter(Boolean)

const pathValue = process.env.PATH || process.env.Path || ""
const env = {
  ...process.env,
  PATH: cargoBinDir ? `${cargoBinDir}${process.platform === "win32" ? ";" : ":"}${pathValue}` : pathValue,
}

let lastError = null

for (const cargo of cargoCandidates) {
  if (cargo.includes(".cargo") && !existsSync(cargo)) {
    continue
  }

  const result = spawnSync(cargo, ["test"], {
    cwd: tauriRoot,
    env,
    stdio: "inherit",
  })

  if (!result.error) {
    process.exit(result.status ?? 1)
  }

  lastError = result.error
}

throw new Error(
  `Cargo was not found for offline app Rust tests. Install Rustup or add Cargo to PATH. ${lastError?.message ?? ""}`.trim(),
)
