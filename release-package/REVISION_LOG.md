# Release Package Revision Log

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.14
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Detailed revision tracking for documentation and package handoff changes.
Audience: Owner, support technician, developer
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
