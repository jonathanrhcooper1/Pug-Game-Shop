import { useEffect, useMemo, useRef, useState } from "react"

import {
  buildOfflinePushBatchPayload,
  buildOfflinePushRequestPlan,
  buildConnectorTestReport,
  buildConnectorManifestPreview,
  buildConflictReviewOperation,
  buildConnectorProfileFromDraft,
  buildConnectorProfileStorageSnapshot,
  buildCustomerCreditRedemptionOperation,
  buildDevicePairingRequestPlan,
  buildDevicePairingRequestBody,
  buildEventCheckinOperation,
  buildEventRegistrationOperation,
  buildOfflineEventQueuePreviewEntries,
  buildOfflineLabelPrintJob,
  buildOfflineConflictResolutionRequestBody,
  buildOfflinePullRefreshPreview,
  buildOfflinePullRequestBody,
  buildOneWebsiteConnectorSetupPlan,
  applyOfflinePushResultToQueue,
  applyOfflinePullConflictRecordsToCache,
  applyOfflinePullCustomerCreditRecordsToCache,
  applyOfflinePullEventRecordsToCache,
  applyOfflinePullInventoryRecordsToCache,
  applyLocalInventoryIntakePushResults,
  buildPreparedDevicePairingRequest,
  buildOfflineSessionStorageSnapshot,
  buildLocalInventoryIntakeSyncReceipts,
  buildPreparedPairingStorageSnapshot,
  buildPairedDeviceRecord,
  buildPairedDeviceStorageSnapshot,
  CONNECTOR_PROFILE_STORAGE_KEY,
  cleanOfflineEventAttendeeLabel,
  cleanOfflineEventRegistrationPublicId,
  cleanInventoryAdjustmentReason,
  connectorManifestUrl,
  connectorManifestUnavailableGuidance,
  connectorDisplayUrl,
  connectorHealthSummary,
  connectorProfileDraftFromProfile,
  connectorStatusLabel,
  creditRedemptionInputFromMinorUnits,
  creditRedemptionInputToMinorUnits,
  customerCreditAvailableAfterPending,
  customerCreditDisplayName,
  customerCreditLedgerEntriesForCustomer,
  customerCreditPendingMinorUnitsFromOperations,
  createEmptyConnectorProfileDraft,
  buildPendingCustomerCreditLedgerEntries,
  buildCustomerCreditSquarePosHandoffPlan,
  buildInventoryUpdateOperation,
  buildInventoryReservationOperation,
  buildOfflineConnectorSyncSessionPlan,
  connectorOfflineConflictResolutionUrl,
  filterInventoryItems,
  findInventoryItemByScan,
  findCustomerCreditSnapshot,
  findConnectorProfile,
  findInventoryItem,
  findPairedDeviceRecord,
  formatMoney,
  isCanonicalInventoryOperation,
  moneyInputDraftWithTwoDecimals,
  inventoryQuantityDeltaFromInput,
  localSyncServerDisplayUrl,
  offlineWorkspaceSeed,
  OFFLINE_SESSION_STORAGE_KEY,
  offlineSessionStorageKey,
  PAIRED_DEVICE_STORAGE_KEY,
  PREPARED_PAIRING_STORAGE_KEY,
  restoreOfflineSessionStorageSnapshot,
  restorePairedDeviceStorageSnapshot,
  restorePreparedPairingStorageSnapshot,
  restoreConnectorProfileStorageSnapshot,
  eventRegistrationStatusLabel,
  statusLabel,
  summarizeOfflinePushResult,
  upsertCustomerCreditSnapshot,
  upsertConnectorProfile,
  validateConnectorManifest,
  type ConflictItem,
  type ConnectorManifestValidation,
  type ConnectorProfileDraft,
  type ConnectorProfileStorageRestoreResult,
  type CustomerCreditLedgerEntry,
  type CustomerCreditSnapshot,
  type DevicePairingRequestPlan,
  type EventPaymentStatus,
  type EventSnapshot,
  type IconName,
  type InventoryItem,
  type InventoryStatus,
  type LocalInventoryIntakeSyncReceipt,
  type OfflineOperationEnvelope,
  type OfflineLabelPrintJob,
  type OfflineConnectorManifest,
  type OfflineConnectorSyncSessionPlan,
  type OfflinePushBatchPayload,
  type OfflinePushRequestPlan,
  type OfflinePushResultSummary,
  type OfflinePullRefreshPreview,
  type OfflineConnectorTestReport,
  type OfflineSessionStorageRestoreResult,
  type OfflineSyncAttemptRecord,
  type PairedDeviceRecord,
  type PairedDeviceStorageRestoreResult,
  type PreparedDevicePairingRequest,
  type PreparedPairingStorageRestoreResult,
  type StoreConnectorProfile,
} from "./data/offlineWorkspace"
import {
  createLocalSyncServerClient,
  type LocalSyncAuthResult,
  type LocalSyncCreditLedgerEntry,
  type LocalSyncCustomer,
  type LocalSyncDeviceHeartbeatResult,
  type LocalSyncDeviceStatusResult,
  type LocalSyncEventSnapshot,
  type LocalSyncInventoryItem,
  type LocalSyncPullResult,
  type LocalSyncPushResult,
  type LocalSyncSetupStatusResult,
  type LocalSyncSquarePosInventoryPullPlanResult,
  type LocalSyncScryDexCard,
  type LocalSyncScryDexPricePoint,
  type LocalSyncScryDexVariant,
  type LocalSyncStatusResult,
  type LocalSyncUser,
} from "./data/localSyncServerClient"
import {
  markOfflineOperationsSynced,
  restoreDesktopQueuedOperations,
  submitOfflineOperation,
  voidOfflineOperations,
  type OfflineQueueSubmissionResult,
} from "./data/offlineQueueBridge"
import { createTauriDevicePairingAdapter } from "./data/tauriDevicePairingAdapter"
import {
  createTauriOfflineSyncAdapter,
  type OfflineSyncCommandResponse,
} from "./data/tauriOfflineSyncAdapter"
import { createTauriQueueAdapter } from "./data/tauriQueueAdapter"
import { createTauriSecureStoreAdapter } from "./data/tauriSecureStoreAdapter"
import thePugBrandLogo from "./assets/the-pug-brand-logo.webp"
import "./styles.css"

type AppIconName =
  | IconName
  | "upload"
  | "history"
  | "search"
  | "grid"
  | "list"
  | "plus"
  | "database"
  | "link"
  | "check"
  | "tag"
  | "copy"
  | "trash"

type ViewMode = "list" | "grid"
type AppSessionRole = "locked" | "staff" | "manager"
type InventoryVisibility = LocalSyncInventoryItem["online_visibility"]
const INVENTORY_STATUS_FILTERS = [
  "all",
  "available",
  "pending_intake",
  "reserved",
  "conflict",
] as const
const INVENTORY_VISIBILITY_OPTIONS: Array<{ value: InventoryVisibility; label: string }> = [
  { value: "visible", label: "Visible" },
  { value: "staff_only", label: "Staff only" },
  { value: "hidden", label: "Hidden" },
]
const ACCESS_SECTIONS = [
  "Inventory",
  "Kiosk",
  "Queue",
  "Events",
  "Customers",
  "Sync",
  "Status",
  "Conflicts",
  "Settings",
] as const
type AccessSection = (typeof ACCESS_SECTIONS)[number]
const OFFLINE_APP_VERSION = "0.186.0"
const OFFLINE_DEMO_PIN_FALLBACK_ENABLED = import.meta.env.DEV === true

type OfflineAppUser = {
  id: string
  name: string
  pin: string
  role: Exclude<AppSessionRole, "locked">
  access: AccessSection[]
}

type KioskOrderTicket = {
  orderId: string
  customerName: string
  itemCount: number
  reservationIds: string[]
  createdAtUtc: string
  status: "queued"
}

type ActivityMessage = {
  title: string
  detail: string
}

type StatusTone = "ready" | "working" | "blocked" | "idle" | "warning"

type StatusSummaryCard = {
  id: string
  label: string
  value: string
  detail: string
  tone: StatusTone
}

type StatusTimelineEntry = {
  id: string
  title: string
  detail: string
  tone: StatusTone
}

type LanSyncLastResult = {
  generatedAtLabel: string
  pullMessage: string
  pushMessage: string
}

type QueueExportStatus = {
  status:
    | "idle"
    | "copied"
    | "downloaded"
    | "previewed"
    | "blocked"
    | "cleared"
    | "restored"
    | "voided"
  detail: string
  rawCredentialsCopied: false
}

type OperationSyncVisibilityTone = "wordpress" | "local"

type OperationSyncVisibilityRow = {
  id: string
  label: string
  countLabel: string
  wordpressStatus: string
  localStatus: string
  detail: string
  tone: OperationSyncVisibilityTone
}

type ConnectorManifestFetchState = {
  status: "idle" | "loading" | "success" | "error"
  detail: string
  sourceUrl: string
  profileId?: string
  importedAtLabel?: string
}

type PairingRouteCheckState = {
  status: "idle" | "loading" | "ready" | "blocked"
  endpoint: string
  method: "GET"
  detail: string
  rawPairingCodeTransmitted: false
  credentialsSyncedToApp: false
}

type LanSetupProbeState = {
  status: "idle" | "loading" | "ready" | "warning" | "blocked"
  endpoint: string
  detail: string
  oneWebsiteMode: true
  credentialsSyncedToApp: false
}

type PairingTokenRequestState = {
  status: "idle" | "loading" | "stored" | "blocked"
  endpoint: string
  method: "POST"
  detail: string
  rawPairingCodeTransmitted: boolean
  rawTokenReturned: false
  credentialsSyncedToApp: false
}

type DesktopSyncExecutionState = {
  status: "idle" | "loading" | "synced" | "preview" | "blocked"
  detail: string
  pull?: OfflineSyncCommandResponse
  push?: OfflineSyncCommandResponse
  cacheAppliedCount: number
  cacheInsertedCount: number
  cacheUpdatedCount: number
  cacheIgnoredCount: number
  creditCacheAppliedCount: number
  creditCacheUpdatedCount: number
  creditCacheIgnoredCount: number
  eventCacheAppliedCount: number
  eventCacheInsertedCount: number
  eventCacheUpdatedCount: number
  eventCacheIgnoredCount: number
  conflictCacheAppliedCount: number
  conflictCacheInsertedCount: number
  conflictCacheUpdatedCount: number
  conflictCacheIgnoredCount: number
  rawTokenReturned: false
  rawResponseReturned: false
  credentialsSyncedToApp: false
}

type InventoryUpdateOptions = Parameters<typeof buildInventoryUpdateOperation>[1]

function loadConnectorProfileStorage(): ConnectorProfileStorageRestoreResult {
  if (typeof window === "undefined") {
    return restoreConnectorProfileStorageSnapshot(null, offlineWorkspaceSeed.connectorProfiles)
  }

  return restoreConnectorProfileStorageSnapshot(
    window.localStorage.getItem(CONNECTOR_PROFILE_STORAGE_KEY),
    offlineWorkspaceSeed.connectorProfiles,
  )
}

function loadPreparedPairingStorage(
  profiles: ReturnType<typeof loadConnectorProfileStorage>["profiles"],
): PreparedPairingStorageRestoreResult {
  if (typeof window === "undefined") {
    return restorePreparedPairingStorageSnapshot(null, profiles)
  }

  return restorePreparedPairingStorageSnapshot(
    window.localStorage.getItem(PREPARED_PAIRING_STORAGE_KEY),
    profiles,
  )
}

function loadPairedDeviceStorage(
  profiles: ReturnType<typeof loadConnectorProfileStorage>["profiles"],
): PairedDeviceStorageRestoreResult {
  if (typeof window === "undefined") {
    return restorePairedDeviceStorageSnapshot(null, profiles)
  }

  return restorePairedDeviceStorageSnapshot(
    window.localStorage.getItem(PAIRED_DEVICE_STORAGE_KEY),
    profiles,
  )
}

function loadOfflineSessionStorage(profileId: string): OfflineSessionStorageRestoreResult {
  if (typeof window === "undefined") {
    return restoreOfflineSessionStorageSnapshot(null, { profileId })
  }

  const scopedSession = restoreOfflineSessionStorageSnapshot(
    window.localStorage.getItem(offlineSessionStorageKey(profileId)),
    { profileId },
  )

  if (scopedSession.restored) {
    return scopedSession
  }

  return restoreOfflineSessionStorageSnapshot(
    window.localStorage.getItem(OFFLINE_SESSION_STORAGE_KEY),
    { profileId, allowLegacyProfile: true },
  )
}

function Icon({ name }: { name: AppIconName }) {
  const paths: Record<AppIconName, string> = {
    box: "M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Zm8 3.5 8-4.5M12 12 4 7.5m8 4.5v8",
    sync: "M17 3v4h-4M7 21v-4h4m6-10a7 7 0 0 0-11.7 3M7 17a7 7 0 0 0 11.7-3",
    queue: "M5 7h14M5 12h14M5 17h10",
    alert: "M12 4 3 20h18L12 4Zm0 5v5m0 3h.01",
    customer: "M16 19a4 4 0 0 0-8 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    event: "M7 3v4M17 3v4M4 8h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 7h3m3 0h.01M9 16h.01M13 16h.01",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3m0 12v3M4.2 6.2l2.1 2.1m11.4 7.4 2.1 2.1M3 12h3m12 0h3M4.2 17.8l2.1-2.1m11.4-7.4 2.1-2.1",
    scan: "M5 7V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4M8 12h8",
    wifi: "M5 10a11 11 0 0 1 14 0M8 13a6.5 6.5 0 0 1 8 0M11 16a2 2 0 0 1 2 0m-1 3h.01",
    card: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm3 3h5m-5 4h10",
    upload: "M12 16V5m0 0-4 4m4-4 4 4M5 19h14",
    history: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5m4-3v6l4 2",
    search: "m20 20-4.2-4.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
    grid: "M5 5h6v6H5V5Zm10 0h4v6h-4V5ZM5 15h6v4H5v-4Zm10 0h4v4h-4v-4Z",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    plus: "M12 5v14M5 12h14",
    database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6m-16 6c0 1.7 3.6 3 8 3s8-1.3 8-3",
    link: "M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10.6 5.3M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.8-.8",
    check: "m5 13 4 4L19 7",
    tag: "M20 13 13 20 4 11V4h7l9 9Zm-11-4h.01",
    copy: "M8 8h10v12H8V8Zm-4 8V4h10",
    trash: "M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon">
      <path d={paths[name]} />
    </svg>
  )
}

function formatQueueOperationType(value: string) {
  return value.replaceAll("_", " ")
}

function queueOperationReviewSummary(operation: OfflineOperationEnvelope) {
  const payload = safeJsonRecord(operation.payload_json)
  const keys = Object.keys(payload).slice(0, 4)

  if (keys.length === 0) {
    return "Validated payload is queued locally as an empty object."
  }

  return keys
    .map((key) => `${key}: ${safeSummaryValue(payload[key])}`)
    .join("; ")
}

function buildQueueExportPayload(
  profile: StoreConnectorProfile,
  operations: OfflineOperationEnvelope[],
) {
  return {
    exported_at_utc: new Date().toISOString(),
    profile_id: profile.id,
    company_name: profile.companyName,
    site_url: connectorDisplayUrl(profile),
    operation_count: operations.length,
    credentials_synced_to_app: false,
    operations: operations.map((operation) => ({
      client_operation_id: operation.client_operation_id,
      operation_type: operation.operation_type,
      entity_type: operation.entity_type,
      entity_id: operation.entity_id,
      base_row_version: operation.base_row_version,
      queued_at_utc: operation.queued_at_utc,
      payload: safeJsonRecord(operation.payload_json),
      authorization_context: safeJsonRecord(operation.authorization_context_json),
      schema_version: operation.schema_version,
    })),
  }
}

async function copyTextToClipboard(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fall back to a temporary textarea for browser previews that deny the
    // async clipboard API.
  }

  if (typeof document === "undefined") {
    return false
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "true")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()

  try {
    return document.execCommand("copy")
  } finally {
    document.body.removeChild(textarea)
  }
}

function queueExportFileName(profile: StoreConnectorProfile) {
  return `${safeFileSegment(profile.companyName)}-${profile.environment}-queue-export.json`
}

function safeFileSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "offline"
}

function safeJsonRecord(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function safeSummaryValue(value: unknown) {
  if (typeof value === "string") {
    return value.length > 42 ? `${value.slice(0, 39)}...` : value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (Array.isArray(value)) {
    return `${value.length} item(s)`
  }

  if (value && typeof value === "object") {
    return `${Object.keys(value).length} field(s)`
  }

  return "empty"
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function statusToneFromRemoteState(status: string): StatusTone {
  if (status === "loading" || status === "searching") {
    return "working"
  }

  if (
    status === "ready" ||
    status === "ok" ||
    status === "success" ||
    status === "synced" ||
    status === "copied" ||
    status === "downloaded" ||
    status === "previewed" ||
    status === "restored" ||
    status === "voided" ||
    status === "cleared"
  ) {
    return "ready"
  }

  if (status === "blocked" || status === "error" || status === "unavailable") {
    return "blocked"
  }

  if (status === "warning") {
    return "warning"
  }

  return "idle"
}

function connectorOriginKey(value: string) {
  try {
    const url = new URL(value)

    return `${url.protocol}//${url.host}`.toLowerCase()
  } catch {
    return value.trim().replace(/\/+$/, "").toLowerCase()
  }
}

function lanSetupProbeMessage(
  result: Extract<LocalSyncSetupStatusResult, { status: "ok" }>,
  expectedWebsiteUrl: string,
) {
  if (!result.website_configured || result.setup_required) {
    return {
      status: "blocked" as const,
      detail: `${result.server_url} is running, but it is not configured for a WordPress website yet.`,
    }
  }

  const expectedOrigin = connectorOriginKey(expectedWebsiteUrl)
  const actualOrigin = connectorOriginKey(result.website_url)

  if (expectedOrigin !== actualOrigin) {
    return {
      status: "warning" as const,
      detail:
        `LAN server website mismatch: app expects ${expectedWebsiteUrl}, ` +
        `server reports ${result.website_url}.`,
    }
  }

  return {
    status: "ready" as const,
    detail:
      `${result.server_url} is bound to ${result.website_url}; pull ` +
      `${result.wordpress_pull_configured ? "on" : "off"}, push ` +
      `${result.wordpress_push_configured ? "on" : "off"}.`,
  }
}

function queuedOperationCount(
  operations: OfflineOperationEnvelope[],
  operationType: OfflineOperationEnvelope["operation_type"],
) {
  return operations.filter((operation) => operation.operation_type === operationType).length
}

function queuedKioskHoldCount(operations: OfflineOperationEnvelope[]) {
  return operations.filter((operation) => {
    if (operation.operation_type !== "inventory_reservation") {
      return false
    }

    const payload = safeJsonRecord(operation.payload_json)

    return String(payload.hold_reason ?? "").toLowerCase().includes("kiosk pickup order")
  }).length
}

function syncVisibilityQueueSummary(
  localSyncStatus: LocalSyncStatusResult | null,
  queuedOperations: OfflineOperationEnvelope[],
) {
  const appQueueLabel = countLabel(queuedOperations.length, "app queued op")

  if (localSyncStatus?.status === "ok") {
    return `${countLabel(localSyncStatus.queue_depth, "LAN queued op")}; ${appQueueLabel}`
  }

  return `LAN status unavailable; ${appQueueLabel}`
}

function buildOperationSyncVisibilityRows(options: {
  queuedOperations: OfflineOperationEnvelope[]
  inventoryItems: InventoryItem[]
  localInventoryIntakeReceipts: LocalInventoryIntakeSyncReceipt[]
  localSyncStatus: LocalSyncStatusResult | null
  pendingEventRegistrationCount: number
  pendingEventCheckinCount: number
  customerCreditDirectory: CustomerCreditSnapshot[]
  customerCreditLedgerEntries: CustomerCreditLedgerEntry[]
  offlineUsers: OfflineAppUser[]
}): OperationSyncVisibilityRow[] {
  const queuedOperations = options.queuedOperations ?? []
  const inventoryItems = options.inventoryItems ?? []
  const localInventoryIntakeReceipts = options.localInventoryIntakeReceipts ?? []
  const customerCreditDirectory = options.customerCreditDirectory ?? []
  const customerCreditLedgerEntries = options.customerCreditLedgerEntries ?? []
  const offlineUsers = options.offlineUsers ?? []
  const localStatus = options.localSyncStatus?.status === "ok" ? options.localSyncStatus : null
  const wordpressPushStatus = localStatus?.wordpress_push_connected
    ? "Push-capable through LAN sync"
    : "Push waits for LAN/WordPress connection"
  const inventoryPushConnected =
    localStatus?.wordpress_inventory_push_connected ?? localStatus?.wordpress_push_connected ?? false
  const eventPushConnected =
    localStatus?.wordpress_event_registration_push_connected ?? localStatus?.wordpress_push_connected ?? false
  const eventCheckinPushConnected =
    localStatus?.wordpress_event_checkin_push_connected ?? localStatus?.wordpress_push_connected ?? false
  const creditPushConnected = localStatus?.wordpress_credit_push_connected ?? false
  const customerPushConnected = localStatus?.wordpress_customer_push_connected ?? false
  const kioskPushConnected = localStatus?.wordpress_kiosk_order_push_connected ?? false
  const inventoryPushStatus = inventoryPushConnected
    ? "Push-capable through LAN sync"
    : "Push waits for LAN/WordPress connection"
  const eventPushStatus = eventPushConnected
    ? "Push-capable through LAN sync"
    : "Push waits for LAN/WordPress connection"
  const eventCheckinPushStatus = eventCheckinPushConnected
    ? "Push-capable through LAN sync"
    : "Push waits for LAN/WordPress event connection"
  const creditPushStatus = creditPushConnected
    ? "Push-capable through LAN sync for existing WordPress customers"
    : "Push waits for LAN/WordPress credit connection"
  const customerPushStatus = customerPushConnected
    ? "Push-capable through LAN sync"
    : "Push waits for LAN/WordPress customer connection"
  const kioskPushStatus = kioskPushConnected
    ? "Push-capable through LAN sync"
    : "Push waits for LAN/WordPress kiosk connection"
  const localOnlyStatus = "Still queued locally; current LAN push leaves this type unsupported"
  const lanQueueStatus = localStatus
    ? countLabel(localStatus.queue_depth, "LAN queued op")
    : "LAN queue status not loaded"
  const pendingIntakeCount = inventoryItems.filter(
    (item) => item.status === "pending_intake",
  ).length
  const pendingIntakeReceiptCount = localInventoryIntakeReceipts.filter(
    (receipt) => receipt.status === "pending_sync" || receipt.status === "retry",
  ).length
  const eventRegistrationCount = Math.max(
    queuedOperationCount(queuedOperations, "event_reservation"),
    options.pendingEventRegistrationCount,
  )
  const eventCheckinCount = Math.max(
    queuedOperationCount(queuedOperations, "event_checkin"),
    options.pendingEventCheckinCount,
  )
  const kioskHoldCount = queuedKioskHoldCount(queuedOperations)
  const creditRedemptionCount = queuedOperationCount(queuedOperations, "credit_redemption")
  const pendingCreditLedgerCount = customerCreditLedgerEntries.filter(
    (entry) => entry.status === "pending_sync",
  ).length
  const activeSessionCount = localStatus?.active_session_count ?? 0

  return [
    {
      id: "inventory-intake",
      label: "Inventory intake",
      countLabel: Math.max(pendingIntakeCount, pendingIntakeReceiptCount) > 0
        ? countLabel(Math.max(pendingIntakeCount, pendingIntakeReceiptCount), "pending intake")
        : countLabel(localStatus?.inventory_count ?? inventoryItems.length, "local row"),
      wordpressStatus: `${inventoryPushStatus}: inventory_intake`,
      localStatus: `LAN intake queue until accepted by WordPress; ${lanQueueStatus}; ${countLabel(pendingIntakeReceiptCount, "app receipt")}`,
      detail:
        "New cards stay pending_intake in store-sync.sqlite with an app receipt until WordPress accepts the inventory push.",
      tone: "wordpress",
    },
    {
      id: "event-registration",
      label: "Event registration",
      countLabel: countLabel(eventRegistrationCount, "visible op"),
      wordpressStatus: `${eventPushStatus}: event_registration`,
      localStatus:
        `LAN event queue plus app review queue; ${countLabel(
          queuedOperationCount(queuedOperations, "event_reservation"),
          "app op",
        )}`,
      detail:
        "Walk-ins and waitlist requests keep website capacity authoritative until sync acceptance.",
      tone: "wordpress",
    },
    {
      id: "event-checkin",
      label: "Event check-in",
      countLabel: countLabel(eventCheckinCount, "visible op"),
      wordpressStatus: `${eventCheckinPushStatus}: event_checkin`,
      localStatus:
        `LAN event queue plus app review queue; ${countLabel(
          queuedOperationCount(queuedOperations, "event_checkin"),
          "app op",
        )}`,
      detail:
        "Manual check-ins push to WordPress through the LAN server while WordPress remains the registration match authority.",
      tone: eventCheckinPushConnected ? "wordpress" : "local",
    },
    {
      id: "kiosk-order",
      label: "Kiosk order",
      countLabel: localStatus
        ? countLabel(localStatus.kiosk_order_count, "local order")
        : countLabel(kioskHoldCount, "visible hold"),
      wordpressStatus: `${kioskPushStatus}: kiosk_order`,
      localStatus:
        `Pickup order stays in the LAN kiosk queue; ${countLabel(kioskHoldCount, "app hold")}`,
      detail:
        "Pickup orders can sync to WordPress as exact inventory reservations for staff picking.",
      tone: kioskPushConnected ? "wordpress" : "local",
    },
    {
      id: "customer-upsert",
      label: "Customer upsert",
      countLabel: countLabel(
        localStatus?.customer_count ?? customerCreditDirectory.length,
        "local customer",
      ),
      wordpressStatus: `${customerPushStatus}: customer_upsert`,
      localStatus: `LAN customer queue/cache; ${lanQueueStatus}`,
      detail:
        "Created customer records can sync first so later credit ledger posts have a WordPress customer ID.",
      tone: customerPushConnected ? "wordpress" : "local",
    },
    {
      id: "credit-adjustment-redemption",
      label: "Credit adjustment/redemption",
      countLabel: pendingCreditLedgerCount > 0 || creditRedemptionCount > 0
        ? countLabel(Math.max(pendingCreditLedgerCount, creditRedemptionCount), "pending ledger op")
        : countLabel(
          localStatus?.credit_ledger_entry_count ?? customerCreditLedgerEntries.length,
          "ledger row",
        ),
      wordpressStatus: `${creditPushStatus}: credit_adjustment and credit_redemption`,
      localStatus:
        `LAN ledger queue; Square payment capture still stays in Square POS; ${lanQueueStatus}`,
      detail:
        customerPushConnected
          ? "New local customers sync before credit posts in the same LAN push attempt."
          : "Existing WordPress customers can sync ledger posts; new local customers stay queued until customer upsert is live.",
      tone: creditPushConnected ? "wordpress" : "local",
    },
    {
      id: "user-access",
      label: "User access",
      countLabel: countLabel(offlineUsers.length, "PIN user"),
      wordpressStatus: "Not in the WordPress push batch: user_access_upsert",
      localStatus: `LAN access policy cache; ${countLabel(activeSessionCount, "active session")}`,
      detail:
        "PIN users, roles, and workspace access are managed by LAN user endpoints, with no raw PIN hash returned.",
      tone: "local",
    },
  ]
}

function customerCreditSnapshotFromLocalSyncCustomer(
  customer: LocalSyncCustomer,
  fallback: CustomerCreditSnapshot,
): CustomerCreditSnapshot {
  const customerId = customer.customer_id ?? fallback.customerId
  const availableMinorUnits = Math.max(0, Math.trunc(customer.credit.balance_minor_units))

  return {
    customerId,
    customerPublicId: customer.customer_public_id,
    rowVersion: customer.row_version,
    label: "Customer credit",
    customerName: customer.display_name,
    customerLookup: customer.customer_lookup || customer.email || fallback.customerLookup,
    availableMinorUnits,
    redemptionPreviewMinorUnits: Math.min(fallback.redemptionPreviewMinorUnits, availableMinorUnits),
    currency: customer.credit.currency,
    note:
      customer.source === "queued"
        ? "LAN server balance updated locally; website ledger posting is pending sync acceptance."
        : "Cached website ledger balance from the LAN local sync server.",
  }
}

function customerCreditLedgerEntryFromLocalSync(
  entry: LocalSyncCreditLedgerEntry,
  customerId: number,
): CustomerCreditLedgerEntry {
  return {
    entryId: entry.entry_id,
    customerId,
    occurredAtLabel: new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
    }).format(new Date(entry.created_at_utc)),
    description: entry.reason || entry.entry_type,
    amountMinorUnits: entry.amount_minor_units,
    balanceAfterMinorUnits: entry.balance_after_minor_units,
    currency: entry.currency,
    status: entry.status,
    sourceLabel: entry.status === "pending_sync" ? "LAN queue" : "Website cache",
    operationId: entry.entry_id,
  }
}

function formatUtcLabel(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "unknown"
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date)
}

function squarePosReviewItemFromLegacyMapping(mapping: Record<string, unknown>) {
  const errors = Array.isArray(mapping.errors)
    ? mapping.errors.map((error) => String(error)).filter(Boolean)
    : []
  const barcode = String(mapping.barcode ?? "")
  const sku = String(mapping.sku ?? mapping.scanIdentity ?? barcode)

  return {
    public_id: String(mapping.publicId ?? mapping.public_id ?? ""),
    card_name: "Unmapped POS inventory",
    set_name: "",
    condition: "",
    barcode,
    sku,
    scan_identity: String(mapping.scanIdentity ?? sku ?? barcode),
    status: "conflict" as const,
    pos_visibility: "visible" as const,
    square_catalog_variation_id: "",
    errors,
    issue_labels: errors.map((error) => error.replace(/_/g, " ")),
    next_action: errors.includes("square_catalog_variation_id_required_for_inventory_pull")
      ? "Create or link a Square catalog variation for this website inventory row."
      : "Review this POS inventory row before enabling Square reconciliation.",
  }
}

function inventoryItemFromLocalSync(
  item: LocalSyncInventoryItem,
  nextId: number,
): InventoryItem {
  return {
    id: nextId,
    publicId: item.public_id,
    rowVersion: item.row_version,
    providerCardId: item.provider_card_id,
    referenceVariantId: item.reference_variant_id,
    providerVariantId: item.provider_variant_id,
    game: item.game,
    cardName: item.card_name,
    setName: item.set_name,
    number: item.printed_number || item.card_number || item.public_id,
    setCode: item.set_code,
    variant: item.variant,
    finish: item.finish,
    language: item.language,
    rawOrGraded: item.raw_or_graded,
    condition: item.condition,
    barcode: item.barcode,
    price: formatMoney(item.price_minor_units, item.currency),
    priceMinorUnits: item.price_minor_units,
    currency: item.currency,
    location: item.location,
    status: item.status,
    imageUrl: item.image_url,
    backImageUrl: item.back_image_url,
    onlineVisibility: item.online_visibility,
    kioskVisibility: item.kiosk_visibility,
    posVisibility: item.pos_visibility,
    squareCatalogItemId: item.square_catalog_item_id,
    squareCatalogVariationId: item.square_catalog_variation_id,
    externalSyncState: item.external_sync_state,
    source: item.source,
  }
}

function mergeLocalSyncInventoryItems(
  currentItems: InventoryItem[],
  localSyncItems: LocalSyncInventoryItem[],
): InventoryItem[] {
  if (localSyncItems.length === 0) {
    return currentItems
  }

  const remoteItemsByPublicId = new Map(
    localSyncItems.map((item) => [item.public_id, item] as const),
  )
  const seenPublicIds = new Set(currentItems.map((item) => item.publicId))
  const updatedItems = currentItems.map((item) => {
    const remoteItem = remoteItemsByPublicId.get(item.publicId)

    return remoteItem ? inventoryItemFromLocalSync(remoteItem, item.id) : item
  })
  let nextId = currentItems.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1
  const newItems = localSyncItems
    .filter((item) => !seenPublicIds.has(item.public_id))
    .map((item) => inventoryItemFromLocalSync(item, nextId++))

  return newItems.length > 0 ? [...newItems, ...updatedItems] : updatedItems
}

function formatScryDexVariant(variant: LocalSyncScryDexVariant) {
  return [
    variant.variant,
    variant.finish,
    variant.edition,
    variant.language,
  ]
    .filter(Boolean)
    .join(" / ")
}

function scryDexVariantId(cardId: string, variant: LocalSyncScryDexVariant, index: number) {
  return variant.provider_variant_id || String(variant.reference_variant_id ?? "") || `${cardId}-variant-${index}`
}

function cardImageForSelectedVariant(
  card: LocalSyncScryDexCard | null,
  variant: LocalSyncScryDexVariant | null,
) {
  return variant?.front_image_url || card?.image_url || ""
}

function pricePointMinorUnits(point: LocalSyncScryDexPricePoint) {
  return point.market_price_minor_units ||
    point.mid_price_minor_units ||
    point.low_price_minor_units ||
    point.high_price_minor_units ||
    0
}

function scryDexIntakePriceMinorUnits(
  card: LocalSyncScryDexCard,
  variant: LocalSyncScryDexVariant | null,
  condition: string,
) {
  const normalizedCondition = condition.trim().toUpperCase()
  const variantProviderId = variant?.provider_variant_id ?? ""
  const variantReferenceId = variant?.reference_variant_id ?? null
  const pricePoints = card.price_points ?? []

  const variantAndConditionPoint = pricePoints.find((point) =>
    pricePointMinorUnits(point) > 0 &&
    point.condition_code === normalizedCondition &&
    (
      (variantProviderId !== "" && point.provider_variant_id === variantProviderId) ||
      (variantReferenceId !== null && point.reference_variant_id === variantReferenceId)
    ),
  )

  if (variantAndConditionPoint) {
    return pricePointMinorUnits(variantAndConditionPoint)
  }

  const conditionPoint = pricePoints.find((point) =>
    pricePointMinorUnits(point) > 0 && point.condition_code === normalizedCondition,
  )

  if (conditionPoint) {
    return pricePointMinorUnits(conditionPoint)
  }

  const variantPoint = pricePoints.find((point) =>
    pricePointMinorUnits(point) > 0 &&
    (
      (variantProviderId !== "" && point.provider_variant_id === variantProviderId) ||
      (variantReferenceId !== null && point.reference_variant_id === variantReferenceId)
    ),
  )

  return variantPoint ? pricePointMinorUnits(variantPoint) : card.market_price_minor_units
}

function inventoryVersionLabel(item: InventoryItem) {
  return [
    item.variant,
    item.finish,
    item.language,
  ]
    .filter(Boolean)
    .join(" / ") || "Default version"
}

function inventoryVisibilityLabel(value?: InventoryVisibility) {
  if (value === "staff_only") {
    return "Staff only"
  }

  if (value === "hidden") {
    return "Hidden"
  }

  return "Visible"
}

function inventoryVisibilitySummary(item: InventoryItem) {
  return `Online ${inventoryVisibilityLabel(item.onlineVisibility)}, kiosk ${inventoryVisibilityLabel(
    item.kioskVisibility,
  )}, POS ${inventoryVisibilityLabel(item.posVisibility)}`
}

function lanSyncPushMessage(result: LocalSyncPushResult | null) {
  if (!result) {
    return "LAN inventory push was not run because no PIN session is active."
  }

  if (result.status !== "ok") {
    return `LAN inventory push blocked: ${result.message}`
  }

  return `LAN push accepted ${result.accepted_count} operation(s), left ${result.retry_count} retry and ${result.unsupported_operation_count} unsupported operation(s) queued.`
}

function inventoryStatusFromWordPressPushResult(
  result: Extract<LocalSyncPushResult, { status: "ok" }>,
  publicId: string,
): InventoryStatus | null {
  const pushResult = result.results.find(
    (candidate) => candidate.status === "accepted" && candidate.entity_id === publicId,
  )
  const wordpressStatus = String(pushResult?.wordpress_inventory?.status ?? "")

  return INVENTORY_STATUS_FILTERS.includes(wordpressStatus as InventoryStatus)
    ? wordpressStatus as InventoryStatus
    : null
}

function lanSyncPullMessage(result: LocalSyncPullResult | null) {
  if (!result) {
    return "LAN website pull was not run because no PIN session is active."
  }

  if (result.status !== "ok") {
    return `LAN website pull blocked: ${result.message}`
  }

  return `LAN website pull applied ${result.applied_count} inventory item(s) and ${result.events_applied_count} event(s); inserted ${result.inserted_count} item(s) / ${result.events_inserted_count} event(s), updated ${result.updated_count} item(s) / ${result.events_updated_count} event(s), and preserved ${result.ignored_count + result.events_ignored_count} local row(s).`
}

function eventSnapshotFromLocalSync(event: LocalSyncEventSnapshot): EventSnapshot {
  return {
    eventId: event.event_id,
    rowVersion: event.row_version,
    title: event.title,
    startsAtUtc: event.starts_at_utc,
    startsAtLabel: event.starts_at_label,
    registrationStatus: event.registration_status,
    capacity: event.capacity,
    registeredCount: event.registered_count,
    locationLabel: event.location_label,
    note: event.note,
  }
}

function mergeLocalSyncEventSnapshots(
  currentEvents: EventSnapshot[],
  localSyncEvents: LocalSyncEventSnapshot[],
): EventSnapshot[] {
  if (localSyncEvents.length === 0) {
    return currentEvents
  }

  const mergedByEventId = new Map(currentEvents.map((event) => [event.eventId, event] as const))

  for (const pulledEvent of localSyncEvents) {
    const mappedEvent = eventSnapshotFromLocalSync(pulledEvent)
    const existingEvent = mergedByEventId.get(mappedEvent.eventId)

    if (!existingEvent || mappedEvent.rowVersion >= existingEvent.rowVersion) {
      mergedByEventId.set(mappedEvent.eventId, mappedEvent)
    }
  }

  return Array.from(mergedByEventId.values()).sort((left, right) =>
    left.startsAtUtc.localeCompare(right.startsAtUtc),
  )
}

export function App() {
  const workspace = offlineWorkspaceSeed
  const queueAdapter = useMemo(() => createTauriQueueAdapter(), [])
  const devicePairingAdapter = useMemo(() => createTauriDevicePairingAdapter(), [])
  const offlineSyncAdapter = useMemo(() => createTauriOfflineSyncAdapter(), [])
  const secureStoreAdapter = useMemo(() => createTauriSecureStoreAdapter(), [])
  const inventoryPanelRef = useRef<HTMLElement>(null)
  const workflowPanelRef = useRef<HTMLElement>(null)
  const statusPanelRef = useRef<HTMLElement>(null)
  const kioskPanelRef = useRef<HTMLElement>(null)
  const queuePanelRef = useRef<HTMLElement>(null)
  const eventPanelRef = useRef<HTMLElement>(null)
  const conflictPanelRef = useRef<HTMLElement>(null)
  const creditPanelRef = useRef<HTMLElement>(null)
  const connectorPanelRef = useRef<HTMLElement>(null)
  const connectorProfileStorageRef = useRef<ConnectorProfileStorageRestoreResult | null>(null)
  if (connectorProfileStorageRef.current === null) {
    connectorProfileStorageRef.current = loadConnectorProfileStorage()
  }
  const connectorProfileStorage = connectorProfileStorageRef.current
  const preparedPairingStorageRef = useRef<PreparedPairingStorageRestoreResult | null>(null)
  if (preparedPairingStorageRef.current === null) {
    preparedPairingStorageRef.current = loadPreparedPairingStorage(connectorProfileStorage.profiles)
  }
  const preparedPairingStorage = preparedPairingStorageRef.current
  const pairedDeviceStorageRef = useRef<PairedDeviceStorageRestoreResult | null>(null)
  if (pairedDeviceStorageRef.current === null) {
    pairedDeviceStorageRef.current = loadPairedDeviceStorage(connectorProfileStorage.profiles)
  }
  const pairedDeviceStorage = pairedDeviceStorageRef.current
  const offlineSessionStorageRef = useRef<OfflineSessionStorageRestoreResult | null>(null)
  if (offlineSessionStorageRef.current === null) {
    offlineSessionStorageRef.current = loadOfflineSessionStorage(
      connectorProfileStorage.activeProfileId,
    )
  }
  const offlineSessionStorage = offlineSessionStorageRef.current
  const [inventoryItems, setInventoryItems] = useState(workspace.inventoryItems)
  const [customerCreditDirectory, setCustomerCreditDirectory] = useState(
    workspace.customerCreditDirectory,
  )
  const [customerCreditLedgerEntries, setCustomerCreditLedgerEntries] = useState(
    workspace.customerCreditLedgerEntries,
  )
  const [eventSnapshots, setEventSnapshots] = useState(workspace.eventSnapshots)
  const [connectorProfiles, setConnectorProfiles] = useState(connectorProfileStorage.profiles)
  const [openConflicts, setOpenConflicts] = useState(workspace.conflicts)
  const [reviewedConflicts, setReviewedConflicts] = useState<ConflictItem[]>([])
  const [queuedOperations, setQueuedOperations] = useState<OfflineOperationEnvelope[]>(
    offlineSessionStorage.queuedOperations,
  )
  const [localInventoryIntakeReceipts, setLocalInventoryIntakeReceipts] = useState<
    LocalInventoryIntakeSyncReceipt[]
  >([])
  const [activeCustomerId, setActiveCustomerId] = useState(workspace.customerCredit.customerId)
  const [pendingCreditByCustomer, setPendingCreditByCustomer] = useState<Record<number, number>>({})
  const [creditRedemptionInput, setCreditRedemptionInput] = useState(() =>
    creditRedemptionInputFromMinorUnits(workspace.customerCredit.redemptionPreviewMinorUnits),
  )
  const [squareSaleTotalInput, setSquareSaleTotalInput] = useState(() =>
    creditRedemptionInputFromMinorUnits(
      workspace.inventoryItems.find((item) => item.id === 42)?.priceMinorUnits ?? 0,
    ),
  )
  const [squareReceiptReference, setSquareReceiptReference] = useState("")
  const [squareCashierConfirmed, setSquareCashierConfirmed] = useState(false)
  const [newCustomerFirstName, setNewCustomerFirstName] = useState("")
  const [newCustomerLastName, setNewCustomerLastName] = useState("")
  const [newCustomerEmail, setNewCustomerEmail] = useState("")
  const [creditAdjustmentInput, setCreditAdjustmentInput] = useState("0.00")
  const [creditAdjustmentReason, setCreditAdjustmentReason] = useState("Manager-approved store credit")
  const [pendingEventRegistrationIds, setPendingEventRegistrationIds] = useState<string[]>([])
  const [pendingEventCheckinIds, setPendingEventCheckinIds] = useState<string[]>([])
  const [showCreditLedger, setShowCreditLedger] = useState(false)
  const [showEventQueue, setShowEventQueue] = useState(false)
  const [labelPrintJobs, setLabelPrintJobs] = useState<OfflineLabelPrintJob[]>([])
  const [query, setQuery] = useState("")
  const [lanInventorySearchStatus, setLanInventorySearchStatus] = useState<
    "idle" | "searching" | "ready" | "blocked"
  >("idle")
  const [lanInventorySearchDetail, setLanInventorySearchDetail] = useState(
    "Type to search the local cache; LAN results hydrate automatically.",
  )
  const [intakeCardName, setIntakeCardName] = useState("")
  const [intakeSetName, setIntakeSetName] = useState("")
  const [intakeCondition, setIntakeCondition] = useState("LP")
  const [intakeBarcode, setIntakeBarcode] = useState("")
  const [intakePriceInput, setIntakePriceInput] = useState("0.00")
  const [intakeLocation, setIntakeLocation] = useState("Intake Queue")
  const [intakeOnlineVisibility, setIntakeOnlineVisibility] = useState<InventoryVisibility>("visible")
  const [intakeKioskVisibility, setIntakeKioskVisibility] = useState<InventoryVisibility>("visible")
  const [intakePosVisibility, setIntakePosVisibility] = useState<InventoryVisibility>("visible")
  const [scryDexQuery, setScryDexQuery] = useState("")
  const [scryDexGame, setScryDexGame] = useState<LocalSyncScryDexCard["game"]>("pokemon")
  const [scryDexCards, setScryDexCards] = useState<LocalSyncScryDexCard[]>([])
  const [selectedScryDexCardId, setSelectedScryDexCardId] = useState("")
  const [selectedScryDexVariantId, setSelectedScryDexVariantId] = useState("")
  const [scryDexLookupStatus, setScryDexLookupStatus] = useState<
    "idle" | "searching" | "ready" | "blocked"
  >("idle")
  const [scryDexLookupDetail, setScryDexLookupDetail] = useState("Ready")
  const [selectedId, setSelectedId] = useState(42)
  const [intakeQuantityInput, setIntakeQuantityInput] = useState("1")
  const [selectedEventId, setSelectedEventId] = useState(workspace.eventSnapshots[0]?.eventId ?? "")
  const [eventAttendeeLabel, setEventAttendeeLabel] = useState("Offline walk-in")
  const [eventPaymentStatus, setEventPaymentStatus] =
    useState<EventPaymentStatus>("not_required")
  const [eventCheckinLookup, setEventCheckinLookup] = useState("")
  const [activeSection, setActiveSection] = useState("Inventory")
  const [sessionRole, setSessionRole] = useState<AppSessionRole>("locked")
  const [sessionUserId, setSessionUserId] = useState("")
  const [localSyncSessionToken, setLocalSyncSessionToken] = useState("")
  const [localSyncSessionExpiresAtUtc, setLocalSyncSessionExpiresAtUtc] = useState("")
  const [localSyncStatus, setLocalSyncStatus] = useState<LocalSyncStatusResult | null>(null)
  const [squarePosPlan, setSquarePosPlan] =
    useState<LocalSyncSquarePosInventoryPullPlanResult | null>(null)
  const squarePosMappingSummary =
    squarePosPlan?.status === "ok"
      ? squarePosPlan.mapping_summary ?? {
        total_inventory_count: inventoryItems.length,
        pos_visible_count: inventoryItems.filter((item) => item.posVisibility === "visible").length,
        pos_hidden_count: inventoryItems.filter((item) => item.posVisibility === "hidden").length,
        pos_staff_only_count: inventoryItems.filter((item) => item.posVisibility === "staff_only").length,
        available_pos_visible_count: inventoryItems.filter(
          (item) => item.status === "available" && item.posVisibility === "visible",
        ).length,
        ready_for_square_pull_count: squarePosPlan.mapped_count,
        ready_available_count: squarePosPlan.mapped_count,
        ready_zero_count: 0,
        review_count: squarePosPlan.unresolved_count,
        unmapped_pos_visible_count: squarePosPlan.unresolved_count,
        duplicate_scan_identity_count: 0,
        square_inventory_authority: "tcg_store_platform" as const,
        square_counts_used_for: "pos_reconciliation_and_exception_detection" as const,
      }
      : null
  const squarePosPullFeed = squarePosPlan?.status === "ok" ? squarePosPlan.square_pull_feed ?? [] : []
  const squarePosReviewItems =
    squarePosPlan?.status === "ok"
      ? squarePosPlan.review_items ??
        squarePosPlan.unresolved_mappings.map(squarePosReviewItemFromLegacyMapping)
      : []
  const squarePosNextActions =
    squarePosPlan?.status === "ok"
      ? squarePosPlan.next_actions ??
        (squarePosReviewItems.length
          ? ["Map POS-visible website inventory to Square catalog variations or hide it from POS until mapped."]
          : [])
      : []
  const [localDeviceHeartbeat, setLocalDeviceHeartbeat] =
    useState<LocalSyncDeviceHeartbeatResult | null>(null)
  const [localDeviceStatus, setLocalDeviceStatus] =
    useState<LocalSyncDeviceStatusResult | null>(null)
  const [loginPin, setLoginPin] = useState("")
  const [loginIssue, setLoginIssue] = useState("")
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30)
  const [managerSettingsLocked, setManagerSettingsLocked] = useState(true)
  const [offlineUsers, setOfflineUsers] = useState<OfflineAppUser[]>([
    {
      id: "staff-front-counter",
      name: "Front Counter Staff",
      pin: "1234",
      role: "staff",
      access: ["Inventory", "Kiosk", "Queue", "Events", "Customers", "Sync", "Status"],
    },
    {
      id: "manager-default",
      name: "Store Manager",
      pin: "9999",
      role: "manager",
      access: [...ACCESS_SECTIONS],
    },
    {
      id: "preview-manager",
      name: "Preview Manager",
      pin: "1420",
      role: "manager",
      access: [...ACCESS_SECTIONS],
    },
  ])
  const [newUserName, setNewUserName] = useState("")
  const [newUserPin, setNewUserPin] = useState("")
  const [newUserRole, setNewUserRole] = useState<Exclude<AppSessionRole, "locked">>("staff")
  const [newUserAccess, setNewUserAccess] = useState<AccessSection[]>([
    "Inventory",
    "Kiosk",
    "Queue",
    "Status",
  ])
  const [kioskFirstName, setKioskFirstName] = useState("")
  const [kioskLastName, setKioskLastName] = useState("")
  const [kioskCartIds, setKioskCartIds] = useState<number[]>([])
  const [kioskOrderTickets, setKioskOrderTickets] = useState<KioskOrderTicket[]>([])
  const [activeProfileId, setActiveProfileId] = useState(connectorProfileStorage.activeProfileId)
  const activeSessionProfileRef = useRef(connectorProfileStorage.activeProfileId)
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [quantityDeltaInput, setQuantityDeltaInput] = useState("1")
  const [quantityAdjustmentReason, setQuantityAdjustmentReason] =
    useState("staff offline quantity correction")
  const [activityMessage, setActivityMessage] = useState<ActivityMessage>({
    title: offlineSessionStorage.restored ? "Local queue restored" : "Local workspace ready",
    detail: offlineSessionStorage.restored
      ? `${offlineSessionStorage.queuedOperations.length} queued operation(s) and ${offlineSessionStorage.syncAttempts.length} sync attempt(s) restored from this device.`
      : "Run website setup, scan inventory, or stage a queue update.",
  })
  const [selectedConflictTitle, setSelectedConflictTitle] = useState("")
  const [showConflictHistory, setShowConflictHistory] = useState(false)
  const [stagedOperation, setStagedOperation] = useState<OfflineOperationEnvelope | null>(null)
  const [stagedPushBatch, setStagedPushBatch] = useState<OfflinePushBatchPayload | null>(null)
  const [stagedPushRequest, setStagedPushRequest] = useState<OfflinePushRequestPlan | null>(null)
  const [pushSummary, setPushSummary] = useState<OfflinePushResultSummary | null>(null)
  const [syncSessionPlan, setSyncSessionPlan] = useState<OfflineConnectorSyncSessionPlan | null>(null)
  const [pullRefreshPreview, setPullRefreshPreview] = useState<OfflinePullRefreshPreview | null>(null)
  const [lanSyncLastResult, setLanSyncLastResult] = useState<LanSyncLastResult | null>(null)
  const [syncNowInFlight, setSyncNowInFlight] = useState(false)
  const [desktopSyncExecution, setDesktopSyncExecution] = useState<DesktopSyncExecutionState>({
    status: "idle",
    detail: "Desktop live sync has not run for this connector.",
    cacheAppliedCount: 0,
    cacheInsertedCount: 0,
    cacheUpdatedCount: 0,
    cacheIgnoredCount: 0,
    creditCacheAppliedCount: 0,
    creditCacheUpdatedCount: 0,
    creditCacheIgnoredCount: 0,
    eventCacheAppliedCount: 0,
    eventCacheInsertedCount: 0,
    eventCacheUpdatedCount: 0,
    eventCacheIgnoredCount: 0,
    conflictCacheAppliedCount: 0,
    conflictCacheInsertedCount: 0,
    conflictCacheUpdatedCount: 0,
    conflictCacheIgnoredCount: 0,
    rawTokenReturned: false,
    rawResponseReturned: false,
    credentialsSyncedToApp: false,
  })
  const [syncAttempts, setSyncAttempts] = useState<OfflineSyncAttemptRecord[]>(
    offlineSessionStorage.syncAttempts,
  )
  const [queueSubmission, setQueueSubmission] = useState<OfflineQueueSubmissionResult | null>(null)
  const [selectedQueuedOperationId, setSelectedQueuedOperationId] = useState(
    offlineSessionStorage.queuedOperations[0]?.client_operation_id ?? "",
  )
  const [queueExportStatus, setQueueExportStatus] = useState<QueueExportStatus>({
    status: "idle",
    detail: "No queue export has run for this profile.",
    rawCredentialsCopied: false,
  })
  const [queueExportPreview, setQueueExportPreview] = useState("")
  const [isDesktopQueueRefreshing, setIsDesktopQueueRefreshing] = useState(false)
  const [isQueueVoidInFlight, setIsQueueVoidInFlight] = useState(false)
  const [connectorValidation, setConnectorValidation] =
    useState<ConnectorManifestValidation | null>(null)
  const [connectorTestReport, setConnectorTestReport] =
    useState<OfflineConnectorTestReport | null>(null)
  const [connectorManifestFetch, setConnectorManifestFetch] =
    useState<ConnectorManifestFetchState>({
      status: "idle",
      detail: "Live manifest fetch has not run for this profile.",
      sourceUrl: "",
    })
  const [connectorDraft, setConnectorDraft] = useState<ConnectorProfileDraft>(() =>
    workspace.connectorProfiles[0]
      ? connectorProfileDraftFromProfile(workspace.connectorProfiles[0])
      : createEmptyConnectorProfileDraft(),
  )
  const [connectorDraftIssues, setConnectorDraftIssues] = useState<string[]>([])
  const [pairingCode, setPairingCode] = useState("")
  const [pairingPlan, setPairingPlan] = useState<DevicePairingRequestPlan | null>(null)
  const [pairingRouteCheck, setPairingRouteCheck] = useState<PairingRouteCheckState>({
    status: "idle",
    endpoint: "",
    method: "GET",
    detail: "Pairing route has not been checked for this connector.",
    rawPairingCodeTransmitted: false,
    credentialsSyncedToApp: false,
  })
  const [lanSetupProbe, setLanSetupProbe] = useState<LanSetupProbeState>({
    status: "idle",
    endpoint: "",
    detail: "LAN setup probe has not run for this website.",
    oneWebsiteMode: true,
    credentialsSyncedToApp: false,
  })
  const [pairingTokenRequest, setPairingTokenRequest] = useState<PairingTokenRequestState>({
    status: "idle",
    endpoint: "",
    method: "POST",
    detail: "Live desktop pairing has not been requested.",
    rawPairingCodeTransmitted: false,
    rawTokenReturned: false,
    credentialsSyncedToApp: false,
  })
  const [preparedPairingRequests, setPreparedPairingRequests] = useState<PreparedDevicePairingRequest[]>(
    preparedPairingStorage.requests,
  )
  const [pairedDevices, setPairedDevices] = useState<PairedDeviceRecord[]>(
    pairedDeviceStorage.records,
  )
  const activeProfile = findConnectorProfile(connectorProfiles, activeProfileId)
  const oneWebsiteSetupPlan = useMemo(
    () => buildOneWebsiteConnectorSetupPlan(activeProfile),
    [activeProfile],
  )
  const localSyncClient = useMemo(
    () => createLocalSyncServerClient(localSyncServerDisplayUrl(activeProfile)),
    [activeProfile],
  )
  const manifestPreview = useMemo(() => buildConnectorManifestPreview(activeProfile), [activeProfile])
  const activePreparedPairingRequests = useMemo(
    () => preparedPairingRequests.filter((request) => request.profileId === activeProfile.id),
    [preparedPairingRequests, activeProfile.id],
  )
  const activePairedDevice = useMemo(
    () => findPairedDeviceRecord(pairedDevices, activeProfile.id),
    [pairedDevices, activeProfile.id],
  )
  const connectorHealth = connectorHealthSummary(connectorValidation?.profile ?? activeProfile)
  const secureStoreSummary = secureStoreAdapter
    ? "available; device tokens can be persisted through the Tauri desktop secure-store commands"
    : "browser preview; live device tokens stay blocked until the Windows secure-store adapter is running"
  const selectedItem = findInventoryItem(inventoryItems, selectedId)
  const selectedScryDexCard = scryDexCards.find((card) => card.provider_card_id === selectedScryDexCardId) ?? null
  const selectedScryDexVariant =
    selectedScryDexCard?.variants.find(
      (variant, index) =>
        scryDexVariantId(selectedScryDexCard.provider_card_id, variant, index) === selectedScryDexVariantId,
    ) ?? null
  const selectedScryDexVariantLabel = selectedScryDexVariant
    ? formatScryDexVariant(selectedScryDexVariant) || "Selected version"
    : "Default version"
  const selectedScryDexImageUrl = cardImageForSelectedVariant(selectedScryDexCard, selectedScryDexVariant)
  const selectedScryDexIntakePriceMinorUnits = selectedScryDexCard
    ? scryDexIntakePriceMinorUnits(selectedScryDexCard, selectedScryDexVariant, intakeCondition)
    : 0
  const selectedInventoryImageUrl = selectedItem.imageUrl || ""
  const selectedInventoryVersionLabel = inventoryVersionLabel(selectedItem)
  const selectedInventoryVisibilitySummary = inventoryVisibilitySummary(selectedItem)
  const selectedEvent = eventSnapshots.find((event) => event.eventId === selectedEventId) ?? eventSnapshots[0]
  const customerCredit =
    findCustomerCreditSnapshot(customerCreditDirectory, activeCustomerId) ?? workspace.customerCredit
  const activeCustomerName = customerCreditDisplayName(customerCredit)
  const queuedPendingCreditMinorUnits = customerCreditPendingMinorUnitsFromOperations(
    queuedOperations,
    customerCredit.customerId,
  )
  const pendingCreditMinorUnits = Math.max(
    pendingCreditByCustomer[customerCredit.customerId] ?? 0,
    queuedPendingCreditMinorUnits,
  )
  const cachedCustomerCreditLedgerEntries = customerCreditLedgerEntriesForCustomer(
    customerCreditLedgerEntries,
    customerCredit.customerId,
  )
  const pendingCustomerCreditLedgerEntries = buildPendingCustomerCreditLedgerEntries(
    queuedOperations,
    customerCredit,
  )
  const visibleCustomerCreditLedgerEntries = [
    ...pendingCustomerCreditLedgerEntries,
    ...cachedCustomerCreditLedgerEntries,
  ].slice(0, 6)
  const queueTarget = queueSubmission?.sqlitePlan.table ?? "operation_queue"
  const selectedQueuedOperation = useMemo(() => {
    return queuedOperations.find(
      (operation) => operation.client_operation_id === selectedQueuedOperationId,
    ) ?? queuedOperations[0] ?? null
  }, [queuedOperations, selectedQueuedOperationId])
  const selectedQueueOperationSummary = selectedQueuedOperation
    ? queueOperationReviewSummary(selectedQueuedOperation)
    : ""
  const filteredItems = useMemo(() => {
    return filterInventoryItems(inventoryItems, query, statusFilter)
  }, [query, statusFilter, inventoryItems])
  const kioskCartItems = useMemo(
    () =>
      kioskCartIds
        .map((itemId) => findInventoryItem(inventoryItems, itemId))
        .filter((item): item is NonNullable<ReturnType<typeof findInventoryItem>> => Boolean(item)),
    [inventoryItems, kioskCartIds],
  )
  const kioskCartTotalMinorUnits = kioskCartItems.reduce(
    (total, item) => total + item.priceMinorUnits,
    0,
  )
  const kioskCustomerName = [kioskFirstName, kioskLastName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ")
  const sessionIsUnlocked = sessionRole !== "locked"
  const managerControlsUnlocked = sessionRole === "manager" && !managerSettingsLocked
  const activeOfflineUser = offlineUsers.find((user) => user.id === sessionUserId) ?? null
  const effectiveAccess = sessionRole === "manager"
    ? ACCESS_SECTIONS
    : activeOfflineUser?.access ?? []
  const scannedInventoryItem = useMemo(
    () => findInventoryItemByScan(inventoryItems, query),
    [inventoryItems, query],
  )
  const addScanTarget =
    query.trim() === ""
      ? selectedItem
      : scannedInventoryItem ?? (filteredItems.length === 1 ? filteredItems[0] : null)
  const seededQueueCount = workspace.queueItems.reduce((total, item) => total + item.count, 0)
  const liveLanQueueIsAuthoritative = localSyncStatus?.status === "ok"
  const queueBadgeCount =
    liveLanQueueIsAuthoritative ? localSyncStatus.queue_depth : seededQueueCount + queuedOperations.length
  const queuePanelPendingLabel = liveLanQueueIsAuthoritative
    ? `${countLabel(localSyncStatus.queue_depth, "LAN pending op")}; ${countLabel(
        queuedOperations.length,
        "device-only op",
      )}`
    : `${countLabel(queueBadgeCount, "pending op")}`
  const queueSummaryRows = liveLanQueueIsAuthoritative
    ? [
        {
          label: "LAN queued rows",
          count: localSyncStatus.queue_depth,
          tone: localSyncStatus.queue_depth > 0 ? "warning" : "success",
        },
        {
          label: "Device-only queue",
          count: queuedOperations.length,
          tone: queuedOperations.length > 0 ? "warning" : "success",
        },
      ]
    : workspace.queueItems
  const syncSummaryItems = workspace.syncSummary.map((item) => {
    if (liveLanQueueIsAuthoritative && item.label === "Queued writes") {
      return {
        ...item,
        label: "LAN queued",
        value: String(localSyncStatus.queue_depth),
      }
    }

    if (liveLanQueueIsAuthoritative && item.label === "Cached cards") {
      return {
        ...item,
        value: new Intl.NumberFormat("en-US").format(localSyncStatus.reference_card_count),
      }
    }

    return item
  })
  const conflictBadgeCount = openConflicts.length
  const eventQueuePreviewEntries = useMemo(
    () => buildOfflineEventQueuePreviewEntries(queuedOperations, eventSnapshots),
    [queuedOperations, eventSnapshots],
  )
  const eventBadgeCount =
    eventSnapshots.length + pendingEventRegistrationIds.length + pendingEventCheckinIds.length
  const pendingEventRegistrationCount = pendingEventRegistrationIds.length
  const pendingEventCheckinCount = pendingEventCheckinIds.length
  const operationSyncVisibilityRows = useMemo(
    () =>
      buildOperationSyncVisibilityRows({
        queuedOperations,
        inventoryItems,
        localInventoryIntakeReceipts,
        localSyncStatus,
        pendingEventRegistrationCount,
        pendingEventCheckinCount,
        customerCreditDirectory,
        customerCreditLedgerEntries,
        offlineUsers,
      }),
    [
      queuedOperations,
      inventoryItems,
      localInventoryIntakeReceipts,
      localSyncStatus,
      pendingEventRegistrationCount,
      pendingEventCheckinCount,
      customerCreditDirectory,
      customerCreditLedgerEntries,
      offlineUsers,
    ],
  )
  const operationSyncVisibilitySummary = syncVisibilityQueueSummary(
    localSyncStatus,
    queuedOperations,
  )
  const localSyncStatusTone =
    localSyncStatus?.status === "ok"
      ? "ready"
      : localSyncStatus
        ? statusToneFromRemoteState(localSyncStatus.status)
        : "idle"
  const localSyncStatusValue =
    localSyncStatus?.status === "ok"
      ? `${localSyncStatus.local_database}; ${countLabel(localSyncStatus.inventory_count, "inventory row")}`
      : localSyncStatus
        ? localSyncStatus.status === "unavailable"
          ? "LAN unavailable"
          : "LAN blocked"
        : "Not checked"
  const localSyncPullStatusLabel =
    localSyncStatus?.status === "ok"
      ? `inventory pull ${(localSyncStatus.wordpress_inventory_pull_connected ?? localSyncStatus.wordpress_pull_connected) ? "on" : "off"}; event pull ${(localSyncStatus.wordpress_events_pull_connected ?? localSyncStatus.wordpress_pull_connected) ? "on" : "off"}`
      : "pull not checked"
  const localSyncStatusDetail =
    localSyncStatus?.status === "ok"
      ? `${localSyncClient.serverUrl}; ${localSyncPullStatusLabel}; push ${localSyncStatus.wordpress_push_connected ? "on" : "off"}; website ${connectorDisplayUrl(activeProfile)}.`
      : localSyncStatus
        ? localSyncStatus.message
        : "Use Sync Now or the Settings probe to verify the LAN middleman server."
  const scryDexLookupOrderLabel =
    localSyncStatus?.status === "ok" && localSyncStatus.scrydex_lookup_order.length > 0
      ? localSyncStatus.scrydex_lookup_order.join(" -> ")
      : "local_reference_cache -> wordpress_catalog_proxy -> scrydex_provider"
  const scryDexCurrentStockCount = scryDexCards.reduce(
    (total, card) => total + card.stock_total_count,
    0,
  )
  const selectedScryDexStockLabel = selectedScryDexCard
    ? selectedScryDexCard.stock_by_condition.length > 0
      ? selectedScryDexCard.stock_by_condition
          .map((entry) => `${entry.condition} x${entry.quantity}`)
          .join(", ")
      : "No local copies cached"
    : ""
  const selectedScryDexVariantLabels =
    selectedScryDexCard?.variants
      .slice(0, 4)
      .map(formatScryDexVariant)
      .filter(Boolean) ?? []
  const selectedScryDexSourceLabel =
    selectedScryDexCard?.catalog_source === "local_reference_cache"
      ? "Local reference cache"
      : selectedScryDexCard?.catalog_source === "wordpress_catalog_cache"
        ? "Website catalog cache"
        : "Catalog source pending"
  const scryDexLookupTone = statusToneFromRemoteState(scryDexLookupStatus)
  const queueStatusTone =
    queuedOperations.length > 0 || (localSyncStatus?.status === "ok" && localSyncStatus.queue_depth > 0)
      ? "warning"
      : "ready"
  const deviceStatusOk = localDeviceStatus?.status === "ok" ? localDeviceStatus : null
  const deviceHeartbeatOk = localDeviceHeartbeat?.status === "ok" ? localDeviceHeartbeat : null
  const localClientPresenceValue = deviceStatusOk
    ? `${countLabel(deviceStatusOk.online_count, "online client")}; ${countLabel(deviceStatusOk.offline_count, "offline client")}`
    : localSyncStatus?.status === "ok"
      ? `${countLabel(localSyncStatus.online_client_device_count, "online client")}; ${countLabel(localSyncStatus.offline_client_device_count, "offline client")}`
      : "Device presence pending"
  const localClientPresenceDetail = deviceStatusOk
    ? `Device heartbeat status screen loaded ${countLabel(deviceStatusOk.device_count, "LAN client")} from ${localSyncClient.serverUrl}; employee ${deviceStatusOk.employee_count}, kiosk ${deviceStatusOk.kiosk_count}, manager ${deviceStatusOk.manager_count}; raw credentials copied: no.`
    : deviceHeartbeatOk
      ? `Device heartbeat accepted for ${deviceHeartbeatOk.device.device_label}; ${countLabel(deviceHeartbeatOk.online_count, "online client")} currently visible to the LAN server; raw credentials copied: no.`
      : localDeviceStatus && localDeviceStatus.status !== "ok"
        ? localDeviceStatus.message
        : "Device heartbeat has not reported to the LAN middleman server yet."
  const localClientPresenceTone: StatusTone = deviceStatusOk
    ? deviceStatusOk.setup_required_count > 0 || deviceStatusOk.offline_count > 0
      ? "warning"
      : "ready"
    : localDeviceStatus
      ? statusToneFromRemoteState(localDeviceStatus.status)
      : deviceHeartbeatOk
        ? "ready"
        : "idle"
  const setupStatusTone = statusToneFromRemoteState(lanSetupProbe.status)
  const manifestStatusTone = statusToneFromRemoteState(connectorManifestFetch.status)
  const setupAndManifestTone =
    setupStatusTone === "blocked" || manifestStatusTone === "blocked"
      ? "blocked"
      : setupStatusTone === "warning"
        ? "warning"
        : setupStatusTone === "working" || manifestStatusTone === "working"
          ? "working"
          : setupStatusTone === "ready" || manifestStatusTone === "ready"
            ? "ready"
            : "idle"
  const statusSummaryCards: StatusSummaryCard[] = [
    {
      id: "website-lan",
      label: "Website/LAN",
      value: localSyncStatusValue,
      detail: localSyncStatusDetail,
      tone: localSyncStatusTone,
    },
    {
      id: "scrydex-catalog",
      label: "ScryDex catalog",
      value:
        localSyncStatus?.status === "ok"
          ? countLabel(localSyncStatus.reference_card_count, "reference card")
          : "Catalog count pending",
      detail:
        `Lookup order: ${scryDexLookupOrderLabel}; provider fallback ${
          localSyncStatus?.status === "ok" && localSyncStatus.scrydex_fallback_connected
            ? "connected"
            : "not confirmed"
        }. Local database first; ScryDex provider fallback only when the website reference cache misses.`,
      tone: localSyncStatus?.status === "ok" && localSyncStatus.reference_card_count > 0
        ? "ready"
        : localSyncStatusTone === "blocked"
          ? "blocked"
          : "warning",
    },
    {
      id: "scrydex-lookup",
      label: "ScryDex lookup status",
      value:
        scryDexLookupStatus === "searching"
          ? "Searching"
          : scryDexLookupStatus === "ready"
            ? `${countLabel(scryDexCards.length, "result")}; ${countLabel(scryDexCurrentStockCount, "stock copy")}`
            : scryDexLookupStatus === "blocked"
              ? "Blocked"
              : "Idle",
      detail: selectedScryDexCard
        ? `${scryDexLookupDetail} Selected ${selectedScryDexCard.card_name}; image, price, condition stock, and variants are ready for intake.`
        : scryDexLookupDetail,
      tone: scryDexLookupTone,
    },
    {
      id: "inventory-search",
      label: "Inventory search",
      value: `${countLabel(inventoryItems.length, "cached inventory row")}`,
      detail: lanInventorySearchDetail,
      tone: statusToneFromRemoteState(lanInventorySearchStatus),
    },
    {
      id: "queue-health",
      label: "Queue health",
      value:
        localSyncStatus?.status === "ok"
          ? `${countLabel(queuedOperations.length, "device op")}; ${countLabel(localSyncStatus.queue_depth, "LAN op")}`
          : `${countLabel(queuedOperations.length, "device op")}; LAN queue pending`,
      detail: `${queueExportStatus.detail} Sync attempts saved on this device: ${syncAttempts.length}.`,
      tone: queueStatusTone,
    },
    {
      id: "client-presence",
      label: "Client presence",
      value: localClientPresenceValue,
      detail: localClientPresenceDetail,
      tone: localClientPresenceTone,
    },
    {
      id: "setup-manifest",
      label: "Setup and manifest",
      value: `Setup ${lanSetupProbe.status}; manifest ${connectorManifestFetch.status}`,
      detail: `${lanSetupProbe.detail} Manifest: ${connectorManifestFetch.detail}`,
      tone: setupAndManifestTone,
    },
  ]
  const statusTimelineEntries: StatusTimelineEntry[] = [
    {
      id: "latest-action",
      title: activityMessage.title,
      detail: activityMessage.detail,
      tone: "ready",
    },
    {
      id: "website-lan",
      title: "Website/LAN status",
      detail: localSyncStatusDetail,
      tone: localSyncStatusTone,
    },
    {
      id: "scrydex-lookup",
      title: "ScryDex lookup status",
      detail:
        `${scryDexLookupDetail} Lookup order: ${scryDexLookupOrderLabel}; ${
          scryDexCards.length > 0
            ? `${countLabel(scryDexCards.length, "card")} visible with image and stock summary.`
            : "no result set loaded yet."
        }`,
      tone: scryDexLookupTone,
    },
    {
      id: "local-cache",
      title: "Local database search",
      detail: lanInventorySearchDetail,
      tone: statusToneFromRemoteState(lanInventorySearchStatus),
    },
    {
      id: "queue",
      title: "Queue status timeline",
      detail:
        localSyncStatus?.status === "ok"
          ? `${operationSyncVisibilitySummary}; ${countLabel(localSyncStatus.queue_depth, "LAN queued op")}; ${queueExportStatus.detail}`
          : `${operationSyncVisibilitySummary}; ${queueExportStatus.detail}`,
      tone: queueStatusTone,
    },
    {
      id: "client-presence",
      title: "Device heartbeat",
      detail: localClientPresenceDetail,
      tone: localClientPresenceTone,
    },
    {
      id: "desktop-sync",
      title: "Desktop sync execution",
      detail: desktopSyncExecution.detail,
      tone: statusToneFromRemoteState(desktopSyncExecution.status),
    },
    {
      id: "setup-manifest",
      title: "Setup and manifest",
      detail: `${lanSetupProbe.detail} Manifest: ${connectorManifestFetch.detail}`,
      tone: setupAndManifestTone,
    },
  ]
  const displayedCreditMinorUnits = customerCreditAvailableAfterPending(
    customerCredit,
    pendingCreditMinorUnits,
  )
  const squareSaleTotalMinorUnits = creditRedemptionInputToMinorUnits(squareSaleTotalInput)
  const squareSaleTotalIssue =
    squareSaleTotalInput.trim() === ""
      ? "Enter the Square ticket total before staging credit use."
      : squareSaleTotalMinorUnits === null
        ? "Use a valid Square ticket total with up to two decimals."
        : squareSaleTotalMinorUnits <= 0
          ? "Square ticket total must be greater than $0.00."
          : ""
  const cleanSquareReceiptReference = squareReceiptReference.trim().replace(/\s+/g, " ")
  const squareReceiptReferenceIssue =
    cleanSquareReceiptReference === ""
      ? "Enter the Square receipt, ticket, or transaction reference before staging credit use."
      : cleanSquareReceiptReference.length < 3
        ? "Use at least 3 characters for the Square reference."
        : ""
  const creditRedemptionMinorUnits = creditRedemptionInputToMinorUnits(creditRedemptionInput)
  const creditRedemptionIssue =
    squareSaleTotalIssue
      ? squareSaleTotalIssue
      : creditRedemptionInput.trim() === ""
      ? "Enter a credit amount before staging."
      : creditRedemptionMinorUnits === null
        ? "Use a valid dollar amount with up to two decimals."
        : creditRedemptionMinorUnits <= 0
          ? "Credit amount must be greater than $0.00."
          : creditRedemptionMinorUnits > displayedCreditMinorUnits
            ? "Amount exceeds the cached balance after local holds."
            : squareSaleTotalMinorUnits !== null && creditRedemptionMinorUnits > squareSaleTotalMinorUnits
              ? "Credit amount cannot exceed the Square ticket total."
              : squareReceiptReferenceIssue
                ? squareReceiptReferenceIssue
                : !squareCashierConfirmed
                  ? "Confirm that the cashier applied this credit in Square before staging."
                  : ""
  const creditAdjustmentMinorUnits = creditRedemptionInputToMinorUnits(creditAdjustmentInput)
  const creditAdjustmentIssue =
    creditAdjustmentInput.trim() === ""
      ? "Enter a credit amount before adding."
      : creditAdjustmentMinorUnits === null
        ? "Use a valid dollar amount with up to two decimals."
        : creditAdjustmentMinorUnits <= 0
          ? "Credit add must be greater than $0.00."
          : ""
  const creditRedemptionAmountLabel = formatMoney(
    creditRedemptionMinorUnits ?? 0,
    customerCredit.currency,
  )
  const squareCreditHandoffPlan = useMemo(
    () =>
      buildCustomerCreditSquarePosHandoffPlan(
        customerCredit,
        creditRedemptionMinorUnits ?? 0,
        squareSaleTotalMinorUnits ?? 0,
        { mode: "custom_payment_method", offlineAllowed: true },
      ),
    [customerCredit, creditRedemptionMinorUnits, squareSaleTotalMinorUnits],
  )
  const quantityDelta = inventoryQuantityDeltaFromInput(quantityDeltaInput)
  const quantityAdjustmentIssue =
    quantityDelta === null
      ? "Enter a whole-number quantity change from -99 to 99, excluding 0."
      : ""
  const intakePriceMinorUnits = creditRedemptionInputToMinorUnits(intakePriceInput)
  const parsedIntakeQuantity = Number.parseInt(intakeQuantityInput, 10)
  const intakeQuantity = Number.isFinite(parsedIntakeQuantity)
    ? Math.min(200, Math.max(1, parsedIntakeQuantity))
    : null
  const intakeIssue =
    intakeCardName.trim() === ""
      ? "Enter a card name before adding local inventory."
      : intakePriceMinorUnits === null
        ? "Use a valid dollar amount with up to two decimals."
        : intakePriceMinorUnits <= 0
          ? "Inventory price must be greater than $0.00."
          : intakeQuantity === null
            ? "Enter a quantity from 1 to 200."
            : ""
  const selectedScryDexQueueQuantity = intakeQuantity ?? 1
  const selectedScryDexIntakeSummary = selectedScryDexCard
    ? `${selectedScryDexQueueQuantity} ${selectedScryDexQueueQuantity === 1 ? "copy" : "copies"} as ${intakeCondition || "RAW"} at ${formatMoney(
        selectedScryDexIntakePriceMinorUnits,
        selectedScryDexCard.currency,
      )}`
    : ""
  const intakeVisibilitySummary = `Online ${intakeOnlineVisibility.replace("_", " ")}, kiosk ${intakeKioskVisibility.replace(
    "_",
    " ",
  )}, POS ${intakePosVisibility.replace("_", " ")}`

  useEffect(() => {
    if (queuedOperations.length === 0) {
      if (selectedQueuedOperationId !== "") {
        setSelectedQueuedOperationId("")
      }
      return
    }

    if (
      !queuedOperations.some(
        (operation) => operation.client_operation_id === selectedQueuedOperationId,
      )
    ) {
      setSelectedQueuedOperationId(queuedOperations[0].client_operation_id)
    }
  }, [queuedOperations, selectedQueuedOperationId])

  useEffect(() => {
    const normalizedQuery = query.trim()

    if (normalizedQuery.length === 0) {
      setLanInventorySearchStatus("idle")
      setLanInventorySearchDetail("Type to search the local cache; LAN results hydrate automatically.")
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      setLanInventorySearchStatus("searching")
      setLanInventorySearchDetail(`Checking ${localSyncClient.serverUrl} for "${normalizedQuery}".`)

      void localSyncClient.searchInventory(normalizedQuery).then((result) => {
        if (cancelled) {
          return
        }

        if (result.status !== "ok") {
          setLanInventorySearchStatus("blocked")
          setLanInventorySearchDetail(
            result.status === "unavailable"
              ? `${result.message} Showing this device cache only.`
              : result.message,
          )
          return
        }

        setInventoryItems((items) => mergeLocalSyncInventoryItems(items, result.items))
        setLanInventorySearchStatus("ready")
        setLanInventorySearchDetail(
          `${result.items.length} LAN cache result${result.items.length === 1 ? "" : "s"} from ${localSyncClient.serverUrl}; website remains the final authority after sync.`,
        )
      })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [query, localSyncClient])

  useEffect(() => {
    if (scannedInventoryItem && scannedInventoryItem.id !== selectedId) {
      setSelectedId(scannedInventoryItem.id)
      return
    }

    if (
      filteredItems.length > 0 &&
      filteredItems.every((item) => item.id !== selectedId)
    ) {
      setSelectedId(filteredItems[0].id)
    }
  }, [filteredItems, scannedInventoryItem, selectedId])

  useEffect(() => {
    if (!sessionIsUnlocked) {
      return
    }

    void recordLocalDeviceHeartbeat()

    const heartbeatId = window.setInterval(() => {
      void recordLocalDeviceHeartbeat()
    }, 30_000)

    return () => {
      window.clearInterval(heartbeatId)
    }
  }, [
    sessionIsUnlocked,
    sessionRole,
    sessionUserId,
    activeSection,
    activeProfile.id,
    activePairedDevice?.devicePublicId,
    localSyncClient,
  ])

  useEffect(() => {
    setConnectorValidation((currentValidation) =>
      currentValidation?.profile.id === activeProfile.id ? currentValidation : null,
    )
    setConnectorTestReport((currentReport) =>
      currentReport?.profileId === activeProfile.id ? currentReport : null,
    )
    setConnectorManifestFetch((currentFetch) =>
      currentFetch.profileId === activeProfile.id
        ? currentFetch
        : {
            status: "idle",
            detail: "Live manifest fetch has not run for this profile.",
            sourceUrl: connectorManifestUrl(activeProfile),
          },
    )
    setPairingPlan(null)
    setPairingRouteCheck({
      status: "idle",
      endpoint: `${connectorDisplayUrl(activeProfile)}/wp-json/`,
      method: "GET",
      detail: "Pairing route has not been checked for this connector.",
      rawPairingCodeTransmitted: false,
      credentialsSyncedToApp: false,
    })
    setPairingTokenRequest({
      status: "idle",
      endpoint: `${connectorDisplayUrl(activeProfile)}/wp-json/tcg-store/v1/offline/devices/register`,
      method: "POST",
      detail: "Live desktop pairing has not been requested.",
      rawPairingCodeTransmitted: false,
      rawTokenReturned: false,
      credentialsSyncedToApp: false,
    })
    setDesktopSyncExecution({
      status: "idle",
      detail: "Desktop live sync has not run for this connector.",
      cacheAppliedCount: 0,
      cacheInsertedCount: 0,
      cacheUpdatedCount: 0,
      cacheIgnoredCount: 0,
      creditCacheAppliedCount: 0,
      creditCacheUpdatedCount: 0,
      creditCacheIgnoredCount: 0,
      eventCacheAppliedCount: 0,
      eventCacheInsertedCount: 0,
      eventCacheUpdatedCount: 0,
      eventCacheIgnoredCount: 0,
      conflictCacheAppliedCount: 0,
      conflictCacheInsertedCount: 0,
      conflictCacheUpdatedCount: 0,
      conflictCacheIgnoredCount: 0,
      rawTokenReturned: false,
      rawResponseReturned: false,
      credentialsSyncedToApp: false,
    })
    setConnectorDraft(connectorProfileDraftFromProfile(activeProfile))
    setConnectorDraftIssues([])
  }, [activeProfile.id])

  useEffect(() => {
    if (activeSessionProfileRef.current === activeProfile.id) {
      return
    }

    activeSessionProfileRef.current = activeProfile.id

    const nextSession = loadOfflineSessionStorage(activeProfile.id)
    setQueuedOperations(nextSession.queuedOperations)
    setSyncAttempts(nextSession.syncAttempts)
    setStagedOperation(null)
    setStagedPushBatch(null)
    setStagedPushRequest(null)
    setPushSummary(null)
    setQueueSubmission(null)
    setSelectedQueuedOperationId(nextSession.queuedOperations[0]?.client_operation_id ?? "")
    setQueueExportStatus({
      status: "idle",
      detail: "No queue export has run for this profile.",
      rawCredentialsCopied: false,
    })
    setQueueExportPreview("")
    setActivityMessage({
      title: nextSession.restored ? "Company queue restored" : "Company workspace ready",
      detail: nextSession.restored
        ? `${nextSession.queuedOperations.length} queued operation(s) and ${nextSession.syncAttempts.length} sync attempt(s) restored for ${activeProfile.companyName}.`
        : `${activeProfile.companyName} has a separate local queue on this device.`,
    })
  }, [activeProfile.id, activeProfile.companyName])

  useEffect(() => {
    window.localStorage.setItem(
      CONNECTOR_PROFILE_STORAGE_KEY,
      JSON.stringify(buildConnectorProfileStorageSnapshot(connectorProfiles, activeProfileId)),
    )
  }, [connectorProfiles, activeProfileId])

  useEffect(() => {
    window.localStorage.setItem(
      PREPARED_PAIRING_STORAGE_KEY,
      JSON.stringify(buildPreparedPairingStorageSnapshot(preparedPairingRequests, connectorProfiles)),
    )
  }, [preparedPairingRequests, connectorProfiles])

  useEffect(() => {
    if (pairedDevices.length === 0) {
      window.localStorage.removeItem(PAIRED_DEVICE_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(
      PAIRED_DEVICE_STORAGE_KEY,
      JSON.stringify(buildPairedDeviceStorageSnapshot(pairedDevices, connectorProfiles)),
    )
  }, [pairedDevices, connectorProfiles])

  useEffect(() => {
    if (!secureStoreAdapter || !activePairedDevice) {
      return
    }

    let cancelled = false

    void secureStoreAdapter
      .getDeviceTokenStatus({
        profile_id: activePairedDevice.profileId,
        device_public_id: activePairedDevice.devicePublicId,
      })
      .then((status) => {
        if (cancelled) {
          return
        }

        setPairedDevices((records) =>
          records.map((record) =>
            record.id === activePairedDevice.id
              ? {
                  ...record,
                  tokenStatus: status.token_present ? "stored" : "missing",
                  tokenLength: status.token_length,
                  rawTokenStoredInBrowser: false,
                  rawTokenReturnedToUi: false,
                  credentialsSyncedToApp: false,
                }
              : record,
          ),
        )
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setPairedDevices((records) =>
          records.map((record) =>
            record.id === activePairedDevice.id
              ? {
                  ...record,
                  tokenStatus: "unchecked",
                  rawTokenStoredInBrowser: false,
                  rawTokenReturnedToUi: false,
                  credentialsSyncedToApp: false,
                }
              : record,
          ),
        )
      })

    return () => {
      cancelled = true
    }
  }, [
    secureStoreAdapter,
    activePairedDevice?.id,
    activePairedDevice?.profileId,
    activePairedDevice?.devicePublicId,
  ])

  useEffect(() => {
    const sessionStorageKey = offlineSessionStorageKey(activeProfile.id)

    if (queuedOperations.length === 0 && syncAttempts.length === 0) {
      window.localStorage.removeItem(sessionStorageKey)
      return
    }

    window.localStorage.setItem(
      sessionStorageKey,
      JSON.stringify(
        buildOfflineSessionStorageSnapshot(queuedOperations, syncAttempts, {
          profileId: activeProfile.id,
        }),
      ),
    )
    window.localStorage.removeItem(OFFLINE_SESSION_STORAGE_KEY)
  }, [queuedOperations, syncAttempts, activeProfile.id])

  useEffect(() => {
    if (!queueAdapter) {
      return
    }

    let cancelled = false

    void restoreDesktopQueuedOperations(queueAdapter).then((restoreResult) => {
      if (cancelled || restoreResult.operations.length === 0) {
        return
      }

      setQueuedOperations((currentOperations) => {
        const currentIds = new Set(
          currentOperations.map((operation) => operation.client_operation_id),
        )
        const restoredOperations = restoreResult.operations.filter(
          (operation) => !currentIds.has(operation.client_operation_id),
        )

        if (restoredOperations.length === 0) {
          return currentOperations
        }

        return [...restoredOperations, ...currentOperations]
      })
      setActivityMessage({
        title: "Desktop queue restored",
        detail: restoreResult.message,
      })
    })

    return () => {
      cancelled = true
    }
  }, [queueAdapter])

  useEffect(() => {
    if (sessionRole === "locked" || !localSyncSessionExpiresAtUtc) {
      return
    }

    const expiresAtMs = Date.parse(localSyncSessionExpiresAtUtc)

    if (!Number.isFinite(expiresAtMs)) {
      return
    }

    const delayMs = expiresAtMs - Date.now()

    if (delayMs <= 0) {
      handleLockSession()
      setActivityMessage({
        title: "Session expired",
        detail: "Sign in again with a 4-digit PIN to continue.",
      })
      return
    }

    const timerId = window.setTimeout(() => {
      handleLockSession()
      setActivityMessage({
        title: "Session expired",
        detail: "Sign in again with a 4-digit PIN to continue.",
      })
    }, Math.min(delayMs, 2_147_483_647))

    return () => window.clearTimeout(timerId)
  }, [localSyncSessionExpiresAtUtc, sessionRole])

  function isAccessSection(label: string): label is AccessSection {
    return ACCESS_SECTIONS.includes(label as AccessSection)
  }

  function accessFromLocalSyncUser(user: LocalSyncUser): AccessSection[] {
    return user.role === "manager"
      ? [...ACCESS_SECTIONS]
      : user.access.filter(isAccessSection)
  }

  function offlineUserFromLocalSyncUser(user: LocalSyncUser): OfflineAppUser {
    return {
      id: user.id,
      name: user.name,
      pin: "",
      role: user.role,
      access: accessFromLocalSyncUser(user),
    }
  }

  function applyLocalSyncAccessPolicy(users: LocalSyncUser[]) {
    const authoritativeUsers = users.map(offlineUserFromLocalSyncUser)

    setOfflineUsers((currentUsers) => {
      const authoritativeIds = new Set(authoritativeUsers.map((user) => user.id))
      const demoFallbackUsers = OFFLINE_DEMO_PIN_FALLBACK_ENABLED
        ? currentUsers.filter((user) => user.pin && !authoritativeIds.has(user.id))
        : []

      return [...authoritativeUsers, ...demoFallbackUsers]
    })

    return authoritativeUsers
  }

  function canAccessSection(label: string) {
    return isAccessSection(label) && effectiveAccess.includes(label)
  }

  function handlePinDigit(digit: string) {
    setLoginIssue("")
    setLoginPin((pin) => `${pin}${digit}`.slice(0, 4))
  }

  function handleLockSession() {
    setSessionRole("locked")
    setSessionUserId("")
    setLocalSyncSessionToken("")
    setLocalSyncSessionExpiresAtUtc("")
    setManagerSettingsLocked(true)
    setLoginPin("")
    setLoginIssue("")
  }

  function upsertLocalSyncUser(authResult: Extract<LocalSyncAuthResult, { status: "ok" }>) {
    const nextUser = offlineUserFromLocalSyncUser(authResult.user)

    setOfflineUsers((users) => {
      if (users.some((user) => user.id === nextUser.id)) {
        return users.map((user) => (user.id === nextUser.id ? { ...user, ...nextUser } : user))
      }

      return [...users, nextUser]
    })

    return nextUser
  }

  function startOfflineUserSession(user: OfflineAppUser, detail: string) {
    const firstAllowedSection = user.role === "manager" ? "Settings" : (user.access[0] ?? "Inventory")

    setSessionRole(user.role)
    setSessionUserId(user.id)
    setManagerSettingsLocked(user.role !== "manager")
    setActiveSection(firstAllowedSection)
    setLoginPin("")
    setLoginIssue("")
    setActivityMessage({
      title: `${user.name} signed in`,
      detail,
    })
  }

  function currentClientDeviceMode() {
    if (sessionRole === "manager") {
      return "manager"
    }

    return activeSection === "Kiosk" ? "kiosk" : "employee"
  }

  function currentClientDeviceCapabilities(): AccessSection[] {
    if (sessionRole === "manager") {
      return [...ACCESS_SECTIONS]
    }

    return activeOfflineUser?.access ?? ["Inventory", "Kiosk", "Queue", "Status"]
  }

  async function refreshLocalSyncStatus() {
    const nextStatus = await localSyncClient.getSyncStatus()

    setLocalSyncStatus(nextStatus)

    return nextStatus
  }

  async function handlePlanSquarePosInventoryPull() {
    if (!localSyncSessionToken) {
      setActiveSection("Settings")
      setActivityMessage({
        title: "Manager session required",
        detail: "Unlock with a manager PIN before running the Square POS inventory-readiness plan.",
      })
      return
    }

    const plan = await localSyncClient.planSquarePosInventoryPull(localSyncSessionToken)

    setSquarePosPlan(plan)
    setActiveSection("Settings")

    if (plan.status !== "ok") {
      setActivityMessage({
        title: "Square POS plan blocked",
        detail: plan.message,
      })
      return
    }

    setActivityMessage({
      title: plan.ready ? "Square POS plan ready" : "Square POS mapping review needed",
      detail:
        `${plan.mapped_count} mapped barcode/SKU row(s), ${plan.unresolved_count} unmapped row(s). ` +
        `Payment capture supported by this app: ${plan.square_payment_capture_supported ? "yes" : "no"}.`,
    })
  }

  async function refreshLocalDeviceStatus() {
    const nextDeviceStatus = await localSyncClient.getDeviceStatus()

    setLocalDeviceStatus(nextDeviceStatus)

    return nextDeviceStatus
  }

  async function recordLocalDeviceHeartbeat(networkStatus: "online" | "offline" | "degraded" = "online") {
    const heartbeatResult = await localSyncClient.recordDeviceHeartbeat({
      deviceId: activePairedDevice?.devicePublicId ?? workspace.device.installationId,
      deviceLabel: `${workspace.device.storeLabel} ${workspace.device.modeLabel}`.trim(),
      mode: currentClientDeviceMode(),
      appVersion: OFFLINE_APP_VERSION,
      platform: "windows",
      networkStatus,
      setupStatus: activeProfile.localSync.oneWebsiteMode ? "ready" : "setup_required",
      serverUrl: localSyncClient.serverUrl,
      websiteUrl: connectorDisplayUrl(activeProfile),
      capabilities: currentClientDeviceCapabilities(),
      heartbeatIntervalSeconds: 30,
    })

    setLocalDeviceHeartbeat(heartbeatResult)
    void refreshLocalDeviceStatus()

    return heartbeatResult
  }

  async function handleProbeLanSetup() {
    const endpoint = `${localSyncClient.serverUrl}${oneWebsiteSetupPlan.setupStatusPath}`

    setLanSetupProbe({
      status: "loading",
      endpoint,
      detail: "Checking LAN server website binding.",
      oneWebsiteMode: true,
      credentialsSyncedToApp: false,
    })

    const result = await localSyncClient.getSetupStatus()

    if (result.status !== "ok") {
      setLanSetupProbe({
        status: "blocked",
        endpoint,
        detail: result.message,
        oneWebsiteMode: true,
        credentialsSyncedToApp: false,
      })
      setActiveSection("Settings")
      setActivityMessage({
        title: result.status === "unavailable" ? "LAN setup unavailable" : "LAN setup blocked",
        detail: result.message,
      })
      return
    }

    const probeMessage = lanSetupProbeMessage(result, oneWebsiteSetupPlan.websiteUrl)

    setLanSetupProbe({
      status: probeMessage.status,
      endpoint,
      detail: probeMessage.detail,
      oneWebsiteMode: result.one_website_mode,
      credentialsSyncedToApp: result.credentials_synced_to_client,
    })
    setActiveSection("Settings")
    setActivityMessage({
      title:
        probeMessage.status === "ready"
          ? "LAN setup ready"
          : probeMessage.status === "warning"
            ? "LAN setup mismatch"
            : "LAN setup blocked",
      detail: probeMessage.detail,
    })
  }

  async function refreshLanEventSnapshots(options: { announce?: boolean } = {}) {
    const eventResult = await localSyncClient.listEvents()

    if (eventResult.status !== "ok") {
      setActivityMessage({
        title: eventResult.status === "unavailable" ? "LAN server unavailable" : "Event refresh blocked",
        detail: eventResult.message,
      })
      await refreshLocalSyncStatus()
      return
    }

    const nextEvents = eventResult.events.map(eventSnapshotFromLocalSync)
    setEventSnapshots(nextEvents)
    setSelectedEventId((currentEventId) =>
      nextEvents.some((event) => event.eventId === currentEventId)
        ? currentEventId
        : nextEvents[0]?.eventId ?? "",
    )
    await refreshLocalSyncStatus()

    if (options.announce) {
      setActivityMessage({
        title: "LAN events refreshed",
        detail: `${nextEvents.length} event snapshot(s) loaded from ${localSyncClient.serverUrl}; website event authority is preserved until sync acceptance.`,
      })
    }
  }

  async function handlePinLogin() {
    if (!/^\d{4}$/.test(loginPin)) {
      setLoginIssue("Enter a valid 4-digit staff or manager PIN.")
      setLoginPin("")
      return
    }

    const requestedTtlMinutes = Math.min(240, Math.max(5, sessionTimeoutMinutes))
    const authResult = await localSyncClient.authWithPin(loginPin, {
      ttlMinutes: requestedTtlMinutes,
    })

    if (authResult.status === "ok") {
      const user = upsertLocalSyncUser(authResult)
      const policyResult = await localSyncClient.getAccessPolicy(authResult.session.token)
      const policyUsers =
        policyResult.status === "ok" ? applyLocalSyncAccessPolicy(policyResult.users) : []
      const policyUser = policyUsers.find((candidate) => candidate.id === user.id)
      const sessionUser = policyUser ?? user
      const policyDetail =
        policyResult.status === "ok"
          ? ` Access policy hydrated from ${localSyncClient.serverUrl}; raw PINs and hashes were not returned.`
          : ` Access policy refresh skipped: ${policyResult.message}`

      setLocalSyncSessionToken(authResult.session.token)
      setLocalSyncSessionExpiresAtUtc(authResult.session.expiresAtUtc)
      void refreshLocalSyncStatus()
      startOfflineUserSession(
        sessionUser,
        sessionUser.role === "manager"
          ? `Manager session verified by ${localSyncClient.serverUrl} for ${requestedTtlMinutes} minute(s); website setup and user access can be unlocked.${policyDetail}`
          : `${sessionUser.access.join(", ")} workspaces are available for this PIN from ${localSyncClient.serverUrl} for ${requestedTtlMinutes} minute(s).${policyDetail}`,
      )
      return
    }

    if (authResult.status === "blocked") {
      setLoginIssue(authResult.message)
      setLoginPin("")
      return
    }

    if (!OFFLINE_DEMO_PIN_FALLBACK_ENABLED) {
      setLoginIssue(`${authResult.message} Offline demo PIN fallback is disabled in packaged builds.`)
      setLoginPin("")
      return
    }

    const cachedUser = offlineUsers.find((item) => item.pin === loginPin)

    if (!cachedUser) {
      setLoginIssue(authResult.message)
      setLoginPin("")
      return
    }

    setLocalSyncSessionToken("")
    setLocalSyncSessionExpiresAtUtc(new Date(Date.now() + Math.min(240, Math.max(5, sessionTimeoutMinutes)) * 60_000).toISOString())
    startOfflineUserSession(
      cachedUser,
      `${authResult.message} Cached preview policy unlocked ${cachedUser.access.join(", ")}; inventory holds and kiosk orders still require the LAN sync server.`,
    )
  }

  async function handleOfflineUserRoleChange(userId: string, role: Exclude<AppSessionRole, "locked">) {
    if (!managerControlsUnlocked) {
      setActivityMessage({
        title: "Manager unlock required",
        detail: "Unlock settings before changing offline user roles.",
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in through the LAN local sync server before changing offline user roles.",
      })
      return
    }

    const targetUser = offlineUsers.find((user) => user.id === userId)
    const managerCount = offlineUsers.filter((user) => user.role === "manager").length

    if (targetUser?.role === "manager" && role === "staff" && managerCount <= 1) {
      setActivityMessage({
        title: "Manager PIN required",
        detail: "Keep at least one manager PIN active for settings and access control.",
      })
      return
    }

    const nextAccess = role === "manager" ? [...ACCESS_SECTIONS] : (targetUser?.access ?? [])
    const serverResult = await localSyncClient.updateUserAccess(localSyncSessionToken, userId, {
      role,
      access: nextAccess,
    })

    if (serverResult.status !== "ok") {
      setActivityMessage({
        title: serverResult.status === "unavailable" ? "LAN server unavailable" : "Role update blocked",
        detail: serverResult.message,
      })
      return
    }

    setOfflineUsers((users) =>
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              role: serverResult.user.role,
              access: serverResult.user.access.filter(isAccessSection),
            }
          : user,
      ),
    )
    await refreshLocalSyncStatus()
    setActivityMessage({
      title: "Offline user role updated",
      detail: `${targetUser?.name ?? "User"} is now ${role}.`,
    })
  }

  async function handleOfflineUserAccessToggle(userId: string, section: AccessSection) {
    if (!managerControlsUnlocked) {
      setActivityMessage({
        title: "Manager unlock required",
        detail: "Unlock settings before changing offline user access.",
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in through the LAN local sync server before changing offline user access.",
      })
      return
    }

    const targetUser = offlineUsers.find((user) => user.id === userId)

    if (targetUser?.role === "manager") {
      setActivityMessage({
        title: "Manager access retained",
        detail: "Manager PINs keep access to every workspace.",
      })
      return
    }

    if (!targetUser) {
      setActivityMessage({
        title: "User not found",
        detail: "The selected offline user is not available in the local app state.",
      })
      return
    }

    const nextAccess = targetUser.access.includes(section)
      ? targetUser.access.filter((item) => item !== section)
      : [...targetUser.access, section]

    if (nextAccess.length === 0) {
      setActivityMessage({
        title: "Access required",
        detail: "Staff users need at least one allowed workspace.",
      })
      return
    }

    const serverResult = await localSyncClient.updateUserAccess(localSyncSessionToken, userId, {
      role: targetUser.role,
      access: nextAccess,
    })

    if (serverResult.status !== "ok") {
      setActivityMessage({
        title: serverResult.status === "unavailable" ? "LAN server unavailable" : "Access update blocked",
        detail: serverResult.message,
      })
      return
    }

    setOfflineUsers((users) =>
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              role: serverResult.user.role,
              access: serverResult.user.access.filter(isAccessSection),
            }
          : user,
      ),
    )
    await refreshLocalSyncStatus()
  }

  function toggleNewUserAccess(section: AccessSection) {
    setNewUserAccess((sections) => {
      if (sections.includes(section)) {
        return sections.filter((item) => item !== section)
      }

      return [...sections, section]
    })
  }

  async function handleAddOfflineUser() {
    const cleanName = newUserName.trim()
    const cleanPin = newUserPin.trim()
    const access = newUserRole === "manager" ? [...ACCESS_SECTIONS] : newUserAccess

    if (!managerControlsUnlocked) {
      setActivityMessage({
        title: "Manager unlock required",
        detail: "Unlock settings before adding or changing offline PIN users.",
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in through the LAN local sync server before adding or changing PIN users.",
      })
      return
    }

    if (!cleanName || !/^\d{4}$/.test(cleanPin) || access.length === 0) {
      setActivityMessage({
        title: "User setup blocked",
        detail: "Enter a name, unique 4-digit PIN, and at least one allowed workspace.",
      })
      return
    }

    if (offlineUsers.some((user) => user.pin === cleanPin)) {
      setActivityMessage({
        title: "PIN already exists",
        detail: "Choose a different 4-digit PIN before saving this offline user.",
      })
      return
    }

    const serverResult = await localSyncClient.addUser(localSyncSessionToken, {
      name: cleanName,
      pin: cleanPin,
      role: newUserRole,
      access,
    })

    if (serverResult.status !== "ok") {
      setActivityMessage({
        title: serverResult.status === "unavailable" ? "LAN server unavailable" : "User setup blocked",
        detail: serverResult.message,
      })
      return
    }

    const nextUser: OfflineAppUser = {
      id: serverResult.user.id,
      name: serverResult.user.name,
      pin: "",
      role: serverResult.user.role,
      access: serverResult.user.access.filter(isAccessSection),
    }
    setOfflineUsers((users) => [...users, nextUser])
    void refreshLocalSyncStatus()
    setNewUserName("")
    setNewUserPin("")
    setNewUserRole("staff")
    setNewUserAccess(["Inventory", "Kiosk", "Queue"])
    setActivityMessage({
      title: "Offline user added",
      detail: `${nextUser.name} can sign in through ${localSyncClient.serverUrl} with a 4-digit PIN and access ${nextUser.access.join(", ")}.`,
    })
  }

  function sectionTarget(label: string) {
    if (label === "Sync") {
      return queuePanelRef
    }

    if (label === "Status") {
      return statusPanelRef
    }

    if (label === "Kiosk") {
      return kioskPanelRef
    }

    if (label === "Queue") {
      return queuePanelRef
    }

    if (label === "Events") {
      return eventPanelRef
    }

    if (label === "Conflicts") {
      return conflictPanelRef
    }

    if (label === "Customers") {
      return creditPanelRef
    }

    if (label === "Settings") {
      return connectorPanelRef
    }

    return inventoryPanelRef
  }

  function handleNavSelection(label: string) {
    if (!canAccessSection(label)) {
      setActivityMessage({
        title: "Access restricted",
        detail: `${activeOfflineUser?.name ?? "This PIN"} does not have access to ${label}. Ask a manager to update Users & Access.`,
      })
      return
    }

    setActiveSection(label)
    if (label === "Events") {
      void refreshLanEventSnapshots()
    }
    window.requestAnimationFrame(() => {
      sectionTarget(label).current?.scrollIntoView({ block: "start", behavior: "smooth" })
    })
  }

  async function stageOfflineOperation(
    operation: OfflineOperationEnvelope,
    actionTitle: string,
    detail: string,
  ) {
    const batch = buildOfflinePushBatchPayload(
      [operation],
      activePairedDevice ? { deviceId: activePairedDevice.devicePublicId } : {},
    )
    const requestPlan = buildOfflinePushRequestPlan(batch)
    const canonicalInventoryWritesReady =
      activeProfile.wordpress.routeConnectedPushReady &&
      activeProfile.wordpress.canonicalInventoryWritesEnabled &&
      operation.operation_type === "inventory_reservation"

    setStagedOperation(operation)
    setStagedPushBatch(batch)
    setStagedPushRequest(requestPlan)
    setSyncSessionPlan(
      buildOfflineConnectorSyncSessionPlan(
        activeProfile,
        batch,
        activePreparedPairingRequests[0] ?? null,
        activePairedDevice,
      ),
    )
    setPushSummary(
      summarizeOfflinePushResult({
        data: {
          batch_id: batch.batch_id,
          server_time_utc: operation.queued_at_utc,
          operation_count: batch.operations.length,
          counts: {
            accepted: 1,
            conflict: 0,
            rejected: 0,
          },
          results: [
            {
              client_operation_id: operation.client_operation_id,
              status: "accepted",
            },
          ],
        },
        meta: {
          push_queue_replay_deferred: true,
          push_canonical_mutations_deferred: !canonicalInventoryWritesReady,
          canonical_inventory_execution_enabled:
            activeProfile.wordpress.canonicalInventoryWritesEnabled,
          canonical_inventory_writes_deferred: !canonicalInventoryWritesReady,
        },
      }),
    )
    const submission = await submitOfflineOperation(operation, queueAdapter)

    setQueueSubmission(submission)
    setSelectedQueuedOperationId(operation.client_operation_id)
    setQueueExportStatus({
      status: "idle",
      detail: "Queue changed; export has not run for the latest local operations.",
      rawCredentialsCopied: false,
    })
    setQueueExportPreview("")
    setQueuedOperations((currentOperations) => {
      if (
        currentOperations.some(
          (queuedOperation) =>
            queuedOperation.client_operation_id === operation.client_operation_id,
        )
      ) {
        return currentOperations
      }

      return [operation, ...currentOperations]
    })
    setActiveSection("Queue")
    setActivityMessage({
      title: actionTitle,
      detail,
    })
  }

  async function handleCopySelectedQueueOperation() {
    if (!selectedQueuedOperation) {
      setQueueExportStatus({
        status: "blocked",
        detail: "No queued operation is selected for copy.",
        rawCredentialsCopied: false,
      })
      setActiveSection("Queue")
      return
    }

    const payload = JSON.stringify(
      buildQueueExportPayload(activeProfile, [selectedQueuedOperation]),
      null,
      2,
    )
    const copied = await copyTextToClipboard(payload)

    setQueueExportPreview(payload)
    setQueueExportStatus({
      status: copied ? "copied" : "previewed",
      detail: copied
        ? `${selectedQueuedOperation.client_operation_id} copied as secret-safe JSON for staff review.`
        : "Clipboard copy is unavailable in this browser preview; selected operation JSON is shown below for manual copy.",
      rawCredentialsCopied: false,
    })
    setActiveSection("Queue")
    setActivityMessage({
      title: copied ? "Queue operation copied" : "Queue copy blocked",
      detail: copied
        ? "Selected operation JSON was copied without raw credentials or production secrets."
        : "Clipboard access was blocked by the browser, so a secret-safe manual copy preview is visible in the queue panel.",
    })
  }

  function handleExportQueueJson() {
    if (queuedOperations.length === 0) {
      setQueueExportStatus({
        status: "blocked",
        detail: "No queued operations are available to export.",
        rawCredentialsCopied: false,
      })
      setActiveSection("Queue")
      return
    }

    try {
      const payload = JSON.stringify(buildQueueExportPayload(activeProfile, queuedOperations), null, 2)
      const blob = new Blob([payload], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      setQueueExportPreview(payload)
      link.href = url
      link.download = queueExportFileName(activeProfile)
      link.click()
      URL.revokeObjectURL(url)
      setQueueExportStatus({
        status: "downloaded",
        detail: `${queuedOperations.length} queued operation(s) exported for ${activeProfile.companyName}.`,
        rawCredentialsCopied: false,
      })
      setActivityMessage({
        title: "Queue export prepared",
        detail:
          "Pending local operations were exported as secret-safe JSON for staff review or support handoff.",
      })
    } catch {
      setQueueExportStatus({
        status: "blocked",
        detail: "Queue export is unavailable in this browser preview.",
        rawCredentialsCopied: false,
      })
      setActivityMessage({
        title: "Queue export blocked",
        detail: "The pending local operations are still available in the queue panel.",
      })
    }

    setActiveSection("Queue")
  }

  async function handleRefreshDesktopQueue() {
    setActiveSection("Queue")
    setQueueExportPreview("")
    setIsDesktopQueueRefreshing(true)

    try {
      const restoreResult = await restoreDesktopQueuedOperations(queueAdapter)
      const currentOperationIds = new Set(
        queuedOperations.map((operation) => operation.client_operation_id),
      )
      const restoredOperations = restoreResult.operations.filter(
        (operation) => !currentOperationIds.has(operation.client_operation_id),
      )

      if (restoredOperations.length > 0) {
        setQueuedOperations([...restoredOperations, ...queuedOperations])
        setSelectedQueuedOperationId(restoredOperations[0].client_operation_id)
      }

      const refreshDetail = restoreResult.status === "restored"
        ? `${restoreResult.message} ${restoredOperations.length} new operation(s) merged into ${activeProfile.companyName}.`
        : `${restoreResult.message} Current browser/session queue remains unchanged.`

      setQueueExportStatus({
        status:
          restoreResult.status === "deferred"
            ? "blocked"
            : restoreResult.status === "restored"
              ? "restored"
              : "previewed",
        detail: refreshDetail,
        rawCredentialsCopied: false,
      })
      setActivityMessage({
        title:
          restoreResult.status === "restored"
            ? "Desktop queue refreshed"
            : "Desktop queue refresh previewed",
        detail:
          restoreResult.status === "restored"
            ? `${restoredOperations.length} pending desktop queue row(s) were merged without website, Square, ScryDex, payment, or production writes.`
            : restoreResult.message,
      })
    } finally {
      setIsDesktopQueueRefreshing(false)
    }
  }

  async function handleVoidSelectedQueueOperation() {
    if (!selectedQueuedOperation) {
      setQueueExportStatus({
        status: "blocked",
        detail: "No queued operation is selected for voiding.",
        rawCredentialsCopied: false,
      })
      setActiveSection("Queue")
      return
    }

    const operationId = selectedQueuedOperation.client_operation_id

    setActiveSection("Queue")
    setQueueExportPreview("")
    setIsQueueVoidInFlight(true)

    try {
      const voidResult = await voidOfflineOperations([operationId], queueAdapter)
      const remainingOperations = queuedOperations.filter(
        (operation) => operation.client_operation_id !== operationId,
      )

      setQueuedOperations(remainingOperations)
      setSelectedQueuedOperationId(remainingOperations[0]?.client_operation_id ?? "")

      if (stagedOperation?.client_operation_id === operationId) {
        setStagedOperation(null)
        setStagedPushBatch(null)
        setStagedPushRequest(null)
        setPushSummary(null)
      }

      if (queueSubmission?.operation.client_operation_id === operationId) {
        setQueueSubmission(null)
      }

      setQueueExportStatus({
        status: voidResult.status === "deferred" ? "blocked" : "voided",
        detail: `${operationId} removed from the current profile queue. ${voidResult.message}`,
        rawCredentialsCopied: false,
      })
      setActivityMessage({
        title:
          voidResult.status === "voided"
            ? "Queued operation voided"
            : "Queued operation removed locally",
        detail: `${voidResult.message} Website, Square, ScryDex, payment, and production systems were not touched.`,
      })
    } finally {
      setIsQueueVoidInFlight(false)
    }
  }

  async function handleClearSessionQueue() {
    if (queuedOperations.length === 0) {
      setQueueExportStatus({
        status: "blocked",
        detail: "The current profile session queue is already empty.",
        rawCredentialsCopied: false,
      })
      setActiveSection("Queue")
      return
    }

    const clearedCount = queuedOperations.length
    const voidResult = await voidOfflineOperations(
      queuedOperations.map((operation) => operation.client_operation_id),
      queueAdapter,
    )

    setQueuedOperations([])
    setSelectedQueuedOperationId("")
    setStagedOperation(null)
    setStagedPushBatch(null)
    setStagedPushRequest(null)
    setPushSummary(null)
    setQueueSubmission(null)
    setQueueExportStatus({
      status: "cleared",
      detail:
        `${clearedCount} current-session queue operation(s) cleared locally; ` +
        `${voidResult.status === "voided"
          ? "desktop pending rows were marked rejected for audit."
          : `${voidResult.message} Desktop durable rows also clear after accepted sync marking.`}`,
      rawCredentialsCopied: false,
    })
    setQueueExportPreview("")
    setActiveSection("Queue")
    setActivityMessage({
      title: "Session queue cleared",
      detail: `${voidResult.message} Current browser/session queue rows were cleared without website, Square, ScryDex, payment, or production writes.`,
    })
  }

  function recordSyncAttempt(plan: OfflineConnectorSyncSessionPlan) {
    setSyncAttempts((attempts) => [
      {
        id: `${plan.profileId}-${Date.now()}`,
        companyName: plan.companyName,
        siteUrl: plan.siteUrl,
        operationCount: plan.push.operation_count,
        pairingStatus:
          plan.paired_device_available && plan.desktop_token_available
            ? "Paired token available"
            : plan.paired_device_available
              ? "Paired token missing"
              : plan.prepared_pairing_available
                ? "Prepared locally"
                : "Pairing required",
        createdAtLabel: new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date()),
        networkStatus: "Deferred" as const,
      },
      ...attempts,
    ].slice(0, 5))
  }

  async function handleStageInventoryUpdate(
    actionTitle = "Inventory update staged",
    operationOptions: InventoryUpdateOptions = {},
    detailOverride?: string,
    targetItem = selectedItem,
  ) {
    await stageOfflineOperation(
      buildInventoryUpdateOperation(targetItem, operationOptions),
      actionTitle,
      detailOverride ??
        `${targetItem.cardName} prepared for ${activeProfile.companyName}; website push remains deferred until the device connector is paired.`,
    )
    setInventoryItems((items) =>
      items.map((item) =>
        item.id === targetItem.id
          ? {
              ...item,
              source: "queued",
            }
          : item,
      ),
    )
  }

  async function handleInventoryReservation() {
    if (selectedItem.status !== "available") {
      setActivityMessage({
        title: "Hold unavailable",
        detail: `${selectedItem.cardName} is ${statusLabel(selectedItem.status).toLowerCase()} locally; choose an available item before staging a guarded hold.`,
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server required",
        detail: "Sign in through the LAN local sync server before creating inventory holds.",
      })
      return
    }

    const localReservation = await localSyncClient.reserveInventory(localSyncSessionToken, {
      inventoryPublicId: selectedItem.publicId,
      holdReason: "staff counter hold",
    })

    if (localReservation.status !== "ok") {
      setActivityMessage({
        title: localReservation.status === "unavailable" ? "LAN server unavailable" : "Hold unavailable",
        detail: localReservation.message,
      })
      return
    }

    void refreshLocalSyncStatus()

    await stageOfflineOperation(
      buildInventoryReservationOperation(selectedItem),
      "LAN inventory hold staged",
      activeProfile.wordpress.canonicalInventoryWritesEnabled
        ? `${selectedItem.cardName} is locked by ${localSyncClient.serverUrl} and queued for ${activeProfile.companyName}; guarded website inventory execution is enabled for this connector after pairing.`
        : `${selectedItem.cardName} is locked by ${localSyncClient.serverUrl} and queued for ${activeProfile.companyName}; canonical inventory execution remains deferred for this connector.`,
    )
    setInventoryItems((items) =>
      items.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              status: "reserved",
              source: "queued",
            }
        : item,
      ),
    )
  }

  async function handleInventoryIntake() {
    if (intakeIssue || intakePriceMinorUnits === null || intakeQuantity === null) {
      setActivityMessage({
        title: "Inventory intake blocked",
        detail: intakeIssue || "Enter valid card intake details.",
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in with a staff or manager PIN before adding local inventory.",
      })
      return
    }

    const intakeResult = await localSyncClient.createInventoryIntake(localSyncSessionToken, {
      cardName: intakeCardName.trim(),
      setName: intakeSetName.trim() || "Manual Intake",
      condition: intakeCondition.trim() || "RAW",
      barcode: intakeBarcode.trim(),
      priceMinorUnits: intakePriceMinorUnits,
      location: intakeLocation.trim() || "Intake Queue",
      quantity: intakeQuantity,
      providerCardId: selectedScryDexCard?.provider_card_id,
      referenceVariantId: selectedScryDexVariant?.reference_variant_id,
      providerVariantId: selectedScryDexVariant?.provider_variant_id,
      game: selectedScryDexCard?.game ?? scryDexGame,
      setCode: selectedScryDexCard?.set_code,
      cardNumber: selectedScryDexCard?.card_number,
      printedNumber: selectedScryDexCard?.printed_number,
      variant: selectedScryDexVariant?.variant,
      finish: selectedScryDexVariant?.finish,
      language: selectedScryDexVariant?.language,
      rawOrGraded: selectedScryDexVariant?.raw_or_graded_support === "graded" ? "graded" : "raw",
      imageUrl: selectedScryDexImageUrl,
      backImageUrl: selectedScryDexVariant?.back_image_url,
      priceSource: selectedScryDexCard
        ? `${selectedScryDexCard.catalog_source}:scrydex_catalog`
        : "manual_intake",
      priceObservedAtUtc:
        selectedScryDexCard?.price_observed_at_utc ??
        selectedScryDexCard?.catalog_synced_at_utc ??
        null,
      suggestedPriceMinorUnits: selectedScryDexIntakePriceMinorUnits || intakePriceMinorUnits,
      finalPriceMinorUnits: intakePriceMinorUnits,
      priceOverrideReason:
        selectedScryDexCard &&
        selectedScryDexIntakePriceMinorUnits > 0 &&
        selectedScryDexIntakePriceMinorUnits !== intakePriceMinorUnits
          ? "staff_price_override_from_scrydex_suggestion"
          : "",
      onlineVisibility: intakeOnlineVisibility,
      kioskVisibility: intakeKioskVisibility,
      posVisibility: intakePosVisibility,
    })

    if (intakeResult.status !== "ok") {
      setActivityMessage({
        title: intakeResult.status === "unavailable" ? "LAN server unavailable" : "Inventory intake blocked",
        detail:
          intakeResult.status === "unavailable"
            ? intakeResult.message
            : `${intakeResult.message} WordPress remains the final inventory authority.`,
      })
      return
    }

    const responseItems =
      intakeResult.items && intakeResult.items.length > 0
        ? intakeResult.items
        : [intakeResult.item]
    const nextId = inventoryItems.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1
    const nextItems = responseItems.map((item, index) => inventoryItemFromLocalSync(item, nextId + index))
    const nextItem = nextItems[0]
    const intakeReceipts = buildLocalInventoryIntakeSyncReceipts(nextItems, {
      profileId: activeProfile.id,
      companyName: activeProfile.companyName,
      localSyncServerUrl: localSyncClient.serverUrl,
    })

    setInventoryItems((items) => [...nextItems, ...items])
    setLocalInventoryIntakeReceipts((receipts) => [...intakeReceipts, ...receipts].slice(0, 50))
    setSelectedId(nextItem.id)
    setQuery(nextItem.barcode)
    setIntakeCardName("")
    setIntakeSetName("")
    setIntakeCondition("LP")
    setIntakeBarcode("")
    setIntakePriceInput("0.00")
    setIntakeLocation("Intake Queue")
    setIntakeQuantityInput("1")
    void refreshLocalSyncStatus()
    setActivityMessage({
      title: "Inventory intake queued",
      detail:
        `${nextItem.cardName} x${intakeResult.quantity_added ?? nextItems.length} was added to ${localSyncClient.serverUrl}; ` +
        `${intakeReceipts.length} intake receipt(s) now track WordPress acceptance and label printing remains pending sync.`,
    })
  }

  async function handleScryDexLookup() {
    const normalizedQuery = scryDexQuery.trim()

    if (!normalizedQuery) {
      setScryDexLookupStatus("blocked")
      setScryDexLookupDetail("Enter a card, set, or number.")
      setScryDexCards([])
      setSelectedScryDexCardId("")
      setSelectedScryDexVariantId("")
      return
    }

    if (!localSyncSessionToken) {
      setScryDexLookupStatus("blocked")
      setScryDexLookupDetail("Staff PIN session required.")
      setScryDexCards([])
      setSelectedScryDexCardId("")
      setSelectedScryDexVariantId("")
      return
    }

    setScryDexLookupStatus("searching")
    setScryDexLookupDetail("Searching")

    const result = await localSyncClient.searchScryDexCards(
      localSyncSessionToken,
      normalizedQuery,
      scryDexGame,
    )

    if (result.status !== "ok") {
      setScryDexLookupStatus("blocked")
      setScryDexLookupDetail(result.message)
      setScryDexCards([])
      setSelectedScryDexCardId("")
      setSelectedScryDexVariantId("")
      return
    }

    const firstCard = result.cards[0] ?? null
    const firstVariant = firstCard?.variants[0] ?? null

    setScryDexCards(result.cards)
    setSelectedScryDexCardId(firstCard?.provider_card_id ?? "")
    setSelectedScryDexVariantId(
      firstCard && firstVariant
        ? scryDexVariantId(firstCard.provider_card_id, firstVariant, 0)
        : "",
    )
    setScryDexLookupStatus("ready")
    setScryDexLookupDetail(
      `${result.cards.length} result${result.cards.length === 1 ? "" : "s"} from ${result.source}.`,
    )
  }

  function handleUseScryDexCard(card: LocalSyncScryDexCard) {
    setSelectedScryDexCardId(card.provider_card_id)
    const firstVariant = card.variants[0] ?? null
    const variantId = firstVariant
      ? scryDexVariantId(card.provider_card_id, firstVariant, 0)
      : ""

    setSelectedScryDexVariantId(variantId)
    setIntakeCardName(card.card_name)
    setIntakeSetName(card.set_name)
    setIntakeBarcode("")
    setIntakePriceInput(
      creditRedemptionInputFromMinorUnits(
        scryDexIntakePriceMinorUnits(card, firstVariant, intakeCondition),
      ),
    )
    setActivityMessage({
      title: "ScryDex reference selected",
      detail: `${card.card_name} ${card.printed_number} is ready for local intake review; leave barcode blank to auto-generate a unique copy code.`,
    })
  }

  function handleScryDexVariantChange(nextVariantId: string) {
    setSelectedScryDexVariantId(nextVariantId)

    if (!selectedScryDexCard) {
      return
    }

    const nextVariant = selectedScryDexCard.variants.find(
      (variant, index) =>
        scryDexVariantId(selectedScryDexCard.provider_card_id, variant, index) === nextVariantId,
    ) ?? null

    setIntakePriceInput(
      creditRedemptionInputFromMinorUnits(
        scryDexIntakePriceMinorUnits(selectedScryDexCard, nextVariant, intakeCondition),
      ),
    )
  }

  function handleIntakeConditionChange(nextCondition: string) {
    setIntakeCondition(nextCondition)

    if (!selectedScryDexCard) {
      return
    }

    setIntakePriceInput(
      creditRedemptionInputFromMinorUnits(
        scryDexIntakePriceMinorUnits(selectedScryDexCard, selectedScryDexVariant, nextCondition),
      ),
    )
  }

  function handleKioskAddItem(item = selectedItem) {
    if (item.status !== "available") {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: "Kiosk item unavailable",
        detail: `${item.cardName} is ${statusLabel(item.status).toLowerCase()} in the local cache; the kiosk can only stage available cards for pickup.`,
      })
      return
    }

    setKioskCartIds((ids) => (ids.includes(item.id) ? ids : [...ids, item.id]))
    setActiveSection("Kiosk")
    setActivityMessage({
      title: "Kiosk cart updated",
      detail: `${item.cardName} is in the local kiosk pickup cart; website inventory remains authoritative when sync accepts the order.`,
    })
  }

  function handleKioskRemoveItem(itemId: number) {
    setKioskCartIds((ids) => ids.filter((id) => id !== itemId))
  }

  async function handleKioskSubmitOrder() {
    if (!kioskFirstName.trim() || !kioskLastName.trim()) {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: "Kiosk order needs name",
        detail: "Enter the customer's first and last name before staging a pickup order.",
      })
      return
    }

    const availableItems = kioskCartItems.filter((item) => item.status === "available")

    if (availableItems.length === 0) {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: "Kiosk cart empty",
        detail: "Select at least one available card before staging a pickup order.",
      })
      return
    }

    const kioskOrder = await localSyncClient.createKioskOrder({
      firstName: kioskFirstName,
      lastName: kioskLastName,
      inventoryPublicIds: availableItems.map((item) => item.publicId),
    })

    if (kioskOrder.status !== "ok") {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: kioskOrder.status === "unavailable" ? "LAN server unavailable" : "Kiosk order blocked",
        detail: kioskOrder.message,
      })
      return
    }

    void refreshLocalSyncStatus()
    const kioskTicket: KioskOrderTicket = {
      orderId: kioskOrder.order.order_id,
      customerName: kioskCustomerName,
      itemCount: availableItems.length,
      reservationIds: kioskOrder.order.reservation_ids,
      createdAtUtc: kioskOrder.order.created_at_utc,
      status: kioskOrder.order.status,
    }

    for (const item of availableItems) {
      await stageOfflineOperation(
        buildInventoryReservationOperation(item, {
          actorId: workspace.device.managerId,
          deviceId: activePairedDevice?.devicePublicId,
          locationId: workspace.device.locationId,
          holdReason: `kiosk pickup order ${kioskOrder.order.order_id} for ${kioskCustomerName}`,
        }),
        "Kiosk pickup hold staged",
        `${item.cardName} is queued for ${kioskCustomerName}; order ${kioskOrder.order.order_id} can be pulled after website sync acceptance.`,
      )
    }

    const stagedIds = new Set(availableItems.map((item) => item.id))
    setInventoryItems((items) =>
      items.map((item) =>
        stagedIds.has(item.id)
          ? {
              ...item,
              status: "reserved",
              source: "queued",
            }
          : item,
      ),
    )
    setKioskOrderTickets((tickets) => [kioskTicket, ...tickets].slice(0, 8))
    setKioskCartIds([])
    setKioskFirstName("")
    setKioskLastName("")
    setActiveSection("Queue")
    setActivityMessage({
      title: "Kiosk order queued",
      detail: `${availableItems.length} card(s) locked by ${localSyncClient.serverUrl} for ${kioskCustomerName}; order ${kioskOrder.order.order_id} is ready for staff pull and website sync acceptance.`,
    })
  }

  async function handleQuantityAdjustment() {
    if (quantityDelta === null) {
      setActiveSection("Inventory")
      setActivityMessage({
        title: "Quantity adjustment blocked",
        detail: quantityAdjustmentIssue,
      })
      return
    }

    const reason = cleanInventoryAdjustmentReason(quantityAdjustmentReason)
    const signedDelta = quantityDelta > 0 ? `+${quantityDelta}` : String(quantityDelta)
    setQuantityAdjustmentReason(reason)

    await handleStageInventoryUpdate(
      "Quantity adjustment staged",
      {
        operationKind: "quantity",
        quantityDelta,
        syncIntent: "staff_quantity_adjustment",
        adjustmentReason: reason,
      },
      `${selectedItem.cardName} quantity correction (${signedDelta}) is queued locally with reason "${reason}"; exact website inventory remains authoritative after sync acceptance.`,
    )
  }

  async function handleEventRegistration(event: EventSnapshot | undefined = selectedEvent) {
    if (!event) {
      setActivityMessage({
        title: "No event selected",
        detail: "Pull event snapshots or select an event before staging an offline registration.",
      })
      return
    }

    if (event.registrationStatus === "closed" || event.registrationStatus === "full") {
      setActivityMessage({
        title: "Event registration blocked",
        detail: `${event.title} is ${eventRegistrationStatusLabel(event.registrationStatus).toLowerCase()} in the local cache; sync latest event data before accepting another offline registration.`,
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in with a staff or manager PIN before registering event attendees.",
      })
      return
    }

    const waitlistIntent = event.registrationStatus === "waitlist"
    const attendeeLabel = cleanOfflineEventAttendeeLabel(eventAttendeeLabel)
    const registrationResult = await localSyncClient.createEventRegistration(localSyncSessionToken, {
      eventId: event.eventId,
      attendeeLabel,
      paymentStatus: eventPaymentStatus,
    })

    if (registrationResult.status !== "ok") {
      setActivityMessage({
        title: registrationResult.status === "unavailable" ? "LAN server unavailable" : "Event registration blocked",
        detail: registrationResult.message,
      })
      return
    }

    await stageOfflineOperation(
      buildEventRegistrationOperation(event, {
        attendeeLabel,
        paymentStatus: eventPaymentStatus,
        registrationSource: "walk_in",
      }),
      waitlistIntent ? "Event waitlist staged" : "Event registration staged",
      waitlistIntent
        ? `${attendeeLabel} waitlist request for ${event.title} is queued for ${activeProfile.companyName}; website capacity remains authoritative after sync acceptance.`
        : `${attendeeLabel} walk-in registration for ${event.title} is queued for ${activeProfile.companyName}; website capacity guard runs when the paired sync accepts the push.`,
    )
    void refreshLocalSyncStatus()

    setPendingEventRegistrationIds((eventIds) => [
      event.eventId,
      ...eventIds.filter((eventId) => eventId !== event.eventId),
    ].slice(0, 8))
    setShowEventQueue(true)
    setActiveSection("Events")
    const nextEvent = eventSnapshotFromLocalSync(registrationResult.event)
    setEventSnapshots((events) =>
      events.map((item) => (item.eventId === nextEvent.eventId ? nextEvent : item)),
    )
  }

  async function handleEventCheckin(event: EventSnapshot | undefined = selectedEvent) {
    if (!event) {
      setActivityMessage({
        title: "No event selected",
        detail: "Pull event snapshots or select an event before staging an offline check-in.",
      })
      return
    }

    if (event.registrationStatus === "closed") {
      setActivityMessage({
        title: "Event check-in blocked",
        detail: `${event.title} is closed in the local cache; sync latest event data before accepting offline check-ins.`,
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in with a staff or manager PIN before checking in event attendees.",
      })
      return
    }

    const attendeeLabel = cleanOfflineEventAttendeeLabel(eventAttendeeLabel, "Offline attendee")
    const registrationPublicId = cleanOfflineEventRegistrationPublicId(
      eventCheckinLookup,
      event.eventId,
    )
    const checkinResult = await localSyncClient.createEventCheckin(localSyncSessionToken, {
      eventId: event.eventId,
      attendeeLabel,
      registrationPublicId,
      checkinMethod: "manual_lookup",
    })

    if (checkinResult.status !== "ok") {
      setActivityMessage({
        title: checkinResult.status === "unavailable" ? "LAN server unavailable" : "Event check-in blocked",
        detail: checkinResult.message,
      })
      return
    }

    await stageOfflineOperation(
      buildEventCheckinOperation(event, {
        attendeeLabel,
        registrationPublicId,
        checkinMethod: "manual_lookup",
      }),
      "Event check-in staged",
      `${attendeeLabel} check-in (${registrationPublicId}) for ${event.title} is queued for ${activeProfile.companyName}; website registration matching remains authoritative after sync acceptance.`,
    )
    void refreshLocalSyncStatus()

    setPendingEventCheckinIds((eventIds) => [
      event.eventId,
      ...eventIds.filter((eventId) => eventId !== event.eventId),
    ].slice(0, 8))
    setShowEventQueue(true)
    setActiveSection("Events")
    const nextEvent = eventSnapshotFromLocalSync(checkinResult.event)
    setEventSnapshots((events) =>
      events.map((item) => (item.eventId === nextEvent.eventId ? nextEvent : item)),
    )
  }

  function handleCustomerCreditSelection(customerIdValue: string) {
    const nextCustomerId = Number(customerIdValue)
    const nextCustomerCredit = findCustomerCreditSnapshot(customerCreditDirectory, nextCustomerId)

    if (!nextCustomerCredit) {
      return
    }

    setActiveCustomerId(nextCustomerCredit.customerId)
    setCreditRedemptionInput(
      creditRedemptionInputFromMinorUnits(nextCustomerCredit.redemptionPreviewMinorUnits),
    )
    setShowCreditLedger(true)
    setActiveSection("Customers")
    setActivityMessage({
      title: "Customer credit selected",
      detail:
        `${customerCreditDisplayName(nextCustomerCredit)} cached balance is ready for offline review; ` +
        "website ledger remains authoritative after sync acceptance.",
      })
  }

  async function handleCreateCustomer() {
    const firstName = newCustomerFirstName.trim()
    const lastName = newCustomerLastName.trim()
    const email = newCustomerEmail.trim()

    if (!firstName && !lastName && !email) {
      setActivityMessage({
        title: "Customer details needed",
        detail: "Enter at least a customer name or email before creating the local customer.",
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in with a staff or manager PIN before creating customers.",
      })
      return
    }

    const createResult = await localSyncClient.createCustomer(localSyncSessionToken, {
      firstName,
      lastName,
      email,
    })

    if (createResult.status !== "ok") {
      setActivityMessage({
        title: createResult.status === "unavailable" ? "LAN server unavailable" : "Customer blocked",
        detail:
          createResult.status === "unavailable"
            ? createResult.message
            : `${createResult.message} Website customer creation remains pending until sync acceptance.`,
      })
      return
    }

    const localCustomerId =
      createResult.customer.customer_id ??
      customerCreditDirectory.reduce((maxId, credit) => Math.max(maxId, credit.customerId), 0) + 1
    const nextCreditSnapshot = customerCreditSnapshotFromLocalSyncCustomer(createResult.customer, {
      customerId: localCustomerId,
      customerPublicId: createResult.customer.customer_public_id,
      rowVersion: createResult.customer.row_version,
      label: "Customer credit",
      customerName: createResult.customer.display_name,
      customerLookup: createResult.customer.customer_lookup,
      availableMinorUnits: 0,
      redemptionPreviewMinorUnits: 0,
      currency: createResult.customer.credit.currency,
      note: "Local customer created through the LAN server; website customer creation is pending sync acceptance.",
    })

    setCustomerCreditDirectory((credits) => upsertCustomerCreditSnapshot(credits, nextCreditSnapshot))
    setActiveCustomerId(nextCreditSnapshot.customerId)
    setNewCustomerFirstName("")
    setNewCustomerLastName("")
    setNewCustomerEmail("")
    setShowCreditLedger(true)
    void refreshLocalSyncStatus()
    setActivityMessage({
      title: "Customer queued",
      detail:
        `${nextCreditSnapshot.customerName ?? "Customer"} was created in ${localSyncClient.serverUrl}; ` +
        "WordPress assigns the final customer record after sync acceptance.",
    })
  }

  async function handleCreditAdjustment() {
    if (creditAdjustmentIssue || creditAdjustmentMinorUnits === null) {
      setActivityMessage({
        title: "Credit add blocked",
        detail: creditAdjustmentIssue || "Enter a valid customer credit amount.",
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "Manager PIN required",
        detail: "Sign in with a manager PIN before adding store credit.",
      })
      return
    }

    const adjustmentResult = await localSyncClient.createCreditAdjustment(localSyncSessionToken, {
      customerPublicId: customerCredit.customerPublicId ?? String(customerCredit.customerId),
      amountMinorUnits: creditAdjustmentMinorUnits,
      reason: creditAdjustmentReason.trim() || "Manager-approved store credit",
    })

    if (adjustmentResult.status !== "ok") {
      setActivityMessage({
        title: adjustmentResult.status === "unavailable" ? "LAN server unavailable" : "Credit add blocked",
        detail:
          adjustmentResult.status === "unavailable"
            ? adjustmentResult.message
            : `${adjustmentResult.message} Manager approval and website ledger acceptance are required.`,
      })
      return
    }

    const nextCreditSnapshot = customerCreditSnapshotFromLocalSyncCustomer(
      adjustmentResult.customer,
      customerCredit,
    )

    setCustomerCreditDirectory((credits) => upsertCustomerCreditSnapshot(credits, nextCreditSnapshot))
    setCustomerCreditLedgerEntries((entries) => [
      customerCreditLedgerEntryFromLocalSync(
        adjustmentResult.ledger_entry,
        nextCreditSnapshot.customerId,
      ),
      ...entries.filter((entry) => entry.entryId !== adjustmentResult.ledger_entry.entry_id),
    ])
    setActiveCustomerId(nextCreditSnapshot.customerId)
    setCreditAdjustmentInput("0.00")
    setCreditRedemptionInput(
      creditRedemptionInputFromMinorUnits(nextCreditSnapshot.redemptionPreviewMinorUnits),
    )
    setShowCreditLedger(true)
    void refreshLocalSyncStatus()
    setActivityMessage({
      title: "Credit add queued",
      detail:
        `${formatMoney(creditAdjustmentMinorUnits, nextCreditSnapshot.currency)} added locally by manager approval; ` +
        "WordPress posts the final ledger entry after sync acceptance.",
    })
  }

  async function handleCreditRedemption() {
    if (creditRedemptionIssue || creditRedemptionMinorUnits === null) {
      setActiveSection("Customers")
      setActivityMessage({
        title: "Credit amount blocked",
        detail: creditRedemptionIssue || "Enter a valid customer credit amount.",
      })
      return
    }

    const amount = formatMoney(creditRedemptionMinorUnits, customerCredit.currency)
    const creditPreviewOperation = buildCustomerCreditRedemptionOperation(customerCredit, {
      amountMinorUnits: creditRedemptionMinorUnits,
      saleTotalMinorUnits: squareCreditHandoffPlan.saleTotalMinorUnits,
      squareReceiptReference: cleanSquareReceiptReference,
      squareCashierConfirmed,
      squareHandoffMode: squareCreditHandoffPlan.squareHandoffMode,
      reason: `offline customer credit redemption ${amount}`,
    })

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in with a staff or manager PIN before using customer credit.",
      })
      return
    }

    const redemptionResult = await localSyncClient.createCreditRedemption(localSyncSessionToken, {
      customerPublicId: customerCredit.customerPublicId ?? String(customerCredit.customerId),
      amountMinorUnits: creditRedemptionMinorUnits,
      saleTotalMinorUnits: squareCreditHandoffPlan.saleTotalMinorUnits,
      reason: `offline customer credit redemption ${amount}`,
      squareReceiptReference: cleanSquareReceiptReference,
      squareCashierConfirmed,
    })

    if (redemptionResult.status !== "ok") {
      setActivityMessage({
        title: redemptionResult.status === "unavailable" ? "LAN server unavailable" : "Credit use blocked",
        detail:
          redemptionResult.status === "unavailable"
            ? redemptionResult.message
            : `${redemptionResult.message} WordPress remains the final ledger authority.`,
      })
      return
    }

    const nextCreditSnapshot = customerCreditSnapshotFromLocalSyncCustomer(
      redemptionResult.customer,
      customerCredit,
    )

    setCustomerCreditDirectory((credits) => upsertCustomerCreditSnapshot(credits, nextCreditSnapshot))
    setCustomerCreditLedgerEntries((entries) => [
      customerCreditLedgerEntryFromLocalSync(
        redemptionResult.ledger_entry,
        nextCreditSnapshot.customerId,
      ),
      ...entries.filter((entry) => entry.entryId !== redemptionResult.ledger_entry.entry_id),
    ])
    setActiveCustomerId(nextCreditSnapshot.customerId)
    setCreditRedemptionInput(
      creditRedemptionInputFromMinorUnits(nextCreditSnapshot.redemptionPreviewMinorUnits),
    )
    setSquareReceiptReference("")
    setSquareCashierConfirmed(false)
    setPendingCreditByCustomer((holds) => ({
      ...holds,
      [customerCredit.customerId]: 0,
    }))
    void refreshLocalSyncStatus()
    setActivityMessage({
      title: "LAN credit use queued",
      detail:
        `${amount} customer credit locked by ${localSyncClient.serverUrl}; ` +
        `${redemptionResult.square_handoff.square_instruction} ` +
        `Square ref ${redemptionResult.square_handoff.square_receipt_reference}; ` +
        `trace ${creditPreviewOperation.client_operation_id}; WordPress posts the final ledger entry after sync acceptance.`,
    })
    setShowCreditLedger(true)
  }

  function handleConnectorProfileChange(profileId: string) {
    const nextProfile = findConnectorProfile(connectorProfiles, profileId)

    setActiveProfileId(nextProfile.id)
    setConnectorDraft(connectorProfileDraftFromProfile(nextProfile))
    setLanSetupProbe({
      status: "idle",
      endpoint: "",
      detail: "LAN setup probe has not run for this website.",
      oneWebsiteMode: true,
      credentialsSyncedToApp: false,
    })
    setActiveSection("Settings")
    setActivityMessage({
      title: "Connector profile selected",
      detail: `${nextProfile.companyName} ${nextProfile.environment} is active. Credentials stay in the desktop secure store and WordPress server settings.`,
    })
  }

  function handleOpenWebsiteSetup() {
    setActiveSection("Settings")
    setActivityMessage({
      title: "Website setup opened",
      detail: `${activeProfile.companyName} is connected to ${connectorDisplayUrl(activeProfile)} and LAN sync server ${localSyncServerDisplayUrl(activeProfile)}. Settings and pairing controls stay manager-gated for the installed website.`,
    })
  }

  function handleNewConnectorDraft() {
    setConnectorDraft(createEmptyConnectorProfileDraft())
    setConnectorDraftIssues([])
    setConnectorValidation(null)
    setConnectorTestReport(null)
    setLanSetupProbe({
      status: "idle",
      endpoint: "",
      detail: "LAN setup probe has not run for this website.",
      oneWebsiteMode: true,
      credentialsSyncedToApp: false,
    })
    setPairingPlan(null)
    setActiveSection("Settings")
    setActivityMessage({
      title: "Website setup reset",
      detail:
        "Add the WordPress website host for this installation. Secret values stay out of this app profile.",
    })
  }

  function handleSaveConnectorDraft() {
    const result = buildConnectorProfileFromDraft(connectorDraft)

    setConnectorDraftIssues(result.issues)

    if (!result.profile) {
      setActiveSection("Settings")
      setActivityMessage({
        title: "Connector draft needs details",
        detail: result.issues.join(" "),
      })
      return
    }

    const profile = result.profile
    const validation = validateConnectorManifest(buildConnectorManifestPreview(profile))
    const report = buildConnectorTestReport(profile, validation, null)

    setConnectorProfiles((profiles) => upsertConnectorProfile(profiles, profile))
    setActiveProfileId(profile.id)
    setConnectorValidation(validation)
    setConnectorTestReport(report)
    setPairingPlan(null)
    setLanSetupProbe({
      status: "idle",
      endpoint: "",
      detail: "LAN setup probe has not run for this website.",
      oneWebsiteMode: true,
      credentialsSyncedToApp: false,
    })
    setActiveSection("Settings")
    setActivityMessage({
      title: validation.status === "rejected" ? "Website saved with issues" : "Website connection saved",
      detail: `${profile.companyName} ${profile.environment} now points at ${connectorDisplayUrl(profile)} with LAN sync at ${localSyncServerDisplayUrl(profile)}. Guarded inventory holds are ${profile.wordpress.canonicalInventoryWritesEnabled ? "enabled" : "deferred"}; credentials are still server-side or desktop secure-store only.`,
    })
  }

  async function handleSyncNowPreview() {
    if (syncNowInFlight) {
      return
    }

    setSyncNowInFlight(true)

    try {
    let lanPullResult: LocalSyncPullResult | null = null
    let lanPushResult: LocalSyncPushResult | null = null

    if (localSyncSessionToken) {
      lanPullResult = await localSyncClient.pullWebsiteInventory(localSyncSessionToken)

      if (lanPullResult.status === "ok" && lanPullResult.items.length > 0) {
        const pulledItems = lanPullResult.items

        setInventoryItems((items) => {
          const merged = [...items]
          let nextId = Math.max(0, ...merged.map((item) => item.id)) + 1

          for (const pulledItem of pulledItems) {
            const existingIndex = merged.findIndex((item) => item.publicId === pulledItem.public_id)
            const mappedItem = inventoryItemFromLocalSync(
              pulledItem,
              existingIndex >= 0 ? merged[existingIndex].id : nextId++,
            )

            if (existingIndex >= 0) {
              merged[existingIndex] = {
                ...mappedItem,
                id: merged[existingIndex].id,
              }
            } else {
              merged.push(mappedItem)
            }
          }

          return merged
        })
      }

      if (lanPullResult.status === "ok" && lanPullResult.events.length > 0) {
        const pulledEvents = lanPullResult.events

        setEventSnapshots((events) => mergeLocalSyncEventSnapshots(events, pulledEvents))
        setSelectedEventId((currentEventId) => currentEventId || pulledEvents[0]?.event_id || "")
      }

      lanPushResult = await localSyncClient.pushQueuedOperations(localSyncSessionToken)

      const successfulLanPushResult = lanPushResult.status === "ok" ? lanPushResult : null

      if (successfulLanPushResult && successfulLanPushResult.accepted_count > 0) {
        const acceptedPublicIds = new Set(
          successfulLanPushResult.results
            .filter((result) => result.status === "accepted")
            .map((result) => result.entity_id),
        )

        setInventoryItems((items) =>
          items.map((item) =>
            acceptedPublicIds.has(item.publicId)
              ? {
                  ...item,
                  status: inventoryStatusFromWordPressPushResult(
                    successfulLanPushResult,
                    item.publicId,
                  ) ?? item.status,
                  source: "accepted",
                  rowVersion: item.rowVersion + 1,
                }
            : item,
          ),
        )
      }

      if (successfulLanPushResult && successfulLanPushResult.results.length > 0) {
        const lanPushResults = successfulLanPushResult.results

        setLocalInventoryIntakeReceipts((receipts) =>
          applyLocalInventoryIntakePushResults(receipts, lanPushResults).receipts,
        )
      }
    }

    const nextLocalSyncStatus = await localSyncClient.getSyncStatus()

    setLocalSyncStatus(nextLocalSyncStatus)

    const operationsForSync = queuedOperations.length > 0
      ? queuedOperations
      : stagedOperation
        ? [stagedOperation]
        : []
    let nextSyncSessionPlan: OfflineConnectorSyncSessionPlan
    let syncBatchForExecution: OfflinePushBatchPayload | null = null

    if (operationsForSync.length > 0) {
      const batch = buildOfflinePushBatchPayload(
        operationsForSync,
        activePairedDevice ? { deviceId: activePairedDevice.devicePublicId } : {},
      )
      syncBatchForExecution = batch
      const canonicalInventoryOperationCount = batch.operations.filter(isCanonicalInventoryOperation).length
      const canonicalInventoryWritesReady =
        activeProfile.wordpress.routeConnectedPushReady &&
        activeProfile.wordpress.canonicalInventoryWritesEnabled &&
        canonicalInventoryOperationCount > 0

      setStagedPushBatch(batch)
      setStagedPushRequest(buildOfflinePushRequestPlan(batch))
      nextSyncSessionPlan = buildOfflineConnectorSyncSessionPlan(
        activeProfile,
        batch,
        activePreparedPairingRequests[0] ?? null,
        activePairedDevice,
      )
      setSyncSessionPlan(nextSyncSessionPlan)
      setPushSummary(
        summarizeOfflinePushResult({
          data: {
            batch_id: batch.batch_id,
            server_time_utc: new Date().toISOString(),
            operation_count: batch.operations.length,
            counts: {
              accepted: 0,
              conflict: 0,
              rejected: 0,
            },
            results: [],
          },
          meta: {
            push_queue_replay_deferred: true,
            push_canonical_mutations_deferred: !canonicalInventoryWritesReady,
            canonical_inventory_execution_enabled:
              activeProfile.wordpress.canonicalInventoryWritesEnabled,
            canonical_inventory_writes_deferred: !canonicalInventoryWritesReady,
          },
        }),
      )
    } else {
      nextSyncSessionPlan = buildOfflineConnectorSyncSessionPlan(
        activeProfile,
        null,
        activePreparedPairingRequests[0] ?? null,
        activePairedDevice,
      )
      setSyncSessionPlan(nextSyncSessionPlan)
    }

    recordSyncAttempt(nextSyncSessionPlan)
    const nextPullRefreshPreview = buildOfflinePullRefreshPreview(
      activeProfile,
      inventoryItems,
      customerCredit,
      openConflicts,
      operationsForSync,
      { eventRowsRefreshed: eventSnapshots.length },
    )
    setPullRefreshPreview(nextPullRefreshPreview)
    setInventoryItems((items) =>
      items.map((item) =>
        item.source === "cached"
          ? {
              ...item,
              source: "accepted",
              rowVersion: item.rowVersion + 1,
            }
          : item,
      ),
    )
    await runDesktopSyncIfReady(nextSyncSessionPlan, syncBatchForExecution)
    setActiveSection("Sync")
    const pullMessage = lanSyncPullMessage(lanPullResult)
    const pushMessage = lanSyncPushMessage(lanPushResult)

    setLanSyncLastResult({
      generatedAtLabel: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date()),
      pullMessage,
      pushMessage,
    })
    setActivityMessage({
      title:
        lanPushResult?.status === "ok" && lanPushResult.accepted_count > 0
          ? "Website sync accepted"
          : "Sync plan prepared",
      detail:
        operationsForSync.length > 0
          ? `${operationsForSync.length} local operation(s) batched for ${activeProfile.companyName}; ${pullMessage} ${pushMessage} pull refresh preview preserved ${nextPullRefreshPreview.queuedOperationsPreserved} queued op(s), and guarded holds are ${nextSyncSessionPlan.push.canonical_inventory_writes_deferred ? "deferred" : "ready"}.`
          : `${connectorDisplayUrl(activeProfile)}${activeProfile.wordpress.restBasePath}/offline/pull and /offline/push are ready for this company profile; ${pullMessage} ${pushMessage}`,
    })
    } finally {
      setSyncNowInFlight(false)
    }
  }

  async function runDesktopSyncIfReady(
    plan: OfflineConnectorSyncSessionPlan,
    batch: OfflinePushBatchPayload | null,
  ) {
    if (activeProfile.environment === "production") {
      setDesktopSyncExecution({
        status: "blocked",
        detail: "Production live sync is blocked until the manual deployment approval checklist is complete.",
        cacheAppliedCount: 0,
        cacheInsertedCount: 0,
        cacheUpdatedCount: 0,
        cacheIgnoredCount: 0,
        creditCacheAppliedCount: 0,
        creditCacheUpdatedCount: 0,
        creditCacheIgnoredCount: 0,
        eventCacheAppliedCount: 0,
        eventCacheInsertedCount: 0,
        eventCacheUpdatedCount: 0,
        eventCacheIgnoredCount: 0,
        conflictCacheAppliedCount: 0,
        conflictCacheInsertedCount: 0,
        conflictCacheUpdatedCount: 0,
        conflictCacheIgnoredCount: 0,
        rawTokenReturned: false,
        rawResponseReturned: false,
        credentialsSyncedToApp: false,
      })
      return
    }

    if (!activePairedDevice) {
      setDesktopSyncExecution({
        status: "preview",
        detail: "Desktop live sync preview only; pair this company connector before network pull/push execution.",
        cacheAppliedCount: 0,
        cacheInsertedCount: 0,
        cacheUpdatedCount: 0,
        cacheIgnoredCount: 0,
        creditCacheAppliedCount: 0,
        creditCacheUpdatedCount: 0,
        creditCacheIgnoredCount: 0,
        eventCacheAppliedCount: 0,
        eventCacheInsertedCount: 0,
        eventCacheUpdatedCount: 0,
        eventCacheIgnoredCount: 0,
        conflictCacheAppliedCount: 0,
        conflictCacheInsertedCount: 0,
        conflictCacheUpdatedCount: 0,
        conflictCacheIgnoredCount: 0,
        rawTokenReturned: false,
        rawResponseReturned: false,
        credentialsSyncedToApp: false,
      })
      return
    }

    if (activePairedDevice.tokenStatus !== "stored") {
      setDesktopSyncExecution({
        status: "preview",
        detail: `Desktop live sync preview only; paired device ${activePairedDevice.devicePublicId} token status is ${activePairedDevice.tokenStatus}.`,
        cacheAppliedCount: 0,
        cacheInsertedCount: 0,
        cacheUpdatedCount: 0,
        cacheIgnoredCount: 0,
        creditCacheAppliedCount: 0,
        creditCacheUpdatedCount: 0,
        creditCacheIgnoredCount: 0,
        eventCacheAppliedCount: 0,
        eventCacheInsertedCount: 0,
        eventCacheUpdatedCount: 0,
        eventCacheIgnoredCount: 0,
        conflictCacheAppliedCount: 0,
        conflictCacheInsertedCount: 0,
        conflictCacheUpdatedCount: 0,
        conflictCacheIgnoredCount: 0,
        rawTokenReturned: false,
        rawResponseReturned: false,
        credentialsSyncedToApp: false,
      })
      return
    }

    if (!offlineSyncAdapter) {
      setDesktopSyncExecution({
        status: "preview",
        detail: "Desktop live sync preview only; open the Windows Tauri shell to attach the secure-store token.",
        cacheAppliedCount: 0,
        cacheInsertedCount: 0,
        cacheUpdatedCount: 0,
        cacheIgnoredCount: 0,
        creditCacheAppliedCount: 0,
        creditCacheUpdatedCount: 0,
        creditCacheIgnoredCount: 0,
        eventCacheAppliedCount: 0,
        eventCacheInsertedCount: 0,
        eventCacheUpdatedCount: 0,
        eventCacheIgnoredCount: 0,
        conflictCacheAppliedCount: 0,
        conflictCacheInsertedCount: 0,
        conflictCacheUpdatedCount: 0,
        conflictCacheIgnoredCount: 0,
        rawTokenReturned: false,
        rawResponseReturned: false,
        credentialsSyncedToApp: false,
      })
      return
    }

    setDesktopSyncExecution({
      status: "loading",
      detail: "Running authenticated desktop pull/push sync through the Tauri command.",
      cacheAppliedCount: 0,
      cacheInsertedCount: 0,
      cacheUpdatedCount: 0,
      cacheIgnoredCount: 0,
      creditCacheAppliedCount: 0,
      creditCacheUpdatedCount: 0,
      creditCacheIgnoredCount: 0,
      eventCacheAppliedCount: 0,
      eventCacheInsertedCount: 0,
      eventCacheUpdatedCount: 0,
      eventCacheIgnoredCount: 0,
      conflictCacheAppliedCount: 0,
      conflictCacheInsertedCount: 0,
      conflictCacheUpdatedCount: 0,
      conflictCacheIgnoredCount: 0,
      rawTokenReturned: false,
      rawResponseReturned: false,
      credentialsSyncedToApp: false,
    })

    try {
      const pull = await offlineSyncAdapter.runOfflineSyncRequest({
        endpoint: plan.pull.url,
        route: "pull",
        profile_id: activeProfile.id,
        device_public_id: activePairedDevice.devicePublicId,
        body: buildOfflinePullRequestBody(activePairedDevice.devicePublicId),
      })
      const push = batch
        ? await offlineSyncAdapter.runOfflineSyncRequest({
            endpoint: plan.push.url,
            route: "push",
            profile_id: activeProfile.id,
            device_public_id: activePairedDevice.devicePublicId,
            body: batch,
            idempotency_key: batch.batch_id,
          })
        : undefined
      const completed =
        pull.status === "offline_sync_request_completed" &&
        (!push || push.status === "offline_sync_request_completed")
      const cacheApplyResult = applyOfflinePullInventoryRecordsToCache(
        inventoryItems,
        completed ? pull.pull_inventory_records : [],
      )
      const creditCacheApplyResult = applyOfflinePullCustomerCreditRecordsToCache(
        customerCredit,
        completed ? pull.pull_customer_credit_records : [],
      )
      const eventCacheApplyResult = applyOfflinePullEventRecordsToCache(
        eventSnapshots,
        completed ? pull.pull_event_records : [],
      )
      const conflictCacheApplyResult = applyOfflinePullConflictRecordsToCache(
        openConflicts,
        completed ? pull.pull_conflict_records : [],
      )
      const pushSummaryResult = push
        ? summarizeOfflinePushResult({
            data: {
              batch_id: push.batch_id ?? plan.push.batch_id,
              server_time_utc: new Date().toISOString(),
              operation_count: push.operation_count,
              counts: {
                accepted: push.accepted_count,
                conflict: push.conflict_count,
                rejected: push.rejected_count,
              },
              results: [
                ...(push.accepted_operation_ids ?? []).map((clientOperationId) => ({
                  client_operation_id: clientOperationId,
                  status: "accepted",
                })),
                ...(push.conflict_operation_ids ?? []).map((clientOperationId) => ({
                  client_operation_id: clientOperationId,
                  status: "conflict",
                })),
                ...(push.rejected_operation_ids ?? []).map((clientOperationId) => ({
                  client_operation_id: clientOperationId,
                  status: "rejected",
                })),
              ],
            },
            meta: {
              push_queue_replay_deferred: true,
              push_canonical_mutations_deferred:
                plan.push.canonical_inventory_writes_deferred,
              canonical_inventory_execution_enabled:
                plan.push.canonical_inventory_execution_enabled,
              canonical_inventory_writes_deferred:
                plan.push.canonical_inventory_writes_deferred,
            },
          })
        : null
      const queueApplyResult =
        pushSummaryResult && completed
          ? applyOfflinePushResultToQueue(queuedOperations, pushSummaryResult)
          : null
      const queueMarkSyncedResult =
        queueApplyResult?.queueReplayApplied
          ? await markOfflineOperationsSynced(queueApplyResult.removedOperationIds, queueAdapter)
          : null

      if (cacheApplyResult.appliedCount > 0) {
        setInventoryItems(cacheApplyResult.items)
      }
      if (creditCacheApplyResult.appliedCount > 0) {
        setCustomerCreditDirectory((credits) =>
          upsertCustomerCreditSnapshot(credits, creditCacheApplyResult.customerCredit),
        )
        setPendingCreditByCustomer((holds) => ({
          ...holds,
          [creditCacheApplyResult.customerCredit.customerId]: Math.min(
            creditCacheApplyResult.customerCredit.availableMinorUnits,
            holds[creditCacheApplyResult.customerCredit.customerId] ?? 0,
          ),
        }))
      }
      if (eventCacheApplyResult.appliedCount > 0) {
        setEventSnapshots(eventCacheApplyResult.events)
      }
      if (conflictCacheApplyResult.appliedCount > 0) {
        setOpenConflicts(conflictCacheApplyResult.conflicts)
      }
      if (pushSummaryResult) {
        setPushSummary(pushSummaryResult)
      }
      if (queueApplyResult?.queueReplayApplied) {
        setQueuedOperations(queueApplyResult.remainingOperations)
      }

      setDesktopSyncExecution({
        status: completed ? "synced" : "blocked",
        detail: completed
          ? `Desktop sync completed: pull ${pull.pull_record_count} record(s), ${cacheApplyResult.appliedCount} inventory row(s), ${creditCacheApplyResult.appliedCount} credit account(s), ${eventCacheApplyResult.appliedCount} event(s), and ${conflictCacheApplyResult.appliedCount} conflict(s) applied, ${push ? `${push.accepted_count} accepted push op(s); ${queueApplyResult?.removedOperationIds.length ?? 0} cleared from local queue; ${(queueApplyResult?.retainedConflictOperationIds.length ?? 0) + (queueApplyResult?.retainedRejectedOperationIds.length ?? 0)} kept for staff review; desktop queue ${queueMarkSyncedResult?.status ?? "unchanged"}` : "no push batch"}.`
          : `Desktop sync returned a WordPress rejection: pull ${pull.http_status}${push ? `, push ${push.http_status}` : ""}.`,
        pull,
        push,
        cacheAppliedCount: cacheApplyResult.appliedCount,
        cacheInsertedCount: cacheApplyResult.insertedCount,
        cacheUpdatedCount: cacheApplyResult.updatedCount,
        cacheIgnoredCount: cacheApplyResult.ignoredCount,
        creditCacheAppliedCount: creditCacheApplyResult.appliedCount,
        creditCacheUpdatedCount: creditCacheApplyResult.updatedCount,
        creditCacheIgnoredCount: creditCacheApplyResult.ignoredCount,
        eventCacheAppliedCount: eventCacheApplyResult.appliedCount,
        eventCacheInsertedCount: eventCacheApplyResult.insertedCount,
        eventCacheUpdatedCount: eventCacheApplyResult.updatedCount,
        eventCacheIgnoredCount: eventCacheApplyResult.ignoredCount,
        conflictCacheAppliedCount: conflictCacheApplyResult.appliedCount,
        conflictCacheInsertedCount: conflictCacheApplyResult.insertedCount,
        conflictCacheUpdatedCount: conflictCacheApplyResult.updatedCount,
        conflictCacheIgnoredCount: conflictCacheApplyResult.ignoredCount,
        rawTokenReturned: false,
        rawResponseReturned: false,
        credentialsSyncedToApp: false,
      })
    } catch (error) {
      setDesktopSyncExecution({
        status: "blocked",
        detail: `${desktopSyncErrorMessage(error)} Raw token and raw response body were not returned to the UI.`,
        cacheAppliedCount: 0,
        cacheInsertedCount: 0,
        cacheUpdatedCount: 0,
        cacheIgnoredCount: 0,
        creditCacheAppliedCount: 0,
        creditCacheUpdatedCount: 0,
        creditCacheIgnoredCount: 0,
        eventCacheAppliedCount: 0,
        eventCacheInsertedCount: 0,
        eventCacheUpdatedCount: 0,
        eventCacheIgnoredCount: 0,
        conflictCacheAppliedCount: 0,
        conflictCacheInsertedCount: 0,
        conflictCacheUpdatedCount: 0,
        conflictCacheIgnoredCount: 0,
        rawTokenReturned: false,
        rawResponseReturned: false,
        credentialsSyncedToApp: false,
      })
    }
  }

  function desktopSyncErrorMessage(error: unknown) {
    if (error instanceof Error && error.message.trim()) {
      return error.message.slice(0, 220)
    }

    if (typeof error === "string" && error.trim()) {
      return error.slice(0, 220)
    }

    return "Desktop sync failed before a sanitized response summary was returned."
  }

  async function handleTestWebsiteConnector() {
    const draftResult = buildConnectorProfileFromDraft(connectorDraft)

    setConnectorDraftIssues(draftResult.issues)

    if (!draftResult.profile) {
      setActiveSection("Settings")
      setConnectorManifestFetch({
        status: "error",
        detail: draftResult.issues.join(" "),
        sourceUrl: "",
      })
      setActivityMessage({
        title: "Connector draft needs details",
        detail: draftResult.issues.join(" "),
      })
      return
    }

    const sourceUrl = connectorManifestUrl(draftResult.profile)

    setConnectorManifestFetch({
      status: "loading",
      detail: "Fetching public connector manifest from WordPress.",
      sourceUrl,
      profileId: draftResult.profile.id,
    })

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(sourceUrl, {
        headers: {
          Accept: "application/json",
        },
        credentials: "omit",
        mode: "cors",
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(
          `Manifest endpoint returned HTTP ${response.status}. Confirm the plugin is installed and the public manifest route is active.`,
        )
      }

      let liveManifest: OfflineConnectorManifest

      try {
        liveManifest = await response.json() as OfflineConnectorManifest
      } catch {
        throw new Error("Manifest endpoint did not return JSON.")
      }

      const validation = validateConnectorManifest(liveManifest, {
        localSyncServerUrl: localSyncServerDisplayUrl(draftResult.profile),
      })
      const preparedRequest =
        preparedPairingRequests.find((request) => request.profileId === validation.profile.id) ??
        null
      const report = buildConnectorTestReport(validation.profile, validation, preparedRequest)
      const issueText =
        validation.issues.length > 0
          ? validation.issues.join(" ")
          : "Manifest shape is valid and credential values are not synced to the app."
      const importedAtLabel = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date())

      setConnectorValidation(validation)
      setConnectorTestReport(report)
      setConnectorManifestFetch({
        status: validation.status === "rejected" ? "error" : "success",
        detail:
          validation.status === "rejected"
            ? `Live manifest fetched but rejected. ${issueText}`
            : `Live manifest fetched and imported at ${importedAtLabel}.`,
        sourceUrl,
        profileId: validation.profile.id,
        importedAtLabel,
      })

      if (validation.status !== "rejected") {
        setConnectorProfiles((profiles) => upsertConnectorProfile(profiles, validation.profile))
        setActiveProfileId(validation.profile.id)
        setConnectorDraft(connectorProfileDraftFromProfile(validation.profile))
      }

      setActiveSection("Settings")
      setActivityMessage({
        title:
          validation.status === "accepted"
            ? "Live connector manifest accepted"
            : validation.status === "warning"
              ? "Live connector manifest needs review"
              : "Live connector manifest rejected",
        detail: `${validation.profile.companyName} ${validation.profile.environment} exposes ${validation.routeCount} offline routes. Connector test report is ${report.status}; ${issueText}`,
      })
    } catch (error) {
      const detail = connectorManifestFetchErrorMessage(error)
      const readinessGuidance = connectorManifestUnavailableGuidance(detail)
      const previewValidation = validateConnectorManifest(buildConnectorManifestPreview(draftResult.profile))
      const report = buildConnectorTestReport(draftResult.profile, previewValidation, null)

      setConnectorValidation(previewValidation)
      setConnectorTestReport(report)
      setConnectorManifestFetch({
        status: "error",
        detail: `${detail} ${readinessGuidance}`,
        sourceUrl,
        profileId: draftResult.profile.id,
      })
      setActiveSection("Settings")
      setActivityMessage({
        title: "Live connector manifest unavailable",
        detail: `${detail} ${readinessGuidance} Local profile validation still passed with ${previewValidation.routeCount} planned offline route(s).`,
      })
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  function connectorManifestFetchErrorMessage(error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "Connector manifest request timed out after 10 seconds."
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.slice(0, 220)
    }

    return "Connector manifest request failed before a public-safe response was received."
  }

  function handleValidateLocalConnectorPreview() {
    const validation = validateConnectorManifest(manifestPreview)
    const report = buildConnectorTestReport(
      activeProfile,
      validation,
      activePreparedPairingRequests[0] ?? null,
    )
    const issueText =
      validation.issues.length > 0
        ? validation.issues.join(" ")
        : "Manifest shape is valid and credential values are not synced to the app."

    setConnectorValidation(validation)
    setConnectorTestReport(report)
    setActiveSection("Settings")
    setActivityMessage({
      title:
        validation.status === "accepted"
          ? "Connector manifest accepted"
          : validation.status === "warning"
            ? "Connector manifest needs pairing review"
            : "Connector manifest rejected",
      detail: `${validation.profile.companyName} ${validation.profile.environment} exposes ${validation.routeCount} offline routes. Connector test report is ${report.status}; ${issueText}`,
    })
  }

  function handlePairingPreview() {
    const plan = buildDevicePairingRequestPlan(activeProfile, workspace.device, pairingCode)
    const preparedRequest = buildPreparedDevicePairingRequest(plan)
    const requestBody = buildDevicePairingRequestBody(plan, pairingCode)

    setPairingPlan(plan)
    if (preparedRequest) {
      setPreparedPairingRequests((requests) => [
        preparedRequest,
        ...requests.filter(
          (request) =>
            request.profileId !== preparedRequest.profileId ||
            request.pairingCodeFingerprint !== preparedRequest.pairingCodeFingerprint,
        ),
      ].slice(0, 6))
      setPairingCode("")
      setConnectorTestReport(
        buildConnectorTestReport(activeProfile, validateConnectorManifest(manifestPreview), preparedRequest),
      )
    }
    setActiveSection("Settings")
    setActivityMessage({
      title: plan.pairingCodeProvided ? "Pairing request prepared" : "Pairing code required",
      detail: plan.pairingCodeProvided
        ? `${plan.companyName} device registration is shaped for ${plan.path} with ${requestBody?.requested_scopes.length ?? 0} requested scopes; the raw manager code was cleared and future tokens stay in ${plan.tokenStorage}.`
        : "Enter the manager-issued pairing code from WordPress before this device can request a scoped offline token.",
    })
  }

  async function handleCheckPairingRoute() {
    const plan = buildDevicePairingRequestPlan(activeProfile, workspace.device, pairingCode)
    const endpoint = `${plan.siteUrl}/wp-json/`
    const routeKey = plan.path.replace("/wp-json", "")
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 10000)

    setPairingPlan(plan)
    setPairingRouteCheck({
      status: "loading",
      endpoint,
      method: "GET",
      detail: "Checking the WordPress REST route index without transmitting the raw manager code.",
      rawPairingCodeTransmitted: false,
      credentialsSyncedToApp: false,
    })

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        credentials: "omit",
        mode: "cors",
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(
          `WordPress REST index returned HTTP ${response.status}. Confirm REST access is available for this site.`,
        )
      }

      let routeIndex: { routes?: Record<string, unknown> }

      try {
        routeIndex = await response.json() as { routes?: Record<string, unknown> }
      } catch {
        throw new Error("WordPress REST index did not return JSON.")
      }

      if (!routeIndex.routes || typeof routeIndex.routes !== "object" || !routeIndex.routes[routeKey]) {
        throw new Error(
          `Pairing route ${routeKey} is not registered. Confirm the plugin is active and the staging pairing route gate is enabled.`,
        )
      }

      setPairingRouteCheck({
        status: "ready",
        endpoint,
        method: "GET",
        detail:
          "Pairing route is present in the WordPress REST index. Raw manager code was not transmitted; Pair Device can request and store the token in the desktop shell.",
        rawPairingCodeTransmitted: false,
        credentialsSyncedToApp: false,
      })
      setActivityMessage({
        title: "Pairing route reachable",
        detail:
          "The website pairing route is present in the credential-free REST index. Use Pair Device from the desktop shell to request the scoped token.",
      })
    } catch (error) {
      const detail = pairingRouteCheckErrorMessage(error)

      setPairingRouteCheck({
        status: "blocked",
        endpoint,
        method: "GET",
        detail,
        rawPairingCodeTransmitted: false,
        credentialsSyncedToApp: false,
      })
      setActivityMessage({
        title: "Pairing route unavailable",
        detail: `${detail} No raw pairing code or token was sent.`,
      })
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  function pairingRouteCheckErrorMessage(error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "Pairing route index check timed out after 10 seconds."
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.slice(0, 220)
    }

    return "Pairing route check failed before a public route response was received."
  }

  async function handlePairDevice() {
    const plan = buildDevicePairingRequestPlan(activeProfile, workspace.device, pairingCode)
    const requestBody = buildDevicePairingRequestBody(plan, pairingCode)
    const endpoint = `${plan.siteUrl}${plan.path}`

    setPairingPlan(plan)

    if (!requestBody) {
      setPairingTokenRequest({
        status: "blocked",
        endpoint,
        method: "POST",
        detail: "Enter the manager-issued pairing code before requesting a desktop device token.",
        rawPairingCodeTransmitted: false,
        rawTokenReturned: false,
        credentialsSyncedToApp: false,
      })
      setActivityMessage({
        title: "Pairing code required",
        detail: "No pairing request was sent and no credentials were stored.",
      })
      return
    }

    if (!devicePairingAdapter) {
      setPairingTokenRequest({
        status: "blocked",
        endpoint,
        method: "POST",
        detail:
          "Desktop pairing requires the Tauri Windows shell so the one-time token never returns to the browser UI.",
        rawPairingCodeTransmitted: false,
        rawTokenReturned: false,
        credentialsSyncedToApp: false,
      })
      setActivityMessage({
        title: "Desktop secure store unavailable",
        detail:
          "Open the Windows desktop shell to pair this connector. Browser preview cannot request or store device tokens.",
      })
      return
    }

    if (activeProfile.environment === "production") {
      setPairingTokenRequest({
        status: "blocked",
        endpoint,
        method: "POST",
        detail:
          "Production device pairing is manually gated; use the LAN sync server until production device-token issuance is approved.",
        rawPairingCodeTransmitted: false,
        rawTokenReturned: false,
        credentialsSyncedToApp: false,
      })
      setActivityMessage({
        title: "Production pairing blocked",
        detail: "No production token request was sent; LAN sync can still use the configured website connector.",
      })
      return
    }

    setPairingTokenRequest({
      status: "loading",
      endpoint,
      method: "POST",
      detail: "Sending the one-time pairing request through the Tauri desktop command.",
      rawPairingCodeTransmitted: true,
      rawTokenReturned: false,
      credentialsSyncedToApp: false,
    })

    try {
      const result = await devicePairingAdapter.pairOfflineDevice({
        endpoint,
        profile_id: activeProfile.id,
        body: requestBody,
      })
      const preparedRequest = buildPreparedDevicePairingRequest(plan)
      const pairedProfile = {
        ...activeProfile,
        status: "ready" as const,
      }
      const pairedRecord = buildPairedDeviceRecord(pairedProfile, {
        devicePublicId: result.device_public_id,
        requestedScopes: plan.requestedScopes,
        tokenStatus: result.token_persisted ? "stored" : "missing",
        tokenLength: result.token_length,
        expiresAtUtc: result.expires_at_utc,
      })

      if (preparedRequest) {
        setPreparedPairingRequests((requests) => [
          preparedRequest,
          ...requests.filter((request) => request.profileId !== preparedRequest.profileId),
        ].slice(0, 6))
      }

      setConnectorProfiles((profiles) => upsertConnectorProfile(profiles, pairedProfile))
      setPairedDevices((records) => [
        pairedRecord,
        ...records.filter((record) => record.profileId !== pairedRecord.profileId),
      ].slice(0, 16))
      setConnectorTestReport(
        buildConnectorTestReport(
          pairedProfile,
          validateConnectorManifest(manifestPreview),
          preparedRequest,
        ),
      )
      setPairingCode("")
      setPairingTokenRequest({
        status: "stored",
        endpoint,
        method: "POST",
        detail: `Device ${result.device_public_id} paired; token length ${result.token_length} stored in ${result.persistence_mode}.`,
        rawPairingCodeTransmitted: true,
        rawTokenReturned: result.raw_token_returned,
        credentialsSyncedToApp: result.credentials_synced_to_app,
      })
      setActivityMessage({
        title: "Device paired",
        detail: `${activeProfile.companyName} returned a one-time device token that was stored by the desktop secure-store command; paired metadata saved locally and raw token returned to UI: no.`,
      })
    } catch (error) {
      const detail = pairingTokenRequestErrorMessage(error)

      setPairingTokenRequest({
        status: "blocked",
        endpoint,
        method: "POST",
        detail,
        rawPairingCodeTransmitted: true,
        rawTokenReturned: false,
        credentialsSyncedToApp: false,
      })
      setActivityMessage({
        title: "Device pairing blocked",
        detail: `${detail} The pairing code was not stored and no token was persisted.`,
      })
    }
  }

  function pairingTokenRequestErrorMessage(error: unknown) {
    if (error instanceof Error && error.message.trim()) {
      return error.message.slice(0, 220)
    }

    if (typeof error === "string" && error.trim()) {
      return error.slice(0, 220)
    }

    return "Desktop pairing failed before a secret-free status response was returned."
  }

  function handleAddScan() {
    if (!addScanTarget) {
      setActivityMessage({
        title: "Scan needs one match",
        detail:
          "Enter an exact barcode or public inventory ID, or narrow search to one cached card before adding a scan.",
      })
      return
    }

    setSelectedId(addScanTarget.id)
    setQuery(addScanTarget.barcode)
    void handleStageInventoryUpdate(
      "Scan staged",
      {
        operationKind: "scan",
        syncIntent: "staff_barcode_scan",
        adjustmentReason: "scan-to-queue shortcut",
      },
      `${addScanTarget.barcode} scanned into the local queue for ${activeProfile.companyName}; website push remains deferred until device pairing approval.`,
      addScanTarget,
    )
  }

  function handlePrintLabel() {
    const labelJob = buildOfflineLabelPrintJob(selectedItem, activeProfile)
    const labelDetail =
      `${labelJob.cardName} label ${labelJob.barcode} is ready for ${activeProfile.companyName}; ` +
      "payload can be copied now and hardware printing remains deferred until the printer adapter is connected."

    setLabelPrintJobs((jobs) => [
      labelJob,
      ...jobs.filter((job) => job.inventoryPublicId !== labelJob.inventoryPublicId),
    ].slice(0, 4))
    setActiveSection("Inventory")
    setActivityMessage({
      title: "Label preview prepared",
      detail: labelDetail,
    })
  }

  function moveConflictToReviewed(conflict: ConflictItem) {
    setOpenConflicts((conflicts) => conflicts.filter((item) => item.conflictId !== conflict.conflictId))
    setReviewedConflicts((conflicts) => [conflict, ...conflicts])
    setShowConflictHistory(true)
  }

  async function runLiveConflictResolution(conflict: ConflictItem) {
    if (
      activeProfile.environment === "production" ||
      !activePairedDevice ||
      activePairedDevice.tokenStatus !== "stored" ||
      !offlineSyncAdapter
    ) {
      return null
    }

    const body = buildOfflineConflictResolutionRequestBody(
      conflict,
      activePairedDevice.devicePublicId,
      { managerId: workspace.device.managerId },
    )

    try {
      const response = await offlineSyncAdapter.runOfflineSyncRequest({
        endpoint: connectorOfflineConflictResolutionUrl(activeProfile, conflict.conflictId),
        route: "conflict_resolution",
        profile_id: activeProfile.id,
        device_public_id: activePairedDevice.devicePublicId,
        body,
        idempotency_key: body.resolution_id,
      })

      return { body, response }
    } catch (error) {
      return {
        body,
        response: null,
        error: conflictResolutionErrorMessage(error),
      }
    }
  }

  function conflictResolutionErrorMessage(error: unknown) {
    if (error instanceof Error && error.message.trim()) {
      return error.message.slice(0, 220)
    }

    if (typeof error === "string" && error.trim()) {
      return error.slice(0, 220)
    }

    return "Conflict resolution failed before a sanitized response summary was returned."
  }

  async function handleConflictAction(conflict: ConflictItem) {
    setSelectedConflictTitle(conflict.title)

    const liveResolution = await runLiveConflictResolution(conflict)

    if (
      liveResolution?.response?.status === "offline_sync_request_completed" &&
      liveResolution.response.wordpress_code === "offline_conflict_resolution_applied"
    ) {
      moveConflictToReviewed(conflict)
      setActiveSection("Conflicts")
      setActivityMessage({
        title: "Conflict resolved on website",
        detail: `${conflict.title} was resolved through ${activeProfile.companyName}; row version ${conflict.rowVersion} was accepted without returning a raw response body.`,
      })
      return
    }

    if (liveResolution?.response && liveResolution.response.http_status >= 400) {
      setActiveSection("Conflicts")
      setActivityMessage({
        title: "Conflict still needs review",
        detail: `${conflict.title} was not changed on the website: ${liveResolution.response.http_status} ${liveResolution.response.wordpress_code}. The conflict remains open locally so staff can sync the latest snapshot and retry.`,
      })
      return
    }

    await stageOfflineOperation(
      buildConflictReviewOperation(
        conflict,
        activePairedDevice
          ? {
              actorId: workspace.device.managerId,
              deviceId: activePairedDevice.devicePublicId,
              locationId: workspace.device.locationId,
            }
          : {
              actorId: workspace.device.managerId,
              locationId: workspace.device.locationId,
            },
      ),
      `${conflict.action} conflict staged`,
      liveResolution?.error
        ? `${liveResolution.error} ${conflict.title} is queued locally for staff review and later website sync acceptance.`
        : `${conflict.title} is queued for staff review. Resolution writes stay deferred until manager approval and website sync acceptance.`,
    )
    moveConflictToReviewed(conflict)
  }

  function renderOperationSyncVisibilityPanel() {
    return (
      <section className="sync-visibility-panel" aria-label="Operation sync visibility">
        <div className="sync-visibility-heading">
          <div>
            <span className="micro-label">Operation sync visibility</span>
            <strong>WordPress push vs local queue</strong>
          </div>
          <span>{operationSyncVisibilitySummary}</span>
        </div>
        <div className="sync-visibility-grid">
          {operationSyncVisibilityRows.map((row) => (
            <article className={`sync-visibility-row ${row.tone}`} key={row.id}>
              <div className="sync-visibility-row-head">
                <span>{row.label}</span>
                <strong>{row.countLabel}</strong>
              </div>
              <div className="sync-visibility-path">
                <span>WordPress</span>
                <small>{row.wordpressStatus}</small>
              </div>
              <div className="sync-visibility-path">
                <span>Local queue</span>
                <small>{row.localStatus}</small>
              </div>
              <p>{row.detail}</p>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (!sessionIsUnlocked) {
    return (
      <main className="offline-shell login-shell">
        <div className="app-window-bar" aria-label="Desktop app window">
          <div className="window-brand">
            <img src={thePugBrandLogo} alt="" />
            <span>The Pug Offline</span>
          </div>
          <div className="window-controls" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
        <section className="login-workspace" aria-label="Offline app login">
          <div className="login-card">
            <img src={thePugBrandLogo} alt="" />
            <span className="micro-label">Website-connected local app</span>
            <h1>Enter PIN</h1>
            <div className="login-fields">
              <label>
                <span className="micro-label">4-digit staff or manager PIN</span>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  type="password"
                  value={loginPin}
                  onChange={(event) => {
                    setLoginIssue("")
                    setLoginPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handlePinLogin()
                    }
                  }}
                  placeholder="----"
                  autoFocus
                />
              </label>
              <div>
                <span className="micro-label">Session timeout</span>
                <strong>{sessionTimeoutMinutes} minutes</strong>
                <small>Managers can adjust this in Users & Access.</small>
              </div>
            </div>
            <div className="pin-display" aria-live="polite">
              <span>{"*".repeat(loginPin.length).padEnd(4, "-")}</span>
              {loginIssue ? <small>{loginIssue}</small> : <small>Use your manager-issued PIN.</small>}
            </div>
            <div className="pin-pad" aria-label="PIN keypad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button type="button" key={digit} onClick={() => handlePinDigit(digit)}>
                  {digit}
                </button>
              ))}
              <button type="button" onClick={() => setLoginPin((pin) => pin.slice(0, -1))}>
                Del
              </button>
              <button type="button" onClick={() => handlePinDigit("0")}>
                0
              </button>
              <button type="button" onClick={() => void handlePinLogin()}>
                Go
              </button>
            </div>
            <div className="login-actions">
              <button
                type="button"
                onClick={() => void handlePinLogin()}
              >
                <Icon name="check" />
                <span>Unlock App</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginPin("")
                  setLoginIssue("")
                }}
              >
                <Icon name="trash" />
                <span>Clear PIN</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="offline-shell">
      <div className="app-window-bar" aria-label="Desktop app window">
        <div className="window-brand">
          <img src={thePugBrandLogo} alt="" />
          <span>The Pug Offline</span>
        </div>
        <div className="window-controls" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="app-layout">
        <aside className="nav-rail" aria-label="Offline app sections">
          <div className="brand-lockup">
            <img className="brand-crest" src={thePugBrandLogo} alt="" />
            <span>
              <strong>The Pug</strong>
              <small>Cards, Games & More</small>
            </span>
          </div>
          <nav>
            {workspace.navItems.map((item) => (
              <button
                className={[
                  "nav-item",
                  item.label === activeSection ? "is-active" : "",
                  canAccessSection(item.label) ? "" : "is-locked",
                ].filter(Boolean).join(" ")}
                type="button"
                aria-label={item.label}
                disabled={!canAccessSection(item.label)}
                key={item.label}
                onClick={() => handleNavSelection(item.label)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.label === "Queue" ? <strong>{queueBadgeCount}</strong> : null}
                {item.label === "Events" ? <strong>{eventBadgeCount}</strong> : null}
                {item.label === "Conflicts" ? <strong>{conflictBadgeCount}</strong> : null}
              </button>
            ))}
          </nav>
          <div className="route-stack" aria-label="Sync endpoints">
            {workspace.syncRoutes.map((route) => (
              <span key={route}>{route.replace("/wp-json/tcg-store/v1", "")}</span>
            ))}
          </div>
          <div className="local-db-card">
            <Icon name="database" />
            <span>LAN Sync Server</span>
            <strong>{localSyncClient.serverUrl}</strong>
            <small>
              {localSyncStatus?.status === "ok"
                ? `${localSyncStatus.local_database}; queue ${localSyncStatus.queue_depth}; ${localSyncPullStatusLabel}; push ${localSyncStatus.wordpress_push_connected ? "on" : "off"}`
                : "store-sync.sqlite; check server"}
            </small>
          </div>
        </aside>

        <section className="workspace">
          <header className="top-bar">
            <div className="title-stack">
              <span className="micro-label">
                {workspace.device.storeLabel} / {activeProfile.environment}
              </span>
              <h1>Offline Inventory Command</h1>
            </div>
            <div className="top-actions" aria-label="Offline sync status">
              <button className="site-setup-card" type="button" onClick={handleOpenWebsiteSetup}>
                <span>Website</span>
                <strong>{activeProfile.companyName}</strong>
                <small>{connectorDisplayUrl(activeProfile)}</small>
              </button>
              <div className="connection-pill" aria-label="Offline mode active">
                <Icon name="wifi" />
                <span>{workspace.device.modeLabel}</span>
              </div>
              <div className="sync-time">
                <span>Last sync</span>
                <strong>{workspace.device.lastSyncLabel}</strong>
              </div>
              <button
                className="sync-now"
                type="button"
                disabled={syncNowInFlight}
                onClick={() => void handleSyncNowPreview()}
              >
                <Icon name="sync" />
                <span>{syncNowInFlight ? "Syncing" : "Sync Now"}</span>
              </button>
              <button className="session-lock" type="button" onClick={handleLockSession}>
                <Icon name="history" />
                <span>{activeOfflineUser?.name ?? "Session"}</span>
                <small>Lock App</small>
              </button>
            </div>
          </header>

          <section className="sync-strip" aria-label="Sync summary">
            {syncSummaryItems.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </section>

          <section className="active-workspace-pill" aria-label="Active workspace">
            <span className="micro-label">Active workspace</span>
            <strong>{activeSection}</strong>
          </section>

          <section
            className={activeSection === "Status" ? "status-workspace" : "status-workspace is-hidden"}
            aria-label="Status activity"
            ref={statusPanelRef}
          >
            <section className="workflow-status" aria-live="polite" ref={workflowPanelRef}>
              <div>
                <span className="micro-label">Active workspace</span>
                <strong>{activeSection}</strong>
              </div>
              <p>
                <b>{activityMessage.title}</b>
                {activityMessage.detail}
              </p>
            </section>

            <section className="status-dashboard" aria-label="Live system status">
              <header className="status-dashboard-heading">
                <div>
                  <span className="micro-label">Live system status</span>
                  <strong>Website, catalog, queue, and local cache</strong>
                </div>
                <span>Online-first with offline fallback</span>
              </header>
              <div className="status-summary-grid">
                {statusSummaryCards.map((card) => (
                  <article className={`status-summary-card ${card.tone}`} key={card.id}>
                    <div>
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                    </div>
                    <p>{card.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="status-timeline" aria-label="Status message center">
              <header className="status-dashboard-heading">
                <div>
                  <span className="micro-label">Status message center</span>
                  <strong>Latest operational messages</strong>
                </div>
                <span>{countLabel(statusTimelineEntries.length, "tracked signal")}</span>
              </header>
              <div className="status-timeline-list">
                {statusTimelineEntries.map((entry) => (
                  <article className={`status-timeline-entry ${entry.tone}`} key={entry.id}>
                    <span className="status-timeline-dot" aria-hidden="true" />
                    <div>
                      <strong>{entry.title}</strong>
                      <p>{entry.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

          {renderOperationSyncVisibilityPanel()}

          {syncSessionPlan ? (
            <section className="sync-session-panel" aria-label="Website sync session plan">
              <div>
                <span className="micro-label">Website connector</span>
                <strong>{syncSessionPlan.companyName}</strong>
                <small>{syncSessionPlan.siteUrl}</small>
              </div>
              <div>
                <span className="micro-label">Pull route</span>
                <strong>{syncSessionPlan.pull.path.replace(syncSessionPlan.restBasePath, "")}</strong>
                <small>{syncSessionPlan.pull.url}</small>
              </div>
              <div>
                <span className="micro-label">Push route</span>
                <strong>{syncSessionPlan.push.operation_count} operation(s)</strong>
                <small>{syncSessionPlan.push.url}</small>
              </div>
              <div>
                <span className="micro-label">Inventory writes</span>
                <strong>
                  {syncSessionPlan.push.canonical_inventory_writes_deferred
                    ? "Deferred"
                    : "Guarded holds ready"}
                </strong>
                <small>
                  {syncSessionPlan.push.canonical_inventory_operation_count} hold op(s);
                  route {syncSessionPlan.push.route_connected_push_ready ? "ready" : "gated"};
                  execution {syncSessionPlan.push.canonical_inventory_execution_enabled ? "enabled" : "off"}
                </small>
              </div>
              <div>
                <span className="micro-label">Pairing</span>
                <strong>
                  {syncSessionPlan.paired_device_available
                    ? syncSessionPlan.desktop_token_available
                      ? "Paired token stored"
                      : "Paired token missing"
                    : syncSessionPlan.prepared_pairing_available
                      ? "Prepared locally"
                      : "Required"}
                </strong>
                <small>
                  {syncSessionPlan.paired_device_available
                    ? `Device ${syncSessionPlan.paired_device_public_id}; token ${syncSessionPlan.desktop_token_status}; storage ${syncSessionPlan.device_token_storage}`
                    : syncSessionPlan.prepared_pairing_available
                      ? `Fingerprint ${syncSessionPlan.pairing_code_fingerprint}; token storage ${syncSessionPlan.device_token_storage}`
                      : `No token request yet; token storage ${syncSessionPlan.device_token_storage}`}
                </small>
              </div>
            </section>
          ) : null}

          {desktopSyncExecution.status !== "idle" ? (
            <section className="desktop-sync-panel" aria-label="Desktop sync execution">
              <div>
                <span className="micro-label">Desktop sync execution</span>
                <strong>
                  {desktopSyncExecution.status === "loading"
                    ? "Running"
                    : desktopSyncExecution.status === "synced"
                      ? "Completed"
                      : desktopSyncExecution.status === "blocked"
                        ? "Blocked"
                        : "Preview only"}
                </strong>
                <small>{desktopSyncExecution.detail}</small>
              </div>
              <div>
                <span className="micro-label">Pull summary</span>
                <strong>
                  {desktopSyncExecution.pull
                    ? `${desktopSyncExecution.pull.pull_record_count} record(s)`
                    : "Not executed"}
                </strong>
                <small>
                  {desktopSyncExecution.pull
                    ? `${desktopSyncExecution.pull.http_status} ${desktopSyncExecution.pull.wordpress_code}; ${desktopSyncExecution.pull.cursor_count} cursor(s)`
                    : "Requires desktop shell and stored device token."}
                </small>
              </div>
              <div>
                <span className="micro-label">Push summary</span>
                <strong>
                  {desktopSyncExecution.push
                    ? `${desktopSyncExecution.push.accepted_count} accepted`
                    : "No push result"}
                </strong>
                <small>
                  {desktopSyncExecution.push
                    ? `${desktopSyncExecution.push.http_status} ${desktopSyncExecution.push.wordpress_code}; ${desktopSyncExecution.push.conflict_count} conflict(s), ${desktopSyncExecution.push.rejected_count} rejected`
                    : "Runs only when local queued operations exist."}
                </small>
              </div>
              <div>
                <span className="micro-label">Cache apply</span>
                <strong>
                  {desktopSyncExecution.cacheAppliedCount} inventory;
                  {desktopSyncExecution.creditCacheAppliedCount} credit;
                  {desktopSyncExecution.eventCacheAppliedCount} event;
                  {desktopSyncExecution.conflictCacheAppliedCount} conflict
                </strong>
                <small>
                  {desktopSyncExecution.cacheInsertedCount} inserted;
                  {desktopSyncExecution.cacheUpdatedCount} updated;
                  {desktopSyncExecution.cacheIgnoredCount} ignored as stale.
                </small>
                <small>
                  Credit: {desktopSyncExecution.creditCacheUpdatedCount} updated;
                  {desktopSyncExecution.creditCacheIgnoredCount} ignored as stale/unmatched.
                </small>
                <small>
                  Events: {desktopSyncExecution.eventCacheInsertedCount} inserted;
                  {desktopSyncExecution.eventCacheUpdatedCount} updated;
                  {desktopSyncExecution.eventCacheIgnoredCount} ignored as stale.
                </small>
                <small>
                  Conflicts: {desktopSyncExecution.conflictCacheInsertedCount} inserted;
                  {desktopSyncExecution.conflictCacheUpdatedCount} updated;
                  {desktopSyncExecution.conflictCacheIgnoredCount} ignored as stale.
                </small>
              </div>
              <div>
                <span className="micro-label">Credential boundary</span>
                <strong>Raw secrets hidden</strong>
                <small>
                  raw token returned: no; raw response returned: no; credentials synced to app: no.
                </small>
              </div>
            </section>
          ) : null}

          {pullRefreshPreview ? (
            <section className="pull-refresh-panel" aria-label="Pull refresh preview">
              <div>
                <span className="micro-label">Pull refresh</span>
                <strong>{pullRefreshPreview.companyName}</strong>
                <small>
                  Cursor {pullRefreshPreview.pullCursor}; network deferred at{" "}
                  {pullRefreshPreview.generatedAtLabel}
                </small>
              </div>
              <div>
                <span className="micro-label">Local cache</span>
                <strong>{pullRefreshPreview.inventoryRowsRefreshed} inventory row(s)</strong>
                <small>
                  {pullRefreshPreview.customerCreditRowsRefreshed} credit row;
                  {pullRefreshPreview.eventRowsRefreshed} event row(s);
                  {pullRefreshPreview.conflictRowsRefreshed} conflict row(s)
                </small>
              </div>
              <div>
                <span className="micro-label">Queued ops preserved</span>
                <strong>{pullRefreshPreview.queuedOperationsPreserved}</strong>
                <small>
                  {pullRefreshPreview.changedInventoryPublicIds.length > 0
                    ? pullRefreshPreview.changedInventoryPublicIds.join(", ")
                    : "No accepted inventory rows changed."}
                </small>
              </div>
            </section>
          ) : null}

          {syncAttempts.length > 0 ? (
            <section className="sync-attempt-list sync-attempt-panel" aria-label="Local sync attempts">
              <span className="micro-label">Local sync attempts</span>
              {syncAttempts.map((attempt) => (
                <article key={attempt.id}>
                  <strong>{attempt.companyName}</strong>
                  <span>
                    {attempt.operationCount} op(s) / {attempt.pairingStatus}
                  </span>
                  <small>
                    {attempt.createdAtLabel}; {attempt.networkStatus}; {attempt.siteUrl}
                  </small>
                </article>
              ))}
            </section>
          ) : null}
          </section>

          <section className={`content-grid is-paged page-${activeSection.toLowerCase()}`}>
            <section className="inventory-panel" aria-label="Offline inventory" ref={inventoryPanelRef}>
              <div className="scanner-row">
                <label htmlFor="offline-search">
                  <Icon name="scan" />
                  <span>Scan or search</span>
                </label>
                <div className="search-box">
                  <Icon name="search" />
                  <input
                    id="offline-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        handleAddScan()
                      }
                    }}
                    placeholder="Barcode, card, set, or location"
                  />
                  <span className="scan-beam" aria-hidden="true" />
                </div>
                <button
                  className={filtersOpen ? "filter-button is-active" : "filter-button"}
                  type="button"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  Filters
                </button>
                <button
                  className={viewMode === "grid" ? "icon-button is-active" : "icon-button"}
                  type="button"
                  aria-label="Grid view"
                  onClick={() => setViewMode("grid")}
                >
                  <Icon name="grid" />
                </button>
                <button
                  className={viewMode === "list" ? "icon-button is-active" : "icon-button"}
                  type="button"
                  aria-label="List view"
                  onClick={() => setViewMode("list")}
                >
                  <Icon name="list" />
                </button>
                <button type="button" onClick={handleAddScan}>
                  <Icon name="plus" />
                  <span>Add Scan</span>
                </button>
                <div className={`inventory-search-status ${lanInventorySearchStatus}`}>
                  <span className="micro-label">Local database search</span>
                  <strong>
                    {lanInventorySearchStatus === "searching"
                      ? "Checking LAN"
                      : lanInventorySearchStatus === "ready"
                        ? "LAN cache synced"
                        : lanInventorySearchStatus === "blocked"
                          ? "Device cache fallback"
                          : "Ready"}
                  </strong>
                  <small>{lanInventorySearchDetail}</small>
                </div>
              </div>

              {filtersOpen ? (
                <div className="filter-tray" aria-label="Inventory filters">
                  {INVENTORY_STATUS_FILTERS.map((status) => (
                    <button
                      type="button"
                      className={statusFilter === status ? "is-active" : ""}
                      onClick={() => setStatusFilter(status)}
                      key={status}
                    >
                      {status === "all" ? "All" : statusLabel(status)}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="inventory-intake-control" aria-label="Local inventory intake">
                <div className="scrydex-lookup-control" aria-label="ScryDex card lookup">
                  <label htmlFor="scrydex-card-query">
                    <span className="micro-label">Card catalog lookup</span>
                    <input
                      id="scrydex-card-query"
                      value={scryDexQuery}
                      onChange={(event) => setScryDexQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          void handleScryDexLookup()
                        }
                      }}
                      placeholder="Charizard, set, or number"
                    />
                  </label>
                  <label htmlFor="scrydex-game">
                    <span className="micro-label">Game</span>
                    <select
                      id="scrydex-game"
                      value={scryDexGame}
                      onChange={(event) => setScryDexGame(event.target.value as LocalSyncScryDexCard["game"])}
                    >
                      <option value="pokemon">Pokemon</option>
                      <option value="magic">Magic</option>
                      <option value="lorcana">Lorcana</option>
                      <option value="one-piece">One Piece</option>
                    </select>
                  </label>
                  <div>
                    <span className="micro-label">Reference</span>
                    <strong>
                      {scryDexLookupStatus === "searching"
                        ? "Searching"
                        : scryDexLookupStatus === "ready"
                          ? "Ready"
                          : scryDexLookupStatus === "blocked"
                            ? "Blocked"
                            : "Idle"}
                    </strong>
                    <small>{scryDexLookupDetail}</small>
                    <button type="button" onClick={() => void handleScryDexLookup()}>
                      <Icon name="search" />
                      <span>Search Catalog</span>
                    </button>
                  </div>
                  {scryDexCards.length > 0 ? (
                    <div className="scrydex-result-list" aria-label="ScryDex card results">
                      {scryDexCards.map((card) => (
                        <article
                          className={
                            card.provider_card_id === selectedScryDexCardId
                              ? "is-selected"
                              : ""
                          }
                          key={card.provider_card_id}
                        >
                          <div className="scrydex-card-art" aria-hidden="true">
                            {card.image_url ? (
                              <img alt="" src={card.image_url} loading="lazy" />
                            ) : (
                              <Icon name="card" />
                            )}
                          </div>
                          <div>
                            <strong>{card.card_name}</strong>
                            <small>
                              {card.set_name} - {card.printed_number}
                            </small>
                            <span className="market-price">
                              {formatMoney(card.market_price_minor_units, card.currency)} market;
                              {" "}
                              {card.stock_available_count} in stock
                            </span>
                            <small>
                              {card.stock_by_condition.length > 0
                                ? card.stock_by_condition
                                    .map((entry) => `${entry.condition} x${entry.quantity}`)
                                    .join(", ")
                                : "No local copies cached yet"}
                            </small>
                            <small>
                              {card.variants.length > 0
                                ? card.variants.slice(0, 3).map(formatScryDexVariant).join(", ")
                                : "Version details pending"}
                            </small>
                          </div>
                          <button type="button" onClick={() => handleUseScryDexCard(card)}>
                            <Icon name="check" />
                            <span>Use Card</span>
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {selectedScryDexCard ? (
                    <section className="selected-scrydex-preview" aria-label="Selected catalog card for intake">
                      <div className="selected-scrydex-preview__art" aria-hidden="true">
                        {selectedScryDexImageUrl ? (
                          <img src={selectedScryDexImageUrl} alt="" loading="lazy" />
                        ) : (
                          <Icon name="card" />
                        )}
                      </div>
                      <div className="selected-scrydex-preview__body">
                        <div>
                          <span className="micro-label">Selected catalog card</span>
                          <strong>{selectedScryDexCard.card_name}</strong>
                          <small>
                            {selectedScryDexCard.set_name} {selectedScryDexCard.printed_number}
                          </small>
                        </div>
                        <div className="selected-scrydex-preview__meta">
                          <span>
                            <strong>Source</strong>
                            {selectedScryDexSourceLabel}
                          </span>
                          <span>
                            <strong>Stock</strong>
                            {selectedScryDexCard.stock_available_count} available; {selectedScryDexStockLabel}
                          </span>
                          <span>
                            <strong>Queue</strong>
                            {selectedScryDexIntakeSummary}
                          </span>
                        </div>
                        {selectedScryDexCard.variants.length > 0 ? (
                          <label htmlFor="scrydex-variant-select" className="selected-scrydex-preview__variant-select">
                            <span className="micro-label">Version</span>
                            <select
                              id="scrydex-variant-select"
                              value={selectedScryDexVariantId}
                              onChange={(event) => handleScryDexVariantChange(event.target.value)}
                            >
                              {selectedScryDexCard.variants.map((variant, index) => {
                                const variantId = scryDexVariantId(
                                  selectedScryDexCard.provider_card_id,
                                  variant,
                                  index,
                                )
                                const label = formatScryDexVariant(variant) || `Version ${index + 1}`

                                return (
                                  <option key={variantId} value={variantId}>
                                    {label}
                                  </option>
                                )
                              })}
                            </select>
                            <small>{selectedScryDexVariantLabel}</small>
                          </label>
                        ) : null}
                        <div className="selected-scrydex-preview__pill-row">
                          <span>{selectedScryDexCard.provider_card_id}</span>
                          {selectedScryDexVariantLabels.length > 0 ? (
                            selectedScryDexVariantLabels.map((label) => <span key={label}>{label}</span>)
                          ) : (
                            <span>Variant details pending</span>
                          )}
                        </div>
                        <small className="selected-scrydex-preview__path">
                          {scryDexLookupOrderLabel}
                        </small>
                      </div>
                    </section>
                  ) : null}
                </div>
                <label htmlFor="intake-card-name">
                  <span className="micro-label">Card name</span>
                  <input
                    id="intake-card-name"
                    value={intakeCardName}
                    onChange={(event) => setIntakeCardName(event.target.value)}
                    placeholder="Card name"
                  />
                </label>
                <label htmlFor="intake-set-name">
                  <span className="micro-label">Set</span>
                  <input
                    id="intake-set-name"
                    value={intakeSetName}
                    onChange={(event) => setIntakeSetName(event.target.value)}
                    placeholder="Set name"
                  />
                </label>
                <label htmlFor="intake-condition">
                  <span className="micro-label">Condition</span>
                  <select
                    id="intake-condition"
                    value={intakeCondition}
                    onChange={(event) => handleIntakeConditionChange(event.target.value)}
                  >
                    <option value="NM">Near Mint</option>
                    <option value="LP">Lightly Played</option>
                    <option value="MP">Moderately Played</option>
                    <option value="HP">Heavily Played</option>
                    <option value="DMG">Damaged</option>
                    <option value="RAW">Raw</option>
                  </select>
                </label>
                <label htmlFor="intake-quantity">
                  <span className="micro-label">Quantity</span>
                  <input
                    id="intake-quantity"
                    inputMode="numeric"
                    min="1"
                    max="200"
                    type="number"
                    value={intakeQuantityInput}
                    onBlur={() => {
                      if (intakeQuantity !== null) {
                        setIntakeQuantityInput(String(intakeQuantity))
                      }
                    }}
                    onChange={(event) => setIntakeQuantityInput(event.target.value)}
                  />
                </label>
                <label htmlFor="intake-barcode">
                  <span className="micro-label">Barcode</span>
                  <input
                    id="intake-barcode"
                    value={intakeBarcode}
                    onChange={(event) => setIntakeBarcode(event.target.value)}
                    placeholder="Auto if blank"
                  />
                </label>
                <label htmlFor="intake-price">
                  <span className="micro-label">Price</span>
                  <input
                    id="intake-price"
                    inputMode="decimal"
                    value={intakePriceInput}
                    onBlur={() => {
                      const parsed = creditRedemptionInputToMinorUnits(intakePriceInput)

                      if (parsed !== null) {
                        setIntakePriceInput(creditRedemptionInputFromMinorUnits(parsed))
                      }
                    }}
                    onChange={(event) =>
                      setIntakePriceInput(moneyInputDraftWithTwoDecimals(event.target.value))
                    }
                    placeholder="0.00"
                  />
                </label>
                <label htmlFor="intake-location">
                  <span className="micro-label">Location</span>
                  <input
                    id="intake-location"
                    value={intakeLocation}
                    onChange={(event) => setIntakeLocation(event.target.value)}
                    placeholder="Intake Queue"
                  />
                </label>
                <label htmlFor="intake-online-visibility">
                  <span className="micro-label">Online shop</span>
                  <select
                    id="intake-online-visibility"
                    value={intakeOnlineVisibility}
                    onChange={(event) => setIntakeOnlineVisibility(event.target.value as InventoryVisibility)}
                  >
                    {INVENTORY_VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="intake-kiosk-visibility">
                  <span className="micro-label">Kiosk</span>
                  <select
                    id="intake-kiosk-visibility"
                    value={intakeKioskVisibility}
                    onChange={(event) => setIntakeKioskVisibility(event.target.value as InventoryVisibility)}
                  >
                    {INVENTORY_VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="intake-pos-visibility">
                  <span className="micro-label">POS</span>
                  <select
                    id="intake-pos-visibility"
                    value={intakePosVisibility}
                    onChange={(event) => setIntakePosVisibility(event.target.value as InventoryVisibility)}
                  >
                    {INVENTORY_VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="micro-label">LAN inventory queue</span>
                  <strong>{intakeIssue ? "Needs details" : "Ready"}</strong>
                  <small>{intakeIssue || intakeVisibilitySummary}</small>
                  <button type="button" onClick={() => void handleInventoryIntake()}>
                    <Icon name="plus" />
                    <span>Add Inventory</span>
                  </button>
                </div>
              </div>

              <div className="table-meta">
                <span>{filteredItems.length} cached results</span>
                <strong>{activeProfile.companyName} website authority after sync acceptance</strong>
              </div>

              {viewMode === "list" ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Card</th>
                        <th>Set</th>
                        <th>Condition</th>
                        <th>Price</th>
                        <th>Location</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr
                          key={item.id}
                          className={item.id === selectedId ? "is-selected" : ""}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <td>
                            <span className="card-title">{item.cardName}</span>
                            <small>{item.barcode}</small>
                          </td>
                          <td>{item.setName}</td>
                          <td>{item.condition}</td>
                          <td>{item.price}</td>
                          <td>{item.location}</td>
                          <td>
                            <span className={`status-dot ${item.status}`}>
                              {statusLabel(item.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredItems.length === 0 ? (
                    <p className="empty-table">No cached cards match this scan.</p>
                  ) : null}
                </div>
              ) : (
                <div className="inventory-card-grid" aria-label="Inventory grid">
                  {filteredItems.map((item) => (
                    <button
                      className={item.id === selectedId ? "inventory-card is-selected" : "inventory-card"}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      key={item.id}
                    >
                      <span className={`status-dot ${item.status}`}>{statusLabel(item.status)}</span>
                      <div className="inventory-card-art" aria-hidden="true">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" loading="lazy" />
                        ) : (
                          <Icon name="card" />
                        )}
                      </div>
                      <strong>{item.cardName}</strong>
                      <small>{item.setName}</small>
                      <span className="inventory-card-price">{item.price}</span>
                    </button>
                  ))}
                  {filteredItems.length === 0 ? (
                    <p className="empty-table">No cached cards match this scan.</p>
                  ) : null}
                </div>
              )}
            </section>

            <aside className="detail-panel" aria-label="Selected card details">
              <div className="selected-card-header">
                <Icon name="card" />
                <span>Selected card</span>
              </div>
              <div className="card-preview">
                <div className="card-frame">
                  <div className="card-frame-title">
                    <span>{selectedItem.cardName}</span>
                    <small>{selectedItem.condition}</small>
                  </div>
                  <div className="card-art">
                    {selectedInventoryImageUrl ? (
                      <img
                        alt={`${selectedItem.cardName} inventory card art`}
                        src={selectedInventoryImageUrl}
                        loading="lazy"
                      />
                    ) : (
                      <>
                        <Icon name="card" />
                        <span className="foil-line" aria-hidden="true" />
                      </>
                    )}
                  </div>
                  <div className="card-frame-footer">
                    <span>{selectedItem.setName}</span>
                    <strong>{selectedItem.number}</strong>
                  </div>
                </div>
              </div>
              <div className="detail-copy">
                <span className={`status-dot ${selectedItem.status}`}>
                  {statusLabel(selectedItem.status)}
                </span>
                <h2>{selectedItem.cardName}</h2>
                <p>{selectedItem.setName}</p>
                {selectedScryDexCard ? (
                  <div className="detail-catalog-context" aria-label="Separate selected catalog intake draft">
                    <span>Catalog intake draft</span>
                    <strong>{selectedScryDexCard.card_name}</strong>
                    <small>
                      {selectedScryDexCard.set_name} {selectedScryDexCard.printed_number} / {selectedScryDexVariantLabel}
                    </small>
                  </div>
                ) : null}
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Website ID</dt>
                  <dd>{selectedItem.publicId}</dd>
                </div>
                <div>
                  <dt>Barcode</dt>
                  <dd>{selectedItem.barcode}</dd>
                </div>
                <div>
                  <dt>POS mapping</dt>
                  <dd>
                    {selectedItem.squareCatalogVariationId
                      ? `${selectedItem.externalSyncState ?? "mapped"} / ${selectedItem.squareCatalogVariationId}`
                      : selectedItem.externalSyncState === "failed" || selectedItem.externalSyncState === "conflict"
                        ? selectedItem.externalSyncState
                        : "Pending Square mapping"}
                  </dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{selectedItem.location}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{selectedInventoryVersionLabel}</dd>
                </div>
                <div>
                  <dt>Visibility</dt>
                  <dd>{selectedInventoryVisibilitySummary}</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>{selectedItem.price}</dd>
                </div>
                <div>
                  <dt>Sync source</dt>
                  <dd>{selectedItem.source}</dd>
                </div>
              </dl>
              <div className="detail-actions">
                <div className="inventory-adjustment-controls" aria-label="Inventory adjustment details">
                  <label htmlFor="quantity-delta">
                    <span className="micro-label">Qty delta</span>
                    <input
                      id="quantity-delta"
                      inputMode="numeric"
                      value={quantityDeltaInput}
                      onChange={(event) => setQuantityDeltaInput(event.target.value)}
                      placeholder="+1"
                    />
                  </label>
                  <label htmlFor="quantity-adjustment-reason">
                    <span className="micro-label">Reason</span>
                    <input
                      id="quantity-adjustment-reason"
                      value={quantityAdjustmentReason}
                      onBlur={() =>
                        setQuantityAdjustmentReason(
                          cleanInventoryAdjustmentReason(quantityAdjustmentReason),
                        )
                      }
                      onChange={(event) => setQuantityAdjustmentReason(event.target.value)}
                      placeholder="Reason"
                    />
                  </label>
                  {quantityAdjustmentIssue ? <small>{quantityAdjustmentIssue}</small> : null}
                </div>
                <button
                  className="wide-action"
                  type="button"
                  onClick={() => void handleStageInventoryUpdate()}
                >
                  <Icon name="upload" />
                  <span>Stage Inventory Update</span>
                </button>
                <button
                  type="button"
                  disabled={selectedItem.status !== "available"}
                  onClick={() => void handleInventoryReservation()}
                >
                  Hold Item
                </button>
                <button type="button" onClick={() => void handleQuantityAdjustment()}>
                  Adjust Qty
                </button>
                <button type="button" onClick={handlePrintLabel}>
                  Print Label
                </button>
              </div>
              <div className="operation-preview" aria-live="polite">
                {stagedOperation ? (
                  <>
                    <span>
                      {queueSubmission?.status === "queued" ? "Queued envelope" : "Staged envelope"}
                    </span>
                    <strong>{stagedOperation.client_operation_id}</strong>
                    <small>
                      {stagedPushRequest && pushSummary
                        ? `${queueTarget} insert planned; ${stagedPushRequest.method} ${stagedPushRequest.path.replace("/wp-json/tcg-store/v1", "")} deferred; ${pushSummary.status} preview; canonical inventory ${pushSummary.canonical_inventory_writes_deferred ? "deferred" : "ready"}.`
                        : stagedPushBatch
                          ? `Push batch ${stagedPushBatch.batch_id} ready after reconnect.`
                        : (queueSubmission?.message ?? "Ready for local queue handoff.")}
                    </small>
                  </>
                ) : (
                  <>
                    <span>Local queue ready</span>
                    <strong>SQLite operation envelope</strong>
                    <small>Updates stay local until push acceptance.</small>
                  </>
                )}
              </div>
              {labelPrintJobs.length > 0 ? (
                <div className="label-job-list" aria-label="Prepared label jobs">
                  <span>Prepared labels</span>
                  {labelPrintJobs.map((job) => (
                    <div key={job.jobId}>
                      <strong>{job.cardName}</strong>
                      <small>
                        {job.barcode}; {job.price}; {job.location}; {job.companyShortName};{" "}
                        {job.queuedAtLabel}
                      </small>
                      <code>{job.payloadText}</code>
                    </div>
                  ))}
                </div>
              ) : null}
            </aside>

            <section className="kiosk-panel" aria-label="Customer kiosk pickup order" ref={kioskPanelRef}>
              <div className="section-heading">
                <h2>Kiosk Pickup</h2>
                <span>{kioskCartItems.length} selected</span>
              </div>
              <div className="kiosk-hero">
                <div>
                  <span className="micro-label">Customer kiosk mode</span>
                  <strong>Browse inventory and request pickup</strong>
                  <small>
                    Kiosk orders reserve through the LAN sync server first, then the website
                    confirms final inventory status after sync acceptance.
                  </small>
                </div>
                <div>
                  <span className="micro-label">Local authority</span>
                  <strong>LAN middleman server</strong>
                  <small>All employee stations and kiosks share the same in-store cache and queue.</small>
                </div>
              </div>
              <div className="kiosk-customer-fields" aria-label="Kiosk customer name">
                <label htmlFor="kiosk-first-name">
                  <span className="micro-label">First name</span>
                  <input
                    id="kiosk-first-name"
                    value={kioskFirstName}
                    onChange={(event) => setKioskFirstName(event.target.value)}
                    placeholder="First"
                  />
                </label>
                <label htmlFor="kiosk-last-name">
                  <span className="micro-label">Last name</span>
                  <input
                    id="kiosk-last-name"
                    value={kioskLastName}
                    onChange={(event) => setKioskLastName(event.target.value)}
                    placeholder="Last"
                  />
                </label>
                <button type="button" onClick={() => void handleKioskSubmitOrder()}>
                  <Icon name="check" />
                  <span>Submit Pickup Order</span>
                </button>
              </div>
              <div className="kiosk-layout">
                <div className="kiosk-inventory-list" aria-label="Kiosk inventory results">
                  {filteredItems.slice(0, 12).map((item) => (
                    <article className="kiosk-card" key={item.id}>
                      <div className="kiosk-card-art" aria-hidden="true">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" loading="lazy" />
                        ) : (
                          <Icon name="card" />
                        )}
                      </div>
                      <div>
                        <span className={`status-dot ${item.status}`}>{statusLabel(item.status)}</span>
                        <strong>{item.cardName}</strong>
                        <small>
                          {item.setName}; {item.condition}; {item.location}
                        </small>
                      </div>
                      <span>{item.price}</span>
                      <button
                        type="button"
                        disabled={item.status !== "available" || kioskCartIds.includes(item.id)}
                        onClick={() => handleKioskAddItem(item)}
                      >
                        {kioskCartIds.includes(item.id) ? "Selected" : "Add"}
                      </button>
                    </article>
                  ))}
                  {filteredItems.length === 0 ? (
                    <p className="panel-empty">No kiosk inventory matches this search.</p>
                  ) : null}
                </div>
                <div className="kiosk-cart" aria-label="Kiosk selected cards">
                  <span className="micro-label">Pickup cart</span>
                  {kioskCartItems.length > 0 ? (
                    kioskCartItems.map((item) => (
                      <div key={item.id}>
                        <strong>{item.cardName}</strong>
                        <small>
                          {item.setName}; {item.price}; {item.location}
                        </small>
                        <button type="button" onClick={() => handleKioskRemoveItem(item.id)}>
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p>Select available cards for staff to pull.</p>
                  )}
                </div>
              </div>
              {kioskOrderTickets.length > 0 ? (
                <div className="kiosk-ticket-list" aria-label="Recent kiosk pickup tickets">
                  <span className="micro-label">Recent pickup tickets</span>
                  {kioskOrderTickets.map((ticket) => (
                    <article key={ticket.orderId}>
                      <div>
                        <strong>{ticket.orderId}</strong>
                        <small>
                          {ticket.customerName}; {ticket.itemCount} card(s); {ticket.status}
                        </small>
                      </div>
                      <small>
                        Reservations: {ticket.reservationIds.slice(0, 3).join(", ")}
                        {ticket.reservationIds.length > 3 ? "..." : ""}
                      </small>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="queue-panel" aria-label="Sync queue" ref={queuePanelRef}>
              <div className="section-heading">
                <h2>Sync queue</h2>
                <span>{queuePanelPendingLabel}</span>
              </div>
              <p className="queue-storage-note">
                Queue and sync attempts are saved locally on this device.
              </p>
              <div className="queue-sync-command" aria-label="Website sync command">
                <div>
                  <span className="micro-label">Website sync</span>
                  <strong>
                    {localSyncStatus?.status === "ok" && localSyncStatus.wordpress_push_connected
                      ? "LAN push connected"
                      : "LAN push waiting"}
                  </strong>
                  <small>
                    Sync pulls latest website inventory, pushes accepted LAN queue rows, and keeps
                    WordPress as the final inventory authority.
                  </small>
                </div>
                <button
                  type="button"
                  disabled={!localSyncSessionToken || syncNowInFlight}
                  onClick={() => void handleSyncNowPreview()}
                >
                  <Icon name="sync" />
                  <span>{syncNowInFlight ? "Syncing" : "Sync to Website"}</span>
                </button>
              </div>
              {renderOperationSyncVisibilityPanel()}
              {lanSyncLastResult ? (
                <div className="queue-review-card lan-sync-result" aria-label="Last LAN sync result">
                  <span>Last LAN sync</span>
                  <strong>{lanSyncLastResult.generatedAtLabel}</strong>
                  <p>{lanSyncLastResult.pullMessage}</p>
                  <p>{lanSyncLastResult.pushMessage}</p>
                </div>
              ) : null}
              {queueSummaryRows.map((item) => (
                <div className={`queue-row ${item.tone}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
              {queuedOperations.length > 0 ? (
                <div className="queued-operation-list" aria-label="Queued local operations">
                  {queuedOperations.slice(0, 6).map((operation) => (
                    <button
                      className={
                        operation.client_operation_id === selectedQueuedOperation?.client_operation_id
                          ? "queued-operation-card is-selected"
                          : "queued-operation-card"
                      }
                      type="button"
                      onClick={() => {
                        setSelectedQueuedOperationId(operation.client_operation_id)
                        setActiveSection("Queue")
                      }}
                      key={operation.client_operation_id}
                    >
                      <span>{formatQueueOperationType(operation.operation_type)}</span>
                      <strong>{operation.client_operation_id}</strong>
                      <small>
                        {operation.entity_type.replaceAll("_", " ")} {operation.entity_id}; row
                        version {operation.base_row_version}
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="panel-empty">No new local operations staged this session.</p>
              )}
              {selectedQueuedOperation ? (
                <div className="queue-review-card" aria-label="Selected queue operation">
                  <span>Selected queue operation</span>
                  <strong>{selectedQueuedOperation.client_operation_id}</strong>
                  <div className="queue-review-grid">
                    <div>
                      <span>Entity</span>
                      <strong>
                        {selectedQueuedOperation.entity_type.replaceAll("_", " ")} /{" "}
                        {selectedQueuedOperation.entity_id}
                      </strong>
                    </div>
                    <div>
                      <span>Queued</span>
                      <strong>{selectedQueuedOperation.queued_at_utc}</strong>
                    </div>
                  </div>
                  <p>{selectedQueueOperationSummary}</p>
                </div>
              ) : null}
              <div className="queue-action-row" aria-label="Queue management actions">
                <button
                  className="secondary-command"
                  type="button"
                  disabled={isDesktopQueueRefreshing}
                  onClick={() => void handleRefreshDesktopQueue()}
                >
                  <Icon name="sync" />
                  <span>
                    {isDesktopQueueRefreshing ? "Refreshing Queue" : "Refresh Desktop Queue"}
                  </span>
                </button>
                <button
                  className="secondary-command"
                  type="button"
                  disabled={!selectedQueuedOperation || isQueueVoidInFlight}
                  onClick={() => void handleCopySelectedQueueOperation()}
                >
                  <Icon name="copy" />
                  <span>Copy Operation JSON</span>
                </button>
                <button
                  className="secondary-command"
                  type="button"
                  disabled={queuedOperations.length === 0 || isQueueVoidInFlight}
                  onClick={handleExportQueueJson}
                >
                  <Icon name="upload" />
                  <span>Export Queue JSON</span>
                </button>
                <button
                  className="secondary-command danger-command"
                  type="button"
                  disabled={!selectedQueuedOperation || isQueueVoidInFlight}
                  onClick={() => void handleVoidSelectedQueueOperation()}
                >
                  <Icon name="trash" />
                  <span>
                    {isQueueVoidInFlight ? "Voiding Selected" : "Void Selected Operation"}
                  </span>
                </button>
                <button
                  className="secondary-command danger-command"
                  type="button"
                  disabled={queuedOperations.length === 0 || isQueueVoidInFlight}
                  onClick={() => void handleClearSessionQueue()}
                >
                  <Icon name="trash" />
                  <span>Clear Session Queue</span>
                </button>
              </div>
              {queueExportStatus.status !== "idle" ? (
                <div className={`queue-export-status ${queueExportStatus.status}`} aria-live="polite">
                  <strong>{queueExportStatus.status}</strong>
                  <span>{queueExportStatus.detail}</span>
                  <small>raw credentials copied: no</small>
                </div>
              ) : null}
              {queueExportPreview ? (
                <textarea
                  className="queue-export-preview"
                  aria-label="Queue export JSON preview"
                  readOnly
                  value={queueExportPreview}
                />
              ) : null}
              <button
                className="secondary-command"
                type="button"
                onClick={() => void handleStageInventoryUpdate("Queue update staged")}
              >
                <Icon name="plus" />
                <span>Stage New Update</span>
              </button>
            </section>

            <section className="event-panel" aria-label="Offline events" ref={eventPanelRef}>
              <div className="section-heading">
                <h2>Events</h2>
                <div className="section-heading-actions">
                  <span>
                    {pendingEventRegistrationCount} registration; {pendingEventCheckinCount} check-in
                  </span>
                  <button
                    className="secondary-command"
                    type="button"
                    onClick={() => void refreshLanEventSnapshots({ announce: true })}
                  >
                    <Icon name="sync" />
                    <span>Refresh LAN Events</span>
                  </button>
                </div>
              </div>
              <div className="event-list" aria-label="Cached event snapshots">
                {eventSnapshots.map((event) => {
                  const isSelected = selectedEvent?.eventId === event.eventId
                  const isPending = pendingEventRegistrationIds.includes(event.eventId)
                  const isCheckinPending = pendingEventCheckinIds.includes(event.eventId)
                  const registrationBlocked =
                    event.registrationStatus === "closed" || event.registrationStatus === "full"

                  return (
                    <article className={isSelected ? "event-row is-selected" : "event-row"} key={event.eventId}>
                      <button
                        className="event-row-main"
                        type="button"
                        onClick={() => {
                          setSelectedEventId(event.eventId)
                          setActiveSection("Events")
                        }}
                      >
                        <span className={`event-status ${event.registrationStatus}`}>
                          {eventRegistrationStatusLabel(event.registrationStatus)}
                        </span>
                        <strong>{event.title}</strong>
                        <small>
                          {event.startsAtLabel}; {event.locationLabel}
                        </small>
                        <small>
                          {event.registeredCount}/{event.capacity} registered
                          {isPending ? "; local registration queued" : ""}
                          {isCheckinPending ? "; local check-in queued" : ""}
                        </small>
                      </button>
                      <button
                        className="event-row-action"
                        type="button"
                        disabled={registrationBlocked}
                        onClick={() => void handleEventRegistration(event)}
                      >
                        {event.registrationStatus === "waitlist" ? "Stage Waitlist" : "Register Offline"}
                      </button>
                    </article>
                  )
                })}
              </div>
              {selectedEvent ? (
                <div className="event-detail-card" aria-label="Selected event workflow">
                  <div>
                    <span className="micro-label">Selected event</span>
                    <strong>{selectedEvent.title}</strong>
                    <small>{selectedEvent.note}</small>
                  </div>
                  <div>
                    <span className="micro-label">Capacity</span>
                    <strong>
                      {Math.max(0, selectedEvent.capacity - selectedEvent.registeredCount)} seat(s)
                    </strong>
                    <small>
                      {eventRegistrationStatusLabel(selectedEvent.registrationStatus)}; website row
                      version {selectedEvent.rowVersion}
                    </small>
                  </div>
                  <div className="event-offline-fields" aria-label="Offline event registration details">
                    <label htmlFor="event-attendee-label">
                      <span className="micro-label">Attendee</span>
                      <input
                        id="event-attendee-label"
                        value={eventAttendeeLabel}
                        onBlur={() =>
                          setEventAttendeeLabel(cleanOfflineEventAttendeeLabel(eventAttendeeLabel))
                        }
                        onChange={(event) => setEventAttendeeLabel(event.target.value)}
                        placeholder="Customer name or lookup"
                      />
                    </label>
                    <label htmlFor="event-payment-status">
                      <span className="micro-label">Payment</span>
                      <select
                        id="event-payment-status"
                        value={eventPaymentStatus}
                        onChange={(event) =>
                          setEventPaymentStatus(event.target.value as EventPaymentStatus)
                        }
                      >
                        <option value="not_required">Not required</option>
                        <option value="pay_at_store">Pay at store</option>
                      </select>
                    </label>
                    <label htmlFor="event-checkin-lookup">
                      <span className="micro-label">Check-in ID</span>
                      <input
                        id="event-checkin-lookup"
                        value={eventCheckinLookup}
                        onBlur={() =>
                          setEventCheckinLookup(
                            cleanOfflineEventRegistrationPublicId(
                              eventCheckinLookup,
                              selectedEvent.eventId,
                            ),
                          )
                        }
                        onChange={(event) => setEventCheckinLookup(event.target.value)}
                        placeholder={`registration-${selectedEvent.eventId}-walkin`}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={
                      selectedEvent.registrationStatus === "closed" ||
                      selectedEvent.registrationStatus === "full"
                    }
                    onClick={() => void handleEventRegistration(selectedEvent)}
                  >
                    <Icon name="event" />
                    <span>
                      {selectedEvent.registrationStatus === "waitlist"
                        ? "Stage Waitlist"
                        : "Register Walk-In"}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={selectedEvent.registrationStatus === "closed"}
                    onClick={() => void handleEventCheckin(selectedEvent)}
                  >
                    <Icon name="check" />
                    <span>Check In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventQueue(true)
                      setActiveSection("Events")
                    }}
                  >
                    <Icon name="queue" />
                    <span>Review Event Queue</span>
                  </button>
                </div>
              ) : null}
              {showEventQueue ? (
                <div className="event-queue-preview" aria-label="Queued event operations">
                  {eventQueuePreviewEntries.length > 0 ? (
                    eventQueuePreviewEntries.slice(0, 4).map((entry) => (
                      <article
                        className={
                          entry.operationType === "event_checkin"
                            ? "event-queue-entry is-checkin"
                            : "event-queue-entry is-registration"
                        }
                        key={entry.operationId}
                      >
                        <header>
                          <span>{entry.statusLabel}</span>
                          <small>{entry.occurredAtLabel}</small>
                        </header>
                        <strong>{entry.title}</strong>
                        <p>{entry.detail}</p>
                        <div className="event-queue-meta">
                          <span>{entry.attendeeLabel}</span>
                          <span>{entry.sourceLabel}</span>
                          {entry.registrationPublicId ? (
                            <span>{entry.registrationPublicId}</span>
                          ) : null}
                        </div>
                        <small className="event-queue-payload">{entry.payloadSummary}</small>
                      </article>
                    ))
                  ) : (
                    <p className="panel-empty">No event registrations or check-ins staged this session.</p>
                  )}
                </div>
              ) : null}
            </section>

            <section className="conflict-panel" aria-label="Conflict review" ref={conflictPanelRef}>
              <div className="section-heading">
                <h2>Conflicts</h2>
                <span>Needs review</span>
              </div>
              {openConflicts.map((item) => (
                <article
                  className={
                    item.title === selectedConflictTitle
                      ? "conflict-row is-selected"
                      : "conflict-row"
                  }
                  key={item.conflictId}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleConflictAction(item)}
                  >
                    {item.action}
                  </button>
                </article>
              ))}
              {openConflicts.length === 0 ? (
                <p className="panel-empty">No open conflicts remain in this local session.</p>
              ) : null}
              {showConflictHistory ? (
                <div className="history-note">
                  <strong>Last review</strong>
                  <span>
                    {reviewedConflicts[0]
                      ? `${reviewedConflicts[0].title} was staged for manager review.`
                      : "Manager review, queue replay, and website write are still deferred."}
                  </span>
                  {reviewedConflicts.length > 1 ? (
                    <small>{reviewedConflicts.length} reviews staged this session.</small>
                  ) : null}
                </div>
              ) : null}
              <button
                className="secondary-command danger-command"
                type="button"
                onClick={() => {
                  setShowConflictHistory((shown) => !shown)
                  setActiveSection("Conflicts")
                }}
              >
                <Icon name="history" />
                <span>Review History</span>
              </button>
            </section>

            <section className="connector-panel" aria-label="Website setup" ref={connectorPanelRef}>
              <div className="section-heading">
                <h2>Website setup</h2>
                <span>{connectorStatusLabel(activeProfile.status)}</span>
              </div>
              <div className="connector-grid">
                <div>
                  <span className="micro-label">Company</span>
                  <strong>{connectorHealth.company}</strong>
                  <small>{connectorHealth.environment}</small>
                </div>
                <div>
                  <span className="micro-label">Website</span>
                  <strong>{connectorHealth.website}</strong>
                  <small>{connectorHealth.restBasePath}; setup saved locally for this device</small>
                </div>
                <div>
                  <span className="micro-label">Setup mode</span>
                  <strong>One website install</strong>
                  <small>
                    {oneWebsiteSetupPlan.profileSelection}; {oneWebsiteSetupPlan.syncPath.join(" -> ")}
                  </small>
                </div>
                <div>
                  <span className="micro-label">LAN sync</span>
                  <strong>{localSyncClient.serverUrl}</strong>
                  <small>
                    {localSyncStatus?.status === "ok"
                      ? `${localSyncStatus.local_database}; ${localSyncStatus.queue_depth} queued; ${localSyncPullStatusLabel}; push ${localSyncStatus.wordpress_push_connected ? "on" : "off"}`
                      : "Local middleman server; run npm start in apps/local-sync-server"}
                  </small>
                  <small>
                    Setup probe: {lanSetupProbe.status}; {lanSetupProbe.detail}
                    {lanSetupProbe.endpoint ? ` ${lanSetupProbe.endpoint}` : ""}
                  </small>
                </div>
                <div>
                  <span className="micro-label">Device token</span>
                  <strong>
                    {activePairedDevice
                      ? activePairedDevice.tokenStatus === "stored"
                        ? "Paired token stored"
                        : activePairedDevice.tokenStatus === "missing"
                          ? "Paired token missing"
                          : "Token check pending"
                      : "Pairing required"}
                  </strong>
                  <small>
                    {activePairedDevice
                      ? `${activePairedDevice.devicePublicId}; raw token stored in browser: no`
                      : "No paired device metadata saved for this company."}
                  </small>
                </div>
                <div>
                  <span className="micro-label">Offline push</span>
                  <strong>
                    {connectorHealth.canonicalInventoryWritesEnabled
                      ? "Guarded holds enabled"
                      : "Canonical holds deferred"}
                  </strong>
                  <small>
                    Route {connectorHealth.routeConnectedPushReady ? "ready" : "gated"};
                    writes {connectorHealth.canonicalInventoryWritesDeferred ? "deferred" : "enabled"}
                  </small>
                </div>
                <div>
                  <span className="micro-label">Square</span>
                  <strong>
                    {squarePosPlan?.status === "ok"
                      ? `${squarePosPlan.mapped_count} mapped / ${squarePosPlan.unresolved_count} review`
                      : "Inventory pulls from plugin"}
                  </strong>
                  <small>
                    {squarePosPlan?.status === "ok"
                      ? `${squarePosPlan.planner_status}; payment capture supported: no`
                      : "Payments stay in WooCommerce Square"}
                  </small>
                  <button
                    className="secondary-command compact-command"
                    type="button"
                    disabled={sessionRole !== "manager"}
                    onClick={() => void handlePlanSquarePosInventoryPull()}
                  >
                    <Icon name="sync" />
                    <span>Plan POS Pull</span>
                  </button>
                </div>
                <div>
                  <span className="micro-label">ScryDex</span>
                  <strong>{activeProfile.scrydex.teamLabel}</strong>
                  <small>Secrets stay on WordPress/server settings</small>
                </div>
              </div>
              {squarePosPlan?.status === "ok" ? (
                <div className={`square-pos-plan ${squarePosPlan.planner_status}`} aria-label="Square POS inventory readiness">
                  <div className="square-pos-plan__heading">
                    <div>
                      <span className="micro-label">Square POS inventory readiness</span>
                      <strong>
                        {squarePosMappingSummary?.ready_for_square_pull_count ?? squarePosPlan.mapped_count} ready /{" "}
                        {squarePosMappingSummary?.review_count ?? squarePosPlan.unresolved_count} review
                      </strong>
                      <small>
                        Website inventory authority: {squarePosMappingSummary?.square_inventory_authority ?? "tcg_store_platform"};
                        counts are for reconciliation only.
                      </small>
                    </div>
                    <span className="status-pill">{squarePosPlan.planner_status}</span>
                  </div>
                  <div className="square-pos-plan__metrics">
                    <span>
                      <strong>{squarePosMappingSummary?.pos_visible_count ?? 0}</strong>
                      POS visible
                    </span>
                    <span>
                      <strong>{squarePosMappingSummary?.ready_available_count ?? squarePosPlan.mapped_count}</strong>
                      expected in stock
                    </span>
                    <span>
                      <strong>{squarePosMappingSummary?.unmapped_pos_visible_count ?? squarePosPlan.unresolved_count}</strong>
                      unmapped visible
                    </span>
                    <span>
                      <strong>{squarePosMappingSummary?.duplicate_scan_identity_count ?? 0}</strong>
                      duplicate scans
                    </span>
                  </div>
                  {squarePosNextActions.length ? (
                    <ul className="square-pos-next-actions" aria-label="Square POS next actions">
                      {squarePosNextActions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="square-pos-plan__columns">
                    <div>
                      <span className="micro-label">Ready Square pull feed</span>
                      {squarePosPullFeed.length ? (
                        <ul className="square-pos-feed-list">
                          {squarePosPullFeed.slice(0, 5).map((row) => (
                            <li key={`${row.public_id}-${row.square_catalog_variation_id}`}>
                              <strong>{row.card_name}</strong>
                              <span>
                                {row.condition} / {row.barcode || row.sku} / Square{" "}
                                {row.square_catalog_variation_id}
                              </span>
                              <small>
                                Expected qty {row.expected_serialized_quantity};{" "}
                                {formatMoney(row.price_minor_units, "USD")}
                              </small>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <small>No mapped Square rows are ready yet.</small>
                      )}
                    </div>
                    <div>
                      <span className="micro-label">POS mapping review</span>
                      {squarePosReviewItems.length ? (
                        <ul className="square-pos-review-list">
                          {squarePosReviewItems.slice(0, 5).map((item) => (
                            <li key={`${item.public_id}-${item.scan_identity}`}>
                              <strong>{item.card_name}</strong>
                              <span>{item.issue_labels.join(", ") || "Review required"}</span>
                              <small>{item.next_action}</small>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <small>No POS-visible mapping issues in this plan.</small>
                      )}
                    </div>
                  </div>
                  <small className="square-pos-plan__footer">
                    Generated {formatUtcLabel(squarePosPlan.generated_at_utc ?? "")}; Square payment capture supported here: no.
                  </small>
                </div>
              ) : null}
              <div
                className={`manifest-validation ${connectorValidation?.status ?? "idle"}`}
                aria-live="polite"
              >
                <div>
                  <span className="micro-label">Manifest validation</span>
                  <strong>
                    {connectorValidation
                      ? connectorValidation.status === "accepted"
                        ? "Accepted"
                        : connectorValidation.status === "warning"
                          ? "Needs review"
                          : "Rejected"
                      : "Ready to test"}
                  </strong>
                  <small>
                    {connectorValidation
                      ? `${connectorValidation.endpointCount} endpoints / ${connectorValidation.routeCount} routes; credentials synced to app: no`
                      : `${manifestPreview.offline_route_count} planned routes; import validates before pairing`}
                  </small>
                  <small>{manifestPreview.wordpress.connector_manifest_url}</small>
                  <small>
                    {connectorManifestFetch.status === "loading"
                      ? `Fetching ${connectorManifestFetch.sourceUrl || manifestPreview.wordpress.connector_manifest_url}`
                      : connectorManifestFetch.status === "success"
                        ? `Live manifest imported at ${connectorManifestFetch.importedAtLabel}; source ${connectorManifestFetch.sourceUrl}`
                        : connectorManifestFetch.status === "error"
                          ? `Live manifest blocked: ${connectorManifestFetch.detail}`
                          : connectorManifestFetch.detail}
                  </small>
                </div>
                {connectorValidation?.issues.length ? (
                  <ul>
                    {connectorValidation.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {connectorTestReport ? (
                <div
                  className={`connector-test-report ${connectorTestReport.status}`}
                  aria-label="Connector test report"
                >
                  <div className="connector-test-heading">
                    <span className="micro-label">Connector test report</span>
                    <strong>
                      {connectorTestReport.status === "pass"
                        ? "Ready"
                        : connectorTestReport.status === "warning"
                          ? "Needs review"
                          : "Blocked"}
                    </strong>
                    <small>
                      {connectorTestReport.companyName}; {connectorTestReport.endpointCount} endpoints;
                      network deferred at {connectorTestReport.generatedAtLabel}
                    </small>
                  </div>
                  <div className="connector-test-checks">
                    {connectorTestReport.checks.map((check) => (
                      <div className={`connector-test-check ${check.status}`} key={check.label}>
                        <span>{check.label}</span>
                        <strong>{check.status}</strong>
                        <small>{check.detail}</small>
                      </div>
                    ))}
                  </div>
                  <small className="connector-test-footnote">
                    Network deferred; credentials synced to app: no; direct database access: no.
                  </small>
                </div>
              ) : null}
              <div className="manager-session-panel" aria-label="Manager locked settings">
                <div>
                  <span className="micro-label">Settings lock</span>
                  <strong>{managerControlsUnlocked ? "Manager unlocked" : "Manager locked"}</strong>
                  <small>
                    Session role {sessionRole}; timeout is {sessionTimeoutMinutes} minute(s).
                    {localSyncSessionExpiresAtUtc
                      ? ` Auto-locks at ${new Date(localSyncSessionExpiresAtUtc).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}.`
                      : ""}
                  </small>
                </div>
                <label htmlFor="session-timeout-minutes">
                  <span className="micro-label">Timeout minutes</span>
                  <input
                    id="session-timeout-minutes"
                    inputMode="numeric"
                    disabled={sessionRole !== "manager"}
                    value={sessionTimeoutMinutes}
                    onChange={(event) => {
                      const nextValue = Number.parseInt(event.target.value, 10)

                      if (Number.isFinite(nextValue)) {
                        setSessionTimeoutMinutes(Math.min(240, Math.max(5, nextValue)))
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={sessionRole !== "manager"}
                  onClick={() => setManagerSettingsLocked((locked) => !locked)}
                >
                  <Icon name="settings" />
                  <span>{managerControlsUnlocked ? "Lock Settings" : "Unlock Settings"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLockSession}
                >
                  <Icon name="history" />
                  <span>Lock App</span>
                </button>
              </div>
              <div className="user-access-panel" aria-label="Users & Access">
                <header>
                  <div>
                    <span className="micro-label">Users & Access</span>
                    <strong>4-digit PIN users</strong>
                    <small>{offlineUsers.length} saved user(s); manager controls required.</small>
                  </div>
                  <span>{managerControlsUnlocked ? "Unlocked" : "Locked"}</span>
                </header>
                <div className="user-access-list">
                  {offlineUsers.map((user) => (
                    <article className={`user-access-card ${user.role}`} key={user.id}>
                      <div className="user-access-identity">
                        <strong>{user.name}</strong>
                        <small>
                          {user.role === "manager" ? "Manager PIN" : "Staff PIN"}{" "}
                          {user.pin ? "*".repeat(user.pin.length) : "configured on LAN server"}
                        </small>
                      </div>
                      <label>
                        <span className="micro-label">Role</span>
                        <select
                          disabled={!managerControlsUnlocked}
                          value={user.role}
                          onChange={(event) =>
                            void handleOfflineUserRoleChange(
                              user.id,
                              event.target.value as Exclude<AppSessionRole, "locked">,
                            )
                          }
                        >
                          <option value="staff">Staff</option>
                          <option value="manager">Manager</option>
                        </select>
                      </label>
                      <div className="access-chip-grid" aria-label={`${user.name} access`}>
                        {ACCESS_SECTIONS.map((section) => (
                          <label className="access-chip" key={section}>
                            <input
                              type="checkbox"
                              disabled={!managerControlsUnlocked || user.role === "manager"}
                              checked={user.role === "manager" || user.access.includes(section)}
                              onChange={() => void handleOfflineUserAccessToggle(user.id, section)}
                            />
                            <span>{section}</span>
                          </label>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="user-access-editor" aria-label="Add offline user">
                  <label>
                    <span className="micro-label">Name</span>
                    <input
                      disabled={!managerControlsUnlocked}
                      value={newUserName}
                      onChange={(event) => setNewUserName(event.target.value)}
                      placeholder="Employee name"
                    />
                  </label>
                  <label>
                    <span className="micro-label">4-digit PIN</span>
                    <input
                      disabled={!managerControlsUnlocked}
                      inputMode="numeric"
                      maxLength={4}
                      type="password"
                      value={newUserPin}
                      onChange={(event) =>
                        setNewUserPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="----"
                    />
                  </label>
                  <label>
                    <span className="micro-label">Role</span>
                    <select
                      disabled={!managerControlsUnlocked}
                      value={newUserRole}
                      onChange={(event) => {
                        const nextRole = event.target.value as Exclude<AppSessionRole, "locked">
                        setNewUserRole(nextRole)
                        setNewUserAccess(
                          nextRole === "manager" ? [...ACCESS_SECTIONS] : ["Inventory", "Kiosk", "Queue"],
                        )
                      }}
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                    </select>
                  </label>
                  <div className="access-chip-grid" aria-label="New user allowed workspaces">
                    {ACCESS_SECTIONS.map((section) => (
                      <label className="access-chip" key={section}>
                        <input
                          type="checkbox"
                          disabled={!managerControlsUnlocked || newUserRole === "manager"}
                          checked={newUserRole === "manager" || newUserAccess.includes(section)}
                          onChange={() => toggleNewUserAccess(section)}
                        />
                        <span>{section}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!managerControlsUnlocked}
                    onClick={() => void handleAddOfflineUser()}
                  >
                    <Icon name="plus" />
                    <span>Add User</span>
                  </button>
                </div>
              </div>
              <div className="connector-editor" aria-label="Connector draft editor">
                <label>
                  <span className="micro-label">Company name</span>
                  <input
                    disabled={!managerControlsUnlocked}
                    value={connectorDraft.companyName}
                    onChange={(event) =>
                      setConnectorDraft((draft) => ({
                        ...draft,
                        companyName: event.target.value,
                      }))
                    }
                    placeholder="Company name"
                  />
                </label>
                <label>
                  <span className="micro-label">Short name</span>
                  <input
                    disabled={!managerControlsUnlocked}
                    value={connectorDraft.companyShortName}
                    onChange={(event) =>
                      setConnectorDraft((draft) => ({
                        ...draft,
                        companyShortName: event.target.value,
                      }))
                    }
                    placeholder="Register label"
                  />
                </label>
                <label>
                  <span className="micro-label">Website host or URL</span>
                  <input
                    disabled={!managerControlsUnlocked}
                    value={connectorDraft.siteUrl}
                    onChange={(event) =>
                      setConnectorDraft((draft) => ({
                        ...draft,
                        siteUrl: event.target.value,
                      }))
                    }
                    placeholder="company.example.com"
                  />
                </label>
                <label>
                  <span className="micro-label">Local sync server URL</span>
                  <input
                    disabled={!managerControlsUnlocked}
                    value={connectorDraft.localSyncServerUrl}
                    onChange={(event) =>
                      setConnectorDraft((draft) => ({
                        ...draft,
                        localSyncServerUrl: event.target.value,
                      }))
                    }
                    placeholder="http://127.0.0.1:8787"
                  />
                </label>
                <label>
                  <span className="micro-label">Environment</span>
                  <select
                    disabled={!managerControlsUnlocked}
                    value={connectorDraft.environment}
                    onChange={(event) =>
                      setConnectorDraft((draft) => ({
                        ...draft,
                        environment: event.target.value as ConnectorProfileDraft["environment"],
                      }))
                    }
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </label>
                <label>
                  <span className="micro-label">ScryDex label</span>
                  <input
                    disabled={!managerControlsUnlocked}
                    value={connectorDraft.scrydexTeamLabel}
                    onChange={(event) =>
                      setConnectorDraft((draft) => ({
                        ...draft,
                        scrydexTeamLabel: event.target.value,
                      }))
                    }
                    placeholder="Configured in WordPress"
                  />
                </label>
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    disabled={!managerControlsUnlocked}
                    checked={connectorDraft.canonicalInventoryWritesEnabled}
                    onChange={(event) =>
                      setConnectorDraft((draft) => ({
                        ...draft,
                        canonicalInventoryWritesEnabled: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    <strong>Guarded inventory holds</strong>
                    <small>Staging route-connected canonical execution</small>
                  </span>
                </label>
              </div>
              {connectorDraftIssues.length > 0 ? (
                <ul className="connector-issues">
                  {connectorDraftIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
              <div className="pairing-panel" aria-live="polite">
                <label htmlFor="pairing-code">
                  <span className="micro-label">Pairing code</span>
                  <input
                    id="pairing-code"
                    type="password"
                    autoComplete="off"
                    disabled={!managerControlsUnlocked}
                    value={pairingCode}
                    onChange={(event) => setPairingCode(event.target.value)}
                    placeholder="Manager code"
                  />
                </label>
                <button type="button" disabled={!managerControlsUnlocked} onClick={handlePairingPreview}>
                  <Icon name="check" />
                  <span>Prepare Pairing</span>
                </button>
                <button
                  type="button"
                  disabled={!managerControlsUnlocked || pairingRouteCheck.status === "loading"}
                  onClick={() => void handleCheckPairingRoute()}
                >
                  <Icon name="link" />
                  <span>
                    {pairingRouteCheck.status === "loading"
                      ? "Checking Route"
                      : "Check Pairing Route"}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!managerControlsUnlocked || pairingTokenRequest.status === "loading"}
                  onClick={() => void handlePairDevice()}
                >
                  <Icon name="link" />
                  <span>
                    {pairingTokenRequest.status === "loading" ? "Pairing Device" : "Pair Device"}
                  </span>
                </button>
                <small>
                  {pairingPlan
                    ? `${pairingPlan.pairingCodeProvided ? "Code present" : "Code missing"}; ${pairingPlan.requestedScopes.length} scopes; token storage ${pairingPlan.tokenStorage}; code fingerprint ${pairingPlan.pairingCodeFingerprint}.`
                    : "No token request is sent until live pairing is enabled."}
                </small>
                <small>
                  Desktop secure store: {secureStoreSummary}; raw tokens returned to UI: no.
                </small>
                <small>
                  Paired device: {activePairedDevice ? activePairedDevice.devicePublicId : "none"};
                  token status {activePairedDevice?.tokenStatus ?? "missing"};
                  raw token stored in browser: no.
                </small>
                <small>
                  Pairing route check: {pairingRouteCheck.status}; {pairingRouteCheck.detail}
                  {pairingRouteCheck.endpoint ? ` ${pairingRouteCheck.method} ${pairingRouteCheck.endpoint}` : ""}
                  ; raw code sent: no; credentials synced to app: no.
                </small>
                <small>
                  Device pairing request: {pairingTokenRequest.status}; {pairingTokenRequest.detail}
                  {pairingTokenRequest.endpoint ? ` ${pairingTokenRequest.method} ${pairingTokenRequest.endpoint}` : ""}
                  ; raw token returned to UI: no; credentials synced to app: no.
                </small>
                {activePreparedPairingRequests.length > 0 ? (
                  <div className="prepared-pairing-list" aria-label="Prepared pairing requests">
                    {activePreparedPairingRequests.map((request) => (
                      <div key={request.id}>
                        <strong>{request.companyName}</strong>
                        <span>
                          {request.method} {request.path}
                        </span>
                        <small>
                          {request.requestedScopes.join(", ")}; token storage {request.tokenStorage};
                          fingerprint {request.pairingCodeFingerprint}; raw code not stored.
                        </small>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="connector-actions">
                <button type="button" disabled={!managerControlsUnlocked} onClick={handleNewConnectorDraft}>
                  <Icon name="plus" />
                  <span>Reset Website Setup</span>
                </button>
                <button
                  type="button"
                  disabled={!managerControlsUnlocked || connectorManifestFetch.status === "loading"}
                  onClick={() => void handleTestWebsiteConnector()}
                >
                  <Icon name="link" />
                  <span>
                    {connectorManifestFetch.status === "loading"
                      ? "Testing Website"
                      : "Test Website Connector"}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!managerControlsUnlocked}
                  onClick={handleValidateLocalConnectorPreview}
                >
                  <Icon name="database" />
                  <span>Validate Local Preview</span>
                </button>
                <button
                  type="button"
                  disabled={!managerControlsUnlocked || lanSetupProbe.status === "loading"}
                  onClick={() => void handleProbeLanSetup()}
                >
                  <Icon name="database" />
                  <span>{lanSetupProbe.status === "loading" ? "Probing LAN" : "Probe LAN Server"}</span>
                </button>
                <button type="button" disabled={!managerControlsUnlocked} onClick={handleSaveConnectorDraft}>
                  <Icon name="check" />
                  <span>Save Website Connection</span>
                </button>
              </div>
            </section>

            <section className="credit-panel" aria-label="Customer credit snapshot" ref={creditPanelRef}>
              <div>
                <span className="micro-label">{customerCredit.label}</span>
                <h2>
                  {formatMoney(
                    displayedCreditMinorUnits,
                    customerCredit.currency,
                  )}
                </h2>
              </div>
              <p>{customerCredit.note}</p>
              <div
                className="customer-credit-selector"
                aria-label="Offline customer credit account selector"
              >
                <label htmlFor="customer-credit-account">
                  <span className="micro-label">Customer account</span>
                  <select
                    id="customer-credit-account"
                    value={customerCredit.customerId}
                    onChange={(event) => handleCustomerCreditSelection(event.target.value)}
                  >
                    {customerCreditDirectory.map((credit) => (
                      <option key={credit.customerId} value={credit.customerId}>
                        {customerCreditDisplayName(credit)} -{" "}
                        {formatMoney(
                          customerCreditAvailableAfterPending(
                            credit,
                            Math.max(
                              pendingCreditByCustomer[credit.customerId] ?? 0,
                              customerCreditPendingMinorUnitsFromOperations(
                                queuedOperations,
                                credit.customerId,
                              ),
                            ),
                          ),
                          credit.currency,
                        )}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="micro-label">Lookup</span>
                  <strong>
                    {customerCredit.customerLookup ?? `Customer #${customerCredit.customerId}`}
                  </strong>
                  <small>{activeCustomerName}; holds are local until accepted sync.</small>
                </div>
              </div>
              <div className="credit-redemption-control" aria-label="Create local customer">
                <label htmlFor="new-customer-first-name">
                  <span className="micro-label">New customer</span>
                  <input
                    id="new-customer-first-name"
                    value={newCustomerFirstName}
                    onChange={(event) => setNewCustomerFirstName(event.target.value)}
                    placeholder="First name"
                  />
                </label>
                <label htmlFor="new-customer-last-name">
                  <span className="micro-label">Last name</span>
                  <input
                    id="new-customer-last-name"
                    value={newCustomerLastName}
                    onChange={(event) => setNewCustomerLastName(event.target.value)}
                    placeholder="Last name"
                  />
                </label>
                <label htmlFor="new-customer-email">
                  <span className="micro-label">Email</span>
                  <input
                    id="new-customer-email"
                    inputMode="email"
                    value={newCustomerEmail}
                    onChange={(event) => setNewCustomerEmail(event.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
                <div>
                  <span className="micro-label">LAN customer queue</span>
                  <strong>Website acceptance pending</strong>
                  <button type="button" onClick={() => void handleCreateCustomer()}>
                    <Icon name="plus" />
                    <span>Create Customer</span>
                  </button>
                </div>
              </div>
              <div className="credit-redemption-control" aria-label="Customer credit redemption amount">
                <label htmlFor="square-ticket-total">
                  <span className="micro-label">Square ticket total</span>
                  <input
                    id="square-ticket-total"
                    inputMode="decimal"
                    value={squareSaleTotalInput}
                    onBlur={() => {
                      const parsed = creditRedemptionInputToMinorUnits(squareSaleTotalInput)

                      if (parsed !== null) {
                        setSquareSaleTotalInput(creditRedemptionInputFromMinorUnits(parsed))
                      }
                    }}
                    onChange={(event) =>
                      setSquareSaleTotalInput(moneyInputDraftWithTwoDecimals(event.target.value))
                    }
                    placeholder="0.00"
                  />
                </label>
                <div>
                  <span className="micro-label">Ticket shortcuts</span>
                  <strong>
                    {squareSaleTotalIssue
                      ? "Ticket total needed"
                      : formatMoney(squareSaleTotalMinorUnits ?? 0, customerCredit.currency)}
                  </strong>
                  <small>
                    Use the full Square ticket total before applying Pug Store Credit.
                  </small>
                  <div className="square-ticket-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setSquareSaleTotalInput(
                          creditRedemptionInputFromMinorUnits(selectedItem.priceMinorUnits),
                        )
                      }
                    >
                      <Icon name="tag" />
                      <span>Selected Card</span>
                    </button>
                    <button
                      type="button"
                      disabled={kioskCartTotalMinorUnits <= 0}
                      onClick={() =>
                        setSquareSaleTotalInput(
                          creditRedemptionInputFromMinorUnits(kioskCartTotalMinorUnits),
                        )
                      }
                    >
                      <Icon name="queue" />
                      <span>Kiosk Cart</span>
                    </button>
                  </div>
                  {squareSaleTotalIssue ? <small>{squareSaleTotalIssue}</small> : null}
                </div>
                <label htmlFor="credit-redemption-amount">
                  <span className="micro-label">Redemption amount</span>
                  <input
                    id="credit-redemption-amount"
                    inputMode="decimal"
                    value={creditRedemptionInput}
                    onBlur={() => {
                      const parsed = creditRedemptionInputToMinorUnits(creditRedemptionInput)

                      if (parsed !== null) {
                        setCreditRedemptionInput(creditRedemptionInputFromMinorUnits(parsed))
                      }
                    }}
                    onChange={(event) =>
                      setCreditRedemptionInput(moneyInputDraftWithTwoDecimals(event.target.value))
                    }
                    placeholder="0.00"
                  />
                </label>
                <div>
                  <span className="micro-label">Ready to stage</span>
                  <strong>{creditRedemptionIssue ? "Needs amount" : creditRedemptionAmountLabel}</strong>
                  <small>
                    Available after local holds: {formatMoney(displayedCreditMinorUnits, customerCredit.currency)}
                  </small>
                  {creditRedemptionIssue ? <small>{creditRedemptionIssue}</small> : null}
                </div>
              </div>
              <div className="credit-redemption-control" aria-label="Manager customer credit add">
                <label htmlFor="credit-adjustment-amount">
                  <span className="micro-label">Manager credit add</span>
                  <input
                    id="credit-adjustment-amount"
                    inputMode="decimal"
                    value={creditAdjustmentInput}
                    onBlur={() => {
                      const parsed = creditRedemptionInputToMinorUnits(creditAdjustmentInput)

                      if (parsed !== null) {
                        setCreditAdjustmentInput(creditRedemptionInputFromMinorUnits(parsed))
                      }
                    }}
                    onChange={(event) =>
                      setCreditAdjustmentInput(moneyInputDraftWithTwoDecimals(event.target.value))
                    }
                    placeholder="0.00"
                  />
                </label>
                <label htmlFor="credit-adjustment-reason">
                  <span className="micro-label">Reason</span>
                  <input
                    id="credit-adjustment-reason"
                    value={creditAdjustmentReason}
                    onChange={(event) => setCreditAdjustmentReason(event.target.value)}
                    placeholder="Manager-approved store credit"
                  />
                </label>
                <div>
                  <span className="micro-label">Approval</span>
                  <strong>{managerControlsUnlocked ? "Manager unlocked" : "Manager PIN required"}</strong>
                  {creditAdjustmentIssue ? <small>{creditAdjustmentIssue}</small> : null}
                  <button
                    type="button"
                    disabled={!managerControlsUnlocked}
                    onClick={() => void handleCreditAdjustment()}
                  >
                    <Icon name="check" />
                    <span>Add Credit</span>
                  </button>
                </div>
              </div>
              <div className="square-credit-handoff" aria-label="Square POS credit handoff">
                <div>
                  <span className="micro-label">Square POS handoff</span>
                  <strong>
                    {formatMoney(squareCreditHandoffPlan.squareAmountDueMinorUnits, squareCreditHandoffPlan.currency)}
                    {" "}due in Square
                  </strong>
                  <small>{squareCreditHandoffPlan.squareInstruction}</small>
                </div>
                <div>
                  <span className="micro-label">Credit authority</span>
                  <strong>{squareCreditHandoffPlan.squarePaymentMethodLabel}</strong>
                  <small>
                    Pug ledger authority: yes; Square credit-balance authority: no;
                    sync required for ledger posting: yes.
                  </small>
                </div>
                <label htmlFor="square-receipt-reference">
                  <span className="micro-label">Square receipt/ref</span>
                  <input
                    id="square-receipt-reference"
                    value={squareReceiptReference}
                    onBlur={() => setSquareReceiptReference(cleanSquareReceiptReference)}
                    onChange={(event) => setSquareReceiptReference(event.target.value)}
                    placeholder="Receipt, ticket, or transaction ID"
                  />
                  {squareReceiptReferenceIssue ? <small>{squareReceiptReferenceIssue}</small> : null}
                </label>
                <label className="square-confirmation-check" htmlFor="square-cashier-confirmed">
                  <input
                    id="square-cashier-confirmed"
                    type="checkbox"
                    checked={squareCashierConfirmed}
                    onChange={(event) => setSquareCashierConfirmed(event.target.checked)}
                  />
                  <span>
                    Cashier confirmed Pug Store Credit was applied in Square before staging.
                  </span>
                </label>
                <ol className="square-credit-checklist">
                  <li>
                    Ring the full ticket in Square for{" "}
                    <strong>
                      {formatMoney(squareCreditHandoffPlan.saleTotalMinorUnits, squareCreditHandoffPlan.currency)}
                    </strong>
                    .
                  </li>
                  <li>
                    Record{" "}
                    <strong>
                      {formatMoney(
                        squareCreditHandoffPlan.creditRedeemedMinorUnits,
                        squareCreditHandoffPlan.currency,
                      )}
                    </strong>{" "}
                    as {squareCreditHandoffPlan.squarePaymentMethodLabel}.
                  </li>
                  <li>
                    Collect{" "}
                    <strong>
                      {formatMoney(
                        squareCreditHandoffPlan.squareAmountDueMinorUnits,
                        squareCreditHandoffPlan.currency,
                      )}
                    </strong>{" "}
                    with the customer's remaining tender in Square.
                  </li>
                  <li>
                    Sync keeps WordPress as the final customer-credit ledger authority.
                  </li>
                </ol>
              </div>
              {showCreditLedger ? (
                <div className="ledger-preview" aria-label="Offline credit ledger preview">
                  <div className="ledger-summary-card">
                    <span>Pending local hold</span>
                    <strong>
                      {formatMoney(
                        pendingCreditMinorUnits,
                        customerCredit.currency,
                      )}
                    </strong>
                  </div>
                  <div className="ledger-summary-card">
                    <span>Cached balance after hold</span>
                    <strong>
                      {formatMoney(
                        displayedCreditMinorUnits,
                        customerCredit.currency,
                      )}
                    </strong>
                  </div>
                  <div
                    className="credit-ledger-entry-list"
                    aria-label="Selected customer credit ledger entries"
                  >
                    <span>Ledger entries</span>
                    {visibleCustomerCreditLedgerEntries.length > 0 ? (
                      visibleCustomerCreditLedgerEntries.map((entry) => (
                        <article
                          className={`credit-ledger-entry ${entry.status}`}
                          key={entry.entryId}
                        >
                          <div>
                            <strong>{entry.description}</strong>
                            <small>
                              {entry.occurredAtLabel}; {entry.sourceLabel}
                              {entry.operationId ? `; ${entry.operationId}` : ""}
                            </small>
                          </div>
                          <div>
                            <strong>
                              {formatMoney(entry.amountMinorUnits, entry.currency)}
                            </strong>
                            <small>
                              Balance {formatMoney(entry.balanceAfterMinorUnits, entry.currency)}
                            </small>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p>No cached ledger entries for this customer yet.</p>
                    )}
                  </div>
                </div>
              ) : null}
              <div className="credit-actions">
                <button type="button" onClick={() => void handleCreditRedemption()}>
                  <Icon name="tag" />
                  <span>Stage Credit Use</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreditLedger(true)
                    setActiveSection("Customers")
                    setActivityMessage({
                      title: "Ledger review opened",
                      detail:
                        "Cached credit balance, manager approval, and website ledger replay are ready for the next paired sync.",
                    })
                  }}
                >
                  <Icon name="history" />
                  <span>Review Ledger</span>
                </button>
              </div>
            </section>
          </section>
        </section>
      </div>
    </main>
  )
}
