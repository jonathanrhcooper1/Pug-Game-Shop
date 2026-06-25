# Release Package Revision Log

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-23
Document purpose: Detailed revision tracking for documentation and package handoff changes.
Audience: Owner, support technician, developer
## 2026-06-23 12:45 ET - Production Domain And LAN Env Loader Patch

| File changed | Reason | Summary | Module | Migration impact | Test impact | Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| scripts/package-production-release.mjs | Production package still needed a runtime env handoff. | Added `local-sync.env.example` beside the LAN server scripts and made `Start-Pug-LAN-Server.ps1` load `local-sync.env` before launch. | Release packaging | None | Package contract, rebuild, and package scan run. | Revert script and rerun package. |
| apps/local-sync-server/src/localSyncServerContract.mjs | LAN server default target still used the preview host. | Default website URL now points to `https://thepuggaming.com`. | LAN server | None | Local sync server contract run. | Revert default URL if preview host is intentionally needed. |
| apps/offline-app/src/data/offlineWorkspace.ts | Staff/kiosk profile seed still used the preview host. | Seed profile now uses `thepuggaming.com` and legacy preview profiles migrate to the production domain. | Staff/kiosk app | None | Offline workspace contract and Windows package rebuild run. | Revert profile host if preview build is required. |
| release-package/env/local-sync.env.example | Installer needed production-ready values. | Template now enables WordPress push, targets `https://thepuggaming.com`, and marks Square environment as production while keeping secrets as placeholders. | Release docs | None | Package scan confirmed no preview host in the release ZIP. | Revert env template values. |

## 2026-06-17 01:20 ET - Documentation Package

| File changed | Reason | Summary | Module | Migration impact | Test impact | Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| release-package/* | Client handover package requested. | Created owner/admin/staff/developer support guides. | Documentation | None | Generated docs searched for restricted terms/secrets. | Remove folder or revert commit. |
| docs/API_ROUTES.md | Support route map requested. | Documented REST route groups and permissions. | API | None | Docs only. | Revert file. |
| docs/DATABASE_TABLES.md | Schema reference requested. | Documented custom table purposes and modules. | Database | None | Docs only. | Revert file. |
| scripts/package-production-release.mjs | Full package must include docs/theme. | Copies theme and documentation into production release bundle. | Release packaging | None | Package contract run. | Revert script and rerun package. |
| scripts/tests/production-release-package-contract.mjs | Guard package contents. | Added markers for theme and documentation. | Packaging tests | None | Contract test run. | Revert test. |
| scripts/package-production-release.mjs | Handoff must expose exactly three deliverables. | Renamed output to Pug Store App, LAN Server + Pug Store App, and Kiosk Page with explicit manifests. | Release packaging | None | Package contract run. | Revert script and rerun package. |
| release-package/* | SQLite install question needed a package-backed answer. | Documented that the LAN server uses Node built-in `node:sqlite`, creates or reuses `store-sync.sqlite`, and does not ship/install SQLite separately. | Documentation | None | Docs/contract review. | Revert docs. |
