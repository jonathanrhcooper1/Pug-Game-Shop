# Connector Status Report

Date: 2026-06-17

## WordPress / WooCommerce

Status: Working in production verification.

- Production plugin version reported as `0.202.0`.
- Production database version reported as `15`.
- Public shortcodes for inventory/product shelf/events/event detail are registered and render without raw shortcode leakage.
- WooCommerce product projection and local pickup fulfillment were exercised through guarded smoke verification.

## ScryDex

Status: Working.

- Production catalog verification passed.
- Reference search passed against the production WordPress catalog cache with ScryDex fallback order preserved.
- Catalog contains cards, sets, variants, images, provider observations, and provider price points.
- Graded price support is present in the code path through normalized `raw_or_graded`, grading company, grade, and price-point storage. Exact graded values still depend on ScryDex/provider payload availability for a given card/grade/company.

## Local Sync Middleman

Status: Working in automated verification.

- Local app shows the production website as `https://j84.285.myftpupload.com`.
- LAN/local sync server tests passed.
- Active sync verifier passed inventory, customer, credit, event, kiosk, Square sale, and pickup flows.
- One local queue/conflict item is visible in the current app session and was not cleared during audit.

## Offline / Employee App

Status: Buildable and testable.

- TypeScript typecheck passed.
- Rust/Tauri command tests passed.
- Production Vite build passed.
- Windows installer path is included in the production release manifest.

## Square

Status: Connector scaffold and policy tests pass; live hardware/payment capture not tested.

- Payment capture is delegated to the official WooCommerce Square extension.
- Local app supports Square receipt/reference capture and Square Terminal activation/reader handoff scaffold.
- Real reader push/card capture requires Square credentials, official extension setup, and hardware approval.

## Email

Status: Code paths exist; live sending not tested.

- Ready-for-pickup and receipt-style workflows are covered by planning/tests where available.
- Real SMTP/customer email authentication requires WordPress mail configuration or SMTP plugin credentials and explicit approval before sending real customer mail.

## Dymo LabelWriter

Status: UI/package support present; hardware not tested.

- Checkout and inventory flows expose label-print preparation paths.
- Physical Dymo LabelWriter 550 Turbo output requires installed driver/printer access on the target Windows station.

## TopDeck

Status: Not active in this production pass.

- Earlier direction removed TopDeck from the active focus. No live TopDeck credential or endpoint validation was performed.

