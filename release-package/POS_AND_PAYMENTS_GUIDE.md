# POS And Payments Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.2
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Payment, POS, WooCommerce gateway, Square, GoDaddy Payments, store credit, and reconciliation guide.
Audience: Owner, administrator, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Payment Separation

WooCommerce payment gateways handle online payment authorization and capture. The custom platform handles serialized inventory, reservations, store credit, buylist, and reconciliation. Store credit is not implemented as a public gift card or normal coupon in the default policy.

## Provider Roles

| Provider | Role | Credential location |
| --- | --- | --- |
| WooCommerce checkout | Online cart, order, payment state, local pickup. | WooCommerce settings. |
| Square POS/Terminal | In-store card reader/POS reference and sale reconciliation where configured. | Local server env/password manager; WooCommerce Square plugin for online if used. |
| GoDaddy Payments | WooCommerce gateway where configured. | WooCommerce/GoDaddy settings. |
| Store credit | Local profile ledger redemption. | Plugin/customer ledger tables; no payment secret. |

## Exact Serialized Item Sold Behavior

1. Cart/order reserves an exact inventory item.
2. Payment or POS receipt confirms sale.
3. Inventory item moves to sold with timestamp and reference.
4. WooCommerce product group is refreshed so condition availability changes.
5. POS/payment log records reconciliation details without storing full payment data.

## Testing Safely

- Use sandbox/test mode only for payment validation outside production.
- Never paste live payment keys into documentation, GitHub, screenshots, or logs.
- Use low-value or fake inventory for end-to-end payment tests.
- Confirm refunds/cancellations release or review inventory according to policy.
