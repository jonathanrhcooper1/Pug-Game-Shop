# Database Migration Tests

Required coverage:

- Clean install creates all expected tables.
- Upgrade from prior schema version.
- Idempotent rerun of every migration.
- Reversible rollback where practical.
- Backup/staging clone checkpoint before major migrations.
- Inventory/reservation uniqueness and active reservation constraints.
- Customer credit ledger replay versus cached balance.
- Event registration capacity locking.

Use true database integration tests; mock-only concurrency tests are
insufficient for double-sell and credit overspend prevention.
