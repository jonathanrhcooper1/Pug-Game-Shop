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
define( 'TCG_STORE_PLATFORM_STAGING_BANNER', true );
define( 'TCG_STORE_PLATFORM_DISABLE_REAL_EMAILS', true );
define( 'TCG_STORE_PLATFORM_DISABLE_REAL_PAYMENTS', true );
define( 'TCG_STORE_PLATFORM_DISABLE_REAL_POS_WRITES', true );
```

## Staging Plugin Support

WP STAGING or a similar staging clone plugin may be used as an optional backup
or clone workflow. It must not be the only development automation path.

Before major database migrations:

1. Create a GoDaddy backup, WP STAGING clone, or equivalent verified backup.
2. Confirm the backup includes the database and `wp-content`.
3. Run migration checks on staging.
4. Record the backup reference in `REVISION_LOG.md` or the release notes.

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
  provider readiness while default route execution, route registration, TopDeck
  queue workers, and canonical mutations remain deferred.
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
  planner readiness while inventory, event, TopDeck, credit-ledger, queue
  replay, and route-connected writes remain deferred.
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
- TopDeck mock or sandbox sync completes.
- Kiosk/offline sync queue test completes.
- POS/payment sandbox response is handled.
- Customer credit ledger replay matches cached balance.
- Event registration flow works for local and TopDeck-linked events.
