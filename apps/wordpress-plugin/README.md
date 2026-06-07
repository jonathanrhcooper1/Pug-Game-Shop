# TCG Store Platform WordPress Plugin

Version: `0.108.0`

## Implemented Features

- Multisite-aware activation and uninstall.
- Versioned, reversible foundation migration.
- Inventory and pricing schema migration.
- Foundation settings, role-permission, audit, and migration tables.
- White-label company branding settings for company identity, support/logo
  URLs, receipt copy, theme colors, staging banner color, and CSS variable
  export.
- Reference card/variant, inventory location/item, movement, barcode, price
  change, and manager override tables.
- Least-privilege staff, manager, kiosk, and system roles.
- WordPress Settings API screen.
- Structured JSON logging with secret redaction.
- Immutable audit append service.
- Action Scheduler integration for 9:00 AM Eastern daily dispatch.
- Authenticated `/wp-json/tcg-store/v1/health` endpoint.
- Local inventory status, intake validation, and pricing policy helpers.
- Events and TopDeck schema migration.
- Event registration status, public event badge, and capacity helpers.
- TopDeck provider adapter with owned tournament, tournament info, attendee,
  register-player, import, sync, and default-disabled create-event contract.
- Public read-only event REST endpoints and shortcodes for event list/detail
  pages.
- Public local event registration endpoint for free and pay-at-store
  reservations with idempotency, event-row locking, capacity checks, waitlist
  insertion, count updates, and registration logs.
- Customer, contact, credit ledger, merge, and note schema migration.
- Customer credit entry type and posting policy helpers for signed ledger
  previews, manager approval, and negative-balance rejection.
- Customer credit ledger posting service and repository with idempotency,
  customer row locking, cached balance updates, and replay handling.
- Customer credit planned REST route contracts and posting payload validation
  for idempotent ledger writes, manager approvals, and route-customer matching.
- Customer credit REST response presenter for safe balance, ledger, posting,
  and validation-error payloads with redacted ledger metadata.
- Buylist submission, item, offer, approval, and conversion schema migration.
- Buylist submission status transition helper.
- Buylist planned REST route contracts and submission intake payload validation
  for customer identity, idempotency, source, owner token, and item rows.
- Buylist offer planner for reviewed item offers, totals, manager approval
  thresholds, target submission statuses, and deterministic offer fingerprints.
- Generic sync job/checkpoint/error/webhook schema migration.
- ScryDex checkpoint/resume value and request planning helpers.
- ScryDex provider adapter contract and HTTP provider with mock-backed tests,
  credential redaction, rate-limit mapping, and default-disabled webhook
  registration.
- ScryDex card and market price normalization helpers for local reference rows.
- Reservation schema migration and reservation service foundation for exact
  inventory active-claim enforcement.
- Reservation lifecycle service helpers for idempotent conversion to sold and
  release back to available.
- Reservation expiry cleanup planner and explicit expired-hold transition back
  to available inventory.
- Manager override policy helpers for below-minimum sale authorization.
- Manager override persistence/audit payload planning for future stored
  below-minimum approvals.
- WooCommerce serialized cart item metadata validator for exact inventory
  checkout lines.
- WooCommerce order-line metadata planner for exact inventory, reservation,
  owner-token, price snapshot, expiry, optional card descriptor, and snapshot
  hash persistence.
- WooCommerce order lifecycle planner for checkout linkage, payment-complete
  conversion, failed/cancelled release, refund review, duplicate line guards,
  and non-serialized line skipping.
- WooCommerce serialized inventory hook contracts for cart, checkout, payment,
  refund, cart removal, and Store API validation lifecycle coverage.
- Offline device pairing, push, pull, conflict list, and conflict resolution
  planned REST route contracts with permission strategy metadata,
  registered-device required scopes, and live registration disabled.
- Offline push payload validation for batch IDs, device matching, operation
  envelopes, supported operation/entity pairs, timestamps, row versions,
  payload objects, authorization context, duplicates, and schema version.
- Offline push persistence SQL and repository staging for future
  `tcg_offline_sync_queue` and `tcg_sync_conflicts` writes, including prepared
  templates, explicit `$wpdb` execution, replay-only no-op plans, and deferred
  route/canonical mutation flags.
- Offline pull request validation for device IDs, cached domains, cursors,
  page-size bounds, tombstone inclusion, and schema version.
- Offline pull response presentation for per-domain cursors, change rows,
  tombstones, server timestamps, and `has_more` pagination flags.
- Offline device pairing request validation for pairing codes, installation
  IDs, device modes, manager/location IDs, app versions, hardware
  capabilities, requested scopes, and schema version.
- Offline device registration planning for future device rows, one-time
  response payloads, token hashes, sync routes, first-sync flags, and audit
  payloads without live writes.
- Offline device registration credential issuance for future pairing flows,
  including generated device IDs, one-time device tokens, SHA-256 token hashes,
  UTC issue/expiry timestamps, TTL bounds, injectable byte sources for tests,
  and secret-free audit fingerprints.
- Offline device registration insert query planning for future
  `tcg_offline_devices` writes, including prepared SQL templates, JSON field
  normalization, UTC timestamp conversion, and secret-free audits without live
  database execution.
- Offline device registration repository adaptation for future
  `tcg_offline_devices` writes, including planned `$wpdb` insert execution,
  inserted/rejected outcomes, insert ID capture, and secret-free repository
  audits without live route wiring.
- Offline device registration service orchestration for future pairing flows,
  including pairing validation, credential issuance, registration planning,
  explicit repository insertion, stable result envelopes, and secret-free
  service audits without live route wiring.
- Offline device registration route handler adaptation for the
  `register_offline_device` controller callback, including injected handler
  dispatch, registered/invalid/rejected response envelopes, and retained
  secret-free audit payloads without default route enablement.
- Offline device pairing permission callback adaptation for future staged
  pairing routes, including request-body parsing, injected manager/pairing
  authorization, authorizer rejection handling, secret-free audit payloads,
  and optional permission factory attachment while defaults remain locked.
- Offline device pairing route readiness planning that composes the injected
  registration handler and configured pairing permission callback into one
  staging bootstrap summary without registering live routes.
- Authenticated health output and admin System Status reporting for staged
  offline device pairing route readiness, while route registration remains
  deferred.
- Offline device pairing authorization planning for future staged pairing
  callbacks, including hashed pairing-code checks, manager/location allowlists,
  device-mode scope policy, UTC expiry enforcement, and secret-free audit
  payloads.
- Optional offline device registration service authorization enforcement that
  rejects denied pairing policies before issuing credentials or calling the
  registration repository.
- Staged offline device registration route-handler mapping for pairing
  authorization denials, including a distinct 403 response code while live
  route registration remains disabled.
- Hash-only offline pairing authorization settings for future staged pairing
  policies without retaining raw pairing codes.
- Settings-backed offline pairing authorizer factory for future staged pairing
  callbacks without enabling live route registration.
- Non-secret offline pairing policy readiness summaries in health and admin
  System Status for staged review.
- Staged offline device registration route-handler assembly from `$wpdb`,
  repository, service, and settings-backed pairing authorizer readiness without
  enabling live route registration.
- Staged registered-device permission resolver readiness for offline pull/push
  callbacks from `$wpdb`, repository, and session update dependencies without
  enabling live routes.
- Staged registered-device sync route handler readiness for offline pull/push
  controller callbacks, keeping route registration and route-connected writes
  deferred.
- Staged offline pull route handler responses for registered-device pull
  requests, returning presenter-shaped empty domain responses while live
  change queries, cursor advancement, and route registration stay deferred.
- Offline pull change-query planning for branding, inventory, customer credit,
  events, and conflicts cache domains, with table/column contracts and
  device-scoped conflict filters while execution stays deferred.
- Health and admin System Status readiness metadata for staged offline pull
  change-query planning while trusted context handoff and execution stay
  deferred.
- Offline pull change-query SQL planning that converts safe domain contracts
  into prepared per-domain SQL templates and argument arrays while cursor
  filtering, execution, tombstone reads, cursor advancement, and route
  registration stay deferred.
- Offline pull change repository adapter for explicitly called prepared
  `$wpdb` reads, row normalization, pull change-set shaping, and secret-free
  audits while route connection, cursor advancement, and tombstone reads stay
  deferred.
- Offline pull change-set provider composition for explicit registered-device
  context, query planning, repository fetches, pull handler injection tests,
  and provider readiness metadata while default route wiring stays deferred.
- Offline pull device context planning for authorized registered-device
  permission resolutions, request/device matching, offline device ID and table
  prefix handoff, and secret-free audits while route wiring stays deferred.
- Offline pull route-aware provider handoff for explicitly injected pull
  handlers that can resolve registered-device headers and fetch change sets
  while default route-connected reads, cursor advancement, tombstone reads,
  route registration, and route-connected writes stay deferred.
- Offline pull cursor advancement planning for provider change sets, complete
  page checks, per-device cursor row payloads, and write-deferred readiness
  metadata.
- Offline pull cursor SQL planning for prepared per-device cursor upsert
  templates, with execution and route-connected writes still deferred.
- Offline pull cursor repository adaptation for explicitly called `$wpdb`
  cursor upserts, with default route connection and route-connected writes
  still deferred.
- Offline pull route cursor advancement provider for explicitly injected route
  orchestration, resolving registered-device headers and invoking the cursor
  repository while default route execution remains deferred.
- Offline pull handler cursor advancement orchestration for explicitly injected
  providers, including advanced/rejected metadata and fail-closed cursor write
  errors while default handler execution remains deferred.
- Offline pull route handler factory composition for explicitly enabled staging
  dependencies, wiring route-aware change-set and cursor-advance providers while
  default route dependency injection remains deferred.
- Offline device access policy checks for future registered-device permission
  callbacks, including active/revoked/expired state, required scopes, supported
  modes/scopes, location IDs, and UTC timestamp validation.
- Offline device bearer-token authentication planning for future permission
  callbacks, including header normalization, token shape validation, SHA-256
  token hash comparison, persisted offline-device IDs, and secret-free accepted
  contexts.
- Offline device token lookup planning for future repositories, including
  hashed token lookup filters, short audit fingerprints, normalized
  WordPress-style headers, and no raw token retention.
- Offline device session planning for future permission callbacks, including
  authenticated row matching, last-seen update rows, row-version increments,
  session context, and secret-free audit payloads.
- Offline registered-device permission planning for future REST callbacks,
  including lookup-needed, denied, and authorized states that compose token
  lookup, loaded-row authentication, and session update planning without live
  database writes.
- Offline registered-device row normalization for future repositories,
  including database identity coercion, decoded scopes/capabilities, UTC
  timestamp normalization, validation errors, and secret-free audit payloads.
- Offline registered-device lookup-query planning for future repositories,
  including selected columns, active/revocation/expiry filters, row-normalizer
  metadata, lock intent, deferred scope checks, and secret-free audit payloads.
- Offline registered-device permission lookup-query integration, including
  lookup-required query args, rejected invalid scope/time query plans, and
  permission audit summaries without live repository calls.
- Offline registered-device lookup query building for future repositories,
  including safe table-prefix validation, whitelisted selected columns,
  prepared SQL templates, UTC-to-MySQL expiry arguments, and secret-free audit
  payloads without executing live database queries.
- Offline registered-device repository adapter for future permission callbacks,
  including planned `$wpdb` lookup execution, not-found handling, row
  normalization, malformed-row rejection, and secret-free query/normalization
  audits without live route wiring.
- Offline registered-device permission resolver for future permission
  callbacks, including initial token planning, repository-backed lookup,
  loaded-row authentication, session update planning, not-found denial, and
  secret-free resolution audits without live route wiring or last-seen writes.
- Offline registered-device permission resolver opt-in session update
  application, including applied update authorization, stale update denial,
  failed update denial, skipped denied-device updates, and redacted
  session-update audits without live route wiring.
- Offline registered-device permission callback adapter for future REST
  `permission_callback` wiring, including WordPress-style header extraction,
  boolean callback results, last-resolution access, opt-in session update
  application, and plan-only resolver compatibility without route registration.
- Offline route permission callback factory for future registered-device REST
  route wiring, including `offline_pull`/`offline_push` scope maps, adapter
  construction, non-device route exclusion, and route registration kept
  disabled.
- Pairing-only route permission factory planning, allowing staged pairing
  permission callbacks without requiring a registered-device resolver while
  registered-device routes remain fail-closed until that resolver is present.
- Pairing permission authorizer-readiness checks, keeping unconfigured pairing
  adapters out of planned route permission callbacks.
- Offline route registration planner for future WordPress REST wiring,
  including disabled-by-default route plans, fail-closed permission callbacks,
  registered-device callback metadata, controller-readiness gates, and no
  public permission bypasses.
- Offline route registration handler-readiness enforcement, requiring
  explicitly injected controller handlers before future route plans can treat a
  controller callback as ready.
- Offline controller scaffold for future offline REST route handlers, including
  callback method coverage for every planned route and stable disabled
  responses while live handlers remain blocked.
- Offline route registrar guard for future WordPress REST wiring, including
  zero default offline route registration, injected registrar tests, and
  ready-and-enabled plan filtering.
- Offline REST request adapter and normalized request data for future route
  handlers, including body/query/route params, header/idempotency extraction,
  and injected controller dispatch while defaults remain disabled.
- Offline route validation handler factory for parser-only controller
  injection, covering pairing, pull, push, conflict list, conflict resolution,
  safe response summaries, and stable validation errors without writes.
- Offline route bootstrap planner for future staging bootstrap checks,
  including feature-gate status, registerable route counts, route keys,
  route-registration summaries, and bootstrap block reasons without registering
  live routes.
- Offline route bootstrap status presentation in authenticated health output
  and admin System Status for staging readiness checks, including deferred
  registration state, while live offline routes remain unregistered.
- Offline route bootstrapper wiring on `rest_api_init` with guarded registrar
  deferral unless the offline feature gate and route-readiness plan are ready.
- Offline device session update query building for future permission
  callbacks, including safe table-prefix validation, last-seen timestamp
  conversion, optimistic row-version guards, prepared SQL templates, and
  secret-free audits without executing live writes.
- Offline device session update repository adapter for future permission
  callbacks, including planned `$wpdb` update execution, applied/stale/rejected
  outcomes, failed-write rejection, unexpected-row-count rejection, and
  secret-free audits without live route wiring.
- Offline conflict list and resolution request validation for future
  conflict-center filters, idempotent manager resolution actions, expected row
  versions, UTC resolution timestamps, notes, and adjustment payloads.
- Offline conflict list response presentation for future conflict-center rows,
  filters, cursors, severity, row versions, payload objects, and available
  manager resolution options.
- Offline conflict resolution planning for future row updates, response
  payloads, stale-version guards, terminal-status guards, action availability
  checks, and redacted audit payloads.
- Offline push operation resolution planning for future queue replay outcomes,
  response payloads, operation result rows, manager-reviewed conflict rows,
  deterministic conflict IDs, and redacted audit payloads.
- Offline push batch resolution planning for future route handlers,
  per-operation results, operation result rows, enriched conflict rows, batch
  counts, server snapshot lookup, and redacted batch audit payloads.
- Offline sync persistence schema for registered devices, idempotent operation
  queue/result rows, manager-reviewed conflicts, and per-device pull cursors.
- Offline push persistence planning for future queue/result inserts, conflict
  inserts, idempotent operation replay rows, and redacted audit payloads.
- Dependency-free REST route contract tests for health and public Events
  endpoints.
- Migration runner planning coverage for clean install, upgrade, idempotent
  current-schema rerun, and rollback order.
- TopDeck registration push adapter and result mapping for later queue workers.
- ScryDex sync page processor for normalized card/price upsert planning and
  checkpoint advancement.
- ScryDex persistence planner for deterministic reference-card inserts,
  changed-row updates, unchanged-row detection, and current price observations.
- Hard-disabled flags for unfinished modules.
- Explicit pending HPOS verification state.

## Local Checks

With PHP 8.1 or newer:

```sh
php tests/lint.php
php tests/run.php
```

Composer is optional at runtime. When available:

```sh
composer install
composer lint
composer test
composer standards
```

To run a local WordPress Playground smoke site without Docker or MySQL:

```sh
npx @wp-now/wp-now start --php=8.2 --blueprint=tests/wp-now-blueprint.json
```

On Windows, older `wp-now` releases may fail while installing WordPress.org
plugins from a Blueprint. If that happens, run `npx @wp-now/wp-now start
--php=8.2` from this plugin directory to verify plugin activation and admin
status locally, then rely on GitHub Actions for the WooCommerce-backed
integration gate.

`composer.lock` is committed so CI and future developers use the reviewed tool
versions.

## Installation

1. Use a staging WordPress site with WooCommerce 8.2 or newer.
2. Copy this complete directory to
   `wp-content/plugins/tcg-store-platform`.
3. Activate **TCG Store Platform**.
4. Open **TCG Store > System Status**.
5. Confirm schema version `8 / 8`, WooCommerce, Action Scheduler, and the next
   daily UTC run.
6. Authenticate as a manager/admin and request
   `/wp-json/tcg-store/v1/health`.

## Data Safety

Deactivation retains all data. Uninstall also retains data unless an authorized
administrator deliberately enables **Permanently delete platform tables and
settings during uninstall**.

HPOS is declared unverified until WooCommerce lifecycle integration tests pass
in Phase 4. The plugin does not read or write WooCommerce order tables directly.
