# Revision Log

This log records implementation revisions in a format suitable for pull request
review, staging approval, deployment approval, and rollback planning.

## 2026-06-06 - Offline Sync Conflict Policy Foundation

### What Changed

- Added a shared sync-engine offline conflict policy module.
- Added executable Node tests for offline inventory reservations, event
  reservations, customer credit redemptions, and device revocation.
- Wired sync-engine tests into the root `npm run test` gate.

### Why

The offline app cannot safely queue inventory, event, or credit operations until
the server-side conflict outcomes are deterministic. This slice pins the first
shared policy rules while leaving Tauri, SQLite queue persistence, device auth
routes, and live WordPress pull/push workers for later phases.

### Files Affected

- `packages/sync-engine/src/offlineConflictPolicy.mjs`
- `packages/sync-engine/tests/offline-conflict-policy.mjs`
- `package.json`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/OFFLINE_SYNC.md`
- `docs/TESTING.md`
- `tests/offline-sync/README.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Offline sync conflict policy tests for accepted inventory reservations,
  unavailable inventory conflicts, accepted event reservations, event waitlist,
  event capacity conflicts, accepted credit redemptions, offline credit local
  limit rejection, server credit overspend conflict, and revoked-device push
  rejection.

### Rollback Notes

- Revert this revision to remove the shared sync-engine offline conflict policy,
  Node tests, and root test wiring.
- No schema rollback is required; database target remains `7`.
- No live offline devices, queues, or sync endpoints are enabled by this
  revision.

## 2026-06-06 - TopDeck Registration Adapter Mapping

### What Changed

- Added a TopDeck registration push adapter for future queued event
  registration workers.
- Added a sync result object that maps provider results to explicit local
  registration update fields and retry flags.
- Added unit coverage for TopDeck email selection, customer email fallback,
  override-cap pass-through, registered and pending invite outcomes, capacity
  conflicts, missing TID/email guards, and retryable provider failure.

### Why

Website-push event registrations already create local pending TopDeck sync-log
records. The next safe step is to define and test the adapter mapping that a
future worker will use before enabling live provider execution, payment-complete
pushes, or staff recovery screens.

### Files Affected

- `apps/wordpress-plugin/src/Events/EventTopDeckRegistrationAdapter.php`
- `apps/wordpress-plugin/src/Events/EventTopDeckRegistrationSyncResult.php`
- `apps/wordpress-plugin/tests/Unit/EventTopDeckRegistrationAdapterTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/EVENTS.md`
- `docs/TOPDECK_INTEGRATION.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- TopDeck registration adapter tests for provider call shape, email
  normalization/fallback, override-cap pass-through, provider outcome mapping,
  missing input short-circuiting, and retryable provider failure updates.

### Rollback Notes

- Revert this revision to remove the TopDeck registration push adapter, sync
  result mapping, and tests.
- No schema rollback is required; database target remains `7`.
- Pending local TopDeck sync-log records remain local-only after rollback; no
  live provider calls are enabled by this revision.

## 2026-06-06 - Migration Runner Plan Coverage

### What Changed

- Added migration runner helpers that expose pending migration version plans and
  rollback version plans without requiring a live WordPress database.
- Reused the same migration list for runtime migration/rollback execution and
  dependency-free plan tests.
- Added unit coverage for clean install, upgrade from schema `5`, current
  schema idempotency, rollback from `7` to `4`, and no-op rollback plans.

### Why

Database migrations need automated clean-install, upgrade, idempotency, and
rollback coverage before staging runs the live MySQL integration suite. This
slice verifies migration ordering and rollback planning locally while keeping
transaction, row-lock, `dbDelta`, and backup/restore tests in the integration
lane.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/tests/Unit/MigrationRunnerPlanTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Migration runner plan tests for clean install ordering, upgrade-only pending
  migrations, current-schema idempotency, rollback ordering, and no-op rollback
  plans.

### Rollback Notes

- Revert this revision to remove migration plan helpers and tests.
- No schema rollback is required; database target remains `7`.
- Existing migration classes and live migration/rollback behavior remain
  governed by prior migration revisions after rollback.

## 2026-06-06 - REST Route Contract Foundation

### What Changed

- Added dependency-free REST route contract coverage for the health and public
  Events endpoints.
- Reused controller route contracts during route registration to reduce drift
  between documented/tested route shapes and registered WordPress routes.
- Added guard coverage proving unimplemented customer, buylist, inventory,
  offline, and POS write routes remain unregistered.

### Why

The platform needs automated REST API coverage before more write routes are
enabled. This slice pins the currently available route namespace, methods,
callbacks, and access mode while preserving full WordPress request/permission
integration tests for staging-gated route implementations.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/EventsController.php`
- `apps/wordpress-plugin/src/Api/V1/HealthController.php`
- `apps/wordpress-plugin/tests/Unit/ApiRouteContractTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- REST route contract tests for namespace consistency, unique method/path
  registration, authenticated health access, public Events route methods, and
  absent unimplemented write modules.

### Rollback Notes

- Revert this revision to remove dependency-free REST route contract tests and
  inline controller route contract helpers.
- No schema rollback is required; database target remains `7`.
- The WordPress integration smoke test remains the fallback route registration
  check after rollback.

## 2026-06-06 - WooCommerce Serialized Cart Metadata Foundation

### What Changed

- Added a WooCommerce serialized cart item metadata validator.
- Added exact-item metadata checks for single serialized quantity, positive
  inventory and reservation IDs, owner token hash presence, immutable price
  snapshot, ISO currency, and future reservation expiry.
- Added unit coverage for valid cart metadata, missing exact-item metadata,
  quantity-one enforcement, expired reservations, invalid price snapshots, and
  invalid currencies.

### Why

WooCommerce add-to-cart and checkout hooks need a deterministic cart metadata
contract before live reservation, order-line, payment, and release hooks are
enabled. This slice pins the validation surface while leaving all WooCommerce
hook registration disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/WooCommerce/SerializedCartItemValidator.php`
- `apps/wordpress-plugin/tests/Unit/SerializedCartItemValidatorTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/API.md`
- `docs/CHANGELOG.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- WooCommerce serialized cart item validator tests for exact inventory and
  reservation metadata, owner token hash presence, single serialized quantity,
  reservation expiry, immutable price snapshot, and currency validation.

### Rollback Notes

- Revert this revision to remove the WooCommerce serialized cart item metadata
  validator and tests.
- No schema rollback is required; database target remains `7`.
- Live WooCommerce add-to-cart, checkout, payment-complete, order-line, cart
  removal, and refund hooks remain disabled after rollback.

## 2026-06-06 - Manager Override Policy Foundation

### What Changed

- Added manager override request, decision, and policy helpers.
- Added below-minimum sale authorization rules requiring a distinct manager,
  non-empty reason, valid non-negative amounts, and a persisted override row
  when an override is accepted.
- Added unit coverage for no-override-needed sales, missing manager approval,
  same-user manager rejection, missing reason rejection, valid manager approval,
  and invalid amount rejection.

### Why

Pricing and checkout flows need a deterministic manager approval policy before
below-minimum sale hooks or POS override writes are enabled. This slice pins the
authorization behavior while leaving persistence, reauthentication, and commerce
hook integration disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Overrides/ManagerOverrideDecision.php`
- `apps/wordpress-plugin/src/Overrides/ManagerOverridePolicy.php`
- `apps/wordpress-plugin/src/Overrides/ManagerOverrideRequest.php`
- `apps/wordpress-plugin/tests/Unit/ManagerOverridePolicyTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_INVENTORY_PRICING.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Manager override policy tests for no-override-needed pricing, missing manager
  approval, same-user approval rejection, missing reason rejection, accepted
  below-minimum approval, and invalid amount rejection.

### Rollback Notes

- Revert this revision to remove manager override policy helpers and tests.
- No schema rollback is required; database target remains `7`.
- Manager override persistence, manager PIN reauthentication, WooCommerce/POS
  hook wiring, and audit writes remain disabled after rollback.

## 2026-06-06 - Reservation Lifecycle Foundation

### What Changed

- Added reservation lifecycle helpers for converting active reservations to
  sold inventory and releasing active reservations back to available inventory.
- Added idempotent replay handling for already-converted reservations.
- Added inventory-state mismatch protection so release/conversion cannot
  silently overwrite sold or otherwise unexpected inventory state.
- Expanded reservation service unit coverage for conversion, release,
  idempotent conversion replay, and inventory-state mismatch rejection.

### Why

WooCommerce checkout and payment hooks need a tested reservation lifecycle
contract before they can safely convert held serialized items to sold records or
release abandoned/failed carts. This slice builds those pure service rules while
leaving live hook registration and cleanup workers disabled until staging
acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Reservations/ReservationResult.php`
- `apps/wordpress-plugin/src/Reservations/ReservationService.php`
- `apps/wordpress-plugin/src/Reservations/ReservationStorage.php`
- `apps/wordpress-plugin/tests/Unit/ReservationServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `7`.

### Tests Added

- Reservation lifecycle tests for active reservation conversion to sold,
  release back to available, idempotent already-converted replay, and
  inventory-state mismatch rejection.

### Rollback Notes

- Revert this revision to remove reservation lifecycle helpers and tests.
- No schema rollback is required; database target remains `7`.
- WooCommerce checkout hooks, payment-complete hook wiring, cart release hooks,
  and expiry workers remain disabled after rollback.

## 2026-06-06 - Reservation Double-Sell Prevention Foundation

### What Changed

- Added schema migration `0007_reservations`.
- Added the `tcg_reservations` table contract with idempotency keys, owner
  token hashes, expiry, source/cart/customer/order metadata, status, price
  snapshot, and a unique nullable active inventory claim key.
- Added reservation request, result, storage contract, status helper, and
  transaction-oriented reservation service foundation.
- Added unit coverage for successful reservations, idempotency replay,
  unavailable inventory rejection, active-reservation collision rejection, and
  missing idempotency-key validation before a transaction starts.
- Updated WordPress integration smoke verification to assert schema version `7`
  and reservation tables.

### Why

WooCommerce, kiosk, POS, and offline flows all need the same exact-item active
claim invariant before checkout hooks or cart write APIs are enabled. This
slice adds the reservation table and service boundary needed to prevent
double-selling one serialized inventory item, while leaving live WooCommerce
hook wiring and expiry workers disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/ReservationSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0007Reservations.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/Reservations/ReservationRequest.php`
- `apps/wordpress-plugin/src/Reservations/ReservationResult.php`
- `apps/wordpress-plugin/src/Reservations/ReservationService.php`
- `apps/wordpress-plugin/src/Reservations/ReservationStatus.php`
- `apps/wordpress-plugin/src/Reservations/ReservationStorage.php`
- `apps/wordpress-plugin/tests/Unit/ReservationSchemaTest.php`
- `apps/wordpress-plugin/tests/Unit/ReservationServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- `0007_reservations`, reversible through `Version0007Reservations::down()`.

### Tests Added

- Reservation schema tests for table presence, active inventory uniqueness,
  idempotency, expiry indexes, and rollback order.
- Reservation service tests for successful exact item reservation, duplicate
  idempotency replay, unavailable inventory rejection, active reservation
  collision rejection, and pre-transaction idempotency-key validation.
- WordPress integration smoke assertions for schema version `7` and reservation
  tables.

### Rollback Notes

- Roll back schema version `7` to `6` with
  `MigrationRunner::rollback_to(6)` in a controlled maintenance window.
- Revert this revision to remove reservation schema and service helpers.
- Do not roll back reservation tables in production if real reservations,
  pending carts, checkout holds, POS holds, kiosk carts, or offline claims
  exist; export and reconcile item state first.
- WooCommerce checkout hooks, cart release hooks, expiry workers, and kiosk
  reservation writes remain disabled after rollback.

## 2026-06-06 - ScryDex Card Normalization Foundation

### What Changed

- Added a ScryDex card normalizer that maps provider payloads into local
  reference-card row shapes.
- Added a ScryDex card normalization result object that separates valid rows,
  optional price rows, and provider payload errors.
- Added current market price normalization with decimal formatting, currency
  validation, and observed timestamps.
- Added unit coverage for fixture-backed reference-card rows, price rows,
  required-field errors, and nullable optional fields.

### Why

ScryDex sync workers need a tested mapping contract before database upserts,
image jobs, pricing selection, or scheduled pulls are enabled. This slice pins
the local card and price row shapes while keeping write workers and live
provider configuration disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexCardNormalizer.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexCardNormalizationResult.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexCardNormalizerTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/ROADMAP.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `6`.

### Tests Added

- ScryDex card normalizer tests for fixture-backed card/reference rows,
  current market price rows, required-field errors, and nullable optional set,
  price, and timestamp fields.

### Rollback Notes

- Revert this revision to remove the ScryDex normalization helpers and tests.
- No schema rollback is required; database target remains `6`.
- ScryDex scheduled workers, database upserts, live provider credentials, image
  downloads, and webhooks remain disabled after rollback.

## 2026-06-06 - ScryDex Provider Adapter Foundation

### What Changed

- Added a ScryDex provider result object and adapter contract.
- Added a ScryDex HTTP provider with injectable transport for fixture-backed
  tests, card search, card detail, usage request, default-disabled webhook
  registration, credential headers, rate-limit mapping, unauthorized mapping,
  and auth-context redaction.
- Updated the shared redactor to treat provider team IDs as sensitive.
- Added unit coverage for missing credentials, mock card search, credential
  headers, rate-limit mapping, and ScryDex auth-context redaction.

### Why

ScryDex sync workers need a tested provider boundary before scheduled pulls,
normalization, image download, or webhook processing can be enabled. This slice
adds the adapter contract and mock-backed HTTP behavior while leaving live
worker wiring and production credentials disabled until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/ScryDex/ScryDexProvider.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexHttpProvider.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexResult.php`
- `apps/wordpress-plugin/src/Logging/Redactor.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexHttpProviderTest.php`
- `apps/wordpress-plugin/tests/Unit/RedactorTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `6`.

### Tests Added

- ScryDex provider tests for missing credentials, mock card search, credential
  headers, rate-limit mapping, and redacted auth context.
- Redactor test coverage for provider `X-Team-ID` style keys.

### Rollback Notes

- Revert this revision to remove the ScryDex provider adapter and team ID
  redaction change.
- No schema rollback is required; database target remains `6`.
- Do not wire scheduled ScryDex workers or production credentials until staging
  verifies sandbox calls, checkpoint resume, usage budgets, and payload masking.
- No production ScryDex credentials or raw provider payloads are committed by
  this revision.

## 2026-06-06 - ScryDex Sync Checkpoint Foundation

### What Changed

- Added schema migration `0006_sync`.
- Added sync job, log, checkpoint, error, and webhook event table contracts.
- Added a ScryDex checkpoint value object for initial checkpoints, row resume,
  successful page advancement, and storage-row serialization.
- Added a ScryDex request planner that clamps page size and derives the next
  page/cursor request from the latest checkpoint.
- Updated WordPress integration smoke verification to assert schema version `6`
  and sync tables.

### Why

ScryDex full pulls and webhook refreshes must be page/cursor checkpointed before
any live provider calls are enabled. This slice adds durable sync table
contracts and deterministic checkpoint/resume planning while keeping provider
HTTP calls, normalization workers, image workers, and webhook routes disabled
until staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/SyncSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0006Sync.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncCheckpoint.php`
- `apps/wordpress-plugin/src/ScryDex/ScryDexSyncPlanner.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/Unit/ScryDexSyncCheckpointTest.php`
- `apps/wordpress-plugin/tests/Unit/SyncSchemaTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/SCRYDEX_INTEGRATION.md`
- `docs/TESTING.md`

### Migrations Added

- `0006_sync`, reversible through `Version0006Sync::down()`.

### Tests Added

- Sync schema contract tests for jobs, logs, checkpoints, errors, webhooks, and
  rollback order.
- ScryDex checkpoint tests for first-page planning, successful page advancement,
  payload hash storage, and fixture-backed resume cursor behavior.
- WordPress integration smoke assertions for schema version `6` and all sync
  tables.

### Rollback Notes

- Roll back schema version `6` to `5` with
  `MigrationRunner::rollback_to(5)` in a controlled maintenance window.
- Revert this revision to remove sync schema and checkpoint helpers.
- Do not roll back sync tables in production if real sync jobs, webhook events,
  errors, or checkpoint history exist; export and reconcile provider sync state
  first.
- No production provider credentials or raw provider payloads are committed by
  this revision.

## 2026-06-06 - Customer Credit Ledger Posting Internals

### What Changed

- Added customer credit posting request and result objects.
- Added a customer credit ledger storage contract and `wpdb` repository.
- Added a transaction-backed customer credit ledger posting service that
  requires idempotency keys, locks the customer row, checks currency, applies
  the existing posting policy, inserts immutable ledger rows, updates cached
  balances, and returns duplicate idempotency-key replays without posting again.
- Added unit coverage for successful buylist credit posting, duplicate
  idempotency replay, overspend rejection, and missing idempotency-key
  rejection.

### Why

The credit ledger now needs a persistence path before buylist payouts,
WooCommerce redemptions, offline conflict processing, or staff adjustments can
be wired to live routes. This slice adds deterministic server-side posting
internals while keeping public credit APIs and commerce hooks disabled until
staging acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Credit/CustomerCreditLedgerRepository.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditLedgerService.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditLedgerStorage.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditPostingRequest.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditPostingResult.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditLedgerServiceTest.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/CUSTOMER_CREDIT.md`
- `docs/TESTING.md`

### Migrations Added

- None. This revision uses existing schema version `5`.

### Tests Added

- Customer credit ledger service tests for successful posting and cached balance
  version updates.
- Duplicate idempotency-key replay test proving a retry does not insert or
  update again.
- Overspend rejection test proving no ledger insert occurs.
- Missing idempotency-key rejection test proving no transaction starts.

### Rollback Notes

- Revert this revision to remove the credit posting service and repository.
- No schema rollback is required; database target remains `5`.
- Do not expose credit write routes or checkout hooks in production until
  staging verifies ledger replay, duplicate prevention, and reconciliation.
- No production customer or credit data is committed by this revision.

## 2026-06-06 - Buylist Foundation

### What Changed

- Added schema migration `0005_buylist`.
- Added buylist submission, item, offer, approval, and conversion log table
  contracts.
- Added a buylist submission status helper covering intake, review, offer,
  acceptance, payout/conversion, completion, cancellation, rejection, and expiry.
- Updated WordPress integration smoke verification to assert schema version `5`
  and buylist tables.

### Why

Buylist intake must preserve customer submissions, staff review decisions,
manager approvals, accepted offers, and inventory conversion provenance before
live write APIs or payout hooks can safely ship. This slice adds the durable
contracts and deterministic state flow while keeping buylist writes, credit
payout posting, and inventory conversion workers disabled until staging
acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Buylist/BuylistSubmissionStatus.php`
- `apps/wordpress-plugin/src/Migrations/BuylistSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0005Buylist.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/Unit/BuylistSchemaTest.php`
- `apps/wordpress-plugin/tests/Unit/BuylistSubmissionStatusTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/BUYLIST.md`
- `docs/CHANGELOG.md`
- `docs/DATABASE.md`

### Migrations Added

- `0005_buylist`, reversible through `Version0005Buylist::down()`.

### Tests Added

- Buylist schema contract tests for submissions, items, offers, approvals,
  conversion log indexes, and rollback order.
- Buylist submission status tests for allowed transitions and terminal states.
- WordPress integration smoke assertions for schema version `5` and all buylist
  tables.

### Rollback Notes

- Roll back schema version `5` to `4` with
  `MigrationRunner::rollback_to(4)` in a controlled maintenance window.
- Revert this revision to remove buylist schema and status helpers.
- Do not roll back buylist tables in production if real submissions, offers, or
  conversion logs exist; export and reconcile intake records first.
- No production customer, payout, or inventory data is committed by this
  revision.

## 2026-06-06 - Customer Credit Ledger Foundation

### What Changed

- Added schema migration `0004_customer_credit`.
- Added customer, customer contact, customer credit ledger, customer merge log,
  and customer note table contracts.
- Added customer credit entry type helpers for typical signs and manager
  approval requirements.
- Added a customer credit posting policy that previews signed ledger amounts,
  before/after balances, manager approval requirements, and negative-balance
  rejection with four-decimal fixed arithmetic.
- Updated WordPress integration smoke verification to assert schema version `4`
  and customer credit tables.

### Why

Customer credit must be an immutable liability ledger before buylist payouts,
checkout redemption, offline credit conflict handling, and manager adjustments
can safely ship. This slice adds the durable table contracts and deterministic
posting rules while leaving live credit writes and UI disabled until staging
acceptance.

### Files Affected

- `apps/wordpress-plugin/src/Credit/CustomerCreditEntryType.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditPostingDecision.php`
- `apps/wordpress-plugin/src/Credit/CustomerCreditPostingPolicy.php`
- `apps/wordpress-plugin/src/Migrations/CustomerCreditSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0004CustomerCredit.php`
- `apps/wordpress-plugin/src/Migrations/MigrationRunner.php`
- `apps/wordpress-plugin/src/Version.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditEntryTypeTest.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditPostingPolicyTest.php`
- `apps/wordpress-plugin/tests/Unit/CustomerCreditSchemaTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/CHANGELOG.md`
- `docs/CUSTOMER_CREDIT.md`
- `docs/DATABASE.md`

### Migrations Added

- `0004_customer_credit`, reversible through
  `Version0004CustomerCredit::down()`.

### Tests Added

- Customer credit schema contract tests.
- Customer credit entry type sign and manager-approval tests.
- Customer credit posting policy tests for buylist credit, purchase
  redemption, overspend rejection, manual adjustment manager approval,
  correction signed amounts, invalid entry type, and invalid amount.
- WordPress integration smoke assertions for schema version `4` and all
  customer credit tables.

### Rollback Notes

- Roll back schema version `4` to `3` with
  `MigrationRunner::rollback_to(3)` in a controlled maintenance window.
- Revert this revision to remove credit schema and policy helpers.
- Do not roll back customer credit tables in production if real credit entries
  exist; export and reconcile liability first.
- No production customer or credit data is committed by this revision.

## 2026-06-06 - Local Event Registration Writes

### What Changed

- Added `POST /wp-json/tcg-store/v1/events/{slug}/register` for public local
  event registration.
- Added request validation for first name, last name, email, optional phone,
  optional TopDeck email, and idempotency keys.
- Added a registration policy that rejects TopDeck-hosted local writes, blocks
  closed/sold-out events, supports waitlist placement, and accepts paid events
  only when pay-at-store is enabled.
- Added a transaction-backed registration service and write repository that
  locks the event row, reuses idempotency keys, inserts registrations, creates
  waitlist rows, recomputes capacity counts, updates public event status, and
  writes registration logs.
- Added active same-event/email duplicate prevention and scoped idempotency
  conflict handling so reused keys do not expose or mutate unrelated
  registrations.
- Added safe pending TopDeck sync-log queue records for eligible free
  website-push registrations. The queue writes local intent only and does not
  call the TopDeck API.
- Updated WordPress integration smoke verification to assert the registration
  route is registered.

### Why

The public Events surface needs a safe local write path before WooCommerce
payment capture or TopDeck push is connected. This slice accepts only free and
pay-at-store reservations, leaving online payment and provider-side writes
closed until staging can verify the full commerce and TopDeck lifecycle.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/EventsController.php`
- `apps/wordpress-plugin/src/Events/EventPaymentStatus.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationDuplicateGuard.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationDecision.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationInput.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationPolicy.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationRepository.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationResult.php`
- `apps/wordpress-plugin/src/Events/EventRegistrationService.php`
- `apps/wordpress-plugin/src/Events/EventTopDeckRegistrationPlanner.php`
- `apps/wordpress-plugin/tests/Unit/EventRegistrationDuplicateGuardTest.php`
- `apps/wordpress-plugin/tests/Unit/EventRegistrationInputTest.php`
- `apps/wordpress-plugin/tests/Unit/EventRegistrationPolicyTest.php`
- `apps/wordpress-plugin/tests/Unit/EventRegistrationResultTest.php`
- `apps/wordpress-plugin/tests/Unit/EventTopDeckRegistrationPlannerTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/API.md`
- `docs/EVENTS.md`
- `docs/CHANGELOG.md`

### Migrations Added

- None. This revision uses schema version `3`.

### Tests Added

- Registration input sanitization and validation tests.
- Registration policy tests for TopDeck-hosted rejection, waitlist placement,
  paid pay-at-store acceptance, online-payment-required rejection, and deadline
  closure.
- Registration result response tests for validation errors and idempotent
  success responses.
- Duplicate guard and duplicate-blocking registration status tests.
- TopDeck queue planner tests for free website-push eligibility, local-only
  exclusion, missing TID/disabled provider exclusion, waitlist exclusion, and
  pay-at-store exclusion.
- WordPress integration smoke route assertion for the registration endpoint.

### Rollback Notes

- Revert this revision to remove public local event registration writes.
- No database rollback is required because no migration was added.
- Existing registration rows created during staging tests can be deleted from
  staging tables after confirming they are not linked to real customers,
  payments, or TopDeck pushes.
- Production deployment remains manual and should not enable payment capture or
  TopDeck push from this revision alone.

## 2026-06-06 - Read-Only Public Events Surface

### What Changed

- Added public read-only Events REST endpoints for event lists and slug-based
  event details.
- Added event filter sanitization and public presentation helpers for seats
  remaining, registration status, badges, TopDeck attribution, and hosted
  registration links.
- Added `[tcg_events]` and `[tcg_event_detail]` shortcodes for WordPress list
  and detail pages.
- Updated WordPress integration smoke verification to assert the Events routes
  are registered.

### Why

The public Events page and detail pages need a safe read path before the system
accepts registrations, payment, waitlist changes, or TopDeck writes. This slice
lets staging review event display and filtering while leaving all write flows
closed.

### Files Affected

- `apps/wordpress-plugin/src/Api/V1/EventsController.php`
- `apps/wordpress-plugin/src/Events/EventFilters.php`
- `apps/wordpress-plugin/src/Events/EventPresenter.php`
- `apps/wordpress-plugin/src/Events/EventRepository.php`
- `apps/wordpress-plugin/src/Events/EventShortcodes.php`
- `apps/wordpress-plugin/src/Bootstrap/Plugin.php`
- `apps/wordpress-plugin/tests/Unit/EventFiltersTest.php`
- `apps/wordpress-plugin/tests/Unit/EventPresenterTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `docs/API.md`
- `docs/EVENTS.md`

### Migrations Added

- None. This revision uses schema version `3`.

### Tests Added

- Event filter sanitization tests.
- Public event presenter tests for status, seats remaining, badges, TopDeck
  attribution, and hosted-registration links.
- WordPress integration smoke route assertions for public event endpoints.

### Rollback Notes

- Revert this revision to remove read-only public Events routes and shortcodes.
- No database rollback is required.
- Existing event rows remain untouched because no write paths are added.

### CI Fix Notes

- Replaced a short ternary in the Events REST controller with explicit limit
  normalization.
- Fixed WordPress coding standards assignment alignment in the event detail
  shortcode renderer.

## 2026-06-06 - Events And TopDeck Foundation

### What Changed

- Added schema migration `0003` for event, registration, waitlist, check-in,
  TopDeck sync log, and event template tables.
- Added event registration mode/status helpers, capacity counting, public badge
  helpers, and seat remaining calculations.
- Added a TopDeck provider adapter with prompt-required methods, injectable
  transport, register-player outcome mapping, redacted auth context, and a
  default `createEvent()` `not_supported` result.
- Added TopDeck settings defaults for API key, base URL, rate limit, and
  create-event safety.
- Updated WordPress integration smoke verification to require schema version
  `3` and all Events/TopDeck tables.

### Why

The Events module needs a durable local source of truth before public pages,
WooCommerce event-entry products, offline reservations, and staff check-in flows
can safely ship. TopDeck event creation remains explicitly disabled because the
reviewed public API does not document a create-tournament endpoint.

### Files Affected

- `apps/wordpress-plugin/src/Migrations/EventsTopDeckSchema.php`
- `apps/wordpress-plugin/src/Migrations/Version0003EventsTopDeck.php`
- `apps/wordpress-plugin/src/Events/**`
- `apps/wordpress-plugin/src/TopDeck/**`
- `apps/wordpress-plugin/src/Settings/**`
- `apps/wordpress-plugin/tests/Unit/*Event*Test.php`
- `apps/wordpress-plugin/tests/Unit/TopDeckHttpProviderTest.php`
- `apps/wordpress-plugin/tests/wordpress-integration-smoke.php`
- `fixtures/mocks/topdeck/**`
- `docs/CHANGELOG.md`
- `docs/EVENTS.md`
- `docs/TOPDECK_INTEGRATION.md`

### Migrations Added

- `0003_events_topdeck`, reversible through
  `Version0003EventsTopDeck::down()`.

### Tests Added

- Events/TopDeck schema contract tests.
- Event registration status and capacity tests.
- Event public status/badge tests.
- TopDeck adapter method, response mapping, and redaction tests.
- TopDeck settings sanitization tests.

### Rollback Notes

- Roll back schema version `3` to `2` with `MigrationRunner::rollback_to(2)` in
  a controlled maintenance window.
- Revert the Events/TopDeck code and fixtures if the module must be removed
  from staging.
- No production TopDeck keys are committed or required by this revision.

### CI Fix Notes

- Fixed WordPress coding standards assignment alignment in the Events/TopDeck
  schema and event status helpers.
- Corrected the WordPress integration smoke test target schema assertion from
  `2` to `3`.

## 2026-06-06 - Development, Staging, Deployment Foundation

### What Changed

- Added GitHub-first workflow policy for `main`, `develop`, `feature/*`, and
  `hotfix/*` branches.
- Added official `wp-env` configuration and package scripts for local WordPress
  development and test orchestration.
- Added local safety controls for non-production WordPress environments.
- Added development seed and mock provider fixtures for cards, inventory,
  customers, store credit, kiosk carts, buylist, events, TopDeck, ScryDex, and
  POS/payment responses.
- Added GitHub Actions workflow scaffolding for pull-request quality gates.
- Added staging and deployment runbooks with manual production approval,
  backup, smoke test, and rollback requirements.

### Why

The platform needs a repeatable source-of-truth workflow before additional
inventory, commerce, customer credit, events, and provider integrations are
implemented. These files make development reproducible, keep Codex work off
production branches, and document the safety gates required before staging or
production deployment.

### Files Affected

- `.wp-env.json`
- `package.json`
- `.github/pull_request_template.md`
- `.github/workflows/pull-request-quality-gates.yml`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/STAGING.md`
- `docs/DEPLOYMENT.md`
- `docs/TESTING.md`
- `fixtures/**`
- `scripts/wp-env/**`
- `tests/**`

### Migrations Added

- None in this revision.

### Tests Added

- Pull-request quality gate workflow for local PHP checks and required test
  scaffold validation.
- Required test matrix manifest covering PHP/plugin, REST, database migration,
  pricing, reservations, credit ledger, manager override, ScryDex, TopDeck,
  WooCommerce checkout, Playwright E2E, and offline sync conflict coverage.

### Rollback Notes

- Revert this revision to remove the development/staging/deployment framework.
- No database rollback is required because this revision does not add or alter
  database migrations.
- If a `wp-env` environment was started from this revision, run
  `npm run wp-env:clean` and `npm run wp-env:destroy` before returning to a
  previous local setup.

### CI Fix Notes

- Fixed WordPress coding standards alignment in
  `apps/wordpress-plugin/src/Migrations/InventoryPricingSchema.php`.
- Fixed WordPress integration workflow WP-CLI download URL and made the download
  fail fast with `curl -fsSL`.
- Removed strict-types declaration from the WP-CLI integration smoke script so
  it can run through `wp eval-file` in GitHub Actions.
