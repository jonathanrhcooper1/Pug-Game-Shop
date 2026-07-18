import { randomUUID } from "node:crypto"

export const AUTHORITATIVE_SCHEMA_VERSION = 1
export const AUTHORITATIVE_SCHEMA_MIGRATION = "20260718_authoritative_inventory_sync_v1"

const OUTBOX_DESTINATIONS = new Set(["wordpress", "square", "kiosk"])
const DELIVERY_STATUSES = new Set([
  "pending",
  "processing",
  "delivered_unverified",
  "verified",
  "retry",
  "dead_letter",
  "cancelled",
])

export function migrateAuthoritativeLedger(database, now = () => new Date()) {
  const appliedAtUtc = now().toISOString()

  withImmediateTransaction(database, () => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_key TEXT PRIMARY KEY,
        schema_version INTEGER NOT NULL,
        applied_at_utc TEXT NOT NULL,
        rollback_supported INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS inventory_ledger_entries (
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
      CREATE INDEX IF NOT EXISTS inventory_ledger_inventory_created_idx
        ON inventory_ledger_entries (inventory_public_id, created_at_utc DESC);
      CREATE INDEX IF NOT EXISTS inventory_ledger_reference_idx
        ON inventory_ledger_entries (reference_type, reference_id);

      CREATE TABLE IF NOT EXISTS inventory_reservations (
        reservation_id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        inventory_public_id TEXT NOT NULL,
        source_channel TEXT NOT NULL,
        external_reference TEXT NOT NULL DEFAULT '',
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        status TEXT NOT NULL CHECK (status IN ('active', 'released', 'expired', 'converted', 'cancelled')),
        expires_at_utc TEXT,
        actor_user_id TEXT NOT NULL DEFAULT '',
        actor_user_name TEXT NOT NULL DEFAULT '',
        reason TEXT NOT NULL DEFAULT '',
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at_utc TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL,
        released_at_utc TEXT
      );
      CREATE INDEX IF NOT EXISTS inventory_reservations_active_idx
        ON inventory_reservations (inventory_public_id, status, expires_at_utc);
      CREATE INDEX IF NOT EXISTS inventory_reservations_reference_idx
        ON inventory_reservations (source_channel, external_reference);

      CREATE TABLE IF NOT EXISTS sync_outbox_events (
        event_id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_version INTEGER NOT NULL DEFAULT 1,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at_utc TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sync_outbox_events_pending_idx
        ON sync_outbox_events (status, created_at_utc);
      CREATE INDEX IF NOT EXISTS sync_outbox_events_aggregate_idx
        ON sync_outbox_events (aggregate_type, aggregate_id, created_at_utc DESC);

      CREATE TABLE IF NOT EXISTS sync_outbox_deliveries (
        delivery_id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES sync_outbox_events(event_id) ON DELETE CASCADE,
        destination TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 12,
        next_attempt_at_utc TEXT,
        last_attempt_at_utc TEXT,
        verified_at_utc TEXT,
        last_http_status INTEGER NOT NULL DEFAULT 0,
        last_error_code TEXT NOT NULL DEFAULT '',
        last_error_message TEXT NOT NULL DEFAULT '',
        response_json TEXT NOT NULL DEFAULT '{}',
        readback_json TEXT NOT NULL DEFAULT '{}',
        created_at_utc TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL,
        UNIQUE (event_id, destination)
      );
      CREATE INDEX IF NOT EXISTS sync_outbox_deliveries_ready_idx
        ON sync_outbox_deliveries (status, next_attempt_at_utc, created_at_utc);
      CREATE INDEX IF NOT EXISTS sync_outbox_deliveries_destination_idx
        ON sync_outbox_deliveries (destination, status, created_at_utc);

      CREATE TABLE IF NOT EXISTS processed_external_events (
        provider TEXT NOT NULL,
        external_event_id TEXT NOT NULL,
        event_type TEXT NOT NULL DEFAULT '',
        payload_sha256 TEXT NOT NULL DEFAULT '',
        processing_status TEXT NOT NULL DEFAULT 'processed',
        result_reference TEXT NOT NULL DEFAULT '',
        first_seen_at_utc TEXT NOT NULL,
        last_seen_at_utc TEXT NOT NULL,
        duplicate_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (provider, external_event_id)
      );

      CREATE TABLE IF NOT EXISTS price_observations (
        observation_id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        inventory_public_id TEXT NOT NULL DEFAULT '',
        provider_card_id TEXT NOT NULL DEFAULT '',
        provider_variant_id TEXT NOT NULL DEFAULT '',
        condition_code TEXT NOT NULL DEFAULT '',
        grading_company TEXT NOT NULL DEFAULT '',
        grade TEXT NOT NULL DEFAULT '',
        source_provider TEXT NOT NULL,
        source_currency TEXT NOT NULL,
        source_amount_minor_units INTEGER NOT NULL,
        fx_provider TEXT NOT NULL DEFAULT '',
        fx_rate TEXT NOT NULL DEFAULT '',
        converted_usd_minor_units INTEGER NOT NULL,
        observed_at_utc TEXT NOT NULL,
        fetched_at_utc TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS price_observations_variant_idx
        ON price_observations (provider_card_id, provider_variant_id, condition_code, observed_at_utc DESC);

      CREATE TABLE IF NOT EXISTS price_decisions (
        decision_id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        inventory_public_id TEXT NOT NULL,
        observation_id TEXT REFERENCES price_observations(observation_id),
        current_price_minor_units INTEGER NOT NULL,
        candidate_price_minor_units INTEGER NOT NULL,
        effective_floor_minor_units INTEGER NOT NULL,
        percent_change_basis_points INTEGER NOT NULL DEFAULT 0,
        decision_status TEXT NOT NULL CHECK (decision_status IN ('automatic', 'review_required', 'approved', 'rejected', 'published', 'failed')),
        reason_code TEXT NOT NULL DEFAULT '',
        actor_user_id TEXT NOT NULL DEFAULT '',
        actor_user_name TEXT NOT NULL DEFAULT '',
        decided_at_utc TEXT,
        created_at_utc TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS price_decisions_inventory_idx
        ON price_decisions (inventory_public_id, created_at_utc DESC);
      CREATE INDEX IF NOT EXISTS price_decisions_review_idx
        ON price_decisions (decision_status, created_at_utc);

      CREATE TABLE IF NOT EXISTS price_review_items (
        review_id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL UNIQUE REFERENCES price_decisions(decision_id) ON DELETE CASCADE,
        review_status TEXT NOT NULL CHECK (review_status IN ('pending', 'approved', 'rejected', 'cancelled')),
        review_reason TEXT NOT NULL,
        assigned_role TEXT NOT NULL DEFAULT 'manager',
        reviewed_by_user_id TEXT NOT NULL DEFAULT '',
        reviewed_by_user_name TEXT NOT NULL DEFAULT '',
        reviewed_at_utc TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at_utc TEXT NOT NULL,
        updated_at_utc TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS price_review_status_idx
        ON price_review_items (review_status, created_at_utc);
    `)

    database.prepare(`
      INSERT INTO schema_migrations (
        migration_key, schema_version, applied_at_utc, rollback_supported
      ) VALUES (?, ?, ?, 1)
      ON CONFLICT(migration_key) DO NOTHING
    `).run(AUTHORITATIVE_SCHEMA_MIGRATION, AUTHORITATIVE_SCHEMA_VERSION, appliedAtUtc)
  })

  return authoritativeLedgerDiagnostics(database)
}

export function withImmediateTransaction(database, action) {
  if (database.isTransaction) {
    return action()
  }

  database.exec("BEGIN IMMEDIATE")

  try {
    const result = action()
    database.exec("COMMIT")
    return result
  } catch (error) {
    database.exec("ROLLBACK")
    throw error
  }
}

export function appendInventoryLedgerEntry(database, input, now = () => new Date()) {
  const idempotencyKey = cleanRequired(input.idempotency_key ?? input.idempotencyKey, "idempotency_key")
  const existing = database.prepare(
    "SELECT * FROM inventory_ledger_entries WHERE idempotency_key = ?",
  ).get(idempotencyKey)

  if (existing) {
    return { created: false, entry: publicInventoryLedgerEntry(existing) }
  }

  const quantityBefore = nonNegativeInt(input.quantity_before ?? input.quantityBefore)
  const quantityAfter = nonNegativeInt(input.quantity_after ?? input.quantityAfter)
  const quantityDelta = integer(input.quantity_delta ?? input.quantityDelta, quantityAfter - quantityBefore)
  const createdAtUtc = cleanTimestamp(input.created_at_utc ?? input.createdAtUtc) || now().toISOString()
  const ledgerId = cleanText(input.ledger_id ?? input.ledgerId) || `inv-ledger-${randomUUID()}`
  const values = {
    ledger_id: ledgerId,
    idempotency_key: idempotencyKey,
    inventory_public_id: cleanRequired(input.inventory_public_id ?? input.inventoryPublicId, "inventory_public_id"),
    mutation_type: cleanRequired(input.mutation_type ?? input.mutationType, "mutation_type"),
    source_channel: cleanRequired(input.source_channel ?? input.sourceChannel, "source_channel"),
    reference_type: cleanText(input.reference_type ?? input.referenceType),
    reference_id: cleanText(input.reference_id ?? input.referenceId),
    quantity_before: quantityBefore,
    quantity_delta: quantityDelta,
    quantity_after: quantityAfter,
    status_before: cleanText(input.status_before ?? input.statusBefore),
    status_after: cleanText(input.status_after ?? input.statusAfter),
    price_before_minor_units: nonNegativeInt(input.price_before_minor_units ?? input.priceBeforeMinorUnits),
    price_after_minor_units: nonNegativeInt(input.price_after_minor_units ?? input.priceAfterMinorUnits),
    actor_user_id: cleanText(input.actor_user_id ?? input.actorUserId),
    actor_user_name: cleanText(input.actor_user_name ?? input.actorUserName),
    reason: cleanText(input.reason),
    payload_json: safeJson(input.payload),
    created_at_utc: createdAtUtc,
  }

  database.prepare(`
    INSERT INTO inventory_ledger_entries (
      ledger_id, idempotency_key, inventory_public_id, mutation_type, source_channel,
      reference_type, reference_id, quantity_before, quantity_delta, quantity_after,
      status_before, status_after, price_before_minor_units, price_after_minor_units,
      actor_user_id, actor_user_name, reason, payload_json, created_at_utc
    ) VALUES (
      @ledger_id, @idempotency_key, @inventory_public_id, @mutation_type, @source_channel,
      @reference_type, @reference_id, @quantity_before, @quantity_delta, @quantity_after,
      @status_before, @status_after, @price_before_minor_units, @price_after_minor_units,
      @actor_user_id, @actor_user_name, @reason, @payload_json, @created_at_utc
    )
  `).run(values)

  return { created: true, entry: publicInventoryLedgerEntry(values) }
}

export function inventoryLedgerEntryByIdempotency(database, idempotencyKey) {
  const row = database.prepare(
    "SELECT * FROM inventory_ledger_entries WHERE idempotency_key = ?",
  ).get(cleanText(idempotencyKey))
  return row ? publicInventoryLedgerEntry(row) : null
}

export function appendProjectionEvent(database, input, now = () => new Date()) {
  const idempotencyKey = cleanRequired(input.idempotency_key ?? input.idempotencyKey, "idempotency_key")
  const existing = database.prepare("SELECT * FROM sync_outbox_events WHERE idempotency_key = ?").get(idempotencyKey)

  if (existing) {
    return {
      created: false,
      event: publicOutboxEvent(existing),
      deliveries: outboxDeliveriesForEvent(database, existing.event_id),
    }
  }

  const createdAtUtc = cleanTimestamp(input.created_at_utc ?? input.createdAtUtc) || now().toISOString()
  const eventId = cleanText(input.event_id ?? input.eventId) || `outbox-${randomUUID()}`
  const destinations = [...new Set((input.destinations ?? []).map(cleanDestination).filter(Boolean))]

  if (destinations.length === 0) {
    throw new Error("At least one supported outbox destination is required.")
  }

  const event = {
    event_id: eventId,
    idempotency_key: idempotencyKey,
    aggregate_type: cleanRequired(input.aggregate_type ?? input.aggregateType, "aggregate_type"),
    aggregate_id: cleanRequired(input.aggregate_id ?? input.aggregateId, "aggregate_id"),
    event_type: cleanRequired(input.event_type ?? input.eventType, "event_type"),
    event_version: positiveInt(input.event_version ?? input.eventVersion, 1),
    payload_json: safeJson(input.payload),
    status: "pending",
    created_at_utc: createdAtUtc,
    updated_at_utc: createdAtUtc,
  }

  database.prepare(`
    INSERT INTO sync_outbox_events (
      event_id, idempotency_key, aggregate_type, aggregate_id, event_type,
      event_version, payload_json, status, created_at_utc, updated_at_utc
    ) VALUES (
      @event_id, @idempotency_key, @aggregate_type, @aggregate_id, @event_type,
      @event_version, @payload_json, @status, @created_at_utc, @updated_at_utc
    )
  `).run(event)

  const insertDelivery = database.prepare(`
    INSERT INTO sync_outbox_deliveries (
      delivery_id, event_id, destination, status, attempt_count, max_attempts,
      next_attempt_at_utc, created_at_utc, updated_at_utc
    ) VALUES (?, ?, ?, 'pending', 0, ?, ?, ?, ?)
  `)

  for (const destination of destinations) {
    insertDelivery.run(
      `delivery-${randomUUID()}`,
      eventId,
      destination,
      positiveInt(input.max_attempts ?? input.maxAttempts, 12),
      createdAtUtc,
      createdAtUtc,
      createdAtUtc,
    )
  }

  return {
    created: true,
    event: publicOutboxEvent(event),
    deliveries: outboxDeliveriesForEvent(database, eventId),
  }
}

export function markOutboxDelivery(database, input, now = () => new Date()) {
  const eventId = cleanRequired(input.event_id ?? input.eventId, "event_id")
  const destination = cleanDestination(input.destination)
  const status = cleanDeliveryStatus(input.status)
  const delivery = database.prepare(
    "SELECT * FROM sync_outbox_deliveries WHERE event_id = ? AND destination = ?",
  ).get(eventId, destination)

  if (!delivery) {
    throw new Error(`Outbox delivery ${eventId}/${destination} was not found.`)
  }

  const updatedAtUtc = now().toISOString()
  const attemptCount = delivery.attempt_count + (input.increment_attempt === false ? 0 : 1)
  const maxAttempts = positiveInt(delivery.max_attempts, 12)
  const terminalStatus = status === "retry" && attemptCount >= maxAttempts ? "dead_letter" : status
  const backoffSeconds = Math.min(3600, Math.max(5, 5 * 2 ** Math.min(attemptCount, 9)))
  const nextAttemptAtUtc = terminalStatus === "retry"
    ? new Date(now().getTime() + backoffSeconds * 1000).toISOString()
    : null

  database.prepare(`
    UPDATE sync_outbox_deliveries
    SET status = ?, attempt_count = ?, next_attempt_at_utc = ?, last_attempt_at_utc = ?,
        verified_at_utc = ?, last_http_status = ?, last_error_code = ?, last_error_message = ?,
        response_json = ?, readback_json = ?, updated_at_utc = ?
    WHERE delivery_id = ?
  `).run(
    terminalStatus,
    attemptCount,
    nextAttemptAtUtc,
    updatedAtUtc,
    terminalStatus === "verified" ? updatedAtUtc : delivery.verified_at_utc,
    nonNegativeInt(input.http_status ?? input.httpStatus),
    cleanText(input.error_code ?? input.errorCode),
    cleanText(input.error_message ?? input.errorMessage),
    safeJson(input.response),
    safeJson(input.readback),
    updatedAtUtc,
    delivery.delivery_id,
  )

  refreshOutboxEventStatus(database, eventId, updatedAtUtc)
  return outboxDeliveriesForEvent(database, eventId).find((row) => row.destination === destination)
}

export function outboxEventByIdempotency(database, idempotencyKey) {
  const event = database.prepare("SELECT * FROM sync_outbox_events WHERE idempotency_key = ?")
    .get(cleanText(idempotencyKey))

  if (!event) {
    return null
  }

  return {
    event: publicOutboxEvent(event),
    deliveries: outboxDeliveriesForEvent(database, event.event_id),
  }
}

export function upsertInventoryReservation(database, input, now = () => new Date()) {
  const idempotencyKey = cleanRequired(input.idempotency_key ?? input.idempotencyKey, "idempotency_key")
  const existing = database.prepare(
    "SELECT * FROM inventory_reservations WHERE idempotency_key = ?",
  ).get(idempotencyKey)

  if (existing) {
    return { created: false, reservation: publicReservation(existing) }
  }

  const createdAtUtc = now().toISOString()
  const reservation = {
    reservation_id: cleanText(input.reservation_id ?? input.reservationId) || `reservation-${randomUUID()}`,
    idempotency_key: idempotencyKey,
    inventory_public_id: cleanRequired(input.inventory_public_id ?? input.inventoryPublicId, "inventory_public_id"),
    source_channel: cleanRequired(input.source_channel ?? input.sourceChannel, "source_channel"),
    external_reference: cleanText(input.external_reference ?? input.externalReference),
    quantity: positiveInt(input.quantity, 1),
    status: cleanReservationStatus(input.status ?? "active"),
    expires_at_utc: cleanTimestamp(input.expires_at_utc ?? input.expiresAtUtc) || null,
    actor_user_id: cleanText(input.actor_user_id ?? input.actorUserId),
    actor_user_name: cleanText(input.actor_user_name ?? input.actorUserName),
    reason: cleanText(input.reason),
    payload_json: safeJson(input.payload),
    created_at_utc: createdAtUtc,
    updated_at_utc: createdAtUtc,
  }

  database.prepare(`
    INSERT INTO inventory_reservations (
      reservation_id, idempotency_key, inventory_public_id, source_channel,
      external_reference, quantity, status, expires_at_utc, actor_user_id,
      actor_user_name, reason, payload_json, created_at_utc, updated_at_utc
    ) VALUES (
      @reservation_id, @idempotency_key, @inventory_public_id, @source_channel,
      @external_reference, @quantity, @status, @expires_at_utc, @actor_user_id,
      @actor_user_name, @reason, @payload_json, @created_at_utc, @updated_at_utc
    )
  `).run(reservation)

  return { created: true, reservation: publicReservation(reservation) }
}

export function transitionInventoryReservation(database, input, now = () => new Date()) {
  const reservationId = cleanRequired(input.reservation_id ?? input.reservationId, "reservation_id")
  const status = cleanReservationStatus(input.status)
  const current = database.prepare("SELECT * FROM inventory_reservations WHERE reservation_id = ?").get(reservationId)

  if (!current) {
    return null
  }

  const updatedAtUtc = now().toISOString()
  database.prepare(`
    UPDATE inventory_reservations
    SET status = ?, reason = ?, updated_at_utc = ?, released_at_utc = ?
    WHERE reservation_id = ?
  `).run(
    status,
    cleanText(input.reason) || current.reason,
    updatedAtUtc,
    status === "active" ? null : updatedAtUtc,
    reservationId,
  )

  return publicReservation(
    database.prepare("SELECT * FROM inventory_reservations WHERE reservation_id = ?").get(reservationId),
  )
}

export function recordProcessedExternalEvent(database, input, now = () => new Date()) {
  const provider = cleanRequired(input.provider, "provider").toLowerCase()
  const externalEventId = cleanRequired(input.external_event_id ?? input.externalEventId, "external_event_id")
  const seenAtUtc = now().toISOString()
  const existing = database.prepare(`
    SELECT * FROM processed_external_events WHERE provider = ? AND external_event_id = ?
  `).get(provider, externalEventId)

  if (existing) {
    database.prepare(`
      UPDATE processed_external_events
      SET last_seen_at_utc = ?, duplicate_count = duplicate_count + 1
      WHERE provider = ? AND external_event_id = ?
    `).run(seenAtUtc, provider, externalEventId)

    return { duplicate: true, event: publicProcessedExternalEvent({ ...existing, last_seen_at_utc: seenAtUtc, duplicate_count: existing.duplicate_count + 1 }) }
  }

  const event = {
    provider,
    external_event_id: externalEventId,
    event_type: cleanText(input.event_type ?? input.eventType),
    payload_sha256: cleanText(input.payload_sha256 ?? input.payloadSha256),
    processing_status: cleanText(input.processing_status ?? input.processingStatus) || "processed",
    result_reference: cleanText(input.result_reference ?? input.resultReference),
    first_seen_at_utc: seenAtUtc,
    last_seen_at_utc: seenAtUtc,
    duplicate_count: 0,
  }

  database.prepare(`
    INSERT INTO processed_external_events (
      provider, external_event_id, event_type, payload_sha256, processing_status,
      result_reference, first_seen_at_utc, last_seen_at_utc, duplicate_count
    ) VALUES (
      @provider, @external_event_id, @event_type, @payload_sha256, @processing_status,
      @result_reference, @first_seen_at_utc, @last_seen_at_utc, @duplicate_count
    )
  `).run(event)

  return { duplicate: false, event: publicProcessedExternalEvent(event) }
}

export function updateProcessedExternalEvent(database, input, now = () => new Date()) {
  const provider = cleanRequired(input.provider, "provider").toLowerCase()
  const externalEventId = cleanRequired(input.external_event_id ?? input.externalEventId, "external_event_id")
  const processingStatus = cleanRequired(input.processing_status ?? input.processingStatus, "processing_status")
  const updatedAtUtc = now().toISOString()

  database.prepare(`
    UPDATE processed_external_events
    SET processing_status = ?, result_reference = ?, last_seen_at_utc = ?
    WHERE provider = ? AND external_event_id = ?
  `).run(
    processingStatus,
    cleanText(input.result_reference ?? input.resultReference),
    updatedAtUtc,
    provider,
    externalEventId,
  )

  const event = database.prepare(`
    SELECT * FROM processed_external_events WHERE provider = ? AND external_event_id = ?
  `).get(provider, externalEventId)

  return event ? publicProcessedExternalEvent(event) : null
}

export function recordPriceObservation(database, input, now = () => new Date()) {
  const idempotencyKey = cleanRequired(input.idempotency_key ?? input.idempotencyKey, "idempotency_key")
  const existing = database.prepare("SELECT * FROM price_observations WHERE idempotency_key = ?").get(idempotencyKey)

  if (existing) {
    return { created: false, observation: publicPriceObservation(existing) }
  }

  const fetchedAtUtc = cleanTimestamp(input.fetched_at_utc ?? input.fetchedAtUtc) || now().toISOString()
  const observation = {
    observation_id: cleanText(input.observation_id ?? input.observationId) || `price-observation-${randomUUID()}`,
    idempotency_key: idempotencyKey,
    inventory_public_id: cleanText(input.inventory_public_id ?? input.inventoryPublicId),
    provider_card_id: cleanText(input.provider_card_id ?? input.providerCardId),
    provider_variant_id: cleanText(input.provider_variant_id ?? input.providerVariantId),
    condition_code: cleanText(input.condition_code ?? input.conditionCode).toUpperCase(),
    grading_company: cleanText(input.grading_company ?? input.gradingCompany),
    grade: cleanText(input.grade),
    source_provider: cleanRequired(input.source_provider ?? input.sourceProvider, "source_provider"),
    source_currency: cleanRequired(input.source_currency ?? input.sourceCurrency, "source_currency").toUpperCase(),
    source_amount_minor_units: nonNegativeInt(input.source_amount_minor_units ?? input.sourceAmountMinorUnits),
    fx_provider: cleanText(input.fx_provider ?? input.fxProvider),
    fx_rate: cleanText(input.fx_rate ?? input.fxRate),
    converted_usd_minor_units: nonNegativeInt(input.converted_usd_minor_units ?? input.convertedUsdMinorUnits),
    observed_at_utc: cleanTimestamp(input.observed_at_utc ?? input.observedAtUtc) || fetchedAtUtc,
    fetched_at_utc: fetchedAtUtc,
    payload_json: safeJson(input.payload),
  }

  database.prepare(`
    INSERT INTO price_observations (
      observation_id, idempotency_key, inventory_public_id, provider_card_id,
      provider_variant_id, condition_code, grading_company, grade, source_provider,
      source_currency, source_amount_minor_units, fx_provider, fx_rate,
      converted_usd_minor_units, observed_at_utc, fetched_at_utc, payload_json
    ) VALUES (
      @observation_id, @idempotency_key, @inventory_public_id, @provider_card_id,
      @provider_variant_id, @condition_code, @grading_company, @grade, @source_provider,
      @source_currency, @source_amount_minor_units, @fx_provider, @fx_rate,
      @converted_usd_minor_units, @observed_at_utc, @fetched_at_utc, @payload_json
    )
  `).run(observation)

  return { created: true, observation: publicPriceObservation(observation) }
}

export function recordPriceDecision(database, input, now = () => new Date()) {
  const idempotencyKey = cleanRequired(input.idempotency_key ?? input.idempotencyKey, "idempotency_key")
  const existing = database.prepare("SELECT * FROM price_decisions WHERE idempotency_key = ?").get(idempotencyKey)

  if (existing) {
    return { created: false, decision: publicPriceDecision(existing), review: priceReviewForDecision(database, existing.decision_id) }
  }

  const createdAtUtc = now().toISOString()
  const decisionStatus = cleanDecisionStatus(input.decision_status ?? input.decisionStatus)
  const decision = {
    decision_id: cleanText(input.decision_id ?? input.decisionId) || `price-decision-${randomUUID()}`,
    idempotency_key: idempotencyKey,
    inventory_public_id: cleanRequired(input.inventory_public_id ?? input.inventoryPublicId, "inventory_public_id"),
    observation_id: cleanText(input.observation_id ?? input.observationId) || null,
    current_price_minor_units: nonNegativeInt(input.current_price_minor_units ?? input.currentPriceMinorUnits),
    candidate_price_minor_units: nonNegativeInt(input.candidate_price_minor_units ?? input.candidatePriceMinorUnits),
    effective_floor_minor_units: nonNegativeInt(input.effective_floor_minor_units ?? input.effectiveFloorMinorUnits),
    percent_change_basis_points: integer(input.percent_change_basis_points ?? input.percentChangeBasisPoints, 0),
    decision_status: decisionStatus,
    reason_code: cleanText(input.reason_code ?? input.reasonCode),
    actor_user_id: cleanText(input.actor_user_id ?? input.actorUserId),
    actor_user_name: cleanText(input.actor_user_name ?? input.actorUserName),
    decided_at_utc: ["approved", "rejected", "published"].includes(decisionStatus) ? createdAtUtc : null,
    created_at_utc: createdAtUtc,
    updated_at_utc: createdAtUtc,
  }

  database.prepare(`
    INSERT INTO price_decisions (
      decision_id, idempotency_key, inventory_public_id, observation_id,
      current_price_minor_units, candidate_price_minor_units, effective_floor_minor_units,
      percent_change_basis_points, decision_status, reason_code, actor_user_id,
      actor_user_name, decided_at_utc, created_at_utc, updated_at_utc
    ) VALUES (
      @decision_id, @idempotency_key, @inventory_public_id, @observation_id,
      @current_price_minor_units, @candidate_price_minor_units, @effective_floor_minor_units,
      @percent_change_basis_points, @decision_status, @reason_code, @actor_user_id,
      @actor_user_name, @decided_at_utc, @created_at_utc, @updated_at_utc
    )
  `).run(decision)

  let review = null
  if (decisionStatus === "review_required") {
    const reviewRow = {
      review_id: `price-review-${randomUUID()}`,
      decision_id: decision.decision_id,
      review_status: "pending",
      review_reason: cleanText(input.review_reason ?? input.reviewReason) || decision.reason_code || "price_change_requires_review",
      assigned_role: "manager",
      created_at_utc: createdAtUtc,
      updated_at_utc: createdAtUtc,
    }
    database.prepare(`
      INSERT INTO price_review_items (
        review_id, decision_id, review_status, review_reason, assigned_role,
        created_at_utc, updated_at_utc
      ) VALUES (
        @review_id, @decision_id, @review_status, @review_reason, @assigned_role,
        @created_at_utc, @updated_at_utc
      )
    `).run(reviewRow)
    review = priceReviewForDecision(database, decision.decision_id)
  }

  return { created: true, decision: publicPriceDecision(decision), review }
}

export function listPriceReviewItems(database, input = {}) {
  const status = cleanText(input.status).toLowerCase()
  const limit = Math.min(500, positiveInt(input.limit, 100))
  const rows = database.prepare(`
    SELECT
      r.*,
      d.idempotency_key AS decision_idempotency_key,
      d.inventory_public_id,
      d.observation_id,
      d.current_price_minor_units,
      d.candidate_price_minor_units,
      d.effective_floor_minor_units,
      d.percent_change_basis_points,
      d.decision_status,
      d.reason_code,
      o.provider_card_id,
      o.provider_variant_id,
      o.condition_code,
      o.grading_company,
      o.grade,
      o.source_provider,
      o.source_currency,
      o.source_amount_minor_units,
      o.fx_provider,
      o.fx_rate,
      o.converted_usd_minor_units,
      o.observed_at_utc,
      o.payload_json AS observation_payload_json
    FROM price_review_items r
    JOIN price_decisions d ON d.decision_id = r.decision_id
    LEFT JOIN price_observations o ON o.observation_id = d.observation_id
    WHERE (? = '' OR r.review_status = ?)
    ORDER BY r.created_at_utc DESC
    LIMIT ?
  `).all(status, status, limit)

  return rows.map(publicPriceReview)
}

export function getPriceReviewItem(database, reviewId) {
  return listPriceReviewItems(database, { limit: 500 })
    .find((row) => row.review_id === cleanText(reviewId)) ?? null
}

export function decidePriceReviewItem(database, input, now = () => new Date()) {
  const reviewId = cleanRequired(input.review_id ?? input.reviewId, "review_id")
  const requestedStatus = cleanText(input.review_status ?? input.reviewStatus ?? input.status).toLowerCase()
  if (!["approved", "rejected", "cancelled"].includes(requestedStatus)) {
    throw new Error(`Unsupported price review decision: ${requestedStatus || "empty"}`)
  }

  const current = database.prepare("SELECT * FROM price_review_items WHERE review_id = ?").get(reviewId)
  if (!current) {
    return null
  }
  if (current.review_status !== "pending") {
    return getPriceReviewItem(database, reviewId)
  }

  const reviewedAtUtc = now().toISOString()
  const candidateOverride = input.candidate_price_minor_units ?? input.candidatePriceMinorUnits
  if (candidateOverride !== undefined && candidateOverride !== null && String(candidateOverride).trim() !== "") {
    database.prepare(`
      UPDATE price_decisions SET candidate_price_minor_units = ?, updated_at_utc = ? WHERE decision_id = ?
    `).run(nonNegativeInt(candidateOverride), reviewedAtUtc, current.decision_id)
  }

  database.prepare(`
    UPDATE price_review_items
    SET review_status = ?, reviewed_by_user_id = ?, reviewed_by_user_name = ?,
        reviewed_at_utc = ?, notes = ?, updated_at_utc = ?
    WHERE review_id = ?
  `).run(
    requestedStatus,
    cleanText(input.reviewed_by_user_id ?? input.reviewedByUserId),
    cleanText(input.reviewed_by_user_name ?? input.reviewedByUserName),
    reviewedAtUtc,
    cleanText(input.notes),
    reviewedAtUtc,
    reviewId,
  )
  database.prepare(`
    UPDATE price_decisions
    SET decision_status = ?, actor_user_id = ?, actor_user_name = ?, decided_at_utc = ?, updated_at_utc = ?
    WHERE decision_id = ?
  `).run(
    requestedStatus === "approved" ? "approved" : "rejected",
    cleanText(input.reviewed_by_user_id ?? input.reviewedByUserId),
    cleanText(input.reviewed_by_user_name ?? input.reviewedByUserName),
    reviewedAtUtc,
    reviewedAtUtc,
    current.decision_id,
  )

  return getPriceReviewItem(database, reviewId)
}

export function authoritativeLedgerDiagnostics(database) {
  const scalar = (sql) => Number(database.prepare(sql).get()?.count ?? 0)
  const migration = database.prepare(
    "SELECT * FROM schema_migrations WHERE migration_key = ?",
  ).get(AUTHORITATIVE_SCHEMA_MIGRATION)

  return {
    schema_version: migration?.schema_version ?? 0,
    migration_key: migration?.migration_key ?? "",
    migration_applied_at_utc: migration?.applied_at_utc ?? "",
    inventory_ledger_entry_count: scalar("SELECT COUNT(*) AS count FROM inventory_ledger_entries"),
    active_reservation_count: scalar("SELECT COUNT(*) AS count FROM inventory_reservations WHERE status = 'active'"),
    outbox_event_count: scalar("SELECT COUNT(*) AS count FROM sync_outbox_events"),
    outbox_pending_delivery_count: scalar(
      "SELECT COUNT(*) AS count FROM sync_outbox_deliveries WHERE status IN ('pending', 'processing', 'retry', 'delivered_unverified')",
    ),
    outbox_dead_letter_count: scalar("SELECT COUNT(*) AS count FROM sync_outbox_deliveries WHERE status = 'dead_letter'"),
    outbox_verified_delivery_count: scalar("SELECT COUNT(*) AS count FROM sync_outbox_deliveries WHERE status = 'verified'"),
    processed_external_event_count: scalar("SELECT COUNT(*) AS count FROM processed_external_events"),
    price_observation_count: scalar("SELECT COUNT(*) AS count FROM price_observations"),
    price_review_pending_count: scalar(
      "SELECT COUNT(*) AS count FROM price_review_items WHERE review_status = 'pending'",
    ),
  }
}

function refreshOutboxEventStatus(database, eventId, updatedAtUtc) {
  const rows = database.prepare("SELECT status FROM sync_outbox_deliveries WHERE event_id = ?").all(eventId)
  const statuses = rows.map((row) => row.status)
  let status = "pending"

  if (statuses.length > 0 && statuses.every((value) => value === "verified" || value === "cancelled")) {
    status = "verified"
  } else if (statuses.some((value) => value === "dead_letter")) {
    status = "dead_letter"
  } else if (statuses.some((value) => value === "retry" || value === "delivered_unverified")) {
    status = "attention"
  } else if (statuses.some((value) => value === "processing")) {
    status = "processing"
  }

  database.prepare("UPDATE sync_outbox_events SET status = ?, updated_at_utc = ? WHERE event_id = ?")
    .run(status, updatedAtUtc, eventId)
}

function outboxDeliveriesForEvent(database, eventId) {
  return database.prepare(`
    SELECT * FROM sync_outbox_deliveries WHERE event_id = ? ORDER BY destination ASC
  `).all(eventId).map(publicOutboxDelivery)
}

function priceReviewForDecision(database, decisionId) {
  const row = database.prepare("SELECT * FROM price_review_items WHERE decision_id = ?").get(decisionId)
  return row ? { ...row } : null
}

function publicInventoryLedgerEntry(row) {
  return { ...row, payload: parseJson(row.payload_json), payload_json: undefined }
}

function publicOutboxEvent(row) {
  return { ...row, payload: parseJson(row.payload_json), payload_json: undefined }
}

function publicOutboxDelivery(row) {
  return {
    ...row,
    response: parseJson(row.response_json),
    readback: parseJson(row.readback_json),
    response_json: undefined,
    readback_json: undefined,
  }
}

function publicReservation(row) {
  return { ...row, payload: parseJson(row.payload_json), payload_json: undefined }
}

function publicProcessedExternalEvent(row) {
  return { ...row }
}

function publicPriceObservation(row) {
  return { ...row, payload: parseJson(row.payload_json), payload_json: undefined }
}

function publicPriceDecision(row) {
  return { ...row }
}

function publicPriceReview(row) {
  return {
    ...row,
    observation_payload: parseJson(row.observation_payload_json),
    observation_payload_json: undefined,
  }
}

function cleanDestination(value) {
  const destination = cleanText(value).toLowerCase()
  return OUTBOX_DESTINATIONS.has(destination) ? destination : ""
}

function cleanDeliveryStatus(value) {
  const status = cleanText(value).toLowerCase()
  if (!DELIVERY_STATUSES.has(status)) {
    throw new Error(`Unsupported outbox delivery status: ${status || "empty"}`)
  }
  return status
}

function cleanReservationStatus(value) {
  const status = cleanText(value).toLowerCase()
  if (!["active", "released", "expired", "converted", "cancelled"].includes(status)) {
    throw new Error(`Unsupported inventory reservation status: ${status || "empty"}`)
  }
  return status
}

function cleanDecisionStatus(value) {
  const status = cleanText(value).toLowerCase()
  if (!["automatic", "review_required", "approved", "rejected", "published", "failed"].includes(status)) {
    throw new Error(`Unsupported price decision status: ${status || "empty"}`)
  }
  return status
}

function cleanRequired(value, field) {
  const cleaned = cleanText(value)
  if (!cleaned) {
    throw new Error(`${field} is required.`)
  }
  return cleaned
}

function cleanText(value) {
  return String(value ?? "").trim()
}

function cleanTimestamp(value) {
  const parsed = Date.parse(cleanText(value))
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : ""
}

function integer(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function nonNegativeInt(value) {
  return Math.max(0, integer(value, 0))
}

function positiveInt(value, fallback) {
  const parsed = integer(value, fallback)
  return parsed > 0 ? parsed : fallback
}

function safeJson(value) {
  return JSON.stringify(value && typeof value === "object" ? value : {})
}

function parseJson(value) {
  try {
    return JSON.parse(String(value ?? "{}"))
  } catch {
    return {}
  }
}
