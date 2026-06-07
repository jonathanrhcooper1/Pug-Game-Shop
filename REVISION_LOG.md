# Revision Log

This log records implementation revisions in a format suitable for pull request
review, staging approval, deployment approval, and rollback planning.

## 2026-06-07 - Inventory Search Planning And Presentation

### What Changed

- Added `InventorySearchQueryPlanner` and `InventorySearchQueryPlan` to convert
  parsed card/inventory search requests into safe, deferred read contracts.
- Added public/staff/hidden visibility rules, public default scoping to
  visible available cards, staff barcode/SKU/cert-number search columns, stable
  sort contracts, pagination offsets, and deferred WooCommerce/Square projection
  metadata.
- Added `InventorySearchResponsePresenter` to shape card listing responses and
  redact staff-only fields from public search results.

### Why

The card management system needs a tested inventory search layer before live
REST route registration or database execution is enabled. This gives the
website, staff tools, Square inventory projection work, and offline app sync a
stable card-listing contract without adding production writes.

### Files Affected

- `apps/wordpress-plugin/src/Inventory/InventorySearchQueryPlan.php`
- `apps/wordpress-plugin/src/Inventory/InventorySearchQueryPlanner.php`
- `apps/wordpress-plugin/src/Inventory/InventorySearchResponsePresenter.php`
- `apps/wordpress-plugin/tests/Unit/InventorySearchQueryPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/InventorySearchResponsePresenterTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Existing inventory schema version remains unchanged.
- Route-connected reads and writes remain deferred.

### Tests Added

- Query planner tests for public visible/available defaults, staff barcode/SKU
  lookup columns, hidden visibility filters, and invalid table prefixes.
- Response presenter tests for public redaction and staff operational fields.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 678 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 461 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on the three new inventory
  source files: passed.

### Rollback Notes

- Revert this revision to remove the planned inventory search read contracts
  and response presenter.
- No database rollback is required because this revision does not add or run a
  migration.
- No production rollback applies because no production deployment is performed
  by Codex.

## 2026-06-07 - Remove TopDeck From Active Scope

### What Changed

- Removed TopDeck provider classes, event push adapters/planners, provider
  fixtures, and provider-specific unit tests from the active codebase.
- Converted event registration to local-only mode by removing provider
  registration modes, provider status mappings, provider email intake, provider
  public presentation, provider queue metadata, and the `sync_topdeck`
  capability.
- Renamed the events schema/migration contracts from Events/TopDeck to Events
  and removed provider sync table/columns from the planned active event schema.
- Replaced the package-level TopDeck adapter test scaffold with Square
  inventory adapter coverage.
- Updated active README/docs/test-plan text to match local events and Square
  inventory projection as the current scope.

### Why

The owner removed TopDeck from the current project scope. Keeping the provider
classes, sync table, queue flags, and credential-shaped docs would create false
implementation surface area and distract from the three active pillars: card
management, Square inventory projection, and offline app sync.

### Files Affected

- `apps/wordpress-plugin/src/Events/**`
- `apps/wordpress-plugin/src/Migrations/EventsSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0003Events.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/Offline/**`
- `apps/wordpress-plugin/src/Auth/CapabilityRegistry.php`
- `apps/wordpress-plugin/src/Settings/Settings.php`
- `apps/wordpress-plugin/tests/Unit/**`
- `fixtures/seed/development-data.json`
- `fixtures/mocks/topdeck/**`
- `packages/api-client/tests/square-inventory-adapter.md`
- `packages/sync-engine/**`
- `scripts/wp-env/**`
- `README.md`
- `docs/**`
- `tests/**`
- `REVISION_LOG.md`

### Migrations Added

- No new migration version was added.
- Planned migration version `3` was renamed from `events_topdeck` to `events`
  and its active schema contract no longer creates provider sync tables or
  provider columns.
- WordPress database target remains `9`.
- No offline app SQLite schema changes were made.

### Tests Added

- Event schema tests now assert the local event schema has no provider sync
  table or provider columns.
- Offline resolver, batch, canonical mutation, route-handler, and sync-engine
  tests now assert provider queue metadata is absent.
- Square inventory adapter package-level scaffold replaces the removed provider
  adapter scaffold.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 672 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 456 PHP files.
- `node packages/sync-engine/tests/offline-conflict-policy.mjs`: passed, 9
  tests.
- `npm.cmd run test`: passed local plugin, sync-engine, POS payment,
  offline-app, and required-matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `node scripts/wp-env/check-required-test-plan.mjs`: passed, 12/12 scaffold
  checks.
- `vendor/bin/phpcs --standard=phpcs.xml.dist src/Settings/Settings.php`:
  passed after removing provider credential shim.

### Rollback Notes

- Revert this revision to restore the previous provider adapter/scaffold and
  provider-shaped event schema planning.
- If staging has already applied the local-only event schema, restore from a
  pre-migration database backup before reintroducing provider event columns or
  sync tables.
- No production rollback applies because no production deployment is performed
  by Codex.

## 2026-06-07 - Card Management MVP Route And Parser Foundation

### What Changed

- Added planned inventory/card-search REST route contracts covering exact
  serialized inventory CRUD, reservation actions, movement, price locking,
  bulk intake, import/export, public search, reference search, inventory search,
  and version grouping.
- Added dependency-free inventory intake parsing for staff, offline, buylist,
  and ScryDex-import payloads with normalized card fields, exact-item pricing,
  visibility, IDs, condition/grading, and deferred WooCommerce/label side
  effects.
- Added dependency-free inventory search query parsing with normalized query,
  game, status, location, visibility, sort, and pagination filters.

### Why

The next project phase needs a stable card-management contract for the
WordPress admin surface, website search, offline app sync, and future
WooCommerce/Square inventory projection. These contracts and parsers can be
tested safely before enabling live route registration or database writes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/InventoryRouteContracts.php`
- `apps/wordpress-plugin/src/Inventory/InventoryIntakeParser.php`
- `apps/wordpress-plugin/src/Inventory/InventoryIntakeRequest.php`
- `apps/wordpress-plugin/src/Inventory/InventoryIntakeValidationResult.php`
- `apps/wordpress-plugin/src/Inventory/InventorySearchRequest.php`
- `apps/wordpress-plugin/src/Inventory/InventorySearchRequestParser.php`
- `apps/wordpress-plugin/src/Inventory/InventorySearchValidationResult.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteContractTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryIntakeParserTest.php`
- `apps/wordpress-plugin/tests/Unit/InventorySearchRequestParserTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No offline app SQLite schema changes were made.

### Tests Added

- Inventory route-contract tests for route count, permissions, default
  disabled state, and duplicate method/path protection.
- Inventory intake parser tests for raw staff intake, graded ScryDex-import
  intake, missing required fields, invalid IDs/visibility, and below-floor
  pricing.
- Inventory search parser tests for normalized filters, defaults, invalid
  filters, and page-size limits.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 692 tests.
- Targeted PHP_CodeSniffer over changed source files: passed.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 465 PHP
  files checked.
- `npm run test`: passed, including plugin unit tests, WordPress bootstrap
  smoke, PHP lint, sync-engine contracts, POS/payment contracts, offline app
  package/contracts, and test matrix coverage checks.

### Rollback Notes

- Revert this revision to remove the planned card-management route/parser
  surface without touching database schema.
- No database rollback is required.

## 2026-06-07 - CI Standards And WordPress Smoke Fix

### What Changed

- Ran the WordPress Coding Standards fixer over PHP files flagged by GitHub
  Actions and manually resolved remaining Yoda-condition and reserved-parameter
  warnings.
- Updated offline registered-device sync readiness so existing-operation-row
  route reads stay reported as deferred until route-connected reads are
  explicitly enabled, even inside an activated WordPress install with `$wpdb`.
- Applied the same route-dependency gate to handler-specific canonical mutation
  SQL readiness so real WordPress activation reports the SQL templates as
  staged, but default route-connected planning as unconfigured.

### Why

The new repository CI surfaced stricter WordPress Coding Standards checks than
the local syntax lint and a WordPress integration smoke mismatch between
component readiness and route-connected read/SQL planning execution. The plugin
should expose staged internals while keeping default route execution disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteValidationHandlerFactory.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationTransactionPreflightResult.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsQueryBuilder.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentLogPlanner.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentLogTransactionPreflightResult.php`
- Additional PHP files in the offline push and POS/payment readiness area were
  formatting-aligned by `phpcbf`.
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No offline app SQLite schema changes were made.

### Tests Added

- Added regression coverage for default offline push handler readiness when a
  WordPress database is configured but route-connected execution remains
  disabled.
- Existing WordPress integration smoke assertions now match route-read and SQL
  planning deferral behavior in an activated WordPress environment.

### Tests Run

- `vendor/bin/phpcs --standard=phpcs.xml.dist`
- `npm.cmd run test`

### Rollback Notes

- Revert this revision if CI standards enforcement is relaxed or if the offline
  push route-read readiness model changes in a later route activation phase.
- No database rollback is required.

## 2026-06-07 - TopDeck De-Scope And Square Payment Boundary

### What Changed

- Removed TopDeck from active requirements, staging/deployment checks, PR test
  matrix, Events docs, roadmap, and WordPress readme language.
- Hid TopDeck credential fields from the WordPress settings page.
- Stripped submitted TopDeck settings from sanitized platform settings and
  defaults so credentials are no longer accepted in active scope.
- Renamed the active feature flag label/key from `events_topdeck` to `events`.
- Made the legacy TopDeck registration queue planner disabled by default unless
  explicitly opted in by a future reviewed phase.
- Reframed POS/payment docs around the official WooCommerce Square extension
  owning payment capture, with this plugin limited to Woo order observation,
  masked references, fee snapshots, and exact serialized inventory
  reconciliation.
- Added ScryDex credential guidance for environment/deployment secrets or
  future WordPress settings only, never committed fixtures.
- Updated project, plugin, and offline app package versions to `0.155.0`.

### Why

The owner removed TopDeck from the current scope and clarified that Square
payments should use the existing WooCommerce Square extension rather than a
custom payment gateway. The project still needs POS/payment reconciliation and
inventory safeguards, but payment capture and external tournament providers
should not remain active development gates.

### Files Affected

- `.github/pull_request_template.md`
- `README.md`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/wordpress-plugin/src/Events/EventTopDeckRegistrationPlanner.php`
- `apps/wordpress-plugin/src/FeatureFlags/FeatureFlagRegistry.php`
- `apps/wordpress-plugin/src/Settings/Settings.php`
- `apps/wordpress-plugin/src/Settings/SettingsPage.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/Unit/EventTopDeckRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/FeatureFlagsTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushOperationResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/SettingsTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `packages/sync-engine/src/offlineConflictPolicy.mjs`
- `packages/sync-engine/tests/offline-conflict-policy.mjs`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT.md`
- `docs/EVENTS.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `docs/TOPDECK_INTEGRATION.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Updated `SettingsTest` to assert deferred TopDeck credentials are not
  accepted by active settings.
- Updated `EventTopDeckRegistrationPlannerTest` to assert provider queues are
  disabled by default and require explicit opt-in for legacy behavior.
- Updated offline sync policy tests so event reservations retain the
  compatibility `queueTopDeck` field but keep it false in active scope.
- Updated `FeatureFlagsTest` for the plain Events feature flag.

### Rollback Notes

- Revert this revision to restore TopDeck credential settings, active
  TopDeck-related docs/checklists, and default queue-planner behavior.
- No database rollback is required because no schema migration was added and
  the existing legacy provider tables remain untouched.
- Square payment capture continues to belong to the WooCommerce Square
  extension before and after rollback; no custom payment gateway was added.
- ScryDex credentials must still remain out of Git history and automated test
  fixtures.

## 2026-06-07 - POS Payment Dependency Read Gate Status

### What Changed

- Exposed POS/payment route-connected read deferral in dependency health
  payloads.
- Added an explicit `route_connected_reads_ready` health flag, currently false
  while default route-connected reads remain deferred.
- Updated the POS/payment dependency admin summary to render route, read, and
  write gate states from the dependency payload instead of hardcoded text.
- Added unit coverage for default and fully injected dependency health payloads
  proving read execution remains deferred and not ready.
- Updated project, plugin, and offline app package versions to `0.154.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  and revision docs.

### Why

Staging reviewers need to see the POS/payment read gate at the dependency
status layer, not only inside route registration plans. This makes configured
handlers, repository readiness, route registration deferral, read deferral, and
write deferral independently visible before any live routes are enabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteDependencyFactoryTest` assertions for route-connected read
  deferral and read-ready metadata.
- `PosPaymentRouteDependencyStatusPresenterTest` assertions for health/admin
  read gate status.

### Rollback Notes

- Revert this revision to remove POS/payment dependency health/admin read gate
  status and return the admin summary to static route/read/write text.
- No database rollback is required because no schema migration, default route
  registration, default route-connected read execution, write path, provider
  capture, provider inventory write service, webhook processing, or WooCommerce
  gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and default route-connected POS/payment
  reads and writes remain disabled before and after rollback.

## 2026-06-07 - POS Payment Route Read Deferral Gate

### What Changed

- Added `route_connected_reads_deferred` metadata to POS/payment route
  contracts.
- Updated POS/payment route registration planning so future GET routes are
  blocked while route-connected reads remain deferred.
- Updated POS/payment route readiness planning and bootstrap summaries to
  expose route-connected read deferral separately from write, transaction,
  capture, inventory, gateway, and webhook deferrals.
- Added unit coverage proving future fee snapshot GET routes remain blocked
  until the read gate is explicitly cleared, then can register with injected
  handlers and permissions.
- Updated project, plugin, and offline app package versions to `0.153.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  and revision docs.

### Why

Staging needs a separate safety gate for repository-backed POS/payment GET
routes. Handler and permission readiness alone should not make a future read
route registerable; the read execution gate must be explicitly cleared so
parser-only defaults cannot accidentally expose route-connected database reads.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteContracts.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteRegistrationPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteBootstrapPlanner.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteBootstrapPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteRegistrarTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteRegistrationPlannerTest` coverage for future GET route
  blocking while route-connected reads are deferred.
- `PosPaymentRouteReadinessPlannerTest` coverage for future GET route
  readiness blocking while route-connected reads are deferred.
- Updated bootstrap, dependency factory, and registrar fixtures to prove future
  read routes become registerable only when the read gate is explicitly
  cleared.

### Rollback Notes

- Revert this revision to remove the POS/payment route-connected read deferral
  gate and return GET route registration planning to handler/permission and
  route-registration gates only.
- No database rollback is required because no schema migration, default route
  registration, default route-connected read execution, write path, provider
  capture, provider inventory write service, webhook processing, or WooCommerce
  gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and default route-connected POS/payment
  reads and writes remain disabled before and after rollback.

## 2026-06-07 - POS Payment Fee Snapshot Handler Factory

### What Changed

- Added a staged POS/payment fee snapshot route handler factory for explicit
  repository-backed read tests.
- The factory reports database readiness, table-prefix readiness, handler
  readiness, default route deferrals, and configuration issues without enabling
  route-connected reads by default.
- Updated the POS/payment dependency factory so an explicitly injected fee
  snapshot handler factory can compose the repository-backed list callback for
  staging tests.
- Updated dependency status presentation to surface deferred fee handler
  readiness in admin summaries.
- Added unit coverage for default factory deferral, enabled repository-backed
  handler composition, dependency issue reporting, dependency-factory
  injection, and admin status metadata.
- Updated project, plugin, and offline app package versions to `0.152.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  and revision docs.

### Why

Phase 8 needs a narrow factory boundary that can prove route-connected
fee-snapshot reads in staging without turning default POS/payment routes live.
This revision makes the repository-backed handler injectable and auditable
while preserving parser-only defaults, route registration deferral, and all
write/capture safety gates.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentFeeSnapshotRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentFeeSnapshotRouteHandlerFactoryTest` coverage for default
  route-connected read deferral, explicitly enabled repository-backed handler
  composition, missing database/table-prefix dependency issues, and dependency
  factory injection.
- `PosPaymentRouteDependencyStatusPresenterTest` coverage for deferred fee
  handler readiness in admin summaries.

### Rollback Notes

- Revert this revision to remove the staged fee snapshot route handler factory
  and dependency-factory composition.
- No database rollback is required because no schema migration, default route
  registration, default route-connected read execution, write path, provider
  capture, provider inventory write service, webhook processing, or WooCommerce
  gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and default route-connected POS/payment
  reads and writes remain disabled before and after rollback.

## 2026-06-07 - POS Payment Fee Snapshot Route Handler

### What Changed

- Added an explicit staged POS/payment fee snapshot route handler for
  repository-backed read tests.
- The handler plans safe fee snapshot filters, calls the repository only when
  directly constructed/injected, returns normalized fee rows with repository
  audit metadata, and fails closed on invalid queries or repository rejection.
- Added unit coverage for successful handler reads, invalid query rejection
  before repository calls, and repository failure rejection.
- Updated project, plugin, and offline app package versions to `0.151.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  and revision docs.

### Why

Phase 8 needs an explicit route-handler boundary for staging tests before default
route registration can safely expose fee snapshot reads. This revision proves
the repository-backed read response shape while leaving the default route
factory parser-only and unregistered.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentFeeSnapshotRouteHandler.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentFeeSnapshotRouteHandlerTest` coverage for explicit
  repository-backed reads, invalid query rejection before repository calls, and
  repository failure rejection.

### Rollback Notes

- Revert this revision to remove the explicit staged fee snapshot route
  handler and keep fee snapshot reads at repository-adapter tests only.
- No database rollback is required because no schema migration, default route
  registration, default route-connected read execution, write path, provider
  capture, provider inventory write service, webhook processing, or
  WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and default route-connected POS/payment
  reads and writes remain disabled before and after rollback.

## 2026-06-07 - POS Payment Fee Snapshot Repository Readiness

### What Changed

- Added POS/payment fee snapshot repository readiness metadata to parser-only
  fee snapshot route validation responses.
- Added POS/payment dependency health/admin status fields for parser validation
  readiness, fee snapshot query planner/builder readiness, and staged fee
  snapshot repository adapter readiness.
- Added unit coverage proving an injected repository adapter is reported as
  staged while route validation keeps repository execution deferred and does
  not call `$wpdb`.
- Updated project, plugin, and offline app package versions to `0.150.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  and revision docs.

### Why

Staging needs visibility into whether the fee snapshot read adapter is
available before any live route-connected reads are enabled. This revision
surfaces that readiness without changing the default parser-only route
behavior or executing database reads from route callbacks.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteValidationHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotRepositoryReadinessTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentFeeSnapshotRepositoryReadinessTest` coverage for injected
  repository readiness metadata and proof that parser-only route validation
  does not call the staged `$wpdb` repository adapter.

### Rollback Notes

- Revert this revision to remove fee snapshot repository readiness metadata
  from parser-only route validation and dependency health/admin status.
- No database rollback is required because no schema migration, route
  registration, route-connected read execution, write path, provider capture,
  provider inventory write service, webhook processing, or WooCommerce gateway
  capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment reads
  and writes remain disabled before and after rollback.

## 2026-06-07 - POS Payment Fee Snapshot Repository Adapter

### What Changed

- Added an explicit POS/payment fee snapshot repository adapter for staged
  `$wpdb` read tests.
- The adapter executes only previously allowlisted fee snapshot SQL-template
  plans, validates the active database prefix, normalizes returned fee rows,
  and reports database or malformed-row failures through an audit payload.
- Added unit coverage for successful prepared reads, invalid source plans,
  table-prefix mismatch guards, database failures, and malformed rows.
- Updated project, plugin, and offline app package versions to `0.149.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  and revision docs.

### Why

Phase 8 needs a controlled repository boundary for payment fee review data
before any route-connected reads are enabled. This revision verifies the
`$wpdb` execution and normalization path in tests while keeping live REST
routes and production side effects disabled.

### Files Affected

- `apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotRepository.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotRepositoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentFeeSnapshotRepositoryTest` coverage for prepared `$wpdb` reads,
  normalized fee rows, invalid query-plan rejection before reads, table-prefix
  mismatch rejection, database failure rejection, and malformed row rejection.

### Rollback Notes

- Revert this revision to remove the staged fee snapshot repository adapter
  and return fee snapshot handling to SQL-template planning only.
- No database rollback is required because no schema migration, route
  registration, route-connected read execution, write path, provider capture,
  provider inventory write service, webhook processing, or WooCommerce gateway
  capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment reads
  and writes remain disabled before and after rollback.

## 2026-06-07 - POS Payment Fee Snapshot SQL Planning

### What Changed

- Added POS/payment fee snapshot SQL-template planning for future admin review
  reads.
- The builder converts safe fee snapshot query contracts into allowlisted
  prepared `SELECT` templates with provider, channel, currency, effective-date,
  and limit arguments.
- Parser-only fee snapshot list route responses now include SQL readiness and
  prepare-argument counts while leaving database reads deferred.
- Added unit coverage for filtered, unfiltered, invalid, and tampered SQL
  template planning.
- Updated project, plugin, and offline app package versions to `0.148.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  and revision docs.

### Why

Phase 8 needs a reviewable SQL boundary between safe fee snapshot filter
planning and any future repository execution. This revision creates that
boundary without enabling database reads, route registration, writes, provider
capture, provider inventory writes, or WooCommerce gateway capture.

### Files Affected

- `apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotQueryBuildPlan.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotQueryBuilder.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteValidationHandlerFactory.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteValidationHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentFeeSnapshotQueryBuilderTest` coverage for prepared SQL templates,
  unfiltered default reads, invalid query plans, and tampered table/column/order
  inputs.
- `PosPaymentRouteValidationHandlerFactoryTest` coverage for fee snapshot SQL
  readiness and prepare-argument metadata.

### Rollback Notes

- Revert this revision to remove staged fee snapshot SQL-template planning and
  return the parser-only fee snapshot list route to query-contract metadata
  only.
- No database rollback is required because no schema migration, database read
  execution, route registration, write path, provider capture, provider
  inventory write service, webhook processing, or WooCommerce gateway capture
  was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment reads
  and writes remain disabled before and after rollback.

## 2026-06-07 - POS Payment Fee Snapshot Query Planning

### What Changed

- Added staged POS/payment fee snapshot query planning for future admin review
  reads.
- The planner normalizes provider, channel, currency, effective-date, and
  page-size filters while keeping read execution deferred.
- Parser-only fee snapshot list route responses now include a safe query
  contract instead of only echoing raw request filters.
- Added unit coverage for accepted query plans, rejected filter/prefix plans,
  and fee snapshot route validation metadata.
- Updated project, plugin, and offline app package versions to `0.147.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  and revision docs.

### Why

Phase 8 needs a safe read-planning layer before staged admin review screens can
inspect payment fee assumptions. This revision adds the allowlisted query
contract without enabling route registration, database reads, writes, provider
capture, provider inventory writes, or WooCommerce gateway capture.

### Files Affected

- `apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotQueryPlan.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotQueryPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteValidationHandlerFactory.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotQueryPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteValidationHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentFeeSnapshotQueryPlannerTest` coverage for safe query contracts and
  rejected tampered filter/prefix inputs.
- `PosPaymentRouteValidationHandlerFactoryTest` coverage for fee snapshot
  route query metadata and deferred read execution.

### Rollback Notes

- Revert this revision to remove staged fee snapshot query planning and return
  the parser-only fee snapshot list route to basic filter validation.
- No database rollback is required because no schema migration, database read
  execution, route registration, write path, provider capture, provider
  inventory write service, webhook processing, or WooCommerce gateway capture
  was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment reads
  and writes remain disabled before and after rollback.

## 2026-06-07 - POS Payment Dependency-Backed Bootstrap Wiring

### What Changed

- Updated WordPress plugin bootstrap to register the POS/payment route
  bootstrapper from `PosPaymentRouteDependencyFactory`.
- The POS/payment bootstrap lifecycle now shares the staged parser-only
  controller, permission callback factory, registration planner, and guarded
  registrar.
- Added unit coverage proving a future explicitly enabled read route can be
  registered by the dependency-backed bootstrapper in tests.
- Default WordPress smoke coverage still proves POS/payment REST routes remain
  absent after `rest_api_init`.
- Updated project, plugin, and offline app package versions to `0.146.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

The parser-only handlers are now available through the dependency factory, so
the lifecycle bootstrap should use that same assembly path. This keeps future
staging route registration checks realistic without exposing any current
POS/payment route.

### Files Affected

- `apps/wordpress-plugin/src/Bootstrap/Plugin.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteDependencyFactoryTest` coverage for dependency-backed
  bootstrap registration of a future explicitly enabled read route.
- Existing WordPress smoke coverage continues to prove current POS/payment
  routes are absent after `rest_api_init`.

### Rollback Notes

- Revert this revision to return POS/payment bootstrap wiring to the previous
  default bootstrapper assembly.
- No database rollback is required because no schema migration, default live
  route registration, provider capture, provider inventory write service,
  webhook processing, or WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-07 - POS Payment Route Validation Handlers

### What Changed

- Added `PosPaymentRouteValidationHandlerFactory` with parser-only handlers for
  every planned POS/payment route callback.
- POS event ingestion and provider webhook handlers validate normalized
  transaction plans through `PosPaymentLogPlanner` while deferring log writes.
- Status, reconciliation, conflict, and fee-snapshot handlers validate request
  shape while keeping reads/writes deferred.
- `PosPaymentRouteDependencyFactory` now uses parser-only validation handlers
  by default, so controller handler readiness is staged without exposing live
  routes.
- Updated WordPress smoke coverage to expect staged parser-only controller
  handlers while POS/payment dependencies remain blocked by missing webhook
  verifier and route/write deferrals.
- Added unit coverage for every parser-only handler, default dependency
  handler wiring, and deferred validation responses.
- Updated project, plugin, and offline app package versions to `0.145.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

The POS/payment dependency status can now report controller readiness. This
revision gives that controller safe parser-only handlers so staging can inspect
request validation paths before any route is registered or any write/capture
path is enabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteValidationHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyFactory.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteValidationHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteValidationHandlerFactoryTest` coverage for every planned
  handler, valid/invalid transaction plans, provider webhook route parameters,
  status and conflict reads, reconciliation/conflict write validation, and
  fee-snapshot validation.
- Updated dependency factory/status tests for parser-only default handler
  readiness.
- WordPress smoke coverage for staged parser-only POS/payment handlers.

### Rollback Notes

- Revert this revision to remove parser-only POS/payment route validation
  handlers, dependency readiness changes, tests, and version/doc updates.
- No database rollback is required because no schema migration, live route
  registration, provider capture, provider inventory write service, webhook
  handler execution, or WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-07 - POS Payment Route Dependency Status

### What Changed

- Added `PosPaymentRouteDependencyFactory` for staged POS/payment controller,
  permission callback, registration planner, registrar, and bootstrapper
  dependency assembly.
- Added `PosPaymentRouteDependencyStatusPresenter` for health/admin readiness
  summaries.
- Authenticated health now reports `pos_payment_route_dependencies` with
  handler counts, permission callback counts, webhook verifier state,
  registrar/bootstrapper readiness, route deferral, write deferral, and
  configuration issues.
- Admin System Status now displays a POS/payment route dependencies row.
- Added unit coverage for default blocked dependencies, fully injected staged
  dependencies, injected controller dispatch, permission callback types, and
  admin summary text.
- Added WordPress smoke coverage proving default POS/payment dependencies
  remain blocked while capability callbacks are available inside WordPress and
  webhook/handler dependencies remain unconfigured.
- Updated project, plugin, and offline app package versions to `0.144.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

The POS/payment bootstrapper is wired, but staging also needs a clear view of
which route dependencies are assembled before any future endpoint can be made
live. This revision exposes that readiness without enabling route registration
or route-connected writes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteDependencyFactoryTest` coverage for default blocked
  dependencies, fully injected staged dependencies, injected controller
  dispatch, and permission callback types.
- `PosPaymentRouteDependencyStatusPresenterTest` coverage for health payloads,
  admin summary text, and ready injected dependency summaries.
- WordPress smoke coverage for blocked default POS/payment route dependencies.

### Rollback Notes

- Revert this revision to remove POS/payment route dependency status,
  health/admin presentation, tests, and version/doc updates.
- No database rollback is required because no schema migration, live route
  registration, provider capture, provider inventory write service, webhook
  handler, or WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-07 - POS Payment Route Bootstrapper Wiring

### What Changed

- Added `PosPaymentRouteBootstrapper` for POS/payment route bootstrap
  orchestration.
- Wired the POS/payment route bootstrapper to WordPress `rest_api_init` at
  priority `21`, after the offline route bootstrapper.
- Added unit coverage proving the bootstrapper does not call the registrar
  while the POS/payment feature flag is disabled, while current route plans are
  gated, or while a future-ready plan is feature-blocked.
- Added unit coverage proving future ready registration plans call the injected
  registrar exactly when the feature flag and route plan are ready.
- Added WordPress smoke coverage proving the hook is registered and default
  POS/payment routes remain absent after `rest_api_init`.
- Updated project, plugin, and offline app package versions to `0.143.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

The POS/payment route bootstrap status can now be inspected, but the actual
bootstrap hook also needs to exist in WordPress so staging can verify lifecycle
wiring before any live route is allowed. This revision adds that hook while
preserving the current zero-route default state.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteBootstrapper.php`
- `apps/wordpress-plugin/src/Bootstrap/Plugin.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteBootstrapperTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteBootstrapperTest` coverage for disabled feature-gate
  deferral, gated current route plans, future-ready registrar execution, and
  feature-blocked future-ready plans.
- WordPress smoke coverage for the POS/payment `rest_api_init` bootstrapper
  hook while POS/payment REST routes remain unregistered by default.

### Rollback Notes

- Revert this revision to remove POS/payment bootstrapper wiring, tests, and
  version/doc updates.
- No database rollback is required because no schema migration, live route
  registration, provider capture, provider inventory write service, webhook
  handler, or WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-06 - POS Payment Route Bootstrap Status

### What Changed

- Added `PosPaymentRouteBootstrapPlanner` for POS/payment route-registration
  orchestration planning.
- Added `PosPaymentRouteBootstrapStatusPresenter` for health/admin
  blocked/gated/ready status payloads.
- Authenticated health now reports `pos_payment_route_bootstrap` with feature
  status, planned/registerable route counts, route keys, registration deferral,
  route-registration summary, and bootstrap block reasons.
- Admin System Status now displays a POS/payment route bootstrap row.
- Added unit coverage for disabled-feature blocking, feature-enabled gating,
  future-ready registration plans, health payloads, and admin summary text.
- Added WordPress smoke coverage proving POS/payment route bootstrap remains
  blocked with zero registerable routes by default.
- Updated project, plugin, and offline app package versions to `0.142.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

The guarded registrar exists, but staging needs explicit bootstrap visibility
before any future route registration is wired to lifecycle hooks. This
revision adds that inspection layer without changing current route exposure.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteBootstrapPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteBootstrapStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteBootstrapPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteBootstrapStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteBootstrapPlannerTest` coverage for disabled-feature blocking,
  feature-enabled no-route gating, future registerable route visibility, and
  ready bootstrap plans.
- `PosPaymentRouteBootstrapStatusPresenterTest` coverage for health payloads
  and admin summary formatting.
- WordPress smoke coverage for `pos_payment_route_bootstrap` blocked defaults.

### Rollback Notes

- Revert this revision to remove POS/payment route bootstrap planning,
  health/admin presentation, tests, and version/doc updates.
- No database rollback is required because no schema migration, live route
  registration, provider capture, provider inventory write service, webhook
  handler, or WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-06 - POS Payment Guarded Route Registrar

### What Changed

- Added `PosPaymentRouteRegistrar` for guarded POS/payment REST route
  registration.
- The registrar consumes only `PosPaymentRouteRegistrationPlanner` plans whose
  `should_register` flag is true.
- Registered route args include the planned namespace, path, HTTP method,
  injected controller callback, and fail-closed permission callback.
- Current default POS/payment route contracts still produce zero enabled route
  registrations.
- Added `PosPaymentRouteRegistrarTest` coverage for default disabled routes,
  future enabled read routes, missing permission callbacks, missing injected
  controller handlers, deferred write-route gates, future write routes, and
  future webhook routes with signature/webhook gates.
- Updated project, plugin, and offline app package versions to `0.141.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

The route registration planner now defines when POS/payment routes may become
registerable. This revision adds the registrar boundary that future staging
phases can call after those gates are satisfied, while preserving zero live
route registration for the current default configuration.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteRegistrar.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteRegistrarTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteRegistrarTest` coverage for guarded route registration,
  disabled defaults, future enabled read/write/webhook routes, missing
  permission callbacks, missing controller handlers, deferred write gates, and
  signature/webhook gate requirements.

### Rollback Notes

- Revert this revision to remove the POS/payment guarded route registrar,
  tests, and version/doc updates.
- No database rollback is required because no schema migration, default live
  route registration, provider capture, provider inventory write service,
  webhook handler, or WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-06 - POS Payment Route Registration Planning

### What Changed

- Added `PosPaymentRouteRegistrationPlanner` for planned POS/payment REST route
  registration metadata.
- Default route plans stay locked with `__return_false` permissions, no
  controller callbacks, route-registration deferral, and zero enabled route
  registrations.
- Registration plans now report permission callback readiness, controller
  callback readiness, route-registration deferral, route-connected write
  deferral, webhook-registration deferral, transaction execution deferral,
  provider capture deferral, provider inventory write deferral, and
  WooCommerce gateway capture deferral.
- Future read routes can only produce enabled route args after route
  registration deferral is cleared and permission/controller callbacks are
  ready.
- Future write routes also require route-connected write deferral to be
  cleared, and future webhook routes require both a configured signature
  verifier and cleared webhook-registration deferral.
- Added `PosPaymentRouteRegistrationPlannerTest` coverage for default locked
  routes, capability permission metadata, webhook verifier readiness, injected
  controller handlers, future read/write/webhook enablement gates, and public
  permission-bypass prevention.
- Updated project, plugin, and offline app package versions to `0.140.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

The POS/payment route contracts, permissions, readiness diagnostics, and
controller callbacks now exist. This revision adds the guarded registration
planning layer so future route registrars have a testable contract before any
live REST endpoint is exposed.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteRegistrationPlanner.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteRegistrationPlannerTest` coverage for planned registration
  args, disabled defaults, injected permission callback readiness, injected
  controller handler readiness, future read route enablement, future write
  route write-deferral blocking, future webhook deferral blocking, and public
  permission-bypass prevention.

### Rollback Notes

- Revert this revision to remove the POS/payment route registration planner,
  tests, and version/doc updates.
- No database rollback is required because no schema migration, live route
  registration, provider capture, provider inventory write service, webhook
  handler, or WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-06 - POS Payment Controller Scaffold

### What Changed

- Added `PosPaymentController` with fail-closed callbacks for every planned
  POS/payment route contract.
- Default controller responses report disabled status plus route registration,
  route-connected write, transaction execution, provider capture, provider
  inventory write, webhook registration, and WooCommerce gateway capture
  deferrals.
- POS/payment route readiness can now consume an injected controller and report
  controller handler counts and route keys.
- Added `PosPaymentControllerTest` coverage for planned callback exposure,
  disabled default responses, injected handler dispatch with normalized request
  data, handler readiness, and unhandled callback safety.
- Updated project, plugin, and offline app package versions to `0.139.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

The planned POS/payment routes have contracts, readiness diagnostics, and
permissions. This revision adds the controller boundary those future route
registrars can target, while keeping default execution disabled and preserving
explicit test-only handler injection.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentController.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessPlanner.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentControllerTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability target remains `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentControllerTest` coverage for every planned callback, fail-closed
  disabled defaults, injected handler dispatch, request normalization, and
  handler readiness.
- `PosPaymentRouteReadinessPlannerTest` coverage for injected controller
  handler readiness.

### Rollback Notes

- Revert this revision to remove the POS/payment controller scaffold, readiness
  integration, tests, and version/doc updates.
- No database rollback is required because no schema migration, live route
  registration, provider capture, provider inventory write service, webhook
  handler, or WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-06 - POS Payment Route Permission Callbacks

### What Changed

- Added `PosPaymentCapabilityPermissionCallbackAdapter`,
  `PosPaymentWebhookPermissionCallbackAdapter`, and
  `PosPaymentRoutePermissionCallbackFactory`.
- Added manager/system-only `manage_pos` to the capability registry and bumped
  the role version so existing installs can receive the capability during
  `RoleManager::maybe_install()`.
- POS/payment route readiness can now consume an injected permission callback
  factory and report callback counts, callback keys, and webhook verifier
  readiness.
- Added unit coverage for POS/payment capability maps, webhook route keys,
  fail-closed missing checkers, capability authorization, webhook signature
  verifier behavior, exception handling, and readiness integration.
- Updated WordPress smoke coverage to assert role version `2`, manager
  `manage_pos`, and staff `manage_pos` exclusion.
- Updated project, plugin, and offline app package versions to `0.138.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

The planned POS/payment routes need a permission boundary before any future
route registration work. This revision adds that boundary while preserving the
current fail-closed behavior: no configured checker means no capability
callback, and no injected verifier means no webhook callback.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentCapabilityPermissionCallbackAdapter.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentWebhookPermissionCallbackAdapter.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRoutePermissionCallbackFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessPlanner.php`
- `apps/wordpress-plugin/src/Auth/CapabilityRegistry.php`
- `apps/wordpress-plugin/src/Auth/RoleManager.php`
- `apps/wordpress-plugin/tests/Unit/CapabilityRegistryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- Role capability version target is now `2`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRoutePermissionCallbackFactoryTest` coverage for capability maps,
  webhook route keys, missing-checker fail-closed behavior, capability
  authorization, webhook verifier behavior, and exception fail-closed behavior.
- `CapabilityRegistryTest` coverage for manager/system-only `manage_pos`.
- `PosPaymentRouteReadinessPlannerTest` coverage for injected permission
  factory readiness.
- WordPress smoke role assertions for role version `2`, manager `manage_pos`,
  and staff `manage_pos` exclusion.

### Rollback Notes

- Revert this revision to remove POS/payment permission callback adapters,
  factory, role-capability updates, readiness integration, tests, and
  version/doc updates.
- No database rollback is required because no schema migration, live route
  registration, provider capture, provider inventory write service, webhook
  handler, or WooCommerce gateway capture was added.
- If this revision has run on staging and rollback removes `manage_pos`, rerun
  role installation from the restored code or remove `manage_pos` manually from
  manager/admin/shop-manager roles during the rollback checklist.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-06 - POS Payment Route Readiness Diagnostics

### What Changed

- Added `PosPaymentRouteReadinessPlanner` and
  `PosPaymentRouteReadinessStatusPresenter`.
- Health and admin System Status now expose POS/payment route readiness for
  planned webhook, event ingestion, reconciliation, conflict, and fee-snapshot
  routes.
- Readiness metadata reports feature gating, planned/registerable route counts,
  route-handler readiness, permission-callback readiness, transaction executor
  readiness, webhook verifier readiness, and provider/capture/inventory/gateway
  deferrals.
- Added unit and WordPress smoke coverage proving POS/payment routes remain
  unregistered by default.
- Updated project, plugin, and offline app package versions to `0.137.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

Phase 8 now has planned POS/payment REST contracts, but staging needs a visible
readiness surface before any route can be safely registered. This revision makes
the current blockers explicit while preserving the safety boundary: no route
registration, no webhooks, no provider capture, no provider inventory writes,
and no WooCommerce gateway capture.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteReadinessPlannerTest` coverage for default blocked
  readiness, feature-enabled gated status, future read-only readiness, future
  write-route transaction requirements, and webhook verifier requirements.
- `PosPaymentRouteReadinessStatusPresenterTest` coverage for health payload and
  admin summary output.
- WordPress smoke assertions that POS/payment routes remain unregistered while
  health exposes blocked readiness metadata.

### Rollback Notes

- Revert this revision to remove POS/payment route readiness diagnostics,
  tests, health/admin output, and version/doc updates.
- No database rollback is required because no schema migration, live route
  registration, provider capture, provider inventory write service, webhook
  handler, or WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-06 - POS Payment Planned Route Contracts

### What Changed

- Added `PosPaymentRouteContracts` for planned POS/payment REST endpoints.
- Planned contracts now cover POS event ingestion, POS event lookup,
  reconciliation runs, conflict review, conflict resolution, provider webhook
  intake, payment fee snapshot listing, and payment fee snapshot creation.
- Added disabled-by-default metadata for route registration, route-connected
  writes, transaction execution, provider capture, provider inventory writes,
  webhook registration, and WooCommerce gateway capture.
- Added `PosPaymentRouteContractTest`.
- Updated project, plugin, and offline app package versions to `0.136.0`.
- Updated project, plugin, payments/POS, staging, testing, roadmap, changelog,
  architecture, and revision docs.

### Why

Phase 8 now has staged execution components for POS/payment logs. This revision
defines the REST surface those components will eventually sit behind, while
preserving the current production safety boundary: no route registration, no
provider webhooks, no payment capture, no provider inventory writes, and no
WooCommerce gateway capture.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteContracts.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteContractTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentRouteContractTest` coverage for disabled-by-default route
  registration, expected permissions, route/provider/capture deferrals, and
  unique workflow labels.

### Rollback Notes

- Revert this revision to remove the planned POS/payment route contracts,
  tests, and version/doc updates.
- No database rollback is required because no schema migration, live route
  registration, provider capture, provider inventory write service, webhook
  handler, or WooCommerce gateway capture was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation services, and route-connected POS/payment writes
  remain disabled before and after rollback.

## 2026-06-06 - POS Payment Log Transaction Executor

### What Changed

- Added `PosPaymentLogTransactionExecutor` and
  `PosPaymentLogTransactionExecutionResult`.
- The executor wraps preflight-approved POS/payment log repository execution in
  explicit `START TRANSACTION`, `COMMIT`, and `ROLLBACK` commands.
- Added safeguards for invalid query plans, blocked preflights, transaction
  begin failures, repository execution failures, commit failures, rollback
  outcomes, repository affected-row audit metadata, and idempotency-key
  summaries.
- Updated project, plugin, and offline app package versions to `0.135.0`.
- Updated project, plugin, payments/POS, staging, database, testing, roadmap,
  changelog, architecture, and revision docs.

### Why

Phase 8 now has POS/payment log planning, SQL-template planning, repository
staging, execution gating, transaction preflight, and explicit repository
execution. This revision adds the staged transaction boundary needed to prove
that durable POS/payment log writes can be committed or rolled back as one unit
without enabling live route writes, provider capture, provider inventory
writes, payment webhooks, or WooCommerce gateway capture.

### Files Affected

- `apps/wordpress-plugin/src/Payments/PosPaymentLogTransactionExecutor.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentLogTransactionExecutionResult.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentLogTransactionExecutorTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentLogTransactionExecutorTest` coverage for successful transaction
  commit, blocked preflight rejection before transaction start, transaction
  begin failure rejection, repository execution failure rollback, and commit
  failure rollback.

### Rollback Notes

- Revert this revision to remove the POS/payment log transaction executor
  classes, tests, and version/doc updates.
- No database rollback is required because no schema migration, route wiring,
  provider capture, provider inventory write service, webhook route, or
  WooCommerce gateway capture was added.
- If staged transaction tests committed log rows before rollback, export or
  truncate only the staged `tcg_pos_sync_log` and
  `tcg_payment_provider_log` rows created by that test run.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation route services, and route-connected POS/payment
  writes remain disabled before and after rollback.

## 2026-06-06 - POS Payment Log Execution Repository

### What Changed

- Added `PosPaymentLogExecutionRepository` and
  `PosPaymentLogExecutionRepositoryResult`.
- The repository executes preflight-approved POS/payment SQL-template plans
  through an explicitly provided `$wpdb` adapter.
- Added safeguards for invalid query plans, non-ready preflights, table-prefix
  mismatches, failed inserts, invalid affected-row counts, partial affected-row
  summaries, idempotency key summaries, and secret-free audit metadata.
- Updated project, plugin, and offline app package versions to `0.134.0`.
- Updated project, plugin, payments/POS, staging, database, testing, roadmap,
  changelog, architecture, and revision docs.

### Why

The POS/payment path now has planning, SQL templates, repository staging,
execution gating, and transaction preflight metadata. This revision adds the
first explicit staged write boundary for durable POS/payment log rows while
keeping live route wiring, provider capture, provider inventory writes,
webhook routes, and WooCommerce gateway capture disabled.

### Files Affected

- `apps/wordpress-plugin/src/Payments/PosPaymentLogExecutionRepository.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentLogExecutionRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentLogExecutionRepositoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentLogExecutionRepositoryTest` coverage for successful prepared POS
  sync and payment provider inserts, blocked preflight rejection before
  database access, invalid query-plan rejection, table-prefix mismatch
  rejection, failed payment insert rejection, and partial affected-row counts.

### Rollback Notes

- Revert this revision to remove the POS/payment log execution repository
  classes, tests, and version/doc updates.
- No database rollback is required because no schema migration, route wiring,
  provider capture, or inventory write service was added.
- If this repository was explicitly invoked in staging before rollback, export
  or truncate only the staged `tcg_pos_sync_log` and
  `tcg_payment_provider_log` rows created by that test run.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation route services, and route-connected POS/payment
  writes remain disabled before and after rollback.

## 2026-06-06 - POS Payment Log Transaction Preflight

### What Changed

- Added `PosPaymentLogTransactionPreflight` and
  `PosPaymentLogTransactionPreflightResult`.
- The preflight layer evaluates deferred POS/payment repository results after
  the repository execution gate.
- Added metadata for inherited execution-gate blocks, supported POS sync and
  payment provider insert query kinds, unsupported query-kind blocking, log
  counts, idempotency keys, zero affected rows, and deferred transaction
  execution.
- Updated project, plugin, and offline app package versions to `0.133.0`.
- Updated project, plugin, payments/POS, staging, database, testing, roadmap,
  changelog, architecture, and revision docs.

### Why

The POS/payment path now has repository staging and a gate, but a future
transaction executor still needs a final preflight boundary. This revision
adds that inspection point so staging can see whether POS/payment log inserts
would be transaction-ready while live inserts, provider capture, route writes,
and inventory mutations remain disabled.

### Files Affected

- `apps/wordpress-plugin/src/Payments/PosPaymentLogTransactionPreflight.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentLogTransactionPreflightResult.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentLogTransactionPreflightTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentLogTransactionPreflightTest` coverage for inherited default
  execution-gate blocks, explicit ready status when the gate is open,
  unsupported query-kind blocking, and rejected repository staging.

### Rollback Notes

- Revert this revision to remove the POS/payment transaction preflight classes,
  tests, and version/doc updates.
- No database rollback is required because no schema migration, `$wpdb`
  execution, live route wiring, provider capture, or inventory write service
  was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation write services, POS/payment repository execution,
  and POS/payment transaction execution remain disabled before and after
  rollback.

## 2026-06-06 - POS Payment Log Repository Gate

### What Changed

- Added `PosPaymentLogRepository` and `PosPaymentLogRepositoryResult`.
- Added `PosPaymentLogRepositoryExecutionGate` and
  `PosPaymentLogRepositoryExecutionResult`.
- Repository staging now converts valid POS/payment SQL build plans into
  deferred per-query repository result metadata for POS sync and payment
  provider inserts.
- Execution-gate metadata now reports blocked, ready, and rejected states with
  explicit execution requirements, transaction-adapter deferral, no-query
  blocking, zero affected rows, idempotency key summaries, and source audit
  payloads.
- Updated project, plugin, and offline app package versions to `0.132.0`.
- Updated project, plugin, payments/POS, staging, database, testing, roadmap,
  changelog, architecture, and revision docs.

### Why

Phase 8 now has POS/payment schema, log payload planning, and SQL-template
planning. This revision adds the next staging boundary before any live
repository write can exist: staged plans can be inspected through a repository
result and an execution gate while `$wpdb` inserts, provider capture, route
writes, and inventory mutations remain disabled.

### Files Affected

- `apps/wordpress-plugin/src/Payments/PosPaymentLogRepository.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentLogRepositoryResult.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentLogRepositoryExecutionGate.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentLogRepositoryExecutionResult.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentLogRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentLogRepositoryExecutionGateTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentLogRepositoryTest` coverage for accepted repository staging,
  idempotency key summaries, prepare-argument counts, zero affected rows, empty
  valid query plans, and invalid query-plan rejection.
- `PosPaymentLogRepositoryExecutionGateTest` coverage for default blocked
  gates, explicit ready gates, no-query blocking, and rejected repository
  staging.

### Rollback Notes

- Revert this revision to remove the POS/payment repository staging and
  execution-gate classes, tests, and version/doc updates.
- No database rollback is required because no schema migration, `$wpdb`
  execution, live route wiring, provider capture, or inventory write service
  was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation write services, and POS/payment repository
  execution remain disabled before and after rollback.

## 2026-06-06 - POS Payment Log SQL Planning

### What Changed

- Added `PosPaymentLogQueryBuilder` and `PosPaymentLogQueryBuildPlan`.
- The builder validates planned POS/payment log rows and emits deferred
  `INSERT` SQL templates for `tcg_pos_sync_log` and
  `tcg_payment_provider_log`.
- Added query metadata for table names, idempotency keys, reconciliation
  statuses, payment operations, prepare-argument counts, and deferred
  repository execution.
- Added validation for table prefixes, UUID public IDs, provider/channel
  identifiers, payment operations, currency, JSON payloads, timestamps,
  idempotency keys, row versions, failed source plans, and tampered rows.
- Updated project, plugin, and offline app package versions to `0.131.0`.
- Updated project, plugin, payments/POS, staging, database, testing, roadmap,
  changelog, architecture, and revision docs.

### Why

Phase 8 now has normalized sandbox ingestion, durable schema, and row payload
planning. This revision adds the next explicit staging boundary: reviewers can
inspect the exact prepared SQL templates that future repositories would execute
while live provider calls, payment capture, database writes, and inventory
mutations remain disabled.

### Files Affected

- `apps/wordpress-plugin/src/Payments/PosPaymentLogQueryBuildPlan.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentLogQueryBuilder.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentLogQueryBuilderTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentLogQueryBuilderTest` coverage for accepted sale insert templates,
  conflict summary insert templates, prepare-argument counts, table-prefix
  validation, failed source plan rejection, tampered POS rows, tampered payment
  rows, JSON validation, timestamp validation, and idempotency key validation.

### Rollback Notes

- Revert this revision to remove the POS/payment SQL-template builder classes,
  tests, and version/doc updates.
- No database rollback is required because no schema migration, repository
  execution, or write service was added.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, POS reconciliation write services, and POS/payment repository
  execution remain disabled before and after rollback.

## 2026-06-06 - POS Payment Log Planning

### What Changed

- Added `PosPaymentLogPlanner` and `PosPaymentLogPlan`.
- The planner converts normalized sandbox POS transaction-ingestion outcomes
  into redacted payment provider log rows, per-line POS sync rows,
  conflict/replay summary rows, deterministic idempotency keys, and audit
  metadata.
- Added coverage for accepted sales, unmapped-line conflicts, duplicate-event
  replay summaries, raw request/response redaction, and missing required fields.
- Updated project, plugin, and offline app package versions to `0.130.0`.
- Updated project, plugin, payments/POS, staging, database, testing, roadmap,
  changelog, and revision docs.

### Why

Phase 8 now has schema and sandbox ingestion contracts. This revision adds the
next safe boundary: staging can inspect the exact rows that would be written for
payment/POS reconciliation without inserting them, capturing payments, calling
providers, or mutating serialized inventory.

### Files Affected

- `apps/wordpress-plugin/src/Payments/PosPaymentLogPlan.php`
- `apps/wordpress-plugin/src/Payments/PosPaymentLogPlanner.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentLogPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None.
- WordPress database target remains `9`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentLogPlannerTest` coverage for sale reconciliation row planning,
  conflict summary planning, duplicate-event replay summaries, redacted raw
  payment payloads, and missing required field failures.

### Rollback Notes

- Revert this revision to remove the POS/payment log planner classes, tests,
  and version/doc updates.
- No database rollback is required because no schema migration or write service
  was added. If reverting together with the prior POS/payment schema migration,
  roll back to target `8` in a controlled maintenance window.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, and POS reconciliation write services remain disabled before and
  after rollback.

## 2026-06-06 - POS Payment Schema Migration

### What Changed

- Added `PosPaymentSchema` with dbDelta-compatible tables for POS sync logs,
  payment provider logs, and payment fee snapshots.
- Added reversible migration `Version0009PosPayments`.
- Wired migration `9` into `MigrationRunner` and updated the WordPress
  database target to `9`.
- Added schema tests for POS provider idempotency, inventory mapping,
  reconciliation status indexes, masked payment provider payload fields,
  effective-dated fee snapshot configuration, dbDelta compatibility, and
  rollback drop order.
- Updated WordPress smoke coverage to require the POS/payment tables and schema
  target `9`.
- Updated project, plugin, and offline app package versions to `0.129.0`.
- Updated project, plugin, database, payments/POS, testing, roadmap, changelog,
  and revision docs.

### Why

Phase 8 now has a contract for sandbox transaction ingestion, but staging also
needs durable tables for idempotent POS reconciliation logs, masked provider
transaction records, and effective-dated fee assumptions. This revision adds
only the schema and planning boundary; no live provider routes or write
services are enabled.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/PosPaymentSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0009PosPayments.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentSchemaTest.php`
- `apps/wordpress-plugin/tests/Unit/MigrationRunnerPlanTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- Added WordPress database migration `0009_pos-payments`.
- New tables: `tcg_pos_sync_log`, `tcg_payment_provider_log`, and
  `tcg_payment_fee_snapshots`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `PosPaymentSchemaTest` coverage for all three tables, required fields,
  idempotency/index contracts, dbDelta compatibility, and drop order.
- Migration runner plan coverage for clean install, prior-schema upgrade, and
  rollback including migration `9`.
- WordPress smoke assertions for plugin version `0.129.0`, database target `9`,
  and expected POS/payment tables.

### Rollback Notes

- Revert this revision to remove the POS/payment schema migration and database
  target bump.
- If migration `9` has been applied in staging, roll back to target `8` in a
  controlled maintenance window. That drops `tcg_payment_fee_snapshots`,
  `tcg_payment_provider_log`, and `tcg_pos_sync_log`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, payment webhook route registration, WooCommerce gateway
  capture, and POS reconciliation write services remain disabled before and
  after rollback.

## 2026-06-06 - POS Transaction Ingestion Contract

### What Changed

- Added POS adapter event normalization for sandbox provider events, event
  IDs, event types, provider modes, external order references, and deferred
  production-write metadata.
- Added `planPosTransactionIngestion` to route sale and refund events through
  existing scan-gated reconciliation policy while preserving idempotency and
  replay behavior.
- Added configurable POS fee-estimate comparison helpers that use explicit
  fixture configuration and report that no hardcoded provider rates were used.
- Added sandbox POS sale/refund event fixtures and fee-comparison fixtures.
- Expanded POS/payment Node tests for event ingestion, replay, durable
  conflicts, invalid event IDs, refund ingestion, and fee comparison.
- Updated project, plugin, and offline app package versions to `0.128.0`.
- Updated project, plugin, payments/POS, testing, architecture, roadmap, and
  changelog docs.

### Why

Phase 8 needs a safe adapter boundary before live Square/POS webhooks or
provider connections can be considered. This revision pins the idempotent
transaction-ingestion contract against sanitized sandbox fixtures, keeps
provider inventory writes blocked, and makes configurable fee comparison
testable without embedding live provider rates.

### Files Affected

- `packages/validation/src/posPaymentPolicy.mjs`
- `packages/validation/tests/pos-payment-policy.mjs`
- `fixtures/mocks/pos/payment-responses.json`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- POS transaction ingestion tests for scan-gated sale transitions, provider
  event idempotency keys, replayed event suppression, unmapped provider-line
  conflicts, invalid event ID rejection, and refund-to-review behavior.
- POS fee comparison test coverage for explicit sandbox rate fixtures and
  `hardcodedRatesUsed: false`.

### Rollback Notes

- Revert this revision to remove POS transaction-ingestion contracts,
  fee-estimate helpers, sandbox fixtures, and tests.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live Square/POS network calls, production payment capture, provider
  inventory writes, webhook route registration, WooCommerce gateway capture,
  and stored POS reconciliation logs remain disabled before and after
  rollback.

## 2026-06-06 - Offline Push Canonical Mutation Transaction Preflight

### What Changed

- Added `OfflinePushCanonicalMutationTransactionPreflight`.
- Added `OfflinePushCanonicalMutationTransactionPreflightResult`.
- Connected transaction preflight into explicitly enabled offline push route
  processing after deferred repository staging and execution-gate evaluation.
- Added route response, route meta, audit, sync readiness, admin summary, and
  smoke metadata for preflight status, ready/blocked counts, operation IDs,
  block reasons, and transaction execution deferral.
- Added unit coverage for default-gated inventory preflight, explicit
  inventory-ready preflight, deferred event/customer-credit write plans, and
  rejected-staging preflight outcomes.
- Updated project, plugin, and offline app package versions to `0.127.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The execution gate proves canonical writes cannot run by default, but staging
also needs to know which staged canonical query kinds are ready for a future
transaction executor. This revision adds that classification without executing
canonical SQL or enabling production route-connected writes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRoutePersistenceProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationTransactionPreflight.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationTransactionPreflightResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationTransactionPreflightTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `OfflinePushCanonicalMutationTransactionPreflightTest` coverage for
  default-gated, explicit-ready, deferred downstream write-plan, and rejected
  preflight outcomes.
- Route-connected push handler assertions for transaction preflight status,
  ready/blocked counts, operation IDs, block reasons, and audit metadata.
- Registered-device sync readiness and WordPress smoke assertions for
  transaction preflight readiness and execution deferral.

### Rollback Notes

- Revert this revision to remove transaction preflight contracts and
  route/readiness metadata.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Canonical transaction execution, event registration writes,
  customer-credit ledger writes, queue replay workers, TopDeck workers,
  default route execution, live route registration, and production
  route-connected writes remain disabled before and after rollback.

## 2026-06-06 - Offline Push Canonical Mutation Repository Execution Gate

### What Changed

- Added `OfflinePushCanonicalMutationRepositoryExecutionGate`.
- Added `OfflinePushCanonicalMutationRepositoryExecutionResult`.
- Connected the execution gate into explicitly enabled offline push route
  processing after deferred canonical repository staging.
- Added route response, route meta, audit, sync readiness, admin summary, and
  smoke metadata for canonical repository execution status, blocked/ready
  flags, block reasons, transaction-adapter deferral, and zero affected rows.
- Added unit coverage for default blocked, explicitly ready, empty-plan
  blocked, and rejected-staging execution gate outcomes.
- Updated project, plugin, and offline app package versions to `0.126.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The staged push route can now build canonical SQL and stage it in a deferred
repository result, but actual canonical writes need a separate approval
boundary before any transaction executor is attached. This revision makes that
boundary explicit and visible in route payloads while keeping production writes
disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRoutePersistenceProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationRepositoryExecutionGate.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationRepositoryExecutionResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationRepositoryExecutionGateTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- `OfflinePushCanonicalMutationRepositoryExecutionGateTest` coverage for
  blocked, ready, empty-plan blocked, and rejected execution-gate outcomes.
- Route-connected push handler assertions for execution status, block reasons,
  transaction deferral, and execution-gate audit metadata.
- Registered-device sync readiness and WordPress smoke assertions for the
  execution gate and transaction-adapter deferral flags.

### Rollback Notes

- Revert this revision to remove the canonical repository execution gate and
  its route/readiness metadata.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Canonical repository execution, canonical entity writes, queue replay
  workers, TopDeck workers, default route execution, live route registration,
  and production route-connected writes remain disabled before and after
  rollback.

## 2026-06-06 - Route-Connected Offline Push Canonical Mutation Repository Staging

### What Changed

- Connected `OfflinePushCanonicalMutationRepository` staging into explicitly
  enabled offline push route processing.
- Added route response, route meta, and audit metadata for canonical repository
  status, query counts, operation IDs, prepare-argument counts, zero affected
  rows, and deferred execution flags.
- Added replay-aware repository staging metadata so duplicate-push replay
  responses report a deferred zero-query repository result.
- Added route factory and registered-device sync readiness metadata for
  handler-level canonical repository staging.
- Added unit and WordPress smoke coverage for fresh and replayed
  route-connected canonical repository staging metadata.
- Updated project, plugin, and offline app package versions to `0.125.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The canonical mutation repository contract existed as a deferred scaffold, but
route-connected staged push responses could not yet expose its result. This
revision makes the repository boundary visible in staging without executing
canonical inventory, event, credit-ledger, TopDeck, queue replay, or production
writes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRoutePersistenceProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Route-connected push handler coverage for deferred canonical repository
  metadata on fresh accepted operations.
- Route-connected replay coverage proving duplicate operations report a
  deferred zero-query repository result.
- Registered-device sync readiness and smoke assertions for handler-level
  canonical repository staging/deferred flags.

### Rollback Notes

- Revert this revision to remove route-connected canonical repository staging
  metadata from staged push response/meta/audit payloads.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Canonical repository execution, canonical entity writes, queue replay
  workers, TopDeck workers, default route execution, live route registration,
  and production route-connected writes remain disabled before and after
  rollback.

## 2026-06-06 - Deferred Offline Push Canonical Mutation Repository

### What Changed

- Added `OfflinePushCanonicalMutationRepository`.
- Added `OfflinePushCanonicalMutationRepositoryResult`.
- Added deferred repository result/audit metadata for canonical SQL query
  counts, operation IDs, prepare-argument counts, zero affected rows, and
  deferred execution flags.
- Added registered-device sync readiness and admin System Status metadata for
  the canonical mutation repository contract.
- Added unit and WordPress smoke coverage for deferred repository staging,
  empty valid plans, rejected SQL plans, and readiness metadata.
- Updated project, plugin, and offline app package versions to `0.124.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

Canonical SQL plans are now visible from staged push routes, but the next
boundary needs an explicit repository result shape before any write execution is
allowed. This revision adds that repository contract while keeping all
inventory, event, credit-ledger, TopDeck, queue replay, and production writes
deferred.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationRepository.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationRepositoryResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Canonical mutation repository test for deferred staging of valid SQL plans.
- Canonical mutation repository test for empty valid plans without results.
- Canonical mutation repository test for rejected SQL plans before execution.
- Registered-device sync readiness and smoke assertions for repository
  readiness/deferred flags.

### Rollback Notes

- Revert this revision to remove the deferred canonical mutation repository
  contract and readiness metadata.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Canonical repository execution, canonical entity writes, queue replay
  workers, TopDeck workers, default route execution, live route registration,
  and production route-connected writes remain disabled before and after
  rollback.

## 2026-06-06 - Route-Connected Offline Push Canonical Mutation SQL Planning

### What Changed

- Connected `OfflinePushCanonicalMutationQueryBuilder` to explicitly enabled
  staged offline push route processing.
- Added route response, route meta, and audit metadata for canonical SQL query
  counts, operation IDs, prepare-argument counts, and deferred execution and
  repository flags.
- Added replay-aware SQL planning metadata so duplicate-push replay responses
  report zero canonical SQL templates while preserving hydrated replay data.
- Propagated push-handler canonical SQL readiness through registered-device
  sync readiness and WordPress smoke checks.
- Updated project, plugin, and offline app package versions to `0.123.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The SQL-template builder was staged and testable, but route-connected push
processing did not yet expose its planning output to staging clients. This
revision makes the non-mutating SQL plan visible in the same response/meta/audit
surfaces as canonical mutation planning, giving staging a reviewable handoff
before any canonical repository execution is enabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRoutePersistenceProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationQueryBuildPlan.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Route-connected push handler coverage for canonical SQL metadata on fresh
  accepted operations.
- Route-connected replay coverage proving duplicate operations produce zero
  canonical SQL templates and no duplicate canonical write plan.
- Registered-device sync readiness and smoke assertions for handler-level
  canonical SQL readiness/deferred flags.

### Rollback Notes

- Revert this revision to remove route-connected canonical SQL metadata from
  staged push response/meta/audit payloads.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Canonical repository execution, canonical entity writes, queue replay
  workers, TopDeck workers, default route execution, live route registration,
  and production route-connected writes remain disabled before and after
  rollback.

## 2026-06-06 - Offline Push Canonical Mutation SQL Planning

### What Changed

- Added `OfflinePushCanonicalMutationQueryBuilder` and
  `OfflinePushCanonicalMutationQueryBuildPlan`.
- Planned inspection-only SQL templates for accepted canonical mutation
  descriptors produced by offline push processing.
- Added guarded inventory update templates that require the expected row
  version and `available` status before a future canonical reservation write.
- Added event registration and customer-credit lookup guard templates while
  registration, ledger, TopDeck, and repository writes remain deferred.
- Added health/admin readiness metadata for staged canonical mutation SQL
  planning.
- Added unit and WordPress smoke coverage for canonical SQL planning,
  tampered-row rejection, empty valid plans, and readiness metadata.
- Updated project, plugin, and offline app package versions to `0.122.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

Canonical mutation planning is now visible in staged route responses, but
turning those descriptors into writes still needs a reviewable handoff. This
revision adds the next non-mutating layer: validated SQL templates and guard
metadata that staging can inspect before any repository executes inventory,
event, customer-credit, TopDeck, or replay writes.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationQueryBuilder.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationQueryBuildPlan.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Canonical mutation SQL builder test for guarded inventory update templates,
  event lookup guards, and customer-credit lookup guards.
- Canonical mutation SQL builder test for empty valid plans without queries.
- Tampered-row and table-prefix rejection coverage for canonical SQL planning.
- Readiness and smoke assertions for staged canonical mutation SQL planning.

### Rollback Notes

- Revert this revision to remove staged canonical mutation SQL-template
  planning and its readiness metadata.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Canonical repository execution, canonical entity writes, queue replay
  workers, TopDeck workers, default route execution, live route registration,
  and production route-connected writes remain disabled before and after
  rollback.

## 2026-06-06 - Route-Connected Offline Push Canonical Mutation Planning

### What Changed

- Connected `OfflinePushCanonicalMutationPlanner` to explicitly enabled staged
  push route processing.
- Skipped replayed duplicate operation rows before canonical mutation planning
  so duplicate pushes do not plan duplicate future canonical writes.
- Added route response, route meta, and audit metadata for canonical mutation
  counts, mutation operation IDs, skipped IDs, and skip reasons.
- Added staged readiness metadata for route-connected canonical mutation
  planning and deferred canonical writes.
- Updated project, plugin, and offline app package versions to `0.121.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

Staging can now verify the next offline push handoff through the same explicitly
enabled route processing path used for persistence planning. Replay-aware
canonical planning proves duplicate pushes stay idempotent before any canonical
inventory, event, customer-credit, TopDeck, or queue replay writes are enabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRoutePersistenceProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Canonical mutation planner coverage for replayed operation IDs being skipped
  with `operation_replayed`.
- Staged push route handler factory coverage for canonical mutation metadata on
  fresh accepted pushes.
- Staged duplicate-push route coverage proving replayed rows are skipped before
  canonical mutation planning.
- Readiness and smoke assertions for route-connected canonical planning flags.

### Rollback Notes

- Revert this revision to remove route-connected canonical mutation planning
  metadata and replay-aware canonical planning skips.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Canonical entity writes, queue replay workers, TopDeck workers, default route
  execution, live route registration, and production route-connected writes
  remain disabled before and after rollback.

## 2026-06-06 - Offline Push Canonical Mutation Planning

### What Changed

- Added `OfflinePushCanonicalMutationPlanner` and
  `OfflinePushCanonicalMutationPlan`.
- Planned deferred canonical mutation descriptors for accepted offline push
  inventory reservations, event registrations, and customer credit redemptions.
- Added skipped-operation metadata for conflict and rejected push outcomes.
- Added readiness metadata for staged canonical mutation planning in health and
  admin System Status.
- Added unit coverage for accepted mutations, skipped operations, mismatched
  payload/resolution guards, and malformed accepted-result guards.
- Updated project, plugin, and offline app package versions to `0.120.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The staged push route can now persist operation results and replay duplicate
responses, but canonical inventory, event, and credit writes are still disabled.
This revision defines the next safe handoff: a plan-only mutation shape that
staging can inspect before any live entity writes, TopDeck workers, or queue
replay workers are enabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Canonical mutation planner test for accepted inventory, event, and credit
  push operations.
- Canonical mutation planner test for skipped conflict and rejected outcomes.
- Guard tests for mismatched payload/resolution metadata and malformed accepted
  resolution details.
- Readiness assertions for health/admin/smoke reporting of the staged planner.

### Rollback Notes

- Revert this revision to remove plan-only canonical mutation descriptors and
  their readiness metadata.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Canonical entity writes, queue replay workers, TopDeck workers, default route
  execution, live route registration, and production route-connected writes
  remain disabled before and after rollback.

## 2026-06-06 - Offline Push Replay Response Hydration

### What Changed

- Carried staged persistence replay rows into `OfflinePushRouteProcessingResult`.
- Hydrated replayed staged push response results from existing queue-row
  status, result code, result details, and resolved timestamp.
- Added per-result `persistence.response_source` metadata to distinguish
  fresh resolution-plan results from existing-queue-row replay results.
- Added replay response hydration counts and operation IDs to staged push
  response payloads and route processing audits.
- Added route handler factory coverage for stored replay details, stored
  resolved timestamps, response sources, and hydration audit metadata.
- Updated project, plugin, and offline app package versions to `0.119.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The previous checkpoint let clients see which operation results were replayed,
but replayed response details still came from the freshly resolved batch
payload. This revision makes duplicate-push responses more strongly idempotent
by returning the stored queue-row result for replayed operations without
enabling queue replay workers or canonical mutations.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRoutePersistenceProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Staged push route handler factory assertions that replayed operation details
  come from stored queue rows.
- Staged push route handler factory assertions that replayed operation
  timestamps come from stored queue-row resolution timestamps.
- Staged push route handler factory assertions for response source and
  hydration audit metadata.

### Rollback Notes

- Revert this revision to remove stored queue-row hydration from staged
  duplicate-push responses while keeping prior inserted/replayed annotations.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Queue replay workers, canonical mutations, default route execution, live
  route registration, and production route-connected writes remain disabled
  before and after rollback.

## 2026-06-06 - Offline Push Per-Operation Persistence Annotations

### What Changed

- Added per-operation persistence annotations to staged offline push response
  results.
- Added a batch-level `operation_persistence_statuses` response map keyed by
  client operation ID.
- Annotated fresh operation rows as `inserted` and duplicate replayed operation
  rows as `replayed`.
- Added route handler factory coverage for both inserted and replayed response
  result annotations.
- Updated project, plugin, and offline app package versions to `0.118.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The previous checkpoint exposed replay counts and replayed operation IDs in
response metadata and audits. This revision gives offline clients a direct,
per-result persistence signal so they can render or reconcile duplicate-push
responses without deriving state from batch-level arrays or nested audits.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Staged push route handler factory assertions for inserted per-operation
  persistence annotations.
- Staged push route handler factory assertions for replayed duplicate
  per-operation persistence annotations.

### Rollback Notes

- Revert this revision to remove per-operation persistence annotations from
  staged push responses while keeping prior replay count/ID metadata intact.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Queue replay workers, canonical mutations, default route execution, live
  route registration, and production route-connected writes remain disabled
  before and after rollback.

## 2026-06-06 - Offline Push Replay Response Metadata

### What Changed

- Added persistence planner audit fields for operation insert IDs, operation
  replay IDs, and conflict insert IDs.
- Added `OfflinePushPersistenceRepositoryResult::operation_replay_count()` and
  `operation_replay_ids()` for route and audit consumers.
- Added operation replay count and replay operation IDs to staged push
  persistence repository audits.
- Added operation replay count and replay operation IDs to staged push route
  processing audits and response metadata.
- Added unit coverage for insert/replay/conflict ID audits, repository replay
  helper methods, repository replay audit fields, and duplicate-push route
  response metadata.
- Updated project, plugin, and offline app package versions to `0.117.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The previous checkpoint enabled explicitly staged push handlers to read existing
operation rows before persistence planning, but replay status was only visible
inside nested audit payloads. This revision gives staging tests and reviewers a
direct, secret-free response metadata surface for verifying idempotent
duplicate pushes without enabling queue replay workers, canonical mutations,
default route execution, or live route registration.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushPersistencePlanner.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushPersistenceRepositoryResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandler.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushPersistencePlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushPersistenceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Persistence planner assertions for operation insert IDs, replay IDs, and
  conflict insert IDs.
- Persistence repository assertions for replay helper methods and replay audit
  fields.
- Staged push route handler factory assertions for direct response metadata on
  duplicate-push replay.

### Rollback Notes

- Revert this revision to remove staged push replay metadata from route
  responses and repository audits while keeping existing route provider
  composition intact.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Queue replay workers, canonical mutations, default route execution, live
  route registration, and production route-connected writes remain disabled
  before and after rollback.

## 2026-06-06 - Offline Push Existing Operation Rows Route Provider

### What Changed

- Added `OfflinePushRouteExistingOperationRowsProvider` to adapt authenticated
  staged push route context into repository-backed existing queue-row reads.
- Updated `OfflinePushRouteHandlerFactory` to compose that provider
  automatically when route-connected execution is explicitly enabled and no
  custom existing operation-row provider is injected.
- Added push handler factory readiness metadata for existing operation-row
  route provider configuration, nested readiness, and route-read deferral.
- Added registered-device sync handler health/admin readiness metadata for the
  staged existing operation-row route provider.
- Added unit coverage for provider success, missing device context rejection,
  repository rejection mapping, and duplicate push replay with zero new queue
  writes.
- Updated project, plugin, and offline app package versions to `0.116.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The previous checkpoint could explicitly fetch existing queue rows, but the
staged push route still needed a safe route-context adapter before idempotent
replay checks could run inside explicitly enabled handler factory tests. This
revision wires that adapter behind registered-device authorization and keeps
default route execution, route registration, queue replay workers, canonical
mutations, and production route-connected writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteExistingOperationRowsProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteExistingOperationRowsProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Route existing operation-row provider tests for successful repository-backed
  reads, missing route device context rejection, and repository rejection
  mapping.
- Push handler factory replay coverage proving existing queue rows are passed
  into persistence planning and avoid a second queue write.
- Sync handler factory and WordPress smoke assertions for existing
  operation-row route provider readiness and deferral metadata.

### Rollback Notes

- Revert this revision to remove staged existing operation-row route provider
  composition and return replay preparation to explicit repository calls only.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default route execution, route registration, queue replay workers, canonical
  mutations, and production route-connected writes remain disabled before and
  after rollback.

## 2026-06-06 - Offline Push Existing Operation Rows Repository

### What Changed

- Added `OfflinePushExistingOperationRowsRepository` to explicitly execute the
  staged existing operation-row lookup template through `$wpdb` when called.
- Added `OfflinePushExistingOperationRowsRepositoryResult` for fetched/rejected
  outcomes, existing rows keyed by client operation ID, row-result audits, and
  secret-free repository audit payloads.
- Added queue-row normalization for idempotent replay preparation, including
  offline device checks, device public ID checks, operation ID allowlisting,
  timestamp normalization, result-details JSON decoding, duplicate detection,
  and malformed row rejection.
- Added registered-device sync handler health/admin readiness metadata for
  staged existing operation-row repository availability.
- Added WordPress smoke readiness assertions for staged existing operation-row
  repository availability while route reads and queue replay remain deferred.
- Added unit coverage for successful row fetches, empty result sets, invalid
  plans, database failures, malformed rows, duplicate rows, and audit payloads.
- Updated project, plugin, and offline app package versions to `0.115.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The previous checkpoint planned and built the idempotent replay lookup SQL, but
staging still could not explicitly load existing queue rows. This revision adds
the repository adapter that can fetch and normalize those rows under test
control, while keeping default route-connected reads, queue replay, canonical
mutations, and live route registration disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsRepository.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsRepositoryResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushExistingOperationRowsRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Existing operation-row repository tests for successful `$wpdb` reads,
  accepted empty result sets, invalid query-plan rejection before reads,
  database failure rejection, malformed row rejection, duplicate row rejection,
  and repository audit payloads.
- Sync handler factory and WordPress smoke assertions for existing
  operation-row repository readiness and deferral metadata.

### Rollback Notes

- Revert this revision to remove staged existing operation-row repository
  loading and return replay preparation to query planning only.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default route-connected reads, route registration, queue replay, canonical
  mutations, and route-connected database writes remain disabled before and
  after rollback.

## 2026-06-06 - Offline Push Existing Operation Rows Query Planning

### What Changed

- Added `OfflinePushExistingOperationRowsQueryPlanner` to plan allowlisted
  existing-operation row lookups for offline push idempotency checks.
- Added `OfflinePushExistingOperationRowsQueryBuilder` to turn those contracts
  into prepared SQL templates scoped by offline device ID and client operation
  IDs.
- Added accepted/rejected value objects with secret-free audit payloads for
  planning and SQL template generation.
- Added registered-device sync handler health/admin readiness metadata for
  staged existing operation-row query planning and SQL template readiness.
- Added WordPress smoke readiness assertions for staged existing operation-row
  planning while route reads and repository execution remain deferred.
- Added unit coverage for accepted plans, invalid contexts, duplicate/invalid
  operation IDs, tampered contracts, and prepared SQL shape.
- Updated project, plugin, and offline app package versions to `0.114.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The staged push route can now derive operation options and load server
snapshots, but idempotent replay still needs a safe way to identify existing
queue rows before any route-connected replay worker is enabled. This revision
adds the plan-only query and SQL-template boundary for those existing
operation rows while keeping repository execution, route reads, queue replay,
canonical mutations, and live route registration disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsQueryPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsQueryBuildPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsQueryPlanner.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsQueryBuilder.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushExistingOperationRowsQueryPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushExistingOperationRowsQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Existing operation-row query planner tests for accepted lookup contracts,
  invalid offline device/table prefix contexts, duplicate client operation IDs,
  invalid client operation IDs, and mismatched operation devices.
- Existing operation-row query builder tests for prepared SQL templates,
  prepare arguments, invalid plan rejection, and tampered contract rejection.
- Sync handler factory and WordPress smoke assertions for existing
  operation-row query/SQL readiness and deferral metadata.

### Rollback Notes

- Revert this revision to remove staged existing operation-row lookup planning
  and return idempotent replay work to push persistence planning only.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default route-connected reads, route registration, queue replay, canonical
  mutations, and route-connected database writes remain disabled before and
  after rollback.

## 2026-06-06 - Offline Push Route Operation Options Provider

### What Changed

- Added `OfflinePushRouteOperationOptionsProvider` to normalize per-operation
  route options from offline push payloads before batch resolution.
- Added event reservation payment status support for both `paymentStatus` and
  `payment_status`, limited to the existing event payment status constants.
- Added push handler factory readiness metadata for operation-options provider
  readiness, nested provider audits, and route option deferral.
- Added registered-device sync handler health/admin readiness metadata for the
  staged push operation-options provider.
- Added unit coverage for direct provider normalization/rejection and explicitly
  enabled push handler factory composition using route-derived event options.
- Updated project, plugin, and offline app package versions to `0.113.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The prior route-backed push handler could fetch repository snapshots, but event
reservation decisions still depended on injected per-operation options. This
revision adds the safe route adapter for those options so staged handlers can
derive payment status from the parsed operation payload and keep pay-at-store
event registrations out of the TopDeck queue. Default route execution, route
registration, queue replay, TopDeck workers, canonical mutations, and production
writes remain disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteOperationOptionsProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteOperationOptionsProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Route operation-options provider tests for event payment status normalization,
  default payment status handling, non-event operation skipping, and invalid or
  unsupported payment status rejection.
- Push route handler factory test coverage for route-derived event payment
  status options feeding batch resolution and suppressing TopDeck queueing for
  pay-at-store reservations.
- Sync handler factory and WordPress smoke assertions for operation-options
  provider readiness and deferral metadata.

### Rollback Notes

- Revert this revision to remove staged push route operation-options provider
  composition and return event push route tests to injected options only.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default route-connected execution, live route registration, queue replay,
  TopDeck queue workers, canonical entity mutations, and route-connected
  database writes remain disabled before and after rollback.

## 2026-06-06 - Offline Push Route Server Snapshot Provider

### What Changed

- Added `OfflinePushRouteServerSnapshotProvider` to adapt authenticated
  registered-device context into repository-backed push server snapshot reads.
- Updated `OfflinePushRoutePersistenceProvider` to pass provider callables a
  route context containing the authorized device row and server timestamp.
- Added push handler factory readiness metadata for repository-backed snapshot
  provider readiness, route snapshot-read readiness, nested provider audits, and
  snapshot-read deferral.
- Added registered-device sync handler health/admin readiness metadata for the
  staged push snapshot route provider.
- Added unit coverage for direct route snapshot provider success/rejection and
  explicitly enabled push handler factory composition using repository-backed
  snapshots.
- Updated project, plugin, and offline app package versions to `0.112.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The previous checkpoint could explicitly load server snapshots, but staged
route processing still relied on injected in-memory snapshots. This revision
adds the safe adapter that lets explicitly enabled staged handlers fetch
allowlisted snapshots from the repository using the authenticated device
context, while keeping default route reads, route registration, replay workers,
and canonical mutations disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteServerSnapshotProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRoutePersistenceProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteServerSnapshotProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Route server snapshot provider tests for authenticated device context handoff,
  repository-backed snapshot loading, missing device context rejection, and
  missing snapshot row rejection.
- Push route handler factory test coverage for explicitly enabled
  repository-backed snapshot reads feeding push resolution and queue
  persistence.
- Sync handler factory and WordPress smoke assertions for snapshot route
  provider readiness and deferral metadata.

### Rollback Notes

- Revert this revision to remove staged push snapshot provider composition and
  return route-handler tests to injected snapshot fixtures only.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default route-connected snapshot reads, live route registration, queue replay,
  canonical entity mutations, and route-connected database writes remain
  disabled before and after rollback.

## 2026-06-06 - Offline Push Server Snapshot Repository

### What Changed

- Added `OfflinePushServerSnapshotRepository` and
  `OfflinePushServerSnapshotRepositoryResult` to explicitly execute staged
  snapshot lookup templates through `$wpdb`.
- Added resolver-ready snapshot normalization for inventory, event, and
  customer-credit rows, including event `seatsRemaining` derivation and
  customer-credit `creditBalanceMinorUnits` derivation.
- Added repository readiness metadata to registered-device sync handler health
  and admin summary output while keeping repository execution deferred by
  default.
- Added WordPress smoke assertions for push snapshot repository readiness and
  repository execution deferral.
- Added unit coverage for successful repository reads, invalid query plans,
  missing rows, malformed rows, resolver-compatible snapshot keys, fetch audits,
  and deferred route-read metadata.
- Updated project, plugin, and offline app package versions to `0.111.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The prior checkpoint defined allowlisted snapshot query contracts and SQL
templates. This revision adds the next staged boundary: an explicit repository
adapter that can load the server snapshots needed by the push resolver without
enabling default route-connected reads, route registration, replay workers, or
canonical mutations.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotRepository.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotRepositoryResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushServerSnapshotRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Push server snapshot repository tests for resolver-ready snapshots, duplicate
  operation/entity-key lookup keys, fetch audits, invalid query-plan rejection,
  missing rows, and malformed row rejection.
- Sync handler factory and WordPress smoke assertions for snapshot repository
  readiness and explicit execution deferral metadata.

### Rollback Notes

- Revert this revision to remove staged push snapshot repository loading and
  return to query-template-only snapshot planning.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default route-connected snapshot reads, live route registration, queue replay,
  canonical entity mutations, and route-connected database writes remain
  disabled before and after rollback.

## 2026-06-06 - Offline Push Server Snapshot Query Planning

### What Changed

- Added `OfflinePushServerSnapshotQueryPlanner` and
  `OfflinePushServerSnapshotQueryPlan` to translate parsed offline push
  operations into allowlisted inventory, event, and customer-credit server
  snapshot lookup contracts.
- Added `OfflinePushServerSnapshotQueryBuilder` and
  `OfflinePushServerSnapshotQueryBuildPlan` to convert those contracts into
  prepared SQL templates without executing database reads.
- Added snapshot query readiness metadata to the registered-device sync handler
  factory and admin summary.
- Added WordPress smoke assertions for push snapshot query planner readiness,
  SQL template readiness, execution deferral, repository deferral, and
  route-read deferral.
- Added unit coverage for supported operation snapshot planning, invalid
  context rejection, unsupported or mismatched operations, prepared SQL
  templates, and tampered snapshot contracts.
- Updated project, plugin, and offline app package versions to `0.110.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The staged push route handler can accept injected server snapshots, but staging
still needs a safe database-read contract before any repository-backed snapshot
loading is added. This revision defines and validates the read templates first,
matching the existing staged-query pattern and keeping all execution disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotQueryPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotQueryBuildPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotQueryPlanner.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotQueryBuilder.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushServerSnapshotQueryPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushServerSnapshotQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Push server snapshot query planner tests for inventory, event, and
  customer-credit operation contracts.
- Push server snapshot SQL builder tests for prepared lookup templates,
  prepare arguments, audit metadata, invalid plans, and tampered contracts.
- Sync handler factory and WordPress smoke assertions for snapshot query
  readiness and deferral metadata.

### Rollback Notes

- Revert this revision to remove staged push snapshot query planning and return
  to injected snapshot-provider-only route tests.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Snapshot query execution, repository-backed snapshot loading, live route
  registration, queue replay, canonical entity mutations, and route-connected
  database reads/writes remain disabled before and after rollback.

## 2026-06-06 - Offline Push Route Handler Factory Composition

### What Changed

- Added `OfflinePushRouteHandler`,
  `OfflinePushRoutePersistenceProvider`,
  `OfflinePushRouteProcessingResult`, and `OfflinePushRouteHandlerFactory` for
  staged route-aware push processing.
- Kept the factory default path fail-safe: without explicit route execution
  enablement, it returns the validation-only push handler and performs no
  database reads or writes.
- Added optional push handler/factory injection to
  `OfflineRegisteredDeviceSyncRouteHandlerFactory` while preserving explicit
  push handler overrides.
- Exposed sync handler readiness metadata for push handler dependency factory
  readiness, route dependency readiness, route execution enablement, database
  readiness, queue/conflict write deferral, and dependency issues.
- Updated the sync readiness admin summary and WordPress smoke assertions for
  the new staged push route handler/factory readiness keys.
- Added unit coverage for default push route deferral, explicitly enabled
  registered-device authorization plus queue persistence, and sync factory
  injection of the composed push handler.
- Updated project, plugin, and offline app package versions to `0.109.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

Offline push plans could be persisted through the staged repository, but the
REST boundary still needed an explicit factory that can authenticate registered
devices, hydrate server snapshots, resolve the pushed batch, and call the
repository in controlled staging tests. This revision adds that route-aware
composition point while keeping production route execution and default
route-connected writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRoutePersistenceProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Push route handler factory tests for default route-connected deferral without
  database access.
- Push route handler factory tests for explicitly enabled registered-device
  authorization, batch resolution from injected server snapshots, and queue
  persistence through the staged repository.
- Sync handler factory tests for injecting the push route handler factory into
  the offline controller boundary.
- WordPress smoke assertions for the new push handler/factory readiness and
  deferral metadata.

### Rollback Notes

- Revert this revision to remove staged push route handler/factory composition
  and return to validation-only push controller handling.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default live offline routes, queue replay, queue persistence, conflict
  persistence, canonical entity mutations, route registration, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Offline Push Persistence SQL And Repository

### What Changed

- Added `OfflinePushPersistenceQueryBuildPlan` and
  `OfflinePushPersistenceQueryBuilder` to convert accepted offline push
  persistence plans into prepared queue and conflict insert templates for the
  existing `tcg_offline_sync_queue` and `tcg_sync_conflicts` tables.
- Added SQL-build validation for table prefixes, offline device IDs, operation
  IDs, supported operation/domain pairs, entity IDs, statuses, JSON payloads,
  UTC timestamps, conflict metadata, and row versions.
- Added `OfflinePushPersistenceRepository` and
  `OfflinePushPersistenceRepositoryResult` for explicitly invoked `$wpdb`
  execution of those prepared queue and conflict inserts.
- Exposed sync handler readiness metadata for push persistence planning, SQL
  template readiness, repository readiness, route deferral, queue persistence
  deferral, conflict persistence deferral, queue replay deferral, and canonical
  mutation deferral.
- Updated the sync readiness admin summary and WordPress smoke assertions for
  the new staged push persistence readiness keys.
- Added unit coverage for prepared queue/conflict inserts, replay-only plans,
  invalid table prefixes, tampered rows, explicit repository writes, database
  failures, and invalid affected-row results.
- Updated project, plugin, and offline app package versions to `0.108.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

Offline push planning could already map parsed device operations into future
queue/result rows, conflict rows, and idempotent replay rows. Staging still
needed an audited SQL and repository boundary before any route can safely
persist those outcomes. This revision adds that explicit boundary while keeping
default route execution, queue replay, conflict persistence, and canonical
entity mutations disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushPersistenceQueryBuildPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushPersistenceQueryBuilder.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushPersistenceRepository.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushPersistenceRepositoryResult.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushPersistenceQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushPersistenceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Push persistence SQL builder tests for prepared queue/conflict insert
  templates, replay-only plans, invalid table prefixes, and tampered rows.
- Push persistence repository tests for explicit `$wpdb` execution, replay-only
  no-op plans, invalid query plans before writes, database failures, and
  invalid affected-row results.
- Sync handler readiness and WordPress smoke coverage for staged push
  persistence SQL/repository readiness and default deferral metadata.

### Rollback Notes

- Revert this revision to remove staged push persistence SQL and repository
  execution support.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default live offline routes, queue replay, queue persistence, conflict
  persistence, canonical entity mutations, route registration, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Pull Route Handler Factory Composition

### What Changed

- Added `OfflinePullRouteHandlerFactory` to compose a staged pull handler from
  `$wpdb`, registered-device permission resolution, route-aware change-set
  provider, and route-aware cursor-advance provider dependencies.
- Kept the factory default path fail-safe: without explicit route execution
  enablement, it returns the existing bare pull handler with route dependencies
  deferred.
- Added optional pull handler factory injection to
  `OfflineRegisteredDeviceSyncRouteHandlerFactory` while preserving explicit
  pull handler overrides.
- Exposed sync handler readiness metadata for pull handler dependency factory
  readiness, route dependency readiness, route execution enablement, database
  readiness, cursor-write deferral, and dependency issues.
- Updated the sync readiness admin summary to show handler factory readiness and
  route dependency deferral.
- Added WordPress smoke assertions for the new default-deferred readiness keys.
- Added unit coverage for default factory deferral, explicitly enabled
  route-aware handler composition, and sync factory injection of the composed
  handler.
- Updated project, plugin, and offline app package versions to `0.107.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The previous checkpoint let the pull handler call an explicitly injected cursor
advance provider, but staging still needed one audited composition boundary that
can assemble the route-aware read and cursor-write providers from WordPress
database dependencies. This revision adds that boundary while keeping default
route wiring, route registration, and production execution disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePullRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Pull handler factory tests for default route dependency deferral and explicit
  route-aware provider composition from a `$wpdb` test double.
- Sync handler factory coverage proving the composed pull handler factory can be
  injected and can advance cursors only when explicitly enabled.
- WordPress integration smoke assertions for default-deferred route dependency
  injection and cursor-write readiness metadata.

### Rollback Notes

- Revert this revision to remove the pull route handler factory composition and
  its sync handler readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default live offline routes, default route dependency injection,
  route-connected reads, tombstone reads, queue replay, route registration,
  cursor writes, and route-connected database writes remain disabled before and
  after rollback.

## 2026-06-06 - Pull Handler Cursor Advance Orchestration

### What Changed

- Extended `OfflinePullRouteHandler` with a backward-compatible optional cursor
  advance provider argument for explicit staging orchestration after change
  sets are returned and presented.
- Added ready-response metadata for cursor advancement attempt state, result
  status, rows affected, repository audit payloads, and default route execution
  deferral.
- Added fail-closed handler responses for rejected cursor advancement results,
  invalid cursor provider return types, and cursor provider exceptions.
- Exposed staged pull handler cursor advancement readiness in registered-device
  sync handler health and admin summaries while keeping default execution
  deferred.
- Added WordPress smoke assertions for handler cursor advancement readiness and
  deferral metadata.
- Added unit coverage for default cursor deferral, successful explicit cursor
  advancement, rejected cursor results, invalid provider returns, and readiness
  metadata.
- Updated project, plugin, and offline app package versions to `0.106.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The route-aware cursor provider can compose trusted headers, cursor planning,
and explicit cursor repository writes, but the pull handler still needed an
opt-in orchestration point to call it after provider change sets are available.
This revision lets staging inject that cursor advancement boundary while the
default handler, route registration, and route-connected writes remain
deferred.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePullRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteChangeSetProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteCursorAdvanceProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Pull handler coverage for default cursor deferral, explicit cursor
  advancement metadata, rejected cursor results, and invalid cursor provider
  return types.
- Sync handler readiness and WordPress smoke coverage for handler cursor
  advancement readiness and default deferral metadata.

### Rollback Notes

- Revert this revision to remove opt-in pull handler cursor advancement
  orchestration and its health/admin readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default live offline routes, default route-connected reads, tombstone reads,
  queue replay, route registration, and route-connected database writes remain
  disabled before and after rollback.

## 2026-06-06 - Pull Route Cursor Advance Provider

### What Changed

- Added `OfflinePullRouteCursorAdvanceProvider` to compose registered-device
  header resolution, pull device context planning, cursor advancement planning,
  and explicit cursor repository execution for staged route orchestration.
- Exposed staged route cursor provider readiness in registered-device sync
  handler health and admin summaries while keeping default route execution
  deferred.
- Added WordPress smoke assertions for route cursor provider readiness and
  route-level deferral metadata.
- Added unit coverage for successful route-aware cursor advancement, missing
  authorization rejection before cursor writes, and missing change-set rejection
  after registered-device context resolution.
- Updated project, plugin, and offline app package versions to `0.105.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

Cursor planning and repository execution can now run in isolation, but staging
needs an explicit route-aware adapter that proves the write path can be
composed from trusted registered-device headers and returned change sets. This
revision adds that injectable boundary without enabling default pull route
cursor execution, route registration, or route-connected writes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePullRouteCursorAdvanceProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteCursorAdvanceProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteChangeSetProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Route cursor provider coverage for registered-device header resolution,
  cursor plan/repository composition, missing authorization before writes, and
  missing change-set rejection after context lookup.
- Sync handler readiness and WordPress smoke coverage for route cursor provider
  readiness and default route execution deferral metadata.

### Rollback Notes

- Revert this revision to remove the route-aware pull cursor advancement
  provider and its health/admin readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default live offline routes, default route-connected reads, tombstone reads,
  queue replay, route registration, and route-connected database writes remain
  disabled before and after rollback.

## 2026-06-06 - Pull Cursor Advance Repository Adaptation

### What Changed

- Added `OfflinePullCursorAdvanceRepository` to explicitly execute prepared
  cursor upsert templates through `$wpdb` when called by staged tests or future
  gated orchestration.
- Added `OfflinePullCursorAdvanceRepositoryResult` to report advanced/rejected
  status, rows affected, per-cursor results, query-build audit metadata, and
  default route execution deferral.
- Exposed staged pull cursor repository readiness in registered-device sync
  handler health and admin summaries while keeping default route cursor
  execution deferred.
- Added WordPress smoke assertions for cursor repository readiness and cursor
  route-execution deferral metadata.
- Added unit coverage for successful cursor upserts, empty plans, invalid plans
  before database writes, failed database upserts, invalid affected-row results,
  and route-deferred audit metadata.
- Updated project, plugin, and offline app package versions to `0.104.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

Cursor advancement rows and prepared SQL templates now exist, but the next
staging-gated step needs an explicit repository boundary that can be tested
without wiring default live routes. This revision allows controlled cursor
upsert execution when directly invoked, while route registration, default
route-connected reads, tombstone reads, queue replay, and route-connected writes
remain disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvanceRepository.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvanceRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullCursorAdvanceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteChangeSetProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Cursor repository coverage for successful explicit upserts, empty valid plans,
  invalid plans before writes, database failures, invalid affected-row results,
  per-cursor audit rows, and route-deferred metadata.
- Sync handler readiness and WordPress smoke coverage for cursor repository
  readiness and default route execution deferral metadata.

### Rollback Notes

- Revert this revision to remove explicit pull cursor repository execution and
  its health/admin readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default live offline routes, default route-connected reads, tombstone reads,
  queue replay, route registration, and route-connected database writes remain
  disabled before and after rollback.

## 2026-06-06 - Pull Cursor Advance SQL Planning

### What Changed

- Added `OfflinePullCursorAdvanceQueryBuilder` to convert accepted cursor
  advancement rows into prepared `tcg_offline_pull_cursors` upsert templates.
- Added `OfflinePullCursorAdvanceQueryBuildPlan` to carry planned cursor SQL,
  prepared arguments, source audit metadata, and deferred execution flags.
- Validated cursor table names, device IDs, device public IDs, domains,
  nullable cursors, UTC timestamps, row counts, and row-version metadata before
  emitting any SQL plan.
- Exposed staged pull cursor SQL readiness in registered-device sync handler
  health and admin summaries while keeping cursor execution deferred.
- Added WordPress smoke assertions for cursor SQL readiness and cursor SQL
  execution deferral metadata.
- Added unit coverage for prepared cursor upsert templates, null cursor
  literals, empty valid plans, invalid source plans, tampered cursor rows, and
  invalid table names.
- Updated project, plugin, and offline app package versions to `0.103.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The previous cursor advancement revision produced safe, plan-only cursor rows.
This revision adds the next staging-gated boundary: prepared SQL templates that
can be inspected and tested before a future repository is allowed to execute
cursor upserts. Cursor write execution, route registration, default
route-connected reads, tombstone reads, queue replay, and route-connected writes
remain disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvanceQueryBuildPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvanceQueryBuilder.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullCursorAdvanceQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteChangeSetProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Cursor SQL builder coverage for prepared upsert templates, nullable cursor
  handling, empty plans, invalid source plans, tampered rows, invalid table
  names, and deferred execution metadata.
- Sync handler readiness and WordPress smoke coverage for cursor SQL planning
  readiness and cursor execution deferral metadata.

### Rollback Notes

- Revert this revision to remove pull cursor SQL planning and its health/admin
  readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Cursor writes, live offline routes, default route-connected reads, tombstone
  reads, queue replay, route registration, and route-connected database writes
  remain disabled before and after rollback.

## 2026-06-06 - Pull Cursor Advancement Planning

### What Changed

- Added `OfflinePullCursorAdvancePlanner` to validate trusted pull context,
  provider change sets, cursors, UTC server time, and requested domains before
  future cursor checkpoint writes.
- Added `OfflinePullCursorAdvancePlan` to carry plan-only cursor rows for
  `tcg_offline_pull_cursors` with device IDs, domains, nullable cursor values,
  server timestamps, row counts, and deferred-write audit metadata.
- Skipped cursor row planning for incomplete pages with `has_more = true` so
  paged pulls do not advance final checkpoints prematurely.
- Exposed staged pull cursor advancement planner readiness in registered-device
  sync handler health and admin summaries while keeping cursor writes deferred.
- Added WordPress smoke assertions for cursor planner readiness and cursor write
  deferral metadata.
- Added unit coverage for complete-page cursor rows, nullable cursor handling,
  invalid context/time/cursor rejection, missing domains, malformed change sets,
  and deferred write metadata.
- Updated project, plugin, and offline app package versions to `0.102.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The pull route can now fetch change sets through an explicitly injected,
route-aware provider, but production-safe sync also needs a separate cursor
checkpoint plan before any database writes are enabled. This revision creates
the cursor advancement contract while leaving cursor upserts, route
registration, default route-connected reads, tombstone reads, queue replay, and
route-connected writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvancePlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvancePlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullCursorAdvancePlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteChangeSetProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Cursor advancement planner coverage for complete pages, `has_more` skip
  behavior, nullable cursors, invalid context/time/cursor rejection, malformed
  change sets, missing domains, and deferred write metadata.
- Sync handler readiness and WordPress smoke coverage for cursor planner
  readiness and cursor write deferral metadata.

### Rollback Notes

- Revert this revision to remove pull cursor advancement planning and its
  health/admin readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Cursor writes, live offline routes, default route-connected reads, tombstone
  reads, queue replay, route registration, and route-connected database writes
  remain disabled before and after rollback.

## 2026-06-06 - Pull Route-Aware Provider Handoff

### What Changed

- Added `OfflinePullRouteChangeSetProvider` to resolve registered-device
  headers, validate pull device context, and invoke the pull change-set provider
  for explicitly injected route handlers.
- Extended `OfflinePullRouteHandler` so injected change-set providers can opt in
  to receiving normalized `OfflineRestRequestData` alongside the parsed pull
  request.
- Exposed staged route-aware pull provider readiness in registered-device sync
  handler health and admin summaries while keeping default route-connected reads
  deferred.
- Added WordPress smoke assertions for route-aware provider readiness and
  default route-connected read deferral metadata.
- Added unit coverage for route-aware provider success, missing authorization
  rejection before database reads, mismatched device context fail-closed
  behavior, and handler request-data forwarding.
- Updated project, plugin, and offline app package versions to `0.101.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The pull stack now has request parsing, trusted-device context planning, query
planning, repository reads, and provider composition. This revision adds the
next route-safe handoff: an explicitly injected provider can use normalized
route headers to authorize the device and fetch change sets, while the default
route factory still leaves route registration, default route-connected reads,
cursor advancement, tombstone reads, and route-connected writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePullRouteChangeSetProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePullRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteChangeSetProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Route-aware provider coverage for successful registered-device header
  resolution and provider fetches through the pull handler.
- Fail-closed coverage for missing authorization before device/change queries
  and mismatched request/device context before change queries.
- Handler coverage proving data-aware providers receive normalized request
  headers.
- Sync handler readiness and WordPress smoke coverage for route-aware provider
  readiness and default route-connected read deferral metadata.

### Rollback Notes

- Revert this revision to remove route-aware pull provider handoff and its
  health/admin readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, default route-connected reads, cursor advancement,
  tombstone reads, queue replay, route registration, and route-connected
  database writes remain disabled before and after rollback.

## 2026-06-06 - Pull Device Context Planning

### What Changed

- Added `OfflinePullDeviceContextPlanner` to validate authorized registered
  device permission resolutions before pull provider construction.
- Added `OfflinePullDeviceContextPlan` to carry the request-matched device ID,
  offline device database ID, table prefix, session context, and secret-free
  audit metadata.
- Added validation for authorized resolution state, session context presence,
  positive offline device IDs, request/device mismatches, `offline_pull` scope,
  and table-prefix safety.
- Exposed staged pull device-context planner readiness in registered-device
  sync handler health and admin summaries while keeping route handoff deferred.
- Added unit coverage for accepted context, denied resolution rejection,
  mismatched device/scope/prefix rejection, and provider construction from a
  valid context plan.
- Added WordPress smoke assertions for device-context readiness and route
  deferral metadata.
- Updated project, plugin, and offline app package versions to `0.100.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The pull change-set provider requires an explicit offline device database ID
and table prefix, but the route stack must only supply those values after a
registered-device permission resolution has authorized the pull request. This
revision creates that secret-free handoff contract without wiring default
routes, cursor advancement, tombstone reads, or route-connected writes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullDeviceContextPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullDeviceContextPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullDeviceContextPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Pull device context planner coverage for authorized pull contexts, denied
  permission resolutions, device mismatches, wrong required scopes, invalid
  table prefixes, and provider construction from a valid context plan.
- Sync handler readiness and WordPress smoke coverage for device-context
  planner readiness and route-handoff deferral metadata.

### Rollback Notes

- Revert this revision to remove pull device context planning and its
  health/admin readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, route-connected context handoff, pull execution, cursor
  advancement, tombstone reads, queue replay, route registration, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Pull Change-Set Provider Composition

### What Changed

- Added `OfflinePullChangeSetProvider` to compose pull requests, explicit
  registered-device context, query planning, and repository fetches behind an
  injectable change-set provider boundary.
- Added provider readiness metadata for device context, table-prefix
  validation, planner/repository availability, route deferral, cursor deferral,
  tombstone deferral, and route-connected write deferral.
- Added unit coverage for successful provider fetches, invalid context
  rejection before database reads, explicit pull-handler provider injection,
  and fail-closed handler behavior when the provider is rejected.
- Exposed staged pull change-set provider readiness in registered-device sync
  handler health and admin summaries while keeping default route wiring
  deferred.
- Added WordPress smoke assertions for provider readiness and route deferral
  metadata.
- Updated project, plugin, and offline app package versions to `0.99.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The repository adapter can execute prepared pull change-query plans, but live
routes still need a distinct composition boundary that requires an explicit
registered-device database context before reads can occur. This revision proves
that provider can be injected into the pull handler for staged tests while the
default route factory continues to leave pull execution, cursor advancement,
tombstone reads, route registration, and route-connected writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullChangeSetProvider.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullChangeSetProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Pull change-set provider coverage for successful explicit repository fetches,
  provider readiness metadata, invalid context rejection before database reads,
  staged pull-handler injection, and fail-closed rejected-provider handling.
- Sync handler readiness and WordPress smoke coverage for provider readiness
  and route-connection deferral metadata.

### Rollback Notes

- Revert this revision to remove pull change-set provider composition and its
  health/admin readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, default route-connected pull execution, cursor
  advancement, tombstone reads, queue replay, route registration, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Pull Change Repository Adapter

### What Changed

- Added `OfflinePullChangeRepository` to explicitly execute accepted prepared
  pull change-query plans through `$wpdb`.
- Added `OfflinePullChangeRepositoryResult` for fetched/rejected result states,
  change-set access, and secret-free repository audit payloads.
- Added row normalization for entity IDs, row versions, UTC timestamps, and
  allowlisted payload fields before pull change sets are returned.
- Exposed staged pull repository readiness in registered-device sync handler
  health and admin summaries while keeping route connection deferred.
- Added unit coverage for successful inventory/conflict repository fetches,
  invalid pre-query plans, database failures, and malformed row rejection.
- Added WordPress smoke assertions for repository readiness and route
  deferral metadata.
- Updated project, plugin, and offline app package versions to `0.98.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

Prepared SQL planning is reviewable, but future pull handlers need a separate
repository boundary that can execute those plans only when explicitly called
and normalize database rows into the existing offline pull response contract.
This revision proves that boundary without connecting it to live REST routes,
cursor advancement, tombstone reads, or route-connected writes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullChangeRepository.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullChangeRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullChangeRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Pull change repository coverage for successful prepared inventory and
  conflict reads, normalized change sets, prepare argument propagation, and
  repository audit metadata.
- Fail-closed coverage for invalid query plans before database reads,
  database failures, malformed entity IDs, invalid row versions, invalid
  timestamps, and missing allowlisted fields.
- Sync handler readiness and WordPress smoke coverage for repository readiness
  and route-connection deferral metadata.

### Rollback Notes

- Revert this revision to remove the pull change repository adapter and its
  health/admin readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, route-connected pull execution, cursor advancement,
  tombstone reads, queue replay, route registration, and route-connected
  database writes remain disabled before and after rollback.

## 2026-06-06 - Pull Query SQL Template Planning

### What Changed

- Added `OfflinePullChangeQueryBuilder` to convert accepted offline pull
  change-query contracts into prepared per-domain SQL templates and argument
  arrays.
- Added `OfflinePullChangeQueryBuildPlan` for safe audit/readiness metadata
  without executing database reads or exposing raw SQL arguments in health
  output.
- Exposed pull SQL planning readiness in registered-device sync handler health
  and admin summaries.
- Added fail-closed unit coverage for invalid base plans, tampered selected
  columns, filters, cursors, page sizes, and ordering.
- Added WordPress smoke assertions for the new non-secret SQL planning
  readiness fields.
- Updated project, plugin, and offline app package versions to `0.97.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The pull query planner has safe domain contracts, but future repositories need
reviewable prepared SQL templates before live reads are considered. This
revision proves those templates can be built from allowlisted contracts while
keeping opaque cursor filtering, execution, tombstone reads, cursor
advancement, route registration, and route-connected writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullChangeQueryBuildPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullChangeQueryBuilder.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullChangeQueryPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullChangeQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Pull change-query SQL builder coverage for prepared inventory and conflict
  templates, prepared arguments, cursor carry-forward deferral, and no cursor
  interpolation into SQL.
- Fail-closed coverage for invalid base plans, tampered table/column/filter
  contracts, cursor mutations, unsupported limits, and unsafe ordering.
- Sync handler readiness and WordPress smoke coverage for SQL planning
  readiness and cursor-filter deferral metadata.

### Rollback Notes

- Revert this revision to remove pull SQL template planning and its
  health/admin readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, cursor filtering, pull query execution, tombstone reads,
  cursor advancement, queue replay, and route-connected database writes remain
  disabled before and after rollback.

## 2026-06-06 - Pull Query Readiness Metadata

### What Changed

- Added `OfflinePullChangeQueryPlanner::supported_domains()` so staged health
  and admin surfaces can report the exact pull-query domains under contract.
- Extended `OfflineRegisteredDeviceSyncRouteHandlerFactory` readiness metadata
  with pull change-query readiness, supported domains, and explicit trusted
  context/query/cursor/tombstone deferral flags.
- Updated the sync route readiness admin summary to show query-plan readiness.
- Added unit and WordPress smoke assertions for the new non-secret readiness
  fields.
- Updated project, plugin, and offline app package versions to `0.96.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, staging, testing, roadmap, and plugin docs.

### Why

The pull query planner now has safe domain contracts, but staging needs to see
that readiness separately from live database execution. This revision exposes
that non-secret readiness metadata while preserving the deferred trusted device
context handoff and keeping all live pull reads disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullChangeQueryPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullChangeQueryPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Supported-domain coverage for the pull change-query planner contract.
- Sync handler readiness coverage for pull change-query readiness, domain count,
  trusted-context deferral, and query-execution deferral.
- WordPress smoke coverage for the new health payload fields.

### Rollback Notes

- Revert this revision to remove the health/admin pull query readiness fields.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, trusted device context handoff, pull query execution,
  tombstone reads, cursor advancement, queue replay, and route-connected
  database writes remain disabled before and after rollback.

## 2026-06-06 - Offline Pull Change-Query Planning

### What Changed

- Added `OfflinePullChangeQueryPlanner` to map accepted pull requests into
  plan-only read contracts for branding, inventory, customer credit, events,
  and conflicts domains.
- Added `OfflinePullChangeQueryPlan` for safe audit/readiness metadata without
  exposing SQL execution or mutating cursors.
- Added unit coverage for table/column/payload allowlists, cursor and page-size
  carry-forward, device-scoped conflict filters, invalid table prefixes,
  invalid offline device IDs, and unsupported domains.
- Kept the staged pull route handler on empty default responses unless a
  future change-set provider is explicitly injected.
- Updated project, plugin, and offline app package versions to `0.95.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, roadmap, and plugin docs.

### Why

The pull route now has a stable response envelope, but future repositories need
safe, reviewable read contracts before live queries are allowed. This revision
defines those domain boundaries and device filters without executing queries,
reading tombstones, advancing cursors, or registering routes.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePullChangeQueryPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullChangeQueryPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullChangeQueryPlannerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Pull change-query planner coverage for branding, inventory, customer credit,
  events, and conflict domain read contracts.
- Device-scoped conflict pull coverage for offline device ID and public device
  ID filters.
- Fail-closed coverage for invalid table prefixes, invalid offline device IDs,
  and unsupported domains.

### Rollback Notes

- Revert this revision to remove the plan-only pull change-query contracts.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pull query execution, tombstone reads, cursor
  advancement, queue replay, and route-connected database writes remain
  disabled before and after rollback.

## 2026-06-06 - Staged Pull Response Handler

### What Changed

- Added `OfflinePullRouteHandler` to parse registered-device pull requests and
  return the existing presenter-shaped pull response contract.
- Wired `OfflineRegisteredDeviceSyncRouteHandlerFactory` to use the staged pull
  response handler for `pull_offline_changes`, while retaining parser-only push
  validation.
- Added readiness metadata for `pull_response_ready`, with pull query, cursor
  advancement, write, and route-registration deferral flags preserved.
- Added unit coverage for empty default responses, injected change-set
  providers, invalid payload short-circuiting, and provider failure handling.
- Updated the registered-device sync handler factory tests to assert the new
  staged pull response envelope while pull/push routes remain unregistered.
- Updated project, plugin, and offline app package versions to `0.94.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, roadmap, and plugin docs.

### Why

The pull callback can now prove the offline app response contract end-to-end
without querying live change tables or advancing device cursors. This gives
staging a safer integration surface for future repository adapters while the
current route-registration and database-write gates remain closed.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePullRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Pull route handler coverage for presenter-shaped empty responses without
  live queries.
- Pull route handler coverage for injected change-set providers and deferred
  cursor advancement.
- Pull route handler coverage proving invalid requests skip providers and
  provider failures fail closed.
- Registered-device sync handler factory coverage for the new pull response
  readiness envelope.

### Rollback Notes

- Revert this revision to remove the staged pull response handler and return
  `pull_offline_changes` to parser-only validation.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pull queries, cursor advancement, queue replay,
  last-seen writes, and route-connected database writes remain disabled before
  and after rollback.

## 2026-06-06 - Registered-Device Sync Handler Readiness

### What Changed

- Added `OfflineRegisteredDeviceSyncRouteHandlerFactory` to assemble staged
  parser-only controller handlers for `pull_offline_changes` and
  `push_offline_operations`.
- Added `OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter` for
  health/admin summaries of pull/push handler readiness, callback counts,
  write-deferred state, and route-registration-deferred state.
- Wired health output, admin System Status, and offline route bootstrap
  planning through the staged pull/push controller so registered-device
  permission and controller callbacks can both report ready in staging
  metadata.
- Kept live route registration, queue replay, pull queries, cursor
  advancement, last-seen route writes, and route-connected database writes
  disabled.
- Added unit coverage for handler filtering, controller readiness, pull/push
  parser-only validation, and readiness presentation.
- Extended the WordPress smoke test to verify staged pull/push controller
  readiness while `should_register` remains false.
- Updated project, plugin, and offline app package versions to `0.93.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, roadmap, and plugin docs.

### Why

Registered-device permission callbacks can now be assembled from database
dependencies, but staging also needs controller callback readiness for pull and
push before any future route enablement review. This revision wires only
parser-level handlers into the controller boundary so requests can be
validated without replaying queues, querying pull data, advancing cursors, or
registering live routes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Factory coverage proving only pull/push handlers are exposed for
  registered-device sync routes.
- Controller coverage proving parser-only pull/push handlers validate requests
  while writes remain deferred.
- Presenter and smoke coverage proving staged handler readiness appears in
  health/admin metadata without making routes registerable.

### Rollback Notes

- Revert this revision to remove staged registered-device sync handler
  readiness from health/admin/bootstrap planning.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pull/push handlers, queue replay, pull queries, cursor
  advancement, last-seen writes, and route-connected database writes remain
  disabled before and after rollback.

## 2026-06-06 - Registered-Device Permission Readiness Assembly

### What Changed

- Added `OfflineRegisteredDevicePermissionResolverFactory` to assemble the
  staged registered-device permission resolver from a WordPress database
  adapter, registered-device repository, and session update repository.
- Added a health/admin presenter for registered-device permission readiness,
  exposing non-secret dependency flags, registered route scope counts, and
  configuration issue codes.
- Wired health output, admin System Status, and offline route bootstrap
  planning through the staged resolver factory so pull/push permission
  callbacks can be planned when database dependencies are ready.
- Kept controller callbacks, route registration, queue replay, last-seen
  route writes, and live offline routes disabled.
- Added unit coverage for resolver factory assembly, provider failure
  fail-closed behavior, session update application, and readiness presentation.
- Extended the WordPress smoke test to verify registered-device permission
  readiness and pull/push permission callback planning without live routes.
- Updated project, plugin, and offline app package versions to `0.92.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, roadmap, and plugin docs.

### Why

Staging now needs to prove that future registered-device pull/push permission
callbacks can be assembled from database-backed dependencies without opening
the live offline sync routes. This revision adds that readiness boundary and
keeps it fail-closed when database access is unavailable or a provider fails.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionResolverFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDevicePermissionReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionReadinessStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing WordPress schema version `8`.
- No local offline app SQLite schema changes were made.

### Tests Added

- Factory coverage for missing database configuration, configured resolver
  assembly, provider failures, secret-free audits, and applied session updates.
- Presenter coverage for blocked/ready health payloads and admin summaries.
- Smoke coverage proving pull/push permission callbacks can be planned as
  ready while controller callbacks and live routes remain disabled.

### Rollback Notes

- Revert this revision to remove registered-device permission resolver
  assembly and readiness reporting.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pull/push handlers, queue replay, last-seen writes, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Staged Pairing Route Handler Assembly

### What Changed

- Added `OfflineDeviceRegistrationRouteHandlerFactory` to assemble the staged
  registration route handler from a WordPress database adapter, registration
  repository, registration service, and settings-backed pairing authorizer.
- Extended staged pairing route readiness planning with handler readiness
  summaries and optional factory-built handler resolution.
- Wired health and admin System Status readiness through the handler factory
  while preserving disabled live route registration.
- Added unit tests for configured handler assembly, incomplete policy
  fail-closed behavior, database-provider failures, and planner readiness.
- Updated project, plugin, and offline app package versions to `0.91.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

Staging needs to prove that the future pairing route handler can be composed
from real repository/service dependencies without enabling the live REST route.
This revision adds that assembly boundary and keeps it fail-closed until both
database access and the hash-only pairing policy are ready.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineDeviceRegistrationRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineDevicePairingRouteReadinessPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Factory coverage for missing dependencies, configured staging handler
  assembly, incomplete pairing policy lockout, and database provider failure.
- Planner coverage proving factory-built handlers make the staged controller
  callback ready without registering the disabled route.

### Rollback Notes

- Revert this revision to remove settings-backed route-handler assembly and
  handler readiness summaries.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, queue replay, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Offline Pairing Policy Readiness Visibility

### What Changed

- Added non-secret pairing policy summaries to
  `OfflineDevicePairingAuthorizerFactory`.
- Extended staged pairing route readiness planning to report whether the
  saved hash-only pairing policy is configured.
- Allowed settings-backed factories to provide the staged pairing permission
  callback only when policy readiness is complete.
- Wired health and admin System Status pairing readiness through the
  settings-backed factory so staging can inspect policy readiness without
  enabling live routes.
- Updated project, plugin, and offline app package versions to `0.90.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

Staging staff need to distinguish an injected authorizer from a complete saved
pairing policy before live route enablement is considered. This revision makes
policy readiness visible and keeps incomplete settings from being treated as a
ready pairing permission callback.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDevicePairingAuthorizerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineDevicePairingRouteReadinessPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineDevicePairingRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRouteReadinessStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Factory tests for non-secret policy summary counts and configuration issues.
- Readiness planner tests proving complete settings policies make staged
  permissions ready while incomplete settings policies keep permissions locked.
- Status presenter test coverage for policy readiness text in admin summaries.

### Rollback Notes

- Revert this revision to remove settings-backed pairing policy readiness
  reporting.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, queue replay, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Settings-Backed Pairing Authorizer Factory

### What Changed

- Added `OfflineDevicePairingAuthorizerFactory` to build a plan-only pairing
  authorizer or pairing permission callback from sanitized offline pairing
  authorization settings.
- Added fail-closed handling for missing, malformed, or failing settings
  providers so staged pairing authorization falls back to an empty deny policy.
- Added unit tests for settings-backed callback authorization, raw-pairing-code
  omission, provider-failure denial, and secret-free audits.
- Updated project, plugin, and offline app package versions to `0.89.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

The hash-only pairing settings now need a safe runtime bridge for future
staging bootstrap code. This revision provides that bridge without changing
default route registration, without issuing production tokens, and without
allowing raw pairing codes to become a stored policy source.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDevicePairingAuthorizerFactory.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Factory test proving sanitized settings can authorize a valid staged pairing
  permission callback.
- Factory test proving raw pairing-code-only settings are ignored and fail
  closed.
- Factory test proving settings provider failures fall back to denial without
  leaking exception details or pairing codes.

### Rollback Notes

- Revert this revision to remove settings-backed staged pairing authorizer
  construction.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, queue replay, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Offline Pairing Authorization Settings

### What Changed

- Added `OfflinePairingAuthorizationSettings` for hash-only staged pairing
  policy normalization.
- Wired offline pairing authorization policy defaults and sanitization into
  platform settings.
- Added settings tests for SHA-256 pairing-code hash allowlists,
  manager/location allowlists, mode-specific scopes, UTC expiry windows,
  partial updates, and raw pairing-code omission.
- Updated project, plugin, and offline app package versions to `0.88.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

The pairing authorizer should be driven by a safe policy source before future
staging route wiring is attempted. This revision creates that settings
contract while preserving the security rule that raw pairing codes are never
stored in WordPress options.

### Files Affected

- `apps/wordpress-plugin/src/Settings/OfflinePairingAuthorizationSettings.php`
- `apps/wordpress-plugin/src/Settings/Settings.php`
- `apps/wordpress-plugin/tests/Unit/SettingsTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Settings default test proving offline pairing authorization settings do not
  contain raw pairing-code fields.
- Settings sanitization test proving valid SHA-256 hashes, manager/location
  allowlists, mode scopes, and UTC expiry are normalized while raw pairing
  codes are ignored.
- Settings helper test proving partial policy updates preserve existing safe
  values.

### Rollback Notes

- Revert this revision to remove the staged offline pairing authorization
  settings contract.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, queue replay, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Registration Route Pairing Authorization Response

### What Changed

- Added a distinct
  `offline_device_pairing_authorization_denied` response code for injected
  offline device registration route-handler responses with status `403`.
- Added route-handler/controller coverage proving denied pairing authorization
  stops before credential issuance or registration repository writes.
- Updated project, plugin, and offline app package versions to `0.87.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

The service-level defense-in-depth path can already reject unauthorized
pairing before writes. This revision proves that the staged route-handler
boundary reports that denial clearly through the controller response, giving
future staging tests a stable 403 contract before live route registration is
considered.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineDeviceRegistrationRouteHandler.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Route-handler/controller test proving denied pairing authorization returns
  `403` with `offline_device_pairing_authorization_denied`, omits credential
  data, skips repository writes, and keeps raw pairing codes out of response
  and audit payloads.

### Rollback Notes

- Revert this revision to restore the generic registration rejection response
  code for staged route-handler pairing authorization denials.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, queue replay, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Registration Service Pairing Authorization

### What Changed

- Added optional pairing authorizer injection to
  `OfflineDeviceRegistrationService`.
- Added `pairing_authorization` audit payload support to
  `OfflineDeviceRegistrationServiceResult`.
- Added service tests proving authorized pairing can proceed to credential
  issuance/repository registration, and denied pairing stops before credentials
  or repository writes.
- Updated project, plugin, and offline app package versions to `0.86.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

The permission callback remains the staged REST gate, but direct service tests
also need a defense-in-depth path before any future route enablement. This
revision proves the registration service can consume the same pairing policy
and fail closed before one-time credentials or database writes are created.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationService.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationServiceResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Service test proving an authorized pairing policy can proceed to registration
  with pairing authorization audit metadata.
- Service test proving a denied pairing policy returns a 403 rejection before
  credential issuance or repository writes.

### Rollback Notes

- Revert this revision to remove registration-service pairing authorization
  enforcement and audit payload support.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, queue replay, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Pairing Authorization Policy

### What Changed

- Added `OfflineDevicePairingAuthorizationResult` for secret-free authorization
  outcomes and audit payloads.
- Added `OfflineDevicePairingAuthorizer` for plan-only pairing authorization
  checks against configured SHA-256 pairing-code hashes, manager/location
  allowlists, mode-specific requested scopes, and UTC expiry windows.
- Added authorizer tests for accepted policy, denied code/manager/location/
  scope/expiry policy, missing configuration, and injection into the staged
  pairing permission callback adapter.
- Updated project, plugin, and offline app package versions to `0.85.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

The staged pairing permission callback needs a concrete policy implementation
before any future route-enablement work can safely test live pairing behavior.
This revision proves pairing authorization can be strict, deterministic, and
secret-free while keeping the route disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDevicePairingAuthorizationResult.php`
- `apps/wordpress-plugin/src/Offline/OfflineDevicePairingAuthorizer.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Authorizer acceptance test for matching hashed pairing code, allowed manager,
  allowed location, allowed scopes, and active expiry window.
- Authorizer denial test for rejected pairing code, manager, location, scopes,
  and expired pairing window.
- Missing-policy test proving unconfigured policies deny without leaking the
  raw pairing code.
- Permission-callback injection test proving the authorizer can back the staged
  pairing adapter.

### Rollback Notes

- Revert this revision to remove the plan-only pairing authorizer and tests.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, queue replay, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Pairing Readiness Health And Admin Status

### What Changed

- Added `OfflineDevicePairingRouteReadinessStatusPresenter` for health and
  admin summaries of the staged pairing route readiness plan.
- Exposed `offline_device_pairing_route_readiness` in the authenticated health
  payload.
- Added an admin System Status row for offline pairing route readiness.
- Added presenter tests and WordPress integration smoke assertions proving the
  default pairing route stays blocked, handlerless, permission-locked, and
  deferred.
- Updated project, plugin, and offline app package versions to `0.84.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

The staged pairing readiness summary should be visible to authorized staging
reviewers without registering a live WordPress REST route. This revision puts
the existing readiness metadata into health and admin inspection surfaces while
preserving the disabled route gate.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineDevicePairingRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRouteReadinessStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Pairing readiness status presenter tests for blocked default health payloads.
- Pairing readiness status presenter tests for ready-but-gated staged admin
  summaries.
- WordPress integration smoke assertions for the new authenticated health
  payload field.

### Rollback Notes

- Revert this revision to remove health/admin exposure of pairing readiness.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, queue replay, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Pairing Route Readiness Summary

### What Changed

- Added `OfflineDevicePairingRouteReadinessPlanner` to summarize staged
  pairing route readiness without registering live routes.
- Composed the injected offline device registration route handler and
  configured pairing permission callback into the existing route registration
  and bootstrap planners.
- Added tests proving missing dependencies remain blocked, configured staged
  dependencies report ready-but-gated, and unconfigured pairing authorizers keep
  permission readiness locked.
- Updated project, plugin, and offline app package versions to `0.83.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

Staging needs one compact inspection point for the pairing route before live
offline route registration is allowed. This revision proves the handler and
permission sides can be assembled together while preserving the
disabled-by-default route gate and deferred registration status.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineDevicePairingRouteReadinessPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Pairing route readiness tests for missing handler/permission dependencies.
- Pairing route readiness tests for configured staged dependencies that remain
  gated by disabled-by-default route registration.
- Pairing route readiness tests for unconfigured pairing authorizers.

### Rollback Notes

- Revert this revision to remove the pairing route readiness summary and tests.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, queue replay, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Pairing Permission Authorizer Readiness

### What Changed

- Added `OfflineDevicePairingPermissionCallbackAdapter::is_configured()` to
  report whether a pairing authorizer has been injected.
- Updated `OfflineRoutePermissionCallbackFactory` so unconfigured pairing
  permission adapters are not returned as route permission callbacks.
- Added adapter, factory, and planner tests proving unconfigured pairing
  callbacks deny direct calls but are not treated as route-ready.
- Updated project, plugin, and offline app package versions to `0.82.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

A pairing permission adapter without an authorizer is callable but cannot allow
any real request. Route-readiness metadata should represent configured staging
dependencies, not merely the existence of an invokable object. This revision
keeps unconfigured pairing adapters fail-closed before route registration.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDevicePairingPermissionCallbackAdapter.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRoutePermissionCallbackFactory.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Pairing permission adapter tests for authorizer configuration reporting.
- Permission callback factory tests proving unconfigured pairing callbacks are
  not attached.
- Route registration planner tests proving unconfigured pairing callbacks keep
  permission readiness fail-closed.

### Rollback Notes

- Revert this revision to remove the authorizer-readiness guard and tests.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, queue replay, and
  route-connected database writes remain disabled before and after rollback.

## 2026-06-06 - Pairing-Only Permission Factory Decoupling

### What Changed

- Made `OfflineRoutePermissionCallbackFactory` accept an optional
  `OfflineRegisteredDevicePermissionResolver`.
- Kept registered-device pull/push permission callbacks fail-closed when the
  resolver is absent.
- Added factory coverage proving pairing callbacks can be staged without a
  registered-device resolver.
- Added planner coverage proving pairing route permission readiness can be
  tracked independently while pull/push permission callbacks remain unavailable.
- Updated project, plugin, and offline app package versions to `0.81.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

The pairing route is the first staged offline route to move toward local
verification, and it should not require registered-device pull/push resolver
wiring before its own permission boundary can be tested. This revision decouples
that setup while preserving fail-closed behavior for registered-device routes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRoutePermissionCallbackFactory.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline route permission callback factory tests for pairing-only setup
  without a registered-device resolver.
- Offline route permission callback factory tests proving registered-device
  callbacks require a resolver.
- Offline route registration planner tests proving pairing readiness can be
  tracked independently while pull/push permissions stay locked.

### Rollback Notes

- Revert this revision to restore the registered-device resolver as a required
  factory dependency and remove the pairing-only readiness tests.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, pairing registration writes, registered-device
  pull/push permission wiring, queue replay, and route-connected database
  writes remain disabled before and after rollback.

## 2026-06-06 - Offline Route Handler Readiness Enforcement

### What Changed

- Added `OfflineController::has_handler()` so route planning can distinguish a
  controller method from an explicitly injected live handler.
- Updated `OfflineRouteRegistrationPlanner` to mark controller callbacks ready
  only when the controller method exists and an injected handler is callable.
- Added registrar coverage proving a future live-flagged offline route is not
  registered when it only has default disabled controller methods.
- Updated project, plugin, and offline app package versions to `0.80.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

Permission readiness and controller method presence are not sufficient to open a
route. This revision prevents a staged route from registering against the
offline controller's disabled fallback methods unless the matching handler has
been explicitly injected.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineController.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRouteRegistrationPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineControllerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline controller readiness tests proving only injected handlers report
  ready.
- Offline route registration planner tests proving bare default controllers do
  not satisfy controller callback readiness.
- Offline route registrar tests proving a future enabled route is not
  registered when the controller lacks the injected handler.

### Rollback Notes

- Revert this revision to remove the handler-readiness guard, tests, version
  bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline routes, production device registration writes, queue replay, and
  route-connected permission/database writes remain disabled before and after
  rollback.

## 2026-06-06 - Offline Device Pairing Permission Callback Adapter

### What Changed

- Added `OfflineDevicePairingPermissionCallbackAdapter` for opt-in staged
  pairing route permission checks.
- Added parser-backed request-body validation, injected manager/pairing
  authorization, missing-authorizer denial, authorizer rejection handling, and
  secret-free permission audit payloads.
- Extended `OfflineRoutePermissionCallbackFactory` so a supplied pairing
  callback can attach to the pairing route while default construction still
  returns no pairing callback.
- Updated route registration planning to treat injected invokable callbacks as
  readiness metadata while `live_enabled_by_default` still blocks route
  registration.
- Added unit tests for callback authorization/denial behavior, factory
  attachment, planner readiness metadata, and raw pairing-code audit redaction.
- Updated project, plugin, and offline app package versions to `0.79.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

The registration handler can now produce a staged pairing response, but a live
route also needs a permission boundary that validates the pairing request and
delegates manager/pairing-code authorization. This revision adds that boundary
as an injectable dependency without changing the default fail-closed route
state.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDevicePairingPermissionCallbackAdapter.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRoutePermissionCallbackFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRouteRegistrationPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device pairing permission callback tests for successful injected
  authorization, invalid payload short-circuiting, missing-authorizer denial,
  authorizer rejection, and secret-free audits.
- Offline route permission factory and registration planner tests for optional
  pairing callback attachment and readiness metadata while route registration
  remains disabled.

### Rollback Notes

- Revert this revision to remove the opt-in pairing permission callback
  adapter, factory/planner changes, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default offline pairing route permissions, live route registration,
  production token issuance, and route-connected device registration writes
  remain disabled before and after rollback.

## 2026-06-06 - Offline Device Registration Route Handler Adapter

### What Changed

- Added `OfflineDeviceRegistrationRouteHandler` for opt-in staged pairing
  handler dispatch through `OfflineController`.
- Mapped `OfflineDeviceRegistrationService` registered, invalid, and rejected
  outcomes into stable `register_offline_device` response envelopes.
- Stored only the service's secret-free audit payload for later diagnostics.
- Added unit tests for injected controller dispatch, invalid payload
  short-circuiting without repository access, repository rejection mapping, and
  audit redaction of raw device tokens and token hashes.
- Updated project, plugin, and offline app package versions to `0.78.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

The registration service is now route-ready but must remain opt-in until
staging verifies pairing, authentication, and rollback behavior. This revision
adds a small handler adapter future staging bootstraps can inject into the
offline controller without changing the default fail-closed route posture.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineDeviceRegistrationRouteHandler.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device registration route handler tests for successful injected
  controller registration, invalid pairing payload handling without repository
  calls, repository rejection mapping, response-code stability, and
  secret-free retained audit payloads.

### Rollback Notes

- Revert this revision to remove the opt-in route handler adapter, tests,
  version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Default offline controller callbacks, live pairing routes, production token
  issuance, and route-connected device registration writes remain disabled
  before and after rollback.

## 2026-06-06 - Offline Device Registration Service Orchestration

### What Changed

- Added `OfflineDeviceRegistrationService` for future pairing-flow
  orchestration.
- Added `OfflineDeviceRegistrationServiceResult` for registered, invalid, and
  rejected outcomes with status codes, one-time response payloads,
  validation/repository errors, and secret-free service audits.
- Composed pairing request validation, credential issuance, registration
  planning, and explicitly injected repository insertion behind a testable
  boundary.
- Added unit tests for successful registration, invalid payload short-circuit,
  missing repository configuration, repository rejection, and audit redaction
  of raw device tokens and token hashes.
- Updated project, plugin, and offline app package versions to `0.77.0`.
- Updated API, offline sync, architecture, database, deployment, changelog,
  security, testing, and plugin docs.

### Why

Credential issuance and repository insertion now exist as separate guarded
pieces. This revision adds the orchestration boundary future staging-only route
handlers can inject, while preserving the current fail-closed posture: no live
route wiring, no route-connected writes, and no production token issuance.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationService.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationServiceResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device registration service tests for successful pairing
  orchestration, invalid payload handling, missing repository configuration,
  repository rejection, stable result envelopes, and secret-free audits.

### Rollback Notes

- Revert this revision to remove offline device registration service
  orchestration, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live pairing routes and production token issuance remain disabled before and
  after rollback.

## 2026-06-06 - Offline Device Registration Credential Issuance

### What Changed

- Added `OfflineDeviceRegistrationCredentialIssuer` for future pairing-flow
  credential issuance.
- Added `OfflineDeviceRegistrationCredentials` for generated device IDs,
  one-time device tokens, SHA-256 token hashes, UTC issue/expiry timestamps,
  token TTL, and secret-free audit payloads.
- Added TTL bounds, strict UTC issue-time validation, UUIDv4 byte shaping,
  injectable byte generation for deterministic tests, and byte-length guards.
- Added unit tests for deterministic credential generation, default/custom TTLs,
  token hashing, audit fingerprints, invalid TTLs, invalid issue timestamps,
  and malformed byte generators.
- Updated project, plugin, and offline app package versions to `0.76.0`.
- Updated API, offline sync, architecture, deployment, changelog, and plugin
  docs.

### Why

The registration planner expects generated public IDs, one-time device tokens,
token hashes, issue timestamps, and expiry timestamps. This revision creates a
dedicated issuance boundary so future staging-only pairing handlers can compose
credential issuance, registration planning, and repository insertion without
putting raw tokens into audits or enabling production route writes.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationCredentialIssuer.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationCredentials.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationCredentialIssuerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device registration credential issuer tests for deterministic UUIDv4
  device IDs, one-time hex tokens, SHA-256 token hashes, UTC issue/expiry
  timestamps, default/custom TTLs, secret-free audit fingerprints, invalid TTL
  rejection, invalid timestamp rejection, and byte-generator length guards.

### Rollback Notes

- Revert this revision to remove offline device credential issuance, version
  bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live pairing routes and production token issuance remain disabled before and
  after rollback.

## 2026-06-06 - Offline Device Registration Repository Adaptation

### What Changed

- Added `OfflineDeviceRegistrationRepository` for explicitly called future
  `tcg_offline_devices` insert execution.
- Added `OfflineDeviceRegistrationRepositoryResult` for inserted/rejected
  outcomes, rows affected, insert ID capture, one-time response payloads, and
  secret-free audit metadata.
- Added unit tests for successful prepared inserts, invalid registration plans,
  failed database inserts, zero-row inserts, unexpected row counts, and audit
  redaction of raw device tokens and token hashes.
- Updated project, plugin, and offline app package versions to `0.75.0`.
- Updated API, offline sync, architecture, deployment, changelog, and plugin
  docs.

### Why

Offline device registration now has a validated row plan and prepared insert
query. The next persistence boundary needs a repository result contract so
future staging-only pairing handlers can execute inserts and fail closed
without exposing one-time credentials in audit logs. This revision adds that
adapter while keeping live routes and route-connected writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationRepository.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device registration repository tests for accepted `$wpdb` insert
  execution, invalid pre-query rejection, failed insert rejection, zero-row
  rejection, unexpected row-count rejection, insert ID reporting, and
  secret-free repository audits.

### Rollback Notes

- Revert this revision to remove offline device registration repository
  adaptation, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live pairing routes and route-connected device registration writes remain
  disabled before and after rollback.

## 2026-06-06 - Offline Device Registration Insert Query Planning

### What Changed

- Added `OfflineDeviceRegistrationInsertQueryBuilder` for future
  `tcg_offline_devices` insert planning.
- Added `OfflineDeviceRegistrationInsertQueryPlan` for prepared SQL templates,
  prepare arguments, insert columns, validation errors, and redacted audit
  metadata.
- Added validation for table prefixes, public ID length, location/manager IDs,
  labels, modes, token hashes, token expiry timestamps, scopes/capabilities
  JSON, app versions, platform, active status, nullable session/revocation
  fields, issued timestamps, and token expiry windows.
- Added unit tests for valid insert templates, invalid table prefixes,
  malformed registration rows, unexpected session/revocation state, and
  secret-free audit payloads.
- Updated project, plugin, and offline app package versions to `0.74.0`.
- Updated API, offline sync, architecture, deployment, changelog, and plugin
  docs.

### Why

Offline device registration already produces a safe planned device row, but the
next persistence boundary needs a deterministic SQL contract before any live
repository writes are enabled. This revision prepares and tests that insert
contract while keeping live registration routes and database execution disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationInsertQueryBuilder.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationInsertQueryPlan.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationInsertQueryBuilderTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteValidationHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device registration insert query builder tests for accepted prepared
  inserts, invalid table prefixes, malformed rows, unexpected session state,
  JSON normalization, UTC timestamp conversion, schema-length public IDs, and
  secret-free audits.

### Rollback Notes

- Revert this revision to remove offline device registration insert query
  planning, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live device registration writes remain disabled before and after rollback.

## 2026-06-06 - Offline Route Bootstrap Deferred Smoke Coverage

### What Changed

- Added `registration_deferred` to offline route bootstrap status payloads.
- Added unit assertions for deferred state in blocked, gated, and future-ready
  bootstrap health payloads.
- Added WordPress integration smoke inspection for the
  `OfflineRouteBootstrapper::bootstrap_current_routes` callback on
  `rest_api_init` priority `20`.
- Added WordPress integration smoke assertion that authenticated health reports
  deferred offline route bootstrap state by default.
- Updated project, plugin, and offline app package versions to `0.73.0`.
- Updated API, offline sync, architecture, staging, deployment, changelog, and
  plugin docs.

### Why

The bootstrapper is now wired to WordPress, so staging needs an explicit smoke
check proving the hook exists while the health payload still reports that
registration is deferred. This keeps route-enablement readiness visible without
opening live offline endpoints.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRouteBootstrapStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteBootstrapStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteValidationHandlerFactoryTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline route bootstrap status presenter assertions for deferred registration
  state.
- WordPress integration smoke assertions for the offline route bootstrapper
  `rest_api_init` hook and deferred health output.

### Rollback Notes

- Revert this revision to remove deferred bootstrap health reporting, hook
  smoke assertions, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Current offline route contracts register zero routes before and after
  rollback.

## 2026-06-06 - Offline Route Bootstrapper Wiring

### What Changed

- Added `OfflineRouteBootstrapper` to bridge WordPress `rest_api_init` to the
  guarded offline route registrar.
- Wired the bootstrapper into plugin initialization after authenticated health
  route registration.
- Added guarded bootstrap result payloads for status, feature state, planned
  and registerable route counts, registered route keys, deferred state, and
  block reasons.
- Added tests proving the registrar is not called when the offline feature is
  disabled or current route plans remain gated, and is called for a synthetic
  future-ready plan.
- Updated project, plugin, and offline app package versions to `0.72.0`.
- Updated API, offline sync, architecture, staging, deployment, changelog, and
  plugin docs.

### Why

The project now has route planning, guarded registration, parser-only handlers,
and health/admin readiness reporting. This revision adds the production-safe
bootstrap boundary needed for future staging enablement while still deferring
current offline route registration until feature and readiness gates pass.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRouteBootstrapper.php`
- `apps/wordpress-plugin/src/Bootstrap/Plugin.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteBootstrapperTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteValidationHandlerFactoryTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline route bootstrapper tests for disabled feature-gate deferral, gated
  current route plans, future-ready registrar execution, and feature-blocked
  future-ready plans.

### Rollback Notes

- Revert this revision to remove offline route bootstrapper wiring, version
  bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Current offline route contracts register zero routes before and after
  rollback.

## 2026-06-06 - Offline Route Bootstrap Status Reporting

### What Changed

- Added `OfflineRouteBootstrapStatusPresenter` for staging-safe health and
  admin status payloads.
- Added blocked, gated, and ready bootstrap status values derived from the
  feature gate and route registration plan.
- Added the offline route bootstrap payload to authenticated health responses.
- Added an Offline route bootstrap row to the admin System Status screen.
- Added WordPress integration smoke assertions proving offline pull/push routes
  stay unregistered and the health endpoint reports blocked bootstrap status by
  default.
- Added tests for blocked, gated, ready, and admin-summary bootstrap status
  payloads.
- Updated project, plugin, and offline app package versions to `0.71.0`.
- Updated API, offline sync, architecture, staging, deployment, changelog, and
  plugin docs.

### Why

The bootstrap planner can now determine whether offline routes are ready to
register, but staging needs a visible status before any route registrar is
called. This revision surfaces that readiness through authenticated health and
admin System Status without enabling route registration or database writes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRouteBootstrapStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteBootstrapStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteValidationHandlerFactoryTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/STAGING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline route bootstrap status presenter tests for blocked default state,
  gated feature-enabled state, ready future route plans, and admin summary
  output.
- WordPress integration smoke assertions for absent offline pull/push routes
  and blocked offline bootstrap health status.

### Rollback Notes

- Revert this revision to remove offline route bootstrap status presentation,
  health/admin wiring, smoke assertions, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Current offline route contracts register zero routes before and after
  rollback.

## 2026-06-06 - Offline Route Bootstrap Planner

### What Changed

- Added `OfflineRouteBootstrapPlanner` for future staging bootstrap checks.
- Added route bootstrap summaries with feature-gate status, planned route
  counts, registerable route counts, registerable route keys, route
  registration summaries, and bootstrap block reasons.
- Added deterministic planning from existing `OfflineRouteRegistrationPlanner`
  metadata plus a direct planned-args path for future route-readiness tests.
- Added tests proving the bootstrap remains blocked when the feature flag is
  disabled, reports no-registerable-route gating for current contracts, and
  can surface future registerable plans without opening live routes by default.
- Updated project, plugin, and offline app package versions to `0.70.0`.
- Updated API, offline sync, architecture, deployment, changelog, and plugin
  docs.

### Why

The route registrar can already filter ready plans, and parser-only handlers
can validate normalized requests. This revision adds the next safe bootstrap
boundary: staging can inspect whether route registration should proceed before
calling a registrar, while the current offline contracts still register zero
routes and perform no database writes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRouteBootstrapPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteBootstrapPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteValidationHandlerFactoryTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline route bootstrap planner tests for disabled feature-gate behavior,
  no-registerable-route behavior, future registerable route reporting, and
  feature-enabled registerability.

### Rollback Notes

- Revert this revision to remove the offline route bootstrap planner,
  bootstrap tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Current offline route contracts register zero routes before and after
  rollback.

## 2026-06-06 - Offline Route Validation Handlers

### What Changed

- Added `OfflineRouteValidationHandlerFactory` for parser-only offline route
  handlers that can be explicitly injected into `OfflineController`.
- Added validation handlers for device pairing, offline pull, offline push,
  conflict listing, and conflict resolution request shapes.
- Added stable validation response envelopes with callback names, status codes,
  safe summary data, deferred-write flags, route-gated flags, and validation
  errors.
- Added tests proving injected handlers validate through the controller, read
  idempotency headers, read route/query parameters, return safe summaries, keep
  writes deferred, keep routes gated, and return stable invalid responses.
- Updated project, plugin, and offline app package versions to `0.69.0`.
- Updated API, offline sync, architecture, deployment, changelog, and plugin
  docs.

### Why

The request adapter now gives controller callbacks normalized request data. This
revision adds the next route-handler boundary: future staging code can exercise
parser-only handlers through the controller before any repository-backed writes,
queue replay, conflict mutation, or live route registration is enabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRouteValidationHandlerFactory.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteValidationHandlerFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline route validation handler tests for parser-only device pairing, push,
  conflict list, conflict resolution, and rejected push responses through the
  injected controller handler map.

### Rollback Notes

- Revert this revision to remove the offline route validation handler factory,
  route-handler validation tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Current offline route contracts register zero routes before and after
  rollback.

## 2026-06-06 - Offline REST Request Adapter

### What Changed

- Added `OfflineRestRequestAdapter` to normalize future WordPress REST requests
  and local array fixtures into one offline request data boundary.
- Added `OfflineRestRequestData` for body params, query params, route params,
  normalized headers, route parameter lookup, and idempotency-key extraction.
- Updated `OfflineController` to dispatch to explicitly injected route handlers
  after request normalization while preserving fail-closed default behavior.
- Added tests proving array fixtures and WordPress-style request objects are
  normalized, idempotency headers are read, injected handlers receive normalized
  request data, and unhandled callbacks remain disabled.
- Updated project, plugin, and offline app package versions to `0.68.0`.
- Updated API, offline sync, architecture, deployment, changelog, and plugin
  docs.

### Why

The guarded route registrar can now call WordPress registration only for future
ready plans, and the controller exposes planned route callbacks. This revision
adds the next route-handler boundary: normalized request data can reach
explicitly injected handlers in tests and future staging bootstrap code without
enabling any current live offline route or database mutation.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRestRequestAdapter.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRestRequestData.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineController.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRestRequestAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineControllerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline REST request adapter tests for wrapped array fixtures, unwrapped body
  payloads, WordPress-style request objects, route params, query params, and
  idempotency header normalization.
- Offline controller dispatch tests for injected handler receipt of normalized
  request data and continued fail-closed behavior for unhandled callbacks.

### Rollback Notes

- Revert this revision to remove the offline request adapter, normalized
  request data value, controller handler dispatch, tests, version bump, and
  docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Current offline route contracts register zero routes before and after
  rollback.

## 2026-06-06 - Offline Route Registrar Guard

### What Changed

- Added `OfflineRouteRegistrar` for guarded future WordPress REST route
  registration.
- Added injected route-registration callable support for tests and a default
  fallback to WordPress `register_rest_route()` when available.
- Added route registration shaping for enabled plans, including method,
  controller callback, and permission callback arguments.
- Added tests proving current offline route contracts register zero routes by
  default.
- Added tests proving a simulated future enabled pull route registers once only
  when controller and permission callbacks are both ready.
- Added tests proving live-flagged routes without ready permission callbacks do
  not register.
- Updated project, plugin, and offline app package versions to `0.67.0`.
- Updated API, offline sync, architecture, deployment, changelog, and plugin
  docs.

### Why

The controller scaffold and registration planner can describe route readiness.
This revision adds the guarded call boundary to WordPress route registration
while ensuring the current offline contracts still register nothing by default.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRouteRegistrar.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline route registrar tests for default disabled registration, future
  enabled plan registration shaping, and missing-permission-callback blocking.

### Rollback Notes

- Revert this revision to remove the guarded offline route registrar, registrar
  tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Current offline route contracts register zero routes before and after
  rollback.

## 2026-06-06 - Offline Controller Fail-Closed Scaffold

### What Changed

- Added `OfflineController` with callback methods for every planned offline
  route contract.
- Added stable fail-closed disabled responses for offline pairing, pull, push,
  conflict list, and conflict resolution callbacks.
- Updated `OfflineRouteRegistrationPlanner` to accept an optional offline
  controller and expose controller callback metadata, controller readiness, and
  callable controller targets without enabling route registration.
- Updated registration block reasons so controller-not-ready is removed only
  when the fail-closed controller scaffold is supplied.
- Added tests for controller callback coverage, disabled responses, planner
  controller readiness metadata, continued route disablement, and public
  permission bypass prevention.
- Updated project, plugin, and offline app package versions to `0.66.0`.
- Updated API, offline sync, architecture, deployment, changelog, and plugin
  docs.

### Why

The route registration planner can now describe permission callback readiness.
The next safe bridge is proving that controller callback methods exist while
still failing closed and keeping all offline routes blocked until staging
integration tests and live handlers are ready.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineController.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRouteRegistrationPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineControllerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline controller scaffold tests for complete callback coverage and
  fail-closed disabled responses.
- Offline route registration planner tests for controller callback readiness
  metadata without live route enablement.

### Rollback Notes

- Revert this revision to remove the fail-closed offline controller scaffold,
  controller callback readiness metadata, controller tests, version bump, and
  docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- REST route registration, live WordPress permission callback wiring, queue
  replay workers, and route-connected database writes remain disabled both
  before and after rollback.

## 2026-06-06 - Offline Route Registration Planner

### What Changed

- Added `OfflineRouteRegistrationPlanner` for planned offline WordPress REST
  route registration metadata.
- Added disabled-by-default route plans with namespace, path, methods,
  callback names, permission labels, permission strategies, required scopes,
  permission callback readiness, controller callback readiness, and block
  reasons.
- Added fail-closed `__return_false` permission callbacks for routes that do
  not yet have a registered-device callback adapter.
- Added registered-device permission callback adapter attachment for pull/push
  routes as planned metadata only.
- Added tests proving all planned offline routes remain unregistered by
  default, pull/push callbacks attach as metadata, pairing/conflict routes stay
  locked, and no plan uses a public `__return_true` permission bypass.
- Updated project, plugin, and offline app package versions to `0.65.0`.
- Updated API, offline sync, architecture, deployment, changelog, and plugin
  docs.

### Why

The previous checkpoint mapped offline route contracts to registered-device
permission callbacks. This revision adds the next bridge toward WordPress REST
registration while preserving the staging gate: routes can be inspected as
planned registration metadata, but no offline route is eligible for live
registration.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRouteRegistrationPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline route registration planner tests for disabled-by-default route plans,
  planned registered-device permission callback metadata, locked pairing and
  conflict routes, and no public permission bypasses.

### Rollback Notes

- Revert this revision to remove planned route registration metadata, route
  registration planner tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- REST route registration, live WordPress permission callback wiring, queue
  replay workers, and route-connected database writes remain disabled both
  before and after rollback.

## 2026-06-06 - Offline Route Permission Callback Factory

### What Changed

- Added `required_scope` and `permission_strategy` metadata to the planned
  offline REST route contracts.
- Added `OfflineRoutePermissionCallbackFactory` for future WordPress REST
  `permission_callback` wiring of registered-device routes.
- Added scope-map generation for registered-device routes, currently mapping
  `POST /offline/pull` to `offline_pull` and `POST /offline/push` to
  `offline_push`.
- Added factory behavior that builds registered-device callback adapters only
  for route contracts with registered-device permissions and required scopes.
- Added `required_scope()` access to the registered-device permission callback
  adapter for route wiring verification.
- Added tests for route scope metadata, permission strategy metadata,
  registered-device callback maps, non-device route exclusion, factory-created
  callback authorization, session update application, and audit redaction.
- Updated project, plugin, and offline app package versions to `0.64.0`.
- Updated API, offline sync, architecture, deployment, changelog, and plugin
  docs.

### Why

The resolver and callback adapter can now authenticate devices and apply
last-seen updates, but future REST registration needs a stable bridge from
route contracts to required device scopes. This revision adds that bridge while
keeping every offline route disabled by default.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRouteContracts.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRoutePermissionCallbackFactory.php`
- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionCallbackAdapter.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteContractTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline route contract tests for registered-device required scopes and stable
  permission strategies.
- Offline route permission callback factory tests for scope maps, callback
  construction, non-device route exclusion, factory-created authorization,
  session update application, and redacted audits.

### Rollback Notes

- Revert this revision to remove planned route permission callback factory
  wiring, route scope metadata, factory tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- REST route registration, live WordPress permission callback wiring, queue
  replay workers, and route-connected database writes remain disabled both
  before and after rollback.

## 2026-06-06 - Offline Registered Device Permission Callback Adapter

### What Changed

- Added a planned registered-device permission callback adapter for future
  WordPress REST `permission_callback` wiring.
- Added request header extraction for direct header arrays, wrapped `headers`
  arrays, `get_headers()` request objects, and `get_header()` request objects.
- Added boolean `__invoke()` support plus `authorize()` and
  `last_resolution()` access so future route callbacks can return a simple
  permission result while still preserving audit detail.
- Added fixed-clock injection for deterministic tests and future callback
  composition.
- Added tests for authorized WordPress-style requests, stale update denial,
  missing headers without database access, get-header style requests, plan-only
  resolver compatibility, and audit redaction.
- Updated project, plugin, and offline app package versions to `0.63.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

Permission resolution can now load, authenticate, and optionally update
last-seen state, but live REST routes still need a WordPress-shaped callback
boundary. This adapter adds that boundary without registering the offline
routes or changing public behavior.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionCallbackAdapter.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline registered-device permission callback adapter tests for
  WordPress-style header extraction, boolean callback invocation,
  last-resolution access, stale update denial, missing-header denial before
  database access, get-header style requests, plan-only resolver compatibility,
  and secret-free audits.

### Rollback Notes

- Revert this revision to remove the planned permission callback adapter,
  callback adapter tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- REST route registration, WordPress permission callback wiring, queue replay
  workers, and route-connected database writes remain disabled both before and
  after rollback.

## 2026-06-06 - Offline Permission Resolution Session Update Application

### What Changed

- Added an opt-in session update application path to the registered-device
  permission resolver for future REST permission callbacks.
- Kept the existing `resolve()` method plan-only and added
  `resolve_and_apply_session_update()` for the future live callback boundary.
- Extended permission resolutions with optional session update results,
  attempted/applied audit fields, update status, redacted update audit payloads,
  and combined stale/failed update errors.
- Made stale optimistic updates and failed database updates deny the resolution
  so future live callers reload instead of trusting a changed device row.
- Added tests for applied session updates, stale update denial, failed update
  denial, denied-device skip behavior, and redacted audits.
- Updated project, plugin, and offline app package versions to `0.62.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

The previous checkpoint added the narrow `$wpdb` update adapter. This revision
composes that adapter into the permission resolution boundary without changing
live routes, giving the future `permission_callback` a single result that can
load, authenticate, update last-seen state, and fail closed on stale rows.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionResolver.php`
- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionResolution.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline registered-device permission resolver tests for opt-in session update
  application, stale optimistic update denial, failed update denial,
  denied-device skip behavior, and secret-free session update audits.

### Rollback Notes

- Revert this revision to remove the opt-in session update application path,
  resolution update-result fields, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- REST route registration, WordPress permission callback wiring, queue replay
  workers, and route-connected database writes remain disabled both before and
  after rollback.

## 2026-06-06 - Offline Device Session Update Repository Adapter

### What Changed

- Added an offline device session update repository adapter for future
  registered-device permission callbacks.
- Added a session update repository result value object that exposes applied,
  stale, and rejected outcomes with affected-row counts, stable errors, and
  secret-free audit payloads.
- Executed the planned session update SQL through `$wpdb->prepare()` and
  `$wpdb->query()` only after the query builder accepts the session plan.
- Added optimistic stale-row handling for zero affected rows, failed-write
  rejection for database errors, and unexpected-row-count rejection for
  defensive safety.
- Added tests for prepared update execution, stale row-version guards, invalid
  session plans before database access, failed writes, unexpected row counts,
  and audit payloads without raw tokens or token hashes.
- Updated project, plugin, and offline app package versions to `0.61.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

The session update query builder established a safe SQL contract for future
last-seen writes. This revision adds the narrow `$wpdb` execution adapter so
the future permission callback can apply that contract and distinguish a fresh
write from a stale row-version conflict without wiring any live routes yet.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceSessionUpdateRepository.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceSessionUpdateRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceSessionUpdateRepositoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device session update repository tests for prepared `$wpdb` update
  execution, stale optimistic row-version results, invalid session-plan
  rejection before database access, failed database updates, unexpected affected
  row counts, and secret-free repository audits.

### Rollback Notes

- Revert this revision to remove the session update repository adapter, result
  value object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- REST route registration, WordPress permission callback wiring, queue replay
  workers, and route-connected database writes remain disabled both before and
  after rollback.

## 2026-06-06 - Offline Device Session Update Query Building

### What Changed

- Added an offline device session update query builder for future registered
  device permission callbacks.
- Added a session update query plan value object that exposes a safe table name,
  prepared SQL template, prepared arguments, optimistic row-version metadata,
  stable errors, and secret-free audit payloads.
- Converted planned session `last_seen_at`, `updated_at`, and `row_version`
  rows into MySQL `datetime(6)` prepared arguments.
- Added validation for safe WordPress table prefixes, offline device IDs,
  public device IDs, UTC timestamps, next row versions, expected row versions,
  and previous-row-version consistency.
- Added tests for valid update templates, invalid table prefixes, invalid
  session rows, string row versions, optimistic row-version guards, and audit
  payloads without raw tokens or token hashes.
- Updated project, plugin, and offline app package versions to `0.60.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

The permission resolver can now produce an authenticated session update plan,
but live callbacks still need a safe SQL contract before last-seen writes are
enabled. This revision creates that contract and its validation boundary while
continuing to leave route wiring and database writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceSessionUpdateQueryBuilder.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceSessionUpdateQueryPlan.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceSessionUpdateQueryBuilderTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device session update query builder tests for prepared update
  templates, invalid table prefixes, invalid session update rows, string row
  versions, optimistic row-version guards, and secret-free query audits.

### Rollback Notes

- Revert this revision to remove the session update query builder, query plan,
  tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- REST route registration, WordPress permission callback wiring, last-seen
  writes, queue replay workers, and live database writes remain disabled both
  before and after rollback.

## 2026-06-06 - Offline Registered Device Permission Resolver

### What Changed

- Added a registered-device permission resolver for the future offline REST
  permission callback boundary.
- Added a permission resolution value object that exposes initial token
  planning, optional repository lookup results, final loaded-row permission
  planning, session plans, stable errors, and secret-free audit payloads.
- Composed token lookup planning, repository-backed device loading, row
  normalization, loaded-row authentication, not-found denial, malformed-row
  rejection, scope denial, and session update planning into one route-ready
  result.
- Kept the future last-seen update row as a plan only; no database write is
  performed by this resolver.
- Added dependency-free fake-`wpdb` tests for authorized resolution, not-found
  devices, invalid bearer tokens before repository access, malformed rows,
  denied scopes, and audit redaction.
- Updated project, plugin, and offline app package versions to `0.59.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

The repository adapter can now load and normalize a registered offline device
row, but future REST permission callbacks still need a single boundary that
starts from request headers and ends with an authorization/session outcome. This
revision adds that bridge while keeping route wiring, last-seen writes, queue
replay, and offline route handlers disabled until staging integration tests can
exercise the live path.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionResolver.php`
- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionResolution.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline registered-device permission resolver tests for repository-backed
  authorization, not-found denial, invalid bearer-token rejection before
  database access, malformed-row rejection, final permission denials, session
  update planning, and secret-free resolution audits.

### Rollback Notes

- Revert this revision to remove the permission resolver, resolution result
  object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- REST route registration, WordPress permission callback wiring, last-seen
  writes, queue replay workers, and live database writes remain disabled both
  before and after rollback.

## 2026-06-06 - Offline Registered Device Repository Adapter

### What Changed

- Added a registered-device repository adapter for the future offline REST
  permission callback boundary.
- Added a repository result value object for found, not-found, and rejected
  outcomes.
- Composed the registered-device lookup query builder, `$wpdb` prepared reads,
  row normalization, and redacted query/normalization audit payloads.
- Rejected invalid lookup query plans before database access and rejected
  malformed database rows before auth/session planners consume them.
- Added dependency-free fake-`wpdb` tests for prepared query execution,
  not-found results, invalid lookup plans, malformed rows, and audit redaction.
- Updated project, plugin, and offline app package versions to `0.58.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

The previous revision produced a safe prepared-SQL contract for registered
offline-device lookup. The next boundary needs an adapter that can execute that
planned read and normalize the returned `tcg_offline_devices` row without
wiring live REST permissions or enabling last-seen writes. This makes the
repository behavior testable and reviewable before staging connects it to
request traffic.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceRepository.php`
- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline registered-device repository tests for prepared `$wpdb` lookup
  execution, normalized found results, not-found handling, invalid lookup-plan
  rejection before database access, malformed-row rejection, and secret-free
  repository audits.

### Rollback Notes

- Revert this revision to remove the repository adapter, repository result
  object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- REST route registration, WordPress permission callback wiring, last-seen
  writes, queue replay workers, and live database writes remain disabled both
  before and after rollback.

## 2026-06-06 - Offline Registered Device Lookup Query Building

### What Changed

- Added a registered-device lookup query builder for the future offline
  device repository boundary.
- Added an immutable query-plan value object that exposes safe table names,
  selected columns, prepared SQL templates, prepared arguments, row-normalizer
  metadata, stable errors, and secret-free audit payloads.
- Validated WordPress table prefixes, the `tcg_offline_devices` table contract,
  selected columns, active/revocation/expiry filters, one-row limits, deferred
  scope checks, and the registered-device row normalizer before any SQL
  template is produced.
- Converted UTC token-expiry filters into MySQL `datetime(6)` prepared
  arguments.
- Added tests for prepared query templates, invalid lookup plans, invalid table
  prefixes, tampered query contracts, and token-hash redaction from audits.
- Updated project, plugin, and offline app package versions to `0.57.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

The permission planner can now declare that a registered-device lookup is
required and carry a repository query contract. The next staging-gated boundary
needs to transform that contract into prepared query metadata safely before a
live repository executes it. This revision adds that bridge without calling
`$wpdb`, registering live routes, mutating last-seen state, or exposing token
hashes in audit payloads.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceLookupQueryBuilder.php`
- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceLookupQueryPlan.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceLookupQueryBuilderTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline registered-device lookup query builder tests for prepared SQL
  templates, UTC-to-MySQL expiry argument conversion, invalid lookup plans,
  invalid table prefixes, tampered query contracts, and secret-free query
  audits.

### Rollback Notes

- Revert this revision to remove lookup query building, tests, version bump,
  and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live device row repository execution, route registration, WordPress
  permission callbacks, last-seen writes, queue replay workers, and `$wpdb`
  writes remain disabled both before and after rollback.

## 2026-06-06 - Offline Registered Device Permission Lookup Query Integration

### What Changed

- Integrated registered-device lookup-query planning into the future
  `registered_device` REST permission planning boundary.
- Extended the permission plan value object to carry an optional device lookup
  plan and expose future repository query arguments.
- Updated the permission planner to build lookup-query plans after valid token
  lookup and before declaring a device lookup required.
- Added rejection handling for invalid required-scope or server-time query
  plans before a future repository call is attempted.
- Added permission audit summary fields for lookup-query plan presence,
  selected-column count, lock intent, and deferred scope checks without
  exposing raw tokens or token hashes.
- Added unit coverage for lookup-required query args, invalid query planning,
  loaded-row authorization without query args, and secret-free audit payloads.
- Updated project, plugin, and offline app package versions to `0.56.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

The repository query planner existed as a standalone contract. Future REST
permission callbacks need that contract attached to lookup-required permission
plans so a repository adapter can execute the planned query and then feed the
normalized row back into authorization. This revision composes those boundaries
without querying WordPress tables, mutating device rows, or registering live
offline routes.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline registered-device permission planner tests for lookup-query args on
  lookup-required outcomes, invalid scope/time query rejection, loaded-row
  authorization without query args, and query summary audit fields without
  token-hash leakage.

### Rollback Notes

- Revert this revision to remove lookup-query composition from the permission
  planner/value object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live device row repository queries, route registration, WordPress permission
  callbacks, last-seen writes, queue replay workers, and `$wpdb` writes remain
  disabled both before and after rollback.

## 2026-06-06 - Offline Registered Device Lookup Query Planning

### What Changed

- Added an offline registered-device lookup-query planner for future
  repository-backed `registered_device` REST permission callback wiring.
- Added a lookup plan value object that exposes future repository lookup
  filters, query arguments, selected columns, lock intent, stable errors, and
  secret-free audit payloads.
- Added query planning for `tcg_offline_devices` selected columns,
  active/revocation/expiry filters, row-normalizer metadata, deferred scope
  checks, deterministic one-row lookup, and optimistic last-seen update intent.
- Added rejection handling for invalid token lookup plans, unsupported required
  scopes, and invalid server timestamps before future repository execution.
- Added unit coverage for query contract shape, row normalizer selected-column
  coverage, invalid token lookup plans, unsupported scopes, invalid server
  times, deferred scope checks, and audit payloads without raw device tokens.
- Updated project, plugin, and offline app package versions to `0.55.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

The token lookup, row normalization, loaded-row authentication, and session
planning boundaries now exist. Future live WordPress repositories need a
deterministic query contract that explains which row to load and how the raw
row will be normalized before authorization. This revision adds that contract
without querying WordPress tables, mutating device rows, or registering live
offline routes.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceLookupPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceLookupPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceLookupPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline registered-device lookup-query planner tests for query argument
  shape, selected-column coverage for the row normalizer, invalid token lookup
  plans, unsupported required scopes, invalid server times, deferred scope
  checks, lock intent, and secret-free audit payloads.

### Rollback Notes

- Revert this revision to remove the offline registered-device lookup-query
  planner/value object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live device row repository queries, route registration, WordPress permission
  callbacks, last-seen writes, queue replay workers, and `$wpdb` writes remain
  disabled both before and after rollback.

## 2026-06-06 - Offline Registered Device Row Normalization

### What Changed

- Added an offline registered-device row normalizer for future repository-backed
  `registered_device` REST permission callback wiring.
- Added a row normalization result value object exposing normalized device rows,
  stable validation errors, and secret-free audit payloads.
- Added coercion for raw `tcg_offline_devices` database identity fields,
  decoded `scopes_json` and `capabilities_json` payloads, UTC timestamp
  normalization, optional null date overrides, token-hash validation, and
  duplicate scope cleanup.
- Added rejection handling for malformed public IDs, missing labels,
  unsupported modes, invalid token hashes, invalid timestamps, invalid row
  versions, invalid JSON, and invalid JSON shapes.
- Added unit coverage for auth/session-ready database rows, decoded payloads,
  explicit null date overrides, invalid identity/hash fields, invalid times,
  invalid JSON, and invalid JSON shapes.
- Updated project, plugin, and offline app package versions to `0.54.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

The permission planner can authorize an already-loaded device row, but the
future WordPress repository still needs a deterministic boundary between raw
`$wpdb` results and auth/session planners. This revision adds that boundary
without querying WordPress tables, mutating device rows, or registering live
offline routes.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceRowNormalizationResult.php`
- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceRowNormalizer.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline registered-device row normalizer tests for raw database fields,
  decoded payloads, ISO and MySQL UTC timestamps, explicit null date overrides,
  invalid identity/hash fields, invalid row versions, invalid times, invalid
  JSON, invalid JSON shapes, and secret-free audit payloads.

### Rollback Notes

- Revert this revision to remove the offline registered-device row normalizer
  value object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live device row repository queries, route registration, WordPress permission
  callbacks, last-seen writes, queue replay workers, and `$wpdb` writes remain
  disabled both before and after rollback.

## 2026-06-06 - Offline Registered Device Permission Planning

### What Changed

- Added an offline registered-device permission planner for future
  `registered_device` REST `permission_callback` wiring.
- Added a permission plan value object that exposes token lookup filters,
  lookup-required state, authorization decisions, optional session update plans,
  stable error codes, and secret-free audit payloads.
- Composed the existing token lookup planner, loaded device-row bearer-token
  authenticator, and device session planner into one deterministic boundary.
- Added lookup-needed planning for future repository adapters before a loaded
  device row exists.
- Added rejection handling for malformed tokens, denied device scopes, and
  loaded rows that cannot produce safe session/last-seen update plans.
- Added unit coverage for lookup-required plans, authorized loaded devices,
  malformed tokens, denied scopes, invalid session rows, and audit payloads
  without raw device tokens or token hashes.
- Updated project, plugin, and offline app package versions to `0.53.0`.
- Updated API, offline sync, architecture, database, deployment, testing,
  roadmap, security, changelog, and plugin docs.

### Why

The lookup, authentication, and session planners are now present individually.
Future live REST callbacks need one small orchestration boundary that can first
derive a secret-safe lookup filter, then authorize a loaded device row, and
finally prepare the last-seen update plan. This revision adds that boundary
without querying WordPress tables, mutating device rows, or registering live
offline routes.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline registered-device permission planner tests for lookup-required
  plans, loaded-device authorization, session update planning, malformed token
  rejection, denied scopes, invalid session rows, and secret-free audits.

### Rollback Notes

- Revert this revision to remove the offline registered-device permission
  planner/value object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live device row repository queries, route registration, WordPress permission
  callbacks, last-seen writes, queue replay workers, and `$wpdb` writes remain
  disabled both before and after rollback.

## 2026-06-06 - Offline Device Session Planning

### What Changed

- Added an offline device session planner for future repository-backed
  `registered_device` REST permission callbacks.
- Added a session plan value object exposing future last-seen update rows,
  authenticated session context, and secret-free audit payloads.
- Added validation that accepted access decisions match the loaded registered
  device row by persisted offline device ID and public device ID before
  planning updates.
- Added optimistic row-version planning for future `tcg_offline_devices`
  `last_seen_at`, `updated_at`, and `row_version` updates.
- Added unit coverage for update row shape, audit payloads, string database
  IDs, denied decisions, mismatched rows, invalid timestamps, invalid device
  IDs, and invalid row versions.
- Updated project, plugin, and offline app package versions to `0.52.0`.
- Updated API, offline sync, architecture, deployment, testing, roadmap,
  changelog, and plugin docs.

### Why

After token lookup and row authentication, future live permission callbacks need
a deterministic plan for recording device activity and carrying a normalized
session context into route handlers. This slice adds that boundary without
writing to the database or registering live offline routes.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceSessionPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceSessionPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceSessionPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device session planner tests for last-seen update rows, session
  context, audit payloads, string database IDs, denied decisions, mismatched
  rows, invalid timestamps, invalid device IDs, and invalid row versions.

### Rollback Notes

- Revert this revision to remove the offline device session planner/value
  object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live device row repository queries, last-seen writes, route registration,
  permission callback wiring, queue replay workers, and `$wpdb` writes remain
  disabled both before and after rollback.

## 2026-06-06 - Offline Device Token Lookup Planning

### What Changed

- Added an offline device token lookup planner for future repository-backed
  `registered_device` REST permission callbacks.
- Added a lookup plan value object that exposes hashed token lookup filters, a
  short token fingerprint for audits, parse errors, validity state, and
  secret-free audit payloads.
- Moved Authorization header normalization and token hash derivation into the
  lookup planner so future route callbacks and authentication checks can share
  one parsing boundary.
- Refactored the offline device bearer-token authenticator to consume the
  lookup planner before comparing stored token hashes and delegating
  active/revoked/expired/scope checks to the device access policy.
- Added unit coverage for valid lookup filters, normalized WordPress header
  arrays, missing headers, malformed schemes, short tokens, token
  fingerprints, and audit payloads without raw token or full token hash
  leakage.
- Updated project, plugin, and offline app package versions to `0.51.0`.
- Updated API, offline sync, architecture, deployment, testing, roadmap,
  changelog, and plugin docs.

### Why

The authenticator can now verify a loaded device row, but future live
permission callbacks also need a deterministic, secret-safe way to derive the
database lookup key from request headers before loading that row. This slice
adds that boundary without querying WordPress tables or registering live
offline routes.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceTokenLookupPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceTokenLookupPlanner.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceTokenAuthenticator.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceTokenLookupPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceTokenAuthenticatorTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device token lookup planner tests for hashed lookup filters,
  normalized WordPress header arrays, missing/malformed/short tokens, audit
  fingerprints, and secret-free audit payloads.

### Rollback Notes

- Revert this revision to remove the offline device token lookup planner/value
  object, authenticator refactor, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live device row repository queries, route registration, permission callback
  wiring, queue replay workers, and `$wpdb` writes remain disabled both before
  and after rollback.

## 2026-06-06 - Offline Device Token Authentication Planning

### What Changed

- Added an offline device bearer-token authenticator for future
  `registered_device` REST permission callbacks.
- Added normalization for `Authorization`, `authorization`, and
  WordPress-style `HTTP_AUTHORIZATION` header shapes.
- Added device token shape validation, SHA-256 token hashing, stored token hash
  comparison, and persisted offline-device ID validation.
- Delegated accepted device rows to the existing offline device access policy
  so active status, revocation, expiry, scopes, modes, location IDs, and UTC
  timestamps continue through one shared decision path.
- Added secret-free accepted authorization contexts that include device ID,
  persisted offline device ID, required scope, auth type, token verification,
  and authentication timestamp without returning raw tokens or token hashes.
- Added unit coverage for valid tokens, normalized WordPress header arrays,
  missing and malformed tokens, invalid stored hashes, wrong tokens, missing
  persisted device IDs, revoked devices, and denied scopes.
- Updated project, plugin, and offline app package versions to `0.50.0`.
- Updated API, offline sync, deployment, testing, changelog, roadmap, and
  plugin docs.

### Why

Future live offline push/pull/conflict route handlers need a narrow,
auditable permission boundary before they can safely load snapshots or write
queue/conflict rows. This slice implements the token parsing and hash
verification contract without registering live routes or querying the database.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceTokenAuthenticator.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceTokenAuthenticatorTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline device token authenticator tests for valid bearer tokens, normalized
  header arrays, missing/malformed tokens, invalid stored hashes, wrong tokens,
  missing persisted device IDs, revocation, and denied scopes.

### Rollback Notes

- Revert this revision to remove the offline device token authenticator, tests,
  version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live device row lookup, route registration, permission callback wiring,
  queue replay workers, and `$wpdb` writes remain disabled both before and
  after rollback.

## 2026-06-06 - Offline Push Persistence Planning

### What Changed

- Added an offline push persistence planner for future `/offline/push` route
  handlers.
- Added an immutable persistence plan exposing future operation insert rows,
  idempotent replay rows, future conflict insert rows, and redacted audit
  payloads.
- Mapped parsed operations plus batch resolution output into rows compatible
  with `tcg_offline_sync_queue` and `tcg_sync_conflicts`.
- Added registered-device row validation for offline device ID and public device
  ID matching before persistence planning.
- Added idempotent replay validation for already-stored operation results so
  duplicate client operation IDs must match the planned status and result code.
- Added JSON shaping for operation payloads, result details, conflict server and
  device payloads, and conflict resolution options.
- Added unit coverage for queue rows, conflict inserts, idempotent replay rows,
  mismatched device rows, mismatched batch IDs, invalid timestamps, and stale
  replay rows.
- Updated project, plugin, and offline app package versions to `0.49.0`.
- Updated API, offline sync, architecture, deployment, testing, roadmap,
  changelog, and plugin docs.

### Why

The server-side offline sync tables now exist, but live route handlers still
need deterministic write plans before `$wpdb` transactions are enabled. This
slice bridges batch resolution into concrete persistence row shapes and
idempotent replay handling without mutating the database.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushPersistencePlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushPersistencePlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushPersistencePlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `8`.

### Tests Added

- Offline push persistence planner tests for operation insert rows, conflict
  insert rows, JSON payload shaping, idempotent replay rows, mismatched device
  rows, mismatched batch IDs, invalid timestamps, and stale replay rows.

### Rollback Notes

- Revert this revision to remove the offline push persistence planner, value
  object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `8`.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live `$wpdb` transactions, offline route registration, bearer-token lookup,
  token hash comparison, canonical entity mutation writes, operation result
  inserts, conflict inserts, and cursor advancement remain disabled both before
  and after rollback.

## 2026-06-06 - Offline Sync Persistence Schema

### What Changed

- Added schema migration `0008_offline-sync` for future live offline sync
  persistence.
- Added custom WordPress tables for registered offline devices, offline
  operation queue/result rows, manager-reviewed sync conflicts, and per-device
  pull cursors.
- Added indexes and unique keys for device tokens, active/revoked device lookup,
  idempotent client operation replay, per-device operation ordering, conflict
  center filtering, entity conflict lookup, and per-device/domain cursor
  advancement.
- Updated migration runner planning so clean installs, upgrades, current-schema
  no-ops, and rollback plans include schema version `8`.
- Updated WordPress integration smoke verification to require plugin
  `0.48.0`, database target `8`, database option `8`, and the new offline sync
  persistence tables.
- Added dependency-free schema tests for offline devices, operation queue rows,
  conflict rows, pull cursors, and drop order.
- Updated project, plugin, and offline app package versions to `0.48.0`.
- Updated API, database, offline sync, testing, deployment, changelog, and
  plugin docs.

### Why

The future `/offline/push`, `/offline/pull`, and conflict-center handlers need
stable custom tables before route registration can be enabled. This migration
creates the database boundary for device authentication, idempotent queue
replay, conflict review, and cursor advancement while keeping live route writes
disabled until staging integration tests and repository adapters are added.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/OfflineSyncSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0008OfflineSync.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/Unit/OfflineSyncSchemaTest.php`
- `apps/wordpress-plugin/tests/Unit/MigrationRunnerPlanTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- `0008_offline-sync`
  - Adds `tcg_offline_devices`.
  - Adds `tcg_offline_sync_queue`.
  - Adds `tcg_sync_conflicts`.
  - Adds `tcg_offline_pull_cursors`.

### Tests Added

- Offline sync schema tests for registered devices, queue/result rows, conflict
  rows, pull cursors, and reversible drop order.
- Migration runner plan assertions for clean install, upgrade from schema `5`,
  current-schema no-op, rollback from `8` to `4`, and no-op rollback plans.
- WordPress integration smoke assertions for schema target `8` and offline sync
  tables.

### Rollback Notes

- Roll back schema version `8` to `7` with
  `MigrationRunner::rollback_to(7)` in a controlled maintenance window.
- The rollback drops `tcg_offline_pull_cursors`, `tcg_sync_conflicts`,
  `tcg_offline_sync_queue`, and `tcg_offline_devices` in dependency order.
- No SQLite rollback is required; the local offline app SQLite schema is
  unchanged.
- Live offline route registration, database queue replay, canonical entity
  mutation writes, conflict mutation writes, bearer-token lookup, token hash
  comparison, and cursor advancement remain disabled both before and after
  rollback.

## 2026-06-06 - Offline Push Batch Resolution Planning

### What Changed

- Added a WordPress offline push batch resolver for future queue replay route
  handlers.
- Added an immutable push batch resolution plan exposing per-operation plans,
  future operation result rows, future conflict rows, API response payloads,
  and redacted batch audit payloads.
- Added server snapshot lookup by client operation ID, entity key, or operation
  index so future repositories can feed deterministic operation snapshots into
  the resolver.
- Added batch counts for accepted, conflict, and rejected operations while
  preserving per-operation response payloads.
- Added unit coverage for mixed accepted/conflict batches, conflict row
  enrichment, per-operation runtime options, missing snapshots, invalid options,
  and invalid server timestamps.
- Updated project, plugin, and offline app package versions to `0.47.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap,
  offline app deployment, and plugin docs.

### Why

The push route must resolve a bounded operation batch and produce deterministic
response, operation result, conflict, and audit plans before live persistence is
enabled. This slice bridges single-operation resolution into batch-level queue
replay planning while still requiring repository-provided server snapshots.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushBatchResolutionPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushBatchResolver.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushBatchResolverTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds push batch resolution planning only.

### Tests Added

- Offline push batch resolver tests for mixed accepted/conflict batches,
  operation result rows, conflict row enrichment, response counts,
  per-operation runtime options, missing snapshots, invalid options, and
  invalid server timestamps.

### Rollback Notes

- Revert this revision to remove the offline push batch resolver, value object,
  tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live push route registration, database queue replay, canonical entity
  mutation writes, conflict insertion, idempotent operation-result persistence,
  registered-device permission wiring, and cursor advancement remain disabled
  both before and after rollback.

## 2026-06-06 - Offline Push Operation Resolution Planning

### What Changed

- Added a WordPress offline push operation resolver for future queue replay and
  conflict persistence flows.
- Added an immutable push operation resolution plan exposing accepted/rejected
  outcomes, future operation result rows, response payloads, optional conflict
  rows, and redacted audit payloads.
- Mirrored the shared sync-engine outcomes for inventory reservations, event
  reservations, customer credit redemptions, device revocation, and unsupported
  operations.
- Added deterministic conflict IDs and conflict rows for unavailable inventory,
  event capacity changes, and customer credit overspend attempts.
- Added unit coverage for accepted inventory/event/credit outcomes, sold-item
  conflicts, TopDeck queue gating, waitlist placement, cached-limit rejection,
  overspend conflicts, revoked devices, and invalid server timestamps.
- Updated project, plugin, and offline app package versions to `0.46.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap,
  offline app deployment, and plugin docs.

### Why

The offline push route needs a deterministic decision boundary before live queue
replay can mutate inventory, event registrations, or customer credit. This slice
turns parsed operation envelopes plus server snapshots into durable operation
plans while keeping database writes and route callbacks disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushOperationResolutionPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushOperationResolver.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushOperationResolverTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds push operation resolution planning only.

### Tests Added

- Offline push operation resolver tests for accepted inventory reservations,
  sold-inventory conflicts, event TopDeck queue gating, event waitlisting,
  accepted customer credit redemptions, cached-limit rejection, server overspend
  conflicts, revoked devices, and invalid server timestamps.

### Rollback Notes

- Revert this revision to remove the offline push operation resolver, value
  object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live offline push route handlers, database queue replay, canonical entity
  mutation writes, conflict persistence, registered-device permission wiring,
  and device cursor advancement remain disabled both before and after rollback.

## 2026-06-06 - Offline Conflict Resolution Planning

### What Changed

- Added a WordPress offline conflict resolution planner for future
  manager-reviewed conflict mutation flows.
- Added an immutable resolution plan value object exposing future conflict
  update rows, API response payloads, and redacted audit payloads.
- Added guards for stale expected row versions, terminal conflicts, unavailable
  resolution actions, invalid current rows, and invalid server timestamps.
- Added deterministic resolution payload hashing for audit records without
  storing full adjustment payloads in the audit payload.
- Added unit coverage for manager-adjust plans, dismiss and retry status
  mapping, redacted audit hashes, stale versions, terminal rows, unavailable
  actions, bad current rows, and bad server time.
- Updated project, plugin, and offline app package versions to `0.45.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap,
  offline app deployment, and plugin docs.

### Why

The conflict-center resolution route needs a deterministic write plan before it
can mutate database rows. This slice defines the future row update, response,
and audit payloads while enforcing optimistic version checks and keeping live
conflict writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineConflictResolutionPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflineConflictResolutionPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineConflictResolutionPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds conflict resolution planning only.

### Tests Added

- Offline conflict resolution planner tests for planned row updates, response
  payloads, redacted audit payload hashes, manager-adjust resolutions, dismiss
  and retry status mapping, stale row versions, terminal conflicts, unavailable
  actions, invalid current rows, and invalid server timestamps.

### Rollback Notes

- Revert this revision to remove the offline conflict resolution planner, value
  object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live conflict mutation writes, manager audit persistence, route callback
  wiring, resolved-state propagation, and device sync fanout remain disabled
  both before and after rollback.

## 2026-06-06 - Offline Conflict Response Presentation

### What Changed

- Added a WordPress offline conflict list response presenter for the planned
  conflict-center list route.
- Added stable response shaping for device IDs, schema version, server time,
  filters, cursors, `has_more`, conflict rows, severities, row versions,
  payload objects, and available manager resolution options.
- Added validation for conflict IDs, statuses, entity types, entity IDs,
  conflict types, severity, summaries, UTC timestamps, row versions, response
  cursors, payload objects, and supported resolution options.
- Added unit coverage for empty conflict responses, normalized conflict rows,
  duplicate action cleanup, payload preservation, and invalid response contract
  inputs.
- Updated project, plugin, and offline app package versions to `0.44.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap,
  offline app deployment, and plugin docs.

### Why

After conflict request validation, the future conflict-center route needs a
stable response payload before repository-backed reads are enabled. This slice
lets the Windows app contract settle around conflict filters, pagination,
payloads, row versions, and manager actions while keeping live reads and
mutations disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineConflictListResponsePresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflineConflictListResponsePresenterTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds conflict response presentation only.

### Tests Added

- Offline conflict list response presenter tests for empty responses, normalized
  conflict rows, filters, cursors, duplicate resolution action cleanup, payload
  preservation, invalid timestamps, invalid cursors, invalid row fields, invalid
  payload objects, and unsupported resolution options.

### Rollback Notes

- Revert this revision to remove the offline conflict response presenter, tests,
  version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live conflict repository reads, manager mutation writes, conflict audit
  persistence, route callback wiring, and resolved-state propagation remain
  disabled both before and after rollback.

## 2026-06-06 - Offline Conflict Request Validation

### What Changed

- Added a WordPress offline conflict list request parser for the planned
  conflict-center route.
- Added a WordPress offline conflict resolution request parser for the planned
  manager resolution route.
- Added immutable request and validation result value objects for list and
  resolution payloads.
- Added validation for conflict statuses, entity types, cursors, page-size
  bounds, include-resolved filters, idempotent resolution IDs, manager IDs,
  resolution actions, notes, expected conflict versions, UTC resolution
  timestamps, adjustment payloads, and schema version `1`.
- Added unit coverage for normalized conflict filters, default filters, invalid
  filter shapes, unsupported filters, valid resolution payloads, idempotency
  fallback, missing fields, and invalid manager-adjust requests.
- Updated project, plugin, and offline app package versions to `0.43.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap,
  offline app deployment, and plugin docs.

### Why

The future conflict center needs deterministic request boundaries before live
repository reads or manager mutation writes are enabled. This slice lets the
planned routes reject malformed filters and unsafe resolution submissions while
keeping conflict persistence, audit writes, and route callback wiring disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineConflictListRequest.php`
- `apps/wordpress-plugin/src/Offline/OfflineConflictListRequestParser.php`
- `apps/wordpress-plugin/src/Offline/OfflineConflictListRequestValidationResult.php`
- `apps/wordpress-plugin/src/Offline/OfflineConflictResolutionRequest.php`
- `apps/wordpress-plugin/src/Offline/OfflineConflictResolutionRequestParser.php`
- `apps/wordpress-plugin/src/Offline/OfflineConflictResolutionValidationResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflineConflictListRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineConflictResolutionRequestParserTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds conflict request validation only.

### Tests Added

- Offline conflict list parser tests for normalized filters, default filters,
  invalid shapes, unsupported statuses/entity types, cursor validation,
  page-size bounds, and schema gating.
- Offline conflict resolution parser tests for valid manager resolutions,
  idempotency fallback, missing fields, invalid IDs, invalid timestamps,
  unsupported actions, manager-adjust notes, and adjustment payload requirements.

### Rollback Notes

- Revert this revision to remove the offline conflict request parsers, value
  objects, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live conflict repository reads, manager mutation writes, conflict audit
  persistence, route callback wiring, push/pull execution, and conflict
  resolved-state propagation remain disabled both before and after rollback.

## 2026-06-06 - Offline Device Access Policy

### What Changed

- Added a WordPress offline device access policy for future registered-device
  permission callbacks.
- Added an immutable access decision value object exposing accepted context or
  rejection errors.
- Added validation for active device status, revocation timestamps, token
  expiry, required scopes, supported modes/scopes, location IDs, and UTC
  timestamps.
- Added unit coverage for allowed active devices, revoked/inactive/expired
  devices, missing or unsupported scopes, and malformed device context.
- Updated project, plugin, and offline app package versions to `0.42.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap,
  offline app deployment, and plugin docs.

### Why

Registered-device routes need a deterministic authorization boundary before
live bearer-token lookup and route permission callbacks are enabled. This slice
documents and tests the rules that will allow or reject future device pull,
push, and conflict requests while keeping live token storage, revocation
persistence, and last-seen writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceAccessDecision.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceAccessPolicy.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceAccessPolicyTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds access-policy validation only.

### Tests Added

- Offline device access policy tests for active allowed devices,
  revoked/inactive/expired devices, denied and unsupported scopes, unsupported
  row scopes, invalid device IDs, invalid modes, invalid locations, invalid
  UTC timestamps, and missing scopes.

### Rollback Notes

- Revert this revision to remove the offline device access policy, decision
  value object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live bearer token lookup, token hash comparison, REST permission callback
  wiring, last-seen writes, revocation persistence, push/pull execution, and
  conflict writes remain disabled both before and after rollback.

## 2026-06-06 - Offline Device Registration Planning

### What Changed

- Added a WordPress offline device registration planner for the planned pairing
  flow.
- Added an immutable registration plan value object exposing future device row,
  one-time response payload, and redacted audit payload data.
- Added validation for generated device IDs, one-time device tokens, token
  hashes, UTC issue/expiry timestamps, and expiry-after-issue ordering.
- Added unit coverage for device row/response/audit payloads, scope and
  capability preservation, invalid generated credentials, and invalid expiry
  windows.
- Updated project, plugin, and offline app package versions to `0.41.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap,
  offline app deployment, and plugin docs.

### Why

After request validation, the future registration route needs a deterministic
plan for what would be stored and returned before it performs live writes. This
slice documents and tests the device row, one-time token response, sync route
map, first-sync flags, and audit payload while keeping real credential
generation and persistence disabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationPlan.php`
- `apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationPlanner.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds registration planning only.

### Tests Added

- Offline device registration planner tests for device row, one-time response,
  redacted audit payloads, scope/capability preservation, invalid generated
  credentials, and invalid expiry windows.

### Rollback Notes

- Revert this revision to remove the offline device registration planner,
  value object, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live device registration, token issuance, token hashing/storage, revocation,
  first sync, push/pull execution, and conflict writes remain disabled both
  before and after rollback.

## 2026-06-06 - Offline Device Pairing Validation

### What Changed

- Added a WordPress offline device pairing request parser for the planned
  `/offline/devices/register` route.
- Added an immutable parsed pairing request value object and validation result.
- Added validation for pairing codes, installation IDs, device labels, device
  modes, manager/location IDs, app versions, Windows platform checks, hardware
  capabilities, requested scopes, and schema version `1`.
- Added unit coverage for normalized pairing requests, missing core fields,
  invalid pairing shapes, unsupported scopes/capabilities, unsupported
  platform/mode, and staff/admin scope combinations.
- Updated project, plugin, and offline app package versions to `0.40.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap,
  offline app deployment, and plugin docs.

### Why

The offline app needs a deterministic enrollment boundary before live device
token issuance or first sync can be enabled. This slice lets the future
registration route reject malformed or unsupported device pairing requests
without creating device rows, issuing bearer tokens, or mutating sync state.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineDevicePairingRequest.php`
- `apps/wordpress-plugin/src/Offline/OfflineDevicePairingRequestParser.php`
- `apps/wordpress-plugin/src/Offline/OfflineDevicePairingValidationResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds request validation only.

### Tests Added

- Offline device pairing request parser tests for normalized pairing requests,
  missing core pairing fields, invalid pairing shapes, unsupported
  capabilities/scopes, unsupported platform/mode, and staff/admin scope
  combinations.

### Rollback Notes

- Revert this revision to remove the offline device pairing parser, value
  object, validation result, tests, version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live device registration, token issuance, token hashing/storage, revocation,
  first sync, push/pull execution, and conflict writes remain disabled both
  before and after rollback.

## 2026-06-06 - Offline Pull Response Presentation

### What Changed

- Added a WordPress offline pull response presenter for stable server-to-device
  payloads.
- Added per-domain response shaping for cursors, `has_more`, cached data rows,
  and tombstones.
- Added validation for supported response domains, UTC timestamps, entity IDs,
  row versions, payload objects, tombstone rows, and cursor shape.
- Added unit coverage for empty domain responses, request cursor carry-forward,
  normalized data rows, tombstone inclusion/exclusion, and invalid response
  contract inputs.
- Updated project, plugin, and offline app package versions to `0.39.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap, and
  plugin docs.

### Why

The offline app needs the server pull response to be stable before live change
queries are introduced. This slice lets future route handlers plug repository
results into a deterministic presenter without changing the app payload shape
or advancing cursors before staging proves the full sync path.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePullResponsePresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullResponsePresenterTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds response presentation only.

### Tests Added

- Offline pull response presenter tests for empty domain responses, request
  cursor carry-forward, normalized data rows, tombstone inclusion/exclusion,
  and invalid response contract inputs.

### Rollback Notes

- Revert this revision to remove the offline pull response presenter, tests,
  version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live offline endpoints, pull query execution, cursor advancement, queue
  replay, and conflict writes remain disabled both before and after rollback.

## 2026-06-06 - Offline Pull Request Validation

### What Changed

- Added a WordPress offline pull request parser for devices requesting cached
  read-model changes.
- Added an immutable parsed pull request value object and validation result.
- Added validation for device IDs, cached domain selection, domain cursors,
  page-size bounds, tombstone inclusion, and schema version `1`.
- Added unit coverage for requested domains/cursors, default pull settings,
  missing top-level fields, invalid shapes, unsupported domains, bad cursors,
  page-size limits, and unsupported schema versions.
- Updated project, plugin, and offline app package versions to `0.38.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap, and
  plugin docs.

### Why

The offline app needs a safe server-side pull boundary before live change
queries or cursor advancement are enabled. This slice lets the future route
handler validate the requested cached domains and cursors deterministically
without reading or mutating WordPress, inventory, customer credit, events, or
conflict state.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePullRequest.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullRequestParser.php`
- `apps/wordpress-plugin/src/Offline/OfflinePullRequestValidationResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePullRequestParserTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds request validation only.

### Tests Added

- Offline pull request parser tests for accepted requested domains/cursors,
  default pull domains/page size/tombstones, missing device/schema values,
  invalid top-level shapes, unsupported domains, bad cursors, page-size limits,
  and unsupported schema versions.

### Rollback Notes

- Revert this revision to remove the offline pull parser, value object, tests,
  version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live offline endpoints, pull query execution, cursor advancement, queue
  replay, and conflict writes remain disabled both before and after rollback.

## 2026-06-06 - Offline Push Payload Validation

### What Changed

- Added a WordPress offline push payload parser for queued operation batches.
- Added immutable parsed payload and operation envelope value objects.
- Added validation result handling for accepted/rejected offline push payloads.
- Added unit coverage for valid batches, missing top-level fields, duplicate
  client operation IDs, device mismatches, malformed operation envelopes,
  unsupported operation types, invalid timestamps, invalid payload/context
  shapes, and schema version gating.
- Updated project, plugin, and offline app package versions to `0.37.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap, and
  plugin docs.

### Why

The offline Windows app queue now has both a local SQLite schema and planned
WordPress route contracts. Before live push handlers can store or replay queued
operations, the server needs a deterministic validation boundary that rejects
malformed batches and mismatched device envelopes without touching inventory,
credit, event, or conflict state.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflineOperationEnvelope.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushPayload.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushPayloadParser.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushPayloadValidationResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushPayloadParserTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds request validation only.

### Tests Added

- Offline push payload parser tests for accepted batches, required top-level
  fields, duplicate operation IDs, device mismatches, unsupported operation
  types, malformed IDs, invalid row versions, timestamp validation, JSON-object
  payload/context requirements, and schema version gating.

### Rollback Notes

- Revert this revision to remove the offline push parser, value objects, tests,
  version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the local SQLite schema is unchanged.
- Live offline endpoints, queue replay, and conflict writes remain disabled
  both before and after rollback.

## 2026-06-06 - WordPress Offline Route Contracts

### What Changed

- Added planned WordPress REST route contracts for offline device pairing,
  pull, push, conflict listing, and conflict resolution.
- Added unit coverage for route namespace, live-disabled defaults, documented
  permission labels, and callback names expected by the Windows app boundary.
- Updated project, plugin, and offline app package versions to `0.36.0`.
- Updated REST API, offline sync, architecture, database, testing, roadmap, and
  plugin docs.

### Why

The Windows offline app now has a local SQLite queue contract, so the next
boundary is the WordPress REST surface it will eventually pair with and sync
against. This slice fixes the API shape while keeping endpoints disabled until
device authentication, push/pull workers, queue replay, and conflict writes are
ready for staging integration tests.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineRouteContracts.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteContractTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision adds route contracts only.

### Tests Added

- Offline route contract tests for the planned pairing, pull, push, conflict
  list, and conflict resolution routes, including permissions, callbacks,
  namespace, and disabled-live defaults.

### Rollback Notes

- Revert this revision to remove the offline route contract class, tests,
  version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required; the offline app SQLite schema contract remains
  unchanged.
- Live offline endpoints remain disabled both before and after rollback.

## 2026-06-06 - Offline App SQLite Schema Foundation

### What Changed

- Added the first offline app SQLite migration contract.
- Added local schema manifest coverage for device identity, sync cursors,
  operation queue, sync logs, cached branding, cached inventory, cached
  customer credit, cached events, and conflicts.
- Added operation queue envelope fields matching the offline sync contract.
- Added a dependency-free SQLite schema contract test and wired it into root
  `npm run test`.
- Updated offline app, offline sync, architecture, database, deployment,
  roadmap, and testing docs.

### Why

The Windows offline app needs a local read model and durable operation queue
before live pairing, push/pull sync, kiosk mode, staff mode, and conflict UI can
ship. This slice establishes the SQLite shape while keeping WordPress
authoritative after sync acceptance.

### Files Affected

- `apps/offline-app/config/sqlite-schema.manifest.json`
- `apps/offline-app/src-tauri/migrations/0001_offline_foundation.sql`
- `apps/offline-app/tests/sqlite-schema-contract.mjs`
- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `apps/offline-app/README.md`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- `apps/offline-app/src-tauri/migrations/0001_offline_foundation.sql`

### Tests Added

- Offline app SQLite schema contract test for migration presence, local table
  names, required indexes, operation envelope fields, status checks,
  SQLite-only syntax guards, no direct MySQL access, and no production
  endpoint markers.

### Rollback Notes

- Revert this revision to remove the offline app SQLite schema manifest,
  migration, contract test, version bump, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No deployed SQLite rollback is required unless a manually built test app has
  already initialized local files. In that case, discard the test app data or
  reinstall before continuing.
- Live device pairing, push/pull workers, and queue replay remain disabled
  after rollback.

## 2026-06-06 - Windows Offline App Packaging Foundation

### What Changed

- Added the initial Tauri/React/TypeScript offline app scaffold.
- Added Windows packaging metadata for `x86_64-pc-windows-msvc` and NSIS
  `.exe` installer output.
- Added a package manifest that records offline sync routes, no direct MySQL
  access, manual production release approval, code-signing requirements, and
  required branding tokens.
- Added a dependency-free Node package contract test and wired it into root
  `npm run test`.
- Added a pull request quality-gate step for the offline app package contract.
- Added a manual-only GitHub Actions workflow that can build and upload an
  unsigned Windows installer artifact.
- Updated offline app deployment, offline sync, architecture, roadmap, and
  testing docs.

### Why

The offline sync app must be a Windows executable. This slice establishes the
Tauri-first packaging path, keeps production release manual, and verifies that
the app consumes WordPress/offline sync and branding contracts without storing
production credentials or using direct database access.

### Files Affected

- `.github/workflows/offline-app-windows.yml`
- `.github/workflows/pull-request-quality-gates.yml`
- `apps/offline-app/.gitignore`
- `apps/offline-app/README.md`
- `apps/offline-app/config/windows-package.manifest.json`
- `apps/offline-app/index.html`
- `apps/offline-app/package.json`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/main.tsx`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/build.rs`
- `apps/offline-app/src-tauri/capabilities/default.json`
- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src-tauri/src/main.rs`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `apps/offline-app/tests/windows-package-contract.mjs`
- `apps/offline-app/tsconfig.json`
- `apps/offline-app/vite.config.ts`
- `package.json`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision does not add WordPress or SQLite migrations.

### Tests Added

- Offline app Windows package contract test for app/Tauri version alignment,
  Windows target, NSIS `.exe` packaging, manual production release rules,
  code-signing requirement, offline sync routes, branding tokens, and forbidden
  production secret markers.

### Rollback Notes

- Revert this revision to remove the offline app Tauri scaffold, Windows
  packaging workflow, root test wiring, and docs.
- No WordPress schema rollback is required; database target remains `7`.
- No SQLite rollback is required because no SQLite migrations are included.
- Manual unsigned installer builds should be discarded after rollback.

## 2026-06-06 - White-Label Branding Settings Foundation

### What Changed

- Added shared branding settings for company identity, optional HTTPS logo and
  support URLs, receipt footer text, and color tokens.
- Added client-safe public branding config and CSS variable export helpers.
- Exposed branding controls in the WordPress Settings API screen.
- Updated the admin dashboard and system status screens to read the configured
  company profile.
- Added documentation for white-label/multi-company branding behavior and
  safety rules.
- Added unit coverage for branding sanitization, existing-value preservation,
  public config safety, and CSS variable output.

### Why

The platform may be deployed for multiple companies, so brand names, colors,
logo/support URLs, receipt copy, and staging banner colors must be configurable
instead of hardcoded in WordPress, kiosk, receipt, and offline app surfaces.

### Files Affected

- `apps/wordpress-plugin/src/Settings/BrandingSettings.php`
- `apps/wordpress-plugin/src/Settings/Settings.php`
- `apps/wordpress-plugin/src/Settings/SettingsPage.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/SettingsTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/BRANDING.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `docs/UI_FLOWS.md`

### Migrations Added

- None. Branding is stored in the existing WordPress option and uses existing
  schema version `7`.

### Tests Added

- Branding tests for submitted setting sanitization, existing safe value
  preservation, public config redaction boundaries, and CSS variable output.

### Rollback Notes

- Revert this revision to remove white-label branding helpers, Settings API
  fields, admin profile usage, docs, and tests.
- No schema rollback is required; database target remains `7`.
- Existing WordPress option data can retain unused `branding` keys safely after
  rollback, or be removed manually during a settings cleanup if approved.
- Live storefront/kiosk/offline app rendering, public branding REST endpoint,
  receipt template rendering, email template theming, and offline app branding
  sync remain disabled after rollback.

## 2026-06-06 - Buylist Offer Planning Foundation

### What Changed

- Added a buylist offer planner for reviewed submission item rows.
- Added an offer plan result object for submission offer payloads, item offers,
  manager approval requests, and validation errors.
- Planned cash and credit totals, target submission status selection,
  offer-version retention, expiry, and deterministic offer fingerprints.
- Added item-level and submission-level manager approval threshold planning for
  cash and credit offers.
- Added unit coverage for normal offer payloads, manager approval thresholds,
  invalid submissions/items, zero-value offers, and stable offer fingerprints.

### Why

Buylist route contracts and intake validation are already present, but staff
offer workflows need a deterministic planning boundary before live review APIs,
approval persistence, customer acceptance, credit payouts, and inventory
conversion workers can safely ship.

### Files Affected

- `apps/wordpress-plugin/src/Buylist/BuylistOfferPlan.php`
- `apps/wordpress-plugin/src/Buylist/BuylistOfferPlanner.php`
- `apps/wordpress-plugin/tests/Unit/BuylistOfferPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/BUYLIST.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Buylist offer planner tests for reviewed offer payloads, manager approval
  thresholds, invalid submissions/items, zero-value offers, and deterministic
  offer fingerprints.

### Rollback Notes

- Revert this revision to remove buylist offer planning helpers and tests.
- No schema rollback is required; database target remains `7`.
- Live buylist offer write APIs, permission callbacks, staff review UI,
  approval persistence, customer acceptance writes, credit payout posting, and
  inventory conversion workers remain disabled after rollback.

## 2026-06-06 - Customer Credit REST Presentation Foundation

### What Changed

- Added a customer credit REST presenter for balance, ledger, posting-result,
  and validation-error response payloads.
- Added safe customer balance shaping that excludes private contact fields.
- Added ledger row shaping with amount/currency normalization, paging metadata,
  and redacted metadata JSON.
- Added posting-result response shaping for accepted, idempotent, and rejected
  outcomes.
- Added unit coverage for balance payloads, ledger metadata redaction,
  posting-result responses, and validation-error response structure.

### Why

Customer credit route contracts and request parsing already exist, but live
endpoints also need stable response shapes that do not leak private contact or
secret metadata fields. This slice defines those response boundaries before
enabling route registration or staff UI surfaces.

### Files Affected

- `apps/wordpress-plugin/src/Credit/CustomerCreditRestPresenter.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditRestPresenterTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/CUSTOMER_CREDIT.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Customer credit REST presenter tests for safe balance payloads, ledger row
  shaping, metadata redaction, posting-result payloads, and validation-error
  responses.

### Rollback Notes

- Revert this revision to remove customer credit REST presentation helpers and
  tests.
- No schema rollback is required; database target remains `7`.
- Live customer credit REST route registration, permission callbacks, nonce
  handling, database read repositories, staff UI, WooCommerce redemption hooks,
  and audit writes remain disabled after rollback.

## 2026-06-06 - WooCommerce Order Lifecycle Planning Foundation

### What Changed

- Added a WooCommerce order lifecycle planner for serialized inventory lines.
- Added a lifecycle plan result object for transition payloads, skipped
  non-serialized lines, invalid serialized line errors, and work counts.
- Planned checkout order linkage, payment-complete sale conversion,
  failed/cancelled reservation release, and refund return-review transitions.
- Added duplicate reservation line guards and deterministic lifecycle
  idempotency keys.
- Added unit coverage for checkout, payment, failed/cancelled, refund, invalid
  metadata, non-serialized skips, duplicate reservation lines, invalid actions,
  and invalid orders.

### Why

Exact-item order lifecycle behavior must be deterministic before live
WooCommerce hooks mutate reservation and inventory rows. This slice defines
the order event planning boundary using persisted order-line metadata without
enabling checkout, payment, cancellation, or refund hooks yet.

### Files Affected

- `apps/wordpress-plugin/src/WooCommerce/SerializedOrderLifecyclePlan.php`
- `apps/wordpress-plugin/src/WooCommerce/SerializedOrderLifecyclePlanner.php`
- `apps/wordpress-plugin/tests/Unit/SerializedOrderLifecyclePlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- WooCommerce order lifecycle planner tests for checkout linkage,
  payment-complete conversion, failed/cancelled release, refund review,
  non-serialized skips, invalid metadata, duplicate reservation lines, invalid
  actions, and invalid orders.

### Rollback Notes

- Revert this revision to remove WooCommerce order lifecycle planning helpers
  and tests.
- No schema rollback is required; database target remains `7`.
- Live WooCommerce checkout hook execution, order mutation, payment lifecycle
  conversion, Store API execution, cart release hooks, and refund hooks remain
  disabled after rollback.

## 2026-06-06 - WooCommerce Order-Line Metadata Planning Foundation

### What Changed

- Added a WooCommerce order-line metadata planner for serialized inventory cart
  items.
- Added an order-line metadata plan result object for planned metadata payloads
  and propagated validation errors.
- Planned exact inventory, reservation, owner-token, minor-unit price snapshot,
  formatted decimal price, currency, reservation expiry, and deterministic
  snapshot hash metadata.
- Added optional cart, WooCommerce product, barcode, condition, provider, card,
  set, and card-number descriptor metadata copying.
- Added unit coverage for valid metadata payloads, invalid cart item errors,
  descriptor normalization, deterministic snapshot hashes, and zero-price
  promotional snapshots.

### Why

Serialized checkout needs stable order-line snapshots before live WooCommerce
hook execution can safely persist exact item ownership, pricing, and
reservation state into orders. This slice defines that metadata boundary
without enabling order writes, payment conversion, or refund lifecycle hooks.

### Files Affected

- `apps/wordpress-plugin/src/WooCommerce/SerializedOrderLineMetadataPlan.php`
- `apps/wordpress-plugin/src/WooCommerce/SerializedOrderLineMetadataPlanner.php`
- `apps/wordpress-plugin/tests/Unit/SerializedOrderLineMetadataPlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- WooCommerce order-line metadata planner tests for valid payloads, validator
  error propagation, optional descriptor normalization, deterministic snapshot
  hashes, and zero-price snapshots.

### Rollback Notes

- Revert this revision to remove WooCommerce order-line metadata planning
  helpers and tests.
- No schema rollback is required; database target remains `7`.
- Live WooCommerce checkout hook execution, order writes, payment lifecycle
  conversion, cart release hooks, and refund lifecycle handling remain disabled
  after rollback.

## 2026-06-06 - Reservation Expiry Cleanup Planning Foundation

### What Changed

- Added a reservation expiry cleanup planner for active hold candidates.
- Added an expiry plan result object for expired release payloads, skipped rows,
  errors, release counts, and work detection.
- Added deterministic cleanup idempotency keys for expired reservations.
- Added an explicit reservation service `expire()` transition that restores
  inventory to available and marks the reservation `expired`.
- Added unit coverage for expired rows, equal-to-now expiry behavior, future
  rows, inactive lifecycle rows, invalid row handling, and service expiry.

### Why

Exact-item holds need predictable expiry behavior before WooCommerce cart
timers, kiosk carts, offline holds, and scheduled cleanup workers can safely
ship. This slice defines the cleanup planning and service transition without
enabling live cron execution or database race tests yet.

### Files Affected

- `apps/wordpress-plugin/src/Reservations/ReservationExpiryPlan.php`
- `apps/wordpress-plugin/src/Reservations/ReservationExpiryPlanner.php`
- `apps/wordpress-plugin/src/Reservations/ReservationService.php`
- `apps/wordpress-plugin/tests/Unit/ReservationExpiryPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/ReservationServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Reservation expiry planner tests for expired holds, equal-to-now expiries,
  future holds, inactive lifecycle rows, invalid reservation rows, and cleanup
  idempotency key payloads.
- Reservation service expiry transition test for restoring inventory to
  available and marking the reservation expired.

### Rollback Notes

- Revert this revision to remove reservation expiry cleanup planning helpers,
  the explicit expiry transition, and related tests.
- No schema rollback is required; database target remains `7`.
- Live cleanup workers, WooCommerce cart timers, and Action Scheduler jobs
  remain disabled after rollback.

## 2026-06-06 - ScryDex Persistence Planning Foundation

### What Changed

- Added a ScryDex persistence planner that consumes normalized sync page plans.
- Added a persistence plan result object for reference-card inserts, changed-row
  updates, unchanged provider keys, current price observations, errors,
  retryability, and next checkpoint access.
- Added deterministic reference-card insert payload planning with public IDs,
  timestamps, and initial row versions.
- Added changed-row update payload planning with local reference IDs, field
  diffs, timestamps, and row-version increments.
- Added unit coverage for insert planning, update planning, unchanged rows,
  price observation reference IDs, and failed page plan guards.

### Why

ScryDex page processing already normalized provider cards and prices, but the
next safe step is to decide what would be written before enabling live
database writes. This slice defines the insert/update/no-op/price observation
boundary without starting scheduled workers or touching `wpdb`.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexPersistencePlan.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexPersistencePlanner.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexPersistencePlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- ScryDex persistence planner tests for deterministic insert payloads, changed
  reference-card updates, unchanged-row no-ops, current price observations, and
  failed page plan guards.

### Rollback Notes

- Revert this revision to remove ScryDex persistence planning helpers and tests.
- No schema rollback is required; database target remains `7`.
- Scheduled workers, live provider credentials, database writes, image workers,
  usage-budget enforcement, and webhooks remain disabled after rollback.

## 2026-06-06 - Manager Override Persistence Payload Foundation

### What Changed

- Added a manager override persistence planner for accepted below-minimum sale
  approvals.
- Added a persistence plan result object with row payload and audit-safe payload
  accessors.
- Added unit coverage for row payload construction, audit reason hashing,
  minor-unit to decimal conversion, policy-rejected skips, no-row-required
  skips, and invalid optional context IDs.

### Why

Below-minimum sale approvals need auditable persistence before WooCommerce/POS
hook wiring can safely use them. This slice defines the row and audit payloads
without enabling manager PIN reauthentication, database inserts, rate limiting,
or live checkout/POS flows.

### Files Affected

- `apps/wordpress-plugin/src/Overrides/ManagerOverridePersistencePlan.php`
- `apps/wordpress-plugin/src/Overrides/ManagerOverridePersistencePlanner.php`
- `apps/wordpress-plugin/tests/Unit/ManagerOverridePersistencePlannerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Manager override persistence planner tests for approved below-minimum row and
  audit payloads, rejected decisions, no-row-required decisions, invalid
  optional context IDs, and price formatting.

### Rollback Notes

- Revert this revision to remove manager override persistence/audit payload
  helpers and tests.
- No schema rollback is required; database target remains `7`.
- Live manager reauthentication, database inserts, audit writes, WooCommerce/POS
  hook wiring, and rate limiting remain disabled after rollback.

## 2026-06-06 - Buylist REST Intake Boundary Foundation

### What Changed

- Added planned buylist REST route contracts for intake, listing, detail,
  review, offer, acceptance, and conversion flows.
- Added a buylist submission intake parser and normalized request object.
- Added unit coverage for route permissions, disabled-by-default live status,
  valid intake normalization, missing submission fields, invalid item rows, bad
  owner tokens, and invalid optional IDs.

### Why

Buylist submissions can originate from public web, kiosk, staff, and offline
contexts, so the payload boundary needs to reject malformed customer and item
data before live writes, offer review, payout posting, and inventory conversion
workers are enabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/BuylistRouteContracts.php`
- `apps/wordpress-plugin/src/Buylist/BuylistSubmissionIntakeParser.php`
- `apps/wordpress-plugin/src/Buylist/BuylistSubmissionIntakeRequest.php`
- `apps/wordpress-plugin/src/Buylist/BuylistSubmissionIntakeValidationResult.php`
- `apps/wordpress-plugin/tests/Unit/BuylistRouteContractTest.php`
- `apps/wordpress-plugin/tests/Unit/BuylistSubmissionIntakeParserTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/BUYLIST.md`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Buylist route contract tests for planned route count, permissions, namespace,
  and disabled live registration.
- Buylist submission intake parser tests for valid normalized payloads, header
  idempotency precedence, missing required fields, invalid item identity and
  quantity, graded-card requirements, bad owner token hashes, and invalid
  optional IDs.

### Rollback Notes

- Revert this revision to remove buylist REST intake boundary helpers and tests.
- No schema rollback is required; database target remains `7`.
- Live buylist write APIs, staff review UI, customer acceptance writes, credit
  payout posting, and inventory conversion workers remain disabled after
  rollback.

## 2026-06-06 - Customer Credit REST Boundary Foundation

### What Changed

- Added planned customer credit REST route contracts for credit balance, ledger,
  adjustment, and redemption surfaces.
- Added a customer credit REST posting parser that turns validated payloads into
  ledger posting requests.
- Added unit coverage for route permissions, disabled-by-default live status,
  redemption parsing, route/customer mismatches, manager approval requirements,
  invalid linked IDs, and metadata validation.

### Why

Customer credit writes are financial-liability operations and need a strict REST
boundary before live route registration. This slice validates the request shape
and route contract while keeping permission callbacks, controller writes,
WooCommerce redemption hooks, and staff UI disabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/CustomerCreditRouteContracts.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditRestPostingParser.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditRestPostingValidationResult.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditRestPostingParserTest.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditRouteContractTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/CUSTOMER_CREDIT.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Customer credit REST parser tests for valid redemption payloads, header
  idempotency precedence, customer mismatch, missing idempotency, invalid
  currency, manager approval requirements, invalid optional IDs, and metadata
  shape.
- Customer credit route contract tests for planned route count, permissions,
  namespace, and disabled live registration.

### Rollback Notes

- Revert this revision to remove customer credit REST boundary helpers and
  tests.
- No schema rollback is required; database target remains `7`.
- Live customer credit REST endpoints, WooCommerce redemption hooks, staff UI,
  and audit writes remain disabled after rollback.

## 2026-06-06 - WooCommerce Hook Contract Foundation

### What Changed

- Added WooCommerce hook contract metadata for the serialized inventory
  checkout lifecycle.
- Added a hook registry for exact inventory cart, checkout, order, payment,
  refund, cart removal, and Store API validation flows.
- Added unit coverage for expected hook names, default live-gating, uniqueness,
  payment completion contract shape, and separate Store API validation.

### Why

WooCommerce checkout wiring must be explicit before live reservation conversion,
cart release, payment completion, refund, and Store API handlers are enabled.
This slice defines the lifecycle contract while keeping every live hook disabled
until WooCommerce integration tests and staging verification pass.

### Files Affected

- `apps/wordpress-plugin/src/WooCommerce/HookContract.php`
- `apps/wordpress-plugin/src/WooCommerce/SerializedInventoryHookRegistry.php`
- `apps/wordpress-plugin/tests/Unit/SerializedInventoryHookRegistryTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `package.json`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- WooCommerce serialized inventory hook registry tests for hook coverage,
  default disabled live registration, duplicate protection, payment completion
  metadata, and Store API separation.

### Rollback Notes

- Revert this revision to remove WooCommerce hook contract helpers and tests.
- No schema rollback is required; database target remains `7`.
- Live WooCommerce hook registration, HPOS verification, order-line writes,
  Store API execution, payment conversion, and refund handling remain disabled
  after rollback.

## 2026-06-06 - ScryDex Sync Page Processor Foundation

### What Changed

- Added a ScryDex sync page processor that ties provider results, card/price
  normalization, and checkpoint advancement together.
- Added a page plan result object for normalized reference rows, price rows,
  normalization errors, retryability, and next checkpoint state.
- Added unit coverage for fixture-backed page planning, invalid-card
  normalization errors, and retryable rate-limit failures.

### Why

ScryDex scheduled workers need a deterministic per-page planning step before
database upserts, image jobs, usage-budget enforcement, and webhook refreshes
are enabled. This slice verifies the local mapping and checkpoint behavior while
leaving all live worker writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncPagePlan.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncPageProcessor.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncPageProcessorTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- ScryDex sync page processor tests for normalized reference-card and price row
  planning, checkpoint advancement after committed rows, invalid-card error
  reporting, and retryable rate-limit failure handling.

### Rollback Notes

- Revert this revision to remove ScryDex sync page processing helpers and tests.
- No schema rollback is required; database target remains `7`.
- ScryDex database upserts, scheduled workers, usage-budget enforcement, image
  jobs, and webhook processing remain disabled after rollback.

## 2026-06-06 - POS Payment Reconciliation Policy Foundation

### What Changed

- Added a POS/payment reconciliation policy module in the shared validation
  package.
- Added executable Node tests for approved sandbox payments, exact scanned item
  sale reconciliation, declined payments, unmapped POS line conflicts, and
  refunds moving inventory to pending review.
- Wired POS/payment policy tests into the root `npm run test` gate.

### Why

POS and payment providers must never become the source of truth for serialized
inventory. This slice pins the policy that provider responses record payment
state while plugin-owned exact barcode scans drive inventory transitions.

### Files Affected

- `packages/validation/src/posPaymentPolicy.mjs`
- `packages/validation/tests/pos-payment-policy.mjs`
- `package.json`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- POS/payment policy tests for payment normalization, provider inventory write
  blocking, scan-gated sale transitions, declined payment rejection, unmapped
  POS line conflict creation, and refund transitions to pending review.

### Rollback Notes

- Revert this revision to remove POS/payment policy helpers, Node tests, and
  root test wiring.
- No schema rollback is required; database target remains `7`.
- No live payment gateway, POS adapter, webhook, or provider inventory write is
  enabled by this revision.

## 2026-06-06 - Offline Sync Conflict Policy Foundation

### What Changed

- Added a shared sync-engine offline conflict policy module.
- Added executable Node tests for offline inventory reservations, event
  reservations, customer credit redemptions, and device revocation.
- Wired sync-engine tests into the root `npm run test` gate.

### Why

The offline app cannot safely queue inventory, event, or credit operations until
the server-side conflict outcomes are deterministic. This slice pins the first
shared policy rules while leaving Tauri, SQLite queue persistence, device auth
routes, and live WordPress pull/push workers for later phases.

### Files Affected

- `packages/sync-engine/src/offlineConflictPolicy.mjs`
- `packages/sync-engine/tests/offline-conflict-policy.mjs`
- `package.json`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/OFFLINE_SYNC.md`
- `docs/TESTING.md`
- `tests/offline-sync/README.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Offline sync conflict policy tests for accepted inventory reservations,
  unavailable inventory conflicts, accepted event reservations, event waitlist,
  event capacity conflicts, accepted credit redemptions, offline credit local
  limit rejection, server credit overspend conflict, and revoked-device push
  rejection.

### Rollback Notes

- Revert this revision to remove the shared sync-engine offline conflict policy,
  Node tests, and root test wiring.
- No schema rollback is required; database target remains `7`.
- No live offline devices, queues, or sync endpoints are enabled by this
  revision.

## 2026-06-06 - TopDeck Registration Adapter Mapping

### What Changed

- Added a TopDeck registration push adapter for future queued event
  registration workers.
- Added a sync result object that maps provider results to explicit local
  registration update fields and retry flags.
- Added unit coverage for TopDeck email selection, customer email fallback,
  override-cap pass-through, registered and pending invite outcomes, capacity
  conflicts, missing TID/email guards, and retryable provider failure.

### Why

Website-push event registrations already create local pending TopDeck sync-log
records. The next safe step is to define and test the adapter mapping that a
future worker will use before enabling live provider execution, payment-complete
pushes, or staff recovery screens.

### Files Affected

- `apps/wordpress-plugin/src/Events/EventTopDeckRegistrationAdapter.php`
- `apps/wordpress-plugin/src/Events/EventTopDeckRegistrationSyncResult.php`
- `apps/wordpress-plugin/tests/Unit/EventTopDeckRegistrationAdapterTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/EVENTS.md`
- `docs/TOPDECK_INTEGRATION.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- TopDeck registration adapter tests for provider call shape, email
  normalization/fallback, override-cap pass-through, provider outcome mapping,
  missing input short-circuiting, and retryable provider failure updates.

### Rollback Notes

- Revert this revision to remove the TopDeck registration push adapter, sync
  result mapping, and tests.
- No schema rollback is required; database target remains `7`.
- Pending local TopDeck sync-log records remain local-only after rollback; no
  live provider calls are enabled by this revision.

## 2026-06-06 - Migration Runner Plan Coverage

### What Changed

- Added migration runner helpers that expose pending migration version plans and
  rollback version plans without requiring a live WordPress database.
- Reused the same migration list for runtime migration/rollback execution and
  dependency-free plan tests.
- Added unit coverage for clean install, upgrade from schema `5`, current
  schema idempotency, rollback from `7` to `4`, and no-op rollback plans.

### Why

Database migrations need automated clean-install, upgrade, idempotency, and
rollback coverage before staging runs the live MySQL integration suite. This
slice verifies migration ordering and rollback planning locally while keeping
transaction, row-lock, `dbDelta`, and backup/restore tests in the integration
lane.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/tests/Unit/MigrationRunnerPlanTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Migration runner plan tests for clean install ordering, upgrade-only pending
  migrations, current-schema idempotency, rollback ordering, and no-op rollback
  plans.

### Rollback Notes

- Revert this revision to remove migration plan helpers and tests.
- No schema rollback is required; database target remains `7`.
- Existing migration classes and live migration/rollback behavior remain
  governed by prior migration revisions after rollback.

## 2026-06-06 - REST Route Contract Foundation

### What Changed

- Added dependency-free REST route contract coverage for the health and public
  Events endpoints.
- Reused controller route contracts during route registration to reduce drift
  between documented/tested route shapes and registered WordPress routes.
- Added guard coverage proving unimplemented customer, buylist, inventory,
  offline, and POS write routes remain unregistered.

### Why

The platform needs automated REST API coverage before more write routes are
enabled. This slice pins the currently available route namespace, methods,
callbacks, and access mode while preserving full WordPress request/permission
integration tests for staging-gated route implementations.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/EventsController.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/tests/Unit/ApiRouteContractTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- REST route contract tests for namespace consistency, unique method/path
  registration, authenticated health access, public Events route methods, and
  absent unimplemented write modules.

### Rollback Notes

- Revert this revision to remove dependency-free REST route contract tests and
  inline controller route contract helpers.
- No schema rollback is required; database target remains `7`.
- The WordPress integration smoke test remains the fallback route registration
  check after rollback.

## 2026-06-06 - WooCommerce Serialized Cart Metadata Foundation

### What Changed

- Added a WooCommerce serialized cart item metadata validator.
- Added exact-item metadata checks for single serialized quantity, positive
  inventory and reservation IDs, owner token hash presence, immutable price
  snapshot, ISO currency, and future reservation expiry.
- Added unit coverage for valid cart metadata, missing exact-item metadata,
  quantity-one enforcement, expired reservations, invalid price snapshots, and
  invalid currencies.

### Why

WooCommerce add-to-cart and checkout hooks need a deterministic cart metadata
contract before live reservation, order-line, payment, and release hooks are
enabled. This slice pins the validation surface while leaving all WooCommerce
hook registration disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/WooCommerce/SerializedCartItemValidator.php`
- `apps/wordpress-plugin/tests/Unit/SerializedCartItemValidatorTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- WooCommerce serialized cart item validator tests for exact inventory and
  reservation metadata, owner token hash presence, single serialized quantity,
  reservation expiry, immutable price snapshot, and currency validation.

### Rollback Notes

- Revert this revision to remove the WooCommerce serialized cart item metadata
  validator and tests.
- No schema rollback is required; database target remains `7`.
- Live WooCommerce add-to-cart, checkout, payment-complete, order-line, cart
  removal, and refund hooks remain disabled after rollback.

## 2026-06-06 - Manager Override Policy Foundation

### What Changed

- Added manager override request, decision, and policy helpers.
- Added below-minimum sale authorization rules requiring a distinct manager,
  non-empty reason, valid non-negative amounts, and a persisted override row
  when an override is accepted.
- Added unit coverage for no-override-needed sales, missing manager approval,
  same-user manager rejection, missing reason rejection, valid manager approval,
  and invalid amount rejection.

### Why

Pricing and checkout flows need a deterministic manager approval policy before
below-minimum sale hooks or POS override writes are enabled. This slice pins the
authorization behavior while leaving persistence, reauthentication, and commerce
hook integration disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Overrides/ManagerOverrideDecision.php`
- `apps/wordpress-plugin/src/Overrides/ManagerOverridePolicy.php`
- `apps/wordpress-plugin/src/Overrides/ManagerOverrideRequest.php`
- `apps/wordpress-plugin/tests/Unit/ManagerOverridePolicyTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Manager override policy tests for no-override-needed pricing, missing manager
  approval, same-user approval rejection, missing reason rejection, accepted
  below-minimum approval, and invalid amount rejection.

### Rollback Notes

- Revert this revision to remove manager override policy helpers and tests.
- No schema rollback is required; database target remains `7`.
- Manager override persistence, manager PIN reauthentication, WooCommerce/POS
  hook wiring, and audit writes remain disabled after rollback.

## 2026-06-06 - Reservation Lifecycle Foundation

### What Changed

- Added reservation lifecycle helpers for converting active reservations to
  sold inventory and releasing active reservations back to available inventory.
- Added idempotent replay handling for already-converted reservations.
- Added inventory-state mismatch protection so release/conversion cannot
  silently overwrite sold or otherwise unexpected inventory state.
- Expanded reservation service unit coverage for conversion, release,
  idempotent conversion replay, and inventory-state mismatch rejection.

### Why

WooCommerce checkout and payment hooks need a tested reservation lifecycle
contract before they can safely convert held serialized items to sold records or
release abandoned/failed carts. This slice builds those pure service rules while
leaving live hook registration and cleanup workers disabled until staging
acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Reservations/ReservationResult.php`
- `apps/wordpress-plugin/src/Reservations/ReservationService.php`
- `apps/wordpress-plugin/src/Reservations/ReservationStorage.php`
- `apps/wordpress-plugin/tests/Unit/ReservationServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Reservation lifecycle tests for active reservation conversion to sold,
  release back to available, idempotent already-converted replay, and
  inventory-state mismatch rejection.

### Rollback Notes

- Revert this revision to remove reservation lifecycle helpers and tests.
- No schema rollback is required; database target remains `7`.
- WooCommerce checkout hooks, payment-complete hook wiring, cart release hooks,
  and expiry workers remain disabled after rollback.

## 2026-06-06 - Reservation Double-Sell Prevention Foundation

### What Changed

- Added schema migration `0007_reservations`.
- Added the `tcg_reservations` table contract with idempotency keys, owner
  token hashes, expiry, source/cart/customer/order metadata, status, price
  snapshot, and a unique nullable active inventory claim key.
- Added reservation request, result, storage contract, status helper, and
  transaction-oriented reservation service foundation.
- Added unit coverage for successful reservations, idempotency replay,
  unavailable inventory rejection, active-reservation collision rejection, and
  missing idempotency-key validation before a transaction starts.
- Updated WordPress integration smoke verification to assert schema version `7`
  and reservation tables.

### Why

WooCommerce, kiosk, POS, and offline flows all need the same exact-item active
claim invariant before checkout hooks or cart write APIs are enabled. This
slice adds the reservation table and service boundary needed to prevent
double-selling one serialized inventory item, while leaving live WooCommerce
hook wiring and expiry workers disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/ReservationSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0007Reservations.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/Reservations/ReservationRequest.php`
- `apps/wordpress-plugin/src/Reservations/ReservationResult.php`
- `apps/wordpress-plugin/src/Reservations/ReservationService.php`
- `apps/wordpress-plugin/src/Reservations/ReservationStatus.php`
- `apps/wordpress-plugin/src/Reservations/ReservationStorage.php`
- `apps/wordpress-plugin/tests/Unit/ReservationSchemaTest.php`
- `apps/wordpress-plugin/tests/Unit/ReservationServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- `0007_reservations`, reversible through `Version0007Reservations::down()`.

### Tests Added

- Reservation schema tests for table presence, active inventory uniqueness,
  idempotency, expiry indexes, and rollback order.
- Reservation service tests for successful exact item reservation, duplicate
  idempotency replay, unavailable inventory rejection, active reservation
  collision rejection, and pre-transaction idempotency-key validation.
- WordPress integration smoke assertions for schema version `7` and reservation
  tables.

### Rollback Notes

- Roll back schema version `7` to `6` with
  `MigrationRunner::rollback_to(6)` in a controlled maintenance window.
- Revert this revision to remove reservation schema and service helpers.
- Do not roll back reservation tables in production if real reservations,
  pending carts, checkout holds, POS holds, kiosk carts, or offline claims
  exist; export and reconcile item state first.
- WooCommerce checkout hooks, cart release hooks, expiry workers, and kiosk
  reservation writes remain disabled after rollback.

## 2026-06-06 - ScryDex Card Normalization Foundation

### What Changed

- Added a ScryDex card normalizer that maps provider payloads into local
  reference-card row shapes.
- Added a ScryDex card normalization result object that separates valid rows,
  optional price rows, and provider payload errors.
- Added current market price normalization with decimal formatting, currency
  validation, and observed timestamps.
- Added unit coverage for fixture-backed reference-card rows, price rows,
  required-field errors, and nullable optional fields.

### Why

ScryDex sync workers need a tested mapping contract before database upserts,
image jobs, pricing selection, or scheduled pulls are enabled. This slice pins
the local card and price row shapes while keeping write workers and live
provider configuration disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexCardNormalizer.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexCardNormalizationResult.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexCardNormalizerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `6`.

### Tests Added

- ScryDex card normalizer tests for fixture-backed card/reference rows,
  current market price rows, required-field errors, and nullable optional set,
  price, and timestamp fields.

### Rollback Notes

- Revert this revision to remove the ScryDex normalization helpers and tests.
- No schema rollback is required; database target remains `6`.
- ScryDex scheduled workers, database upserts, live provider credentials, image
  downloads, and webhooks remain disabled after rollback.

## 2026-06-06 - ScryDex Provider Adapter Foundation

### What Changed

- Added a ScryDex provider result object and adapter contract.
- Added a ScryDex HTTP provider with injectable transport for fixture-backed
  tests, card search, card detail, usage request, default-disabled webhook
  registration, credential headers, rate-limit mapping, unauthorized mapping,
  and auth-context redaction.
- Updated the shared redactor to treat provider team IDs as sensitive.
- Added unit coverage for missing credentials, mock card search, credential
  headers, rate-limit mapping, and ScryDex auth-context redaction.

### Why

ScryDex sync workers need a tested provider boundary before scheduled pulls,
normalization, image download, or webhook processing can be enabled. This slice
adds the adapter contract and mock-backed HTTP behavior while leaving live
worker wiring and production credentials disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexProvider.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexHttpProvider.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexResult.php`
- `apps/wordpress-plugin/src/Logging/Redactor.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexHttpProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/RedactorTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `6`.

### Tests Added

- ScryDex provider tests for missing credentials, mock card search, credential
  headers, rate-limit mapping, and redacted auth context.
- Redactor test coverage for provider `X-Team-ID` style keys.

### Rollback Notes

- Revert this revision to remove the ScryDex provider adapter and team ID
  redaction change.
- No schema rollback is required; database target remains `6`.
- Do not wire scheduled ScryDex workers or production credentials until staging
  verifies sandbox calls, checkpoint resume, usage budgets, and payload masking.
- No production ScryDex credentials or raw provider payloads are committed by
  this revision.

## 2026-06-06 - ScryDex Sync Checkpoint Foundation

### What Changed

- Added schema migration `0006_sync`.
- Added sync job, log, checkpoint, error, and webhook event table contracts.
- Added a ScryDex checkpoint value object for initial checkpoints, row resume,
  successful page advancement, and storage-row serialization.
- Added a ScryDex request planner that clamps page size and derives the next
  page/cursor request from the latest checkpoint.
- Updated WordPress integration smoke verification to assert schema version `6`
  and sync tables.

### Why

ScryDex full pulls and webhook refreshes must be page/cursor checkpointed before
any live provider calls are enabled. This slice adds durable sync table
contracts and deterministic checkpoint/resume planning while keeping provider
HTTP calls, normalization workers, image workers, and webhook routes disabled
until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/SyncSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0006Sync.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncCheckpoint.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncPlanner.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncCheckpointTest.php`
- `apps/wordpress-plugin/tests/Unit/SyncSchemaTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`

### Migrations Added

- `0006_sync`, reversible through `Version0006Sync::down()`.

### Tests Added

- Sync schema contract tests for jobs, logs, checkpoints, errors, webhooks, and
  rollback order.
- ScryDex checkpoint tests for first-page planning, successful page advancement,
  payload hash storage, and fixture-backed resume cursor behavior.
- WordPress integration smoke assertions for schema version `6` and all sync
  tables.

### Rollback Notes

- Roll back schema version `6` to `5` with
  `MigrationRunner::rollback_to(5)` in a controlled maintenance window.
- Revert this revision to remove sync schema and checkpoint helpers.
- Do not roll back sync tables in production if real sync jobs, webhook events,
  errors, or checkpoint history exist; export and reconcile provider sync state
  first.
- No production provider credentials or raw provider payloads are committed by
  this revision.

## 2026-06-06 - Customer Credit Ledger Posting Internals

### What Changed

- Added customer credit posting request and result objects.
- Added a customer credit ledger storage contract and `wpdb` repository.
- Added a transaction-backed customer credit ledger posting service that
  requires idempotency keys, locks the customer row, checks currency, applies
  the existing posting policy, inserts immutable ledger rows, updates cached
  balances, and returns duplicate idempotency-key replays without posting again.
- Added unit coverage for successful buylist credit posting, duplicate
  idempotency replay, overspend rejection, and missing idempotency-key
  rejection.

### Why

The credit ledger now needs a persistence path before buylist payouts,
WooCommerce redemptions, offline conflict processing, or staff adjustments can
be wired to live routes. This slice adds deterministic server-side posting
internals while keeping public credit APIs and commerce hooks disabled until
staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Credit/CustomerCreditLedgerRepository.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditLedgerService.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditLedgerStorage.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditPostingRequest.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditPostingResult.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditLedgerServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/CUSTOMER_CREDIT.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `5`.

### Tests Added

- Customer credit ledger service tests for successful posting and cached balance
  version updates.
- Duplicate idempotency-key replay test proving a retry does not insert or
  update again.
- Overspend rejection test proving no ledger insert occurs.
- Missing idempotency-key rejection test proving no transaction starts.

### Rollback Notes

- Revert this revision to remove the credit posting service and repository.
- No schema rollback is required; database target remains `5`.
- Do not expose credit write routes or checkout hooks in production until
  staging verifies ledger replay, duplicate prevention, and reconciliation.
- No production customer or credit data is committed by this revision.

## 2026-06-06 - Buylist Foundation

### What Changed

- Added schema migration `0005_buylist`.
- Added buylist submission, item, offer, approval, and conversion log table
  contracts.
- Added a buylist submission status helper covering intake, review, offer,
  acceptance, payout/conversion, completion, cancellation, rejection, and expiry.
- Updated WordPress integration smoke verification to assert schema version `5`
  and buylist tables.

### Why

Buylist intake must preserve customer submissions, staff review decisions,
manager approvals, accepted offers, and inventory conversion provenance before
live write APIs or payout hooks can safely ship. This slice adds the durable
contracts and deterministic state flow while keeping buylist writes, credit
payout posting, and inventory conversion workers disabled until staging
acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Buylist/BuylistSubmissionStatus.php`
- `apps/wordpress-plugin/src/Migrations/BuylistSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0005Buylist.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/Unit/BuylistSchemaTest.php`
- `apps/wordpress-plugin/tests/Unit/BuylistSubmissionStatusTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/BUYLIST.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`

### Migrations Added

- `0005_buylist`, reversible through `Version0005Buylist::down()`.

### Tests Added

- Buylist schema contract tests for submissions, items, offers, approvals,
  conversion log indexes, and rollback order.
- Buylist submission status tests for allowed transitions and terminal states.
- WordPress integration smoke assertions for schema version `5` and all buylist
  tables.

### Rollback Notes

- Roll back schema version `5` to `4` with
  `MigrationRunner::rollback_to(4)` in a controlled maintenance window.
- Revert this revision to remove buylist schema and status helpers.
- Do not roll back buylist tables in production if real submissions, offers, or
  conversion logs exist; export and reconcile intake records first.
- No production customer, payout, or inventory data is committed by this
  revision.

## 2026-06-06 - Customer Credit Ledger Foundation

### What Changed

- Added schema migration `0004_customer_credit`.
- Added customer, customer contact, customer credit ledger, customer merge log,
  and customer note table contracts.
- Added customer credit entry type helpers for typical signs and manager
  approval requirements.
- Added a customer credit posting policy that previews signed ledger amounts,
  before/after balances, manager approval requirements, and negative-balance
  rejection with four-decimal fixed arithmetic.
- Updated WordPress integration smoke verification to assert schema version `4`
  and customer credit tables.

### Why

Customer credit must be an immutable liability ledger before buylist payouts,
checkout redemption, offline credit conflict handling, and manager adjustments
can safely ship. This slice adds the durable table contracts and deterministic
posting rules while leaving live credit writes and UI disabled until staging
acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Credit/CustomerCreditEntryType.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditPostingDecision.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditPostingPolicy.php`
- `apps/wordpress-plugin/src/Migrations/CustomerCreditSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0004CustomerCredit.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditEntryTypeTest.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditPostingPolicyTest.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditSchemaTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/CUSTOMER_CREDIT.md`
- `docs/DATABASE.md`

### Migrations Added

- `0004_customer_credit`, reversible through
  `Version0004CustomerCredit::down()`.

### Tests Added

- Customer credit schema contract tests.
- Customer credit entry type sign and manager-approval tests.
- Customer credit posting policy tests for buylist credit, purchase
  redemption, overspend rejection, manual adjustment manager approval,
  correction signed amounts, invalid entry type, and invalid amount.
- WordPress integration smoke assertions for schema version `4` and all
  customer credit tables.

### Rollback Notes

- Roll back schema version `4` to `3` with
  `MigrationRunner::rollback_to(3)` in a controlled maintenance window.
- Revert this revision to remove credit schema and policy helpers.
- Do not roll back customer credit tables in production if real credit entries
  exist; export and reconcile liability first.
- No production customer or credit data is committed by this revision.

## 2026-06-06 - Local Event Registration Writes

### What Changed

- Added `POST /wp-json/tcg-store/v1/events/{slug}/register` for public local
  event registration.
- Added request validation for first name, last name, email, optional phone,
  optional TopDeck email, and idempotency keys.
- Added a registration policy that rejects TopDeck-hosted local writes, blocks
  closed/sold-out events, supports waitlist placement, and accepts paid events
  only when pay-at-store is enabled.
- Added a transaction-backed registration service and write repository that
  locks the event row, reuses idempotency keys, inserts registrations, creates
  waitlist rows, recomputes capacity counts, updates public event status, and
  writes registration logs.
- Added active same-event/email duplicate prevention and scoped idempotency
  conflict handling so reused keys do not expose or mutate unrelated
  registrations.
- Added safe pending TopDeck sync-log queue records for eligible free
  website-push registrations. The queue writes local intent only and does not
  call the TopDeck API.
- Updated WordPress integration smoke verification to assert the registration
  route is registered.

### Why

The public Events surface needs a safe local write path before WooCommerce
payment capture or TopDeck push is connected. This slice accepts only free and
pay-at-store reservations, leaving online payment and provider-side writes
closed until staging can verify the full commerce and TopDeck lifecycle.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/EventsController.php`
- `apps/wordpress-plugin/src/Events/EventPaymentStatus.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationDuplicateGuard.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationDecision.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationInput.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationPolicy.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationRepository.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationResult.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationService.php`
- `apps/wordpress-plugin/src/Events/EventTopDeckRegistrationPlanner.php`
- `apps/wordpress-plugin/tests/Unit/EventRegistrationDuplicateGuardTest.php`
- `apps/wordpress-plugin/tests/Unit/EventRegistrationInputTest.php`
- `apps/wordpress-plugin/tests/Unit/EventRegistrationPolicyTest.php`
- `apps/wordpress-plugin/tests/Unit/EventRegistrationResultTest.php`
- `apps/wordpress-plugin/tests/Unit/EventTopDeckRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/API.md`
- `docs/EVENTS.md`
- `docs/CHANGELOG.md`

### Migrations Added

- None. This revision uses schema version `3`.

### Tests Added

- Registration input sanitization and validation tests.
- Registration policy tests for TopDeck-hosted rejection, waitlist placement,
  paid pay-at-store acceptance, online-payment-required rejection, and deadline
  closure.
- Registration result response tests for validation errors and idempotent
  success responses.
- Duplicate guard and duplicate-blocking registration status tests.
- TopDeck queue planner tests for free website-push eligibility, local-only
  exclusion, missing TID/disabled provider exclusion, waitlist exclusion, and
  pay-at-store exclusion.
- WordPress integration smoke route assertion for the registration endpoint.

### Rollback Notes

- Revert this revision to remove public local event registration writes.
- No database rollback is required because no migration was added.
- Existing registration rows created during staging tests can be deleted from
  staging tables after confirming they are not linked to real customers,
  payments, or TopDeck pushes.
- Production deployment remains manual and should not enable payment capture or
  TopDeck push from this revision alone.

## 2026-06-06 - Read-Only Public Events Surface

### What Changed

- Added public read-only Events REST endpoints for event lists and slug-based
  event details.
- Added event filter sanitization and public presentation helpers for seats
  remaining, registration status, badges, TopDeck attribution, and hosted
  registration links.
- Added `[tcg_events]` and `[tcg_event_detail]` shortcodes for WordPress list
  and detail pages.
- Updated WordPress integration smoke verification to assert the Events routes
  are registered.

### Why

The public Events page and detail pages need a safe read path before the system
accepts registrations, payment, waitlist changes, or TopDeck writes. This slice
lets staging review event display and filtering while leaving all write flows
closed.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/EventsController.php`
- `apps/wordpress-plugin/src/Events/EventFilters.php`
- `apps/wordpress-plugin/src/Events/EventPresenter.php`
- `apps/wordpress-plugin/src/Events/EventRepository.php`
- `apps/wordpress-plugin/src/Events/EventShortcodes.php`
- `apps/wordpress-plugin/src/Bootstrap/Plugin.php`
- `apps/wordpress-plugin/tests/Unit/EventFiltersTest.php`
- `apps/wordpress-plugin/tests/Unit/EventPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/API.md`
- `docs/EVENTS.md`

### Migrations Added

- None. This revision uses schema version `3`.

### Tests Added

- Event filter sanitization tests.
- Public event presenter tests for status, seats remaining, badges, TopDeck
  attribution, and hosted-registration links.
- WordPress integration smoke route assertions for public event endpoints.

### Rollback Notes

- Revert this revision to remove read-only public Events routes and shortcodes.
- No database rollback is required.
- Existing event rows remain untouched because no write paths are added.

### CI Fix Notes

- Replaced a short ternary in the Events REST controller with explicit limit
  normalization.
- Fixed WordPress coding standards assignment alignment in the event detail
  shortcode renderer.

## 2026-06-06 - Events And TopDeck Foundation

### What Changed

- Added schema migration `0003` for event, registration, waitlist, check-in,
  TopDeck sync log, and event template tables.
- Added event registration mode/status helpers, capacity counting, public badge
  helpers, and seat remaining calculations.
- Added a TopDeck provider adapter with prompt-required methods, injectable
  transport, register-player outcome mapping, redacted auth context, and a
  default `createEvent()` `not_supported` result.
- Added TopDeck settings defaults for API key, base URL, rate limit, and
  create-event safety.
- Updated WordPress integration smoke verification to require schema version
  `3` and all Events/TopDeck tables.

### Why

The Events module needs a durable local source of truth before public pages,
WooCommerce event-entry products, offline reservations, and staff check-in flows
can safely ship. TopDeck event creation remains explicitly disabled because the
reviewed public API does not document a create-tournament endpoint.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/EventsTopDeckSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0003EventsTopDeck.php`
- `apps/wordpress-plugin/src/Events/**`
- `apps/wordpress-plugin/src/TopDeck/**`
- `apps/wordpress-plugin/src/Settings/**`
- `apps/wordpress-plugin/tests/Unit/*Event*Test.php`
- `apps/wordpress-plugin/tests/Unit/TopDeckHttpProviderTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `fixtures/mocks/topdeck/**`
- `docs/CHANGELOG.md`
- `docs/EVENTS.md`
- `docs/TOPDECK_INTEGRATION.md`

### Migrations Added

- `0003_events_topdeck`, reversible through
  `Version0003EventsTopDeck::down()`.

### Tests Added

- Events/TopDeck schema contract tests.
- Event registration status and capacity tests.
- Event public status/badge tests.
- TopDeck adapter method, response mapping, and redaction tests.
- TopDeck settings sanitization tests.

### Rollback Notes

- Roll back schema version `3` to `2` with `MigrationRunner::rollback_to(2)` in
  a controlled maintenance window.
- Revert the Events/TopDeck code and fixtures if the module must be removed
  from staging.
- No production TopDeck keys are committed or required by this revision.

### CI Fix Notes

- Fixed WordPress coding standards assignment alignment in the Events/TopDeck
  schema and event status helpers.
- Corrected the WordPress integration smoke test target schema assertion from
  `2` to `3`.

## 2026-06-06 - Development, Staging, Deployment Foundation

### What Changed

- Added GitHub-first workflow policy for `main`, `develop`, `feature/*`, and
  `hotfix/*` branches.
- Added official `wp-env` configuration and package scripts for local WordPress
  development and test orchestration.
- Added local safety controls for non-production WordPress environments.
- Added development seed and mock provider fixtures for cards, inventory,
  customers, store credit, kiosk carts, buylist, events, TopDeck, ScryDex, and
  POS/payment responses.
- Added GitHub Actions workflow scaffolding for pull-request quality gates.
- Added staging and deployment runbooks with manual production approval,
  backup, smoke test, and rollback requirements.

### Why

The platform needs a repeatable source-of-truth workflow before additional
inventory, commerce, customer credit, events, and provider integrations are
implemented. These files make development reproducible, keep Codex work off
production branches, and document the safety gates required before staging or
production deployment.

### Files Affected

- `.wp-env.json`
- `package.json`
- `.github/pull_request_template.md`
- `.github/workflows/pull-request-quality-gates.yml`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/STAGING.md`
- `docs/DEPLOYMENT.md`
- `docs/TESTING.md`
- `fixtures/**`
- `scripts/wp-env/**`
- `tests/**`

### Migrations Added

- None in this revision.

### Tests Added

- Pull-request quality gate workflow for local PHP checks and required test
  scaffold validation.
- Required test matrix manifest covering PHP/plugin, REST, database migration,
  pricing, reservations, credit ledger, manager override, ScryDex, TopDeck,
  WooCommerce checkout, Playwright E2E, and offline sync conflict coverage.

### Rollback Notes

- Revert this revision to remove the development/staging/deployment framework.
- No database rollback is required because this revision does not add or alter
  database migrations.
- If a `wp-env` environment was started from this revision, run
  `npm run wp-env:clean` and `npm run wp-env:destroy` before returning to a
  previous local setup.

### CI Fix Notes

- Fixed WordPress coding standards alignment in
  `apps/wordpress-plugin/src/Migrations/InventoryPricingSchema.php`.
- Fixed WordPress integration workflow WP-CLI download URL and made the download
  fail fast with `curl -fsSL`.
- Removed strict-types declaration from the WP-CLI integration smoke script so
  it can run through `wp eval-file` in GitHub Actions.
