# Events

## Implementation Status

Schema migration `0003` creates durable event, registration, waitlist, check-in,
TopDeck sync log, and template tables. Local helper classes define registration
modes, capacity-consuming statuses, seats remaining, public status, and badges.
Read-only public REST endpoints and shortcodes are implemented for published
events. Local registration writes are implemented for free and pay-at-store
reservations. WooCommerce event-entry products, online payment capture, TopDeck
registration push, and the staff dashboard are still behind the disabled
`events_topdeck` feature flag until staging acceptance.

## Public Read Surface

- `GET /wp-json/tcg-store/v1/events`
- `GET /wp-json/tcg-store/v1/events/{slug}`
- `[tcg_events]`
- `[tcg_event_detail slug="event-slug"]`

The public response includes seats remaining, entry fee/free state, status
badges, TopDeck attribution, and hosted registration links when the event is
configured for TopDeck-hosted registration.

## Public Write Surface

- `POST /wp-json/tcg-store/v1/events/{slug}/register`

The request accepts `first_name`, `last_name`, `email`, optional `phone`,
optional `topdeck_email`, and an `idempotency_key` field or `Idempotency-Key`
header. The write path locks the local event row, validates capacity, reuses
duplicate idempotency keys, inserts a local registration, creates a waitlist row
when enabled, recomputes the public registered count/status, and writes a
registration log. Active registrations with the same event and email are
returned idempotently instead of creating a duplicate seat or waitlist row.
An idempotency key reused for another event or email returns an
`idempotency_conflict` error.

TopDeck-hosted events return a rejection with instructions to use the hosted
registration link. Paid events are accepted only when `allow_pay_at_store` is
enabled. Online payment capture and TopDeck registration push are not performed
by this route yet. Eligible free website-push registrations write a local
pending TopDeck sync-log record; a later worker phase will process that queue.

## Registration Modes

### TopDeck Hosted

Local event is a public projection. Registration links to the configured
TopDeck URL. Scheduled sync refreshes event and attendee counts where permitted.

### Website Reserve And Push

Local event controls customer, payment, and support records. Paid registration
currently requires pay-at-store until Woo event product/order handling is
enabled. Successful future payment will queue TopDeck player registration.
Provider and payment statuses remain independent.

### Local Only

All registration, waitlist, check-in, and customer records remain local.

## State Separation

One registration stores:

- Local reservation status.
- Payment status and Woo order.
- TopDeck push status and response class.
- Waitlist position/status.
- Check-in state.

This prevents a TopDeck outage from hiding a paid customer or a failed payment
from appearing registered.

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
5. Queue a local pending TopDeck sync-log record when the registration is free,
   website-push mode is configured, and a TopDeck TID is present.
6. Map immediate, pending invite, already registered, banned/failed, or capacity
   conflict.
7. Escalate failed provider registration after payment to staff review.

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
