# Deployment

## Production Rule

Production deployment requires manual approval. Codex must not automatically
deploy production.

The confirmed production helper is available for approved releases:

```text
npm run production:install-package
```

It reads SSH values from environment variables or the ignored
`.env.production.local` file, creates a database backup, optionally backs up
`wp-content`, uploads the packaged plugin zip, runs
`wp plugin install --force --activate`, runs pending plugin migrations, verifies
the ScryDex catalog routes, and prints no credentials.

## Release Flow

1. Merge reviewed feature PRs into `develop`.
2. Deploy `develop` to staging.
3. Run staging automated and manual checks.
4. Prepare release notes and rollback instructions.
5. Request manual production approval.
6. Merge the approved release into `main`.
7. Deploy production manually or through an approved release process.
8. Run post-deploy smoke tests.

## Database Migrations

- Migrations must be versioned.
- Migrations must be reversible where practical.
- Migration rollback notes must be included in `REVISION_LOG.md`.
- Before major database migrations, create a database and `wp-content` backup or
  staging clone.

## Production Deployment Checklist

- Backup database.
- Backup `wp-content`.
- Confirm staging tests pass.
- Confirm payment gateway test.
- Confirm ScryDex sync test.
- Confirm kiosk/offline sync test.
- Confirm WooCommerce checkout.
- Confirm Square/POS adapter behavior.
- Confirm customer credit ledger.
- Confirm event registration.
- Deploy production.
- Run post-deploy smoke tests.

## Production ScryDex Catalog

After an approved production plugin install:

```text
npm run production:configure-scrydex
npm run production:run-scrydex-index
```

The configuration helper stores ScryDex credentials server-side and returns
redacted readiness only. The index helper creates a database backup before
writing catalog rows, refreshes expansion metadata, then calls
`/wp-json/tcg-store/v1/scrydex/catalog/index` in bounded per-set rounds by
default. Increase `SCRYDEX_INDEX_SET_LIMIT`, `SCRYDEX_INDEX_ROUNDS`,
`SCRYDEX_INDEX_MAX_PAGES`, and expansion page controls gradually while
watching usage and catalog counts.

## Rollback Checklist

- Identify the release commit and migration version.
- Confirm the latest database and `wp-content` backups are available.
- Disable new checkout, kiosk, POS, buylist, event, and credit writes if needed.
- Roll back plugin/theme files.
- Roll back reversible migrations where supported.
- Restore backup only when file rollback and reversible migrations are
  insufficient.
- Re-run post-rollback smoke checks.
- Record the rollback in `REVISION_LOG.md`.
