# Offline App

Phase 7 starts as a Tauri, React, TypeScript, and SQLite Windows app. This
folder now contains the Windows packaging foundation, metadata contract, local
schema contract, and first staff-facing inventory command workspace for the
future offline sync app.

## Current Scope

- Tauri project metadata.
- React/Vite inventory command workspace with project-local Pug Game Shop crest
  artwork, desktop app-window chrome, scanner/search input, grouped offline
  sync controls, selected-card visual frame, staged inventory actions, queue
  and conflict badges, sync queue, staged conflict review, customer credit
  snapshot with staged redemption/review actions, active sidebar navigation,
  status filters, list/grid inventory modes, connector profile controls,
  multi-company connector draft editing, WordPress connector manifest
  validation, live public manifest fetching/import for reusable company
  website profiles, local preview validation, pairing-code request preview,
  credential-free pairing route preflight, connector-aware guarded inventory
  hold staging, offline event registration/waitlist staging from cached event
  snapshots, offline event check-in staging, event queue preview, profile-scoped
  local queue/session restore for multi-company use, per-company connector test
  reports, visible local queue rows,
  desktop SQLite queue restore, secret-free paired-device metadata restore,
  desktop secure-store token status reporting, guarded desktop pull/push sync
  execution summaries, exact barcode/public-ID scan targeting with
  Enter-to-stage support, customer-credit amount entry with cached-balance
  guards, event attendee/payment/check-in inputs, accepted push-result queue
  clearing, route-missing connector guidance for staging plugin activation,
  conflict-review history, print-label job
  preparation, customer-credit pending holds, and responsive desktop/mobile
  layout.
- Typed local workspace state for cached inventory, queue/conflict summaries,
  customer credit, sync routes, reusable company/site connector profiles, and
  WordPress connector manifests, plus SQLite-compatible staged operation
  envelopes for inventory, event registration, event check-in, customer
  credit, and conflict review workflows,
  deferred pairing/push request plans, per-company route/canonical inventory
  write readiness, connector test reports, local pull-refresh previews, and
  response summaries for reconnect sync.
- Browser-safe offline queue bridge contract for staging inventory, conflict,
  customer-credit, and sync-batch operations, plus a desktop Tauri command path
  that persists accepted operation envelopes into the local SQLite queue.
- Local SQLite `operation_queue` insert planning for staged operations, with
  browser bridge and Tauri command response metadata proving the exact table,
  columns, parameter count, persistence result, and remaining replay deferrals.
- Tauri command persistence for validating and writing staged inventory,
  reservation, event, and credit operation envelopes to `offline.sqlite`, with
  companion pending-operation restore and accepted-operation mark-synced
  commands plus local/CI Rust tests available through `cargo test` when the
  Windows MSVC toolchain is installed.
- Tauri desktop secure-store commands for offline device tokens, backed by the
  Windows-native `keyring` credential store in production and memory-backed
  Rust tests. The UI reports availability without returning raw tokens.
- Tauri desktop pairing command for the WordPress
  `/offline/devices/register` route. The desktop command sends the one-time
  manager pairing request, stores the returned device token in Windows secure
  storage, and returns only secret-free device/token metadata to React.
- Secret-free paired-device metadata is saved per company profile after desktop
  pairing, restored across app reloads, and refreshed with secure-store token
  presence checks when the Tauri shell is available. Raw tokens stay out of
  browser storage and are not returned to React.
- Tauri desktop sync requests can now attach the stored device token inside the
  Rust command, POST pull/push bodies to the WordPress offline routes, and
  return only sanitized status/count summaries. Browser mode remains preview
  only, production sync stays manually blocked, and raw tokens/raw response
  bodies are not returned to React.
- Windows NSIS installer target for `.exe` artifacts.
- Manual-only GitHub Actions Windows build workflow.
- SQLite schema migration for device identity, cursors, queued operations,
  cached branding/inventory/credit/events, sync logs, and conflicts.
- Contract tests for package metadata, sync routes, branding tokens, local
  schema shape, local workspace state, queue bridge safety, UI shell markers,
  and secret safety. The root offline-app test script runs TypeScript
  typechecking before these contracts.

The app now applies sanitized inventory rows, the active customer credit
account, event snapshots, and conflict snapshots from successful live desktop
pull responses into the local cache. Event walk-in registration and waitlist
requests plus attendee check-ins can be queued locally from cached event
snapshots. WordPress now has a guarded conflict resolution writeback foundation
and explicit route adapter; the desktop app can now attempt guarded live
manager conflict resolution for paired non-production connector profiles while
falling back to local queue staging when offline or deferred. Full
customer-directory cache mutation, live event check-in writeback,
printer/scanner adapters, kiosk lockdown, and signed updater behavior still
need follow-on passes.
Browser local session restore is isolated per connector profile, with a legacy
shared-session migration fallback for existing local data. Browser mode still
previews queue persistence, while the desktop Tauri command now writes accepted
operations to local SQLite, can run guarded authenticated pull/push requests
when a paired device token exists, and can clear accepted push operations from
the visible local queue while marking those accepted SQLite queue rows `synced`
so they do not restore as pending. Conflict or rejected operation IDs are
retained for staff review.
Connector profiles, draft editing, and manifest handling remain secret-free.
The app can now fetch the public WordPress connector manifest when the plugin
endpoint is installed, and the desktop shell can request pairing tokens only
through the Tauri secure-store command when the staging plugin route is
installed, active, and configured. Pairing route checks use the public
WordPress REST index and never transmit raw manager codes.
Guarded inventory holds are
staged locally and remain deferred unless a selected non-production connector
explicitly enables canonical inventory writes; real device tokens must be
stored in the desktop secure store and ScryDex/Square credentials must remain
in WordPress/server-side settings.

## Local Commands

```sh
npm install
npm run dev
npm run build
npm run typecheck
npm run test:package-contract
npm --prefix ../.. run test:offline-app:rust
npm audit
npm run build:windows
```

The root `npm run test:offline-app` command runs TypeScript checks, app
contracts, and the Tauri Rust command tests. The Rust helper also prepends the
user Cargo bin path so Windows shells that have Rustup installed but not loaded
in the current PATH can still run the command tests.

Run the desktop command tests directly with:

```sh
cd src-tauri
cargo test
```

`build:windows` targets `x86_64-pc-windows-msvc` and `nsis`. The expected
installer artifact is an unsigned `.exe` under:

```text
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
```

The Windows build script uses the repository PATH-aware helper so a user-level
Rustup install can be discovered even when the current PowerShell session did
not inherit Cargo on PATH.

Production releases require signing, hardware acceptance, and manual deployment
approval before distribution.
