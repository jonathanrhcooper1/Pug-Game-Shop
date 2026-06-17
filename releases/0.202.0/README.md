# The Pug Production Release 0.202.0

This folder contains the complete installable production package for The Pug.

## Artifact

- `the-pug-production-release-0.202.0.zip`

## Included In The ZIP

- WordPress/WooCommerce plugin: `tcg-store-platform-0.202.0.zip`
- WordPress theme: `pug-arcade-commerce-v2-0.202.0.zip`
- LAN middleman server: `pug-local-sync-middleman-server.zip`
- Employee app installer package
- Customer kiosk installer package
- App install manifests and first-read instructions

## Install Order

1. Install/verify the WordPress plugin ZIP on production.
2. Install/verify the `pug-arcade-commerce-v2` theme ZIP on production.
3. Install and start the LAN middleman server on the in-store host machine.
4. Install the employee app on staff stations.
5. Install the customer kiosk app on customer-facing stations.

## Verification

Verify the package checksum with `SHA256SUMS.txt` before installing.

Run `npm.cmd run production:verify-active-syncs` before final signoff.
