import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  POS_PAYMENT_OUTCOME,
  normalizePosPaymentResponse,
  planPosRefundReconciliation,
  planPosSaleReconciliation,
} from "../src/posPaymentPolicy.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/mocks/pos/payment-responses.json", import.meta.url), "utf8"),
);

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("approved POS response normalizes amount and blocks provider inventory writes", () => {
  const response = {
    ...fixture.responses.approved_card_present,
    inventory_write_permitted: true,
  };
  const normalized = normalizePosPaymentResponse(response);

  assert.equal(normalized.status, "approved");
  assert.equal(normalized.transactionId, "sandbox-pos-txn-001");
  assert.equal(normalized.amountMinorUnits, 12500);
  assert.equal(normalized.currency, "USD");
  assert.equal(normalized.providerRequestedInventoryWrite, true);
  assert.equal(normalized.inventoryWritePermitted, false);
});

test("approved POS sale reconciles exact scanned inventory lines to sold", () => {
  const result = planPosSaleReconciliation(
    fixture.responses.approved_card_present,
    [
      {
        inventoryId: 42,
        barcode: "TCG-000042",
      },
    ],
  );

  assert.equal(result.status, POS_PAYMENT_OUTCOME.ACCEPTED);
  assert.equal(result.code, "pos_sale_reconciled");
  assert.equal(result.details.inventoryTransitions.length, 1);
  assert.equal(result.details.inventoryTransitions[0].status, "sold");
  assert.equal(result.details.inventoryTransitions[0].source, "pos_scan_gate");
});

test("declined POS payment never transitions inventory", () => {
  const result = planPosSaleReconciliation(
    fixture.responses.declined,
    [
      {
        inventoryId: 42,
        barcode: "TCG-000042",
      },
    ],
  );

  assert.equal(result.status, POS_PAYMENT_OUTCOME.REJECTED);
  assert.equal(result.code, "payment_not_approved");
  assert.equal(result.details.inventoryTransitions.length, 0);
});

test("approved POS sale without exact mapping creates staff conflict", () => {
  const result = planPosSaleReconciliation(
    fixture.responses.approved_card_present,
    [
      {
        sku: "provider-only-line",
      },
    ],
  );

  assert.equal(result.status, POS_PAYMENT_OUTCOME.CONFLICT);
  assert.equal(result.code, "unmapped_pos_line");
  assert.equal(result.details.requiresManagerReview, true);
  assert.equal(result.details.inventoryTransitions.length, 0);
});

test("POS refund moves exact inventory to pending review", () => {
  const result = planPosRefundReconciliation(
    fixture.responses.refund_success,
    [
      {
        inventoryId: 42,
        barcode: "TCG-000042",
      },
    ],
  );

  assert.equal(result.status, POS_PAYMENT_OUTCOME.ACCEPTED);
  assert.equal(result.code, "pos_refund_reconciled");
  assert.equal(result.details.inventoryTransitions[0].status, "pending_review");
  assert.equal(result.details.inventoryTransitions[0].source, "pos_refund");
});
