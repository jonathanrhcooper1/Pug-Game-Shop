BEGIN IMMEDIATE;

-- Roll back only before production events have been written. Export these
-- tables first if any counts are non-zero; dropping them discards audit data.
DROP TABLE IF EXISTS price_review_items;
DROP TABLE IF EXISTS price_decisions;
DROP TABLE IF EXISTS price_observations;
DROP TABLE IF EXISTS processed_external_events;
DROP TABLE IF EXISTS sync_outbox_deliveries;
DROP TABLE IF EXISTS sync_outbox_events;
DROP TABLE IF EXISTS inventory_reservations;
DROP TABLE IF EXISTS inventory_ledger_entries;
DELETE FROM schema_migrations
WHERE migration_key = '20260718_authoritative_inventory_sync_v1';

COMMIT;
