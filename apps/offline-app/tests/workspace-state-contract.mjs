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
  "OfflinePushBatchPayload",
  "OfflinePushRequestPlan",
  "OfflinePushResultSummary",
  "StoreConnectorProfile",
  "OfflineConnectorManifest",
  "ConnectorManifestValidation",
  "offlineWorkspaceSeed",
  "offlineConnectorRoutePreview",
  "operationEnvelopeFields",
  "buildInventoryUpdateOperation",
  "buildOfflinePushBatchPayload",
  "buildOfflinePushRequestPlan",
  "summarizeOfflinePushResult",
  "buildConnectorManifestPreview",
  "validateConnectorManifest",
  "connectorDisplayUrl",
  "findConnectorProfile",
  "connectorHealthSummary",
  "filterInventoryItems",
  "findInventoryItem",
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
]) {
  assert.ok(workspaceSource.includes(route), `Missing workspace route: ${route}`)
}

for (const marker of [
  "payload_json",
  "authorization_context_json",
  "schema_version: 1",
  "inventory_update",
  "sync_intent: \"staff_inventory_update\"",
  "payload: parseJsonObject(operation.payload_json)",
  "authorization_context: parseJsonObject(operation.authorization_context_json)",
  "network_request_deferred: true",
  "device_authorization_header_deferred: true",
  "provider_credentials_required: false",
  "push_queue_replay_deferred",
  "push_canonical_mutations_deferred",
  "operationIdsByStatus",
  "manager_override",
  "source: \"offline_app\"",
  "connectorProfiles",
  "offline_connector_manifest",
  "profile_manifest_ready",
  "manifest_public_safe",
  "buildConnectorManifestPreview",
  "validateConnectorManifest",
  "parseManifestSite",
  "safeConnectorId",
  "pug-game-shop-staging",
  "offline_device_token",
  "desktop_secure_store",
  "official_woocommerce_square_extension",
  "wordpress_server_settings",
  "credentialsSyncedToApp: false",
]) {
  assert.ok(workspaceSource.includes(marker), `Missing queued operation marker: ${marker}`)
}

assert.ok(appSource.includes("offlineWorkspaceSeed"))
assert.ok(appSource.includes("buildInventoryUpdateOperation(selectedItem)"))
assert.ok(appSource.includes("buildOfflinePushBatchPayload([operation])"))
assert.ok(appSource.includes("buildOfflinePushRequestPlan(batch)"))
assert.ok(appSource.includes("summarizeOfflinePushResult({"))
assert.ok(appSource.includes("stagedOperation.client_operation_id"))
assert.ok(appSource.includes("stagedPushBatch.batch_id"))
assert.ok(appSource.includes("stagedPushRequest.method"))
assert.ok(appSource.includes("pushSummary.status"))

for (const forbidden of ["direct_mysql_access: true", "AUTO_INCREMENT", "http://", "https://"]) {
  assert.equal(workspaceSource.includes(forbidden), false, `Forbidden workspace marker found: ${forbidden}`)
}

console.log("PASS offline app workspace state contract")
