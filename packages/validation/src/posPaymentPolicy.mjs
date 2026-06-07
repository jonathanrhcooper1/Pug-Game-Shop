const ACCEPTED = "accepted";
const CONFLICT = "conflict";
const REJECTED = "rejected";
const SCAN_GATE = "scan_gate";
const CATALOG_MIRROR = "catalog_mirror";
const RECONCILIATION_ONLY = "reconciliation_only";

export function normalizePosPaymentResponse(response) {
  const status = String(response.status ?? "");
  const transactionId = String(response.transaction_id ?? response.transactionId ?? "");
  const currency = String(response.currency ?? "").toUpperCase();
  const amountMinorUnits = Number.isInteger(Number(response.amountMinorUnits))
    ? Number(response.amountMinorUnits)
    : moneyToMinorUnits(response.amount ?? "0");
  const providerRequestedInventoryWrite =
    response.inventory_write_permitted === true ||
    response.providerRequestedInventoryWrite === true;

  return {
    status,
    transactionId,
    amountMinorUnits,
    currency,
    reason: response.reason ?? "",
    providerRequestedInventoryWrite,
    inventoryWritePermitted: false,
  };
}

export function normalizePosAdapterEvent(event, options = {}) {
  const provider = normalizeSlug(event.provider ?? options.provider ?? "");
  const eventId = String(event.event_id ?? event.eventId ?? "").trim();
  const eventType = normalizeEventType(event.type ?? event.event_type ?? "");
  const mode = normalizeProviderMode(event.mode ?? options.mode ?? SCAN_GATE);
  const payment = normalizePosPaymentResponse(event.payment ?? event.response ?? event);
  const errors = [];

  if (provider === "") {
    errors.push("pos_provider_missing");
  }

  if (eventId === "") {
    errors.push("pos_event_id_missing");
  }

  if (eventType === "") {
    errors.push("pos_event_type_unsupported");
  }

  if (mode === "") {
    errors.push("pos_provider_mode_unsupported");
  }

  return {
    provider,
    eventId,
    eventType,
    mode,
    idempotencyKey: provider !== "" && eventId !== "" ? `${provider}:${eventId}` : "",
    externalOrderId: String(event.external_order_id ?? event.externalOrderId ?? "").trim(),
    payment,
    errors,
    providerInventoryWritesPermitted: false,
    routeConnectedWritesDeferred: true,
    productionCaptureDeferred: true,
  };
}

export function planPosTransactionIngestion(event, lineItems = [], options = {}) {
  const ingestion = normalizePosAdapterEvent(event, options);

  if (ingestion.errors.length > 0) {
    return outcome(REJECTED, "pos_event_invalid", {
      ingestion,
      inventoryTransitions: [],
    });
  }

  const processed = new Set(options.alreadyProcessedEventIds ?? []);

  if (processed.has(ingestion.idempotencyKey) || processed.has(ingestion.eventId)) {
    return outcome(ACCEPTED, "pos_event_replay", {
      ingestion,
      replayed: true,
      inventoryTransitions: [],
    });
  }

  const reconciliation =
    ingestion.eventType === "refund"
      ? planPosRefundReconciliation(ingestion.payment, lineItems)
      : planPosSaleReconciliation(ingestion.payment, lineItems);

  return outcome(reconciliation.status, reconciliation.code, {
    ...reconciliation.details,
    ingestion,
    replayed: false,
    providerInventoryWriteBlocked:
      ingestion.payment.providerRequestedInventoryWrite === true,
    durableConflictRequired: reconciliation.status === CONFLICT,
    routeConnectedWritesDeferred: true,
    productionCaptureDeferred: true,
  });
}

export function planPosSaleReconciliation(paymentResponse, lineItems) {
  const payment = normalizePosPaymentResponse(paymentResponse);

  if (payment.status !== "approved") {
    return outcome(REJECTED, "payment_not_approved", {
      payment,
      inventoryTransitions: [],
    });
  }

  const unmapped = lineItems.filter((lineItem) => !hasExactInventoryMapping(lineItem));

  if (unmapped.length > 0) {
    return outcome(CONFLICT, "unmapped_pos_line", {
      payment,
      unmappedCount: unmapped.length,
      requiresManagerReview: true,
      inventoryTransitions: [],
    });
  }

  return outcome(ACCEPTED, "pos_sale_reconciled", {
    payment,
    providerInventoryWriteBlocked: payment.providerRequestedInventoryWrite,
    inventoryTransitions: lineItems.map((lineItem) => ({
      inventoryId: Number(lineItem.inventoryId),
      barcode: String(lineItem.barcode),
      status: "sold",
      source: "pos_scan_gate",
      transactionId: payment.transactionId,
    })),
  });
}

export function planPosRefundReconciliation(paymentResponse, lineItems) {
  const payment = normalizePosPaymentResponse(paymentResponse);

  if (payment.status !== "refunded") {
    return outcome(REJECTED, "refund_not_confirmed", {
      payment,
      inventoryTransitions: [],
    });
  }

  const unmapped = lineItems.filter((lineItem) => !hasExactInventoryMapping(lineItem));

  if (unmapped.length > 0) {
    return outcome(CONFLICT, "unmapped_refund_line", {
      payment,
      unmappedCount: unmapped.length,
      requiresManagerReview: true,
      inventoryTransitions: [],
    });
  }

  return outcome(ACCEPTED, "pos_refund_reconciled", {
    payment,
    inventoryTransitions: lineItems.map((lineItem) => ({
      inventoryId: Number(lineItem.inventoryId),
      barcode: String(lineItem.barcode),
      status: "pending_review",
      source: "pos_refund",
      transactionId: payment.transactionId,
    })),
  });
}

export function comparePosFeeEstimates(paymentInput, feeConfigs = []) {
  const payment = normalizeFeePayment(paymentInput);
  const estimates = feeConfigs
    .map((config) => feeEstimateForConfig(payment, config))
    .filter((estimate) => estimate !== null)
    .sort((left, right) => {
      if (left.estimatedFeeMinorUnits !== right.estimatedFeeMinorUnits) {
        return left.estimatedFeeMinorUnits - right.estimatedFeeMinorUnits;
      }

      return left.provider.localeCompare(right.provider);
    });

  if (estimates.length === 0) {
    return outcome(REJECTED, "no_fee_estimate_configured", {
      payment,
      estimates: [],
    });
  }

  return outcome(ACCEPTED, "fee_estimates_compared", {
    payment,
    bestEstimate: estimates[0],
    estimates,
    hardcodedRatesUsed: false,
  });
}

function hasExactInventoryMapping(lineItem) {
  return Number.isInteger(Number(lineItem.inventoryId)) && String(lineItem.barcode ?? "") !== "";
}

function outcome(status, code, details) {
  return {
    status,
    code,
    details,
  };
}

function moneyToMinorUnits(value) {
  const text = String(value);
  const match = text.match(/^(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    return 0;
  }

  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));

  return dollars * 100 + cents;
}

function normalizeEventType(value) {
  const normalized = normalizeSlug(value);

  if (["sale", "payment", "order_paid"].includes(normalized)) {
    return "sale";
  }

  if (["refund", "payment_refunded", "order_refunded"].includes(normalized)) {
    return "refund";
  }

  return "";
}

function normalizeProviderMode(value) {
  const normalized = normalizeSlug(value);

  if ([SCAN_GATE, CATALOG_MIRROR, RECONCILIATION_ONLY].includes(normalized)) {
    return normalized;
  }

  return "";
}

function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeFeePayment(paymentInput) {
  const amountMinorUnits = Number.isInteger(Number(paymentInput.amountMinorUnits))
    ? Number(paymentInput.amountMinorUnits)
    : moneyToMinorUnits(paymentInput.amount ?? "0");

  return {
    amountMinorUnits,
    currency: String(paymentInput.currency ?? "").toUpperCase(),
    channel: normalizeSlug(paymentInput.channel ?? "card_present"),
  };
}

function feeEstimateForConfig(payment, config) {
  const provider = normalizeSlug(config.provider ?? "");
  const channel = normalizeSlug(config.channel ?? "");
  const currency = String(config.currency ?? payment.currency).toUpperCase();

  if (
    provider === "" ||
    channel === "" ||
    channel !== payment.channel ||
    currency !== payment.currency
  ) {
    return null;
  }

  const percentageBasisPoints = nonNegativeInteger(config.percentage_bps ?? config.percentageBasisPoints);
  const fixedMinorUnits = nonNegativeInteger(config.fixed_minor_units ?? config.fixedMinorUnits);
  const platformMinorUnits = nonNegativeInteger(config.platform_minor_units ?? config.platformMinorUnits);

  if (
    percentageBasisPoints === null ||
    fixedMinorUnits === null ||
    platformMinorUnits === null
  ) {
    return null;
  }

  const variableFeeMinorUnits = Math.round(
    (payment.amountMinorUnits * percentageBasisPoints) / 10000,
  );

  return {
    provider,
    channel,
    currency,
    amountMinorUnits: payment.amountMinorUnits,
    percentageBasisPoints,
    variableFeeMinorUnits,
    fixedFeeMinorUnits: fixedMinorUnits,
    platformFeeMinorUnits: platformMinorUnits,
    estimatedFeeMinorUnits:
      variableFeeMinorUnits + fixedMinorUnits + platformMinorUnits,
    sourceNote: String(config.source_note ?? config.sourceNote ?? ""),
    lastVerifiedDate: String(config.last_verified_date ?? config.lastVerifiedDate ?? ""),
  };
}

function nonNegativeInteger(value) {
  if (Number.isInteger(Number(value)) && Number(value) >= 0) {
    return Number(value);
  }

  return null;
}

export const POS_PAYMENT_OUTCOME = {
  ACCEPTED,
  CONFLICT,
  REJECTED,
};

export const POS_PROVIDER_MODE = {
  SCAN_GATE,
  CATALOG_MIRROR,
  RECONCILIATION_ONLY,
};
