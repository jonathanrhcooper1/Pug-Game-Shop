# Offline App Product Requirements

## Product Direction

The offline system is a single-store operating stack for one configured
WordPress/WooCommerce website. WordPress/WooCommerce remains the global source
of truth. A local LAN sync server runs inside the store as the middleman for
employee stations and kiosk devices. It must run online with live pull/push
sync when the website is reachable and offline with a durable shared SQLite
cache/queue when the website is unavailable.

Employee apps and kiosk apps connect to the local sync server instead of each
owning an isolated local inventory authority. The local sync server coordinates
local reservation locks, prevents double-sell between in-store devices, queues
operations, and then syncs accepted operations to the website.

The underlying connector model may retain profile IDs for staging, support,
and future white-label reuse, but the cashier/staff UI must not present a
store-selection dropdown as the primary connection model. First-run and admin
maintenance should use a setup screen that connects the app to the configured
website, validates the public connector manifest, pairs the device, and stores
only secret-free metadata in browser/UI state.

## Required App Sections

- Setup: website URL, local sync server URL, manifest validation, device
  pairing, secure-store token status, sync route status, and setup
  troubleshooting.
- Login: 4-digit staff/manager PIN before app use, with user access, session
  timeout, and lock behavior controlled from WordPress admin settings and
  cached through the local sync server.
- Inventory: scan/search cards, add inventory, edit card details, create
  guarded holds, print labels, and push accepted changes to the website
  database.
- ScryDex: search/reference card data inside the app through WordPress server
  credentials, never by storing ScryDex keys in the app.
- Customers: create customers, search customers, view cached balances and
  ledger entries, add manager-approved store credit, and redeem store credit.
- Checkout/POS Handoff: calculate store-credit redemption, show remaining
  amount due, and produce the Square POS handoff instructions/metadata.
- Kiosk: customer-facing inventory lookup, pickup cart, first/last-name order
  submission, and local reservation request through the LAN sync server.
- Queue: show local sync server operations, retry/void/export for support, and
  mark accepted operations synced after website acceptance.
- Conflicts: manager-only resolution for inventory, customer credit, events,
  and stale offline operations.
- Settings: manager-only website connection, LAN sync server connection,
  timeout, sync interval, feature gates, role requirements, and device pairing
  controls.

Menu items should navigate to full app pages or page-like workspaces, not just
scroll a long developer console.

## Online And Offline Behavior

- Online mode lets the LAN sync server run authenticated pull/push sync through
  the paired website connector.
- Offline mode keeps employee scanning, inventory intake, customer lookup,
  credit redemption, event check-in, kiosk pickup orders, and queue review
  available using the LAN server's shared cache.
- Employee and kiosk apps never access MySQL directly and do not independently
  push to the website. They send requests to the local sync server.
- WordPress accepts or rejects queued operations and remains globally
  authoritative after sync.
- When the network returns, the local sync server pushes local operations, pulls
  canonical inventory/customer/event/conflict rows, marks accepted queue rows
  synced, and leaves conflicts visible for manager review.

## Login And Manager Lockdown

Before regular app use, staff must authenticate with a manager-issued 4-digit
PIN against the cached website/local sync server user policy. WordPress admin
settings and the manager Settings screen should control:

- Staff and manager PIN users.
- Which app workspaces each staff PIN can access.
- Session timeout minutes.
- Idle lock timeout minutes.
- Whether offline login is allowed from cached staff/device policy.
- Which actions require manager approval: settings, credit add, credit
  correction, conflict resolution, price override, inventory negative
  adjustment, and production connector changes.
- Whether a manager override expires after each action, after a timed window,
  or at logout.

The app must lock settings by default unless the current session has a manager
role or a valid manager override. PIN credentials must be stored as hashes in
the local sync server and WordPress policy stores; desktop/kiosk clients should
only keep the active session state needed for the current app run.

## Inventory And ScryDex

Inventory added from the app must queue a website database operation with card
identity, condition, barcode/SKU, location, price, quantity, and source
metadata. ScryDex lookup in the app should call WordPress, which calls ScryDex
with server-side credentials and returns only card/reference data needed by the
app. ScryDex API keys must never be copied into local app storage.

## Local Sync Server

The local sync server is required when more than one in-store device is active.
It runs on a store PC or small dedicated machine on the LAN. Employee apps and
kiosks connect to it by URL or host name during setup.

The local sync server owns:

- Shared SQLite cache for inventory, customers, credit, events, conflicts, and
  reference data.
- Shared operation queue for employee, manager, and kiosk actions.
- Cached staff/manager PIN access policy with hashed PIN credentials.
- Local reservation locks so two in-store devices cannot select the same exact
  inventory item while offline.
- Kiosk pickup carts keyed by customer first and last name.
- Pull/push workers to the WordPress offline REST API.
- Health/status endpoints for every client.

If the internet is unavailable, the local sync server continues accepting local
operations. If the LAN sync server itself is unavailable, client apps should
fail closed for inventory holds and kiosk orders, then prompt staff to restore
the local server or use an explicitly enabled emergency single-device mode.

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
2. Add LAN sync server setup, health, shared-cache, and local reservation-lock
   runtime.
3. Add 4-digit PIN login/session lock scaffolding, manager user/access
   management, and manager-only settings/credit controls.
4. Add offline customer creation and manager-approved credit-add operation
   support in the offline push contract and WordPress acceptor.
5. Add ScryDex app search through WordPress proxy routes.
6. Convert menu navigation into page-like workspaces with focused, functional
   controls.
