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
const SQUARE_INVENTORY_BATCH_RETRIEVE_COUNTS_PATH = "/v2/inventory/counts/batch-retrieve";

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

export function planSquareBarcodeSkuInventoryPull(wordpressInventoryRows, options = {}) {
  const environment = normalizeSlug(options.environment ?? "sandbox");
  const paymentDelegation = squarePaymentDelegationPolicy({ provider: "square" });
  const rows = arrayValue(wordpressInventoryRows)
    .map((row, index) => normalizeWordPressInventoryRow(row, index, options))
    .filter((row) => row !== null);
  const errors = [];

  if (!SANDBOX_ENVIRONMENTS.has(environment)) {
    errors.push("square_inventory_pull_sandbox_environment_required");
  }

  if (
    looksLikeProductionCredential(
      options.accessToken ?? options.apiKey ?? "",
      options,
    )
  ) {
    errors.push("square_inventory_pull_production_credentials_rejected");
  }

  if (rows.length === 0) {
    errors.push("square_inventory_pull_rows_required");
  }

  const duplicateScanIdentities = duplicateValues(
    rows.map((row) => row.scanIdentity).filter((value) => value !== ""),
  );
  const mappedRows = [];
  const unresolvedMappings = [];

  for (const row of rows) {
    const rowErrors = [];

    if (row.inventoryId === null && row.publicId === "") {
      rowErrors.push("wordpress_inventory_identity_required");
    }

    if (row.scanIdentity === "") {
      rowErrors.push("barcode_or_sku_required");
    }

    if (duplicateScanIdentities.includes(row.scanIdentity)) {
      rowErrors.push("duplicate_barcode_or_sku");
    }

    if (row.squareCatalogVariationId === "") {
      rowErrors.push("square_catalog_variation_id_required_for_inventory_pull");
    }

    if (row.squareLocationId === "") {
      rowErrors.push("square_location_id_required_for_inventory_pull");
    }

    if (rowErrors.length > 0) {
      unresolvedMappings.push({
        inventoryId: row.inventoryId,
        publicId: row.publicId,
        barcode: row.barcode,
        sku: row.sku,
        scanIdentity: row.scanIdentity,
        errors: rowErrors,
      });
      continue;
    }

    mappedRows.push(row);
  }

  if (errors.length > 0) {
    return outcome(REJECTED, "square_inventory_pull_expectation_rejected", {
      errors: [...new Set(errors)],
      environment,
      paymentDelegation,
      paymentCaptureAuthority:
        POS_PAYMENT_DELEGATION.OFFICIAL_WOOCOMMERCE_SQUARE_EXTENSION,
      pluginPaymentCapturePermitted: false,
      networkRequestDeferred: true,
      providerInventoryReadDeferred: true,
      requestPlan: null,
      barcodeMappings: mappedRows.map(publicBarcodeMapping),
      unresolvedMappings,
    });
  }

  const pullRequest = squareInventoryCountsPullRequest(mappedRows, options);
  const status = unresolvedMappings.length > 0 ? CONFLICT : READY;

  return outcome(
    status,
    status === CONFLICT
      ? "square_inventory_pull_mapping_requires_review"
      : "square_inventory_pull_expectation_ready",
    {
      environment,
      sourceOfTruth: "tcg_store_platform",
      mappingSource: "wordpress_inventory_rows",
      paymentDelegation,
      paymentCaptureAuthority:
        POS_PAYMENT_DELEGATION.OFFICIAL_WOOCOMMERCE_SQUARE_EXTENSION,
      pluginPaymentCapturePermitted: false,
      pluginCustomGatewayPermitted: false,
      squarePaymentCaptureSupported: false,
      networkRequestDeferred: true,
      providerInventoryReadDeferred: true,
      productionNetworkRequestDeferred: true,
      requestPlan: pullRequest,
      barcodeMappings: mappedRows.map(publicBarcodeMapping),
      unresolvedMappings,
      externalIds: {
        catalogObjectIds: mappedRows.map((row) => row.squareCatalogVariationId),
        locationIds: uniqueValues(mappedRows.map((row) => row.squareLocationId)),
        skus: uniqueValues(mappedRows.map((row) => row.sku).filter((value) => value !== "")),
        barcodes: uniqueValues(mappedRows.map((row) => row.barcode).filter((value) => value !== "")),
      },
      expectations: {
        squareVariationSkuMatchesWordPressScanIdentity: true,
        squareCountsAreReconciliationInputsOnly: true,
        wordpressSerializedInventoryRemainsAuthoritative: true,
        oneSquareVariationRepresentsOneSerializedInventoryItem: true,
      },
    },
  );
}

export function planSquareInventoryCountReconciliation(wordpressInventoryRows, squareCountsPayload, options = {}) {
  const pullPlan = planSquareBarcodeSkuInventoryPull(wordpressInventoryRows, options);

  if (pullPlan.status === REJECTED) {
    return outcome(REJECTED, "square_inventory_count_reconciliation_rejected", {
      errors: pullPlan.details.errors,
      environment: pullPlan.details.environment,
      sourceOfTruth: "tcg_store_platform",
      mappingSource: "wordpress_inventory_rows",
      paymentDelegation: pullPlan.details.paymentDelegation,
      paymentCaptureAuthority: pullPlan.details.paymentCaptureAuthority,
      pluginPaymentCapturePermitted: false,
      squarePaymentCaptureSupported: false,
      networkRequestDeferred: true,
      providerInventoryWriteDeferred: true,
      reconciliationPermitted: false,
      pullPlan,
    });
  }

  const mappings = Array.isArray(pullPlan.details.barcodeMappings)
    ? pullPlan.details.barcodeMappings
    : [];
  const squareCounts = normalizeSquareInventoryCounts(squareCountsPayload);
  const expectedByKey = new Map();

  for (const mapping of mappings) {
    const expected = mapping.expectedSquareCountPull ?? {};
    const key = squareCountKey(
      expected.catalog_object_id ?? mapping.squareCatalogVariationId,
      expected.location_id ?? mapping.squareLocationId,
    );

    if (key !== "") {
      expectedByKey.set(key, mapping);
    }
  }

  const squareCountsByKey = new Map();

  for (const count of squareCounts) {
    const key = squareCountKey(count.catalogObjectId, count.locationId);

    if (key === "" || count.state !== "IN_STOCK") {
      continue;
    }

    const current = squareCountsByKey.get(key);
    squareCountsByKey.set(key, {
      ...count,
      quantity: (current?.quantity ?? 0) + count.quantity,
      raw: current ? [...current.raw, count.raw] : [count.raw],
    });
  }

  const comparisons = [];
  let matchedCount = 0;
  let mismatchedCount = 0;
  let missingSquareCount = 0;
  let expectedTotalQuantity = 0;
  let actualTotalQuantity = 0;

  for (const mapping of mappings) {
    const expected = mapping.expectedSquareCountPull ?? {};
    const key = squareCountKey(
      expected.catalog_object_id ?? mapping.squareCatalogVariationId,
      expected.location_id ?? mapping.squareLocationId,
    );
    const squareCount = squareCountsByKey.get(key) ?? null;
    const expectedQuantity = nonNegativeInteger(expected.expected_serialized_quantity, 0);
    const actualQuantity = squareCount ? squareCount.quantity : null;
    const status = actualQuantity === null
      ? "missing_square_count"
      : actualQuantity === expectedQuantity
        ? "matched"
        : "mismatch";

    expectedTotalQuantity += expectedQuantity;
    actualTotalQuantity += actualQuantity ?? 0;

    if (status === "matched") {
      matchedCount += 1;
    } else if (status === "missing_square_count") {
      missingSquareCount += 1;
    } else {
      mismatchedCount += 1;
    }

    comparisons.push({
      publicId: mapping.publicId,
      inventoryId: mapping.inventoryId,
      barcode: mapping.barcode,
      sku: mapping.sku,
      scanIdentity: mapping.scanIdentity,
      squareCatalogItemId: mapping.squareCatalogItemId,
      squareCatalogVariationId: mapping.squareCatalogVariationId,
      squareLocationId: mapping.squareLocationId,
      expectedSerializedQuantity: String(expectedQuantity),
      actualSquareQuantity: actualQuantity === null ? null : String(actualQuantity),
      status,
      issue:
        status === "matched"
          ? ""
          : status === "missing_square_count"
            ? "square_count_missing_for_expected_variation"
            : "square_count_does_not_match_serialized_inventory",
    });
  }

  const unexpectedSquareCounts = [];

  for (const [key, count] of squareCountsByKey.entries()) {
    if (expectedByKey.has(key)) {
      continue;
    }

    unexpectedSquareCounts.push({
      catalogObjectId: count.catalogObjectId,
      locationId: count.locationId,
      quantity: String(count.quantity),
      state: count.state,
      calculatedAt: count.calculatedAt,
      issue: "square_count_without_wordpress_mapping",
    });
  }

  const unresolvedMappings = Array.isArray(pullPlan.details.unresolvedMappings)
    ? pullPlan.details.unresolvedMappings
    : [];
  const hasConflict =
    unresolvedMappings.length > 0 ||
    mismatchedCount > 0 ||
    missingSquareCount > 0 ||
    unexpectedSquareCounts.length > 0;

  return outcome(
    hasConflict ? CONFLICT : ACCEPTED,
    hasConflict
      ? "square_inventory_count_reconciliation_requires_review"
      : "square_inventory_count_reconciliation_matched",
    {
      environment: pullPlan.details.environment,
      sourceOfTruth: "tcg_store_platform",
      mappingSource: "wordpress_inventory_rows",
      paymentDelegation: pullPlan.details.paymentDelegation,
      paymentCaptureAuthority: pullPlan.details.paymentCaptureAuthority,
      pluginPaymentCapturePermitted: false,
      pluginCustomGatewayPermitted: false,
      squarePaymentCaptureSupported: false,
      networkRequestDeferred: true,
      providerInventoryWriteDeferred: true,
      providerInventoryReadAlreadyPerformed: true,
      reconciliationPermitted: true,
      squareCountsUsedFor: "pos_reconciliation_and_exception_detection",
      comparisons,
      unexpectedSquareCounts,
      unresolvedMappings,
      summary: {
        expected_rows_count: mappings.length,
        compared_count: comparisons.length,
        matched_count: matchedCount,
        mismatched_count: mismatchedCount,
        missing_square_count: missingSquareCount,
        unexpected_square_count: unexpectedSquareCounts.length,
        unresolved_mapping_count: unresolvedMappings.length,
        expected_total_quantity: String(expectedTotalQuantity),
        actual_total_quantity: String(actualTotalQuantity),
      },
      pullPlan,
    },
  );
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

function squareInventoryCountsPullRequest(rows, options = {}) {
  if (rows.length === 0) {
    return {
      method: "POST",
      path: SQUARE_INVENTORY_BATCH_RETRIEVE_COUNTS_PATH,
      body: {
        catalog_object_ids: [],
        location_ids: [],
        states: ["IN_STOCK"],
        limit: boundedInteger(options.limit, 1, 1000, 1000),
      },
    };
  }

  return {
    method: "POST",
    path: SQUARE_INVENTORY_BATCH_RETRIEVE_COUNTS_PATH,
    body: {
      catalog_object_ids: uniqueValues(rows.map((row) => row.squareCatalogVariationId)).slice(0, 1000),
      location_ids: uniqueValues(rows.map((row) => row.squareLocationId)),
      states: ["IN_STOCK"],
      limit: boundedInteger(options.limit, 1, 1000, 1000),
      updated_after: cleanTimestamp(options.updatedAfter ?? options.updated_after),
    },
    catalogObjectIdLimit: 1000,
    inventoryAuthority: "tcg_store_platform",
    squareCountsUsedFor: "pos_reconciliation_and_exception_detection",
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

function normalizeWordPressInventoryRow(row, index, options = {}) {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    return null;
  }

  const barcode = cleanScanValue(row.barcode);
  const sku = cleanScanValue(row.sku) || barcode;
  const scanIdentity = sku || barcode;
  const publicId = String(row.public_id ?? row.publicId ?? "").trim();
  const squareCatalogVariationId = cleanExternalId(
    row.square_catalog_variation_id ??
      row.squareCatalogVariationId ??
      row.square_variation_id ??
      "",
  );
  const squareCatalogItemId = cleanExternalId(
    row.square_catalog_item_id ??
      row.squareCatalogItemId ??
      row.square_item_id ??
      "",
  );
  const squareLocationId = cleanExternalId(
    row.square_location_id ??
      row.squareLocationId ??
      options.squareLocationId ??
      options.square_location_id ??
      "",
  );

  return {
    index,
    inventoryId: positiveInteger(row.inventory_id ?? row.inventoryId ?? row.id),
    publicId,
    barcode,
    sku,
    scanIdentity,
    squareCatalogItemId,
    squareCatalogVariationId,
    squareLocationId,
    status: normalizeSlug(row.status ?? ""),
    posVisibility: normalizeSlug(row.pos_visibility ?? row.posVisibility ?? "visible"),
    rowVersion: positiveInteger(row.row_version ?? row.rowVersion),
  };
}

function publicBarcodeMapping(row) {
  return {
    inventoryId: row.inventoryId,
    publicId: row.publicId,
    barcode: row.barcode,
    sku: row.sku,
    scanIdentity: row.scanIdentity,
    squareCatalogItemId: row.squareCatalogItemId,
    squareCatalogVariationId: row.squareCatalogVariationId,
    squareLocationId: row.squareLocationId,
    expectedSquareVariation: {
      catalog_object_id: row.squareCatalogVariationId,
      item_id: row.squareCatalogItemId,
      sku: row.scanIdentity,
      track_inventory: true,
    },
    expectedSquareCountPull: {
      catalog_object_id: row.squareCatalogVariationId,
      location_id: row.squareLocationId,
      states: ["IN_STOCK"],
      expected_serialized_quantity: row.status === "available" && row.posVisibility === "visible" ? "1" : "0",
    },
    squarePosLineMatchKeys: uniqueValues([
      row.squareCatalogVariationId,
      row.sku,
      row.barcode,
    ]),
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

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates];
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => String(value ?? "").trim() !== ""))];
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

function normalizeSquareInventoryCounts(payload) {
  const source = payload?.counts ??
    payload?.inventory_counts ??
    payload?.inventoryCounts ??
    payload?.data?.counts ??
    payload?.data?.inventory_counts ??
    payload;

  return arrayValue(source)
    .map((count) => normalizeSquareInventoryCount(count))
    .filter((count) => count !== null);
}

function normalizeSquareInventoryCount(count) {
  if (count === null || typeof count !== "object" || Array.isArray(count)) {
    return null;
  }

  const catalogObjectId = cleanExternalId(
    count.catalog_object_id ??
      count.catalogObjectId ??
      count.catalog_object?.id ??
      count.catalogObject?.id ??
      "",
  );
  const locationId = cleanExternalId(
    count.location_id ??
      count.locationId ??
      count.location?.id ??
      "",
  );
  const quantity = nonNegativeInteger(count.quantity ?? count.count ?? count.available_quantity, 0);
  const state = String(count.state ?? "IN_STOCK").trim().toUpperCase() || "IN_STOCK";

  if (catalogObjectId === "" || locationId === "") {
    return null;
  }

  return {
    catalogObjectId,
    locationId,
    quantity,
    state,
    calculatedAt: cleanTimestamp(count.calculated_at ?? count.calculatedAt) ?? "",
    raw: count,
  };
}

function squareCountKey(catalogObjectId, locationId) {
  const objectId = cleanExternalId(catalogObjectId);
  const squareLocationId = cleanExternalId(locationId);

  if (objectId === "" || squareLocationId === "") {
    return "";
  }

  return `${objectId}::${squareLocationId}`;
}

function cleanScanValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "-")
    .toUpperCase()
    .slice(0, 80);
}

function cleanExternalId(value) {
  return String(value ?? "").trim().slice(0, 191);
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

function positiveInteger(value) {
  if (Number.isInteger(value) && value > 0) {
    return value;
  }

  const parsed = Number.parseInt(String(value ?? ""), 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeInteger(value, fallback = 0) {
  if (Number.isInteger(value) && value >= 0) {
    return value;
  }

  const parsed = Number.parseInt(String(value ?? ""), 10);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function cleanTimestamp(value) {
  const text = String(value ?? "").trim();

  if (text === "" || Number.isNaN(Date.parse(text))) {
    return undefined;
  }

  return new Date(text).toISOString();
}

function boundedInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
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
