# Offline Sync Conflict Tests

Automated coverage now includes:

- Offline inventory reservation accepts available items.
- Offline inventory reservation creates staff-review conflict when the server
  item is no longer available.
- Offline event reservation accepts available capacity.
- Offline event reservation waitlists full events when allowed.
- Offline event reservation creates capacity conflicts when full and no waitlist
  is allowed.
- Customer credit offline redemption accepts within cached and server balance.
- Customer credit offline redemption rejects local cached-limit overspend.
- Customer credit offline redemption creates a conflict rather than silently
  overspending server balance.
- Device revocation blocks offline push before operation handling.

Remaining required integration coverage:

- Offline inventory reservation queues while disconnected.
- Reconnected reservation sync resolves available items.
- Reconnected reservation sync creates staff-review conflict when capacity or
  inventory is no longer available.
- Offline event reservation queues locally when enabled for the event.
- Offline event reservation pushes to WordPress for local registration review.
- Customer credit offline redemption cannot silently overspend.
- Device revocation blocks pull and push.
