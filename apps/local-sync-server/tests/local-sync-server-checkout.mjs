import assert from "node:assert/strict"

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

  const createdCustomer = await fetchJson(`${baseUrl}/customers`, {
    method: "POST",
    token: auth.session.token,
    body: {
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.test",
      phone: "555-0101",
    },
  })

  assert.equal(createdCustomer.status, "ok")
  assert.equal(createdCustomer.customer.display_name, "Ada Lovelace")

  const customerCheckout = await fetchJson(`${baseUrl}/checkout/transactions`, {
    method: "POST",
    token: auth.session.token,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      customer_lookup: createdCustomer.customer.lookup,
      customer_name: createdCustomer.customer.display_name,
      customer_email: createdCustomer.customer.email,
      guest_checkout: false,
      square_receipt_reference: "SQ-POS-ADA-1001",
      square_order_id: "SQ-ORDER-ADA-1001",
      receipt_delivery: "both",
      subtotal_minor_units: 3500,
      credit_used_minor_units: 500,
      square_due_minor_units: 3000,
      total_minor_units: 3500,
      source: "local_pos",
      tender_type: "card",
      cash_paid_minor_units: 0,
      card_paid_minor_units: 3000,
      change_due_minor_units: 0,
      items: [
        {
          type: "inventory",
          inventory_public_id: "inventory-charizard-nm",
          barcode: "PUG-CHARIZARD-NM",
          label: "Charizard",
          set_name: "Base Set",
          condition: "Near Mint",
          quantity: 1,
          unit_price_minor_units: 3500,
          total_minor_units: 3500,
        },
      ],
    },
  })

  assert.equal(customerCheckout.status, "ok")
  assert.equal(customerCheckout.customer_profile_linked, true)
  assert.equal(customerCheckout.email_delivery_queued, true)
  assert.equal(customerCheckout.print_receipt_ready, true)
  assert.equal(customerCheckout.square_payment_capture_performed, false)
  assert.equal(customerCheckout.transaction.staff_user_id, auth.user.id)
  assert.equal(customerCheckout.transaction.staff_user_name, auth.user.name)
  assert.equal(customerCheckout.transaction.items[0].label, "Charizard")
  assert.equal(customerCheckout.transaction.guest_checkout, false)
  assert.equal(customerCheckout.transaction.tender_type, "card")
  assert.equal(customerCheckout.transaction.cash_paid_minor_units, 0)
  assert.equal(customerCheckout.transaction.card_paid_minor_units, 3000)

  const guestCheckout = await fetchJson(`${baseUrl}/checkout/transactions`, {
    method: "POST",
    token: auth.session.token,
    body: {
      customer_name: "Guest checkout",
      guest_checkout: true,
      receipt_delivery: "print",
      tender_type: "cash",
      cash_paid_minor_units: 1299,
      card_paid_minor_units: 0,
      change_due_minor_units: 0,
      total_minor_units: 1299,
      source: "local_pos",
      items: [
        {
          type: "misc",
          label: "Misc sale",
          quantity: 1,
          unit_price_minor_units: 1299,
          total_minor_units: 1299,
        },
      ],
    },
  })

  assert.equal(guestCheckout.status, "ok")
  assert.equal(guestCheckout.customer_profile_linked, false)
  assert.equal(guestCheckout.transaction.guest_checkout, true)
  assert.equal(guestCheckout.transaction.tender_type, "cash")
  assert.equal(guestCheckout.transaction.square_receipt_reference.startsWith("CASH-"), true)
  assert.equal(guestCheckout.transaction.cash_paid_minor_units, 1299)
  assert.equal(guestCheckout.transaction.card_paid_minor_units, 0)
  assert.equal(guestCheckout.transaction.items[0].type, "misc")

  const customerSearch = await fetchJson(
    `${baseUrl}/customers/search?q=${encodeURIComponent("Ada Lovelace")}`,
  )

  assert.equal(customerSearch.status, "ok")
  assert.equal(customerSearch.checkout_transactions.length, 1)
  assert.equal(customerSearch.checkout_transactions[0].square_receipt_reference, "SQ-POS-ADA-1001")

  const profile = await fetchJson(
    `${baseUrl}/customers/${encodeURIComponent(createdCustomer.customer.customer_public_id)}/profile`,
    { token: auth.session.token },
  )

  assert.equal(profile.status, "ok")
  assert.equal(profile.summary.checkout_transaction_count, 1)
  assert.equal(profile.checkout_transactions.length, 1)
  assert.equal(profile.checkout_transactions[0].square_receipt_reference, "SQ-POS-ADA-1001")
  assert.equal(profile.checkout_transactions[0].items[0].condition, "Near Mint")

  const blockedEmail = await fetchJson(`${baseUrl}/checkout/transactions`, {
    method: "POST",
    token: auth.session.token,
    expectedStatus: 409,
    body: {
      customer_name: "Email Required",
      guest_checkout: true,
      square_receipt_reference: "SQ-EMAIL-BLOCKED",
      receipt_delivery: "email",
      total_minor_units: 500,
      items: [
        {
          type: "misc",
          label: "Table fee",
          quantity: 1,
          unit_price_minor_units: 500,
          total_minor_units: 500,
        },
      ],
    },
  })

  assert.equal(blockedEmail.code, "checkout_email_required")

  console.log("PASS local sync checkout transaction history")
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
