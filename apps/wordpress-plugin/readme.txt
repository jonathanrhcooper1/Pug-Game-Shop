=== TCG Store Platform ===
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 0.145.0
License: Proprietary

Serialized trading-card inventory and store operations for WooCommerce.

== Description ==

Phase 1 provides the platform foundation: migrations, roles and capabilities,
settings, structured logging, audit logging, REST health checks, feature flags,
Action Scheduler integration, and WooCommerce HPOS compatibility reporting.
Phase 1.5 adds white-label company branding settings for configurable company
identity, URLs, receipt text, theme colors, staging banner color, and CSS
variable export.
Phase 2 foundations add inventory/pricing schema contracts and local business
rule helpers.
Phase 3 foundations add Events and TopDeck schema contracts, event status
helpers, and a TopDeck adapter with default-disabled event creation.
Phase 3 ScryDex sync foundations add sync tables, checkpoint/resume helpers, a
mock-backed provider adapter, and card/price normalization.
Phase 3.1 adds read-only public event REST endpoints and shortcodes.
Phase 3.2 adds local free/pay-at-store event registration writes.
Phase 6.1 adds customer credit schema, ledger policy helpers, and idempotent
posting internals.
Phase 6.1.1 adds customer credit REST route contracts and posting payload
validation while keeping live endpoints disabled.
Phase 6.1.2 adds customer credit REST response presentation with safe ledger
metadata redaction while keeping live endpoints disabled.
Phase 6.2 adds buylist schema and submission status helpers.
Phase 6.2.1 adds buylist REST route contracts and submission intake payload
validation while keeping live write APIs disabled.
Phase 6.2.2 adds buylist offer planning for reviewed item offers, totals,
approval thresholds, and deterministic offer fingerprints.
Phase 4 foundations add exact inventory reservation schema plus active-claim,
release, and conversion service checks.
Phase 4.1 adds reservation expiry cleanup planning and explicit expired-hold
release transitions.
Phase 2.2 adds manager override policy helpers for below-minimum sale approval.
Phase 2.2.1 adds manager override persistence and audit payload planning.
Phase 4.2 adds serialized cart item metadata validation for WooCommerce
checkout hook preparation.
Phase 4.3 adds WooCommerce serialized inventory hook contracts for cart,
checkout, payment, refund, cart removal, and Store API validation flows.
Phase 4.4 adds WooCommerce order-line metadata snapshot planning for exact
inventory checkout lines.
Phase 4.5 adds WooCommerce order lifecycle transition planning for checkout,
payment-complete, failed/cancelled, and refund order events.
Phase 1.3 adds dependency-free REST route contract coverage for health and
public Events endpoints.
Phase 1.4 adds migration runner plan coverage for clean install, upgrade,
idempotent current-schema rerun, and rollback order.
Phase 9.2 adds TopDeck registration push adapter mapping for queued event
registration workers.
Phase 7.1 adds shared offline sync conflict policy tests for inventory, events,
customer credit, and device revocation.
Phase 7.2 adds offline device pairing, push, pull, and conflict REST route
contracts while keeping live endpoints disabled.
Phase 7.3 adds offline push operation envelope validation while keeping queue
replay and live endpoint registration disabled.
Phase 7.4 adds offline pull request validation while keeping live pull workers
disabled.
Phase 7.5 adds offline pull response presentation while keeping live pull
queries and cursor advancement disabled.
Phase 7.6 adds offline device pairing request validation while keeping live
device token issuance disabled.
Phase 7.7 adds offline device registration planning while keeping live device
row writes and token issuance disabled.
Phase 7.8 adds offline device access policy checks while keeping live bearer
token lookup and route permission wiring disabled.
Phase 7.9 adds offline conflict list and resolution request validation while
keeping live conflict reads and mutation disabled.
Phase 7.10 adds offline conflict list response presentation while keeping live
conflict repository reads disabled.
Phase 7.11 adds offline conflict resolution planning while keeping live
conflict mutation writes disabled.
Phase 7.12 adds offline push operation resolution planning while keeping live
queue replay and conflict persistence disabled.
Phase 7.13 adds offline push batch resolution planning while keeping live route
handlers and queue persistence disabled.
Phase 7.14 adds offline sync persistence schema while keeping live offline route
handlers, token lookup, queue replay, conflict writes, and cursor advancement
disabled.
Phase 7.15 adds offline push persistence planning while keeping live database
transactions and route handlers disabled.
Phase 7.16 adds offline bearer-token authentication planning while keeping
live device row lookup and REST permission callback wiring disabled.
Phase 7.17 adds offline device token lookup planning while keeping live device
row repository queries and route permission callback wiring disabled.
Phase 7.18 adds offline device session planning while keeping live last-seen
database writes and route permission callback wiring disabled.
Phase 7.19 adds registered-device permission planning while keeping live
device row repository queries, route registration, and database writes
disabled.
Phase 7.20 adds registered-device row normalization while keeping live device
row repository queries, route registration, and database writes disabled.
Phase 7.21 adds registered-device lookup-query planning while keeping live
device row repository queries, route registration, and database writes
disabled.
Phase 7.22 integrates registered-device lookup-query planning into permission
planning while keeping live device row repository queries, route registration,
and database writes disabled.
Phase 7.23 adds registered-device lookup query building while keeping live
device row repository execution, route registration, permission callback wiring,
and database writes disabled.
Phase 7.24 adds a registered-device repository adapter while keeping REST route
permission wiring, last-seen writes, queue replay, and database writes disabled.
Phase 7.25 adds a registered-device permission resolver while keeping REST
route permission wiring, last-seen writes, queue replay, and database writes
disabled.
Phase 7.26 adds offline device session update query building while keeping
REST route permission wiring, last-seen writes, queue replay, and database
writes disabled.
Phase 7.27 adds offline device session update repository adaptation while
keeping REST route permission wiring, queue replay, and route-connected
database writes disabled.
Phase 7.28 adds opt-in registered-device permission resolution session update
application while keeping REST route registration and permission callback
wiring disabled.
Phase 7.29 adds a planned registered-device permission callback adapter while
keeping REST route registration disabled.
Phase 7.30 adds planned route permission callback factory wiring and
registered-device route scopes while keeping REST route registration disabled.
Phase 7.31 adds planned offline route registration metadata while keeping REST
route registration disabled.
Phase 7.32 adds a fail-closed offline controller scaffold while keeping REST
route registration disabled.
Phase 7.33 adds a guarded offline route registrar while keeping current REST
route registration disabled.
Phase 7.34 adds offline REST request adaptation and injected controller
dispatch while keeping current REST route registration disabled.
Phase 7.35 adds parser-only offline route validation handlers while keeping
route registration and live database writes disabled.
Phase 7.36 adds offline route bootstrap planning while keeping route
registration and live database writes disabled.
Phase 7.37 adds offline route bootstrap status reporting to health and admin
System Status while keeping route registration disabled.
Phase 7.38 wires the offline route bootstrapper to `rest_api_init` while
keeping the guarded registrar deferred until feature and route readiness gates
pass.
Phase 7.39 adds deferred bootstrap health reporting and WordPress smoke checks
for the `rest_api_init` bootstrapper hook while keeping route registration
disabled.
Phase 7.40 adds offline device registration insert query planning while
keeping live device row writes and route registration disabled.
Phase 7.41 adds offline device registration repository adaptation while
keeping live pairing routes and route-connected device writes disabled.
Phase 7.42 adds offline device registration credential issuance while keeping
live pairing routes and production token issuance disabled.
Phase 7.43 adds offline device registration service orchestration while
keeping live pairing routes and route-connected writes disabled.
Phase 7.44 adds an opt-in offline device registration route handler adapter
while keeping default controller callbacks and route registration disabled.
Phase 7.45 adds an opt-in offline device pairing permission callback adapter
while keeping the default pairing route permission locked.
Phase 7.46 requires explicitly injected offline controller handlers before
future route registration plans can mark controller callbacks ready.
Phase 7.47 allows staged pairing permission callbacks without a
registered-device resolver while keeping pull/push permission callbacks locked
without that resolver.
Phase 7.48 requires configured pairing authorizers before staged pairing
permission callbacks are treated as route-ready.
Phase 7.49 adds a staged offline device pairing route readiness summary for
handler, permission, feature-gate, and disabled-route checks while keeping live
route registration deferred.
Phase 7.50 surfaces staged offline device pairing route readiness in
authenticated health output and admin System Status while keeping live route
registration deferred.
Phase 7.51 adds plan-only offline device pairing authorization for hashed
pairing-code policies, manager/location allowlists, mode-specific scopes, UTC
expiry checks, and secret-free audits while keeping live route registration
deferred.
Phase 7.52 lets the offline device registration service optionally require
pairing authorization before issuing credentials or calling the registration
repository while keeping live route registration deferred.
Phase 7.53 maps denied pairing authorization through the staged registration
route handler with a distinct 403 response code while keeping live route
registration deferred.
Phase 7.54 adds hash-only offline pairing authorization settings for future
staged policy wiring while keeping raw pairing codes out of saved settings.
Phase 7.55 adds a settings-backed pairing authorizer factory for future staged
callback wiring while keeping live route registration deferred.
Phase 7.56 surfaces offline pairing policy readiness in health and System
Status while keeping live route registration deferred.
Phase 7.57 adds staged offline device registration route-handler assembly from
database and hash-only pairing policy readiness while keeping live route
registration deferred.
Phase 7.58 adds staged registered-device permission resolver assembly and
health/admin readiness reporting while keeping live route registration
deferred.
Phase 7.59 adds staged registered-device sync route handler readiness for
parser-only pull/push controller callbacks while keeping live route
registration and route-connected writes deferred.
Phase 7.60 adds a staged offline pull response handler that returns
presenter-shaped empty domain responses while keeping live pull queries, cursor
advancement, route registration, and route-connected writes deferred.
Phase 7.61 adds offline pull change-query planning for branding, inventory,
customer credit, events, and conflicts domains while keeping query execution,
tombstone reads, cursor advancement, and route registration deferred.
Phase 7.62 surfaces pull change-query planner readiness in authenticated
health output and admin System Status while keeping trusted device context
handoff, query execution, tombstone reads, and cursor advancement deferred.
Phase 7.63 adds offline pull change-query SQL template planning while keeping
cursor filtering, query execution, tombstone reads, cursor advancement, route
registration, and route-connected writes deferred.
Phase 7.64 adds offline pull change repository adaptation while keeping
route-connected pull execution, cursor advancement, tombstone reads, route
registration, and route-connected writes deferred.
Phase 7.65 adds offline pull change-set provider composition while keeping
default route wiring, cursor advancement, tombstone reads, route registration,
and route-connected writes deferred.
Phase 7.66 adds offline pull device context planning while keeping default
route wiring, cursor advancement, tombstone reads, route registration, and
route-connected writes deferred.
Phase 7.67 adds route-aware offline pull change-set provider handoff for
explicitly injected handlers while keeping default route-connected reads,
cursor advancement, tombstone reads, route registration, and route-connected
writes deferred.
Phase 7.68 adds offline pull cursor advancement planning while keeping cursor
writes, route registration, and route-connected writes deferred.
Phase 7.69 adds offline pull cursor SQL planning while keeping cursor upsert
execution, route registration, and route-connected writes deferred.
Phase 7.70 adds explicit offline pull cursor repository adaptation while
keeping default route cursor execution and route-connected writes deferred.
Phase 7.71 adds route-aware offline pull cursor advancement provider
composition while keeping default route execution and route-connected writes
deferred.
Phase 7.72 adds explicit pull handler cursor advancement orchestration while
keeping default cursor advancement and route-connected writes deferred.
Phase 7.73 adds staged pull route handler factory composition while keeping
route dependency injection disabled by default.
Phase 7.74 adds offline push persistence SQL and repository staging while
keeping queue replay, canonical mutations, and route-connected writes disabled.
Phase 7.75 adds staged offline push route handler factory composition while
keeping default route execution, route registration, and route-connected writes
disabled.
Phase 7.76 adds offline push server snapshot query planning while keeping
snapshot execution, repository loading, canonical mutations, and route reads
deferred.
Phase 7.77 adds explicit offline push server snapshot repository loading while
keeping default route-connected reads, route registration, queue replay, and
canonical mutations deferred.
Phase 7.78 adds route-aware offline push server snapshot provider composition
for explicitly enabled staged handlers while keeping default route-connected
reads, route registration, queue replay, and canonical mutations deferred.
Phase 7.79 adds route-aware offline push operation-options provider composition
for explicitly enabled staged handlers while keeping default route execution,
route registration, TopDeck queue workers, and canonical mutations deferred.
Phase 7.80 adds offline push existing operation-row query planning for future
idempotent replay checks while keeping repository reads, queue replay,
route registration, and canonical mutations deferred.
Phase 7.81 adds explicit offline push existing operation-row repository
adaptation for staged replay candidate reads while keeping default route reads,
queue replay, route registration, and canonical mutations deferred.
Phase 7.82 adds route-aware offline push existing operation-row provider
composition for explicitly enabled staged handlers while keeping default route
execution and live route registration deferred.
Phase 7.83 surfaces staged offline push replay counts and operation IDs in
route response metadata while keeping queue replay workers and canonical
mutations deferred.
Phase 7.84 annotates staged offline push response results with per-operation
persistence status so duplicate pushes identify replayed rows without enabling
queue replay workers or canonical mutations.
Phase 7.85 hydrates staged duplicate-push response results from stored queue
rows so replayed operations return their original result details while queue
replay workers and canonical mutations remain disabled.
Phase 7.86 adds plan-only canonical mutation descriptors for accepted offline
push inventory, event, and credit operations while canonical entity writes,
queue replay workers, and route registration remain disabled.
Phase 7.87 connects canonical mutation planning into explicitly enabled staged
push route processing, skipping replayed operations so duplicate pushes cannot
plan duplicate canonical writes.
Phase 7.88 adds staged canonical mutation SQL-template planning for guarded
inventory updates plus event and customer-credit lookup guards, with canonical
write execution and repositories still deferred.
Phase 7.89 connects canonical mutation SQL-template planning into explicitly
enabled staged push route responses, meta, and audits while canonical write
execution and repositories remain deferred.
Phase 7.90 adds a deferred canonical mutation repository scaffold and audit
result contract while inventory, event, credit-ledger, and TopDeck writes
remain disabled.
Phase 7.91 connects deferred canonical mutation repository staging into
explicitly enabled staged push route responses, meta, and audits while
canonical repository execution remains disabled.
Phase 7.92 adds a canonical mutation repository execution gate so staged push
routes report blocked/ready/rejected execution status and transaction-adapter
deferral before any canonical writes can run.
Phase 7.93 adds canonical mutation transaction preflight metadata to classify
staged query kinds before any future transaction executor can run.
Phase 8.1 adds POS/payment reconciliation policy tests for sandbox responses,
scan-gated sales, refunds, declines, and unmapped line conflicts.
Phase 8.2 adds POS transaction-ingestion contract tests for sandbox adapter
events, provider idempotency, duplicate-event replay, refund ingestion, durable
conflict signaling, and configurable fee estimates without hardcoded live
rates.
Phase 8.3 adds POS/payment schema migration 0009 for idempotent POS sync logs,
masked payment provider logs, and effective-dated fee snapshots.
Phase 8.4 adds POS/payment log payload planning for redacted provider rows,
per-line POS reconciliation rows, conflict/replay summary rows, and audit
metadata while keeping live provider writes disabled.
Phase 8.5 adds POS/payment log SQL-template planning for validated insert
templates, prepare-argument metadata, tamper rejection, and deferred repository
execution.
Phase 8.6 adds POS/payment log repository staging and execution-gate metadata
while keeping live repository execution, provider capture, and inventory writes
disabled.
Phase 8.7 adds POS/payment transaction preflight metadata while keeping
transaction execution, repository inserts, provider capture, and inventory
writes disabled.
Phase 8.8 adds explicit staged POS/payment log insert execution while keeping
route-connected writes, provider capture, provider inventory writes, and
WooCommerce gateway capture disabled.
Phase 8.9 adds staged POS/payment transaction execution around approved log
inserts with begin/commit/rollback handling while keeping live route writes,
provider capture, provider inventory writes, and gateway capture disabled.
Phase 8.10 adds planned POS/payment REST route contracts for webhooks, event
ingestion, reconciliation, conflicts, and fee snapshots while keeping route
registration and live writes disabled.
Phase 8.11 adds POS/payment route readiness planning and health/admin status
presentation while keeping route registration, webhooks, provider capture,
provider inventory writes, and WooCommerce gateway capture disabled.
Phase 8.12 adds fail-closed POS/payment permission callbacks and a manager-only
`manage_pos` capability while keeping route registration and webhook processing
disabled.
Phase 8.13 adds a fail-closed POS/payment controller scaffold for every planned
route callback while keeping default route execution disabled.
Phase 8.14 adds POS/payment route registration planning metadata while keeping
all current route registration disabled.
Phase 8.15 adds a guarded POS/payment route registrar while keeping all
current POS/payment routes unregistered by default.
Phase 8.16 adds POS/payment route bootstrap planning and health/admin status
presentation while keeping all current POS/payment routes unregistered by
default.
Phase 8.17 wires the POS/payment route bootstrapper to `rest_api_init` while
keeping all current POS/payment routes unregistered by default.
Phase 8.18 adds POS/payment route dependency health/admin status while keeping
route registration and live writes deferred.
Phase 8.19 adds parser-only POS/payment route validation handlers while
keeping route registration and live writes deferred.
Phase 3.3 adds ScryDex sync page processing for normalized upsert planning and
checkpoint advancement.
Phase 3.4 adds ScryDex reference-card persistence planning for inserts, updates,
unchanged rows, and current price observations.

Inventory and commerce modules remain disabled until their implementation phases.

== Installation ==

1. Install and activate WooCommerce 8.2 or newer.
2. Upload the complete `wordpress-plugin` directory.
3. Activate TCG Store Platform.
4. Open TCG Store > System Status and resolve any dependency warnings.

== Changelog ==

= 0.145.0 =

* Added parser-only POS/payment route validation handlers for every planned
  controller callback.
* Updated POS/payment route dependency assembly so default controller handlers
  are staged while route registration and writes remain deferred.
* Added unit and WordPress smoke coverage for parser-only POS/payment handler
  readiness and validation responses.
* Kept current POS/payment route registration, webhook processing, provider
  capture, provider inventory writes, and WooCommerce gateway capture disabled.

= 0.144.0 =

* Added POS/payment route dependency factory and status presenter for
  controller handler, permission callback, webhook verifier, registrar, and
  bootstrapper readiness diagnostics.
* Added authenticated health payload, admin System Status row, unit coverage,
  and WordPress smoke assertions for default blocked POS/payment dependencies.
* Kept current POS/payment route registration, webhook processing, provider
  capture, provider inventory writes, and WooCommerce gateway capture disabled.

= 0.143.0 =

* Added POS/payment route bootstrapper orchestration and `rest_api_init`
  wiring.
* Added unit and WordPress smoke coverage proving the bootstrapper remains
  inert by default and does not register POS/payment REST routes.
* Kept current POS/payment route registration, webhook processing, provider
  capture, provider inventory writes, and WooCommerce gateway capture disabled.

= 0.142.0 =

* Added POS/payment route bootstrap planner and status presenter for
  blocked/gated/ready route-registration orchestration diagnostics.
* Added authenticated health payload and admin System Status row for
  POS/payment route bootstrap status.
* Added unit and WordPress smoke coverage proving POS/payment route bootstrap
  stays blocked with zero registerable routes by default.
* Kept current POS/payment route registration, webhook processing, provider
  capture, provider inventory writes, and WooCommerce gateway capture disabled.

= 0.141.0 =

* Added a guarded POS/payment route registrar that registers only future route
  plans marked enabled by the POS/payment route registration planner.
* Added registrar coverage for disabled default routes, future read routes,
  missing permission callbacks, missing controller handlers, deferred writes,
  future write routes, and future webhook routes.
* Kept current POS/payment route registration, webhook processing, provider
  capture, provider inventory writes, and WooCommerce gateway capture disabled.

= 0.140.0 =

* Added POS/payment route registration planning metadata for every planned
  webhook, event, reconciliation, conflict, and fee-snapshot route.
* Added registration block reasons for disabled routes, deferred route
  registration, deferred route-connected writes, deferred webhook
  registration, missing permission callbacks, and missing controller handlers.
* Added future-read, future-write, and future-webhook route registration
  tests proving only explicitly cleared staging gates can produce enabled
  route args.
* Kept current POS/payment route registration, webhook processing, provider
  capture, provider inventory writes, and WooCommerce gateway capture disabled.

= 0.139.0 =

* Added a fail-closed POS/payment controller scaffold for planned webhook,
  event ingestion/status, reconciliation, conflict, and fee-snapshot route
  callbacks.
* Added controller coverage for disabled default responses, injected handler
  dispatch, normalized request data, and handler readiness reporting.
* Added readiness metadata for injected POS/payment controller handlers.
* Kept POS/payment route registration, webhook processing, provider capture,
  provider inventory writes, and WooCommerce gateway capture disabled.

= 0.138.0 =

* Added fail-closed POS/payment permission callback adapters and factory for
  manager/system POS routes, conflict/settings routes, and signed provider
  webhook routes.
* Added `manage_pos` to manager/system capabilities and kept it out of staff
  roles.
* Added readiness metadata for injected POS/payment permission callbacks.
* Kept POS/payment route registration, webhook processing, provider capture,
  provider inventory writes, and WooCommerce gateway capture disabled.

= 0.137.0 =

* Added POS/payment route readiness planning and health/admin status
  presentation for planned webhook, event ingestion, reconciliation, conflict,
  and fee-snapshot routes.
* Added readiness coverage for feature gating, missing route handlers,
  missing permission callbacks, transaction executor deferral, webhook verifier
  requirements, and production safety deferrals.
* Kept route registration, route-connected POS/payment writes, provider
  capture, provider inventory writes, webhook routes, and WooCommerce gateway
  capture disabled.

= 0.136.0 =

* Added planned POS/payment REST route contracts for provider webhooks, POS
  event ingestion/status, reconciliation runs, conflict review/resolution, and
  fee snapshots.
* Added route contract coverage for disabled-by-default registration, workflow
  labels, permissions, route-connected write deferral, provider capture
  deferral, provider inventory deferral, webhook deferral, and gateway capture
  deferral.
* Kept route registration, route-connected POS/payment writes, provider
  capture, provider inventory writes, webhook routes, and WooCommerce gateway
  capture disabled.

= 0.135.0 =

* Added a staged POS/payment transaction executor and result contract for
  preflight-approved log writes.
* Added coverage for commit success, blocked preflight rejection, begin
  failure rejection, repository failure rollback, and commit failure rollback.
* Kept route-connected POS/payment writes, provider capture, provider
  inventory writes, webhook routes, and WooCommerce gateway capture disabled.

= 0.134.0 =

* Added an explicit POS/payment log execution repository for preflight-approved
  staged `tcg_pos_sync_log` and `tcg_payment_provider_log` inserts.
* Added coverage for successful prepared inserts, blocked preflight rejection,
  invalid query-plan rejection, table-prefix mismatch rejection, and failed
  insert partial counts.
* Kept route-connected POS/payment writes, provider capture, provider
  inventory writes, webhook routes, and WooCommerce gateway capture disabled.

= 0.133.0 =

* Added POS/payment transaction preflight metadata for staged POS sync and
  payment provider log insert results.
* Added coverage for inherited execution-gate blocks, explicit ready states,
  unsupported query-kind blocking, and rejected repository staging.
* Kept transaction execution, live repository inserts, provider capture,
  provider inventory writes, and route-connected POS/payment writes disabled.

= 0.132.0 =

* Added POS/payment log repository staging for deferred POS sync and payment
  provider insert plans.
* Added execution-gate metadata for blocked/ready/rejected repository states,
  explicit execution requirements, transaction-adapter deferral, and zero
  affected rows.
* Kept live repository execution, provider capture, provider inventory writes,
  and route-connected POS/payment writes disabled.

= 0.131.0 =

* Added POS/payment log SQL-template planning for `tcg_pos_sync_log` and
  `tcg_payment_provider_log` insert rows.
* Added validation for table prefixes, planned POS rows, planned payment rows,
  JSON payloads, timestamps, idempotency keys, and tampered source plans.
* Kept POS/payment repository execution, live provider capture, and inventory
  writes disabled.

= 0.130.0 =

* Added POS/payment log payload planning for redacted provider operation rows,
  per-line POS sync rows, conflict/replay summary rows, deterministic
  idempotency keys, and audit metadata.
* Added planner coverage for sale reconciliation, unmapped-line conflicts,
  duplicate-event replay, redacted raw payloads, and missing required fields.
* Kept live Square/POS calls, payment capture, webhook routes, and inventory
  writes disabled.

= 0.129.0 =

* Added POS/payment schema migration 0009 for `tcg_pos_sync_log`,
  `tcg_payment_provider_log`, and `tcg_payment_fee_snapshots`.
* Added schema and migration runner coverage for POS idempotency indexes,
  masked provider payload fields, fee snapshot effective dates, dbDelta
  compatibility, and rollback order.
* Updated smoke coverage for database target 9 while keeping live provider
  writes and webhook routes disabled.

= 0.128.0 =

* Added POS transaction-ingestion contracts for sandbox adapter events,
  provider event idempotency, duplicate-event replay, sale/refund routing, and
  deferred route-write metadata.
* Added configurable POS fee-estimate comparison using explicit sandbox
  fixtures with no hardcoded live rates.
* Expanded POS/payment tests for scan-gated sale ingestion, refund ingestion,
  durable conflicts, invalid event IDs, replay, and fee comparison.

= 0.127.0 =

* Added canonical mutation transaction preflight metadata after repository
  staging and execution-gate evaluation.
* Classified inventory guarded updates as preflight-ready while event
  registration and customer-credit ledger write plans remain deferred.
* Added route response, route meta, sync readiness, smoke, and unit coverage
  for preflight status, counts, block reasons, and transaction deferral.

= 0.126.0 =

* Added a canonical mutation repository execution gate for staged offline push
  mutations.
* Surfaced execution status, block reasons, ready state, transaction deferral,
  and gate audit metadata in route responses, route meta, sync readiness, and
  smoke coverage.
* Kept canonical repository writes disabled by default while giving future
  transaction execution an explicit approval boundary.

= 0.125.0 =

* Connected deferred canonical mutation repository staging into explicitly
  enabled staged push route responses, route meta, and audits.
* Reported repository status, query counts, operation IDs, prepare-argument
  counts, zero affected rows, and deferred execution flags for fresh and
  replayed staged push operations.
* Added route factory, sync readiness, smoke, and unit coverage for
  route-connected canonical repository staging metadata.

= 0.124.0 =

* Added a deferred canonical mutation repository scaffold and result contract.
* Added repository audit metadata for canonical SQL query counts, operation
  IDs, prepare-argument counts, deferred execution flags, and zero rows
  affected.
* Added readiness, smoke, and unit coverage for the canonical mutation
  repository contract while keeping inventory, event, credit-ledger, and
  TopDeck writes disabled.

= 0.123.0 =

* Added route-connected canonical mutation SQL planning metadata to explicitly
  enabled staged push responses, route meta, and audits.
* Reported canonical SQL query counts, operation IDs, prepare-argument counts,
  and deferred execution/repository flags for fresh accepted operations.
* Reported replayed duplicate operations as zero-query canonical SQL plans
  while preserving the original replay response.
* Added sync readiness, smoke, and unit coverage for route-connected canonical
  SQL planning metadata without enabling execution.

= 0.122.0 =

* Added staged canonical mutation SQL-template planning for accepted offline
  push mutation descriptors.
* Planned guarded inventory status update templates with row-version and
  available-status checks before future canonical writes.
* Planned event registration and customer-credit guard lookup templates while
  registration, ledger, and TopDeck writes remain deferred.
* Added health/admin readiness, smoke coverage, and unit coverage for canonical
  mutation SQL planning without enabling execution.

= 0.121.0 =

* Connected plan-only canonical mutation planning to staged push route
  processing.
* Added route response and audit metadata for canonical mutation counts,
  operation IDs, skipped operation IDs, and skip reasons.
* Skipped replayed duplicate operations before canonical write planning.
* Added route factory, sync readiness, smoke, and unit coverage for canonical
  mutation planning metadata.
* Kept canonical writes, queue replay workers, default route execution, and
  live route registration disabled.

= 0.120.0 =

* Added plan-only canonical mutation planning for accepted offline push
  operations.
* Added deferred mutation descriptors for inventory reservations, event
  registrations, and customer credit redemptions.
* Added skip metadata for conflict and rejected push operations.
* Added health, admin System Status, smoke, and unit coverage for staged
  canonical mutation planner readiness.
* Kept canonical writes, queue replay workers, default route execution, and
  live route registration disabled.

= 0.119.0 =

* Hydrated replayed staged push response results from existing queue rows.
* Added response-source metadata for inserted resolution-plan results and
  replayed existing-queue-row results.
* Added replay response hydration counts and hydrated operation IDs to staged
  push responses and audits.
* Added route handler factory coverage for replayed response details and
  resolved timestamps loaded from stored queue rows.
* Kept queue replay workers, canonical mutations, default route execution, and
  live route registration disabled.

= 0.118.0 =

* Added per-operation persistence annotations to staged offline push response
  results.
* Added an operation persistence-status map to staged push response payloads.
* Added route handler factory coverage for fresh inserted operations and
  duplicate-push replayed operations.
* Kept queue replay workers, canonical mutations, default route execution, and
  live route registration disabled.

= 0.117.0 =

* Added replay count and replay operation ID metadata to staged offline push
  persistence repository audits.
* Surfaced replay metadata in staged push route processing audits and response
  meta for duplicate-push verification.
* Added persistence planner, repository, and route handler factory coverage for
  insert IDs, replay IDs, and duplicate-push response metadata.
* Kept queue replay workers, canonical mutations, default route execution, and
  live route registration disabled.

= 0.116.0 =

* Added route-aware offline push existing operation-row provider composition for
  explicitly enabled staged handlers.
* Staged push route factories now compose queue-row replay candidate reads
  before persistence planning when route-connected execution is explicitly
  enabled.
* Added duplicate push replay coverage proving existing queue rows avoid a
  second queue write.
* Kept default route execution, live route registration, queue replay workers,
  and canonical mutations disabled.

= 0.115.0 =

* Added explicit offline push existing operation-row repository adaptation for
  staged idempotent replay preparation.
* Added queue-row normalization, duplicate row rejection, database failure
  handling, and repository audit metadata for replay candidate reads.
* Added readiness metadata for staged existing operation-row repository
  availability while default route reads remain deferred.
* Kept route-connected query execution by default, queue replay, canonical
  mutations, and live route registration disabled.

= 0.114.0 =

* Added offline push existing operation-row query planning for future
  idempotent replay checks against `tcg_offline_sync_queue`.
* Added prepared SQL template building for existing operation-row lookups by
  offline device ID and client operation IDs.
* Added readiness metadata for staged existing operation-row query and SQL
  readiness while repository reads and route execution remain deferred.
* Kept route-connected query execution, queue replay, canonical mutations, and
  live route registration disabled.

= 0.113.0 =

* Added a route-aware offline push operation-options provider that normalizes
  event reservation payment status from route payloads.
* Added staged push handler factory coverage proving pay-at-store event
  reservations suppress TopDeck queueing through route-derived options.
* Added readiness metadata for staged push operation-options provider
  availability and deferral.
* Kept default route execution, route registration, queue replay, TopDeck queue
  workers, canonical mutations, and route-connected writes disabled.

= 0.112.0 =

* Added a route-aware offline push server snapshot provider that adapts
  authenticated device context to repository-backed server snapshot reads.
* Added staged push handler factory coverage for repository-backed snapshot
  reads feeding push resolution and queue persistence.
* Added readiness metadata for staged push snapshot route provider availability
  and route-read deferral.
* Kept default route-connected reads, route registration, queue replay,
  canonical mutations, and route-connected writes disabled.

= 0.111.0 =

* Added an explicit offline push server snapshot repository for staged loading
  of inventory, event, and customer-credit rows.
* Added row normalization for resolver-ready server snapshots, including event
  seats remaining and customer-credit minor-unit balance derivation.
* Added readiness metadata for staged push snapshot repository availability and
  execution deferral.
* Kept default route-connected reads, route registration, queue replay,
  canonical mutations, and route-connected writes disabled.

= 0.110.0 =

* Added offline push server snapshot query planning and prepared SQL templates
  for inventory, event, and customer credit snapshot reads.
* Added readiness metadata for push snapshot query planner, SQL template,
  execution deferral, repository deferral, and route-read deferral.
* Kept snapshot query execution, repository-backed snapshot loading, route
  registration, queue replay, canonical mutations, and route-connected writes
  disabled.

= 0.109.0 =

* Added staged offline push route handler and factory composition for explicitly
  enabled push resolution and queue/conflict persistence.
* Added route-aware push persistence provider readiness metadata for handler
  factory, route dependency, queue-write, and conflict-write state.
* Kept default push route execution, route registration, queue replay, canonical
  mutations, and route-connected writes disabled.

= 0.108.0 =

* Added offline push persistence SQL planning for queue and conflict insert
  templates against the existing offline sync schema.
* Added explicit offline push persistence repository execution for staged
  `$wpdb` tests.
* Kept queue replay, conflict persistence by default, canonical mutations,
  route registration, and route-connected writes disabled.

= 0.107.0 =

* Added staged offline pull route handler factory composition for explicitly
  enabled route-aware change-set and cursor-advance providers.
* Added sync handler readiness metadata for pull handler route dependencies,
  route execution enablement, database readiness, and cursor-write deferral.
* Kept default pull route dependencies, route-connected reads, cursor writes,
  route registration, and production route execution disabled.

= 0.106.0 =

* Added opt-in offline pull handler cursor advancement orchestration for
  explicitly injected providers.
* Added cursor advance metadata and fail-closed handling for rejected or invalid
  cursor advance provider results.
* Kept default handler cursor advancement, route registration, and
  route-connected writes disabled.

= 0.105.0 =

* Added route-aware offline pull cursor advancement provider composition for
  explicitly injected route orchestration.
* Added registered-device header resolution, cursor planning, and explicit
  cursor repository invocation coverage.
* Kept default route cursor execution, route registration, and route-connected
  writes disabled.

= 0.104.0 =

* Added explicit offline pull cursor repository adaptation for prepared
  per-device cursor upserts.
* Added repository result audits, database failure handling, and readiness
  metadata for staged cursor repository checks.
* Kept default route cursor execution, route registration, and route-connected
  writes disabled.

= 0.103.0 =

* Added offline pull cursor SQL planning for prepared per-device cursor upsert
  templates.
* Added readiness metadata and smoke coverage for staged cursor SQL planning
  while keeping execution deferred.
* Kept cursor upserts, route registration, and route-connected writes disabled.

= 0.102.0 =

* Added offline pull cursor advancement planning for trusted device context and
  provider change sets.
* Added complete-page cursor row payloads for future `tcg_offline_pull_cursors`
  upserts, with invalid context/time/cursor/change-set rejection.
* Kept cursor writes, route registration, and route-connected writes disabled.

= 0.101.0 =

* Added route-aware offline pull change-set provider handoff for explicitly
  injected pull handlers.
* Added registered-device header resolution and provider fetch coverage without
  session writes or cursor advancement.
* Kept default route-connected reads, tombstone reads, route registration, and
  route-connected writes disabled.

= 0.100.0 =

* Added offline pull device context planning for authorized registered-device
  permission resolutions.
* Added request/device matching, offline device ID/table prefix handoff, and
  secret-free context audit coverage.
* Kept default route wiring, cursor advancement, tombstone reads, route
  registration, and route-connected writes disabled.

= 0.99.0 =

* Added an explicit offline pull change-set provider that composes pull request
  context, query planning, and repository fetches.
* Added provider injection coverage for the staged pull handler without turning
  on default route wiring.
* Kept default route wiring, cursor advancement, tombstone reads, route
  registration, and route-connected writes disabled.

= 0.98.0 =

* Added an explicitly called offline pull change repository adapter for prepared
  change-query plans.
* Added row normalization and pull change-set shaping for branding, inventory,
  customer credit, events, and conflicts repository rows.
* Kept route-connected pull execution, cursor advancement, tombstone reads,
  route registration, and route-connected writes disabled.

= 0.97.0 =

* Added prepared SQL template planning for offline pull change queries across
  branding, inventory, customer credit, events, and conflicts domains.
* Added fail-closed validation for tampered pull query contracts, selected
  columns, filters, cursors, page sizes, and ordering.
* Kept cursor filtering, live pull query execution, tombstone reads, cursor
  advancement, route registration, and route-connected writes disabled.

= 0.96.0 =

* Added non-secret health/admin readiness metadata for staged offline pull
  change-query planning.
* Added supported-domain contract coverage for branding, inventory, customer
  credit, events, and conflicts pull query planning.
* Kept trusted device context handoff, live pull query execution, tombstone
  reads, cursor advancement, route registration, and route-connected writes
  disabled.

= 0.95.0 =

* Added plan-only offline pull change-query contracts for branding, inventory,
  customer credit, events, and conflicts cache domains.
* Added device-scoped conflict pull planning and safe table/column allowlists
  for future pull repositories.
* Kept live pull query execution, tombstone reads, cursor advancement, route
  registration, and route-connected writes disabled.

= 0.94.0 =

* Added a staged offline pull route handler that returns the existing pull
  response contract for valid registered-device pull requests.
* Added tests for empty default pull responses, injected change sets, invalid
  request short-circuiting, and fail-closed provider errors.
* Kept live pull route registration, database change queries, tombstone reads,
  cursor advancement, queue replay, and route-connected writes disabled.

= 0.93.0 =

* Added staged registered-device sync route handler assembly for offline
  pull/push parser-only controller callbacks.
* Added health and admin readiness summaries for staged pull/push handler
  readiness, including write-deferred and route-deferred status.
* Kept live pull/push route registration, queue replay, pull queries, cursor
  advancement, and route-connected database writes disabled.

= 0.92.0 =

* Added staged registered-device permission resolver assembly from `$wpdb`,
  registered-device repository, and session update repository dependencies.
* Added health and admin readiness summaries for registered-device pull/push
  permission planning while keeping controllers and route registration locked.
* Kept current offline routes, live pull/push registration, queue replay, and
  route-connected database writes disabled until staging integration tests pass.

= 0.91.0 =

* Added staged offline device registration route-handler assembly from
  `$wpdb`, the registration repository, the registration service, and the
  settings-backed pairing authorizer.
* Added readiness summaries proving handler assembly remains unavailable until
  database and hash-only pairing policy dependencies are configured.
* Kept current offline routes, live pairing registration, and route-connected
  database writes disabled until staging integration tests pass.

= 0.90.0 =

* Added non-secret offline pairing policy readiness summaries for health and
  admin System Status.
* Added readiness tests proving incomplete settings policies keep staged
  pairing permission callbacks locked.
* Kept current offline routes, live pairing registration, and route-connected
  database writes disabled until staging integration tests pass.

= 0.89.0 =

* Added a settings-backed offline pairing authorizer factory for future staged
  callback wiring.
* Added factory tests proving sanitized hash-only settings authorize valid
  callbacks, raw-code-only settings fail closed, and provider failures do not
  leak pairing secrets.
* Kept current offline routes, live pairing registration, and route-connected
  database writes disabled until staging integration tests pass.

= 0.88.0 =

* Added hash-only offline pairing authorization settings for future staged
  policy wiring.
* Added settings tests for SHA-256 hash allowlists, manager/location allowlists,
  mode scopes, UTC expiry windows, partial updates, and raw pairing-code
  omission.
* Kept current offline routes, live pairing registration, and route-connected
  database writes disabled until staging integration tests pass.

= 0.87.0 =

* Added staged registration route-handler mapping for pairing authorization
  denials.
* Added route-handler tests proving denied pairing returns 403, skips
  credential/repository paths, and omits raw pairing codes.
* Kept current offline routes, live pairing registration, and route-connected
  database writes disabled until staging integration tests pass.

= 0.86.0 =

* Added optional pairing authorization enforcement inside offline device registration service orchestration.
* Added service tests proving authorized pairing can continue to registration
  and denied pairing stops before credential issuance or repository writes.
* Kept current offline routes, live pairing registration, and route-connected
  database writes disabled until staging integration tests pass.

= 0.85.0 =

* Added a plan-only offline device pairing authorizer for hashed pairing-code policy,
  manager/location allowlists, mode-specific scopes, UTC expiry checks, and
  secret-free audit payloads.
* Added authorizer tests for successful pairing authorization, denied policies, missing configuration, and injection into the staged pairing permission callback.
* Kept current offline routes, live pairing registration, and route-connected database writes disabled until staging integration tests pass.

= 0.84.0 =

* Added authenticated health and admin System Status reporting for staged offline device pairing route readiness.
* Added presenter and smoke coverage proving the default pairing route remains blocked, handlerless, permission-locked, and deferred.
* Kept current offline routes, live pairing registration, and route-connected database writes disabled until staging integration tests pass.

= 0.83.0 =

* Added a staged offline device pairing route readiness planner for handler, permission, feature-gate, and disabled-route checks.
* Added tests proving missing dependencies stay blocked, configured staged dependencies report ready-but-gated, and unconfigured authorizers stay locked.
* Kept current offline routes, live pairing registration, and route-connected database writes disabled until staging integration tests pass.

= 0.82.0 =

* Added pairing permission authorizer-readiness checks for staged offline route planning.
* Added adapter, factory, and planner tests proving unconfigured pairing callbacks remain fail-closed and are not treated as ready.
* Kept current offline routes, live pairing registration, and route-connected database writes disabled until staging integration tests pass.

= 0.81.0 =

* Allowed pairing-only offline permission factory setup without a registered-device resolver.
* Added factory and planner tests proving pairing callbacks can be staged independently while registered-device pull/push callbacks stay locked without a resolver.
* Kept current offline routes, live pairing registration, and route-connected database writes disabled until staging integration tests pass.

= 0.80.0 =

* Added offline route handler-readiness enforcement for future staged route registration.
* Added controller, planner, and registrar tests proving default disabled controller methods are not treated as live-ready without injected handlers.
* Kept current offline routes, default controller callbacks, and route-connected database writes disabled until staging integration tests pass.

= 0.79.0 =

* Added an opt-in offline device pairing permission callback adapter for future staged pairing routes.
* Added request-body parsing, injected manager/pairing authorization, authorizer rejection handling, and secret-free audit payloads.
* Kept the default pairing route permission locked and route registration disabled until staging integration tests pass.

= 0.78.0 =

* Added an opt-in offline device registration route handler adapter for the `register_offline_device` controller callback.
* Added registered, invalid, and rejected response envelopes plus retained secret-free audit payloads for injected pairing handlers.
* Kept default controller behavior, live pairing routes, production token issuance, route registration, and route-connected database mutation disabled until staging integration tests pass.

= 0.77.0 =

* Added offline device registration service orchestration for future pairing flows.
* Added pairing validation, credential issuance, registration planning, explicit repository insertion, stable service result envelopes, and secret-free service audits.
* Kept live pairing routes, production token issuance, route registration, and route-connected database mutation disabled until staging integration tests pass.

= 0.76.0 =

* Added offline device registration credential issuance for future pairing flows.
* Added generated UUID device IDs, one-time device tokens, SHA-256 token hashes, UTC issue/expiry timestamps, TTL bounds, injectable test byte sources, and secret-free audit fingerprints.
* Kept live pairing routes, production token issuance, route registration, and route-connected database mutation disabled until staging integration tests pass.

= 0.75.0 =

* Added an offline device registration repository adapter for future `tcg_offline_devices` writes.
* Added inserted/rejected repository outcomes, insert ID capture, and secret-free audit coverage.
* Kept live pairing routes, token issuance, route registration, and route-connected database mutation disabled until staging integration tests pass.

= 0.74.0 =

* Added offline device registration insert query planning for future `tcg_offline_devices` writes.
* Added prepared SQL template, prepare-argument, JSON field, UTC timestamp, schema-length, and secret-redaction coverage.
* Kept live device row writes, token issuance, route registration, and database mutation disabled until staging integration tests pass.

= 0.73.0 =

* Added `registration_deferred` to offline route bootstrap health/status payloads.
* Added WordPress integration smoke coverage proving the `rest_api_init` bootstrapper hook is registered.
* Added smoke coverage proving offline route bootstrap remains deferred and offline pull/push routes remain unregistered by default.
* Kept current live offline route registration and database mutation disabled until staging integration tests pass.

= 0.72.0 =

* Added an offline route bootstrapper hook for `rest_api_init`.
* Added guarded bootstrap execution that calls the offline route registrar only when the feature gate and route-readiness plan are ready.
* Added tests for disabled, gated, ready, and feature-blocked bootstrapper execution.
* Kept current live offline route registration and database mutation disabled until staging integration tests pass.

= 0.71.0 =

* Added offline route bootstrap status presentation for authenticated health output and admin System Status.
* Added health smoke assertions proving offline routes remain unregistered and bootstrap status remains blocked by default.
* Added tests for blocked, gated, ready, and admin-summary bootstrap status payloads.
* Kept current live offline route registration and database mutation disabled until staging integration tests pass.

= 0.70.0 =

* Added offline route bootstrap planning for future staging bootstrap checks.
* Added feature-gate, registerable-route count, route-key, route-summary, and block-reason reporting.
* Added tests for disabled, gated, future-registerable, and feature-enabled bootstrap outcomes.
* Kept current live offline route registration and database mutation disabled until staging integration tests pass.

= 0.69.0 =

* Added parser-only offline route validation handlers for future controller wiring.
* Added safe validation summaries and stable invalid responses for pairing, pull, push, conflict list, and conflict resolution callbacks.
* Added controller-injected handler tests for idempotency headers, route/query params, deferred writes, and gated routes.
* Kept current live offline route registration and database mutation disabled until staging integration tests pass.

= 0.68.0 =

* Added offline REST request adapter and normalized request data for future route handlers.
* Added body, query, route, header, and idempotency-key extraction for array fixtures and WordPress-style requests.
* Added optional injected controller handler dispatch while keeping default controller callbacks fail-closed.
* Kept current live offline route registration and database mutation disabled until staging integration tests pass.

= 0.67.0 =

* Added a guarded offline REST route registrar for future WordPress route wiring.
* Added tests proving current offline routes register zero routes by default and future enabled plans register only when callbacks are ready.
* Added route registration argument shaping for methods, controller callbacks, and permission callbacks.
* Kept current live offline route registration disabled until staging integration tests pass.

= 0.66.0 =

* Added a fail-closed offline REST controller scaffold with callback methods for every planned offline route.
* Added disabled callback responses and controller readiness metadata for planned route registration.
* Added tests proving callback coverage, disabled responses, controller readiness metadata, and continued route disablement.
* Kept live offline route registration and route handler business logic disabled until staging integration tests pass.

= 0.65.0 =

* Added planned offline route registration metadata for future WordPress REST wiring.
* Added disabled-by-default route plans with callback readiness, controller readiness, and block reasons.
* Added tests proving registered-device callbacks attach only as metadata, pairing/conflict routes stay locked, and no route uses a public permission bypass.
* Kept live offline route registration disabled until staging integration tests pass.

= 0.64.0 =

* Added route-level required scopes for planned registered-device offline pull and push routes.
* Added a planned offline route permission callback factory for future REST permission callback wiring.
* Added tests for route scope metadata, permission strategies, factory callback maps, session update application, and audit redaction.
* Kept route registration and route-connected callback wiring disabled until staging integration tests pass.

= 0.63.0 =

* Added a planned registered-device permission callback adapter for future REST permission callbacks.
* Added WordPress-style header extraction, boolean callback results, last-resolution access, and fixed-clock test support.
* Added fake-`wpdb` tests for authorized callback requests, stale update denial, missing headers, get-header style requests, and plan-only resolver compatibility.
* Kept route registration disabled until staging integration tests pass.

= 0.62.0 =

* Added opt-in session update application to the registered-device permission resolver.
* Added resolution audit fields for attempted/applied/stale/rejected session updates.
* Added fake-`wpdb` tests for applied session updates, stale update denial, failed update denial, and skipped denied-device updates.
* Kept route registration and REST permission callback wiring disabled until staging integration tests pass.

= 0.61.0 =

* Added an offline device session update `$wpdb` repository adapter for future permission callbacks.
* Added applied, stale, and rejected update results for optimistic last-seen writes.
* Added fake-`wpdb` tests for prepared update execution, stale row-version guards, failed writes, unexpected row counts, invalid plans, and audit redaction.
* Kept route registration, permission callbacks, queue replay, and route-connected database writes disabled until staging integration tests pass.

= 0.60.0 =

* Added offline device session update query building for future permission callbacks.
* Added prepared SQL templates for last-seen and row-version updates with optimistic row-version guards.
* Added tests for valid update templates, invalid table prefixes, invalid session rows, string row versions, and secret-free audits.
* Kept route registration, permission callbacks, last-seen writes, queue replay, and database writes disabled until staging integration tests pass.

= 0.59.0 =

* Added a registered-device permission resolver for future REST permission callbacks.
* Added resolution result handling for initial token planning, repository-backed lookup, loaded-row authorization, session planning, not-found denial, malformed-row rejection, and final permission denials.
* Added fake-`wpdb` tests for authorized repository-backed resolution, missing devices, invalid bearer tokens, malformed rows, denied scopes, and audit redaction.
* Kept route registration, permission callbacks, last-seen writes, queue replay, and database writes disabled until staging integration tests pass.

= 0.58.0 =

* Added a registered-device `$wpdb` repository adapter for future permission callbacks.
* Added repository result handling for found, not-found, invalid-plan rejection, malformed-row rejection, query audits, and normalization audits.
* Added fake-`wpdb` tests for prepared lookup execution, not-found rows, invalid lookup plans, malformed rows, and audit redaction.
* Kept route registration, permission callbacks, last-seen writes, queue replay, and database writes disabled until staging integration tests pass.

= 0.57.0 =

* Added registered-device lookup query building for future repository-backed permission callbacks.
* Added safe table-prefix validation, whitelisted selected columns, prepared SQL templates, UTC-to-MySQL expiry arguments, and secret-free query audit payloads.
* Added tests for prepared query templates, invalid lookup plans, invalid table prefixes, tampered query contracts, and token-hash redaction from audits.
* Kept live device row repository execution, route registration, permission callbacks, last-seen writes, queue replay, and database writes disabled until staging integration tests pass.

= 0.56.0 =

* Integrated registered-device lookup-query planning into future REST permission planning.
* Added lookup-required query args, rejected invalid scope/time query plans, query summary audit fields, and empty query args for already-loaded rows.
* Added tests for lookup-query args on permission plans, invalid query planning, loaded-row authorization, and secret-free audit payloads.
* Kept live device row repository queries, route registration, permission callbacks, last-seen writes, queue replay, and database writes disabled until staging integration tests pass.

= 0.55.0 =

* Added registered-device lookup-query planning for future repository-backed permission callbacks.
* Added selected columns, active/revocation/expiry filters, row-normalizer metadata, lock intent, deferred scope checks, and secret-free audit payloads.
* Added tests for query contract shape, row normalizer column coverage, invalid token lookup plans, unsupported scopes, invalid server times, and deferred scope checks.
* Kept live device row repository queries, route registration, permission callbacks, last-seen writes, queue replay, and database writes disabled until staging integration tests pass.

= 0.54.0 =

* Added registered-device row normalization for future repository-backed permission callbacks.
* Added database identity coercion, decoded scopes/capabilities, UTC timestamp normalization, stable validation errors, and secret-free audit payloads.
* Added tests for database row normalization, decoded payloads, explicit null date overrides, invalid identity/hash fields, invalid times, and invalid JSON shapes.
* Kept live device row repository queries, route registration, permission callbacks, last-seen writes, queue replay, and database writes disabled until staging integration tests pass.

= 0.53.0 =

* Added registered-device permission planning for future REST permission callbacks.
* Added lookup-required, denied, and authorized plan states that compose token lookup, loaded-row authentication, and session update planning.
* Added tests for lookup filters, authorized devices, malformed tokens, denied scopes, invalid session rows, and secret-free audit payloads.
* Kept live device row repository queries, route registration, permission callbacks, last-seen writes, queue replay, and database writes disabled until staging integration tests pass.

= 0.52.0 =

* Added offline device session planning for future repository-backed permission callbacks.
* Added authenticated row matching, last-seen update rows, optimistic row-version increments, session context, and secret-free audit payloads.
* Added tests for update rows, audit payloads, string database IDs, denied decisions, mismatched device rows, invalid timestamps, and invalid row versions.
* Kept live last-seen database writes, device row repository queries, REST route registration, queue replay, and database writes disabled until staging integration tests pass.

= 0.51.0 =

* Added offline device token lookup planning for future repository-backed permission callbacks.
* Added hashed token lookup filters, short audit fingerprints, normalized WordPress-style header handling, and no raw token retention in lookup plans.
* Refactored offline bearer-token authentication to consume the shared lookup planner before comparing stored hashes and delegating device policy checks.
* Added tests for valid lookup plans, WordPress-style header arrays, missing/malformed/short tokens, lookup filters, and secret-free audit payloads.
* Kept live device row repository queries, last-seen updates, REST route registration, queue replay, and database writes disabled until staging integration tests pass.

= 0.50.0 =

* Added offline device bearer-token authentication planning for future REST permission callbacks.
* Added Authorization header normalization, device token shape validation, SHA-256 token hash comparison, persisted device ID enforcement, and secret-free accepted contexts.
* Added tests for valid tokens, WordPress-style header arrays, missing/malformed tokens, bad stored hashes, wrong tokens, missing persisted device IDs, revocation, and scope denial.
* Kept live device row lookup, last-seen updates, REST route registration, queue replay, and database writes disabled until staging integration tests pass.

= 0.49.0 =

* Added offline push persistence planning for future queue/result rows, conflict inserts, idempotent replay rows, and audit payloads.
* Added registered-device row validation, batch/device mismatch guards, stale replay guards, UTC timestamp validation, and JSON payload shaping.
* Added tests for queue rows, conflict inserts, idempotent replay, and rejected stale or mismatched persistence inputs.
* Kept live database transactions, REST route handlers, token lookup, canonical entity mutations, conflict writes, and cursor advancement disabled until staging integration tests pass.

= 0.48.0 =

* Added offline sync persistence migration for registered offline devices, idempotent operation queue/result rows, manager-reviewed conflict rows, and per-device pull cursors.
* Added schema tests for device token/revocation fields, operation idempotency, conflict lookups, cursor uniqueness, and reversible drop order.
* Updated migration planning and WordPress integration smoke coverage for database target 8.
* Kept live offline route handlers, bearer-token lookup, token hash comparison, queue replay workers, conflict mutation writes, and cursor advancement disabled until staging integration tests pass.

= 0.47.0 =

* Added offline push batch resolution planning for future route handlers, per-operation results, operation result rows, enriched conflict rows, batch counts, and redacted audit payloads.
* Added server snapshot lookup by client operation ID, entity key, or operation index for deterministic queue replay planning.
* Added tests for mixed accepted/conflict batches, per-operation options, missing snapshots, invalid options, and invalid server timestamps.
* Kept live push route registration, queue replay writes, canonical entity mutations, conflict insertion, permission wiring, and cursor advancement disabled until staging integration tests pass.

= 0.46.0 =

* Added offline push operation resolution planning for future queue replay outcomes, operation result rows, API responses, manager-reviewed conflict rows, and redacted audit payloads.
* Added deterministic accepted, rejected, and conflict plans for inventory reservations, event reservations, credit redemptions, revoked devices, and unsupported operations.
* Added tests for available and sold inventory, TopDeck queue gating, event waitlists, credit limits, overspend conflicts, revoked devices, and invalid server timestamps.
* Kept live offline push route handlers, queue replay writes, canonical entity mutations, conflict persistence, permission wiring, and cursor advancement disabled until staging integration tests pass.

= 0.45.0 =

* Added offline conflict resolution planning for future conflict row updates, API responses, and redacted audit payloads.
* Added guards for stale expected row versions, terminal conflicts, unavailable resolution actions, invalid current rows, and invalid server timestamps.
* Added tests for planned manager adjustments, dismiss and retry statuses, redacted audit hashes, stale versions, terminal rows, unavailable actions, bad rows, and bad server time.
* Kept live conflict mutation writes, manager audit persistence, route callback wiring, and resolved-state propagation disabled until staging integration tests pass.

= 0.44.0 =

* Added offline conflict list response presentation for future conflict-center rows, filters, cursors, has-more state, severity, row versions, payload objects, and available manager resolution options.
* Added validation for conflict IDs, statuses, entity types, entity IDs, conflict types, severity, summaries, UTC timestamps, row versions, response cursors, payload objects, and supported resolution options.
* Added tests for empty conflict responses, normalized conflict rows, duplicate action cleanup, payload preservation, and invalid response contract inputs.
* Kept live conflict repository reads, conflict mutation writes, manager audit persistence, and route callback wiring disabled until staging integration tests pass.

= 0.43.0 =

* Added offline conflict list request validation for statuses, entity types, cursors, page-size bounds, include-resolved filters, device IDs, and schema version gating.
* Added offline conflict resolution request validation for idempotent resolution IDs, manager IDs, resolution actions, notes, expected conflict versions, UTC resolution timestamps, adjustment payloads, and schema version gating.
* Added tests for normalized conflict filters, defaults, missing fields, unsupported filters, valid resolution payloads, idempotency fallback, and invalid manager-adjust requests.
* Kept live conflict repository reads, manager mutation writes, conflict audit persistence, and route callback wiring disabled until staging integration tests pass.

= 0.42.0 =

* Added offline device access policy checks for future registered-device permission callbacks.
* Added validation for active status, revocation timestamps, token expiry, required scopes, supported modes/scopes, location IDs, and UTC timestamps.
* Added tests for allowed active devices, revoked/inactive/expired devices, missing or unsupported scopes, and malformed device context.
* Kept live bearer token lookup, token hash comparison, route permission callback wiring, last-seen updates, and revocation persistence disabled until staging integration tests pass.

= 0.41.0 =

* Added offline device registration planning for future device rows, one-time pairing responses, token hash storage fields, sync routes, first-sync flags, and redacted audit payloads.
* Added tests for device row/response/audit payloads, scope and capability preservation, generated credential validation, and token expiry windows.
* Kept live device row writes, token generation, token hashing, registration route persistence, revocation checks, and first-sync execution disabled until staging integration tests pass.

= 0.40.0 =

* Added offline device pairing request validation for pairing codes, installation IDs, device modes, manager/location IDs, app versions, Windows platform checks, hardware capabilities, requested scopes, and schema version gating.
* Added tests for normalized pairing requests, missing core pairing fields, invalid pairing shapes, and staff/admin scope combinations.
* Kept live offline device token issuance, token hashing, registration route writes, device revocation, and first-sync execution disabled until staging integration tests pass.

= 0.39.0 =

* Added offline pull response presentation for stable per-domain cursors, data rows, tombstones, server timestamps, and has-more pagination flags.
* Added tests for empty domain responses, request cursor carry-forward, normalized data rows, tombstone inclusion/exclusion, and invalid response contract inputs.
* Kept live offline pull route registration, device token validation, database change queries, and cursor advancement disabled until staging integration tests pass.

= 0.38.0 =

* Added offline pull request validation for device IDs, cached domains, domain cursors, page-size bounds, tombstone inclusion, and schema version gating.
* Added tests for requested domains/cursors, default pull settings, invalid top-level shapes, unsupported domains, bad cursors, and unsupported schema versions.
* Kept live offline pull route registration, device token validation, change queries, tombstone reads, and cursor advancement disabled until staging integration tests pass.

= 0.37.0 =

* Added offline push payload validation for batch IDs, device matching, operation envelopes, supported operation/entity pairs, timestamps, row versions, payload objects, authorization context, duplicate operation IDs, and schema version gating.
* Added tests for valid offline push batches, missing top-level fields, duplicate operation IDs, device mismatches, and malformed operation envelopes.
* Kept live offline push route registration, device token validation, queue replay, operation persistence, and conflict writes disabled until staging integration tests pass.

= 0.36.0 =

* Added planned offline device pairing, pull, push, conflict list, and conflict resolution REST route contracts.
* Added tests for offline route permissions, callbacks, namespace, and disabled-live defaults.
* Kept live WordPress offline sync endpoints, device-token validation, queue replay, and conflict writes disabled until staging-gated integration tests pass.

= 0.33.0 =

* Added white-label company branding settings for configurable company name, short name, logo/support URLs, receipt footer text, and color tokens.
* Added client-safe branding config and CSS variable export for WordPress, kiosk, staging banner, and future Windows offline app surfaces.
* Added tests for branding sanitization, existing-value preservation, public config safety, and CSS variable output.
* Kept live storefront/kiosk/offline app rendering changes gated for later UI phases.

= 0.32.0 =

* Added buylist offer planner for reviewed item offers, cash/credit totals, approval thresholds, target submission statuses, and deterministic offer fingerprints.
* Added tests for offer payloads, manager approval thresholds, invalid submissions/items, zero-value offers, and stable fingerprints.
* Kept live buylist offer write APIs, permission callbacks, staff review UI, approval persistence, customer acceptance writes, credit payout posting, and inventory conversion workers disabled.

= 0.31.0 =

* Added customer credit REST presenter for balance, ledger, posting-result, and validation-error response payloads.
* Added safe ledger metadata redaction using the existing structured redactor.
* Kept live customer credit REST endpoint registration, permission callbacks, nonce handling, and staff UI disabled until staging-gated route tests pass.

= 0.30.0 =

* Added WooCommerce order lifecycle planner for checkout linkage, payment-complete conversion, failed/cancelled release, and refund review planning.
* Added tests for serialized line transitions, non-serialized skips, invalid metadata, duplicate reservation lines, invalid actions, and invalid orders.
* Kept live WooCommerce checkout, payment, order mutation, cart release, and refund hooks disabled until staging lifecycle tests pass.

= 0.29.0 =

* Added WooCommerce order-line metadata planner for exact inventory, reservation, owner-token, price snapshot, expiry, card descriptor, and snapshot hash persistence.
* Added tests for valid metadata payloads, validator error propagation, optional descriptor copying, deterministic snapshot hashes, and zero-price snapshots.
* Kept live WooCommerce checkout hook execution, payment lifecycle mutation, and order writes disabled until staging lifecycle tests pass.

= 0.28.0 =

* Added reservation expiry cleanup planner for expired active holds, future holds, inactive rows, invalid rows, and deterministic cleanup idempotency keys.
* Added explicit reservation expiry transition that restores reserved inventory to available while marking the reservation expired.
* Kept live cleanup workers, WooCommerce cart timers, Action Scheduler jobs, and database race integration tests disabled.

= 0.27.0 =

* Added ScryDex persistence planner for deterministic reference-card insert payloads, changed-row updates, unchanged-row detection, and current price observations.
* Added tests for insert planning, update planning, no-op reference rows, price observation reference IDs, and failed page plan guards.
* Kept live ScryDex database write workers, scheduled pulls, images, usage-budget enforcement, and webhooks disabled.

= 0.26.0 =

* Added manager override persistence planner for accepted below-minimum approvals.
* Added audit-safe payload planning with reason hashing and minor-unit to decimal conversion.
* Kept live manager PIN reauthentication, database writes, and WooCommerce/POS hook wiring disabled.

= 0.25.0 =

* Added buylist planned REST route contracts for submission, review, offer, acceptance, and inventory-conversion flows.
* Added buylist submission intake payload validation for customer identity, idempotency, source, owner token, optional IDs, and item rows.
* Kept live buylist write APIs disabled until permission and integration tests pass.

= 0.24.0 =

* Added customer credit planned REST route contracts for balance, ledger, adjust, and redeem flows.
* Added REST posting payload validation for customer matching, idempotency, currency, metadata, optional IDs, and manager-approved adjustments.
* Kept live customer credit REST endpoints disabled until permission and integration tests pass.

= 0.23.0 =

* Added WooCommerce serialized inventory hook contract registry.
* Added tests for exact inventory cart, checkout, payment, refund, cart removal, and Store API hook coverage.
* Kept live WooCommerce hook registration disabled until lifecycle integration tests pass.

= 0.22.0 =

* Added ScryDex sync page processor and page plan result.
* Added tests for fixture-backed card/price upsert planning, invalid-card errors, and retryable rate-limit failures.
* Kept database upsert workers, scheduled pulls, images, usage-budget enforcement, and webhooks disabled.

= 0.21.0 =

* Added POS/payment reconciliation policy module.
* Added Node tests for approved payments, scan-gated sales, declined payments, unmapped POS lines, and refunds to pending review.
* Wired POS/payment policy tests into the root `npm run test` gate.

= 0.20.0 =

* Added shared sync-engine offline conflict policy module.
* Added Node tests for offline inventory reservations, event reservations, customer credit redemption, and device revocation.
* Wired sync-engine tests into the root `npm run test` gate.

= 0.19.0 =

* Added TopDeck registration push adapter and sync result mapping.
* Added tests for registered, pending invite, capacity conflict, missing input, email normalization, and retryable provider failure.
* Kept queued TopDeck worker execution and live provider calls disabled until staging acceptance.

= 0.18.0 =

* Added migration runner plan coverage for clean install, upgrade, current-schema idempotency, and rollback order.
* Exposed pending and rollback version plans from the migration runner.
* Kept live database migration integration and row-lock tests staging-gated.

= 0.17.0 =

* Added REST route contract coverage for health and public Events endpoints.
* Reused those contracts during route registration to reduce route/test drift.
* Kept unimplemented customer, buylist, inventory, offline, and POS write routes disabled.

= 0.16.0 =

* Added WooCommerce serialized cart item metadata validator.
* Added tests for exact inventory/reservation metadata, quantity-one enforcement, expiry, price snapshot, and currency validation.
* Kept live WooCommerce add-to-cart and checkout hook wiring disabled for later staging-gated phases.

= 0.15.0 =

* Added manager override policy helpers for below-minimum sale authorization.
* Added checks for distinct manager approval, required reason, invalid amounts, and override-row persistence requirement.
* Added manager override policy unit tests while persistence remains staging-gated.

= 0.14.0 =

* Added reservation lifecycle service helpers for conversion to sold and release back to available.
* Added idempotent transition handling and inventory-state mismatch protection.
* Added lifecycle tests for reservation conversion, release, idempotent replay, and mismatch rejection.

= 0.13.0 =

* Added exact inventory reservation schema migration.
* Added reservation request/result/storage/service foundation for active claim enforcement.
* Added tests for reservation schema, idempotency replay, unavailable inventory rejection, and active-reservation collision prevention.

= 0.12.0 =

* Added ScryDex card and market price normalization helpers.
* Added fixture-backed tests for reference-card rows, price rows, required-field errors, and nullable optional fields.
* Kept ScryDex database upserts and scheduled workers disabled for later staging-gated phases.

= 0.11.0 =

* Added ScryDex provider result, contract, and HTTP provider adapter.
* Added fixture-backed tests for card search, credential headers, rate-limit mapping, and auth-context redaction.
* Added team ID redaction for provider auth context.

= 0.10.0 =

* Added sync job, log, checkpoint, error, and webhook schema migration.
* Added ScryDex checkpoint/resume value and request planning helpers.
* Added tests for sync schema contracts and checkpoint resume behavior.

= 0.9.0 =

* Added customer credit ledger posting service, storage contract, and wpdb repository.
* Added idempotency replay handling and cached balance update tests.
* Kept public credit APIs and WooCommerce redemption hooks disabled.

= 0.8.0 =

* Added buylist submission, item, offer, approval, and conversion schema migration.
* Added buylist submission status transition helper.
* Added tests for buylist schema contracts and status transitions.

= 0.7.0 =

* Added customer, contact, credit ledger, merge, and customer note schema migration.
* Added customer credit entry type and posting policy helpers.
* Added tests for credit schema, signed ledger previews, manager approval, and negative-balance rejection.

= 0.6.0 =

* Added local public event registration writes for free and pay-at-store reservations.
* Added idempotency, capacity checks, waitlist insertion, count updates, and registration logs.
* Kept WooCommerce payment capture and TopDeck push disabled for later staging-gated phases.

= 0.5.0 =

* Added read-only public Events REST endpoints and shortcodes.

= 0.4.0 =

* Added the Phase 3 Events and TopDeck foundation.

= 0.3.0 =

* Added the Phase 2 inventory and pricing foundation.

= 0.2.0 =

* Added the Phase 1 plugin foundation.
