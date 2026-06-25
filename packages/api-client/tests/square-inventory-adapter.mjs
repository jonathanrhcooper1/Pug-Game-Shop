import assert from "node:assert/strict";
import {
  SQUARE_INVENTORY_ADAPTER_OUTCOME,
  planSquareBarcodeSkuInventoryPull,
  planSquareInventoryCountReconciliation,
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
    "/v2/inventory/changes/batch-create",
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

test("Square barcode/SKU pull planning maps WordPress inventory rows to Square count pulls", () => {
  const result = planSquareBarcodeSkuInventoryPull(
    [
      {
        inventory_id: 42,
        public_id: "card-public-42",
        barcode: "PKM-BASE-004-HOLO",
        sku: "PKM-BASE-004-HOLO",
        square_catalog_item_id: "SQUARE-ITEM-42",
        square_catalog_variation_id: "SQUARE-VARIATION-42",
        square_location_id: "L-SANDBOX-1",
        status: "available",
        pos_visibility: "visible",
        row_version: 7,
      },
      {
        inventory_id: 43,
        public_id: "card-public-43",
        barcode: "MTG-LEA-001",
        square_catalog_variation_id: "SQUARE-VARIATION-43",
        square_location_id: "L-SANDBOX-1",
        status: "sold",
        pos_visibility: "visible",
      },
    ],
    {
      environment: "sandbox",
      credentialEnvironment: "sandbox",
      accessToken: "EAAA-sandbox-token",
      limit: 250,
      updatedAfter: "2026-06-09T12:00:00Z",
    },
  );

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.READY);
  assert.equal(result.code, "square_inventory_pull_expectation_ready");
  assert.equal(result.details.sourceOfTruth, "tcg_store_platform");
  assert.equal(result.details.networkRequestDeferred, true);
  assert.equal(result.details.providerInventoryReadDeferred, true);
  assert.equal(result.details.squarePaymentCaptureSupported, false);
  assert.equal(
    result.details.paymentCaptureAuthority,
    "official_woocommerce_square_extension",
  );
  assert.equal(result.details.requestPlan.path, "/v2/inventory/counts/batch-retrieve");
  assert.deepEqual(result.details.requestPlan.body.catalog_object_ids, [
    "SQUARE-VARIATION-42",
    "SQUARE-VARIATION-43",
  ]);
  assert.deepEqual(result.details.requestPlan.body.location_ids, ["L-SANDBOX-1"]);
  assert.deepEqual(result.details.requestPlan.body.states, ["IN_STOCK"]);
  assert.equal(result.details.requestPlan.body.limit, 250);
  assert.equal(
    result.details.requestPlan.body.updated_after,
    "2026-06-09T12:00:00.000Z",
  );
  assert.equal(result.details.barcodeMappings[0].expectedSquareVariation.sku, "PKM-BASE-004-HOLO");
  assert.equal(result.details.barcodeMappings[0].expectedSquareVariation.track_inventory, true);
  assert.equal(result.details.barcodeMappings[0].expectedSquareCountPull.expected_serialized_quantity, "1");
  assert.equal(result.details.barcodeMappings[1].sku, "MTG-LEA-001");
  assert.equal(result.details.barcodeMappings[1].expectedSquareCountPull.expected_serialized_quantity, "0");
  assert.deepEqual(result.details.barcodeMappings[0].squarePosLineMatchKeys, [
    "SQUARE-VARIATION-42",
    "PKM-BASE-004-HOLO",
  ]);
  assert.deepEqual(result.details.externalIds.skus, [
    "PKM-BASE-004-HOLO",
    "MTG-LEA-001",
  ]);
  assert.equal(result.details.expectations.wordpressSerializedInventoryRemainsAuthoritative, true);
});

test("Square barcode/SKU pull planning flags missing mappings for staff review", () => {
  const result = planSquareBarcodeSkuInventoryPull(
    [
      {
        inventory_id: 42,
        public_id: "card-public-42",
        barcode: "PKM-BASE-004-HOLO",
        square_catalog_variation_id: "SQUARE-VARIATION-42",
        square_location_id: "L-SANDBOX-1",
      },
      {
        inventory_id: 44,
        public_id: "card-public-44",
        barcode: "PKM-BASE-004-HOLO",
        square_location_id: "L-SANDBOX-1",
      },
    ],
    {
      environment: "sandbox",
    },
  );

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.CONFLICT);
  assert.equal(result.code, "square_inventory_pull_mapping_requires_review");
  assert.equal(result.details.requestPlan.path, "/v2/inventory/counts/batch-retrieve");
  assert.deepEqual(result.details.requestPlan.body.catalog_object_ids, []);
  assert.equal(result.details.unresolvedMappings.length, 2);
  assert.ok(result.details.unresolvedMappings[0].errors.includes("duplicate_barcode_or_sku"));
  assert.ok(result.details.unresolvedMappings[1].errors.includes("duplicate_barcode_or_sku"));
  assert.ok(
    result.details.unresolvedMappings[1].errors.includes(
      "square_catalog_variation_id_required_for_inventory_pull",
    ),
  );
  assert.equal(result.details.networkRequestDeferred, true);
});

test("Square barcode/SKU pull planning rejects production context and live credentials", () => {
  const result = planSquareBarcodeSkuInventoryPull(
    [
      {
        inventory_id: 42,
        barcode: "PKM-BASE-004-HOLO",
        square_catalog_variation_id: "SQUARE-VARIATION-42",
        square_location_id: "L-SANDBOX-1",
      },
    ],
    {
      environment: "production",
      accessToken: "EAA-live-production-token",
    },
  );

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.REJECTED);
  assert.deepEqual(result.details.errors, [
    "square_inventory_pull_sandbox_environment_required",
    "square_inventory_pull_production_credentials_rejected",
  ]);
  assert.equal(result.details.requestPlan, null);
  assert.equal(result.details.pluginPaymentCapturePermitted, false);
});

test("Square count reconciliation matches returned counts to serialized inventory", () => {
  const result = planSquareInventoryCountReconciliation(
    [
      {
        inventory_id: 42,
        public_id: "card-public-42",
        barcode: "PKM-BASE-004-HOLO",
        sku: "PKM-BASE-004-HOLO",
        square_catalog_item_id: "SQUARE-ITEM-42",
        square_catalog_variation_id: "SQUARE-VARIATION-42",
        square_location_id: "L-SANDBOX-1",
        status: "available",
        pos_visibility: "visible",
      },
      {
        inventory_id: 43,
        public_id: "card-public-43",
        barcode: "MTG-LEA-001",
        square_catalog_variation_id: "SQUARE-VARIATION-43",
        square_location_id: "L-SANDBOX-1",
        status: "sold",
        pos_visibility: "visible",
      },
    ],
    {
      counts: [
        {
          catalog_object_id: "SQUARE-VARIATION-42",
          location_id: "L-SANDBOX-1",
          quantity: "1",
          state: "IN_STOCK",
        },
        {
          catalog_object_id: "SQUARE-VARIATION-43",
          location_id: "L-SANDBOX-1",
          quantity: "0",
          state: "IN_STOCK",
        },
      ],
    },
    {
      environment: "sandbox",
      squareLocationId: "L-SANDBOX-1",
    },
  );

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.ACCEPTED);
  assert.equal(result.code, "square_inventory_count_reconciliation_matched");
  assert.equal(result.details.providerInventoryReadAlreadyPerformed, true);
  assert.equal(result.details.providerInventoryWriteDeferred, true);
  assert.equal(result.details.squarePaymentCaptureSupported, false);
  assert.equal(result.details.summary.matched_count, 2);
  assert.equal(result.details.summary.mismatched_count, 0);
  assert.equal(result.details.summary.missing_square_count, 0);
  assert.equal(result.details.summary.unexpected_square_count, 0);
  assert.equal(result.details.summary.expected_total_quantity, "1");
  assert.equal(result.details.summary.actual_total_quantity, "1");
  assert.deepEqual(
    result.details.comparisons.map((comparison) => comparison.status),
    ["matched", "matched"],
  );
});

test("Square count reconciliation creates review conflicts for mismatch, missing, and unexpected counts", () => {
  const result = planSquareInventoryCountReconciliation(
    [
      {
        inventory_id: 42,
        public_id: "card-public-42",
        barcode: "PKM-BASE-004-HOLO",
        square_catalog_variation_id: "SQUARE-VARIATION-42",
        square_location_id: "L-SANDBOX-1",
        status: "available",
        pos_visibility: "visible",
      },
      {
        inventory_id: 43,
        public_id: "card-public-43",
        barcode: "MTG-LEA-001",
        square_catalog_variation_id: "SQUARE-VARIATION-43",
        square_location_id: "L-SANDBOX-1",
        status: "available",
        pos_visibility: "visible",
      },
    ],
    {
      inventory_counts: [
        {
          catalog_object_id: "SQUARE-VARIATION-42",
          location_id: "L-SANDBOX-1",
          quantity: "3",
          state: "IN_STOCK",
        },
        {
          catalog_object_id: "SQUARE-UNEXPECTED",
          location_id: "L-SANDBOX-1",
          quantity: "2",
          state: "IN_STOCK",
        },
      ],
    },
    {
      environment: "sandbox",
      squareLocationId: "L-SANDBOX-1",
    },
  );

  assert.equal(result.status, SQUARE_INVENTORY_ADAPTER_OUTCOME.CONFLICT);
  assert.equal(result.code, "square_inventory_count_reconciliation_requires_review");
  assert.equal(result.details.summary.matched_count, 0);
  assert.equal(result.details.summary.mismatched_count, 1);
  assert.equal(result.details.summary.missing_square_count, 1);
  assert.equal(result.details.summary.unexpected_square_count, 1);
  assert.equal(result.details.comparisons[0].status, "mismatch");
  assert.equal(result.details.comparisons[0].actualSquareQuantity, "3");
  assert.equal(result.details.comparisons[1].status, "missing_square_count");
  assert.equal(
    result.details.unexpectedSquareCounts[0].issue,
    "square_count_without_wordpress_mapping",
  );
  assert.equal(result.details.providerInventoryWriteDeferred, true);
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
