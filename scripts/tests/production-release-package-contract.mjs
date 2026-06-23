import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const releaseScript = readFileSync(resolve(root, "scripts/package-production-release.mjs"), "utf8")
const syncScript = readFileSync(resolve(root, "scripts/production-verify-active-syncs.mjs"), "utf8")

assert.equal(packageJson.scripts["package:production-release"], "node scripts/package-production-release.mjs")
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
  "deliverable_count: deliverableNames.length",
]) {
  assert.ok(releaseScript.includes(marker), `Missing release package marker: ${marker}`)
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

console.log("PASS production release package contract")
