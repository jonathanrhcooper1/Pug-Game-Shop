# Offline Sync Conflict Tests

Required coverage:

- Offline inventory reservation queues while disconnected.
- Reconnected reservation sync resolves available items.
- Reconnected reservation sync creates staff-review conflict when capacity or
  inventory is no longer available.
- Offline event reservation queues locally when enabled for the event.
- Offline event reservation pushes to WordPress, then TopDeck when applicable.
- Customer credit offline redemption cannot silently overspend.
- Device revocation blocks pull and push.
