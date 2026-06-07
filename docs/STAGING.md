# Staging

## Target

Use a GoDaddy Managed WordPress staging site when available. Deploy the
`develop` branch to staging after pull-request checks pass and review is
complete.

## Isolation Rules

- Staging uses its own database.
- Staging never shares production customer credit, payment, inventory, event,
  or POS tables.
- Staging uses test and sandbox API keys only.
- Staging blocks public indexing.
- Staging disables real customer emails.
- Staging disables real payment capture.
- Staging disables real POS inventory changes unless explicitly enabled for a
  controlled sandbox test.
- Staging displays a visible `STAGING` banner to staff and admin users.
- Staging banner color, company name, support URL, logo URL, receipt footer,
  and theme colors come from staging branding settings rather than production
  hardcoded values.

## Environment Flags

Set these constants or environment variables in staging:

```php
define( 'WP_ENVIRONMENT_TYPE', 'staging' );
define( 'TCG_STORE_PLATFORM_ENVIRONMENT', 'staging' );
define( 'TCG_STORE_PLATFORM_STAGING_BANNER', true );
define( 'TCG_STORE_PLATFORM_DISABLE_REAL_EMAILS', true );
define( 'TCG_STORE_PLATFORM_DISABLE_REAL_PAYMENTS', true );
define( 'TCG_STORE_PLATFORM_DISABLE_REAL_POS_WRITES', true );
```

## Staging Plugin Support

WP STAGING or a similar staging clone plugin may be used as an optional backup
or clone workflow. It must not be the only development automation path.

Before major database migrations:

1. Create a GoDaddy backup, WP STAGING clone, or equivalent verified backup.
2. Confirm the backup includes the database and `wp-content`.
3. Run migration checks on staging.
4. Record the backup reference in `REVISION_LOG.md` or the release notes.

## Staging Smoke Checks

- Plugin activates cleanly.
- System status reports expected plugin and database versions.
- System status and authenticated health report blocked offline route bootstrap
  by default, with `registration_deferred = true`, the bootstrapper hook
  registered, and offline pull/push routes still unregistered.
- Staged offline pull handler returns a contract-shaped response in local or
  staging tests while live pull queries and cursor advancement remain disabled.
- WooCommerce checkout test order completes in sandbox mode.
- ScryDex mock or sandbox sync completes.
- TopDeck mock or sandbox sync completes.
- Kiosk/offline sync queue test completes.
- POS/payment sandbox response is handled.
- Customer credit ledger replay matches cached balance.
- Event registration flow works for local and TopDeck-linked events.
