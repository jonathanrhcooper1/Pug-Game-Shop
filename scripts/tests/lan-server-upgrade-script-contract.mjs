import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const scriptPath = resolve(root, "scripts/windows/Deploy-Pug-LAN-Server-Upgrade.ps1")
const launcherPath = resolve(root, "scripts/windows/Deploy-Pug-LAN-Server-Upgrade.cmd")
const packageScriptPath = resolve(root, "scripts/package-production-release.mjs")
const script = readFileSync(scriptPath, "utf8")
const launcher = readFileSync(launcherPath, "utf8")
const packageScript = readFileSync(packageScriptPath, "utf8")

for (const requiredText of [
  "Disable-ScheduledTask",
  "Stop-PugProcesses",
  "Copy-SqliteFamily",
  "Assert-DatabaseBackup",
  "Restore-SqliteFamily",
  "barcode-migration-dry-run.json",
  "--dry-run",
  "--apply",
  "database-after-barcode-migration",
  "local-sync.env",
  "Install-StartupTask",
  "Wait-ForHealth",
  "Restoring the previous LAN server",
  "square_renames_queued",
]) {
  assert.ok(script.includes(requiredText), `LAN upgrade script must include ${requiredText}`)
}

assert.match(launcher, /-ExecutionPolicy Bypass/)
assert.match(packageScript, /Deploy-Pug-LAN-Server-Upgrade\.ps1/)
assert.match(packageScript, /Deploy-Pug-LAN-Server-Upgrade\.cmd/)
assert.match(packageScript, /README-LAN-UPGRADE\.txt/)
assert.doesNotMatch(script, /sq0[a-z]+-|whsec_|PUG_SQUARE_ACCESS_TOKEN\s*=\s*[^"\r\n]+/i)

const fixtureRoot = mkdtempSync(resolve(tmpdir(), "pug-lan-upgrade-contract-"))
const releaseRoot = resolve(fixtureRoot, "release")
const installRoot = resolve(fixtureRoot, "installed")
mkdirSync(releaseRoot, { recursive: true })
mkdirSync(resolve(installRoot, "pug-lan-server"), { recursive: true })
writeFileSync(resolve(releaseRoot, "pug-lan-server.zip"), "plan-only-placeholder")
writeFileSync(resolve(installRoot, "local-sync.env"), "LOCAL_SYNC_SQLITE_PATH=store-sync.sqlite\n")

try {
  const output = execFileSync(
    "powershell.exe",
    [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-PlanOnly",
      "-ReleaseRoot",
      releaseRoot,
      "-InstallRoot",
      installRoot,
    ],
    { encoding: "utf8" },
  )
  const plan = JSON.parse(output)
  assert.equal(plan.action, "pug_lan_server_upgrade")
  assert.equal(plan.environment_file_preserved, true)
  assert.equal(plan.database_exists, false)
  assert.equal(plan.barcode_migration_enabled, true)
  assert.equal(plan.app_install_enabled, true)
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true })
}

console.log("LAN server upgrade script contract passed.")
