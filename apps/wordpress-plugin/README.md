# TCG Store Platform WordPress Plugin

Version: `0.44.0`

## Implemented Features

- Multisite-aware activation and uninstall.
- Versioned, reversible foundation migration.
- Inventory and pricing schema migration.
- Foundation settings, role-permission, audit, and migration tables.
- White-label company branding settings for company identity, support/logo
  URLs, receipt copy, theme colors, staging banner color, and CSS variable
  export.
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
- Customer credit planned REST route contracts and posting payload validation
  for idempotent ledger writes, manager approvals, and route-customer matching.
- Customer credit REST response presenter for safe balance, ledger, posting,
  and validation-error payloads with redacted ledger metadata.
- Buylist submission, item, offer, approval, and conversion schema migration.
- Buylist submission status transition helper.
- Buylist planned REST route contracts and submission intake payload validation
  for customer identity, idempotency, source, owner token, and item rows.
- Buylist offer planner for reviewed item offers, totals, manager approval
  thresholds, target submission statuses, and deterministic offer fingerprints.
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
- Reservation expiry cleanup planner and explicit expired-hold transition back
  to available inventory.
- Manager override policy helpers for below-minimum sale authorization.
- Manager override persistence/audit payload planning for future stored
  below-minimum approvals.
- WooCommerce serialized cart item metadata validator for exact inventory
  checkout lines.
- WooCommerce order-line metadata planner for exact inventory, reservation,
  owner-token, price snapshot, expiry, optional card descriptor, and snapshot
  hash persistence.
- WooCommerce order lifecycle planner for checkout linkage, payment-complete
  conversion, failed/cancelled release, refund review, duplicate line guards,
  and non-serialized line skipping.
- WooCommerce serialized inventory hook contracts for cart, checkout, payment,
  refund, cart removal, and Store API validation lifecycle coverage.
- Offline device pairing, push, pull, conflict list, and conflict resolution
  planned REST route contracts with live registration disabled.
- Offline push payload validation for batch IDs, device matching, operation
  envelopes, supported operation/entity pairs, timestamps, row versions,
  payload objects, authorization context, duplicates, and schema version.
- Offline pull request validation for device IDs, cached domains, cursors,
  page-size bounds, tombstone inclusion, and schema version.
- Offline pull response presentation for per-domain cursors, change rows,
  tombstones, server timestamps, and `has_more` pagination flags.
- Offline device pairing request validation for pairing codes, installation
  IDs, device modes, manager/location IDs, app versions, hardware
  capabilities, requested scopes, and schema version.
- Offline device registration planning for future device rows, one-time
  response payloads, token hashes, sync routes, first-sync flags, and audit
  payloads without live writes.
- Offline device access policy checks for future registered-device permission
  callbacks, including active/revoked/expired state, required scopes, supported
  modes/scopes, location IDs, and UTC timestamp validation.
- Offline conflict list and resolution request validation for future
  conflict-center filters, idempotent manager resolution actions, expected row
  versions, UTC resolution timestamps, notes, and adjustment payloads.
- Offline conflict list response presentation for future conflict-center rows,
  filters, cursors, severity, row versions, payload objects, and available
  manager resolution options.
- Dependency-free REST route contract tests for health and public Events
  endpoints.
- Migration runner planning coverage for clean install, upgrade, idempotent
  current-schema rerun, and rollback order.
- TopDeck registration push adapter and result mapping for later queue workers.
- ScryDex sync page processor for normalized card/price upsert planning and
  checkpoint advancement.
- ScryDex persistence planner for deterministic reference-card inserts,
  changed-row updates, unchanged-row detection, and current price observations.
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
