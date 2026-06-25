# Security And Permissions Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Security, roles, permissions, credential storage, audit logging, and offboarding guide.
Audience: Owner, administrator, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Role Matrix

| Role | Allowed | Restricted |
| --- | --- | --- |
| Customer | Public storefront, own account views. | Staff screens, reports, credit redemption admin. |
| Kiosk | Inventory browse and kiosk order submit. | Customer private data, reports, settings. |
| Staff | Inventory intake, fulfillment, checkout, customer lookup as configured. | High-risk settings, manager overrides, reports unless granted. |
| Manager | Reports, credit corrections, conflict resolution, buylist approval, overrides. | Hosting/database secrets unless separately authorized. |
| Administrator | WordPress/plugin/WooCommerce configuration. | Should still use least privilege and secure credential storage. |
| System | Server-to-server sync operations. | Interactive use. |

## Security Controls

- Server-side permission checks on REST/admin routes.
- WordPress nonces for admin actions.
- Idempotency keys for queued writes.
- Webhook verification where provider webhooks are enabled.
- Secrets stored only in WordPress settings, server env, local secure storage, or a password manager.
- Audit logs for credit changes, overrides, trade-in conversion, report exports, receipt resend, and fulfillment actions where practical.
- Kiosk privacy by restricted role, timeout, and no staff/customer-credit screens.

## Credential Rotation Checklist

- [ ] ScryDex API key and secondary key.
- [ ] TopDeck API key.
- [ ] Square access token and webhook signing secret.
- [ ] GoDaddy Payments credentials.
- [ ] SMTP credentials.
- [ ] WordPress admin passwords.
- [ ] WordPress application passwords.
- [ ] Database password.
- [ ] SSH/SFTP credentials or deploy keys.
- [ ] Offline app pairing tokens.
- [ ] Kiosk/device tokens.
- [ ] App update/code signing key if used.

## Staff Offboarding

1. Disable WordPress user account.
2. Remove app/device access if assigned.
3. Rotate shared manager/login codes if the staff member knew them.
4. Review recent overrides, credit changes, and trade-in activity.
5. Document offboarding completion.
