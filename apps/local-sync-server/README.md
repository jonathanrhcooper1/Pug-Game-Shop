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
- The production CLI removes the canned reference-card seed rows unless
  `LOCAL_SYNC_ALLOW_DEMO_REFERENCE_CARDS=true`, so live lookups prefer the
  WordPress catalog.

```sh
npm --prefix apps/local-sync-server run start
npm --prefix apps/local-sync-server run test
```

Default URL: `http://127.0.0.1:8787`

Default manager PIN: `1420`

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
- Never capture Square payments; only support Square POS handoff metadata.
