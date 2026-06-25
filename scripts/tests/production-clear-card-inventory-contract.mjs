import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..", "..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const script = await readFile(path.join(root, "scripts/production-clear-card-inventory.mjs"), "utf8")

assert.equal(
  packageJson.scripts["production:clear-card-inventory"],
  "node scripts/production-clear-card-inventory.mjs",
)

for (const marker of [
  "PUG_PROD_CONFIRM_CLEAR_INVENTORY",
  "clear-production-card-inventory",
  "db export",
  "tcg_inventory_items",
  "tcg_reservations",
  "tcg_offline_sync_queue",
  "tcg_sync_conflicts",
  "_tcg_serialized_inventory",
  "_tcg_inventory_product_mode",
  "preservesScryDexReferenceCatalog",
  "preservesCustomersOrdersAndCreditLedger",
  "credentialsPrinted: false",
]) {
  assert.ok(script.includes(marker), `Missing production clear marker: ${marker}`)
}

for (const forbidden of ["SCRYDEX_API_KEY", "PUG_PROD_SSH_PASSWORD ="]) {
  assert.equal(script.includes(forbidden), false, `Forbidden marker found: ${forbidden}`)
}

console.log("PASS production clear card inventory contract")
