# Events And TopDeck Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Event pages, local registration, waitlist/check-in, email, and optional external event connector guide.
Audience: Owner, manager, staff, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Website Event Pages

- Events list and detail pages show title, game, date/time, entry fee, capacity, status, and registration actions.
- Registrations require first name, last name, and email address.
- Registration confirmation email includes event details and the store address.
- Capacity and waitlist rules are handled by the event policy.
- Check-in is staff controlled.

## Registration Flow

1. Customer opens event detail page.
2. Customer enters first name, last name, email, and phone if requested.
3. System validates registration status and capacity.
4. System stores registration or waitlist row.
5. System sends event registration email through configured mail transport.
6. Staff checks player in on arrival.

## TopDeck Modes

| Mode | Status | Notes |
| --- | --- | --- |
| Local only | Supported | Events and registrations live in the store platform only. |
| Linked existing external event | Optional where configured | Store event references an existing external event id. |
| Imported owned external event | Optional where configured | Provider-owned events can be imported when credentials and endpoints support it. |
| Create external event | Future/verify before use | Do not claim this works unless provider endpoint, credentials, and code path are verified. |

## Failure Handling

| Failure | Expected behavior |
| --- | --- |
| External provider down | Local event registration can continue if local mode is active; provider sync can retry later. |
| Payment succeeds but external registration fails | Order/registration should remain locally visible for staff follow-up and provider retry. |
| Capacity conflict | Waitlist or rejection according to event policy; manager override must be logged. |
| Already registered | Return existing status without duplicate active registration. |
