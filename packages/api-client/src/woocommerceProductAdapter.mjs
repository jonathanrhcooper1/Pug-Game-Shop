import {
  POS_PAYMENT_DELEGATION,
  squarePaymentDelegationPolicy,
} from "../../validation/src/posPaymentPolicy.mjs";

const READY = "ready";
const REJECTED = "rejected";
const SKIPPED = "skipped";
const NON_PRODUCTION_ENVIRONMENTS = new Set([
  "local",
  "development",
  "staging",
  "test",
]);
const PRODUCTS_PATH = "/wp-json/wc/v3/products";
const SUPPORTED_OPERATIONS = new Set([
  "create_product",
  "update_product",
  "mark_product_out_of_stock",
]);

export function planWooCommerceProductWriteRequest(writeRequestPlan, options = {}) {
  const plan = normalizeWriteRequestPlan(writeRequestPlan);
  const environment = normalizeEnvironment(
    options.environment ?? plan.environment ?? "local",
  );
  const errors = validationErrors(plan, environment, options);
  const paymentDelegation = squarePaymentDelegationPolicy({ provider: "square" });

  if (errors.length > 0) {
    return outcome(REJECTED, "woocommerce_product_write_request_rejected", {
      errors,
      environment,
      paymentDelegation,
      requestPlan: null,
      productWriteDeferred: true,
      wordpressCrudWriteDeferred: true,
      networkRequestDeferred: true,
      productionWooCommerceWriteDeferred: true,
      paymentCaptureDeferred: true,
      squareInventoryWriteDeferred: true,
      squareInventorySyncAuthority:
        POS_PAYMENT_DELEGATION.OFFICIAL_WOOCOMMERCE_SQUARE_EXTENSION,
      sourceOfTruth: "tcg_store_platform",
    });
  }

  if (plan.status === SKIPPED) {
    return outcome(SKIPPED, "woocommerce_product_projection_skipped", {
      environment,
      idempotencyKeys: plan.idempotencyKeys,
      externalIds: deriveExternalIds(plan.requests),
      requestPlan: {
        requests: [],
        requestCount: 0,
      },
      productWriteDeferred: true,
      wordpressCrudWriteDeferred: true,
      networkRequestDeferred: true,
      productionWooCommerceWriteDeferred: true,
      paymentCaptureDeferred: true,
      squareInventoryWriteDeferred: true,
      squareInventorySyncAuthority:
        POS_PAYMENT_DELEGATION.OFFICIAL_WOOCOMMERCE_SQUARE_EXTENSION,
      sourceOfTruth: "tcg_store_platform",
    });
  }

  const requests = plan.requests.map(normalizeRequestEnvelope);

  return outcome(READY, "woocommerce_product_write_request_ready", {
    environment,
    idempotencyKeys:
      plan.idempotencyKeys.length > 0
        ? plan.idempotencyKeys
        : requests.map((request) => request.idempotencyKey),
    externalIds: deriveExternalIds(requests),
    requestPlan: {
      requests,
      requestCount: requests.length,
      woocommerceWriteDeferred: true,
      wordpressCrudWriteDeferred: true,
    },
    productWriteDeferred: true,
    wordpressCrudWriteDeferred: true,
    networkRequestDeferred: true,
    productionWooCommerceWriteDeferred: true,
    paymentCaptureDeferred: true,
    squareInventoryWriteDeferred: true,
    squareInventorySyncAuthority:
      POS_PAYMENT_DELEGATION.OFFICIAL_WOOCOMMERCE_SQUARE_EXTENSION,
    pluginPaymentCapturePermitted: false,
    pluginCustomGatewayPermitted: false,
    sourceOfTruth: "tcg_store_platform",
    paymentDelegation,
  });
}

function validationErrors(plan, environment, options) {
  const errors = [];

  if (!NON_PRODUCTION_ENVIRONMENTS.has(environment)) {
    errors.push("woocommerce_product_write_non_production_environment_required");
  }

  if (
    looksLikeProductionCredential(
      options.consumerKey ?? options.apiKey ?? "",
      options,
    ) ||
    looksLikeProductionCredential(options.consumerSecret ?? "", options)
  ) {
    errors.push("woocommerce_product_write_production_credentials_rejected");
  }

  if (plan.status === REJECTED || plan.sourceErrors.length > 0) {
    errors.push("woocommerce_product_write_plan_rejected");
  }

  if (plan.status === "failed") {
    errors.push("woocommerce_product_projection_failed");
  }

  if (plan.status === READY && plan.requests.length === 0) {
    errors.push("woocommerce_product_write_requests_required");
  }

  for (const [index, request] of plan.requests.entries()) {
    const operation = normalizeSlug(request.operation);
    const method = String(request.method ?? "").trim().toUpperCase();
    const path = String(request.path ?? "").trim();
    const productId = positiveInteger(request.product_id ?? request.productId);
    const body = objectValue(request.body);
    const idempotencyKey = String(
      request.idempotency_key ?? request.idempotencyKey ?? "",
    ).trim();

    if (!SUPPORTED_OPERATIONS.has(operation)) {
      errors.push(`woocommerce_product_request_${index}_operation_unsupported`);
    }

    if (idempotencyKey === "") {
      errors.push(`woocommerce_product_request_${index}_idempotency_key_required`);
    }

    if (Object.keys(body).length === 0) {
      errors.push(`woocommerce_product_request_${index}_body_required`);
    }

    if (operation === "create_product") {
      if (method !== "POST" || path !== PRODUCTS_PATH) {
        errors.push(`woocommerce_product_request_${index}_create_path_invalid`);
      }
    } else if (
      method !== "PUT" ||
      productId === null ||
      path !== `${PRODUCTS_PATH}/${productId}`
    ) {
      errors.push(`woocommerce_product_request_${index}_update_path_invalid`);
    }
  }

  return [...new Set(errors)];
}

function normalizeWriteRequestPlan(plan) {
  const requestPlan = objectValue(plan.request_plan ?? plan.requestPlan);
  const externalIds = objectValue(plan.external_ids ?? plan.externalIds);

  return {
    action: String(plan.action ?? ""),
    status: normalizeSlug(plan.status ?? ""),
    code: String(plan.code ?? ""),
    environment: normalizeEnvironment(plan.environment ?? ""),
    sourceErrors: arrayValue(plan.errors),
    idempotencyKeys: stringList(
      plan.idempotency_keys ?? plan.idempotencyKeys ?? [],
    ),
    externalIds: {
      productIds: integerList(
        externalIds.product_ids ?? externalIds.productIds ?? [],
      ),
      skus: stringList(externalIds.skus ?? []),
    },
    requests: arrayValue(requestPlan.requests),
  };
}

function normalizeRequestEnvelope(request) {
  const productId = positiveInteger(request.product_id ?? request.productId);
  const body = objectValue(request.body);

  return {
    operation: normalizeSlug(request.operation),
    method: String(request.method ?? "").trim().toUpperCase(),
    path: String(request.path ?? "").trim(),
    productId,
    idempotencyKey: String(
      request.idempotency_key ?? request.idempotencyKey ?? "",
    ).trim(),
    body,
    writeScope: String(request.write_scope ?? request.writeScope ?? "deferred"),
  };
}

function deriveExternalIds(requests) {
  const productIds = new Set();
  const skus = new Set();

  for (const request of requests) {
    const productId = positiveInteger(request.product_id ?? request.productId);
    const body = objectValue(request.body);
    const sku = String(body.sku ?? "").trim();

    if (productId !== null) {
      productIds.add(productId);
    }

    if (sku !== "") {
      skus.add(sku);
    }
  }

  return {
    productIds: [...productIds],
    skus: [...skus],
  };
}

function looksLikeProductionCredential(value, options = {}) {
  const declaredCredentialEnvironment = normalizeSlug(
    options.credentialEnvironment ?? options.keyEnvironment ?? "",
  );
  const credential = String(value ?? "").trim().toLowerCase();

  if (
    declaredCredentialEnvironment === "production" ||
    declaredCredentialEnvironment === "prod" ||
    declaredCredentialEnvironment === "live"
  ) {
    return true;
  }

  return (
    credential.includes("production") ||
    credential.includes("prod") ||
    credential.includes("live")
  );
}

function normalizeEnvironment(value) {
  const environment = normalizeSlug(value);

  return environment === "dev" ? "development" : environment;
}

function objectValue(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function stringList(value) {
  return arrayValue(value)
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry !== "");
}

function integerList(value) {
  return arrayValue(value)
    .map(positiveInteger)
    .filter((entry) => entry !== null);
}

function positiveInteger(value) {
  if (Number.isInteger(value) && value > 0) {
    return value;
  }

  const normalized = String(value ?? "").trim();

  if (/^\d+$/.test(normalized) && Number(normalized) > 0) {
    return Number(normalized);
  }

  return null;
}

function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function outcome(status, code, details = {}) {
  return {
    status,
    code,
    details,
  };
}

export const WOOCOMMERCE_PRODUCT_ADAPTER_OUTCOME = {
  READY,
  REJECTED,
  SKIPPED,
};
