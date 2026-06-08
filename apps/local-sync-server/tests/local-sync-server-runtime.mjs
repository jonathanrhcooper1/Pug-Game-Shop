import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

const server = createLocalSyncHttpServer({ storeOptions: { databasePath: ":memory:" } })
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const preflight = await fetch(`${baseUrl}/auth/pin`, { method: "OPTIONS" })

  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*")
  assert.ok(preflight.headers.get("access-control-allow-methods")?.includes("POST"))
  assert.ok(preflight.headers.get("access-control-allow-headers")?.includes("authorization"))

  const health = await fetchJson(`${baseUrl}/health`)

  assert.equal(health.status, "ok")
  assert.equal(health.local_database, "store-sync.sqlite")

  const managerAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "9999" },
  })

  assert.equal(managerAuth.status, "ok")
  assert.equal(managerAuth.user.role, "manager")
  assert.equal(managerAuth.raw_pin_returned, false)
  assert.equal(managerAuth.pin_hash_returned, false)
  assertNoSecrets(managerAuth)

  const managerToken = managerAuth.session.token
  const policy = await fetchJson(`${baseUrl}/users/access-policy`, {
    token: managerToken,
  })

  assert.equal(policy.status, "ok")
  assert.equal(policy.pin_credentials_returned, false)
  assert.ok(policy.users.some((user) => user.id === "staff-front-counter"))
  assertNoSecrets(policy)

  const createdUser = await fetchJson(`${baseUrl}/users`, {
    method: "POST",
    token: managerToken,
    body: {
      name: "Test Cashier",
      pin: "2468",
      role: "staff",
      access: ["Inventory", "Kiosk", "Queue"],
    },
  })

  assert.equal(createdUser.status, "ok")
  assert.equal(createdUser.user.name, "Test Cashier")
  assert.deepEqual(createdUser.user.access, ["Inventory", "Kiosk", "Queue"])
  assertNoSecrets(createdUser)

  const cashierAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "2468" },
  })

  assert.equal(cashierAuth.status, "ok")
  assert.equal(cashierAuth.user.name, "Test Cashier")
  assert.deepEqual(cashierAuth.user.access, ["Inventory", "Kiosk", "Queue"])

  const scrydexSearch = await fetchJson(`${baseUrl}/scrydex/cards/search?q=charizard`, {
    token: cashierAuth.session.token,
  })

  assert.equal(scrydexSearch.status, "ok")
  assert.equal(scrydexSearch.cards.length, 1)
  assert.equal(scrydexSearch.cards[0].card_name, "Charizard")
  assert.equal(scrydexSearch.cards[0].suggested_barcode, "PKM-BASE-004-HOLO")
  assert.equal(scrydexSearch.credential_storage, "wordpress_server_settings")
  assert.equal(scrydexSearch.credentials_synced_to_client, false)
  assert.equal(scrydexSearch.live_provider_request_performed, false)
  assertNoSecrets(scrydexSearch)

  const missingScryDexSession = await fetchJson(`${baseUrl}/scrydex/cards/search?q=charizard`, {
    expectedStatus: 409,
  })
  assert.equal(missingScryDexSession.status, "blocked")
  assert.equal(missingScryDexSession.code, "session_required")

  const intake = await fetchJson(`${baseUrl}/inventory/intake`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      card_name: "Mewtwo",
      set_name: "Base Set",
      condition: "MP",
      barcode: "PUG-SMOKE-MEWTWO",
      price_minor_units: 4200,
      location: "Intake Bin",
    },
  })
  assert.equal(intake.status, "ok")
  assert.equal(intake.item.card_name, "Mewtwo")
  assert.equal(intake.item.status, "pending_intake")
  assert.equal(intake.item.source, "queued")
  assert.equal(intake.wordpress_acceptance_required, true)

  const duplicateIntake = await fetchJson(`${baseUrl}/inventory/intake`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      card_name: "Duplicate Mewtwo",
      barcode: "PUG-SMOKE-MEWTWO",
      price_minor_units: 4200,
    },
    expectedStatus: 409,
  })
  assert.equal(duplicateIntake.status, "blocked")
  assert.equal(duplicateIntake.code, "duplicate_barcode")

  const inventory = await fetchJson(`${baseUrl}/inventory/search?q=charizard`)
  assert.equal(inventory.status, "ok")
  assert.equal(inventory.items.length, 1)
  assert.equal(inventory.items[0].status, "available")

  const reserve = await fetchJson(`${baseUrl}/inventory/reservations`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      inventory_public_id: inventory.items[0].public_id,
      hold_reason: "staff counter hold",
    },
  })

  assert.equal(reserve.status, "ok")
  assert.equal(reserve.item.status, "reserved")
  assert.equal(reserve.wordpress_acceptance_required, true)

  const duplicateReservation = await fetchJson(`${baseUrl}/inventory/reservations`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      inventory_public_id: inventory.items[0].public_id,
      hold_reason: "second counter hold",
    },
    expectedStatus: 409,
  })

  assert.equal(duplicateReservation.status, "blocked")
  assert.equal(duplicateReservation.code, "inventory_unavailable")

  const kioskInventory = await fetchJson(`${baseUrl}/inventory/search?q=pikachu`)
  const kioskOrder = await fetchJson(`${baseUrl}/kiosk/orders`, {
    method: "POST",
    body: {
      first_name: "Ada",
      last_name: "Lovelace",
      inventory_public_ids: [kioskInventory.items[0].public_id],
    },
  })

  assert.equal(kioskOrder.status, "ok")
  assert.equal(kioskOrder.order.status, "queued")
  assert.equal(kioskOrder.reservations.length, 1)

  const staffAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1234" },
  })
  assert.equal(staffAuth.status, "ok")
  assert.ok(staffAuth.user.access.includes("Customers"))

  const customerSearch = await fetchJson(`${baseUrl}/customers/search?q=morgan`)
  assert.equal(customerSearch.status, "ok")
  assert.equal(customerSearch.wordpress_ledger_authority, true)
  assert.equal(customerSearch.customers[0].display_name, "Morgan Lee")

  const createdCustomer = await fetchJson(`${baseUrl}/customers`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      first_name: "Local",
      last_name: "Customer",
      email: "local.customer@example.test",
    },
  })
  assert.equal(createdCustomer.status, "ok")
  assert.equal(createdCustomer.customer.display_name, "Local Customer")
  assert.equal(createdCustomer.customer.credit.balance_minor_units, 0)
  assert.equal(createdCustomer.wordpress_acceptance_required, true)

  const staffCreditAdjustment = await fetchJson(`${baseUrl}/credit/adjustments`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 3000,
      reason: "staff should not add credit",
    },
    expectedStatus: 409,
  })
  assert.equal(staffCreditAdjustment.status, "blocked")
  assert.equal(staffCreditAdjustment.code, "manager_required")

  const creditAdjustment = await fetchJson(`${baseUrl}/credit/adjustments`, {
    method: "POST",
    token: managerToken,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 3000,
      reason: "manager-approved store credit",
    },
  })
  assert.equal(creditAdjustment.status, "ok")
  assert.equal(creditAdjustment.manager_approved, true)
  assert.equal(creditAdjustment.customer.credit.balance_minor_units, 3000)
  assert.equal(creditAdjustment.ledger_entry.status, "pending_sync")

  const creditRedemption = await fetchJson(`${baseUrl}/credit/redemptions`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 1000,
      sale_total_minor_units: 4500,
      reason: "Square handoff credit use",
    },
  })
  assert.equal(creditRedemption.status, "ok")
  assert.equal(creditRedemption.customer.credit.balance_minor_units, 2000)
  assert.equal(creditRedemption.square_payment_capture_supported, false)
  assert.equal(creditRedemption.square_handoff.square_payment_method_label, "Pug Store Credit")
  assert.equal(creditRedemption.square_handoff.square_amount_due_minor_units, 3500)

  const overspendRedemption = await fetchJson(`${baseUrl}/credit/redemptions`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 10000,
      sale_total_minor_units: 10000,
      reason: "overspend should be blocked",
    },
    expectedStatus: 409,
  })
  assert.equal(overspendRedemption.status, "blocked")
  assert.equal(overspendRedemption.code, "insufficient_credit")

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)
  assert.equal(syncStatus.status, "ok")
  assert.equal(syncStatus.persistence_mode, "sqlite")
  assert.equal(syncStatus.local_operations_preserved, true)
  assert.ok(syncStatus.queue_depth >= 8)
  assert.ok(syncStatus.customer_count >= 4)
  assert.ok(syncStatus.credit_ledger_entry_count >= 5)

  console.log("PASS local sync server runtime")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

async function fetchJson(url, options = {}) {
  const headers = {
    "content-type": "application/json",
  }

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await response.json()
  const expectedStatus = options.expectedStatus ?? 200

  assert.equal(response.status, expectedStatus, `${url} returned ${response.status}: ${JSON.stringify(body)}`)

  return body
}

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value)

  assert.equal(serialized.includes("pinHash"), false)
  assert.equal(serialized.includes("pinSalt"), false)
  assert.equal(serialized.includes("1234"), false)
  assert.equal(serialized.includes("9999"), false)
  assert.equal(serialized.includes("2468"), false)
  assert.equal(serialized.includes("api_key"), false)
  assert.equal(serialized.includes("X-Api-Key"), false)
  assert.equal(serialized.includes("private_key"), false)
}
