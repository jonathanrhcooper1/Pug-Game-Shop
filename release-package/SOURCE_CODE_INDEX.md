# Source Code Index

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.1
Release date: 2026-07-18
Last updated: 2026-07-18
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
| PUG_ARCHITECTURE_AND_DATA_FLOW.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| PUG_OPERATIONS_RUNBOOK.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| PUG_ROOT_CAUSE_REPORT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| PUG_TEST_EVIDENCE.md | Project source/configuration | .md | Covered by related unit/contract test |
| README.md | Project source/configuration | .md | Covered by related unit/contract test |
| REVISION_LOG.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| SYNC_QUEUE_REPORT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| TEST_RESULTS.md | Project source/configuration | .md | Covered by related unit/contract test |
| UI_REVIEW_REPORT.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/.env.example | Project source/configuration | .example | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| apps/local-sync-server/config/windows-service.manifest.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/docs/scrydex-pricing-mapping.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/package.json | Project source/configuration | .json | Covered by related unit/contract test |
| apps/local-sync-server/src/authoritativeLedger.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/cashDrawerKick.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/cli.mjs | LAN middleman server source | .mjs | Covered by related unit/contract test |
| apps/local-sync-server/src/dymoLabelPrinter.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/exchangeRateProvider.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/gradedPricingProviders.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/lanServerUrl.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/localSyncDiscovery.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/localSyncHttpServer.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/localSyncServerContract.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/localSyncStore.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/pricingEngine.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/src/scrydexCatalogIndexer.mjs | LAN middleman server source | .mjs | Covered by related unit/contract test |
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
| apps/local-sync-server/src/wordpressScryDexWebhookRelay.mjs | LAN middleman server source | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tests/authoritative-ledger.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/cash-drawer-kick.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/dymo-label-printer.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/exchange-rate-provider.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/fixtures/scrydex-validation-pages.json | End-to-end or contract test | .json | Test file |
| apps/local-sync-server/tests/fixtures/sync-reconciliation-report.json | End-to-end or contract test | .json | Test file |
| apps/local-sync-server/tests/graded-pricing-providers.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-discovery.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-barcode-history.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-cash-drawer-session.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-checkout.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-contract.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-credit-adjustment.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-event-create.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-fulfillment.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-hold-expiry.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-inventory-quantity-update.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-kiosk-payment.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-locations.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-maintenance.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-multi-client.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-persistence.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-projection-delivery.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-runtime.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-scrydex-catalog-jobs.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-square-inventory-reconciliation.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-square-sale-removal-sync.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-square-sales-reporting.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-square-terminal.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-trade-ins.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-users-health.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-woocommerce-sale-atomicity.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/local-sync-server-wordpress-inventory-square-sync.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/pricing-engine.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/recovery-migration-tools.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/scrydex-catalog-indexer-pagination.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/scrydex-reference-search.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/scrydex-validation-harness.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/square-catalog-inventory-syncer.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/square-inventory-counts-puller.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/square-sales-reports-puller.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/sync-reconciliation-report.mjs | End-to-end or contract test | .mjs | Test file |
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
| apps/local-sync-server/tests/wordpress-inventory-update-push.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-kiosk-push.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-reports-pull.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tests/wordpress-scrydex-webhook-relay.mjs | End-to-end or contract test | .mjs | Test file |
| apps/local-sync-server/tools/daily-price-sync.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/dump-inventory-snapshots.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/force-pull-website.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/lib/barcode-alias-migration.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/lib/ops-common.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/lib/recovery-common.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/lib/trade-reconciliation.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/migrate-barcode-aliases.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/reconcile-trade-inventory.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/scrydex-validation.mjs | Project source/configuration | .mjs | Covered by related unit/contract test |
| apps/local-sync-server/tools/start-visual-qa-server.mjs | Project source/configuration | .mjs | Covered by package/build/smoke tests or pending targeted test |
| apps/local-sync-server/tools/sync-reconciliation-report.mjs | Project source/configuration | .mjs | Covered by related unit/contract test |
| apps/offline-app/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| apps/offline-app/config/sqlite-schema.manifest.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/config/windows-package.manifest.json | Project source/configuration | .json | Covered by related unit/contract test |
| apps/offline-app/package-lock.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/package.json | Project source/configuration | .json | Covered by related unit/contract test |
| apps/offline-app/pnpm-lock.yaml | Project source/configuration | .yaml | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/pnpm-workspace.yaml | Project source/configuration | .yaml | Covered by package/build/smoke tests or pending targeted test |
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
| apps/offline-app/src-tauri/target/release/.fingerprint/tcg-store-offline-7d6289b0b20794bc/build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
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
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-d9d7e8c5dc5d81df/run-build-script-build-script-build.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-e55d531b7efae375/bin-tcg-store-offline.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/.fingerprint/tcg-store-offline-e55d531b7efae375/lib-tcg_store_offline_lib.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
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
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-d9d7e8c5dc5d81df/out/__global-api-script.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-d9d7e8c5dc5d81df/out/acl-manifests.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-d9d7e8c5dc5d81df/out/capabilities.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-d9d7e8c5dc5d81df/out/tauri-codegen-assets/0a8712294b982e0afc02927f8c52c19d0070bf0f190beda597ca7370ed811824.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-d9d7e8c5dc5d81df/out/tauri-codegen-assets/1d17618491e6d958f67e4ad94fd236c4223e5be347df95ec7c6a2738e9d3a11e.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-d9d7e8c5dc5d81df/out/tauri-codegen-assets/5dc30b01c3c4347d5e3d51af9cdb76198c42a0ca467f1b129948afb34efde8ac.js | Offline app Windows shell source | .js | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/tcg-store-offline-d9d7e8c5dc5d81df/out/tauri-codegen-assets/dc5ddf27126d2afde83345bcbc5e0f1b3de7e10db2fb3b3e9d35ec265a99572f.css | Offline app Windows shell source | .css | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/build/thiserror-040be03b201db952/out/private.rs | Offline app Windows shell source | .rs | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src-tauri/tauri.conf.json | Offline app Windows shell source | .json | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/App.tsx | Offline app frontend source | .tsx | Covered by related unit/contract test |
| apps/offline-app/src/data/localSyncServerClient.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/offlineLocalQueue.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/offlineQueueBridge.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/offlineWorkspace.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
| apps/offline-app/src/data/tauriDevicePairingAdapter.ts | Offline app frontend source | .ts | Covered by package/build/smoke tests or pending targeted test |
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
| apps/wordpress-plugin/src/Api/V1/FulfillmentOrderMutationPolicy.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/HealthController.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/InventoryCapabilityPermissionCallbackAdapter.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/InventoryController.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryIntakeRouteHandlerFactory.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryMarkSoldRouteHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/Api/V1/InventoryProjectionController.php | WordPress plugin source | .php | Covered by related unit/contract test |
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
| apps/wordpress-plugin/src/Api/V1/KioskOrderController.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Api/V1/KioskReservationReplay.php | WordPress plugin source | .php | Covered by related unit/contract test |
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
| apps/wordpress-plugin/src/Api/V1/ScryDexWebhookRelayController.php | WordPress plugin source | .php | Covered by related unit/contract test |
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
| apps/wordpress-plugin/src/Inventory/InventoryProjectionRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
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
| apps/wordpress-plugin/src/Migrations/Version0016ScryDexWebhookRelay.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0017InventoryProjectionQuantity.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
| apps/wordpress-plugin/src/Migrations/Version0018ScryDexWebhookRelayRepair.php | WordPress plugin source | .php | Covered by package/build/smoke tests or pending targeted test |
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
| apps/wordpress-plugin/src/WooCommerce/SerializedOrderRefundHandler.php | WordPress plugin source | .php | Covered by related unit/contract test |
| apps/wordpress-plugin/src/WooCommerce/SerializedReturnReviewRepository.php | WordPress plugin source | .php | Covered by related unit/contract test |
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
| apps/wordpress-plugin/tests/Unit/FulfillmentOrderMutationPolicyTest.php | End-to-end or contract test | .php | Test file |
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
| apps/wordpress-plugin/tests/Unit/InventoryProjectionControllerContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/InventoryProjectionQuantityMigrationTest.php | End-to-end or contract test | .php | Test file |
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
| apps/wordpress-plugin/tests/Unit/KioskReservationReplayTest.php | End-to-end or contract test | .php | Test file |
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
| apps/wordpress-plugin/tests/Unit/ScryDexWebhookRelayControllerContractTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexWebhookRelayMigrationTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexWebhookRelayRepairMigrationTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexWebhookSignatureVerifierTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/ScryDexWebhookSyncDispatcherTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SerializedCartItemValidatorTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SerializedInventoryHookRegistryTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SerializedOrderLifecyclePlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SerializedOrderLineMetadataPlannerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SerializedOrderRefundHandlerTest.php | End-to-end or contract test | .php | Test file |
| apps/wordpress-plugin/tests/Unit/SerializedReturnReviewRepositoryTest.php | End-to-end or contract test | .php | Test file |
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
| debug-artifacts/BUG_REPRODUCTION.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| debug-artifacts/FLOW_TRACE.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| debug-artifacts/INSTALL_VERIFICATION.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
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
| docs/branding/the-pug-customer-ui.css | Project source/configuration | .css | Covered by package/build/smoke tests or pending targeted test |
| docs/branding/the-pug-rebrand-plan.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| evidence/baseline-20260718/baseline-results.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| evidence/final-20260718/PUG_SQUARE_REVERSIBLE_SMOKE.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| evidence/final-20260718/test-site-scrydex-webhook-roundtrip.json | Project source/configuration | .json | Covered by related unit/contract test |
| evidence/final-20260718/ui/ui-acceptance.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| fixtures/README.md | Project source/configuration | .md | Covered by related unit/contract test |
| fixtures/mocks/pos/payment-responses.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| fixtures/mocks/scrydex/cards-page-1.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| fixtures/mocks/scrydex/checkpoint-resume.json | Project source/configuration | .json | Covered by related unit/contract test |
| fixtures/seed/development-data.json | Project source/configuration | .json | Covered by package/build/smoke tests or pending targeted test |
| migrations/20260718_authoritative_inventory_sync_down.sql | Project source/configuration | .sql | Covered by package/build/smoke tests or pending targeted test |
| migrations/20260718_authoritative_inventory_sync_up.sql | Project source/configuration | .sql | Covered by package/build/smoke tests or pending targeted test |
| migrations/20260718_authoritative_inventory_sync_v2_rollback.md | Project source/configuration | .md | Covered by package/build/smoke tests or pending targeted test |
| migrations/20260718_authoritative_inventory_sync_v2_up.sql | Project source/configuration | .sql | Covered by package/build/smoke tests or pending targeted test |
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
| pnpm-lock.yaml | Project source/configuration | .yaml | Covered by package/build/smoke tests or pending targeted test |
| pnpm-workspace.yaml | Project source/configuration | .yaml | Covered by package/build/smoke tests or pending targeted test |
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
| scripts/generate-release-documentation.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/import-square-catalog-local-inventory.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/lib/local-env.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/lib/staging-ssh.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/live-square-reversible-smoke.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
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
| scripts/run-final-local-ui-acceptance.mjs | Build/deployment/test automation | .mjs | Covered by package/build/smoke tests or pending targeted test |
| scripts/run-offline-app-rust-tests.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/run-offline-app-windows-build.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/scrydex-live-smoke.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
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
| scripts/test-data/cleanup-pug-sanitized-e2e-fixtures.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/test-data/pug-sanitized-e2e-fixtures-lib.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/test-data/setup-pug-sanitized-e2e-fixtures.mjs | Build/deployment/test automation | .mjs | Covered by related unit/contract test |
| scripts/tests/live-square-reversible-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
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
| scripts/tests/sanitized-e2e-fixture-lifecycle.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/scrydex-live-smoke-contract.mjs | Build/deployment/test automation | .mjs | Test file |
| scripts/tests/square-local-inventory-import-contract.mjs | Build/deployment/test automation | .mjs | Test file |
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
