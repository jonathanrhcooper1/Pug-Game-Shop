# Client Handover Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Primary client-facing handover guide for the complete trading-card store platform.
Audience: Owner, manager, administrator, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Cover

Created by JC Electronics

Prepared for: The Pug
Prepared by: JC Electronics
Release version: 0.202.0
Release date: 2026-06-17

This guide summarizes the production system, owner responsibilities, support responsibilities, launch checks, and secure handoff process.

## Executive Summary

The platform connects the public WordPress/WooCommerce website, custom trading-card inventory plugin, in-store employee app, customer kiosk, LAN middleman server, serialized inventory model, ScryDex reference data, customer credit ledger, buylist/trade-in intake, event registration, and reporting. WordPress remains the source of truth for website inventory, online orders, customer-facing pages, and custom business tables. The local app and kiosk are designed to keep the store operating during network interruptions by caching data locally and replaying queued actions when connectivity returns.

## Major Capabilities

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

## Environments

| Environment | Purpose | Allowed data | Never share |
| --- | --- | --- | --- |
| Local development | Developer validation, wp-env, app builds, contract tests. | Fake/sample data and sandbox credentials. | Production customer credit, live payment secrets, production database dumps without approval. |
| Staging | Safe pre-production verification and owner review. | Sanitized or copied data approved for testing. | Live payment capture, public indexing, production-only customer actions. |
| Production | Live customer website, store operation, in-store app sync, payment/order records. | Live store data and production credentials stored only in approved secure locations. | Debug data, fake customer orders, public test banners, secrets in files. |

## User Roles

| Role | Purpose | Typical permissions |
| --- | --- | --- |
| Customer | Shop online, view account, register for events. | Public storefront and customer account pages. |
| Kiosk user | Browse in-stock inventory and place pickup request. | Kiosk-only order flow; no staff data or credit management. |
| Staff | Inventory intake, customer lookup, checkout support, order fulfillment. | Staff screens, barcode lookup, trade-in staging as configured. |
| Manager | Reports, overrides, credit corrections, settings, conflict resolution. | Manager-only actions and audit views. |
| Administrator | WordPress, WooCommerce, plugin setup, user roles, deployments. | Full site administration. |
| Developer/support | Maintain source, releases, migrations, integrations, backups. | Repository, hosting deployment, support logs with least privilege. |

## Daily Business Flow

1. Customer searches inventory online or on the kiosk.
2. System shows in-stock serialized inventory and holds selected cards during cart/order flow.
3. Staff picks cards from the fulfillment queue and confirms exact items.
4. Customer pays online or at the store through the configured payment/POS flow.
5. Exact inventory items move from available/held to sold, and WooCommerce or POS records are reconciled.
6. Customer credit can be redeemed locally through the staff checkout flow with an audit entry.
7. Trade-in/buylist items are quoted per card, accepted/declined/saved, then accepted cards convert to inventory.
8. Event registrations are stored locally, emails are sent through WordPress mail, and check-in is handled by staff.

## Owner Responsibilities

- Review ScryDex sync results and failed pages.
- Review price changes, price floor hits, and manager overrides.
- Review inventory value, aging, location accuracy, and serialized item counts.
- Review customer store-credit liability and disputed balances.
- Review buylist/trade-in cash and credit totals.
- Review events, capacity, registrations, and optional external event sync status.
- Reconcile WooCommerce, Square/POS, and payment provider reports.
- Confirm backups and pre-deployment rollback points.

## Support Responsibilities

| Area | Owner responsibility | Support responsibility |
| --- | --- | --- |
| Inventory | Review intake, locations, price floors, and aging. | Maintain plugin routes, migrations, search, and WooCommerce product sync. |
| ScryDex | Confirm sync success and investigate failed pages. | Rotate keys, diagnose provider errors, review checkpoints. |
| Customer credit | Review liability and resolve disputes. | Maintain immutable ledger, reports, and correction procedures. |
| Buylist | Review totals, cash/credit payout, and accepted items. | Maintain intake conversion and audit records. |
| Events | Monitor registrations, check-ins, capacity, and email delivery. | Maintain event REST routes, shortcodes, and optional provider adapters. |
| Payments/POS | Reconcile WooCommerce, Square/POS, and store credit. | Maintain connector settings and logs without storing payment secrets. |
| Offline app | Watch queue and conflict screens during network issues. | Maintain app build, local server, and sync queue handling. |
| Backups | Confirm scheduled backups and pre-release backups. | Run restore drills and document rollback points. |

## Launch Checklist

- [ ] Production credentials configured only in approved secure storage.
- [ ] Payment gateway tested in the correct mode.
- [ ] ScryDex search, full pull/resume, and price refresh verified.
- [ ] Square/POS connector status verified where configured.
- [ ] Event registration email sent and received.
- [ ] Kiosk order and 30-minute hold behavior verified.
- [ ] Employee app inventory intake and website sync verified.
- [ ] Store credit issue/redeem/correction tested with fake values.
- [ ] Buylist accept/decline/save flow tested.
- [ ] No public staging banner or debug copy visible in production.
- [ ] Admin, manager, staff, kiosk, and customer users verified.
- [ ] Database and wp-content backup completed before deployment.

## Secure Credential Handoff

Credentials are delivered separately through an encrypted password manager or encrypted archive. Use `SECURE_CREDENTIAL_HANDOFF.md` for process rules and `CREDENTIAL_INVENTORY_TEMPLATE.md` to track ownership, environment, rotation, and configuration location.
