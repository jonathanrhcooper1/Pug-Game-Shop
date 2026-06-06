# Offline Sync

## Model

The desktop app contains:

- A local SQLite read model for inventory, reference cards, customers/credit
  summaries, events, carts, and configuration.
- A local image cache.
- An append-only operation queue.
- A local immutable sync log.
- A device-specific server cursor and entity row versions.

WordPress becomes authoritative when an operation is accepted. The app does not
perform direct MySQL access.

## Operation Envelope

Every queued action includes:

`client_operation_id`, `device_id`, `location_id`, `actor_id`,
`operation_type`, `entity_type`, `entity_id`, `base_row_version`,
`occurred_at_local`, `queued_at_utc`, `payload`, `authorization_context`,
and `schema_version`.

`client_operation_id` is globally unique and server-deduplicated.

## Push

1. Device authenticates and submits a bounded ordered batch.
2. Server validates device scope, actor permission, schema version, and
   idempotency.
3. Each independent operation commits or returns a durable conflict/error.
4. Server returns canonical entity state and new row version.
5. Device marks accepted operations immutable and updates its read model.
6. Failed transient operations remain queued with bounded retry metadata.

Operations that must be atomic together use a declared batch group; unrelated
actions do not share a transaction.

## Pull

The server exposes a monotonic change sequence with tombstones. The device asks
for changes after its last cursor, applies them transactionally to SQLite, then
advances the cursor. Full resync is available when cursor history expires or
local integrity checks fail.

## Conflict Rules

| Conflict | Default result |
| --- | --- |
| Exact item sold online before offline reserve/sale arrives | Reject inventory transition; manager resolves customer outcome |
| Item price changed before offline sale | Record price conflict; manager accepts old price, adjusts, refunds, or overrides |
| Credit spent online and offline | Reject excess posting; preserve attempted redemption and require manager resolution |
| Event reached capacity | Waitlist if allowed, otherwise staff review |
| Customer merged/edited | Preserve both payloads and field-level differences |
| Inventory edited in both places | Auto-merge only disjoint, explicitly mergeable fields; otherwise manager review |

No last-write-wins policy is used for money, inventory status, identity merges,
minimum price, or manager-controlled fields.

The first shared sync-engine policy module is implemented and tested for:

- Offline inventory reservation acceptance and unavailable-item conflict.
- Offline event reservation acceptance, waitlist, and capacity conflict.
- Offline credit redemption acceptance, cached-limit rejection, and server
  overspend conflict.
- Revoked device push rejection before operation handling.

The Tauri app packaging scaffold, Windows `.exe` installer contract, and first
SQLite schema contract are now implemented. Live SQLite persistence services,
WordPress offline push/pull handlers, live pairing, and full reconnect
integration tests remain future phases. The WordPress plugin now includes
planned route contracts for device pairing, pull, push, conflict listing, and
conflict resolution, plus offline push operation envelope validation for the
same queued fields SQLite stores. Offline pull request validation also exists
for cached domain selection, cursors, page-size bounds, tombstones, and schema
version. Offline pull response presentation is implemented for per-domain
cursors, change rows, tombstones, server timestamps, and `has_more` pagination
flags. Offline device pairing request validation now exists for short-lived
pairing codes, installation IDs, device modes, manager/location IDs,
capabilities, requested scopes, Windows app versions, and schema version. Those
requests can now be turned into a planned device row, one-time registration
response, token hash storage fields, sync route map, first-sync flags, and
redacted audit payload without live writes. Registered-device access policy
checks now validate active state, revocation timestamps, token expiry, required
scopes, supported modes/scopes, location IDs, and UTC timestamps for future
pull/push/conflict permission callbacks. Offline bearer-token authentication
planning now validates Authorization headers, device token shape, SHA-256 token
hashes, persisted offline device IDs, active/revoked/expired state, and
required scopes without exposing raw tokens in accepted contexts. Offline token
lookup planning now exposes a hashed lookup filter and short audit fingerprint
for the future device repository without retaining raw tokens. Offline device
session planning now prepares future last-seen update rows, row-version
increments, session context, and audit payloads after authentication.
Registered-device permission planning now composes lookup-required, denied,
and authorized outcomes for future REST permission callbacks without querying
or mutating device rows. Registered device row normalization now validates raw
future `tcg_offline_devices` rows, decodes scopes/capabilities, normalizes UTC
timestamps, and emits secret-free audits before auth/session planning consumes
the row. Registered device lookup-query planning now prepares selected columns,
active/revocation/expiry filters, row-normalizer metadata, lock intent, and
deferred scope checks for future repositories without executing SQL. Permission
planning now carries those query arguments in lookup-required outcomes and
rejects invalid scope/time query plans before a future repository call.
Registered-device lookup query building now validates those query contracts and
produces prepared SQL templates plus arguments. Registered-device repository
adaptation now executes a planned lookup when called, normalizes the returned
row, and emits found/not-found/rejected results with redacted audits before any
REST route wiring is enabled.
Registered-device permission resolution now composes that lookup with
loaded-row authentication, not-found denial, malformed-row rejection, and
session update planning without registering route callbacks or writing
last-seen state.
Offline device session update query building now converts the planned
last-seen update into a prepared SQL template with expected row-version guards
without executing it.
Offline device session update repository adaptation now executes that prepared
update only when explicitly called, returning applied, stale, or rejected
outcomes with redacted audit data.
Registered-device permission resolution now exposes an opt-in path that applies
that update and denies stale or rejected results before a future route callback
continues.
The planned registered-device permission callback adapter now accepts
WordPress-style request headers and returns a boolean permission result while
keeping route registration disabled.
The planned offline route permission callback factory now maps registered-device
pull and push route contracts to their required scopes and callback adapters,
while keeping pairing and manager conflict routes out of device-token callback
construction.
Those endpoints are not registered live yet, accepted operations are not
persisted or replayed yet, route-connected device permission checks,
permission callback wiring, and route-connected last-seen database writes are
disabled, live
pull queries are not executed yet, and pull cursors are not advanced yet.
Conflict list and
resolution request validation now covers status/entity filters, cursors,
page-size bounds, idempotent resolution IDs, manager IDs, resolution actions,
notes, expected conflict versions, UTC resolution timestamps, adjustment
payloads, and schema version. Live conflict repository reads, manager mutation
writes, audit persistence, and resolved-state propagation remain disabled.
Conflict list response presentation now shapes repository rows into stable
filters, cursors, conflict rows, row versions, payload objects, severity, and
available resolution options for the future conflict center.
Conflict resolution planning now prepares future conflict row updates, response
payloads, optimistic row-version checks, terminal-status guards, action
availability checks, and redacted audit payload hashes without mutating live
state. Offline push operation resolution planning now mirrors the shared
sync-engine policy in PHP, turning parsed queue operations and server snapshots
into accepted, rejected, or conflict plans with operation result rows,
deterministic conflict IDs, manager-reviewed conflict rows, response payloads,
and redacted audit payloads. Live queue replay, canonical entity mutations,
conflict persistence, permission callback wiring, and cursor advancement remain
disabled until staging integration tests pass. Offline push batch resolution
planning now wraps those operation plans into batch-level response counts,
future operation result rows, enriched conflict rows, and redacted batch audit
payloads after repository-provided server snapshots are available. WordPress
schema migration `0008_offline-sync` now adds the server-side tables for
registered devices, idempotent operation queue/result rows, manager-reviewed
sync conflicts, and per-device pull cursors. Live route callbacks, bearer-token
database lookup, queue replay workers, canonical entity mutations, conflict
mutation writes, and cursor advancement remain disabled until staging
integration tests pass. Offline push persistence planning now
maps a parsed payload and batch resolution into future queue/result rows,
manager-reviewed conflict insert rows, idempotent replay rows, and redacted
audit payloads without performing live `$wpdb` writes.

The first SQLite migration defines local tables for device identity, sync
cursors, queued operations, sync logs, cached branding, cached inventory,
cached customer credit, cached events, and sync conflicts. Direct MySQL access
is explicitly disallowed.

## Offline Reservations

Offline reservations are local claims only and cannot guarantee global
availability. The UI labels them `pending sync`. When a sale is completed
offline, the item becomes `offline_pending_sync` locally and cannot be reused on
that device. Server conflict handling determines final authority.

## Offline Credit

- Redemption is limited to the cached available balance.
- A configurable per-device/per-customer offline risk ceiling may lower that
  limit, but never increase it.
- Customer identity and staff authorization are required.
- The queue records the balance/version used for the decision.
- Conflict never silently creates negative credit.

## Security

- SQLite is encrypted when supported by the selected library/build; otherwise
  sensitive cached fields are application-encrypted and the risk is documented
  before release.
- Device tokens are held in Windows protected credential storage.
- Kiosk mode minimizes cached personal data and clears active session data on
  inactivity.
- Manager actions require online or cached, time-limited manager
  reauthentication according to policy.

## Recovery

- Export an encrypted diagnostic bundle containing schema version, queue
  metadata, masked logs, and integrity results.
- Never include API keys or full customer contact data in diagnostics.
- A device may be revoked without deleting its unresolved server conflicts.
- Reinstall supports pairing and a fresh full sync; unsent operations must be
  exported/recovered before destructive reset.
