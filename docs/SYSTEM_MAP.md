# System Map

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.14
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Concise system map for the production platform.
Audience: Owner, administrator, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## System Diagram

~~~mermaid
flowchart LR
  Customer[Customer Browser] --> Woo[WooCommerce Storefront]
  Kiosk[Customer Kiosk] --> LAN[LAN Middleman Server]
  Staff[Employee App] --> LAN
  LAN <--> WP[WordPress Plugin REST API]
  Woo <--> WP
  WP --> DB[(WordPress + Custom TCG Tables)]
  WP <--> Scry[ScryDex API]
  WP <--> Email[SMTP / WordPress Mail]
  WP <--> Pay[WooCommerce Payment Gateways]
  LAN <--> Square[Square Terminal / POS Adapter]
  Events[Events Pages] --> WP
  Reports[Manager Reports] --> WP
~~~

## Modules

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
