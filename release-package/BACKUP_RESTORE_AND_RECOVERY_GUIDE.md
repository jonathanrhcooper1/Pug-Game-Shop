# Backup Restore And Recovery Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Backup, restore, rollback, and disaster recovery procedure.
Audience: Owner, administrator, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## What To Back Up

- [ ] WordPress database including WooCommerce and all custom `tcg_` tables.
- [ ] `wp-content/uploads`, active theme, active plugin files, and custom media.
- [ ] Customer credit ledger and buylist tables.
- [ ] Inventory, reservations, orders, and POS sync logs.
- [ ] Events and event registrations/check-ins.
- [ ] Offline app local database files from in-store machines when troubleshooting.
- [ ] Ignored environment files and credentials through secure password manager export, not GitHub.

## Backup Schedule

| Backup | Frequency | Owner |
| --- | --- | --- |
| Hosting database backup | Daily and before releases. | Owner/admin |
| wp-content backup | Daily and before releases. | Owner/admin |
| Release package archive | Every production release. | Support |
| Offline local DB snapshot | Before major app repair or queue recovery. | Support |
| Credential inventory export | After rotations, stored securely. | Owner |

## Restore Procedure

1. Stop new deployments and notify staff.
2. Identify restore point and data created after that restore point.
3. Export current production state before overwrite.
4. Restore staging first when practical.
5. Validate orders, customer credit, inventory, events, and sync queues.
6. Restore production only after owner approval.
7. Run smoke tests and active sync verification.

## Critical Warning

Do not restore an old database over production without considering customer credit, sold inventory, orders, POS sync, and offline queued actions created after the backup. Those records may need manual reconciliation before or after restore.
