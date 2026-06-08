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
  and conflict badges, sync queue, conflict review, customer credit snapshot,
  active sidebar navigation, status filters, list/grid inventory modes,
  connector profile controls, WordPress connector manifest validation, and
  responsive desktop/mobile layout.
- Typed local workspace state for cached inventory, queue/conflict summaries,
  customer credit, sync routes, reusable company/site connector profiles, and
  WordPress connector manifests, plus SQLite-compatible staged operation
  envelopes, deferred REST push request plans, and response summaries for
  reconnect sync.
- Browser-safe offline queue bridge contract for staging inventory operations
  before the desktop SQLite/Tauri command adapter is connected.
- Local SQLite `operation_queue` insert planning for staged operations, with
  browser bridge and Tauri command response metadata proving the exact table,
  columns, parameter count, and deferrals before persistence is enabled.
- Tauri command scaffold for validating staged inventory, reservation, event,
  and credit operation envelopes before future SQLite persistence, with
  CI-level Rust tests planned in the offline app Windows workflow.
- Windows NSIS installer target for `.exe` artifacts.
- Manual-only GitHub Actions Windows build workflow.
- SQLite schema migration for device identity, cursors, queued operations,
  cached branding/inventory/credit/events, sync logs, and conflicts.
- Contract tests for package metadata, sync routes, branding tokens, local
  schema shape, local workspace state, queue bridge safety, UI shell markers,
  and secret safety.

The app does not yet implement live pairing, live SQLite writes, live push/pull
sync execution, printer/scanner adapters, kiosk lockdown, or signed updater
behavior. Connector profiles and manifest validation are currently local,
secret-free configuration models; real device tokens must be stored in the
desktop secure store and ScryDex/Square credentials must remain in
WordPress/server-side settings.

## Local Commands

```sh
npm install
npm run dev
npm run build
npm run typecheck
npm run test:package-contract
npm audit
npm run build:windows
```

When Rust is installed, run the desktop command tests with:

```sh
cd src-tauri
cargo test
```

`build:windows` targets `x86_64-pc-windows-msvc` and `nsis`. The expected
installer artifact is an unsigned `.exe` under:

```text
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
```

Production releases require signing, hardware acceptance, and manual deployment
approval before distribution.
