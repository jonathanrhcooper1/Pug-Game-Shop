import assert from "node:assert/strict"

import {
  createWordPressKioskOrderPush,
  kioskOrderBody,
} from "../src/wordpressKioskOrderPush.mjs"

const kioskOperation = {
  operation_id: "op-kiosk-order-001",
  operation_type: "kiosk_order",
  entity_id: "kiosk-order-001",
  payload: {
    order_id: "kiosk-order-001",
    first_name: "Ada",
    last_name: "Lovelace",
    reservation_ids: ["reservation-001", "reservation-002"],
  },
}

const body = kioskOrderBody(kioskOperation, ["inventory-001", "inventory-002", "inventory-001"])

assert.equal(body.order_id, "kiosk-order-001")
assert.equal(body.first_name, "Ada")
assert.equal(body.last_name, "Lovelace")
assert.deepEqual(body.inventory_public_ids, ["inventory-001", "inventory-002"])
assert.equal(body.source, "offline_lan_sync")

let observedRequests = []
const push = createWordPressKioskOrderPush({
  websiteUrl: "https://example.test",
  username: "sync-user",
  applicationPassword: "secret app password",
  fetcher: async (url, init) => {
    observedRequests.push({
      url: url.toString(),
      headers: init.headers,
      body: JSON.parse(init.body),
    })

    return Response.json(
      {
        data: {
          accepted: true,
          code: "kiosk_order_reserved",
          order: {
            order_id: "kiosk-order-001",
            first_name: "Ada",
            last_name: "Lovelace",
            status: "reserved_for_pickup",
            reservation_count: 2,
          },
          reservations: [
            {
              reservation_id: 901,
              inventory_public_id: "inventory-001",
              status: "active",
              expires_at: "2026-06-08 23:00:00",
            },
            {
              reservation_id: 902,
              inventory_public_id: "inventory-002",
              status: "active",
              expires_at: "2026-06-08 23:00:00",
            },
          ],
        },
      },
      { status: 201 },
    )
  },
})

assert.ok(push)

const result = await push({ operation: kioskOperation, inventoryPublicIds: ["inventory-001", "inventory-002"] })

assert.equal(result.status, "ok")
assert.equal(result.wordpress_code, "kiosk_order_reserved")
assert.equal(result.order.status, "reserved_for_pickup")
assert.equal(result.reservations.length, 2)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.equal(observedRequests[0].url, "https://example.test/wp-json/tcg-store/v1/kiosk/orders")
assert.equal(observedRequests[0].headers["idempotency-key"], "op-kiosk-order-001")
assert.ok(observedRequests[0].headers.authorization.startsWith("Basic "))
assert.deepEqual(observedRequests[0].body.inventory_public_ids, ["inventory-001", "inventory-002"])

const invalid = await push({
  operation: {
    operation_id: "op-kiosk-invalid",
    operation_type: "kiosk_order",
    entity_id: "kiosk-invalid",
    payload: {
      first_name: "Missing",
    },
  },
  inventoryPublicIds: [],
})

assert.equal(invalid.status, "blocked")
assert.equal(invalid.code, "wordpress_kiosk_order_payload_invalid")
assert.equal(invalid.credentials_synced_to_client, false)

assert.equal(createWordPressKioskOrderPush({ websiteUrl: "https://example.test" }), null)

console.log("PASS WordPress kiosk order push")
