=== TCG Store Platform ===
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 0.64.0
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
