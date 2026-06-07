import assert from "node:assert/strict";
import {
  SQUARE_INVENTORY_ADAPTER_OUTCOME,
  planSquareInventorySyncRequest,
  planSquarePosReconciliation,
} from "../src/squareInventoryAdapter.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("Square inventory adapter prepares sandbox catalog and inventory requests", () => {
  const result = planSquareInventorySyncRequest(readyProjectionContract(), {
    environment: "sandbox",
    credentialEnvironment: "sandbox",
    accessToken: "EAAA-sandbox-token",
  });

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.READY);
  assert.equal(result.code, "square_inventory_sync_request_ready");
  assert.equal(result.details.environment, "sandbox");
  assert.equal(result.details.networkRequestDeferred, true);
  assert.equal(result.details.providerInventoryWriteDeferred, true);
  assert.equal(result.details.productionNetworkRequestDeferred, true);
  assert.equal(
    result.details.paymentCaptureAuthority,
    "official_woocommerce_square_extension",
  );
  assert.equal(result.details.pluginPaymentCapturePermitted, false);
  assert.equal(result.details.pluginCustomGatewayPermitted, false);
  assert.deepEqual(result.details.idempotencyKeys, [
    "square:inventory-projection:card-public-42:v7",
    "square:inventory-projection:card-public-42:v7:inventory",
  ]);
  assert.equal(
    result.details.requestPlan.catalogBatchUpsert.path,
    "/v2/catalog/batch-upsert",
  );
  assert.equal(
    result.details.requestPlan.inventoryBatchChange.path,
    "/v2/inventory/batch-change",
  );
  assert.deepEqual(result.details.externalIds.catalogObjectIds, [
    "#tcg-item-card-public-42",
    "#tcg-var-card-public-42",
  ]);
  assert.deepEqual(result.details.externalIds.skus, ["PKM-BASE-004-HOLO"]);
});

test("Square inventory adapter rejects production environment and live credentials", () => {
  const result = planSquareInventorySyncRequest(readyProjectionContract(), {
    environment: "production",
    accessToken: "EAA-live-production-token",
  });

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.REJECTED);
  assert.equal(result.code, "square_inventory_sync_request_rejected");
  assert.deepEqual(result.details.errors, [
    "square_inventory_sync_sandbox_environment_required",
    "square_inventory_sync_production_credentials_rejected",
  ]);
  assert.equal(result.details.requestPlan, null);
  assert.equal(result.details.paymentDelegation.customGatewayCapturePermitted, false);
});

test("Square inventory adapter rejects credentials declared as production", () => {
  const result = planSquareInventorySyncRequest(readyProjectionContract(), {
    environment: "sandbox",
    credentialEnvironment: "production",
    accessToken: "redacted-token-without-live-marker",
  });

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.REJECTED);
  assert.deepEqual(result.details.errors, [
    "square_inventory_sync_production_credentials_rejected",
  ]);
});

test("Square inventory adapter skips hidden unmapped projections without requests", () => {
  const result = planSquareInventorySyncRequest({
    provider: "square",
    status: "skipped",
    code: "square_inventory_projection_skipped",
    idempotency_key: "square:inventory-projection:hidden:v2",
    catalog_objects: [],
    inventory_changes: [],
  });

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.SKIPPED);
  assert.equal(result.details.requestPlan.catalogBatchUpsert, null);
  assert.equal(result.details.requestPlan.inventoryBatchChange, null);
  assert.deepEqual(result.details.idempotencyKeys, [
    "square:inventory-projection:hidden:v2",
  ]);
});

test("Square POS reconciliation maps Square variation IDs back to serialized inventory", () => {
  const result = planSquarePosReconciliation(
    {
      provider: "square",
      event_id: "evt-square-1",
      order_id: "order-square-1",
      line_items: [
        {
          uid: "line-1",
          catalog_object_id: "SQUARE-VARIATION-42",
          sku: "PKM-BASE-004-HOLO",
        },
      ],
    },
    [
      {
        inventoryId: 42,
        barcode: "PKM-BASE-004-HOLO",
        sku: "PKM-BASE-004-HOLO",
        squareCatalogVariationId: "SQUARE-VARIATION-42",
      },
    ],
  );

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.ACCEPTED);
  assert.equal(result.code, "square_reconciliation_mapped");
  assert.equal(result.details.routeConnectedWritesDeferred, true);
  assert.equal(result.details.inventoryMutationDeferred, true);
  assert.deepEqual(result.details.inventoryTransitions, [
    {
      inventoryId: 42,
      barcode: "PKM-BASE-004-HOLO",
      status: "sold",
      source: "square_reconciliation_only",
      externalOrderId: "order-square-1",
    },
  ]);
});

test("Square POS reconciliation creates staff conflict for unmapped provider lines", () => {
  const result = planSquarePosReconciliation(
    {
      provider: "square",
      event_id: "evt-square-2",
      order_id: "order-square-2",
      line_items: [
        {
          uid: "line-2",
          catalog_object_id: "SQUARE-UNKNOWN",
          sku: "UNKNOWN",
        },
      ],
    },
    [],
  );

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.CONFLICT);
  assert.equal(result.code, "square_reconciliation_unmapped_lines");
  assert.equal(result.details.requiresManagerReview, true);
  assert.equal(result.details.routeConnectedWritesDeferred, true);
  assert.equal(result.details.inventoryMutationDeferred, true);
  assert.deepEqual(result.details.mappedLines, []);
  assert.deepEqual(result.details.unmappedLines, [
    {
      catalogObjectId: "SQUARE-UNKNOWN",
      sku: "UNKNOWN",
      name: "",
    },
  ]);
});

function readyProjectionContract() {
  return {
    provider: "square",
    status: "ready",
    code: "square_inventory_projection_ready",
    idempotency_key: "square:inventory-projection:card-public-42:v7",
    source_of_truth: "tcg_store_platform",
    catalog_objects: [
      {
        type: "ITEM",
        id: "#tcg-item-card-public-42",
        item_data: {
          name: "POKEMON - Charizard",
          variations: [
            {
              type: "ITEM_VARIATION",
              id: "#tcg-var-card-public-42",
              item_variation_data: {
                sku: "PKM-BASE-004-HOLO",
                track_inventory: true,
                price_money: {
                  amount: 12500,
                  currency: "USD",
                },
              },
            },
          ],
        },
      },
    ],
    inventory_changes: [
      {
        type: "PHYSICAL_COUNT",
        physical_count: {
          catalog_object_id: "#tcg-var-card-public-42",
          location_id: "L-SANDBOX-1",
          quantity: "1",
          state: "IN_STOCK",
        },
      },
    ],
  };
}
