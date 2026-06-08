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
- Offline inventory update acceptance when row versions match, plus stale
  server-row conflict planning for manager review while canonical writes remain
  deferred.
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
redacted audit payload without live route writes. Device registration
credential issuance now generates UUIDv4 device IDs, one-time device tokens,
SHA-256 token hashes, UTC issue/expiry timestamps, bounded TTL metadata, and
secret-free audit fingerprints for future pairing handlers. Device
registration insert query planning now maps those planned rows into prepared
`tcg_offline_devices` insert templates, normalizes scopes and capabilities to
JSON, converts UTC timestamps to MySQL datetime values, and keeps token secrets
out of audit payloads without executing a database write. Device registration
repository adaptation now executes that prepared insert only when explicitly
called, reports inserted or rejected outcomes, captures insert IDs, and keeps
one-time tokens and token
hashes out of audit payloads. Device registration service orchestration now
composes pairing validation, credential issuance, registration planning, and
explicit repository insertion with stable result envelopes and secret-free
audits. An opt-in registration route handler adapter now maps those outcomes
into injected offline controller responses for staged tests while live pairing
route wiring remains disabled. An opt-in pairing permission callback adapter
now validates staged pairing requests and delegates manager/pairing
authorization to an injected callback while the default pairing permission
route remains locked.
Registered-device access policy checks now validate active state, revocation
timestamps, token expiry, required scopes, supported modes/scopes, location IDs,
and UTC timestamps for future pull/push/conflict permission callbacks. Offline
bearer-token authentication planning now validates Authorization headers,
device token shape, SHA-256 token hashes, persisted offline device IDs,
active/revoked/expired state, and required scopes without exposing raw tokens
in accepted contexts. Offline token
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
Pairing permission callback setup can now run without the registered-device
resolver; pull and push callback setup still requires it and stays locked when
the resolver is absent.
Pairing permission readiness now also requires an injected authorizer, so
deny-only pairing adapters are not returned as route callbacks.
The staged pairing route readiness planner now composes the injected
registration handler and configured pairing permission callback into a compact
bootstrap summary for staging checks while preserving disabled-by-default route
registration. Authenticated health output and admin System Status now surface
that pairing readiness summary so staging can inspect the blocked default and
future staged dependencies without registering live routes.
The first plan-only pairing authorizer now validates configured pairing-code
hashes, manager/location allowlists, mode-specific requested scopes, and UTC
expiry windows for that staged permission callback while retaining only a short
pairing-code fingerprint in audits.
Offline pairing authorization settings now normalize the same hash-only policy
shape for future staging wiring without saving raw pairing codes.
A settings-backed pairing authorizer factory now turns that sanitized settings
policy into the staged authorizer or permission callback without registering
live routes.
Pairing route readiness now also reports non-secret policy readiness, and an
incomplete settings policy keeps the staged permission callback locked.
Version `0.91.0` adds staged registration handler assembly for the same route.
The handler factory reports database, repository, pairing policy, and
pairing-authorizer readiness before composing `$wpdb`, the registration
repository, the registration service, and the settings-backed authorizer. If
any dependency is missing or a provider fails, handler readiness stays locked
and the live route remains unregistered.
Version `0.92.0` adds staged registered-device permission resolver readiness.
The resolver factory composes `$wpdb`, the registered-device repository, and
the session update repository for pull/push permission planning when database
dependencies are available. Health and admin output expose non-secret
readiness metadata, while live pull/push handlers, route registration, queue
replay, and route-connected last-seen writes remain disabled.
Version `0.93.0` adds staged registered-device sync route handler readiness.
The handler factory exposes parser-only pull/push controller callbacks for
bootstrap planning, so staging can verify request validation and controller
callback readiness without executing pull queries, queue replay, cursor
advancement, or route-connected writes.
Version `0.94.0` upgrades the staged pull callback from validation-only output
to the real pull response contract. It returns presenter-shaped empty domain
responses by default, supports an injected change-set provider for future
staging adapters, and still reports live query, cursor advancement,
route-registration, and write deferral.
Version `0.95.0` adds offline pull change-query planning for the same cached
domains. The planner records safe source tables, selected columns, payload
fields, request cursors, page-size limits, and device-scoped conflict filters,
while query execution, tombstone reads, cursor advancement, and live route
registration remain disabled.
Version `0.96.0` exposes pull change-query readiness in health and admin
System Status, including supported domains and explicit trusted-context,
query-execution, cursor, and tombstone deferral flags.
Version `0.97.0` adds prepared SQL template planning for those pull contracts.
The builder validates table/column/filter/order contracts and returns
allowlisted SQL templates plus prepared arguments while cursor filtering,
execution, tombstone reads, cursor advancement, and live route registration
remain deferred.
Version `0.98.0` adds an explicitly called pull change repository adapter for
those prepared plans. It normalizes rows into pull change-set records and
secret-free repository audits, while route-connected execution, cursor
advancement, tombstone reads, route registration, and writes remain deferred.
Version `0.99.0` adds explicit pull change-set provider composition. The
provider combines a pull request, injected registered-device context, query
planning, and repository fetches for staged tests, while default route wiring,
cursor advancement, tombstone reads, route registration, and writes remain
deferred.
Version `0.100.0` adds pull device context planning. The planner validates an
authorized registered-device permission resolution against the pull request and
produces the offline device ID/table prefix context required by the provider,
while route-connected handoff, cursor advancement, tombstone reads, route
registration, and writes remain deferred.
Version `0.101.0` adds route-aware pull provider handoff. Explicitly injected
pull handlers can now pass normalized request headers into a provider that
resolves registered-device authorization and fetches change sets, while
default route-connected reads, cursor advancement, tombstone reads, route
registration, and writes remain deferred.
Version `0.102.0` adds pull cursor advancement planning. Complete provider
pages can be converted into per-device `tcg_offline_pull_cursors` row payloads
after trusted context validation, while cursor writes and route-connected
writes remain deferred.
Version `0.103.0` adds pull cursor SQL planning. Those accepted cursor row
payloads can now be transformed into prepared upsert templates, while cursor
execution, route registration, and route-connected writes remain deferred.
Version `0.104.0` adds explicit pull cursor repository adaptation. Prepared
cursor upserts can run when directly invoked by staged tests, while default
route cursor execution and route-connected writes remain deferred.
Version `0.105.0` adds route-aware pull cursor advancement provider
composition. Explicit staging orchestration can resolve registered-device
headers, validate pull context, plan cursor rows, and invoke the cursor
repository after returned change sets, while default route execution remains
deferred.
Version `0.106.0` adds opt-in pull handler cursor advancement orchestration.
The handler can call an explicitly injected cursor advance provider after
change sets are returned and fail closed on cursor write rejection, while
default handler cursor advancement and route-connected writes remain deferred.
Version `0.107.0` adds staged pull route handler factory composition. Explicit
staging tests can enable a factory-built handler that wires route-aware
change-set reads and cursor advancement from `$wpdb`, while default route
dependency injection, route-connected reads, cursor writes, and route
registration remain deferred.
Version `0.108.0` adds staged offline push persistence SQL and repository
execution. Accepted queue/conflict persistence plans can now become prepared
`tcg_offline_sync_queue` and `tcg_sync_conflicts` insert templates and can be
executed only when explicitly called by staging tests, while default route
execution, queue replay, conflict persistence, canonical mutations, and route
registration remain deferred.
Version `0.109.0` adds staged offline push route handler factory composition.
Explicit staging tests can enable a factory-built push handler that resolves
registered-device authorization, server snapshots, batch outcomes, and
queue/conflict persistence through the controller boundary, while default push
route execution, route registration, queue replay, canonical mutations, and
production route-connected writes remain deferred.
Version `0.110.0` adds staged offline push server snapshot query planning.
Push operations now produce allowlisted inventory, event, and customer-credit
snapshot lookup contracts plus prepared SQL templates for future repositories,
while snapshot execution, repository loading, queue replay, canonical
mutations, and route registration remain deferred.
Version `0.111.0` adds explicit offline push server snapshot repository
adaptation. Staged tests can load and normalize inventory, event, and
customer-credit rows into resolver-ready server snapshots, while default
route-connected reads, queue replay, canonical mutations, and route registration
remain deferred.
Version `0.112.0` adds route-aware offline push server snapshot provider
composition. Explicitly enabled staged push handlers can now use authenticated
device context to fetch repository-backed snapshots before batch resolution,
while default route-connected reads, queue replay, canonical mutations, and
route registration remain deferred.
Version `0.113.0` adds route-aware offline push operation options provider
composition. Explicitly enabled staged push handlers can now derive event
reservation payment status options from operation payloads, while default route
execution, queue replay, canonical mutations, and route registration remain
deferred.
Version `0.114.0` adds plan-only existing operation-row lookup contracts for
offline push idempotency checks. Validated push batches can now produce
allowlisted `tcg_offline_sync_queue` lookup plans and prepared SQL templates by
offline device ID plus client operation IDs, while repository execution,
route-connected reads, queue replay, canonical mutations, and route
registration remain deferred.
Version `0.115.0` adds explicit existing operation-row repository adaptation.
Staging can now execute those prepared lookup templates through `$wpdb`,
normalize queue rows keyed by client operation ID, and reject malformed or
duplicate rows before replay preparation, while default route-connected reads,
queue replay, canonical mutations, and route registration remain deferred.
Version `0.116.0` adds route-aware existing operation-row provider composition.
Explicitly enabled staged push handlers can now pass authenticated device
context into repository-backed queue-row reads before persistence planning, so
duplicate operation pushes replay existing queue results without issuing a
second queue write. Default route execution, route registration, queue replay
workers, and canonical mutations remain deferred.
Version `0.117.0` surfaces staged push replay metadata. Persistence plans,
repository audits, route processing audits, and response metadata now expose
operation replay counts and replayed client operation IDs, so duplicate-push
idempotency can be verified directly while queue replay workers and canonical
mutations remain deferred.
Version `0.118.0` adds per-operation persistence annotations to staged push
response results. Each result now includes inserted/replayed persistence status
metadata and the payload includes an operation persistence-status map, letting
offline clients identify duplicate replays without inspecting nested audits.
Queue replay workers and canonical mutations remain deferred.
Version `0.119.0` hydrates replayed staged push response results from existing
queue rows. Duplicate-push responses now reuse the stored status, result code,
result details, and resolved timestamp, and report whether the response came
from the existing queue row or the fresh resolution plan. Queue replay workers
and canonical mutations remain deferred.
Version `0.120.0` adds plan-only canonical mutation descriptors for accepted
inventory reservation, event registration, and customer credit redemption push
operations. Conflict and rejected operations are skipped with explicit
metadata, and health/admin readiness reports the planner as staged ready while
canonical entity writes, queue replay workers, production
route registration, and default route execution remain disabled.
Version `0.121.0` connects that planner to explicitly enabled staged push route
processing. Replayed duplicate operation rows are skipped before future
canonical write planning, and response, route meta, and audit payloads expose
canonical mutation counts, operation IDs, skipped IDs, and skip reasons while
canonical writes remain deferred.
Version `0.122.0` adds staged canonical mutation SQL-template planning for
accepted mutation descriptors. Guarded inventory update templates require the
expected row version and available status, while event registration and
customer-credit redemption templates stay as lookup guards until later
repositories can hydrate internal IDs and write safely.
Version `0.123.0` surfaces that SQL-template planning from explicitly enabled
staged push routes. Fresh accepted operations report canonical SQL query
counts, operation IDs, prepare-argument counts, and deferred execution flags;
replayed duplicate operations report zero SQL templates while preserving the
original replayed response. Canonical repositories, queue replay workers,
route registration, and production writes remain disabled.
Version `0.124.0` adds a deferred canonical mutation repository result for the
staged SQL plans. The repository scaffold reports query counts, operation IDs,
prepare-argument counts, zero rows affected, and deferred execution flags
without executing inventory, event, credit-ledger, queue replay, route
registration, or production writes.
Version `0.125.0` surfaces that deferred repository result from explicitly
enabled staged push routes. Fresh and replayed push responses, route meta, and
audits now report repository status, query counts, operation IDs,
prepare-argument counts, zero affected rows, and deferred execution flags
without executing canonical repository writes.
Version `0.126.0` adds a canonical mutation repository execution gate after
that staging result. Staged push responses now report blocked, ready, or
rejected execution status plus block reasons and transaction-adapter deferral,
so canonical writes still cannot run without an explicit future executor path.
Version `0.127.0` adds transaction preflight after the execution gate. Staged
push responses now classify canonical query kinds before execution, reporting
inventory guarded updates as preflight-ready while event registration and
customer-credit ledger write plans remain deferred.
Current development adds an explicit canonical mutation transaction executor
for preflight-ready inventory guarded updates. The executor starts a database
transaction, runs the prepared inventory status update, commits only when
exactly one row is affected, and rolls back when the row-version/status guard
matches no rows. Default offline route wiring still keeps this executor
deferred until staging enables the remaining route-connected write gates.
Route-connected push handling now accepts a second explicit canonical mutation
execution switch. When both switches are enabled, the route executes
preflight-ready inventory guarded updates, reports execution rows and operation
IDs in the response/meta/audit payloads, and rejects the push if the guarded
update fails. Default route wiring keeps that switch disabled.
The offline device registration service can also consume that authorizer before
credential issuance, so a denied pairing policy stops direct staged service
registration before credentials or repository writes are created.
The injected registration route handler now maps that denial to
`offline_device_pairing_authorization_denied` with status `403`, giving future
staging tests a stable controller response while live route registration
remains disabled.
The planned offline route registration planner now turns those contracts into
disabled route registration metadata with fail-closed callbacks and block
reasons, without calling WordPress route registration.
The fail-closed offline controller scaffold now exposes the planned route
callback methods and returns disabled responses until live handlers are wired.
Route readiness now requires explicit controller handler injection in addition
to those callback methods, so default disabled handlers cannot be registered by
mistake.
The guarded offline route registrar now filters planned routes so the current
offline contracts register zero routes by default.
Offline REST request adaptation now normalizes body params, query params, route
params, headers, and idempotency keys for future offline route handlers, and the
controller can dispatch to explicitly injected handlers while the default
controller remains fail-closed.
Parser-only offline route validation handlers now exercise those normalized
requests through the controller for pairing, pull, push, conflict list, and
conflict resolution callbacks. The responses expose validation status, safe
summaries, deferred-write markers, and route-gated markers without persisting or
replaying operations.
Offline route bootstrap planning now summarizes feature-gate state,
registerable route counts, route keys, per-route registration metadata, and
bootstrap block reasons before any future staging bootstrap can register live
offline routes.
Authenticated health output and admin System Status now expose that bootstrap
state so staging checks can prove the default remains blocked and unregistered.
Authenticated health also reports `registration_deferred` while the current
route plan remains blocked or gated.
The WordPress bootstrapper now hooks into `rest_api_init`, but it still defers
the guarded registrar unless both the offline feature gate and route readiness
plan allow registration.
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
database lookup by default, queue replay workers, canonical entity mutations,
conflict mutation writes, and cursor advancement remain disabled until staging
integration tests explicitly enable route dependencies. Offline push
persistence planning now maps a parsed payload and batch resolution into future
queue/result rows, manager-reviewed conflict insert rows, idempotent replay
rows, and redacted audit payloads. Offline push persistence SQL and repository
staging now convert those planned rows into prepared queue/conflict inserts and
explicitly invoked `$wpdb` execution results, while default live route
execution, queue replay, canonical mutations, and route-connected writes remain
disabled. Route operation-options staging now normalizes event reservation
payment status from push payloads before batch resolution, while keeping
external provider queue workers and canonical event mutations disabled by
default.
Existing operation-row query planning now prepares the future idempotent replay
lookup against `tcg_offline_sync_queue` by offline device ID and client
operation IDs, while repository reads, queue replay, route registration, and
canonical mutations remain disabled by default.
Existing operation-row repository adaptation now lets staged tests explicitly
load and normalize those replay candidates while default route wiring still
avoids queue reads, replay workers, and canonical mutations.
Route-connected staged push canonical mutation planning now runs after
persistence planning. Fresh accepted operations produce inspection-only
mutation descriptors, while replayed duplicate operation rows are skipped with
`operation_replayed` before future canonical write planning.
Canonical mutation SQL-template planning can now validate those descriptors and
produce inspection-only guard templates. Inventory receives a guarded status
update template, while event and customer-credit mutations receive lookup guard
templates and keep registration, ledger, and repository execution
deferred.
The offline app now stages `inventory_reservation` hold operations with cached
WordPress public inventory IDs and per-connector route/canonical write
readiness. The staging connector keeps canonical inventory writes deferred by
default, while non-production connectors can explicitly mark guarded holds as
ready for future paired-device push execution.
Connector testing in the offline app now produces a local, secret-free report
for each company/site profile. The report checks manifest shape, offline route
map, pairing readiness, guarded inventory hold status, credential boundaries,
and deferred network reachability before live pairing or push execution.
`Sync Now` now also creates a local pull-refresh preview. The preview reports
refreshed inventory, customer-credit, event, and conflict row counts, records a
future pull cursor, preserves queued operations for push acceptance, and keeps
network execution plus device authorization headers deferred.
The Tauri desktop command now persists accepted offline operation envelopes to
the local `offline.sqlite` `operation_queue` table using an idempotent
`client_operation_id` primary key. Browser mode remains preview-only, and queue
replay, push execution, canonical WordPress mutations, and device-token network
writes remain deferred until the paired-device route gates are enabled.
The desktop app can also read pending local queue rows back from SQLite on
startup, validate each operation envelope, and merge those operations into the
visible queue. This restore path is bounded, local-only, and still does not
perform website writes or direct MySQL access.
Staging offline pairing setup now has a repeatable WP-CLI helper that stores
only hashed, short-lived pairing-code policy in WordPress settings and can
enable the pairing route gate separately from pull, push, and conflict route
gates. This prepares multi-company connector pairing without issuing device
tokens, exposing raw pairing codes, writing canonical website data, or running
sync network requests by default.

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
