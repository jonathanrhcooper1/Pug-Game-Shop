# Changelog

All notable changes follow Semantic Versioning.

## [0.52.0] - 2026-06-06

### Added

- Offline device session planner for future repository-backed permission
  callbacks.
- Session plan value object exposing future device last-seen update rows,
  authenticated session context, row-version increments, and secret-free audit
  payloads.
- Validation that accepted access decisions match the loaded device row by
  persisted offline device ID and public device ID before planning updates.
- Unit coverage for last-seen update rows, audit payloads, string database IDs,
  denied decisions, mismatched device rows, invalid timestamps, invalid device
  IDs, and invalid row versions.

### Not Added

- Live last-seen `$wpdb` writes, device row repository queries, REST route
  registration, permission callback wiring, queue replay workers, and live
  database writes remain disabled for later staging-gated phases.

## [0.51.0] - 2026-06-06

### Added

- Offline device token lookup planner for future repository-backed permission
  callbacks.
- Lookup plan value object exposing hashed token lookup filters, a short audit
  fingerprint, validity state, parse errors, and secret-free audit payloads.
- Shared token hash derivation between lookup planning and bearer-token
  authentication.
- Unit coverage for valid lookup plans, normalized WordPress header arrays,
  missing/malformed/short tokens, lookup filters, fingerprints, and audit
  payloads without raw tokens.

### Changed

- Refactored the offline device bearer-token authenticator to consume the shared
  lookup planner before comparing stored hashes and delegating device policy
  checks.

### Not Added

- Live device row repository queries, REST route registration, permission
  callback wiring, device last-seen updates, queue replay workers, and live
  `$wpdb` writes remain disabled for later staging-gated phases.

## [0.50.0] - 2026-06-06

### Added

- Offline device bearer-token authenticator for future REST permission
  callbacks.
- Authorization header normalization for direct and WordPress-style request
  header arrays.
- Device token shape validation, SHA-256 token hashing, stored token hash
  comparison with `hash_equals`, and persisted `offline_device_id` enforcement.
- Secret-free accepted authorization context containing device ID, persisted
  offline device ID, required scope, auth type, and authentication timestamp.
- Unit coverage for valid tokens, normalized header arrays, missing/malformed
  tokens, short tokens, invalid stored hashes, wrong tokens, missing persisted
  device IDs, revoked devices, and denied scopes.

### Not Added

- Live device row lookup, REST route registration, permission callback wiring,
  device last-seen updates, queue replay workers, and live `$wpdb` writes remain
  disabled for later staging-gated phases.

## [0.49.0] - 2026-06-06

### Added

- Offline push persistence planner that maps parsed push operations and batch
  resolution output into future `tcg_offline_sync_queue` and
  `tcg_sync_conflicts` insert rows.
- Idempotent replay planning for operations that already have matching stored
  result rows.
- Validation for registered-device row identity, batch/device mismatches,
  result-row presence, stale replay rows, UTC timestamps, and JSON payload
  shaping.
- Unit coverage for queue row mapping, conflict insert mapping, idempotent
  replay, and rejected stale/mismatched persistence inputs.

### Not Added

- Live `$wpdb` transactions, REST route registration, bearer-token lookup,
  canonical inventory/event/credit mutation writes, conflict inserts, operation
  result inserts, and cursor advancement remain disabled for later
  staging-gated phases.

## [0.48.0] - 2026-06-06

### Added

- Offline sync database migration `0008_offline-sync` for registered device
  rows, idempotent operation queue/result rows, manager-reviewed conflict rows,
  and per-device pull cursors.
- Offline sync schema contract tests for token/revocation fields, operation
  idempotency, conflict lookups, cursor uniqueness, and reversible drop order.
- WordPress integration smoke coverage for database target `8` and the new
  offline persistence tables.

### Not Added

- Live offline route registration, bearer-token lookup, token hash comparison,
  queue replay workers, canonical entity mutations, conflict mutation writes,
  and cursor advancement remain disabled for later staging-gated phases.

## [0.47.0] - 2026-06-06

### Added

- Offline push batch resolver for future queue replay route handlers.
- Batch-level response payloads, operation result rows, conflict rows, audit
  payloads, and accepted/conflict/rejected counts.
- Server snapshot lookup by operation ID, entity key, or operation index so
  future repositories can feed deterministic resolver inputs.
- Unit coverage for mixed accepted/conflict batches, conflict row enrichment,
  per-operation runtime options, missing server snapshots, invalid options, and
  invalid server timestamps.

### Not Added

- Live push route registration, database queue replay, canonical entity
  mutation writes, conflict insertion, idempotent operation-result persistence,
  registered-device permission wiring, and cursor advancement remain disabled
  for later staging-gated phases.

## [0.46.0] - 2026-06-06

### Added

- Offline push operation resolver for future queue replay and conflict
  persistence flows.
- Planned accepted, rejected, and conflict outcomes for inventory
  reservations, event reservations, customer credit redemptions, revoked
  devices, and unsupported operations.
- Future operation result rows, response payloads, redacted audit payloads,
  and deterministic conflict rows for manager-reviewed offline conflicts.
- Unit coverage mirroring the shared sync-engine policy for available/sold
  inventory, TopDeck queue gating, waitlist placement, credit limits,
  overspend conflicts, device revocation, and invalid server timestamps.

### Not Added

- Live offline push route handlers, database queue replay, canonical entity
  mutation writes, conflict persistence, registered-device permission wiring,
  and device cursor advancement remain disabled for later staging-gated phases.

## [0.45.0] - 2026-06-06

### Added

- Offline conflict resolution planner for future manager-reviewed conflict
  mutation flows.
- Planned conflict update rows, API response payloads, and redacted audit
  payloads with deterministic resolution payload hashes.
- Guards for stale expected row versions, terminal conflicts, unavailable
  resolution actions, invalid current rows, and invalid server timestamps.
- Unit coverage for manager-adjust plans, dismiss and retry status mapping,
  redacted audit hashes, stale versions, terminal rows, unavailable actions,
  bad current rows, and bad server time.

### Not Added

- Live conflict mutation writes, manager audit persistence, REST callback
  wiring, resolved-state propagation, and device sync fanout remain disabled
  for later staging-gated phases.

## [0.44.0] - 2026-06-06

### Added

- Offline conflict list response presenter for the planned conflict-center
  list route.
- Stable response shaping for device IDs, schema version, server time, filters,
  cursors, `has_more`, conflict rows, severities, row versions, payload objects,
  and available manager resolution options.
- Validation for conflict IDs, statuses, entity types, entity IDs, conflict
  types, severity, summaries, UTC timestamps, row versions, response cursors,
  payload objects, and supported resolution options.
- Unit coverage for empty conflict responses, normalized conflict rows,
  duplicate action cleanup, payload preservation, and invalid response contract
  inputs.

### Not Added

- Live conflict repository reads, conflict mutation writes, manager audit
  persistence, REST callback wiring, and resolved-state propagation remain
  disabled for later staging-gated phases.

## [0.43.0] - 2026-06-06

### Added

- Offline conflict list request parser for the planned conflict-center route.
- Offline conflict resolution request parser for the planned manager resolution
  route.
- Validation for conflict statuses, entity types, cursors, page-size bounds,
  include-resolved filters, idempotent resolution IDs, manager IDs, resolution
  actions, notes, expected conflict versions, UTC timestamps, adjustment
  payloads, and schema version `1`.
- Unit coverage for normalized list filters, default filters, invalid filter
  shapes, unsupported filters, valid resolution payloads, idempotency fallback,
  missing fields, and invalid manager-adjust requests.

### Not Added

- Live conflict repository reads, conflict mutation writes, manager audit
  persistence, REST callback wiring, and resolved-state propagation remain
  disabled for later staging-gated phases.

## [0.42.0] - 2026-06-06

### Added

- Offline device access policy for future registered-device permission
  callbacks.
- Validation for active device status, revocation timestamps, token expiry,
  required scopes, supported modes/scopes, location IDs, and UTC timestamps.
- Unit coverage for allowed active devices, revoked/inactive/expired devices,
  missing or unsupported scopes, and malformed device context.

### Not Added

- Live bearer token lookup, token hash comparison, REST permission callback
  wiring, device last-seen updates, revocation persistence, and live route
  registration remain disabled for later staging-gated phases.

## [0.41.0] - 2026-06-06

### Added

- Offline device registration planner for the planned pairing flow.
- Planned device row, one-time response payload, sync route map, first-sync
  flags, token hash storage fields, and redacted audit payloads.
- Validation for generated device IDs, one-time device tokens, token hashes,
  UTC issue/expiry timestamps, and expiry-after-issue ordering.
- Unit coverage for device row/response/audit payloads, scope/capability
  preservation, invalid generated credentials, and invalid expiry windows.

### Not Added

- Live device row writes, token generation, token hashing, token storage,
  registration route persistence, revocation checks, and first-sync execution
  remain disabled for later staging-gated phases.

## [0.40.0] - 2026-06-06

### Added

- Offline device pairing request parser for the planned
  `/offline/devices/register` route.
- Validation for pairing codes, installation IDs, device labels, device modes,
  manager/location IDs, app versions, Windows platform checks, hardware
  capabilities, requested scopes, and schema version `1`.
- Unit coverage for normalized pairing requests, missing core fields, invalid
  shapes, unsupported scopes/capabilities, unsupported platform/mode, and
  staff/admin scope combinations.

### Not Added

- Live device token issuance, token hashing/storage, registration route writes,
  revocation checks, first-sync execution, and reconnect integration tests
  remain disabled for later staging-gated phases.

## [0.39.0] - 2026-06-06

### Added

- Offline pull response presenter for stable server-to-device payloads.
- Per-domain response shaping for cursors, `has_more`, cached data rows, and
  tombstones.
- Validation of response contract inputs, including supported domains, UTC
  timestamps, entity IDs, row versions, payload objects, tombstone rows, and
  cursor shape.
- Unit coverage for empty pull responses, request cursor carry-forward,
  normalized data rows, tombstone inclusion/exclusion, and invalid response
  contract inputs.

### Not Added

- Live offline pull route registration, device token validation, database
  change queries, cursor advancement, tombstone repositories, and reconnect
  integration tests remain disabled for later staging-gated phases.

## [0.38.0] - 2026-06-06

### Added

- Offline pull request parser for devices requesting cached read-model changes.
- Validation for device IDs, cached domain selection, domain cursors,
  page-size bounds, tombstone inclusion, and schema version `1`.
- Unit coverage for requested domains/cursors, default pull settings, invalid
  top-level shapes, unsupported domains, bad cursors, and unsupported schema
  versions.

### Not Added

- Live offline pull route registration, device token validation, change-query
  repositories, tombstone reads, cursor advancement, and reconnect integration
  tests remain disabled for later staging-gated phases.

## [0.37.0] - 2026-06-06

### Added

- Offline push payload parser for queued operation batches from the Windows
  app.
- Validation for batch IDs, device IDs, duplicate client operation IDs,
  supported operation/entity pairs, timestamps, row-version metadata, JSON
  payload objects, authorization context objects, and schema version `1`.
- Unit coverage for valid batches, missing top-level fields, device mismatch,
  duplicate operation IDs, and malformed operation envelopes.

### Not Added

- Live offline push route registration, device token validation, queue replay,
  operation persistence, conflict writes, and reconnect integration tests remain
  disabled for later staging-gated phases.

## [0.36.0] - 2026-06-06

### Added

- WordPress planned offline REST route contracts for device pairing, pull,
  push, conflict listing, and conflict resolution.
- Contract coverage for offline route permissions, callback names, namespace,
  and disabled-live defaults.
- Documentation linking the offline Windows app API boundary to the WordPress
  route contracts.

### Not Added

- Live offline REST route registration, device token validation, push/pull
  workers, queue replay, conflict persistence, and reconnect integration tests
  remain disabled for later staging-gated phases.

## [0.35.0] - 2026-06-06

### Added

- Offline app SQLite schema manifest and first local migration contract.
- Local tables for app metadata, device identity, sync cursors, operation
  queue, sync logs, cached branding, cached inventory, cached customer credit,
  cached events, and sync conflicts.
- Operation queue envelope fields matching the offline sync contract.
- SQLite schema contract test wired into root `npm run test`.
- Documentation for local SQLite ownership and rollback boundaries.

### Not Added

- Live SQLite service execution, encryption integration, FTS/search virtual
  tables, device pairing, WordPress offline REST endpoints, push/pull workers,
  queue replay, conflict UI, and full reconnect integration tests remain
  disabled for later staging-gated phases.

## [0.34.0] - 2026-06-06

### Added

- Tauri/React/TypeScript offline app scaffold for the Windows app.
- Windows packaging metadata for `x86_64-pc-windows-msvc` and NSIS `.exe`
  installer output.
- Offline app manifest covering WordPress offline sync routes, no direct MySQL
  access, manual production release approval, code-signing requirement, and
  required white-label branding tokens.
- Dependency-free offline app package contract test wired into root
  `npm run test`.
- Pull request quality gate coverage for the offline app package contract.
- Manual-only GitHub Actions workflow for building and uploading an unsigned
  Windows installer artifact.

### Not Added

- Live SQLite queue persistence, device pairing, WordPress offline REST
  endpoints, push/pull workers, printer/scanner adapters, kiosk lockdown,
  updater, signed production installer, and full reconnect integration tests
  remain disabled for later staging-gated phases.

## [0.33.0] - 2026-06-06

### Added

- White-label company branding settings for company name, short name, logo URL,
  support URL, receipt footer text, and theme color tokens.
- Sanitized client-safe branding config export for future WordPress, kiosk,
  staging banner, receipt, and Windows offline app consumers.
- CSS variable export for primary, accent, background, surface, text, success,
  warning, danger, and staging banner color tokens.
- Settings API fields for company identity, HTTPS brand URLs, receipt footer,
  and color token inputs.
- Admin dashboard and system status usage of the configured company profile.
- Unit coverage for branding sanitization, existing-value preservation,
  client-safe public config export, and CSS variable output.

### Not Added

- Live storefront/kiosk/offline app rendering, public branding REST endpoint,
  receipt template rendering, email template theming, and offline app branding
  sync remain disabled for later staging-gated UI phases.

## [0.32.0] - 2026-06-06

### Added

- Buylist offer planner for reviewed item offer payloads.
- Submission-level cash and credit total planning with target submission
  status selection.
- Item and submission manager approval threshold planning for cash and credit
  offers.
- Deterministic offer fingerprints for replay/review stability.
- Unit coverage for normal offer payloads, manager approval thresholds,
  invalid submissions/items, zero-value offers, and stable fingerprints.

### Not Added

- Live buylist offer write APIs, permission callbacks, staff review UI,
  approval persistence, customer acceptance writes, credit payout posting, and
  inventory conversion workers remain disabled for later staging-gated phases.

## [0.31.0] - 2026-06-06

### Added

- Customer credit REST response presenter for balance, ledger, posting-result,
  and validation-error payloads.
- Safe customer credit balance payload shaping that omits private contact
  fields.
- Ledger row shaping with amount/currency normalization, paging metadata, and
  redacted structured metadata.
- Unit coverage for balance payloads, ledger metadata redaction, posting-result
  responses, and validation-error response shape.

### Not Added

- Live customer credit REST endpoint registration, permission callbacks, nonce
  handling, database read repositories, staff UI, WooCommerce redemption hooks,
  and audit writes remain disabled for later staging-gated phases.

## [0.30.0] - 2026-06-06

### Added

- WooCommerce order lifecycle planner for serialized inventory order-line
  metadata.
- Checkout linkage, payment-complete conversion, failed/cancelled release, and
  refund review transition payload planning.
- Duplicate reservation line guards, non-serialized line skipping, invalid
  metadata reporting, and deterministic lifecycle idempotency keys.
- Unit coverage for checkout, payment, failed/cancelled, refund, invalid line,
  duplicate reservation, invalid action, and invalid order planning.

### Not Added

- Live WooCommerce checkout hook execution, order mutation, payment lifecycle
  conversion, Store API execution, cart release hooks, and refund hooks remain
  disabled for later staging-gated phases.

## [0.29.0] - 2026-06-06

### Added

- WooCommerce order-line metadata planner for serialized inventory checkout
  lines.
- Exact inventory, reservation, owner-token, minor-unit price snapshot,
  formatted decimal price, currency, reservation expiry, and deterministic
  snapshot hash payload planning.
- Optional WooCommerce/card descriptor metadata copying for cart IDs, cart item
  keys, barcodes, condition codes, provider IDs, card names, set names, card
  numbers, product IDs, and variation IDs.
- Unit coverage for valid metadata payloads, validator error propagation,
  optional descriptor normalization, deterministic snapshot hashes, and
  zero-price snapshots.

### Not Added

- Live WooCommerce checkout hook execution, HPOS order writes, Store API order
  mutation, payment lifecycle conversion, cart release hooks, and refund
  lifecycle handling remain disabled for later staging-gated phases.

## [0.28.0] - 2026-06-06

### Added

- Reservation expiry cleanup planner for candidate active reservation rows.
- Expired active hold release payloads with reservation ID, inventory ID,
  source/cart context, expiry timestamp, target statuses, release reason, and
  deterministic cleanup idempotency keys.
- Explicit reservation service `expire()` transition that restores reserved
  inventory to available and marks the reservation `expired`.
- Unit coverage for expired holds, equal-to-now expiries, future holds,
  inactive lifecycle rows, invalid rows, and service expiry transitions.

### Not Added

- Live Action Scheduler cleanup jobs, WooCommerce cart timer wiring, database
  race integration tests, and automatic cleanup execution remain disabled for
  later staging-gated phases.

## [0.27.0] - 2026-06-06

### Added

- ScryDex persistence planner for normalized sync page plans.
- Deterministic reference-card insert payload planning with public IDs,
  timestamps, and row-version defaults.
- Changed-row update planning with field diffs, reference card IDs, timestamps,
  and row-version increments.
- Unchanged reference-card detection and current price observation planning with
  known local reference IDs when available.
- Unit coverage for insert planning, changed-row update planning, unchanged
  rows, price observation reference IDs, and failed page plan guards.

### Not Added

- Live ScryDex `wpdb` write workers, scheduled pulls, image downloads,
  usage-budget enforcement, and webhook processing remain disabled for later
  staging-gated phases.

## [0.26.0] - 2026-06-06

### Added

- Manager override persistence planner for accepted below-minimum sale
  approvals that require stored override rows.
- Manager override row payload planning for employee, manager, inventory,
  order, location, cart, price, currency, expiration, and reason fields.
- Audit-safe payload planning with decision code, minimum sale price, reason
  hash, and minor-unit to decimal price conversion.
- Unit coverage for persisted override payloads, policy-rejected skip results,
  no-row-required skip results, and invalid optional context IDs.

### Not Added

- Live manager PIN/password reauthentication, database inserts, audit service
  writes, WooCommerce/POS hook wiring, and rate limiting remain disabled for
  later staging-gated phases.

## [0.25.0] - 2026-06-06

### Added

- Buylist planned REST route contracts for submission intake, staff listing,
  owner/staff detail, review, offer, customer acceptance, and inventory
  conversion flows.
- Buylist submission intake parser for source, idempotency, customer identity,
  currency, owner token hash, optional customer/location IDs, and card item rows.
- Unit coverage for planned route permissions, disabled-by-default live status,
  valid intake normalization, missing submission fields, invalid item rows, bad
  owner tokens, and invalid optional IDs.

### Not Added

- Live buylist route registration, permission callbacks, staff review UI,
  offer storage, customer acceptance writes, customer credit payout posting,
  and inventory conversion workers remain disabled for later staging-gated
  phases.

## [0.24.0] - 2026-06-06

### Added

- Customer credit planned REST route contracts for balance, ledger, adjustment,
  and redemption flows.
- Customer credit REST posting payload parser for route/customer matching,
  idempotency keys, amount format, currency normalization, optional linked IDs,
  metadata object validation, and manager-approved adjustments.
- Unit coverage for the planned route permissions, disabled-by-default live
  status, valid redemption parsing, customer mismatch rejection, manager
  approval requirements, and invalid optional request fields.

### Not Added

- Live customer credit REST route registration, nonce/capability callbacks,
  staff UI, WooCommerce redemption hooks, and audit writes remain disabled for
  later staging-gated phases.

## [0.23.0] - 2026-06-06

### Added

- WooCommerce serialized inventory hook contract registry.
- Unit coverage for exact inventory cart, checkout, payment, refund, cart
  removal, and Store API validation hook contracts.
- Stable hook metadata for handler method, lifecycle phase, priority, accepted
  args, default live-gating, and purpose.

### Not Added

- Live WooCommerce hook registration, HPOS lifecycle verification,
  order-reservation persistence, Store API execution, and payment/refund
  integration remain disabled for later staging-gated phases.

## [0.22.0] - 2026-06-06

### Added

- ScryDex sync page processor and page plan result.
- Fixture-backed planning for normalized reference-card rows, current price
  rows, normalization errors, checkpoint advancement, and retryable provider
  failures.

### Not Added

- Database upsert workers, scheduled pulls, image downloads, usage-budget
  enforcement, and webhook processing remain disabled for later phases.

## [0.21.0] - 2026-06-06

### Added

- POS/payment reconciliation policy module for sanitized sandbox provider
  responses.
- Node tests for approved payment normalization, scan-gated exact item sales,
  declined payments, unmapped POS line conflicts, and refund-to-review behavior.
- Root `npm run test` wiring for POS/payment policy tests.

### Not Added

- Live Square/POS connection, WooCommerce gateway capture, payment webhooks,
  provider inventory writes, and production payment credentials remain disabled.

## [0.20.0] - 2026-06-06

### Added

- Shared sync-engine offline conflict policy module.
- Node-based offline sync tests for inventory reservation acceptance/conflict,
  event reservation acceptance/waitlist/capacity conflict, customer credit
  redemption acceptance/local-limit rejection/overspend conflict, and device
  revocation rejection.
- Root `npm run test` wiring for sync-engine tests.

### Not Added

- Tauri app, SQLite queue persistence, WordPress offline REST endpoints, device
  auth API, and live pull/push sync workers remain disabled for later phases.

## [0.19.0] - 2026-06-06

### Added

- TopDeck registration push adapter for mapping local event registration rows
  to provider registration calls.
- TopDeck sync result mapping for registered, pending invitation, capacity
  conflict, missing configuration/input, and retryable provider failures.
- Unit coverage for TopDeck email selection, customer email fallback,
  override-cap pass-through, capacity conflicts, missing TID/email guards, and
  retryable failure updates.

### Not Added

- Queued TopDeck worker execution, live provider calls, payment-complete push,
  and staff recovery UI remain disabled for later staging-gated phases.

## [0.18.0] - 2026-06-06

### Added

- Migration runner pending-version and rollback-version planning helpers.
- Unit coverage for clean install, prior-schema upgrade, current-schema
  idempotent rerun, rollback order, and no-op rollback plans.

### Not Added

- Live MySQL migration transaction, row-lock, `dbDelta`, backup/restore, and
  rollback integration tests remain staged for WordPress/staging environments.

## [0.17.0] - 2026-06-06

### Added

- Dependency-free REST route contract coverage for the health endpoint and
  public Events list/detail/registration endpoints.
- Shared controller route contract definitions used by both unit tests and
  WordPress route registration.
- Guard coverage proving unimplemented customer, buylist, inventory, offline,
  and POS write routes are not registered yet.

### Not Added

- Full WordPress REST permission, nonce, request/response, and write-flow
  integration tests remain staged for the WordPress integration suite.

## [0.16.0] - 2026-06-06

### Added

- WooCommerce serialized cart item metadata validator for exact inventory
  checkout line preparation.
- Validation for one-item serialized quantities, required inventory and
  reservation IDs, owner token hashes, immutable price snapshots, ISO currency,
  and unexpired reservations.
- Unit coverage for valid cart metadata, missing exact-item metadata, quantity
  enforcement, expired reservations, and invalid price/currency snapshots.

### Not Added

- Live WooCommerce add-to-cart, cart-session, checkout, payment-complete,
  order-line, Store API, cart removal, and refund hook wiring remain disabled
  for later staging-gated phases.

## [0.15.0] - 2026-06-06

### Added

- Manager override request, decision, and policy helpers for below-minimum sale
  authorization.
- Policy enforcement for distinct manager approval, required reason, invalid
  amount rejection, and override-row persistence requirement.
- Unit coverage for no-override-needed sales, missing manager approval,
  same-user approval rejection, missing reason rejection, valid approval, and
  invalid amount rejection.

### Not Added

- Manager override persistence, manager PIN reauthentication, WooCommerce/POS
  below-minimum hook wiring, and audit log writes remain disabled for later
  staging-gated phases.

## [0.14.0] - 2026-06-06

### Added

- Reservation lifecycle service helpers for converting active reservations to
  sold inventory and releasing active reservations back to available inventory.
- Idempotent replay behavior for already-converted lifecycle transitions.
- Inventory-state mismatch protection so release/conversion cannot silently
  overwrite sold or otherwise unexpected inventory state.
- Unit coverage for conversion, release, idempotent conversion replay, and
  inventory-state mismatch rejection.

### Not Added

- WooCommerce add-to-cart/checkout hooks, order line metadata writes,
  payment-complete hook wiring, cart release hooks, expiry cleanup workers, and
  database race integration tests remain disabled for later staging-gated
  phases.

## [0.13.0] - 2026-06-06

### Added

- Schema migration `0007_reservations`.
- Exact inventory reservation table contract with idempotency key, expiry,
  ownership token hash, source/cart/customer/order metadata, and a unique
  active inventory claim key.
- Reservation request/result/storage/service foundation for transaction-backed
  exact item reservations.
- Unit coverage for reservation schema, successful reservation, idempotency
  replay, unavailable inventory rejection, active-reservation collision
  rejection, and pre-transaction idempotency validation.
- WordPress integration smoke verification for schema version `7` and
  reservation tables.

### Not Added

- WooCommerce add-to-cart/checkout hooks, payment-complete conversion, cart
  removal release, expiry cleanup workers, kiosk cart write APIs, and database
  integration race tests remain disabled for later staging-gated phases.

## [0.12.0] - 2026-06-06

### Added

- ScryDex card normalizer for mapping provider card payloads into local
  reference-card row shapes.
- ScryDex market price normalization for current provider price rows with
  currency validation and observed timestamps.
- Fixture-backed unit coverage for card rows, price rows, required-field
  errors, and nullable optional fields.

### Not Added

- ScryDex database upserts, scheduled workers, image downloads, live provider
  credential configuration, usage-budget enforcement, and webhook route
  handling remain disabled for later staging-gated phases.

## [0.11.0] - 2026-06-06

### Added

- ScryDex provider result object and adapter contract.
- ScryDex HTTP provider with injectable transport, card search, card detail,
  usage request, default-disabled webhook registration, credential header
  handling, rate-limit mapping, unauthorized mapping, and auth-context redaction.
- Team ID redaction in the shared log redactor for provider auth contexts.
- Unit coverage for missing ScryDex credentials, fixture-backed card search,
  credential headers, rate-limit mapping, and ScryDex auth-context redaction.

### Not Added

- Scheduled ScryDex workers, live provider credential configuration,
  normalization/upsert logic, image downloads, usage-budget enforcement, and
  webhook route handling remain disabled for later staging-gated phases.

## [0.10.0] - 2026-06-06

### Added

- Schema migration `0006_sync`.
- Sync job, job log, checkpoint, error, and webhook event table contracts.
- ScryDex checkpoint value object and request planner for page/cursor resume.
- Unit coverage for sync schema contracts and ScryDex checkpoint resume behavior
  using the sanitized mock checkpoint fixture.
- WordPress integration smoke verification for schema version `6` and sync
  tables.

### Not Added

- Live ScryDex HTTP adapter, normalization/upsert workers, image download
  workers, usage-budget enforcement, and webhook route handling remain disabled
  for later staging-gated phases.

## [0.9.0] - 2026-06-06

### Added

- Customer credit ledger posting request/result objects.
- Customer credit ledger storage contract and `wpdb` repository.
- Transactional customer credit ledger posting service with required
  idempotency keys, customer row locking, currency checks, cached balance
  updates, and duplicate replay handling.
- Unit coverage for successful credit posting, idempotency replay, overspend
  rejection, and missing idempotency-key rejection.

### Not Added

- Customer credit REST endpoints, WooCommerce redemption hooks, offline credit
  conflict processing, and staff UI remain disabled for later staging-gated
  phases.

## [0.8.0] - 2026-06-06

### Added

- Schema migration `0005_buylist`.
- Buylist submission, item, offer, approval, and inventory conversion log table
  contracts.
- Buylist submission status helper for draft, review, offer, acceptance,
  payout, conversion, completion, cancellation, rejection, and expiry flows.
- Unit coverage for buylist schema contracts and status transitions.
- WordPress integration smoke verification for schema version `5` and buylist
  tables.

### Not Added

- Buylist REST write endpoints, staff review UI, customer credit payout posting,
  and inventory conversion workers remain disabled for later staging-gated
  phases.

## [0.7.0] - 2026-06-06

### Added

- Schema migration `0004_customer_credit`.
- Customer, contact, credit ledger, merge log, and customer note table
  contracts.
- Customer credit entry type helper with typical signs and manager-approval
  requirements.
- Customer credit posting policy helper with four-decimal signed amount
  previews, before/after balances, manager approval checks, and negative
  balance rejection.
- Unit coverage for customer credit schema, entry type rules, and posting
  policy decisions.
- WordPress integration smoke verification for schema version `4` and customer
  credit tables.

### Not Added

- Customer credit REST endpoints, WooCommerce redemption hooks, offline credit
  conflict processing, and staff UI remain disabled for later phases.

## [0.6.0] - 2026-06-06

### Added

- Public local event registration route:
  `POST /wp-json/tcg-store/v1/events/{slug}/register`.
- Event registration input validation and sanitization for name, email,
  TopDeck email, phone, and idempotency keys.
- Registration acceptance policy for local-only and website-push events,
  including registration deadline checks, sold-out rejection, waitlist
  placement, TopDeck-hosted rejection, and pay-at-store gating for paid events.
- Transaction-backed registration service and repository with event-row locking,
  idempotency reuse, registration inserts, waitlist rows, count/status updates,
  and registration logs.
- Same-event/email duplicate prevention for active registrations, plus
  idempotency-key conflict handling when a key is reused for a different event
  or email.
- Pending TopDeck sync-log queue records for eligible free website-push
  registrations, without live provider calls.
- Unit coverage for registration input validation, registration policy outcomes,
  duplicate detection, TopDeck queue planning, and REST result response shaping.
- WordPress integration smoke assertion for the registration REST route.

### Not Added

- WooCommerce event-ticket products, online payment capture, paid order
  lifecycle hooks, and TopDeck registration push remain disabled for later
  staging-gated phases.
- No schema migration was added; this release uses existing schema version `3`.

## [0.5.0] - 2026-06-06

### Added

- Public read-only Events REST endpoints:
  `/wp-json/tcg-store/v1/events` and `/wp-json/tcg-store/v1/events/{slug}`.
- Event listing filter sanitization for game, format, event type, date,
  free/paid, competitive/casual, featured, and registration status filters.
- Public event presenter that derives seats remaining, public status, badges,
  TopDeck attribution, and hosted registration links.
- `[tcg_events]` and `[tcg_event_detail]` shortcodes for public list/detail
  pages.
- Unit coverage for event filters and public event presentation.

### Not Added

- Event registration writes, WooCommerce event ticket products, payment capture,
  waitlist mutation, and TopDeck push remain disabled for a later phase.

## [0.4.0] - 2026-06-06

### Added

- Phase 3 Events and TopDeck schema migration `0003`.
- Event, registration, waitlist, check-in, TopDeck sync log, and template table
  contracts.
- Event registration mode, status, capacity, seat, and public badge helpers.
- TopDeck provider adapter with prompt-required methods, injectable transport,
  register-player response mapping, key redaction context, and default
  `createEvent()` `not_supported` behavior.
- TopDeck settings defaults for sandbox credentials, base URL, rate limit, and
  create-event safety.
- Unit coverage for Events/TopDeck schema, status rules, TopDeck adapter
  outcomes, and settings sanitization.

## [0.3.0] - 2026-06-06

### Added

- Phase 2 inventory and pricing schema migration `0002`.
- Reference card/variant, inventory location/item, movement, barcode, price
  change, and manager override table contracts.
- Inventory status transition and intake validation helpers.
- Market-plus-10-percent pricing calculator with minimum-floor, currency,
  status, and price-lock handling.
- Dependency-free unit coverage for Phase 2 schema and business rules.
- GitHub Actions WordPress integration workflow with WP-CLI activation and
  schema/REST/role smoke verification.
- GitHub-first development, staging, deployment, and rollback governance.
- Official `wp-env` local WordPress configuration with development seed and
  mock provider fixtures.
- Pull-request quality gate workflow and required test scaffold manifest.

## [0.2.0] - 2026-06-06

### Added

- Phase 1 WordPress plugin bootstrap and dependency health checks.
- Reversible foundation migration and schema tracking.
- Platform roles, capabilities, settings, feature flags, logging, and audit
  services.
- Daylight-saving-safe Action Scheduler daily dispatch.
- Authenticated REST health endpoint and admin system-status screens.
- Local PHP checks and GitHub CI.

### Security

- Unfinished modules are forced off.
- Kiosk users are blocked from wp-admin.
- Structured logs and audit context redact secrets.
- HPOS compatibility remains explicitly pending until lifecycle tests pass.

## [0.1.0-planning] - 2026-06-06

### Added

- Phase 0 architecture blueprint.
- Source-of-truth and integration boundaries.
- Database, REST, WooCommerce, offline sync, security, provider, UX, and testing
  plans.
- Architecture decisions and phased roadmap.

### Not Added

- No application code.
- No database migrations.
- No production credentials or live data.
