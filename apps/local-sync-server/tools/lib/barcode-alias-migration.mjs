import { createHash, randomUUID } from "node:crypto"

import {
  appendInventoryLedgerEntry,
  appendProjectionEvent,
  markOutboxDelivery,
  withImmediateTransaction,
} from "../../src/authoritativeLedger.mjs"
import { assertRecoveryTables, recoveryError } from "./recovery-common.mjs"

export const PRINTABLE_BARCODE_MAX_LENGTH = 13
const PRINTABLE_BARCODE_PATTERN = /^[A-Z0-9-]+$/
const REQUIRED_TABLES = [
  "users",
  "inventory_items",
  "operation_queue",
  "inventory_ledger_entries",
  "sync_outbox_events",
  "sync_outbox_deliveries",
]

export function scannerSafeBarcodeAlias(row) {
  const digest = createHash("sha256")
    .update(`${String(row?.public_id ?? "").trim()}:${String(row?.barcode ?? "").trim()}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase()
  return `PUG${digest}`
}

export function isPrintableScannerBarcode(value) {
  const rawBarcode = String(value ?? "")
  const barcode = rawBarcode.trim()
  return (
    rawBarcode === barcode &&
    barcode.length > 0 &&
    barcode.length <= PRINTABLE_BARCODE_MAX_LENGTH &&
    PRINTABLE_BARCODE_PATTERN.test(barcode)
  )
}

export function planBarcodeAliasMigration(database, options = {}) {
  assertRecoveryTables(database, REQUIRED_TABLES)
  const generatedAtUtc = (options.now ?? (() => new Date()))().toISOString()
  const aliasFactory = options.aliasFactory ?? scannerSafeBarcodeAlias
  const rows = database.prepare("SELECT * FROM inventory_items ORDER BY public_id").all()
  const candidates = rows.filter((row) => !isPrintableScannerBarcode(row.barcode))
  const untouched = rows.filter((row) => isPrintableScannerBarcode(row.barcode))
  const blockers = []
  const warnings = []
  const mappings = candidates.map((row) => ({
    inventory_public_id: String(row.public_id),
    original_barcode: String(row.barcode ?? ""),
    barcode_alias: String(aliasFactory(row) ?? "").trim(),
    quantity_on_hand: nonNegativeInt(row.quantity_on_hand),
    row_version_before: positiveInt(row.row_version, 1),
    status: String(row.status ?? ""),
  }))
  const untouchedByBarcode = groupBy(untouched, (row) => normalizedBarcode(row.barcode))
  const mappingsByAlias = groupBy(mappings, (mapping) => normalizedBarcode(mapping.barcode_alias))
  const candidateSources = groupBy(mappings, (mapping) => normalizedBarcode(mapping.original_barcode))

  for (const [barcode, owners] of untouchedByBarcode) {
    if (barcode && owners.length > 1) {
      blockers.push({
        code: "existing_printable_barcode_collision",
        barcode,
        inventory_public_ids: owners.map((row) => row.public_id),
        message: "Two unchanged inventory rows already share a printable barcode.",
      })
    }
  }

  for (const mapping of mappings) {
    if (!isPrintableScannerBarcode(mapping.barcode_alias)) {
      blockers.push({
        code: "generated_barcode_alias_invalid",
        inventory_public_id: mapping.inventory_public_id,
        barcode_alias: mapping.barcode_alias,
        message: `Generated aliases must use A-Z, 0-9, or hyphen and be ${PRINTABLE_BARCODE_MAX_LENGTH} characters or fewer.`,
      })
      continue
    }

    const occupied = untouchedByBarcode.get(normalizedBarcode(mapping.barcode_alias)) ?? []
    if (occupied.length > 0) {
      blockers.push({
        code: "barcode_alias_collides_with_existing_barcode",
        inventory_public_id: mapping.inventory_public_id,
        barcode_alias: mapping.barcode_alias,
        conflicting_inventory_public_ids: occupied.map((row) => row.public_id),
      })
    }
  }

  for (const [barcodeAlias, owners] of mappingsByAlias) {
    if (barcodeAlias && owners.length > 1) {
      blockers.push({
        code: "generated_barcode_alias_collision",
        barcode_alias: barcodeAlias,
        inventory_public_ids: owners.map((mapping) => mapping.inventory_public_id),
      })
    }
  }

  for (const [sourceBarcode, owners] of candidateSources) {
    if (sourceBarcode && owners.length > 1) {
      warnings.push({
        code: "duplicate_source_barcodes_receive_distinct_aliases",
        original_barcode: sourceBarcode,
        inventory_public_ids: owners.map((mapping) => mapping.inventory_public_id),
        barcode_aliases: owners.map((mapping) => mapping.barcode_alias),
      })
    }
  }

  const quantityBefore = rows.reduce((total, row) => total + nonNegativeInt(row.quantity_on_hand), 0)

  return {
    status: blockers.length > 0 ? "blocked" : "ok",
    action: "printable_barcode_alias_migration",
    generated_at_utc: generatedAtUtc,
    scanner_constraints: {
      maximum_characters: PRINTABLE_BARCODE_MAX_LENGTH,
      allowed_characters: "A-Z, 0-9, hyphen",
      case_sensitive_source_values: true,
    },
    summary: {
      inventory_rows_scanned: rows.length,
      printable_barcodes_unchanged: untouched.length,
      barcode_aliases_to_apply: mappings.length,
      quantity_before: quantityBefore,
      planned_quantity_change: 0,
      inventory_rows_to_delete: 0,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    invariants: {
      inventory_quantities_unchanged: true,
      inventory_rows_deleted: 0,
      original_barcode_recorded_in_report: true,
      collision_free_apply_required: true,
    },
    mappings,
    blockers,
    warnings,
  }
}

export function applyBarcodeAliasMigration(database, options = {}) {
  const now = options.now ?? (() => new Date())
  let appliedPlan
  let quantityBefore
  let quantityAfter
  let operationsCreated = 0

  withImmediateTransaction(database, () => {
    appliedPlan = planBarcodeAliasMigration(database, { ...options, now })

    if (appliedPlan.status !== "ok") {
      throw recoveryError(
        "barcode_alias_migration_blocked",
        "Barcode alias migration found collisions or invalid aliases. No database changes were applied.",
        { blockers: appliedPlan.blockers },
      )
    }

    const beforeRows = database.prepare("SELECT public_id, quantity_on_hand FROM inventory_items").all()
    const quantitySnapshot = new Map(beforeRows.map((row) => [row.public_id, nonNegativeInt(row.quantity_on_hand)]))
    quantityBefore = sum(quantitySnapshot.values())
    const actor = recoveryActor(database)

    for (const mapping of appliedPlan.mappings) {
      const current = database.prepare("SELECT * FROM inventory_items WHERE public_id = ?").get(mapping.inventory_public_id)

      if (!current || String(current.barcode ?? "") !== mapping.original_barcode) {
        throw recoveryError(
          "barcode_alias_source_changed",
          `Inventory barcode changed after planning for ${mapping.inventory_public_id}.`,
        )
      }

      const update = database.prepare(`
        UPDATE inventory_items
        SET barcode = ?, row_version = row_version + 1, external_sync_state = 'pending',
            source = 'queued', updated_by_user_id = ?, updated_by_user_name = ?, updated_at_utc = ?
        WHERE public_id = ? AND barcode = ?
      `).run(
        mapping.barcode_alias,
        actor.id,
        actor.name,
        now().toISOString(),
        mapping.inventory_public_id,
        mapping.original_barcode,
      )

      if (Number(update.changes) !== 1) {
        throw recoveryError(
          "barcode_alias_update_failed",
          `Barcode alias update did not affect exactly one row for ${mapping.inventory_public_id}.`,
        )
      }

      const updated = database.prepare("SELECT * FROM inventory_items WHERE public_id = ?").get(mapping.inventory_public_id)
      appendBarcodeUpdateOperation(database, current, updated, mapping, actor, now)
      operationsCreated += 1
    }

    const afterRows = database.prepare("SELECT public_id, quantity_on_hand FROM inventory_items").all()
    const afterMap = new Map(afterRows.map((row) => [row.public_id, nonNegativeInt(row.quantity_on_hand)]))
    quantityAfter = sum(afterMap.values())

    if (afterMap.size !== quantitySnapshot.size) {
      throw recoveryError("barcode_alias_row_count_changed", "Inventory row count changed during barcode migration.")
    }
    for (const [publicId, beforeQuantity] of quantitySnapshot) {
      if (afterMap.get(publicId) !== beforeQuantity) {
        throw recoveryError(
          "barcode_alias_quantity_invariant_failed",
          `Inventory quantity changed during barcode migration for ${publicId}.`,
        )
      }
    }
    if (quantityAfter !== quantityBefore) {
      throw recoveryError("barcode_alias_total_invariant_failed", "Inventory quantity total changed during barcode migration.")
    }
  })

  const verification = planBarcodeAliasMigration(database, { ...options, now })
  return {
    ...appliedPlan,
    status: "ok",
    mode: "apply",
    applied_at_utc: now().toISOString(),
    applied: {
      barcode_aliases_applied: appliedPlan.mappings.length,
      queue_operations_created: operationsCreated,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      quantity_changed: 0,
      inventory_rows_deleted: 0,
    },
    verification: {
      status: verification.status,
      unsafe_barcodes_remaining: verification.summary.barcode_aliases_to_apply,
      blockers_remaining: verification.summary.blockers,
      inventory_quantities_unchanged: true,
    },
  }
}

function appendBarcodeUpdateOperation(database, previous, updated, mapping, actor, now) {
  const operationId = `op-${randomUUID()}`
  const quantity = nonNegativeInt(previous.quantity_on_hand)
  const payload = {
    item: publicInventoryItem(updated),
    inventory_public_id: String(updated.wordpress_public_id || updated.public_id),
    local_inventory_public_id: updated.public_id,
    barcode: updated.barcode,
    previous_barcode: mapping.original_barcode,
    status: updated.status,
    location: updated.location,
    price_minor_units: nonNegativeInt(updated.price_minor_units),
    sale_price_minor_units: nonNegativeInt(updated.price_minor_units),
    minimum_sale_price_minor_units: nonNegativeInt(updated.minimum_sale_price_minor_units),
    pricing_source: String(updated.pricing_source ?? ""),
    previous_quantity_on_hand: quantity,
    quantity_on_hand: quantity,
    quantity_delta: 0,
    quantity_update_mode: "unchanged",
    online_visibility: updated.online_visibility,
    kiosk_visibility: updated.kiosk_visibility,
    pos_visibility: updated.pos_visibility,
    actor_id: actor.id,
    actor_name: actor.name,
    reason: "scanner-safe printable barcode alias migration",
    sync_intent: "scanner_safe_barcode_alias_migration",
    wordpress_acceptance_required: true,
    recovery_generated: true,
  }

  database.prepare(`
    INSERT INTO operation_queue (
      operation_id, operation_type, entity_id, payload_json, queued_at_utc, sync_status
    ) VALUES (?, 'inventory_update', ?, ?, ?, 'pending')
  `).run(operationId, updated.public_id, JSON.stringify(payload), now().toISOString())

  appendInventoryLedgerEntry(database, {
    idempotency_key: operationId,
    inventory_public_id: updated.public_id,
    mutation_type: "inventory_update",
    source_channel: "recovery_tool",
    reference_type: "operation_queue",
    reference_id: operationId,
    quantity_before: quantity,
    quantity_after: quantity,
    status_before: previous.status,
    status_after: updated.status,
    price_before_minor_units: nonNegativeInt(previous.price_minor_units),
    price_after_minor_units: nonNegativeInt(updated.price_minor_units),
    actor_user_id: actor.id,
    actor_user_name: actor.name,
    reason: "Scanner-safe printable barcode alias migration",
    payload: {
      original_barcode: mapping.original_barcode,
      barcode_alias: mapping.barcode_alias,
      quantity_update_mode: "unchanged",
      sync_intent: "scanner_safe_barcode_alias_migration",
    },
  }, now)

  const outbox = appendProjectionEvent(database, {
    idempotency_key: operationId,
    aggregate_type: "inventory",
    aggregate_id: updated.public_id,
    event_type: "inventory_update",
    destinations: ["wordpress", "square", "kiosk"],
    payload,
  }, now)
  markOutboxDelivery(database, {
    event_id: outbox.event.event_id,
    destination: "kiosk",
    status: "verified",
    increment_attempt: false,
    readback: { aggregate_id: updated.public_id, source: "authoritative_local_database" },
  }, now)
}

function publicInventoryItem(row) {
  const quantity = nonNegativeInt(row.quantity_on_hand)
  const price = nonNegativeInt(row.price_minor_units)
  const floor = nonNegativeInt(row.minimum_sale_price_minor_units)
  return {
    public_id: row.public_id,
    wordpress_public_id: String(row.wordpress_public_id ?? ""),
    row_version: positiveInt(row.row_version, 1),
    provider_card_id: String(row.provider_card_id ?? ""),
    reference_variant_id: row.reference_variant_id === null ? null : positiveInt(row.reference_variant_id, null),
    provider_variant_id: String(row.provider_variant_id ?? ""),
    game: String(row.game ?? "pokemon"),
    card_name: String(row.card_name ?? ""),
    set_name: String(row.set_name ?? ""),
    set_code: String(row.set_code ?? ""),
    card_number: String(row.card_number ?? ""),
    printed_number: String(row.printed_number ?? ""),
    variant: String(row.variant ?? ""),
    finish: String(row.finish ?? ""),
    language: String(row.language ?? "EN"),
    raw_or_graded: String(row.raw_or_graded ?? "raw"),
    grading_company: String(row.grading_company ?? ""),
    grade: String(row.grade ?? ""),
    cert_number: String(row.cert_number ?? ""),
    condition: String(row.condition ?? "RAW"),
    barcode: String(row.barcode ?? ""),
    price_minor_units: price,
    sale_price_minor_units: price,
    display_price_minor_units: price,
    quantity_on_hand: quantity,
    market_price_minor_units: nonNegativeInt(row.market_price_minor_units),
    minimum_sale_price_minor_units: floor,
    floor_price_minor_units: floor,
    auto_price_minor_units: nonNegativeInt(row.auto_price_minor_units),
    pricing_source: String(row.pricing_source ?? ""),
    price_observed_at_utc: String(row.price_observed_at_utc ?? ""),
    currency: String(row.currency ?? "USD"),
    location: String(row.location ?? ""),
    status: String(row.status ?? ""),
    image_url: String(row.image_url ?? ""),
    back_image_url: String(row.back_image_url ?? ""),
    online_visibility: String(row.online_visibility ?? "visible"),
    kiosk_visibility: String(row.kiosk_visibility ?? "visible"),
    pos_visibility: String(row.pos_visibility ?? "visible"),
    square_catalog_item_id: String(row.square_catalog_item_id ?? ""),
    square_catalog_variation_id: String(row.square_catalog_variation_id ?? ""),
    square_location_id: String(row.square_location_id ?? ""),
    external_sync_state: String(row.external_sync_state ?? "pending"),
    created_by_user_id: String(row.created_by_user_id ?? ""),
    created_by_user_name: String(row.created_by_user_name ?? ""),
    updated_by_user_id: String(row.updated_by_user_id ?? ""),
    updated_by_user_name: String(row.updated_by_user_name ?? ""),
    source: String(row.source ?? "queued"),
  }
}

function recoveryActor(database) {
  const row = database
    .prepare("SELECT id, name FROM users WHERE role IN ('owner', 'manager') ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END, id LIMIT 1")
    .get()
  return {
    id: String(row?.id ?? "recovery-tool").slice(0, 96),
    name: String(row?.name ?? "Recovery Tool").trim().slice(0, 80),
  }
}

function normalizedBarcode(value) {
  return String(value ?? "").trim().toUpperCase()
}

function groupBy(values, keyForValue) {
  const groups = new Map()
  for (const value of values) {
    const key = keyForValue(value)
    const group = groups.get(key) ?? []
    group.push(value)
    groups.set(key, group)
  }
  return groups
}

function nonNegativeInt(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function sum(values) {
  let total = 0
  for (const value of values) {
    total += Number(value)
  }
  return total
}
