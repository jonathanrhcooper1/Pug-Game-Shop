# Offline App

Phase 7 starts as a Tauri, React, TypeScript, and SQLite Windows app. This
folder now contains the Windows packaging foundation and metadata contract for
the future offline sync app.

## Current Scope

- Tauri project metadata.
- React/Vite shell.
- Windows NSIS installer target for `.exe` artifacts.
- Manual-only GitHub Actions Windows build workflow.
- SQLite schema migration for device identity, cursors, queued operations,
  cached branding/inventory/credit/events, sync logs, and conflicts.
- Contract tests for package metadata, sync routes, branding tokens, local
  schema shape, and secret safety.

The app does not yet implement live pairing, SQLite persistence, push/pull sync,
printer/scanner adapters, kiosk lockdown, or signed updater behavior.

## Local Commands

```sh
npm run test:package-contract
npm install
npm run build:windows
```

`build:windows` targets `x86_64-pc-windows-msvc` and `nsis`. The expected
installer artifact is an unsigned `.exe` under:

```text
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
```

Production releases require signing, hardware acceptance, and manual deployment
approval before distribution.
