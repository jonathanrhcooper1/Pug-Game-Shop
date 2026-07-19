# Sync Queue Report

Date: 2026-06-17

## Production Active Sync Verification

`npm run production:verify-active-syncs` passed.

Verified syncs:

- ScryDex reference catalog
- Public shop shortcodes
- Local inventory push
- WooCommerce product projection / Square sale path
- Customer credit push
- Customer upsert push
- Event registration and check-in push
- Kiosk order push
- Local pickup fulfillment

The verifier created clearly labeled smoke records where required and cleaned up WordPress/local rows after the run.

## Current Local App Queue Observation

The browser audit of the local app Queue tab showed:

- LAN queued count: 1
- Open conflicts count: 1
- Visible operation text included an `inventory update` / `offline-conflict` style item.

This was intentionally not voided, resolved, or cleared during the audit because queue operations can represent real store state and the prompt forbids destructive production-adjacent actions without explicit safe marking.

## Queue Behavior Covered By Tests

- Local sync queue persistence
- Offline queue bridge
- Conflict policy
- Inventory push
- Square sale push/reconciliation path
- Customer push
- Credit adjustment/redemption push
- Kiosk order push
- Event registration/check-in push
- Fulfillment status round trip
- Hold expiry and reservation cleanup

## Recommended Human Action

Open the Queue tab in the local app and review the single remaining conflict. Resolve or void it only after confirming whether it is an old test operation or a real store inventory correction.

