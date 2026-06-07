# Customer Credit Ledger Tests

Required coverage:

- Ledger sum equals cached balance.
- Duplicate idempotency key posts once.
- Concurrent redemption cannot overspend.
- Manager approval is required for adjustment, void, and merge.
- Offline conflict cannot create a silent negative balance.
- Store credit redemption can be disabled per event or checkout context.
