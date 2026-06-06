# TCG Store Platform WordPress Plugin

Version: `0.20.0`

## Implemented Features

- Multisite-aware activation and uninstall.
- Versioned, reversible foundation migration.
- Inventory and pricing schema migration.
- Foundation settings, role-permission, audit, and migration tables.
- Reference card/variant, inventory location/item, movement, barcode, price
  change, and manager override tables.
- Least-privilege staff, manager, kiosk, and system roles.
- WordPress Settings API screen.
- Structured JSON logging with secret redaction.
- Immutable audit append service.
- Action Scheduler integration for 9:00 AM Eastern daily dispatch.
- Authenticated `/wp-json/tcg-store/v1/health` endpoint.
- Local inventory status, intake validation, and pricing policy helpers.
- Events and TopDeck schema migration.
- Event registration status, public event badge, and capacity helpers.
- TopDeck provider adapter with owned tournament, tournament info, attendee,
  register-player, import, sync, and default-disabled create-event contract.
- Public read-only event REST endpoints and shortcodes for event list/detail
  pages.
- Public local event registration endpoint for free and pay-at-store
  reservations with idempotency, event-row locking, capacity checks, waitlist
  insertion, count updates, and registration logs.
- Customer, contact, credit ledger, merge, and note schema migration.
- Customer credit entry type and posting policy helpers for signed ledger
  previews, manager approval, and negative-balance rejection.
- Customer credit ledger posting service and repository with idempotency,
  customer row locking, cached balance updates, and replay handling.
- Buylist submission, item, offer, approval, and conversion schema migration.
- Buylist submission status transition helper.
- Generic sync job/checkpoint/error/webhook schema migration.
- ScryDex checkpoint/resume value and request planning helpers.
- ScryDex provider adapter contract and HTTP provider with mock-backed tests,
  credential redaction, rate-limit mapping, and default-disabled webhook
  registration.
- ScryDex card and market price normalization helpers for local reference rows.
- Reservation schema migration and reservation service foundation for exact
  inventory active-claim enforcement.
- Reservation lifecycle service helpers for idempotent conversion to sold and
  release back to available.
- Manager override policy helpers for below-minimum sale authorization.
- WooCommerce serialized cart item metadata validator for exact inventory
  checkout lines.
- Dependency-free REST route contract tests for health and public Events
  endpoints.
- Migration runner planning coverage for clean install, upgrade, idempotent
  current-schema rerun, and rollback order.
- TopDeck registration push adapter and result mapping for later queue workers.
- Hard-disabled flags for unfinished modules.
- Explicit pending HPOS verification state.

## Local Checks

With PHP 8.1 or newer:

```sh
php tests/lint.php
php tests/run.php
```

Composer is optional at runtime. When available:

```sh
composer install
composer lint
composer test
composer standards
```

To run a local WordPress Playground smoke site without Docker or MySQL:

```sh
npx @wp-now/wp-now start --php=8.2 --blueprint=tests/wp-now-blueprint.json
```

On Windows, older `wp-now` releases may fail while installing WordPress.org
plugins from a Blueprint. If that happens, run `npx @wp-now/wp-now start
--php=8.2` from this plugin directory to verify plugin activation and admin
status locally, then rely on GitHub Actions for the WooCommerce-backed
integration gate.

`composer.lock` is committed so CI and future developers use the reviewed tool
versions.

## Installation

1. Use a staging WordPress site with WooCommerce 8.2 or newer.
2. Copy this complete directory to
   `wp-content/plugins/tcg-store-platform`.
3. Activate **TCG Store Platform**.
4. Open **TCG Store > System Status**.
5. Confirm schema version `7 / 7`, WooCommerce, Action Scheduler, and the next
   daily UTC run.
6. Authenticate as a manager/admin and request
   `/wp-json/tcg-store/v1/health`.

## Data Safety

Deactivation retains all data. Uninstall also retains data unless an authorized
administrator deliberately enables **Permanently delete platform tables and
settings during uninstall**.

HPOS is declared unverified until WooCommerce lifecycle integration tests pass
in Phase 4. The plugin does not read or write WooCommerce order tables directly.
