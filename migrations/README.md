# Migrations

Release-level migration notes and data-migration runbooks live here. Executable
WordPress schema migrations live under
`apps/wordpress-plugin/src/Migrations`.

Current local automation verifies migration runner pending and rollback version
plans for clean install, prior-schema upgrade, idempotent current-schema rerun,
and controlled rollback order. Live database migration tests still run in
WordPress/staging environments where `dbDelta`, MySQL locks, backups, and
restores can be exercised against a real database.
