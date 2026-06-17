# Production Audit Report

Date: 2026-06-17
Branch: `production-readiness-audit`
Production URL audited: `https://j84.285.myftpupload.com`

## Executive Summary

The production-readiness pass is substantially green from an automated and read-only live verification standpoint. WordPress/plugin tests, local sync tests, offline app type/Rust tests, packaging tests, no-secret checks, public production Playwright checks, and active sync verification all passed.

No destructive production action was performed. No real payment capture was attempted. No real customer email was sent. Temporary production smoke records created by the guarded active-sync verifier were cleaned up by the verifier.

## Live Production Checks

- Public homepage, Singles, Sealed, Graded, Events, Cart, Buying, Contact, and 404 paths loaded without fatal/critical text, raw shortcodes, staging/test banners, localhost text, or console errors.
- ScryDex catalog verification passed with production plugin version `0.202.0` and database version `15`.
- Production reference search passed for `Charizard` with source order `wordpress_catalog_cache`, `scrydex_provider`; 193 results were available and images/prices were present in the response.
- Active sync verifier passed all listed syncs: ScryDex reference catalog, public shop shortcodes, local inventory push, WooCommerce product projection/Square sale path, customer credit push, customer upsert, event registration/check-in, kiosk order push, and local pickup fulfillment.

## Repairs/Improvements Included In This Branch

- Added public production smoke Playwright coverage in `tests/e2e/public-production-smoke.spec.ts`.
- Tightened event listing/detail rendering so event cards stay contained, link to detail pages, and use game-specific marks instead of a store-logo badge.
- Added/expanded local app checkout, customer profile, trade-in, reports, graded valuation, Square Terminal scaffold, queue, and event flows from the existing in-progress implementation.
- Expanded ScryDex graded price normalization and price-history fallback handling in the WordPress plugin and local sync server.
- Built the production release package with plugin, local sync middleman, employee app, and kiosk package manifests.

## Findings Requiring Human Approval Or Live Admin Action

- Live navigation/footer links still show some `http://j84.285.myftpupload.com` URLs. The source theme has HTTPS-forcing helpers, but the live site appears to need the latest theme package deployed or WordPress home/site URL/menu data corrected. This was not deployed because the audit prompt forbids direct production deployment without manual approval.
- The live homepage includes at least one WooCommerce placeholder thumbnail for a product/event card. This is content/product data, not a code fatal. Replace the product image in WordPress or deploy a theme fallback policy after approval.
- Square real card-reader capture was not tested. The platform delegates payment capture to the official WooCommerce Square extension and local app records Square receipt/reference data.
- Real SMTP/customer email delivery was not tested because the prompt forbids sending real customer emails without approval.
- Dymo LabelWriter hardware output was not tested because the printer is not available to Codex.

## Production Safety Notes

- `verify:no-production-secrets` passed.
- No production credentials were printed in command output.
- Production smoke scripts that can mutate production require explicit environment confirmation flags.
- Direct standalone runs of the WooCommerce card and pickup smoke scripts correctly refused to run without their confirmation flags. The aggregate active-sync verifier ran the guarded path and cleanup.

## Release Artifacts

- `dist/tcg-store-platform-0.202.0.zip`
- `dist/pug-local-sync-middleman-server.zip`
- `dist/the-pug-production-release-0.202.0.zip`
- `dist/the-pug-production-release-0.202.0/employee-app`
- `dist/the-pug-production-release-0.202.0/customer-kiosk`
- `apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/TCG Store Local_0.202.0_x64-setup.exe`

