import { useMemo, useState } from "react"

import {
  buildInventoryUpdateOperation,
  filterInventoryItems,
  findInventoryItem,
  formatMoney,
  offlineWorkspaceSeed,
  statusLabel,
  type IconName,
  type OfflineOperationEnvelope,
} from "./data/offlineWorkspace"
import { submitOfflineOperation, type OfflineQueueSubmissionResult } from "./data/offlineQueueBridge"
import { createTauriQueueAdapter } from "./data/tauriQueueAdapter"
import "./styles.css"

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
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
  const [query, setQuery] = useState("PKM-BASE")
  const [selectedId, setSelectedId] = useState(42)
  const [stagedOperation, setStagedOperation] = useState<OfflineOperationEnvelope | null>(null)
  const [queueSubmission, setQueueSubmission] = useState<OfflineQueueSubmissionResult | null>(null)
  const selectedItem = findInventoryItem(workspace.inventoryItems, selectedId)
  const filteredItems = useMemo(() => {
    return filterInventoryItems(workspace.inventoryItems, query)
  }, [query, workspace.inventoryItems])

  async function handleStageInventoryUpdate() {
    const operation = buildInventoryUpdateOperation(selectedItem)
    setStagedOperation(operation)
    setQueueSubmission(await submitOfflineOperation(operation, queueAdapter))
  }

  return (
    <main className="offline-shell">
      <aside className="nav-rail" aria-label="Offline app sections">
        <div className="brand-lockup">
          <span className="brand-mark">PG</span>
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
            </button>
          ))}
        </nav>
        <div className="route-stack" aria-label="Sync endpoints">
          {workspace.syncRoutes.map((route) => (
            <span key={route}>{route.replace("/wp-json/tcg-store/v1", "")}</span>
          ))}
        </div>
      </aside>

      <section className="workspace">
        <header className="top-bar">
          <div>
            <span className="micro-label">{workspace.device.storeLabel}</span>
            <h1>Offline Inventory Command</h1>
          </div>
          <div className="connection-pill" aria-label="Offline mode active">
            <Icon name="wifi" />
            <span>{workspace.device.modeLabel}</span>
          </div>
          <div className="sync-time">
            <span>Last sync</span>
            <strong>{workspace.device.lastSyncLabel}</strong>
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
              <input
                id="offline-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Barcode, card, set, or location"
              />
              <button type="button">Add Scan</button>
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
            </div>
          </section>

          <aside className="detail-panel" aria-label="Selected card details">
            <div className="card-preview">
              <Icon name="card" />
              <span>{selectedItem.number}</span>
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
            <button
              className="wide-action"
              type="button"
              onClick={handleStageInventoryUpdate}
            >
              Stage Inventory Update
            </button>
            <div className="operation-preview" aria-live="polite">
              {stagedOperation ? (
                <>
                  <span>
                    {queueSubmission?.status === "queued" ? "Queued envelope" : "Staged envelope"}
                  </span>
                  <strong>{stagedOperation.client_operation_id}</strong>
                  <small>{queueSubmission?.message ?? "Ready for local queue handoff."}</small>
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
              <span>27 pending</span>
            </div>
            {workspace.queueItems.map((item) => (
              <div className={`queue-row ${item.tone}`} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
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
    </main>
  )
}
