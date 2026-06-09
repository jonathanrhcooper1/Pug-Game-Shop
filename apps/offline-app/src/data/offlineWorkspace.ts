export type IconName =
  | "box"
  | "sync"
  | "queue"
  | "alert"
  | "customer"
  | "event"
  | "settings"
  | "scan"
  | "wifi"
  | "card"
  | "history"

export type InventoryStatus = "available" | "reserved" | "conflict" | "pending_intake"
export type InventorySource = "cached" | "queued" | "accepted"
export type QueueTone = "success" | "warning" | "neutral"
export type ConnectorEnvironment = "development" | "staging" | "production"
export type ConnectorStatus = "ready" | "needs_pairing" | "sandbox_only"
export type ConnectorScheme = "http" | "https"

export type NavItem = {
  label: string
  icon: IconName
  active?: boolean
}

export type InventoryItem = {
  id: number
  publicId: string
  rowVersion: number
  providerCardId?: string
  game?: string
  cardName: string
  setName: string
  number: string
  setCode?: string
  condition: string
  barcode: string
  price: string
  priceMinorUnits: number
  currency: "USD"
  location: string
  status: InventoryStatus
  imageUrl?: string
  source: InventorySource
}

export type OfflineLabelPrintJob = {
  action: "offline_label_print_job"
  jobId: string
  profileId: string
  companyName: string
  companyShortName: string
  inventoryPublicId: string
  cardName: string
  setName: string
  cardNumber: string
  condition: string
  barcode: string
  price: string
  location: string
  format: "barcode-price-location"
  queuedAtUtc: string
  queuedAtLabel: string
  payloadText: string
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

export type ConflictResolutionAction =
  | "accept_server"
  | "accept_device"
  | "manager_adjust"
  | "retry_operation"
  | "dismiss"

export type ConflictItem = {
  conflictId: string
  rowVersion: number
  title: string
  detail: string
  action: string
  resolutionAction: ConflictResolutionAction
  resolutionNote: string
  entityType: "inventory" | "customer_credit" | "event"
  entityId: string
  baseRowVersion: number
  operationType: "inventory_update" | "credit_redemption" | "event_reservation" | "event_checkin"
  managerOverride: boolean
}

export type CustomerCreditSnapshot = {
  customerId: number
  customerPublicId?: string
  rowVersion: number
  label: string
  customerName?: string
  customerLookup?: string
  availableMinorUnits: number
  redemptionPreviewMinorUnits: number
  currency: "USD"
  note: string
}

export type CustomerCreditLedgerEntry = {
  entryId: string
  customerId: number
  occurredAtLabel: string
  description: string
  amountMinorUnits: number
  balanceAfterMinorUnits: number
  currency: "USD"
  status: "cached" | "pending_sync" | "accepted"
  sourceLabel: string
  operationId?: string
}

export type SquarePosCreditHandoffMode =
  | "custom_payment_method"
  | "other_tender"
  | "manual_discount"

export type CustomerCreditSquarePosHandoffPlan = {
  action: "customer_credit_square_pos_handoff"
  customerId: number
  customerName: string
  saleTotalMinorUnits: number
  creditRedeemedMinorUnits: number
  squareAmountDueMinorUnits: number
  currency: "USD"
  squarePaymentMethodLabel: "Pug Store Credit"
  squareHandoffMode: SquarePosCreditHandoffMode
  squareInstruction: string
  pugLedgerAuthority: true
  squareCreditBalanceAuthority: false
  offlineAllowed: boolean
  syncRequiredForLedgerPosting: true
}

export type EventRegistrationStatus = "open" | "waitlist" | "full" | "closed"
export type EventPaymentStatus = "not_required" | "pay_at_store"

export type EventSnapshot = {
  eventId: string
  rowVersion: number
  title: string
  startsAtUtc: string
  startsAtLabel: string
  registrationStatus: EventRegistrationStatus
  capacity: number
  registeredCount: number
  locationLabel: string
  note: string
}

export type OfflineEventQueuePreviewEntry = {
  operationId: string
  eventId: string
  operationType: "event_reservation" | "event_checkin"
  title: string
  attendeeLabel: string
  detail: string
  statusLabel: string
  sourceLabel: "Local queue"
  occurredAtLabel: string
  payloadSummary: string
  paymentStatus?: EventPaymentStatus
  registrationPublicId?: string
}

export type OfflineDeviceProfile = {
  storeLabel: string
  modeLabel: string
  lastSyncLabel: string
  installationId: string
  locationId: number
  managerId: number
  capabilities: {
    barcode_scanner: boolean
    label_printer: boolean
    touchscreen: boolean
  }
}

export type StoreConnectorProfile = {
  id: string
  companyName: string
  companyShortName: string
  environment: ConnectorEnvironment
  status: ConnectorStatus
  wordpress: {
    scheme: ConnectorScheme
    host: string
    restBasePath: "/wp-json/tcg-store/v1"
    authMode: "offline_device_token"
    credentialStorage: "desktop_secure_store"
    devicePairingRequired: boolean
    networkRequestsDeferred: true
    routeConnectedPushReady: boolean
    canonicalInventoryWritesEnabled: boolean
  }
  localSync: {
    topology: "lan_middleman_server"
    serverUrl: string
    setupStatusPath: "/setup/status"
    oneWebsiteMode: true
    localDatabase: "store-sync.sqlite"
    credentialsSyncedToApp: false
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

export type ConnectorProfileDraft = {
  id?: string
  companyName: string
  companyShortName: string
  siteUrl: string
  localSyncServerUrl: string
  environment: ConnectorEnvironment
  scrydexTeamLabel: string
  canonicalInventoryWritesEnabled: boolean
}

export type ConnectorProfileDraftResult = {
  profile: StoreConnectorProfile | null
  issues: string[]
}

export type OneWebsiteConnectorSetupPlan = {
  action: "one_website_connector_setup_plan"
  profileId: string
  companyName: string
  websiteUrl: string
  localSyncServerUrl: string
  topology: "lan_middleman_server"
  setupStatusPath: "/setup/status"
  setupScreenMode: "single_configurable_website"
  profileSelection: "disabled_single_installation"
  syncPath: ["offline_app", "local_sync_server", "wordpress_woocommerce_plugin"]
  credentialsSyncedToApp: false
  directWordPressAccess: false
  directMysqlAccess: false
  squarePaymentCaptureSupported: false
}

export const CONNECTOR_PROFILE_STORAGE_KEY = "tcg-store-offline-connector-profiles-v1"
export const PREPARED_PAIRING_STORAGE_KEY = "tcg-store-offline-prepared-pairings-v1"
export const PAIRED_DEVICE_STORAGE_KEY = "tcg-store-offline-paired-devices-v1"
export const OFFLINE_SESSION_STORAGE_KEY = "tcg-store-offline-session-state-v1"
export const OFFLINE_SESSION_STORAGE_KEY_PREFIX = `${OFFLINE_SESSION_STORAGE_KEY}:`

export type ConnectorProfileStorageSnapshot = {
  action: "offline_connector_profiles_local_storage"
  schema_version: 1
  one_website_mode: true
  profile_selection_disabled: true
  profiles: StoreConnectorProfile[]
  active_profile_id: string
  saved_at_utc: string
  credentialsSyncedToApp: false
}

export type ConnectorProfileStorageRestoreResult = {
  profiles: StoreConnectorProfile[]
  activeProfileId: string
  restored: boolean
  issues: string[]
}

export type PreparedPairingStorageSnapshot = {
  action: "offline_prepared_pairings_local_storage"
  schema_version: 1
  requests: PreparedDevicePairingRequest[]
  saved_at_utc: string
  rawPairingCodeStored: false
  credentialsSyncedToApp: false
}

export type PreparedPairingStorageRestoreResult = {
  requests: PreparedDevicePairingRequest[]
  restored: boolean
  issues: string[]
}

export type PairedDeviceTokenStatus = "stored" | "missing" | "unchecked"

export type PairedDeviceRecord = {
  id: string
  profileId: string
  companyName: string
  siteUrl: string
  devicePublicId: string
  requestedScopes: DevicePairingRequestPlan["requestedScopes"]
  tokenStorage: "desktop_secure_store"
  tokenStatus: PairedDeviceTokenStatus
  tokenLength: number
  pairedAtUtc: string
  expiresAtUtc: string
  rawTokenStoredInBrowser: false
  rawTokenReturnedToUi: false
  credentialsSyncedToApp: false
}

export type PairedDeviceStorageSnapshot = {
  action: "offline_paired_devices_local_storage"
  schema_version: 1
  records: PairedDeviceRecord[]
  saved_at_utc: string
  rawTokenStoredInBrowser: false
  rawTokenReturnedToUi: false
  credentialsSyncedToApp: false
}

export type PairedDeviceStorageRestoreResult = {
  records: PairedDeviceRecord[]
  restored: boolean
  issues: string[]
}

export type OfflineSyncAttemptRecord = {
  id: string
  companyName: string
  siteUrl: string
  operationCount: number
  pairingStatus: string
  createdAtLabel: string
  networkStatus: "Deferred"
}

export type OfflineSessionStorageSnapshot = {
  action: "offline_session_state_local_storage"
  schema_version: 1
  profile_id: string
  queued_operations: OfflineOperationEnvelope[]
  sync_attempts: OfflineSyncAttemptRecord[]
  saved_at_utc: string
  networkRequestsDeferred: true
  directMysqlAccess: false
  credentialsSyncedToApp: false
}

export type OfflineSessionStorageRestoreResult = {
  queuedOperations: OfflineOperationEnvelope[]
  syncAttempts: OfflineSyncAttemptRecord[]
  restored: boolean
  issues: string[]
}

export type OfflineConnectorRouteManifest = {
  path: string
  method: string
  required_scope: string
  permission_strategy: string
  live_enabled_by_default: boolean
}

export type OfflineConnectorManifest = {
  status: "ready" | "degraded"
  action: "offline_connector_manifest"
  profile_manifest_ready: boolean
  profile_id: string
  environment: ConnectorEnvironment
  connector_identity?: {
    profile_id: string
    company_key: string
    company_name: string
    site_host: string
    environment: ConnectorEnvironment
    site_fingerprint: string
    rest_base_url: string
    connector_manifest_url: string
    credential_boundary: "public_safe_no_secrets"
  }
  company: {
    name: string
    short_name?: string
  }
  wordpress: {
    site_url: string
    site_url_secure: boolean
    rest_namespace: "tcg-store/v1"
    rest_base_path: "/wp-json/tcg-store/v1"
    rest_base_url: string
    connector_manifest_url: string
    auth_mode: "offline_device_token"
    device_pairing_required: boolean
    credential_storage: "desktop_secure_store"
    network_requests_deferred: boolean
    route_registration_deferred: boolean
    route_connected_push_ready: boolean
    canonical_inventory_operation_count: number
    canonical_inventory_execution_enabled: boolean
    canonical_inventory_writes_deferred: boolean
    https_required_for_remote_pairing: boolean
  }
  offline_routes: OfflineConnectorRouteManifest[]
  offline_route_count: number
  square: {
    inventory_authority: "tcg_store_platform"
    payment_authority: "official_woocommerce_square_extension"
    provider_inventory_writes_deferred: boolean
    payment_capture_deferred: boolean
    production_provider_writes_deferred: boolean
    production_payment_capture_deferred: boolean
  }
  scrydex: {
    configured: boolean
    environment: string
    base_url: string
    team_id_configured: boolean
    active_key_slot: string
    credential_storage: "wordpress_server_settings"
    credential_values_redacted: boolean
    credentials_synced_to_app: false
    network_requests_deferred: boolean
    database_writes_deferred: boolean
    configuration_issues: string[]
  }
  credentials_synced_to_app: false
  production_credentials_deferred: boolean
  manifest_public_safe: boolean
}

export type ConnectorManifestValidation = {
  status: "accepted" | "warning" | "rejected"
  profile: StoreConnectorProfile
  routeCount: number
  endpointCount: number
  issues: string[]
  manifestPublicSafe: boolean
  credentialsSyncedToApp: false
}

export type ConnectorTestCheckStatus = "pass" | "warning" | "blocked"

export type ConnectorTestCheck = {
  label: string
  status: ConnectorTestCheckStatus
  detail: string
}

export type OfflineConnectorTestReport = {
  action: "offline_connector_test_report"
  profileId: string
  companyName: string
  siteUrl: string
  environment: ConnectorEnvironment
  generatedAtLabel: string
  status: ConnectorTestCheckStatus
  routeCount: number
  endpointCount: number
  checks: ConnectorTestCheck[]
  issues: string[]
  networkRequestsDeferred: true
  credentialsSyncedToApp: false
  directMysqlAccess: false
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
    | "event_checkin"
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

export type OfflineConflictResolutionRequestBody = {
  conflict_id: string
  resolution_id: string
  device_id: string
  manager_id: number
  resolution_action: ConflictResolutionAction
  resolution_note: string
  resolved_at_utc: string
  expected_conflict_version: number
  resolution_payload: {
    conflict_title: string
    conflict_detail: string
    entity_type: ConflictItem["entityType"]
    entity_id: string
    operation_type: ConflictItem["operationType"]
    base_row_version: number
    requested_action: string
    manager_override: boolean
    source: "offline_app"
  }
  schema_version: 1
}

export type OfflinePullRequestBody = {
  device_id: string
  domains: ["inventory", "customer_credit", "events", "conflicts"]
  cursors: Record<string, string>
  page_size: number
  include_tombstones: boolean
  schema_version: 1
}

export type OfflinePullInventoryCacheRecord = {
  public_id: string
  row_version: number
  card_name: string
  set_name: string
  card_number: string
  condition: string
  barcode: string
  sale_price_minor_units: number
  sale_currency: "USD"
  location_label: string
  status: InventoryStatus
  updated_at_utc: string
}

export type OfflinePullInventoryCacheApplyResult = {
  items: InventoryItem[]
  appliedCount: number
  insertedCount: number
  updatedCount: number
  ignoredCount: number
  changedPublicIds: string[]
}

export type OfflinePullCustomerCreditCacheRecord = {
  customer_id: number
  row_version: number
  label: string
  available_minor_units: number
  currency: "USD"
  note: string
  updated_at_utc: string
}

export type OfflinePullCustomerCreditCacheApplyResult = {
  customerCredit: CustomerCreditSnapshot
  appliedCount: number
  updatedCount: number
  ignoredCount: number
}

export type OfflinePullEventCacheRecord = {
  entity_id: string
  row_version: number
  title: string
  starts_at_utc: string
  starts_at_label: string
  registration_status: EventRegistrationStatus
  capacity: number
  registered_count: number
  location_label: string
  note: string
  updated_at_utc: string
}

export type OfflinePullEventCacheApplyResult = {
  events: EventSnapshot[]
  appliedCount: number
  insertedCount: number
  updatedCount: number
  ignoredCount: number
  changedEventIds: string[]
}

export type OfflinePullConflictCacheRecord = {
  conflict_id: string
  row_version: number
  title: string
  detail: string
  action: string
  resolution_action?: ConflictResolutionAction
  resolution_note?: string
  entity_type: ConflictItem["entityType"]
  entity_id: string
  base_row_version: number
  operation_type: ConflictItem["operationType"]
  manager_override: boolean
  updated_at_utc: string
}

export type OfflinePullConflictCacheApplyResult = {
  conflicts: ConflictItem[]
  appliedCount: number
  insertedCount: number
  updatedCount: number
  ignoredCount: number
  changedConflictIds: string[]
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

export type OfflineConnectorSyncSessionPlan = {
  action: "offline_connector_sync_session_plan"
  profileId: string
  companyName: string
  siteUrl: string
  environment: ConnectorEnvironment
  restBasePath: "/wp-json/tcg-store/v1"
  pull: {
    method: "POST"
    path: "/wp-json/tcg-store/v1/offline/pull"
    url: string
    network_request_deferred: true
    device_authorization_header_deferred: true
  }
  push: {
    method: "POST"
    path: "/wp-json/tcg-store/v1/offline/push"
    url: string
    batch_id: string
    operation_count: number
    network_request_deferred: true
    device_authorization_header_deferred: true
    route_connected_push_ready: boolean
    canonical_inventory_operation_count: number
    canonical_inventory_execution_enabled: boolean
    canonical_inventory_writes_deferred: boolean
  }
  prepared_pairing_available: boolean
  pairing_code_fingerprint: string
  paired_device_available: boolean
  paired_device_public_id: string
  desktop_token_status: PairedDeviceTokenStatus
  desktop_token_available: boolean
  device_pairing_required: boolean
  device_token_storage: "desktop_secure_store"
  direct_mysql_access: false
  provider_credentials_required: false
  credentialsSyncedToApp: false
  network_request_deferred: true
}

export type OfflinePullRefreshPreview = {
  action: "offline_pull_refresh_preview"
  profileId: string
  companyName: string
  siteUrl: string
  generatedAtLabel: string
  pullCursor: string
  inventoryRowsRefreshed: number
  customerCreditRowsRefreshed: number
  eventRowsRefreshed: number
  conflictRowsRefreshed: number
  queuedOperationsPreserved: number
  changedInventoryPublicIds: string[]
  localCacheRefreshApplied: true
  networkRequestDeferred: true
  deviceAuthorizationHeaderDeferred: true
  credentialsSyncedToApp: false
  directMysqlAccess: false
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
  canonical_inventory_execution_enabled: boolean
  canonical_inventory_writes_deferred: boolean
}

export type OfflinePushQueueApplyResult = {
  remainingOperations: OfflineOperationEnvelope[]
  removedOperationIds: string[]
  retainedConflictOperationIds: string[]
  retainedRejectedOperationIds: string[]
  ignoredAcceptedOperationIds: string[]
  acceptedCount: number
  conflictCount: number
  rejectedCount: number
  queueReplayApplied: boolean
}

export type DevicePairingRequestPlan = {
  method: "POST"
  path: "/wp-json/tcg-store/v1/offline/devices/register"
  profileId: string
  companyName: string
  siteUrl: string
  pairingCodeProvided: boolean
  pairingCodeFingerprint: string
  requestedScopes: ["offline_pull", "offline_push", "conflicts"]
  bodyPreview: {
    pairing_code_redacted: boolean
    installation_id: string
    device_label: string
    device_mode: "staff"
    mode: "staff"
    platform: "windows"
    app_version: string
    location_id: number
    manager_id: number
    capabilities: OfflineDeviceProfile["capabilities"]
    schema_version: 1
  }
  tokenStorage: "desktop_secure_store"
  networkRequestDeferred: true
  productionTokenIssuanceDeferred: true
  credentialsSyncedToApp: false
}

export type DevicePairingRequestBody = {
  pairing_code: string
  installation_id: string
  device_label: string
  device_mode: "staff"
  location_id: number
  manager_id: number
  app_version: string
  platform: "windows"
  capabilities: OfflineDeviceProfile["capabilities"]
  requested_scopes: DevicePairingRequestPlan["requestedScopes"]
  schema_version: 1
}

export type PreparedDevicePairingRequest = {
  id: string
  method: "POST"
  path: "/wp-json/tcg-store/v1/offline/devices/register"
  profileId: string
  companyName: string
  siteUrl: string
  requestedScopes: DevicePairingRequestPlan["requestedScopes"]
  pairingCodeFingerprint: string
  tokenStorage: "desktop_secure_store"
  status: "prepared_local"
  mode: "staff"
  platform: "windows"
  createdAtUtc: string
  networkRequestDeferred: true
  rawPairingCodeStored: false
}

export type OfflineWorkspaceState = {
  navItems: NavItem[]
  syncRoutes: string[]
  connectorProfiles: StoreConnectorProfile[]
  device: OfflineDeviceProfile
  syncSummary: SyncSummaryItem[]
  inventoryItems: InventoryItem[]
  queueItems: QueueItem[]
  conflicts: ConflictItem[]
  customerCredit: CustomerCreditSnapshot
  customerCreditDirectory: CustomerCreditSnapshot[]
  customerCreditLedgerEntries: CustomerCreditLedgerEntry[]
  eventSnapshots: EventSnapshot[]
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
    { label: "Status", icon: "history" },
    { label: "Kiosk", icon: "scan" },
    { label: "Queue", icon: "queue" },
    { label: "Events", icon: "event" },
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
        routeConnectedPushReady: true,
        canonicalInventoryWritesEnabled: false,
      },
      localSync: {
        topology: "lan_middleman_server",
        serverUrl: "http://127.0.0.1:8787",
        setupStatusPath: "/setup/status",
        oneWebsiteMode: true,
        localDatabase: "store-sync.sqlite",
        credentialsSyncedToApp: false,
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
  ],
  device: {
    storeLabel: "Front Counter",
    modeLabel: "Offline Mode",
    lastSyncLabel: "Today 10:42 AM",
    installationId: "front-counter-install",
    locationId: 2,
    managerId: 42,
    capabilities: {
      barcode_scanner: true,
      label_printer: false,
      touchscreen: true,
    },
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
      publicId: "inv-1001",
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
      publicId: "inv-1002",
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
      publicId: "inv-1003",
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
      publicId: "inv-1004",
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
      conflictId: "conflict-inv-1004-location",
      rowVersion: 2,
      title: "Mox Amber location mismatch",
      detail: "Local scan says MTG Tray; website snapshot says Sold.",
      action: "Use website",
      resolutionAction: "accept_server",
      resolutionNote: "Manager chose the website snapshot for this inventory conflict.",
      entityType: "inventory",
      entityId: "inv-1004",
      baseRowVersion: 17,
      operationType: "inventory_update",
      managerOverride: false,
    },
    {
      conflictId: "conflict-credit-91-redemption",
      rowVersion: 1,
      title: "Credit redemption needs manager",
      detail: "$28.00 offline credit use awaits approval.",
      action: "Approve",
      resolutionAction: "accept_device",
      resolutionNote: "Manager approved the offline customer credit redemption.",
      entityType: "customer_credit",
      entityId: "customer-91",
      baseRowVersion: 6,
      operationType: "credit_redemption",
      managerOverride: true,
    },
  ],
  customerCredit: {
    customerId: 91,
    customerPublicId: "customer-91",
    rowVersion: 6,
    label: "Customer credit",
    customerName: "Morgan Lee",
    customerLookup: "morgan@example.test",
    availableMinorUnits: 24600,
    redemptionPreviewMinorUnits: 2800,
    currency: "USD",
    note: "Cached balance available for offline redemption. Ledger replay stays pending until push acceptance.",
  },
  customerCreditDirectory: [
    {
      customerId: 91,
      customerPublicId: "customer-91",
      rowVersion: 6,
      label: "Customer credit",
      customerName: "Morgan Lee",
      customerLookup: "morgan@example.test",
      availableMinorUnits: 24600,
      redemptionPreviewMinorUnits: 2800,
      currency: "USD",
      note: "Cached balance available for offline redemption. Ledger replay stays pending until push acceptance.",
    },
    {
      customerId: 104,
      customerPublicId: "customer-104",
      rowVersion: 3,
      label: "Customer credit",
      customerName: "Avery Chen",
      customerLookup: "avery@example.test",
      availableMinorUnits: 7250,
      redemptionPreviewMinorUnits: 1250,
      currency: "USD",
      note: "Cached league-night credit available for offline redemption.",
    },
    {
      customerId: 117,
      customerPublicId: "customer-117",
      rowVersion: 2,
      label: "Customer credit",
      customerName: "Riley Patel",
      customerLookup: "riley@example.test",
      availableMinorUnits: 0,
      redemptionPreviewMinorUnits: 0,
      currency: "USD",
      note: "No cached credit remains; website ledger stays authoritative after reconnect.",
    },
  ],
  customerCreditLedgerEntries: [
    {
      entryId: "ledger-91-buylist-001",
      customerId: 91,
      occurredAtLabel: "Jun 7, 4:18 PM",
      description: "Buylist payout approved",
      amountMinorUnits: 5000,
      balanceAfterMinorUnits: 24600,
      currency: "USD",
      status: "cached",
      sourceLabel: "Website cache",
    },
    {
      entryId: "ledger-91-purchase-002",
      customerId: 91,
      occurredAtLabel: "Jun 6, 2:42 PM",
      description: "Singles purchase redemption",
      amountMinorUnits: -1800,
      balanceAfterMinorUnits: 19600,
      currency: "USD",
      status: "cached",
      sourceLabel: "Website cache",
    },
    {
      entryId: "ledger-104-league-001",
      customerId: 104,
      occurredAtLabel: "Jun 5, 7:05 PM",
      description: "League prize credit",
      amountMinorUnits: 7250,
      balanceAfterMinorUnits: 7250,
      currency: "USD",
      status: "cached",
      sourceLabel: "Website cache",
    },
    {
      entryId: "ledger-117-purchase-001",
      customerId: 117,
      occurredAtLabel: "Jun 4, 1:11 PM",
      description: "Store credit redemption",
      amountMinorUnits: -1200,
      balanceAfterMinorUnits: 0,
      currency: "USD",
      status: "cached",
      sourceLabel: "Website cache",
    },
  ],
  eventSnapshots: [
    {
      eventId: "event-100",
      rowVersion: 3,
      title: "Friday Commander Night",
      startsAtUtc: "2026-06-12T23:00:00Z",
      startsAtLabel: "Fri Jun 12, 7:00 PM",
      registrationStatus: "open",
      capacity: 24,
      registeredCount: 10,
      locationLabel: "Event Room",
      note: "Cached event ready for offline check-in and registration review.",
    },
    {
      eventId: "event-101",
      rowVersion: 2,
      title: "Pokemon League Challenge",
      startsAtUtc: "2026-06-14T17:00:00Z",
      startsAtLabel: "Sun Jun 14, 1:00 PM",
      registrationStatus: "waitlist",
      capacity: 32,
      registeredCount: 32,
      locationLabel: "Main Tables",
      note: "Waitlist state cached for offline staff review.",
    },
  ],
}

export function statusLabel(status: InventoryStatus) {
  if (status === "available") {
    return "Available"
  }
  if (status === "reserved") {
    return "Reserved"
  }
  if (status === "pending_intake") {
    return "Pending Intake"
  }
  return "Conflict"
}

export function inventoryQuantityDeltaFromInput(value: string): number | null {
  const normalized = value.trim()

  if (!/^[+-]?\d+$/.test(normalized)) {
    return null
  }

  const parsed = Number(normalized)

  if (!Number.isSafeInteger(parsed) || parsed === 0 || parsed < -99 || parsed > 99) {
    return null
  }

  return parsed
}

export function cleanInventoryAdjustmentReason(
  value: string,
  fallback = "staff offline quantity correction",
): string {
  const cleaned = value.trim().replace(/\s+/g, " ")

  return cleaned ? cleaned.slice(0, 120) : fallback
}

function cleanLabelPrintText(value: string, fallback: string, maxLength = 72): string {
  const cleaned = value.trim().replace(/\s+/g, " ")

  return (cleaned || fallback).slice(0, maxLength)
}

export function buildOfflineLabelPrintJob(
  item: InventoryItem,
  profile: StoreConnectorProfile,
  options: {
    queuedAt?: Date
  } = {},
): OfflineLabelPrintJob {
  const queuedAt = options.queuedAt ?? new Date()
  const queuedAtUtc = queuedAt.toISOString()
  const companyShortName = cleanLabelPrintText(
    profile.companyShortName,
    profile.companyName,
    32,
  )
  const cardName = cleanLabelPrintText(item.cardName, "Unknown card")
  const setLine =
    `${cleanLabelPrintText(item.setName, "Unknown set", 48)} ` +
    `#${cleanLabelPrintText(item.number, "N/A", 24)}`
  const condition = cleanLabelPrintText(item.condition, "Condition pending", 28)
  const price = cleanLabelPrintText(item.price, "$0.00", 24)
  const barcode = cleanLabelPrintText(item.barcode, item.publicId, 64)
  const location = cleanLabelPrintText(item.location, "Unassigned", 48)
  const payloadText = [
    companyShortName,
    cardName,
    `${setLine} ${condition}`,
    `Price ${price}`,
    `Barcode ${barcode}`,
    `Location ${location}`,
  ].join("\n")

  return {
    action: "offline_label_print_job",
    jobId:
      `label-${profile.id}-${item.publicId}-` +
      queuedAtUtc.replace(/[^0-9]/g, "").slice(0, 14),
    profileId: profile.id,
    companyName: profile.companyName,
    companyShortName,
    inventoryPublicId: item.publicId,
    cardName,
    setName: cleanLabelPrintText(item.setName, "Unknown set", 48),
    cardNumber: cleanLabelPrintText(item.number, "N/A", 24),
    condition,
    barcode,
    price,
    location,
    format: "barcode-price-location",
    queuedAtUtc,
    queuedAtLabel: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(queuedAt),
    payloadText,
  }
}

export function eventRegistrationStatusLabel(status: EventRegistrationStatus) {
  return status === "open" ? "Open" : status === "waitlist" ? "Waitlist" : status === "full" ? "Full" : "Closed"
}

function eventQueueOperationDateLabel(utcValue: string): string {
  const date = new Date(utcValue)

  if (Number.isNaN(date.getTime())) {
    return "Pending sync"
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date)
}

function eventPaymentStatusQueueLabel(status?: EventPaymentStatus): string {
  return status === "pay_at_store" ? "Pay at store" : "Payment not required"
}

function cleanEventPaymentStatus(value: unknown): EventPaymentStatus {
  return stringValue(value) === "pay_at_store" ? "pay_at_store" : "not_required"
}

function eventRegistrationSourceQueueLabel(value: unknown): string {
  const source = stringValue(value)

  if (source === "phone") {
    return "Phone"
  }

  if (source === "staff") {
    return "Staff"
  }

  return "Walk-in"
}

function eventCheckinMethodQueueLabel(value: unknown): string {
  const method = stringValue(value)

  if (method === "qr_scan") {
    return "QR scan"
  }

  if (method === "manual_lookup") {
    return "Manual lookup"
  }

  return "Offline app"
}

function eventQueueRegistrationStatusLabel(value: unknown): string {
  const status = stringValue(value)

  if (status === "waitlist") {
    return "Waitlist registration"
  }

  if (status === "full") {
    return "Capacity review"
  }

  return "Registration"
}

export function buildOfflineEventQueuePreviewEntries(
  operations: OfflineOperationEnvelope[],
  events: EventSnapshot[],
): OfflineEventQueuePreviewEntry[] {
  const eventsById = new Map(events.map((event) => [event.eventId, event]))

  return operations
    .filter(
      (operation) =>
        operation.entity_type === "event" &&
        (operation.operation_type === "event_reservation" ||
          operation.operation_type === "event_checkin"),
    )
    .map((operation) => {
      const payload = parseJsonObject(operation.payload_json)
      const eventId = stringValue(payload.event_id) || operation.entity_id
      const event = eventsById.get(eventId)
      const title = stringValue(payload.event_title) || event?.title || eventId
      const occurredAtLabel = eventQueueOperationDateLabel(operation.queued_at_utc)

      if (operation.operation_type === "event_checkin") {
        const attendeeLabel = cleanOfflineEventAttendeeLabel(
          stringValue(payload.attendee_label),
          "Offline attendee",
        )
        const registrationPublicId =
          stringValue(payload.registration_public_id) ||
          cleanOfflineEventRegistrationPublicId("", eventId)
        const methodLabel = eventCheckinMethodQueueLabel(payload.checkin_method)
        const checkinStatus = stringValue(payload.checkin_status) || "checked_in"

        return {
          operationId: operation.client_operation_id,
          eventId,
          operationType: "event_checkin",
          title,
          attendeeLabel,
          detail:
            `${attendeeLabel} check-in queued for ${title}; ` +
            `registration ${registrationPublicId}; ${methodLabel}.`,
          statusLabel: "Check-in",
          sourceLabel: "Local queue",
          occurredAtLabel,
          payloadSummary:
            `${methodLabel}; method ${stringValue(payload.checkin_method) || "offline_app"}; ` +
            `status ${checkinStatus}; operation ${operation.client_operation_id}`,
          registrationPublicId,
        }
      }

      const attendeeLabel = cleanOfflineEventAttendeeLabel(
        stringValue(payload.attendee_label),
        "Offline walk-in",
      )
      const paymentStatus = cleanEventPaymentStatus(payload.payment_status)
      const paymentLabel = eventPaymentStatusQueueLabel(paymentStatus)
      const seatsRemaining = numberValue(payload.seats_remaining_snapshot)
      const seatsLabel =
        seatsRemaining === null
          ? "capacity snapshot unavailable"
          : `${seatsRemaining} cached seat${seatsRemaining === 1 ? "" : "s"} remaining`
      const sourceLabel = eventRegistrationSourceQueueLabel(payload.registration_source)
      const statusLabel = eventQueueRegistrationStatusLabel(
        payload.registration_status_snapshot,
      )

      return {
        operationId: operation.client_operation_id,
        eventId,
        operationType: "event_reservation",
        title,
        attendeeLabel,
        detail:
          `${attendeeLabel} registration queued for ${title}; ` +
          `${paymentLabel}; ${seatsLabel}.`,
        statusLabel,
        sourceLabel: "Local queue",
        occurredAtLabel,
        payloadSummary:
          `${sourceLabel} source; ${paymentLabel}; operation ${operation.client_operation_id}`,
        paymentStatus,
      }
    })
}

export function cleanOfflineEventAttendeeLabel(
  value: string,
  fallback = "Offline walk-in",
) {
  const cleaned = value.trim().replace(/\s+/g, " ")

  return cleaned ? cleaned.slice(0, 80) : fallback
}

export function cleanOfflineEventRegistrationPublicId(
  value: string,
  eventId: string,
) {
  const cleaned = value
    .trim()
    .replace(/[^A-Za-z0-9_.:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96)

  return cleaned || `registration-${eventId}-walkin`
}

export function formatMoney(minorUnits: number, currency: "USD") {
  return new Intl.NumberFormat("en-US", {
    currency,
    style: "currency",
  }).format(minorUnits / 100)
}

export function creditRedemptionInputFromMinorUnits(minorUnits: number) {
  const safeMinorUnits = Math.max(0, Math.trunc(minorUnits))

  return (safeMinorUnits / 100).toFixed(2)
}

export function creditRedemptionInputToMinorUnits(value: string) {
  const normalized = value.trim().replace(/^\$/, "").replaceAll(",", "")

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null
  }

  const parsed = Number(normalized)

  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed * 100)
}

export function customerCreditAvailableAfterPending(
  credit: CustomerCreditSnapshot,
  pendingMinorUnits: number,
) {
  return Math.max(0, credit.availableMinorUnits - Math.max(0, pendingMinorUnits))
}

export function customerCreditDisplayName(credit: CustomerCreditSnapshot): string {
  return credit.customerName?.trim() || credit.label
}

export function findCustomerCreditSnapshot(
  credits: CustomerCreditSnapshot[],
  customerId: number,
): CustomerCreditSnapshot | null {
  return credits.find((credit) => credit.customerId === customerId) ?? credits[0] ?? null
}

export function upsertCustomerCreditSnapshot(
  credits: CustomerCreditSnapshot[],
  snapshot: CustomerCreditSnapshot,
): CustomerCreditSnapshot[] {
  const hasExistingCredit = credits.some((credit) => credit.customerId === snapshot.customerId)

  if (!hasExistingCredit) {
    return [snapshot, ...credits]
  }

  return credits.map((credit) => (credit.customerId === snapshot.customerId ? snapshot : credit))
}

export function customerCreditLedgerEntriesForCustomer(
  entries: CustomerCreditLedgerEntry[],
  customerId: number,
): CustomerCreditLedgerEntry[] {
  return entries.filter((entry) => entry.customerId === customerId)
}

function creditLedgerDateLabel(utcValue: string): string {
  const date = new Date(utcValue)

  if (Number.isNaN(date.getTime())) {
    return "Pending sync"
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date)
}

export function buildPendingCustomerCreditLedgerEntries(
  operations: OfflineOperationEnvelope[],
  credit: CustomerCreditSnapshot,
): CustomerCreditLedgerEntry[] {
  let pendingTotalMinorUnits = 0

  return operations
    .filter(
      (operation) =>
        operation.operation_type === "credit_redemption" &&
        operation.entity_type === "customer_credit" &&
        operation.entity_id === String(credit.customerId),
    )
    .map((operation) => {
      let amountMinorUnits = 0

      try {
        const payload = JSON.parse(operation.payload_json) as { amount_minor_units?: unknown }
        amountMinorUnits =
          typeof payload.amount_minor_units === "number" && Number.isFinite(payload.amount_minor_units)
            ? Math.max(0, Math.trunc(payload.amount_minor_units))
            : 0
      } catch {
        amountMinorUnits = 0
      }

      pendingTotalMinorUnits += amountMinorUnits

      return {
        entryId: `pending-${operation.client_operation_id}`,
        customerId: credit.customerId,
        occurredAtLabel: creditLedgerDateLabel(operation.queued_at_utc),
        description: "Offline credit redemption",
        amountMinorUnits: -amountMinorUnits,
        balanceAfterMinorUnits: Math.max(0, credit.availableMinorUnits - pendingTotalMinorUnits),
        currency: credit.currency,
        status: "pending_sync",
        sourceLabel: "Local queue",
        operationId: operation.client_operation_id,
      }
    })
}

export function customerCreditPendingMinorUnitsFromOperations(
  operations: OfflineOperationEnvelope[],
  customerId: number,
): number {
  return operations
    .filter(
      (operation) =>
        operation.operation_type === "credit_redemption" &&
        operation.entity_type === "customer_credit" &&
        operation.entity_id === String(customerId),
    )
    .reduce((totalMinorUnits, operation) => {
      try {
        const payload = JSON.parse(operation.payload_json) as { amount_minor_units?: unknown }
        const amountMinorUnits =
          typeof payload.amount_minor_units === "number" && Number.isFinite(payload.amount_minor_units)
            ? Math.max(0, Math.trunc(payload.amount_minor_units))
            : 0

        return totalMinorUnits + amountMinorUnits
      } catch {
        return totalMinorUnits
      }
    }, 0)
}

export function buildCustomerCreditSquarePosHandoffPlan(
  credit: CustomerCreditSnapshot,
  amountMinorUnits: number,
  saleTotalMinorUnits: number,
  options: {
    mode?: SquarePosCreditHandoffMode
    paymentMethodLabel?: "Pug Store Credit"
    offlineAllowed?: boolean
  } = {},
): CustomerCreditSquarePosHandoffPlan {
  const saleTotal = Math.max(0, Math.trunc(saleTotalMinorUnits))
  const requestedCredit = Math.max(0, Math.trunc(amountMinorUnits))
  const boundedCredit = Math.min(requestedCredit, saleTotal, credit.availableMinorUnits)
  const mode = options.mode ?? "custom_payment_method"
  const label = options.paymentMethodLabel ?? "Pug Store Credit"
  const squareAmountDue = Math.max(0, saleTotal - boundedCredit)
  const instruction =
    mode === "manual_discount"
      ? `Apply ${formatMoney(boundedCredit, credit.currency)} as a manual Square discount named ${label}, then collect ${formatMoney(squareAmountDue, credit.currency)} in Square POS.`
      : `Record ${formatMoney(boundedCredit, credit.currency)} as ${label} in Square POS, then collect ${formatMoney(squareAmountDue, credit.currency)} with the customer's remaining tender.`

  return {
    action: "customer_credit_square_pos_handoff",
    customerId: credit.customerId,
    customerName: customerCreditDisplayName(credit),
    saleTotalMinorUnits: saleTotal,
    creditRedeemedMinorUnits: boundedCredit,
    squareAmountDueMinorUnits: squareAmountDue,
    currency: credit.currency,
    squarePaymentMethodLabel: label,
    squareHandoffMode: mode,
    squareInstruction: instruction,
    pugLedgerAuthority: true,
    squareCreditBalanceAuthority: false,
    offlineAllowed: options.offlineAllowed ?? true,
    syncRequiredForLedgerPosting: true,
  }
}

export function connectorDisplayUrl(profile: StoreConnectorProfile) {
  return `${profile.wordpress.scheme}://${profile.wordpress.host}`
}

export function localSyncServerDisplayUrl(profile: StoreConnectorProfile) {
  return profile.localSync.serverUrl
}

export function buildOneWebsiteConnectorSetupPlan(profile: StoreConnectorProfile): OneWebsiteConnectorSetupPlan {
  return {
    action: "one_website_connector_setup_plan",
    profileId: profile.id,
    companyName: profile.companyName,
    websiteUrl: connectorDisplayUrl(profile),
    localSyncServerUrl: localSyncServerDisplayUrl(profile),
    topology: profile.localSync.topology,
    setupStatusPath: profile.localSync.setupStatusPath,
    setupScreenMode: "single_configurable_website",
    profileSelection: "disabled_single_installation",
    syncPath: ["offline_app", "local_sync_server", "wordpress_woocommerce_plugin"],
    credentialsSyncedToApp: false,
    directWordPressAccess: false,
    directMysqlAccess: false,
    squarePaymentCaptureSupported: false,
  }
}

export function connectorManifestUrl(profile: StoreConnectorProfile) {
  return `${connectorDisplayUrl(profile)}${profile.wordpress.restBasePath}/offline/connector-manifest`
}

export function connectorManifestUnavailableGuidance(detail: string) {
  const normalized = detail.toLowerCase()

  if (normalized.includes("http 404") || normalized.includes("not found")) {
    return "WordPress REST is reachable, but TCG Store connector routes are not registered. Install and activate the staging plugin package, then confirm offline route gates before pairing."
  }

  if (normalized.includes("timed out")) {
    return "The website did not answer the public manifest request in time. Recheck staging hosting availability before pairing this device."
  }

  if (normalized.includes("json")) {
    return "The endpoint responded, but not with a connector manifest. Confirm the plugin route is active and not replaced by a theme, cache, or security page."
  }

  return "Validate the local preview, then install or activate the staging plugin package before attempting device pairing."
}

function connectorRestUrl(
  profile: StoreConnectorProfile,
  path: "/offline/pull" | "/offline/push" | `/offline/conflicts/${string}/resolve`,
) {
  return `${connectorDisplayUrl(profile)}${profile.wordpress.restBasePath}${path}`
}

export function connectorOfflineConflictResolutionUrl(
  profile: StoreConnectorProfile,
  conflictId: string,
) {
  return connectorRestUrl(
    profile,
    `/offline/conflicts/${encodeURIComponent(conflictId.trim())}/resolve`,
  )
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

export function createEmptyConnectorProfileDraft(): ConnectorProfileDraft {
  return {
    companyName: "",
    companyShortName: "",
    siteUrl: "",
    localSyncServerUrl: "http://127.0.0.1:8787",
    environment: "staging",
    scrydexTeamLabel: "Configured in WordPress",
    canonicalInventoryWritesEnabled: false,
  }
}

export function connectorProfileDraftFromProfile(
  profile: StoreConnectorProfile,
): ConnectorProfileDraft {
  return {
    id: profile.id,
    companyName: profile.companyName,
    companyShortName: profile.companyShortName,
    siteUrl: connectorDisplayUrl(profile),
    localSyncServerUrl: localSyncServerDisplayUrl(profile),
    environment: profile.environment,
    scrydexTeamLabel: profile.scrydex.teamLabel,
    canonicalInventoryWritesEnabled: profile.wordpress.canonicalInventoryWritesEnabled,
  }
}

export function buildConnectorProfileFromDraft(
  draft: ConnectorProfileDraft,
): ConnectorProfileDraftResult {
  const issues: string[] = []
  const companyName = draft.companyName.trim()
  const companyShortName = draft.companyShortName.trim() || companyName
  const scrydexTeamLabel = draft.scrydexTeamLabel.trim() || "Configured in WordPress"
  const environment = cleanConnectorEnvironment(draft.environment)
  const canonicalInventoryWritesEnabled =
    environment !== "production" && draft.canonicalInventoryWritesEnabled
  const site = parseConnectorSiteInput(draft.siteUrl)
  const localSyncServerUrl = normalizeLocalSyncServerUrl(draft.localSyncServerUrl)

  if (!companyName) {
    issues.push("Company name is required.")
  }

  if (!site) {
    issues.push("A valid WordPress website host or URL is required.")
  }

  if (!site || !companyName) {
    return { profile: null, issues }
  }

  if (
    site.scheme === "http" &&
    environment === "production"
  ) {
    issues.push("Production connectors require HTTPS before pairing.")
  }

  if (environment === "production" && draft.canonicalInventoryWritesEnabled) {
    issues.push("Production connectors cannot enable canonical inventory writes from the local profile.")
  }

  return {
    profile: {
      id: safeConnectorId(draft.id ?? "", companyName, environment, site.host),
      companyName,
      companyShortName,
      environment,
      status: environment === "development" ? "sandbox_only" : "needs_pairing",
      wordpress: {
        scheme: site.scheme,
        host: site.host,
        restBasePath: "/wp-json/tcg-store/v1",
        authMode: "offline_device_token",
        credentialStorage: "desktop_secure_store",
        devicePairingRequired: true,
        networkRequestsDeferred: true,
        routeConnectedPushReady: true,
        canonicalInventoryWritesEnabled,
      },
      localSync: {
        topology: "lan_middleman_server",
        serverUrl: localSyncServerUrl,
        setupStatusPath: "/setup/status",
        oneWebsiteMode: true,
        localDatabase: "store-sync.sqlite",
        credentialsSyncedToApp: false,
      },
      square: {
        inventoryAuthority: "tcg_store_platform",
        paymentAuthority: "official_woocommerce_square_extension",
        providerWritesDeferred: true,
        sandboxRequired: environment !== "production",
      },
      scrydex: {
        teamLabel: scrydexTeamLabel,
        credentialStorage: "wordpress_server_settings",
        credentialsSyncedToApp: false,
      },
    },
    issues,
  }
}

export function upsertConnectorProfile(
  profiles: StoreConnectorProfile[],
  profile: StoreConnectorProfile,
): StoreConnectorProfile[] {
  void profiles

  return sanitizeConnectorProfiles([profile])
}

export function buildConnectorProfileStorageSnapshot(
  profiles: StoreConnectorProfile[],
  activeProfileId: string,
  options: { savedAtUtc?: string } = {},
): ConnectorProfileStorageSnapshot {
  const safeProfiles = sanitizeConnectorProfiles(profiles)
  const activeProfile = findConnectorProfile(safeProfiles, activeProfileId)

  return {
    action: "offline_connector_profiles_local_storage",
    schema_version: 1,
    one_website_mode: true,
    profile_selection_disabled: true,
    profiles: safeProfiles,
    active_profile_id: activeProfile.id,
    saved_at_utc: options.savedAtUtc ?? new Date().toISOString(),
    credentialsSyncedToApp: false,
  }
}

export function restoreConnectorProfileStorageSnapshot(
  rawValue: string | null,
  fallbackProfiles: StoreConnectorProfile[],
): ConnectorProfileStorageRestoreResult {
  const fallback = sanitizeConnectorProfiles(fallbackProfiles)
  const fallbackActiveProfileId = fallback[0]?.id ?? "pug-game-shop-staging"

  if (!rawValue) {
    return {
      profiles: fallback,
      activeProfileId: fallbackActiveProfileId,
      restored: false,
      issues: [],
    }
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<ConnectorProfileStorageSnapshot>
    const profileValues = sanitizeConnectorProfiles(parsed.profiles ?? [])

    if (
      parsed.action !== "offline_connector_profiles_local_storage" ||
      parsed.schema_version !== 1 ||
      parsed.credentialsSyncedToApp !== false ||
      profileValues.length === 0
    ) {
      return {
        profiles: fallback,
        activeProfileId: fallbackActiveProfileId,
        restored: false,
        issues: ["connector_profile_storage_invalid"],
      }
    }

    const activeProfileId = findConnectorProfile(
      profileValues,
      typeof parsed.active_profile_id === "string" ? parsed.active_profile_id : "",
    ).id

    return {
      profiles: profileValues,
      activeProfileId,
      restored: true,
      issues: [],
    }
  } catch {
    return {
      profiles: fallback,
      activeProfileId: fallbackActiveProfileId,
      restored: false,
      issues: ["connector_profile_storage_parse_failed"],
    }
  }
}

export function buildPreparedPairingStorageSnapshot(
  requests: PreparedDevicePairingRequest[],
  profiles: StoreConnectorProfile[],
  options: { savedAtUtc?: string } = {},
): PreparedPairingStorageSnapshot {
  return {
    action: "offline_prepared_pairings_local_storage",
    schema_version: 1,
    requests: sanitizePreparedPairingRequests(requests, profiles),
    saved_at_utc: options.savedAtUtc ?? new Date().toISOString(),
    rawPairingCodeStored: false,
    credentialsSyncedToApp: false,
  }
}

export function restorePreparedPairingStorageSnapshot(
  rawValue: string | null,
  profiles: StoreConnectorProfile[],
): PreparedPairingStorageRestoreResult {
  if (!rawValue) {
    return {
      requests: [],
      restored: false,
      issues: [],
    }
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PreparedPairingStorageSnapshot>
    const requests = sanitizePreparedPairingRequests(parsed.requests ?? [], profiles)

    if (
      parsed.action !== "offline_prepared_pairings_local_storage" ||
      parsed.schema_version !== 1 ||
      parsed.rawPairingCodeStored !== false ||
      parsed.credentialsSyncedToApp !== false ||
      requests.length === 0
    ) {
      return {
        requests: [],
        restored: false,
        issues: ["prepared_pairing_storage_invalid"],
      }
    }

    return {
      requests,
      restored: true,
      issues: [],
    }
  } catch {
    return {
      requests: [],
      restored: false,
      issues: ["prepared_pairing_storage_parse_failed"],
    }
  }
}

export function buildPairedDeviceRecord(
  profile: StoreConnectorProfile,
  input: {
    devicePublicId: string
    requestedScopes: DevicePairingRequestPlan["requestedScopes"] | string[]
    tokenStatus?: PairedDeviceTokenStatus
    tokenLength?: number
    pairedAtUtc?: string
    expiresAtUtc?: string
  },
): PairedDeviceRecord {
  const pairedAtUtc = normalizeUtcDateString(input.pairedAtUtc, new Date().toISOString())
  const expiresAtUtc = normalizeUtcDateString(
    input.expiresAtUtc,
    new Date(Date.parse(pairedAtUtc) + 30 * 24 * 60 * 60 * 1000).toISOString(),
  )
  const devicePublicId = safeRecordIdPart(input.devicePublicId, `${profile.id}-desktop-device`)
  const pairedStamp = pairedAtUtc.replace(/[^0-9]/g, "").slice(0, 14)

  return {
    id: `paired-device-${profile.id}-${devicePublicId}-${pairedStamp}`,
    profileId: profile.id,
    companyName: profile.companyName,
    siteUrl: connectorDisplayUrl(profile),
    devicePublicId,
    requestedScopes: sanitizeDevicePairingScopes(input.requestedScopes),
    tokenStorage: "desktop_secure_store",
    tokenStatus: cleanPairedDeviceTokenStatus(input.tokenStatus ?? "unchecked"),
    tokenLength: Math.max(0, Math.floor(input.tokenLength ?? 0)),
    pairedAtUtc,
    expiresAtUtc,
    rawTokenStoredInBrowser: false,
    rawTokenReturnedToUi: false,
    credentialsSyncedToApp: false,
  }
}

export function buildPairedDeviceStorageSnapshot(
  records: PairedDeviceRecord[],
  profiles: StoreConnectorProfile[],
  options: { savedAtUtc?: string } = {},
): PairedDeviceStorageSnapshot {
  return {
    action: "offline_paired_devices_local_storage",
    schema_version: 1,
    records: sanitizePairedDeviceRecords(records, profiles),
    saved_at_utc: options.savedAtUtc ?? new Date().toISOString(),
    rawTokenStoredInBrowser: false,
    rawTokenReturnedToUi: false,
    credentialsSyncedToApp: false,
  }
}

export function restorePairedDeviceStorageSnapshot(
  rawValue: string | null,
  profiles: StoreConnectorProfile[],
): PairedDeviceStorageRestoreResult {
  if (!rawValue) {
    return {
      records: [],
      restored: false,
      issues: [],
    }
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PairedDeviceStorageSnapshot>
    const records = sanitizePairedDeviceRecords(parsed.records ?? [], profiles)

    if (
      parsed.action !== "offline_paired_devices_local_storage" ||
      parsed.schema_version !== 1 ||
      parsed.rawTokenStoredInBrowser !== false ||
      parsed.rawTokenReturnedToUi !== false ||
      parsed.credentialsSyncedToApp !== false ||
      records.length === 0
    ) {
      return {
        records: [],
        restored: false,
        issues: ["paired_device_storage_invalid"],
      }
    }

    return {
      records,
      restored: true,
      issues: [],
    }
  } catch {
    return {
      records: [],
      restored: false,
      issues: ["paired_device_storage_parse_failed"],
    }
  }
}

export function findPairedDeviceRecord(
  records: PairedDeviceRecord[],
  profileId: string,
): PairedDeviceRecord | null {
  return records.find((record) => record.profileId === profileId) ?? null
}

export function offlineSessionStorageKey(profileId: string): string {
  const cleanProfileId = profileId
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `${OFFLINE_SESSION_STORAGE_KEY_PREFIX}${cleanProfileId || "default"}`
}

export function buildOfflineSessionStorageSnapshot(
  queuedOperations: OfflineOperationEnvelope[],
  syncAttempts: OfflineSyncAttemptRecord[],
  options: { savedAtUtc?: string; profileId?: string } = {},
): OfflineSessionStorageSnapshot {
  return {
    action: "offline_session_state_local_storage",
    schema_version: 1,
    profile_id: options.profileId ?? "legacy",
    queued_operations: sanitizeOfflineOperationEnvelopes(queuedOperations),
    sync_attempts: sanitizeOfflineSyncAttempts(syncAttempts),
    saved_at_utc: options.savedAtUtc ?? new Date().toISOString(),
    networkRequestsDeferred: true,
    directMysqlAccess: false,
    credentialsSyncedToApp: false,
  }
}

export function restoreOfflineSessionStorageSnapshot(
  rawValue: string | null,
  options: { profileId?: string; allowLegacyProfile?: boolean } = {},
): OfflineSessionStorageRestoreResult {
  if (!rawValue) {
    return {
      queuedOperations: [],
      syncAttempts: [],
      restored: false,
      issues: [],
    }
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<OfflineSessionStorageSnapshot>
    const queuedOperations = sanitizeOfflineOperationEnvelopes(parsed.queued_operations ?? [])
    const syncAttempts = sanitizeOfflineSyncAttempts(parsed.sync_attempts ?? [])
    const parsedProfileId = stringValue(parsed.profile_id)
    const expectedProfileId = options.profileId ?? ""
    const profileMatches =
      expectedProfileId === "" ||
      parsedProfileId === expectedProfileId ||
      (parsedProfileId === "" && options.allowLegacyProfile === true)

    if (
      parsed.action !== "offline_session_state_local_storage" ||
      parsed.schema_version !== 1 ||
      !profileMatches ||
      parsed.networkRequestsDeferred !== true ||
      parsed.directMysqlAccess !== false ||
      parsed.credentialsSyncedToApp !== false ||
      (queuedOperations.length === 0 && syncAttempts.length === 0)
    ) {
      return {
        queuedOperations: [],
        syncAttempts: [],
        restored: false,
        issues: ["offline_session_storage_invalid"],
      }
    }

    return {
      queuedOperations,
      syncAttempts,
      restored: true,
      issues: [],
    }
  } catch {
    return {
      queuedOperations: [],
      syncAttempts: [],
      restored: false,
      issues: ["offline_session_storage_parse_failed"],
    }
  }
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
    oneWebsiteMode: profile.localSync.oneWebsiteMode,
    setupScreenMode: "single_configurable_website",
    setupStatusPath: profile.localSync.setupStatusPath,
    localSyncServer: localSyncServerDisplayUrl(profile),
    status: connectorStatusLabel(profile.status),
    paymentAuthority: profile.square.paymentAuthority,
    squareInventoryAuthority: profile.square.inventoryAuthority,
    networkRequestsDeferred: profile.wordpress.networkRequestsDeferred,
    routeConnectedPushReady: profile.wordpress.routeConnectedPushReady,
    canonicalInventoryWritesEnabled: profile.wordpress.canonicalInventoryWritesEnabled,
    canonicalInventoryWritesDeferred: !profile.wordpress.canonicalInventoryWritesEnabled,
    providerWritesDeferred: profile.square.providerWritesDeferred,
    scrydexCredentialStorage: profile.scrydex.credentialStorage,
    secretsSyncedToApp: profile.scrydex.credentialsSyncedToApp,
  }
}

export const offlineConnectorRoutePreview: OfflineConnectorRouteManifest[] = [
  {
    path: "/offline/devices/register",
    method: "POST",
    required_scope: "",
    permission_strategy: "pairing_code_plus_manager_callback",
    live_enabled_by_default: false,
  },
  {
    path: "/offline/pull",
    method: "POST",
    required_scope: "offline_pull",
    permission_strategy: "offline_device_token",
    live_enabled_by_default: false,
  },
  {
    path: "/offline/push",
    method: "POST",
    required_scope: "offline_push",
    permission_strategy: "offline_device_token",
    live_enabled_by_default: false,
  },
  {
    path: "/offline/conflicts",
    method: "GET",
    required_scope: "",
    permission_strategy: "manager_conflict_resolution_callback",
    live_enabled_by_default: false,
  },
  {
    path: "/offline/conflicts/(?P<conflict_id>[a-zA-Z0-9_-]+)/resolve",
    method: "POST",
    required_scope: "",
    permission_strategy: "manager_conflict_resolution_callback",
    live_enabled_by_default: false,
  },
]

export function buildConnectorManifestPreview(
  profile: StoreConnectorProfile,
  routes: OfflineConnectorRouteManifest[] = offlineConnectorRoutePreview,
): OfflineConnectorManifest {
  const siteUrl = connectorDisplayUrl(profile)

  return {
    status: profile.environment === "development" ? "degraded" : "ready",
    action: "offline_connector_manifest",
    profile_manifest_ready: true,
    profile_id: profile.id,
    environment: profile.environment,
    connector_identity: {
      profile_id: profile.id,
      company_key: safeRecordIdPart(profile.companyShortName, profile.companyName),
      company_name: profile.companyName,
      site_host: profile.wordpress.host,
      environment: profile.environment,
      site_fingerprint: connectorSiteFingerprint(siteUrl, profile.environment),
      rest_base_url: `${siteUrl}${profile.wordpress.restBasePath}`,
      connector_manifest_url: connectorManifestUrl(profile),
      credential_boundary: "public_safe_no_secrets",
    },
    company: {
      name: profile.companyName,
      short_name: profile.companyShortName,
    },
    wordpress: {
      site_url: siteUrl,
      site_url_secure: profile.wordpress.scheme === "https",
      rest_namespace: "tcg-store/v1",
      rest_base_path: profile.wordpress.restBasePath,
      rest_base_url: `${siteUrl}${profile.wordpress.restBasePath}`,
      connector_manifest_url: connectorManifestUrl(profile),
      auth_mode: profile.wordpress.authMode,
      device_pairing_required: profile.wordpress.devicePairingRequired,
      credential_storage: profile.wordpress.credentialStorage,
      network_requests_deferred: profile.wordpress.networkRequestsDeferred,
      route_registration_deferred: true,
      route_connected_push_ready: profile.wordpress.routeConnectedPushReady,
      canonical_inventory_operation_count: 0,
      canonical_inventory_execution_enabled: profile.wordpress.canonicalInventoryWritesEnabled,
      canonical_inventory_writes_deferred: !profile.wordpress.canonicalInventoryWritesEnabled,
      https_required_for_remote_pairing: true,
    },
    offline_routes: routes,
    offline_route_count: routes.length,
    square: {
      inventory_authority: profile.square.inventoryAuthority,
      payment_authority: profile.square.paymentAuthority,
      provider_inventory_writes_deferred: profile.square.providerWritesDeferred,
      payment_capture_deferred: true,
      production_provider_writes_deferred: true,
      production_payment_capture_deferred: true,
    },
    scrydex: {
      configured: true,
      environment: profile.environment,
      base_url: "wordpress-server-configured",
      team_id_configured: true,
      active_key_slot: "redacted",
      credential_storage: profile.scrydex.credentialStorage,
      credential_values_redacted: true,
      credentials_synced_to_app: profile.scrydex.credentialsSyncedToApp,
      network_requests_deferred: true,
      database_writes_deferred: true,
      configuration_issues: [],
    },
    credentials_synced_to_app: false,
    production_credentials_deferred: true,
    manifest_public_safe: true,
  }
}

export function validateConnectorManifest(
  manifest: OfflineConnectorManifest,
  options: { localSyncServerUrl?: string } = {},
): ConnectorManifestValidation {
  const issues: string[] = []
  const site = parseManifestSite(manifest.wordpress.site_url)

  if (manifest.action !== "offline_connector_manifest") {
    issues.push("Manifest action must be offline_connector_manifest.")
  }

  if (!manifest.profile_manifest_ready) {
    issues.push("Manifest is not marked ready for profile creation.")
  }

  if (!manifest.manifest_public_safe) {
    issues.push("Manifest must be marked public-safe before desktop import.")
  }

  if (manifest.credentials_synced_to_app !== false) {
    issues.push("Manifest must not sync WordPress, ScryDex, Square, or SSH credentials to the app.")
  }

  if (manifest.connector_identity) {
    if (manifest.connector_identity.profile_id !== manifest.profile_id) {
      issues.push("Connector identity profile ID must match the manifest profile ID.")
    }

    if (manifest.connector_identity.environment !== manifest.environment) {
      issues.push("Connector identity environment must match the manifest environment.")
    }

    if (manifest.connector_identity.credential_boundary !== "public_safe_no_secrets") {
      issues.push("Connector identity must declare the public-safe no-secrets credential boundary.")
    }
  }

  if (manifest.scrydex.credentials_synced_to_app !== false) {
    issues.push("ScryDex credentials must remain in WordPress server settings.")
  }

  if (!manifest.scrydex.credential_values_redacted) {
    issues.push("ScryDex credential values must be redacted in the connector manifest.")
  }

  if (manifest.wordpress.auth_mode !== "offline_device_token") {
    issues.push("WordPress auth mode must use offline device tokens.")
  }

  if (manifest.wordpress.credential_storage !== "desktop_secure_store") {
    issues.push("Device credentials must be stored in the desktop secure store.")
  }

  if (
    manifest.wordpress.canonical_inventory_execution_enabled &&
    !manifest.wordpress.route_connected_push_ready
  ) {
    issues.push("Canonical inventory writes require the route-connected push handler.")
  }

  if (
    manifest.environment === "production" &&
    manifest.wordpress.canonical_inventory_execution_enabled
  ) {
    issues.push("Production connectors cannot enable canonical inventory writes from the local profile.")
  }

  if (manifest.square.payment_authority !== "official_woocommerce_square_extension") {
    issues.push("Square payment authority must stay with the official WooCommerce Square extension.")
  }

  if (manifest.square.inventory_authority !== "tcg_store_platform") {
    issues.push("Square inventory authority must be the TCG Store Platform plugin.")
  }

  if (manifest.offline_route_count !== manifest.offline_routes.length) {
    issues.push("Offline route count must match the manifest route list.")
  }

  if (!site) {
    issues.push("WordPress site URL must be a valid website URL.")
  } else if (
    site.scheme === "http" &&
    manifest.environment === "production" &&
    manifest.wordpress.https_required_for_remote_pairing
  ) {
    issues.push("Production connector pairing requires HTTPS.")
  }

  if (
    site &&
    manifest.wordpress.connector_manifest_url !==
      `${site.scheme}://${site.host}${manifest.wordpress.rest_base_path}/offline/connector-manifest`
  ) {
    issues.push("Connector manifest URL must match the WordPress REST base.")
  }

  if (
    site &&
    manifest.connector_identity &&
    manifest.connector_identity.site_host !== site.host
  ) {
    issues.push("Connector identity host must match the WordPress site host.")
  }

  if (
    manifest.connector_identity &&
    manifest.connector_identity.rest_base_url !== manifest.wordpress.rest_base_url
  ) {
    issues.push("Connector identity REST base URL must match the WordPress REST base.")
  }

  if (
    manifest.connector_identity &&
    manifest.connector_identity.connector_manifest_url !== manifest.wordpress.connector_manifest_url
  ) {
    issues.push("Connector identity manifest URL must match the WordPress manifest URL.")
  }

  const rejected =
    !site ||
    manifest.action !== "offline_connector_manifest" ||
    !manifest.manifest_public_safe ||
    manifest.credentials_synced_to_app !== false ||
    manifest.scrydex.credentials_synced_to_app !== false ||
    manifest.wordpress.auth_mode !== "offline_device_token" ||
    manifest.wordpress.credential_storage !== "desktop_secure_store" ||
    (
      manifest.wordpress.canonical_inventory_execution_enabled &&
      !manifest.wordpress.route_connected_push_ready
    ) ||
    (
      manifest.environment === "production" &&
      manifest.wordpress.canonical_inventory_execution_enabled
    ) ||
    manifest.square.payment_authority !== "official_woocommerce_square_extension"
  const status = rejected ? "rejected" : issues.length > 0 || manifest.status === "degraded" ? "warning" : "accepted"
  const profile = connectorProfileFromManifest(manifest, site, options.localSyncServerUrl)

  return {
    status,
    profile,
    routeCount: manifest.offline_routes.length,
    endpointCount: manifest.offline_routes.filter((route) => route.method && route.path).length,
    issues,
    manifestPublicSafe: manifest.manifest_public_safe,
    credentialsSyncedToApp: false,
  }
}

export function buildConnectorTestReport(
  profile: StoreConnectorProfile,
  validation: ConnectorManifestValidation = validateConnectorManifest(
    buildConnectorManifestPreview(profile),
  ),
  preparedPairingRequest: PreparedDevicePairingRequest | null = null,
  options: { generatedAt?: Date } = {},
): OfflineConnectorTestReport {
  const hasPreparedPairing = preparedPairingRequest?.profileId === profile.id
  const canonicalInventoryWritesReady =
    profile.wordpress.routeConnectedPushReady &&
    profile.wordpress.canonicalInventoryWritesEnabled &&
    profile.environment !== "production"
  const generatedAt = options.generatedAt ?? new Date()
  const checks: ConnectorTestCheck[] = [
    {
      label: "Manifest shape",
      status:
        validation.status === "accepted"
          ? "pass"
          : validation.status === "warning"
            ? "warning"
            : "blocked",
      detail: `${validation.endpointCount} endpoint(s) across ${validation.routeCount} offline route(s); public-safe manifest ${validation.manifestPublicSafe ? "yes" : "no"}.`,
    },
    {
      label: "Route map",
      status: validation.routeCount >= 3 && validation.endpointCount === validation.routeCount ? "pass" : "warning",
      detail: `${profile.wordpress.restBasePath}/offline/pull and /offline/push are planned for ${connectorDisplayUrl(profile)}.`,
    },
    {
      label: "LAN server binding",
      status: profile.localSync.oneWebsiteMode && profile.localSync.setupStatusPath === "/setup/status" ? "pass" : "blocked",
      detail: `${localSyncServerDisplayUrl(profile)}${profile.localSync.setupStatusPath} must report the same WordPress website before local sync runs.`,
    },
    {
      label: "Pairing readiness",
      status: hasPreparedPairing ? "pass" : "warning",
      detail: hasPreparedPairing
        ? `Prepared pairing fingerprint ${preparedPairingRequest.pairingCodeFingerprint}; token storage ${preparedPairingRequest.tokenStorage}.`
        : "No raw code or token is stored; prepare pairing before live sync.",
    },
    {
      label: "Guarded inventory holds",
      status:
        profile.environment === "production" && profile.wordpress.canonicalInventoryWritesEnabled
          ? "blocked"
          : canonicalInventoryWritesReady
            ? "pass"
            : "warning",
      detail: canonicalInventoryWritesReady
        ? "Route-connected canonical inventory execution is enabled for this non-production connector."
        : "Inventory hold writes remain deferred for this connector.",
    },
    {
      label: "Credential boundary",
      status: validation.credentialsSyncedToApp ? "blocked" : "pass",
      detail: "WordPress, ScryDex, Square, SSH, and payment credentials stay out of the offline profile.",
    },
    {
      label: "Network reachability",
      status: "warning",
      detail: "Live requests are deferred until the desktop pairing/token adapter is connected.",
    },
  ]
  const status = checks.some((check) => check.status === "blocked")
    ? "blocked"
    : checks.some((check) => check.status === "warning")
      ? "warning"
      : "pass"

  return {
    action: "offline_connector_test_report",
    profileId: profile.id,
    companyName: profile.companyName,
    siteUrl: connectorDisplayUrl(profile),
    environment: profile.environment,
    generatedAtLabel: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(generatedAt),
    status,
    routeCount: validation.routeCount,
    endpointCount: validation.endpointCount,
    checks,
    issues: validation.issues,
    networkRequestsDeferred: true,
    credentialsSyncedToApp: false,
    directMysqlAccess: false,
  }
}

export function buildDevicePairingRequestPlan(
  profile: StoreConnectorProfile,
  device: OfflineDeviceProfile,
  pairingCode: string,
): DevicePairingRequestPlan {
  const normalizedPairingCode = pairingCode.trim()

  return {
    method: "POST",
    path: "/wp-json/tcg-store/v1/offline/devices/register",
    profileId: profile.id,
    companyName: profile.companyName,
    siteUrl: connectorDisplayUrl(profile),
    pairingCodeProvided: normalizedPairingCode.length > 0,
    pairingCodeFingerprint: pairingCodeFingerprint(normalizedPairingCode),
    requestedScopes: ["offline_pull", "offline_push", "conflicts"],
    bodyPreview: {
      pairing_code_redacted: true,
      installation_id: device.installationId,
      device_label: device.storeLabel,
      device_mode: "staff",
      mode: "staff",
      platform: "windows",
      app_version: "0.162.0",
      location_id: device.locationId,
      manager_id: device.managerId,
      capabilities: device.capabilities,
      schema_version: 1,
    },
    tokenStorage: "desktop_secure_store",
    networkRequestDeferred: true,
    productionTokenIssuanceDeferred: true,
    credentialsSyncedToApp: false,
  }
}

export function buildDevicePairingRequestBody(
  plan: DevicePairingRequestPlan,
  pairingCode: string,
): DevicePairingRequestBody | null {
  const normalizedPairingCode = pairingCode.trim()

  if (!plan.pairingCodeProvided || normalizedPairingCode.length === 0) {
    return null
  }

  return {
    pairing_code: normalizedPairingCode,
    installation_id: plan.bodyPreview.installation_id,
    device_label: plan.bodyPreview.device_label,
    device_mode: plan.bodyPreview.device_mode,
    location_id: plan.bodyPreview.location_id,
    manager_id: plan.bodyPreview.manager_id,
    app_version: plan.bodyPreview.app_version,
    platform: plan.bodyPreview.platform,
    capabilities: plan.bodyPreview.capabilities,
    requested_scopes: plan.requestedScopes,
    schema_version: plan.bodyPreview.schema_version,
  }
}

export function buildPreparedDevicePairingRequest(
  plan: DevicePairingRequestPlan,
  options: { createdAtUtc?: string } = {},
): PreparedDevicePairingRequest | null {
  if (!plan.pairingCodeProvided) {
    return null
  }

  const createdAtUtc = options.createdAtUtc ?? new Date().toISOString()
  const requestStamp = createdAtUtc.replace(/[^0-9]/g, "").slice(0, 14)

  return {
    id: `prepared-pairing-${plan.profileId}-${plan.pairingCodeFingerprint}-${requestStamp}`,
    method: plan.method,
    path: plan.path,
    profileId: plan.profileId,
    companyName: plan.companyName,
    siteUrl: plan.siteUrl,
    requestedScopes: plan.requestedScopes,
    pairingCodeFingerprint: plan.pairingCodeFingerprint,
    tokenStorage: plan.tokenStorage,
    status: "prepared_local",
    mode: plan.bodyPreview.mode,
    platform: plan.bodyPreview.platform,
    createdAtUtc,
    networkRequestDeferred: true,
    rawPairingCodeStored: false,
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

      return [item.cardName, item.setName, item.barcode, item.publicId, item.location]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    })
}

export function findInventoryItemByScan(items: InventoryItem[], scanValue: string) {
  const normalized = normalizeScanValue(scanValue)

  if (!normalized) {
    return null
  }

  return (
    items.find(
      (item) =>
        normalizeScanValue(item.barcode) === normalized ||
        normalizeScanValue(item.publicId) === normalized,
    ) ?? null
  )
}

export function findInventoryItem(items: InventoryItem[], selectedId: number) {
  return items.find((item) => item.id === selectedId) ?? items[0]
}

function normalizeScanValue(value: string) {
  return value.trim().toLowerCase()
}

function connectorProfileFromManifest(
  manifest: OfflineConnectorManifest,
  site: { scheme: ConnectorScheme; host: string } | null,
  localSyncServerUrl = "http://127.0.0.1:8787",
): StoreConnectorProfile {
  const environment = cleanConnectorEnvironment(manifest.environment)
  const safeSite = site ?? { scheme: "https" as const, host: "offline.local" }
  const manifestProfileId = manifest.connector_identity?.profile_id || manifest.profile_id

  return {
    id: safeConnectorId(manifestProfileId, manifest.company.name, environment, safeSite.host),
    companyName: manifest.company.name || "TCG Store",
    companyShortName: manifest.company.short_name || manifest.company.name || "TCG",
    environment,
    status:
      environment === "development"
        ? "sandbox_only"
        : manifest.wordpress.device_pairing_required
          ? "needs_pairing"
          : "ready",
    wordpress: {
      scheme: safeSite.scheme,
      host: safeSite.host,
      restBasePath: "/wp-json/tcg-store/v1",
      authMode: "offline_device_token",
      credentialStorage: "desktop_secure_store",
      devicePairingRequired: manifest.wordpress.device_pairing_required,
      networkRequestsDeferred: true,
      routeConnectedPushReady: manifest.wordpress.route_connected_push_ready !== false,
      canonicalInventoryWritesEnabled:
        environment !== "production" &&
        manifest.wordpress.route_connected_push_ready !== false &&
        manifest.wordpress.canonical_inventory_execution_enabled,
    },
    localSync: {
      topology: "lan_middleman_server",
      serverUrl: normalizeLocalSyncServerUrl(localSyncServerUrl),
      setupStatusPath: "/setup/status",
      oneWebsiteMode: true,
      localDatabase: "store-sync.sqlite",
      credentialsSyncedToApp: false,
    },
    square: {
      inventoryAuthority: "tcg_store_platform",
      paymentAuthority: "official_woocommerce_square_extension",
      providerWritesDeferred: true,
      sandboxRequired: environment !== "production",
    },
    scrydex: {
      teamLabel: manifest.scrydex.team_id_configured
        ? "Configured in WordPress"
        : "Needs WordPress team setting",
      credentialStorage: "wordpress_server_settings",
      credentialsSyncedToApp: false,
    },
  }
}

function parseManifestSite(value: string): { scheme: ConnectorScheme; host: string } | null {
  try {
    const parsed = new URL(value)
    const scheme = parsed.protocol.replace(":", "") as ConnectorScheme

    if ((scheme !== "https" && scheme !== "http") || !parsed.host) {
      return null
    }

    return {
      scheme,
      host: parsed.host,
    }
  } catch {
    return null
  }
}

function parseConnectorSiteInput(value: string): { scheme: ConnectorScheme; host: string } | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const secureScheme: ConnectorScheme = "https"
  const rawValue = trimmed.includes("://") ? trimmed : `${secureScheme}://${trimmed}`
  const site = parseManifestSite(rawValue)

  if (!site) {
    return null
  }

  try {
    const parsed = new URL(rawValue)

    if (parsed.username || parsed.password) {
      return null
    }
  } catch {
    return null
  }

  return site
}

function normalizeLocalSyncServerUrl(value: string): string {
  const trimmed = value.trim()
  const rawValue = trimmed
    ? trimmed.includes("://")
      ? trimmed
      : `http://${trimmed}`
    : "http://127.0.0.1:8787"

  try {
    const parsed = new URL(rawValue)

    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.host || parsed.username || parsed.password) {
      return "http://127.0.0.1:8787"
    }

    parsed.pathname = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "")
    parsed.search = ""
    parsed.hash = ""

    return parsed.toString().replace(/\/$/, "")
  } catch {
    return "http://127.0.0.1:8787"
  }
}

function cleanConnectorEnvironment(value: string): ConnectorEnvironment {
  return value === "development" || value === "staging" || value === "production"
    ? value
    : "development"
}

function cleanPairedDeviceTokenStatus(value: unknown): PairedDeviceTokenStatus {
  return value === "stored" || value === "missing" || value === "unchecked" ? value : "unchecked"
}

function hasRequiredDevicePairingScopes(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.includes("offline_pull") &&
    value.includes("offline_push") &&
    value.includes("conflicts")
  )
}

function sanitizeDevicePairingScopes(
  value: unknown,
): DevicePairingRequestPlan["requestedScopes"] {
  return hasRequiredDevicePairingScopes(value)
    ? ["offline_pull", "offline_push", "conflicts"]
    : ["offline_pull", "offline_push", "conflicts"]
}

function sanitizePullCursors(cursors: Record<string, string>): Record<string, string> {
  const supportedDomains = ["inventory", "customer_credit", "events", "conflicts"]
  const safeCursors: Record<string, string> = {}

  for (const [domain, cursor] of Object.entries(cursors)) {
    const safeDomain = domain.trim().toLowerCase()
    const safeCursor = cursor.trim()

    if (
      supportedDomains.includes(safeDomain) &&
      /^[a-zA-Z0-9._:-]{1,256}$/.test(safeCursor)
    ) {
      safeCursors[safeDomain] = safeCursor
    }
  }

  return safeCursors
}

function sanitizeOfflinePullInventoryCacheRecords(
  records: OfflinePullInventoryCacheRecord[],
): OfflinePullInventoryCacheRecord[] {
  if (!Array.isArray(records)) {
    return []
  }

  return records
    .filter((record) =>
      record &&
      typeof record.public_id === "string" &&
      record.public_id.trim() !== "" &&
      typeof record.row_version === "number" &&
      Number.isFinite(record.row_version) &&
      record.row_version > 0 &&
      typeof record.card_name === "string" &&
      record.card_name.trim() !== "" &&
      typeof record.set_name === "string" &&
      typeof record.card_number === "string" &&
      typeof record.condition === "string" &&
      typeof record.barcode === "string" &&
      typeof record.sale_price_minor_units === "number" &&
      Number.isFinite(record.sale_price_minor_units) &&
      record.sale_price_minor_units >= 0 &&
      record.sale_currency === "USD" &&
      typeof record.location_label === "string" &&
      (record.status === "available" || record.status === "reserved" || record.status === "conflict") &&
      typeof record.updated_at_utc === "string" &&
      record.updated_at_utc.trim() !== "",
    )
    .map((record) => ({
      public_id: record.public_id.trim(),
      row_version: Math.floor(record.row_version),
      card_name: record.card_name.trim(),
      set_name: record.set_name.trim() || "Unknown set",
      card_number: record.card_number.trim(),
      condition: record.condition.trim() || "Raw",
      barcode: record.barcode.trim(),
      sale_price_minor_units: Math.floor(record.sale_price_minor_units),
      sale_currency: "USD" as const,
      location_label: record.location_label.trim() || "Unassigned",
      status: record.status,
      updated_at_utc: record.updated_at_utc.trim(),
    }))
    .slice(0, 50)
}

function sanitizeOfflinePullCustomerCreditCacheRecords(
  records: OfflinePullCustomerCreditCacheRecord[],
): OfflinePullCustomerCreditCacheRecord[] {
  if (!Array.isArray(records)) {
    return []
  }

  return records
    .filter((record) =>
      record &&
      typeof record.customer_id === "number" &&
      Number.isInteger(record.customer_id) &&
      record.customer_id > 0 &&
      typeof record.row_version === "number" &&
      Number.isFinite(record.row_version) &&
      record.row_version > 0 &&
      typeof record.label === "string" &&
      record.label.trim() !== "" &&
      typeof record.available_minor_units === "number" &&
      Number.isFinite(record.available_minor_units) &&
      record.available_minor_units >= 0 &&
      record.currency === "USD" &&
      typeof record.note === "string" &&
      typeof record.updated_at_utc === "string" &&
      record.updated_at_utc.trim() !== "",
    )
    .map((record): OfflinePullCustomerCreditCacheRecord => ({
      customer_id: record.customer_id,
      row_version: Math.floor(record.row_version),
      label: record.label.trim(),
      available_minor_units: Math.floor(record.available_minor_units),
      currency: "USD",
      note: record.note.trim() || "Website credit balance refreshed from offline pull.",
      updated_at_utc: record.updated_at_utc.trim(),
    }))
    .slice(0, 25)
}

function sanitizeOfflinePullEventCacheRecords(
  records: OfflinePullEventCacheRecord[],
): OfflinePullEventCacheRecord[] {
  if (!Array.isArray(records)) {
    return []
  }

  return records
    .filter((record) =>
      record &&
      typeof record.entity_id === "string" &&
      record.entity_id.trim() !== "" &&
      typeof record.row_version === "number" &&
      Number.isFinite(record.row_version) &&
      record.row_version > 0 &&
      typeof record.title === "string" &&
      record.title.trim() !== "" &&
      typeof record.starts_at_utc === "string" &&
      record.starts_at_utc.trim() !== "" &&
      typeof record.starts_at_label === "string" &&
      record.starts_at_label.trim() !== "" &&
      (record.registration_status === "open" ||
        record.registration_status === "waitlist" ||
        record.registration_status === "full" ||
        record.registration_status === "closed") &&
      typeof record.capacity === "number" &&
      Number.isFinite(record.capacity) &&
      record.capacity >= 0 &&
      typeof record.registered_count === "number" &&
      Number.isFinite(record.registered_count) &&
      record.registered_count >= 0 &&
      typeof record.location_label === "string" &&
      typeof record.note === "string" &&
      typeof record.updated_at_utc === "string" &&
      record.updated_at_utc.trim() !== "",
    )
    .map((record): OfflinePullEventCacheRecord => ({
      entity_id: record.entity_id.trim(),
      row_version: Math.floor(record.row_version),
      title: record.title.trim(),
      starts_at_utc: record.starts_at_utc.trim(),
      starts_at_label: record.starts_at_label.trim(),
      registration_status: record.registration_status,
      capacity: Math.floor(record.capacity),
      registered_count: Math.floor(record.registered_count),
      location_label: record.location_label.trim() || "Unassigned",
      note: record.note.trim() || "Website event snapshot refreshed from offline pull.",
      updated_at_utc: record.updated_at_utc.trim(),
    }))
    .slice(0, 25)
}

function sanitizeOfflinePullConflictCacheRecords(
  records: OfflinePullConflictCacheRecord[],
): OfflinePullConflictCacheRecord[] {
  if (!Array.isArray(records)) {
    return []
  }

  return records
    .filter((record) =>
      record &&
      typeof record.conflict_id === "string" &&
      record.conflict_id.trim() !== "" &&
      typeof record.row_version === "number" &&
      Number.isFinite(record.row_version) &&
      record.row_version > 0 &&
      typeof record.title === "string" &&
      record.title.trim() !== "" &&
      typeof record.detail === "string" &&
      record.detail.trim() !== "" &&
      typeof record.action === "string" &&
      record.action.trim() !== "" &&
      (record.entity_type === "inventory" ||
        record.entity_type === "customer_credit" ||
        record.entity_type === "event") &&
      typeof record.entity_id === "string" &&
      record.entity_id.trim() !== "" &&
      typeof record.base_row_version === "number" &&
      Number.isFinite(record.base_row_version) &&
      record.base_row_version > 0 &&
      (record.operation_type === "inventory_update" ||
        record.operation_type === "credit_redemption" ||
        record.operation_type === "event_reservation" ||
        record.operation_type === "event_checkin") &&
      typeof record.manager_override === "boolean" &&
      typeof record.updated_at_utc === "string" &&
      record.updated_at_utc.trim() !== "",
    )
    .map((record): OfflinePullConflictCacheRecord => ({
      conflict_id: record.conflict_id.trim(),
      row_version: Math.floor(record.row_version),
      title: record.title.trim(),
      detail: record.detail.trim(),
      action: record.action.trim(),
      resolution_action: normalizeConflictResolutionAction(record.resolution_action ?? record.action),
      resolution_note:
        typeof record.resolution_note === "string" && record.resolution_note.trim() !== ""
          ? record.resolution_note.trim()
          : `Manager selected ${normalizeConflictResolutionAction(record.resolution_action ?? record.action)} for ${record.title.trim()}.`,
      entity_type: record.entity_type,
      entity_id: record.entity_id.trim(),
      base_row_version: Math.floor(record.base_row_version),
      operation_type: record.operation_type,
      manager_override: record.manager_override,
      updated_at_utc: record.updated_at_utc.trim(),
    }))
    .slice(0, 25)
}

function safeRecordIdPart(value: unknown, fallback: string): string {
  const candidate = stringValue(value) || fallback
  const safeValue = candidate
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return safeValue || fallback
}

function connectorSiteFingerprint(siteUrl: string, environment: ConnectorEnvironment): string {
  const input = `${environment}|${siteUrl}`.toLowerCase()
  let hash = 2166136261

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 16)
}

function normalizeUtcDateString(value: unknown, fallback: string): string {
  const candidate = stringValue(value)
  const parsed = Date.parse(candidate)

  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString()
  }

  return fallback
}

function safeConnectorId(
  profileId: string,
  companyName: string,
  environment: ConnectorEnvironment,
  host: string,
) {
  const candidate = profileId || `${companyName}-${environment}-${host}`
  const slug = candidate
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "tcg-store-development-offline-local"
}

function sanitizeConnectorProfiles(profiles: StoreConnectorProfile[]): StoreConnectorProfile[] {
  const safeProfiles: StoreConnectorProfile[] = []

  for (const profile of profiles) {
    if (
      !profile ||
      typeof profile.id !== "string" ||
      typeof profile.companyName !== "string" ||
      typeof profile.companyShortName !== "string" ||
      typeof profile.wordpress?.host !== "string" ||
      profile.wordpress.authMode !== "offline_device_token" ||
      profile.wordpress.credentialStorage !== "desktop_secure_store" ||
      profile.square.inventoryAuthority !== "tcg_store_platform" ||
      profile.square.paymentAuthority !== "official_woocommerce_square_extension" ||
      profile.scrydex.credentialStorage !== "wordpress_server_settings" ||
      profile.scrydex.credentialsSyncedToApp !== false
    ) {
      continue
    }

    const scheme = profile.wordpress.scheme === "http" ? "http" : "https"
    const environment = cleanConnectorEnvironment(profile.environment)
    const routeConnectedPushReady = true
    const localSyncServerUrl = normalizeLocalSyncServerUrl(
      profile.localSync?.serverUrl ?? "http://127.0.0.1:8787",
    )
    const canonicalInventoryWritesEnabled =
      environment !== "production" &&
      routeConnectedPushReady &&
      profile.wordpress.canonicalInventoryWritesEnabled === true

    safeProfiles.push({
      ...profile,
      id: safeConnectorId(profile.id, profile.companyName, environment, profile.wordpress.host),
      environment,
      status: profile.status === "ready" || profile.status === "sandbox_only" ? profile.status : "needs_pairing",
      wordpress: {
        ...profile.wordpress,
        scheme,
        restBasePath: "/wp-json/tcg-store/v1",
        authMode: "offline_device_token",
        credentialStorage: "desktop_secure_store",
        devicePairingRequired: true,
        networkRequestsDeferred: true,
        routeConnectedPushReady,
        canonicalInventoryWritesEnabled,
      },
      localSync: {
        topology: "lan_middleman_server",
        serverUrl: localSyncServerUrl,
        setupStatusPath: "/setup/status",
        oneWebsiteMode: true,
        localDatabase: "store-sync.sqlite",
        credentialsSyncedToApp: false,
      },
      square: {
        ...profile.square,
        inventoryAuthority: "tcg_store_platform",
        paymentAuthority: "official_woocommerce_square_extension",
        providerWritesDeferred: true,
        sandboxRequired: environment !== "production",
      },
      scrydex: {
        ...profile.scrydex,
        credentialStorage: "wordpress_server_settings",
        credentialsSyncedToApp: false,
      },
    })
  }

  return safeProfiles.length > 0 ? [safeProfiles[0]] : offlineWorkspaceSeed.connectorProfiles.slice(0, 1)
}

function sanitizePreparedPairingRequests(
  requests: PreparedDevicePairingRequest[],
  profiles: StoreConnectorProfile[],
): PreparedDevicePairingRequest[] {
  const profileIds = new Set(profiles.map((profile) => profile.id))

  return requests
    .filter((request) =>
      request &&
      profileIds.has(request.profileId) &&
      request.method === "POST" &&
      request.path === "/wp-json/tcg-store/v1/offline/devices/register" &&
      Array.isArray(request.requestedScopes) &&
      request.requestedScopes.includes("offline_pull") &&
      request.requestedScopes.includes("offline_push") &&
      request.requestedScopes.includes("conflicts") &&
      request.tokenStorage === "desktop_secure_store" &&
      request.status === "prepared_local" &&
      request.rawPairingCodeStored === false &&
      request.networkRequestDeferred === true
    )
    .slice(0, 12)
}

function sanitizePairedDeviceRecords(
  records: unknown,
  profiles: StoreConnectorProfile[],
): PairedDeviceRecord[] {
  if (!Array.isArray(records)) {
    return []
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const seenProfiles = new Set<string>()
  const safeRecords: PairedDeviceRecord[] = []

  for (const record of records) {
    const value = objectValue(record)

    if (!value) {
      continue
    }

    const profileId = stringValue(value.profileId)
    const profile = profileMap.get(profileId)

    if (
      !profile ||
      seenProfiles.has(profileId) ||
      value.tokenStorage !== "desktop_secure_store" ||
      value.rawTokenStoredInBrowser !== false ||
      value.rawTokenReturnedToUi !== false ||
      value.credentialsSyncedToApp !== false ||
      !hasRequiredDevicePairingScopes(value.requestedScopes)
    ) {
      continue
    }

    const devicePublicId = safeRecordIdPart(value.devicePublicId, `${profile.id}-desktop-device`)
    const pairedAtUtc = normalizeUtcDateString(value.pairedAtUtc, new Date().toISOString())
    const expiresAtUtc = normalizeUtcDateString(
      value.expiresAtUtc,
      new Date(Date.parse(pairedAtUtc) + 30 * 24 * 60 * 60 * 1000).toISOString(),
    )
    const tokenLength = numberValue(value.tokenLength)

    safeRecords.push({
      id: safeRecordIdPart(value.id, `paired-device-${profile.id}-${devicePublicId}`),
      profileId: profile.id,
      companyName: profile.companyName,
      siteUrl: connectorDisplayUrl(profile),
      devicePublicId,
      requestedScopes: sanitizeDevicePairingScopes(value.requestedScopes),
      tokenStorage: "desktop_secure_store",
      tokenStatus: cleanPairedDeviceTokenStatus(value.tokenStatus),
      tokenLength: tokenLength === null ? 0 : Math.max(0, Math.floor(tokenLength)),
      pairedAtUtc,
      expiresAtUtc,
      rawTokenStoredInBrowser: false,
      rawTokenReturnedToUi: false,
      credentialsSyncedToApp: false,
    })

    seenProfiles.add(profileId)
  }

  return safeRecords.slice(0, 16)
}

function sanitizeOfflineOperationEnvelopes(operations: unknown): OfflineOperationEnvelope[] {
  if (!Array.isArray(operations)) {
    return []
  }

  return operations
    .map((operation) => objectValue(operation))
    .filter((operation): operation is Record<string, unknown> => operation !== null)
    .map((operation) => {
      const payloadJson = stringValue(operation.payload_json)
      const authorizationJson = stringValue(operation.authorization_context_json)
      const locationId = numberValue(operation.location_id)
      const actorId = numberValue(operation.actor_id)
      const baseRowVersion = numberValue(operation.base_row_version)
      const operationType = stringValue(operation.operation_type)
      const entityType = stringValue(operation.entity_type)

      if (
        stringValue(operation.client_operation_id) === "" ||
        stringValue(operation.device_id) === "" ||
        stringValue(operation.entity_id) === "" ||
        locationId === null ||
        actorId === null ||
        baseRowVersion === null ||
        operation.schema_version !== 1 ||
        !["inventory_update", "inventory_reservation", "event_reservation", "event_checkin", "credit_redemption"].includes(operationType) ||
        !["inventory", "event", "customer_credit"].includes(entityType) ||
        !isJsonObjectString(payloadJson) ||
        !isJsonObjectString(authorizationJson) ||
        hasCredentialMarker(payloadJson) ||
        hasCredentialMarker(authorizationJson)
      ) {
        return null
      }

      return {
        client_operation_id: stringValue(operation.client_operation_id),
        device_id: stringValue(operation.device_id),
        location_id: locationId,
        actor_id: actorId,
        operation_type: operationType as OfflineOperationEnvelope["operation_type"],
        entity_type: entityType as OfflineOperationEnvelope["entity_type"],
        entity_id: stringValue(operation.entity_id),
        base_row_version: baseRowVersion,
        occurred_at_local: stringValue(operation.occurred_at_local),
        queued_at_utc: stringValue(operation.queued_at_utc),
        payload_json: payloadJson,
        authorization_context_json: authorizationJson,
        schema_version: 1,
      }
    })
    .filter((operation): operation is OfflineOperationEnvelope => operation !== null)
    .slice(0, 50)
}

function sanitizeOfflineSyncAttempts(attempts: unknown): OfflineSyncAttemptRecord[] {
  if (!Array.isArray(attempts)) {
    return []
  }

  return attempts
    .map((attempt) => objectValue(attempt))
    .filter((attempt): attempt is Record<string, unknown> => attempt !== null)
    .map((attempt) => {
      const operationCount = numberValue(attempt.operationCount)

      if (
        stringValue(attempt.id) === "" ||
        stringValue(attempt.companyName) === "" ||
        stringValue(attempt.siteUrl) === "" ||
        operationCount === null ||
        attempt.networkStatus !== "Deferred" ||
        hasCredentialMarker(JSON.stringify(attempt))
      ) {
        return null
      }

      return {
        id: stringValue(attempt.id),
        companyName: stringValue(attempt.companyName),
        siteUrl: stringValue(attempt.siteUrl),
        operationCount: Math.max(0, operationCount),
        pairingStatus: stringValue(attempt.pairingStatus) || "Pairing required",
        createdAtLabel: stringValue(attempt.createdAtLabel) || "restored",
        networkStatus: "Deferred" as const,
      }
    })
    .filter((attempt): attempt is OfflineSyncAttemptRecord => attempt !== null)
    .slice(0, 10)
}

function hasCredentialMarker(value: string): boolean {
  const normalized = value.toLowerCase()

  return ["password", "api_key", "private_key", "ssh_key", "bearer "].some((marker) =>
    normalized.includes(marker),
  )
}

function isJsonObjectString(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as unknown

    return Boolean(parsed && typeof parsed === "object" && !Array.isArray(parsed))
  } catch {
    return false
  }
}

function pairingCodeFingerprint(pairingCode: string) {
  if (!pairingCode) {
    return "missing"
  }

  const checksum = pairingCode
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0)

  return `pairing-${pairingCode.length}-${checksum.toString(16)}`
}

export function buildInventoryUpdateOperation(
  item: InventoryItem,
  options: {
    actorId?: number
    deviceId?: string
    locationId?: number
    operationKind?: "scan" | "quantity" | "update"
    quantityDelta?: number
    adjustmentReason?: string
    syncIntent?: "staff_inventory_update" | "staff_barcode_scan" | "staff_quantity_adjustment"
    occurredAtLocal?: string
    queuedAtUtc?: string
  } = {},
): OfflineOperationEnvelope {
  const occurredAtLocal = options.occurredAtLocal ?? new Date().toISOString()
  const queuedAtUtc = options.queuedAtUtc ?? occurredAtLocal
  const operationStamp = queuedAtUtc.replace(/[^0-9]/g, "").slice(0, 14)
  const operationKind = options.operationKind ?? "update"

  return {
    client_operation_id: `offline-inventory-${operationKind}-${item.id}-${operationStamp}`,
    device_id: options.deviceId ?? "local-device-preview",
    location_id: options.locationId ?? 1,
    actor_id: options.actorId ?? 1,
    operation_type: "inventory_update",
    entity_type: "inventory",
    entity_id: item.publicId,
    base_row_version: item.rowVersion,
    occurred_at_local: occurredAtLocal,
    queued_at_utc: queuedAtUtc,
    payload_json: JSON.stringify({
      barcode: item.barcode,
      location: item.location,
      price_minor_units: item.priceMinorUnits,
      status: item.status,
      sync_intent: options.syncIntent ?? "staff_inventory_update",
      ...(typeof options.quantityDelta === "number" ? { quantity_delta: options.quantityDelta } : {}),
      ...(options.adjustmentReason ? { adjustment_reason: options.adjustmentReason } : {}),
    }),
    authorization_context_json: JSON.stringify({
      manager_override: false,
      source: "offline_app",
    }),
    schema_version: 1,
  }
}

export function buildInventoryReservationOperation(
  item: InventoryItem,
  options: {
    actorId?: number
    deviceId?: string
    locationId?: number
    occurredAtLocal?: string
    queuedAtUtc?: string
    holdReason?: string
  } = {},
): OfflineOperationEnvelope {
  const occurredAtLocal = options.occurredAtLocal ?? new Date().toISOString()
  const queuedAtUtc = options.queuedAtUtc ?? occurredAtLocal
  const operationStamp = queuedAtUtc.replace(/[^0-9]/g, "").slice(0, 14)

  return {
    client_operation_id: `offline-inventory-reservation-${item.publicId}-${operationStamp}`,
    device_id: options.deviceId ?? "local-device-preview",
    location_id: options.locationId ?? 1,
    actor_id: options.actorId ?? 1,
    operation_type: "inventory_reservation",
    entity_type: "inventory",
    entity_id: item.publicId,
    base_row_version: item.rowVersion,
    occurred_at_local: occurredAtLocal,
    queued_at_utc: queuedAtUtc,
    payload_json: JSON.stringify({
      barcode: item.barcode,
      localStatus: "offline_pending_sync",
      sync_intent: "offline_inventory_reservation",
      hold_reason: options.holdReason ?? "staff offline hold",
    }),
    authorization_context_json: JSON.stringify({
      manager_override: false,
      source: "offline_app",
    }),
    schema_version: 1,
  }
}

export function buildEventRegistrationOperation(
  event: EventSnapshot,
  options: {
    actorId?: number
    deviceId?: string
    locationId?: number
    occurredAtLocal?: string
    queuedAtUtc?: string
    attendeeLabel?: string
    registrationSource?: "walk_in" | "phone" | "staff"
    paymentStatus?: EventPaymentStatus
  } = {},
): OfflineOperationEnvelope {
  const occurredAtLocal = options.occurredAtLocal ?? new Date().toISOString()
  const queuedAtUtc = options.queuedAtUtc ?? occurredAtLocal
  const operationStamp = queuedAtUtc.replace(/[^0-9]/g, "").slice(0, 14)
  const seatsRemaining = Math.max(0, event.capacity - event.registeredCount)

  return {
    client_operation_id: `offline-event-reservation-${event.eventId}-${operationStamp}`,
    device_id: options.deviceId ?? "local-device-preview",
    location_id: options.locationId ?? 1,
    actor_id: options.actorId ?? 1,
    operation_type: "event_reservation",
    entity_type: "event",
    entity_id: event.eventId,
    base_row_version: event.rowVersion,
    occurred_at_local: occurredAtLocal,
    queued_at_utc: queuedAtUtc,
    payload_json: JSON.stringify({
      event_id: event.eventId,
      event_title: event.title,
      starts_at_utc: event.startsAtUtc,
      attendee_label: options.attendeeLabel ?? "Offline walk-in",
      registration_source: options.registrationSource ?? "walk_in",
      registration_status_snapshot: event.registrationStatus,
      seats_remaining_snapshot: seatsRemaining,
      payment_status: options.paymentStatus ?? "not_required",
      sync_intent: "offline_event_registration",
    }),
    authorization_context_json: JSON.stringify({
      manager_override: event.registrationStatus === "full",
      source: "offline_app",
    }),
    schema_version: 1,
  }
}

export function buildEventCheckinOperation(
  event: EventSnapshot,
  options: {
    actorId?: number
    deviceId?: string
    locationId?: number
    occurredAtLocal?: string
    queuedAtUtc?: string
    registrationPublicId?: string
    checkinMethod?: "qr_scan" | "manual_lookup" | "offline_app"
    attendeeLabel?: string
  } = {},
): OfflineOperationEnvelope {
  const occurredAtLocal = options.occurredAtLocal ?? new Date().toISOString()
  const queuedAtUtc = options.queuedAtUtc ?? occurredAtLocal
  const operationStamp = queuedAtUtc.replace(/[^0-9]/g, "").slice(0, 14)
  const registrationPublicId =
    options.registrationPublicId ?? `registration-${event.eventId}-walkin`

  return {
    client_operation_id: `offline-event-checkin-${event.eventId}-${operationStamp}`,
    device_id: options.deviceId ?? "local-device-preview",
    location_id: options.locationId ?? 1,
    actor_id: options.actorId ?? 1,
    operation_type: "event_checkin",
    entity_type: "event",
    entity_id: event.eventId,
    base_row_version: event.rowVersion,
    occurred_at_local: occurredAtLocal,
    queued_at_utc: queuedAtUtc,
    payload_json: JSON.stringify({
      event_id: event.eventId,
      event_title: event.title,
      registration_public_id: registrationPublicId,
      attendee_label: options.attendeeLabel ?? "Offline attendee",
      checkin_method: options.checkinMethod ?? "offline_app",
      checkin_status: "checked_in",
      registration_status_snapshot: event.registrationStatus,
      sync_intent: "offline_event_checkin",
    }),
    authorization_context_json: JSON.stringify({
      manager_override: false,
      source: "offline_app",
    }),
    schema_version: 1,
  }
}

export function buildCustomerCreditRedemptionOperation(
  credit: CustomerCreditSnapshot,
  options: {
    amountMinorUnits?: number
    actorId?: number
    deviceId?: string
    locationId?: number
    managerOverride?: boolean
    occurredAtLocal?: string
    queuedAtUtc?: string
    reason?: string
  } = {},
): OfflineOperationEnvelope {
  const occurredAtLocal = options.occurredAtLocal ?? new Date().toISOString()
  const queuedAtUtc = options.queuedAtUtc ?? occurredAtLocal
  const operationStamp = queuedAtUtc.replace(/[^0-9]/g, "").slice(0, 14)
  const amountMinorUnits = options.amountMinorUnits ?? credit.redemptionPreviewMinorUnits

  return {
    client_operation_id: `offline-credit-${credit.customerId}-${operationStamp}`,
    device_id: options.deviceId ?? "local-device-preview",
    location_id: options.locationId ?? 1,
    actor_id: options.actorId ?? 1,
    operation_type: "credit_redemption",
    entity_type: "customer_credit",
    entity_id: String(credit.customerId),
    base_row_version: credit.rowVersion,
    occurred_at_local: occurredAtLocal,
    queued_at_utc: queuedAtUtc,
    payload_json: JSON.stringify({
      amount_minor_units: amountMinorUnits,
      customer_public_id: credit.customerPublicId ?? `customer-${credit.customerId}`,
      currency: credit.currency,
      available_credit_snapshot_minor_units: credit.availableMinorUnits,
      sync_intent: "offline_credit_redemption",
    }),
    authorization_context_json: JSON.stringify({
      manager_override: options.managerOverride ?? false,
      reason: options.reason ?? "offline customer credit redemption",
      source: "offline_app",
    }),
    schema_version: 1,
  }
}

export function buildConflictReviewOperation(
  conflict: ConflictItem,
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
    client_operation_id: `offline-conflict-${conflict.conflictId}-${operationStamp}`,
    device_id: options.deviceId ?? "local-device-preview",
    location_id: options.locationId ?? 1,
    actor_id: options.actorId ?? 1,
    operation_type: conflict.operationType,
    entity_type: conflict.entityType,
    entity_id: conflict.entityId,
    base_row_version: conflict.baseRowVersion,
    occurred_at_local: occurredAtLocal,
    queued_at_utc: queuedAtUtc,
    payload_json: JSON.stringify({
      conflict_id: conflict.conflictId,
      conflict_row_version: conflict.rowVersion,
      conflict_title: conflict.title,
      conflict_detail: conflict.detail,
      requested_action: conflict.action,
      resolution_action: conflict.resolutionAction,
      sync_intent: "staff_conflict_review",
    }),
    authorization_context_json: JSON.stringify({
      manager_override: conflict.managerOverride,
      source: "offline_app",
    }),
    schema_version: 1,
  }
}

export function buildOfflineConflictResolutionRequestBody(
  conflict: ConflictItem,
  devicePublicId: string,
  options: {
    managerId?: number
    resolutionId?: string
    resolvedAtUtc?: string
  } = {},
): OfflineConflictResolutionRequestBody {
  const resolvedAtUtc = options.resolvedAtUtc ?? new Date().toISOString()
  const operationStamp = resolvedAtUtc.replace(/[^0-9]/g, "").slice(0, 14)

  return {
    conflict_id: conflict.conflictId,
    resolution_id:
      options.resolutionId ?? `resolve-${conflict.conflictId}-${operationStamp}`,
    device_id: devicePublicId.trim(),
    manager_id: options.managerId ?? 1,
    resolution_action: conflict.resolutionAction,
    resolution_note: conflict.resolutionNote,
    resolved_at_utc: resolvedAtUtc,
    expected_conflict_version: conflict.rowVersion,
    resolution_payload: {
      conflict_title: conflict.title,
      conflict_detail: conflict.detail,
      entity_type: conflict.entityType,
      entity_id: conflict.entityId,
      operation_type: conflict.operationType,
      base_row_version: conflict.baseRowVersion,
      requested_action: conflict.action,
      manager_override: conflict.managerOverride,
      source: "offline_app",
    },
    schema_version: 1,
  }
}

function normalizeConflictResolutionAction(
  value: string | undefined,
  fallback: ConflictResolutionAction = "retry_operation",
): ConflictResolutionAction {
  const normalized = (value ?? "").trim().toLowerCase()

  if (
    normalized === "accept_server" ||
    normalized === "accept_device" ||
    normalized === "manager_adjust" ||
    normalized === "retry_operation" ||
    normalized === "dismiss"
  ) {
    return normalized
  }

  if (normalized === "approve" || normalized === "approved") {
    return "accept_device"
  }

  if (normalized === "use website" || normalized === "server" || normalized === "review") {
    return "accept_server"
  }

  return fallback
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
      device_id: deviceId,
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

export function buildOfflinePullRequestBody(
  devicePublicId: string,
  options: {
    cursors?: Record<string, string>
    pageSize?: number
    includeTombstones?: boolean
  } = {},
): OfflinePullRequestBody {
  const pageSize = Math.max(1, Math.min(500, Math.trunc(options.pageSize ?? 100)))

  return {
    device_id: devicePublicId.trim(),
    domains: ["inventory", "customer_credit", "events", "conflicts"],
    cursors: sanitizePullCursors(options.cursors ?? {}),
    page_size: pageSize,
    include_tombstones: options.includeTombstones ?? true,
    schema_version: 1,
  }
}

export function applyOfflinePullInventoryRecordsToCache(
  items: InventoryItem[],
  records: OfflinePullInventoryCacheRecord[],
): OfflinePullInventoryCacheApplyResult {
  const itemMap = new Map(items.map((item) => [item.publicId, item]))
  const changedPublicIds: string[] = []
  let insertedCount = 0
  let updatedCount = 0
  let ignoredCount = 0
  let nextId = items.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1

  for (const record of sanitizeOfflinePullInventoryCacheRecords(records)) {
    const existing = itemMap.get(record.public_id)

    if (existing && record.row_version <= existing.rowVersion) {
      ignoredCount += 1
      continue
    }

    const nextItem: InventoryItem = {
      id: existing?.id ?? nextId++,
      publicId: record.public_id,
      rowVersion: record.row_version,
      cardName: record.card_name,
      setName: record.set_name,
      number: record.card_number,
      condition: record.condition || existing?.condition || "Raw",
      barcode: record.barcode || existing?.barcode || record.public_id,
      price: formatMoney(record.sale_price_minor_units, "USD"),
      priceMinorUnits: record.sale_price_minor_units,
      currency: "USD",
      location: record.location_label || existing?.location || "Unassigned",
      status: record.status,
      source: "accepted",
    }

    itemMap.set(record.public_id, nextItem)
    changedPublicIds.push(record.public_id)

    if (existing) {
      updatedCount += 1
    } else {
      insertedCount += 1
    }
  }

  return {
    items: Array.from(itemMap.values()).sort((left, right) => left.id - right.id),
    appliedCount: insertedCount + updatedCount,
    insertedCount,
    updatedCount,
    ignoredCount,
    changedPublicIds,
  }
}

export function applyOfflinePullCustomerCreditRecordsToCache(
  customerCredit: CustomerCreditSnapshot,
  records: OfflinePullCustomerCreditCacheRecord[],
): OfflinePullCustomerCreditCacheApplyResult {
  let nextCustomerCredit = customerCredit
  let updatedCount = 0
  let ignoredCount = 0

  for (const record of sanitizeOfflinePullCustomerCreditCacheRecords(records)) {
    if (record.customer_id !== customerCredit.customerId || record.row_version <= nextCustomerCredit.rowVersion) {
      ignoredCount += 1
      continue
    }

    nextCustomerCredit = {
      ...nextCustomerCredit,
      customerId: record.customer_id,
      rowVersion: record.row_version,
      label: record.label,
      availableMinorUnits: record.available_minor_units,
      redemptionPreviewMinorUnits: Math.min(
        nextCustomerCredit.redemptionPreviewMinorUnits,
        record.available_minor_units,
      ),
      currency: record.currency,
      note: record.note,
    }
    updatedCount += 1
  }

  return {
    customerCredit: nextCustomerCredit,
    appliedCount: updatedCount,
    updatedCount,
    ignoredCount,
  }
}

export function applyOfflinePullEventRecordsToCache(
  events: EventSnapshot[],
  records: OfflinePullEventCacheRecord[],
): OfflinePullEventCacheApplyResult {
  const eventMap = new Map(events.map((event) => [event.eventId, event]))
  const changedEventIds: string[] = []
  let insertedCount = 0
  let updatedCount = 0
  let ignoredCount = 0

  for (const record of sanitizeOfflinePullEventCacheRecords(records)) {
    const existing = eventMap.get(record.entity_id)

    if (existing && record.row_version <= existing.rowVersion) {
      ignoredCount += 1
      continue
    }

    const nextEvent: EventSnapshot = {
      eventId: record.entity_id,
      rowVersion: record.row_version,
      title: record.title,
      startsAtUtc: record.starts_at_utc,
      startsAtLabel: record.starts_at_label,
      registrationStatus: record.registration_status,
      capacity: record.capacity,
      registeredCount: Math.min(record.registered_count, record.capacity || record.registered_count),
      locationLabel: record.location_label,
      note: record.note,
    }

    eventMap.set(record.entity_id, nextEvent)
    changedEventIds.push(record.entity_id)

    if (existing) {
      updatedCount += 1
    } else {
      insertedCount += 1
    }
  }

  return {
    events: Array.from(eventMap.values()).sort((left, right) =>
      left.startsAtUtc.localeCompare(right.startsAtUtc),
    ),
    appliedCount: insertedCount + updatedCount,
    insertedCount,
    updatedCount,
    ignoredCount,
    changedEventIds,
  }
}

export function applyOfflinePullConflictRecordsToCache(
  conflicts: ConflictItem[],
  records: OfflinePullConflictCacheRecord[],
): OfflinePullConflictCacheApplyResult {
  const conflictMap = new Map(conflicts.map((conflict) => [conflict.conflictId, conflict]))
  const changedConflictIds: string[] = []
  let insertedCount = 0
  let updatedCount = 0
  let ignoredCount = 0

  for (const record of sanitizeOfflinePullConflictCacheRecords(records)) {
    const existing = conflictMap.get(record.conflict_id)

    if (existing && record.row_version <= existing.rowVersion) {
      ignoredCount += 1
      continue
    }

    const nextConflict: ConflictItem = {
      conflictId: record.conflict_id,
      rowVersion: record.row_version,
      title: record.title,
      detail: record.detail,
      action: record.action,
      resolutionAction: normalizeConflictResolutionAction(record.resolution_action, "retry_operation"),
      resolutionNote:
        record.resolution_note?.trim() ||
        `Manager selected ${normalizeConflictResolutionAction(record.resolution_action, "retry_operation")} for ${record.title}.`,
      entityType: record.entity_type,
      entityId: record.entity_id,
      baseRowVersion: record.base_row_version,
      operationType: record.operation_type,
      managerOverride: record.manager_override,
    }

    conflictMap.set(record.conflict_id, nextConflict)
    changedConflictIds.push(record.conflict_id)

    if (existing) {
      updatedCount += 1
    } else {
      insertedCount += 1
    }
  }

  return {
    conflicts: Array.from(conflictMap.values()).sort((left, right) =>
      left.conflictId.localeCompare(right.conflictId),
    ),
    appliedCount: insertedCount + updatedCount,
    insertedCount,
    updatedCount,
    ignoredCount,
    changedConflictIds,
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

export function buildOfflineConnectorSyncSessionPlan(
  profile: StoreConnectorProfile,
  batch: OfflinePushBatchPayload | null,
  preparedPairingRequest: PreparedDevicePairingRequest | null = null,
  pairedDeviceRecord: PairedDeviceRecord | null = null,
): OfflineConnectorSyncSessionPlan {
  const pushBatchId = batch?.batch_id ?? "no-local-operations"
  const operationCount = batch?.operations.length ?? 0
  const pairedDeviceAvailable = pairedDeviceRecord?.profileId === profile.id
  const desktopTokenStatus = pairedDeviceAvailable ? pairedDeviceRecord.tokenStatus : "missing"
  const canonicalInventoryOperationCount =
    batch?.operations.filter((operation) => operation.operation_type === "inventory_reservation").length ?? 0
  const canonicalInventoryWritesReady =
    profile.wordpress.routeConnectedPushReady &&
    profile.wordpress.canonicalInventoryWritesEnabled &&
    canonicalInventoryOperationCount > 0

  return {
    action: "offline_connector_sync_session_plan",
    profileId: profile.id,
    companyName: profile.companyName,
    siteUrl: connectorDisplayUrl(profile),
    environment: profile.environment,
    restBasePath: profile.wordpress.restBasePath,
    pull: {
      method: "POST",
      path: "/wp-json/tcg-store/v1/offline/pull",
      url: connectorRestUrl(profile, "/offline/pull"),
      network_request_deferred: true,
      device_authorization_header_deferred: true,
    },
    push: {
      method: "POST",
      path: "/wp-json/tcg-store/v1/offline/push",
      url: connectorRestUrl(profile, "/offline/push"),
      batch_id: pushBatchId,
      operation_count: operationCount,
      network_request_deferred: true,
      device_authorization_header_deferred: true,
      route_connected_push_ready: profile.wordpress.routeConnectedPushReady,
      canonical_inventory_operation_count: canonicalInventoryOperationCount,
      canonical_inventory_execution_enabled: profile.wordpress.canonicalInventoryWritesEnabled,
      canonical_inventory_writes_deferred: !canonicalInventoryWritesReady,
    },
    prepared_pairing_available: preparedPairingRequest?.profileId === profile.id,
    pairing_code_fingerprint:
      preparedPairingRequest?.profileId === profile.id
        ? preparedPairingRequest.pairingCodeFingerprint
        : "missing",
    paired_device_available: pairedDeviceAvailable,
    paired_device_public_id: pairedDeviceAvailable ? pairedDeviceRecord.devicePublicId : "missing",
    desktop_token_status: desktopTokenStatus,
    desktop_token_available: desktopTokenStatus === "stored",
    device_pairing_required: profile.wordpress.devicePairingRequired,
    device_token_storage: profile.wordpress.credentialStorage,
    direct_mysql_access: false,
    provider_credentials_required: false,
    credentialsSyncedToApp: false,
    network_request_deferred: true,
  }
}

export function buildOfflinePullRefreshPreview(
  profile: StoreConnectorProfile,
  inventoryItems: InventoryItem[],
  customerCredit: CustomerCreditSnapshot,
  conflicts: ConflictItem[],
  queuedOperations: OfflineOperationEnvelope[],
  options: { generatedAt?: Date; eventRowsRefreshed?: number } = {},
): OfflinePullRefreshPreview {
  const generatedAt = options.generatedAt ?? new Date()
  const generatedStamp = generatedAt.toISOString().replace(/[^0-9]/g, "").slice(0, 14)
  const changedInventoryPublicIds = inventoryItems
    .filter((item) => item.source !== "queued")
    .map((item) => item.publicId)

  return {
    action: "offline_pull_refresh_preview",
    profileId: profile.id,
    companyName: profile.companyName,
    siteUrl: connectorDisplayUrl(profile),
    generatedAtLabel: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(generatedAt),
    pullCursor: `${profile.id}-pull-${generatedStamp}`,
    inventoryRowsRefreshed: changedInventoryPublicIds.length,
    customerCreditRowsRefreshed: customerCredit.customerId > 0 ? 1 : 0,
    eventRowsRefreshed: options.eventRowsRefreshed ?? 2,
    conflictRowsRefreshed: conflicts.length,
    queuedOperationsPreserved: queuedOperations.length,
    changedInventoryPublicIds,
    localCacheRefreshApplied: true,
    networkRequestDeferred: true,
    deviceAuthorizationHeaderDeferred: true,
    credentialsSyncedToApp: false,
    directMysqlAccess: false,
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
    canonical_inventory_execution_enabled: booleanValue(
      meta.canonical_inventory_execution_enabled,
      !booleanValue(meta.push_canonical_mutations_deferred, true),
    ),
    canonical_inventory_writes_deferred: booleanValue(
      meta.canonical_inventory_writes_deferred,
      booleanValue(meta.push_canonical_mutations_deferred, true),
    ),
  }
}

export function applyOfflinePushResultToQueue(
  queuedOperations: OfflineOperationEnvelope[],
  summary: OfflinePushResultSummary,
): OfflinePushQueueApplyResult {
  const acceptedIds = uniqueStringList(summary.accepted_operation_ids)
  const conflictIds = uniqueStringList(summary.conflict_operation_ids)
  const rejectedIds = uniqueStringList(summary.rejected_operation_ids)
  const acceptedIdSet = new Set(acceptedIds)
  const queuedOperationIds = new Set(
    queuedOperations.map((operation) => operation.client_operation_id),
  )
  const removedOperationIds: string[] = []
  const remainingOperations = queuedOperations.filter((operation) => {
    if (!acceptedIdSet.has(operation.client_operation_id)) {
      return true
    }

    removedOperationIds.push(operation.client_operation_id)
    return false
  })

  return {
    remainingOperations,
    removedOperationIds,
    retainedConflictOperationIds: conflictIds.filter((operationId) =>
      queuedOperationIds.has(operationId),
    ),
    retainedRejectedOperationIds: rejectedIds.filter((operationId) =>
      queuedOperationIds.has(operationId),
    ),
    ignoredAcceptedOperationIds: acceptedIds.filter((operationId) =>
      !queuedOperationIds.has(operationId),
    ),
    acceptedCount: acceptedIds.length,
    conflictCount: conflictIds.length,
    rejectedCount: rejectedIds.length,
    queueReplayApplied: removedOperationIds.length > 0,
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
  return uniqueStringList(
    values
      .map((value) => objectValue(value))
      .filter((value): value is Record<string, unknown> => value !== null)
      .filter((value) => stringValue(value.status) === status)
      .map((value) => stringValue(value.client_operation_id)),
  )
}

function uniqueStringList(values: string[]): string[] {
  const uniqueValues: string[] = []

  for (const value of values) {
    const cleanValue = value.trim()

    if (!cleanValue || uniqueValues.includes(cleanValue)) {
      continue
    }

    uniqueValues.push(cleanValue)
  }

  return uniqueValues.slice(0, 100)
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
