# UI Review Report

Date: 2026-06-17

## Local App

Checked in the in-app browser at `http://127.0.0.1:1420/`.

Passed:

- PIN screen loads cleanly with no autofilled PIN.
- Unlocked app shows production wording, no visible staging banner, and production website connection.
- Inventory, Trade-Ins, Checkout, Fulfillment, Queue, Events, Reports, Customers, and Settings opened with no browser console errors.
- No horizontal overflow was detected in the sampled desktop viewport.
- Checkout includes guest/customer mode, barcode/product lookup, kiosk import, misc sale, cash/card/split tender options, receipt delivery, Square receipt/reference fields, Square reader handoff, and Dymo label prep.
- Customers screen is reduced to customer lookup/profile, credit balance, issue credit, ledger history, and order/receipt history.
- Trade-Ins screen includes customer lookup/create flow, raw/graded selection, per-card trade percentage, manual offer value, cash/credit payout, save/accept/decline actions, and saved trade records.
- Reports screen loads a graph/KPI dashboard shell and filters without console errors.

Needs human/data review:

- Queue tab still has one conflict/queued item.
- Square reader activation cannot be visually completed without live Square hardware/credentials.
- Label printing cannot be visually completed without Dymo hardware.

## Production Website

Desktop browser pass covered:

- Home
- Singles
- Sealed products
- Graded cards
- Events
- Cart

Mobile browser pass covered:

- Singles
- Events

Passed:

- No console errors in sampled pages.
- No raw shortcodes.
- No visible staging/test banner.
- No fatal/critical WordPress text.
- Singles and Events mobile layouts had no horizontal overflow at 390x844.
- Event listing is contained, links to event detail, and no longer embeds the registration form directly in each listing card.

Observed issues:

- Some live header/footer/menu links still resolve as `http://j84.285.myftpupload.com`. The source theme has a secure URL helper, but live production needs the latest theme package deployed or WordPress URL/menu settings corrected after manual approval.
- Homepage ticker is intentionally wider than the viewport for animation; automated overflow checks flag it even though it is a marquee effect.
- At least one live WooCommerce product/event image uses the WooCommerce placeholder thumbnail. Assign a product image or approve a theme fallback to replace missing product images with branded artwork.

## Accessibility Spot Check

- Mobile nav touch targets are approximately 42px high in sampled pages.
- Product/event images have visible layout; some generated card images lack alt text on the Singles grid and should be improved in a follow-up accessibility pass.
- Event cards are links and receive focus-visible styling in source CSS.

