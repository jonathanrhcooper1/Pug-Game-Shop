# Installation And Deployment Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Install, upgrade, deploy, validate, and roll back the production platform.
Audience: Administrator, developer, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## System Requirements

| Component | Requirement |
| --- | --- |
| WordPress | Current supported WordPress version with REST API and WP-Cron/Action Scheduler available. |
| PHP | Modern supported PHP version compatible with WordPress/WooCommerce and typed plugin classes. |
| Database | MySQL or MariaDB with permissions to create and alter custom plugin tables. |
| WooCommerce | Installed and active before commerce features are used. |
| Node.js/npm | Required for build, packaging, local sync server, and frontend/app tests. |
| Windows app | Windows workstation for employee/kiosk installer; WebView/runtime and network access to LAN server. |
| Barcode scanner | Keyboard-wedge scanner preferred for POS-style input. |
| Label printer | Dymo LabelWriter 550 Turbo or configured equivalent; verify driver locally. |

## WordPress Installation

1. Back up the production database and `wp-content`.
2. Install `tcg-store-platform-${version}.zip` through WordPress admin or WP-CLI.
3. Activate the plugin and verify no fatal error occurs.
4. Run or confirm plugin migrations; the target database version is tracked in the plugin version class.
5. Install `pug-arcade-commerce-v2-${version}.zip` and activate the theme.
6. Configure WooCommerce currency, tax, local pickup, checkout, and payment gateway settings.
7. Configure permalink settings and flush rewrite rules if event/product routes change.
8. Create administrator, manager, staff, and kiosk/device users with least privilege.

## GoDaddy Managed WordPress Notes

- Use staging for pre-production validation when available.
- Confirm upload limits before uploading large theme/release packages.
- Use hosting backups before plugin/theme replacement.
- Confirm PHP memory/time limits when running large ScryDex imports.
- Block public indexing on staging and keep live payment capture off outside production.

## Environment Configuration

Required variables and WordPress fields are documented in `ENVIRONMENT_VARIABLES.md`. Production values must be entered only into WordPress settings, hosting control panels, server environment files excluded from Git, or a secure password manager.

## Deployment Flow

1. Work from a feature branch and open a pull request.
2. Run `npm.cmd run test:local` for plugin unit/lint/bootstrap coverage.
3. Run app and sync tests relevant to changed modules.
4. Run `npm.cmd run package:production-release` to build the full package.
5. Deploy to staging or a staging clone and run smoke tests.
6. Back up production database and `wp-content`.
7. Install plugin/theme ZIPs, run migrations, and verify routes.
8. Run active sync verification and checkout/kiosk smoke tests.
9. Record rollback points and owner approval.

## Offline App And LAN Server Installation

1. Install and start the LAN middleman server on a stable in-store host machine.
2. Allow inbound LAN traffic to the configured server port and UDP discovery port.
3. Install the employee app on staff stations.
4. Install the customer kiosk app on kiosk stations.
5. Let apps auto-discover the middleman; if blocked, enter `http://STORE-SERVER-IP:8787` manually.
6. Pair devices using the configured pairing process.
7. Verify pull inventory, push inventory, customer lookup, kiosk order, fulfillment, and queue replay.

## Post-Install Validation

- [ ] Website and key pages load.
- [ ] WooCommerce checkout loads.
- [ ] ScryDex search returns reference cards.
- [ ] Catalog status route returns counts without secrets.
- [ ] Inventory intake creates serialized rows.
- [ ] WooCommerce product sync creates/updates grouped products.
- [ ] Kiosk submits a held order and fulfillment queue receives it.
- [ ] Employee app sync status and queue status are accurate.
- [ ] Event registration stores a record and sends a confirmation email.
- [ ] Payment gateway is in intended mode and records orders.
- [ ] Reports are manager-only.
- [ ] No real secrets appear in logs, docs, screenshots, or GitHub.

## Rollback

Use the pre-release database and `wp-content` backups. Do not restore an old database over production without first accounting for orders, sold inventory, customer credit ledger entries, POS sync, and offline queued actions created after the backup.
