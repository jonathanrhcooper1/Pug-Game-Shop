# Events

## Implementation Status

Schema migration `0003` creates durable event, registration, waitlist, check-in,
legacy provider sync-log, and template tables. Local helper classes define
registration modes, capacity-consuming statuses, seats remaining, public
status, and badges. Read-only public REST endpoints and shortcodes are
implemented for published events. Local registration writes are implemented for
free and pay-at-store reservations. WooCommerce event-entry products and the
staff dashboard remain staging-gated. TopDeck and other external
tournament-provider integrations are removed from the active scope for now.

## Public Read Surface

- `GET /wp-json/tcg-store/v1/events`
- `GET /wp-json/tcg-store/v1/events/{slug}`
- `[tcg_events]`
- `[tcg_event_detail slug="event-slug"]`

The public response includes seats remaining, entry fee/free state, status
badges, and local registration links.

## Public Write Surface

- `POST /wp-json/tcg-store/v1/events/{slug}/register`

The request accepts `first_name`, `last_name`, `email`, optional `phone`, and
an `idempotency_key` field or `Idempotency-Key` header. The write path locks
the local event row, validates capacity, reuses
duplicate idempotency keys, inserts a local registration, creates a waitlist row
when enabled, recomputes the public registered count/status, and writes a
registration log. Active registrations with the same event and email are
returned idempotently instead of creating a duplicate seat or waitlist row.
An idempotency key reused for another event or email returns an
`idempotency_conflict` error.

Paid events are accepted only when `allow_pay_at_store` is enabled. Online
payment capture is not performed by this route. External tournament-provider
pushes are not queued by default.

## Registration Modes

### Website Reserve

Local event controls customer, payment, and support records. Paid registration
currently requires pay-at-store until Woo event product/order handling is
enabled.

### Local Only

All registration, waitlist, check-in, and customer records remain local.

## State Separation

One registration stores:

- Local reservation status.
- Payment status and Woo order.
- Waitlist position/status.
- Check-in state.

This keeps local registration, payment, waitlist, and check-in state separate.

## Capacity

Capacity-changing operations lock the event row. Seats remaining are calculated
from active capacity-consuming statuses. TopDeck counts are treated as provider
observations and reconciled with local records; they do not silently delete
local registrations.

## Paid Registration

1. Reserve local seat.
2. For the current local route, require pay-at-store when the event has an
   entry fee.
3. In a later WooCommerce phase, create a Woo order line linked to
   event/registration.
4. On payment complete, set local paid.
5. Keep external tournament-provider push disabled unless the scope is reopened
   in a future reviewed phase.

Cancellation/refund rules use configured deadlines and explicit staff actions.

## Waitlist

Waitlist position is durable. Promotion locks the event and registration,
creates a seat hold with expiry, and notifies through a future notification
adapter. Offline capacity conflicts may enter the waitlist if enabled.

## Check-In

Staff may scan registration QR/customer code or search manually. Check-in stores
event, registration, actor, device, location, and timestamp. TopDeck attendee
sync can assist lookup but does not expose attendee emails publicly.

## Public UX

Events provide list/calendar/featured views, game and status filters, event
detail, registration deadlines, prize support, rules, what to bring, calendar
link, share action, QR signup, and required TopDeck attribution.

## Offline

The app caches upcoming events and public details. Offline reservation is
available only when the event explicitly permits it. Queued reservations remain
pending until server capacity acceptance.
