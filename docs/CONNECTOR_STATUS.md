# Connector Status

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.1
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Connector readiness and ownership reference.
Audience: Owner, administrator, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Connector Matrix

| Connector | Current role | Readiness notes | Owner |
| --- | --- | --- | --- |
| ScryDex | Primary card/set/price/image reference. | Configured server-side; full pulls and resume are checkpointed. | Owner/support |
| WooCommerce | Storefront products/cart/orders/checkout. | Active with plugin hooks for serialized item reservation. | Admin/support |
| Square/POS | Local POS/card reader support where configured. | Terminal connector scaffold and receipt reference flow; live reader validation requires store hardware. | Owner/support |
| GoDaddy Payments | WooCommerce gateway where configured. | Managed through WooCommerce/GoDaddy settings. | Owner/admin |
| TopDeck | Optional event connector. | Documented as optional/gated; create-event support must be verified before use. | Owner/support |
| Email/SMTP | Transactional emails. | WordPress mail path implemented; SMTP provider must be configured for reliable production delivery. | Owner/admin |
| Local sync | App/kiosk bridge. | LAN middleman, queue, discovery, and WordPress bridge included in release package. | Support/manager |
