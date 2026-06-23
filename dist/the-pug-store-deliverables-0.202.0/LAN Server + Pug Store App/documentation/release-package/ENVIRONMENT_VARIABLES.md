# Environment Variables

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Environment and settings reference with placeholders only.
Audience: Administrator, support technician, developer
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Variables

| Variable / Setting | Purpose | Required | Environment | Default if missing |
| --- | --- | --- | --- | --- |
| SCRYDEX_API_KEY | Primary ScryDex provider key. | Required for live provider sync. | Production/staging/local. | Provider sync blocked. |
| SCRYDEX_SECONDARY_API_KEY | Secondary ScryDex key. | Optional. | Production/staging/local. | Primary only. |
| SCRYDEX_TEAM_ID | ScryDex team/account id. | Required for ScryDex. | Production/staging/local. | Provider sync blocked. |
| TOPDECK_API_KEY | External event provider key. | Optional where configured. | Production/sandbox. | TopDeck sync disabled. |
| PUG_WORDPRESS_URL | Website URL for local middleman. | Required for local sync. | Local server. | WordPress connector disabled. |
| PUG_WORDPRESS_USERNAME | WordPress app user. | Optional/required for authenticated pushes. | Local server. | Write/pull auth disabled. |
| PUG_WORDPRESS_APP_PASSWORD | WordPress app password. | Optional/required for authenticated pushes. | Local server. | Write/pull auth disabled. |
| LOCAL_SYNC_WORDPRESS_PUSH_ENABLED | Allows local server to push writes. | Required for live push. | Local server. | false. |
| PUG_SQUARE_ACCESS_TOKEN | Square connector token. | Optional where Square Terminal is used. | Local server. | Square reader handoff disabled. |
| PUG_SQUARE_LOCATION_ID | Square location. | Optional where Square is used. | Local server. | Square connector incomplete. |
| PUG_SQUARE_TERMINAL_DEVICE_ID | Square reader device id. | Optional where Terminal is used. | Local server. | Manual receipt flow only. |
| SMTP_HOST / SMTP_USER / SMTP_PASSWORD | Email transport. | Required for reliable email. | WordPress/hosting. | WordPress host mail fallback. |
| PAYMENT_MODE | Payment mode marker. | Required by some integrations. | Gateway/local. | Provider default. |
| APP_ENV | Environment marker. | Recommended. | All. | production or local defaults by component. |

## Example Files

- `/.env.example` documents repository-level placeholders.
- `/apps/local-sync-server/.env.example` documents LAN middleman placeholders.
- `/release-package/env/production.env.example` is a client-safe production placeholder template.
- `/release-package/env/local-sync.env.example` is a client-safe local server placeholder template.
- `/release-package/env/offline-app.env.example` is a client-safe app placeholder template.
