import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
  REPORT_COLUMNS,
  csvCell,
  generateSyncReconciliationReport,
  parseSyncReconciliationArgs,
  sanitizeCsvFormula,
} from "../tools/sync-reconciliation-report.mjs"

const testRoot = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(readFileSync(resolve(testRoot, "fixtures", "sync-reconciliation-report.json"), "utf8"))
const tempDirectory = await mkdtemp(join(tmpdir(), "pug-sync-reconciliation-"))

try {
  await testConnectedFixture()
  await testLocalOnlyMode()
  await testUnavailableConnectorFallback()
  await testSchemaOnlyArtifact()
  testCliAndCsvSafety()
  console.log("PASS synchronization reconciliation report")
} finally {
  await rm(tempDirectory, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
}

async function testConnectedFixture() {
  const outputPath = join(tempDirectory, "connected.csv")
  const result = await generateSyncReconciliationReport(
    { outputPath },
    fixtureDependencies({
      website: { status: "ok", code: "fixture_website", rows: fixture.website_inventory },
      square: { status: "ok", code: "fixture_square", counts: fixture.square_counts },
    }),
  )
  const csv = readFileSync(outputPath, "utf8")
  const rows = parseCsv(csv)

  assert.equal(result.status, "ok")
  assert.equal(result.report_mode, "connected")
  assert.equal(result.rows_written, 3)
  assert.equal(result.mismatch_rows, 2)
  assert.deepEqual(rows[0], REPORT_COLUMNS)

  const matched = rowObject(rows, "internal_item_id", "inv-matched")
  assert.equal(matched.pending_failed_status, "synced")
  assert.equal(matched.last_verified_sync_at_utc, "2026-07-18T18:03:00.000Z")
  assert.equal(matched.mismatch_reason, "")
  assert.equal(matched.square_expected_count, "2")
  assert.equal(matched.square_count, "2")

  const reserved = rowObject(rows, "internal_item_id", "inv-reserved")
  assert.equal(reserved.item_name, "'=2+2")
  assert.equal(reserved.reserved_quantity, "1")
  assert.equal(reserved.square_expected_count, "0")
  assert.equal(reserved.square_count, "1")
  assert.match(reserved.pending_failed_status, /^failed:square:dead_letter:square_count_failed$/)
  assert.equal(
    reserved.mismatch_reason,
    "website_quantity_mismatch;website_status_mismatch;square_count_mismatch;wordpress_projection_pending;square_projection_failed",
  )

  const websiteOnly = rowObject(rows, "wordpress_public_id", "wp-only")
  assert.equal(websiteOnly.item_name, "'@SUM(1+1)")
  assert.equal(websiteOnly.mismatch_reason, "internal_item_missing")
}

async function testLocalOnlyMode() {
  const outputPath = join(tempDirectory, "local-only.csv")
  const dependencies = fixtureDependencies({
    website: async () => { throw new Error("website connector must not run") },
    square: async () => { throw new Error("square connector must not run") },
  })
  const result = await generateSyncReconciliationReport({ outputPath, localOnly: true }, dependencies)
  const rows = parseCsv(readFileSync(outputPath, "utf8"))

  assert.equal(result.report_mode, "local_only")
  assert.equal(result.rows_written, 2)
  const matched = rowObject(rows, "internal_item_id", "inv-matched")
  assert.match(matched.mismatch_reason, /website_not_checked_local_only/)
  assert.match(matched.mismatch_reason, /square_not_checked_local_only/)
  assert.equal(matched.website_projection_status, "verified")
  assert.equal(matched.square_projection_status, "verified")
}

async function testUnavailableConnectorFallback() {
  const outputPath = join(tempDirectory, "fallback.csv")
  const result = await generateSyncReconciliationReport(
    { outputPath },
    fixtureDependencies({
      website: { status: "blocked", code: "wordpress_inventory_pull_unconfigured", rows: [] },
      square: { status: "blocked", code: "square_access_token_missing", counts: [] },
    }),
  )
  const rows = parseCsv(readFileSync(outputPath, "utf8"))

  assert.equal(result.status, "ok")
  assert.equal(result.report_mode, "local_only_fallback")
  assert.equal(result.rows_written, 2)
  const matched = rowObject(rows, "internal_item_id", "inv-matched")
  assert.match(matched.mismatch_reason, /website_connector_unavailable:wordpress_inventory_pull_unconfigured/)
  assert.match(matched.mismatch_reason, /square_connector_unavailable:square_access_token_missing/)
}

async function testSchemaOnlyArtifact() {
  const outputPath = join(tempDirectory, "schema.csv")
  const result = await generateSyncReconciliationReport(
    { outputPath, schemaOnly: true },
    {
      readLocalTable: () => { throw new Error("schema generation must not read local data") },
      pullWebsiteInventoryRows: async () => { throw new Error("schema generation must not read website data") },
      pullSquareInventoryCounts: async () => { throw new Error("schema generation must not read Square data") },
      now: () => new Date(fixture.generated_at_utc),
    },
  )

  assert.equal(result.report_mode, "schema_only")
  assert.equal(result.rows_written, 0)
  assert.equal(readFileSync(outputPath, "utf8"), `${REPORT_COLUMNS.join(",")}\n`)
}

function testCliAndCsvSafety() {
  assert.equal(parseSyncReconciliationArgs(["--local-only", "--output", "report.csv"]).localOnly, true)
  assert.equal(parseSyncReconciliationArgs(["--schema-only"]).schemaOnly, true)
  assert.throws(() => parseSyncReconciliationArgs(["--unknown"]), (error) => error.code === "unknown_argument")
  for (const dangerous of ["=1+1", "+1+1", "-1+1", "@SUM(A1:A2)", "\t=1+1", "  =1+1"]) {
    assert.equal(sanitizeCsvFormula(dangerous).startsWith("'"), true)
  }
  assert.equal(sanitizeCsvFormula("ordinary text"), "ordinary text")
  assert.equal(csvCell('A, "quoted" value'), '"A, ""quoted"" value"')
}

function fixtureDependencies({ website, square }) {
  const tables = {
    inventory_items: fixture.inventory_items,
    inventory_reservations: fixture.inventory_reservations,
    operation_queue: fixture.operation_queue,
    sync_outbox_events: fixture.sync_outbox_events,
    sync_outbox_deliveries: fixture.sync_outbox_deliveries,
  }
  return {
    readLocalTable: (tableName) => ({ status: "ok", rows: tables[tableName] ?? [] }),
    pullWebsiteInventoryRows: typeof website === "function" ? website : async () => website,
    pullSquareInventoryCounts: typeof square === "function" ? square : async () => square,
    now: () => new Date(fixture.generated_at_utc),
  }
}

function rowObject(rows, column, value) {
  const header = rows[0]
  const index = header.indexOf(column)
  const row = rows.slice(1).find((candidate) => candidate[index] === value)
  assert.ok(row, `Expected CSV row with ${column}=${value}`)
  return Object.fromEntries(header.map((name, columnIndex) => [name, row[columnIndex]]))
}

function parseCsv(input) {
  const rows = []
  let row = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (quoted && character === '"' && input[index + 1] === '"') {
      cell += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (!quoted && character === ",") {
      row.push(cell)
      cell = ""
    } else if (!quoted && character === "\n") {
      row.push(cell.replace(/\r$/, ""))
      rows.push(row)
      row = []
      cell = ""
    } else {
      cell += character
    }
  }

  if (cell || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}
