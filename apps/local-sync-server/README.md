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

The current code is a contract scaffold. Runtime HTTP handlers and SQLite
persistence will be added behind this contract.
