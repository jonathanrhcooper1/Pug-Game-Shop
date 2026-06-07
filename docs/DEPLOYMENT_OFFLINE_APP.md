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

Version `0.52.0` adds the offline device session planning boundary. Future
WordPress permission callbacks can now prepare authenticated session context,
last-seen update rows, optimistic row-version increments, and secret-free audit
payloads after a device row is authenticated. Live last-seen database writes,
route registration, queue replay, and database writes remain disabled until
staging integration tests pass.

Version `0.53.0` adds the registered-device permission planning boundary.
Future WordPress permission callbacks can now compose token lookup, loaded-row
authentication, and session update planning into lookup-required, denied, or
authorized outcomes. Live device row repository queries, route registration,
permission callback wiring, last-seen writes, queue replay, and database writes
remain disabled until staging integration tests pass.

Version `0.54.0` adds the registered-device row normalization boundary. Future
WordPress repositories can now pass raw `tcg_offline_devices` rows through a
deterministic normalizer that coerces database IDs, decodes scopes and
capabilities, normalizes UTC timestamps, reports stable validation errors, and
emits secret-free audits before auth/session planners consume the row. Live
device row repository queries, route registration, permission callback wiring,
last-seen writes, queue replay, and database writes remain disabled until
staging integration tests pass.

Version `0.55.0` adds the registered-device lookup-query planning boundary.
Future WordPress repositories can now consume selected columns,
active/revocation/expiry filters, row-normalizer metadata, lock intent, and
deferred scope checks derived from a valid token lookup plan without executing
SQL. Live device row repository queries, route registration, permission
callback wiring, last-seen writes, queue replay, and database writes remain
disabled until staging integration tests pass.

Version `0.56.0` integrates registered-device lookup-query planning into the
permission planning boundary. Lookup-required outcomes now carry the future
repository query arguments, while invalid scope/time query plans are rejected
before a repository call is attempted. Live device row repository queries, route
registration, permission callback wiring, last-seen writes, queue replay, and
database writes remain disabled until staging integration tests pass.

Version `0.57.0` adds the registered-device lookup query building boundary.
Future WordPress repositories can now transform a valid lookup-query contract
into a whitelisted prepared-SQL template, safe prefixed table name, and prepared
arguments without executing `$wpdb` reads. Live device row repository execution,
route registration, permission callback wiring, last-seen writes, queue replay,
and database writes remain disabled until staging integration tests pass.

Version `0.58.0` adds the registered-device repository adapter boundary.
Future WordPress permission callbacks can now execute a planned `$wpdb` lookup,
normalize the returned `tcg_offline_devices` row, and report found, not-found,
or rejected outcomes with redacted audits. Route registration, permission
callback wiring, last-seen writes, queue replay, and database writes remain
disabled until staging integration tests pass.

Version `0.59.0` adds the registered-device permission resolver boundary.
Future WordPress permission callbacks can now compose token planning,
repository-backed lookup, loaded-row authorization, and session update planning
into one route-ready result. Route registration, permission callback wiring,
last-seen writes, queue replay, and database writes remain disabled until
staging integration tests pass.

Version `0.60.0` adds the offline device session update query building
boundary. Future WordPress permission callbacks can now transform planned
last-seen updates into prepared SQL templates with expected row-version guards.
Route registration, permission callback wiring, last-seen writes, queue replay,
and database writes remain disabled until staging integration tests pass.

Version `0.61.0` adds the offline device session update repository adapter.
Future WordPress permission callbacks can now apply the prepared last-seen
update through `$wpdb` and distinguish applied, stale, and rejected outcomes.
Route registration, permission callback wiring, queue replay, and
route-connected database writes remain disabled until staging integration tests
pass.

Version `0.62.0` adds opt-in session update application to the
registered-device permission resolver. Future WordPress permission callbacks
can now load, authenticate, apply last-seen state, and fail closed on stale or
failed update results through one resolution boundary. Route registration and
permission callback wiring remain disabled until staging integration tests pass.

Version `0.63.0` adds a planned registered-device permission callback adapter
that extracts WordPress-style request headers, invokes the resolver boundary,
returns a boolean permission result, and preserves the last resolution for
future audit diagnostics. Route registration remains disabled until staging
integration tests pass.

Version `0.64.0` adds planned route permission callback factory wiring for the
registered-device offline routes. Pull maps to `offline_pull`, push maps to
`offline_push`, and pairing/conflict routes remain outside device-token
callback construction. Route registration remains disabled until staging
integration tests pass.

Version `0.65.0` adds planned offline route registration metadata with
fail-closed permission callbacks, callback/controller readiness flags, and
block reasons. No WordPress offline route is eligible for live registration
until staging integration tests pass.

Version `0.66.0` adds a fail-closed offline controller scaffold with callback
methods for every planned offline route. The callbacks return disabled
responses and remain unregistered until live handlers pass staging integration
tests.

Version `0.67.0` adds the guarded offline route registrar. Current offline route
contracts register zero routes by default; future route plans register only
when both live flags and callbacks are ready.

Version `0.68.0` adds offline REST request adaptation for future WordPress route
handlers. Body params, query params, route params, headers, and idempotency keys
can now be normalized before injected controller handlers run in tests, while
the default controller and current route contracts remain disabled until staging
integration tests pass.

Version `0.69.0` adds parser-only offline route validation handlers behind the
injected controller dispatch boundary. Future staging checks can validate
pairing, pull, push, conflict list, and conflict resolution requests and inspect
safe response summaries while route registration, persistence, and queue replay
remain disabled.

Version `0.70.0` adds offline route bootstrap planning for future staging
checks. Staging code can now inspect feature-gate state, registerable route
counts, route keys, route-registration summaries, and bootstrap block reasons
before any registrar is called. Current route contracts still report no
registerable routes, and route registration, persistence, and queue replay
remain disabled.

Version `0.71.0` surfaces that bootstrap state through authenticated health and
admin System Status. Staging checks can now confirm the offline route bootstrap
is blocked by default and that offline pull/push routes remain unregistered
before any future route-enablement slice proceeds.

Version `0.72.0` wires the offline route bootstrapper to WordPress
`rest_api_init` while keeping the guarded registrar deferred unless the offline
feature gate and future route-readiness plan both allow registration. Current
offline routes remain unregistered by default.

Version `0.73.0` adds explicit deferred bootstrap reporting to authenticated
health and WordPress smoke coverage for the `rest_api_init` bootstrapper hook.
Current offline routes remain unregistered by default.

Version `0.74.0` adds offline device registration insert query planning for
future `tcg_offline_devices` writes. It prepares SQL templates and arguments
only; live device row writes and route registration remain disabled.

Version `0.75.0` adds offline device registration repository adaptation for
future `tcg_offline_devices` writes. It can execute the planned prepared insert
only when explicitly called; live pairing routes, route-connected device writes,
and production token issuance remain disabled.

Version `0.76.0` adds offline device registration credential issuance for
future pairing flows. It generates device IDs, one-time tokens, token hashes,
UTC issue/expiry timestamps, and TTL metadata for planned handlers; live pairing
routes and production token issuance remain disabled.

Version `0.77.0` adds offline device registration service orchestration for
future pairing flows. It composes pairing validation, credential issuance,
registration planning, and explicit repository insertion while live pairing
routes and route-connected writes remain disabled.

Version `0.78.0` adds an opt-in offline device registration route handler
adapter for staged pairing tests. It maps service outcomes into
`register_offline_device` controller responses and retains secret-free audit
payloads while default controller callbacks, route registration, production
token issuance, and route-connected writes remain disabled.

Version `0.79.0` adds an opt-in offline device pairing permission callback
adapter for staged route readiness checks. It validates pairing request bodies,
delegates manager/pairing authorization to an injected callback, and keeps raw
pairing codes out of audits while default route permissions and registration
remain disabled.

Version `0.80.0` tightens offline route readiness by requiring an explicitly
injected controller handler before a planned route callback is considered ready.
Default disabled controller methods remain non-registerable, so staged
permission readiness cannot open a route without the matching handler.

Version `0.81.0` lets staging assemble pairing permission callbacks without a
registered-device resolver. Pull and push permission callbacks still require
that resolver and remain unavailable when it is absent, so pairing checks can
advance independently without opening registered-device sync routes.

Version `0.82.0` requires a configured pairing authorizer before the pairing
permission callback is treated as route-ready. Unconfigured pairing adapters
still deny direct calls, but the route factory no longer exposes them as ready
permission callbacks.

Version `0.83.0` adds a staged pairing route readiness summary that composes the
injected registration handler and configured pairing permission callback into
the existing bootstrap plan. It proves handler and permission readiness while
the pairing route remains disabled by default and registration stays deferred.

Version `0.84.0` surfaces that staged pairing readiness summary in authenticated
health output and admin System Status. The visible default should remain
blocked, handlerless, permission-locked, and deferred until a reviewed staging
route-enablement slice changes the gate.

Version `0.85.0` adds a plan-only offline device pairing authorizer for staged
permission callbacks. It validates configured pairing-code hashes,
manager/location allowlists, mode-specific scopes, and UTC expiry windows while
keeping raw pairing codes and full hashes out of audit payloads. Live route
registration and production device-token issuance remain disabled.

Version `0.86.0` lets the offline device registration service optionally
consume that same authorizer before credential issuance. Denied pairing
policies return a rejected service result before repository writes, while live
route registration and production token issuance remain disabled.

Version `0.87.0` maps those denied pairing policies through the staged
registration route handler as `offline_device_pairing_authorization_denied`
with status `403`. The route remains opt-in/injected for staging tests only;
live route registration and production token issuance remain disabled.

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
