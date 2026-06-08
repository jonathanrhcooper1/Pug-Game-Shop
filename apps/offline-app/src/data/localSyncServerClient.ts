export type LocalSyncAccessSection =
  | "Inventory"
  | "Kiosk"
  | "Queue"
  | "Events"
  | "Customers"
  | "Sync"
  | "Conflicts"
  | "Settings"

export type LocalSyncUserRole = "staff" | "manager"

export type LocalSyncUser = {
  id: string
  name: string
  role: LocalSyncUserRole
  access: LocalSyncAccessSection[]
  pin_hash_returned: false
}

export type LocalSyncSession = {
  token: string
  userId: string
  role: LocalSyncUserRole
  access: LocalSyncAccessSection[]
  expiresAtUtc: string
}

export type LocalSyncOk<T extends Record<string, unknown> = Record<string, never>> = {
  status: "ok"
} & T

export type LocalSyncBlocked = {
  status: "blocked"
  code: string
  message: string
}

export type LocalSyncUnavailable = {
  status: "unavailable"
  code: "local_sync_server_unavailable"
  message: string
}

export type LocalSyncResult<T extends Record<string, unknown> = Record<string, never>> =
  | LocalSyncOk<T>
  | LocalSyncBlocked
  | LocalSyncUnavailable

export type LocalSyncAuthResult = LocalSyncResult<{
  session: LocalSyncSession
  user: LocalSyncUser
  raw_pin_returned: false
  pin_hash_returned: false
}>

export type LocalSyncAccessPolicyResult = LocalSyncResult<{
  users: LocalSyncUser[]
  policy_source: "cached_wordpress_policy"
  pin_credentials_returned: false
}>

export type LocalSyncInventoryItem = {
  public_id: string
  row_version: number
  card_name: string
  set_name: string
  condition: string
  barcode: string
  price_minor_units: number
  currency: "USD"
  location: string
  status: "available" | "reserved" | "conflict"
  source: "cached" | "queued" | "accepted"
}

export type LocalSyncReservation = {
  reservation_id: string
  inventory_public_id: string
  source: "employee" | "kiosk"
  hold_reason: string
  actor_id: string
  status: "queued"
  created_at_utc: string
}

export type LocalSyncInventorySearchResult = LocalSyncResult<{
  items: LocalSyncInventoryItem[]
  local_cache_source: "local_sync_server"
}>

export type LocalSyncReservationResult = LocalSyncResult<{
  item: LocalSyncInventoryItem
  reservation: LocalSyncReservation
  wordpress_acceptance_required: true
}>

export type LocalSyncKioskOrderResult = LocalSyncResult<{
  order: {
    order_id: string
    first_name: string
    last_name: string
    status: "queued"
    reservation_ids: string[]
    created_at_utc: string
  }
  reservations: LocalSyncReservation[]
}>

export type LocalSyncStatusResult = LocalSyncResult<{
  local_database: "store-sync.sqlite"
  persistence_mode: "sqlite_adapter_pending" | "sqlite"
  queue_depth: number
  kiosk_order_count: number
  inventory_count: number
  active_session_count: number
  wordpress_push_connected: boolean
  local_operations_preserved: true
}>

export type LocalSyncFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type LocalSyncServerClient = {
  serverUrl: string
  authWithPin: (pin: string) => Promise<LocalSyncAuthResult>
  getAccessPolicy: (sessionToken: string) => Promise<LocalSyncAccessPolicyResult>
  addUser: (
    sessionToken: string,
    input: {
      name: string
      pin: string
      role: LocalSyncUserRole
      access: LocalSyncAccessSection[]
    },
  ) => Promise<LocalSyncResult<{ user: LocalSyncUser; raw_pin_returned: false; pin_hash_returned: false }>>
  updateUserAccess: (
    sessionToken: string,
    userId: string,
    input: {
      role: LocalSyncUserRole
      access: LocalSyncAccessSection[]
    },
  ) => Promise<LocalSyncResult<{ user: LocalSyncUser }>>
  searchInventory: (query: string) => Promise<LocalSyncInventorySearchResult>
  reserveInventory: (
    sessionToken: string,
    input: { inventoryPublicId: string; holdReason: string },
  ) => Promise<LocalSyncReservationResult>
  createKioskOrder: (
    input: { firstName: string; lastName: string; inventoryPublicIds: string[] },
  ) => Promise<LocalSyncKioskOrderResult>
  getSyncStatus: () => Promise<LocalSyncStatusResult>
}

export function createLocalSyncServerClient(
  serverUrl: string,
  fetcher: LocalSyncFetch = fetch,
): LocalSyncServerClient {
  const baseUrl = normalizeLocalSyncServerUrl(serverUrl)

  return {
    serverUrl: baseUrl,
    authWithPin: (pin) =>
      requestLocalSync(fetcher, baseUrl, "/auth/pin", {
        method: "POST",
        body: { pin },
      }) as Promise<LocalSyncAuthResult>,
    getAccessPolicy: (sessionToken) =>
      requestLocalSync(fetcher, baseUrl, "/users/access-policy", {
        sessionToken,
      }) as Promise<LocalSyncAccessPolicyResult>,
    addUser: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/users", {
        method: "POST",
        sessionToken,
        body: {
          name: input.name,
          pin: input.pin,
          role: input.role,
          access: input.access,
        },
      }) as Promise<LocalSyncResult<{ user: LocalSyncUser; raw_pin_returned: false; pin_hash_returned: false }>>,
    updateUserAccess: (sessionToken, userId, input) =>
      requestLocalSync(fetcher, baseUrl, `/users/${encodeURIComponent(userId)}/access`, {
        method: "PATCH",
        sessionToken,
        body: {
          role: input.role,
          access: input.access,
        },
      }) as Promise<LocalSyncResult<{ user: LocalSyncUser }>>,
    searchInventory: (query) =>
      requestLocalSync(fetcher, baseUrl, `/inventory/search?q=${encodeURIComponent(query)}`) as Promise<
        LocalSyncInventorySearchResult
      >,
    reserveInventory: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/inventory/reservations", {
        method: "POST",
        sessionToken,
        body: {
          inventory_public_id: input.inventoryPublicId,
          hold_reason: input.holdReason,
        },
      }) as Promise<LocalSyncReservationResult>,
    createKioskOrder: (input) =>
      requestLocalSync(fetcher, baseUrl, "/kiosk/orders", {
        method: "POST",
        body: {
          first_name: input.firstName,
          last_name: input.lastName,
          inventory_public_ids: input.inventoryPublicIds,
        },
      }) as Promise<LocalSyncKioskOrderResult>,
    getSyncStatus: () =>
      requestLocalSync(fetcher, baseUrl, "/sync/status") as Promise<LocalSyncStatusResult>,
  }
}

export function normalizeLocalSyncServerUrl(value: string) {
  try {
    const url = new URL(String(value).trim())

    if (!["http:", "https:"].includes(url.protocol)) {
      return "http://127.0.0.1:8787"
    }

    url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "")
    url.search = ""
    url.hash = ""

    return url.toString().replace(/\/$/, "")
  } catch {
    return "http://127.0.0.1:8787"
  }
}

async function requestLocalSync(
  fetcher: LocalSyncFetch,
  baseUrl: string,
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH"
    sessionToken?: string
    body?: Record<string, unknown>
  } = {},
): Promise<LocalSyncResult<Record<string, unknown>>> {
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    }

    if (options.sessionToken) {
      headers.authorization = `Bearer ${options.sessionToken}`
    }

    const response = await fetcher(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
    const body = await response.json() as Record<string, unknown>

    if (body.status === "ok" || body.status === "blocked") {
      return body as LocalSyncResult<Record<string, unknown>>
    }

    return {
      status: "blocked",
      code: "unexpected_local_sync_response",
      message: "The local sync server returned an unexpected response shape.",
    }
  } catch {
    return {
      status: "unavailable",
      code: "local_sync_server_unavailable",
      message: "The LAN local sync server is unavailable. Start it or check the configured host.",
    }
  }
}
