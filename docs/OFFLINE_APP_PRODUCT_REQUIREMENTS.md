# Offline App Product Requirements

## Product Direction

The offline app is a single-store operating console for one configured
WordPress/WooCommerce website per installation. It must run online with live
pull/push sync when the website is reachable and offline with a durable local
SQLite queue when the website is unavailable.

The underlying connector model may retain profile IDs for staging, support,
and future white-label reuse, but the cashier/staff UI must not present a
store-selection dropdown as the primary connection model. First-run and admin
maintenance should use a setup screen that connects the app to the configured
website, validates the public connector manifest, pairs the device, and stores
only secret-free metadata in browser/UI state.

## Required App Sections

- Setup: website URL, manifest validation, device pairing, secure-store token
  status, sync route status, and setup troubleshooting.
- Login: staff/manager login before app use, with session timeout and lock
  behavior controlled from WordPress admin settings.
- Inventory: scan/search cards, add inventory, edit card details, create
  guarded holds, print labels, and push accepted changes to the website
  database.
- ScryDex: search/reference card data inside the app through WordPress server
  credentials, never by storing ScryDex keys in the app.
- Customers: create customers, search customers, view cached balances and
  ledger entries, add manager-approved store credit, and redeem store credit.
- Checkout/POS Handoff: calculate store-credit redemption, show remaining
  amount due, and produce the Square POS handoff instructions/metadata.
- Queue: show local operations, retry/void/export for support, and mark
  accepted operations synced after website acceptance.
- Conflicts: manager-only resolution for inventory, customer credit, events,
  and stale offline operations.
- Settings: manager-only website connection, timeout, sync interval, feature
  gates, role requirements, and device pairing controls.

Menu items should navigate to full app pages or page-like workspaces, not just
scroll a long developer console.

## Online And Offline Behavior

- Online mode runs authenticated pull/push sync through the paired website
  connector.
- Offline mode keeps scanning, inventory intake, customer lookup, credit
  redemption, event check-in, and queue review available using cached data.
- The app never accesses MySQL directly. WordPress accepts or rejects queued
  operations and remains authoritative after sync.
- When the network returns, the app pushes local operations, pulls canonical
  inventory/customer/event/conflict rows, marks accepted queue rows synced, and
  leaves conflicts visible for manager review.

## Login And Manager Lockdown

Before regular app use, staff must authenticate locally against the website
session/device policy. WordPress admin settings should control:

- Required login mode for staff and managers.
- Session timeout minutes.
- Idle lock timeout minutes.
- Whether offline login is allowed from cached staff/device policy.
- Which actions require manager approval: settings, credit add, credit
  correction, conflict resolution, price override, inventory negative
  adjustment, and production connector changes.
- Whether a manager override expires after each action, after a timed window,
  or at logout.

The app must lock settings by default unless the current session has a manager
role or a valid manager override.

## Inventory And ScryDex

Inventory added from the app must queue a website database operation with card
identity, condition, barcode/SKU, location, price, quantity, and source
metadata. ScryDex lookup in the app should call WordPress, which calls ScryDex
with server-side credentials and returns only card/reference data needed by the
app. ScryDex API keys must never be copied into local app storage.

## Customer Credit And Square POS

Pug Game Shop credit is a WordPress ledger balance. Square POS is the local
payment processor and payment report system, not the source of truth for Pug
store-credit balances.

Default checkout flow:

1. Staff selects a customer in the offline app.
2. The app displays cached available credit and pending local credit holds.
3. Staff enters the credit amount the customer wants to use.
4. The app validates the amount against cached available credit and queues a
   `credit_redemption` operation.
5. The app shows the remaining amount due in Square POS.
6. Cashier completes the remaining tender in Square POS.
7. Cashier records the credit portion in Square as a custom payment method or
   other tender named `Pug Store Credit`, or applies a matching manual
   discount when the store chooses discount-based reporting.
8. On sync, WordPress accepts the credit redemption if the ledger still has
   enough balance, rejects overspend, or creates a manager conflict.

Store-credit additions are separate from redemption. They require a
manager-approved `credit_adjustment` or equivalent ledger operation before the
website balance becomes authoritative. Until that operation is implemented in
the offline push contract, the app should not present credit additions as
completed website balance changes.

## Admin Settings Needed

- Website URL and environment.
- Device pairing expiry and allowed scopes.
- Staff login timeout and idle lock timeout.
- Sync interval, sync page size, and retry/backoff policy.
- ScryDex search enablement and result limits.
- Inventory intake defaults: location, condition, pricing floor, label format.
- Customer credit add/redeem limits and manager approval thresholds.
- Square POS handoff mode: custom payment method, other tender, or manual
  discount reporting.
- Production safety: production pairing/deployment disabled unless explicitly
  approved.

## Immediate Implementation Priorities

1. Replace user-facing store dropdown behavior with setup/settings website
   connection UX.
2. Add staff login/session lock scaffolding and manager-only settings/credit
   controls.
3. Add offline customer creation and manager-approved credit-add operation
   support in the offline push contract and WordPress acceptor.
4. Add ScryDex app search through WordPress proxy routes.
5. Convert menu navigation into page-like workspaces with focused, functional
   controls.
