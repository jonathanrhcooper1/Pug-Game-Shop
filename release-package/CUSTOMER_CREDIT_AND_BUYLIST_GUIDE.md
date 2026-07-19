# Customer Credit And Buylist Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.2
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Customer profile, local store credit, ledger, trade-in, and buylist operating guide.
Audience: Owner, manager, staff, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Customer Credit Principles

- Credit is profile-based local store credit, not a public gift card.
- Phone number is required or strongly recommended for reliable lookup.
- Lookups can use name, phone, email, or customer ID.
- Ledger entries are immutable; corrections are new manager-level entries.
- Online customers may view credit only where safely enabled; redemption stays local unless owner explicitly enables otherwise.

## Ledger Entry Types

| Entry | Effect | Example source |
| --- | --- | --- |
| Credit issued | Increases balance. | Accepted trade-in credit payout. |
| Credit used | Decreases balance. | Local checkout redemption with POS receipt. |
| Cash paid | No credit balance change but reportable payout. | Cash trade-in item. |
| Adjustment/correction | Signed manager correction. | Dispute resolution. |
| Refund to credit | Increases balance when policy allows. | Return/refund workflow. |

## Buylist Flow

~~~mermaid
flowchart TD
  A[Search or create customer] --> B[Add cards to offer cart]
  B --> C[Set condition or grade]
  C --> D[Market value and per-card percentage]
  D --> E[Choose cash or store credit per item]
  E --> F{Customer decision}
  F -->|Save later| G[Saved quote on profile]
  F -->|Decline| H[Rejected quote on profile]
  F -->|Accept| I[Ledger or cash payout record]
  I --> J[Convert accepted items to inventory]
~~~

## Dispute Handling

1. Search customer by phone/name/email/customer ID.
2. Open ledger history and filter by date/order/buylist reference.
3. Compare receipt/order/buylist line items against ledger entries.
4. If correction is required, post a manager correction with reason and reference.
5. Do not edit old ledger rows silently.
