# Square Inventory Adapter Tests

Planned package-level coverage for Square inventory projection/reconciliation.

- Project serialized card inventory from the WooCommerce/plugin source of truth
  into Square catalog/inventory payloads without treating Square as canonical.
- Confirm idempotency keys and external IDs prevent duplicate Square updates.
- Verify sandbox-only request fixtures and no production Square credentials.
- Verify reconciliation-only mode can read Square POS order/inventory events and
  map them back to serialized inventory IDs for staff review.
- Confirm adapter failures do not mutate plugin inventory state without an
  explicit, reviewed reconciliation action.
