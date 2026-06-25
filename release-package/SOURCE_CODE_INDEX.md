# Source Code Index

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.14
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Generated index of source/config/test files included in the repository handover.
Audience: Developer and support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Index Notes

The index excludes generated dependencies, build artifacts, release binaries, logs, test results, local private environment files, and cache directories. Test coverage status is inferred from file path and related contract/unit/smoke test coverage.

## Files

| Path | Purpose | Type | Coverage status |
| --- | --- | --- | --- |
| .env.example | Project source/configuration | .example | Covered by package/build/smoke tests or pending targeted test |
| .github/pull_request_template.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| .github/workflows/offline-app-windows.yml | Project source/configuration | .yml | Covered by package/build/smoke tests or pending targeted test |
| .github/workflows/php.yml | Project source/configuration | .yml | Covered by package/build/smoke tests or pending targeted test |
| .github/workflows/pull-request-quality-gates.yml | Project source/configuration | .yml | Covered by package/build/smoke tests or pending targeted test |
| .github/workflows/wordpress-integration.yml | Project source/configuration | .yml | Covered by related unit/contract test |
| .wp-env.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| BUG_FIX_SUMMARY.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| CHANGELOG.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| CONNECTOR_STATUS_REPORT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| OPEN_BLOCKERS.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| PRODUCTION_AUDIT_REPORT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| README.md | Project source/configuration | .md | Covered by related unit/contract test |
| REVISION_LOG.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| SYNC_QUEUE_REPORT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| TEST_RESULTS.md | Project source/configuration | .md | Covered by related unit/contract test |
| UI_REVIEW_REPORT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/.env.example | Project source/configuration | .example | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| apps/local-sync-server/config/windows-service.manifest.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/package.json | Project source/configuration | .json | Covered by related unit/contract test |
| apps/local-sync-server/src/cli.mjs | LAN middleman server source | .mjs | Covered by related unit/contract test |
| apps/local-sync-server/src/dymoLabelPrinter.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/gradedPricingProviders.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/lanServerUrl.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/localSyncDiscovery.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/localSyncHttpServer.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/localSyncServerContract.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/localSyncStore.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/scrydexVisionIdentifier.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/squareCatalogInventorySyncer.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/squareInventoryCountsPuller.mjs | LAN middleman server source | .mjs | Covered by related unit/contract test |
| apps/local-sync-server/src/squareSalesReportsPuller.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/squareTerminalConnector.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressCatalogExportPull.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressCatalogFallback.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressCatalogIndex.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressCreditPush.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressCustomerUpsertPush.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressEventCheckinPush.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressEventRegistrationPush.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressEventUpsertPush.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressEventsPull.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressFulfillmentPull.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressInventoryPull.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressInventoryPush.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressKioskOrderPush.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/wordpressReportsPull.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tests/graded-pricing-providers.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-discovery.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-checkout.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-event-create.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-fulfillment.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-hold-expiry.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-inventory-quantity-update.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-kiosk-payment.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-locations.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-maintenance.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-multi-client.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-persistence.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-runtime.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-square-inventory-reconciliation.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-square-sales-reporting.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-square-terminal.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-trade-ins.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-users-health.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-wordpress-inventory-square-sync.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/scrydex-reference-search.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/square-catalog-inventory-syncer.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/square-inventory-counts-puller.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/square-sales-reports-puller.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-catalog-export-pull.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-catalog-fallback.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-credit-push.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-customer-push.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-event-checkin-push.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-event-registration-push.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-event-upsert-push.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-events-pull.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-fulfillment-pull.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-inventory-pull.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-inventory-push.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-inventory-sale-push.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-kiosk-push.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-reports-pull.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tools/daily-price-sync.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/dump-inventory-snapshots.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/force-pull-website.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/lib/ops-common.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| apps/offline-app/config/sqlite-schema.manifest.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/config/windows-package.manifest.json | Project source/configuration | .json | Covered by related unit/contract test |
| apps/offline-app/package-lock.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/package.json | Project source/configuration | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/build.rs | Offline app Windows shell source | .rs | Covered by related unit/contract test |
| apps/offline-app/src-tauri/capabilities/default.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/gen/schemas/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/gen/schemas/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/gen/schemas/desktop-schema.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/gen/schemas/windows-schema.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/migrations/0001_offline_foundation.sql | Offline app Windows shell source | .sql | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/src/lib.rs | Offline app Windows shell source | .rs | Covered by related unit/contract test |
| apps/offline-app/src-tauri/src/main.rs | Offline app Windows shell source | .rs | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/.rustc_info.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/adler2-708dea00d6a216f0/lib-adler2.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ahash-1f91ace4ea87f7d9/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ahash-3abb8edc28b555ff/lib-ahash.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ahash-ca42821deddbbe42/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/aho-corasick-bd2c63a8290410c1/lib-aho_corasick.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/alloc-no-stdlib-f942eb6e35a4ef08/lib-alloc_no_stdlib.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/alloc-stdlib-f4963da2cb2bf1c8/lib-alloc_stdlib.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/anyhow-7292878aaa05da4c/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/anyhow-854be13ee807ceeb/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/anyhow-c6babb0c09bad520/lib-anyhow.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/atomic-waker-a63bfe5478bbd105/lib-atomic_waker.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/autocfg-8c965f4063c10cfd/lib-autocfg.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/base64-ca72789b075579c1/lib-base64.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/bit-set-a80679ff610144e8/lib-bit_set.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/bit-vec-0f1595689d637db3/lib-bit_vec.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/bitflags-993d6e3c3708f1dc/lib-bitflags.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/bitflags-c518ebd8f493898b/lib-bitflags.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/bitflags-de74cd729bd09fd1/lib-bitflags.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/block-buffer-0cd2650f577987c1/lib-block_buffer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/brotli-0e1c3509a09ae4a1/lib-brotli.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/brotli-decompressor-91d8f121483fa252/lib-brotli_decompressor.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/byteorder-04b068faa2a5ce23/lib-byteorder.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/bytes-2374475d4ec174da/lib-bytes.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/camino-541d15d96da2ff80/lib-camino.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/camino-5c1c8693e6fcbf64/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/camino-9443787eef558086/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cargo-platform-07e01be78746cc4c/lib-cargo_platform.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cargo_metadata-b6d1db9b9f0eb083/lib-cargo_metadata.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cargo_toml-660affabc70626b0/lib-cargo_toml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cc-efe04dd3d132e9b2/lib-cc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cfb-36964e7a42f70f3b/lib-cfb.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cfb-69e35df78e83640d/lib-cfb.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cfg-if-50da2642d7d10359/lib-cfg_if.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cookie-62e55373b6945abf/lib-cookie.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cookie-72e6612ab0930e5f/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cookie-ba0d0f95d27dc253/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cpufeatures-7cfad6cf704d67d6/lib-cpufeatures.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/crc32fast-1c041f34d42edac0/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/crc32fast-7988aeb7d7c85e24/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/crc32fast-f063ff96dfd585c6/lib-crc32fast.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/crossbeam-channel-2db7acf23903f0e2/lib-crossbeam_channel.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/crossbeam-utils-05ff7bf3fa474e2e/lib-crossbeam_utils.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/crossbeam-utils-8066693d49c7288a/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/crossbeam-utils-8ba130f70681044d/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/crypto-common-60448a1f3727900d/lib-crypto_common.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cssparser-ccb619f6e44600f0/lib-cssparser.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/cssparser-macros-c5bb283f046e63dd/lib-cssparser_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ctor-262999504c7e1fbc/lib-ctor.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ctor-proc-macro-ba51d1894c95f918/lib-ctor_proc_macro.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/darling-839acef1191f89c7/lib-darling.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/darling_core-2a0be018ab7a49b8/lib-darling_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/darling_macro-0ecb1950cc63fd8a/lib-darling_macro.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/deranged-75a7f64913ecbeb6/lib-deranged.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/derive_more-6e31518980482dcd/lib-derive_more.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/derive_more-impl-bf3272a4e4b3d95b/lib-derive_more_impl.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/digest-9bab93fc182642b2/lib-digest.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/dirs-19d3b57845a58734/lib-dirs.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/dirs-a803eb5afcbf7a95/lib-dirs.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/dirs-sys-06351849d855a35e/lib-dirs_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/dirs-sys-d145f118bba8d7fa/lib-dirs_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/displaydoc-12e117d2cc5dc8bd/lib-displaydoc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/dom_query-e782f0e0c5bdde14/lib-dom_query.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/dpi-0cdc6519da80b74c/lib-dpi.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/dtoa-9ec691ecd82ae4ac/lib-dtoa.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/dtoa-short-2677d0819641c7b5/lib-dtoa_short.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/dunce-055fb06185da01ec/lib-dunce.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/dyn-clone-b44e02aa7499e4bb/lib-dyn_clone.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/embed-resource-81b6c741c500d773/lib-embed_resource.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/encoding_rs-6668f9a3bfbb9061/lib-encoding_rs.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/equivalent-b19a42cd8c2442b0/lib-equivalent.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/erased-serde-15beca30643b5e3e/lib-erased_serde.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/erased-serde-34a9c2f65112b32c/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/erased-serde-8bffd7c57ef8d2d0/lib-erased_serde.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/erased-serde-8f5f4ef94a9443e7/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/fallible-iterator-d32409da769221f7/lib-fallible_iterator.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/fallible-streaming-iterator-1c0352f5fd89c0fd/lib-fallible_streaming_iterator.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/fastrand-f47cf8eb7b2e972b/lib-fastrand.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/fdeflate-2a12cb157125ce12/lib-fdeflate.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/find-msvc-tools-824f9ded730dd358/lib-find_msvc_tools.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/flate2-df70ff1795a3ba6c/lib-flate2.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/fnv-03937741514939f5/lib-fnv.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/foldhash-44d2bd3163d93bdd/lib-foldhash.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/form_urlencoded-0977931150670c0a/lib-form_urlencoded.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/form_urlencoded-f56a3cd6753b58f7/lib-form_urlencoded.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/futures-channel-3e394625f62ffbfb/lib-futures_channel.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/futures-core-4fcb200a4b6ba7b0/lib-futures_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/futures-task-0501ad89d61e0536/lib-futures_task.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/futures-util-023c7de83a12457b/lib-futures_util.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/generic-array-5ec5ee46430be4f3/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/generic-array-91b16dd255e0db51/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/generic-array-f84af665175abae3/lib-generic_array.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/getrandom-22cbf390aea25eb0/lib-getrandom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/getrandom-35e7bd5f7930b705/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/getrandom-40d34049b695ef5f/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/getrandom-46f74a3a3f25b987/lib-getrandom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/getrandom-c52c4dcb593455bd/lib-getrandom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/getrandom-e9faf9724e08c3de/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/getrandom-ed1f94bceed784af/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/glob-2e2cf4d75ff2d305/lib-glob.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/hashbrown-32c9fb729af75c96/lib-hashbrown.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/hashbrown-bae4266ff5dabe82/lib-hashbrown.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/hashbrown-f49008ce597efaa8/lib-hashbrown.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/hashlink-afcd8310673d2af5/lib-hashlink.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/heck-530ae96cd4e922bb/lib-heck.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/html5ever-424b472a7960f64b/lib-html5ever.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/http-7499b226233dde33/lib-http.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/http-body-3c3edcd54d5be328/lib-http_body.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/http-body-util-08f6d9671658c402/lib-http_body_util.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/httparse-2c652abd85dc21ee/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/httparse-4dc4630409fa7385/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/httparse-7ca13416f5fd0f0e/lib-httparse.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/hyper-4c5c136747c88ff9/lib-hyper.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/hyper-rustls-fa265d9731c10011/lib-hyper_rustls.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/hyper-util-2b8eaa6681eabca3/lib-hyper_util.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ico-0e75dff6ab83d469/lib-ico.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_collections-0b859816b078547b/lib-icu_collections.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_collections-ff336fd75d7c7f32/lib-icu_collections.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_locale_core-b1270a9f3ea68c4c/lib-icu_locale_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_locale_core-ed5ee4ce023705f0/lib-icu_locale_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_normalizer-6af44a8f90515796/lib-icu_normalizer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_normalizer-b975ccf181832091/lib-icu_normalizer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_normalizer_data-96a52fd262d0f4c6/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_normalizer_data-aacece9abdcdcc8b/lib-icu_normalizer_data.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_normalizer_data-fcc13466500a304d/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_properties-3531fdd97f58a54b/lib-icu_properties.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_properties-9dee3c2d5b539363/lib-icu_properties.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_properties_data-22e67dfbb93d8ee9/lib-icu_properties_data.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_properties_data-7b1353f86d4d36da/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_properties_data-cd63a06a3e531c28/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_provider-1b0167f405cd2e83/lib-icu_provider.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/icu_provider-953a7704f3966e56/lib-icu_provider.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ident_case-68eb72f8b9e5c610/lib-ident_case.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/idna-1b937fb1d02b66c7/lib-idna.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/idna-55c49df56a28ffd7/lib-idna.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/idna_adapter-6e6850567107b7cf/lib-idna_adapter.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/idna_adapter-c887f2d233ea4c61/lib-idna_adapter.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/indexmap-762e5b6277c8ca7c/lib-indexmap.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/indexmap-86c2f8fd8f75aa20/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/indexmap-996f7834ac715357/lib-indexmap.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/indexmap-f00f99b5dac879b6/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/infer-87e837a5741ca3c2/lib-infer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/infer-f0c95f2f6f01473d/lib-infer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ipnet-dea9cc84ab6ce748/lib-ipnet.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/itoa-a8758a9001f01135/lib-itoa.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/json-patch-04f9ca7f29104511/lib-json_patch.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/json-patch-6cb80836d19e0ca4/lib-json_patch.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/jsonptr-0a3849578ece2304/lib-jsonptr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/jsonptr-262e4184f693b047/lib-jsonptr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/keyboard-types-d3fa7f288cba168f/lib-keyboard_types.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/keyring-73299adaef7e77f6/lib-keyring.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/libc-751e763eb72b7eae/lib-libc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/libc-763fb040b2d663ab/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/libc-dd5b03e75856a267/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/libsqlite3-sys-106474e6f4bfc4f7/lib-libsqlite3_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/libsqlite3-sys-56ff66295091b517/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/libsqlite3-sys-887852ffd63539b8/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/litemap-bc0b328e814c0a7a/lib-litemap.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/lock_api-adbb4475e277e311/lib-lock_api.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/log-42b5b4de622ac783/lib-log.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/markup5ever-652d62da50b4feea/lib-markup5ever.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/memchr-03065c283c645776/lib-memchr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/mime-73aaa303d72938a8/lib-mime.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/miniz_oxide-c1dfb26ef9a9d964/lib-miniz_oxide.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/mio-04dc9d4e7291613f/lib-mio.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/muda-c63512c45cac9256/lib-muda.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/new_debug_unreachable-3351dca6712d6be5/lib-debug_unreachable.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/num-conv-1a31483c0368ad4f/lib-num_conv.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/once_cell-0e6203ca65831a86/lib-once_cell.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/open-5024cac9332d21b7/lib-open.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/option-ext-d34cdf2551cb6085/lib-option_ext.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/os_pipe-291513bcd981b5e9/lib-os_pipe.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/parking_lot-192d740573d14fc2/lib-parking_lot.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/parking_lot-d4acb0d556fe6e55/lib-parking_lot.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/parking_lot_core-12fc7eb0299b59cc/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/parking_lot_core-69d260337b0ac6c7/lib-parking_lot_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/parking_lot_core-9551ed705df7587b/lib-parking_lot_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/parking_lot_core-e3e5c74a4f654ef3/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/percent-encoding-430cdb9c98e552e7/lib-percent_encoding.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/percent-encoding-62d9e9a014bdc3c1/lib-percent_encoding.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/phf-3f0d442b5d90d721/lib-phf.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/phf-a77d9dd699600692/lib-phf.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/phf_codegen-039b42fba5bbac9e/lib-phf_codegen.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/phf_generator-18dbea8cfbeeb032/lib-phf_generator.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/phf_macros-5197527a1480ccf5/lib-phf_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/phf_shared-33f5d032dc3d79af/lib-phf_shared.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/phf_shared-9ee7a876cd36c6e4/lib-phf_shared.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/pin-project-lite-c9545d3e16671299/lib-pin_project_lite.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/pkg-config-3e67ae996f5d4ab8/lib-pkg_config.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/plist-74a02d039bb26954/lib-plist.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/plist-fcc34a2dfb9384b2/lib-plist.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/png-e798f97c5a2bf03f/lib-png.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/potential_utf-bd0ad156a1c098fe/lib-potential_utf.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/potential_utf-caaf695fac979146/lib-potential_utf.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/powerfmt-69c7238331924e58/lib-powerfmt.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/precomputed-hash-f5838773140009ff/lib-precomputed_hash.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/proc-macro2-0089b8fc4861aeb0/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/proc-macro2-01ac8537dae2b402/lib-proc_macro2.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/proc-macro2-f101e74d49154d97/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/quick-xml-b74711e98035e839/lib-quick_xml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/quote-78c7521c3e232bbe/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/quote-e600caeee2b20115/lib-quote.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/quote-ff2a90532af845aa/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/raw-window-handle-97de44c0dc830f12/lib-raw_window_handle.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/regex-7ccd2a88f08f044b/lib-regex.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/regex-automata-cb576d302a3bd8e4/lib-regex_automata.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/regex-syntax-608f43b0e5826f9f/lib-regex_syntax.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/reqwest-41a3725420d29cea/lib-reqwest.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ring-09a44db80c7ac74e/lib-ring.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ring-15e1f58b911770a3/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ring-489eb117ad029ffa/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/rusqlite-a6fc265258057038/lib-rusqlite.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/rustc-hash-0cd0ca309a1e0da6/lib-rustc_hash.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/rustc_version-7bd0047c53d5eb58/lib-rustc_version.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/rustls-51e3f5f2018c252e/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/rustls-5272716d76621ddd/lib-rustls.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/rustls-cf4187a2b853571f/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/rustls-pki-types-6931c068445013f9/lib-rustls_pki_types.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/rustls-webpki-56342e519a13c53b/lib-webpki.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/ryu-e66e2e84528ce1f6/lib-ryu.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/same-file-5f18772a81401d76/lib-same_file.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/same-file-a9ac7b0104689213/lib-same_file.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/schemars-8db0b721eee5f877/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/schemars-c8a87c6deb383b2d/lib-schemars.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/schemars-f2bdbd922a10c26c/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/schemars_derive-e6b40fc0a5859842/lib-schemars_derive.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/scopeguard-e5d2c7e18f425fea/lib-scopeguard.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/selectors-0f205fa6de5c7883/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/selectors-56d56537857cb48d/lib-selectors.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/selectors-6d390b27f27f34b0/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/semver-58a97154ae5263a3/lib-semver.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/semver-7a8f27d67c4db3ea/lib-semver.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde-1632d5f9704053d5/lib-serde.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde-51226174b1e49143/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde-69dadcdd184ecf30/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde-9d2f4cb267e4d75f/lib-serde.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde-b4e8599ad30d0584/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde-cdb2584a7192e2fc/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde-untagged-7a18d21ac3d53b16/lib-serde_untagged.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde-untagged-d0129385cc0c4653/lib-serde_untagged.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_core-2edbf5ce1d61934b/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_core-35ba2c05936e7c77/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_core-73d152b7ceda14db/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_core-7db73e3b165acf0c/lib-serde_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_core-a135f920db68de26/lib-serde_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_core-fdf5f60f2a35bbe7/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_derive-895d56c487d9cfab/lib-serde_derive.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_derive_internals-cb16b69fb0c40fd7/lib-serde_derive_internals.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_json-0f4d7de54130b8b0/lib-serde_json.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_json-32914949b4053350/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_json-553be65809f52a71/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_json-9d2f8d5283adfa3f/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_json-b5a1dd586962f72e/lib-serde_json.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_json-c5169bc26a41dd4f/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_repr-b4feb6b007bb1372/lib-serde_repr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_spanned-277264f2ad43cefe/lib-serde_spanned.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_spanned-7317107a49582ddd/lib-serde_spanned.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_urlencoded-777fe600d337ef8d/lib-serde_urlencoded.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_with-0c908f56f7d3119a/lib-serde_with.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_with-36965218498283ad/lib-serde_with.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serde_with_macros-1295a941deebaf5e/lib-serde_with_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serialize-to-javascript-29b2dbae4824b9f6/lib-serialize_to_javascript.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/serialize-to-javascript-impl-ce87f5200f6bf13c/lib-serialize_to_javascript_impl.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/servo_arc-ac1defba9d94612d/lib-servo_arc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/sha2-42f511abcab234b9/lib-sha2.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/shared_child-cc6dda4c5e0737d4/lib-shared_child.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/shlex-f9df91f0b2c0ecd4/lib-shlex.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/simd-adler32-3150a16d58d9514c/lib-simd_adler32.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/siphasher-d89e92747f1de111/lib-siphasher.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/slab-0452de114df72725/lib-slab.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/smallvec-50a66600b2d2177b/lib-smallvec.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/smallvec-b298682c54a24465/lib-smallvec.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/socket2-478561b64aeb1838/lib-socket2.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/softbuffer-f585d7e8ffc944f2/lib-softbuffer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/stable_deref_trait-48ab879ba2e22c76/lib-stable_deref_trait.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/stable_deref_trait-9030104b42672411/lib-stable_deref_trait.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/string_cache-1aff88ac487ded23/lib-string_cache.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/string_cache_codegen-f1e9ed79ee31b48e/lib-string_cache_codegen.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/strsim-39eba2b191cdc78a/lib-strsim.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/subtle-ff5c8053a15a735d/lib-subtle.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/syn-b4e521442ece14ed/lib-syn.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/sync_wrapper-2e963b8920ea93cc/lib-sync_wrapper.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/synstructure-a72f5bfae830a3c4/lib-synstructure.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tao-cac7e91e9dfe9390/lib-tao.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-2f0e801798e15292/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-a2fbd35d5122668e/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-build-e82b42348f31cf0d/lib-tauri_build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-codegen-55e6c332f07aa835/lib-tauri_codegen.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-dca1c905e4b210d6/lib-tauri.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-macros-b96cf416836a0397/lib-tauri_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-plugin-449540be35f837ad/lib-tauri_plugin.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-plugin-shell-56996737f2438604/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-plugin-shell-605119d3fea44e97/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-plugin-shell-a17254f25ba9855e/lib-tauri_plugin_shell.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-runtime-6253ec0457216c42/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-runtime-c1caf11ada0633ea/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-runtime-f90d794550f228c7/lib-tauri_runtime.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-runtime-wry-52428c4b1c675e16/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-runtime-wry-9251e54156f58514/lib-tauri_runtime_wry.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-runtime-wry-cb0d89f5b26c54cd/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-utils-42f4c2b5156c4012/lib-tauri_utils.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-utils-f832e78877122cda/lib-tauri_utils.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tauri-winres-4e3ab25b6f2c47b1/lib-tauri_winres.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-0f2ea17e069aaa3f/test-bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-0f4720c1b6c57be1/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-4b8494d5fcbd18dd/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-51bbc55f557653ec/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-575d17ff3c794684/test-lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-681d7e0c07901592/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-68a5ceb981b6f2ac/test-lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-6b929a06964ce9f7/test-bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-7b184b692af0f5d6/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-7d70825afb185135/test-lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-8376e4b4bc722e61/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-8a7845a13713221d/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-9111ff56b117d3e5/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-920d858d4e9e3cd9/test-bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-9219f087df066777/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-945a96b7a9633f77/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-9ba80fbb313fe05d/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-aac48c9aa5811bc1/test-lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-ade9e3566cbeb53c/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-bd15e7e9619ada7d/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-c2765b1209e7618c/test-bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-c28b79c62e4e101d/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-e3bd45ac22e74e52/test-bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-ed11726ea865df6d/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tcg-store-offline-f9e9a0805776efac/test-lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tendril-9b7dba683de5f9e0/lib-tendril.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/thiserror-295b8b286a75f786/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/thiserror-a54c91ae6ec73860/lib-thiserror.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/thiserror-bb0bf2af49900e54/lib-thiserror.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/thiserror-bd8ea4cc14d7a3c7/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/thiserror-e196c11b7df54c50/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/thiserror-f4d6322d70c52f5c/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/thiserror-impl-b4e7a93fb4faad45/lib-thiserror_impl.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/thiserror-impl-e01168587242ea7a/lib-thiserror_impl.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/time-4e9bc177fd144aa7/lib-time.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/time-7621df6bbe7a3951/lib-time.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/time-core-27f04bc81daeef4e/lib-time_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/time-macros-5b8a6d5de9e07283/lib-time_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tinystr-1d0b91f468f34187/lib-tinystr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tinystr-cdf860e10a7e1592/lib-tinystr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tokio-7451f16acb74d6e4/lib-tokio.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tokio-rustls-f908b02e4ae17d8f/lib-tokio_rustls.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/toml-0a01df433e5b6de2/lib-toml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/toml-6e94eb2ddc29062f/lib-toml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/toml-dde3e57236e4b8b4/lib-toml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/toml_datetime-01d1a278afe44aef/lib-toml_datetime.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/toml_datetime-4637051da0eaf5e8/lib-toml_datetime.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/toml_datetime-d9a2ceed3b0c2bbc/lib-toml_datetime.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/toml_parser-439945e812265b03/lib-toml_parser.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/toml_writer-851e0dd56e677921/lib-toml_writer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tower-fb72a7ec61c72665/lib-tower.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tower-http-f25027dc732e782e/lib-tower_http.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tower-layer-b9c1d30a49fec744/lib-tower_layer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tower-service-3d89b48e7529514a/lib-tower_service.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tracing-6211047cb30e497b/lib-tracing.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/tracing-core-556801fa8edcbf03/lib-tracing_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/try-lock-275b5e8e17894b19/lib-try_lock.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/typeid-1e51bb5c9d8f5e68/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/typeid-d9b972aba2ca812e/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/typeid-dfb99493f7620faa/lib-typeid.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/typenum-dfb7bb22243cc977/lib-typenum.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/unic-char-property-527bd1fb13d87383/lib-unic_char_property.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/unic-char-range-20d3b3d8ff8ddb0c/lib-unic_char_range.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/unic-common-c67dc0dad09f681e/lib-unic_common.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/unic-ucd-ident-1402fb92ca1b767c/lib-unic_ucd_ident.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/unic-ucd-version-7cacdd7714cf71de/lib-unic_ucd_version.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/unicode-ident-c2fe9f6b8ade098b/lib-unicode_ident.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/unicode-segmentation-60cced87b8299ca1/lib-unicode_segmentation.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/untrusted-566b390964d57499/lib-untrusted.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/url-6624cacbded4c2ea/lib-url.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/url-cb5f154697a26dd7/lib-url.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/urlpattern-06eb49aaa5efb41d/lib-urlpattern.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/urlpattern-ccec56e60deace47/lib-urlpattern.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/utf-8-1fc59436e84361de/lib-utf8.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/utf8_iter-95d82ed6768ab36e/lib-utf8_iter.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/uuid-1a997661db8151c5/lib-uuid.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/uuid-f05025a0994dc573/lib-uuid.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/vcpkg-efed40ad735ffcfc/lib-vcpkg.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/version_check-dfb8931b0be28ab2/lib-version_check.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/vswhom-622a8f1800072efc/lib-vswhom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/vswhom-sys-6c35df59f53f60ab/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/vswhom-sys-e0e9f9d0c69fc482/lib-vswhom_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/vswhom-sys-e49c8b1e17454e50/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/walkdir-80fd1b56cae674a4/lib-walkdir.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/walkdir-f9e85412ad159763/lib-walkdir.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/want-ec73f91f5af7d404/lib-want.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/web_atoms-100a2f08464b0527/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/web_atoms-327bfd391b0ca720/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/web_atoms-92988f0837d54033/lib-web_atoms.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/webpki-roots-6813147fbfd758ef/lib-webpki_roots.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/webview2-com-4281ab201f935f67/lib-webview2_com.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/webview2-com-macros-2597ec9040080535/lib-webview2_com_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/webview2-com-sys-5f24982193eac586/lib-webview2_com_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/webview2-com-sys-60d56c135baf87e8/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/webview2-com-sys-c5d39ecf43b9d019/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/winapi-util-9a116ac9b35f42a8/lib-winapi_util.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/winapi-util-ac1ae5159018481d/lib-winapi_util.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/window-vibrancy-5a4d2925c6e02e7b/lib-window_vibrancy.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-4fd77df1904b35ef/lib-windows.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-collections-738dac91d05a186c/lib-windows_collections.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-core-689b286589ea2271/lib-windows_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-future-377b6c4524a68ad9/lib-windows_future.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-implement-3df8c5e0084bc1cc/lib-windows_implement.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-interface-67e8dee7b3c79c12/lib-windows_interface.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-link-d2ef63ecef51002c/lib-windows_link.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-link-e5d67dbb9625e185/lib-windows_link.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-numerics-aa7e51fdb5ef7465/lib-windows_numerics.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-result-79f61ce203a58cae/lib-windows_result.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-strings-de162edd9fd4c3ba/lib-windows_strings.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-sys-7d0a8a45f9dd8be8/lib-windows_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-sys-7f3b8c08dd62f4da/lib-windows_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-sys-cbbc5b6989251580/lib-windows_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-sys-de781fada6d3b103/lib-windows_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-sys-e74719f1aaf3fcd4/lib-windows_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-targets-11541c1387113afb/lib-windows_targets.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-targets-b170585257b0d7b4/lib-windows_targets.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-threading-48c0063f702dbde5/lib-windows_threading.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows-version-311dc7bf13e799e0/lib-windows_version.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows_x86_64_msvc-ad2aa6b1840fd81d/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows_x86_64_msvc-b76b1035c894b0c1/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows_x86_64_msvc-c5c5726af64828cf/lib-windows_x86_64_msvc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows_x86_64_msvc-d70364700e1c05c8/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows_x86_64_msvc-d7f0513d54c405a6/lib-windows_x86_64_msvc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/windows_x86_64_msvc-e925f74822633694/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/winnow-aadb9e51292de79e/lib-winnow.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/winnow-f83060dd4a555a13/lib-winnow.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/winreg-0df57910f83916bd/lib-winreg.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/writeable-3f9e5d7c77afadb6/lib-writeable.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/wry-2e6dbbacfa94230c/lib-wry.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/wry-3fa6c6b38befdde5/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/wry-8d1ecc6b8379e6a6/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/yoke-derive-cd79a1d6dcf00adf/lib-yoke_derive.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/yoke-e9a677f987e581cb/lib-yoke.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/yoke-eeb0b6664bebf826/lib-yoke.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zerocopy-0f2690c291069dbd/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zerocopy-b3834615987c6210/lib-zerocopy.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zerocopy-c70da36f1137c855/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zerofrom-76334b22dec253a5/lib-zerofrom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zerofrom-derive-401402adab66e5eb/lib-zerofrom_derive.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zeroize-455fad8eb4d3b216/lib-zeroize.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zerotrie-b09243c19f342a3b/lib-zerotrie.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zerotrie-bc731b1d2f473d53/lib-zerotrie.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zerovec-82de6ee4bf32fc9e/lib-zerovec.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zerovec-derive-fedc10c48c75e77a/lib-zerovec_derive.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zerovec-dfb09e4ba1d27240/lib-zerovec.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zmij-08aed8c3c171b8b1/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zmij-87e4aa7ad443f12d/lib-zmij.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/.fingerprint/zmij-bbaef9d295c9b9a4/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/libsqlite3-sys-887852ffd63539b8/out/bindgen.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/selectors-0f205fa6de5c7883/out/ascii_case_insensitive_html_attributes.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/serde-51226174b1e49143/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/serde-69dadcdd184ecf30/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/serde_core-2edbf5ce1d61934b/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/serde_core-35ba2c05936e7c77/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tauri-plugin-shell-605119d3fea44e97/out/global-scope.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-51bbc55f557653ec/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-51bbc55f557653ec/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-51bbc55f557653ec/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-7b184b692af0f5d6/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-7b184b692af0f5d6/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-7b184b692af0f5d6/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-ade9e3566cbeb53c/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-ade9e3566cbeb53c/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-ade9e3566cbeb53c/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-c28b79c62e4e101d/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-c28b79c62e4e101d/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-c28b79c62e4e101d/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-ed11726ea865df6d/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-ed11726ea865df6d/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/tcg-store-offline-ed11726ea865df6d/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/thiserror-e196c11b7df54c50/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/web_atoms-327bfd391b0ca720/out/generated.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/debug/build/web_atoms-327bfd391b0ca720/out/named_entities.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/adler2-bb2db03096979b79/lib-adler2.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/ahash-05bd04b5cdb63db2/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/aho-corasick-a35d3a06614f9133/lib-aho_corasick.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/alloc-no-stdlib-ca6ca72c8d88131f/lib-alloc_no_stdlib.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/alloc-stdlib-f7b2e8efdb89d0ed/lib-alloc_stdlib.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/anyhow-0a971e4ce632f731/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/anyhow-1790b9f66dedc60f/lib-anyhow.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/anyhow-bceba03a66078ff5/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/autocfg-53ab10f49ccf368b/lib-autocfg.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/base64-9e43a4b4a646018f/lib-base64.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/bit-set-4e8db81cc588ba7e/lib-bit_set.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/bit-vec-c35018721f9d5089/lib-bit_vec.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/bitflags-2af0f42cc3462c5d/lib-bitflags.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/bitflags-db4e2381c3ae79b8/lib-bitflags.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/block-buffer-c59cb3de5dae4bb9/lib-block_buffer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/brotli-60191bd3edf008ea/lib-brotli.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/brotli-decompressor-cdc27cb9afbf3c44/lib-brotli_decompressor.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/byteorder-b5c570cba815e717/lib-byteorder.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/bytes-dac3aaadb11fff5b/lib-bytes.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/camino-cc1e90a89686dc0c/lib-camino.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/camino-d98a469d8cbfba77/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/camino-f49d783eb78c4029/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/cargo-platform-12d0926a3b689c63/lib-cargo_platform.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/cargo_metadata-0b8db8b00bd69c7e/lib-cargo_metadata.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/cargo_toml-0a0623f54d4c5b58/lib-cargo_toml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/cc-5d1be999a30b4e4a/lib-cc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/cfb-1d238bfc3f2256e7/lib-cfb.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/cfg-if-53316245ccaae430/lib-cfg_if.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/cookie-dbb596505fcaee59/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/cpufeatures-3bf78bc8a1138d3f/lib-cpufeatures.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/crc32fast-35de980de51c9a93/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/crc32fast-5cf39d9de880e97b/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/crc32fast-923afd68c2f3645a/lib-crc32fast.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/crossbeam-utils-a0953d0b4aff1e04/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/crypto-common-c3cd7e2929482370/lib-crypto_common.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/cssparser-94a87b7aa57c6474/lib-cssparser.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/cssparser-macros-00d29952b16d3004/lib-cssparser_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/ctor-321c7af5e8e7f8b8/lib-ctor.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/ctor-proc-macro-e45dc5b61aceed64/lib-ctor_proc_macro.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/darling-655888eafd58b73c/lib-darling.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/darling_core-09e5d3cee27552a3/lib-darling_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/darling_macro-a14d50dda1a25b6b/lib-darling_macro.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/deranged-97f1fa259c609071/lib-deranged.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/derive_more-5e8731ceeccb4342/lib-derive_more.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/derive_more-impl-c518338c632db8bc/lib-derive_more_impl.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/digest-b11f4dba4e4c5ecc/lib-digest.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/dirs-cedb5745eea895ae/lib-dirs.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/dirs-sys-315421cf764c27ae/lib-dirs_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/displaydoc-fd41c9d8e16c3bce/lib-displaydoc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/dom_query-61d42cefadf67063/lib-dom_query.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/dtoa-a82847615cc238a3/lib-dtoa.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/dtoa-short-d8f155967e59a617/lib-dtoa_short.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/dunce-a555508f06a052eb/lib-dunce.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/dyn-clone-a20f776feaa1cae5/lib-dyn_clone.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/embed-resource-95148ea953f30396/lib-embed_resource.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/equivalent-48edacb473429edf/lib-equivalent.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/erased-serde-0a1c4a5afbf80be7/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/erased-serde-80c81a7ac08774bc/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/erased-serde-fbba7060fea05079/lib-erased_serde.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/fastrand-0a5d63793457fb87/lib-fastrand.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/fdeflate-030f076169175997/lib-fdeflate.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/find-msvc-tools-5f38425654690702/lib-find_msvc_tools.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/flate2-7105f9fbe960cdc5/lib-flate2.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/fnv-c48882bfe871c70c/lib-fnv.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/foldhash-a9115b8a70c8fa16/lib-foldhash.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/form_urlencoded-dfd2778f3ab9c318/lib-form_urlencoded.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/generic-array-0bbcd9e49b249b09/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/generic-array-6234b4687456b44d/lib-generic_array.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/generic-array-b1f0cd5fcff2164f/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/getrandom-6e58ba0968f5d1ee/lib-getrandom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/getrandom-a5f5d87d8fa20d4c/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/getrandom-b25fb6b0776e5923/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/getrandom-b61b42fc8d22abd1/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/glob-a982433c627d7fb6/lib-glob.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/hashbrown-1fde54249fde0b99/lib-hashbrown.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/hashbrown-7f103a535a436bde/lib-hashbrown.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/heck-22810b8df0e11ecd/lib-heck.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/html5ever-0468982cdce098e1/lib-html5ever.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/http-0d72f0062e130a23/lib-http.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/httparse-e7c5d56bdc088370/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/ico-c496541af94389a7/lib-ico.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_collections-06b22cf653fc9c0a/lib-icu_collections.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_locale_core-6bedd6b4fcc00da9/lib-icu_locale_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_normalizer-ecd1fd595501c1b4/lib-icu_normalizer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_normalizer_data-70fd1c1fe1cee71f/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_normalizer_data-b6815fa12891f9c8/lib-icu_normalizer_data.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_normalizer_data-e0e61e6bbcbd3e60/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_properties-07f7112002fd3a20/lib-icu_properties.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_properties_data-89a4641265c29914/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_properties_data-d68768c1fb5a888e/lib-icu_properties_data.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_properties_data-e19dd763988253ab/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/icu_provider-895a888fd140baaa/lib-icu_provider.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/ident_case-5922620f88e90604/lib-ident_case.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/idna-ea02c8098f1c6b0e/lib-idna.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/idna_adapter-efef546abec9bc66/lib-idna_adapter.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/indexmap-5628e8db8e4fe981/lib-indexmap.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/indexmap-9baf32c68e8e80eb/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/indexmap-c50d6b077e4e2577/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/indexmap-fa4b3de612ca8ba8/lib-indexmap.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/infer-c16e2f49c9248be1/lib-infer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/itoa-c38c7bb4138619b9/lib-itoa.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/json-patch-434298fb05936f70/lib-json_patch.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/jsonptr-41fc2c995c97dafd/lib-jsonptr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/libc-0a2bc7520328e6f5/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/libc-6881a03f2016c071/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/libc-7d43ab76d977b3cd/lib-libc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/libsqlite3-sys-3206e58e86847950/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/litemap-a1a304791eb43df9/lib-litemap.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/lock_api-40365fe470282852/lib-lock_api.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/log-93ea2d2086bf8ae3/lib-log.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/markup5ever-60ac798dd21c1d45/lib-markup5ever.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/memchr-90c874085ce63370/lib-memchr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/miniz_oxide-8fbd30b446ec6114/lib-miniz_oxide.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/new_debug_unreachable-183411c501bfd8a7/lib-debug_unreachable.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/num-conv-49070ddaee343a6e/lib-num_conv.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/option-ext-7d185b8173909bff/lib-option_ext.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/parking_lot-3c48dcf6ab4fa7c8/lib-parking_lot.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/parking_lot_core-356cc1c966e6ce44/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/parking_lot_core-61912c185ab03eb9/lib-parking_lot_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/parking_lot_core-b9dfcc524f1195b4/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/percent-encoding-188350f11965cf4d/lib-percent_encoding.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/phf-7614d327613beeea/lib-phf.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/phf_codegen-a4ac6be08c03b626/lib-phf_codegen.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/phf_generator-3c4c5bc1e9c65d78/lib-phf_generator.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/phf_macros-1ff75904264988e9/lib-phf_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/phf_shared-f2b47a6888bd475b/lib-phf_shared.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/pkg-config-b20f921673db67f5/lib-pkg_config.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/plist-b985f9fccec99289/lib-plist.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/png-04c1fee4417f91e1/lib-png.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/potential_utf-a5538a9dc115aa31/lib-potential_utf.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/powerfmt-49af0cf14b3dbd7c/lib-powerfmt.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/precomputed-hash-f30b93eab44a0779/lib-precomputed_hash.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/proc-macro2-84c3e61aa94e1076/lib-proc_macro2.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/proc-macro2-9c6ec1fc716deea2/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/proc-macro2-bbac9388beb25594/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/quick-xml-38c8416c2ba72336/lib-quick_xml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/quote-4b65726d9437f4cc/lib-quote.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/quote-6132ba8fa122e9a5/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/quote-a8f066bb44f73fad/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/regex-2851fd743e30bdc1/lib-regex.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/regex-automata-7b26d455153670c9/lib-regex_automata.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/regex-syntax-775d5c0044a8785a/lib-regex_syntax.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/ring-ec1db3d3b2e745f5/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/rustc-hash-a780ca6465c7cb74/lib-rustc_hash.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/rustc_version-c2d38488a4151661/lib-rustc_version.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/rustls-018e0e404ee046ec/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/same-file-c92af2493c6e9d1d/lib-same_file.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/schemars-21015686cd2e98de/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/schemars-938b75e6494d3a51/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/schemars-db2423a6bf5ccdec/lib-schemars.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/schemars_derive-438f214adaaad1ff/lib-schemars_derive.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/scopeguard-8f5d12ccd18ce2e3/lib-scopeguard.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/selectors-82c18225e1bfd3d8/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/selectors-a1c5cc6c1752cd16/lib-selectors.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/selectors-d2b5fbaaf5214658/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/semver-2b1cea1285504b4e/lib-semver.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde-2658ec3f3c2b0485/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde-36cf81b3fb00a5c3/lib-serde.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde-a1897f792b2268c0/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde-b48e6e27baecd671/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde-untagged-f1852a9c7807fa72/lib-serde_untagged.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_core-05afb5026b86640e/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_core-2800ef564c4875cf/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_core-53baa1491f537f5b/lib-serde_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_core-7e8095949e7d621f/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_derive-fd653a84de653762/lib-serde_derive.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_derive_internals-6a6d446fa891e68c/lib-serde_derive_internals.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_json-02579d318b3ab699/lib-serde_json.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_json-4cf8de87812bf826/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_json-917c98e4c6a2272c/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_json-c05e4add69e91d96/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_repr-c6d0da2a48566d16/lib-serde_repr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_spanned-dadb04f165e7a9a2/lib-serde_spanned.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_with-f600570cee8ebbbc/lib-serde_with.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serde_with_macros-1ab3aa33ae879fc2/lib-serde_with_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/serialize-to-javascript-impl-225f8c21a7705f65/lib-serialize_to_javascript_impl.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/servo_arc-41e72530bcb70f31/lib-servo_arc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/sha2-aafecd3af9485a2d/lib-sha2.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/shlex-03e9440da82108ac/lib-shlex.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/simd-adler32-753c85d306160448/lib-simd_adler32.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/siphasher-78f8a0629e675deb/lib-siphasher.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/smallvec-3ac91b85620f4e47/lib-smallvec.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/stable_deref_trait-024aec66bbb9cb42/lib-stable_deref_trait.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/string_cache-a18d0809ddf635c2/lib-string_cache.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/string_cache_codegen-95affe8632c7c1da/lib-string_cache_codegen.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/strsim-375c2529377feab5/lib-strsim.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/syn-e32fabf4e3571cfd/lib-syn.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/synstructure-88a348c666ac8d62/lib-synstructure.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tauri-092835f88acf0a8a/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tauri-build-8d45621526d40cc5/lib-tauri_build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tauri-codegen-3e88a9399b7e7979/lib-tauri_codegen.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tauri-macros-13e4fa2a9c75f8a8/lib-tauri_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tauri-plugin-a502e4d91e489075/lib-tauri_plugin.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tauri-plugin-shell-96afae224d867152/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tauri-runtime-acbaf86ab9d53186/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tauri-runtime-wry-08b7167c61e37b5e/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tauri-utils-9de669c7da58f7bb/lib-tauri_utils.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tauri-winres-a7474e0510b7a51d/lib-tauri_winres.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-0c4bb15ad0ebb838/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-0f2a934f21cc8e5e/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-20fe8c0b8e44d93f/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-25610440e75d9839/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-70b196552d90310d/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-7ac34b269f979dc4/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-802e0f9adb1fac0b/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-8ec64449c7ae2d23/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-ac888bafdd6a3639/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-da06e41570641444/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-e6180fe3a0526de1/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-ea5ca69a984a1a6a/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-f84dae4b31070aca/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tendril-58f1dcee953999bb/lib-tendril.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/thiserror-4d128aa971afa30b/lib-thiserror.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/thiserror-61fcb5faaba2b6c2/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/thiserror-728eb049ab1da11c/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/thiserror-943723d5e1027835/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/thiserror-9e513b8baa7f1653/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/thiserror-dc1ca2de31281a65/lib-thiserror.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/thiserror-impl-1602f78eb80ce1c2/lib-thiserror_impl.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/thiserror-impl-3d2f230b7398b8fa/lib-thiserror_impl.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/time-9366cc35f4971424/lib-time.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/time-core-193826ac8f30bfe1/lib-time_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/time-macros-52083a9c6566b93a/lib-time_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/tinystr-e3985065526ee951/lib-tinystr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/toml-06a4c07a52460111/lib-toml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/toml-5bd0f866535f4df4/lib-toml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/toml_datetime-e6c55ab84bcc944e/lib-toml_datetime.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/toml_datetime-ef05006d9d29c488/lib-toml_datetime.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/toml_parser-d6cd57cf46dbae7a/lib-toml_parser.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/toml_writer-9a4791d4d36df47c/lib-toml_writer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/typeid-52111b61474cc938/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/typeid-cc544354c2ff714c/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/typeid-ebff0d0787b940c9/lib-typeid.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/typenum-7d726f43b92d47b8/lib-typenum.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/unic-char-property-c50037bba1f4e33c/lib-unic_char_property.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/unic-char-range-84b6c332ae170309/lib-unic_char_range.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/unic-common-11e9bd0b16b7d189/lib-unic_common.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/unic-ucd-ident-8b8c3b77c3260fd1/lib-unic_ucd_ident.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/unic-ucd-version-626a9c55acd4f52b/lib-unic_ucd_version.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/unicode-ident-30d2f53d806547ee/lib-unicode_ident.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/url-34f62720805890a1/lib-url.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/urlpattern-d81c1b5c73986536/lib-urlpattern.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/utf-8-ab1cc957c017399d/lib-utf8.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/utf8_iter-6ac8f45138cb0ab2/lib-utf8_iter.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/uuid-6d9e7d0cdd15cef1/lib-uuid.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/vcpkg-a00e8a2749d8f47c/lib-vcpkg.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/version_check-1b9f1c976da98159/lib-version_check.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/vswhom-24ee74514d530efb/lib-vswhom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/vswhom-sys-4aa3b6c6b77acaf2/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/vswhom-sys-9d05a69244a7ec9f/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/vswhom-sys-dc88e77f7c11b2f1/lib-vswhom_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/walkdir-8036b22075559217/lib-walkdir.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/web_atoms-a1be48b23cd72d44/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/web_atoms-ccf2a88969d37fc5/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/web_atoms-dbb2536c6b112aa8/lib-web_atoms.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/webview2-com-macros-06a25035fbdf7db5/lib-webview2_com_macros.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/webview2-com-sys-65300f5c6eec004f/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/winapi-util-d330f6fa0b857a6f/lib-winapi_util.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/windows-implement-ac449c41bc3b3831/lib-windows_implement.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/windows-interface-5e3650dfb2421735/lib-windows_interface.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/windows-link-1c6d55053da997da/lib-windows_link.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/windows-sys-72306efd5eb387ef/lib-windows_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/windows-sys-d53e16fade6e804f/lib-windows_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/windows-targets-85f50c91233c0fa8/lib-windows_targets.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/windows_x86_64_msvc-362c5ba04d5ee8d2/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/windows_x86_64_msvc-78326d583181a573/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/windows_x86_64_msvc-c5946ecb15ac280e/lib-windows_x86_64_msvc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/windows_x86_64_msvc-caa5f5ab497e3d0f/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/winnow-0ebcdd9c6b55e2bd/lib-winnow.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/winnow-52709cbff918a21d/lib-winnow.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/winreg-1ded78da23ff1cf4/lib-winreg.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/writeable-5f0a0581f0901b37/lib-writeable.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/wry-723e77b633b43c1a/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/yoke-4d71de8d44c2ba7e/lib-yoke.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/yoke-derive-be4bbf725ecf99a1/lib-yoke_derive.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/zerocopy-21c2d6b1316d3401/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/zerofrom-dee342b7e7964ab8/lib-zerofrom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/zerofrom-derive-f7dc8f28fc3cb62a/lib-zerofrom_derive.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/zerotrie-5e84929c02f25125/lib-zerotrie.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/zerovec-1c0bd28369164548/lib-zerovec.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/zerovec-derive-e1003864b4387a30/lib-zerovec_derive.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/zmij-482b35c4acd43527/lib-zmij.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/zmij-a6b9f59435e3eb87/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/.fingerprint/zmij-b1f2dd3e54315272/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/build/selectors-82c18225e1bfd3d8/out/ascii_case_insensitive_html_attributes.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/build/serde-2658ec3f3c2b0485/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/build/serde_core-2800ef564c4875cf/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/build/thiserror-9e513b8baa7f1653/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/build/web_atoms-a1be48b23cd72d44/out/generated.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/release/build/web_atoms-a1be48b23cd72d44/out/named_entities.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/ahash-2cff11d9fe922c52/lib-ahash.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/ahash-a2de3a05795a25cb/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/aho-corasick-887a596de49ea4fd/lib-aho_corasick.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/alloc-no-stdlib-e838afde148a5c5d/lib-alloc_no_stdlib.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/alloc-stdlib-048ac514e2ed2543/lib-alloc_stdlib.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/anyhow-6e61408486ea246f/lib-anyhow.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/anyhow-eadfd327f1842504/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/atomic-waker-ec18bc7b23653125/lib-atomic_waker.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/base64-615d6c4cc3ab0994/lib-base64.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/bitflags-e152b957670e3bc9/lib-bitflags.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/brotli-d82c0e8f371216d3/lib-brotli.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/brotli-decompressor-b5df815b5dbade3a/lib-brotli_decompressor.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/byteorder-9eb3d1327b3cdfdb/lib-byteorder.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/bytes-2cfb1f4bc982df50/lib-bytes.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/cfb-815a243f2da5f8e7/lib-cfb.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/cfg-if-67e875d804d36f7a/lib-cfg_if.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/cookie-78833dfed97a3709/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/cookie-ebff23b358e72879/lib-cookie.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/crossbeam-channel-c61917cecd3bf3f2/lib-crossbeam_channel.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/crossbeam-utils-510fe7026f8d3596/lib-crossbeam_utils.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/crossbeam-utils-63cdb17255a13522/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/ctor-9095280fc1b131df/lib-ctor.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/deranged-8acbb33a3a78e1d7/lib-deranged.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/dirs-0ed380270fd2ce92/lib-dirs.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/dirs-sys-3ba629cf9da7dc4b/lib-dirs_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/dpi-eaec0e4ad70fe7bc/lib-dpi.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/dunce-e38601e211aa96f9/lib-dunce.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/encoding_rs-0054e23e684ade99/lib-encoding_rs.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/equivalent-3bf9ba0cde62680b/lib-equivalent.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/erased-serde-80c4e07981fe5681/lib-erased_serde.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/erased-serde-e21e85facbcc7de0/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/fallible-iterator-90623edd5e205fa4/lib-fallible_iterator.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/fallible-streaming-iterator-2ad3fea3e005b87a/lib-fallible_streaming_iterator.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/fnv-9187aa5f24ee6a2c/lib-fnv.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/form_urlencoded-7bd409907e844d3a/lib-form_urlencoded.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/futures-channel-a7919010adb8b9ca/lib-futures_channel.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/futures-core-7ae1439506c88e7e/lib-futures_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/futures-task-303f8264bda89d0b/lib-futures_task.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/futures-util-9454eb9e98b900a6/lib-futures_util.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/getrandom-40742b9b80cdc95b/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/getrandom-8cc5915eb8272bdf/lib-getrandom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/getrandom-fa8d817c3528530e/lib-getrandom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/glob-31fb02f62310747b/lib-glob.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/hashbrown-a9c9aeb6ef598cca/lib-hashbrown.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/hashbrown-c330c31d355ef43a/lib-hashbrown.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/hashlink-eb4acae3e2845212/lib-hashlink.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/heck-3bd4ed6dca80c4db/lib-heck.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/http-7c88dc87475dab56/lib-http.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/http-body-55cb99ecac38b2de/lib-http_body.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/http-body-util-7109eed5f76867cf/lib-http_body_util.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/httparse-11dba40a1d56e610/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/httparse-ec555f61c89b2bb9/lib-httparse.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/hyper-704279204b1635ec/lib-hyper.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/hyper-rustls-49121960f745c1f7/lib-hyper_rustls.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/hyper-util-824f3f761278986f/lib-hyper_util.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/icu_collections-0585de2a194a69ef/lib-icu_collections.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/icu_locale_core-a8b3f3b23b0dad78/lib-icu_locale_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/icu_normalizer-03243c257c77ea42/lib-icu_normalizer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/icu_normalizer_data-114358b560f26caa/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/icu_normalizer_data-e709d1d451174a3d/lib-icu_normalizer_data.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/icu_properties-726fd071f421bef5/lib-icu_properties.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/icu_properties_data-5eb783c5656d79cd/lib-icu_properties_data.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/icu_properties_data-cc7315188e48677d/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/icu_provider-ba06e4fb30c64492/lib-icu_provider.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/idna-ed6be379e03b019c/lib-idna.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/idna_adapter-6cc33907aa4c6acf/lib-idna_adapter.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/indexmap-c51e17717044ff54/lib-indexmap.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/infer-55b82ee26650a58a/lib-infer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/ipnet-6a391cb8843ce755/lib-ipnet.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/itoa-3713a5c94c44b5b7/lib-itoa.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/json-patch-daad9285866749f4/lib-json_patch.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/jsonptr-d8ede1bf0b09975d/lib-jsonptr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/keyboard-types-d899cbe89b8e890a/lib-keyboard_types.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/keyring-5d072d8974d0440d/lib-keyring.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/libc-864cbb0bb6dd6dca/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/libc-de3e0a3fba38c9d0/lib-libc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/libsqlite3-sys-63ac93c0d5bbc0cd/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/libsqlite3-sys-c49c25b84463ac11/lib-libsqlite3_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/litemap-cdc83afe4c9da408/lib-litemap.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/lock_api-633ef9a6950c6230/lib-lock_api.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/log-fa98b34acd87c92e/lib-log.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/memchr-a1f3277a43e87963/lib-memchr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/mime-c6d928aeeae75d80/lib-mime.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/mio-c69be8211354fded/lib-mio.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/muda-a4cec4076378787e/lib-muda.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/num-conv-8c4fb00af5ec7be2/lib-num_conv.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/once_cell-b643fed64ec41560/lib-once_cell.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/open-46c1b5ebe35ccb84/lib-open.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/option-ext-d5f353fed833b9ff/lib-option_ext.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/os_pipe-4ace3debb33657e3/lib-os_pipe.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/parking_lot-dae05247f0dc0122/lib-parking_lot.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/parking_lot_core-7a9053f9be2dbb32/lib-parking_lot_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/parking_lot_core-e8054d6fced566b8/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/percent-encoding-fbae5d1586fc657a/lib-percent_encoding.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/phf-1ad6c60294aef5c5/lib-phf.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/phf_shared-5392a72874106919/lib-phf_shared.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/pin-project-lite-40eb2e676ba124b8/lib-pin_project_lite.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/plist-36e51b4f2e3a3194/lib-plist.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/potential_utf-3352f87693dcaecb/lib-potential_utf.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/powerfmt-a0dd1a5d7d318a3c/lib-powerfmt.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/quick-xml-07232efb034f7726/lib-quick_xml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/raw-window-handle-580db8a4d102ee88/lib-raw_window_handle.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/regex-05b0cc3f9b586645/lib-regex.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/regex-automata-8857e02ee621bc56/lib-regex_automata.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/regex-syntax-967a94ce46ac815f/lib-regex_syntax.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/reqwest-bd61f6f5a31d8c72/lib-reqwest.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/ring-dade2587cf359a6f/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/ring-db52d27d0b5cf7d2/lib-ring.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/rusqlite-599dd2c712905527/lib-rusqlite.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/rustls-5fbdf696adcfae91/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/rustls-ada2ac99c2b246c6/lib-rustls.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/rustls-pki-types-f1c5a0800a030e13/lib-rustls_pki_types.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/rustls-webpki-b969906318aee689/lib-webpki.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/ryu-22db942d80dc15b6/lib-ryu.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/same-file-9a4c988a35d54139/lib-same_file.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/scopeguard-22bf557a33cb9ff7/lib-scopeguard.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/semver-e76847b220d33078/lib-semver.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serde-6f46e36c95ad928b/lib-serde.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serde-ac8dda2dbd7d2d1b/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serde-untagged-7cb3a90f04219d46/lib-serde_untagged.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serde_core-1e83e2134ed52895/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serde_core-4b2a09c3376a5727/lib-serde_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serde_json-6855e4828811c115/lib-serde_json.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serde_json-d1a3670e350638a0/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serde_spanned-3d2e4ea06cfd7961/lib-serde_spanned.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serde_urlencoded-293dd9771d0e1927/lib-serde_urlencoded.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serde_with-9682ec388ee55594/lib-serde_with.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/serialize-to-javascript-950ec7bce6c0a9b2/lib-serialize_to_javascript.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/shared_child-30b65f4b5bdb7f00/lib-shared_child.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/siphasher-6847f19df9cad278/lib-siphasher.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/slab-07c79f748bdc643b/lib-slab.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/smallvec-3e99419243559f5d/lib-smallvec.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/socket2-dfaa9597e5e4b45b/lib-socket2.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/softbuffer-9b6c7adcbd2eab5f/lib-softbuffer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/stable_deref_trait-81bdb11da79f1595/lib-stable_deref_trait.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/subtle-061a36a3a6c58a8e/lib-subtle.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/sync_wrapper-d51cdf92a366eb2e/lib-sync_wrapper.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tao-bbbfa41e48ce16a8/lib-tao.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tauri-1eb0860f213b3c9b/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tauri-bc7bf764d231f680/lib-tauri.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tauri-plugin-shell-c98b8466467fac37/lib-tauri_plugin_shell.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tauri-plugin-shell-ed2d1f2ad9e73e1f/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tauri-runtime-b4d387f299d6f019/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tauri-runtime-f3cdbd8a09955754/lib-tauri_runtime.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tauri-runtime-wry-091e77664e9daa6a/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tauri-runtime-wry-0b165859664a396a/lib-tauri_runtime_wry.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tauri-utils-a533a043f80c7346/lib-tauri_utils.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-06c54500aee2de84/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-0f4720c1b6c57be1/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-0f4720c1b6c57be1/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-23da1fe3606343f2/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-2a4b06499e957a5f/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-2a4b06499e957a5f/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-2d7dcc6c3c369eff/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-2d7dcc6c3c369eff/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-3797014ab864827b/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-3797014ab864827b/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-3fa992f1abb00c75/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-3ffa27bb6bc9d667/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-5dad1e4a01651b56/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-5fcc0aa53958a982/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-7a5b2b30230d29ca/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-804cd54a5a7bd8af/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-8a7845a13713221d/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-8a7845a13713221d/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-8bb50ebdb41691f1/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-9111ff56b117d3e5/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-9111ff56b117d3e5/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-970a14d5b06b6857/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-9ba80fbb313fe05d/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-9ba80fbb313fe05d/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-9d421f10231ba2dd/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-a6a4b65ad67c8990/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-a6a4b65ad67c8990/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-ac3733f3bb65d442/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-ac3733f3bb65d442/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-ae5c8b4e1ec03e9b/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-bc3f99f2ddfc3f1d/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-bc3f99f2ddfc3f1d/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-ccfec68d5737c23f/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-ccfec68d5737c23f/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-cfc4003706710fa5/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-dfb3df23d60f7edb/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-dfb3df23d60f7edb/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-fe15cf74ce4c1b13/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-fe15cf74ce4c1b13/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by related unit/contract test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/thiserror-01db21e857368487/lib-thiserror.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/thiserror-040be03b201db952/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/thiserror-2a9af6c4948fc03a/lib-thiserror.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/thiserror-601b77b58c1d5b6f/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/time-6455acdf37a8cd65/lib-time.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/time-core-c5ee6426fad99ff5/lib-time_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tinystr-ae9a05dbc9846c68/lib-tinystr.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tokio-9ed5dd9cfa93d57b/lib-tokio.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tokio-rustls-15136cd6ab14a7ff/lib-tokio_rustls.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/toml-df4569f879567de6/lib-toml.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/toml_datetime-4d4d8ebce2ae0e9d/lib-toml_datetime.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/toml_parser-c414fdeac4ca9799/lib-toml_parser.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/toml_writer-c609bc00c4f2ae67/lib-toml_writer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tower-06a9945f91eff51f/lib-tower.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tower-http-3220698ac42f52c6/lib-tower_http.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tower-layer-6e107f33cc850aef/lib-tower_layer.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tower-service-2d08fade9669b140/lib-tower_service.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tracing-core-3de5fcab51b4e735/lib-tracing_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tracing-ea4802644a341d90/lib-tracing.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/try-lock-78a17f498905a1da/lib-try_lock.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/typeid-3d0fcf03a12da9e3/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/typeid-ac519e6cfe02fb7e/lib-typeid.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/unic-char-property-af03d639402dad96/lib-unic_char_property.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/unic-char-range-3454b46c0a071f98/lib-unic_char_range.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/unic-common-0ac55c91ed565ce6/lib-unic_common.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/unic-ucd-ident-657274a8ea213464/lib-unic_ucd_ident.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/unic-ucd-version-d9943b437740da94/lib-unic_ucd_version.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/unicode-segmentation-415adbb68d493982/lib-unicode_segmentation.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/untrusted-88be09d7a8459511/lib-untrusted.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/url-a7cee57581f1179e/lib-url.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/urlpattern-187fc1aadff68374/lib-urlpattern.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/utf8_iter-6c7d98f5b284eab3/lib-utf8_iter.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/uuid-15d7a341b4e5aca7/lib-uuid.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/walkdir-e289f4d87b071ae6/lib-walkdir.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/want-a93c1db933b93780/lib-want.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/webpki-roots-9f56fcab55922a5a/lib-webpki_roots.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/webview2-com-c70f6e26f6ef6e2e/lib-webview2_com.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/webview2-com-sys-375db0ba98aaf2e9/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/webview2-com-sys-edb2a2e5df7cc058/lib-webview2_com_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/winapi-util-710449c5275786a3/lib-winapi_util.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/window-vibrancy-1325918032b792d6/lib-window_vibrancy.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-b8fd3a87a01866bc/lib-windows.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-collections-0fe2930643719e7c/lib-windows_collections.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-core-68006d013950b7f0/lib-windows_core.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-future-67eb0407b8bd10bf/lib-windows_future.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-link-43ed7470f2513ab5/lib-windows_link.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-link-7bc14ebf2c475e92/lib-windows_link.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-numerics-20cef78b202e82f0/lib-windows_numerics.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-result-6ad3adea07decbb6/lib-windows_result.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-strings-427f3d0a81ac0660/lib-windows_strings.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-sys-1468b4c6bd567cb7/lib-windows_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-sys-1e39f5e61f7837c7/lib-windows_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-sys-a3d8d34293454844/lib-windows_sys.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-targets-2aa89f611ea13f33/lib-windows_targets.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-targets-6512e70da74571eb/lib-windows_targets.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-threading-9e4ec7267f79d098/lib-windows_threading.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows-version-49c6c764a676de02/lib-windows_version.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows_x86_64_msvc-3e3731a41bf576c5/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows_x86_64_msvc-8bfd11500e4dbb8e/lib-windows_x86_64_msvc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows_x86_64_msvc-d844bbbb4dc4a980/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/windows_x86_64_msvc-f920df297166abc7/lib-windows_x86_64_msvc.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/winnow-0cdae6de9d2dc36d/lib-winnow.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/writeable-afc9aff12b477e79/lib-writeable.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/wry-5e0c0d12ac1411a3/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/wry-6d77807f04b8cc7b/lib-wry.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/yoke-fa0ab81405024e5b/lib-yoke.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/zerocopy-2d6e331c9b542957/lib-zerocopy.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/zerocopy-d1c8cb1fad1808c0/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/zerofrom-827c3907ebea54f6/lib-zerofrom.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/zeroize-a8de9a6db45285c6/lib-zeroize.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/zerotrie-9853354b4bcd8f62/lib-zerotrie.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/zerovec-d7dbb488554ec86f/lib-zerovec.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/zmij-26725825ad35e81c/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/zmij-499d2c9afc61cd68/lib-zmij.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/libsqlite3-sys-63ac93c0d5bbc0cd/out/bindgen.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/serde-ac8dda2dbd7d2d1b/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/serde_core-1e83e2134ed52895/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tauri-plugin-shell-ed2d1f2ad9e73e1f/out/global-scope.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/135a8c710aa645b775a9b78a2fcac949a82632da6c2abbb83f419c220fbf9043.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/2115a8c9cfe9564b1d27f6bc617aa34d9f9c4e9973f2ea7b7b951a43df61ce44.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/32d421cb9ccad0f83b3923d3087928e52ab738b4f9d86eba4dbb7cb0a4cfbbda.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/5c097914cc25707575f168edee194187dcfc8e3bdafe3e57a38a25e31b70dc47.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/7e4959647b3b713e42fd9de58ce56cd4da1b542bc5f02ed9ea5705f642975f9f.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/8867a88fcf09715036d7aba2ddbdfff63c0aa74389691a07a1ee3c89840f8188.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/914549572e5b237c154432ea303e84491449a4fc8152e4e435025b8e0c80d21d.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/96a6c6734704f7b435a81c9e8adddf6f171c005a56375de85b1d7f74a7879d98.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/a3ecd604d49b95994b2c2db05a0b593104d5042b86e910887289d2cd56b2e77a.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/cf63d50d6616c29c8ac3e55228d8d73fcd13c9e29c60a3a9109d5e97cc681b39.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-06c54500aee2de84/out/tauri-codegen-assets/cf825fe6ae7518ec207cc7419ff9e72b0b47d3245ce17f6f8e6a64d6a4acdcc0.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-23da1fe3606343f2/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-23da1fe3606343f2/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-23da1fe3606343f2/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-23da1fe3606343f2/out/tauri-codegen-assets/2233b1935212eb6dac418e331a9c5228c6808db6505320094c0577052e68f678.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-23da1fe3606343f2/out/tauri-codegen-assets/7e7e91040c406f526ec84d70a4db560ece184ddfad4b2bb6ccdbdb1cb31f8c7e.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-23da1fe3606343f2/out/tauri-codegen-assets/c5b248a22ae3d3e377f52ac9f80bdb0b2d2147c838462e67977583920528555e.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3fa992f1abb00c75/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3fa992f1abb00c75/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3fa992f1abb00c75/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3fa992f1abb00c75/out/tauri-codegen-assets/03b7384b0b23ad1d5760053eb147ec27325adb6c9d1ee64726fc1530b9f92aff.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3fa992f1abb00c75/out/tauri-codegen-assets/c2f45f3be3b9f65d7aea4b9ecfe80adb51ea7b0a634e249d3310fbb68e8cd2f1.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3fa992f1abb00c75/out/tauri-codegen-assets/c5b248a22ae3d3e377f52ac9f80bdb0b2d2147c838462e67977583920528555e.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/0526c5566ce48d0bb3ce5551c3c6fe91e81f394b53b895728537e2d545f0c957.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/0696e67cb823dc7808c9725f316aa4f2472da9464e75bfa00790ce2f1018bc12.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/100eca1d8aba59f56244183180ee4797c05a91bc96a2607390b6b2a31d362d07.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/12284021589d38dfb35992ed1417667043146c1aa3451f541d11c6fc6538f411.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/30149519cf43d4ce44ab42e6deb62e5571a2aa5654bdb7196381afc956064958.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/40d0d8eb77055359b746e9d758ccf57e385c1f19796d9f748043df05de0ee942.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/4463b5589ec518cfaadc0f59d4a1d38638b731b3eb4c57fa3654d25c763410df.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/48762aa130aceaa50e358ddc3a1f817b7a2ec9ca3aaf85ed096f0ea5976d88e8.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/4d8a6718588dd3134262a19082e35d97c7492bc5efb081af7b20414db984bbe5.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/565aef26cc42cd6aa3ea549a0b5481053f355cc0f9d466802e42394759a7fd2f.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/56e611b2451db50292bb904785faba6b687bfe0448460eb8d495a55013d17bfd.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/5f5a53d297eb6512a035487c4779a3d4590cc18462b23bbc3b4b0ce01bb91e39.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/63a27a0f7c4c41902e54b62bca7ab8745dd1b9600c2524389dba323cdba14064.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/734e58b53f81d3fe3d5468687ecc65ca85b7b005ceebfcbdac9c86668cc23575.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/761acea8ad53bd2c2d64675bcff92c2791ebeae7a670e6ee293f2e56018bb640.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/76bfa5dbe67aaf1a1bbb636e449b9f3fee3a4d54ebb2730a1a6c1fb763540b52.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/83d80c9ab3367a0ec69f760becc02ed39cc4514c7297f6b95b48ba7ab1e249d2.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/893083e38902b845c927d3a080227ebca034cd43a4dd2573ca9bd2bb7b5bcec6.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/8c9f7619fad2941353fef02cd4c97553c3a726f8b1de287414e20954b8b67325.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/8dcb13b5edad72f40dab6e6c641916dce5c758c46c160898e2d56c3d377052b0.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/934859cbe0a273a1c800cff1bcd455c062dea22fdda165867115e81ed2003d8a.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/98be540c7eb19a977308fd584b6ca08c3bfe82c26b233f10a89eacb116f593c1.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/99219629c55f4d433e93ebd17e9e4438c81f78e853c2701b0e09077685dc2a25.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/9d760c8ffd5b900aa091aba5986dcae9479d501c3953a4be54fe29d86da30b6a.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/a150cc6aa112d65b7a25b2f2df37d9b9e126b266cc9fd9d5d09f82a89011ce76.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/a28b43eee1b99f6c810ee99e5634e62530fbb904f13ca555a614dd43a3374bed.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/ab6f7fede2d4ea740c90dde650ede27d846f1975e7dd6da0ba2b17d716fa9164.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/b47e449b26b6ae727db8313b45c235e1c27ceee0e9ce3883ec9a26fc2826d312.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/c03cc46a238f74e030eedbd5bd8cd06de7cb50a06fd9c1db90025060e71d132d.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/cc9e74355717ea02f768e29daf5a127c80ce41557903ba8ffd9c241e62dedf6c.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/da253a5683fca3a113b6e56bf29fe6c10f1785e47e2ce2b2273cdd822d6b48a7.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/f0273ec3e916d312ecaf4830dd4facccb5caf3c0018b4498d803e6934f5e6a28.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/f49a0dda90f80fdf66a542a778581e5829c3ad1eb271f0c7c20c253a5105cbac.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/f6a16eee99fad108ae08b1078344f85198d8127af339e541461cf008d235c29b.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/f8a800999682b36f25a1c43d40d6f4fdd77395a31ad62a8f62cbfeb5150d33ce.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-3ffa27bb6bc9d667/out/tauri-codegen-assets/f8e57a8ae75b0d5e64523eb229af791f2f3436a117d6ca4fc53d081a4c26e15c.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5dad1e4a01651b56/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5dad1e4a01651b56/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5dad1e4a01651b56/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5dad1e4a01651b56/out/tauri-codegen-assets/4ab6f85e8913448be4dd00850676f43c4253d4093e9c0540c2265338fb9423cd.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5dad1e4a01651b56/out/tauri-codegen-assets/bfd6c4d952b4e27987901a7082603b7be738dfa3b89694e8d2edf6a43e11eab5.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5dad1e4a01651b56/out/tauri-codegen-assets/c5b248a22ae3d3e377f52ac9f80bdb0b2d2147c838462e67977583920528555e.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5fcc0aa53958a982/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5fcc0aa53958a982/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5fcc0aa53958a982/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5fcc0aa53958a982/out/tauri-codegen-assets/10bfd9b55f2e92d269d197c79aea6851092a903143403fb81735f3fd691bffa1.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5fcc0aa53958a982/out/tauri-codegen-assets/330b69ec0be4765d8e34a752124e58e270dd083b8c11cf92a86355a1ce3dcb19.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-5fcc0aa53958a982/out/tauri-codegen-assets/c5b248a22ae3d3e377f52ac9f80bdb0b2d2147c838462e67977583920528555e.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-7a5b2b30230d29ca/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-7a5b2b30230d29ca/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-7a5b2b30230d29ca/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-7a5b2b30230d29ca/out/tauri-codegen-assets/40407f58bedd739ceaed42b15f133792c522a8b29c3d7aab1dd0575aac7fb004.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-7a5b2b30230d29ca/out/tauri-codegen-assets/c5b248a22ae3d3e377f52ac9f80bdb0b2d2147c838462e67977583920528555e.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-7a5b2b30230d29ca/out/tauri-codegen-assets/f80fea71b0b82b4abe78c6984ec613658b891693d3a82a9a557c826554611740.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-804cd54a5a7bd8af/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-804cd54a5a7bd8af/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-804cd54a5a7bd8af/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-804cd54a5a7bd8af/out/tauri-codegen-assets/6fa849888b69dbb9125c91a3a4884df88ca496d3f31d3df4812aaec78df0d391.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-804cd54a5a7bd8af/out/tauri-codegen-assets/a76caeb85e272dc4eb57a0594a7004aabf3330d00573a966e4fe2724d2c42b4c.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-804cd54a5a7bd8af/out/tauri-codegen-assets/c5b248a22ae3d3e377f52ac9f80bdb0b2d2147c838462e67977583920528555e.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-8bb50ebdb41691f1/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-8bb50ebdb41691f1/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-8bb50ebdb41691f1/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-8bb50ebdb41691f1/out/tauri-codegen-assets/17aaf180c6c44aee66cb560bc62ad6253c5040df540e3c8dfc2746b950697313.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-8bb50ebdb41691f1/out/tauri-codegen-assets/2d0cf4c79dec2fd369d5cc5211e0702d63ae8a531dab9141c2205dbaea781c44.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-8bb50ebdb41691f1/out/tauri-codegen-assets/cc9e74355717ea02f768e29daf5a127c80ce41557903ba8ffd9c241e62dedf6c.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-970a14d5b06b6857/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-970a14d5b06b6857/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-970a14d5b06b6857/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-970a14d5b06b6857/out/tauri-codegen-assets/40407f58bedd739ceaed42b15f133792c522a8b29c3d7aab1dd0575aac7fb004.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-970a14d5b06b6857/out/tauri-codegen-assets/c5b248a22ae3d3e377f52ac9f80bdb0b2d2147c838462e67977583920528555e.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-970a14d5b06b6857/out/tauri-codegen-assets/f80fea71b0b82b4abe78c6984ec613658b891693d3a82a9a557c826554611740.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-9d421f10231ba2dd/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-9d421f10231ba2dd/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-9d421f10231ba2dd/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-9d421f10231ba2dd/out/tauri-codegen-assets/40407f58bedd739ceaed42b15f133792c522a8b29c3d7aab1dd0575aac7fb004.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-9d421f10231ba2dd/out/tauri-codegen-assets/c5b248a22ae3d3e377f52ac9f80bdb0b2d2147c838462e67977583920528555e.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-9d421f10231ba2dd/out/tauri-codegen-assets/f80fea71b0b82b4abe78c6984ec613658b891693d3a82a9a557c826554611740.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-ae5c8b4e1ec03e9b/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-ae5c8b4e1ec03e9b/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-ae5c8b4e1ec03e9b/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-ae5c8b4e1ec03e9b/out/tauri-codegen-assets/2f9b201c31f3f66623405c0035f24abd409e6978409a391dc0aa9290f969bb12.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-ae5c8b4e1ec03e9b/out/tauri-codegen-assets/9b4344f049171166663533f4a29194268d44f141ea80fc3ba3ba20b55d7f3ba4.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-ae5c8b4e1ec03e9b/out/tauri-codegen-assets/c5b248a22ae3d3e377f52ac9f80bdb0b2d2147c838462e67977583920528555e.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/20c8088ab4eb4b6e37288259f4e99d228c66593e3d7584393baee2fc29feab02.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/42c513df620294fe86a4d4e7bb0010d4060126da3bded8d86ed36edcc4caa2a9.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/4e235a69d4a4f6d0c5611c71da5bee116312e2daa24d6ba40eb9ec5316665285.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/5d05304a14cbbe2d483b21072c4c5aba2a6aaf6fcbdc94d13e5422091048757e.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/68966df326cf7cab8fabe9796c640bed55b278ef758597d1e5945efbe7a52257.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/7f22bfc7638203c4c1110cb6b189bbea3aa5751870e1bebc5ed69482fe8f2d97.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/82270724a1d4134fcf71298c0f3101e7c4846a7944e5f56813340712a12de81d.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/8aa450c48b438baeef66a66032011508daff179c4bd9961da064b097e91379bc.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/933fecfde3aa370286c97a26801590fd98bdf8a1e4449db5448e170826599800.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/a7bc9fc2a764a9f648ed15366ad5d07dd05654b3c8271a4e9ee5ed10f37d6e6b.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/acb90b0d61cf06dc29e33c3fb76c5fd163b15e6f8d94ffdd71d8f91ef1d47da2.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/b226c0457c916914421bde65930f32749c47d8608217d4a0d551d7e4ec5b86a1.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/b24243e0fc40f14856707f6b45e955b172e5039eb6a714766e3472ea27342835.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/b2680c34b52872026cbc39a3ce1523dcf29c07b54cb87fc1fb7e7c0b87f0c8b7.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/bade24478ee1e2b9e6694cb263c12f35e560509d2b587ab1879a478672fb5b54.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/c5b248a22ae3d3e377f52ac9f80bdb0b2d2147c838462e67977583920528555e.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/df7d980499b51b5c1a20583440dd38375418d67bd8abb62c96c1fa06f6470dc1.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/e1b1975af211e59538d2020c438e507b19414277ec6c8bfd49f9f0c1ad200d03.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-cfc4003706710fa5/out/tauri-codegen-assets/e7f5d57d84c8c16feedba8c2f04648d62fedddb810a6f37d6dd00b28dc934201.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/thiserror-040be03b201db952/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/tauri.conf.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/App.tsx | Offline app frontend source | .tsx | Covered by related unit/contract test |
| apps/offline-app/src/data/localSyncServerClient.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/offlineLocalQueue.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/offlineQueueBridge.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/offlineWorkspace.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/tauriDevicePairingAdapter.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/tauriDymoPrinterAdapter.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/tauriLocalSyncDiscoveryAdapter.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/tauriOfflineSyncAdapter.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/tauriQueueAdapter.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/tauriSecureStoreAdapter.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/main.tsx | Offline app frontend source | .tsx | Covered by related unit/contract test |
| apps/offline-app/src/styles.css | Offline app frontend source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/tests/local-queue-persistence-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/offline-app/tests/local-sync-client-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/offline-app/tests/pull-inventory-cache-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/offline-app/tests/queue-bridge-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/offline-app/tests/sqlite-schema-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/offline-app/tests/tauri-command-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/offline-app/tests/ui-shell-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/offline-app/tests/windows-package-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/offline-app/tests/workspace-state-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/offline-app/tsconfig.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/vite.config.ts | Project source/configuration | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/shared-types/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| apps/shared-ui/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| apps/storefront-theme-or-blocks/README.md | WordPress storefront theme source | .md | Covered by related unit/contract test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/404.php | WordPress storefront theme source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/assets/css/editor.css | WordPress storefront theme source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/assets/css/main.css | WordPress storefront theme source | .css | Covered by related unit/contract test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/assets/js/main.js | WordPress storefront theme source | .js | Covered by related unit/contract test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/footer.php | WordPress storefront theme source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/front-page.php | WordPress storefront theme source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/functions.php | WordPress storefront theme source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/header.php | WordPress storefront theme source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/index.php | WordPress storefront theme source | .php | Covered by related unit/contract test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/page-contact.php | WordPress storefront theme source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/page.php | WordPress storefront theme source | .php | Covered by related unit/contract test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/search.php | WordPress storefront theme source | .php | Covered by related unit/contract test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/searchform.php | WordPress storefront theme source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/style.css | WordPress storefront theme source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/theme.json | WordPress storefront theme source | .json | Covered by related unit/contract test |
| apps/storefront-theme-or-blocks/pug-arcade-commerce-v2/woocommerce.php | WordPress storefront theme source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| apps/wordpress-plugin/assets/css/customer-account-portal.css | Project source/configuration | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/assets/css/public-events.css | Project source/configuration | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/assets/css/public-inventory.css | Project source/configuration | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/assets/css/woocommerce-card-product.css | Project source/configuration | .css | Covered by related unit/contract test |
| apps/wordpress-plugin/assets/js/public-storefront-links.js | Project source/configuration | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/composer.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Admin/AdminMenu.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Admin/InventoryWorkspacePresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/BuylistRouteContracts.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/CustomerController.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/CustomerCreditController.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/CustomerCreditRouteContracts.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/EventsController.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/FulfillmentOrderController.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/HealthController.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/InventoryCapabilityPermissionCallbackAdapter.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/InventoryController.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryMarkSoldRouteHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryPublicReadPermissionCallbackAdapter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryPublicReadRateLimitPolicy.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryRouteBootstrapPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryRouteBootstrapStatusPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryRouteBootstrapper.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryRouteContracts.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryRouteDependencyStatusPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryRoutePermissionCallbackFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryRouteRegistrar.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryRouteRegistrationPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryRouteRuntimeConfigurator.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventorySearchRouteHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventorySearchRouteHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryUpdateRouteHandler.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/KioskOrderController.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/OfflineConflictResolutionCurrentRowProvider.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineConflictResolutionRouteHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineConflictRouteHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineConnectorManifestController.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineConnectorManifestPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineController.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineDevicePairingRouteReadinessPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineDevicePairingRouteReadinessStatusPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineDeviceRegistrationRouteHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineDeviceRegistrationRouteHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePullRouteChangeSetProvider.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePullRouteCursorAdvanceProvider.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePullRouteHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePullRouteHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePushRouteExistingOperationRowsProvider.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePushRouteHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePushRouteOperationOptionsProvider.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePushRoutePersistenceProvider.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePushRouteProcessingResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflinePushRouteServerSnapshotProvider.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDevicePermissionReadinessStatusPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRestRequestAdapter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRestRequestData.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRouteBootstrapPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRouteBootstrapStatusPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRouteBootstrapper.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRouteContracts.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRoutePermissionCallbackFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRouteRegistrar.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRouteRegistrationPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRouteRuntimeConfigurator.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/OfflineRouteValidationHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentCapabilityPermissionCallbackAdapter.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentController.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentFeeSnapshotRouteHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentFeeSnapshotRouteHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteBootstrapPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteBootstrapStatusPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteBootstrapper.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteContracts.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteDependencyStatusPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRoutePermissionCallbackFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteReadinessStatusPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteRegistrar.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteRegistrationPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentRouteValidationHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/PosPaymentWebhookPermissionCallbackAdapter.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/ReferenceCardSearchRouteHandler.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/ReportsController.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/ScryDexCatalogController.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/ScryDexWebhookController.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Auth/AdminAccess.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Auth/CapabilityRegistry.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Auth/RoleManager.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Autoloader.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Bootstrap/Activator.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Bootstrap/Deactivator.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Bootstrap/DependencyChecker.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Bootstrap/Plugin.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Buylist/BuylistOfferPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Buylist/BuylistOfferPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Buylist/BuylistReceiptPresenter.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Buylist/BuylistSubmissionIntakeParser.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Buylist/BuylistSubmissionIntakeRequest.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Buylist/BuylistSubmissionIntakeValidationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Buylist/BuylistSubmissionStatus.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Buylist/BuylistTradeInValuePlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditEntryType.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditLedgerRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditLedgerService.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditLedgerStorage.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditPostingDecision.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditPostingPolicy.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditPostingRequest.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditPostingResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditRestPostingParser.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditRestPostingValidationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Credit/CustomerCreditRestPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventFilters.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventPaymentStatus.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Events/EventPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRegistrationDecision.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRegistrationDuplicateGuard.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRegistrationInput.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRegistrationMode.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRegistrationNotificationMailer.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRegistrationPolicy.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRegistrationRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRegistrationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRegistrationService.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRegistrationStatus.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventRepository.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Events/EventShortcodes.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Events/EventStatus.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/FeatureFlags/FeatureFlagRegistry.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/FeatureFlags/FeatureFlags.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventoryExternalMappingRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventoryIntakeParser.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventoryIntakePersistencePlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventoryIntakePersistencePlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventoryIntakeRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventoryIntakeRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventoryIntakeRequest.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventoryIntakeValidationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventoryItemValidator.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventorySearchQueryBuildPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventorySearchQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventorySearchQueryPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventorySearchQueryPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventorySearchRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventorySearchRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventorySearchRequest.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventorySearchRequestParser.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventorySearchResponsePresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventorySearchValidationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Inventory/InventoryStatus.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Logging/AuditLogger.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Logging/Logger.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Logging/Redactor.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/BuylistSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/CustomerCreditSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/EventsSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/FoundationSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/InventoryPricingSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/Migration.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/MigrationRunner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/OfflineSyncSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/PosPaymentSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/ProviderPriceObservationSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/ReservationSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/ScryDexCatalogSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/SyncSchema.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Migrations/Version0001Foundation.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0002InventoryPricing.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0003Events.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0004CustomerCredit.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0005Buylist.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0006Sync.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0007Reservations.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0008OfflineSync.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0009PosPayments.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0010ProviderPriceObservations.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0011ReferenceCardImages.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0012ScryDexCatalog.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0013ExternalInventoryMappings.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0014ReferenceVariantImages.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0015ProviderPriceReferenceBackfill.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0016InventoryQuantityOnHand.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0017SquareLocationMapping.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Offline/OfflineConflictListRequest.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictListRequestParser.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictListRequestValidationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictListResponsePresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictResolutionPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictResolutionPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictResolutionQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictResolutionQueryPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictResolutionRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictResolutionRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictResolutionRequest.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictResolutionRequestParser.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineConflictResolutionValidationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceAccessDecision.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceAccessPolicy.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDevicePairingAuthorizationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDevicePairingAuthorizer.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDevicePairingAuthorizerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDevicePairingPermissionCallbackAdapter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDevicePairingRequest.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDevicePairingRequestParser.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDevicePairingValidationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationCredentialIssuer.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationCredentials.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationInsertQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationInsertQueryPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationService.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceRegistrationServiceResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceSessionPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceSessionPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceSessionUpdateQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceSessionUpdateQueryPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceSessionUpdateRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceSessionUpdateRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceTokenAuthenticator.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceTokenLookupPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineDeviceTokenLookupPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineOperationEnvelope.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Offline/OfflinePullChangeQueryBuildPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullChangeQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullChangeQueryPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullChangeQueryPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullChangeRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullChangeRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullChangeSetProvider.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvancePlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvancePlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvanceQueryBuildPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvanceQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvanceRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullCursorAdvanceRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullDeviceContextPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullDeviceContextPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullRequest.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullRequestParser.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullRequestValidationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePullResponsePresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushBatchResolutionPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushBatchResolver.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationQueryBuildPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationRepositoryExecutionGate.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationRepositoryExecutionResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationTransactionExecutionResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationTransactionExecutor.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationTransactionPreflight.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushCanonicalMutationTransactionPreflightResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsQueryBuildPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsQueryPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsQueryPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushExistingOperationRowsRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushOperationResolutionPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushOperationResolver.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushPayload.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushPayloadParser.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushPayloadValidationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushPersistencePlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushPersistencePlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushPersistenceQueryBuildPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushPersistenceQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushPersistenceRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushPersistenceRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotQueryBuildPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotQueryPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotQueryPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflinePushServerSnapshotRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceLookupPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceLookupPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceLookupQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceLookupQueryPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionCallbackAdapter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionResolution.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionResolver.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDevicePermissionResolverFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceRowNormalizationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Offline/OfflineRegisteredDeviceRowNormalizer.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Overrides/ManagerOverrideDecision.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Overrides/ManagerOverridePersistencePlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Overrides/ManagerOverridePersistencePlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Overrides/ManagerOverridePolicy.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Overrides/ManagerOverrideRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Overrides/ManagerOverrideRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Overrides/ManagerOverrideRequest.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotQueryBuildPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotQueryPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotQueryPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentFeeSnapshotRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogExecutionRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogExecutionRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogQueryBuildPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogRepositoryExecutionGate.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogRepositoryExecutionResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogTransactionExecutionResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogTransactionExecutor.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogTransactionPreflight.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Payments/PosPaymentLogTransactionPreflightResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Pricing/PriceEvaluation.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Pricing/PriceRounding.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Pricing/PricingCalculator.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/PublicSite/InventorySearchPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/PublicSite/InventorySearchShortcode.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/PublicSite/ProductShelfShortcode.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Reports/StoreReportsPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Reservations/ReservationExpiryPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Reservations/ReservationExpiryPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Reservations/ReservationRequest.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Reservations/ReservationResult.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Reservations/ReservationService.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Reservations/ReservationStatus.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Reservations/ReservationStorage.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Reservations/WpdbReservationStorage.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Scheduler/DailyScheduleCalculator.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Scheduler/DailyScheduler.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/ScryDex/ScryDexCardNormalizationResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexCardNormalizer.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexCardsSyncWorker.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexCardsSyncWorkerPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexHttpProvider.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexPersistencePlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexPersistencePlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexPersistenceQueryBuildPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexPersistenceQueryBuilder.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexPersistenceRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexPersistenceRepositoryReadinessPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexPersistenceRepositoryResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexProvider.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexProviderFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexResult.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/ScryDex/ScryDexScheduledRefreshPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexScheduledRefreshRunner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexSyncCheckpoint.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexSyncCheckpointRepositoryPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexSyncDryRunPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexSyncExecutionGate.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexSyncPagePlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexSyncPageProcessor.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexSyncPlanner.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/ScryDex/ScryDexUsageBudgetPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexWebhookEventRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexWebhookPayloadParser.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexWebhookRefreshRunner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexWebhookSignatureVerifier.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/ScryDex/ScryDexWebhookSyncDispatcher.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Settings/BrandingSettings.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Settings/CustomerCreditSettings.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Settings/FulfillmentNotificationSettings.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Settings/GradingCompanySettings.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Settings/InventoryRouteRuntimeSettings.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Settings/OfflinePairingAuthorizationSettings.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Settings/OfflineRouteRuntimeSettings.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Settings/ScryDexProviderSettings.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Settings/ScryDexScheduleSettings.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Settings/ScryDexUsageBudgetSettings.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Settings/Settings.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Settings/SettingsPage.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/SquareInventoryBatchSyncPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/SquareInventoryBatchSyncReadinessPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/SquareInventoryProjectionExecutionResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/SquareInventoryProjectionExecutor.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/SquareInventoryProjectionPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/SquareInventoryProjectionPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/SquareInventorySyncReadinessPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/SquareInventorySyncRequestPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/SquareInventorySyncRequestPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/SquarePaymentDelegationPolicy.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Square/WooCommerceSquareExtensionStatus.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Staging/StagingSafety.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Version.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/WooCommerce/Compatibility.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/WooCommerce/CustomerAccountPortalController.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/CustomerAccountPortalPresenter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/GroupedInventoryProductHooks.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/HookContract.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionExecutionResult.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionExecutor.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/InventoryProductWriteRequestPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/InventoryProductWriteRequestPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/SerializedCartItemValidator.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/SerializedInventoryHookRegistry.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/SerializedOrderLifecyclePlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/SerializedOrderLifecyclePlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/SerializedOrderLineMetadataPlan.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/SerializedOrderLineMetadataPlanner.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/WooCommerceInventoryProductWriter.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/tcg-store-platform.php | Project source/configuration | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/tests/Integration/Database/README.md | End-to-end or contract test | .md | Test file |
| apps/wordpress-plugin/tests/Integration/Rest/README.md | End-to-end or contract test | .md | Test file |
| apps/wordpress-plugin/tests/Integration/WooCommerce/README.md | End-to-end or contract test | .md | Test file |
| apps/wordpress-plugin/tests/TestCase.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ApiRouteContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/BuylistOfferPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/BuylistRouteContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/BuylistSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/BuylistSubmissionIntakeParserTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/BuylistSubmissionStatusTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/BuylistTradeInValuePlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CapabilityRegistryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CustomerAccountPortalControllerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CustomerAccountPortalPresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CustomerCreditEntryTypeTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CustomerCreditLedgerServiceTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CustomerCreditPostingPolicyTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CustomerCreditRestPostingParserTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CustomerCreditRestPresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CustomerCreditRouteContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CustomerCreditSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/CustomerRouteContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/DailyScheduleCalculatorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventFiltersTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventPresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventRegistrationDuplicateGuardTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventRegistrationInputTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventRegistrationModeTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventRegistrationNotificationMailerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventRegistrationPolicyTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventRegistrationResultTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventRegistrationStatusTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventShortcodesTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventStatusTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/EventsSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ExternalInventoryMappingsMigrationTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/FeatureFlagsTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/FoundationSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/FulfillmentOrderControllerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/GroupedInventoryProductHooksTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryAdminWorkspaceUiTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryExternalMappingRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryIntakeParserTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryIntakePersistencePlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryIntakeRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryIntakeRouteHandlerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryItemValidatorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryMarkSoldRouteHandlerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryPricingSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryProductProjectionExecutorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryProductProjectionPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryProductWriteRequestPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryPublicReadPermissionCallbackAdapterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryRouteBootstrapperTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryRouteContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryRouteDependencyFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryRouteRegistrarTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryRouteRegistrationPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryRouteRuntimeConfiguratorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryRouteRuntimeSettingsTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventorySearchQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventorySearchQueryPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventorySearchRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventorySearchRequestParserTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventorySearchResponsePresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventorySearchRouteHandlerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryStatusTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryWorkspacePresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/KioskOrderRouteContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ManagerOverridePersistencePlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ManagerOverridePolicyTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ManagerOverrideRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/MigrationRunnerPlanTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineConflictListRequestParserTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineConflictListResponsePresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineConflictResolutionPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineConflictResolutionQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineConflictResolutionRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineConflictResolutionRequestParserTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineConflictRouteHandlerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineConnectorManifestControllerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineConnectorManifestPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineControllerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceAccessPolicyTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDevicePairingAuthorizerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDevicePairingPermissionCallbackAdapterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRequestParserTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRouteReadinessPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDevicePairingRouteReadinessStatusPresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationCredentialIssuerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationInsertQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationRouteHandlerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceRegistrationServiceTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceSessionPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceSessionUpdateQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceSessionUpdateRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceTokenAuthenticatorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineDeviceTokenLookupPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullChangeQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullChangeQueryPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullChangeRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullChangeSetProviderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullCursorAdvancePlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullCursorAdvanceQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullCursorAdvanceRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullDeviceContextPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullRequestParserTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullResponsePresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullRouteChangeSetProviderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullRouteCursorAdvanceProviderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullRouteHandlerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePullRouteHandlerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushBatchResolverTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationRepositoryExecutionGateTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationTransactionExecutorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushCanonicalMutationTransactionPreflightTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushExistingOperationRowsQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushExistingOperationRowsQueryPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushExistingOperationRowsRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushOperationResolverTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushPayloadParserTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushPersistencePlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushPersistenceQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushPersistenceRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushRouteExistingOperationRowsProviderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushRouteHandlerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushRouteOperationOptionsProviderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushRouteServerSnapshotProviderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushServerSnapshotQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushServerSnapshotQueryPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflinePushServerSnapshotRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceLookupPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceLookupQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionCallbackAdapterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionReadinessStatusPresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRegisteredDevicePermissionResolverTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceRowNormalizerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRegisteredDeviceSyncRouteHandlerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRestRequestAdapterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRouteBootstrapPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRouteBootstrapStatusPresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRouteBootstrapperRuntimeWiringTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRouteBootstrapperTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRouteContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRoutePermissionCallbackFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrarTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRouteRegistrationPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRouteRuntimeConfiguratorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineRouteValidationHandlerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/OfflineSyncSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentControllerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotQueryPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotRepositoryReadinessTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotRouteHandlerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentFeeSnapshotRouteHandlerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentLogExecutionRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentLogPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentLogQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentLogRepositoryExecutionGateTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentLogRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentLogTransactionExecutorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentLogTransactionPreflightTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteBootstrapPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteBootstrapStatusPresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteBootstrapperTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteDependencyStatusPresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRoutePermissionCallbackFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteReadinessStatusPresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteRegistrarTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteRegistrationPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentRouteValidationHandlerFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PosPaymentSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PricingCalculatorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ProductShelfShortcodeTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ProviderPriceObservationSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ProviderPriceReferenceBackfillMigrationTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PublicInventorySearchPresenterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/PublicInventorySearchShortcodeTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/RedactorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ReferenceCardImagesMigrationTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ReferenceVariantImagesMigrationTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ReservationExpiryPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ReservationSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ReservationServiceTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexCardNormalizerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexCardsSyncWorkerPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexCardsSyncWorkerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexCatalogAdminWorkspaceTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexCatalogControllerContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexCatalogSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexHttpProviderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexPersistencePlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexPersistenceQueryBuilderTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexPersistenceRepositoryReadinessPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexPersistenceRepositoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexProviderFactoryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexProviderSettingsTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexScheduleSettingsTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexScheduledRefreshPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexSyncCheckpointRepositoryPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexSyncCheckpointTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexSyncDryRunPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexSyncExecutionGateTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexSyncPageProcessorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexUsageBudgetPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexUsageBudgetSettingsTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexWebhookControllerContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexWebhookPayloadParserTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexWebhookRefreshRunnerSourceTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexWebhookSignatureVerifierTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexWebhookSyncDispatcherTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SerializedCartItemValidatorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SerializedInventoryHookRegistryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SerializedOrderLifecyclePlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SerializedOrderLineMetadataPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SettingsPageSourceTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SettingsTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SquareInventoryBatchSyncPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SquareInventoryBatchSyncReadinessPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SquareInventoryProjectionExecutorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SquareInventoryProjectionPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SquareInventorySyncReadinessPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SquareInventorySyncRequestPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SquarePaymentDelegationPolicyTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/StagingSafetyTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/StoreReportsPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SyncSchemaTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/WooCommerceInventoryProductWriterTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/WooCommerceSquareExtensionStatusTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/WpdbReservationStorageTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/bootstrap-smoke.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/lint.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/run.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/wordpress-integration-smoke.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/wordpress-inventory-search-benchmark.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/wordpress-migration-rehearsal.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/wordpress-staging-inventory-smoke.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/wp-now-blueprint.json | End-to-end or contract test | .json | Test file |
| apps/wordpress-plugin/uninstall.php | Project source/configuration | .php | Covered by package/build/smoke tests or pending targeted test |
| docs/API.md | Project source/configuration | .md | Covered by related unit/contract test |
| docs/API_ROUTES.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/ARCHITECTURE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/BACKGROUND_JOBS.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/BRANDING.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/BUYLIST.md | Project source/configuration | .md | Covered by related unit/contract test |
| docs/CHANGELOG.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/CONNECTOR_STATUS.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/CUSTOMER_CREDIT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/DATABASE.md | Project source/configuration | .md | Covered by related unit/contract test |
| docs/DATABASE_TABLES.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/DECISIONS.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/DEPLOYMENT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/DEPLOYMENT_GODADDY.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/DEPLOYMENT_OFFLINE_APP.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/DEVELOPMENT_WORKFLOW.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/EVENTS.md | Project source/configuration | .md | Covered by related unit/contract test |
| docs/FINAL_CLICKTHROUGH_2026-06-14.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/OFFLINE_APP_PRODUCT_REQUIREMENTS.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/OFFLINE_SYNC.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/PAYMENTS_POS.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/PHASE_0_BLUEPRINT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/PHASE_1_FOUNDATION.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/PHASE_2_INVENTORY_PRICING.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/RELEASE_NOTES.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/ROADMAP.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/SCRYDEX_INTEGRATION.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/SECURITY.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/STAGING.md | Project source/configuration | .md | Covered by related unit/contract test |
| docs/SYSTEM_MAP.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/TESTING.md | Project source/configuration | .md | Covered by related unit/contract test |
| docs/UI_FLOWS.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/audit/deep-audit-2026-06-24T09-03-53-224Z/summary.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| docs/branding/the-pug-customer-ui.css | Project source/configuration | .css | Covered by package/build/smoke tests or pending targeted test |
| docs/branding/the-pug-rebrand-plan.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/runbooks/CODEX_FULL_RELEASE_INSTALL_PROMPT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/runbooks/LAN_SERVER_CODEX_INSTALL.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| docs/runbooks/MIDDLEMAN_CODEX_DEPLOYMENT_PROMPT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| exports/inventory-snapshot-20260623T181543Z/local_app_inventory_items.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| exports/inventory-snapshot-20260623T181543Z/local_app_operation_queue.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| exports/inventory-snapshot-20260623T181543Z/local_app_reference_cards.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| exports/inventory-snapshot-20260623T181543Z/website_inventory_items.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| exports/inventory-snapshot-20260623T181543Z/website_reference_cards.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| fixtures/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| fixtures/mocks/pos/payment-responses.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| fixtures/mocks/scrydex/cards-page-1.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| fixtures/mocks/scrydex/checkpoint-resume.json | Project source/configuration | .json | Covered by related unit/contract test |
| fixtures/seed/development-data.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| migrations/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| package-lock.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| package.json | Project source/configuration | .json | Covered by related unit/contract test |
| packages/api-client/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| packages/api-client/src/squareInventoryAdapter.mjs | Project source/configuration | .mjs | Covered by related unit/contract test |
| packages/api-client/src/woocommerceProductAdapter.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| packages/api-client/tests/square-inventory-adapter.md | End-to-end or contract test | .md | Test file |
| packages/api-client/tests/square-inventory-adapter.mjs | End-to-end or contract test | .mjs | Test file |
| packages/api-client/tests/woocommerce-product-adapter.md | End-to-end or contract test | .md | Test file |
| packages/api-client/tests/woocommerce-product-adapter.mjs | End-to-end or contract test | .mjs | Test file |
| packages/barcode-labels/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| packages/pricing-engine/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| packages/pricing-engine/tests/README.md | End-to-end or contract test | .md | Test file |
| packages/sync-engine/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| packages/sync-engine/src/offlineConflictPolicy.mjs | Project source/configuration | .mjs | Covered by related unit/contract test |
| packages/sync-engine/tests/offline-conflict-policy.mjs | End-to-end or contract test | .mjs | Test file |
| packages/sync-engine/tests/scrydex-checkpoint-resume.md | End-to-end or contract test | .md | Test file |
| packages/validation/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| packages/validation/src/posPaymentPolicy.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| packages/validation/tests/pos-payment-policy.mjs | End-to-end or contract test | .mjs | Test file |
| playwright.config.ts | Project source/configuration | .ts | Covered by package/build/smoke tests or pending targeted test |
| release-package/ADMIN_USER_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/API_AND_CONNECTOR_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/BACKUP_RESTORE_AND_RECOVERY_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/CHANGELOG.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/CLIENT_HANDOVER_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/CODE_MAP.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/CREDENTIAL_INVENTORY_TEMPLATE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/CUSTOMER_CREDIT_AND_BUYLIST_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/DATABASE_SCHEMA_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/ENVIRONMENT_VARIABLES.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/EVENTS_AND_TOPDECK_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/GO_LIVE_VERIFICATION_CHECKLIST.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/INSTALLATION_AND_DEPLOYMENT_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/KIOSK_AND_OFFLINE_APP_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/OPEN_ITEMS.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/OWNER_OPERATIONS_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/POS_AND_PAYMENTS_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/PRICING_AND_INVENTORY_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/QA_TESTING_AND_RELEASE_CHECKLIST.md | Project source/configuration | .md | Covered by related unit/contract test |
| release-package/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| release-package/REVISION_LOG.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/SECURE_CREDENTIAL_HANDOFF.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/SECURITY_AND_PERMISSIONS_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/SOURCE_CODE_COMMENTING_REPORT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/SOURCE_CODE_INDEX.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/STAFF_USER_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/SYNC_ENGINE_GUIDE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/TECHNICAL_ARCHITECTURE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| release-package/TROUBLESHOOTING_RUNBOOK.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| scripts/README.md | Build/deployment/test automation | .md | Covered by related unit/contract test |
| scripts/copy-production-release-to-usb.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/generate-release-documentation.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/import-square-catalog-local-inventory.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/lib/local-env.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/lib/staging-ssh.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/local-clear-card-inventory-and-queues.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/local-sync-smoke.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/package-local-sync-server.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/package-production-release.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/package-wordpress-plugin.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/package-wordpress-theme.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/prepare-pug-grading-singles-import.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-clear-card-inventory.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/production-configure-commerce-menu.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-configure-public-pages.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-configure-scrydex.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-install-storefront-theme.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/production-install-wordpress-package.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/production-repair-imported-inventory.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-run-local-pickup-fulfillment-smoke.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-run-local-sync-inventory-smoke.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-run-local-sync-square-sale-smoke.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-run-local-sync-workflows-smoke.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-run-scrydex-index.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-run-woocommerce-card-smoke.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-seed-visible-card-inventory.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-upload-notification-sound.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-verify-active-syncs.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-verify-public-shortcodes.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-verify-reference-search.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/production-verify-scrydex-catalog.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/run-offline-app-rust-tests.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/run-offline-app-windows-build.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/scrydex-live-smoke.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/square-one-card-standalone-probe.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/square-seed-pos-singles-layout.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-check-routes.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-configure-inventory-runtime.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-configure-offline-pairing.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-configure-scrydex.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-install-wordpress-package.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/staging-run-inventory-smoke.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-run-migration-rehearsal.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-run-offline-pairing-smoke.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-run-offline-sync-smoke.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-run-pending-migrations.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-run-scrydex-sync.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-run-search-benchmark.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/staging-upload-wordpress-package.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/tests/local-clear-demo-data-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/local-sync-server-package-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/local-sync-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-clear-card-inventory-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-commerce-menu-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-install-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-local-pickup-fulfillment-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-local-sync-inventory-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-local-sync-square-sale-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-local-sync-workflows-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-notification-sound-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-public-pages-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-public-shortcodes-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-reference-search-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-release-package-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-scrydex-config-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-scrydex-index-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-scrydex-verify-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-theme-install-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/production-woocommerce-card-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/pug-grading-singles-import-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/scrydex-live-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/square-local-inventory-import-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/square-one-card-standalone-probe-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/square-pos-singles-layout-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-install-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-inventory-runtime-config-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-inventory-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-migration-rehearsal-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-offline-pairing-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-offline-pairing-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-offline-sync-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-pending-migrations-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-route-check-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-scrydex-config-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-scrydex-sync-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-search-benchmark-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-ssh-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/staging-upload-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/wordpress-package-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/wp-env/check-required-test-plan.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/wp-env/report-pending-phpunit.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/wp-env/seed-dev-data.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/wp-env/tcg-local-safety.php | Build/deployment/test automation | .php | Covered by package/build/smoke tests or pending targeted test |
| scripts/wp-env/verify-no-production-secrets.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| tests/README.md | End-to-end or contract test | .md | Covered by related unit/contract test |
| tests/e2e/README.md | End-to-end or contract test | .md | Covered by related unit/contract test |
| tests/e2e/admin-status.spec.ts | End-to-end or contract test | .ts | Covered by related unit/contract test |
| tests/e2e/public-production-smoke.spec.ts | End-to-end or contract test | .ts | Covered by related unit/contract test |
| tests/migration/reservation-double-sell.md | End-to-end or contract test | .md | Covered by related unit/contract test |
| tests/offline-sync/README.md | End-to-end or contract test | .md | Covered by related unit/contract test |
| tests/rest/customer-credit-ledger.md | End-to-end or contract test | .md | Covered by related unit/contract test |
| tests/rest/manager-overrides.md | End-to-end or contract test | .md | Covered by related unit/contract test |
