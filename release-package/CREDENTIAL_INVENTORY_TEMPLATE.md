# Credential Inventory Template

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.1
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Template for tracking required credentials without storing real secret values.
Audience: Owner, administrator, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Inventory Table

| Credential Name | System | Environment | Account/Username | Login URL | Secret Type | Stored In | WordPress Setting / Env Var | Permission Level | Owner | Rotation Date | Notes | Masked Example |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WordPress administrator | WordPress | Production/Staging | WordPress user account | Password manager | N/A | Administrator | Store owner | Pending rotation date | replace_with_secure_value |
| Hosting control panel | GoDaddy Managed WordPress | Production/Staging | Hosting login | Password manager | N/A | Owner/admin | Store owner | Pending rotation date | replace_with_secure_value |
| SSH/SFTP deployment | Hosting | Production/Staging | SSH password or key | Password manager | PUG_PROD_SSH_HOST, PUG_PROD_SSH_USER, PUG_PROD_SSH_PASSWORD | Deploy only | JC Electronics/support | Pending rotation date | replace_with_secure_value |
| Database user | MySQL/MariaDB | Production/Staging | Database password | Hosting vault | DB_NAME, DB_USER, DB_PASSWORD, DB_HOST | Database read/write | Hosting owner | Pending rotation date | replace_with_secure_value |
| WordPress application password | WordPress REST | Production/Staging | Application password | Password manager | PUG_WORDPRESS_USERNAME, PUG_WORDPRESS_APP_PASSWORD | Least privilege app user | Store owner/support | Pending rotation date | replace_with_secure_value |
| ScryDex API key | ScryDex | Production | API key | WordPress settings or local env | SCRYDEX_API_KEY, SCRYDEX_SECONDARY_API_KEY, SCRYDEX_TEAM_ID | Catalog/pricing API | Store owner | Pending rotation date | replace_with_secure_value |
| Square access token | Square | Sandbox/Production | OAuth/token | Password manager and local env | PUG_SQUARE_ACCESS_TOKEN, SQUARE_ACCESS_TOKEN | Payments/POS | Store owner | Pending rotation date | replace_with_secure_value |
| GoDaddy Payments credentials | GoDaddy Payments | Production/Sandbox | Gateway credentials | WooCommerce settings | Gateway settings fields | Payment gateway | Store owner | Pending rotation date | replace_with_secure_value |
| TopDeck API key | TopDeck | Production/Sandbox | API key | Password manager | TOPDECK_API_KEY | Event connector | Store owner | Pending rotation date | replace_with_secure_value |
| SMTP credentials | Email provider | Production | SMTP user/password | Password manager or SMTP plugin | SMTP_HOST, SMTP_USER, SMTP_PASSWORD | Transactional email | Store owner | Pending rotation date | replace_with_secure_value |
| Webhook signing secrets | Square/TopDeck/other webhooks | Production/Sandbox | Signing secret | Password manager | SQUARE_WEBHOOK_SIGNATURE_KEY, TOPDECK_WEBHOOK_SECRET | Webhook verification | Store owner/support | Pending rotation date | replace_with_secure_value |
| Offline app pairing token | Local sync | Local | Pairing code/token | WordPress settings/local vault | PUG_OFFLINE_PAIRING_CODE | Device registration | Store manager | Pending rotation date | replace_with_secure_value |
| Kiosk token | Kiosk | Local | Device token | Local secure storage | KIOSK_DEVICE_TOKEN | Kiosk access | Store manager | Pending rotation date | replace_with_secure_value |
| App signing key | Windows app build | Release | Code signing key | Secure certificate vault | WINDOWS_CERTIFICATE_PASSWORD | Release signing | JC Electronics/support | Pending rotation date | replace_with_secure_value |
