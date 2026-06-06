# Customer Credit

## Rules

- Credit is a customer liability ledger, not a gift card.
- Phone number is required before issuance.
- Ledger entries are immutable.
- Balance is the sum of posted signed entries.
- Cached balance is rebuildable and never the sole record.
- No expiration or dormancy fee by default.
- Manual adjustments, voids, and credit-bearing merges require manager approval.

## Transaction Signs

| Type | Typical sign |
| --- | --- |
| `buylist_credit` | positive |
| `purchase_redemption` | negative |
| `refund_credit` | positive |
| `manual_add` | positive |
| `manual_subtract` | negative |
| `correction` | either |
| `void` | opposite of linked transaction |
| `transfer_in` | positive |
| `transfer_out` | negative |

## Posting Algorithm

1. Validate customer has a normalized phone.
2. Validate actor capability and manager approval when required.
3. Lock customer credit projection row.
4. Deduplicate idempotency key.
5. Recompute/verify current balance from projection version.
6. Reject redemption that exceeds available balance.
7. Insert immutable ledger entry with before/after values.
8. Update cached balance and version in the same transaction.
9. Append audit event.

Nightly and on-demand reconciliation recalculates balances from the ledger and
flags any projection mismatch.

## Online Redemption

Customer identity must be verified through login and/or configured phone/email
verification. Credit is authorized against the cart, then posted only after the
Woo payment/order transition succeeds. Failed checkout releases authorization.

## In-Store And Offline

Staff performs customer lookup; kiosk may display balance but cannot redeem it.
Offline redemption follows the risk and conflict rules in
[Offline Sync](OFFLINE_SYNC.md).

## Refunds

Refund destination is explicit:

- Original external payment method where supported.
- Store credit, if policy and customer consent permit.
- Split according to original tender.

Credit refunds create new ledger entries and never mutate the original
redemption.

## Customer Merge

Manager selects the target customer. Source credit is transferred with paired
`transfer_out` and `transfer_in` entries linked by one merge operation. Source
records remain auditable and become merged/inactive.

## Reports

- Total outstanding liability.
- Issued and redeemed by period/location/type.
- Manual adjustments and voids.
- Buylist credit.
- Dormant balances for reporting only.
- Projection/ledger reconciliation exceptions.
