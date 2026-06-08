# Local Sync Server

The local sync server is the in-store middleman for employee apps and kiosk
clients.

WordPress/WooCommerce remains the global source of truth. The local sync server
holds the shared LAN cache, local reservation locks, and offline operation queue
when the internet is unavailable. Employee and kiosk apps connect to this server
instead of each keeping an isolated local authority.

Primary responsibilities:

- Serve shared cached inventory, customer credit, event, and conflict data.
- Verify 4-digit staff/manager PIN sessions against cached user access policy.
- Store PIN credentials as hashes, not cleartext.
- Prevent local double-sell between employee stations and kiosk devices.
- Enforce manager approval for user/access changes and store-credit adds.
- Queue inventory, customer, credit, event, and kiosk pickup operations.
- Push local operations to WordPress and pull canonical changes back.
- Keep ScryDex credentials on WordPress/server settings, not in clients.
- Never capture Square payments; only support Square POS handoff metadata.

Current runtime:

- Requires Node 22.13+ or the current Node 24 line so `node:sqlite` is
  available without an extra native npm dependency.
- `npm start` starts the local HTTP server on `127.0.0.1:8787` by default.
- Set `PUG_LOCAL_SYNC_DB=C:\path\to\store-sync.sqlite` to choose the durable
  SQLite database location. If omitted, the server writes
  `apps/local-sync-server/store-sync.sqlite`.
- Set `PUG_WORDPRESS_URL=https://your-staging-site.example` to enable the
  website catalog fallback for missing ScryDex/reference card lookups. The
  server calls `/wp-json/tcg-store/v1/reference/search`; clients still receive
  only secret-free card data.
- `POST /auth/pin` verifies cached 4-digit PIN users.
- `GET /users/access-policy`, `POST /users`, and
  `PATCH /users/{id}/access` are manager-session protected.
- `GET /inventory/search`, `GET /scrydex/cards/search`,
  `POST /inventory/intake`, `POST /inventory/reservations`, and
  `POST /kiosk/orders` provide the first shared LAN inventory/order surface,
  including local-reference-first ScryDex lookup, `PUG_WORDPRESS_URL` catalog
  fallback on cache miss, and locally queued card intake rows that
  remain pending until WordPress accepts them.
- `GET /customers/search`, `POST /customers`, `POST /credit/adjustments`,
  and `POST /credit/redemptions` provide the first shared LAN customer-credit
  surface with manager approval for credit adds and Square POS handoff metadata
  for credit use.
- `GET /events`, `POST /events/registrations`, and
  `POST /events/check-ins` provide the first shared LAN event registration and
  check-in surface while WordPress remains the final event authority.
- Staff PIN users, access policy changes, local inventory reservation locks,
  local inventory intake rows, kiosk pickup orders, local customers, pending
  credit ledger entries, event snapshots, and operation queue rows persist
  across server restarts.

The current SQLite schema is a development runtime for the LAN middleman. Live
WordPress pull/push workers, richer event registration tables, conflict tables,
and full installer packaging are still upcoming layers.
