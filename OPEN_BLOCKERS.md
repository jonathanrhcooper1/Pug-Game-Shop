# Open Blockers

Date: 2026-06-17

## Requires Manual Production Approval

- Deploy latest theme package or update WordPress URL/menu settings so all live nav/footer links use HTTPS.
- Deploy latest plugin/theme release artifacts to production.

## Requires Credentials Or Admin Configuration

- Square production reader activation and live card-reader handoff.
- WordPress SMTP/mail provider authentication for real customer emails.
- Any GoDaddy Payments setup if that payment method is used in addition to WooCommerce Square.

## Requires Hardware

- Square card reader/payment terminal.
- Dymo LabelWriter 550 Turbo and installed Windows driver.
- Barcode scanner station test if the scanner behaves differently from keyboard-wedge input.

## Requires Staff Review

- One visible local queue/conflict item in the app Queue tab. Do not clear until staff confirms whether it is old test data or a real store inventory update.
- Product/event records with missing images should be updated in WordPress or handled by an approved fallback rule.

## Explicitly Not Validated

- Real payment capture.
- Real customer email send.
- Real customer credit mutation outside guarded smoke cleanup.
- Production deployment after this audit, because the prompt requires manual approval.

