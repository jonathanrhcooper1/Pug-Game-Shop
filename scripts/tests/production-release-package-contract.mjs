import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const releaseScript = readFileSync(resolve(root, "scripts/package-production-release.mjs"), "utf8")
const copyUsbScript = readFileSync(resolve(root, "scripts/copy-production-release-to-usb.mjs"), "utf8")
const syncScript = readFileSync(resolve(root, "scripts/production-verify-active-syncs.mjs"), "utf8")
const dymoLocalServiceScript = readFileSync(resolve(root, "scripts/Start-Pug-Dymo-Local-Service.ps1"), "utf8")
const dymoDiagnosticScript = readFileSync(resolve(root, "scripts/Diagnose-Pug-Dymo-Printing.ps1"), "utf8")
const lanServerInstallPrompt = readFileSync(resolve(root, "docs/runbooks/LAN_SERVER_CODEX_INSTALL.md"), "utf8")
const fullReleaseInstallPrompt = readFileSync(resolve(root, "docs/runbooks/CODEX_FULL_RELEASE_INSTALL_PROMPT.md"), "utf8")

assert.equal(packageJson.scripts["package:production-release"], "node scripts/package-production-release.mjs")
assert.equal(packageJson.scripts["release:copy-usb"], "node scripts/copy-production-release-to-usb.mjs")
assert.equal(packageJson.scripts["production:verify-active-syncs"], "node scripts/production-verify-active-syncs.mjs")

for (const marker of [
  "the-pug-store-deliverables-",
  "Pug Store App",
  "LAN Server + Pug Store App",
  "Kiosk Page",
  "PUG_WINDOWS_APP_PROFILE",
  "Pug Kiosk App",
  "windows_desktop_kiosk_app",
  "command_prompt_window_required",
  "Start-Pug-LAN-Server-Hidden.vbs",
  "Install-Pug-LAN-Server-Startup-Task.ps1",
  "Deploy-Pug-LAN-Server-Patch.ps1",
  "Start-Pug-Dymo-Local-Service.ps1",
  "Diagnose-Pug-Dymo-Printing.ps1",
  "LAN_SERVER_CODEX_INSTALL.md",
  "CODEX_FULL_RELEASE_INSTALL_PROMPT.md",
  "dymo_local_service_helper",
  "dymo_diagnostic_helper",
  "https://127.0.0.1:41951/DYMO/DLS/Printing/GetPrinters",
  "patch_deploy_helper",
  "deliverables.manifest.json",
  "pug-store-app.install.json",
  "lan-server-plus-pug-store-app.install.json",
  "kiosk-page.install.json",
  "pug-lan-server.zip",
  "Node built-in node:sqlite",
  "sqlite_database_auto_created",
  "sqlite_separate_install_required",
  "tcg-store-platform-",
  "pug-arcade-commerce-v2-",
  "documentation",
  "release-package",
  "pug-local-sync-discovery-v1",
  "manualMiddlemanUrlFallback",
  "http://SERVER-IP:8787",
  "local-sync.env.example",
  "Import-PugEnvFile",
  "PUG_WORDPRESS_URL=https://thepuggaming.com",
  "LOCAL_SYNC_WORDPRESS_PUSH_ENABLED=true",
  "PUG_WORDPRESS_USERNAME=replace_with_secure_value",
  "PUG_WORDPRESS_APP_PASSWORD=replace_with_secure_value",
  "LOCAL_SYNC_SERVER_URL=",
  "Ensure-PugFirewallRule",
  "Pug LAN Server HTTP 8787",
  "Pug LAN Server Discovery 8788",
  "deliverable_count: deliverableNames.length",
]) {
  assert.ok(releaseScript.includes(marker), `Missing release package marker: ${marker}`)
}

for (const marker of [
  "D:\\\\The Pug Installers",
  "the-pug-store-deliverables-",
  "pug-lan-server.zip",
  "READ ME - The Pug Patch Install Steps.txt",
  "copied_production_release_to_usb",
  "PUG_USB_INSTALLER_DIR",
  "Deploy-Pug-LAN-Server-Patch.ps1",
  "Diagnose-Pug-Dymo-Printing.ps1",
  "LAN_SERVER_CODEX_INSTALL.md",
  "CODEX_FULL_RELEASE_INSTALL_PROMPT.md",
  "Install order:",
  "Start-Pug-LAN-Server.ps1",
]) {
  assert.ok(copyUsbScript.includes(marker), `Missing USB copy marker: ${marker}`)
}

for (const forbiddenHost of [
  ["j84", "285", "myftpupload", "com"].join("."),
  ["vbf", "2a7", "myftpupload", "com"].join("."),
  ["0gt", "f64", "myftpupload", "com"].join("."),
]) {
  assert.equal(releaseScript.includes(forbiddenHost), false, `Release script still includes old host: ${forbiddenHost}`)
}

for (const marker of [
  "production:verify-reference-search",
  "production:verify-public-shortcodes",
  "production:verify-scrydex-catalog",
  "production:local-sync-inventory-smoke",
  "production:local-sync-square-sale-smoke",
  "production:local-sync-workflows-smoke",
  "production:local-pickup-fulfillment-smoke",
  "allActiveSyncsWorking",
]) {
  assert.ok(syncScript.includes(marker), `Missing active sync verification marker: ${marker}`)
}

for (const marker of [
  "https://127.0.0.1:41951/DYMO/DLS/Printing/GetPrinters",
  "Get-CimInstance Win32_Service",
  "Get-Process",
  "Start-Service",
  "Start-Process",
  "DYMO Connect was not found on this PC.",
  "Next steps:",
]) {
  assert.ok(dymoLocalServiceScript.includes(marker), `Missing DYMO local helper marker: ${marker}`)
}

for (const marker of [
  "pug-dymo-diagnostic-report",
  "StatusConnected",
  "GetPrinters",
  "PrintLabel",
  "PrintLabel2",
  "BorderColor",
  "IsConnected=False",
  "pug-label-printer-target",
  "No connector secrets are collected.",
]) {
  assert.ok(dymoDiagnosticScript.includes(marker), `Missing DYMO diagnostic marker: ${marker}`)
}

assert.ok(
  dymoDiagnosticScript.indexOf("<BorderThickness>0</BorderThickness>") > dymoDiagnosticScript.indexOf("<BorderColor>"),
  "DYMO diagnostic label XML must place BorderColor before BorderThickness.",
)

for (const marker of [
  "LAN Server Codex Install Prompt",
  "Deploy-Pug-LAN-Server-Patch.ps1",
  "Pug Store App-0.202.14.exe",
  "Pug Kiosk App-0.202.14.exe",
  "This workstation name",
  "/devices/status",
  "WordPress inventory bootstrap complete",
  "stable generated device ID",
]) {
  assert.ok(lanServerInstallPrompt.includes(marker), `Missing LAN server install prompt marker: ${marker}`)
}

for (const marker of [
  "Codex Full Release Install Prompt",
  "0.202.14",
  "D:\\The Pug Installers",
  "LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env",
  "LB1B9Z4GVG1BH",
  "Square POS Singles layout ready",
  "WordPress inventory polling enabled every",
  "First run will bootstrap all existing inventory",
  "current 830-card inventory",
  "last_website_inventory_pull",
  "PUG-CODEX-POS-SINGLES-MTG-20260625T185622Z",
  "Do not print API keys",
]) {
  assert.ok(fullReleaseInstallPrompt.includes(marker), `Missing full release prompt marker: ${marker}`)
}

console.log("PASS production release package contract")
