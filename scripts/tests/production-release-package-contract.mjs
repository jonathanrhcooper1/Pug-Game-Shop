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
  "the-pug-production-release-",
  "employee-app.install.json",
  "customer-kiosk.install.json",
  "pug-local-sync-middleman-server.zip",
  "tcg-store-platform-",
  "pug-arcade-commerce-v2-",
  "pug-local-sync-discovery-v1",
  "manualMiddlemanUrlFallback",
  "http://SERVER-IP:8787",
]) {
  assert.ok(releaseScript.includes(marker), `Missing release package marker: ${marker}`)
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
