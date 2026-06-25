# Bug Fix Summary

Date: 2026-06-17

## Fixed / Improved In This Branch

- Added production public smoke tests for public page load, forbidden production phrases, raw shortcodes, local/staging links, event list behavior, and expected 404 behavior.
- Reworked event listing cards so the list page renders contained cards and links to detail pages instead of showing the full registration form in every card.
- Added responsive event grid behavior for one, two, and three-plus event cards.
- Added game-specific event marks and styling for Pokemon, MTG, Lorcana, and Riftbound.
- Expanded local app checkout/customer split so customer records no longer carry POS clutter and checkout handles sale flow.
- Added LAN checkout transaction history storage and API support.
- Added Square Terminal connector scaffold and app states for manual receipt mode vs reader checkout.
- Expanded ScryDex graded price normalization, price-history fallback, and grade/company-aware local valuation display.
- Added manual offer value support for trade-in card pricing.
- Added local manager report dashboard data handling and chart/KPI display contracts.
- Added live cart/kiosk hold and fulfillment sync behavior in local sync code.
- Added production release packaging for plugin, local sync server, employee app, and customer kiosk package manifests.

## Fixed By Existing Source But Not Yet Deployed

- Source theme includes HTTPS URL hardening for the GoDaddy production host. Live production still shows some HTTP links, so deployment or WordPress URL/menu correction is required.

## Not Fixed In This Pass

- Live placeholder WooCommerce thumbnail on at least one product/event card. This is a content/admin data issue unless a branded code fallback is approved.
- One local queue/conflict operation remains visible. It requires staff review before clearing.
- Hardware-dependent Square reader and Dymo printer flows remain unverified.

