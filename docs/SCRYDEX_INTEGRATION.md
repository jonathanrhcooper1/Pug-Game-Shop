# ScryDex Integration

## Implementation Status

Schema migration `0006_sync` is implemented for sync jobs, logs, checkpoints,
errors, and webhook events. ScryDex checkpoint/resume helpers plan page/cursor
requests and serialize committed checkpoints. The ScryDex provider adapter is
implemented with injectable transport, credential redaction, and mock-backed
card-search/rate-limit tests. Scheduled ScryDex workers, live provider
credential configuration, normalization/upsert workers, image workers,
usage-budget enforcement, and webhook route handling remain disabled until
staging acceptance.

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
7. Normalize/upsert card, set, variant, image metadata, and current prices.
8. Checkpoint after each committed page.
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
currency.

## Sources

- https://scrydex.com/docs/getting-started/authentication
- https://scrydex.com/docs/getting-started/rate-limits
- https://scrydex.com/docs/getting-started/webhooks
- https://scrydex.com/docs/getting-started/prices
- https://scrydex.com/docs/getting-started/pop-reports
- https://scrydex.com/docs/vision/overview
- https://scrydex.com/docs/pokemon/cards
- https://scrydex.com/docs/pokemon/price-history
