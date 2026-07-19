# Release Notes

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.2
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Client-facing release notes for version handoff.
Audience: Owner, manager, administrator, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Release 0.203.2

This release packages the production WordPress/WooCommerce trading-card store platform into four deliverables: Pug Store App, LAN Server + Pug Store App, Kiosk Page, and Pug Checkout App, with handover documentation prepared by JC Electronics.

## Major Features

| Module | Purpose | Primary location |
| --- | --- | --- |
| WordPress website | Public website, content pages, customer account links, and event pages. | WordPress admin and active theme |
| WooCommerce storefront | Online catalog, cart, checkout, local pickup, product/order records, and payment gateway handoff. | WooCommerce admin |
| Trading-card inventory plugin | Custom plugin for serialized inventory, ScryDex, customer credit, buylist, reports, REST APIs, and migrations. | WordPress admin > TCG Store |
| Serialized inventory | One physical card equals one inventory row with its own SKU/barcode, status, location, and price floor. | Inventory screens and REST API |
| ScryDex integration | Reference card/set/variant/price/image import, search, checkpointing, and graded-price enrichment. | TCG Store > ScryDex Catalog |
| Pricing engine | Market price, suggested sale price, minimum sale price, daily repricing, and manager override tracking. | Plugin pricing classes and inventory intake |
| Customer credit | Profile-bound local store credit ledger with immutable balance movements and audit history. | Customers and reports |
| Buylist/trade-in intake | Customer sell-to-store offers, cash/credit payout lines, approval/decline/save workflows, and conversion to inventory. | Local app trade-in screen and buylist tables |
| Kiosk cart flow | Customer-facing inventory lookup, cart hold, order submission, and staff fulfillment queue. | Kiosk app and fulfillment APIs |
| Offline/local app | Employee app, kiosk mode, local queue, SQLite cache, LAN middleman, barcode scanning, and sync status. | Apps and local sync server |
| POS/payment connector | Square Terminal scaffold, WooCommerce Square/GoDaddy Payments separation, and POS sale reconciliation. | Local sync server and WooCommerce |
| Events | Local events, registration, waitlist, check-in, payment status, registration email, and optional external event linking. | Events admin, shortcodes, REST API |
| Reports/audit | Manager reports, CSV exports, sync history, ledger, inventory, sales, fulfillment, and staff activity. | Reports screens and REST API |
| Deployment | GitHub branch workflow, WordPress ZIP packages, local app installers, backups, and rollback notes. | GitHub and hosting |

## Installation Notes

- Use `dist/the-pug-store-deliverables-0.203.2.zip` as the complete installable handoff.
- Verify checksum before installation.
- Start with LAN Server + Pug Store App, then install Pug Store App on staff stations, Kiosk Page on customer stations, and Pug Checkout App on the counter workstation.
- Configure credentials through secure channels only.
- Run production active sync verification before owner signoff.

## Known Limitations

| Item | Status | Notes |
| --- | --- | --- |
| TopDeck event creation | Future enhancement | The documentation treats create-event support as future unless the provider endpoint and credentials are confirmed. |
| Square reader live capture | Requires hardware/account validation | The local connector supports Terminal scaffolding; production capture must be validated with the store reader and Square account. |
| Dymo label printing | Requires hardware validation | Barcode/label data is prepared; final print workflow must be verified on the in-store printer driver. |
| SMTP delivery | Requires mail provider validation | Event registration email is implemented through WordPress mail; live delivery depends on configured SMTP/mail transport. |
| Full production data import volume | Operational task | Large ScryDex pulls should be monitored through checkpoints, logs, and provider limits. |

## Support Contact

Support and maintenance are provided by JC Electronics according to the active service agreement.
