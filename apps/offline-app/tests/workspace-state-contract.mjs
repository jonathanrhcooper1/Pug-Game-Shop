import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const workspaceSource = await readFile(path.join(appRoot, "src/data/offlineWorkspace.ts"), "utf8")
const appSource = await readFile(path.join(appRoot, "src/App.tsx"), "utf8")
const manifest = JSON.parse(
  await readFile(path.join(appRoot, "config/sqlite-schema.manifest.json"), "utf8"),
)

for (const requiredExport of [
  "OfflineWorkspaceState",
  "OfflineOperationEnvelope",
  "EventRegistrationStatus",
  "EventSnapshot",
  "OfflineConnectorSyncSessionPlan",
  "OfflinePushBatchPayload",
  "OfflineConflictResolutionRequestBody",
  "OfflinePullRequestBody",
  "OfflinePullInventoryCacheRecord",
  "OfflinePullInventoryCacheApplyResult",
  "OfflinePullCustomerCreditCacheRecord",
  "OfflinePullCustomerCreditCacheApplyResult",
  "OfflinePullEventCacheRecord",
  "OfflinePullEventCacheApplyResult",
  "OfflinePullConflictCacheRecord",
  "OfflinePullConflictCacheApplyResult",
  "OfflinePushRequestPlan",
  "OfflinePushResultSummary",
  "OfflinePushQueueApplyResult",
  "OfflinePullRefreshPreview",
  "OfflineConnectorTestReport",
  "StoreConnectorProfile",
  "OfflineConnectorManifest",
  "ConnectorManifestValidation",
  "DevicePairingRequestPlan",
  "DevicePairingRequestBody",
  "PreparedDevicePairingRequest",
  "ConnectorProfileDraft",
  "ConnectorProfileStorageSnapshot",
  "ConnectorProfileStorageRestoreResult",
  "PreparedPairingStorageSnapshot",
  "PreparedPairingStorageRestoreResult",
  "PairedDeviceRecord",
  "PairedDeviceStorageSnapshot",
  "PairedDeviceStorageRestoreResult",
  "OfflineSessionStorageSnapshot",
  "OfflineSessionStorageRestoreResult",
  "OfflineSyncAttemptRecord",
  "offlineWorkspaceSeed",
  "offlineConnectorRoutePreview",
  "operationEnvelopeFields",
  "createEmptyConnectorProfileDraft",
  "connectorProfileDraftFromProfile",
  "buildConnectorProfileFromDraft",
  "buildInventoryUpdateOperation",
  "buildInventoryReservationOperation",
  "buildEventCheckinOperation",
  "buildEventRegistrationOperation",
  "buildCustomerCreditRedemptionOperation",
  "buildConflictReviewOperation",
  "buildOfflineConflictResolutionRequestBody",
  "buildOfflinePushBatchPayload",
  "buildOfflinePullRequestBody",
  "applyOfflinePullInventoryRecordsToCache",
  "applyOfflinePullCustomerCreditRecordsToCache",
  "applyOfflinePullEventRecordsToCache",
  "applyOfflinePullConflictRecordsToCache",
  "buildOfflinePushRequestPlan",
  "buildOfflineConnectorSyncSessionPlan",
  "buildOfflinePullRefreshPreview",
  "buildConnectorTestReport",
  "summarizeOfflinePushResult",
  "applyOfflinePushResultToQueue",
  "buildConnectorManifestPreview",
  "validateConnectorManifest",
  "connectorManifestUrl",
  "connectorOfflineConflictResolutionUrl",
  "CONNECTOR_PROFILE_STORAGE_KEY",
  "PREPARED_PAIRING_STORAGE_KEY",
  "PAIRED_DEVICE_STORAGE_KEY",
  "OFFLINE_SESSION_STORAGE_KEY",
  "OFFLINE_SESSION_STORAGE_KEY_PREFIX",
  "offlineSessionStorageKey",
  "buildConnectorProfileStorageSnapshot",
  "restoreConnectorProfileStorageSnapshot",
  "buildPreparedPairingStorageSnapshot",
  "restorePreparedPairingStorageSnapshot",
  "buildPairedDeviceRecord",
  "buildPairedDeviceStorageSnapshot",
  "restorePairedDeviceStorageSnapshot",
  "findPairedDeviceRecord",
  "buildOfflineSessionStorageSnapshot",
  "restoreOfflineSessionStorageSnapshot",
  "buildDevicePairingRequestPlan",
  "buildDevicePairingRequestBody",
  "buildPreparedDevicePairingRequest",
  "connectorDisplayUrl",
  "findConnectorProfile",
  "connectorHealthSummary",
  "upsertConnectorProfile",
  "filterInventoryItems",
  "findInventoryItemByScan",
  "findInventoryItem",
  "eventRegistrationStatusLabel",
]) {
  assert.ok(workspaceSource.includes(requiredExport), `Missing workspace export: ${requiredExport}`)
}

for (const field of manifest.operation_envelope) {
  assert.ok(workspaceSource.includes(field), `Missing operation envelope field: ${field}`)
}

for (const route of [
  "/wp-json/tcg-store/v1/offline/devices/register",
  "/wp-json/tcg-store/v1/offline/pull",
  "/wp-json/tcg-store/v1/offline/push",
  "/offline/conflicts/",
  "/resolve",
]) {
  assert.ok(workspaceSource.includes(route), `Missing workspace route: ${route}`)
}

for (const marker of [
  "payload_json",
  "authorization_context_json",
  "schema_version: 1",
  "inventory_update",
  "credit_redemption",
  "customer_credit",
  "offline_credit_redemption",
  "staff_conflict_review",
  "sync_intent: options.syncIntent ?? \"staff_inventory_update\"",
  "syncIntent?: \"staff_inventory_update\" | \"staff_barcode_scan\" | \"staff_quantity_adjustment\"",
  "operationKind?: \"scan\" | \"quantity\" | \"update\"",
  "quantity_delta",
  "adjustment_reason",
  "publicId",
  "inventory_reservation",
  "offline_inventory_reservation",
  "offline_event_registration",
  "offline_event_checkin",
  "event_title",
  "registration_public_id",
  "checkin_method",
  "checkin_status",
  "registration_source",
  "seats_remaining_snapshot",
  "payment_status",
  "routeConnectedPushReady",
  "canonicalInventoryWritesEnabled",
  "canonical_inventory_execution_enabled",
  "canonical_inventory_operation_count",
  "canonical_inventory_writes_deferred",
  "Production connectors cannot enable canonical inventory writes from the local profile.",
  "Canonical inventory writes require the route-connected push handler.",
  "payload: parseJsonObject(operation.payload_json)",
  "authorization_context: parseJsonObject(operation.authorization_context_json)",
  "network_request_deferred: true",
  "device_authorization_header_deferred: true",
  "include_tombstones",
  "provider_credentials_required: false",
  "offline_connector_sync_session_plan",
  "offline_pull_refresh_preview",
  "localCacheRefreshApplied: true",
  "queuedOperationsPreserved",
  "changedInventoryPublicIds",
  "inventoryRowsRefreshed",
  "sanitizeOfflinePullInventoryCacheRecords",
  "sanitizeOfflinePullCustomerCreditCacheRecords",
  "sanitizeOfflinePullEventCacheRecords",
  "sanitizeOfflinePullConflictCacheRecords",
  "sale_price_minor_units",
  "location_label",
  "available_minor_units",
  "registered_count",
  "conflict_id",
  "resolution_id",
  "resolution_action",
  "expected_conflict_version",
  "deviceAuthorizationHeaderDeferred: true",
  "offline_connector_test_report",
  "Manifest shape",
  "Pairing readiness",
  "Guarded inventory holds",
  "Network reachability",
  "networkRequestsDeferred: true",
  "no-local-operations",
  "prepared_pairing_available",
  "paired_device_available",
  "paired_device_public_id",
  "desktop_token_status",
  "desktop_token_available",
  "sanitizePullCursors",
  "device_pairing_required",
  "push_queue_replay_deferred",
  "push_canonical_mutations_deferred",
  "accepted_operation_ids",
  "conflict_operation_ids",
  "rejected_operation_ids",
  "queueReplayApplied",
  "operationIdsByStatus",
  "manager_override",
  "source: \"offline_app\"",
  "connectorProfiles",
  "offline_connector_manifest",
  "connector_manifest_url",
  "connectorManifestUrl(profile)",
  "Connector manifest URL must match the WordPress REST base.",
  "offline_connector_profiles_local_storage",
  "tcg-store-offline-connector-profiles-v1",
  "tcg-store-offline-prepared-pairings-v1",
  "tcg-store-offline-paired-devices-v1",
  "tcg-store-offline-session-state-v1",
  "OFFLINE_SESSION_STORAGE_KEY_PREFIX",
  "profile_id",
  "offline_prepared_pairings_local_storage",
  "offline_paired_devices_local_storage",
  "offline_session_state_local_storage",
  "connector_profile_storage_invalid",
  "connector_profile_storage_parse_failed",
  "prepared_pairing_storage_invalid",
  "prepared_pairing_storage_parse_failed",
  "paired_device_storage_invalid",
  "paired_device_storage_parse_failed",
  "offline_session_storage_invalid",
  "offline_session_storage_parse_failed",
  "queued_operations",
  "sync_attempts",
  "sanitizeOfflineOperationEnvelopes",
  "sanitizeOfflineSyncAttempts",
  "networkRequestsDeferred: true",
  "directMysqlAccess: false",
  "hasCredentialMarker",
  "profile_manifest_ready",
  "manifest_public_safe",
  "buildConnectorManifestPreview",
  "validateConnectorManifest",
  "parseManifestSite",
  "safeConnectorId",
  "pairingCodeFingerprint",
  "prepared-pairing-",
  "prepared_local",
  "pairing_code_redacted",
  "pairing_code: normalizedPairingCode",
  "device_mode",
  "location_id",
  "manager_id",
  "capabilities",
  "requested_scopes",
  "schema_version",
  "buildDevicePairingRequestBody",
  "rawPairingCodeStored: false",
  "rawTokenStoredInBrowser: false",
  "rawTokenReturnedToUi: false",
  "productionTokenIssuanceDeferred",
  "front-counter-install",
  "parseConnectorSiteInput",
  "A valid WordPress website host or URL is required.",
  "Production connectors require HTTPS before pairing.",
  "upsertConnectorProfile",
  "pug-game-shop-staging",
  "offline_device_token",
  "desktop_secure_store",
  "official_woocommerce_square_extension",
  "wordpress_server_settings",
  "credentialsSyncedToApp: false",
  "scrydex.credentialsSyncedToApp !== false",
]) {
  assert.ok(workspaceSource.includes(marker), `Missing queued operation marker: ${marker}`)
}

assert.ok(appSource.includes("offlineWorkspaceSeed"))
assert.ok(appSource.includes("loadOfflineSessionStorage"))
assert.ok(appSource.includes("buildInventoryUpdateOperation(targetItem, operationOptions)"))
assert.ok(appSource.includes("buildInventoryReservationOperation(selectedItem)"))
assert.ok(appSource.includes("buildEventCheckinOperation(event"))
assert.ok(appSource.includes("buildEventRegistrationOperation(event"))
assert.ok(appSource.includes("buildOfflinePushBatchPayload("))
assert.ok(appSource.includes("buildOfflinePullRequestBody(activePairedDevice.devicePublicId)"))
assert.ok(appSource.includes("applyOfflinePullInventoryRecordsToCache("))
assert.ok(appSource.includes("applyOfflinePullCustomerCreditRecordsToCache("))
assert.ok(appSource.includes("applyOfflinePullEventRecordsToCache("))
assert.ok(appSource.includes("applyOfflinePullConflictRecordsToCache("))
assert.ok(appSource.includes("pull.pull_inventory_records"))
assert.ok(appSource.includes("pull.pull_customer_credit_records"))
assert.ok(appSource.includes("pull.pull_event_records"))
assert.ok(appSource.includes("pull.pull_conflict_records"))
assert.ok(appSource.includes("buildOfflinePushRequestPlan(batch)"))
assert.ok(appSource.includes("buildOfflineConnectorSyncSessionPlan("))
assert.ok(appSource.includes("buildOfflinePullRefreshPreview("))
assert.ok(appSource.includes("setPullRefreshPreview"))
assert.ok(appSource.includes("buildConnectorTestReport("))
assert.ok(appSource.includes("summarizeOfflinePushResult({"))
assert.ok(appSource.includes("applyOfflinePushResultToQueue(queuedOperations, pushSummaryResult)"))
assert.ok(appSource.includes("stagedOperation.client_operation_id"))
assert.ok(appSource.includes("stagedPushBatch.batch_id"))
assert.ok(appSource.includes("stagedPushRequest.method"))
assert.ok(appSource.includes("pushSummary.status"))
assert.ok(appSource.includes("pushSummary.canonical_inventory_writes_deferred"))
assert.ok(appSource.includes("syncSessionPlan.push.operation_count"))
assert.ok(appSource.includes("syncSessionPlan.push.canonical_inventory_writes_deferred"))
assert.ok(appSource.includes("handleInventoryReservation"))
assert.ok(appSource.includes("handleEventCheckin"))
assert.ok(appSource.includes("handleEventRegistration"))
assert.ok(appSource.includes("eventRegistrationStatusLabel("))
assert.ok(appSource.includes("recordSyncAttempt(nextSyncSessionPlan)"))
assert.ok(appSource.includes("buildOfflineSessionStorageSnapshot(queuedOperations, syncAttempts,"))
assert.ok(appSource.includes("profileId: activeProfile.id"))
assert.ok(appSource.includes("buildPairedDeviceStorageSnapshot(pairedDevices, connectorProfiles)"))
assert.ok(appSource.includes("restorePairedDeviceStorageSnapshot("))
assert.ok(appSource.includes("findPairedDeviceRecord(pairedDevices, activeProfile.id)"))
assert.ok(appSource.includes("restoreOfflineSessionStorageSnapshot("))
assert.ok(appSource.includes("OFFLINE_SESSION_STORAGE_KEY"))
assert.ok(appSource.includes("offlineSessionStorageKey(activeProfile.id)"))
assert.ok(appSource.includes("PAIRED_DEVICE_STORAGE_KEY"))
assert.ok(appSource.includes("window.localStorage.removeItem(PAIRED_DEVICE_STORAGE_KEY)"))
assert.ok(appSource.includes("window.localStorage.removeItem(sessionStorageKey)"))
assert.ok(appSource.includes("window.localStorage.removeItem(OFFLINE_SESSION_STORAGE_KEY)"))
assert.ok(appSource.includes("operationKind: \"scan\""))
assert.ok(appSource.includes("operationKind: \"quantity\""))
assert.ok(appSource.includes("syncIntent: \"staff_barcode_scan\""))
assert.ok(appSource.includes("syncIntent: \"staff_quantity_adjustment\""))

for (const forbidden of ["direct_mysql_access: true", "AUTO_INCREMENT", "http://", "https://"]) {
  assert.equal(workspaceSource.includes(forbidden), false, `Forbidden workspace marker found: ${forbidden}`)
}

console.log("PASS offline app workspace state contract")
