# The Pug Rebrand Customer UI Plan

This is a contained visual direction package for the customer-facing website,
WooCommerce shop, event pages, and account portal. It does not activate any
theme changes by itself.

Logo reference: `docs/branding/assets/the-pug-logo-reference.webp`

## Audit

Current customer-facing surfaces found in the repo:

- `apps/wordpress-plugin/src/WooCommerce/CustomerAccountPortalPresenter.php`
  renders the WooCommerce My Account store-credit and purchase-history portal
  with `tcg-account-portal` classes.
- `apps/wordpress-plugin/src/Events/EventShortcodes.php` renders public event
  lists and detail pages through `[tcg_events]` and `[tcg_event_detail]` with
  `tcg-events`, `tcg-event-card`, `tcg-event-detail`, and
  `tcg-event-badges` classes.
- `apps/wordpress-plugin/src/Inventory/InventorySearchResponsePresenter.php`
  exposes customer-safe inventory search data: card name, game, set, number,
  variant, condition, sale price, images, stock status, and reservation
  eligibility. This should power customer search, kiosk search, and shop card
  tiles.
- `apps/wordpress-plugin/src/WooCommerce/InventoryProductProjectionPlanner.php`
  creates the WooCommerce product projection from intake rows, so intake is the
  upstream source for online shop products.
- `apps/storefront-theme-or-blocks/README.md` and `apps/shared-ui/README.md`
  are reserved for the future storefront and shared component layer.
- `docs/BRANDING.md` already defines the multi-company branding settings
  contract and CSS variable path. The rebrand should extend that system instead
  of hardcoding one store into shared plugin logic.

Observed non-branding issue:

- The account portal formats store credit and order totals to four decimals in
  `CustomerAccountPortalPresenter::money()`. That should be fixed in the PHP
  presenter or a shared money formatter, not with CSS.

## Direction

The Pug should feel like a premium local game shop with a collector-vault edge:
sharp, glossy, energetic, and easy to shop. The logo points to a dark navy base,
cyan glass highlights, white outline work, and bright gold calls to action.

Use the dark brand colors as framing, not as the whole page. Customer shopping
areas should remain readable with bright surfaces, clear card images, strong
prices, and obvious reserve/add actions.

## Brand Tokens

Recommended defaults for the WordPress branding settings:

```json
{
  "company_name": "The Pug Cards, Games & More",
  "company_short_name": "The Pug",
  "primary_color": "#0A2639",
  "accent_color": "#F6C635",
  "background_color": "#F5F9FC",
  "surface_color": "#FFFFFF",
  "text_color": "#0B1116",
  "success_color": "#168A55",
  "warning_color": "#C78110",
  "danger_color": "#B42318",
  "staging_banner_color": "#F6C635"
}
```

Additional theme-only CSS variables:

- `--pug-midnight`: `#05080B`
- `--pug-vault`: `#0A2639`
- `--pug-sapphire`: `#103C5A`
- `--pug-cyan`: `#26D9F0`
- `--pug-ice`: `#B9F4FF`
- `--pug-gold`: `#F6C635`
- `--pug-amber`: `#C78110`
- `--pug-paper`: `#F5F9FC`
- `--pug-ink`: `#0B1116`

## Customer Experience Targets

Homepage:

- First viewport should show The Pug logo large enough to be unmistakable, a
  real shop/customer promise, and direct actions for Shop Cards, Events, Sell
  Cards, and Store Credit.
- Avoid a generic landing page. The first screen should lead directly into
  inventory search and events.

Shop and inventory search:

- Card tiles should prioritize image, name, game/set, condition, variant,
  quantity/status, and price.
- Use gold for the primary action and price emphasis, cyan for focus/active
  accents, and white/ice outlines for brand framing.
- Product grids should feel like a clean display case: stable image ratios,
  minimal repeated text, and scannable prices.

Product detail:

- Left side image gallery, right side exact item facts: condition, set, number,
  rarity/variant, barcode/SKU when staff-facing, stock status, reserve/add
  action, and pickup/shipping availability.
- Customer copy should explain exact-item purchasing, not database internals.

Account portal:

- Store credit should feel like a wallet balance with recent activity below it.
- Purchase history should show card metadata in compact rows with status,
  date, image when available, and order action.

Events:

- Event cards should use bold title/date hierarchy, capacity status, game/format
  chips, and a clear registration action.
- Detail pages should keep event rules and what-to-bring content readable.

Buylist/sell-to-store:

- Intake and buylist flows should use the same card tile language as the shop
  so customers and staff see one coherent inventory system.

## Implementation Plan

1. Put the logo into WordPress media and save its HTTPS URL in the existing
   branding settings. Do not hardcode local file paths into plugin source.
2. Add a lightweight customer CSS file to the storefront theme or a small
   plugin asset enqueue once the theme package is ready. Use
   `docs/branding/the-pug-customer-ui.css` as the initial CSS foundation.
3. Enqueue only on customer-facing pages first: shop/archive, product detail,
   My Account portal, events, cart, checkout, and public inventory/search pages.
4. Preserve the multi-company design by driving colors from `--tcg-*` settings
   first and falling back to The Pug-specific variables only when the active
   site uses this brand.
5. Fix four-decimal customer money display in the PHP money formatter before
   live customer launch.
6. Add customer UI screenshots for desktop and mobile after the CSS is activated
   on a local or staging theme.

## POS And Barcode Notes

Inventory intake remains the source that fills WooCommerce and the local/POS
inventory view. The visual design should make barcode status visible in staff
contexts, but customer-facing product pages should hide internal barcode/Square
IDs unless they are needed for pickup confirmation.

Recommended customer-safe status labels:

- Available
- Reserved
- Pulling order
- Ready for pickup
- Sold

Recommended staff-only labels:

- Barcode printed
- WooCommerce synced
- Square catalog mapped
- POS sync pending
- POS sync conflict

