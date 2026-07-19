BEGIN IMMEDIATE;

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

INSERT INTO schema_migrations (
  migration_key,
  schema_version,
  applied_at_utc,
  rollback_supported
) VALUES (
  '20260718_authoritative_inventory_sync_v1',
  1,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  1
) ON CONFLICT(migration_key) DO NOTHING;

COMMIT;
