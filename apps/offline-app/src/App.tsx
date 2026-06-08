import { useMemo, useState } from "react"

import {
  buildOfflinePushBatchPayload,
  buildOfflinePushRequestPlan,
  buildInventoryUpdateOperation,
  filterInventoryItems,
  findInventoryItem,
  formatMoney,
  offlineWorkspaceSeed,
  statusLabel,
  summarizeOfflinePushResult,
  type IconName,
  type OfflineOperationEnvelope,
  type OfflinePushBatchPayload,
  type OfflinePushRequestPlan,
  type OfflinePushResultSummary,
} from "./data/offlineWorkspace"
import { submitOfflineOperation, type OfflineQueueSubmissionResult } from "./data/offlineQueueBridge"
import { createTauriQueueAdapter } from "./data/tauriQueueAdapter"
import pugGameShopCrest from "./assets/pug-game-shop-crest.png"
import "./styles.css"

type AppIconName = IconName | "upload" | "history" | "search" | "grid" | "list" | "plus" | "database"

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
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(42)
  const [stagedOperation, setStagedOperation] = useState<OfflineOperationEnvelope | null>(null)
  const [stagedPushBatch, setStagedPushBatch] = useState<OfflinePushBatchPayload | null>(null)
  const [stagedPushRequest, setStagedPushRequest] = useState<OfflinePushRequestPlan | null>(null)
  const [pushSummary, setPushSummary] = useState<OfflinePushResultSummary | null>(null)
  const [queueSubmission, setQueueSubmission] = useState<OfflineQueueSubmissionResult | null>(null)
  const selectedItem = findInventoryItem(workspace.inventoryItems, selectedId)
  const queueTarget = queueSubmission?.sqlitePlan.table ?? "operation_queue"
  const filteredItems = useMemo(() => {
    return filterInventoryItems(workspace.inventoryItems, query)
  }, [query, workspace.inventoryItems])
  const queueBadgeCount = workspace.queueItems.reduce((total, item) => total + item.count, 0)
  const conflictBadgeCount = workspace.conflicts.length

  async function handleStageInventoryUpdate() {
    const operation = buildInventoryUpdateOperation(selectedItem)
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
                className={item.active ? "nav-item is-active" : "nav-item"}
                type="button"
                key={item.label}
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
              <span className="micro-label">{workspace.device.storeLabel}</span>
              <h1>Offline Inventory Command</h1>
            </div>
            <div className="top-actions" aria-label="Offline sync status">
              <div className="connection-pill" aria-label="Offline mode active">
                <Icon name="wifi" />
                <span>{workspace.device.modeLabel}</span>
              </div>
              <div className="sync-time">
                <span>Last sync</span>
                <strong>{workspace.device.lastSyncLabel}</strong>
              </div>
              <button className="sync-now" type="button" disabled>
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

          <section className="content-grid">
            <section className="inventory-panel" aria-label="Offline inventory">
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
                <button className="filter-button" type="button">
                  Filters
                </button>
                <button className="icon-button" type="button" aria-label="Grid view">
                  <Icon name="grid" />
                </button>
                <button className="icon-button is-active" type="button" aria-label="List view">
                  <Icon name="list" />
                </button>
                <button type="button">
                  <Icon name="plus" />
                  <span>Add Scan</span>
                </button>
              </div>

              <div className="table-meta">
                <span>{filteredItems.length} cached results</span>
                <strong>Website authority after sync acceptance</strong>
              </div>

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
                  onClick={handleStageInventoryUpdate}
                >
                  <Icon name="upload" />
                  <span>Stage Inventory Update</span>
                </button>
                <button type="button" onClick={handleStageInventoryUpdate}>
                  Adjust Qty
                </button>
                <button type="button" onClick={handleStageInventoryUpdate}>
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

            <section className="queue-panel" aria-label="Sync queue">
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
              <button className="secondary-command" type="button" onClick={handleStageInventoryUpdate}>
                <Icon name="plus" />
                <span>Stage New Update</span>
              </button>
            </section>

            <section className="conflict-panel" aria-label="Conflict review">
              <div className="section-heading">
                <h2>Conflicts</h2>
                <span>Needs review</span>
              </div>
              {workspace.conflicts.map((item) => (
                <article className="conflict-row" key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <button type="button">{item.action}</button>
                </article>
              ))}
              <button className="secondary-command danger-command" type="button">
                <Icon name="history" />
                <span>Review History</span>
              </button>
            </section>

            <section className="credit-panel" aria-label="Customer credit snapshot">
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
            </section>
          </section>
        </section>
      </div>
    </main>
  )
}
