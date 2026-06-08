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
  buildOfflinePullRefreshPreview,
  buildPreparedDevicePairingRequest,
  buildOfflineSessionStorageSnapshot,
  buildPreparedPairingStorageSnapshot,
  CONNECTOR_PROFILE_STORAGE_KEY,
  connectorManifestUrl,
  connectorDisplayUrl,
  connectorHealthSummary,
  connectorProfileDraftFromProfile,
  connectorStatusLabel,
  createEmptyConnectorProfileDraft,
  buildInventoryUpdateOperation,
  buildInventoryReservationOperation,
  buildOfflineConnectorSyncSessionPlan,
  filterInventoryItems,
  findConnectorProfile,
  findInventoryItem,
  formatMoney,
  offlineWorkspaceSeed,
  OFFLINE_SESSION_STORAGE_KEY,
  PREPARED_PAIRING_STORAGE_KEY,
  restoreOfflineSessionStorageSnapshot,
  restorePreparedPairingStorageSnapshot,
  restoreConnectorProfileStorageSnapshot,
  statusLabel,
  summarizeOfflinePushResult,
  upsertConnectorProfile,
  validateConnectorManifest,
  type ConflictItem,
  type ConnectorManifestValidation,
  type ConnectorProfileDraft,
  type ConnectorProfileStorageRestoreResult,
  type DevicePairingRequestPlan,
  type IconName,
  type InventoryStatus,
  type OfflineOperationEnvelope,
  type OfflineConnectorManifest,
  type OfflineConnectorSyncSessionPlan,
  type OfflinePushBatchPayload,
  type OfflinePushRequestPlan,
  type OfflinePushResultSummary,
  type OfflinePullRefreshPreview,
  type OfflineConnectorTestReport,
  type OfflineSessionStorageRestoreResult,
  type OfflineSyncAttemptRecord,
  type PreparedDevicePairingRequest,
  type PreparedPairingStorageRestoreResult,
} from "./data/offlineWorkspace"
import {
  restoreDesktopQueuedOperations,
  submitOfflineOperation,
  type OfflineQueueSubmissionResult,
} from "./data/offlineQueueBridge"
import { createTauriQueueAdapter } from "./data/tauriQueueAdapter"
import { createTauriSecureStoreAdapter } from "./data/tauriSecureStoreAdapter"
import pugGameShopCrest from "./assets/pug-game-shop-crest.png"
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

type ViewMode = "list" | "grid"

type ActivityMessage = {
  title: string
  detail: string
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

function loadOfflineSessionStorage(): OfflineSessionStorageRestoreResult {
  if (typeof window === "undefined") {
    return restoreOfflineSessionStorageSnapshot(null)
  }

  return restoreOfflineSessionStorageSnapshot(
    window.localStorage.getItem(OFFLINE_SESSION_STORAGE_KEY),
  )
}

function Icon({ name }: { name: AppIconName }) {
  const paths: Record<AppIconName, string> = {
    box: "M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Zm8 3.5 8-4.5M12 12 4 7.5m8 4.5v8",
    sync: "M17 3v4h-4M7 21v-4h4m6-10a7 7 0 0 0-11.7 3M7 17a7 7 0 0 0 11.7-3",
    queue: "M5 7h14M5 12h14M5 17h10",
    alert: "M12 4 3 20h18L12 4Zm0 5v5m0 3h.01",
    customer: "M16 19a4 4 0 0 0-8 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
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
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon">
      <path d={paths[name]} />
    </svg>
  )
}

export function App() {
  const workspace = offlineWorkspaceSeed
  const queueAdapter = useMemo(() => createTauriQueueAdapter(), [])
  const secureStoreAdapter = useMemo(() => createTauriSecureStoreAdapter(), [])
  const inventoryPanelRef = useRef<HTMLElement>(null)
  const workflowPanelRef = useRef<HTMLElement>(null)
  const queuePanelRef = useRef<HTMLElement>(null)
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
  const offlineSessionStorageRef = useRef<OfflineSessionStorageRestoreResult | null>(null)
  if (offlineSessionStorageRef.current === null) {
    offlineSessionStorageRef.current = loadOfflineSessionStorage()
  }
  const offlineSessionStorage = offlineSessionStorageRef.current
  const [inventoryItems, setInventoryItems] = useState(workspace.inventoryItems)
  const [connectorProfiles, setConnectorProfiles] = useState(connectorProfileStorage.profiles)
  const [openConflicts, setOpenConflicts] = useState(workspace.conflicts)
  const [reviewedConflicts, setReviewedConflicts] = useState<ConflictItem[]>([])
  const [queuedOperations, setQueuedOperations] = useState<OfflineOperationEnvelope[]>(
    offlineSessionStorage.queuedOperations,
  )
  const [pendingCreditMinorUnits, setPendingCreditMinorUnits] = useState(0)
  const [showCreditLedger, setShowCreditLedger] = useState(false)
  const [labelPrintJobs, setLabelPrintJobs] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(42)
  const [activeSection, setActiveSection] = useState("Inventory")
  const [activeProfileId, setActiveProfileId] = useState(connectorProfileStorage.activeProfileId)
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [activityMessage, setActivityMessage] = useState<ActivityMessage>({
    title: offlineSessionStorage.restored ? "Local queue restored" : "Local workspace ready",
    detail: offlineSessionStorage.restored
      ? `${offlineSessionStorage.queuedOperations.length} queued operation(s) and ${offlineSessionStorage.syncAttempts.length} sync attempt(s) restored from this device.`
      : "Choose a connector profile, scan inventory, or stage a queue update.",
  })
  const [selectedConflictTitle, setSelectedConflictTitle] = useState("")
  const [showConflictHistory, setShowConflictHistory] = useState(false)
  const [stagedOperation, setStagedOperation] = useState<OfflineOperationEnvelope | null>(null)
  const [stagedPushBatch, setStagedPushBatch] = useState<OfflinePushBatchPayload | null>(null)
  const [stagedPushRequest, setStagedPushRequest] = useState<OfflinePushRequestPlan | null>(null)
  const [pushSummary, setPushSummary] = useState<OfflinePushResultSummary | null>(null)
  const [syncSessionPlan, setSyncSessionPlan] = useState<OfflineConnectorSyncSessionPlan | null>(null)
  const [pullRefreshPreview, setPullRefreshPreview] = useState<OfflinePullRefreshPreview | null>(null)
  const [syncAttempts, setSyncAttempts] = useState<OfflineSyncAttemptRecord[]>(
    offlineSessionStorage.syncAttempts,
  )
  const [queueSubmission, setQueueSubmission] = useState<OfflineQueueSubmissionResult | null>(null)
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
  const [preparedPairingRequests, setPreparedPairingRequests] = useState<PreparedDevicePairingRequest[]>(
    preparedPairingStorage.requests,
  )
  const activeProfile = findConnectorProfile(connectorProfiles, activeProfileId)
  const manifestPreview = useMemo(() => buildConnectorManifestPreview(activeProfile), [activeProfile])
  const activePreparedPairingRequests = useMemo(
    () => preparedPairingRequests.filter((request) => request.profileId === activeProfile.id),
    [preparedPairingRequests, activeProfile.id],
  )
  const connectorHealth = connectorHealthSummary(connectorValidation?.profile ?? activeProfile)
  const secureStoreSummary = secureStoreAdapter
    ? "available; device tokens can be persisted through the Tauri desktop secure-store commands"
    : "browser preview; live device tokens stay blocked until the Windows secure-store adapter is running"
  const selectedItem = findInventoryItem(inventoryItems, selectedId)
  const queueTarget = queueSubmission?.sqlitePlan.table ?? "operation_queue"
  const filteredItems = useMemo(() => {
    return filterInventoryItems(inventoryItems, query, statusFilter)
  }, [query, statusFilter, inventoryItems])
  const queueBadgeCount =
    workspace.queueItems.reduce((total, item) => total + item.count, 0) + queuedOperations.length
  const conflictBadgeCount = openConflicts.length
  const displayedCreditMinorUnits = Math.max(
    0,
    workspace.customerCredit.availableMinorUnits - pendingCreditMinorUnits,
  )

  useEffect(() => {
    if (
      filteredItems.length > 0 &&
      filteredItems.every((item) => item.id !== selectedId)
    ) {
      setSelectedId(filteredItems[0].id)
    }
  }, [filteredItems, selectedId])

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
    setConnectorDraft(connectorProfileDraftFromProfile(activeProfile))
    setConnectorDraftIssues([])
  }, [activeProfile.id])

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
    if (queuedOperations.length === 0 && syncAttempts.length === 0) {
      window.localStorage.removeItem(OFFLINE_SESSION_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(
      OFFLINE_SESSION_STORAGE_KEY,
      JSON.stringify(buildOfflineSessionStorageSnapshot(queuedOperations, syncAttempts)),
    )
  }, [queuedOperations, syncAttempts])

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

  function sectionTarget(label: string) {
    if (label === "Sync") {
      return workflowPanelRef
    }

    if (label === "Queue") {
      return queuePanelRef
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
    setActiveSection(label)
    window.requestAnimationFrame(() => {
      sectionTarget(label).current?.scrollIntoView({ block: "start", behavior: "smooth" })
    })
  }

  async function stageOfflineOperation(
    operation: OfflineOperationEnvelope,
    actionTitle: string,
    detail: string,
  ) {
    const batch = buildOfflinePushBatchPayload([operation])
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

  function recordSyncAttempt(plan: OfflineConnectorSyncSessionPlan) {
    setSyncAttempts((attempts) => [
      {
        id: `${plan.profileId}-${Date.now()}`,
        companyName: plan.companyName,
        siteUrl: plan.siteUrl,
        operationCount: plan.push.operation_count,
        pairingStatus: plan.prepared_pairing_available ? "Prepared locally" : "Pairing required",
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
  ) {
    await stageOfflineOperation(
      buildInventoryUpdateOperation(selectedItem, operationOptions),
      actionTitle,
      detailOverride ??
        `${selectedItem.cardName} prepared for ${activeProfile.companyName}; website push remains deferred until the device connector is paired.`,
    )
    setInventoryItems((items) =>
      items.map((item) =>
        item.id === selectedItem.id
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

    await stageOfflineOperation(
      buildInventoryReservationOperation(selectedItem),
      "Inventory hold staged",
      activeProfile.wordpress.canonicalInventoryWritesEnabled
        ? `${selectedItem.cardName} hold is queued for ${activeProfile.companyName}; guarded website inventory execution is enabled for this connector after pairing.`
        : `${selectedItem.cardName} hold is queued for ${activeProfile.companyName}; canonical inventory execution remains deferred for this connector.`,
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

  async function handleCreditRedemption() {
    const amount = formatMoney(
      workspace.customerCredit.redemptionPreviewMinorUnits,
      workspace.customerCredit.currency,
    )

    await stageOfflineOperation(
      buildCustomerCreditRedemptionOperation(workspace.customerCredit),
      "Credit redemption staged",
      `${amount} customer credit redemption prepared from cached balance; ledger replay remains deferred until website sync acceptance.`,
    )
    setPendingCreditMinorUnits((current) =>
      Math.min(
        workspace.customerCredit.availableMinorUnits,
        current + workspace.customerCredit.redemptionPreviewMinorUnits,
      ),
    )
    setShowCreditLedger(true)
  }

  function handleConnectorProfileChange(profileId: string) {
    const nextProfile = findConnectorProfile(connectorProfiles, profileId)

    setActiveProfileId(nextProfile.id)
    setConnectorDraft(connectorProfileDraftFromProfile(nextProfile))
    setActiveSection("Settings")
    setActivityMessage({
      title: "Connector profile selected",
      detail: `${nextProfile.companyName} ${nextProfile.environment} is active. Credentials stay in the desktop secure store and WordPress server settings.`,
    })
  }

  function handleNewConnectorDraft() {
    setConnectorDraft(createEmptyConnectorProfileDraft())
    setConnectorDraftIssues([])
    setConnectorValidation(null)
    setConnectorTestReport(null)
    setPairingPlan(null)
    setActiveSection("Settings")
    setActivityMessage({
      title: "New connector draft opened",
      detail:
        "Add a company name and WordPress website host. Secret values stay out of this app profile.",
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
    setActiveSection("Settings")
    setActivityMessage({
      title: validation.status === "rejected" ? "Connector saved with issues" : "Connector profile saved",
      detail: `${profile.companyName} ${profile.environment} now points at ${connectorDisplayUrl(profile)} and is saved locally for this device. Guarded inventory holds are ${profile.wordpress.canonicalInventoryWritesEnabled ? "enabled" : "deferred"}; credentials are still server-side or desktop secure-store only.`,
    })
  }

  function handleSyncNowPreview() {
    const operationsForSync = queuedOperations.length > 0
      ? queuedOperations
      : stagedOperation
        ? [stagedOperation]
        : []
    let nextSyncSessionPlan: OfflineConnectorSyncSessionPlan

    if (operationsForSync.length > 0) {
      const batch = buildOfflinePushBatchPayload(operationsForSync)
      const canonicalInventoryOperationCount = batch.operations.filter(
        (operation) => operation.operation_type === "inventory_reservation",
      ).length
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
      )
      setSyncSessionPlan(nextSyncSessionPlan)
    }

    recordSyncAttempt(nextSyncSessionPlan)
    const nextPullRefreshPreview = buildOfflinePullRefreshPreview(
      activeProfile,
      inventoryItems,
      workspace.customerCredit,
      openConflicts,
      operationsForSync,
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
    setActiveSection("Sync")
    setActivityMessage({
      title: "Sync plan prepared",
      detail:
        operationsForSync.length > 0
          ? `${operationsForSync.length} local operation(s) batched for ${activeProfile.companyName}; pull refresh preview preserved ${nextPullRefreshPreview.queuedOperationsPreserved} queued op(s), and guarded holds are ${nextSyncSessionPlan.push.canonical_inventory_writes_deferred ? "deferred" : "ready"}.`
          : `${connectorDisplayUrl(activeProfile)}${activeProfile.wordpress.restBasePath}/offline/pull and /offline/push are ready for this company profile; local cache refresh preview applied without network execution.`,
    })
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

      const validation = validateConnectorManifest(liveManifest)
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
      const previewValidation = validateConnectorManifest(buildConnectorManifestPreview(draftResult.profile))
      const report = buildConnectorTestReport(draftResult.profile, previewValidation, null)

      setConnectorValidation(previewValidation)
      setConnectorTestReport(report)
      setConnectorManifestFetch({
        status: "error",
        detail,
        sourceUrl,
        profileId: draftResult.profile.id,
      })
      setActiveSection("Settings")
      setActivityMessage({
        title: "Live connector manifest unavailable",
        detail: `${detail} Local profile validation still passed with ${previewValidation.routeCount} planned offline route(s).`,
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
          "Pairing route is present in the WordPress REST index. Raw manager code was not transmitted; token request still waits for desktop secure-store support.",
        rawPairingCodeTransmitted: false,
        credentialsSyncedToApp: false,
      })
      setActivityMessage({
        title: "Pairing route reachable",
        detail:
          "The website pairing route is present in the credential-free REST index. Live token issuance remains gated until secure storage is connected.",
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

  function handleAddScan() {
    setQuery(selectedItem.barcode)
    void handleStageInventoryUpdate(
      "Scan staged",
      {
        operationKind: "scan",
        syncIntent: "staff_barcode_scan",
        adjustmentReason: "scan-to-queue shortcut",
      },
      `${selectedItem.barcode} scanned into the local queue for ${activeProfile.companyName}; website push remains deferred until device pairing approval.`,
    )
  }

  function handlePrintLabel() {
    setLabelPrintJobs((jobs) => [selectedItem.barcode, ...jobs.filter((job) => job !== selectedItem.barcode)].slice(0, 4))
    setActiveSection("Inventory")
    setActivityMessage({
      title: "Label preview prepared",
      detail: `${selectedItem.barcode} is ready for the future printer adapter; physical printing remains deferred until device hardware is connected.`,
    })
  }

  async function handleConflictAction(conflict: ConflictItem) {
    setSelectedConflictTitle(conflict.title)
    await stageOfflineOperation(
      buildConflictReviewOperation(conflict),
      `${conflict.action} conflict staged`,
      `${conflict.title} is queued for staff review. Resolution writes stay deferred until manager approval and website sync acceptance.`,
    )
    setOpenConflicts((conflicts) => conflicts.filter((item) => item.title !== conflict.title))
    setReviewedConflicts((conflicts) => [conflict, ...conflicts])
    setShowConflictHistory(true)
  }

  return (
    <main className="offline-shell">
      <div className="app-window-bar" aria-label="Desktop app window">
        <div className="window-brand">
          <img src={pugGameShopCrest} alt="" />
          <span>Pug Game Shop Offline</span>
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
            <img className="brand-crest" src={pugGameShopCrest} alt="" />
            <span>
              <strong>Pug Game Shop</strong>
              <small>Offline</small>
            </span>
          </div>
          <nav>
            {workspace.navItems.map((item) => (
              <button
                className={item.label === activeSection ? "nav-item is-active" : "nav-item"}
                type="button"
                aria-label={item.label}
                key={item.label}
                onClick={() => handleNavSelection(item.label)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.label === "Queue" ? <strong>{queueBadgeCount}</strong> : null}
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
            <span>Local DB</span>
            <strong>offline.sqlite</strong>
            <small>Healthy</small>
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
              <label className="profile-select">
                <span>Company</span>
                <select
                  value={activeProfile.id}
                  onChange={(event) => handleConnectorProfileChange(event.target.value)}
                >
                  {connectorProfiles.map((profile) => (
                    <option value={profile.id} key={profile.id}>
                      {profile.companyName} / {profile.environment}
                    </option>
                  ))}
                </select>
              </label>
              <div className="connection-pill" aria-label="Offline mode active">
                <Icon name="wifi" />
                <span>{workspace.device.modeLabel}</span>
              </div>
              <div className="sync-time">
                <span>Last sync</span>
                <strong>{workspace.device.lastSyncLabel}</strong>
              </div>
              <button className="sync-now" type="button" onClick={handleSyncNowPreview}>
                <Icon name="sync" />
                <span>Sync Now</span>
              </button>
            </div>
          </header>

          <section className="sync-strip" aria-label="Sync summary">
            {workspace.syncSummary.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </section>

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
                  {syncSessionPlan.prepared_pairing_available ? "Prepared locally" : "Required"}
                </strong>
                <small>
                  {syncSessionPlan.prepared_pairing_available
                    ? `Fingerprint ${syncSessionPlan.pairing_code_fingerprint}; token storage ${syncSessionPlan.device_token_storage}`
                    : `No token request yet; token storage ${syncSessionPlan.device_token_storage}`}
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

          <section className="content-grid">
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
              </div>

              {filtersOpen ? (
                <div className="filter-tray" aria-label="Inventory filters">
                  {(["all", "available", "reserved", "conflict"] as const).map((status) => (
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
                      <strong>{item.cardName}</strong>
                      <small>{item.setName}</small>
                      <span>{item.price}</span>
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
                    <Icon name="card" />
                    <span className="foil-line" aria-hidden="true" />
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
                  <dt>Location</dt>
                  <dd>{selectedItem.location}</dd>
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
                <button
                  type="button"
                  onClick={() =>
                    void handleStageInventoryUpdate(
                      "Quantity adjustment staged",
                      {
                        operationKind: "quantity",
                        quantityDelta: 1,
                        syncIntent: "staff_quantity_adjustment",
                        adjustmentReason: "staff offline quantity correction",
                      },
                      `${selectedItem.cardName} quantity correction (+1) is queued locally; exact website inventory remains authoritative after sync acceptance.`,
                    )
                  }
                >
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
                  {labelPrintJobs.map((barcode) => (
                    <strong key={barcode}>{barcode}</strong>
                  ))}
                </div>
              ) : null}
            </aside>

            <section className="queue-panel" aria-label="Sync queue" ref={queuePanelRef}>
              <div className="section-heading">
                <h2>Sync queue</h2>
                <span>{queueBadgeCount} pending</span>
              </div>
              <p className="queue-storage-note">
                Queue and sync attempts are saved locally on this device.
              </p>
              {workspace.queueItems.map((item) => (
                <div className={`queue-row ${item.tone}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
              {queuedOperations.length > 0 ? (
                <div className="queued-operation-list" aria-label="Queued local operations">
                  {queuedOperations.slice(0, 4).map((operation) => (
                    <div key={operation.client_operation_id}>
                      <span>{operation.operation_type.replaceAll("_", " ")}</span>
                      <strong>{operation.client_operation_id}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="panel-empty">No new local operations staged this session.</p>
              )}
              <button
                className="secondary-command"
                type="button"
                onClick={() => void handleStageInventoryUpdate("Queue update staged")}
              >
                <Icon name="plus" />
                <span>Stage New Update</span>
              </button>
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
                  key={item.title}
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

            <section className="connector-panel" aria-label="Connector profile setup" ref={connectorPanelRef}>
              <div className="section-heading">
                <h2>Connector profile</h2>
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
                  <small>{connectorHealth.restBasePath}; profiles saved locally</small>
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
                  <strong>Inventory pulls from plugin</strong>
                  <small>Payments stay in WooCommerce Square</small>
                </div>
                <div>
                  <span className="micro-label">ScryDex</span>
                  <strong>{activeProfile.scrydex.teamLabel}</strong>
                  <small>Secrets stay on WordPress/server settings</small>
                </div>
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
              <div className="connector-editor" aria-label="Connector draft editor">
                <label>
                  <span className="micro-label">Company name</span>
                  <input
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
                  <span className="micro-label">Environment</span>
                  <select
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
                    value={pairingCode}
                    onChange={(event) => setPairingCode(event.target.value)}
                    placeholder="Manager code"
                  />
                </label>
                <button type="button" onClick={handlePairingPreview}>
                  <Icon name="check" />
                  <span>Prepare Pairing</span>
                </button>
                <button
                  type="button"
                  disabled={pairingRouteCheck.status === "loading"}
                  onClick={() => void handleCheckPairingRoute()}
                >
                  <Icon name="link" />
                  <span>
                    {pairingRouteCheck.status === "loading"
                      ? "Checking Route"
                      : "Check Pairing Route"}
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
                  Pairing route check: {pairingRouteCheck.status}; {pairingRouteCheck.detail}
                  {pairingRouteCheck.endpoint ? ` ${pairingRouteCheck.method} ${pairingRouteCheck.endpoint}` : ""}
                  ; raw code sent: no; credentials synced to app: no.
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
                <button type="button" onClick={handleNewConnectorDraft}>
                  <Icon name="plus" />
                  <span>New Connector</span>
                </button>
                <button
                  type="button"
                  disabled={connectorManifestFetch.status === "loading"}
                  onClick={() => void handleTestWebsiteConnector()}
                >
                  <Icon name="link" />
                  <span>
                    {connectorManifestFetch.status === "loading"
                      ? "Testing Website"
                      : "Test Website Connector"}
                  </span>
                </button>
                <button type="button" onClick={handleValidateLocalConnectorPreview}>
                  <Icon name="database" />
                  <span>Validate Local Preview</span>
                </button>
                <button type="button" onClick={handleSaveConnectorDraft}>
                  <Icon name="check" />
                  <span>Save Profile Draft</span>
                </button>
              </div>
            </section>

            <section className="credit-panel" aria-label="Customer credit snapshot" ref={creditPanelRef}>
              <div>
                <span className="micro-label">{workspace.customerCredit.label}</span>
                <h2>
                  {formatMoney(
                    displayedCreditMinorUnits,
                    workspace.customerCredit.currency,
                  )}
                </h2>
              </div>
              <p>{workspace.customerCredit.note}</p>
              {showCreditLedger ? (
                <div className="ledger-preview" aria-label="Offline credit ledger preview">
                  <div>
                    <span>Pending local hold</span>
                    <strong>
                      {formatMoney(
                        pendingCreditMinorUnits,
                        workspace.customerCredit.currency,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Cached balance after hold</span>
                    <strong>
                      {formatMoney(
                        displayedCreditMinorUnits,
                        workspace.customerCredit.currency,
                      )}
                    </strong>
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
                    setShowCreditLedger((shown) => !shown)
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
