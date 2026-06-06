# TCG Store Platform

Production platform for a physical trading-card store with WordPress/WooCommerce,
serialized inventory, an offline-capable Windows app, provider integrations,
customer store credit, buylist intake, kiosk carts, and events.

## Current Status

Version: `0.5.0`

Phase 0 architecture is complete. The WordPress plugin foundation,
inventory/pricing schema, Events/TopDeck schema and adapter contracts, and
read-only public Events REST/shortcode surface are implemented and locally
verified. Event registration, WooCommerce event-ticket flows, and production
TopDeck credentials remain disabled until staging acceptance.

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
