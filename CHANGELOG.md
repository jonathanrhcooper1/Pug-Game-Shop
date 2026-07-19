# Changelog

Detailed release notes are maintained in [docs/CHANGELOG.md](docs/CHANGELOG.md).

## [Unreleased]

- Cleared the full WordPress Coding Standards gate across the imported plugin,
  replaced trusted dynamic SQL identifiers with WordPress `%i` placeholders,
  and aligned the WordPress integration smoke assertion with release `0.203.1`.
- Prepared release `0.203.1` with a WordPress schema-18 repair for incomplete
  ScryDex webhook relay tables and fail-closed durable webhook logging.
- Preserved Square sale receipt references through the WordPress mark-sold
  projection and verified the exact receipt by destination readback.
- Added authoritative SQLite schema-v2 SQL/reference rollback documentation,
  read-only connected reconciliation evidence, and full migration rehearsals.
- Added a reusable signed ScryDex webhook round-trip harness with temporary
  credential creation, authenticated claim/completion, and verified cleanup.
- Updated browser acceptance to support continuous live polling and captured
  21 final desktop/mobile staff, kiosk, checkout, reports, and diagnostics views.
- Bumped WordPress, LAN, employee, kiosk, checkout, and Tauri release identity
  consistently to `0.203.1`.
- Added `Pug Checkout App` as a separately compiled fullscreen Windows
  installer and expanded the production handoff from three to four explicit
  deliverables.
- Regenerated the technical handoff at version `0.203.1` so its topology,
  install order, and LAN-ledger authority model match the release code.

- Rebuilt the production release package so the staff app, kiosk app, LAN
  server contract, tests, and release docs target `https://thepuggaming.com`
  instead of the GoDaddy preview host.
- Added a packaged `local-sync.env.example` and LAN startup env loader so the
  WordPress Application Password credentials can be entered once beside the LAN
  server scripts and picked up automatically on restart.
- Fixed the employee app inventory workspace at compact desktop/small-screen
  widths so the inventory panel and selected-card detail panel stack cleanly
  without overlap or horizontal scrolling.
- Updated Windows packaging to build fullscreen, decorationless Store and Kiosk
  installers, remove the fake in-app window buttons, and include hidden LAN
  server startup helpers in the release package.
- Fixed the LAN server release ZIP layout so shared `packages/api-client`
  runtime code is included with `apps/local-sync-server`.
- Updated the production active-sync inventory smoke verifier so a confirmed
  WordPress inventory search match counts as a successful push when the local
  accepted-result echo does not include the original local entity id.
- Added a live ScryDex Vision card scanner path for the employee app. Inventory
  and Trade-In card lookup panels now have Scan Card buttons that open a camera
  guide, crop the card frame, send it to the LAN server, and load normal
  ScryDex/reference catalog results for staff confirmation without exposing
  ScryDex credentials to clients.
- Added a webhook-only mode to the production ScryDex configuration helper so
  the signed receiver secret can be installed without rewriting existing API
  credentials.
- Updated ScryDex webhook-triggered refreshes to page through the notified
  expansion until provider pagination ends instead of inheriting the daily sync
  page cap.
- Added a WooCommerce stock reconciliation hook for grouped/serialized card
  products so Square or WooCommerce stock reductions mark the extra custom
  inventory rows sold instead of leaving them available in the employee app.
- Updated the employee trade-in flow so adding a card to the offer clears the
  selected card/search state for the next scan and each line keeps its own
  independent cash/credit payout selector.
- Added LAN-server Square inventory count polling for live POS sale detection.
  The local server can now pull Square `IN_STOCK` counts for mapped catalog
  variations, mark missing local copies sold, and immediately push those sold
  states back to WordPress without exposing Square credentials to the app.
- Verified Square count reconciliation handles partial count drops, not only
  zero-stock sales, and renamed the employee app's visible Checkout workspace
  to Sale Completion so Square remains the clear payment/POS authority.
- Added Square location auto-discovery for inventory polling when a token is
  configured but `PUG_SQUARE_LOCATION_ID` is left blank.
- Simplified selected-inventory label printing so the Print Barcode Label
  button sends directly to DYMO instead of creating a second prepared-label
  print button first.
- Updated employee-app label printing to try the DYMO Connect service on the
  workstation first, then fall back to the LAN middleman server printer, and
  only open the browser print dialog if both direct print paths are unavailable.
- Standardized card holds to 15 minutes across the local app, website cart
  reservations, and kiosk pickup orders.
- Fixed mobile product image layout so card art owns a top image container and
  cannot overlap product text on phone screens.
- Fixed customer kiosk scrolling by making the full kiosk shell scrollable and
  constraining the inventory gallery and selected-card tray to scrollable
  panes on smaller screens.
- Added direct DYMO Connect printing for the employee app label workflow. The
  local sync server now exposes authenticated DYMO printer discovery and 30336
  small-label print routes, and the app sends card/set/condition/barcode labels
  directly to the DYMO LabelWriter 550 Turbo before falling back to browser
  printing.
- Completed the strict 2026-06-22 Square catalog import pass from column AH:
  1,471 card rows, 2,105 physical units, 1,204 ScryDex image hydrations, 267
  hidden unmatched review rows, zero failed rows, and zero LAN queue backlog.
- Fixed the local WordPress inventory pull merge so accepted local inventory
  rows are not duplicated when the website copy is pulled back. The live local
  cache was deduped from 4,052 rows to 2,106 real rows with zero duplicate
  barcodes, zero sync queue backlog, and 2,104 Square-ready rows.
- Fixed Square POS sale finalization so the WordPress inventory public ID keeps
  its original casing instead of being treated like a barcode before calling
  the website mark-sold endpoint.
- Added a repeatable local Square catalog inventory importer that reads
  quantity from column AH (`Current Quantity The PUG`), loads MTG Singles,
  Pokemon, One Piece, and graded-card rows through the local intake API,
  preserves Square IDs, and hides variable-price rows until ScryDex reprices.
- Imported the 2026-06-22 Square catalog into the local/website inventory flow:
  1,570 source rows and 3,278 physical units, with the local sync queue
  reconciled back to zero pending items.
- Added employee-app local MP3/MP4 pickup-order sound selection so alert audio
  is chosen and tested on each staff station instead of in WordPress settings.
- Added an event creation handoff that opens the selected event's check-in
  workflow after creation.
- Added Square catalog conversion tooling for importing MTG/Pokemon singles
  into the `Pug Grading Singles` category while excluding graded rows and
  flagging variable-price rows for ScryDex pricing.
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
