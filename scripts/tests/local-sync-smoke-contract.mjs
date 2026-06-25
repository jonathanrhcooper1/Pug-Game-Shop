import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const scriptSource = await readFile(path.join(root, "scripts/local-sync-smoke.mjs"), "utf8")
const readmeSource = await readFile(path.join(root, "apps/local-sync-server/README.md"), "utf8")

assert.equal(packageJson.scripts["local-sync:smoke"], "node scripts/local-sync-smoke.mjs")
assert.ok(packageJson.scripts["test:packaging"].includes("node scripts/tests/local-sync-smoke-contract.mjs"))

for (const requiredMarker of [
  "LOCAL_SYNC_SERVER_URL",
  "PUG_LOCAL_SYNC_PUBLIC_URL",
  "LOCAL_SYNC_EXPECT_WEBSITE_URL",
  "PUG_WORDPRESS_URL",
  "LOCAL_SYNC_SMOKE_DEVICE_ID",
  ".env.local-sync",
  "apps/local-sync-server/.env.local",
  "local_sync_server_smoke_dry_run",
  "local_sync_server_smoke",
  "/health",
  "/setup/status",
  "/devices/heartbeat",
  "/devices/status",
  "writesLocalHeartbeatOnly: true",
  "mutatesWordPress: false",
  "capturesPayments: false",
  "credentialsPrinted: false",
  "rawResponsePrinted: false",
]) {
  assert.ok(scriptSource.includes(requiredMarker), `Missing local sync smoke marker: ${requiredMarker}`)
}

for (const requiredReadmeMarker of [
  "npm run local-sync:smoke",
  "LOCAL_SYNC_EXPECT_WEBSITE_URL",
  "writes one local smoke heartbeat",
]) {
  assert.ok(readmeSource.includes(requiredReadmeMarker), `Missing local sync README marker: ${requiredReadmeMarker}`)
}

for (const forbiddenMarker of [
  "PUG_PROD_SSH_PASSWORD",
  "PUG_WORDPRESS_APP_PASSWORD)",
  "console.log(process.env",
  "credentialsPrinted: true",
  "rawResponsePrinted: true",
  "mutatesWordPress: true",
  "capturesPayments: true",
  "wp db reset",
  "wp db import",
  "rm -rf",
]) {
  assert.equal(scriptSource.includes(forbiddenMarker), false, `Forbidden local sync smoke marker found: ${forbiddenMarker}`)
}

console.log("PASS local sync smoke contract")
