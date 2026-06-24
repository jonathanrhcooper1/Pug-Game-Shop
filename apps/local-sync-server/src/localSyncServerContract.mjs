export const LOCAL_SYNC_SERVER_CONTRACT_VERSION = 5
export const LOCAL_SYNC_SETUP_STATUS_SCHEMA_VERSION = 3

export const LOCAL_SYNC_SERVER_ENDPOINTS = Object.freeze([
  { method: "GET", path: "/health", purpose: "LAN server health and version probe" },
  { method: "GET", path: "/setup/status", purpose: "Secret-free one-website setup and LAN binding probe" },
  { method: "POST", path: "/setup/config", purpose: "Manager-updated secret-free one-website setup binding" },
  { method: "POST", path: "/devices/heartbeat", purpose: "Employee and kiosk client presence heartbeat" },
  { method: "GET", path: "/devices/status", purpose: "LAN client online/offline and setup status summary" },
  { method: "GET", path: "/notifications/fulfillment", purpose: "Employee-only pickup order sound notification settings" },
  { method: "POST", path: "/auth/pin", purpose: "PIN session verification against cached access policy" },
  { method: "GET", path: "/users/access-policy", purpose: "Manager-readable cached user role and access policy" },
  { method: "POST", path: "/users", purpose: "Manager-created local staff PIN user queue" },
  { method: "PATCH", path: "/users/:user_id/access", purpose: "Manager role/access policy update queue" },
  { method: "GET", path: "/inventory/search", purpose: "Shared local inventory cache search" },
  { method: "GET", path: "/scrydex/cards/search", purpose: "Server-side ScryDex reference lookup for inventory intake" },
  { method: "POST", path: "/scrydex/catalog/index", purpose: "Server-side missing set/card ScryDex import and full-set catalog indexing" },
  { method: "POST", path: "/scrydex/cards/identify-image", purpose: "Server-side ScryDex Vision live card scan lookup for inventory and trade-ins" },
  { method: "GET", path: "/trade-ins/graded-valuation", purpose: "Server-side secondary graded-card comp lookup for Trade-Ins" },
  { method: "POST", path: "/pos/square/inventory-pull-plan", purpose: "Manager Square POS barcode/SKU inventory-readiness plan" },
  { method: "POST", path: "/pos/square/inventory-counts/reconcile", purpose: "Manager Square POS count comparison against serialized website inventory" },
  { method: "POST", path: "/pos/square/reports/sales/pull", purpose: "Manager Square POS sales/payment report pull into local reconciliation snapshots" },
  { method: "POST", path: "/pos/square/sales/finalize", purpose: "Staff Square receipt handoff that marks exact scanned inventory sold" },
  { method: "GET", path: "/pos/square/terminal/status", purpose: "Staff Square Terminal reader/payment connector status without exposing credentials" },
  { method: "POST", path: "/pos/square/terminal/device-code", purpose: "Manager Square Terminal activation code request" },
  { method: "POST", path: "/pos/square/terminal/checkouts", purpose: "Staff Square Terminal checkout request for paired reader payment" },
  { method: "POST", path: "/checkout/transactions", purpose: "Staff POS receipt history linked to customer or guest checkout" },
  { method: "POST", path: "/inventory/intake", purpose: "Employee inventory intake queue" },
  { method: "GET", path: "/inventory/locations", purpose: "Shared named inventory location list" },
  { method: "POST", path: "/inventory/locations", purpose: "Staff-created inventory shelf/case location" },
  { method: "GET", path: "/labels/dymo/printers", purpose: "Staff DYMO LabelWriter status without browser print dialogs" },
  { method: "POST", path: "/labels/dymo/print", purpose: "Staff direct DYMO 30336 card inventory label print" },
  { method: "POST", path: "/inventory/reservations", purpose: "Local reservation lock request" },
  { method: "GET", path: "/trade-ins/orders", purpose: "Shared local trade-in and buy-in draft queue list" },
  { method: "POST", path: "/trade-ins/orders", purpose: "Staff trade-in and buy-in draft creation" },
  { method: "PATCH", path: "/trade-ins/orders/:order_id", purpose: "Staff trade-in and buy-in draft/customer/item edits before approval" },
  { method: "PATCH", path: "/trade-ins/orders/:order_id/status", purpose: "Staff trade-in review, approval, payout, and conversion status update" },
  { method: "GET", path: "/kiosk/orders", purpose: "Shared LAN kiosk pickup queue list" },
  { method: "POST", path: "/kiosk/orders", purpose: "Customer pickup order from kiosk clients" },
  { method: "PATCH", path: "/kiosk/orders/:order_id/status", purpose: "Staff pickup ticket status update" },
  { method: "PATCH", path: "/kiosk/orders/:order_id/picks", purpose: "Shared per-card kiosk pick checklist update" },
  { method: "PATCH", path: "/kiosk/orders/:order_id/payment", purpose: "Cashier-confirmed Square payment and exact inventory sale finalization" },
  { method: "PATCH", path: "/kiosk/orders/:order_id/customer", purpose: "Attach local customer profile to kiosk pickup order history" },
  { method: "GET", path: "/fulfillment/orders", purpose: "Paid WooCommerce local-pickup fulfillment queue list" },
  { method: "PATCH", path: "/fulfillment/orders/:order_id/status", purpose: "Staff WooCommerce pickup fulfillment status update" },
  { method: "PATCH", path: "/fulfillment/orders/:order_id/picks", purpose: "Shared per-card WooCommerce pickup checklist update" },
  { method: "GET", path: "/customers/search", purpose: "Shared local customer and credit cache search" },
  { method: "GET", path: "/customers/:customer_public_id/profile", purpose: "Customer profile with credit ledger and saved trade-in history" },
  { method: "POST", path: "/customers", purpose: "Employee customer creation queue" },
  { method: "POST", path: "/credit/adjustments", purpose: "Staff local-store credit add/correction with ledger audit" },
  { method: "POST", path: "/credit/redemptions", purpose: "Store credit use queue for Square POS handoff" },
  { method: "GET", path: "/events", purpose: "Shared local event cache list" },
  { method: "POST", path: "/events", purpose: "Staff event creation queue" },
  { method: "POST", path: "/events/registrations", purpose: "Event registration queue" },
  { method: "POST", path: "/events/check-ins", purpose: "Event check-in queue" },
  { method: "GET", path: "/sync/status", purpose: "WordPress sync status and backlog counts" },
  { method: "POST", path: "/sync/pull", purpose: "Pull canonical website changes into local cache" },
  { method: "POST", path: "/sync/push", purpose: "Push accepted local operations to WordPress" },
])

export const LOCAL_CLIENT_MODES = Object.freeze(["employee", "manager", "kiosk"])

export function buildLocalSyncServerContract(options = {}) {
  const websiteUrl = normalizeUrl(options.websiteUrl ?? "https://thepuggaming.com/")
  const serverUrl = normalizeUrl(options.serverUrl ?? "http://pug-local-sync:8787/")
  const syncIntervalSeconds = boundedInt(options.syncIntervalSeconds, 5, 3600, 30)
  const setupStatus = buildLocalSyncSetupStatus({
    ...options,
    serverUrl,
    websiteUrl,
  })

  return {
    action: "local_sync_server_contract",
    schema_version: LOCAL_SYNC_SERVER_CONTRACT_VERSION,
    topology: "lan_middleman_server",
    setup_screen_mode: "single_configurable_website",
    one_website_mode: true,
    store_id: cleanToken(options.storeId ?? "pug-game-shop"),
    server_url: serverUrl,
    website_url: websiteUrl,
    wordpress_rest_base: `${websiteUrl.replace(/\/$/, "")}/wp-json/tcg-store/v1`,
    setup_status_path: "/setup/status",
    device_heartbeat_path: "/devices/heartbeat",
    device_status_path: "/devices/status",
    discovery: {
      protocol: "pug-local-sync-discovery-v1",
      transport: "udp",
      port: 8788,
      manual_fallback_supported: true,
      raw_credentials_returned: false,
      credentials_synced_to_client: false,
    },
    setup_status: setupStatus,
    local_database: options.localDatabase ?? "store-sync.sqlite",
    sync_interval_seconds: syncIntervalSeconds,
    authorities: {
      global_source_of_truth: "wordpress_woocommerce_plugin",
      local_offline_authority: "local_sync_server",
      client_authority: "none_clients_request_locks",
      payment_authority: "local_square_pos",
      store_credit_authority: "wordpress_credit_ledger",
    },
    clients: LOCAL_CLIENT_MODES.map((mode) => planLocalClientConnection({ mode, serverUrl, websiteUrl })),
    responsibilities: [
      "serve_shared_inventory_customer_credit_event_and_conflict_cache",
      "publish_secret_free_one_website_setup_status",
      "allow_manager_to_update_secret_free_website_setup",
      "track_employee_and_kiosk_device_heartbeats",
      "publish_online_offline_client_presence",
      "report_client_setup_status_without_credentials",
      "serve_employee_only_pickup_order_notification_settings",
      "advertise_lan_middleman_with_manual_url_fallback",
      "bind_clients_to_configured_lan_server_before_sync",
      "serve_scrydex_reference_lookup_without_client_credentials",
      "serve_scrydex_lookup_from_local_cache_before_wordpress_proxy",
      "serve_scrydex_vision_live_card_scan_without_client_credentials",
      "serve_secondary_graded_price_comps_only_after_scrydex_reference_lookup",
      "serve_square_pos_barcode_inventory_plan_without_square_payment_capture",
      "send_dymo_inventory_labels_through_local_dymo_connect_service",
      "compare_square_pos_inventory_counts_without_square_payment_capture",
      "pull_square_pos_sales_reports_without_creating_woocommerce_orders",
      "finalize_exact_square_pos_sales_by_scanned_inventory",
      "serve_cached_staff_pin_and_access_policy",
      "store_pin_credentials_as_hashes_not_cleartext",
      "coordinate_local_reservation_locks_before_website_sync",
      "prevent_local_double_sell_between_employee_and_kiosk_clients",
      "enforce_manager_required_user_access_changes",
      "queue_employee_inventory_customer_credit_and_event_operations",
      "queue_kiosk_pickup_orders_with_first_and_last_name",
      "share_kiosk_pickup_orders_across_employee_and_kiosk_clients",
      "allow_staff_to_update_kiosk_pickup_status_without_inventory_mutation",
      "record_cashier_confirmed_square_payment_without_capturing_payment",
      "mark_exact_kiosk_inventory_sold_after_square_confirmation",
      "share_per_card_pick_checklists_across_employee_clients",
      "pull_paid_woocommerce_local_pickup_orders_into_fulfillment",
      "allow_staff_to_update_woocommerce_pickup_fulfillment_status_without_inventory_mutation",
      "pull_canonical_changes_from_wordpress_when_online",
      "push_local_operations_to_wordpress_when_online",
      "keep_scry_dex_credentials_on_wordpress_only",
      "never_capture_square_payments",
    ],
    endpoints: LOCAL_SYNC_SERVER_ENDPOINTS,
    safety: {
      wordpress_acceptance_required_for_final_inventory_status: true,
      local_reservations_expire_without_website_acceptance: true,
      pin_credentials_stored_as_hashes: true,
      manager_required_for_user_access_changes: true,
      kiosk_status_updates_mutate_inventory: false,
      woocommerce_pickup_status_updates_mutate_inventory: false,
      paid_website_pickup_required_before_fulfillment: true,
      square_payment_capture_supported: false,
      square_payment_handoff_only: true,
      square_pos_inventory_pull_plan_manager_only: true,
      square_pos_inventory_count_reconciliation_manager_only: true,
      square_pos_inventory_count_reconciliation_mutates_inventory: false,
      square_pos_sales_report_pull_manager_only: true,
      square_pos_sales_report_pull_creates_woocommerce_orders: false,
      square_pos_sales_report_pull_mutates_inventory: false,
      square_pos_sale_finalize_captures_payment: false,
      square_pos_sale_finalize_marks_exact_inventory_sold: true,
      live_credentials_blocked_in_local_server: true,
      one_website_configuration_required: true,
      setup_status_returns_credentials: false,
      setup_config_manager_only: true,
      setup_config_accepts_credentials: false,
      device_status_returns_credentials: false,
      lan_discovery_returns_credentials: false,
      manual_middleman_url_fallback_supported: true,
      scrydex_credentials_synced_to_clients: false,
      scrydex_lookup_uses_server_side_credentials_only: true,
      scrydex_vision_credentials_synced_to_clients: false,
      scrydex_vision_uses_lan_server_credentials_only: true,
      graded_pricing_credentials_synced_to_clients: false,
      graded_pricing_secondary_to_scrydex: true,
    },
  }
}

export function buildLocalSyncSetupStatus(options = {}) {
  const websiteUrl = normalizeOptionalUrl(options.websiteUrl)
  const serverUrl = normalizeOptionalUrl(options.serverUrl) || "http://127.0.0.1:8787/"
  const restBasePath = cleanRestBasePath(options.restBasePath ?? "/wp-json/tcg-store/v1")
  const wordpressRestBase = websiteUrl ? `${websiteUrl.replace(/\/$/, "")}${restBasePath}` : ""
  const wordpressPushConfigured = Boolean(
      options.wordpressPushConfigured ??
      options.wordpressInventoryPushConnected ??
        options.wordpressInventoryUpdatePushConnected ??
        options.wordpressInventorySalePushConnected ??
        options.wordpressFulfillmentStatusPushConnected ??
        options.wordpressEventUpsertPushConnected ??
        options.wordpressEventRegistrationPushConnected ??
      options.wordpressEventCheckinPushConnected ??
      options.wordpressCreditPushConnected ??
      options.wordpressCustomerPushConnected ??
      options.wordpressKioskOrderPushConnected,
  )

  return {
    status: "ok",
    action: "local_sync_server_setup_status",
    schema_version: LOCAL_SYNC_SETUP_STATUS_SCHEMA_VERSION,
    topology: "lan_middleman_server",
    setup_screen_mode: "single_configurable_website",
    one_website_mode: true,
    store_id: cleanToken(options.storeId ?? "pug-game-shop"),
    server_url: serverUrl.replace(/\/$/, ""),
    setup_status_path: "/setup/status",
    device_heartbeat_path: "/devices/heartbeat",
    device_status_path: "/devices/status",
    client_presence_enabled: true,
    website_url: websiteUrl,
    website_configured: Boolean(websiteUrl),
    setup_required: !websiteUrl,
    rest_base_path: restBasePath,
    wordpress_rest_base: wordpressRestBase,
    local_database: options.localDatabase ?? "store-sync.sqlite",
    config_source: options.configSource ?? "server_environment",
    configured_at_utc: options.configuredAtUtc ?? "",
    wordpress_connector_restart_required: Boolean(options.wordpressConnectorRestartRequired),
    credit_approval_threshold_minor_units: boundedInt(
      options.creditApprovalThresholdMinorUnits,
      0,
      1_000_000,
      2500,
    ),
    wordpress_pull_configured: Boolean(options.wordpressPullConfigured),
    wordpress_push_configured: wordpressPushConfigured,
    wordpress_inventory_push_configured: Boolean(options.wordpressInventoryPushConnected),
    wordpress_inventory_update_push_configured: Boolean(options.wordpressInventoryUpdatePushConnected),
    wordpress_inventory_sale_push_configured: Boolean(options.wordpressInventorySalePushConnected),
    wordpress_fulfillment_pull_configured: Boolean(options.wordpressFulfillmentPullConnected),
    wordpress_fulfillment_status_push_configured: Boolean(options.wordpressFulfillmentStatusPushConnected),
    wordpress_event_upsert_push_configured: Boolean(options.wordpressEventUpsertPushConnected),
    wordpress_event_registration_push_configured: Boolean(options.wordpressEventRegistrationPushConnected),
    wordpress_event_checkin_push_configured: Boolean(options.wordpressEventCheckinPushConnected),
    wordpress_customer_push_configured: Boolean(options.wordpressCustomerPushConnected),
    wordpress_credit_push_configured: Boolean(options.wordpressCreditPushConnected),
    wordpress_kiosk_order_push_configured: Boolean(options.wordpressKioskOrderPushConnected),
    scrydex_catalog_proxy_configured: Boolean(options.scrydexCatalogProxyConfigured),
    scrydex_catalog_index_configured: Boolean(options.scrydexCatalogIndexConnected),
    scrydex_vision_configured: Boolean(options.scrydexVisionConfigured),
    square_inventory_count_pull_configured: Boolean(options.squareInventoryCountPullConnected),
    square_sales_report_pull_configured: Boolean(options.squareSalesReportPullConnected),
    graded_pricing_provider_configured: Boolean(options.gradedPricingProviderConfigured),
    graded_pricing_primary_source: "scrydex_reference_cache",
    graded_pricing_credentials_synced_to_client: false,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
    direct_mysql_access: false,
  }
}

export function planLocalClientConnection({ mode, serverUrl, websiteUrl }) {
  const normalizedMode = LOCAL_CLIENT_MODES.includes(mode) ? mode : "employee"

  return {
    action: "local_client_connection_plan",
    mode: normalizedMode,
    setup_screen_mode: "single_configurable_website",
    one_website_mode: true,
    setup_status_path: "/setup/status",
    device_heartbeat_path: "/devices/heartbeat",
    device_status_path: "/devices/status",
    heartbeat_interval_seconds: 30,
    reports_setup_status_to_server: true,
    server_url: normalizeUrl(serverUrl),
    website_url: normalizeUrl(websiteUrl),
    auth_boundary:
      normalizedMode === "kiosk"
        ? "kiosk_device_token_no_manager_settings"
        : "staff_or_manager_session_from_local_server_policy",
    allowed_write_paths:
      normalizedMode === "kiosk"
        ? ["/kiosk/orders"]
        : [
            "/inventory/intake",
            "/labels/dymo/print",
            "/inventory/reservations",
            "/pos/square/sales/finalize",
            "/customers",
            "/credit/redemptions",
            "/events/registrations",
            "/events/check-ins",
            "/kiosk/orders/:order_id/status",
          ],
    manager_required_paths:
      normalizedMode === "manager"
        ? ["/credit/adjustments", "/sync/push", "/settings"]
        : [],
    local_cache_source: "local_sync_server",
    direct_wordpress_access: false,
    direct_square_payment_capture: false,
    credentials_synced_to_client: false,
  }
}

function normalizeUrl(value) {
  const parsed = new URL(String(value))
  parsed.pathname = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "")
  parsed.search = ""
  parsed.hash = ""

  return parsed.toString()
}

function normalizeOptionalUrl(value) {
  const raw = String(value ?? "").trim()

  if (!raw) {
    return ""
  }

  try {
    return normalizeUrl(raw)
  } catch {
    return ""
  }
}

function cleanRestBasePath(value) {
  const path = String(value ?? "").trim()

  if (!path || !path.startsWith("/")) {
    return "/wp-json/tcg-store/v1"
  }

  return path.replace(/\/+$/, "") || "/wp-json/tcg-store/v1"
}

function cleanToken(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "") || "store"
}

function boundedInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value), 10)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}
