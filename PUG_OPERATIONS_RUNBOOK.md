# Pug 0.203.0 Operations Runbook

## Scope

This runbook covers the `0.203.0` LAN sync server, employee/kiosk clients, and
WordPress plugin. It assumes local SQLite is the inventory source of truth.
Commands that contact WordPress, Square, or ScryDex require an approved test
window and server-side credentials. Never place secrets in command history,
reports, screenshots, or this file.

Implemented and automated behavior is not the same as external acceptance. Use
the final checklist before enabling live projection polling or declaring the
release ready.

## Non-negotiable operating rules

1. Do not directly edit inventory, ledger, outbox, reservation, trade, or credit
   tables.
2. Treat quantities in the app and projection APIs as absolute totals.
3. Do not call a projection complete until its destination readback is
   `verified`.
4. Do not import Square overages or remote-only WordPress rows as available
   inventory without an approved recovery plan.
5. Do not clear queue or outbox rows to make a warning disappear.
6. Back up SQLite and WordPress before migrations, repairs, package patches, or
   broad connector actions.
7. Use one unique, reversible item for live Square acceptance and remove it in a
   `finally`/cleanup step.
8. Keep local store credit separate from Square gift cards and public online
   checkout.

## Release identity

- Platform and app version: `0.203.0`
- LAN API contract: version 10
- LAN authoritative schema: version 2,
  `20260718_authoritative_inventory_sync_v2`
- WordPress plugin database target: 17
- Minimum WordPress plugin runtime: PHP 8.1, WordPress 6.5, WooCommerce 8.2
- HPOS: not yet externally verified

Before operating, record the exact Git commit, package checksum, plugin version,
database path, WordPress test-site URL, Square environment/location, and UTC
maintenance window. Record identifiers, not credential values.

## Shell setup

Run repository commands from the repository root. The examples use placeholders:

```powershell
$Repo = 'C:\path\to\Pug-Game-Shop'
$ServerUrl = 'http://127.0.0.1:8787'
$headers = @{ Authorization = 'Bearer <manager-session-token>' }
Set-Location -LiteralPath $Repo
```

Create the bearer session through `POST /auth/pin` in the employee app or an
approved local administrative session. Do not embed the PIN or bearer token in
a script committed to source control.

## Start, stop, and first checks

Repository launchers:

```powershell
npm.cmd run demo:start
npm.cmd run demo:stop
```

LAN server only:

```powershell
npm.cmd run local-sync:start
```

After startup:

```powershell
Invoke-RestMethod -Uri "$ServerUrl/health"
Invoke-RestMethod -Uri "$ServerUrl/setup/status"
Invoke-RestMethod -Headers $headers -Uri "$ServerUrl/sync/status"
Invoke-RestMethod -Headers $headers -Uri "$ServerUrl/server/maintenance/status"
```

Confirm:

- Version is `0.203.0` and the expected database path is open.
- Setup points to the intended one website and correct LAN server URL.
- Connector status is configured without returning raw credentials.
- Authoritative schema is current.
- Queue, pending delivery, retry, delivered-unverified, and dead-letter counts
  are understood.
- No second LAN server is advertising authority on the same store network.
- Client heartbeats identify the expected employee and kiosk devices.

## Routine health review

At opening, after any restart, and before closeout:

1. Check `/health`, `/devices/status`, `/sync/status`, and maintenance status.
2. Review active reservations and any expired-hold cleanup result.
3. Review outbox retries/dead letters by destination.
4. Confirm the last successful WordPress, Square, and ScryDex timestamps.
5. Compare a known item in local inventory, website, kiosk, and Square.
6. Confirm no active fulfillment order is hidden in past orders.
7. Confirm price-review items are not being presented as approved live prices.
8. At closeout, checkpoint and back up the database.

## Outbox diagnostics and replay

List actionable deliveries. The API returns sanitized errors and no event
payloads or credentials:

```powershell
$uri = "$ServerUrl/sync/outbox/deliveries?statuses=pending,retry,delivered_unverified,dead_letter&limit=100"
$outbox = Invoke-RestMethod -Headers $headers -Uri $uri
$outbox.deliveries | Select-Object operation_id,destination,status,attempt_count,max_attempts,next_attempt_at_utc,last_error_code,last_error_message
```

Before replay:

1. Correct the connector, mapping, destination data, or network fault.
2. Confirm the current local aggregate still represents the intended state.
3. Check whether the destination already matches despite an earlier timeout.
4. Create a stable request ID for this operator action and a meaningful reason.

Replay only one destination:

```powershell
$body = @{
    operation_id = '<operation-id>'
    destination = 'wordpress'
    request_id = '<incident-or-change-id>'
    reason = 'Connector corrected and current local aggregate revalidated'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Headers $headers -Uri "$ServerUrl/sync/outbox/replay" -ContentType 'application/json' -Body $body
```

The same request ID is idempotent. Verified or cancelled deliveries cannot be
replayed. The server restores missing executable queue work only when the
current aggregate is still present and writes a replay audit row. After replay,
run `/sync/push`, then require exact readback.

## Inventory and projection incidents

For a wrong quantity, price, location, barcode, or visibility:

1. Search the item by public ID and current or historical barcode.
2. Inspect the latest inventory ledger entries, active reservations, queued
   operation, and each destination delivery.
3. Verify whether the observed number is on-hand, reserved, or available.
4. Correct the absolute local value through the inventory update workflow.
5. Push due work and confirm WordPress/WooCommerce and Square readback.
6. Never add a remote mismatch as a delta unless the business transaction that
   created the delta is known and idempotently recorded.

Generate a read-only cross-system report:

```powershell
npm.cmd run sync:reconcile -- --output .\PUG_SYNC_RECONCILIATION_REPORT.csv
```

Generate a local-only report when providers are unavailable:

```powershell
npm.cmd run sync:reconcile -- --local-only --output .\PUG_SYNC_RECONCILIATION_REPORT_LOCAL.csv
```

Plan safe local-to-destination repair without applying it:

```powershell
npm.cmd run sync:reconcile -- --reconcile-now --reason "Approved projection repair plan" --audit-output .\PUG_SYNC_RECONCILIATION_AUDIT.json --output .\PUG_SYNC_RECONCILIATION_REPORT.csv
```

Apply only after backup and review:

```powershell
npm.cmd run sync:reconcile -- --reconcile-now --apply --confirm-authoritative-local --reason "Approved projection repair" --database "<absolute-sqlite-path>" --audit-output .\PUG_SYNC_RECONCILIATION_AUDIT.json --output .\PUG_SYNC_RECONCILIATION_REPORT.csv
```

This queues current local projections. It does not overwrite local inventory or
adopt remote-only rows.

## Square operations

Normal background count polling may apply verified shortages as sales when
enabled. It writes local ledger/outbox state and projects WordPress without
echoing the Square-origin change back to Square.

If local and Square counts differ:

1. Confirm Square location and variation mapping.
2. Check active holds and pending local projections.
3. Run manager count reconciliation before changing inventory.
4. Treat shortages as sale candidates only when identity/mapping is exact.
5. Treat overages as exceptions. An exact one-copy return may enter
   `return_review`; ambiguous overages must remain blocked for review.
6. Use `/server/maintenance/square-sync-local-inventory` only to project known
   local authority, then require catalog and count readback.

For external acceptance, use:

```powershell
npm.cmd run square:live-reversible-smoke
```

The command intentionally requires its explicit confirmation environment flag.
It must create one unique low-value item, verify create/update/count behavior,
delete it in cleanup, and produce sanitized evidence. Do not run it during an
unapproved store window. If it fails, confirm cleanup manually by unique SKU
before any second attempt.

Square payment capture is not performed by inventory projection. Terminal/POS
payment references are external facts linked to exact local transactions.

## WordPress and WooCommerce operations

Normal inventory flow is LAN to WordPress absolute projection. Automatic
WordPress inventory polling is disabled; a website pull is a manager recovery
or bootstrap action.

Before plugin install or schema migration:

1. Back up WordPress database and `wp-content`.
2. Back up LAN SQLite and pause destination writes.
3. Build a clean plugin ZIP and record its checksum.
4. Rehearse schema 16/17 on a clone.
5. Confirm rollback package and matching backups exist.

Build commands:

```powershell
npm.cmd run package:wordpress
npm.cmd run package:wordpress-theme
```

After test-site install, verify plugin activation, database target 17, REST
health, one absolute inventory projection, WooCommerce grouped stock, product
image/condition display, one paid local-pickup order, fulfillment status push,
one serialized refund to `return_review`, and cleanup of temporary data.

Do not enable shipping for the store-only pickup workflow. Do not manually
decrement an order already marked with `inventory_sale_applied_at_utc`.

## ScryDex catalog and webhook operations

The LAN server owns catalog indexing and pricing refresh. The daily worker runs
at its configured local hour when enabled. Managers can inspect and start jobs
through:

- `GET /scrydex/catalog/status`
- `POST /scrydex/catalog/sync-jobs`
- `POST /scrydex/catalog/index` for a targeted card or set
- `POST /scrydex/catalog/webhook-refresh` for a claimed relay event

Run the read-only deterministic validator:

```powershell
npm.cmd run scrydex:validate -- --output .\PUG_SCRYDEX_VALIDATION.csv
```

Review request count, represented-set coverage, pagination completion, skipped
sets/cards, field errors, price/variant evidence, and provider response codes.
A local fixture harness is not a live provider acceptance result.

Webhook incident sequence:

1. Confirm WordPress received a signature-valid event.
2. Confirm relay state is ready or retry, not stuck in processing beyond the
   stale-claim window.
3. Confirm LAN claimed the exact provider event ID once.
4. Review targeted expansion refresh and local ScryDex job history.
5. Confirm repricing created automatic decisions or manager review as expected.
6. Confirm WordPress acknowledgement is processed or scheduled retry.

Never bypass signature validation or copy the webhook secret into a test script.
Do not claim webhook readiness until a real public WordPress-to-LAN round trip
has been observed.

## Price review

Automatic pricing requires exact identity/provenance and never publishes below
the floor. A missing variant, condition/grade fallback, stale/missing FX, large
change, or provider error can create review work while preserving the active
price.

Manager procedure:

1. Open `GET /pricing/reviews` and inspect provider, variant, condition or
   grading company/grade, source amount/currency, FX, observation time, current
   price, candidate, and floor.
2. Approve, edit-and-approve with a reason, reject, or cancel through
   `PATCH /pricing/reviews/:review_id`.
3. Confirm the local decision, ledger, operation, and outbox rows.
4. Confirm exact WordPress and Square readback before calling the price live.

Do not use a missing graded provider value as an exact quote. Preserve the
provider/fallback warning in staff-facing review.

## Trade-ins and local credit

Trade workflow:

1. Select or create the customer before acceptance.
2. Add each exact card, condition/grade, quantity, payout type, market basis,
   and one offer percentage from 0 through 100 in 5 percent increments.
3. Review cash, credit, and combined totals. The stored final line value is the
   accepted value; it must not be discounted a second time.
4. Save for later or reject without creating sellable inventory.
5. On acceptance, record required ID fields and confirm the server returns one
   deterministic inventory identity per accepted copy.
6. Confirm local credit was applied once and inventory entered
   `pending_intake` before projection.
7. Record cash payout against the drawer when applicable.

Approved records are terminal for editing. Use only the manager void/reverse
route to correct an accidental duplicate. Confirm one credit reversal and
ledgered removal of every inventory copy. Never delete ledger history or convert
local credit to a Square gift card.

## Reservations and kiosk orders

The default cart hold is 15 minutes. For a hold incident:

1. Identify the reservation, source channel, external reference, exact item,
   quantity, and expiry.
2. Compare on-hand, reserved, and available quantities.
3. Confirm active holds are excluded from kiosk/website availability.
4. Let supported expiry transition release a timed-out hold; do not edit stock
   to compensate.
5. On payment, convert once to sale and confirm destination projections.

Expired or completed kiosk orders belong in searchable history, not the active
queue. Offline cached inventory must be labeled as cached and must not accept a
zero, unavailable, or pending-review price as live.

## Fulfillment

Active pickup flow:

1. Pull eligible paid WooCommerce local-pickup and kiosk orders.
2. Confirm the audio/badge notification appears only in the employee app.
3. Claim the order and check each exact card/item while picking.
4. Mark ready only after every line is checked.
5. Complete kiosk pay-at-store pickup after payment confirmation; complete an
   already-paid website pickup without requiring a second Square receipt.
6. Confirm status push to WordPress or retain its retry/dead-letter work.
7. Confirm completed orders move to searchable past orders.

If a WooCommerce order is cancelled or refunded, verify payment history and
exact serialized line identity. Returned copies must remain in
`return_review` until staff inspects condition and explicitly restores them.
Never make an ambiguous refund immediately sellable.

## SQLite checkpoint and backup

Use manager maintenance before repair, patch, migration, or broad sync:

```powershell
$checkpoint = Invoke-RestMethod -Method Post -Headers $headers -Uri "$ServerUrl/server/maintenance/sqlite/checkpoint" -ContentType 'application/json' -Body '{}'
$backup = Invoke-RestMethod -Method Post -Headers $headers -Uri "$ServerUrl/server/maintenance/sqlite/backup" -ContentType 'application/json' -Body '{}'
$backup | Select-Object action,backup_path,backup_size_bytes,database_path
```

A backup is accepted only when:

- The absolute source path is the intended store database.
- The output exists, has a plausible nonzero size, and has a recorded checksum.
- A protected copy is stored off the active host according to retention policy.
- The matching application/plugin versions and WordPress backup are recorded.
- Restore has been exercised on an isolated host.

The backup contains customer, ID, trade, credit, and audit data. Restrict access
and do not attach it to public issue reports.

## Trade and barcode recovery tools

These tools are for a diagnosed incident, not routine cleanup. Stop all clients
and the LAN server before planning against the database.

Registered dry runs:

```powershell
npm.cmd --prefix apps/local-sync-server run ops:repair-trades:dry-run -- --database "<absolute-sqlite-path>" --report ".\trade-repair-dry-run.json"
npm.cmd --prefix apps/local-sync-server run ops:migrate-barcodes:dry-run -- --database "<absolute-sqlite-path>" --report ".\barcode-migration-dry-run.json"
```

Review every planned row, quantity invariant, collision, blocker, and generated
projection. A blocker means no apply. Apply is intentionally available only by
direct CLI and creates an additional `VACUUM INTO` backup:

```powershell
node apps/local-sync-server/tools/reconcile-trade-inventory.mjs --apply --database "<absolute-sqlite-path>" --report ".\trade-repair-apply.json"
node apps/local-sync-server/tools/migrate-barcode-aliases.mjs --apply --database "<absolute-sqlite-path>" --report ".\barcode-migration-apply.json"
```

Run only the tool whose dry-run report was approved. Preserve its report and
automatic backup. Restart, verify invariants, and process/read back only the
resulting targeted projections.

## Controlled restore

There is no one-click restore endpoint. Restore is a host-level incident action:

1. Record backup time and every later Square sale/count, WooCommerce order or
   refund, kiosk hold/payment, trade, credit entry, event, and fulfillment
   transition.
2. Close employee/kiosk clients and disable automatic polling/projection writes.
3. Capture health, setup, sync/outbox status, and an emergency backup when
   possible.
4. Stop the exact approved LAN server process. Confirm `/health` no longer
   responds.
5. Verify the configured database and backup absolute paths.
6. Move the current database plus `-wal` and `-shm` sidecars into a timestamped
   incident directory. Do not delete them.
7. Copy the verified backup into the configured database path.
8. Start the matching code package and verify schema, inventory, ledger,
   reservations, queue, outbox, trades, credit, and fulfillment.
9. Reapply or reconcile every post-backup external fact before enabling writes.
10. Require targeted WordPress and Square readback, then reopen clients with
    owner signoff.

Never immediately project restored old counts to WordPress or Square. That can
reverse legitimate sales that happened after the backup.

## Patch and restart

The maintenance patch route stages a package and can verify its SHA-256. It is
not a transactional rollback and an overlay can leave obsolete files behind.
Prefer a clean, versioned install directory.

Manager restart request:

```powershell
$body = @{ delay_seconds = 2; reason = 'Approved maintenance restart' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Headers $headers -Uri "$ServerUrl/server/maintenance/restart" -ContentType 'application/json' -Body $body
```

Before invoking, verify install root, start script, PID, listening port, and
scheduled task. After restart, repeat the first checks and perform only the
targeted sync required for the maintenance change.

## Migration and code rollback

The local authoritative v2 schema changes audit columns and adds replay audit
state. WordPress migrations 16 and 17 add durable relay and projected quantity
fields. Source contains down migrations, including
`migrations/20260718_authoritative_inventory_sync_down.sql`, but destructive
down migration is not the preferred production rollback after live activity.

Rollback requires:

1. Matching pre-change SQLite and WordPress backups.
2. Matching prior LAN, app, and plugin packages with recorded checksums.
3. Proof the prior code understands the restored schema.
4. A clean install location, not an older ZIP overlaid on newer files.
5. Reconciliation of all external events after the restore point.
6. Health, connector, inventory, queue/outbox, ScryDex, fulfillment, and
   readback verification before clients resume.

Do not drop ledger/outbox data to make old code start. Preserve the failed
database and escalate with a recovery plan.

## Build and automated verification

Run from a clean dependency install compatible with the lockfiles:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run build:offline-app:windows
npm.cmd run package:wordpress
npm.cmd run package:local-sync-server
npm.cmd run package:production-release
npm.cmd run verify:no-production-secrets
```

Also run UI end-to-end checks when the preview servers are available:

```powershell
npm.cmd run test:e2e
```

Record command, UTC time, exit code, commit, environment, and sanitized report
path. A warning printed to stderr is not automatically a test failure; preserve
the actual process exit code and relevant output. Do not omit a failing stage
from the release report.

## External acceptance checklist

Do not declare `0.203.0` ready until the exact artifacts complete all items:

- [ ] Full automated suite, PHP lint, JS/TS build, Rust tests, and package
  contracts pass from the release commit.
- [ ] No secrets, env files, customer databases, logs, caches, or test evidence
  with private data are inside release ZIPs.
- [ ] WordPress test-site backup exists; plugin installs and migrates to schema
  17 without fatal errors.
- [ ] One temporary inventory item projects to WordPress/WooCommerce and reads
  back exactly, then is removed.
- [ ] Paid local pickup, pick checklist, ready status/email, completion,
  cancellation/refund quarantine, and past-order search pass.
- [ ] Reversible live Square acceptance item passes create, update, absolute
  count, readback, and cleanup. Unique SKU is confirmed absent afterward.
- [ ] Square shortage reaches local authority and WordPress without echo; exact
  return enters `return_review`; ambiguous overage remains actionable.
- [ ] Live ScryDex validation is reviewed and one signed webhook completes the
  WordPress claim, LAN targeted refresh, repricing, and acknowledgement path.
- [ ] Kiosk 15-minute hold blocks competing sale and expires/releases correctly.
- [ ] Trade accept/retry/void, per-line quantity and payout, local credit, and
  barcode projection pass without duplicate value or inventory.
- [ ] Price floor, exact variant/condition or grade/company, manager review, and
  destination publication pass.
- [ ] Multi-PC auto-discovery, manual fallback, login/session behavior, and
  offline recovery pass on the store network.
- [ ] DYMO local-first and server fallback, receipt printer, cash drawer, and
  Square Terminal hardware pass where applicable.
- [ ] Desktop/mobile employee, kiosk, fulfillment, trade, reports, status, and
  storefront clickthrough screenshots are reviewed.
- [ ] Isolated SQLite restore drill and post-backup reconciliation pass.
- [ ] Temporary WordPress and Square data, users, application passwords, files,
  and test orders are removed; cleanup evidence is retained.
- [ ] Owner approves the release commit, checksums, rollback point, and manual
  production deployment window.

## Incident evidence

Collect UTC times, operator, release/commit/schema versions, health/setup/sync
status, affected public IDs, ledger/operation/delivery IDs, sanitized error
codes, backup path/checksum, and WordPress/Square readback. Include whether each
action was read-only, a local mutation, or an external write.

Never collect or share authorization headers, PINs, provider tokens, WordPress
application passwords, webhook secrets, full payment data, or unredacted
customer ID data.
