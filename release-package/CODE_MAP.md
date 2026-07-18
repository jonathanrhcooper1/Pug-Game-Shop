# Code Map

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Source package map by folder, purpose, dependencies, tables, routes, and tests.
Audience: Developer and support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Major Folder Map

| Path | Purpose | Dependencies / related systems | Tables / routes / tests |
| --- | --- | --- | --- |
| apps/wordpress-plugin/src/Admin | WordPress admin screens and workspace presenters. | WordPress admin, settings, REST nonces. | Inventory, ScryDex, reports admin tests. |
| apps/wordpress-plugin/src/Api/V1 | REST controllers, route contracts, permissions, route handlers. | WordPress REST API, capability registry. | Routes documented in API_ROUTES.md. |
| apps/wordpress-plugin/src/Auth | Roles and capabilities. | WordPress users/roles. | tcg_role_permissions; capability tests. |
| apps/wordpress-plugin/src/Bootstrap | Plugin startup, dependencies, scheduler. | WordPress hooks, WooCommerce, Action Scheduler. | Bootstrap smoke tests. |
| apps/wordpress-plugin/src/Buylist | Trade-in/buylist parsing, offer planning, receipt presentation. | Customer, pricing, inventory. | tcg_buylist_*; buylist unit tests. |
| apps/wordpress-plugin/src/Credit | Customer credit posting, ledger repository, REST presenters. | Customer profiles, audit logging. | tcg_customer_credit_ledger; credit unit tests. |
| apps/wordpress-plugin/src/Events | Event models, registration policy/service, email notification, shortcodes. | REST, mail, WooCommerce event products where configured. | tcg_events*, event tests. |
| apps/wordpress-plugin/src/Inventory | Serialized inventory intake/search/persistence/external mappings. | Pricing, WooCommerce, Square mapping. | tcg_inventory_items; inventory tests. |
| apps/wordpress-plugin/src/Migrations | Versioned database schemas. | wpdb/dbDelta. | All custom tables; schema tests. |
| apps/wordpress-plugin/src/Offline | Offline pull/push, devices, cursors, conflicts. | REST, local app, sync queue. | tcg_offline_* and tcg_sync_conflicts. |
| apps/wordpress-plugin/src/Payments | Payment/POS fee and provider logs. | WooCommerce/Square/POS. | tcg_payment_* and tcg_pos_sync_log. |
| apps/wordpress-plugin/src/Pricing | Shared pricing rules and calculators. | ScryDex prices, inventory intake. | Pricing tests. |
| apps/wordpress-plugin/src/PublicSite | Public inventory/search/product shelf shortcodes. | WordPress shortcodes, WooCommerce. | Public shortcode tests. |
| apps/wordpress-plugin/src/Reports | Manager report planner and dashboard data. | Inventory, sales, credit, buylist, sync logs. | Reports tests. |
| apps/wordpress-plugin/src/ScryDex | Provider settings, HTTP provider, normalizer, sync workers. | ScryDex API. | Catalog and sync tests. |
| apps/wordpress-plugin/src/WooCommerce | Product writer, grouped inventory hooks, customer portal. | WooCommerce CRUD/hooks. | WooCommerce tests. |
| apps/local-sync-server/src | LAN server, WordPress bridge, queue, Square Terminal scaffold. | Node, SQLite/local store, WordPress REST. | Local sync server tests. |
| apps/offline-app/src | Employee/kiosk React UI and app data adapters. | Vite, Tauri commands, LAN server. | Offline app contract tests. |
| apps/offline-app/src-tauri | Windows shell, SQLite, secure store, local commands. | Rust/Tauri. | Rust and command contract tests. |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2 | Branded WordPress/WooCommerce theme. | WordPress theme APIs, WooCommerce templates. | Theme packaging and public smoke tests. |
| scripts | Build, test, deployment, packaging, production verification. | Node, npm, SSH, WP-CLI. | Script contract tests. |

## Source Code Index

See `SOURCE_CODE_INDEX.md` for a generated file-level source index. The repository itself is the source-code package; the handover documents map the code rather than duplicating every source file.
