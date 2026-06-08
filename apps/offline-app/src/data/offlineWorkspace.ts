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
export type ConnectorEnvironment = "development" | "staging" | "production"
export type ConnectorStatus = "ready" | "needs_pairing" | "sandbox_only"

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

export type StoreConnectorProfile = {
  id: string
  companyName: string
  companyShortName: string
  environment: ConnectorEnvironment
  status: ConnectorStatus
  wordpress: {
    scheme: "https"
    host: string
    restBasePath: "/wp-json/tcg-store/v1"
    authMode: "offline_device_token"
    credentialStorage: "desktop_secure_store"
    devicePairingRequired: boolean
    networkRequestsDeferred: true
  }
  square: {
    inventoryAuthority: "tcg_store_platform"
    paymentAuthority: "official_woocommerce_square_extension"
    providerWritesDeferred: true
    sandboxRequired: boolean
  }
  scrydex: {
    teamLabel: string
    credentialStorage: "wordpress_server_settings"
    credentialsSyncedToApp: false
  }
}

export type OfflineOperationEnvelope = {
  client_operation_id: string
  device_id: string
  location_id: number
  actor_id: number
  operation_type:
    | "inventory_update"
    | "inventory_reservation"
    | "event_reservation"
    | "credit_redemption"
  entity_type: "inventory" | "event" | "customer_credit"
  entity_id: string
  base_row_version: number
  occurred_at_local: string
  queued_at_utc: string
  payload_json: string
  authorization_context_json: string
  schema_version: 1
}

export type OfflinePushOperationPayload = Omit<
  OfflineOperationEnvelope,
  "payload_json" | "authorization_context_json"
> & {
  payload: Record<string, unknown>
  authorization_context: Record<string, unknown>
}

export type OfflinePushBatchPayload = {
  batch_id: string
  device_id: string
  operations: OfflinePushOperationPayload[]
}

export type OfflinePushRequestPlan = {
  method: "POST"
  path: "/wp-json/tcg-store/v1/offline/push"
  headers: {
    "idempotency-key": string
    "x-tcg-device-id": string
  }
  body: OfflinePushBatchPayload
  network_request_deferred: true
  direct_mysql_access: false
  provider_credentials_required: false
  device_authorization_header_deferred: true
}

export type OfflinePushResultSummary = {
  batch_id: string
  status: "accepted" | "conflict" | "rejected" | "validated"
  operation_count: number
  accepted_operation_ids: string[]
  conflict_operation_ids: string[]
  rejected_operation_ids: string[]
  server_time_utc: string
  push_queue_replay_deferred: boolean
  push_canonical_mutations_deferred: boolean
}

export type OfflineWorkspaceState = {
  navItems: NavItem[]
  syncRoutes: string[]
  connectorProfiles: StoreConnectorProfile[]
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
  connectorProfiles: [
    {
      id: "pug-game-shop-staging",
      companyName: "Pug Game Shop",
      companyShortName: "Pug",
      environment: "staging",
      status: "needs_pairing",
      wordpress: {
        scheme: "https",
        host: "vbf.2a7.myftpupload.com",
        restBasePath: "/wp-json/tcg-store/v1",
        authMode: "offline_device_token",
        credentialStorage: "desktop_secure_store",
        devicePairingRequired: true,
        networkRequestsDeferred: true,
      },
      square: {
        inventoryAuthority: "tcg_store_platform",
        paymentAuthority: "official_woocommerce_square_extension",
        providerWritesDeferred: true,
        sandboxRequired: true,
      },
      scrydex: {
        teamLabel: "Configured in WordPress",
        credentialStorage: "wordpress_server_settings",
        credentialsSyncedToApp: false,
      },
    },
    {
      id: "demo-company-development",
      companyName: "Demo Company",
      companyShortName: "Demo",
      environment: "development",
      status: "sandbox_only",
      wordpress: {
        scheme: "https",
        host: "demo-company.local",
        restBasePath: "/wp-json/tcg-store/v1",
        authMode: "offline_device_token",
        credentialStorage: "desktop_secure_store",
        devicePairingRequired: true,
        networkRequestsDeferred: true,
      },
      square: {
        inventoryAuthority: "tcg_store_platform",
        paymentAuthority: "official_woocommerce_square_extension",
        providerWritesDeferred: true,
        sandboxRequired: true,
      },
      scrydex: {
        teamLabel: "Per-company WordPress setting",
        credentialStorage: "wordpress_server_settings",
        credentialsSyncedToApp: false,
      },
    },
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

export function connectorDisplayUrl(profile: StoreConnectorProfile) {
  return `${profile.wordpress.scheme}://${profile.wordpress.host}`
}

export function findConnectorProfile(
  profiles: StoreConnectorProfile[],
  selectedId: string,
): StoreConnectorProfile {
  const selectedProfile = profiles.find((profile) => profile.id === selectedId)

  if (selectedProfile) {
    return selectedProfile
  }

  if (profiles[0]) {
    return profiles[0]
  }

  throw new Error("At least one connector profile is required.")
}

export function connectorStatusLabel(status: ConnectorStatus) {
  return status === "ready"
    ? "Ready"
    : status === "needs_pairing"
      ? "Needs device pairing"
      : "Sandbox only"
}

export function connectorHealthSummary(profile: StoreConnectorProfile) {
  return {
    company: profile.companyName,
    environment: profile.environment,
    website: connectorDisplayUrl(profile),
    restBasePath: profile.wordpress.restBasePath,
    status: connectorStatusLabel(profile.status),
    paymentAuthority: profile.square.paymentAuthority,
    squareInventoryAuthority: profile.square.inventoryAuthority,
    networkRequestsDeferred: profile.wordpress.networkRequestsDeferred,
    providerWritesDeferred: profile.square.providerWritesDeferred,
    scrydexCredentialStorage: profile.scrydex.credentialStorage,
    secretsSyncedToApp: profile.scrydex.credentialsSyncedToApp,
  }
}

export function filterInventoryItems(
  items: InventoryItem[],
  query: string,
  statusFilter: InventoryStatus | "all" = "all",
) {
  const normalized = query.trim().toLowerCase()

  return items
    .filter((item) => statusFilter === "all" || item.status === statusFilter)
    .filter((item) => {
      if (!normalized) {
        return true
      }

      return [item.cardName, item.setName, item.barcode, item.location]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    })
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
      sync_intent: "staff_inventory_update",
    }),
    authorization_context_json: JSON.stringify({
      manager_override: false,
      source: "offline_app",
    }),
    schema_version: 1,
  }
}

export function buildOfflinePushBatchPayload(
  operations: OfflineOperationEnvelope[],
  options: { batchId?: string; deviceId?: string } = {},
): OfflinePushBatchPayload {
  const firstOperation = operations[0]
  const deviceId = options.deviceId ?? firstOperation?.device_id ?? "local-device-preview"
  const stamp =
    firstOperation?.queued_at_utc.replace(/[^0-9]/g, "").slice(0, 14) ??
    new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)

  return {
    batch_id: options.batchId ?? `offline-batch-${deviceId}-${stamp}`,
    device_id: deviceId,
    operations: operations.map((operation) => ({
      client_operation_id: operation.client_operation_id,
      device_id: operation.device_id,
      location_id: operation.location_id,
      actor_id: operation.actor_id,
      operation_type: operation.operation_type,
      entity_type: operation.entity_type,
      entity_id: operation.entity_id,
      base_row_version: operation.base_row_version,
      occurred_at_local: operation.occurred_at_local,
      queued_at_utc: operation.queued_at_utc,
      payload: parseJsonObject(operation.payload_json),
      authorization_context: parseJsonObject(operation.authorization_context_json),
      schema_version: operation.schema_version,
    })),
  }
}

export function buildOfflinePushRequestPlan(batch: OfflinePushBatchPayload): OfflinePushRequestPlan {
  return {
    method: "POST",
    path: "/wp-json/tcg-store/v1/offline/push",
    headers: {
      "idempotency-key": batch.batch_id,
      "x-tcg-device-id": batch.device_id,
    },
    body: batch,
    network_request_deferred: true,
    direct_mysql_access: false,
    provider_credentials_required: false,
    device_authorization_header_deferred: true,
  }
}

export function summarizeOfflinePushResult(response: Record<string, unknown>): OfflinePushResultSummary {
  const data = objectValue(response.data) ?? response
  const meta = objectValue(response.meta) ?? {}
  const counts = objectValue(data.counts) ?? {}
  const results = Array.isArray(data.results) ? data.results : []
  const acceptedIds = operationIdsByStatus(results, "accepted")
  const conflictIds = operationIdsByStatus(results, "conflict")
  const rejectedIds = operationIdsByStatus(results, "rejected")
  const operationCount = numberValue(data.operation_count) ?? results.length
  const status =
    conflictIds.length > 0 || (numberValue(counts.conflict) ?? 0) > 0
      ? "conflict"
      : rejectedIds.length > 0 || (numberValue(counts.rejected) ?? 0) > 0
        ? "rejected"
        : acceptedIds.length > 0 || (numberValue(counts.accepted) ?? 0) > 0
          ? "accepted"
          : "validated"

  return {
    batch_id: stringValue(data.batch_id),
    status,
    operation_count: operationCount,
    accepted_operation_ids: acceptedIds,
    conflict_operation_ids: conflictIds,
    rejected_operation_ids: rejectedIds,
    server_time_utc: stringValue(data.server_time_utc),
    push_queue_replay_deferred: booleanValue(meta.push_queue_replay_deferred, true),
    push_canonical_mutations_deferred: booleanValue(meta.push_canonical_mutations_deferred, true),
  }
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return {}
  }

  return {}
}

function operationIdsByStatus(values: unknown[], status: string): string[] {
  return values
    .map((value) => objectValue(value))
    .filter((value): value is Record<string, unknown> => value !== null)
    .filter((value) => stringValue(value.status) === status)
    .map((value) => stringValue(value.client_operation_id))
    .filter((value) => value !== "")
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}
