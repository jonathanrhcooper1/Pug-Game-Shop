import { createHash, randomUUID } from "node:crypto"

import {
  appendInventoryLedgerEntry,
  appendProjectionEvent,
  markOutboxDelivery,
  withImmediateTransaction,
} from "../../src/authoritativeLedger.mjs"
import { roundCustomerSalePriceMinorUnits } from "../../src/pricingEngine.mjs"
import { assertRecoveryTables, cleanId, parseJson, recoveryError } from "./recovery-common.mjs"

const ACCEPTED_TRADE_STATUSES = new Set(["approved", "paid", "converted", "completed"])
const TERMINAL_INVENTORY_STATUSES = new Set(["sold", "removed", "voided"])
const REQUIRED_TABLES = [
  "users",
  "inventory_items",
  "trade_in_orders",
  "operation_queue",
  "inventory_ledger_entries",
  "sync_outbox_events",
  "sync_outbox_deliveries",
]

export function expectedTradeInventoryIdentity(orderId, itemId, copyNumber) {
  const identityHash = createHash("sha256")
    .update(`${cleanId(orderId)}:${cleanId(itemId)}:${positiveInt(copyNumber, 1)}`)
    .digest("hex")

  return {
    identity_hash: identityHash,
    public_id: `trade-inventory-${identityHash.slice(0, 24)}`,
    barcode: `PUG${identityHash.slice(0, 10).toUpperCase()}`,
  }
}

export function planTradeReconciliation(database, options = {}) {
  assertRecoveryTables(database, REQUIRED_TABLES)
  const generatedAtUtc = (options.now ?? (() => new Date()))().toISOString()
  const requestedOrderIds = new Set((options.orderIds ?? []).map(cleanId).filter(Boolean))
  const inventoryRows = database.prepare("SELECT * FROM inventory_items ORDER BY public_id").all()
  const tradeRows = database.prepare("SELECT * FROM trade_in_orders ORDER BY created_at_utc, order_id").all()
  const ledgerRows = database
    .prepare("SELECT * FROM inventory_ledger_entries ORDER BY created_at_utc, ledger_id")
    .all()
  const users = new Map(database.prepare("SELECT id, name FROM users").all().map((row) => [row.id, row.name]))
  const inventoryById = new Map(inventoryRows.map((row) => [String(row.public_id), row]))
  const inventoryByBarcode = groupBy(inventoryRows, (row) => normalizeBarcode(row.barcode))
  const ledgerByInventory = groupBy(ledgerRows, (row) => String(row.inventory_public_id))
  const blockers = []
  const warnings = []
  const orders = []
  const acceptedRows = tradeRows.filter((row) => ACCEPTED_TRADE_STATUSES.has(String(row.status).toLowerCase()))
  const selectedRows = acceptedRows.filter((row) => requestedOrderIds.size === 0 || requestedOrderIds.has(row.order_id))

  for (const requestedOrderId of requestedOrderIds) {
    if (!selectedRows.some((row) => row.order_id === requestedOrderId)) {
      blockers.push({
        code: "trade_order_not_repairable",
        order_id: requestedOrderId,
        message: "The requested trade was not found in an accepted, paid, converted, or completed status.",
      })
    }
  }

  for (const order of selectedRows) {
    const orderPlan = planTradeOrder({
      order,
      inventoryById,
      inventoryByBarcode,
      ledgerByInventory,
      users,
      generatedAtUtc,
    })
    orders.push(orderPlan)
    blockers.push(...orderPlan.blockers)
    warnings.push(...orderPlan.warnings)
  }

  const actions = orders.flatMap((order) => order.actions)
  const expectedInventoryCount = orders.reduce((total, order) => total + order.expected_inventory_count, 0)
  const existingInventoryCount = orders.reduce((total, order) => total + order.existing_inventory_count, 0)
  const quantityBefore = inventoryRows.reduce((total, row) => total + nonNegativeInt(row.quantity_on_hand), 0)
  const plannedQuantityAdd = actions
    .filter((action) => action.action === "create_inventory")
    .reduce((total, action) => total + action.item.quantity_on_hand, 0)
  const ledgerEntriesToBackfill = actions.filter(
    (action) =>
      action.action === "backfill_acceptance_ledger" ||
      (action.action === "create_inventory" && action.acceptance_ledger_to_create),
  ).length

  return {
    status: blockers.length > 0 ? "blocked" : "ok",
    action: "trade_inventory_reconciliation",
    generated_at_utc: generatedAtUtc,
    selected_order_ids: [...requestedOrderIds],
    summary: {
      trade_orders_scanned: selectedRows.length,
      accepted_trade_orders_available: acceptedRows.length,
      expected_inventory_count: expectedInventoryCount,
      existing_inventory_count: existingInventoryCount,
      missing_inventory_count: expectedInventoryCount - existingInventoryCount,
      inventory_rows_to_create: actions.filter((action) => action.action === "create_inventory").length,
      order_links_to_add: actions.filter((action) => action.action === "add_order_link").length,
      ledger_entries_to_backfill: ledgerEntriesToBackfill,
      quantity_before: quantityBefore,
      planned_quantity_add: plannedQuantityAdd,
      planned_quantity_decrease: 0,
      inventory_rows_to_delete: 0,
      blockers: blockers.length,
      warnings: warnings.length,
      changes_planned: actions.length,
    },
    invariants: {
      existing_inventory_quantities_unchanged: true,
      existing_inventory_rows_deleted: 0,
      existing_order_links_removed: 0,
      quantity_decrease_planned: 0,
    },
    orders,
    blockers,
    warnings,
  }
}

export function applyTradeReconciliation(database, options = {}) {
  const now = options.now ?? (() => new Date())
  let appliedPlan
  let quantityBefore
  let quantityAfter

  withImmediateTransaction(database, () => {
    appliedPlan = planTradeReconciliation(database, { ...options, now })

    if (appliedPlan.status !== "ok") {
      throw recoveryError(
        "trade_reconciliation_blocked",
        "Trade reconciliation found blockers. No database changes were applied.",
        { blockers: appliedPlan.blockers },
      )
    }

    const quantitySnapshot = new Map(
      database
        .prepare("SELECT public_id, quantity_on_hand FROM inventory_items")
        .all()
        .map((row) => [row.public_id, nonNegativeInt(row.quantity_on_hand)]),
    )
    quantityBefore = sum(quantitySnapshot.values())

    for (const order of appliedPlan.orders) {
      for (const action of order.actions) {
        if (action.action === "create_inventory") {
          insertRecoveredInventory(database, action.item, now)
          appendRecoveredInventoryOperation(database, action.item, order, now)
          ensureAcceptanceLedger(database, action.item, order, action.trade_item, action.copy_number, now)
        }
        if (action.action === "backfill_acceptance_ledger") {
          ensureAcceptanceLedger(database, action.item, order, action.trade_item, action.copy_number, now)
        }
      }

      if (order.inventory_public_ids_after.length > order.inventory_public_ids_before.length) {
        database
          .prepare(`
            UPDATE trade_in_orders
            SET inventory_public_ids_json = ?, updated_at_utc = ?
            WHERE order_id = ?
          `)
          .run(JSON.stringify(order.inventory_public_ids_after), now().toISOString(), order.order_id)
      }
    }

    const afterRows = database.prepare("SELECT public_id, quantity_on_hand FROM inventory_items").all()
    const afterMap = new Map(afterRows.map((row) => [row.public_id, nonNegativeInt(row.quantity_on_hand)]))
    quantityAfter = sum(afterMap.values())

    for (const [publicId, beforeQuantity] of quantitySnapshot) {
      if (!afterMap.has(publicId) || afterMap.get(publicId) !== beforeQuantity) {
        throw recoveryError(
          "trade_reconciliation_quantity_invariant_failed",
          `Existing inventory quantity changed during recovery for ${publicId}.`,
        )
      }
    }

    if (quantityAfter - quantityBefore !== appliedPlan.summary.planned_quantity_add) {
      throw recoveryError(
        "trade_reconciliation_total_invariant_failed",
        "Recovered inventory total did not match the planned additive quantity.",
      )
    }
  })

  const verification = planTradeReconciliation(database, { ...options, now })

  return {
    ...appliedPlan,
    status: "ok",
    mode: "apply",
    applied_at_utc: now().toISOString(),
    applied: {
      inventory_rows_created: appliedPlan.summary.inventory_rows_to_create,
      order_links_added: appliedPlan.summary.order_links_to_add,
      ledger_entries_backfilled: appliedPlan.summary.ledger_entries_to_backfill,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      quantity_added: quantityAfter - quantityBefore,
      quantity_decreased: 0,
      inventory_rows_deleted: 0,
    },
    verification: {
      status: verification.status,
      changes_remaining: verification.summary.changes_planned,
      blockers_remaining: verification.summary.blockers,
      existing_inventory_quantities_unchanged: true,
    },
  }
}

function planTradeOrder({ order, inventoryById, inventoryByBarcode, ledgerByInventory, users, generatedAtUtc }) {
  const blockers = []
  const warnings = []
  const actions = []
  const rawItems = parseJson(order.items_json, null)
  const rawLinks = parseJson(order.inventory_public_ids_json, null)

  if (!Array.isArray(rawItems)) {
    blockers.push({
      code: "trade_items_json_invalid",
      order_id: order.order_id,
      message: "Trade items_json is not a valid array.",
    })
  }
  if (!Array.isArray(rawLinks)) {
    blockers.push({
      code: "trade_inventory_links_json_invalid",
      order_id: order.order_id,
      message: "Trade inventory_public_ids_json is not a valid array.",
    })
  }

  const items = Array.isArray(rawItems) ? rawItems.map(cleanTradeItem).filter(Boolean) : []
  const linksBefore = Array.isArray(rawLinks) ? unique(rawLinks.map(cleanId).filter(Boolean)) : []
  const expectedCopies = []

  for (const item of items) {
    for (let copyNumber = 1; copyNumber <= item.quantity; copyNumber += 1) {
      expectedCopies.push({
        ...expectedTradeInventoryIdentity(order.order_id, item.item_id, copyNumber),
        copy_number: copyNumber,
        trade_item: item,
      })
    }
  }

  if (items.length === 0) {
    blockers.push({
      code: "accepted_trade_has_no_repairable_items",
      order_id: order.order_id,
      message: "Accepted trade has no valid persisted items to reconcile.",
    })
  }

  const expectedIds = expectedCopies.map((copy) => copy.public_id)
  if (new Set(expectedIds).size !== expectedIds.length) {
    blockers.push({
      code: "trade_expected_identity_collision",
      order_id: order.order_id,
      message: "Two trade copies resolve to the same deterministic inventory ID.",
    })
  }

  const linksAfter = [...linksBefore]
  let existingInventoryCount = 0

  for (const copy of expectedCopies) {
    const existing = inventoryById.get(copy.public_id)
    const ledgerHistory = ledgerByInventory.get(copy.public_id) ?? []
    const acceptanceLedger = ledgerHistory.find(
      (row) => row.mutation_type === "trade_in_acceptance" && row.reference_id === order.order_id,
    )
    const otherTradeOwner = ledgerHistory.find(
      (row) =>
        row.mutation_type === "trade_in_acceptance" &&
        row.reference_type === "trade_in_order" &&
        row.reference_id &&
        row.reference_id !== order.order_id,
    )

    if (otherTradeOwner) {
      blockers.push({
        code: "trade_inventory_identity_owned_by_other_trade",
        order_id: order.order_id,
        inventory_public_id: copy.public_id,
        conflicting_order_id: otherTradeOwner.reference_id,
      })
      continue
    }

    if (existing) {
      existingInventoryCount += 1
      if (!acceptanceLedger) {
        actions.push({
          action: "backfill_acceptance_ledger",
          order_id: order.order_id,
          inventory_public_id: copy.public_id,
          quantity_preserved: nonNegativeInt(existing.quantity_on_hand),
          item: inventoryItemForAction(existing),
          trade_item: copy.trade_item,
          copy_number: copy.copy_number,
        })
      }
    } else {
      const latestLedger = ledgerHistory.at(-1)
      const latestQuantity = latestLedger ? nonNegativeInt(latestLedger.quantity_after) : 1
      const latestStatus = String(latestLedger?.status_after ?? "").toLowerCase()

      if (latestLedger && (latestQuantity === 0 || TERMINAL_INVENTORY_STATUSES.has(latestStatus))) {
        warnings.push({
          code: "missing_trade_inventory_has_terminal_history",
          order_id: order.order_id,
          inventory_public_id: copy.public_id,
          latest_quantity: latestQuantity,
          latest_status: latestStatus,
          message: "The missing row has zero/terminal ledger history and was not recreated.",
        })
      } else {
        const actorId = cleanId(order.converted_by_user_id) || cleanId(order.staff_user_id) || "recovery-tool"
        const actorName = String(users.get(actorId) ?? "Recovery Tool").trim().slice(0, 80)
        const item = buildTradeInventoryItem({
          order,
          tradeItem: copy.trade_item,
          identity: copy,
          actorId,
          actorName,
          quantity: Math.max(1, latestQuantity),
          status: latestStatus || "pending_intake",
          generatedAtUtc,
          squareLocationId: squareLocationForOrder(order.order_id, inventoryById),
        })
        const barcodeOwners = inventoryByBarcode.get(normalizeBarcode(item.barcode)) ?? []

        if (barcodeOwners.some((row) => row.public_id !== item.public_id)) {
          blockers.push({
            code: "trade_repair_barcode_collision",
            order_id: order.order_id,
            inventory_public_id: item.public_id,
            barcode: item.barcode,
            conflicting_inventory_public_ids: barcodeOwners.map((row) => row.public_id),
          })
        } else {
          actions.push({
            action: "create_inventory",
            order_id: order.order_id,
            inventory_public_id: item.public_id,
            quantity_to_add: item.quantity_on_hand,
            item,
            trade_item: copy.trade_item,
            copy_number: copy.copy_number,
            acceptance_ledger_to_create: !acceptanceLedger,
          })
        }
      }
    }

    if (!linksAfter.includes(copy.public_id)) {
      linksAfter.push(copy.public_id)
      actions.push({
        action: "add_order_link",
        order_id: order.order_id,
        inventory_public_id: copy.public_id,
      })
    }
  }

  const unexpectedLinks = linksBefore.filter((publicId) => !expectedIds.includes(publicId))
  if (unexpectedLinks.length > 0) {
    warnings.push({
      code: "legacy_trade_inventory_links_preserved",
      order_id: order.order_id,
      inventory_public_ids: unexpectedLinks,
      message: "Existing non-deterministic links are preserved and require no destructive cleanup.",
    })
  }

  return {
    order_id: order.order_id,
    status: String(order.status),
    expected_inventory_count: expectedCopies.length,
    existing_inventory_count: existingInventoryCount,
    inventory_public_ids_before: linksBefore,
    inventory_public_ids_after: linksAfter,
    legacy_inventory_public_ids_preserved: unexpectedLinks,
    actions,
    blockers,
    warnings,
  }
}

function buildTradeInventoryItem({
  order,
  tradeItem,
  identity,
  actorId,
  actorName,
  quantity,
  status,
  generatedAtUtc,
  squareLocationId,
}) {
  const marketMinorUnits = nonNegativeInt(tradeItem.market_mid_minor_units)
  const costMinorUnits = nonNegativeInt(tradeItem.final_value_minor_units)
  const priceBasisMinorUnits = marketMinorUnits > 0 ? marketMinorUnits : costMinorUnits
  const markedUpMinorUnits = Math.round((priceBasisMinorUnits * 11000) / 10000)
  const autoPriceMinorUnits = Math.max(costMinorUnits, roundCustomerSalePriceMinorUnits(markedUpMinorUnits))

  return {
    public_id: identity.public_id,
    wordpress_public_id: "",
    row_version: 1,
    provider_card_id: cleanId(tradeItem.provider_card_id),
    reference_variant_id: nullablePositiveInt(tradeItem.reference_variant_id),
    provider_variant_id: cleanId(tradeItem.provider_variant_id),
    game: cleanGame(tradeItem.game),
    card_name: cleanText(tradeItem.card_name, 80),
    set_name: cleanText(tradeItem.set_name, 80) || "Trade-In Intake",
    set_code: cleanText(tradeItem.set_code, 80).toUpperCase(),
    card_number: cleanText(tradeItem.card_number, 80),
    printed_number: cleanText(tradeItem.printed_number, 80),
    variant: cleanText(tradeItem.variant, 80),
    finish: cleanText(tradeItem.finish, 80),
    language: cleanText(tradeItem.language, 80) || "EN",
    raw_or_graded: cleanRawOrGraded(tradeItem.product_type),
    grading_company: tradeItem.product_type === "graded" ? cleanText(tradeItem.grading_company, 80) : "",
    grade: tradeItem.product_type === "graded" ? cleanText(tradeItem.grade, 80) : "",
    cert_number: tradeItem.product_type === "graded" ? cleanText(tradeItem.cert_number, 80) : "",
    condition: cleanText(tradeItem.condition, 16) || "RAW",
    barcode: identity.barcode,
    price_minor_units: autoPriceMinorUnits,
    market_price_minor_units: marketMinorUnits,
    auto_price_minor_units: autoPriceMinorUnits,
    pricing_source: cleanText(tradeItem.price_source, 80) || "trade_in_market_mid",
    price_observed_at_utc: cleanIso(tradeItem.price_observed_at_utc) || generatedAtUtc,
    quantity_on_hand: nonNegativeInt(quantity),
    minimum_sale_price_minor_units: costMinorUnits,
    currency: "USD",
    location: "Trade-In Intake",
    status: cleanInventoryStatus(status),
    image_url: cleanUrl(tradeItem.image_url),
    back_image_url: cleanUrl(tradeItem.back_image_url),
    online_visibility: "visible",
    kiosk_visibility: "visible",
    pos_visibility: "visible",
    square_catalog_item_id: "",
    square_catalog_variation_id: "",
    square_location_id: squareLocationId,
    external_sync_state: "pending",
    created_by_user_id: actorId,
    created_by_user_name: actorName,
    updated_by_user_id: actorId,
    updated_by_user_name: actorName,
    source: "queued",
  }
}

function insertRecoveredInventory(database, item, now) {
  database.prepare(`
    INSERT INTO inventory_items (
      public_id, wordpress_public_id, row_version, provider_card_id, game, card_name, set_name,
      reference_variant_id, provider_variant_id, set_code, card_number, printed_number,
      variant, finish, language, raw_or_graded, grading_company, grade, cert_number, condition,
      barcode, price_minor_units, market_price_minor_units, auto_price_minor_units, pricing_source,
      price_observed_at_utc, quantity_on_hand, minimum_sale_price_minor_units, currency, location,
      status, image_url, back_image_url, online_visibility, kiosk_visibility, pos_visibility,
      square_catalog_item_id, square_catalog_variation_id, square_location_id, external_sync_state,
      created_by_user_id, created_by_user_name, updated_by_user_id, updated_by_user_name, source,
      updated_at_utc
    ) VALUES (
      @public_id, @wordpress_public_id, @row_version, @provider_card_id, @game, @card_name, @set_name,
      @reference_variant_id, @provider_variant_id, @set_code, @card_number, @printed_number,
      @variant, @finish, @language, @raw_or_graded, @grading_company, @grade, @cert_number, @condition,
      @barcode, @price_minor_units, @market_price_minor_units, @auto_price_minor_units, @pricing_source,
      @price_observed_at_utc, @quantity_on_hand, @minimum_sale_price_minor_units, @currency, @location,
      @status, @image_url, @back_image_url, @online_visibility, @kiosk_visibility, @pos_visibility,
      @square_catalog_item_id, @square_catalog_variation_id, @square_location_id, @external_sync_state,
      @created_by_user_id, @created_by_user_name, @updated_by_user_id, @updated_by_user_name, @source,
      @updated_at_utc
    )
  `).run({ ...item, updated_at_utc: now().toISOString() })
}

function appendRecoveredInventoryOperation(database, item, order, now) {
  const operationId = `op-${randomUUID()}`
  const payload = {
    item: publicInventoryItem(item),
    actor_id: item.updated_by_user_id,
    actor_name: item.updated_by_user_name,
    sync_intent: "trade_inventory_reconciliation_recovery",
    trade_in_order_id: order.order_id,
    wordpress_acceptance_required: true,
    recovery_generated: true,
  }

  database.prepare(`
    INSERT INTO operation_queue (
      operation_id, operation_type, entity_id, payload_json, queued_at_utc, sync_status
    ) VALUES (?, 'inventory_intake', ?, ?, ?, 'pending')
  `).run(operationId, item.public_id, JSON.stringify(payload), now().toISOString())

  const outbox = appendProjectionEvent(database, {
    idempotency_key: operationId,
    aggregate_type: "inventory",
    aggregate_id: item.public_id,
    event_type: "inventory_intake",
    destinations: ["wordpress", "square", "kiosk"],
    payload,
  }, now)
  markOutboxDelivery(database, {
    event_id: outbox.event.event_id,
    destination: "kiosk",
    status: "verified",
    increment_attempt: false,
    readback: { aggregate_id: item.public_id, source: "authoritative_local_database" },
  }, now)
}

function ensureAcceptanceLedger(database, item, order, tradeItem, copyNumber, now) {
  appendInventoryLedgerEntry(database, {
    idempotency_key: `trade-accept:${order.order_id}:${tradeItem.item_id}:${copyNumber}`,
    inventory_public_id: item.public_id,
    mutation_type: "trade_in_acceptance",
    source_channel: "trade_in",
    reference_type: "trade_in_order",
    reference_id: order.order_id,
    quantity_before: 0,
    quantity_after: 1,
    status_before: "",
    status_after: "pending_intake",
    price_before_minor_units: 0,
    price_after_minor_units: item.price_minor_units,
    actor_user_id: item.created_by_user_id,
    actor_user_name: item.created_by_user_name,
    reason: `Recovered accepted trade-in line ${tradeItem.item_id}`,
    payload: {
      trade_in_item_id: tradeItem.item_id,
      payout_type: tradeItem.payout_type,
      cost_minor_units: nonNegativeInt(tradeItem.final_value_minor_units),
      recovery_generated: true,
    },
  }, now)
}

function publicInventoryItem(item) {
  return {
    public_id: item.public_id,
    wordpress_public_id: item.wordpress_public_id,
    row_version: item.row_version,
    provider_card_id: item.provider_card_id,
    reference_variant_id: item.reference_variant_id,
    provider_variant_id: item.provider_variant_id,
    game: item.game,
    card_name: item.card_name,
    set_name: item.set_name,
    set_code: item.set_code,
    card_number: item.card_number,
    printed_number: item.printed_number,
    variant: item.variant,
    finish: item.finish,
    language: item.language,
    raw_or_graded: item.raw_or_graded,
    grading_company: item.grading_company,
    grade: item.grade,
    cert_number: item.cert_number,
    condition: item.condition,
    barcode: item.barcode,
    price_minor_units: item.price_minor_units,
    sale_price_minor_units: item.price_minor_units,
    display_price_minor_units: item.price_minor_units,
    quantity_on_hand: item.quantity_on_hand,
    market_price_minor_units: item.market_price_minor_units,
    minimum_sale_price_minor_units: item.minimum_sale_price_minor_units,
    floor_price_minor_units: item.minimum_sale_price_minor_units,
    auto_price_minor_units: item.auto_price_minor_units,
    pricing_source: item.pricing_source,
    price_observed_at_utc: item.price_observed_at_utc,
    currency: item.currency,
    location: item.location,
    status: item.status,
    image_url: item.image_url,
    back_image_url: item.back_image_url,
    online_visibility: item.online_visibility,
    kiosk_visibility: item.kiosk_visibility,
    pos_visibility: item.pos_visibility,
    square_catalog_item_id: item.square_catalog_item_id,
    square_catalog_variation_id: item.square_catalog_variation_id,
    square_location_id: item.square_location_id,
    external_sync_state: item.external_sync_state,
    created_by_user_id: item.created_by_user_id,
    created_by_user_name: item.created_by_user_name,
    updated_by_user_id: item.updated_by_user_id,
    updated_by_user_name: item.updated_by_user_name,
    source: item.source,
  }
}

function inventoryItemForAction(row) {
  return {
    ...row,
    reference_variant_id: nullablePositiveInt(row.reference_variant_id),
    quantity_on_hand: nonNegativeInt(row.quantity_on_hand),
  }
}

function cleanTradeItem(value, index = 0) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const cardName = cleanText(value.card_name ?? value.cardName, 80)
  const marketMinorUnits = nonNegativeInt(value.market_mid_minor_units ?? value.market_price_minor_units)
  const finalMinorUnits = nonNegativeInt(
    value.final_value_minor_units ?? value.offer_value_minor_units ?? value.calculated_final_value_minor_units,
  )

  if (!cardName || (marketMinorUnits <= 0 && finalMinorUnits <= 0)) {
    return null
  }

  return {
    ...value,
    item_id: cleanId(value.item_id ?? value.id) || `trade-item-${index + 1}`,
    product_type: cleanRawOrGraded(value.product_type ?? value.raw_or_graded),
    card_name: cardName,
    set_name: cleanText(value.set_name, 80),
    condition: cleanText(value.condition, 16) || "RAW",
    market_mid_minor_units: marketMinorUnits,
    final_value_minor_units: finalMinorUnits,
    quantity: boundedInt(value.quantity, 1, 999, 1),
    payout_type: String(value.payout_type).toLowerCase() === "cash" ? "cash" : "credit",
  }
}

function squareLocationForOrder(orderId, inventoryById) {
  for (const row of inventoryById.values()) {
    const historyId = String(row.public_id)
    if (historyId.startsWith("trade-inventory-") && row.square_location_id) {
      return cleanId(row.square_location_id)
    }
  }
  return "LOCAL-SQUARE-POS"
}

function cleanGame(value) {
  const game = String(value ?? "").trim().toLowerCase()
  const aliases = {
    magic: "magicthegathering",
    mtg: "magicthegathering",
    "magic-the-gathering": "magicthegathering",
    onepiece: "onepiece",
    "one-piece": "onepiece",
    "one piece": "onepiece",
    "yu-gi-oh": "yugioh",
  }
  const normalized = aliases[game] ?? game
  return ["pokemon", "magicthegathering", "lorcana", "onepiece", "gundam", "yugioh", "riftbound"].includes(normalized)
    ? normalized
    : "pokemon"
}

function cleanRawOrGraded(value) {
  const normalized = String(value ?? "").trim().toLowerCase()
  return ["raw", "graded", "sealed"].includes(normalized) ? normalized : "raw"
}

function cleanInventoryStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase()
  return ["available", "reserved", "sold", "pending_intake", "removed", "conflict"].includes(normalized)
    ? normalized
    : "pending_intake"
}

function cleanText(value, length) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, length)
}

function cleanUrl(value) {
  const text = String(value ?? "").trim()
  try {
    const url = new URL(text)
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : ""
  } catch {
    return ""
  }
}

function cleanIso(value) {
  const parsed = Date.parse(String(value ?? ""))
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : ""
}

function normalizeBarcode(value) {
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

function unique(values) {
  return [...new Set(values)]
}

function sum(values) {
  let total = 0
  for (const value of values) {
    total += Number(value)
  }
  return total
}

function nonNegativeInt(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function nullablePositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function boundedInt(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}
