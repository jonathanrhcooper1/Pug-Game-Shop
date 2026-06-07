# Phase 2 Inventory And Pricing

## Status

In progress. The first local implementation slice is complete and verified;
staging database acceptance remains pending.

## Delivered

- Migration `0002` for inventory/pricing foundations:
  - `tcg_reference_cards`
  - `tcg_reference_variants`
  - `tcg_inventory_locations`
  - `tcg_inventory_items`
  - `tcg_inventory_movements`
  - `tcg_barcodes`
  - `tcg_price_change_log`
  - `tcg_manager_overrides`
- Reversible drop order for Phase 2 tables.
- Inventory status rules for active, reserved, sold, review, damaged, and
  removed workflows.
- Intake validation for required minimum sale price, raw/graded requirements,
  active item barcode/location, and listed item reference identity.
- Planned inventory/search REST contracts for exact serialized inventory CRUD,
  reservation actions, movement, price lock, bulk intake, import/export,
  public search, reference search, inventory search, and version grouping.
- Dependency-free staff/offline/ScryDex-import intake parser with normalized
  exact-card fields, visibility, pricing floor checks, and deferred
  WooCommerce/label side-effect flags.
- Plan-only intake persistence for staged inventory item creation, including
  schema-aligned insert rows, prepared SQL templates, deterministic public IDs,
  fallback pending-intake barcode/SKU generation, money/timestamp planning, and
  explicit write/projection deferral metadata.
- Explicit inventory intake repository adapter for staged `$wpdb` inserts,
  including invalid-plan short-circuiting, active table-prefix validation,
  insert-count outcome handling, created-item response payloads, and write/
  projection deferral audits.
- Staged inventory intake route handler and factory for explicitly enabled
  `POST /inventory` creation tests, composing parser, persistence planner,
  repository execution, created responses, default route deferral, and
  projection/label-print deferral metadata.
- Gated inventory REST controller, permission callback factory, public-read
  permission adapter, capability permission adapter, registration planner, and
  registrar for future inventory search/create routes while default live
  registration remains disabled.
- Inventory route dependency factory and readiness presenter for composing
  staged search/create handlers, controller dispatch, permission callbacks,
  registration planning, and registrar readiness without enabling live routes.
- Authenticated health and admin System Status reporting for inventory route
  dependency readiness, with WordPress smoke coverage proving inventory search
  and create routes stay unregistered by default.
- Inventory route bootstrap planning, status presentation, dependency-factory
  composition, and WordPress `rest_api_init` hook wiring while route
  registration remains blocked by default.
- Default inventory dependency composition now includes staged search and
  intake handler factories so health/admin diagnostics can report factory and
  database readiness while route execution remains deferred.
- Staff-facing WordPress Inventory admin workspace for route readiness, route
  contract, and next-checkpoint review while live inventory execution remains
  disabled.
- Inventory route runtime settings and contract configuration for staging-only
  staff `/inventory/search` route enablement, with writes, public reads,
  WooCommerce projection, Square projection, and label actions still disabled
  by default.
- Environment-aware `inventory_pricing` feature flag availability for local,
  development, and staging environments while production remains unavailable.
- WordPress integration staging smoke coverage for enabling only the staff
  `/inventory/search` route while writes, public reads, WooCommerce projection,
  Square projection, and POS ingestion stay closed.
- Staff Inventory Workspace search form, route-readiness lockout, and
  REST-backed read-only results panel for the staging staff inventory search
  route.
- Dependency-free inventory search parser with query, game, status, location,
  visibility, sort, and pagination filters.
- Plan-only inventory search query contracts for public, staff, hidden, and all
  inventory views, including public defaults for visible/available cards,
  barcode/SKU search for staff views, and deferred route/database execution.
- Inventory search response presentation with public-safe redaction and
  staff-only operational fields for exact-card handling.
- Inventory search SQL-template planning with allowlisted selected columns,
  validated where/sort contracts, prepared `SELECT` and `COUNT` templates,
  pagination arguments, and deferred repository execution metadata.
- Explicit inventory search repository adapter that executes prepared
  `SELECT` and `COUNT` templates through injected `$wpdb`, validates the active
  table prefix, normalizes row envelopes, rejects database/malformed-row
  failures, and keeps live route registration disabled.
- Staged inventory search route handler and factory for explicitly enabled
  `/inventory/search` reads, composing parser, planner, repository, and
  public/staff response presentation while default route registration remains
  gated.
- Pricing policy helper for market plus 10 percent, currency mismatch blocking,
  price lock blocking, status exclusions, and minimum price floor hits.
- Manager override policy helper for below-minimum sale approval, distinct
  manager requirement, required reason, and override-row persistence signal.

## Verification Performed

On PHP 8.2.29:

- 47 PHP files passed syntax checks.
- 34 unit tests passed.
- The plugin bootstrap smoke test passed.
- A GitHub Actions WordPress integration workflow was added to install
  WordPress, WooCommerce, activate the plugin, and verify schema version `2`,
  expected tables, roles, and REST health output with WP-CLI.

## Acceptance Still Required

1. Clean migration from schema version `1` to `2` on staging.
2. Rollback from schema version `2` to `1` on staging.
3. `dbDelta` compatibility on the target WordPress database configuration.
4. Seeded inventory intake tests using real WordPress database writes.
5. Barcode collision and SKU collision handling through service-layer tests.
6. Pricing change log persistence once inventory write services are added.
7. Manager override persistence and reauthentication tests.
8. Search and pagination benchmarks after the 50,000-item seed fixture exists.
9. Live route registration remains disabled until repository writes, staff
   permissions, rate limiting, and staging smoke tests are complete.
