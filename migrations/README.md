# Migrations

Release-level migration notes and data-migration runbooks live here. Executable
WordPress schema migrations live under
`apps/wordpress-plugin/src/Migrations`.

The local authoritative inventory schema is represented by:

- `20260718_authoritative_inventory_sync_up.sql`: clean v1 foundation.
- `20260718_authoritative_inventory_sync_v2_up.sql`: transparent v1-to-v2
  reference upgrade. Normal installations use the idempotent LAN startup
  migration in `apps/local-sync-server/src/authoritativeLedger.mjs`.
- `20260718_authoritative_inventory_sync_down.sql`: v1 rollback before writes.
- `20260718_authoritative_inventory_sync_v2_rollback.md`: backup-based v2
  rollback because immutable audit data cannot be safely dropped.

Current automation verifies clean install, prior-schema upgrade, partial-schema
repair, idempotent current-schema rerun, data preservation, and rollback plans.
WordPress migration rehearsals additionally exercise MySQL locks and the real
test-site schema before release.
