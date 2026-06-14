import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

let fulfillmentPullCalls = 0
let fulfillmentStatusPushCalls = 0

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://j84.285.myftpupload.com/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath: ":memory:",
    wordpressFulfillmentPull: async ({ limit, statuses }) => {
      fulfillmentPullCalls += 1
      assert.equal(limit, 25)
      assert.deepEqual(statuses, ["processing", "completed", "on-hold"])

      return {
        status: "ok",
        order_count: 1,
        orders: [
          {
            order_id: 9401,
            order_number: "9401",
            customer_name: "Ada Lovelace",
            order_status: "processing",
            fulfillment_status: "awaiting_pull",
            payment_status: "paid",
            shipping_method_id: "local_pickup",
            shipping_method_title: "Local pickup",
            local_pickup: true,
            item_count: 1,
            total_minor_units: 1299,
            currency: "USD",
            paid_at_utc: "2026-06-09T18:00:00.000Z",
            created_at_utc: "2026-06-09T17:55:00.000Z",
            items: [
              {
                order_item_id: 1201,
                inventory_id: 501,
                reservation_id: 7001,
                barcode: "PUG-WP-501",
                card_name: "Sol Ring",
                set_name: "Commander",
                condition: "NM",
                price_minor_units: 1299,
                currency: "USD",
                quantity: 1,
              },
            ],
          },
        ],
      }
    },
    wordpressFulfillmentStatusPush: async ({ orderId, status }) => {
      fulfillmentStatusPushCalls += 1
      assert.equal(orderId, 9401)
      assert.equal(status, "ready_for_pickup")

      return {
        status: "ok",
        code: "wordpress_fulfillment_status_updated",
        wordpress_code: "fulfillment_status_updated",
        order: {
          order_id: 9401,
          order_number: "9401",
          customer_name: "Ada Lovelace",
          order_status: "processing",
          fulfillment_status: "ready_for_pickup",
          payment_status: "paid",
          shipping_method_id: "local_pickup",
          shipping_method_title: "Local pickup",
          local_pickup: true,
          item_count: 1,
          total_minor_units: 1299,
          currency: "USD",
          paid_at_utc: "2026-06-09T18:00:00.000Z",
          created_at_utc: "2026-06-09T17:55:00.000Z",
          items: [
            {
              order_item_id: 1201,
              inventory_id: 501,
              reservation_id: 7001,
              barcode: "PUG-WP-501",
              card_name: "Sol Ring",
              set_name: "Commander",
              condition: "NM",
              price_minor_units: 1299,
              currency: "USD",
              quantity: 1,
            },
          ],
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
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

  const queue = await fetchJson(`${baseUrl}/fulfillment/orders?limit=25`, {
    token: auth.session.token,
  })

  assert.equal(queue.status, "ok")
  assert.equal(queue.order_count, 1)
  assert.equal(queue.orders[0].order_id, 9401)
  assert.equal(queue.orders[0].fulfillment_status, "awaiting_pull")
  assert.equal(queue.orders[0].payment_required_before_fulfillment, true)
  assert.equal(queue.orders[0].inventory_mutation_performed_by_status, false)
  assert.equal(queue.wordpress_fulfillment_pull_connected, true)
  assert.equal(queue.wordpress_fulfillment_status_push_connected, true)
  assertNoSecrets(queue)

  const picked = await fetchJson(`${baseUrl}/fulfillment/orders/9401/picks`, {
    method: "PATCH",
    token: auth.session.token,
    body: { picked_item_ids: ["501"] },
  })

  assert.equal(picked.status, "ok")
  assert.equal(picked.order.picked_item_count, 1)
  assert.equal(picked.order.all_items_picked, true)
  assert.deepEqual(picked.order.picked_item_ids, ["501"])

  const statusUpdate = await fetchJson(`${baseUrl}/fulfillment/orders/9401/status`, {
    method: "PATCH",
    token: auth.session.token,
    body: { status: "ready_for_pickup" },
  })

  assert.equal(statusUpdate.status, "ok")
  assert.equal(statusUpdate.order.fulfillment_status, "ready_for_pickup")
  assert.equal(statusUpdate.order.picked_item_count, 1)
  assert.equal(statusUpdate.order.all_items_picked, true)
  assert.deepEqual(statusUpdate.order.picked_item_ids, ["501"])
  assert.equal(statusUpdate.wordpress_status_sync_performed, true)
  assert.equal(statusUpdate.wordpress_status_sync_deferred, false)
  assert.equal(statusUpdate.inventory_mutation_performed, false)
  assert.equal(statusUpdate.payment_capture_performed, false)
  assertNoSecrets(statusUpdate)

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)
  assert.equal(syncStatus.status, "ok")
  assert.equal(syncStatus.fulfillment_order_count, 1)
  assert.equal(syncStatus.wordpress_fulfillment_pull_connected, true)
  assert.equal(syncStatus.wordpress_fulfillment_status_push_connected, true)
  assertNoSecrets(syncStatus)

  assert.equal(fulfillmentPullCalls, 1)
  assert.equal(fulfillmentStatusPushCalls, 1)

  console.log("PASS local sync server fulfillment")
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
  const text = JSON.stringify(value)

  assert.equal(/app-password|authorization|basic\s+/i.test(text), false, `Secret-like value leaked: ${text}`)
}
