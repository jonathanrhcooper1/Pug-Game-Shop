export type IconName =
  | "box"
  | "sync"
  | "queue"
  | "alert"
  | "customer"
  | "settings"
  | "scan"
  | "wifi"
  | "card"

export type InventoryStatus = "available" | "reserved" | "conflict"
export type InventorySource = "cached" | "queued" | "accepted"
export type QueueTone = "success" | "warning" | "neutral"

export type NavItem = {
  label: string
  icon: IconName
  active?: boolean
}

export type InventoryItem = {
  id: number
  rowVersion: number
  cardName: string
  setName: string
  number: string
  condition: string
  barcode: string
  price: string
  priceMinorUnits: number
  currency: "USD"
  location: string
  status: InventoryStatus
  source: InventorySource
}

export type SyncSummaryItem = {
  label: string
  value: string
}

export type QueueItem = {
  label: string
  count: number
  tone: QueueTone
}

export type ConflictItem = {
  title: string
  detail: string
  action: string
}

export type CustomerCreditSnapshot = {
  label: string
  availableMinorUnits: number
  currency: "USD"
  note: string
}

export type OfflineOperationEnvelope = {
  client_operation_id: string
  device_id: string
  location_id: number
  actor_id: number
  operation_type: "inventory_update"
  entity_type: "inventory"
  entity_id: string
  base_row_version: number
  occurred_at_local: string
  queued_at_utc: string
  payload_json: string
  authorization_context_json: string
  schema_version: 1
}

export type OfflineWorkspaceState = {
  navItems: NavItem[]
  syncRoutes: string[]
  device: {
    storeLabel: string
    modeLabel: string
    lastSyncLabel: string
  }
  syncSummary: SyncSummaryItem[]
  inventoryItems: InventoryItem[]
  queueItems: QueueItem[]
  conflicts: ConflictItem[]
  customerCredit: CustomerCreditSnapshot
}

export const operationEnvelopeFields = [
  "client_operation_id",
  "device_id",
  "location_id",
  "actor_id",
  "operation_type",
  "entity_type",
  "entity_id",
  "base_row_version",
  "occurred_at_local",
  "queued_at_utc",
  "payload_json",
  "authorization_context_json",
  "schema_version",
] as const

export const offlineWorkspaceSeed: OfflineWorkspaceState = {
  navItems: [
    { label: "Inventory", icon: "box", active: true },
    { label: "Sync", icon: "sync" },
    { label: "Queue", icon: "queue" },
    { label: "Conflicts", icon: "alert" },
    { label: "Customers", icon: "customer" },
    { label: "Settings", icon: "settings" },
  ],
  syncRoutes: [
    "/wp-json/tcg-store/v1/offline/devices/register",
    "/wp-json/tcg-store/v1/offline/pull",
    "/wp-json/tcg-store/v1/offline/push",
  ],
  device: {
    storeLabel: "Front Counter",
    modeLabel: "Offline Mode",
    lastSyncLabel: "Today 10:42 AM",
  },
  syncSummary: [
    { label: "Queued writes", value: "27" },
    { label: "Cached cards", value: "14,218" },
    { label: "Open conflicts", value: "2" },
    { label: "Website authority", value: "After sync" },
  ],
  inventoryItems: [
    {
      id: 42,
      rowVersion: 12,
      cardName: "Charizard",
      setName: "Base Set",
      number: "4/102",
      condition: "NM",
      barcode: "PKM-BASE-004-HOLO",
      price: "$125.00",
      priceMinorUnits: 12500,
      currency: "USD",
      location: "Case A3",
      status: "available",
      source: "accepted",
    },
    {
      id: 87,
      rowVersion: 8,
      cardName: "Pikachu",
      setName: "Jungle",
      number: "60/64",
      condition: "LP",
      barcode: "PKM-JGL-060-YLW",
      price: "$18.00",
      priceMinorUnits: 1800,
      currency: "USD",
      location: "Binder 2",
      status: "reserved",
      source: "cached",
    },
    {
      id: 118,
      rowVersion: 17,
      cardName: "Umbreon V",
      setName: "Evolving Skies",
      number: "94/203",
      condition: "NM",
      barcode: "PKM-EVS-094-V",
      price: "$74.00",
      priceMinorUnits: 7400,
      currency: "USD",
      location: "Case B1",
      status: "available",
      source: "queued",
    },
    {
      id: 151,
      rowVersion: 4,
      cardName: "Mox Amber",
      setName: "Dominaria",
      number: "224/269",
      condition: "MP",
      barcode: "MTG-DOM-224-MOX",
      price: "$32.00",
      priceMinorUnits: 3200,
      currency: "USD",
      location: "MTG Tray",
      status: "conflict",
      source: "queued",
    },
  ],
  queueItems: [
    { label: "Inventory scans", count: 18, tone: "success" },
    { label: "Credit updates", count: 3, tone: "warning" },
    { label: "Event check-ins", count: 6, tone: "neutral" },
  ],
  conflicts: [
    {
      title: "Mox Amber location mismatch",
      detail: "Local scan says MTG Tray; website snapshot says Sold.",
      action: "Review",
    },
    {
      title: "Credit redemption needs manager",
      detail: "$28.00 offline credit use awaits approval.",
      action: "Approve",
    },
  ],
  customerCredit: {
    label: "Customer credit",
    availableMinorUnits: 24600,
    currency: "USD",
    note: "Cached balance available for offline redemption. Ledger replay stays pending until push acceptance.",
  },
}

export function statusLabel(status: InventoryStatus) {
  return status === "available" ? "Available" : status === "reserved" ? "Reserved" : "Conflict"
}

export function formatMoney(minorUnits: number, currency: "USD") {
  return new Intl.NumberFormat("en-US", {
    currency,
    style: "currency",
  }).format(minorUnits / 100)
}

export function filterInventoryItems(items: InventoryItem[], query: string) {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return items
  }

  return items.filter((item) =>
    [item.cardName, item.setName, item.barcode, item.location]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  )
}

export function findInventoryItem(items: InventoryItem[], selectedId: number) {
  return items.find((item) => item.id === selectedId) ?? items[0]
}

export function buildInventoryUpdateOperation(
  item: InventoryItem,
  options: {
    actorId?: number
    deviceId?: string
    locationId?: number
    occurredAtLocal?: string
    queuedAtUtc?: string
  } = {},
): OfflineOperationEnvelope {
  const occurredAtLocal = options.occurredAtLocal ?? new Date().toISOString()
  const queuedAtUtc = options.queuedAtUtc ?? occurredAtLocal
  const operationStamp = queuedAtUtc.replace(/[^0-9]/g, "").slice(0, 14)

  return {
    client_operation_id: `offline-inventory-${item.id}-${operationStamp}`,
    device_id: options.deviceId ?? "local-device-preview",
    location_id: options.locationId ?? 1,
    actor_id: options.actorId ?? 1,
    operation_type: "inventory_update",
    entity_type: "inventory",
    entity_id: String(item.id),
    base_row_version: item.rowVersion,
    occurred_at_local: occurredAtLocal,
    queued_at_utc: queuedAtUtc,
    payload_json: JSON.stringify({
      barcode: item.barcode,
      location: item.location,
      price_minor_units: item.priceMinorUnits,
      status: item.status,
    }),
    authorization_context_json: JSON.stringify({
      manager_override: false,
      source: "offline_app",
    }),
    schema_version: 1,
  }
}
