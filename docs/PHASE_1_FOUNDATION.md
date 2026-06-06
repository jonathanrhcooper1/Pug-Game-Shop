# Phase 1 Foundation

## Status

Implementation complete; target WordPress/WooCommerce integration acceptance is
pending a staging environment.

## Delivered

- Plugin header, bootstrap, custom autoloader, activation, deactivation, and
  conservative uninstall.
- Dependency health for PHP, WordPress, WooCommerce, and Action Scheduler.
- Migration `0001` with:
  - `tcg_schema_migrations`
  - `tcg_settings`
  - `tcg_role_permissions`
  - `tcg_audit_log`
- Reversible migration runner with schema version tracking.
- Staff, manager, kiosk, and system roles plus administrator/shop-manager
  capabilities.
- Kiosk wp-admin blocking.
- Settings and feature-flag screens.
- Structured logging and recursive secret redaction.
- Audit append service.
- Daylight-saving-safe one-shot 9:00 AM Eastern scheduler.
- Authenticated REST health endpoint.
- Admin dashboard and system status.
- GitHub PHP matrix CI.
- Dependency-free local syntax and unit tests.

## Verification Performed

On PHP 8.2.29:

- Composer metadata and lockfile validation passed.
- The locked development dependencies had no published security advisories.
- 37 PHP files passed syntax checks.
- 16 unit tests passed.
- The plugin bootstrap smoke test passed.
- WordPress Core and PHP 8.1+ compatibility standards passed with no violations.
- All plugin files passed the ASCII check.

Tests cover permissions, feature gating, migration SQL shape and rollback order,
secret redaction, immutable daily settings, and 2026 spring/fall DST behavior.

## Integration Acceptance Still Required

The Phase 1 roadmap exit gate is not fully closed until a target-like staging
site verifies:

1. Clean activation creates all four tables.
2. Deactivation retains data and removes scheduled actions.
3. Re-activation is idempotent.
4. Controlled rollback/uninstall behaves according to the deletion setting.
5. Roles and Settings API forms work on the target WordPress version.
6. The authenticated health endpoint rejects unauthorized users.
7. WooCommerce's Action Scheduler records the next 9:00 AM Eastern action.
8. Multisite activation is tested if multisite will be used.
9. HPOS remains pending until the Phase 4 order lifecycle suite passes.

## External Contracts Used

- WordPress activation hooks and `dbDelta`.
- WordPress Settings API, roles/capabilities, and REST routes.
- Action Scheduler single-action API after `action_scheduler_init`.
- WooCommerce `FeaturesUtil::declare_compatibility`.

These contracts were checked against official documentation on June 6, 2026.

- https://developer.wordpress.org/plugins/plugin-basics/activation-deactivation-hooks/
- https://developer.wordpress.org/plugins/creating-tables-with-plugins/
- https://developer.wordpress.org/plugins/settings/settings-api/
- https://developer.wordpress.org/plugins/users/roles-and-capabilities/
- https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/
- https://actionscheduler.org/api/
- https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book/
