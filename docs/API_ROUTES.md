# API Routes

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: REST route reference for support and development.
Audience: Developer and support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Route Groups

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

## Authentication Notes

Public read routes are limited to safe storefront data. Staff, manager, system, and device routes require WordPress authentication, application passwords, nonces, device pairing, or capability checks depending on route. Secrets are never returned by status or manifest endpoints.
