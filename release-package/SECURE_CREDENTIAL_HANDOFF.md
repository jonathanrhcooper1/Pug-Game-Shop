# Secure Credential Handoff

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.14
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Procedure for transferring and rotating credentials without exposing secrets in documentation or source control.
Audience: Owner, administrator, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Credential Rule

Real credentials are not included in this repository, generated documentation, screenshots, release notes, PDFs, DOCX files, logs, or example files. Real credentials must be transferred only through an approved secure channel.

## Approved Handoff Methods

- 1Password shared vault.
- Bitwarden organization vault.
- KeePass encrypted database.
- Proton Pass vault.
- Encrypted ZIP file with password sent through a separate channel.
- Approved enterprise password manager.

## Required Inventory Fields

| Field | Description |
| --- | --- |
| Credential owner | Person or organization responsible for rotation. |
| Credential name | Plain label such as ScryDex production API key. |
| System | WordPress, hosting, ScryDex, Square, SMTP, etc. |
| Environment | Production, staging, sandbox, or local. |
| Account/login URL | Where the account is managed. |
| Permission level | Least privilege description. |
| Configured in | WordPress field, environment variable, hosting control panel, or local secure store. |
| Rotation frequency | Recommended review/rotation cycle. |
| Recovery method | How ownership is recovered if the primary owner is unavailable. |

## Rotation Checklist

- [ ] Rotate and update inventory for WordPress administrator.
- [ ] Rotate and update inventory for Hosting control panel.
- [ ] Rotate and update inventory for SSH/SFTP deployment.
- [ ] Rotate and update inventory for Database user.
- [ ] Rotate and update inventory for WordPress application password.
- [ ] Rotate and update inventory for ScryDex API key.
- [ ] Rotate and update inventory for Square access token.
- [ ] Rotate and update inventory for GoDaddy Payments credentials.
- [ ] Rotate and update inventory for TopDeck API key.
- [ ] Rotate and update inventory for SMTP credentials.
- [ ] Rotate and update inventory for Webhook signing secrets.
- [ ] Rotate and update inventory for Offline app pairing token.
- [ ] Rotate and update inventory for Kiosk token.
- [ ] Rotate and update inventory for App signing key.
