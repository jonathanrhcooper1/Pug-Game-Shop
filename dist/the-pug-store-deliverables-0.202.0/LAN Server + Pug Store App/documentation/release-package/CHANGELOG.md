# Release Package Changelog

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-23
Document purpose: Client-facing release history for the handover documentation package.
Audience: Owner, manager, support technician
## 0.202.0 - 2026-06-17

| Type | Summary |
| --- | --- |
| Fixed | Production deliverables now target `https://thepuggaming.com` instead of the GoDaddy preview host. |
| Added | LAN Server + Pug Store App now includes `local-sync.env.example`; copy it to `local-sync.env` and fill the WordPress Application Password values before starting the server. |
| Changed | LAN startup now reads `local-sync.env` automatically, so WordPress/Square/SQLite settings can be configured beside the installer instead of through global Windows environment variables. |
| Added | Complete technical handover, owner guide, admin/staff guide, kiosk/offline guide, connector guide, database guide, sync guide, pricing/inventory guide, credit/buylist guide, events guide, POS/payments guide, security guide, runbook, backup guide, QA checklist, credential handoff, code map, and source index. |
| Changed | Production release package builder now organizes the handoff into exactly three deliverables: Pug Store App, LAN Server + Pug Store App, and Kiosk Page. |
| Changed | LAN server notes clarify that SQLite is provided by Node built-in `node:sqlite`; the package creates/uses `store-sync.sqlite` at runtime and does not ship or install a database file. |
| Fixed | Release handoff now includes checksum and install-order documentation. |
| Security | Credential documentation uses placeholders/masked examples only and explicitly prohibits committed secrets. |
| Known issues | TopDeck event creation: Future enhancement<br>Square reader live capture: Requires hardware/account validation<br>Dymo label printing: Requires hardware validation<br>SMTP delivery: Requires mail provider validation<br>Full production data import volume: Operational task |
