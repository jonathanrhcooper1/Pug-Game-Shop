import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL, fileURLToPath } from "node:url"
import ts from "typescript"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const workspacePath = path.join(appRoot, "src/data/offlineWorkspace.ts")
const workspaceSource = await readFile(workspacePath, "utf8")
const compiledWorkspace = ts.transpileModule(workspaceSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: workspacePath,
})

const tempDir = await mkdtemp(path.join(os.tmpdir(), "pug-offline-workspace-"))

try {
  const modulePath = path.join(tempDir, "offlineWorkspace.mjs")
  await writeFile(modulePath, compiledWorkspace.outputText, "utf8")

  const {
    applyOfflinePullConflictRecordsToCache,
    applyOfflinePullCustomerCreditRecordsToCache,
    applyOfflinePullEventRecordsToCache,
    applyOfflinePullInventoryRecordsToCache,
    applyOfflinePushResultToQueue,
    buildCustomerCreditRedemptionOperation,
    buildEventCheckinOperation,
    buildEventRegistrationOperation,
    buildOfflineConflictResolutionRequestBody,
    buildOfflineSessionStorageSnapshot,
    creditRedemptionInputFromMinorUnits,
    creditRedemptionInputToMinorUnits,
    customerCreditAvailableAfterPending,
    findInventoryItemByScan,
    offlineSessionStorageKey,
    restoreOfflineSessionStorageSnapshot,
    summarizeOfflinePushResult,
  } = await import(pathToFileURL(modulePath))
  const existingItems = [
    {
      id: 7,
      publicId: "inv-1001",
      rowVersion: 10,
      cardName: "Charizard",
      setName: "Base Set",
      number: "4/102",
      condition: "NM",
      barcode: "PKM-BASE-004-HOLO",
      price: "$125.00",
      priceMinorUnits: 12500,
      currency: "USD",
      location: "Case A3",
      status: "available",
      source: "cached",
    },
  ]
  const result = applyOfflinePullInventoryRecordsToCache(existingItems, [
    {
      public_id: "inv-1001",
      row_version: 9,
      card_name: "Stale Charizard",
      set_name: "Base Set",
      card_number: "4/102",
      condition: "DMG",
      barcode: "STALE",
      sale_price_minor_units: 1,
      sale_currency: "USD",
      location_label: "Old Case",
      status: "conflict",
      updated_at_utc: "2026-06-08T12:00:00Z",
    },
    {
      public_id: "inv-1001",
      row_version: 11,
      card_name: "Charizard",
      set_name: "Base Set",
      card_number: "4/102",
      condition: "LP",
      barcode: "PKM-BASE-004-HOLO",
      sale_price_minor_units: 11900,
      sale_currency: "USD",
      location_label: "Case B1",
      status: "reserved",
      updated_at_utc: "2026-06-08T12:05:00Z",
    },
    {
      public_id: "inv-2002",
      row_version: 1,
      card_name: "Pikachu",
      set_name: "Jungle",
      card_number: "60/64",
      condition: "LP",
      barcode: "PKM-JGL-060-YLW",
      sale_price_minor_units: 1800,
      sale_currency: "USD",
      location_label: "Binder 2",
      status: "available",
      updated_at_utc: "2026-06-08T12:10:00Z",
    },
    {
      public_id: "inv-invalid-currency",
      row_version: 1,
      card_name: "Invalid Currency",
      set_name: "Test",
      card_number: "1",
      condition: "NM",
      barcode: "BAD-CURRENCY",
      sale_price_minor_units: 200,
      sale_currency: "EUR",
      location_label: "Ignored",
      status: "available",
      updated_at_utc: "2026-06-08T12:15:00Z",
    },
  ])

  assert.equal(result.appliedCount, 2)
  assert.equal(result.insertedCount, 1)
  assert.equal(result.updatedCount, 1)
  assert.equal(result.ignoredCount, 1)
  assert.deepEqual(result.changedPublicIds, ["inv-1001", "inv-2002"])
  assert.equal(result.items.length, 2)

  const updatedItem = result.items.find((item) => item.publicId === "inv-1001")
  assert.equal(updatedItem.rowVersion, 11)
  assert.equal(updatedItem.condition, "LP")
  assert.equal(updatedItem.price, "$119.00")
  assert.equal(updatedItem.location, "Case B1")
  assert.equal(updatedItem.status, "reserved")
  assert.equal(updatedItem.source, "accepted")

  const insertedItem = result.items.find((item) => item.publicId === "inv-2002")
  assert.equal(insertedItem.id, 8)
  assert.equal(insertedItem.cardName, "Pikachu")
  assert.equal(insertedItem.priceMinorUnits, 1800)
  assert.equal(insertedItem.source, "accepted")

  const creditResult = applyOfflinePullCustomerCreditRecordsToCache(
    {
      customerId: 91,
      rowVersion: 6,
      label: "Customer credit",
      availableMinorUnits: 24600,
      redemptionPreviewMinorUnits: 2800,
      currency: "USD",
      note: "Cached balance available for offline redemption.",
    },
    [
      {
        customer_id: 91,
        row_version: 5,
        label: "Stale credit",
        available_minor_units: 1,
        currency: "USD",
        note: "Ignored stale credit row.",
        updated_at_utc: "2026-06-08T12:00:00Z",
      },
      {
        customer_id: 92,
        row_version: 8,
        label: "Other customer",
        available_minor_units: 99900,
        currency: "USD",
        note: "Ignored unmatched customer row.",
        updated_at_utc: "2026-06-08T12:05:00Z",
      },
      {
        customer_id: 91,
        row_version: 7,
        label: "Customer credit",
        available_minor_units: 2100,
        currency: "USD",
        note: "Website credit balance refreshed.",
        updated_at_utc: "2026-06-08T12:10:00Z",
      },
    ],
  )

  assert.equal(creditResult.appliedCount, 1)
  assert.equal(creditResult.updatedCount, 1)
  assert.equal(creditResult.ignoredCount, 2)
  assert.equal(creditResult.customerCredit.rowVersion, 7)
  assert.equal(creditResult.customerCredit.availableMinorUnits, 2100)
  assert.equal(creditResult.customerCredit.redemptionPreviewMinorUnits, 2100)
  assert.equal(creditResult.customerCredit.note, "Website credit balance refreshed.")

  const eventResult = applyOfflinePullEventRecordsToCache(
    [
      {
        eventId: "event-100",
        rowVersion: 3,
        title: "Friday Commander Night",
        startsAtUtc: "2026-06-12T23:00:00Z",
        startsAtLabel: "Fri Jun 12, 7:00 PM",
        registrationStatus: "open",
        capacity: 24,
        registeredCount: 10,
        locationLabel: "Event Room",
        note: "Cached event ready for offline check-in.",
      },
    ],
    [
      {
        entity_id: "event-100",
        row_version: 2,
        title: "Stale Commander Night",
        starts_at_utc: "2026-06-12T23:00:00Z",
        starts_at_label: "Fri Jun 12, 7:00 PM",
        registration_status: "closed",
        capacity: 1,
        registered_count: 1,
        location_label: "Old Room",
        note: "Ignored stale event.",
        updated_at_utc: "2026-06-08T12:00:00Z",
      },
      {
        entity_id: "event-100",
        row_version: 4,
        title: "Friday Commander Night",
        starts_at_utc: "2026-06-12T23:00:00Z",
        starts_at_label: "Fri Jun 12, 7:00 PM",
        registration_status: "waitlist",
        capacity: 24,
        registered_count: 25,
        location_label: "Event Room",
        note: "Website event snapshot refreshed.",
        updated_at_utc: "2026-06-08T12:05:00Z",
      },
      {
        entity_id: "event-200",
        row_version: 1,
        title: "Pokemon League Challenge",
        starts_at_utc: "2026-06-14T17:00:00Z",
        starts_at_label: "Sun Jun 14, 1:00 PM",
        registration_status: "open",
        capacity: 32,
        registered_count: 12,
        location_label: "Main Tables",
        note: "New event from website pull.",
        updated_at_utc: "2026-06-08T12:10:00Z",
      },
    ],
  )

  assert.equal(eventResult.appliedCount, 2)
  assert.equal(eventResult.insertedCount, 1)
  assert.equal(eventResult.updatedCount, 1)
  assert.equal(eventResult.ignoredCount, 1)
  assert.deepEqual(eventResult.changedEventIds, ["event-100", "event-200"])

  const updatedEvent = eventResult.events.find((event) => event.eventId === "event-100")
  assert.equal(updatedEvent.rowVersion, 4)
  assert.equal(updatedEvent.registrationStatus, "waitlist")
  assert.equal(updatedEvent.registeredCount, 24)
  assert.equal(updatedEvent.note, "Website event snapshot refreshed.")

  const insertedEvent = eventResult.events.find((event) => event.eventId === "event-200")
  assert.equal(insertedEvent.title, "Pokemon League Challenge")
  assert.equal(insertedEvent.locationLabel, "Main Tables")

  const conflictResult = applyOfflinePullConflictRecordsToCache(
    [
      {
        conflictId: "conflict-inv-1004-location",
        rowVersion: 2,
        title: "Mox Amber location mismatch",
        detail: "Local scan says MTG Tray; website snapshot says Sold.",
        action: "Review",
        resolutionAction: "accept_server",
        resolutionNote: "Manager chose the website snapshot.",
        entityType: "inventory",
        entityId: "inv-1004",
        baseRowVersion: 17,
        operationType: "inventory_update",
        managerOverride: false,
      },
    ],
    [
      {
        conflict_id: "conflict-inv-1004-location",
        row_version: 1,
        title: "Stale conflict",
        detail: "Ignored stale conflict row.",
        action: "Review",
        entity_type: "inventory",
        entity_id: "inv-1004",
        base_row_version: 16,
        operation_type: "inventory_update",
        manager_override: false,
        updated_at_utc: "2026-06-08T12:00:00Z",
      },
      {
        conflict_id: "conflict-inv-1004-location",
        row_version: 3,
        title: "Mox Amber location mismatch",
        detail: "Website snapshot says Sold.",
        action: "Use website",
        resolution_action: "accept_server",
        resolution_note: "Manager chose the website snapshot.",
        entity_type: "inventory",
        entity_id: "inv-1004",
        base_row_version: 17,
        operation_type: "inventory_update",
        manager_override: false,
        updated_at_utc: "2026-06-08T12:05:00Z",
      },
      {
        conflict_id: "conflict-event-200-capacity",
        row_version: 1,
        title: "Event capacity conflict",
        detail: "Offline registration exceeded website capacity.",
        action: "Approve",
        resolution_action: "accept_device",
        resolution_note: "Manager approved the offline event registration.",
        entity_type: "event",
        entity_id: "event-200",
        base_row_version: 1,
        operation_type: "event_reservation",
        manager_override: true,
        updated_at_utc: "2026-06-08T12:10:00Z",
      },
    ],
  )

  assert.equal(conflictResult.appliedCount, 2)
  assert.equal(conflictResult.insertedCount, 1)
  assert.equal(conflictResult.updatedCount, 1)
  assert.equal(conflictResult.ignoredCount, 1)
  assert.deepEqual(conflictResult.changedConflictIds, [
    "conflict-inv-1004-location",
    "conflict-event-200-capacity",
  ])

  const updatedConflict = conflictResult.conflicts.find(
    (conflict) => conflict.conflictId === "conflict-inv-1004-location",
  )
  assert.equal(updatedConflict.rowVersion, 3)
  assert.equal(updatedConflict.detail, "Website snapshot says Sold.")
  assert.equal(updatedConflict.resolutionAction, "accept_server")
  assert.equal(updatedConflict.resolutionNote, "Manager chose the website snapshot.")

  const insertedConflict = conflictResult.conflicts.find(
    (conflict) => conflict.conflictId === "conflict-event-200-capacity",
  )
  assert.equal(insertedConflict.entityType, "event")
  assert.equal(insertedConflict.operationType, "event_reservation")
  assert.equal(insertedConflict.managerOverride, true)
  assert.equal(insertedConflict.resolutionAction, "accept_device")

  assert.equal(findInventoryItemByScan(result.items, "PKM-JGL-060-YLW").publicId, "inv-2002")
  assert.equal(findInventoryItemByScan(result.items, " inv-1001 ").barcode, "PKM-BASE-004-HOLO")
  assert.equal(findInventoryItemByScan(result.items, "charizard"), null)

  const conflictResolutionBody = buildOfflineConflictResolutionRequestBody(
    updatedConflict,
    "device-public-123",
    {
      managerId: 42,
      resolutionId: "resolve-conflict-inv-1004-location-20260607120500",
      resolvedAtUtc: "2026-06-08T12:05:00.000Z",
    },
  )
  assert.equal(conflictResolutionBody.conflict_id, "conflict-inv-1004-location")
  assert.equal(conflictResolutionBody.device_id, "device-public-123")
  assert.equal(conflictResolutionBody.manager_id, 42)
  assert.equal(conflictResolutionBody.resolution_action, "accept_server")
  assert.equal(conflictResolutionBody.expected_conflict_version, 3)
  assert.equal(conflictResolutionBody.resolution_payload.source, "offline_app")

  const eventRegistrationOperation = buildEventRegistrationOperation(
    {
      eventId: "event-200",
      rowVersion: 4,
      title: "Commander Night",
      startsAtUtc: "2026-06-12T23:00:00Z",
      startsAtLabel: "Fri Jun 12, 7:00 PM",
      registrationStatus: "open",
      capacity: 24,
      registeredCount: 23,
      locationLabel: "Event Room",
      note: "Cached event ready for offline registration.",
    },
    {
      attendeeLabel: "Offline walk-in",
      occurredAtLocal: "2026-06-08T08:00:00Z",
      queuedAtUtc: "2026-06-08T12:00:00Z",
      paymentStatus: "pay_at_store",
    },
  )
  const eventRegistrationPayload = JSON.parse(eventRegistrationOperation.payload_json)
  const eventRegistrationAuthorization = JSON.parse(
    eventRegistrationOperation.authorization_context_json,
  )

  assert.equal(eventRegistrationOperation.client_operation_id, "offline-event-reservation-event-200-20260608120000")
  assert.equal(eventRegistrationOperation.operation_type, "event_reservation")
  assert.equal(eventRegistrationOperation.entity_type, "event")
  assert.equal(eventRegistrationOperation.entity_id, "event-200")
  assert.equal(eventRegistrationOperation.base_row_version, 4)
  assert.equal(eventRegistrationPayload.event_id, "event-200")
  assert.equal(eventRegistrationPayload.event_title, "Commander Night")
  assert.equal(eventRegistrationPayload.registration_source, "walk_in")
  assert.equal(eventRegistrationPayload.seats_remaining_snapshot, 1)
  assert.equal(eventRegistrationPayload.payment_status, "pay_at_store")
  assert.equal(eventRegistrationPayload.sync_intent, "offline_event_registration")
  assert.equal(eventRegistrationAuthorization.manager_override, false)
  assert.equal(eventRegistrationAuthorization.source, "offline_app")

  const eventCheckinOperation = buildEventCheckinOperation(
    {
      eventId: "event-200",
      rowVersion: 4,
      title: "Commander Night",
      startsAtUtc: "2026-06-12T23:00:00Z",
      startsAtLabel: "Fri Jun 12, 7:00 PM",
      registrationStatus: "open",
      capacity: 24,
      registeredCount: 23,
      locationLabel: "Event Room",
      note: "Cached event ready for offline check-in.",
    },
    {
      registrationPublicId: "registration-event-200-walkin",
      checkinMethod: "manual_lookup",
      occurredAtLocal: "2026-06-08T08:15:00Z",
      queuedAtUtc: "2026-06-08T12:15:00Z",
    },
  )
  const eventCheckinPayload = JSON.parse(eventCheckinOperation.payload_json)
  const eventCheckinAuthorization = JSON.parse(eventCheckinOperation.authorization_context_json)

  assert.equal(eventCheckinOperation.client_operation_id, "offline-event-checkin-event-200-20260608121500")
  assert.equal(eventCheckinOperation.operation_type, "event_checkin")
  assert.equal(eventCheckinOperation.entity_type, "event")
  assert.equal(eventCheckinOperation.entity_id, "event-200")
  assert.equal(eventCheckinPayload.registration_public_id, "registration-event-200-walkin")
  assert.equal(eventCheckinPayload.checkin_method, "manual_lookup")
  assert.equal(eventCheckinPayload.checkin_status, "checked_in")
  assert.equal(eventCheckinPayload.sync_intent, "offline_event_checkin")
  assert.equal(eventCheckinAuthorization.manager_override, false)
  assert.equal(eventCheckinAuthorization.source, "offline_app")

  assert.equal(creditRedemptionInputFromMinorUnits(2800), "28.00")
  assert.equal(creditRedemptionInputFromMinorUnits(-1), "0.00")
  assert.equal(creditRedemptionInputToMinorUnits("$1,234.56"), 123456)
  assert.equal(creditRedemptionInputToMinorUnits("28.1"), 2810)
  assert.equal(creditRedemptionInputToMinorUnits("28.123"), null)
  assert.equal(customerCreditAvailableAfterPending(creditResult.customerCredit, 400), 1700)

  const creditRedemptionOperation = buildCustomerCreditRedemptionOperation(
    creditResult.customerCredit,
    {
      amountMinorUnits: 1250,
      reason: "offline customer credit redemption $12.50",
      occurredAtLocal: "2026-06-08T08:20:00Z",
      queuedAtUtc: "2026-06-08T12:20:00Z",
    },
  )
  const creditRedemptionPayload = JSON.parse(creditRedemptionOperation.payload_json)
  const creditRedemptionAuthorization = JSON.parse(
    creditRedemptionOperation.authorization_context_json,
  )
  assert.equal(creditRedemptionOperation.client_operation_id, "offline-credit-91-20260608122000")
  assert.equal(creditRedemptionPayload.amount_minor_units, 1250)
  assert.equal(creditRedemptionPayload.available_credit_snapshot_minor_units, 2100)
  assert.equal(creditRedemptionAuthorization.reason, "offline customer credit redemption $12.50")

  const scopedSessionKey = offlineSessionStorageKey("Pug Game Shop Staging!")
  assert.equal(scopedSessionKey, "tcg-store-offline-session-state-v1:pug-game-shop-staging")

  const sessionSnapshot = buildOfflineSessionStorageSnapshot(
    [eventCheckinOperation],
    [
      {
        id: "pug-game-shop-staging-1780918200000",
        companyName: "Pug Game Shop",
        siteUrl: "https://vbf.2a7.myftpupload.com",
        operationCount: 1,
        pairingStatus: "Prepared locally",
        createdAtLabel: "8:30 AM",
        networkStatus: "Deferred",
      },
    ],
    {
      profileId: "pug-game-shop-staging",
      savedAtUtc: "2026-06-08T12:30:00Z",
    },
  )

  assert.equal(sessionSnapshot.profile_id, "pug-game-shop-staging")
  assert.equal(sessionSnapshot.queued_operations.length, 1)
  assert.equal(sessionSnapshot.sync_attempts.length, 1)

  const restoredScopedSession = restoreOfflineSessionStorageSnapshot(
    JSON.stringify(sessionSnapshot),
    { profileId: "pug-game-shop-staging" },
  )
  assert.equal(restoredScopedSession.restored, true)
  assert.equal(restoredScopedSession.queuedOperations[0].operation_type, "event_checkin")
  assert.equal(restoredScopedSession.syncAttempts[0].companyName, "Pug Game Shop")

  const rejectedOtherCompanySession = restoreOfflineSessionStorageSnapshot(
    JSON.stringify(sessionSnapshot),
    { profileId: "demo-company-development" },
  )
  assert.equal(rejectedOtherCompanySession.restored, false)
  assert.deepEqual(rejectedOtherCompanySession.issues, ["offline_session_storage_invalid"])

  const legacySessionSnapshot = { ...sessionSnapshot }
  delete legacySessionSnapshot.profile_id
  const restoredLegacySession = restoreOfflineSessionStorageSnapshot(
    JSON.stringify(legacySessionSnapshot),
    { profileId: "pug-game-shop-staging", allowLegacyProfile: true },
  )
  assert.equal(restoredLegacySession.restored, true)
  assert.equal(restoredLegacySession.queuedOperations[0].client_operation_id, eventCheckinOperation.client_operation_id)

  const pushSummary = summarizeOfflinePushResult({
    data: {
      batch_id: "offline-batch-device-public-123-20260608121500",
      server_time_utc: "2026-06-08T12:16:00Z",
      operation_count: 3,
      counts: {
        accepted: 2,
        conflict: 1,
        rejected: 1,
      },
      results: [
        {
          client_operation_id: eventCheckinOperation.client_operation_id,
          status: "accepted",
        },
        {
          client_operation_id: "already-cleared-on-device",
          status: "accepted",
        },
        {
          client_operation_id: eventRegistrationOperation.client_operation_id,
          status: "conflict",
        },
        {
          client_operation_id: "remote-rejected-operation",
          status: "rejected",
        },
      ],
    },
    meta: {
      push_queue_replay_deferred: true,
      push_canonical_mutations_deferred: true,
      canonical_inventory_execution_enabled: false,
      canonical_inventory_writes_deferred: true,
    },
  })
  const queueApplyResult = applyOfflinePushResultToQueue(
    [eventRegistrationOperation, eventCheckinOperation],
    pushSummary,
  )

  assert.equal(queueApplyResult.queueReplayApplied, true)
  assert.deepEqual(queueApplyResult.removedOperationIds, [
    eventCheckinOperation.client_operation_id,
  ])
  assert.deepEqual(queueApplyResult.ignoredAcceptedOperationIds, [
    "already-cleared-on-device",
  ])
  assert.deepEqual(queueApplyResult.retainedConflictOperationIds, [
    eventRegistrationOperation.client_operation_id,
  ])
  assert.deepEqual(queueApplyResult.retainedRejectedOperationIds, [])
  assert.equal(queueApplyResult.remainingOperations.length, 1)
  assert.equal(
    queueApplyResult.remainingOperations[0].client_operation_id,
    eventRegistrationOperation.client_operation_id,
  )
} finally {
  await rm(tempDir, { force: true, recursive: true })
}

console.log("PASS offline app pull cache contract")
