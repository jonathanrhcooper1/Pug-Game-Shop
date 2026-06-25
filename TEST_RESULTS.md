# Test Results

Date: 2026-06-25

## Latest Square / Middleman Sync Verification

| Command | Result | Notes |
| --- | --- | --- |
| `node apps/local-sync-server/tests/square-catalog-inventory-syncer.mjs` | Passed | LAN Square syncer now sends item category IDs without ordinal metadata and verifies `Singles / MTG` item assignment. |
| `node scripts/tests/square-pos-singles-layout-contract.mjs` | Passed | Contract verifies the Square POS layout seed, middleman startup preflight, and package script. |
| `node scripts/tests/square-one-card-standalone-probe-contract.mjs` | Passed | Standalone probe contract now verifies category assignment without ordinal metadata. |
| `npm.cmd run square:seed-pos-singles-layout -- --dry-run --location LB1B9Z4GVG1BH` | Passed | Verified the Square POS `Singles` layout request shape without network writes. |
| `npm.cmd run square:seed-pos-singles-layout -- --execute --location LB1B9Z4GVG1BH` | Passed | Live production Square seed created/reused `Singles`, `MTG`, `Lorcana`, `Riftbound`, and `Pokemon`; created test SKU `PUG-CODEX-POS-SINGLES-MTG-20260625T185622Z` under `Singles / MTG` with quantity `1`. |
| `npm.cmd run package:production-release` | Passed | Built the `0.202.12` WordPress plugin/theme packages, LAN server zip, Store App installer, Kiosk App installer, and full deliverables ZIP. Existing Vite large-chunk warning only. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | Production release package contract passed after the `0.202.12` version bump. |
| `npm.cmd run verify:no-production-secrets` | Passed | Secret scan passed after Square POS layout seed and item category payload repair. |
| `npm.cmd run release:copy-usb` | Passed | Copied the `0.202.12` release to `D:\The Pug Installers`, preserving the hidden middleman credential handoff file and pruning old versioned Pug app/release artifacts. |
| `npm.cmd run square:one-card-probe -- --dry-run --category Singles ...` | Passed | Verified the standalone Square probe now includes category assignment without network writes. |
| `node scripts/tests/square-one-card-standalone-probe-contract.mjs` | Passed | Contract now requires Square category search/create and item category assignment markers. |
| `npm.cmd run square:one-card-probe -- --execute --location LB1B9Z4GVG1BH --category Singles ...` | Passed | Direct production Square test created one item in category `Singles` with quantity `1`, SKU `PUG-CODEX-SQ-20260625T180117Z`, item ID `HOBLCEXJ6CDFXMZBLCMZP5MR`, and variation ID `4UF2VF67C4G4W4PC54FE254N`; no LAN server or WordPress mutation was used. |
| `node apps/local-sync-server/tests/square-catalog-inventory-syncer.mjs` | Passed | LAN Square syncer test now verifies root/game category creation, category assignment, image upload, SKU/barcode mapping, and physical inventory count. |
| `npm.cmd --prefix apps/local-sync-server run test` | Passed | Full LAN server suite passed after Square category/image sync and inventory-poll wording updates. |
| `npm.cmd --prefix apps/offline-app run typecheck` | Passed | Store App typecheck passed after manual image URL intake and inventory barcode edit UI updates. |
| `npm.cmd --prefix apps/offline-app run test:package-contract` | Passed | Store/Kiosk app package contract passed after the `0.202.11` version bump, barcode editor, and manual image intake updates. |
| `npm.cmd run package:production-release` | Passed | Built the `0.202.11` WordPress plugin/theme packages, LAN server zip, Store App installer, Kiosk App installer, and full deliverables ZIP. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | Production release package contract passed after the `0.202.11` version bump. |
| `npm.cmd run verify:no-production-secrets` | Passed | Secret scan passed after Square category/image sync and manual intake updates. |
| `npm.cmd run release:copy-usb` | Passed | Cleaned `D:\The Pug Installers` of old release artifacts while preserving the hidden middleman credential handoff file, then copied the `0.202.11` release. |
| USB artifact scan | Passed | USB now contains only `0.202.11` Store/Kiosk installers, `pug-lan-server.zip`, deploy/credential/DYMO scripts, docs, the release folder/zip, and the hidden local middleman env handoff file. |
| `node scripts/square-one-card-standalone-probe.mjs --dry-run` | Passed | Verified the standalone Square probe builds the expected catalog and inventory request shape without network writes. |
| `node scripts/tests/square-one-card-standalone-probe-contract.mjs` | Passed | Contract verified the one-card Square probe requires server-side credentials and does not print/store tokens. |
| `node scripts/square-one-card-standalone-probe.mjs` | Passed | Live production Square API probe created one test item and read back quantity `1` at location `LB1B9Z4GVG1BH`; sanitized report saved under `tmp/`. |
| `node apps/local-sync-server/tests/square-catalog-inventory-syncer.mjs` | Passed | LAN server Square syncer fake-API test verified catalog upsert, SKU/barcode mapping, inventory physical count, and sanitized status. |
| `npm.cmd --prefix apps/local-sync-server run test:square-inventory-reconciliation` | Passed | Square inventory reconciliation now updates quantity deltas instead of treating every Square count decrease as a full sale. |
| `npm.cmd --prefix apps/local-sync-server run test:runtime` | Passed | Runtime tests passed with the Square catalog inventory sync connected status field. |
| `npm.cmd --prefix apps/local-sync-server run test:wordpress-inventory-push` | Passed | WordPress push contract now preserves Square item, variation, and location IDs. |
| `npm.cmd --prefix apps/local-sync-server run test` | Passed | Full LAN server suite passed after moving Square catalog/inventory sync ownership to the middleman server. |
| `php tests/lint.php` | Passed | 664 WordPress plugin PHP files checked with 0 failures. |
| `php tests/run.php` | Passed | 1060 WordPress plugin tests passed after migration version `17` was added. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | Production package contract passed after the `0.202.10` version bump. |
| `npm.cmd run verify:no-production-secrets` | Passed | No production secret markers found after the Square sync update. |
| `npm.cmd run package:production-release` | Passed | Built the `0.202.10` WordPress plugin, theme, LAN server package, Store App installer, Kiosk App installer, and full release ZIP. Vite emitted the existing large chunk warning only. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | Post-package contract verified the final `0.202.10` deliverable shape. |
| `npm.cmd run verify:no-production-secrets` | Passed | Post-package source/package secret scan passed. |
| `npm.cmd run release:copy-usb` | Passed | Copied `0.202.10` release to `D:\The Pug Installers` with Store App, Kiosk App, LAN server zip, patch script, credential applier, middleman prompt, install doc, and DYMO diagnostic. |
| USB old-artifact scan | Passed | Removed stale `0.202.8` app installers and release folders from `D:\The Pug Installers`; only `0.202.10` app/release artifacts remain. |

Date: 2026-06-24

## Automated Test Summary

| Command | Result | Notes |
| --- | --- | --- |
| `php -l apps\wordpress-plugin\src\ScryDex\ScryDexHttpProvider.php; ...` | Passed | Syntax check passed for changed ScryDex provider, result, worker, planner, catalog controller, and admin menu PHP files. |
| `php apps\wordpress-plugin\tests\run.php --filter ScryDex` | Passed | 1060 tests, 0 failures; includes the new sanitized provider diagnostics coverage. |
| `php apps\wordpress-plugin\tests\run.php --filter ScryDexCatalog` | Passed | 1060 tests, 0 failures; includes the ScryDex Catalog admin/controller diagnostics contract. |
| `npm.cmd run package:wordpress` | Passed | Built `dist\tcg-store-platform-0.202.9.zip` with ScryDex catalog diagnostics. |
| `node scripts/tests/wordpress-package-contract.mjs` | Passed | Verified `tcg-store-platform-0.202.9.zip` and matching theme package. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | Production package contract passed after version bump to `0.202.9`. |
| `npm.cmd run verify:no-production-secrets` | Passed | No production secret markers found after the ScryDex diagnostics update. |
| `npm.cmd run production:install-package` | Passed | Installed and activated `tcg-store-platform` `0.202.9` on production after database and wp-content backups; ScryDex catalog status/index routes registered. |
| `npm.cmd run production:verify-scrydex-catalog` | Passed | Read-only production check confirmed plugin `0.202.9`, ScryDex status/index/export routes, 155,537 reference cards, 100% image/variant coverage, and 87% price coverage. |
| `npm.cmd --prefix apps/offline-app run test:package-contract` | Passed | Store/Kiosk app typecheck plus workspace, local sync client, Tauri command, and UI contracts passed for `0.202.8`; contracts now require per-workstation heartbeat labels. |
| `npm.cmd --prefix apps/local-sync-server run test:contract` | Passed | LAN server contract passed for the `0.202.8` release package. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | Production package contract passed and now requires `LAN_SERVER_CODEX_INSTALL.md` in the release and USB scripts. |
| `npm.cmd run verify:no-production-secrets` | Passed | No production secret markers found after the `0.202.8` heartbeat/install-doc updates. |
| `npm.cmd run package:production-release` | Passed | Rebuilt `0.202.8` plugin/theme/LAN server/Store App/Kiosk App release. |
| `npm.cmd run release:copy-usb` | Passed | Copied `0.202.8` release to `D:\The Pug Installers` with Store App, Kiosk App, LAN server zip, deploy scripts, credential applier, DYMO diagnostic, middleman prompt, and `LAN_SERVER_CODEX_INSTALL.md`. |
| USB old-artifact scan | Passed | `D:\The Pug Installers` contains zero `0.202.3`, `0.202.4`, `0.202.5`, `0.202.6`, `0.202.7`, or one-off `Pug Store App DYMO Fixed.exe` files after cleanup. |
| `npm.cmd --prefix apps/offline-app run test:package-contract` | Passed | Store/Kiosk app typecheck plus workspace, local sync client, Tauri command, and UI contracts passed for `0.202.7`; contracts now require DYMO `BorderColor` ordering, per-workstation fallback IDs, and post-save LAN inventory refresh. |
| `npm.cmd --prefix apps/local-sync-server run test` | Passed | Full LAN server suite passed, including runtime, Square reports/reconciliation, fulfillment, kiosk, trade-ins, discovery, WordPress pull/push, and the new quantity-preserving WordPress pull contract. |
| `cargo test` | Passed | 22 native Tauri/Rust tests passed for `0.202.7`. |
| `node scripts/tests/wordpress-package-contract.mjs` | Passed | Rebuilt and verified `dist\tcg-store-platform-0.202.7.zip` and `dist\pug-arcade-commerce-v2-0.202.7.zip`. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | Production release contract passed and now checks the diagnostic DYMO XML includes `BorderColor` before `BorderThickness`. |
| `npm.cmd run verify:no-production-secrets` | Passed | No production secret markers found after the 0.202.7 packaging changes. |
| `npm.cmd run package:production-release` | Passed | Rebuilt `0.202.7` plugin/theme/LAN server/Store App/Kiosk App release; Vite emitted the existing large chunk warning only. |
| `npm.cmd run release:copy-usb` | Passed | Copied `0.202.7` release to `D:\The Pug Installers` with Store App, Kiosk App, LAN server zip, deploy script, credential applier, DYMO diagnostic, and middleman prompt. |
| USB old-artifact scan | Passed | `D:\The Pug Installers` contains zero `0.202.3`, `0.202.4`, `0.202.5`, `0.202.6`, or one-off `Pug Store App DYMO Fixed.exe` files after cleanup. |
| `powershell.exe -File scripts\Diagnose-Pug-Dymo-Printing.ps1` | Passed | Generated text/JSON/ZIP diagnostic report; local probe showed DYMO Connect reachable and listing the 550 Turbo with `IsConnected=False`. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | Release package contract now requires `Diagnose-Pug-Dymo-Printing.ps1`. |
| `npm.cmd run package:production-release` | Passed | Rebuilt `0.202.6` plugin/theme/LAN server/Store App/Kiosk App release with DYMO diagnostic collector included. |
| `npm.cmd run release:copy-usb` | Passed | Copied `0.202.6` release to `D:\The Pug Installers`; diagnostic collector is present at USB root, Pug Store App, and LAN Server package locations. |
| USB old-artifact scan | Passed | `D:\The Pug Installers` contains no `0.202.3`, `0.202.4`, or `0.202.5` files after cleanup. |
| `curl.exe -k https://127.0.0.1:41951/DYMO/DLS/Printing/GetPrinters` | Passed with printer warning | DYMO Connect answered locally and listed `DYMO LabelWriter 550 Turbo`, but reported `IsConnected=False`; this is the stale flag now handled before LAN fallback. |
| `npm.cmd --prefix apps/offline-app run test:package-contract` | Passed | Store/Kiosk app typecheck and all package/workspace/Tauri/UI contracts passed for `0.202.5`. |
| `cargo test` | Passed | 22 Tauri/Rust tests passed after local DYMO printer selection repair. |
| `node scripts/tests/wordpress-package-contract.mjs` | Passed | WordPress plugin/theme package contract passed for `0.202.5`. |
| `npm.cmd run package:production-release` | Passed | Rebuilt plugin/theme/LAN server/Store App/Kiosk App release as `0.202.5`. |
| `npm.cmd run release:copy-usb` | Passed | Copied `0.202.5` release to `D:\The Pug Installers`; removed old `0.202.3`/`0.202.4` USB artifacts afterward. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | Verified the `0.202.5` deliverables manifest and three app package layout. |
| `npm.cmd run verify:no-production-secrets` | Passed | No production secret markers found in the source/package scan. |
| USB old-artifact scan | Passed | `D:\The Pug Installers` contains no `0.202.3` or `0.202.4` files after cleanup. |
| `npm run test:local` | Passed | 1039 PHP/unit tests, plugin bootstrap smoke, 648 PHP lint checks. |
| `npm run test:sync-engine` | Passed | Offline conflict policy and local sync server test suite passed. |
| `npm run test:pos-payments` | Passed | POS/Square policy and reconciliation tests passed. |
| `npm run test:api-client` | Passed | Square inventory adapter and WooCommerce product adapter tests passed. |
| `npm run test:offline-app` | Passed | TypeScript typecheck, offline app contracts, and 22 Rust tests passed. |
| `npm run test:packaging` | Passed | WordPress package, local sync package, production release, staging/production script contracts passed. |
| `npm run test:required-matrix` | Passed | Required test scaffold present: 12/12. |
| `npm run build` | Passed | Vite production build completed. Warning: one JS chunk is over 500 KB. |
| `npm run verify:no-production-secrets` | Passed | No production secret markers found. |
| `npm run package:production-release` | Passed | Production release ZIP and component packages generated. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | Production deliverable shape verified after bundled LAN config support. |
| `node scripts/tests/local-sync-server-package-contract.mjs` | Passed | LAN server package contents verified. |
| `node apps/offline-app/tests/windows-package-contract.mjs` | Passed | Windows Store/Kiosk app package contract verified. |
| `npm.cmd --prefix apps/offline-app run typecheck` | Passed | Store/Kiosk app TypeScript verified after local-first DYMO print path. |
| `npm.cmd --prefix apps/local-sync-server run test` | Passed | Local sync server runtime and graded pricing provider tests passed. |
| `node apps/offline-app/tests/tauri-command-contract.mjs` | Passed | Native DYMO print command and adapter contract verified. |
| `cargo test` | Passed | 22 Tauri/Rust tests passed in `apps/offline-app/src-tauri`. |
| `php tests/run.php; php tests/lint.php` | Passed | 1058 WordPress plugin tests and 663 PHP lint checks passed. |
| `npm.cmd --prefix apps/local-sync-server run test:contract` | Passed | LAN contract now reports PriceCharting primary and ScryDex fallback for graded cards. |
| `npm.cmd --prefix apps/local-sync-server run test:graded-pricing` | Passed | PriceCharting graded provider mapping passed. |
| `npm.cmd --prefix apps/local-sync-server run test:runtime` | Passed | Runtime graded valuation response and sync status source labels passed. |
| `node apps/offline-app/tests/local-sync-client-contract.mjs` | Passed | Store App client contract accepts the new graded pricing source fields. |
| `node apps/offline-app/tests/ui-shell-contract.mjs` | Passed | Store App UI text includes PriceCharting graded source and inventory edit markers. |
| `node apps/offline-app/tests/windows-package-contract.mjs` | Passed | Windows package contract passed after DYMO endpoint updates. |
| `npm.cmd run release:copy-usb` | Passed | Cleaned production release copied to `D:\The Pug Installers`. |
| `node apps/offline-app/tests/windows-package-contract.mjs` | Passed | Version bump to `0.202.4` matches Store App/Tauri metadata. |
| `node scripts/tests/production-release-package-contract.mjs` | Passed | `0.202.4` production release package contract passed before rebuild. |
| `npm.cmd run package:production-release` | Passed | Rebuilt `0.202.4` plugin/theme/LAN server/Store App/Kiosk App release. |
| `npm.cmd run release:copy-usb` | Passed | Copied `0.202.4` release to `D:\The Pug Installers`; USB secret handoff remained present. |
| `npm.cmd run verify:no-production-secrets` | Passed | Verified after `0.202.4` package and USB copy updates. |
| `npx playwright test tests/e2e/public-production-smoke.spec.ts --project=chromium` | Passed | 11 public production smoke checks passed. |
| `npm run production:verify-public-shortcodes` | Passed | Production plugin shortcodes/styles registered and rendered. |
| `npm run production:verify-reference-search` | Passed | Production card reference search used WordPress cache then ScryDex fallback order. |
| `npm run production:verify-scrydex-catalog` | Passed | Production catalog tables and coverage verified. |
| `npm run production:verify-active-syncs` | Passed | All active syncs verified and smoke data cleaned up. |

## Production Catalog Verification

- `reference_sets`: 1300
- `reference_cards`: 147508
- `reference_variants`: 236130
- `provider_price_observations`: 125529
- `provider_price_points`: 721322
- Image coverage: 100%
- Variant coverage: 100%
- Price coverage: 85%
- Game counts: Magic 100867, Pokemon 44706, Lorcana 1234, One Piece 701

## Browser / UI Verification

- Local app at `http://127.0.0.1:1420/` opened, unlocked with the review PIN, and loaded Inventory, Trade-Ins, Checkout, Fulfillment, Queue, Events, Reports, Customers, and Settings without console errors or horizontal overflow in the sampled desktop viewport.
- Public production desktop pass covered Home, Singles, Sealed, Graded, Events, and Cart.
- Public production mobile pass covered Singles and Events at 390x844 with no horizontal overflow or console errors.

## Not Run

- Real Square card-reader capture: blocked by hardware/live payment safety.
- Real customer email delivery: blocked by audit safety rule.
- Dymo label print output: blocked by unavailable printer hardware.
- Direct production deployment: blocked by manual approval requirement.
