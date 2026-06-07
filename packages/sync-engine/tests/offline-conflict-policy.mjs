import assert from "node:assert/strict";
import {
  OFFLINE_CONFLICT_OUTCOME,
  resolveOfflineOperation,
} from "../src/offlineConflictPolicy.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("offline inventory reservation accepts available item", () => {
  const result = resolveOfflineOperation(
    {
      operationType: "inventory_reservation",
      payload: {
        localStatus: "offline_pending_sync",
      },
    },
    {
      inventory: {
        status: "available",
        rowVersion: 4,
      },
    },
  );

  assert.equal(result.status, OFFLINE_CONFLICT_OUTCOME.ACCEPTED);
  assert.equal(result.code, "inventory_reserved");
  assert.equal(result.details.canonicalStatus, "reserved");
  assert.equal(result.details.rowVersion, 5);
});

test("offline inventory reservation creates staff conflict when item sold", () => {
  const result = resolveOfflineOperation(
    {
      operationType: "inventory_reservation",
      payload: {
        localStatus: "offline_pending_sync",
      },
    },
    {
      inventory: {
        status: "sold",
        rowVersion: 8,
      },
    },
  );

  assert.equal(result.status, OFFLINE_CONFLICT_OUTCOME.CONFLICT);
  assert.equal(result.code, "inventory_unavailable");
  assert.equal(result.details.requiresManagerReview, true);
  assert.equal(result.details.serverStatus, "sold");
});

test("offline event reservation keeps external provider queue disabled", () => {
  const result = resolveOfflineOperation(
    {
      operationType: "event_reservation",
      payload: {},
    },
    {
      event: {
        seatsRemaining: 3,
        rowVersion: 2,
        registrationMode: "website_push_topdeck",
        topDeckEnabled: true,
      },
    },
    {
      paymentStatus: "not_required",
    },
  );

  assert.equal(result.status, OFFLINE_CONFLICT_OUTCOME.ACCEPTED);
  assert.equal(result.code, "event_reserved");
  assert.equal(result.details.queueTopDeck, false);
});

test("offline event reservation waitlists full event when allowed", () => {
  const result = resolveOfflineOperation(
    {
      operationType: "event_reservation",
      payload: {},
    },
    {
      event: {
        seatsRemaining: 0,
        waitlistEnabled: true,
        rowVersion: 9,
      },
    },
  );

  assert.equal(result.status, OFFLINE_CONFLICT_OUTCOME.ACCEPTED);
  assert.equal(result.code, "event_waitlisted");
  assert.equal(result.details.canonicalStatus, "waitlist");
  assert.equal(result.details.queueTopDeck, false);
});

test("offline event reservation creates capacity conflict when full", () => {
  const result = resolveOfflineOperation(
    {
      operationType: "event_reservation",
      payload: {},
    },
    {
      event: {
        seatsRemaining: 0,
        waitlistEnabled: false,
        status: "full",
      },
    },
  );

  assert.equal(result.status, OFFLINE_CONFLICT_OUTCOME.CONFLICT);
  assert.equal(result.code, "event_capacity_conflict");
  assert.equal(result.details.requiresManagerReview, true);
});

test("offline credit redemption accepts within cached and server balance", () => {
  const result = resolveOfflineOperation(
    {
      operationType: "credit_redemption",
      payload: {
        amountMinorUnits: 2500,
        cachedBalanceMinorUnits: 4000,
      },
    },
    {
      customer: {
        creditBalanceMinorUnits: 4000,
        rowVersion: 6,
      },
    },
  );

  assert.equal(result.status, OFFLINE_CONFLICT_OUTCOME.ACCEPTED);
  assert.equal(result.code, "credit_redeemed");
  assert.equal(result.details.balanceAfterMinorUnits, 1500);
  assert.equal(result.details.rowVersion, 7);
});

test("offline credit redemption rejects beyond cached local limit", () => {
  const result = resolveOfflineOperation(
    {
      operationType: "credit_redemption",
      payload: {
        amountMinorUnits: 5000,
        cachedBalanceMinorUnits: 4000,
      },
    },
    {
      customer: {
        creditBalanceMinorUnits: 10000,
      },
    },
  );

  assert.equal(result.status, OFFLINE_CONFLICT_OUTCOME.REJECTED);
  assert.equal(result.code, "offline_credit_limit_exceeded");
  assert.equal(result.details.preservesAttempt, true);
});

test("offline credit redemption conflicts instead of creating negative balance", () => {
  const result = resolveOfflineOperation(
    {
      operationType: "credit_redemption",
      payload: {
        amountMinorUnits: 4500,
        cachedBalanceMinorUnits: 5000,
      },
    },
    {
      customer: {
        creditBalanceMinorUnits: 1000,
      },
    },
  );

  assert.equal(result.status, OFFLINE_CONFLICT_OUTCOME.CONFLICT);
  assert.equal(result.code, "credit_overspend_conflict");
  assert.equal(result.details.wouldCreateNegativeBalance, true);
});

test("device revocation blocks offline push before operation handling", () => {
  const result = resolveOfflineOperation(
    {
      operationType: "inventory_reservation",
      payload: {},
    },
    {
      device: {
        revoked: true,
      },
      inventory: {
        status: "available",
      },
    },
  );

  assert.equal(result.status, OFFLINE_CONFLICT_OUTCOME.REJECTED);
  assert.equal(result.code, "device_revoked");
});
