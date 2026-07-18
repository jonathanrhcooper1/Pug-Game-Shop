import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

async function readJson(relativePath) {
  const content = await readFile(path.join(appRoot, relativePath), "utf8")
  return JSON.parse(content)
}

const manifest = await readJson("config/sqlite-schema.manifest.json")
const sql = await readFile(path.join(appRoot, manifest.migration), "utf8")

assert.equal(manifest.schema_version, 1)
assert.equal(manifest.authority, "wordpress_after_sync_acceptance")
assert.equal(manifest.direct_mysql_access, false)
assert.ok(sql.includes("PRAGMA foreign_keys = ON;"))

for (const table of manifest.tables) {
  assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${table} (`))
}

for (const index of manifest.indexes) {
  assert.ok(sql.includes(`CREATE INDEX IF NOT EXISTS ${index}`))
}

for (const field of manifest.operation_envelope) {
  assert.ok(sql.includes(field))
}

for (const domain of manifest.cached_domains) {
  assert.ok(manifest.cached_domains.includes(domain))
}

for (const forbidden of ["AUTO_INCREMENT", "ENGINE=", " wp_", "mysql", "http://", "https://"]) {
  assert.equal(sql.includes(forbidden), false, `Forbidden SQL marker found: ${forbidden}`)
}

assert.match(sql, /CHECK \(status IN \('pending', 'accepted', 'rejected', 'conflict', 'retry'\)\)/)
assert.match(sql, /CHECK \(resolution_status IN \('open', 'resolved', 'exported'\)\)/)

console.log("PASS offline app SQLite schema contract")
