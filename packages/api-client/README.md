# API Client

Typed client and provider-adapter contracts for `/wp-json/tcg-store/v1`.

## Square Inventory Adapter

`src/squareInventoryAdapter.mjs` converts the plugin's Square inventory
projection contract into sandbox-safe Square Catalog and Inventory request
plans. It does not perform network calls, store provider credentials, or treat
Square as the inventory source of truth.

The adapter also includes reconciliation-only mapping for Square POS lines back
to serialized inventory IDs. Unmapped provider lines become staff-review
conflicts, and inventory mutations remain deferred until an explicit
WordPress-side reconciliation action is approved.
