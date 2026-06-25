import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const script = readFileSync(resolve(root, "scripts/square-one-card-standalone-probe.mjs"), "utf8")
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))

for (const marker of [
  "PUG_SQUARE_PROBE_CONFIRM",
  "run-square-one-card-probe",
  "credentialsPrinted: false",
  "tokenStoredInRepo: false",
  "/v2/locations",
  "/v2/catalog/search",
  "/v2/catalog/batch-upsert",
  "/v2/inventory/changes/batch-create",
  "/v2/inventory/counts/batch-retrieve",
  "catalog.ensure_category",
  "categories: categoryId ? [{ id: categoryId }] : []",
  "REGULAR_CATEGORY",
  "standalone_square_probe_without_middleman_server",
  "wordpress_mutated: false",
  "runtime_package_mutated: false",
]) {
  assert.match(script, new RegExp(escapeRegExp(marker)), `Missing Square probe marker: ${marker}`)
}

assert.equal(
  packageJson.scripts["square:one-card-probe"],
  "node scripts/square-one-card-standalone-probe.mjs",
  "package.json should expose the standalone Square one-card probe.",
)

assert.doesNotMatch(script, /EAAA[a-zA-Z0-9_-]{20,}/, "Square production token must not be embedded.")
assert.doesNotMatch(script, /sq0idp-[a-zA-Z0-9_-]{10,}/, "Square application ID must not be embedded.")
assert.doesNotMatch(script, /sq0csp-[a-zA-Z0-9_-]{10,}/, "Square application secret must not be embedded.")

console.log("Square one-card standalone probe contract passed.")

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
