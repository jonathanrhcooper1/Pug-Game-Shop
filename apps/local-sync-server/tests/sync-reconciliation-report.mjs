import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"

import {
  REPORT_COLUMNS,
  applyProjectionRepairs,
  buildProjectionRepairPlan,
  csvCell,
  generateSyncReconciliationReport,
  parseSyncReconciliationArgs,
  sanitizeCsvFormula,
} from "../tools/sync-reconciliation-report.mjs"
import { migrateAuthoritativeLedger } from "../src/authoritativeLedger.mjs"

const testRoot = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(readFileSync(resolve(testRoot, "fixtures", "sync-reconciliation-report.json"), "utf8"))
const fixtureCsv = readFileSync(resolve(testRoot, "fixtures", "sync-reconciliation-report.csv"), "utf8")
const tempDirectory = await mkdtemp(join(tmpdir(), "pug-sync-reconciliation-"))

try {
  await testConnectedFixture()
  await testLocalOnlyMode()
  await testUnavailableConnectorFallback()
  await testSchemaOnlyArtifact()
  await testRepairDryRunAndConfirmationGuard()
  await testIdempotentAuthoritativeRepairQueue()
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
  assert.equal(result.rows_written, 4)
  assert.equal(result.mismatch_rows, 3)
  assert.deepEqual(rows[0], REPORT_COLUMNS)
  assert.equal(csv, fixtureCsv)

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

  const repair = rowObject(rows, "internal_item_id", "inv-repair")
  assert.equal(repair.internal_quantity, "3")
  assert.equal(repair.square_expected_count, "3")
  assert.equal(repair.square_count, "1")
  assert.equal(repair.mismatch_reason, "website_quantity_mismatch;square_count_mismatch;kiosk_projection_not_recorded")
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
  assert.equal(result.rows_written, 3)
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
  assert.equal(result.rows_written, 3)
  const matched = rowObject(rows, "internal_item_id", "inv-matched")
  assert.match(matched.mismatch_reason, /website_connector_unavailable:wordpress_inventory_pull_unconfigured/)
  assert.match(matched.mismatch_reason, /square_connector_unavailable:square_access_token_missing/)
}

async function testRepairDryRunAndConfirmationGuard() {
  const dryRunOutput = join(tempDirectory, "repair-dry-run.csv")
  const dryRunAudit = join(tempDirectory, "repair-dry-run.json")
  const dryRun = await generateSyncReconciliationReport(
    { outputPath: dryRunOutput, auditOutputPath: dryRunAudit, reconcileNow: true },
    fixtureDependencies({
      website: { status: "ok", code: "fixture_website", rows: fixture.website_inventory },
      square: { status: "ok", code: "fixture_square", counts: fixture.square_counts },
      applyProjectionRepairs: () => { throw new Error("dry-run must not mutate") },
    }),
  )

  assert.equal(dryRun.status, "ok")
  assert.equal(dryRun.repair.status, "planned")
  assert.equal(dryRun.repair.planned_count, 1)
  assert.equal(dryRun.repair.queued_count, 0)
  assert.equal(JSON.parse(readFileSync(dryRunAudit, "utf8")).safety.local_inventory_overwritten, false)

  const blockedAudit = join(tempDirectory, "repair-blocked.json")
  let applyCalls = 0
  const blocked = await generateSyncReconciliationReport(
    {
      outputPath: join(tempDirectory, "repair-blocked.csv"),
      auditOutputPath: blockedAudit,
      reconcileNow: true,
      apply: true,
      reason: "Fixture projection repair",
    },
    fixtureDependencies({
      website: { status: "ok", code: "fixture_website", rows: fixture.website_inventory },
      square: { status: "ok", code: "fixture_square", counts: fixture.square_counts },
      applyProjectionRepairs: () => { applyCalls += 1 },
    }),
  )

  assert.equal(blocked.status, "blocked")
  assert.equal(blocked.code, "confirm_authoritative_local_required")
  assert.equal(applyCalls, 0)
  assert.equal(JSON.parse(readFileSync(blockedAudit, "utf8")).result.code, "confirm_authoritative_local_required")

  const missingReason = await generateSyncReconciliationReport(
    {
      outputPath: join(tempDirectory, "repair-missing-reason.csv"),
      auditOutputPath: join(tempDirectory, "repair-missing-reason.json"),
      reconcileNow: true,
      apply: true,
      confirmAuthoritativeLocal: true,
    },
    fixtureDependencies({
      website: { status: "ok", code: "fixture_website", rows: fixture.website_inventory },
      square: { status: "ok", code: "fixture_square", counts: fixture.square_counts },
      applyProjectionRepairs: () => { applyCalls += 1 },
    }),
  )
  assert.equal(missingReason.status, "blocked")
  assert.equal(missingReason.code, "reconciliation_reason_required")
  assert.equal(applyCalls, 0)
}

async function testIdempotentAuthoritativeRepairQueue() {
  const databasePath = join(tempDirectory, "repair.sqlite")
  const database = new DatabaseSync(databasePath)
  database.exec(`
    CREATE TABLE inventory_items (
      public_id TEXT PRIMARY KEY,
      wordpress_public_id TEXT,
      row_version INTEGER,
      game TEXT,
      card_name TEXT,
      set_name TEXT,
      condition TEXT,
      barcode TEXT,
      status TEXT,
      quantity_on_hand INTEGER,
      price_minor_units INTEGER,
      minimum_sale_price_minor_units INTEGER,
      currency TEXT,
      location TEXT,
      online_visibility TEXT,
      kiosk_visibility TEXT,
      pos_visibility TEXT,
      square_catalog_variation_id TEXT,
      square_location_id TEXT,
      external_sync_state TEXT
    );
    CREATE TABLE operation_queue (
      operation_id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      queued_at_utc TEXT NOT NULL,
      sync_status TEXT NOT NULL
    );
  `)
  migrateAuthoritativeLedger(database, () => new Date(fixture.generated_at_utc))
  const item = fixture.inventory_items.find((candidate) => candidate.public_id === "inv-repair")
  database.prepare(`
    INSERT INTO inventory_items (
      public_id, wordpress_public_id, row_version, game, card_name, set_name, condition,
      barcode, status, quantity_on_hand, price_minor_units, minimum_sale_price_minor_units,
      currency, location, online_visibility, kiosk_visibility, pos_visibility,
      square_catalog_variation_id, square_location_id, external_sync_state
    ) VALUES (
      @public_id, @wordpress_public_id, @row_version, @game, @card_name, @set_name, @condition,
      @barcode, @status, @quantity_on_hand, @price_minor_units, @minimum_sale_price_minor_units,
      @currency, @location, @online_visibility, @kiosk_visibility, @pos_visibility,
      @square_catalog_variation_id, @square_location_id, @external_sync_state
    )
  `).run(item)
  const before = database.prepare("SELECT * FROM inventory_items WHERE public_id = ?").get("inv-repair")
  database.close()

  const reportRows = Array.from(buildProjectionRepairPlanFixtureRows())
  const plan = buildProjectionRepairPlan({
    reportRows,
    inventoryRows: fixture.inventory_items,
    operationRows: fixture.operation_queue,
    generatedAtUtc: fixture.generated_at_utc,
    reason: "Fixture projection repair",
  })
  assert.equal(plan.planned_count, 1)
  assert.equal(plan.repairs[0].internal_item_id, "inv-repair")
  assert.equal(plan.skipped.some((entry) => entry.internal_item_id === "inv-reserved"), true)
  assert.equal(plan.skipped.some((entry) => entry.reason === "remote_only_item_not_authoritative"), true)

  const directGuard = applyProjectionRepairs(plan, { databasePath, reason: "Fixture projection repair" })
  assert.equal(directGuard.status, "blocked")
  assert.equal(directGuard.code, "confirm_authoritative_local_required")

  const first = applyProjectionRepairs(plan, {
    databasePath,
    now: () => new Date(fixture.generated_at_utc),
    confirmAuthoritativeLocal: true,
    reason: "Fixture projection repair",
  })
  const second = applyProjectionRepairs(plan, {
    databasePath,
    now: () => new Date(fixture.generated_at_utc),
    confirmAuthoritativeLocal: true,
    reason: "Fixture projection repair",
  })
  assert.equal(first.status, "ok")
  assert.equal(first.queued_count, 1)
  assert.equal(first.local_inventory_rows_modified, 0)
  assert.equal(second.queued_count, 0)
  assert.equal(second.already_queued_count, 1)

  const verification = new DatabaseSync(databasePath)
  const after = verification.prepare("SELECT * FROM inventory_items WHERE public_id = ?").get("inv-repair")
  assert.deepEqual(after, before)
  assert.equal(verification.prepare("SELECT COUNT(*) AS count FROM operation_queue").get().count, 1)
  assert.equal(verification.prepare("SELECT COUNT(*) AS count FROM sync_outbox_events").get().count, 1)
  assert.equal(verification.prepare("SELECT COUNT(*) AS count FROM sync_outbox_deliveries").get().count, 3)
  assert.equal(
    verification.prepare("SELECT status FROM sync_outbox_deliveries WHERE destination = 'kiosk'").get().status,
    "verified",
  )
  verification.prepare("UPDATE inventory_items SET quantity_on_hand = 4 WHERE public_id = ?").run("inv-repair")
  verification.close()

  const stale = applyProjectionRepairs(plan, {
    databasePath,
    now: () => new Date(fixture.generated_at_utc),
    confirmAuthoritativeLocal: true,
    reason: "Fixture projection repair",
  })
  assert.equal(stale.queued_count, 0)
  assert.equal(stale.stale_local_count, 1)
}

function buildProjectionRepairPlanFixtureRows() {
  return [
    {
      internal_item_id: "inv-reserved",
      mismatch_reason: "website_quantity_mismatch;square_count_mismatch;square_projection_failed",
      website_projection: "status=available;quantity=2;online=visible;kiosk=visible",
      square_expected_count: 0,
      square_count: 1,
      last_verified_sync_at_utc: "2026-07-18T19:00:30.000Z",
    },
    {
      internal_item_id: "inv-repair",
      mismatch_reason: "website_quantity_mismatch;square_count_mismatch;kiosk_projection_not_recorded",
      website_projection: "status=available;quantity=1;online=visible;kiosk=visible",
      square_expected_count: 3,
      square_count: 1,
      last_verified_sync_at_utc: "",
    },
    {
      internal_item_id: "",
      mismatch_reason: "internal_item_missing",
      wordpress_public_id: "wp-only",
    },
  ]
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
  assert.equal(parseSyncReconciliationArgs(["--reconcile-now"]).apply, false)
  assert.equal(
    parseSyncReconciliationArgs([
      "--reconcile-now",
      "--apply",
      "--confirm-authoritative-local",
      "--reason",
      "Operator repair",
    ]).confirmAuthoritativeLocal,
    true,
  )
  assert.throws(
    () => parseSyncReconciliationArgs(["--apply"]),
    (error) => error.code === "reconcile_now_required_for_apply",
  )
  assert.throws(() => parseSyncReconciliationArgs(["--unknown"]), (error) => error.code === "unknown_argument")
  for (const dangerous of ["=1+1", "+1+1", "-1+1", "@SUM(A1:A2)", "\t=1+1", "  =1+1"]) {
    assert.equal(sanitizeCsvFormula(dangerous).startsWith("'"), true)
  }
  assert.equal(sanitizeCsvFormula("ordinary text"), "ordinary text")
  assert.equal(csvCell('A, "quoted" value'), '"A, ""quoted"" value"')
}

function fixtureDependencies({ website, square, applyProjectionRepairs }) {
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
    ...(applyProjectionRepairs ? { applyProjectionRepairs } : {}),
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
