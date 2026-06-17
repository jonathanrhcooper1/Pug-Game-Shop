# Local Sync Server

The local sync server is the in-store LAN middleman for employee apps and kiosk
clients.

WordPress/WooCommerce remains the global source of truth. The local sync server
holds the shared LAN cache, local reservation locks, and offline operation queue
when the internet is unavailable. Employee and kiosk apps connect to this server
instead of each keeping an isolated local authority.

## Runtime

- Requires Node 22.13+ or the current Node 24 line so `node:sqlite` is
  available without an extra native npm dependency.
- `npm start` starts the local HTTP server on `127.0.0.1:8787` by default.
- Configuration is read from process env plus optional ignored local files:
  repository `.env.local-sync`, app `.env.local`, then repository `.env.local`.
- Set `LOCAL_SYNC_SQLITE_PATH` or `PUG_LOCAL_SYNC_DB` to choose the durable
  SQLite database location. If omitted, the server writes
  `apps/local-sync-server/store-sync.sqlite`.
- Set `PUG_WORDPRESS_URL=https://your-site.example` to enable website catalog
  fallback for missing ScryDex/reference card lookups.
- Set `PUG_WORDPRESS_USERNAME` and `PUG_WORDPRESS_APP_PASSWORD` to use a
  WordPress Application Password server-side. Credentials are never returned to
  clients.
- WordPress writes are disabled unless `LOCAL_SYNC_WORDPRESS_PUSH_ENABLED=true`.
- Set `PUG_WORDPRESS_DEFAULT_LOCATION_ID` to an active WordPress inventory
  location when accepted local intake should become immediately available
  inventory. If omitted, local intake is pushed as `pending_intake`.
- Set `PUG_WORDPRESS_INVENTORY_ONLINE_VISIBILITY`,
  `PUG_WORDPRESS_INVENTORY_KIOSK_VISIBILITY`, and
  `PUG_WORDPRESS_INVENTORY_POS_VISIBILITY` to choose default visibility for
  accepted intake items. Staff can still override visibility per item from the
  local app.
- Set `PUG_SQUARE_ENVIRONMENT=sandbox` and `PUG_SQUARE_LOCATION_ID` to shape
  the manager-only Square POS barcode/SKU inventory-readiness plan. This
  diagnostic never calls Square and never captures payments.
- Optional Square Terminal reader checkout runs only from the LAN server. Set
  `PUG_SQUARE_ACCESS_TOKEN`, `PUG_SQUARE_LOCATION_ID`, and
  `PUG_SQUARE_TERMINAL_DEVICE_ID` in ignored local env to send a checkout to a
  paired reader. Without those values the app stays in manual receipt mode:
  staff complete payment in Square and record the receipt/reference.
- The production CLI removes the canned reference-card seed rows unless
  `LOCAL_SYNC_ALLOW_DEMO_REFERENCE_CARDS=true`, so live lookups prefer the
  WordPress catalog.

```sh
npm --prefix apps/local-sync-server run start
npm --prefix apps/local-sync-server run test
npm run local-sync:smoke
```

Default URL: `http://127.0.0.1:8787`

Default manager PIN: `1420`

## Store Workstation Smoke

After starting the server on the central in-store machine, run this from any
workstation that should reach it:

```sh
set LOCAL_SYNC_SERVER_URL=http://127.0.0.1:8787
set LOCAL_SYNC_EXPECT_WEBSITE_URL=https://j84.285.myftpupload.com
npm run local-sync:smoke
```

Use the central machine's LAN IP in `LOCAL_SYNC_SERVER_URL` when checking another
computer. The smoke reads `/health`, `/setup/status`, and `/devices/status`, then
writes one local smoke heartbeat through `/devices/heartbeat`. It does not mutate
WordPress, call Square, capture payments, print credentials, or print raw
provider responses.

## Responsibilities

- Serve shared cached inventory, customer credit, event, and conflict data.
- Verify 4-digit staff/manager PIN sessions against cached user access policy.
- Store PIN credentials as hashes, not cleartext.
- Prevent local double-sell between employee stations and kiosk devices.
- Track employee and kiosk device heartbeat, setup state, and online/offline
  presence for the LAN.
- Enforce manager approval for user/access changes and store-credit adds.
- Queue inventory, customer, credit, event, and kiosk pickup operations.
- Pull canonical inventory changes from WordPress when online.
- Push local operations to WordPress only when the explicit push guard is on.
- Keep ScryDex credentials on WordPress/server settings, not in clients.
- Serve a manager-only Square POS inventory-readiness plan from cached
  barcode/SKU mappings without making Square network requests.
- Keep customer credit local-store only. Online WooCommerce checkout does not
  redeem this credit; staff record credit use locally with a Square receipt.
- Keep Square credentials server-side. The optional Terminal connector can
  request device activation codes and reader checkouts, but never returns raw
  access tokens to clients.
