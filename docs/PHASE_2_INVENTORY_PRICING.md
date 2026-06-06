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
- Pricing policy helper for market plus 10 percent, currency mismatch blocking,
  price lock blocking, status exclusions, and minimum price floor hits.

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
7. Manager override persistence and below-minimum sale authorization tests.
8. Search and pagination benchmarks after the 50,000-item seed fixture exists.
