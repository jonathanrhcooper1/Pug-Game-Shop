# Release Package README

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.2
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Entry point for the technical handover and production release package.
Audience: Owner, administrator, support technician, and developer
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Package Contents

- `CLIENT_HANDOVER_GUIDE.md` is the primary client-facing handover guide.
- `OWNER_OPERATIONS_GUIDE.md`, `ADMIN_USER_GUIDE.md`, and `STAFF_USER_GUIDE.md` cover daily business operation.
- `TECHNICAL_ARCHITECTURE.md`, `DATABASE_SCHEMA_GUIDE.md`, `API_AND_CONNECTOR_GUIDE.md`, and `SYNC_ENGINE_GUIDE.md` support developer and technician maintenance.
- `SECURE_CREDENTIAL_HANDOFF.md`, `CREDENTIAL_INVENTORY_TEMPLATE.md`, and `ENVIRONMENT_VARIABLES.md` define safe credential transfer without exposing secrets.
- `CODE_MAP.md`, `SOURCE_CODE_INDEX.md`, and `SOURCE_CODE_COMMENTING_REPORT.md` explain the source package.

## Installable Release Artifact

The installable handoff is organized as four deliverables:

1. `Pug Store App`
2. `LAN Server + Pug Store App`
3. `Kiosk Page`
4. `Pug Checkout App`

The generated bundle is named `the-pug-store-deliverables-0.203.2.zip`. The LAN package contains the WordPress plugin ZIP, storefront theme ZIP, LAN server ZIP, Pug Store App installer, support documentation, manifests, and first-read instructions.

## Recommended Reading Order

1. Read `CLIENT_HANDOVER_GUIDE.md` for the full business and system overview.
2. Read `SECURE_CREDENTIAL_HANDOFF.md` before moving any live credentials.
3. Use `INSTALLATION_AND_DEPLOYMENT_GUIDE.md` for install, upgrade, and rollback.
4. Use `QA_TESTING_AND_RELEASE_CHECKLIST.md` before owner signoff.
5. Use `TROUBLESHOOTING_RUNBOOK.md` for support incidents.
