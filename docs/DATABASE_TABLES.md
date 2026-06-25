# Database Tables

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.202.14
Release date: 2026-06-17
Last updated: 2026-06-17
Document purpose: Custom table overview for support and development.
Audience: Developer and database administrator
> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.
## Tables

| Table | Purpose | Primary module |
| --- | --- | --- |
| tcg_schema_migrations | Tracks database migration versions. | MigrationRunner |
| tcg_settings | Stores plugin operational settings. | Settings |
| tcg_audit_log | Records sensitive staff/system actions. | AuditLogger, reports |
| tcg_role_permissions | Custom staff/manager/system permission map. | RoleManager |
| tcg_reference_sets | ScryDex set/expansion reference data. | ScryDex catalog |
| tcg_reference_cards | Reference card records and image/price anchors. | ScryDex catalog, search |
| tcg_reference_variants | Card variants, finishes, and variant images. | ScryDex catalog, search |
| tcg_provider_price_observations | Raw provider price observations and history. | ScryDex pricing |
| tcg_provider_price_points | Normalized provider price points, including graded rows. | Pricing/search |
| tcg_inventory_locations | Named inventory storage locations. | Inventory |
| tcg_inventory_items | Serialized physical inventory rows. | Inventory, WooCommerce, kiosk, POS |
| tcg_inventory_movements | Inventory movement/audit history. | Inventory |
| tcg_barcodes | Barcode/SKU identity rows. | Inventory labels |
| tcg_price_change_log | Sale price and repricing audit history. | Pricing |
| tcg_manager_overrides | Manager override records and reasons. | Overrides, reports |
| tcg_reservations | Cart/kiosk/order holds and expiry state. | Reservations |
| tcg_customers | Customer profile and credit projection. | Customers |
| tcg_customer_contacts | Customer lookup contact rows. | Customers |
| tcg_customer_notes | Customer support notes. | Customers |
| tcg_customer_merge_log | Duplicate customer merge history. | Customers |
| tcg_customer_credit_ledger | Immutable store-credit ledger. | Credit, reports |
| tcg_buylist_submissions | Trade-in/buylist parent record. | Buylist |
| tcg_buylist_items | Trade-in/buylist line items. | Buylist |
| tcg_buylist_offers | Offer totals and customer decisions. | Buylist |
| tcg_buylist_approvals | Approval/override history. | Buylist |
| tcg_buylist_conversion_log | Conversion of accepted items into inventory. | Buylist, inventory |
| tcg_sync_jobs | Background sync job records. | Sync |
| tcg_sync_job_logs | Sync job timeline messages. | Sync |
| tcg_sync_errors | Sync failure details. | Sync |
| tcg_sync_checkpoints | Pagination/resume checkpoints. | ScryDex sync |
| tcg_webhook_events | Webhook delivery/audit records. | Connectors |
| tcg_offline_devices | Registered local/offline devices. | Offline sync |
| tcg_offline_pull_cursors | Per-device pull cursors. | Offline sync |
| tcg_offline_sync_queue | Queued offline operations. | Offline sync |
| tcg_sync_conflicts | Detected sync conflicts and resolution history. | Offline sync |
| tcg_payment_fee_snapshots | Payment fee estimates/snapshots. | Payments |
| tcg_payment_provider_log | Payment provider audit log. | Payments |
| tcg_pos_sync_log | POS sale/refund/inventory sync log. | POS |
| tcg_events | Local event records. | Events |
| tcg_event_templates | Reusable event setup templates. | Events |
| tcg_event_registrations | Player registrations and payment/check-in state. | Events |
| tcg_event_waitlist | Waitlist positions. | Events |
| tcg_event_checkins | Player check-in records. | Events |
| tcg_event_registration_logs | Registration/check-in audit log. | Events |
