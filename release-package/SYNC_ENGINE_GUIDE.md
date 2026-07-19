# Sync Engine Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.1
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Operational and technical guide for ScryDex, website/app, LAN queue, and conflict sync.
Audience: Owner, manager, support technician, developer
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Daily Schedule

The reference/pricing sync is designed around a 9:00 AM America/New_York daily refresh. The schedule is visible through health/status payloads and admin screens. Manual pulls and resume actions are available for owner/support use.

## Sync Types

| Sync | Purpose | Trigger |
| --- | --- | --- |
| Full ScryDex pull | Import sets, cards, variants, prices, images, and checkpoints. | Manual admin action or configured worker. |
| Price-only pull | Refresh prices without rebuilding all reference records. | Daily schedule or manual action. |
| Image-only pull | Refresh image URLs/cache metadata. | Manual support action when images are missing. |
| New set pull | Import newly released expansions. | Manual or scheduled catalog scan. |
| Resume failed pull | Continue from checkpoint after provider/server interruption. | Manual owner/support action. |
| Website-to-app | Push inventory/customer/event changes into local cache. | App/middleman pull by cursor. |
| App-to-website | Replay inventory, customer, credit, buylist, event, and fulfillment writes. | Middleman queue push. |

## Checkpoint And Pagination Rules

ScryDex pagination is tracked by resource, game, set, page/cursor, committed count, and update time. A page is advanced only after successful normalization and persistence. Failed pages log errors and preserve a resume point.

## Retry, Rate Limit, And Usage Rules

- Retry transient network/provider failures with bounded retries.
- Respect provider rate limit responses and pause/resume from checkpoint.
- Log provider failures without exposing API keys.
- Avoid loading very large result sets into memory; use paginated export and processing.

## Manager Approval Rules

Normal sync does not require a manager to manually push. Manager approval is reserved for below-minimum sale, manual credit adjustment, credit void, conflict resolution, duplicate customer merge, event capacity override, and high-risk settings changes.

## Conflict Resolution

1. Open conflict/queue view.
2. Review current website row and queued local row.
3. Determine whether the action is safe, duplicate, stale, or requires correction.
4. Resolve with a manager-level reason.
5. Confirm resulting inventory/credit/order state and audit log.
