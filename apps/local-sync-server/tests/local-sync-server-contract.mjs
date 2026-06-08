import assert from "node:assert/strict"

import {
  buildLocalSyncServerContract,
  LOCAL_SYNC_SERVER_ENDPOINTS,
  planLocalClientConnection,
} from "../src/localSyncServerContract.mjs"

const contract = buildLocalSyncServerContract({
  storeId: "Pug Game Shop",
  serverUrl: "http://192.168.1.20:8787/",
  websiteUrl: "https://vbf.2a7.myftpupload.com/",
  syncIntervalSeconds: 20,
})

assert.equal(contract.action, "local_sync_server_contract")
assert.equal(contract.topology, "lan_middleman_server")
assert.equal(contract.authorities.global_source_of_truth, "wordpress_woocommerce_plugin")
assert.equal(contract.authorities.local_offline_authority, "local_sync_server")
assert.equal(contract.authorities.client_authority, "none_clients_request_locks")
assert.equal(contract.authorities.payment_authority, "local_square_pos")
assert.equal(contract.authorities.store_credit_authority, "wordpress_credit_ledger")
assert.equal(contract.local_database, "store-sync.sqlite")
assert.equal(contract.safety.wordpress_acceptance_required_for_final_inventory_status, true)
assert.equal(contract.safety.pin_credentials_stored_as_hashes, true)
assert.equal(contract.safety.manager_required_for_user_access_changes, true)
assert.equal(contract.safety.square_payment_capture_supported, false)
assert.equal(contract.safety.production_api_keys_allowed_in_local_server, false)
assert.equal(contract.safety.scrydex_credentials_synced_to_clients, false)
assert.ok(contract.responsibilities.includes("prevent_local_double_sell_between_employee_and_kiosk_clients"))
assert.ok(contract.responsibilities.includes("queue_kiosk_pickup_orders_with_first_and_last_name"))
assert.ok(contract.responsibilities.includes("keep_scry_dex_credentials_on_wordpress_only"))
assert.ok(contract.responsibilities.includes("serve_cached_staff_pin_and_access_policy"))
assert.ok(contract.responsibilities.includes("store_pin_credentials_as_hashes_not_cleartext"))
assert.ok(contract.responsibilities.includes("enforce_manager_required_user_access_changes"))

for (const endpoint of [
  "GET /health",
  "POST /auth/pin",
  "GET /users/access-policy",
  "POST /users",
  "PATCH /users/:user_id/access",
  "GET /inventory/search",
  "POST /kiosk/orders",
  "POST /inventory/reservations",
  "POST /credit/adjustments",
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
assert.deepEqual(kiosk.allowed_write_paths, ["/kiosk/orders"])
assert.equal(kiosk.direct_wordpress_access, false)
assert.equal(kiosk.direct_square_payment_capture, false)

const employee = planLocalClientConnection({
  mode: "employee",
  serverUrl: contract.server_url,
  websiteUrl: contract.website_url,
})
assert.ok(employee.allowed_write_paths.includes("/inventory/intake"))
assert.ok(employee.allowed_write_paths.includes("/customers"))
assert.equal(employee.local_cache_source, "local_sync_server")

console.log("PASS local sync server contract")
