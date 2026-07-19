# Background Jobs

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.2
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Scheduled/background job reference.
Audience: Administrator and support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Jobs

| Job | Schedule/trigger | Purpose | Where to check |
| --- | --- | --- | --- |
| Daily platform dispatch | Scheduled daily, 9:00 AM America/New_York target for reference refresh. | Runs scheduled platform work including ScryDex refresh planning. | Health route and admin dashboard. |
| Reservation expiry | Scheduled/triggered by WooCommerce reservation lifecycle. | Releases stale cart/kiosk holds. | Reservations table and WooCommerce cart/order logs. |
| Manual ScryDex index | Admin initiated. | Full or scoped provider pull by game/set/page. | ScryDex catalog admin and sync logs. |
| Resume failed pull | Admin initiated. | Continues from checkpoint after failure. | Sync checkpoints and errors. |
| Offline queue replay | LAN server reconnect/interval. | Pushes queued local app actions to WordPress. | Local server queue status and WordPress offline queue/conflict tables. |
| Active sync verifier | Release validation command. | Verifies production connector flows before signoff. | Command output and release reports. |
