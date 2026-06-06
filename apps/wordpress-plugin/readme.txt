=== TCG Store Platform ===
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 0.15.0
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
Phase 3 ScryDex sync foundations add sync tables, checkpoint/resume helpers, a
mock-backed provider adapter, and card/price normalization.
Phase 3.1 adds read-only public event REST endpoints and shortcodes.
Phase 3.2 adds local free/pay-at-store event registration writes.
Phase 6.1 adds customer credit schema, ledger policy helpers, and idempotent
posting internals.
Phase 6.2 adds buylist schema and submission status helpers.
Phase 4 foundations add exact inventory reservation schema plus active-claim,
release, and conversion service checks.
Phase 2.2 adds manager override policy helpers for below-minimum sale approval.

Inventory and commerce modules remain disabled until their implementation phases.

== Installation ==

1. Install and activate WooCommerce 8.2 or newer.
2. Upload the complete `wordpress-plugin` directory.
3. Activate TCG Store Platform.
4. Open TCG Store > System Status and resolve any dependency warnings.

== Changelog ==

= 0.15.0 =

* Added manager override policy helpers for below-minimum sale authorization.
* Added checks for distinct manager approval, required reason, invalid amounts, and override-row persistence requirement.
* Added manager override policy unit tests while persistence remains staging-gated.

= 0.14.0 =

* Added reservation lifecycle service helpers for conversion to sold and release back to available.
* Added idempotent transition handling and inventory-state mismatch protection.
* Added lifecycle tests for reservation conversion, release, idempotent replay, and mismatch rejection.

= 0.13.0 =

* Added exact inventory reservation schema migration.
* Added reservation request/result/storage/service foundation for active claim enforcement.
* Added tests for reservation schema, idempotency replay, unavailable inventory rejection, and active-reservation collision prevention.

= 0.12.0 =

* Added ScryDex card and market price normalization helpers.
* Added fixture-backed tests for reference-card rows, price rows, required-field errors, and nullable optional fields.
* Kept ScryDex database upserts and scheduled workers disabled for later staging-gated phases.

= 0.11.0 =

* Added ScryDex provider result, contract, and HTTP provider adapter.
* Added fixture-backed tests for card search, credential headers, rate-limit mapping, and auth-context redaction.
* Added team ID redaction for provider auth context.

= 0.10.0 =

* Added sync job, log, checkpoint, error, and webhook schema migration.
* Added ScryDex checkpoint/resume value and request planning helpers.
* Added tests for sync schema contracts and checkpoint resume behavior.

= 0.9.0 =

* Added customer credit ledger posting service, storage contract, and wpdb repository.
* Added idempotency replay handling and cached balance update tests.
* Kept public credit APIs and WooCommerce redemption hooks disabled.

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
