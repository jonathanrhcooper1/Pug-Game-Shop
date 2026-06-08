import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const clientSource = await readFile(path.join(appRoot, "src/data/localSyncServerClient.ts"), "utf8")

for (const requiredExport of [
  "LocalSyncServerClient",
  "LocalSyncAccessSection",
  "LocalSyncUser",
  "LocalSyncSession",
  "LocalSyncAuthResult",
  "LocalSyncAccessPolicyResult",
  "LocalSyncInventorySearchResult",
  "LocalSyncInventoryIntakeResult",
  "LocalSyncScryDexCard",
  "LocalSyncStockByCondition",
  "LocalSyncScryDexSearchResult",
  "LocalSyncReservationResult",
  "LocalSyncKioskOrderResult",
  "LocalSyncCustomerSearchResult",
  "LocalSyncCreateCustomerResult",
  "LocalSyncCreditAdjustmentResult",
  "LocalSyncCreditRedemptionResult",
  "LocalSyncSquareCreditHandoff",
  "LocalSyncEventSnapshot",
  "LocalSyncEventListResult",
  "LocalSyncEventRegistrationResult",
  "LocalSyncEventCheckinResult",
  "LocalSyncStatusResult",
  "createLocalSyncServerClient",
  "normalizeLocalSyncServerUrl",
  "updateUserAccess",
  "createCreditRedemption",
  "searchScryDexCards",
  "listEvents",
  "createEventRegistration",
  "createEventCheckin",
]) {
  assert.ok(clientSource.includes(requiredExport), `Missing local sync client export: ${requiredExport}`)
}

for (const route of [
  "/auth/pin",
  "/users/access-policy",
  "/users",
  "/users/${encodeURIComponent(userId)}/access",
  "/inventory/search?q=",
  "/scrydex/cards/search?q=",
  "/inventory/intake",
  "/inventory/reservations",
  "/kiosk/orders",
  "/customers/search?q=",
  "/customers",
  "/credit/adjustments",
  "/credit/redemptions",
  "/events",
  "/events/registrations",
  "/events/check-ins",
  "/sync/status",
]) {
  assert.ok(clientSource.includes(route), `Missing local sync client route: ${route}`)
}

for (const marker of [
  "Bearer ${options.sessionToken}",
  "raw_pin_returned: false",
  "pin_hash_returned: false",
  "pin_credentials_returned: false",
  "local_sync_server_unavailable",
  "The LAN local sync server is unavailable.",
  "http://127.0.0.1:8787",
  "store-sync.sqlite",
  "local_operations_preserved: true",
  "wordpress_acceptance_required: true",
  "wordpress_ledger_authority: true",
  "square_payment_capture_supported: false",
  "Pug Store Credit",
  "first_name",
  "last_name",
  "inventory_public_ids",
  "hold_reason",
  "inventory_public_id",
  "price_minor_units",
  "quantity_added",
  "provider_card_id",
  "printed_number",
  "image_url",
  "label_print_deferred: true",
  "lookup_order",
  "local_reference_cache_hit",
  "wordpress_proxy_performed",
  "wordpress_proxy_required: boolean",
  "credential_storage: \"wordpress_server_settings\"",
  "credentials_synced_to_client: false",
  "provider_card_id",
  "market_price_minor_units",
  "stock_available_count",
  "stock_by_condition",
  "wordpress_catalog_cache",
  "reference_card_count",
  "scrydex_lookup_order",
  "scrydex_fallback_connected",
  "customer_public_id",
  "amount_minor_units",
  "sale_total_minor_units",
  "wordpress_event_authority: true",
  "event_count",
  "event_id",
  "attendee_label",
  "registration_public_id",
  "payment_status",
]) {
  assert.ok(clientSource.includes(marker), `Missing local sync client marker: ${marker}`)
}

for (const forbidden of [
  "direct_mysql_access: true",
  "rawTokenReturned",
  "password",
  "api_key",
  "private_key",
]) {
  assert.equal(clientSource.includes(forbidden), false, `Forbidden local sync client marker found: ${forbidden}`)
}

console.log("PASS offline app local sync client contract")
