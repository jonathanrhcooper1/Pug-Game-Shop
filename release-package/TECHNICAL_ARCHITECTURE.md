# Technical Architecture

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.2
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Architecture reference for the website, plugin, apps, sync engine, connectors, and data model.
Audience: Developer, support technician, administrator
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Full System Architecture

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

## Website And WooCommerce Architecture

The storefront theme renders the branded public pages and WooCommerce templates. WooCommerce handles product records, cart and checkout surface, order state, local pickup, customer accounts, and installed gateway plugins. The custom plugin projects serialized inventory groups into WooCommerce products and uses product/cart/order hooks so exact inventory items are reserved and sold safely.

## WordPress Plugin Architecture

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

The plugin is organized by domain folders: `Admin`, `Api/V1`, `Auth`, `Bootstrap`, `Buylist`, `Credit`, `Events`, `Inventory`, `Logging`, `Migrations`, `Offline`, `Payments`, `Pricing`, `PublicSite`, `Reports`, `Reservations`, `ScryDex`, `Settings`, `Sync`, and `WooCommerce`.

## Database Architecture

Custom tables are versioned through migration classes and tracked by `tcg_schema_migrations`. Business data is retained on deactivation. Destructive cleanup must be an explicit administrative operation with backup confirmation.

## ScryDex Sync Flow

~~~mermaid
sequenceDiagram
  participant Admin as Admin/cron
  participant WP as WordPress plugin
  participant API as ScryDex
  participant DB as Custom tables
  Admin->>WP: Start full pull or scheduled refresh
  WP->>DB: Read checkpoint
  WP->>API: Request game/set/page with server-side credentials
  API-->>WP: Cards, variants, prices, images
  WP->>DB: Normalize and persist rows
  WP->>DB: Advance checkpoint and log result
~~~

## Customer Purchase Flow

~~~mermaid
sequenceDiagram
  participant C as Customer
  participant Woo as WooCommerce
  participant R as Reservation engine
  participant Pay as Payment gateway
  participant Inv as Inventory tables
  C->>Woo: Add selected condition/card to cart
  Woo->>R: Reserve exact inventory item
  C->>Pay: Complete payment
  Pay-->>Woo: Payment success/failure
  Woo->>Inv: Mark exact item sold or release hold
~~~

## Staff Inventory Intake Flow

~~~mermaid
sequenceDiagram
  participant Staff as Employee app/Admin
  participant Ref as Reference search
  participant Inv as Inventory intake
  participant Woo as WooCommerce product sync
  Staff->>Ref: Search card by name/game/set
  Ref-->>Staff: Matching singles/graded results
  Staff->>Inv: Enter condition, location, minimum price, quantity
  Inv->>Inv: Create serialized item(s) and barcode/SKU
  Inv->>Woo: Project grouped product when publish is requested
~~~

## Offline Sync Flow

~~~mermaid
sequenceDiagram
  participant App as Employee/kiosk app
  participant LAN as LAN middleman
  participant WP as WordPress REST
  participant DB as Custom tables
  App->>LAN: Pull inventory/customers/events
  LAN->>WP: Authenticated pull
  WP->>DB: Read changes by cursor
  App->>LAN: Queue write while online/offline
  LAN->>WP: Push with idempotency
  WP-->>LAN: Success or conflict
  LAN-->>App: Update queue/conflict status
~~~

## Ledger, Buylist, Events, Override, And POS Flows

~~~mermaid
flowchart TD
  A[Trade-in quote] --> B{Customer decision}
  B -->|Accept credit| C[Customer credit ledger entry]
  B -->|Accept cash| D[Cash payout report entry]
  B -->|Decline/save| E[Profile history]
  C --> F[Accepted item conversion]
  F --> G[Serialized inventory]
  H[Below-minimum sale] --> I[Manager override]
  I --> J[Audit log]
  K[POS sale] --> L[Exact item sold]
  M[Event registration] --> N[Registration email and check-in queue]
~~~

## Security And Permission Architecture

Staff, manager, administrator, customer, kiosk, and system access are separated. Sensitive writes use server-side permission checks, nonces or authenticated REST requests, idempotency keys, and audit logs. Credentials remain server-side and are never returned to the browser, kiosk, or app.

## Deployment Architecture

GitHub is the source of truth for source code and release packages. Feature work happens on task branches, `develop` represents staging readiness, and `main` represents production readiness. Production deployment requires backup, package install, migration verification, active sync verification, and owner signoff.
