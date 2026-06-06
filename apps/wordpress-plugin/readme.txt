=== TCG Store Platform ===
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 0.8.0
License: Proprietary

Serialized trading-card inventory and store operations for WooCommerce.

== Description ==

Phase 1 provides the platform foundation: migrations, roles and capabilities,
settings, structured logging, audit logging, REST health checks, feature flags,
Action Scheduler integration, and WooCommerce HPOS compatibility reporting.
Phase 2 foundations add inventory/pricing schema contracts and local business
rule helpers.
Phase 3 foundations add Events and TopDeck schema contracts, event status
helpers, and a TopDeck adapter with default-disabled event creation.
Phase 3.1 adds read-only public event REST endpoints and shortcodes.
Phase 3.2 adds local free/pay-at-store event registration writes.
Phase 6.1 adds customer credit schema and ledger policy helpers.
Phase 6.2 adds buylist schema and submission status helpers.

Inventory and commerce modules remain disabled until their implementation phases.

== Installation ==

1. Install and activate WooCommerce 8.2 or newer.
2. Upload the complete `wordpress-plugin` directory.
3. Activate TCG Store Platform.
4. Open TCG Store > System Status and resolve any dependency warnings.

== Changelog ==

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
