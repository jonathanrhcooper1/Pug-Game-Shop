import assert from "node:assert/strict"

import { createSquareCatalogInventorySyncer } from "../src/squareCatalogInventorySyncer.mjs"

const requests = []
const syncer = createSquareCatalogInventorySyncer({
  accessToken: "test-square-token",
  environment: "production",
  locationId: "LB1B9Z4GVG1BH",
  fetcher: async (url, options = {}) => {
    if (String(url) === "https://images.example/card.png") {
      return {
        ok: true,
        status: 200,
        headers: new Map([["content-type", "image/png"]]),
        async arrayBuffer() {
          return new Uint8Array([137, 80, 78, 71]).buffer
        },
      }
    }

    const parsedBody = options.body && typeof options.body === "string" ? JSON.parse(String(options.body)) : null
    requests.push({
      url: String(url),
      method: options.method ?? "GET",
      headers: options.headers ?? {},
      body: parsedBody,
      bodyKind: options.body?.constructor?.name ?? "",
    })

    if (String(url).endsWith("/v2/catalog/search")) {
      return jsonResponse(200, { objects: [] })
    }

    if (String(url).includes("/v2/catalog/object/SQUARE-GRADED-VARIATION")) {
      return jsonResponse(200, {
        object: {
          type: "ITEM_VARIATION",
          id: "SQUARE-GRADED-VARIATION",
          version: 12,
          item_variation_data: {
            item_id: "SQUARE-GRADED-ITEM",
            sku: "PUG-GRADED-CHARIZARD",
          },
        },
        related_objects: [
          {
            type: "ITEM",
            id: "SQUARE-GRADED-ITEM",
            version: 4,
          },
        ],
      })
    }

    if (String(url).endsWith("/v2/catalog/batch-upsert")) {
      const firstObject = parsedBody?.batches?.[0]?.objects?.[0]

      if (firstObject?.type === "CATEGORY") {
        const categoryName = String(firstObject.category_data?.name ?? "Category")
          .replace(/[^A-Za-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .toUpperCase()
        const parentSuffix = firstObject.category_data?.parent_category?.id ? "-CHILD" : "-ROOT"
        return jsonResponse(200, {
          id_mappings: [
            {
              client_object_id: firstObject.id,
              object_id: `SQUARE-CATEGORY-${categoryName}${parentSuffix}`,
            },
          ],
          objects: [],
        })
      }

      return jsonResponse(200, {
        id_mappings: [
          { client_object_id: "#pug_catalog_item", object_id: "SQUARE-ITEM-1" },
          { client_object_id: "#pug_catalog_variation", object_id: "SQUARE-VARIATION-1" },
        ],
        objects: [],
      })
    }

    if (String(url).endsWith("/v2/catalog/images")) {
      return jsonResponse(200, {
        image: {
          id: "SQUARE-IMAGE-1",
          type: "IMAGE",
        },
      })
    }

    if (String(url).endsWith("/v2/inventory/changes/batch-create")) {
      return jsonResponse(200, {
        counts: [
          {
            catalog_object_id: "SQUARE-VARIATION-1",
            location_id: "LB1B9Z4GVG1BH",
            quantity: "3",
            state: "IN_STOCK",
          },
        ],
      })
    }

    return jsonResponse(404, { errors: [{ code: "NOT_FOUND" }] })
  },
})

assert.equal(syncer.status().configured, true)
assert.equal(syncer.status().environment, "production")
assert.equal(syncer.status().raw_credentials_returned, false)
assert.equal(syncer.status().default_pos_singles_layout_enabled, true)
assert.deepEqual(syncer.status().default_pos_singles_categories, ["Singles", "MTG", "Lorcana", "Riftbound", "Pokemon"])

const layout = await syncer.ensureDefaultSquarePosCategories()

assert.equal(layout.status, "ok")
assert.equal(layout.code, "square_pos_singles_layout_ready")
assert.equal(layout.category_count, 5)
assert.deepEqual(
  layout.categories.map((category) => category.name),
  ["Singles", "MTG", "Lorcana", "Riftbound", "Pokemon"],
)
assert.equal(layout.credentials_synced_to_client, false)
assert.equal(layout.raw_credentials_returned, false)

const result = await syncer.syncInventoryItem({
  operation: {
    operation_id: "op-square-create-1",
    operation_type: "inventory_intake",
    entity_id: "local-inventory-1",
  },
  item: {
    public_id: "local-inventory-1",
    row_version: 1,
    game: "magic",
    card_name: "Gemstone Caverns",
    set_code: "TSR",
    card_number: "280",
    condition: "NM",
    variant: "normal",
    barcode: "PUG-MTG-TSR-280-NM",
    price_minor_units: 1500,
    quantity_on_hand: 3,
    currency: "USD",
    status: "available",
    pos_visibility: "visible",
    image_url: "https://images.example/card.png",
  },
})

assert.equal(result.status, "ok")
assert.equal(result.square_catalog_item_id, "SQUARE-ITEM-1")
assert.equal(result.square_catalog_variation_id, "SQUARE-VARIATION-1")
assert.equal(result.square_location_id, "LB1B9Z4GVG1BH")
assert.equal(result.quantity_on_hand, 3)
assert.deepEqual(result.square_category_ids, ["SQUARE-CATEGORY-SINGLES-ROOT", "SQUARE-CATEGORY-MTG-CHILD"])
assert.equal(result.square_image_id, "SQUARE-IMAGE-1")
assert.equal(result.image_sync_status, "ok")
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.raw_credentials_returned, false)

const searchRequest = requests.find((request) => request.url.endsWith("/v2/catalog/search"))
const catalogRequest = requests.find((request) =>
  request.url.endsWith("/v2/catalog/batch-upsert") && request.body?.batches?.[0]?.objects?.[0]?.type === "ITEM",
)
const categoryRequests = requests.filter((request) =>
  request.url.endsWith("/v2/catalog/batch-upsert") && request.body?.batches?.[0]?.objects?.[0]?.type === "CATEGORY",
)
const inventoryRequest = requests.find((request) => request.url.endsWith("/v2/inventory/changes/batch-create"))
const imageRequest = requests.find((request) => request.url.endsWith("/v2/catalog/images"))

assert.ok(searchRequest, "expected Square catalog search request")
assert.ok(catalogRequest, "expected Square catalog batch upsert request")
assert.equal(categoryRequests.length, 5, "expected default POS Singles category tree upsert requests")
assert.ok(inventoryRequest, "expected Square inventory physical count request")
assert.ok(imageRequest, "expected Square image upload request")
assert.equal(catalogRequest.body.batches[0].objects[0].present_at_location_ids[0], "LB1B9Z4GVG1BH")
assert.deepEqual(catalogRequest.body.batches[0].objects[0].item_data.categories, [
  { id: "SQUARE-CATEGORY-SINGLES-ROOT" },
  { id: "SQUARE-CATEGORY-MTG-CHILD" },
])
assert.ok(
  categoryRequests.some((request) =>
    request.body.batches[0].objects[0].category_data.parent_category?.id === "SQUARE-CATEGORY-SINGLES-ROOT" &&
    request.body.batches[0].objects[0].category_data.name === "Pokemon"
  ),
  "expected Pokemon to be created under Singles",
)
assert.equal(catalogRequest.body.batches[0].objects[0].item_data.variations[0].item_variation_data.sku, "PUG-MTG-TSR-280-NM")
assert.equal(catalogRequest.body.batches[0].objects[0].item_data.variations[0].item_variation_data.price_money.amount, 1500)
assert.equal(catalogRequest.body.batches[0].objects[0].item_data.variations[0].item_variation_data.track_inventory, true)
assert.equal(inventoryRequest.body.changes[0].physical_count.catalog_object_id, "SQUARE-VARIATION-1")
assert.equal(inventoryRequest.body.changes[0].physical_count.location_id, "LB1B9Z4GVG1BH")
assert.equal(inventoryRequest.body.changes[0].physical_count.quantity, "3")
assert.equal(JSON.stringify(result).includes("test-square-token"), false)

requests.length = 0
const sealedResult = await syncer.syncInventoryItem({
  operation: {
    operation_id: "op-square-sealed-1",
    operation_type: "inventory_intake",
    entity_id: "local-sealed-1",
  },
  item: {
    public_id: "local-sealed-1",
    row_version: 1,
    game: "riftbound",
    card_name: "Riftbound Booster Box",
    set_name: "Sealed Product",
    condition: "SEALED",
    raw_or_graded: "sealed",
    barcode: "PUG-RIFT-BOOSTER-BOX",
    price_minor_units: 12000,
    quantity_on_hand: 2,
    currency: "USD",
    status: "available",
    pos_visibility: "visible",
  },
})
const sealedCatalogRequest = requests.find((request) =>
  request.url.endsWith("/v2/catalog/batch-upsert") && request.body?.batches?.[0]?.objects?.[0]?.type === "ITEM",
)
const sealedCategoryRequests = requests.filter((request) =>
  request.url.endsWith("/v2/catalog/batch-upsert") && request.body?.batches?.[0]?.objects?.[0]?.type === "CATEGORY",
)

assert.equal(sealedResult.status, "ok")
assert.deepEqual(sealedResult.square_category_ids, ["SQUARE-CATEGORY-SEALED-ROOT", "SQUARE-CATEGORY-RIFTBOUND-CHILD"])
assert.ok(sealedCatalogRequest, "expected Square sealed product catalog upsert request")
assert.ok(
  sealedCategoryRequests.some((request) =>
    request.body.batches[0].objects[0].category_data.name === "Sealed" &&
    !request.body.batches[0].objects[0].category_data.parent_category?.id
  ),
  "expected Sealed root category",
)
assert.ok(
  sealedCategoryRequests.some((request) =>
    request.body.batches[0].objects[0].category_data.parent_category?.id === "SQUARE-CATEGORY-SEALED-ROOT" &&
    request.body.batches[0].objects[0].category_data.name === "Riftbound"
  ),
  "expected Riftbound to be created under Sealed",
)
assert.deepEqual(sealedCatalogRequest.body.batches[0].objects[0].item_data.categories, [
  { id: "SQUARE-CATEGORY-SEALED-ROOT" },
  { id: "SQUARE-CATEGORY-RIFTBOUND-CHILD" },
])
assert.equal(sealedCatalogRequest.body.batches[0].objects[0].item_data.variations[0].item_variation_data.name, "Sealed")

requests.length = 0
const kioskHiddenResult = await syncer.syncInventoryItem({
  operation: {
    operation_id: "op-square-kiosk-hidden-1",
    operation_type: "inventory_intake",
    entity_id: "local-kiosk-hidden-1",
  },
  item: {
    public_id: "local-kiosk-hidden-1",
    game: "pokemon",
    card_name: "Hidden Kiosk Card",
    condition: "NM",
    barcode: "PUG-HIDDEN-KIOSK",
    price_minor_units: 500,
    quantity_on_hand: 1,
    currency: "USD",
    status: "available",
    kiosk_visibility: "hidden",
    pos_visibility: "visible",
  },
})

assert.equal(kioskHiddenResult.status, "skipped")
assert.equal(kioskHiddenResult.code, "square_kiosk_visibility_hidden")
assert.equal(requests.length, 0, "expected no Square request for unmapped kiosk-hidden rows")

requests.length = 0
const posHiddenKioskVisibleResult = await syncer.syncInventoryItem({
  operation: {
    operation_id: "op-square-pos-hidden-1",
    operation_type: "inventory_intake",
    entity_id: "local-pos-hidden-1",
  },
  item: {
    public_id: "local-pos-hidden-1",
    game: "pokemon",
    card_name: "Kiosk Visible Card",
    condition: "NM",
    barcode: "PUG-KIOSK-VISIBLE",
    price_minor_units: 600,
    quantity_on_hand: 2,
    currency: "USD",
    status: "available",
    kiosk_visibility: "visible",
    pos_visibility: "hidden",
  },
})

assert.equal(posHiddenKioskVisibleResult.status, "ok")
assert.equal(posHiddenKioskVisibleResult.quantity_on_hand, 2)

requests.length = 0
const gradedExistingResult = await syncer.syncInventoryItem({
  operation: {
    operation_id: "op-square-graded-existing-1",
    operation_type: "inventory_update",
    entity_id: "local-graded-1",
  },
  item: {
    public_id: "local-graded-1",
    row_version: 8,
    game: "pokemon",
    card_name: "Charizard",
    set_code: "BASE",
    card_number: "4",
    raw_or_graded: "graded",
    grading_company: "PSA",
    grade: "9",
    barcode: "PUG-GRADED-CHARIZARD",
    price_minor_units: 95000,
    quantity_on_hand: 1,
    currency: "USD",
    status: "available",
    kiosk_visibility: "visible",
    square_catalog_item_id: "SQUARE-GRADED-ITEM",
    square_catalog_variation_id: "SQUARE-GRADED-VARIATION",
  },
})
const gradedCatalogRequest = requests.find((request) =>
  request.url.endsWith("/v2/catalog/batch-upsert") &&
  request.body?.batches?.[0]?.objects?.some((object) => object?.type === "ITEM_VARIATION")
)
const gradedItemObject = gradedCatalogRequest?.body?.batches?.[0]?.objects?.find((object) => object?.type === "ITEM")
const gradedVariationObject = gradedCatalogRequest?.body?.batches?.[0]?.objects?.find(
  (object) => object?.type === "ITEM_VARIATION",
)

assert.equal(gradedExistingResult.status, "ok")
assert.equal(gradedExistingResult.category_sync_status, "existing_item_skipped")
assert.equal(gradedItemObject, undefined, "existing Square item category refresh should not block inventory retries")
assert.equal(gradedVariationObject.item_variation_data.sku, "PUG-GRADED-CHARIZARD")

console.log("Square catalog inventory syncer contract passed")

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body
    },
  }
}
