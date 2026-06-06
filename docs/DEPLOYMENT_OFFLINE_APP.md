# Offline App Deployment

## Windows Release

The planned release is a signed Tauri Windows installer with versioned SQLite
migrations and a controlled updater. Electron is a documented fallback only
after failed hardware proof-of-concept.

Version `0.34.0` adds the initial Tauri Windows packaging scaffold:

- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `apps/offline-app/config/windows-package.manifest.json`
- `.github/workflows/offline-app-windows.yml`

The Windows target is `x86_64-pc-windows-msvc`, the installer target is `nsis`,
and the expected installer artifact is an unsigned `.exe`.

## Build Commands

Validate the packaging contract:

```sh
npm run test:offline-app
```

Build locally from `apps/offline-app` after installing dependencies:

```sh
npm install
npm run build:windows
```

The GitHub Actions workflow exposes a manual `workflow_dispatch` build that
uploads the unsigned NSIS `.exe` artifact. Production release still requires
manual approval, code signing, and the hardware gate below.

Version `0.35.0` adds the first local SQLite schema contract in
`src-tauri/migrations/0001_offline_foundation.sql`. It defines local device
identity, sync cursors, queued operations, sync logs, cached branding,
inventory, customer credit, events, and conflict tables. The schema is local
state only; WordPress remains authoritative once operations sync.

## Device Enrollment

1. Manager creates a short-lived pairing code in WordPress.
2. App presents device identity, mode, location, and hardware capabilities.
3. Server issues a scoped device token.
4. Token is stored in Windows protected credential storage.
5. App performs first full sync and integrity check.
6. Manager validates kiosk/staff/admin mode and revocation.

Version `0.40.0` adds the WordPress request validation boundary for step 2.
The planned registration route validates pairing codes, app installation IDs,
device labels, kiosk/staff/admin mode, location and manager IDs, Windows app
version, supported hardware capability flags, requested scopes, and schema
version `1`. Live token issuance, token hashing/storage, device row writes,
revocation checks, and first-sync execution remain disabled until staging
integration tests pass.

Version `0.41.0` adds the registration planning boundary for steps 3 through
5. A validated pairing request can now be shaped into the future device row,
one-time response payload, sync route map, first-sync flags, token hash storage
fields, and redacted audit payload. Real token generation, storage, device row
writes, revocation checks, and first-sync execution are still disabled until
staging integration tests pass.

Version `0.42.0` adds the registered-device access policy boundary for later
pull, push, and conflict requests. The policy validates active state,
revocation timestamps, token expiry, required scopes, supported modes/scopes,
location IDs, and UTC timestamps. Live bearer-token lookup, token hash
comparison, route permission callback wiring, last-seen updates, and revocation
persistence are still disabled until staging integration tests pass.

Version `0.43.0` adds the conflict-center request validation boundary for
future list and manager resolution routes. Conflict filters validate statuses,
entity types, cursors, page-size bounds, include-resolved flags, and schema
version. Resolution requests validate idempotent resolution IDs, manager IDs,
actions, notes, expected conflict versions, UTC resolution timestamps,
adjustment payloads, and schema version. Live conflict repository reads,
manager mutation writes, audit persistence, and resolved-state propagation are
still disabled until staging integration tests pass.

Version `0.44.0` adds the conflict-list response presentation boundary. Future
repository rows can now be shaped into stable conflict-center payloads with
filters, cursors, has-more state, severity, row versions, payload objects, and
available manager resolution options. Live conflict repository reads and
manager mutation writes are still disabled until staging integration tests pass.

Version `0.45.0` adds the conflict resolution planning boundary. Future manager
actions can now produce deterministic conflict update rows, API response
payloads, optimistic row-version checks, terminal-status guards, action
availability checks, and redacted audit payload hashes. Live conflict mutation
writes, audit persistence, route callback wiring, and resolved-state fanout are
still disabled until staging integration tests pass.

Version `0.46.0` adds the offline push operation resolution boundary. Future
queue replay can now produce deterministic accepted/rejected outcomes,
operation result rows, response payloads, manager-reviewed conflict rows,
deterministic conflict IDs, and redacted audit payloads for inventory, event,
credit, revoked-device, and unsupported-operation cases. Live push route
handlers, queue replay writes, canonical entity mutations, conflict
persistence, permission wiring, and cursor advancement are still disabled until
staging integration tests pass.

Version `0.47.0` adds the offline push batch resolution boundary. Future route
handlers can now resolve a bounded batch into per-operation plans, operation
result rows, enriched conflict rows, response counts, and redacted batch audit
payloads after repositories provide server snapshots. Live push route
registration, queue replay writes, canonical entity mutations, conflict
insertion, permission wiring, and cursor advancement are still disabled until
staging integration tests pass.

Version `0.48.0` adds the server-side offline sync persistence schema. Future
WordPress handlers now have planned custom tables for registered offline
devices, idempotent operation queue/result rows, manager-reviewed conflicts,
and per-device pull cursors. Live route callbacks, bearer-token lookup, token
hash comparison, queue replay workers, conflict mutation writes, and cursor
advancement remain disabled until staging integration tests pass.

Version `0.49.0` adds the offline push persistence planning boundary. Future
WordPress handlers can now map resolved push batches into queue/result insert
rows, conflict insert rows, idempotent replay rows, and redacted audit payloads.
Live `$wpdb` transactions, route callbacks, token lookup, canonical entity
mutations, conflict writes, and cursor advancement remain disabled until
staging integration tests pass.

Version `0.50.0` adds the offline bearer-token authentication planning
boundary. Future WordPress permission callbacks can now normalize
Authorization headers, validate device token shape, compare SHA-256 token
hashes, require persisted offline-device IDs, and delegate active/revoked/
expired/scope checks to the shared device access policy. Live device row lookup,
last-seen updates, route registration, queue replay, and database writes remain
disabled until staging integration tests pass.

Version `0.51.0` adds the offline device token lookup planning boundary. Future
WordPress repositories can now receive a hashed `token_hash` lookup filter and
short audit fingerprint from normalized Authorization headers without retaining
the raw token. Live device row repository queries, last-seen updates, route
registration, queue replay, and database writes remain disabled until staging
integration tests pass.

## Hardware Gate

Before production, test the actual:

- Barcode scanner and symbology.
- Label printer, DPI, stock size, and Windows driver.
- Touchscreen and on-screen keyboard.
- Optional receipt and QR scanner.
- Kiosk lockdown and auto-start behavior.

## Operations

- Monitor app version, device last seen, queue depth, conflicts, disk usage, and
  image cache health.
- Updates must not discard unsent operations.
- Revoked/lost devices cannot sync.
- Diagnostic exports are encrypted and redact secrets and personal data.
