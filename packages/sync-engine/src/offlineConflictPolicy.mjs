const ACCEPTED = "accepted";
const CONFLICT = "conflict";
const REJECTED = "rejected";

export function resolveOfflineOperation(operation, serverState) {
  if (serverState.device?.revoked === true) {
    return outcome(REJECTED, "device_revoked", {
      requiresManagerReview: false,
      retryable: false,
    });
  }

  switch (operation.operationType) {
    case "inventory_reservation":
      return resolveInventoryReservation(operation, serverState);
    case "event_reservation":
      return resolveEventReservation(operation, serverState);
    case "credit_redemption":
      return resolveCreditRedemption(operation, serverState);
    default:
      return outcome(REJECTED, "unsupported_operation", {
        requiresManagerReview: true,
        retryable: false,
      });
  }
}

function resolveInventoryReservation(operation, serverState) {
  const inventory = serverState.inventory ?? {};

  if (inventory.status === "available") {
    return outcome(ACCEPTED, "inventory_reserved", {
      canonicalStatus: "reserved",
      rowVersion: nextVersion(inventory.rowVersion),
    });
  }

  return outcome(CONFLICT, "inventory_unavailable", {
    requiresManagerReview: true,
    localStatus: operation.payload?.localStatus ?? "offline_pending_sync",
    serverStatus: inventory.status ?? "unknown",
  });
}

function resolveEventReservation(operation, serverState) {
  const event = serverState.event ?? {};
  const seatsRemaining = Number(event.seatsRemaining ?? 0);

  if (seatsRemaining > 0) {
    return outcome(ACCEPTED, "event_reserved", {
      canonicalStatus: "reserved",
      rowVersion: nextVersion(event.rowVersion),
    });
  }

  if (event.waitlistEnabled === true) {
    return outcome(ACCEPTED, "event_waitlisted", {
      canonicalStatus: "waitlist",
      rowVersion: nextVersion(event.rowVersion),
    });
  }

  return outcome(CONFLICT, "event_capacity_conflict", {
    requiresManagerReview: true,
    serverStatus: event.status ?? "full",
  });
}

function resolveCreditRedemption(operation, serverState) {
  const amount = minorUnits(operation.payload?.amountMinorUnits);
  const cachedBalance = minorUnits(operation.payload?.cachedBalanceMinorUnits);
  const serverBalance = minorUnits(serverState.customer?.creditBalanceMinorUnits);

  if (amount <= 0) {
    return outcome(REJECTED, "invalid_credit_amount", {
      requiresManagerReview: false,
    });
  }

  if (amount > cachedBalance) {
    return outcome(REJECTED, "offline_credit_limit_exceeded", {
      requiresManagerReview: true,
      preservesAttempt: true,
    });
  }

  if (amount > serverBalance) {
    return outcome(CONFLICT, "credit_overspend_conflict", {
      requiresManagerReview: true,
      preservesAttempt: true,
      wouldCreateNegativeBalance: true,
    });
  }

  return outcome(ACCEPTED, "credit_redeemed", {
    balanceAfterMinorUnits: serverBalance - amount,
    rowVersion: nextVersion(serverState.customer?.rowVersion),
  });
}

function outcome(status, code, details = {}) {
  return {
    status,
    code,
    details,
  };
}

function minorUnits(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function nextVersion(value) {
  return minorUnits(value) + 1;
}

export const OFFLINE_CONFLICT_OUTCOME = {
  ACCEPTED,
  CONFLICT,
  REJECTED,
};
