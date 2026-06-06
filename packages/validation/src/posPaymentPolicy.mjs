const ACCEPTED = "accepted";
const CONFLICT = "conflict";
const REJECTED = "rejected";

export function normalizePosPaymentResponse(response) {
  const status = String(response.status ?? "");
  const transactionId = String(response.transaction_id ?? "");
  const currency = String(response.currency ?? "").toUpperCase();
  const amountMinorUnits = moneyToMinorUnits(response.amount ?? "0");
  const providerRequestedInventoryWrite =
    response.inventory_write_permitted === true;

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

export const POS_PAYMENT_OUTCOME = {
  ACCEPTED,
  CONFLICT,
  REJECTED,
};
