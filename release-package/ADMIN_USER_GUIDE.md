# Admin User Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.1
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: WordPress administrator guide for configuration and support tasks.
Audience: WordPress administrator and support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Admin Menu Areas

| Area | Purpose | Typical user |
| --- | --- | --- |
| TCG Store Dashboard | Health, routes, dependencies, sync and connector status. | Admin/manager |
| Inventory | Search, intake, product sync, Square mapping, and serialized item review. | Admin/manager/staff |
| ScryDex Catalog | Manual index, resume, export, checkpoint review. | Admin/manager |
| Reports | Business, inventory, credit, buylist, fulfillment, sync, POS, and audit reports. | Manager/admin |
| Events | Local event setup, registration status, check-ins. | Admin/manager/staff |
| Settings | Provider settings, feature flags, route runtime, store policies. | Admin |

## Admin Setup Steps

1. Confirm WooCommerce is installed and active.
2. Confirm plugin activation and database migration status.
3. Configure store policies, ScryDex credentials, route runtime, and offline pairing settings.
4. Configure WooCommerce payment gateway plugins separately from customer credit.
5. Create manager and staff users.
6. Run a small card search and inventory intake validation.
7. Run a kiosk/order/fulfillment validation.

## User Management

Create staff users with only the capabilities needed for counter work. Create manager users for overrides, reports, credit corrections, trade-in approval, settings, and conflict resolution. Remove access immediately when staff leave the store and rotate shared device/pairing credentials as needed.

## Admin Safety Rules

- Do not paste secrets into support tickets, screenshots, docs, or GitHub.
- Do not manually edit ledger rows; use correction entries.
- Do not delete inventory rows to fix a sale; update status with audit context.
- Do not run production migrations without a backup.
- Do not enable live payment capture in staging.
