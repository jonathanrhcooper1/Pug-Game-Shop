# Bug Reproduction

Date: 2026-07-07
Branch: `fix/inventory-sync-lan-source-of-truth`

## Start Commands

- LAN middleman health checked at `http://127.0.0.1:8787/health`.
- Offline app dev server:
  `npm run dev -- --host 127.0.0.1 --port 5178`
  from `apps/offline-app`.
- UI opened at `http://127.0.0.1:5178/`.
- Test PIN used: local owner/preview PIN only. No secrets recorded.

## Screenshots

- `debug-artifacts/screenshots/01-before-app-loaded.png`
- `debug-artifacts/screenshots/02-after-unlock-status.png`
- `debug-artifacts/screenshots/06-after-scrydex-per-game-sync.png`
- `debug-artifacts/screenshots/07-after-live-sync-progress.png`
- `debug-artifacts/screenshots/08-after-unlock-lan-queue-zero.png`
- `debug-artifacts/screenshots/09-after-queue-cleared.png`
- `debug-artifacts/screenshots/10-after-status-connected.png`
- `debug-artifacts/screenshots/11-after-scrydex-manual-sync-view.png`

## Inventory Quantity Update

Previous UI reproduction in this branch showed quantity updates were being accepted by the LAN server but the app could keep showing stale item data until another card was selected/refetched.

Root cause:
- The app updated local UI state from the submitted draft instead of reloading the authoritative row after `/inventory/items/:id`.
- `quantity_on_hand` was not consistently mapped into the app item model, so grouped stock could render as the wrong count.

Fixed behavior:
- After a successful LAN update, the app re-runs `searchInventory(targetItem.barcode)` and merges the authoritative row.
- Inventory display counts use summed `quantityOnHand` and exclude sold/removed rows.

## ScryDex Sync Management

Broken behavior:
- ScryDex had a global refresh loop in the app, but staff could not start or monitor each supported game independently from the LAN middleman.
- The deployed 0.202.19 server could also leave an active job showing `running` after its only game had already reached terminal `blocked` status.

UI evidence:
- `06-after-scrydex-per-game-sync.png` shows the new `ScryDex Manual Sync` section with per-game `Sync Now` controls for Pokemon, Magic: The Gathering, Lorcana, and One Piece.

Live status evidence:
- A Pokemon ScryDex job was started through `POST /scrydex/catalog/sync-jobs`.
- The installed LAN server returned a running job with game-level error detail: `wordpress_scrydex_catalog_index_unavailable`, message `This operation was aborted`.
- The app was updated to display both the branch job shape and the installed 0.202.19 job shape.
- The deployed LAN server now reconciles terminal game results before returning status, archives the job as `completed_with_errors`, and clears `active_job`.

## Queue Clearing

Before this work, LAN queued rows were stuck due to Square idempotency reuse and a duplicate WordPress barcode/SKU response.

Evidence after recovery:
- `GET /sync/status` returned `queue_depth: 0`.
- `queue_summary.pending_count: 0`.
- `queue_summary.items: []`.
- `local_only_count: 23`, which are local-only history/session rows, not pending push jobs.
- After the final deployed-server restart, targeted status still returned `queue_depth: 0`, `pending_count: 0`, and `active_job: false`.
- The app Queue page showed `0 LAN pending ops; 0 device-only ops`.
- The app Status page showed `Queue health: 0 device ops; 0 LAN ops`.

## Console/Backend Notes

- Browser DOM snapshots hit an in-app-browser compatibility error: `incrementalAriaSnapshot is not a function`; screenshots and direct page checks were used instead.
- Full-page screenshots of the large ScryDex status page timed out after the active catalog job made the page very heavy; viewport/full-page screenshots from the successful earlier pass were saved.

## Commands Run

- `node apps/local-sync-server/tests/scrydex-reference-search.mjs`
- `node apps/local-sync-server/tests/local-sync-server-scrydex-catalog-jobs.mjs`
- `node apps/local-sync-server/tests/local-sync-server-inventory-quantity-update.mjs`
- `node apps/local-sync-server/tests/local-sync-server-maintenance.mjs`
- `node apps/local-sync-server/tests/square-catalog-inventory-syncer.mjs`
- `node apps/local-sync-server/tests/local-sync-server-square-sale-removal-sync.mjs`
- `node apps/local-sync-server/tests/local-sync-server-wordpress-inventory-square-sync.mjs`
- `node apps/local-sync-server/tests/local-sync-server-contract.mjs`
- `node apps/offline-app/tests/local-sync-client-contract.mjs`
- `npm run typecheck` from `apps/offline-app`
- `npm test` from `apps/local-sync-server` passed for the full 0.202.19 middleman suite.
- `npm run test:package-contract` from `apps/offline-app` passed after updating stale source-text assertions for the current credit UI label and CRLF-tolerant state check.
- `npm run test:offline-app` passed, including TypeScript, offline app contracts, and 22 Rust/Tauri tests.
- `npm run build` passed.
- `npm run test:packaging` passed after aligning WordPress plugin version metadata to `0.202.19`.
- `npm run package:local-sync-server` passed and wrote `dist/pug-lan-server.zip`.
- `npm run package:production-release` passed and wrote `dist/the-pug-store-deliverables-0.202.19.zip`.

## Packaging Guard

- The branch `apps/local-sync-server` package was synced from the deployed 0.202.19 LAN server source, excluding databases/logs/secrets, because the branch still had an older `0.202.0` middleman package.
- Confirmed final package versions:
  - `apps/local-sync-server/package.json`: `0.202.19`
  - `apps/offline-app/package.json`: `0.202.19`
  - WordPress plugin header/readme/version constant: `0.202.19`
- Live server restarted from the patched deployed source with the real local env loaded. Final targeted status:
  - website configured: true
  - WordPress push: true
  - Square catalog inventory sync: true
  - Square inventory count poller: true
  - Square sales report puller: true
  - queue depth: 0
  - active ScryDex job: false

## Release Artifacts

- `dist/tcg-store-platform-0.202.19.zip`
- `dist/pug-arcade-commerce-v2-0.202.19.zip`
- `dist/pug-lan-server.zip`
- `dist/the-pug-store-deliverables-0.202.19.zip`
- `apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Pug Store App_0.202.19_x64-setup.exe`
- `apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Pug Kiosk App_0.202.19_x64-setup.exe`
