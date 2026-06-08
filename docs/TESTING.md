# Testing

## Test Layers

| Layer | Scope |
| --- | --- |
| Unit | Pricing, validation, state machines, capability logic, normalization |
| Database integration | Transactions, row locks, uniqueness, migrations, ledger replay |
| WordPress integration | REST permissions, nonces, Action Scheduler, settings, admin |
| WooCommerce integration | Classic/Block cart and checkout, HPOS, order/refund lifecycle |
| Provider contract | Recorded sanitized fixtures plus verified sandbox/account calls |
| Desktop integration | SQLite migrations, queue, device auth, printer/scanner adapters |
| End-to-end | Website, kiosk, staff, offline/reconnect, event, buylist workflows |
| Load/recovery | 50,000+ items, full sync, concurrent reservations, backup/restore |

## Current Automation

- `.github/workflows/pull-request-quality-gates.yml` runs local PHP checks,
  validates `.wp-env.json`, confirms required test scaffolds exist, and scans
  for production secret markers on pull requests.
- Local verification now includes `cargo test` for the Tauri Rust command
  scaffold on Windows when Rust/Cargo and the MSVC linker are installed.
- Local unit coverage now includes offline route runtime settings, contract
  mutation, staging-only feature availability, runtime-aware bootstrap/health
  planning, and pairing-route registration readiness.
- Local ScryDex provider coverage now targets the documented
  `/pokemon/v1/cards` endpoint shape, including live response `data` rows,
  `page_size`/`total_count` pagination fields, and game-context normalization.
- Local packaging coverage now builds the WordPress plugin zip and verifies
  the archive root, runtime entry points, runtime route-gate files, and absence
  of tests/vendor/dev config.
- Local unit coverage now includes ScryDex provider settings sanitization,
  blank-field secret preservation, explicit clear flags, server-only provider
  context, and public readiness output that redacts saved Team ID and key
  values.
- Local unit coverage now includes ScryDex provider factory readiness, injected
  transport provider construction, missing-settings behavior, and admin/health
  redaction guarantees.
- Local unit coverage now includes ScryDex sync dry-run planning for first-page
  requests, checkpoint resume cursors, configured-state redaction, page-size
  clamping, invalid game fallback, and execution deferrals.
- Local unit coverage now includes ScryDex sync execution gate diagnostics for
  default blocked state, configured-provider gated state, secret-free health
  output, and future-ready dependency reporting without live network calls or
  database writes.
- Local unit coverage now includes ScryDex usage-budget settings and
  cards-page budget planning for disabled defaults, sanitized configured
  budgets, invalid reserve limits, deferred usage-provider requests, and
  already-fetched usage snapshots that block over-budget sync attempts.
- Local unit coverage now includes ScryDex checkpoint repository planning for
  read/upsert SQL templates, nullable resume fields, invalid table prefixes,
  invalid checkpoint identities, and execution-gate checkpoint readiness.
- Local unit coverage now includes provider price observation schema migration
  contracts for ScryDex market-price snapshots, migration plan/rollback target
  updates, and persistence planner observation IDs, game context, timestamps,
  and sync job IDs.
- Local unit coverage now includes ScryDex persistence SQL staging for
  reference-card inserts, changed-row updates, provider price observation
  inserts, checkpoint upsert plans, invalid source plans, table-prefix guards,
  and repository deferred audit results.
- Local unit coverage now includes ScryDex persistence repository readiness
  diagnostics and execution-gate wiring, proving valid table prefixes produce
  staged repository readiness and invalid prefixes keep the worker blocked.
- Local unit coverage now includes ScryDex cards worker orchestration planning
  for injected/mock provider pages, rate-limited provider results, persistence
  query/repository staging, invalid table-prefix blocking, and no network or
  database write execution.
- Local unit coverage now includes Square inventory sync readiness diagnostics
  for default sandbox probe planning, production-context rejection, supplied
  inventory rows, admin System Status summaries, deferred catalog/inventory
  writers, and continued payment authority delegation to the official
  WooCommerce Square extension.
- Local unit coverage now includes Square inventory batch sync planning for
  multiple staged inventory rows, hidden/unmapped skip handling, invalid row
  rejection, production-context blocking, aggregate idempotency keys/SKUs, and
  retained Square network/write/payment deferrals.
- Local unit and WordPress smoke coverage now include Square inventory batch
  sync readiness diagnostics for default sandbox probe rows, supplied row
  probes, production-context blocking, admin summaries, health output, Square
  operation counts, and retained provider-write/payment deferrals.
- Local unit coverage now includes official WooCommerce Square extension
  status detection for inactive, active-plugin, installed-inactive, and loaded
  class-signal cases, plus POS/readiness/admin payload assertions that payment
  capture remains delegated to the official extension.
- `apps/offline-app/tests/ui-shell-contract.mjs` verifies the offline app
  inventory workspace keeps its scanner/search, sync queue, conflict center,
  customer credit, grouped sync controls, selected-card visual frame, detail
  action cluster, connector profile controls, active navigation, filter/grid
  interaction markers, empty search state, responsive mobile title constraint,
  and no-production-secret UI markers in place. The current visual/functional
  checkpoint also captures desktop `1440x1000` and mobile `390x844` Chrome
  screenshots against the Vite dev server, clicks filters, grid/list controls,
  `Sync Now`, `Stage New Update`, and `Test Website Connector`, verifies the
  filtered detail panel follows Mox Amber, and checks for zero horizontal
  overflow or console warnings/errors.
- `apps/offline-app/tests/workspace-state-contract.mjs` verifies the offline
  app's typed local workspace state includes the planned sync routes,
  reusable company/site connector profiles, SQLite operation envelope fields,
  WordPress connector manifest ingestion/validation helpers, queued inventory
  operation markers, customer-credit redemption envelopes, conflict-review
  envelopes, redacted device-pairing request planning, REST-ready offline push
  batch shaping, deferred push request planning, response summarization, and
  no direct external endpoint or database access markers. The offline app
  package contract also runs `tsc --noEmit`.
- Root offline app test coverage now runs TypeScript typechecking before the
  contract suite and verifies the local pull-refresh preview created by
  `Sync Now`, including refreshed row counts and queued-operation preservation.
- Root offline app test coverage now also runs the Tauri Rust command tests
  through `scripts/run-offline-app-rust-tests.mjs`, which resolves the user
  Cargo path on Windows before invoking `cargo test`.
- Offline app browser verification now covers the functional local-session
  controls at desktop width: stage inventory update, prepare print label,
  review/approve all conflicts into history, stage customer-credit use into a
  pending hold, add a second company connector profile, validate its connector
  manifest, and confirm no console warnings/errors or horizontal overflow. A
  mobile-width pass verifies the compact Settings nav remains accessible by
  button name and the connector editor can save a profile without overflow.
- Local unit and WordPress smoke coverage now include the WordPress offline
  connector manifest diagnostics, proving authenticated health exposes the
  company/site profile, route count, offline device-token auth mode, desktop
  secure credential storage boundary, official WooCommerce Square payment
  authority, ScryDex server-side credential storage, and no credential sync to
  the offline app.
- Local unit and WordPress smoke coverage now include the app pairing contract
  inside offline pairing readiness, proving `/offline/devices/register`,
  requested offline scopes, redacted pairing-code handling, desktop secure
  token storage, network/token deferrals, and no credential sync to the app.
- `apps/offline-app/tests/queue-bridge-contract.mjs` verifies staged offline
  queue operations stay behind a Tauri command adapter boundary and do not use
  direct browser storage or network writes.
- `apps/offline-app/tests/local-queue-persistence-contract.mjs` verifies the
  offline app produces the SQLite `operation_queue` insert plan, keeps it
  visible in the bridge/UI/Tauri command boundary, and leaves local
  persistence, queue replay, canonical website mutations, network writes, and
  direct MySQL access deferred.
- `apps/offline-app/tests/tauri-command-contract.mjs` verifies the desktop
  command scaffold, frontend Tauri adapter detection, Rust serde dependencies,
  supported offline operation/entity type validation, and no direct browser
  storage/network markers. The offline app Windows workflow also runs
  `cargo test` for the Tauri command tests when Rust is available in CI.
- `packages/api-client/tests/woocommerce-product-adapter.mjs` verifies staged
  WooCommerce create/update/stockout request plans stay non-production,
  reject live-looking credential contexts, keep writes deferred, and preserve
  the official WooCommerce Square handoff for catalog/inventory sync.
- `.github/workflows/php.yml` runs Composer validation, dependency audit,
  syntax checks, unit tests, bootstrap smoke, and WordPress coding standards
  against PHP 8.1, 8.2, and 8.3.
- `.github/workflows/wordpress-integration.yml` provisions WordPress and MySQL
  in GitHub Actions, installs WooCommerce, activates the plugin, and runs
  `apps/wordpress-plugin/tests/wordpress-integration-smoke.php` through WP-CLI.
  It then switches to `WP_ENVIRONMENT_TYPE=staging`, enables only the
  inventory/pricing feature plus staff search/create runtime gates, and runs
  `apps/wordpress-plugin/tests/wordpress-staging-inventory-smoke.php` to prove
  the staff `/inventory/search` and `POST /inventory` routes can execute while
  public reads, WooCommerce projection, Square projection, labels, POS
  ingestion, and production route availability remain closed. The staging smoke
  seeds one disposable Pokemon inventory row, creates one disposable Bulbasaur
  row through REST, verifies its initial price-change log row, and asserts
  staff search returns both rows with staff SKU data. The workflow also runs an
  explicit destructive migration rehearsal in the disposable database, rolling
  from the current target to schema version `1`, verifying Phase 2 and provider
  price observation tables are dropped, migrating back to the target, and
  verifying those tables return. It
  then runs an explicit non-production inventory search benchmark fixture that
  seeds 50,000 disposable rows and emits baselines for public visible search,
  staff deep pagination, and staff barcode lookup through the staged search
  handler.
- `apps/wordpress-plugin/tests/wp-now-blueprint.json` can be used with
  `npx @wp-now/wp-now start --blueprint=tests/wp-now-blueprint.json` for a
  local WordPress Playground smoke site when Docker/MySQL are unavailable.
  On Windows, `wp-now` may fail while installing WordPress.org plugins from a
  Blueprint; in that case, run plain plugin mode locally and use the GitHub
  Actions WordPress integration job for the WooCommerce-backed gate.
- Local unit coverage now includes event registration input validation,
  registration policy outcomes, and registration response shaping. WordPress
  integration smoke coverage asserts the local registration route is registered.
- Local unit coverage now includes inventory intake persistence planning for
  schema-aligned insert templates, stable public IDs, fallback barcode/SKU
  generation, money normalization, listed/sold timestamps, actor attribution,
  unsafe table-prefix rejection, incomplete request rejection, and deferred
  repository/projection metadata.
- Local unit coverage now includes the explicit inventory intake repository
  adapter for prepared `$wpdb` inserts, invalid-plan short-circuiting,
  table-prefix mismatch rejection, failed insert handling, zero/unexpected
  insert-count rejection, duplicate barcode/SKU preflight rejection,
  transactional initial price-change log persistence, rollback on price-log
  insert failure, created-item response payloads, and audit redaction.
- Local unit coverage now includes staged inventory intake route handler and
  factory composition for successful created-item responses, invalid payload
  short-circuiting, repository failure rejection, default write deferral,
  explicitly enabled repository-backed writes, initial price-log response
  metadata, side-effect-free WooCommerce/Square projection contracts, provider
  failures, and table prefix issues.
- Local unit coverage now includes gated inventory route registration planning
  and registrar behavior for default-disabled routes, explicit public-read
  gating, explicit write-gate clearing, injected controller handler readiness,
  capability permission callbacks, public-read permission callbacks, and locked
  device/owner permission routes.
- Local unit coverage now includes inventory public-read rate limiting,
  covering missing-limiter public denial, per-bucket limit enforcement, window
  reset behavior, readiness reporting, and staff capability fallback when
  public reads are not safely open.
- Local unit coverage now includes inventory route dependency factory and
  status presentation behavior for blocked default dependencies, staged
  search/create handler composition, permission callback assembly, registrar
  handoff, controller dispatch, and admin/health readiness summaries.
- WordPress integration smoke coverage now asserts authenticated health exposes
  inventory route dependency readiness while inventory search and create routes
  remain unregistered by default.
- Local unit and WordPress smoke coverage now include the inventory route
  bootstrapper, proving blocked, gated, and future-ready route registration
  paths while the production default remains unregistered.
- Local unit coverage now verifies the default inventory dependency graph
  exposes staged search/intake handler factories while route-connected reads
  and writes remain deferred.
- Local unit coverage now includes the staff Inventory admin workspace
  presenter, covering readiness rows, route contract lockout rows, and default
  pending checkpoint rows.
- Local unit coverage now includes the staff Inventory admin search panel,
  covering default lockout, staging-ready route state, safe filter
  sanitization, and route metadata for the read-only REST-backed results table.
- Local unit coverage now includes the staff Inventory admin intake panel,
  covering default lockout, staging-ready route state, safe form sanitization,
  and route metadata for the gated REST-backed create form.
- Local unit coverage now includes Staff Inventory workspace projection
  planning readiness, proving WooCommerce/Square contracts can be marked ready
  while external writes remain deferred.
- Local unit coverage now includes WooCommerce product write request planning
  for serialized-card create/update/stockout envelopes, non-production
  environment gating, idempotency keys, product IDs/SKUs, and continued
  product-write/payment/Square deferrals.
- Local unit coverage now includes WooCommerce write request readiness wiring
  through guarded projection execution, staged inventory create metadata,
  dependency health/admin summaries, Staff Inventory workspace rows, and
  production request-context rejection before writer callbacks.
- Package-level API-client coverage now includes WooCommerce product adapter
  validation for staged create/update/stockout request plans, production/live
  credential rejection, deferred WordPress/WooCommerce writes, and official
  WooCommerce Square handoff.
- Offline app package coverage now includes reconnect push request planning
  and response summarization for queued operation batches while network
  execution, direct MySQL access, production API keys, queue replay, and
  canonical mutations stay deferred.
- Local unit coverage now includes inventory route runtime settings,
  staging-only staff search/create route contract configuration, and dependency
  factory proof that staff inventory search and create routes register only
  when their runtime contracts, handlers, and permission dependencies are
  explicitly ready.
- Local unit coverage now includes environment-aware feature flag availability,
  proving inventory/pricing can be enabled for local/development/staging while
  production sanitizes it off.
- Local unit coverage now includes customer credit schema, entry type sign and
  manager-approval rules, posting policy previews, and ledger posting service
  idempotency. WordPress integration smoke coverage asserts customer credit
  tables.
- Local unit coverage now includes customer credit planned REST route contracts
  and posting payload validation for route/customer matching, idempotency,
  currency, metadata, optional linked IDs, and manager-approved adjustments.
- Local unit coverage now includes customer credit REST response presentation
  for balance payloads, ledger row shaping, metadata redaction, posting-result
  payloads, and validation-error responses.
- Local unit coverage now includes buylist schema and submission status
  transitions. WordPress integration smoke coverage asserts buylist tables.
- Local unit coverage now includes buylist planned REST route contracts and
  submission intake payload validation for customer identity, idempotency,
  source, owner tokens, optional IDs, item identity, quantity, and graded cards.
- Local unit coverage now includes buylist offer planning for reviewed item
  offers, cash/credit totals, manager approval thresholds, invalid submissions
  and item rows, zero-value offers, and deterministic offer fingerprints.
- Local unit coverage now includes branding settings sanitization for company
  identity, HTTPS URLs, hex color normalization, safe existing-value
  preservation, client-safe public config export, and CSS variable output.
- Local unit coverage now includes sync schema and ScryDex checkpoint/resume
  planning against sanitized mock fixtures. WordPress integration smoke coverage
  asserts schema version `6` and sync tables.
- Local unit coverage now includes ScryDex provider adapter behavior using
  sanitized mock fixtures, credential header assertions, rate-limit mapping, and
  auth-context redaction.
- Local unit coverage now includes ScryDex card and current market price
  normalization using sanitized mock fixtures, required-field errors, and safe
  nullable defaults.
- Local unit coverage now includes reservation schema contracts and
  transaction-oriented reservation service behavior for successful exact-item
  claims, idempotency replay, unavailable inventory rejection, and active claim
  collision rejection. Lifecycle coverage includes conversion to sold, release
  to available, idempotent conversion replay, and inventory-state mismatch
  rejection. WordPress integration smoke coverage asserts reservation tables
  as part of the full schema.
- Local unit coverage now includes offline sync persistence schema contracts for
  registered devices, idempotent operation queue/result rows, manager-reviewed
  conflicts, per-device pull cursors, and reversible drop order. WordPress
  integration smoke coverage asserts schema version `8` and offline sync
  persistence tables.
- Local unit coverage now includes offline push persistence planning for future
  queue/result rows, conflict insert rows, JSON payload shaping, idempotent
  replay rows, mismatched device rows, mismatched batch IDs, invalid timestamps,
  and stale replay rows.
- Local unit coverage now includes offline push persistence SQL/repository
  staging for prepared queue/conflict insert templates, replay-only no-op
  plans, invalid table prefixes, tampered rows, explicit `$wpdb` execution,
  database failures, and invalid affected-row results.
- Local unit coverage now includes offline push route handler factory staging
  for default route-connected deferral, explicit registered-device
  authorization, injected server snapshot resolution, queue persistence, and
  sync handler factory injection.
- Local unit coverage now includes offline push server snapshot query planning
  and SQL template generation for supported operations, invalid contexts,
  unsupported or mismatched operations, and tampered snapshot contracts.
- Local unit coverage now includes offline push server snapshot repository
  loading for resolver-ready snapshot normalization, duplicate operation/entity
  lookup keys, invalid query plans, missing rows, malformed rows, and fetch
  audit metadata.
- Local unit coverage now includes route-aware offline push server snapshot
  provider composition for authenticated device context handoff,
  repository-backed snapshot reads, missing context/row rejection, and staged
  route handler integration.
- Local unit coverage now includes route-aware offline push operation-options
  provider composition for event payment status normalization, default
  not-required handling, invalid or unsupported status rejection, non-event
  operation skipping, and staged event decisions that suppress external
  provider queueing for pay-at-store reservations.
- Local unit coverage now includes offline push existing operation-row query
  planning and SQL building for idempotent replay preparation, including
  accepted lookup contracts, invalid contexts, duplicate/invalid operation IDs,
  prepared SQL shape, rejected plans, and tampered contract rejection.
- Local unit coverage now includes offline push existing operation-row
  repository loading for successful replay candidate reads, empty result sets,
  invalid plans, database failures, malformed rows, duplicate rows, and
  repository audit payloads.
- Local unit coverage now includes route-aware offline push existing
  operation-row provider composition for authenticated device context handoff,
  repository-backed replay candidate reads, repository rejection mapping, and
  duplicate-push no-write replay behavior in staged route handlers.
- Local unit coverage now includes offline push replay metadata for persistence
  insert IDs, replay IDs, repository replay helper methods, repository audits,
  and staged route response meta.
- Local unit coverage now includes staged offline push per-operation
  persistence annotations for fresh inserted results and duplicate-push
  replayed results.
- Local unit coverage now includes staged offline push replay response
  hydration from stored queue-row details and resolved timestamps.
- Local unit and WordPress smoke coverage now include staged canonical mutation
  planning for accepted inventory, event, and credit push operations, skipped
  conflict/rejected operations, invalid accepted-result guards, and readiness
  metadata.
- Local unit coverage now includes route-connected canonical mutation planning
  metadata for staged push responses, including skipped replayed operations so
  duplicate pushes cannot plan duplicate canonical writes.
- Local unit and WordPress smoke coverage now include canonical mutation
  SQL-template planning, guarded inventory update templates, event/customer
  credit lookup guards, tampered row rejection, and readiness metadata.
- Local unit coverage now includes route-connected canonical mutation SQL
  metadata for fresh staged push responses and duplicate replay responses,
  including query counts, operation IDs, prepare-argument counts, and deferred
  repository/execution flags.
- Local unit and WordPress smoke coverage now include the deferred canonical
  mutation repository scaffold, repository result/audit metadata, rejected SQL
  plans, empty valid plans, readiness metadata, and zero-affected-row behavior.
- Local unit coverage now includes route-connected canonical mutation
  repository staging metadata for fresh and replayed staged push responses,
  including repository status, query counts, operation IDs, zero affected rows,
  and deferred execution flags.
- Local unit and WordPress smoke coverage now include canonical mutation
  repository execution gate outcomes, block reasons, transaction-adapter
  deferral, route metadata, and sync readiness.
- Local unit and WordPress smoke coverage now include canonical mutation
  transaction preflight status, ready/blocked counts, operation IDs, deferred
  event/credit write plans, and route/readiness metadata.
- Local unit coverage now includes reservation expiry cleanup planning for
  expired active holds, equal-to-now expiries, future holds, inactive rows,
  invalid rows, deterministic cleanup idempotency keys, and explicit expired
  hold transitions back to available inventory.
- Local unit coverage now includes manager override policy behavior for
  below-minimum sale approval, distinct manager checks, required reasons,
  manager reauthentication, reauthentication timestamps, invalid amounts, and
  override-row persistence requirements.
- Local unit coverage now includes manager override persistence/audit payload
  planning for accepted below-minimum approvals, rejected decisions,
  no-row-required decisions, optional context IDs, price formatting, stable
  fallback public IDs, and reauthentication audit hashes.
- Local unit coverage now includes manager override repository persistence for
  approved override rows, skipped plans, table-prefix validation, invalid-row
  rejection, failed inserts, unexpected insert counts, and raw reason redaction
  from repository audit payloads.
- Local unit coverage now includes WooCommerce serialized cart item metadata
  validation for exact inventory/reservation identifiers, owner token hashes,
  quantity-one enforcement, reservation expiry, price snapshots, and currency.
- Local unit coverage now includes WooCommerce order-line metadata planning for
  exact inventory, reservation, owner-token, price snapshot, currency, expiry,
  optional card descriptors, deterministic snapshot hashes, and zero-price
  snapshots.
- Local unit coverage now includes WooCommerce order lifecycle planning for
  checkout linkage, payment-complete conversion, failed/cancelled release,
  refund review, non-serialized line skips, invalid metadata, duplicate
  reservation lines, invalid actions, and invalid orders.
- Local unit coverage now includes WooCommerce serialized inventory hook
  contracts for cart, checkout, payment, order, refund, cart removal, and Store
  API validation lifecycle coverage, with live registration gated off by
  default.
- Local unit coverage now includes REST route contracts for health and public
  Events endpoints, including namespace/method/callback/access-mode checks and
  guards that unimplemented write modules are not registered.
- Local unit and WordPress smoke coverage now include POS/payment route
  readiness diagnostics for planned webhook, event ingestion, reconciliation,
  conflict, and fee-snapshot routes, proving the routes stay unregistered while
  blocked reasons and provider/capture deferrals remain visible.
- Local unit and WordPress smoke coverage now include POS/payment route
  permission callbacks, manager/system-only `manage_pos`, webhook verifier
  fail-closed behavior, and readiness metadata for injected permission
  callbacks.
- Local unit coverage now includes the fail-closed POS/payment controller
  scaffold, disabled default responses, injected handler dispatch, normalized
  route request data, and controller handler readiness metadata.
- Local unit coverage now includes POS/payment route registration planning for
  default-locked plans, capability and webhook permission readiness, injected
  controller handler readiness, future read/write/webhook route gates, and
  public permission-bypass prevention.
- Local unit coverage now includes POS/payment guarded route registrar
  behavior for disabled defaults, future enabled read/write/webhook routes,
  missing permission callbacks, missing injected handlers, and write/webhook
  gate enforcement.
- Local unit and WordPress smoke coverage now include POS/payment route
  bootstrap status for blocked/gated/ready orchestration, health/admin
  payloads, zero default registerable routes, and registration deferral.
- Local unit coverage now includes migration runner planning for clean install,
  prior-schema upgrade, current-schema idempotency, rollback order, and no-op
  rollback plans.
- Square inventory adapter coverage replaces removed external tournament
  provider coverage as an active package-level scaffold.
- Root automation now includes sync-engine offline conflict policy tests for
  inventory reservations, event reservations, customer credit redemption, and
  device revocation.
- Root automation now includes the offline app Windows package contract test
  for Tauri metadata, `x86_64-pc-windows-msvc`, NSIS `.exe` output, offline
  sync routes, required branding tokens, and secret-safety markers.
- Root automation now includes the offline app SQLite schema contract test for
  local device identity, cursors, operation queue envelope fields, sync logs,
  cached branding/inventory/credit/events, conflicts, and SQLite-only syntax
  guards.
- Local unit coverage now includes WordPress offline route contracts for
  device pairing, pull, push, conflict listing, conflict resolution,
  permissions, callbacks, namespace, and disabled-live defaults.
- Local unit coverage now includes offline push payload validation for batch
  IDs, required operation envelope fields, device matching, duplicate client
  operation IDs, supported operation/entity pairs, timestamps, JSON-object
  payloads, authorization context, and schema version gating.
- Local unit coverage now includes offline pull request validation for cached
  domain selection, cursors, page-size bounds, tombstone inclusion, device IDs,
  and schema version gating.
- Local unit coverage now includes offline pull response presentation for empty
  domain responses, request cursor carry-forward, normalized data rows,
  tombstone inclusion/exclusion, UTC timestamps, entity IDs, row versions, and
  invalid response contract inputs.
- Local unit coverage now includes the staged offline pull route handler,
  proving valid requests return the presenter-shaped response contract,
  injected change-set providers are passed through without cursor advancement,
  invalid payloads skip providers, and provider failures fail closed.
- Local unit coverage now includes offline pull change-query planning for
  branding, inventory, customer credit, events, and conflicts domain contracts,
  including safe table/column allowlists, device-scoped conflict filters,
  request cursor carry-forward, and fail-closed invalid inputs.
- Local unit and WordPress smoke coverage now assert staged pull change-query
  readiness metadata, supported domain counts, trusted-context deferral, and
  query-execution deferral in health/admin status payloads.
- Local unit coverage now includes offline pull change-query SQL template
  planning for prepared per-domain `SELECT` statements, conflict-device
  filters, cursor carry-forward deferral, and fail-closed tampered contracts.
- Local unit coverage now includes offline pull change repository adaptation
  for explicitly called prepared `$wpdb` reads, normalized change sets,
  database failure rejection, malformed row rejection, and secret-free audits.
- Local unit coverage now includes offline pull change-set provider
  composition for explicit registered-device context, planner/repository
  composition, staged pull-handler injection, and fail-closed provider
  rejection.
- Local unit coverage now includes offline pull device context planning for
  authorized permission resolutions, request/device matching, required
  `offline_pull` scope, invalid table prefixes, and provider construction from
  valid context.
- Local unit coverage now includes route-aware offline pull provider handoff
  for registered-device header resolution, request-data forwarding,
  provider-backed change reads, missing-authorization rejection before reads,
  mismatched device context fail-closed behavior, and deferred session writes.
- Local unit coverage now includes offline pull cursor advancement planning for
  complete provider pages, `has_more` skip behavior, nullable cursors, invalid
  context/time/cursor rejection, malformed change sets, missing domains, and
  write-deferred cursor row payloads.
- Local unit coverage now includes offline pull cursor SQL planning for
  prepared upsert templates, null cursor literals, empty valid plans, invalid
  source plans, tampered cursor rows, invalid table names, and deferred
  execution metadata.
- Local unit coverage now includes offline pull cursor repository adaptation
  for explicit cursor upserts, empty plans, invalid plans before writes,
  database failures, invalid affected-row results, and route-deferred audits.
- Local unit coverage now includes route-aware offline pull cursor advancement
  provider composition for registered-device header resolution, explicit cursor
  repository invocation, missing authorization before writes, and missing
  change-set rejection after context lookup.
- Local unit coverage now includes opt-in pull handler cursor advancement
  orchestration for default deferral, successful explicit advancement metadata,
  rejected cursor results, invalid provider returns, and readiness reporting.
- Local unit coverage now includes staged pull route handler factory composition
  for default route dependency deferral, explicitly enabled route-aware provider
  wiring, and sync factory injection of the composed handler.
- Local unit coverage now includes offline device pairing request validation
  for pairing codes, installation IDs, device modes, manager/location IDs, app
  versions, Windows platform checks, hardware capabilities, requested scopes,
  unsupported capabilities/scopes, and schema version gating.
- Local unit coverage now includes offline device registration planning for
  future device rows, one-time response payloads, redacted audit payloads,
  scope/capability preservation, generated credential validation, and token
  expiry windows.
- Local unit coverage now includes offline device registration credential
  issuance for generated UUID device IDs, one-time hex tokens, SHA-256 token
  hashes, UTC issue/expiry timestamps, default and custom TTLs, injected byte
  sources, secret-free audit fingerprints, invalid TTLs, invalid timestamps,
  and byte-length guards.
- Local unit coverage now includes offline device registration insert query
  planning for prepared SQL templates, prepare args, schema-length public IDs,
  JSON field normalization, UTC timestamp conversion, malformed rows, session
  state rejection, and secret-free audits.
- Local unit coverage now includes offline device registration repository
  adaptation for explicitly called prepared `$wpdb` inserts, invalid pre-query
  rejection, failed database inserts, zero-row and unexpected row-count
  rejection, insert ID reporting, response payload return, and audit redaction
  for raw device tokens and token hashes.
- Local unit coverage now includes offline device registration service
  orchestration for pairing validation, credential issuance, registration
  planning, explicit repository insertion, missing repository configuration,
  repository rejection, stable result envelopes, and service audit redaction
  for raw device tokens and token hashes.
- Local unit coverage now includes the opt-in offline device registration
  route handler adapter, proving injected controller dispatch, registered,
  invalid, and rejected response envelopes, repository short-circuiting for
  invalid payloads, and retained audit redaction for raw device tokens and
  token hashes.
- Local unit coverage now includes the opt-in offline device pairing permission
  callback adapter, proving parser-backed request validation, injected
  manager/pairing authorization, missing-authorizer denial, authorizer
  rejection, permission factory attachment, planner readiness metadata, and
  secret-free audit payloads.
- Local unit coverage now includes offline route handler-readiness enforcement,
  proving controller callbacks require explicit injected handlers before route
  plans can mark them ready and the guarded registrar will not register a
  future-enabled route backed only by default disabled controller methods.
- Local unit coverage now includes pairing-only offline permission factory
  setup, proving staged pairing callbacks can be attached without a
  registered-device resolver while pull/push permission callbacks stay locked
  until that resolver is supplied.
- Local unit coverage now includes pairing permission authorizer-readiness
  checks, proving unconfigured pairing adapters deny directly and are not
  attached as route-ready permission callbacks by the factory or planner.
- Local unit coverage now includes staged pairing route readiness planning,
  proving missing handler/permission dependencies stay blocked, configured
  staged dependencies report ready-but-gated, and unconfigured authorizers keep
  permission readiness locked.
- Local unit and WordPress smoke coverage now include staged pairing route
  readiness status presentation in health/admin surfaces, proving the default
  remains blocked, handlerless, permission-locked, and deferred.
- Local unit coverage now includes plan-only offline device pairing
  authorization for matching hashed pairing-code policy, denied
  manager/location/scope/expiry policies, missing configuration, injection into
  the staged pairing permission callback, and audit payloads without raw
  pairing-code or full-hash leakage.
- Local unit coverage now includes hash-only offline pairing authorization
  settings, proving SHA-256 hashes, manager/location allowlists, mode scopes,
  UTC expiry windows, partial updates, and raw pairing-code omission are
  handled deterministically.
- Local unit coverage now includes the settings-backed pairing authorizer
  factory, proving sanitized settings can authorize staged callbacks, raw-code
  only settings fail closed, and settings provider failures do not leak secrets.
- Local unit coverage now includes offline pairing policy readiness reporting,
  proving complete settings can produce staged permission callbacks while
  incomplete settings keep pairing permissions locked.
- Local unit coverage now includes staged registration route-handler factory
  assembly, proving configured database and hash-only pairing policy
  dependencies can make the controller callback ready without registering the
  route, and missing providers or incomplete policies fail closed.
- Local unit and WordPress smoke coverage now include registered-device
  permission resolver readiness, proving database-backed resolver assembly,
  provider failure fail-closed behavior, health/admin readiness summaries, and
  pull/push permission callback planning while controller callbacks and live
  route registration remain disabled.
- Local unit and WordPress smoke coverage now include registered-device sync
  route handler readiness, proving parser-only pull/push controller handlers
  validate requests, keep writes deferred, and remain unregistered by route
  gates.
- Local unit coverage now includes registration service pairing-authorization
  enforcement, proving authorized pairing can proceed and denied pairing stops
  before credential issuance or repository writes.
- Local unit coverage now includes staged registration route-handler pairing
  authorization responses, proving denied pairing returns 403 through the
  controller boundary, skips credential/repository paths, and omits raw pairing
  codes from response and audit payloads.
- Local unit coverage now includes offline device access policy checks for
  active allowed devices, revoked/inactive/expired devices, required and
  unsupported scopes, supported modes/scopes, location IDs, and UTC timestamp
  validation.
- Local unit coverage now includes offline device bearer-token authentication
  planning for valid tokens, normalized WordPress header arrays,
  missing/malformed tokens, invalid stored hashes, wrong tokens, missing
  persisted device IDs, revocation, denied scopes, and secret-free accepted
  contexts.
- Local unit coverage now includes offline device token lookup planning for
  hashed lookup filters, token fingerprints, normalized WordPress header arrays,
  missing/malformed/short tokens, and audit payloads without raw token or full
  token hash leakage.
- Local unit coverage now includes offline device session planning for
  last-seen update rows, session context, row-version increments, audit
  payloads, string database IDs, denied decisions, mismatched device rows,
  invalid timestamps, invalid device IDs, and invalid row versions.
- Local unit coverage now includes offline registered-device permission
  planning for lookup-required states, authorized loaded devices, session
  update planning, malformed tokens, denied scopes, invalid session rows, and
  secret-free audit payloads.
- Local unit coverage now includes offline registered-device row normalization
  for raw database identity fields, decoded scopes/capabilities, UTC timestamp
  normalization, explicit null date overrides, invalid JSON shapes, invalid
  identity/hash fields, and secret-free audit payloads.
- Local unit coverage now includes offline registered-device lookup-query
  planning for selected columns, token-hash filters, active/revocation/expiry
  query constraints, lock intent, deferred scope checks, invalid token lookup
  plans, unsupported scopes, invalid server times, and secret-free audits.
- Local unit coverage now includes offline registered-device permission
  lookup-query integration for lookup-required query args, invalid scope/time
  query rejection, loaded-row authorization without query args, and permission
  audit summaries without token-hash leakage.
- Local unit coverage now includes offline registered-device lookup query
  building for prepared SQL templates, safe table-prefix validation,
  UTC-to-MySQL expiry arguments, tampered query contracts, invalid lookup
  plans, and query audits without token-hash leakage.
- Local unit coverage now includes offline registered-device repository
  adaptation for prepared `$wpdb` lookup execution, found/not-found outcomes,
  invalid query plan rejection before database access, malformed-row rejection,
  row normalization, and redacted query/normalization audits.
- Local unit coverage now includes offline registered-device permission
  resolution for invalid tokens before repository access, repository-backed
  authorization, not-found denials, malformed-row rejection, denied scopes,
  session update planning, and audit redaction.
- Local unit coverage now includes offline device session update query building
  for prepared last-seen update SQL templates, safe table prefixes, invalid
  session rows, string row versions, optimistic row-version guards, and
  secret-free audits.
- Local unit coverage now includes offline device session update repository
  adaptation for prepared `$wpdb` update execution, stale optimistic
  row-version results, invalid plan rejection before database access, failed
  database updates, unexpected row counts, and redacted repository audits.
- Local unit coverage now includes opt-in registered-device permission
  resolution session update application for applied updates, stale update
  denial, failed update denial, denied-device skip behavior, and redacted
  session update audits.
- Local unit coverage now includes the planned registered-device permission
  callback adapter for WordPress-style header extraction, boolean callback
  invocation, stale update denial, missing-header denial before database access,
  get-header style requests, plan-only resolver compatibility, and redacted
  last-resolution audits.
- Local unit coverage now includes offline route bootstrap status presentation
  for blocked default state, gated feature-enabled state, ready future route
  plans, deferred registration state, and admin summary output.
- Local unit coverage now includes offline route bootstrapper execution for
  disabled feature-gate deferral, gated current route plans, future-ready
  registrar execution, and feature-blocked future-ready plans.
- WordPress integration smoke coverage now asserts offline pull/push routes
  remain unregistered, the offline route bootstrapper hook is registered on
  `rest_api_init`, and authenticated health reports blocked/deferred offline
  route bootstrap status by default.
- Local unit coverage now includes offline conflict list and resolution request
  validation for statuses, entity types, cursors, page-size bounds,
  include-resolved filters, idempotent resolution IDs, manager IDs, resolution
  actions, notes, expected conflict versions, UTC timestamps, adjustment
  payloads, and schema version gating.
- Local unit coverage now includes offline conflict list response presentation
  for empty responses, filters, cursors, normalized conflict rows, severity, row
  versions, payload objects, duplicate action cleanup, and invalid response
  contract inputs.
- Local unit coverage now includes offline conflict resolution planning for
  row updates, response payloads, redacted audit hashes, stale row versions,
  terminal conflicts, unavailable actions, invalid current rows, and invalid
  server timestamps.
- Local unit coverage now includes offline push operation resolution planning
  for accepted inventory/event/credit outcomes, sold-inventory conflicts,
  event waitlisting, cached-limit rejection, overspend conflicts, revoked
  devices, and invalid server timestamps.
- Local unit coverage now includes offline push batch resolution planning for
  mixed accepted/conflict batches, response counts, operation result rows,
  conflict row enrichment, per-operation runtime options, missing snapshots,
  invalid options, and invalid server timestamps.
- Root automation now includes POS/payment reconciliation and
  transaction-ingestion policy tests for sandbox payment responses, provider
  event idempotency, duplicate-event replay, scan-gated sales, declined
  payments, unmapped line conflicts, refunds to pending review, and
  configurable fee estimates without hardcoded live rates.
- Local unit and WordPress smoke coverage now include POS/payment schema
  migration `0009`, idempotency indexes, masked provider payload fields,
  fee snapshot effective dates, dbDelta compatibility, and rollback order.
- Local unit coverage now includes POS/payment log payload planning for
  redacted provider operation rows, per-line POS sync rows, conflict/replay
  summaries, deterministic idempotency keys, missing-field failures, and audit
  metadata.
- Local unit coverage now includes POS/payment log SQL-template planning for
  accepted sale templates, conflict summary templates, prepare-argument counts,
  table-prefix validation, row tamper rejection, failed source plans, JSON
  validation, timestamp validation, and idempotency key validation.
- Local unit coverage now includes POS/payment log repository staging and
  execution-gate metadata for accepted staged plans, empty valid plans, invalid
  query-plan rejection, default blocked gates, explicitly ready gates, no-query
  blocking, and failed staging rejection.
- Local unit coverage now includes POS/payment transaction preflight metadata
  for inherited execution-gate blocks, explicitly ready supported inserts,
  unsupported query-kind blocking, idempotency keys, zero affected rows, and
  rejected repository staging.
- Local unit coverage now includes explicit POS/payment log execution
  repository behavior for successful prepared inserts, blocked preflight
  rejection, invalid query-plan rejection, table-prefix mismatch rejection,
  failed payment inserts, partial affected-row counts, and deferred
  route/provider-capture flags.
- Local unit coverage now includes staged POS/payment transaction execution for
  successful commit, blocked preflight rejection before transaction start,
  transaction begin failure rejection, repository failure rollback, commit
  failure rollback, repository affected-row audit data, and deferred
  route/provider-capture flags.
- Local unit coverage now includes planned POS/payment route contracts for
  disabled-by-default webhooks, event ingestion/status, reconciliation,
  conflict review/resolution, fee snapshots, permissions, workflow labels, and
  route/provider/capture deferral metadata.
- Local unit and WordPress smoke coverage now include POS/payment route
  bootstrapper wiring for disabled feature-gate deferral, gated current route
  plans, future-ready registrar execution, feature-blocked future-ready plans,
  and the `rest_api_init` hook while default POS/payment REST routes remain
  unregistered.
- Local unit and WordPress smoke coverage now include POS/payment route
  dependency status for controller handlers, permission callbacks, webhook
  verifier, registrar/bootstrapper readiness, injected handler dispatch, and
  default route/write deferral.
- Local unit coverage now includes parser-only POS/payment route validation
  handlers for transaction plan ingestion, provider webhooks, event status,
  reconciliation runs, conflicts, and fee snapshots while writes/capture remain
  deferred.
- Local unit coverage now proves dependency-backed POS/payment bootstrap can
  register a future explicitly enabled read route in tests while default route
  contracts still register zero routes.
- Local unit coverage now includes POS/payment fee snapshot query planning for
  normalized provider, channel, currency, effective-date, and page-size
  filters, rejected tampered inputs, and parser-only route metadata while read
  execution remains deferred.
- Local unit coverage now includes POS/payment fee snapshot SQL-template
  planning for filtered and unfiltered staged reads, prepare-argument counts,
  invalid source plans, and tampered table/column/order guards while
  repository execution remains deferred.
- Local unit coverage now includes POS/payment fee snapshot repository
  adaptation for prepared `$wpdb` reads, normalized fee rows, invalid plan
  rejection before reads, table-prefix mismatch rejection, database failure
  auditing, and malformed row rejection while route-connected reads remain
  deferred.
- Local unit coverage now includes POS/payment fee snapshot repository
  readiness metadata, proving an injected repository adapter is reported in
  parser-only route/dependency status but is not called from default route
  validation.
- Local unit coverage now includes an explicit staged POS/payment fee snapshot
  route handler for repository-backed reads, invalid query rejection before
  repository calls, and repository failure rejection.
- Local unit coverage now includes staged POS/payment fee snapshot route
  handler factory composition for default read deferral, explicitly enabled
  repository-backed reads, dependency issue reporting, dependency-factory
  injection, and admin status metadata.
- Local unit coverage now includes POS/payment route-connected read deferral
  gates in route registration, readiness, bootstrap, dependency factory, and
  registrar flows, proving future GET routes cannot register until read
  execution is explicitly cleared.
- Local unit coverage now includes POS/payment dependency health/admin status
  assertions for route-connected read deferral and read-ready state.
- Local unit coverage now includes Square inventory projection planning for
  visible available serialized cards, zero-count unavailable mapped cards,
  hidden/unmapped skip behavior, required scan identity/price/location
  validation, existing Square ID handling, and explicit network/payment
  deferrals.
- Local unit coverage now includes ScryDex sync page processor planning for
  normalized reference rows, price rows, invalid-card errors, checkpoint
  advancement, and retryable provider failures.
- Local unit coverage now includes ScryDex persistence planning for
  deterministic reference-card inserts, changed-row updates, unchanged-row
  detection, price observations, and failed page plan guards.
- Local unit coverage now includes ScryDex persistence query building and
  repository staging for SQL templates, prepare-argument counts, checkpoint
  upserts, deferred execution audit rows, and invalid-plan rejection.
- Local unit coverage now includes ScryDex persistence readiness health/gate
  wiring for empty-page repository probes, derived gate state, and retained
  database-write deferrals.
- Local unit coverage now includes ScryDex cards worker orchestration planning
  for full mock page staging, retryable provider failures, credential
  redaction, injected-result requirements, and retained deferrals.
- Local unit coverage now includes inventory search SQL-template planning for
  public/staff/hidden card listings, prepared `SELECT` and `COUNT` templates,
  scan-column filters, pagination arguments, and tamper rejection.
- Local unit coverage now includes the explicit inventory search repository
  adapter for prepared `$wpdb` reads, selected row normalization, count
  loading, invalid-plan short-circuiting, table-prefix mismatch rejection,
  database failure handling, malformed-row rejection, and audit metadata.
- Local unit coverage now includes staged inventory search route handler and
  factory composition for public redaction, staff fields, invalid query
  short-circuiting, repository failure rejection, default read deferral,
  explicitly enabled repository-backed reads, provider failures, and table
  prefix issues.
- Local unit coverage now includes WooCommerce product projection planning for
  exact serialized inventory rows, covering available visible product
  create/update payloads, mapped unavailable stockout updates, hidden/unmapped
  skips, scan identity and price validation, store-currency mismatch blocking,
  single-quantity enforcement, serialized metadata, and deferred WooCommerce
  write metadata.
- Local unit coverage now includes guarded WooCommerce product projection
  execution, covering default execution lockout, skipped/failed projection
  handling, explicit staging writer execution, writer failure rejection, and
  audit-safe deferral metadata.
- WordPress integration staging smoke coverage now asserts staged inventory
  create responses expose WooCommerce product and Square inventory projection
  contracts while keeping external writes and network calls deferred.
- Local unit coverage now includes guarded Square inventory projection
  execution, covering default network-write lockout, skipped/failed projection
  handling, explicit catalog/inventory writer execution, writer failure
  rejection, and payment-capture authority delegation through the official
  WooCommerce Square extension.
- Shared POS validation now includes Square payment delegation coverage,
  proving plugin payment capture, refund execution, and custom gateway capture
  remain disallowed while inventory sync and reconciliation stay permitted.
- Local WordPress unit coverage now includes the reusable Square payment
  delegation policy plus POS/payment readiness, POS/payment dependency,
  Square projection, and inventory workspace assertions proving admin/health
  surfaces show that payment capture/refunds/custom gateway behavior belong to
  the official WooCommerce Square extension.
- Root automation now includes the API-client Square inventory adapter
  executable test, covering sandbox Catalog/Inventory request planning,
  production/live credential rejection, idempotency/external ID preservation,
  reconciliation-only Square POS line mapping, and unmapped-line staff
  conflicts.
- Local WordPress unit coverage now includes the PHP Square inventory sync
  request planner, covering sandbox Catalog/Inventory envelope planning,
  skipped/failed projections, zero-count mapped inventory changes, external ID
  extraction, official Square payment delegation metadata, production-declared
  credential rejection, and deferred network/provider writes.
- Local WordPress unit coverage now includes Square sync request planner
  wiring through projection execution, inventory dependency health/admin
  summaries, and the Inventory workspace, including production-context
  rejection before writer callbacks can run.
- WordPress integration coverage now includes a non-production inventory search
  benchmark fixture that seeds 50,000 deterministic disposable rows, runs
  public visible search, staff deep pagination, and staff barcode lookup
  through the staged search handler, and emits timing baselines for target
  staging review.

## Required Test Backlog

The following areas must graduate from scaffold docs to automated tests as the
corresponding modules are implemented:

- WordPress REST permission, nonce, request/response, and write-flow integration
  tests.
- Live database migration integration tests for `dbDelta`, transactional
  execution, schema option writes, rollback, and restore drills.
- Pricing engine tests.
- Reservation database integration, concurrent double-sell prevention tests,
  Action Scheduler cleanup workers, and WooCommerce cart timer integration.
- Customer credit ledger database integration and replay tests.
- Manager override REST/checkout integration and live database replay tests.
- ScryDex database write workers, scheduled worker, image download,
  usage-budget, and webhook integration tests.
- External tournament-provider registration worker tests are deferred.
- WooCommerce add-to-cart, checkout, payment, order-line, cart release, and
  refund hook integration tests.
- Playwright admin, kiosk, search, cart, event registration, and customer
  credit flows.
- Offline app SQLite queue, WordPress push/pull, registered-device permission
  callback wiring, device last-seen database writes, live conflict reads/writes,
  conflict audit persistence, device auth, and full reconnect integration
  tests.
- Live POS/payment sandbox contract tests, Square catalog/inventory sandbox
  projection tests, WooCommerce gateway lifecycle tests, and provider webhook
  reconciliation tests.

## Critical Business Tests

### Pricing

- Suggested price equals market plus 10 percent with configured rounding.
- Missing minimum price blocks intake.
- Automated price never drops below minimum.
- Price lock prevents change.
- Floor hit and every price change are logged.
- Below-minimum sale requires valid manager approval.
- Mismatched currency does not drive automatic pricing.

### Reservation And WooCommerce

- Exact item reservation is atomic.
- Two parallel carts cannot reserve one item.
- Expiry and manual release restore availability.
- Order-line metadata snapshots preserve exact inventory, reservation, owner,
  price, expiry, and card descriptor identity.
- Order lifecycle planning maps checkout, paid, failed/cancelled, and refunded
  order events to the correct reservation/inventory target states.
- Payment completion converts once, including replay.
- Failed/cancelled payment releases according to policy.
- Refund moves item to configured review/return state.
- Cart/Checkout Blocks and classic checkout behave consistently.

### Inventory

- Barcode/SKU uniqueness.
- Raw/graded validation.
- Location moves and audit.
- Valid status transitions.
- Bulk intake creates distinct serialized rows.

### Credit

- Customer credit schema includes customers, contacts, immutable ledger, merge
  log, and note tables.
- Entry types map to expected positive, negative, or either signs.
- Manual adjustments, corrections, voids, and transfers require manager
  approval.
- Posting preview records signed amount and before/after balances with
  four-decimal precision.
- Ledger sum equals cached balance.
- Duplicate idempotency key posts once.
- Concurrent redemption cannot overspend.
- Manager approval for adjustment/void/merge.
- Offline conflict cannot create silent negative balance.

### Buylist

- Buylist schema includes submissions, items, offers, manager approvals, and
  conversion logs.
- Submission status transitions only follow the approved intake/review/offer/
  acceptance/payout/conversion flow.
- Terminal rejected, expired, completed, and cancelled submissions do not
  reopen without a documented manager workflow.
- Accepted items convert to pending inventory idempotently.
- Credit payouts post once through the customer credit ledger.
- Manager approval is required for configured high-value or exception offers.

### Sync

- Page/cursor checkpoint and resume.
- Duplicate prevention.
- Usage/rate-limit handling.
- Raw payload credential masking.
- Webhook raw-body signature and replay protection.
- Image content/size/path validation.
- Daily job schedules correctly across both DST transitions.

### Events

- Local free/pay-at-store event registration route validation, idempotency, and
  waitlist policy.
- Waitlist promotion and check-in.
- External tournament-provider queues remain disabled unless the scope is
  reopened in a future phase.

### Security

- Every route rejects missing/incorrect capability.
- Kiosk cannot access private/admin data.
- Revoked device token fails.
- API keys never appear in logs/responses.
- Upload/SSRF defenses.
- Webhook signature, timestamp, and duplicate event tests.

## Concurrency Tests

Run true parallel database processes for:

- Two reservations for one inventory item.
- POS sale versus website checkout.
- Two credit redemptions.
- Two final event seats.
- Repricing versus staff manual price lock.

Mock-only concurrency tests are insufficient.

## Performance Targets

Targets are established during Phase 2 on target-like hosting:

- Search p95 for 50,000 inventory rows plus representative reference data.
- Exact reservation transaction p95.
- Admin inventory pagination and filter p95.
- Full pull throughput within provider credits and host limits.
- Offline local search p95 on target Windows hardware.

Numbers are not invented in Phase 0; benchmark baselines determine acceptable
budgets before production sign-off.

## Migration And Recovery

Every migration test covers clean install, upgrade from prior released version,
idempotent rerun, and rollback where practical. Backup restore drills verify
inventory, credit, orders, images, and device resync.
