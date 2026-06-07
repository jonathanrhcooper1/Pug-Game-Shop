# Offline App

Phase 7 starts as a Tauri, React, TypeScript, and SQLite Windows app. This
folder now contains the Windows packaging foundation, metadata contract, local
schema contract, and first staff-facing inventory command workspace for the
future offline sync app.

## Current Scope

- Tauri project metadata.
- React/Vite inventory workspace with scanner/search input, selected-card
  detail panel, sync queue, conflict review, customer credit snapshot, and
  responsive desktop/mobile layout.
- Typed local workspace state for cached inventory, queue/conflict summaries,
  customer credit, sync routes, and SQLite-compatible staged operation
  envelopes.
- Windows NSIS installer target for `.exe` artifacts.
- Manual-only GitHub Actions Windows build workflow.
- SQLite schema migration for device identity, cursors, queued operations,
  cached branding/inventory/credit/events, sync logs, and conflicts.
- Contract tests for package metadata, sync routes, branding tokens, local
  schema shape, local workspace state, UI shell markers, and secret safety.

The app does not yet implement live pairing, SQLite persistence, push/pull sync,
printer/scanner adapters, kiosk lockdown, or signed updater behavior.

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

`build:windows` targets `x86_64-pc-windows-msvc` and `nsis`. The expected
installer artifact is an unsigned `.exe` under:

```text
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
```

Production releases require signing, hardware acceptance, and manual deployment
approval before distribution.
