# TCG Store Platform

Production platform for a physical trading-card store with WordPress/WooCommerce,
serialized inventory, an offline-capable Windows app, provider integrations,
customer store credit, buylist intake, kiosk carts, and events.

## Current Status

Version: `0.76.0`

Phase 0 architecture is complete. The WordPress plugin foundation,
inventory/pricing schema, Events/TopDeck schema and adapter contracts, and
public Events REST/shortcode surface are implemented and locally verified.
White-label company branding settings are implemented for configurable company
names, support/logo URLs, receipt footer text, theme colors, staging banner
color, and client-safe CSS variable export.
Local event registration writes are available for free and pay-at-store
reservations with idempotency, capacity checks, waitlist placement, and
registration logs. Customer credit schema, ledger posting policy helpers, and
idempotent ledger posting internals are implemented. Customer credit REST route
contracts, posting payload validation, and safe REST response presentation are
implemented but not registered live yet. Buylist submission, item, offer,
approval, and inventory conversion schema plus the submission status state
machine are implemented. Buylist planned REST route contracts and submission
intake payload validation are implemented. Buylist offer planning now covers
reviewed item offers, totals, approval thresholds, and offer fingerprints, but
live buylist write APIs are not registered yet. ScryDex sync job/checkpoint
schema, checkpoint resume
planning helpers, mock-backed provider adapter, card/price normalization, sync
page processing, and reference/price persistence planning are implemented. Exact
inventory reservation schema and
transaction-oriented reservation reserve/release/convert service foundations
are implemented for double-sell prevention, with reservation expiry cleanup
planning and explicit expired-hold release transitions now covered. Manager
override policy helpers are
implemented for below-minimum sale authorization, and manager override
persistence/audit payload planning is implemented for future stored approvals.
WooCommerce serialized cart item metadata validation and order-line metadata
snapshot planning are implemented for future checkout hooks. WooCommerce order
lifecycle transition planning is implemented for checkout linkage, payment
completion, failed/cancelled release, and refund review behavior. WooCommerce
serialized inventory hook contracts are defined and unit-tested for classic
cart, checkout, payment, refund, cart removal, and Store API validation flows.
REST route contracts for health and public event endpoints are unit-tested
alongside the WordPress smoke route registration check. Migration planning is
unit-tested for clean install, upgrade, idempotent current-schema reruns, and
rollback order. TopDeck registration push mapping is implemented and
unit-tested for later queue workers.
Offline sync conflict policy tests are implemented in the shared sync engine
for inventory reservations, event reservations, customer credit redemption, and
device revocation.
POS/payment reconciliation policy tests are implemented for sanitized sandbox
responses, exact scanned item sales, refunds, declines, and unmapped line
conflicts.
The offline app now has a Tauri/React/TypeScript Windows packaging scaffold,
NSIS `.exe` target metadata, contract tests, and a manual GitHub Actions
workflow for unsigned installer builds. Its first SQLite schema contract is
also implemented for device identity, sync cursors, operation queue, logs,
cached branding/inventory/credit/events, and conflicts. WordPress-side planned
offline device pairing, push, pull, and conflict REST route contracts are
implemented with route-level permission strategies, registered-device pull/push
scopes, and live registration disabled. Offline push operation envelope
validation is implemented for client operation IDs, device matching,
operation/entity pairs, row-version metadata, timestamps, payload objects,
authorization context, batch IDs, and schema version gating.
Offline pull request validation is implemented for device IDs, cached domain
selection, domain cursors, page-size bounds, tombstone inclusion, and schema
version gating. Offline pull response presentation is implemented for stable
per-domain cursors, change rows, tombstones, server timestamps, and
`has_more` pagination flags. Offline device pairing request validation is
implemented for short-lived pairing codes, installation IDs, device modes,
manager/location IDs, app versions, Windows platform checks, hardware
capabilities, requested scopes, and schema version gating. Offline device
registration planning is implemented for future device rows, one-time response
payloads, token-hash storage fields, sync routes, first-sync flags, and audit
payloads without persisting or issuing real credentials yet. Offline device
registration credential issuance now generates schema-length device IDs,
one-time tokens, SHA-256 token hashes, UTC issue/expiry timestamps, TTL policy,
and secret-free fingerprints for the future pairing flow without wiring live
routes. Offline device registration insert query planning now maps those rows
into prepared `tcg_offline_devices` SQL templates with JSON/timestamp
normalization and secret-free audits. Offline device registration repository
adaptation now executes that planned insert only when explicitly called and
returns inserted or rejected outcomes with the one-time pairing response kept
out of audit logs; live route wiring remains disabled. Offline device access
policy checks are implemented for future registered-device permission
callbacks, covering active status, revocation timestamps, token expiry,
required scopes, supported modes/scopes, location IDs, and UTC timestamp
validation. Offline conflict list and resolution request validation is
implemented for future conflict-center filters, idempotent manager resolution
actions, expected row versions, UTC resolution timestamps, and adjustment
payloads. Offline conflict list response presentation is implemented for
stable conflict rows, filters, cursors, severity, row versions, payload
objects, and available manager resolution options. Offline conflict resolution
planning is implemented for future row updates, response payloads, stale-version
guards, terminal-status guards, action availability checks, and redacted audit
payloads. Offline push operation resolution planning is implemented for future
queue replay outcomes, covering accepted inventory/event/credit operations,
rejections, manager-reviewed conflict rows, deterministic conflict IDs, and
redacted audit payloads. Offline push batch resolution planning is implemented
for future route handlers, including per-operation results, batch counts,
conflict row enrichment, server snapshot lookup, and redacted batch audit
payloads. WordPress-side offline sync persistence schema is implemented for
registered devices, idempotent operation queue/result rows, manager-reviewed
conflicts, and per-device pull cursors. Offline push persistence planning now
maps resolved batches into future queue/result rows, conflict insert rows, and
idempotent replay rows without mutating the database. Offline bearer-token
authentication planning is implemented for future REST permission callbacks,
including header normalization, token shape validation, SHA-256 token hash
comparison, persisted offline-device ID enforcement, and delegated
active/revoked/expired/scope policy checks. Offline token lookup planning is
implemented for future repositories, exposing a hashed lookup filter and
secret-free audit fingerprint before any raw device row is loaded. Offline
device session planning is implemented for future permission callbacks,
producing last-seen update rows, session context, row-version increments, and
secret-free audit payloads after a device row is authenticated. Registered
device permission planning now composes token lookup, loaded-row authentication,
and session update planning into lookup-needed, denied, or authorized plan
states for future REST permission callbacks. Registered device row
normalization now converts raw future repository rows into auth/session-ready
device rows with decoded scopes/capabilities, UTC timestamps, validation
errors, and secret-free audits. Registered device lookup-query planning now
turns valid token lookup plans into future repository query arguments with
selected columns, active/revocation/expiry filters, row-normalizer metadata,
lock intent, deferred scope checks, and secret-free audits.
Registered device permission planning now carries those lookup-query arguments
on lookup-required outcomes and rejects invalid scope/time query plans before a
future repository call. Registered device lookup query building now validates
the planned query contract, prefixes safe WordPress table names, converts UTC
expiry filters into MySQL `datetime(6)` arguments, and emits a prepared-SQL
template. Registered device repository adaptation now composes that query
builder with `$wpdb` reads and row normalization for future permission
callbacks, returning found, not-found, or rejected outcomes with redacted
audits when called. Registered device permission resolution now composes the
permission planner, repository adapter, loaded-row authentication, and session
planning into one route-ready outcome while remaining unwired from live REST
routes. Offline device session update query building now turns those planned
last-seen updates into optimistic, row-version guarded SQL templates and
prepared arguments without executing live writes. Offline device session update
repository adaptation now executes that prepared last-seen update only when
explicitly called, returning applied, stale, or rejected outcomes while staying
unwired from live REST permission callbacks. Registered device permission
resolution can now opt in to applying that session update through the adapter,
keeping the default `resolve()` path plan-only and denying stale or rejected
session updates before a future live route proceeds. A planned registered
device permission callback adapter now extracts headers from WordPress-style
requests, invokes that resolver boundary, returns a boolean callback result,
and stores the last resolution for audits without registering routes live.
Offline route permission callback factory planning now maps the registered
device pull/push routes to `offline_pull` and `offline_push` callback adapters
without registering routes live.
Offline route registration planning now emits disabled-by-default registration
metadata, fail-closed permission callbacks for unwired routes, and block
reasons proving offline routes remain staging-gated.
The offline controller scaffold now exposes every planned callback method, but
each method returns a stable disabled response until live handlers pass staging
gates.
The guarded offline route registrar now registers zero current offline routes
by default and only calls a registrar for future plans marked ready and enabled.
Offline REST request adaptation now normalizes body params, query params,
route params, headers, and idempotency keys for future route handlers, and the
controller can dispatch to explicitly injected handlers while default behavior
still fails closed.
Parser-only offline route validation handlers can now be injected into the
controller for device pairing, pull, push, conflict list, and conflict
resolution callbacks, returning safe validation summaries while writes remain
deferred and routes remain gated.
Offline route bootstrap planning now summarizes the current route-registration
state, feature-gate state, registerable route keys, and block reasons before
any future staging bootstrap can call live route registration.
The authenticated health response and admin System Status screen now surface
that offline route bootstrap status and deferred registration state for staging
readiness checks while the offline routes remain unregistered.
The offline route bootstrapper is now wired to WordPress `rest_api_init`, but
it defers the guarded registrar unless the feature gate and future route
readiness plan both allow registration.
WooCommerce event-ticket flows, online payment capture, live TopDeck
registration push, WooCommerce checkout hook execution, live order mutation,
credit REST endpoints, buylist write APIs, scheduled ScryDex write workers,
live reservation cleanup workers, live offline route registration, live device
row permission checks, route permission callback wiring, route-connected
device last-seen database writes, live offline push handlers, live batch queue
replay, and production provider credentials remain disabled until staging
acceptance.

## Source Of Truth

- Custom WordPress plugin tables are authoritative for serialized inventory,
  reservations, customer credit, buylist, sync state, and event state.
- WooCommerce is authoritative for online cart, checkout, payment gateway
  processing, and order records.
- The offline app is an operation queue and local read model, not an independent
  permanent source of truth.
- ScryDex and future card-data providers supply reference data. They never own
  store inventory.
- POS/payment providers record payment and transaction activity. They never own
  serialized inventory state.

## Phase 0 Documents

- [Phase 0 Blueprint](docs/PHASE_0_BLUEPRINT.md)
- [Phase 1 Foundation](docs/PHASE_1_FOUNDATION.md)
- [Phase 2 Inventory And Pricing](docs/PHASE_2_INVENTORY_PRICING.md)
- [Development Workflow](docs/DEVELOPMENT_WORKFLOW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [REST API](docs/API.md)
- [UI Flows](docs/UI_FLOWS.md)
- [Security](docs/SECURITY.md)
- [Offline Sync](docs/OFFLINE_SYNC.md)
- [Branding](docs/BRANDING.md)
- [ScryDex Integration](docs/SCRYDEX_INTEGRATION.md)
- [TopDeck Integration](docs/TOPDECK_INTEGRATION.md)
- [Payments and POS](docs/PAYMENTS_POS.md)
- [Events](docs/EVENTS.md)
- [Customer Credit](docs/CUSTOMER_CREDIT.md)
- [Buylist](docs/BUYLIST.md)
- [Testing](docs/TESTING.md)
- [Staging](docs/STAGING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [GoDaddy Deployment](docs/DEPLOYMENT_GODADDY.md)
- [Offline App Deployment](docs/DEPLOYMENT_OFFLINE_APP.md)
- [Roadmap](docs/ROADMAP.md)
- [Architecture Decisions](docs/DECISIONS.md)
- [Changelog](docs/CHANGELOG.md)

## Monorepo

```text
tcg-store-platform/
  apps/
    wordpress-plugin/
    storefront-theme-or-blocks/
    offline-app/
    shared-ui/
    shared-types/
  packages/
    api-client/
    pricing-engine/
    sync-engine/
    barcode-labels/
    validation/
  docs/
  migrations/
  tests/
  fixtures/
  scripts/
```

Live inventory, customer, payment, credit, order, and attendee data must never
be committed to this repository.

## Local WordPress Development

This repository includes official `@wordpress/env` support:

```sh
npm install
npm run wp-env:start
npm run wp-env:seed
npm run test
```

Production deployment is manual only. Codex work must happen on `feature/*`
branches and be reviewed through pull requests.
