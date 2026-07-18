# Flow Trace

Date: 2026-07-07
Branch: `fix/inventory-sync-lan-source-of-truth`

## Inventory Qty Update

Current fixed flow:
1. App calls `localSyncClient.updateInventoryItem()`.
2. HTTP route `PATCH /inventory/items/:inventory_public_id` reaches the LAN middleman.
3. LAN store validates staff access, requested quantity, price floor, visibility, reason, and item identity.
4. LAN store persists the authoritative row in SQLite `inventory_items`.
5. LAN store queues the outbound sync operation in `operation_queue` when WordPress/Square acceptance is needed.
6. App refetches the barcode via `searchInventory()` and merges the authoritative LAN row back into UI state.
7. App refreshes `/sync/status` so queue count and status match the middleman.

Important files:
- `apps/offline-app/src/App.tsx`
- `apps/offline-app/src/data/localSyncServerClient.ts`
- `apps/local-sync-server/src/localSyncHttpServer.mjs`
- `apps/local-sync-server/src/localSyncStore.mjs`

## Website/Kiosk/App/POS/Square Inventory Authority

Expected authority model:
- LAN middleman is the local source of truth.
- Website, kiosk, app/POS, and Square events must create inventory mutation or reconciliation requests.
- Final inventory changes should be accepted only after LAN validation and idempotency/version checks.
- Zero inventory rows are treated as unavailable for kiosk/app display and outbound website/Square visibility.
- Absolute quantity updates and delta quantity updates are mutually exclusive so staff changes cannot double-apply.
- Credit adjustments allow negative values only with a reason and go through the LAN credit ledger push path.

Relevant existing paths:
- Website pull/push: `/sync/pull`, `/sync/push`
- Inventory intake: `/inventory/intake`
- Inventory update: `/inventory/items/:id`
- Kiosk reservations: `/inventory/reservations`, `/kiosk/orders`
- Square sale finalization: `/pos/square/sales/finalize`
- Square reconciliation/reporting: `/pos/square/inventory-counts/reconcile`, `/pos/square/sales/reconcile`, `/pos/square/reports/sales/pull`

Observed server status:
- `inventory_source_of_truth: local_sync_server`
- Square sales report pull is read-only for payment data and reported `inventory_mutated: false`.
- App status page: `store-sync.sqlite; 2649 inventory rows`, `queue 0`, `inventory pull on`, `event pull on`, `push on`.
- App queue page: `0 LAN pending ops; 0 device-only ops`.

## ScryDex Sync Job

Fixed branch/deployed flow:
1. App ScryDex tab renders `ScryDex Manual Sync`.
2. Staff clicks a per-game `Sync Now`.
3. App calls `POST /scrydex/catalog/sync-jobs` with `{ game }`.
4. LAN store starts a background catalog job and records stage/counts in memory.
5. Job calls the configured WordPress/ScryDex catalog export page by page.
6. Rows are normalized with `normalizeReferenceCard()`.
7. Rows for the selected game are saved to SQLite `reference_cards`.
8. App polls `/sync/status`; status includes `scrydex_catalog_status.active_job`, `recent_jobs`, totals, game counts, and errors.
9. If every game in an active job reaches terminal status while downstream work is blocked/hung, the deployed LAN server reconciles the job into history and clears `active_job` so staff can retry.

Compatibility note:
- The installed 0.202.19 LAN server already returns a richer job shape with `games[]`, `stored_cards`, `variants`, and `prices`.
- The app now adapts both job shapes so live progress/error details display instead of rendering blank `undefined` labels.
- The branch local-sync-server source is now aligned to deployed `0.202.19` so the packaged server keeps the richer job model.

Regression coverage:
- `local-sync-server-scrydex-catalog-jobs.mjs` covers per-game job start, duplicate running-job block, completed-with-errors history, webhook refresh, and terminal-game recovery when downstream catalog pull hangs.
- `local-sync-server-inventory-quantity-update.mjs` covers absolute quantity, delta quantity, grouped quantity consolidation, zero-count removal, persistence after restart, and ambiguous absolute+delta rejection.
- `local-sync-server-maintenance.mjs` covers queue/status maintenance recovery paths.
- `local-sync-server-square-sale-removal-sync.mjs` and `local-sync-server-wordpress-inventory-square-sync.mjs` cover Square sale removal and WordPress/Square inventory sync contracts.
- `wordpress-credit-push.mjs` covers outbound credit ledger push, including negative adjustment routing and required staff reason handling.
- Offline app contracts cover the credit adjustment UI label, queue bridge, local sync client, Tauri commands, and persisted queue behavior.

## Queue Processing/Clearing

Current successful queue flow:
1. LAN operation is appended to SQLite `operation_queue`.
2. `/sync/push` selects pending operations.
3. Successful WordPress/Square acceptance deletes or reconciles the operation.
4. Duplicate accepted inventory can be reconciled by `/sync/pull` when WordPress returns the authoritative row.
5. `/sync/status` reports only active pending items.
6. App Queue/Status screens read the LAN middleman status directly, so every employee station sees the same review queue.

Recent stuck-queue root cause:
- Square returned `IDEMPOTENCY_KEY_REUSED` for queued inventory sync requests.
- WordPress rejected one duplicate barcode/SKU intake that Square had already accepted.

Applied recovery/fix in installed server:
- Square catalog/inventory idempotency keys include a stable payload hash.
- Inventory occurrence timestamps are deterministic.
- Duplicate WordPress barcode/SKU was reconciled by targeted inventory pull.
- Queue is now `pending_count: 0`.

## Database Tables

- `inventory_items`: authoritative local inventory rows and quantities.
- `reference_cards`: local ScryDex/ScryDex-derived catalog cache.
- `operation_queue`: pending LAN-to-website/Square/customer/event operations.
- `kiosk_orders`, `fulfillment_orders`, `customers`, `credit_ledger_entries`, `event_snapshots`: related local queues/state.

## Request Examples

Inventory update:
```json
{
  "quantity_on_hand": 17,
  "quantity_delta": 1,
  "reason": "staff inventory update",
  "sync_intent": "staff_inventory_update"
}
```

ScryDex game sync:
```json
{
  "game": "pokemon"
}
```

Queue status:
```json
{
  "queue_depth": 0,
  "queue_summary": {
    "pending_count": 0,
    "items": []
  }
}
```

## Final Verification

- `npm --prefix apps/local-sync-server test`: passed the full 0.202.19 middleman suite, including inventory quantity, Square reconciliation, Square sale reporting, WordPress sale push, credit push, kiosk push, ScryDex jobs, and queue maintenance.
- `npm run test:offline-app`: passed TypeScript, offline app contracts, and 22 Rust/Tauri tests.
- `npm run build`: passed.
- `npm run test:packaging`: passed.
- `npm run package:production-release`: passed and produced the 0.202.19 app/kiosk installers, LAN server zip, WordPress plugin/theme zips, and combined deliverables zip.
