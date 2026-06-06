# Validation

Shared API, POS/payment, and offline validation contracts.

Implemented:

- POS/payment reconciliation policy for sanitized sandbox provider responses.
- Tests for approved payments, scan-gated exact item sale transitions, declined
  payments, unmapped line conflicts, and refunds to pending review.

Pending:

- Live gateway/provider contract tests.
- WooCommerce payment lifecycle integration.
- Provider webhook reconciliation.
