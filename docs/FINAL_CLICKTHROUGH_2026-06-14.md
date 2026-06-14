# Final Clickthrough - 2026-06-14

## Automated Release Gates

- `npm.cmd test`: passed.
- `npm.cmd run build`: passed.
- `npm.cmd run verify:no-production-secrets`: passed.
- `npm.cmd run production:verify-reference-search`: passed.
- `node scripts/production-verify-active-syncs.mjs`: passed after rerunning a transient SSH handshake timeout on the reference-search subcheck.
- `npm.cmd run build:offline-app:windows`: passed.
- `npm.cmd run package:production-release`: passed.
- `npm.cmd run package:wordpress-theme`: passed.

## Website Pages Checked

- Home: passed; no console errors, broken images, staging banner, or horizontal overflow.
- Shop Singles: passed; live inventory layout renders, filters display, card images load.
- Shop Singles with Pokemon filter: passed; game filter route loads and images render.
- Shop Sealed Products: passed; page loads without errors.
- Shop Graded Cards: passed; page loads without errors.
- Shop Accessories: passed; page loads without errors.
- Events: passed; page loads without errors.
- Buying: passed; page loads without errors.
- Cart: passed; page loads without errors.
- Charizard product detail: passed for layout/images/cart controls; current production still shows duplicate same-condition option rows until the rebuilt plugin ZIP is installed.

## Mobile Checks

- Mobile Singles: passed; no horizontal overflow or broken images.
- Mobile Product: passed for layout/images; duplicate same-condition rows remain on the current production deployment until plugin ZIP installation.
- Mobile Kiosk: passed; full-width gallery, live inventory status, no horizontal overflow.

## Local App Sections Checked

- Login: passed; PIN field is blank and does not autofill `1420`.
- Inventory: passed; online production connection visible, graded product type controls visible, no console errors.
- Trade-Ins: passed; Inventory and Trade-Ins are separate, per-line trade percentage shows 0% through 100% in 5% increments, no console errors.
- Fulfillment: passed; active pickup tickets render, pickup queue/status language visible, no console errors.
- Queue: passed; LAN/WordPress sync queue renders, no console errors.
- Events: passed; local event registration/check-in surface renders, no console errors.
- Reports: passed; manager report dashboard with filters, KPIs, and comparison cards renders, no console errors.
- Customers: passed; credit/customer workflow renders, no console errors.
- Settings: passed; production website and LAN server configuration renders, no console errors.

## Customer Kiosk

- Kiosk URL `http://127.0.0.1:1420/?mode=kiosk`: passed.
- Shows `Live inventory connected`.
- Does not show `offline available`.
- Full gallery renders with no broken images, console errors, or horizontal overflow.

## Known Deployment Caveat

- The source/package includes the grouped-condition fix. The currently viewed production product page still shows duplicate same-condition option rows because the rebuilt WordPress plugin ZIP has not been installed on production during this clickthrough.
