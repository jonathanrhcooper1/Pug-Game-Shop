import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import { createSquareCatalogInventorySyncer } from "../apps/local-sync-server/src/squareCatalogInventorySyncer.mjs"

const CONFIRM_VALUE = "run-reversible-square-smoke"
const apiVersion = process.env.PUG_SQUARE_API_VERSION || process.env.LOCAL_SYNC_SQUARE_API_VERSION || "2026-05-20"
const accessToken = process.env.PUG_SQUARE_ACCESS_TOKEN || process.env.LOCAL_SYNC_SQUARE_ACCESS_TOKEN || ""
const locationId = process.env.PUG_SQUARE_LOCATION_ID || process.env.LOCAL_SYNC_SQUARE_LOCATION_ID || ""
const environment = String(process.env.PUG_SQUARE_ENVIRONMENT || process.env.LOCAL_SYNC_SQUARE_ENVIRONMENT || "production")
  .trim()
  .toLowerCase()
const baseUrl = environment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com"
const outputPath = resolve(process.env.PUG_SQUARE_SMOKE_OUTPUT || "evidence/final-20260718/PUG_SQUARE_REVERSIBLE_SMOKE.json")
const runId = new Date().toISOString().replace(/\D/g, "").slice(2, 12)
const sku = `PUGQ${runId.slice(-9)}`
const report = {
  action: "reversible_square_catalog_inventory_smoke",
  environment,
  location_id_configured: Boolean(locationId),
  sku,
  created_catalog_item_id: "",
  created_catalog_variation_id: "",
  checks: [],
  cleanup: { attempted: false, inventory_zeroed: false, catalog_item_deleted: false, sku_absent_after_cleanup: false },
  credentials_printed: false,
  raw_credentials_returned: false,
}

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify({
    ...report,
    mode: "dry-run",
    writes_one_temporary_item: true,
    restores_inventory_to_zero: true,
    deletes_temporary_catalog_item: true,
    required_confirmation: CONFIRM_VALUE,
  }, null, 2))
  process.exit(0)
}

if (!accessToken || !locationId) {
  throw new Error("Square access token and location ID must be supplied through the process environment.")
}

if (process.env.PUG_CONFIRM_REVERSIBLE_SQUARE_SMOKE !== CONFIRM_VALUE) {
  throw new Error(`Set PUG_CONFIRM_REVERSIBLE_SQUARE_SMOKE=${CONFIRM_VALUE} to run the controlled live test.`)
}

const headers = {
  accept: "application/json",
  authorization: `Bearer ${accessToken}`,
  "content-type": "application/json",
  "square-version": apiVersion,
}
const syncer = createSquareCatalogInventorySyncer({
  accessToken,
  apiVersion,
  environment,
  locationId,
  imageSyncEnabled: false,
})

try {
  const existing = await searchCatalogBySku(sku)
  check("test_sku_did_not_preexist", existing.length === 0, 0, existing.length)
  if (existing.length > 0) {
    throw new Error("The generated Square test SKU already exists; no changes were made.")
  }

  const createResult = await syncer.syncInventoryItem({
    operation: {
      operation_id: `reversible-square-create-${runId}`,
      operation_type: "inventory_intake",
      entity_id: `square-smoke-${runId}`,
    },
    item: testItem({ quantity: 1, priceMinorUnits: 100 }),
  })
  check("catalog_and_count_create_readback", createResult.status === "ok" && createResult.readback_verified === true, true, {
    ...safeConnectorResult(createResult),
  })
  if (createResult.status !== "ok" || !createResult.square_catalog_item_id || !createResult.square_catalog_variation_id) {
    throw new Error(`Square connector create/readback failed: ${createResult.code || createResult.status}`)
  }

  report.created_catalog_item_id = createResult.square_catalog_item_id
  report.created_catalog_variation_id = createResult.square_catalog_variation_id

  const zeroResult = await syncer.syncInventoryItem({
    operation: {
      operation_id: `reversible-square-zero-${runId}`,
      operation_type: "inventory_update",
      entity_id: `square-smoke-${runId}`,
    },
    item: testItem({
      quantity: 0,
      priceMinorUnits: 200,
      itemId: createResult.square_catalog_item_id,
      variationId: createResult.square_catalog_variation_id,
    }),
  })
  check("catalog_price_and_zero_count_readback", zeroResult.status === "ok" && zeroResult.readback_verified === true, true, {
    status: zeroResult.status,
    code: zeroResult.code,
    readback_verified: zeroResult.readback_verified === true,
    quantity_on_hand: zeroResult.quantity_on_hand,
  })
  if (zeroResult.status !== "ok") {
    throw new Error(`Square connector update/readback failed: ${zeroResult.code || zeroResult.status}`)
  }
  report.cleanup.inventory_zeroed = true
} finally {
  report.cleanup.attempted = true
  if (report.created_catalog_variation_id && !report.cleanup.inventory_zeroed) {
    report.cleanup.inventory_zeroed = await zeroInventoryDirect(report.created_catalog_variation_id)
  } else if (!report.created_catalog_variation_id) {
    report.cleanup.inventory_zeroed = true
  }
  if (report.created_catalog_item_id) {
    report.cleanup.catalog_item_deleted = await deleteCatalogObject(report.created_catalog_item_id)
    const remaining = await searchCatalogBySku(sku)
    report.cleanup.sku_absent_after_cleanup = remaining.length === 0
  } else {
    report.cleanup.catalog_item_deleted = true
    report.cleanup.sku_absent_after_cleanup = true
  }
  check("temporary_inventory_zeroed", report.cleanup.inventory_zeroed, true, report.cleanup.inventory_zeroed)
  check("temporary_catalog_item_deleted", report.cleanup.catalog_item_deleted, true, report.cleanup.catalog_item_deleted)
  check("temporary_sku_absent_after_cleanup", report.cleanup.sku_absent_after_cleanup, true, report.cleanup.sku_absent_after_cleanup)
  report.passed = report.checks.every((entry) => entry.pass)
  report.completed_at_utc = new Date().toISOString()
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

console.log(JSON.stringify({
  action: report.action,
  passed: report.passed,
  check_count: report.checks.length,
  output: outputPath,
  cleanup: report.cleanup,
  credentials_printed: false,
}, null, 2))

if (!report.passed) {
  process.exitCode = 1
}

function testItem({ quantity, priceMinorUnits, itemId = "", variationId = "" }) {
  return {
    public_id: `square-smoke-${runId}`,
    row_version: quantity > 0 ? 1 : 2,
    game: "pokemon",
    card_name: `Pug Reversible Square Smoke ${runId}`,
    set_name: "Connector Verification",
    set_code: "TEST",
    card_number: "1",
    condition: "NM",
    variant: "normal",
    barcode: sku,
    price_minor_units: priceMinorUnits,
    minimum_sale_price_minor_units: 100,
    quantity_on_hand: quantity,
    currency: "USD",
    status: quantity > 0 ? "available" : "removed",
    pos_visibility: "visible",
    square_catalog_item_id: itemId,
    square_catalog_variation_id: variationId,
    square_location_id: locationId,
  }
}

async function searchCatalogBySku(value) {
  const response = await squareRequest("/v2/catalog/search", {
    method: "POST",
    body: {
      object_types: ["ITEM_VARIATION"],
      query: { exact_query: { attribute_name: "sku", attribute_value: value } },
      include_deleted_objects: false,
      limit: 10,
    },
  })
  return Array.isArray(response.objects) ? response.objects : []
}

async function zeroInventoryDirect(variationId) {
  try {
    await squareRequest("/v2/inventory/changes/batch-create", {
      method: "POST",
      body: {
        idempotency_key: `reversible-square-cleanup-${runId}`,
        ignore_unchanged_counts: true,
        changes: [{
          type: "PHYSICAL_COUNT",
          physical_count: {
            catalog_object_id: variationId,
            location_id: locationId,
            state: "IN_STOCK",
            quantity: "0",
            occurred_at: new Date().toISOString(),
          },
        }],
      },
    })
    return true
  } catch {
    return false
  }
}

async function deleteCatalogObject(objectId) {
  try {
    await squareRequest(`/v2/catalog/object/${encodeURIComponent(objectId)}`, { method: "DELETE" })
    return true
  } catch {
    return false
  }
}

async function squareRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || (Array.isArray(payload.errors) && payload.errors.length > 0)) {
    const code = payload.errors?.[0]?.code || `HTTP_${response.status}`
    throw new Error(`Square request failed: ${code}`)
  }
  return payload
}

function check(name, pass, expected, actual) {
  report.checks.push({ name, pass: Boolean(pass), expected, actual })
}

function safeConnectorResult(result = {}) {
  return {
    status: String(result.status ?? ""),
    code: String(result.code ?? ""),
    http_status: Number(result.http_status ?? 0),
    endpoint: String(result.endpoint ?? ""),
    errors: (Array.isArray(result.errors) ? result.errors : []).map((error) => ({
      category: String(error?.category ?? ""),
      code: String(error?.code ?? ""),
      detail: String(error?.detail ?? "").slice(0, 500),
      field: String(error?.field ?? ""),
    })),
    readback_verified: result.readback_verified === true,
  }
}
