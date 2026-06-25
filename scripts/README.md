# Scripts

Reserved for reproducible build, release, deployment, backup-verification, and
fixture-generation scripts.

## Staging

- `npm run staging:route-check` checks the public staging REST root,
  `tcg-store/v1` namespace, authenticated health route registration signal,
  public offline connector manifest, and noindex controls without credentials
  or data mutation.
- `npm run staging:configure-scrydex` stores staging ScryDex credentials in
  WordPress settings through a temporary stdin-fed WP-CLI runner and prints only
  redacted readiness output.
- `npm run staging:configure-offline-pairing` stores staging offline connector
  pairing policy through a temporary stdin-fed WP-CLI runner, prints only
  redacted policy/route status, and keeps pull/push/conflict sync routes closed
  by default.
- `npm run staging:install-package` uploads the runtime plugin zip and installs
  it on staging with WP-CLI `plugin install --force --activate`, then verifies
  `tcg-store-platform` is active. Use this when a package must become visible
  as the active **Pug Game Shop Card Manager** plugin in WP Admin.
- `npm run staging:offline-pairing-smoke` temporarily enables only the staging
  pairing gate, posts a generated pairing request to the public REST route,
  verifies one-time credential issuance without printing tokens, removes the
  smoke device row, and restores the previous staging gates.
- `npm run staging:offline-sync-smoke` temporarily enables staging pairing,
  pull, and push gates, registers a smoke device, exercises public pull/push
  routes, cleans temporary sync rows, restores previous gates, and keeps
  canonical inventory, Square, payment, POS, ScryDex, and production writes
  deferred.

## Production

- `npm run production:install-package` installs the packaged WordPress plugin
  on an explicitly confirmed production site after creating a database backup
  and, by default, a `wp-content` tarball backup.
- `npm run production:configure-scrydex` stores production ScryDex settings via
  a temporary stdin-fed WP-CLI runner and prints only redacted readiness.
- `npm run production:run-scrydex-index` creates a production database backup
  and runs bounded authenticated catalog import rounds against the WordPress
  ScryDex catalog endpoint.

Production scripts read secrets from process environment variables or the
ignored `.env.production.local` file. They must not be run from CI.

## Inventory Imports

- `npm run inventory:prepare-pug-grading-singles -- --input <square-catalog.csv>`
  reads a Square catalog export, keeps only rows marked as MTG/Pokemon singles,
  excludes graded rows, and writes a normalized CSV under `dist/imports/` with
  the import category set to `Pug Grading Singles`. Rows with Square `variable`
  pricing are preserved with `price_source=scrydex_required` so they can be
  priced from the ScryDex/reference cache before publishing.
- `npm run inventory:import-square-catalog-local -- --input <square-catalog.csv> --pin <local-pin>`
  performs a dry run against a Square catalog export and writes a JSON summary
  under `dist/imports/`. Add `--execute` to post the planned rows into the
  local sync server through `/inventory/intake`. Quantity is read from column
  AH, `Current Quantity The PUG`; MTG Singles, Pokemon, and One Piece card rows
  are included, One Piece supplies/events are skipped, Square item/variation IDs
  are preserved, and Square `variable` price rows are imported hidden with a
  ScryDex-required price source until repriced.
