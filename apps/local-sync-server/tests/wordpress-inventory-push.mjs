import assert from "node:assert/strict"

import {
  createWordPressInventoryPush,
  inventoryIntakeBody,
} from "../src/wordpressInventoryPush.mjs"

const item = {
  public_id: "local-inventory-001",
  provider_card_id: "scrydex-pokemon-base-004",
  game: "pokemon",
  card_name: "Charizard",
  set_name: "Base Set",
  set_code: "BASE",
  card_number: "4",
  printed_number: "4/102",
  condition: "LP",
  barcode: "PUG-LOCAL-CHARIZARD",
  price_minor_units: 25000,
  currency: "USD",
  location: "Intake Queue",
  status: "pending_intake",
  image_url: "https://images.pokemontcg.io/base1/4_hires.png",
}
const body = inventoryIntakeBody(item)

assert.equal(body.source, "offline")
assert.equal(body.status, "pending_intake")
assert.equal(body.provider_name, "scrydex")
assert.equal(body.provider_card_id, "scrydex-pokemon-base-004")
assert.equal(body.barcode, "PUG-LOCAL-CHARIZARD")
assert.equal(body.sku, "PUG-LOCAL-CHARIZARD")
assert.equal(body.sale_price_minor_units, 25000)
assert.equal(body.minimum_sale_price_minor_units, 25000)
assert.equal(body.front_image_remote_url, "https://images.pokemontcg.io/base1/4_hires.png")
assert.equal("location_id" in body, false)

const activeBody = inventoryIntakeBody(item, { defaultLocationId: "7" })

assert.equal(activeBody.status, "available")
assert.equal(activeBody.location_id, 7)

let observedRequest = null
const push = createWordPressInventoryPush({
  websiteUrl: "https://example.test",
  username: "sync-user",
  applicationPassword: "secret app password",
  defaultLocationId: 7,
  fetcher: async (url, init) => {
    observedRequest = {
      url: url.toString(),
      headers: init.headers,
      body: JSON.parse(init.body),
    }

    return Response.json(
      {
        status: "created",
        code: "inventory_item_created",
        data: {
          public_id: "wp-inventory-001",
          sku: "PUG-LOCAL-CHARIZARD",
          barcode: "PUG-LOCAL-CHARIZARD",
          status: "available",
          price_change_log_persisted: true,
        },
      },
      { status: 201 },
    )
  },
})

assert.ok(push)

const result = await push({
  operation: { operation_id: "op-local-charizard-001" },
  item,
})

assert.equal(result.status, "ok")
assert.equal(result.wordpress_code, "inventory_item_created")
assert.equal(result.inventory.public_id, "wp-inventory-001")
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.equal(observedRequest.url, "https://example.test/wp-json/tcg-store/v1/inventory")
assert.equal(observedRequest.headers["idempotency-key"], "op-local-charizard-001")
assert.ok(observedRequest.headers.authorization.startsWith("Basic "))
assert.equal(observedRequest.body.card_name, "Charizard")
assert.equal(observedRequest.body.status, "available")
assert.equal(observedRequest.body.location_id, 7)

const rejectedPush = createWordPressInventoryPush({
  websiteUrl: "https://example.test",
  authHeader: "Bearer staging-token",
  fetcher: async () =>
    Response.json(
      {
        status: "invalid",
        code: "inventory_intake_request_invalid",
        errors: ["card_name_required"],
      },
      { status: 400 },
    ),
})

const rejected = await rejectedPush({
  operation: { operation_id: "op-rejected" },
  item: { ...item, card_name: "" },
})

assert.equal(rejected.status, "blocked")
assert.equal(rejected.code, "wordpress_inventory_push_rejected")
assert.equal(rejected.wordpress_code, "inventory_intake_request_invalid")
assert.deepEqual(rejected.errors, ["card_name_required"])
assert.equal(rejected.credentials_synced_to_client, false)

assert.equal(createWordPressInventoryPush({ websiteUrl: "https://example.test" }), null)

console.log("PASS WordPress inventory push")
