# Owner Operations Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.2
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Daily owner procedures for operating and supervising the platform.
Audience: Store owner and general manager
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Owner Dashboard Overview

The owner should treat the WordPress admin, WooCommerce reports, plugin reports, local app reports, sync logs, and payment/POS dashboards as one operational picture. The LAN ledger is the inventory and local-credit authority; WordPress/WooCommerce owns online order facts, and Square owns captured POS payment facts.

## Daily Opening Checklist

- [ ] Open the website and confirm public pages load.
- [ ] Open the local middleman server status screen and confirm it is online.
- [ ] Open the employee app and confirm the sync status shows connected or local-cache fallback.
- [ ] Check ScryDex last successful sync and any failed checkpoint.
- [ ] Check local queue depth and resolve urgent conflicts before selling high-demand cards.
- [ ] Confirm kiosk inventory loads and cart submission is available.
- [ ] Confirm barcode scanner and label printer are connected if used that day.

## Daily Closing Checklist

- [ ] Review WooCommerce orders and local pickup queue.
- [ ] Review Square/POS receipts and compare against local checkout records.
- [ ] Review customer credit issued and redeemed.
- [ ] Review trade-in cash and credit totals.
- [ ] Review price floor hits and manager overrides.
- [ ] Confirm queued app actions are synced or documented for the next day.
- [ ] Confirm backup status and note any incident in the store log.

## ScryDex Operations

1. Open WordPress admin > TCG Store > ScryDex Catalog.
2. Review catalog counts for sets, cards, variants, price observations, and checkpoints.
3. If a game or set is missing, run the manual pull for the selected game/set.
4. If a pull fails, use the resume failed pull option so completed pages are not repeated.
5. For price-only refresh, run the daily scheduled refresh or manual price sync, then review price change logs.
6. If the provider is unavailable, continue store operations from cached reference data and retry later.

## Price And Inventory Review

- Review price floor hits daily before opening high-value inventory to sale.
- Use price lock only when an owner wants a card price protected from daily repricing.
- Use manager overrides for below-minimum sales, conflict resolution, duplicate merges, and sensitive settings changes.
- Check inventory by game, set, condition, grade, grading company, location, age, and source.

## Customer Credit Liability

Customer credit is local-store credit, not a public gift card. The owner should review the liability report, compare ledger activity against buylist and checkout records, and resolve disputes with correction entries rather than editing previous ledger rows.

## Common Owner Incidents

| Issue | Symptoms | First checks | Resolution |
| --- | --- | --- | --- |
| Website down | Public pages fail to load. | Hosting status, DNS, PHP error log, recent deployments. | Restore from hosting backup or rollback theme/plugin after confirming order and credit data safety. |
| Checkout failing | Cart cannot complete or payment error shown. | Gateway mode, WooCommerce logs, payment plugin status. | Switch to provider sandbox only for testing; never enter live keys in docs or logs. |
| Card search failing | No card results or slow results. | Reference table counts, ScryDex status, search route health. | Resume failed pull, rebuild reference indexes, confirm API key status. |
| Images missing | Card art blank on product/search/cart. | Reference image URLs, uploads/cache, browser console. | Run image sync, clear cache, verify provider URLs. |
| Reservation stuck | Card held after abandoned cart. | Reservation expiry job and `tcg_reservations` rows. | Run expiry task, release stale holds after checking active orders. |
| POS sale not syncing | Square/POS sale completed but website inventory unchanged. | Local queue, POS sync log, exact inventory id. | Replay queued sale or manually mark sold with audit note. |
| Credit mismatch | Customer disputes balance. | Ledger entries, order/buylist references, staff user. | Post a manager correction entry; never edit old ledger rows silently. |
| Kiosk offline | Kiosk cannot submit order. | LAN server URL, UDP discovery, device token, queue depth. | Enter middleman IP manually and allow queue to sync after reconnect. |
| Event registration email missing | Player registered but no email received. | SMTP plugin, WordPress mail log, spam folder. | Correct SMTP settings and resend/confirm from event record where supported. |
| Migration failed | Plugin activation or update reports database error. | Migration logs, database permissions, backup availability. | Restore pre-release backup if needed, then rerun migration after fixing permission/schema issue. |
