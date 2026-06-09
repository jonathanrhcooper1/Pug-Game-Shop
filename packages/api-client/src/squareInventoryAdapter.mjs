import {
  POS_PAYMENT_DELEGATION,
  squarePaymentDelegationPolicy,
} from "../../validation/src/posPaymentPolicy.mjs";

const ACCEPTED = "accepted";
const CONFLICT = "conflict";
const READY = "ready";
const REJECTED = "rejected";
const SKIPPED = "skipped";
const SANDBOX_ENVIRONMENTS = new Set(["sandbox", "test", "local", "staging"]);
const SQUARE_CATALOG_BATCH_UPSERT_PATH = "/v2/catalog/batch-upsert";
const SQUARE_INVENTORY_BATCH_CHANGE_PATH = "/v2/inventory/changes/batch-create";

export function planSquareInventorySyncRequest(projectionContract, options = {}) {
  const contract = normalizeProjectionContract(projectionContract);
  const environment = normalizeSlug(options.environment ?? "sandbox");
  const errors = validationErrors(contract, environment, options);
  const paymentDelegation = squarePaymentDelegationPolicy({ provider: "square" });

  if (errors.length > 0) {
    return outcome(REJECTED, "square_inventory_sync_request_rejected", {
      errors,
      environment,
      paymentDelegation,
      networkRequestDeferred: true,
      providerInventoryWriteDeferred: true,
      productionNetworkRequestDeferred: true,
      requestPlan: null,
    });
  }

  if (contract.status === SKIPPED) {
    return outcome(SKIPPED, "square_inventory_projection_skipped", {
      environment,
      idempotencyKeys: [contract.idempotencyKey],
      paymentDelegation,
      networkRequestDeferred: true,
      providerInventoryWriteDeferred: true,
      productionNetworkRequestDeferred: true,
      requestPlan: emptyRequestPlan(contract),
      externalIds: deriveSquareExternalIds(contract),
    });
  }

  return outcome(READY, "square_inventory_sync_request_ready", {
    environment,
    idempotencyKeys: [
      contract.idempotencyKey,
      `${contract.idempotencyKey}:inventory`,
    ],
    paymentDelegation,
    paymentCaptureAuthority:
      POS_PAYMENT_DELEGATION.OFFICIAL_WOOCOMMERCE_SQUARE_EXTENSION,
    pluginPaymentCapturePermitted: false,
    pluginCustomGatewayPermitted: false,
    networkRequestDeferred: true,
    providerInventoryWriteDeferred: true,
    productionNetworkRequestDeferred: true,
    requestPlan: {
      catalogBatchUpsert:
        contract.catalogObjects.length > 0
          ? catalogBatchUpsertRequest(contract)
          : null,
      inventoryBatchChange:
        contract.inventoryChanges.length > 0
          ? inventoryBatchChangeRequest(contract)
          : null,
    },
    externalIds: deriveSquareExternalIds(contract),
  });
}

export function planSquarePosReconciliation(event, mappings = [], options = {}) {
  const provider = normalizeSlug(event.provider ?? options.provider ?? "square");
  const eventId = String(event.event_id ?? event.eventId ?? "").trim();
  const orderId = String(event.order_id ?? event.orderId ?? "").trim();
  const lines = Array.isArray(event.line_items ?? event.lineItems)
    ? event.line_items ?? event.lineItems
    : [];
  const index = mappingIndex(mappings);
  const mappedLines = [];
  const unmappedLines = [];

  if (provider !== "square" && provider !== "square_sandbox") {
    return outcome(REJECTED, "square_reconciliation_provider_invalid", {
      provider,
      networkRequestDeferred: true,
      routeConnectedWritesDeferred: true,
      inventoryMutationDeferred: true,
    });
  }

  if (eventId === "" || orderId === "") {
    return outcome(REJECTED, "square_reconciliation_event_invalid", {
      provider,
      eventId,
      orderId,
      networkRequestDeferred: true,
      routeConnectedWritesDeferred: true,
      inventoryMutationDeferred: true,
    });
  }

  for (const line of lines) {
    const match = matchLine(line, index);

    if (match === null) {
      unmappedLines.push(normalizeLineIdentity(line));
      continue;
    }

    mappedLines.push({
      inventoryId: match.inventoryId,
      barcode: match.barcode,
      sku: match.sku,
      squareCatalogVariationId: match.squareCatalogVariationId,
      externalLineId: String(line.uid ?? line.line_uid ?? line.id ?? ""),
    });
  }

  if (unmappedLines.length > 0 || mappedLines.length !== lines.length) {
    return outcome(CONFLICT, "square_reconciliation_unmapped_lines", {
      provider,
      eventId,
      orderId,
      mappedLines,
      unmappedLines,
      requiresManagerReview: true,
      routeConnectedWritesDeferred: true,
      inventoryMutationDeferred: true,
    });
  }

  return outcome(ACCEPTED, "square_reconciliation_mapped", {
    provider,
    eventId,
    orderId,
    mappedLines,
    inventoryTransitions: mappedLines.map((line) => ({
      inventoryId: line.inventoryId,
      barcode: line.barcode,
      status: "sold",
      source: "square_reconciliation_only",
      externalOrderId: orderId,
    })),
    routeConnectedWritesDeferred: true,
    inventoryMutationDeferred: true,
  });
}

function catalogBatchUpsertRequest(contract) {
  return {
    method: "POST",
    path: SQUARE_CATALOG_BATCH_UPSERT_PATH,
    idempotency_key: contract.idempotencyKey,
    body: {
      idempotency_key: contract.idempotencyKey,
      batches: [
        {
          objects: contract.catalogObjects,
        },
      ],
    },
  };
}

function inventoryBatchChangeRequest(contract) {
  const idempotencyKey = `${contract.idempotencyKey}:inventory`;

  return {
    method: "POST",
    path: SQUARE_INVENTORY_BATCH_CHANGE_PATH,
    idempotency_key: idempotencyKey,
    body: {
      idempotency_key: idempotencyKey,
      changes: contract.inventoryChanges,
    },
  };
}

function emptyRequestPlan(contract) {
  return {
    catalogBatchUpsert: null,
    inventoryBatchChange: null,
    projectionStatus: contract.status,
  };
}

function validationErrors(contract, environment, options) {
  const errors = [];

  if (contract.provider !== "square") {
    errors.push("square_projection_provider_required");
  }

  if (!SANDBOX_ENVIRONMENTS.has(environment)) {
    errors.push("square_inventory_sync_sandbox_environment_required");
  }

  if (
    looksLikeProductionCredential(
      options.accessToken ?? options.apiKey ?? "",
      options,
    )
  ) {
    errors.push("square_inventory_sync_production_credentials_rejected");
  }

  if (contract.status === "failed") {
    errors.push("square_projection_failed");
  }

  if (contract.idempotencyKey === "") {
    errors.push("square_projection_idempotency_key_required");
  }

  if (
    contract.status === READY &&
    contract.catalogObjects.length === 0 &&
    contract.inventoryChanges.length === 0
  ) {
    errors.push("square_projection_operations_required");
  }

  return errors;
}

function normalizeProjectionContract(contract) {
  return {
    provider: normalizeSlug(contract.provider ?? ""),
    status: normalizeSlug(contract.status ?? ""),
    code: String(contract.code ?? ""),
    idempotencyKey: String(contract.idempotency_key ?? contract.idempotencyKey ?? "").trim(),
    catalogObjects: arrayValue(contract.catalog_objects ?? contract.catalogObjects),
    inventoryChanges: arrayValue(contract.inventory_changes ?? contract.inventoryChanges),
    sourceOfTruth: String(contract.source_of_truth ?? contract.sourceOfTruth ?? ""),
  };
}

function deriveSquareExternalIds(contract) {
  const ids = new Set();
  const skus = new Set();

  for (const object of contract.catalogObjects) {
    collectId(ids, object.id);

    for (const variation of object.item_data?.variations ?? []) {
      collectId(ids, variation.id);
      collectId(skus, variation.item_variation_data?.sku);
    }
  }

  for (const change of contract.inventoryChanges) {
    collectId(ids, change.physical_count?.catalog_object_id);
  }

  return {
    catalogObjectIds: [...ids],
    skus: [...skus],
  };
}

function mappingIndex(mappings) {
  const byVariationId = new Map();
  const bySku = new Map();

  for (const mapping of mappings) {
    const normalized = {
      inventoryId: Number(mapping.inventoryId ?? mapping.inventory_id),
      barcode: String(mapping.barcode ?? ""),
      sku: String(mapping.sku ?? ""),
      squareCatalogVariationId: String(
        mapping.squareCatalogVariationId ??
          mapping.square_catalog_variation_id ??
          mapping.catalogObjectId ??
          "",
      ),
    };

    if (Number.isInteger(normalized.inventoryId) && normalized.inventoryId > 0) {
      if (normalized.squareCatalogVariationId !== "") {
        byVariationId.set(normalized.squareCatalogVariationId, normalized);
      }

      if (normalized.sku !== "") {
        bySku.set(normalized.sku, normalized);
      }
    }
  }

  return { byVariationId, bySku };
}

function matchLine(line, index) {
  const identity = normalizeLineIdentity(line);

  if (identity.catalogObjectId !== "" && index.byVariationId.has(identity.catalogObjectId)) {
    return index.byVariationId.get(identity.catalogObjectId);
  }

  if (identity.sku !== "" && index.bySku.has(identity.sku)) {
    return index.bySku.get(identity.sku);
  }

  return null;
}

function normalizeLineIdentity(line) {
  const variation = line.variation ?? line.catalog_object ?? line.catalogObject ?? {};

  return {
    catalogObjectId: String(
      line.catalog_object_id ??
        line.catalogObjectId ??
        variation.id ??
        "",
    ),
    sku: String(line.sku ?? variation.sku ?? ""),
    name: String(line.name ?? variation.name ?? ""),
  };
}

function looksLikeProductionCredential(value, options = {}) {
  const declaredCredentialEnvironment = normalizeSlug(
    options.credentialEnvironment ?? options.tokenEnvironment ?? "",
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

function collectId(target, value) {
  const id = String(value ?? "").trim();

  if (id !== "") {
    target.add(id);
  }
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
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

export const SQUARE_INVENTORY_ADAPTER_OUTCOME = {
  ACCEPTED,
  CONFLICT,
  READY,
  REJECTED,
  SKIPPED,
};
