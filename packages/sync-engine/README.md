# Sync Engine

Shared provider and offline synchronization primitives.

Implemented:

- Offline conflict policy for inventory reservations, event reservations,
  customer credit redemption, and device revocation.
- Executable Node tests wired into the root `npm run test` command.

Pending:

- Tauri/SQLite operation queue persistence.
- WordPress offline pull/push endpoints.
- Device pairing/authentication.
- Full reconnect and conflict-center integration tests.
