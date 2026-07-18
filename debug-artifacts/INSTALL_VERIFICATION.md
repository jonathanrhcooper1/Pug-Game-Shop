# Install Verification

Date: 2026-07-07

## Installed Machine

- LAN server install root: `C:\PugGameShop\LANServer`
- LAN server source: `C:\PugGameShop\LANServer\pug-lan-server`
- LAN database preserved: `C:\PugGameShop\LANServer\pug-lan-server\store-sync.sqlite`
- Pre-install backup: `C:\PugGameShop\LANServer\server-maintenance\backups\pre-codex-0.202.19-install-20260707-164037`

## Installed Versions

- LAN server package: `0.202.19`
- Pug Store App executable: `0.202.19`
- Pug Kiosk App executable: `0.202.19`

## Installer Corrections

- Installed `packages/validation/src/posPaymentPolicy.mjs` into the LAN server because the LAN package needs it through `packages/api-client`.
- Updated `scripts/package-local-sync-server.mjs` and its contract so the LAN zip includes `packages/validation`.
- Updated `scripts/package-production-release.mjs` and its contract so `Start-Pug-LAN-Server.ps1` falls back to the bundled Codex Node runtime when system `node` is not on PATH.
- Synced the corrected `pug-lan-server.zip` and startup scripts into `C:\PugGameShop\LANServer`.

## Final Runtime Status

- LAN server listening: `http://127.0.0.1:8787`
- Queue depth: `0`
- Pending queue rows: `0`
- Inventory rows: `2649`
- Reference cards: `157111`
- Inventory source of truth: `local_sync_server`
- Active ScryDex job: `false`
- WordPress push connected: `true`
- Square catalog inventory sync connected: `true`
- Square inventory count poller connected: `true`
- Square sales report puller connected: `true`

## Verification

- `npm run test:packaging`: passed after package/install-script fixes.
- Installed Store App launched from `C:\Program Files\Pug Store App\tcg-store-offline.exe`.
- Old Vite dev server processes were stopped so the machine is using the installed app and installed LAN server.
