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
export type ConnectorScheme = "http" | "https"

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
  entityType: "inventory" | "customer_credit"
  entityId: string
  baseRowVersion: number
  operationType: "inventory_update" | "credit_redemption"
  managerOverride: boolean
}

export type CustomerCreditSnapshot = {
  customerId: number
  rowVersion: number
  label: string
  availableMinorUnits: number
  redemptionPreviewMinorUnits: number
  currency: "USD"
  note: string
}

export type OfflineDeviceProfile = {
  storeLabel: string
  modeLabel: string
  lastSyncLabel: string
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
  environment: ConnectorEnvironment
  scrydexTeamLabel: string
}

export type ConnectorProfileDraftResult = {
  profile: StoreConnectorProfile | null
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
    auth_mode: "offline_device_token"
    device_pairing_required: boolean
    credential_storage: "desktop_secure_store"
    network_requests_deferred: boolean
    route_registration_deferred: boolean
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
    mode: "staff"
    platform: "windows"
    app_version: string
  }
  tokenStorage: "desktop_secure_store"
  networkRequestDeferred: true
  productionTokenIssuanceDeferred: true
  credentialsSyncedToApp: false
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
      entityType: "inventory",
      entityId: "151",
      baseRowVersion: 17,
      operationType: "inventory_update",
      managerOverride: false,
    },
    {
      title: "Credit redemption needs manager",
      detail: "$28.00 offline credit use awaits approval.",
      action: "Approve",
      entityType: "customer_credit",
      entityId: "customer-91",
      baseRowVersion: 6,
      operationType: "credit_redemption",
      managerOverride: true,
    },
  ],
  customerCredit: {
    customerId: 91,
    rowVersion: 6,
    label: "Customer credit",
    availableMinorUnits: 24600,
    redemptionPreviewMinorUnits: 2800,
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

export function createEmptyConnectorProfileDraft(): ConnectorProfileDraft {
  return {
    companyName: "",
    companyShortName: "",
    siteUrl: "",
    environment: "staging",
    scrydexTeamLabel: "Configured in WordPress",
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
    environment: profile.environment,
    scrydexTeamLabel: profile.scrydex.teamLabel,
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
  const site = parseConnectorSiteInput(draft.siteUrl)

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
  const existingIndex = profiles.findIndex((item) => item.id === profile.id)

  if (existingIndex === -1) {
    return [...profiles, profile]
  }

  return profiles.map((item, index) => (index === existingIndex ? profile : item))
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
      auth_mode: profile.wordpress.authMode,
      device_pairing_required: profile.wordpress.devicePairingRequired,
      credential_storage: profile.wordpress.credentialStorage,
      network_requests_deferred: profile.wordpress.networkRequestsDeferred,
      route_registration_deferred: true,
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

  const rejected =
    !site ||
    manifest.action !== "offline_connector_manifest" ||
    !manifest.manifest_public_safe ||
    manifest.credentials_synced_to_app !== false ||
    manifest.scrydex.credentials_synced_to_app !== false ||
    manifest.wordpress.auth_mode !== "offline_device_token" ||
    manifest.wordpress.credential_storage !== "desktop_secure_store" ||
    manifest.square.payment_authority !== "official_woocommerce_square_extension"
  const status = rejected ? "rejected" : issues.length > 0 || manifest.status === "degraded" ? "warning" : "accepted"
  const profile = connectorProfileFromManifest(manifest, site)

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
      installation_id: "local-installation-preview",
      device_label: device.storeLabel,
      mode: "staff",
      platform: "windows",
      app_version: "0.156.0",
    },
    tokenStorage: "desktop_secure_store",
    networkRequestDeferred: true,
    productionTokenIssuanceDeferred: true,
    credentialsSyncedToApp: false,
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

      return [item.cardName, item.setName, item.barcode, item.location]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    })
}

export function findInventoryItem(items: InventoryItem[], selectedId: number) {
  return items.find((item) => item.id === selectedId) ?? items[0]
}

function connectorProfileFromManifest(
  manifest: OfflineConnectorManifest,
  site: { scheme: ConnectorScheme; host: string } | null,
): StoreConnectorProfile {
  const environment = cleanConnectorEnvironment(manifest.environment)
  const safeSite = site ?? { scheme: "https" as const, host: "offline.local" }

  return {
    id: safeConnectorId(manifest.profile_id, manifest.company.name, environment, safeSite.host),
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

function cleanConnectorEnvironment(value: string): ConnectorEnvironment {
  return value === "development" || value === "staging" || value === "production"
    ? value
    : "development"
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
    client_operation_id: `offline-conflict-${conflict.entityId}-${operationStamp}`,
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
      conflict_title: conflict.title,
      conflict_detail: conflict.detail,
      requested_action: conflict.action,
      sync_intent: "staff_conflict_review",
    }),
    authorization_context_json: JSON.stringify({
      manager_override: conflict.managerOverride,
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
