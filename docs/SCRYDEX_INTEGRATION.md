# ScryDex Integration

## Implementation Status

Schema migration `0006_sync` is implemented for sync jobs, logs, checkpoints,
errors, and webhook events. ScryDex checkpoint/resume helpers plan page/cursor
requests and serialize committed checkpoints. The ScryDex provider adapter is
implemented with injectable transport, credential redaction, and mock-backed
card-search/rate-limit tests. The ScryDex provider factory now consumes staged
WordPress settings, exposes secret-free readiness, and can build the HTTP
provider through injected transports for tests. The health payload also exposes
a sync dry-run plan with the next cards-page request and checkpoint row while
all execution remains deferred. The health payload also includes a cards sync
execution gate that reports provider, network, usage-budget, checkpoint,
persistence, database-write, and scheduler readiness without running the worker.
Card, provider image URL, and current market price normalization is implemented
against sanitized fixtures. Persistence planning now prepares deterministic
reference-card inserts, changed-row updates, unchanged row detection, reference
variant upserts, current price observations, and dimensional price points from
normalized page plans. Persistence SQL staging now converts those plans into
deferred reference-card insert/update templates, reference-variant upserts,
provider price observation inserts, provider price-point inserts, and
checkpoint upsert plans with repository audit metadata. The persistence
repository now has a separate explicit execution path that validates the active
WordPress table prefix, runs accepted reference-card, variant, price-observation,
price-point, and checkpoint query plans in a transaction, and rolls back on
failure. Health output still uses the staged/deferred
`scrydex_persistence_repository` readiness payload, and the execution gate uses
that payload to derive the persistence repository gate. The cards worker
orchestration planner can accept an injected/mock provider result and rehearse
page processing, persistence planning, SQL template building, and repository
audit staging. The gated cards worker shell can also call the configured
provider for bounded paginated pages in staging/tests, expose continuation
checkpoints, and then feed each page through that same orchestration planner.
The worker shell can call the persistence execution method only when explicitly
requested through `execute_database_writes`; staged/deferred mode remains the
default. The `scrydex_sync` feature flag is available in production for the
manual, bounded catalog import surface; automatic scheduled production refresh
remains blocked until a separate release hardens unattended execution.
Daily scheduled refresh controls now exist in WordPress settings and health
output. They require game keys, page limits, network-request enablement,
database-write enablement, and explicit persistence execution confirmation
before the existing daily platform schedule can run ScryDex cards pages. The
scheduled refresh planner still blocks production even when settings are
enabled. Image workers and webhook route handling remain disabled until staging
acceptance. WordPress
administrator settings provide secret-preserving staging credential storage and
redacted readiness output, but those settings do not execute provider network
requests by themselves.

Schema migration `0010_provider_price_observations` adds
`tcg_provider_price_observations` for raw provider market-price snapshots. This
keeps ScryDex price observations separate from inventory-item price change
history, which requires an exact `inventory_id` and should only track store
sale-price decisions.

Schema migration `0011_reference_card_images` adds nullable `front_image_url`
and `back_image_url` columns to `tcg_reference_cards`. ScryDex card
normalization and persistence planning now carry provider image URLs into those
columns so the website catalog, local sync server, offline employee app, kiosk,
and storefront can show the actual card art from the mirrored catalog.

Schema migration `0012_scrydex_catalog` adds
`tcg_reference_sets` for ScryDex expansion/set metadata and
`tcg_provider_price_points` for normalized provider price points by card,
variant, condition, raw/graded state, currency, and observation time. These
tables extend the website-owned catalog database while leaving
`tcg_reference_cards`, `tcg_reference_variants`,
`tcg_provider_price_observations`, and `tcg_sync_checkpoints` as the existing
card, variant, latest-price, and resume/checkpoint surfaces used by the cards
worker. The migration also refreshes the existing reference-card and
price-observation table definitions so clean installs and upgraded sites both
receive provider set IDs, set lookup indexes, and latest-price lookup indexes.

The local sync server ScryDex lookup surface now models the final architecture:
clients first query the persisted local `reference_cards` cache and receive a
secret-free result that includes card identity, image URL, current market
price, catalog sync timestamp, and local stock counts. If a card is missing,
the local server can call an injected WordPress catalog/ScryDex proxy, persist
the normalized card into `reference_cards`, and serve later searches from the
local cache without repeating the provider fallback. The offline app no longer
treats ScryDex as a one-off text fill. Staff can select a card, review image,
price, local stock, condition, and quantity, then add one provisional inventory
row per physical copy.

The WordPress plugin exposes the catalog-safe fallback surface through
`/wp-json/tcg-store/v1/reference/search` when connected inventory reads are
enabled. The response includes ScryDex reference identity, card art URLs, latest
provider price observation when present, catalog timestamps, and explicit
secret-free metadata. If the website catalog has no local match and the
server-side ScryDex provider is configured, the route can make a bounded live
provider fallback, persist normalized cache rows without writing ad hoc
checkpoint rows, and return secret-free fallback metadata. It never returns
ScryDex credentials to clients.

The LAN sync server can be pointed at that website surface with
`PUG_WORDPRESS_URL`. When configured, missing-card local lookup calls the
WordPress reference-search route with a bounded result limit, then saves the
returned catalog row into its local `reference_cards` cache. Local clients still
receive only normalized card data and never receive ScryDex API keys.

The sync page processor now plans normalized reference-card rows, reference
variants, current price rows, dimensional price-point rows, normalization
errors, retryability, and next checkpoint state from a provider page response.
The persistence planner turns those page plans into write payloads with stable
provider price observation IDs, stable provider price-point IDs, game context,
observed timestamps, and sync job IDs. The persistence query builder and
repository boundary stage the resulting SQL templates and audit payloads, and
execute them only when the caller explicitly requests database writes.

## Catalog Database And Import Endpoints

WordPress registers two authenticated ScryDex catalog endpoints:

- `GET /wp-json/tcg-store/v1/scrydex/catalog/status` is available to users who
  can manage settings or edit inventory and reports secret-free catalog state.
  The payload includes counts for reference sets, reference cards, reference
  variants, provider price observations, provider price points, and sync
  checkpoints; the latest ScryDex checkpoints; database-prefix validity;
  `credential_values_redacted: true`; and `credentials_synced_to_client: false`.
- `POST /wp-json/tcg-store/v1/scrydex/catalog/index` runs a bounded catalog
  import batch and is limited to users who can manage settings. Supported
  payload fields are `game` (default `pokemon`), `expansion_id`, `page_size`,
  `max_pages`, `index_expansions`, and `execute_database_writes`. The endpoint
  checks provider readiness and usage before importing, can index one expansion
  page, runs bounded card pages through the existing ScryDex worker, returns
  public usage metadata, expansion/card summaries, `counts_after`, and
  `next_action`, and does not return raw provider bodies or credentials.

ScryDex documents a maximum page size of 100. The HTTP provider, dry-run
planner, usage planner, worker, scheduled settings, and catalog import
controller all clamp requested ScryDex page sizes to `1..100`; the catalog
index endpoint additionally caps `max_pages` at 25 per request.
The worker continues across documented `nextCursor`/`hasMore` style pagination
and `page * pageSize < totalCount` pagination.

Database writes stay explicit. `execute_database_writes` must be truthy before
the catalog index route persists expansion rows or lets the cards worker use
the persistence execution boundary. Without it, the route is suitable for
readiness and dry-run style staging checks.

## Credential Handling

ScryDex credentials may be provided for staging configuration, but they must
never be committed to GitHub, test fixtures, screenshots, logs, or revision
notes. Store them only in environment variables, deployment secrets, or the
WordPress administrator ScryDex settings. Local and CI tests continue to use
sanitized mock responses and fixture-backed transports.

Production ScryDex keys must not be stored in this repository. Do not add them
to `.env` examples, committed config, generated docs, test fixtures, screenshots,
or copied command output. If a production key is exposed in Git, logs, or an
artifact, rotate it before continuing and remove the exposed value from the
artifact history wherever possible.

The WordPress settings surface stores Team ID, primary key, and secondary key
values as administrator-controlled settings. Saved values are never echoed back
into password fields; blank submissions preserve existing values, and explicit
clear checkboxes remove them. Health and System Status output only expose
configured/missing booleans, the selected environment, provider class, active
key slot, a short key fingerprint, and explicit deferrals.

## Dry-Run Planning

The health endpoint includes `scrydex_sync_dry_run` for staging checks. It
reports the provider method (`search_cards`), provider endpoint
(`/pokemon/v1/cards` by default), next request parameters, checkpoint row, configured state,
and execution deferrals. It does not call ScryDex, normalize card rows, write
checkpoints, download images, register webhooks, or enqueue workers.

Expected non-production configuration keys:

```text
SCRYDEX_API_KEY
SCRYDEX_TEAM_ID
SCRYDEX_BASE_URL
```

Production credentials must not be used in local development or automated pull
request checks.

For staging, use the server-side configuration helper after the staging route
check passes:

```text
PUG_STAGING_CONFIRM_SCRYDEX_CONFIG=configure-staging-scrydex
npm run staging:configure-scrydex
```

The helper reads ScryDex keys from environment variables, streams them to a
temporary WP-CLI runner over stdin, stores them in WordPress settings, reports
only configured/missing booleans plus the active key fingerprint, and deletes
the runner. It does not call ScryDex, sync card tables, print raw responses,
send credentials to the offline app, or run scheduled workers.

## Live Smoke Verification

Use the live smoke only for a manual, read-only credential check. It is not
part of CI and must not be run with production credentials in automated tests.

```text
SCRYDEX_API_KEY=...
SCRYDEX_TEAM_ID=...
SCRYDEX_SMOKE_CONFIRM=pull-live-scrydex
npm run scrydex:live-smoke
```

The helper calls `GET /pokemon/v1/cards`, defaults the query to `Charizard`,
and reports only the HTTP status, count/total metadata, and sanitized first-card
fields. It does not write WordPress data, persist rows, download images, enqueue
workers, or print raw response bodies or credentials.

## Execution Gate

The health endpoint includes `scrydex_sync_execution_gate` for staff and
staging diagnostics. It reports the planned cards worker status as `blocked`
when the provider is not configured, `gated` when the provider is configured
but execution dependencies are still missing, and `ready` only when all
required execution gates are explicitly enabled.

The health endpoint also includes `scrydex_usage_budget`. This budget plan
reports the configured daily credit budget, remaining-credit reserve, estimated
cards-page cost, planned `/account/v1/usage` provider method, and whether a
fresh usage snapshot is required before the worker runs. The usage provider
request remains deferred by default; the plan can evaluate an already-fetched
usage snapshot in tests or future worker code without making the request
itself.

The health endpoint also includes `scrydex_checkpoint_repository`. This plan
builds the read and upsert SQL templates for `tcg_sync_checkpoints`, validates
the active WordPress table prefix and checkpoint identity, and reports whether
the repository boundary is configured. It does not execute the checkpoint read
or upsert; database writes remain behind the separate execution gate.

The ScryDex persistence query builder stages reference-card writes,
provider-price observation writes, and checkpoint upserts. The repository layer
returns deferred execution audit rows through `stage()` and can execute accepted
plans through explicit `execute()` calls. Execution requires a WordPress `wpdb`
instance, validates query-plan table names against the active database prefix,
wraps the planned writes in a transaction, and reports commit or rollback
status in the audit payload. The persistence repository readiness planner runs
an empty-page probe through the staged boundary to expose table names, query
counts, prepare-argument counts, and block reasons in health diagnostics before
cron-connected live database writes are enabled.

Default blockers are:

- `scrydex_network_requests_disabled`
- `scrydex_usage_budget_not_configured`
- `scrydex_checkpoint_repository_not_configured`
- `scrydex_persistence_repository_not_configured`
- `scrydex_database_writes_disabled`
- `scrydex_scheduled_worker_not_configured`

The gate embeds the dry-run request/checkpoint plan and readiness metadata, but
it does not call ScryDex, write checkpoints, persist normalized rows, download
images, register webhooks, or enqueue a scheduled worker by itself.

The ScryDex cards worker orchestration planner sits after the execution gate.
It stages the page processor, persistence planner, query builder, and deferred
repository result for a provider page. The gated worker shell can call ScryDex
only when the provider, network, usage-budget, checkpoint, persistence,
database-write, and scheduler gates are all ready or explicitly overridden in a
controlled staging/test context. It returns page summaries, continuation
checkpoint rows, and secret-free audit metadata. It still intentionally does
not persist reference cards, write provider price observations, upsert
checkpoints, download images, or register webhooks by default. When
`execute_database_writes` is true, the worker/page planner uses the explicit
persistence execution boundary and reports executed page status plus
transaction audit metadata.

The explicit persistence `execute()` boundary is available for the future
staging cron worker. It is not invoked by health checks, dry runs, local tests
with real credentials, or offline clients.

Next implementation step: replace the seeded development catalog with the
WordPress-owned persisted worker loop. That worker must iterate configured
games, sets, and provider cursors/pages; enforce fresh usage budgets/rate
limits; call the persistence execution boundary only after all gates pass;
checkpoint after each committed page; and run a daily refresh without sending
ScryDex credentials to offline clients.

Budget-specific blockers are:

- `scrydex_usage_budget_not_configured`
- `scrydex_daily_credit_budget_exceeded`
- `scrydex_remaining_credit_floor_reached`

Checkpoint-specific blockers are:

- `scrydex_checkpoint_repository_not_configured`
- `scrydex_checkpoint_table_prefix_invalid`
- `scrydex_checkpoint_table_name_invalid`
- `scrydex_checkpoint_resource_type_invalid`
- `scrydex_checkpoint_resource_key_invalid`
- `scrydex_checkpoint_payload_hash_invalid`

## Rollback Notes

Before enabling `execute_database_writes`, create a staging database export so
the catalog mirror can be reset as a unit. A status-only check does not mutate
data and has no database rollback requirement.

To roll back migration `0012_scrydex_catalog`, roll migrations back below
version `12` or run the migration's `down()` path. The drop order is
`tcg_provider_price_points` first, then `tcg_reference_sets`.

If a catalog import has already executed, prefer restoring the staging database
backup. A targeted cleanup must account for all rows created by the import
scope, including `tcg_reference_sets`, `tcg_provider_price_points`,
`tcg_reference_cards`, `tcg_reference_variants`,
`tcg_provider_price_observations`, and ScryDex entries in
`tcg_sync_checkpoints`.

If endpoint rollback is needed without a database rollback, revert the
`ScryDexCatalogController` registration. Existing catalog rows can remain in
place until the database restore or migration rollback decision is made.

## Role

ScryDex supplies card reference, expansion, variant, image, price, price-history,
population, usage, Vision, and webhook data only where the current API and the
store's plan support them. Local normalized tables and image caches serve
storefront, admin, and offline reads.

## Verified Public Capabilities

Verified against official documentation on June 6, 2026:

- Authentication uses `X-Api-Key` and `X-Team-ID`.
- Card searches are paginated and support provider query/filter syntax.
- Card responses can include variants, images, and opt-in prices.
- Price history is available through card-specific endpoints.
- Vision identifies raw and graded cards from URL or file uploads.
- Webhooks document raw-price, graded-price, and population-report update events
  for supported games.
- Webhook signatures use timestamped HMAC-SHA256 over the raw body.
- Usage can be queried through `/account/v1/usage`.
- The documented global request ceiling is 100 requests per second, while
  credit consumption and feature availability depend on plan.

Coverage is not uniform. For example, the public pricing guide documents graded
pricing for some games but not all, and public population-report documentation
currently lists limited company/game/language coverage. The adapter must report
capabilities per game rather than globally.

## Interface

```text
searchCards(query, filters)
getCard(providerCardId)
getExpansions(game, filters)
getExpansion(expansionId)
getExpansionCards(expansionId, options)
getPrices(cardId, variant, condition, grade)
getPriceHistory(cardId, filters)
getImages(cardId)
identifyCardByImage(imageFile, options)
getPopulationReports(cardId)
getUsage()
registerWebhook(eventType, callbackUrl)
verifyWebhookSignature(headers, rawPayload)
normalizeCard(raw)
normalizeVariant(raw)
normalizePrice(raw)
normalizeExpansion(raw)
capabilityCheck(context)
```

`registerWebhook` must return `not_supported` if the store account/API does not
expose a documented registration operation. Receiving and verifying configured
webhooks remains independently supported.

## Capability Matrix

The adapter stores results by `(provider, game, capability, account)`:

```text
supported
not_supported
not_configured
degraded
unknown
```

No UI enables Vision, graded pricing, population reports, expansion pulls, or
webhook registration based only on marketing copy.

## Full Pull

1. Create a sync job and immutable configuration snapshot.
2. Query usage/credits and enforce the configured budget.
3. Enumerate configured games.
4. Enumerate expansions where supported.
5. Fetch cards in provider-supported pages.
6. Store sanitized raw payload and hash.
7. Normalize card, set, variant, image metadata, and current prices.
8. Use the worker orchestration planner to rehearse the sync page processor,
   persistence planner, query builder, and repository boundary after each
   provider page.
9. Use the gated worker shell to fetch bounded provider pages and expose the
   continuation checkpoint for the next scheduled pass.
10. Queue image downloads separately.
11. Queue optional price-history/population pulls only for supported scope.
12. Rebuild affected search projections.
13. Mark reference sync complete.
14. Start inventory repricing as a separate job.

Jobs never keep a database transaction open during an HTTP request.

## Incremental And Webhook Sync

Webhook handling:

1. Capture raw body.
2. Parse signature timestamp and signature.
3. Reject stale timestamps outside the configured five-minute window.
4. Compare HMAC in constant time.
5. Deduplicate provider event ID.
6. Return `2xx` quickly after durable enqueue.
7. Pull affected expansions/cards through normal sync code.

Webhooks are hints to refresh local data, not trusted replacements for normalized
records.

## Retry Policy

- Retry network failures, `408`, `429`, and `5xx` with bounded exponential
  backoff and jitter.
- Honor `Retry-After` where present.
- Do not retry authentication, validation, or unsupported-capability failures
  until configuration changes.
- Persist page/cursor checkpoint after each successful commit.
- Cancellation stops scheduling new pages but does not roll back committed work.

## Images

- Store relative local paths, content hashes, MIME type, dimensions, source URL,
  and last verification time.
- Never embed provider credentials in image URLs or logs.
- Use bounded concurrency and disk quotas.
- Keep original provider attribution/license metadata where supplied.
- Missing images do not block inventory intake when manual/local photos exist.

## Pricing Selection

The provider returns dimensional prices. The pricing engine selects a configured
record matching game, variant, raw condition or grading company/grade, and store
currency. If there is no exact valid match, it displays available reference data
but does not silently substitute a different condition, grade, variant, or
currency. The current foundation normalizes simple provider `market_price`
payloads into explicit currency-scoped price rows; dimensional price selection
remains staging-gated until provider capability fixtures are expanded.

## Sources

- https://scrydex.com/docs/getting-started/authentication
- https://scrydex.com/docs/getting-started/rate-limits
- https://scrydex.com/docs/getting-started/webhooks
- https://scrydex.com/docs/getting-started/prices
- https://scrydex.com/docs/getting-started/pop-reports
- https://scrydex.com/docs/vision/overview
- https://scrydex.com/docs/pokemon/cards
- https://scrydex.com/docs/pokemon/price-history
