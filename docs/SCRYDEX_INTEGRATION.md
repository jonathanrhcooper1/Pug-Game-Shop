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
Card and current market price normalization is implemented against sanitized
fixtures. Persistence planning now prepares deterministic reference-card
inserts, changed-row updates, unchanged row detection, and current price
observations from normalized page plans. Persistence SQL staging now converts
those plans into deferred reference-card insert/update templates, provider
price observation inserts, and checkpoint upsert plans with repository audit
metadata, but still performs no `wpdb` writes. Health output now includes a
`scrydex_persistence_repository` readiness payload, and the execution gate uses
that payload to derive the persistence repository gate. Scheduled ScryDex
workers are not enabled yet, but the cards worker orchestration planner can now
accept an injected/mock provider result and rehearse page processing,
persistence planning, SQL template building, and repository audit staging.
Database write workers, image workers, usage-budget enforcement, and webhook
route handling remain disabled until staging acceptance. WordPress administrator
settings now provide secret-preserving staging credential storage and redacted
readiness output, but those settings do not execute provider network requests
by themselves.

Schema migration `0010_provider_price_observations` adds
`tcg_provider_price_observations` for raw provider market-price snapshots. This
keeps ScryDex price observations separate from inventory-item price change
history, which requires an exact `inventory_id` and should only track store
sale-price decisions.

The sync page processor now plans normalized reference-card rows, current price
rows, normalization errors, retryability, and next checkpoint state from a
provider page response. The persistence planner turns those page plans into
write payloads with stable provider price observation IDs, game context,
observed timestamps, and sync job IDs. The persistence query builder and
repository boundary stage the resulting SQL templates and audit payloads, but
they do not execute `wpdb` writes or schedule follow-up jobs yet.

## Credential Handling

ScryDex credentials may be provided for staging configuration, but they must
never be committed to GitHub, test fixtures, screenshots, logs, or revision
notes. Store them only in environment variables, deployment secrets, or the
WordPress administrator ScryDex settings. Local and CI tests continue to use
sanitized mock responses and fixture-backed transports.

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
currently returns deferred execution audit rows only. The persistence repository
readiness planner runs an empty-page probe through that boundary to expose
table names, query counts, prepare-argument counts, and block reasons in health
diagnostics before the project enables live database writes.

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

The ScryDex cards worker orchestration planner sits after the execution gate
and before any live worker enablement. It requires the provider result to be
injected, then stages the page processor, persistence planner, query builder,
and deferred repository result. It intentionally does not fetch ScryDex,
persist reference cards, write provider price observations, upsert checkpoints,
download images, or enqueue scheduled workers.

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
9. Queue image downloads separately.
10. Queue optional price-history/population pulls only for supported scope.
11. Rebuild affected search projections.
12. Mark reference sync complete.
13. Start inventory repricing as a separate job.

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
