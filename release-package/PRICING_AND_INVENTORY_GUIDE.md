# Pricing And Inventory Guide

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.0
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Business rules for serialized inventory, repricing, price floors, locations, barcodes, and WooCommerce product sync.
Audience: Owner, manager, staff, support technician
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Serialized Inventory Rules

- One physical card equals one inventory item.
- Each inventory item has a unique inventory identity and optional barcode/SKU.
- Same card/set products may be grouped for storefront display while preserving condition/grade-specific serialized rows.
- Cards can be visible online, kiosk-visible, POS-visible, hidden, held, sold, returned, or pending review depending on workflow.

## Price Rules

| Rule | Behavior |
| --- | --- |
| Market value | Pulled from ScryDex/reference data when available. |
| Suggested sale price | Market price plus 10% unless store policy changes. |
| Normal customer price rounding | Over $1 with cents rounds up to the nearest whole dollar. |
| Minimum sale price | Required at intake and used as the floor for automatic repricing. |
| Price lock | Prevents automatic repricing for owner-selected items. |
| Below-minimum sale | Requires manager override and audit reason. |
| Trade-in value | Market mid times per-card percentage, rounded down to whole dollars. |

## Examples

| Scenario | Result |
| --- | --- |
| Market $100, suggested sale = market + 10% | Suggested sale price $110.00. |
| Minimum sale price $90, market rises to $120 | Auto price may increase according to policy. |
| Minimum sale price $90, market falls to $95 | Auto price may fall but remains above floor. |
| Minimum sale price $90, market falls to $60 | Price floor prevents auto price below $90. |
| Price lock enabled | Daily repricing skips the item until unlocked. |
| Staff attempts $80 sale with $90 minimum | Manager override required and logged. |

## Inventory Locations

Locations should be named in plain store language such as Front Case, Binder A, Bulk Back Room, Graded Display, Online Hold, or Event Prize Shelf. Multi-location logic should be used consistently so staff can pick quickly and reports remain accurate.

## WooCommerce Product Sync

When inventory is published, the plugin projects card groups into WooCommerce products with images, condition/grade selectors, price display, and reservation metadata. WooCommerce stock alone is not sufficient for one-of-one cards because exact serialized item status controls availability.
