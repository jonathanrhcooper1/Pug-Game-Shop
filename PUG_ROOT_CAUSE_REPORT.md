# Pug 0.203.1 Root Cause Report

## Purpose

This report records the systemic causes addressed by the `0.203.1` repair work.
It is based on the current branch source and automated tests. It does not claim
that the repaired build has completed external acceptance against the live
store, WordPress host, Square account, ScryDex account, LAN workstations, or
hardware.

## Executive finding

The recurring inventory, queue, trade, pricing, and fulfillment failures were
not one isolated UI defect. The system previously allowed several components to
behave as partial authorities, mixed absolute quantities with deltas, treated a
successful HTTP response as completed synchronization, and lacked enough durable
identity and replay evidence to recover safely. These problems amplified one
another: a duplicate or stale remote fact could change local stock, retries
could repeat work, and operators could not distinguish delivery from verified
readback.

The repair establishes one local transactional authority, idempotent inbound
facts, absolute outbound projections, exact destination readback, and auditable
exception handling.

## Findings and repairs

| Area | Root cause | Repair present in `0.203.1` | Automated evidence |
| --- | --- | --- | --- |
| Inventory authority | WordPress, Square, app state, and queue payloads could each appear canonical | LAN SQLite is the inventory authority; WordPress, Square, and kiosk are projections | Authority, inventory quantity, projection, and reconciliation suites |
| Quantity growth and duplicate stock | Some paths interpreted an entered total as an amount to add, or replayed the same remote fact | Absolute `quantity_on_hand`, explicit delta audit, idempotency keys, and atomic Woo/Square sale application | Inventory quantity, Woo sale atomicity, Square reconciliation tests |
| Partial writes | Aggregate, queue, credit, and projection records could be created at different times | `BEGIN IMMEDIATE` encloses aggregate, ledger, operation queue, and outbox writes | Ledger atomicity, trade, reservation, and fulfillment tests |
| False sync success | Destination acceptance was inferred from transport success | WordPress/WooCommerce and Square must return exact state readback before verification | WordPress and Square projection/readback tests |
| Coupled destinations | One destination success could hide another failure | One outbox event owns independent WordPress, Square, and kiosk delivery rows | Projection delivery tests |
| Retry storms and opaque dead letters | Queue processing did not consistently honor due time and lacked supported replay evidence | Due-time gating, leases, capped backoff, max attempts, sanitized manager listing, and audited one-destination replay | Authoritative ledger and projection delivery tests |
| Square sales not reaching local stock | Provider count polling was diagnostic instead of applying verified shortages | Background poll applies shortage facts transactionally, projects WordPress, and avoids echoing the change back to Square | Square inventory reconciliation tests |
| Square return/overage risk | A positive provider count could be imported as sellable stock without provenance | Exact one-copy sold returns move to `return_review`; ambiguous overages require review | Square reconciliation tests |
| WooCommerce order double decrement | Repeated pulls or partially matchable orders could apply stock more than once | Full-order allocation is all-or-nothing and stamped with an applied marker and idempotent ledger references | Woo sale atomicity and fulfillment tests |
| WooCommerce refunded stock | Refund state did not preserve exact serialized identity or quarantine condition review | Exact sold copies enter non-sellable `return_review`; unsupported/ambiguous refunds do not create stock | WordPress serialized refund tests |
| Trade value applied twice | Client-calculated percentages could be recalculated during acceptance | Server freezes the stored final line offer; percentage is applied once | Trade double-discount regression test |
| Duplicate trade inventory/credit | Client and server could both attempt conversion, and retries lacked one acceptance identity | Server-only acceptance, deterministic inventory IDs, idempotent credit and acceptance, terminal state guards | Trade idempotency, quantity, duplicate-conversion, and void tests |
| Barcode collisions and reuse | Current scanner values were not protected as durable historical identity | Alias table and triggers preserve current/historical identity and block duplicate or retired reuse | Barcode history and migration tests |
| Kiosk double-sell exposure | Cart holds were not a durable part of available stock | Fifteen-minute reservations, explicit lifecycle, available/reserved ledger balances, and idempotent expiry/conversion | Hold expiry and kiosk payment tests |
| Pricing ambiguity | Price selection could cross variant, condition, grade, company, or currency boundaries without enough provenance | Exact variant selection, attributed fallback, fresh FX requirement, floor clamp, and manager review | Pricing, graded provider, FX, and ScryDex reference tests |
| ScryDex relay failure | The WordPress claim transition used an invalid guard variable, and one site advanced its schema marker without relay columns | Claim guard restored; migration 18 repairs partial schemas; the receiver returns 503 instead of acknowledging an event that was not durably logged | PHP relay contracts, migration repair tests, and signed test-site round trip |
| Catalog validation gaps | Fixture-only pagination could miss the sets represented by real inventory | Validator prioritizes represented sets, paginates deterministically, bounds requests, and emits a stable CSV | ScryDex validation harness and pagination tests |
| Fulfillment state drift | Pulls could overwrite local picking state; illegal regressions and duplicate transitions were insufficiently guarded | Merge preserves local ownership/picks, transitions are monotonic/idempotent, all items must be checked, and past orders are separated | LAN and WordPress fulfillment tests plus app UI contracts |
| Reconciliation risk | Operators lacked a safe cross-system repair plan | Read-only CSV compares local, WordPress, Square, kiosk, reservations, queue, and outbox; optional repair only queues local-to-remote projections | Reconciliation report tests |
| Recovery risk | Manual database edits could alter quantities or lose audit evidence | Dry-run trade/barcode tools, blockers, source-row recheck, automatic backup, transaction, invariant checks, and JSON report | Recovery migration tool tests |

## Resulting control model

The repaired control loop is:

1. Accept a validated local action or idempotent external fact.
2. Commit authoritative state, ledger, executable queue, and outbox together.
3. Process only due destination deliveries.
4. Verify each destination through readback.
5. Keep unresolved work visible as retry or dead letter.
6. Require a manager reason and stable request ID to replay one destination.
7. Reconcile remote mismatches by projecting current local state; do not
   silently import remote-only quantity.

This model prevents retry from becoming a second business transaction and
preserves enough evidence to explain quantity, reservation, price, and delivery
state after an incident.

## Implemented verification

The repository contains focused automated checks for:

- Authoritative schema migration, transaction rollback, ledger idempotency,
  reserved/available balance history, and outbox state aggregation.
- Absolute inventory update behavior, duplicate-row consolidation, zero/delete
  handling, and current/historical barcode resolution.
- Independent WordPress, Square, and kiosk projection attempts, due-time retry,
  exact readback, dead-letter listing, and audited replay.
- Square count shortages, non-echoing local application, exact sold-return
  quarantine, and ambiguous overage reporting.
- WooCommerce all-or-nothing sale allocation, terminal fulfillment relay, and
  serialized refund quarantine.
- Trade percentage/final value, per-line quantity and payout, duplicate
  acceptance, credit application/reversal, and inventory conversion.
- Kiosk reservation creation, expiry, pickup payment conversion, and replay.
- Fulfillment picking, ready/completed transitions, notification settings,
  state preservation, and active/past order presentation.
- Exact-variant raw and graded pricing, floor enforcement, manual-price
  protection, bulk/individual review, attributed JPY conversion, and provider
  failure behavior.
- ScryDex search, pagination, represented-set validation, catalog jobs, webhook
  relay contracts, and secret redaction.
- Reconciliation reports, safe projection repair planning, sanitized fixture
  setup/cleanup, package contracts, and recovery-tool invariants.

These checks demonstrate implemented logic under controlled inputs. The full
suite must be rerun after all concurrent `0.203.1` changes are merged and before
the exact release artifact is signed off.

## External acceptance completed

Timestamped sanitized evidence now confirms:

1. Test WordPress activation and database migration to schema 18, including
   repair of the stale relay schema and WooCommerce product readback.
2. Local pickup fulfillment, condition reservation/order conversion, and exact
   Square receipt propagation through the test WordPress site.
3. One reversible Square production acceptance item with unique SKU, price and
   count readback, zeroing, deletion, and absent-SKU cleanup confirmation.
4. Live ScryDex represented-set validation and a signed webhook received by
   WordPress, durably recorded, claimed/completed through the authenticated LAN
   relay, and removed after the test.
5. Final desktop/mobile browser acceptance with 21 screenshots, zero page
   errors, and zero horizontal overflow.

Store-LAN hardware behavior, HPOS, backup/restore disaster rehearsal, and owner
approval remain environmental deployment gates. See `PUG_TEST_EVIDENCE.md`.

No external result should be marked passed without timestamped, sanitized
evidence and confirmation that temporary WordPress/Square data was removed.

## Known constraints and residual risk

- WordPress HPOS compatibility is explicitly marked unverified in source.
- Automatic WordPress inventory polling is disabled. Remote inventory pull is a
  manager-directed bootstrap/recovery action and can be destructive if treated
  as routine authority.
- ScryDex graded-price coverage depends on the provider/game. Missing exact
  evidence must remain reviewable rather than being presented as a live quote.
- A restored local database may be older than Square sales, WooCommerce orders,
  kiosk holds, trades, or credit entries. Restoring without external-event
  reconciliation can reintroduce stock or credit.
- Public webhook delivery, WordPress scheduling, LAN firewall/NAT, provider
  rate limits, and hardware behavior remain environmental dependencies.
- SQLite backups contain customer, trade, credit, and audit data. They require
  the same access control and retention discipline as the active database.

## Recovery conclusion

The repair reduces the need for direct database intervention. When an incident
does occur:

1. Stop new writes and preserve `/sync/status` plus outbox diagnostics.
2. Checkpoint and create a verified SQLite backup.
3. Identify the authoritative local item, ledger reference, reservation,
   operation, and per-destination delivery.
4. Correct configuration or data through a supported workflow.
5. Replay only the affected destination with a manager reason, or use an
   approved dry-run recovery plan.
6. Require exact WordPress and Square readback before closing the incident.

Do not clear queue/outbox tables, reuse retired barcodes, edit old ledger rows,
or import a Square overage directly into available inventory. If schema rollback
is required, restore the matching pre-change database and code package, then
reconcile post-backup external facts before projection writes resume.
