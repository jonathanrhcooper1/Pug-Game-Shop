import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://example.test/",
  storeOptions: {
    databasePath: ":memory:",
  },
})

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const inventory = await fetchJson(`${baseUrl}/inventory/search?q=pikachu`)
  const item = inventory.items[0]
  const orderResult = await fetchJson(`${baseUrl}/kiosk/orders`, {
    method: "POST",
    body: {
      first_name: "Grace",
      last_name: "Hopper",
      inventory_public_ids: [item.public_id],
    },
  })
  const auth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1234" },
  })

  assert.equal(orderResult.order.payment_status, "pay_at_store")

  const earlyComplete = await fetchJson(
    `${baseUrl}/kiosk/orders/${orderResult.order.order_id}/status`,
    {
      method: "PATCH",
      token: auth.session.token,
      body: { status: "completed" },
      expectedStatus: 409,
    },
  )
  assert.equal(earlyComplete.code, "kiosk_payment_required")

  const picked = await fetchJson(
    `${baseUrl}/kiosk/orders/${orderResult.order.order_id}/picks`,
    {
      method: "PATCH",
      token: auth.session.token,
      body: { picked_item_ids: [item.public_id] },
    },
  )
  assert.equal(picked.order.all_items_picked, true)

  const readyBeforePayment = await fetchJson(
    `${baseUrl}/kiosk/orders/${orderResult.order.order_id}/status`,
    {
      method: "PATCH",
      token: auth.session.token,
      body: { status: "ready" },
    },
  )
  assert.equal(readyBeforePayment.order.status, "ready")
  assert.equal(readyBeforePayment.order.payment_status, "pay_at_store")

  const paid = await fetchJson(
    `${baseUrl}/kiosk/orders/${orderResult.order.order_id}/payment`,
    {
      method: "PATCH",
      token: auth.session.token,
      body: {
        square_receipt_reference: "SQ-KIOSK-1001",
        cashier_confirmed: true,
      },
    },
  )
  assert.equal(paid.order.payment_status, "paid")
  assert.equal(paid.order.status, "ready")
  assert.equal(paid.inventory_sale_finalized, true)
  assert.equal(paid.square_payment_capture_performed, false)

  const completed = await fetchJson(
    `${baseUrl}/kiosk/orders/${orderResult.order.order_id}/status`,
    {
      method: "PATCH",
      token: auth.session.token,
      body: { status: "completed" },
    },
  )
  assert.equal(completed.order.status, "completed")

  const soldInventory = await fetchJson(`${baseUrl}/inventory/search?q=${encodeURIComponent(item.barcode)}`)
  assert.equal(soldInventory.items[0].status, "sold")

  const secondInventory = await fetchJson(`${baseUrl}/inventory/search?q=charizard`)
  const secondItem = secondInventory.items[0]
  const secondOrder = await fetchJson(`${baseUrl}/kiosk/orders`, {
    method: "POST",
    body: {
      first_name: "Katherine",
      last_name: "Johnson",
      inventory_public_ids: [secondItem.public_id],
    },
  })

  await fetchJson(`${baseUrl}/kiosk/orders/${secondOrder.order.order_id}/picks`, {
    method: "PATCH",
    token: auth.session.token,
    body: { picked_item_ids: [secondItem.public_id] },
  })

  const secondPaid = await fetchJson(`${baseUrl}/kiosk/orders/${secondOrder.order.order_id}/payment`, {
    method: "PATCH",
    token: auth.session.token,
    body: {
      square_receipt_reference: "SQ-KIOSK-1002",
      cashier_confirmed: true,
    },
  })
  assert.equal(secondPaid.order.status, "pulling")
  assert.equal(secondPaid.order.payment_status, "paid")

  const completedBeforeReady = await fetchJson(
    `${baseUrl}/kiosk/orders/${secondOrder.order.order_id}/status`,
    {
      method: "PATCH",
      token: auth.session.token,
      body: { status: "completed" },
      expectedStatus: 409,
    },
  )
  assert.equal(completedBeforeReady.code, "kiosk_ready_required")

  const secondReady = await fetchJson(`${baseUrl}/kiosk/orders/${secondOrder.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "ready" },
  })
  assert.equal(secondReady.order.status, "ready")

  const secondCompleted = await fetchJson(`${baseUrl}/kiosk/orders/${secondOrder.order.order_id}/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "completed" },
  })
  assert.equal(secondCompleted.order.status, "completed")

  console.log("PASS local sync kiosk payment and picking")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

async function fetchJson(url, options = {}) {
  const headers = { "content-type": "application/json" }

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await response.json()

  assert.equal(
    response.status,
    options.expectedStatus ?? 200,
    `${url} returned ${response.status}: ${JSON.stringify(body)}`,
  )

  return body
}
