# REST API

## Contract Rules

- Namespace: `/wp-json/tcg-store/v1`.
- JSON request and response bodies use `snake_case`.
- Every write accepts `Idempotency-Key`; offline writes require it.
- Mutable resources expose `row_version`; updates may require `If-Match`.
- Pagination uses `page`, `page_size`, and opaque `cursor` where appropriate.
- Errors use `{ code, message, details, request_id }`.
- Collection responses use `{ data, paging, meta }`.
- Permissions are checked in each route `permission_callback`.
- Device endpoints require scoped device credentials, never administrator
  application passwords.

## Route Map

Current implementation status: dependency-free route contract tests cover the
health endpoint plus public Events list/detail/registration routes. WordPress
integration smoke tests verify those routes register in a real WordPress
process. Planned customer credit route contracts and posting payload validation
and planned buylist route contracts plus intake payload validation are
implemented but not registered live. Planned offline device pairing, push,
pull, conflict list, and conflict resolution route contracts are implemented
but not registered live. Offline push payload validation is implemented for
operation envelope shape, duplicate operation IDs, device matching, supported
operation/entity pairs, timestamps, and schema version gating. Full permission,
nonce, request/response, and write-flow REST tests remain staging-gated as each
route family is implemented. Offline pull request validation is implemented for
device IDs, requested cached domains, domain cursors, page-size bounds,
tombstone inclusion, and schema version gating. Offline pull response
presentation is implemented for stable per-domain cursors, data rows,
tombstones, server timestamps, and `has_more` pagination flags. Offline device
pairing request validation is implemented for pairing codes, installation IDs,
device modes, manager/location IDs, app versions, Windows platform checks,
hardware capabilities, requested scopes, and schema version gating. Offline
device registration planning is implemented for future device rows, one-time
response payloads, token hash storage fields, sync routes, first-sync flags,
and redacted audit payloads. Offline device bearer-token authentication
planning is implemented for future registered-device permission callbacks,
including header normalization, device token validation, token hash comparison,
persisted device ID checks, and secret-free accepted contexts.

### Inventory And Search

| Method | Route | Minimum permission |
| --- | --- | --- |
| GET | `/inventory` | `view_inventory` |
| GET | `/inventory/{id}` | public visibility or `view_inventory` |
| POST | `/inventory` | `create_inventory` |
| PUT | `/inventory/{id}` | `edit_inventory` |
| POST | `/inventory/{id}/reserve` | source-specific authenticated principal |
| POST | `/inventory/{id}/release` | reservation owner or staff |
| POST | `/inventory/{id}/mark-sold` | staff/POS device |
| POST | `/inventory/{id}/move` | `edit_inventory` |
| POST | `/inventory/{id}/price-lock` | `edit_prices` |
| POST | `/inventory/bulk-intake` | `create_inventory` |
| POST | `/inventory/import` | manager/admin |
| POST | `/inventory/export` | `view_reports` |
| GET | `/search` | public filtered response |
| GET | `/reference/search` | public/configured limits |
| GET | `/inventory/search` | public or staff fields by capability |
| GET | `/search/versions` | public |

### Pricing And Overrides

| Method | Route | Permission |
| --- | --- | --- |
| POST | `/pricing/recalculate` | `edit_prices` |
| GET | `/pricing/history/{inventory_id}` | public/configured or staff |
| GET | `/pricing/floor-hits` | `view_reports` |
| POST | `/pricing/override` | employee plus manager reauthorization |

Manager override policy and persistence/audit payload planning are implemented
locally for below-minimum sale approvals. Live `/pricing/override` route
registration, manager reauthentication, rate limiting, database writes, and
WooCommerce/POS hook wiring remain disabled.

### Sync And Webhooks

| Method | Route | Permission |
| --- | --- | --- |
| POST | `/sync/full` | `manage_settings` |
| POST | `/sync/resume` | `manage_settings` |
| POST | `/sync/prices` | `edit_prices` |
| POST | `/sync/images` | `manage_settings` |
| POST | `/sync/game/{game}` | `manage_settings` |
| POST | `/sync/set/{set_id}` | `manage_settings` |
| POST | `/sync/pause/{job_id}` | `manage_settings` |
| POST | `/sync/cancel/{job_id}` | `manage_settings` |
| GET | `/sync/jobs` | staff sync visibility |
| GET | `/sync/jobs/{job_id}` | staff sync visibility |
| GET | `/sync/jobs/{job_id}/logs` | staff sync visibility |
| GET | `/sync/jobs/{job_id}/events` | staff sync visibility |
| POST | `/webhooks/scrydex` | verified provider signature |

The events route may use polling first. Server-sent events are enabled only
after target GoDaddy proxy buffering and connection limits are verified.

### Kiosk And Pick Queue

| Method | Route | Permission |
| --- | --- | --- |
| POST | `/kiosk/cart` | kiosk device |
| GET | `/kiosk/cart/{cart_id}` | cart token or staff |
| POST | `/kiosk/cart/{cart_id}/items` | cart token |
| DELETE | `/kiosk/cart/{cart_id}/items/{item_id}` | cart token |
| POST | `/kiosk/cart/{cart_id}/submit` | cart token |
| POST | `/kiosk/cart/{cart_id}/release` | cart token or staff |
| GET | `/kiosk/config` | kiosk device |
| GET | `/pick-queue` | staff |
| POST | `/pick-queue/{id}/start` | staff |
| POST | `/pick-queue/{id}/ready` | staff |
| POST | `/pick-queue/{id}/assign` | staff |
| POST | `/pick-queue/{id}/conflict` | staff |

### Customers And Credit

| Method | Route | Permission |
| --- | --- | --- |
| GET | `/customers/search` | staff |
| GET | `/customers/{id}` | staff or verified self |
| POST | `/customers` | staff/kiosk limited |
| PUT | `/customers/{id}` | staff or verified self-limited |
| GET | `/customers/{id}/credit` | staff or verified self |
| GET | `/customers/{id}/ledger` | staff or verified self |
| POST | `/customers/{id}/credit/adjust` | manager approval |
| POST | `/customers/{id}/credit/redeem` | staff or online checkout |
| POST | `/customers/merge` | manager |

Customer credit route contracts for balance, ledger, adjustment, and redemption
exist locally with live registration disabled. Posting payload validation
requires a matching route customer, `Idempotency-Key` header or
`idempotency_key` body field, valid amount/currency, object metadata, positive
linked IDs, and manager ID plus reason for manager-approved entry types. REST
response presentation is implemented for balance, ledger, posting-result, and
validation-error payloads, including safe customer field selection and redacted
ledger metadata.

### Buylist

| Method | Route | Permission |
| --- | --- | --- |
| POST | `/buylist/submissions` | kiosk/customer/staff |
| GET | `/buylist/submissions` | staff |
| GET | `/buylist/submissions/{id}` | owner token or staff |
| POST | `/buylist/submissions/{id}/review` | staff |
| POST | `/buylist/submissions/{id}/offer` | staff/manager threshold |
| POST | `/buylist/submissions/{id}/accept` | verified customer/staff |
| POST | `/buylist/items/{id}/convert-to-inventory` | `create_inventory` |

Buylist route contracts for intake, listing, detail, review, offer, acceptance,
and conversion exist locally with live registration disabled. Submission intake
payload validation requires source, idempotency key, customer phone, valid
currency, at least one item, card identity per item, positive quantity, valid
owner token hash when supplied, and grading details for graded cards. Offer
planning is implemented for reviewed item offer rows, cash/credit totals,
manager approval thresholds, target submission status, expiry, and
deterministic offer fingerprints.

### Events

| Method | Route | Permission |
| --- | --- | --- |
| GET | `/events` | public |
| GET | `/events/{slug}` | public |
| POST | `/events/{slug}/register` | public local registration |
| POST | `/events` | `manage_events` |
| PUT | `/events/{id}` | `manage_events` |
| POST | `/events/{id}/cancel` | owner or staff |
| POST | `/events/{id}/check-in` | event staff |
| GET | `/events/{id}/attendees` | event staff |
| POST | `/events/{id}/sync-topdeck` | `sync_topdeck` |
| POST | `/events/import-topdeck` | `sync_topdeck` |
| POST | `/webhooks/topdeck` | disabled until documented/configured |

`POST /events/{slug}/register` accepts free and pay-at-store local
reservations only. It uses the `Idempotency-Key` header or `idempotency_key`
body field, rejects TopDeck-hosted local writes, writes waitlist rows when
capacity is full and waitlist is enabled, and does not capture online payments
or call TopDeck yet. Eligible free website-push registrations write a pending
local TopDeck sync-log record for a later worker phase. Active same-event/email
registrations are returned as `already_registered`; idempotency keys reused
across another event or email return `idempotency_conflict`.

### Offline And POS

| Method | Route | Permission |
| --- | --- | --- |
| POST | `/offline/devices/register` | pairing code plus manager |
| POST | `/offline/pull` | registered device |
| POST | `/offline/push` | registered device |
| GET | `/offline/conflicts` | `resolve_conflicts` |
| POST | `/offline/conflicts/{id}/resolve` | `resolve_conflicts` |
| POST | `/pos/sale` | POS/staff device |
| POST | `/pos/refund` | POS/staff device |
| POST | `/pos/sync` | POS adapter |
| GET | `/pos/logs` | manager/report permission |

Offline route contracts now exist locally for the five offline routes listed
above. They document callback names, route permissions, the shared
`tcg-store/v1` namespace, and disabled-live defaults for the Windows app
integration. The offline device pairing parser now validates pairing codes,
installation IDs, device labels, device modes, manager/location IDs, app
versions, Windows platform checks, hardware capabilities, requested scopes, and
schema version `1`. The offline push payload parser now validates batch IDs, device
matching, client operation IDs, supported `inventory_reservation`,
`event_reservation`, and `credit_redemption` operation envelopes, ISO
timestamps, JSON-object payloads, authorization context, duplicate IDs, and
schema version `1`. Parsed push operations can now be resolved into planned
accepted, rejected, or conflict outcomes with future operation result rows,
API response payloads, manager-reviewed conflict rows, deterministic conflict
IDs, and redacted audit payloads. Offline bearer-token authentication planning
now validates request headers, token shape, SHA-256 token hashes, persisted
offline device IDs, revocation, expiry, and required scopes before future
route handlers proceed. Live device pairing route writes, device row lookup,
last-seen updates, push/pull workers, queue replay, canonical entity writes,
and conflict persistence remain disabled until staging-gated WordPress/offline
integration tests pass. Offline pull request
validation also exists for the SQLite cached domains `branding`, `inventory`,
`customer_credit`, `events`, and `conflicts`, including cursor shape, page-size
limits, tombstone inclusion, and schema version `1`. Offline pull response
presentation now shapes accepted pull results as:

```json
{
  "device_id": "device-main-01",
  "schema_version": 1,
  "server_time_utc": "2026-06-06T15:45:00Z",
  "domains": {
    "inventory": {
      "cursor": "inv-cursor-42",
      "has_more": false,
      "data": [
        {
          "entity_type": "inventory_item",
          "entity_id": "inv-1001",
          "row_version": 42,
          "updated_at_utc": "2026-06-06T15:41:00Z",
          "payload": {}
        }
      ],
      "tombstones": []
    }
  }
}
```

Live database change queries, tombstone repositories, and cursor advancement
remain disabled until device authentication and reconnect tests pass.

The planned pairing request body is shaped as:

```json
{
  "pairing_code": "PAIR-1234",
  "installation_id": "install-main-01",
  "device_label": "Front Counter Kiosk",
  "device_mode": "kiosk",
  "location_id": 2,
  "manager_id": 15,
  "app_version": "0.50.0",
  "platform": "windows",
  "capabilities": {
    "barcode_scanner": true,
    "label_printer": false,
    "touchscreen": true
  },
  "requested_scopes": ["offline_pull", "kiosk"],
  "schema_version": 1
}
```

Live token issuance, token hashing/storage, revocation checks, and first-sync
execution remain disabled until staging tests pass.

When the future route is enabled, the planned successful response body is:

```json
{
  "device_id": "device-main-01",
  "device_token": "returned-once-by-live-route",
  "token_expires_at_utc": "2026-06-07T16:00:00Z",
  "schema_version": 1,
  "scopes": ["offline_pull", "offline_push", "kiosk"],
  "sync_routes": {
    "pull": "/wp-json/tcg-store/v1/offline/pull",
    "push": "/wp-json/tcg-store/v1/offline/push",
    "conflicts": "/wp-json/tcg-store/v1/offline/conflicts"
  },
  "first_sync_required": true,
  "server_time_utc": "2026-06-06T16:00:00Z",
  "branding_sync_required": true
}
```

The planned audit payload intentionally excludes `device_token` and
`token_hash`; live persistence remains disabled.

The planned offline push operation response for an accepted operation is shaped
as:

```json
{
  "client_operation_id": "op-00001",
  "status": "accepted",
  "code": "inventory_reserved",
  "details": {
    "canonicalStatus": "reserved",
    "rowVersion": 5
  },
  "server_time_utc": "2026-06-06T19:00:00Z"
}
```

Conflict outcomes additionally include a deterministic `conflict_id` in
`details` and a future `tcg_sync_conflicts` row containing server payload,
device payload, row versions, severity, summary, and manager resolution
options. Live operation result persistence, canonical entity mutation, conflict
row insertion, and cursor advancement remain disabled until staging tests pass.

The planned batch response wraps per-operation results with stable counts:

```json
{
  "batch_id": "batch-main-01",
  "device_id": "device-main-01",
  "server_time_utc": "2026-06-06T20:00:00Z",
  "operation_count": 3,
  "counts": {
    "accepted": 2,
    "conflict": 1,
    "rejected": 0
  },
  "results": []
}
```

The batch planner requires server snapshots keyed by client operation ID,
`entity_type:entity_id`, or operation index before resolving operations. Live
push route handlers and repository-backed snapshot loading remain disabled
until staging tests pass.

Schema migration `0008_offline-sync` now defines the future persistence tables
for registered offline devices, idempotent operation queue/result rows,
manager-reviewed conflicts, and per-device pull cursors. The REST route
contracts still report the offline endpoints as disabled by default until the
permission callbacks and repository-backed handlers are wired through staging.
Offline push persistence planning now maps accepted/rejected/conflict batch
results into future queue rows, conflict rows, idempotent replay rows, and
redacted audit payloads before any live database writes are enabled.

Registered-device access policy checks are implemented for the future
`registered_device` permission boundary. The policy validates active status,
revocation timestamps, token expiry, required scopes, supported modes/scopes,
location IDs, and UTC timestamps before a pull, push, or conflict request can
proceed. Offline bearer-token authentication planning now adds header
normalization, token shape validation, SHA-256 token hash comparison,
persisted device ID validation, and secret-free accepted contexts. Live device
row lookup, last-seen updates, and REST permission callback wiring remain
disabled until staging tests pass.

The planned conflict list request accepts query/body filters shaped as:

```json
{
  "device_id": "device-main-01",
  "statuses": ["open", "assigned", "resolving"],
  "entity_types": ["inventory", "event", "customer_credit"],
  "cursor": "conflict-cursor-10",
  "page_size": 50,
  "include_resolved": false,
  "schema_version": 1
}
```

The planned conflict resolution body is shaped as:

```json
{
  "resolution_id": "resolution-main-01",
  "device_id": "device-main-01",
  "manager_id": 15,
  "resolution_action": "manager_adjust",
  "resolution_note": "Adjusted after staff verified scan",
  "expected_conflict_version": 12,
  "resolved_at_utc": "2026-06-06T17:00:00Z",
  "resolution_payload": {
    "accepted_inventory_status": "sold"
  },
  "schema_version": 1
}
```

Supported conflict resolution actions are `accept_server`, `accept_device`,
`manager_adjust`, `retry_operation`, and `dismiss`. Live conflict repository
reads, mutation writes, manager audit persistence, and resolved-state
propagation remain disabled until staging integration tests pass.

The planned conflict list response is shaped as:

```json
{
  "device_id": "device-main-01",
  "schema_version": 1,
  "server_time_utc": "2026-06-06T18:00:00Z",
  "cursor": "conflict-cursor-11",
  "has_more": true,
  "filters": {
    "statuses": ["open", "assigned"],
    "entity_types": ["inventory", "event"],
    "include_resolved": false
  },
  "conflicts": [
    {
      "conflict_id": "conflict-main-01",
      "status": "open",
      "entity_type": "inventory",
      "entity_id": "inv-1001",
      "conflict_type": "double_sell",
      "severity": "blocking",
      "summary": "Online sale and offline sale both claimed item",
      "row_version": 7,
      "server_row_version": 12,
      "device_row_version": 11,
      "detected_at_utc": "2026-06-06T17:50:00Z",
      "updated_at_utc": "2026-06-06T17:55:00Z",
      "server_payload": {},
      "device_payload": {},
      "resolution_options": ["accept_server", "accept_device"]
    }
  ]
}
```

When a future conflict resolution request is accepted, the planner prepares a
response shaped as:

```json
{
  "conflict_id": "conflict-main-01",
  "resolution_id": "resolution-main-01",
  "status": "resolved",
  "row_version": 13,
  "resolution_action": "manager_adjust",
  "resolved_at_utc": "2026-06-06T18:00:00Z",
  "server_time_utc": "2026-06-06T18:05:00Z",
  "schema_version": 1
}
```

The corresponding planned audit payload records a deterministic hash of the
resolution payload instead of storing the full adjustment payload. Live conflict
mutation writes and audit persistence remain disabled until staging tests pass.

## WooCommerce Hook Map

| Hook / interface | Responsibility |
| --- | --- |
| `woocommerce_add_to_cart_validation` | Require `inventory_id`, reserve atomically, reject unavailable items |
| `woocommerce_add_cart_item_data` | Store reservation ID, inventory ID, barcode, and immutable display snapshot |
| `woocommerce_get_cart_item_from_session` | Restore metadata and revalidate reservation ownership/expiry |
| `woocommerce_check_cart_items` | Revalidate every exact item before cart/checkout |
| `woocommerce_before_calculate_totals` | Set server-authoritative serialized item price; never trust client price |
| `woocommerce_checkout_create_order_line_item` | Persist inventory/reservation snapshots via CRUD |
| `woocommerce_store_api_checkout_update_order_from_request` | Apply required Store API checkout metadata |
| `woocommerce_store_api_checkout_order_processed` | Final pre-payment reservation/order linkage for Checkout Blocks |
| `woocommerce_payment_complete` | Convert active reservations to sold idempotently |
| `woocommerce_order_status_changed` | Reconcile processing/completed/cancelled/failed/refunded transitions |
| `woocommerce_order_status_cancelled` | Release eligible reservations |
| `woocommerce_order_status_failed` | Release eligible reservations after payment failure |
| `woocommerce_refund_created` / `woocommerce_order_refunded` | Move exact items to returned or pending review |
| `woocommerce_cart_item_removed` | Release reservation unless retained by another valid cart/order state |
| `woocommerce_cart_emptied` | Release all cart-owned active reservations |
| Action Scheduler cleanup action | Expire orphaned reservations and reconcile Woo sessions |

Checkout Blocks support is tested explicitly. Legacy hooks are used only where
WooCommerce documents them as migrated/supported; block extension interfaces
are preferred for client-visible UI.

Current implementation status: the serialized cart item metadata validator is
implemented and tested for exact inventory/reservation IDs, owner token hashes,
single-item quantities, price snapshots, ISO currency, and unexpired
reservations. The order-line metadata planner is implemented and tested for
exact inventory, reservation, owner-token, price snapshot, currency, expiry,
optional card descriptors, and deterministic snapshot hashes. The order
lifecycle planner is implemented and tested for checkout order linkage,
payment-complete conversion, failed/cancelled release, refund return-review
planning, duplicate reservation guards, and non-serialized line skipping. The
live WooCommerce hooks listed above remain disabled until the full staging
checkout lifecycle suite passes.

## Authentication

- Same-origin WordPress admin/staff UI: secure cookies plus `X-WP-Nonce`.
- External trusted admin tools: WordPress Application Passwords over HTTPS where
  appropriate.
- Offline/kiosk devices: plugin-issued scoped bearer token with hashed server
  storage, device ID, location, mode, expiry, and rotation.
- Provider webhooks: raw-body signature verification, timestamp tolerance,
  provider event ID deduplication, then asynchronous processing.

## API Versioning

Breaking changes require `/v2` or an explicit compatibility layer. Additive
fields are allowed in `/v1`. Enum additions must be treated as unknown by
clients rather than crashing.
