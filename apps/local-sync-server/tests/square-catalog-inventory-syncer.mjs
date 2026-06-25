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
assert.equal(catalogRequest.body.batches[0].objects[0].item_data.variations[0].item_variation_data.track_inventory, true)
assert.equal(inventoryRequest.body.changes[0].physical_count.catalog_object_id, "SQUARE-VARIATION-1")
assert.equal(inventoryRequest.body.changes[0].physical_count.location_id, "LB1B9Z4GVG1BH")
assert.equal(inventoryRequest.body.changes[0].physical_count.quantity, "3")
assert.equal(JSON.stringify(result).includes("test-square-token"), false)

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
