# Kiosk And Offline App Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.0
Release date: 2026-06-17
Last updated: 2026-07-18
Document purpose: Guide for the employee app, kiosk mode, local server, offline queue, pairing, and reconnect behavior.
Audience: Owner, manager, staff, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Topology

The employee app and kiosk communicate with the LAN middleman server. Its SQLite inventory ledger is authoritative for physical quantity, reservations, approved price, trade intake, and delivery state. WordPress/WooCommerce remains authoritative for online carts, payments, and orders. The LAN server publishes verified projections to WordPress and Square, ingests their sales/refunds idempotently, and safely queues work during outages.

## Modes

| Mode | Purpose | User |
| --- | --- | --- |
| Employee | Inventory, checkout, customers, trade-ins, fulfillment, reports, events, sync. | Staff/manager |
| Kiosk Page | Fullscreen customer kiosk app for inventory lookup and order submission. | Customer |
| Middleman server | Local cache, queue, auto-discovery, WordPress bridge, POS connector. | Support/admin |

## Release Deliverables

The packaged handoff has exactly three deliverables: `Pug Store App`, `LAN Server + Pug Store App`, and `Kiosk Page`. The Kiosk Page deliverable includes a kiosk-only fullscreen Windows installer that connects to the same LAN server as the Pug Store App and does not expose staff screens.

## Auto-Discovery And Manual Fallback

Apps attempt auto-discovery using `pug-local-sync-discovery-v1` over UDP port `8788`. If the network blocks discovery, staff can manually enter the middleman URL, for example `http://STORE-SERVER-IP:8787`.

## Offline Behavior

- Read operations use the last local cache when WordPress is unreachable.
- Writes are queued with idempotency keys.
- Queued operations replay when the middleman and website reconnect.
- Conflicts are shown for manager resolution.
- Customer kiosk carts place holds only when the system can validate available stock or queue a safe hold as configured.

## Queue And Conflict Handling

1. Open the sync/queue screen.
2. Review pending operation type, customer/order/reference ids, amount, and queued time.
3. Do not clear a queue until the matching website/order/inventory state is confirmed.
4. Escalate duplicate sell, customer credit, and merge conflicts to a manager.
5. After reconnect, confirm queue depth returns to zero or only known deferred items remain.
