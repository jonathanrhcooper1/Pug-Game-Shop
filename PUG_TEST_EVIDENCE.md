# Pug 0.203.1 Test Evidence

## Release result

The `0.203.1` source and package contracts pass the automated, browser, test
WordPress, live ScryDex, and reversible Square checks listed below. Production
deployment remains a manual approval step. No production inventory repair or
bulk connector write was performed by this validation pass.

## Automated verification

| Gate | Result | Evidence |
| --- | --- | --- |
| WordPress unit, bootstrap, PHP lint | Pass: 1,089 tests, bootstrap smoke, 680 PHP files | `evidence/final-20260718/test-local-0.203.1.txt` |
| Full coordinated suite | Pass: LAN, ledger, pricing, conditions/variants, Square, WordPress, fulfillment, trades, holds, ScryDex, packaging, Rust | `evidence/final-20260718/npm-test-0.203.1.txt` |
| Local browser acceptance | Pass: 21 screenshots, zero errors, zero overflow | `evidence/final-20260718/ui/ui-acceptance.json` |
| Secret scan | Pass: no production secret markers | `evidence/final-20260718/no-production-secrets-0.203.1.txt` |
| Required test matrix | Pass: 12/12 required areas present | Included in the full-suite log |

The 48 UI warnings are duplicate browser response/console reports for the
isolated visual fixture's expected HTTP 409 pull/push conflicts. There are no
HTTP 500, page-error, or layout-overflow findings.

## External reversible checks

| Surface | Result | Cleanup |
| --- | --- | --- |
| Test WordPress plugin | Installed and active; database migrated from 17 to 18; all webhook relay columns/index present | Package ZIP removed from remote `/tmp` |
| WooCommerce card lifecycle | Product/condition reservation and order conversion passed | Temporary product, order, reservation, and inventory removed |
| Local pickup fulfillment | Paid pickup relay and fulfillment lifecycle passed | Temporary WordPress and LAN records removed |
| LAN to WordPress inventory | Product creation and exact readback passed | Temporary product/inventory removed |
| Square sale to WordPress | Receipt reference retained, exact item marked sold, idempotent retry passed | Temporary product/inventory/app password/database removed |
| Signed ScryDex webhook | HTTP 202, durable log, authenticated claim/completion, targeted expansion semantics passed | Temporary secret, app password, option, schedule, and event row removed |
| Square live smoke | Unique temporary $1 item, read, price update, absolute count, zero, deletion, and absent SKU passed | Temporary catalog item deleted |
| ScryDex live catalog | 1,326 represented sets checked, 0 unresolved, 112,205 cards sampled, 0 unsafe failures/provider errors | Read-only validation |

Supporting files are under `evidence/final-20260718/`. The ScryDex summary is
`scrydex-live-validation-final2.txt`; Square is
`PUG_SQUARE_REVERSIBLE_SMOKE.json`; webhook is
`test-site-scrydex-webhook-roundtrip.json`.

## Database migration evidence

- Supplied SQLite preflight: `PRAGMA quick_check = ok`, 2,895 inventory rows,
  158,462 reference cards.
- Disposable full-copy rehearsal preserved both counts and installed
  authoritative schema v1/v2 tables.
- Standalone v1-to-v2 SQL rehearsal installed four reservation/availability
  snapshot columns and replay audit with `PRAGMA quick_check = ok`.
- WordPress migration 18 repaired a stale version marker safely and is
  idempotent on missing, partial, and complete relay schemas.

See `evidence/final-20260718/supplied-database-preflight.txt` and
`supplied-database-migration-rehearsal.txt`.

## Reconciliation finding

`PUG_SYNC_RECONCILIATION_REPORT.csv` is a read-only connected report of the
supplied older LAN database against its configured WordPress and Square
destinations. All 2,915 report rows have at least one mismatch because the
supplied database predates the authoritative outbox/projection tracking model:

- 2,895 local rows have no recorded kiosk projection.
- 2,815 local rows have no recorded website projection.
- 399 rows differ from Square count; 7 mapped Square counts are missing.
- 20 remote rows have no matching internal item.
- 6 website quantities differ and 3 internal sync states are failed.

Do not bulk-repair these rows during installation. Back up the active middleman
database, run reconciliation there in read-only mode, review remote-only rows,
then queue local-to-remote projections in bounded batches with exact readback.

## Remaining environment acceptance

These are deployment/operator checks, not unimplemented code:

1. Confirm which active store database replaces the supplied historical copy,
   back it up, migrate it, and review reconciliation before enabling workers.
2. Drain or intentionally archive the test WordPress site's existing 100-plus
   ScryDex relay backlog; the new test event was processed without modifying
   those older rows.
3. Validate multi-PC discovery, offline recovery, DYMO local-first/server
   fallback, receipt printer, cash drawer, and Square Terminal on the store LAN.
4. Verify HPOS against the production WooCommerce configuration; source still
   marks HPOS external compatibility as unverified.
5. Obtain owner approval before production plugin/app installation and before
   any connector projection worker is enabled.
