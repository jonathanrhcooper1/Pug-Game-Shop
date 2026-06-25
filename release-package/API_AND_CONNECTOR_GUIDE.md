# API And Connector Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.14
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Connector, REST route, request/response, retry, logging, and troubleshooting reference.
Audience: Developer, support technician, administrator
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Connector Overview

| Connector | Purpose | Credentials | Storage |
| --- | --- | --- | --- |
| ScryDex | Card/set/variant/price/image reference data. | Team ID, primary key, optional secondary key. | WordPress settings or ignored server env. |
| WooCommerce | Product, cart, checkout, order, refund/cancel hooks. | WooCommerce internal APIs and gateway settings. | WordPress/WooCommerce settings. |
| POS adapter | Square/POS sale and inventory reconciliation. | Provider token/location/device id where configured. | Local server env and password manager. |
| Payment gateways | Square, GoDaddy Payments, or other WooCommerce gateways. | Gateway credentials. | Gateway settings; never docs/GitHub. |
| TopDeck | Optional event import/link/attendee sync/registration by email where supported. | API key/token. | WordPress settings or server env. |
| Email/SMTP | Transactional messages including pickup, buylist, credit, and event registration. | SMTP credentials or provider token. | SMTP plugin/server env. |
| Offline app API | Device pairing, pull, push, conflicts, events, customers, inventory. | Pairing tokens and WordPress app auth. | WordPress settings/local secure storage. |

## REST Route Summary

| Area | Method | Route | Purpose |
| --- | --- | --- | --- |
| Health | GET | /wp-json/tcg-store/v1/health | Authenticated diagnostic status for scheduler, routes, providers, and dependency readiness. |
| Connector manifest | GET | /wp-json/tcg-store/v1/offline/connector-manifest | Read-only manifest for local app pairing; never returns secrets. |
| Offline device | POST | /wp-json/tcg-store/v1/offline/devices | Registers or validates a local/offline device when pairing is enabled. |
| Offline pull | GET | /wp-json/tcg-store/v1/offline/pull | Pulls inventory, settings, customers, events, and conflict changes by cursor. |
| Offline push | POST | /wp-json/tcg-store/v1/offline/push | Receives queued app operations with idempotency and conflict detection. |
| Conflict resolution | POST | /wp-json/tcg-store/v1/offline/conflicts/{id}/resolve | Manager/system conflict resolution route. |
| Inventory search | GET | /wp-json/tcg-store/v1/inventory/search | Searches reference and sellable inventory by card, game, set, type, and status. |
| Inventory intake | POST | /wp-json/tcg-store/v1/inventory/intake | Creates serialized inventory rows and optional WooCommerce product sync. |
| Inventory sale | POST | /wp-json/tcg-store/v1/inventory/{inventory_id}/mark-sold | Marks exact serialized item sold after payment/POS confirmation. |
| Customer upsert | POST | /wp-json/tcg-store/v1/customers | Creates or updates customer profiles and contact lookup data. |
| Customer credit | GET/POST | /wp-json/tcg-store/v1/customers/{id}/credit | Reads balance/ledger and posts authorized credit movements. |
| Kiosk order | POST | /wp-json/tcg-store/v1/kiosk/orders | Creates kiosk pickup order with inventory holds. |
| Fulfillment | GET/POST | /wp-json/tcg-store/v1/fulfillment/orders | Reads and updates local pickup order fulfillment state. |
| Events | GET/POST | /wp-json/tcg-store/v1/events | Lists, creates, and updates local events where staff routes are enabled. |
| Event registration | POST | /wp-json/tcg-store/v1/events/{slug}/registrations | Registers a player, sends confirmation email, and handles waitlist/payment state. |
| Event check-in | POST | /wp-json/tcg-store/v1/events/{event_id}/checkins | Checks in registered players. |
| Reports | GET | /wp-json/tcg-store/v1/reports/{report} | Manager-only report pull for app/admin dashboards. |
| ScryDex status | GET | /wp-json/tcg-store/v1/scrydex/catalog/status | Catalog counts, coverage, and checkpoint status. |
| ScryDex index | POST | /wp-json/tcg-store/v1/scrydex/catalog/index | Runs guarded manual catalog indexing by game/set/page. |
| ScryDex export | GET | /wp-json/tcg-store/v1/scrydex/catalog/export | Paginated export of reference catalog tables. |
| Payment fee snapshot | POST | /wp-json/tcg-store/v1/pos-payments/fee-snapshot | Stores payment fee estimate/snapshot for reconciliation. |

## ScryDex Connector

ScryDex is the primary card reference provider. The system stores provider sets, cards, variants, image URLs, price observations, normalized price points, and checkpoints. Full pulls paginate by game and set. Resume operations use the checkpoint table so a failed page can continue without restarting completed work.

## ScryDex Example

Request body example:

~~~json
{
  "game": "pokemon",
  "set_id": "replace_with_set_id",
  "page_size": 100,
  "checkpoint": "replace_with_checkpoint_id"
}
~~~

Response example:

~~~json
{
  "status": "ok",
  "imported_count": 100,
  "continuation_checkpoint_row": {
    "resource_type": "cards",
    "page_number": 4
  }
}
~~~

## WooCommerce Connector

WooCommerce handles storefront commerce, while the plugin controls serialized card availability. Product sync creates or updates product data, images, price selectors, condition rows, and exact inventory reservation metadata. Payments remain with installed WooCommerce payment gateways.

## POS And Payment Connectors

Square/POS support is separated from payment capture. The local server can prepare/read Square Terminal status and record receipt references. WooCommerce gateway plugins handle online payment authorization/capture. Store credit is separate from gift cards and is redeemed through local staff workflows unless an owner explicitly changes policy.

## TopDeck Connector

Supported documentation modes are local-only events, linked external events, imported owned events, and future create-event support only if the provider API and credentials support it. Do not assume create-event support is available until verified in code, provider documentation, and production credentials.

## Email/SMTP Connector

Transactional email uses WordPress mail or the configured SMTP provider. Current email flows include event registration confirmation and can support pickup ready, buylist receipt, credit notice, and sync failure alerts where enabled.

## Offline App API

The offline app API uses device pairing, signed/authenticated requests, idempotency keys, cursors, and conflict records. Secrets are never returned to app clients. Local clients receive only operational status and non-secret connector readiness.

## Troubleshooting

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
