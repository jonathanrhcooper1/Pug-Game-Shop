# REST API Tests

Required coverage:

- Missing or incorrect capability rejection on every route.
- Authenticated health endpoint.
- Inventory create/update/search/reserve/release permissions.
- Pricing recalculation and override permissions.
- Customer credit ledger read/write permissions.
- Buylist submission, review, offer, and conversion flows.
- Event registration, check-in, attendee export, and TopDeck sync routes.
- Offline device pull/push/conflict routes.

Use WordPress integration tests through `wp-env` and never use production API
keys or production customer data.
