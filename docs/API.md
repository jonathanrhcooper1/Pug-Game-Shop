# REST API

## Contract Rules

- Namespace: `/wp-json/tcg-store/v1`.
- JSON request and response bodies use `snake_case`.
- Every write accepts `Idempotency-Key`; offline writes require it.
- Mutable resources expose `row_version`; updates may require `If-Match`.
- Pagination uses `page`, `page_size`, and opaque `cursor` where appropriate.
- Errors use `{ code, message, details, request_id }`.
- Collection responses use `{ data, paging, meta }`.
- Permissions are checked in each route `permission_callback`.
- Device endpoints require scoped device credentials, never administrator
  application passwords.

## Route Map

Current implementation status: dependency-free route contract tests cover the
health endpoint plus public Events list/detail/registration routes. WordPress
integration smoke tests verify those routes register in a real WordPress
process. Planned customer credit route contracts and posting payload validation
and planned buylist route contracts plus intake payload validation are
implemented but not registered live. Planned offline device pairing, push,
pull, conflict list, and conflict resolution route contracts are implemented
but not registered live. Offline push payload validation is implemented for
operation envelope shape, duplicate operation IDs, device matching, supported
operation/entity pairs, timestamps, and schema version gating. Full permission,
nonce, request/response, and write-flow REST tests remain staging-gated as each
route family is implemented. Offline pull request validation is implemented for
device IDs, requested cached domains, domain cursors, page-size bounds,
tombstone inclusion, and schema version gating. Offline pull response
presentation is implemented for stable per-domain cursors, data rows,
tombstones, server timestamps, and `has_more` pagination flags. Offline device
pairing request validation is implemented for pairing codes, installation IDs,
device modes, manager/location IDs, app versions, Windows platform checks,
hardware capabilities, requested scopes, and schema version gating. Offline
device registration planning is implemented for future device rows, one-time
response payloads, token hash storage fields, sync routes, first-sync flags,
and redacted audit payloads. Offline device registration credential issuance
now generates future device IDs, one-time device tokens, SHA-256 token hashes,
UTC issue/expiry timestamps, TTL policy, and secret-free fingerprints. Offline
device registration insert query planning now maps those rows into prepared
`tcg_offline_devices` SQL templates with JSON/timestamp normalization and
secret-free audits. Offline device registration repository adaptation now
executes that prepared insert only when explicitly called, returns inserted or
rejected outcomes, captures insert IDs, and keeps raw device tokens and token
hashes out of repository audits. Offline device registration service
orchestration now composes pairing validation, credential issuance,
registration planning, and explicit repository insertion into stable
registered/invalid/rejected result envelopes with secret-free service audits.
That service can now optionally require the staged pairing authorizer before
credential issuance, rejecting denied pairing policies with a 403 response
before repository writes are attempted.
An opt-in route handler adapter now maps that service to the offline
controller's `register_offline_device` callback when explicitly injected,
returning stable response envelopes and retaining secret-free audits while the
default controller remains fail-closed. Pairing authorization denials now map
to the distinct staged response code
`offline_device_pairing_authorization_denied` with status `403` before
credential or repository paths run. Live pairing route wiring remains disabled.
An opt-in pairing permission callback adapter can now validate the
pairing request body and delegate manager/pairing authorization to an injected
authorizer for staged route tests while the default permission factory still
keeps the pairing route locked.
Offline route registration planning now requires controller callbacks to have
explicitly injected handlers before they are considered ready; default
fail-closed controller methods alone are not registerable.
The permission callback factory can now stage the pairing permission callback
without a registered-device resolver, but registered-device pull/push
callbacks still require that resolver and fail closed when it is absent.
Pairing permission readiness now requires the adapter to have an injected
authorizer; unconfigured pairing adapters are not exposed as route permission
callbacks.
The plan-only pairing authorizer now supports hashed pairing-code policies,
manager and location allowlists, mode-specific scope checks, UTC expiry
windows, server-time injection for tests, and secret-free audit payloads for
future staged pairing callbacks. It does not register the live pairing route or
issue production device tokens.
Offline pairing authorization settings now provide the future policy source for
that authorizer, normalizing SHA-256 pairing-code hashes, manager/location
allowlists, mode scopes, and UTC expiry windows while ignoring raw pairing-code
fields.
Offline device bearer-token authentication planning is implemented for future
registered-device permission callbacks,
including header normalization, device token validation, token hash comparison,
persisted device ID checks, and secret-free accepted contexts. Offline token
lookup planning now exposes hashed lookup filters and short audit fingerprints
for future device repositories without retaining raw tokens. Offline device
session planning now prepares last-seen update rows, row-version increments,
authenticated session context, and secret-free audit payloads after a device row
is authenticated. Registered device row normalization now validates and coerces
raw future repository rows before loaded-row authentication or session planning
consumes them. Registered device lookup-query planning now converts valid token
lookup plans into future repository query arguments without executing SQL.
Registered device permission planning now includes those lookup-query arguments
on lookup-required outcomes and denies invalid scope/time query plans before a
future repository call. Registered device lookup query building now transforms
valid lookup query contracts into whitelisted prepared-SQL templates and
prepared arguments for future repositories. Registered device repository
adaptation now executes those planned `$wpdb` lookups when called, normalizes
returned rows, reports not-found rows, and rejects invalid plans or malformed
rows. Registered device permission resolution now composes token planning,
repository lookup, loaded-row authentication, and session planning into a
route-ready result without registering live REST permission callbacks.
Offline device session update query building now converts planned last-seen
updates into prepared SQL templates with optimistic row-version guards without
executing live database writes. Offline device session update repository
adaptation now applies that prepared update when explicitly called and reports
applied, stale, or rejected outcomes without registering live REST permission
callbacks.
Registered device permission resolution can now opt in to applying that
session update and denies stale or rejected update results before a future
route callback proceeds.
The planned registered-device permission callback adapter now turns
WordPress-style request headers into that resolver call and returns a boolean
permission result while preserving the last resolution for audits.
Version `0.92.0` adds staged registered-device permission resolver readiness.
`OfflineRegisteredDevicePermissionResolverFactory` can compose `$wpdb`, the
registered-device repository, and the session update repository when database
dependencies are available. Authenticated health now includes
`offline_registered_device_permissions`, and route bootstrap planning can mark
pull/push permission callbacks ready while controller callbacks, live route
registration, queue replay, and route-connected writes remain disabled.
Version `0.93.0` adds staged registered-device sync route handler readiness.
`OfflineRegisteredDeviceSyncRouteHandlerFactory` injects parser-only
`pull_offline_changes` and `push_offline_operations` handlers into the
controller used for bootstrap planning. Authenticated health now includes
`offline_registered_device_sync_handlers`, and pull/push controller callbacks
can report ready while `should_register` remains false and route-connected
writes stay deferred.
Version `0.94.0` replaces the staged pull callback's validation-only response
with the existing pull response contract. Valid pull requests now receive
`offline_pull_response_ready` with `data` from the pull response presenter and
deferred-state metadata for `query_deferred`, `cursor_advance_deferred`,
`write_deferred`, and `route_still_gated`. Live pull queries, cursor
advancement, route registration, and route-connected writes remain disabled.
Version `0.95.0` adds plan-only pull change-query contracts for branding,
inventory, customer credit, events, and conflicts domains. The planner carries
safe table/column allowlists, request cursors, page sizes, and device-scoped
conflict filters for future repositories, but the route still does not execute
queries, read tombstones, advance cursors, or register live endpoints.
Version `0.96.0` surfaces that planner readiness in
`offline_registered_device_sync_handlers` health metadata, including supported
domains and explicit trusted-context/query/cursor/tombstone deferral flags.
No pull query execution or live route registration is enabled.
Version `0.97.0` adds prepared SQL template planning for those pull contracts.
The SQL plan exposes allowlisted `SELECT` templates and prepared arguments for
future repositories, while cursor filtering, query execution, tombstone reads,
cursor advancement, writes, and live route registration remain disabled.
Version `0.98.0` adds an explicitly called pull change repository adapter for
those prepared plans. It can normalize repository rows into per-domain pull
change sets and repository audits, while route-connected execution, cursor
advancement, tombstone reads, writes, and live route registration remain
disabled.
Version `0.99.0` adds explicit pull change-set provider composition. The
provider requires injected registered-device context before planning and
fetching repository-backed changes, and staged pull handler tests can inject it
without enabling default route wiring, cursor advancement, tombstone reads, or
route-connected writes.
Version `0.100.0` adds pull device context planning. Authorized
registered-device permission resolutions can now be validated against pull
requests and converted into the offline device ID/table prefix context needed
by the staged provider, while route-connected handoff remains disabled.
Version `0.101.0` adds route-aware pull provider handoff for explicitly
injected handlers. The handler can pass normalized request headers to a
provider that resolves registered-device authorization and fetches change sets,
while default route-connected reads, cursor advancement, tombstone reads, route
registration, and writes remain disabled.
Version `0.102.0` adds pull cursor advancement planning. Provider change sets
can now be validated into future per-device cursor rows after complete pages,
while cursor writes, route registration, and route-connected writes remain
disabled.
Version `0.103.0` adds pull cursor SQL planning. Accepted cursor rows can now
be converted into prepared per-device upsert templates for staging inspection,
while cursor execution, route registration, and route-connected writes remain
disabled.
Version `0.104.0` adds explicit pull cursor repository adaptation. Staging can
directly execute prepared cursor upsert plans through `$wpdb`, while default
route cursor execution, route registration, and route-connected writes remain
disabled.
Version `0.105.0` adds route-aware pull cursor advancement provider
composition. Explicitly injected orchestration can resolve registered-device
headers, plan cursor rows from returned change sets, and invoke the cursor
repository while default route execution remains deferred.
Version `0.106.0` adds opt-in pull handler cursor advancement orchestration.
An explicitly injected cursor advance provider can now run after change sets
are returned, with ready metadata for advanced cursors and fail-closed
responses for rejected cursor writes, while the default handler still defers
cursor advancement.
Version `0.107.0` adds staged pull route handler factory composition. The sync
handler factory can receive an explicitly enabled pull handler factory that
wires route-aware providers from `$wpdb` for staging tests, while default route
dependency injection and route execution remain deferred.
Version `0.108.0` adds staged offline push persistence SQL and repository
readiness. Health and admin output now expose push persistence planner, SQL
template, repository, queue persistence, conflict persistence, queue replay, and
canonical mutation deferral metadata while default route execution remains
disabled.
Version `0.109.0` adds staged offline push route handler factory composition.
An explicitly enabled factory can authenticate a registered device, resolve a
push batch from injected server snapshots, and call the staged persistence
repository through the controller boundary. Default push route execution,
route registration, queue replay, canonical mutations, and production
route-connected writes remain disabled.
Version `0.110.0` adds staged offline push server snapshot query planning.
Push operations can now be translated into allowlisted inventory, event, and
customer-credit snapshot lookup contracts plus prepared SQL templates for
future repositories. Snapshot query execution, repository loading, canonical
mutations, and live route registration remain deferred.
Version `0.111.0` adds explicit offline push server snapshot repository
adaptation. Staged tests can execute those prepared lookup templates through
`$wpdb` and normalize inventory, event, and customer-credit rows into
resolver-ready snapshots while default route-connected reads, canonical
mutations, queue replay, and live route registration remain deferred.
Version `0.112.0` adds route-aware offline push server snapshot provider
composition. Explicitly enabled staged push handlers can now pass authenticated
device context to repository-backed snapshot reads before batch resolution,
while default route-connected reads, canonical mutations, queue replay, and
live route registration remain deferred.
Version `0.113.0` adds route-aware offline push operation options provider
composition. Explicitly enabled staged push handlers can now normalize
per-operation event payment status from route payloads before batch resolution,
while default route execution, route registration, TopDeck queue workers,
canonical mutations, and route-connected writes remain deferred.
Version `0.114.0` adds staged existing operation-row query planning for offline
push idempotency checks. Validated push batches can now produce allowlisted
`tcg_offline_sync_queue` lookup contracts and prepared SQL templates scoped by
offline device ID and client operation IDs, while query execution, repository
reads, queue replay, canonical mutations, and live route registration remain
deferred.
Version `0.115.0` adds explicit existing operation-row repository adaptation.
Staging can now execute those lookup templates through `$wpdb`, normalize
existing queue rows keyed by client operation ID, and reject malformed or
duplicate rows before replay preparation, while default route-connected reads,
queue replay, canonical mutations, and live route registration remain
deferred.
Version `0.116.0` adds route-aware existing operation-row provider composition.
Explicitly enabled staged push handlers can now pass authenticated device
context into repository-backed queue-row reads before persistence planning, so
duplicate push operations can replay existing results without a second queue
write. Default route execution, route registration, queue replay workers, and
canonical mutations remain disabled.
Version `0.117.0` adds staged offline push replay metadata. Route response
`meta` and secret-free audits now include operation replay counts and replayed
client operation IDs, giving staging tests a direct way to verify idempotent
duplicate-push behavior while queue replay workers and canonical mutations
remain disabled.
Version `0.118.0` adds per-operation persistence annotations to staged offline
push response results. Each result now reports `persistence.status` as
`inserted` or `replayed` plus a `persistence.replayed` boolean, and the response
payload includes an `operation_persistence_statuses` map keyed by client
operation ID. Queue replay workers, canonical mutations, default route
execution, and live route registration remain disabled.
Version `0.119.0` hydrates replayed staged push response results from stored
queue rows. Replayed results use the existing row status, result code,
result details, and resolved timestamp, and expose
`persistence.response_source = existing_queue_row`; fresh results continue to
use `response_source = resolution_plan`. The response and audit payloads also
include hydrated replay counts and operation IDs. Queue replay workers,
canonical mutations, default route execution, and live route registration
remain disabled.
Version `0.120.0` adds plan-only canonical mutation descriptors for accepted
offline push inventory reservations, event registrations, and customer credit
redemptions. Conflict and rejected push operations are skipped with explicit
skip metadata. Health and admin readiness now report the planner as staged
ready, while canonical entity writes, TopDeck workers, queue replay workers,
default route execution, and live route registration remain disabled.
Version `0.121.0` connects that planner to explicitly enabled staged push route
processing after persistence planning. Route responses and audits now expose
canonical mutation counts, operation IDs, skipped operation IDs, and skip
reasons. Replayed duplicate operations are skipped with `operation_replayed`
before future canonical writes can be considered. Canonical entity writes,
TopDeck workers, queue replay workers, default route execution, and live route
registration remain disabled.
Version `0.122.0` adds staged canonical mutation SQL-template planning for
those descriptors. The planner produces a guarded inventory status update
template and event/customer-credit guard lookup templates for future
repositories, while canonical write execution, repository execution, TopDeck
workers, queue replay workers, default route execution, and live route
registration remain disabled.
Offline REST request adaptation now normalizes body params, query params, route
params, headers, and `Idempotency-Key`/`X-Idempotency-Key`/`X-Request-Id`
headers for future offline controller handlers. The default controller remains
fail-closed unless a future staging-gated bootstrap explicitly injects a
handler for a route callback.
Parser-only offline validation handlers can now be injected for device pairing,
pull, push, conflict list, and conflict resolution callbacks. They return
`offline_request_validated` or `offline_request_invalid` envelopes with callback
names, status metadata, safe summaries, and validation error codes, while
database writes and live route registration remain disabled.
Offline route bootstrap planning now summarizes feature-gate state, planned
route counts, registerable route counts, registerable route keys,
route-registration metadata, and bootstrap block reasons before any future
staging bootstrap attempts live route registration.
Authenticated health responses now include `offline_route_bootstrap` with
blocked/gated/ready status, route counts, registerable route keys, per-route
summaries, and bootstrap block reasons for staging readiness checks.
The payload also reports `registration_deferred` so staging can distinguish
safe gated readiness checks from a future route-registration pass.
The offline route bootstrapper is wired to `rest_api_init`, but it calls the
guarded offline route registrar only when the feature gate and route-readiness
plan report `should_register_routes = true`; the current default plan still
defers registration.
Controller callback readiness now requires an injected handler in addition to a
matching controller method, preventing disabled fallback methods from becoming
registered routes during staged enablement.

### Inventory And Search

| Method | Route | Minimum permission |
| --- | --- | --- |
| GET | `/inventory` | `view_inventory` |
| GET | `/inventory/{id}` | public visibility or `view_inventory` |
| POST | `/inventory` | `create_inventory` |
| PUT | `/inventory/{id}` | `edit_inventory` |
| POST | `/inventory/{id}/reserve` | source-specific authenticated principal |
| POST | `/inventory/{id}/release` | reservation owner or staff |
| POST | `/inventory/{id}/mark-sold` | staff/POS device |
| POST | `/inventory/{id}/move` | `edit_inventory` |
| POST | `/inventory/{id}/price-lock` | `edit_prices` |
| POST | `/inventory/bulk-intake` | `create_inventory` |
| POST | `/inventory/import` | manager/admin |
| POST | `/inventory/export` | `view_reports` |
| GET | `/search` | public filtered response |
| GET | `/reference/search` | public/configured limits |
| GET | `/inventory/search` | public or staff fields by capability |
| GET | `/search/versions` | public |

### Pricing And Overrides

| Method | Route | Permission |
| --- | --- | --- |
| POST | `/pricing/recalculate` | `edit_prices` |
| GET | `/pricing/history/{inventory_id}` | public/configured or staff |
| GET | `/pricing/floor-hits` | `view_reports` |
| POST | `/pricing/override` | employee plus manager reauthorization |

Manager override policy and persistence/audit payload planning are implemented
locally for below-minimum sale approvals. Live `/pricing/override` route
registration, manager reauthentication, rate limiting, database writes, and
WooCommerce/POS hook wiring remain disabled.

### Sync And Webhooks

| Method | Route | Permission |
| --- | --- | --- |
| POST | `/sync/full` | `manage_settings` |
| POST | `/sync/resume` | `manage_settings` |
| POST | `/sync/prices` | `edit_prices` |
| POST | `/sync/images` | `manage_settings` |
| POST | `/sync/game/{game}` | `manage_settings` |
| POST | `/sync/set/{set_id}` | `manage_settings` |
| POST | `/sync/pause/{job_id}` | `manage_settings` |
| POST | `/sync/cancel/{job_id}` | `manage_settings` |
| GET | `/sync/jobs` | staff sync visibility |
| GET | `/sync/jobs/{job_id}` | staff sync visibility |
| GET | `/sync/jobs/{job_id}/logs` | staff sync visibility |
| GET | `/sync/jobs/{job_id}/events` | staff sync visibility |
| POST | `/webhooks/scrydex` | verified provider signature |

The events route may use polling first. Server-sent events are enabled only
after target GoDaddy proxy buffering and connection limits are verified.

### Kiosk And Pick Queue

| Method | Route | Permission |
| --- | --- | --- |
| POST | `/kiosk/cart` | kiosk device |
| GET | `/kiosk/cart/{cart_id}` | cart token or staff |
| POST | `/kiosk/cart/{cart_id}/items` | cart token |
| DELETE | `/kiosk/cart/{cart_id}/items/{item_id}` | cart token |
| POST | `/kiosk/cart/{cart_id}/submit` | cart token |
| POST | `/kiosk/cart/{cart_id}/release` | cart token or staff |
| GET | `/kiosk/config` | kiosk device |
| GET | `/pick-queue` | staff |
| POST | `/pick-queue/{id}/start` | staff |
| POST | `/pick-queue/{id}/ready` | staff |
| POST | `/pick-queue/{id}/assign` | staff |
| POST | `/pick-queue/{id}/conflict` | staff |

### Customers And Credit

| Method | Route | Permission |
| --- | --- | --- |
| GET | `/customers/search` | staff |
| GET | `/customers/{id}` | staff or verified self |
| POST | `/customers` | staff/kiosk limited |
| PUT | `/customers/{id}` | staff or verified self-limited |
| GET | `/customers/{id}/credit` | staff or verified self |
| GET | `/customers/{id}/ledger` | staff or verified self |
| POST | `/customers/{id}/credit/adjust` | manager approval |
| POST | `/customers/{id}/credit/redeem` | staff or online checkout |
| POST | `/customers/merge` | manager |

Customer credit route contracts for balance, ledger, adjustment, and redemption
exist locally with live registration disabled. Posting payload validation
requires a matching route customer, `Idempotency-Key` header or
`idempotency_key` body field, valid amount/currency, object metadata, positive
linked IDs, and manager ID plus reason for manager-approved entry types. REST
response presentation is implemented for balance, ledger, posting-result, and
validation-error payloads, including safe customer field selection and redacted
ledger metadata.

### Buylist

| Method | Route | Permission |
| --- | --- | --- |
| POST | `/buylist/submissions` | kiosk/customer/staff |
| GET | `/buylist/submissions` | staff |
| GET | `/buylist/submissions/{id}` | owner token or staff |
| POST | `/buylist/submissions/{id}/review` | staff |
| POST | `/buylist/submissions/{id}/offer` | staff/manager threshold |
| POST | `/buylist/submissions/{id}/accept` | verified customer/staff |
| POST | `/buylist/items/{id}/convert-to-inventory` | `create_inventory` |

Buylist route contracts for intake, listing, detail, review, offer, acceptance,
and conversion exist locally with live registration disabled. Submission intake
payload validation requires source, idempotency key, customer phone, valid
currency, at least one item, card identity per item, positive quantity, valid
owner token hash when supplied, and grading details for graded cards. Offer
planning is implemented for reviewed item offer rows, cash/credit totals,
manager approval thresholds, target submission status, expiry, and
deterministic offer fingerprints.

### Events

| Method | Route | Permission |
| --- | --- | --- |
| GET | `/events` | public |
| GET | `/events/{slug}` | public |
| POST | `/events/{slug}/register` | public local registration |
| POST | `/events` | `manage_events` |
| PUT | `/events/{id}` | `manage_events` |
| POST | `/events/{id}/cancel` | owner or staff |
| POST | `/events/{id}/check-in` | event staff |
| GET | `/events/{id}/attendees` | event staff |
| POST | `/events/{id}/sync-topdeck` | `sync_topdeck` |
| POST | `/events/import-topdeck` | `sync_topdeck` |
| POST | `/webhooks/topdeck` | disabled until documented/configured |

`POST /events/{slug}/register` accepts free and pay-at-store local
reservations only. It uses the `Idempotency-Key` header or `idempotency_key`
body field, rejects TopDeck-hosted local writes, writes waitlist rows when
capacity is full and waitlist is enabled, and does not capture online payments
or call TopDeck yet. Eligible free website-push registrations write a pending
local TopDeck sync-log record for a later worker phase. Active same-event/email
registrations are returned as `already_registered`; idempotency keys reused
across another event or email return `idempotency_conflict`.

### Offline And POS

| Method | Route | Permission |
| --- | --- | --- |
| POST | `/offline/devices/register` | pairing code plus manager |
| POST | `/offline/pull` | registered device |
| POST | `/offline/push` | registered device |
| GET | `/offline/conflicts` | `resolve_conflicts` |
| POST | `/offline/conflicts/{id}/resolve` | `resolve_conflicts` |
| POST | `/pos/sale` | POS/staff device |
| POST | `/pos/refund` | POS/staff device |
| POST | `/pos/sync` | POS adapter |
| GET | `/pos/logs` | manager/report permission |

Offline route contracts now exist locally for the five offline routes listed
above. They document callback names, route permissions, the shared
`tcg-store/v1` namespace, and disabled-live defaults for the Windows app
integration. The offline device pairing parser now validates pairing codes,
installation IDs, device labels, device modes, manager/location IDs, app
versions, Windows platform checks, hardware capabilities, requested scopes, and
schema version `1`. The offline push payload parser now validates batch IDs, device
matching, client operation IDs, supported `inventory_reservation`,
`event_reservation`, and `credit_redemption` operation envelopes, ISO
timestamps, JSON-object payloads, authorization context, duplicate IDs, and
schema version `1`. Parsed push operations can now be resolved into planned
accepted, rejected, or conflict outcomes with future operation result rows,
API response payloads, manager-reviewed conflict rows, deterministic conflict
IDs, and redacted audit payloads. Offline bearer-token authentication planning
now validates request headers, token shape, SHA-256 token hashes, persisted
offline device IDs, revocation, expiry, and required scopes before future
route handlers proceed. Offline token lookup planning now prepares the hashed
`token_hash` filter a future repository will use to load the device row.
Offline session planning now prepares future `last_seen_at`, `updated_at`, and
`row_version` updates once that row is authenticated. Registered-device
permission planning now composes token lookup, loaded-row authentication, and
session update planning into lookup-required, denied, and authorized plan
states for future WordPress `permission_callback` wiring. Registered device row
normalization now prepares raw future `tcg_offline_devices` rows with decoded
scopes/capabilities, UTC timestamps, stable validation errors, and secret-free
audits before auth/session planners consume them. Registered device
lookup-query planning now prepares selected columns, active/revocation/expiry
filters, row-normalizer metadata, lock intent, and deferred scope checks for
future repositories. Permission planning now carries that query contract in
lookup-required outcomes before live repositories are wired. Offline device
registration credential issuance now supplies generated IDs/tokens/hashes and
expiry timestamps for future staging-only pairing handlers, while the live
pairing route remains disabled. Offline device session update repository
adaptation can apply validated last-seen updates when explicitly called, and
permission resolution can now opt in to that update while failing closed on
stale or rejected results. Live device pairing route writes, route-connected
device permission checks, permission callback wiring, route-connected last-seen
database writes, push/pull workers, queue replay, canonical entity writes, and
conflict persistence remain disabled until
staging-gated WordPress/offline integration tests pass. Offline
pull request
validation also exists for the SQLite cached domains `branding`, `inventory`,
`customer_credit`, `events`, and `conflicts`, including cursor shape, page-size
limits, tombstone inclusion, and schema version `1`. Offline pull response
presentation now shapes accepted pull results as:

```json
{
  "device_id": "device-main-01",
  "schema_version": 1,
  "server_time_utc": "2026-06-06T15:45:00Z",
  "domains": {
    "inventory": {
      "cursor": "inv-cursor-42",
      "has_more": false,
      "data": [
        {
          "entity_type": "inventory_item",
          "entity_id": "inv-1001",
          "row_version": 42,
          "updated_at_utc": "2026-06-06T15:41:00Z",
          "payload": {}
        }
      ],
      "tombstones": []
    }
  }
}
```

Live database change queries, tombstone repositories, and cursor advancement
remain disabled until device authentication and reconnect tests pass.

The planned pairing request body is shaped as:

```json
{
  "pairing_code": "PAIR-1234",
  "installation_id": "install-main-01",
  "device_label": "Front Counter Kiosk",
  "device_mode": "kiosk",
  "location_id": 2,
  "manager_id": 15,
  "app_version": "0.121.0",
  "platform": "windows",
  "capabilities": {
    "barcode_scanner": true,
    "label_printer": false,
    "touchscreen": true
  },
  "requested_scopes": ["offline_pull", "kiosk"],
  "schema_version": 1
}
```

Live route token issuance/storage, revocation checks, and first-sync execution
remain disabled until staging tests pass.

Staging can inspect the planned pairing route readiness summary before enabling
live route registration. The summary reports the route key, feature gate,
handler injection, configured pairing authorizer, permission readiness,
controller readiness, disabled-by-default registration state, and bootstrap
block reasons. Even with both staged dependencies injected, the current pairing
route remains `registration_deferred` because offline routes are still disabled
by default.

Authenticated health responses also expose this summary under
`offline_device_pairing_route_readiness` for staging review. The default
production-safe payload remains blocked, handlerless, permission-locked, and
deferred until later route-enablement work injects and approves live
dependencies.

Pairing authorization is now planned behind an injectable callback. The
authorizer accepts only configured SHA-256 pairing-code hashes, approved
manager and location IDs, requested scopes allowed for the device mode, and
unexpired UTC policy windows. Audit payloads expose only a short pairing-code
fingerprint, counts, denied scopes, and timing metadata; raw pairing codes and
full hashes are intentionally omitted.
The matching settings contract stores only policy metadata for future staging
wiring: `pairing_code_hashes`, `manager_ids`, `location_ids`,
`allowed_scopes_by_mode`, and `expires_at_utc`. Submitted raw pairing-code
fields are ignored.
Staging code can now build the same plan-only authorizer or pairing permission
callback from those sanitized settings through
`OfflineDevicePairingAuthorizerFactory`; this does not enable live route
registration.
Health and admin System Status now expose a non-secret policy summary for that
settings-backed path: hash count, manager/location counts, configured mode and
scope counts, expiry presence, and policy configuration issues. Incomplete
settings policies do not produce a route-ready pairing permission callback.
Version `0.91.0` adds the matching staged registration handler assembly
boundary. `OfflineDeviceRegistrationRouteHandlerFactory` can compose the
handler from `$wpdb`, `OfflineDeviceRegistrationRepository`,
`OfflineDeviceRegistrationService`, and the settings-backed pairing authorizer
only when the database and hash-only pairing policy are configured. The pairing
readiness payload now includes `handler_summary` fields for database,
repository, pairing policy, pairing authorizer, and configuration issue state.
This still does not register the live pairing route, and no route-connected
device writes occur by default.

The registration service can consume the same authorizer as a defense-in-depth
stage. When the supplied authorizer denies a parsed pairing request, the
service and injected route handler return status code `403`, keep the
one-time credential payload empty, skip the registration repository, and expose
`offline_device_pairing_authorization_denied` at the route-handler response
boundary.

When the future route is enabled, the planned successful response body is:

```json
{
  "device_id": "device-main-01",
  "device_token": "returned-once-by-live-route",
  "token_expires_at_utc": "2026-06-07T16:00:00Z",
  "schema_version": 1,
  "scopes": ["offline_pull", "offline_push", "kiosk"],
  "sync_routes": {
    "pull": "/wp-json/tcg-store/v1/offline/pull",
    "push": "/wp-json/tcg-store/v1/offline/push",
    "conflicts": "/wp-json/tcg-store/v1/offline/conflicts"
  },
  "first_sync_required": true,
  "server_time_utc": "2026-06-06T16:00:00Z",
  "branding_sync_required": true
}
```

The planned audit payload intentionally excludes `device_token` and
`token_hash`; live persistence remains disabled.

The planned offline push operation response for an accepted operation is shaped
as:

```json
{
  "client_operation_id": "op-00001",
  "status": "accepted",
  "code": "inventory_reserved",
  "details": {
    "canonicalStatus": "reserved",
    "rowVersion": 5
  },
  "server_time_utc": "2026-06-06T19:00:00Z"
}
```

Conflict outcomes additionally include a deterministic `conflict_id` in
`details` and a future `tcg_sync_conflicts` row containing server payload,
device payload, row versions, severity, summary, and manager resolution
options. Live operation result persistence, canonical entity mutation, conflict
row insertion, and cursor advancement remain disabled until staging tests pass.

The planned batch response wraps per-operation results with stable counts:

```json
{
  "batch_id": "batch-main-01",
  "device_id": "device-main-01",
  "server_time_utc": "2026-06-06T20:00:00Z",
  "operation_count": 3,
  "counts": {
    "accepted": 2,
    "conflict": 1,
    "rejected": 0
  },
  "results": []
}
```

The batch planner requires server snapshots keyed by client operation ID,
`entity_type:entity_id`, or operation index before resolving operations.
Route-backed operation options may also be keyed by client operation ID,
`entity_type:entity_id`, or operation index. Current staged options normalize
event reservation payment status so pay-at-store events do not enter the
TopDeck registration queue. Default push route execution, repository-backed
snapshot loading, and operation-options derivation remain disabled unless
staging explicitly injects the route handler dependencies.
Existing operation-row lookup planning now prepares the idempotency read shape
for future route replay checks. The contract selects allowlisted
`tcg_offline_sync_queue` columns by offline device ID and client operation ID,
and the SQL builder returns only a prepared template plus arguments; it does
not execute reads or enable queue replay by default.
Existing operation-row repository adaptation can now explicitly execute that
template in staged tests, returning normalized rows keyed by client operation
ID. Default route wiring still does not call the repository, and loaded rows
are not replayed or mutated automatically.

Schema migration `0008_offline-sync` now defines the future persistence tables
for registered offline devices, idempotent operation queue/result rows,
manager-reviewed conflicts, and per-device pull cursors. The REST route
contracts still report the offline endpoints as disabled by default until the
permission callbacks and repository-backed handlers are wired through staging.
Offline push persistence planning now maps accepted/rejected/conflict batch
results into future queue rows, conflict rows, idempotent replay rows, and
redacted audit payloads before any live database writes are enabled.
Offline REST request adaptation now provides the future handler bridge for
request bodies, query filters, route params such as `conflict_id`, and
idempotency headers without enabling those handlers by default.
Offline device registration route handler adaptation now exercises that bridge
for staged pairing tests through injected controller callbacks, but default
controller callbacks and route registration remain disabled.
Offline device pairing permission callback adaptation now adds the matching
opt-in permission boundary for staged pairing routes, including parser-backed
request validation and injected manager/pairing authorization while the default
factory returns no pairing callback.
Route registration readiness also requires an injected controller handler for
the route callback; default disabled controller methods remain non-registerable.
Parser-only validation handlers now exercise that bridge through injected
controller callbacks and explicitly report `write_deferred` and
`route_still_gated` in accepted validation summaries.

Registered-device access policy checks are implemented for the future
`registered_device` permission boundary. The policy validates active status,
revocation timestamps, token expiry, required scopes, supported modes/scopes,
location IDs, and UTC timestamps before a pull, push, or conflict request can
proceed. Offline bearer-token authentication planning now adds header
normalization, token shape validation, SHA-256 token hash comparison,
persisted device ID validation, and secret-free accepted contexts. Offline
token lookup planning now adds hashed repository filters and audit
fingerprints without raw token retention. Offline session planning adds future
last-seen update rows and authenticated session context. Registered-device
permission planning now exposes the future callback assembly contract without
querying the database or mutating device rows. Registered device row
normalization now defines the repository-row input contract for that assembly
boundary without performing the repository query itself. Registered device
lookup-query planning now defines the future repository lookup arguments while
still leaving SQL execution disabled. Permission planning now exposes those
arguments when a device row has not been loaded yet. Offline device session
update repository adaptation now applies validated last-seen updates when
explicitly called, but route-connected device row repository queries,
permission callback wiring, route-connected last-seen writes, and REST route
registration remain disabled until staging tests pass.

The planned conflict list request accepts query/body filters shaped as:

```json
{
  "device_id": "device-main-01",
  "statuses": ["open", "assigned", "resolving"],
  "entity_types": ["inventory", "event", "customer_credit"],
  "cursor": "conflict-cursor-10",
  "page_size": 50,
  "include_resolved": false,
  "schema_version": 1
}
```

The planned conflict resolution body is shaped as:

```json
{
  "resolution_id": "resolution-main-01",
  "device_id": "device-main-01",
  "manager_id": 15,
  "resolution_action": "manager_adjust",
  "resolution_note": "Adjusted after staff verified scan",
  "expected_conflict_version": 12,
  "resolved_at_utc": "2026-06-06T17:00:00Z",
  "resolution_payload": {
    "accepted_inventory_status": "sold"
  },
  "schema_version": 1
}
```

Supported conflict resolution actions are `accept_server`, `accept_device`,
`manager_adjust`, `retry_operation`, and `dismiss`. Live conflict repository
reads, mutation writes, manager audit persistence, and resolved-state
propagation remain disabled until staging integration tests pass.

The planned conflict list response is shaped as:

```json
{
  "device_id": "device-main-01",
  "schema_version": 1,
  "server_time_utc": "2026-06-06T18:00:00Z",
  "cursor": "conflict-cursor-11",
  "has_more": true,
  "filters": {
    "statuses": ["open", "assigned"],
    "entity_types": ["inventory", "event"],
    "include_resolved": false
  },
  "conflicts": [
    {
      "conflict_id": "conflict-main-01",
      "status": "open",
      "entity_type": "inventory",
      "entity_id": "inv-1001",
      "conflict_type": "double_sell",
      "severity": "blocking",
      "summary": "Online sale and offline sale both claimed item",
      "row_version": 7,
      "server_row_version": 12,
      "device_row_version": 11,
      "detected_at_utc": "2026-06-06T17:50:00Z",
      "updated_at_utc": "2026-06-06T17:55:00Z",
      "server_payload": {},
      "device_payload": {},
      "resolution_options": ["accept_server", "accept_device"]
    }
  ]
}
```

When a future conflict resolution request is accepted, the planner prepares a
response shaped as:

```json
{
  "conflict_id": "conflict-main-01",
  "resolution_id": "resolution-main-01",
  "status": "resolved",
  "row_version": 13,
  "resolution_action": "manager_adjust",
  "resolved_at_utc": "2026-06-06T18:00:00Z",
  "server_time_utc": "2026-06-06T18:05:00Z",
  "schema_version": 1
}
```

The corresponding planned audit payload records a deterministic hash of the
resolution payload instead of storing the full adjustment payload. Live conflict
mutation writes and audit persistence remain disabled until staging tests pass.

## WooCommerce Hook Map

| Hook / interface | Responsibility |
| --- | --- |
| `woocommerce_add_to_cart_validation` | Require `inventory_id`, reserve atomically, reject unavailable items |
| `woocommerce_add_cart_item_data` | Store reservation ID, inventory ID, barcode, and immutable display snapshot |
| `woocommerce_get_cart_item_from_session` | Restore metadata and revalidate reservation ownership/expiry |
| `woocommerce_check_cart_items` | Revalidate every exact item before cart/checkout |
| `woocommerce_before_calculate_totals` | Set server-authoritative serialized item price; never trust client price |
| `woocommerce_checkout_create_order_line_item` | Persist inventory/reservation snapshots via CRUD |
| `woocommerce_store_api_checkout_update_order_from_request` | Apply required Store API checkout metadata |
| `woocommerce_store_api_checkout_order_processed` | Final pre-payment reservation/order linkage for Checkout Blocks |
| `woocommerce_payment_complete` | Convert active reservations to sold idempotently |
| `woocommerce_order_status_changed` | Reconcile processing/completed/cancelled/failed/refunded transitions |
| `woocommerce_order_status_cancelled` | Release eligible reservations |
| `woocommerce_order_status_failed` | Release eligible reservations after payment failure |
| `woocommerce_refund_created` / `woocommerce_order_refunded` | Move exact items to returned or pending review |
| `woocommerce_cart_item_removed` | Release reservation unless retained by another valid cart/order state |
| `woocommerce_cart_emptied` | Release all cart-owned active reservations |
| Action Scheduler cleanup action | Expire orphaned reservations and reconcile Woo sessions |

Checkout Blocks support is tested explicitly. Legacy hooks are used only where
WooCommerce documents them as migrated/supported; block extension interfaces
are preferred for client-visible UI.

Current implementation status: the serialized cart item metadata validator is
implemented and tested for exact inventory/reservation IDs, owner token hashes,
single-item quantities, price snapshots, ISO currency, and unexpired
reservations. The order-line metadata planner is implemented and tested for
exact inventory, reservation, owner-token, price snapshot, currency, expiry,
optional card descriptors, and deterministic snapshot hashes. The order
lifecycle planner is implemented and tested for checkout order linkage,
payment-complete conversion, failed/cancelled release, refund return-review
planning, duplicate reservation guards, and non-serialized line skipping. The
live WooCommerce hooks listed above remain disabled until the full staging
checkout lifecycle suite passes.

## Authentication

- Same-origin WordPress admin/staff UI: secure cookies plus `X-WP-Nonce`.
- External trusted admin tools: WordPress Application Passwords over HTTPS where
  appropriate.
- Offline/kiosk devices: plugin-issued scoped bearer token with hashed server
  storage, device ID, location, mode, expiry, and rotation.
- Provider webhooks: raw-body signature verification, timestamp tolerance,
  provider event ID deduplication, then asynchronous processing.

## API Versioning

Breaking changes require `/v2` or an explicit compatibility layer. Additive
fields are allowed in `/v1`. Enum additions must be treated as unknown by
clients rather than crashing.
