import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const source = await readFile(resolve("scripts/live-square-reversible-smoke.mjs"), "utf8")

for (const marker of [
  "run-reversible-square-smoke",
  "--dry-run",
  "test_sku_did_not_preexist",
  "catalog_and_count_create_readback",
  "catalog_price_and_zero_count_readback",
  "temporary_inventory_zeroed",
  "temporary_catalog_item_deleted",
  "temporary_sku_absent_after_cleanup",
  "finally",
  "PUG_SQUARE_ACCESS_TOKEN",
  "PUG_SQUARE_LOCATION_ID",
  "credentials_printed: false",
]) {
  assert.ok(source.includes(marker), `Missing reversible Square smoke marker: ${marker}`)
}

for (const forbidden of [
  "console.log(accessToken",
  "credentials_printed: true",
  "EAAA",
  "sq0idp-",
]) {
  assert.equal(source.includes(forbidden), false, `Forbidden reversible Square smoke marker found: ${forbidden}`)
}

console.log("PASS reversible Square live smoke contract")
