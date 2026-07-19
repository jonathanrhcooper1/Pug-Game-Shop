import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { DatabaseSync } from "node:sqlite"
import { setTimeout as sleep } from "node:timers/promises"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://thepuggaming.com/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath: ":memory:",
  },
})

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const auth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1420", ttlMinutes: 15 },
  })

  assert.equal(auth.status, "ok")

  const customer = await fetchJson(`${baseUrl}/customers`, {
    method: "POST",
    token: auth.session.token,
    body: {
      first_name: "Grace",
      last_name: "Hopper",
      email: "grace.hopper@example.test",
      customer_lookup: "865-555-1000",
    },
  })

  assert.equal(customer.status, "ok")

  const created = await fetchJson(`${baseUrl}/trade-ins/orders`, {
    method: "POST",
    token: auth.session.token,
    body: {
      customer_name: "Grace Hopper",
      customer_phone: "865-555-1000",
      customer_public_id: customer.customer.customer_public_id,
      items: [
        {
          id: "line-1",
          product_type: "graded",
          card_name: "Charizard VMAX",
          set_name: "Shining Fates",
          condition: "NM",
          grading_company: "PSA",
          grade: "10",
          cert_number: "12345678",
          market_mid_minor_units: 1875,
          trade_in_percentage_basis_points: 6000,
          payout_type: "credit",
        },
        {
          id: "line-2",
          product_type: "raw",
          card_name: "Sol Ring",
          set_name: "Commander",
          condition: "LP",
          market_mid_minor_units: 4200,
          trade_in_percentage_basis_points: 5000,
          final_value_minor_units: 2500,
          payout_type: "cash",
        },
        {
          id: "line-3",
          product_type: "raw",
          card_name: "Unknown Store Promo",
          set_name: "Manual Intake",
          condition: "NM",
          market_mid_minor_units: 0,
          trade_in_percentage_basis_points: 6000,
          final_value_minor_units: 100,
          payout_type: "cash",
          manual_entry: true,
        },
      ],
    },
  })

  assert.equal(created.status, "ok")
  assert.equal(created.order.status, "draft")
  assert.equal(created.order.item_count, 3)
  assert.equal(created.order.credit_total_minor_units, 1100)
  assert.equal(created.order.cash_total_minor_units, 2600)
  assert.equal(created.order.combined_total_minor_units, 3700)
  assert.equal(created.order.items[0].grading_company, "PSA")
  assert.equal(created.order.items[1].calculated_final_value_minor_units, 2100)
  assert.equal(created.order.items[1].final_value_minor_units, 2500)
  assert.equal(created.order.items[1].final_value_manually_set, true)
  assert.equal(created.order.items[2].manual_entry, true)
  assert.equal(created.sellable_inventory_created, false)

  const list = await fetchJson(`${baseUrl}/trade-ins/orders?limit=10`, {
    token: auth.session.token,
  })

  assert.equal(list.status, "ok")
  assert.equal(list.order_count, 1)
  assert.equal(list.orders[0].order_id, created.order.order_id)
  assert.equal(list.orders[0].staff_user_id, auth.user.id)
  assert.equal(list.orders[0].staff_user_name, auth.user.name)

  const editedDraft = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}`, {
    method: "PATCH",
    token: auth.session.token,
    body: {
      customer_name: "Grace Hopper",
      customer_phone: "865-555-1000",
      customer_public_id: customer.customer.customer_public_id,
      items: [
        {
          id: "line-1",
          product_type: "graded",
          card_name: "Charizard VMAX",
          set_name: "Shining Fates",
          condition: "NM",
          grading_company: "PSA",
          grade: "10",
          cert_number: "12345678",
          market_mid_minor_units: 1875,
          trade_in_percentage_basis_points: 5000,
          payout_type: "credit",
        },
      ],
    },
  })

  assert.equal(editedDraft.status, "ok")
  assert.equal(editedDraft.order.order_id, created.order.order_id)
  assert.equal(editedDraft.order.status, "draft")
  assert.equal(editedDraft.order.item_count, 1)
  assert.equal(editedDraft.order.credit_total_minor_units, 900)
  assert.equal(editedDraft.order.cash_total_minor_units, 0)
  assert.equal(editedDraft.order.items[0].trade_in_percentage_basis_points, 5000)

  const customerLookup = await fetchJson(`${baseUrl}/trade-ins/orders?q=${encodeURIComponent("Grace Hopper")}`, {
    token: auth.session.token,
  })
  assert.equal(customerLookup.status, "ok")
  assert.equal(customerLookup.order_count, 1)
  assert.equal(customerLookup.orders[0].order_id, created.order.order_id)

  const staffLookup = await fetchJson(`${baseUrl}/trade-ins/orders?q=${encodeURIComponent(auth.user.name)}`, {
    token: auth.session.token,
  })
  assert.equal(staffLookup.status, "ok")
  assert.equal(staffLookup.order_count, 1)

  const receiptLookup = await fetchJson(`${baseUrl}/trade-ins/orders?q=${encodeURIComponent(created.order.order_id)}`, {
    token: auth.session.token,
  })
  assert.equal(receiptLookup.status, "ok")
  assert.equal(receiptLookup.order_count, 1)

  const itemLookup = await fetchJson(`${baseUrl}/trade-ins/orders?q=${encodeURIComponent("Shining Fates")}`, {
    token: auth.session.token,
  })
  assert.equal(itemLookup.status, "ok")
  assert.equal(itemLookup.order_count, 1)

  const staffIdLookup = await fetchJson(
    `${baseUrl}/trade-ins/orders?staff_user_id=${encodeURIComponent(auth.user.id)}`,
    { token: auth.session.token },
  )
  assert.equal(staffIdLookup.status, "ok")
  assert.equal(staffIdLookup.order_count, 1)

  const reviewed = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "review", notes: "Manager review started." },
  })

  assert.equal(reviewed.status, "ok")
  assert.equal(reviewed.order.status, "review")
  assert.equal(reviewed.order.sellable_inventory_created, false)

  const paidTooEarly = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "paid", notes: "Tried before approval." },
  })

  assert.equal(paidTooEarly.status, "blocked")
  assert.equal(paidTooEarly.code, "trade_in_payment_requires_approval")

  const approvalMissingId = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "approved", notes: "Approved by owner." },
  })

  assert.equal(approvalMissingId.status, "blocked")
  assert.equal(approvalMissingId.code, "trade_in_customer_id_required")

  const approved = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: {
      status: "approved",
      notes: "Approved by owner.",
      customer_id_number: "TN-123456789",
      customer_id_state: "tn",
    },
  })

  assert.equal(approved.status, "ok")
  assert.equal(approved.order.status, "approved")
  assert.equal(approved.order.customer_id_number_masked, "****6789")
  assert.equal(approved.order.customer_id_state, "TN")
  assert.equal(approved.order.customer_id_recorded_by_user_id, auth.user.id)
  assert.equal(approved.order.customer_id_recorded_by_user_name, auth.user.name)
  assert.equal(approved.credit_application.applied, true)
  assert.equal(approved.credit_application.customer.credit.balance_minor_units, 900)
  assert.equal(approved.sellable_inventory_created, true)
  assert.equal(approved.inventory_creation.created_count, 1)
  assert.equal(approved.order.inventory_created_count, 1)
  assert.equal(approved.order.inventory_public_ids.length, 1)

  const repeatedApproval = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: {
      status: "approved",
      idempotency_key: "repeat-after-timeout",
    },
  })
  assert.equal(repeatedApproval.status, "ok")
  assert.equal(repeatedApproval.idempotent, true)
  assert.equal(repeatedApproval.inventory_creation.created_count, 0)
  assert.deepEqual(repeatedApproval.order.inventory_public_ids, approved.order.inventory_public_ids)

  const idLookup = await fetchJson(`${baseUrl}/trade-ins/orders?q=${encodeURIComponent("6789")}`, {
    token: auth.session.token,
  })
  assert.equal(idLookup.status, "ok")
  assert.equal(idLookup.order_count, 1)

  const approvedUpdate = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}`, {
    method: "PATCH",
    token: auth.session.token,
    body: {
      customer_name: "Grace Hopper",
      items: [
        {
          id: "line-1",
          product_type: "graded",
          card_name: "Charizard VMAX",
          set_name: "Shining Fates",
          condition: "NM",
          grading_company: "PSA",
          grade: "10",
          market_mid_minor_units: 1875,
          trade_in_percentage_basis_points: 6000,
          payout_type: "credit",
        },
      ],
    },
  })

  assert.equal(approvedUpdate.status, "blocked")
  assert.equal(approvedUpdate.code, "trade_in_update_not_allowed")

  const paid = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "paid", notes: "Paid at counter." },
  })

  assert.equal(paid.status, "ok")
  assert.equal(paid.order.status, "paid")

  const converted = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "converted", notes: "Loaded into inventory intake." },
  })

  assert.equal(converted.status, "ok")
  assert.equal(converted.order.status, "converted")
  assert.equal(converted.order.sellable_inventory_created, true)
  assert.ok(converted.order.converted_at_utc)
  assert.equal(converted.order.converted_by_user_id, auth.user.id)
  assert.equal(converted.order.converted_by_user_name, auth.user.name)

  const duplicateConversion = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "converted", notes: "Duplicate conversion." },
  })

  assert.equal(duplicateConversion.status, "blocked")
  assert.equal(duplicateConversion.code, "trade_in_already_converted")

  const completed = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "completed", notes: "Transaction record completed." },
  })

  assert.equal(completed.status, "ok")
  assert.equal(completed.order.status, "completed")

  const terminalUpdate = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "approved", notes: "Change terminal." },
  })

  assert.equal(terminalUpdate.status, "blocked")
  assert.equal(terminalUpdate.code, "trade_in_terminal_status")

  const voided = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/void`, {
    method: "POST",
    token: auth.session.token,
    body: { reason: "Duplicate trade test correction" },
  })

  assert.equal(voided.status, "ok")
  assert.equal(voided.order.status, "voided")
  assert.equal(voided.credit_reversal.entry_type, "trade_in_credit_reversal")
  assert.equal(voided.credit_reversal.amount_minor_units, -900)
  assert.equal(voided.customer.credit.balance_minor_units, 0)
  assert.equal(voided.order.sellable_inventory_created, false)
  assert.equal(voided.inventory_reversed_count, 1)

  const voidedInventory = await fetchJson(
    `${baseUrl}/inventory/search?q=${encodeURIComponent(approved.order.inventory_public_ids[0])}`,
  )
  assert.equal(voidedInventory.items.length, 1)
  assert.equal(voidedInventory.items[0].status, "removed")
  assert.equal(voidedInventory.items[0].quantity_on_hand, 0)

  const duplicateVoid = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/void`, {
    method: "POST",
    token: auth.session.token,
    body: { reason: "Duplicate void attempt" },
  })

  assert.equal(duplicateVoid.status, "blocked")
  assert.equal(duplicateVoid.code, "trade_in_already_voided")

  const doubleDiscountGuard = await fetchJson(`${baseUrl}/trade-ins/orders`, {
    method: "POST",
    token: auth.session.token,
    body: {
      customer_name: "Grace Hopper",
      customer_phone: "865-555-1000",
      customer_public_id: customer.customer.customer_public_id,
      items: [
        {
          id: "line-double-discount",
          product_type: "raw",
          card_name: "Offer Guard",
          set_name: "Regression Set",
          condition: "NM",
          market_mid_minor_units: 7000,
          trade_in_percentage_basis_points: 7000,
          offer_value_minor_units: 7000,
          payout_type: "credit",
        },
      ],
    },
  })

  assert.equal(doubleDiscountGuard.status, "ok")
  assert.equal(doubleDiscountGuard.order.items[0].calculated_final_value_minor_units, 4900)
  assert.equal(doubleDiscountGuard.order.items[0].final_value_minor_units, 7000)
  assert.equal(doubleDiscountGuard.order.items[0].offer_value_minor_units, 7000)
  assert.equal(doubleDiscountGuard.order.items[0].final_value_manually_set, false)

  const doubleDiscountApproved = await fetchJson(`${baseUrl}/trade-ins/orders/${doubleDiscountGuard.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: {
      status: "approved",
      notes: "Customer accepted explicit offer regression.",
      customer_id_number: "TN-22334455",
      customer_id_state: "TN",
    },
  })

  assert.equal(doubleDiscountApproved.status, "ok")
  assert.equal(doubleDiscountApproved.credit_application.applied, true)
  assert.equal(doubleDiscountApproved.credit_application.credit_total_minor_units, 7000)
  assert.equal(doubleDiscountApproved.credit_application.customer.credit.balance_minor_units, 7000)

  const quantityOffer = await fetchJson(`${baseUrl}/trade-ins/orders`, {
    method: "POST",
    token: auth.session.token,
    body: {
      customer_name: "Grace Hopper",
      customer_phone: "865-555-1000",
      customer_public_id: customer.customer.customer_public_id,
      items: [
        {
          id: "line-quantity-guard",
          product_type: "raw",
          card_name: "Quantity Guard",
          set_name: "Regression Set",
          condition: "NM",
          market_mid_minor_units: 1000,
          trade_in_percentage_basis_points: 7000,
          payout_type: "credit",
          quantity: 3,
        },
      ],
    },
  })

  assert.equal(quantityOffer.status, "ok")
  assert.equal(quantityOffer.order.item_count, 3)
  assert.equal(quantityOffer.order.items[0].quantity, 3)
  assert.equal(quantityOffer.order.items[0].calculated_final_value_minor_units, 700)
  assert.equal(quantityOffer.order.credit_total_minor_units, 2100)

  const quantityApproved = await fetchJson(`${baseUrl}/trade-ins/orders/${quantityOffer.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: {
      status: "approved",
      notes: "Customer accepted quantity regression.",
      customer_id_number: "TN-33445566",
      customer_id_state: "TN",
    },
  })

  assert.equal(quantityApproved.status, "ok")
  assert.equal(quantityApproved.credit_application.applied, true)
  assert.equal(quantityApproved.credit_application.credit_total_minor_units, 2100)
  assert.equal(quantityApproved.credit_application.customer.credit.balance_minor_units, 9100)

  const updatedPolicy = await fetchJson(`${baseUrl}/users/access-policy`, {
    token: auth.session.token,
  })
  const frontCounter = updatedPolicy.users.find((user) => user.id === "staff-front-counter")
  assert.ok(frontCounter.access.includes("Trade-Ins"))

  assertNoSecrets(created)
  assertNoSecrets(list)
  assertNoSecrets(reviewed)

  console.log("PASS local sync server trade-ins")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

const legacyDirectory = await mkdtemp(join(tmpdir(), "pug-local-sync-legacy-"))
const legacyDatabasePath = join(legacyDirectory, "legacy-store.sqlite")

const seedLegacyServer = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://thepuggaming.com/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath: legacyDatabasePath,
  },
})

await new Promise((resolve) => seedLegacyServer.listen(0, "127.0.0.1", resolve))
await new Promise((resolve) => seedLegacyServer.close(resolve))

const legacyDatabase = new DatabaseSync(legacyDatabasePath)
legacyDatabase
  .prepare("UPDATE users SET access_json = ? WHERE id = ?")
  .run(JSON.stringify(["Inventory", "Kiosk", "Queue", "Events", "Customers", "Sync", "Status"]), "staff-front-counter")
legacyDatabase.close()

const legacyServer = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://thepuggaming.com/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath: legacyDatabasePath,
  },
})

await new Promise((resolve) => legacyServer.listen(0, "127.0.0.1", resolve))

try {
  const { port } = legacyServer.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const auth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1420", ttlMinutes: 15 },
  })

  assert.equal(auth.status, "ok")
  assert.ok(auth.user.access.includes("Trade-Ins"))

  const created = await fetchJson(`${baseUrl}/trade-ins/orders`, {
    method: "POST",
    token: auth.session.token,
    body: {
      customer_name: "Legacy Front Counter",
      items: [
        {
          id: "legacy-line-1",
          product_type: "raw",
          card_name: "Demonic Tutor",
          set_name: "Mystical Archive",
          condition: "LP",
          market_mid_minor_units: 1875,
          trade_in_percentage_basis_points: 6000,
          payout_type: "credit",
        },
      ],
    },
  })

  assert.equal(created.status, "ok")
  assert.equal(created.order.credit_total_minor_units, 1100)
  assert.equal(created.sellable_inventory_created, false)
} finally {
  await new Promise((resolve) => legacyServer.close(resolve))
  await removeDirectoryBestEffort(legacyDirectory)
}

console.log("PASS local sync server legacy trade-in access migration")

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

  return response.json()
}

function assertNoSecrets(value) {
  const json = JSON.stringify(value).toLowerCase()

  assert.equal(json.includes("authorization:"), false)
  assert.equal(json.includes("bearer "), false)
  assert.equal(json.includes("application_password"), false)
  assert.equal(json.includes("scrydex"), false)
}

async function removeDirectoryBestEffort(path) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true })
      return
    } catch (error) {
      if (error?.code !== "EBUSY") {
        throw error
      }

      await sleep(250)
    }
  }
}
