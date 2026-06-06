# TopDeck Integration

## Role

TopDeck is an event/tournament provider, not the local event database. Local
events retain a complete operational record so payment, customer support,
waitlist, check-in, and offline handling remain available during provider
outages.

## Verified Public Capabilities

Verified against official TopDeck Tournaments V2 documentation on June 6, 2026:

- Read tournament details, info, standings, and rounds.
- Read attendees for authorized tournament staff.
- Register one or more players by email for authorized tournament admins.
- Registration responses distinguish registered, pending invitations, already
  registered, failed, and banned users.
- Capacity conflicts return HTTP `409`; `overrideCap` exists but is manager-only
  in this platform.
- List tournaments owned by the API key through `/v2/me/tournaments` for
  eligible subscribed accounts.
- API authentication uses the `Authorization` header.
- Visible TopDeck attribution and link are required.
- Published limits vary by endpoint/document revision and must be read from
  responses/configuration rather than hardcoded.

No public tournament-creation endpoint was documented in the reviewed V2 API.
No public webhook contract was found in that documentation.

## Implemented Adapter Interface

```text
getMyTournaments()
getTournamentInfo(tid)
getAttendees(tid)
registerPlayers(tid, emails, overrideCap)
syncEventFromTopDeck(tid)
importOwnedEvents()
createEvent(eventData)
```

`TopDeckHttpProvider` implements the prompt-required methods above and also
exposes WordPress-style snake_case wrappers for internal use. Tests run against
an injected transport so no live TopDeck API key is needed.

Standings, rounds, webhook, and provider capability discovery methods remain
future extension points once product flows need them.

Default results:

- `createEvent`: `not_supported`
- provider webhooks: `not_supported`
- `getAttendees`: `not_configured` or `not_supported` without staff permission
- `registerPlayers`: `not_configured` or `not_supported` without admin permission
- `getMyTournaments`: account-dependent

## Linking And Import

- Manual link accepts a validated TID and event URL.
- Import stores the TopDeck TID, normalized event fields, raw response snapshot,
  attribution state, and sync timestamp.
- Local editable fields and provider-owned fields are identified separately.
- Sync never overwrites local staff notes, refund policy, Woo product linkage,
  or offline-reservation settings.

## Registration

For website reserve-and-push:

1. Lock local event capacity and create local registration.
2. If paid, create/link Woo order and wait for payment completion.
3. Enqueue TopDeck registration after local commit.
4. Map provider outcomes to explicit local statuses.
5. If provider registration fails after payment, retain payment and set
   `staff_review_required`; never silently cancel or refund.
6. On `409`, move to waitlist when configured or create capacity conflict.
7. Log masked request/response details and keep the raw provider response under
   restricted retention.

Attendee emails are never returned by public event endpoints.

## Creation Extension Point

`createEvent(eventData)` may be enabled only when:

- A documented or private endpoint is supplied by TopDeck.
- Authentication and account permissions are known.
- Request/response fixtures are captured without secrets.
- Sandbox or approved production tests pass.
- Error, idempotency, and rollback behavior is documented.

The adapter may then expose `supported`; no domain redesign is required.

## Sources

- https://topdeck.gg/docs/tournaments-v2
- https://topdeck.gg/features/integrations
