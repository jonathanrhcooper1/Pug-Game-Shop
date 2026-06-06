# Events

## Implementation Status

Schema migration `0003` creates durable event, registration, waitlist, check-in,
TopDeck sync log, and template tables. Local helper classes define registration
modes, capacity-consuming statuses, seats remaining, public status, and badges.
The public UI, WooCommerce event-entry products, and staff dashboard are still
behind the disabled `events_topdeck` feature flag until staging acceptance.

## Registration Modes

### TopDeck Hosted

Local event is a public projection. Registration links to the configured
TopDeck URL. Scheduled sync refreshes event and attendee counts where permitted.

### Website Reserve And Push

Local event controls customer, payment, and support records. Paid registration
uses a Woo event product/order. Successful payment queues TopDeck player
registration. Provider and payment statuses remain independent.

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
2. Create Woo order line linked to event/registration.
3. On payment complete, set local paid.
4. Queue TopDeck registration if configured.
5. Map immediate, pending invite, already registered, banned/failed, or capacity
   conflict.
6. Escalate failed provider registration after payment to staff review.

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
