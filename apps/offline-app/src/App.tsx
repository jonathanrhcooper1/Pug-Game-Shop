import { useEffect, useMemo, useRef, useState } from "react"

import {
  buildOfflinePushBatchPayload,
  buildOfflinePushRequestPlan,
  buildConnectorManifestPreview,
  buildConflictReviewOperation,
  buildCustomerCreditRedemptionOperation,
  connectorDisplayUrl,
  connectorHealthSummary,
  connectorStatusLabel,
  buildInventoryUpdateOperation,
  filterInventoryItems,
  findConnectorProfile,
  findInventoryItem,
  formatMoney,
  offlineWorkspaceSeed,
  statusLabel,
  summarizeOfflinePushResult,
  validateConnectorManifest,
  type ConflictItem,
  type ConnectorManifestValidation,
  type IconName,
  type InventoryStatus,
  type OfflineOperationEnvelope,
  type OfflinePushBatchPayload,
  type OfflinePushRequestPlan,
  type OfflinePushResultSummary,
} from "./data/offlineWorkspace"
import { submitOfflineOperation, type OfflineQueueSubmissionResult } from "./data/offlineQueueBridge"
import { createTauriQueueAdapter } from "./data/tauriQueueAdapter"
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
  const inventoryPanelRef = useRef<HTMLElement>(null)
  const workflowPanelRef = useRef<HTMLElement>(null)
  const queuePanelRef = useRef<HTMLElement>(null)
  const conflictPanelRef = useRef<HTMLElement>(null)
  const creditPanelRef = useRef<HTMLElement>(null)
  const connectorPanelRef = useRef<HTMLElement>(null)
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(42)
  const [activeSection, setActiveSection] = useState("Inventory")
  const [activeProfileId, setActiveProfileId] = useState(
    workspace.connectorProfiles[0]?.id ?? "pug-game-shop-staging",
  )
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [activityMessage, setActivityMessage] = useState<ActivityMessage>({
    title: "Local workspace ready",
    detail: "Choose a connector profile, scan inventory, or stage a queue update.",
  })
  const [selectedConflictTitle, setSelectedConflictTitle] = useState("")
  const [showConflictHistory, setShowConflictHistory] = useState(false)
  const [stagedOperation, setStagedOperation] = useState<OfflineOperationEnvelope | null>(null)
  const [stagedPushBatch, setStagedPushBatch] = useState<OfflinePushBatchPayload | null>(null)
  const [stagedPushRequest, setStagedPushRequest] = useState<OfflinePushRequestPlan | null>(null)
  const [pushSummary, setPushSummary] = useState<OfflinePushResultSummary | null>(null)
  const [queueSubmission, setQueueSubmission] = useState<OfflineQueueSubmissionResult | null>(null)
  const [connectorValidation, setConnectorValidation] =
    useState<ConnectorManifestValidation | null>(null)
  const activeProfile = findConnectorProfile(workspace.connectorProfiles, activeProfileId)
  const manifestPreview = useMemo(() => buildConnectorManifestPreview(activeProfile), [activeProfile])
  const connectorHealth = connectorHealthSummary(connectorValidation?.profile ?? activeProfile)
  const selectedItem = findInventoryItem(workspace.inventoryItems, selectedId)
  const queueTarget = queueSubmission?.sqlitePlan.table ?? "operation_queue"
  const filteredItems = useMemo(() => {
    return filterInventoryItems(workspace.inventoryItems, query, statusFilter)
  }, [query, statusFilter, workspace.inventoryItems])
  const queueBadgeCount =
    workspace.queueItems.reduce((total, item) => total + item.count, 0) + (stagedOperation ? 1 : 0)
  const conflictBadgeCount = workspace.conflicts.length

  useEffect(() => {
    if (
      filteredItems.length > 0 &&
      filteredItems.every((item) => item.id !== selectedId)
    ) {
      setSelectedId(filteredItems[0].id)
    }
  }, [filteredItems, selectedId])

  useEffect(() => {
    setConnectorValidation(null)
  }, [activeProfile.id])

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

    setStagedOperation(operation)
    setStagedPushBatch(batch)
    setStagedPushRequest(requestPlan)
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
          push_canonical_mutations_deferred: true,
        },
      }),
    )
    setQueueSubmission(await submitOfflineOperation(operation, queueAdapter))
    setActiveSection("Queue")
    setActivityMessage({
      title: actionTitle,
      detail,
    })
  }

  async function handleStageInventoryUpdate(actionTitle = "Inventory update staged") {
    await stageOfflineOperation(
      buildInventoryUpdateOperation(selectedItem),
      actionTitle,
      `${selectedItem.cardName} prepared for ${activeProfile.companyName}; website push remains deferred until the device connector is paired.`,
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
  }

  function handleConnectorProfileChange(profileId: string) {
    const nextProfile = findConnectorProfile(workspace.connectorProfiles, profileId)

    setActiveProfileId(nextProfile.id)
    setActiveSection("Settings")
    setActivityMessage({
      title: "Connector profile selected",
      detail: `${nextProfile.companyName} ${nextProfile.environment} is active. Credentials stay in the desktop secure store and WordPress server settings.`,
    })
  }

  function handleSyncNowPreview() {
    setActiveSection("Sync")
    setActivityMessage({
      title: "Sync plan prepared",
      detail: `${connectorDisplayUrl(activeProfile)}${activeProfile.wordpress.restBasePath}/offline/pull and /offline/push are ready for this company profile; network execution waits for pairing approval.`,
    })
  }

  function handleTestWebsiteConnector() {
    const validation = validateConnectorManifest(manifestPreview)
    const issueText =
      validation.issues.length > 0
        ? validation.issues.join(" ")
        : "Manifest shape is valid and credential values are not synced to the app."

    setConnectorValidation(validation)
    setActiveSection("Settings")
    setActivityMessage({
      title:
        validation.status === "accepted"
          ? "Connector manifest accepted"
          : validation.status === "warning"
            ? "Connector manifest needs pairing review"
            : "Connector manifest rejected",
      detail: `${validation.profile.companyName} ${validation.profile.environment} exposes ${validation.routeCount} offline routes. ${issueText}`,
    })
  }

  function handleAddScan() {
    setQuery(selectedItem.barcode)
    void handleStageInventoryUpdate("Scan staged")
  }

  function handlePrintLabel() {
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
                  {workspace.connectorProfiles.map((profile) => (
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
                  onClick={() => void handleStageInventoryUpdate("Quantity adjustment staged")}
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
                        ? `${queueTarget} insert planned; ${stagedPushRequest.method} ${stagedPushRequest.path.replace("/wp-json/tcg-store/v1", "")} deferred; ${pushSummary.status} preview.`
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
            </aside>

            <section className="queue-panel" aria-label="Sync queue" ref={queuePanelRef}>
              <div className="section-heading">
                <h2>Sync queue</h2>
                <span>{queueBadgeCount} pending</span>
              </div>
              {workspace.queueItems.map((item) => (
                <div className={`queue-row ${item.tone}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
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
              {workspace.conflicts.map((item) => (
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
              {showConflictHistory ? (
                <div className="history-note">
                  <strong>Last review</strong>
                  <span>Manager review, queue replay, and website write are still deferred.</span>
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
                  <small>{connectorHealth.restBasePath}</small>
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
                </div>
                {connectorValidation?.issues.length ? (
                  <ul>
                    {connectorValidation.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="connector-actions">
                <button type="button" onClick={handleTestWebsiteConnector}>
                  <Icon name="link" />
                  <span>Test Website Connector</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActivityMessage({
                      title: "Profile draft saved",
                      detail:
                        "This local profile is ready for secure desktop storage; no API keys or passwords are written into source code.",
                    })
                  }
                >
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
                    workspace.customerCredit.availableMinorUnits,
                    workspace.customerCredit.currency,
                  )}
                </h2>
              </div>
              <p>{workspace.customerCredit.note}</p>
              <div className="credit-actions">
                <button type="button" onClick={() => void handleCreditRedemption()}>
                  <Icon name="tag" />
                  <span>Stage Credit Use</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
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
