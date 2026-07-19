import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"

import {
  appendInventoryLedgerEntry,
  appendProjectionEvent,
  authoritativeLedgerDiagnostics,
  markOutboxDelivery,
  migrateAuthoritativeLedger,
  recordPriceDecision,
  recordPriceObservation,
  recordProcessedExternalEvent,
  updateProcessedExternalEvent,
  upsertInventoryReservation,
  withImmediateTransaction,
} from "../src/authoritativeLedger.mjs"

let currentTime = new Date("2026-07-18T18:00:00.000Z")
const now = () => currentTime
const database = new DatabaseSync(":memory:")
database.exec("PRAGMA foreign_keys = ON")

function schemaObjectNames(targetDatabase) {
  return targetDatabase.prepare(`
    SELECT type, name
    FROM sqlite_master
    WHERE type IN ('table', 'index')
      AND name NOT LIKE 'sqlite_%'
    ORDER BY type, name
  `).all().map((row) => `${row.type}:${row.name}`)
}

try {
  const firstMigration = migrateAuthoritativeLedger(database, now)
  const repeatedMigration = migrateAuthoritativeLedger(database, now)
  assert.equal(firstMigration.schema_version, 2)
  assert.equal(repeatedMigration.schema_version, 2)
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count, 2)

  const firstLedger = appendInventoryLedgerEntry(database, {
    idempotency_key: "intake:inventory-100:1",
    inventory_public_id: "inventory-100",
    mutation_type: "inventory_intake",
    source_channel: "employee_app",
    quantity_before: 0,
    quantity_after: 1,
    status_before: "",
    status_after: "pending_intake",
    price_after_minor_units: 1200,
    actor_user_id: "staff-1",
    actor_user_name: "Test Staff",
  }, now)
  const duplicateLedger = appendInventoryLedgerEntry(database, {
    idempotency_key: "intake:inventory-100:1",
    inventory_public_id: "inventory-100",
    mutation_type: "inventory_intake",
    source_channel: "employee_app",
    quantity_before: 0,
    quantity_after: 99,
  }, now)
  assert.equal(firstLedger.created, true)
  assert.equal(duplicateLedger.created, false)
  assert.equal(duplicateLedger.entry.quantity_after, 1)
  assert.equal(firstLedger.entry.available_quantity_before, 0)
  assert.equal(firstLedger.entry.available_quantity_after, 1)

  const reservationLedger = appendInventoryLedgerEntry(database, {
    idempotency_key: "reservation:inventory-100:1",
    inventory_public_id: "inventory-100",
    mutation_type: "inventory_reservation",
    source_channel: "kiosk",
    quantity_before: 1,
    quantity_after: 1,
    status_before: "available",
    status_after: "reserved",
  }, now)
  assert.equal(reservationLedger.entry.reserved_quantity_before, 0)
  assert.equal(reservationLedger.entry.reserved_quantity_after, 1)
  assert.equal(reservationLedger.entry.available_quantity_before, 1)
  assert.equal(reservationLedger.entry.available_quantity_after, 0)

  assert.throws(() => withImmediateTransaction(database, () => {
    appendInventoryLedgerEntry(database, {
      idempotency_key: "rollback:inventory-100:2",
      inventory_public_id: "inventory-100",
      mutation_type: "inventory_update",
      source_channel: "employee_app",
      quantity_before: 1,
      quantity_after: 2,
    }, now)
    throw new Error("force rollback")
  }), /force rollback/)
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM inventory_ledger_entries WHERE idempotency_key = ?")
      .get("rollback:inventory-100:2").count,
    0,
  )

  const outbox = withImmediateTransaction(database, () => appendProjectionEvent(database, {
    idempotency_key: "intake:inventory-100:1",
    aggregate_type: "inventory",
    aggregate_id: "inventory-100",
    event_type: "inventory_intake",
    destinations: ["wordpress", "square", "kiosk", "square"],
    max_attempts: 2,
    payload: { quantity_on_hand: 1, price_minor_units: 1200 },
  }, now))
  const duplicateOutbox = appendProjectionEvent(database, {
    idempotency_key: "intake:inventory-100:1",
    aggregate_type: "inventory",
    aggregate_id: "inventory-100",
    event_type: "inventory_intake",
    destinations: ["wordpress"],
  }, now)
  assert.equal(outbox.created, true)
  assert.equal(outbox.deliveries.length, 3)
  assert.equal(duplicateOutbox.created, false)

  markOutboxDelivery(database, {
    event_id: outbox.event.event_id,
    destination: "kiosk",
    status: "verified",
    increment_attempt: false,
    readback: { quantity_on_hand: 1 },
  }, now)
  markOutboxDelivery(database, {
    event_id: outbox.event.event_id,
    destination: "wordpress",
    status: "delivered_unverified",
    http_status: 200,
    response: { code: "ok" },
  }, now)
  const firstSquareRetry = markOutboxDelivery(database, {
    event_id: outbox.event.event_id,
    destination: "square",
    status: "retry",
    http_status: 503,
    error_code: "square_unavailable",
  }, now)
  assert.equal(firstSquareRetry.status, "retry")
  currentTime = new Date("2026-07-18T18:01:00.000Z")
  const deadLetter = markOutboxDelivery(database, {
    event_id: outbox.event.event_id,
    destination: "square",
    status: "retry",
    http_status: 503,
    error_code: "square_unavailable",
  }, now)
  assert.equal(deadLetter.status, "dead_letter")

  const reservation = upsertInventoryReservation(database, {
    idempotency_key: "kiosk-order-1:inventory-100",
    reservation_id: "reservation-1",
    inventory_public_id: "inventory-100",
    source_channel: "kiosk",
    external_reference: "kiosk-order-1",
    quantity: 1,
    expires_at_utc: "2026-07-18T18:15:00.000Z",
  }, now)
  const repeatedReservation = upsertInventoryReservation(database, {
    idempotency_key: "kiosk-order-1:inventory-100",
    inventory_public_id: "inventory-100",
    source_channel: "kiosk",
    quantity: 2,
  }, now)
  assert.equal(reservation.created, true)
  assert.equal(repeatedReservation.created, false)
  assert.equal(repeatedReservation.reservation.quantity, 1)

  const webhook = recordProcessedExternalEvent(database, {
    provider: "square",
    external_event_id: "square-event-1",
    event_type: "inventory.count.updated",
    payload_sha256: "abc123",
  }, now)
  const replay = recordProcessedExternalEvent(database, {
    provider: "square",
    external_event_id: "square-event-1",
    event_type: "inventory.count.updated",
    payload_sha256: "abc123",
  }, now)
  assert.equal(webhook.duplicate, false)
  assert.equal(replay.duplicate, true)
  assert.equal(replay.event.duplicate_count, 1)
  const completedWebhook = updateProcessedExternalEvent(database, {
    provider: "square",
    external_event_id: "square-event-1",
    processing_status: "completed",
    result_reference: "inventory-ledger-1",
  }, now)
  assert.equal(completedWebhook.processing_status, "completed")
  assert.equal(completedWebhook.result_reference, "inventory-ledger-1")

  const observation = recordPriceObservation(database, {
    idempotency_key: "scrydex:variant-1:NM:20260718",
    inventory_public_id: "inventory-100",
    provider_card_id: "card-1",
    provider_variant_id: "variant-1",
    condition_code: "NM",
    source_provider: "scrydex",
    source_currency: "JPY",
    source_amount_minor_units: 150000,
    fx_provider: "test-fx",
    fx_rate: "0.0067",
    converted_usd_minor_units: 1005,
  }, now)
  const decision = recordPriceDecision(database, {
    idempotency_key: "price-decision:inventory-100:20260718",
    inventory_public_id: "inventory-100",
    observation_id: observation.observation.observation_id,
    current_price_minor_units: 1200,
    candidate_price_minor_units: 1500,
    effective_floor_minor_units: 1000,
    percent_change_basis_points: 2500,
    decision_status: "review_required",
    reason_code: "change_over_threshold",
  }, now)
  assert.equal(decision.created, true)
  assert.equal(decision.review.review_status, "pending")

  const diagnostics = authoritativeLedgerDiagnostics(database)
  assert.equal(diagnostics.inventory_ledger_entry_count, 2)
  assert.equal(diagnostics.active_reservation_count, 1)
  assert.equal(diagnostics.outbox_event_count, 1)
  assert.equal(diagnostics.outbox_dead_letter_count, 1)
  assert.equal(diagnostics.outbox_verified_delivery_count, 1)
  assert.equal(diagnostics.processed_external_event_count, 1)
  assert.equal(diagnostics.price_observation_count, 1)
  assert.equal(diagnostics.price_review_pending_count, 1)

  const v1Database = new DatabaseSync(":memory:")
  try {
    v1Database.exec(`
      CREATE TABLE schema_migrations (
        migration_key TEXT PRIMARY KEY,
        schema_version INTEGER NOT NULL,
        applied_at_utc TEXT NOT NULL,
        rollback_supported INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE inventory_ledger_entries (
        ledger_id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        inventory_public_id TEXT NOT NULL,
        mutation_type TEXT NOT NULL,
        source_channel TEXT NOT NULL,
        reference_type TEXT NOT NULL DEFAULT '',
        reference_id TEXT NOT NULL DEFAULT '',
        quantity_before INTEGER NOT NULL,
        quantity_delta INTEGER NOT NULL,
        quantity_after INTEGER NOT NULL,
        status_before TEXT NOT NULL DEFAULT '',
        status_after TEXT NOT NULL DEFAULT '',
        price_before_minor_units INTEGER NOT NULL DEFAULT 0,
        price_after_minor_units INTEGER NOT NULL DEFAULT 0,
        actor_user_id TEXT NOT NULL DEFAULT '',
        actor_user_name TEXT NOT NULL DEFAULT '',
        reason TEXT NOT NULL DEFAULT '',
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at_utc TEXT NOT NULL
      );
      INSERT INTO schema_migrations VALUES (
        '20260718_authoritative_inventory_sync_v1', 1, '2026-07-18T17:00:00.000Z', 1
      );
      INSERT INTO inventory_ledger_entries VALUES (
        'legacy-ledger', 'legacy-reservation', 'inventory-legacy', 'inventory_reservation',
        'kiosk', '', '', 2, 0, 2, 'available', 'reserved', 100, 100, '', '', '', '{}',
        '2026-07-18T17:00:00.000Z'
      );
    `)
    const migratedV1 = migrateAuthoritativeLedger(v1Database, now)
    assert.equal(migratedV1.schema_version, 2)
    const legacy = v1Database.prepare("SELECT * FROM inventory_ledger_entries WHERE ledger_id = 'legacy-ledger'").get()
    assert.equal(legacy.reserved_quantity_before, 0)
    assert.equal(legacy.reserved_quantity_after, 2)
    assert.equal(legacy.available_quantity_before, 2)
    assert.equal(legacy.available_quantity_after, 0)
    assert.equal(
      v1Database.prepare("SELECT rollback_supported FROM schema_migrations WHERE migration_key = ?")
        .get("20260718_authoritative_inventory_sync_v2").rollback_supported,
      0,
    )
    const v1CompatibleRead = v1Database.prepare(`
      SELECT ledger_id, quantity_before, quantity_after, status_before, status_after
      FROM inventory_ledger_entries WHERE ledger_id = 'legacy-ledger'
    `).get()
    assert.equal(v1CompatibleRead.quantity_after, 2)
  } finally {
    v1Database.close()
  }

  const sqlMigrationDatabase = new DatabaseSync(":memory:")
  try {
    sqlMigrationDatabase.exec("PRAGMA foreign_keys = ON")
    sqlMigrationDatabase.exec(readFileSync(
      new URL("../../../migrations/20260718_authoritative_inventory_sync_up.sql", import.meta.url),
      "utf8",
    ))
    const v2OnlySchemaObjects = new Set([
      "table:sync_outbox_replay_audit",
      "index:sync_outbox_replay_operation_idx",
    ])
    assert.deepEqual(
      schemaObjectNames(sqlMigrationDatabase),
      schemaObjectNames(database).filter((name) => !v2OnlySchemaObjects.has(name)),
    )
    assert.equal(schemaObjectNames(database).includes("table:sync_outbox_replay_audit"), true)
    assert.equal(
      sqlMigrationDatabase.prepare(
        "SELECT COUNT(*) AS count FROM schema_migrations WHERE migration_key = ?",
      ).get("20260718_authoritative_inventory_sync_v1").count,
      1,
    )

    sqlMigrationDatabase.exec(readFileSync(
      new URL("../../../migrations/20260718_authoritative_inventory_sync_down.sql", import.meta.url),
      "utf8",
    ))
    assert.equal(
      sqlMigrationDatabase.prepare(
        "SELECT COUNT(*) AS count FROM schema_migrations WHERE migration_key = ?",
      ).get("20260718_authoritative_inventory_sync_v1").count,
      0,
    )
    assert.equal(
      sqlMigrationDatabase.prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE name = 'inventory_ledger_entries'",
      ).get().count,
      0,
    )
  } finally {
    sqlMigrationDatabase.close()
  }

  console.log("PASS authoritative ledger, outbox, reservation, webhook, price review, and SQL migration parity")
} finally {
  database.close()
}
