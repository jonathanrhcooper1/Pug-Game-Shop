import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const repoRoot = path.resolve(appRoot, "..", "..")

async function readJson(relativePath) {
  const content = await readFile(path.join(appRoot, relativePath), "utf8")
  return JSON.parse(content)
}

const rootPackage = JSON.parse(
  await readFile(path.join(repoRoot, "package.json"), "utf8"),
)
const windowsBuildHelper = await readFile(
  path.join(repoRoot, "scripts/run-offline-app-windows-build.mjs"),
  "utf8",
)
const appPackage = await readJson("package.json")
const tauriConfig = await readJson("src-tauri/tauri.conf.json")
const manifest = await readJson("config/windows-package.manifest.json")

assert.equal(appPackage.version, rootPackage.version)
assert.equal(tauriConfig.version, rootPackage.version)
assert.equal(manifest.framework, "tauri")
assert.equal(manifest.platform, "windows")
assert.equal(manifest.target, "x86_64-pc-windows-msvc")
assert.equal(manifest.installer, "nsis")
assert.equal(manifest.manual_production_release_required, true)
assert.equal(manifest.code_signing_required_for_production, true)
assert.deepEqual(manifest.artifact_extensions, [".exe"])

assert.ok(rootPackage.scripts["build:offline-app:windows"].includes("run-offline-app-windows-build.mjs"))
assert.ok(appPackage.scripts["build:windows"].includes("run-offline-app-windows-build.mjs"))
assert.ok(windowsBuildHelper.includes("x86_64-pc-windows-msvc"))
assert.ok(windowsBuildHelper.includes("\"--bundles\", \"nsis\""))
assert.ok(windowsBuildHelper.includes(".cargo"))
assert.ok(windowsBuildHelper.includes("tauri.cmd"))
assert.ok(tauriConfig.bundle.active)
assert.ok(tauriConfig.bundle.targets.includes("nsis"))
assert.equal(tauriConfig.bundle.windows.nsis.installMode, "perMachine")

assert.equal(manifest.sync.rest_namespace, "/wp-json/tcg-store/v1")
assert.equal(manifest.sync.pairing_route, "/offline/devices/register")
assert.equal(manifest.sync.pull_route, "/offline/pull")
assert.equal(manifest.sync.push_route, "/offline/push")
assert.equal(manifest.sync.direct_mysql_access, false)

const requiredBrandingTokens = [
  "company_name",
  "company_short_name",
  "logo_url",
  "support_url",
  "receipt_footer",
  "primary_color",
  "accent_color",
  "background_color",
  "surface_color",
  "text_color",
  "success_color",
  "warning_color",
  "danger_color",
  "staging_banner_color",
]

assert.equal(manifest.branding.configurable, true)
assert.deepEqual(manifest.branding.required_tokens, requiredBrandingTokens)

const scanned = JSON.stringify({
  appPackage,
  tauriConfig,
  manifest,
})

const forbiddenMarkers = [
  ["sk", "live", ""].join("_"),
  ["pk", "live", ""].join("_"),
  ["production", "api", "key"].join("-"),
]

for (const forbidden of forbiddenMarkers) {
  assert.equal(scanned.includes(forbidden), false, `Forbidden marker found: ${forbidden}`)
}

for (const route of [
  manifest.sync.pairing_route,
  manifest.sync.pull_route,
  manifest.sync.push_route,
]) {
  assert.ok(route.startsWith("/offline/"))
}

console.log("PASS offline app Windows package contract")
