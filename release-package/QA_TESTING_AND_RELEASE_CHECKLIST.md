# QA Testing And Release Checklist

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.14
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Production release validation checklist for owner and support signoff.
Audience: Owner, manager, support technician, developer
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Website QA

- [ ] Home, contact, shop singles, sealed, graded, accessories, events, account, cart, checkout, and policy pages load.
- [ ] No public staging banner, debug copy, or development-only links are visible.
- [ ] Navigation links route to intended pages.
- [ ] Mobile, tablet, and desktop layouts are readable and usable.
- [ ] Product images display on listing, product, cart, and checkout views.

## Commerce And Inventory QA

- [ ] Card search works with game, set, type, condition, and graded filters.
- [ ] Same card/set groups display condition/grade choices correctly.
- [ ] Add to cart places reservation/hold.
- [ ] Expired cart/hold releases inventory.
- [ ] Successful checkout marks exact item sold.
- [ ] Failed/cancelled checkout releases or reviews hold according to policy.
- [ ] Inventory intake creates serialized rows and optional WooCommerce product sync.

## Operational QA

- [ ] Manager override prompts/logs required sensitive actions.
- [ ] Customer credit issue/redeem/correction appears in ledger.
- [ ] Buylist save/decline/accept flow works and accepted items convert to inventory.
- [ ] Kiosk order appears in fulfillment queue.
- [ ] Employee app reconnect replays queued operations.
- [ ] ScryDex full pull, price-only pull, and resume failed pull are verified.
- [ ] TopDeck/event behavior is verified according to configured mode.
- [ ] POS/payment test uses sandbox/test mode where appropriate.
- [ ] Email flows are received.
- [ ] Reports load and export for manager users only.
- [ ] Backups and rollback instructions are current.
- [ ] Owner gives final approval.
