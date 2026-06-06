# TCG Store Platform

Production platform for a physical trading-card store with WordPress/WooCommerce,
serialized inventory, an offline-capable Windows app, provider integrations,
customer store credit, buylist intake, kiosk carts, and events.

## Current Status

Version: `0.27.0`

Phase 0 architecture is complete. The WordPress plugin foundation,
inventory/pricing schema, Events/TopDeck schema and adapter contracts, and
public Events REST/shortcode surface are implemented and locally verified.
Local event registration writes are available for free and pay-at-store
reservations with idempotency, capacity checks, waitlist placement, and
registration logs. Customer credit schema, ledger posting policy helpers, and
idempotent ledger posting internals are implemented. Customer credit REST route
contracts and posting payload validation are implemented but not registered live
yet. Buylist submission, item, offer, approval, and inventory conversion schema
plus the submission status state machine are implemented. Buylist planned REST
route contracts and submission intake payload validation are implemented but not
registered live yet. ScryDex sync job/checkpoint schema, checkpoint resume
planning helpers, mock-backed provider adapter, card/price normalization, sync
page processing, and reference/price persistence planning are implemented. Exact
inventory reservation schema and
transaction-oriented reservation reserve/release/convert service foundations
are implemented for double-sell prevention. Manager override policy helpers are
implemented for below-minimum sale authorization, and manager override
persistence/audit payload planning is implemented for future stored approvals.
WooCommerce serialized cart item metadata validation is implemented for future
checkout hooks. WooCommerce
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
WooCommerce event-ticket flows, online payment capture, live TopDeck
registration push, WooCommerce checkout hooks, credit REST endpoints, buylist
write APIs, scheduled ScryDex write workers, and production provider
credentials remain disabled until staging
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
