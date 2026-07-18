import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MutableRefObject } from "react"

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
  signedMoneyInputFromMinorUnits,
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
  type InventoryProductTypeFilter,
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
  type LocalSyncCustomerProfileResult,
  type LocalSyncDeviceHeartbeatResult,
  type LocalSyncDeviceStatusResult,
  type LocalSyncEventSnapshot,
  type LocalSyncAutoSyncOperationResult,
  type LocalSyncCheckoutTransaction,
  type LocalSyncFulfillmentNotificationSettings,
  type LocalSyncFulfillmentOrder,
  type LocalSyncFulfillmentOrderStatus,
  type LocalSyncGradedProviderStatus,
  type LocalSyncGradedValuation,
  type LocalSyncInventoryItem,
  type LocalSyncKioskOrder,
  type LocalSyncKioskOrderStatus,
  type LocalSyncManagerReportResult,
  type LocalSyncPullResult,
  type LocalSyncPriceReviewItem,
  type LocalSyncPushResult,
  type LocalSyncReportKey,
  type LocalSyncResult,
  type LocalSyncSetupStatusResult,
  type LocalSyncSquarePosInventoryCountReconciliationResult,
  type LocalSyncSquarePosInventoryPullPlanResult,
  type LocalSyncSquareTerminalDeviceCodeResult,
  type LocalSyncSquareTerminalStatusResult,
  type LocalSyncScryDexCard,
  type LocalSyncScryDexPricePoint,
  type LocalSyncScryDexVariant,
  type LocalSyncStatusResult,
  type LocalSyncTradeInItem,
  type LocalSyncTradeInOrder,
  type LocalSyncTradeInOrderStatusUpdateResult,
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
import {
  createTauriLocalSyncDiscoveryAdapter,
  type LocalSyncDiscoveredServer,
} from "./data/tauriLocalSyncDiscoveryAdapter"
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
  | "minus"
  | "database"
  | "link"
  | "check"
  | "tag"
  | "copy"
  | "close"
  | "trash"

type ViewMode = "list" | "grid"
type AppSessionRole = "locked" | "staff" | "manager" | "owner"
type InventoryVisibility = LocalSyncInventoryItem["online_visibility"]
const INVENTORY_STATUS_FILTERS = [
  "all",
  "available",
  "pending_intake",
  "reserved",
  "sold",
  "return_review",
  "damaged",
  "removed",
  "conflict",
] as const
const INVENTORY_PRODUCT_TYPE_FILTERS: Array<{ value: InventoryProductTypeFilter; label: string }> = [
  { value: "all", label: "All inventory" },
  { value: "raw", label: "Singles" },
  { value: "graded", label: "Graded Cards" },
]
const SCRYDEX_SYNC_GAMES: Array<{ value: LocalSyncScryDexCard["game"]; label: string }> = [
  { value: "pokemon", label: "Pokemon" },
  { value: "magicthegathering", label: "Magic: The Gathering" },
  { value: "lorcana", label: "Lorcana" },
  { value: "onepiece", label: "One Piece" },
  { value: "gundam", label: "Gundam" },
  { value: "riftbound", label: "Riftbound" },
]
const SCRYDEX_GAME_LABELS: Record<string, string> = Object.fromEntries(
  SCRYDEX_SYNC_GAMES.map((game) => [game.value, game.label]),
)
const INVENTORY_VISIBILITY_OPTIONS: Array<{ value: InventoryVisibility; label: string }> = [
  { value: "visible", label: "Visible" },
  { value: "staff_only", label: "Staff only" },
  { value: "hidden", label: "Hidden" },
]
const TRADE_IN_PERCENTAGE_OPTIONS = Array.from({ length: 21 }, (_, index) => index * 500)
const REPORT_OPTIONS: Array<{ key: LocalSyncReportKey; label: string; focus: string }> = [
  { key: "sales", label: "Sales", focus: "Online vs in-store, gross/net, channel mix" },
  { key: "inventory", label: "Inventory", focus: "Value, sell-through, aging, stock risk" },
  { key: "trade_ins", label: "Trade-Ins", focus: "Employee intake, cash vs credit, conversion" },
  { key: "customers", label: "Customers", focus: "Credit balances, activity, top customers" },
  { key: "fulfillment", label: "Fulfillment", focus: "Pickup queue timing and staff completion" },
  { key: "square_reconciliation", label: "Square/POS", focus: "POS sales, mappings, reconciliation" },
  { key: "scrydex", label: "ScryDex", focus: "Sync history, price changes, failed pulls" },
  { key: "audit", label: "Audit", focus: "Overrides, ledger corrections, staff actions" },
]
const DEFAULT_FULFILLMENT_NOTIFICATION_SETTINGS: LocalSyncFulfillmentNotificationSettings = {
  audio_enabled: true,
  notification_sound_url: "",
  employee_only: true,
  ready_pickup_email_enabled: true,
  source: "employee_app_default",
  credentials_synced_to_client: false,
  raw_credentials_returned: false,
}
const ACCESS_SECTIONS = [
  "Inventory",
  "Trade-Ins",
  "ScryDex",
  "Price Review",
  "Checkout",
  "Kiosk",
  "Queue",
  "Events",
  "Customers",
  "Reports",
  "Sync",
  "Status",
  "Conflicts",
  "Settings",
] as const
type AccessSection = (typeof ACCESS_SECTIONS)[number]
const HIDDEN_NORMAL_NAV_SECTIONS = new Set<string>(["Checkout"])
const OFFLINE_APP_VERSION = "0.202.22"
const OFFLINE_DEMO_PIN_FALLBACK_ENABLED = import.meta.env.DEV === true

type OfflineAppUser = {
  id: string
  name: string
  pin: string
  role: Exclude<AppSessionRole, "locked">
  access: AccessSection[]
}

type KioskTicketStatus = LocalSyncKioskOrderStatus
type WebsitePickupTicketStatus = LocalSyncFulfillmentOrderStatus

type KioskTicketItem = {
  publicId: string
  pickIds?: string[]
  cardName: string
  setName: string
  condition: string
  barcode: string
  location: string
  price: string
}

type KioskOrderTicket = {
  orderId: string
  customerName: string
  customerPublicId: string
  customerLookup: string
  itemCount: number
  totalMinorUnits: number
  totalLabel: string
  items: KioskTicketItem[]
  reservationIds: string[]
  createdAtUtc: string
  status: KioskTicketStatus
  paymentStatus: "pay_at_store" | "paid"
  squareReceiptReference: string
  paidAtUtc: string
  holdExpiresAtUtc: string
  holdSecondsRemaining: number
  pickedItemIds: string[]
  allItemsPicked: boolean
}

type WebsitePickupTicket = {
  orderId: number
  orderNumber: string
  customerName: string
  itemCount: number
  totalMinorUnits: number
  totalLabel: string
  items: KioskTicketItem[]
  reservationIds: string[]
  createdAtUtc: string
  paidAtUtc: string
  status: WebsitePickupTicketStatus
  orderStatus: string
  source: "wordpress" | "queued"
  pickedItemIds: string[]
  allItemsPicked: boolean
}

type ActiveFulfillmentTicket =
  | { source: "kiosk"; orderId: string }
  | { source: "website"; orderId: number }

type CheckoutCustomerMode = "guest" | "customer"
type CheckoutReceiptDelivery = "print" | "email" | "both"
type CheckoutTenderMode = "card" | "cash" | "split"
type LiveCardScanMode = "inventory" | "trade-in"

type CheckoutCartLine = {
  lineId: string
  type: "inventory" | "misc" | "kiosk"
  inventoryPublicId?: string
  barcode?: string
  cardName: string
  setName?: string
  condition?: string
  location?: string
  quantity: number
  unitPriceMinorUnits: number
  totalMinorUnits: number
  sourceOrderId?: string
}

type TradeInPayoutType = "cash" | "credit"

type TradeInDraftItem = {
  id: string
  productType: "raw" | "graded"
  cardName: string
  setName: string
  condition: string
  gradingCompany: string
  grade: string
  certNumber: string
  marketMidMinorUnits: number
  percentageBasisPoints: number
  finalValueMinorUnits: number
  finalValueManuallySet?: boolean
  payoutType: TradeInPayoutType
  imageUrl: string
  providerCardId?: string
  referenceVariantId?: number | null
  providerVariantId?: string
  game?: LocalSyncScryDexCard["game"]
  setCode?: string
  cardNumber?: string
  printedNumber?: string
  variant?: string
  finish?: string
  language?: string
  backImageUrl?: string
  priceObservedAtUtc?: string | null
  priceSource?: string
}

type ActivityMessage = {
  title: string
  detail: string
}

type LocalSyncFailure = Extract<LocalSyncResult, { status: "blocked" | "unavailable" }>

function localSyncErrorDetail(result: LocalSyncFailure) {
  const code = result.status === "blocked" ? result.code.trim() : ""
  const message = result.message.trim()

  return code ? `${message} (${code})` : message
}

function tradeInDraftSetLabel(item: Pick<TradeInDraftItem, "setName" | "setCode" | "printedNumber" | "cardNumber">) {
  return item.setName.trim() || item.setCode?.trim() || item.printedNumber?.trim() || item.cardNumber?.trim() || "Set pending"
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

type ManagerReportSummaryCard = {
  label: string
  value: string
  detail: string
  tone?: StatusTone
}

type ManagerReportChart = {
  key: string
  label: string
  type: string
  format: string
  labels: string[]
  series: Array<{
    label: string
    values: number[]
  }>
}

type ValuationLink = {
  label: string
  href: string
}

type TradeInMarketValuation = {
  marketMinorUnits: number
  currency: string
  pricePoint: LocalSyncScryDexPricePoint | null
  secondaryValuation: LocalSyncGradedValuation | null
  sourceLabel: string
  detail: string
  tone: StatusTone
  links: ValuationLink[]
  exactGradeMatch: boolean
  usingFallback: boolean
  secondaryProviderStatus: string
  baseReferenceMinorUnits: number
}

type LanSyncLastResult = {
  generatedAtLabel: string
  pullMessage: string
  pushMessage: string
}

type LocalSyncDiscoveryState = {
  status: "idle" | "searching" | "ready" | "blocked"
  detail: string
  servers: LocalSyncDiscoveredServer[]
  rawCredentialsReturned: false
  credentialsSyncedToApp: false
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

type InventoryUpdateOptions = Parameters<typeof buildInventoryUpdateOperation>[1] & {
  quantityOnHand?: number
}

type ConflictReviewStorageRestoreResult = {
  openConflicts: ConflictItem[]
  reviewedConflicts: ConflictItem[]
  restored: boolean
  issues: string[]
}

const CONFLICT_REVIEW_STORAGE_KEY_PREFIX = "pug-offline-conflict-review:"
const EMPLOYEE_ORDER_SOUND_STORAGE_KEY = "pug-employee-order-notification-sound:v1"
const MAX_EMPLOYEE_ORDER_SOUND_BYTES = 1.5 * 1024 * 1024

type EmployeeOrderSoundSettings = {
  enabled: boolean
  soundDataUrl: string
  soundFileName: string
  savedAtUtc: string
}

function defaultEmployeeOrderSoundSettings(): EmployeeOrderSoundSettings {
  return {
    enabled: true,
    soundDataUrl: "",
    soundFileName: "",
    savedAtUtc: "",
  }
}

function loadEmployeeOrderSoundSettings(): EmployeeOrderSoundSettings {
  const fallback = defaultEmployeeOrderSoundSettings()

  if (typeof window === "undefined") {
    return fallback
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(EMPLOYEE_ORDER_SOUND_STORAGE_KEY) ?? "null",
    ) as Partial<EmployeeOrderSoundSettings> | null

    if (!parsed || typeof parsed !== "object") {
      return fallback
    }

    return {
      enabled: parsed.enabled !== false,
      soundDataUrl: typeof parsed.soundDataUrl === "string" ? parsed.soundDataUrl : "",
      soundFileName: typeof parsed.soundFileName === "string" ? parsed.soundFileName : "",
      savedAtUtc: typeof parsed.savedAtUtc === "string" ? parsed.savedAtUtc : "",
    }
  } catch {
    return fallback
  }
}

function persistEmployeeOrderSoundSettings(settings: EmployeeOrderSoundSettings) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(
      EMPLOYEE_ORDER_SOUND_STORAGE_KEY,
      JSON.stringify({
        enabled: settings.enabled,
        soundDataUrl: settings.soundDataUrl,
        soundFileName: settings.soundFileName,
        savedAtUtc: settings.savedAtUtc,
      }),
    )
  } catch {
    window.localStorage.removeItem(EMPLOYEE_ORDER_SOUND_STORAGE_KEY)
  }
}

function employeeOrderSoundFileIssue(file: File): string {
  const fileName = file.name.toLowerCase()
  const acceptedExtension =
    fileName.endsWith(".mp3") ||
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".m4a") ||
    fileName.endsWith(".wav") ||
    fileName.endsWith(".ogg")
  const acceptedType = file.type.startsWith("audio/") || file.type === "video/mp4"

  if (!acceptedExtension && !acceptedType) {
    return "Choose an MP3, MP4, M4A, WAV, or OGG notification sound."
  }

  if (file.size > MAX_EMPLOYEE_ORDER_SOUND_BYTES) {
    return "Choose a notification sound under 1.5 MB so the employee app can store it locally."
  }

  return ""
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")))
    reader.addEventListener("error", () => reject(reader.error ?? new Error("file_read_failed")))
    reader.readAsDataURL(file)
  })
}

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

function conflictReviewStorageKey(profileId: string): string {
  const cleanProfileId = profileId
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `${CONFLICT_REVIEW_STORAGE_KEY_PREFIX}${cleanProfileId || "default"}`
}

function loadConflictReviewStorage(
  profileId: string,
  seedConflicts: ConflictItem[],
): ConflictReviewStorageRestoreResult {
  if (typeof window === "undefined") {
    return {
      openConflicts: seedConflicts,
      reviewedConflicts: [],
      restored: false,
      issues: [],
    }
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(conflictReviewStorageKey(profileId)) ?? "null",
    ) as {
      action?: string
      schema_version?: number
      profile_id?: string
      resolved_conflict_ids?: unknown[]
      reviewed_conflicts?: unknown[]
      directMysqlAccess?: boolean
      credentialsSyncedToApp?: boolean
    } | null

    if (
      !parsed ||
      parsed.action !== "offline_conflict_review_local_storage" ||
      parsed.schema_version !== 1 ||
      parsed.profile_id !== profileId ||
      parsed.directMysqlAccess !== false ||
      parsed.credentialsSyncedToApp !== false
    ) {
      return {
        openConflicts: seedConflicts,
        reviewedConflicts: [],
        restored: false,
        issues: parsed ? ["conflict_review_storage_invalid"] : [],
      }
    }

    const resolvedIds = new Set(
      (Array.isArray(parsed.resolved_conflict_ids) ? parsed.resolved_conflict_ids : [])
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean),
    )
    const reviewedConflicts = sanitizeStoredConflictItems(parsed.reviewed_conflicts ?? [], seedConflicts)
      .filter((conflict) => resolvedIds.has(conflict.conflictId))
    const reviewedById = new Map(reviewedConflicts.map((conflict) => [conflict.conflictId, conflict]))
    const seedReviewed = seedConflicts
      .filter((conflict) => resolvedIds.has(conflict.conflictId) && !reviewedById.has(conflict.conflictId))

    return {
      openConflicts: seedConflicts.filter((conflict) => !resolvedIds.has(conflict.conflictId)),
      reviewedConflicts: [...reviewedConflicts, ...seedReviewed],
      restored: resolvedIds.size > 0,
      issues: [],
    }
  } catch {
    return {
      openConflicts: seedConflicts,
      reviewedConflicts: [],
      restored: false,
      issues: ["conflict_review_storage_parse_failed"],
    }
  }
}

function sanitizeStoredConflictItems(
  records: unknown[],
  seedConflicts: ConflictItem[],
): ConflictItem[] {
  const seedById = new Map(seedConflicts.map((conflict) => [conflict.conflictId, conflict]))

  if (!Array.isArray(records)) {
    return []
  }

  return records
    .map((record) => {
      if (!record || typeof record !== "object") {
        return null
      }

      const conflictId = typeof (record as { conflictId?: unknown }).conflictId === "string"
        ? (record as { conflictId: string }).conflictId.trim()
        : ""

      if (!conflictId) {
        return null
      }

      return seedById.get(conflictId) ?? (record as ConflictItem)
    })
    .filter((conflict): conflict is ConflictItem => Boolean(conflict))
}

function persistConflictReviewStorage(profileId: string, reviewedConflicts: ConflictItem[]) {
  if (typeof window === "undefined") {
    return
  }

  const resolvedConflictIds = reviewedConflicts
    .map((conflict) => conflict.conflictId)
    .filter(Boolean)

  if (resolvedConflictIds.length === 0) {
    window.localStorage.removeItem(conflictReviewStorageKey(profileId))
    return
  }

  window.localStorage.setItem(
    conflictReviewStorageKey(profileId),
    JSON.stringify({
      action: "offline_conflict_review_local_storage",
      schema_version: 1,
      profile_id: profileId,
      resolved_conflict_ids: resolvedConflictIds,
      reviewed_conflicts: reviewedConflicts,
      saved_at_utc: new Date().toISOString(),
      directMysqlAccess: false,
      credentialsSyncedToApp: false,
    }),
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
    checkout: "M4 6h16M6 6l1.5 12h9L18 6M9 10h6m-5 4h4M8 21h.01M16 21h.01",
    upload: "M12 16V5m0 0-4 4m4-4 4 4M5 19h14",
    history: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5m4-3v6l4 2",
    search: "m20 20-4.2-4.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
    grid: "M5 5h6v6H5V5Zm10 0h4v6h-4V5ZM5 15h6v4H5v-4Zm10 0h4v4h-4v-4Z",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
    database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6m-16 6c0 1.7 3.6 3 8 3s8-1.3 8-3",
    link: "M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10.6 5.3M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.8-.8",
    check: "m5 13 4 4L19 7",
    tag: "M20 13 13 20 4 11V4h7l9 9Zm-11-4h.01",
    copy: "M8 8h10v12H8V8Zm-4 8V4h10",
    close: "M6 6l12 12M18 6 6 18",
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

function scryDexCatalogJobRecord(job: unknown): Record<string, unknown> {
  return job && typeof job === "object" ? (job as Record<string, unknown>) : {}
}

function scryDexCatalogJobGame(job: unknown) {
  const record = scryDexCatalogJobRecord(job)
  const games = Array.isArray(record.games) ? record.games : []
  const firstGame = games[0] && typeof games[0] === "object" ? (games[0] as Record<string, unknown>) : {}

  return String(record.game ?? firstGame.game ?? "")
}

function scryDexCatalogJobGames(job: unknown) {
  const record = scryDexCatalogJobRecord(job)
  const games = Array.isArray(record.games) ? record.games : []

  return games.filter((game): game is Record<string, unknown> => Boolean(game) && typeof game === "object")
}

function scryDexCatalogJobIncludesGame(job: unknown, game: string) {
  const target = String(game ?? "")
  const direct = scryDexCatalogJobGame(job)

  return direct === target || scryDexCatalogJobGames(job).some((entry) => String(entry.game ?? "") === target)
}

function scryDexCatalogJobLabel(job: unknown) {
  const game = scryDexCatalogJobGame(job)
  const record = scryDexCatalogJobRecord(job)

  return String(record.game_label ?? SCRYDEX_GAME_LABELS[game] ?? (game || "ScryDex"))
}

function scryDexCatalogJobStage(job: unknown) {
  const record = scryDexCatalogJobRecord(job)
  const games = Array.isArray(record.games) ? record.games : []
  const firstGame = games[0] && typeof games[0] === "object" ? (games[0] as Record<string, unknown>) : {}

  return String(record.stage ?? firstGame.message ?? record.action ?? record.status ?? "queued")
}

function scryDexCatalogJobCount(job: unknown, key: string, fallbackKey = "") {
  const record = scryDexCatalogJobRecord(job)
  const value = record[key] ?? (fallbackKey ? record[fallbackKey] : undefined)
  const parsed = Number.parseInt(String(value ?? "0"), 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function scryDexNestedRecord(source: unknown, path: string[]) {
  let current: unknown = source

  for (const key of path) {
    const record = scryDexCatalogJobRecord(current)
    current = record[key]
  }

  return scryDexCatalogJobRecord(current)
}

function scryDexNestedCount(source: unknown, path: string[]) {
  const key = path.at(-1)
  const parent = scryDexNestedRecord(source, path.slice(0, -1))
  const parsed = Number.parseInt(String((key ? parent[key] : undefined) ?? "0"), 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function inventoryAbsoluteQuantityFromInput(value: string) {
  const trimmed = value.trim()

  if (!/^\d+$/.test(trimmed)) {
    return null
  }

  const parsed = Number.parseInt(trimmed, 10)

  return Number.isFinite(parsed) ? Math.min(999999, Math.max(0, parsed)) : null
}

function scryDexProgressNumber(source: Record<string, unknown>, key: string) {
  const parsed = Number.parseInt(String(source[key] ?? "0"), 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function scryDexGameProgressMetric(gameRow: Record<string, unknown>, jobRecord: Record<string, unknown>, key: string) {
  return scryDexProgressNumber(gameRow, key) || scryDexProgressNumber(jobRecord, key)
}

function scryDexGamePhaseLabel(gameRow: Record<string, unknown>, jobRecord: Record<string, unknown>) {
  const phase = String(gameRow.phase ?? jobRecord.downstream_phase ?? jobRecord.phase ?? "").replaceAll("_", " ")
  const status = String(gameRow.status ?? jobRecord.status ?? "idle").replaceAll("_", " ")

  return phase || status
}

function scryDexInventoryRepriceRecord(job: unknown) {
  const direct = scryDexCatalogJobRecord(job).inventory_reprice
  if (direct && typeof direct === "object") {
    return direct as Record<string, unknown>
  }

  return scryDexNestedRecord(job, ["result", "inventory_reprice"])
}

function scryDexCatalogPullRecord(job: unknown) {
  const direct = scryDexCatalogJobRecord(job).catalog_pull
  if (direct && typeof direct === "object") {
    return direct as Record<string, unknown>
  }

  return scryDexNestedRecord(job, ["result", "catalog_pull"])
}

function scryDexJobStatus(job: unknown) {
  return String(scryDexCatalogJobRecord(job).status ?? "idle")
}

function scryDexRunSourceLabel(job: unknown) {
  const source = String(
    scryDexCatalogJobRecord(job).run_source ?? scryDexCatalogJobRecord(job).source ?? scryDexNestedRecord(job, ["result"]).run_source ?? "",
  )

  if (source.includes("daily_middleman_worker")) {
    return "scheduled daily"
  }

  if (source.includes("manager_scrydex_catalog_sync_job")) {
    return "manager manual"
  }

  if (source.includes("webhook")) {
    return "webhook relay"
  }

  if (String(scryDexCatalogJobRecord(job).requested_by_user_name ?? scryDexCatalogJobRecord(job).requested_by_user_id ?? "")) {
    return "manager manual"
  }

  if (scryDexCatalogJobRecord(job).system_job === true || scryDexNestedRecord(job, ["result"]).system_job === true) {
    return "scheduled/system"
  }

  return source ? source.replaceAll("_", " ") : "sync"
}

function scryDexJobTone(job: unknown): StatusTone {
  const status = scryDexJobStatus(job)
  const errors = scryDexCatalogJobRecord(job).errors

  if (["failed", "blocked", "completed_with_errors"].includes(status) || (Array.isArray(errors) && errors.length > 0)) {
    return "blocked"
  }

  if (["running", "queued", "indexing"].includes(status)) {
    return "working"
  }

  return status === "completed" || status === "ok" ? "ready" : "idle"
}

function scryDexJobErrorSummary(job: unknown) {
  const record = scryDexCatalogJobRecord(job)
  const errors = Array.isArray(record.errors) ? record.errors : []
  const firstError = errors[0] && typeof errors[0] === "object" ? (errors[0] as Record<string, unknown>) : null
  const gameError = scryDexCatalogJobGames(job).find((game) => String(game.code ?? game.status ?? "").includes("blocked"))

  return String(
    firstError?.message ??
      firstError?.code ??
      gameError?.message ??
      gameError?.code ??
      record.message ??
      record.code ??
      "",
  )
}

function scryDexJobLiveLogLines(job: unknown) {
  const record = scryDexCatalogJobRecord(job)
  const reprice = scryDexInventoryRepriceRecord(job)
  const catalogPull = scryDexCatalogPullRecord(job)
  const lines: string[] = []
  const label = scryDexCatalogJobLabel(job)
  const status = scryDexJobStatus(job)
  const startedAt = String(record.started_at_utc ?? "")
  const completedAt = String(record.completed_at_utc ?? "")

  if (Object.keys(record).length === 0) {
    return lines
  }

  lines.push(
    `${label}: ${status}; ${scryDexRunSourceLabel(job)}${
      completedAt ? `; completed ${formatUtcLabel(completedAt)}` : startedAt ? `; started ${formatUtcLabel(startedAt)}` : ""
    }`,
  )

  for (const game of scryDexCatalogJobGames(job).slice(0, 6)) {
    const gameName = String(game.game ?? "")
    const gameLabel = SCRYDEX_GAME_LABELS[gameName] ?? gameName
    const gameStatus = String(game.status ?? "unknown")
    const message = String(game.message ?? game.code ?? "")
    lines.push(`${gameLabel}: ${gameStatus}${message ? ` - ${message}` : ""}`)
  }

  if (Object.keys(catalogPull).length > 0) {
    lines.push(
      `Catalog pull: ${catalogPull.status ?? "unknown"}; ${countLabel(Number(catalogPull.row_count ?? 0), "row")}; local cache ${countLabel(
        Number(catalogPull.local_reference_card_count ?? 0),
        "card",
      )}.`,
    )
  }

  if (Object.keys(reprice).length > 0) {
    lines.push(
      `Pricing update: considered ${reprice.considered_count ?? 0}, matched ${reprice.matched_count ?? 0}, changed ${reprice.changed_count ?? 0}, market-only ${reprice.saved_market_only_count ?? 0}, floor-clamped ${reprice.floor_clamped_count ?? 0}.`,
    )
    lines.push(
      `Sync result: WordPress accepted ${reprice.wordpress_accepted_count ?? 0}, retry ${reprice.wordpress_retry_count ?? 0}; Square accepted ${reprice.square_accepted_count ?? 0}, retry ${reprice.square_retry_count ?? 0}.`,
    )
  }

  const errorSummary = scryDexJobErrorSummary(job)
  if (errorSummary) {
    lines.push(`Error: ${errorSummary}`)
  }

  return lines
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

function gameDisplayLabel(value?: string) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "")

  if (["magicthegathering", "magic", "mtg"].includes(normalized)) {
    return "MTG"
  }

  if (normalized === "onepiece") {
    return "One Piece"
  }

  if (!normalized) {
    return "Trading card"
  }

  return String(value)
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
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
        ? "Balance updated in this store. It will be sent to the website when sync is available."
        : "Current store credit balance for this customer.",
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
    balanceBeforeMinorUnits: entry.balance_before_minor_units,
    balanceAfterMinorUnits: entry.balance_after_minor_units,
    currency: entry.currency,
    status: entry.status,
    sourceLabel: entry.status === "pending_sync" ? "Waiting to sync" : "Saved history",
    operationId: entry.entry_id,
    staffUserId: entry.staff_user_id,
    staffUserName: entry.staff_user_name,
    referenceId: entry.reference_id,
    lineItems: entry.line_items.map((line) => ({
      lineItemId: line.line_item_id,
      type: line.type,
      label: line.label,
      amountMinorUnits: line.amount_minor_units,
      referenceId: line.reference_id,
      saleTotalMinorUnits: line.sale_total_minor_units,
      squareReceiptReference: line.square_receipt_reference,
    })),
  }
}

function localSyncCustomerToCreditSnapshot(
  customer: LocalSyncCustomer,
  directory: CustomerCreditSnapshot[],
  fallback: CustomerCreditSnapshot,
): CustomerCreditSnapshot {
  const existing =
    directory.find((credit) => credit.customerPublicId === customer.customer_public_id) ??
    directory.find((credit) => credit.customerId === customer.customer_id)
  const nextFallback =
    existing ??
    {
      ...fallback,
      customerId:
        customer.customer_id ??
        directory.reduce((maxId, credit) => Math.max(maxId, credit.customerId), 0) + 1,
    }

  return customerCreditSnapshotFromLocalSyncCustomer(customer, nextFallback)
}

function managerReportMeta(result: LocalSyncManagerReportResult | null): Record<string, unknown> {
  return result?.status === "ok" && result.meta && typeof result.meta === "object" ? result.meta : {}
}

function managerReportSummaryCards(result: LocalSyncManagerReportResult | null): ManagerReportSummaryCard[] {
  return recordsFromUnknown(managerReportMeta(result).summary_cards).map((card) => ({
    label: stringFromUnknown(card.label, "Report card"),
    value: stringFromUnknown(card.value, "0"),
    detail: stringFromUnknown(card.detail, "Live local report metric."),
    tone: statusToneFromRemoteState(stringFromUnknown(card.tone, "ready")),
  }))
}

function managerReportKpiCards(result: LocalSyncManagerReportResult | null): ManagerReportSummaryCard[] {
  return recordsFromUnknown(managerReportMeta(result).kpi_cards).map((card) => ({
    label: stringFromUnknown(card.label, "KPI"),
    value: stringFromUnknown(card.value, "Ready"),
    detail: stringFromUnknown(card.detail, "Manager KPI."),
    tone: "ready",
  }))
}

function managerReportCharts(result: LocalSyncManagerReportResult | null): ManagerReportChart[] {
  return recordsFromUnknown(managerReportMeta(result).charts).map((chart, index) => ({
    key: stringFromUnknown(chart.key, `chart-${index}`),
    label: stringFromUnknown(chart.label, "Report chart"),
    type: stringFromUnknown(chart.type, "bar"),
    format: stringFromUnknown(chart.format, "number"),
    labels: stringsFromUnknown(chart.labels),
    series: recordsFromUnknown(chart.series).map((series) => ({
      label: stringFromUnknown(series.label, "Series"),
      values: numbersFromUnknown(series.values),
    })),
  }))
}

function managerReportChartMax(chart: ManagerReportChart) {
  return Math.max(1, ...chart.series.flatMap((series) => series.values.map((value) => Math.abs(value))))
}

function managerReportChartValue(value: number, format: string) {
  if (format === "money") {
    return formatMoney(Math.round(value), "USD")
  }

  return new Intl.NumberFormat("en-US").format(value)
}

function managerReportChartPoints(values: number[], max: number) {
  const safeMax = Math.max(1, max)
  const denominator = Math.max(1, values.length - 1)

  return values
    .map((value, index) => {
      const x = 8 + (index / denominator) * 84
      const y = 92 - Math.min(88, Math.round((Math.abs(value) / safeMax) * 84))

      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

function managerReportChartTicks(max: number, format: string) {
  return [1, 0.66, 0.33, 0].map((scale) => managerReportChartValue(Math.round(max * scale), format))
}

function recordsFromUnknown(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : []
}

function stringsFromUnknown(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item ?? "")).filter(Boolean) : []
}

function numbersFromUnknown(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
    : []
}

function stringFromUnknown(value: unknown, fallback: string) {
  const text = String(value ?? "").trim()

  return text || fallback
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

function datetimeLocalValueToUtc(value: string) {
  const timestamp = Date.parse(value)

  if (Number.isNaN(timestamp)) {
    return ""
  }

  return new Date(timestamp).toISOString()
}

function addEventRecurrenceInterval(
  startsAtUtc: string,
  frequency: "none" | "daily" | "weekly" | "monthly",
  index: number,
) {
  const date = new Date(startsAtUtc)

  if (Number.isNaN(date.getTime()) || index <= 0 || frequency === "none") {
    return startsAtUtc
  }

  if (frequency === "daily") {
    date.setUTCDate(date.getUTCDate() + index)
  } else if (frequency === "weekly") {
    date.setUTCDate(date.getUTCDate() + index * 7)
  } else if (frequency === "monthly") {
    date.setUTCMonth(date.getUTCMonth() + index)
  }

  return date.toISOString()
}

function recurringEventTitle(baseTitle: string, startsAtUtc: string, totalOccurrences: number) {
  return totalOccurrences > 1 ? `${baseTitle} - ${formatUtcLabel(startsAtUtc)}` : baseTitle
}

function isActiveEventSnapshot(event: EventSnapshot, nowMs = Date.now()) {
  const startsAtMs = Date.parse(event.startsAtUtc)

  if (!Number.isFinite(startsAtMs)) {
    return true
  }

  const activeWindowMs = 8 * 60 * 60 * 1000

  return startsAtMs + activeWindowMs >= nowMs
}

function eventPriceInputToMinorUnits(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "")
  const parsed = Number.parseFloat(normalized)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0
  }

  return Math.round(parsed * 100)
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
    gradingCompany: item.grading_company ?? "",
    grade: item.grade ?? "",
    certNumber: item.cert_number ?? "",
    condition: item.condition,
    barcode: item.barcode,
    quantityOnHand: item.quantity_on_hand,
    price: formatMoney(item.price_minor_units, item.currency),
    priceMinorUnits: item.price_minor_units,
    minimumSalePriceMinorUnits: item.minimum_sale_price_minor_units,
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

function scryDexVariantQuality(variant: LocalSyncScryDexVariant) {
  return [
    variant.provider_variant_id ? 8 : 0,
    variant.reference_variant_id ? 4 : 0,
    variant.front_image_url ? 2 : 0,
    variant.back_image_url ? 1 : 0,
  ].reduce((total, value) => total + value, 0)
}

function scryDexDisplayVariants(card: LocalSyncScryDexCard | null) {
  const variants = card?.variants ?? []
  const byLabel = new Map<string, LocalSyncScryDexVariant>()

  for (const variant of variants) {
    const label = (formatScryDexVariant(variant) || variant.provider_variant_id || String(variant.reference_variant_id ?? "")).toLowerCase()
    const existing = byLabel.get(label)

    if (!existing || scryDexVariantQuality(variant) > scryDexVariantQuality(existing)) {
      byLabel.set(label, variant)
    }
  }

  return [...byLabel.values()]
}

function scryDexSetFilterValue(card: LocalSyncScryDexCard) {
  return `${card.set_code || "unknown"}::${card.set_name || "Unknown set"}`
}

function scryDexSetOptionsFromCards(cards: LocalSyncScryDexCard[]) {
  const optionsByValue = new Map<string, { value: string; label: string; count: number }>()

  for (const card of cards) {
    const value = scryDexSetFilterValue(card)
    const label = card.set_code
      ? `${card.set_name || "Unknown set"} (${card.set_code})`
      : card.set_name || "Unknown set"
    const existing = optionsByValue.get(value)

    optionsByValue.set(value, {
      value,
      label,
      count: (existing?.count ?? 0) + 1,
    })
  }

  return [...optionsByValue.values()]
    .sort((left, right) => left.label.localeCompare(right.label))
    .map((option) => ({
      value: option.value,
      label: `${option.label} - ${option.count}`,
    }))
}

function scryDexCardMatchesSetFilter(card: LocalSyncScryDexCard, setFilter: string) {
  return !setFilter || scryDexSetFilterValue(card) === setFilter
}

function scryDexCardIdentity(card: LocalSyncScryDexCard) {
  return [
    card.provider_card_id,
    card.game,
    card.card_name,
    card.set_code,
    card.set_name,
    card.card_number,
    card.printed_number,
  ]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .join("::")
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

function isUsdCurrency(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase() === "USD"
}

function pricePointMinorUnits(point: LocalSyncScryDexPricePoint) {
  if (!isUsdCurrency(point.currency)) {
    return 0
  }

  return point.market_price_minor_units ||
    point.mid_price_minor_units ||
    point.low_price_minor_units ||
    point.high_price_minor_units ||
    0
}

function tradeInPricePointMinorUnits(point: LocalSyncScryDexPricePoint) {
  if (!isUsdCurrency(point.currency)) {
    return 0
  }

  return point.mid_price_minor_units ||
    point.market_price_minor_units ||
    point.low_price_minor_units ||
    point.high_price_minor_units ||
    0
}

function normalizedScryDexPriceText(value?: string) {
  return String(value ?? "").trim().toLowerCase()
}

function normalizedScryDexConditionCode(value?: string) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9+\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  const aliases: Record<string, string> = {
    nm: "NM",
    "near mint": "NM",
    nearmint: "NM",
    "near mint or better": "NM",
    "near mint/mint": "NM",
    "near mint mint": "NM",
    lp: "LP",
    "light play": "LP",
    "light played": "LP",
    "lightly played": "LP",
    lightlyplayed: "LP",
    sp: "LP",
    "slightly played": "LP",
    mp: "MP",
    "moderate play": "MP",
    "moderate played": "MP",
    "moderately played": "MP",
    moderatelyplayed: "MP",
    hp: "HP",
    "heavy play": "HP",
    "heavy played": "HP",
    "heavily played": "HP",
    heavilyplayed: "HP",
    dmg: "DMG",
    damaged: "DMG",
    damage: "DMG",
    poor: "DMG",
  }

  return aliases[normalized] ?? String(value ?? "").trim().toUpperCase()
}

function normalizedScryDexGradeText(value?: string) {
  const text = normalizedScryDexPriceText(value)
    .replace(/\b(?:grade|gem mint|mint|near mint|pristine)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const numericMatch = text.match(/\b(?:10(?:\.0)?|[1-9](?:\.\d)?)\b/)
  const numeric = Number(numericMatch?.[0] ?? text)

  if (Number.isFinite(numeric)) {
    return Number.isInteger(numeric) ? String(numeric) : String(numeric)
  }

  return text
}

function normalizedScryDexCompanyText(value?: string) {
  const text = normalizedScryDexPriceText(value)

  if (text.includes("psa")) {
    return "psa"
  }

  if (text.includes("cgc")) {
    return "cgc"
  }

  if (text.includes("bgs") || text.includes("beckett")) {
    return "bgs"
  }

  if (text.includes("sgc")) {
    return "sgc"
  }

  if (text.includes("tag")) {
    return "tag"
  }

  return text
}

function scryDexGradeMatches(left?: string, right?: string) {
  const leftGrade = normalizedScryDexGradeText(left)
  const rightGrade = normalizedScryDexGradeText(right)

  return Boolean(leftGrade && rightGrade && leftGrade === rightGrade)
}

function scryDexCompanyMatches(left?: string, right?: string) {
  const leftCompany = normalizedScryDexCompanyText(left)
  const rightCompany = normalizedScryDexCompanyText(right)

  return Boolean(leftCompany && rightCompany && leftCompany === rightCompany)
}

function scryDexCardSupportsGraded(card: LocalSyncScryDexCard) {
  return (
    card.price_points.some((point) => point.raw_or_graded === "graded") ||
    scryDexDisplayVariants(card).some((variant) => variant.raw_or_graded_support === "graded")
  )
}

function scryDexBestGradedPricePoint(
  card: LocalSyncScryDexCard,
  variant: LocalSyncScryDexVariant | null,
) {
  return bestScryDexPricePoint(card, variant, "", "graded", "", "")
}

function scryDexPricePointSummary(point: LocalSyncScryDexPricePoint | null, preferTradeInMid = false) {
  if (!point) {
    return ""
  }

  const labels = [
    point.raw_or_graded === "graded" ? "Graded" : "Single",
    point.grading_company,
    point.grade ? `Grade ${point.grade}` : "",
    point.condition_code,
  ].filter(Boolean)
  const price = preferTradeInMid ? tradeInPricePointMinorUnits(point) : pricePointMinorUnits(point)

  return `${labels.join(" / ")}${price > 0 ? ` ${formatMoney(price, point.currency)}` : ""}`.trim()
}

function scryDexResultPriceSummary(card: LocalSyncScryDexCard) {
  const firstVariant = scryDexDisplayVariants(card)[0] ?? null
  const rawPoint = bestScryDexPricePoint(card, firstVariant, "NM", "raw", "", "")
  const gradedPoint = scryDexBestGradedPricePoint(card, firstVariant)
  const labels = [
    rawPoint ? `Single ${formatMoney(pricePointMinorUnits(rawPoint), rawPoint.currency)}` : "",
    gradedPoint ? scryDexPricePointSummary(gradedPoint) : "",
  ].filter(Boolean)

  return labels.length > 0
    ? labels.join(" | ")
    : `${formatMoney(card.market_price_minor_units, card.currency)} market`
}

function bestScryDexPricePoint(
  card: LocalSyncScryDexCard,
  variant: LocalSyncScryDexVariant | null,
  condition: string,
  productType: "raw" | "graded",
  gradingCompany: string,
  grade: string,
) {
  const normalizedCondition = normalizedScryDexConditionCode(condition)
  const normalizedCompany = normalizedScryDexCompanyText(gradingCompany)
  const normalizedGrade = normalizedScryDexGradeText(grade)
  const variantProviderId = variant?.provider_variant_id ?? ""
  const variantReferenceId = variant?.reference_variant_id ?? null

  const scored = (card.price_points ?? [])
    .filter((point) => pricePointMinorUnits(point) > 0)
    .map((point) => {
      if (productType === "graded" && point.raw_or_graded !== "graded") {
        return { point, score: -1 }
      }

      if (productType === "raw" && point.raw_or_graded === "graded") {
        return { point, score: -1 }
      }

      const pointVariant = String(point.provider_variant_id ?? "")
      const pointReferenceVariant = point.reference_variant_id ?? null
      const pointCondition = normalizedScryDexConditionCode(point.condition_code)
      const pointCompany = normalizedScryDexCompanyText(point.grading_company)
      const pointGrade = normalizedScryDexGradeText(point.grade)
      let score = 100

      if (variantProviderId !== "" && pointVariant === variantProviderId) {
        score += 40
      }

      if (variantReferenceId !== null && pointReferenceVariant === variantReferenceId) {
        score += 40
      }

      if (normalizedCondition !== "" && pointCondition === normalizedCondition) {
        score += 22
      } else if (pointCondition === "") {
        score += 4
      }

      if (productType === "graded") {
        if (normalizedCompany !== "" && pointCompany === normalizedCompany) {
          score += 26
        } else if (normalizedCompany !== "" && pointCompany !== "") {
          score -= 12
        } else if (pointCompany !== "") {
          score += 4
        }

        if (normalizedGrade !== "" && pointGrade === normalizedGrade) {
          score += 44
        } else if (normalizedGrade !== "" && pointGrade !== "") {
          score -= 36
        } else if (pointGrade !== "") {
          score += 4
        }
      }

      return { point, score }
    })
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score)

  return scored[0]?.point ?? null
}

function valuationSearchQuery(
  card: LocalSyncScryDexCard,
  gradingCompany: string,
  grade: string,
) {
  return [
    card.card_name,
    card.set_name,
    card.printed_number || card.card_number,
    gradingCompany,
    grade ? `grade ${grade}` : "",
    "graded card",
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ")
}

function valuationLinksForCard(
  card: LocalSyncScryDexCard,
  gradingCompany: string,
  grade: string,
): ValuationLink[] {
  const query = valuationSearchQuery(card, gradingCompany, grade)
  const encodedQuery = encodeURIComponent(query)

  return [
    {
      label: "PriceCharting",
      href: `https://www.pricecharting.com/search-products?q=${encodedQuery}`,
    },
    {
      label: "eBay sold",
      href: `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&LH_Complete=1&LH_Sold=1`,
    },
    {
      label: "PSA APR",
      href: "https://www.psacard.com/auctionprices",
    },
    {
      label: "TCGplayer",
      href: `https://www.tcgplayer.com/search/all/product?q=${encodedQuery}`,
    },
  ]
}

function staffSafeSecondaryProviderMessage(providerStatus?: LocalSyncGradedProviderStatus | null) {
  if (!providerStatus) {
    return "No secondary graded comp provider returned a price."
  }

  if (providerStatus.status === "not_configured" || providerStatus.configured === false) {
    return "Secondary graded comp lookup is not configured on this local server. Use Check comps or enter a manual offer."
  }

  if (providerStatus.status === "unsupported_grade") {
    return "Secondary graded comp lookup does not support this grade. Use Check comps or enter a manual offer."
  }

  if (providerStatus.status === "no_match") {
    return "Secondary graded comp lookup did not find a matching slab. Use Check comps or enter a manual offer."
  }

  if (providerStatus.status === "no_price") {
    return "Secondary graded comp lookup matched the card but did not return a price. Use Check comps or enter a manual offer."
  }

  const detail = String(providerStatus.detail || "").trim()
  if (/API token/i.test(detail)) {
    return "Secondary graded comp lookup is not configured on this local server. Use Check comps or enter a manual offer."
  }

  return detail || "No secondary graded comp provider returned a price."
}

function resolveTradeInMarketValuation(
  card: LocalSyncScryDexCard | null,
  variant: LocalSyncScryDexVariant | null,
  condition: string,
  productType: "raw" | "graded",
  gradingCompany: string,
  grade: string,
  secondaryValuation: LocalSyncGradedValuation | null = null,
  secondaryProviderStatus = "",
): TradeInMarketValuation {
  if (!card) {
    return {
      marketMinorUnits: 0,
      currency: "USD",
      pricePoint: null,
      secondaryValuation: null,
      sourceLabel: "No card selected",
      detail: "Select a card to view market value.",
      tone: "idle",
      links: [],
      exactGradeMatch: false,
      usingFallback: false,
      secondaryProviderStatus,
      baseReferenceMinorUnits: 0,
    }
  }

  const pricePoint = bestScryDexPricePoint(card, variant, condition, productType, gradingCompany, grade)
  const marketMinorUnits = pricePoint ? tradeInPricePointMinorUnits(pricePoint) : card.market_price_minor_units
  const selectedCompany = gradingCompany.trim()
  const selectedGrade = grade.trim()
  const exactGradeMatch =
    productType !== "graded" ||
    selectedGrade === "" ||
    Boolean(pricePoint?.grade && scryDexGradeMatches(pricePoint.grade, selectedGrade))
  const exactCompanyMatch =
    productType !== "graded" ||
    selectedCompany === "" ||
    Boolean(pricePoint?.grading_company && scryDexCompanyMatches(pricePoint.grading_company, selectedCompany))
  const usingFallback =
    productType === "graded" &&
    (!pricePoint || !exactGradeMatch || !exactCompanyMatch)
  const links = productType === "graded" && (usingFallback || marketMinorUnits <= 0)
    ? valuationLinksForCard(card, selectedCompany, selectedGrade)
    : []
  const hasSecondaryValuation =
    productType === "graded" &&
    usingFallback &&
    Boolean(secondaryValuation?.market_price_minor_units && secondaryValuation.market_price_minor_units > 0)

  if (hasSecondaryValuation && secondaryValuation) {
    return {
      marketMinorUnits: secondaryValuation.market_price_minor_units,
      currency: secondaryValuation.currency,
      pricePoint,
      secondaryValuation,
      sourceLabel: secondaryValuation.source_label,
      detail: `${secondaryValuation.source_detail} ScryDex did not have an exact ${[selectedCompany, selectedGrade].filter(Boolean).join(" ") || "graded"} price, so this secondary comp is being used for the offer.`,
      tone: "ready",
      links,
      exactGradeMatch,
      usingFallback: false,
      secondaryProviderStatus,
      baseReferenceMinorUnits: card.market_price_minor_units,
    }
  }

  if (!pricePoint && productType === "graded" && marketMinorUnits <= 0) {
    return {
      marketMinorUnits,
      currency: card.currency,
      pricePoint: null,
      secondaryValuation: null,
      sourceLabel: "No graded market value",
      detail: "ScryDex/reference pricing did not return a graded value for this card. Enter a manual offer or use Check comps before adding it to the offer.",
      tone: "blocked",
      links,
      exactGradeMatch: false,
      usingFallback: true,
      secondaryProviderStatus,
      baseReferenceMinorUnits: 0,
    }
  }

  if (!pricePoint && productType === "graded") {
    return {
      marketMinorUnits: 0,
      currency: card.currency,
      pricePoint: null,
      secondaryValuation: null,
      sourceLabel: "No ScryDex graded price",
      detail: `No graded ${[selectedCompany, selectedGrade].filter(Boolean).join(" ") || "price"} is stored for this card/version. Raw/base reference: ${formatMoney(marketMinorUnits, card.currency)}. Enter a manual offer or use Check comps before adding it to the offer.`,
      tone: "blocked",
      links,
      exactGradeMatch: false,
      usingFallback: true,
      secondaryProviderStatus,
      baseReferenceMinorUnits: marketMinorUnits,
    }
  }

  if (pricePoint && usingFallback) {
    const hasGenericGradedReference =
      productType === "graded" &&
      pricePoint.raw_or_graded === "graded" &&
      !pricePoint.grading_company &&
      !pricePoint.grade

    return {
      marketMinorUnits,
      currency: pricePoint.currency,
      pricePoint,
      secondaryValuation: null,
      sourceLabel: hasGenericGradedReference ? "ScryDex graded reference" : "Nearest ScryDex graded comp",
      detail: `No exact ${[selectedCompany, selectedGrade].filter(Boolean).join(" ") || "graded"} price matched in ScryDex. Using ${scryDexPricePointSummary(pricePoint, true)} until staff verifies comps or enters a manual offer.`,
      tone: "warning",
      links,
      exactGradeMatch,
      usingFallback: true,
      secondaryProviderStatus,
      baseReferenceMinorUnits: card.market_price_minor_units,
    }
  }

  if (pricePoint) {
    return {
      marketMinorUnits,
      currency: pricePoint.currency,
      pricePoint,
      secondaryValuation: null,
      sourceLabel: productType === "graded" ? "Exact ScryDex graded market" : "Single market",
      detail: `${scryDexPricePointSummary(pricePoint, true)} from ${card.catalog_source.replace(/_/g, " ")}.`,
      tone: "ready",
      links,
      exactGradeMatch,
      usingFallback: false,
      secondaryProviderStatus,
      baseReferenceMinorUnits: card.market_price_minor_units,
    }
  }

  return {
    marketMinorUnits,
    currency: card.currency,
    pricePoint: null,
    secondaryValuation: null,
    sourceLabel: "Card market",
    detail: `${formatMoney(marketMinorUnits, card.currency)} base market from ${card.catalog_source.replace(/_/g, " ")}.`,
    tone: marketMinorUnits > 0 ? "ready" : "blocked",
    links: marketMinorUnits > 0 ? [] : valuationLinksForCard(card, selectedCompany, selectedGrade),
    exactGradeMatch: false,
    usingFallback: marketMinorUnits <= 0,
    secondaryProviderStatus,
    baseReferenceMinorUnits: card.market_price_minor_units,
  }
}

function scryDexIntakePriceMinorUnits(
  card: LocalSyncScryDexCard,
  variant: LocalSyncScryDexVariant | null,
  condition: string,
  productType: "raw" | "graded" = "raw",
  gradingCompany = "",
  grade = "",
) {
  const point = bestScryDexPricePoint(card, variant, condition, productType, gradingCompany, grade)

  return point ? pricePointMinorUnits(point) : card.market_price_minor_units
}

function autoRetailPriceMinorUnits(marketMinorUnits: number, markupBasisPoints = 1000) {
  const safeMarketMinorUnits = Number.isFinite(marketMinorUnits)
    ? Math.max(0, Math.trunc(marketMinorUnits))
    : 0

  const rawMinorUnits = Math.round(safeMarketMinorUnits * (10_000 + markupBasisPoints) / 10_000)

  return roundSalePriceMinorUnits(rawMinorUnits)
}

function roundSalePriceMinorUnits(amountMinorUnits: number) {
  const safeAmountMinorUnits = Number.isFinite(amountMinorUnits)
    ? Math.max(0, Math.trunc(amountMinorUnits))
    : 0

  if (safeAmountMinorUnits <= 100 || safeAmountMinorUnits % 100 === 0) {
    return safeAmountMinorUnits
  }

  return Math.ceil(safeAmountMinorUnits / 100) * 100
}

function tradeInValueMinorUnits(marketMidMinorUnits: number, percentageBasisPoints: number) {
  const safeMarketMidMinorUnits = Number.isFinite(marketMidMinorUnits)
    ? Math.max(0, Math.trunc(marketMidMinorUnits))
    : 0
  const safePercentageBasisPoints = Number.isFinite(percentageBasisPoints)
    ? Math.max(0, Math.trunc(percentageBasisPoints))
    : 0
  const rawMinorUnits = Math.floor(safeMarketMidMinorUnits * safePercentageBasisPoints / 10_000)

  return Math.floor(rawMinorUnits / 100) * 100
}

function normalizeTradeInCustomerLookup(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function splitTradeInCustomerName(value: string) {
  const parts = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean)
  const [firstName = "", ...lastNameParts] = parts

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  }
}

function localSyncCustomerSearchText(customer: LocalSyncCustomer) {
  return [
    customer.customer_public_id,
    customer.display_name,
    customer.first_name,
    customer.last_name,
    customer.customer_lookup,
    customer.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function localSyncCustomerMatchesTradeInLookup(customer: LocalSyncCustomer, ...lookupValues: string[]) {
  const searchText = localSyncCustomerSearchText(customer)

  return lookupValues.some((value) => {
    const normalizedValue = normalizeTradeInCustomerLookup(value)

    return Boolean(normalizedValue && searchText.includes(normalizedValue))
  })
}

function localSyncTradeInOrderMatchesCustomer(
  order: LocalSyncTradeInOrder,
  customer: LocalSyncCustomer,
) {
  if (
    order.customer_public_id &&
    customer.customer_public_id &&
    order.customer_public_id === customer.customer_public_id
  ) {
    return true
  }

  const orderSearchText = [
    order.customer_name,
    order.customer_phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  const customerLookupValues = [
    customer.display_name,
    customer.first_name,
    customer.last_name,
    customer.customer_lookup,
    customer.email,
  ].map(normalizeTradeInCustomerLookup).filter(Boolean)

  return customerLookupValues.some((value) => orderSearchText.includes(value))
}

function finalRetailPriceMinorUnits(autoMinorUnits: number, minimumMinorUnits: number) {
  const safeAutoMinorUnits = Number.isFinite(autoMinorUnits) ? Math.max(0, Math.trunc(autoMinorUnits)) : 0
  const safeMinimumMinorUnits = Number.isFinite(minimumMinorUnits)
    ? Math.max(0, Math.trunc(minimumMinorUnits))
    : 0

  return Math.max(safeAutoMinorUnits, safeMinimumMinorUnits)
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

type InventoryConditionGroup = {
  condition: string
  items: InventoryItem[]
  stockCount: number
  priceLabel: string
}

const EMPTY_INVENTORY_ITEM: InventoryItem = {
  id: 0,
  publicId: "",
  rowVersion: 0,
  cardName: "No inventory selected",
  setName: "Live inventory is ready for import",
  number: "",
  condition: "No stock loaded",
  barcode: "",
  price: "$0.00",
  priceMinorUnits: 0,
  currency: "USD",
  location: "Import CSV",
  status: "sold",
  source: "cached",
  onlineVisibility: "staff_only",
  kioskVisibility: "hidden",
  posVisibility: "staff_only",
}

type InventoryDisplayGroup = {
  key: string
  representative: InventoryItem
  items: InventoryItem[]
  conditions: InventoryConditionGroup[]
  activeStockCount: number
  priceLabel: string
  locationLabel: string
}

function inventoryPrintingKey(item: InventoryItem) {
  return [
    item.game ?? "",
    item.cardName,
    item.setName,
    item.setCode ?? "",
    item.number,
    item.variant ?? "",
    item.finish ?? "",
    item.language ?? "",
    item.rawOrGraded ?? "raw",
  ]
    .map((value) => String(value).trim().toLowerCase())
    .join("|")
}

function inventoryPriceRange(items: InventoryItem[]) {
  const prices = [...new Set(items.map((item) => item.priceMinorUnits))].sort((left, right) => left - right)

  if (prices.length === 0) {
    return "$0.00"
  }

  if (prices.length === 1) {
    return formatMoney(prices[0], "USD")
  }

  return `${formatMoney(prices[0], "USD")} - ${formatMoney(prices[prices.length - 1], "USD")}`
}

function inventoryStockCount(item: InventoryItem) {
  if (["sold", "removed"].includes(item.status)) {
    return 0
  }

  if (typeof item.quantityOnHand === "number") {
    return Math.max(0, Math.round(item.quantityOnHand))
  }

  return 1
}

function groupInventoryItems(items: InventoryItem[], selectedId?: number): InventoryDisplayGroup[] {
  const groups = new Map<string, InventoryItem[]>()

  for (const item of items) {
    const key = inventoryPrintingKey(item)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return [...groups.entries()].map(([key, groupedItems]) => {
    const selectedItem = groupedItems.find((item) => item.id === selectedId)
    const representative =
      selectedItem ??
      groupedItems.find((item) => item.status === "available") ??
      groupedItems[0]
    const conditions = [...new Set(groupedItems.map((item) => item.condition))]
      .sort()
      .map((condition) => {
        const conditionItems = groupedItems.filter((item) => item.condition === condition)

        return {
          condition,
          items: conditionItems,
          stockCount: conditionItems.reduce((total, item) => total + inventoryStockCount(item), 0),
          priceLabel: inventoryPriceRange(conditionItems),
        }
      })
    const activeItems = groupedItems.filter((item) => inventoryStockCount(item) > 0)
    const locations = [...new Set(activeItems.map((item) => item.location).filter(Boolean))]

    return {
      key,
      representative,
      items: groupedItems,
      conditions,
      activeStockCount: activeItems.reduce((total, item) => total + inventoryStockCount(item), 0),
      priceLabel: inventoryPriceRange(activeItems.length > 0 ? activeItems : groupedItems),
      locationLabel:
        locations.length === 0
          ? "No location"
          : locations.length === 1
            ? locations[0]
            : `${locations.length} locations`,
    }
  })
}

function inventoryItemForCondition(group: InventoryDisplayGroup, condition: string) {
  const conditionGroup = group.conditions.find((candidate) => candidate.condition === condition)

  return (
    conditionGroup?.items.find((item) => item.status === "available") ??
    conditionGroup?.items[0] ??
    group.representative
  )
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

function configuredDesktopMode() {
  const configuredMode = String(import.meta.env.VITE_PUG_APP_MODE ?? "").toLowerCase()

  if (configuredMode === "checkout" || configuredMode === "sale-checkout") {
    return "checkout"
  }

  if (configuredMode === "kiosk") {
    return "kiosk"
  }

  return "store"
}

function initialCustomerKioskMode() {
  const configuredMode = configuredDesktopMode()
  if (configuredMode === "kiosk") {
    return true
  }

  if (typeof window === "undefined") {
    return false
  }

  const params = new URLSearchParams(window.location.search)
  const mode = params.get("mode")?.toLowerCase()
  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase()
  const hash = window.location.hash.replace(/^#/, "").toLowerCase()

  return mode === "kiosk" || hash === "kiosk" || path.endsWith("/kiosk")
}

function initialEmployeeSectionForAccess(access: readonly AccessSection[], role: AppSessionRole) {
  if (configuredDesktopMode() === "checkout" && (["manager", "owner"].includes(role) || access.includes("Checkout"))) {
    return "Checkout"
  }

  return role === "owner" ? "Inventory" : (access[0] ?? "Inventory")
}

function employeeSectionLabel(label: string) {
  if (label === "Kiosk") {
    return "Fulfillment"
  }

  if (label === "Checkout") {
    return "Sale Completion"
  }

  return label
}

async function playBuiltInOrderTone(contextRef: MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined") {
    return
  }

  const audioWindow = window as typeof window & {
    webkitAudioContext?: typeof AudioContext
  }
  const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext

  if (!AudioContextConstructor) {
    throw new Error("AudioContext is unavailable.")
  }

  const context = contextRef.current ?? new AudioContextConstructor()
  contextRef.current = context

  if (context.state === "suspended") {
    await Promise.race([
      context.resume(),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("AudioContext resume timed out.")), 1_000)
      }),
    ])
  }

  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = "sine"
  oscillator.frequency.value = 880
  gain.gain.setValueAtTime(0.001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.42)
  await new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timeoutId)
      resolve()
    }
    const timeoutId = window.setTimeout(finish, 700)

    oscillator.onended = finish
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.45)
  })
}

function kioskTicketFromLocalSyncOrder(order: LocalSyncKioskOrder): KioskOrderTicket {
  return {
    orderId: order.order_id,
    customerName: order.customer_name || [order.first_name, order.last_name].filter(Boolean).join(" "),
    customerPublicId: order.customer_public_id,
    customerLookup: order.customer_lookup,
    itemCount: order.item_count,
    totalMinorUnits: order.total_minor_units,
    totalLabel: formatMoney(order.total_minor_units, order.currency),
    items: order.items.map((item) => ({
      publicId: item.public_id,
      cardName: item.card_name,
      setName: item.set_name,
      condition: item.condition,
      barcode: item.barcode,
      location: item.location,
      price: formatMoney(item.price_minor_units, item.currency),
    })),
    reservationIds: order.reservation_ids,
    createdAtUtc: order.created_at_utc,
    status: order.status,
    paymentStatus: order.payment_status,
    squareReceiptReference: order.square_receipt_reference,
    paidAtUtc: order.paid_at_utc,
    holdExpiresAtUtc: order.hold_expires_at_utc,
    holdSecondsRemaining: order.hold_seconds_remaining,
    pickedItemIds: order.picked_item_ids,
    allItemsPicked: order.all_items_picked,
  }
}

function websitePickupTicketFromLocalSyncOrder(order: LocalSyncFulfillmentOrder): WebsitePickupTicket {
  return {
    orderId: order.order_id,
    orderNumber: order.order_number || String(order.order_id),
    customerName: order.customer_name || "Website pickup customer",
    itemCount: order.item_count,
    totalMinorUnits: order.total_minor_units,
    totalLabel: formatMoney(order.total_minor_units, "USD"),
    items: order.items.map((item) => {
      const pickIds = [
        item.inventory_id,
        item.reservation_id,
        item.order_item_id,
      ]
        .map((value) => String(value || "").trim())
        .filter((value, index, values) => value !== "" && value !== "0" && values.indexOf(value) === index)

      return {
        publicId: pickIds[0] ?? String(item.order_item_id || item.inventory_id || item.reservation_id),
        pickIds,
        cardName: item.card_name,
        setName: item.set_name,
        condition: item.condition,
        barcode: item.barcode,
        location: `Woo order #${order.order_number || order.order_id}`,
        price: formatMoney(item.price_minor_units, "USD"),
      }
    }),
    reservationIds: order.items
      .map((item) => String(item.reservation_id || ""))
      .filter(Boolean),
    createdAtUtc: order.created_at_utc,
    paidAtUtc: order.paid_at_utc,
    status: order.fulfillment_status,
    orderStatus: order.order_status,
    source: order.source,
    pickedItemIds: order.picked_item_ids,
    allItemsPicked: order.all_items_picked,
  }
}

function ticketItemIsPicked(ticket: KioskOrderTicket | WebsitePickupTicket | null, item: KioskTicketItem) {
  if (!ticket) {
    return false
  }

  const acceptedIds = item.pickIds && item.pickIds.length > 0 ? item.pickIds : [item.publicId]

  return acceptedIds.some((id) => ticket.pickedItemIds.includes(id))
}

function fulfillmentTicketSearchText(ticket: KioskOrderTicket | WebsitePickupTicket) {
  const orderNumber = "orderNumber" in ticket ? ticket.orderNumber : ""
  const orderStatus = "orderStatus" in ticket ? ticket.orderStatus : ""
  const source = "source" in ticket ? ticket.source : "kiosk"
  const squareReceiptReference = "squareReceiptReference" in ticket ? ticket.squareReceiptReference : ""
  const customerPublicId = "customerPublicId" in ticket ? ticket.customerPublicId : ""
  const customerLookup = "customerLookup" in ticket ? ticket.customerLookup : ""

  return [
    ticket.orderId,
    orderNumber,
    orderStatus,
    source,
    ticket.customerName,
    customerPublicId,
    customerLookup,
    ticket.totalLabel,
    squareReceiptReference,
    ...ticket.items.flatMap((item) => [
      item.cardName,
      item.setName,
      item.condition,
      item.barcode,
      item.location,
    ]),
  ]
    .join(" ")
    .toLowerCase()
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

function localSyncPushResultFromAutoSync(
  results: LocalSyncAutoSyncOperationResult[],
): Extract<LocalSyncPushResult, { status: "ok" }> {
  const acceptedCount = results.filter((result) => result.status === "accepted").length
  const retryCount = results.filter((result) => result.status === "retry").length
  const rejectedCount = results.filter((result) => result.status === "rejected").length

  return {
    status: "ok",
    operation_count: results.length,
    accepted_count: acceptedCount,
    retry_count: retryCount,
    rejected_count: rejectedCount,
    unsupported_operation_count: 0,
    results: results as Extract<LocalSyncPushResult, { status: "ok" }>["results"],
    wordpress_push_connected: true,
    credentials_synced_to_client: false,
    local_queue_depth: retryCount + rejectedCount,
  }
}

function escapePrintableLabelHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

const LOCAL_DYMO_PRINTING_URL = "https://127.0.0.1:41951/DYMO/DLS/Printing"
const DYMO_30336_LABEL_NAME = "30336 Small Multipurpose Labels"
const SCANNER_BARCODE_MAX_LENGTH = 13

type BrowserDymoPrinter = {
  name: string
  modelName: string
  isConnected: boolean
  isLocal: boolean
}

type BrowserDymoPrintResult =
  | {
      status: "ok"
      printerName: string
      labelStock: string
      barcodeFormat: "Code128Auto"
      scanCode: string
    }
  | {
      status: "blocked"
      code: string
      message: string
    }

async function printLabelOnThisPcDymo(job: OfflineLabelPrintJob): Promise<BrowserDymoPrintResult> {
  const scanCode = cleanBrowserDymoScanCode(job.barcode)

  if (scanCode.length > SCANNER_BARCODE_MAX_LENGTH) {
    return {
      status: "blocked",
      code: "barcode_too_long_for_scanner",
      message:
        `Barcode ${scanCode} is ${scanCode.length} characters. Scanner-safe labels must be ` +
        `${SCANNER_BARCODE_MAX_LENGTH} characters or less.`,
    }
  }

  const printersResult = await requestBrowserDymoService("GetPrinters")

  if (printersResult.status !== "ok") {
    return printersResult
  }

  const printers = parseBrowserDymoPrinters(printersResult.body)
  const connectedLocalPrinters = printers.filter((printer) => printer.isConnected && printer.isLocal)
  const connectedPrinters = printers.filter((printer) => printer.isConnected)
  const printer =
    connectedLocalPrinters.find((candidate) => candidate.name.toLowerCase().includes("550 turbo")) ??
    connectedLocalPrinters[0] ??
    connectedPrinters.find((candidate) => candidate.name.toLowerCase().includes("550 turbo")) ??
    connectedPrinters[0] ??
    null

  if (!printer) {
    return {
      status: "blocked",
      code: "local_dymo_printer_not_found",
      message:
        "No connected DYMO LabelWriter was found on this PC. The app will try the LAN server printer next.",
    }
  }

  const labelXml = buildBrowserDymo30336LabelXml(job)
  const printResult = await requestBrowserDymoService("PrintLabel", {
    printerName: printer.name,
    printParamsXml: `<LabelWriterPrintParams><Copies>1</Copies><JobTitle>${escapeDymoXml(
      `${job.cardName} ${job.barcode}`.slice(0, 80),
    )}</JobTitle><FlowDirection>LeftToRight</FlowDirection><PrintQuality>Text</PrintQuality></LabelWriterPrintParams>`,
    labelXml,
    labelSetXml: "",
  })

  if (printResult.status !== "ok") {
    return printResult
  }

  return {
    status: "ok",
    printerName: printer.name,
    labelStock: DYMO_30336_LABEL_NAME,
    barcodeFormat: "Code128Auto",
    scanCode,
  }
}

async function requestBrowserDymoService(
  action: "GetPrinters" | "PrintLabel",
  fields: Record<string, string> | null = null,
): Promise<{ status: "ok"; body: string } | Extract<BrowserDymoPrintResult, { status: "blocked" }>> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 3200)

  try {
    const response = await fetch(`${LOCAL_DYMO_PRINTING_URL}/${action}`, {
      method: fields ? "POST" : "GET",
      headers: fields
        ? {
            "content-type": "application/x-www-form-urlencoded; charset=utf-8",
          }
        : undefined,
      body: fields ? new URLSearchParams(fields).toString() : undefined,
      signal: controller.signal,
    })
    const body = await response.text()

    if (!response.ok) {
      return {
        status: "blocked",
        code: "local_dymo_service_rejected_request",
        message:
          action === "GetPrinters"
            ? "DYMO Connect is running on this PC but did not return the printer list."
            : "DYMO Connect rejected the local print request.",
      }
    }

    return {
      status: "ok",
      body,
    }
  } catch (error) {
    return {
      status: "blocked",
      code: "local_dymo_service_unavailable",
      message:
        error instanceof DOMException && error.name === "AbortError"
          ? "DYMO Connect did not respond on this PC before the timeout."
          : "DYMO Connect local printing service is unavailable on this PC.",
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function parseBrowserDymoPrinters(xml: string): BrowserDymoPrinter[] {
  return Array.from(String(xml ?? "").matchAll(/<LabelWriterPrinter>([\s\S]*?)<\/LabelWriterPrinter>/gi))
    .map((match) => match[1])
    .map((printerXml) => ({
      name: browserDymoXmlValue(printerXml, "Name"),
      modelName: browserDymoXmlValue(printerXml, "ModelName"),
      isConnected: browserDymoXmlValue(printerXml, "IsConnected").toLowerCase() === "true",
      isLocal: browserDymoXmlValue(printerXml, "IsLocal").toLowerCase() === "true",
    }))
    .filter((printer) => printer.name)
}

function browserDymoXmlValue(xml: string, tagName: string): string {
  const match = String(xml ?? "").match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"))

  return match ? decodeDymoXml(match[1]).trim() : ""
}

function buildBrowserDymo30336LabelXml(job: OfflineLabelPrintJob): string {
  const cardName = cleanBrowserDymoText(job.cardName, "Unknown card", 64)
  const setCode = cleanBrowserDymoText(job.setCode, "SET", 24).toUpperCase()
  const condition = cleanBrowserDymoText(job.condition, "Condition", 32)
  const scanCode = cleanBrowserDymoScanCode(job.barcode)

  return `<?xml version="1.0" encoding="utf-8"?>
<DesktopLabel Version="1">
  <DYMOLabel Version="4">
    <Description>The Pug inventory label</Description>
    <Orientation>Landscape</Orientation>
    <LabelName>Small30336</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint><X>0.045</X><Y>0.035</Y></DYMOPoint>
      <Size><Width>2.035</Width><Height>0.93</Height></Size>
    </DYMORect>
    <BorderThickness>0</BorderThickness>
    <Show_Border>False</Show_Border>
    <HasFixedLength>False</HasFixedLength>
    <FixedLengthValue>0</FixedLengthValue>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>
        ${browserDymoTextObjectXml({
          name: "CardName",
          text: cardName,
          x: "0.055",
          y: "0.035",
          width: "2.005",
          height: "0.205",
          fontSize: "9.5",
          isBold: true,
        })}
        ${browserDymoTextObjectXml({
          name: "SetCondition",
          text: `${setCode} ${condition}`.trim(),
          x: "0.055",
          y: "0.232",
          width: "2.005",
          height: "0.145",
          fontSize: "7.2",
          isBold: true,
        })}
        <BarcodeObject>
          <Name>InventoryBarcode</Name>
          ${browserDymoBrushesXml({ backgroundA: 1, fillA: 1 })}
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BorderStyle>SolidLine</BorderStyle>
          <Margin><DYMOThickness Left="0" Top="0" Right="0" Bottom="0" /></Margin>
          <BarcodeFormat>Code128Auto</BarcodeFormat>
          <Data><DataString>${escapeDymoXml(scanCode)}</DataString></Data>
          <HorizontalAlignment>Center</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          <Size>AutoFit</Size>
          <TextPosition>Bottom</TextPosition>
          <FontInfo>
            <FontName>Arial</FontName>
            <FontSize>6.2</FontSize>
            <IsBold>True</IsBold>
            <IsItalic>False</IsItalic>
            <IsUnderline>False</IsUnderline>
            <FontBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></FontBrush>
          </FontInfo>
          <ObjectLayout>
            <DYMOPoint><X>0.075</X><Y>0.405</Y></DYMOPoint>
            <Size><Width>1.965</Width><Height>0.515</Height></Size>
          </ObjectLayout>
        </BarcodeObject>
      </LabelObjects>
    </DynamicLayoutManager>
  </DYMOLabel>
  <LabelApplication>The Pug Local App</LabelApplication>
  <DataTable><Columns></Columns><Rows></Rows></DataTable>
</DesktopLabel>`
}

function browserDymoTextObjectXml({
  name,
  text,
  x,
  y,
  width,
  height,
  fontSize,
  isBold,
}: {
  name: string
  text: string
  x: string
  y: string
  width: string
  height: string
  fontSize: string
  isBold: boolean
}) {
  return `<TextObject>
          <Name>${escapeDymoXml(name)}</Name>
          ${browserDymoBrushesXml({ backgroundA: 0, fillA: 0 })}
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BorderStyle>SolidLine</BorderStyle>
          <Margin><DYMOThickness Left="0" Top="0" Right="0" Bottom="0" /></Margin>
          <HorizontalAlignment>Left</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          <FitMode>AlwaysFit</FitMode>
          <IsVertical>False</IsVertical>
          <FormattedText>
            <FitMode>AlwaysFit</FitMode>
            <HorizontalAlignment>Left</HorizontalAlignment>
            <VerticalAlignment>Middle</VerticalAlignment>
            <IsVertical>False</IsVertical>
            <LineTextSpan>
              <TextSpan>
                <Text>${escapeDymoXml(text)}</Text>
                <FontInfo>
                  <FontName>Arial</FontName>
                  <FontSize>${escapeDymoXml(fontSize)}</FontSize>
                  <IsBold>${isBold ? "True" : "False"}</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
          </FormattedText>
          <ObjectLayout>
            <DYMOPoint><X>${escapeDymoXml(x)}</X><Y>${escapeDymoXml(y)}</Y></DYMOPoint>
            <Size><Width>${escapeDymoXml(width)}</Width><Height>${escapeDymoXml(height)}</Height></Size>
          </ObjectLayout>
        </TextObject>`
}

function browserDymoBrushesXml({ backgroundA, fillA }: { backgroundA: number; fillA: number }) {
  return `<Brushes>
            <BackgroundBrush><SolidColorBrush><Color A="${backgroundA}" R="1" G="1" B="1"></Color></SolidColorBrush></BackgroundBrush>
            <BorderBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></BorderBrush>
            <StrokeBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></StrokeBrush>
            <FillBrush><SolidColorBrush><Color A="${fillA}" R="0" G="0" B="0"></Color></SolidColorBrush></FillBrush>
          </Brushes>`
}

function cleanBrowserDymoText(value: string, fallback = "", maxLength = 80): string {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return (text || fallback).slice(0, maxLength)
}

function cleanBrowserDymoScanCode(value: string): string {
  const text = cleanBrowserDymoText(value, "PUG-0000", 80)
    .replace(/[^\x20-\x7e]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return text || "PUG-0000"
}

function escapeDymoXml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function decodeDymoXml(value: string) {
  return String(value ?? "")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
}

const CODE39_PATTERNS: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "$": "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
}

function printableCode39Value(rawValue: string): string {
  return rawValue
    .toUpperCase()
    .replace(/[^0-9A-Z ./$+%-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 38) || "PUG0000"
}

function code39BarcodeSvgMarkup(rawValue: string): string {
  const value = rawValue
  const encoded = `*${printableCode39Value(value)}*`
  const quietZone = 10
  const height = 42
  let x = quietZone
  const rects: string[] = []

  Array.from(encoded).forEach((character) => {
    const pattern = CODE39_PATTERNS[character] ?? CODE39_PATTERNS["-"]
    let drawBar = true

    Array.from(pattern).forEach((widthText) => {
      const width = widthText === "w" ? 3 : 1

      if (drawBar) {
        rects.push(`<rect x="${x}" y="0" width="${width}" height="${height}" />`)
      }

      x += width
      drawBar = !drawBar
    })

    x += 1
  })

  const width = x + quietZone

  return `<svg class="barcode-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Barcode ${escapePrintableLabelHtml(value)}"><rect x="0" y="0" width="${width}" height="${height}" fill="#fff" /><g fill="#111">${rects.join("")}</g></svg>`
}

function openDymoLabelPrintDialog(job: OfflineLabelPrintJob): boolean {
  const printWindow = window.open("", "pug-dymo-label", "width=420,height=320")

  if (!printWindow) {
    return false
  }

  const printableBarcode = printableCode39Value(job.barcode)
  const barcode = escapePrintableLabelHtml(printableBarcode)
  const cardName = escapePrintableLabelHtml(job.cardName)
  const setLine = escapePrintableLabelHtml(`${job.setCode} #${job.cardNumber}`)
  const condition = escapePrintableLabelHtml(job.condition)
  const barcodeSvg = code39BarcodeSvgMarkup(printableBarcode)

  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${cardName} label</title>
    <style>
      @page { size: 2.125in 1in; margin: 0; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #101811;
        font-family: Arial, Helvetica, sans-serif;
        background: #ffffff;
      }
      .label {
        width: 2.125in;
        height: 1in;
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        gap: 0.025in;
        padding: 0.055in 0.07in;
        border: 1px solid #111;
      }
      .name {
        overflow: hidden;
        font-size: 10px;
        font-weight: 900;
        line-height: 1.08;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .meta {
        overflow: hidden;
        font-size: 7.5px;
        font-weight: 800;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .barcode {
        align-self: end;
        display: grid;
        gap: 0.01in;
      }
      .barcode-svg {
        width: 100%;
        height: 0.39in;
        display: block;
      }
      .code {
        overflow: hidden;
        font-family: "Courier New", monospace;
        font-size: 7px;
        font-weight: 800;
        text-align: center;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    </style>
  </head>
  <body>
    <main class="label">
      <div class="name">${cardName}</div>
      <div class="meta">${setLine} / ${condition}</div>
      <div class="barcode">
        ${barcodeSvg}
        <div class="code">${barcode}</div>
      </div>
    </main>
    <script>
      window.addEventListener("load", () => {
        window.focus();
        setTimeout(() => window.print(), 120);
      });
    </script>
  </body>
</html>`)
  printWindow.document.close()

  return true
}

function lanSyncPullMessage(result: LocalSyncPullResult | null) {
  if (!result) {
    return "LAN website pull was not run because no PIN session is active."
  }

  if (result.status !== "ok") {
    return `LAN website pull blocked: ${result.message}`
  }

  const catalogDetail =
    (result.catalog_applied_count ?? 0) > 0
      ? ` Catalog applied ${result.catalog_applied_count} reference card(s); local catalog now ${result.local_reference_card_count ?? 0}.`
      : ""

  return `LAN website pull applied ${result.applied_count} inventory item(s) and ${result.events_applied_count} event(s); inserted ${result.inserted_count} item(s) / ${result.events_inserted_count} event(s), updated ${result.updated_count} item(s) / ${result.events_updated_count} event(s), and preserved ${result.ignored_count + result.events_ignored_count} local row(s).${catalogDetail}`
}

function eventSnapshotFromLocalSync(event: LocalSyncEventSnapshot): EventSnapshot {
  return {
    eventId: event.event_id,
    rowVersion: event.row_version,
    title: event.title,
    startsAtUtc: event.starts_at_utc,
    startsAtLabel: event.starts_at_label,
    eventType: event.event_type,
    game: event.game,
    entryFeeMinorUnits: event.entry_fee_minor_units,
    registrationDeadlineUtc: event.registration_deadline_utc,
    woocommerceProductId: event.woocommerce_product_id,
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
  const [customerKioskMode] = useState(() => initialCustomerKioskMode())
  const queueAdapter = useMemo(() => createTauriQueueAdapter(), [])
  const devicePairingAdapter = useMemo(() => createTauriDevicePairingAdapter(), [])
  const offlineSyncAdapter = useMemo(() => createTauriOfflineSyncAdapter(), [])
  const localSyncDiscoveryAdapter = useMemo(() => createTauriLocalSyncDiscoveryAdapter(), [])
  const secureStoreAdapter = useMemo(() => createTauriSecureStoreAdapter(), [])
  const inventoryPanelRef = useRef<HTMLElement>(null)
  const workflowPanelRef = useRef<HTMLElement>(null)
  const statusPanelRef = useRef<HTMLElement>(null)
  const kioskPanelRef = useRef<HTMLElement>(null)
  const queuePanelRef = useRef<HTMLElement>(null)
  const eventPanelRef = useRef<HTMLElement>(null)
  const eventCheckinPanelRef = useRef<HTMLDivElement>(null)
  const conflictPanelRef = useRef<HTMLElement>(null)
  const creditPanelRef = useRef<HTMLElement>(null)
  const connectorPanelRef = useRef<HTMLElement>(null)
  const kioskCartRef = useRef<HTMLElement>(null)
  const knownPickupTicketIdsRef = useRef<Set<string> | null>(null)
  const orderNotificationAudioRef = useRef<HTMLAudioElement | null>(null)
  const orderNotificationAudioContextRef = useRef<AudioContext | null>(null)
  const liveCardScanVideoRef = useRef<HTMLVideoElement | null>(null)
  const liveCardScanCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const liveCardScanStreamRef = useRef<MediaStream | null>(null)
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
  const conflictReviewStorageRef = useRef<ConflictReviewStorageRestoreResult | null>(null)
  if (conflictReviewStorageRef.current === null) {
    conflictReviewStorageRef.current = loadConflictReviewStorage(
      connectorProfileStorage.activeProfileId,
      workspace.conflicts,
    )
  }
  const conflictReviewStorage = conflictReviewStorageRef.current
  const [inventoryItems, setInventoryItems] = useState(workspace.inventoryItems)
  const [customerCreditDirectory, setCustomerCreditDirectory] = useState(
    workspace.customerCreditDirectory,
  )
  const [customerCreditLedgerEntries, setCustomerCreditLedgerEntries] = useState(
    workspace.customerCreditLedgerEntries,
  )
  const [eventSnapshots, setEventSnapshots] = useState(workspace.eventSnapshots)
  const [connectorProfiles, setConnectorProfiles] = useState(connectorProfileStorage.profiles)
  const [openConflicts, setOpenConflicts] = useState(conflictReviewStorage.openConflicts)
  const [reviewedConflicts, setReviewedConflicts] = useState<ConflictItem[]>(
    conflictReviewStorage.reviewedConflicts,
  )
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
  const [squareSoldReference, setSquareSoldReference] = useState("")
  const [squareSoldOrderId, setSquareSoldOrderId] = useState("")
  const [newCustomerFirstName, setNewCustomerFirstName] = useState("")
  const [newCustomerLastName, setNewCustomerLastName] = useState("")
  const [newCustomerEmail, setNewCustomerEmail] = useState("")
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [customerSearchResults, setCustomerSearchResults] = useState<LocalSyncCustomer[]>([])
  const [customerProfileResult, setCustomerProfileResult] =
    useState<LocalSyncCustomerProfileResult | null>(null)
  const [customerProfileStatus, setCustomerProfileStatus] = useState<StatusTone>("idle")
  const [customerProfileDetail, setCustomerProfileDetail] = useState(
    "Search or select a customer to load profile history.",
  )
  const [creditAdjustmentInput, setCreditAdjustmentInput] = useState("0.00")
  const [creditAdjustmentReason, setCreditAdjustmentReason] = useState("")
  const [pendingEventRegistrationIds, setPendingEventRegistrationIds] = useState<string[]>([])
  const [pendingEventCheckinIds, setPendingEventCheckinIds] = useState<string[]>([])
  const [showCreditLedger, setShowCreditLedger] = useState(true)
  const [customerKioskOrderSearch, setCustomerKioskOrderSearch] = useState("")
  const [selectedCustomerKioskOrderId, setSelectedCustomerKioskOrderId] = useState("")
  const [checkoutCustomerMode, setCheckoutCustomerMode] = useState<CheckoutCustomerMode>("guest")
  const [checkoutBarcodeInput, setCheckoutBarcodeInput] = useState("")
  const [checkoutProductSearch, setCheckoutProductSearch] = useState("")
  const [checkoutCartLines, setCheckoutCartLines] = useState<CheckoutCartLine[]>([])
  const [checkoutMiscLabel, setCheckoutMiscLabel] = useState("Misc sale")
  const [checkoutMiscAmountInput, setCheckoutMiscAmountInput] = useState("0.00")
  const [checkoutReceiptDelivery, setCheckoutReceiptDelivery] =
    useState<CheckoutReceiptDelivery>("print")
  const [checkoutReceiptEmail, setCheckoutReceiptEmail] = useState("")
  const [checkoutTenderMode, setCheckoutTenderMode] = useState<CheckoutTenderMode>("card")
  const [checkoutCashReceivedInput, setCheckoutCashReceivedInput] = useState("0.00")
  const [checkoutCompletedReceipt, setCheckoutCompletedReceipt] =
    useState<LocalSyncCheckoutTransaction | null>(null)
  const [squareTerminalStatus, setSquareTerminalStatus] =
    useState<LocalSyncSquareTerminalStatusResult | null>(null)
  const [squareTerminalDeviceCode, setSquareTerminalDeviceCode] =
    useState<LocalSyncSquareTerminalDeviceCodeResult | null>(null)
  const [squareTerminalProbeStatus, setSquareTerminalProbeStatus] = useState<StatusTone>("idle")
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
  const [intakeMinimumPriceInput, setIntakeMinimumPriceInput] = useState("0.00")
  const [intakeLocation, setIntakeLocation] = useState("Intake Queue")
  const [inventoryLocations, setInventoryLocations] = useState(() =>
    Array.from(
      new Set(
        ["Intake Queue", "Showcase A", "Case 1", "Case 2", "Back Stock"]
          .concat(workspace.inventoryItems.map((item) => item.location))
          .map((location) => location.trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right)),
  )
  const [newInventoryLocation, setNewInventoryLocation] = useState("")
  const [intakeOnlineVisibility, setIntakeOnlineVisibility] = useState<InventoryVisibility>("visible")
  const [intakeKioskVisibility, setIntakeKioskVisibility] = useState<InventoryVisibility>("visible")
  const [intakePosVisibility, setIntakePosVisibility] = useState<InventoryVisibility>("visible")
  const [intakeProductType, setIntakeProductType] = useState<"raw" | "graded">("raw")
  const [intakeGradingCompany, setIntakeGradingCompany] = useState("PSA")
  const [intakeGrade, setIntakeGrade] = useState("")
  const [intakeCertNumber, setIntakeCertNumber] = useState("")
  const [tradeInCustomerLookupInput, setTradeInCustomerLookupInput] = useState("")
  const [tradeInCustomerName, setTradeInCustomerName] = useState("")
  const [tradeInCustomerPhone, setTradeInCustomerPhone] = useState("")
  const [tradeInCustomerEmail, setTradeInCustomerEmail] = useState("")
  const [tradeInCustomerIdNumber, setTradeInCustomerIdNumber] = useState("")
  const [tradeInCustomerIdState, setTradeInCustomerIdState] = useState("")
  const [tradeInCustomerIdNumberOnFile, setTradeInCustomerIdNumberOnFile] = useState("")
  const [tradeInCustomerMatches, setTradeInCustomerMatches] = useState<LocalSyncCustomer[]>([])
  const [tradeInSelectedCustomerPublicId, setTradeInSelectedCustomerPublicId] = useState("")
  const [tradeInSelectedCustomerSnapshot, setTradeInSelectedCustomerSnapshot] =
    useState<LocalSyncCustomer | null>(null)
  const [tradeInCustomerLookupStatus, setTradeInCustomerLookupStatus] = useState<
    "idle" | "searching" | "matched" | "empty" | "blocked"
  >("idle")
  const [tradeInCardQuery, setTradeInCardQuery] = useState("")
  const [tradeInCardGame, setTradeInCardGame] = useState<LocalSyncScryDexCard["game"]>("pokemon")
  const [tradeInProductType, setTradeInProductType] = useState<"raw" | "graded">("raw")
  const [tradeInCardResults, setTradeInCardResults] = useState<LocalSyncScryDexCard[]>([])
  const [tradeInCardSetFilter, setTradeInCardSetFilter] = useState("")
  const [tradeInSelectedCardId, setTradeInSelectedCardId] = useState("")
  const [tradeInSelectedVariantId, setTradeInSelectedVariantId] = useState("")
  const [tradeInCardLookupStatus, setTradeInCardLookupStatus] = useState<
    "idle" | "searching" | "ready" | "blocked"
  >("idle")
  const [tradeInCardLookupDetail, setTradeInCardLookupDetail] = useState(
    "Search ScryDex to add cards to this offer.",
  )
  const [tradeInCondition, setTradeInCondition] = useState("LP")
  const [tradeInGradingCompany, setTradeInGradingCompany] = useState("PSA")
  const [tradeInGrade, setTradeInGrade] = useState("")
  const [tradeInCertNumber, setTradeInCertNumber] = useState("")
  const [tradeInSecondaryValuation, setTradeInSecondaryValuation] =
    useState<LocalSyncGradedValuation | null>(null)
  const [tradeInSecondaryValuationStatus, setTradeInSecondaryValuationStatus] =
    useState("ScryDex/reference cache is the primary pricing source.")
  const [tradeInPayoutType, setTradeInPayoutType] = useState<TradeInPayoutType>("credit")
  const [tradeInPercentageBasisPoints, setTradeInPercentageBasisPoints] = useState(6000)
  const [tradeInManualFinalValueInput, setTradeInManualFinalValueInput] = useState("")
  const [tradeInDraftItems, setTradeInDraftItems] = useState<TradeInDraftItem[]>([])
  const [tradeInLoadedOrderId, setTradeInLoadedOrderId] = useState("")
  const [tradeInRecordSearch, setTradeInRecordSearch] = useState("")
  const [tradeInStaffFilter, setTradeInStaffFilter] = useState("")
  const [serverTradeInOrders, setServerTradeInOrders] = useState<LocalSyncTradeInOrder[]>([])
  const [tradeInSyncStatus, setTradeInSyncStatus] = useState<"idle" | "saving" | "ready" | "blocked">("idle")
  const [tradeInSyncDetail, setTradeInSyncDetail] = useState(
    "Drafts save to the LAN middleman so every employee station sees the same review queue.",
  )
  const [scryDexQuery, setScryDexQuery] = useState("")
  const [scryDexGame, setScryDexGame] = useState<LocalSyncScryDexCard["game"]>("pokemon")
  const [scryDexCards, setScryDexCards] = useState<LocalSyncScryDexCard[]>([])
  const [scryDexSetFilter, setScryDexSetFilter] = useState("")
  const [selectedScryDexCardId, setSelectedScryDexCardId] = useState("")
  const [selectedScryDexVariantId, setSelectedScryDexVariantId] = useState("")
  const [scryDexLookupStatus, setScryDexLookupStatus] = useState<
    "idle" | "searching" | "ready" | "blocked"
  >("idle")
  const [scryDexLookupDetail, setScryDexLookupDetail] = useState("Ready")
  const [priceReviews, setPriceReviews] = useState<LocalSyncPriceReviewItem[]>([])
  const [selectedPriceReviewIds, setSelectedPriceReviewIds] = useState<string[]>([])
  const [priceReviewStatus, setPriceReviewStatus] = useState<"idle" | "working" | "ready" | "blocked">("idle")
  const [priceReviewDetail, setPriceReviewDetail] = useState("Open this workspace to load pending price decisions.")
  const [priceReviewDrafts, setPriceReviewDrafts] = useState<Record<string, string>>({})
  const [liveCardScanMode, setLiveCardScanMode] = useState<LiveCardScanMode | null>(null)
  const [liveCardScanStatus, setLiveCardScanStatus] = useState<
    "idle" | "starting" | "ready" | "identifying" | "blocked"
  >("idle")
  const [liveCardScanDetail, setLiveCardScanDetail] = useState("Line the card up inside the guide.")
  const [liveCardScanPreviewUrl, setLiveCardScanPreviewUrl] = useState("")
  const [selectedId, setSelectedId] = useState(42)
  const [intakeQuantityInput, setIntakeQuantityInput] = useState("1")
  const [selectedEventId, setSelectedEventId] = useState(workspace.eventSnapshots[0]?.eventId ?? "")
  const [newEventTitle, setNewEventTitle] = useState("")
  const [newEventStartsAt, setNewEventStartsAt] = useState("")
  const [newEventGame, setNewEventGame] = useState("pokemon")
  const [newEventType, setNewEventType] = useState("league")
  const [newEventCapacity, setNewEventCapacity] = useState("16")
  const [newEventPrice, setNewEventPrice] = useState("0.00")
  const [newEventRecurrenceFrequency, setNewEventRecurrenceFrequency] =
    useState<"none" | "daily" | "weekly" | "monthly">("none")
  const [newEventRecurrenceCount, setNewEventRecurrenceCount] = useState("1")
  const [newEventCloseValue, setNewEventCloseValue] = useState("2")
  const [newEventCloseUnit, setNewEventCloseUnit] = useState<"minutes" | "hours" | "days">("hours")
  const [newEventLocation, setNewEventLocation] = useState("Event Room")
  const [newEventDescription, setNewEventDescription] = useState("")
  const [eventRegistrantFirstName, setEventRegistrantFirstName] = useState("")
  const [eventRegistrantLastName, setEventRegistrantLastName] = useState("")
  const [eventRegistrantEmail, setEventRegistrantEmail] = useState("")
  const [eventRegistrantPhone, setEventRegistrantPhone] = useState("")
  const [eventAttendeeLabel, setEventAttendeeLabel] = useState("Offline walk-in")
  const [eventPaymentStatus, setEventPaymentStatus] =
    useState<EventPaymentStatus>("not_required")
  const [eventCheckinSearch, setEventCheckinSearch] = useState("")
  const [eventCheckinLookup, setEventCheckinLookup] = useState("")
  const [activeSection, setActiveSection] = useState<string>(() => initialEmployeeSectionForAccess(ACCESS_SECTIONS, "owner"))
  const [sessionRole, setSessionRole] = useState<AppSessionRole>("locked")
  const [sessionUserId, setSessionUserId] = useState("")
  const [localSyncSessionToken, setLocalSyncSessionToken] = useState("")
  const [localSyncSessionExpiresAtUtc, setLocalSyncSessionExpiresAtUtc] = useState("")
  const [localSyncStatus, setLocalSyncStatus] = useState<LocalSyncStatusResult | null>(null)
  const [localSyncLastCheckedAtUtc, setLocalSyncLastCheckedAtUtc] = useState("")
  const [catalogRefreshInFlight, setCatalogRefreshInFlight] = useState(false)
  const [catalogRefreshSummary, setCatalogRefreshSummary] = useState("")
  const [squarePosPlan, setSquarePosPlan] =
    useState<LocalSyncSquarePosInventoryPullPlanResult | null>(null)
  const [squareCountsInput, setSquareCountsInput] = useState(
    '{\n  "counts": []\n}',
  )
  const [squareCountReconciliation, setSquareCountReconciliation] =
    useState<LocalSyncSquarePosInventoryCountReconciliationResult | null>(null)
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
  const squareCountSummary =
    squareCountReconciliation?.status === "ok" ? squareCountReconciliation.summary : null
  const squareCountComparisons =
    squareCountReconciliation?.status === "ok" ? squareCountReconciliation.comparisons : []
  const squareUnexpectedCounts =
    squareCountReconciliation?.status === "ok" ? squareCountReconciliation.unexpected_square_counts : []
  const squareCountNextActions =
    squareCountReconciliation?.status === "ok" ? squareCountReconciliation.next_actions : []
  const [localDeviceHeartbeat, setLocalDeviceHeartbeat] =
    useState<LocalSyncDeviceHeartbeatResult | null>(null)
  const [localDeviceStatus, setLocalDeviceStatus] =
    useState<LocalSyncDeviceStatusResult | null>(null)
  const [managerReportKey, setManagerReportKey] = useState<LocalSyncReportKey>("sales")
  const [managerReportDateFrom, setManagerReportDateFrom] = useState("")
  const [managerReportDateTo, setManagerReportDateTo] = useState("")
  const [managerReportStaffFilter, setManagerReportStaffFilter] = useState("")
  const [managerReportChannelFilter, setManagerReportChannelFilter] = useState("")
  const [managerReportGameFilter, setManagerReportGameFilter] = useState("")
  const [managerReportStatus, setManagerReportStatus] = useState<StatusTone>("idle")
  const [managerReportDetail, setManagerReportDetail] = useState("Choose filters, then pull live manager data.")
  const [managerReportResult, setManagerReportResult] =
    useState<LocalSyncManagerReportResult | null>(null)
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
      access: ["Inventory", "Trade-Ins", "Kiosk", "Queue", "Events", "Customers", "Sync", "Status"],
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
      name: "Preview Owner",
      pin: "1420",
      role: "owner",
      access: [...ACCESS_SECTIONS],
    },
  ])
  const [newUserName, setNewUserName] = useState("")
  const [newUserPin, setNewUserPin] = useState("")
  const [newUserRole, setNewUserRole] = useState<Exclude<AppSessionRole, "locked">>("staff")
  const [newUserAccess, setNewUserAccess] = useState<AccessSection[]>([
    "Inventory",
    "Trade-Ins",
    "Kiosk",
    "Queue",
    "Status",
  ])
  const [kioskFirstName, setKioskFirstName] = useState("")
  const [kioskLastName, setKioskLastName] = useState("")
  const [kioskSearchQuery, setKioskSearchQuery] = useState("")
  const [kioskGameFilter, setKioskGameFilter] = useState("all")
  const [kioskSetFilter, setKioskSetFilter] = useState("all")
  const [kioskCartIds, setKioskCartIds] = useState<number[]>([])
  const [kioskCartInView, setKioskCartInView] = useState(true)
  const [kioskOrderTickets, setKioskOrderTickets] = useState<KioskOrderTicket[]>([])
  const [websitePickupTickets, setWebsitePickupTickets] = useState<WebsitePickupTicket[]>([])
  const [fulfillmentNotificationSettings, setFulfillmentNotificationSettings] =
    useState<LocalSyncFulfillmentNotificationSettings>(DEFAULT_FULFILLMENT_NOTIFICATION_SETTINGS)
  const [employeeOrderSoundSettings, setEmployeeOrderSoundSettings] = useState(
    loadEmployeeOrderSoundSettings,
  )
  const [orderNotificationSoundEnabled, setOrderNotificationSoundEnabled] = useState(false)
  const [orderNotificationIssue, setOrderNotificationIssue] = useState("")
  const [fulfillmentHistorySearch, setFulfillmentHistorySearch] = useState("")
  const [activeFulfillmentTicket, setActiveFulfillmentTicket] =
    useState<ActiveFulfillmentTicket | null>(null)
  const [fulfillmentSquareReference, setFulfillmentSquareReference] = useState("")
  const [fulfillmentSquareOrderId, setFulfillmentSquareOrderId] = useState("")
  const [creditApprovalThresholdMinorUnits, setCreditApprovalThresholdMinorUnits] = useState(2500)
  const [creditApprovalThresholdInput, setCreditApprovalThresholdInput] = useState("25.00")
  const operationalSyncRunningRef = useRef(false)
  const [activeProfileId, setActiveProfileId] = useState(connectorProfileStorage.activeProfileId)
  const activeSessionProfileRef = useRef(connectorProfileStorage.activeProfileId)
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all")
  const [productTypeFilter, setProductTypeFilter] = useState<InventoryProductTypeFilter>("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [quantityDeltaInput, setQuantityDeltaInput] = useState("1")
  const [quantityAdjustmentReason, setQuantityAdjustmentReason] =
    useState("staff offline quantity correction")
  const [selectedPriceInput, setSelectedPriceInput] = useState("0.00")
  const [selectedMinimumPriceInput, setSelectedMinimumPriceInput] = useState("0.00")
  const [selectedOnlineVisibility, setSelectedOnlineVisibility] =
    useState<InventoryVisibility>("visible")
  const [selectedKioskVisibility, setSelectedKioskVisibility] =
    useState<InventoryVisibility>("visible")
  const [selectedPosVisibility, setSelectedPosVisibility] =
    useState<InventoryVisibility>("visible")
  const [activityMessage, setActivityMessage] = useState<ActivityMessage>({
    title: offlineSessionStorage.restored ? "Local queue restored" : "Local workspace ready",
    detail: offlineSessionStorage.restored
      ? `${offlineSessionStorage.queuedOperations.length} queued operation(s) and ${offlineSessionStorage.syncAttempts.length} sync attempt(s) restored from this device.`
      : "Run website setup, scan inventory, or save an update for sync.",
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
  const [localSyncDiscovery, setLocalSyncDiscovery] = useState<LocalSyncDiscoveryState>({
    status: "idle",
    detail: "Desktop LAN discovery has not run. Manual server URL setup is always available.",
    servers: [],
    rawCredentialsReturned: false,
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
  const selectedInventoryItem = findInventoryItem(inventoryItems, selectedId) ?? null
  const hasSelectedInventoryItem = Boolean(selectedInventoryItem)
  const selectedItem = selectedInventoryItem ?? EMPTY_INVENTORY_ITEM
  const scryDexSetOptions = useMemo(() => scryDexSetOptionsFromCards(scryDexCards), [scryDexCards])
  const visibleScryDexCards = useMemo(
    () => scryDexCards.filter((card) => scryDexCardMatchesSetFilter(card, scryDexSetFilter)),
    [scryDexCards, scryDexSetFilter],
  )
  const tradeInCardSetOptions = useMemo(
    () => scryDexSetOptionsFromCards(tradeInCardResults),
    [tradeInCardResults],
  )
  const visibleTradeInCards = useMemo(
    () => tradeInCardResults.filter((card) => scryDexCardMatchesSetFilter(card, tradeInCardSetFilter)),
    [tradeInCardResults, tradeInCardSetFilter],
  )
  const selectedScryDexCard = scryDexCards.find((card) => scryDexCardIdentity(card) === selectedScryDexCardId) ?? null
  const selectedScryDexDisplayVariants = scryDexDisplayVariants(selectedScryDexCard)
  const selectedScryDexVariant =
    selectedScryDexDisplayVariants.find(
      (variant, index) =>
        selectedScryDexCard &&
        scryDexVariantId(scryDexCardIdentity(selectedScryDexCard), variant, index) === selectedScryDexVariantId,
    ) ?? null
  const selectedTradeInCard =
    tradeInCardResults.find((card) => scryDexCardIdentity(card) === tradeInSelectedCardId) ?? null
  const selectedTradeInDisplayVariants = scryDexDisplayVariants(selectedTradeInCard)
  const selectedTradeInVariant =
    selectedTradeInDisplayVariants.find(
      (variant, index) =>
        selectedTradeInCard &&
        scryDexVariantId(scryDexCardIdentity(selectedTradeInCard), variant, index) === tradeInSelectedVariantId,
    ) ?? null
  const selectedTradeInVariantLabel = selectedTradeInVariant
    ? formatScryDexVariant(selectedTradeInVariant) || "Selected version"
    : "Default version"
  const selectedTradeInImageUrl = cardImageForSelectedVariant(selectedTradeInCard, selectedTradeInVariant)
  const selectedTradeInPrimaryValuation = resolveTradeInMarketValuation(
    selectedTradeInCard,
    selectedTradeInVariant,
    tradeInCondition,
    tradeInProductType,
    tradeInGradingCompany,
    tradeInGrade,
  )
  const selectedTradeInValuation = resolveTradeInMarketValuation(
    selectedTradeInCard,
    selectedTradeInVariant,
    tradeInCondition,
    tradeInProductType,
    tradeInGradingCompany,
    tradeInGrade,
    tradeInSecondaryValuation,
    tradeInSecondaryValuationStatus,
  )
  const selectedTradeInMarketMinorUnits = selectedTradeInValuation.marketMinorUnits
  const selectedScryDexVariantLabel = selectedScryDexVariant
    ? formatScryDexVariant(selectedScryDexVariant) || "Selected version"
    : "Default version"
  const selectedScryDexImageUrl = cardImageForSelectedVariant(selectedScryDexCard, selectedScryDexVariant)
  const selectedScryDexIntakePriceMinorUnits = selectedScryDexCard
    ? scryDexIntakePriceMinorUnits(
        selectedScryDexCard,
        selectedScryDexVariant,
        intakeCondition,
        intakeProductType,
        intakeGradingCompany,
        intakeGrade,
      )
    : 0
  const selectedInventoryImageUrl = selectedItem.imageUrl || ""
  const selectedInventoryVersionLabel = inventoryVersionLabel(selectedItem)
  const selectedInventoryVisibilitySummary = inventoryVisibilitySummary(selectedItem)

  useEffect(() => {
    if (hasSelectedInventoryItem) {
      setQuantityDeltaInput(String(inventoryStockCount(selectedItem)))
      setSelectedPriceInput(creditRedemptionInputFromMinorUnits(selectedItem.priceMinorUnits))
      setSelectedMinimumPriceInput(
        creditRedemptionInputFromMinorUnits(
          selectedItem.minimumSalePriceMinorUnits ?? selectedItem.priceMinorUnits,
        ),
      )
      setSelectedOnlineVisibility(selectedItem.onlineVisibility ?? "visible")
      setSelectedKioskVisibility(selectedItem.kioskVisibility ?? "visible")
      setSelectedPosVisibility(selectedItem.posVisibility ?? "visible")
    }
  }, [hasSelectedInventoryItem, selectedItem.publicId, selectedItem.rowVersion])
  const visibleEventSnapshots = useMemo(
    () => eventSnapshots.filter((event) => isActiveEventSnapshot(event)),
    [eventSnapshots],
  )
  const selectedEvent =
    visibleEventSnapshots.find((event) => event.eventId === selectedEventId) ??
    visibleEventSnapshots[0] ??
    eventSnapshots[0]
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
  const activeCustomerProfile =
    customerProfileResult?.status === "ok" &&
    customerProfileResult.customer.customer_public_id === customerCredit.customerPublicId
      ? customerProfileResult
      : null
  const activeCustomerTradeInOrders = activeCustomerProfile?.trade_in_orders ?? []
  const activeCustomerProfileSummary = activeCustomerProfile?.summary ?? null
  const activeManagerReportSummaryCards = managerReportSummaryCards(managerReportResult)
  const activeManagerReportCharts = managerReportCharts(managerReportResult)
  const activeManagerReportKpiCards = managerReportKpiCards(managerReportResult)
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
    return filterInventoryItems(inventoryItems, query, statusFilter, productTypeFilter)
  }, [query, statusFilter, productTypeFilter, inventoryItems])
  const filteredInventoryCopyCount = useMemo(
    () => filteredItems.reduce((total, item) => total + inventoryStockCount(item), 0),
    [filteredItems],
  )
  const filteredInventoryGroups = useMemo(
    () => groupInventoryItems(filteredItems, selectedId),
    [filteredItems, selectedId],
  )
  const selectedInventoryGroup = useMemo(
    () =>
      groupInventoryItems(inventoryItems, selectedId).find((group) =>
        group.items.some((item) => item.id === selectedId),
      ) ?? null,
    [inventoryItems, selectedId],
  )
  const kioskFilteredItems = useMemo(() => {
    return filterInventoryItems(inventoryItems, kioskSearchQuery, "available")
  }, [inventoryItems, kioskSearchQuery])
  const kioskVisibleItems = useMemo(
    () =>
      kioskFilteredItems.filter(
        (item) =>
          item.status === "available" &&
          (item.kioskVisibility ?? "visible") === "visible" &&
          (kioskGameFilter === "all" || (item.game ?? "").toLowerCase() === kioskGameFilter) &&
          (kioskSetFilter === "all" || item.setName === kioskSetFilter),
      ),
    [kioskFilteredItems, kioskGameFilter, kioskSetFilter],
  )
  const kioskGameOptions = useMemo(
    () =>
      [...new Set(
        inventoryItems
          .filter((item) => item.status === "available" && (item.kioskVisibility ?? "visible") === "visible")
          .map((item) => (item.game ?? "").toLowerCase())
          .filter(Boolean),
      )].sort(),
    [inventoryItems],
  )
  const kioskSetOptions = useMemo(
    () =>
      [...new Set(
        inventoryItems
          .filter(
            (item) =>
              item.status === "available" &&
              (item.kioskVisibility ?? "visible") === "visible" &&
              (kioskGameFilter === "all" || (item.game ?? "").toLowerCase() === kioskGameFilter),
          )
          .map((item) => item.setName)
          .filter(Boolean),
      )].sort(),
    [inventoryItems, kioskGameFilter],
  )
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
  const kioskCartTotalLabel = formatMoney(kioskCartTotalMinorUnits, "USD")
  const activeKioskFulfillmentTicket =
    activeFulfillmentTicket?.source === "kiosk"
      ? kioskOrderTickets.find((ticket) => ticket.orderId === activeFulfillmentTicket.orderId) ?? null
      : null
  const activeWebsiteFulfillmentTicket =
    activeFulfillmentTicket?.source === "website"
      ? websitePickupTickets.find((ticket) => ticket.orderId === activeFulfillmentTicket.orderId) ?? null
      : null
  const kioskCustomerName = [kioskFirstName, kioskLastName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ")
  const kioskCustomerReady = kioskFirstName.trim() !== "" && kioskLastName.trim() !== ""
  const sessionIsUnlocked = sessionRole !== "locked"
  const managerControlsUnlocked = ["manager", "owner"].includes(sessionRole) && !managerSettingsLocked
  const ownerControlsUnlocked = sessionRole === "owner" && !managerSettingsLocked
  const inventoryTechnicalDetailsUnlocked = ["manager", "owner"].includes(sessionRole)
  const activeOfflineUser = offlineUsers.find((user) => user.id === sessionUserId) ?? null
  const effectiveAccess =
    sessionRole === "owner"
      ? ACCESS_SECTIONS
      : sessionRole === "manager"
        ? ACCESS_SECTIONS.filter((section) => !["Sync", "Conflicts"].includes(section))
        : (activeOfflineUser?.access ?? []).filter(
            (section) => !["Sync", "Status", "Conflicts", "Settings"].includes(section),
          )
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
  const priceReviewBadgeCount =
    localSyncStatus?.status === "ok"
      ? localSyncStatus.authoritative_schema?.price_review_pending_count ?? priceReviews.filter((review) => review.review_status === "pending").length
      : priceReviews.filter((review) => review.review_status === "pending").length
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
  const lanQueueSummaryItems =
    localSyncStatus?.status === "ok" ? (localSyncStatus.queue_summary?.items ?? []) : []
  const lanQueueSummaryTypeLabel =
    localSyncStatus?.status === "ok" && localSyncStatus.queue_summary
      ? Object.entries(localSyncStatus.queue_summary.by_type)
          .map(([type, count]) => `${formatQueueOperationType(type)} x${count}`)
          .join(", ") || "No pending LAN rows"
      : "LAN queue details unavailable"
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

    if (item.label === "Open conflicts") {
      return {
        ...item,
        value: String(openConflicts.length),
        tone: openConflicts.length > 0 ? "warning" : "success",
      }
    }

    return item
  })
  const conflictBadgeCount = openConflicts.length
  const eventQueuePreviewEntries = useMemo(
    () => buildOfflineEventQueuePreviewEntries(queuedOperations, eventSnapshots),
    [queuedOperations, eventSnapshots],
  )
  const eventCheckinSearchNeedle = eventCheckinSearch.trim().toLowerCase()
  const eventCheckinMatches = useMemo(
    () =>
      eventQueuePreviewEntries
        .filter((entry) => entry.operationType === "event_reservation")
        .filter((entry) => !selectedEventId || entry.eventId === selectedEventId)
        .filter((entry) => {
          if (!eventCheckinSearchNeedle) {
            return true
          }

          return [
            entry.attendeeLabel,
            entry.title,
            entry.registrationPublicId,
            entry.detail,
            entry.payloadSummary,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(eventCheckinSearchNeedle)
        })
        .slice(0, 8),
    [eventCheckinSearchNeedle, eventQueuePreviewEntries, selectedEventId],
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
  const liveConnectionModeLabel =
    localSyncStatus?.status === "ok" && localSyncStatus.wordpress_push_connected
      ? "Online"
      : localSyncStatus?.status === "ok"
        ? "Online (local cache)"
        : "Offline fallback"
  const liveLastSyncLabel =
    desktopSyncExecution.status === "synced"
      ? "Just now"
      : lanSyncLastResult?.generatedAtLabel
        ? lanSyncLastResult.generatedAtLabel
        : localSyncLastCheckedAtUtc
          ? formatUtcLabel(localSyncLastCheckedAtUtc)
          : workspace.device.lastSyncLabel
  const scryDexLookupOrderLabel =
    localSyncStatus?.status === "ok" && localSyncStatus.scrydex_lookup_order.length > 0
      ? localSyncStatus.scrydex_lookup_order.join(" -> ")
      : "local_reference_cache -> wordpress_catalog_proxy -> scrydex_provider"
  const scryDexCurrentStockCount = visibleScryDexCards.reduce(
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
    selectedScryDexDisplayVariants
      .map(formatScryDexVariant)
      .filter(Boolean) ?? []
  const selectedScryDexSourceLabel =
    selectedScryDexCard?.catalog_source === "local_reference_cache"
      ? "Local reference cache"
      : selectedScryDexCard?.catalog_source === "wordpress_catalog_cache"
        ? "Website catalog cache"
        : selectedScryDexCard?.catalog_source === "wordpress_catalog_export"
          ? "Website catalog export"
          : "Catalog source pending"
  const activeKioskOrderTickets = kioskOrderTickets.filter((ticket) => !["completed", "expired"].includes(ticket.status))
  const activeWebsitePickupTickets = websitePickupTickets.filter((ticket) => ticket.status !== "completed")
  const completedKioskOrderTickets = kioskOrderTickets.filter((ticket) => ["completed", "expired"].includes(ticket.status))
  const completedWebsitePickupTickets = websitePickupTickets.filter((ticket) => ticket.status === "completed")
  const fulfillmentHistoryNeedle = fulfillmentHistorySearch.trim().toLowerCase()
  const searchableCompletedKioskOrderTickets = completedKioskOrderTickets.filter((ticket) =>
    fulfillmentTicketSearchText(ticket).includes(fulfillmentHistoryNeedle),
  )
  const searchableCompletedWebsitePickupTickets = completedWebsitePickupTickets.filter((ticket) =>
    fulfillmentTicketSearchText(ticket).includes(fulfillmentHistoryNeedle),
  )
  const customerProfileKioskOrderTickets =
    customerProfileResult?.status === "ok"
      ? customerProfileResult.kiosk_orders.map(kioskTicketFromLocalSyncOrder)
      : []
  const customerProfileCheckoutTransactions =
    customerProfileResult?.status === "ok" ? customerProfileResult.checkout_transactions : []
  const customerKioskOrderNeedle = customerKioskOrderSearch.trim().toLowerCase()
  const selectedCustomerPublicId = customerCredit.customerPublicId ?? ""
  const customerKioskOrderById = new Map<string, KioskOrderTicket>()
  for (const ticket of [...kioskOrderTickets, ...customerProfileKioskOrderTickets]) {
    customerKioskOrderById.set(ticket.orderId, ticket)
  }
  const customerKioskOrderMatches = [...customerKioskOrderById.values()]
    .filter((ticket) => {
      const searchText = fulfillmentTicketSearchText(ticket)
      const linkedToSelectedCustomer =
        Boolean(selectedCustomerPublicId) && ticket.customerPublicId === selectedCustomerPublicId
      const selectedCustomerNameMatch =
        activeCustomerName.trim().length >= 3 &&
        ticket.customerName.toLowerCase().includes(activeCustomerName.trim().toLowerCase())

      if (customerKioskOrderNeedle) {
        return searchText.includes(customerKioskOrderNeedle)
      }

      return linkedToSelectedCustomer || selectedCustomerNameMatch || ticket.status !== "completed"
    })
    .sort((left, right) => String(right.createdAtUtc).localeCompare(String(left.createdAtUtc)))
    .slice(0, 12)
  const checkoutKioskOrderMatches = customerKioskOrderMatches.filter(
    (ticket) => ticket.paymentStatus !== "paid" && !["completed", "expired"].includes(ticket.status),
  )
  const selectedCustomerKioskOrder =
    customerKioskOrderById.get(selectedCustomerKioskOrderId) ??
    customerKioskOrderMatches.find((ticket) => ticket.orderId === selectedCustomerKioskOrderId) ??
    null
  const checkoutInventorySearchNeedle = checkoutProductSearch.trim()
  const checkoutInventoryMatches = useMemo(
    () =>
      checkoutInventorySearchNeedle
        ? filterInventoryItems(inventoryItems, checkoutInventorySearchNeedle, "all")
            .filter((item) => (item.posVisibility ?? "visible") !== "hidden")
            .slice(0, 18)
        : [],
    [checkoutInventorySearchNeedle, inventoryItems],
  )
  const checkoutInventoryLines = checkoutCartLines.filter((line) => line.type !== "misc")
  const checkoutMiscLines = checkoutCartLines.filter((line) => line.type === "misc")
  const checkoutSubtotalMinorUnits = checkoutCartLines.reduce(
    (total, line) => total + line.totalMinorUnits,
    0,
  )
  const checkoutCreditMinorUnits =
    checkoutCustomerMode === "customer"
      ? Math.max(0, creditRedemptionInputToMinorUnits(creditRedemptionInput) ?? 0)
      : 0
  const checkoutAmountDueMinorUnits = Math.max(0, checkoutSubtotalMinorUnits - checkoutCreditMinorUnits)
  const checkoutCashInputMinorUnits = creditRedemptionInputToMinorUnits(checkoutCashReceivedInput)
  const checkoutCashPaidMinorUnits =
    checkoutTenderMode === "cash"
      ? checkoutAmountDueMinorUnits
      : checkoutTenderMode === "split"
        ? Math.min(checkoutAmountDueMinorUnits, Math.max(0, checkoutCashInputMinorUnits ?? 0))
        : 0
  const checkoutCardPaidMinorUnits =
    checkoutTenderMode === "card"
      ? checkoutAmountDueMinorUnits
      : checkoutTenderMode === "split"
        ? Math.max(0, checkoutAmountDueMinorUnits - checkoutCashPaidMinorUnits)
        : 0
  const checkoutCashReceivedMinorUnits =
    checkoutTenderMode === "cash" ? Math.max(0, checkoutCashInputMinorUnits ?? 0) : checkoutCashPaidMinorUnits
  const checkoutChangeDueMinorUnits =
    checkoutTenderMode === "cash"
      ? Math.max(0, checkoutCashReceivedMinorUnits - checkoutAmountDueMinorUnits)
      : 0
  const checkoutSquareDueMinorUnits = checkoutCardPaidMinorUnits
  const checkoutCustomerSelected = checkoutCustomerMode === "guest" || Boolean(customerCredit.customerPublicId)
  const checkoutCleanSquareReceiptReference = squareReceiptReference.trim().replace(/\s+/g, " ")
  const checkoutRequiresSquareReceipt = checkoutCardPaidMinorUnits > 0
  const checkoutSquareReceiptIssue =
    checkoutRequiresSquareReceipt && checkoutCleanSquareReceiptReference === ""
      ? "Enter the Square receipt, ticket, or transaction reference for the card payment."
      : checkoutRequiresSquareReceipt && checkoutCleanSquareReceiptReference.length < 3
        ? "Use at least 3 characters for the Square reference."
        : ""
  const checkoutTenderIssue =
    checkoutTenderMode === "cash" && checkoutCashInputMinorUnits === null
      ? "Use a valid cash received amount with up to two decimals."
      : checkoutTenderMode === "cash" && checkoutCashReceivedMinorUnits < checkoutAmountDueMinorUnits
        ? "Cash received must cover the amount due after store credit."
        : checkoutTenderMode === "split" && checkoutCashInputMinorUnits === null
          ? "Use a valid cash amount with up to two decimals."
          : checkoutTenderMode === "split" && checkoutCashPaidMinorUnits <= 0
            ? "Enter the cash portion for a split payment."
            : checkoutTenderMode === "split" && checkoutCashPaidMinorUnits >= checkoutAmountDueMinorUnits
              ? "Split payment needs both a cash amount and a card balance."
              : checkoutSquareReceiptIssue
  const checkoutReceiptEmailAddress =
    checkoutReceiptEmail.trim() ||
    (checkoutCustomerMode === "customer" && activeCustomerProfile?.customer.email
      ? activeCustomerProfile.customer.email
      : "")
  const checkoutReceiptEmailIssue =
    ["email", "both"].includes(checkoutReceiptDelivery) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutReceiptEmailAddress.trim())
      ? "Enter an email address before choosing an email receipt."
      : ""
  const checkoutUnavailableLines = checkoutCartLines.filter((line) => {
    if (line.type === "misc") {
      return false
    }

    const item = inventoryItems.find(
      (candidate) =>
        candidate.publicId === line.inventoryPublicId ||
        (!!line.barcode && candidate.barcode === line.barcode),
    )

    return !item || !["available", "reserved"].includes(item.status)
  })
  const checkoutHeldLines = checkoutCartLines.filter((line) => {
    if (line.type === "misc") {
      return false
    }

    return inventoryItems.some(
      (item) =>
        (item.publicId === line.inventoryPublicId || (!!line.barcode && item.barcode === line.barcode)) &&
        item.status === "reserved",
    )
  })
  const checkoutCanComplete =
    checkoutCartLines.length > 0 &&
    checkoutCustomerSelected &&
    checkoutUnavailableLines.length === 0 &&
    !checkoutReceiptEmailIssue &&
    !checkoutTenderIssue &&
    checkoutSubtotalMinorUnits > 0
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
  const scryDexCatalogStatus = localSyncStatus?.status === "ok" ? localSyncStatus.scrydex_catalog_status : null
  const scryDexCatalogTotals = scryDexCatalogStatus?.totals ?? null
  const scryDexActiveJob = scryDexCatalogStatus?.active_job ?? null
  const scryDexActiveJobs = scryDexCatalogStatus?.active_jobs ?? (scryDexActiveJob ? [scryDexActiveJob] : [])
  const scryDexRecentJobs = scryDexCatalogStatus?.recent_jobs ?? []
  const scryDexLastJob = scryDexActiveJobs[0] ?? scryDexCatalogStatus?.last_sync ?? scryDexRecentJobs[0] ?? null
  const scryDexLastJobReprice = scryDexInventoryRepriceRecord(scryDexLastJob)
  const scryDexLastJobCatalogPull = scryDexCatalogPullRecord(scryDexLastJob)
  const scryDexLiveLogLines = scryDexJobLiveLogLines(scryDexLastJob)
  const scryDexLastJobTone = scryDexJobTone(scryDexLastJob)
  const scryDexLastJobError = scryDexJobErrorSummary(scryDexLastJob)
  const scryDexGameTotalsByGame = new Map((scryDexCatalogTotals?.games ?? []).map((game) => [game.game, game]))
  const scryDexLatestCatalogSyncLabel = scryDexCatalogTotals?.latest_catalog_sync_utc
    ? formatUtcLabel(scryDexCatalogTotals.latest_catalog_sync_utc)
    : "unknown"
  const scryDexLatestPriceObservedLabel = scryDexCatalogTotals?.latest_price_observed_utc
    ? formatUtcLabel(scryDexCatalogTotals.latest_price_observed_utc)
    : "unknown"
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
        }; website catalog pull ${
          localSyncStatus?.status === "ok" && localSyncStatus.wordpress_catalog_pull_connected
            ? "connected"
            : "not configured"
        }. Local database first; website reference fallback only when the local cache misses.`,
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
          ? `${countLabel(visibleScryDexCards.length, "visible result")}; ${countLabel(scryDexCards.length, "total result")}; ${countLabel(scryDexCurrentStockCount, "stock copy")}`
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
          visibleScryDexCards.length > 0
            ? `${countLabel(visibleScryDexCards.length, "card")} visible with image and stock summary.`
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
      ? "Enter the Square ticket total before using store credit."
      : squareSaleTotalMinorUnits === null
        ? "Use a valid Square ticket total with up to two decimals."
        : squareSaleTotalMinorUnits <= 0
          ? "Square ticket total must be greater than $0.00."
          : ""
  const cleanSquareReceiptReference = squareReceiptReference.trim().replace(/\s+/g, " ")
  const squareReceiptReferenceIssue =
    cleanSquareReceiptReference === ""
      ? "Enter the Square receipt, ticket, or transaction reference before completing the sale."
      : cleanSquareReceiptReference.length < 3
        ? "Use at least 3 characters for the Square reference."
        : ""
  const cleanSquareSoldReference = squareSoldReference.trim().replace(/\s+/g, " ")
  const cleanSquareSoldOrderId = squareSoldOrderId.trim().replace(/\s+/g, " ")
  const squareSoldReferenceIssue =
    !hasSelectedInventoryItem
      ? "Import or add live inventory before finalizing a Square sale."
      : selectedItem.status !== "available" && selectedItem.status !== "reserved"
      ? `${selectedItem.cardName} is ${statusLabel(selectedItem.status).toLowerCase()} and cannot be finalized as a Square sale.`
      : cleanSquareSoldReference === ""
        ? "Enter the Square receipt, ticket, or order reference before marking this item sold."
        : cleanSquareSoldReference.length < 3
          ? "Use at least 3 characters for the Square sale reference."
          : ""
  const creditRedemptionMinorUnits = creditRedemptionInputToMinorUnits(creditRedemptionInput)
  const creditRedemptionIssue =
    squareSaleTotalIssue
      ? squareSaleTotalIssue
      : creditRedemptionInput.trim() === ""
      ? "Enter a credit amount before completing the sale."
      : creditRedemptionMinorUnits === null
        ? "Use a valid dollar amount with up to two decimals."
        : creditRedemptionMinorUnits <= 0
          ? "Credit amount must be greater than $0.00."
          : creditRedemptionMinorUnits > displayedCreditMinorUnits
            ? "Amount exceeds the customer's balance after in-progress holds."
            : squareSaleTotalMinorUnits !== null && creditRedemptionMinorUnits > squareSaleTotalMinorUnits
              ? "Credit amount cannot exceed the Square ticket total."
              : squareReceiptReferenceIssue
                ? squareReceiptReferenceIssue
                : !squareCashierConfirmed
                  ? "Confirm that the cashier applied this credit in Square before completing the sale."
                  : ""
  const creditAdjustmentMinorUnits = creditRedemptionInputToMinorUnits(creditAdjustmentInput)
  const creditAdjustmentIssue =
    creditAdjustmentInput.trim() === ""
      ? "Enter a customer credit adjustment amount."
      : creditAdjustmentMinorUnits === null
        ? "Use a valid dollar amount with up to two decimals."
        : creditAdjustmentMinorUnits === 0
          ? "Credit adjustment must be non-zero."
          : creditAdjustmentMinorUnits < 0 && creditAdjustmentReason.trim() === ""
            ? "A reason is required when removing customer credit."
          : ""
  const creditAdjustmentCanSubmit =
    !creditAdjustmentIssue &&
    Boolean(localSyncSessionToken)
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
  const quantityOnHand = inventoryAbsoluteQuantityFromInput(quantityDeltaInput)
  const quantityAdjustmentIssue =
    quantityOnHand === null
      ? "Enter the exact stock count as a whole number, including 0 if none remain."
      : ""
  const selectedPriceMinorUnits = creditRedemptionInputToMinorUnits(selectedPriceInput)
  const selectedMinimumPriceMinorUnits = creditRedemptionInputToMinorUnits(selectedMinimumPriceInput)
  const selectedDetailIssue =
    selectedPriceMinorUnits === null
      ? "Enter a sale price in dollars and cents."
      : selectedMinimumPriceMinorUnits === null
        ? "Enter a floor price in dollars and cents."
        : selectedPriceMinorUnits < selectedMinimumPriceMinorUnits
          ? "Sale price cannot be lower than the inventory floor price."
          : quantityAdjustmentIssue
  const selectedDetailPriceChanged =
    hasSelectedInventoryItem &&
    selectedPriceMinorUnits !== null &&
    (selectedPriceMinorUnits !== selectedItem.priceMinorUnits ||
      selectedMinimumPriceMinorUnits !== (selectedItem.minimumSalePriceMinorUnits ?? selectedItem.priceMinorUnits))
  const selectedDetailVisibilityChanged =
    hasSelectedInventoryItem &&
    (selectedOnlineVisibility !== (selectedItem.onlineVisibility ?? "visible") ||
      selectedKioskVisibility !== (selectedItem.kioskVisibility ?? "visible") ||
      selectedPosVisibility !== (selectedItem.posVisibility ?? "visible"))
  const intakePriceMinorUnits = creditRedemptionInputToMinorUnits(intakePriceInput)
  const intakeMinimumPriceMinorUnits = creditRedemptionInputToMinorUnits(intakeMinimumPriceInput)
  const intakeMarketPriceMinorUnits = selectedScryDexIntakePriceMinorUnits || intakePriceMinorUnits || 0
  const intakeAutoPriceMinorUnits = autoRetailPriceMinorUnits(intakeMarketPriceMinorUnits)
  const intakeFinalPriceMinorUnits = finalRetailPriceMinorUnits(
    intakeAutoPriceMinorUnits,
    intakeMinimumPriceMinorUnits ?? 0,
  )
  const parsedIntakeQuantity = Number.parseInt(intakeQuantityInput, 10)
  const intakeQuantity = Number.isFinite(parsedIntakeQuantity)
    ? Math.min(200, Math.max(1, parsedIntakeQuantity))
    : null
  const intakeIssue =
    intakeCardName.trim() === ""
      ? "Enter a card name before adding local inventory."
      : intakePriceMinorUnits === null
        ? "Use a valid current market price with up to two decimals."
        : intakePriceMinorUnits <= 0
          ? "Current market price must be greater than $0.00."
          : intakeMinimumPriceMinorUnits === null
            ? "Use a valid minimum sale price with up to two decimals."
            : intakeQuantity === null
              ? "Enter a quantity from 1 to 200."
              : intakeProductType === "graded" && intakeGradingCompany.trim() === ""
                ? "Choose or enter a grading company before adding graded inventory."
                : intakeProductType === "graded" && intakeGrade.trim() === ""
                  ? "Enter the card grade before adding graded inventory."
              : ""
  const selectedScryDexQueueQuantity = intakeQuantity ?? 1
  const selectedScryDexIntakeSummary = selectedScryDexCard
    ? `${selectedScryDexQueueQuantity} ${selectedScryDexQueueQuantity === 1 ? "copy" : "copies"} as ${
        intakeProductType === "graded"
          ? `graded ${intakeGradingCompany}${intakeGrade ? ` ${intakeGrade}` : ""}`
          : intakeCondition || "RAW"
      } at ${formatMoney(
        intakeFinalPriceMinorUnits,
        "USD",
      )}; market ${formatMoney(intakeMarketPriceMinorUnits, "USD")} + 10%, floor ${formatMoney(intakeMinimumPriceMinorUnits ?? 0, "USD")}`
    : ""
  const intakeVisibilitySummary = `Online ${intakeOnlineVisibility.replace("_", " ")}, kiosk ${intakeKioskVisibility.replace(
    "_",
    " ",
  )}, POS ${intakePosVisibility.replace("_", " ")}`
  const tradeInCurrentCardName = selectedTradeInCard?.card_name ?? ""
  const tradeInCurrentSetName = selectedTradeInCard?.set_name ?? ""
  const tradeInCurrentCondition = tradeInCondition
  const tradeInCurrentProductType = tradeInProductType
  const tradeInCurrentGradingCompany = tradeInGradingCompany.trim()
  const tradeInCurrentGrade = tradeInGrade.trim()
  const tradeInCurrentCertNumber = tradeInCertNumber.trim()
  const tradeInCurrentImageUrl = selectedTradeInImageUrl
  const tradeInCurrentMarketMinorUnits = selectedTradeInMarketMinorUnits
  const tradeInPreviewValueMinorUnits = tradeInValueMinorUnits(
    tradeInCurrentMarketMinorUnits,
    tradeInPercentageBasisPoints,
  )
  const tradeInManualFinalValueMinorUnits =
    tradeInManualFinalValueInput.trim() === ""
      ? null
      : creditRedemptionInputToMinorUnits(tradeInManualFinalValueInput)
  const tradeInManualFinalValueIssue =
    tradeInManualFinalValueInput.trim() !== "" && tradeInManualFinalValueMinorUnits === null
      ? "Enter a valid dollar amount or clear the override."
      : ""
  const tradeInCurrentFinalValueMinorUnits =
    tradeInManualFinalValueMinorUnits ?? tradeInPreviewValueMinorUnits
  const tradeInCurrentFinalValueManuallySet = tradeInManualFinalValueMinorUnits !== null
  const tradeInCashTotalMinorUnits = tradeInDraftItems
    .filter((item) => item.payoutType === "cash")
    .reduce((total, item) => total + item.finalValueMinorUnits, 0)
  const tradeInCreditTotalMinorUnits = tradeInDraftItems
    .filter((item) => item.payoutType === "credit")
    .reduce((total, item) => total + item.finalValueMinorUnits, 0)
  const tradeInCombinedTotalMinorUnits = tradeInCashTotalMinorUnits + tradeInCreditTotalMinorUnits
  const tradeInCustomerLookupQuery = [
    tradeInCustomerLookupInput,
    tradeInCustomerName,
    tradeInCustomerPhone,
    tradeInCustomerEmail,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ")
  const tradeInSelectedCustomer =
    tradeInSelectedCustomerSnapshot ??
    tradeInCustomerMatches.find(
      (customer) => customer.customer_public_id === tradeInSelectedCustomerPublicId,
    ) ?? null
  const tradeInExactCustomerMatch =
    tradeInSelectedCustomer ??
    tradeInCustomerMatches.find((customer) =>
      localSyncCustomerMatchesTradeInLookup(
        customer,
        tradeInCustomerLookupInput,
        tradeInCustomerName,
        tradeInCustomerPhone,
        tradeInCustomerEmail,
      ),
    ) ??
    null
  const tradeInPrimaryCustomerMatch = tradeInExactCustomerMatch ?? tradeInCustomerMatches[0] ?? null
  const tradeInCustomerSelected = Boolean(tradeInSelectedCustomer)
  const tradeInCustomerNameRequired = tradeInCustomerName.trim() === ""
  const tradeInCustomerIdNumberForPayload = tradeInCustomerIdNumber.includes("*")
    ? ""
    : tradeInCustomerIdNumber.trim()
  const tradeInCustomerIdStateForPayload = tradeInCustomerIdState.trim().toUpperCase()
  const tradeInCustomerIdReady =
    (tradeInCustomerIdNumberForPayload !== "" && tradeInCustomerIdStateForPayload !== "") ||
    (tradeInCustomerIdNumberOnFile !== "" && tradeInCustomerIdStateForPayload !== "")
  const tradeInCanCreateCustomer =
    !tradeInCustomerSelected &&
    !tradeInPrimaryCustomerMatch &&
    tradeInCustomerLookupStatus === "empty" &&
    tradeInCustomerLookupQuery.trim() !== ""
  const tradeInCustomerActionLabel =
    tradeInSelectedCustomer
      ? "Customer Selected"
      : tradeInCustomerLookupQuery.trim() === ""
      ? "Enter Customer"
      : tradeInCustomerLookupStatus === "searching"
        ? "Searching"
        : tradeInPrimaryCustomerMatch
          ? "Use Customer"
          : tradeInCanCreateCustomer
            ? "Create & Use Customer"
            : "Search Customer"
  const tradeInCustomerStatusLabel =
    tradeInSelectedCustomer
      ? `Using ${tradeInSelectedCustomer.display_name}`
      : tradeInCustomerLookupStatus === "searching"
        ? "Looking up customer"
        : tradeInPrimaryCustomerMatch
          ? `${tradeInCustomerMatches.length} match${tradeInCustomerMatches.length === 1 ? "" : "es"} found`
          : tradeInCustomerLookupStatus === "empty"
            ? "No match found"
            : tradeInCustomerLookupStatus === "blocked"
              ? "Lookup blocked"
              : "Search customer"
  const visibleServerTradeInOrders =
    tradeInSelectedCustomer && tradeInRecordSearch.trim() === "" && tradeInStaffFilter.trim() === ""
      ? serverTradeInOrders.filter((order) =>
          localSyncTradeInOrderMatchesCustomer(order, tradeInSelectedCustomer),
        )
      : serverTradeInOrders
  const selectedCustomerServerTradeInCount =
    tradeInSelectedCustomer
      ? serverTradeInOrders.filter((order) =>
          localSyncTradeInOrderMatchesCustomer(order, tradeInSelectedCustomer),
        ).length
      : 0
  const kioskInventoryPullConnected =
    localSyncStatus?.status === "ok" &&
    (localSyncStatus.wordpress_inventory_pull_connected ??
      localSyncStatus.wordpress_pull_connected)
  const kioskInventoryStatusLabel = !localSyncStatus
    ? "Connecting to live inventory"
    : kioskInventoryPullConnected
      ? "Live inventory connected"
      : localSyncStatus.status === "ok"
        ? "Local inventory available"
        : "Offline fallback active"
  const kioskInventoryStatusTone = !localSyncStatus
    ? "connecting"
    : kioskInventoryPullConnected
      ? "live"
      : localSyncStatus.status === "ok"
        ? "local"
        : "offline"

  useEffect(() => {
    return () => {
      stopLiveCardScanStream()
    }
  }, [])

  useEffect(() => {
    const lookupQuery = tradeInCustomerLookupQuery.trim()

    if (lookupQuery.length < 2) {
      setTradeInCustomerMatches([])
      if (!tradeInSelectedCustomerSnapshot) {
        setTradeInSelectedCustomerPublicId("")
      }
      setTradeInCustomerLookupStatus("idle")
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      setTradeInCustomerLookupStatus("searching")

      void localSyncClient.searchCustomers(lookupQuery).then((result) => {
        if (cancelled) {
          return
        }

        if (result.status !== "ok") {
          setTradeInCustomerMatches([])
          if (!tradeInSelectedCustomerSnapshot) {
            setTradeInSelectedCustomerPublicId("")
          }
          setTradeInCustomerLookupStatus("blocked")
          return
        }

        const matches = result.customers.slice(0, 6)
        setTradeInCustomerMatches(matches)
        setTradeInCustomerLookupStatus(matches.length > 0 ? "matched" : "empty")
        if (!tradeInSelectedCustomerSnapshot) {
          if (
            tradeInSelectedCustomerPublicId &&
            !matches.some((customer) => customer.customer_public_id === tradeInSelectedCustomerPublicId)
          ) {
            setTradeInSelectedCustomerPublicId("")
          }
        }
      })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [localSyncClient, tradeInCustomerLookupQuery, tradeInSelectedCustomerPublicId, tradeInSelectedCustomerSnapshot])

  useEffect(() => {
    if (tradeInProductType !== "graded") {
      setTradeInSecondaryValuation(null)
      setTradeInSecondaryValuationStatus("ScryDex/reference cache is the primary pricing source.")
      return
    }

    if (!selectedTradeInCard) {
      setTradeInSecondaryValuation(null)
      setTradeInSecondaryValuationStatus("Select a graded card to pull secondary comps.")
      return
    }

    if (!tradeInGrade.trim()) {
      setTradeInSecondaryValuation(null)
      setTradeInSecondaryValuationStatus("Enter the grade to pull secondary graded comps.")
      return
    }

    if (!selectedTradeInPrimaryValuation.usingFallback) {
      setTradeInSecondaryValuation(null)
      setTradeInSecondaryValuationStatus("Exact ScryDex/reference graded price is being used.")
      return
    }

    if (!localSyncSessionToken) {
      setTradeInSecondaryValuation(null)
      setTradeInSecondaryValuationStatus("Unlock with staff PIN to pull secondary graded comps.")
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      setTradeInSecondaryValuationStatus("Checking secondary graded comp providers.")

      void localSyncClient
        .lookupGradedTradeInValuation(localSyncSessionToken, {
          providerCardId: selectedTradeInCard.provider_card_id,
          providerVariantId: selectedTradeInVariant?.provider_variant_id ?? "",
          referenceVariantId: selectedTradeInVariant?.reference_variant_id ?? null,
          game: selectedTradeInCard.game,
          cardName: selectedTradeInCard.card_name,
          setName: selectedTradeInCard.set_name,
          setCode: selectedTradeInCard.set_code,
          cardNumber: selectedTradeInCard.card_number,
          printedNumber: selectedTradeInCard.printed_number,
          variant: selectedTradeInVariant?.variant ?? "",
          finish: selectedTradeInVariant?.finish ?? "",
          gradingCompany: tradeInGradingCompany,
          grade: tradeInGrade,
        })
        .then((result) => {
          if (cancelled) {
            return
          }

          if (result.status !== "ok") {
            setTradeInSecondaryValuation(null)
            setTradeInSecondaryValuationStatus(
              /API token/i.test(result.message)
                ? "Secondary graded comp lookup is not configured on this local server. Use Check comps or enter a manual offer."
                : result.message,
            )
            return
          }

          setTradeInSecondaryValuation(result.valuation)
          if (result.valuation) {
            setTradeInSecondaryValuationStatus(
              `${result.valuation.source_label} loaded${result.cache_hit ? " from cache" : ""}; ScryDex remains primary when exact pricing exists.`,
            )
            return
          }

          const providerStatus = result.provider_statuses[0]
          setTradeInSecondaryValuationStatus(staffSafeSecondaryProviderMessage(providerStatus))
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return
          }

          setTradeInSecondaryValuation(null)
          setTradeInSecondaryValuationStatus(
            error instanceof Error ? error.message : "Secondary graded comp lookup failed.",
          )
        })
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [
    localSyncClient,
    localSyncSessionToken,
    selectedTradeInCard,
    selectedTradeInPrimaryValuation.usingFallback,
    selectedTradeInVariant,
    tradeInGrade,
    tradeInGradingCompany,
    tradeInProductType,
  ])

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
    if (visibleEventSnapshots.length === 0) {
      if (selectedEventId !== "") {
        setSelectedEventId("")
      }
      return
    }

    if (!visibleEventSnapshots.some((event) => event.eventId === selectedEventId)) {
      setSelectedEventId(visibleEventSnapshots[0].eventId)
    }
  }, [selectedEventId, visibleEventSnapshots])

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
    if (!customerKioskMode && activeSection !== "Kiosk") {
      return
    }

    const normalizedQuery = kioskSearchQuery.trim()
    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      void localSyncClient.searchInventory(normalizedQuery).then((result) => {
        if (cancelled || result.status !== "ok") {
          return
        }

        setInventoryItems((items) => mergeLocalSyncInventoryItems(items, result.items))
      })
    }, normalizedQuery.length > 0 ? 220 : 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [customerKioskMode, activeSection, kioskSearchQuery, localSyncClient])

  useEffect(() => {
    if (!customerKioskMode) {
      return
    }

    let cancelled = false

    const refreshKioskConnection = () => {
      const normalizedQuery = kioskSearchQuery.trim()

      void Promise.all([
        localSyncClient.getSyncStatus(),
        localSyncClient.searchInventory(normalizedQuery),
      ]).then(([statusResult, inventoryResult]) => {
        if (!cancelled) {
          setLocalSyncStatus(statusResult)
          setLocalSyncLastCheckedAtUtc(new Date().toISOString())
          if (inventoryResult.status === "ok") {
            setInventoryItems((items) => {
              const mergedItems = mergeLocalSyncInventoryItems(items, inventoryResult.items)
              setKioskCartIds((ids) =>
                ids.filter((id) => {
                  const item = mergedItems.find((candidate) => candidate.id === id)
                  return item?.status === "available"
                }),
              )
              return mergedItems
            })
          }
        }
      })
    }

    refreshKioskConnection()
    const intervalId = window.setInterval(refreshKioskConnection, 15_000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [customerKioskMode, kioskSearchQuery, localSyncClient])

  useEffect(() => {
    if (!customerKioskMode || !kioskCartRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setKioskCartInView(entry.isIntersecting),
      { threshold: 0.15 },
    )

    observer.observe(kioskCartRef.current)

    return () => observer.disconnect()
  }, [customerKioskMode])

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
    if (!sessionIsUnlocked && !customerKioskMode) {
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
    customerKioskMode,
    sessionRole,
    sessionUserId,
    activeSection,
    activeProfile.id,
    activePairedDevice?.devicePublicId,
    localSyncClient,
  ])

  useEffect(() => {
    if (!sessionIsUnlocked || !localSyncSessionToken || customerKioskMode) {
      return
    }

    void runOperationalAutoSync()
    const syncIntervalId = window.setInterval(() => {
      void runOperationalAutoSync()
    }, 15_000)

    return () => window.clearInterval(syncIntervalId)
  }, [sessionIsUnlocked, localSyncSessionToken, customerKioskMode, localSyncClient])

  useEffect(() => {
    if (activeSection !== "ScryDex" || !localSyncSessionToken) {
      return
    }

    const statusIntervalId = window.setInterval(() => {
      void refreshLocalSyncStatus()
    }, scryDexActiveJob ? 2_000 : 5_000)

    return () => window.clearInterval(statusIntervalId)
  }, [activeSection, scryDexActiveJob?.job_id, localSyncSessionToken, localSyncClient])

  useEffect(() => {
    if (activeSection !== "Price Review" || !localSyncSessionToken || !["manager", "owner"].includes(sessionRole)) {
      return
    }

    void refreshPriceReviews()
  }, [activeSection, localSyncSessionToken, localSyncClient, sessionRole])

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
    const nextConflictReview = loadConflictReviewStorage(activeProfile.id, workspace.conflicts)
    setOpenConflicts(nextConflictReview.openConflicts)
    setReviewedConflicts(nextConflictReview.reviewedConflicts)
    setShowConflictHistory(nextConflictReview.reviewedConflicts.length > 0)
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
        : `${activeProfile.companyName} has a separate local queue on this device. ${nextConflictReview.restored ? `${nextConflictReview.reviewedConflicts.length} resolved conflict(s) stayed hidden after reload.` : ""}`,
    })
  }, [activeProfile.id, activeProfile.companyName])

  useEffect(() => {
    window.localStorage.setItem(
      CONNECTOR_PROFILE_STORAGE_KEY,
      JSON.stringify(buildConnectorProfileStorageSnapshot(connectorProfiles, activeProfileId)),
    )
  }, [connectorProfiles, activeProfileId])

  useEffect(() => {
    persistEmployeeOrderSoundSettings(employeeOrderSoundSettings)
  }, [employeeOrderSoundSettings])

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

  useEffect(() => {
    if (!sessionIsUnlocked) {
      setLoginPin("")
    }
  }, [sessionIsUnlocked])

  useEffect(() => {
    knownPickupTicketIdsRef.current = null

    if (!sessionIsUnlocked || !localSyncSessionToken || customerKioskMode) {
      return
    }

    void refreshFulfillmentNotificationSettings(localSyncSessionToken)
  }, [sessionIsUnlocked, localSyncSessionToken, customerKioskMode, localSyncClient])

  function isAccessSection(label: string): label is AccessSection {
    return ACCESS_SECTIONS.includes(label as AccessSection)
  }

  function accessFromLocalSyncUser(user: LocalSyncUser): AccessSection[] {
    return ["manager", "owner"].includes(user.role)
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
    if (["Reports", "Price Review"].includes(label) && !["manager", "owner"].includes(sessionRole)) {
      return false
    }

    return isAccessSection(label) && effectiveAccess.includes(label)
  }

  async function refreshPriceReviews() {
    if (!localSyncSessionToken) {
      setPriceReviewStatus("blocked")
      setPriceReviewDetail("Sign in with a manager or owner PIN to review prices.")
      return
    }

    setPriceReviewStatus("working")
    setPriceReviewDetail("Loading pending price decisions from the LAN source of truth.")
    const result = await localSyncClient.listPriceReviews(localSyncSessionToken, { status: "pending", limit: 250 })

    if (result.status !== "ok") {
      if (handleBlockedLocalSyncSession(result, "Price review locked")) {
        return
      }
      setPriceReviewStatus("blocked")
      setPriceReviewDetail(result.message)
      return
    }

    setPriceReviews(result.reviews)
    setSelectedPriceReviewIds((selected) => selected.filter((reviewId) =>
      result.reviews.some((review) => review.review_id === reviewId),
    ))
    setPriceReviewDrafts((current) => Object.fromEntries(
      result.reviews.map((review) => [
        review.review_id,
        current[review.review_id] ?? (review.candidate_price_minor_units / 100).toFixed(2),
      ]),
    ))
    setPriceReviewStatus("ready")
    setPriceReviewDetail(`${countLabel(result.pending_count, "price change")} waiting for a manager decision.`)
  }

  async function handlePriceReviewDecision(review: LocalSyncPriceReviewItem, status: "approved" | "rejected" | "manual") {
    if (!localSyncSessionToken) {
      return
    }

    let candidatePriceMinorUnits: number | undefined
    if (status === "approved" || status === "manual") {
      const parsed = Number(priceReviewDrafts[review.review_id])
      if (!Number.isFinite(parsed) || parsed < 0) {
        setActivityMessage({ title: "Price not approved", detail: "Enter a valid non-negative sale price." })
        return
      }
      candidatePriceMinorUnits = Math.round(parsed * 100)
    }

    const manualReason = status === "manual"
      ? window.prompt("Reason for keeping this as a manual price:", "Manager-set manual price")?.trim() ?? ""
      : ""
    if (status === "manual" && !manualReason) {
      return
    }

    setPriceReviewStatus("working")
    const result = await localSyncClient.decidePriceReview(localSyncSessionToken, review.review_id, {
      status: status === "manual" ? "approved" : status,
      candidatePriceMinorUnits,
      notes: status === "manual"
        ? manualReason
        : status === "approved"
          ? "Approved from employee app Price Review"
          : "Rejected from employee app Price Review",
      manualPriceOverride: status === "manual",
    })

    if (result.status !== "ok") {
      if (handleBlockedLocalSyncSession(result, "Price review locked")) {
        return
      }
      setPriceReviewStatus("blocked")
      setPriceReviewDetail(result.message)
      setActivityMessage({ title: "Price decision not saved", detail: result.message })
      return
    }

    setPriceReviews((reviews) => reviews.filter((candidate) => candidate.review_id !== review.review_id))
    setSelectedPriceReviewIds((selected) => selected.filter((reviewId) => reviewId !== review.review_id))
    setPriceReviewStatus("ready")
    setPriceReviewDetail(
      status === "approved" || status === "manual"
        ? `${review.inventory_item?.card_name ?? "Card"} was approved and queued for verified website, Square, and kiosk delivery.`
        : `${review.inventory_item?.card_name ?? "Card"} kept its current active price.`,
    )
    setActivityMessage({
      title: status === "manual" ? "Manual price set" : status === "approved" ? "Price approved" : "Price rejected",
      detail: status === "approved" || status === "manual"
        ? "The approved value is authoritative locally; external delivery remains pending until destination readback passes."
        : "The candidate was rejected and was not published.",
    })
    void refreshLocalSyncStatus()
  }

  async function handleBulkPriceReviewDecision(status: "approved" | "rejected") {
    if (!localSyncSessionToken || selectedPriceReviewIds.length === 0) {
      return
    }

    setPriceReviewStatus("working")
    const result = await localSyncClient.decidePriceReviews(localSyncSessionToken, {
      reviewIds: selectedPriceReviewIds,
      status,
      notes: `Bulk ${status} by ${sessionRole}`,
    })
    if (result.status !== "ok") {
      setPriceReviewStatus("blocked")
      setPriceReviewDetail(result.message ?? "One or more selected price decisions could not be saved.")
      return
    }

    setPriceReviews((reviews) => reviews.filter((review) => !selectedPriceReviewIds.includes(review.review_id)))
    setSelectedPriceReviewIds([])
    setPriceReviewStatus("ready")
    setPriceReviewDetail(`${countLabel(result.accepted_count, "price change")} ${status}.`)
    void refreshLocalSyncStatus()
  }

  async function handleRefreshManagerReport() {
    if (!["manager", "owner"].includes(sessionRole)) {
      setManagerReportStatus("blocked")
      setManagerReportDetail("Reports require a manager or owner PIN.")
      return
    }

    if (!localSyncSessionToken) {
      setManagerReportStatus("blocked")
      setManagerReportDetail("A valid local sync server session token is required.")
      return
    }

    setManagerReportStatus("working")
    setManagerReportDetail(`Pulling ${managerReportKey.replace("_", " ")} report from the LAN server.`)

    const result = await localSyncClient.getManagerReport(localSyncSessionToken, managerReportKey, {
      dateFrom: managerReportDateFrom || undefined,
      dateTo: managerReportDateTo || undefined,
      staffUserId: managerReportStaffFilter || undefined,
      channel: managerReportChannelFilter || undefined,
      game: managerReportGameFilter || undefined,
      page: 1,
      pageSize: 50,
    })

    setManagerReportResult(result)

    if (result.status !== "ok") {
      setManagerReportStatus("blocked")
      setManagerReportDetail(result.message)
      return
    }

    setManagerReportStatus("ready")
    setManagerReportDetail(
      `${result.report.replace("_", " ")} report ready with ${result.rows.length} row(s); ${
        result.wordpress_reports_pull_connected ? "WordPress report connector checked" : "local middleman data"
      }; CSV header ${result.csv_header || "pending"}.`,
    )
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
    setKioskOrderTickets([])
    setWebsitePickupTickets([])
  }

  function resetLocalSyncSessionForPin(title = "PIN session required") {
    setSessionRole("locked")
    setSessionUserId("")
    setLocalSyncSessionToken("")
    setLocalSyncSessionExpiresAtUtc("")
    setManagerSettingsLocked(true)
    setLoginPin("")
    setLoginIssue("Enter your 4-digit PIN to reconnect to the local sync server.")
    setActivityMessage({
      title,
      detail:
        "The local sync server rejected the saved session token. This can happen after the server restarts or the PIN session expires.",
    })
  }

  function handleBlockedLocalSyncSession(
    result: { status: string; code?: string; message?: string },
    title = "PIN session required",
  ) {
    if (
      result.status !== "blocked" ||
      !["session_required", "session_expired", "user_missing"].includes(result.code ?? "")
    ) {
      return false
    }

    resetLocalSyncSessionForPin(title)
    return true
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
    const firstAllowedSection = initialEmployeeSectionForAccess(user.access, user.role)

    setSessionRole(user.role)
    setSessionUserId(user.id)
    setManagerSettingsLocked(!["manager", "owner"].includes(user.role))
    setActiveSection(firstAllowedSection)
    setLoginPin("")
    setLoginIssue("")
    setActivityMessage({
      title: `${user.name} signed in`,
      detail,
    })
  }

  function currentClientDeviceMode() {
    if (customerKioskMode) {
      return "kiosk"
    }

    if (["manager", "owner"].includes(sessionRole)) {
      return "manager"
    }

    return "employee"
  }

  function currentClientDeviceCapabilities(): AccessSection[] {
    if (customerKioskMode) {
      return ["Kiosk", "Status"]
    }

    if (sessionRole === "owner") {
      return [...ACCESS_SECTIONS]
    }

    if (sessionRole === "manager") {
      return ACCESS_SECTIONS.filter((section) => !["Sync", "Conflicts"].includes(section))
    }

    return (activeOfflineUser?.access ?? ["Inventory", "Kiosk", "Queue"]).filter(
      (section) => !["Sync", "Status", "Conflicts", "Settings"].includes(section),
    )
  }

  async function refreshLocalSyncStatus() {
    const nextStatus = await localSyncClient.getSyncStatus()

    setLocalSyncStatus(nextStatus)
    setLocalSyncLastCheckedAtUtc(new Date().toISOString())

    return nextStatus
  }

  async function handleRefreshReferenceCatalog() {
    if (!localSyncSessionToken) {
      setActiveSection("Status")
      setActivityMessage({
        title: "Manager session required",
        detail: "Sign in with a manager or owner PIN before refreshing the local card catalog.",
      })
      return
    }

    const pageSize = 1000
    const maxPages = 250
    let page = 1
    let pulledCount = 0
    let appliedCount = 0
    let insertedCount = 0
    let updatedCount = 0
    let totalCount = 0

    setCatalogRefreshInFlight(true)
    setActivityMessage({
      title: "Refreshing card catalog",
      detail: "Pulling the website ScryDex catalog into the local cache. Searches can keep using the website fallback while this runs.",
    })

    try {
      while (page <= maxPages) {
        const result = await localSyncClient.pullWebsiteInventory(localSyncSessionToken, {
          domains: ["catalog"],
          catalogPage: page,
          catalogPageSize: pageSize,
        })

        if (handleBlockedLocalSyncSession(result, "Catalog refresh locked")) {
          return
        }

        if (result.status !== "ok") {
          setCatalogRefreshSummary(`Catalog refresh stopped on page ${page}: ${result.message}`)
          setActivityMessage({
            title: "Catalog refresh blocked",
            detail: result.message,
          })
          return
        }

        pulledCount += result.catalog_pulled_count ?? 0
        appliedCount += result.catalog_applied_count ?? 0
        insertedCount += result.catalog_inserted_count ?? 0
        updatedCount += result.catalog_updated_count ?? 0
        totalCount = result.catalog_meta?.total ?? totalCount
        setCatalogRefreshSummary(
          `Pulled ${countLabel(pulledCount, "card")} from ${countLabel(totalCount || pulledCount, "website row")}; local cache ${countLabel(result.local_reference_card_count ?? 0, "card")}.`,
        )

        if (!result.catalog_meta?.has_more || (result.catalog_pulled_count ?? 0) === 0) {
          break
        }

        page += 1
      }

      const statusResult = await refreshLocalSyncStatus()
      const finalCount = statusResult.status === "ok" ? statusResult.reference_card_count : appliedCount
      setCatalogRefreshSummary(
        `Catalog refresh complete: ${countLabel(appliedCount, "card")} applied, ${countLabel(insertedCount, "new card")}, ${countLabel(updatedCount, "updated card")}; local cache now ${countLabel(finalCount, "card")}.`,
      )
      setActivityMessage({
        title: "Card catalog refreshed",
        detail: `The local app cache now has ${countLabel(finalCount, "reference card")}. Website remains the source of truth.`,
      })
    } catch (error) {
      setCatalogRefreshSummary(error instanceof Error ? error.message : "Catalog refresh failed.")
      setActivityMessage({
        title: "Catalog refresh failed",
        detail: error instanceof Error ? error.message : "Catalog refresh failed.",
      })
    } finally {
      setCatalogRefreshInFlight(false)
    }
  }

  async function handleStartScryDexGameSync(gamesInput: LocalSyncScryDexCard["game"] | LocalSyncScryDexCard["game"][]) {
    if (!localSyncSessionToken) {
      setActiveSection("Status")
      setActivityMessage({
        title: "Manager session required",
        detail: "Sign in with a manager or owner PIN before starting a ScryDex game sync.",
      })
      return
    }

    const games = Array.isArray(gamesInput) ? gamesInput : [gamesInput]
    const gameLabel = games.length === 1 ? SCRYDEX_GAME_LABELS[games[0]] ?? games[0] : `${games.length} game`
    setCatalogRefreshInFlight(true)
    setCatalogRefreshSummary(`Starting ${gameLabel} catalog sync from the LAN middleman.`)

    try {
      const result = await localSyncClient.startScryDexCatalogSyncJob(
        localSyncSessionToken,
        games.length === 1 ? { game: games[0] } : { games },
      )

      if (handleBlockedLocalSyncSession(result, "ScryDex sync locked")) {
        return
      }

      if (result.status !== "ok") {
        setCatalogRefreshSummary(result.message)
        setActivityMessage({
          title: "ScryDex sync blocked",
          detail: result.message,
        })
        return
      }

      setCatalogRefreshSummary(
        `${scryDexCatalogJobLabel(result.job)} sync ${result.idempotent ? "already running" : "started"}: ${scryDexCatalogJobStage(result.job)}.`,
      )
      setActivityMessage({
        title: `${scryDexCatalogJobLabel(result.job)} sync running`,
        detail: "The LAN middleman is pulling the selected game catalog into local SQLite. This page will update each game block while it runs.",
      })
      await refreshLocalSyncStatus()
    } catch (error) {
      setCatalogRefreshSummary(error instanceof Error ? error.message : "ScryDex sync failed to start.")
      setActivityMessage({
        title: "ScryDex sync failed",
        detail: error instanceof Error ? error.message : "ScryDex sync failed to start.",
      })
    } finally {
      setCatalogRefreshInFlight(false)
    }
  }

  async function refreshInventoryLocations(sessionToken = localSyncSessionToken) {
    if (!sessionToken) {
      return null
    }

    const result = await localSyncClient.listInventoryLocations(sessionToken)

    if (result.status === "ok") {
      setInventoryLocations(result.locations)
    } else {
      handleBlockedLocalSyncSession(result, "Inventory location session required")
    }

    return result
  }

  async function handleAddInventoryLocation() {
    if (!localSyncSessionToken) {
      setActiveSection("Inventory")
      setActivityMessage({
        title: "PIN session required",
        detail: "Unlock with an employee, manager, or owner PIN before adding shared inventory locations.",
      })
      return
    }

    const location = newInventoryLocation.trim()

    if (!location) {
      setActivityMessage({
        title: "Location name required",
        detail: "Enter a shelf, case, box, or room name before saving a shared location.",
      })
      return
    }

    const result = await localSyncClient.addInventoryLocation(localSyncSessionToken, { location })

    if (result.status !== "ok") {
      setActivityMessage({
        title: result.status === "unavailable" ? "LAN server unavailable" : "Location not saved",
        detail: result.message,
      })
      handleBlockedLocalSyncSession(result, "Inventory location session required")
      return
    }

    setInventoryLocations(result.locations)
    setIntakeLocation(result.location)
    setNewInventoryLocation("")
    setActivityMessage({
      title: "Inventory location saved",
      detail: `${result.location} is now available for intake and shared with this LAN server.`,
    })
  }

  function applyFulfillmentNotificationSettings(
    settings?: LocalSyncFulfillmentNotificationSettings,
  ) {
    if (!settings) {
      return fulfillmentNotificationSettings
    }

    const nextSettings = {
      ...DEFAULT_FULFILLMENT_NOTIFICATION_SETTINGS,
      ...settings,
      employee_only: true as const,
      credentials_synced_to_client: false as const,
      raw_credentials_returned: false as const,
    }

    setFulfillmentNotificationSettings(nextSettings)

    return nextSettings
  }

  async function refreshFulfillmentNotificationSettings(sessionToken = localSyncSessionToken) {
    if (!sessionToken || customerKioskMode) {
      return fulfillmentNotificationSettings
    }

    const result = await localSyncClient.getFulfillmentNotifications(sessionToken)

    if (result.status !== "ok") {
      handleBlockedLocalSyncSession(result, "Order sound settings locked")
      return fulfillmentNotificationSettings
    }

    return applyFulfillmentNotificationSettings(result.fulfillment_notifications)
  }

  async function enableOrderNotificationSound() {
    setEmployeeOrderSoundSettings((settings) => ({
      ...settings,
      enabled: true,
      savedAtUtc: new Date().toISOString(),
    }))
    const played = await playOrderNotificationSound({
      reason: "Staff sound check",
      force: true,
    })

    if (played) {
      setOrderNotificationSoundEnabled(true)
      setOrderNotificationIssue("")
      setActivityMessage({
        title: "Order sounds enabled",
        detail: "This employee station will play a sound when a new kiosk or website pickup order arrives.",
      })
    }
  }

  async function handleEmployeeOrderSoundFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""

    if (!file) {
      return
    }

    const issue = employeeOrderSoundFileIssue(file)
    if (issue) {
      setOrderNotificationIssue(issue)
      setActivityMessage({
        title: "Sound not saved",
        detail: issue,
      })
      return
    }

    try {
      const soundDataUrl = await fileToDataUrl(file)
      setEmployeeOrderSoundSettings({
        enabled: true,
        soundDataUrl,
        soundFileName: file.name,
        savedAtUtc: new Date().toISOString(),
      })
      setOrderNotificationIssue("")
      setOrderNotificationSoundEnabled(false)
      setActivityMessage({
        title: "Order sound saved",
        detail: `${file.name} is saved on this employee station. Click Test Sound once to allow browser playback.`,
      })
    } catch {
      setOrderNotificationIssue("The app could not read that audio file. Choose a different MP3 or MP4.")
      setActivityMessage({
        title: "Sound not saved",
        detail: "The employee app could not read that audio file. Choose a different MP3 or MP4.",
      })
    }
  }

  function handleUseBuiltInOrderSound() {
    setEmployeeOrderSoundSettings({
      enabled: true,
      soundDataUrl: "",
      soundFileName: "",
      savedAtUtc: new Date().toISOString(),
    })
    setOrderNotificationSoundEnabled(false)
    setOrderNotificationIssue("")
    setActivityMessage({
      title: "Default order sound selected",
      detail: "This employee station will use the built-in alert tone until another MP3 or MP4 is chosen.",
    })
  }

  async function playOrderNotificationSound({
    newOrderCount = 0,
    reason = "New pickup order",
    force = false,
  }: {
    newOrderCount?: number
    reason?: string
    force?: boolean
  } = {}) {
    if (customerKioskMode || (!force && !employeeOrderSoundSettings.enabled)) {
      return false
    }

    try {
      const soundUrl = employeeOrderSoundSettings.soundDataUrl.trim()

      if (soundUrl) {
        const audio = orderNotificationAudioRef.current ?? new Audio()
        audio.src = soundUrl
        audio.currentTime = 0
        orderNotificationAudioRef.current = audio
        await audio.play()
      } else {
        await playBuiltInOrderTone(orderNotificationAudioContextRef)
      }

      setOrderNotificationSoundEnabled(true)
      setOrderNotificationIssue("")

      if (newOrderCount > 0) {
        setActivityMessage({
          title: reason,
          detail: `${newOrderCount} new pickup order${newOrderCount === 1 ? "" : "s"} arrived. Open Fulfillment to pull the cards.`,
        })
      }

      return true
    } catch {
      setOrderNotificationSoundEnabled(false)
      setOrderNotificationIssue(
        "Browser audio blocked this attempt. Click Enable Sound directly on this employee station.",
      )

      if (newOrderCount > 0) {
        setActivityMessage({
          title: reason,
          detail: `${newOrderCount} new pickup order${newOrderCount === 1 ? "" : "s"} arrived. Click Enable order sounds so future orders can play the alert.`,
        })
      }

      return false
    }
  }

  function handlePickupTicketNotifications(
    kioskTickets: KioskOrderTicket[],
    websiteTickets: WebsitePickupTicket[],
  ) {
    if (customerKioskMode || !employeeOrderSoundSettings.enabled) {
      return
    }

    const activeIds = new Set([
      ...kioskTickets
        .filter((ticket) => !["completed", "expired"].includes(ticket.status))
        .map((ticket) => `kiosk:${ticket.orderId}`),
      ...websiteTickets
        .filter((ticket) => ticket.status !== "completed")
        .map((ticket) => `website:${ticket.orderId}`),
    ])

    if (knownPickupTicketIdsRef.current === null) {
      knownPickupTicketIdsRef.current = activeIds
      return
    }

    const newIds = [...activeIds].filter((id) => !knownPickupTicketIdsRef.current?.has(id))
    knownPickupTicketIdsRef.current = activeIds

    if (newIds.length > 0) {
      void playOrderNotificationSound({
        newOrderCount: newIds.length,
        reason: "New pickup order",
      })
    }
  }

  async function refreshKioskOrderTickets(showMessage = false) {
    if (!localSyncSessionToken) {
      if (showMessage) {
        setActiveSection("Kiosk")
        setActivityMessage({
          title: "Kiosk queue needs login",
          detail: "Unlock with an employee, manager, or owner PIN before loading the shared pickup queue.",
        })
      }
      return null
    }

    const [result, websitePickupResult, notificationResult] = await Promise.all([
      localSyncClient.listKioskOrders(localSyncSessionToken, { limit: 25 }),
      localSyncClient.listFulfillmentOrders(localSyncSessionToken, { limit: 25, refresh: true }),
      customerKioskMode
        ? Promise.resolve(null)
        : localSyncClient.getFulfillmentNotifications(localSyncSessionToken),
    ])

    if (result.status !== "ok") {
      if (showMessage) {
        setActiveSection("Kiosk")
        setActivityMessage({
          title: result.status === "unavailable" ? "LAN server unavailable" : "Kiosk queue blocked",
          detail: result.message,
        })
      }
      return result
    }

    if (result.fulfillment_notifications) {
      applyFulfillmentNotificationSettings(result.fulfillment_notifications)
    }
    if (websitePickupResult.status === "ok" && websitePickupResult.fulfillment_notifications) {
      applyFulfillmentNotificationSettings(websitePickupResult.fulfillment_notifications)
    }
    if (notificationResult?.status === "ok") {
      applyFulfillmentNotificationSettings(notificationResult.fulfillment_notifications)
    }

    const nextKioskTickets = result.orders.map(kioskTicketFromLocalSyncOrder)
    const nextWebsitePickupTickets =
      websitePickupResult.status === "ok"
        ? websitePickupResult.orders.map(websitePickupTicketFromLocalSyncOrder)
        : websitePickupTickets

    setKioskOrderTickets(nextKioskTickets)

    if (websitePickupResult.status === "ok") {
      setWebsitePickupTickets(nextWebsitePickupTickets)
    } else if (showMessage) {
      setActivityMessage({
        title: websitePickupResult.status === "unavailable" ? "Website pickup unavailable" : "Website pickup blocked",
        detail: websitePickupResult.message,
      })
    }

    handlePickupTicketNotifications(nextKioskTickets, nextWebsitePickupTickets)

    if (showMessage) {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: "Shared pickup queue loaded",
        detail: `${result.order_count} kiosk pickup order(s) and ${
          websitePickupResult.status === "ok" ? websitePickupResult.order_count : 0
        } paid website pickup order(s) loaded from ${localSyncClient.serverUrl}; credentials copied to client: no.`,
      })
    }

    return result
  }

  async function runOperationalAutoSync() {
    if (!localSyncSessionToken || operationalSyncRunningRef.current) {
      return
    }

    operationalSyncRunningRef.current = true

    try {
      const pushResult = await localSyncClient.pushQueuedOperations(localSyncSessionToken)
      if (handleBlockedLocalSyncSession(pushResult, "Automatic sync locked")) {
        return
      }

      const pullResult = await localSyncClient.pullWebsiteInventory(localSyncSessionToken)
      if (handleBlockedLocalSyncSession(pullResult, "Automatic sync locked")) {
        return
      }

      const [inventoryResult, eventResult, kioskResult, fulfillmentResult, statusResult] =
        await Promise.all([
          localSyncClient.searchInventory(""),
          localSyncClient.listEvents(),
          localSyncClient.listKioskOrders(localSyncSessionToken, { limit: 50 }),
          localSyncClient.listFulfillmentOrders(localSyncSessionToken, { limit: 50, refresh: true }),
          localSyncClient.getSyncStatus(),
        ])

      if (inventoryResult.status === "ok") {
        setInventoryItems((items) => mergeLocalSyncInventoryItems(items, inventoryResult.items))
      }
      if (eventResult.status === "ok") {
        setEventSnapshots(eventResult.events.map(eventSnapshotFromLocalSync))
      }
      if (kioskResult.status === "ok") {
        if (kioskResult.fulfillment_notifications) {
          applyFulfillmentNotificationSettings(kioskResult.fulfillment_notifications)
        }
        setKioskOrderTickets(kioskResult.orders.map(kioskTicketFromLocalSyncOrder))
      }
      if (fulfillmentResult.status === "ok") {
        if (fulfillmentResult.fulfillment_notifications) {
          applyFulfillmentNotificationSettings(fulfillmentResult.fulfillment_notifications)
        }
        setWebsitePickupTickets(
          fulfillmentResult.orders.map(websitePickupTicketFromLocalSyncOrder),
        )
      }
      if (kioskResult.status === "ok" || fulfillmentResult.status === "ok") {
        handlePickupTicketNotifications(
          kioskResult.status === "ok" ? kioskResult.orders.map(kioskTicketFromLocalSyncOrder) : kioskOrderTickets,
          fulfillmentResult.status === "ok"
            ? fulfillmentResult.orders.map(websitePickupTicketFromLocalSyncOrder)
            : websitePickupTickets,
        )
      }
      setLocalSyncStatus(statusResult)
      setLocalSyncLastCheckedAtUtc(new Date().toISOString())
    } finally {
      operationalSyncRunningRef.current = false
    }
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

  async function handleReconcileSquarePosCounts() {
    if (!localSyncSessionToken) {
      setActiveSection("Settings")
      setActivityMessage({
        title: "Manager session required",
        detail: "Unlock with a manager PIN before comparing Square count pulls.",
      })
      return
    }

    let parsedCountsPayload: unknown

    try {
      parsedCountsPayload = JSON.parse(squareCountsInput)
    } catch {
      setActiveSection("Settings")
      setActivityMessage({
        title: "Square counts JSON invalid",
        detail: "Paste the Square inventory counts response as JSON before comparing counts.",
      })
      return
    }

    const counts = Array.isArray(parsedCountsPayload)
      ? (parsedCountsPayload.filter((row) => row && typeof row === "object") as Record<string, unknown>[])
      : undefined
    const squareCountsResponse =
      !Array.isArray(parsedCountsPayload) && parsedCountsPayload && typeof parsedCountsPayload === "object"
        ? (parsedCountsPayload as Record<string, unknown>)
        : undefined
    const result = await localSyncClient.reconcileSquarePosInventoryCounts(localSyncSessionToken, {
      counts,
      squareCountsResponse,
    })

    setSquareCountReconciliation(result)
    setActiveSection("Settings")

    if (result.status !== "ok") {
      setActivityMessage({
        title: "Square count comparison blocked",
        detail: result.message,
      })
      return
    }

    setActivityMessage({
      title: result.ready ? "Square counts matched" : "Square count review needed",
      detail:
        `${result.summary.matched_count} matched, ${result.summary.mismatched_count} mismatched, ` +
        `${result.summary.missing_square_count} missing, ${result.summary.unexpected_square_count} unexpected. ` +
        "No Square payment capture or inventory write was performed.",
    })
  }

  async function refreshLocalDeviceStatus() {
    const nextDeviceStatus = await localSyncClient.getDeviceStatus()

    setLocalDeviceStatus(nextDeviceStatus)

    return nextDeviceStatus
  }

  async function recordLocalDeviceHeartbeat(networkStatus: "online" | "offline" | "degraded" = "online") {
    const [heartbeatResult, syncStatusResult] = await Promise.all([
      localSyncClient.recordDeviceHeartbeat({
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
      }),
      localSyncClient.getSyncStatus(),
    ])

    setLocalDeviceHeartbeat(heartbeatResult)
    setLocalSyncStatus(syncStatusResult)
    setLocalSyncLastCheckedAtUtc(new Date().toISOString())
    void refreshLocalDeviceStatus()

    return heartbeatResult
  }

  async function handleDiscoverLocalSyncServers() {
    if (!managerControlsUnlocked) {
      setLocalSyncDiscovery({
        status: "blocked",
        detail: "Manager unlock is required before changing the local server connection.",
        servers: [],
        rawCredentialsReturned: false,
        credentialsSyncedToApp: false,
      })
      setActiveSection("Settings")
      return
    }

    if (!localSyncDiscoveryAdapter) {
      setLocalSyncDiscovery({
        status: "blocked",
        detail:
          "Desktop LAN discovery is only available in the installed Windows app. Enter the middleman server URL manually in this preview.",
        servers: [],
        rawCredentialsReturned: false,
        credentialsSyncedToApp: false,
      })
      setActivityMessage({
        title: "Manual server setup required",
        detail: "Browser preview cannot use LAN broadcast discovery; the installed app can auto-detect the middleman host.",
      })
      setActiveSection("Settings")
      return
    }

    setLocalSyncDiscovery({
      status: "searching",
      detail: "Searching this LAN for Pug local sync middleman servers.",
      servers: [],
      rawCredentialsReturned: false,
      credentialsSyncedToApp: false,
    })

    try {
      const result = await localSyncDiscoveryAdapter.discoverLocalSyncServers()
      const firstServer = result.servers[0]

      setLocalSyncDiscovery({
        status: result.server_count > 0 ? "ready" : "blocked",
        detail:
          result.server_count > 0
            ? `${result.server_count} local sync server${result.server_count === 1 ? "" : "s"} found.`
            : "No local sync server responded. Start the middleman host or enter its URL manually.",
        servers: result.servers,
        rawCredentialsReturned: result.raw_credentials_returned,
        credentialsSyncedToApp: result.credentials_synced_to_app,
      })

      if (firstServer) {
        setConnectorDraft((draft) => ({
          ...draft,
          localSyncServerUrl: firstServer.server_url,
          siteUrl: firstServer.website_url || draft.siteUrl,
        }))
      }

      setActivityMessage({
        title: firstServer ? "Local server discovered" : "Local server not found",
        detail: firstServer
          ? `${firstServer.hostname} at ${firstServer.server_url}; website ${firstServer.website_url || "not reported"}.`
          : "Manual setup remains available if broadcast discovery is blocked by the network.",
      })
    } catch (error) {
      setLocalSyncDiscovery({
        status: "blocked",
        detail:
          error instanceof Error
            ? error.message
            : "Local sync discovery failed. Enter the middleman server URL manually.",
        servers: [],
        rawCredentialsReturned: false,
        credentialsSyncedToApp: false,
      })
      setActivityMessage({
        title: "Local discovery failed",
        detail: "Manual middleman URL setup remains available.",
      })
    }
  }

  function handleApplyDiscoveredLocalSyncServer(server: LocalSyncDiscoveredServer) {
    if (!managerControlsUnlocked) {
      return
    }

    setConnectorDraft((draft) => ({
      ...draft,
      localSyncServerUrl: server.server_url,
      siteUrl: server.website_url || draft.siteUrl,
    }))
    setActivityMessage({
      title: "Local server applied",
      detail: `${server.hostname} is selected as the LAN middleman; run Probe LAN Server to verify the website binding.`,
    })
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
      setLoginIssue("Enter a valid 4-digit employee, manager, or owner PIN.")
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
      void localSyncClient.getSetupStatus().then((setupResult) => {
        if (setupResult.status === "ok") {
          setCreditApprovalThresholdMinorUnits(setupResult.credit_approval_threshold_minor_units)
          setCreditApprovalThresholdInput(
            creditRedemptionInputFromMinorUnits(setupResult.credit_approval_threshold_minor_units),
          )
        }
      })
      if (sessionUser.access.includes("Kiosk")) {
        void localSyncClient
          .listKioskOrders(authResult.session.token, { limit: 25 })
          .then((result) => {
            if (result.status === "ok") {
              setKioskOrderTickets(result.orders.map(kioskTicketFromLocalSyncOrder))
            }
          })
      }
      if (sessionUser.access.includes("Inventory")) {
        void refreshInventoryLocations(authResult.session.token)
      }
      startOfflineUserSession(
        sessionUser,
        ["manager", "owner"].includes(sessionUser.role)
          ? `${sessionUser.role === "owner" ? "Owner" : "Manager"} session verified by ${localSyncClient.serverUrl} for ${requestedTtlMinutes} minute(s); operational settings and user access can be unlocked.${policyDetail}`
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
    const managerCount = offlineUsers.filter((user) => ["manager", "owner"].includes(user.role)).length

    if (["manager", "owner"].includes(targetUser?.role ?? "") && role === "staff" && managerCount <= 1) {
      setActivityMessage({
        title: "Manager PIN required",
        detail: "Keep at least one manager PIN active for settings and access control.",
      })
      return
    }

    const nextAccess = ["manager", "owner"].includes(role) ? [...ACCESS_SECTIONS] : (targetUser?.access ?? [])
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

    if (["manager", "owner"].includes(targetUser?.role ?? "")) {
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
    const access = ["manager", "owner"].includes(newUserRole) ? [...ACCESS_SECTIONS] : newUserAccess

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
    setNewUserAccess(["Inventory", "Trade-Ins", "Kiosk", "Queue"])
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
        detail: `${activeOfflineUser?.name ?? "This PIN"} does not have access to ${employeeSectionLabel(label)}. Ask a manager to update Users & Access.`,
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
    actionTitle = "Inventory update saved",
    operationOptions: InventoryUpdateOptions = {},
    detailOverride?: string,
    targetItem = selectedItem,
  ) {
    if (targetItem.id === EMPTY_INVENTORY_ITEM.id) {
      setActiveSection("Inventory")
      setActivityMessage({
        title: "No inventory selected",
        detail: "Import the live inventory CSV or add a card before saving inventory changes.",
      })
      return
    }

    if (localSyncSessionToken) {
      const isQuantityAdjustment = operationOptions.operationKind === "quantity"
      const updateResult = await localSyncClient.updateInventoryItem(localSyncSessionToken, targetItem.publicId, {
        barcode: targetItem.barcode,
        location: targetItem.location,
        status: isQuantityAdjustment ? undefined : targetItem.status,
        priceMinorUnits: operationOptions.priceMinorUnits ?? targetItem.priceMinorUnits,
        minimumSalePriceMinorUnits:
          operationOptions.minimumSalePriceMinorUnits ??
          targetItem.minimumSalePriceMinorUnits ??
          targetItem.priceMinorUnits,
        quantityDelta: operationOptions.quantityDelta,
        quantityOnHand: operationOptions.quantityOnHand,
        onlineVisibility: operationOptions.onlineVisibility ?? targetItem.onlineVisibility ?? "visible",
        kioskVisibility: operationOptions.kioskVisibility ?? targetItem.kioskVisibility ?? "visible",
        posVisibility: operationOptions.posVisibility ?? targetItem.posVisibility ?? "visible",
        reason: operationOptions.adjustmentReason ?? "staff inventory update",
        syncIntent: operationOptions.syncIntent,
        consolidateInventoryGroup: isQuantityAdjustment,
      })

      if (updateResult.status === "ok") {
        const refreshedInventory =
          targetItem.barcode.trim().length > 0
            ? await localSyncClient.searchInventory(targetItem.barcode)
            : null
        const updatedItems =
          refreshedInventory?.status === "ok" && refreshedInventory.items.length > 0
            ? refreshedInventory.items
            : [updateResult.item]

        setInventoryItems((items) => mergeLocalSyncInventoryItems(items, updatedItems))
        void refreshLocalSyncStatus()
        setActivityMessage({
          title: actionTitle,
          detail:
            detailOverride ??
            `${targetItem.cardName} was saved to ${localSyncClient.serverUrl}; website and Square sync are queued from the LAN server.`,
        })
        return
      }

      if (updateResult.status === "blocked") {
        setActivityMessage({
          title: "Inventory update blocked",
          detail: updateResult.message,
        })
        return
      }
    }

    await stageOfflineOperation(
      buildInventoryUpdateOperation(targetItem, operationOptions),
      actionTitle,
      detailOverride ??
        `${targetItem.cardName} was saved for ${activeProfile.companyName}; it will sync after the device connector is paired.`,
    )
    setInventoryItems((items) =>
      items.map((item) =>
        item.id === targetItem.id
          ? {
              ...item,
              quantityOnHand:
                typeof operationOptions.quantityOnHand === "number"
                  ? operationOptions.quantityOnHand
                  : item.quantityOnHand,
              source: "queued",
            }
          : item,
      ),
    )
  }

  async function handleInventoryReservation() {
    if (!hasSelectedInventoryItem) {
      setActiveSection("Inventory")
      setActivityMessage({
        title: "No inventory selected",
        detail: "Import the live inventory CSV or add a card before creating a hold.",
      })
      return
    }

    if (selectedItem.status !== "available") {
      setActivityMessage({
        title: "Hold unavailable",
        detail: `${selectedItem.cardName} is ${statusLabel(selectedItem.status).toLowerCase()} locally; choose an available item before saving a hold.`,
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
      "Inventory hold saved",
      activeProfile.wordpress.canonicalInventoryWritesEnabled
        ? `${selectedItem.cardName} is locked by ${localSyncClient.serverUrl} and ready to sync with ${activeProfile.companyName} after pairing.`
        : `${selectedItem.cardName} is locked by ${localSyncClient.serverUrl} and saved locally until website sync is enabled.`,
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

  async function handleSquareSaleFinalize() {
    if (!hasSelectedInventoryItem) {
      setActiveSection("Inventory")
      setActivityMessage({
        title: "Square sale blocked",
        detail: "Import the live inventory CSV or add a card before finalizing a Square sale.",
      })
      return
    }

    if (squareSoldReferenceIssue) {
      setActivityMessage({
        title: "Square sale blocked",
        detail: squareSoldReferenceIssue,
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in with an employee, manager, or owner PIN before finalizing Square POS sold inventory.",
      })
      return
    }

    const saleResult = await localSyncClient.finalizeSquarePosSale(localSyncSessionToken, {
      inventoryPublicIds: [selectedItem.publicId],
      barcodes: [selectedItem.barcode],
      squareReceiptReference: cleanSquareSoldReference,
      squareOrderId: cleanSquareSoldOrderId,
      saleTotalMinorUnits: selectedItem.priceMinorUnits,
    })

    if (saleResult.status !== "ok") {
      setActivityMessage({
        title: saleResult.status === "unavailable" ? "LAN server unavailable" : "Square sale blocked",
        detail:
          saleResult.status === "unavailable"
            ? saleResult.message
            : `${saleResult.message} WordPress remains the final inventory authority.`,
      })
      return
    }

    const acceptedItems = saleResult.items ?? []
    const updatedItem = acceptedItems.find(
      (item) => item.public_id === selectedItem.publicId || item.barcode === selectedItem.barcode,
    )

    if (updatedItem) {
      setInventoryItems((items) =>
        items.map((item) =>
          item.publicId === selectedItem.publicId || item.barcode === selectedItem.barcode
            ? inventoryItemFromLocalSync(updatedItem, item.id)
            : item,
        ),
      )
    } else {
      setInventoryItems((items) =>
        items.map((item) =>
          item.publicId === selectedItem.publicId || item.barcode === selectedItem.barcode
            ? {
                ...item,
                status: "sold",
                source: saleResult.wordpress_accepted_count > 0 ? "accepted" : "queued",
                externalSyncState: saleResult.wordpress_accepted_count > 0 ? "synced" : "pending",
                rowVersion: item.rowVersion + 1,
              }
            : item,
        ),
      )
    }

    setSquareSoldReference("")
    setSquareSoldOrderId("")
    void refreshLocalSyncStatus()

    const syncDetail =
      saleResult.wordpress_auto_sync_performed && saleResult.wordpress_accepted_count > 0
        ? "WordPress accepted the sold status and WooCommerce inventory was updated; payment stayed in Square POS."
        : saleResult.wordpress_retry_count > 0
          ? "Sold locally and queued for website retry because the WordPress push did not accept yet."
          : "Sold locally; run sync once the website connector is available."

    setActivityMessage({
      title: "Square sale finalized",
      detail: `${selectedItem.cardName} sold against ${saleResult.square_receipt_reference}. ${syncDetail}`,
    })
  }

  async function handleInventoryIntake() {
    if (
      intakeIssue ||
      intakePriceMinorUnits === null ||
      intakeMinimumPriceMinorUnits === null ||
      intakeQuantity === null
    ) {
      setActivityMessage({
        title: "Inventory intake blocked",
        detail: intakeIssue || "Enter valid card intake details.",
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in with an employee, manager, or owner PIN before adding inventory.",
      })
      return
    }

    const intakeResult = await localSyncClient.createInventoryIntake(localSyncSessionToken, {
      cardName: intakeCardName.trim(),
      setName: intakeSetName.trim() || "Manual Intake",
      condition: intakeCondition.trim() || "RAW",
      barcode: intakeBarcode.trim(),
      priceMinorUnits: intakeFinalPriceMinorUnits,
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
      rawOrGraded:
        intakeProductType === "graded" || selectedScryDexVariant?.raw_or_graded_support === "graded"
          ? "graded"
          : "raw",
      gradingCompany: intakeProductType === "graded" ? intakeGradingCompany.trim() : "",
      grade: intakeProductType === "graded" ? intakeGrade.trim() : "",
      certNumber: intakeProductType === "graded" ? intakeCertNumber.trim() : "",
      imageUrl: selectedScryDexImageUrl,
      backImageUrl: selectedScryDexVariant?.back_image_url,
      priceSource: selectedScryDexCard
        ? `${selectedScryDexCard.catalog_source}:scrydex_catalog`
        : "manual_intake",
      priceObservedAtUtc:
        selectedScryDexCard?.price_observed_at_utc ??
        selectedScryDexCard?.catalog_synced_at_utc ??
        null,
      suggestedPriceMinorUnits: intakeMarketPriceMinorUnits,
      autoPriceMinorUnits: intakeAutoPriceMinorUnits,
      minimumSalePriceMinorUnits: intakeMinimumPriceMinorUnits,
      finalPriceMinorUnits: intakeFinalPriceMinorUnits,
      priceOverrideReason:
        intakeFinalPriceMinorUnits > intakeAutoPriceMinorUnits
          ? "minimum_sale_price_floor"
          : intakeFinalPriceMinorUnits !== intakeMarketPriceMinorUnits
            ? "tcg_market_plus_10_percent"
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
    let displayedNextItems = nextItems
    let displayedIntakeReceipts = intakeReceipts
    let autoPublishDetail =
      "Queued locally; the LAN server will publish it when the website connector is available."

    if (intakeResult.wordpress_auto_sync_performed) {
      const autoPushResult = localSyncPushResultFromAutoSync(intakeResult.auto_sync_results)
      const intakePublicIds = new Set(nextItems.map((item) => item.publicId))
      const acceptedIntakeResults = autoPushResult.results.filter(
        (result) => result.status === "accepted" && intakePublicIds.has(result.entity_id),
      )
      const acceptedPublicIds = new Set(acceptedIntakeResults.map((result) => result.entity_id))
      const wooSyncedCount = acceptedIntakeResults.filter(
        (result) => result.woocommerce_product_sync?.synced,
      ).length

      displayedNextItems = nextItems.map((item) =>
        acceptedPublicIds.has(item.publicId)
          ? {
              ...item,
              status: inventoryStatusFromWordPressPushResult(autoPushResult, item.publicId) ?? item.status,
              source: "accepted",
              rowVersion: item.rowVersion + 1,
            }
          : item,
      )
      displayedIntakeReceipts = applyLocalInventoryIntakePushResults(
        intakeReceipts,
        autoPushResult.results,
      ).receipts

      if (acceptedIntakeResults.length > 0 && wooSyncedCount > 0) {
        autoPublishDetail = `${acceptedIntakeResults.length} item(s) accepted by WordPress; ${wooSyncedCount} WooCommerce product sync(s) completed.`
      } else if (acceptedIntakeResults.length > 0) {
        autoPublishDetail = `${acceptedIntakeResults.length} item(s) accepted by WordPress; WooCommerce publish is still pending review in the sync status screen.`
      } else if (autoPushResult.retry_count > 0) {
        autoPublishDetail = "Saved locally; website publish will retry from the LAN queue."
      }
    } else if (effectiveAccess.includes("Sync")) {
      const autoPushResult = await localSyncClient.pushQueuedOperations(localSyncSessionToken)

      if (autoPushResult.status === "ok") {
        const intakePublicIds = new Set(nextItems.map((item) => item.publicId))
        const acceptedIntakeResults = autoPushResult.results.filter(
          (result) => result.status === "accepted" && intakePublicIds.has(result.entity_id),
        )
        const acceptedPublicIds = new Set(acceptedIntakeResults.map((result) => result.entity_id))
        const wooSyncedCount = acceptedIntakeResults.filter(
          (result) => result.woocommerce_product_sync?.synced,
        ).length

        displayedNextItems = nextItems.map((item) =>
          acceptedPublicIds.has(item.publicId)
            ? {
                ...item,
                status: inventoryStatusFromWordPressPushResult(autoPushResult, item.publicId) ?? item.status,
                source: "accepted",
                rowVersion: item.rowVersion + 1,
              }
            : item,
        )
        displayedIntakeReceipts = applyLocalInventoryIntakePushResults(
          intakeReceipts,
          autoPushResult.results,
        ).receipts

        if (acceptedIntakeResults.length > 0 && wooSyncedCount > 0) {
          autoPublishDetail = `${acceptedIntakeResults.length} item(s) accepted by WordPress; ${wooSyncedCount} WooCommerce product sync(s) completed.`
        } else if (acceptedIntakeResults.length > 0) {
          autoPublishDetail = `${acceptedIntakeResults.length} item(s) accepted by WordPress; WooCommerce publish is still pending review in the sync status screen.`
        } else if (autoPushResult.retry_count > 0) {
          autoPublishDetail = "Saved locally; website publish will retry from the LAN queue."
        }
      } else if (autoPushResult.status === "blocked") {
        autoPublishDetail = `${autoPushResult.message} Saved locally for retry.`
      } else {
        autoPublishDetail = `${autoPushResult.message} Saved locally for retry.`
      }
    } else {
      autoPublishDetail =
        "Saved locally; this PIN does not have Sync access, so a manager or sync-enabled user must publish the queue."
    }

    setInventoryItems((items) => [...displayedNextItems, ...items])
    setLocalInventoryIntakeReceipts((receipts) => [...displayedIntakeReceipts, ...receipts].slice(0, 50))
    setSelectedId(nextItem.id)
    setQuery(nextItem.cardName)
    setIntakeCardName("")
    setIntakeSetName("")
    setIntakeCondition("LP")
    setIntakeBarcode("")
    setIntakePriceInput("0.00")
    setIntakeMinimumPriceInput("0.00")
    setIntakeLocation("Intake Queue")
    setIntakeQuantityInput("1")
    setIntakeGrade("")
    setIntakeCertNumber("")
    void refreshLocalSyncStatus()
    setActivityMessage({
      title: "Inventory added",
      detail:
        `${nextItem.cardName} x${intakeResult.quantity_added ?? nextItems.length} saved. ${autoPublishDetail}`,
    })
  }

  function stopLiveCardScanStream() {
    liveCardScanStreamRef.current?.getTracks().forEach((track) => track.stop())
    liveCardScanStreamRef.current = null

    if (liveCardScanVideoRef.current) {
      liveCardScanVideoRef.current.srcObject = null
    }
  }

  async function openLiveCardScanner(mode: LiveCardScanMode) {
    if (!localSyncSessionToken) {
      const detail = "Enter your 4-digit staff PIN before scanning cards."

      if (mode === "inventory") {
        setScryDexLookupStatus("blocked")
        setScryDexLookupDetail(detail)
      } else {
        setTradeInCardLookupStatus("blocked")
        setTradeInCardLookupDetail(detail)
      }
      return
    }

    if (mode === "trade-in" && !tradeInSelectedCustomer) {
      setTradeInCardLookupStatus("blocked")
      setTradeInCardLookupDetail("Select or create a customer before scanning trade-in cards.")
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const detail = "This device does not expose a camera to the app. Use typed ScryDex search on this workstation."

      if (mode === "inventory") {
        setScryDexLookupStatus("blocked")
        setScryDexLookupDetail(detail)
      } else {
        setTradeInCardLookupStatus("blocked")
        setTradeInCardLookupDetail(detail)
      }
      return
    }

    stopLiveCardScanStream()
    setLiveCardScanMode(mode)
    setLiveCardScanStatus("starting")
    setLiveCardScanDetail("Starting camera")
    setLiveCardScanPreviewUrl("")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      liveCardScanStreamRef.current = stream
      await new Promise((resolve) => window.setTimeout(resolve, 40))

      if (liveCardScanVideoRef.current) {
        liveCardScanVideoRef.current.srcObject = stream
        await liveCardScanVideoRef.current.play()
      }

      setLiveCardScanStatus("ready")
      setLiveCardScanDetail("Line the card inside the guide, keep glare low, then scan.")
    } catch (error) {
      stopLiveCardScanStream()
      setLiveCardScanStatus("blocked")
      setLiveCardScanDetail(error instanceof Error ? error.message : "Camera could not be started.")
    }
  }

  function closeLiveCardScanner() {
    stopLiveCardScanStream()
    setLiveCardScanMode(null)
    setLiveCardScanStatus("idle")
    setLiveCardScanDetail("Line the card up inside the guide.")
  }

  function captureLiveCardScanFrame() {
    const video = liveCardScanVideoRef.current
    const canvas = liveCardScanCanvasRef.current

    if (!video || !canvas || video.videoWidth <= 0 || video.videoHeight <= 0) {
      throw new Error("Camera is not ready yet.")
    }

    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight
    const cardAspectRatio = 2.5 / 3.5
    const cropHeight = Math.min(sourceHeight * 0.86, (sourceWidth * 0.78) / cardAspectRatio)
    const cropWidth = cropHeight * cardAspectRatio
    const sourceX = Math.max(0, (sourceWidth - cropWidth) / 2)
    const sourceY = Math.max(0, (sourceHeight - cropHeight) / 2)
    const outputWidth = 1100
    const outputHeight = Math.round(outputWidth / cardAspectRatio)
    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("Camera frame could not be prepared.")
    }

    canvas.width = outputWidth
    canvas.height = outputHeight
    context.clearRect(0, 0, outputWidth, outputHeight)
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, outputWidth, outputHeight)
    context.filter = "contrast(1.08) saturate(1.05)"
    context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight)
    context.filter = "none"

    return canvas.toDataURL("image/jpeg", 0.86)
  }

  async function identifyLiveCardScanFrame() {
    if (!liveCardScanMode || !localSyncSessionToken) {
      setLiveCardScanStatus("blocked")
      setLiveCardScanDetail("Staff PIN session required before scanning cards.")
      return
    }

    try {
      const imageDataUrl = captureLiveCardScanFrame()
      const scanMode = liveCardScanMode
      const game = scanMode === "inventory" ? scryDexGame : tradeInCardGame
      const rawOrGraded = scanMode === "inventory" ? intakeProductType : tradeInProductType

      setLiveCardScanPreviewUrl(imageDataUrl)
      setLiveCardScanStatus("identifying")
      setLiveCardScanDetail("Reading card and loading matching catalog results")

      const result = await localSyncClient.identifyScryDexCardImage(localSyncSessionToken, {
        imageDataUrl,
        game,
        rawOrGraded,
      })

      if (result.status !== "ok") {
        if (handleBlockedLocalSyncSession(result, "Live card scanner locked")) {
          setLiveCardScanDetail("PIN session expired. Enter your 4-digit PIN, then scan again.")
        } else {
          setLiveCardScanDetail(result.message)
        }
        setLiveCardScanStatus("blocked")
        return
      }

      const nextSetFilter = result.vision_set_filter ?? result.set_filter ?? ""
      const firstCard =
        result.cards.find((card) => scryDexCardMatchesSetFilter(card, nextSetFilter)) ??
        result.cards[0] ??
        null
      const firstVariant = scryDexDisplayVariants(firstCard)[0] ?? null

      if (scanMode === "inventory") {
        setScryDexGame(result.game)
        setScryDexQuery(result.vision_query ?? result.query)
        setScryDexCards(result.cards)
        setScryDexSetFilter(nextSetFilter)
        setSelectedScryDexCardId(firstCard ? scryDexCardIdentity(firstCard) : "")
        setSelectedScryDexVariantId(
          firstCard && firstVariant
            ? scryDexVariantId(scryDexCardIdentity(firstCard), firstVariant, 0)
            : "",
        )
        setScryDexLookupStatus("ready")
        setScryDexLookupDetail(
          `${result.cards.length} catalog result${result.cards.length === 1 ? "" : "s"} loaded from live scan; confirm the exact version before adding inventory.`,
        )
      } else {
        setTradeInCardGame(result.game)
        setTradeInCardQuery(result.vision_query ?? result.query)
        setTradeInCardResults(result.cards)
        setTradeInCardSetFilter(nextSetFilter)
        setTradeInSelectedCardId(firstCard ? scryDexCardIdentity(firstCard) : "")
        setTradeInSelectedVariantId(
          firstCard && firstVariant
            ? scryDexVariantId(scryDexCardIdentity(firstCard), firstVariant, 0)
            : "",
        )
        setTradeInCardLookupStatus("ready")
        setTradeInCardLookupDetail(
          `${result.cards.length} catalog result${result.cards.length === 1 ? "" : "s"} loaded from live scan; choose the exact card, payout, and percentage.`,
        )
      }

      setActivityMessage({
        title: "Live card scan complete",
        detail:
          result.cards.length > 0
            ? "ScryDex Vision identified the card and loaded matching catalog records for staff confirmation."
            : "ScryDex Vision completed, but no catalog records matched. Try typed search or rescan with less glare.",
      })
      closeLiveCardScanner()
    } catch (error) {
      setLiveCardScanStatus("blocked")
      setLiveCardScanDetail(error instanceof Error ? error.message : "Scan failed. Try again with the card centered.")
    }
  }

  async function handleScryDexLookup(options: { forceLive?: boolean } = {}) {
    const normalizedQuery = scryDexQuery.trim()
    const forceLive = options.forceLive === true

    if (!normalizedQuery) {
      setScryDexLookupStatus("blocked")
      setScryDexLookupDetail("Enter a card, set, or number.")
      setScryDexCards([])
      setScryDexSetFilter("")
      setSelectedScryDexCardId("")
      setSelectedScryDexVariantId("")
      return
    }

    if (!localSyncSessionToken) {
      setScryDexLookupStatus("blocked")
      setScryDexLookupDetail("Staff PIN session required.")
      setScryDexCards([])
      setScryDexSetFilter("")
      setSelectedScryDexCardId("")
      setSelectedScryDexVariantId("")
      return
    }

    setScryDexLookupStatus("searching")
    setScryDexLookupDetail(forceLive ? "Live ScryDex search" : "Searching")
    setScryDexCards([])
    setScryDexSetFilter("")
    setSelectedScryDexCardId("")
    setSelectedScryDexVariantId("")

    const result = await localSyncClient.searchScryDexCards(
      localSyncSessionToken,
      normalizedQuery,
      scryDexGame,
      { limit: "all", rawOrGraded: intakeProductType === "graded" ? "graded" : "raw", forceLive },
    )

    if (result.status !== "ok") {
      if (handleBlockedLocalSyncSession(result, "Catalog search locked")) {
        setScryDexLookupStatus("blocked")
        setScryDexLookupDetail("PIN session expired. Enter your 4-digit PIN, then search again.")
        setScryDexCards([])
        setScryDexSetFilter("")
        setSelectedScryDexCardId("")
        setSelectedScryDexVariantId("")
        return
      }

      setScryDexLookupStatus("blocked")
      setScryDexLookupDetail(result.message)
      setScryDexCards([])
      setScryDexSetFilter("")
      setSelectedScryDexCardId("")
      setSelectedScryDexVariantId("")
      return
    }

    const firstCard = result.cards[0] ?? null
    const firstVariant = scryDexDisplayVariants(firstCard)[0] ?? null

    setScryDexCards(result.cards)
    setSelectedScryDexCardId(firstCard ? scryDexCardIdentity(firstCard) : "")
    setSelectedScryDexVariantId(
      firstCard && firstVariant
        ? scryDexVariantId(scryDexCardIdentity(firstCard), firstVariant, 0)
        : "",
    )
    setScryDexLookupStatus("ready")
    setScryDexLookupDetail(
      `${result.cards.length} result${result.cards.length === 1 ? "" : "s"} from ${result.source}${forceLive ? " (live)" : ""}; use set filter to narrow printings.`,
    )
  }

  async function handleSelectedScryDexReprice() {
    const card = selectedScryDexCard

    if (!card) {
      setScryDexLookupStatus("blocked")
      setScryDexLookupDetail("Select a catalog card before repricing from ScryDex.")
      return
    }

    if (!localSyncSessionToken) {
      setScryDexLookupStatus("blocked")
      setScryDexLookupDetail("Staff PIN session required.")
      return
    }

    const previousVariantLabel = selectedScryDexVariant ? formatScryDexVariant(selectedScryDexVariant) : ""
    const previousProviderVariantId = selectedScryDexVariant?.provider_variant_id ?? ""
    const previousReferenceVariantId = selectedScryDexVariant?.reference_variant_id ?? null

    setScryDexLookupStatus("searching")
    setScryDexLookupDetail(`Live ScryDex reprice for ${card.card_name}`)
    setScryDexQuery(card.card_name)
    setScryDexGame(card.game)
    setScryDexSetFilter("")

    const result = await localSyncClient.searchScryDexCards(
      localSyncSessionToken,
      card.card_name,
      card.game,
      { limit: "all", rawOrGraded: intakeProductType === "graded" ? "graded" : "raw", forceLive: true },
    )

    if (result.status !== "ok") {
      if (handleBlockedLocalSyncSession(result, "ScryDex reprice locked")) {
        setScryDexLookupDetail("PIN session expired. Enter your 4-digit PIN, then reprice again.")
      } else {
        setScryDexLookupDetail(result.message)
      }
      setScryDexLookupStatus("blocked")
      return
    }

    const refreshedCard =
      result.cards.find((candidate) => candidate.provider_card_id === card.provider_card_id) ??
      result.cards.find((candidate) => scryDexCardIdentity(candidate) === scryDexCardIdentity(card)) ??
      result.cards[0] ??
      null
    const refreshedVariants = scryDexDisplayVariants(refreshedCard)
    const refreshedVariant =
      refreshedVariants.find((variant) => previousProviderVariantId && variant.provider_variant_id === previousProviderVariantId) ??
      refreshedVariants.find((variant) => previousReferenceVariantId !== null && variant.reference_variant_id === previousReferenceVariantId) ??
      refreshedVariants.find((variant) => previousVariantLabel && formatScryDexVariant(variant) === previousVariantLabel) ??
      refreshedVariants[0] ??
      null

    setScryDexCards(result.cards)
    setSelectedScryDexCardId(refreshedCard ? scryDexCardIdentity(refreshedCard) : "")
    setSelectedScryDexVariantId(
      refreshedCard && refreshedVariant
        ? scryDexVariantId(scryDexCardIdentity(refreshedCard), refreshedVariant, refreshedVariants.indexOf(refreshedVariant))
        : "",
    )
    setScryDexLookupStatus("ready")
    setScryDexLookupDetail(
      `${result.cards.length} live ScryDex result${result.cards.length === 1 ? "" : "s"} refreshed for ${card.card_name}.`,
    )
  }

  async function handleSelectedTradeInScryDexReprice() {
    const card = selectedTradeInCard

    if (!card) {
      setTradeInCardLookupStatus("blocked")
      setTradeInCardLookupDetail("Select a trade-in catalog card before repricing from ScryDex.")
      return
    }

    if (!localSyncSessionToken) {
      setTradeInCardLookupStatus("blocked")
      setTradeInCardLookupDetail("Staff PIN session required before repricing from ScryDex.")
      return
    }

    const previousVariantLabel = selectedTradeInVariant ? formatScryDexVariant(selectedTradeInVariant) : ""
    const previousProviderVariantId = selectedTradeInVariant?.provider_variant_id ?? ""
    const previousReferenceVariantId = selectedTradeInVariant?.reference_variant_id ?? null

    setTradeInCardLookupStatus("searching")
    setTradeInCardLookupDetail(`Live ScryDex reprice for ${card.card_name}`)
    setTradeInCardQuery(card.card_name)
    setTradeInCardGame(card.game)
    setTradeInCardSetFilter("")
    setTradeInManualFinalValueInput("")

    const result = await localSyncClient.searchScryDexCards(
      localSyncSessionToken,
      card.card_name,
      card.game,
      { limit: "all", rawOrGraded: tradeInProductType === "graded" ? "graded" : "raw", forceLive: true },
    )

    if (result.status !== "ok") {
      if (handleBlockedLocalSyncSession(result, "Trade-in ScryDex reprice locked")) {
        setTradeInCardLookupDetail("PIN session expired. Enter your 4-digit PIN, then reprice again.")
      } else {
        setTradeInCardLookupDetail(result.message)
      }
      setTradeInCardLookupStatus("blocked")
      return
    }

    const refreshedCard =
      result.cards.find((candidate) => candidate.provider_card_id === card.provider_card_id) ??
      result.cards.find((candidate) => scryDexCardIdentity(candidate) === scryDexCardIdentity(card)) ??
      result.cards[0] ??
      null
    const refreshedVariants = scryDexDisplayVariants(refreshedCard)
    const refreshedVariant =
      refreshedVariants.find((variant) => previousProviderVariantId && variant.provider_variant_id === previousProviderVariantId) ??
      refreshedVariants.find((variant) => previousReferenceVariantId !== null && variant.reference_variant_id === previousReferenceVariantId) ??
      refreshedVariants.find((variant) => previousVariantLabel && formatScryDexVariant(variant) === previousVariantLabel) ??
      refreshedVariants[0] ??
      null

    setTradeInCardResults(result.cards)
    setTradeInSelectedCardId(refreshedCard ? scryDexCardIdentity(refreshedCard) : "")
    setTradeInSelectedVariantId(
      refreshedCard && refreshedVariant
        ? scryDexVariantId(
            scryDexCardIdentity(refreshedCard),
            refreshedVariant,
            refreshedVariants.indexOf(refreshedVariant),
          )
        : "",
    )
    setTradeInCardLookupStatus("ready")
    setTradeInCardLookupDetail(
      `${result.cards.length} live ScryDex result${result.cards.length === 1 ? "" : "s"} refreshed for ${card.card_name}.`,
    )
  }

  function handleScryDexSetFilterChange(nextFilter: string) {
    setScryDexSetFilter(nextFilter)

    const firstVisible = scryDexCards.find((card) => scryDexCardMatchesSetFilter(card, nextFilter)) ?? null
    const firstVariant = scryDexDisplayVariants(firstVisible)[0] ?? null

    setSelectedScryDexCardId(firstVisible ? scryDexCardIdentity(firstVisible) : "")
    setSelectedScryDexVariantId(
      firstVisible && firstVariant
        ? scryDexVariantId(scryDexCardIdentity(firstVisible), firstVariant, 0)
        : "",
    )
  }

  function resetTradeInCardSearch(
    detail = "Search ScryDex to add cards to this offer.",
  ) {
    setTradeInManualFinalValueInput("")
    setTradeInCardQuery("")
    setTradeInCardResults([])
    setTradeInCardSetFilter("")
    setTradeInSelectedCardId("")
    setTradeInSelectedVariantId("")
    setTradeInCardLookupStatus("idle")
    setTradeInCardLookupDetail(detail)
  }

  function clearTradeInSelectedCustomerForEdit() {
    setTradeInSelectedCustomerSnapshot(null)
    setTradeInSelectedCustomerPublicId("")
    setTradeInCustomerIdNumberOnFile("")
    resetTradeInCardSearch("Select a customer before searching cards for this offer.")
  }

  async function searchTradeInCustomersNow(lookupQuery = tradeInCustomerLookupQuery) {
    const normalizedLookupQuery = lookupQuery.trim()

    if (normalizedLookupQuery.length < 2) {
      setTradeInCustomerMatches([])
      setTradeInSelectedCustomerPublicId("")
      setTradeInCustomerLookupStatus("idle")
      return { status: "idle" as const, matches: [] }
    }

    setTradeInCustomerLookupStatus("searching")
    const result = await localSyncClient.searchCustomers(normalizedLookupQuery)

    if (result.status !== "ok") {
      setTradeInCustomerMatches([])
      setTradeInSelectedCustomerPublicId("")
      setTradeInCustomerLookupStatus("blocked")
      return { status: "blocked" as const, matches: [] }
    }

    const matches = result.customers.slice(0, 6)
    setTradeInCustomerMatches(matches)
    setTradeInCustomerLookupStatus(matches.length > 0 ? "matched" : "empty")
    setTradeInSelectedCustomerPublicId((selectedPublicId) =>
      selectedPublicId && matches.some((customer) => customer.customer_public_id === selectedPublicId)
        ? selectedPublicId
        : "",
    )

    return { status: "ok" as const, matches }
  }

  async function handleTradeInCardLookup() {
    if (!tradeInSelectedCustomer) {
      setTradeInCardLookupStatus("blocked")
      setTradeInCardLookupDetail("Select or create a customer before searching cards for this trade-in offer.")
      setTradeInCardResults([])
      setTradeInCardSetFilter("")
      setTradeInSelectedCardId("")
      setTradeInSelectedVariantId("")
      return
    }

    const normalizedQuery = tradeInCardQuery.trim()

    if (!normalizedQuery) {
      setTradeInCardLookupStatus("blocked")
      setTradeInCardLookupDetail("Enter a card name, set, or number.")
      setTradeInCardResults([])
      setTradeInCardSetFilter("")
      setTradeInSelectedCardId("")
      setTradeInSelectedVariantId("")
      return
    }

    if (!localSyncSessionToken) {
      setTradeInCardLookupStatus("blocked")
      setTradeInCardLookupDetail("Staff PIN session required before searching ScryDex.")
      setTradeInCardResults([])
      setTradeInCardSetFilter("")
      setTradeInSelectedCardId("")
      setTradeInSelectedVariantId("")
      return
    }

    setTradeInCardLookupStatus("searching")
    setTradeInCardLookupDetail("Searching ScryDex and local reference cache")
    setTradeInCardSetFilter("")

    const result = await localSyncClient.searchScryDexCards(
      localSyncSessionToken,
      normalizedQuery,
      tradeInCardGame,
      { limit: "all", rawOrGraded: tradeInProductType === "graded" ? "graded" : "raw" },
    )

    if (result.status !== "ok") {
      if (handleBlockedLocalSyncSession(result, "Trade-in card search locked")) {
        setTradeInCardLookupStatus("blocked")
        setTradeInCardLookupDetail("PIN session expired. Enter your 4-digit PIN, then search again.")
      } else {
        setTradeInCardLookupStatus("blocked")
        setTradeInCardLookupDetail(result.message)
      }

      setTradeInCardResults([])
      setTradeInCardSetFilter("")
      setTradeInSelectedCardId("")
      setTradeInSelectedVariantId("")
      return
    }

    const firstCard = result.cards[0] ?? null
    const firstVariant = scryDexDisplayVariants(firstCard)[0] ?? null

    setTradeInCardResults(result.cards)
    setTradeInSelectedCardId(firstCard ? scryDexCardIdentity(firstCard) : "")
    setTradeInSelectedVariantId(
      firstCard && firstVariant
        ? scryDexVariantId(scryDexCardIdentity(firstCard), firstVariant, 0)
        : "",
    )
    setTradeInCardLookupStatus("ready")
    setTradeInCardLookupDetail(
      `${result.cards.length} result${result.cards.length === 1 ? "" : "s"} loaded; use set filter to choose the exact printing.`,
    )
  }

  function handleTradeInCardSetFilterChange(nextFilter: string) {
    setTradeInCardSetFilter(nextFilter)

    const firstVisible = tradeInCardResults.find((card) => scryDexCardMatchesSetFilter(card, nextFilter)) ?? null
    const firstVariant = scryDexDisplayVariants(firstVisible)[0] ?? null

    setTradeInSelectedCardId(firstVisible ? scryDexCardIdentity(firstVisible) : "")
    setTradeInSelectedVariantId(
      firstVisible && firstVariant
        ? scryDexVariantId(scryDexCardIdentity(firstVisible), firstVariant, 0)
        : "",
    )
  }

  function handleSelectTradeInCard(card: LocalSyncScryDexCard, productType: "raw" | "graded" = tradeInProductType) {
    if (!tradeInSelectedCustomer) {
      setTradeInCardLookupStatus("blocked")
      setTradeInCardLookupDetail("Select or create a customer before choosing trade-in cards.")
      setActivityMessage({
        title: "Trade-in customer required",
        detail: "Select or create the customer at the top of the Trade-In Counter before adding card lines.",
      })
      return
    }

    const nextProductType = productType === "graded" ? "graded" : "raw"
    const firstVariant = scryDexDisplayVariants(card)[0] ?? null
    const variantId = firstVariant
      ? scryDexVariantId(scryDexCardIdentity(card), firstVariant, 0)
      : ""
    const gradedPoint = nextProductType === "graded" ? scryDexBestGradedPricePoint(card, firstVariant) : null

    setTradeInSelectedCardId(scryDexCardIdentity(card))
    setTradeInSelectedVariantId(variantId)
    setTradeInProductType(nextProductType)
    setTradeInCardGame(card.game)
    setTradeInManualFinalValueInput("")
    if (nextProductType === "graded") {
      setTradeInGradingCompany(gradedPoint?.grading_company || tradeInGradingCompany || "PSA")
      setTradeInGrade(gradedPoint?.grade || tradeInGrade)
    }
    setTradeInCardLookupDetail(
      `Selected ${card.card_name}; set condition, payout, and percentage before adding it to the offer.`,
    )
  }

  function handleTradeInVariantChange(nextVariantId: string) {
    setTradeInSelectedVariantId(nextVariantId)
    setTradeInManualFinalValueInput("")

    if (!selectedTradeInCard) {
      return
    }

    const nextVariant = selectedTradeInDisplayVariants.find(
      (variant, index) =>
        scryDexVariantId(scryDexCardIdentity(selectedTradeInCard), variant, index) === nextVariantId,
    ) ?? null
    const gradedPoint =
      tradeInProductType === "graded" ? scryDexBestGradedPricePoint(selectedTradeInCard, nextVariant) : null

    if (gradedPoint?.grading_company) {
      setTradeInGradingCompany(gradedPoint.grading_company)
    }

    if (gradedPoint?.grade) {
      setTradeInGrade(gradedPoint.grade)
    }
  }

  function handleTradeInProductTypeChange(nextProductType: "raw" | "graded") {
    setTradeInProductType(nextProductType)
    setTradeInManualFinalValueInput("")

    if (!selectedTradeInCard) {
      return
    }

    const gradedPoint =
      nextProductType === "graded" ? scryDexBestGradedPricePoint(selectedTradeInCard, selectedTradeInVariant) : null

    if (nextProductType === "graded") {
      setTradeInGradingCompany(gradedPoint?.grading_company || tradeInGradingCompany || "PSA")
      setTradeInGrade(gradedPoint?.grade || tradeInGrade)
    }
  }

  function handleUseScryDexCard(card: LocalSyncScryDexCard, productType: "raw" | "graded" = intakeProductType) {
    setSelectedScryDexCardId(scryDexCardIdentity(card))
    const firstVariant = scryDexDisplayVariants(card)[0] ?? null
    const variantId = firstVariant
      ? scryDexVariantId(scryDexCardIdentity(card), firstVariant, 0)
      : ""
    const nextProductType = productType === "graded" ? "graded" : "raw"
    const gradedPoint = nextProductType === "graded" ? scryDexBestGradedPricePoint(card, firstVariant) : null
    const nextGradingCompany = gradedPoint?.grading_company || intakeGradingCompany || "PSA"
    const nextGrade = gradedPoint?.grade || intakeGrade

    setActiveSection("Inventory")
    setScryDexGame(card.game)
    setScryDexQuery("")
    setSelectedScryDexVariantId(variantId)
    setIntakeProductType(nextProductType)
    if (nextProductType === "graded") {
      setIntakeGradingCompany(nextGradingCompany)
      setIntakeGrade(nextGrade)
    }
    setIntakeCardName(card.card_name)
    setIntakeSetName(card.set_name)
    setIntakeBarcode("")
    setIntakePriceInput(
      creditRedemptionInputFromMinorUnits(
        scryDexIntakePriceMinorUnits(
          card,
          firstVariant,
          intakeCondition,
          nextProductType,
          nextGradingCompany,
          nextGrade,
        ),
      ),
    )
    setScryDexLookupDetail(
      `Selected ${card.card_name} as ${nextProductType === "graded" ? "graded" : "single"}; full result list is still available above and intake fields are ready.`,
    )
    window.requestAnimationFrame(() => {
      const field = document.getElementById("intake-card-name")

      field?.scrollIntoView({ block: "center", behavior: "smooth" })
      if (field instanceof HTMLInputElement) {
        field.focus({ preventScroll: true })
        field.select()
      }
    })
    setActivityMessage({
      title: "ScryDex reference selected",
      detail: `${card.card_name} ${card.printed_number} is ready for ${nextProductType === "graded" ? "graded-card" : "single-card"} intake review; leave barcode blank to auto-generate a unique copy code.`,
    })
  }

  function handleUseTradeInCustomer(customer: LocalSyncCustomer) {
    const localCustomerId =
      customer.customer_id ??
      customerCreditDirectory.reduce((maxId, credit) => Math.max(maxId, credit.customerId), 0) + 1
    const nextCreditSnapshot = customerCreditSnapshotFromLocalSyncCustomer(customer, {
      customerId: localCustomerId,
      customerPublicId: customer.customer_public_id,
      rowVersion: customer.row_version,
      label: "Customer credit",
      customerName: customer.display_name,
      customerLookup: customer.customer_lookup || customer.email,
      availableMinorUnits: 0,
      redemptionPreviewMinorUnits: 0,
      currency: customer.credit.currency,
      note: "Customer selected for the current trade-in offer.",
    })
    const lookupValue = customer.customer_lookup || customer.email || ""

    setCustomerCreditDirectory((credits) => upsertCustomerCreditSnapshot(credits, nextCreditSnapshot))
    setActiveCustomerId(nextCreditSnapshot.customerId)
    setTradeInSelectedCustomerSnapshot(customer)
    setTradeInSelectedCustomerPublicId(customer.customer_public_id)
    setTradeInCustomerMatches((customers) => [
      customer,
      ...customers.filter((candidate) => candidate.customer_public_id !== customer.customer_public_id),
    ])
    setTradeInCustomerName(customer.display_name)
    setTradeInCustomerLookupInput(lookupValue || customer.display_name)
    setTradeInCustomerEmail(customer.email || (lookupValue.includes("@") ? lookupValue : ""))
    setTradeInCustomerIdNumberOnFile("")
    if (lookupValue && !lookupValue.includes("@")) {
      setTradeInCustomerPhone(lookupValue)
    }
    setTradeInCustomerLookupStatus("matched")
    setActiveSection("Trade-Ins")
    if (localSyncSessionToken) {
      void refreshCustomerProfile(customer.customer_public_id)
    }
    setActivityMessage({
      title: "Trade-in customer selected",
      detail: `${customer.display_name} is attached to this offer. Staff can save the quote, accept, or decline after the card lines are staged.`,
    })
  }

  async function handleTradeInCustomerAction() {
    if (tradeInCustomerLookupQuery.trim() === "") {
      setActivityMessage({
        title: "Customer lookup needed",
        detail: "Enter a customer name or phone at the top of the Trade-In Counter.",
      })
      return
    }

    if (tradeInSelectedCustomer) {
      setActivityMessage({
        title: "Trade-in customer ready",
        detail: `${tradeInSelectedCustomer.display_name} is already attached to this offer.`,
      })
      return
    }

    if (tradeInPrimaryCustomerMatch) {
      handleUseTradeInCustomer(tradeInPrimaryCustomerMatch)
      return
    }

    if (!tradeInCanCreateCustomer) {
      const searchResult = await searchTradeInCustomersNow()
      const firstMatch = searchResult.matches[0] ?? null

      if (firstMatch) {
        setActivityMessage({
          title: "Customer match found",
          detail: "Select the matching customer or click Use Customer before starting the trade-in offer.",
        })
        return
      }

      if (searchResult.status === "blocked") {
        setActivityMessage({
          title: "Customer lookup blocked",
          detail: "Customer search could not reach the LAN server. Try the lookup again before creating a customer.",
        })
        return
      }

      setActivityMessage({
        title: "No customer match",
        detail: "No customer matched that lookup. Enter the customer name, then use Create & Use Customer.",
      })
      return
    }

    if (tradeInCustomerNameRequired) {
      setActivityMessage({
        title: "Customer name needed",
        detail: "No customer matched that lookup. Enter the customer name, then use Create & Use Customer.",
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Unlock with an employee, manager, or owner PIN before creating a trade-in customer.",
      })
      return
    }

    const { firstName, lastName } = splitTradeInCustomerName(tradeInCustomerName)
    const lookupInput = tradeInCustomerLookupInput.trim()
    const phoneLookup = tradeInCustomerPhone.trim() || (!lookupInput.includes("@") ? lookupInput : "")
    const emailLookup = tradeInCustomerEmail.trim() || (lookupInput.includes("@") ? lookupInput : "")
    const createResult = await localSyncClient.createCustomer(localSyncSessionToken, {
      firstName,
      lastName,
      email: emailLookup,
      customerLookup: phoneLookup,
    })

    if (createResult.status !== "ok") {
      setTradeInCustomerLookupStatus("blocked")
      setActivityMessage({
        title: createResult.status === "unavailable" ? "LAN server unavailable" : "Customer blocked",
        detail: createResult.message,
      })
      return
    }

    setTradeInCustomerMatches((customers) => [
      createResult.customer,
      ...customers.filter((customer) => customer.customer_public_id !== createResult.customer.customer_public_id),
    ])
    handleUseTradeInCustomer(createResult.customer)
    void refreshLocalSyncStatus()
  }

  function handleStageTradeInItem() {
    if (!tradeInSelectedCustomer) {
      setActiveSection("Trade-Ins")
      setTradeInCardLookupStatus("blocked")
      setTradeInCardLookupDetail("Select or create a customer before adding cards to the offer.")
      setActivityMessage({
        title: "Trade-in customer required",
        detail: "Select or create the customer at the top of the Trade-In Counter before adding card lines.",
      })
      return
    }

    if (tradeInCurrentCardName.trim() === "") {
      setActiveSection("Trade-Ins")
      setActivityMessage({
        title: "Trade-in needs a card",
        detail: "Search or enter the card name before adding it to the trade-in offer.",
      })
      return
    }

    if (tradeInCurrentMarketMinorUnits <= 0 && tradeInManualFinalValueMinorUnits === null) {
      setActiveSection("Trade-Ins")
      setActivityMessage({
        title: "Trade-in needs an offer value",
        detail: "ScryDex did not return a usable graded market value for this card. Enter a manual offer value before adding it to the offer.",
      })
      return
    }

    if (tradeInManualFinalValueIssue) {
      setActiveSection("Trade-Ins")
      setActivityMessage({
        title: "Trade-in override needs a valid value",
        detail: tradeInManualFinalValueIssue,
      })
      return
    }

    const nextItem: TradeInDraftItem = {
      id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productType: tradeInCurrentProductType,
      cardName: tradeInCurrentCardName.trim(),
      setName:
        tradeInCurrentSetName.trim() ||
        (selectedTradeInCard?.set_code ?? "").trim() ||
        (selectedTradeInCard?.printed_number ?? "").trim() ||
        (selectedTradeInCard?.card_number ?? "").trim() ||
        "",
      condition: tradeInCurrentCondition,
      gradingCompany: tradeInCurrentProductType === "graded" ? tradeInCurrentGradingCompany : "",
      grade: tradeInCurrentProductType === "graded" ? tradeInCurrentGrade : "",
      certNumber: tradeInCurrentProductType === "graded" ? tradeInCurrentCertNumber : "",
      marketMidMinorUnits: tradeInCurrentMarketMinorUnits,
      percentageBasisPoints: tradeInPercentageBasisPoints,
      finalValueMinorUnits: tradeInCurrentFinalValueMinorUnits,
      finalValueManuallySet: tradeInCurrentFinalValueManuallySet,
      payoutType: tradeInPayoutType,
      imageUrl: tradeInCurrentImageUrl,
      providerCardId: selectedTradeInCard?.provider_card_id,
      referenceVariantId: selectedTradeInVariant?.reference_variant_id,
      providerVariantId: selectedTradeInVariant?.provider_variant_id,
      game: selectedTradeInCard?.game ?? tradeInCardGame,
      setCode: selectedTradeInCard?.set_code,
      cardNumber: selectedTradeInCard?.card_number,
      printedNumber: selectedTradeInCard?.printed_number,
      variant: selectedTradeInVariant?.variant,
      finish: selectedTradeInVariant?.finish,
      language: selectedTradeInVariant?.language,
      backImageUrl: selectedTradeInVariant?.back_image_url,
      priceObservedAtUtc:
        selectedTradeInValuation.secondaryValuation?.observed_at_utc ??
        selectedTradeInCard?.price_observed_at_utc ??
        selectedTradeInCard?.catalog_synced_at_utc ??
        null,
      priceSource: selectedTradeInValuation.secondaryValuation
        ? `${selectedTradeInValuation.secondaryValuation.provider}:secondary_graded_comp`
        : selectedTradeInCard
        ? `${selectedTradeInCard.catalog_source}:scrydex_trade_in`
        : "manual_trade_in",
    }

    setTradeInDraftItems((items) => [...items, nextItem])
    resetTradeInCardSearch("Search the next card to add another line to this trade-in offer.")
    setActiveSection("Trade-Ins")
    setActivityMessage({
      title: "Trade-in line staged",
      detail: `${nextItem.cardName} is staged at ${tradeInPercentageBasisPoints / 100}% for ${formatMoney(
        nextItem.finalValueMinorUnits,
        "USD",
      )} ${nextItem.payoutType}${nextItem.finalValueManuallySet ? " with a manual offer override" : ""}. It is not sellable inventory until approved and converted.`,
    })
  }

  function handleRemoveTradeInItem(itemId: string) {
    setTradeInDraftItems((items) => items.filter((item) => item.id !== itemId))
  }

  function handleTradeInLinePercentageChange(itemId: string, basisPoints: number) {
    setTradeInDraftItems((items) =>
      items.map((item) => {
        if (item.id !== itemId) {
          return item
        }

        const nextPercentage = Math.max(0, Math.min(10000, basisPoints))

        return {
          ...item,
          percentageBasisPoints: nextPercentage,
          finalValueMinorUnits: tradeInValueMinorUnits(item.marketMidMinorUnits, nextPercentage),
          finalValueManuallySet: false,
        }
      }),
    )
  }

  function handleTradeInLinePayoutChange(itemId: string, payoutType: TradeInPayoutType) {
    setTradeInDraftItems((items) =>
      items.map((item) => (item.id === itemId ? { ...item, payoutType } : item)),
    )
  }

  function handleTradeInLineFinalValueChange(itemId: string, value: string) {
    const parsedMinorUnits = creditRedemptionInputToMinorUnits(value)

    if (parsedMinorUnits === null) {
      return
    }

    setTradeInDraftItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              finalValueMinorUnits: parsedMinorUnits,
              finalValueManuallySet: true,
            }
          : item,
        ),
    )
  }

  function tradeInDraftItemFromSavedOrderItem(item: LocalSyncTradeInItem): TradeInDraftItem {
    return {
      id: item.item_id || `trade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productType: item.product_type,
      cardName: item.card_name,
      setName: item.set_name || item.set_code || item.printed_number || item.card_number || "",
      condition: item.condition,
      gradingCompany: item.grading_company,
      grade: item.grade,
      certNumber: item.cert_number,
      marketMidMinorUnits: item.market_mid_minor_units,
      percentageBasisPoints: item.trade_in_percentage_basis_points,
      finalValueMinorUnits: item.final_value_minor_units,
      finalValueManuallySet: item.final_value_manually_set,
      payoutType: item.payout_type,
      imageUrl: item.image_url,
      providerCardId: item.provider_card_id,
      referenceVariantId: item.reference_variant_id,
      providerVariantId: item.provider_variant_id,
      game: item.game,
      setCode: item.set_code,
      cardNumber: item.card_number,
      printedNumber: item.printed_number,
      variant: item.variant,
      finish: item.finish,
      language: item.language,
      backImageUrl: item.back_image_url,
      priceSource: item.price_source || "saved_trade_in_offer",
      priceObservedAtUtc: item.price_observed_at_utc,
    }
  }

  function handleLoadTradeInOrder(order: LocalSyncTradeInOrder) {
    const canEditOrder =
      order.status === "draft" || order.status === "review" || order.status === "rejected"

    if (!canEditOrder) {
      setActivityMessage({
        title: "Trade-in record locked",
        detail: `${order.order_id} is ${order.status} history and cannot be reopened into the editable offer cart.`,
      })
      return
    }

    if (!order.customer_public_id && !tradeInSelectedCustomer) {
      setActivityMessage({
        title: "Customer link required",
        detail:
          "This saved trade-in has no customer link yet. Select or create the customer before reopening it.",
      })
      return
    }

    const restoredCustomer: LocalSyncCustomer =
      tradeInSelectedCustomer &&
      (!order.customer_public_id || tradeInSelectedCustomer.customer_public_id === order.customer_public_id)
        ? tradeInSelectedCustomer
        : {
            customer_public_id: order.customer_public_id,
            customer_id: null,
            row_version: 0,
            display_name: order.customer_name,
            first_name: splitTradeInCustomerName(order.customer_name).firstName,
            last_name: splitTradeInCustomerName(order.customer_name).lastName,
            customer_lookup: order.customer_phone,
            email: "",
            status: "active",
            credit: {
              balance_minor_units: 0,
              currency: order.currency,
            },
            source: "cached",
          }
    const draftItems = order.items.map(tradeInDraftItemFromSavedOrderItem)

    setTradeInSelectedCustomerSnapshot(restoredCustomer)
    setTradeInSelectedCustomerPublicId(restoredCustomer.customer_public_id)
    setTradeInCustomerMatches((customers) => [
      restoredCustomer,
      ...customers.filter((customer) => customer.customer_public_id !== restoredCustomer.customer_public_id),
    ])
    setTradeInCustomerName(restoredCustomer.display_name || order.customer_name)
    setTradeInCustomerPhone(order.customer_phone || restoredCustomer.customer_lookup)
    setTradeInCustomerLookupInput(
      restoredCustomer.customer_lookup || order.customer_phone || restoredCustomer.email || order.customer_name,
    )
    setTradeInCustomerEmail(restoredCustomer.email)
    setTradeInCustomerIdNumber("")
    setTradeInCustomerIdState(order.customer_id_state ?? "")
    setTradeInCustomerIdNumberOnFile(order.customer_id_number_masked ?? "")
    setTradeInCustomerLookupStatus("matched")
    setTradeInDraftItems(draftItems)
    setTradeInLoadedOrderId(order.order_id)
    setTradeInSyncStatus("ready")
    setActiveSection("Trade-Ins")
    setActivityMessage({
      title: "Saved trade-in loaded",
      detail: `${order.order_id} is back in the offer cart with ${draftItems.length} line item(s) for edits, additions, removals, accept, or decline.`,
    })
  }

  async function createInventoryFromAcceptedTradeInItems(itemsToConvert: TradeInDraftItem[]) {
    if (!localSyncSessionToken || itemsToConvert.length === 0) {
      return { createdCount: 0, blockedCount: itemsToConvert.length, detail: "" }
    }

    const createdRemoteItems: LocalSyncInventoryItem[] = []
    const blockedMessages: string[] = []

    for (const item of itemsToConvert) {
      const autoPriceMinorUnits = autoRetailPriceMinorUnits(item.marketMidMinorUnits)
      const minimumSalePriceMinorUnits = Math.max(item.finalValueMinorUnits, 100)
      const finalPriceMinorUnits = finalRetailPriceMinorUnits(autoPriceMinorUnits, minimumSalePriceMinorUnits)
      const result = await localSyncClient.createInventoryIntake(localSyncSessionToken, {
        cardName: item.cardName,
        setName: item.setName || "Trade-In Intake",
        condition: item.condition || (item.productType === "graded" ? "RAW" : "LP"),
        barcode: "",
        priceMinorUnits: finalPriceMinorUnits,
        location: "Intake Queue",
        quantity: 1,
        providerCardId: item.providerCardId,
        referenceVariantId: item.referenceVariantId,
        providerVariantId: item.providerVariantId,
        game: item.game ?? tradeInCardGame,
        setCode: item.setCode,
        cardNumber: item.cardNumber,
        printedNumber: item.printedNumber,
        variant: item.variant,
        finish: item.finish,
        language: item.language,
        rawOrGraded: item.productType,
        gradingCompany: item.productType === "graded" ? item.gradingCompany : "",
        grade: item.productType === "graded" ? item.grade : "",
        certNumber: item.productType === "graded" ? item.certNumber : "",
        imageUrl: item.imageUrl,
        backImageUrl: item.backImageUrl,
        priceSource: item.priceSource ?? "accepted_trade_in",
        priceObservedAtUtc: item.priceObservedAtUtc ?? null,
        suggestedPriceMinorUnits: item.marketMidMinorUnits,
        autoPriceMinorUnits,
        minimumSalePriceMinorUnits,
        finalPriceMinorUnits,
        priceOverrideReason:
          finalPriceMinorUnits > autoPriceMinorUnits
            ? "trade_in_floor"
            : "trade_in_market_plus_10_percent",
        onlineVisibility: "visible",
        kioskVisibility: "visible",
        posVisibility: "visible",
      })

      if (result.status !== "ok") {
        blockedMessages.push(`${item.cardName}: ${result.message}`)
        continue
      }

      createdRemoteItems.push(...((result.items && result.items.length > 0) ? result.items : [result.item]))
    }

    if (createdRemoteItems.length > 0) {
      const nextId = inventoryItems.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1
      const nextItems = createdRemoteItems.map((item, index) => inventoryItemFromLocalSync(item, nextId + index))

      setInventoryItems((items) => [...nextItems, ...items])
      setSelectedId(nextItems[0]?.id ?? selectedId)
      setLocalInventoryIntakeReceipts((receipts) => [
        ...buildLocalInventoryIntakeSyncReceipts(nextItems, {
          profileId: activeProfile.id,
          companyName: activeProfile.companyName,
          localSyncServerUrl: localSyncClient.serverUrl,
        }),
        ...receipts,
      ].slice(0, 50))
    }

    return {
      createdCount: createdRemoteItems.length,
      blockedCount: blockedMessages.length,
      detail: blockedMessages.join("; "),
    }
  }

  async function refreshTradeInOrders() {
    if (!localSyncSessionToken) {
      const detail = "Unlock with an employee, manager, or owner PIN before loading shared trade-in drafts."
      setTradeInSyncStatus("blocked")
      setTradeInSyncDetail(detail)
      setActivityMessage({
        title: "Trade-in queue needs login",
        detail,
      })
      return
    }

    const result = await localSyncClient.listTradeInOrders(localSyncSessionToken, {
      limit: 100,
      query: tradeInRecordSearch,
      staffUserId: tradeInStaffFilter,
    })

    if (result.status !== "ok") {
      const detail = localSyncErrorDetail(result)
      setTradeInSyncStatus("blocked")
      setTradeInSyncDetail(detail)
      setActivityMessage({
        title: result.status === "unavailable" ? "LAN server unavailable" : "Trade-in queue blocked",
        detail,
      })
      return
    }

    setServerTradeInOrders(result.orders)
    setTradeInSyncStatus("ready")
    setTradeInSyncDetail("Shared trade-in queue is connected and current.")
  }

  async function handleSaveTradeInDraft(nextStatus: LocalSyncTradeInOrder["status"] = "draft") {
    if (!tradeInSelectedCustomer) {
      const detail = "Select or create the customer before saving, approving, or declining this trade-in offer."
      setActiveSection("Trade-Ins")
      setTradeInSyncStatus("blocked")
      setTradeInSyncDetail(detail)
      setActivityMessage({
        title: "Trade-in customer required",
        detail,
      })
      return
    }

    if (!localSyncSessionToken) {
      const detail = "Unlock with an employee, manager, or owner PIN before saving shared trade-in drafts."
      setActiveSection("Trade-Ins")
      setTradeInSyncStatus("blocked")
      setTradeInSyncDetail(detail)
      setActivityMessage({
        title: "Trade-in save needs login",
        detail,
      })
      return
    }

    if (tradeInDraftItems.length === 0) {
      const detail = "Stage at least one card before saving a shared trade-in draft."
      setActiveSection("Trade-Ins")
      setTradeInSyncStatus("blocked")
      setTradeInSyncDetail(detail)
      setActivityMessage({
        title: "No trade-in lines",
        detail,
      })
      return
    }

    if (nextStatus === "approved" && !tradeInCustomerIdReady) {
      const detail = "Driver license number and state are required before recording customer acceptance."
      setActiveSection("Trade-Ins")
      setTradeInSyncStatus("blocked")
      setTradeInSyncDetail(detail)
      setActivityMessage({
        title: "Trade-in ID required",
        detail,
      })
      return
    }

    setTradeInSyncStatus("saving")
    setTradeInSyncDetail("Saving this offer to the LAN middleman.")
    const itemsForInventoryConversion = [...tradeInDraftItems]
    const loadedOrderId = tradeInLoadedOrderId
    const tradeInOrderPayload = {
      customerName: tradeInSelectedCustomer.display_name.trim() || tradeInCustomerName.trim() || "Selected customer",
      customerPhone: tradeInCustomerPhone.trim(),
      customerPublicId: tradeInSelectedCustomer.customer_public_id,
      customerIdNumber: tradeInCustomerIdNumberForPayload,
      customerIdState: tradeInCustomerIdStateForPayload,
      items: tradeInDraftItems.map((item) => ({
        id: item.id,
        productType: item.productType,
        cardName: item.cardName,
        setName: tradeInDraftSetLabel(item),
        condition: item.condition,
        gradingCompany: item.gradingCompany,
        grade: item.grade,
        certNumber: item.certNumber,
        marketMidMinorUnits: item.marketMidMinorUnits,
        percentageBasisPoints: item.percentageBasisPoints,
        finalValueMinorUnits: item.finalValueMinorUnits,
        payoutType: item.payoutType,
        imageUrl: item.imageUrl,
        providerCardId: item.providerCardId,
        referenceVariantId: item.referenceVariantId,
        providerVariantId: item.providerVariantId,
        game: item.game,
        setCode: item.setCode,
        cardNumber: item.cardNumber,
        printedNumber: item.printedNumber,
        variant: item.variant,
        finish: item.finish,
        language: item.language,
        backImageUrl: item.backImageUrl,
        priceSource: item.priceSource,
        priceObservedAtUtc: item.priceObservedAtUtc,
      })),
    }
    const result = loadedOrderId
      ? await localSyncClient.updateTradeInOrder(localSyncSessionToken, loadedOrderId, tradeInOrderPayload)
      : await localSyncClient.createTradeInOrder(localSyncSessionToken, tradeInOrderPayload)

    if (result.status !== "ok") {
      const detail = localSyncErrorDetail(result)
      setTradeInSyncStatus("blocked")
      setTradeInSyncDetail(detail)
      setActivityMessage({
        title: result.status === "unavailable" ? "LAN server unavailable" : "Trade-in save blocked",
        detail,
      })
      return
    }

    let savedOrder = result.order
    let inventoryConversionDetail = ""
    if (nextStatus !== "draft") {
      const statusResult = await localSyncClient.updateTradeInOrderStatus(
        localSyncSessionToken,
        result.order.order_id,
        nextStatus,
        {
          customerIdNumber: tradeInCustomerIdNumberForPayload,
          customerIdState: tradeInCustomerIdStateForPayload,
        },
      )

      if (statusResult.status === "ok") {
        savedOrder = statusResult.order
        inventoryConversionDetail += applyTradeInCreditApplication(statusResult.credit_application)
      } else {
        const detail = `${result.order.customer_name} offer ${result.order.order_id} saved, but status update was blocked: ${localSyncErrorDetail(statusResult)}`
        setTradeInSyncStatus("blocked")
        setTradeInSyncDetail(detail)
        setActivityMessage({
          title: "Trade-in offer saved",
          detail,
        })
        return
      }
    }

    if (nextStatus === "approved") {
      const inventoryResult = await createInventoryFromAcceptedTradeInItems(itemsForInventoryConversion)
      inventoryConversionDetail =
        inventoryResult.createdCount > 0
          ? ` ${inventoryResult.createdCount} accepted card(s) were added to inventory intake and queued for website product sync.`
          : " No inventory rows were created from the accepted offer."

      if (inventoryResult.detail) {
        inventoryConversionDetail += ` Review: ${inventoryResult.detail}`
      }

      if (inventoryResult.createdCount > 0) {
        const conversionResult = await localSyncClient.updateTradeInOrderStatus(
          localSyncSessionToken,
          savedOrder.order_id,
          "converted",
          { notes: "Accepted offer converted to inventory intake from the employee app." },
        )

        if (conversionResult.status === "ok") {
          savedOrder = conversionResult.order
        }
      }
    }

    setServerTradeInOrders((orders) => [savedOrder, ...orders.filter((order) => order.order_id !== savedOrder.order_id)])
    setTradeInDraftItems([])
    resetTradeInCardSearch()
    setTradeInLoadedOrderId("")
    setTradeInSyncStatus("ready")
    setTradeInSyncDetail(`${savedOrder.customer_name} offer ${savedOrder.order_id} saved to the shared queue.`)
    void refreshLocalSyncStatus()
    if (savedOrder.customer_public_id) {
      void refreshCustomerProfile(savedOrder.customer_public_id)
    }
    setActivityMessage({
      title:
        nextStatus === "approved"
          ? "Trade-in offer accepted"
          : nextStatus === "rejected"
            ? "Trade-in offer declined"
            : "Trade-in draft saved",
      detail:
        nextStatus === "approved"
          ? `${savedOrder.customer_name} accepted offer ${savedOrder.order_id}.${inventoryConversionDetail}`
          : nextStatus === "rejected"
            ? `${savedOrder.customer_name} declined offer ${savedOrder.order_id}. The offer is saved for lookup by name, phone, receipt, staff, or card.`
            : `${savedOrder.customer_name} draft ${savedOrder.order_id} saved to the shared middleman queue. It is not sellable inventory yet.`,
    })
  }

  async function handleTradeInStatus(order: LocalSyncTradeInOrder, status: LocalSyncTradeInOrder["status"]) {
    if (!localSyncSessionToken) {
      setTradeInSyncStatus("blocked")
      setTradeInSyncDetail("Unlock with an employee, manager, or owner PIN before changing trade-in status.")
      return
    }

    if (!order.customer_public_id) {
      const detail = "Select or create the customer, reopen this editable offer, and save it before changing trade-in status."
      setTradeInSyncStatus("blocked")
      setTradeInSyncDetail(detail)
      setActivityMessage({
        title: "Customer link required",
        detail,
      })
      return
    }

    const result = await localSyncClient.updateTradeInOrderStatus(localSyncSessionToken, order.order_id, status)

    if (result.status !== "ok") {
      const detail = localSyncErrorDetail(result)
      setTradeInSyncStatus("blocked")
      setTradeInSyncDetail(detail)
      setActivityMessage({ title: "Trade-in status blocked", detail })
      return
    }

    let nextOrder = result.order
    let detail = `${result.order.customer_name} moved to ${result.order.status}.`

    if (status === "approved") {
      detail += applyTradeInCreditApplication(result.credit_application)
      const itemsForInventoryConversion = result.order.items.map(tradeInDraftItemFromSavedOrderItem)
      const inventoryResult = await createInventoryFromAcceptedTradeInItems(itemsForInventoryConversion)

      detail +=
        inventoryResult.createdCount > 0
          ? ` ${inventoryResult.createdCount} card(s) added to inventory intake.`
          : " No inventory rows were created."

      if (inventoryResult.detail) {
        detail += ` Review: ${inventoryResult.detail}`
      }

      if (inventoryResult.createdCount > 0) {
        const conversionResult = await localSyncClient.updateTradeInOrderStatus(
          localSyncSessionToken,
          result.order.order_id,
          "converted",
          { notes: "Approved saved trade-in converted to inventory intake." },
        )

        if (conversionResult.status === "ok") {
          nextOrder = conversionResult.order
        }
      }
    }

    setServerTradeInOrders((orders) =>
      orders.map((order) => (order.order_id === nextOrder.order_id ? nextOrder : order)),
    )
    void refreshLocalSyncStatus()
    if (nextOrder.customer_public_id) {
      void refreshCustomerProfile(nextOrder.customer_public_id)
    }
    setTradeInSyncStatus("ready")
    setTradeInSyncDetail(`${nextOrder.customer_name} moved to ${nextOrder.status}.`)
    setActivityMessage({ title: "Trade-in status updated", detail })
  }

  function handleLoadTradeInItemForInventory(item: TradeInDraftItem) {
    setIntakeProductType(item.productType)
    setIntakeCardName(item.cardName)
    setIntakeSetName(item.setName)
    setIntakeCondition(item.condition)
    setIntakeGradingCompany(item.gradingCompany || "PSA")
    setIntakeGrade(item.grade)
    setIntakeCertNumber(item.certNumber)
    setIntakePriceInput(creditRedemptionInputFromMinorUnits(item.marketMidMinorUnits))
    setIntakeMinimumPriceInput(
      creditRedemptionInputFromMinorUnits(
        Math.max(tradeInValueMinorUnits(item.marketMidMinorUnits, item.percentageBasisPoints), 100),
      ),
    )
    setActiveSection("Inventory")
    setActivityMessage({
      title: "Trade-in loaded for inventory",
      detail: `${item.cardName} is copied into inventory intake. Add Inventory only after manager approval/payment is complete.`,
    })
  }

  function handleScryDexVariantChange(nextVariantId: string) {
    setSelectedScryDexVariantId(nextVariantId)

    if (!selectedScryDexCard) {
      return
    }

    const nextVariant = selectedScryDexDisplayVariants.find(
      (variant, index) =>
        scryDexVariantId(scryDexCardIdentity(selectedScryDexCard), variant, index) === nextVariantId,
    ) ?? null
    const gradedPoint =
      intakeProductType === "graded" ? scryDexBestGradedPricePoint(selectedScryDexCard, nextVariant) : null

    if (gradedPoint?.grading_company) {
      setIntakeGradingCompany(gradedPoint.grading_company)
    }

    if (gradedPoint?.grade) {
      setIntakeGrade(gradedPoint.grade)
    }

    setIntakePriceInput(
      creditRedemptionInputFromMinorUnits(
        scryDexIntakePriceMinorUnits(
          selectedScryDexCard,
          nextVariant,
          intakeCondition,
          intakeProductType,
          gradedPoint?.grading_company || intakeGradingCompany,
          gradedPoint?.grade || intakeGrade,
        ),
      ),
    )
  }

  function handleIntakeProductTypeChange(nextProductType: "raw" | "graded") {
    setIntakeProductType(nextProductType)

    if (!selectedScryDexCard) {
      return
    }

    const gradedPoint =
      nextProductType === "graded" ? scryDexBestGradedPricePoint(selectedScryDexCard, selectedScryDexVariant) : null
    const nextGradingCompany = gradedPoint?.grading_company || intakeGradingCompany || "PSA"
    const nextGrade = gradedPoint?.grade || intakeGrade

    if (nextProductType === "graded") {
      setIntakeGradingCompany(nextGradingCompany)
      setIntakeGrade(nextGrade)
    }

    setIntakePriceInput(
      creditRedemptionInputFromMinorUnits(
        scryDexIntakePriceMinorUnits(
          selectedScryDexCard,
          selectedScryDexVariant,
          intakeCondition,
          nextProductType,
          nextGradingCompany,
          nextGrade,
        ),
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
        scryDexIntakePriceMinorUnits(
          selectedScryDexCard,
          selectedScryDexVariant,
          nextCondition,
          intakeProductType,
          intakeGradingCompany,
          intakeGrade,
        ),
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

    if ((item.kioskVisibility ?? "visible") !== "visible") {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: "Kiosk item hidden",
        detail: `${item.cardName} is marked ${inventoryVisibilityLabel(item.kioskVisibility).toLowerCase()} for kiosk browsing, so it stays staff-only until a manager changes visibility.`,
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

  async function handleKioskTicketStatus(orderId: string, nextStatus: KioskTicketStatus) {
    const statusLabelMap: Record<KioskTicketStatus, string> = {
      queued: "Queued",
      accepted: "Accepted",
      pulling: "Pulling",
      ready: "Ready for Pickup",
      completed: "Completed",
      expired: "Hold Expired",
    }

    if (!localSyncSessionToken) {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: "Kiosk queue needs login",
        detail: "Unlock with an employee, manager, or owner PIN before updating the shared pickup queue.",
      })
      return
    }

    const result = await localSyncClient.updateKioskOrderStatus(localSyncSessionToken, orderId, nextStatus)

    if (result.status !== "ok") {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: result.status === "unavailable" ? "LAN server unavailable" : "Kiosk ticket blocked",
        detail: result.message,
      })
      return
    }

    const updatedTicket = kioskTicketFromLocalSyncOrder(result.order)
    setKioskOrderTickets((tickets) =>
      tickets.map((ticket) => (ticket.orderId === orderId ? updatedTicket : ticket)),
    )
    if (nextStatus === "completed") {
      setActiveFulfillmentTicket((ticket) =>
        ticket?.source === "kiosk" && ticket.orderId === orderId ? null : ticket,
      )
    }
    void refreshKioskOrderTickets(false)
    setActiveSection("Kiosk")
    setActivityMessage({
      title: "Kiosk ticket updated",
      detail: `${orderId} is now ${statusLabelMap[nextStatus].toLowerCase()} in the shared LAN pickup queue. Inventory was not mutated by this status update.`,
    })
  }

  async function handleOpenKioskPicking(ticket: KioskOrderTicket) {
    setActiveFulfillmentTicket({ source: "kiosk", orderId: ticket.orderId })
    setFulfillmentSquareReference(ticket.squareReceiptReference)
    setFulfillmentSquareOrderId("")

    if (["queued", "accepted"].includes(ticket.status)) {
      await handleKioskTicketStatus(ticket.orderId, "pulling")
    }
  }

  async function handleKioskPickToggle(ticket: KioskOrderTicket, itemId: string) {
    if (!localSyncSessionToken) {
      return
    }

    const pickedItemIds = ticket.pickedItemIds.includes(itemId)
      ? ticket.pickedItemIds.filter((id) => id !== itemId)
      : [...ticket.pickedItemIds, itemId]
    const result = await localSyncClient.updateKioskOrderPicks(
      localSyncSessionToken,
      ticket.orderId,
      pickedItemIds,
    )

    if (result.status !== "ok") {
      setActivityMessage({ title: "Pick checklist blocked", detail: result.message })
      return
    }

    const updatedTicket = kioskTicketFromLocalSyncOrder(result.order)
    setKioskOrderTickets((tickets) =>
      tickets.map((candidate) => candidate.orderId === ticket.orderId ? updatedTicket : candidate),
    )
  }

  async function handleConfirmKioskPayment(ticket: KioskOrderTicket) {
    if (!localSyncSessionToken) {
      return
    }

    const reference = fulfillmentSquareReference.trim()
    if (reference.length < 3) {
      setActivityMessage({
        title: "Square reference required",
        detail: "Enter the Square receipt, ticket, or transaction reference before confirming payment.",
      })
      return
    }

    const result = await localSyncClient.confirmKioskOrderPayment(
      localSyncSessionToken,
      ticket.orderId,
      {
        squareReceiptReference: reference,
        squareOrderId: fulfillmentSquareOrderId.trim(),
        cashierConfirmed: true,
        customerPublicId: ticket.customerPublicId,
        customerLookup: ticket.customerLookup,
      },
    )

    if (result.status !== "ok") {
      setActivityMessage({ title: "Payment confirmation blocked", detail: result.message })
      return
    }

    const updatedTicket = kioskTicketFromLocalSyncOrder(result.order)
    setKioskOrderTickets((tickets) =>
      tickets.map((candidate) => candidate.orderId === ticket.orderId ? updatedTicket : candidate),
    )
    const finalizedSale = result.sale
    if (finalizedSale?.status === "ok") {
      setInventoryItems((items) =>
        items.map((item) =>
          finalizedSale.items.some((soldItem) => soldItem.public_id === item.publicId)
            ? { ...item, status: "sold", source: "queued" }
            : item,
        ),
      )
    }
    void runOperationalAutoSync()
    setActivityMessage({
      title: "Paid in Square",
      detail: `${ticket.customerName}'s order is paid and its exact card copies were marked sold everywhere the sync connector accepted.`,
    })
  }

  async function handleWebsitePickupTicketStatus(orderId: number, nextStatus: WebsitePickupTicketStatus) {
    const statusLabelMap: Record<WebsitePickupTicketStatus, string> = {
      awaiting_pull: "Awaiting Pull",
      pulling: "Pulling",
      ready_for_pickup: "Ready for Pickup",
      completed: "Completed",
    }

    if (!localSyncSessionToken) {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: "Fulfillment needs login",
        detail: "Unlock with an employee, manager, or owner PIN before updating paid website pickup orders.",
      })
      return
    }

    const result = await localSyncClient.updateFulfillmentOrderStatus(localSyncSessionToken, orderId, nextStatus)

    if (result.status !== "ok") {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: result.status === "unavailable" ? "LAN server unavailable" : "Website pickup blocked",
        detail: result.message,
      })
      return
    }

    const updatedTicket = websitePickupTicketFromLocalSyncOrder(result.order)
    setWebsitePickupTickets((tickets) =>
      tickets.map((ticket) => (ticket.orderId === orderId ? updatedTicket : ticket)),
    )
    if (nextStatus === "completed") {
      setActiveFulfillmentTicket((ticket) =>
        ticket?.source === "website" && ticket.orderId === orderId ? null : ticket,
      )
    }
    void refreshKioskOrderTickets(false)
    setActiveSection("Kiosk")
    setActivityMessage({
      title: "Website pickup updated",
      detail: `Woo order #${updatedTicket.orderNumber} is now ${statusLabelMap[
        nextStatus
      ].toLowerCase()}. Inventory and payment were not changed by this fulfillment status update.`,
    })
  }

  async function handleOpenWebsitePicking(ticket: WebsitePickupTicket) {
    setActiveFulfillmentTicket({ source: "website", orderId: ticket.orderId })
    if (ticket.status === "awaiting_pull") {
      await handleWebsitePickupTicketStatus(ticket.orderId, "pulling")
    }
  }

  async function handleWebsitePickToggle(ticket: WebsitePickupTicket, itemId: string) {
    if (!localSyncSessionToken) {
      return
    }

    const pickedItemIds = ticket.pickedItemIds.includes(itemId)
      ? ticket.pickedItemIds.filter((id) => id !== itemId)
      : [...ticket.pickedItemIds, itemId]
    const result = await localSyncClient.updateFulfillmentOrderPicks(
      localSyncSessionToken,
      ticket.orderId,
      pickedItemIds,
    )

    if (result.status !== "ok") {
      setActivityMessage({ title: "Pick checklist blocked", detail: result.message })
      return
    }

    const updatedTicket = websitePickupTicketFromLocalSyncOrder(result.order)
    setWebsitePickupTickets((tickets) =>
      tickets.map((candidate) => candidate.orderId === ticket.orderId ? updatedTicket : candidate),
    )
  }

  async function handleKioskSubmitOrder() {
    if (!kioskFirstName.trim() || !kioskLastName.trim()) {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: "Kiosk order needs name",
        detail: "Enter the customer's first and last name before sending a pickup order.",
      })
      return
    }

    const availableItems = kioskCartItems.filter(
      (item) => item.status === "available" && (item.kioskVisibility ?? "visible") === "visible",
    )

    if (availableItems.length === 0) {
      setActiveSection("Kiosk")
      setActivityMessage({
        title: "Kiosk cart empty",
        detail: "Select at least one available card before sending a pickup order.",
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
      customerPublicId: kioskOrder.order.customer_public_id,
      customerLookup: kioskOrder.order.customer_lookup,
      itemCount: availableItems.length,
      totalMinorUnits: availableItems.reduce((total, item) => total + item.priceMinorUnits, 0),
      totalLabel: formatMoney(
        availableItems.reduce((total, item) => total + item.priceMinorUnits, 0),
        "USD",
      ),
      items: availableItems.map((item) => ({
        publicId: item.publicId,
        cardName: item.cardName,
        setName: item.setName,
        condition: item.condition,
        barcode: item.barcode,
        location: item.location,
        price: item.price,
      })),
      reservationIds: kioskOrder.order.reservation_ids,
      createdAtUtc: kioskOrder.order.created_at_utc,
      status: kioskOrder.order.status,
      paymentStatus: kioskOrder.order.payment_status,
      squareReceiptReference: kioskOrder.order.square_receipt_reference,
      paidAtUtc: kioskOrder.order.paid_at_utc,
      holdExpiresAtUtc: kioskOrder.order.hold_expires_at_utc,
      holdSecondsRemaining: kioskOrder.order.hold_seconds_remaining,
      pickedItemIds: kioskOrder.order.picked_item_ids,
      allItemsPicked: kioskOrder.order.all_items_picked,
    }

    if (!customerKioskMode) {
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
    setKioskOrderTickets((tickets) => [kioskTicket, ...tickets].slice(0, 25))
    void refreshKioskOrderTickets(false)
    setKioskCartIds([])
    setKioskFirstName("")
    setKioskLastName("")
    setActiveSection(customerKioskMode ? "Kiosk" : "Queue")
    setActivityMessage({
      title: customerKioskMode ? "Pickup order sent" : "Kiosk order queued",
      detail: customerKioskMode
        ? `${availableItems.length} card(s) are held for ${kioskCustomerName}. Staff can pull order ${kioskOrder.order.order_id} from Order Fulfillment.`
        : `${availableItems.length} card(s) locked by ${localSyncClient.serverUrl} for ${kioskCustomerName}; order ${kioskOrder.order.order_id} is ready for staff pull and website sync acceptance.`,
    })
  }

  async function handleQuantityAdjustment() {
    if (!hasSelectedInventoryItem) {
      setActiveSection("Inventory")
      setActivityMessage({
        title: "Quantity adjustment blocked",
        detail: "Import the live inventory CSV or add a card before adjusting inventory.",
      })
      return
    }

    if (selectedDetailIssue) {
      setActiveSection("Inventory")
      setActivityMessage({
        title: "Inventory update blocked",
        detail: selectedDetailIssue,
      })
      return
    }

    const reason = cleanInventoryAdjustmentReason(quantityAdjustmentReason)
    setQuantityAdjustmentReason(reason)
    const stockChanged = quantityOnHand !== inventoryStockCount(selectedItem)
    const priceOrVisibilityChanged = selectedDetailPriceChanged || selectedDetailVisibilityChanged
    const syncIntent = priceOrVisibilityChanged
      ? "staff_manual_price_visibility_update"
      : "staff_quantity_adjustment"
    const actionTitle = priceOrVisibilityChanged
      ? "Inventory price and visibility saved"
      : "Inventory stock count saved"

    await handleStageInventoryUpdate(
      actionTitle,
      {
        operationKind: "quantity",
        quantityOnHand: quantityOnHand ?? inventoryStockCount(selectedItem),
        priceMinorUnits: selectedPriceMinorUnits ?? selectedItem.priceMinorUnits,
        minimumSalePriceMinorUnits:
          selectedMinimumPriceMinorUnits ??
          selectedItem.minimumSalePriceMinorUnits ??
          selectedItem.priceMinorUnits,
        onlineVisibility: selectedOnlineVisibility,
        kioskVisibility: selectedKioskVisibility,
        posVisibility: selectedPosVisibility,
        syncIntent,
        adjustmentReason: reason,
      },
      priceOrVisibilityChanged
        ? `${selectedItem.cardName} saved at ${creditRedemptionInputFromMinorUnits(selectedPriceMinorUnits ?? 0)} with ${inventoryVisibilitySummary({
            ...selectedItem,
            onlineVisibility: selectedOnlineVisibility,
            kioskVisibility: selectedKioskVisibility,
            posVisibility: selectedPosVisibility,
          })}; manual price is protected from scheduled ScryDex repricing. Website, kiosk, and Square updates are queued from the LAN server.`
        : stockChanged
          ? `${selectedItem.cardName} stock count is now set to ${quantityOnHand}; reason "${reason}". Website, kiosk, and Square updates are queued from the LAN server.`
          : `${selectedItem.cardName} inventory details were saved; reason "${reason}". Website, kiosk, and Square updates are queued from the LAN server.`,
    )
  }

  function focusEventCheckinPanel() {
    setActiveSection("Events")
    window.requestAnimationFrame(() => {
      eventCheckinPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    })
  }

  async function handleCreateEvent() {
    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "LAN server session required",
        detail: "Sign in with an employee, manager, or owner PIN before creating store events.",
      })
      return
    }

    const title = newEventTitle.trim()
    const startsAtUtc = datetimeLocalValueToUtc(newEventStartsAt)

    if (!title || !startsAtUtc) {
      setActiveSection("Events")
      setActivityMessage({
        title: "Event details required",
        detail: "Add an event title and start date/time before creating the WooCommerce registration product.",
      })
      return
    }

    const capacity = Math.max(1, Math.round(Number.parseInt(newEventCapacity, 10) || 0))
    const registrationCloseValue = Math.max(
      0,
      Math.round(Number.parseInt(newEventCloseValue, 10) || 0),
    )
    const priceMinorUnits = eventPriceInputToMinorUnits(newEventPrice)
    const recurrenceCount =
      newEventRecurrenceFrequency === "none"
        ? 1
        : Math.min(52, Math.max(1, Math.round(Number.parseInt(newEventRecurrenceCount, 10) || 1)))
    const createdEvents: LocalSyncEventSnapshot[] = []

    for (let occurrenceIndex = 0; occurrenceIndex < recurrenceCount; occurrenceIndex += 1) {
      const occurrenceStartsAtUtc = addEventRecurrenceInterval(
        startsAtUtc,
        newEventRecurrenceFrequency,
        occurrenceIndex,
      )
      const creationResult = await localSyncClient.createEvent(localSyncSessionToken, {
        title: recurringEventTitle(title, occurrenceStartsAtUtc, recurrenceCount),
        startsAtUtc: occurrenceStartsAtUtc,
        game: newEventGame,
        eventType: newEventType.trim() || "store_event",
        capacity,
        priceMinorUnits,
        registrationCloseValue,
        registrationCloseUnit: newEventCloseUnit,
        locationLabel: newEventLocation.trim() || "The Pug",
        description: newEventDescription.trim(),
      })

      if (creationResult.status !== "ok") {
        setActiveSection("Events")
        setActivityMessage({
          title: creationResult.status === "unavailable" ? "LAN server unavailable" : "Event creation blocked",
          detail:
            `${createdEvents.length} event(s) were created before the next one failed. ` +
            creationResult.message,
        })
        if (createdEvents.length > 0) {
          setEventSnapshots((events) => mergeLocalSyncEventSnapshots(events, createdEvents))
        }
        return
      }

      createdEvents.push(creationResult.event)
    }

    const createdEvent = eventSnapshotFromLocalSync(createdEvents[0])
    setEventSnapshots((events) => mergeLocalSyncEventSnapshots(events, createdEvents))
    setSelectedEventId(createdEvent.eventId)
    setNewEventTitle("")
    setNewEventDescription("")
    setNewEventPrice("0.00")
    setNewEventCapacity("16")
    setNewEventCloseValue("2")
    setNewEventRecurrenceFrequency("none")
    setNewEventRecurrenceCount("1")
    setShowEventQueue(true)
    setEventAttendeeLabel("Offline walk-in")
    setEventCheckinSearch("")
    setEventCheckinLookup("")
    focusEventCheckinPanel()
    void refreshLocalSyncStatus()

    setActivityMessage({
      title: recurrenceCount > 1 ? "Recurring events created" : "Event created",
      detail:
        `${createdEvents.length} event(s) were added to the LAN event cache` +
        `${createdEvents.some((event) => event.woocommerce_product_id > 0) ? " and linked to WooCommerce where accepted" : ""}. Player check-in is ready on the selected event.`,
    })
  }

  async function handleEventRegistration(event: EventSnapshot | undefined = selectedEvent) {
    if (!event) {
      setActivityMessage({
        title: "No event selected",
        detail: "Refresh events or select an event before saving an in-store registration.",
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
        detail: "Sign in with an employee, manager, or owner PIN before registering event attendees.",
      })
      return
    }

    const waitlistIntent = event.registrationStatus === "waitlist"
    const firstName = eventRegistrantFirstName.trim()
    const lastName = eventRegistrantLastName.trim()
    const email = eventRegistrantEmail.trim().toLowerCase()
    const phone = eventRegistrantPhone.trim()

    if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setActiveSection("Events")
      setActivityMessage({
        title: "Registrant details required",
        detail: "Enter the customer's first name, last name, and email before registering them for an event.",
      })
      return
    }

    const attendeeLabel = cleanOfflineEventAttendeeLabel(`${firstName} ${lastName}`)
    const registrationResult = await localSyncClient.createEventRegistration(localSyncSessionToken, {
      eventId: event.eventId,
      attendeeLabel,
      firstName,
      lastName,
      email,
      phone,
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
        firstName,
        lastName,
        email,
        phone,
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
    setEventRegistrantFirstName("")
    setEventRegistrantLastName("")
    setEventRegistrantEmail("")
    setEventRegistrantPhone("")
    setEventAttendeeLabel(attendeeLabel)
    setEventCheckinSearch(`${attendeeLabel} ${phone}`.trim())
    setEventCheckinLookup(registrationResult.registration.registration_id)
    const nextEvent = eventSnapshotFromLocalSync(registrationResult.event)
    setEventSnapshots((events) =>
      events.map((item) => (item.eventId === nextEvent.eventId ? nextEvent : item)),
    )
  }

  async function handleEventCheckin(event: EventSnapshot | undefined = selectedEvent) {
    if (!event) {
      setActivityMessage({
        title: "No event selected",
        detail: "Refresh events or select an event before saving an in-store check-in.",
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
        detail: "Sign in with an employee, manager, or owner PIN before checking in event attendees.",
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
    setEventCheckinSearch("")
    setEventCheckinLookup("")
    setEventAttendeeLabel("Offline walk-in")
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
        `${customerCreditDisplayName(nextCustomerCredit)} is selected. Store credit and history are ready to review.`,
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
        detail: "Sign in with an employee, manager, or owner PIN before creating customers.",
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
    setShowNewCustomerForm(false)
    setShowCreditLedger(true)
    void refreshLocalSyncStatus()
    setActivityMessage({
      title: "Customer queued",
      detail:
        `${nextCreditSnapshot.customerName ?? "Customer"} was created in ${localSyncClient.serverUrl}; ` +
        "WordPress assigns the final customer record after sync acceptance.",
      })
    }

  function applyCustomerProfileResult(result: LocalSyncCustomerProfileResult) {
    if (result.status !== "ok") {
      return null
    }

    const nextCreditSnapshot = localSyncCustomerToCreditSnapshot(
      result.customer,
      customerCreditDirectory,
      customerCredit,
    )

    setCustomerCreditDirectory((credits) => upsertCustomerCreditSnapshot(credits, nextCreditSnapshot))
    setCustomerCreditLedgerEntries((entries) => {
      const profileEntryIds = new Set(result.credit_ledger_entries.map((entry) => entry.entry_id))
      const mappedEntries = result.credit_ledger_entries.map((entry) =>
        customerCreditLedgerEntryFromLocalSync(entry, nextCreditSnapshot.customerId),
      )

      return [
        ...mappedEntries,
        ...entries.filter((entry) => !profileEntryIds.has(entry.entryId)),
      ]
    })
    setServerTradeInOrders((orders) => {
      const profileOrderIds = new Set(result.trade_in_orders.map((order) => order.order_id))

      return [
        ...result.trade_in_orders,
        ...orders.filter((order) => !profileOrderIds.has(order.order_id)),
      ]
    })
    setKioskOrderTickets((tickets) => {
      const profileTickets = result.kiosk_orders.map(kioskTicketFromLocalSyncOrder)
      const profileTicketIds = new Set(profileTickets.map((ticket) => ticket.orderId))

      return [
        ...profileTickets,
        ...tickets.filter((ticket) => !profileTicketIds.has(ticket.orderId)),
      ].slice(0, 50)
    })
    setActiveCustomerId(nextCreditSnapshot.customerId)
    setCustomerProfileResult(result)

    return nextCreditSnapshot
  }

  async function refreshCustomerProfile(customerPublicId = customerCredit.customerPublicId) {
    if (!customerPublicId) {
      setCustomerProfileStatus("blocked")
      setCustomerProfileDetail("Select a synced or LAN-created customer before loading a profile.")
      return
    }

    if (!localSyncSessionToken) {
      setCustomerProfileStatus("blocked")
      setCustomerProfileDetail("A valid local sync server session token is required.")
      return
    }

    setCustomerProfileStatus("working")
    setCustomerProfileDetail("Loading customer profile, store credit, orders, and saved trade-ins.")

    const result = await localSyncClient.getCustomerProfile(localSyncSessionToken, customerPublicId)

    if (result.status !== "ok") {
      setCustomerProfileResult(result)
      setCustomerProfileStatus("blocked")
      setCustomerProfileDetail(result.message)
      return
    }

    const nextCreditSnapshot = applyCustomerProfileResult(result)
    setCustomerProfileStatus("ready")
    setCustomerProfileDetail(
      `${result.customer.display_name} profile loaded: ${result.summary.trade_in_count} trade-in record(s), ${result.summary.ledger_entry_count} ledger row(s), ${formatMoney(
        result.summary.credit_balance_minor_units,
        nextCreditSnapshot?.currency ?? "USD",
      )} credit.`,
    )
  }

  async function handleCustomerProfileSearch() {
    const searchValue = customerSearchQuery.trim()

    if (!searchValue) {
      setCustomerProfileStatus("blocked")
      setCustomerProfileDetail("Enter a name, email, phone, or customer ID.")
      return
    }

    setCustomerProfileStatus("working")
    setCustomerProfileDetail("Searching LAN customer cache.")

    const result = await localSyncClient.searchCustomers(searchValue)

    if (result.status !== "ok") {
      setCustomerProfileResult(result)
      setCustomerProfileStatus("blocked")
      setCustomerProfileDetail(result.message)
      return
    }

    setCustomerSearchResults(result.customers)
    if (result.trade_in_orders && result.trade_in_orders.length > 0) {
      setServerTradeInOrders((orders) => {
        const foundIds = new Set(result.trade_in_orders?.map((order) => order.order_id) ?? [])

        return [
          ...(result.trade_in_orders ?? []),
          ...orders.filter((order) => !foundIds.has(order.order_id)),
        ]
      })
    }
    if (result.kiosk_orders && result.kiosk_orders.length > 0) {
      setKioskOrderTickets((tickets) => {
        const foundTickets = result.kiosk_orders?.map(kioskTicketFromLocalSyncOrder) ?? []
        const foundIds = new Set(foundTickets.map((ticket) => ticket.orderId))

        return [
          ...foundTickets,
          ...tickets.filter((ticket) => !foundIds.has(ticket.orderId)),
        ].slice(0, 50)
      })
    }
    setCustomerProfileStatus(result.customers.length > 0 ? "ready" : "warning")
    setCustomerProfileDetail(
      result.customers.length > 0
        ? `${result.customers.length} customer match(es) found. Select one to open the profile.`
        : "No customer matched that lookup. Use Create New Customer when this is a new local customer.",
    )
  }

  async function handleUseCustomerProfile(customer: LocalSyncCustomer) {
    const nextCreditSnapshot = localSyncCustomerToCreditSnapshot(
      customer,
      customerCreditDirectory,
      customerCredit,
    )

    setCustomerCreditDirectory((credits) => upsertCustomerCreditSnapshot(credits, nextCreditSnapshot))
    setActiveCustomerId(nextCreditSnapshot.customerId)
    setCustomerSearchQuery(customer.customer_lookup || customer.email || customer.display_name)
    setActiveSection("Customers")
    await refreshCustomerProfile(customer.customer_public_id)
  }

  function checkoutLineFromInventoryItem(item: InventoryItem, sourceOrderId = ""): CheckoutCartLine {
    return {
      lineId: `${sourceOrderId || "pos"}-${item.publicId}`,
      type: sourceOrderId ? "kiosk" : "inventory",
      inventoryPublicId: item.publicId,
      barcode: item.barcode,
      cardName: item.cardName,
      setName: item.setName,
      condition: item.condition,
      location: item.location,
      quantity: 1,
      unitPriceMinorUnits: item.priceMinorUnits,
      totalMinorUnits: item.priceMinorUnits,
      sourceOrderId,
    }
  }

  function checkoutLineFromKioskItem(item: KioskTicketItem, sourceOrderId: string): CheckoutCartLine {
    const inventoryItem = inventoryItems.find(
      (candidate) => candidate.publicId === item.publicId || candidate.barcode === item.barcode,
    )

    if (inventoryItem) {
      return checkoutLineFromInventoryItem(inventoryItem, sourceOrderId)
    }

    return {
      lineId: `${sourceOrderId}-${item.publicId}`,
      type: "kiosk",
      inventoryPublicId: item.publicId,
      barcode: item.barcode,
      cardName: item.cardName,
      setName: item.setName,
      condition: item.condition,
      location: item.location,
      quantity: 1,
      unitPriceMinorUnits: creditRedemptionInputToMinorUnits(item.price.replace(/[^0-9.]/g, "")) ?? 0,
      totalMinorUnits: creditRedemptionInputToMinorUnits(item.price.replace(/[^0-9.]/g, "")) ?? 0,
      sourceOrderId,
    }
  }

  function resetCheckoutPaymentFields() {
    setCheckoutCompletedReceipt(null)
    setCreditRedemptionInput("0.00")
    setSquareSaleTotalInput("0.00")
    setSquareReceiptReference("")
    setSquareSoldOrderId("")
    setSquareCashierConfirmed(false)
    setCheckoutTenderMode("card")
    setCheckoutCashReceivedInput("0.00")
    setCheckoutReceiptEmail("")
  }

  function setCheckoutMode(mode: CheckoutCustomerMode) {
    setCheckoutCustomerMode(mode)
    setSelectedCustomerKioskOrderId("")
    resetCheckoutPaymentFields()
    setActivityMessage({
      title: mode === "guest" ? "Guest sale started" : "Customer sale started",
      detail:
        mode === "guest"
          ? "This sale will be saved by receipt number without using customer credit."
          : "Search and select the customer before using store credit or saving the sale to their profile.",
    })
  }

  function handleAddCheckoutInventoryItem(item: InventoryItem) {
    if (checkoutCartLines.some((line) => line.inventoryPublicId === item.publicId)) {
      setActivityMessage({
        title: "Already in sale",
        detail: `${item.cardName} is already on this sale.`,
      })
      return
    }

    if (!["available", "reserved"].includes(item.status)) {
      setActivityMessage({
        title: "Item not available",
        detail: `${item.cardName} is ${statusLabel(item.status).toLowerCase()} and cannot be sold here.`,
      })
      return
    }

    setCheckoutCartLines((lines) => [...lines, checkoutLineFromInventoryItem(item)])
    setCheckoutBarcodeInput("")
    setCheckoutProductSearch("")
    setCheckoutCompletedReceipt(null)
    setActivityMessage({
      title: item.status === "reserved" ? "Held item added" : "Item added",
      detail:
        item.status === "reserved"
          ? `${item.cardName} is on hold in the local cache. Complete only if this is the same customer/order.`
          : `${item.cardName} is ready for sale completion.`,
    })
  }

  function handleAddCheckoutBarcode() {
    const scan = checkoutBarcodeInput.trim()
    const item = findInventoryItemByScan(inventoryItems, scan)

    if (!scan || !item) {
      setActivityMessage({
        title: "Barcode not found",
        detail: "Scan or type a product barcode from the label, then add it to this sale.",
      })
      return
    }

    handleAddCheckoutInventoryItem(item)
  }

  function handleAddCheckoutMiscLine() {
    const amountMinorUnits = creditRedemptionInputToMinorUnits(checkoutMiscAmountInput)
    const label = checkoutMiscLabel.trim() || "Misc sale"

    if (amountMinorUnits === null || amountMinorUnits <= 0) {
      setActivityMessage({
        title: "Misc amount needed",
        detail: "Enter a misc sale amount above $0.00.",
      })
      return
    }

    setCheckoutCartLines((lines) => [
      ...lines,
      {
        lineId: `misc-${Date.now()}`,
        type: "misc",
        cardName: label,
        quantity: 1,
        unitPriceMinorUnits: amountMinorUnits,
        totalMinorUnits: amountMinorUnits,
      },
    ])
    setCheckoutMiscLabel("Misc sale")
    setCheckoutMiscAmountInput("0.00")
    setCheckoutCompletedReceipt(null)
    setActivityMessage({
      title: "Misc line added",
      detail: `${label} added to this sale.`,
    })
  }

  function handleRemoveCheckoutLine(lineId: string) {
    setCheckoutCartLines((lines) => lines.filter((line) => line.lineId !== lineId))
    setCheckoutCompletedReceipt(null)
  }

  function handleLoadKioskOrderToCheckout(ticket: KioskOrderTicket) {
    if (ticket.paymentStatus === "paid" || ["completed", "expired"].includes(ticket.status)) {
      setActivityMessage({
        title: "Kiosk order already checked out",
        detail: `${ticket.orderId} is already paid or closed. Use Fulfillment or the customer history to review it.`,
      })
      return
    }

    setSelectedCustomerKioskOrderId(ticket.orderId)
    setSquareSaleTotalInput(creditRedemptionInputFromMinorUnits(ticket.totalMinorUnits))
    setCreditRedemptionInput("0.00")
    setSquareReceiptReference(ticket.squareReceiptReference || "")
    setSquareSoldOrderId("")
    setSquareCashierConfirmed(false)
    setCheckoutReceiptEmail("")
    setCheckoutCartLines(ticket.items.map((item) => checkoutLineFromKioskItem(item, ticket.orderId)))
    if (ticket.customerPublicId || selectedCustomerPublicId) {
      setCheckoutCustomerMode("customer")
    }
    setActiveSection("Checkout")
    setCheckoutCompletedReceipt(null)
    setActivityMessage({
      title: "Kiosk order loaded",
      detail: `${ticket.orderId} is in Sale Completion with ${ticket.itemCount} card(s). Pick the cards, then record Square payment.`,
    })
  }

  function handleUseCustomerKioskOrder(ticket: KioskOrderTicket) {
    handleLoadKioskOrderToCheckout(ticket)
  }

  async function handleAttachKioskOrderToCustomer(ticket = selectedCustomerKioskOrder) {
    if (!ticket) {
      setActivityMessage({
        title: "Select kiosk order",
        detail: "Search and select a kiosk pickup order before linking it to a customer profile.",
      })
      return null
    }

    if (!selectedCustomerPublicId) {
      setActivityMessage({
        title: "Select customer",
        detail: "Search and select a customer before linking a kiosk order.",
      })
      return null
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "PIN session required",
        detail: "Sign in before linking kiosk order history to a customer profile.",
      })
      return null
    }

    const result = await localSyncClient.updateKioskOrderCustomer(
      localSyncSessionToken,
      ticket.orderId,
      {
        customerPublicId: selectedCustomerPublicId,
        customerLookup: customerCredit.customerLookup ?? activeCustomerName,
      },
    )

    if (result.status !== "ok") {
      setActivityMessage({
        title: result.status === "unavailable" ? "LAN server unavailable" : "Kiosk link blocked",
        detail: result.message,
      })
      return null
    }

    const updatedTicket = kioskTicketFromLocalSyncOrder(result.order)
    setKioskOrderTickets((tickets) => [
      updatedTicket,
      ...tickets.filter((candidate) => candidate.orderId !== updatedTicket.orderId),
    ].slice(0, 50))
    setSelectedCustomerKioskOrderId(updatedTicket.orderId)
    if (selectedCustomerPublicId) {
      void refreshCustomerProfile(selectedCustomerPublicId)
    }
    setActivityMessage({
      title: "Kiosk order linked",
      detail: `${updatedTicket.orderId} is attached to ${activeCustomerName}'s local profile history.`,
    })

    return updatedTicket
  }

  async function handleRefreshSquareTerminalStatus() {
    if (!localSyncSessionToken) {
      setSquareTerminalProbeStatus("blocked")
      setActivityMessage({
        title: "Square reader status needs login",
        detail: "Sign in before checking the Square Terminal connector on the LAN server.",
      })
      return
    }

    setSquareTerminalProbeStatus("working")
    const result = await localSyncClient.getSquareTerminalStatus(localSyncSessionToken)
    setSquareTerminalStatus(result)
    setSquareTerminalProbeStatus(result.status === "ok" ? (result.can_create_terminal_checkout ? "ready" : "warning") : "blocked")
    setActivityMessage({
      title: result.status === "ok" ? "Square reader status checked" : "Square reader status blocked",
      detail:
        result.status === "ok"
          ? result.can_create_terminal_checkout
            ? "Square Terminal is configured on the LAN server and can receive payment requests."
            : "Square Terminal is not fully configured yet. Manual Square receipt handoff still works."
          : result.message,
    })
  }

  async function handleCreateSquareTerminalDeviceCode() {
    if (!localSyncSessionToken || !managerControlsUnlocked) {
      setActivityMessage({
        title: "Manager unlock required",
        detail: "Unlock manager controls before creating a Square Terminal activation code.",
      })
      return
    }

    const result = await localSyncClient.createSquareTerminalDeviceCode(localSyncSessionToken, {
      deviceName: "The Pug Counter Reader",
    })
    setSquareTerminalDeviceCode(result)
    setSquareTerminalProbeStatus(result.status === "ok" ? "ready" : "blocked")
    setActivityMessage({
      title: result.status === "ok" ? "Square activation code ready" : "Square activation blocked",
      detail:
        result.status === "ok"
          ? `Enter ${result.device_code.code} on the Square reader, then set the paired device ID on the LAN server.`
          : result.message,
    })
  }

  async function handleSendSquareTerminalCheckout() {
    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "PIN session required",
        detail: "Sign in before sending a payment to the Square reader.",
      })
      return
    }

    const checkoutReaderMode = activeSection === "Checkout" && checkoutCartLines.length > 0
    const terminalCheckoutAmountMinorUnits = checkoutReaderMode
      ? checkoutCardPaidMinorUnits
      : squareSaleTotalMinorUnits
    const terminalCheckoutIssue = checkoutReaderMode
      ? checkoutCardPaidMinorUnits <= 0
        ? "There is no card balance to send to the Square reader."
        : ""
      : squareSaleTotalIssue

    if (terminalCheckoutIssue || terminalCheckoutAmountMinorUnits === null) {
      setActivityMessage({
        title: "Square payment amount needed",
        detail: terminalCheckoutIssue || "Enter the Square ticket total first.",
      })
      return
    }

    const referenceId =
      (checkoutReaderMode
        ? selectedCustomerKioskOrder?.orderId || checkoutCleanSquareReceiptReference
        : selectedCustomerKioskOrder?.orderId ?? cleanSquareReceiptReference) ||
      `customer-${customerCredit.customerPublicId ?? customerCredit.customerId}`
    const result = await localSyncClient.createSquareTerminalCheckout(localSyncSessionToken, {
      amountMinorUnits: terminalCheckoutAmountMinorUnits,
      currency: customerCredit.currency,
      referenceId,
      note: selectedCustomerKioskOrder
        ? `The Pug kiosk order ${selectedCustomerKioskOrder.orderId}`
        : checkoutReaderMode
          ? "The Pug card payment"
          : `The Pug customer payment ${activeCustomerName}`,
    })

    if (result.status !== "ok") {
      setSquareTerminalProbeStatus("blocked")
      setActivityMessage({
        title: result.status === "unavailable" ? "LAN server unavailable" : "Square reader blocked",
        detail: result.message,
      })
      return
    }

    setSquareTerminalProbeStatus("ready")
    setSquareReceiptReference(result.square_checkout.id || referenceId)
    setActivityMessage({
      title: "Sent to Square reader",
      detail: `Payment ${result.square_checkout.id || referenceId} was sent to the paired Square Terminal. Record the final receipt once the reader completes.`,
    })
  }

  async function handleCompleteCustomerKioskCheckout() {
    if (!selectedCustomerKioskOrder) {
      setActivityMessage({
        title: "Select kiosk order",
        detail: "Search and select a kiosk order before completing the customer sale.",
      })
      return
    }

    if (!selectedCustomerKioskOrder.allItemsPicked) {
      await handleOpenKioskPicking(selectedCustomerKioskOrder)
      setActivityMessage({
        title: "Pick cards first",
        detail: "The kiosk order is open in fulfillment. Check off each card before completing the customer sale.",
      })
      return
    }

    if (squareReceiptReferenceIssue) {
      setActivityMessage({
        title: "Square reference required",
        detail: squareReceiptReferenceIssue,
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "PIN session required",
        detail: "Sign in before completing the customer sale.",
      })
      return
    }

    const linkedTicket =
      selectedCustomerKioskOrder.customerPublicId === selectedCustomerPublicId
        ? selectedCustomerKioskOrder
        : await handleAttachKioskOrderToCustomer(selectedCustomerKioskOrder)

    if (!linkedTicket) {
      return
    }

    const paymentResult = await localSyncClient.confirmKioskOrderPayment(
      localSyncSessionToken,
      linkedTicket.orderId,
      {
        squareReceiptReference: cleanSquareReceiptReference,
        cashierConfirmed: true,
        customerPublicId: selectedCustomerPublicId,
        customerLookup: customerCredit.customerLookup ?? activeCustomerName,
      },
    )

    if (paymentResult.status !== "ok") {
      setActivityMessage({
        title: paymentResult.status === "unavailable" ? "LAN server unavailable" : "Kiosk payment blocked",
        detail: paymentResult.message,
      })
      return
    }

    const paidTicket = kioskTicketFromLocalSyncOrder(paymentResult.order)
    setKioskOrderTickets((tickets) =>
      tickets.map((candidate) => candidate.orderId === paidTicket.orderId ? paidTicket : candidate),
    )

    const completedResult = await localSyncClient.updateKioskOrderStatus(
      localSyncSessionToken,
      paidTicket.orderId,
      "completed",
    )

    const finalTicket =
      completedResult.status === "ok" ? kioskTicketFromLocalSyncOrder(completedResult.order) : paidTicket
    setKioskOrderTickets((tickets) => [
      finalTicket,
      ...tickets.filter((candidate) => candidate.orderId !== finalTicket.orderId),
    ].slice(0, 50))
    setSelectedCustomerKioskOrderId(finalTicket.orderId)
    if (paymentResult.sale?.status === "ok") {
      setInventoryItems((items) =>
        items.map((item) =>
          paymentResult.sale?.status === "ok" &&
          paymentResult.sale.items.some((soldItem) => soldItem.public_id === item.publicId)
            ? { ...item, status: "sold", source: "queued" }
            : item,
        ),
      )
    }
    setSquareCashierConfirmed(false)
    setSquareReceiptReference("")
    if (selectedCustomerPublicId) {
      void refreshCustomerProfile(selectedCustomerPublicId)
    }
    void runOperationalAutoSync()
    setActivityMessage({
      title: "Customer sale completed",
      detail: `${finalTicket.orderId} is completed, exact card copies are sold, and the order is attached to ${activeCustomerName}'s profile history.`,
    })
  }

  function checkoutReceiptItemsPayload() {
    return checkoutCartLines.map((line) => ({
      line_id: line.lineId,
      type: line.type,
      label: line.cardName,
      inventory_public_id: line.inventoryPublicId ?? "",
      barcode: line.barcode ?? "",
      card_name: line.cardName,
      set_name: line.setName ?? "",
      condition: line.condition ?? "",
      location: line.location ?? "",
      quantity: line.quantity,
      unit_price_minor_units: line.unitPriceMinorUnits,
      total_minor_units: line.totalMinorUnits,
      status: line.type === "misc" ? "charged" : "sold",
    }))
  }

  function checkoutFallbackCashReference() {
    return `CASH-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`
  }

  async function saveCheckoutReceiptRecord(
    source: "local_pos" | "kiosk" = "local_pos",
    paymentReference = checkoutRequiresSquareReceipt
      ? checkoutCleanSquareReceiptReference
      : checkoutFallbackCashReference(),
  ) {
    if (!localSyncSessionToken) {
      return null
    }

    const result = await localSyncClient.createCheckoutTransaction(localSyncSessionToken, {
      customerPublicId: checkoutCustomerMode === "customer" ? selectedCustomerPublicId : "",
      customerLookup: checkoutCustomerMode === "customer" ? customerCredit.customerLookup ?? activeCustomerName : "",
      customerName: checkoutCustomerMode === "customer" ? activeCustomerName : "Guest sale",
      customerEmail: checkoutReceiptEmailAddress.trim(),
      guestCheckout: checkoutCustomerMode === "guest",
      squareReceiptReference: paymentReference,
      squareOrderId: cleanSquareSoldOrderId,
      sourceOrderId: selectedCustomerKioskOrder?.orderId ?? "",
      source,
      receiptDelivery: checkoutReceiptDelivery,
      tenderType: checkoutTenderMode,
      subtotalMinorUnits: checkoutSubtotalMinorUnits,
      creditUsedMinorUnits: checkoutCreditMinorUnits,
      squareDueMinorUnits: checkoutSquareDueMinorUnits,
      cashPaidMinorUnits: checkoutCashPaidMinorUnits,
      cardPaidMinorUnits: checkoutCardPaidMinorUnits,
      changeDueMinorUnits: checkoutChangeDueMinorUnits,
      totalMinorUnits: checkoutSubtotalMinorUnits,
      currency: "USD",
      items: checkoutReceiptItemsPayload(),
    })

    if (result.status === "ok") {
      setCheckoutCompletedReceipt(result.transaction)
      if (selectedCustomerPublicId) {
        void refreshCustomerProfile(selectedCustomerPublicId)
      }
    }

    return result
  }

  async function handleCompleteCheckoutSale() {
    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "PIN session required",
        detail: "Sign in before completing this sale.",
      })
      return
    }

    if (checkoutCartLines.length === 0) {
      setActivityMessage({
        title: "Sale is empty",
        detail: "Scan a product, load a kiosk order, or add a misc line before completing the sale.",
      })
      return
    }

    if (checkoutCustomerMode === "customer" && !selectedCustomerPublicId) {
      setActivityMessage({
        title: "Select customer",
        detail: "Search and select the customer first, or switch this sale to Guest Sale.",
      })
      return
    }

    if (checkoutUnavailableLines.length > 0) {
      setActivityMessage({
        title: "Unavailable item in cart",
        detail: `${checkoutUnavailableLines[0].cardName} is no longer available. Remove it or sync inventory before completing this sale.`,
      })
      return
    }

    if (checkoutReceiptEmailIssue || checkoutTenderIssue) {
      setActivityMessage({
        title: "Receipt details needed",
        detail: checkoutReceiptEmailIssue || checkoutTenderIssue,
      })
      return
    }

    if (checkoutCreditMinorUnits > 0) {
      if (checkoutCustomerMode !== "customer" || !selectedCustomerPublicId) {
        setActivityMessage({
          title: "Credit needs customer",
          detail: "Store credit can only be used after selecting a local customer profile.",
        })
        return
      }

      if (checkoutCreditMinorUnits > displayedCreditMinorUnits || checkoutCreditMinorUnits > checkoutSubtotalMinorUnits) {
        setActivityMessage({
          title: "Credit amount blocked",
          detail: "Credit cannot exceed the customer's balance or the sale total.",
        })
        return
      }

      if (checkoutCardPaidMinorUnits > 0 && !squareCashierConfirmed) {
        setActivityMessage({
          title: "Confirm Square credit",
          detail: "Confirm the credit was included before sending or completing the Square card payment.",
        })
        return
      }
    }

    const checkoutPaymentReference = checkoutRequiresSquareReceipt
      ? checkoutCleanSquareReceiptReference
      : checkoutFallbackCashReference()
    const checkoutTenderLabel =
      checkoutTenderMode === "cash"
        ? "cash"
        : checkoutTenderMode === "split"
          ? "split cash/card"
          : "card"

    const kioskLineOrderIds = [
      ...new Set(checkoutCartLines.filter((line) => line.type === "kiosk").map((line) => line.sourceOrderId).filter(Boolean)),
    ]
    const loadedKioskOrder =
      selectedCustomerKioskOrder && kioskLineOrderIds.includes(selectedCustomerKioskOrder.orderId)
        ? selectedCustomerKioskOrder
        : null

    if (loadedKioskOrder && !loadedKioskOrder.allItemsPicked) {
      await handleOpenKioskPicking(loadedKioskOrder)
      setActivityMessage({
        title: "Pick cards first",
        detail: "The kiosk order is open in fulfillment. Check off every card before completing this sale.",
      })
      return
    }

    const nonKioskInventoryLines = checkoutInventoryLines.filter((line) => line.type !== "kiosk")

    if (nonKioskInventoryLines.length > 0) {
      const saleResult = await localSyncClient.finalizeSquarePosSale(localSyncSessionToken, {
        inventoryPublicIds: nonKioskInventoryLines.map((line) => line.inventoryPublicId ?? "").filter(Boolean),
        barcodes: nonKioskInventoryLines.map((line) => line.barcode ?? "").filter(Boolean),
        squareReceiptReference: checkoutPaymentReference,
        squareOrderId: cleanSquareSoldOrderId,
        saleTotalMinorUnits: checkoutSubtotalMinorUnits,
      })

      if (saleResult.status !== "ok") {
        setActivityMessage({
          title: saleResult.status === "unavailable" ? "LAN server unavailable" : "Sale blocked",
          detail: saleResult.message,
        })
        return
      }

      const soldIds = new Set((saleResult.items ?? []).map((item) => item.public_id))
      setInventoryItems((items) =>
        items.map((item) =>
          soldIds.has(item.publicId) ||
          nonKioskInventoryLines.some((line) => line.inventoryPublicId === item.publicId || line.barcode === item.barcode)
            ? {
                ...item,
                status: "sold",
                source: saleResult.wordpress_accepted_count > 0 ? "accepted" : "queued",
                externalSyncState: saleResult.wordpress_accepted_count > 0 ? "synced" : "pending",
                rowVersion: item.rowVersion + 1,
              }
            : item,
        ),
      )
    }

    if (loadedKioskOrder) {
      const linkedTicket =
        checkoutCustomerMode === "customer" && loadedKioskOrder.customerPublicId !== selectedCustomerPublicId
          ? await handleAttachKioskOrderToCustomer(loadedKioskOrder)
          : loadedKioskOrder

      if (!linkedTicket) {
        return
      }

      const paymentResult = await localSyncClient.confirmKioskOrderPayment(
        localSyncSessionToken,
        linkedTicket.orderId,
        {
          squareReceiptReference: checkoutPaymentReference,
          squareOrderId: cleanSquareSoldOrderId,
          cashierConfirmed: true,
          customerPublicId: checkoutCustomerMode === "customer" ? selectedCustomerPublicId : "",
          customerLookup: checkoutCustomerMode === "customer" ? customerCredit.customerLookup ?? activeCustomerName : "",
        },
      )

      if (paymentResult.status !== "ok") {
        setActivityMessage({
          title: paymentResult.status === "unavailable" ? "LAN server unavailable" : "Kiosk sale blocked",
          detail: paymentResult.message,
        })
        return
      }

      const paidTicket = kioskTicketFromLocalSyncOrder(paymentResult.order)
      const completedResult = await localSyncClient.updateKioskOrderStatus(
        localSyncSessionToken,
        paidTicket.orderId,
        "completed",
      )
      const finalTicket =
        completedResult.status === "ok" ? kioskTicketFromLocalSyncOrder(completedResult.order) : paidTicket
      setKioskOrderTickets((tickets) => [
        finalTicket,
        ...tickets.filter((candidate) => candidate.orderId !== finalTicket.orderId),
      ].slice(0, 50))
      if (paymentResult.sale?.status === "ok") {
        const kioskSoldIds = new Set(paymentResult.sale.items.map((item) => item.public_id))
        setInventoryItems((items) =>
          items.map((item) =>
            kioskSoldIds.has(item.publicId) ? { ...item, status: "sold", source: "queued" } : item,
          ),
        )
      }
    }

    if (checkoutCreditMinorUnits > 0) {
      const redemptionResult = await localSyncClient.createCreditRedemption(localSyncSessionToken, {
        customerPublicId: selectedCustomerPublicId,
        amountMinorUnits: checkoutCreditMinorUnits,
        saleTotalMinorUnits: checkoutSubtotalMinorUnits,
        reason: `sale store credit ${formatMoney(checkoutCreditMinorUnits, customerCredit.currency)}`,
        squareReceiptReference: checkoutPaymentReference,
        squareCashierConfirmed: true,
      })

      if (redemptionResult.status === "ok") {
        const nextCreditSnapshot = customerCreditSnapshotFromLocalSyncCustomer(
          redemptionResult.customer,
          customerCredit,
        )
        setCustomerCreditDirectory((credits) => upsertCustomerCreditSnapshot(credits, nextCreditSnapshot))
        setCustomerCreditLedgerEntries((entries) => [
          customerCreditLedgerEntryFromLocalSync(redemptionResult.ledger_entry, nextCreditSnapshot.customerId),
          ...entries.filter((entry) => entry.entryId !== redemptionResult.ledger_entry.entry_id),
        ])
        setActiveCustomerId(nextCreditSnapshot.customerId)
      } else {
        setActivityMessage({
          title: redemptionResult.status === "unavailable" ? "LAN server unavailable" : "Credit use blocked",
          detail: redemptionResult.message,
        })
        return
      }
    }

    const receiptResult = await saveCheckoutReceiptRecord(
      loadedKioskOrder ? "kiosk" : "local_pos",
      checkoutPaymentReference,
    )

    if (receiptResult?.status !== "ok") {
      setActivityMessage({
        title: receiptResult?.status === "unavailable" ? "LAN server unavailable" : "Receipt not saved",
        detail: receiptResult?.message ?? "Sale finished, but the local receipt record did not save.",
      })
      return
    }

    setCreditRedemptionInput("0.00")
    setSquareReceiptReference("")
    setSquareSoldOrderId("")
    setSquareCashierConfirmed(false)
    void refreshLocalSyncStatus()
    void runOperationalAutoSync()
    setActivityMessage({
      title: "Sale complete",
      detail:
        `${checkoutCustomerMode === "guest" ? "Guest sale" : `${activeCustomerName}'s sale`} saved as ${checkoutTenderLabel} payment ${checkoutPaymentReference}. ` +
        `${checkoutReceiptDelivery === "both" ? "Print and email receipt selected." : checkoutReceiptDelivery === "email" ? "Email receipt selected." : "Print receipt selected."}`,
    })
  }

  function applyTradeInCreditApplication(
    application: Extract<LocalSyncTradeInOrderStatusUpdateResult, { status: "ok" }>["credit_application"],
  ) {
    if (!application?.customer) {
      return ""
    }

    const nextCreditSnapshot = localSyncCustomerToCreditSnapshot(
      application.customer,
      customerCreditDirectory,
      customerCredit,
    )

    setCustomerCreditDirectory((credits) => upsertCustomerCreditSnapshot(credits, nextCreditSnapshot))
    setActiveCustomerId(nextCreditSnapshot.customerId)

    if (application.ledger_entry) {
      setCustomerCreditLedgerEntries((entries) => [
        customerCreditLedgerEntryFromLocalSync(application.ledger_entry!, nextCreditSnapshot.customerId),
        ...entries.filter((entry) => entry.entryId !== application.ledger_entry?.entry_id),
      ])
    }

    return application.applied
      ? ` ${formatMoney(application.credit_total_minor_units ?? 0, nextCreditSnapshot.currency)} store credit was applied to ${application.customer.display_name}.`
      : ` ${application.message}`
  }

  async function handleCreditAdjustment() {
    if (creditAdjustmentIssue || creditAdjustmentMinorUnits === null) {
      setActivityMessage({
        title: "Credit adjustment blocked",
        detail: creditAdjustmentIssue || "Enter a valid customer credit amount.",
      })
      return
    }

    if (!localSyncSessionToken) {
      setActivityMessage({
        title: "PIN session required",
        detail: "Sign in before adding store credit.",
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
        title: adjustmentResult.status === "unavailable" ? "LAN server unavailable" : "Credit adjustment blocked",
        detail:
          adjustmentResult.status === "unavailable"
            ? adjustmentResult.message
            : `${adjustmentResult.message} Website ledger acceptance is required.`,
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
    setCreditAdjustmentReason("")
    setCreditRedemptionInput(
      creditRedemptionInputFromMinorUnits(nextCreditSnapshot.redemptionPreviewMinorUnits),
    )
    setShowCreditLedger(true)
    void refreshLocalSyncStatus()
    setActivityMessage({
      title: "Credit adjustment queued",
      detail:
        `${formatMoney(creditAdjustmentMinorUnits, nextCreditSnapshot.currency)} adjusted locally by the signed-in staff user; ` +
        "WordPress posts the final ledger entry after sync acceptance.",
    })
  }

  async function handleSaveCreditApprovalThreshold() {
    if (!managerControlsUnlocked || !localSyncSessionToken) {
      return
    }

    const threshold = creditRedemptionInputToMinorUnits(creditApprovalThresholdInput)
    if (threshold === null || threshold < 0) {
      setActivityMessage({
        title: "Credit limit invalid",
        detail: "Enter a valid non-negative dollar amount for the staff approval limit.",
      })
      return
    }

    const result = await localSyncClient.configureSetup(localSyncSessionToken, {
      storeId: activeProfile.id,
      serverUrl: localSyncClient.serverUrl,
      websiteUrl: connectorDisplayUrl(activeProfile),
      restBasePath: "/wp-json/tcg-store/v1",
      creditApprovalThresholdMinorUnits: threshold,
    })

    if (result.status !== "ok") {
      setActivityMessage({ title: "Credit limit not saved", detail: result.message })
      return
    }

    setCreditApprovalThresholdMinorUnits(threshold)
    setCreditApprovalThresholdInput(creditRedemptionInputFromMinorUnits(threshold))
    setActivityMessage({
      title: "Credit approval limit saved",
      detail: `Employees can add up to ${formatMoney(threshold, "USD")} without a manager PIN. Corrections and larger adjustments still require a manager.`,
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
        detail: "Sign in with an employee, manager, or owner PIN before using customer credit.",
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

  async function handleSaveConnectorDraft() {
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
    let lanSetupDetail =
      "LAN setup was saved on this device only; sign in with a manager PIN to publish it to the middleman server."

    setConnectorProfiles((profiles) => upsertConnectorProfile(profiles, profile))
    setActiveProfileId(profile.id)
    setConnectorValidation(validation)
    setConnectorTestReport(report)
    setPairingPlan(null)

    if (localSyncSessionToken && ["manager", "owner"].includes(sessionRole)) {
      const setupClient = createLocalSyncServerClient(localSyncServerDisplayUrl(profile))
      const setupResult = await setupClient.configureSetup(localSyncSessionToken, {
        storeId: profile.companyShortName,
        serverUrl: localSyncServerDisplayUrl(profile),
        websiteUrl: connectorDisplayUrl(profile),
        restBasePath: profile.wordpress.restBasePath,
      })

      if (setupResult.status === "ok") {
        lanSetupDetail =
          `${setupResult.setup_status.server_url} now reports ${setupResult.setup_status.website_url}; ` +
          `restart/reload connector workers after changing website bindings: ` +
          `${setupResult.wordpress_connector_restart_required ? "yes" : "no"}.`
        setLanSetupProbe({
          status: "ready",
          endpoint: `${setupClient.serverUrl}/setup/config`,
          detail: lanSetupDetail,
          oneWebsiteMode: setupResult.setup_status.one_website_mode,
          credentialsSyncedToApp: setupResult.credentials_synced_to_client,
        })
      } else {
        lanSetupDetail =
          setupResult.status === "unavailable"
            ? `${setupResult.message} Local website setup remains saved on this device.`
            : `${setupResult.message} Local website setup remains saved on this device.`
        setLanSetupProbe({
          status: "blocked",
          endpoint: `${setupClient.serverUrl}/setup/config`,
          detail: lanSetupDetail,
          oneWebsiteMode: true,
          credentialsSyncedToApp: false,
        })
      }
    } else {
      setLanSetupProbe({
        status: "idle",
        endpoint: "",
        detail: lanSetupDetail,
        oneWebsiteMode: true,
        credentialsSyncedToApp: false,
      })
    }

    setActiveSection("Settings")
    setActivityMessage({
      title: validation.status === "rejected" ? "Website saved with issues" : "Website connection saved",
      detail: `${profile.companyName} ${profile.environment} now points at ${connectorDisplayUrl(profile)} with LAN sync at ${localSyncServerDisplayUrl(profile)}. ${lanSetupDetail} Guarded inventory holds are ${profile.wordpress.canonicalInventoryWritesEnabled ? "enabled" : "deferred"}; credentials are still server-side or desktop secure-store only.`,
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
      const resolvedConflictIds = new Set(reviewedConflicts.map((conflict) => conflict.conflictId))
      const conflictCacheApplyResult = applyOfflinePullConflictRecordsToCache(
        openConflicts,
        completed
          ? pull.pull_conflict_records.filter((record) => !resolvedConflictIds.has(record.conflict_id))
          : [],
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

  async function handlePrintLabel(targetItem = selectedItem) {
    if (targetItem.id === EMPTY_INVENTORY_ITEM.id) {
      setActiveSection("Inventory")
      setActivityMessage({
        title: "No label available",
        detail: "Import the live inventory CSV or add a card before printing labels.",
      })
      return
    }

    const labelJob = buildOfflineLabelPrintJob(targetItem, activeProfile)

    setActiveSection("Inventory")
    setActivityMessage({
      title: "Printing barcode label",
      detail:
        `${labelJob.cardName} label ${labelJob.barcode} is being sent directly to the DYMO LabelWriter 550 Turbo.`,
    })

    await handleOpenDymoLabelPrint(labelJob)
  }

  function handlePrintCheckoutLabels() {
    const labelItems = checkoutInventoryLines
      .map((line) =>
        inventoryItems.find(
          (item) => item.publicId === line.inventoryPublicId || (!!line.barcode && item.barcode === line.barcode),
        ),
      )
      .filter((item): item is InventoryItem => Boolean(item))

    if (labelItems.length === 0) {
      setActivityMessage({
        title: "No labels ready",
        detail: "Add scanned products to this sale before preparing Dymo labels.",
      })
      return
    }

    const labelJobs = labelItems.map((item) => buildOfflineLabelPrintJob(item, activeProfile))
    const labelIds = new Set(labelJobs.map((job) => job.inventoryPublicId))

    setLabelPrintJobs((jobs) => [
      ...labelJobs,
      ...jobs.filter((job) => !labelIds.has(job.inventoryPublicId)),
    ].slice(0, 12))
    setActivityMessage({
      title: "Dymo labels prepared",
      detail:
        `${labelJobs.length} label job(s) are ready for Dymo LabelWriter 550 Turbo printing through the Windows print adapter.`,
    })
  }

  async function handleOpenDymoLabelPrint(job: OfflineLabelPrintJob) {
    const scanCode = cleanBrowserDymoScanCode(job.barcode)

    if (scanCode.length > SCANNER_BARCODE_MAX_LENGTH) {
      setActivityMessage({
        title: "Barcode too long for scanner",
        detail:
          `${scanCode} is ${scanCode.length} characters. Scanner-safe labels must be ` +
          `${SCANNER_BARCODE_MAX_LENGTH} characters or less; update the barcode before printing.`,
      })
      return
    }

    setActivityMessage({
      title: "Checking this PC for DYMO",
      detail:
        `${job.cardName} label ${job.barcode} will print from this workstation first. If no local printer answers, the app will send it to the LAN server printer.`,
    })

    const localPrinterResult = await printLabelOnThisPcDymo(job)

    if (localPrinterResult.status === "ok") {
      setActivityMessage({
        title: "Local DYMO label sent",
        detail:
          `${job.cardName} printed on this PC using ${localPrinterResult.printerName}; scanner code ${localPrinterResult.scanCode}.`,
      })
      return
    }

    if (localSyncSessionToken) {
      setActivityMessage({
        title: "Trying LAN server printer",
        detail:
          `${localPrinterResult.message} Sending ${job.cardName} to the LAN server printer through ${localSyncClient.serverUrl}.`,
      })

      try {
        const result = await localSyncClient.printDymoLabel(localSyncSessionToken, {
          cardName: job.cardName,
          setCode: job.setCode,
          condition: job.condition,
          barcode: job.barcode,
        })

        if (result.status === "ok") {
          setActivityMessage({
            title: "LAN DYMO label sent",
            detail:
              `${result.card_name} printed on ${result.label_stock} using ${result.barcode_format}; scanner code ${result.scan_code}.`,
          })
          return
        }

        setActivityMessage({
          title: "DYMO direct print unavailable",
          detail: `${result.message} Opening the browser print fallback instead.`,
        })
      } catch (error) {
        setActivityMessage({
          title: "DYMO direct print unavailable",
          detail: `${error instanceof Error ? error.message : "DYMO printing failed."} Opening the browser print fallback instead.`,
        })
      }
    } else {
      setActivityMessage({
        title: "DYMO direct print unavailable",
        detail:
          `${localPrinterResult.message} Start a PIN session with the LAN server to use the shared printer, or use the browser print fallback now.`,
      })
    }

    const printWindowOpened = openDymoLabelPrintDialog(job)

    setActivityMessage({
      title: printWindowOpened ? "Dymo print dialog opened" : "Print window blocked",
      detail: printWindowOpened
        ? "Choose the Dymo LabelWriter 550 Turbo in the Windows print dialog. This fallback is only for when DYMO Connect direct printing is unavailable."
        : "Allow pop-ups for this local app, then press Print again. The label data is still prepared.",
    })
  }

  function moveConflictToReviewed(conflict: ConflictItem) {
    setOpenConflicts((conflicts) => conflicts.filter((item) => item.conflictId !== conflict.conflictId))
    setReviewedConflicts((conflicts) => {
      const nextConflicts = [
        conflict,
        ...conflicts.filter((item) => item.conflictId !== conflict.conflictId),
      ]
      persistConflictReviewStorage(activeProfile.id, nextConflicts)

      return nextConflicts
    })
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

  if (customerKioskMode) {
    return (
      <main className="offline-shell kiosk-standalone-shell">
        <header className="kiosk-standalone-header">
          <div className="brand-lockup">
            <img className="brand-crest" src={thePugBrandLogo} alt="" />
            <span>
              <strong>The Pug</strong>
              <small>Customer pickup kiosk</small>
            </span>
          </div>
          <div
            className={`kiosk-live-status ${kioskInventoryStatusTone}`}
            aria-label="Kiosk sync status"
          >
            <span>Inventory status</span>
            <strong>{kioskInventoryStatusLabel}</strong>
          </div>
        </header>

        <section className="kiosk-panel is-customer-kiosk" aria-label="Customer kiosk pickup order">
          <div className="kiosk-storefront-hero">
            <div>
              <h1>Find cards in stock</h1>
              <p>Search the same live singles inventory available on The Pug website, then send your list to the counter.</p>
            </div>
            <div className="kiosk-storefront-total">
              <span>Your pickup list</span>
              <strong>{kioskCartItems.length} cards</strong>
              <small>{kioskCartTotalLabel}</small>
            </div>
          </div>
          <div className="kiosk-filter-bar" aria-label="Kiosk inventory filters">
            <label htmlFor="customer-kiosk-search">
              <span>Search</span>
              <input
                id="customer-kiosk-search"
                value={kioskSearchQuery}
                onChange={(event) => setKioskSearchQuery(event.target.value)}
                placeholder="Card name, set, condition, or number"
              />
            </label>
            <label>
              <span>Game</span>
              <select
                value={kioskGameFilter}
                onChange={(event) => {
                  setKioskGameFilter(event.target.value)
                  setKioskSetFilter("all")
                }}
              >
                <option value="all">All games</option>
                {kioskGameOptions.map((game) => (
                  <option value={game} key={game}>{gameDisplayLabel(game)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Set / Expansion</span>
              <select value={kioskSetFilter} onChange={(event) => setKioskSetFilter(event.target.value)}>
                <option value="all">All sets</option>
                {kioskSetOptions.map((setName) => (
                  <option value={setName} key={setName}>{setName}</option>
                ))}
              </select>
            </label>
            <div className="kiosk-result-count">
              <span>Available</span>
              <strong>{kioskVisibleItems.length}</strong>
            </div>
          </div>
          <div className="kiosk-layout">
            <div className="kiosk-inventory-list kiosk-card-grid" aria-label="Kiosk inventory results">
              {kioskVisibleItems.map((item) => (
                <article className="kiosk-card" key={item.id}>
                  <div className="kiosk-card-art" aria-hidden="true">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" loading="lazy" />
                    ) : (
                      <Icon name="card" />
                    )}
                  </div>
                  <div className="kiosk-card-copy">
                    <span className="kiosk-card-game">{gameDisplayLabel(item.game)}</span>
                    <strong>{item.cardName}</strong>
                    <small>
                      {item.setName} / {item.number || item.setCode || "Card"} / {item.condition}
                    </small>
                  </div>
                  <div className="kiosk-card-price">
                    <strong>{item.price}</strong>
                    <span>In stock</span>
                  </div>
                  <button
                    type="button"
                    disabled={kioskCartIds.includes(item.id)}
                    onClick={() => handleKioskAddItem(item)}
                  >
                    {kioskCartIds.includes(item.id) ? "Selected" : "Add"}
                  </button>
                </article>
              ))}
              {kioskVisibleItems.length === 0 ? (
                <p className="panel-empty">No in-stock cards match that search.</p>
              ) : null}
            </div>
            <aside ref={kioskCartRef} className="kiosk-cart" aria-label="Kiosk selected cards">
              <header className="kiosk-cart-header">
                <div>
                  <span>Pickup list</span>
                  <small>
                    {kioskCartItems.length} {kioskCartItems.length === 1 ? "card" : "cards"} selected
                  </small>
                </div>
                <strong>{kioskCartTotalLabel}</strong>
              </header>
              {kioskCartItems.length > 0 ? (
                <div className="kiosk-cart-items">
                  {kioskCartItems.map((item) => (
                    <article className="kiosk-cart-item" key={item.id}>
                      <div className="kiosk-cart-thumbnail" aria-hidden="true">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" />
                        ) : (
                          <Icon name="card" />
                        )}
                      </div>
                      <div className="kiosk-cart-item-copy">
                        <span>{gameDisplayLabel(item.game)}</span>
                        <strong>{item.cardName}</strong>
                        <small>
                          {item.setName} / {item.number || item.setCode || "Card"} / {item.condition}
                        </small>
                      </div>
                      <div className="kiosk-cart-item-actions">
                        <strong>{item.price}</strong>
                        <button
                          type="button"
                          aria-label={`Remove ${item.cardName} from pickup list`}
                          title={`Remove ${item.cardName}`}
                          onClick={() => handleKioskRemoveItem(item.id)}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="kiosk-cart-empty">
                  <Icon name="card" />
                  <strong>Your list is empty</strong>
                  <small>Select an in-stock card to start a pickup order.</small>
                </div>
              )}
              <section className="kiosk-checkout">
                <div className="kiosk-checkout-heading">
                  <strong>Send to the counter</strong>
                  <small>Tell our team who is picking up this order.</small>
                </div>
                <div className="kiosk-customer-name-fields">
                  <label htmlFor="kiosk-first-name">
                    <span>First name</span>
                    <input
                      id="kiosk-first-name"
                      value={kioskFirstName}
                      onChange={(event) => setKioskFirstName(event.target.value)}
                      placeholder="First"
                    />
                  </label>
                  <label htmlFor="kiosk-last-name">
                    <span>Last name</span>
                    <input
                      id="kiosk-last-name"
                      value={kioskLastName}
                      onChange={(event) => setKioskLastName(event.target.value)}
                      placeholder="Last"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={!kioskCustomerReady || kioskCartItems.length === 0}
                  onClick={() => void handleKioskSubmitOrder()}
                >
                  <Icon name="check" />
                  <span>Send to Counter</span>
                </button>
                {activityMessage.title === "Pickup order sent" ? (
                  <small className="kiosk-cart-message" aria-live="polite">
                    Pickup order sent. Please see a team member at the counter.
                  </small>
                ) : null}
              </section>
            </aside>
            {kioskCartItems.length > 0 && !kioskCartInView ? (
              <button
                className="kiosk-cart-jump"
                type="button"
                onClick={() =>
                  kioskCartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <Icon name="card" />
                <span>
                  <strong>
                    {kioskCartItems.length} {kioskCartItems.length === 1 ? "card" : "cards"}
                  </strong>
                  <small>{kioskCartTotalLabel}</small>
                </span>
                <b>View list</b>
              </button>
            ) : null}
          </div>
        </section>
      </main>
    )
  }

  if (!sessionIsUnlocked) {
    return (
      <main className="offline-shell login-shell">
        <div className="app-window-bar" aria-label="Desktop app window">
          <div className="window-brand">
            <img src={thePugBrandLogo} alt="" />
            <span>The Pug Store App</span>
          </div>
        </div>
        <section className="login-workspace" aria-label="Offline app login">
          <form
            className="login-card"
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault()
              void handlePinLogin()
            }}
          >
            <img src={thePugBrandLogo} alt="" />
            <span className="micro-label">Website-connected local app</span>
            <h1>Enter PIN</h1>
            <div className="login-fields">
              <label>
                <span className="micro-label">4-digit employee, manager, or owner PIN</span>
                <input
                  id="pug-employee-pin"
                  name="pug-pin-entry"
                  className="pin-entry-input"
                  inputMode="numeric"
                  maxLength={4}
                  type="text"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
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
              {loginIssue ? <small>{loginIssue}</small> : <small>Use your assigned store PIN.</small>}
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
              <button type="submit">
                Go
              </button>
            </div>
            <div className="login-actions">
              <button
                type="submit"
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
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="offline-shell">
      <div className="app-window-bar" aria-label="Desktop app window">
        <div className="window-brand">
          <img src={thePugBrandLogo} alt="" />
          <span>The Pug Store App</span>
        </div>
      </div>

      {liveCardScanMode ? (
        <div className="live-card-scanner-backdrop" role="dialog" aria-modal="true" aria-label="Live card scanner">
          <section className="live-card-scanner">
            <header>
              <div>
                <span className="micro-label">
                  {liveCardScanMode === "inventory" ? "Inventory scanner" : "Trade-in scanner"}
                </span>
                <h2>Scan Card</h2>
              </div>
              <button type="button" className="icon-button" aria-label="Close scanner" onClick={closeLiveCardScanner}>
                <Icon name="close" />
              </button>
            </header>
            <div className="live-card-scanner__stage">
              <video ref={liveCardScanVideoRef} playsInline muted />
              <div className="live-card-scanner__guide" aria-hidden="true">
                <span />
              </div>
              <canvas ref={liveCardScanCanvasRef} hidden />
            </div>
            <footer>
              <div className={`live-card-scanner__status ${liveCardScanStatus}`}>
                <strong>
                  {liveCardScanStatus === "starting"
                    ? "Starting camera"
                    : liveCardScanStatus === "identifying"
                      ? "Identifying"
                      : liveCardScanStatus === "blocked"
                        ? "Needs attention"
                        : "Ready to scan"}
                </strong>
                <small>{liveCardScanDetail}</small>
              </div>
              {liveCardScanPreviewUrl ? (
                <img className="live-card-scanner__preview" src={liveCardScanPreviewUrl} alt="Last scanned card crop" />
              ) : null}
              <div className="live-card-scanner__actions">
                <button type="button" className="secondary-command" onClick={closeLiveCardScanner}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void identifyLiveCardScanFrame()}
                  disabled={liveCardScanStatus === "starting" || liveCardScanStatus === "identifying"}
                >
                  <Icon name="scan" />
                  <span>{liveCardScanStatus === "identifying" ? "Scanning" : "Scan Card"}</span>
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

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
            {workspace.navItems
              .filter((item) => canAccessSection(item.label))
              .filter((item) => !HIDDEN_NORMAL_NAV_SECTIONS.has(item.label))
              .map((item) => (
                <button
                  className={[
                    "nav-item",
                    item.label === activeSection ? "is-active" : "",
                    "",
                  ].filter(Boolean).join(" ")}
                  type="button"
                  aria-label={employeeSectionLabel(item.label)}
                  key={item.label}
                  onClick={() => handleNavSelection(item.label)}
                >
                  <Icon name={item.icon} />
                  <span>{employeeSectionLabel(item.label)}</span>
                  {item.label === "Queue" ? <strong>{queueBadgeCount}</strong> : null}
                  {item.label === "Price Review" ? <strong>{priceReviewBadgeCount}</strong> : null}
                  {item.label === "Events" ? <strong>{eventBadgeCount}</strong> : null}
                  {item.label === "Conflicts" ? <strong>{conflictBadgeCount}</strong> : null}
                </button>
              ))}
          </nav>
          {sessionRole === "owner" ? (
            <>
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
            </>
          ) : null}
        </aside>

        <section className="workspace">
          <header className="top-bar">
            <div className="title-stack">
              <span className="micro-label">
                {workspace.device.storeLabel} / {activeProfile.environment}
              </span>
              <h1>Store Operations</h1>
            </div>
            <div className="top-actions" aria-label="Offline sync status">
              {["manager", "owner"].includes(sessionRole) ? (
              <button className="site-setup-card" type="button" onClick={handleOpenWebsiteSetup}>
                <span>Website</span>
                <strong>{activeProfile.companyName}</strong>
                <small>{connectorDisplayUrl(activeProfile)}</small>
              </button>
              ) : null}
              <div className="connection-pill" aria-label={`Connection status ${liveConnectionModeLabel}`}>
                <Icon name="wifi" />
                <span>{liveConnectionModeLabel}</span>
              </div>
              <div className="sync-time">
                <span>Last sync</span>
                <strong>{liveLastSyncLabel}</strong>
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
            <strong>{employeeSectionLabel(activeSection)}</strong>
          </section>

          <section
            className={activeSection === "Status" ? "status-workspace" : "status-workspace is-hidden"}
            aria-label="Status activity"
            ref={statusPanelRef}
          >
            <section className="workflow-status" aria-live="polite" ref={workflowPanelRef}>
              <div>
                <span className="micro-label">Active workspace</span>
                <strong>{employeeSectionLabel(activeSection)}</strong>
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
                <button
                  className="secondary-command"
                  type="button"
                  disabled={catalogRefreshInFlight || !localSyncSessionToken}
                  onClick={() => void handleRefreshReferenceCatalog()}
                >
                  <Icon name="sync" />
                  <span>{catalogRefreshInFlight ? "Refreshing Catalog" : "Refresh Card Catalog"}</span>
                </button>
              </header>
              {catalogRefreshSummary ? (
                <p className="status-inline-message">{catalogRefreshSummary}</p>
              ) : null}
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

          <section
            className={activeSection === "ScryDex" ? "status-workspace" : "status-workspace is-hidden"}
            aria-label="ScryDex catalog and pricing"
          >
            <section className="status-dashboard" aria-label="ScryDex catalog status">
              <header className="status-dashboard-heading scrydex-status-heading">
                <div>
                  <span className="micro-label">ScryDex</span>
                  <strong>Catalog, Pricing, Scheduled Sync</strong>
                </div>
                <div className="scrydex-heading-actions">
                  <button
                    className="secondary-command scrydex-action-button"
                    type="button"
                    disabled={catalogRefreshInFlight || !localSyncSessionToken}
                    onClick={() => void handleRefreshReferenceCatalog()}
                  >
                    <Icon name="sync" />
                    <span>{catalogRefreshInFlight ? "Refreshing" : "Refresh Catalog"}</span>
                  </button>
                  <button
                    className="secondary-command scrydex-action-button"
                    type="button"
                    disabled={catalogRefreshInFlight || !localSyncSessionToken || scryDexActiveJobs.length > 0}
                    onClick={() => void handleStartScryDexGameSync(SCRYDEX_SYNC_GAMES.map((game) => game.value))}
                  >
                    <Icon name="sync" />
                    <span>Sync All</span>
                  </button>
                </div>
              </header>
              {catalogRefreshSummary ? (
                <p className="status-inline-message">{catalogRefreshSummary}</p>
              ) : null}
              <div className="status-summary-grid">
                <article className="status-summary-card ready">
                  <div>
                    <span>Reference cache</span>
                    <strong>
                      {countLabel(
                        scryDexCatalogTotals?.card_count ??
                          (localSyncStatus?.status === "ok" ? localSyncStatus.reference_card_count : 0),
                        "card",
                      )}
                    </strong>
                  </div>
                  <p>
                    {countLabel(scryDexCatalogTotals?.variant_count ?? 0, "variant")};
                    {countLabel(scryDexCatalogTotals?.price_point_count ?? 0, "price point")};
                    local SQLite is searched before website fallback.
                  </p>
                </article>
                <article className="status-summary-card ready">
                  <div>
                    <span>Latest pricing</span>
                    <strong>{scryDexLatestPriceObservedLabel}</strong>
                  </div>
                  <p>
                    Latest catalog sync {scryDexLatestCatalogSyncLabel};
                    daily middleman sync {scryDexCatalogStatus?.daily_sync_configured ? "configured" : "not configured"}.
                  </p>
                </article>
                <article className={scryDexActiveJobs.length > 0 ? "status-summary-card working" : "status-summary-card idle"}>
                  <div>
                    <span>Sync job</span>
                    <strong>{scryDexActiveJobs.length > 0 ? `${scryDexActiveJobs.length} running` : "Idle"}</strong>
                  </div>
                  <p>
                    {localSyncStatus?.status === "ok" && localSyncStatus.scrydex_catalog_index_connected
                      ? "Full catalog index route is connected."
                      : "Full catalog index route is not confirmed."}
                  </p>
                </article>
                <article className={`status-summary-card ${scryDexLastJobTone}`}>
                  <div>
                    <span>Last scheduled/manual run</span>
                    <strong>
                      {scryDexLastJob
                        ? `${scryDexRunSourceLabel(scryDexLastJob)}: ${scryDexJobStatus(scryDexLastJob)} ${formatUtcLabel(
                            String(
                              scryDexCatalogJobRecord(scryDexLastJob).completed_at_utc ??
                                scryDexCatalogJobRecord(scryDexLastJob).started_at_utc ??
                                "",
                            ),
                          )}`
                        : "No run recorded"}
                    </strong>
                  </div>
                  <p>
                    {scryDexLastJobError ||
                      `Stored ${scryDexCatalogJobCount(scryDexLastJob, "stored_cards")} card rows, ${scryDexCatalogJobCount(
                        scryDexLastJob,
                        "variants",
                      )} variants, ${scryDexCatalogJobCount(scryDexLastJob, "prices")} prices.`}
                  </p>
                </article>
                <article className="status-summary-card ready">
                  <div>
                    <span>Pricing update</span>
                    <strong>{countLabel(Number(scryDexLastJobReprice.changed_count ?? 0), "changed card")}</strong>
                  </div>
                  <p>
                    Considered {Number(scryDexLastJobReprice.considered_count ?? 0)}; matched{" "}
                    {Number(scryDexLastJobReprice.matched_count ?? 0)}; market-only{" "}
                    {Number(scryDexLastJobReprice.saved_market_only_count ?? 0)}; floor-protected{" "}
                    {Number(scryDexLastJobReprice.floor_clamped_count ?? 0)}.
                  </p>
                </article>
                <article className="status-summary-card ready">
                  <div>
                    <span>Website / Square push</span>
                    <strong>
                      WP {Number(scryDexLastJobReprice.wordpress_accepted_count ?? 0)} / SQ{" "}
                      {Number(scryDexLastJobReprice.square_accepted_count ?? 0)}
                    </strong>
                  </div>
                  <p>
                    Retry: WordPress {Number(scryDexLastJobReprice.wordpress_retry_count ?? 0)}; Square{" "}
                    {Number(scryDexLastJobReprice.square_retry_count ?? 0)}. Catalog pull{" "}
                    {scryDexLastJobCatalogPull.status ? String(scryDexLastJobCatalogPull.status) : "not recorded"}.
                  </p>
                </article>
              </div>
            </section>

            <section className="status-timeline" aria-label="ScryDex Manual Sync">
              <header className="status-dashboard-heading scrydex-status-heading">
                <div>
                  <span className="micro-label">ScryDex Manual Sync</span>
                  <strong>Sync one game at a time through the LAN middleman</strong>
                </div>
                <span>
                  {scryDexActiveJobs.length > 0
                    ? `${scryDexActiveJobs.length} active sync${scryDexActiveJobs.length === 1 ? "" : "s"}`
                    : "No active jobs"}
                </span>
              </header>
              <div className="status-timeline-list">
                {SCRYDEX_SYNC_GAMES.map((gameOption) => {
                  const gameTotals = scryDexGameTotalsByGame.get(gameOption.value)
                  const gameJob =
                    scryDexActiveJobs.find((job) => scryDexCatalogJobIncludesGame(job, gameOption.value)) ??
                    scryDexRecentJobs.find((job) => scryDexCatalogJobIncludesGame(job, gameOption.value)) ??
                    null
                  const gameJobRecord = scryDexCatalogJobRecord(gameJob)
                  const gameRow =
                    scryDexCatalogJobGames(gameJob).find((entry) => String(entry.game ?? "") === gameOption.value) ??
                    gameJobRecord
                  const gameJobStatus = String(gameRow.status ?? gameJobRecord.status ?? "")
                  const isRunning = scryDexActiveJobs.some((job) => scryDexCatalogJobIncludesGame(job, gameOption.value))
                  const gameStage = String(gameRow.message ?? gameRow.code ?? scryDexCatalogJobStage(gameJob))
                  const phaseLabel = scryDexGamePhaseLabel(gameRow, gameJobRecord)
                  const expansionPages = scryDexGameProgressMetric(gameRow, gameJobRecord, "expansion_pages")
                  const expansionRows = scryDexGameProgressMetric(gameRow, gameJobRecord, "expansion_rows")
                  const cardPages = scryDexGameProgressMetric(gameRow, gameJobRecord, "card_pages")
                  const cardCount = scryDexGameProgressMetric(gameRow, gameJobRecord, "stored_cards")
                  const variantCount = scryDexGameProgressMetric(gameRow, gameJobRecord, "variants")
                  const priceCount = scryDexGameProgressMetric(gameRow, gameJobRecord, "prices")
                  const requestCount = scryDexGameProgressMetric(gameRow, gameJobRecord, "provider_request_count")
                  const failedCount = Number(gameRow.failed_count ?? gameRow.failed_game_count ?? gameJobRecord.failed_count ?? gameJobRecord.failed_game_count ?? 0)
                  const currentExpansion = String(
                    gameRow.current_expansion_name ??
                      gameRow.current_expansion_id ??
                      gameJobRecord.current_expansion_name ??
                      gameJobRecord.current_expansion_id ??
                      "",
                  )

                  return (
                    <article
                      className={isRunning ? "status-timeline-entry scrydex-sync-entry working" : "status-timeline-entry scrydex-sync-entry ready"}
                      key={gameOption.value}
                    >
                      <span className="status-timeline-dot" aria-hidden="true" />
                      <div>
                        <strong>{gameOption.label}</strong>
                        <p>
                          {gameJob
                            ? `${gameJobStatus || "running"}: ${gameStage}`
                            : `${countLabel(gameTotals?.card_count ?? 0, "card")}; latest sync ${formatUtcLabel(
                                gameTotals?.latest_catalog_sync_utc ?? "",
                              )}.`}
                        </p>
                        <div className="scrydex-progress-grid" aria-label={`${gameOption.label} live sync metrics`}>
                          <span>
                            <small>Phase</small>
                            <strong>{phaseLabel}</strong>
                          </span>
                          <span>
                            <small>Expansion Pages</small>
                            <strong>{expansionPages}</strong>
                          </span>
                          <span>
                            <small>Expansion Rows</small>
                            <strong>{expansionRows}</strong>
                          </span>
                          <span>
                            <small>Current Expansion</small>
                            <strong>{currentExpansion || "Cards endpoint"}</strong>
                          </span>
                          <span>
                            <small>Card Pages</small>
                            <strong>{cardPages}</strong>
                          </span>
                          <span>
                            <small>Cards</small>
                            <strong>{cardCount}</strong>
                          </span>
                          <span>
                            <small>Variants</small>
                            <strong>{variantCount}</strong>
                          </span>
                          <span>
                            <small>Prices Gathered</small>
                            <strong>{priceCount}</strong>
                          </span>
                          <span>
                            <small>Requests</small>
                            <strong>{requestCount}</strong>
                          </span>
                          <span>
                            <small>Failed</small>
                            <strong>{failedCount}</strong>
                          </span>
                        </div>
                        {String(scryDexCatalogJobRecord(gameJob).last_error ?? "") ? (
                          <small>{String(scryDexCatalogJobRecord(gameJob).last_error ?? "")}</small>
                        ) : null}
                      </div>
                      <button
                        className="secondary-command scrydex-action-button"
                        type="button"
                        disabled={catalogRefreshInFlight || !localSyncSessionToken || isRunning}
                        onClick={() => void handleStartScryDexGameSync(gameOption.value)}
                      >
                        <Icon name="sync" />
                        <span>{isRunning ? "Syncing" : "Sync Now"}</span>
                      </button>
                    </article>
                  )
                })}
              </div>
              {scryDexLiveLogLines.length > 0 ? (
                <div className="scrydex-live-log" aria-label="ScryDex live sync log">
                  {scryDexLiveLogLines.map((line, index) => (
                    <span key={`${line}-${index}`}>{line}</span>
                  ))}
                </div>
              ) : null}
            </section>

            {scryDexCatalogTotals?.games?.length ? (
              <section className="status-timeline" aria-label="ScryDex game catalog freshness">
                <header className="status-dashboard-heading">
                  <div>
                    <span className="micro-label">Game coverage</span>
                    <strong>Indexed cards and price freshness</strong>
                  </div>
                  <span>{countLabel(scryDexCatalogTotals.games.length, "game")}</span>
                </header>
                <div className="status-timeline-list">
                  {scryDexCatalogTotals.games.map((game) => (
                    <article className="status-timeline-entry ready" key={game.game}>
                      <span className="status-timeline-dot" aria-hidden="true" />
                      <div>
                        <strong>{game.game}</strong>
                        <p>
                          {countLabel(game.card_count, "card")};
                          {countLabel(game.price_point_count, "price point")};
                          latest price {formatUtcLabel(game.latest_price_observed_utc)};
                          catalog {formatUtcLabel(game.latest_catalog_sync_utc)}.
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {renderOperationSyncVisibilityPanel()}
          </section>

          <section
            className={activeSection === "Price Review" ? "price-review-workspace" : "price-review-workspace is-hidden"}
            aria-label="Price review"
          >
            <header className="price-review-heading">
              <div>
                <span className="micro-label">Manager approval</span>
                <strong>Price Review</strong>
                <p>Changes above the configured threshold stay off the website, Square, and kiosk until approved.</p>
              </div>
              <div className={`price-review-state ${priceReviewStatus}`}>
                <strong>{priceReviewStatus === "working" ? "Loading" : `${priceReviewBadgeCount} pending`}</strong>
                <small>{priceReviewDetail}</small>
                <button
                  className="secondary-command"
                  type="button"
                  disabled={priceReviewStatus === "working"}
                  onClick={() => void refreshPriceReviews()}
                >
                  <Icon name="sync" />
                  <span>Refresh</span>
                </button>
                <button
                  className="secondary-command"
                  type="button"
                  disabled={priceReviewStatus === "working" || selectedPriceReviewIds.length === 0}
                  onClick={() => void handleBulkPriceReviewDecision("rejected")}
                >
                  <Icon name="minus" />
                  <span>Keep selected</span>
                </button>
                <button
                  type="button"
                  disabled={priceReviewStatus === "working" || selectedPriceReviewIds.length === 0}
                  onClick={() => void handleBulkPriceReviewDecision("approved")}
                >
                  <Icon name="check" />
                  <span>Approve selected</span>
                </button>
              </div>
            </header>

            <div className="price-review-list">
              {priceReviews.length === 0 ? (
                <div className="price-review-empty">
                  <Icon name="check" />
                  <strong>No pending price changes</strong>
                  <span>Automatic changes at or below the threshold can continue through verified delivery.</span>
                </div>
              ) : priceReviews.map((review) => {
                const item = review.inventory_item
                const differenceMinorUnits = review.candidate_price_minor_units - review.current_price_minor_units
                const sourceLabel = review.source_currency === "JPY"
                  ? `${review.source_amount_minor_units.toLocaleString()} JPY`
                  : formatMoney(review.source_amount_minor_units, review.source_currency || "USD")
                const fallbackUsed = Boolean(
                  review.observation_payload?.condition_fallback_used || review.observation_payload?.grade_fallback_used,
                )

                return (
                  <article className="price-review-row" key={review.review_id}>
                    <label className="price-review-select">
                      <input
                        type="checkbox"
                        checked={selectedPriceReviewIds.includes(review.review_id)}
                        onChange={(event) => setSelectedPriceReviewIds((selected) => event.target.checked
                          ? [...new Set([...selected, review.review_id])]
                          : selected.filter((reviewId) => reviewId !== review.review_id))}
                        aria-label={`Select ${item?.card_name ?? review.inventory_public_id}`}
                      />
                    </label>
                    <div className="price-review-art">
                      {item?.image_url ? <img src={item.image_url} alt="" /> : <Icon name="card" />}
                    </div>
                    <div className="price-review-identity">
                      <span className="micro-label">{item?.game || "Card"}</span>
                      <strong>{item?.card_name || review.inventory_public_id}</strong>
                      <span>{[item?.set_name, item?.card_number, item?.variant, item?.finish].filter(Boolean).join(" / ")}</span>
                      <small>
                        {[review.condition_code, review.grading_company, review.grade].filter(Boolean).join(" / ") || "Condition review"}
                      </small>
                    </div>
                    <div className="price-review-metrics">
                      <span><small>Current</small><strong>{formatMoney(review.current_price_minor_units, "USD")}</strong></span>
                      <span><small>Candidate</small><strong>{formatMoney(review.candidate_price_minor_units, "USD")}</strong></span>
                      <span className={differenceMinorUnits >= 0 ? "increase" : "decrease"}>
                        <small>Difference</small>
                        <strong>{differenceMinorUnits >= 0 ? "+" : "-"}{formatMoney(Math.abs(differenceMinorUnits), "USD")}</strong>
                        <em>{review.percent_change_basis_points >= 0 ? "+" : ""}{(review.percent_change_basis_points / 100).toFixed(1)}%</em>
                      </span>
                      <span><small>Floor</small><strong>{formatMoney(review.effective_floor_minor_units, "USD")}</strong></span>
                    </div>
                    <div className="price-review-provenance">
                      <span><small>Source</small><strong>{review.source_provider || "ScryDex"}</strong></span>
                      <span><small>Observed</small><strong>{sourceLabel}</strong></span>
                      {review.source_currency === "JPY" ? (
                        <span><small>FX</small><strong>{review.fx_rate || "Unavailable"}</strong></span>
                      ) : null}
                      <span><small>Fallback</small><strong>{fallbackUsed ? "Used, same variant" : "Exact"}</strong></span>
                      <span><small>Reason</small><strong>{review.reason_code.replaceAll("_", " ")}</strong></span>
                    </div>
                    <div className="price-review-actions">
                      <label>
                        <span>Approved price</span>
                        <div className="money-input">
                          <span>$</span>
                          <input
                            inputMode="decimal"
                            value={priceReviewDrafts[review.review_id] ?? ""}
                            onChange={(event) => setPriceReviewDrafts((drafts) => ({
                              ...drafts,
                              [review.review_id]: event.target.value,
                            }))}
                            aria-label={`Approved price for ${item?.card_name ?? review.inventory_public_id}`}
                          />
                        </div>
                      </label>
                      <button type="button" onClick={() => void handlePriceReviewDecision(review, "approved")}>
                        <Icon name="check" />
                        <span>Approve</span>
                      </button>
                      <button className="secondary-command" type="button" onClick={() => void handlePriceReviewDecision(review, "manual")}>
                        <Icon name="tag" />
                        <span>Set manual</span>
                      </button>
                      <button className="secondary-command" type="button" onClick={() => void handlePriceReviewDecision(review, "rejected")}>
                        <Icon name="minus" />
                        <span>Keep current</span>
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className={`content-grid is-paged page-${activeSection.toLowerCase().replaceAll(" ", "-")}`}>
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
                  {INVENTORY_PRODUCT_TYPE_FILTERS.map((filter) => (
                    <button
                      type="button"
                      className={productTypeFilter === filter.value ? "is-active" : ""}
                      onClick={() => setProductTypeFilter(filter.value)}
                      key={filter.value}
                    >
                      {filter.label}
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
                      onChange={(event) => {
                        setScryDexQuery(event.target.value)
                        setScryDexSetFilter("")
                      }}
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
                      onChange={(event) => {
                        setScryDexGame(event.target.value as LocalSyncScryDexCard["game"])
                        setScryDexCards([])
                        setScryDexSetFilter("")
                        setSelectedScryDexCardId("")
                        setSelectedScryDexVariantId("")
                        setScryDexLookupStatus("idle")
                        setScryDexLookupDetail("Ready")
                      }}
                    >
                      <option value="pokemon">Pokemon</option>
                        <option value="magicthegathering">MTG</option>
                        <option value="lorcana">Lorcana</option>
                        <option value="onepiece">One Piece</option>
                        <option value="gundam">Gundam</option>
                        <option value="riftbound">Riftbound</option>
                    </select>
                  </label>
                  <label htmlFor="scrydex-set-filter">
                    <span className="micro-label">Set / Expansion</span>
                    <select
                      id="scrydex-set-filter"
                      value={scryDexSetFilter}
                      onChange={(event) => handleScryDexSetFilterChange(event.target.value)}
                      disabled={scryDexSetOptions.length === 0}
                    >
                      <option value="">All sets</option>
                      {scryDexSetOptions.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
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
                    <button type="button" onClick={() => void handleScryDexLookup({ forceLive: true })}>
                      <Icon name="database" />
                      <span>Live ScryDex</span>
                    </button>
                    <button type="button" onClick={() => void openLiveCardScanner("inventory")}>
                      <Icon name="scan" />
                      <span>Scan Card</span>
                    </button>
                  </div>
                  {visibleScryDexCards.length > 0 ? (
                    <div className="scrydex-result-list" aria-label="ScryDex card results">
                      {visibleScryDexCards.map((card) => (
                        <article
                          className={
                            scryDexCardIdentity(card) === selectedScryDexCardId
                              ? "is-selected"
                              : ""
                          }
                          key={scryDexCardIdentity(card)}
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
                              {scryDexResultPriceSummary(card)}
                              {" / "}
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
                              {scryDexDisplayVariants(card).length > 0
                                ? scryDexDisplayVariants(card).map(formatScryDexVariant).filter(Boolean).join(", ")
                                : "Version details pending"}
                            </small>
                          </div>
                          <div className="scrydex-result-actions">
                            <button type="button" onClick={() => handleUseScryDexCard(card, "raw")}>
                              <Icon name="check" />
                              <span>Use Single</span>
                            </button>
                            {scryDexCardSupportsGraded(card) ? (
                              <button type="button" onClick={() => handleUseScryDexCard(card, "graded")}>
                                <Icon name="tag" />
                                <span>Use Graded</span>
                              </button>
                            ) : null}
                          </div>
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
                        {selectedScryDexDisplayVariants.length > 0 ? (
                          <label htmlFor="scrydex-variant-select" className="selected-scrydex-preview__variant-select">
                            <span className="micro-label">Version</span>
                            <select
                              id="scrydex-variant-select"
                              value={selectedScryDexVariantId}
                              onChange={(event) => handleScryDexVariantChange(event.target.value)}
                            >
                              {selectedScryDexDisplayVariants.map((variant, index) => {
                                const variantId = scryDexVariantId(
                                  scryDexCardIdentity(selectedScryDexCard),
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
                        <button
                          type="button"
                          className="selected-scrydex-preview__reprice"
                          onClick={() => void handleSelectedScryDexReprice()}
                        >
                          <Icon name="sync" />
                          <span>ScryDex Reprice</span>
                        </button>
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
                <label htmlFor="intake-product-type">
                  <span className="micro-label">Product type</span>
                  <select
                    id="intake-product-type"
                    value={intakeProductType}
                    onChange={(event) => handleIntakeProductTypeChange(event.target.value as "raw" | "graded")}
                  >
                    <option value="raw">Singles</option>
                    <option value="graded">Graded Cards</option>
                  </select>
                </label>
                <label htmlFor="intake-condition">
                  <span className="micro-label">
                    {intakeProductType === "graded" ? "Display condition" : "Condition"}
                  </span>
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
                {intakeProductType === "graded" ? (
                  <>
                    <label htmlFor="intake-grading-company">
                      <span className="micro-label">Grading company</span>
                      <select
                        id="intake-grading-company"
                        value={intakeGradingCompany}
                        onChange={(event) => setIntakeGradingCompany(event.target.value)}
                      >
                        <option value="PSA">PSA</option>
                        <option value="CGC">CGC</option>
                        <option value="BGS">Beckett/BGS</option>
                        <option value="SGC">SGC</option>
                        <option value="TAG">TAG</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label htmlFor="intake-grade">
                      <span className="micro-label">Grade</span>
                      <input
                        id="intake-grade"
                        value={intakeGrade}
                        onChange={(event) => setIntakeGrade(event.target.value)}
                        placeholder="10, 9.5, 8"
                      />
                    </label>
                    <label htmlFor="intake-cert-number">
                      <span className="micro-label">Certification #</span>
                      <input
                        id="intake-cert-number"
                        value={intakeCertNumber}
                        onChange={(event) => setIntakeCertNumber(event.target.value)}
                        placeholder="Optional"
                      />
                    </label>
                  </>
                ) : null}
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
                  <span className="micro-label">Current market</span>
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
                <label htmlFor="intake-minimum-price">
                  <span className="micro-label">Minimum sale</span>
                  <input
                    id="intake-minimum-price"
                    inputMode="decimal"
                    value={intakeMinimumPriceInput}
                    onBlur={() => {
                      const parsed = creditRedemptionInputToMinorUnits(intakeMinimumPriceInput)

                      if (parsed !== null) {
                        setIntakeMinimumPriceInput(creditRedemptionInputFromMinorUnits(parsed))
                      }
                    }}
                    onChange={(event) =>
                      setIntakeMinimumPriceInput(moneyInputDraftWithTwoDecimals(event.target.value))
                    }
                    placeholder="0.00"
                  />
                </label>
                <div className="intake-pricing-summary" aria-label="Automatic pricing summary">
                  <span className="micro-label">Auto pricing</span>
                  <strong>{formatMoney(intakeFinalPriceMinorUnits, "USD")}</strong>
                  <small>
                    Current {formatMoney(intakeMarketPriceMinorUnits, "USD")} + 10% ={" "}
                    {formatMoney(intakeAutoPriceMinorUnits, "USD")}; floor{" "}
                    {formatMoney(intakeMinimumPriceMinorUnits ?? 0, "USD")}.
                  </small>
                </div>
                <div className="intake-location-control">
                  <label htmlFor="intake-location">
                    <span className="micro-label">Location</span>
                    <input
                      id="intake-location"
                      list="inventory-location-options"
                      value={intakeLocation}
                      onChange={(event) => setIntakeLocation(event.target.value)}
                      placeholder="Intake Queue"
                    />
                  </label>
                  <datalist id="inventory-location-options">
                    {inventoryLocations.map((location) => (
                      <option key={location} value={location} />
                    ))}
                  </datalist>
                  <div className="intake-location-add">
                    <input
                      aria-label="New inventory location"
                      value={newInventoryLocation}
                      onChange={(event) => setNewInventoryLocation(event.target.value)}
                      placeholder="Add shelf/case"
                    />
                    <button type="button" onClick={() => void handleAddInventoryLocation()}>
                      <Icon name="plus" />
                    </button>
                  </div>
                </div>
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
                <span>
                  {filteredInventoryGroups.length} card printing
                  {filteredInventoryGroups.length === 1 ? "" : "s"} / {filteredInventoryCopyCount} physical copies
                </span>
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
                      {filteredInventoryGroups.map((group) => {
                        const item = group.representative

                        return (
                        <tr
                          key={group.key}
                          className={group.items.some((candidate) => candidate.id === selectedId) ? "is-selected" : ""}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <td>
                            <span className="card-title">{item.cardName}</span>
                            <small>{item.number} / {inventoryVersionLabel(item)}</small>
                          </td>
                          <td>{item.setName}</td>
                          <td>
                            <div className="inventory-condition-stock">
                              {group.conditions.map((condition) => (
                                <button
                                  type="button"
                                  className={item.condition === condition.condition ? "is-active" : ""}
                                  key={condition.condition}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setSelectedId(inventoryItemForCondition(group, condition.condition).id)
                                  }}
                                >
                                  <strong>{condition.condition}</strong>
                                  <span>{condition.stockCount}</span>
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>{group.priceLabel}</td>
                          <td>{group.locationLabel}</td>
                          <td>
                            <span className={`status-dot ${item.status}`}>
                              {group.activeStockCount} in stock
                            </span>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filteredInventoryGroups.length === 0 ? (
                    <p className="empty-table">No cached cards match this scan.</p>
                  ) : null}
                </div>
              ) : (
                <div className="inventory-card-grid" aria-label="Inventory grid">
                  {filteredInventoryGroups.map((group) => {
                    const item = group.representative
                    const selected = group.items.some((candidate) => candidate.id === selectedId)

                    return (
                    <article
                      className={selected ? "inventory-card is-selected" : "inventory-card"}
                      key={group.key}
                    >
                      <button
                        className="inventory-card-main"
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                      >
                      <span className={`status-dot ${item.status}`}>
                        {group.activeStockCount} in stock
                      </span>
                      <div className="inventory-card-art" aria-hidden="true">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" loading="lazy" />
                        ) : (
                          <Icon name="card" />
                        )}
                      </div>
                      <strong>{item.cardName}</strong>
                      <small>{item.setName}</small>
                      <span className="inventory-card-price">{group.priceLabel}</span>
                      </button>
                      <div className="inventory-card-conditions" aria-label={`${item.cardName} condition stock`}>
                        {group.conditions.map((condition) => (
                          <button
                            type="button"
                            className={item.condition === condition.condition ? "is-active" : ""}
                            key={condition.condition}
                            onClick={() => setSelectedId(inventoryItemForCondition(group, condition.condition).id)}
                          >
                            <strong>{condition.condition}</strong>
                            <span>{condition.stockCount}</span>
                          </button>
                        ))}
                      </div>
                    </article>
                    )
                  })}
                  {filteredInventoryGroups.length === 0 ? (
                    <p className="empty-table">No cached cards match this scan.</p>
                  ) : null}
                </div>
              )}
            </section>

            <section className="trade-in-panel" aria-label="Trade-in and buy-in workspace">
              <div className="section-heading">
                <h2>Trade-In Counter</h2>
                <span>Add cards like a POS order, show the cash/credit offer, then record accepted or declined.</span>
              </div>

              <div className={`trade-in-customer-hero ${tradeInCustomerLookupStatus}`}>
                <div>
                  <span className="micro-label">Customer lookup</span>
                  <strong>{tradeInCustomerStatusLabel}</strong>
                  <small>
                    Start every offer by finding the customer. If no match exists, create the customer here and use
                    the same record for saved quotes, accepted trade-ins, receipts, and reports.
                  </small>
                </div>
                <label htmlFor="trade-in-customer-lookup">
                  <span>Search customer</span>
                  <input
                    id="trade-in-customer-lookup"
                    value={tradeInCustomerLookupInput}
                    onChange={(event) => {
                      clearTradeInSelectedCustomerForEdit()
                      setTradeInCustomerLookupInput(event.target.value)
                    }}
                    placeholder="Name, email, or phone"
                  />
                </label>
                <label htmlFor="trade-in-customer-name">
                  <span>Name</span>
                  <input
                    id="trade-in-customer-name"
                    value={tradeInCustomerName}
                    onChange={(event) => {
                      clearTradeInSelectedCustomerForEdit()
                      setTradeInCustomerName(event.target.value)
                    }}
                    placeholder="First and last name"
                  />
                </label>
                <label htmlFor="trade-in-customer-phone">
                  <span>Phone</span>
                  <input
                    id="trade-in-customer-phone"
                    inputMode="tel"
                    value={tradeInCustomerPhone}
                    onChange={(event) => {
                      clearTradeInSelectedCustomerForEdit()
                      setTradeInCustomerPhone(event.target.value)
                    }}
                    placeholder="Phone for lookup"
                  />
                </label>
                <label htmlFor="trade-in-customer-email">
                  <span>Email</span>
                  <input
                    id="trade-in-customer-email"
                    type="email"
                    value={tradeInCustomerEmail}
                    onChange={(event) => {
                      clearTradeInSelectedCustomerForEdit()
                      setTradeInCustomerEmail(event.target.value)
                    }}
                    placeholder="Email for receipts/profile"
                  />
                </label>
                <label htmlFor="trade-in-customer-id-number">
                  <span>Driver license #</span>
                  <input
                    id="trade-in-customer-id-number"
                    value={tradeInCustomerIdNumber}
                    onChange={(event) => setTradeInCustomerIdNumber(event.target.value)}
                    placeholder={tradeInCustomerIdNumberOnFile || "Required to accept"}
                  />
                  {tradeInCustomerIdNumberOnFile ? <small>ID on file: {tradeInCustomerIdNumberOnFile}</small> : null}
                </label>
                <label htmlFor="trade-in-customer-id-state">
                  <span>License state</span>
                  <input
                    id="trade-in-customer-id-state"
                    value={tradeInCustomerIdState}
                    onChange={(event) => setTradeInCustomerIdState(event.target.value.toUpperCase().slice(0, 2))}
                    placeholder="ST"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleTradeInCustomerAction()}
                  disabled={tradeInCustomerLookupStatus === "searching" || tradeInCustomerLookupQuery.trim() === ""}
                >
                  {tradeInCustomerActionLabel}
                </button>
                {tradeInCustomerMatches.length > 0 ? (
                  <div className="trade-in-customer-matches" aria-label="Customer lookup matches">
                    {tradeInCustomerMatches.slice(0, 4).map((customer) => (
                      <button
                        type="button"
                        className={
                          customer.customer_public_id === tradeInSelectedCustomerPublicId ? "is-selected" : ""
                        }
                        key={customer.customer_public_id}
                        onClick={() => handleUseTradeInCustomer(customer)}
                      >
                        <strong>{customer.display_name}</strong>
                        <span>
                          {customer.customer_lookup || customer.email || "No phone/email"} /{" "}
                          {formatMoney(customer.credit.balance_minor_units, customer.credit.currency)} credit
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="trade-in-flow-steps" aria-label="Trade-in workflow">
                <span>1. Find customer</span>
                <span>2. Search cards</span>
                <span>3. Quote offer</span>
                <span>4. Accept or decline</span>
              </div>

              <div className="trade-in-search-card" aria-label="Trade-in card search">
                <div className="trade-in-search-fields">
                  <label htmlFor="trade-in-card-query">
                    <span className="micro-label">Card search</span>
                    <input
                      id="trade-in-card-query"
                      disabled={!tradeInCustomerSelected}
                      value={tradeInCardQuery}
                      onChange={(event) => {
                        setTradeInCardQuery(event.target.value)
                        setTradeInCardSetFilter("")
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          void handleTradeInCardLookup()
                        }
                      }}
                      placeholder={
                        tradeInCustomerSelected
                          ? "Search ScryDex by card, set, or number"
                          : "Select a customer first"
                      }
                    />
                  </label>
                  <label htmlFor="trade-in-card-game">
                    <span className="micro-label">Game</span>
                    <select
                      id="trade-in-card-game"
                      disabled={!tradeInCustomerSelected}
                      value={tradeInCardGame}
                      onChange={(event) => {
                        setTradeInCardGame(event.target.value as LocalSyncScryDexCard["game"])
                        setTradeInCardSetFilter("")
                      }}
                    >
                      <option value="pokemon">Pokemon</option>
                      <option value="magicthegathering">MTG</option>
                      <option value="lorcana">Lorcana</option>
                      <option value="onepiece">One Piece</option>
                    </select>
                  </label>
                  <label htmlFor="trade-in-card-set">
                    <span className="micro-label">Set / Expansion</span>
                    <select
                      id="trade-in-card-set"
                      value={tradeInCardSetFilter}
                      onChange={(event) => handleTradeInCardSetFilterChange(event.target.value)}
                      disabled={!tradeInCustomerSelected || tradeInCardSetOptions.length === 0}
                    >
                      <option value="">All sets</option>
                      {tradeInCardSetOptions.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={`trade-in-card-status ${tradeInCardLookupStatus}`}>
                    <span className="micro-label">Card lookup</span>
                    <strong>
                      {tradeInCardLookupStatus === "searching"
                        ? "Searching"
                        : !tradeInCustomerSelected
                          ? "Customer required"
                        : tradeInCardLookupStatus === "ready"
                          ? `${visibleTradeInCards.length} visible`
                          : tradeInCardLookupStatus === "blocked"
                            ? "Needs attention"
                            : "Ready"}
                    </strong>
                    <small>
                      {tradeInCustomerSelected
                        ? tradeInCardLookupDetail
                        : "Select or create a customer before searching cards for this offer."}
                    </small>
                    <button
                      type="button"
                      disabled={!tradeInCustomerSelected}
                      onClick={() => void handleTradeInCardLookup()}
                    >
                      <Icon name="search" />
                      <span>Search</span>
                    </button>
                    <button
                      type="button"
                      disabled={!tradeInCustomerSelected}
                      onClick={() => void openLiveCardScanner("trade-in")}
                    >
                      <Icon name="scan" />
                      <span>Scan Card</span>
                    </button>
                  </div>
                </div>

                {tradeInCustomerSelected && visibleTradeInCards.length > 0 ? (
                  <div className="trade-in-card-results" aria-label="Trade-in card search results">
                    {visibleTradeInCards.map((card) => (
                      <article
                        className={scryDexCardIdentity(card) === tradeInSelectedCardId ? "is-selected" : ""}
                        key={`trade-${scryDexCardIdentity(card)}`}
                      >
                        <button
                          className="trade-in-card-result-main"
                          type="button"
                          onClick={() => handleSelectTradeInCard(card, tradeInProductType)}
                        >
                          <span className="trade-in-result-art" aria-hidden="true">
                            {card.image_url ? <img src={card.image_url} alt="" loading="lazy" /> : <Icon name="card" />}
                          </span>
                          <span>
                            <strong>{card.card_name}</strong>
                            <small>
                              {card.set_name} / {card.printed_number || card.card_number || "No number"}
                            </small>
                            <small>{scryDexResultPriceSummary(card)}</small>
                          </span>
                        </button>
                        <div className="trade-in-card-result-actions">
                          <button type="button" onClick={() => handleSelectTradeInCard(card, "raw")}>
                            Use Single
                          </button>
                          {scryDexCardSupportsGraded(card) ? (
                            <button type="button" onClick={() => handleSelectTradeInCard(card, "graded")}>
                              Use Graded
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="trade-in-toolbar">
                <div className="trade-in-preview-card">
                  <span className="micro-label">Selected card quote</span>
                  <strong>{formatMoney(tradeInCurrentFinalValueMinorUnits, "USD")}</strong>
                  <small>
                    {tradeInCurrentCardName.trim() || "No trade-in card selected"} at{" "}
                    {tradeInPercentageBasisPoints / 100}%
                    {tradeInCurrentFinalValueManuallySet
                      ? `, manually overridden from ${formatMoney(tradeInPreviewValueMinorUnits, "USD")}.`
                      : "."}
                  </small>
                  {selectedTradeInCard ? (
                    <div className="trade-in-selected-card-preview">
                      <span className="trade-in-result-art" aria-hidden="true">
                        {selectedTradeInImageUrl ? (
                          <img src={selectedTradeInImageUrl} alt="" loading="lazy" />
                        ) : (
                          <Icon name="card" />
                        )}
                      </span>
                      <div>
                        <strong>{selectedTradeInCard.card_name}</strong>
                        <small>
                          {selectedTradeInCard.set_name} / {selectedTradeInVariantLabel}
                        </small>
                        {selectedTradeInDisplayVariants.length > 0 ? (
                          <label htmlFor="trade-in-variant">
                            <span className="micro-label">Version</span>
                            <select
                              id="trade-in-variant"
                              value={tradeInSelectedVariantId}
                              onChange={(event) => handleTradeInVariantChange(event.target.value)}
                            >
                              {selectedTradeInDisplayVariants.map((variant, index) => {
                                const variantId = scryDexVariantId(scryDexCardIdentity(selectedTradeInCard), variant, index)
                                const label = formatScryDexVariant(variant) || `Version ${index + 1}`

                                return (
                                  <option key={variantId} value={variantId}>
                                    {label}
                                  </option>
                                )
                              })}
                            </select>
                          </label>
                        ) : null}
                        <button
                          type="button"
                          className="selected-scrydex-preview__reprice"
                          onClick={() => void handleSelectedTradeInScryDexReprice()}
                        >
                          <Icon name="sync" />
                          <span>ScryDex Reprice</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {selectedTradeInCard ? (
                    <div
                      className={`trade-in-market-value ${selectedTradeInValuation.tone}`}
                      aria-label="Trade-in market value"
                    >
                      <div>
                        <span className="micro-label">Market value</span>
                        <strong>
                          {selectedTradeInValuation.marketMinorUnits > 0
                            ? formatMoney(
                                selectedTradeInValuation.marketMinorUnits,
                                selectedTradeInValuation.currency,
                              )
                            : "Manual required"}
                        </strong>
                        <small>
                          {selectedTradeInValuation.sourceLabel}: {selectedTradeInValuation.detail}
                        </small>
                        {selectedTradeInValuation.secondaryValuation ? (
                          <small>
                            Secondary comp: {selectedTradeInValuation.secondaryValuation.provider_product_name || selectedTradeInValuation.secondaryValuation.provider} / confidence{" "}
                            {selectedTradeInValuation.secondaryValuation.confidence_score}% / fetched{" "}
                            {formatUtcLabel(selectedTradeInValuation.secondaryValuation.fetched_at_utc)}
                          </small>
                        ) : selectedTradeInValuation.secondaryProviderStatus ? (
                          <small>{selectedTradeInValuation.secondaryProviderStatus}</small>
                        ) : null}
                      </div>
                      {selectedTradeInValuation.pricePoint ? (
                        <dl>
                          <div>
                            <dt>Low</dt>
                            <dd>
                              {formatMoney(
                                selectedTradeInValuation.pricePoint.low_price_minor_units,
                                selectedTradeInValuation.pricePoint.currency,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Mid</dt>
                            <dd>
                              {formatMoney(
                                selectedTradeInValuation.pricePoint.mid_price_minor_units,
                                selectedTradeInValuation.pricePoint.currency,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>High</dt>
                            <dd>
                              {formatMoney(
                                selectedTradeInValuation.pricePoint.high_price_minor_units,
                                selectedTradeInValuation.pricePoint.currency,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Observed</dt>
                            <dd>{formatUtcLabel(selectedTradeInValuation.pricePoint.observed_at_utc)}</dd>
                          </div>
                        </dl>
                      ) : null}
                      {selectedTradeInValuation.links.length > 0 ? (
                        <div className="trade-in-valuation-links" aria-label="External valuation links">
                          <span>Check comps</span>
                          {selectedTradeInValuation.links.map((link) => (
                            <a href={link.href} target="_blank" rel="noreferrer" key={link.label}>
                              {link.label}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="trade-in-card-controls">
                    <label htmlFor="trade-in-product-type">
                      <span className="micro-label">Type</span>
                      <select
                        id="trade-in-product-type"
                        disabled={!tradeInCustomerSelected}
                        value={tradeInProductType}
                        onChange={(event) => handleTradeInProductTypeChange(event.target.value as "raw" | "graded")}
                      >
                        <option value="raw">Single</option>
                        <option value="graded">Graded</option>
                      </select>
                    </label>
                    <label htmlFor="trade-in-condition">
                      <span className="micro-label">
                        {tradeInProductType === "graded" ? "Display condition" : "Condition"}
                      </span>
                      <select
                        id="trade-in-condition"
                        disabled={!tradeInCustomerSelected}
                        value={tradeInCondition}
                        onChange={(event) => setTradeInCondition(event.target.value)}
                      >
                        <option value="NM">Near Mint</option>
                        <option value="LP">Lightly Played</option>
                        <option value="MP">Moderately Played</option>
                        <option value="HP">Heavily Played</option>
                        <option value="DMG">Damaged</option>
                        <option value="RAW">Raw</option>
                      </select>
                    </label>
                    {tradeInProductType === "graded" ? (
                      <>
                        <label htmlFor="trade-in-grading-company">
                          <span className="micro-label">Grading company</span>
                          <select
                            id="trade-in-grading-company"
                            disabled={!tradeInCustomerSelected}
                            value={tradeInGradingCompany}
                            onChange={(event) => setTradeInGradingCompany(event.target.value)}
                          >
                            <option value="PSA">PSA</option>
                            <option value="CGC">CGC</option>
                            <option value="BGS">Beckett/BGS</option>
                            <option value="SGC">SGC</option>
                            <option value="TAG">TAG</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                        <label htmlFor="trade-in-grade">
                          <span className="micro-label">Grade</span>
                          <input
                            id="trade-in-grade"
                            disabled={!tradeInCustomerSelected}
                            value={tradeInGrade}
                            onChange={(event) => setTradeInGrade(event.target.value)}
                            placeholder="10, 9.5, 8"
                          />
                        </label>
                        <label htmlFor="trade-in-cert">
                          <span className="micro-label">Cert #</span>
                          <input
                            id="trade-in-cert"
                            disabled={!tradeInCustomerSelected}
                            value={tradeInCertNumber}
                            onChange={(event) => setTradeInCertNumber(event.target.value)}
                            placeholder="Optional"
                          />
                        </label>
                      </>
                    ) : null}
                    <label htmlFor="trade-in-percentage">
                      <span className="micro-label">Trade %</span>
                      <select
                        id="trade-in-percentage"
                        disabled={!tradeInCustomerSelected}
                        value={tradeInPercentageBasisPoints}
                        onChange={(event) => setTradeInPercentageBasisPoints(Number(event.target.value))}
                      >
                        {TRADE_IN_PERCENTAGE_OPTIONS.map((basisPoints) => (
                          <option value={basisPoints} key={basisPoints}>
                            {basisPoints / 100}%
                          </option>
                        ))}
                      </select>
                    </label>
                    <label htmlFor="trade-in-manual-final-value">
                      <span className="micro-label">Manual offer value</span>
                      <input
                        id="trade-in-manual-final-value"
                        disabled={!tradeInCustomerSelected}
                        inputMode="decimal"
                        value={tradeInManualFinalValueInput}
                        onChange={(event) => setTradeInManualFinalValueInput(event.target.value)}
                        placeholder={creditRedemptionInputFromMinorUnits(tradeInPreviewValueMinorUnits)}
                      />
                    </label>
                    <label htmlFor="trade-in-payout">
                      <span className="micro-label">Payout</span>
                      <select
                        id="trade-in-payout"
                        disabled={!tradeInCustomerSelected}
                        value={tradeInPayoutType}
                        onChange={(event) => setTradeInPayoutType(event.target.value as TradeInPayoutType)}
                      >
                        <option value="credit">Store credit</option>
                        <option value="cash">Cash</option>
                      </select>
                    </label>
                  </div>
                  <small className={tradeInManualFinalValueIssue ? "field-error" : "field-help"}>
                    {!tradeInCustomerSelected
                      ? "Select or create a customer before searching and adding trade-in cards."
                      : tradeInManualFinalValueIssue ||
                        (tradeInCurrentMarketMinorUnits > 0
                          ? "Leave manual offer blank to use the calculated market-mid percentage."
                          : "Enter a manual offer because no graded market value is available for this card.")}
                  </small>
                  <button type="button" disabled={!tradeInCustomerSelected} onClick={handleStageTradeInItem}>
                    Add Card to Offer
                  </button>
                </div>
                <div className={`trade-in-sync-card ${tradeInSyncStatus}`}>
                  <div>
                    <span className="micro-label">Shared trade-in queue</span>
                    <strong>
                      {tradeInSyncStatus === "saving"
                        ? "Saving"
                        : tradeInSyncStatus === "ready"
                          ? "Connected"
                          : tradeInSyncStatus === "blocked"
                            ? "Needs attention"
                            : "Ready"}
                    </strong>
                    <small>
                      {tradeInSyncStatus === "blocked"
                        ? "The LAN middleman rejected this action. See the error below."
                        : tradeInSyncDetail}
                    </small>
                    {tradeInSyncStatus === "blocked" ? (
                      <p className="trade-in-sync-error" role="alert">
                        {tradeInSyncDetail}
                      </p>
                    ) : null}
                  </div>
                  <div className="trade-in-sync-actions">
                    <button
                      type="button"
                      disabled={!tradeInCustomerSelected}
                      onClick={() => void handleSaveTradeInDraft()}
                    >
                      Save Draft
                    </button>
                    <button type="button" onClick={() => void refreshTradeInOrders()}>
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              <div className="trade-in-total-strip" aria-label="Trade-in totals">
                <div>
                  <span className="micro-label">Cash total</span>
                  <strong>{formatMoney(tradeInCashTotalMinorUnits, "USD")}</strong>
                </div>
                <div>
                  <span className="micro-label">Credit total</span>
                  <strong>{formatMoney(tradeInCreditTotalMinorUnits, "USD")}</strong>
                </div>
                <div>
                  <span className="micro-label">Combined total</span>
                  <strong>{formatMoney(tradeInCombinedTotalMinorUnits, "USD")}</strong>
                </div>
              </div>

              <div className="trade-in-offer-actions" aria-label="Trade-in offer actions">
                <div>
                  <span className="micro-label">Current customer offer</span>
                  <strong>{formatMoney(tradeInCombinedTotalMinorUnits, "USD")}</strong>
                  <small>
                    {tradeInLoadedOrderId ? `Editing saved quote ${tradeInLoadedOrderId}. ` : ""}
                    {tradeInDraftItems.length} line item(s). Save as a quote, record customer acceptance, or keep a
                    declined offer on file for later lookup.
                  </small>
                </div>
                <button
                  type="button"
                  disabled={!tradeInCustomerSelected}
                  onClick={() => void handleSaveTradeInDraft()}
                >
                  Save Quote
                </button>
                <button
                  type="button"
                  className="accept-command"
                  disabled={!tradeInCustomerSelected}
                  onClick={() => void handleSaveTradeInDraft("approved")}
                >
                  Customer Accepts
                </button>
                <button
                  type="button"
                  className="decline-command"
                  disabled={!tradeInCustomerSelected}
                  onClick={() => void handleSaveTradeInDraft("rejected")}
                >
                  Customer Declines
                </button>
              </div>

              <div className="trade-in-draft-list" aria-label="Draft trade-in line items">
                {tradeInDraftItems.length > 0 ? (
                  tradeInDraftItems.map((item) => {
                    const calculatedValueMinorUnits = tradeInValueMinorUnits(
                      item.marketMidMinorUnits,
                      item.percentageBasisPoints,
                    )
                    const valueMinorUnits = item.finalValueMinorUnits
                    const lineControlId = `trade-in-line-${item.id.replace(/[^a-zA-Z0-9_-]+/g, "-")}`

                    return (
                      <article className="trade-in-draft-card" key={item.id}>
                        <div className="trade-in-draft-art" aria-hidden="true">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <Icon name="card" />}
                        </div>
                        <div>
                          <span className="micro-label">
                            {item.productType === "graded" ? "Graded card" : "Single"}
                          </span>
                          <strong>{item.cardName}</strong>
                          <small>
                            {tradeInDraftSetLabel(item)} / {item.condition}
                            {item.productType === "graded"
                              ? ` / ${item.gradingCompany} ${item.grade}${item.certNumber ? ` / ${item.certNumber}` : ""}`
                              : ""}
                          </small>
                        </div>
                        <div>
                          <span className="micro-label">Market mid</span>
                          <strong>{formatMoney(item.marketMidMinorUnits, "USD")}</strong>
                          <small>
                            {item.finalValueManuallySet ? "Manual override" : "Default floor"}{" "}
                            {formatMoney(calculatedValueMinorUnits, "USD")}
                          </small>
                        </div>
                        <div className="trade-in-line-controls" aria-label={`${item.cardName} trade-in line controls`}>
                          <label htmlFor={`${lineControlId}-percentage`}>
                            <span className="micro-label">Line %</span>
                            <select
                              id={`${lineControlId}-percentage`}
                              name={`${lineControlId}-percentage`}
                              value={item.percentageBasisPoints}
                              onChange={(event) =>
                                handleTradeInLinePercentageChange(item.id, Number(event.target.value))
                              }
                            >
                              {TRADE_IN_PERCENTAGE_OPTIONS.map((basisPoints) => (
                                <option value={basisPoints} key={basisPoints}>
                                  {basisPoints / 100}%
                                </option>
                              ))}
                            </select>
                          </label>
                          <label htmlFor={`${lineControlId}-payout`}>
                            <span className="micro-label">Payout</span>
                            <select
                              id={`${lineControlId}-payout`}
                              name={`${lineControlId}-payout`}
                              value={item.payoutType}
                              onChange={(event) =>
                                handleTradeInLinePayoutChange(item.id, event.target.value as TradeInPayoutType)
                              }
                            >
                              <option value="credit">Credit</option>
                              <option value="cash">Cash</option>
                            </select>
                          </label>
                          <label htmlFor={`${lineControlId}-final-value`}>
                            <span className="micro-label">Final value</span>
                            <input
                              id={`${lineControlId}-final-value`}
                              name={`${lineControlId}-final-value`}
                              inputMode="decimal"
                              value={creditRedemptionInputFromMinorUnits(valueMinorUnits)}
                              onChange={(event) => handleTradeInLineFinalValueChange(item.id, event.target.value)}
                            />
                          </label>
                          <small>Manual final value allowed without manager approval.</small>
                        </div>
                        <div className="trade-in-draft-actions">
                          <button type="button" onClick={() => handleLoadTradeInItemForInventory(item)}>
                            Convert to Inventory
                          </button>
                          <button type="button" onClick={() => handleRemoveTradeInItem(item.id)}>
                            Remove
                          </button>
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <p className="panel-empty">
                    {tradeInCustomerSelected
                      ? "No cards in this offer yet. Search ScryDex above, select the exact printing, choose condition, payout, and per-card percentage, then add it to this trade-in cart."
                      : "No cards in this offer yet. Select or create a customer before searching and adding trade-in cards."}
                  </p>
                )}
              </div>

              <div className="trade-in-draft-list" aria-label="Shared saved trade-in orders">
                <div className="fulfillment-source-heading">
                  <div>
                    <span className="micro-label">Shared saved drafts</span>
                    <strong>
                      {visibleServerTradeInOrders.length} trade-in order(s)
                      {tradeInSelectedCustomer && tradeInRecordSearch.trim() === "" && tradeInStaffFilter.trim() === ""
                        ? ` for ${tradeInSelectedCustomer.display_name}`
                        : ""}
                    </strong>
                    {tradeInSelectedCustomer ? (
                      <small>
                        {selectedCustomerServerTradeInCount} saved/rejected/approved record(s) are attached to this
                        customer profile. Use lookup filters to search the full store history.
                      </small>
                    ) : null}
                  </div>
                  <label className="trade-in-record-search" htmlFor="trade-in-record-search">
                    <span className="micro-label">Lookup saved offer</span>
                    <input
                      id="trade-in-record-search"
                      value={tradeInRecordSearch}
                      onChange={(event) => setTradeInRecordSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void refreshTradeInOrders()
                        }
                      }}
                      placeholder="Name, phone, staff, receipt, card, set"
                    />
                  </label>
                  <label className="trade-in-record-search" htmlFor="trade-in-staff-filter">
                    <span className="micro-label">Processed by</span>
                    <select
                      id="trade-in-staff-filter"
                      value={tradeInStaffFilter}
                      onChange={(event) => setTradeInStaffFilter(event.target.value)}
                    >
                      <option value="">All staff</option>
                      {offlineUsers
                        .map((user) => (
                          <option value={user.id} key={user.id}>
                            {user.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                {visibleServerTradeInOrders.length > 0 ? (
                  visibleServerTradeInOrders.map((order) => {
                    const isLockedTradeIn =
                      order.status === "approved" ||
                      order.status === "paid" ||
                      order.status === "converted" ||
                      order.status === "completed"
                    const canConvertTradeIn = order.status === "approved" || order.status === "paid"
                    const canCompleteTradeIn = order.status === "converted"
                    const canEditTradeIn =
                      order.status === "draft" || order.status === "review" || order.status === "rejected"

                    return (
                    <article className="trade-in-draft-card is-order" key={order.order_id}>
                      <div className="trade-in-draft-art" aria-hidden="true">
                        {order.items[0]?.image_url ? (
                          <img src={order.items[0].image_url} alt="" loading="lazy" />
                        ) : (
                          <Icon name="card" />
                        )}
                      </div>
                      <div>
                        <span className="micro-label">{order.status}</span>
                        <strong>{order.customer_name}</strong>
                        <small>
                          {order.item_count} item(s) / saved {formatUtcLabel(order.updated_at_utc)}
                        </small>
                        <small>
                          {order.customer_phone ? `Phone ${order.customer_phone} / ` : ""}
                          Processed by {order.staff_user_name || order.staff_user_id || "Unknown staff"} / receipt{" "}
                          {order.order_id}
                        </small>
                        {order.converted_at_utc ? (
                          <small>
                            Converted {formatUtcLabel(order.converted_at_utc)}
                            {order.converted_by_user_name || order.converted_by_user_id
                              ? ` by ${order.converted_by_user_name || order.converted_by_user_id}`
                              : ""}
                          </small>
                        ) : null}
                      </div>
                      <div>
                        <span className="micro-label">Cash</span>
                        <strong>{formatMoney(order.cash_total_minor_units, order.currency)}</strong>
                      </div>
                      <div>
                        <span className="micro-label">Credit</span>
                        <strong>{formatMoney(order.credit_total_minor_units, order.currency)}</strong>
                      </div>
                      <div className="trade-in-draft-actions">
                        <button
                          type="button"
                          disabled={!canEditTradeIn}
                          onClick={() => handleLoadTradeInOrder(order)}
                        >
                          {order.status === "rejected" ? "Reopen Offer" : "Load Offer"}
                        </button>
                        <button
                          type="button"
                          disabled={isLockedTradeIn}
                          onClick={() => void handleTradeInStatus(order, "review")}
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          disabled={isLockedTradeIn}
                          onClick={() => void handleTradeInStatus(order, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isLockedTradeIn || order.status !== "approved"}
                          onClick={() => void handleTradeInStatus(order, "paid")}
                        >
                          Paid
                        </button>
                        <button
                          type="button"
                          disabled={!canConvertTradeIn}
                          onClick={() => void handleTradeInStatus(order, "converted")}
                        >
                          Converted
                        </button>
                        <button
                          type="button"
                          disabled={!canCompleteTradeIn}
                          onClick={() => void handleTradeInStatus(order, "completed")}
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          disabled={isLockedTradeIn || order.status === "rejected"}
                          onClick={() => void handleTradeInStatus(order, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                    )
                  })
                ) : (
                  <p className="panel-empty">
                    {tradeInSelectedCustomer
                      ? `No saved trade-in offers are attached to ${tradeInSelectedCustomer.display_name}.`
                      : "No shared trade-in orders loaded from the LAN server."}
                  </p>
                )}
              </div>

              <div className="trade-in-status-note">
                <strong>Workflow boundary</strong>
                <small>
                  Draft trade-in lines are separate from sellable inventory. Convert only after review, approval,
                  and cash/credit payout are complete.
                </small>
              </div>
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
                {selectedItem.rawOrGraded === "graded" ? (
                  <div className="detail-catalog-context" aria-label="Graded card details">
                    <span>Graded inventory</span>
                    <strong>
                      {[selectedItem.gradingCompany, selectedItem.grade].filter(Boolean).join(" ") || "Grade pending"}
                    </strong>
                    <small>
                      {selectedItem.certNumber ? `Cert ${selectedItem.certNumber}` : "Certification number optional"}
                    </small>
                  </div>
                ) : null}
                {selectedInventoryGroup ? (
                  <div className="detail-condition-selector" aria-label="Condition and stock selection">
                    <span>Condition / stock</span>
                    <div>
                      {selectedInventoryGroup.conditions.map((condition) => (
                        <button
                          type="button"
                          className={selectedItem.condition === condition.condition ? "is-active" : ""}
                          key={condition.condition}
                          onClick={() =>
                            setSelectedId(
                              inventoryItemForCondition(selectedInventoryGroup, condition.condition).id,
                            )
                          }
                        >
                          <strong>{condition.condition}</strong>
                          <small>{condition.stockCount} {condition.stockCount === 1 ? "copy" : "copies"}</small>
                          <span>{condition.priceLabel}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                  <dt>Product type</dt>
                  <dd>{selectedItem.rawOrGraded === "graded" ? "Graded Cards" : "Singles"}</dd>
                </div>
                <div>
                  <dt>Game</dt>
                  <dd>{gameDisplayLabel(selectedItem.game)}</dd>
                </div>
                <div>
                  <dt>Set</dt>
                  <dd>{selectedItem.setName || selectedItem.setCode || selectedItem.number || "Set pending"}</dd>
                </div>
                {selectedItem.rawOrGraded === "graded" ? (
                  <>
                    <div>
                      <dt>Grading company</dt>
                      <dd>{selectedItem.gradingCompany || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Grade</dt>
                      <dd>{selectedItem.grade || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Certification #</dt>
                      <dd>{selectedItem.certNumber || "Not set"}</dd>
                    </div>
                  </>
                ) : null}
                <div>
                  <dt>Barcode</dt>
                  <dd>{selectedItem.barcode}</dd>
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
                  <dd className="detail-field-stack" aria-label={selectedInventoryVisibilitySummary}>
                    <label htmlFor="selected-online-visibility">
                      <span>Online</span>
                      <select
                        id="selected-online-visibility"
                        value={selectedOnlineVisibility}
                        onChange={(event) =>
                          setSelectedOnlineVisibility(event.target.value as InventoryVisibility)
                        }
                      >
                        {INVENTORY_VISIBILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label htmlFor="selected-kiosk-visibility">
                      <span>Kiosk</span>
                      <select
                        id="selected-kiosk-visibility"
                        value={selectedKioskVisibility}
                        onChange={(event) =>
                          setSelectedKioskVisibility(event.target.value as InventoryVisibility)
                        }
                      >
                        {INVENTORY_VISIBILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label htmlFor="selected-pos-visibility">
                      <span>POS</span>
                      <select
                        id="selected-pos-visibility"
                        value={selectedPosVisibility}
                        onChange={(event) =>
                          setSelectedPosVisibility(event.target.value as InventoryVisibility)
                        }
                      >
                        {INVENTORY_VISIBILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd className="detail-field-stack detail-field-stack--money">
                    <label htmlFor="selected-sale-price">
                      <span>Sale</span>
                      <input
                        id="selected-sale-price"
                        inputMode="decimal"
                        value={selectedPriceInput}
                        onBlur={() => {
                          const parsed = creditRedemptionInputToMinorUnits(selectedPriceInput)

                          if (parsed !== null) {
                            setSelectedPriceInput(creditRedemptionInputFromMinorUnits(parsed))
                          }
                        }}
                        onChange={(event) =>
                          setSelectedPriceInput(moneyInputDraftWithTwoDecimals(event.target.value))
                        }
                        placeholder="0.00"
                      />
                    </label>
                    <label htmlFor="selected-minimum-price">
                      <span>Floor</span>
                      <input
                        id="selected-minimum-price"
                        inputMode="decimal"
                        value={selectedMinimumPriceInput}
                        onBlur={() => {
                          const parsed = creditRedemptionInputToMinorUnits(selectedMinimumPriceInput)

                          if (parsed !== null) {
                            setSelectedMinimumPriceInput(creditRedemptionInputFromMinorUnits(parsed))
                          }
                        }}
                        onChange={(event) =>
                          setSelectedMinimumPriceInput(moneyInputDraftWithTwoDecimals(event.target.value))
                        }
                        placeholder="0.00"
                      />
                    </label>
                  </dd>
                </div>
              </dl>
              {inventoryTechnicalDetailsUnlocked ? (
                <details className="inventory-technical-details">
                  <summary>Technical details</summary>
                  <dl className="detail-list">
                    <div>
                      <dt>Website ID</dt>
                      <dd>{selectedItem.publicId}</dd>
                    </div>
                    <div>
                      <dt>POS mapping</dt>
                      <dd>
                        {selectedItem.squareCatalogVariationId
                          ? `${selectedItem.externalSyncState ?? "mapped"} / ${selectedItem.squareCatalogVariationId}`
                          : selectedItem.externalSyncState === "failed" || selectedItem.externalSyncState === "conflict"
                            ? selectedItem.externalSyncState
                            : "Not mapped yet"}
                      </dd>
                    </div>
                    <div>
                      <dt>Sync source</dt>
                      <dd>{selectedItem.source}</dd>
                    </div>
                  </dl>
                </details>
              ) : null}
              <div className="detail-actions">
                <div className="inventory-adjustment-controls" aria-label="Inventory adjustment details">
                  <label htmlFor="quantity-delta">
                    <span className="micro-label">Stock count</span>
                    <input
                      id="quantity-delta"
                      inputMode="numeric"
                      value={quantityDeltaInput}
                      onChange={(event) => setQuantityDeltaInput(event.target.value.replace(/\D/g, ""))}
                      placeholder="0"
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
                  {selectedDetailIssue ? <small>{selectedDetailIssue}</small> : null}
                </div>
                <button
                  className="wide-action"
                  type="button"
                  onClick={() => void handleQuantityAdjustment()}
                >
                  <Icon name="upload" />
                  <span>Save Inventory Update</span>
                </button>
                <button
                  type="button"
                  disabled={selectedItem.status !== "available"}
                  onClick={() => void handleInventoryReservation()}
                >
                  Hold Item
                </button>
                <button type="button" onClick={() => void handleQuantityAdjustment()}>
                  Set Stock
                </button>
                <button type="button" onClick={() => void handlePrintLabel()}>
                  Print Barcode Label
                </button>
              </div>
              <div className="operation-preview" aria-live="polite">
                {stagedOperation ? (
                  <>
                    <span>
                      {queueSubmission?.status === "queued" ? "Queued update" : "Saved update"}
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
                    <small>Updates are saved here and sent on the next sync.</small>
                  </>
                )}
              </div>
              {labelPrintJobs.length > 0 ? (
                <div className="label-job-list" aria-label="Prepared label jobs">
                  <span>Prepared labels</span>
                  {labelPrintJobs.map((job) => (
                    <article key={job.jobId} className="label-job-card">
                      <strong>{job.cardName}</strong>
                      <small>
                        {job.setCode}; {job.condition}; {printableCode39Value(job.barcode)};{" "}
                        {job.queuedAtLabel}
                      </small>
                      <code>{job.payloadText}</code>
                      <button type="button" onClick={() => void handleOpenDymoLabelPrint(job)}>
                        <Icon name="tag" />
                        <span>Print</span>
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}
            </aside>

            <section className="checkout-panel" aria-label="Sale completion">
              <div className="section-heading section-heading-actions">
                <div>
                  <h2>Sale Completion</h2>
                  <span>Scan products, load kiosk orders, apply local credit, and save the Square receipt.</span>
                </div>
                <div className="checkout-mode-buttons" aria-label="Sale start mode">
                  <button
                    type="button"
                    className={checkoutCustomerMode === "guest" ? "is-active" : ""}
                    onClick={() => setCheckoutMode("guest")}
                  >
                    <Icon name="checkout" />
                    <span>Guest Sale</span>
                  </button>
                  <button
                    type="button"
                    className={checkoutCustomerMode === "customer" ? "is-active" : ""}
                    onClick={() => setCheckoutMode("customer")}
                  >
                    <Icon name="customer" />
                    <span>Customer Sale</span>
                  </button>
                </div>
              </div>

              <div className="checkout-customer-strip" aria-label="Sale customer">
                <div>
                  <span className="micro-label">Current sale</span>
                  <strong>
                    {checkoutCustomerMode === "guest" ? "Guest sale" : activeCustomerName}
                  </strong>
                  <small>
                    {checkoutCustomerMode === "guest"
                      ? "No store credit on guest sales."
                      : `${formatMoney(displayedCreditMinorUnits, customerCredit.currency)} local credit available.`}
                  </small>
                </div>
                <label htmlFor="checkout-customer-search">
                  <span className="micro-label">Find customer</span>
                  <input
                    id="checkout-customer-search"
                    value={customerSearchQuery}
                    onChange={(event) => setCustomerSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        setCheckoutCustomerMode("customer")
                        void handleCustomerProfileSearch()
                      }
                    }}
                    placeholder="Name, email, or phone"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutCustomerMode("customer")
                    void handleCustomerProfileSearch()
                  }}
                >
                  <Icon name="search" />
                  <span>Search</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection("Customers")
                    setShowNewCustomerForm(true)
                  }}
                >
                  <Icon name="plus" />
                  <span>New Customer</span>
                </button>
              </div>

              {checkoutCustomerMode === "customer" && customerSearchResults.length > 0 ? (
                <div className="checkout-customer-results" aria-label="Checkout customer matches">
                  {customerSearchResults.slice(0, 8).map((customer) => (
                    <button
                      type="button"
                      key={customer.customer_public_id}
                      className={customer.customer_public_id === customerCredit.customerPublicId ? "is-selected" : ""}
                      onClick={() => void handleUseCustomerProfile(customer)}
                    >
                      <strong>{customer.display_name}</strong>
                      <span>{customer.customer_lookup || customer.email || customer.customer_public_id}</span>
                      <small>{formatMoney(customer.credit.balance_minor_units, customer.credit.currency)} credit</small>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="checkout-layout">
                <div className="checkout-entry-panel">
                  <div className="checkout-card-reader" aria-label="Barcode scanner">
                    <label htmlFor="checkout-barcode">
                      <span className="micro-label">Barcode scan</span>
                      <input
                        id="checkout-barcode"
                        autoComplete="off"
                        value={checkoutBarcodeInput}
                        onChange={(event) => setCheckoutBarcodeInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            handleAddCheckoutBarcode()
                          }
                        }}
                        placeholder="Scan product label"
                      />
                    </label>
                    <button type="button" onClick={handleAddCheckoutBarcode}>
                      <Icon name="scan" />
                      <span>Add Scan</span>
                    </button>
                  </div>

                  <div className="checkout-product-search" aria-label="Product lookup">
                    <label htmlFor="checkout-product-search">
                      <span className="micro-label">Product search</span>
                      <input
                        id="checkout-product-search"
                        value={checkoutProductSearch}
                        onChange={(event) => setCheckoutProductSearch(event.target.value)}
                        placeholder="Card, set, condition, barcode"
                      />
                    </label>
                    <div className="checkout-search-results">
                      {checkoutInventoryMatches.length > 0 ? (
                        checkoutInventoryMatches.map((item) => (
                          <button
                            type="button"
                            key={item.publicId}
                            disabled={!["available", "reserved"].includes(item.status)}
                            onClick={() => handleAddCheckoutInventoryItem(item)}
                          >
                            <strong>{item.cardName}</strong>
                            <span>
                              {item.setName} / {item.condition} / {statusLabel(item.status)}
                            </span>
                            <small>
                              {item.price}; {item.barcode}; {item.location}
                            </small>
                          </button>
                        ))
                      ) : (
                        <p>Search or scan to add products.</p>
                      )}
                    </div>
                  </div>

                  <div className="checkout-kiosk-import" aria-label="Kiosk order import">
                    <header>
                      <div>
                        <span className="micro-label">Kiosk order</span>
                        <strong>
                          {selectedCustomerKioskOrder
                            ? selectedCustomerKioskOrder.orderId
                            : "Search pickup orders"}
                        </strong>
                        <small>Load cards the customer already picked from the kiosk.</small>
                      </div>
                      <button type="button" onClick={() => void refreshKioskOrderTickets(false)}>
                        <Icon name="sync" />
                        <span>Refresh</span>
                      </button>
                    </header>
                    <label htmlFor="checkout-kiosk-search">
                      <span className="micro-label">Order, name, receipt, card</span>
                      <input
                        id="checkout-kiosk-search"
                        value={customerKioskOrderSearch}
                        onChange={(event) => setCustomerKioskOrderSearch(event.target.value)}
                        placeholder="Kiosk ID, name, card"
                      />
                    </label>
                    <div className="checkout-kiosk-results">
                      {checkoutKioskOrderMatches.length > 0 ? (
                        checkoutKioskOrderMatches.map((ticket) => (
                          <button
                            type="button"
                            key={ticket.orderId}
                            className={ticket.orderId === selectedCustomerKioskOrderId ? "is-selected" : ""}
                            onClick={() => handleLoadKioskOrderToCheckout(ticket)}
                          >
                            <strong>{ticket.orderId}</strong>
                            <span>{ticket.customerName}</span>
                            <small>
                              {ticket.status}; {ticket.itemCount} card(s); {ticket.totalLabel}
                            </small>
                          </button>
                        ))
                      ) : (
                        <p>No unpaid kiosk orders match this search.</p>
                      )}
                    </div>
                  </div>

                  <div className="checkout-misc-panel" aria-label="Misc sale line">
                    <label htmlFor="checkout-misc-label">
                      <span className="micro-label">Misc button</span>
                      <input
                        id="checkout-misc-label"
                        value={checkoutMiscLabel}
                        onChange={(event) => setCheckoutMiscLabel(event.target.value)}
                        placeholder="Sleeves, snack, table fee"
                      />
                    </label>
                    <label htmlFor="checkout-misc-amount">
                      <span className="micro-label">Amount</span>
                      <input
                        id="checkout-misc-amount"
                        inputMode="decimal"
                        value={checkoutMiscAmountInput}
                        onBlur={() => {
                          const parsed = creditRedemptionInputToMinorUnits(checkoutMiscAmountInput)
                          if (parsed !== null) {
                            setCheckoutMiscAmountInput(creditRedemptionInputFromMinorUnits(parsed))
                          }
                        }}
                        onChange={(event) =>
                          setCheckoutMiscAmountInput(moneyInputDraftWithTwoDecimals(event.target.value))
                        }
                        placeholder="0.00"
                      />
                    </label>
                    <button type="button" onClick={handleAddCheckoutMiscLine}>
                      <Icon name="plus" />
                      <span>Add Misc</span>
                    </button>
                  </div>
                </div>

                <div className="checkout-cart-panel" aria-label="Sale cart">
                  <header>
                    <div>
                      <span className="micro-label">Sale cart</span>
                      <strong>{formatMoney(checkoutSubtotalMinorUnits, "USD")}</strong>
                      <small>
                        {checkoutCartLines.length} line(s)
                        {checkoutHeldLines.length > 0 ? `; ${checkoutHeldLines.length} held item warning` : ""}
                        {checkoutUnavailableLines.length > 0
                          ? `; ${checkoutUnavailableLines.length} unavailable`
                          : ""}
                      </small>
                    </div>
                    <button type="button" onClick={() => setCheckoutCartLines([])}>
                      <Icon name="trash" />
                      <span>Clear</span>
                    </button>
                  </header>
                  <div className="checkout-cart-lines">
                    {checkoutCartLines.length > 0 ? (
                      checkoutCartLines.map((line) => {
                        const matchingItem = inventoryItems.find(
                          (item) =>
                            item.publicId === line.inventoryPublicId ||
                            (!!line.barcode && item.barcode === line.barcode),
                        )
                        const lineStatus =
                          line.type === "misc"
                            ? "Manual charge"
                            : matchingItem
                              ? matchingItem.status === "reserved"
                                ? "Held in cart/order"
                                : statusLabel(matchingItem.status)
                              : "Not found"

                        return (
                          <article
                            className={`checkout-cart-line ${
                              matchingItem && !["available", "reserved"].includes(matchingItem.status)
                                ? "is-blocked"
                                : matchingItem?.status === "reserved"
                                  ? "is-warning"
                                  : ""
                            }`}
                            key={line.lineId}
                          >
                            <div>
                              <strong>{line.cardName}</strong>
                              <small>
                                {[line.setName, line.condition, line.location].filter(Boolean).join(" / ") ||
                                  "Misc sale"}
                              </small>
                              <small>{line.barcode || line.sourceOrderId || lineStatus}</small>
                            </div>
                            <div>
                              <span>{lineStatus}</span>
                              <strong>{formatMoney(line.totalMinorUnits, "USD")}</strong>
                              <button type="button" onClick={() => handleRemoveCheckoutLine(line.lineId)}>
                                Remove
                              </button>
                            </div>
                          </article>
                        )
                      })
                    ) : (
                      <p className="panel-empty">No items in this sale yet.</p>
                    )}
                  </div>

                  <div className="checkout-payment-panel" aria-label="Sale payment">
                    <div className="checkout-tender-mode" aria-label="Payment method">
                      <button
                        type="button"
                        className={checkoutTenderMode === "card" ? "is-active" : ""}
                        onClick={() => {
                          setCheckoutTenderMode("card")
                          setCheckoutCashReceivedInput("0.00")
                        }}
                      >
                        Pay with Card
                      </button>
                      <button
                        type="button"
                        className={checkoutTenderMode === "cash" ? "is-active" : ""}
                        onClick={() => {
                          setCheckoutTenderMode("cash")
                          setSquareReceiptReference("")
                          setSquareSoldOrderId("")
                        }}
                      >
                        Pay with Cash
                      </button>
                      <button
                        type="button"
                        className={checkoutTenderMode === "split" ? "is-active" : ""}
                        onClick={() => setCheckoutTenderMode("split")}
                      >
                        Split Cash/Card
                      </button>
                    </div>
                    <label htmlFor="checkout-credit">
                      <span className="micro-label">Use store credit</span>
                      <input
                        id="checkout-credit"
                        inputMode="decimal"
                        disabled={checkoutCustomerMode !== "customer"}
                        value={checkoutCustomerMode === "customer" ? creditRedemptionInput : "0.00"}
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
                      <small>
                        Local credit is never available online. Select a customer before using it.
                      </small>
                    </label>
                    {checkoutTenderMode === "cash" || checkoutTenderMode === "split" ? (
                      <label htmlFor="checkout-cash-received">
                        <span className="micro-label">
                          {checkoutTenderMode === "cash" ? "Cash received" : "Cash amount"}
                        </span>
                        <input
                          id="checkout-cash-received"
                          inputMode="decimal"
                          value={checkoutCashReceivedInput}
                          onBlur={() => {
                            const parsed = creditRedemptionInputToMinorUnits(checkoutCashReceivedInput)
                            if (parsed !== null) {
                              setCheckoutCashReceivedInput(creditRedemptionInputFromMinorUnits(parsed))
                            }
                          }}
                          onChange={(event) =>
                            setCheckoutCashReceivedInput(moneyInputDraftWithTwoDecimals(event.target.value))
                          }
                          placeholder="0.00"
                        />
                        {checkoutTenderIssue && !checkoutSquareReceiptIssue ? (
                          <small>{checkoutTenderIssue}</small>
                        ) : null}
                      </label>
                    ) : null}
                    <label htmlFor="checkout-square-reference">
                      <span className="micro-label">
                        {checkoutRequiresSquareReceipt ? "Card receipt" : "Card receipt"}
                      </span>
                      <input
                        id="checkout-square-reference"
                        disabled={!checkoutRequiresSquareReceipt}
                        value={squareReceiptReference}
                        onBlur={() => setSquareReceiptReference(checkoutCleanSquareReceiptReference)}
                        onChange={(event) => setSquareReceiptReference(event.target.value)}
                        placeholder={
                          checkoutRequiresSquareReceipt
                            ? "Receipt, ticket, or transaction ID"
                            : "Not needed for cash-only sales"
                        }
                      />
                      {checkoutSquareReceiptIssue ? <small>{checkoutSquareReceiptIssue}</small> : null}
                    </label>
                    <label htmlFor="checkout-square-order-id">
                      <span className="micro-label">Square order ID</span>
                      <input
                        id="checkout-square-order-id"
                        disabled={!checkoutRequiresSquareReceipt}
                        value={squareSoldOrderId}
                        onChange={(event) => setSquareSoldOrderId(event.target.value)}
                        placeholder={checkoutRequiresSquareReceipt ? "Optional" : "Not needed for cash-only sales"}
                      />
                    </label>
                    <label htmlFor="checkout-receipt-delivery">
                      <span className="micro-label">Receipt</span>
                      <select
                        id="checkout-receipt-delivery"
                        value={checkoutReceiptDelivery}
                        onChange={(event) =>
                          setCheckoutReceiptDelivery(event.target.value as CheckoutReceiptDelivery)
                        }
                      >
                        <option value="print">Print receipt</option>
                        <option value="email">Email receipt</option>
                        <option value="both">Print and email</option>
                      </select>
                    </label>
                    <label htmlFor="checkout-receipt-email">
                      <span className="micro-label">Receipt email</span>
                      <input
                        id="checkout-receipt-email"
                        inputMode="email"
                        value={checkoutReceiptEmail}
                        onChange={(event) => setCheckoutReceiptEmail(event.target.value)}
                        placeholder={activeCustomerProfile?.customer.email || "name@example.com"}
                      />
                      {checkoutReceiptEmailIssue ? <small>{checkoutReceiptEmailIssue}</small> : null}
                    </label>
                    <label className="square-confirmation-check" htmlFor="checkout-square-credit-confirmed">
                      <input
                        id="checkout-square-credit-confirmed"
                        type="checkbox"
                        disabled={checkoutCreditMinorUnits <= 0 || checkoutCardPaidMinorUnits <= 0}
                        checked={squareCashierConfirmed}
                        onChange={(event) => setSquareCashierConfirmed(event.target.checked)}
                      />
                      <span>
                        Store credit is reflected before collecting the card portion in Square.
                      </span>
                    </label>
                  </div>

                    <div className="checkout-total-panel" aria-label="Sale totals">
                    <div>
                      <span>Subtotal</span>
                      <strong>{formatMoney(checkoutSubtotalMinorUnits, "USD")}</strong>
                    </div>
                    <div>
                      <span>Store credit</span>
                      <strong>{formatMoney(checkoutCreditMinorUnits, "USD")}</strong>
                    </div>
                    <div>
                      <span>Cash</span>
                      <strong>{formatMoney(checkoutCashPaidMinorUnits, "USD")}</strong>
                    </div>
                    <div>
                      <span>Card</span>
                      <strong>{formatMoney(checkoutSquareDueMinorUnits, "USD")}</strong>
                    </div>
                    {checkoutTenderMode === "cash" ? (
                      <div>
                        <span>Change Due</span>
                        <strong>{formatMoney(checkoutChangeDueMinorUnits, "USD")}</strong>
                      </div>
                    ) : null}
                  </div>

                  <div className="square-terminal-panel checkout-square-reader" aria-label="Square Terminal reader connector">
                    <header>
                      <div>
                        <span className="micro-label">Square reader</span>
                        <strong>
                          {squareTerminalStatus?.status === "ok"
                            ? squareTerminalStatus.can_create_terminal_checkout
                              ? "Ready for reader payment"
                              : "Manual receipt mode"
                            : "Not checked"}
                        </strong>
                        <small>Reader setup stays on the LAN server. No Square secret is shown in the app.</small>
                      </div>
                      <button type="button" onClick={() => void handleRefreshSquareTerminalStatus()}>
                        <Icon name="sync" />
                        <span>{squareTerminalProbeStatus === "working" ? "Checking" : "Check Reader"}</span>
                      </button>
                    </header>
                    <div className="square-terminal-actions">
                      <button
                        type="button"
                        disabled={checkoutCardPaidMinorUnits <= 0}
                        onClick={() => void handleSendSquareTerminalCheckout()}
                      >
                        <Icon name="tag" />
                        <span>
                          {checkoutCardPaidMinorUnits > 0
                            ? `Send ${formatMoney(checkoutCardPaidMinorUnits, "USD")} to Square Reader`
                            : "No card balance"}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={!managerControlsUnlocked}
                        onClick={() => void handleCreateSquareTerminalDeviceCode()}
                      >
                        <Icon name="link" />
                        <span>Activate Reader</span>
                      </button>
                    </div>
                  </div>

                  {checkoutCompletedReceipt ? (
                    <div className="checkout-receipt-done" aria-label="Completed checkout receipt">
                      <div>
                        <span className="micro-label">Receipt saved</span>
                        <strong>{checkoutCompletedReceipt.square_receipt_reference}</strong>
                        <small>
                          {checkoutCompletedReceipt.customer_name || "Guest sale"} /{" "}
                          {formatMoney(checkoutCompletedReceipt.total_minor_units, checkoutCompletedReceipt.currency)}
                        </small>
                      </div>
                      <button type="button" onClick={() => window.print()}>
                        <Icon name="copy" />
                        <span>Print Receipt</span>
                      </button>
                      <button type="button" onClick={() => handlePrintCheckoutLabels()}>
                        <Icon name="tag" />
                        <span>Dymo Labels</span>
                      </button>
                    </div>
                  ) : null}

                  <button
                    className="checkout-complete-button"
                    type="button"
                    disabled={!checkoutCanComplete || !localSyncSessionToken}
                    onClick={() => void handleCompleteCheckoutSale()}
                  >
                    <Icon name="check" />
                    <span>Complete Sale</span>
                  </button>
                </div>
              </div>
            </section>

            <section
              className={`kiosk-panel fulfillment-panel ${
                activeKioskFulfillmentTicket || activeWebsiteFulfillmentTicket ? "is-picking" : ""
              }`}
              aria-label="Order fulfillment queue"
              ref={kioskPanelRef}
            >
              <div className="section-heading">
                <h2>
                  {activeKioskFulfillmentTicket || activeWebsiteFulfillmentTicket
                    ? "Pick Order"
                    : "Order Fulfillment"}
                </h2>
                <span>
                  {activeKioskFulfillmentTicket
                    ? activeKioskFulfillmentTicket.customerName
                    : activeWebsiteFulfillmentTicket
                      ? `Woo order #${activeWebsiteFulfillmentTicket.orderNumber}`
                      : `${activeKioskOrderTickets.length + activeWebsitePickupTickets.length} active pickup ticket${
                          activeKioskOrderTickets.length + activeWebsitePickupTickets.length === 1 ? "" : "s"
                        }`}
                </span>
              </div>
              {activeKioskFulfillmentTicket || activeWebsiteFulfillmentTicket ? (
                <div className="fulfillment-pick-screen">
                  <header>
                    <button type="button" onClick={() => setActiveFulfillmentTicket(null)}>
                      <span>Back to Queue</span>
                    </button>
                    <div>
                      <span className="micro-label">
                        {activeKioskFulfillmentTicket ? "Pay at store" : "Paid website pickup"}
                      </span>
                      <strong>
                        {activeKioskFulfillmentTicket?.customerName ??
                          activeWebsiteFulfillmentTicket?.customerName}
                      </strong>
                      <small>
                        {(activeKioskFulfillmentTicket ?? activeWebsiteFulfillmentTicket)?.totalLabel}
                        {" / "}
                        {(activeKioskFulfillmentTicket ?? activeWebsiteFulfillmentTicket)?.itemCount} card(s)
                      </small>
                    </div>
                    <div className="fulfillment-progress">
                      <span>Picked</span>
                      <strong>
                        {(activeKioskFulfillmentTicket ?? activeWebsiteFulfillmentTicket)?.pickedItemIds.length}
                        /{(activeKioskFulfillmentTicket ?? activeWebsiteFulfillmentTicket)?.itemCount}
                      </strong>
                    </div>
                  </header>

                  {activeKioskFulfillmentTicket ? (
                    <section className={`fulfillment-payment ${activeKioskFulfillmentTicket.paymentStatus}`}>
                      <div>
                        <span className="micro-label">Payment</span>
                        <strong>
                          {activeKioskFulfillmentTicket.paymentStatus === "paid"
                            ? "Paid in Square"
                            : "Payment due at counter"}
                        </strong>
                        <small>
                          {activeKioskFulfillmentTicket.paymentStatus === "paid"
                            ? `Receipt ${activeKioskFulfillmentTicket.squareReceiptReference}`
                            : "Complete the sale in Square, then confirm the receipt here."}
                        </small>
                      </div>
                      {activeKioskFulfillmentTicket.paymentStatus !== "paid" ? (
                        <>
                          <label>
                            <span>Square receipt / ticket</span>
                            <input
                              value={fulfillmentSquareReference}
                              onChange={(event) => setFulfillmentSquareReference(event.target.value)}
                              placeholder="Required"
                            />
                          </label>
                          <label>
                            <span>Square order ID</span>
                            <input
                              value={fulfillmentSquareOrderId}
                              onChange={(event) => setFulfillmentSquareOrderId(event.target.value)}
                              placeholder="Optional"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => void handleConfirmKioskPayment(activeKioskFulfillmentTicket)}
                          >
                            Confirm Paid in Square
                          </button>
                        </>
                      ) : null}
                    </section>
                  ) : null}

                  <div className="fulfillment-pick-list">
                    {(activeKioskFulfillmentTicket ?? activeWebsiteFulfillmentTicket)?.items.map((item) => {
                      const ticket = activeKioskFulfillmentTicket ?? activeWebsiteFulfillmentTicket
                      const checked = ticketItemIsPicked(ticket, item)
                      const inventoryItem = inventoryItems.find(
                        (candidate) =>
                          candidate.publicId === item.publicId ||
                          (item.pickIds ?? []).includes(candidate.publicId ?? "") ||
                          candidate.barcode === item.barcode,
                      )

                      return (
                        <label className={checked ? "is-picked" : ""} key={item.publicId}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              activeKioskFulfillmentTicket
                                ? void handleKioskPickToggle(activeKioskFulfillmentTicket, item.publicId)
                                : activeWebsiteFulfillmentTicket
                                  ? void handleWebsitePickToggle(
                                      activeWebsiteFulfillmentTicket,
                                      item.pickIds?.[0] ?? item.publicId,
                                    )
                                  : undefined
                            }
                          />
                          <span className="fulfillment-pick-check" aria-hidden="true">
                            {checked ? "OK" : ""}
                          </span>
                          <span className="fulfillment-pick-art" aria-hidden="true">
                            {inventoryItem?.imageUrl ? (
                              <img src={inventoryItem.imageUrl} alt="" loading="lazy" />
                            ) : (
                              <Icon name="card" />
                            )}
                          </span>
                          <span className="fulfillment-pick-copy">
                            <strong>{item.cardName}</strong>
                            <small>{item.setName} / {item.condition}</small>
                            <code>{item.barcode}</code>
                            {item.pickIds && item.pickIds.length > 1 ? (
                              <small>Pick refs {item.pickIds.join(" / ")}</small>
                            ) : null}
                          </span>
                          <span className="fulfillment-pick-location">
                            <small>Pull from</small>
                            <strong>{item.location}</strong>
                            <span>{item.price}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>

                  <footer>
                    <small>Every card must be checked before this order can be marked ready.</small>
                    <button
                      type="button"
                      disabled={
                        !(activeKioskFulfillmentTicket ?? activeWebsiteFulfillmentTicket)?.allItemsPicked ||
                        Boolean(
                          activeKioskFulfillmentTicket &&
                          activeKioskFulfillmentTicket.paymentStatus !== "paid",
                        )
                      }
                      onClick={() =>
                        activeKioskFulfillmentTicket
                          ? void handleKioskTicketStatus(activeKioskFulfillmentTicket.orderId, "ready")
                          : activeWebsiteFulfillmentTicket
                            ? void handleWebsitePickupTicketStatus(
                                activeWebsiteFulfillmentTicket.orderId,
                                "ready_for_pickup",
                              )
                            : undefined
                      }
                    >
                      Mark Ready for Pickup
                    </button>
                  </footer>
                </div>
              ) : null}
              <div className="kiosk-hero">
                <div>
                  <span className="micro-label">Employee pull queue</span>
                  <strong>Kiosk and local-pickup orders land here</strong>
                  <small>
                    Customer kiosk requests reserve the exact local card copy first. Paid website
                    local-pickup orders use WooCommerce payment and then feed this same pull process.
                  </small>
                </div>
                <div>
                  <span className="micro-label">Customer screen</span>
                  <strong>LAN middleman server</strong>
                  <small>
                    Open the customer kiosk at /?mode=kiosk on the kiosk machine. It only shows
                    available, kiosk-visible inventory.
                  </small>
                </div>
              </div>
              {!customerKioskMode ? (
                <div
                  className={`order-notification-sound-card ${
                    employeeOrderSoundSettings.enabled ? "is-on" : "is-off"
                  } ${orderNotificationSoundEnabled ? "is-ready" : "needs-enable"}`}
                  aria-label="Employee order sound notification"
                >
                  <div>
                    <span className="micro-label">Employee order sounds</span>
                    <strong>
                      {employeeOrderSoundSettings.enabled
                        ? orderNotificationSoundEnabled
                          ? "Sound is enabled on this station"
                          : "Click once to enable pickup alerts"
                        : "Sound alerts are off on this station"}
                    </strong>
                    <small>
                      {employeeOrderSoundSettings.soundFileName
                        ? `Using ${employeeOrderSoundSettings.soundFileName} saved in this app.`
                        : "Using the built-in alert tone until an MP3/MP4 is selected in this app."}
                      {orderNotificationIssue ? ` ${orderNotificationIssue}` : ""}
                    </small>
                  </div>
                  <div className="order-notification-actions">
                    <label className="order-notification-file">
                      <span>Choose MP3/MP4</span>
                      <input
                        type="file"
                        accept="audio/*,video/mp4,.mp3,.mp4,.m4a,.wav,.ogg"
                        onChange={(event) => void handleEmployeeOrderSoundFileChange(event)}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!employeeOrderSoundSettings.enabled}
                      onClick={() => void enableOrderNotificationSound()}
                    >
                      {orderNotificationSoundEnabled ? "Test Sound" : "Enable Sound"}
                    </button>
                    <button type="button" onClick={handleUseBuiltInOrderSound}>
                      Default Tone
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="kiosk-summary-strip" aria-label="Kiosk order readiness">
                <div>
                  <span className="micro-label">Queue source</span>
                  <strong>Local sync server</strong>
                </div>
                <div>
                  <span className="micro-label">Open tickets</span>
                  <strong>
                    {
                      activeKioskOrderTickets.length +
                      activeWebsitePickupTickets.length
                    } active
                  </strong>
                </div>
                <div>
                  <span className="micro-label">Website inventory authority</span>
                  <strong>
                    {localSyncStatus?.status === "ok" && localSyncStatus.wordpress_push_connected
                      ? "Connected"
                      : "Pending sync"}
                  </strong>
                </div>
              </div>
              <div className="kiosk-ticket-list" aria-label="Recent kiosk pickup tickets">
                <div className="kiosk-ticket-toolbar">
                  <div>
                    <span className="micro-label">Pickup queue</span>
                    <strong>Shared order fulfillment</strong>
                  </div>
                  <a className="kiosk-launch-link" href="?mode=kiosk" target="_blank" rel="noreferrer">
                    Customer Kiosk
                  </a>
                  <button type="button" onClick={() => void refreshKioskOrderTickets(true)}>
                    Refresh Fulfillment
                  </button>
                </div>
                {activeKioskOrderTickets.length > 0 ? (
                  <>
                    <div className="fulfillment-source-heading">
                      <span className="micro-label">Customer kiosk</span>
                      <strong>{activeKioskOrderTickets.length} active in-store request(s)</strong>
                    </div>
                    {activeKioskOrderTickets.map((ticket) => (
                      <article key={ticket.orderId}>
                        <div>
                          <strong>{ticket.orderId}</strong>
                          <small>
                            {ticket.customerName}; {ticket.itemCount} card(s); {ticket.totalLabel}
                          </small>
                          <span className={`kiosk-ticket-status ${ticket.status}`}>
                            Fulfillment status: {ticket.status}
                          </span>
                          <span className={`kiosk-payment-status ${ticket.paymentStatus}`}>
                            {ticket.paymentStatus === "paid" ? "Paid in Square" : "Pay at store"}
                          </span>
                        </div>
                        <div className="kiosk-ticket-detail">
                          <small>Queued {formatUtcLabel(ticket.createdAtUtc)}</small>
                          {ticket.holdExpiresAtUtc ? (
                            <small>
                              Hold expires {formatUtcLabel(ticket.holdExpiresAtUtc)}
                              {ticket.holdSecondsRemaining > 0
                                ? `; ${Math.ceil(ticket.holdSecondsRemaining / 60)} min left`
                                : ""}
                            </small>
                          ) : null}
                          <small>
                            Reservations: {ticket.reservationIds.slice(0, 3).join(", ")}
                            {ticket.reservationIds.length > 3 ? "..." : ""}
                          </small>
                          <div className="kiosk-ticket-items">
                            {ticket.items.slice(0, 4).map((item) => (
                              <small key={item.publicId}>
                                {item.cardName}; {item.condition}; {item.location}; {item.barcode};{" "}
                                {item.price}
                              </small>
                            ))}
                            {ticket.items.length > 4 ? (
                              <small>+{ticket.items.length - 4} more card(s)</small>
                            ) : null}
                          </div>
                          <div className="kiosk-ticket-actions" aria-label="Kiosk pull controls">
                            <button
                              type="button"
                              disabled={ticket.status === "completed"}
                              onClick={() => void handleOpenKioskPicking(ticket)}
                            >
                              {ticket.status === "pulling" ? "Continue Picking" : "Pick Order"}
                            </button>
                            <button
                              type="button"
                              disabled={
                                !ticket.allItemsPicked ||
                                ticket.paymentStatus !== "paid" ||
                                ticket.status === "ready" ||
                                ticket.status === "completed"
                              }
                              onClick={() => void handleKioskTicketStatus(ticket.orderId, "ready")}
                            >
                              Ready for Pickup
                            </button>
                            <button
                              type="button"
                              disabled={ticket.status === "completed"}
                              onClick={() => void handleKioskTicketStatus(ticket.orderId, "completed")}
                            >
                              Complete Pickup
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </>
                ) : (
                  <p className="panel-empty">No customer kiosk pickup tickets loaded from the LAN server.</p>
                )}
                {activeWebsitePickupTickets.length > 0 ? (
                  <>
                    <div className="fulfillment-source-heading">
                      <span className="micro-label">Website local pickup</span>
                      <strong>{activeWebsitePickupTickets.length} active paid WooCommerce pickup order(s)</strong>
                    </div>
                    {activeWebsitePickupTickets.map((ticket) => (
                      <article key={`website-${ticket.orderId}`}>
                        <div>
                          <strong>Woo order #{ticket.orderNumber}</strong>
                          <small>
                            {ticket.customerName}; {ticket.itemCount} item(s); {ticket.totalLabel};{" "}
                            {ticket.orderStatus}
                          </small>
                          <span className={`kiosk-ticket-status ${ticket.status}`}>
                            Fulfillment status: {ticket.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="kiosk-ticket-detail">
                          <small>Paid {ticket.paidAtUtc ? formatUtcLabel(ticket.paidAtUtc) : "before fulfillment"}</small>
                          <small>Queued {formatUtcLabel(ticket.createdAtUtc)}</small>
                          <small>
                            Reservations: {ticket.reservationIds.slice(0, 3).join(", ")}
                            {ticket.reservationIds.length > 3 ? "..." : ""}
                          </small>
                          <div className="kiosk-ticket-items">
                            {ticket.items.slice(0, 4).map((item) => (
                              <small key={`${ticket.orderId}-${item.publicId}`}>
                                {item.cardName}; {item.condition}; {item.barcode}; {item.price}
                              </small>
                            ))}
                            {ticket.items.length > 4 ? (
                              <small>+{ticket.items.length - 4} more item(s)</small>
                            ) : null}
                          </div>
                          <div className="kiosk-ticket-actions" aria-label="Website pickup pull controls">
                            <button
                              type="button"
                              disabled={ticket.status === "completed"}
                              onClick={() => void handleOpenWebsitePicking(ticket)}
                            >
                              {ticket.status === "pulling" ? "Continue Picking" : "Pick Order"}
                            </button>
                            <button
                              type="button"
                              disabled={
                                !ticket.allItemsPicked ||
                                ticket.status === "ready_for_pickup" ||
                                ticket.status === "completed"
                              }
                              onClick={() => void handleWebsitePickupTicketStatus(ticket.orderId, "ready_for_pickup")}
                            >
                              Ready for Pickup
                            </button>
                            <button
                              type="button"
                              disabled={ticket.status === "completed"}
                              onClick={() => void handleWebsitePickupTicketStatus(ticket.orderId, "completed")}
                            >
                              Complete Pickup
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </>
                ) : (
                  <p className="panel-empty">No paid website pickup orders loaded from WooCommerce.</p>
                )}
                <div className="fulfillment-source-heading">
                  <span className="micro-label">Completed pickup history</span>
                  <strong>
                    {completedKioskOrderTickets.length + completedWebsitePickupTickets.length} completed order(s)
                  </strong>
                </div>
                <label className="fulfillment-history-search" htmlFor="fulfillment-history-search">
                  <span className="micro-label">Search completed</span>
                  <input
                    id="fulfillment-history-search"
                    value={fulfillmentHistorySearch}
                    onChange={(event) => setFulfillmentHistorySearch(event.target.value)}
                    placeholder="Customer, order, receipt, barcode"
                  />
                </label>
                {searchableCompletedKioskOrderTickets.length + searchableCompletedWebsitePickupTickets.length > 0 ? (
                  <div className="completed-fulfillment-list" aria-label="Completed pickup order history">
                    {searchableCompletedKioskOrderTickets.map((ticket) => (
                      <article key={`completed-kiosk-${ticket.orderId}`}>
                        <div>
                          <strong>{ticket.customerName}</strong>
                          <small>
                            Kiosk order {ticket.orderId}; {ticket.itemCount} card(s); {ticket.totalLabel}
                          </small>
                          <span className={`kiosk-payment-status ${ticket.paymentStatus}`}>
                            {ticket.squareReceiptReference || "No receipt stored"}
                          </span>
                          <span className={`kiosk-ticket-status ${ticket.status}`}>
                            {ticket.status === "expired" ? "Hold expired" : "Completed"}
                          </span>
                        </div>
                        <div className="kiosk-ticket-items">
                          {ticket.items.slice(0, 4).map((item) => (
                            <small key={`completed-${ticket.orderId}-${item.publicId}`}>
                              {item.cardName}; {item.condition}; {item.barcode}
                            </small>
                          ))}
                        </div>
                      </article>
                    ))}
                    {searchableCompletedWebsitePickupTickets.map((ticket) => (
                      <article key={`completed-website-${ticket.orderId}`}>
                        <div>
                          <strong>{ticket.customerName}</strong>
                          <small>
                            Woo order #{ticket.orderNumber}; {ticket.itemCount} item(s); {ticket.totalLabel}
                          </small>
                          <span className="kiosk-ticket-status completed">
                            {ticket.orderStatus.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="kiosk-ticket-items">
                          {ticket.items.slice(0, 4).map((item) => (
                            <small key={`completed-woo-${ticket.orderId}-${item.publicId}`}>
                              {item.cardName}; {item.condition}; {item.barcode}
                            </small>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="panel-empty">No completed pickup orders match that search.</p>
                )}
              </div>
            </section>

            <section className="reports-panel" aria-label="Manager reports dashboard">
              <div className="section-heading section-heading-actions">
                <div>
                  <h2>Business Reports</h2>
                  <span>Manager graph dashboard and live website report pull</span>
                </div>
                <button type="button" onClick={() => void handleRefreshManagerReport()}>
                  <Icon name="sync" />
                  <span>Refresh Report</span>
                </button>
              </div>

              <div className="reports-filter-grid" aria-label="Report filters">
                <label htmlFor="manager-report-type">
                  <span className="micro-label">Report</span>
                  <select
                    id="manager-report-type"
                    value={managerReportKey}
                    onChange={(event) => setManagerReportKey(event.target.value as LocalSyncReportKey)}
                  >
                    {REPORT_OPTIONS.map((option) => (
                      <option value={option.key} key={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="manager-report-from">
                  <span className="micro-label">Date from</span>
                  <input
                    id="manager-report-from"
                    type="date"
                    value={managerReportDateFrom}
                    onChange={(event) => setManagerReportDateFrom(event.target.value)}
                  />
                </label>
                <label htmlFor="manager-report-to">
                  <span className="micro-label">Date to</span>
                  <input
                    id="manager-report-to"
                    type="date"
                    value={managerReportDateTo}
                    onChange={(event) => setManagerReportDateTo(event.target.value)}
                  />
                </label>
                <label htmlFor="manager-report-staff">
                  <span className="micro-label">Employee</span>
                  <select
                    id="manager-report-staff"
                    value={managerReportStaffFilter}
                    onChange={(event) => setManagerReportStaffFilter(event.target.value)}
                  >
                    <option value="">All employees</option>
                    {offlineUsers.map((user) => (
                      <option value={user.id} key={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="manager-report-channel">
                  <span className="micro-label">Channel</span>
                  <select
                    id="manager-report-channel"
                    value={managerReportChannelFilter}
                    onChange={(event) => setManagerReportChannelFilter(event.target.value)}
                  >
                    <option value="">All channels</option>
                    <option value="online">Online</option>
                    <option value="in_store">In store</option>
                    <option value="square_pos">Square POS</option>
                    <option value="kiosk">Kiosk pickup</option>
                  </select>
                </label>
                <label htmlFor="manager-report-game">
                  <span className="micro-label">Game</span>
                  <select
                    id="manager-report-game"
                    value={managerReportGameFilter}
                    onChange={(event) => setManagerReportGameFilter(event.target.value)}
                  >
                    <option value="">All games</option>
                    <option value="magicthegathering">MTG</option>
                    <option value="pokemon">Pokemon</option>
                    <option value="lorcana">Lorcana</option>
                    <option value="onepiece">One Piece</option>
                  </select>
                </label>
              </div>

              <div className={`reports-status-card ${managerReportStatus}`} aria-label="Report pull status">
                <span className="micro-label">Report pull</span>
                <strong>{managerReportStatus === "working" ? "Pulling live data" : "Ready for manager review"}</strong>
                <small>{managerReportDetail}</small>
              </div>

              <div className="reports-dashboard-grid" aria-label="Business report summary cards">
                {(activeManagerReportSummaryCards.length > 0
                  ? activeManagerReportSummaryCards
                  : REPORT_OPTIONS.slice(0, 3).map((option) => ({
                      label: option.label,
                      value: option.key === managerReportKey ? "Ready" : "Compare",
                      detail:
                        option.key === managerReportKey
                          ? `${option.focus}; selected for live pull through the LAN middleman.`
                          : option.focus,
                      tone: option.key === managerReportKey ? "ready" : "idle",
                    }))).map((card, cardIndex) => (
                      <article
                        className={`reports-summary-card reports-summary-card-${cardIndex + 1} ${card.tone ?? "ready"}`}
                        key={card.label}
                      >
                        <span className="micro-label">{card.label}</span>
                        <div className="reports-summary-value">
                          <strong>{card.value}</strong>
                          <span>{cardIndex === 0 ? "Primary" : cardIndex === 1 ? "Compare" : "Live"}</span>
                        </div>
                        <small>{card.detail}</small>
                        <div className="reports-summary-spark" aria-hidden="true">
                          {[66, 74, 58, 82, 69, 88].map((height, sparkIndex) => (
                            <i
                              key={`${card.label}-spark-${sparkIndex}`}
                              style={{ height: `${Math.max(22, height - cardIndex * 4 + sparkIndex * 2)}%` }}
                            />
                          ))}
                        </div>
                      </article>
                    ))}
              </div>

              <div className="reports-chart-grid" aria-label="Report comparison graphs">
                {activeManagerReportCharts.length > 0
                  ? activeManagerReportCharts.map((chart) => {
                      const max = managerReportChartMax(chart)
                      const chartMode =
                        chart.type.toLowerCase().includes("line") || chart.series.length > 1 ? "line" : "bar"
                      const ticks = managerReportChartTicks(max, chart.format)

                      return (
                        <article className={`reports-chart-card is-${chartMode}`} key={chart.key}>
                          <div className="reports-card-heading">
                            <div>
                              <span className="micro-label">{chart.type.replaceAll("_", " ")}</span>
                              <strong>{chart.label}</strong>
                            </div>
                            <small>{chart.labels.length ? `${chart.labels.length} points` : "Live report"}</small>
                          </div>
                          <div className="reports-chart-legend" aria-label={`${chart.label} legend`}>
                            {chart.series.map((series, seriesIndex) => (
                              <span key={`${chart.key}-${series.label}-legend`}>
                                <i className={`series-${seriesIndex % 4}`} />
                                {series.label}
                              </span>
                            ))}
                          </div>
                          <div className="reports-chart-shell">
                            <div className="reports-chart-axis" aria-hidden="true">
                              {ticks.map((tick) => (
                                <span key={`${chart.key}-${tick}`}>{tick}</span>
                              ))}
                            </div>
                            {chartMode === "line" ? (
                              <div className="reports-line-chart" aria-label={`${chart.label} line chart`}>
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
                                  <title>{chart.label}</title>
                                  {[0, 25, 50, 75, 100].map((y) => (
                                    <line key={`${chart.key}-grid-${y}`} x1="0" x2="100" y1={y} y2={y} />
                                  ))}
                                  {chart.series.map((series, seriesIndex) => (
                                    <polyline
                                      key={`${chart.key}-${series.label}-line`}
                                      className={`series-${seriesIndex % 4}`}
                                      points={managerReportChartPoints(series.values, max)}
                                    />
                                  ))}
                                </svg>
                                <div className="reports-chart-labels" aria-hidden="true">
                                  {chart.labels.map((label) => (
                                    <span key={`${chart.key}-${label}`}>{label}</span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="reports-column-chart" aria-label={`${chart.label} bar chart`}>
                                {chart.labels.map((label, labelIndex) => (
                                  <div className="reports-column-group" key={`${chart.key}-${label}`}>
                                    <div>
                                      {chart.series.map((series, seriesIndex) => {
                                        const value = series.values[labelIndex] ?? 0

                                        return (
                                          <span
                                            className={`series-${seriesIndex % 4}`}
                                            key={`${chart.key}-${series.label}-${label}`}
                                            style={{
                                              height: `${Math.max(8, Math.round((Math.abs(value) / max) * 100))}%`,
                                            }}
                                            title={`${label}: ${managerReportChartValue(value, chart.format)}`}
                                          >
                                            <b>{managerReportChartValue(value, chart.format)}</b>
                                          </span>
                                        )
                                      })}
                                    </div>
                                    <small>{label}</small>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <small>Live local report rows; WordPress report rows overlay when available.</small>
                        </article>
                      )
                    })
                  : (
                    <>
                      <article className="reports-chart-card">
                        <div className="reports-card-heading">
                          <div>
                            <span className="micro-label">Employee intake vs sales</span>
                            <strong>Staff productivity</strong>
                          </div>
                          <small>Preview</small>
                        </div>
                        <div className="reports-column-chart" aria-hidden="true">
                          {["Intake", "Trades", "Sales", "Credit"].map((label, index) => (
                            <div className="reports-column-group" key={label}>
                              <div>
                                <span className={`series-${index % 4}`} style={{ height: `${[82, 64, 48, 72][index]}%` }} />
                              </div>
                              <small>{label}</small>
                            </div>
                          ))}
                        </div>
                        <small>Filters: employee, date range, product type, game, source.</small>
                      </article>
                      <article className="reports-chart-card is-line">
                        <div className="reports-card-heading">
                          <div>
                            <span className="micro-label">Online vs in-store</span>
                            <strong>Channel trend</strong>
                          </div>
                          <small>Preview</small>
                        </div>
                        <div className="reports-line-chart" aria-hidden="true">
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                            {[0, 25, 50, 75, 100].map((y) => (
                              <line key={`preview-channel-${y}`} x1="0" x2="100" y1={y} y2={y} />
                            ))}
                            <polyline className="series-0" points="8,72 24,66 40,52 56,44 72,28 92,20" />
                            <polyline className="series-1" points="8,82 24,78 40,72 56,68 72,60 92,55" />
                          </svg>
                          <div className="reports-chart-labels">
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                              <span key={label}>{label}</span>
                            ))}
                          </div>
                        </div>
                        <small>Payment capture stays in Square; inventory authority stays with WordPress.</small>
                      </article>
                      <article className="reports-chart-card">
                        <div className="reports-card-heading">
                          <div>
                            <span className="micro-label">Trade-in cash vs credit</span>
                            <strong>Payout mix</strong>
                          </div>
                          <small>Preview</small>
                        </div>
                        <div className="reports-column-chart" aria-hidden="true">
                          {[
                            ["Cash", 43],
                            ["Credit", 68],
                            ["Converted", 58],
                          ].map(([label, height], index) => (
                            <div className="reports-column-group" key={label}>
                              <div>
                                <span className={`series-${index % 4}`} style={{ height: `${height}%` }} />
                              </div>
                              <small>{label}</small>
                            </div>
                          ))}
                        </div>
                        <small>Line values use stored final values, not recalculated prices.</small>
                      </article>
                    </>
                  )}
              </div>

              <div className="reports-kpi-grid" aria-label="Retail KPI cards">
                {(activeManagerReportKpiCards.length > 0
                  ? activeManagerReportKpiCards
                  : [
                      {
                        label: "Inventory health",
                        value: "Sell-through, aging, low stock, reserved stock",
                        detail: "Use for reorder and pricing decisions.",
                      },
                      {
                        label: "Customer credit",
                        value: "Credit given, credit used, balances, ledger exceptions",
                        detail: "Local-store credit remains separate from public coupons.",
                      },
                      {
                        label: "Operations audit",
                        value: "Overrides, receipts, ready-for-pickup, report exports",
                        detail: "Manager-only audit trail for accountability.",
                      },
                    ]).map((card) => (
                    <article className="reports-kpi-card" key={card.label}>
                      <span className="micro-label">{card.label}</span>
                      <strong>{card.value}</strong>
                      <small>{card.detail}</small>
                    </article>
                  ))}
              </div>

              {managerReportResult?.status === "ok" ? (
                <div className="connector-test-report pass" aria-label="Latest report payload">
                  <div className="connector-test-heading">
                    <span className="micro-label">Latest live result</span>
                    <strong>{managerReportResult.report.replace("_", " ")} report</strong>
                    <small>
                      {managerReportResult.rows.length} row(s); WordPress reports pull{" "}
                      {managerReportResult.wordpress_reports_pull_connected ? "connected" : "not connected"}; raw
                      credentials synced to app: no.
                    </small>
                  </div>
                  {managerReportResult.rows.length > 0 ? (
                    <div className="reports-row-preview" aria-label="Latest report row preview">
                      {managerReportResult.rows.slice(0, 6).map((row, rowIndex) => (
                        <article key={`report-row-${rowIndex}`}>
                          {Object.entries(row).slice(0, 5).map(([key, value]) => (
                            <span key={`${rowIndex}-${key}`}>
                              <small>{key.replaceAll("_", " ")}</small>
                              <strong>{String(value ?? "")}</strong>
                            </span>
                          ))}
                        </article>
                      ))}
                    </div>
                  ) : null}
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
              {localSyncStatus?.status === "ok" ? (
                <div className="lan-queue-detail-panel" aria-label="LAN pending operation details">
                  <header>
                    <div>
                      <span className="micro-label">LAN pending details</span>
                      <strong>{lanQueueSummaryTypeLabel}</strong>
                    </div>
                    <small>
                      Local-only rows: {localSyncStatus.queue_summary?.local_only_count ?? 0}; oldest{" "}
                      {localSyncStatus.queue_summary?.oldest_queued_at_utc
                        ? formatUtcLabel(localSyncStatus.queue_summary.oldest_queued_at_utc)
                        : "none"}.
                    </small>
                  </header>
                  {lanQueueSummaryItems.length > 0 ? (
                    <div className="lan-queue-detail-list">
                      {lanQueueSummaryItems.map((operation) => (
                        <article key={operation.operation_id}>
                          <div>
                            <span>{formatQueueOperationType(operation.operation_type)}</span>
                            <strong>{formatQueueOperationType(operation.sync_intent || operation.operation_type)}</strong>
                            <small>
                              {operation.customer_public_id
                                ? `Customer ${operation.customer_public_id}`
                                : operation.entity_id}
                              {operation.wordpress_customer_id > 0
                                ? ` / WP #${operation.wordpress_customer_id}`
                                : ""}
                            </small>
                          </div>
                          <div>
                            <strong>
                              {operation.amount_minor_units > 0
                                ? formatMoney(operation.amount_minor_units, "USD")
                                : operation.reservation_count > 0
                                  ? `${operation.reservation_count} hold(s)`
                                  : "Pending"}
                            </strong>
                            <small>
                              {operation.ledger_type
                                ? formatQueueOperationType(operation.ledger_type)
                                : operation.square_receipt_present
                                  ? "Square ref attached"
                                  : formatUtcLabel(operation.queued_at_utc)}
                            </small>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="panel-empty">No pending LAN rows. Local-only settings rows are not pushed.</p>
                  )}
                </div>
              ) : null}
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
                onClick={() => void handleStageInventoryUpdate("Queue update saved")}
              >
                <Icon name="plus" />
                  <span>Save New Update</span>
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
              <div className="event-create-card" aria-label="Create store event">
                <header>
                  <div>
                    <span className="micro-label">Create event</span>
                    <strong>WooCommerce registration product</strong>
                  </div>
                  <button type="button" onClick={() => void handleCreateEvent()}>
                    <Icon name="plus" />
                    <span>{newEventRecurrenceFrequency === "none" ? "Create Event" : "Create Events"}</span>
                  </button>
                </header>
                <div className="event-create-grid">
                  <label htmlFor="event-create-title">
                    <span className="micro-label">Event name</span>
                    <input
                      id="event-create-title"
                      value={newEventTitle}
                      onChange={(event) => setNewEventTitle(event.target.value)}
                      placeholder="Friday Commander Night"
                    />
                  </label>
                  <label htmlFor="event-create-starts-at">
                    <span className="micro-label">Starts</span>
                    <input
                      id="event-create-starts-at"
                      type="datetime-local"
                      value={newEventStartsAt}
                      onChange={(event) => setNewEventStartsAt(event.target.value)}
                    />
                  </label>
                  <label htmlFor="event-create-game">
                    <span className="micro-label">Game</span>
                    <select
                      id="event-create-game"
                      value={newEventGame}
                      onChange={(event) => setNewEventGame(event.target.value)}
                    >
                      <option value="pokemon">Pokemon</option>
                      <option value="magicthegathering">MTG</option>
                      <option value="lorcana">Lorcana</option>
                      <option value="onepiece">One Piece</option>
                    </select>
                  </label>
                  <label htmlFor="event-create-type">
                    <span className="micro-label">Type</span>
                    <input
                      id="event-create-type"
                      value={newEventType}
                      onChange={(event) => setNewEventType(event.target.value)}
                      placeholder="league, commander, prerelease"
                    />
                  </label>
                  <label htmlFor="event-create-capacity">
                    <span className="micro-label">Slots</span>
                    <input
                      id="event-create-capacity"
                      inputMode="numeric"
                      min="1"
                      type="number"
                      value={newEventCapacity}
                      onChange={(event) => setNewEventCapacity(event.target.value)}
                    />
                  </label>
                  <label htmlFor="event-create-price">
                    <span className="micro-label">Price</span>
                    <input
                      id="event-create-price"
                      inputMode="decimal"
                      value={newEventPrice}
                      onBlur={() =>
                        setNewEventPrice((eventPriceInputToMinorUnits(newEventPrice) / 100).toFixed(2))
                      }
                      onChange={(event) => setNewEventPrice(event.target.value)}
                      placeholder="0.00"
                    />
                  </label>
                  <label htmlFor="event-create-recurrence">
                    <span className="micro-label">Repeat</span>
                    <select
                      id="event-create-recurrence"
                      value={newEventRecurrenceFrequency}
                      onChange={(event) =>
                        setNewEventRecurrenceFrequency(
                          event.target.value as "none" | "daily" | "weekly" | "monthly",
                        )
                      }
                    >
                      <option value="none">No repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                  <label htmlFor="event-create-recurrence-count">
                    <span className="micro-label">Number of dates</span>
                    <input
                      id="event-create-recurrence-count"
                      inputMode="numeric"
                      min="1"
                      max="52"
                      type="number"
                      disabled={newEventRecurrenceFrequency === "none"}
                      value={newEventRecurrenceCount}
                      onChange={(event) => setNewEventRecurrenceCount(event.target.value)}
                    />
                  </label>
                  <label htmlFor="event-create-close-value">
                    <span className="micro-label">Registration closes</span>
                    <input
                      id="event-create-close-value"
                      inputMode="numeric"
                      min="0"
                      type="number"
                      value={newEventCloseValue}
                      onChange={(event) => setNewEventCloseValue(event.target.value)}
                    />
                  </label>
                  <label htmlFor="event-create-close-unit">
                    <span className="micro-label">Before start</span>
                    <select
                      id="event-create-close-unit"
                      value={newEventCloseUnit}
                      onChange={(event) =>
                        setNewEventCloseUnit(event.target.value as "minutes" | "hours" | "days")
                      }
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </label>
                  <label htmlFor="event-create-location">
                    <span className="micro-label">Location</span>
                    <input
                      id="event-create-location"
                      value={newEventLocation}
                      onChange={(event) => setNewEventLocation(event.target.value)}
                      placeholder="Event Room"
                    />
                  </label>
                  <label className="event-create-description" htmlFor="event-create-description">
                    <span className="micro-label">Rules / notes</span>
                    <textarea
                      id="event-create-description"
                      value={newEventDescription}
                      onChange={(event) => setNewEventDescription(event.target.value)}
                      placeholder="Registration notes, round structure, prize notes"
                    />
                  </label>
                </div>
              </div>
              <div className="event-list" aria-label="Cached event snapshots">
                {visibleEventSnapshots.map((event) => {
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
                        <small>
                          {gameDisplayLabel(event.game)} · {event.eventType || "store event"} ·{" "}
                          {formatMoney(event.entryFeeMinorUnits, "USD")}
                          {event.woocommerceProductId > 0
                            ? ` · Woo product #${event.woocommerceProductId}`
                            : " · Woo product pending"}
                        </small>
                      </button>
                      <button
                        className="event-row-action"
                        type="button"
                        disabled={registrationBlocked}
                        onClick={() => void handleEventRegistration(event)}
                      >
                        {event.registrationStatus === "waitlist" ? "Add to Waitlist" : "Register Player"}
                      </button>
                    </article>
                  )
                })}
                {visibleEventSnapshots.length === 0 ? (
                  <div className="event-empty-state" aria-label="No events available">
                    <strong>No events loaded yet</strong>
                    <small>
                      Create an event above or refresh LAN events to pull active WooCommerce registration products.
                    </small>
                    <button type="button" onClick={() => void refreshLanEventSnapshots({ announce: true })}>
                      <Icon name="sync" />
                      <span>Refresh Events</span>
                    </button>
                  </div>
                ) : null}
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
                  <div>
                    <span className="micro-label">Registration</span>
                    <strong>{formatMoney(selectedEvent.entryFeeMinorUnits, "USD")}</strong>
                    <small>
                      Closes {formatUtcLabel(selectedEvent.registrationDeadlineUtc)}
                      {selectedEvent.woocommerceProductId > 0
                        ? `; Woo product #${selectedEvent.woocommerceProductId}`
                        : "; Woo product pending"}
                    </small>
                  </div>
                  <button type="button" onClick={focusEventCheckinPanel}>
                    <Icon name="check" />
                    <span>Go To Check-In</span>
                  </button>
                  <div className="event-offline-fields" aria-label="Event registration details">
                    <label htmlFor="event-registrant-first-name">
                      <span className="micro-label">First name</span>
                      <input
                        id="event-registrant-first-name"
                        value={eventRegistrantFirstName}
                        onChange={(event) => setEventRegistrantFirstName(event.target.value)}
                        placeholder="First name"
                      />
                    </label>
                    <label htmlFor="event-registrant-last-name">
                      <span className="micro-label">Last name</span>
                      <input
                        id="event-registrant-last-name"
                        value={eventRegistrantLastName}
                        onChange={(event) => setEventRegistrantLastName(event.target.value)}
                        placeholder="Last name"
                      />
                    </label>
                    <label htmlFor="event-registrant-email">
                      <span className="micro-label">Email</span>
                      <input
                        id="event-registrant-email"
                        autoComplete="email"
                        inputMode="email"
                        value={eventRegistrantEmail}
                        onBlur={() => setEventRegistrantEmail(eventRegistrantEmail.trim().toLowerCase())}
                        onChange={(event) => setEventRegistrantEmail(event.target.value)}
                        placeholder="customer@example.com"
                      />
                    </label>
                    <label htmlFor="event-registrant-phone">
                      <span className="micro-label">Phone</span>
                      <input
                        id="event-registrant-phone"
                        autoComplete="tel"
                        inputMode="tel"
                        value={eventRegistrantPhone}
                        onChange={(event) => setEventRegistrantPhone(event.target.value)}
                        placeholder="Optional"
                      />
                    </label>
                    <label htmlFor="event-attendee-label">
                      <span className="micro-label">Check-in name</span>
                      <input
                        id="event-attendee-label"
                        value={eventAttendeeLabel}
                        onBlur={() =>
                          setEventAttendeeLabel(cleanOfflineEventAttendeeLabel(eventAttendeeLabel))
                        }
                        onChange={(event) => setEventAttendeeLabel(event.target.value)}
                        placeholder="Name used for manual check-in"
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
                  <div
                    className="event-checkin-panel"
                    aria-label="Event check-in search"
                    ref={eventCheckinPanelRef}
                  >
                    <div>
                      <span className="micro-label">Player check-in</span>
                      <strong>Search name, phone, or registration</strong>
                      <small>
                        Pick a local registration below, or paste a website registration ID into the check-in field.
                      </small>
                    </div>
                    <label htmlFor="event-checkin-search">
                      <span className="micro-label">Search player</span>
                      <input
                        id="event-checkin-search"
                        value={eventCheckinSearch}
                        onChange={(event) => setEventCheckinSearch(event.target.value)}
                        placeholder="Name, phone, email, or registration ID"
                      />
                    </label>
                    <div className="event-checkin-results" aria-label="Event check-in results">
                      {eventCheckinMatches.length > 0 ? (
                        eventCheckinMatches.map((entry) => (
                          <button
                            key={entry.operationId}
                            type="button"
                            onClick={() => {
                              setSelectedEventId(entry.eventId)
                              setEventAttendeeLabel(entry.attendeeLabel)
                              setEventCheckinLookup(
                                entry.registrationPublicId ||
                                  cleanOfflineEventRegistrationPublicId("", entry.eventId),
                              )
                              setEventCheckinSearch(entry.attendeeLabel)
                            }}
                          >
                            <strong>{entry.attendeeLabel}</strong>
                            <small>{entry.title}</small>
                            <small>{entry.registrationPublicId || "Local registration queued"}</small>
                          </button>
                        ))
                      ) : (
                        <p className="panel-empty">No local registrations match this event yet.</p>
                      )}
                    </div>
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
                        ? "Add to Waitlist"
                        : "Register Player"}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={selectedEvent.registrationStatus === "closed"}
                    onClick={() => void handleEventCheckin(selectedEvent)}
                  >
                    <Icon name="check" />
                    <span>Check In Player</span>
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
                    disabled={!["manager", "owner"].includes(sessionRole)}
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
              <div className="square-pos-counts" aria-label="Square POS count reconciliation">
                <div className="square-pos-counts__heading">
                  <div>
                    <span className="micro-label">Square count comparison</span>
                    <strong>
                      {squareCountSummary
                        ? `${squareCountSummary.matched_count} matched / ${squareCountSummary.mismatched_count} mismatch`
                        : "Ready for Square counts"}
                    </strong>
                    <small>Provider inventory writes stay deferred; website inventory remains authoritative.</small>
                  </div>
                  <button
                    className="secondary-command compact-command"
                    type="button"
                    disabled={!["manager", "owner"].includes(sessionRole)}
                    onClick={() => void handleReconcileSquarePosCounts()}
                  >
                    <Icon name="check" />
                    <span>Compare Counts</span>
                  </button>
                </div>
                <label htmlFor="square-counts-json">
                  <span className="micro-label">Square inventory counts JSON</span>
                  <textarea
                    id="square-counts-json"
                    value={squareCountsInput}
                    onChange={(event) => setSquareCountsInput(event.target.value)}
                    spellCheck={false}
                    rows={5}
                  />
                </label>
                {squareCountSummary ? (
                  <>
                    <div className="square-pos-counts__metrics">
                      <span>
                        <strong>{squareCountSummary.matched_count}</strong>
                        matched
                      </span>
                      <span>
                        <strong>{squareCountSummary.mismatched_count}</strong>
                        mismatched
                      </span>
                      <span>
                        <strong>{squareCountSummary.missing_square_count}</strong>
                        missing
                      </span>
                      <span>
                        <strong>{squareCountSummary.unexpected_square_count}</strong>
                        unexpected
                      </span>
                    </div>
                    {squareCountNextActions.length ? (
                      <ul className="square-pos-next-actions" aria-label="Square count next actions">
                        {squareCountNextActions.map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="square-pos-plan__columns">
                      <div>
                        <span className="micro-label">Count comparison</span>
                        {squareCountComparisons.length ? (
                          <ul className="square-pos-review-list">
                            {squareCountComparisons.slice(0, 5).map((row) => (
                              <li key={`${row.public_id}-${row.square_catalog_variation_id}`}>
                                <strong>{row.card_name}</strong>
                                <span>
                                  {row.issue_label}; expected {row.expected_serialized_quantity}; actual{" "}
                                  {row.actual_square_quantity ?? "missing"}
                                </span>
                                <small>{row.next_action}</small>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <small>No mapped Square rows were compared.</small>
                        )}
                      </div>
                      <div>
                        <span className="micro-label">Unexpected Square counts</span>
                        {squareUnexpectedCounts.length ? (
                          <ul className="square-pos-review-list">
                            {squareUnexpectedCounts.slice(0, 5).map((row) => (
                              <li key={`${row.catalogObjectId}-${row.locationId}`}>
                                <strong>{row.catalogObjectId}</strong>
                                <span>
                                  {row.locationId}; qty {row.quantity}; {row.state}
                                </span>
                                <small>Map this Square variation to website inventory or review in Square.</small>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <small>No unexpected Square counts in the latest comparison.</small>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
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
                    disabled={!["manager", "owner"].includes(sessionRole)}
                    value={sessionTimeoutMinutes}
                    onChange={(event) => {
                      const nextValue = Number.parseInt(event.target.value, 10)

                      if (Number.isFinite(nextValue)) {
                        setSessionTimeoutMinutes(Math.min(240, Math.max(5, nextValue)))
                      }
                    }}
                  />
                </label>
                <label htmlFor="credit-approval-threshold">
                  <span className="micro-label">Employee credit limit</span>
                  <input
                    id="credit-approval-threshold"
                    inputMode="decimal"
                    disabled={!managerControlsUnlocked}
                    value={creditApprovalThresholdInput}
                    onChange={(event) =>
                      setCreditApprovalThresholdInput(moneyInputDraftWithTwoDecimals(event.target.value))
                    }
                  />
                </label>
                <button
                  type="button"
                  disabled={!managerControlsUnlocked}
                  onClick={() => void handleSaveCreditApprovalThreshold()}
                >
                  <Icon name="check" />
                  <span>Save Credit Limit</span>
                </button>
                <button
                  type="button"
                  disabled={!["manager", "owner"].includes(sessionRole)}
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
                          {user.role === "owner" ? "Owner PIN" : user.role === "manager" ? "Manager PIN" : "Employee PIN"}{" "}
                          {user.pin ? "*".repeat(user.pin.length) : "configured on LAN server"}
                        </small>
                      </div>
                      <label>
                        <span className="micro-label">Role</span>
                        <select
                          disabled={!managerControlsUnlocked || (user.role === "owner" && !ownerControlsUnlocked)}
                          value={user.role}
                          onChange={(event) =>
                            void handleOfflineUserRoleChange(
                              user.id,
                              event.target.value as Exclude<AppSessionRole, "locked">,
                            )
                          }
                        >
                          <option value="staff">Employee</option>
                          <option value="manager">Manager</option>
                          {ownerControlsUnlocked || user.role === "owner" ? <option value="owner">Owner</option> : null}
                        </select>
                      </label>
                      <div className="access-chip-grid" aria-label={`${user.name} access`}>
                        {ACCESS_SECTIONS.map((section) => (
                          <label className="access-chip" key={section}>
                            <input
                              type="checkbox"
                              disabled={!managerControlsUnlocked || ["manager", "owner"].includes(user.role)}
                              checked={["manager", "owner"].includes(user.role) || user.access.includes(section)}
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
                          ["manager", "owner"].includes(nextRole)
                            ? [...ACCESS_SECTIONS]
                            : ["Inventory", "Kiosk", "Queue"],
                        )
                      }}
                    >
                      <option value="staff">Employee</option>
                      <option value="manager">Manager</option>
                      {ownerControlsUnlocked ? <option value="owner">Owner</option> : null}
                    </select>
                  </label>
                  <div className="access-chip-grid" aria-label="New user allowed workspaces">
                    {ACCESS_SECTIONS.map((section) => (
                      <label className="access-chip" key={section}>
                        <input
                          type="checkbox"
                          disabled={!managerControlsUnlocked || ["manager", "owner"].includes(newUserRole)}
                          checked={["manager", "owner"].includes(newUserRole) || newUserAccess.includes(section)}
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
                    <small>Production sync with inventory checks before each sale.</small>
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
                <button
                  type="button"
                  disabled={!managerControlsUnlocked || localSyncDiscovery.status === "searching"}
                  onClick={() => void handleDiscoverLocalSyncServers()}
                >
                  <Icon name="search" />
                  <span>
                    {localSyncDiscovery.status === "searching"
                      ? "Finding Server"
                      : "Find Local Server"}
                  </span>
                </button>
                <button type="button" disabled={!managerControlsUnlocked} onClick={() => void handleSaveConnectorDraft()}>
                  <Icon name="check" />
                  <span>Save Website Connection</span>
                </button>
              </div>
              <div className="local-discovery-panel" aria-label="Local sync server discovery">
                <header>
                  <div>
                    <span className="micro-label">Middleman discovery</span>
                    <strong>{localSyncDiscovery.status}</strong>
                  </div>
                  <small>Manual URL setup remains available.</small>
                </header>
                <p>{localSyncDiscovery.detail}</p>
                {localSyncDiscovery.servers.length > 0 ? (
                  <div className="local-discovery-list">
                    {localSyncDiscovery.servers.map((server) => (
                      <article key={server.server_url}>
                        <div>
                          <strong>{server.hostname}</strong>
                          <span>{server.server_url}</span>
                          <small>{server.website_url || "Website URL not reported"}</small>
                        </div>
                        <button
                          type="button"
                          disabled={!managerControlsUnlocked}
                          onClick={() => handleApplyDiscoveredLocalSyncServer(server)}
                        >
                          <Icon name="check" />
                          <span>Use</span>
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
                <small>
                  Raw credentials returned: {localSyncDiscovery.rawCredentialsReturned ? "yes" : "no"};
                  credentials synced to app: {localSyncDiscovery.credentialsSyncedToApp ? "yes" : "no"}.
                </small>
              </div>
            </section>

            <section className="credit-panel" aria-label="Customer credit snapshot" ref={creditPanelRef}>
              <div className="customer-counter-hero">
                <span className="micro-label">{customerCredit.label}</span>
                <h2>
                  {formatMoney(
                    displayedCreditMinorUnits,
                    customerCredit.currency,
                  )}
                </h2>
              </div>
              <p>{customerCredit.note}</p>
              <div className="customer-profile-card" aria-label="Customer profile lookup">
                <header>
                  <div>
                    <span className="micro-label">Customer profile</span>
                    <strong>Search by name, email, phone, or customer ID</strong>
                    <small>{customerProfileDetail}</small>
                  </div>
                  <button
                    type="button"
                    disabled={!localSyncSessionToken || customerProfileStatus === "working"}
                    onClick={() => void refreshCustomerProfile()}
                  >
                    <Icon name="sync" />
                    <span>{customerProfileStatus === "working" ? "Loading" : "Refresh Profile"}</span>
                  </button>
                </header>
                <div className="customer-profile-search">
                  <label htmlFor="customer-profile-search">
                    <span className="micro-label">Lookup</span>
                    <input
                      id="customer-profile-search"
                      value={customerSearchQuery}
                      onChange={(event) => setCustomerSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          void handleCustomerProfileSearch()
                        }
                      }}
                      placeholder="Morgan, name@example.com, 555-0100"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={customerProfileStatus === "working"}
                    onClick={() => void handleCustomerProfileSearch()}
                  >
                    <Icon name="search" />
                    <span>Search Customers</span>
                  </button>
                </div>
                {customerSearchResults.length > 0 ? (
                  <div className="customer-profile-results" aria-label="Customer search results">
                    {customerSearchResults.slice(0, 8).map((customer) => (
                      <button
                        type="button"
                        key={customer.customer_public_id}
                        className={
                          customer.customer_public_id === customerCredit.customerPublicId ? "is-selected" : ""
                        }
                        onClick={() => void handleUseCustomerProfile(customer)}
                      >
                        <strong>{customer.display_name}</strong>
                        <span>{customer.customer_lookup || customer.email || customer.customer_public_id}</span>
                        <small>{formatMoney(customer.credit.balance_minor_units, customer.credit.currency)} credit</small>
                      </button>
                    ))}
                  </div>
                ) : null}
                {activeCustomerProfileSummary ? (
                  <div className="customer-profile-summary" aria-label="Selected customer profile summary">
                    <div>
                      <span className="micro-label">Saved trade-ins</span>
                      <strong>{activeCustomerProfileSummary.trade_in_count}</strong>
                      <small>
                        Draft {activeCustomerProfileSummary.status_counts.draft ?? 0}; rejected{" "}
                        {activeCustomerProfileSummary.status_counts.rejected ?? 0}; approved{" "}
                        {activeCustomerProfileSummary.status_counts.approved ?? 0}
                      </small>
                    </div>
                    <div>
                      <span className="micro-label">Credit from trades</span>
                      <strong>{formatMoney(activeCustomerProfileSummary.credit_total_minor_units, "USD")}</strong>
                      <small>Applied automatically when a trade-in is approved.</small>
                    </div>
                    <div>
                      <span className="micro-label">Cash payouts</span>
                      <strong>{formatMoney(activeCustomerProfileSummary.cash_total_minor_units, "USD")}</strong>
                      <small>Tracked for reports and transaction lookup.</small>
                    </div>
                    <div>
                      <span className="micro-label">Kiosk orders</span>
                      <strong>{activeCustomerProfileSummary.kiosk_order_count ?? 0}</strong>
                      <small>
                        Completed {activeCustomerProfileSummary.completed_kiosk_order_count ?? 0}; tied to local pickup
                        history.
                      </small>
                    </div>
                    <div>
                      <span className="micro-label">Sale receipts</span>
                      <strong>{activeCustomerProfileSummary.checkout_transaction_count ?? 0}</strong>
                      <small>Saved Square, cash, and kiosk sale history.</small>
                    </div>
                  </div>
                ) : null}
                {activeCustomerTradeInOrders.length > 0 ? (
                  <div className="customer-profile-trades" aria-label="Customer saved trade-ins">
                    <span className="micro-label">Trade-in records on this profile</span>
                    {activeCustomerTradeInOrders.slice(0, 6).map((order) => {
                      const canReopen =
                        order.status === "draft" || order.status === "review" || order.status === "rejected"

                      return (
                        <article key={order.order_id}>
                          <div>
                            <strong>{order.order_id}</strong>
                            <small>
                              {order.status}; {order.item_count} item(s); {formatUtcLabel(order.updated_at_utc)}
                            </small>
                            <small>
                              Credit {formatMoney(order.credit_total_minor_units, order.currency)} / cash{" "}
                              {formatMoney(order.cash_total_minor_units, order.currency)}
                            </small>
                          </div>
                          <button
                            type="button"
                            disabled={!canReopen}
                            onClick={() => handleLoadTradeInOrder(order)}
                          >
                            {order.status === "rejected" ? "Reopen" : canReopen ? "Edit" : "Locked"}
                          </button>
                        </article>
                      )
                    })}
                  </div>
                ) : null}
                {customerProfileKioskOrderTickets.length > 0 ? (
                  <div className="customer-profile-trades" aria-label="Customer kiosk order history">
                    <span className="micro-label">Kiosk orders on this profile</span>
                    {customerProfileKioskOrderTickets.slice(0, 6).map((ticket) => (
                      <article key={ticket.orderId}>
                        <div>
                          <strong>{ticket.orderId}</strong>
                          <small>
                            {ticket.status}; {ticket.itemCount} card(s); {ticket.totalLabel}
                          </small>
                          <small>
                            {ticket.squareReceiptReference || "No Square receipt stored"};{" "}
                            {formatUtcLabel(ticket.createdAtUtc)}
                          </small>
                        </div>
                        <button type="button" onClick={() => handleUseCustomerKioskOrder(ticket)}>
                          Use
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
                {customerProfileCheckoutTransactions.length > 0 ? (
                  <div className="customer-profile-trades" aria-label="Customer sale receipt history">
                    <span className="micro-label">Sale receipts on this profile</span>
                    {customerProfileCheckoutTransactions.slice(0, 8).map((transaction) => (
                      <article key={transaction.transaction_id}>
                        <div>
                          <strong>{transaction.square_receipt_reference || transaction.transaction_id}</strong>
                          <small>
                            {transaction.source.replaceAll("_", " ")}; {transaction.item_count} item(s);{" "}
                            {formatMoney(transaction.total_minor_units, transaction.currency)}
                          </small>
                          <small>
                            {transaction.staff_user_name || transaction.staff_user_id || "Staff pending"};{" "}
                            {formatUtcLabel(transaction.created_at_utc)}
                          </small>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutCustomerMode(transaction.guest_checkout ? "guest" : "customer")
                            setSquareReceiptReference(transaction.square_receipt_reference)
                            setCheckoutCompletedReceipt(transaction)
                            setActiveSection("Checkout")
                          }}
                        >
                          Open
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="customer-selected-profile" aria-label="Selected customer account">
                <div>
                  <span className="micro-label">Selected customer</span>
                  <strong>{activeCustomerName}</strong>
                  <small>{customerCredit.customerLookup ?? `Customer #${customerCredit.customerId}`}</small>
                </div>
                <div>
                  <span className="micro-label">Credit available</span>
                  <strong>{formatMoney(displayedCreditMinorUnits, customerCredit.currency)}</strong>
                  <small>
                    In-progress sale hold {formatMoney(pendingCreditMinorUnits, customerCredit.currency)}.
                  </small>
                </div>
              </div>
              <div className="customer-credit-issue" aria-label="Adjust local store credit">
                <div>
                  <span className="micro-label">Adjust credit</span>
                  <strong>{creditAdjustmentIssue ? "Amount needed" : formatMoney(creditAdjustmentMinorUnits ?? 0, customerCredit.currency)}</strong>
                  <small>Use a minus amount to remove credit. Removal requires a reason.</small>
                </div>
                <label htmlFor="customer-credit-issue-amount">
                  <span className="micro-label">Amount</span>
                  <input
                    id="customer-credit-issue-amount"
                    inputMode="decimal"
                    value={creditAdjustmentInput}
                    onBlur={() => {
                      const parsed = creditRedemptionInputToMinorUnits(creditAdjustmentInput)
                      if (parsed !== null) {
                        setCreditAdjustmentInput(signedMoneyInputFromMinorUnits(parsed))
                      }
                    }}
                    onChange={(event) =>
                      setCreditAdjustmentInput(moneyInputDraftWithTwoDecimals(event.target.value))
                    }
                    placeholder="0.00"
                  />
                </label>
                <label htmlFor="customer-credit-issue-reason">
                  <span className="micro-label">Reason</span>
                  <input
                    id="customer-credit-issue-reason"
                    value={creditAdjustmentReason}
                    onChange={(event) => setCreditAdjustmentReason(event.target.value)}
                    placeholder="Trade correction, goodwill, event prize"
                  />
                </label>
                <button
                  type="button"
                  disabled={!creditAdjustmentCanSubmit}
                  onClick={() => void handleCreditAdjustment()}
                >
                  <Icon name={creditAdjustmentMinorUnits !== null && creditAdjustmentMinorUnits < 0 ? "minus" : "plus"} />
                  <span>Save Credit Adjustment</span>
                </button>
              </div>
              <div className="customer-create-request" aria-label="Create local customer request">
                <div>
                  <span className="micro-label">New customer</span>
                  <strong>{showNewCustomerForm ? "Enter customer details" : "Hidden until requested"}</strong>
                  <small>Customer profiles can be used here for store credit and order history.</small>
                </div>
                <button type="button" onClick={() => setShowNewCustomerForm((visible) => !visible)}>
                  <Icon name={showNewCustomerForm ? "close" : "plus"} />
                  <span>{showNewCustomerForm ? "Hide New Customer" : "Create New Customer"}</span>
                </button>
              </div>
              {showNewCustomerForm ? (
                <div className="credit-redemption-control" aria-label="Create local customer">
                  <label htmlFor="new-customer-first-name">
                    <span className="micro-label">First name</span>
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
                    <span className="micro-label">Local profile</span>
                    <strong>Create and use customer</strong>
                    <button type="button" onClick={() => void handleCreateCustomer()}>
                      <Icon name="plus" />
                      <span>Create & Use Customer</span>
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="customer-kiosk-checkout" aria-label="Kiosk order sale completion">
                <header>
                  <div>
                    <span className="micro-label">Kiosk order sale</span>
                    <strong>
                      {selectedCustomerKioskOrder
                        ? `${selectedCustomerKioskOrder.orderId} / ${selectedCustomerKioskOrder.totalLabel}`
                        : "Search kiosk orders"}
                    </strong>
                    <small>
                      Pull a customer kiosk order into Sale Completion, record Square payment, then attach the completed order to
                      this customer profile.
                    </small>
                  </div>
                  <button
                    type="button"
                    disabled={!selectedCustomerKioskOrder}
                    onClick={() => selectedCustomerKioskOrder && handleUseCustomerKioskOrder(selectedCustomerKioskOrder)}
                  >
                    <Icon name="tag" />
                    <span>Use Order Total</span>
                  </button>
                </header>
                <div className="customer-kiosk-search">
                  <label htmlFor="customer-kiosk-order-search">
                    <span className="micro-label">Order, name, receipt, card</span>
                    <input
                      id="customer-kiosk-order-search"
                      value={customerKioskOrderSearch}
                      onChange={(event) => setCustomerKioskOrderSearch(event.target.value)}
                      placeholder="kiosk ID, customer, receipt, Charizard"
                    />
                  </label>
                  <button type="button" onClick={() => void refreshKioskOrderTickets(false)}>
                    <Icon name="sync" />
                    <span>Refresh Orders</span>
                  </button>
                </div>
                <div className="customer-kiosk-order-list" aria-label="Kiosk order search results">
                  {customerKioskOrderMatches.length > 0 ? (
                    customerKioskOrderMatches.map((ticket) => (
                      <button
                        type="button"
                        key={ticket.orderId}
                        className={ticket.orderId === selectedCustomerKioskOrderId ? "is-selected" : ""}
                        onClick={() => handleUseCustomerKioskOrder(ticket)}
                      >
                        <strong>{ticket.orderId}</strong>
                        <span>{ticket.customerName}</span>
                        <small>
                          {ticket.status}; {ticket.paymentStatus === "paid" ? "paid" : "pay at store"};{" "}
                          {ticket.itemCount} card(s); {ticket.totalLabel}
                        </small>
                      </button>
                    ))
                  ) : (
                    <p>No kiosk orders match this customer/search yet.</p>
                  )}
                </div>
                {selectedCustomerKioskOrder ? (
                  <div className="customer-kiosk-selected-order" aria-label="Selected kiosk order cards">
                    <div>
                      <span className="micro-label">Selected order cards</span>
                      <strong>
                        {selectedCustomerKioskOrder.itemCount} card(s) / {selectedCustomerKioskOrder.totalLabel}
                      </strong>
                      <small>
                        Picked {selectedCustomerKioskOrder.pickedItemIds.length}/{selectedCustomerKioskOrder.itemCount};
                        receipt {selectedCustomerKioskOrder.squareReceiptReference || "not recorded"}.
                      </small>
                    </div>
                    <ul>
                      {selectedCustomerKioskOrder.items.map((item) => (
                        <li key={item.publicId}>
                          <span>{item.cardName}</span>
                          <small>
                            {item.setName}; {item.condition}; {item.location}
                          </small>
                          <strong>{item.price}</strong>
                        </li>
                      ))}
                    </ul>
                    <div className="customer-kiosk-actions">
                      <button type="button" onClick={() => void handleAttachKioskOrderToCustomer()}>
                        <Icon name="link" />
                        <span>Attach to Customer</span>
                      </button>
                      <button type="button" onClick={() => void handleOpenKioskPicking(selectedCustomerKioskOrder)}>
                        <Icon name="queue" />
                        <span>Open Fulfillment</span>
                      </button>
                      <button type="button" onClick={() => void handleCompleteCustomerKioskCheckout()}>
                        <Icon name="check" />
                        <span>Complete Kiosk Sale</span>
                      </button>
                    </div>
                  </div>
                ) : null}
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
              <div
                className="square-credit-handoff"
                aria-label="Square POS credit handoff"
              >
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
                    Cashier confirmed Pug Store Credit was applied in Square before completing the sale.
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
              <div className="square-terminal-panel" aria-label="Square Terminal reader connector">
                <header>
                  <div>
                    <span className="micro-label">Square reader connector</span>
                    <strong>
                      {squareTerminalStatus
                        ? squareTerminalStatus.status === "ok"
                          ? squareTerminalStatus.can_create_terminal_checkout
                            ? "Ready for reader payment"
                            : "Manual receipt mode"
                          : "Reader check blocked"
                        : "Not checked"}
                    </strong>
                    <small>
                      Server-side Square Terminal connector; tokens stay on the LAN server and are never returned to the
                      app.
                    </small>
                  </div>
                  <button type="button" onClick={() => void handleRefreshSquareTerminalStatus()}>
                    <Icon name="sync" />
                    <span>{squareTerminalProbeStatus === "working" ? "Checking" : "Check Reader"}</span>
                  </button>
                </header>
                <div className="square-terminal-grid">
                  <div>
                    <span className="micro-label">Reader status</span>
                    <strong>
                      {squareTerminalStatus?.status === "ok"
                        ? squareTerminalStatus.payment_capture_supported
                          ? "Configured"
                          : squareTerminalStatus.device_pairing_required
                            ? "Pair reader"
                            : "Credentials needed"
                        : squareTerminalStatus
                          ? "Unavailable"
                          : "Unknown"}
                    </strong>
                    <small>
                      {squareTerminalStatus?.status === "ok"
                        ? `Token ${squareTerminalStatus.token_configured ? "set" : "missing"}; location ${
                            squareTerminalStatus.location_configured ? "set" : "missing"
                          }; device ${squareTerminalStatus.terminal_device_configured ? "set" : "missing"}.`
                        : squareTerminalStatus
                          ? squareTerminalStatus.message
                        : "Use manual Square receipt entry until the connector is configured."}
                    </small>
                  </div>
                  <div>
                    <span className="micro-label">Payment amount</span>
                    <strong>
                      {squareSaleTotalMinorUnits === null
                        ? "Needs total"
                        : formatMoney(squareSaleTotalMinorUnits, customerCredit.currency)}
                    </strong>
                    <small>
                      {selectedCustomerKioskOrder
                        ? `Kiosk order ${selectedCustomerKioskOrder.orderId}`
                        : "Uses the Square ticket total field above."}
                    </small>
                  </div>
                  <div>
                    <span className="micro-label">Activation code</span>
                    <strong>
                      {squareTerminalDeviceCode?.status === "ok"
                        ? squareTerminalDeviceCode.device_code.code
                        : "Manager only"}
                    </strong>
                    <small>
                      {squareTerminalDeviceCode?.status === "ok"
                        ? squareTerminalDeviceCode.pairing_instruction
                        : "Generate a code only after Square credentials and location are set on the LAN server."}
                    </small>
                  </div>
                </div>
                <div className="square-terminal-actions">
                  <button type="button" onClick={() => void handleSendSquareTerminalCheckout()}>
                    <Icon name="tag" />
                    <span>Send to Square Reader</span>
                  </button>
                  <button
                    type="button"
                    disabled={!managerControlsUnlocked}
                    onClick={() => void handleCreateSquareTerminalDeviceCode()}
                  >
                    <Icon name="link" />
                    <span>Activate Reader</span>
                  </button>
                </div>
              </div>
              {showCreditLedger ? (
                <div className="ledger-preview" aria-label="Offline credit ledger preview">
                  <div className="ledger-summary-card">
                    <span>In-progress hold</span>
                    <strong>
                      {formatMoney(
                        pendingCreditMinorUnits,
                        customerCredit.currency,
                      )}
                    </strong>
                  </div>
                  <div className="ledger-summary-card">
                    <span>Balance after hold</span>
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
                            <small>
                              {entry.staffUserName
                                ? `Staff ${entry.staffUserName}`
                                : entry.staffUserId
                                  ? `Staff ${entry.staffUserId}`
                                  : "Staff pending"}
                              {entry.referenceId ? `; ref ${entry.referenceId}` : ""}
                            </small>
                            {entry.lineItems && entry.lineItems.length > 0 ? (
                              <ul className="ledger-line-item-list">
                                {entry.lineItems.map((line) => (
                                  <li key={line.lineItemId}>
                                    <span>{line.label}</span>
                                    <strong>{formatMoney(line.amountMinorUnits, entry.currency)}</strong>
                                    <small>
                                      {[line.type, line.squareReceiptReference, line.referenceId]
                                        .filter(Boolean)
                                        .join(" / ")}
                                    </small>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                          <div>
                            <strong>
                              {formatMoney(entry.amountMinorUnits, entry.currency)}
                            </strong>
                            <small>
                              Before {formatMoney(entry.balanceBeforeMinorUnits, entry.currency)}
                            </small>
                            <small>
                              After {formatMoney(entry.balanceAfterMinorUnits, entry.currency)}
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
                  <span>Redeem Credit & Record Square Receipt</span>
                </button>
              </div>
            </section>
          </section>
        </section>
      </div>
    </main>
  )
}
