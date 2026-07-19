import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..", "..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const helperSource = await readFile(path.join(root, "scripts/lib/staging-ssh.mjs"), "utf8")
const stagingScripts = [
  "scripts/staging-upload-wordpress-package.mjs",
  "scripts/staging-run-inventory-smoke.mjs",
  "scripts/staging-run-migration-rehearsal.mjs",
  "scripts/staging-run-search-benchmark.mjs",
]

assert.ok(
  packageJson.scripts["test:packaging"].includes("node scripts/tests/staging-ssh-contract.mjs"),
  "staging SSH contract must run in npm run test:packaging",
)

for (const requiredMarker of [
  "STAGING_SSH_ALGORITHMS",
  "stagingSshConnectConfig",
  "curve25519-sha256",
  "ecdh-sha2-nistp256",
  "diffie-hellman-group14-sha256",
  "ssh-ed25519",
  "aes128-ctr",
  "aes256-ctr",
  "aes128-gcm@openssh.com",
  "aes256-gcm@openssh.com",
  "hmac-sha2-256",
  "hmac-sha2-512",
  "compress",
  "readyTimeout: options.readyTimeout ?? 20000",
  "PUG_STAGING_SSH_HOST",
  "PUG_STAGING_SSH_USER",
  "PUG_STAGING_SSH_PASSWORD",
]) {
  assert.ok(helperSource.includes(requiredMarker), `Missing staging SSH marker: ${requiredMarker}`)
}

for (const forbiddenMarker of [
  "console.log",
  "process.env.PUG_STAGING_SSH_PASSWORD",
  "privateKey",
]) {
  assert.equal(
    helperSource.includes(forbiddenMarker),
    false,
    `Forbidden staging SSH helper marker found: ${forbiddenMarker}`,
  )
}

for (const script of stagingScripts) {
  const source = await readFile(path.join(root, script), "utf8")

  assert.ok(
    source.includes('import { stagingSshConnectConfig } from "./lib/staging-ssh.mjs"'),
    `Missing staging SSH helper import in ${script}`,
  )
  assert.ok(
    source.includes(".connect(stagingSshConnectConfig(requiredEnv))"),
    `Missing staging SSH helper connect call in ${script}`,
  )
}

console.log("PASS staging SSH contract")
