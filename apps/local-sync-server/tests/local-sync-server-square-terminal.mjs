import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

let checkoutCall = null
let deviceCodeCall = null

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://thepuggaming.com/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath: ":memory:",
    squareTerminalConnector: {
      status: () => ({
        status: "ok",
        action: "square_terminal_status",
        environment: "sandbox",
        configured: true,
        token_configured: true,
        location_configured: true,
        terminal_device_configured: true,
        can_create_device_code: true,
        can_create_terminal_checkout: true,
        payment_capture_supported: true,
        device_pairing_required: false,
        checkout_endpoint: "/v2/terminals/checkouts",
        device_code_endpoint: "/v2/devices/codes",
        square_payment_authority: "square_terminal_api",
        pug_credit_balance_authority: "wordpress_customer_credit_ledger",
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }),
      createDeviceCode: async (input) => {
        deviceCodeCall = input

        return {
          status: "ok",
          action: "square_terminal_device_code_created",
          device_code: {
            id: "device-code-1",
            code: "ABCD1234",
            name: "The Pug Counter Reader",
            product_type: "TERMINAL_API",
            location_id: "LOC-1",
            status: "UNPAIRED",
            created_at: "2026-06-15T20:00:00.000Z",
            paired_at: "",
          },
          pairing_instruction: "Enter this code on the Square Terminal.",
          provider_request_performed: true,
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
      },
      createCheckout: async (input) => {
        checkoutCall = input

        return {
          status: "ok",
          action: "square_terminal_checkout_created",
          square_checkout: {
            id: "terminal-checkout-1",
            status: "PENDING",
            reference_id: input.reference_id,
            note: input.note,
            amount_money: {
              amount: input.amount_minor_units,
              currency: "USD",
            },
            device_id: "DEVICE-1",
            payment_ids: [],
            created_at: "2026-06-15T20:00:00.000Z",
            updated_at: "2026-06-15T20:00:00.000Z",
          },
          provider_request_performed: true,
          payment_capture_started_on_reader: true,
          pug_credit_balance_authority: "wordpress_customer_credit_ledger",
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
      },
    },
  },
})

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
const address = server.address()
const baseUrl = `http://127.0.0.1:${address.port}`

try {
  const managerAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1420" },
  })
  assert.equal(managerAuth.status, "ok")
  const token = managerAuth.session.token

  const terminalStatus = await fetchJson(`${baseUrl}/pos/square/terminal/status`, {
    headers: authHeaders(token),
  })
  assert.equal(terminalStatus.status, "ok")
  assert.equal(terminalStatus.can_create_terminal_checkout, true)
  assert.equal(terminalStatus.credentials_synced_to_client, false)

  const deviceCode = await fetchJson(`${baseUrl}/pos/square/terminal/device-code`, {
    method: "POST",
    headers: authHeaders(token),
    body: { device_name: "The Pug Counter Reader" },
  })
  assert.equal(deviceCode.status, "ok")
  assert.equal(deviceCode.device_code.code, "ABCD1234")
  assert.equal(deviceCode.raw_credentials_returned, false)
  assert.equal(deviceCodeCall.device_name, "The Pug Counter Reader")

  const checkout = await fetchJson(`${baseUrl}/pos/square/terminal/checkouts`, {
    method: "POST",
    headers: authHeaders(token),
    body: {
      amount_minor_units: 2599,
      reference_id: "kiosk-test-1",
      note: "The Pug kiosk order kiosk-test-1",
    },
  })
  assert.equal(checkout.status, "ok")
  assert.equal(checkout.square_checkout.id, "terminal-checkout-1")
  assert.equal(checkout.square_checkout.amount_money.amount, 2599)
  assert.equal(checkout.credentials_synced_to_client, false)
  assert.equal(checkoutCall.reference_id, "kiosk-test-1")

  const inventory = await fetchJson(`${baseUrl}/inventory/search?q=charizard`)
  assert.equal(inventory.status, "ok")
  const availableItem = inventory.items.find((item) => item.status === "available")
  assert.ok(availableItem, "Expected a seeded available inventory item for kiosk checkout")

  const kioskOrder = await fetchJson(`${baseUrl}/kiosk/orders`, {
    method: "POST",
    body: {
      first_name: "Morgan",
      last_name: "Tester",
      inventory_public_ids: [availableItem.public_id],
    },
  })
  assert.equal(kioskOrder.status, "ok")

  const customerSearch = await fetchJson(`${baseUrl}/customers/search?q=morgan`)
  assert.equal(customerSearch.status, "ok")
  assert.ok(customerSearch.customers.length > 0)
  const customer = customerSearch.customers[0]

  const linkedOrder = await fetchJson(`${baseUrl}/kiosk/orders/${kioskOrder.order.order_id}/customer`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: {
      customer_public_id: customer.customer_public_id,
      customer_lookup: customer.customer_lookup,
    },
  })
  assert.equal(linkedOrder.status, "ok")
  assert.equal(linkedOrder.customer_profile_linked, true)
  assert.equal(linkedOrder.order.customer_public_id, customer.customer_public_id)

  const profile = await fetchJson(`${baseUrl}/customers/${customer.customer_public_id}/profile`, {
    headers: authHeaders(token),
  })
  assert.equal(profile.status, "ok")
  assert.equal(profile.summary.kiosk_order_count, 1)
  assert.equal(profile.kiosk_orders[0].order_id, kioskOrder.order.order_id)
  assert.equal(profile.wordpress_ledger_authority, true)
} finally {
  await new Promise((resolve) => server.close(resolve))
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
  }
}

async function fetchJson(url, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  return response.json()
}
