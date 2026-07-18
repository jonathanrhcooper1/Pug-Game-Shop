import { once } from "node:events"
import { createHash } from "node:crypto"
import { createWriteStream, existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"

import {
  appendProjectionEvent,
  markOutboxDelivery,
  withImmediateTransaction,
} from "../src/authoritativeLedger.mjs"

import {
  extractSquareVariationIds,
  localSyncDatabasePath,
  loadOpsEnv,
  pullSquareInventoryCounts,
  pullWebsiteInventoryRows,
  readLocalTable,
  repoRoot,
} from "./lib/ops-common.mjs"

export const REPORT_SCHEMA_VERSION = "1"
export const REPORT_COLUMNS = Object.freeze([
  "report_schema_version",
  "report_mode",
  "internal_item_id",
  "wordpress_public_id",
  "item_name",
  "barcode",
  "internal_status",
  "internal_quantity",
  "website_projection",
  "website_projection_status",
  "square_variation_id",
  "square_expected_count",
  "square_count",
  "square_projection_status",
  "kiosk_projection",
  "kiosk_projection_status",
  "reserved_quantity",
  "pending_failed_status",
  "last_verified_sync_at_utc",
  "mismatch_reason",
])

const DEFAULT_OUTPUT_PATH = resolve(repoRoot, "PUG_SYNC_RECONCILIATION_REPORT.csv")
const DEFAULT_AUDIT_OUTPUT_PATH = resolve(repoRoot, "PUG_SYNC_RECONCILIATION_AUDIT.json")
const REPAIR_AUDIT_SCHEMA_VERSION = "1"
const LOCAL_TABLES = [
  "inventory_items",
  "inventory_reservations",
  "operation_queue",
  "sync_outbox_events",
  "sync_outbox_deliveries",
]
const PENDING_DELIVERY_STATUSES = new Set(["pending", "processing", "retry", "delivered_unverified"])
const TERMINAL_DELIVERY_STATUSES = new Set(["verified", "cancelled"])

export async function generateSyncReconciliationReport(options = {}, dependencies = {}) {
  const outputPath = resolve(String(options.outputPath || DEFAULT_OUTPUT_PATH))
  const now = typeof dependencies.now === "function" ? dependencies.now : () => new Date()

  if (options.schemaOnly === true) {
    const writeResult = await writeCsvReport(outputPath, [])
    return {
      status: "ok",
      code: "sync_reconciliation_schema_written",
      report_schema_version: REPORT_SCHEMA_VERSION,
      report_mode: "schema_only",
      output_path: outputPath,
      generated_at_utc: now().toISOString(),
      ...writeResult,
      credentials_printed: false,
      raw_credentials_returned: false,
    }
  }

  const tableReader = dependencies.readLocalTable ?? readLocalTable
  const tables = Object.fromEntries(LOCAL_TABLES.map((tableName) => [tableName, safeReadLocalTable(tableReader, tableName)]))
  const inventory = tables.inventory_items

  if (inventory.status !== "ok") {
    const writeResult = await writeCsvReport(outputPath, [])
    return {
      status: "blocked",
      code: "local_inventory_unavailable",
      report_schema_version: REPORT_SCHEMA_VERSION,
      report_mode: options.localOnly === true ? "local_only" : "local_only_fallback",
      output_path: outputPath,
      generated_at_utc: now().toISOString(),
      local_table_statuses: publicTableStatuses(tables),
      ...writeResult,
      credentials_printed: false,
      raw_credentials_returned: false,
    }
  }

  const websitePull = dependencies.pullWebsiteInventoryRows ?? pullWebsiteInventoryRows
  const squarePull = dependencies.pullSquareInventoryCounts ?? pullSquareInventoryCounts
  let websiteResult
  let squareResult

  if (options.localOnly === true) {
    websiteResult = connectorSkipped("website_not_checked_local_only", "rows")
    squareResult = connectorSkipped("square_not_checked_local_only", "counts")
  } else {
    websiteResult = await safeConnectorRead(
      () => websitePull(boundedInt(options.websitePageSize, 1, 100, 100), boundedInt(options.websiteMaxPages, 1, 100000, 10000)),
      "website_inventory_read_failed",
      "rows",
    )
    const squareVariationIds = extractSquareVariationIds(inventory.rows, websiteResult.rows)
    squareResult = squareVariationIds.length > 0
      ? await safeConnectorRead(
          () => squarePull(squareVariationIds),
          "square_inventory_read_failed",
          "counts",
        )
      : {
          status: "ok",
          code: "no_mapped_square_variations",
          counts: [],
          credentials_printed: false,
          raw_credentials_returned: false,
        }
  }

  const reportMode = resolveReportMode(options.localOnly === true, websiteResult, squareResult)
  const rows = buildReconciliationRows({
    reportMode,
    inventoryRows: inventory.rows,
    reservationRows: tables.inventory_reservations.rows,
    queueRows: tables.operation_queue.rows,
    outboxEventRows: tables.sync_outbox_events.rows,
    deliveryRows: tables.sync_outbox_deliveries.rows,
    websiteResult,
    squareResult,
    generatedAtUtc: now().toISOString(),
  })
  const reportRowsForRepair = []
  const writeResult = await writeCsvReport(outputPath, rows, {
    onRow: options.reconcileNow === true ? (row) => reportRowsForRepair.push(row) : null,
  })
  const repairResult = options.reconcileNow === true
    ? await reconcileAuthoritativeProjections({
        options,
        reportRows: reportRowsForRepair,
        inventoryRows: inventory.rows,
        operationRows: tables.operation_queue.rows,
        generatedAtUtc: now().toISOString(),
        reportPath: outputPath,
      }, dependencies)
    : null

  return {
    status: repairResult?.status === "blocked" ? "blocked" : "ok",
    code: repairResult?.status === "blocked"
      ? repairResult.code
      : "sync_reconciliation_report_written",
    report_schema_version: REPORT_SCHEMA_VERSION,
    report_mode: reportMode,
    output_path: outputPath,
    generated_at_utc: now().toISOString(),
    local_table_statuses: publicTableStatuses(tables),
    connectors: {
      website: publicConnectorStatus(websiteResult),
      square: publicConnectorStatus(squareResult),
    },
    ...(repairResult ? { repair: repairResult } : {}),
    ...writeResult,
    credentials_printed: false,
    raw_credentials_returned: false,
  }
}

export function buildReconciliationRows(input = {}) {
  const inventoryRows = validRows(input.inventoryRows)
  const websiteRows = input.websiteResult?.status === "ok" ? validRows(input.websiteResult.rows) : []
  const websiteIndex = indexWebsiteRows(websiteRows)
  const matchedWebsiteRows = new Set()
  const reservations = indexReservations(validRows(input.reservationRows), input.generatedAtUtc)
  const sync = indexSyncState({
    inventoryRows,
    reservationRows: validRows(input.reservationRows),
    queueRows: validRows(input.queueRows),
    outboxEventRows: validRows(input.outboxEventRows),
    deliveryRows: validRows(input.deliveryRows),
  })
  const squareCounts = indexSquareCounts(validRows(input.squareResult?.counts))
  const squareExpectedCounts = expectedSquareCounts(inventoryRows)
  const websiteChecked = input.websiteResult?.status === "ok"
  const squareChecked = input.squareResult?.status === "ok"

  return (function* reconciliationRows() {
    for (const item of inventoryRows) {
      const websiteMatch = findWebsiteMatch(item, websiteIndex)
      if (websiteMatch.row) {
        matchedWebsiteRows.add(websiteMatch.row)
      }

      const itemId = cleanId(item.public_id)
      const squareVariationId = cleanId(
        item.square_catalog_variation_id ?? websiteMatch.row?.square_catalog_variation_id,
      )
      const squareCount = squareCounts.get(squareVariationId)
      const reserved = reservations.byItem.get(itemId) ?? { quantity: 0, expiredActive: false }
      const itemSync = sync.byItem.get(itemId) ?? emptySyncState()
      const mismatchReasons = internalMismatchReasons({
        item,
        websiteMatch,
        websiteChecked,
        websiteConnectorCode: input.websiteResult?.code,
        squareChecked,
        squareConnectorCode: input.squareResult?.code,
        squareVariationId,
        squareExpectedCount: squareVariationId ? (squareExpectedCounts.get(squareVariationId) ?? 0) : null,
        squareCount,
        reserved,
        itemSync,
      })

      yield {
        report_schema_version: REPORT_SCHEMA_VERSION,
        report_mode: input.reportMode,
        internal_item_id: itemId,
        wordpress_public_id: cleanId(item.wordpress_public_id || websiteMatch.row?.public_id),
        item_name: cleanText(item.card_name),
        barcode: cleanText(item.barcode),
        internal_status: cleanStatus(item.status),
        internal_quantity: quantity(item.quantity_on_hand, item.status),
        website_projection: websiteProjection(websiteMatch.row),
        website_projection_status: projectionStatus(itemSync, "wordpress"),
        square_variation_id: squareVariationId,
        square_expected_count: squareVariationId ? (squareExpectedCounts.get(squareVariationId) ?? 0) : "",
        square_count: squareCount?.quantity ?? "",
        square_projection_status: projectionStatus(itemSync, "square"),
        kiosk_projection: kioskProjection(item),
        kiosk_projection_status: projectionStatus(itemSync, "kiosk"),
        reserved_quantity: reserved.quantity,
        pending_failed_status: pendingFailedStatus(item, itemSync),
        last_verified_sync_at_utc: lastVerifiedAt(itemSync),
        mismatch_reason: mismatchReasons.join(";"),
      }
    }

    for (const websiteRow of websiteRows) {
      if (matchedWebsiteRows.has(websiteRow)) {
        continue
      }

      const squareVariationId = cleanId(websiteRow.square_catalog_variation_id)
      const squareCount = squareCounts.get(squareVariationId)
      const mismatchReasons = ["internal_item_missing"]
      if (!squareChecked) {
        mismatchReasons.push(connectorMismatchCode("square", input.squareResult?.code))
      }

      yield {
        report_schema_version: REPORT_SCHEMA_VERSION,
        report_mode: input.reportMode,
        internal_item_id: "",
        wordpress_public_id: cleanId(websiteRow.public_id ?? websiteRow.wordpress_public_id),
        item_name: cleanText(websiteRow.card_name ?? websiteRow.name),
        barcode: cleanText(websiteRow.barcode ?? websiteRow.sku),
        internal_status: "",
        internal_quantity: "",
        website_projection: websiteProjection(websiteRow),
        website_projection_status: "remote_only",
        square_variation_id: squareVariationId,
        square_expected_count: "",
        square_count: squareCount?.quantity ?? "",
        square_projection_status: "not_recorded",
        kiosk_projection: "",
        kiosk_projection_status: "no_internal_item",
        reserved_quantity: 0,
        pending_failed_status: "untracked_remote_item",
        last_verified_sync_at_utc: "",
        mismatch_reason: uniqueValues(mismatchReasons).join(";"),
      }
    }
  })()
}

export function parseSyncReconciliationArgs(argv = []) {
  const parsed = {
    outputPath: DEFAULT_OUTPUT_PATH,
    localOnly: false,
    schemaOnly: false,
    websitePageSize: 100,
    websiteMaxPages: 10000,
    reconcileNow: false,
    apply: false,
    confirmAuthoritativeLocal: false,
    reason: "",
    auditOutputPath: DEFAULT_AUDIT_OUTPUT_PATH,
    databasePath: "",
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = String(argv[index] ?? "")
    if (argument === "--local-only") parsed.localOnly = true
    else if (argument === "--schema-only") parsed.schemaOnly = true
    else if (argument === "--reconcile-now") parsed.reconcileNow = true
    else if (argument === "--apply") parsed.apply = true
    else if (argument === "--confirm-authoritative-local") parsed.confirmAuthoritativeLocal = true
    else if (argument === "--help" || argument === "-h") parsed.help = true
    else if (argument === "--output") parsed.outputPath = requiredArgument(argv[++index], "output")
    else if (argument.startsWith("--output=")) parsed.outputPath = requiredArgument(argument.slice(9), "output")
    else if (argument === "--website-page-size") parsed.websitePageSize = requiredArgument(argv[++index], "website_page_size")
    else if (argument.startsWith("--website-page-size=")) parsed.websitePageSize = requiredArgument(argument.slice(20), "website_page_size")
    else if (argument === "--website-max-pages") parsed.websiteMaxPages = requiredArgument(argv[++index], "website_max_pages")
    else if (argument.startsWith("--website-max-pages=")) parsed.websiteMaxPages = requiredArgument(argument.slice(20), "website_max_pages")
    else if (argument === "--reason") parsed.reason = requiredArgument(argv[++index], "reason")
    else if (argument.startsWith("--reason=")) parsed.reason = requiredArgument(argument.slice(9), "reason")
    else if (argument === "--audit-output") parsed.auditOutputPath = requiredArgument(argv[++index], "audit_output")
    else if (argument.startsWith("--audit-output=")) parsed.auditOutputPath = requiredArgument(argument.slice(15), "audit_output")
    else if (argument === "--database") parsed.databasePath = requiredArgument(argv[++index], "database")
    else if (argument.startsWith("--database=")) parsed.databasePath = requiredArgument(argument.slice(11), "database")
    else throw toolError("unknown_argument")
  }

  if (parsed.apply && !parsed.reconcileNow) throw toolError("reconcile_now_required_for_apply")
  if (parsed.schemaOnly && parsed.reconcileNow) throw toolError("schema_only_cannot_reconcile")

  return parsed
}

export function buildProjectionRepairPlan(input = {}) {
  const inventoryById = new Map(validRows(input.inventoryRows).map((row) => [cleanId(row.public_id), row]))
  const pendingItemIds = pendingInventoryOperationItemIds(validRows(input.operationRows))
  const repairs = []
  const skipped = []

  for (const row of validRows(input.reportRows)) {
    const itemId = cleanId(row.internal_item_id)
    if (!itemId) {
      if (String(row.mismatch_reason ?? "").split(";").includes("internal_item_missing")) {
        skipped.push({ internal_item_id: "", reason: "remote_only_item_not_authoritative" })
      }
      continue
    }

    const item = inventoryById.get(itemId)
    if (!item) {
      skipped.push({ internal_item_id: itemId, reason: "local_inventory_item_missing" })
      continue
    }

    const repairableReasons = projectionRepairReasons(row)
    if (repairableReasons.length === 0) continue
    if (pendingItemIds.has(itemId)) {
      skipped.push({ internal_item_id: itemId, reason: "authoritative_projection_already_queued" })
      continue
    }

    const localFingerprint = localProjectionFingerprint(item)
    const operationFingerprint = sha256({
      local_projection_fingerprint: localFingerprint,
      mismatch_reason: cleanText(row.mismatch_reason),
      website_projection: cleanText(row.website_projection),
      square_expected_count: String(row.square_expected_count ?? ""),
      square_count: String(row.square_count ?? ""),
      last_verified_sync_at_utc: cleanTimestamp(row.last_verified_sync_at_utc),
    })
    const operationId = `reconcile-projection-${operationFingerprint.slice(0, 32)}`
    const itemSnapshot = projectionItemSnapshot(item)
    repairs.push({
      operation_id: operationId,
      idempotency_key: operationId,
      internal_item_id: itemId,
      local_projection_fingerprint: localFingerprint,
      repair_reasons: repairableReasons,
      destinations: ["wordpress", "square", "kiosk"],
      payload: {
        item: itemSnapshot,
        inventory_public_id: cleanId(item.wordpress_public_id) || itemId,
        local_inventory_public_id: itemId,
        barcode: cleanText(item.barcode),
        status: cleanStatus(item.status),
        location: cleanText(item.location),
        price_minor_units: nonNegativeInteger(item.price_minor_units),
        sale_price_minor_units: nonNegativeInteger(item.price_minor_units),
        minimum_sale_price_minor_units: nonNegativeInteger(item.minimum_sale_price_minor_units),
        pricing_source: cleanText(item.pricing_source),
        previous_quantity_on_hand: quantity(item.quantity_on_hand, item.status),
        quantity_on_hand: quantity(item.quantity_on_hand, item.status),
        quantity_delta: 0,
        quantity_update_mode: "absolute",
        online_visibility: cleanVisibility(item.online_visibility),
        kiosk_visibility: cleanVisibility(item.kiosk_visibility),
        pos_visibility: cleanVisibility(item.pos_visibility),
        actor_id: "system-reconciliation",
        actor_name: "Pug reconciliation tool",
        reason: cleanText(input.reason) || "Authoritative local projection repair",
        sync_intent: "authoritative_local_projection_repair",
        wordpress_acceptance_required: true,
        reconciliation: {
          report_generated_at_utc: cleanTimestamp(input.generatedAtUtc),
          local_projection_fingerprint: localFingerprint,
          mismatch_reasons: repairableReasons,
        },
      },
    })
  }

  return {
    authoritative_source: "local_sqlite",
    repairs,
    skipped,
    planned_count: repairs.length,
    skipped_count: skipped.length,
    remote_inventory_overwrite_planned: false,
    local_inventory_overwrite_planned: false,
  }
}

export async function reconcileAuthoritativeProjections(input = {}, dependencies = {}) {
  const auditOutputPath = resolve(String(input.options?.auditOutputPath || DEFAULT_AUDIT_OUTPUT_PATH))
  const plan = buildProjectionRepairPlan({
    reportRows: input.reportRows,
    inventoryRows: input.inventoryRows,
    operationRows: input.operationRows,
    generatedAtUtc: input.generatedAtUtc,
    reason: input.options?.reason,
  })
  const applyRequested = input.options?.apply === true
  let result

  if (!applyRequested) {
    result = {
      status: "planned",
      code: "authoritative_projection_repair_dry_run",
      dry_run: true,
      queued_count: 0,
      already_queued_count: 0,
      stale_local_count: 0,
      actions: plan.repairs.map(publicPlannedRepair),
    }
  } else if (input.options?.confirmAuthoritativeLocal !== true) {
    result = {
      status: "blocked",
      code: "confirm_authoritative_local_required",
      dry_run: true,
      queued_count: 0,
      already_queued_count: 0,
      stale_local_count: 0,
      actions: plan.repairs.map(publicPlannedRepair),
    }
  } else if (!cleanText(input.options?.reason)) {
    result = {
      status: "blocked",
      code: "reconciliation_reason_required",
      dry_run: true,
      queued_count: 0,
      already_queued_count: 0,
      stale_local_count: 0,
      actions: plan.repairs.map(publicPlannedRepair),
    }
  } else {
    const applyRepairs = dependencies.applyProjectionRepairs ?? applyProjectionRepairs
    result = await applyRepairs(plan, {
      databasePath: input.options?.databasePath,
      now: dependencies.now,
      confirmAuthoritativeLocal: input.options?.confirmAuthoritativeLocal,
      reason: input.options?.reason,
    })
  }

  const audit = {
    audit_schema_version: REPAIR_AUDIT_SCHEMA_VERSION,
    tool: "sync_reconciliation_report",
    generated_at_utc: cleanTimestamp(input.generatedAtUtc) || new Date().toISOString(),
    report_path: resolve(String(input.reportPath ?? DEFAULT_OUTPUT_PATH)),
    authoritative_source: "local_sqlite",
    requested_mode: applyRequested ? "apply" : "dry_run",
    reason: cleanText(input.options?.reason),
    plan: {
      planned_count: plan.planned_count,
      skipped_count: plan.skipped_count,
      skipped: plan.skipped,
    },
    result,
    safety: {
      local_inventory_overwritten: false,
      wordpress_treated_as_authoritative: false,
      square_treated_as_authoritative: false,
      direct_remote_write_performed: false,
      credentials_recorded: false,
    },
  }
  await writeAuditFile(auditOutputPath, audit)

  return {
    ...result,
    audit_output_path: auditOutputPath,
    planned_count: plan.planned_count,
    skipped_count: plan.skipped_count,
    credentials_printed: false,
    raw_credentials_returned: false,
  }
}

export function applyProjectionRepairs(plan, options = {}) {
  const databasePath = resolve(String(options.databasePath || localSyncDatabasePath()))
  if (options.confirmAuthoritativeLocal !== true) {
    return repairBlocked("confirm_authoritative_local_required", databasePath, true)
  }
  if (!cleanText(options.reason)) {
    return repairBlocked("reconciliation_reason_required", databasePath, true)
  }
  if (plan?.authoritative_source !== "local_sqlite") {
    return repairBlocked("local_authoritative_plan_required", databasePath, true)
  }
  if (!existsSync(databasePath)) {
    return repairBlocked("local_inventory_database_missing", databasePath)
  }

  const database = new DatabaseSync(databasePath)
  const now = typeof options.now === "function" ? options.now : () => new Date()
  const actions = []

  try {
    for (const tableName of ["inventory_items", "operation_queue", "sync_outbox_events", "sync_outbox_deliveries"]) {
      if (!sqliteTableExists(database, tableName)) {
        return repairBlocked(`required_table_missing:${tableName}`, databasePath)
      }
    }

    withImmediateTransaction(database, () => {
      for (const repair of validRows(plan?.repairs)) {
        const current = database.prepare("SELECT * FROM inventory_items WHERE public_id = ?").get(repair.internal_item_id)
        if (!current || localProjectionFingerprint(current) !== repair.local_projection_fingerprint) {
          actions.push({
            operation_id: repair.operation_id,
            internal_item_id: repair.internal_item_id,
            outcome: "skipped_stale_local_state",
          })
          continue
        }

        const queuedAtUtc = now().toISOString()
        const insert = database.prepare(`
          INSERT INTO operation_queue (
            operation_id, operation_type, entity_id, payload_json, queued_at_utc, sync_status
          ) VALUES (?, 'inventory_update', ?, ?, ?, 'pending')
          ON CONFLICT(operation_id) DO NOTHING
        `).run(
          repair.operation_id,
          repair.internal_item_id,
          JSON.stringify(repair.payload),
          queuedAtUtc,
        )
        const outbox = appendProjectionEvent(database, {
          idempotency_key: repair.idempotency_key,
          aggregate_type: "inventory",
          aggregate_id: repair.internal_item_id,
          event_type: "inventory_update",
          destinations: repair.destinations,
          payload: repair.payload,
          created_at_utc: queuedAtUtc,
        }, now)
        const kioskDelivery = outbox.deliveries.find((delivery) => delivery.destination === "kiosk")
        if (kioskDelivery && kioskDelivery.status !== "verified") {
          markOutboxDelivery(database, {
            event_id: outbox.event.event_id,
            destination: "kiosk",
            status: "verified",
            increment_attempt: false,
            readback: {
              aggregate_id: repair.internal_item_id,
              source: "authoritative_local_database",
              reconciliation_operation_id: repair.operation_id,
            },
          }, now)
        }
        actions.push({
          operation_id: repair.operation_id,
          internal_item_id: repair.internal_item_id,
          outbox_event_id: outbox.event.event_id,
          outcome: Number(insert.changes) > 0 ? "queued" : "already_queued",
          destinations: repair.destinations,
        })
      }
    })
  } catch (error) {
    return {
      ...repairBlocked("authoritative_projection_repair_failed", databasePath),
      error_code: cleanCode(error?.code) || "sqlite_transaction_failed",
    }
  } finally {
    database.close()
  }

  return {
    status: "ok",
    code: "authoritative_projection_repairs_queued",
    dry_run: false,
    database_path: databasePath,
    queued_count: actions.filter((action) => action.outcome === "queued").length,
    already_queued_count: actions.filter((action) => action.outcome === "already_queued").length,
    stale_local_count: actions.filter((action) => action.outcome === "skipped_stale_local_state").length,
    actions,
    local_inventory_rows_modified: 0,
    direct_remote_writes_performed: 0,
    credentials_printed: false,
    raw_credentials_returned: false,
  }
}

export function sanitizeCsvFormula(value) {
  const text = String(value ?? "")
  return /^[\t\r ]*[=+\-@]/.test(text) || /^[\t\r]/.test(text) ? `'${text}` : text
}

export function csvCell(value) {
  const text = sanitizeCsvFormula(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

async function writeCsvReport(outputPath, rows, options = {}) {
  await mkdir(dirname(outputPath), { recursive: true })
  const stream = createWriteStream(outputPath, { encoding: "utf8" })
  let rowsWritten = 0
  let mismatchRows = 0

  try {
    await writeChunk(stream, `${REPORT_COLUMNS.map(csvCell).join(",")}\n`)
    for (const row of rows) {
      if (typeof options.onRow === "function") options.onRow(row)
      const line = REPORT_COLUMNS.map((column) => csvCell(row?.[column])).join(",")
      await writeChunk(stream, `${line}\n`)
      rowsWritten += 1
      if (String(row?.mismatch_reason ?? "").trim()) mismatchRows += 1
    }
    stream.end()
    await once(stream, "finish")
  } catch (error) {
    stream.destroy()
    throw error
  }

  return { rows_written: rowsWritten, mismatch_rows: mismatchRows }
}

async function writeChunk(stream, value) {
  if (!stream.write(value)) {
    await once(stream, "drain")
  }
}

function safeReadLocalTable(reader, tableName) {
  try {
    const result = reader(tableName)
    return {
      status: cleanCode(result?.status) || "blocked",
      code: cleanCode(result?.code),
      rows: validRows(result?.rows),
    }
  } catch {
    return { status: "blocked", code: "local_table_read_failed", rows: [] }
  }
}

function projectionRepairReasons(row) {
  const reasons = String(row?.mismatch_reason ?? "")
    .split(";")
    .map(cleanCode)
    .filter(Boolean)

  return uniqueValues(reasons.filter((reason) =>
    reason === "website_projection_missing" ||
    reason === "website_identity_duplicate" ||
    reason.startsWith("website_quantity_mismatch") ||
    reason.startsWith("website_status_mismatch") ||
    reason.startsWith("website_kiosk_visibility_mismatch") ||
    reason === "wordpress_projection_failed" ||
    reason === "wordpress_projection_pending" ||
    reason === "square_variation_missing" ||
    reason === "square_count_missing" ||
    reason === "square_count_mismatch" ||
    reason === "square_projection_failed" ||
    reason === "square_projection_pending"
  ))
}

function pendingInventoryOperationItemIds(rows) {
  const itemIds = new Set()
  for (const row of rows) {
    if (cleanStatus(row.operation_type) !== "inventory_update" || cleanStatus(row.sync_status) !== "pending") continue
    const payload = parseJsonObject(row.payload_json)
    const itemId = cleanId(payload.local_inventory_public_id ?? payload.inventory_public_id ?? row.entity_id)
    if (itemId) itemIds.add(itemId)
  }
  return itemIds
}

function projectionItemSnapshot(item) {
  return {
    public_id: cleanId(item.public_id),
    wordpress_public_id: cleanId(item.wordpress_public_id),
    row_version: nonNegativeInteger(item.row_version),
    provider_card_id: cleanId(item.provider_card_id),
    reference_variant_id: nonNegativeInteger(item.reference_variant_id),
    provider_variant_id: cleanId(item.provider_variant_id),
    game: cleanText(item.game),
    card_name: cleanText(item.card_name),
    set_name: cleanText(item.set_name),
    set_code: cleanText(item.set_code),
    card_number: cleanText(item.card_number),
    printed_number: cleanText(item.printed_number),
    variant: cleanText(item.variant),
    finish: cleanText(item.finish),
    language: cleanText(item.language) || "EN",
    raw_or_graded: cleanStatus(item.raw_or_graded),
    grading_company: cleanText(item.grading_company),
    grade: cleanText(item.grade),
    cert_number: cleanText(item.cert_number),
    condition: cleanText(item.condition),
    barcode: cleanText(item.barcode),
    price_minor_units: nonNegativeInteger(item.price_minor_units),
    sale_price_minor_units: nonNegativeInteger(item.price_minor_units),
    market_price_minor_units: nonNegativeInteger(item.market_price_minor_units),
    auto_price_minor_units: nonNegativeInteger(item.auto_price_minor_units),
    minimum_sale_price_minor_units: nonNegativeInteger(item.minimum_sale_price_minor_units),
    pricing_source: cleanText(item.pricing_source),
    price_observed_at_utc: cleanTimestamp(item.price_observed_at_utc),
    quantity_on_hand: quantity(item.quantity_on_hand, item.status),
    currency: cleanText(item.currency) || "USD",
    location: cleanText(item.location),
    status: cleanStatus(item.status),
    image_url: cleanText(item.image_url),
    back_image_url: cleanText(item.back_image_url),
    online_visibility: cleanVisibility(item.online_visibility),
    kiosk_visibility: cleanVisibility(item.kiosk_visibility),
    pos_visibility: cleanVisibility(item.pos_visibility),
    square_catalog_item_id: cleanId(item.square_catalog_item_id),
    square_catalog_variation_id: cleanId(item.square_catalog_variation_id),
    square_location_id: cleanId(item.square_location_id),
    external_sync_state: cleanStatus(item.external_sync_state),
    source: cleanText(item.source),
  }
}

function localProjectionFingerprint(item) {
  const snapshot = projectionItemSnapshot(item)
  return sha256({
    public_id: snapshot.public_id,
    wordpress_public_id: snapshot.wordpress_public_id,
    row_version: snapshot.row_version,
    barcode: snapshot.barcode,
    status: snapshot.status,
    quantity_on_hand: snapshot.quantity_on_hand,
    price_minor_units: snapshot.price_minor_units,
    minimum_sale_price_minor_units: snapshot.minimum_sale_price_minor_units,
    online_visibility: snapshot.online_visibility,
    kiosk_visibility: snapshot.kiosk_visibility,
    pos_visibility: snapshot.pos_visibility,
    square_catalog_variation_id: snapshot.square_catalog_variation_id,
    square_location_id: snapshot.square_location_id,
  })
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function publicPlannedRepair(repair) {
  return {
    operation_id: repair.operation_id,
    internal_item_id: repair.internal_item_id,
    outcome: "planned",
    destinations: repair.destinations,
    repair_reasons: repair.repair_reasons,
  }
}

function sqliteTableExists(database, tableName) {
  return Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName))
}

function repairBlocked(code, databasePath, dryRun = false) {
  return {
    status: "blocked",
    code,
    dry_run: dryRun,
    database_path: databasePath,
    queued_count: 0,
    already_queued_count: 0,
    stale_local_count: 0,
    actions: [],
    local_inventory_rows_modified: 0,
    direct_remote_writes_performed: 0,
    credentials_printed: false,
    raw_credentials_returned: false,
  }
}

async function writeAuditFile(outputPath, audit) {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, { encoding: "utf8" })
}

async function safeConnectorRead(read, fallbackCode, collectionName) {
  try {
    const result = await read()
    return {
      ...result,
      status: cleanCode(result?.status) || "blocked",
      code: cleanCode(result?.code) || (result?.status === "ok" ? "ok" : fallbackCode),
      [collectionName]: validRows(result?.[collectionName]),
      credentials_printed: false,
      raw_credentials_returned: false,
    }
  } catch {
    return {
      status: "blocked",
      code: fallbackCode,
      [collectionName]: [],
      credentials_printed: false,
      raw_credentials_returned: false,
    }
  }
}

function connectorSkipped(code, collectionName) {
  return {
    status: "skipped",
    code,
    [collectionName]: [],
    credentials_printed: false,
    raw_credentials_returned: false,
  }
}

function resolveReportMode(localOnly, websiteResult, squareResult) {
  if (localOnly) return "local_only"
  if (websiteResult.status === "ok" && squareResult.status === "ok") return "connected"
  if (websiteResult.status === "ok" || squareResult.status === "ok") return "partial"
  return "local_only_fallback"
}

function publicTableStatuses(tables) {
  return Object.fromEntries(
    Object.entries(tables).map(([tableName, result]) => [tableName, { status: result.status, row_count: result.rows.length }]),
  )
}

function publicConnectorStatus(result) {
  return { status: cleanCode(result?.status), code: cleanCode(result?.code) }
}

function indexWebsiteRows(rows) {
  const index = new Map()
  for (const row of rows) {
    for (const identity of websiteIdentities(row)) {
      const matches = index.get(identity) ?? []
      matches.push(row)
      index.set(identity, matches)
    }
  }
  return index
}

function findWebsiteMatch(item, websiteIndex) {
  for (const identity of uniqueValues([item.wordpress_public_id, item.public_id].map(cleanId))) {
    const matches = websiteIndex.get(identity) ?? []
    if (matches.length > 0) return { row: matches[0], duplicate: matches.length > 1 }
  }
  return { row: null, duplicate: false }
}

function websiteIdentities(row) {
  return uniqueValues([row.public_id, row.wordpress_public_id, row.inventory_public_id].map(cleanId))
}

function indexReservations(rows, generatedAtUtc) {
  const byItem = new Map()
  const itemByReservation = new Map()
  const generatedAt = Date.parse(generatedAtUtc)

  for (const row of rows) {
    const itemId = cleanId(row.inventory_public_id)
    const reservationId = cleanId(row.reservation_id)
    if (reservationId && itemId) itemByReservation.set(reservationId, itemId)
    if (!itemId || cleanStatus(row.status) !== "active") continue

    const current = byItem.get(itemId) ?? { quantity: 0, expiredActive: false }
    current.quantity += nonNegativeNumber(row.quantity)
    const expiry = Date.parse(String(row.expires_at_utc ?? ""))
    current.expiredActive ||= Number.isFinite(generatedAt) && Number.isFinite(expiry) && expiry <= generatedAt
    byItem.set(itemId, current)
  }

  return { byItem, itemByReservation }
}

function indexSyncState({ inventoryRows, reservationRows, queueRows, outboxEventRows, deliveryRows }) {
  const itemIds = new Set(inventoryRows.map((row) => cleanId(row.public_id)).filter(Boolean))
  const reservationItemIds = new Map(
    reservationRows
      .map((row) => [cleanId(row.reservation_id), cleanId(row.inventory_public_id)])
      .filter(([reservationId, itemId]) => reservationId && itemId),
  )
  const queueByOperation = new Map()
  const byItem = new Map()

  for (const queueRow of queueRows) {
    const payload = parseJsonObject(queueRow.payload_json)
    const itemId = queueItemId(queueRow, payload, itemIds, reservationItemIds)
    queueByOperation.set(cleanId(queueRow.operation_id), itemId)
    if (!itemId) continue
    const state = byItem.get(itemId) ?? emptySyncState()
    state.queue.push({ ...queueRow, payload })
    byItem.set(itemId, state)
  }

  const itemByEvent = new Map()
  for (const event of outboxEventRows) {
    const aggregateId = cleanId(event.aggregate_id)
    const itemId = itemIds.has(aggregateId)
      ? aggregateId
      : reservationItemIds.get(aggregateId) || queueByOperation.get(cleanId(event.idempotency_key)) || ""
    if (itemId) itemByEvent.set(cleanId(event.event_id), itemId)
  }

  for (const delivery of deliveryRows) {
    const itemId = itemByEvent.get(cleanId(delivery.event_id))
    if (!itemId) continue
    const state = byItem.get(itemId) ?? emptySyncState()
    const destination = cleanStatus(delivery.destination)
    const current = state.deliveries.get(destination)
    if (!current || deliverySortTimestamp(delivery) >= deliverySortTimestamp(current)) {
      state.deliveries.set(destination, delivery)
    }
    byItem.set(itemId, state)
  }

  return { byItem }
}

function queueItemId(row, payload, itemIds, reservationItemIds) {
  for (const candidate of [
    payload.inventory_public_id,
    payload.public_id,
    row.entity_id,
    reservationItemIds.get(cleanId(row.entity_id)),
  ]) {
    const itemId = cleanId(candidate)
    if (itemIds.has(itemId)) return itemId
  }
  return ""
}

function emptySyncState() {
  return { queue: [], deliveries: new Map() }
}

function deliverySortTimestamp(delivery) {
  return Math.max(
    0,
    Date.parse(String(delivery?.verified_at_utc ?? "")) || 0,
    Date.parse(String(delivery?.updated_at_utc ?? "")) || 0,
    Date.parse(String(delivery?.last_attempt_at_utc ?? "")) || 0,
    Date.parse(String(delivery?.created_at_utc ?? "")) || 0,
  )
}

function indexSquareCounts(rows) {
  const counts = new Map()
  for (const row of rows) {
    const variationId = cleanId(row.catalog_object_id ?? row.square_catalog_variation_id ?? row.variation_id)
    const state = cleanStatus(row.state)
    if (!variationId || (state && state !== "in_stock")) continue
    const current = counts.get(variationId) ?? { quantity: 0, calculatedAt: "" }
    current.quantity += nonNegativeNumber(row.quantity ?? row.quantity_on_hand)
    current.calculatedAt = latestTimestamp(current.calculatedAt, row.calculated_at ?? row.calculated_at_utc)
    counts.set(variationId, current)
  }
  return counts
}

function expectedSquareCounts(inventoryRows) {
  const counts = new Map()
  for (const item of inventoryRows) {
    const variationId = cleanId(item.square_catalog_variation_id)
    if (!variationId) continue
    counts.set(variationId, (counts.get(variationId) ?? 0) + kioskSellableQuantity(item))
  }
  return counts
}

function internalMismatchReasons(input) {
  const reasons = []
  const internalStatus = cleanStatus(input.item.status)
  const internalQuantity = quantity(input.item.quantity_on_hand, internalStatus)

  if (!input.websiteChecked) {
    reasons.push(connectorMismatchCode("website", input.websiteConnectorCode))
  } else if (!input.websiteMatch.row) {
    reasons.push("website_projection_missing")
  } else {
    if (input.websiteMatch.duplicate) reasons.push("website_identity_duplicate")
    if (quantity(input.websiteMatch.row.quantity_on_hand ?? input.websiteMatch.row.stock_quantity, input.websiteMatch.row.status) !== internalQuantity) {
      reasons.push("website_quantity_mismatch")
    }
    if (cleanStatus(input.websiteMatch.row.status) !== internalStatus) reasons.push("website_status_mismatch")
    if (cleanVisibility(input.websiteMatch.row.kiosk_visibility) !== cleanVisibility(input.item.kiosk_visibility)) {
      reasons.push("website_kiosk_visibility_mismatch")
    }
  }

  if (!input.squareVariationId) {
    if (kioskSellableQuantity(input.item) > 0) reasons.push("square_variation_missing")
  } else if (!input.squareChecked) {
    reasons.push(connectorMismatchCode("square", input.squareConnectorCode))
  } else if (!input.squareCount) {
    reasons.push("square_count_missing")
  } else if (input.squareCount.quantity !== input.squareExpectedCount) {
    reasons.push("square_count_mismatch")
  }

  if (internalStatus === "reserved" && input.reserved.quantity === 0) reasons.push("reserved_quantity_missing")
  if (internalStatus !== "reserved" && input.reserved.quantity > 0) reasons.push("active_reservation_status_mismatch")
  if (input.reserved.quantity > internalQuantity) reasons.push("reserved_quantity_exceeds_internal")
  if (input.reserved.expiredActive) reasons.push("expired_active_reservation")
  if (["failed", "conflict"].includes(cleanStatus(input.item.external_sync_state))) reasons.push("internal_sync_state_failed")

  for (const destination of ["wordpress", "square", "kiosk"]) {
    const delivery = input.itemSync.deliveries.get(destination)
    const status = cleanStatus(delivery?.status)
    if (status === "dead_letter") reasons.push(`${destination}_projection_failed`)
    else if (PENDING_DELIVERY_STATUSES.has(status)) reasons.push(`${destination}_projection_pending`)
    else if (!delivery && destination === "kiosk") reasons.push("kiosk_projection_not_recorded")
  }

  return uniqueValues(reasons)
}

function connectorMismatchCode(destination, code) {
  const cleaned = cleanCode(code)
  if (cleaned === `${destination}_not_checked_local_only`) return cleaned
  return `${destination}_connector_unavailable${cleaned ? `:${cleaned}` : ""}`
}

function websiteProjection(row) {
  if (!row) return ""
  return [
    `status=${cleanStatus(row.status) || "unknown"}`,
    `quantity=${quantity(row.quantity_on_hand ?? row.stock_quantity, row.status)}`,
    `online=${cleanVisibility(row.online_visibility)}`,
    `kiosk=${cleanVisibility(row.kiosk_visibility)}`,
  ].join(";")
}

function kioskProjection(item) {
  return [
    `visibility=${cleanVisibility(item.kiosk_visibility)}`,
    `status=${cleanStatus(item.status) || "unknown"}`,
    `sellable_quantity=${kioskSellableQuantity(item)}`,
  ].join(";")
}

function kioskSellableQuantity(item) {
  return cleanStatus(item.status) === "available" && cleanVisibility(item.kiosk_visibility) === "visible"
    ? quantity(item.quantity_on_hand, item.status)
    : 0
}

function projectionStatus(sync, destination) {
  const delivery = sync.deliveries.get(destination)
  if (!delivery) return "not_recorded"
  const status = cleanStatus(delivery.status) || "unknown"
  const errorCode = cleanCode(delivery.last_error_code)
  return errorCode ? `${status}:${errorCode}` : status
}

function pendingFailedStatus(item, sync) {
  const failures = []
  const pending = []
  const externalState = cleanStatus(item.external_sync_state)
  if (["failed", "conflict"].includes(externalState)) failures.push(`failed:external_sync_state:${externalState}`)

  for (const [destination, delivery] of sync.deliveries) {
    const status = cleanStatus(delivery.status)
    const errorCode = cleanCode(delivery.last_error_code)
    const suffix = errorCode ? `:${errorCode}` : ""
    if (status === "dead_letter") failures.push(`failed:${destination}:dead_letter${suffix}`)
    else if (PENDING_DELIVERY_STATUSES.has(status)) pending.push(`pending:${destination}:${status}${suffix}`)
  }

  for (const operation of sync.queue) {
    const status = cleanStatus(operation.sync_status)
    if (status === "failed") failures.push("failed:operation_queue")
    else if (status === "pending") pending.push("pending:operation_queue")
    else if (status === "local_only") pending.push("local_only:operation_queue")
  }

  if (failures.length > 0) return uniqueValues(failures).join("|")
  if (pending.length > 0) return uniqueValues(pending).join("|")
  if (externalState === "pending") return "pending:external_sync_state"
  if ([...sync.deliveries.values()].some((delivery) => TERMINAL_DELIVERY_STATUSES.has(cleanStatus(delivery.status)))) return "synced"
  return externalState === "synced" ? "synced" : "no_sync_record"
}

function lastVerifiedAt(sync) {
  let latest = ""
  for (const delivery of sync.deliveries.values()) {
    if (cleanStatus(delivery.status) !== "verified") continue
    latest = latestTimestamp(latest, delivery.verified_at_utc)
  }
  return latest
}

function latestTimestamp(left, right) {
  const leftTime = Date.parse(String(left ?? ""))
  const rightTime = Date.parse(String(right ?? ""))
  if (!Number.isFinite(rightTime)) return Number.isFinite(leftTime) ? new Date(leftTime).toISOString() : ""
  return !Number.isFinite(leftTime) || rightTime > leftTime ? new Date(rightTime).toISOString() : new Date(leftTime).toISOString()
}

function quantity(value, status = "") {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return Math.max(0, Math.min(999999, parsed))
  return ["sold", "removed"].includes(cleanStatus(status)) ? 0 : 1
}

function nonNegativeInteger(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0
}

function nonNegativeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function cleanId(value) {
  return String(value ?? "").trim().replace(/[^A-Za-z0-9_.:/#-]/g, "").slice(0, 220)
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 500)
}

function cleanStatus(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 80)
}

function cleanVisibility(value) {
  const visibility = cleanStatus(value)
  return ["visible", "hidden", "staff_only"].includes(visibility) ? visibility : "visible"
}

function cleanCode(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_.:-]/g, "_").slice(0, 160)
}

function cleanTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ""))
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : ""
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(String(value ?? "{}"))
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function validRows(value) {
  return Array.isArray(value) ? value.filter((row) => row && typeof row === "object" && !Array.isArray(row)) : []
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

function boundedInt(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}

function requiredArgument(value, name) {
  if (String(value ?? "").trim()) return String(value).trim()
  throw toolError(`${name}_required`)
}

function toolError(code) {
  const error = new Error(code)
  error.code = code
  return error
}

function usage() {
  return [
    "Usage: node tools/sync-reconciliation-report.mjs [options]",
    "  --local-only                 Skip WordPress and Square reads.",
    "  --schema-only                Write only the stable CSV header.",
    "  --output <path>              Set the CSV output path.",
    "  --website-page-size <1-100>  Bound each website page.",
    "  --website-max-pages <n>      Bound website pagination.",
    "  --reconcile-now              Plan projection repairs from local authoritative rows.",
    "  --apply                      Queue repairs; dry-run remains the default.",
    "  --confirm-authoritative-local  Confirm local SQLite is authoritative for apply.",
    "  --reason <text>              Required operator reason for apply.",
    "  --audit-output <path>        Set the JSON audit result path.",
    "  --database <path>            Override the local SQLite path for apply.",
  ].join("\n")
}

async function runCli() {
  try {
    const args = parseSyncReconciliationArgs(process.argv.slice(2))
    if (args.help) {
      console.log(usage())
      return
    }
    if (!args.schemaOnly) loadOpsEnv()
    const result = await generateSyncReconciliationReport(args)
    console.log(JSON.stringify(result, null, 2))
    if (result.status !== "ok") process.exitCode = 1
  } catch (error) {
    console.error(JSON.stringify({
      status: "blocked",
      code: cleanCode(error?.code) || "sync_reconciliation_report_failed",
      credentials_printed: false,
      raw_credentials_returned: false,
    }, null, 2))
    process.exitCode = 1
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ""
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  await runCli()
}
