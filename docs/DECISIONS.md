# Architecture Decisions

## ADR-001: Serialized Inventory Authority

Status: Accepted

Custom plugin tables are authoritative. WooCommerce and POS stock are
projections. This is required to prevent one-of-one cards from being sold twice.

## ADR-002: WooCommerce Catalog Shells

Status: Proposed for Phase 1 validation

Use a product per searchable card family/version and carry exact `inventory_id`
in each cart line. This avoids creating and maintaining a public product for
every physical card while preserving SEO and exact-item checkout.

## ADR-003: Tauri First

Status: Accepted with hardware gate

Use Tauri + React + TypeScript + SQLite. Switch to Electron only if printer,
scanner, kiosk lockdown, updater, or Windows deployment proof-of-concepts fail
and the failure is documented.

## ADR-004: One-Shot Daily Scheduling

Status: Accepted

Schedule the next 9:00 AM `America/New_York` run as a one-time action. Do not
repeat every 86,400 seconds because daylight-saving transitions cause drift.

## ADR-005: Immutable Credit Ledger

Status: Accepted

Never edit or delete posted credit entries. Correct them with linked
compensating entries. Cache balance only as a rebuildable projection.

## ADR-006: Capability Reporting

Status: Accepted

Every external adapter publishes capability status:
`supported`, `not_supported`, `not_configured`, `degraded`, or `unknown`.
Unknown and unverified features are not exposed as working UI actions.

## ADR-007: External Tournament Providers

Status: Accepted

External tournament-provider integrations are outside active scope. Local event
records, registrations, waitlists, and check-in remain plugin-owned.

## ADR-008: Offline Conflict Policy

Status: Accepted

The central LAN inventory ledger is authoritative before and after reconnect.
Offline operations are never silently overwritten or silently allowed to
overwrite a newer ledger revision. WordPress, Square, and kiosk values are
verified projections; conflicts become durable manager-review records.

## ADR-009: Money And Currency

Status: Accepted

Store money as decimal plus ISO currency. Never use binary floating point.
Pricing does not mix currencies; an explicit FX provider/configuration is
required before a non-store-currency reference price can drive sale price.

## ADR-010: HPOS Compatibility

Status: Accepted

Use WooCommerce CRUD APIs and declare HPOS compatibility only after automated
tests pass. Do not read or write order data directly through `wp_posts`.
