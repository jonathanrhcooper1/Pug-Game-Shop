import assert from "node:assert/strict"

import {
  createWordPressFulfillmentPull,
  createWordPressFulfillmentStatusPush,
  fulfillmentOrdersFromWordPressResponse,
} from "../src/wordpressFulfillmentPull.mjs"

const sampleResponse = {
  data: {
    resource: "fulfillment_orders",
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
  },
}

const parsed = fulfillmentOrdersFromWordPressResponse(sampleResponse)
assert.equal(parsed.length, 1)
assert.equal(parsed[0].order_id, 9401)
assert.equal(parsed[0].items[0].reservation_id, 7001)
assert.equal(parsed[0].fulfillment_status, "awaiting_pull")

const observedRequests = []
const pull = createWordPressFulfillmentPull({
  websiteUrl: "https://example.test/",
  username: "staff",
  applicationPassword: "app-password",
  fetcher: async (url, options) => {
    observedRequests.push({
      url: url.toString(),
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body ?? "",
    })

    return jsonResponse(sampleResponse)
  },
})

assert.ok(pull)
const pullResult = await pull({ limit: 25, statuses: ["processing"] })
assert.equal(pullResult.status, "ok")
assert.equal(pullResult.order_count, 1)
assert.equal(observedRequests[0].url, "https://example.test/wp-json/tcg-store/v1/fulfillment/orders?limit=25&status=processing")
assert.equal(observedRequests[0].method, "GET")
assert.match(observedRequests[0].headers.authorization, /^Basic /)
assert.equal(pullResult.authorization_header_printed, false)
assert.equal(pullResult.credentials_synced_to_client, false)

const statusPush = createWordPressFulfillmentStatusPush({
  websiteUrl: "https://example.test/",
  authHeader: "Basic already-configured",
  fetcher: async (url, options) => {
    observedRequests.push({
      url: url.toString(),
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body ?? "",
    })

    return jsonResponse({
      data: {
        accepted: true,
        code: "fulfillment_status_updated",
        order: {
          ...sampleResponse.data.orders[0],
          fulfillment_status: "ready_for_pickup",
        },
      },
    })
  },
})

assert.ok(statusPush)
const pushResult = await statusPush({ orderId: 9401, status: "ready_for_pickup", operationId: "op-fulfillment-9401" })
assert.equal(pushResult.status, "ok")
assert.equal(pushResult.order.fulfillment_status, "ready_for_pickup")
assert.equal(observedRequests[1].url, "https://example.test/wp-json/tcg-store/v1/fulfillment/orders/9401/status")
assert.equal(observedRequests[1].method, "PATCH")
assert.equal(JSON.parse(observedRequests[1].body).status, "ready_for_pickup")
assert.equal(observedRequests[1].headers["idempotency-key"], "op-fulfillment-9401")
assert.equal(pushResult.authorization_header_printed, false)
assert.equal(pushResult.credentials_synced_to_client, false)

assert.equal(createWordPressFulfillmentPull({ websiteUrl: "https://example.test" }), null)
assert.equal(createWordPressFulfillmentStatusPush({ websiteUrl: "https://example.test" }), null)

console.log("PASS WordPress fulfillment pull")

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}
