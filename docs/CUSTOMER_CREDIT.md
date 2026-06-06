# Customer Credit

## Implementation Status

Schema migration `0004` creates customer, contact, credit ledger, merge log, and
customer note tables. Local policy helpers define entry types, typical signs,
manager-approval requirements, signed ledger previews, and negative-balance
rejection. A transaction-backed posting service and `wpdb` repository now
support idempotency-key replay, customer row locking, immutable ledger inserts,
and cached balance/version updates. Planned REST route contracts and posting
payload validation now cover balance, ledger, adjustment, and redemption
surfaces before live route registration. REST endpoints, WooCommerce redemption
hooks, offline credit conflict processing, and staff UI remain disabled until
staging acceptance.

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
6. Preview signed amount and before/after balances with fixed four-decimal
   arithmetic.
7. Reject redemption or adjustment that would make balance negative.
8. Insert immutable ledger entry with before/after values.
9. Update cached balance and version in the same transaction.
10. Append audit event.

Nightly and on-demand reconciliation recalculates balances from the ledger and
flags any projection mismatch.

Current implementation covers steps 3 through 9 for server-side internals.
Payload validation now covers route/customer matching, idempotency keys,
currency, optional linked IDs, metadata shape, and manager approval inputs.
Capability checks, normalized-phone enforcement, route permissions, and audit
events are added when staff and WooCommerce write surfaces are enabled.

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
