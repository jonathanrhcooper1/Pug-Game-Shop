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
- Local unit coverage now includes customer credit schema, entry type sign and
  manager-approval rules, posting policy previews, and ledger posting service
  idempotency. WordPress integration smoke coverage asserts customer credit
  tables.
- Local unit coverage now includes customer credit planned REST route contracts
  and posting payload validation for route/customer matching, idempotency,
  currency, metadata, optional linked IDs, and manager-approved adjustments.
- Local unit coverage now includes customer credit REST response presentation
  for balance payloads, ledger row shaping, metadata redaction, posting-result
  payloads, and validation-error responses.
- Local unit coverage now includes buylist schema and submission status
  transitions. WordPress integration smoke coverage asserts buylist tables.
- Local unit coverage now includes buylist planned REST route contracts and
  submission intake payload validation for customer identity, idempotency,
  source, owner tokens, optional IDs, item identity, quantity, and graded cards.
- Local unit coverage now includes buylist offer planning for reviewed item
  offers, cash/credit totals, manager approval thresholds, invalid submissions
  and item rows, zero-value offers, and deterministic offer fingerprints.
- Local unit coverage now includes branding settings sanitization for company
  identity, HTTPS URLs, hex color normalization, safe existing-value
  preservation, client-safe public config export, and CSS variable output.
- Local unit coverage now includes sync schema and ScryDex checkpoint/resume
  planning against sanitized mock fixtures. WordPress integration smoke coverage
  asserts schema version `6` and sync tables.
- Local unit coverage now includes ScryDex provider adapter behavior using
  sanitized mock fixtures, credential header assertions, rate-limit mapping, and
  auth-context redaction.
- Local unit coverage now includes ScryDex card and current market price
  normalization using sanitized mock fixtures, required-field errors, and safe
  nullable defaults.
- Local unit coverage now includes reservation schema contracts and
  transaction-oriented reservation service behavior for successful exact-item
  claims, idempotency replay, unavailable inventory rejection, and active claim
  collision rejection. Lifecycle coverage includes conversion to sold, release
  to available, idempotent conversion replay, and inventory-state mismatch
  rejection. WordPress integration smoke coverage asserts reservation tables
  as part of the full schema.
- Local unit coverage now includes offline sync persistence schema contracts for
  registered devices, idempotent operation queue/result rows, manager-reviewed
  conflicts, per-device pull cursors, and reversible drop order. WordPress
  integration smoke coverage asserts schema version `8` and offline sync
  persistence tables.
- Local unit coverage now includes offline push persistence planning for future
  queue/result rows, conflict insert rows, JSON payload shaping, idempotent
  replay rows, mismatched device rows, mismatched batch IDs, invalid timestamps,
  and stale replay rows.
- Local unit coverage now includes reservation expiry cleanup planning for
  expired active holds, equal-to-now expiries, future holds, inactive rows,
  invalid rows, deterministic cleanup idempotency keys, and explicit expired
  hold transitions back to available inventory.
- Local unit coverage now includes manager override policy behavior for
  below-minimum sale approval, distinct manager checks, required reasons,
  invalid amounts, and override-row persistence requirements.
- Local unit coverage now includes manager override persistence/audit payload
  planning for accepted below-minimum approvals, rejected decisions,
  no-row-required decisions, optional context IDs, and price formatting.
- Local unit coverage now includes WooCommerce serialized cart item metadata
  validation for exact inventory/reservation identifiers, owner token hashes,
  quantity-one enforcement, reservation expiry, price snapshots, and currency.
- Local unit coverage now includes WooCommerce order-line metadata planning for
  exact inventory, reservation, owner-token, price snapshot, currency, expiry,
  optional card descriptors, deterministic snapshot hashes, and zero-price
  snapshots.
- Local unit coverage now includes WooCommerce order lifecycle planning for
  checkout linkage, payment-complete conversion, failed/cancelled release,
  refund review, non-serialized line skips, invalid metadata, duplicate
  reservation lines, invalid actions, and invalid orders.
- Local unit coverage now includes WooCommerce serialized inventory hook
  contracts for cart, checkout, payment, order, refund, cart removal, and Store
  API validation lifecycle coverage, with live registration gated off by
  default.
- Local unit coverage now includes REST route contracts for health and public
  Events endpoints, including namespace/method/callback/access-mode checks and
  guards that unimplemented write modules are not registered.
- Local unit coverage now includes migration runner planning for clean install,
  prior-schema upgrade, current-schema idempotency, rollback order, and no-op
  rollback plans.
- Local unit coverage now includes TopDeck registration adapter mapping for
  provider call shape, email normalization/fallback, override-cap pass-through,
  provider outcome mapping, missing input guards, and retryable failures.
- Root automation now includes sync-engine offline conflict policy tests for
  inventory reservations, event reservations, customer credit redemption, and
  device revocation.
- Root automation now includes the offline app Windows package contract test
  for Tauri metadata, `x86_64-pc-windows-msvc`, NSIS `.exe` output, offline
  sync routes, required branding tokens, and secret-safety markers.
- Root automation now includes the offline app SQLite schema contract test for
  local device identity, cursors, operation queue envelope fields, sync logs,
  cached branding/inventory/credit/events, conflicts, and SQLite-only syntax
  guards.
- Local unit coverage now includes WordPress offline route contracts for
  device pairing, pull, push, conflict listing, conflict resolution,
  permissions, callbacks, namespace, and disabled-live defaults.
- Local unit coverage now includes offline push payload validation for batch
  IDs, required operation envelope fields, device matching, duplicate client
  operation IDs, supported operation/entity pairs, timestamps, JSON-object
  payloads, authorization context, and schema version gating.
- Local unit coverage now includes offline pull request validation for cached
  domain selection, cursors, page-size bounds, tombstone inclusion, device IDs,
  and schema version gating.
- Local unit coverage now includes offline pull response presentation for empty
  domain responses, request cursor carry-forward, normalized data rows,
  tombstone inclusion/exclusion, UTC timestamps, entity IDs, row versions, and
  invalid response contract inputs.
- Local unit coverage now includes offline device pairing request validation
  for pairing codes, installation IDs, device modes, manager/location IDs, app
  versions, Windows platform checks, hardware capabilities, requested scopes,
  unsupported capabilities/scopes, and schema version gating.
- Local unit coverage now includes offline device registration planning for
  future device rows, one-time response payloads, redacted audit payloads,
  scope/capability preservation, generated credential validation, and token
  expiry windows.
- Local unit coverage now includes offline device access policy checks for
  active allowed devices, revoked/inactive/expired devices, required and
  unsupported scopes, supported modes/scopes, location IDs, and UTC timestamp
  validation.
- Local unit coverage now includes offline device bearer-token authentication
  planning for valid tokens, normalized WordPress header arrays,
  missing/malformed tokens, invalid stored hashes, wrong tokens, missing
  persisted device IDs, revocation, denied scopes, and secret-free accepted
  contexts.
- Local unit coverage now includes offline device token lookup planning for
  hashed lookup filters, token fingerprints, normalized WordPress header arrays,
  missing/malformed/short tokens, and audit payloads without raw token or full
  token hash leakage.
- Local unit coverage now includes offline device session planning for
  last-seen update rows, session context, row-version increments, audit
  payloads, string database IDs, denied decisions, mismatched device rows,
  invalid timestamps, invalid device IDs, and invalid row versions.
- Local unit coverage now includes offline registered-device permission
  planning for lookup-required states, authorized loaded devices, session
  update planning, malformed tokens, denied scopes, invalid session rows, and
  secret-free audit payloads.
- Local unit coverage now includes offline registered-device row normalization
  for raw database identity fields, decoded scopes/capabilities, UTC timestamp
  normalization, explicit null date overrides, invalid JSON shapes, invalid
  identity/hash fields, and secret-free audit payloads.
- Local unit coverage now includes offline registered-device lookup-query
  planning for selected columns, token-hash filters, active/revocation/expiry
  query constraints, lock intent, deferred scope checks, invalid token lookup
  plans, unsupported scopes, invalid server times, and secret-free audits.
- Local unit coverage now includes offline conflict list and resolution request
  validation for statuses, entity types, cursors, page-size bounds,
  include-resolved filters, idempotent resolution IDs, manager IDs, resolution
  actions, notes, expected conflict versions, UTC timestamps, adjustment
  payloads, and schema version gating.
- Local unit coverage now includes offline conflict list response presentation
  for empty responses, filters, cursors, normalized conflict rows, severity, row
  versions, payload objects, duplicate action cleanup, and invalid response
  contract inputs.
- Local unit coverage now includes offline conflict resolution planning for
  row updates, response payloads, redacted audit hashes, stale row versions,
  terminal conflicts, unavailable actions, invalid current rows, and invalid
  server timestamps.
- Local unit coverage now includes offline push operation resolution planning
  for accepted inventory/event/credit outcomes, sold-inventory conflicts,
  TopDeck queue gating, event waitlisting, cached-limit rejection, overspend
  conflicts, revoked devices, and invalid server timestamps.
- Local unit coverage now includes offline push batch resolution planning for
  mixed accepted/conflict batches, response counts, operation result rows,
  conflict row enrichment, per-operation runtime options, missing snapshots,
  invalid options, and invalid server timestamps.
- Root automation now includes POS/payment reconciliation policy tests for
  sandbox payment responses, scan-gated sales, declined payments, unmapped line
  conflicts, and refunds to pending review.
- Local unit coverage now includes ScryDex sync page processor planning for
  normalized reference rows, price rows, invalid-card errors, checkpoint
  advancement, and retryable provider failures.
- Local unit coverage now includes ScryDex persistence planning for
  deterministic reference-card inserts, changed-row updates, unchanged-row
  detection, price observations, and failed page plan guards.

## Required Test Backlog

The following areas must graduate from scaffold docs to automated tests as the
corresponding modules are implemented:

- WordPress REST permission, nonce, request/response, and write-flow integration
  tests.
- Live database migration integration tests for `dbDelta`, transactional
  execution, schema option writes, rollback, and restore drills.
- Pricing engine tests.
- Reservation database integration, concurrent double-sell prevention tests,
  Action Scheduler cleanup workers, and WooCommerce cart timer integration.
- Customer credit ledger database integration and replay tests.
- Manager override persistence, manager reauthentication, and audit tests.
- ScryDex database write workers, scheduled worker, image download,
  usage-budget, and webhook integration tests.
- TopDeck registration worker integration tests and live sandbox contract
  verification.
- WooCommerce add-to-cart, checkout, payment, order-line, cart release, and
  refund hook integration tests.
- Playwright admin, kiosk, search, cart, event registration, and customer
  credit flows.
- Offline app SQLite queue, WordPress push/pull, live device row repository
  queries, registered-device permission callback wiring, device last-seen
  database writes, live conflict reads/writes, conflict audit persistence,
  device auth, and full reconnect integration tests.
- Live POS/payment sandbox contract tests, WooCommerce gateway lifecycle tests,
  and provider webhook reconciliation tests.

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
- Order-line metadata snapshots preserve exact inventory, reservation, owner,
  price, expiry, and card descriptor identity.
- Order lifecycle planning maps checkout, paid, failed/cancelled, and refunded
  order events to the correct reservation/inventory target states.
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

- Customer credit schema includes customers, contacts, immutable ledger, merge
  log, and note tables.
- Entry types map to expected positive, negative, or either signs.
- Manual adjustments, corrections, voids, and transfers require manager
  approval.
- Posting preview records signed amount and before/after balances with
  four-decimal precision.
- Ledger sum equals cached balance.
- Duplicate idempotency key posts once.
- Concurrent redemption cannot overspend.
- Manager approval for adjustment/void/merge.
- Offline conflict cannot create silent negative balance.

### Buylist

- Buylist schema includes submissions, items, offers, manager approvals, and
  conversion logs.
- Submission status transitions only follow the approved intake/review/offer/
  acceptance/payout/conversion flow.
- Terminal rejected, expired, completed, and cancelled submissions do not
  reopen without a documented manager workflow.
- Accepted items convert to pending inventory idempotently.
- Credit payouts post once through the customer credit ledger.
- Manager approval is required for configured high-value or exception offers.

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
- Pending TopDeck queue planner for eligible free website-push registrations.
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
