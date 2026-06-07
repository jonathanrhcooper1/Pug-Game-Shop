# Deployment

## Production Rule

Production deployment requires manual approval. Codex must not automatically
deploy production.

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
