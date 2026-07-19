import assert from "node:assert/strict";
import {
  WOOCOMMERCE_PRODUCT_ADAPTER_OUTCOME,
  planWooCommerceProductWriteRequest,
} from "../src/woocommerceProductAdapter.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("WooCommerce product adapter prepares staging create and update requests", () => {
  const result = planWooCommerceProductWriteRequest(readyWritePlan(), {
    environment: "staging",
    credentialEnvironment: "staging",
    consumerKey: "ck_test_redacted",
    consumerSecret: "cs_test_redacted",
  });

  assert.equal(result.status, WOOCOMMERCE_PRODUCT_ADAPTER_OUTCOME.READY);
  assert.equal(result.code, "woocommerce_product_write_request_ready");
  assert.equal(result.details.environment, "staging");
  assert.equal(result.details.productWriteDeferred, true);
  assert.equal(result.details.wordpressCrudWriteDeferred, true);
  assert.equal(result.details.networkRequestDeferred, true);
  assert.equal(result.details.productionWooCommerceWriteDeferred, true);
  assert.equal(result.details.paymentCaptureDeferred, true);
  assert.equal(result.details.squareInventoryWriteDeferred, true);
  assert.equal(
    result.details.squareInventorySyncAuthority,
    "official_woocommerce_square_extension",
  );
  assert.equal(result.details.pluginPaymentCapturePermitted, false);
  assert.deepEqual(result.details.idempotencyKeys, [
    "woocommerce:product-projection:card-public-42:v7:woocommerce:0",
    "woocommerce:product-projection:card-public-43:v2:woocommerce:0",
  ]);
  assert.equal(result.details.requestPlan.requestCount, 2);
  assert.equal(result.details.requestPlan.requests[0].method, "POST");
  assert.equal(result.details.requestPlan.requests[0].path, "/wp-json/wc/v3/products");
  assert.equal(result.details.requestPlan.requests[0].body.sku, "PKM-BASE-004-HOLO");
  assert.equal(result.details.requestPlan.requests[1].method, "PUT");
  assert.equal(result.details.requestPlan.requests[1].path, "/wp-json/wc/v3/products/1001");
  assert.deepEqual(result.details.externalIds.productIds, [1001]);
  assert.deepEqual(result.details.externalIds.skus, [
    "PKM-BASE-004-HOLO",
    "MTG-LEA-001",
  ]);
});

test("WooCommerce product adapter prepares stockout update requests", () => {
  const result = planWooCommerceProductWriteRequest(stockoutWritePlan(), {
    environment: "local",
  });

  assert.equal(result.status, WOOCOMMERCE_PRODUCT_ADAPTER_OUTCOME.READY);
  assert.equal(result.details.requestPlan.requests[0].operation, "mark_product_out_of_stock");
  assert.equal(result.details.requestPlan.requests[0].method, "PUT");
  assert.equal(result.details.requestPlan.requests[0].body.stock_quantity, 0);
  assert.equal(result.details.requestPlan.requests[0].body.stock_status, "outofstock");
  assert.deepEqual(result.details.externalIds.productIds, [1001]);
});

test("WooCommerce product adapter rejects production environment and live credentials", () => {
  const result = planWooCommerceProductWriteRequest(readyWritePlan(), {
    environment: "production",
    credentialEnvironment: "production",
    consumerKey: "ck_live_production",
  });

  assert.equal(result.status, WOOCOMMERCE_PRODUCT_ADAPTER_OUTCOME.REJECTED);
  assert.equal(result.code, "woocommerce_product_write_request_rejected");
  assert.deepEqual(result.details.errors, [
    "woocommerce_product_write_non_production_environment_required",
    "woocommerce_product_write_production_credentials_rejected",
  ]);
  assert.equal(result.details.requestPlan, null);
  assert.equal(result.details.productWriteDeferred, true);
  assert.equal(result.details.paymentDelegation.customGatewayCapturePermitted, false);
});

test("WooCommerce product adapter rejects malformed request envelopes", () => {
  const plan = readyWritePlan();
  plan.request_plan.requests[0].method = "GET";
  plan.request_plan.requests[0].path = "/wp-json/wc/v3/orders";

  const result = planWooCommerceProductWriteRequest(plan, {
    environment: "staging",
  });

  assert.equal(result.status, WOOCOMMERCE_PRODUCT_ADAPTER_OUTCOME.REJECTED);
  assert.deepEqual(result.details.errors, [
    "woocommerce_product_request_0_create_path_invalid",
  ]);
  assert.equal(result.details.requestPlan, null);
});

test("WooCommerce product adapter skips hidden unmapped projections without requests", () => {
  const result = planWooCommerceProductWriteRequest({
    action: "woocommerce_product_write_request_plan",
    status: "skipped",
    code: "woocommerce_product_projection_skipped",
    environment: "local",
    idempotency_keys: ["woocommerce:product-projection:hidden:v2"],
    request_plan: {
      requests: [],
      request_count: 0,
    },
  });

  assert.equal(result.status, WOOCOMMERCE_PRODUCT_ADAPTER_OUTCOME.SKIPPED);
  assert.equal(result.details.requestPlan.requestCount, 0);
  assert.deepEqual(result.details.idempotencyKeys, [
    "woocommerce:product-projection:hidden:v2",
  ]);
  assert.deepEqual(result.details.externalIds.productIds, []);
  assert.equal(result.details.productWriteDeferred, true);
});

function readyWritePlan() {
  return {
    action: "woocommerce_product_write_request_plan",
    status: "ready",
    code: "woocommerce_product_write_request_ready",
    environment: "staging",
    idempotency_keys: [
      "woocommerce:product-projection:card-public-42:v7:woocommerce:0",
      "woocommerce:product-projection:card-public-43:v2:woocommerce:0",
    ],
    external_ids: {
      product_ids: [1001],
      skus: ["PKM-BASE-004-HOLO", "MTG-LEA-001"],
    },
    request_plan: {
      requests: [
        {
          operation: "create_product",
          method: "POST",
          path: "/wp-json/wc/v3/products",
          product_id: null,
          idempotency_key:
            "woocommerce:product-projection:card-public-42:v7:woocommerce:0",
          body: {
            name: "Pokemon - Charizard",
            sku: "PKM-BASE-004-HOLO",
            regular_price: "125.00",
            stock_quantity: 1,
            stock_status: "instock",
          },
          write_scope: "deferred",
        },
        {
          operation: "update_product",
          method: "PUT",
          path: "/wp-json/wc/v3/products/1001",
          product_id: 1001,
          idempotency_key:
            "woocommerce:product-projection:card-public-43:v2:woocommerce:0",
          body: {
            name: "Magic - Black Lotus",
            sku: "MTG-LEA-001",
            regular_price: "7500.00",
            stock_quantity: 1,
            stock_status: "instock",
          },
          write_scope: "deferred",
        },
      ],
      request_count: 2,
    },
  };
}

function stockoutWritePlan() {
  return {
    action: "woocommerce_product_write_request_plan",
    status: "ready",
    code: "woocommerce_product_write_request_ready",
    environment: "local",
    idempotency_keys: [
      "woocommerce:product-projection:card-public-42:v7:woocommerce:0",
    ],
    request_plan: {
      requests: [
        {
          operation: "mark_product_out_of_stock",
          method: "PUT",
          path: "/wp-json/wc/v3/products/1001",
          product_id: 1001,
          idempotency_key:
            "woocommerce:product-projection:card-public-42:v7:woocommerce:0",
          body: {
            sku: "PKM-BASE-004-HOLO",
            stock_quantity: 0,
            stock_status: "outofstock",
          },
          write_scope: "deferred",
        },
      ],
      request_count: 1,
    },
  };
}
