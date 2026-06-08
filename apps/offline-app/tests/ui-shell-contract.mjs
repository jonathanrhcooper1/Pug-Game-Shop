import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const appSource = await readFile(path.join(appRoot, "src/App.tsx"), "utf8")
const workspaceSource = await readFile(path.join(appRoot, "src/data/offlineWorkspace.ts"), "utf8")
const styles = await readFile(path.join(appRoot, "src/styles.css"), "utf8")
const appSurface = `${appSource}\n${workspaceSource}`

for (const requiredText of [
  "Offline Inventory Command",
  "Scan or search",
  "Sync queue",
  "Conflicts",
  "Customer credit",
  "Offline Mode",
  "Sync Now",
  "Website sync session plan",
  "Pull refresh",
  "Local cache",
  "Queued ops preserved",
  "Local sync attempts",
  "Queue and sync attempts are saved locally on this device.",
  "Website connector",
  "connector-manifest",
  "Pull route",
  "Push route",
  "Inventory writes",
  "Stage Inventory Update",
  "Hold Item",
  "Adjust Qty",
  "Print Label",
  "Connector profile",
  "Manifest validation",
  "Ready to test",
  "Connector test report",
  "Network deferred",
  "Pairing readiness",
  "Pairing code",
  "Prepare Pairing",
  "Check Pairing Route",
  "Checking Route",
  "Pair Device",
  "Pairing Device",
  "Pairing route check:",
  "Device pairing request:",
  "raw code sent: no",
  "Desktop secure store:",
  "raw tokens returned to UI: no",
  "Prepared pairing requests",
  "raw code not stored",
  "Test Website Connector",
  "Testing Website",
  "Validate Local Preview",
  "Live manifest imported",
  "Live manifest blocked",
  "Save Profile Draft",
  "New Connector",
  "Website host or URL",
  "profiles saved locally",
  "saved locally for this device",
  "ScryDex label",
  "Guarded inventory holds",
  "Website ID",
  "Prepared labels",
  "Pending local hold",
  "Stage Credit Use",
  "Review Ledger",
  "Company",
  "No cached cards match this scan.",
]) {
  assert.ok(appSurface.includes(requiredText), `Missing offline UI text: ${requiredText}`)
}

for (const route of [
  "/wp-json/tcg-store/v1/offline/devices/register",
  "/wp-json/tcg-store/v1/offline/pull",
  "/wp-json/tcg-store/v1/offline/push",
]) {
  assert.ok(appSurface.includes(route), `Missing sync route: ${route}`)
}

for (const className of [
  "offline-shell",
  "nav-rail",
  "top-actions",
  "title-stack",
  "scanner-row",
  "scan-beam",
  "inventory-panel",
  "detail-panel",
  "card-frame",
  "detail-actions",
  "conflict-panel",
  "connector-panel",
  "filter-tray",
  "inventory-card-grid",
  "queued-operation-list",
  "queue-storage-note",
  "connector-editor",
  "prepared-pairing-list",
  "ledger-preview",
  "label-job-list",
  "panel-empty",
  "workflow-status",
  "sync-session-panel",
  "pull-refresh-panel",
  "sync-attempt-list",
  "sync-attempt-panel",
  "toggle-field",
  "connector-test-report",
  "connector-test-checks",
]) {
  assert.ok(styles.includes(`.${className}`), `Missing UI class: ${className}`)
}

for (const interactionMarker of [
  "handleNavSelection(item.label)",
  "aria-label={item.label}",
  "scrollIntoView",
  "handleConnectorProfileChange",
  "handleNewConnectorDraft",
  "handleSaveConnectorDraft",
  "loadConnectorProfileStorage",
  "handleSyncNowPreview",
  "handleInventoryReservation",
  "recordSyncAttempt",
  "setSyncAttempts",
  "setSyncSessionPlan",
  "handleTestWebsiteConnector",
  "handleValidateLocalConnectorPreview",
  "fetch(sourceUrl",
  "credentials: \"omit\"",
  "mode: \"cors\"",
  "AbortController",
  "connectorManifestFetch",
  "buildConnectorTestReport",
  "setConnectorTestReport",
  "handleCreditRedemption",
  "handlePairingPreview",
  "handleCheckPairingRoute",
  "handlePairDevice",
  "createTauriDevicePairingAdapter",
  "devicePairingAdapter.pairOfflineDevice",
  "pairingTokenRequest",
  "rawTokenReturned: false",
  "method: \"GET\"",
  "WordPress REST route index",
  "is not registered",
  "rawPairingCodeTransmitted: false",
  "pairingRouteCheck",
  "createTauriSecureStoreAdapter",
  "secureStoreSummary",
  "No raw pairing code or token was sent.",
  "buildPreparedDevicePairingRequest",
  "buildDevicePairingRequestBody",
  "setPreparedPairingRequests",
  "setPairingCode",
  "setPairingCode(\"\")",
  "setPairingPlan",
  "setConnectorValidation",
  "setConnectorProfiles",
  "setConnectorDraft",
  "setQueuedOperations",
  "setOpenConflicts",
  "setReviewedConflicts",
  "setPendingCreditMinorUnits",
  "labelPrintJobs",
  "buildConflictReviewOperation(conflict)",
  "buildInventoryReservationOperation(selectedItem)",
  "buildCustomerCreditRedemptionOperation(workspace.customerCredit)",
  "buildConnectorProfileFromDraft",
  "buildConnectorProfileStorageSnapshot",
  "buildPreparedPairingStorageSnapshot",
  "buildOfflineSessionStorageSnapshot",
  "buildOfflineConnectorSyncSessionPlan",
  "buildOfflinePullRefreshPreview",
  "setPullRefreshPreview",
  "restoreConnectorProfileStorageSnapshot",
  "restorePreparedPairingStorageSnapshot",
  "restoreOfflineSessionStorageSnapshot",
  "CONNECTOR_PROFILE_STORAGE_KEY",
  "PREPARED_PAIRING_STORAGE_KEY",
  "OFFLINE_SESSION_STORAGE_KEY",
  "window.localStorage",
  "upsertConnectorProfile",
  "setViewMode(\"grid\")",
  "setStatusFilter(status)",
  "handleConflictAction",
  "canonicalInventoryWritesEnabled",
  "canonical_inventory_writes_deferred",
  "operationKind: \"scan\"",
  "operationKind: \"quantity\"",
  "staff_barcode_scan",
  "staff_quantity_adjustment",
]) {
  assert.ok(appSource.includes(interactionMarker), `Missing interaction marker: ${interactionMarker}`)
}

for (const responsiveMarker of ["@media (max-width: 760px)", "max-width: 12em"]) {
  assert.ok(styles.includes(responsiveMarker), `Missing responsive marker: ${responsiveMarker}`)
}

for (const color of ["#f6c760", "#79d78f", "#f07e67"]) {
  assert.ok(styles.includes(color), `Missing status/accent color: ${color}`)
}

for (const forbidden of [
  ["sk", "live", ""].join("_"),
  ["production", "api", "key"].join("-"),
  "direct_mysql_access: true",
]) {
  assert.equal(appSurface.includes(forbidden), false, `Forbidden marker found: ${forbidden}`)
  assert.equal(styles.includes(forbidden), false, `Forbidden marker found: ${forbidden}`)
}

console.log("PASS offline app UI shell contract")
