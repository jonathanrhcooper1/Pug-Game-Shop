# Testing

## Test Layers

| Layer | Scope |
| --- | --- |
| Unit | Pricing, validation, state machines, capability logic, normalization |
| Database integration | Transactions, row locks, uniqueness, migrations, ledger replay |
| WordPress integration | REST permissions, nonces, Action Scheduler, settings, admin |
| WooCommerce integration | Classic/Block cart and checkout, HPOS, order/refund lifecycle |
| Provider contract | Recorded sanitized fixtures plus verified sandbox/account calls |
| Desktop integration | SQLite migrations, queue, device auth, printer/scanner adapters |
| End-to-end | Website, kiosk, staff, offline/reconnect, event, buylist workflows |
| Load/recovery | 50,000+ items, full sync, concurrent reservations, backup/restore |

## Current Automation

- `.github/workflows/pull-request-quality-gates.yml` runs local PHP checks,
  validates `.wp-env.json`, confirms required test scaffolds exist, and scans
  for production secret markers on pull requests.
- `.github/workflows/php.yml` runs Composer validation, dependency audit,
  syntax checks, unit tests, bootstrap smoke, and WordPress coding standards
  against PHP 8.1, 8.2, and 8.3.
- `.github/workflows/wordpress-integration.yml` provisions WordPress and MySQL
  in GitHub Actions, installs WooCommerce, activates the plugin, and runs
  `apps/wordpress-plugin/tests/wordpress-integration-smoke.php` through WP-CLI.
- `apps/wordpress-plugin/tests/wp-now-blueprint.json` can be used with
  `npx @wp-now/wp-now start --blueprint=tests/wp-now-blueprint.json` for a
  local WordPress Playground smoke site when Docker/MySQL are unavailable.
  On Windows, `wp-now` may fail while installing WordPress.org plugins from a
  Blueprint; in that case, run plain plugin mode locally and use the GitHub
  Actions WordPress integration job for the WooCommerce-backed gate.
- Local unit coverage now includes event registration input validation,
  registration policy outcomes, and registration response shaping. WordPress
  integration smoke coverage asserts the local registration route is registered.

## Required Test Backlog

The following areas must graduate from scaffold docs to automated tests as the
corresponding modules are implemented:

- REST API tests.
- Database migration tests.
- Pricing engine tests.
- Reservation/double-sell prevention tests.
- Customer credit ledger tests.
- Manager override tests.
- ScryDex sync checkpoint/resume tests.
- TopDeck registration adapter tests.
- WooCommerce checkout hook tests.
- Playwright admin, kiosk, search, cart, event registration, and customer
  credit flows.
- Offline app sync conflict tests.

## Critical Business Tests

### Pricing

- Suggested price equals market plus 10 percent with configured rounding.
- Missing minimum price blocks intake.
- Automated price never drops below minimum.
- Price lock prevents change.
- Floor hit and every price change are logged.
- Below-minimum sale requires valid manager approval.
- Mismatched currency does not drive automatic pricing.

### Reservation And WooCommerce

- Exact item reservation is atomic.
- Two parallel carts cannot reserve one item.
- Expiry and manual release restore availability.
- Payment completion converts once, including replay.
- Failed/cancelled payment releases according to policy.
- Refund moves item to configured review/return state.
- Cart/Checkout Blocks and classic checkout behave consistently.

### Inventory

- Barcode/SKU uniqueness.
- Raw/graded validation.
- Location moves and audit.
- Valid status transitions.
- Bulk intake creates distinct serialized rows.

### Credit

- Ledger sum equals cached balance.
- Duplicate idempotency key posts once.
- Concurrent redemption cannot overspend.
- Manager approval for adjustment/void/merge.
- Offline conflict cannot create silent negative balance.

### Sync

- Page/cursor checkpoint and resume.
- Duplicate prevention.
- Usage/rate-limit handling.
- Raw payload credential masking.
- Webhook raw-body signature and replay protection.
- Image content/size/path validation.
- Daily job schedules correctly across both DST transitions.

### Events And TopDeck

- All three registration modes.
- Local free/pay-at-store event registration route validation, idempotency, and
  waitlist policy.
- Paid registration with successful and failed TopDeck push.
- Pending invitation, already registered, banned/failed, and capacity conflict.
- Waitlist promotion and check-in.
- `createEvent` remains unavailable when capability is unsupported.

### Security

- Every route rejects missing/incorrect capability.
- Kiosk cannot access private/admin data.
- Revoked device token fails.
- API keys never appear in logs/responses.
- Upload/SSRF defenses.
- Webhook signature, timestamp, and duplicate event tests.

## Concurrency Tests

Run true parallel database processes for:

- Two reservations for one inventory item.
- POS sale versus website checkout.
- Two credit redemptions.
- Two final event seats.
- Repricing versus staff manual price lock.

Mock-only concurrency tests are insufficient.

## Performance Targets

Targets are established during Phase 2 on target-like hosting:

- Search p95 for 50,000 inventory rows plus representative reference data.
- Exact reservation transaction p95.
- Admin inventory pagination and filter p95.
- Full pull throughput within provider credits and host limits.
- Offline local search p95 on target Windows hardware.

Numbers are not invented in Phase 0; benchmark baselines determine acceptable
budgets before production sign-off.

## Migration And Recovery

Every migration test covers clean install, upgrade from prior released version,
idempotent rerun, and rollback where practical. Backup restore drills verify
inventory, credit, orders, images, and device resync.
