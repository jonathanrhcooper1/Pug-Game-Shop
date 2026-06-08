export const LOCAL_SYNC_SERVER_CONTRACT_VERSION = 1

export const LOCAL_SYNC_SERVER_ENDPOINTS = Object.freeze([
  { method: "GET", path: "/health", purpose: "LAN server health and version probe" },
  { method: "POST", path: "/auth/pin", purpose: "PIN session verification against cached access policy" },
  { method: "GET", path: "/users/access-policy", purpose: "Manager-readable cached user role and access policy" },
  { method: "POST", path: "/users", purpose: "Manager-created local staff PIN user queue" },
  { method: "PATCH", path: "/users/:user_id/access", purpose: "Manager role/access policy update queue" },
  { method: "GET", path: "/inventory/search", purpose: "Shared local inventory cache search" },
  { method: "POST", path: "/inventory/intake", purpose: "Employee inventory intake queue" },
  { method: "POST", path: "/inventory/reservations", purpose: "Local reservation lock request" },
  { method: "POST", path: "/kiosk/orders", purpose: "Customer pickup order from kiosk clients" },
  { method: "GET", path: "/customers/search", purpose: "Shared local customer and credit cache search" },
  { method: "POST", path: "/customers", purpose: "Employee customer creation queue" },
  { method: "POST", path: "/credit/adjustments", purpose: "Manager-approved store credit add/correction" },
  { method: "POST", path: "/credit/redemptions", purpose: "Store credit use queue for Square POS handoff" },
  { method: "POST", path: "/events/registrations", purpose: "Event registration queue" },
  { method: "GET", path: "/sync/status", purpose: "WordPress sync status and backlog counts" },
  { method: "POST", path: "/sync/pull", purpose: "Pull canonical website changes into local cache" },
  { method: "POST", path: "/sync/push", purpose: "Push accepted local operations to WordPress" },
])

export const LOCAL_CLIENT_MODES = Object.freeze(["employee", "manager", "kiosk"])

export function buildLocalSyncServerContract(options = {}) {
  const websiteUrl = normalizeUrl(options.websiteUrl ?? "https://vbf.2a7.myftpupload.com/")
  const serverUrl = normalizeUrl(options.serverUrl ?? "http://pug-local-sync:8787/")
  const syncIntervalSeconds = boundedInt(options.syncIntervalSeconds, 5, 3600, 30)

  return {
    action: "local_sync_server_contract",
    schema_version: LOCAL_SYNC_SERVER_CONTRACT_VERSION,
    topology: "lan_middleman_server",
    store_id: cleanToken(options.storeId ?? "pug-game-shop"),
    server_url: serverUrl,
    website_url: websiteUrl,
    wordpress_rest_base: `${websiteUrl.replace(/\/$/, "")}/wp-json/tcg-store/v1`,
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
      "serve_cached_staff_pin_and_access_policy",
      "store_pin_credentials_as_hashes_not_cleartext",
      "coordinate_local_reservation_locks_before_website_sync",
      "prevent_local_double_sell_between_employee_and_kiosk_clients",
      "enforce_manager_required_user_access_changes",
      "queue_employee_inventory_customer_credit_and_event_operations",
      "queue_kiosk_pickup_orders_with_first_and_last_name",
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
      square_payment_capture_supported: false,
      square_payment_handoff_only: true,
      production_api_keys_allowed_in_local_server: false,
      scrydex_credentials_synced_to_clients: false,
    },
  }
}

export function planLocalClientConnection({ mode, serverUrl, websiteUrl }) {
  const normalizedMode = LOCAL_CLIENT_MODES.includes(mode) ? mode : "employee"

  return {
    action: "local_client_connection_plan",
    mode: normalizedMode,
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
            "/inventory/reservations",
            "/customers",
            "/credit/redemptions",
            "/events/registrations",
          ],
    manager_required_paths:
      normalizedMode === "manager"
        ? ["/credit/adjustments", "/sync/push", "/settings"]
        : [],
    local_cache_source: "local_sync_server",
    direct_wordpress_access: false,
    direct_square_payment_capture: false,
  }
}

function normalizeUrl(value) {
  const parsed = new URL(String(value))
  parsed.pathname = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "")
  parsed.search = ""
  parsed.hash = ""

  return parsed.toString()
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
