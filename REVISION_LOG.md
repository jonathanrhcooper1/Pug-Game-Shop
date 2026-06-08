# Revision Log

This log records implementation revisions in a format suitable for pull request
review, staging approval, deployment approval, and rollback planning.

## 2026-06-08 - Desktop Queue Accepted-State Persistence

### What Changed

- Added a Tauri `mark_offline_operations_synced` command for accepted push
  operation IDs.
- Added SQLite update handling that marks matching pending `operation_queue`
  rows as `synced` without deleting the audit row.
- Added a browser-safe queue bridge function that calls the desktop command
  when available and remains preview-only outside Tauri.
- Wired Sync Now push-result handling to mark accepted desktop queue rows
  synced after clearing them from React state.
- Extended Rust and contract coverage for status updates, duplicate ID
  handling, unsafe ID rejection, and pending-restore behavior.

### Why

Accepted push operations were cleared from the visible React queue, but the
desktop SQLite queue still stored them as `pending`. Without a local status
update, accepted operations could reappear the next time the desktop app
restored pending queue rows.

### Files Affected

- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/offlineQueueBridge.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/local-queue-persistence-contract.mjs`
- `apps/offline-app/tests/queue-bridge-contract.mjs`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None. The existing `operation_queue.status` column already supports a
  non-pending state; this revision only adds the guarded update command.

### Tests Added

- Rust coverage for marking accepted IDs `synced`, deduplicating request IDs,
  leaving unresolved rows pending, and rejecting empty/unsafe operation IDs.
- Contract coverage for the new command, SQL template, bridge function, and
  Sync Now wiring.

### Tests Run

- `npm run test`: passed, including 883 WordPress/PHP unit tests, sync engine,
  POS/payment policy, API client, offline app TypeScript/contracts, 18
  Rust/Tauri command tests, packaging contracts, staging contracts, and ScryDex
  live smoke contract.
- `npm run build`: passed for the offline app Vite production build.
- `npm run verify:no-production-secrets`: passed with no production secret
  markers found.
- `git diff --check`: passed.
- Browser UI verification on `http://127.0.0.1:1420/`: passed for Sync Now
  plan preparation, sync surface visibility, queue text readiness, and no
  page-level horizontal overflow.

### Rollback Notes

- Revert this revision to stop marking accepted SQLite queue rows as `synced`.
- No database schema rollback is required.
- Rows already marked `synced` remain in `operation_queue` and can be audited;
  changing them back to `pending` should only be done manually if staff confirm
  the website did not accept those operations.

## 2026-06-08 - Offline Push Queue Replay Application

### What Changed

- Added sanitized accepted, conflict, and rejected operation ID arrays to the
  Tauri offline sync push response summary.
- Added an offline workspace queue replay helper that removes accepted
  operations from the local queue while keeping conflict/rejected operations
  visible for staff review.
- Updated the Sync Now desktop success path to update the visible local queue
  and push summary when the website returns per-operation push outcomes.
- Extended contract and Rust tests for sanitized push outcome IDs and local
  queue replay behavior.

### Why

The offline app could send queued work and display push counts, but accepted
operations still stayed in the visible local queue. Staff need accepted website
pushes to disappear from the local pending list while unresolved conflicts and
rejections remain actionable.

### Files Affected

- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/tauriOfflineSyncAdapter.ts`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/pull-inventory-cache-contract.mjs`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None. This changes sanitized response metadata and local React queue state
  handling only.

### Tests Added

- Rust coverage for accepted/conflict/rejected operation IDs in sanitized
  Tauri push summaries.
- Offline app behavior coverage for clearing accepted queue entries, retaining
  conflict entries, and ignoring accepted IDs already absent from the local
  queue.
- Contract markers for the new sanitized operation ID arrays and queue replay
  helper.

### Tests Run

- `npm run test`: passed, including 883 WordPress/PHP unit tests, sync engine,
  POS/payment policy, API client, offline app TypeScript/contracts, 16
  Rust/Tauri command tests, packaging contracts, staging contracts, and ScryDex
  live smoke contract.
- `npm run build`: passed for the offline app Vite production build.
- `npm run verify:no-production-secrets`: passed with no production secret
  markers found.
- `git diff --check`: passed.
- Browser UI verification on `http://127.0.0.1:1420/`: passed for Sync Now
  plan preparation, sync surface visibility, queue replay text readiness, and
  no page-level horizontal overflow.

### Rollback Notes

- Revert this revision to stop clearing accepted operations after desktop push
  summaries.
- No WordPress database, SQLite schema, or production data rollback is
  required.
- If accepted operations were cleared locally before rollback, staff should
  rely on the website/offline push operation log as the source of truth rather
  than re-adding those local operations manually.

## 2026-06-08 - Profile-Scoped Offline Sessions

### What Changed

- Added profile-scoped offline app session storage keys for queued operations
  and sync attempts.
- Added `profile_id` to offline session snapshots so local session restore can
  reject queue state saved for a different company connector.
- Kept a legacy shared-session restore path so existing local browser data can
  migrate into the active connector profile once.
- Updated the offline app profile-switch behavior to restore the selected
  company's queue/session state and clear staged push previews that belonged
  to the previous profile.
- Added behavior coverage for profile-specific restore, cross-profile
  rejection, and legacy fallback.

### Why

The offline app can be reused across multiple company websites, but the local
browser session key was shared. Profile-scoped sessions prevent one company's
queued operations or sync attempts from appearing under another company's
connector profile.

### Files Affected

- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/pull-inventory-cache-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None for WordPress or SQLite.
- Browser/localStorage migration is automatic: the old shared
  `tcg-store-offline-session-state-v1` snapshot is accepted only as a legacy
  fallback for the active connector profile, then new saves use the scoped
  `tcg-store-offline-session-state-v1:<profile-id>` key.

### Tests Added

- Offline app behavior coverage for profile-scoped session keys, matching
  profile restore, mismatched profile rejection, and legacy shared-session
  fallback.
- Offline app shell/contract markers for profile-scoped session persistence.

### Tests Run

- `npm run test`: passed, including 883 WordPress/PHP unit tests, sync engine,
  POS/payment policy, API client, offline app TypeScript/contracts, 16
  Rust/Tauri command tests, packaging contracts, staging contracts, and ScryDex
  live smoke contract.
- `npm run build`: passed for the offline app Vite production build.
- `npm run verify:no-production-secrets`: passed with no production secret
  markers found.
- `git diff --check`: passed.
- Browser UI verification on `http://127.0.0.1:1420/`: passed for Pug/Demo
  connector profile switching, profile-specific visible queue messaging, and
  no page-level horizontal overflow. The dev log surface retained an older
  React hot-reload dependency-array warning from the live edit session; it did
  not reproduce as a visible runtime failure after reload/build verification.

### Rollback Notes

- Revert this revision to return to the shared local session key.
- No server, WordPress database, or SQLite rollback is required.
- If staff created multiple company profiles after this revision, review
  browser localStorage keys before rollback to avoid hiding queued work under
  profile-specific keys.

## 2026-06-08 - Offline Event Check-In Staging

### What Changed

- Added `event_checkin` as a supported offline push operation type.
- Extended WordPress offline push parsing, server snapshot planning, operation
  resolution, queue persistence validation, route readiness reporting, and
  deferred canonical mutation planning/query templates for event check-ins.
- Added stale event conflict handling for check-ins when the event row version
  changed before reconnect sync.
- Added a typed offline app check-in operation builder with registration public
  ID, check-in method, checked-in status, and `offline_event_checkin` sync
  intent payload fields.
- Added a visible Check In action to the offline app Events panel and event
  queue preview support for queued check-ins.
- Extended Tauri queue validation to accept `event_checkin` with `event`
  entity type.

### Why

Staff could stage event registrations, but offline attendee check-ins still had
no accepted push contract. This revision makes check-ins a real queued
operation while preserving the existing safety model: server writes remain
planned/deferred until route-connected write execution is explicitly enabled.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushPayloadParser.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushOperationResolver.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotQueryPlanner.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushPersistenceQueryBuilder.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationPlanner.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationQueryBuilder.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteOperationOptionsProvider.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushPayloadParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushOperationResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushServerSnapshotQueryPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushServerSnapshotQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushPersistenceQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteOperationOptionsProviderTest.php`
- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/data/offlineQueueBridge.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/pull-inventory-cache-contract.mjs`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None. The existing event registration/check-in schema already includes
  `tcg_event_registrations` and `tcg_event_checkins`.

### Tests Added

- WordPress unit coverage for event check-in payload parsing, accepted
  resolution, missing registration identity rejection, stale event conflict
  handling, queue persistence SQL validation, server snapshot query planning,
  canonical mutation planning, and deferred query-template generation.
- Offline app contract coverage for check-in UI markers, typed check-in
  envelope payloads, browser queue support, and Rust/Tauri queue acceptance.

### Tests Run

- `npm run test`: passed, including 883 WordPress/PHP unit tests, sync engine,
  POS/payment policy, API client, offline app TypeScript/contracts, 16
  Rust/Tauri command tests, packaging contracts, staging contracts, and ScryDex
  live smoke contract.
- `npm run build`: passed for the offline app Vite production build.
- `npm run verify:no-production-secrets`: passed with no production secret
  markers found.
- `git diff --check`: passed.
- Browser UI verification on `http://127.0.0.1:1420/`: passed for Events ->
  Check In staging, queued operation visibility, no page-level horizontal
  overflow, and no browser console warnings/errors.

### Rollback Notes

- Revert this revision to remove `event_checkin` push support and the offline
  app Check In action while keeping event registration staging intact.
- No WordPress database, production data, or SQLite schema rollback is required.
- If a queued check-in operation exists locally after rollback, leave it in the
  offline queue and remove it manually only after staff confirm it was not
  already handled through another check-in path.

## 2026-06-08 - Offline App Event Registration Staging

### What Changed

- Added an Events section to the offline app navigation and workspace layout.
- Added cached event rows with open/waitlist/full/closed status badges,
  selected-event details, local capacity display, and event queue preview.
- Added functional offline walk-in registration and waitlist staging actions.
- Added a typed `event_reservation` operation builder for cached events with
  event title, start time, registration source, seat snapshot, payment status,
  and sync intent payload fields.
- Updated local event snapshots optimistically after a staged registration so
  staff can see pending local event work before reconnect sync.

### Why

Event snapshots could be pulled into the local app, but staff still had no
functional event workflow button. This revision turns cached event data into a
real local queue workflow while keeping WordPress capacity and registration
acceptance authoritative at sync time.

### Files Affected

- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/pull-inventory-cache-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline app contract coverage for event registration UI markers.
- Offline app behavior coverage for building `event_reservation` envelopes
  from cached events with expected payload and authorization context fields.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 16 passing Rust/Tauri command tests.

### Rollback Notes

- Revert this revision to remove the Events panel and event registration queue
  action while keeping pulled event snapshot cache application intact.
- No WordPress database, production data, or SQLite schema rollback is required.

## 2026-06-08 - Offline App Pull Conflict Cache Apply

### What Changed

- Added bounded sanitized conflict snapshot extraction to the Tauri desktop
  `run_offline_sync_request` pull response.
- Added stable conflict IDs and row versions to local conflict items.
- Added TypeScript conflict cache application for newer pulled conflict rows,
  including inserted, updated, ignored-as-stale, and changed conflict ID counts.
- Updated `Sync Now` to show separate conflict cache-apply counts alongside
  inventory, customer credit, and events.
- Updated conflict review payloads to include conflict ID and conflict row
  version for future replay/writeback.

### Why

The offline app could stage local conflict reviews, but pulled website conflict
snapshots did not refresh the visible conflict panel. This revision makes the
conflict panel website-refreshable while preserving staged review behavior and
leaving actual conflict resolution writeback gated for a later pass.

### Files Affected

- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/tauriOfflineSyncAdapter.ts`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/pull-inventory-cache-contract.mjs`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Rust unit coverage for sanitized pull conflict snapshot extraction.
- Offline app behavior contract coverage for conflict cache updates, inserts,
  stale row rejection, event conflict operation preservation, and manager
  override preservation.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 16 passing Rust/Tauri command tests.

### Rollback Notes

- Revert this revision to stop applying pulled conflict rows into the local
  conflict panel while keeping inventory, customer credit, and event cache
  application intact.
- No WordPress database, production data, or SQLite schema rollback is required.

## 2026-06-08 - Offline App Pull Event Cache Apply

### What Changed

- Added bounded sanitized event snapshot extraction to the Tauri desktop
  `run_offline_sync_request` pull response.
- Added TypeScript event snapshot cache state and cache application for newer
  pulled event rows, including inserted, updated, ignored-as-stale, and changed
  event ID counts.
- Updated `Sync Now` to show separate event cache-apply counts alongside
  inventory and customer credit.
- Added seed event snapshots so local pull preview and event cache counts have
  realistic offline state before live pull rows arrive.

### Why

Inventory and active customer credit pull rows could now update the local app,
but events were still represented only by a static preview count. This revision
adds the first event cache mutation layer needed for future offline event
registration and check-in workflows while keeping raw WordPress payloads out of
React state.

### Files Affected

- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/tauriOfflineSyncAdapter.ts`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/pull-inventory-cache-contract.mjs`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Rust unit coverage for sanitized pull event snapshot extraction.
- Offline app behavior contract coverage for event cache updates, inserts,
  stale row rejection, changed event IDs, and registered-count capping to event
  capacity.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 16 passing Rust/Tauri command tests.

### Rollback Notes

- Revert this revision to stop applying pulled event rows into the local event
  cache while keeping inventory and customer credit cache application intact.
- No WordPress database, production data, or SQLite schema rollback is required.

## 2026-06-08 - Offline App Pull Customer Credit Cache Apply

### What Changed

- Added bounded sanitized customer credit account extraction to the Tauri
  desktop `run_offline_sync_request` pull response.
- Added TypeScript cache application for newer active-customer credit rows,
  including updated and ignored-as-stale/unmatched counts.
- Moved the displayed customer credit snapshot into React state so successful
  desktop pulls can refresh the visible balance and ledger note.
- Updated `Sync Now` to show separate inventory and credit cache-apply counts.

### Why

Inventory pull rows could now update the offline cache, but customer credit was
still locked to the initial seed snapshot. This revision makes the active
customer credit account refreshable from website pull responses while keeping a
bounded, sanitized response shape and avoiding raw WordPress payload exposure.

### Files Affected

- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/tauriOfflineSyncAdapter.ts`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/pull-inventory-cache-contract.mjs`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Rust unit coverage for sanitized pull customer credit account extraction and
  decimal balance conversion.
- Offline app behavior contract coverage for active-customer credit updates,
  stale row rejection, unmatched-customer rejection, and redemption preview
  capping when the refreshed website balance is lower than the local preview.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 16 passing Rust/Tauri command tests.

### Rollback Notes

- Revert this revision to stop applying pulled customer credit rows into the
  local credit snapshot while keeping inventory cache application intact.
- No WordPress database, production data, or SQLite schema rollback is required.

## 2026-06-08 - Offline App Pull Inventory Cache Apply

### What Changed

- Added bounded sanitized inventory row extraction to the Tauri desktop
  `run_offline_sync_request` pull response.
- Added TypeScript cache application for newer pulled inventory rows, including
  inserted, updated, ignored-as-stale, and changed-public-ID counts.
- Updated `Sync Now` to apply live desktop pull inventory rows after successful
  pull completion and show cache-apply counts in the Desktop sync execution
  panel.
- Kept browser mode in preview and kept raw WordPress response bodies out of
  React state.

### Why

The desktop sync bridge could call WordPress pull routes and show sanitized
counts, but inventory data from successful pull responses did not yet update
the offline app's local workspace. This revision closes the first cache-mutation
step for real website-to-app inventory sync while preserving the credential and
raw-payload boundary.

### Files Affected

- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/tauriOfflineSyncAdapter.ts`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Rust unit coverage for sanitized pull inventory row extraction from WordPress
  response data.
- Offline app contract coverage for the Tauri response field, TypeScript
  cache-apply helper behavior, stale row rejection, inserted/updated counts,
  and visible Sync Now cache-apply UI markers.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 16 passing Rust/Tauri command tests.

### Rollback Notes

- Revert this revision to return desktop pull responses to count-only summaries
  and stop applying pulled inventory rows into the local cache.
- No WordPress database, production data, or SQLite schema rollback is required.

## 2026-06-08 - Offline App Authenticated Sync Bridge

### What Changed

- Added a Tauri `run_offline_sync_request` command for authenticated offline
  pull/push route calls.
- Added Rust validation for route, HTTPS/localhost endpoint, schema version,
  device public ID, push idempotency key, stored desktop token presence, and
  request body shape.
- Added sanitized Rust response summaries for WordPress pull/push responses:
  HTTP status, WordPress status/code, operation counts, pull record/tombstone
  counts, cursor counts, and credential-boundary flags.
- Added a React Tauri offline sync adapter and wired `Sync Now` to attempt
  desktop live sync only when a non-production connector has a stored paired
  device token.
- Added a visible Desktop sync execution panel for preview/running/completed/
  blocked states.
- Updated push batch body construction to use the paired registered device
  public ID when available.

### Why

Pairing and secure-store token persistence were in place, but `Sync Now` still
only previewed pull/push. This bridge creates the guarded path needed for real
desktop sync execution while keeping browser previews safe and preventing raw
tokens or raw WordPress responses from entering React state.

### Files Affected

- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/tauriOfflineSyncAdapter.ts`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Rust unit coverage for missing-token blocking, invalid sync endpoint/body
  rejection, sanitized pull response summaries, and sanitized push outcome
  summaries.
- Contract coverage for the Tauri command, TypeScript adapter, pull request
  body builder, desktop sync execution panel, and no raw-token/raw-response UI
  markers.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 16 passing Rust/Tauri command tests.
- Browser sanity check against `http://127.0.0.1:1420/`: `Sync Now` displayed
  the Desktop sync execution panel in preview mode; no console warnings/errors;
  no horizontal overflow.

### Rollback Notes

- Revert this revision to remove the desktop authenticated pull/push bridge and
  return `Sync Now` to local preview-only behavior.
- Existing stored device tokens and paired-device metadata can remain; this
  revision does not change their storage schema.
- No WordPress database or SQLite schema rollback is required.

## 2026-06-08 - Offline App Paired Device Metadata

### What Changed

- Added secret-free paired-device metadata storage for offline app connector
  profiles.
- Restored paired-device records from local storage across app reloads.
- Queried the Tauri desktop secure store for token presence when a paired
  device is active.
- Updated Sync Now and local sync-attempt history to distinguish paired desktop
  tokens from prepared local pairing requests.
- Added connector settings and pairing-panel UI status for device public ID,
  token status, and raw-token browser storage boundaries.

### Why

The desktop pairing command stores the real token in Windows Credential
Manager, but the app still needed durable, non-secret readiness metadata so
staff can tell whether a company connector is actually paired before live
pull/push sync wiring is enabled.

### Files Affected

- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Contract coverage for paired-device storage exports, storage keys, restore
  markers, Sync Now token-readiness fields, UI status labels, secure-store
  token status checks, and no raw-token browser/UI markers.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 12 passing Rust/Tauri command tests.

### Rollback Notes

- Revert this revision to remove paired-device metadata restore and token
  status display from the offline app.
- If local browser previews have saved metadata, remove
  `tcg-store-offline-paired-devices-v1` from local storage.
- No WordPress database or SQLite schema rollback is required.

## 2026-06-08 - WordPress Offline Pairing Authorization Settings

### What Changed

- Added an Offline pairing authorization section to the WordPress settings UI.
- Added fields for new one-time pairing code entry, pairing-code hashes,
  manager IDs, location IDs, per-mode scopes, and UTC expiry.
- Added a trusted Settings API save-path helper that hashes a submitted raw
  pairing code, merges it into the saved hash list, and discards the raw code
  before storage.
- Added `OfflinePairingAuthorizationSettings::KEY` for consistent option field
  names.

### Why

The desktop pairing command needs a configurable server-side policy before a
manager code can authorize offline devices. The UI gives staging admins a way
to configure that policy without storing raw pairing codes.

### Files Affected

- `apps/wordpress-plugin/src/Settings/Settings.php`
- `apps/wordpress-plugin/src/Settings/SettingsPage.php`
- `apps/wordpress-plugin/src/Settings/OfflinePairingAuthorizationSettings.php`
- `apps/wordpress-plugin/tests/Unit/SettingsTest.php`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Unit coverage for raw pairing code hashing through `Settings::sanitize()`
  with raw-code redaction from saved policy output.

### Tests Run

- `php tests/run.php`: passed, 879 tests.
- `php tests/bootstrap-smoke.php`: passed.
- `php tests/lint.php`: passed, 573 PHP files.

### Rollback Notes

- Revert this revision to remove the admin pairing policy fields and raw-code
  hashing save path.
- Existing saved pairing-code hashes can be cleared through the settings page
  or by resetting `tcg_store_platform_settings[offline_pairing_authorization]`
  to defaults.
- No database schema rollback is required.

## 2026-06-08 - Offline App Desktop Pairing Command

### What Changed

- Added a Tauri-only `pair_offline_device` command that POSTs the WordPress
  device registration request from the desktop backend.
- Added HTTPS/localhost endpoint validation for
  `/wp-json/tcg-store/v1/offline/devices/register`.
- Added the missing server-required pairing fields to the offline app request
  body: `location_id`, `manager_id`, `capabilities`, and `schema_version`.
- Added a TypeScript Tauri device-pairing adapter and `Pair Device` UI control.
- Kept browser preview pairing blocked so one-time device tokens are not
  requested or stored outside the desktop secure-store path.

### Why

The app needed the live bridge from manager pairing code to secure device-token
storage before pull/push sync can be safely connected.

### Files Affected

- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/Cargo.lock`
- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/tauriDevicePairingAdapter.ts`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Rust unit coverage for successful WordPress registration responses storing
  the token without returning it, and rejected WordPress responses failing
  without credential persistence.
- TypeScript/contract coverage for the Tauri-only pairing adapter, required
  request body fields, UI button/state markers, and continued browser-storage
  avoidance.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 12 passing Rust/Tauri command tests.

### Rollback Notes

- Revert this revision to remove desktop pairing POST support and the `Pair
  Device` UI action.
- If any staging desktop device successfully paired during manual testing,
  delete its stored token from Windows Credential Manager under the `Pug Game
  Shop Offline Device Tokens` service.
- No WordPress database rollback is required for this local app change; server
  pairing route rows, if created during manual staging tests, should be revoked
  through the offline device management workflow once that UI is available.

## 2026-06-08 - Offline App Device Token Secure Store

### What Changed

- Added the Windows-native `keyring` crate to the Tauri app.
- Added `store_device_token`, `get_device_token_status`, and
  `delete_device_token` Tauri commands.
- Added validation for device-token length, whitespace, profile/device
  identity, and required `offline_pull`/`offline_push` scopes.
- Added secret-free command responses that report keyring account metadata,
  token length, scope count, and presence/deletion status without returning raw
  tokens.
- Added a TypeScript Tauri secure-store adapter and surfaced desktop secure
  store availability in the pairing panel.

### Why

Live offline pairing cannot safely issue one-time device tokens until the
desktop app has a secure place to store them. This creates the desktop secure
store boundary needed before connecting live pairing POST responses to the app.

### Files Affected

- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/Cargo.lock`
- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/tauriSecureStoreAdapter.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Rust unit coverage for storing, checking, deleting, invalid short token
  rejection, incomplete scope rejection, and missing device ID rejection.
- Tauri command contract coverage for the keyring dependency, command names,
  secret-free response markers, and no browser-storage/network fallback in the
  TypeScript adapter.

### Tests Run

- `cd apps/offline-app/src-tauri && cargo fmt && cargo test`: passed, 10 Rust
  tests.
- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 10 passing Rust/Tauri command tests.

### Rollback Notes

- Revert this revision to remove device-token secure-store commands and the
  TypeScript adapter.
- If any staging desktop device stored a token during manual testing, remove it
  from Windows Credential Manager under the `Pug Game Shop Offline Device
  Tokens` service.
- No database or local SQLite rollback is required.

## 2026-06-08 - Offline App Pairing Route Index Check

### What Changed

- Added the exact future WordPress offline device pairing request body builder
  for `pairing_code`, `installation_id`, `device_label`, `device_mode`,
  `app_version`, `platform`, and `requested_scopes`.
- Added a `Check Pairing Route` control that reads the credential-free
  WordPress REST index and requires the active website connector's
  `/tcg-store/v1/offline/devices/register` route key to exist.
- Added loading, ready, and blocked pairing route status messaging that
  explicitly reports raw pairing code transmission and credential sync as
  disabled.
- Kept live pairing POST, token issuance, and token persistence deferred until
  desktop secure-store support is connected.

### Why

The offline app needs a real path toward website pairing, but it should not
burn a manager pairing code or receive a one-time device token before the
desktop secure-store adapter exists. The route-index check proves whether the
website route is registered without sending secrets.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline app contract coverage for the pairing route REST-index check,
  future POST body fields, no-raw-code status text, and continued credential
  sync deferral.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 7 passing Rust/Tauri SQLite command tests.

### Rollback Notes

- Revert this revision to remove the pairing route index-check control and
  future POST body helper.
- No database or local SQLite rollback is required.

## 2026-06-08 - Offline App Live Connector Manifest Fetch

### What Changed

- Changed the offline app website connector test flow to fetch the public
  WordPress `/offline/connector-manifest` endpoint with credential-free CORS
  requests.
- Added live manifest success, loading, and blocked states in the connector
  profile panel.
- Added accepted/warning live manifest import into the local multi-company
  connector profile store.
- Kept a separate local preview validation button for draft connector profiles
  before a website endpoint is installed.
- Reused a shared connector manifest URL helper so each company profile resolves
  its own website endpoint.

### Why

The offline app needs to validate and import the correct company website
connector instead of only validating a local mock preview. This moves the
multi-company setup path closer to real use while keeping WordPress, ScryDex,
Square, SSH, payment, and device secrets out of the desktop profile.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline app contract coverage for live manifest fetch markers,
  credential-free `fetch` options, timeout handling, local preview validation,
  and reusable connector manifest URL modeling.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 7 passing Rust/Tauri SQLite command tests.

### Rollback Notes

- Revert this revision to return `Test Website Connector` to local preview-only
  validation.
- No database or local SQLite rollback is required.

## 2026-06-08 - Public Offline Connector Manifest Route

### What Changed

- Added `OfflineConnectorManifestController`.
- Registered `GET /wp-json/tcg-store/v1/offline/connector-manifest` as a
  public-safe, read-only manifest endpoint.
- Extended the connector manifest payload with `connector_manifest_url`.
- Updated the offline app connector manifest model, validation, and settings
  panel to surface and verify the exact manifest URL.
- Kept device pairing, pull, push, conflict list, and conflict resolution
  routes gated and unregistered by default.

### Why

The offline app needs a real per-company website endpoint it can validate
before live pairing. This route exposes only the existing secret-free connector
manifest so staff can point the app at the correct WordPress site without
syncing ScryDex, Square, SSH, payment, or device credentials into the app.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineConnectorManifestController.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineConnectorManifestPlanner.php`
- `apps/wordpress-plugin/src/Bootstrap/Plugin.php`
- `apps/wordpress-plugin/tests/Unit/ApiRouteContractTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineConnectorManifestControllerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineConnectorManifestPlannerTest.php`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `docs/CHANGELOG.md`
- `docs/API.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Route contract coverage for the public-safe manifest endpoint.
- Controller coverage proving the route does not register device pairing,
  pull, push, or conflict routes.
- Manifest planner coverage for `connector_manifest_url`.
- Offline app contract coverage for manifest URL modeling and validation.

### Tests Run

- `cd apps/wordpress-plugin && php tests/run.php`: passed, 878 tests.
- `npm run test:offline-app`: passed, including TypeScript checks, offline
  app contracts, and 7 passing Rust/Tauri SQLite command tests.

### Rollback Notes

- Revert this revision to remove the public-safe manifest endpoint and the
  offline app manifest URL validation.
- No database rollback is required.

## 2026-06-08 - Offline App Windows Build Helper

### What Changed

- Added `scripts/run-offline-app-windows-build.mjs`, a PATH-aware Tauri build
  runner that prepends the user Cargo bin path.
- Added root `npm run build:offline-app:windows`.
- Updated the offline app `build:windows` and `package:windows` path to use
  the helper while preserving the `x86_64-pc-windows-msvc` NSIS target.
- Updated the Windows package contract to verify the helper, target, bundler,
  Cargo PATH handling, and local Tauri CLI resolution.

### Why

The actual Windows package build succeeded only after manually adding Cargo to
PATH. This helper makes the build repeatable from the same PowerShell context
used by the rest of the project.

### Files Affected

- `package.json`
- `apps/offline-app/package.json`
- `apps/offline-app/tests/windows-package-contract.mjs`
- `scripts/run-offline-app-windows-build.mjs`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Windows package contract coverage for the PATH-aware Tauri build helper.

### Tests Run

- `npm --prefix apps/offline-app run build:windows`: passed and produced the
  NSIS installer under `apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`.

### Rollback Notes

- Revert this revision to restore the direct `tauri build` package script.
- No schema or local data rollback is required.

## 2026-06-08 - Offline App Desktop Queue Restore

### What Changed

- Added a `list_offline_operations` Tauri command that reads pending rows from
  the local SQLite `operation_queue`.
- Added bounded pending-operation listing with row validation, schema version
  checks, and queue ordering by `queued_at_utc`.
- Added a TypeScript queue-restore bridge that sanitizes desktop rows before
  React merges them into local state.
- Added a startup restore hook so the visible queue can hydrate from the
  desktop SQLite queue when running inside Tauri.

### Why

Local queue writes are only useful if staff can close and reopen the offline
app without losing visibility into pending work. This adds read-back without
enabling network push, direct MySQL access, or canonical website mutations.

### Files Affected

- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineQueueBridge.ts`
- `apps/offline-app/tests/queue-bridge-contract.mjs`
- `apps/offline-app/tests/local-queue-persistence-contract.mjs`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Rust command coverage for loading pending local queue rows.
- Rust command coverage for bounded queue restore limits.
- Contract coverage for the restore bridge, Tauri read command, and startup
  restore hook.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 7 passing Rust/Tauri SQLite command tests.

### Rollback Notes

- Revert this revision to remove desktop queue read-back while leaving local
  queue writes intact.
- Existing `offline.sqlite` files do not require schema rollback because this
  revision only reads the existing queue table.

## 2026-06-08 - Offline App SQLite Queue Persistence

### What Changed

- Added `rusqlite` with bundled SQLite support to the Tauri app.
- Changed the `queue_offline_operation` command from validation-only scaffold
  to local SQLite persistence for accepted offline operation envelopes.
- Added local `operation_queue` table creation and idempotent
  `INSERT OR IGNORE` writes keyed by `client_operation_id`.
- Extended the Tauri command response with database file and rows-affected
  metadata while keeping queue replay, network push, and canonical WordPress
  mutations deferred.

### Why

The offline app buttons need a real desktop queue boundary before reconnect
sync can execute safely. This revision gives the desktop shell durable local
operation persistence without enabling live website writes or direct MySQL
access.

### Files Affected

- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/Cargo.lock`
- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/tests/local-queue-persistence-contract.mjs`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None for WordPress.
- The desktop command creates the local SQLite `operation_queue` table when
  needed.

### Tests Added

- Rust command coverage now verifies accepted operation persistence, supported
  operation types, duplicate `client_operation_id` idempotency, invalid payload
  rejection, and unsupported operation rejection.
- Offline app contract coverage now checks the SQLite dependency, table
  creation SQL, database-file metadata, and rows-affected command metadata.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 5 passing Rust/Tauri SQLite command tests.

### Rollback Notes

- Revert this revision to return the desktop command to validation-only queue
  planning.
- Remove `rusqlite` from `Cargo.toml` and regenerate `Cargo.lock` if rolling
  back.
- Delete the local desktop `offline.sqlite` file only after exporting or
  confirming no unresolved offline operations need recovery.

## 2026-06-08 - Offline App Local Rust Test Runner

### What Changed

- Added `scripts/run-offline-app-rust-tests.mjs`, a PATH-aware Cargo runner for
  the offline app Tauri command tests.
- Added `npm run test:offline-app:rust`.
- Extended root `npm run test:offline-app` so it now runs TypeScript checks,
  offline app contracts, and the Tauri Rust command tests.

### Why

Rustup was installed on the machine but the active shell did not inherit the
user Cargo path. This runner makes the local test path repeatable on Windows
and keeps the Tauri command tests in the normal offline-app verification loop.

### Files Affected

- `package.json`
- `scripts/run-offline-app-rust-tests.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Root script coverage for `cargo test` in `apps/offline-app/src-tauri`.

### Tests Run

- `npm run test:offline-app`: passed, including TypeScript checks, offline app
  contracts, and 4 passing Rust/Tauri command tests.

### Rollback Notes

- Revert this revision to remove Cargo from the root offline-app test command.
- No schema rollback is required.

## 2026-06-08 - Offline App Pull Refresh Preview

### What Changed

- Fixed the TypeScript sync-session contract so guarded inventory execution
  fields live on the push route model instead of the pull route model.
- Added TypeScript typechecking to the root `npm run test:offline-app` command.
- Added `OfflinePullRefreshPreview` and `buildOfflinePullRefreshPreview`.
- `Sync Now` now creates a visible pull-refresh preview with inventory,
  customer-credit, event, conflict, cursor, and preserved queued-operation
  counts.
- Cached-only inventory rows are marked as accepted locally after the pull
  preview, while queued rows remain preserved for future push acceptance.

### Why

The offline app needs to model reconnect as both pull and push work. This
revision makes the pull side visible and typed without making live network
requests, and it strengthens the test gate so type drift is caught before a
future desktop adapter is connected.

### Files Affected

- `package.json`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline app workspace-state contract coverage for
  `OfflinePullRefreshPreview`, `buildOfflinePullRefreshPreview`, local cache
  refresh flags, and queued-operation preservation.
- Offline app UI shell contract coverage for the pull refresh panel.

### Tests Run

- `npm --prefix apps/offline-app run typecheck`: passed.
- `npm run test:offline-app`: passed.
- Browser verification at `http://127.0.0.1:1420/`: passed for `Sync Now`
  pull refresh preview rendering and queued-operation preservation.
- `npm run test`: passed, including PHP plugin tests, offline app contracts,
  packaging contracts, and required test matrix.
- `npm run build`: passed.
- `npm run verify:no-production-secrets`: passed.
- `git diff --check`: passed with line-ending warnings only.

### Rollback Notes

- Revert this revision to remove local pull-refresh preview behavior and return
  `Sync Now` to push/session planning only.
- No schema rollback is required.

## 2026-06-08 - Offline App Connector Test Reports

### What Changed

- Added a secret-free offline connector test report model for reusable
  company/site profiles.
- `Test Website Connector` now records a visible checklist for manifest shape,
  offline route map, pairing readiness, guarded inventory hold status,
  credential boundaries, and deferred network reachability.
- Added compact connector report UI styling and contract coverage for the new
  report surface.

### Why

The offline app will be used by more than one company/site, so connector setup
needs a repeatable local readiness report. This keeps credentials out of the
desktop profile while giving staff a practical view of what is ready and what
still needs pairing or live adapter work.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline app workspace-state contract coverage for
  `OfflineConnectorTestReport` and `buildConnectorTestReport`.
- Offline app UI shell contract coverage for the visible connector test report
  and its checklist classes.

### Tests Run

- `npm run test:offline-app`: passed.
- `npm run build`: passed.
- `npm run verify:no-production-secrets`: passed.
- Browser verification at `http://127.0.0.1:1420/`: passed for the connector
  test report checklist and `Needs review` warning state.
- `npm run test`: passed, including PHP plugin tests, offline app contracts,
  packaging contracts, and required test matrix.
- `git diff --check`: passed with line-ending warnings only.

### Rollback Notes

- Revert this revision to return `Test Website Connector` to manifest
  validation only.
- No schema rollback is required.

## 2026-06-08 - Offline App Connector Inventory Holds

### What Changed

- Added WordPress public inventory IDs to the offline app cached inventory
  model so reconnect operations can target website-side inventory rows.
- Added a `Hold Item` action that stages an `inventory_reservation` operation
  with an offline hold intent, guarded write metadata, and local reserved
  status.
- Extended multi-company connector profiles, manifest previews, sync sessions,
  and push summaries with route-connected push readiness and canonical
  inventory write/deferred status.
- Updated the connector editor and sync panel to show whether guarded
  inventory holds are enabled or deferred for the selected company/site.

### Why

The standalone app needs reusable company/site connectors while keeping staging
and production-safe write gates clear. This revision lets staff stage a real
offline inventory hold envelope that maps to the WordPress canonical inventory
executor path, but still defers website writes until device pairing and the
selected non-production connector explicitly allow them.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline app workspace-state contract coverage for public inventory IDs,
  `inventory_reservation` hold operation envelopes, route-connected push
  readiness, canonical inventory write gates, and production rejection.
- Offline app UI shell contract coverage for `Hold Item`, website IDs,
  guarded inventory hold controls, and inventory-write sync status.

### Tests Run

- `npm run test:offline-app`: passed.
- `npm run build`: passed.
- Browser verification at `http://127.0.0.1:1420/`: passed for the hold action,
  queued reservation preview, and deferred staging sync status.

### Rollback Notes

- Revert this revision to remove offline app inventory hold staging and return
  connector sync previews to generic deferred push status.
- No schema rollback is required.

## 2026-06-08 - Route-Connected Offline Inventory Canonical Execution

### What Changed

- Wired `OfflinePushCanonicalMutationTransactionExecutor` into the staged
  offline push route persistence provider behind an explicit canonical mutation
  execution switch.
- Route-connected push responses now report canonical transaction execution
  status, rows affected, operation IDs, block reasons, errors, and deferral
  state when the executor is configured.
- The push handler rejects failed canonical inventory execution results instead
  of returning an accepted offline response after a guarded update failure.
- Factory readiness summaries now distinguish route-connected push readiness
  from route-connected canonical write readiness for multi-site connector
  configuration.

### Why

The offline app needs a tested reconnect path that updates website inventory
only when the target site has explicitly enabled the canonical write gate. This
revision connects the existing transaction executor to the route while keeping
default and production-safe behavior deferred.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRoutePersistenceProvider.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `docs/CHANGELOG.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- `OfflinePushRouteHandlerFactoryTest::test_factory_executes_inventory_canonical_mutation_when_explicitly_enabled`
- `OfflinePushRouteHandlerFactoryTest::test_factory_does_not_fail_replayed_operation_when_canonical_execution_is_enabled`

### Tests Run

- `php tests/run.php`: passed, 875 PHP unit tests with 0 failures.
- `php tests/lint.php`: passed, 571 PHP files checked with 0 failures.
- `npm run test`: passed, including plugin bootstrap smoke, sync-engine,
  POS/payment, API-client, offline-app, packaging, and required-matrix checks.
- `npm run build`: passed for the offline app production build.
- `npm run verify:no-production-secrets`: passed.
- `git diff --check`: passed with line-ending warnings only.

### Rollback Notes

- Revert this revision to disconnect route-level canonical inventory execution
  and return the offline push route to queue/conflict persistence plus deferred
  canonical write reporting.
- No schema rollback is required.

## 2026-06-08 - Offline Inventory Canonical Mutation Transaction Executor

### What Changed

- Added `OfflinePushCanonicalMutationTransactionExecutor` and
  `OfflinePushCanonicalMutationTransactionExecutionResult`.
- The executor runs only when the canonical mutation SQL plan is valid and the
  transaction preflight result is ready.
- Implemented explicit transaction handling for inventory
  `inventory_status_guarded_update` queries: begin transaction, execute the
  prepared guarded update, commit on exactly one affected row, and rollback on
  zero rows, unexpected row counts, prepare failures, query failures, or commit
  failure.
- Added route/readiness metadata so health/admin diagnostics can report that
  the transaction executor boundary exists while default route wiring remains
  gated and deferred.
- Documented the offline-sync and database posture.

### Why

The standalone offline app needs a real, auditable path to update website
inventory after reconnect. This revision adds the first executable canonical
write boundary for the safest case: inventory reservations protected by row
version and `available` status guards, preserving double-sell prevention.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationTransactionExecutionResult.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationTransactionExecutor.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationTransactionExecutorTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/README.md`
- `apps/wordpress-plugin/readme.txt`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/OFFLINE_SYNC.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- `OfflinePushCanonicalMutationTransactionExecutorTest`

### Tests Run

- `php tests/run.php`: passed, 873 PHP unit tests with 0 failures.
- `php tests/lint.php`: passed, 571 PHP files checked with 0 failures.

### Rollback Notes

- Revert this revision to remove the explicit offline inventory canonical
  mutation transaction executor and readiness metadata.
- No schema migration, staging data cleanup, or production rollback action is
  required because default offline route wiring still leaves transaction
  execution gated unless an explicit future integration enables it.

## 2026-06-08 - Gated Live ScryDex Smoke Helper

### What Changed

- Added `npm run scrydex:live-smoke` backed by
  `scripts/scrydex-live-smoke.mjs`.
- The helper performs a read-only cards search against `/pokemon/v1/cards`
  only when ScryDex credential env vars and
  `SCRYDEX_SMOKE_CONFIRM=pull-live-scrydex` are present.
- Added sanitized output for HTTP status, result counts, and first-card summary
  fields while refusing to print raw responses or credentials.
- Added dry-run output and a contract test that enforces the confirmation gate,
  credential-redaction posture, and no WordPress database/plugin side effects.
- Documented the manual live-smoke workflow in the ScryDex integration notes.

### Why

The team needs a safe way to prove live ScryDex connectivity on demand without
turning local or CI tests into live API consumers and without exposing API keys
in logs, screenshots, commits, or pull request notes.

### Files Affected

- `package.json`
- `scripts/scrydex-live-smoke.mjs`
- `scripts/tests/scrydex-live-smoke-contract.mjs`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- `scripts/tests/scrydex-live-smoke-contract.mjs`

### Tests Run

- `npm.cmd run package:wordpress`: passed and produced
  `dist/tcg-store-platform-0.156.0.zip` at 518,082 bytes.
- `npm.cmd run staging:upload-package -- --dry-run`: passed with upload-only
  staging metadata and no activation/overwrite behavior.
- `npm.cmd run scrydex:live-smoke -- --dry-run`: passed.
- `node scripts/tests/scrydex-live-smoke-contract.mjs`: passed.
- `npm.cmd run test:packaging`: passed.
- `npm.cmd run test`: passed, including 869 PHP unit tests with 0 failures,
  WordPress bootstrap/lint checks, sync-engine, POS/payment policy, API client,
  offline app, packaging, and required matrix coverage.
- `npm.cmd run verify:no-production-secrets`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed with Windows line-ending normalization warnings
  only.

### Rollback Notes

- Revert this revision to remove the manual live ScryDex smoke command.
- No WordPress data, staging files, database migrations, or production rollback
  actions are required.

## 2026-06-08 - Offline Queue And Sync Attempt Local Persistence

### What Changed

- Added a versioned `tcg-store-offline-session-state-v1` local-storage
  envelope for queued offline operations and local sync-attempt history.
- Added snapshot and restore helpers that sanitize operation envelopes, reject
  malformed or credential-looking payloads, preserve deferred-network metadata,
  and cap restored rows.
- Updated the offline app to restore queued operations and sync attempts at
  startup, persist them after local changes, and show a visible local-save note
  in the sync queue.
- Moved sync-attempt history into a standalone visible panel so restored sync
  attempts appear immediately after reload.
- Updated offline app contract coverage and detailed changelog notes.

### Why

The standalone app needs to remain useful when disconnected or restarted.
Connector profiles and prepared pairings already persisted; queued operations
and sync-attempt history now survive reloads too, without storing WordPress,
ScryDex, Square, SSH, or device-token secrets.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline workspace contract markers for `OfflineSessionStorageSnapshot`,
  `OfflineSessionStorageRestoreResult`, `OfflineSyncAttemptRecord`,
  `OFFLINE_SESSION_STORAGE_KEY`, snapshot/restore helpers, invalid/parse-failed
  restore issues, credential-marker filtering, and deferred network/direct
  MySQL metadata.
- Offline UI shell contract markers for the visible local-save note and
  standalone sync-attempt panel.

### Tests Run

- `npm.cmd --prefix apps/offline-app run test:package-contract`: passed.
- Browser QA at `http://127.0.0.1:1420/`: passed for stage-scan, sync-attempt,
  reload, restored queue operation, restored sync-attempt panel, restored
  status message, local-save note, and console health.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed with Windows line-ending normalization warnings
  only.

### Rollback Notes

- Revert this revision to make queued operations and sync-attempt history
  session-only again.
- Clear local-storage key `tcg-store-offline-session-state-v1` to discard
  persisted offline session state.
- No database migration, staging cleanup, or production rollback is required.

## 2026-06-08 - Gated Staging Inventory Search Benchmark Runner

### What Changed

- Added `npm run staging:search-benchmark` backed by
  `scripts/staging-run-search-benchmark.mjs`.
- The runner uploads the existing WordPress 50,000-row inventory search
  benchmark PHP script to staging uploads, runs it through WP-CLI `eval-file`
  with `TCG_ALLOW_INVENTORY_SEARCH_BENCHMARK=1`, then removes only that
  temporary benchmark file through SFTP.
- Required explicit acknowledgement before seeding 50,000 deterministic
  disposable staging rows.
- Set `TCG_INVENTORY_SEARCH_BENCHMARK_CLEANUP=1` by default so fixture rows
  are removed after the baseline run unless the caller explicitly opts to keep
  rows for investigation.
- Added `scripts/tests/staging-search-benchmark-contract.mjs` and wired it
  into `npm run test:packaging`.
- Updated staging documentation and detailed changelog notes.

### Why

Phase 2 acceptance requires search and pagination baselines on the target
GoDaddy staging database. This makes the benchmark repeatable and gated while
keeping production, plugin activation, and active plugin files untouched.

### Files Affected

- `package.json`
- `scripts/staging-run-search-benchmark.mjs`
- `scripts/tests/staging-search-benchmark-contract.mjs`
- `docs/STAGING.md`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Staging search benchmark contract coverage for required SSH/WP-CLI
  environment gates, explicit benchmark confirmation, 50,000-row staging seed
  acknowledgement, default fixture cleanup, optional benchmark threshold
  wiring, temporary SFTP upload, WP-CLI `eval-file`, scoped temporary-file
  cleanup, output tailing, no plugin activation, no active plugin overwrite,
  no production deployment, and no credential printing.

### Tests Run

- `npm.cmd run test:packaging`: passed.
- `npm.cmd run staging:search-benchmark -- --dry-run` with placeholder
  staging env values, 50,000-row acknowledgement, and benchmark confirmation:
  passed.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed with Windows line-ending normalization warnings
  only.

### Rollback Notes

- Revert this revision to remove the staging search benchmark runner, contract
  test, npm script, and documentation.
- No staging cleanup is required for dry-run verification.
- A real benchmark run removes its own temporary PHP file and, by default,
  removes benchmark fixture rows after collecting baselines.
- If benchmark cleanup is intentionally disabled or interrupted, delete rows
  with barcode/SKU prefixes `PUG-BENCH-SEARCH-*` and the benchmark location
  code `PUG-BENCH-SEARCH` from staging.

## 2026-06-08 - Backup-Gated Staging Migration Rehearsal Runner

### What Changed

- Added `npm run staging:migration-rehearsal` backed by
  `scripts/staging-run-migration-rehearsal.mjs`.
- The runner uploads the existing WordPress migration rollback/restore
  rehearsal PHP script to staging uploads, runs it through WP-CLI `eval-file`
  with `TCG_ALLOW_DESTRUCTIVE_MIGRATION_REHEARSAL=1`, then removes only that
  temporary rehearsal file through SFTP.
- Required a staging backup confirmation and backup reference before a real
  run can connect.
- Added `scripts/tests/staging-migration-rehearsal-contract.mjs` and wired it
  into `npm run test:packaging`.
- Updated staging documentation and detailed changelog notes.

### Why

Inventory/card-management route acceptance depends on proving staged database
migrations can roll back and restore safely on the target staging environment.
This makes that proof repeatable while preserving the project rule that major
database migration checks require a verified backup or staging clone first.

### Files Affected

- `package.json`
- `scripts/staging-run-migration-rehearsal.mjs`
- `scripts/tests/staging-migration-rehearsal-contract.mjs`
- `docs/STAGING.md`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Staging migration rehearsal contract coverage for required SSH/WP-CLI
  environment gates, explicit destructive rehearsal confirmation, required
  backup confirmation/reference, temporary SFTP upload, WP-CLI `eval-file`,
  scoped temporary-file cleanup, output tailing, no plugin activation, no
  active plugin overwrite, no production deployment, and no credential
  printing.

### Tests Run

- `npm.cmd run test:packaging`: passed.
- `npm.cmd run staging:migration-rehearsal -- --dry-run` with placeholder
  staging env values, backup confirmation, backup reference, and migration
  confirmation: passed.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed with Windows line-ending normalization warnings
  only.

### Rollback Notes

- Revert this revision to remove the staging migration rehearsal runner,
  contract test, npm script, and documentation.
- No staging cleanup is required for dry-run verification.
- A real rehearsal run removes its own temporary PHP file. If a network
  interruption prevents cleanup, delete the timestamped
  `wordpress-migration-rehearsal-*.php` file from staging uploads.
- If a real rehearsal fails after rollback and before restore, restore staging
  from the backup reference recorded in `PUG_STAGING_BACKUP_REFERENCE`.

## 2026-06-08 - Offline Button Intents And Sync Attempt History

### What Changed

- Added distinct local inventory operation intents for scan, quantity
  adjustment, and generic inventory update actions.
- Updated `Add Scan` to stage an `offline-inventory-scan-*` queue operation and
  fill the search field with the selected barcode.
- Updated `Adjust Qty` to stage an `offline-inventory-quantity-*` queue
  operation with a quantity delta and adjustment reason in the payload.
- Updated `Sync Now` to record a visible local sync-attempt history entry for
  the active company/site connector, operation count, pairing state, and
  deferred network status.
- Updated offline app contract coverage and UI styling for the new behavior.

### Why

The offline app buttons were technically wired, but several actions still felt
identical in the local UI. This gives staff clearer feedback, gives QA concrete
operation IDs to inspect, and keeps multi-company website connector behavior
visible while live network sync remains deferred.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline workspace contract markers for scan/quantity inventory operation
  kinds, scan/quantity sync intents, quantity delta payloads, and sync-attempt
  recording.
- Offline UI shell contract markers for visible local sync attempts and the new
  scan/quantity button behavior.

### Tests Run

- `npm.cmd --prefix apps/offline-app run test:package-contract`: passed.
- Browser QA at `http://127.0.0.1:1420/`: passed for `Adjust Qty`,
  `Add Scan`, and `Sync Now`, with no console warnings or errors.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed with Windows line-ending normalization warnings
  only.

### Rollback Notes

- Revert this revision to return `Add Scan`, `Adjust Qty`, and generic
  inventory updates to the prior shared queue behavior and remove sync-attempt
  history.
- No database migration or staging cleanup is required.
- Any queued local operation envelopes created in the app preview are local
  test state only and are not sent to WordPress until future paired sync
  execution is explicitly enabled.

## 2026-06-08 - Gated Staging Inventory Smoke Runner

### What Changed

- Added `npm run staging:inventory-smoke` backed by
  `scripts/staging-run-inventory-smoke.mjs`.
- The runner uploads the existing WordPress staging inventory smoke PHP script
  to staging uploads, runs it through WP-CLI `eval-file`, then removes only
  that temporary smoke file through SFTP.
- Added `scripts/tests/staging-inventory-smoke-contract.mjs` and wired it into
  `npm run test:packaging`.
- Updated staging documentation and detailed changelog notes.

### Why

The staging upload path and live ScryDex pull were proven manually. This makes
the next staging acceptance check repeatable while keeping it gated, explicit,
and separate from deployment, plugin activation, active plugin overwrite,
production changes, and external provider side effects.

### Files Affected

- `package.json`
- `scripts/staging-run-inventory-smoke.mjs`
- `scripts/tests/staging-inventory-smoke-contract.mjs`
- `docs/STAGING.md`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Staging inventory smoke contract coverage for required SSH/WP-CLI
  environment gates, explicit smoke confirmation, temporary SFTP upload,
  WP-CLI `eval-file`, scoped temporary-file cleanup, output tailing, no plugin
  activation, no active plugin overwrite, no production deployment, and no
  credential printing.

### Tests Run

- `npm.cmd run test:packaging`: passed.
- `npm.cmd run staging:inventory-smoke -- --dry-run` with placeholder staging
  env values and smoke confirmation: passed.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed with Windows line-ending normalization warnings
  only.

### Rollback Notes

- Revert this revision to remove the staging inventory smoke runner, contract
  test, npm script, and documentation.
- No staging cleanup is required for dry-run verification.
- A real smoke run removes its own temporary PHP file. If a network
  interruption prevents cleanup, delete the timestamped
  `wordpress-staging-inventory-smoke-*.php` file from staging uploads.

## 2026-06-08 - Upload-Only Staging Package Transfer Script

### What Changed

- Added `npm run staging:upload-package` backed by
  `scripts/staging-upload-wordpress-package.mjs`.
- Added `ssh2` as a dev dependency for password-based SFTP upload from the
  local development machine to the staging WordPress filesystem.
- Added `scripts/tests/staging-upload-contract.mjs` and wired it into
  `npm run test:packaging`.
- Updated staging documentation with required environment variables and
  upload-only behavior.

### Why

The prior staging package transfer was proven manually through a scratch
script. This makes the workflow repeatable while keeping it intentionally short
of activation, migration, production deployment, active plugin overwrite, or
secret disclosure.

### Files Affected

- `package.json`
- `package-lock.json`
- `scripts/staging-upload-wordpress-package.mjs`
- `scripts/tests/staging-upload-contract.mjs`
- `docs/STAGING.md`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Staging upload contract coverage for required environment variable gates,
  explicit upload confirmation, default `/html/wp-content/uploads` remote
  target, SFTP `fastPut`, remote size verification, dry-run output, no
  activation, no active plugin overwrite, and no credential printing.

### Tests Run

- `npm.cmd run test:packaging`: passed.
- `npm.cmd run staging:upload-package -- --dry-run` with placeholder staging
  env values and upload confirmation: passed.

### Rollback Notes

- Revert this revision to remove the SFTP upload script, contract test, npm
  script, and `ssh2` dev dependency.
- No staging cleanup is required for this revision because only dry-run was
  executed during verification.
- A real upload, when run later, leaves a timestamped zip under staging
  uploads; remove that zip manually if it is no longer needed.

## 2026-06-08 - Offline Prepared Pairing Local Persistence

### What Changed

- Added a versioned `tcg-store-offline-prepared-pairings-v1` local-storage
  envelope for redacted prepared device pairing requests.
- Added restore/snapshot helpers that reject malformed storage, reject raw-code
  storage, and keep only prepared pairing records tied to known connector
  profiles.
- Updated offline app startup and save behavior so prepared-local pairing state
  survives reloads and is available to the connector sync session plan.
- Updated offline app contracts and changelog coverage for the new storage
  path.

### Why

The multi-company offline app should not forget a prepared pairing request
after a restart. Persisting only redacted pairing metadata keeps the sync panel
accurate while avoiding local storage of manager codes, device tokens,
WordPress credentials, ScryDex keys, or Square secrets.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline app workspace contract checks for
  `PreparedPairingStorageSnapshot`,
  `PreparedPairingStorageRestoreResult`, storage key markers, restore/snapshot
  helpers, and invalid-storage fallback markers.
- Offline app UI contract checks for prepared-pairing storage wiring.

### Tests Run

- `npm.cmd --prefix apps/offline-app run test:package-contract`: passed.
- Browser render QA at `http://127.0.0.1:1420/`: passed. A fake pairing code
  created a redacted prepared pairing, reload preserved the prepared-local
  state, and `Sync Now` showed `Prepared locally` with only the fingerprint and
  token-storage label. No console warnings/errors appeared.

### Rollback Notes

- Revert this revision to make prepared pairing requests session-only again.
- Clear local-storage key `tcg-store-offline-prepared-pairings-v1` to discard
  persisted prepared pairing metadata.
- No database migration or staging cleanup is required.

## 2026-06-08 - Offline Connector Sync Session Plan

### What Changed

- Added `OfflineConnectorSyncSessionPlan` and
  `buildOfflineConnectorSyncSessionPlan()` to tie active connector profiles to
  offline pull/push endpoint URLs and queued operation counts.
- Updated staged offline operations and `Sync Now` to create a website-specific
  sync session plan for the active company connector.
- Added a compact sync session panel that shows the active website connector,
  pull route, push route, operation count, pairing readiness, and desktop
  secure-token storage.
- Updated offline app contracts and changelog coverage for the new plan.

### Why

The standalone app needs to make website sync behavior concrete for multiple
companies/sites. This moves `Sync Now` from a generic preview toward an
auditable connector-specific sync plan while keeping live network execution,
device tokens, provider credentials, and direct database access deferred.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline app workspace contract checks for
  `OfflineConnectorSyncSessionPlan`,
  `buildOfflineConnectorSyncSessionPlan`, sync-session action metadata,
  no-local-operation plans, pairing readiness, and device-pairing markers.
- Offline app UI contract checks for the visible sync session panel and
  `Sync Now` session planning state.

### Tests Run

- `npm.cmd --prefix apps/offline-app run test:package-contract`: passed.
- Browser render QA at `http://127.0.0.1:1420/`: passed. `Sync Now`
  rendered the active staging website connector, `/offline/pull`,
  `/offline/push`, zero-operation push plan, required pairing status, and no
  console warnings/errors.

### Rollback Notes

- Revert this revision to remove connector-specific sync session planning and
  return `Sync Now` to the previous generic push preview.
- No database migration, remote staging cleanup, or local storage cleanup is
  required.

## 2026-06-08 - Offline Connector Profile Local Persistence

### What Changed

- Added a versioned `tcg-store-offline-connector-profiles-v1` local-storage
  envelope for offline app connector profiles.
- Added restore/snapshot helpers that reject malformed storage and any payload
  that does not explicitly keep credentials out of the app.
- Updated the offline app startup path to restore saved company/site profiles
  and the active connector, then persist profile changes automatically.
- Updated Settings copy and contract tests for saved-local connector profiles.

### Why

Multi-company connector setup needs to survive app reloads. This makes the
offline app usable for repeated staff workflows without syncing API keys,
WordPress passwords, ScryDex credentials, or Square secrets into browser/app
profile state.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline app workspace contract checks for the storage key, versioned action,
  restore/snapshot helpers, invalid-storage fallback markers, and ScryDex
  credential redaction enforcement.
- Offline app UI contract checks for local-storage use and saved-local
  connector copy.

### Tests Run

- `npm.cmd --prefix apps/offline-app run test:package-contract`: passed.
- Browser render QA at `http://127.0.0.1:1420/`: reload passed, connector
  panel rendered saved-local copy, and no console warnings/errors appeared.
  The Browser plugin read-only page scope did not expose `localStorage`, so
  storage value inspection was verified by TypeScript/contracts instead.

### Rollback Notes

- Revert this revision to return connector profiles to session-only React
  state.
- Users can clear the browser/app local-storage key
  `tcg-store-offline-connector-profiles-v1` if they need to discard saved
  profile drafts.
- No database migration or staging cleanup is required.

## 2026-06-08 - Offline Connector Pairing Request History

### What Changed

- Added a `PreparedDevicePairingRequest` model and builder for local,
  redacted device pairing requests.
- Updated the offline app Settings panel so `Prepare Pairing` creates a
  visible prepared-request record for the selected website connector, clears
  the raw pairing code from the input, and keeps the live token request
  deferred.
- Added compact prepared-pairing request styling and contract checks for the
  new UI state and workspace helper.

### Why

The offline app needs to support multiple companies and websites without
storing real secrets locally. This gives staff a concrete pairing workflow and
audit trail while live WordPress token issuance remains gated behind staging
settings.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `docs/CHANGELOG.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline app workspace contract checks for `PreparedDevicePairingRequest`,
  `buildPreparedDevicePairingRequest`, redacted request IDs, and raw-code
  storage prevention.
- Offline app UI contract checks for prepared pairing request copy, CSS, and
  state mutations.

### Tests Run

- `npm.cmd --prefix apps/offline-app run test:package-contract`: passed.
- Browser render QA at `http://127.0.0.1:1420/`: passed for Settings pairing
  flow; keypress entry was used because the in-app browser text-entry helper
  reported a virtual clipboard limitation.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed with Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to remove prepared pairing request state and UI.
- No database migration or remote staging cleanup is required.
- Existing connector profiles remain unchanged because the new pairing history
  is local React session state only.

## 2026-06-08 - WordPress Plugin Package Smoke Path

### What Changed

- Added `npm run package:wordpress` to create a staging-ready
  `tcg-store-platform` plugin zip under `dist/`.
- Added `scripts/package-wordpress-plugin.mjs`, which uses `git archive` from
  the committed WordPress plugin tree and includes only runtime plugin files.
- Added `scripts/tests/wordpress-package-contract.mjs` and wired it into
  `npm run test`.
- Updated `.gitignore`, testing docs, and changelog for generated package
  output and packaging coverage.
- Verified a package-sized SFTP upload to staging by uploading the generated
  zip to `/html/wp-content/uploads`, checking the remote byte size, and
  removing the file.

### Why

Staging deployments need a repeatable package artifact before any plugin file
upload or activation happens. The packaging smoke proves the zip can be built
and transferred to the staging WordPress filesystem without changing active
plugin code.

### Files Affected

- `.gitignore`
- `package.json`
- `scripts/package-wordpress-plugin.mjs`
- `scripts/tests/wordpress-package-contract.mjs`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- WordPress plugin package contract coverage for archive root, plugin entry
  files, runtime route-gate files, and absence of tests/vendor/dev config.

### Tests Run

- `npm.cmd run test:packaging`: passed.
- Staging SFTP package upload smoke to `/html/wp-content/uploads`: passed,
  remote size matched, zip removed.

### Rollback Notes

- Revert this revision to remove the package script and package contract test.
- Delete any local `dist/tcg-store-platform-*.zip` files if desired; `dist/`
  is ignored.
- No staging cleanup is required because the uploaded smoke zip was removed,
  and no plugin activation or file replacement occurred.

## 2026-06-08 - Staging Offline Route Gates And Live ScryDex Endpoint Verification

### What Changed

- Installed and verified the local Rust/Cargo and MSVC linker toolchain for
  Tauri command tests.
- Fixed the Tauri Windows NSIS config key from `installerMode` to `installMode`,
  added a Windows `.ico`, and committed the generated `Cargo.lock` for
  reproducible desktop-shell testing.
- Added offline route runtime settings, admin controls, and a runtime
  configurator for staging-gated device pairing, pull, push, and conflict
  routes.
- Updated offline route bootstrap and health planning to use runtime route
  contracts, pairing policy readiness, registered-device permissions, and
  handler availability before any offline REST route can register.
- Kept `offline_sync` unavailable in production while allowing local,
  development, and staging environments to opt in behind explicit settings.
- Updated the ScryDex HTTP provider and dry-run diagnostics to target the
  current `/pokemon/v1/cards` endpoint and normalize live response rows that
  omit game context.
- Added a root `build` script and made the production-secret scanner skip
  generated/binary artifact directories.
- Added a root `CHANGELOG.md` pointer to the detailed docs changelog.
- Verified staging SSH/SFTP upload access by writing and removing a harmless
  marker under `/html/wp-content/uploads`; no plugin files were activated or
  overwritten.
- Verified a live ScryDex pull with sanitized output only: `GET
  /pokemon/v1/cards` returned HTTP 200, two Charizard rows, and `total_count`
  metadata.

### Why

The offline app needs a safe, company-configurable staging path before live
pairing, pull, or push routes are exposed. ScryDex credentials are now
available for staging checks, so the provider adapter also needed to match the
current documented endpoint before worker execution is enabled.

### Files Affected

- `CHANGELOG.md`
- `.gitignore`
- `package.json`
- `scripts/wp-env/verify-no-production-secrets.mjs`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `apps/offline-app/README.md`
- `apps/offline-app/src-tauri/Cargo.lock`
- `apps/offline-app/src-tauri/icons/icon.ico`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `apps/offline-app/tests/windows-package-contract.mjs`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineDevicePairingRouteReadinessPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRouteBootstrapper.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineRouteRuntimeConfigurator.php`
- `apps/wordpress-plugin/src/FeatureFlags/FeatureFlagRegistry.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexHttpProvider.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncDryRunPlanner.php`
- `apps/wordpress-plugin/src/Settings/OfflineRouteRuntimeSettings.php`
- `apps/wordpress-plugin/src/Settings/Settings.php`
- `apps/wordpress-plugin/src/Settings/SettingsPage.php`
- `apps/wordpress-plugin/tests/Unit/FeatureFlagsTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineRouteRuntimeConfiguratorTest.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexHttpProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncDryRunPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncExecutionGateTest.php`
- `apps/wordpress-plugin/tests/Unit/SettingsTest.php`

### Migrations Added

- None.

### Tests Added

- Offline route runtime settings sanitization coverage.
- Offline route runtime configurator coverage for default-off routes, device
  pairing enablement, and conflict-route enablement.
- Offline route registration/readiness coverage proving a runtime-enabled
  pairing route can register only when permission and handler dependencies are
  ready.
- ScryDex provider coverage for the live endpoint shape and game-context
  normalization.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 869 tests.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 568 PHP files.
- `npm.cmd run test:offline-app`: passed.
- `cargo test` in `apps/offline-app/src-tauri`: passed, 4 Rust tests.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `npm.cmd run build`: passed.
- Staging SSH/SFTP upload smoke to `/html/wp-content/uploads`: passed, marker
  removed.
- Live ScryDex read smoke to `/pokemon/v1/cards`: passed with sanitized
  summary output only.

### Rollback Notes

- Revert this revision to return offline routes to static default-off planning
  and remove the new runtime route settings.
- Remove `apps/offline-app/src-tauri/Cargo.lock` and
  `apps/offline-app/src-tauri/icons/icon.ico` only if the Tauri Windows shell
  is no longer being tested locally.
- Reverting the ScryDex provider change restores the older mock-only endpoint
  behavior, but live ScryDex reads will no longer match the documented current
  `/pokemon/v1/cards` route.
- No database migration rollback, WordPress plugin deactivation, staging file
  cleanup, or provider-side cleanup is required. The staging upload smoke file
  was removed during the test, and no live WordPress route was enabled by
  default.

## 2026-06-08 - Offline App Functional Connector And Local Action State

### What Changed

- Added connector draft types and helpers for creating, validating, and
  upserting multi-company website profiles from local form input.
- Added a Settings connector editor for company name, short name, website
  host/URL, environment, and ScryDex display label.
- Changed `Save Profile Draft` from a message-only button into a local
  profile add/update workflow that validates the secret-free connector
  manifest and selects the saved profile.
- Added live local state for queued operations, open/reviewed conflicts,
  customer-credit pending holds, and prepared print-label jobs.
- Updated queue, conflict, customer credit, and selected-card panels to show
  visible results after button clicks.
- Added accessible names to compact sidebar navigation buttons so mobile and
  automated testing can target hidden-label nav items.
- Extended offline app contract tests for connector draft helpers, local
  session state markers, and compact nav accessibility.

### Why

The offline app preview had several controls that prepared status messages but
did not leave enough visible state behind. The app also needed a reusable
connector model so it can target the correct WordPress/WooCommerce site per
company instead of being hardwired to one shop.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Contract coverage for connector profile draft types/helpers and profile
  upsert behavior markers.
- Contract coverage for visible queue rows, connector editor, ledger preview,
  print-label jobs, local conflict/credit state, and compact nav accessible
  labels.

### Tests Run

- `npm.cmd run typecheck` in `apps/offline-app`: passed.
- `npm.cmd run test:offline-app`: passed.
- `npm.cmd run build` in `apps/offline-app`: passed.
- Playwright desktop functional pass at `1440x1000`: staged inventory update,
  prepared print label, reviewed and approved both conflicts, staged customer
  credit hold, added and validated a second company connector, with zero
  console warnings/errors and zero horizontal overflow.
- Playwright mobile functional pass at `390x844`: opened Settings through
  compact nav, saved a connector draft, with zero console warnings/errors and
  zero horizontal overflow.

### Rollback Notes

- Revert this revision to return the offline app to seed-only connector
  profiles and message-only local action previews.
- No database migrations, live website writes, live Tauri SQLite writes,
  provider calls, payment capture, credential persistence, or production
  mutations are introduced.
- Rust/Cargo are not installed on this workstation, so the Tauri command could
  not be compiled locally in this checkpoint; the existing Rust command
  remains scaffolded behind contract tests.

## 2026-06-08 - WordPress App Pairing Contract Diagnostics

### What Changed

- Added `app_pairing_contract` to offline device pairing route readiness
  health output.
- Included the planned `POST /offline/devices/register` REST path, permission
  strategy, redacted pairing-code transport/storage, requested app scopes,
  desktop secure token storage, and live execution deferrals.
- Updated the pairing route readiness admin summary to surface app token
  storage.
- Aligned the offline app route preview with WordPress's staged offline route
  contracts for device register, pull, push, conflict list, and conflict
  resolve.
- Extended unit and WordPress smoke tests for the app pairing contract.

### Why

The offline app now has a local pairing-code preview. WordPress needed to
publish the same secret-free contract so staging can verify the app is
pairing against the correct website route and scope model before live pairing
or token issuance is enabled.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineDevicePairingRouteReadinessPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/OfflineDevicePairingRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRouteReadinessStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Pairing readiness planner assertions for app contract action, REST path,
  requested scopes, desktop secure token storage, pairing-code redaction,
  raw pairing-code storage blocking, network/token deferrals, and no
  credential sync to the app.
- Pairing readiness presenter assertion for admin summary token storage.
- WordPress integration smoke assertions for authenticated health app pairing
  contract output.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 862 tests and 0
  failures.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\Api\V1\OfflineDevicePairingRouteReadinessPlanner.php apps\wordpress-plugin\src\Api\V1\OfflineDevicePairingRouteReadinessStatusPresenter.php`:
  passed after formatting.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 565 PHP files checked
  and 0 failures.
- `npm.cmd run test:offline-app`: passed.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to remove app pairing contract diagnostics from
  pairing readiness health/admin output and restore the prior offline app route
  preview.
- No database migrations, live pairing route registration, token issuance,
  credential persistence, website network calls, provider calls, or production
  mutations are introduced.
- Existing pairing readiness, connector manifest diagnostics, and offline app
  local pairing preview remain available if only this diagnostic alignment is
  rolled back.

## 2026-06-08 - Offline App Pairing Request Preview

### What Changed

- Added `OfflineDeviceProfile` and `DevicePairingRequestPlan` types.
- Added `buildDevicePairingRequestPlan` to shape a deferred
  `POST /offline/devices/register` request for the selected connector profile.
- Added a pairing-code field and `Prepare Pairing` button to the Settings
  connector panel.
- Added redacted pairing-code fingerprinting so entered manager codes are not
  echoed back in visible UI.
- Updated contract tests and documentation for the pairing request preview.

### Why

The multi-company connector flow needs a staff-facing next step after manifest
validation: preparing a device registration request for the correct website.
This checkpoint provides that local workflow while keeping live token issuance,
network submission, and credential storage disabled until staging acceptance.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Extended offline app workspace-state contracts for pairing request planning,
  redacted pairing-code markers, scoped offline permissions, and production
  token issuance deferral.
- Extended UI shell contracts for `Pairing code`, `Prepare Pairing`,
  `handlePairingPreview`, and pairing state updates.

### Tests Run

- `npm.cmd run typecheck` from `apps/offline-app`: passed.
- `npm.cmd run build` from `apps/offline-app`: passed.
- `npm.cmd run test:offline-app`: passed.
- In-app browser DOM/interaction QA against `http://127.0.0.1:1420/`: passed
  for empty-code required messaging, filled-code pairing preview,
  `/offline/devices/register` request shaping, hidden raw pairing code, no
  console warnings/errors, and no horizontal overflow.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to remove the offline app pairing-code form and local
  pairing request preview.
- No database migrations, live route registration, live token issuance,
  credential persistence, website network calls, ScryDex/Square provider
  calls, or production mutations are introduced.
- Existing connector manifest validation, inventory queue staging, and
  credit/conflict operation previews remain available if only this pairing
  preview layer is rolled back.

## 2026-06-08 - Offline App Credit And Conflict Staged Actions

### What Changed

- Added structured customer-credit and conflict metadata to the offline app
  workspace state.
- Added `buildCustomerCreditRedemptionOperation` and
  `buildConflictReviewOperation` so customer-credit and conflict controls
  produce real offline operation envelopes.
- Refactored the React app to route inventory, credit, and conflict actions
  through a shared local queue staging path.
- Added `Stage Credit Use` and `Review Ledger` controls to the customer credit
  panel.
- Wired conflict `Review`/`Approve` buttons to queue staged conflict-review
  envelopes instead of only selecting the row.
- Updated contract tests and documentation for these newly functional buttons.

### Why

The offline app needed more visible controls to perform useful local workflow
state changes. This checkpoint extends the operation-envelope preview beyond
inventory so staff can stage customer-credit and conflict work while the app is
offline.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Extended offline app workspace-state contracts for customer-credit
  redemption and conflict-review operation builders, `credit_redemption`,
  `customer_credit`, `offline_credit_redemption`, and `staff_conflict_review`
  markers.
- Extended UI shell contracts for `Stage Credit Use`, `Review Ledger`,
  `handleCreditRedemption`, and conflict operation staging.

### Tests Run

- `npm.cmd run typecheck` from `apps/offline-app`: passed.
- `npm.cmd run build` from `apps/offline-app`: passed.
- `npm.cmd run test:offline-app`: passed.
- In-app browser DOM/interaction QA against `http://127.0.0.1:1420/`: passed
  for `Stage Credit Use`, `Approve`, and `Review Ledger`, confirming staged
  `offline-credit-*` and `offline-conflict-*` queue envelopes, no console
  warnings/errors, and no horizontal overflow.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to remove customer-credit and conflict-review local
  operation staging from the offline app.
- No database migrations, live SQLite writes, website network calls, customer
  ledger mutations, manager-approval writes, payment capture, Square writes,
  ScryDex calls, or production mutations are introduced.
- Existing inventory queue staging and connector manifest validation remain
  available if only this credit/conflict action layer is rolled back.

## 2026-06-08 - Offline App Connector Manifest Validation

### What Changed

- Added typed offline connector manifest models and validation helpers in the
  offline app workspace state.
- Added local manifest preview building from the selected company/site profile
  and normalization back into a reusable connector profile.
- Wired `Test Website Connector` to validate the selected manifest shape and
  show accepted/warning/rejected state in the Settings connector panel.
- Added route-count, WordPress device-token auth, desktop secure credential
  storage, official WooCommerce Square payment authority, ScryDex redaction,
  HTTPS/environment, and no-credential-sync checks.
- Updated offline app contracts and documentation for reusable multi-company
  website connector validation.

### Why

The offline app needs to support more than one company or website without
hardcoding secrets or assuming the current staging host forever. This
checkpoint lets the app validate WordPress connector metadata locally while
keeping pairing, token exchange, ScryDex keys, Square tokens, and provider
network execution deferred.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Extended offline app workspace-state contracts for connector manifest types,
  route preview, preview building, manifest validation, site parsing, safe
  connector IDs, and no-credential-sync markers.
- Extended UI shell contracts for manifest validation status text and the
  `Test Website Connector` interaction handler.

### Tests Run

- `npm.cmd run typecheck` from `apps/offline-app`: passed.
- `npm.cmd run build` from `apps/offline-app`: passed.
- `npm.cmd run test:offline-app`: passed.
- In-app browser DOM/interaction QA against `http://127.0.0.1:1420/`: passed
  for page identity, no framework overlay, connector button click,
  manifest-accepted state, no console warnings/errors, and no horizontal
  overflow. Screenshot capture through the in-app browser runtime timed out,
  so this checkpoint relies on DOM/console evidence instead of a rendered
  screenshot artifact.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to return `Test Website Connector` to a static preview
  action and remove app-side manifest validation.
- No database migrations, live pairing, token exchange, live SQLite writes,
  website network calls, provider writes, payment capture, ScryDex credential
  import, or production mutations are introduced.
- Existing local connector profiles and WordPress-side manifest diagnostics
  remain available if only this app-side validation layer is rolled back.

## 2026-06-08 - WordPress Offline Connector Manifest Diagnostics

### What Changed

- Added `OfflineConnectorManifestPlanner` to build an authenticated,
  secret-free connector manifest for offline app company/site pairing.
- Exposed `offline_connector_manifest` in authenticated health output with
  company branding, WordPress site/rest-base identity, offline route map,
  device-token auth mode, desktop secure-storage requirement, Square
  inventory/payment authority split, and ScryDex redaction status.
- Added an admin System Status row for the offline connector manifest.
- Extended WordPress integration smoke assertions for manifest readiness,
  route count, credential storage boundaries, official WooCommerce Square
  payment delegation, and no credential sync to the app.
- Updated deployment, testing, roadmap, and changelog documentation for the
  reusable multi-company connector boundary.

### Why

The offline app needs a reliable source of truth for the correct website and
company profile, especially if this platform is reused across multiple stores.
This checkpoint lets WordPress describe the safe pairing profile without
embedding ScryDex keys, WordPress passwords, SSH credentials, Square tokens,
or other production secrets in the app or repository.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/OfflineConnectorManifestPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/OfflineConnectorManifestPlannerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Offline connector manifest unit tests for staging HTTPS readiness,
  development HTTP handling, production HTTP degradation, route counts,
  Square authority boundaries, ScryDex credential redaction, and admin summary
  output.
- WordPress integration smoke assertions for health-output manifest readiness,
  route count, offline device-token auth mode, desktop secure credential
  storage, official WooCommerce Square payment authority, and no credential
  sync to the offline app.

### Tests Run

- `npm.cmd run test`: passed, including 862 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to remove the connector manifest from health/admin
  diagnostics and return to app-local connector profiles only.
- No database migrations, live offline route registration, token issuance,
  ScryDex credential sync, Square provider writes, payment capture, production
  network calls, or canonical inventory/customer mutations are introduced.
- Existing offline route, device pairing, and local connector profile planning
  checkpoints remain available if only this WordPress-side manifest is rolled
  back.

## 2026-06-08 - Offline App Functional Controls And Connector Profiles

### What Changed

- Added active offline app sidebar navigation that scrolls to Inventory, Sync,
  Queue, Conflicts, Customers, and Settings/connector sections.
- Added reusable company/site connector profiles with WordPress host, REST base,
  environment, offline device-token storage boundary, Square inventory/payment
  authority split, and ScryDex credential-storage boundary.
- Wired previously static controls: `Sync Now`, company profile selection,
  inventory status filters, list/grid view toggles, `Add Scan`, quantity
  staging, print-label preview, conflict review, review history, connector test
  preview, and save-profile draft.
- Added filtered-selection synchronization so the selected-card inspector
  follows the current filtered inventory result.
- Tightened the content grid so the inventory panel no longer stretches into a
  large empty block when the detail panel is taller.

### Why

The offline app needed to move past a visual prototype. This checkpoint makes
most visible controls perform safe local state changes while preserving the
offline-first boundary: no live pairing, live SQLite write, network sync,
direct MySQL access, production credentials, printer output, or canonical
website mutations are enabled yet. The connector profile model also supports
future reuse across multiple companies/sites without hardcoding secrets.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Extended offline app workspace-state contracts for reusable connector
  profiles, offline device-token storage boundaries, official WooCommerce
  Square payment authority, and server-side ScryDex credential storage.
- Extended UI shell contracts for connector controls and functional interaction
  markers covering active nav, sync preview, grid toggle, filters, and conflict
  actions.

### Tests Run

- `npm.cmd run typecheck` from `apps/offline-app`: passed.
- `npm.cmd run build` from `apps/offline-app`: passed.
- `npm.cmd run test:offline-app`: passed.
- `npm.cmd run test`: passed, including 858 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- Temporary Playwright/Chrome rendered QA against `http://127.0.0.1:1420/`:
  passed. It clicked filters, selected the Conflict filter, switched to grid,
  clicked `Sync Now`, staged a queue update, opened Settings, clicked `Test
  Website Connector`, verified Mox Amber follows the filtered selection, and
  confirmed no console warnings/errors or horizontal overflow at desktop
  `1440x1000` and mobile `390x844`.

### Rollback Notes

- Revert this revision to return the offline app to the previous mostly-static
  command-center shell.
- No database migrations, live SQLite writes, WordPress push/pull execution,
  direct MySQL access, payment capture, production network calls, printer
  output, or canonical inventory mutations are introduced.
- The previous queue-staging, Tauri command, and local SQLite planning
  contracts remain available if only these UI/connector enhancements are
  rolled back.

## 2026-06-08 - Square Inventory Batch Sync Readiness Diagnostics

### What Changed

- Added `SquareInventoryBatchSyncReadinessPlanner` to run a sandbox-only
  multi-row inventory sync probe through the existing Square batch planner.
- Exposed `square_inventory_batch_sync` in authenticated health output with
  row counts, Square request/operation counts, idempotency key counts,
  aggregate SKUs, configuration issues, row results, and explicit provider
  write/payment deferrals.
- Added an admin System Status row for Square inventory batch sync readiness.
- Extended WordPress integration smoke coverage to assert the health diagnostic
  reports staged sandbox planning while keeping Square network writes and
  payment capture deferred.

### Why

Square POS inventory pull/sync needs a batch-level readiness signal before any
live provider transport is enabled. This checkpoint makes the staging/admin
diagnostic visible so staff and release checks can confirm the plugin can
prepare multiple serialized cards for Square Catalog/Inventory updates without
calling Square, mutating provider inventory, or touching payment capture.

### Files Affected

- `apps/wordpress-plugin/src/Square/SquareInventoryBatchSyncReadinessPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventoryBatchSyncReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Square inventory batch sync readiness unit tests for default sandbox probe
  rows, production-context blocking, supplied inventory rows, admin summaries,
  aggregate operation counts, retained provider-write deferrals, and payment
  delegation to the official WooCommerce Square extension.
- WordPress integration smoke assertions for authenticated health batch sync
  readiness output.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 858 tests and 0
  failures.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\Square\SquareInventoryBatchSyncReadinessPlanner.php apps\wordpress-plugin\src\Api\V1\HealthController.php apps\wordpress-plugin\src\Admin\AdminMenu.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 563 PHP files checked
  and 0 failures.
- `npm.cmd run test`: passed, including local PHP tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to remove the batch readiness health/admin diagnostic
  while leaving the underlying Square batch planner available.
- No migrations, Square API calls, provider inventory writes, production
  requests, payment capture, custom gateway behavior, or WordPress inventory
  mutations are introduced.
- Existing single-row Square inventory sync readiness diagnostics remain
  available if only the batch readiness surface is rolled back.

## 2026-06-07 - Offline App Visual Command Center Refresh

### What Changed

- Added a project-local Pug Game Shop crest asset for the standalone offline
  app shell.
- Refreshed the React inventory command workspace with desktop app-window
  chrome, stronger brand rail, queue/conflict navigation badges, a fuller
  default cached inventory table, selected-card inspection tightening, and
  desktop/mobile responsive overflow controls.
- Kept the existing offline queue staging interaction intact: `Stage Inventory
  Update` still creates the deferred local operation preview without live
  SQLite writes, network push execution, direct MySQL access, production API
  keys, or canonical website mutations.

### Why

The standalone offline app is one of the three key project pillars and needs to
feel like a premium staff tool, not just a contract scaffold. This checkpoint
improves the visual system and first-use readability while preserving the
offline-first safety boundary and test contracts.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/src/assets/pug-game-shop-crest.png`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- No new automated test files. Existing offline app shell, workspace, queue,
  Tauri command, package, and SQLite contract tests cover the preserved
  functional markers.
- Added manual/automated screenshot QA evidence for desktop and mobile Chrome
  rendering with queue-staging interaction verification.

### Tests Run

- `npm.cmd run typecheck` from `apps/offline-app`: passed.
- `npm.cmd run build` from `apps/offline-app`: passed.
- `npm.cmd run test:offline-app`: passed.
- `npm.cmd run test`: passed, including 854 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.
- Headless Chrome desktop screenshot at `1440x1000`: passed visual inspection,
  four cached rows rendered by default, no horizontal overflow, no console
  warnings/errors.
- Headless Chrome mobile screenshot at `390x844`: passed visual inspection,
  four cached rows rendered by default, no horizontal overflow, no console
  warnings/errors.
- `Stage Inventory Update` click in both screenshot passes: passed, staged
  local operation preview updates while push execution remains deferred.

### Rollback Notes

- Revert this revision to return the offline app to the previous visual shell
  and remove the generated crest asset.
- No migrations, live SQLite writes, WordPress push execution, direct MySQL
  access, production network calls, payment capture, or canonical inventory
  mutations are introduced.
- Existing offline operation planning, queue bridge, and Tauri command
  scaffolds remain available if only the visual shell is rolled back.

## 2026-06-07 - Square Inventory Batch Sync Planning

### What Changed

- Added `SquareInventoryBatchSyncPlanner` to stage multiple inventory rows
  through Square projection planning and sandbox request planning.
- The batch planner aggregates ready/skipped/blocked row counts, request
  counts, operation counts, idempotency keys, Square object IDs, SKUs, per-row
  results, and deferral metadata.
- Added unit coverage for multi-row ready batches, hidden/unmapped skipped
  rows, invalid rows, production-context blocking, and retained payment
  delegation.

### Why

Square POS inventory sync needs a batch-level planning boundary before any
writer or provider transport is enabled. This checkpoint proves the platform can
rehearse many serialized cards as Square Catalog/Inventory plans while keeping
network calls, provider inventory writes, production requests, and payment
capture disabled.

### Files Affected

- `apps/wordpress-plugin/src/Square/SquareInventoryBatchSyncPlanner.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventoryBatchSyncPlannerTest.php`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Square inventory batch sync planner tests for multi-row ready batches,
  hidden/unmapped skipped rows, production-context blocking, invalid row
  rejection, aggregate IDs/SKUs, and deferred Square/payment writes.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 854 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\Square\SquareInventoryBatchSyncPlanner.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 561 PHP files.
- `npm.cmd run test`: passed, including 854 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove batch-level Square inventory sync planning and
  its tests.
- No migrations, Square network calls, Square inventory writes, production
  requests, payment capture, refunds, or custom gateway behavior are
  introduced.
- Single-row Square projection/readiness/request planning remains available
  after rollback.

## 2026-06-07 - Square Inventory Sync System Status Summary

### What Changed

- Added an admin summary to `SquareInventorySyncReadinessPlanner`.
- Added a `Square inventory sync` row to WordPress admin System Status,
  separate from the `WooCommerce Square extension` payment-extension row.
- Added unit coverage for ready sandbox probe summaries and blocked production
  context summaries.

### Why

Staging/admin users need a quick visible distinction between Square inventory
sync planning and Square payment handling. This keeps payment capture delegated
to the official WooCommerce Square extension while showing whether the plugin's
inventory sync probe can plan sandbox Catalog/Inventory requests.

### Files Affected

- `apps/wordpress-plugin/src/Square/SquareInventorySyncReadinessPlanner.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventorySyncReadinessPlannerTest.php`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Square inventory sync admin summary tests for ready sandbox planning and
  blocked production-context planning.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 851 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\Square\SquareInventorySyncReadinessPlanner.php apps\wordpress-plugin\src\Admin\AdminMenu.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 559 PHP files.
- `npm.cmd run test`: passed, including 851 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove the System Status row and admin summary tests.
- No migrations, Square network calls, Square inventory writes, payment
  capture, refunds, or custom gateway behavior are introduced.
- Authenticated health still exposes the raw Square inventory readiness payload
  if the previous readiness-diagnostics revision remains in place.

## 2026-06-07 - Square Inventory Sync Readiness Diagnostics

### What Changed

- Added `SquareInventorySyncReadinessPlanner` to run a sandbox inventory probe
  through Square projection planning, Square Catalog/Inventory request planning,
  and guarded execution audit output.
- Exposed `square_inventory_sync` in authenticated health output so staging can
  see inventory sync planning readiness, idempotency keys, external IDs,
  deferred writer state, production-context rejection, and Square payment
  delegation metadata.
- Added unit coverage for the default sandbox probe, rejected production/live
  credential contexts, supplied inventory rows, deferred network/provider
  writes, and continued official WooCommerce Square payment ownership.

### Why

Square POS should pull inventory from the card-management platform, but payment
authorization/capture/refunds should stay with the official WooCommerce Square
extension. This checkpoint gives staging a safe, testable inventory-readiness
probe without adding live Square network writes or a custom payment gateway.

### Files Affected

- `apps/wordpress-plugin/src/Square/SquareInventorySyncReadinessPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventorySyncReadinessPlannerTest.php`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- Square inventory sync readiness tests for sandbox probe planning,
  production-context rejection, supplied inventory rows, deferred writer
  metadata, Catalog/Inventory request envelopes, and official WooCommerce
  Square payment delegation.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 849 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\Square\SquareInventorySyncReadinessPlanner.php apps\wordpress-plugin\src\Api\V1\HealthController.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 559 PHP files.
- `npm.cmd run test`: passed, including 849 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove Square inventory sync readiness diagnostics
  from health output and delete the planner/tests.
- No migrations, Square network calls, Square inventory writes, payment
  capture, refunds, or custom gateway behavior are introduced.
- Existing Square projection planning, request planning, and official
  WooCommerce Square extension diagnostics remain available after rollback.

## 2026-06-07 - ScryDex Cards Worker Orchestration Planning

### What Changed

- Added `ScryDexCardsSyncWorkerPlanner` to rehearse a cards-page sync with an
  injected `ScryDexResult`.
- The planner now stages execution-gate output, page processing, persistence
  planning, SQL query build audits, and deferred repository results in one
  worker-level payload.
- Added unit coverage for successful mock provider pages, retryable
  rate-limited provider failures, invalid table-prefix blocking, credential
  redaction, injected-result requirements, and retained deferrals.

### Why

The project needs a worker orchestration boundary before enabling any real
scheduled worker. This checkpoint proves the full cards-page path can be
planned end to end with fixture data while live provider fetches and database
writes remain disabled.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexCardsSyncWorkerPlanner.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexCardsSyncWorkerPlannerTest.php`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- ScryDex cards worker orchestration tests for mock success, retryable
  provider failure, invalid persistence repository prefix, no provider fetches,
  no database writes, and secret redaction.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 846 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\ScryDex\ScryDexCardsSyncWorkerPlanner.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 557 PHP files.
- `npm.cmd run test`: passed, including 846 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove worker-level ScryDex cards orchestration
  planning and its tests.
- No migrations, scheduled workers, provider fetches, checkpoint execution, or
  database writes are introduced.
- Existing page processing, persistence planning, query staging, and readiness
  diagnostics remain available after rollback.

## 2026-06-07 - ScryDex Persistence Readiness Wiring

### What Changed

- Added `ScryDexPersistenceRepositoryReadinessPlanner` to run an empty-page
  readiness probe through the persistence planner, query builder, and deferred
  repository boundary.
- Exposed `scrydex_persistence_repository` in authenticated health output.
- Updated `ScryDexSyncExecutionGate` so persistence repository readiness is
  derived from the staged readiness payload instead of a manual-only override.
- Added tests for valid/invalid persistence repository readiness and execution
  gate derived readiness.

### Why

Staging needs to see whether the new ScryDex persistence boundary is configured
before live worker/database writes are enabled. This wiring makes the health
payload and execution gate explain table-prefix, query-builder, repository, and
deferred-write state without making provider calls or database writes.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexPersistenceRepositoryReadinessPlanner.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncExecutionGate.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexPersistenceRepositoryReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncExecutionGateTest.php`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- ScryDex persistence repository readiness tests for valid prefixes, table
  names, query counts, deferred write flags, and invalid prefix blocking.
- ScryDex execution gate assertions that expose persistence repository
  readiness and derive the configured gate from the readiness planner.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 843 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\ScryDex\ScryDexPersistenceRepositoryReadinessPlanner.php apps\wordpress-plugin\src\ScryDex\ScryDexSyncExecutionGate.php apps\wordpress-plugin\src\Api\V1\HealthController.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 555 PHP files.
- `npm.cmd run test`: passed, including 843 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove the health payload and execution-gate
  persistence readiness wiring.
- No migrations, provider calls, scheduled workers, checkpoint execution, or
  database writes are introduced.
- The previous execution gate can still be controlled through manual gate
  overrides in tests/staging after rollback.

## 2026-06-07 - ScryDex Persistence SQL Staging

### What Changed

- Added ScryDex persistence query build planning for reference-card inserts,
  changed-row updates, provider price observation inserts, and checkpoint
  upsert SQL templates.
- Added a deferred ScryDex persistence repository boundary that reports staged
  query execution audit rows without running `wpdb` writes.
- Added unit coverage for SQL template construction, prepare-argument counts,
  invalid table prefixes, failed source plans, deferred repository results, and
  rejected query plans.
- Updated ScryDex integration, changelog, roadmap, and testing documentation.

### Why

ScryDex worker execution needs a testable SQL/repository boundary before
staging can safely enable database writes. This checkpoint proves the query
shape, table-prefix validation, checkpoint handoff, and audit metadata while
keeping live persistence disabled.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexPersistenceQueryBuildPlan.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexPersistenceQueryBuilder.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexPersistenceRepository.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexPersistenceRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexPersistenceQueryBuilderTest.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexPersistenceRepositoryTest.php`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- None.

### Tests Added

- ScryDex persistence query builder tests for insert/update SQL templates,
  provider price observation inserts, checkpoint upsert plans, prepare
  arguments, failed source plans, and table-prefix rejection.
- ScryDex persistence repository tests for deferred audit results and
  invalid-plan rejection.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 841 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\ScryDex\ScryDexPersistenceQueryBuildPlan.php apps\wordpress-plugin\src\ScryDex\ScryDexPersistenceQueryBuilder.php apps\wordpress-plugin\src\ScryDex\ScryDexPersistenceRepositoryResult.php apps\wordpress-plugin\src\ScryDex\ScryDexPersistenceRepository.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 553 PHP files.
- `npm.cmd run test`: passed, including 841 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove the ScryDex SQL staging and repository audit
  boundary.
- No migrations or database writes are introduced, so rollback does not require
  schema changes.
- ScryDex provider calls, scheduled workers, checkpoint execution, reference
  writes, and provider price observation writes remain deferred.

## 2026-06-07 - Provider Price Observation Schema

### What Changed

- Added migration `0010_provider_price_observations` and
  `ProviderPriceObservationSchema` for `tcg_provider_price_observations`.
- Bumped plugin/database metadata to `0.156.0` and database target `10`.
- Extended ScryDex persistence planning so provider price observations include
  stable public IDs, game context, observed timestamps, and sync job IDs.
- Updated migration plan, WordPress integration smoke, migration rehearsal,
  changelog, roadmap, and testing documentation for the new schema target.

### Why

ScryDex market-price observations are reference/provider data, not store
inventory-item sale-price changes. A dedicated table prevents overloading the
inventory price-change log, which correctly requires an exact `inventory_id`.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/ProviderPriceObservationSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0010ProviderPriceObservations.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexPersistencePlanner.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/Unit/ProviderPriceObservationSchemaTest.php`
- `apps/wordpress-plugin/tests/Unit/MigrationRunnerPlanTest.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexPersistencePlannerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `apps/wordpress-plugin/tests/wordpress-migration-rehearsal.php`
- `apps/wordpress-plugin/tcg-store-platform.php`
- `apps/wordpress-plugin/readme.txt`
- `apps/wordpress-plugin/README.md`
- `apps/offline-app/package.json`
- `apps/offline-app/package-lock.json`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `apps/offline-app/src-tauri/Cargo.toml`
- `package.json`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/ROADMAP.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- Added reversible database migration `0010_provider_price_observations`.
- Rollback drops `tcg_provider_price_observations` through the migration
  runner.

### Tests Added

- Provider price observation schema tests for table presence, provider market
  snapshot fields, indexes, dbDelta shape, and rollback order.
- Migration runner plan assertions for database target `10`.
- ScryDex persistence planner assertions for provider price observation public
  IDs, game context, observed timestamps, and sync job IDs.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 836 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\Migrations\ProviderPriceObservationSchema.php apps\wordpress-plugin\src\Migrations\Version0010ProviderPriceObservations.php apps\wordpress-plugin\src\Migrations\MigrationRunner.php apps\wordpress-plugin\src\ScryDex\ScryDexPersistencePlanner.php apps\wordpress-plugin\src\Version.php apps\wordpress-plugin\tests\wordpress-integration-smoke.php apps\wordpress-plugin\tests\wordpress-migration-rehearsal.php apps\wordpress-plugin\tcg-store-platform.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 547 PHP files.
- `npm.cmd run test:offline-app`: passed.
- `npm.cmd run test`: passed, including 836 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Run `MigrationRunner::rollback_to( 9 )` in a backed-up, approved staging or
  production rollback window to drop `tcg_provider_price_observations`.
- Revert this revision to restore database target `9`, plugin metadata
  `0.155.0`, ScryDex price observation planning without schema-backed public
  IDs, and previous migration expectations.
- No ScryDex network calls, scheduled workers, checkpoint writes, or provider
  price inserts are executed by this revision.

## 2026-06-07 - ScryDex Checkpoint Repository Planning

### What Changed

- Added `ScryDexSyncCheckpointRepositoryPlanner` to build deferred read and
  upsert SQL templates for `tcg_sync_checkpoints`.
- Exposed checkpoint repository readiness through authenticated health output
  and the ScryDex sync execution gate.
- Added unit coverage for read/upsert template generation, nullable resume
  fields, invalid table prefixes, invalid checkpoint identities, and execution
  gate checkpoint-plan visibility.

### Why

ScryDex full pulls must resume safely before real worker execution can be
enabled. This revision adds the checkpoint repository boundary and table-prefix
validation needed for staging diagnostics while keeping checkpoint reads and
writes deferred.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncCheckpointRepositoryPlanner.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncExecutionGate.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncCheckpointRepositoryPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncExecutionGateTest.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added. This revision plans reads/writes against
  the existing `0006_sync` checkpoint table.

### Tests Added

- ScryDex checkpoint repository planner tests for valid read/upsert templates,
  nullable resume fields, invalid table prefixes, and invalid checkpoint
  identities.
- ScryDex execution gate assertions for checkpoint repository plan visibility.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 832 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\ScryDex\ScryDexSyncCheckpointRepositoryPlanner.php apps\wordpress-plugin\src\ScryDex\ScryDexSyncExecutionGate.php apps\wordpress-plugin\src\Api\V1\HealthController.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 544 PHP files.
- `npm.cmd run test`: passed, including 832 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine, POS/payment, API-client, offline app, and
  required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove ScryDex checkpoint repository planning,
  health/execution-gate visibility, and associated tests.
- No schema rollback, checkpoint data cleanup, provider cleanup, or worker
  cleanup is required because this revision does not execute checkpoint reads,
  checkpoint upserts, ScryDex network calls, or scheduled workers.

## 2026-06-07 - ScryDex Usage Budget Planning

### What Changed

- Added `ScryDexUsageBudgetSettings` for administrator-controlled ScryDex daily
  credit budget, remaining-credit reserve, estimated cards-page cost, and usage
  snapshot age settings.
- Added `ScryDexUsageBudgetPlanner` to plan the `/account/v1/usage` preflight,
  evaluate already-fetched usage snapshots, and block over-budget cards-page
  sync attempts without making provider requests.
- Exposed usage-budget status in WordPress settings, System Status, health
  output, and the ScryDex sync execution gate.
- Added unit coverage for disabled defaults, configured budgets, invalid
  reserve limits, deferred usage checks, snapshot-based budget blocking, and
  execution-gate budget integration.

### Why

ScryDex sync should never start making provider calls without a store-defined
budget guard. This revision adds the local budget policy and health visibility
needed before staging can safely enable real `/account/v1/usage` checks or
cards-page worker execution.

### Files Affected

- `apps/wordpress-plugin/src/Settings/ScryDexUsageBudgetSettings.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexUsageBudgetPlanner.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncExecutionGate.php`
- `apps/wordpress-plugin/src/Settings/Settings.php`
- `apps/wordpress-plugin/src/Settings/SettingsPage.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexUsageBudgetSettingsTest.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexUsageBudgetPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncExecutionGateTest.php`
- `apps/wordpress-plugin/tests/Unit/SettingsTest.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- ScryDex usage budget settings tests for disabled defaults, ready configured
  state, invalid remaining-credit reserve, and platform defaults.
- ScryDex usage budget planner tests for default blocked plans, deferred usage
  request planning, request clamping, and already-fetched usage snapshots that
  block daily-budget and remaining-credit violations.
- ScryDex execution gate assertions for usage-budget plan visibility.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 828 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\Settings\ScryDexUsageBudgetSettings.php apps\wordpress-plugin\src\ScryDex\ScryDexUsageBudgetPlanner.php apps\wordpress-plugin\src\ScryDex\ScryDexSyncExecutionGate.php apps\wordpress-plugin\src\Settings\Settings.php apps\wordpress-plugin\src\Settings\SettingsPage.php apps\wordpress-plugin\src\Admin\AdminMenu.php apps\wordpress-plugin\src\Api\V1\HealthController.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 542 PHP files.
- `npm.cmd run test`: passed, including 828 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine contracts, POS/payment contracts, API-client
  contracts, offline app contracts, and required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove ScryDex usage-budget settings, budget planning,
  health/admin visibility, and associated tests.
- No schema rollback, provider cleanup, usage-log cleanup, checkpoint cleanup,
  or worker cleanup is required because this revision does not call ScryDex,
  write database rows, enqueue workers, or persist usage snapshots.

## 2026-06-07 - ScryDex Sync Execution Gate

### What Changed

- Added `ScryDexSyncExecutionGate` to report whether the planned ScryDex cards
  sync worker is blocked, gated, or future-ready.
- Exposed `scrydex_sync_execution_gate` through authenticated health output,
  reusing the dry-run request/checkpoint plan while keeping worker execution,
  provider network calls, database writes, image downloads, and webhook
  registration deferred by default.
- Added unit coverage for default blocked state, configured-provider gated
  state, secret-free readiness metadata, and future-ready dependency reporting.

### Why

The project now has provider settings, provider factory readiness, dry-run
planning, page processing, and persistence planning. Before any real ScryDex
worker can run, staging needs a single health diagnostic that shows which
execution dependencies are still missing and proves no live network or database
write path has been enabled accidentally.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncExecutionGate.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncExecutionGateTest.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- ScryDex sync execution gate unit tests for default blocked state,
  configured-provider gated state, secret-free health payloads, and
  future-ready dependency reporting.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 821 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\ScryDex\ScryDexSyncExecutionGate.php apps\wordpress-plugin\src\Api\V1\HealthController.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed, 538 PHP files.
- `npm.cmd run test`: passed, including 821 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine contracts, POS/payment contracts, API-client
  contracts, offline app contracts, and required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove the ScryDex execution-gate health diagnostic
  and associated tests.
- No schema rollback, provider cleanup, checkpoint cleanup, image cleanup, or
  worker cleanup is required because this revision does not run ScryDex network
  calls, write database rows, enqueue workers, download images, or register
  webhooks.

## 2026-06-07 - WooCommerce Square Extension Status Diagnostics

### What Changed

- Added `WooCommerceSquareExtensionStatus` to report official WooCommerce
  Square extension install/active signals from plugin file and loaded class
  checks.
- Added official extension status fields to Square payment delegation,
  POS/payment readiness, POS/payment dependency diagnostics, the health
  endpoint, and System Status.
- Added smoke coverage for the health payload's default blocked extension
  state when the official extension is not active.
- Added unit coverage for inactive, active-plugin, installed-inactive, and
  class-signal readiness cases.

### Why

Square payments should stay with the official WooCommerce Square extension, but
staff and staging checks need to see whether that extension is actually active.
This revision adds that visibility without adding a custom Square payment
gateway, enabling Square network writes, capturing payments, executing refunds,
or changing inventory through Square.

### Files Affected

- `apps/wordpress-plugin/src/Square/WooCommerceSquareExtensionStatus.php`
- `apps/wordpress-plugin/src/Square/SquarePaymentDelegationPolicy.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/WooCommerceSquareExtensionStatusTest.php`
- `apps/wordpress-plugin/tests/Unit/SquarePaymentDelegationPolicyTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Official WooCommerce Square extension status unit tests for default inactive,
  active plugin file, installed but inactive plugin file, and loaded class
  signal detection.
- POS/payment readiness, dependency, admin-summary, and WordPress health smoke
  assertions for official extension status visibility.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 818 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\Square\WooCommerceSquareExtensionStatus.php apps\wordpress-plugin\src\Square\SquarePaymentDelegationPolicy.php apps\wordpress-plugin\src\Api\V1\HealthController.php apps\wordpress-plugin\src\Admin\AdminMenu.php apps\wordpress-plugin\src\Api\V1\PosPaymentRouteReadinessPlanner.php apps\wordpress-plugin\src\Api\V1\PosPaymentRouteDependencyFactory.php apps\wordpress-plugin\src\Api\V1\PosPaymentRouteReadinessStatusPresenter.php apps\wordpress-plugin\src\Api\V1\PosPaymentRouteDependencyStatusPresenter.php`:
  passed.
- `npm.cmd run test`: passed, including 818 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine contracts, POS/payment contracts, API-client
  contracts, offline app contracts, and required matrix checks.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove official WooCommerce Square extension status
  diagnostics and related tests.
- No schema rollback, Square cleanup, WooCommerce gateway cleanup, or payment
  cleanup is required because no Square network writes, payment capture,
  refunds, custom gateway behavior, or provider inventory writes were enabled.

## 2026-06-07 - Offline Local Queue Insert Planning

### What Changed

- Added `offlineLocalQueue` planning for SQLite `operation_queue` insert
  statements from staged offline operation envelopes.
- Added SQLite queue plan visibility to offline queue bridge submission
  results and the offline inventory command workspace.
- Added Tauri command response metadata for the planned local queue table,
  statement, parameter count, and deferred execution gates.
- Added contract coverage for the local queue persistence plan and tightened
  queue bridge/Tauri command contracts around the new metadata.

### Why

The standalone offline app needs a concrete local queue handoff before live
SQLite persistence is enabled. This revision proves the table, columns,
parameter count, idempotent insert policy, and safety gates without writing
SQLite rows, replaying the queue, mutating the website, calling the network, or
touching MySQL directly.

### Files Affected

- `apps/offline-app/src/data/offlineLocalQueue.ts`
- `apps/offline-app/src/data/offlineQueueBridge.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/tests/local-queue-persistence-contract.mjs`
- `apps/offline-app/tests/queue-bridge-contract.mjs`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/package.json`
- `package.json`
- `apps/offline-app/README.md`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Offline app local queue persistence contract coverage for SQLite insert
  planning, bridge/UI/Tauri metadata, and deferred persistence/network/website
  mutation gates.

### Tests Run

- `npm.cmd --prefix apps\offline-app run test:package-contract`: passed.
- `npm.cmd run test:offline-app`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.
- `npm.cmd run test`: passed, including 814 PHP unit tests, plugin bootstrap
  smoke, PHP lint, sync-engine contracts, POS/payment contracts, API-client
  contracts, offline app contracts, and required matrix checks.

### Rollback Notes

- Revert this revision to remove the local queue insert planner, bridge/UI
  queue plan visibility, Tauri queue metadata, and related contract test.
- No schema rollback, SQLite cleanup, WordPress cleanup, or external service
  rollback is required because live SQLite writes, queue replay, canonical
  website mutations, network writes, and direct MySQL access were not enabled.

## 2026-06-07 - ScryDex Sync Dry-Run Planning

### What Changed

- Added `ScryDexSyncDryRunPlanner` for secret-free first-page and checkpoint
  planning.
- Added a `scrydex_sync_dry_run` health payload entry for staging readiness
  checks.
- Added dry-run safeguards for provider readiness, credential redaction,
  endpoint/method reporting, checkpoint row output, page-size clamping, invalid
  game fallback, and explicit execution deferrals.
- Added unit coverage for default blocked planning, configured ready planning,
  checkpoint resume planning, and invalid request fallback.

### Why

Before enabling ScryDex workers, staging needs a safe way to confirm that
provider settings, checkpoint state, and next request shape are coherent. This
revision adds that dry-run path while keeping network requests, persistence
planning, image downloads, webhooks, scheduled workers, and database writes
disabled.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncDryRunPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncDryRunPlannerTest.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Dry-run planning coverage for default blocked readiness and first-page
  request shaping.
- Dry-run planning coverage for configured readiness without leaking Team ID or
  key values.
- Dry-run planning coverage for checkpoint resume cursor/page output.
- Dry-run planning coverage for invalid game/checkpoint fallback and page-size
  clamping.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 814 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\ScryDex\ScryDexSyncDryRunPlanner.php apps\wordpress-plugin\src\Api\V1\HealthController.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove ScryDex dry-run planning, health output, and
  related tests.
- No schema rollback or provider cleanup is required because no network calls,
  workers, image downloads, webhooks, persistence plans, or database writes
  were enabled.

## 2026-06-07 - ScryDex Provider Factory Readiness

### What Changed

- Added `ScryDexProviderFactory` to consume staged ScryDex settings.
- Added secret-free provider readiness output for health/admin status,
  including provider class, configured state, environment, active key slot,
  key fingerprint, and explicit deferrals.
- Updated the platform health endpoint to report factory-level ScryDex
  readiness.
- Updated System Status to use the factory admin summary instead of direct
  settings status.
- Added unit coverage for default blocked readiness, configured secret-free
  readiness, injected-transport provider construction, missing-configuration
  behavior, and admin summary redaction.

### Why

The staging path needs a safe boundary between saved provider credentials and
future ScryDex sync workers. This revision proves the provider can be
constructed from settings through injectable transport in tests while keeping
real network requests, scheduled workers, webhook registration, and database
writes disabled.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexProviderFactory.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexProviderFactoryTest.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- ScryDex provider factory default blocked/deferred readiness coverage.
- ScryDex provider factory configured secret-free readiness coverage.
- ScryDex provider factory injected transport coverage for server-side provider
  construction without live network calls.
- ScryDex provider factory missing-settings behavior coverage.
- ScryDex provider factory admin summary redaction coverage.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php`: passed, 810 tests.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\ScryDex\ScryDexProviderFactory.php apps\wordpress-plugin\src\Admin\AdminMenu.php apps\wordpress-plugin\src\Api\V1\HealthController.php`:
  passed.
- `php apps\wordpress-plugin\tests\lint.php`: passed.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove the ScryDex provider factory, health/admin
  factory readiness output, and factory tests.
- No schema rollback, ScryDex cleanup, or external service rollback is required
  because no live provider requests, scheduled workers, webhook registration,
  or database writes were enabled.

## 2026-06-07 - ScryDex Credential Settings Readiness

### What Changed

- Added `ScryDexProviderSettings` for staged ScryDex provider configuration.
- Added secret-preserving sanitization so blank admin password fields keep
  previously saved Team ID, primary key, and secondary key values.
- Added explicit clear flags for saved ScryDex secret values.
- Added redacted ScryDex readiness payloads for health/status surfaces.
- Added ScryDex settings fields to the WordPress settings page without echoing
  saved secrets into HTML.
- Added System Status and health endpoint visibility for non-secret ScryDex
  readiness.
- Added unit coverage for defaults, preservation, clear flags, public redaction,
  provider context, and platform defaults.

### Why

The staging site needs a safe place to receive ScryDex credentials without
putting them into GitHub, screenshots, logs, or public status JSON. This
revision creates the secure settings/readiness plumbing while keeping provider
network requests, webhook registration, database writes, and scheduled sync
workers disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Settings/ScryDexProviderSettings.php`
- `apps/wordpress-plugin/src/Settings/Settings.php`
- `apps/wordpress-plugin/src/Settings/SettingsPage.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexProviderSettingsTest.php`
- `apps/wordpress-plugin/tests/Unit/SettingsTest.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- ScryDex provider settings coverage for disabled defaults and secret-free
  public status.
- ScryDex provider settings coverage for preserving saved secret values when
  admin password fields are blank.
- ScryDex provider settings coverage for explicit secret clearing.
- ScryDex provider settings coverage for configured readiness without leaking
  Team ID or key values in public JSON.
- ScryDex provider settings coverage for server-only provider context.

### Tests Run

- `php apps\wordpress-plugin\tests\run.php --filter ScryDexProviderSettingsTest`:
  passed. The local runner does not consume the filter flag and ran all 805
  unit tests.
- `php apps\wordpress-plugin\tests\lint.php`: passed.
- `apps\wordpress-plugin\vendor\bin\phpcs.bat --standard=apps\wordpress-plugin\phpcs.xml.dist apps\wordpress-plugin\src\Settings\ScryDexProviderSettings.php apps\wordpress-plugin\src\Settings\Settings.php apps\wordpress-plugin\src\Settings\SettingsPage.php apps\wordpress-plugin\src\Admin\AdminMenu.php apps\wordpress-plugin\src\Api\V1\HealthController.php`:
  passed.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

Repo-wide source PHPCS was also attempted directly through local `vendor/bin`.
It remains blocked by pre-existing CRLF line-ending findings across many
untouched source files, so the standards gate for this revision was run against
the changed source files.

### Rollback Notes

- Revert this revision to remove the ScryDex settings surface, redacted
  readiness output, and unit tests.
- No schema rollback, provider cleanup, or external service rollback is
  required because no ScryDex network calls, webhook registration, database
  writes, or scheduled workers were added.

## 2026-06-07 - Offline Reconnect Push Request Planning

### What Changed

- Added offline app types for deferred push request plans and push response
  summaries.
- Added `buildOfflinePushRequestPlan()` to shape queued operation batches into
  `POST /wp-json/tcg-store/v1/offline/push` request plans without executing
  network calls.
- Added `summarizeOfflinePushResult()` to classify WordPress push responses
  into accepted, conflict, rejected, or validated summaries.
- Surfaced the deferred push request path and preview status in the offline
  app operation preview.
- Expanded offline app contract tests to guard request planning, response
  summarization, deferred network execution, deferred authorization headers,
  no production API key requirement, and canonical mutation deferrals.
- Updated offline app README, changelog, testing, and deployment notes.

### Why

The standalone app must be able to work offline and then update the website
when connectivity returns. This revision adds the reconnect request/response
planning contract while keeping browser-side network writes, direct database
access, production keys, queue replay, and canonical website mutations
disabled until the desktop sync executor is accepted.

### Files Affected

- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/DEPLOYMENT_OFFLINE_APP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Offline app workspace-state contract markers for deferred push request
  planning and response summarization.
- Offline app TypeScript coverage for the new reconnect request/response
  planner types.

### Tests Run

- `npm.cmd --prefix apps\offline-app run typecheck`: passed.
- `npm.cmd run test:offline-app`: passed.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove the offline app reconnect push request
  planner, response summarizer, UI preview text, and docs/tests.
- No schema rollback or server cleanup is required because no SQLite migration,
  network execution, website mutation, or production credential handling was
  added.

## 2026-06-07 - WooCommerce Product API-Client Contract

### What Changed

- Added `packages/api-client/src/woocommerceProductAdapter.mjs`.
- Added executable WooCommerce product adapter coverage for staged product
  create, update, stockout, skipped, malformed, and production-rejected
  request envelopes.
- Updated `test:api-client` so Square and WooCommerce adapter contracts run
  together.
- Documented the WooCommerce product adapter in the API-client README,
  changelog, testing notes, and Phase 2 inventory/pricing notes.

### Why

The WordPress plugin now emits WooCommerce product write request plans. This
revision adds a package-level contract that validates those envelopes without
network execution, keeps WordPress/WooCommerce writes deferred, rejects
production/live-looking credential contexts, and preserves the official
WooCommerce Square extension handoff for catalog/inventory sync.

### Files Affected

- `packages/api-client/src/woocommerceProductAdapter.mjs`
- `packages/api-client/tests/woocommerce-product-adapter.mjs`
- `packages/api-client/tests/woocommerce-product-adapter.md`
- `packages/api-client/README.md`
- `package.json`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- WooCommerce API-client contract coverage for create/update request planning.
- WooCommerce API-client contract coverage for stockout request planning.
- Production and live-looking credential rejection coverage.
- Malformed request envelope rejection coverage.
- Skipped hidden projection coverage.

### Tests Run

- `npm.cmd run test:api-client`: passed.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove the package-level WooCommerce product adapter
  contract and restore `test:api-client` to Square-only coverage.
- No schema rollback, product cleanup, Square cleanup, or payment cleanup is
  required because no network calls, product writes, provider writes, or
  payment actions were enabled.

## 2026-06-07 - WooCommerce Write Request Readiness Wiring

### What Changed

- Wired WooCommerce product write request planning into guarded product
  projection execution.
- Added production request-context rejection before any WooCommerce product
  writer callback can run.
- Added write-request status, environment, request envelopes, idempotency keys,
  product IDs/SKUs, and errors to WooCommerce projection execution audits.
- Added WooCommerce write request metadata to staged inventory create
  responses after local database insert.
- Surfaced WooCommerce write request planner readiness in inventory dependency
  health/admin summaries and the Staff Inventory workspace.
- Added unit coverage for executor request-plan audits, production-context
  rejection, intake response metadata, dependency readiness, and admin rows.

### Why

WooCommerce product payloads and request envelopes should now be visible in
the card-management workflow, but real product creation/update must remain
gated until staging review is complete. This revision makes the next
WooCommerce action auditable without opening production writes.

### Files Affected

- `apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionExecutor.php`
- `apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionExecutionResult.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/src/Admin/InventoryWorkspacePresenter.php`
- `apps/wordpress-plugin/tests/Unit/InventoryProductProjectionExecutorTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryIntakeRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryWorkspacePresenterTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- WooCommerce projection executor coverage for write request audit metadata.
- Production request-context rejection coverage proving writer callbacks are
  not called.
- Staged inventory create response coverage for WooCommerce write request
  envelopes.
- Inventory dependency and admin workspace coverage for write request planner
  readiness.

### Tests Run

- `php tests\run.php --filter InventoryProductProjectionExecutorTest --filter InventoryIntakeRouteHandlerFactoryTest --filter InventoryRouteDependencyFactoryTest --filter InventoryWorkspacePresenterTest`
  from `apps/wordpress-plugin`: passed; the local runner executed the full
  799-test suite.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\WooCommerce\InventoryProductProjectionExecutor.php src\WooCommerce\InventoryProductProjectionExecutionResult.php src\Api\V1\InventoryIntakeRouteHandler.php src\Api\V1\InventoryIntakeRouteHandlerFactory.php src\Api\V1\InventoryRouteDependencyFactory.php src\Api\V1\InventoryRouteDependencyStatusPresenter.php src\Admin\InventoryWorkspacePresenter.php`
  from `apps/wordpress-plugin`: passed.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove WooCommerce write request readiness wiring
  from execution audits, inventory create metadata, and admin/dependency
  summaries.
- No schema rollback, WooCommerce product cleanup, Square cleanup, or payment
  cleanup is required because no live product writes, provider writes, network
  requests, migrations, or payment actions were enabled.

## 2026-06-07 - WooCommerce Product Write Request Planning

### What Changed

- Added `InventoryProductWriteRequestPlanner` and
  `InventoryProductWriteRequestPlan`.
- Converted existing WooCommerce product projection operations into
  non-production create, update, and stockout request envelopes.
- Added idempotency key, product ID, SKU, request-plan, and audit metadata for
  review without executing WooCommerce product writes.
- Added production-environment rejection, failed-projection rejection,
  unsupported-operation rejection, and missing product/payload validation.
- Added unit coverage for create, update, stockout, skipped, and rejected
  request-planning paths.
- Updated changelog, testing, and inventory/pricing documentation.

### Why

The plugin already knows how to project a serialized card into a WooCommerce
product payload. This revision adds the next planning layer so staging can
review exactly which WooCommerce create/update/stockout action would be taken
before any product write gate is opened.

### Files Affected

- `apps/wordpress-plugin/src/WooCommerce/InventoryProductWriteRequestPlan.php`
- `apps/wordpress-plugin/src/WooCommerce/InventoryProductWriteRequestPlanner.php`
- `apps/wordpress-plugin/tests/Unit/InventoryProductWriteRequestPlannerTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- WooCommerce product write request planner coverage for non-production create
  requests.
- WooCommerce product write request planner coverage for existing-product
  update and stockout requests.
- Skipped projection coverage proving no product-write requests are emitted.
- Rejection coverage for production environment and failed product projection.

### Tests Run

- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\WooCommerce\InventoryProductWriteRequestPlan.php src\WooCommerce\InventoryProductWriteRequestPlanner.php`
  from `apps/wordpress-plugin`: passed.
- `php tests\run.php --filter InventoryProductWriteRequestPlannerTest` from
  `apps/wordpress-plugin`: passed; the local runner executed the full
  798-test suite.
- `npm.cmd run test`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed.

### Rollback Notes

- Revert this revision to remove the WooCommerce product write request
  planning layer and its tests/docs.
- No schema rollback, product cleanup, provider cleanup, or payment cleanup is
  required because no WooCommerce writes, network calls, migrations, or payment
  actions were added.

## 2026-06-07 - Offline Inventory Update Push Planning

### What Changed

- Added `inventory_update` to the WordPress offline push payload parser's
  supported operation/entity map.
- Added optimistic row-version resolution for offline inventory updates:
  matching row versions are accepted into the planned result payload while
  stale server versions create durable manager-review conflicts.
- Added offline operation readiness metadata for `inventory_update` route
  option summaries.
- Expanded the Tauri queue command scaffold to validate the supported
  offline operation/entity pairs: inventory update, inventory reservation,
  event reservation, and credit redemption.
- Added an offline app push-batch builder that converts local
  SQLite-compatible envelopes into the REST payload shape expected by the
  WordPress push parser.
- Surfaced the reconnect-ready push batch ID in the offline app staged
  operation preview.

### Why

The standalone app needs a safe bridge between local queued work and the
website's offline push endpoint. This revision makes a scanned inventory
update server-compatible without enabling live canonical writes, preserving the
existing deferred execution gates and conflict-review path.

### Files Affected

- `apps/wordpress-plugin/src/Offline/OfflinePushPayloadParser.php`
- `apps/wordpress-plugin/src/Offline/OfflinePushOperationResolver.php`
- `apps/wordpress-plugin/src/Api/V1/OfflinePushRouteOperationOptionsProvider.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushPayloadParserTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushOperationResolverTest.php`
- `apps/wordpress-plugin/tests/Unit/OfflinePushRouteOperationOptionsProviderTest.php`
- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/OFFLINE_SYNC.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Offline push parser coverage for `inventory_update` payload acceptance.
- Offline push resolver coverage for accepted inventory updates and stale
  row-version conflicts.
- Offline route operation-options coverage for `inventory_update` readiness.
- Offline app workspace contract coverage for REST-ready push batch shaping.
- Offline app Tauri command contract coverage for supported operation/entity
  validation markers.

### Tests Run

- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Offline\OfflinePushPayloadParser.php src\Offline\OfflinePushOperationResolver.php src\Api\V1\OfflinePushRouteOperationOptionsProvider.php`
  from `apps/wordpress-plugin`: passed.
- `php tests\run.php --filter OfflinePushOperationResolverTest` from
  `apps/wordpress-plugin`: passed; the local runner executed the full
  794-test suite.
- `npm.cmd run test:offline-app` from repository root: passed.
- `npm.cmd --prefix apps\offline-app run typecheck` from repository root:
  passed.
- Local `cargo test` was not run because Rust/Cargo is not installed on this
  machine; the Windows CI workflow remains responsible for Rust command tests.
- Direct PHPCS against existing PHPUnit test filenames still reports the
  repository's WordPress filename-rule mismatch, so source PHPCS is used for
  the focused standards gate and PHP behavior is covered by the local runner.

### Rollback Notes

- Revert this revision to remove `inventory_update` from offline push parsing,
  resolver planning, desktop validation, and the offline app reconnect batch
  preview.
- No schema rollback is required because no migrations or live canonical writes
  were added.

## 2026-06-07 - Offline App Command Workspace Visual Refinement

### What Changed

- Refined the offline app inventory command workspace shell with grouped sync
  status controls and a disabled manual sync affordance.
- Added scanner beam styling, an empty search state, a richer selected-card
  visual frame, and a three-action inventory detail cluster.
- Tightened mobile behavior so the app title wraps cleanly and sync controls
  stack within a phone viewport.
- Extended the offline app UI shell contract to preserve the new visual and
  responsive markers.
- Updated offline app, testing, and changelog documentation.

### Why

The standalone app needs to feel like a polished staff tool while preserving
the offline-first safety boundary. This pass improves the command-center UI
around scanning, selected-card review, queued work, and sync status without
adding live network, provider, or database writes.

### Files Affected

- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Offline app UI shell contract assertions for the manual sync affordance,
  selected-card visual frame, detail action cluster, empty search state, and
  mobile title constraint.

### Tests Run

- Headless Chrome desktop screenshot at `1440x900`: passed visual inspection.
- Headless Chrome mobile screenshot at `390x844`: passed visual inspection.
- `npm.cmd run test:offline-app` from repository root: passed.
- `npm.cmd --prefix apps\offline-app run typecheck` from repository root:
  passed.
- `npm.cmd run test` from repository root: passed, including the 791-test PHP
  local runner and all JavaScript/offline app contract layers.
- `npm.cmd run verify:no-production-secrets` from repository root: passed.
- `git diff --check` from repository root: passed.

### Rollback Notes

- Revert this revision to return the offline app to the prior simpler shell.
- No schema rollback, provider cleanup, or queued operation cleanup is required
  because this change only affects React/CSS UI, contract tests, and docs.

## 2026-06-07 - Square Sync Request Planner Wiring

### What Changed

- Wired `SquareInventorySyncRequestPlanner` into guarded Square projection
  execution.
- Added sync request status, request envelopes, idempotency keys, external IDs,
  errors, and readiness flags to Square projection execution audit payloads.
- Added production-context rejection before catalog or inventory writer
  callbacks can run.
- Exposed Square sync request planner readiness through inventory intake
  dependencies, authenticated health/admin summaries, and the Inventory admin
  workspace Square projection note.
- Added unit assertions for execution audit metadata, production-context
  rejection, dependency readiness, and admin workspace visibility.

### Why

The PHP Square request planner should be visible in the same WordPress staging
surfaces reviewers already use for inventory route readiness and Square
projection execution. This makes the next Square POS inventory-sync phase
easier to verify while preserving the current no-network, no-provider-write,
no-custom-payment-gateway boundary.

### Files Affected

- `apps/wordpress-plugin/src/Square/SquareInventoryProjectionExecutionResult.php`
- `apps/wordpress-plugin/src/Square/SquareInventoryProjectionExecutor.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandlerFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/src/Admin/InventoryWorkspacePresenter.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventoryProjectionExecutorTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryWorkspacePresenterTest.php`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Projection execution coverage for sync request audit metadata.
- Projection execution coverage proving production request context rejects
  before Square writer callbacks can run.
- Inventory dependency/admin readiness coverage for sync request planner
  visibility.

### Tests Run

- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Square\SquareInventoryProjectionExecutionResult.php src\Square\SquareInventoryProjectionExecutor.php src\Api\V1\InventoryIntakeRouteHandlerFactory.php src\Api\V1\InventoryRouteDependencyFactory.php src\Api\V1\InventoryRouteDependencyStatusPresenter.php src\Admin\InventoryWorkspacePresenter.php`
  from `apps/wordpress-plugin`: passed after PHPCBF alignment cleanup.
- `php tests\run.php --filter SquareInventoryProjectionExecutorTest` from
  `apps/wordpress-plugin`: passed; the local runner executed the full 791-test
  suite.
- `php tests\run.php --filter InventoryRouteDependencyFactoryTest` from
  `apps/wordpress-plugin`: passed; the local runner executed the full 791-test
  suite.
- `php tests\run.php --filter InventoryWorkspacePresenterTest` from
  `apps/wordpress-plugin`: passed; the local runner executed the full 791-test
  suite.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets` from repository root: passed.
- `git diff --check` from repository root: passed.

### Rollback Notes

- Revert this revision to remove Square sync request planner visibility from
  projection execution and inventory dependency/admin status.
- No schema rollback or provider cleanup is required because no database
  migrations, provider writes, or network calls were added.

## 2026-06-07 - Square Inventory PHP Request Planner

### What Changed

- Added a WordPress PHP `SquareInventorySyncRequestPlanner`.
- Added a `SquareInventorySyncRequestPlan` result object with audit payloads,
  idempotency keys, external Square object IDs, SKU extraction, and payment
  delegation metadata.
- Converted Square projection plans into sandbox-only Catalog batch-upsert and
  Inventory batch-change request envelopes without calling Square.
- Tightened Square credential planning in both PHP and the API-client adapter
  so sandbox-declared credentials are accepted for planning while production
  environments, production-declared credentials, and live-looking markers are
  rejected.
- Updated API-client docs, Payments/POS docs, testing docs, changelog, and
  revision notes.

### Why

Square POS inventory sync needs a WordPress-side request boundary before any
future staging connector can make sandbox calls. This revision gives staging
reviewers the exact Square request envelopes and audit metadata while keeping
provider network writes, production credentials, and Square payment capture out
of the custom plugin.

### Files Affected

- `apps/wordpress-plugin/src/Square/SquareInventorySyncRequestPlan.php`
- `apps/wordpress-plugin/src/Square/SquareInventorySyncRequestPlanner.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventorySyncRequestPlannerTest.php`
- `packages/api-client/README.md`
- `packages/api-client/src/squareInventoryAdapter.mjs`
- `packages/api-client/tests/square-inventory-adapter.md`
- `packages/api-client/tests/square-inventory-adapter.mjs`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- PHP unit coverage for ready, skipped, failed, zero-count mapped, sandbox
  credential, production-declared credential, idempotency, external ID, and
  audit/delegation Square inventory sync request planning.
- API-client adapter coverage for sandbox-declared credential planning and
  production-declared credential rejection.

### Tests Run

- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Square\SquareInventorySyncRequestPlan.php src\Square\SquareInventorySyncRequestPlanner.php`
  from `apps/wordpress-plugin`: passed.
- `php tests\run.php --filter SquareInventorySyncRequestPlannerTest` from
  `apps/wordpress-plugin`: passed; the local runner executed the full 790-test
  suite.
- `npm.cmd run test:api-client` from repository root: passed.

### Rollback Notes

- Revert this revision to remove the WordPress PHP Square request planner and
  the refined API-client credential guard.
- No schema rollback or Square cleanup is required because no database
  migrations, provider writes, or network calls were added.

## 2026-06-07 - Square Inventory API Client Adapter Contract

### What Changed

- Added an executable API-client Square inventory adapter module.
- Added sandbox-safe request planning for Square Catalog batch upsert and
  Inventory batch change operations from plugin projection contracts.
- Added production-environment and live-looking credential rejection in the
  adapter contract.
- Added reconciliation-only Square POS event mapping back to serialized
  inventory IDs, with unmapped provider lines producing staff-review conflicts.
- Wired the adapter test into the root `npm run test` flow.
- Updated API-client, Payments/POS, testing, changelog, and revision docs.

### Why

Square POS should be able to pull/sync inventory from the platform, but the
project still needs a sandbox-only contract before any live Square API call is
enabled. This revision creates the executable adapter boundary that future
staging tests can use without allowing production credentials or provider
network writes.

### Files Affected

- `package.json`
- `packages/api-client/README.md`
- `packages/api-client/src/squareInventoryAdapter.mjs`
- `packages/api-client/tests/square-inventory-adapter.md`
- `packages/api-client/tests/square-inventory-adapter.mjs`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- API-client Square inventory adapter tests for sandbox request planning,
  production/live credential rejection, skipped projections, reconciliation
  mapping, and unmapped-line conflicts.

### Tests Run

- `npm.cmd run test:api-client` from repository root: passed.

### Rollback Notes

- Revert this revision to remove the API-client Square inventory adapter and
  root test wiring.
- No schema rollback is required.

## 2026-06-07 - Square Payment Delegation Policy Surfaces

### What Changed

- Added a reusable PHP `SquarePaymentDelegationPolicy` that declares the
  official WooCommerce Square extension as the Square payment capture, refund,
  and gateway authority.
- Reused the policy from Square inventory projection contracts and execution
  audit payloads.
- Exposed the policy in POS/payment route readiness and dependency health
  payloads.
- Added an Inventory admin workspace row showing that Square payments are
  delegated while this platform syncs serialized inventory only.
- Added unit coverage for the policy, projection contracts, POS/payment
  readiness/dependency payloads, and admin workspace row.

### Why

The platform should let Square POS pull/sync inventory from the card
management source of truth, but the custom plugin should not become a Square
payment gateway. This revision makes that boundary reusable and visible in the
places staff/admin and staging reviewers inspect.

### Files Affected

- `apps/wordpress-plugin/src/Square/SquarePaymentDelegationPolicy.php`
- `apps/wordpress-plugin/src/Square/SquareInventoryProjectionPlan.php`
- `apps/wordpress-plugin/src/Square/SquareInventoryProjectionExecutionResult.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/src/Admin/InventoryWorkspacePresenter.php`
- `apps/wordpress-plugin/tests/Unit/SquarePaymentDelegationPolicyTest.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventoryProjectionPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventoryProjectionExecutorTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessStatusPresenterTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryWorkspacePresenterTest.php`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Direct policy coverage for official WooCommerce Square payment delegation.
- Projection contract coverage for payment authority and inventory-only sync
  scope.
- POS/payment readiness and dependency payload assertions for disallowed custom
  Square capture/custom gateway behavior.
- Inventory workspace assertion for the visible Square payments delegation row.

### Tests Run

- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Square\SquarePaymentDelegationPolicy.php src\Square\SquareInventoryProjectionExecutionResult.php src\Square\SquareInventoryProjectionPlan.php src\Api\V1\PosPaymentRouteReadinessPlanner.php src\Api\V1\PosPaymentRouteDependencyFactory.php src\Api\V1\PosPaymentRouteReadinessStatusPresenter.php src\Api\V1\PosPaymentRouteDependencyStatusPresenter.php src\Admin\InventoryWorkspacePresenter.php`
  from `apps/wordpress-plugin`: passed after PHPCBF array alignment cleanup.
- `php tests\run.php --filter SquarePaymentDelegationPolicyTest` from
  `apps/wordpress-plugin`: passed; the local runner executed the full 785-test
  suite.
- `git diff --check` from repository root: passed.

### Rollback Notes

- Revert this revision to remove the reusable PHP policy and the health/admin
  visibility for Square payment delegation.
- No schema rollback is required.

## 2026-06-07 - Square Payment Delegation Boundary

### What Changed

- Added explicit Square payment delegation fields to Square inventory
  projection execution audit payloads.
- Added unit assertions proving the platform does not allow custom Square
  payment capture through the inventory projection path.
- Added shared POS validation policy for Square payment delegation to the
  official WooCommerce Square extension.
- Added POS validation coverage proving payment capture, refund execution, and
  custom gateway capture stay disallowed while inventory sync/reconciliation
  remain allowed.

### Why

Square should pull/sync inventory from the card-management source of truth, but
online payment capture should remain with the official WooCommerce Square
extension. This revision makes that boundary explicit in code and tests.

### Files Affected

- `apps/wordpress-plugin/src/Square/SquareInventoryProjectionExecutionResult.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventoryProjectionExecutorTest.php`
- `packages/validation/src/posPaymentPolicy.mjs`
- `packages/validation/tests/pos-payment-policy.mjs`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Square inventory projection executor assertions for payment authority
  delegation and disallowed plugin Square payment capture.
- Shared POS validation coverage for official WooCommerce Square payment
  delegation.

### Tests Run

- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Square\SquareInventoryProjectionExecutionResult.php`
  from `apps/wordpress-plugin`: passed after PHPCBF alignment cleanup.
- `php tests\run.php --filter SquareInventoryProjectionExecutorTest` from
  `apps/wordpress-plugin`: passed; the local runner executed the full 784-test
  suite.
- `npm.cmd run test:pos-payments` from repository root: passed.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets` from repository root: passed.
- `git diff --check` from repository root: passed.

### Rollback Notes

- Revert this revision to remove explicit Square payment delegation metadata
  and shared POS delegation policy coverage.
- No schema rollback is required.

## 2026-06-07 - Offline App Tauri Queue Command Scaffold

### What Changed

- Added a Tauri `queue_offline_operation` command scaffold that validates
  staged inventory operation envelopes and returns an audit-safe local queue
  response.
- Added Rust serde dependencies for command payload validation.
- Added frontend Tauri runtime detection and an adapter that invokes the queue
  command only when the app is running inside Tauri.
- Added Tauri command contract coverage and wired it into root offline app and
  package-level checks.
- Updated the offline app Windows workflow to install Rust and run `cargo test`
  in the contract and manual build jobs.

### Why

The offline queue bridge now needs a real desktop command target before SQLite
write implementation begins. This scaffold validates the handoff shape without
performing database or network writes.

### Files Affected

- `.github/workflows/offline-app-windows.yml`
- `apps/offline-app/README.md`
- `apps/offline-app/package.json`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src-tauri/Cargo.toml`
- `apps/offline-app/src-tauri/src/lib.rs`
- `apps/offline-app/src/data/tauriQueueAdapter.ts`
- `apps/offline-app/tests/queue-bridge-contract.mjs`
- `apps/offline-app/tests/tauri-command-contract.mjs`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `package.json`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Rust unit tests for valid queue command payloads, invalid payload JSON, and
  unsupported operation types.
- Contract coverage for Rust command registration, serde dependencies, frontend
  Tauri adapter detection, and no direct browser storage/network markers.

### Tests Run

- `npm.cmd run build` from `apps/offline-app`: passed.
- `npm.cmd run test:package-contract` from `apps/offline-app`: passed.
- `npm.cmd run test` from repository root: passed, including 784 PHP unit
  tests, plugin bootstrap smoke, PHP lint, sync-engine, POS/payment, offline
  app, and required test matrix checks.
- `npm.cmd run verify:no-production-secrets` from repository root: passed.
- `git diff --check` from repository root: passed.
- `cargo test` from `apps/offline-app/src-tauri`: not run locally because
  `cargo` is not installed on this machine; it is now configured in the
  offline app Windows workflow.

### Rollback Notes

- Revert this revision to remove the Tauri queue command scaffold, frontend
  Tauri adapter, Rust serde dependencies, command contract coverage, and
  workflow Rust test additions.
- No schema rollback is required because the command does not write SQLite yet.

## 2026-06-07 - Offline App Queue Bridge Contract

### What Changed

- Added a browser-safe offline queue bridge that stages inventory operations
  behind a future Tauri command adapter boundary.
- Updated the React inventory workspace to submit staged inventory update
  envelopes through the bridge and render the bridge result.
- Added queue bridge contract coverage to confirm the bridge does not perform
  direct browser storage, network, or database writes.
- Wired the queue bridge contract into both root offline app checks and the
  app package contract.

### Why

The offline app needs a clean handoff from UI intent to local persistence
before the SQLite/Tauri command implementation is added. This revision creates
that boundary while keeping the current browser/dev build side-effect-free.

### Files Affected

- `apps/offline-app/README.md`
- `apps/offline-app/package.json`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineQueueBridge.ts`
- `apps/offline-app/tests/queue-bridge-contract.mjs`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `package.json`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Queue bridge contract coverage for the Tauri command boundary, preview-only
  browser behavior, and local-only safety markers.

### Tests Run

- `npm.cmd run build` from `apps/offline-app`: passed.
- `npm.cmd run test:package-contract` from `apps/offline-app`: passed.
- Mobile Playwright interaction verification against the local Vite dev
  server: passed, with no console errors or failed requests.
- `npm.cmd run test` from repository root: passed, including 784 PHP unit
  tests, plugin bootstrap smoke, PHP lint, sync-engine, POS/payment, offline
  app, and required test matrix checks.
- `npm.cmd run verify:no-production-secrets` from repository root: passed.
- `git diff --check` from repository root: passed.

### Rollback Notes

- Revert this revision to remove the queue bridge, bridge contract test, and
  UI bridge submission path.
- No schema rollback is required.

## 2026-06-07 - Offline App Local Workspace State Contract

### What Changed

- Added a typed offline app workspace state module for nav items, sync routes,
  cached inventory, queue summaries, conflicts, customer credit, and device
  sync status.
- Added a SQLite-compatible staged inventory update operation envelope builder
  that mirrors the local `operation_queue` schema fields.
- Updated the React workspace to read from the local data module and show a
  queued operation preview when staff stages an inventory update.
- Added workspace-state contract coverage and tightened the app package
  contract to run TypeScript type checking.
- Added React type packages and updated offline app CI workflows to install
  nested app dependencies before running the stricter package contract.
- Fixed mobile navigation positioning so it cannot overlap content panels.

### Why

The offline app needs to evolve from a polished shell into a standalone,
local-first tool. This revision gives the UI a typed local state boundary and
starts modeling queued inventory updates in the same envelope shape the future
SQLite push worker will persist.

### Files Affected

- `.github/workflows/offline-app-windows.yml`
- `.github/workflows/pull-request-quality-gates.yml`
- `apps/offline-app/README.md`
- `apps/offline-app/package.json`
- `apps/offline-app/package-lock.json`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/offlineWorkspace.ts`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/tests/workspace-state-contract.mjs`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `package.json`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Workspace state contract coverage for required offline sync routes,
  SQLite operation envelope fields, queued operation markers, and local-only
  safety markers.
- App package TypeScript type checking through `tsc --noEmit`.

### Tests Run

- `npm.cmd run build` from `apps/offline-app`: passed.
- `npm.cmd run test:package-contract` from `apps/offline-app`: passed.
- `npm.cmd audit` from `apps/offline-app`: passed with zero vulnerabilities.
- Desktop and mobile Playwright interaction verification against the local
  Vite dev server: passed, with no console errors or failed requests.
- `npm.cmd run test` from repository root: passed, including 784 PHP unit
  tests, plugin bootstrap smoke, PHP lint, sync-engine, POS/payment, offline
  app, and required test matrix checks.
- `npm.cmd run verify:no-production-secrets` from repository root: passed.
- `git diff --check` from repository root: passed.

### Rollback Notes

- Revert this revision to remove the typed local workspace state module,
  staged operation preview, stricter app package contract, React type packages,
  and workflow dependency-install changes.
- No schema rollback is required because the SQLite migration contract was not
  changed.

## 2026-06-07 - Offline App Inventory Command Workspace UI

### What Changed

- Replaced the placeholder offline app shell with a polished React inventory
  command workspace for staff use.
- Added scanner/search, inventory list, selected-card detail, sync queue,
  conflict review, customer credit, and device/sync health surfaces.
- Added responsive styling for desktop and mobile layouts plus a local favicon
  to keep browser verification clean.
- Added a UI shell contract test and wired it into offline app and root test
  commands.
- Refreshed the offline app Vite dependency and committed a lockfile for
  reproducible installs.

### Why

The standalone Windows app needs a usable visual baseline before live SQLite
and website sync wiring are connected. This revision creates the staff-facing
surface while keeping the app local-only and side-effect-free.

### Files Affected

- `apps/offline-app/index.html`
- `apps/offline-app/package.json`
- `apps/offline-app/package-lock.json`
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/styles.css`
- `apps/offline-app/tests/ui-shell-contract.mjs`
- `apps/offline-app/README.md`
- `package.json`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Offline app UI shell contract coverage for the inventory workspace, sync
  queue, conflict center, customer credit surface, responsive styling, and
  no-production-secret markers.

### Tests Run

- `npm.cmd run build` from `apps/offline-app`: passed.
- `npm.cmd audit` from `apps/offline-app`: passed with zero vulnerabilities.
- `npm.cmd run test:offline-app` from repository root: passed.
- Desktop and mobile Playwright screenshot verification against the local Vite
  dev server: passed after adding the local favicon.
- `npm.cmd run test` from repository root: passed, including 784 PHP unit
  tests, plugin bootstrap smoke, PHP lint, sync-engine, POS/payment, offline
  app, and required test matrix checks.
- `npm.cmd run verify:no-production-secrets` from repository root: passed.
- `git diff --check` from repository root: passed.

### Rollback Notes

- Revert this revision to restore the prior placeholder offline app shell,
  package metadata, and tests.
- No schema rollback is required because the existing SQLite migration
  contract was not changed.

## 2026-06-07 - Guarded Square Inventory Projection Execution

### What Changed

- Added a guarded Square inventory projection executor for previously planned
  catalog-object and physical-count inventory operations.
- Added an execution result contract that reports blocked, executed, rejected,
  and skipped outcomes with audit-safe metadata.
- Default execution remains blocked unless staging code explicitly enables the
  executor and injects separate catalog and inventory writer adapters.
- Payment capture remains deferred to the official WooCommerce Square
  extension; this path is POS inventory sync only.

### Why

The project needs Square POS inventory to pull from the card-management source
of truth without mixing in payment capture work. This revision creates a safe
staging handoff for Square catalog/inventory writes while preserving the
current no-live-network-writes default.

### Files Affected

- `apps/wordpress-plugin/src/Square/SquareInventoryProjectionExecutionResult.php`
- `apps/wordpress-plugin/src/Square/SquareInventoryProjectionExecutor.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventoryProjectionExecutorTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Unit coverage for default Square inventory projection execution lockout.
- Unit coverage for skipped and failed Square projection plans.
- Unit coverage for explicit catalog/inventory writer-backed staging
  execution.
- Unit coverage for writer failure rejection and audit-safe deferral metadata.

### Tests Run

- `php -l` on the new Square executor/result classes and unit test: passed.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Square\SquareInventoryProjectionExecutionResult.php src\Square\SquareInventoryProjectionExecutor.php`
  from `apps/wordpress-plugin`: passed after PHPCBF alignment cleanup.
- `php tests\run.php` from `apps/wordpress-plugin`: passed with 784 tests.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets` from repository root: passed.

### Rollback Notes

- Revert this revision to remove the guarded Square projection executor,
  execution result contract, and unit tests.
- No schema rollback or Square cleanup is required unless a future staging
  adapter has been explicitly enabled and used to write catalog/inventory
  changes.

## 2026-06-07 - Guarded WooCommerce Product Projection Execution

### What Changed

- Added a guarded WooCommerce product projection executor for previously
  planned exact-card product operations.
- Added an execution result contract that reports blocked, executed, rejected,
  and skipped outcomes with audit-safe metadata.
- Default execution remains blocked unless staging code explicitly enables the
  executor and injects a product-writer adapter.
- Writer failures are caught and reported without exposing raw product payloads
  as confirmed writes.

### Why

The plugin can now plan WooCommerce product payloads for exact serialized card
inventory, but staging also needs a safe handoff point before live product
writes are allowed. This revision creates that handoff while preserving the
current no-live-writes default for local, staging review, and production.

### Files Affected

- `apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionExecutionResult.php`
- `apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionExecutor.php`
- `apps/wordpress-plugin/tests/Unit/InventoryProductProjectionExecutorTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Unit coverage for default WooCommerce projection execution lockout.
- Unit coverage for skipped and failed projection plans.
- Unit coverage for explicit writer-backed staging execution.
- Unit coverage for writer failure rejection and audit-safe deferral metadata.

### Tests Run

- `php -l` on the new WooCommerce executor/result classes and unit test:
  passed.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\WooCommerce\InventoryProductProjectionExecutionResult.php src\WooCommerce\InventoryProductProjectionExecutor.php`
  from `apps/wordpress-plugin`: passed.
- `php tests\run.php` from `apps/wordpress-plugin`: passed with 779 tests.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets` from repository root: passed.

### Rollback Notes

- Revert this revision to remove the guarded WooCommerce projection executor,
  execution result contract, and unit tests.
- No schema rollback or WooCommerce cleanup is required unless a future staging
  adapter has been explicitly enabled and used to write products.

## 2026-06-07 - Inventory Workspace Projection Planning Status

### What Changed

- Propagated WooCommerce and Square projection planner readiness from the
  staged inventory intake handler into the overall inventory dependency health
  payload.
- Added a Staff Inventory workspace readiness row that separates
  side-effect-free projection planning from still-deferred WooCommerce/Square
  external writes.
- Added a projection-contract checkpoint row for staging review before live
  external sync is enabled.
- Updated the inventory dependency admin summary to report projection planning
  readiness.

### Why

Staged inventory create responses now expose WooCommerce and Square projection
contracts, but the admin workspace still showed only deferred external writes.
Staff/admin users need to see that contract planning is ready while production
side effects remain deliberately gated.

### Files Affected

- `apps/wordpress-plugin/src/Admin/InventoryWorkspacePresenter.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/InventoryWorkspacePresenterTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteDependencyFactoryTest.php`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Unit coverage for the Staff Inventory projection-planning readiness row in
  both default-deferred and staging-ready states.
- Unit assertions that inventory dependency health propagates planner readiness
  and projection-planning deferral metadata.

### Tests Run

- `php tests\run.php` from `apps/wordpress-plugin`: passed with 774 tests.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Admin\InventoryWorkspacePresenter.php src\Api\V1\InventoryRouteDependencyFactory.php src\Api\V1\InventoryRouteDependencyStatusPresenter.php`
  from `apps/wordpress-plugin`: passed.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets` from repository root: passed.

### Rollback Notes

- Revert this revision to remove the projection-planning readiness row,
  projection-contract checkpoint, and propagated dependency summary flags.
- No schema rollback or external cleanup is required because WooCommerce,
  Square, label, and network writes remain deferred.

## 2026-06-07 - Staged Inventory Create Projection Contracts

### What Changed

- Wired side-effect-free WooCommerce product projection planning into the staged
  inventory create handler after successful database writes.
- Wired side-effect-free Square inventory projection planning into the same
  created-item response metadata.
- Added route-handler readiness metadata for WooCommerce and Square projection
  planner availability while preserving deferred external writes.
- Updated WordPress staging smoke assertions to verify created inventory
  responses expose projection contracts without executing network calls.

### Why

The card-management workflow needs to prove that a newly created exact card can
be translated into WooCommerce and Square projection intent before any live
external writes are allowed. Returning these contracts in staging responses
makes that handoff reviewable without changing production safety posture.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandlerFactory.php`
- `apps/wordpress-plugin/tests/Unit/InventoryIntakeRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-staging-inventory-smoke.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/STAGING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Unit assertions that staged inventory create responses include WooCommerce and
  Square projection contracts while external writes remain deferred.
- Staging smoke assertions that REST-backed inventory creation exposes
  projection contracts in the WordPress/WooCommerce integration environment.

### Tests Run

- `php -l` on the modified handler/factory and staging smoke script: passed.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Api\V1\InventoryIntakeRouteHandler.php src\Api\V1\InventoryIntakeRouteHandlerFactory.php`
  from `apps/wordpress-plugin`: passed.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist tests\wordpress-staging-inventory-smoke.php`
  from `apps/wordpress-plugin`: passed.
- `php tests\run.php` from `apps/wordpress-plugin`: passed with 773 tests.
- `npm.cmd run test` from repository root: passed.

### Rollback Notes

- Revert this revision to remove projection contracts from staged inventory
  create response metadata and readiness summaries.
- No schema rollback or external cleanup is required because WooCommerce,
  Square, label, and network writes remain deferred.

## 2026-06-07 - WooCommerce Product Projection Planning

### What Changed

- Added a plan-only WooCommerce inventory product projection planner and plan
  contract for exact serialized card inventory rows.
- Available visible cards now produce create/update simple-product payloads
  with SKU, price, single-stock quantity, sold-individually behavior, and
  serialized inventory metadata.
- Existing mapped products for unavailable cards now produce stockout update
  payloads while hidden/unmapped cards skip without writes.
- Added validation for card identity, barcode/SKU scan identity, sale price,
  store-currency mismatch, and serialized quantity of one.

### Why

The Pug WooCommerce plugin needs a tested bridge from the internal inventory
source of truth to WooCommerce product payloads before live WooCommerce writes
are enabled in staging. This keeps product projection deterministic while
preserving the current no-live-writes safety posture.

### Files Affected

- `apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionPlan.php`
- `apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionPlanner.php`
- `apps/wordpress-plugin/tests/Unit/InventoryProductProjectionPlannerTest.php`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.

### Tests Added

- Unit coverage for available visible product creation, mapped product updates,
  mapped unavailable stockout updates, hidden/unmapped skips, and invalid
  identity/price/currency/quantity inputs.

### Tests Run

- `php -l` on the new WooCommerce projection classes and unit test: passed.
- `php tests\run.php` from `apps/wordpress-plugin`: passed with 773 tests.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\WooCommerce\InventoryProductProjectionPlan.php src\WooCommerce\InventoryProductProjectionPlanner.php`
  from `apps/wordpress-plugin`: passed.

### Rollback Notes

- Revert this revision to remove the projection planner, plan contract, and
  unit tests.
- No schema rollback or WooCommerce data cleanup is required because this
  revision does not perform live product writes.

## 2026-06-07 - Inventory Search Benchmark Fixture

### What Changed

- Added a WP-CLI inventory search benchmark script for disposable
  WordPress integration/staging databases.
- The script requires `TCG_ALLOW_INVENTORY_SEARCH_BENCHMARK=1`, refuses
  production, verifies the current schema target, and seeds 50,000 deterministic
  disposable inventory rows.
- The benchmark exercises public visible search, staff deep pagination, and
  staff barcode lookup through the staged inventory search handler.
- Added the benchmark to the WordPress integration workflow with cleanup
  enabled after the migration rehearsal step.

### Why

Phase 2 needs an executable 50,000-item fixture before approving search and
pagination performance on GoDaddy staging. The benchmark records actual timing
baselines without inventing production pass/fail budgets before target-hosting
data exists.

### Files Affected

- `.github/workflows/wordpress-integration.yml`
- `apps/wordpress-plugin/tests/wordpress-inventory-search-benchmark.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- The benchmark creates disposable rows marked with the
  `PUG-BENCH-SEARCH` code/notes in an explicitly approved non-production
  database.

### Tests Added

- WordPress integration workflow coverage for a 50,000-row inventory search
  fixture baseline.
- Syntax/lint coverage for the new WP-CLI benchmark script.

### Tests Run

- `php -l apps/wordpress-plugin/tests/wordpress-inventory-search-benchmark.php`:
  passed.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist tests\wordpress-inventory-search-benchmark.php`
  from `apps/wordpress-plugin`: passed.
- `npm.cmd run test` from repository root: passed.

### Rollback Notes

- Revert this revision to remove the workflow benchmark step and WP-CLI script.
- No schema rollback is required for code rollback.
- If benchmark cleanup was disabled or interrupted, delete rows where
  `notes = 'PUG-BENCH-SEARCH'` and remove the matching benchmark inventory
  location from the non-production database.

## 2026-06-07 - WordPress Migration Rollback Restore Rehearsal

### What Changed

- Added a WP-CLI migration rehearsal script for disposable WordPress
  integration/staging databases.
- The script requires `TCG_ALLOW_DESTRUCTIVE_MIGRATION_REHEARSAL=1` and refuses
  to run in production.
- The rehearsal verifies the current schema target, rolls back to schema
  version `1`, checks Phase 2 inventory/pricing tables were dropped, migrates
  back to the current target, and checks those tables returned.
- Added the rehearsal as the final step in the WordPress integration workflow
  after the staging inventory smoke.

### Why

The project needs executable proof that rollback and restore are rehearsed in a
real WordPress/MySQL environment before doing the same operation on the GoDaddy
staging database.

### Files Affected

- `.github/workflows/wordpress-integration.yml`
- `apps/wordpress-plugin/tests/wordpress-migration-rehearsal.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- The new script exercises existing migrations and rollbacks only in an
  explicitly approved disposable non-production database.

### Tests Added

- WordPress integration workflow coverage for destructive rollback/restore
  rehearsal in the disposable CI database.
- Syntax/lint coverage for the new WP-CLI rehearsal script.

### Tests Run

- `php -l apps/wordpress-plugin/tests/wordpress-migration-rehearsal.php`:
  passed.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist tests\wordpress-migration-rehearsal.php`
  from `apps/wordpress-plugin`: passed.
- `npm.cmd run test` from repository root: passed.

### Rollback Notes

- Revert this revision to remove the workflow rehearsal step and WP-CLI script.
- No schema rollback is required for code rollback.
- If the rehearsal ran in a disposable database, it should already have restored
  the plugin schema back to the current target before exiting.

## 2026-06-07 - Inventory Public Read Rate Limit Gate

### What Changed

- Added a public inventory read rate-limit policy with configurable limit,
  window, clock, storage reader, and storage writer dependencies.
- Added WordPress transient-backed limiter construction for future live public
  search routes.
- Updated inventory public-read permission callbacks so public access fails
  closed when public reads are enabled without a configured limiter.
- Preserved staff/admin fallback authorization through `view_inventory` so
  staging staff search remains usable when public reads are disabled or unsafe.
- Exposed public rate-limiter readiness in inventory route dependency health
  and admin summaries.

### Why

Future public search/reference routes must not become publicly usable unless a
rate limiter is configured. Staff search still needs a capability-backed path
for staging and admin workflows while public access remains guarded.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/InventoryPublicReadRateLimitPolicy.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryPublicReadPermissionCallbackAdapter.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRoutePermissionCallbackFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/InventoryPublicReadPermissionCallbackAdapterTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteRegistrarTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- WordPress transient storage is used only when public inventory reads are
  explicitly enabled and the route graph is composed inside WordPress.

### Tests Added

- Unit coverage for missing-limiter public denial.
- Unit coverage for per-bucket public read rate-limit enforcement.
- Unit coverage for rate-limit window reset behavior.
- Unit coverage for staff fallback authorization when public reads are unsafe.
- Dependency-factory coverage proving public-read routes enabled without a
  limiter report a blocked readiness state.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 768 tests.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Api\V1\InventoryPublicReadRateLimitPolicy.php src\Api\V1\InventoryPublicReadPermissionCallbackAdapter.php src\Api\V1\InventoryRoutePermissionCallbackFactory.php src\Api\V1\InventoryRouteDependencyFactory.php src\Api\V1\InventoryRouteDependencyStatusPresenter.php`
  from `apps/wordpress-plugin`: passed.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to remove the explicit rate-limit dependency from
  inventory public-read permission callbacks.
- Confirm public inventory read settings remain disabled after rollback.
- No schema rollback is required.

## 2026-06-07 - Manager Override Persistence And Reauthentication

### What Changed

- Added explicit manager reauthentication fields to manager override requests.
- Below-minimum manager approval now requires a reauthenticated manager signal
  plus a reauthentication timestamp before the policy accepts the override.
- Manager override persistence planning now generates stable public IDs when
  callers do not provide one and records reauthentication audit metadata.
- Added a `$wpdb` repository and result object for persisting approved manager
  override rows into `tcg_manager_overrides`.

### Why

Below-minimum pricing overrides need a durable manager approval record and a
fresh-manager-auth signal before they are safe to rely on during checkout,
offline sync, or POS reconciliation work.

### Files Affected

- `apps/wordpress-plugin/src/Overrides/ManagerOverrideRequest.php`
- `apps/wordpress-plugin/src/Overrides/ManagerOverridePolicy.php`
- `apps/wordpress-plugin/src/Overrides/ManagerOverridePersistencePlanner.php`
- `apps/wordpress-plugin/src/Overrides/ManagerOverrideRepository.php`
- `apps/wordpress-plugin/src/Overrides/ManagerOverrideRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/ManagerOverridePolicyTest.php`
- `apps/wordpress-plugin/tests/Unit/ManagerOverridePersistencePlannerTest.php`
- `apps/wordpress-plugin/tests/Unit/ManagerOverrideRepositoryTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Uses the existing Phase 2 `tcg_manager_overrides` table.

### Tests Added

- Unit coverage for missing manager reauthentication and missing
  reauthentication timestamp rejection.
- Unit coverage for stable fallback manager override public IDs and
  reauthentication audit payloads.
- Unit coverage for manager override repository persistence, skipped plans,
  invalid table prefixes, invalid rows, failed inserts, and unexpected insert
  counts.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 762 tests.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Overrides\ManagerOverrideRequest.php src\Overrides\ManagerOverridePolicy.php src\Overrides\ManagerOverridePersistencePlanner.php src\Overrides\ManagerOverrideRepository.php src\Overrides\ManagerOverrideRepositoryResult.php`
  from `apps/wordpress-plugin`: passed.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to return manager override checks to reason/manager-only
  policy behavior and remove repository persistence.
- If staging test override rows were inserted, delete matching disposable
  `tcg_manager_overrides` rows by `public_id`.
- No schema rollback is required.

## 2026-06-07 - Inventory Intake Price Change Log Persistence

### What Changed

- Wrapped staged inventory intake creates in a database transaction.
- Added initial `tcg_price_change_log` persistence for every successful
  inventory create, recording new sale price, minimum price, currency, source,
  floor-hit state, actor, and intake reason.
- Repository results and REST responses now expose whether the initial price
  change log row persisted.
- The staged WordPress inventory smoke now verifies the REST-created card has
  a matching price change log row.

### Why

Staff-created cards need an audit trail from the first sale price forward
before staging intake is useful for real operations. The inventory row and
initial price log now commit together or roll back together.

### Files Affected

- `apps/wordpress-plugin/src/Inventory/InventoryIntakeRepository.php`
- `apps/wordpress-plugin/src/Inventory/InventoryIntakeRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/InventoryIntakeRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryIntakeRouteHandlerFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-staging-inventory-smoke.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Uses the existing Phase 2 `tcg_price_change_log` table.

### Tests Added

- Unit coverage proving successful inventory intake writes the initial price
  log inside a committed transaction.
- Unit coverage proving price-log insert failure rolls back the inventory
  create.
- REST route-handler coverage proving created responses expose price-log
  persistence metadata.
- Staging smoke assertions proving a REST-created inventory item has an
  initial price change log row.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 755 tests.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Inventory\InventoryIntakeRepository.php src\Inventory\InventoryIntakeRepositoryResult.php`
  from `apps/wordpress-plugin`: passed.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist tests\wordpress-staging-inventory-smoke.php`
  from `apps/wordpress-plugin`: passed.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to remove the transactional price-log write.
- If rollback is needed after staging test data was created, delete matching
  disposable `tcg_price_change_log` rows before deleting their inventory rows.
- No schema rollback is required.

## 2026-06-07 - Inventory Intake Identity Collision Guard

### What Changed

- Added a pre-insert identity lookup to the inventory intake repository for
  barcode and SKU collisions.
- The repository now returns stable `barcode_already_exists` and
  `sku_already_exists` errors before attempting an insert.
- Updated intake repository and route-handler factory tests for the additional
  preflight database read.

### Why

Staff intake needs explicit duplicate scan/SKU feedback before we rely on it in
staging. The database unique keys remain the final guard, but the service layer
now reports actionable collision errors instead of a generic insert failure.

### Files Affected

- `apps/wordpress-plugin/src/Inventory/InventoryIntakeRepository.php`
- `apps/wordpress-plugin/tests/Unit/InventoryIntakeRepositoryTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryIntakeRouteHandlerFactoryTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Existing unique keys on `barcode` and `sku` remain unchanged.

### Tests Added

- Unit coverage proving duplicate barcode/SKU rows are detected before insert.
- Unit coverage updates proving repository-backed route handlers account for
  the new identity lookup plus insert query path.

### Tests Run

- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist src\Inventory\InventoryIntakeRepository.php`
  from `apps/wordpress-plugin`: passed.
- `php tests/run.php` from `apps/wordpress-plugin`: passed, 754 tests.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to return to database-only duplicate rejection.
- No data rollback is required.

## 2026-06-07 - Inventory Admin Intake Workspace

### What Changed

- Added a gated Staff Intake panel model to the Inventory Workspace presenter.
- Added a WordPress admin Staff Intake form that posts to `POST /inventory`
  with a REST nonce and idempotency key when the staging create route is ready.
- The intake form captures game, card identity, barcode/SKU, location, pricing,
  status, raw/graded condition, and channel visibility fields.
- The admin result panel reports created inventory identity while keeping
  WooCommerce projection, Square projection, POS side effects, and labels
  deferred.

### Why

The staging create route needs a staff-facing workflow before it can be tested
comfortably on the GoDaddy staging site. This gives staff a controlled admin
intake surface while retaining the runtime gates that keep production and
external systems locked.

### Files Affected

- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/src/Admin/InventoryWorkspacePresenter.php`
- `apps/wordpress-plugin/tests/Unit/InventoryWorkspacePresenterTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Admin intake uses the existing staged `POST /inventory` route and only writes
  when the staging feature flag and create runtime gate are enabled.

### Tests Added

- Unit coverage for the locked default Staff Intake panel and sanitized form
  defaults.
- Unit coverage for the ready staging Staff Intake panel and route metadata.

### Tests Run

- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist
  src\Admin\AdminMenu.php src\Admin\InventoryWorkspacePresenter.php` from
  `apps/wordpress-plugin`: passed.
- `php tests/run.php` from `apps/wordpress-plugin`: passed, 753 tests.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to remove the admin intake form and presenter model.
- Disable the staff create runtime checkbox to lock admin intake without code
  rollback.
- No production data rollback is required because production route availability
  remains disabled by default.

## 2026-06-07 - Inventory Staff Create Runtime Gate

### What Changed

- Added a separate staff inventory create runtime gate for staging/local
  environments.
- Updated inventory route contract configuration so only `POST /inventory`
  becomes registerable and write-ready when the create gate is explicitly
  enabled.
- Kept `/inventory/search` reads, `/inventory` creates, public reads,
  WooCommerce projection, Square projection, and label printing on separate
  deferral flags.
- Updated the WordPress settings UI with a staging create-route checkbox.
- Expanded the WordPress staging inventory smoke script to create a disposable
  Bulbasaur inventory row through REST, search it back, and confirm Square,
  WooCommerce, POS, public reads, and label side effects remain deferred.

### Why

Staging needs a controlled first write path for staff card intake before the
larger inventory workflow can move into admin UX and Square/WooCommerce
projection work. This keeps production defaults locked while proving the REST
create path can safely write to the disposable staging database.

### Files Affected

- `.github/workflows/wordpress-integration.yml`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteRuntimeConfigurator.php`
- `apps/wordpress-plugin/src/Settings/InventoryRouteRuntimeSettings.php`
- `apps/wordpress-plugin/src/Settings/SettingsPage.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteRuntimeConfiguratorTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteRuntimeSettingsTest.php`
- `apps/wordpress-plugin/tests/Unit/SettingsTest.php`
- `apps/wordpress-plugin/tests/wordpress-staging-inventory-smoke.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- The new create smoke writes only to the disposable staging/integration
  database after the staging feature flag and explicit create runtime gate are
  enabled.

### Tests Added

- Unit coverage for staff create runtime setting sanitization and default
  lockout.
- Unit coverage proving the create gate clears only `POST /inventory` route
  registration and write deferrals.
- Dependency factory coverage proving the staff create route registers only
  when handlers, permissions, and the runtime gate are ready.
- WordPress staging smoke coverage for REST inventory create plus follow-up
  staff search of the created row.

### Tests Run

- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 504 PHP files.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist
  src\Settings\InventoryRouteRuntimeSettings.php
  src\Api\V1\InventoryRouteRuntimeConfigurator.php
  src\Api\V1\InventoryRouteDependencyFactory.php
  src\Settings\SettingsPage.php tests\wordpress-staging-inventory-smoke.php`:
  passed.
- `php tests/run.php` from `apps/wordpress-plugin`: passed, 751 tests.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Disable the staff create runtime checkbox or revert this revision to relock
  `POST /inventory`.
- No production data rollback is required because the route stays production
  unavailable by default.
- If needed in a disposable staging database, delete rows with SKU/barcode
  `PUG-STAGE-PKM-BULBA-001`.

## 2026-06-07 - Seeded Inventory Staging Smoke

### What Changed

- Updated the WordPress staging inventory smoke test to seed a deterministic
  disposable inventory location and one Pokemon inventory row.
- The smoke test now searches for the seeded card through
  `/tcg-store/v1/inventory/search` and verifies staff-only fields, normalized
  pricing, and result metadata.
- The seed remains scoped to the disposable GitHub Actions WordPress/MySQL
  integration site.

### Why

Staging search needs to be proven against actual inventory data, not only an
empty table. This gives the admin search UI and REST route a concrete seeded
card to validate before real staging data is used.

### Files Affected

- `apps/wordpress-plugin/tests/wordpress-staging-inventory-smoke.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Seeded rows are created only during the disposable staging smoke script.

### Tests Added

- WordPress staging smoke assertions for a seeded location and seeded inventory
  item.
- WordPress staging smoke assertions that staff inventory search returns the
  seeded card and exposes staff SKU data.

### Tests Run

- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 504 PHP files.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist
  tests\wordpress-staging-inventory-smoke.php`: passed.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to return the staging smoke to empty-table verification.
- No database rollback is required outside the disposable integration database.

## 2026-06-07 - Inventory Admin Search Workspace

### What Changed

- Added a staff search panel model to the Inventory Workspace presenter with
  staging-readiness detection, safe filter sanitization, route metadata, status
  options, sort options, and page-size choices.
- Added a WordPress admin Inventory Workspace search form and REST-backed
  results panel that calls `/tcg-store/v1/inventory/search` only when the
  staging route is ready.
- The admin search surface stays visibly locked when the feature flag, route
  runtime gate, or route handler dependencies are not ready.
- The results panel keeps search read-only and displays staff fields while
  writes, WooCommerce projection, Square projection, labels, and POS ingestion
  remain deferred.

### Why

Staff need a concrete inventory workflow surface before staging acceptance can
be meaningful. This revision turns the diagnostics-only Inventory Workspace
into a controlled search shell while preserving default production lockout.

### Files Affected

- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/src/Admin/InventoryWorkspacePresenter.php`
- `apps/wordpress-plugin/tests/Unit/InventoryWorkspacePresenterTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- No write routes, WooCommerce projection, Square projection, POS ingestion, or
  public inventory reads were enabled.

### Tests Added

- Unit coverage for the Inventory Workspace search panel locked/default state.
- Unit coverage for staging-ready staff search state and sanitized filter
  values.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 748 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 504 PHP files.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist` on touched admin source
  files: passed.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to remove the admin search form and search panel model.
- No database rollback is required.

## 2026-06-07 - Inventory Staging Search Smoke

### What Changed

- Added a WordPress staging inventory smoke script that verifies
  `/tcg-store/v1/inventory/search` can register in a staging environment when
  the inventory/pricing feature flag and staff search runtime gate are enabled.
- The smoke script performs an actual REST request against the staff inventory
  search route and confirms the disposable integration inventory is empty.
- The smoke script asserts inventory writes, POS event ingestion, WooCommerce
  projection, Square projection, and public inventory reads remain disabled or
  deferred.
- Updated the WordPress integration GitHub Actions workflow to run the existing
  production-default smoke test first, then enable staging search gates and run
  the staging inventory smoke test.

### Why

The project needs proof that the staging path can open a safe read-only staff
inventory route without changing production defaults or enabling write-side
behavior. This gives us a CI-backed gate before using the GoDaddy staging site.

### Files Affected

- `.github/workflows/wordpress-integration.yml`
- `apps/wordpress-plugin/tests/wordpress-staging-inventory-smoke.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- The workflow uses a disposable WordPress/MySQL integration site and does not
  touch production or the GoDaddy staging database.

### Tests Added

- WordPress integration smoke coverage for staging-only staff inventory search
  route registration and execution.
- Assertions that staging search keeps inventory creation, POS ingestion,
  WooCommerce projection, Square projection, and public inventory reads closed.

### Tests Run

- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 504 PHP files.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist
  tests\wordpress-staging-inventory-smoke.php`: passed.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.
- The new WordPress staging inventory smoke is wired into GitHub Actions and is
  intended to run inside the disposable WordPress/MySQL integration job.

### Rollback Notes

- Revert this revision to remove the staging smoke script and GitHub Actions
  staging inventory smoke step.
- No database rollback is required.

## 2026-06-07 - Inventory Feature Flag Staging Availability

### What Changed

- Added environment-aware feature flag availability so future modules can be
  available outside production without becoming production-available.
- Made `inventory_pricing` available only for `local`, `development`, and
  `staging` environments while it remains unavailable in `production`.
- Updated feature flag sanitization, admin module status, settings UI, and
  authenticated health output to use runtime environment availability.
- Kept the default inventory/pricing flag value disabled, so staging still
  requires an explicit staff/admin enablement step before routes can register.

### Why

Staging needs to turn on the inventory/pricing module for controlled staff
search testing, but production must remain locked until manual deployment
approval and post-staging acceptance. This revision creates that separation.

### Files Affected

- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/FeatureFlags/FeatureFlagRegistry.php`
- `apps/wordpress-plugin/src/FeatureFlags/FeatureFlags.php`
- `apps/wordpress-plugin/src/Settings/SettingsPage.php`
- `apps/wordpress-plugin/tests/Unit/FeatureFlagsTest.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Production still reports `inventory_pricing` as unavailable, and no inventory
  routes are enabled by default.

### Tests Added

- Unit coverage proving `inventory_pricing` is available in local,
  development, and staging environments only.
- Unit coverage proving unavailable modules are sanitized off in production
  while inventory/pricing can be retained for staging settings.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 746 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 503 PHP files.
- `vendor\bin\phpcs.bat --standard=phpcs.xml.dist` on touched PHP files:
  passed.
- `npm.cmd run test` from repository root: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `git diff --check`: passed, with normal Windows line-ending warnings only.

### Rollback Notes

- Revert this revision to return `inventory_pricing` to globally unavailable.
- No database rollback is required. If staging enabled `inventory_pricing`,
  disable it or set `WP_ENVIRONMENT_TYPE=production` before rollback.

## 2026-06-07 - Inventory Staff Search Runtime Gates

### What Changed

- Added sanitized inventory route runtime settings for staff search and public
  search gates, both disabled by default.
- Added `InventoryRouteRuntimeConfigurator` to clear only the
  `/inventory/search` route registration/read deferrals when staff search is
  explicitly enabled.
- Wired the settings-aware inventory route dependency factory into WordPress
  admin, authenticated health output, and the `rest_api_init` bootstrapper.
- Kept the `inventory_pricing` feature flag unavailable by default, so runtime
  settings alone cannot open live production routes.
- Added Settings UI checkboxes for staging route gates.

### Why

Staging needs a controlled path to exercise staff inventory search before any
write routes, public search, WooCommerce projection, Square projection, or
label actions are enabled. This revision adds that path while preserving the
default locked install state.

### Files Affected

- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteRegistrationPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteRuntimeConfigurator.php`
- `apps/wordpress-plugin/src/Bootstrap/Plugin.php`
- `apps/wordpress-plugin/src/Settings/InventoryRouteRuntimeSettings.php`
- `apps/wordpress-plugin/src/Settings/Settings.php`
- `apps/wordpress-plugin/src/Settings/SettingsPage.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteRuntimeConfiguratorTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteRuntimeSettingsTest.php`
- `apps/wordpress-plugin/tests/Unit/SettingsTest.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- No write routes, public reads, WooCommerce writes, Square writes, or label
  print actions were enabled by default.

### Tests Added

- Unit coverage for inventory route runtime settings sanitization.
- Unit coverage for route contract configuration of the staging staff search
  route.
- Unit coverage proving the staff search route can register only when the
  runtime contract, handler, and permission dependencies are explicitly ready.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 744 tests.

### Rollback Notes

- Revert this revision to remove the runtime route settings, settings UI, and
  settings-aware inventory route composition path.
- No database rollback is required. Disable the staff search runtime checkbox
  before rollback if it was enabled on staging.

## 2026-06-07 - Inventory Admin Workspace

### What Changed

- Added an Inventory submenu under the TCG Store WordPress admin menu for staff
  users with `view_inventory`.
- Added a dependency-free `InventoryWorkspacePresenter` that renders readiness,
  route contract, and next-checkpoint rows from the existing inventory bootstrap
  and dependency health payloads.
- Kept the workspace read-only and status-focused while live inventory route
  registration, route-connected reads, route-connected writes, WooCommerce
  projection, Square projection, and label actions remain deferred.
- Added unit coverage for the default safe workspace state.

### Why

Staff and staging reviewers need a real admin surface to inspect inventory
readiness before live routes are enabled. This revision makes the staged route
graph visible in WordPress admin without changing the current safety posture.

### Files Affected

- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/src/Admin/InventoryWorkspacePresenter.php`
- `apps/wordpress-plugin/tests/Unit/InventoryWorkspacePresenterTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- No live inventory routes, database writes, Square writes, WooCommerce writes,
  or label-print actions were enabled.

### Tests Added

- Unit tests for inventory admin readiness rows, route contract rows, and
  default pending checkpoint rows.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 737 tests.

### Rollback Notes

- Revert this revision to remove the Inventory admin submenu and pure workspace
  presenter.
- No database rollback is required because the change is read-only admin UI and
  unit coverage.

## 2026-06-07 - Inventory Handler Factory Dependency Defaults

### What Changed

- Updated `InventoryRouteDependencyFactory` so the staged inventory search and
  intake route handler factories are part of the default dependency graph.
- Kept route-connected reads and writes disabled by default, so the default
  factory still exposes zero live controller handlers and zero registerable
  routes.
- Extended dependency-factory tests to prove the staged search/intake factories
  are ready while route execution remains deferred.

### Why

Health and admin diagnostics need to distinguish between missing composition
and intentionally deferred execution. This revision makes the WordPress
dependency graph report that search/intake factories exist and can inspect
database readiness, while preserving the route lockout until staging explicitly
enables reads or writes.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyFactory.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteDependencyFactoryTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Default live inventory route registration, route-connected reads, and
  route-connected writes remain disabled.

### Tests Added

- Unit assertions proving the default inventory dependency factory exposes
  staged search/intake handler factories while their read/write paths remain
  deferred.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 734 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 497 PHP files.

### Rollback Notes

- Revert this revision to return the default inventory dependency factory to
  reporting absent handler factories unless they are explicitly injected.
- No database rollback or route disablement is required because no migration or
  live route registration was added.

## 2026-06-07 - Inventory Route Bootstrap Wiring

### What Changed

- Added `InventoryRouteBootstrapPlanner`, `InventoryRouteBootstrapStatusPresenter`,
  and `InventoryRouteBootstrapper` for gated inventory REST route registration.
- Wired the inventory route dependency factory to compose the bootstrapper and
  registrar with injected dependencies.
- Registered the inventory bootstrapper on WordPress `rest_api_init` at
  priority `22`.
- Added authenticated health and admin System Status reporting for inventory
  route bootstrap state.
- Extended WordPress smoke coverage to verify the bootstrapper hook is present
  while inventory routes remain unregistered by default.

### Why

Inventory search and create routes need a real WordPress bootstrap path before
staging can safely enable them. This revision installs that path behind the
existing feature flag, route registration deferral, read/write deferrals,
permission gates, and handler gates.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/InventoryRouteBootstrapPlanner.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteBootstrapStatusPresenter.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteBootstrapper.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/src/Bootstrap/Plugin.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteBootstrapperTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteDependencyFactoryTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Inventory route registration remains blocked by the unavailable
  `inventory_pricing` feature flag and by per-route registration/read/write
  deferrals.
- Public inventory reads, route-connected inventory writes, WooCommerce
  projection, Square projection, barcode label printing, and production
  provider calls remain deferred.

### Tests Added

- Unit tests for blocked, gated, future-ready, and feature-disabled inventory
  bootstrap paths.
- Unit coverage proving the inventory dependency factory exposes a staged
  bootstrapper.
- WordPress smoke assertions proving the `rest_api_init` hook is registered and
  the default bootstrap plan remains blocked.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 734 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 497 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on touched source and smoke
  files: passed after auto-fixing touched-file line endings with
  `vendor/bin/phpcbf`.

### Rollback Notes

- Revert this revision to remove the inventory bootstrapper hook, bootstrap
  status payload, and related tests.
- No database rollback is required because this revision does not add or run a
  migration.
- No staged or production route disablement is required after rollback because
  inventory REST routes still default to unregistered.

## 2026-06-07 - Inventory Route Health And Admin Status

### What Changed

- Added inventory route dependency readiness to the authenticated health
  response under `inventory_route_dependencies`.
- Added an Inventory route dependencies row to the WordPress admin System
  Status screen.
- Extended the WordPress integration smoke script to assert that inventory
  search and create routes remain unregistered by default while their
  dependency readiness is visible.
- Added missing POS/payment dependency imports in the System Status screen
  while wiring the new inventory status row.

### Why

Staging needs to inspect inventory route readiness before live route
registration, public search, staff writes, WooCommerce projection, or Square
projection are enabled. This revision exposes that readiness in the same
health/admin surfaces already used by offline sync and POS/payment staging.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/src/Admin/AdminMenu.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Default live inventory route registration remains disabled.
- Public inventory reads, route-connected inventory writes, WooCommerce
  projection, Square projection, barcode label printing, and production
  provider calls remain deferred.

### Tests Added

- WordPress integration smoke assertions proving inventory search/create REST
  routes remain unregistered by default.
- WordPress integration smoke assertions proving authenticated health exposes
  blocked inventory route dependency readiness by default.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 729 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 493 PHP files.

### Rollback Notes

- Revert this revision to remove inventory route dependency status from
  authenticated health, admin System Status, and smoke assertions.
- No database rollback is required because this revision does not add or run a
  migration.
- No route or provider disablement is required after rollback because live
  inventory route registration and external side effects remain disabled.

## 2026-06-07 - Inventory Route Dependency Composition

### What Changed

- Added `InventoryRouteDependencyFactory` to assemble staged inventory route
  handlers, controller dispatch, permission callbacks, registration planning,
  and registrar wiring.
- Added `InventoryRouteDependencyStatusPresenter` to expose health/admin-ready
  dependency summaries for inventory route readiness.
- Limited composed handlers to the staged route callbacks that currently exist:
  `search_inventory_items` and `create_inventory_item`.
- Kept all other inventory callbacks fail-closed until their handlers and
  permission models are implemented.

### Why

The inventory route registration layer needs a composition boundary before it
can be used by health checks, staging smoke tests, or future bootstrap wiring.
This revision lets the system report exactly which inventory route dependencies
are ready without enabling live routes, public reads, staff writes,
WooCommerce projection, Square projection, or label printing.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyStatusPresenter.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteDependencyFactoryTest.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Existing inventory schema version remains unchanged.
- Default live route registration, public inventory reads, route-connected
  writes, barcode label printing, WooCommerce projection, Square provider
  writes, and offline sync writes remain deferred.

### Tests Added

- Default dependency summary tests proving the factory reports blocked route
  handlers, permission callbacks, and public-read settings.
- Configured dependency summary tests proving staged search/create handlers,
  permission callbacks, and registrar construction are assembled.
- Controller dispatch tests proving injected search/create handlers receive
  normalized REST request data while unsupported routes fail closed.
- Registrar handoff tests proving future-ready inventory search routes use the
  injected route registrar callback.
- Status presenter tests for blocked health payloads and ready admin summaries.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 729 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 493 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on the two new inventory
  dependency source files: passed after auto-fixing alignment with
  `vendor/bin/phpcbf`.
- `npm.cmd run test` from the repository root: passed.
- `npm.cmd run verify:no-production-secrets` from the repository root: passed.
- `git diff --check`: passed with only normal Windows line-ending warnings.

### Rollback Notes

- Revert this revision to remove inventory route dependency composition,
  readiness presentation, and tests.
- No database rollback is required because this revision does not add or run a
  migration.
- No staged or production route disablement is required after rollback because
  default live route registration remains disabled.
- No production rollback applies because public reads, inventory writes,
  WooCommerce projection, Square network calls, barcode label printing, and
  offline sync mutation remain disabled.

## 2026-06-07 - Inventory Route Registration Gating

### What Changed

- Added a fail-closed `InventoryController` with explicit handler dispatch for
  all planned inventory and search callbacks.
- Added inventory permission callback adapters for capability-based staff
  routes and explicitly enabled public-read routes.
- Added `InventoryRoutePermissionCallbackFactory` to map route contracts to
  permission callbacks without exposing public reads by default.
- Added `InventoryRouteRegistrationPlanner` and `InventoryRouteRegistrar` so
  future inventory routes register only when the route is live-enabled, route
  registration deferral is cleared, read/write deferrals are cleared, a
  permission callback is ready, and a controller handler is injected.

### Why

The plugin needs a controlled path from tested inventory search/intake handlers
to usable WordPress REST routes. This revision creates the gated registration
layer for staging without changing production defaults or enabling public
search, staff writes, label printing, WooCommerce projection, or Square
projection.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/InventoryCapabilityPermissionCallbackAdapter.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryController.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryPublicReadPermissionCallbackAdapter.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRoutePermissionCallbackFactory.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteRegistrar.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryRouteRegistrationPlanner.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteRegistrarTest.php`
- `apps/wordpress-plugin/tests/Unit/InventoryRouteRegistrationPlannerTest.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Existing inventory schema version remains unchanged.
- Default live route registration, public inventory reads, route-connected
  writes, barcode label printing, WooCommerce projection, Square provider
  writes, and offline sync writes remain deferred.

### Tests Added

- Planner tests proving all inventory routes remain disabled without configured
  permission callbacks and injected controller handlers.
- Permission-factory tests for capability routes and explicitly enabled
  public-read routes.
- Controller dispatch tests proving injected handlers receive normalized REST
  request data while missing handlers fail closed.
- Registrar tests proving default routes do not register, future search routes
  require public-read/read gates, future create routes require write-gate
  clearing, and device/owner permission routes stay locked until dedicated
  permission callbacks exist.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 723 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 490 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on the six new inventory route
  source files: passed after auto-fixing alignment with `vendor/bin/phpcbf`.
- `npm.cmd run test` from the repository root: passed.
- `npm.cmd run verify:no-production-secrets` from the repository root: passed.
- `git diff --check`: passed with only normal Windows line-ending warnings.

### Rollback Notes

- Revert this revision to remove the gated inventory route controller,
  permission callbacks, registration planner, registrar, and tests.
- No database rollback is required because this revision does not add or run a
  migration.
- No staged or production route disablement is required after rollback because
  default live route registration remains disabled.
- No production rollback applies because public reads, inventory writes,
  WooCommerce projection, Square network calls, barcode label printing, and
  offline sync mutation remain disabled.

## 2026-06-07 - Inventory Intake Route Handler Factory

### What Changed

- Added `InventoryIntakeRouteHandler` to orchestrate inventory intake request
  parsing, persistence planning, repository execution, and created-item
  responses for the planned `create_inventory_item` callback.
- Added `InventoryIntakeRouteHandlerFactory` to compose the staged handler from
  an explicitly injected database provider only when route-connected writes are
  enabled.
- Added readiness summaries for parser, planner, repository, database provider,
  table prefix validation, default route-registration deferral,
  WooCommerce/Square projection deferral, and label-print deferral.
- Added fail-closed response envelopes for invalid payloads, invalid
  persistence plans, and repository rejections before any default live route is
  registered.

### Why

The admin card-management UI and offline intake flow both need a single
route-level creation boundary before live route registration can be safely
enabled. This revision proves the staged `POST /inventory` orchestration path
with injected dependencies while keeping production/staging route wiring,
WooCommerce projection, Square projection, and label printing gated.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandlerFactory.php`
- `apps/wordpress-plugin/tests/Unit/InventoryIntakeRouteHandlerFactoryTest.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Existing inventory schema version remains unchanged.
- Default live `POST /inventory` route registration, barcode label printing,
  WooCommerce projection, Square provider writes, and offline sync writes
  remain deferred.

### Tests Added

- Route-handler success tests for parser/planner/repository orchestration and
  created-item response payloads.
- Invalid-payload tests proving bad intake bodies short-circuit before
  repository writes.
- Repository rejection tests proving failed staged inserts map to stable
  rejected responses.
- Factory tests proving default route-connected writes remain deferred and
  explicitly enabled handlers report database provider and table-prefix issues.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 711 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 482 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on the two new route source
  files: passed after auto-fixing alignment with `vendor/bin/phpcbf`.
- `npm.cmd run test` from the repository root: passed.
- `npm.cmd run verify:no-production-secrets` from the repository root: passed.
- `git diff --check`: passed with only normal Windows line-ending warnings.

### Rollback Notes

- Revert this revision to remove the staged inventory intake route handler,
  factory, and tests.
- No database rollback is required because this revision does not add or run a
  migration.
- If the handler was explicitly invoked in staging before rollback, delete only
  the test inventory rows created by that staging run after confirming they are
  not linked to reservations, orders, POS events, or offline sync rows.
- No production rollback applies because default route registration,
  WooCommerce projection, Square network calls, barcode label printing, and
  offline sync mutation remain disabled.

## 2026-06-07 - Inventory Intake Repository Adapter

### What Changed

- Added `InventoryIntakeRepository` and `InventoryIntakeRepositoryResult` to
  execute staged intake insert plans through an explicitly injected `$wpdb`
  adapter.
- Added invalid-plan short-circuiting, active WordPress table-prefix validation,
  prepared insert execution, insert ID capture, and exact insert-count outcome
  handling.
- Added created-item response payloads with inventory ID, public ID, barcode,
  SKU, status, and row version.
- Added repository audit metadata for insert status, rows affected, insert ID,
  response public ID, persistence plan audit, route/write deferrals,
  WooCommerce/Square projection deferrals, and label-print deferral.

### Why

The card management write path now has a tested persistence plan, but future
staff/admin intake and offline intake also need a repository boundary that can
execute that plan safely in controlled staging tests. This revision makes the
database insert adapter reviewable while keeping live route registration and
projection side effects disabled.

### Files Affected

- `apps/wordpress-plugin/src/Inventory/InventoryIntakeRepository.php`
- `apps/wordpress-plugin/src/Inventory/InventoryIntakeRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/InventoryIntakeRepositoryTest.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Existing inventory schema version remains unchanged.
- Live `POST /inventory` route registration, barcode label printing,
  WooCommerce projection, Square provider writes, and offline sync writes
  remain deferred.

### Tests Added

- Repository insert tests for prepared `$wpdb` execution, insert ID capture,
  created-item response payloads, and redacted audit output.
- Invalid-plan tests proving repository writes short-circuit before SQL.
- Table-prefix mismatch tests proving staged writes stay scoped to the active
  WordPress installation prefix.
- Database failure, zero-row, and unexpected-row-count rejection tests.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 705 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 479 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on the two new inventory source
  files: passed.

### Rollback Notes

- Revert this revision to remove the inventory intake repository adapter and
  tests.
- No database rollback is required because this revision does not add or run a
  migration.
- If the repository adapter was explicitly invoked in staging before rollback,
  delete only the test inventory rows created by that staging run after
  confirming they are not linked to reservations, orders, POS events, or
  offline sync rows.
- No production rollback applies because no live route registration,
  WooCommerce projection, Square network call, or offline sync mutation was
  enabled.

## 2026-06-07 - Inventory Intake Persistence Planning

### What Changed

- Added `InventoryIntakePersistencePlanner` and
  `InventoryIntakePersistencePlan` to turn accepted inventory intake requests
  into schema-aligned `tcg_inventory_items` insert rows and prepared SQL
  templates without executing database writes.
- Added deterministic public ID generation from the idempotency key and
  fallback barcode/SKU generation for pending-intake items that have not yet
  received a physical scan label.
- Added money normalization from minor units to decimal strings, timestamp
  planning for acquired/listed/sold dates, actor attribution, visibility
  fields, pricing flags, manual reference payloads, and row-version defaults.
- Added fail-closed planning errors for invalid table prefixes, missing
  idempotency keys, incomplete card identity, missing minimum prices, invalid
  sale prices, invalid currency, and invalid status.

### Why

Card management needs a write-side boundary before staff/admin intake screens,
offline intake, ScryDex imports, and future WooCommerce projection can create
inventory rows. This revision prepares and tests the database insert contract
while keeping live route registration and repository execution disabled.

### Files Affected

- `apps/wordpress-plugin/src/Inventory/InventoryIntakePersistencePlan.php`
- `apps/wordpress-plugin/src/Inventory/InventoryIntakePersistencePlanner.php`
- `apps/wordpress-plugin/tests/Unit/InventoryIntakePersistencePlannerTest.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Existing inventory schema version remains unchanged.
- Inventory repository execution, live `POST /inventory` route registration,
  barcode label printing, WooCommerce projection, Square provider writes, and
  offline sync writes remain deferred.

### Tests Added

- Intake persistence tests for available staff intake rows, prepared insert
  templates, pricing fields, visibility fields, actor fields, and listed dates.
- Pending-intake tests proving fallback barcode/SKU generation and sale-price
  defaulting to the minimum price while label printing remains deferred.
- Sold-item tests proving sold inventory receives both listed and sold
  timestamps.
- Rejection tests for unsafe table prefixes, missing idempotency, invalid
  currency, missing card identity, missing minimum price, and invalid status.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 701 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 476 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on the two new inventory source
  files: passed after formatter cleanup.

### Rollback Notes

- Revert this revision to remove inventory intake persistence planning and
  tests.
- No database rollback is required because this revision does not add or run a
  migration.
- No production rollback applies because no live route registration, inventory
  repository execution, barcode label printing, WooCommerce projection, Square
  network call, or offline sync mutation was enabled.

## 2026-06-07 - Inventory Search Route Handler Factory

### What Changed

- Added `InventorySearchRouteHandler` to orchestrate inventory search request
  parsing, query planning, repository-backed reads, and public/staff response
  presentation for the planned `search_inventory_items` callback.
- Added `InventorySearchRouteHandlerFactory` to compose the staged handler from
  `$wpdb` only when route-connected reads are explicitly enabled and the active
  WordPress table prefix is valid.
- Added route readiness metadata for request parser, query planner, repository
  adapter, database configuration, table-prefix checks, handler readiness,
  default route registration deferral, read deferral, and write deferral.
- Added fail-closed response envelopes for invalid search requests, invalid
  query plans, repository rejection, database provider failures, and invalid
  table prefixes.

### Why

The website search UI, staff/admin card tools, Square inventory projection, and
offline app need a route-level read boundary that can be tested before live
REST registration is allowed. This revision wires the existing parser,
planner, repository, and presenter together in an opt-in handler while keeping
default production routes gated.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/InventorySearchRouteHandler.php`
- `apps/wordpress-plugin/src/Api/V1/InventorySearchRouteHandlerFactory.php`
- `apps/wordpress-plugin/tests/Unit/InventorySearchRouteHandlerFactoryTest.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Existing inventory schema version remains unchanged.
- Default live route registration, inventory writes, WooCommerce projection,
  Square provider writes, and offline sync writes remain deferred.

### Tests Added

- Route handler tests for repository-backed public search responses, public
  redaction, response metadata, and selected repository audit payloads.
- Route handler tests proving invalid query payloads short-circuit before
  repository reads.
- Route handler tests for repository failure rejection.
- Factory tests for default route-connected read deferral, explicitly enabled
  repository-backed handler composition, staff-visible search responses,
  database provider failures, and invalid table prefixes.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 697 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 473 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on the two new API source
  files: passed.

### Rollback Notes

- Revert this revision to remove the staged inventory search route handler,
  handler factory, and tests.
- No database rollback is required because this revision does not add or run a
  migration.
- No production rollback applies because default route registration, inventory
  writes, WooCommerce projection, Square network calls, and offline sync
  mutations remain disabled.

## 2026-06-07 - Inventory Search Repository Adapter

### What Changed

- Added `InventorySearchRepository` and `InventorySearchRepositoryResult` to
  execute validated inventory search SQL templates through an explicitly
  injected `$wpdb` adapter.
- Added prepared `SELECT` and `COUNT` execution for inventory search result
  pages, with active table-prefix validation before any database call is made.
- Normalized repository rows into safe inventory search envelopes for public
  and staff presentation layers, including price/currency normalization,
  visibility flags, row versions, timestamps, barcode/SKU fields, and image
  metadata.
- Added rejection paths for invalid query plans, table-prefix mismatches,
  failed database calls, malformed critical row fields, and unsupported result
  shapes while keeping route-connected reads and all writes deferred.

### Why

The card management system needs an audited read adapter before the website,
admin tools, Square inventory projection, and offline sync can share the same
inventory search source of truth. This checkpoint proves repository-backed
reads can be executed and normalized in isolation without enabling live route
registration or write paths.

### Files Affected

- `apps/wordpress-plugin/src/Inventory/InventorySearchRepository.php`
- `apps/wordpress-plugin/src/Inventory/InventorySearchRepositoryResult.php`
- `apps/wordpress-plugin/tests/Unit/InventorySearchRepositoryTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Existing inventory schema version remains unchanged.
- Live inventory route registration, inventory writes, WooCommerce projection,
  Square provider writes, and offline sync writes remain deferred.

### Tests Added

- Repository fetch tests for prepared `$wpdb` select/count execution,
  normalized rows, total counts, and audit payloads.
- Invalid query-plan tests proving repository reads short-circuit before
  database access.
- Table-prefix mismatch tests proving repository execution is limited to the
  active WordPress installation prefix.
- Database failure and malformed-row tests for rejected result envelopes.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 691 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 470 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on the two new inventory source
  files: passed after formatter cleanup.

### Rollback Notes

- Revert this revision to remove the inventory search repository adapter and
  its tests.
- No database rollback is required because this revision does not add or run a
  migration.
- No production rollback applies because no live route registration, inventory
  write path, WooCommerce projection, Square network call, or offline sync
  mutation was enabled.

## 2026-06-07 - Inventory Search SQL Template Planning

### What Changed

- Added `InventorySearchQueryBuilder` and
  `InventorySearchQueryBuildPlan` to convert safe inventory search plans into
  deferred prepared SQL templates.
- Built allowlisted `SELECT` and `COUNT` templates for public, staff, hidden,
  and all inventory views, including text search, game filters, status filters,
  location filters, visibility filters, stable sort ordering, limit, and
  offset arguments.
- Added tamper rejection for invalid table names, unsupported selected columns,
  unsafe order clauses, unsupported where keys, invalid filter shapes, unsafe
  limits, and negative offsets.

### Why

The website, staff tools, Square inventory projection work, and offline sync
need repository-ready inventory reads, but live route-connected reads should
remain gated until staging can verify permissions, performance, and database
behavior. This moves the card search layer one step closer to real reads while
keeping execution deferred.

### Files Affected

- `apps/wordpress-plugin/src/Inventory/InventorySearchQueryBuildPlan.php`
- `apps/wordpress-plugin/src/Inventory/InventorySearchQueryBuilder.php`
- `apps/wordpress-plugin/tests/Unit/InventorySearchQueryBuilderTest.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- Existing inventory schema version remains unchanged.
- Inventory repository execution and live route-connected reads remain
  deferred.

### Tests Added

- Public search SQL-template tests for text/game/status/visibility filters,
  price-desc ordering, `SELECT`/`COUNT` templates, and prepare arguments.
- Staff search SQL-template tests for barcode/SKU/cert-number scan columns,
  multi-status filters, location filtering, and update-desc ordering.
- Hidden inventory SQL-template tests for visibility-only count/select queries.
- Tamper-rejection tests for unsafe tables, columns, sort clauses, where
  contracts, limits, and offsets.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 687 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 467 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on the two new inventory source
  files: passed after formatter cleanup.

### Rollback Notes

- Revert this revision to remove inventory search SQL-template planning and
  tests.
- No database rollback is required because this revision does not add or run a
  migration.
- No production rollback applies because no live route registration or database
  execution was enabled.

## 2026-06-07 - Square Inventory Projection Planning

### What Changed

- Added `SquareInventoryProjectionPlanner` and `SquareInventoryProjectionPlan`
  to convert exact serialized card inventory rows into deferred Square catalog
  and inventory payload contracts.
- Planned Square `ITEM`/`ITEM_VARIATION` catalog payloads for visible available
  cards, using store SKU/barcode scan identity, fixed pricing, location
  presence, inventory tracking flags, and bounded metadata.
- Planned Square `PHYSICAL_COUNT` inventory changes with quantity `1` for
  sellable visible cards and quantity `0` for unavailable cards that already
  have an existing Square variation mapping.
- Kept Square network requests, provider inventory writes, WooCommerce gateway
  capture, and payment capture explicitly deferred. Payments remain assigned to
  the official WooCommerce Square extension.

### Why

Square POS needs a tested way to mirror or pull sellable card inventory from
the website without making Square the source of truth for exact serialized card
state. This projection layer gives the next adapter/repository step a stable,
testable payload contract while avoiding live provider writes.

### Files Affected

- `apps/wordpress-plugin/src/Square/SquareInventoryProjectionPlan.php`
- `apps/wordpress-plugin/src/Square/SquareInventoryProjectionPlanner.php`
- `apps/wordpress-plugin/tests/Unit/SquareInventoryProjectionPlannerTest.php`
- `docs/CHANGELOG.md`
- `docs/PAYMENTS_POS.md`
- `docs/ROADMAP.md`
- `REVISION_LOG.md`

### Migrations Added

- No database migrations were added.
- No Square credentials, provider tables, or live network calls were added.
- Existing POS/payment schema remains unchanged.

### Tests Added

- Square projection tests for visible available card catalog/count payloads.
- Zero-count projection tests for unavailable mapped cards.
- Skip tests for hidden unmapped cards.
- Validation tests for missing scan identity, price, currency, and Square
  location.
- Existing Square ID tests proving catalog ID resolution is not needed when
  external mappings are already known.

### Tests Run

- `php tests/run.php` from `apps/wordpress-plugin`: passed, 683 tests.
- `php tests/lint.php` from `apps/wordpress-plugin`: passed, 464 PHP files.
- `vendor/bin/phpcs --standard=phpcs.xml.dist` on the two new Square source
  files: passed after formatter cleanup.

### Rollback Notes

- Revert this revision to remove the Square inventory projection planner and
  tests.
- No database rollback is required because this revision does not add or run a
  migration.
- No provider rollback is required because no Square network calls, payment
  capture, or provider inventory writes are enabled.

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
