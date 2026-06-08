import { createHash, randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { fileURLToPath } from "node:url"

export const ACCESS_SECTIONS = Object.freeze([
  "Inventory",
  "Kiosk",
  "Queue",
  "Events",
  "Customers",
  "Sync",
  "Status",
  "Conflicts",
  "Settings",
])

export const DEFAULT_LOCAL_SYNC_DATABASE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "store-sync.sqlite",
)

export function createLocalSyncStore(options = {}) {
  const now = options.now ?? (() => new Date())
  const database = options.database ?? openLocalSyncDatabase(options.databasePath ?? DEFAULT_LOCAL_SYNC_DATABASE_PATH)
  migrateLocalSyncDatabase(database)
  seedLocalSyncDatabase(database, now)

  const users = loadUsers(database)
  const sessions = new Map()
  const inventoryItems = loadInventoryItems(database)
  const queue = loadQueue(database)
  const kioskOrders = loadKioskOrders(database)
  const customers = loadCustomers(database)
  const creditLedgerEntries = loadCreditLedgerEntries(database)
  const eventSnapshots = loadEventSnapshots(database)

  function createSession({ pin, ttlMinutes = 30 } = {}) {
    const user = users.find((candidate) => verifyPin(pin, candidate))

    if (!user) {
      return blocked("invalid_pin", "PIN did not match a cached staff or manager policy.")
    }

    const token = `ls_${randomUUID()}`
    const expiresAt = new Date(now().getTime() + boundedInt(ttlMinutes, 5, 240, 30) * 60_000)
    const session = {
      token,
      userId: user.id,
      role: user.role,
      access: [...user.access],
      expiresAtUtc: expiresAt.toISOString(),
    }

    sessions.set(token, session)

    return {
      status: "ok",
      session,
      user: publicUser(user),
      raw_pin_returned: false,
      pin_hash_returned: false,
    }
  }

  function requireSession(token) {
    const session = sessions.get(String(token ?? ""))

    if (!session) {
      return blocked("session_required", "A valid local sync server session token is required.")
    }

    if (Date.parse(session.expiresAtUtc) <= now().getTime()) {
      sessions.delete(session.token)

      return blocked("session_expired", "The local sync server session expired.")
    }

    const user = users.find((candidate) => candidate.id === session.userId)

    if (!user) {
      return blocked("user_missing", "The cached user policy for this session is missing.")
    }

    return {
      status: "ok",
      session,
      user,
    }
  }

  function requireManager(token) {
    const sessionResult = requireSession(token)

    if (sessionResult.status !== "ok") {
      return sessionResult
    }

    if (sessionResult.user.role !== "manager") {
      return blocked("manager_required", "A manager PIN session is required.")
    }

    return sessionResult
  }

  function requireWorkspaceAccess(token, workspace) {
    const sessionResult = requireSession(token)

    if (sessionResult.status !== "ok") {
      return sessionResult
    }

    if (sessionResult.user.role !== "manager" && !sessionResult.user.access.includes(workspace)) {
      return blocked("workspace_access_required", `This PIN cannot access ${workspace}.`)
    }

    return sessionResult
  }

  function listAccessPolicy(token) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    return {
      status: "ok",
      users: users.map(publicUser),
      policy_source: "cached_wordpress_policy",
      pin_credentials_returned: false,
    }
  }

  function addUser(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const name = cleanName(input.name)
    const pin = String(input.pin ?? "")
    const role = cleanRole(input.role)
    const access = role === "manager" ? [...ACCESS_SECTIONS] : cleanAccess(input.access)

    if (!name || !/^\d{4}$/.test(pin) || access.length === 0) {
      return blocked("invalid_user", "Name, unique 4-digit PIN, role, and access are required.")
    }

    if (users.some((user) => verifyPin(pin, user))) {
      return blocked("duplicate_pin", "PIN already exists in the cached access policy.")
    }

    const user = {
      id: `local-user-${randomUUID()}`,
      name,
      role,
      access,
      pinSalt: `salt-${randomUUID()}`,
      pinHash: "",
    }
    user.pinHash = hashPin(pin, user.pinSalt)
    users.push(user)
    saveUser(database, user, now)
    appendQueueOperation(database, queue, "user_access_upsert", user.id, { role: user.role, access: user.access }, now)

    return {
      status: "ok",
      user: publicUser(user),
      raw_pin_returned: false,
      pin_hash_returned: false,
    }
  }

  function updateUserAccess(token, userId, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const user = users.find((candidate) => candidate.id === userId)

    if (!user) {
      return blocked("user_not_found", "No cached user policy matched that user ID.")
    }

    const role = cleanRole(input.role ?? user.role)
    const managerCount = users.filter((candidate) => candidate.role === "manager").length

    if (user.role === "manager" && role === "staff" && managerCount <= 1) {
      return blocked("last_manager", "At least one manager PIN must remain active.")
    }

    user.role = role
    user.access = role === "manager" ? [...ACCESS_SECTIONS] : cleanAccess(input.access ?? user.access)

    if (user.access.length === 0) {
      return blocked("access_required", "Staff users need access to at least one workspace.")
    }

    saveUser(database, user, now)
    appendQueueOperation(database, queue, "user_access_upsert", user.id, { role: user.role, access: user.access }, now)

    return {
      status: "ok",
      user: publicUser(user),
    }
  }

  function searchInventory({ query = "" } = {}) {
    const needle = String(query).trim().toLowerCase()
    const items = inventoryItems.filter((item) => {
      if (!needle) {
        return true
      }

      return [item.card_name, item.set_name, item.barcode, item.public_id].some((value) =>
        String(value).toLowerCase().includes(needle),
      )
    })

    return {
      status: "ok",
      items: items.map(publicInventoryItem),
      local_cache_source: "local_sync_server",
    }
  }

  function searchScryDexCards(token, { query = "", game = "pokemon" } = {}) {
    const session = requireWorkspaceAccess(token, "Inventory")

    if (session.status !== "ok") {
      return session
    }

    const needle = cleanScryDexQuery(query)
    const normalizedGame = cleanGame(game)

    if (!needle) {
      return blocked("scrydex_query_required", "Enter a card name, set, or number before searching ScryDex.")
    }

    const cards = seedScryDexReferenceCards()
      .filter((card) => card.game === normalizedGame)
      .filter((card) =>
        [
          card.provider_card_id,
          card.card_name,
          card.set_name,
          card.set_code,
          card.card_number,
          card.printed_number,
        ].some((value) => String(value).toLowerCase().includes(needle)),
      )
      .map((card) => enrichScryDexCard(card, inventoryItems))
      .slice(0, 8)

    return {
      status: "ok",
      cards,
      query: needle,
      game: normalizedGame,
      source: "wordpress_catalog_cache",
      wordpress_proxy_required: true,
      credential_storage: "wordpress_server_settings",
      credentials_synced_to_client: false,
      live_provider_request_performed: false,
    }
  }

  function reserveInventory(token, input = {}) {
    const session = requireSession(token)

    if (session.status !== "ok") {
      return session
    }

    if (!session.user.access.includes("Inventory") && session.user.role !== "manager") {
      return blocked("inventory_access_required", "This PIN cannot reserve inventory.")
    }

    return reserveInventoryItem({
      source: "employee",
      publicId: input.inventory_public_id,
      holdReason: cleanReason(input.hold_reason ?? "local reservation"),
      actorId: session.user.id,
    })
  }

  function createInventoryIntake(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Inventory")

    if (session.status !== "ok") {
      return session
    }

    const cardName = cleanName(input.card_name)
    const setName = cleanName(input.set_name) || "Manual Intake"
    const providerCardId = cleanPublicId(input.provider_card_id)
    const game = cleanGame(input.game)
    const setCode = cleanName(input.set_code).toUpperCase()
    const cardNumber = cleanName(input.card_number)
    const printedNumber = cleanName(input.printed_number)
    const condition = cleanCondition(input.condition ?? input.condition_code)
    const barcodeBase = cleanBarcode(input.barcode) || `PUG-${randomUUID().slice(0, 8).toUpperCase()}`
    const priceMinorUnits = Math.max(0, minorUnits(input.price_minor_units ?? input.sale_price_minor_units))
    const location = cleanName(input.location ?? input.location_label) || "Intake Queue"
    const imageUrl = cleanHttpUrl(input.image_url)
    const quantity = boundedInt(input.quantity ?? input.quantity_added, 1, 200, 1)

    if (!cardName || priceMinorUnits <= 0) {
      return blocked("invalid_inventory_intake", "Card name and positive price are required for local intake.")
    }

    const barcodes = Array.from({ length: quantity }, (_, index) =>
      quantity === 1 ? barcodeBase : `${barcodeBase}-${String(index + 1).padStart(2, "0")}`,
    )
    const duplicateBarcode = barcodes.find((barcode) =>
      inventoryItems.some((item) => item.barcode.toLowerCase() === barcode.toLowerCase()),
    )

    if (duplicateBarcode) {
      return blocked("duplicate_barcode", "A cached inventory item already uses that barcode.")
    }

    const items = barcodes.map((barcode) => ({
      public_id: `local-inventory-${randomUUID()}`,
      row_version: 1,
      provider_card_id: providerCardId,
      game,
      card_name: cardName,
      set_name: setName,
      set_code: setCode,
      card_number: cardNumber,
      printed_number: printedNumber,
      condition,
      barcode,
      price_minor_units: priceMinorUnits,
      currency: "USD",
      location,
      status: "pending_intake",
      image_url: imageUrl,
      source: "queued",
    }))

    for (const item of items) {
      inventoryItems.push(item)
      saveInventoryItem(database, item, now)
      appendQueueOperation(database, queue, "inventory_intake", item.public_id, {
        item: publicInventoryItem(item),
        actor_id: session.user.id,
        sync_intent: "offline_inventory_intake",
        wordpress_acceptance_required: true,
      }, now)
    }

    return {
      status: "ok",
      item: publicInventoryItem(items[0]),
      items: items.map(publicInventoryItem),
      quantity_added: items.length,
      wordpress_acceptance_required: true,
      label_print_deferred: true,
    }
  }

  function createKioskOrder(input = {}) {
    const firstName = cleanName(input.first_name)
    const lastName = cleanName(input.last_name)
    const publicIds = Array.isArray(input.inventory_public_ids) ? input.inventory_public_ids : []

    if (!firstName || !lastName || publicIds.length === 0) {
      return blocked("invalid_kiosk_order", "First name, last name, and at least one item are required.")
    }

    for (const publicId of publicIds) {
      const item = inventoryItems.find((candidate) => candidate.public_id === publicId)

      if (!item) {
        return blocked("inventory_not_found", "No cached inventory item matched that public ID.")
      }

      if (item.status !== "available") {
        return blocked("inventory_unavailable", "The local sync server already has a lock or accepted status for this item.", {
          item: publicInventoryItem(item),
        })
      }
    }

    const reservations = []

    for (const publicId of publicIds) {
      const reservation = reserveInventoryItem({
        source: "kiosk",
        publicId,
        holdReason: `kiosk pickup order for ${firstName} ${lastName}`,
        actorId: "kiosk",
      })

      if (reservation.status !== "ok") {
        return reservation
      }

      reservations.push(reservation.reservation)
    }

    const order = {
      order_id: `kiosk-${randomUUID()}`,
      first_name: firstName,
      last_name: lastName,
      status: "queued",
      reservation_ids: reservations.map((reservation) => reservation.reservation_id),
      created_at_utc: now().toISOString(),
    }

    kioskOrders.push(order)
    saveKioskOrder(database, order)
    appendQueueOperation(database, queue, "kiosk_order", order.order_id, order, now)

    return {
      status: "ok",
      order,
      reservations,
    }
  }

  function searchCustomers({ query = "" } = {}) {
    const needle = String(query).trim().toLowerCase()
    const matches = customers.filter((customer) => {
      if (!needle) {
        return true
      }

      return [
        customer.customer_public_id,
        customer.display_name,
        customer.first_name,
        customer.last_name,
        customer.lookup,
        customer.email,
      ].some((value) => String(value ?? "").toLowerCase().includes(needle))
    })

    return {
      status: "ok",
      customers: matches.map(publicCustomer),
      credit_ledger_entries: creditLedgerEntries.map(publicCreditLedgerEntry),
      local_cache_source: "local_sync_server",
      wordpress_ledger_authority: true,
    }
  }

  function listEvents() {
    return {
      status: "ok",
      events: eventSnapshots.map(publicEventSnapshot),
      local_cache_source: "local_sync_server",
      wordpress_event_authority: true,
    }
  }

  function createEventRegistration(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Events")

    if (session.status !== "ok") {
      return session
    }

    const event = findEvent(eventSnapshots, input.event_id ?? input.entity_id)

    if (!event) {
      return blocked("event_not_found", "No cached event matched that event ID.")
    }

    if (event.registration_status === "closed" || event.registration_status === "full") {
      return blocked("event_registration_closed", "The cached event is not accepting local registrations.")
    }

    const attendeeLabel = cleanName(input.attendee_label) || "Offline walk-in"
    const paymentStatus = cleanEventPaymentStatus(input.payment_status)
    const registrationStatus = event.registration_status === "waitlist" ? "waitlist" : "registered"
    const registration = {
      registration_id: `event-registration-${randomUUID()}`,
      event_id: event.event_id,
      attendee_label: attendeeLabel,
      registration_status: registrationStatus,
      payment_status: paymentStatus,
      status: "queued",
      created_at_utc: now().toISOString(),
    }

    if (event.registration_status === "open") {
      event.registered_count = Math.min(event.capacity, event.registered_count + 1)
      event.registration_status = event.registered_count >= event.capacity ? "full" : "open"
    }

    event.row_version += 1
    event.source = "queued"
    event.note =
      registrationStatus === "waitlist"
        ? "Waitlist request queued on the LAN server; WordPress remains authoritative."
        : "Registration queued on the LAN server; WordPress capacity remains authoritative."
    saveEventSnapshot(database, event, now)
    appendQueueOperation(database, queue, "event_registration", registration.registration_id, {
      event: publicEventSnapshot(event),
      registration,
      actor_id: session.user.id,
      sync_intent: "offline_event_registration",
    }, now)

    return {
      status: "ok",
      event: publicEventSnapshot(event),
      registration,
      wordpress_acceptance_required: true,
    }
  }

  function createEventCheckin(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Events")

    if (session.status !== "ok") {
      return session
    }

    const event = findEvent(eventSnapshots, input.event_id ?? input.entity_id)

    if (!event) {
      return blocked("event_not_found", "No cached event matched that event ID.")
    }

    if (event.registration_status === "closed") {
      return blocked("event_checkin_closed", "The cached event is closed for local check-ins.")
    }

    const attendeeLabel = cleanName(input.attendee_label) || "Offline attendee"
    const registrationPublicId =
      cleanPublicId(input.registration_public_id) || `registration-${event.event_id}-${randomUUID().slice(0, 8)}`
    const checkin = {
      checkin_id: `event-checkin-${randomUUID()}`,
      event_id: event.event_id,
      registration_public_id: registrationPublicId,
      attendee_label: attendeeLabel,
      checkin_method: cleanName(input.checkin_method) || "manual_lookup",
      status: "queued",
      created_at_utc: now().toISOString(),
    }

    event.row_version += 1
    event.source = "queued"
    event.note = "Check-in queued on the LAN server; WordPress registration match remains authoritative."
    saveEventSnapshot(database, event, now)
    appendQueueOperation(database, queue, "event_checkin", checkin.checkin_id, {
      event: publicEventSnapshot(event),
      checkin,
      actor_id: session.user.id,
      sync_intent: "offline_event_checkin",
    }, now)

    return {
      status: "ok",
      event: publicEventSnapshot(event),
      checkin,
      wordpress_acceptance_required: true,
    }
  }

  function createCustomer(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Customers")

    if (session.status !== "ok") {
      return session
    }

    const firstName = cleanName(input.first_name)
    const lastName = cleanName(input.last_name)
    const displayName = cleanName(input.display_name) || cleanName(`${firstName} ${lastName}`)
    const email = cleanEmail(input.email)
    const lookup = email || cleanName(input.customer_lookup)

    if (!displayName || (!firstName && !lastName && !email)) {
      return blocked("invalid_customer", "Customer name or email is required.")
    }

    if (email && customers.some((customer) => customer.email.toLowerCase() === email.toLowerCase())) {
      return blocked("duplicate_customer", "A cached customer already uses that email address.")
    }

    const customer = {
      customer_public_id: `local-customer-${randomUUID()}`,
      wordpress_customer_id: null,
      row_version: 1,
      display_name: displayName,
      first_name: firstName,
      last_name: lastName,
      lookup,
      email,
      status: "active",
      credit_balance_minor_units: 0,
      credit_currency: "USD",
      source: "queued",
    }

    customers.push(customer)
    saveCustomer(database, customer, now)
    appendQueueOperation(database, queue, "customer_upsert", customer.customer_public_id, {
      customer: publicCustomer(customer),
      actor_id: session.user.id,
      sync_intent: "offline_customer_create",
    }, now)

    return {
      status: "ok",
      customer: publicCustomer(customer),
      wordpress_acceptance_required: true,
    }
  }

  function createCreditAdjustment(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const customer = findCustomer(customers, input)

    if (!customer) {
      return blocked("customer_not_found", "No cached customer matched that customer ID.")
    }

    const amountMinorUnits = minorUnits(input.amount_minor_units)
    const reason = cleanReason(input.reason ?? "manager credit adjustment")

    if (amountMinorUnits === 0) {
      return blocked("invalid_credit_amount", "Credit adjustment amount must be non-zero.")
    }

    const balanceAfterMinorUnits = customer.credit_balance_minor_units + amountMinorUnits

    if (balanceAfterMinorUnits < 0) {
      return blocked("insufficient_credit", "Customer credit balance cannot go negative.")
    }

    customer.credit_balance_minor_units = balanceAfterMinorUnits
    customer.row_version += 1
    customer.source = "queued"
    saveCustomer(database, customer, now)

    const ledgerEntry = buildCreditLedgerEntry({
      customer,
      entryType: amountMinorUnits > 0 ? "manual_credit_add" : "manual_credit_correction",
      amountMinorUnits,
      balanceAfterMinorUnits,
      reason,
      source: "manager_adjustment",
      now,
    })
    creditLedgerEntries.push(ledgerEntry)
    saveCreditLedgerEntry(database, ledgerEntry)
    appendQueueOperation(database, queue, "credit_adjustment", ledgerEntry.entry_id, {
      customer: publicCustomer(customer),
      ledger_entry: publicCreditLedgerEntry(ledgerEntry),
      manager_user_id: manager.user.id,
      sync_intent: "offline_credit_adjustment",
    }, now)

    return {
      status: "ok",
      customer: publicCustomer(customer),
      ledger_entry: publicCreditLedgerEntry(ledgerEntry),
      manager_approved: true,
      wordpress_acceptance_required: true,
    }
  }

  function createCreditRedemption(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Customers")

    if (session.status !== "ok") {
      return session
    }

    const customer = findCustomer(customers, input)

    if (!customer) {
      return blocked("customer_not_found", "No cached customer matched that customer ID.")
    }

    const amountMinorUnits = minorUnits(input.amount_minor_units)
    const saleTotalMinorUnits = Math.max(0, minorUnits(input.sale_total_minor_units ?? amountMinorUnits))
    const reason = cleanReason(input.reason ?? "store credit redemption")

    if (amountMinorUnits <= 0) {
      return blocked("invalid_credit_amount", "Credit redemption amount must be greater than zero.")
    }

    if (saleTotalMinorUnits > 0 && amountMinorUnits > saleTotalMinorUnits) {
      return blocked("credit_exceeds_sale_total", "Credit redemption cannot exceed the Square sale total.")
    }

    if (amountMinorUnits > customer.credit_balance_minor_units) {
      return blocked("insufficient_credit", "Customer does not have enough cached credit for this redemption.", {
        customer: publicCustomer(customer),
      })
    }

    const balanceAfterMinorUnits = customer.credit_balance_minor_units - amountMinorUnits
    customer.credit_balance_minor_units = balanceAfterMinorUnits
    customer.row_version += 1
    customer.source = "queued"
    saveCustomer(database, customer, now)

    const ledgerEntry = buildCreditLedgerEntry({
      customer,
      entryType: "purchase_redemption",
      amountMinorUnits: -amountMinorUnits,
      balanceAfterMinorUnits,
      reason,
      source: "employee_redemption",
      now,
    })
    const squareHandoff = buildSquareCreditHandoff(customer, amountMinorUnits, saleTotalMinorUnits)

    creditLedgerEntries.push(ledgerEntry)
    saveCreditLedgerEntry(database, ledgerEntry)
    appendQueueOperation(database, queue, "credit_redemption", ledgerEntry.entry_id, {
      customer: publicCustomer(customer),
      ledger_entry: publicCreditLedgerEntry(ledgerEntry),
      square_handoff: squareHandoff,
      actor_id: session.user.id,
      sync_intent: "offline_credit_redemption",
    }, now)

    return {
      status: "ok",
      customer: publicCustomer(customer),
      ledger_entry: publicCreditLedgerEntry(ledgerEntry),
      square_handoff: squareHandoff,
      wordpress_acceptance_required: true,
      square_payment_capture_supported: false,
    }
  }

  function reserveInventoryItem({ source, publicId, holdReason, actorId }) {
    const item = inventoryItems.find((candidate) => candidate.public_id === publicId)

    if (!item) {
      return blocked("inventory_not_found", "No cached inventory item matched that public ID.")
    }

    if (item.status !== "available") {
      return blocked("inventory_unavailable", "The local sync server already has a lock or accepted status for this item.", {
        item: publicInventoryItem(item),
      })
    }

    item.status = "reserved"
    item.source = "queued"
    item.row_version += 1
    saveInventoryItem(database, item, now)

    const reservation = {
      reservation_id: `reservation-${randomUUID()}`,
      inventory_public_id: item.public_id,
      source,
      hold_reason: holdReason,
      actor_id: actorId,
      status: "queued",
      created_at_utc: now().toISOString(),
    }

    appendQueueOperation(database, queue, "inventory_reservation", reservation.reservation_id, reservation, now)

    return {
      status: "ok",
      item: publicInventoryItem(item),
      reservation,
      wordpress_acceptance_required: true,
    }
  }

  function syncStatus() {
    return {
      status: "ok",
      local_database: "store-sync.sqlite",
      persistence_mode: "sqlite",
      queue_depth: queue.length,
      kiosk_order_count: kioskOrders.length,
      inventory_count: inventoryItems.length,
      customer_count: customers.length,
      credit_ledger_entry_count: creditLedgerEntries.length,
      event_count: eventSnapshots.length,
      active_session_count: sessions.size,
      wordpress_push_connected: false,
      local_operations_preserved: true,
    }
  }

  return {
    addUser,
    close: () => database.close(),
    createCreditAdjustment,
    createCreditRedemption,
    createCustomer,
    createEventCheckin,
    createEventRegistration,
    createInventoryIntake,
    createKioskOrder,
    listEvents,
    createSession,
    listAccessPolicy,
    reserveInventory,
    searchCustomers,
    searchInventory,
    searchScryDexCards,
    syncStatus,
    updateUserAccess,
  }
}

function openLocalSyncDatabase(databasePath) {
  const resolvedPath = String(databasePath || DEFAULT_LOCAL_SYNC_DATABASE_PATH)

  if (resolvedPath !== ":memory:") {
    mkdirSync(dirname(resolvedPath), { recursive: true })
  }

  const database = new DatabaseSync(resolvedPath)
  database.exec("PRAGMA foreign_keys = ON;")

  if (resolvedPath !== ":memory:") {
    database.exec("PRAGMA journal_mode = WAL;")
  }

  return database
}

function migrateLocalSyncDatabase(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('staff', 'manager')),
      access_json TEXT NOT NULL,
      pin_salt TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      public_id TEXT PRIMARY KEY,
      row_version INTEGER NOT NULL,
      provider_card_id TEXT NOT NULL DEFAULT '',
      game TEXT NOT NULL DEFAULT 'pokemon',
      card_name TEXT NOT NULL,
      set_name TEXT NOT NULL,
      set_code TEXT NOT NULL DEFAULT '',
      card_number TEXT NOT NULL DEFAULT '',
      printed_number TEXT NOT NULL DEFAULT '',
      condition TEXT NOT NULL,
      barcode TEXT NOT NULL,
      price_minor_units INTEGER NOT NULL,
      currency TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS operation_queue (
      operation_id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      queued_at_utc TEXT NOT NULL,
      sync_status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kiosk_orders (
      order_id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      status TEXT NOT NULL,
      reservation_ids_json TEXT NOT NULL,
      created_at_utc TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      customer_public_id TEXT PRIMARY KEY,
      wordpress_customer_id INTEGER NULL,
      row_version INTEGER NOT NULL,
      display_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      lookup TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL,
      credit_balance_minor_units INTEGER NOT NULL,
      credit_currency TEXT NOT NULL,
      source TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credit_ledger_entries (
      entry_id TEXT PRIMARY KEY,
      customer_public_id TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      amount_minor_units INTEGER NOT NULL,
      balance_after_minor_units INTEGER NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at_utc TEXT NOT NULL,
      FOREIGN KEY (customer_public_id) REFERENCES customers(customer_public_id)
    );

    CREATE TABLE IF NOT EXISTS event_snapshots (
      event_id TEXT PRIMARY KEY,
      row_version INTEGER NOT NULL,
      title TEXT NOT NULL,
      starts_at_utc TEXT NOT NULL,
      starts_at_label TEXT NOT NULL,
      registration_status TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      registered_count INTEGER NOT NULL,
      location_label TEXT NOT NULL,
      note TEXT NOT NULL,
      source TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
    );
  `)

  ensureLocalSyncColumn(database, "inventory_items", "provider_card_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "game", "TEXT NOT NULL DEFAULT 'pokemon'")
  ensureLocalSyncColumn(database, "inventory_items", "set_code", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "card_number", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "printed_number", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "image_url", "TEXT NOT NULL DEFAULT ''")
}

function seedLocalSyncDatabase(database, now) {
  const userCount = database.prepare("SELECT COUNT(*) AS count FROM users").get().count
  const inventoryCount = database.prepare("SELECT COUNT(*) AS count FROM inventory_items").get().count
  const customerCount = database.prepare("SELECT COUNT(*) AS count FROM customers").get().count
  const eventCount = database.prepare("SELECT COUNT(*) AS count FROM event_snapshots").get().count

  if (Number(userCount) === 0) {
    for (const user of seedUsers()) {
      saveUser(database, user, now)
    }
  }

  if (Number(inventoryCount) === 0) {
    for (const item of seedInventoryItems()) {
      saveInventoryItem(database, item, now)
    }
  }

  if (Number(customerCount) === 0) {
    for (const customer of seedCustomers()) {
      saveCustomer(database, customer, now)
    }

    for (const ledgerEntry of seedCreditLedgerEntries()) {
      saveCreditLedgerEntry(database, ledgerEntry)
    }
  }

  if (Number(eventCount) === 0) {
    for (const event of seedEventSnapshots()) {
      saveEventSnapshot(database, event, now)
    }
  }
}

function ensureLocalSyncColumn(database, tableName, columnName, definition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all()
  const hasColumn = columns.some((column) => column.name === columnName)

  if (!hasColumn) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
  }
}

function loadUsers(database) {
  return database
    .prepare("SELECT id, name, role, access_json, pin_salt, pin_hash FROM users ORDER BY id")
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      role: cleanRole(row.role),
      access: cleanAccess(parseJson(row.access_json, [])),
      pinSalt: row.pin_salt,
      pinHash: row.pin_hash,
    }))
}

function loadInventoryItems(database) {
  return database
    .prepare(`
      SELECT public_id, row_version, provider_card_id, game, card_name, set_name,
        set_code, card_number, printed_number, condition, barcode, price_minor_units,
        currency, location, status, image_url, source
      FROM inventory_items
      ORDER BY public_id
    `)
    .all()
    .map((row) => ({
      public_id: row.public_id,
      row_version: Number(row.row_version),
      provider_card_id: row.provider_card_id ?? "",
      game: cleanGame(row.game),
      card_name: row.card_name,
      set_name: row.set_name,
      set_code: row.set_code ?? "",
      card_number: row.card_number ?? "",
      printed_number: row.printed_number ?? "",
      condition: row.condition,
      barcode: row.barcode,
      price_minor_units: Number(row.price_minor_units),
      currency: row.currency,
      location: row.location,
      status: row.status,
      image_url: row.image_url ?? "",
      source: row.source,
    }))
}

function loadQueue(database) {
  return database
    .prepare(`
      SELECT operation_id, operation_type, entity_id, payload_json, queued_at_utc, sync_status
      FROM operation_queue
      ORDER BY queued_at_utc, operation_id
    `)
    .all()
    .map((row) => ({
      operation_id: row.operation_id,
      operation_type: row.operation_type,
      entity_id: row.entity_id,
      payload: parseJson(row.payload_json, {}),
      queued_at_utc: row.queued_at_utc,
      sync_status: row.sync_status,
    }))
}

function loadKioskOrders(database) {
  return database
    .prepare(`
      SELECT order_id, first_name, last_name, status, reservation_ids_json, created_at_utc
      FROM kiosk_orders
      ORDER BY created_at_utc, order_id
    `)
    .all()
    .map((row) => ({
      order_id: row.order_id,
      first_name: row.first_name,
      last_name: row.last_name,
      status: row.status,
      reservation_ids: parseJson(row.reservation_ids_json, []),
      created_at_utc: row.created_at_utc,
    }))
}

function loadCustomers(database) {
  return database
    .prepare(`
      SELECT customer_public_id, wordpress_customer_id, row_version, display_name,
        first_name, last_name, lookup, email, status, credit_balance_minor_units,
        credit_currency, source
      FROM customers
      ORDER BY display_name, customer_public_id
    `)
    .all()
    .map((row) => ({
      customer_public_id: row.customer_public_id,
      wordpress_customer_id:
        row.wordpress_customer_id === null || row.wordpress_customer_id === undefined
          ? null
          : Number(row.wordpress_customer_id),
      row_version: Number(row.row_version),
      display_name: row.display_name,
      first_name: row.first_name,
      last_name: row.last_name,
      lookup: row.lookup,
      email: row.email,
      status: row.status,
      credit_balance_minor_units: Number(row.credit_balance_minor_units),
      credit_currency: row.credit_currency,
      source: row.source,
    }))
}

function loadCreditLedgerEntries(database) {
  return database
    .prepare(`
      SELECT entry_id, customer_public_id, entry_type, amount_minor_units,
        balance_after_minor_units, currency, status, reason, source, created_at_utc
      FROM credit_ledger_entries
      ORDER BY created_at_utc DESC, entry_id
    `)
    .all()
    .map((row) => ({
      entry_id: row.entry_id,
      customer_public_id: row.customer_public_id,
      entry_type: row.entry_type,
      amount_minor_units: Number(row.amount_minor_units),
      balance_after_minor_units: Number(row.balance_after_minor_units),
      currency: row.currency,
      status: row.status,
      reason: row.reason,
      source: row.source,
      created_at_utc: row.created_at_utc,
    }))
}

function loadEventSnapshots(database) {
  return database
    .prepare(`
      SELECT event_id, row_version, title, starts_at_utc, starts_at_label,
        registration_status, capacity, registered_count, location_label, note, source
      FROM event_snapshots
      ORDER BY starts_at_utc, event_id
    `)
    .all()
    .map((row) => ({
      event_id: row.event_id,
      row_version: Number(row.row_version),
      title: row.title,
      starts_at_utc: row.starts_at_utc,
      starts_at_label: row.starts_at_label,
      registration_status: cleanEventRegistrationStatus(row.registration_status),
      capacity: Number(row.capacity),
      registered_count: Number(row.registered_count),
      location_label: row.location_label,
      note: row.note,
      source: row.source,
    }))
}

function saveUser(database, user, now) {
  database
    .prepare(`
      INSERT INTO users (id, name, role, access_json, pin_salt, pin_hash, updated_at_utc)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        access_json = excluded.access_json,
        pin_salt = excluded.pin_salt,
        pin_hash = excluded.pin_hash,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      user.id,
      user.name,
      user.role,
      JSON.stringify(cleanAccess(user.access)),
      user.pinSalt,
      user.pinHash,
      now().toISOString(),
    )
}

function saveInventoryItem(database, item, now) {
  database
    .prepare(`
      INSERT INTO inventory_items (
        public_id, row_version, provider_card_id, game, card_name, set_name,
        set_code, card_number, printed_number, condition, barcode, price_minor_units,
        currency, location, status, image_url, source, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(public_id) DO UPDATE SET
        row_version = excluded.row_version,
        provider_card_id = excluded.provider_card_id,
        game = excluded.game,
        card_name = excluded.card_name,
        set_name = excluded.set_name,
        set_code = excluded.set_code,
        card_number = excluded.card_number,
        printed_number = excluded.printed_number,
        condition = excluded.condition,
        barcode = excluded.barcode,
        price_minor_units = excluded.price_minor_units,
        currency = excluded.currency,
        location = excluded.location,
        status = excluded.status,
        image_url = excluded.image_url,
        source = excluded.source,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      item.public_id,
      item.row_version,
      item.provider_card_id ?? "",
      cleanGame(item.game),
      item.card_name,
      item.set_name,
      item.set_code ?? "",
      item.card_number ?? "",
      item.printed_number ?? "",
      item.condition,
      item.barcode,
      item.price_minor_units,
      item.currency,
      item.location,
      item.status,
      item.image_url ?? "",
      item.source,
      now().toISOString(),
    )
}

function saveKioskOrder(database, order) {
  database
    .prepare(`
      INSERT INTO kiosk_orders (order_id, first_name, last_name, status, reservation_ids_json, created_at_utc)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        status = excluded.status,
        reservation_ids_json = excluded.reservation_ids_json
    `)
    .run(
      order.order_id,
      order.first_name,
      order.last_name,
      order.status,
      JSON.stringify(order.reservation_ids),
      order.created_at_utc,
    )
}

function saveCustomer(database, customer, now) {
  database
    .prepare(`
      INSERT INTO customers (
        customer_public_id, wordpress_customer_id, row_version, display_name,
        first_name, last_name, lookup, email, status, credit_balance_minor_units,
        credit_currency, source, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(customer_public_id) DO UPDATE SET
        wordpress_customer_id = excluded.wordpress_customer_id,
        row_version = excluded.row_version,
        display_name = excluded.display_name,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        lookup = excluded.lookup,
        email = excluded.email,
        status = excluded.status,
        credit_balance_minor_units = excluded.credit_balance_minor_units,
        credit_currency = excluded.credit_currency,
        source = excluded.source,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      customer.customer_public_id,
      customer.wordpress_customer_id,
      customer.row_version,
      customer.display_name,
      customer.first_name,
      customer.last_name,
      customer.lookup,
      customer.email,
      customer.status,
      customer.credit_balance_minor_units,
      customer.credit_currency,
      customer.source,
      now().toISOString(),
    )
}

function saveCreditLedgerEntry(database, entry) {
  database
    .prepare(`
      INSERT INTO credit_ledger_entries (
        entry_id, customer_public_id, entry_type, amount_minor_units,
        balance_after_minor_units, currency, status, reason, source, created_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(entry_id) DO UPDATE SET
        status = excluded.status,
        reason = excluded.reason,
        source = excluded.source
    `)
    .run(
      entry.entry_id,
      entry.customer_public_id,
      entry.entry_type,
      entry.amount_minor_units,
      entry.balance_after_minor_units,
      entry.currency,
      entry.status,
      entry.reason,
      entry.source,
      entry.created_at_utc,
    )
}

function saveEventSnapshot(database, event, now) {
  database
    .prepare(`
      INSERT INTO event_snapshots (
        event_id, row_version, title, starts_at_utc, starts_at_label,
        registration_status, capacity, registered_count, location_label, note,
        source, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO UPDATE SET
        row_version = excluded.row_version,
        title = excluded.title,
        starts_at_utc = excluded.starts_at_utc,
        starts_at_label = excluded.starts_at_label,
        registration_status = excluded.registration_status,
        capacity = excluded.capacity,
        registered_count = excluded.registered_count,
        location_label = excluded.location_label,
        note = excluded.note,
        source = excluded.source,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      event.event_id,
      event.row_version,
      event.title,
      event.starts_at_utc,
      event.starts_at_label,
      event.registration_status,
      event.capacity,
      event.registered_count,
      event.location_label,
      event.note,
      event.source,
      now().toISOString(),
    )
}

function appendQueueOperation(database, queue, type, entityId, payload, now) {
  const operation = queueOperation(type, entityId, payload, now)

  database
    .prepare(`
      INSERT INTO operation_queue (operation_id, operation_type, entity_id, payload_json, queued_at_utc, sync_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      operation.operation_id,
      operation.operation_type,
      operation.entity_id,
      JSON.stringify(operation.payload),
      operation.queued_at_utc,
      operation.sync_status,
    )
  queue.push(operation)

  return operation
}

function seedUsers() {
  return [
    buildSeedUser({
      id: "staff-front-counter",
      name: "Front Counter Staff",
      pin: "1234",
      role: "staff",
      access: ["Inventory", "Kiosk", "Queue", "Events", "Customers", "Sync", "Status"],
      salt: "seed-staff-front-counter",
    }),
    buildSeedUser({
      id: "manager-default",
      name: "Store Manager",
      pin: "9999",
      role: "manager",
      access: [...ACCESS_SECTIONS],
      salt: "seed-manager-default",
    }),
  ]
}

function buildSeedUser({ id, name, pin, role, access, salt }) {
  return {
    id,
    name,
    role,
    access,
    pinSalt: salt,
    pinHash: hashPin(pin, salt),
  }
}

function seedInventoryItems() {
  return [
    {
      public_id: "inv-1001",
      row_version: 1,
      provider_card_id: "scrydex-pokemon-base-004",
      game: "pokemon",
      card_name: "Charizard",
      set_name: "Base Set",
      set_code: "BASE",
      card_number: "4",
      printed_number: "4/102",
      condition: "LP",
      barcode: "PUG-000001",
      price_minor_units: 125000,
      currency: "USD",
      location: "Showcase A",
      status: "available",
      image_url: "https://images.pokemontcg.io/base1/4_hires.png",
      source: "cached",
    },
    {
      public_id: "inv-1002",
      row_version: 1,
      provider_card_id: "scrydex-pokemon-jungle-060",
      game: "pokemon",
      card_name: "Pikachu",
      set_name: "Jungle",
      set_code: "JGL",
      card_number: "60",
      printed_number: "60/64",
      condition: "NM",
      barcode: "PUG-000002",
      price_minor_units: 3200,
      currency: "USD",
      location: "Case 2",
      status: "available",
      image_url: "https://images.pokemontcg.io/jungle/60_hires.png",
      source: "cached",
    },
  ]
}

function seedCustomers() {
  return [
    {
      customer_public_id: "customer-91",
      wordpress_customer_id: 91,
      row_version: 6,
      display_name: "Morgan Lee",
      first_name: "Morgan",
      last_name: "Lee",
      lookup: "morgan@example.test",
      email: "morgan@example.test",
      status: "active",
      credit_balance_minor_units: 24600,
      credit_currency: "USD",
      source: "cached",
    },
    {
      customer_public_id: "customer-104",
      wordpress_customer_id: 104,
      row_version: 3,
      display_name: "Avery Chen",
      first_name: "Avery",
      last_name: "Chen",
      lookup: "avery@example.test",
      email: "avery@example.test",
      status: "active",
      credit_balance_minor_units: 7250,
      credit_currency: "USD",
      source: "cached",
    },
    {
      customer_public_id: "customer-117",
      wordpress_customer_id: 117,
      row_version: 2,
      display_name: "Riley Patel",
      first_name: "Riley",
      last_name: "Patel",
      lookup: "riley@example.test",
      email: "riley@example.test",
      status: "active",
      credit_balance_minor_units: 0,
      credit_currency: "USD",
      source: "cached",
    },
  ]
}

function seedCreditLedgerEntries() {
  return [
    {
      entry_id: "ledger-91-buylist-001",
      customer_public_id: "customer-91",
      entry_type: "buylist_credit",
      amount_minor_units: 5000,
      balance_after_minor_units: 24600,
      currency: "USD",
      status: "cached",
      reason: "Buylist payout approved",
      source: "website_cache",
      created_at_utc: "2026-06-07T20:18:00.000Z",
    },
    {
      entry_id: "ledger-91-purchase-002",
      customer_public_id: "customer-91",
      entry_type: "purchase_redemption",
      amount_minor_units: -1800,
      balance_after_minor_units: 19600,
      currency: "USD",
      status: "cached",
      reason: "Singles purchase redemption",
      source: "website_cache",
      created_at_utc: "2026-06-06T18:42:00.000Z",
    },
    {
      entry_id: "ledger-104-league-001",
      customer_public_id: "customer-104",
      entry_type: "league_prize_credit",
      amount_minor_units: 7250,
      balance_after_minor_units: 7250,
      currency: "USD",
      status: "cached",
      reason: "League prize credit",
      source: "website_cache",
      created_at_utc: "2026-06-05T23:05:00.000Z",
    },
  ]
}

function seedEventSnapshots() {
  return [
    {
      event_id: "event-100",
      row_version: 3,
      title: "Friday Commander Night",
      starts_at_utc: "2026-06-12T23:00:00Z",
      starts_at_label: "Fri Jun 12, 7:00 PM",
      registration_status: "open",
      capacity: 24,
      registered_count: 10,
      location_label: "Event Room",
      note: "Cached event ready for offline check-in and registration review.",
      source: "cached",
    },
    {
      event_id: "event-101",
      row_version: 2,
      title: "Pokemon League Challenge",
      starts_at_utc: "2026-06-14T17:00:00Z",
      starts_at_label: "Sun Jun 14, 1:00 PM",
      registration_status: "waitlist",
      capacity: 32,
      registered_count: 32,
      location_label: "Main Tables",
      note: "Waitlist state cached for offline staff review.",
      source: "cached",
    },
  ]
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    access: [...user.access],
    pin_hash_returned: false,
  }
}

function publicInventoryItem(item) {
  return {
    public_id: item.public_id,
    row_version: item.row_version,
    provider_card_id: item.provider_card_id ?? "",
    game: cleanGame(item.game),
    card_name: item.card_name,
    set_name: item.set_name,
    set_code: item.set_code ?? "",
    card_number: item.card_number ?? "",
    printed_number: item.printed_number ?? "",
    condition: item.condition,
    barcode: item.barcode,
    price_minor_units: item.price_minor_units,
    currency: item.currency,
    location: item.location,
    status: item.status,
    image_url: item.image_url ?? "",
    source: item.source,
  }
}

function publicCustomer(customer) {
  return {
    customer_public_id: customer.customer_public_id,
    customer_id: customer.wordpress_customer_id,
    row_version: customer.row_version,
    display_name: customer.display_name,
    first_name: customer.first_name,
    last_name: customer.last_name,
    customer_lookup: customer.lookup,
    email: customer.email,
    status: customer.status,
    credit: {
      balance_minor_units: customer.credit_balance_minor_units,
      currency: customer.credit_currency,
    },
    source: customer.source,
  }
}

function publicCreditLedgerEntry(entry) {
  return {
    entry_id: entry.entry_id,
    customer_public_id: entry.customer_public_id,
    entry_type: entry.entry_type,
    amount_minor_units: entry.amount_minor_units,
    balance_after_minor_units: entry.balance_after_minor_units,
    currency: entry.currency,
    status: entry.status,
    reason: entry.reason,
    source: entry.source,
    created_at_utc: entry.created_at_utc,
  }
}

function publicEventSnapshot(event) {
  return {
    event_id: event.event_id,
    row_version: event.row_version,
    title: event.title,
    starts_at_utc: event.starts_at_utc,
    starts_at_label: event.starts_at_label,
    registration_status: event.registration_status,
    capacity: event.capacity,
    registered_count: event.registered_count,
    location_label: event.location_label,
    note: event.note,
    source: event.source,
  }
}

function buildCreditLedgerEntry({
  customer,
  entryType,
  amountMinorUnits,
  balanceAfterMinorUnits,
  reason,
  source,
  now,
}) {
  return {
    entry_id: `credit-${randomUUID()}`,
    customer_public_id: customer.customer_public_id,
    entry_type: entryType,
    amount_minor_units: amountMinorUnits,
    balance_after_minor_units: balanceAfterMinorUnits,
    currency: customer.credit_currency,
    status: "pending_sync",
    reason,
    source,
    created_at_utc: now().toISOString(),
  }
}

function buildSquareCreditHandoff(customer, amountMinorUnits, saleTotalMinorUnits) {
  return {
    action: "customer_credit_square_pos_handoff",
    customer_public_id: customer.customer_public_id,
    customer_id: customer.wordpress_customer_id,
    customer_name: customer.display_name,
    sale_total_minor_units: saleTotalMinorUnits,
    credit_redeemed_minor_units: amountMinorUnits,
    square_amount_due_minor_units: Math.max(0, saleTotalMinorUnits - amountMinorUnits),
    currency: customer.credit_currency,
    square_payment_method_label: "Pug Store Credit",
    square_handoff_mode: "custom_payment_method",
    square_instruction:
      `Record ${formatMoney(amountMinorUnits, customer.credit_currency)} as Pug Store Credit in Square POS, ` +
      `then collect ${formatMoney(Math.max(0, saleTotalMinorUnits - amountMinorUnits), customer.credit_currency)} ` +
      "with the customer's remaining tender.",
    pug_ledger_authority: true,
    square_credit_balance_authority: false,
    square_payment_capture_supported: false,
    sync_required_for_ledger_posting: true,
  }
}

function queueOperation(type, entityId, payload, now) {
  return {
    operation_id: `op-${randomUUID()}`,
    operation_type: type,
    entity_id: entityId,
    payload,
    queued_at_utc: now().toISOString(),
    sync_status: "pending",
  }
}

function verifyPin(pin, user) {
  return /^\d{4}$/.test(String(pin ?? "")) && hashPin(pin, user.pinSalt) === user.pinHash
}

function hashPin(pin, salt) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex")
}

function findCustomer(customers, input = {}) {
  const rawCustomerId = String(
    input.customer_public_id ?? input.customer_id ?? input.entity_id ?? input.wordpress_customer_id ?? "",
  ).trim()

  if (!rawCustomerId) {
    return null
  }

  return (
    customers.find(
      (customer) =>
        customer.customer_public_id === rawCustomerId ||
        String(customer.wordpress_customer_id ?? "") === rawCustomerId,
    ) ?? null
  )
}

function findEvent(events, eventId) {
  const rawEventId = String(eventId ?? "").trim()

  if (!rawEventId) {
    return null
  }

  return events.find((event) => event.event_id === rawEventId) ?? null
}

function cleanAccess(access) {
  if (!Array.isArray(access)) {
    return []
  }

  return [...new Set(access.filter((section) => ACCESS_SECTIONS.includes(section)))]
}

function cleanName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 80)
}

function cleanEmail(value) {
  const email = String(value ?? "").trim().toLowerCase().slice(0, 120)

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""
}

function cleanRole(value) {
  return value === "manager" ? "manager" : "staff"
}

function cleanReason(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 160) || "local reservation"
}

function cleanCondition(value) {
  const condition = String(value ?? "").trim().toUpperCase().slice(0, 16)

  return condition || "RAW"
}

function cleanBarcode(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64)
}

function cleanPublicId(value) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9-_:.]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96)
}

function cleanHttpUrl(value) {
  const candidate = String(value ?? "").trim()

  if (!candidate) {
    return ""
  }

  try {
    const url = new URL(candidate)

    return ["http:", "https:"].includes(url.protocol) ? url.toString().slice(0, 255) : ""
  } catch {
    return ""
  }
}

function cleanEventPaymentStatus(value) {
  return value === "pay_at_store" ? "pay_at_store" : "not_required"
}

function cleanEventRegistrationStatus(value) {
  return ["open", "waitlist", "full", "closed"].includes(value) ? value : "closed"
}

function cleanScryDexQuery(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80)
}

function cleanGame(value) {
  const game = String(value ?? "").trim().toLowerCase()

  return ["pokemon", "magic", "lorcana", "one-piece"].includes(game) ? game : "pokemon"
}

function seedScryDexReferenceCards() {
  return [
    {
      provider_card_id: "scrydex-pokemon-base-004",
      game: "pokemon",
      card_name: "Charizard",
      set_name: "Base Set",
      set_code: "BASE",
      card_number: "4",
      printed_number: "4/102",
      suggested_barcode: "PKM-BASE-004-HOLO",
      market_price_minor_units: 12500,
      currency: "USD",
      image_url: "https://images.pokemontcg.io/base1/4_hires.png",
      price_observed_at_utc: "2026-06-06T09:00:00.000Z",
      catalog_synced_at_utc: "2026-06-08T12:00:00.000Z",
    },
    {
      provider_card_id: "scrydex-pokemon-jungle-060",
      game: "pokemon",
      card_name: "Pikachu",
      set_name: "Jungle",
      set_code: "JGL",
      card_number: "60",
      printed_number: "60/64",
      suggested_barcode: "PKM-JGL-060-YLW",
      market_price_minor_units: 1800,
      currency: "USD",
      image_url: "https://images.pokemontcg.io/jungle/60_hires.png",
      price_observed_at_utc: "2026-06-06T09:00:00.000Z",
      catalog_synced_at_utc: "2026-06-08T12:00:00.000Z",
    },
    {
      provider_card_id: "scrydex-pokemon-evs-094",
      game: "pokemon",
      card_name: "Umbreon V",
      set_name: "Evolving Skies",
      set_code: "EVS",
      card_number: "94",
      printed_number: "094/203",
      suggested_barcode: "PKM-EVS-094-V",
      market_price_minor_units: 7400,
      currency: "USD",
      image_url: "https://images.pokemontcg.io/swsh7/94_hires.png",
      price_observed_at_utc: "2026-06-06T09:00:00.000Z",
      catalog_synced_at_utc: "2026-06-08T12:00:00.000Z",
    },
    {
      provider_card_id: "scrydex-pokemon-sv2-203",
      game: "pokemon",
      card_name: "Iono",
      set_name: "Paldea Evolved",
      set_code: "PAL",
      card_number: "203",
      printed_number: "203/193",
      suggested_barcode: "PKM-PAL-203-IONO",
      market_price_minor_units: 3200,
      currency: "USD",
      image_url: "https://images.pokemontcg.io/sv2/203_hires.png",
      price_observed_at_utc: "2026-06-06T09:00:00.000Z",
      catalog_synced_at_utc: "2026-06-08T12:00:00.000Z",
    },
    {
      provider_card_id: "scrydex-magic-dom-224",
      game: "magic",
      card_name: "Mox Amber",
      set_name: "Dominaria",
      set_code: "DOM",
      card_number: "224",
      printed_number: "224/269",
      suggested_barcode: "MTG-DOM-224-MOX",
      market_price_minor_units: 3200,
      currency: "USD",
      image_url: "",
      price_observed_at_utc: "2026-06-06T09:00:00.000Z",
      catalog_synced_at_utc: "2026-06-08T12:00:00.000Z",
    },
  ]
}

function enrichScryDexCard(card, inventoryItems) {
  const matchingItems = inventoryItems.filter((item) => inventoryMatchesScryDexCard(item, card))
  const stockByCondition = new Map()

  for (const item of matchingItems) {
    if (!["available", "pending_intake", "reserved"].includes(item.status)) {
      continue
    }

    stockByCondition.set(item.condition, (stockByCondition.get(item.condition) ?? 0) + 1)
  }

  return {
    ...card,
    catalog_source: "wordpress_catalog_cache",
    stock_available_count: matchingItems.filter((item) => item.status === "available").length,
    stock_total_count: matchingItems.length,
    stock_by_condition: Array.from(stockByCondition.entries()).map(([condition, quantity]) => ({
      condition,
      quantity,
    })),
  }
}

function inventoryMatchesScryDexCard(item, card) {
  if (item.provider_card_id && item.provider_card_id === card.provider_card_id) {
    return true
  }

  return cleanScryDexQuery(item.card_name) === cleanScryDexQuery(card.card_name)
    && cleanScryDexQuery(item.set_name) === cleanScryDexQuery(card.set_name)
}

function minorUnits(value) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

function formatMoney(minorUnitsValue, currency) {
  return new Intl.NumberFormat("en-US", {
    currency,
    style: "currency",
  }).format(Math.max(0, Math.trunc(minorUnitsValue)) / 100)
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(String(value ?? ""))
  } catch {
    return fallback
  }
}

function boundedInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value), 10)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

function blocked(code, message, extra = {}) {
  return {
    status: "blocked",
    code,
    message,
    ...extra,
  }
}
