# WooCommerce Product Adapter Tests

Executable package-level coverage now lives in
`packages/api-client/tests/woocommerce-product-adapter.mjs`.

Current coverage verifies:

- WordPress-emitted WooCommerce product write request plans become
  non-production create, update, and stockout request envelopes without
  network execution.
- Product write, WordPress CRUD, payment capture, Square inventory writes, and
  production WooCommerce writes remain deferred.
- Production environments, credentials declared as production, and
  live-looking credentials are rejected.
- Malformed WooCommerce request envelopes are rejected before any client or
  staging adapter could execute them.
- Hidden unmapped product projections stay skipped without emitting product
  write requests.
