# Reservation And Double-Sell Prevention Tests

Required coverage:

- Two parallel carts attempting to reserve one inventory item.
- Website checkout versus POS sale for the same item.
- Reservation expiry releases only eligible reservations.
- Payment completion conversion is idempotent.
- Offline conflict never overwrites `sold`; it creates a conflict record.

These tests require true parallel database processes against a target-like
database.
