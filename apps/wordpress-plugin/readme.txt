=== TCG Store Platform ===
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 0.32.0
License: Proprietary

Serialized trading-card inventory and store operations for WooCommerce.

== Description ==

Phase 1 provides the platform foundation: migrations, roles and capabilities,
settings, structured logging, audit logging, REST health checks, feature flags,
Action Scheduler integration, and WooCommerce HPOS compatibility reporting.
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
Phase 8.1 adds POS/payment reconciliation policy tests for sandbox responses,
scan-gated sales, refunds, declines, and unmapped line conflicts.
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
