import { createHash, randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { basename, dirname, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"

import {
  migrateAuthoritativeLedger,
  recordPriceDecision,
  recordPriceObservation,
  withImmediateTransaction,
} from "../../apps/local-sync-server/src/authoritativeLedger.mjs"
import { createLocalSyncStore } from "../../apps/local-sync-server/src/localSyncStore.mjs"

export const FIXTURE_SUITE_ID = "pug-sanitized-e2e-v1"
export const FIXTURE_LOCATION = "QA Fixture Shelf"

const TABLE_KEYS = Object.freeze({
  sync_outbox_deliveries: "delivery_id",
  price_review_items: "review_id",
  price_decisions: "decision_id",
  price_observations: "observation_id",
  inventory_reservations: "reservation_id",
  operation_queue: "operation_id",
  inventory_ledger_entries: "ledger_id",
  sync_outbox_events: "event_id",
  kiosk_orders: "order_id",
  trade_in_orders: "order_id",
  inventory_items: "public_id",
})

const CLEANUP_ORDER = Object.freeze(Object.keys(TABLE_KEYS))
const FIXTURE_CARD = Object.freeze({
  barcode: "PUGQA00000001",
  cardName: "PUG QA Fixture Card",
  customerName: "QA Fixture Customer",
})

export async function setupSanitizedFixtures(options = {}) {
  const context = normalizeOptions(options)
  const previousManifest = readManifestIfPresent(context.manifestPath)

  if (!context.apply) {
    return {
      status: "dry_run",
      action: "setup",
      database: context.databaseLabel,
      manifest_path: context.manifestPath,
      external_writes: false,
      planned_records: ["inventory", "two-line trade", "kiosk reservation/order", "price-review candidate"],
    }
  }

  assertWritePermission(context)
  assertDatabaseSafety(context)

  if (previousManifest?.status === "active") {
    assertManifestMatchesDatabase(previousManifest, context)
    const verification = verifyManifestRecords(context.databasePath, previousManifest)
    if (verification.missing.length === 0) {
      return { status: "ok", action: "already_setup", manifest: previousManifest, verification }
    }

    cleanupSanitizedFixtures({
      ...context,
      apply: true,
      allowLocalWrite: true,
      allowProductionLocalDb: context.allowProductionLocalDb,
    })
  } else if (previousManifest?.status === "cleaned") {
    archiveManifest(context.manifestPath, previousManifest)
  }

  assertFixtureMarkersAvailable(context.databasePath)
  const ownsFixtureLocation = !inventoryLocationExists(context.databasePath, FIXTURE_LOCATION)
  const runId = randomUUID()
  const createdAt = new Date().toISOString()
  let store = null
  let intake = null
  let trade = null
  let kiosk = null
  let domainError = null

  try {
    store = createLocalSyncStore({
      databasePath: context.databasePath,
      seedDemoData: context.bootstrapIsolated,
      seedDemoInventory: false,
      removeSeedReferenceCards: false,
    })
    const pin = context.pin
    if (!pin) {
      throw new Error("PUG_TEST_DATA_PIN or --pin is required for fixture setup.")
    }

    const auth = store.createSession({ pin, ttlMinutes: 5 })
    if (auth.status !== "ok") {
      throw new Error(`Fixture authentication failed: ${auth.code || "invalid_pin"}`)
    }

    intake = await store.createInventoryIntake(auth.session.token, {
      game: "magic-the-gathering",
      card_name: FIXTURE_CARD.cardName,
      set_name: "Automation Fixture",
      set_code: "QA1",
      card_number: "1",
      printed_number: "1",
      variant: "normal",
      finish: "nonfoil",
      language: "EN",
      raw_or_graded: "raw",
      condition: "NM",
      barcode: FIXTURE_CARD.barcode,
      quantity: 1,
      price_minor_units: 1200,
      market_price_minor_units: 1500,
      minimum_sale_price_minor_units: 1000,
      auto_price_minor_units: 1700,
      price_source: FIXTURE_SUITE_ID,
      location: FIXTURE_LOCATION,
      online_visibility: "visible",
      kiosk_visibility: "visible",
      pos_visibility: "visible",
      sync_intent: FIXTURE_SUITE_ID,
    })
    assertDomainResult(intake, "inventory intake")

    trade = store.createTradeInOrder(auth.session.token, {
      customer_name: FIXTURE_CARD.customerName,
      customer_phone: "8655550100",
      notes: `${FIXTURE_SUITE_ID}:${runId}`,
      items: [
        {
          id: `${FIXTURE_SUITE_ID}-trade-1`,
          product_type: "raw",
          card_name: "QA Fixture Alpha",
          set_name: "Automation Fixture",
          condition: "NM",
          market_mid_minor_units: 2000,
          trade_in_percentage_basis_points: 6000,
          payout_type: "credit",
          manual_entry: true,
        },
        {
          id: `${FIXTURE_SUITE_ID}-trade-2`,
          product_type: "raw",
          card_name: "QA Fixture Beta",
          set_name: "Automation Fixture",
          condition: "LP",
          market_mid_minor_units: 1000,
          trade_in_percentage_basis_points: 5000,
          payout_type: "cash",
          manual_entry: true,
        },
      ],
    })
    assertDomainResult(trade, "two-line trade")

    kiosk = store.createKioskOrder({
      first_name: "QA",
      last_name: "Fixture",
      customer_lookup: FIXTURE_SUITE_ID,
      inventory_public_ids: [intake.item.public_id],
    })
    assertDomainResult(kiosk, "kiosk reservation/order")
  } catch (error) {
    domainError = error
  } finally {
    store?.close()
  }

  const database = new DatabaseSync(context.databasePath)
  try {
    database.exec("PRAGMA foreign_keys = ON;")
    migrateAuthoritativeLedger(database)
    if (domainError) {
      const partialManifest = recoverPartialManifest({
        context,
        runId,
        createdAt,
        database,
        ownsFixtureLocation,
      })
      writeManifestAtomic(context.manifestPath, partialManifest)
      throw domainError
    }
    const observation = recordPriceObservation(database, {
      observation_id: `${FIXTURE_SUITE_ID}-observation-${runId}`,
      idempotency_key: `${FIXTURE_SUITE_ID}:observation:${runId}`,
      inventory_public_id: intake.item.public_id,
      provider_card_id: `${FIXTURE_SUITE_ID}-provider-card`,
      provider_variant_id: `${FIXTURE_SUITE_ID}-provider-variant`,
      condition_code: "NM",
      source_provider: "sanitized_fixture",
      source_currency: "USD",
      source_amount_minor_units: 2500,
      converted_usd_minor_units: 2500,
      payload: { fixture_suite: FIXTURE_SUITE_ID, run_id: runId },
    })
    const decision = recordPriceDecision(database, {
      decision_id: `${FIXTURE_SUITE_ID}-decision-${runId}`,
      idempotency_key: `${FIXTURE_SUITE_ID}:decision:${runId}`,
      inventory_public_id: intake.item.public_id,
      observation_id: observation.observation.observation_id,
      current_price_minor_units: 1200,
      candidate_price_minor_units: 2500,
      effective_floor_minor_units: 1000,
      percent_change_basis_points: 10833,
      decision_status: "review_required",
      reason_code: "sanitized_fixture_price_change",
      review_reason: "Sanitized end-to-end price-review fixture",
    })

    const manifest = buildManifest({
      context,
      runId,
      createdAt,
      inventoryPublicId: intake.item.public_id,
      tradeOrderId: trade.order.order_id,
      kioskOrderId: kiosk.order.order_id,
      reservationIds: kiosk.reservations.map((row) => row.reservation_id),
      observationId: observation.observation.observation_id,
      decisionId: decision.decision.decision_id,
      reviewId: decision.review.review_id,
      ownsFixtureLocation,
      database,
    })
    writeManifestAtomic(context.manifestPath, manifest)
    return {
      status: "ok",
      action: "setup",
      manifest,
      verification: verifyManifestRecords(context.databasePath, manifest),
    }
  } catch (error) {
    const partialManifest = recoverPartialManifest({
      context,
      runId,
      createdAt,
      database,
      ownsFixtureLocation,
    })
    writeManifestAtomic(context.manifestPath, partialManifest)
    throw error
  } finally {
    database.close()
  }
}

export function cleanupSanitizedFixtures(options = {}) {
  const context = normalizeOptions(options)
  const manifest = readManifestIfPresent(context.manifestPath)

  if (!manifest) {
    return { status: context.apply ? "ok" : "dry_run", action: "nothing_to_clean", manifest_path: context.manifestPath }
  }
  assertManifestMatchesDatabase(manifest, context)

  if (!context.apply) {
    return {
      status: "dry_run",
      action: "cleanup",
      manifest_path: context.manifestPath,
      verification: verifyManifestRecords(context.databasePath, manifest),
      external_writes: false,
    }
  }

  assertWritePermission(context)
  assertDatabaseSafety(context)
  if (manifest.status === "cleaned") {
    return { status: "ok", action: "already_cleaned", manifest }
  }

  const database = new DatabaseSync(context.databasePath)
  const removed = {}
  try {
    database.exec("PRAGMA foreign_keys = ON;")
    withImmediateTransaction(database, () => {
      for (const table of CLEANUP_ORDER) {
        const key = TABLE_KEYS[table]
        const ids = manifest.records.filter((record) => record.table === table).map((record) => record.id)
        let count = 0
        for (const id of ids) {
          count += Number(database.prepare(`DELETE FROM ${table} WHERE ${key} = ?`).run(id).changes)
        }
        removed[table] = count
      }
      removeOwnedInventoryLocation(database, manifest.owned_settings?.inventory_locations ?? [])
    })
  } finally {
    database.close()
  }

  const cleanedManifest = {
    ...manifest,
    status: "cleaned",
    cleaned_at_utc: new Date().toISOString(),
    cleanup_removed_counts: removed,
  }
  writeManifestAtomic(context.manifestPath, cleanedManifest)
  return { status: "ok", action: "cleanup", manifest: cleanedManifest, removed }
}

export function verifyManifestRecords(databasePath, manifest) {
  if (!existsSync(databasePath)) {
    return { present: [], missing: [...(manifest.records ?? [])] }
  }
  const database = new DatabaseSync(databasePath, { readOnly: true })
  const present = []
  const missing = []
  try {
    for (const record of manifest.records ?? []) {
      const key = TABLE_KEYS[record.table]
      if (!key || !tableExists(database, record.table)) {
        missing.push(record)
        continue
      }
      const found = database.prepare(`SELECT 1 AS found FROM ${record.table} WHERE ${key} = ?`).get(record.id)
      ;(found ? present : missing).push(record)
    }
  } finally {
    database.close()
  }
  return { present, missing }
}

function normalizeOptions(options) {
  const databasePath = resolve(String(options.databasePath ?? process.env.PUG_LOCAL_SYNC_DATABASE_PATH ?? ""))
  if (!String(options.databasePath ?? process.env.PUG_LOCAL_SYNC_DATABASE_PATH ?? "").trim()) {
    throw new Error("A local SQLite database path is required.")
  }
  return {
    databasePath,
    databaseLabel: basename(databasePath),
    databaseFingerprint: databaseFingerprint(databasePath),
    manifestPath: resolve(options.manifestPath ?? `${databasePath}.pug-e2e-fixture-manifest.json`),
    pin: String(options.pin ?? process.env.PUG_TEST_DATA_PIN ?? "").trim(),
    apply: options.apply === true,
    allowLocalWrite: options.allowLocalWrite === true,
    allowProductionLocalDb: options.allowProductionLocalDb === true,
    bootstrapIsolated: options.bootstrapIsolated === true,
  }
}

function assertWritePermission(context) {
  if (!context.allowLocalWrite) {
    throw new Error("Local fixture writes are disabled. Re-run with --apply --allow-local-write.")
  }
}

function assertDatabaseSafety(context) {
  if (!existsSync(context.databasePath)) {
    if (!context.bootstrapIsolated) {
      throw new Error("The local database does not exist. Use --bootstrap-isolated only for a disposable test database.")
    }
    return
  }

  const database = new DatabaseSync(context.databasePath, { readOnly: true })
  try {
    if (!tableExists(database, "server_settings")) {
      return
    }
    const row = database.prepare(
      "SELECT setting_value_json FROM server_settings WHERE setting_key = 'one_website_setup'",
    ).get()
    const config = safeJsonParse(row?.setting_value_json, {})
    const websiteUrl = String(config.websiteUrl ?? config.website_url ?? "").trim()
    if (websiteUrl && !isClearlyNonProductionUrl(websiteUrl) && !context.allowProductionLocalDb) {
      throw new Error("This database is configured for a public website. Pass --allow-production-local-db to acknowledge local-only fixture writes.")
    }
  } finally {
    database.close()
  }
}

function assertFixtureMarkersAvailable(databasePath) {
  if (!existsSync(databasePath)) {
    return
  }
  const database = new DatabaseSync(databasePath, { readOnly: true })
  try {
    if (tableExists(database, "inventory_items")) {
      const item = database.prepare("SELECT public_id FROM inventory_items WHERE barcode = ? OR card_name = ?").get(
        FIXTURE_CARD.barcode,
        FIXTURE_CARD.cardName,
      )
      if (item) {
        throw new Error("Fixture marker collision detected; cleanup with the owning manifest before setup.")
      }
    }
    if (tableExists(database, "trade_in_orders")) {
      const order = database.prepare("SELECT order_id FROM trade_in_orders WHERE notes LIKE ?").get(`${FIXTURE_SUITE_ID}:%`)
      if (order) {
        throw new Error("Fixture trade collision detected; cleanup with the owning manifest before setup.")
      }
    }
  } finally {
    database.close()
  }
}

function buildManifest(input) {
  const records = collectOwnedRecords(input.database, {
    inventoryPublicId: input.inventoryPublicId,
    tradeOrderId: input.tradeOrderId,
    kioskOrderId: input.kioskOrderId,
    reservationIds: input.reservationIds,
    observationId: input.observationId,
    decisionId: input.decisionId,
    reviewId: input.reviewId,
  })
  return {
    schema_version: 1,
    fixture_suite: FIXTURE_SUITE_ID,
    fixture_run_id: input.runId,
    status: "active",
    created_at_utc: input.createdAt,
    database_label: input.context.databaseLabel,
    database_path_fingerprint: input.context.databaseFingerprint,
    safeguards: {
      external_writes_performed: false,
      queue_push_called: false,
      fixture_data_sanitized: true,
    },
    logical_records: {
      inventory_public_id: input.inventoryPublicId,
      trade_order_id: input.tradeOrderId,
      kiosk_order_id: input.kioskOrderId,
      reservation_ids: input.reservationIds,
      price_observation_id: input.observationId,
      price_decision_id: input.decisionId,
      price_review_id: input.reviewId,
    },
    records,
    owned_settings: { inventory_locations: input.ownsFixtureLocation ? [FIXTURE_LOCATION] : [] },
  }
}

function recoverPartialManifest({ context, runId, createdAt, database, ownsFixtureLocation }) {
  const inventory = tableExists(database, "inventory_items")
    ? database.prepare("SELECT public_id FROM inventory_items WHERE barcode = ?").get(FIXTURE_CARD.barcode)
    : null
  const trade = tableExists(database, "trade_in_orders")
    ? database.prepare("SELECT order_id FROM trade_in_orders WHERE notes LIKE ? ORDER BY created_at_utc DESC LIMIT 1").get(`${FIXTURE_SUITE_ID}:%`)
    : null
  const kiosk = tableExists(database, "kiosk_orders") && inventory
    ? database.prepare("SELECT order_id, reservation_ids_json FROM kiosk_orders WHERE items_json LIKE ? ORDER BY created_at_utc DESC LIMIT 1").get(`%${inventory.public_id}%`)
    : null
  return buildManifest({
    context,
    runId,
    createdAt,
    inventoryPublicId: inventory?.public_id ?? "",
    tradeOrderId: trade?.order_id ?? "",
    kioskOrderId: kiosk?.order_id ?? "",
    reservationIds: safeJsonParse(kiosk?.reservation_ids_json, []),
    observationId: `${FIXTURE_SUITE_ID}-observation-${runId}`,
    decisionId: `${FIXTURE_SUITE_ID}-decision-${runId}`,
    reviewId: "",
    ownsFixtureLocation,
    database,
  })
}

function collectOwnedRecords(database, ids) {
  const records = []
  const addRows = (table, query, parameters = []) => {
    if (!tableExists(database, table)) return
    const key = TABLE_KEYS[table]
    for (const row of database.prepare(query).all(...parameters)) {
      if (row[key]) records.push({ table, id: String(row[key]) })
    }
  }
  const entityIds = [ids.inventoryPublicId, ids.kioskOrderId, ...ids.reservationIds].filter(Boolean)

  addRows("inventory_items", "SELECT public_id FROM inventory_items WHERE public_id = ?", [ids.inventoryPublicId])
  addRows("trade_in_orders", "SELECT order_id FROM trade_in_orders WHERE order_id = ?", [ids.tradeOrderId])
  addRows("kiosk_orders", "SELECT order_id FROM kiosk_orders WHERE order_id = ?", [ids.kioskOrderId])
  for (const id of ids.reservationIds) {
    addRows("inventory_reservations", "SELECT reservation_id FROM inventory_reservations WHERE reservation_id = ?", [id])
  }
  addRows("inventory_ledger_entries", "SELECT ledger_id FROM inventory_ledger_entries WHERE inventory_public_id = ?", [ids.inventoryPublicId])
  addRows("sync_outbox_events", "SELECT event_id FROM sync_outbox_events WHERE aggregate_id = ?", [ids.inventoryPublicId])
  addRows("sync_outbox_deliveries", "SELECT delivery_id FROM sync_outbox_deliveries WHERE event_id IN (SELECT event_id FROM sync_outbox_events WHERE aggregate_id = ?)", [ids.inventoryPublicId])
  for (const id of entityIds) {
    addRows("operation_queue", "SELECT operation_id FROM operation_queue WHERE entity_id = ?", [id])
  }
  addRows("price_observations", "SELECT observation_id FROM price_observations WHERE observation_id = ?", [ids.observationId])
  addRows("price_decisions", "SELECT decision_id FROM price_decisions WHERE decision_id = ?", [ids.decisionId])
  if (ids.reviewId) {
    addRows("price_review_items", "SELECT review_id FROM price_review_items WHERE review_id = ?", [ids.reviewId])
  } else if (ids.decisionId) {
    addRows("price_review_items", "SELECT review_id FROM price_review_items WHERE decision_id = ?", [ids.decisionId])
  }

  return [...new Map(records.map((record) => [`${record.table}:${record.id}`, record])).values()]
}

function removeOwnedInventoryLocation(database, names) {
  if (!tableExists(database, "server_settings") || names.length === 0) return
  const row = database.prepare("SELECT setting_value_json FROM server_settings WHERE setting_key = 'inventory_locations'").get()
  if (!row) return
  const current = safeJsonParse(row.setting_value_json, [])
  const owned = new Set(names.map((name) => String(name).trim().toLowerCase()))
  const next = current.filter((entry) => !owned.has(String(entry?.name ?? entry).trim().toLowerCase()))
  if (next.length === current.length) return
  if (next.length === 0) {
    database.prepare("DELETE FROM server_settings WHERE setting_key = 'inventory_locations'").run()
  } else {
    database.prepare("UPDATE server_settings SET setting_value_json = ?, updated_at_utc = ? WHERE setting_key = 'inventory_locations'")
      .run(JSON.stringify(next), new Date().toISOString())
  }
}

function assertDomainResult(result, label) {
  if (result?.status !== "ok") {
    throw new Error(`${label} failed: ${result?.code || result?.message || "unknown_error"}`)
  }
}

function assertManifestMatchesDatabase(manifest, context) {
  if (manifest.fixture_suite !== FIXTURE_SUITE_ID) {
    throw new Error("The manifest belongs to a different fixture suite.")
  }
  if (manifest.database_path_fingerprint !== context.databaseFingerprint) {
    throw new Error("The manifest belongs to a different SQLite database path.")
  }
}

function databaseFingerprint(databasePath) {
  return createHash("sha256").update(resolve(databasePath).toLowerCase()).digest("hex")
}

function tableExists(database, table) {
  return Boolean(database.prepare("SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ?").get(table))
}

function inventoryLocationExists(databasePath, expectedName) {
  if (!existsSync(databasePath)) return false
  const database = new DatabaseSync(databasePath, { readOnly: true })
  try {
    if (!tableExists(database, "server_settings")) return false
    const row = database.prepare("SELECT setting_value_json FROM server_settings WHERE setting_key = 'inventory_locations'").get()
    const expected = String(expectedName).trim().toLowerCase()
    return safeJsonParse(row?.setting_value_json, []).some(
      (entry) => String(entry?.name ?? entry).trim().toLowerCase() === expected,
    )
  } finally {
    database.close()
  }
}

function isClearlyNonProductionUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase()
    return host === "localhost" || host === "127.0.0.1" || host === "::1" ||
      host.endsWith(".test") || host.endsWith(".local") || host.endsWith(".invalid") ||
      host.includes("staging") || host.includes("sandbox") || host.includes("test")
  } catch {
    return false
  }
}

function readManifestIfPresent(path) {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeManifestAtomic(path, manifest) {
  mkdirSync(dirname(path), { recursive: true })
  const temporaryPath = `${path}.${process.pid}.tmp`
  writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
  renameSync(temporaryPath, path)
}

function archiveManifest(path, manifest) {
  const stamp = String(manifest.cleaned_at_utc ?? new Date().toISOString()).replace(/[:.]/g, "-")
  renameSync(path, `${path}.cleaned-${stamp}.json`)
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(String(value ?? ""))
  } catch {
    return fallback
  }
}
