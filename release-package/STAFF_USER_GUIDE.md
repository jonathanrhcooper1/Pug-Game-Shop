# Staff User Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.2
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Plain-language staff workflow guide for daily counter, inventory, trade-in, fulfillment, and event tasks.
Audience: Store staff and managers
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Staff Login And Access

Staff should use assigned accounts or approved device login codes. Do not share manager codes. If a station is left unattended, lock the app or sign out according to store policy.

## Inventory Intake

1. Open Inventory.
2. Search for the card by name. Use game and set filters when results are long.
3. Select the exact card, version, finish, condition, or graded option.
4. Enter location, quantity, cost if known, minimum sale price, and sale price.
5. Print or attach barcode labels if required.
6. Confirm whether the item should publish to the website and kiosk.
7. Save. The system creates serialized inventory rows and syncs product data when enabled.

## Trade-In Counter Flow

1. Open Trade-Ins and search/select the customer by name, phone, email, or customer ID.
2. If the customer is missing, create the customer with required contact information.
3. Search each card and add it to the offer cart.
4. Set condition or grade, grading company, market value, trade percentage, payout type, and manual offer if needed.
5. Review cash total, store-credit total, and combined total with the customer.
6. Use Save Quote if the customer wants to return later.
7. Use Customer Declines to keep a rejected record on the profile.
8. Use Customer Accepts to post credit/cash entries and convert accepted items into inventory.

## Order Fulfillment

1. Open Fulfillment.
2. Select a paid website pickup order or kiosk order.
3. Pick each exact card and check it off.
4. If an item is missing, stop and notify a manager before substituting.
5. Mark ready for pickup when all required items are picked.
6. Confirm the customer receives pickup instructions or staff contact as configured.

## Customer Credit

Customer credit is local-store credit only. Look up the customer, verify identity by store policy, enter the amount used, and record the Square/POS receipt or order reference. Credit changes are logged with staff identity and timestamp.

## Events

Staff can register/check in players from event screens when permitted. Event registration requires first name, last name, and email. Paid events may be pay-at-store or paid through WooCommerce depending on configuration.
