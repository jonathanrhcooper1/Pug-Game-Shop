# Payments And POS

## Boundaries

- The official WooCommerce Square extension owns online Square authorization,
  capture, refund execution, PCI-sensitive payment fields, and gateway UI when
  Square is selected.
- This plugin observes WooCommerce order/payment lifecycle events, records
  masked provider references, and reconciles exact serialized inventory.
- POS providers record in-store transactions.
- The plugin owns exact serialized item status.
- No adapter may infer that provider quantity stock is equivalent to serialized
  card availability.

## WooCommerce Payment Observation Interface

```text
observeOrderPaymentComplete()
observeOrderPaymentFailed()
observeOrderRefunded()
recordMaskedProviderReference()
getFees()
capabilityCheck()
```

Online payment should normally use maintained WooCommerce gateway extensions.
The platform observes Woo order/payment lifecycle events and stores only
provider transaction references and masked metadata. It never stores card data
and does not implement a custom Square gateway in the active scope.

## POS Provider Interface

```text
searchItemByBarcode()
pushInventoryItem()
updateInventoryStatus()
markItemSold()
syncSale()
pullTransaction()
reconcileInventory()
supportsWebhooks()
supportsOfflineMode()
capabilityCheck()
```

## Square Strategy

Install and configure the official WooCommerce Square extension for online
Square payments. Keep that extension responsible for customer payment capture,
refund execution, tokenization, wallet support, and checkout UX. This platform
adds the trading-card-specific layer around exact serialized inventory,
scan-gated POS reconciliation, masked provider references, and staff conflict
review.

The WordPress plugin exposes this boundary through a reusable Square payment
delegation policy. Square inventory projection contracts, projection execution
audit payloads, POS/payment health payloads, dependency diagnostics, and the
Inventory admin workspace all report that the official WooCommerce Square
extension owns payment capture, refunds, and gateway behavior. The platform's
Square scope is catalog/inventory projection and reconciliation only.

Health and System Status now also report whether the official WooCommerce
Square extension appears installed/active through the known plugin file or
loaded class signals. That status is secret-free and does not enable Square
network writes, provider inventory writes, platform payment capture, refunds,
or custom gateway behavior.

Square catalog, order, inventory, and webhook data can support reconciliation,
but it does not prove that a Square POS line item will always carry the store's
unique serialized barcode in a recoverable field.

Launch modes:

1. `scan_gate` (default): staff scans the exact store barcode in the TCG staff
   app before/during Square checkout. The plugin creates a pending POS sale and
   later reconciles the Square transaction.
2. `catalog_mirror` (optional): each serialized item is projected to a Square
   variation only after scale, workflow, and field-mapping tests pass.
3. `reconciliation_only`: ingest Square orders/webhooks and flag any line that
   cannot be deterministically mapped to one inventory item.

Square webhook event IDs and external order/payment IDs are idempotency keys.
Refunds do not automatically return a card to `available`; the configured
default is `pending_review`.

## Square Inventory Projection Planning

The WordPress plugin now includes a plan-only Square inventory projection
contract for exact serialized cards. Given a canonical inventory row, it can
prepare:

- A Square `ITEM` catalog object with one `ITEM_VARIATION` for a single
  serialized card.
- A variation SKU derived from the store SKU or barcode so POS scanning can map
  back to the store-owned exact item identity.
- Fixed-price `price_money`, inventory tracking flags, location visibility, and
  bounded user metadata.
- A Square `PHYSICAL_COUNT` change with quantity `1` for sellable visible
  cards.
- A zero-count `PHYSICAL_COUNT` change for unavailable cards that already have
  a known Square variation mapping.

The planner rejects visible sellable cards that lack card name, scan identity,
valid sale price/currency, or a Square location. Hidden/unmapped cards are
skipped without provider payloads. All plans keep Square network requests,
provider inventory writes, WooCommerce gateway capture, and payment capture
explicitly deferred.

## Square Inventory Adapter Contract

The API-client package includes an executable Square inventory adapter
contract. It accepts the plugin's Square projection contract and prepares
sandbox-only request plans for:

- `POST /v2/catalog/batch-upsert`
- `POST /v2/inventory/changes/batch-create`

The adapter preserves idempotency keys, extracts Square object IDs and SKUs,
rejects production environments, credentials declared as production, or
live-looking credentials, and does not call Square directly. It also supports
reconciliation-only Square POS event mapping from provider line items back to
serialized inventory IDs. Unmapped lines become staff-review conflicts, and all
WordPress inventory mutation remains deferred.

The API-client adapter now also plans the barcode/SKU inventory-read side of
that bridge. Given WordPress inventory rows, it treats the store barcode/SKU as
the Square POS scan identity, expects the mirrored Square item variation to
carry that value in its `sku`, and uses the stored
`square_catalog_variation_id` plus Square location ID to shape a deferred
`POST /v2/inventory/counts/batch-retrieve` request. Missing Square variation
IDs, missing Square locations, or duplicate scan identities become mapping
conflicts for staff review. Square counts are reconciliation inputs only;
WordPress serialized inventory remains authoritative, and payments continue to
belong to the official WooCommerce Square extension.

## Square Inventory Sync Request Planning

The WordPress plugin mirrors the API-client adapter with a PHP request planner.
It converts side-effect-free Square projection plans into auditable
sandbox-only request envelopes for:

- `POST /v2/catalog/batch-upsert`
- `POST /v2/inventory/changes/batch-create`

Ready plans preserve projection idempotency keys, derive the inventory-change
idempotency key, expose Square catalog object IDs and SKUs for reconciliation
review, and include the shared Square payment delegation policy. Skipped
projections return empty request envelopes, and failed projections are rejected
before any request payload is exposed.

The planner rejects production environments, credentials declared as
production, and live-looking credential markers. It allows sandbox-declared
credential placeholders for staging planning only. Network requests, provider
inventory writes, production network requests, WooCommerce gateway capture, and
plugin Square payment capture remain deferred.

Square projection execution results now carry the sync request planner status,
request envelopes, idempotency keys, external IDs, and errors in their audit
payloads. If request planning rejects a projection because the context is
production or production-declared, the executor rejects the operation before
any catalog or inventory writer callback can run. Inventory dependency health,
admin summaries, and the Inventory workspace expose whether the sync request
planner is staged.

The WordPress plugin also includes a batch sync planner for staging multiple
inventory rows at once. It aggregates per-row projection/request plans,
ready/skipped/blocked counts, idempotency keys, Square object IDs, SKUs,
catalog request counts, and inventory request counts. Hidden/unmapped rows can
be skipped without blocking the batch, while invalid rows or production
contexts block the batch before any provider request is exposed. The batch
planner does not call Square, does not mutate WordPress inventory, and keeps
payment capture delegated to the official WooCommerce Square extension.

Authenticated health output and admin System Status expose a batch sync
readiness probe through `square_inventory_batch_sync`. The diagnostic runs a
sandbox-only multi-row planning rehearsal, reports row/request/operation
counts, aggregate SKUs, configuration issues, and deferral flags, and keeps
Square network calls, provider inventory writes, production requests, custom
gateway behavior, and payment capture disabled.

## Transaction Ingestion Contract

The shared validation package now includes a sandbox-safe POS transaction
ingestion contract:

1. Normalize provider, event ID, event type, provider mode, external order ID,
   and payment response data.
2. Reject events without provider idempotency before inventory transitions are
   planned.
3. Suppress already processed provider events as replay responses with zero
   inventory transitions.
4. Route sale events through scan-gated sale reconciliation and refund events
   through refund reconciliation.
5. Keep provider inventory writes, route-connected writes, and production
   capture explicitly deferred in the returned metadata.

Unmapped provider-only lines create durable staff-review conflicts. The
provider may record payments and orders, but exact serialized inventory status
continues to belong to the plugin.

## Log And Fee Storage

Migration `0009_pos-payments` adds three tables:

- `tcg_pos_sync_log` records provider/location references, external
  order/transaction/line IDs, inventory/barcode mapping, reconciliation status,
  result details, and provider idempotency keys.
- `tcg_payment_provider_log` records masked payment/refund provider operations,
  Woo order links, amount/currency, status, and idempotency keys.
- `tcg_payment_fee_snapshots` records effective-dated fee assumptions with
  source notes and verification timestamps.

These tables do not enable live network calls. They exist so staged adapters
can be tested with durable, reversible storage before webhook routes or
provider write services are allowed.

## Log Planning

The WordPress plugin now includes a POS/payment log planner that converts a
normalized sandbox transaction-ingestion outcome into future database row
payloads:

- One masked `tcg_payment_provider_log` row per provider operation.
- One `tcg_pos_sync_log` row per exact inventory transition when line mapping
  succeeds.
- One summary `tcg_pos_sync_log` row when a provider event is a replay,
  conflict, or rejection without inventory transitions.
- Deterministic idempotency keys and public IDs for replay-safe staged writes.
- Redacted request/response JSON and audit metadata that keeps provider
  inventory writes, route-connected writes, and production capture deferred.

The planner does not insert rows, call providers, capture payments, or mutate
serialized inventory.

## SQL Template Planning

The WordPress plugin also includes a POS/payment SQL-template builder for the
planned log rows. It validates table prefixes, idempotency keys, timestamps,
JSON payloads, row versions, reconciliation statuses, payment operations, and
currency before emitting deferred insert templates for:

- `tcg_pos_sync_log`
- `tcg_payment_provider_log`

The builder reports prepare-argument counts and audit metadata for staging
review. It does not call `$wpdb`, insert rows, execute repository writes, call
providers, capture payments, or mutate inventory.

## Repository Staging And Gate

The WordPress plugin now includes a POS/payment log repository staging adapter
and execution gate. The repository converts valid SQL-template plans into
deferred per-query results for:

- POS sync log inserts.
- Payment provider log inserts.

The result reports idempotency keys, query counts, prepare-argument counts,
zero affected rows, and source query audit metadata. The execution gate reports
blocked, ready, or rejected status with explicit execution requirements,
transaction-adapter deferral, no-query blocking, and failed staging rejection.

This layer still does not call `$wpdb`, insert rows, call providers, capture
payments, mutate inventory, register webhook routes, or enable WooCommerce
gateway capture.

## Transaction Preflight

The POS/payment transaction preflight evaluates repository staging results
after the execution gate. It reports:

- POS sync and payment provider log counts.
- Ready, blocked, and rejected status.
- Inherited execution-gate block reasons.
- Unsupported query-kind blocks before a future executor can run.
- Idempotency keys, zero affected rows, and transaction-deferred metadata.

Supported preflight query kinds are `pos_sync_insert` and
`payment_provider_insert`. Even when these are preflight-ready, transaction
execution, repository inserts, provider capture, provider inventory writes, and
route-connected POS/payment writes remain disabled.

## Explicit Log Execution

The explicit POS/payment log execution repository can run preflight-approved
insert templates through `$wpdb` in controlled staging tests. It rejects:

- Invalid SQL build plans.
- Blocked or rejected transaction preflights.
- Table-prefix mismatches between the query plan and the provided database.
- Failed inserts and invalid affected-row counts.

The result reports POS sync rows affected, payment provider rows affected,
partial failure state, idempotency keys, and route-connected/provider-capture
deferral flags. This repository does not register routes, call providers,
capture payments, mutate inventory, or enable WooCommerce gateway capture.

## Staged Transaction Execution

The staged POS/payment transaction executor wraps preflight-approved explicit
log execution in `START TRANSACTION`, `COMMIT`, and `ROLLBACK` commands. It
rejects invalid query plans, blocked preflights, and transaction begin
failures before log writes can run. Repository execution failure and commit
failure both return rolled-back results with repository affected-row audit
metadata and idempotency keys.

This layer is still a controlled staging boundary. It does not register routes,
call providers, capture payments, mutate provider inventory, reconcile live POS
events, or enable WooCommerce gateway capture.

## Planned Route Contracts

The plugin now defines planned POS/payment REST route contracts for:

- POS event ingestion and status lookup.
- POS reconciliation runs.
- POS reconciliation conflict review and resolution.
- Signed provider webhook intake.
- Payment fee snapshot listing and creation.

These contracts are disabled by default and carry explicit route-registration,
transaction, route-connected write, provider capture, provider inventory,
webhook registration, and WooCommerce gateway capture deferral metadata.

## Route Readiness

POS/payment route readiness now converts those planned contracts into
health/admin diagnostics for staging review. The readiness payload reports:

- Planned and registerable route counts.
- Feature-flag status for `pos_payments`.
- Missing route handler and permission callback dependencies.
- Route-connected write, transaction executor, and webhook verifier deferrals.
- Provider capture, provider inventory write, webhook registration, and
  WooCommerce gateway capture safety deferrals.

By default every route remains unregistered. The readiness layer is
inspection-only and does not call providers, capture payments, mutate inventory,
register webhooks, or enable WooCommerce gateway capture.

## Route Permissions

Planned POS/payment routes now have fail-closed permission callback adapters:

- `manage_pos` for POS event ingestion, status lookup, and reconciliation runs.
- `resolve_conflicts` for reconciliation conflict review and resolution.
- `manage_settings` for payment fee snapshot review and configuration.
- `signed_provider_webhook` for payment provider webhook intake.

`manage_pos` is installed for manager, system, administrator, and shop-manager
roles, and is intentionally excluded from staff roles. Capability callbacks use
WordPress `current_user_can()` when available or an injected checker in tests.
Webhook callbacks require an injected signature verifier; without one, the
factory returns no webhook permission callback and readiness stays blocked.

## Route Controller

The POS/payment controller scaffold now exposes every planned route callback:

- `ingest_pos_event`
- `get_pos_event_status`
- `run_pos_reconciliation`
- `list_pos_reconciliation_conflicts`
- `resolve_pos_reconciliation_conflict`
- `receive_payment_provider_webhook`
- `list_payment_fee_snapshots`
- `create_payment_fee_snapshot`

The default controller path returns disabled responses with route registration,
route-connected writes, transaction execution, webhook registration, provider
capture, provider inventory write, and WooCommerce gateway capture deferrals.
Injected handlers can be used in controlled tests, but no live route
registration or provider side effect is enabled by the scaffold.

## Route Registration Planning

POS/payment route registration planning now produces WordPress REST route args
only for future route contracts that explicitly clear every required staging
gate. The default plan remains locked with `__return_false` permissions and no
controller callbacks.

Registration planning reports:

- Namespace, route path, method, callback, permission, and workflow metadata.
- Permission callback readiness from the fail-closed POS/payment permission
  callback factory.
- Controller callback readiness from explicitly injected controller handlers.
- Route-registration, route-connected write, webhook-registration,
  transaction-execution, provider-capture, provider-inventory, and WooCommerce
  gateway-capture deferral flags.
- Stable block reasons for disabled routes, missing permission callbacks,
  missing controller handlers, deferred route registration, deferred
  route-connected writes, and deferred webhook registration.

Future read-only routes can only become registerable after route registration
is enabled and callbacks are ready. Future write routes also require
route-connected write deferral to be cleared. Future webhook routes require a
configured signature verifier and cleared webhook-registration deferral.
Current production and staging defaults still produce zero enabled POS/payment
route registrations.

## Guarded Route Registrar

The guarded POS/payment route registrar consumes only enabled route plans from
the registration planner. It calls `register_rest_route()` or an injected test
registrar with:

- The planned route namespace.
- The planned route path.
- The planned HTTP method.
- The injected controller callback.
- The fail-closed permission callback.

Because current route contracts are disabled by default and carry registration
deferrals, the registrar registers zero POS/payment routes under default
settings. Future routes must first pass the planner's permission, handler,
registration, write, and webhook gates before the registrar can expose them.

## Route Bootstrap Status

POS/payment route bootstrap status reports the orchestration state that would
control the guarded registrar:

- `blocked` when the `pos_payments` feature flag is off.
- `gated` when the feature flag is on but no route plans are registerable.
- `ready` only when the feature flag is on and at least one route plan is
  registerable.

The authenticated health payload and admin System Status screen expose planned
route counts, registerable route counts, route keys, registration deferral, and
bootstrap block reasons. Current defaults keep bootstrap blocked with zero
registerable POS/payment routes.

The POS/payment route bootstrapper is now registered on WordPress
`rest_api_init` after the offline route bootstrapper. It calls the guarded
registrar only when bootstrap status is ready, so default staging checks can
verify lifecycle wiring while POS/payment REST routes remain absent.

## Route Dependencies

POS/payment route dependency status reports whether the staged route controller
has injected handlers, whether capability permission callbacks can be built,
whether a webhook signature verifier is configured, and whether the guarded
registrar/bootstrapper classes are available. Current defaults stage
parser-only controller handlers while keeping the webhook verifier
unconfigured, route registration deferred, and route-connected writes deferred.

Parser-only POS/payment route validation handlers now cover event ingestion,
event status, reconciliation runs, conflict review/resolution, provider
webhooks, and fee-snapshot requests. They validate request shapes and staged
log plans, but all log writes, reconciliation writes, provider capture,
provider inventory writes, gateway capture, and live route registration remain
deferred.

The WordPress POS/payment route bootstrap hook now uses the staged dependency
factory. Future explicitly enabled staging route tests therefore exercise the
same parser-only controller, permission callback factory, guarded registrar,
and bootstrapper path that WordPress registers on `rest_api_init`, while
default route contracts still expose zero POS/payment routes.

## Fee Snapshot Query Planning

Fee snapshot list requests now use a staged query planner before any future
admin review read can execute. The planner normalizes:

- Provider and channel slugs.
- Three-letter currency codes.
- Optional effective-date filters.
- Bounded page sizes.

The query contract allowlists the `tcg_payment_fee_snapshots` table, selected
columns, stable ordering, filters, and limit. It reports query readiness and
read-execution deferral without calling `$wpdb`, returning fee rows, writing
fee rows, registering REST routes, calling providers, capturing payments,
mutating inventory, or enabling WooCommerce gateway capture.

Fee snapshot query contracts now also pass through a prepared SQL-template
builder. The builder validates the allowlisted table, columns, ordering,
filters, and limits before emitting a deferred `SELECT` template plus
prepare-argument metadata for staging review. It still does not call `$wpdb`,
execute repository reads, return fee rows, write fee rows, register routes,
call providers, capture payments, mutate inventory, or enable WooCommerce
gateway capture.

An explicit fee snapshot repository adapter can execute those allowlisted
templates in controlled staging tests. The adapter prepares the SQL through the
provided `$wpdb`, verifies the database prefix matches the planned table,
normalizes effective-dated fee rows, and reports database or malformed-row
failures in an audit payload. Default route-connected reads still do not use
the repository, and fee-snapshot writes, REST route registration, provider
capture, provider inventory changes, and WooCommerce gateway capture remain
disabled.

Parser-only route validation and POS/payment dependency status now also report
fee snapshot repository readiness. A staged route handler can show that an
explicit repository adapter was injected, but default route callbacks continue
to return deferred read metadata and do not call `$wpdb`.

An explicit staged fee snapshot route handler can now call the repository when
constructed directly for tests or future staging injection. It returns
normalized fee rows plus repository audit metadata, rejects invalid filters
before repository calls, and fails closed on repository rejection. The default
route dependency factory still uses parser-only callbacks and registers no
POS/payment fee snapshot routes.

A staged fee snapshot route handler factory can now assemble that handler only
when route-connected reads are explicitly enabled and a safe `$wpdb` instance
and table prefix are present. The POS/payment dependency factory can receive
that factory for repository-backed staging tests, while default dependency
wiring keeps fee snapshot callbacks parser-only, deferred, and unregistered.

POS/payment route contracts and planners now track route-connected read
deferral separately from write, transaction, capture, inventory, gateway, and
webhook deferrals. Future GET routes, including fee snapshot review reads, must
clear the read deferral explicitly before registration planning or readiness
planning can mark them registerable.

POS/payment dependency health and admin summaries now expose that read gate as
its own readiness state. This lets staging reviewers distinguish configured
handlers and repositories from default route-connected read execution, which
remains deferred until deliberately enabled.

## GoDaddy Payments

The public GoDaddy developer portal reviewed on June 6, 2026 states that the
general GoDaddy API is not a payment gateway. Therefore GoDaddy Payments is
treated as a WooCommerce gateway/plugin integration until product-specific,
documented APIs are configured and verified.

## Stripe And Helcim

Adapters remain optional. Stripe documents Terminal offline payment behavior,
but adopting it would require a separate hardware/account proof-of-concept.
Helcim documents online Payment API operations. Neither is marked configured
until credentials, account features, WooCommerce compatibility, and required
in-person hardware are verified.

## Store Credit With Payment

Store credit is applied before the external payment amount is finalized:

1. Lock customer credit projection.
2. Create a pending redemption authorization tied to the Woo/POS cart.
3. Charge the remainder through the external provider.
4. Post the immutable redemption when payment succeeds.
5. Release pending authorization on failure/cancel.

Provider support for split tender is not required because store credit is an
internal tender reduction, but gateway totals and refund behavior must be tested.

## Fee Comparison

Fee assumptions are effective-dated configuration:

- Provider and channel.
- Percentage fee.
- Fixed fee.
- Monthly/platform/device fees.
- Chargeback and non-Square Orders API fees where relevant.
- Source note and last verified date.

Reports are estimates, not accounting statements. No current rate is hardcoded.

## Reconciliation

Daily reconciliation compares:

- Plugin sold/refunded items.
- Woo orders and payment transactions.
- POS orders/payments.
- Provider inventory projections, if enabled.

Mismatches create durable exceptions; they never silently modify exact inventory.

## Implemented Policy Tests

The shared validation package now tests POS/payment reconciliation and
transaction-ingestion policy with sanitized sandbox fixtures:

- Approved provider payment responses normalize amount/currency and still block
  provider-side inventory writes.
- Scan-gated POS sales transition only exact scanned inventory lines to `sold`.
- Declined payments never transition inventory.
- Provider-only or unmapped POS lines create staff-review conflicts.
- Refunds move exact items to `pending_review`, not directly back to
  `available`.
- Provider event IDs become idempotency keys and duplicate events replay without
  inventory transitions.
- POS sale/refund adapter events keep route-connected writes and production
  capture deferred.
- Fee comparisons use explicit fixture configuration and report that no
  hardcoded live rates were used.
- WordPress log planning prepares redacted provider rows, per-line POS sync
  rows, conflict/replay summaries, and audit events without live writes.
- WordPress SQL-template planning validates those rows and prepares deferred
  insert templates without repository execution.

Live Square/POS connections, payment webhooks, WooCommerce gateway capture, and
production credentials remain disabled until staging acceptance.

## Sources

- https://developer.squareup.com/docs/catalog-api/what-it-does
- https://developer.squareup.com/reference/square/objects/CatalogItemVariation
- https://developer.squareup.com/reference/square/inventory-api/batch-retrieve-inventory-counts
- https://developer.squareup.com/docs/orders-api/what-it-does
- https://developer.squareup.com/docs/inventory-api/webhooks
- https://developer.godaddy.com/getstarted
- https://docs.stripe.com/terminal/features/operate-offline/overview
- https://devdocs.helcim.com/docs/payment-api
- https://developer.woocommerce.com/docs/woocommerce-payment-gateway-api/
