# Staging

## Target

Use a GoDaddy Managed WordPress staging site when available. Deploy the
`develop` branch to staging after pull-request checks pass and review is
complete.

## Isolation Rules

- Staging uses its own database.
- Staging never shares production customer credit, payment, inventory, event,
  or POS tables.
- Staging uses test and sandbox API keys only.
- Staging blocks public indexing.
- Staging disables real customer emails.
- Staging disables real payment capture.
- Staging disables real POS inventory changes unless explicitly enabled for a
  controlled sandbox test.
- Staging displays a visible `STAGING` banner to staff and admin users.
- Staging banner color, company name, support URL, logo URL, receipt footer,
  and theme colors come from staging branding settings rather than production
  hardcoded values.

## Environment Flags

Set these constants or environment variables in staging:

```php
define( 'WP_ENVIRONMENT_TYPE', 'staging' );
define( 'TCG_STORE_PLATFORM_ENVIRONMENT', 'staging' );
define( 'TCG_STORE_PLATFORM_STAGING_MODE', true );
define( 'TCG_STORE_PLATFORM_STAGING_BANNER', true );
define( 'TCG_STORE_PLATFORM_DISABLE_REAL_PAYMENTS', true );
define( 'TCG_STORE_PLATFORM_DISABLE_REAL_POS_WRITES', true );
```

When `wp_get_environment_type()` reports `staging`, or
`TCG_STORE_PLATFORM_STAGING_MODE`/`TCG_STORE_PLATFORM_STAGING_BANNER` is true,
the plugin adds `noindex,nofollow,noarchive` robots controls, renders a
staff/admin staging banner, suppresses `wp_mail()` by default, and reports the
state in authenticated `/wp-json/tcg-store/v1/health` under `staging_safety`.
Use `TCG_STORE_PLATFORM_STAGING_ALLOW_EMAILS` or
`TCG_STORE_PLATFORM_STAGING_ALLOW_INDEXING` only for explicit sandbox tests.

## Staging Plugin Support

WP STAGING or a similar staging clone plugin may be used as an optional backup
or clone workflow. It must not be the only development automation path.

Before major database migrations:

1. Create a GoDaddy backup, WP STAGING clone, or equivalent verified backup.
2. Confirm the backup includes the database and `wp-content`.
3. Run migration checks on staging.
4. Record the backup reference in `REVISION_LOG.md` or the release notes.

## Upload-Only Package Transfer

Build and upload the runtime-only WordPress plugin zip to staging uploads:

```bash
npm run package:wordpress
PUG_STAGING_SSH_HOST=example.com \
PUG_STAGING_SSH_USER=staging-user \
PUG_STAGING_SSH_PASSWORD=staging-password \
PUG_STAGING_CONFIRM_UPLOAD=upload-to-staging \
npm run staging:upload-package
```

The upload script writes a timestamped `tcg-store-platform` zip under
`/html/wp-content/uploads` by default, verifies the remote byte size, and
prints only non-secret metadata. It does not activate the plugin, overwrite
active plugin files, run migrations, delete remote files, or deploy production.
Staging SSH/SFTP scripts use a shared OpenSSH-compatible algorithm set for
GoDaddy Managed WordPress hosts that negotiate `ssh-ed25519` host keys and
modern curve/AES ciphers.

## Gated Inventory Smoke Runner

Run the staged inventory route smoke test through WP-CLI after staging has the
plugin installed and the required staging gates are intentionally enabled:

```bash
PUG_STAGING_SSH_HOST=example.com \
PUG_STAGING_SSH_USER=staging-user \
PUG_STAGING_SSH_PASSWORD=staging-password \
PUG_STAGING_CONFIRM_SMOKE=run-staging-inventory-smoke \
npm run staging:inventory-smoke
```

The smoke runner uploads a temporary
`wordpress-staging-inventory-smoke-*.php` file under
`/html/wp-content/uploads`, runs `wp eval-file` against `/html` by default,
then removes only that temporary smoke file through SFTP. It prints only
non-secret metadata and WP-CLI output tails. It does not activate the plugin,
overwrite active plugin files, run production deployment, or perform external
WooCommerce, Square, ScryDex, POS, email, or payment side effects.

## Gated Migration Rehearsal

Run the migration rollback/restore rehearsal only after creating a staging
database backup or staging clone:

```bash
PUG_STAGING_SSH_HOST=example.com \
PUG_STAGING_SSH_USER=staging-user \
PUG_STAGING_SSH_PASSWORD=staging-password \
PUG_STAGING_BACKUP_CONFIRMED=backup-complete \
PUG_STAGING_BACKUP_REFERENCE=godaddy-backup-or-clone-id \
PUG_STAGING_CONFIRM_MIGRATION_REHEARSAL=run-staging-migration-rehearsal \
npm run staging:migration-rehearsal
```

The rehearsal runner uploads a temporary
`wordpress-migration-rehearsal-*.php` file under `/html/wp-content/uploads`,
runs WP-CLI `eval-file` with
`TCG_ALLOW_DESTRUCTIVE_MIGRATION_REHEARSAL=1`, and removes only that temporary
file through SFTP. The PHP rehearsal refuses production and rolls the staging
database from the current schema target back to version `1`, then migrates
back to the current target and verifies the inventory/pricing and provider
price observation tables. It does not activate the plugin, overwrite active
plugin files, deploy production, or print credentials.

## Gated Search Benchmark

Run the 50,000-row inventory search benchmark on staging after migration
acceptance and before approving search/pagination baselines:

```bash
PUG_STAGING_SSH_HOST=example.com \
PUG_STAGING_SSH_USER=staging-user \
PUG_STAGING_SSH_PASSWORD=staging-password \
PUG_STAGING_BENCHMARK_ROW_ACK=seed-50000-staging-rows \
PUG_STAGING_CONFIRM_SEARCH_BENCHMARK=run-staging-search-benchmark \
npm run staging:search-benchmark
```

The benchmark runner uploads a temporary
`wordpress-inventory-search-benchmark-*.php` file under
`/html/wp-content/uploads`, runs WP-CLI `eval-file` with
`TCG_ALLOW_INVENTORY_SEARCH_BENCHMARK=1`, and removes only that temporary file
through SFTP. It seeds 50,000 deterministic disposable inventory rows, runs
public/staff/deep-pagination/barcode lookup baselines, and sets
`TCG_INVENTORY_SEARCH_BENCHMARK_CLEANUP=1` by default so the fixture rows are
removed after the benchmark. It refuses production through the PHP fixture and
does not activate the plugin, overwrite active plugin files, deploy
production, or print credentials.

## Staging Smoke Checks

- Plugin activates cleanly.
- System status reports expected plugin and database versions.
- System status and authenticated health report blocked offline route bootstrap
  by default, with `registration_deferred = true`, the bootstrapper hook
  registered, and offline pull/push routes still unregistered.
- System status and authenticated health report staged pull route-provider
  readiness while default route-connected reads and writes remain deferred.
- System status and authenticated health report staged pull cursor planner
  readiness while cursor writes remain deferred.
- System status and authenticated health report staged pull cursor SQL planning
  readiness while cursor upsert execution remains deferred.
- System status and authenticated health report staged pull cursor repository
  readiness while default route cursor execution remains deferred.
- System status and authenticated health report staged route cursor advancement
  provider readiness while default route execution remains deferred.
- System status and authenticated health report staged pull handler cursor
  advancement readiness while default handler cursor execution remains deferred.
- System status and authenticated health report staged pull handler dependency
  factory readiness while default route dependency injection, route-connected
  reads, and cursor writes remain deferred.
- System status and authenticated health report staged push persistence SQL and
  repository readiness while queue persistence, conflict persistence, queue
  replay, canonical mutations, and route-connected writes remain deferred.
- System status and authenticated health report staged push route handler
  factory readiness while default push route execution, route registration,
  queue replay, canonical mutations, and route-connected writes remain
  deferred.
- System status and authenticated health report staged push snapshot query
  planner and SQL template readiness while snapshot execution, repository
  loading, canonical mutations, and route-connected reads remain deferred.
- System status and authenticated health report staged push snapshot repository
  readiness while default route-connected snapshot reads, route registration,
  queue replay, and canonical mutations remain deferred.
- System status and authenticated health report staged push snapshot route
  provider readiness while default route-connected snapshot reads, route
  registration, queue replay, and canonical mutations remain deferred.
- System status and authenticated health report staged push operation-options
  provider readiness while default route execution, route registration,
  external tournament-provider queue workers, and canonical mutations remain
  deferred.
- System status and authenticated health report staged push existing
  operation-row query and SQL readiness while route-connected reads,
  repository execution, queue replay, and canonical mutations remain deferred.
- System status and authenticated health report staged push existing
  operation-row repository readiness while default route-connected reads,
  queue replay, and canonical mutations remain deferred.
- System status and authenticated health report staged push existing
  operation-row route provider readiness while default route execution, route
  registration, queue replay workers, and canonical mutations remain deferred.
- Staged push responses expose operation replay counts and replay operation IDs
  for duplicate-push verification while queue replay workers and canonical
  mutations remain deferred.
- Staged push response results expose per-operation inserted/replayed
  persistence annotations and an operation persistence-status map for
  duplicate-push verification while queue replay workers and canonical
  mutations remain deferred.
- Staged duplicate-push response results hydrate status, code, details, and
  resolved timestamps from existing queue rows while queue replay workers and
  canonical mutations remain deferred.
- System status and authenticated health report staged canonical mutation
  planner readiness while inventory, event, credit-ledger, queue replay, and
  route-connected writes remain deferred.
- Explicitly enabled staged push route responses expose canonical mutation
  planning counts and skipped replay IDs while canonical entity writes remain
  deferred.
- Staged canonical mutation SQL planning reports readiness and produces
  inspection-only guard templates while repository execution and canonical
  writes remain deferred.
- Route-connected staged push responses expose canonical SQL query counts,
  operation IDs, prepare-argument counts, and replayed zero-query metadata
  while repository execution and canonical writes remain deferred.
- Canonical mutation repository staging reports deferred repository results,
  operation IDs, prepare-argument counts, and zero affected rows while
  inventory, event, credit-ledger, and queue replay writes remain deferred.
- Explicitly enabled staged push responses expose deferred canonical
  repository status for fresh and replayed operations while canonical
  repository execution remains deferred.
- Canonical repository execution gate metadata reports blocked status, block
  reasons, and transaction-adapter deferral while canonical writes remain
  disabled.
- Canonical transaction preflight metadata reports ready/blocked mutation
  counts and confirms event/credit write plans remain deferred.
- Staged offline pull handler returns a contract-shaped response in local or
  staging tests while live pull queries and cursor advancement remain disabled.
- Pull change-query planning exposes only safe table/column contracts and
  device-scoped conflict filters while query execution remains disabled.
- Health/System Status exposes pull change-query readiness and supported
  domains while trusted device context handoff and execution remain deferred.
- Pull change-query SQL planning exposes only allowlisted prepared templates
  and argument counts while cursor filtering, execution, tombstones, cursor
  advancement, and route registration remain disabled.
- Pull change repository adaptation exposes normalized change-set and
  repository-audit coverage while route-connected execution, cursor
  advancement, tombstones, and route registration remain disabled.
- Pull change-set provider composition can be injected in controlled staging
  tests only with explicit registered-device context while default route wiring
  remains disabled.
- Pull device context planning validates authorized registered-device
  permission resolution handoff for pull requests while default route wiring
  remains disabled.
- WooCommerce checkout test order completes in sandbox mode.
- ScryDex mock or sandbox sync completes.
- Kiosk/offline sync queue test completes.
- POS/payment sandbox response produces redacted provider/POS sync log plans
  and deferred SQL templates without live capture or inventory writes.
- POS/payment repository staging and execution-gate metadata report deferred
  log writes, zero affected rows, and blocked execution by default without
  live repository inserts, provider capture, or inventory writes.
- POS/payment transaction preflight metadata reports supported insert
  readiness, inherited gate blocks, unsupported query-kind blocks, zero
  affected rows, and deferred transaction execution.
- Explicit staged POS/payment log execution writes only preflight-approved
  `tcg_pos_sync_log` and `tcg_payment_provider_log` rows through `$wpdb`;
  route-connected writes, provider capture, provider inventory writes, and
  WooCommerce gateway capture remain disabled.
- Staged inventory create responses expose side-effect-free WooCommerce product
  and Square inventory projection contracts after successful database writes;
  WooCommerce writes, Square writes, label printing, and network calls remain
  deferred.
- Square projection execution audit payloads expose sandbox sync request
  envelopes, idempotency keys, external IDs, and request-planner readiness for
  staging review; production-context request planning rejects before any Square
  writer callback can run.
- Staged POS/payment transaction execution can wrap those explicit log writes
  in begin/commit/rollback handling for tests only. Route-connected writes,
  provider capture, provider inventory writes, webhook routes, POS
  reconciliation services, and WooCommerce gateway capture remain disabled.
- Planned POS/payment route contracts exist for webhooks, event ingestion,
  reconciliation, conflicts, and fee snapshots, but route registration remains
  disabled until staging-gated wiring is explicitly enabled.
- System status and authenticated health report POS/payment route readiness
  with zero registerable routes by default, missing route-handler and
  permission-callback dependencies, webhook verifier deferral, and provider
  capture/inventory/gateway deferrals.
- Manager/system roles receive `manage_pos`; staff roles do not. POS/payment
  permission callbacks remain fail-closed until capability checks and webhook
  verifiers are explicitly configured for staging route tests.
- POS/payment controller callbacks exist for staged handler injection, but
  default callbacks return disabled responses with route/provider/capture
  deferrals and no live route registration.
- POS/payment route registration planning reports zero enabled registrations
  by default. Future read/write/webhook routes require explicitly cleared
  registration, write, and webhook deferrals before route args can be emitted.
- POS/payment guarded route registrar registers zero routes by default and may
  only call WordPress route registration for future planner-enabled route
  plans.
- System status and authenticated health report POS/payment route bootstrap
  status with zero registerable routes by default, blocked feature-gate
  reasons, and registration deferral.
- The POS/payment route bootstrapper hook is registered on `rest_api_init`,
  but it remains inert by default and does not expose POS/payment REST routes.
- POS/payment route dependency status reports controller handler, permission
  callback, webhook verifier, registrar, and bootstrapper readiness while
  keeping route registration and route-connected writes deferred by default.
- Parser-only POS/payment validation handlers are staged for every planned
  callback; use them for request-shape checks only until route registration,
  writes, capture, inventory updates, and gateway capture are explicitly
  enabled in staging.
- WordPress POS/payment bootstrap uses the staged dependency factory, so
  future route registration tests exercise the same dependency path while
  default route contracts still register zero POS/payment routes.
- POS/payment fee snapshot list requests expose staged query planning metadata
  for provider, channel, currency, effective-date, and page-size filters while
  read execution, writes, capture, inventory updates, gateway capture, and
  route registration remain disabled.
- POS/payment fee snapshot SQL-template planning reports safe prepared
  `SELECT` metadata and prepare-argument counts while repository execution,
  route registration, writes, capture, inventory updates, and gateway capture
  remain disabled.
- POS/payment fee snapshot repository adaptation can execute those allowlisted
  reads in explicit `$wpdb` staging tests with row normalization, prefix
  guards, and failure audits while route-connected reads, writes, capture,
  inventory updates, gateway capture, and route registration remain disabled.
- POS/payment fee snapshot repository readiness appears in parser-only route
  validation and dependency health/admin status, but default route callbacks
  still do not invoke the repository or return fee rows.
- An explicit staged POS/payment fee snapshot route handler can be invoked in
  controlled tests to return repository-backed fee rows and audit metadata.
  The default route factory remains parser-only and unregistered.
- A staged POS/payment fee snapshot route handler factory can be injected into
  the POS/payment dependency factory for explicitly enabled repository-backed
  read tests while default route-connected reads and route registration remain
  deferred.
- POS/payment route contracts, registration planning, readiness planning, and
  bootstrap summaries expose route-connected read deferral, and future GET
  routes stay blocked until staging explicitly clears the read gate.
- POS/payment dependency health and admin summaries expose route-connected read
  deferral and read-ready state separately from write readiness, so staging can
  verify default read execution is still deferred.
- Customer credit ledger replay matches cached balance.
- Event registration flow works for local events.
- External tournament-provider integrations remain out of active staging scope.
