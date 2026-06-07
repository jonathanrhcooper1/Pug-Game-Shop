import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const bridgeSource = await readFile(path.join(appRoot, "src/data/offlineQueueBridge.ts"), "utf8")
const appSource = await readFile(path.join(appRoot, "src/App.tsx"), "utf8")

for (const marker of [
  "queue_offline_operation",
  "preview_only",
  "tauri_command",
  "submitOfflineOperation",
  "previewOfflineOperation",
  "OfflineQueueCommandAdapter",
  "directMysqlAccess: false",
  "networkWrite: false",
]) {
  assert.ok(bridgeSource.includes(marker), `Missing queue bridge marker: ${marker}`)
}

assert.ok(appSource.includes("submitOfflineOperation(operation)"))
assert.ok(appSource.includes("OfflineQueueSubmissionResult"))
assert.ok(appSource.includes("queueSubmission?.message"))

for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage"]) {
  assert.equal(bridgeSource.includes(forbidden), false, `Forbidden queue bridge marker: ${forbidden}`)
}

console.log("PASS offline app queue bridge contract")
