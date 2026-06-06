# Phase 0 Blueprint

This document is the acceptance index for the 21 required first-response
deliverables. Detailed contracts live in the linked documents.

## 1. Final Architecture Summary

Custom plugin tables own serialized inventory and operational ledgers.
WooCommerce owns online checkout and orders. A Tauri/React/SQLite app supplies
offline kiosk and staff modes. Provider adapters isolate ScryDex, TopDeck,
Square, payment gateways, search engines, printers, and future sports-card
sources. See [Architecture](ARCHITECTURE.md).

## 2. System Diagram

The component and data-flow diagram is in
[Architecture: System Diagram](ARCHITECTURE.md#system-diagram).

## 3. Database Schema

The schema uses custom indexed MySQL tables, UTC timestamps, decimal money,
immutable ledgers, idempotency keys, row versions, soft deletion where audit
history matters, and reversible migrations. See [Database](DATABASE.md).

## 4. Plugin Folder Structure

The plugin is module-oriented with WordPress/WooCommerce code at adapters and
testable policies in domain/application services. See
[Architecture: WordPress Plugin Structure](ARCHITECTURE.md#wordpress-plugin-structure).

## 5. Offline App Folder Structure

The desktop app separates React features from Rust/Tauri device, SQLite,
security, and sync services. See
[Architecture: Offline App Structure](ARCHITECTURE.md#offline-app-structure).

## 6. REST API Route Map

All routes are versioned under `/wp-json/tcg-store/v1/`, use explicit
permissions, return stable error codes, and accept idempotency keys for writes.
See [REST API](API.md).

## 7. WooCommerce Hook Map

Add-to-cart reserves the exact item, checkout revalidates it, order line items
capture immutable serialized metadata, payment converts the reservation to a
sale, and cancellation/failure releases it. Both classic checkout and Store API
blocks are covered. See [REST API: WooCommerce Hook Map](API.md#woocommerce-hook-map).

## 8. ScryDex Provider Strategy

ScryDex is a cached reference provider. Supported capabilities are discovered
per game and account. Unsupported features return `not_supported`; no coverage
is inferred. Sync is paged, checkpointed, credit-aware, webhook-assisted, and
resumable. See [ScryDex Integration](SCRYDEX_INTEGRATION.md).

## 9. TopDeck Provider Strategy

TopDeck tournament read, owned-event import, attendee access, and player
registration are capability checked. Tournament creation remains
`not_supported` because the public documentation reviewed on June 6, 2026 does
not document a create-event endpoint. See [TopDeck Integration](TOPDECK_INTEGRATION.md).

## 10. POS / Payment Adapter Strategy

Payment processing remains in WooCommerce gateway plugins online. POS adapters
reconcile external transactions to custom serialized inventory. Square supports
an optional catalog/order projection, but the default in-store safety path
requires scanning the store barcode in the staff app. See
[Payments and POS](PAYMENTS_POS.md).

## 11. Pricing Engine Logic

Suggested price is `market * 1.10`, with configured currency and rounding.
Minimum price is manually entered and required. Automated repricing respects
locks and floors, never touches sold records, and logs every decision. See
[Database: Pricing Invariants](DATABASE.md#pricing-invariants).

## 12. Reservation Engine Logic

Reservation is an atomic state transition on one exact inventory row. Active
reservation uniqueness is enforced in the database. Expiration, conversion,
release, and conflict transitions are idempotent and audited. See
[Database: Reservation Invariants](DATABASE.md#reservation-invariants).

## 13. Customer Credit Ledger Logic

Credit is an immutable double-entry-style customer subledger: each operation
adds a signed transaction and never edits a prior transaction. The cached
balance is only a projection. Voids and corrections are compensating entries.
Phone is required before issuance. See [Customer Credit](CUSTOMER_CREDIT.md).

## 14. Buylist Workflow

Customer submission, staff grading/authentication, offer calculation, approval,
acceptance, payout/credit, and inventory conversion are separate state
transitions. Accepted cards remain `pending_intake` until all inventory
requirements, including minimum price, are complete. See [Buylist](BUYLIST.md).

## 15. Kiosk UX Flow

Kiosk mode captures minimal customer identity, searches grouped versions, adds
exact items, submits a counter cart, displays QR/cart ID, and clears personal
data on timeout. It never accepts payment or exposes wp-admin. See
[UI Flows](UI_FLOWS.md).

## 16. Staff UX Flow

Staff modes cover intake, label printing, inventory movement, picking, customer
lookup, credit, buylist review, event check-in, sync monitoring, and escalation.
Manager-only actions are isolated and reauthenticated. See [UI Flows](UI_FLOWS.md).

## 17. Events UX Flow

Events support TopDeck-hosted, local-reserve-and-push, and local-only modes.
Payment, registration, capacity, waitlist, and check-in have independent states
so external failures are visible rather than silently rolled back. See
[Events](EVENTS.md).

## 18. Offline Sync / Conflict Logic

The app uses a local read model, append-only operation queue, UUID idempotency
keys, entity versions, and server cursors. Server acceptance is authoritative.
Conflicting inventory, credit, event, price, and customer operations enter a
manager queue without silent overwrite. See [Offline Sync](OFFLINE_SYNC.md).

## 19. Security Model

Capabilities gate every endpoint and screen. Device tokens are scoped,
hashed, revocable, and rotated. Provider secrets use configuration outside the
database when possible, with encrypted storage as a controlled fallback.
Sensitive actions are appended to audit logs. See [Security](SECURITY.md).

## 20. Testing Plan

Pure policies receive unit tests; repositories and REST routes receive
integration tests; WooCommerce and offline workflows receive end-to-end tests;
race, replay, load, migration, and recovery tests cover the high-risk paths. See
[Testing](TESTING.md).

## 21. Phase-By-Phase Implementation Plan

Phases 1 through 10 have entry gates, deliverables, tests, and exit criteria.
No external capability moves from `not_supported` to supported without contract
fixtures and a verified account test. See [Roadmap](ROADMAP.md).

## Architecture Acceptance Gate

Phase 1 may begin when:

- Source-of-truth boundaries are accepted.
- The shell-product/exact-inventory WooCommerce strategy is accepted.
- Offline inventory and credit conflict policies are accepted.
- ScryDex and TopDeck account credentials/plans are available for sandbox or
  verified test calls.
- GoDaddy hosting supports required PHP/MySQL versions, HTTPS, cron invocation,
  database backups, and sufficient disk space for image caching.
- Initial barcode scanner and label-printer models are identified for hardware
  proof-of-concept testing.
