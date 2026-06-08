# Roadmap

## Phase 0: Architecture And Planning

Status: Complete

Exit criteria: all 21 architecture deliverables documented; external
capabilities marked verified or unsupported; acceptance gate recorded.

## Phase 1: WordPress Plugin Foundation

Status: Implemented; REST route contract, migration runner plan tests, and
white-label branding settings added, staging integration acceptance pending

Deliver plugin bootstrap, dependency checks, migration runner, roles and
capabilities, settings, audit/logging, Action Scheduler integration, REST base,
feature flags, HPOS declaration strategy, CI, and foundational tests.

Exit criteria: clean install/upgrade/rollback tests and authenticated health
endpoint on the target WordPress/WooCommerce versions.

## Phase 2: Inventory And Pricing

Status: In progress; manager override policy helpers, inventory intake
persistence planning plus explicit repository adapter and staged route handler
factory, gated inventory route registration and dependency composition,
health/admin readiness status, bootstrapper wiring, inventory search
planning/SQL-template contracts, explicit repository read adapter, staged route
handler factory, WooCommerce product projection planning, and guarded
WooCommerce/Square projection execution implemented

Deliver reference/inventory/location tables, intake, barcode generation, label
contracts, required minimum price, pricing policy, movement log, price log, and
manager override.

Exit criteria: concurrency and business-rule tests pass; 50,000-item seed search
and intake benchmarks meet agreed targets.

## Phase 3: ScryDex Sync

Status: In progress; generic sync schema, ScryDex checkpoint/resume helpers,
mock-backed ScryDex provider adapter, secret-preserving staged settings,
provider factory readiness, dry-run request/checkpoint planning, execution-gate
readiness diagnostics, usage-budget settings/planning, checkpoint repository
planning, provider price observation schema migration, card/price normalization,
sync page processing plus persistence planning, and persistence SQL/repository
staging plus health/execution-gate readiness wiring and worker orchestration
planning implemented

Deliver adapter, capability discovery, card/expansion/price/image sync,
checkpoints, resume, usage tracking, webhook verification, live logs, and daily
9:00 AM Eastern scheduling.

Exit criteria: sandbox/verified-account contract fixtures pass and interrupted
full pulls resume without duplication.

## Phase 4: WooCommerce Storefront And Reservations

Status: In progress; exact reservation schema, reserve/release/convert service
foundations, expiry cleanup planning, serialized cart metadata validation, and
order-line metadata plus order lifecycle transition planning implemented

Deliver catalog projection, exact-item cart metadata, atomic reservation,
checkout validation, payment conversion, cancellation/failure release, pickup,
and HPOS/Checkout Block support.

Exit criteria: parallel-cart race tests show no double sale.

## Phase 5: Kiosk And Pick Queue

Deliver touch UI, identity capture, local/online search, kiosk carts, QR/cart
IDs, reservation timers, staff queue, picking workflow, and timeout privacy.

Exit criteria: kiosk completes core flow with keyboard, touch, scanner, and
temporary network loss.

## Phase 6: Customer Credit And Buylist

Status: In progress; customer credit schema, local ledger posting policy
helpers, idempotent credit ledger posting internals, REST contracts,
validation, response presentation, buylist schema, status helpers, and offer
planning implemented

Deliver customer profiles, immutable credit ledger, online/in-store redemption,
approval workflows, liability reports, buylist intake/review/offers, and
conversion to pending inventory.

Exit criteria: ledger replay always matches cached balance and duplicate/replay
requests cannot change liability twice.

## Phase 7: Offline App

Status: In progress; shared offline sync conflict policy tests, Tauri Windows
packaging scaffold, first SQLite schema contract, and WordPress offline route
contracts plus push/pull payload validation, pull response presentation, device
pairing validation/registration planning, and device access policy checks
plus conflict list/resolution request validation and conflict response
presentation/resolution planning plus offline push operation resolution
and batch resolution planning plus WordPress offline persistence schema
and push persistence planning plus bearer-token authentication and token lookup
planning plus device session planning plus registered-device permission
planning plus registered device row normalization and lookup-query planning
plus permission lookup-query integration plus registered-device lookup query
building plus registered-device repository adaptation and permission resolution
plus session update query building, repository adaptation, and
permission-resolution session update application plus planned permission
callback adapter plus settings-backed staged pairing handler assembly and
registered-device resolver readiness plus staged sync route handler readiness
plus staged pull response handler readiness
plus pull change-query planning
plus pull query readiness metadata
plus pull query SQL template planning
plus pull change repository adaptation
plus pull change-set provider composition
plus pull device context planning
plus route-aware pull provider handoff
plus pull cursor advancement planning
plus pull cursor advance SQL planning
plus pull cursor advance repository adaptation
plus route-aware pull cursor advance provider
plus premium offline app command-center UI refresh with project-local crest,
desktop app chrome, no-horizontal-overflow screenshot QA, and local queue
staging interaction verification
plus pull handler cursor advance orchestration
plus pull route handler factory composition
plus push persistence SQL/repository staging
plus push route handler factory composition
plus push server snapshot query planning
plus push server snapshot repository adaptation
plus push route server snapshot provider composition
plus push route operation-options provider composition
plus push existing operation-row query planning
plus push existing operation-row repository adaptation
plus push existing operation-row route provider composition
plus push replay response metadata
plus push per-operation persistence annotations
plus push replay response hydration
plus push canonical mutation planning
plus route-connected push canonical mutation planning metadata
plus push canonical mutation SQL-template planning
plus route-connected push canonical mutation SQL planning metadata
plus deferred push canonical mutation repository scaffold
plus route-connected deferred push canonical mutation repository metadata
plus push canonical mutation repository execution gate
plus push canonical mutation transaction preflight
plus polished offline inventory command workspace UI and shell contract
plus functional offline app controls for sidebar navigation, filters, grid/list
views, scan/quantity staging, print-label preview, conflict review/history,
sync preview, and reusable company/site connector profiles
plus WordPress offline connector manifest health/admin diagnostics for
company/site pairing, route maps, secure storage boundaries, Square authority
split, and ScryDex redaction status
plus offline app manifest ingestion and validation for reusable multi-company
website connector profiles without syncing credentials
plus offline app customer-credit and conflict-review controls that stage local
queue operation envelopes
plus offline app redacted pairing-code request preview for selected website
connector profiles
plus WordPress app pairing contract diagnostics aligned with offline app
route-map preview
plus typed local workspace state and staged operation envelope preview
plus browser-safe offline queue bridge contract
plus local SQLite queue insert planning
plus Tauri queue command scaffold and adapter detection
implemented

Deliver Tauri app, SQLite schema, local search/images, pairing, device auth,
operation queue, pull cursor, conflict center, kiosk/staff/admin modes, labels,
and Windows installer/updater.

Exit criteria: documented outage drills pass for inventory, kiosk, buylist,
events, and bounded credit redemption.

## Phase 8: POS And Payment Adapters

Status: In progress; POS/payment reconciliation and transaction-ingestion
contract tests plus POS/payment schema migration, log payload planning, SQL
template planning, repository staging, execution-gate metadata, transaction
preflight metadata, explicit staged log execution, and staged transaction
execution plus planned route contracts and route readiness diagnostics
plus fail-closed route permission callbacks, controller scaffold, route
registration planning, guarded registrar, route bootstrap status, and
bootstrapper wiring plus route dependency status and parser-only route
validation handlers plus dependency-backed bootstrap wiring and fee snapshot
query planning plus fee snapshot SQL-template planning plus explicit fee
snapshot repository adaptation plus fee snapshot repository readiness metadata
plus explicit staged fee snapshot route handler plus staged fee snapshot route
handler factory composition plus POS/payment route-connected read deferral
gates plus dependency health/admin read-gate status
plus Square inventory projection planning
plus explicit Square payment delegation to the official WooCommerce Square
extension
plus official WooCommerce Square extension status diagnostics
plus Square inventory sync readiness diagnostics
plus Square inventory batch sync planning
plus Square inventory batch sync readiness health/admin diagnostics
implemented

Deliver WooCommerce/Square payment observation, transaction ingestion, barcode
scan gate, optional catalog projection, reconciliation, refunds, conflict logs,
and configurable fee comparison. Online Square authorization, capture, and
refund execution should stay in the official WooCommerce Square extension
unless a future reviewed requirement proves a custom gateway is necessary.

Exit criteria: test POS sales and refunds reconcile exact items idempotently.

## Phase 9: Events

Status: In progress; schema, public read surface, and local free/pay-at-store
registration writes implemented. External tournament-provider integrations are
out of active scope at owner request.

Deliver public events UI, local registration, Woo event products, waitlist,
check-in, QR, local attribution, and offline event queue.

Exit criteria: payment and registration partial-failure cases remain visible
and recoverable.

## Phase 10: Hardening

Deliver security review, load tests, observability, backup/restore drills,
exports, deployment automation, staff training, accessibility review, and
release documentation.

Exit criteria: production readiness checklist signed off with rollback and
recovery procedures tested.
