import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { loadLocalEnv } from "./lib/local-env.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
loadLocalEnv([
  resolve(root, ".env.square.local"),
  resolve(root, ".env.local-sync"),
  resolve(root, ".env.local"),
  resolve(root, ".env.production.local"),
])

const args = parseArgs(process.argv.slice(2))
const dryRun = Boolean(args["dry-run"]) || !Boolean(args.execute)
const confirmValue = "run-square-one-card-probe"
const environment = cleanEnvironment(args.environment ?? process.env.PUG_SQUARE_ENVIRONMENT ?? "production")
const accessToken = cleanSecret(process.env.PUG_SQUARE_ACCESS_TOKEN ?? process.env.SQUARE_ACCESS_TOKEN)
const locationId = cleanId(args.location ?? process.env.PUG_SQUARE_LOCATION_ID ?? process.env.SQUARE_LOCATION_ID)
const expectedMcc = cleanText(args["expected-mcc"] ?? process.env.PUG_SQUARE_EXPECTED_MCC ?? "")
const apiVersion = cleanApiVersion(args["api-version"] ?? process.env.PUG_SQUARE_API_VERSION ?? "2026-05-20")
const baseUrl = cleanBaseUrl(args["base-url"] ?? process.env.PUG_SQUARE_BASE_URL) || squareBaseUrl(environment)
const timestamp = timestampForFileName(new Date())
const sku = cleanSku(args.sku ?? `PUG-CODEX-SQ-${timestamp}`)
const itemName = cleanText(args.name ?? `PUG CODEX SQUARE API PROBE ${timestamp}`)
const variationName = cleanText(args.variation ?? "NM normal")
const categoryName = cleanText(args.category ?? "Singles")
const quantity = cleanQuantity(args.quantity ?? "1")
const priceMinorUnits = cleanMoneyMinor(args["price-cents"] ?? "100")
const currency = cleanCurrency(args.currency ?? "USD")
const outputPath = resolve(root, args.output ?? `tmp/square-one-card-probe-${timestamp}.json`)

const expectations = {
  architecture: "standalone_square_probe_without_middleman_server",
  runtime_package_mutated: false,
  wordpress_mutated: false,
  location_id: locationId || "(missing)",
  expected_mcc: expectedMcc || "(not checked)",
  item_name: itemName,
  variation_name: variationName,
  category_name: categoryName,
  sku,
  quantity,
  price_minor_units: priceMinorUnits,
  currency,
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "square_one_card_standalone_probe_dry_run",
        purpose:
          "Create one Square catalog item variation, set inventory count, retrieve the count, and write a sanitized report.",
        requiresEnv: ["PUG_SQUARE_ACCESS_TOKEN or SQUARE_ACCESS_TOKEN"],
        requiredArgsOrEnv: ["--location or PUG_SQUARE_LOCATION_ID"],
        productionApprovalRequired: true,
        executeCommand:
          "PUG_SQUARE_PROBE_CONFIRM=run-square-one-card-probe npm run square:one-card-probe -- --execute --location <location-id>",
        expectations,
        credentialsPrinted: false,
        tokenStoredInRepo: false,
        outputPath,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const missing = []
if (!accessToken) missing.push("PUG_SQUARE_ACCESS_TOKEN or SQUARE_ACCESS_TOKEN")
if (!locationId) missing.push("--location or PUG_SQUARE_LOCATION_ID")
if (missing.length > 0) {
  throw new Error(`Missing Square one-card probe inputs: ${missing.join(", ")}`)
}

if (environment !== "production") {
  throw new Error(`This production probe expects PUG_SQUARE_ENVIRONMENT=production; got ${environment}.`)
}

if (process.env.PUG_SQUARE_PROBE_CONFIRM !== confirmValue) {
  throw new Error(`Set PUG_SQUARE_PROBE_CONFIRM=${confirmValue} to run the live Square one-card probe.`)
}

const report = {
  action: "square_one_card_standalone_probe",
  started_at_utc: new Date().toISOString(),
  status: "started",
  environment,
  api_version: apiVersion,
  base_url: baseUrl,
  expectations,
  steps: [],
  credentialsPrinted: false,
  tokenStoredInRepo: false,
}

try {
  const locations = await squareRequest("/v2/locations", { method: "GET" })
  const location = findLocation(locations.payload?.locations, locationId)
  const locationStep = {
    step: "locations.retrieve",
    http_status: locations.http_status,
    location_id: locationId,
    found: Boolean(location),
    status: location?.status ?? "",
    business_name: location?.business_name ?? location?.name ?? "",
    mcc: location?.mcc ?? "",
  }

  if (!location) {
    throw stepError("square_location_not_found", "Square returned locations, but the requested location was not found.", locationStep)
  }

  if (expectedMcc && String(location?.mcc ?? "") !== expectedMcc) {
    throw stepError(
      "square_location_mcc_mismatch",
      `Square location MCC ${String(location?.mcc ?? "") || "(missing)"} did not match expected ${expectedMcc}.`,
      locationStep,
    )
  }

  report.steps.push(locationStep)

  const category = await ensureCatalogCategory(categoryName)
  const categoryStep = {
    step: "catalog.ensure_category",
    http_status: category.http_status,
    category_id: category.category_id,
    category_name: category.category_name,
    created: category.created,
  }

  if (!category.category_id) {
    throw stepError("square_category_missing", "Square did not return a usable category ID.", categoryStep)
  }

  report.steps.push(categoryStep)

  const catalogBody = buildCatalogBody({
    itemName,
    variationName,
    categoryId: category.category_id,
    sku,
    locationId,
    priceMinorUnits,
    currency,
  })
  const catalog = await squareRequest("/v2/catalog/batch-upsert", {
    method: "POST",
    body: catalogBody,
  })
  const ids = extractCatalogIds(catalog.payload, sku)
  const catalogStep = {
    step: "catalog.batch_upsert",
    http_status: catalog.http_status,
    item_id: ids.itemId,
    variation_id: ids.variationId,
    sku,
    id_mappings_count: Array.isArray(catalog.payload?.id_mappings) ? catalog.payload.id_mappings.length : 0,
    objects_count: Array.isArray(catalog.payload?.objects) ? catalog.payload.objects.length : 0,
  }

  if (!ids.variationId) {
    throw stepError("square_catalog_variation_missing", "Square created the catalog batch but no variation ID was returned.", catalogStep)
  }

  report.steps.push(catalogStep)

  const inventory = await squareRequest("/v2/inventory/changes/batch-create", {
    method: "POST",
    body: {
      idempotency_key: `pug-square-probe-inv-${timestamp}`,
      ignore_unchanged_counts: false,
      changes: [
        {
          type: "PHYSICAL_COUNT",
          physical_count: {
            catalog_object_id: ids.variationId,
            location_id: locationId,
            quantity,
            state: "IN_STOCK",
            occurred_at: new Date().toISOString(),
          },
        },
      ],
    },
  })
  const inventoryStep = {
    step: "inventory.batch_create_physical_count",
    http_status: inventory.http_status,
    variation_id: ids.variationId,
    location_id: locationId,
    requested_quantity: quantity,
    returned_count_count: Array.isArray(inventory.payload?.counts) ? inventory.payload.counts.length : 0,
  }
  report.steps.push(inventoryStep)

  const counts = await squareRequest("/v2/inventory/counts/batch-retrieve", {
    method: "POST",
    body: {
      catalog_object_ids: [ids.variationId],
      location_ids: [locationId],
      states: ["IN_STOCK"],
      limit: 1000,
    },
  })
  const matchingCounts = Array.isArray(counts.payload?.counts) ? counts.payload.counts : []
  const count = matchingCounts.find(
    (row) => row?.catalog_object_id === ids.variationId && row?.location_id === locationId && row?.state === "IN_STOCK",
  )
  const countStep = {
    step: "inventory.counts_batch_retrieve",
    http_status: counts.http_status,
    variation_id: ids.variationId,
    location_id: locationId,
    expected_quantity: quantity,
    observed_quantity: cleanQuantity(count?.quantity ?? ""),
    matched: cleanQuantity(count?.quantity ?? "") === quantity,
    counts_returned: matchingCounts.length,
  }

  if (!countStep.matched) {
    throw stepError("square_inventory_count_mismatch", "Square count readback did not match the requested quantity.", countStep)
  }

  report.steps.push(countStep)
  report.status = "ok"
  report.completed_at_utc = new Date().toISOString()
  report.square = {
    item_id: ids.itemId,
    variation_id: ids.variationId,
    category_id: category.category_id,
    category_name: category.category_name,
    location_id: locationId,
    sku,
    quantity,
    price_minor_units: priceMinorUnits,
    currency,
  }
} catch (error) {
  report.status = "failed"
  report.completed_at_utc = new Date().toISOString()
  report.error = publicError(error)
  if (error?.step) {
    report.steps.push(error.step)
  }
} finally {
  mkdirSync(resolve(outputPath, ".."), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

console.log(
  JSON.stringify(
    {
      status: report.status,
      outputPath,
      item_id: report.square?.item_id ?? "",
      variation_id: report.square?.variation_id ?? "",
      category_id: report.square?.category_id ?? "",
      category_name: report.square?.category_name ?? categoryName,
      sku,
      location_id: locationId,
      quantity,
      credentialsPrinted: false,
      tokenStoredInRepo: false,
      error: report.error ?? null,
    },
    null,
    2,
  ),
)

if (report.status !== "ok") {
  process.exitCode = 1
}

async function squareRequest(pathname, { method = "GET", body = null } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      "square-version": apiVersion,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await safeJson(response)

  if (!response.ok) {
    const error = new Error(`Square request failed: ${pathname}`)
    error.code = "square_http_error"
    error.http_status = response.status
    error.errors = publicSquareErrors(payload)
    error.endpoint = pathname
    throw error
  }

  return {
    http_status: response.status,
    payload,
  }
}

async function ensureCatalogCategory(name) {
  const safeName = cleanText(name) || "Singles"
  const search = await squareRequest("/v2/catalog/search", {
    method: "POST",
    body: {
      object_types: ["CATEGORY"],
      query: {
        exact_query: {
          attribute_name: "name",
          attribute_value: safeName,
        },
      },
      limit: 100,
    },
  })
  const existing = (Array.isArray(search.payload?.objects) ? search.payload.objects : []).find(
    (object) =>
      object?.type === "CATEGORY" &&
      cleanText(object?.category_data?.name).toLowerCase() === safeName.toLowerCase() &&
      cleanText(object?.category_data?.category_type || "REGULAR_CATEGORY") === "REGULAR_CATEGORY",
  )

  if (existing?.id) {
    return {
      status: "ok",
      http_status: search.http_status,
      category_id: existing.id,
      category_name: cleanText(existing.category_data?.name) || safeName,
      created: false,
    }
  }

  const create = await squareRequest("/v2/catalog/batch-upsert", {
    method: "POST",
    body: {
      idempotency_key: `pug-square-probe-cat-category-${timestamp}`,
      batches: [
        {
          objects: [
            {
              type: "CATEGORY",
              id: "#pug_probe_category",
              category_data: {
                name: safeName,
                category_type: "REGULAR_CATEGORY",
              },
            },
          ],
        },
      ],
    },
  })
  const categoryId =
    (Array.isArray(create.payload?.id_mappings)
      ? create.payload.id_mappings.find((row) => row?.client_object_id === "#pug_probe_category")?.object_id
      : "") || ""

  return {
    status: "ok",
    http_status: create.http_status,
    category_id: categoryId,
    category_name: safeName,
    created: true,
  }
}

function buildCatalogBody({ itemName, variationName, categoryId, sku, locationId, priceMinorUnits, currency }) {
  return {
    idempotency_key: `pug-square-probe-cat-${timestamp}`,
    batches: [
      {
        objects: [
          {
            type: "ITEM",
            id: "#pug_probe_item",
            present_at_all_locations: false,
            present_at_location_ids: [locationId],
            item_data: {
              name: itemName,
              description:
                "The Pug standalone Square API probe. Safe to delete after verification. Created outside the LAN server.",
              abbreviation: "PUG",
              product_type: "REGULAR",
              categories: categoryId ? [{ id: categoryId }] : [],
              variations: [
                {
                  type: "ITEM_VARIATION",
                  id: "#pug_probe_variation",
                  present_at_all_locations: false,
                  present_at_location_ids: [locationId],
                  item_variation_data: {
                    item_id: "#pug_probe_item",
                    name: variationName,
                    sku,
                    pricing_type: "FIXED_PRICING",
                    price_money: {
                      amount: priceMinorUnits,
                      currency,
                    },
                    track_inventory: true,
                    sellable: true,
                    stockable: true,
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

function extractCatalogIds(payload, sku) {
  const mappings = Array.isArray(payload?.id_mappings) ? payload.id_mappings : []
  const objects = Array.isArray(payload?.objects) ? payload.objects : []
  const itemId = mappings.find((row) => row?.client_object_id === "#pug_probe_item")?.object_id ?? ""
  let variationId = mappings.find((row) => row?.client_object_id === "#pug_probe_variation")?.object_id ?? ""

  if (!variationId) {
    for (const object of objects) {
      const variations = Array.isArray(object?.item_data?.variations) ? object.item_data.variations : []
      const matched = variations.find((variation) => variation?.item_variation_data?.sku === sku)
      if (matched?.id) {
        variationId = matched.id
        break
      }
    }
  }

  return { itemId, variationId }
}

function findLocation(locations, locationId) {
  return (Array.isArray(locations) ? locations : []).find((location) => location?.id === locationId) ?? null
}

function stepError(code, message, step) {
  const error = new Error(message)
  error.code = code
  error.step = step
  return error
}

function publicError(error) {
  return {
    code: String(error?.code ?? "square_probe_failed"),
    message: String(error?.message ?? "Square one-card probe failed."),
    http_status: Number(error?.http_status ?? 0),
    endpoint: String(error?.endpoint ?? ""),
    errors: Array.isArray(error?.errors) ? error.errors : [],
  }
}

function publicSquareErrors(payload) {
  return (Array.isArray(payload?.errors) ? payload.errors : []).map((error) => ({
    category: String(error?.category ?? ""),
    code: String(error?.code ?? ""),
    detail: String(error?.detail ?? ""),
    field: String(error?.field ?? ""),
  }))
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function parseArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith("--")) {
      continue
    }

    const keyValue = value.slice(2)
    const equals = keyValue.indexOf("=")
    if (equals >= 0) {
      parsed[keyValue.slice(0, equals)] = keyValue.slice(equals + 1)
      continue
    }

    const key = keyValue
    const next = argv[index + 1]
    if (!next || next.startsWith("--")) {
      parsed[key] = true
    } else {
      parsed[key] = next
      index += 1
    }
  }

  return parsed
}

function squareBaseUrl(environment) {
  return environment === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com"
}

function timestampForFileName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

function cleanEnvironment(value) {
  const text = String(value ?? "").trim().toLowerCase()
  return text === "production" || text === "prod" || text === "live" ? "production" : "sandbox"
}

function cleanApiVersion(value) {
  const text = String(value ?? "").trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "2026-05-20"
}

function cleanBaseUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim())
    return url.protocol === "https:" ? url.origin : ""
  } catch {
    return ""
  }
}

function cleanSecret(value) {
  return String(value ?? "").trim()
}

function cleanId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w:./-]/g, "")
    .slice(0, 220)
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 255)
}

function cleanSku(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 128)
}

function cleanQuantity(value) {
  const number = Number.parseInt(String(value ?? "").trim(), 10)
  return Number.isFinite(number) && number >= 0 ? String(number) : "1"
}

function cleanMoneyMinor(value) {
  const number = Number.parseInt(String(value ?? "").trim(), 10)
  return Number.isFinite(number) && number > 0 ? number : 100
}

function cleanCurrency(value) {
  const text = String(value ?? "").trim().toUpperCase()
  return /^[A-Z]{3}$/.test(text) ? text : "USD"
}
