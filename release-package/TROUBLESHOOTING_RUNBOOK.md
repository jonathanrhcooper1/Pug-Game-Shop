# Troubleshooting Runbook

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.14
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Incident response guide for common website, sync, payment, inventory, event, and app failures.
Audience: Owner, manager, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Incident Rules

- Protect business data before attempting fixes.
- Do not delete orders, ledger rows, inventory rows, or sync conflicts to hide an issue.
- Capture screenshots/log excerpts only after masking private data and secrets.
- Escalate payment, customer credit, and double-sell conflicts to a manager.

## Issue And Action Table

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

## Additional Incidents

| Incident | Likely cause | Resolve |
| --- | --- | --- |
| Sync stuck on page | Provider error, timeout, invalid payload, or checkpoint issue. | Review sync errors, retry/resume from checkpoint, reduce page scope if needed. |
| Rate limited | Provider rejected request volume. | Pause, respect retry window, resume from checkpoint. |
| Manager override not working | Role/capability mismatch or nonce/session issue. | Confirm manager role, reload admin/app, check audit route health. |
| TopDeck registration failing | Credentials, provider outage, duplicate player, capacity conflict. | Use local registration record and retry provider sync later. |
| Barcode scanner not reading | Scanner mode/keyboard layout/input focus. | Test in a text field, reconfigure scanner suffix, verify barcode format. |
| Label printer not printing | Driver, queue, label stock, app package. | Print OS test label, then verify app label output. |
| High server load | Large catalog pull, slow DB query, hosting limits. | Pause bulk sync, check database indexes, run smaller batches. |
| Slow search | Missing indexes, large result set, provider fallback timeout. | Use filters, check reference table counts, review query plans. |
