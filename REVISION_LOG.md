# Revision Log

This log records implementation revisions in a format suitable for pull request
review, staging approval, deployment approval, and rollback planning.

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
