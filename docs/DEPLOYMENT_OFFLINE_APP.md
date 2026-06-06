# Offline App Deployment

## Windows Release

The planned release is a signed Tauri Windows installer with versioned SQLite
migrations and a controlled updater. Electron is a documented fallback only
after failed hardware proof-of-concept.

Version `0.34.0` adds the initial Tauri Windows packaging scaffold:

- `apps/offline-app/package.json`
- `apps/offline-app/src-tauri/tauri.conf.json`
- `apps/offline-app/config/windows-package.manifest.json`
- `.github/workflows/offline-app-windows.yml`

The Windows target is `x86_64-pc-windows-msvc`, the installer target is `nsis`,
and the expected installer artifact is an unsigned `.exe`.

## Build Commands

Validate the packaging contract:

```sh
npm run test:offline-app
```

Build locally from `apps/offline-app` after installing dependencies:

```sh
npm install
npm run build:windows
```

The GitHub Actions workflow exposes a manual `workflow_dispatch` build that
uploads the unsigned NSIS `.exe` artifact. Production release still requires
manual approval, code signing, and the hardware gate below.

Version `0.35.0` adds the first local SQLite schema contract in
`src-tauri/migrations/0001_offline_foundation.sql`. It defines local device
identity, sync cursors, queued operations, sync logs, cached branding,
inventory, customer credit, events, and conflict tables. The schema is local
state only; WordPress remains authoritative once operations sync.

## Device Enrollment

1. Manager creates a short-lived pairing code in WordPress.
2. App presents device identity, mode, location, and hardware capabilities.
3. Server issues a scoped device token.
4. Token is stored in Windows protected credential storage.
5. App performs first full sync and integrity check.
6. Manager validates kiosk/staff/admin mode and revocation.

Version `0.40.0` adds the WordPress request validation boundary for step 2.
The planned registration route validates pairing codes, app installation IDs,
device labels, kiosk/staff/admin mode, location and manager IDs, Windows app
version, supported hardware capability flags, requested scopes, and schema
version `1`. Live token issuance, token hashing/storage, device row writes,
revocation checks, and first-sync execution remain disabled until staging
integration tests pass.

Version `0.41.0` adds the registration planning boundary for steps 3 through
5. A validated pairing request can now be shaped into the future device row,
one-time response payload, sync route map, first-sync flags, token hash storage
fields, and redacted audit payload. Real token generation, storage, device row
writes, revocation checks, and first-sync execution are still disabled until
staging integration tests pass.

Version `0.42.0` adds the registered-device access policy boundary for later
pull, push, and conflict requests. The policy validates active state,
revocation timestamps, token expiry, required scopes, supported modes/scopes,
location IDs, and UTC timestamps. Live bearer-token lookup, token hash
comparison, route permission callback wiring, last-seen updates, and revocation
persistence are still disabled until staging integration tests pass.

## Hardware Gate

Before production, test the actual:

- Barcode scanner and symbology.
- Label printer, DPI, stock size, and Windows driver.
- Touchscreen and on-screen keyboard.
- Optional receipt and QR scanner.
- Kiosk lockdown and auto-start behavior.

## Operations

- Monitor app version, device last seen, queue depth, conflicts, disk usage, and
  image cache health.
- Updates must not discard unsent operations.
- Revoked/lost devices cannot sync.
- Diagnostic exports are encrypted and redact secrets and personal data.
