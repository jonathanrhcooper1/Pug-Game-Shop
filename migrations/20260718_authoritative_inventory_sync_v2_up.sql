-- Reference upgrade from authoritative inventory schema v1 to v2.
-- The LAN server applies the equivalent migration idempotently at startup.
-- Run this file manually only after confirming the v2 marker is absent and
-- backing up the SQLite database.

BEGIN IMMEDIATE;

ALTER TABLE inventory_ledger_entries
  ADD COLUMN reserved_quantity_before INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inventory_ledger_entries
  ADD COLUMN reserved_quantity_after INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inventory_ledger_entries
  ADD COLUMN available_quantity_before INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inventory_ledger_entries
  ADD COLUMN available_quantity_after INTEGER NOT NULL DEFAULT 0;

UPDATE inventory_ledger_entries
SET reserved_quantity_before = CASE WHEN status_before = 'reserved' THEN quantity_before ELSE 0 END,
    reserved_quantity_after = CASE WHEN status_after = 'reserved' THEN quantity_after ELSE 0 END,
    available_quantity_before = CASE WHEN status_before = 'reserved' THEN 0 ELSE quantity_before END,
    available_quantity_after = CASE WHEN status_after = 'reserved' THEN 0 ELSE quantity_after END;

CREATE TABLE sync_outbox_replay_audit (
  replay_id TEXT PRIMARY KEY,
  replay_request_key TEXT NOT NULL UNIQUE,
  delivery_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  destination TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  previous_attempt_count INTEGER NOT NULL DEFAULT 0,
  previous_next_attempt_at_utc TEXT NOT NULL DEFAULT '',
  previous_error_code TEXT NOT NULL DEFAULT '',
  previous_error_message TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL,
  aggregate_snapshot_json TEXT NOT NULL DEFAULT '{}',
  requested_by_user_id TEXT NOT NULL,
  requested_by_user_name TEXT NOT NULL,
  requested_at_utc TEXT NOT NULL
);
CREATE INDEX sync_outbox_replay_operation_idx
  ON sync_outbox_replay_audit (operation_id, destination, requested_at_utc DESC);

INSERT INTO schema_migrations (
  migration_key,
  schema_version,
  applied_at_utc,
  rollback_supported
) VALUES (
  '20260718_authoritative_inventory_sync_v2',
  2,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  0
);

COMMIT;
