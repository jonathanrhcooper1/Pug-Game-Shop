# System Map

Date: 2026-06-17

## Main Applications

- WordPress plugin: `apps/wordpress-plugin`
- WordPress theme: `apps/storefront-theme-or-blocks/pug-arcade-commerce-v2`
- Local sync middleman server: `apps/local-sync-server`
- Employee/offline app: `apps/offline-app`
- Shared adapters and policy packages: `packages`
- Deployment, smoke, and packaging scripts: `scripts`
- End-to-end tests: `tests/e2e`

## WordPress Plugin Entry Points

- Plugin bootstrap: `apps/wordpress-plugin/tcg-store-platform.php`
- Main bootstrap class: `apps/wordpress-plugin/src/Bootstrap/Plugin.php`
- Admin menu/workspace: `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- Migrations: `apps/wordpress-plugin/src/Migrations`
- REST API routes: `apps/wordpress-plugin/src/Api/V1`
- Public shortcodes: `apps/wordpress-plugin/src/PublicSite`, `apps/wordpress-plugin/src/Events`
- WooCommerce hooks: `apps/wordpress-plugin/src/WooCommerce`

## Public Pages

- Home: `/`
- Singles: `/shop-singles/`
- Sealed: `/shop-sealed-products/`
- Graded: `/shop-graded-cards/`
- Accessories: `/shop-accessories/`
- Events: `/events/`
- Buying: `/buying/`
- Contact: `/contact/`
- Cart: `/cart/`

## App Pages

- Login/PIN
- Inventory
- Trade-Ins
- Checkout
- Fulfillment
- Queue
- Events
- Reports
- Customers
- Settings
- Customer kiosk mode through app/package configuration

## Key REST Route Areas

- Inventory/search: `tcg-store/v1` inventory route contracts
- Offline devices/pull/push/conflicts: `OfflineRouteContracts`
- POS/payment events/reconciliation/webhooks: `PosPaymentRouteContracts`
- ScryDex catalog status/index/export: `ScryDexCatalogController`
- Customer and credit routes: `CustomerController`, `CustomerCreditController`
- Events routes: `EventsController`
- Kiosk orders: `KioskOrderController`
- Fulfillment orders: `FulfillmentOrderController`
- Reports: `ReportsController`

## Background / Sync Jobs

- ScryDex full and resume index scripts: `scripts/production-run-scrydex-index.mjs`
- ScryDex sync workers/checkpoints: `apps/wordpress-plugin/src/ScryDex`
- Local sync queue and replay: `apps/local-sync-server/src/localSyncStore.mjs`
- WordPress push/pull adapters: `apps/local-sync-server/src/wordpress*.mjs`
- Hold expiry and fulfillment queue logic: `apps/local-sync-server/src/localSyncStore.mjs`

## Connector Classes

- ScryDex provider/client: `apps/wordpress-plugin/src/ScryDex`
- WordPress catalog fallback: `apps/local-sync-server/src/wordpressCatalogFallback.mjs`
- WordPress inventory/customer/credit/event/kiosk/fulfillment adapters: `apps/local-sync-server/src/wordpress*.mjs`
- Square inventory adapter: `packages/api-client/src/squareInventoryAdapter.mjs`
- WooCommerce product adapter: `packages/api-client/src/woocommerceProductAdapter.mjs`
- Square Terminal scaffold: `apps/local-sync-server/src/squareTerminalConnector.mjs`
- POS policy validation: `packages/validation/src/posPaymentPolicy.mjs`

## Database Table Areas

- Inventory and pricing
- Events and event registrations
- Customer credit ledger
- Buylist/trade-ins
- Sync checkpoints
- Reservations
- Offline sync devices/operations/conflicts
- POS payments/reconciliation
- Provider price observations/points
- ScryDex reference sets/cards/variants
- External inventory mappings

Concrete migration files live in `apps/wordpress-plugin/src/Migrations/Version0001Foundation.php` through `Version0015ProviderPriceReferenceBackfill.php`.

## Test Commands

- `npm run test:local`
- `npm run test:sync-engine`
- `npm run test:pos-payments`
- `npm run test:api-client`
- `npm run test:offline-app`
- `npm run test:packaging`
- `npm run test:required-matrix`
- `npm run test:e2e`
- `npm run build`
- `npm run verify:no-production-secrets`
- `npm run package:production-release`
- `npm run production:verify-active-syncs`

