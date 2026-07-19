# Authoritative Inventory v2 Rollback

Schema v2 is marked `rollback_supported = 0` because its four ledger snapshot
columns and replay-audit rows are immutable business evidence. An in-place
automatic downgrade could silently discard reservation and recovery history.

## Before deployment

1. Stop all employee, kiosk, checkout, and connector clients.
2. Stop the LAN server and confirm no process has the SQLite file open.
3. Copy the database file and its `-wal` and `-shm` companions, when present,
   to a timestamped backup directory.
4. Run `PRAGMA quick_check;` against the backup and retain its checksum.
5. Start the upgraded LAN server and confirm both migration rows report the
   expected schema versions.

## Rollback

1. Stop every client and the LAN server.
2. Preserve the failed-upgrade database separately for incident analysis.
3. Restore the complete pre-deployment SQLite backup set.
4. Deploy the prior LAN server build that understands schema v1.
5. Start the LAN server and run health plus reconciliation in read-only mode.
6. Do not replay connector deliveries until WordPress, Square, and local
   quantities have been reviewed against the restored authoritative ledger.

Do not remove the v2 marker, columns, or replay-audit table from a database that
has accepted post-upgrade writes.
