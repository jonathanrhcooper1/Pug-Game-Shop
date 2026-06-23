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
    applyLocalInventoryIntakePushResults,
    buildCustomerCreditRedemptionOperation,
    buildConnectorManifestPreview,
    buildOneWebsiteConnectorSetupPlan,
    buildEventCheckinOperation,
    buildEventRegistrationOperation,
    buildOfflineEventQueuePreviewEntries,
    buildOfflineLabelPrintJob,
    buildInventoryUpdateOperation,
    buildLocalInventoryIntakeSyncReceipts,
    buildOfflineConflictResolutionRequestBody,
    buildOfflineSessionStorageSnapshot,
    cleanInventoryAdjustmentReason,
    cleanOfflineEventAttendeeLabel,
    cleanOfflineEventRegistrationPublicId,
    connectorManifestUnavailableGuidance,
    creditRedemptionInputFromMinorUnits,
    creditRedemptionInputToMinorUnits,
    moneyInputDraftWithTwoDecimals,
    customerCreditAvailableAfterPending,
    customerCreditDisplayName,
    customerCreditLedgerEntriesForCustomer,
    customerCreditPendingMinorUnitsFromOperations,
    buildPendingCustomerCreditLedgerEntries,
    filterInventoryItems,
    findInventoryItemByScan,
    findCustomerCreditSnapshot,
    inventoryQuantityDeltaFromInput,
    isCanonicalInventoryOperation,
    offlineWorkspaceSeed,
    offlineSessionStorageKey,
    pendingLocalInventoryIntakeReceipts,
    restoreOfflineSessionStorageSnapshot,
    summarizeOfflinePushResult,
    upsertConnectorProfile,
    upsertCustomerCreditSnapshot,
    validateConnectorManifest,
  } = await import(pathToFileURL(modulePath))
  const existingItems = [
    {
      id: 7,
      publicId: "inv-1001",
      rowVersion: 10,
      providerCardId: "scrydex-pokemon-base-004",
      providerVariantId: "scrydex-pokemon-base-004-holo",
      cardName: "Charizard",
      setName: "Base Set",
      number: "4/102",
      setCode: "BASE",
      variant: "Unlimited Holo",
      finish: "Holofoil",
      language: "English",
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
      square_catalog_item_id: "SQUARE-ITEM-1001",
      square_catalog_variation_id: "SQUARE-VARIATION-1001",
      external_sync_state: "square_synced",
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
      square_catalog_item_id: "",
      square_catalog_variation_id: "",
      external_sync_state: "pending",
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
  assert.equal(updatedItem.squareCatalogItemId, "SQUARE-ITEM-1001")
  assert.equal(updatedItem.squareCatalogVariationId, "SQUARE-VARIATION-1001")
  assert.equal(updatedItem.externalSyncState, "square_synced")
  assert.equal(updatedItem.source, "accepted")

  const insertedItem = result.items.find((item) => item.publicId === "inv-2002")
  assert.equal(insertedItem.id, 8)
  assert.equal(insertedItem.cardName, "Pikachu")
  assert.equal(insertedItem.priceMinorUnits, 1800)
  assert.equal(insertedItem.externalSyncState, "pending")
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
  assert.equal(offlineWorkspaceSeed.customerCreditDirectory.length, 3)
  assert.equal(
    customerCreditDisplayName(offlineWorkspaceSeed.customerCreditDirectory[0]),
    "Morgan Lee",
  )
  assert.equal(
    findCustomerCreditSnapshot(offlineWorkspaceSeed.customerCreditDirectory, 104).customerName,
    "Avery Chen",
  )
  assert.equal(
    findCustomerCreditSnapshot(offlineWorkspaceSeed.customerCreditDirectory, 999).customerId,
    91,
  )
  const updatedCreditDirectory = upsertCustomerCreditSnapshot(
    offlineWorkspaceSeed.customerCreditDirectory,
    creditResult.customerCredit,
  )
  assert.equal(updatedCreditDirectory.length, 3)
  assert.equal(findCustomerCreditSnapshot(updatedCreditDirectory, 91).rowVersion, 7)

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
  assert.equal(filterInventoryItems(result.items, "60/64")[0].publicId, "inv-2002")
  assert.equal(filterInventoryItems(result.items, "LP", "available")[0].publicId, "inv-2002")
  assert.equal(filterInventoryItems(result.items, "LP", "reserved")[0].publicId, "inv-1001")
  assert.equal(filterInventoryItems(result.items, "SQUARE-VARIATION-1001")[0].publicId, "inv-1001")
  assert.equal(filterInventoryItems(existingItems, "holofoil")[0].publicId, "inv-1001")
  assert.equal(inventoryQuantityDeltaFromInput("+12"), 12)
  assert.equal(inventoryQuantityDeltaFromInput("-2"), -2)
  assert.equal(inventoryQuantityDeltaFromInput("0"), null)
  assert.equal(inventoryQuantityDeltaFromInput("1.5"), null)
  assert.equal(inventoryQuantityDeltaFromInput("100"), null)
  assert.equal(cleanInventoryAdjustmentReason("  cycle   count shelf  "), "cycle count shelf")
  assert.equal(cleanInventoryAdjustmentReason(""), "staff offline quantity correction")
  const labelJob = buildOfflineLabelPrintJob(
    existingItems[0],
    offlineWorkspaceSeed.connectorProfiles[0],
    {
      queuedAt: new Date("2026-06-08T12:35:00Z"),
    },
  )
  assert.equal(labelJob.action, "offline_label_print_job")
  assert.equal(labelJob.jobId, "label-pug-game-shop-production-inv-1001-20260608123500")
  assert.equal(labelJob.inventoryPublicId, "inv-1001")
  assert.equal(labelJob.barcode, "PKM-BASE-004-HOLO")
  assert.equal(labelJob.format, "card-set-condition-barcode")
  assert.equal(labelJob.setCode, "BASE")
  assert.ok(labelJob.payloadText.includes("Charizard"))
  assert.ok(labelJob.payloadText.includes("BASE NM"))
  assert.ok(labelJob.payloadText.includes("PKM-BASE-004-HOLO"))
  assert.ok(
    connectorManifestUnavailableGuidance("Manifest endpoint returned HTTP 404.").includes(
      "Install and activate the production plugin package",
    ),
  )
  assert.ok(
    connectorManifestUnavailableGuidance("Manifest endpoint did not return JSON.").includes(
      "endpoint responded",
    ),
  )
  const manifestPreview = buildConnectorManifestPreview(offlineWorkspaceSeed.connectorProfiles[0])
  assert.equal(manifestPreview.connector_identity.profile_id, manifestPreview.profile_id)
  assert.equal(manifestPreview.connector_identity.company_name, manifestPreview.company.name)
  assert.equal(
    manifestPreview.connector_identity.site_host,
    offlineWorkspaceSeed.connectorProfiles[0].wordpress.host,
  )
  assert.equal(manifestPreview.connector_identity.credential_boundary, "public_safe_no_secrets")
  assert.equal(manifestPreview.connector_identity.rest_base_url, manifestPreview.wordpress.rest_base_url)
  assert.equal(
    manifestPreview.connector_identity.connector_manifest_url,
    manifestPreview.wordpress.connector_manifest_url,
  )
  const manifestValidation = validateConnectorManifest(manifestPreview)
  assert.notEqual(manifestValidation.status, "rejected")
  assert.equal(manifestValidation.profile.id, manifestPreview.connector_identity.profile_id)
  assert.equal(offlineWorkspaceSeed.connectorProfiles.length, 1)

  const setupPlan = buildOneWebsiteConnectorSetupPlan(offlineWorkspaceSeed.connectorProfiles[0])
  assert.equal(setupPlan.action, "one_website_connector_setup_plan")
  assert.equal(setupPlan.profileSelection, "disabled_single_installation")
  assert.equal(setupPlan.localSyncServerUrl, "http://127.0.0.1:8787")
  assert.equal(setupPlan.setupStatusPath, "/setup/status")
  assert.deepEqual(setupPlan.syncPath, ["offline_app", "local_sync_server", "wordpress_woocommerce_plugin"])
  assert.equal(setupPlan.credentialsSyncedToApp, false)
  assert.equal(setupPlan.directWordPressAccess, false)
  assert.equal(setupPlan.directMysqlAccess, false)

  const replacementProfile = {
    ...offlineWorkspaceSeed.connectorProfiles[0],
    id: "another-company-staging",
    companyName: "Another Company",
    companyShortName: "Another",
    wordpress: {
      ...offlineWorkspaceSeed.connectorProfiles[0].wordpress,
      host: "another-company.example.test",
    },
  }
  const oneWebsiteProfiles = upsertConnectorProfile(offlineWorkspaceSeed.connectorProfiles, replacementProfile)
  assert.equal(oneWebsiteProfiles.length, 1)
  assert.equal(oneWebsiteProfiles[0].id, "another-company-staging")
  assert.equal(oneWebsiteProfiles[0].wordpress.host, "another-company.example.test")

  const quantityAdjustmentOperation = buildInventoryUpdateOperation(existingItems[0], {
    operationKind: "quantity",
    quantityDelta: -2,
    adjustmentReason: "cycle count shelf",
    syncIntent: "staff_quantity_adjustment",
    occurredAtLocal: "2026-06-08T08:25:00Z",
    queuedAtUtc: "2026-06-08T12:25:00Z",
  })
  const quantityAdjustmentPayload = JSON.parse(quantityAdjustmentOperation.payload_json)
  assert.equal(quantityAdjustmentOperation.client_operation_id, "offline-inventory-quantity-7-20260608122500")
  assert.equal(quantityAdjustmentPayload.quantity_delta, -2)
  assert.equal(quantityAdjustmentPayload.adjustment_reason, "cycle count shelf")
  assert.equal(quantityAdjustmentPayload.sync_intent, "staff_quantity_adjustment")
  assert.equal(isCanonicalInventoryOperation(quantityAdjustmentOperation), true)

  const intakeReceipts = buildLocalInventoryIntakeSyncReceipts(
    [
      {
        ...insertedItem,
        id: 20,
        publicId: "local-inventory-intake-001",
        rowVersion: 1,
        cardName: "Bulbasaur",
        setName: "Base Set",
        number: "44/102",
        condition: "LP",
        barcode: "PUG-PKM-BASE-044-01",
        priceMinorUnits: 350,
        price: "$3.50",
        location: "Intake Queue",
        status: "pending_intake",
        source: "queued",
      },
      {
        ...insertedItem,
        id: 21,
        publicId: "local-inventory-intake-002",
        rowVersion: 1,
        cardName: "Bulbasaur",
        setName: "Base Set",
        number: "44/102",
        condition: "LP",
        barcode: "PUG-PKM-BASE-044-02",
        priceMinorUnits: 350,
        price: "$3.50",
        location: "Intake Queue",
        status: "pending_intake",
        source: "queued",
      },
    ],
    {
      profileId: "pug-game-shop-production",
      companyName: "Pug Game Shop",
      localSyncServerUrl: "http://127.0.0.1:8787",
      queuedAtUtc: "2026-06-08T12:40:00Z",
    },
  )
  assert.equal(intakeReceipts.length, 2)
  assert.equal(intakeReceipts[0].action, "local_inventory_intake_sync_receipt")
  assert.equal(intakeReceipts[0].queueOperationType, "inventory_intake")
  assert.equal(intakeReceipts[0].localDatabase, "store-sync.sqlite")
  assert.equal(intakeReceipts[0].wordpressAcceptanceRequired, true)
  assert.equal(intakeReceipts[0].browserOperationEnvelopeCreated, false)
  assert.deepEqual(intakeReceipts[0].syncPath, [
    "offline_app",
    "local_sync_server",
    "wordpress_inventory_intake_route",
  ])
  const intakeReceiptPushResult = applyLocalInventoryIntakePushResults(
    intakeReceipts,
    [
      {
        operation_type: "inventory_intake",
        entity_id: "local-inventory-intake-001",
        status: "accepted",
        wordpress_code: "inventory_item_created",
        http_status: 201,
      },
      {
        operation_type: "inventory_intake",
        entity_id: "local-inventory-intake-002",
        status: "retry",
        wordpress_code: "wordpress_inventory_push_unavailable",
        http_status: 503,
      },
    ],
    { syncedAtUtc: "2026-06-08T12:45:00Z" },
  )
  assert.equal(intakeReceiptPushResult.acceptedCount, 1)
  assert.equal(intakeReceiptPushResult.retryCount, 1)
  assert.equal(intakeReceiptPushResult.pendingCount, 0)
  assert.equal(intakeReceiptPushResult.receipts[0].status, "accepted")
  assert.equal(intakeReceiptPushResult.receipts[0].wordpressCode, "inventory_item_created")
  assert.equal(intakeReceiptPushResult.receipts[0].lastSyncAttemptAtUtc, "2026-06-08T12:45:00Z")
  assert.deepEqual(
    pendingLocalInventoryIntakeReceipts(intakeReceiptPushResult.receipts).map((receipt) => receipt.inventoryPublicId),
    ["local-inventory-intake-002"],
  )

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

  assert.equal(cleanOfflineEventAttendeeLabel("  Jane   Pugfan  "), "Jane Pugfan")
  assert.equal(cleanOfflineEventAttendeeLabel(""), "Offline walk-in")
  assert.equal(
    cleanOfflineEventRegistrationPublicId(" registration event 200 / Jane ", "event-200"),
    "registration-event-200-Jane",
  )
  assert.equal(
    cleanOfflineEventRegistrationPublicId("", "event-200"),
    "registration-event-200-walkin",
  )

  assert.equal(eventRegistrationOperation.client_operation_id, "offline-event-reservation-event-200-20260608120000")
  assert.equal(eventRegistrationOperation.operation_type, "event_reservation")
  assert.equal(eventRegistrationOperation.entity_type, "event")
  assert.equal(eventRegistrationOperation.entity_id, "event-200")
  assert.equal(eventRegistrationOperation.base_row_version, 4)
  assert.equal(eventRegistrationPayload.event_id, "event-200")
  assert.equal(eventRegistrationPayload.event_title, "Commander Night")
  assert.equal(eventRegistrationPayload.attendee_label, "Offline walk-in")
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
  assert.equal(eventCheckinPayload.attendee_label, "Offline attendee")
  assert.equal(eventCheckinPayload.checkin_method, "manual_lookup")
  assert.equal(eventCheckinPayload.checkin_status, "checked_in")
  assert.equal(eventCheckinPayload.sync_intent, "offline_event_checkin")
  assert.equal(eventCheckinAuthorization.manager_override, false)
  assert.equal(eventCheckinAuthorization.source, "offline_app")

  const eventQueuePreviewEntries = buildOfflineEventQueuePreviewEntries(
    [eventRegistrationOperation, eventCheckinOperation],
    [
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
        note: "Cached event ready for offline queue review.",
      },
    ],
  )
  assert.equal(eventQueuePreviewEntries.length, 2)
  assert.equal(eventQueuePreviewEntries[0].operationType, "event_reservation")
  assert.equal(eventQueuePreviewEntries[0].title, "Commander Night")
  assert.equal(eventQueuePreviewEntries[0].attendeeLabel, "Offline walk-in")
  assert.equal(eventQueuePreviewEntries[0].statusLabel, "Registration")
  assert.equal(eventQueuePreviewEntries[0].paymentStatus, "pay_at_store")
  assert.ok(eventQueuePreviewEntries[0].detail.includes("Pay at store"))
  assert.ok(eventQueuePreviewEntries[0].detail.includes("1 cached seat remaining"))
  assert.ok(eventQueuePreviewEntries[0].payloadSummary.includes("Walk-in source"))
  assert.equal(eventQueuePreviewEntries[1].operationType, "event_checkin")
  assert.equal(eventQueuePreviewEntries[1].registrationPublicId, "registration-event-200-walkin")
  assert.ok(eventQueuePreviewEntries[1].detail.includes("Manual lookup"))
  assert.ok(eventQueuePreviewEntries[1].payloadSummary.includes("manual_lookup"))

  assert.equal(creditRedemptionInputFromMinorUnits(2800), "28.00")
  assert.equal(creditRedemptionInputFromMinorUnits(-1), "0.00")
  assert.equal(creditRedemptionInputToMinorUnits("$1,234.56"), 123456)
  assert.equal(creditRedemptionInputToMinorUnits("28.1"), 2810)
  assert.equal(creditRedemptionInputToMinorUnits("28.123"), null)
  assert.equal(moneyInputDraftWithTwoDecimals("12.0000"), "12.00")
  assert.equal(moneyInputDraftWithTwoDecimals("$1,234.567"), "1234.56")
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
  const cachedMorganLedgerEntries = customerCreditLedgerEntriesForCustomer(
    offlineWorkspaceSeed.customerCreditLedgerEntries,
    91,
  )
  assert.equal(cachedMorganLedgerEntries.length, 2)
  assert.equal(cachedMorganLedgerEntries[0].description, "Buylist payout approved")
  const pendingCreditLedgerEntries = buildPendingCustomerCreditLedgerEntries(
    [creditRedemptionOperation],
    creditResult.customerCredit,
  )
  assert.equal(pendingCreditLedgerEntries.length, 1)
  assert.equal(pendingCreditLedgerEntries[0].status, "pending_sync")
  assert.equal(pendingCreditLedgerEntries[0].amountMinorUnits, -1250)
  assert.equal(pendingCreditLedgerEntries[0].balanceAfterMinorUnits, 850)
  assert.equal(pendingCreditLedgerEntries[0].operationId, "offline-credit-91-20260608122000")
  assert.equal(
    customerCreditPendingMinorUnitsFromOperations(
      [creditRedemptionOperation],
      creditResult.customerCredit.customerId,
    ),
    1250,
  )

  const scopedSessionKey = offlineSessionStorageKey("Pug Game Shop Staging!")
  assert.equal(scopedSessionKey, "tcg-store-offline-session-state-v1:pug-game-shop-staging")

  const sessionSnapshot = buildOfflineSessionStorageSnapshot(
    [eventCheckinOperation],
    [
      {
        id: "pug-game-shop-staging-1780918200000",
        companyName: "Pug Game Shop",
        siteUrl: "https://thepuggaming.com",
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
