# Offline Sync

## Model

The desktop app contains:

- A local SQLite read model for inventory, reference cards, customers/credit
  summaries, events, carts, and configuration.
- A local image cache.
- An append-only operation queue.
- A local immutable sync log.
- A device-specific server cursor and entity row versions.

WordPress becomes authoritative when an operation is accepted. The app does not
perform direct MySQL access.

## Operation Envelope

Every queued action includes:

`client_operation_id`, `device_id`, `location_id`, `actor_id`,
`operation_type`, `entity_type`, `entity_id`, `base_row_version`,
`occurred_at_local`, `queued_at_utc`, `payload`, `authorization_context`,
and `schema_version`.

`client_operation_id` is globally unique and server-deduplicated.

## Push

1. Device authenticates and submits a bounded ordered batch.
2. Server validates device scope, actor permission, schema version, and
   idempotency.
3. Each independent operation commits or returns a durable conflict/error.
4. Server returns canonical entity state and new row version.
5. Device marks accepted operations immutable and updates its read model.
6. Failed transient operations remain queued with bounded retry metadata.

Operations that must be atomic together use a declared batch group; unrelated
actions do not share a transaction.

## Pull

The server exposes a monotonic change sequence with tombstones. The device asks
for changes after its last cursor, applies them transactionally to SQLite, then
advances the cursor. Full resync is available when cursor history expires or
local integrity checks fail.

## Conflict Rules

| Conflict | Default result |
| --- | --- |
| Exact item sold online before offline reserve/sale arrives | Reject inventory transition; manager resolves customer outcome |
| Item price changed before offline sale | Record price conflict; manager accepts old price, adjusts, refunds, or overrides |
| Credit spent online and offline | Reject excess posting; preserve attempted redemption and require manager resolution |
| Event reached capacity | Waitlist if allowed, otherwise staff review |
| Customer merged/edited | Preserve both payloads and field-level differences |
| Inventory edited in both places | Auto-merge only disjoint, explicitly mergeable fields; otherwise manager review |

No last-write-wins policy is used for money, inventory status, identity merges,
minimum price, or manager-controlled fields.

The first shared sync-engine policy module is implemented and tested for:

- Offline inventory reservation acceptance and unavailable-item conflict.
- Offline event reservation acceptance, waitlist, and capacity conflict.
- Offline credit redemption acceptance, cached-limit rejection, and server
  overspend conflict.
- Revoked device push rejection before operation handling.

The Tauri app packaging scaffold, Windows `.exe` installer contract, and first
SQLite schema contract are now implemented. Live SQLite persistence services,
WordPress offline push/pull handlers, live pairing, and full reconnect
integration tests remain future phases. The WordPress plugin now includes
planned route contracts for device pairing, pull, push, conflict listing, and
conflict resolution, but those endpoints are not registered live yet.

The first SQLite migration defines local tables for device identity, sync
cursors, queued operations, sync logs, cached branding, cached inventory,
cached customer credit, cached events, and sync conflicts. Direct MySQL access
is explicitly disallowed.

## Offline Reservations

Offline reservations are local claims only and cannot guarantee global
availability. The UI labels them `pending sync`. When a sale is completed
offline, the item becomes `offline_pending_sync` locally and cannot be reused on
that device. Server conflict handling determines final authority.

## Offline Credit

- Redemption is limited to the cached available balance.
- A configurable per-device/per-customer offline risk ceiling may lower that
  limit, but never increase it.
- Customer identity and staff authorization are required.
- The queue records the balance/version used for the decision.
- Conflict never silently creates negative credit.

## Security

- SQLite is encrypted when supported by the selected library/build; otherwise
  sensitive cached fields are application-encrypted and the risk is documented
  before release.
- Device tokens are held in Windows protected credential storage.
- Kiosk mode minimizes cached personal data and clears active session data on
  inactivity.
- Manager actions require online or cached, time-limited manager
  reauthentication according to policy.

## Recovery

- Export an encrypted diagnostic bundle containing schema version, queue
  metadata, masked logs, and integrity results.
- Never include API keys or full customer contact data in diagnostics.
- A device may be revoked without deleting its unresolved server conflicts.
- Reinstall supports pairing and a fresh full sync; unsent operations must be
  exported/recovered before destructive reset.
