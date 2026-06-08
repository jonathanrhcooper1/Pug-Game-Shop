export type LocalSyncAccessSection =
  | "Inventory"
  | "Kiosk"
  | "Queue"
  | "Events"
  | "Customers"
  | "Sync"
  | "Status"
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
  provider_card_id: string
  game: "pokemon" | "magic" | "lorcana" | "one-piece"
  card_name: string
  set_name: string
  set_code: string
  card_number: string
  printed_number: string
  condition: string
  barcode: string
  price_minor_units: number
  currency: "USD"
  location: string
  status: "available" | "reserved" | "conflict" | "pending_intake"
  image_url: string
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

export type LocalSyncInventoryIntakeResult = LocalSyncResult<{
  item: LocalSyncInventoryItem
  items: LocalSyncInventoryItem[]
  quantity_added: number
  wordpress_acceptance_required: true
  label_print_deferred: true
}>

export type LocalSyncStockByCondition = {
  condition: string
  quantity: number
}

export type LocalSyncScryDexCard = {
  provider_card_id: string
  game: "pokemon" | "magic" | "lorcana" | "one-piece"
  card_name: string
  set_name: string
  set_code: string
  card_number: string
  printed_number: string
  suggested_barcode: string
  market_price_minor_units: number
  currency: "USD"
  image_url: string
  catalog_source: "wordpress_catalog_cache" | "local_reference_cache"
  price_observed_at_utc: string | null
  catalog_synced_at_utc: string
  stock_available_count: number
  stock_total_count: number
  stock_by_condition: LocalSyncStockByCondition[]
}

export type LocalSyncScryDexSearchResult = LocalSyncResult<{
  cards: LocalSyncScryDexCard[]
  query: string
  game: LocalSyncScryDexCard["game"]
  source: "wordpress_catalog_cache" | "local_reference_cache" | "wordpress_proxy"
  wordpress_proxy_required: true
  credential_storage: "wordpress_server_settings"
  credentials_synced_to_client: false
  live_provider_request_performed: boolean
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

export type LocalSyncCustomer = {
  customer_public_id: string
  customer_id: number | null
  row_version: number
  display_name: string
  first_name: string
  last_name: string
  customer_lookup: string
  email: string
  status: "active"
  credit: {
    balance_minor_units: number
    currency: "USD"
  }
  source: "cached" | "queued" | "accepted"
}

export type LocalSyncCreditLedgerEntry = {
  entry_id: string
  customer_public_id: string
  entry_type: string
  amount_minor_units: number
  balance_after_minor_units: number
  currency: "USD"
  status: "cached" | "pending_sync"
  reason: string
  source: string
  created_at_utc: string
}

export type LocalSyncCustomerSearchResult = LocalSyncResult<{
  customers: LocalSyncCustomer[]
  credit_ledger_entries: LocalSyncCreditLedgerEntry[]
  local_cache_source: "local_sync_server"
  wordpress_ledger_authority: true
}>

export type LocalSyncCreateCustomerResult = LocalSyncResult<{
  customer: LocalSyncCustomer
  wordpress_acceptance_required: true
}>

export type LocalSyncCreditAdjustmentResult = LocalSyncResult<{
  customer: LocalSyncCustomer
  ledger_entry: LocalSyncCreditLedgerEntry
  manager_approved: true
  wordpress_acceptance_required: true
}>

export type LocalSyncSquareCreditHandoff = {
  action: "customer_credit_square_pos_handoff"
  customer_public_id: string
  customer_id: number | null
  customer_name: string
  sale_total_minor_units: number
  credit_redeemed_minor_units: number
  square_amount_due_minor_units: number
  currency: "USD"
  square_payment_method_label: "Pug Store Credit"
  square_handoff_mode: "custom_payment_method"
  square_instruction: string
  pug_ledger_authority: true
  square_credit_balance_authority: false
  square_payment_capture_supported: false
  sync_required_for_ledger_posting: true
}

export type LocalSyncCreditRedemptionResult = LocalSyncResult<{
  customer: LocalSyncCustomer
  ledger_entry: LocalSyncCreditLedgerEntry
  square_handoff: LocalSyncSquareCreditHandoff
  wordpress_acceptance_required: true
  square_payment_capture_supported: false
}>

export type LocalSyncEventSnapshot = {
  event_id: string
  row_version: number
  title: string
  starts_at_utc: string
  starts_at_label: string
  registration_status: "open" | "waitlist" | "full" | "closed"
  capacity: number
  registered_count: number
  location_label: string
  note: string
  source: "cached" | "queued" | "accepted"
}

export type LocalSyncEventRegistration = {
  registration_id: string
  event_id: string
  attendee_label: string
  registration_status: "registered" | "waitlist"
  payment_status: "not_required" | "pay_at_store"
  status: "queued"
  created_at_utc: string
}

export type LocalSyncEventCheckin = {
  checkin_id: string
  event_id: string
  registration_public_id: string
  attendee_label: string
  checkin_method: string
  status: "queued"
  created_at_utc: string
}

export type LocalSyncEventListResult = LocalSyncResult<{
  events: LocalSyncEventSnapshot[]
  local_cache_source: "local_sync_server"
  wordpress_event_authority: true
}>

export type LocalSyncEventRegistrationResult = LocalSyncResult<{
  event: LocalSyncEventSnapshot
  registration: LocalSyncEventRegistration
  wordpress_acceptance_required: true
}>

export type LocalSyncEventCheckinResult = LocalSyncResult<{
  event: LocalSyncEventSnapshot
  checkin: LocalSyncEventCheckin
  wordpress_acceptance_required: true
}>

export type LocalSyncStatusResult = LocalSyncResult<{
  local_database: "store-sync.sqlite"
  persistence_mode: "sqlite_adapter_pending" | "sqlite"
  queue_depth: number
  kiosk_order_count: number
  inventory_count: number
  customer_count: number
  credit_ledger_entry_count: number
  event_count: number
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
  createInventoryIntake: (
    sessionToken: string,
    input: {
      cardName: string
      setName: string
      condition: string
      barcode: string
      priceMinorUnits: number
      location: string
      quantity?: number
      providerCardId?: string
      game?: LocalSyncScryDexCard["game"]
      setCode?: string
      cardNumber?: string
      printedNumber?: string
      imageUrl?: string
    },
  ) => Promise<LocalSyncInventoryIntakeResult>
  searchScryDexCards: (
    sessionToken: string,
    query: string,
    game?: LocalSyncScryDexCard["game"],
  ) => Promise<LocalSyncScryDexSearchResult>
  createKioskOrder: (
    input: { firstName: string; lastName: string; inventoryPublicIds: string[] },
  ) => Promise<LocalSyncKioskOrderResult>
  searchCustomers: (query: string) => Promise<LocalSyncCustomerSearchResult>
  createCustomer: (
    sessionToken: string,
    input: { firstName: string; lastName: string; email: string },
  ) => Promise<LocalSyncCreateCustomerResult>
  createCreditAdjustment: (
    sessionToken: string,
    input: { customerPublicId: string; amountMinorUnits: number; reason: string },
  ) => Promise<LocalSyncCreditAdjustmentResult>
  createCreditRedemption: (
    sessionToken: string,
    input: {
      customerPublicId: string
      amountMinorUnits: number
      saleTotalMinorUnits: number
      reason: string
    },
  ) => Promise<LocalSyncCreditRedemptionResult>
  listEvents: () => Promise<LocalSyncEventListResult>
  createEventRegistration: (
    sessionToken: string,
    input: {
      eventId: string
      attendeeLabel: string
      paymentStatus: "not_required" | "pay_at_store"
    },
  ) => Promise<LocalSyncEventRegistrationResult>
  createEventCheckin: (
    sessionToken: string,
    input: {
      eventId: string
      attendeeLabel: string
      registrationPublicId: string
      checkinMethod: string
    },
  ) => Promise<LocalSyncEventCheckinResult>
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
    createInventoryIntake: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/inventory/intake", {
        method: "POST",
        sessionToken,
        body: {
          card_name: input.cardName,
          set_name: input.setName,
          condition: input.condition,
          barcode: input.barcode,
          price_minor_units: input.priceMinorUnits,
          location: input.location,
          quantity: input.quantity ?? 1,
          provider_card_id: input.providerCardId ?? "",
          game: input.game ?? "pokemon",
          set_code: input.setCode ?? "",
          card_number: input.cardNumber ?? "",
          printed_number: input.printedNumber ?? "",
          image_url: input.imageUrl ?? "",
        },
      }) as Promise<LocalSyncInventoryIntakeResult>,
    searchScryDexCards: (sessionToken, query, game = "pokemon") =>
      requestLocalSync(
        fetcher,
        baseUrl,
        `/scrydex/cards/search?q=${encodeURIComponent(query)}&game=${encodeURIComponent(game)}`,
        { sessionToken },
      ) as Promise<LocalSyncScryDexSearchResult>,
    createKioskOrder: (input) =>
      requestLocalSync(fetcher, baseUrl, "/kiosk/orders", {
        method: "POST",
        body: {
          first_name: input.firstName,
          last_name: input.lastName,
          inventory_public_ids: input.inventoryPublicIds,
        },
      }) as Promise<LocalSyncKioskOrderResult>,
    searchCustomers: (query) =>
      requestLocalSync(fetcher, baseUrl, `/customers/search?q=${encodeURIComponent(query)}`) as Promise<
        LocalSyncCustomerSearchResult
      >,
    createCustomer: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/customers", {
        method: "POST",
        sessionToken,
        body: {
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
        },
      }) as Promise<LocalSyncCreateCustomerResult>,
    createCreditAdjustment: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/credit/adjustments", {
        method: "POST",
        sessionToken,
        body: {
          customer_public_id: input.customerPublicId,
          amount_minor_units: input.amountMinorUnits,
          reason: input.reason,
        },
      }) as Promise<LocalSyncCreditAdjustmentResult>,
    createCreditRedemption: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/credit/redemptions", {
        method: "POST",
        sessionToken,
        body: {
          customer_public_id: input.customerPublicId,
          amount_minor_units: input.amountMinorUnits,
          sale_total_minor_units: input.saleTotalMinorUnits,
          reason: input.reason,
        },
      }) as Promise<LocalSyncCreditRedemptionResult>,
    listEvents: () =>
      requestLocalSync(fetcher, baseUrl, "/events") as Promise<LocalSyncEventListResult>,
    createEventRegistration: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/events/registrations", {
        method: "POST",
        sessionToken,
        body: {
          event_id: input.eventId,
          attendee_label: input.attendeeLabel,
          payment_status: input.paymentStatus,
        },
      }) as Promise<LocalSyncEventRegistrationResult>,
    createEventCheckin: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/events/check-ins", {
        method: "POST",
        sessionToken,
        body: {
          event_id: input.eventId,
          attendee_label: input.attendeeLabel,
          registration_public_id: input.registrationPublicId,
          checkin_method: input.checkinMethod,
        },
      }) as Promise<LocalSyncEventCheckinResult>,
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
