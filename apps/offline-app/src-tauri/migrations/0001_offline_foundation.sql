-- Offline app local schema foundation.
-- WordPress remains authoritative after sync acceptance.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS device_identity (
  device_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL,
  location_id INTEGER,
  mode TEXT NOT NULL,
  capabilities_json TEXT NOT NULL DEFAULT '{}',
  paired_at_utc TEXT,
  revoked_at_utc TEXT
);

CREATE TABLE IF NOT EXISTS sync_cursors (
  entity_type TEXT PRIMARY KEY,
  cursor TEXT,
  high_water_mark TEXT,
  pulled_at_utc TEXT
);

CREATE TABLE IF NOT EXISTS operation_queue (
  operation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_operation_id TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  location_id INTEGER,
  actor_id INTEGER,
  operation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  base_row_version INTEGER,
  occurred_at_local TEXT NOT NULL,
  queued_at_utc TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  authorization_context_json TEXT NOT NULL DEFAULT '{}',
  schema_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  accepted_at_utc TEXT,
  CHECK (status IN ('pending', 'accepted', 'rejected', 'conflict', 'retry'))
);

CREATE INDEX IF NOT EXISTS idx_operation_queue_status
  ON operation_queue (status, queued_at_utc);

CREATE INDEX IF NOT EXISTS idx_operation_queue_entity
  ON operation_queue (entity_type, entity_id, base_row_version);

CREATE TABLE IF NOT EXISTS sync_log (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence INTEGER,
  level TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at_utc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_log_sequence
  ON sync_log (sequence, created_at_utc);

CREATE TABLE IF NOT EXISTS cached_branding (
  token_key TEXT PRIMARY KEY,
  token_value TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cached_inventory (
  inventory_id INTEGER PRIMARY KEY,
  row_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  barcode TEXT,
  search_text TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cached_inventory_status
  ON cached_inventory (status, row_version);

CREATE INDEX IF NOT EXISTS idx_cached_inventory_barcode
  ON cached_inventory (barcode);

CREATE TABLE IF NOT EXISTS cached_customer_credit (
  customer_id INTEGER PRIMARY KEY,
  row_version INTEGER NOT NULL,
  available_credit TEXT NOT NULL,
  currency TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cached_events (
  event_id INTEGER PRIMARY KEY,
  row_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  starts_at_utc TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cached_events_starts
  ON cached_events (starts_at_utc, status);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  conflict_id TEXT PRIMARY KEY,
  client_operation_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  conflict_type TEXT NOT NULL,
  server_row_version INTEGER,
  client_row_version INTEGER,
  server_payload_json TEXT NOT NULL,
  client_payload_json TEXT NOT NULL,
  resolution_status TEXT NOT NULL DEFAULT 'open',
  created_at_utc TEXT NOT NULL,
  resolved_at_utc TEXT,
  CHECK (resolution_status IN ('open', 'resolved', 'exported'))
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status
  ON sync_conflicts (resolution_status, created_at_utc);
