import { once } from "node:events"
import { createWriteStream } from "node:fs"
import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
  extractSquareVariationIds,
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
  const writeResult = await writeCsvReport(outputPath, rows)

  return {
    status: "ok",
    code: "sync_reconciliation_report_written",
    report_schema_version: REPORT_SCHEMA_VERSION,
    report_mode: reportMode,
    output_path: outputPath,
    generated_at_utc: now().toISOString(),
    local_table_statuses: publicTableStatuses(tables),
    connectors: {
      website: publicConnectorStatus(websiteResult),
      square: publicConnectorStatus(squareResult),
    },
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
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = String(argv[index] ?? "")
    if (argument === "--local-only") parsed.localOnly = true
    else if (argument === "--schema-only") parsed.schemaOnly = true
    else if (argument === "--help" || argument === "-h") parsed.help = true
    else if (argument === "--output") parsed.outputPath = requiredArgument(argv[++index], "output")
    else if (argument.startsWith("--output=")) parsed.outputPath = requiredArgument(argument.slice(9), "output")
    else if (argument === "--website-page-size") parsed.websitePageSize = requiredArgument(argv[++index], "website_page_size")
    else if (argument.startsWith("--website-page-size=")) parsed.websitePageSize = requiredArgument(argument.slice(20), "website_page_size")
    else if (argument === "--website-max-pages") parsed.websiteMaxPages = requiredArgument(argv[++index], "website_max_pages")
    else if (argument.startsWith("--website-max-pages=")) parsed.websiteMaxPages = requiredArgument(argument.slice(20), "website_max_pages")
    else throw toolError("unknown_argument")
  }

  return parsed
}

export function sanitizeCsvFormula(value) {
  const text = String(value ?? "")
  return /^[\t\r ]*[=+\-@]/.test(text) || /^[\t\r]/.test(text) ? `'${text}` : text
}

export function csvCell(value) {
  const text = sanitizeCsvFormula(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

async function writeCsvReport(outputPath, rows) {
  await mkdir(dirname(outputPath), { recursive: true })
  const stream = createWriteStream(outputPath, { encoding: "utf8" })
  let rowsWritten = 0
  let mismatchRows = 0

  try {
    await writeChunk(stream, `${REPORT_COLUMNS.map(csvCell).join(",")}\n`)
    for (const row of rows) {
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
