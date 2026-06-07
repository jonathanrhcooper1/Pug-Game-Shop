# WooCommerce Checkout Hook Tests

Required coverage:

- Exact inventory item metadata is required before add-to-cart.
- Add-to-cart creates one active reservation.
- Parallel carts cannot reserve the same inventory item.
- Cart/session restoration validates reservation ownership and expiry.
- Checkout creates immutable line item snapshots.
- Payment completion converts reservation to sold exactly once.
- Failed or cancelled orders release reservations according to policy.
- Refund moves item to review/return state.
- Checkout Blocks and classic checkout remain consistent.
