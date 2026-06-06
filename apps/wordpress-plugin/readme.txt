=== TCG Store Platform ===
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 0.4.0
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

Inventory and commerce modules remain disabled until their implementation phases.

== Installation ==

1. Install and activate WooCommerce 8.2 or newer.
2. Upload the complete `wordpress-plugin` directory.
3. Activate TCG Store Platform.
4. Open TCG Store > System Status and resolve any dependency warnings.

== Changelog ==

= 0.4.0 =

* Added the Phase 3 Events and TopDeck foundation.

= 0.3.0 =

* Added the Phase 2 inventory and pricing foundation.

= 0.2.0 =

* Added the Phase 1 plugin foundation.
