import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { createSquareCatalogInventorySyncer } from "../apps/local-sync-server/src/squareCatalogInventorySyncer.mjs"
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
const confirmValue = "seed-square-pos-singles-layout"
const environment = cleanEnvironment(args.environment ?? process.env.PUG_SQUARE_ENVIRONMENT ?? "production")
const accessToken = cleanSecret(
  process.env.PUG_SQUARE_ACCESS_TOKEN ?? process.env.LOCAL_SYNC_SQUARE_ACCESS_TOKEN ?? process.env.SQUARE_ACCESS_TOKEN,
)
const locationId = cleanExternalId(
  args.location ?? process.env.PUG_SQUARE_LOCATION_ID ?? process.env.LOCAL_SYNC_SQUARE_LOCATION_ID ?? process.env.SQUARE_LOCATION_ID,
)
const apiVersion = cleanApiVersion(args["api-version"] ?? process.env.PUG_SQUARE_API_VERSION ?? "2026-05-20")
const baseUrl = cleanBaseUrl(args["base-url"] ?? process.env.PUG_SQUARE_BASE_URL)
const timestamp = timestampForFileName(new Date())
const includeTestCard = args["no-test-card"] !== true
const testSku = cleanSku(args.sku ?? `PUG-CODEX-POS-SINGLES-MTG-${timestamp}`)
const outputPath = resolve(root, args.output ?? `tmp/square-pos-singles-layout-${timestamp}.json`)

const expectations = {
  architecture: "standalone_square_pos_layout_seed_without_middleman_server",
  runtime_package_mutated: false,
  wordpress_mutated: false,
  square_categories: ["Singles", "Singles / MTG", "Singles / Lorcana", "Singles / Riftbound", "Singles / Pokemon"],
  square_test_card_created: includeTestCard,
  square_test_card_category_path: includeTestCard ? "Singles / MTG" : "",
  location_id: locationId || "(missing)",
  credentialsPrinted: false,
  tokenStoredInRepo: false,
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "square_pos_singles_layout_seed_dry_run",
        purpose:
          "Create the Square POS browsing category tree Singles > MTG/Lorcana/Riftbound/Pokemon and optionally add one permanent MTG test card.",
        requiresEnv: ["PUG_SQUARE_ACCESS_TOKEN or SQUARE_ACCESS_TOKEN"],
        requiredArgsOrEnv: ["--location or PUG_SQUARE_LOCATION_ID"],
        productionApprovalRequired: true,
        executeCommand:
          "PUG_SQUARE_POS_LAYOUT_CONFIRM=seed-square-pos-singles-layout npm run square:seed-pos-singles-layout -- --execute --location <location-id>",
        expectations,
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
  throw new Error(`Missing Square POS layout seed inputs: ${missing.join(", ")}`)
}

if (environment !== "production") {
  throw new Error(`This Square POS layout seed expects production; got ${environment}.`)
}

if (process.env.PUG_SQUARE_POS_LAYOUT_CONFIRM !== confirmValue) {
  throw new Error(`Set PUG_SQUARE_POS_LAYOUT_CONFIRM=${confirmValue} to seed the live Square POS layout.`)
}

const syncer = createSquareCatalogInventorySyncer({
  accessToken,
  environment,
  locationId,
  apiVersion,
  baseUrl,
  imageSyncEnabled: false,
})

const report = {
  action: "square_pos_singles_layout_seed",
  started_at_utc: new Date().toISOString(),
  status: "started",
  environment,
  api_version: apiVersion,
  expectations,
  steps: [],
  credentialsPrinted: false,
  tokenStoredInRepo: false,
}

try {
  const layout = await syncer.ensureDefaultSquarePosCategories()
  report.steps.push({
    step: "catalog.ensure_default_singles_layout",
    status: layout.status,
    code: layout.code,
    category_count: layout.category_count ?? 0,
    categories: Array.isArray(layout.categories)
      ? layout.categories.map((category) => ({
          id: category.id,
          name: category.name,
          parent_id: category.parent_id,
          created: category.created,
        }))
      : [],
  })

  if (layout.status !== "ok") {
    throw stepError(
      layout.code || "square_pos_layout_seed_failed",
      layout.message || "Square POS Singles layout seed failed.",
      report.steps.at(-1),
    )
  }

  if (includeTestCard) {
    const testCard = await syncer.syncInventoryItem({
      operation: {
        operation_id: `square-pos-layout-test-${timestamp}`,
        operation_type: "inventory_intake",
        entity_id: `square-pos-layout-test-${timestamp}`,
      },
      item: {
        public_id: `square-pos-layout-test-${timestamp}`,
        row_version: 1,
        game: "magic",
        raw_or_graded: "raw",
        card_name: "PUG POS Singles Test Card",
        set_name: "Square POS Layout",
        set_code: "PUG",
        printed_number: "001",
        condition: "NM",
        variant: "normal",
        barcode: testSku,
        price_minor_units: 100,
        quantity_on_hand: 1,
        currency: "USD",
        status: "available",
        pos_visibility: "visible",
      },
    })

    report.steps.push({
      step: "catalog.create_mtg_test_card",
      status: testCard.status,
      code: testCard.code,
      item_id: testCard.square_catalog_item_id ?? "",
      variation_id: testCard.square_catalog_variation_id ?? "",
      category_ids: testCard.square_category_ids ?? [],
      sku: testSku,
      quantity: testCard.quantity_on_hand ?? 0,
    })

    if (testCard.status !== "ok") {
      throw stepError(
        testCard.code || "square_pos_layout_test_card_failed",
        testCard.message || "Square POS Singles MTG test card creation failed.",
        report.steps.at(-1),
      )
    }

    report.square_test_card = {
      sku: testSku,
      item_id: testCard.square_catalog_item_id ?? "",
      variation_id: testCard.square_catalog_variation_id ?? "",
      category_path: "Singles / MTG",
      quantity: testCard.quantity_on_hand ?? 0,
    }
  }

  report.status = "ok"
  report.completed_at_utc = new Date().toISOString()
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
      categories: report.steps.find((step) => step.step === "catalog.ensure_default_singles_layout")?.categories ?? [],
      test_card: report.square_test_card ?? null,
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

function stepError(code, message, step) {
  const error = new Error(message)
  error.code = code
  error.step = step
  return error
}

function publicError(error) {
  return {
    code: String(error?.code ?? "square_pos_layout_seed_failed"),
    message: String(error?.message ?? "Square POS layout seed failed."),
    http_status: Number(error?.http_status ?? 0),
    errors: Array.isArray(error?.errors) ? error.errors : [],
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

function cleanExternalId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w:./#-]/g, "")
    .slice(0, 220)
}

function cleanSku(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 128)
}
