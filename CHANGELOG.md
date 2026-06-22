# Changelog

Detailed release notes are maintained in [docs/CHANGELOG.md](docs/CHANGELOG.md).

## [Unreleased]

- Added production/local cleanup tooling for the live inventory import cutover:
  clear generated card inventory/products, stale LAN queue rows, and open sync
  conflicts while preserving ScryDex reference data, customers, orders, and
  credit ledger history.
- Added a generated employee order notification MP3 asset and production
  upload command that registers it in WordPress Media Library and enables it
  for employee pickup alerts.
- Removed shipped demo card inventory, queue, and conflict seed rows from the
  local app so an empty live database no longer renders sample inventory after
  restart.
- Fixed the employee app empty-inventory startup path so clearing live/demo
  inventory no longer leaves `http://127.0.0.1:1420/` on a blank screen.
- Added employee-only pickup order audio notification settings, WordPress media
  upload support for MP3/MP4 alert sounds, and authenticated LAN sync delivery
  of notification metadata without exposing WordPress credentials.
- Added production-readiness audit documentation, public production smoke tests,
  connector/sync status reporting, UI review notes, and release artifact paths
  for the 2026-06-17 audit pass.
- Updated storefront contact/footer copy and added event registration
  confirmation emails with event details and The Pug address.
- Added the complete 0.202.0 production release ZIP under `releases/0.202.0`
  and updated the production package builder so the storefront theme ZIP is
  bundled with the plugin, LAN server, employee app, and customer kiosk app.
- Added the full client handover and technical documentation package under
  `release-package/`, including owner/admin/staff guides, secure credential
  handoff, source-code map/index, connector/database/sync guides, runbook,
  release checklist, and environment placeholder templates.
- Updated the production release builder so future full-product ZIPs include
  the documentation package alongside the plugin, theme, LAN server, employee
  app, and kiosk app.
