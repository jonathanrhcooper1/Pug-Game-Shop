import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const packageScript = readFileSync(resolve(root, "scripts/package-local-sync-server.mjs"), "utf8")
const manifest = JSON.parse(
  readFileSync(resolve(root, "apps/local-sync-server/config/windows-service.manifest.json"), "utf8"),
)

assert.equal(packageJson.scripts["package:local-sync-server"], "node scripts/package-local-sync-server.mjs")
assert.equal(manifest.host_role, "lan_middleman_server")
assert.equal(manifest.default_http_port, 8787)
assert.equal(manifest.default_discovery.protocol, "pug-local-sync-discovery-v1")
assert.equal(manifest.default_discovery.port, 8788)
assert.equal(manifest.default_discovery.manual_url_fallback, true)
assert.equal(manifest.runs_without_internet, true)
assert.equal(manifest.syncs_when_online, true)
assert.equal(manifest.stores_raw_wordpress_credentials_in_client, false)
assert.equal(manifest.prints_credentials, false)

for (const marker of [
  "--exclude=store-sync.sqlite",
  "--exclude=*.sqlite",
  "--exclude=*.sqlite-shm",
  "--exclude=*.sqlite-wal",
  "--exclude=*.log",
  "--exclude=.env",
  "--exclude=.env.*",
  "--exclude=.env.local",
  "--exclude=node_modules",
]) {
  assert.ok(packageScript.includes(marker), `Missing package exclusion: ${marker}`)
}

execFileSync("node", ["scripts/package-local-sync-server.mjs"], {
  cwd: root,
  stdio: "inherit",
})

const zipPath = resolve(root, "dist/pug-lan-server.zip")
const entries = execFileSync("tar", ["-tf", zipPath], {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean)

assert.ok(statSync(zipPath).size > 10_000)
assert.ok(entries.includes("./apps/local-sync-server/src/cli.mjs"))
assert.ok(entries.includes("./apps/local-sync-server/src/localSyncHttpServer.mjs"))
assert.ok(entries.includes("./apps/local-sync-server/src/localSyncDiscovery.mjs"))
assert.ok(entries.includes("./apps/local-sync-server/config/windows-service.manifest.json"))
assert.ok(entries.includes("./packages/api-client/src/squareInventoryAdapter.mjs"))
assert.ok(entries.includes("./packages/validation/src/posPaymentPolicy.mjs"))

for (const forbidden of [
  ".env",
  ".env.example",
  ".env.local",
  "store-sync.sqlite",
  "store-sync.sqlite-shm",
  "store-sync.sqlite-wal",
  "node_modules/",
]) {
  assert.equal(
    entries.some((entry) => entry.endsWith(`/${forbidden}`) || entry.includes(`/${forbidden}/`)),
    false,
    `Package included forbidden entry: ${forbidden}`,
  )
}

console.log("PASS local sync server package contract")
