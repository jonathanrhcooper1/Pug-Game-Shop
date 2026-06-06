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

Status: In progress; manager override policy helpers implemented

Deliver reference/inventory/location tables, intake, barcode generation, label
contracts, required minimum price, pricing policy, movement log, price log, and
manager override.

Exit criteria: concurrency and business-rule tests pass; 50,000-item seed search
and intake benchmarks meet agreed targets.

## Phase 3: ScryDex Sync

Status: In progress; generic sync schema, ScryDex checkpoint/resume helpers,
mock-backed ScryDex provider adapter, card/price normalization, and sync page
processing plus persistence planning implemented

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
contracts plus push/pull payload validation implemented

Deliver Tauri app, SQLite schema, local search/images, pairing, device auth,
operation queue, pull cursor, conflict center, kiosk/staff/admin modes, labels,
and Windows installer/updater.

Exit criteria: documented outage drills pass for inventory, kiosk, buylist,
events, and bounded credit redemption.

## Phase 8: POS And Payment Adapters

Status: In progress; POS/payment reconciliation policy tests implemented

Deliver Square connection, transaction ingestion, barcode scan gate, optional
catalog projection, reconciliation, refunds, conflict logs, and configurable
fee comparison. Add payment adapters only where a supported integration exists.

Exit criteria: test POS sales and refunds reconcile exact items idempotently.

## Phase 9: Events And TopDeck

Status: In progress; schema, public read surface, TopDeck adapter contract,
local free/pay-at-store registration writes, and TopDeck registration adapter
mapping implemented

Deliver public events UI, local registration, Woo event products, TopDeck
link/import/sync/register, waitlist, check-in, QR, attribution, and offline event
queue.

Exit criteria: payment and registration partial-failure cases remain visible
and recoverable.

## Phase 10: Hardening

Deliver security review, load tests, observability, backup/restore drills,
exports, deployment automation, staff training, accessibility review, and
release documentation.

Exit criteria: production readiness checklist signed off with rollback and
recovery procedures tested.
