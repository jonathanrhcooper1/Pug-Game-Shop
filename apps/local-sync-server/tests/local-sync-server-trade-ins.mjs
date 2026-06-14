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
  websiteUrl: "https://j84.285.myftpupload.com/",
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

  const created = await fetchJson(`${baseUrl}/trade-ins/orders`, {
    method: "POST",
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
      ],
    },
  })

  assert.equal(created.status, "ok")
  assert.equal(created.order.status, "draft")
  assert.equal(created.order.item_count, 2)
  assert.equal(created.order.credit_total_minor_units, 1100)
  assert.equal(created.order.cash_total_minor_units, 2500)
  assert.equal(created.order.combined_total_minor_units, 3600)
  assert.equal(created.order.items[0].grading_company, "PSA")
  assert.equal(created.order.items[1].calculated_final_value_minor_units, 2100)
  assert.equal(created.order.items[1].final_value_minor_units, 2500)
  assert.equal(created.order.items[1].final_value_manually_set, true)
  assert.equal(created.sellable_inventory_created, false)

  const list = await fetchJson(`${baseUrl}/trade-ins/orders?limit=10`, {
    token: auth.session.token,
  })

  assert.equal(list.status, "ok")
  assert.equal(list.order_count, 1)
  assert.equal(list.orders[0].order_id, created.order.order_id)
  assert.equal(list.orders[0].staff_user_id, auth.user.id)
  assert.equal(list.orders[0].staff_user_name, auth.user.name)

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

  const approved = await fetchJson(`${baseUrl}/trade-ins/orders/${created.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "approved", notes: "Approved by owner." },
  })

  assert.equal(approved.status, "ok")
  assert.equal(approved.order.status, "approved")

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
  assert.equal(converted.order.sellable_inventory_created, false)
  assert.ok(converted.order.converted_at_utc)
  assert.equal(converted.order.converted_by_user_id, auth.user.id)

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
  websiteUrl: "https://j84.285.myftpupload.com/",
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
  websiteUrl: "https://j84.285.myftpupload.com/",
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
