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
  squareReconciliationItem("wp-square-return-1", "PUG-SQ-RETURN-01", "SQ-VAR-RETURN", "sold", 0),
  squareReconciliationItem("wp-square-ambiguous-1", "PUG-SQ-AMBIG-01", "SQ-VAR-AMBIG", "sold", 0),
  squareReconciliationItem("wp-square-ambiguous-2", "PUG-SQ-AMBIG-02", "SQ-VAR-AMBIG", "sold", 0),
  squareReconciliationItem("wp-square-overage-active", "PUG-SQ-OVER-01", "SQ-VAR-AVAILABLE-OVER", "available", 1),
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
        assert.deepEqual(catalogObjectIds, [
          "SQ-VAR-1",
          "SQ-VAR-2",
          "SQ-VAR-RETURN",
          "SQ-VAR-AMBIG",
          "SQ-VAR-AVAILABLE-OVER",
        ])
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
            {
              catalog_object_id: "SQ-VAR-RETURN",
              location_id: "LOC-PUG-1",
              state: "IN_STOCK",
              quantity: "1",
            },
            {
              catalog_object_id: "SQ-VAR-AMBIG",
              location_id: "LOC-PUG-1",
              state: "IN_STOCK",
              quantity: "1",
            },
            {
              catalog_object_id: "SQ-VAR-AVAILABLE-OVER",
              location_id: "LOC-PUG-1",
              state: "IN_STOCK",
              quantity: "2",
            },
          ],
          count_count: 5,
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
      },
    },
    wordpressInventoryUpdatePush: async ({ operation, item }) => {
      wordpressUpdatePushCalls += 1
      assert.equal(operation.operation_type, "inventory_update")
      assert.equal([
        "square_inventory_count_reconciliation_quantity_update",
        "square_inventory_return_review_quantity_update",
      ].includes(operation.payload.sync_intent), true)
      assert.match(operation.payload.inventory_public_id, /^wp-square-(?:reconcile|return)/)
      assert.match(operation.payload.square_catalog_variation_id, /^SQ-VAR-(?:[12]|RETURN)$/)
      assert.equal(operation.payload.quantity_update_mode, "absolute")
      assert.equal(["sold", "available", "return_review"].includes(item.status), true)
      assert.match(item.barcode, /^PUG-SQ-(?:RECON|RETURN)/)
      pushedBarcodes.push(item.barcode)

      return {
        status: "ok",
        readback_verified: true,
        wordpress_readback: { quantity_on_hand: item.quantity_on_hand },
        wordpress_verification: { verified: true },
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
  assert.equal(reconciliation.overage_count, 3)
  assert.equal(reconciliation.actionable_overage_count, 2)
  assert.equal(reconciliation.returned_to_review_count, 0)
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
  assert.equal(appliedReconciliation.returned_to_review_count, 1)
  assert.equal(appliedReconciliation.actionable_overage_count, 2)
  assert.equal(appliedReconciliation.shortage_count, 3)
  assert.equal(appliedReconciliation.wordpress_accepted_count, 4)
  assert.equal(appliedReconciliation.local_queue_depth, 0)
  assert.equal(squarePullCalls, 2)
  assert.equal(wordpressUpdatePushCalls, 4)
  assert.deepEqual(pushedBarcodes.sort(), [
    "PUG-SQ-RECON-01",
    "PUG-SQ-RECON-DELTA-01",
    "PUG-SQ-RECON-DELTA-02",
    "PUG-SQ-RETURN-01",
  ])

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
  const returnedItem = after.items.find((item) => item.barcode === "PUG-SQ-RETURN-01")
  assert.equal(returnedItem.status, "return_review")
  assert.equal(returnedItem.quantity_on_hand, 1)
  assert.equal(returnedItem.online_visibility, "hidden")
  assert.equal(returnedItem.kiosk_visibility, "hidden")
  assert.equal(
    after.items.filter((item) => item.square_catalog_variation_id === "SQ-VAR-AMBIG" && item.status === "sold").length,
    2,
  )
  const activeOverage = after.items.find((item) => item.barcode === "PUG-SQ-OVER-01")
  assert.equal(activeOverage.status, "available")
  assert.equal(activeOverage.quantity_on_hand, 1)
  assert.equal(after.items.every((item) => item.quantity_on_hand >= 0), true)

  const idempotentReturn = await fetchJson(`${baseUrl}/pos/square/sales/reconcile`, {
    method: "POST",
    token: managerAuth.session.token,
    body: { apply_count_deltas: true },
  })
  assert.equal(idempotentReturn.returned_to_review_count, 0)
  assert.equal(idempotentReturn.sold_count, 0)
  assert.equal(idempotentReturn.actionable_overage_count, 2)
  assert.equal(wordpressUpdatePushCalls, 4)

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)
  assert.equal(syncStatus.square_inventory_count_poller_connected, true)
  assert.equal(syncStatus.last_square_inventory_reconciliation.sold_count, 0)
  assert.equal(syncStatus.last_square_inventory_reconciliation.apply_count_deltas, true)
  assert.equal(JSON.stringify(syncStatus).includes("EAAA"), false)

  console.log("PASS local sync Square inventory reconciliation")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

function squareReconciliationItem(publicId, barcode, squareCatalogVariationId, status = "available", quantityOnHand = 1) {
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
    status,
    quantity_on_hand: quantityOnHand,
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
