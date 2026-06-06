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

## Device Enrollment

1. Manager creates a short-lived pairing code in WordPress.
2. App presents device identity, mode, location, and hardware capabilities.
3. Server issues a scoped device token.
4. Token is stored in Windows protected credential storage.
5. App performs first full sync and integrity check.
6. Manager validates kiosk/staff/admin mode and revocation.

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
