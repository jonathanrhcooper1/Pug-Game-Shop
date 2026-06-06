# Changelog

All notable changes follow Semantic Versioning.

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
