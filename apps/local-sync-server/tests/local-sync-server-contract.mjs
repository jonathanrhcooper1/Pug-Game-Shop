import assert from "node:assert/strict"

import {
  buildLocalSyncSetupStatus,
  buildLocalSyncServerContract,
  LOCAL_SYNC_SERVER_ENDPOINTS,
  planLocalClientConnection,
} from "../src/localSyncServerContract.mjs"

const contract = buildLocalSyncServerContract({
  storeId: "Pug Game Shop",
  serverUrl: "http://192.168.1.20:8787/",
  websiteUrl: "https://j84.285.myftpupload.com/",
  syncIntervalSeconds: 20,
})

assert.equal(contract.action, "local_sync_server_contract")
assert.equal(contract.topology, "lan_middleman_server")
assert.equal(contract.setup_screen_mode, "single_configurable_website")
assert.equal(contract.one_website_mode, true)
assert.equal(contract.setup_status_path, "/setup/status")
assert.equal(contract.device_heartbeat_path, "/devices/heartbeat")
assert.equal(contract.device_status_path, "/devices/status")
assert.equal(contract.discovery.protocol, "pug-local-sync-discovery-v1")
assert.equal(contract.discovery.transport, "udp")
assert.equal(contract.discovery.port, 8788)
assert.equal(contract.discovery.manual_fallback_supported, true)
assert.equal(contract.discovery.raw_credentials_returned, false)
assert.equal(contract.discovery.credentials_synced_to_client, false)
assert.equal(contract.authorities.global_source_of_truth, "wordpress_woocommerce_plugin")
assert.equal(contract.authorities.local_offline_authority, "local_sync_server")
assert.equal(contract.authorities.client_authority, "none_clients_request_locks")
assert.equal(contract.authorities.payment_authority, "local_square_pos")
assert.equal(contract.authorities.store_credit_authority, "wordpress_credit_ledger")
assert.equal(contract.local_database, "store-sync.sqlite")
assert.equal(contract.safety.wordpress_acceptance_required_for_final_inventory_status, true)
assert.equal(contract.safety.pin_credentials_stored_as_hashes, true)
assert.equal(contract.safety.manager_required_for_user_access_changes, true)
assert.equal(contract.safety.kiosk_status_updates_mutate_inventory, false)
assert.equal(contract.safety.square_payment_capture_supported, false)
assert.equal(contract.safety.square_pos_inventory_pull_plan_manager_only, true)
assert.equal(contract.safety.square_pos_inventory_count_reconciliation_manager_only, true)
assert.equal(contract.safety.square_pos_inventory_count_reconciliation_mutates_inventory, false)
assert.equal(contract.safety.square_pos_sales_report_pull_manager_only, true)
assert.equal(contract.safety.square_pos_sales_report_pull_creates_woocommerce_orders, false)
assert.equal(contract.safety.square_pos_sales_report_pull_mutates_inventory, false)
assert.equal(contract.safety.square_pos_sale_finalize_captures_payment, false)
assert.equal(contract.safety.square_pos_sale_finalize_marks_exact_inventory_sold, true)
assert.equal(contract.safety.live_credentials_blocked_in_local_server, true)
assert.equal(contract.safety.one_website_configuration_required, true)
assert.equal(contract.safety.setup_status_returns_credentials, false)
assert.equal(contract.safety.setup_config_manager_only, true)
assert.equal(contract.safety.setup_config_accepts_credentials, false)
assert.equal(contract.safety.device_status_returns_credentials, false)
assert.equal(contract.safety.lan_discovery_returns_credentials, false)
assert.equal(contract.safety.manual_middleman_url_fallback_supported, true)
assert.equal(contract.safety.scrydex_credentials_synced_to_clients, false)
assert.equal(contract.safety.scrydex_lookup_uses_server_side_credentials_only, true)
assert.equal(contract.safety.scrydex_vision_credentials_synced_to_clients, false)
assert.equal(contract.safety.scrydex_vision_uses_lan_server_credentials_only, true)
assert.equal(contract.safety.graded_pricing_credentials_synced_to_clients, false)
assert.equal(contract.safety.graded_pricing_secondary_to_scrydex, true)
assert.equal(contract.setup_status.action, "local_sync_server_setup_status")
assert.equal(contract.setup_status.website_url, "https://j84.285.myftpupload.com/")
assert.equal(contract.setup_status.wordpress_rest_base, "https://j84.285.myftpupload.com/wp-json/tcg-store/v1")
assert.equal(contract.setup_status.credentials_synced_to_client, false)
assert.equal(contract.setup_status.scrydex_vision_configured, false)
assert.equal(contract.setup_status.graded_pricing_provider_configured, false)
assert.equal(contract.setup_status.graded_pricing_primary_source, "scrydex_reference_cache")
assert.equal(contract.setup_status.graded_pricing_credentials_synced_to_client, false)
assert.equal(contract.setup_status.client_presence_enabled, true)
assert.equal(contract.setup_status.device_heartbeat_path, "/devices/heartbeat")
assert.equal(contract.setup_status.device_status_path, "/devices/status")
assert.ok(contract.responsibilities.includes("prevent_local_double_sell_between_employee_and_kiosk_clients"))
assert.ok(contract.responsibilities.includes("queue_kiosk_pickup_orders_with_first_and_last_name"))
assert.ok(contract.responsibilities.includes("share_kiosk_pickup_orders_across_employee_and_kiosk_clients"))
assert.ok(contract.responsibilities.includes("allow_staff_to_update_kiosk_pickup_status_without_inventory_mutation"))
assert.ok(contract.responsibilities.includes("publish_secret_free_one_website_setup_status"))
assert.ok(contract.responsibilities.includes("allow_manager_to_update_secret_free_website_setup"))
assert.ok(contract.responsibilities.includes("track_employee_and_kiosk_device_heartbeats"))
assert.ok(contract.responsibilities.includes("publish_online_offline_client_presence"))
assert.ok(contract.responsibilities.includes("report_client_setup_status_without_credentials"))
assert.ok(contract.responsibilities.includes("serve_employee_only_pickup_order_notification_settings"))
assert.ok(contract.responsibilities.includes("advertise_lan_middleman_with_manual_url_fallback"))
assert.ok(contract.responsibilities.includes("bind_clients_to_configured_lan_server_before_sync"))
assert.ok(contract.responsibilities.includes("keep_scry_dex_credentials_on_wordpress_only"))
assert.ok(contract.responsibilities.includes("serve_scrydex_reference_lookup_without_client_credentials"))
assert.ok(contract.responsibilities.includes("serve_scrydex_lookup_from_local_cache_before_wordpress_proxy"))
assert.ok(contract.responsibilities.includes("serve_scrydex_vision_live_card_scan_without_client_credentials"))
assert.ok(contract.responsibilities.includes("serve_secondary_graded_price_comps_only_after_scrydex_reference_lookup"))
assert.ok(contract.responsibilities.includes("serve_square_pos_barcode_inventory_plan_without_square_payment_capture"))
assert.ok(contract.responsibilities.includes("compare_square_pos_inventory_counts_without_square_payment_capture"))
assert.ok(contract.responsibilities.includes("pull_square_pos_sales_reports_without_creating_woocommerce_orders"))
assert.ok(contract.responsibilities.includes("finalize_exact_square_pos_sales_by_scanned_inventory"))
assert.ok(contract.responsibilities.includes("serve_cached_staff_pin_and_access_policy"))
assert.ok(contract.responsibilities.includes("store_pin_credentials_as_hashes_not_cleartext"))
assert.ok(contract.responsibilities.includes("enforce_manager_required_user_access_changes"))

for (const endpoint of [
  "GET /health",
  "GET /setup/status",
  "POST /setup/config",
  "POST /devices/heartbeat",
  "GET /devices/status",
  "GET /notifications/fulfillment",
  "POST /auth/pin",
  "GET /users/access-policy",
  "POST /users",
  "PATCH /users/:user_id/access",
  "GET /inventory/search",
  "GET /scrydex/cards/search",
  "POST /scrydex/cards/identify-image",
  "GET /trade-ins/graded-valuation",
  "POST /pos/square/inventory-pull-plan",
  "POST /pos/square/inventory-counts/reconcile",
  "POST /pos/square/reports/sales/pull",
  "POST /pos/square/sales/finalize",
  "GET /pos/square/terminal/status",
  "POST /pos/square/terminal/device-code",
  "POST /pos/square/terminal/checkouts",
  "POST /kiosk/orders",
  "GET /customers/search",
  "GET /customers/:customer_public_id/profile",
  "POST /customers",
  "POST /inventory/reservations",
  "GET /trade-ins/orders",
  "POST /trade-ins/orders",
  "PATCH /trade-ins/orders/:order_id",
  "PATCH /trade-ins/orders/:order_id/status",
  "GET /kiosk/orders",
  "PATCH /kiosk/orders/:order_id/customer",
  "POST /credit/adjustments",
  "PATCH /kiosk/orders/:order_id/status",
  "POST /credit/redemptions",
  "GET /events",
  "POST /events",
  "POST /events/registrations",
  "POST /events/check-ins",
  "POST /sync/push",
]) {
  const [method, path] = endpoint.split(" ")
  assert.ok(
    LOCAL_SYNC_SERVER_ENDPOINTS.some((item) => item.method === method && item.path === path),
    `Missing endpoint ${endpoint}`,
  )
}

const kiosk = planLocalClientConnection({
  mode: "kiosk",
  serverUrl: contract.server_url,
  websiteUrl: contract.website_url,
})
assert.equal(kiosk.one_website_mode, true)
assert.equal(kiosk.setup_status_path, "/setup/status")
assert.equal(kiosk.device_heartbeat_path, "/devices/heartbeat")
assert.equal(kiosk.device_status_path, "/devices/status")
assert.equal(kiosk.heartbeat_interval_seconds, 30)
assert.equal(kiosk.reports_setup_status_to_server, true)
assert.deepEqual(kiosk.allowed_write_paths, ["/kiosk/orders"])
assert.equal(kiosk.direct_wordpress_access, false)
assert.equal(kiosk.direct_square_payment_capture, false)
assert.equal(kiosk.credentials_synced_to_client, false)

const employee = planLocalClientConnection({
  mode: "employee",
  serverUrl: contract.server_url,
  websiteUrl: contract.website_url,
})
assert.ok(employee.allowed_write_paths.includes("/inventory/intake"))
assert.ok(employee.allowed_write_paths.includes("/pos/square/sales/finalize"))
assert.ok(employee.allowed_write_paths.includes("/customers"))
assert.ok(employee.allowed_write_paths.includes("/events/registrations"))
assert.ok(employee.allowed_write_paths.includes("/events/check-ins"))
assert.ok(employee.allowed_write_paths.includes("/kiosk/orders/:order_id/status"))
assert.equal(employee.local_cache_source, "local_sync_server")
assert.equal(employee.device_heartbeat_path, "/devices/heartbeat")

const missingWebsiteSetup = buildLocalSyncSetupStatus({
  serverUrl: "http://192.168.1.20:8787",
})
assert.equal(missingWebsiteSetup.one_website_mode, true)
assert.equal(missingWebsiteSetup.setup_required, true)
assert.equal(missingWebsiteSetup.website_configured, false)
assert.equal(missingWebsiteSetup.website_url, "")
assert.equal(missingWebsiteSetup.client_presence_enabled, true)
assert.equal(missingWebsiteSetup.raw_credentials_returned, false)
assert.equal(missingWebsiteSetup.direct_mysql_access, false)
assert.equal(missingWebsiteSetup.config_source, "server_environment")
assert.equal(missingWebsiteSetup.wordpress_connector_restart_required, false)

console.log("PASS local sync server contract")
