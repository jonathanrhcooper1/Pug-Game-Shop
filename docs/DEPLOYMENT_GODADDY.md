# GoDaddy WordPress Deployment

## Preflight Gate

Verify on the actual hosting plan:

- Supported PHP 8.x version and required extensions.
- MySQL/MariaDB version, InnoDB, `FULLTEXT`, transaction, and JSON behavior.
- HTTPS and WordPress Application Password support.
- WooCommerce and Action Scheduler compatibility.
- Ability to invoke `wp-cron.php` from a real cron every five minutes.
- Database size, execution time, memory, upload, and disk quotas.
- Private storage strategy for raw payloads and customer card photos.
- Backup frequency, retention, and restore procedure.

Any unsupported item changes the deployment plan before Phase 1 code is shipped.

## Planned Setup

1. Install supported WordPress and WooCommerce versions on staging.
2. Enable WooCommerce HPOS and use CRUD APIs.
3. Install the signed TCG Store Platform release.
4. Run migrations and health checks.
5. Configure store timezone and platform daily timezone as
   `America/New_York`.
6. Configure real cron and verify Action Scheduler execution.
7. Configure secrets outside the database where possible.
8. Pair kiosk/offline devices.
9. Configure scanners, labels, locations, reservations, and pricing.
10. Perform backup, restore, reservation race, payment, and sync smoke tests.

## Backups

Back up WordPress database, plugin-managed images, configuration, and encryption
key material through separate secure procedures. Test restoration before launch.
Live data is never copied to GitHub.
