import assert from "node:assert/strict"

import {
  createWordPressInventoryPush,
  inventoryIntakeBody,
} from "../src/wordpressInventoryPush.mjs"

const item = {
  public_id: "local-inventory-001",
  provider_card_id: "scrydex-pokemon-base-004",
  reference_variant_id: 123,
  provider_variant_id: "scrydex-pokemon-base-004-holo-unlimited",
  game: "pokemon",
  card_name: "Charizard",
  set_name: "Base Set",
  set_code: "BASE",
  card_number: "4",
  printed_number: "4/102",
  variant: "Unlimited Holo",
  finish: "Holofoil",
  language: "English",
  raw_or_graded: "raw",
  condition: "LP",
  barcode: "PUG-LOCAL-CHARIZARD",
  price_minor_units: 25000,
  currency: "USD",
  location: "Intake Queue",
  status: "pending_intake",
  image_url: "https://images.pokemontcg.io/base1/4_hires.png",
  back_image_url: "https://images.pokemontcg.io/cardback.png",
  created_by_user_id: "27",
  created_by_user_name: "Front Counter Staff",
}
const body = inventoryIntakeBody(item)

assert.equal(body.source, "offline")
assert.equal(body.status, "pending_intake")
assert.equal(body.provider_name, "scrydex")
assert.equal(body.provider_card_id, "scrydex-pokemon-base-004")
assert.equal(body.reference_variant_id, 123)
assert.equal(body.provider_variant_id, "scrydex-pokemon-base-004-holo-unlimited")
assert.equal(body.variant, "Unlimited Holo")
assert.equal(body.finish, "Holofoil")
assert.equal(body.language, "English")
assert.equal(body.raw_or_graded, "raw")
assert.equal(body.barcode, "PUG-LOCAL-CHARIZARD")
assert.equal(body.sku, "PUG-LOCAL-CHARIZARD")
assert.equal(body.sale_price_minor_units, 25000)
assert.equal(body.minimum_sale_price_minor_units, 25000)
assert.equal(body.online_visibility, "visible")
assert.equal(body.kiosk_visibility, "visible")
assert.equal(body.pos_visibility, "visible")
assert.equal(body.front_image_remote_url, "https://images.pokemontcg.io/base1/4_hires.png")
assert.equal(body.back_image_remote_url, "https://images.pokemontcg.io/cardback.png")
assert.equal(body.actor_user_id, 27)
assert.match(body.staff_notes, /Front Counter Staff/)
assert.equal(body.sync_woocommerce_product, true)
assert.equal(body.production_write_approval, "woocommerce-product-sync")
assert.equal("location_id" in body, false)

const activeBody = inventoryIntakeBody(item, { defaultLocationId: "7" })

assert.equal(activeBody.status, "available")
assert.equal(activeBody.location_id, 7)

const magicBody = inventoryIntakeBody({
  ...item,
  game: "magicthegathering",
  provider_card_id: "TDM-246",
  card_name: "Mox Jasper",
})

assert.equal(magicBody.game, "magicthegathering")

const magicAliasBody = inventoryIntakeBody({
  ...item,
  game: "magic",
  provider_card_id: "TDM-246",
  card_name: "Mox Jasper",
})

assert.equal(magicAliasBody.game, "magicthegathering")

const hiddenBody = inventoryIntakeBody(
  {
    ...item,
    online_visibility: "hidden",
    kiosk_visibility: "staff_only",
    pos_visibility: "visible",
  },
  {
    defaultOnlineVisibility: "visible",
    defaultKioskVisibility: "visible",
    defaultPosVisibility: "visible",
  },
)

assert.equal(hiddenBody.online_visibility, "hidden")
assert.equal(hiddenBody.kiosk_visibility, "staff_only")
assert.equal(hiddenBody.pos_visibility, "visible")
assert.equal(hiddenBody.sync_woocommerce_product, false)
assert.equal("production_write_approval" in hiddenBody, false)

const defaultHiddenBody = inventoryIntakeBody(item, {
  defaultOnlineVisibility: "hidden",
  defaultKioskVisibility: "staff_only",
  defaultPosVisibility: "hidden",
})

assert.equal(defaultHiddenBody.online_visibility, "hidden")
assert.equal(defaultHiddenBody.kiosk_visibility, "staff_only")
assert.equal(defaultHiddenBody.pos_visibility, "hidden")
assert.equal(defaultHiddenBody.sync_woocommerce_product, false)
assert.equal("production_write_approval" in defaultHiddenBody, false)

const roundedPriceBody = inventoryIntakeBody({
  ...item,
  price_minor_units: 425,
  minimum_sale_price_minor_units: 101,
})

assert.equal(roundedPriceBody.sale_price_minor_units, 500)
assert.equal(roundedPriceBody.minimum_sale_price_minor_units, 200)

let observedRequest = null
let observedProjectionRequest = null
const push = createWordPressInventoryPush({
  websiteUrl: "https://example.test",
  username: "sync-user",
  applicationPassword: "secret app password",
  defaultLocationId: 7,
  defaultOnlineVisibility: "hidden",
  defaultKioskVisibility: "staff_only",
  defaultPosVisibility: "visible",
  fetcher: async (url, init) => {
    if (url.toString().includes("/inventory-projections/")) {
      const projectionBody = JSON.parse(init.body)
      observedProjectionRequest = {
        url: url.toString(),
        headers: init.headers,
        body: projectionBody,
      }

      return Response.json(
        {
          status: "updated",
          code: "inventory_projection_updated",
          data: {
            inventory_id: 77,
            public_id: "wp-inventory-001",
            sku: projectionBody.sku,
            barcode: projectionBody.barcode,
            status: projectionBody.status,
            quantity_on_hand: projectionBody.quantity_on_hand,
            sale_price_minor_units: projectionBody.sale_price_minor_units,
            minimum_sale_price_minor_units: projectionBody.minimum_sale_price_minor_units,
            market_price_minor_units: projectionBody.market_price_minor_units,
            sale_currency: "USD",
            online_visibility: projectionBody.online_visibility,
            kiosk_visibility: projectionBody.kiosk_visibility,
            pos_visibility: projectionBody.pos_visibility,
            woocommerce_product_id: 9001,
            row_version: 3,
          },
          meta: {
            woocommerce_product_sync: {
              requested: true,
              synced: true,
              verified: true,
              product_ids: [9001],
            },
          },
        },
        { status: 200 },
      )
    }

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
        meta: {
          projections: {
            woocommerce_product_sync: {
              requested: true,
              synced: true,
              status: "executed",
              execution: {
                product_ids: [9001],
              },
              payment_capture_deferred: true,
              square_inventory_deferred: true,
              errors: [],
            },
          },
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
assert.equal(result.woocommerce_product_sync.requested, true)
assert.equal(result.woocommerce_product_sync.synced, true)
assert.deepEqual(result.woocommerce_product_sync.product_ids, [9001])
assert.equal(result.woocommerce_product_sync.payment_capture_deferred, true)
assert.equal(result.woocommerce_product_sync.square_inventory_deferred, true)
assert.equal(result.readback_verified, true)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.equal(observedRequest.url, "https://example.test/wp-json/tcg-store/v1/inventory")
assert.equal(observedRequest.headers["idempotency-key"], "op-local-charizard-001")
assert.ok(observedRequest.headers.authorization.startsWith("Basic "))
assert.equal(observedRequest.body.card_name, "Charizard")
assert.equal(observedRequest.body.status, "available")
assert.equal(observedRequest.body.location_id, 7)
assert.equal(observedRequest.body.online_visibility, "hidden")
assert.equal(observedRequest.body.kiosk_visibility, "staff_only")
assert.equal(observedRequest.body.pos_visibility, "visible")
assert.equal(observedRequest.body.sync_woocommerce_product, false)
assert.equal("production_write_approval" in observedRequest.body, false)
assert.equal(observedRequest.body.provider_variant_id, "scrydex-pokemon-base-004-holo-unlimited")
assert.equal(observedRequest.body.variant, "Unlimited Holo")
assert.equal(observedProjectionRequest.url, "https://example.test/wp-json/tcg-store/v1/inventory-projections/wp-inventory-001")
assert.equal(observedProjectionRequest.body.quantity_on_hand, 1)
assert.equal(observedProjectionRequest.body.status, "available")

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
