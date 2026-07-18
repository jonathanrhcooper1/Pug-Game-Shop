import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

let wordpressUpdatePushCalls = 0
let squarePullCalls = 0
const pushedBarcodes = []

const wordpressInventoryItems = [
  squareReconciliationItem("wp-square-reconcile-1", "PUG-SQ-RECON-01", "SQ-VAR-1"),
  ...Array.from({ length: 5 }, (_, index) =>
    squareReconciliationItem(`wp-square-reconcile-delta-${index + 1}`, `PUG-SQ-RECON-DELTA-0${index + 1}`, "SQ-VAR-2"),
  ),
]

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://example.test/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath: ":memory:",
    squareLocationId: "LOC-PUG-1",
    squareEnvironment: "production",
    wordpressInventoryPull: async () => ({
      status: "ok",
      items: wordpressInventoryItems,
      meta: {
        page: 1,
        page_size: 10,
        total: wordpressInventoryItems.length,
        has_more: false,
      },
      credentials_synced_to_client: false,
      authorization_header_printed: false,
    }),
    squareInventoryCountsPuller: {
      status: () => ({
        configured: true,
        environment: "production",
        location_id_configured: true,
        access_token_configured: true,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }),
      pullCounts: async ({ catalogObjectIds, locationId }) => {
        squarePullCalls += 1
        assert.deepEqual(catalogObjectIds, ["SQ-VAR-1", "SQ-VAR-2"])
        assert.equal(locationId, "LOC-PUG-1")

        return {
          status: "ok",
          code: "square_inventory_counts_pulled",
          counts: [
            {
              catalog_object_id: "SQ-VAR-1",
              location_id: "LOC-PUG-1",
              state: "IN_STOCK",
              quantity: "0",
            },
            {
              catalog_object_id: "SQ-VAR-2",
              location_id: "LOC-PUG-1",
              state: "IN_STOCK",
              quantity: "3",
            },
          ],
          count_count: 2,
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
      },
    },
    wordpressInventoryUpdatePush: async ({ operation, item }) => {
      wordpressUpdatePushCalls += 1
      assert.equal(operation.operation_type, "inventory_update")
      assert.equal(operation.payload.sync_intent, "square_inventory_count_reconciliation_quantity_update")
      assert.match(operation.payload.inventory_public_id, /^wp-square-reconcile/)
      assert.match(operation.payload.square_catalog_variation_id, /^SQ-VAR-[12]$/)
      assert.equal(operation.payload.quantity_update_mode, "absolute")
      assert.equal(item.status === "sold" || item.status === "available", true)
      assert.match(item.barcode, /^PUG-SQ-RECON/)
      pushedBarcodes.push(item.barcode)

      return {
        status: "ok",
        code: "wordpress_inventory_item_updated",
        http_status: 200,
        wordpress_code: "inventory_item_updated",
        inventory: {
          public_id: item.wordpress_public_id || item.public_id,
          sku: item.barcode,
          barcode: item.barcode,
          status: item.status,
          quantity_on_hand: item.quantity_on_hand,
          row_version: 4,
        },
        woocommerce_product_sync: {
          requested: true,
          synced: true,
          status: "executed",
          product_ids: [2592],
          errors: [],
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
  const managerAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "9999" },
  })

  await fetchJson(`${baseUrl}/sync/pull`, {
    method: "POST",
    token: managerAuth.session.token,
    body: {
      domains: ["inventory"],
      query: "square",
      page: 1,
      page_size: 10,
      manual_remote_authority: true,
    },
  })

  const before = await fetchJson(`${baseUrl}/inventory/search?q=Square%20Reconcile`)
  assert.equal(before.items.find((item) => item.barcode === "PUG-SQ-RECON-01")?.status, "available")
  assert.equal(
    before.items.filter((item) => item.square_catalog_variation_id === "SQ-VAR-2" && item.status === "available").length,
    5,
  )

  const reconciliation = await fetchJson(`${baseUrl}/pos/square/sales/reconcile`, {
    method: "POST",
    token: managerAuth.session.token,
    body: {},
  })

  assert.equal(reconciliation.status, "ok")
  assert.equal(reconciliation.code, "square_inventory_counts_compared_read_only")
  assert.equal(reconciliation.apply_count_deltas, false)
  assert.equal(reconciliation.sold_count, 0)
  assert.equal(reconciliation.would_apply_sold_count, 3)
  assert.equal(reconciliation.shortage_count, 3)
  assert.equal(reconciliation.comparisons.find((row) => row.square_catalog_variation_id === "SQ-VAR-2")?.sold_quantity, 2)
  assert.equal(reconciliation.wordpress_accepted_count, 0)
  assert.equal(reconciliation.local_queue_depth, 0)
  assert.equal(squarePullCalls, 1)
  assert.equal(wordpressUpdatePushCalls, 0)

  const afterReadOnly = await fetchJson(`${baseUrl}/inventory/search?q=Square%20Reconcile`)
  assert.equal(afterReadOnly.items.find((item) => item.barcode === "PUG-SQ-RECON-01")?.status, "available")
  assert.equal(
    afterReadOnly.items.filter((item) => item.square_catalog_variation_id === "SQ-VAR-2" && item.status === "available").length,
    5,
  )

  const appliedReconciliation = await fetchJson(`${baseUrl}/pos/square/sales/reconcile`, {
    method: "POST",
    token: managerAuth.session.token,
    body: {
      apply_count_deltas: true,
    },
  })

  assert.equal(appliedReconciliation.status, "ok")
  assert.equal(appliedReconciliation.code, "square_inventory_counts_reconciled")
  assert.equal(appliedReconciliation.apply_count_deltas, true)
  assert.equal(appliedReconciliation.sold_count, 3)
  assert.equal(appliedReconciliation.shortage_count, 3)
  assert.equal(appliedReconciliation.wordpress_accepted_count, 3)
  assert.equal(appliedReconciliation.local_queue_depth, 0)
  assert.equal(squarePullCalls, 2)
  assert.equal(wordpressUpdatePushCalls, 3)
  assert.deepEqual(pushedBarcodes.sort(), ["PUG-SQ-RECON-01", "PUG-SQ-RECON-DELTA-01", "PUG-SQ-RECON-DELTA-02"])

  const after = await fetchJson(`${baseUrl}/inventory/search?q=Square%20Reconcile`)
  assert.equal(after.items.find((item) => item.barcode === "PUG-SQ-RECON-01")?.status, "sold")
  assert.equal(
    after.items.filter((item) => item.square_catalog_variation_id === "SQ-VAR-2" && item.status === "available").length,
    3,
  )
  assert.equal(
    after.items.filter((item) => item.square_catalog_variation_id === "SQ-VAR-2" && item.status === "sold").length,
    2,
  )

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)
  assert.equal(syncStatus.square_inventory_count_poller_connected, true)
  assert.equal(syncStatus.last_square_inventory_reconciliation.sold_count, 3)
  assert.equal(syncStatus.last_square_inventory_reconciliation.apply_count_deltas, true)
  assert.equal(JSON.stringify(syncStatus).includes("EAAA"), false)

  console.log("PASS local sync Square inventory reconciliation")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

function squareReconciliationItem(publicId, barcode, squareCatalogVariationId) {
  return {
    public_id: publicId,
    row_version: 3,
    game: "pokemon",
    card_name: "Square Reconcile Test Card",
    set_name: "Connector Test",
    condition_code: "NM",
    barcode,
    sale_price: "5.00",
    sale_currency: "USD",
    status: "available",
    front_image_remote_url: "https://example.test/card.png",
    online_visibility: "visible",
    kiosk_visibility: "visible",
    pos_visibility: "visible",
    square_catalog_item_id: "SQ-ITEM-1",
    square_catalog_variation_id: squareCatalogVariationId,
  }
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
