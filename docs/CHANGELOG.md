# Changelog

All notable changes follow Semantic Versioning.

## [0.3.0] - 2026-06-06

### Added

- Phase 2 inventory and pricing schema migration `0002`.
- Reference card/variant, inventory location/item, movement, barcode, price
  change, and manager override table contracts.
- Inventory status transition and intake validation helpers.
- Market-plus-10-percent pricing calculator with minimum-floor, currency,
  status, and price-lock handling.
- Dependency-free unit coverage for Phase 2 schema and business rules.
- GitHub Actions WordPress integration workflow with WP-CLI activation and
  schema/REST/role smoke verification.
- GitHub-first development, staging, deployment, and rollback governance.
- Official `wp-env` local WordPress configuration with development seed and
  mock provider fixtures.
- Pull-request quality gate workflow and required test scaffold manifest.

## [0.2.0] - 2026-06-06

### Added

- Phase 1 WordPress plugin bootstrap and dependency health checks.
- Reversible foundation migration and schema tracking.
- Platform roles, capabilities, settings, feature flags, logging, and audit
  services.
- Daylight-saving-safe Action Scheduler daily dispatch.
- Authenticated REST health endpoint and admin system-status screens.
- Local PHP checks and GitHub CI.

### Security

- Unfinished modules are forced off.
- Kiosk users are blocked from wp-admin.
- Structured logs and audit context redact secrets.
- HPOS compatibility remains explicitly pending until lifecycle tests pass.

## [0.1.0-planning] - 2026-06-06

### Added

- Phase 0 architecture blueprint.
- Source-of-truth and integration boundaries.
- Database, REST, WooCommerce, offline sync, security, provider, UX, and testing
  plans.
- Architecture decisions and phased roadmap.

### Not Added

- No application code.
- No database migrations.
- No production credentials or live data.
