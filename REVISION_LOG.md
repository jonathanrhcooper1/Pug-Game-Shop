# Revision Log

This log records implementation revisions in a format suitable for pull request
review, staging approval, deployment approval, and rollback planning.

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
