# Changelog

All notable changes follow Semantic Versioning.

## [Unreleased]

### Added

- Polished offline app inventory command workspace UI with scanner/search,
  selected-card detail, sync queue, conflict review, customer credit snapshot,
  responsive layout, local favicon, Vite build dependency refresh, and UI shell
  contract coverage.
- Typed offline app workspace state and SQLite-compatible staged inventory
  operation envelope preview, with React type packages, package-level
  typecheck, workspace-state contract coverage, and CI workflow installation
  of nested offline app dependencies.
- Browser-safe offline queue bridge contract for future Tauri/SQLite operation
  persistence, with UI staging routed through the bridge and contract coverage
  blocking direct network, storage, or database writes.
- Tauri queue command scaffold and frontend Tauri adapter detection for staged
  inventory operation envelopes, plus Windows workflow Rust test coverage for
  the desktop command path.
- Planned inventory and card-search REST route contracts for card management,
  serialized inventory operations, reference search, and public/staff search
  surfaces while keeping live route registration disabled by default.
- Dependency-free inventory intake parsing for staff/offline/ScryDex-import
  card management payloads, including exact-item normalization, price floor
  checks, visibility normalization, and deferred WooCommerce projection flags.
- Inventory intake repository collision guard that reports duplicate barcode
  and SKU errors before insert while keeping database unique keys as the final
  safety net.
- Transactional inventory intake price-change logging that writes the initial
  `tcg_price_change_log` row with each staged inventory create, rolls back the
  create if the log cannot be written, and exposes persistence metadata in the
  REST response.
- Manager override reauthentication requirements plus staged
  `tcg_manager_overrides` repository persistence for accepted below-minimum
  sale approvals.
- Plan-only inventory intake persistence for staged card creation, including
  deterministic public IDs, fallback barcode/SKU generation for pending intake,
  schema-aligned insert rows, prepared SQL templates, timestamp/date planning,
  money normalization, and deferred database/write/projection metadata.
- Explicit inventory intake repository adapter that can execute staged
  inventory insert plans through injected `$wpdb`, with table-prefix mismatch
  guards, exact insert-count handling, response payloads, and route/projection
  deferral audit metadata.
- Staged inventory intake route handler and factory that can explicitly compose
  parser, persistence planner, and repository execution for `POST /inventory`
  creation tests while default live route registration remains disabled.
- Gated inventory REST controller, permission callbacks, registration planner,
  and registrar for future `/inventory/search` reads and `POST /inventory`
  writes, with public reads and route-connected writes disabled by default.
- Public inventory read rate-limit policy wiring for future public search
  routes, including transient-backed WordPress storage support, hashed bucket
  audit data, fail-closed behavior when no limiter is configured, and staff
  capability fallback for staging/admin reads.
- Inventory route dependency factory and readiness presenter that compose
  staged search/create handlers, permission callbacks, registration planner,
  and registrar while keeping live inventory routes gated.
- Authenticated health payload, admin System Status row, and WordPress smoke
  assertions for blocked-by-default inventory route dependency readiness.
- Inventory route bootstrap planner, status presenter, and `rest_api_init`
  bootstrapper wiring that keep live inventory routes deferred until feature,
  permission, handler, and route deferral gates are explicitly cleared.
- Default inventory dependency graph composition for staged search and intake
  handler factories, while route-connected reads and writes remain disabled.
- Staff-facing WordPress Inventory admin workspace that surfaces readiness,
  route contracts, and next checkpoints from the staged inventory route graph
  while remaining read-only and route-safe by default.
- Sanitized inventory route runtime settings and settings-aware route contract
  configuration for enabling the staff `/inventory/search` route in staging
  without enabling writes, public reads, Square writes, or WooCommerce writes
  by default.
- Environment-aware feature flag availability that allows inventory/pricing
  only in local, development, and staging environments while production remains
  unavailable by default.
- WordPress integration staging smoke coverage that opens only the staff
  `/inventory/search` route after staging feature/runtime gates are enabled and
  verifies writes, public reads, WooCommerce projection, Square projection, and
  POS ingestion stay closed.
- Staging-only staff inventory create runtime gate for `POST /inventory`,
  keeping production defaults locked while external WooCommerce, Square, POS,
  and label side effects remain deferred.
- WordPress integration staging smoke coverage that creates a disposable
  Bulbasaur inventory row through REST and searches it back through the staff
  inventory route.
- Staged inventory create responses now include side-effect-free WooCommerce
  product and Square inventory projection contracts after successful database
  writes, proving external projection intent while keeping WooCommerce, Square,
  labels, and network calls deferred.
- Staff Inventory workspace readiness now separates side-effect-free
  WooCommerce/Square projection planning from deferred external writes, with a
  dedicated projection-contract checkpoint for staging review.
- WordPress integration migration rehearsal that requires an explicit
  destructive-test environment flag, refuses production, rolls the disposable
  database from the current schema target back to version `1`, verifies Phase 2
  inventory/pricing tables are dropped, migrates back to the target, and
  verifies those tables return.
- WordPress integration inventory search benchmark fixture that requires an
  explicit non-production environment flag, seeds 50,000 deterministic
  disposable inventory rows, exercises public search, staff deep pagination,
  and staff barcode lookup through the staged search handler, and emits timing
  baselines for later GoDaddy staging review.
- Staff Inventory Workspace search panel with safe filter sanitization,
  route-readiness lockout messaging, and a REST-backed read-only results table
  for the staging staff inventory search route.
- Staff Inventory Workspace intake panel with gated REST-backed card creation
  for staging staff users while WooCommerce, Square, POS, and label actions
  remain deferred.
- Seeded WordPress staging inventory smoke data for a disposable Pokemon card
  row so CI verifies staff inventory search against real table data.
- Dependency-free inventory search query parsing for public/staff filters,
  pagination, sorting, status filters, and location scoping.
- Inventory search query planning for public/staff/hidden card listings with
  safe selected columns, visibility-aware filters, stable ordering, pagination,
  and deferred WooCommerce/Square projection flags.
- Inventory search response presentation with public redaction and staff-only
  operational fields for barcode, SKU, cost, location, visibility, and row
  version details.
- Inventory search SQL-template planning for public/staff/hidden card listings,
  including allowlisted selected columns, prepared `SELECT` and `COUNT`
  templates, stable ordering, pagination arguments, tamper rejection, and
  deferred repository execution metadata.
- Inventory search repository adapter for explicitly injected `$wpdb` reads,
  including prepared `SELECT` and `COUNT` execution, table-prefix validation,
  normalized row envelopes, database failure and malformed-row rejection, and
  deferred route/WooCommerce/Square write metadata.
- Staged inventory search route handler and factory that can explicitly compose
  parser, query planner, repository, and public/staff response presentation for
  `/inventory/search` while default live route registration remains disabled.
- WooCommerce product projection planning for exact serialized inventory rows,
  including simple-product create/update payloads, stockout updates for mapped
  unavailable cards, serialized metadata, currency/quantity validation, and
  explicit deferred WooCommerce/Square write metadata.
- Guarded WooCommerce product projection executor that blocks by default,
  requires explicit staging execution plus an injected product writer, records
  audit-safe execution results, and keeps Square inventory writes, payment
  capture, network calls, and production writes deferred.
- Square inventory projection planning for exact serialized cards, including
  Square catalog variation payloads, physical-count payloads, scan-identity
  validation, zero-count updates for unavailable mapped cards, and deferred
  network/provider write metadata.
- Guarded Square inventory projection executor for POS inventory sync that
  blocks by default, requires explicit staging execution plus injected catalog
  and inventory writers, records audit-safe results, and leaves payment capture
  to the official WooCommerce Square extension.

### Changed

- Converted the active events module to local-only event registration by
  removing provider registration modes, provider status outputs, provider
  queue metadata, and provider capability requirements.
- Replaced the required TopDeck adapter test scaffold with Square inventory
  adapter coverage to match the current POS/inventory direction.

### Removed

- Removed TopDeck provider classes, event push adapters/planners, provider
  fixtures, active provider docs, credential/settings references, provider
  queue metadata, provider sync table planning, and provider-specific unit
  tests from the active codebase.

### Not Added

- No production live inventory route registration, production inventory
  database writes,
  WooCommerce product projection, barcode label printing, Square/POS inventory
  writes, Square network calls, payment capture, external tournament-provider
  calls, or production provider calls were added.

## [0.155.0] - 2026-06-07

### Fixed

- Aligned offline/POS payment PHP files with the WordPress Coding Standards
  rules used by GitHub Actions.
- Kept offline push existing-operation-row route reads reported as deferred
  during default WordPress activation, even when WordPress provides a database
  object for lower-level readiness checks.
- Kept offline push canonical mutation SQL planning reported as unconfigured
  for route-connected handlers until route execution is explicitly enabled.

### Changed

- Removed TopDeck from the active project scope, staging checklist, deployment
  checklist, PR template, and event roadmap while retaining legacy scaffold as
  disabled historical code.
- Reframed POS/payment work so the official WooCommerce Square extension owns
  Square payment authorization, capture, refund execution, tokenization, and
  gateway UI, while this plugin observes WooCommerce payment lifecycle events
  and reconciles exact serialized inventory.
- Added ScryDex credential-handling guidance requiring environment/deployment
  secrets or WordPress settings only, with local and CI tests staying
  mock-backed.

### Removed

- TopDeck credential fields from active WordPress settings sanitization and
  the admin settings page.
- Default TopDeck registration queueing from local event registration planning.
- Active offline event reservation policy now keeps the compatibility
  `queueTopDeck` field false instead of planning provider pushes.
- TopDeck adapter checks from active PR/staging/deployment requirements.

### Not Added

- No custom Square payment gateway, live Square/POS network calls, production
  payment capture, provider inventory writes, TopDeck credentials, TopDeck
  worker execution, or production ScryDex credentials were added.

## [0.154.0] - 2026-06-07

### Added

- POS/payment dependency health metadata for route-connected read deferral and
  read-ready state.
- Admin status summary rendering for route, read, and write gate states from
  dependency payloads instead of static text.
- Unit coverage for default and fully injected dependency payloads proving read
  execution remains deferred.

### Not Added

- Default POS/payment route registration, default route-connected fee snapshot
  reads, fee-snapshot writes, webhook processing, Square/POS network calls,
  production payment capture, provider inventory writes, POS reconciliation
  services, WooCommerce gateway capture, and production provider credentials
  remain disabled.

## [0.153.0] - 2026-06-07

### Added

- POS/payment route-connected read deferral metadata in route contracts,
  registration plans, readiness plans, and bootstrap summaries.
- Registration and readiness gates that block future GET routes while
  route-connected reads remain deferred.
- Unit coverage proving future fee snapshot GET routes stay blocked until read
  execution is explicitly cleared, then can register with injected handlers and
  permissions.

### Not Added

- Default POS/payment route registration, default route-connected fee snapshot
  reads, fee-snapshot writes, webhook processing, Square/POS network calls,
  production payment capture, provider inventory writes, POS reconciliation
  services, WooCommerce gateway capture, and production provider credentials
  remain disabled.

## [0.152.0] - 2026-06-07

### Added

- Staged POS/payment fee snapshot route handler factory with explicit
  route-connected read enablement, database/table-prefix readiness, and
  dependency-issue metadata.
- POS/payment dependency factory composition for an explicitly provided fee
  snapshot handler factory, allowing repository-backed read tests while
  default callbacks remain parser-only.
- Unit coverage for default factory deferral, enabled repository-backed handler
  composition, dependency issue reporting, dependency-factory injection, and
  admin status metadata.

### Not Added

- Default POS/payment route registration, default route-connected fee snapshot
  reads, fee-snapshot writes, webhook processing, Square/POS network calls,
  production payment capture, provider inventory writes, POS reconciliation
  services, WooCommerce gateway capture, and production provider credentials
  remain disabled.

## [0.151.0] - 2026-06-07

### Added

- Explicit staged POS/payment fee snapshot route handler for repository-backed
  read tests.
- Unit coverage for successful handler reads, invalid query rejection before
  repository calls, and repository failure rejection.

### Not Added

- Default POS/payment route registration, default route-connected fee snapshot
  reads, fee-snapshot writes, webhook processing, Square/POS network calls,
  production payment capture, provider inventory writes, POS reconciliation
  services, WooCommerce gateway capture, and production provider credentials
  remain disabled.

## [0.150.0] - 2026-06-07

### Added

- POS/payment fee snapshot repository readiness metadata in parser-only route
  validation responses and dependency health/admin status.
- Unit coverage proving an injected fee snapshot repository adapter is
  reported as staged while default route validation does not call `$wpdb`.

### Not Added

- Live POS/payment route registration, route-connected fee snapshot reads,
  fee-snapshot writes, webhook processing, Square/POS network calls,
  production payment capture, provider inventory writes, POS reconciliation
  services, WooCommerce gateway capture, and production provider credentials
  remain disabled.

## [0.149.0] - 2026-06-07

### Added

- Explicit POS/payment fee snapshot repository adapter for staged `$wpdb`
  read tests.
- Fee snapshot row normalization, table-prefix mismatch protection, database
  failure auditing, and malformed-row rejection.
- Unit coverage for successful prepared fee snapshot reads, invalid plans,
  prefix mismatches, database failures, and malformed rows.

### Not Added

- Live POS/payment route registration, route-connected fee snapshot reads,
  fee-snapshot writes, webhook processing, Square/POS network calls,
  production payment capture, provider inventory writes, POS reconciliation
  services, WooCommerce gateway capture, and production provider credentials
  remain disabled.

## [0.148.0] - 2026-06-07

### Added

- POS/payment fee snapshot SQL-template builder and build-plan metadata for
  future admin review reads.
- Parser-only fee snapshot list route metadata now reports SQL readiness and
  prepare-argument counts while keeping database reads deferred.
- Unit coverage for filtered, unfiltered, invalid, and tampered fee snapshot
  SQL-template planning.

### Not Added

- Live POS/payment route registration, fee snapshot repository execution,
  fee-snapshot writes, webhook processing, Square/POS network calls,
  production payment capture, provider inventory writes, POS reconciliation
  services, WooCommerce gateway capture, and production provider credentials
  remain disabled.

## [0.147.0] - 2026-06-07

### Added

- Staged POS/payment fee snapshot query planning for future admin review reads,
  including normalized provider, channel, currency, effective-date, and
  page-size filters.
- Parser-only fee snapshot list route metadata now reports a safe query
  contract while keeping read execution deferred.
- Unit coverage for accepted and rejected fee snapshot query plans plus route
  validation metadata.

### Not Added

- Live POS/payment route registration, fee snapshot read execution,
  fee-snapshot writes, webhook processing, Square/POS network calls,
  production payment capture, provider inventory writes, POS reconciliation
  services, WooCommerce gateway capture, and production provider credentials
  remain disabled.

## [0.146.0] - 2026-06-07

### Added

- WordPress POS/payment bootstrap wiring now uses
  `PosPaymentRouteDependencyFactory()->bootstrapper()` so future staged route
  registration checks share the parser-only controller and permission factory.
- Unit coverage proving the dependency-backed bootstrapper can register a
  future explicitly enabled read route in tests while default route contracts
  still register zero routes.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.145.0] - 2026-06-07

### Added

- Parser-only POS/payment route validation handler factory covering POS event
  ingestion/status, reconciliation run, conflict list/resolution, provider
  webhook, and payment fee snapshot callbacks.
- Default POS/payment route dependency assembly now uses the parser-only
  handlers so controller callbacks are staged while route registration and
  route-connected writes remain deferred.
- Unit and WordPress smoke coverage for staged parser-only handlers, request
  validation, deferred log writes, deferred reconciliation/conflict writes,
  and default dependency readiness.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.144.0] - 2026-06-07

### Added

- POS/payment route dependency factory for assembling staged controller,
  permission callback, registration planner, registrar, and bootstrapper
  dependencies.
- POS/payment route dependency status presenter plus authenticated health and
  admin System Status reporting for controller handlers, capability callbacks,
  webhook verifier, registrar, bootstrapper, route deferral, and write
  deferral state.
- Unit and WordPress smoke coverage proving POS/payment dependencies remain
  blocked by default while route registration and route-connected writes stay
  deferred.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.143.0] - 2026-06-07

### Added

- POS/payment route bootstrapper orchestration wired to WordPress
  `rest_api_init` after the offline bootstrapper.
- Unit coverage proving disabled feature gates, gated current plans,
  future-ready route plans, and feature-blocked future plans do not call the
  registrar unless bootstrap status is ready.
- WordPress smoke coverage proving the POS/payment route bootstrapper hook is
  registered while default POS/payment REST routes remain absent.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.142.0] - 2026-06-06

### Added

- POS/payment route bootstrap planner and status presenter for
  blocked/gated/ready route-registration orchestration diagnostics.
- Authenticated health payload and admin System Status row for POS/payment
  route bootstrap status, including planned/registerable route counts,
  registerable route keys, registration deferral, and bootstrap block reasons.
- Unit and WordPress smoke coverage proving POS/payment route bootstrap stays
  blocked by default with zero registerable routes.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.141.0] - 2026-06-06

### Added

- Guarded POS/payment route registrar that consumes enabled registration plans
  and calls WordPress REST route registration only for future routes that pass
  planner gates.
- Unit coverage proving default POS/payment routes remain unregistered,
  future read routes can register only when ready, live-flagged routes without
  permission/controller callbacks stay blocked, write routes respect
  route-connected write deferral, and webhook routes require signature and
  webhook-registration gates.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.140.0] - 2026-06-06

### Added

- POS/payment route registration planner for planned webhook, event ingestion,
  reconciliation, conflict, and fee-snapshot REST route contracts.
- Planned registration args with namespace, path, method, controller callback,
  permission callback, workflow, deferral flags, readiness flags, and stable
  block reasons.
- Safety checks requiring route-registration deferral to be cleared before any
  future route can register, route-connected write deferral to be cleared
  before future write routes can register, and webhook-registration deferral to
  be cleared before future provider webhook routes can register.
- Unit coverage for default-locked routes, capability/webhook permission
  readiness, injected controller handler readiness, future read/write/webhook
  route enablement gates, and public permission-bypass prevention.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.139.0] - 2026-06-06

### Added

- POS/payment fail-closed controller scaffold exposing every planned route
  callback for future event ingestion/status, reconciliation, conflict,
  webhook, and fee-snapshot handlers.
- Disabled default response metadata for route registration, route-connected
  writes, transaction execution, webhook registration, provider capture,
  provider inventory writes, and WooCommerce gateway capture.
- POS/payment route readiness metadata for injected controller handler counts
  and handler route keys.
- Unit coverage for disabled controller callbacks, injected handler dispatch,
  normalized request data, and handler readiness.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.138.0] - 2026-06-06

### Added

- POS/payment fail-closed permission callback adapters and factory for
  capability-based staff/admin routes and signed provider webhook routes.
- Manager/system-only `manage_pos` capability, with role-version upgrade to add
  the capability to existing manager/admin/shop-manager installs while keeping
  staff roles excluded.
- POS/payment route readiness metadata for injected permission callback counts,
  callback keys, and webhook verifier readiness.
- Unit and WordPress smoke coverage for POS/payment capabilities, callback
  authorization, webhook verifier failures, and fail-closed defaults.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.137.0] - 2026-06-06

### Added

- POS/payment route readiness planner and status presenter for the planned
  webhook, event ingestion, reconciliation, conflict, and fee-snapshot routes.
- Health and admin System Status diagnostics for POS/payment route readiness,
  including feature gating, planned/registerable route counts, route-handler
  readiness, permission-callback readiness, transaction executor readiness,
  webhook verifier readiness, and production safety deferrals.
- Unit and WordPress smoke coverage proving POS/payment routes remain
  unregistered by default while readiness metadata is visible for staging.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.136.0] - 2026-06-06

### Added

- Planned POS/payment REST route contracts for POS event ingestion/status,
  reconciliation runs, conflict review/resolution, provider webhooks, and
  payment fee snapshots.
- Route contract metadata for workflow labels, planned permissions,
  disabled-by-default route registration, transaction deferral, route-connected
  write deferral, provider capture deferral, provider inventory deferral,
  webhook registration deferral, and WooCommerce gateway capture deferral.
- Unit coverage for disabled-by-default POS/payment routes, expected
  permissions, route/provider/capture deferrals, and unique workflow labels.

### Not Added

- Live POS/payment route registration, webhook processing, Square/POS network
  calls, production payment capture, provider inventory writes, POS
  reconciliation services, WooCommerce gateway capture, and production provider
  credentials remain disabled.

## [0.135.0] - 2026-06-06

### Added

- Staged POS/payment transaction executor and result contract for wrapping
  preflight-approved `tcg_pos_sync_log` and `tcg_payment_provider_log` writes
  in explicit begin/commit/rollback handling.
- Transaction execution audit metadata for committed, rejected, and rolled-back
  outcomes, transaction commands, repository affected rows, idempotency keys,
  and provider/capture/route deferral flags.
- Unit coverage for successful commit, blocked preflight rejection before
  transaction start, transaction begin failure, repository failure rollback,
  and commit failure rollback.

### Not Added

- Route-connected POS/payment writes, Square/POS network calls, production
  payment capture, provider inventory writes, payment webhook route
  registration, WooCommerce gateway capture, and POS reconciliation service
  wiring remain disabled.

## [0.134.0] - 2026-06-06

### Added

- Explicit POS/payment log execution repository and result contract for
  preflight-approved `tcg_pos_sync_log` and `tcg_payment_provider_log` insert
  templates through `$wpdb`.
- Execution safeguards for invalid query plans, blocked/rejected preflights,
  table-prefix mismatches, failed inserts, invalid affected-row counts, partial
  affected-row summaries, idempotency key summaries, and audit metadata.
- Unit coverage for successful prepared inserts, blocked preflight rejection,
  invalid query-plan rejection, table-prefix mismatch rejection, and failed
  payment insert partial counts.

### Not Added

- Route-connected POS/payment writes, Square/POS network calls, production
  payment capture, provider inventory writes, payment webhook route
  registration, WooCommerce gateway capture, and POS reconciliation service
  wiring remain disabled.

## [0.133.0] - 2026-06-06

### Added

- POS/payment log transaction preflight and result contract for staged POS sync
  and payment provider log inserts after repository staging and execution-gate
  evaluation.
- Preflight metadata for ready/blocked/rejected status, inherited execution
  gate blocks, unsupported query-kind blocking, log counts, idempotency keys,
  zero affected rows, and deferred transaction flags.
- Unit coverage for inherited default execution blocks, explicitly ready
  supported inserts, unsupported query-kind blocking, and rejected repository
  staging.

### Not Added

- Live POS/payment transaction execution, `$wpdb` inserts, Square/POS network
  calls, production payment capture, provider inventory writes, payment webhook
  route registration, WooCommerce gateway capture, and route-connected
  POS/payment write services remain disabled.

## [0.132.0] - 2026-06-06

### Added

- POS/payment log repository staging adapter and result contract for deferred
  `tcg_pos_sync_log` and `tcg_payment_provider_log` insert plans, idempotency
  key summaries, prepare-argument counts, zero affected rows, and audit
  metadata.
- POS/payment log repository execution gate and result contract for
  blocked/ready/rejected status, explicit execution requirements, transaction
  adapter deferral, no-query blocking, and failed staging rejection.
- Unit coverage for accepted repository staging, empty valid plans, invalid
  query-plan rejection, default blocked gates, explicitly ready gates, empty
  gate blocking, and failed staging rejection.

### Not Added

- Live POS/payment repository execution, `$wpdb` inserts, Square/POS network
  calls, production payment capture, provider inventory writes, payment webhook
  route registration, WooCommerce gateway capture, and route-connected
  POS/payment write services remain disabled.

## [0.131.0] - 2026-06-06

### Added

- POS/payment log SQL-template builder for validated `tcg_pos_sync_log` and
  `tcg_payment_provider_log` insert rows, prepare-argument counts, and deferred
  execution metadata.
- Unit coverage for accepted sale templates, conflict summary templates,
  tampered row rejection, bad table prefixes, failed source plans, JSON
  validation, timestamp validation, and idempotency key validation.

### Not Added

- POS/payment repository execution, live Square/POS network calls, production
  payment capture, provider inventory writes, payment webhook route
  registration, WooCommerce gateway capture, and POS reconciliation write
  services remain disabled.

## [0.130.0] - 2026-06-06

### Added

- POS/payment log payload planner for redacted payment provider operation rows,
  per-line POS reconciliation rows, conflict/replay summary rows,
  deterministic idempotency keys, and audit metadata.
- Unit coverage for accepted sandbox sales, unmapped-line conflicts,
  duplicate-event replay summaries, raw payload redaction, and missing required
  field failures.

### Not Added

- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, and POS reconciliation write services remain disabled.

## [0.129.0] - 2026-06-06

### Added

- POS/payment adapter schema migration `0009_pos-payments` with reversible
  tables for POS sync logs, payment provider logs, and effective-dated fee
  snapshots.
- Migration runner planning for database target `9` and rollback from the new
  POS/payment schema boundary.
- Unit and WordPress smoke coverage for the new POS/payment tables, indexes,
  dbDelta compatibility, database target, and rollback order.

### Not Added

- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, and POS reconciliation write services remain disabled.

## [0.128.0] - 2026-06-06

### Added

- POS transaction-ingestion contract for sandbox adapter events, provider event
  idempotency, replay detection, sale/refund routing, and deferred route-write
  metadata.
- POS fee-estimate comparison helper that uses explicit effective-dated config
  fixtures and reports that no hardcoded provider rates were used.
- Sandbox POS event and fee fixtures plus Node coverage for scan-gated sale
  ingestion, refund ingestion, duplicate-event replay, unmapped-line conflicts,
  invalid event rejection, and fee comparison.

### Not Added

- Live Square/POS network calls, production payment capture, provider
  inventory writes, webhook route registration, WooCommerce gateway capture,
  and stored POS reconciliation logs remain disabled.

## [0.127.0] - 2026-06-06

### Added

- Canonical mutation transaction preflight contracts after repository staging
  and execution-gate evaluation.
- Route response, route meta, audit, sync readiness, admin summary, and smoke
  metadata for preflight status, ready/blocked counts, operation IDs, block
  reasons, and transaction execution deferral.
- Unit coverage for default-gated preflight, explicit inventory-ready
  preflight, deferred event/credit write plans, and rejected staging.

### Not Added

- Canonical transaction execution, event registration write plans,
  customer-credit ledger write plans, TopDeck workers, queue replay workers,
  default route execution, live route registration, and production
  route-connected writes remain deferred.

## [0.126.0] - 2026-06-06

### Added

- Canonical mutation repository execution gate for staged offline push
  mutation results.
- Route response, route meta, audit, sync readiness, admin summary, and smoke
  metadata for canonical repository execution status, block reasons, ready
  state, execution deferral, and transaction-adapter deferral.
- Unit coverage for default blocked, explicit ready, empty-plan blocked, and
  rejected-staging execution gate outcomes.

### Not Added

- Canonical mutation repository writes, inventory writes, event registration
  writes, customer-credit ledger writes, TopDeck workers, queue replay workers,
  default route execution, live route registration, and production
  route-connected writes remain deferred.

## [0.125.0] - 2026-06-06

### Added

- Route-connected canonical mutation repository staging metadata for explicitly
  enabled offline push route responses, route meta, and audits.
- Fresh and replayed staged push metadata for repository status, query counts,
  operation IDs, prepare-argument counts, zero affected rows, and deferred
  execution flags.
- Route factory, sync readiness, WordPress smoke, and unit coverage for
  canonical repository staging metadata.

### Not Added

- Canonical mutation repository execution, inventory writes, event registration
  writes, customer-credit ledger writes, TopDeck workers, queue replay workers,
  default route execution, live route registration, and production
  route-connected writes remain deferred.

## [0.124.0] - 2026-06-06

### Added

- Deferred canonical mutation repository scaffold and result contract for
  staged offline push canonical SQL plans.
- Repository audit metadata for canonical SQL query counts, operation IDs,
  prepare-argument counts, zero affected rows, and deferred execution flags.
- Health, admin System Status, WordPress smoke, and unit coverage for the
  canonical mutation repository contract.

### Not Added

- Canonical mutation repository execution, inventory writes, event registration
  writes, customer-credit ledger writes, TopDeck workers, queue replay workers,
  default route execution, live route registration, and production
  route-connected writes remain deferred.

## [0.123.0] - 2026-06-06

### Added

- Route-connected staged push responses now expose canonical mutation SQL
  planning counts, operation IDs, prepare-argument counts, and deferred
  execution/repository flags.
- Replay-aware SQL planning metadata so duplicate-push replay responses report
  zero canonical SQL templates while still proving SQL planning ran.
- Sync readiness propagation for route-connected canonical SQL planning versus
  default-gated handler wiring.
- Unit and WordPress smoke coverage for fresh and replayed route-connected
  canonical SQL metadata.

### Not Added

- Canonical mutation repository execution, event registration writes,
  customer-credit ledger writes, TopDeck workers, queue replay workers, default
  route execution, live route registration, and production route-connected
  writes remain deferred.

## [0.122.0] - 2026-06-06

### Added

- Staged canonical mutation SQL-template planning for accepted offline push
  mutation descriptors.
- Guarded inventory status update templates with row-version and
  available-status checks before future canonical writes.
- Event registration and customer-credit guard lookup templates while
  registration, ledger, and TopDeck writes remain deferred.
- Health, admin System Status, WordPress smoke, and unit coverage for staged
  canonical mutation SQL planner readiness.

### Not Added

- Canonical mutation repository execution, event registration writes,
  customer-credit ledger writes, TopDeck workers, queue replay workers, default
  route execution, live route registration, and production route-connected
  writes remain deferred.

## [0.121.0] - 2026-06-06

### Added

- Staged push route processing now runs the plan-only canonical mutation
  planner after persistence planning.
- Route response, route meta, and route audit metadata for canonical mutation
  counts, operation IDs, skipped operation IDs, and skip reasons.
- Replay-aware canonical mutation planning so duplicate-push replay rows are
  skipped before future canonical writes can be considered.
- Unit and smoke coverage for route-connected canonical mutation planning
  metadata and readiness flags.

### Not Added

- Canonical entity writes, queue replay workers, TopDeck workers, default route
  execution, live route registration, and production route-connected writes
  remain deferred.

## [0.120.0] - 2026-06-06

### Added

- Plan-only canonical mutation planner for accepted offline push operations.
- Deferred mutation descriptors for inventory reservations, event
  registrations, and customer credit redemptions.
- Skip metadata for conflict and rejected push operations.
- Health, admin System Status, WordPress smoke, and unit coverage for staged
  canonical mutation planner readiness.

### Not Added

- Canonical entity writes, queue replay workers, TopDeck workers, default route
  execution, live route registration, and production route-connected writes
  remain deferred.

## [0.119.0] - 2026-06-06

### Added

- Replay response hydration for staged duplicate offline push responses from
  stored queue rows.
- Per-result `persistence.response_source` metadata for resolution-plan versus
  existing-queue-row responses.
- Hydrated replay response counts and operation IDs in staged push response and
  audit payloads.
- Unit coverage for stored replay details and resolved timestamps in duplicate
  push responses.

### Not Added

- Queue replay workers, canonical entity mutations, default route execution,
  live route registration, and production route-connected writes remain
  deferred.

## [0.118.0] - 2026-06-06

### Added

- Per-operation persistence annotations for staged offline push route response
  results.
- Batch-level `operation_persistence_statuses` response map keyed by client
  operation ID.
- Unit coverage for inserted fresh operation responses and replayed duplicate
  operation responses.

### Not Added

- Queue replay workers, canonical entity mutations, default route execution,
  live route registration, and production route-connected writes remain
  deferred.

## [0.117.0] - 2026-06-06

### Added

- Offline push persistence planner audit metadata for operation insert IDs,
  operation replay IDs, and conflict insert IDs.
- `OfflinePushPersistenceRepositoryResult` helpers and audit fields for
  operation replay counts and replayed client operation IDs.
- Staged push route processing and response metadata for replay counts and
  replay operation IDs.
- Unit coverage for persistence replay metadata and duplicate-push route
  response metadata.

### Not Added

- Queue replay workers, canonical entity mutations, default route execution,
  live route registration, and production route-connected writes remain
  deferred.

## [0.116.0] - 2026-06-06

### Added

- `OfflinePushRouteExistingOperationRowsProvider` for adapting authenticated
  push route context to repository-backed existing operation-row reads.
- Explicit push handler factory composition of the existing operation-row
  provider when route-connected execution is enabled for staged tests.
- Readiness metadata for staged existing operation-row route provider
  availability and route-read deferral.
- Unit coverage for successful provider reads, missing device context,
  repository rejection mapping, and duplicate push replay that performs zero
  new queue writes.

### Not Added

- Default route execution, live route registration, queue replay workers,
  canonical entity mutations, and production route-connected writes remain
  deferred.

## [0.115.0] - 2026-06-06

### Added

- `OfflinePushExistingOperationRowsRepository` and
  `OfflinePushExistingOperationRowsRepositoryResult` for explicitly executing
  staged existing operation-row lookup templates through `$wpdb`.
- Existing queue-row normalization for idempotent replay preparation, including
  offline device and device-public-ID checks, operation ID allowlisting,
  timestamp normalization, result-details JSON decoding, duplicate-row
  rejection, and count-only audit metadata.
- Sync handler health/admin and WordPress smoke readiness metadata for staged
  existing operation-row repository availability while route reads and queue
  replay remain deferred.
- Unit coverage for successful row loading, empty result sets, invalid query
  plans, database failures, malformed rows, duplicate rows, and repository
  audit payloads.

### Not Added

- Default route-connected existing-row reads, idempotent queue replay,
  canonical entity mutations, and live route registration remain deferred.

## [0.114.0] - 2026-06-06

### Added

- `OfflinePushExistingOperationRowsQueryPlanner` and
  `OfflinePushExistingOperationRowsQueryPlan` for translating validated offline
  push batches into allowlisted existing-operation row lookup contracts against
  `tcg_offline_sync_queue`.
- `OfflinePushExistingOperationRowsQueryBuilder` and
  `OfflinePushExistingOperationRowsQueryBuildPlan` for converting those
  contracts into prepared SQL templates keyed by offline device ID and client
  operation IDs.
- Sync handler health/admin and WordPress smoke readiness metadata for staged
  existing operation-row query planning, SQL template readiness, repository
  deferral, route-read deferral, queue replay deferral, and canonical mutation
  deferral.
- Unit coverage for accepted lookup contracts, invalid device/table contexts,
  duplicate/invalid/mismatched operation IDs, prepared SQL shape, rejected
  plans, and tampered contract rejection.

### Not Added

- Existing operation-row query execution, repository-backed route reads,
  idempotent queue replay, canonical entity mutations, and live route
  registration remain deferred.

## [0.113.0] - 2026-06-06

### Added

- `OfflinePushRouteOperationOptionsProvider` for normalizing route payload
  operation options before offline push batch resolution.
- Event reservation payment status normalization from `paymentStatus` or
  `payment_status`, with explicit support for `not_required`, `pay_at_store`,
  `pending_online`, `paid`, and `refunded`.
- Push handler factory readiness metadata for staged operation-options provider
  availability, nested provider audits, and route option deferral.
- Sync handler health/admin and WordPress smoke readiness metadata for staged
  push operation-options provider availability and deferral.
- Unit coverage for route operation-options normalization, invalid or unsupported
  payment status rejection, non-event operation skipping, and staged push handler
  event decisions that keep pay-at-store TopDeck queueing disabled.

### Not Added

- Default route-connected execution remains disabled. Route registration,
  queue replay, canonical entity mutations, TopDeck queue workers, and
  route-connected database writes remain deferred.

## [0.112.0] - 2026-06-06

### Added

- `OfflinePushRouteServerSnapshotProvider` for adapting authenticated
  registered-device context into repository-backed server snapshot reads for
  explicitly enabled staged push handlers.
- Context handoff from `OfflinePushRoutePersistenceProvider` to provider
  callables, including the authenticated device row and server timestamp.
- Push handler factory readiness metadata for repository-backed snapshot
  provider availability, route snapshot-read readiness, and snapshot-read
  deferral.
- Sync handler health/admin and WordPress smoke readiness metadata for staged
  push snapshot route provider availability and deferral.
- Unit coverage for direct route snapshot provider loading/rejection and
  route-handler factory composition using repository-backed snapshots.

### Not Added

- Default route-connected snapshot reads remain disabled. Route registration,
  queue replay, canonical entity mutations, and route-connected database
  writes remain deferred.

## [0.111.0] - 2026-06-06

### Added

- `OfflinePushServerSnapshotRepository` and
  `OfflinePushServerSnapshotRepositoryResult` for explicitly executing staged
  push snapshot lookup templates through `$wpdb`.
- Snapshot normalization for inventory, event, and customer-credit rows into
  resolver-ready server snapshot payloads, including event seats remaining and
  customer-credit minor-unit balance derivation.
- Health/admin and WordPress smoke readiness metadata for staged push snapshot
  repository availability and explicit repository execution deferral.
- Unit coverage for successful snapshot loading, invalid query-plan rejection,
  missing snapshot rows, malformed row rejection, repository audit payloads, and
  resolver-compatible snapshot keys.

### Not Added

- Default route-connected snapshot reads remain disabled. Route registration,
  queue replay, canonical entity mutations, and route-connected database
  writes remain deferred.

## [0.110.0] - 2026-06-06

### Added

- `OfflinePushServerSnapshotQueryPlanner` and
  `OfflinePushServerSnapshotQueryPlan` for translating parsed offline push
  operations into allowlisted server snapshot lookup contracts.
- `OfflinePushServerSnapshotQueryBuilder` and
  `OfflinePushServerSnapshotQueryBuildPlan` for converting those contracts into
  prepared SQL templates against inventory, event, and customer credit tables.
- Health/admin and WordPress smoke readiness metadata for push snapshot query
  planning, SQL template readiness, execution deferral, repository deferral,
  and route-read deferral.
- Unit coverage for supported operation snapshot planning, invalid context
  rejection, unsupported/tampered operations, prepared SQL templates, and
  tampered snapshot contracts.

### Not Added

- No snapshot query execution or repository-backed snapshot loading is enabled.
  Default push route execution, route registration, queue replay, canonical
  entity mutations, and route-connected database reads/writes remain disabled.

## [0.109.0] - 2026-06-06

### Added

- `OfflinePushRouteHandler`, `OfflinePushRoutePersistenceProvider`,
  `OfflinePushRouteProcessingResult`, and `OfflinePushRouteHandlerFactory` for
  staged route-aware push processing when explicitly enabled in tests.
- Optional push handler/factory injection in
  `OfflineRegisteredDeviceSyncRouteHandlerFactory`, preserving the existing
  default validation-only push callback behavior.
- Health/admin and WordPress smoke readiness metadata for push route handler
  readiness, push persistence-provider readiness, dependency factory status,
  route execution enablement, queue/conflict write deferral, and route
  dependency issues.
- Unit coverage for default route-connected push deferral, explicitly enabled
  registered-device authorization plus queue persistence, and sync factory
  injection of the composed push route handler.

### Not Added

- No default live offline push route execution is enabled. Route registration,
  queue replay, canonical entity mutations, production queue/conflict writes,
  and default route-connected database writes remain disabled unless staging
  tests explicitly inject dependencies and enable the factory path.

## [0.108.0] - 2026-06-06

### Added

- `OfflinePushPersistenceQueryBuilder` and
  `OfflinePushPersistenceQueryBuildPlan` for converting accepted offline push
  queue/conflict persistence rows into prepared SQL insert templates against
  the existing offline sync schema.
- `OfflinePushPersistenceRepository` and
  `OfflinePushPersistenceRepositoryResult` for explicitly executing those
  prepared queue and conflict inserts through `$wpdb` in staged tests.
- Health/admin and WordPress smoke readiness metadata for push persistence
  planning, SQL templates, repository availability, queue persistence deferral,
  conflict persistence deferral, queue replay deferral, and canonical mutation
  deferral.
- Unit coverage for queue/conflict SQL templates, replay-only plans, tampered
  rows, invalid table prefixes, explicit repository inserts, database failures,
  and invalid affected-row results.

### Not Added

- No default live offline push route execution is enabled. Queue persistence,
  queue replay, conflict persistence, canonical entity mutations, route
  registration, and route-connected database writes remain disabled unless a
  staging test explicitly invokes the repository.

## [0.107.0] - 2026-06-06

### Added

- `OfflinePullRouteHandlerFactory` for staged composition of route-aware pull
  change-set and cursor-advance providers from explicit `$wpdb` dependencies.
- Optional pull handler factory injection in
  `OfflineRegisteredDeviceSyncRouteHandlerFactory`, preserving the existing
  explicit handler override.
- Health/admin and WordPress smoke readiness metadata for pull handler route
  dependency readiness, route execution enablement, database availability, and
  route cursor-write deferral.
- Unit coverage for the default deferred factory path, explicitly enabled
  route-aware handler composition, and sync factory injection of that composed
  handler.

### Not Added

- No default live offline route execution is enabled. Route dependency injection,
  route-connected reads, cursor writes, route registration, tombstone repository
  reads, queue replay, and canonical route-connected mutations remain disabled
  unless a staging test explicitly injects and enables the factory path.

## [0.106.0] - 2026-06-06

### Added

- Opt-in `OfflinePullRouteHandler` cursor advancement orchestration through an
  explicitly injected cursor advance provider.
- Ready-response metadata for cursor advancement attempts, status, rows
  affected, repository audit payloads, and default route execution deferral.
- Fail-closed handler responses for rejected cursor advancement results,
  invalid cursor provider return types, and cursor provider exceptions.
- Health/admin and WordPress smoke readiness metadata for staged handler cursor
  advancement support while default execution remains deferred.
- Unit coverage for default cursor deferral, successful explicit cursor
  advancement, rejected cursor results, invalid provider returns, and readiness
  metadata.

### Not Added

- No default live offline route cursor execution is enabled. Default
  route-connected reads, tombstone repository reads, queue replay, route
  registration, and route-connected database mutation remain disabled.

## [0.105.0] - 2026-06-06

### Added

- `OfflinePullRouteCursorAdvanceProvider` for explicitly injected route
  orchestration that resolves registered-device headers, plans cursor rows, and
  invokes the cursor advance repository.
- Provider readiness metadata for route-aware cursor advancement while default
  route execution and route-connected writes remain deferred.
- Health/admin and WordPress smoke readiness metadata for staged route cursor
  provider availability.
- Unit coverage for successful route-aware cursor advancement, missing
  authorization rejection before cursor writes, and missing change-set
  rejection after device context resolution.

### Not Added

- No default live offline route cursor execution is enabled. Default
  route-connected reads, tombstone repository reads, queue replay, route
  registration, and route-connected database mutation remain disabled.

## [0.104.0] - 2026-06-06

### Added

- `OfflinePullCursorAdvanceRepository` and
  `OfflinePullCursorAdvanceRepositoryResult` for explicitly executing prepared
  cursor upsert plans through `$wpdb`.
- Repository audit metadata for cursor query counts, rows affected, per-domain
  execution results, explicit execution requirements, and default route
  deferral.
- Health/admin and WordPress smoke readiness metadata for staged cursor
  repository availability.
- Unit coverage for successful cursor upserts, empty plans, invalid plans before
  writes, database failures, and invalid affected-row results.

### Not Added

- No default live offline route cursor execution is enabled. Default
  route-connected reads, tombstone repository reads, queue replay, route
  registration, and route-connected database mutation remain disabled.

## [0.103.0] - 2026-06-06

### Added

- `OfflinePullCursorAdvanceQueryBuilder` and
  `OfflinePullCursorAdvanceQueryBuildPlan` for converting accepted cursor
  advancement rows into prepared upsert templates.
- SQL-build validation for cursor table names, device IDs, domains, nullable
  cursors, UTC timestamps, row counts, and row-version metadata.
- Health/admin and WordPress smoke readiness metadata for staged cursor SQL
  planning, with cursor execution still explicitly deferred.
- Unit coverage for prepared cursor upsert templates, null cursors, empty valid
  plans, invalid source plans, tampered cursor rows, and invalid table names.

### Not Added

- No cursor database writes are enabled. Cursor upserts, default route-connected
  reads, tombstone repository reads, queue replay, route registration, and
  route-connected database mutation remain disabled.

## [0.102.0] - 2026-06-06

### Added

- `OfflinePullCursorAdvancePlanner` and `OfflinePullCursorAdvancePlan` for
  validating trusted pull context and provider change sets before future cursor
  checkpoint writes.
- Plan-only cursor rows for complete pull pages, including device IDs, domain,
  nullable cursor value, UTC server time, row counts, and deferred-write flags.
- Health/admin and WordPress smoke readiness metadata for staged cursor
  advancement planning.
- Unit coverage for complete-page cursor rows, nullable cursors, invalid
  context/time/cursor rejection, malformed change sets, and missing domains.

### Not Added

- No cursor database writes are enabled. Cursor upserts, default route-connected
  reads, tombstone repository reads, queue replay, route registration, and
  route-connected database mutation remain disabled.

## [0.101.0] - 2026-06-06

### Added

- `OfflinePullRouteChangeSetProvider`, a route-aware provider adapter for
  explicitly injected pull handlers that resolves registered-device headers,
  validates pull device context, and fetches provider change sets.
- Handler support for data-aware change-set providers that need normalized REST
  request headers in addition to the parsed pull request.
- Health/admin and WordPress smoke readiness metadata for the staged route-aware
  pull provider while default route-connected reads remain deferred.
- Unit coverage proving authorized header resolution fetches change sets, missing
  authorization stops before database reads, mismatched context fails closed, and
  session writes/cursor advancement remain deferred.

### Not Added

- No default live offline route wiring is enabled. Default route-connected
  reads, cursor advancement, tombstone repository reads, queue replay, route
  registration, and route-connected database mutation remain disabled.

## [0.100.0] - 2026-06-06

### Added

- `OfflinePullDeviceContextPlanner` and `OfflinePullDeviceContextPlan` for
  transforming authorized registered-device permission resolutions into
  pull-provider context.
- Validation that the trusted registered-device context is authorized, scoped
  to `offline_pull`, matches the request device ID, carries a positive
  `offline_device_id`, and uses a safe table prefix.
- Unit coverage proving accepted context, denied resolution rejection,
  device/scope/prefix rejection, and provider construction from context.
- Health/admin and WordPress smoke coverage for staged pull device-context
  readiness and route deferral metadata.

### Not Added

- No default live offline route wiring is enabled. Route-connected context
  handoff, pull execution, cursor advancement, tombstone repository reads,
  queue replay, route registration, and route-connected database mutation
  remain disabled.

## [0.99.0] - 2026-06-06

### Added

- `OfflinePullChangeSetProvider`, an explicit provider boundary that composes
  a validated pull request, registered-device context, pull query planning, and
  repository fetches.
- Provider readiness metadata for explicit device context, table-prefix
  validation, planner/repository availability, and route/cursor/tombstone
  deferral flags.
- Unit coverage proving provider fetches normalize repository change sets,
  invalid provider context fails before reads, injected pull-handler providers
  can return data, and rejected providers fail closed.
- Health/admin and WordPress smoke coverage for staged provider readiness.

### Not Added

- No default live offline route wiring is enabled. Route-connected pull
  execution, cursor advancement, tombstone repository reads, queue replay,
  route registration, and route-connected database mutation remain disabled.

## [0.98.0] - 2026-06-06

### Added

- An explicitly called offline pull change repository adapter that executes
  accepted prepared SQL plans through `$wpdb` without wiring the live pull
  route.
- Pull change repository result/audit metadata with fetched/rejected states,
  row/domain counts, query audit nesting, and deferred cursor/tombstone flags.
- Row normalization for repository-backed pull data, including entity IDs,
  row versions, UTC timestamps, allowlisted payload fields, and fail-closed
  malformed-row errors.
- Health, admin, unit, and WordPress smoke coverage for staged repository
  readiness and route deferral.

### Not Added

- No live offline route is enabled. Route-connected pull execution, cursor
  advancement, tombstone repository reads, queue replay, route registration,
  and route-connected database mutation remain disabled.

## [0.97.0] - 2026-06-06

### Added

- Prepared SQL template planning for offline pull change queries across
  branding, inventory, customer credit, events, and conflicts domains.
- A build-plan DTO that exposes per-domain SQL templates, prepared arguments,
  cursor carry-forward, and deferred execution/cursor/tombstone flags without
  executing database reads.
- Fail-closed unit coverage for tampered pull query contracts, selected
  columns, filters, cursors, page sizes, ordering, and invalid base plans.
- Health and admin readiness metadata for staged pull SQL template planning.

### Not Added

- No live offline route is enabled. Cursor filtering, pull query execution,
  tombstone repository reads, cursor advancement, queue replay, route
  registration, and route-connected database mutation remain disabled.

## [0.96.0] - 2026-06-06

### Added

- Health and admin System Status readiness metadata for staged offline pull
  change-query planning.
- A supported-domain contract on the offline pull query planner for branding,
  inventory, customer credit, events, and conflicts.
- Unit and WordPress smoke coverage proving pull query planning readiness is
  visible while execution and trusted device context handoff remain deferred.

### Not Added

- No live offline route is enabled. Trusted device context handoff, pull query
  execution, tombstone repository reads, cursor advancement, queue replay,
  route registration, and route-connected database mutation remain disabled.

## [0.95.0] - 2026-06-06

### Added

- Plan-only offline pull change-query contracts for branding, inventory,
  customer credit, events, and conflicts cache domains.
- Domain table/column allowlists, payload-field allowlists, cursor carry-forward
  metadata, page-size propagation, and device-scoped conflict filters for future
  pull repositories.
- Unit coverage proving domain contracts are planned without execution,
  conflict pulls are scoped to the registered device, and invalid table/device
  inputs or unsupported domains fail closed.

### Not Added

- No live offline route is enabled. Pull query execution, tombstone repository
  reads, cursor advancement, queue replay, route registration, and
  route-connected database mutation remain disabled.

## [0.94.0] - 2026-06-06

### Added

- Staged offline pull route handler that parses registered-device pull
  requests and returns the existing contract-shaped pull response envelope.
- Empty default pull change sets for each requested domain, with injected
  change-set and server-time providers available for future staging adapters.
- Readiness metadata now distinguishes `pull_response_ready` from route
  registration, write persistence, live pull queries, and cursor advancement.
- Unit coverage proving valid pull requests receive presenter-shaped
  responses, injected change sets are passed through, provider failures fail
  closed, and invalid requests do not call providers.

### Not Added

- No live offline route is enabled. Pull route registration, database change
  queries, tombstone repository reads, cursor advancement, queue replay,
  last-seen writes, and route-connected database mutation remain disabled.

## [0.93.0] - 2026-06-06

### Added

- Staged registered-device sync route handler factory that injects parser-only
  pull/push controller callbacks through the offline controller.
- Health and admin System Status readiness summaries for staged pull/push
  handlers, including handler counts, callback names, write-deferred state,
  and route-registration-deferred state.
- Route bootstrap planning now receives a controller with pull/push handlers,
  allowing registered-device permission and controller callbacks to report
  ready together while live routes remain disabled.
- Unit and WordPress smoke coverage proving pull/push handlers validate
  requests, keep writes deferred, and do not make routes registerable.

### Not Added

- No live offline route is enabled. Pull/push route registration, queue replay,
  pull queries, cursor advancement, last-seen route writes, and production
  database mutation remain disabled.

## [0.92.0] - 2026-06-06

### Added

- Staged registered-device permission resolver factory that can assemble the
  resolver from `$wpdb`, the registered-device repository adapter, and the
  session update repository.
- Health and admin System Status readiness summaries for registered-device
  pull/push permission planning, including dependency flags, route scope
  counts, and configuration issue fields.
- Route bootstrap planning now receives the staged registered-device resolver
  when database dependencies are available, allowing pull/push permission
  callbacks to report ready while controller callbacks and live routes remain
  locked.
- Unit and WordPress smoke coverage proving resolver assembly, provider
  fail-closed behavior, readiness presentation, and pull/push permission
  planning without live route registration.

### Not Added

- No live offline route is enabled. Pull/push route registration,
  route-connected queue replay, last-seen writes, and production database
  mutation remain disabled.

## [0.91.0] - 2026-06-06

### Added

- Staged offline device registration route-handler factory that can assemble
  the registration handler from `$wpdb`, the repository adapter, registration
  service, and settings-backed pairing authorizer.
- Handler readiness summaries for health/planner diagnostics, including
  database, repository, pairing policy, and configuration issue fields.
- Unit coverage proving configured staging dependencies make the controller
  callback ready while route registration stays disabled, incomplete policies
  keep the handler unavailable, and provider failures fail closed.

### Not Added

- No live offline route is enabled. Pairing route registration,
  route-connected device writes, queue replay, and production database mutation
  remain disabled.

## [0.90.0] - 2026-06-06

### Added

- Offline pairing policy readiness summaries for staged health and System
  Status review.
- Settings-backed pairing policies can now create staged permission callbacks
  only when hash, manager, location, scope, and expiry policy pieces are
  configured.
- Unit coverage proving configured settings make the staged pairing permission
  ready, incomplete settings keep it locked, and policy summaries avoid
  pairing-code leakage.

### Not Added

- No live offline route is enabled. Pairing route registration,
  route-connected device writes, queue replay, and production database mutation
  remain disabled.

## [0.89.0] - 2026-06-06

### Added

- Settings-backed offline pairing authorizer factory for future staged pairing
  route wiring.
- Factory helpers to build a plan-only pairing authorizer or permission
  callback from sanitized hash-only settings without opening live routes.
- Unit coverage proving settings-backed callbacks authorize valid policies,
  raw-pairing-code-only settings fail closed, and settings provider failures
  do not leak secrets.

### Not Added

- No live offline route is enabled. Pairing route registration,
  route-connected device writes, queue replay, and production database mutation
  remain disabled.

## [0.88.0] - 2026-06-06

### Added

- Hash-only offline pairing authorization settings for future staged policy
  wiring.
- Sanitization for SHA-256 pairing-code hash allowlists, manager/location
  allowlists, mode-specific scopes, and UTC expiry windows without accepting
  or retaining raw pairing codes.
- Unit coverage for policy defaults, sanitization, partial-update preservation,
  and secret-free pairing settings.

### Not Added

- No live offline route is enabled. Pairing route registration,
  route-connected device writes, queue replay, and production database mutation
  remain disabled.

## [0.87.0] - 2026-06-06

### Added

- Staged offline device registration route-handler mapping for pairing
  authorization denials.
- A distinct `offline_device_pairing_authorization_denied` response code for
  injected route-handler responses with status `403`.
- Unit coverage proving denied pairing policies skip credential issuance and
  repository writes through the controller boundary without leaking raw pairing
  codes.

### Not Added

- No live offline route is enabled. Pairing route registration,
  route-connected device writes, queue replay, and production database mutation
  remain disabled.

## [0.86.0] - 2026-06-06

### Added

- Optional pairing authorization enforcement inside offline device registration
  service orchestration.
- Service audit payload support for the staged pairing authorization outcome.
- Unit coverage proving authorized pairing can proceed to registration and
  denied pairing stops before credential issuance or repository writes.

### Not Added

- No live offline route is enabled. Pairing route registration,
  route-connected device writes, queue replay, and production database mutation
  remain disabled.

## [0.85.0] - 2026-06-06

### Added

- Plan-only offline device pairing authorizer for future staged pairing
  permission callbacks.
- Hashed pairing-code policy checks, manager and location allowlists,
  mode-specific requested-scope checks, UTC expiry enforcement, and injectable
  server time for tests.
- Unit coverage for authorized pairing policies, denied policies, missing
  configuration, adapter injection, and audit payloads without raw pairing
  codes or full hashes.

### Not Added

- No live offline route is enabled. Pairing route registration,
  route-connected device writes, queue replay, and production database mutation
  remain disabled.

## [0.84.0] - 2026-06-06

### Added

- Authenticated health payload reporting for staged offline device pairing route
  readiness.
- Admin System Status row for staged offline pairing route handler and
  permission readiness.
- Presenter and WordPress integration smoke coverage proving the default
  pairing route remains blocked, handlerless, permission-locked, and deferred.

### Not Added

- No live offline route is enabled. Pairing route registration,
  route-connected device writes, queue replay, and production database mutation
  remain disabled.

## [0.83.0] - 2026-06-06

### Added

- Staged offline device pairing route readiness planning for handler,
  permission, feature-gate, and disabled-route checks.
- A compact readiness summary proving the injected registration handler and
  configured pairing permission callback can be composed without registering
  live routes.
- Unit coverage for missing dependencies, configured-but-gated staging
  dependencies, and unconfigured pairing authorizers.

### Not Added

- No live offline route is enabled. Pairing route registration,
  route-connected device writes, queue replay, and production database mutation
  remain disabled.

## [0.82.0] - 2026-06-06

### Added

- Pairing permission authorizer-readiness checks for staged offline route
  planning.
- `OfflineDevicePairingPermissionCallbackAdapter::is_configured()` so factories
  can distinguish configured pairing permission callbacks from deny-only
  adapters.
- Unit coverage proving unconfigured pairing callbacks are not attached by the
  permission factory and planner readiness remains fail-closed.

### Not Added

- No live offline route is enabled. Pairing route registration,
  route-connected device writes, queue replay, and production database mutation
  remain disabled.

## [0.81.0] - 2026-06-06

### Added

- Pairing-only offline route permission factory setup for staged pairing route
  checks.
- Unit coverage proving pairing permission callbacks can be attached without a
  registered-device resolver while registered-device pull/push callbacks remain
  unavailable until that resolver is supplied.
- Planner coverage proving the pairing route can report permission readiness
  independently while pull/push permission callbacks stay fail-closed.

### Not Added

- No live offline route is enabled. Pairing route registration,
  registered-device pull/push permission wiring, queue replay, route-connected
  device writes, and production database mutation remain disabled.

## [0.80.0] - 2026-06-06

### Added

- Offline route handler-readiness enforcement for future staged route
  registration.
- `OfflineController::has_handler()` readiness checks so route plans require an
  explicitly injected controller handler before a callback can be marked ready.
- Unit coverage proving bare default controllers do not make future routes
  registerable, even when the route permission side is ready.

### Not Added

- No live offline route is enabled. Default controller callbacks, route
  registration, route-connected device writes, queue replay, and production
  database mutation remain disabled.

## [0.79.0] - 2026-06-06

### Added

- Opt-in offline device pairing permission callback adapter for future staged
  pairing route readiness.
- Parser-backed request validation, injected manager/pairing authorization,
  missing-authorizer denial, authorizer rejection handling, and secret-free
  pairing permission audit payloads.
- Optional permission callback factory attachment for the pairing route plus
  planner coverage proving readiness metadata can be tracked while the route
  remains disabled by default.

### Not Added

- No live offline pairing route is enabled. Default pairing permissions, route
  registration, production token issuance, queue replay, and production
  database mutation remain disabled.

## [0.78.0] - 2026-06-06

### Added

- Opt-in offline device registration route handler adapter for the
  `register_offline_device` controller callback.
- Injected handler response mapping for registered, invalid, and rejected
  service outcomes, including stable status codes, response codes, callback
  names, one-time device-token response payloads on successful registration,
  and validation/repository errors.
- Unit coverage proving injected controller dispatch, invalid payload
  short-circuiting without repository calls, repository rejection mapping, and
  retained audit redaction for raw device tokens and token hashes.

### Not Added

- No live offline pairing route is enabled. Default controller callbacks,
  route registration, production token issuance, queue replay, and production
  database mutation remain disabled.

## [0.77.0] - 2026-06-06

### Added

- Offline device registration service orchestration for future pairing flows.
- Service result object with registered, invalid, and rejected outcomes,
  stable status codes, one-time response payloads, validation/repository
  errors, and secret-free audit payloads.
- Unit coverage proving pairing validation, credential issuance, registration
  planning, explicit repository insertion, missing repository configuration,
  repository rejection, and audit redaction for raw device tokens and token
  hashes.

### Not Added

- No live offline pairing route is enabled. Route registration,
  route-connected database writes, production token issuance, queue replay, and
  production database mutation remain disabled.

## [0.76.0] - 2026-06-06

### Added

- Offline device registration credential issuer for future pairing flows.
- Issued credential value object carrying generated device IDs, one-time
  device tokens, SHA-256 token hashes, UTC issue/expiry timestamps, token TTL,
  and secret-free audit payloads.
- Unit coverage proving deterministic UUID/token generation with injected byte
  sources, default and custom TTL handling, token hashing, audit fingerprints,
  invalid TTL rejection, invalid issue-time rejection, and byte-generator length
  guards.

### Not Added

- No live offline pairing route is enabled. Production token issuance, route
  registration, route-connected database writes, queue replay, and production
  database mutation remain disabled.

## [0.75.0] - 2026-06-06

### Added

- Offline device registration repository adapter for future
  `tcg_offline_devices` writes.
- Repository result object for inserted and rejected registration outcomes,
  insert ID capture, one-time pairing response return, and secret-free audit
  payloads.
- Unit coverage proving valid registration plans execute prepared `$wpdb`
  inserts when explicitly called, invalid plans do not query, failed inserts
  are rejected, unexpected row counts fail closed, and audit payloads omit raw
  device tokens and token hashes.

### Not Added

- No live offline pairing route is enabled. Token issuance, route registration,
  route-connected database writes, queue replay, and production database
  mutation remain disabled.

## [0.74.0] - 2026-06-06

### Added

- Offline device registration insert query planner for future
  `tcg_offline_devices` writes.
- Prepared SQL template and argument planning for public IDs, location and
  manager IDs, token hashes, token expiry, scopes/capabilities JSON, app
  version, platform, active status, issued/created/updated timestamps, and row
  version.
- Validation for table prefixes, schema-length public IDs, active registration
  state, nullable session/revocation fields, supported device modes, Windows
  platform, semver app versions, UTC timestamps, token expiry windows, scopes,
  capabilities, and token hashes.
- Unit coverage proving malformed registration rows do not produce SQL and
  insert-query audit payloads do not expose token secrets.

### Not Added

- No live offline device row write is executed. Token issuance, route
  registration, registered-device permission callbacks, queue replay, and
  production database mutation remain disabled.

## [0.73.0] - 2026-06-06

### Added

- `registration_deferred` reporting in offline route bootstrap health/status
  payloads.
- Unit coverage proving blocked and gated bootstrap plans report deferred
  registration and future-ready plans do not.
- WordPress integration smoke coverage proving the offline route bootstrapper
  is registered on `rest_api_init`.
- WordPress integration smoke coverage proving authenticated health reports
  deferred offline route bootstrap state while offline pull/push routes remain
  unregistered by default.

### Not Added

- No current offline route is enabled for registration. Live route business
  handlers, queue replay workers, push/pull persistence, conflict mutation
  writes, and production database mutation remain disabled.

## [0.72.0] - 2026-06-06

### Added

- Offline route bootstrapper for WordPress `rest_api_init` wiring.
- Guarded bootstrap execution that consults the offline feature gate and
  route-readiness plan before calling the offline route registrar.
- Registration result summaries for bootstrap attempts, including registered
  route count, registered route keys, deferred status, and block reasons.
- Unit coverage for disabled, gated, future-ready, and feature-blocked
  bootstrapper execution.

### Not Added

- No current offline route is enabled for registration. Live route business
  handlers, queue replay workers, push/pull persistence, conflict mutation
  writes, and production database mutation remain disabled.

## [0.71.0] - 2026-06-06

### Added

- Offline route bootstrap status presenter for authenticated health output and
  admin System Status.
- Health payload status values for blocked, gated, and ready bootstrap states,
  while preserving route summaries and block reasons for staging inspection.
- Admin summary text for offline route bootstrap counts and block reasons.
- WordPress integration smoke assertions proving offline pull/push routes
  remain unregistered and health reports blocked bootstrap state by default.
- Unit coverage for blocked, gated, ready, and admin-summary bootstrap status
  payloads.

### Not Added

- No current offline route is enabled for registration. Live route business
  handlers, queue replay workers, push/pull persistence, conflict mutation
  writes, and production database mutation remain disabled.

## [0.70.0] - 2026-06-06

### Added

- Offline route bootstrap planner for future staging bootstrap checks.
- Feature-gate, registerable-route count, route-key, route-summary, and
  bootstrap block-reason reporting before any live route registration is
  attempted.
- Deterministic planning from existing route registration metadata plus a
  direct planned-args path for future route-readiness tests.
- Unit coverage for disabled, gated, future-registerable, and feature-enabled
  bootstrap outcomes.

### Not Added

- No current offline route is enabled for registration. Live route business
  handlers, queue replay workers, push/pull persistence, conflict mutation
  writes, and production database mutation remain disabled.

## [0.69.0] - 2026-06-06

### Added

- Parser-only offline route validation handler factory for future controller
  wiring.
- Injected handler map support for device pairing, pull, push, conflict list,
  and conflict resolution callbacks.
- Stable validation response envelopes for accepted and rejected offline route
  requests, including route callback names, status metadata, safe summaries,
  and validation error codes.
- Unit coverage proving handlers validate through the controller, read
  idempotency headers and route/query params, defer writes, keep routes gated,
  and return stable invalid responses for malformed push batches.

### Not Added

- No current offline route is enabled for registration. Live route business
  handlers, queue replay workers, push/pull persistence, conflict mutation
  writes, and production database mutation remain disabled.

## [0.68.0] - 2026-06-06

### Added

- Offline REST request adapter for future WordPress route handlers.
- Normalized offline request data value for body params, query params, route
  params, headers, and idempotency-key extraction.
- Optional offline controller handler dispatch for staging-gated route
  adapters, while default controller construction still fails closed.
- Unit coverage for array fixtures, WordPress-style request objects,
  idempotency header normalization, injected controller handlers, and
  unhandled controller callbacks remaining disabled.

### Not Added

- No current offline route is enabled for registration. Live route business
  handlers, queue replay workers, push/pull persistence, conflict mutation
  writes, and production database mutation remain disabled.

## [0.67.0] - 2026-06-06

### Added

- Guarded offline REST route registrar for future WordPress route wiring.
- Registrar support for injecting a route registration callable in tests and
  calling WordPress `register_rest_route()` only for plans marked
  `should_register`.
- Unit coverage proving current offline route contracts register zero routes by
  default, simulated future enabled pull plans register once with controller
  and permission callbacks, and live-flagged routes without ready callbacks do
  not register.

### Not Added

- No current offline route is enabled for registration. Live route business
  handlers, queue replay workers, push/pull persistence, conflict mutation
  writes, and production database mutation remain disabled.

## [0.66.0] - 2026-06-06

### Added

- Fail-closed offline REST controller scaffold exposing every planned offline
  route callback method.
- Disabled controller callback responses that return stable `disabled` status,
  `offline_route_disabled` codes, HTTP-style `501` status metadata, and the
  callback name while live route registration remains blocked.
- Route registration planner support for optional controller callback metadata,
  controller readiness flags, callable controller targets, and updated block
  reasons that clear only the controller-not-ready reason when the scaffold is
  supplied.
- Unit coverage for controller callback presence, fail-closed callback
  responses, controller readiness metadata, and continued disabled-by-default
  route registration.

### Not Added

- Live WordPress `register_rest_route()` calls, route handler business logic,
  queue replay workers, push/pull persistence, conflict mutation writes, and
  production database mutation remain disabled.

## [0.65.0] - 2026-06-06

### Added

- Planned offline route registration planner for future WordPress REST route
  wiring.
- Disabled-by-default registration metadata for all planned offline routes,
  including route methods, callback names, permission strategies, required
  scopes, callback readiness, controller readiness, and block reasons.
- Planned registered-device permission callback attachment for pull/push routes
  as inert metadata while pairing and manager conflict routes remain locked.
- Unit coverage proving no offline route should register by default, no route
  uses public `__return_true` permission bypasses, registered-device callbacks
  attach only as metadata, and non-device routes stay fail-closed.

### Not Added

- Live WordPress `register_rest_route()` calls, route controller callbacks,
  queue replay workers, push/pull handlers, canonical entity writes, live
  conflict persistence, and production database mutation remain disabled.

## [0.64.0] - 2026-06-06

### Added

- Planned offline route permission callback factory for future registered-device
  REST `permission_callback` wiring.
- Route-level `required_scope` metadata for `/offline/pull` and
  `/offline/push`, mapping them to `offline_pull` and `offline_push`.
- Stable route permission strategy metadata for pairing, registered-device, and
  manager conflict routes while preserving disabled-by-default live routing.
- Unit coverage for registered-device route scope maps, permission strategies,
  planned callback construction, non-device route exclusion, session update
  application through factory callbacks, and audit redaction.

### Not Added

- Live REST route registration, route-connected callback registration, queue
  replay workers, push/pull route handlers, canonical entity writes, and live
  conflict persistence remain disabled for later staging-gated phases.

## [0.63.0] - 2026-06-06

### Added

- Planned registered-device permission callback adapter for future REST
  `permission_callback` wiring.
- WordPress-style request header extraction from `get_headers()`,
  `get_header()`, direct header arrays, and wrapped `headers` arrays.
- Boolean callback invocation with last-resolution access for future audit and
  diagnostics, plus fixed-clock support for deterministic tests.
- Fake-`wpdb` unit coverage for authorized callback requests, stale update
  denial, missing headers without database access, get-header style requests,
  plan-only resolver compatibility, and audit redaction.

### Not Added

- Live REST route registration, WordPress `permission_callback` wiring, queue
  replay workers, push/pull route handlers, canonical entity writes, and
  route-connected production database mutation remain disabled for later
  staging-gated phases.

## [0.62.0] - 2026-06-06

### Added

- Opt-in session update application on the registered-device permission
  resolver for future REST permission callbacks.
- Permission resolution support for session update results, including
  attempted/applied audit fields, update status, redacted update audit payloads,
  and combined stale/failed update errors.
- Safety behavior that keeps `resolve()` plan-only, while
  `resolve_and_apply_session_update()` applies the prepared update only after
  successful repository-backed authorization and denies stale or rejected
  session updates.
- Fake-`wpdb` unit coverage for applied session updates, stale update denial,
  failed update denial, skipped denied-device updates, and redacted audits.

### Not Added

- Live REST route registration, WordPress `permission_callback` wiring, queue
  replay workers, push/pull route handlers, canonical entity writes, and
  route-connected production database mutation remain disabled for later
  staging-gated phases.

## [0.61.0] - 2026-06-06

### Added

- Offline device session update repository adapter for future registered-device
  permission callbacks.
- Repository result value object exposing applied, stale, and rejected update
  outcomes with affected-row counts, stable errors, query-plan audit data, and
  no raw token or token-hash leakage.
- Planned `$wpdb` update execution from the whitelisted session update query
  builder, invalid-plan rejection before database access, stale optimistic
  row-version handling, failed-write rejection, and unexpected-row-count
  rejection.
- Fake-`wpdb` unit coverage for prepared update execution, stale writes, invalid
  session plans before database access, failed updates, unexpected row counts,
  and redacted audit payloads.

### Not Added

- Live REST route registration, WordPress `permission_callback` wiring, queue
  replay workers, push/pull route handlers, canonical entity writes, and
  route-connected production database mutation remain disabled for later
  staging-gated phases.

## [0.60.0] - 2026-06-06

### Added

- Offline device session update query builder for future permission callback
  last-seen writes.
- Session update query plan value object exposing a safe table name, prepared
  SQL template, prepared arguments, optimistic row-version metadata, stable
  errors, and secret-free audit payloads.
- Validation for safe WordPress table prefixes, offline device IDs, public
  device IDs, UTC last-seen/update timestamps, next row versions, expected row
  versions, and previous-row-version consistency.
- Unit coverage for valid prepared update templates, invalid table prefixes,
  invalid session rows, row-version increment guards, string row versions, and
  audit payloads without raw tokens or token hashes.

### Not Added

- Live REST route registration, WordPress `permission_callback` wiring,
  last-seen `$wpdb` writes, queue replay workers, push/pull route handlers,
  canonical entity writes, and production database mutation remain disabled for
  later staging-gated phases.

## [0.59.0] - 2026-06-06

### Added

- Offline registered-device permission resolver for future REST permission
  callbacks.
- Resolution value object exposing initial permission planning, optional
  repository lookup results, final loaded-row permission planning, session
  plans, stable errors, and secret-free audit payloads.
- Repository-backed authorization flow that denies bad bearer tokens before
  database access, maps not-found rows to explicit denials, rejects malformed
  rows, authenticates found rows, and plans last-seen update rows without
  writing them.
- Fake-`wpdb` unit coverage for authorized repository-backed resolution,
  not-found devices, invalid tokens before lookup, malformed rows, denied
  scopes, and redacted audit payloads.

### Not Added

- Live REST route registration, WordPress `permission_callback` wiring,
  last-seen writes, queue replay workers, push/pull route handlers, canonical
  entity writes, and production database mutation remain disabled for later
  staging-gated phases.

## [0.58.0] - 2026-06-06

### Added

- Offline registered-device repository adapter for future REST permission
  callbacks.
- Repository result value object exposing found, not-found, and rejected
  outcomes with query-plan audit data, row-normalization audit data, stable
  errors, and no raw token or token-hash leakage.
- Planned `$wpdb` lookup execution from the whitelisted query builder,
  invalid-plan rejection before database access, not-found handling, and
  malformed-row rejection before auth/session planners consume repository data.
- Fake-`wpdb` unit coverage for prepared query execution, result normalization,
  not-found rows, invalid lookup plans, malformed database rows, and redacted
  audit payloads.

### Not Added

- Live REST route registration, WordPress `permission_callback` wiring,
  last-seen writes, queue replay workers, push/pull route handlers, canonical
  entity writes, and production database mutation remain disabled for later
  staging-gated phases.

## [0.57.0] - 2026-06-06

### Added

- Offline registered-device lookup query builder for future repository-backed
  permission callbacks.
- Query plan value object exposing a safe table name, selected columns,
  prepared SQL template, prepared arguments, row-normalizer metadata, stable
  errors, and secret-free audit payloads.
- Validation for WordPress table prefixes, supported device-table contracts,
  whitelisted selected columns, active/revocation/expiry filters, deferred
  scope checks, supported row normalizers, and one-row lookup limits.
- Unit coverage for prepared SQL templates, UTC-to-MySQL expiry argument
  conversion, invalid upstream lookup plans, invalid table prefixes, tampered
  query contracts, and audit payloads without raw tokens or token hashes.

### Not Added

- Live `$wpdb` execution, device row repository reads, REST route registration,
  WordPress `permission_callback` wiring, last-seen writes, queue replay
  workers, and live database writes remain disabled for later staging-gated
  phases.

## [0.56.0] - 2026-06-06

### Changed

- Integrated offline registered-device lookup-query planning into the
  registered-device permission planner.
- Lookup-required permission outcomes now carry future repository query
  arguments, selected-column metadata, lock intent, and deferred scope-check
  summaries.
- Invalid required-scope or server-time query plans are rejected before a
  future repository call is attempted.
- Unit coverage now verifies lookup-query args on permission plans, invalid
  query planning, loaded-row authorization without query args, and secret-free
  permission audits.

### Not Added

- Live device row repository queries, REST route registration, WordPress
  `permission_callback` wiring, last-seen `$wpdb` writes, queue replay workers,
  and live database writes remain disabled for later staging-gated phases.

## [0.55.0] - 2026-06-06

### Added

- Offline registered-device lookup-query planner for future repository-backed
  permission callbacks.
- Lookup plan value object exposing future repository filters, query arguments,
  selected columns, lock intent, stable errors, and secret-free audit payloads.
- Query planning for selected `tcg_offline_devices` columns,
  active/revocation/expiry filters, row-normalizer metadata, deferred scope
  checks, and deterministic one-row lookup arguments from a valid token lookup
  plan.
- Unit coverage for query contract shape, row normalizer selected-column
  coverage, invalid token lookup plans, unsupported scopes, invalid server
  times, deferred scope checks, and audit payloads without raw tokens.

### Not Added

- Live device row repository queries, REST route registration, WordPress
  `permission_callback` wiring, last-seen `$wpdb` writes, queue replay workers,
  and live database writes remain disabled for later staging-gated phases.

## [0.54.0] - 2026-06-06

### Added

- Offline registered-device row normalizer for future repository-backed
  permission callbacks.
- Row normalization result value object exposing normalized device rows, stable
  validation errors, and secret-free audit payloads.
- Database identity coercion, decoded scope/capability payloads, UTC timestamp
  normalization, explicit null handling for optional dates, token-hash shape
  validation, and audit payloads that omit token hashes.
- Unit coverage for valid database rows, decoded payloads, explicit null date
  overrides, invalid identity/hash fields, invalid timestamps, invalid JSON,
  and invalid JSON shapes.

### Not Added

- Live device row repository queries, REST route registration, WordPress
  `permission_callback` wiring, last-seen `$wpdb` writes, queue replay workers,
  and live database writes remain disabled for later staging-gated phases.

## [0.53.0] - 2026-06-06

### Added

- Offline registered-device permission planner for future REST
  `permission_callback` wiring.
- Permission plan value object that exposes token lookup filters, lookup-needed
  state, authorization decisions, session update plans, stable errors, and
  secret-free audit payloads.
- Assembly of token lookup, loaded device-row bearer authentication, and
  session/last-seen planning without live database queries or route
  registration.
- Unit coverage for lookup-required plans, authorized loaded devices, malformed
  tokens, denied scopes, invalid session rows, and audit payloads without raw
  tokens.

### Not Added

- Live device row repository queries, REST route registration, WordPress
  `permission_callback` wiring, last-seen `$wpdb` writes, queue replay workers,
  and live database writes remain disabled for later staging-gated phases.

## [0.52.0] - 2026-06-06

### Added

- Offline device session planner for future repository-backed permission
  callbacks.
- Session plan value object exposing future device last-seen update rows,
  authenticated session context, row-version increments, and secret-free audit
  payloads.
- Validation that accepted access decisions match the loaded device row by
  persisted offline device ID and public device ID before planning updates.
- Unit coverage for last-seen update rows, audit payloads, string database IDs,
  denied decisions, mismatched device rows, invalid timestamps, invalid device
  IDs, and invalid row versions.

### Not Added

- Live last-seen `$wpdb` writes, device row repository queries, REST route
  registration, permission callback wiring, queue replay workers, and live
  database writes remain disabled for later staging-gated phases.

## [0.51.0] - 2026-06-06

### Added

- Offline device token lookup planner for future repository-backed permission
  callbacks.
- Lookup plan value object exposing hashed token lookup filters, a short audit
  fingerprint, validity state, parse errors, and secret-free audit payloads.
- Shared token hash derivation between lookup planning and bearer-token
  authentication.
- Unit coverage for valid lookup plans, normalized WordPress header arrays,
  missing/malformed/short tokens, lookup filters, fingerprints, and audit
  payloads without raw tokens.

### Changed

- Refactored the offline device bearer-token authenticator to consume the shared
  lookup planner before comparing stored hashes and delegating device policy
  checks.

### Not Added

- Live device row repository queries, REST route registration, permission
  callback wiring, device last-seen updates, queue replay workers, and live
  `$wpdb` writes remain disabled for later staging-gated phases.

## [0.50.0] - 2026-06-06

### Added

- Offline device bearer-token authenticator for future REST permission
  callbacks.
- Authorization header normalization for direct and WordPress-style request
  header arrays.
- Device token shape validation, SHA-256 token hashing, stored token hash
  comparison with `hash_equals`, and persisted `offline_device_id` enforcement.
- Secret-free accepted authorization context containing device ID, persisted
  offline device ID, required scope, auth type, and authentication timestamp.
- Unit coverage for valid tokens, normalized header arrays, missing/malformed
  tokens, short tokens, invalid stored hashes, wrong tokens, missing persisted
  device IDs, revoked devices, and denied scopes.

### Not Added

- Live device row lookup, REST route registration, permission callback wiring,
  device last-seen updates, queue replay workers, and live `$wpdb` writes remain
  disabled for later staging-gated phases.

## [0.49.0] - 2026-06-06

### Added

- Offline push persistence planner that maps parsed push operations and batch
  resolution output into future `tcg_offline_sync_queue` and
  `tcg_sync_conflicts` insert rows.
- Idempotent replay planning for operations that already have matching stored
  result rows.
- Validation for registered-device row identity, batch/device mismatches,
  result-row presence, stale replay rows, UTC timestamps, and JSON payload
  shaping.
- Unit coverage for queue row mapping, conflict insert mapping, idempotent
  replay, and rejected stale/mismatched persistence inputs.

### Not Added

- Live `$wpdb` transactions, REST route registration, bearer-token lookup,
  canonical inventory/event/credit mutation writes, conflict inserts, operation
  result inserts, and cursor advancement remain disabled for later
  staging-gated phases.

## [0.48.0] - 2026-06-06

### Added

- Offline sync database migration `0008_offline-sync` for registered device
  rows, idempotent operation queue/result rows, manager-reviewed conflict rows,
  and per-device pull cursors.
- Offline sync schema contract tests for token/revocation fields, operation
  idempotency, conflict lookups, cursor uniqueness, and reversible drop order.
- WordPress integration smoke coverage for database target `8` and the new
  offline persistence tables.

### Not Added

- Live offline route registration, bearer-token lookup, token hash comparison,
  queue replay workers, canonical entity mutations, conflict mutation writes,
  and cursor advancement remain disabled for later staging-gated phases.

## [0.47.0] - 2026-06-06

### Added

- Offline push batch resolver for future queue replay route handlers.
- Batch-level response payloads, operation result rows, conflict rows, audit
  payloads, and accepted/conflict/rejected counts.
- Server snapshot lookup by operation ID, entity key, or operation index so
  future repositories can feed deterministic resolver inputs.
- Unit coverage for mixed accepted/conflict batches, conflict row enrichment,
  per-operation runtime options, missing server snapshots, invalid options, and
  invalid server timestamps.

### Not Added

- Live push route registration, database queue replay, canonical entity
  mutation writes, conflict insertion, idempotent operation-result persistence,
  registered-device permission wiring, and cursor advancement remain disabled
  for later staging-gated phases.

## [0.46.0] - 2026-06-06

### Added

- Offline push operation resolver for future queue replay and conflict
  persistence flows.
- Planned accepted, rejected, and conflict outcomes for inventory
  reservations, event reservations, customer credit redemptions, revoked
  devices, and unsupported operations.
- Future operation result rows, response payloads, redacted audit payloads,
  and deterministic conflict rows for manager-reviewed offline conflicts.
- Unit coverage mirroring the shared sync-engine policy for available/sold
  inventory, TopDeck queue gating, waitlist placement, credit limits,
  overspend conflicts, device revocation, and invalid server timestamps.

### Not Added

- Live offline push route handlers, database queue replay, canonical entity
  mutation writes, conflict persistence, registered-device permission wiring,
  and device cursor advancement remain disabled for later staging-gated phases.

## [0.45.0] - 2026-06-06

### Added

- Offline conflict resolution planner for future manager-reviewed conflict
  mutation flows.
- Planned conflict update rows, API response payloads, and redacted audit
  payloads with deterministic resolution payload hashes.
- Guards for stale expected row versions, terminal conflicts, unavailable
  resolution actions, invalid current rows, and invalid server timestamps.
- Unit coverage for manager-adjust plans, dismiss and retry status mapping,
  redacted audit hashes, stale versions, terminal rows, unavailable actions,
  bad current rows, and bad server time.

### Not Added

- Live conflict mutation writes, manager audit persistence, REST callback
  wiring, resolved-state propagation, and device sync fanout remain disabled
  for later staging-gated phases.

## [0.44.0] - 2026-06-06

### Added

- Offline conflict list response presenter for the planned conflict-center
  list route.
- Stable response shaping for device IDs, schema version, server time, filters,
  cursors, `has_more`, conflict rows, severities, row versions, payload objects,
  and available manager resolution options.
- Validation for conflict IDs, statuses, entity types, entity IDs, conflict
  types, severity, summaries, UTC timestamps, row versions, response cursors,
  payload objects, and supported resolution options.
- Unit coverage for empty conflict responses, normalized conflict rows,
  duplicate action cleanup, payload preservation, and invalid response contract
  inputs.

### Not Added

- Live conflict repository reads, conflict mutation writes, manager audit
  persistence, REST callback wiring, and resolved-state propagation remain
  disabled for later staging-gated phases.

## [0.43.0] - 2026-06-06

### Added

- Offline conflict list request parser for the planned conflict-center route.
- Offline conflict resolution request parser for the planned manager resolution
  route.
- Validation for conflict statuses, entity types, cursors, page-size bounds,
  include-resolved filters, idempotent resolution IDs, manager IDs, resolution
  actions, notes, expected conflict versions, UTC timestamps, adjustment
  payloads, and schema version `1`.
- Unit coverage for normalized list filters, default filters, invalid filter
  shapes, unsupported filters, valid resolution payloads, idempotency fallback,
  missing fields, and invalid manager-adjust requests.

### Not Added

- Live conflict repository reads, conflict mutation writes, manager audit
  persistence, REST callback wiring, and resolved-state propagation remain
  disabled for later staging-gated phases.

## [0.42.0] - 2026-06-06

### Added

- Offline device access policy for future registered-device permission
  callbacks.
- Validation for active device status, revocation timestamps, token expiry,
  required scopes, supported modes/scopes, location IDs, and UTC timestamps.
- Unit coverage for allowed active devices, revoked/inactive/expired devices,
  missing or unsupported scopes, and malformed device context.

### Not Added

- Live bearer token lookup, token hash comparison, REST permission callback
  wiring, device last-seen updates, revocation persistence, and live route
  registration remain disabled for later staging-gated phases.

## [0.41.0] - 2026-06-06

### Added

- Offline device registration planner for the planned pairing flow.
- Planned device row, one-time response payload, sync route map, first-sync
  flags, token hash storage fields, and redacted audit payloads.
- Validation for generated device IDs, one-time device tokens, token hashes,
  UTC issue/expiry timestamps, and expiry-after-issue ordering.
- Unit coverage for device row/response/audit payloads, scope/capability
  preservation, invalid generated credentials, and invalid expiry windows.

### Not Added

- Live device row writes, token generation, token hashing, token storage,
  registration route persistence, revocation checks, and first-sync execution
  remain disabled for later staging-gated phases.

## [0.40.0] - 2026-06-06

### Added

- Offline device pairing request parser for the planned
  `/offline/devices/register` route.
- Validation for pairing codes, installation IDs, device labels, device modes,
  manager/location IDs, app versions, Windows platform checks, hardware
  capabilities, requested scopes, and schema version `1`.
- Unit coverage for normalized pairing requests, missing core fields, invalid
  shapes, unsupported scopes/capabilities, unsupported platform/mode, and
  staff/admin scope combinations.

### Not Added

- Live device token issuance, token hashing/storage, registration route writes,
  revocation checks, first-sync execution, and reconnect integration tests
  remain disabled for later staging-gated phases.

## [0.39.0] - 2026-06-06

### Added

- Offline pull response presenter for stable server-to-device payloads.
- Per-domain response shaping for cursors, `has_more`, cached data rows, and
  tombstones.
- Validation of response contract inputs, including supported domains, UTC
  timestamps, entity IDs, row versions, payload objects, tombstone rows, and
  cursor shape.
- Unit coverage for empty pull responses, request cursor carry-forward,
  normalized data rows, tombstone inclusion/exclusion, and invalid response
  contract inputs.

### Not Added

- Live offline pull route registration, device token validation, database
  change queries, cursor advancement, tombstone repositories, and reconnect
  integration tests remain disabled for later staging-gated phases.

## [0.38.0] - 2026-06-06

### Added

- Offline pull request parser for devices requesting cached read-model changes.
- Validation for device IDs, cached domain selection, domain cursors,
  page-size bounds, tombstone inclusion, and schema version `1`.
- Unit coverage for requested domains/cursors, default pull settings, invalid
  top-level shapes, unsupported domains, bad cursors, and unsupported schema
  versions.

### Not Added

- Live offline pull route registration, device token validation, change-query
  repositories, tombstone reads, cursor advancement, and reconnect integration
  tests remain disabled for later staging-gated phases.

## [0.37.0] - 2026-06-06

### Added

- Offline push payload parser for queued operation batches from the Windows
  app.
- Validation for batch IDs, device IDs, duplicate client operation IDs,
  supported operation/entity pairs, timestamps, row-version metadata, JSON
  payload objects, authorization context objects, and schema version `1`.
- Unit coverage for valid batches, missing top-level fields, device mismatch,
  duplicate operation IDs, and malformed operation envelopes.

### Not Added

- Live offline push route registration, device token validation, queue replay,
  operation persistence, conflict writes, and reconnect integration tests remain
  disabled for later staging-gated phases.

## [0.36.0] - 2026-06-06

### Added

- WordPress planned offline REST route contracts for device pairing, pull,
  push, conflict listing, and conflict resolution.
- Contract coverage for offline route permissions, callback names, namespace,
  and disabled-live defaults.
- Documentation linking the offline Windows app API boundary to the WordPress
  route contracts.

### Not Added

- Live offline REST route registration, device token validation, push/pull
  workers, queue replay, conflict persistence, and reconnect integration tests
  remain disabled for later staging-gated phases.

## [0.35.0] - 2026-06-06

### Added

- Offline app SQLite schema manifest and first local migration contract.
- Local tables for app metadata, device identity, sync cursors, operation
  queue, sync logs, cached branding, cached inventory, cached customer credit,
  cached events, and sync conflicts.
- Operation queue envelope fields matching the offline sync contract.
- SQLite schema contract test wired into root `npm run test`.
- Documentation for local SQLite ownership and rollback boundaries.

### Not Added

- Live SQLite service execution, encryption integration, FTS/search virtual
  tables, device pairing, WordPress offline REST endpoints, push/pull workers,
  queue replay, conflict UI, and full reconnect integration tests remain
  disabled for later staging-gated phases.

## [0.34.0] - 2026-06-06

### Added

- Tauri/React/TypeScript offline app scaffold for the Windows app.
- Windows packaging metadata for `x86_64-pc-windows-msvc` and NSIS `.exe`
  installer output.
- Offline app manifest covering WordPress offline sync routes, no direct MySQL
  access, manual production release approval, code-signing requirement, and
  required white-label branding tokens.
- Dependency-free offline app package contract test wired into root
  `npm run test`.
- Pull request quality gate coverage for the offline app package contract.
- Manual-only GitHub Actions workflow for building and uploading an unsigned
  Windows installer artifact.

### Not Added

- Live SQLite queue persistence, device pairing, WordPress offline REST
  endpoints, push/pull workers, printer/scanner adapters, kiosk lockdown,
  updater, signed production installer, and full reconnect integration tests
  remain disabled for later staging-gated phases.

## [0.33.0] - 2026-06-06

### Added

- White-label company branding settings for company name, short name, logo URL,
  support URL, receipt footer text, and theme color tokens.
- Sanitized client-safe branding config export for future WordPress, kiosk,
  staging banner, receipt, and Windows offline app consumers.
- CSS variable export for primary, accent, background, surface, text, success,
  warning, danger, and staging banner color tokens.
- Settings API fields for company identity, HTTPS brand URLs, receipt footer,
  and color token inputs.
- Admin dashboard and system status usage of the configured company profile.
- Unit coverage for branding sanitization, existing-value preservation,
  client-safe public config export, and CSS variable output.

### Not Added

- Live storefront/kiosk/offline app rendering, public branding REST endpoint,
  receipt template rendering, email template theming, and offline app branding
  sync remain disabled for later staging-gated UI phases.

## [0.32.0] - 2026-06-06

### Added

- Buylist offer planner for reviewed item offer payloads.
- Submission-level cash and credit total planning with target submission
  status selection.
- Item and submission manager approval threshold planning for cash and credit
  offers.
- Deterministic offer fingerprints for replay/review stability.
- Unit coverage for normal offer payloads, manager approval thresholds,
  invalid submissions/items, zero-value offers, and stable fingerprints.

### Not Added

- Live buylist offer write APIs, permission callbacks, staff review UI,
  approval persistence, customer acceptance writes, credit payout posting, and
  inventory conversion workers remain disabled for later staging-gated phases.

## [0.31.0] - 2026-06-06

### Added

- Customer credit REST response presenter for balance, ledger, posting-result,
  and validation-error payloads.
- Safe customer credit balance payload shaping that omits private contact
  fields.
- Ledger row shaping with amount/currency normalization, paging metadata, and
  redacted structured metadata.
- Unit coverage for balance payloads, ledger metadata redaction, posting-result
  responses, and validation-error response shape.

### Not Added

- Live customer credit REST endpoint registration, permission callbacks, nonce
  handling, database read repositories, staff UI, WooCommerce redemption hooks,
  and audit writes remain disabled for later staging-gated phases.

## [0.30.0] - 2026-06-06

### Added

- WooCommerce order lifecycle planner for serialized inventory order-line
  metadata.
- Checkout linkage, payment-complete conversion, failed/cancelled release, and
  refund review transition payload planning.
- Duplicate reservation line guards, non-serialized line skipping, invalid
  metadata reporting, and deterministic lifecycle idempotency keys.
- Unit coverage for checkout, payment, failed/cancelled, refund, invalid line,
  duplicate reservation, invalid action, and invalid order planning.

### Not Added

- Live WooCommerce checkout hook execution, order mutation, payment lifecycle
  conversion, Store API execution, cart release hooks, and refund hooks remain
  disabled for later staging-gated phases.

## [0.29.0] - 2026-06-06

### Added

- WooCommerce order-line metadata planner for serialized inventory checkout
  lines.
- Exact inventory, reservation, owner-token, minor-unit price snapshot,
  formatted decimal price, currency, reservation expiry, and deterministic
  snapshot hash payload planning.
- Optional WooCommerce/card descriptor metadata copying for cart IDs, cart item
  keys, barcodes, condition codes, provider IDs, card names, set names, card
  numbers, product IDs, and variation IDs.
- Unit coverage for valid metadata payloads, validator error propagation,
  optional descriptor normalization, deterministic snapshot hashes, and
  zero-price snapshots.

### Not Added

- Live WooCommerce checkout hook execution, HPOS order writes, Store API order
  mutation, payment lifecycle conversion, cart release hooks, and refund
  lifecycle handling remain disabled for later staging-gated phases.

## [0.28.0] - 2026-06-06

### Added

- Reservation expiry cleanup planner for candidate active reservation rows.
- Expired active hold release payloads with reservation ID, inventory ID,
  source/cart context, expiry timestamp, target statuses, release reason, and
  deterministic cleanup idempotency keys.
- Explicit reservation service `expire()` transition that restores reserved
  inventory to available and marks the reservation `expired`.
- Unit coverage for expired holds, equal-to-now expiries, future holds,
  inactive lifecycle rows, invalid rows, and service expiry transitions.

### Not Added

- Live Action Scheduler cleanup jobs, WooCommerce cart timer wiring, database
  race integration tests, and automatic cleanup execution remain disabled for
  later staging-gated phases.

## [0.27.0] - 2026-06-06

### Added

- ScryDex persistence planner for normalized sync page plans.
- Deterministic reference-card insert payload planning with public IDs,
  timestamps, and row-version defaults.
- Changed-row update planning with field diffs, reference card IDs, timestamps,
  and row-version increments.
- Unchanged reference-card detection and current price observation planning with
  known local reference IDs when available.
- Unit coverage for insert planning, changed-row update planning, unchanged
  rows, price observation reference IDs, and failed page plan guards.

### Not Added

- Live ScryDex `wpdb` write workers, scheduled pulls, image downloads,
  usage-budget enforcement, and webhook processing remain disabled for later
  staging-gated phases.

## [0.26.0] - 2026-06-06

### Added

- Manager override persistence planner for accepted below-minimum sale
  approvals that require stored override rows.
- Manager override row payload planning for employee, manager, inventory,
  order, location, cart, price, currency, expiration, and reason fields.
- Audit-safe payload planning with decision code, minimum sale price, reason
  hash, and minor-unit to decimal price conversion.
- Unit coverage for persisted override payloads, policy-rejected skip results,
  no-row-required skip results, and invalid optional context IDs.

### Not Added

- Live manager PIN/password reauthentication, database inserts, audit service
  writes, WooCommerce/POS hook wiring, and rate limiting remain disabled for
  later staging-gated phases.

## [0.25.0] - 2026-06-06

### Added

- Buylist planned REST route contracts for submission intake, staff listing,
  owner/staff detail, review, offer, customer acceptance, and inventory
  conversion flows.
- Buylist submission intake parser for source, idempotency, customer identity,
  currency, owner token hash, optional customer/location IDs, and card item rows.
- Unit coverage for planned route permissions, disabled-by-default live status,
  valid intake normalization, missing submission fields, invalid item rows, bad
  owner tokens, and invalid optional IDs.

### Not Added

- Live buylist route registration, permission callbacks, staff review UI,
  offer storage, customer acceptance writes, customer credit payout posting,
  and inventory conversion workers remain disabled for later staging-gated
  phases.

## [0.24.0] - 2026-06-06

### Added

- Customer credit planned REST route contracts for balance, ledger, adjustment,
  and redemption flows.
- Customer credit REST posting payload parser for route/customer matching,
  idempotency keys, amount format, currency normalization, optional linked IDs,
  metadata object validation, and manager-approved adjustments.
- Unit coverage for the planned route permissions, disabled-by-default live
  status, valid redemption parsing, customer mismatch rejection, manager
  approval requirements, and invalid optional request fields.

### Not Added

- Live customer credit REST route registration, nonce/capability callbacks,
  staff UI, WooCommerce redemption hooks, and audit writes remain disabled for
  later staging-gated phases.

## [0.23.0] - 2026-06-06

### Added

- WooCommerce serialized inventory hook contract registry.
- Unit coverage for exact inventory cart, checkout, payment, refund, cart
  removal, and Store API validation hook contracts.
- Stable hook metadata for handler method, lifecycle phase, priority, accepted
  args, default live-gating, and purpose.

### Not Added

- Live WooCommerce hook registration, HPOS lifecycle verification,
  order-reservation persistence, Store API execution, and payment/refund
  integration remain disabled for later staging-gated phases.

## [0.22.0] - 2026-06-06

### Added

- ScryDex sync page processor and page plan result.
- Fixture-backed planning for normalized reference-card rows, current price
  rows, normalization errors, checkpoint advancement, and retryable provider
  failures.

### Not Added

- Database upsert workers, scheduled pulls, image downloads, usage-budget
  enforcement, and webhook processing remain disabled for later phases.

## [0.21.0] - 2026-06-06

### Added

- POS/payment reconciliation policy module for sanitized sandbox provider
  responses.
- Node tests for approved payment normalization, scan-gated exact item sales,
  declined payments, unmapped POS line conflicts, and refund-to-review behavior.
- Root `npm run test` wiring for POS/payment policy tests.

### Not Added

- Live Square/POS connection, WooCommerce gateway capture, payment webhooks,
  provider inventory writes, and production payment credentials remain disabled.

## [0.20.0] - 2026-06-06

### Added

- Shared sync-engine offline conflict policy module.
- Node-based offline sync tests for inventory reservation acceptance/conflict,
  event reservation acceptance/waitlist/capacity conflict, customer credit
  redemption acceptance/local-limit rejection/overspend conflict, and device
  revocation rejection.
- Root `npm run test` wiring for sync-engine tests.

### Not Added

- Tauri app, SQLite queue persistence, WordPress offline REST endpoints, device
  auth API, and live pull/push sync workers remain disabled for later phases.

## [0.19.0] - 2026-06-06

### Added

- TopDeck registration push adapter for mapping local event registration rows
  to provider registration calls.
- TopDeck sync result mapping for registered, pending invitation, capacity
  conflict, missing configuration/input, and retryable provider failures.
- Unit coverage for TopDeck email selection, customer email fallback,
  override-cap pass-through, capacity conflicts, missing TID/email guards, and
  retryable failure updates.

### Not Added

- Queued TopDeck worker execution, live provider calls, payment-complete push,
  and staff recovery UI remain disabled for later staging-gated phases.

## [0.18.0] - 2026-06-06

### Added

- Migration runner pending-version and rollback-version planning helpers.
- Unit coverage for clean install, prior-schema upgrade, current-schema
  idempotent rerun, rollback order, and no-op rollback plans.

### Not Added

- Live MySQL migration transaction, row-lock, `dbDelta`, backup/restore, and
  rollback integration tests remain staged for WordPress/staging environments.

## [0.17.0] - 2026-06-06

### Added

- Dependency-free REST route contract coverage for the health endpoint and
  public Events list/detail/registration endpoints.
- Shared controller route contract definitions used by both unit tests and
  WordPress route registration.
- Guard coverage proving unimplemented customer, buylist, inventory, offline,
  and POS write routes are not registered yet.

### Not Added

- Full WordPress REST permission, nonce, request/response, and write-flow
  integration tests remain staged for the WordPress integration suite.

## [0.16.0] - 2026-06-06

### Added

- WooCommerce serialized cart item metadata validator for exact inventory
  checkout line preparation.
- Validation for one-item serialized quantities, required inventory and
  reservation IDs, owner token hashes, immutable price snapshots, ISO currency,
  and unexpired reservations.
- Unit coverage for valid cart metadata, missing exact-item metadata, quantity
  enforcement, expired reservations, and invalid price/currency snapshots.

### Not Added

- Live WooCommerce add-to-cart, cart-session, checkout, payment-complete,
  order-line, Store API, cart removal, and refund hook wiring remain disabled
  for later staging-gated phases.

## [0.15.0] - 2026-06-06

### Added

- Manager override request, decision, and policy helpers for below-minimum sale
  authorization.
- Policy enforcement for distinct manager approval, required reason, invalid
  amount rejection, and override-row persistence requirement.
- Unit coverage for no-override-needed sales, missing manager approval,
  same-user approval rejection, missing reason rejection, valid approval, and
  invalid amount rejection.

### Not Added

- Manager override persistence, manager PIN reauthentication, WooCommerce/POS
  below-minimum hook wiring, and audit log writes remain disabled for later
  staging-gated phases.

## [0.14.0] - 2026-06-06

### Added

- Reservation lifecycle service helpers for converting active reservations to
  sold inventory and releasing active reservations back to available inventory.
- Idempotent replay behavior for already-converted lifecycle transitions.
- Inventory-state mismatch protection so release/conversion cannot silently
  overwrite sold or otherwise unexpected inventory state.
- Unit coverage for conversion, release, idempotent conversion replay, and
  inventory-state mismatch rejection.

### Not Added

- WooCommerce add-to-cart/checkout hooks, order line metadata writes,
  payment-complete hook wiring, cart release hooks, expiry cleanup workers, and
  database race integration tests remain disabled for later staging-gated
  phases.

## [0.13.0] - 2026-06-06

### Added

- Schema migration `0007_reservations`.
- Exact inventory reservation table contract with idempotency key, expiry,
  ownership token hash, source/cart/customer/order metadata, and a unique
  active inventory claim key.
- Reservation request/result/storage/service foundation for transaction-backed
  exact item reservations.
- Unit coverage for reservation schema, successful reservation, idempotency
  replay, unavailable inventory rejection, active-reservation collision
  rejection, and pre-transaction idempotency validation.
- WordPress integration smoke verification for schema version `7` and
  reservation tables.

### Not Added

- WooCommerce add-to-cart/checkout hooks, payment-complete conversion, cart
  removal release, expiry cleanup workers, kiosk cart write APIs, and database
  integration race tests remain disabled for later staging-gated phases.

## [0.12.0] - 2026-06-06

### Added

- ScryDex card normalizer for mapping provider card payloads into local
  reference-card row shapes.
- ScryDex market price normalization for current provider price rows with
  currency validation and observed timestamps.
- Fixture-backed unit coverage for card rows, price rows, required-field
  errors, and nullable optional fields.

### Not Added

- ScryDex database upserts, scheduled workers, image downloads, live provider
  credential configuration, usage-budget enforcement, and webhook route
  handling remain disabled for later staging-gated phases.

## [0.11.0] - 2026-06-06

### Added

- ScryDex provider result object and adapter contract.
- ScryDex HTTP provider with injectable transport, card search, card detail,
  usage request, default-disabled webhook registration, credential header
  handling, rate-limit mapping, unauthorized mapping, and auth-context redaction.
- Team ID redaction in the shared log redactor for provider auth contexts.
- Unit coverage for missing ScryDex credentials, fixture-backed card search,
  credential headers, rate-limit mapping, and ScryDex auth-context redaction.

### Not Added

- Scheduled ScryDex workers, live provider credential configuration,
  normalization/upsert logic, image downloads, usage-budget enforcement, and
  webhook route handling remain disabled for later staging-gated phases.

## [0.10.0] - 2026-06-06

### Added

- Schema migration `0006_sync`.
- Sync job, job log, checkpoint, error, and webhook event table contracts.
- ScryDex checkpoint value object and request planner for page/cursor resume.
- Unit coverage for sync schema contracts and ScryDex checkpoint resume behavior
  using the sanitized mock checkpoint fixture.
- WordPress integration smoke verification for schema version `6` and sync
  tables.

### Not Added

- Live ScryDex HTTP adapter, normalization/upsert workers, image download
  workers, usage-budget enforcement, and webhook route handling remain disabled
  for later staging-gated phases.

## [0.9.0] - 2026-06-06

### Added

- Customer credit ledger posting request/result objects.
- Customer credit ledger storage contract and `wpdb` repository.
- Transactional customer credit ledger posting service with required
  idempotency keys, customer row locking, currency checks, cached balance
  updates, and duplicate replay handling.
- Unit coverage for successful credit posting, idempotency replay, overspend
  rejection, and missing idempotency-key rejection.

### Not Added

- Customer credit REST endpoints, WooCommerce redemption hooks, offline credit
  conflict processing, and staff UI remain disabled for later staging-gated
  phases.

## [0.8.0] - 2026-06-06

### Added

- Schema migration `0005_buylist`.
- Buylist submission, item, offer, approval, and inventory conversion log table
  contracts.
- Buylist submission status helper for draft, review, offer, acceptance,
  payout, conversion, completion, cancellation, rejection, and expiry flows.
- Unit coverage for buylist schema contracts and status transitions.
- WordPress integration smoke verification for schema version `5` and buylist
  tables.

### Not Added

- Buylist REST write endpoints, staff review UI, customer credit payout posting,
  and inventory conversion workers remain disabled for later staging-gated
  phases.

## [0.7.0] - 2026-06-06

### Added

- Schema migration `0004_customer_credit`.
- Customer, contact, credit ledger, merge log, and customer note table
  contracts.
- Customer credit entry type helper with typical signs and manager-approval
  requirements.
- Customer credit posting policy helper with four-decimal signed amount
  previews, before/after balances, manager approval checks, and negative
  balance rejection.
- Unit coverage for customer credit schema, entry type rules, and posting
  policy decisions.
- WordPress integration smoke verification for schema version `4` and customer
  credit tables.

### Not Added

- Customer credit REST endpoints, WooCommerce redemption hooks, offline credit
  conflict processing, and staff UI remain disabled for later phases.

## [0.6.0] - 2026-06-06

### Added

- Public local event registration route:
  `POST /wp-json/tcg-store/v1/events/{slug}/register`.
- Event registration input validation and sanitization for name, email,
  TopDeck email, phone, and idempotency keys.
- Registration acceptance policy for local-only and website-push events,
  including registration deadline checks, sold-out rejection, waitlist
  placement, TopDeck-hosted rejection, and pay-at-store gating for paid events.
- Transaction-backed registration service and repository with event-row locking,
  idempotency reuse, registration inserts, waitlist rows, count/status updates,
  and registration logs.
- Same-event/email duplicate prevention for active registrations, plus
  idempotency-key conflict handling when a key is reused for a different event
  or email.
- Pending TopDeck sync-log queue records for eligible free website-push
  registrations, without live provider calls.
- Unit coverage for registration input validation, registration policy outcomes,
  duplicate detection, TopDeck queue planning, and REST result response shaping.
- WordPress integration smoke assertion for the registration REST route.

### Not Added

- WooCommerce event-ticket products, online payment capture, paid order
  lifecycle hooks, and TopDeck registration push remain disabled for later
  staging-gated phases.
- No schema migration was added; this release uses existing schema version `3`.

## [0.5.0] - 2026-06-06

### Added

- Public read-only Events REST endpoints:
  `/wp-json/tcg-store/v1/events` and `/wp-json/tcg-store/v1/events/{slug}`.
- Event listing filter sanitization for game, format, event type, date,
  free/paid, competitive/casual, featured, and registration status filters.
- Public event presenter that derives seats remaining, public status, badges,
  TopDeck attribution, and hosted registration links.
- `[tcg_events]` and `[tcg_event_detail]` shortcodes for public list/detail
  pages.
- Unit coverage for event filters and public event presentation.

### Not Added

- Event registration writes, WooCommerce event ticket products, payment capture,
  waitlist mutation, and TopDeck push remain disabled for a later phase.

## [0.4.0] - 2026-06-06

### Added

- Phase 3 Events and TopDeck schema migration `0003`.
- Event, registration, waitlist, check-in, TopDeck sync log, and template table
  contracts.
- Event registration mode, status, capacity, seat, and public badge helpers.
- TopDeck provider adapter with prompt-required methods, injectable transport,
  register-player response mapping, key redaction context, and default
  `createEvent()` `not_supported` behavior.
- TopDeck settings defaults for sandbox credentials, base URL, rate limit, and
  create-event safety.
- Unit coverage for Events/TopDeck schema, status rules, TopDeck adapter
  outcomes, and settings sanitization.

## [0.3.0] - 2026-06-06

### Added

- Phase 2 inventory and pricing schema migration `0002`.
- Reference card/variant, inventory location/item, movement, barcode, price
  change, and manager override table contracts.
- Inventory status transition and intake validation helpers.
- Market-plus-10-percent pricing calculator with minimum-floor, currency,
  status, and price-lock handling.
- Dependency-free unit coverage for Phase 2 schema and business rules.
- GitHub Actions WordPress integration workflow with WP-CLI activation and
  schema/REST/role smoke verification.
- GitHub-first development, staging, deployment, and rollback governance.
- Official `wp-env` local WordPress configuration with development seed and
  mock provider fixtures.
- Pull-request quality gate workflow and required test scaffold manifest.

## [0.2.0] - 2026-06-06

### Added

- Phase 1 WordPress plugin bootstrap and dependency health checks.
- Reversible foundation migration and schema tracking.
- Platform roles, capabilities, settings, feature flags, logging, and audit
  services.
- Daylight-saving-safe Action Scheduler daily dispatch.
- Authenticated REST health endpoint and admin system-status screens.
- Local PHP checks and GitHub CI.

### Security

- Unfinished modules are forced off.
- Kiosk users are blocked from wp-admin.
- Structured logs and audit context redact secrets.
- HPOS compatibility remains explicitly pending until lifecycle tests pass.

## [0.1.0-planning] - 2026-06-06

### Added

- Phase 0 architecture blueprint.
- Source-of-truth and integration boundaries.
- Database, REST, WooCommerce, offline sync, security, provider, UX, and testing
  plans.
- Architecture decisions and phased roadmap.

### Not Added

- No application code.
- No database migrations.
- No production credentials or live data.
