# API Client

Typed client and provider-adapter contracts for `/wp-json/tcg-store/v1`.

## WooCommerce Product Adapter

`src/woocommerceProductAdapter.mjs` validates the plugin's WooCommerce product
write request plan envelopes for create, update, and stockout operations. It
does not perform network calls, store WooCommerce REST credentials, or enable
WordPress CRUD writes. The adapter rejects production environments,
credentials explicitly declared as production, and live-looking credential
markers while preserving idempotency keys, product IDs, SKUs, and request
paths for staging review.

Square catalog/inventory handoff remains delegated to the official WooCommerce
Square extension, and payment capture remains delegated to WooCommerce payment
gateway plugins.

## Square Inventory Adapter

`src/squareInventoryAdapter.mjs` converts the plugin's Square inventory
projection contract into sandbox-safe Square Catalog and Inventory request
plans. It does not perform network calls, store provider credentials, or treat
Square as the inventory source of truth. The planner rejects production
environments, credentials explicitly declared as production, and live-looking
credential markers while allowing sandbox-declared credentials to be planned
without network execution.

The adapter also includes reconciliation-only mapping for Square POS lines back
to serialized inventory IDs. Unmapped provider lines become staff-review
conflicts, and inventory mutations remain deferred until an explicit
WordPress-side reconciliation action is approved.
