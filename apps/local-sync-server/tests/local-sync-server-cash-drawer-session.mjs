import assert from "node:assert/strict"

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
  const token = auth.session.token

  const opened = await fetchJson(`${baseUrl}/pos/cash-drawer/session/open`, {
    method: "POST",
    token,
    body: { starting_cash_minor_units: 10000, notes: "Opening bank" },
  })
  assert.equal(opened.status, "ok")
  assert.equal(opened.active_session.status, "open")
  assert.equal(opened.active_session.starting_cash_minor_units, 10000)
  assert.equal(opened.active_session.expected_cash_minor_units, 10000)

  const checkout = await fetchJson(`${baseUrl}/checkout/transactions`, {
    method: "POST",
    token,
    body: {
      tender_type: "cash",
      cash_paid_minor_units: 2500,
      change_due_minor_units: 500,
      total_minor_units: 2000,
      items: [
        {
          line_id: "checkout-line-1",
          type: "misc",
          label: "Cash drawer test item",
          quantity: 1,
          unit_price_minor_units: 2000,
          total_minor_units: 2000,
        },
      ],
    },
  })
  assert.equal(checkout.status, "ok")
  assert.equal(checkout.cash_drawer.movement.movement_type, "cash_sale")
  assert.equal(checkout.cash_drawer.movement.amount_minor_units, 1500)
  assert.equal(checkout.cash_drawer.active_session.expected_cash_minor_units, 11500)

  const payoutCheck = await fetchJson(`${baseUrl}/pos/cash-drawer/payout-check`, {
    method: "POST",
    token,
    body: { amount_minor_units: 12000 },
  })
  assert.equal(payoutCheck.status, "ok")
  assert.equal(payoutCheck.can_pay_out, false)
  assert.equal(payoutCheck.warning.code, "cash_payout_exceeds_drawer_cash")

  const customer = await fetchJson(`${baseUrl}/customers`, {
    method: "POST",
    token,
    body: {
      first_name: "Drawer",
      last_name: "Customer",
      customer_lookup: "drawer-customer@example.test",
      email: "drawer-customer@example.test",
    },
  })
  assert.equal(customer.status, "ok")

  const trade = await fetchJson(`${baseUrl}/trade-ins/orders`, {
    method: "POST",
    token,
    body: {
      customer_name: "Drawer Customer",
      customer_public_id: customer.customer.customer_public_id,
      items: [
        {
          id: "cash-trade-1",
          product_type: "raw",
          card_name: "Cash Trade Test",
          set_name: "Drawer Set",
          condition: "NM",
          market_mid_minor_units: 2000,
          trade_in_percentage_basis_points: 5000,
          payout_type: "cash",
        },
      ],
    },
  })
  assert.equal(trade.status, "ok")
  assert.equal(trade.cash_drawer_warning, null)

  const approved = await fetchJson(`${baseUrl}/trade-ins/orders/${trade.order.order_id}/status`, {
    method: "PATCH",
    token,
    body: {
      status: "approved",
      customer_id_number: "TN-987654",
      customer_id_state: "TN",
    },
  })
  assert.equal(approved.status, "ok")

  const paid = await fetchJson(`${baseUrl}/trade-ins/orders/${trade.order.order_id}/status`, {
    method: "PATCH",
    token,
    body: { status: "paid" },
  })
  assert.equal(paid.status, "ok")
  assert.equal(paid.cash_drawer.movement.movement_type, "cash_trade_payout")
  assert.equal(paid.cash_drawer.movement.amount_minor_units, -1000)
  assert.equal(paid.cash_drawer.active_session.expected_cash_minor_units, 10500)

  const added = await fetchJson(`${baseUrl}/pos/cash-drawer/session/add-cash`, {
    method: "POST",
    token,
    body: {
      amount_minor_units: 5000,
      reason: "Bank cash added",
    },
  })
  assert.equal(added.status, "ok")
  assert.equal(added.active_session.expected_cash_minor_units, 15500)

  const addedAgain = await fetchJson(`${baseUrl}/pos/cash-drawer/session/add-cash`, {
    method: "POST",
    token,
    body: {
      amount_minor_units: 1000,
      reason: "Second bank cash added",
    },
  })
  assert.equal(addedAgain.status, "ok")
  assert.equal(addedAgain.active_session.expected_cash_minor_units, 16500)

  const closed = await fetchJson(`${baseUrl}/pos/cash-drawer/session/close`, {
    method: "POST",
    token,
    body: {
      ending_cash_minor_units: 16400,
      notes: "Drawer counted",
    },
  })
  assert.equal(closed.status, "ok")
  assert.equal(closed.closed_session.status, "closed")
  assert.equal(closed.closed_session.expected_cash_minor_units, 16500)
  assert.equal(closed.closed_session.ending_cash_minor_units, 16400)
  assert.equal(closed.closed_session.variance_minor_units, -100)
  assert.equal(closed.closed_session.cash_sales_minor_units, 1500)
  assert.equal(closed.closed_session.cash_trade_payout_minor_units, 1000)
  assert.equal(closed.closed_session.cash_added_minor_units, 6000)
  console.log("PASS local sync cash drawer session")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

async function fetchJson(url, { method = "GET", token = "", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  return response.json()
}
