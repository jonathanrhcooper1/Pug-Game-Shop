# Revision Log

This log records implementation revisions in a format suitable for pull request
review, staging approval, deployment approval, and rollback planning.

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
