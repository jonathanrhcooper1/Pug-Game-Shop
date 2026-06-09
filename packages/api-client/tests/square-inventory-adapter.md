# Square Inventory Adapter Tests

Executable package-level coverage now lives in
`packages/api-client/tests/square-inventory-adapter.mjs`.

Current coverage verifies:

- Serialized card inventory projections become sandbox-safe Square Catalog and
  Inventory request plans without treating Square as canonical.
- Idempotency keys and external IDs are preserved for duplicate-update guards.
- Production environments, credentials declared as production, and
  live-looking credentials are rejected without rejecting sandbox-declared
  token placeholders.
- Reconciliation-only Square POS events can map provider line items back to
  serialized inventory IDs for staff review.
- Unmapped provider lines create staff-review conflicts and keep inventory
  mutations deferred.
- WordPress inventory rows with barcodes/SKUs and stored Square variation IDs
  produce deferred Square inventory-count pull expectations using
  `/v2/inventory/counts/batch-retrieve`.
- Missing Square variation IDs, missing Square locations, and duplicate scan
  identities are surfaced as staff-review mapping conflicts before any network
  pull is attempted.
