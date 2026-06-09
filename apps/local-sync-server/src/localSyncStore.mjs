import { createHash, randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { fileURLToPath } from "node:url"

import { planSquareBarcodeSkuInventoryPull } from "../../../packages/api-client/src/squareInventoryAdapter.mjs"

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

const CLIENT_DEVICE_MODES = Object.freeze(["employee", "manager", "kiosk"])
const CLIENT_DEVICE_SETUP_STATUSES = Object.freeze(["setup_required", "configuring", "ready", "error"])
const CLIENT_DEVICE_NETWORK_STATUSES = Object.freeze(["online", "offline", "degraded"])
const DEFAULT_HEARTBEAT_TIMEOUT_SECONDS = 90
const SEED_REFERENCE_CARD_IDS = Object.freeze([
  "scrydex-pokemon-base-004",
  "scrydex-pokemon-jungle-060",
  "scrydex-pokemon-evs-094",
  "scrydex-pokemon-sv2-203",
  "scrydex-magic-dom-224",
])

export const DEFAULT_LOCAL_SYNC_DATABASE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "store-sync.sqlite",
)

export function createLocalSyncStore(options = {}) {
  const now = options.now ?? (() => new Date())
  const heartbeatTimeoutSeconds = boundedInt(
    options.heartbeatTimeoutSeconds,
    15,
    3600,
    DEFAULT_HEARTBEAT_TIMEOUT_SECONDS,
  )
  const websiteCatalogFallback = typeof options.websiteCatalogFallback === "function" ? options.websiteCatalogFallback : null
  const wordpressInventoryPull = typeof options.wordpressInventoryPull === "function" ? options.wordpressInventoryPull : null
  const wordpressEventsPull = typeof options.wordpressEventsPull === "function" ? options.wordpressEventsPull : null
  const wordpressInventoryPush = typeof options.wordpressInventoryPush === "function" ? options.wordpressInventoryPush : null
  const wordpressEventRegistrationPush =
    typeof options.wordpressEventRegistrationPush === "function" ? options.wordpressEventRegistrationPush : null
  const wordpressEventCheckinPush =
    typeof options.wordpressEventCheckinPush === "function" ? options.wordpressEventCheckinPush : null
  const wordpressCreditPush = typeof options.wordpressCreditPush === "function" ? options.wordpressCreditPush : null
  const wordpressCustomerUpsertPush =
    typeof options.wordpressCustomerUpsertPush === "function" ? options.wordpressCustomerUpsertPush : null
  const wordpressKioskOrderPush =
    typeof options.wordpressKioskOrderPush === "function" ? options.wordpressKioskOrderPush : null
  const squareLocationId = cleanExternalId(options.squareLocationId) || "LOCAL-SQUARE-POS"
  const squareEnvironment = cleanSquareEnvironment(options.squareEnvironment)
  const database = options.database ?? openLocalSyncDatabase(options.databasePath ?? DEFAULT_LOCAL_SYNC_DATABASE_PATH)
  migrateLocalSyncDatabase(database)
  seedLocalSyncDatabase(database, now)

  if (options.removeSeedReferenceCards === true) {
    removeSeedReferenceCards(database)
  }

  const users = loadUsers(database)
  const sessions = new Map()
  const inventoryItems = loadInventoryItems(database)
  const queue = loadQueue(database)
  const kioskOrders = loadKioskOrders(database)
  const customers = loadCustomers(database)
  const creditLedgerEntries = loadCreditLedgerEntries(database)
  const eventSnapshots = loadEventSnapshots(database)
  const referenceCards = loadReferenceCards(database)
  const clientDevices = loadClientDevices(database)

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
    appendQueueOperation(database, queue, "user_access_upsert", user.id, { role: user.role, access: user.access }, now, {
      syncStatus: "local_only",
    })

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
    appendQueueOperation(database, queue, "user_access_upsert", user.id, { role: user.role, access: user.access }, now, {
      syncStatus: "local_only",
    })

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

      return [
        item.card_name,
        item.set_name,
        item.set_code,
        item.card_number,
        item.printed_number,
        item.condition,
        item.barcode,
        item.public_id,
        item.provider_card_id,
        item.location,
      ].some((value) => String(value).toLowerCase().includes(needle))
    })

    return {
      status: "ok",
      items: items.map(publicInventoryItem),
      local_cache_source: "local_sync_server",
    }
  }

  function planSquarePosInventoryPull(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const plan = planSquareBarcodeSkuInventoryPull(
      inventoryItems.map(squareInventoryRowForPlanner),
      {
        environment: cleanSquareEnvironment(input.environment) || squareEnvironment,
        credentialEnvironment: "sandbox",
        squareLocationId: cleanExternalId(input.square_location_id) || squareLocationId,
        updatedAfter: cleanIsoTimestamp(input.updated_after),
        limit: boundedInt(input.limit, 1, 1000, 1000),
      },
    )
    const barcodeMappings = Array.isArray(plan.details?.barcodeMappings)
      ? plan.details.barcodeMappings
      : []
    const unresolvedMappings = Array.isArray(plan.details?.unresolvedMappings)
      ? plan.details.unresolvedMappings
      : []

    return {
      status: "ok",
      action: "square_pos_inventory_pull_plan",
      planner_status: plan.status,
      code: plan.code,
      ready: plan.status === "ready",
      requires_manager_review: plan.status === "conflict",
      mapped_count: barcodeMappings.length,
      unresolved_count: unresolvedMappings.length,
      request_plan: plan.details?.requestPlan ?? null,
      barcode_mappings: barcodeMappings,
      unresolved_mappings: unresolvedMappings,
      payment_delegation: plan.details?.paymentDelegation ?? null,
      plugin_square_payment_capture_supported: false,
      square_payment_capture_supported: false,
      source_of_truth: "tcg_store_platform",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function searchScryDexCards(token, { query = "", game = "pokemon" } = {}) {
    const session = requireWorkspaceAccess(token, "Inventory")

    if (session.status !== "ok") {
      return session
    }

    const needle = cleanScryDexQuery(query)
    const normalizedGame = cleanGame(game)

    if (!needle) {
      return blocked("scrydex_query_required", "Enter a card name, set, or number before searching ScryDex.")
    }

    const cachedCards = searchReferenceCards(referenceCards, needle, normalizedGame)

    if (cachedCards.length > 0) {
      return {
        status: "ok",
        cards: cachedCards.map((card) => enrichScryDexCard(card, inventoryItems)),
        query: needle,
        game: normalizedGame,
        source: "wordpress_catalog_cache",
        lookup_order: ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"],
        local_reference_cache_hit: true,
        wordpress_proxy_performed: false,
        wordpress_proxy_required: false,
        credential_storage: "wordpress_server_settings",
        credentials_synced_to_client: false,
        live_provider_request_performed: false,
      }
    }

    const fallbackResult = websiteCatalogFallback
      ? await websiteCatalogFallback({ query: needle, game: normalizedGame, limit: 8 })
      : null
    const fallbackCards = normalizeReferenceCardsFromFallback(fallbackResult, normalizedGame, now, needle)

    for (const card of fallbackCards) {
      upsertReferenceCard(referenceCards, card)
      saveReferenceCard(database, card, now)
    }

    const cards = fallbackCards.map((card) => enrichScryDexCard(card, inventoryItems))

    return {
      status: "ok",
      cards,
      query: needle,
      game: normalizedGame,
      source: fallbackCards.length > 0 ? "wordpress_proxy" : "local_reference_cache",
      lookup_order: ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"],
      local_reference_cache_hit: false,
      wordpress_proxy_performed: Boolean(websiteCatalogFallback),
      wordpress_proxy_required: fallbackCards.length === 0,
      credential_storage: "wordpress_server_settings",
      credentials_synced_to_client: false,
      live_provider_request_performed: Boolean(fallbackResult?.live_provider_request_performed),
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
    const referenceVariantId = positiveInt(input.reference_variant_id)
    const providerVariantId = cleanPublicId(input.provider_variant_id)
    const game = cleanGame(input.game)
    const setCode = cleanName(input.set_code).toUpperCase()
    const cardNumber = cleanName(input.card_number)
    const printedNumber = cleanName(input.printed_number)
    const variant = cleanName(input.variant)
    const finish = cleanName(input.finish)
    const language = cleanName(input.language) || "EN"
    const rawOrGraded = cleanRawOrGraded(input.raw_or_graded)
    const condition = cleanCondition(input.condition ?? input.condition_code)
    const barcodeBase = cleanBarcode(input.barcode) || `PUG-${randomUUID().slice(0, 8).toUpperCase()}`
    const priceMinorUnits = Math.max(0, minorUnits(input.price_minor_units ?? input.sale_price_minor_units))
    const location = cleanName(input.location ?? input.location_label) || "Intake Queue"
    const imageUrl = cleanHttpUrl(input.image_url)
    const backImageUrl = cleanHttpUrl(input.back_image_url)
    const onlineVisibility = cleanVisibility(input.online_visibility, "visible")
    const kioskVisibility = cleanVisibility(input.kiosk_visibility, "visible")
    const posVisibility = cleanVisibility(input.pos_visibility, "visible")
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
      wordpress_public_id: "",
      row_version: 1,
      provider_card_id: providerCardId,
      reference_variant_id: referenceVariantId,
      provider_variant_id: providerVariantId,
      game,
      card_name: cardName,
      set_name: setName,
      set_code: setCode,
      card_number: cardNumber,
      printed_number: printedNumber,
      variant,
      finish,
      language,
      raw_or_graded: rawOrGraded,
      condition,
      barcode,
      price_minor_units: priceMinorUnits,
      currency: "USD",
      location,
      status: "pending_intake",
      image_url: imageUrl,
      back_image_url: backImageUrl,
      online_visibility: onlineVisibility,
      kiosk_visibility: kioskVisibility,
      pos_visibility: posVisibility,
      square_catalog_item_id: "",
      square_catalog_variation_id: "",
      external_sync_state: "pending",
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

  function recordDeviceHeartbeat(input = {}) {
    const deviceId = cleanPublicId(input.device_id ?? input.deviceId ?? input.client_id ?? input.clientId)

    if (!deviceId) {
      return blocked("device_id_required", "A stable device_id is required for client heartbeat tracking.")
    }

    const existingDevice = clientDevices.find((device) => device.device_id === deviceId)
    const mode = cleanClientDeviceMode(input.mode ?? existingDevice?.mode)
    const timestamp = now().toISOString()
    const device = {
      device_id: deviceId,
      device_label: cleanName(input.device_label ?? input.deviceLabel ?? existingDevice?.device_label) || deviceId,
      mode,
      app_version: cleanName(input.app_version ?? input.appVersion ?? existingDevice?.app_version),
      platform: cleanName(input.platform ?? existingDevice?.platform),
      network_status: cleanClientDeviceNetworkStatus(
        input.network_status ?? input.networkStatus ?? input.connection_status ?? "online",
      ),
      setup_status: cleanClientDeviceSetupStatus(input.setup_status ?? input.setupStatus ?? existingDevice?.setup_status),
      server_url: cleanHttpUrl(input.server_url ?? input.serverUrl ?? existingDevice?.server_url),
      website_url: cleanHttpUrl(input.website_url ?? input.websiteUrl ?? existingDevice?.website_url),
      capabilities: cleanClientDeviceCapabilities(input.capabilities ?? existingDevice?.capabilities, mode),
      heartbeat_interval_seconds: boundedInt(
        input.heartbeat_interval_seconds ?? input.heartbeatIntervalSeconds ?? existingDevice?.heartbeat_interval_seconds,
        5,
        600,
        30,
      ),
      first_seen_at_utc: existingDevice?.first_seen_at_utc ?? timestamp,
      last_seen_at_utc: timestamp,
    }
    const existingIndex = clientDevices.findIndex((candidate) => candidate.device_id === device.device_id)

    if (existingIndex >= 0) {
      clientDevices.splice(existingIndex, 1, device)
    } else {
      clientDevices.push(device)
    }

    saveClientDevice(database, device)

    const summary = buildClientDeviceSummary(clientDevices, now, heartbeatTimeoutSeconds)

    return {
      status: "ok",
      action: "local_client_device_heartbeat",
      device: publicClientDevice(device, now, heartbeatTimeoutSeconds),
      device_count: summary.device_count,
      online_count: summary.online_count,
      offline_count: summary.offline_count,
      setup_ready_count: summary.setup_ready_count,
      setup_required_count: summary.setup_required_count,
      heartbeat_timeout_seconds: heartbeatTimeoutSeconds,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function deviceStatus() {
    const summary = buildClientDeviceSummary(clientDevices, now, heartbeatTimeoutSeconds)

    return {
      status: "ok",
      action: "local_client_device_status",
      topology: "lan_middleman_server",
      server_authority: "local_sync_server",
      heartbeat_timeout_seconds: heartbeatTimeoutSeconds,
      ...summary,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function syncStatus() {
    const deviceSummary = buildClientDeviceSummary(clientDevices, now, heartbeatTimeoutSeconds)

    return {
      status: "ok",
      local_database: "store-sync.sqlite",
      persistence_mode: "sqlite",
      queue_depth: pendingQueueOperations(queue).length,
      kiosk_order_count: kioskOrders.length,
      inventory_count: inventoryItems.length,
      reference_card_count: referenceCards.length,
      customer_count: customers.length,
      credit_ledger_entry_count: creditLedgerEntries.length,
      event_count: eventSnapshots.length,
      client_presence_enabled: true,
      client_device_count: deviceSummary.device_count,
      online_client_device_count: deviceSummary.online_count,
      offline_client_device_count: deviceSummary.offline_count,
      setup_ready_client_device_count: deviceSummary.setup_ready_count,
      setup_required_client_device_count: deviceSummary.setup_required_count,
      heartbeat_timeout_seconds: heartbeatTimeoutSeconds,
      active_session_count: sessions.size,
      wordpress_pull_connected: Boolean(wordpressInventoryPull || wordpressEventsPull),
      wordpress_inventory_pull_connected: Boolean(wordpressInventoryPull),
      wordpress_events_pull_connected: Boolean(wordpressEventsPull),
      wordpress_push_connected: Boolean(
        wordpressInventoryPush ||
          wordpressEventRegistrationPush ||
          wordpressEventCheckinPush ||
          wordpressCreditPush ||
          wordpressCustomerUpsertPush ||
          wordpressKioskOrderPush,
      ),
      wordpress_inventory_push_connected: Boolean(wordpressInventoryPush),
      wordpress_event_registration_push_connected: Boolean(wordpressEventRegistrationPush),
      wordpress_event_checkin_push_connected: Boolean(wordpressEventCheckinPush),
      wordpress_credit_push_connected: Boolean(wordpressCreditPush),
      wordpress_customer_push_connected: Boolean(wordpressCustomerUpsertPush),
      wordpress_kiosk_order_push_connected: Boolean(wordpressKioskOrderPush),
      scrydex_lookup_order: ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"],
      scrydex_fallback_connected: Boolean(websiteCatalogFallback),
      local_operations_preserved: true,
    }
  }

  async function pullWebsiteInventory(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Sync")

    if (session.status !== "ok") {
      return session
    }

    if (!wordpressInventoryPull && !wordpressEventsPull) {
      return blocked("wordpress_pull_unavailable", "WordPress pull is not configured on this LAN server.")
    }

    const requestedDomains = pullDomains(input.domains ?? input.domain)
    const shouldPullInventory = requestedDomains.has("inventory") && Boolean(wordpressInventoryPull)
    const shouldPullEvents = requestedDomains.has("events") && Boolean(wordpressEventsPull)
    let inventoryPullResult = null
    let eventPullResult = null

    const appliedItems = []
    let insertedCount = 0
    let updatedCount = 0
    let ignoredCount = 0

    if (shouldPullInventory) {
      inventoryPullResult = await wordpressInventoryPull({
        query: input.query,
        page: input.page,
        pageSize: input.page_size ?? input.pageSize,
      })

      if (inventoryPullResult.status !== "ok") {
        return {
          status: "blocked",
          code: inventoryPullResult.code ?? "wordpress_pull_failed",
          message: inventoryPullResult.message ?? "WordPress inventory pull did not complete.",
          http_status: inventoryPullResult.http_status ?? 0,
          credentials_synced_to_client: false,
        }
      }

      for (const row of inventoryPullResult.items ?? []) {
        const pulledItem = localInventoryItemFromWordPress(row)

        if (!pulledItem) {
          ignoredCount += 1
          continue
        }

        const existingIndex = inventoryItems.findIndex((candidate) => candidate.public_id === pulledItem.public_id)
        const existing = existingIndex >= 0 ? inventoryItems[existingIndex] : null

        if (existing && (existing.source === "queued" || existing.status === "pending_intake")) {
          ignoredCount += 1
          continue
        }

        if (existing) {
          inventoryItems[existingIndex] = {
            ...existing,
            ...pulledItem,
            row_version: Math.max(existing.row_version + 1, pulledItem.row_version),
            source: "cached",
          }
          saveInventoryItem(database, inventoryItems[existingIndex], now)
          appliedItems.push(publicInventoryItem(inventoryItems[existingIndex]))
          updatedCount += 1
        } else {
          inventoryItems.push(pulledItem)
          saveInventoryItem(database, pulledItem, now)
          appliedItems.push(publicInventoryItem(pulledItem))
          insertedCount += 1
        }
      }
    }

    const appliedEvents = []
    let eventsInsertedCount = 0
    let eventsUpdatedCount = 0
    let eventsIgnoredCount = 0

    if (shouldPullEvents) {
      eventPullResult = await wordpressEventsPull({
        page: input.event_page ?? input.eventPage ?? input.page,
        pageSize: input.event_page_size ?? input.eventPageSize ?? input.page_size ?? input.pageSize,
        filters: {
          game: input.game,
          format: input.format,
          event_type: input.event_type ?? input.eventType,
          registration_status: input.registration_status ?? input.registrationStatus,
        },
      })

      if (eventPullResult.status !== "ok") {
        return {
          status: "blocked",
          code: eventPullResult.code ?? "wordpress_events_pull_failed",
          message: eventPullResult.message ?? "WordPress events pull did not complete.",
          http_status: eventPullResult.http_status ?? 0,
          credentials_synced_to_client: false,
        }
      }

      for (const row of eventPullResult.events ?? []) {
        const pulledEvent = localEventSnapshotFromWordPress(row)

        if (!pulledEvent) {
          eventsIgnoredCount += 1
          continue
        }

        const existingIndex = eventSnapshots.findIndex((candidate) => candidate.event_id === pulledEvent.event_id)
        const existing = existingIndex >= 0 ? eventSnapshots[existingIndex] : null

        if (existing && existing.source === "queued") {
          eventsIgnoredCount += 1
          continue
        }

        if (existing) {
          eventSnapshots[existingIndex] = {
            ...existing,
            ...pulledEvent,
            row_version: Math.max(existing.row_version + 1, pulledEvent.row_version),
            source: "cached",
          }
          saveEventSnapshot(database, eventSnapshots[existingIndex], now)
          appliedEvents.push(publicEventSnapshot(eventSnapshots[existingIndex]))
          eventsUpdatedCount += 1
        } else {
          eventSnapshots.push(pulledEvent)
          saveEventSnapshot(database, pulledEvent, now)
          appliedEvents.push(publicEventSnapshot(pulledEvent))
          eventsInsertedCount += 1
        }
      }
    }

    return {
      status: "ok",
      pulled_count: (inventoryPullResult?.items ?? []).length,
      applied_count: appliedItems.length,
      inserted_count: insertedCount,
      updated_count: updatedCount,
      ignored_count: ignoredCount,
      items: appliedItems,
      events_pulled_count: (eventPullResult?.events ?? []).length,
      events_applied_count: appliedEvents.length,
      events_inserted_count: eventsInsertedCount,
      events_updated_count: eventsUpdatedCount,
      events_ignored_count: eventsIgnoredCount,
      events: appliedEvents,
      meta: inventoryPullResult?.meta ?? null,
      events_meta: eventPullResult?.meta ?? null,
      wordpress_pull_connected: true,
      wordpress_inventory_pull_connected: Boolean(wordpressInventoryPull),
      wordpress_events_pull_connected: Boolean(wordpressEventsPull),
      credentials_synced_to_client: false,
      local_inventory_count: inventoryItems.length,
      local_event_count: eventSnapshots.length,
      local_queue_depth: pendingQueueOperations(queue).length,
    }
  }

  async function pushQueuedOperations(token) {
    const session = requireWorkspaceAccess(token, "Sync")

    if (session.status !== "ok") {
      return session
    }

    if (
      !wordpressInventoryPush &&
      !wordpressEventRegistrationPush &&
      !wordpressEventCheckinPush &&
      !wordpressCreditPush &&
      !wordpressCustomerUpsertPush &&
      !wordpressKioskOrderPush
    ) {
      return blocked("wordpress_push_unavailable", "WordPress push is not configured on this LAN server.")
    }

    const pendingOperations = pendingQueueOperations(queue)
    const inventoryOperations = pendingOperations.filter((operation) => operation.operation_type === "inventory_intake")
    const eventRegistrationOperations = pendingOperations.filter(
      (operation) => operation.operation_type === "event_registration",
    )
    const eventCheckinOperations = pendingOperations.filter((operation) => operation.operation_type === "event_checkin")
    const customerOperations = pendingOperations.filter((operation) => operation.operation_type === "customer_upsert")
    const kioskOperations = pendingOperations.filter((operation) => operation.operation_type === "kiosk_order")
    const reservationOperations = pendingOperations.filter(
      (operation) => operation.operation_type === "inventory_reservation",
    )
    const creditOperations = pendingOperations.filter(
      (operation) => operation.operation_type === "credit_adjustment" || operation.operation_type === "credit_redemption",
    )
    const results = []
    const coveredKioskReservationOperationIds = new Set()

    for (const operation of inventoryOperations) {
      if (!wordpressInventoryPush) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: "wordpress_inventory_push_unavailable",
          message: "WordPress inventory push is not configured on this LAN server.",
        })
        continue
      }

      const item = inventoryItems.find((candidate) => candidate.public_id === operation.entity_id) ?? operation.payload?.item

      if (!item) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "rejected",
          code: "local_inventory_item_missing",
        })
        continue
      }

      const pushResult = await wordpressInventoryPush({ operation, item })

      if (pushResult.status !== "ok") {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: pushResult.code,
          message: pushResult.message,
          wordpress_code: pushResult.wordpress_code ?? "",
          http_status: pushResult.http_status ?? 0,
          errors: Array.isArray(pushResult.errors) ? pushResult.errors : [],
        })
        continue
      }

      const localItem = inventoryItems.find((candidate) => candidate.public_id === item.public_id)

      if (localItem) {
        localItem.status = localInventoryStatus(pushResult.inventory?.status) ?? "pending_intake"
        localItem.wordpress_public_id = cleanPublicId(pushResult.inventory?.public_id)
        localItem.source = "accepted"
        localItem.row_version += 1
        saveInventoryItem(database, localItem, now)
      }

      deleteQueueOperation(database, queue, operation.operation_id)
      results.push({
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "accepted",
        code: pushResult.code,
        wordpress_code: pushResult.wordpress_code,
        wordpress_inventory: pushResult.inventory,
      })
    }

    for (const operation of eventRegistrationOperations) {
      if (!wordpressEventRegistrationPush) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: "wordpress_event_registration_push_unavailable",
          message: "WordPress event registration push is not configured on this LAN server.",
        })
        continue
      }

      const pushResult = await wordpressEventRegistrationPush({ operation })

      if (pushResult.status !== "ok") {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: pushResult.code,
          message: pushResult.message,
          wordpress_code: pushResult.wordpress_code ?? "",
          http_status: pushResult.http_status ?? 0,
          errors: Array.isArray(pushResult.errors) ? pushResult.errors : [],
        })
        continue
      }

      const event = findEvent(eventSnapshots, operation.payload?.registration?.event_id ?? operation.payload?.event?.event_id)

      if (event) {
        event.source = "accepted"
        event.note = "Registration accepted by WordPress; next pull remains authoritative for final counts."
        event.row_version += 1
        saveEventSnapshot(database, event, now)
      }

      deleteQueueOperation(database, queue, operation.operation_id)
      results.push({
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "accepted",
        code: pushResult.code,
        wordpress_code: pushResult.wordpress_code,
        wordpress_registration: pushResult.registration,
      })
    }

    for (const operation of eventCheckinOperations) {
      if (!wordpressEventCheckinPush) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: "wordpress_event_checkin_push_unavailable",
          message: "WordPress event check-in push is not configured on this LAN server.",
        })
        continue
      }

      const pushResult = await wordpressEventCheckinPush({ operation })

      if (pushResult.status !== "ok") {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: pushResult.code,
          message: pushResult.message,
          wordpress_code: pushResult.wordpress_code ?? "",
          http_status: pushResult.http_status ?? 0,
          errors: Array.isArray(pushResult.errors) ? pushResult.errors : [],
        })
        continue
      }

      const event = findEvent(eventSnapshots, operation.payload?.checkin?.event_id ?? operation.payload?.event?.event_id)

      if (event) {
        event.source = "accepted"
        event.note = "Check-in accepted by WordPress; next pull remains authoritative for attendance counts."
        event.row_version += 1
        saveEventSnapshot(database, event, now)
      }

      deleteQueueOperation(database, queue, operation.operation_id)
      results.push({
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "accepted",
        code: pushResult.code,
        wordpress_code: pushResult.wordpress_code,
        wordpress_checkin: pushResult.checkin,
      })
    }

    for (const operation of kioskOperations) {
      if (!wordpressKioskOrderPush) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: "wordpress_kiosk_order_push_unavailable",
          message: "WordPress kiosk order push is not configured on this LAN server.",
        })
        continue
      }

      const reservationIds = Array.isArray(operation.payload?.reservation_ids) ? operation.payload.reservation_ids : []
      const matchingReservationOperations = reservationOperations.filter((reservationOperation) =>
        reservationIds.includes(reservationOperation.entity_id),
      )
      const inventoryPublicIds = matchingReservationOperations
        .map((reservationOperation) => {
          const localPublicId = cleanPublicId(reservationOperation.payload?.inventory_public_id)
          const item = inventoryItems.find((candidate) => candidate.public_id === localPublicId)

          return cleanPublicId(item?.wordpress_public_id) || localPublicId
        })
        .filter(Boolean)

      if (inventoryPublicIds.length === 0) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: "kiosk_order_inventory_required",
          message: "Kiosk order stays queued until it has matching inventory reservation rows.",
        })
        continue
      }

      const pushResult = await wordpressKioskOrderPush({ operation, inventoryPublicIds })

      if (pushResult.status !== "ok") {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: pushResult.code,
          message: pushResult.message,
          wordpress_code: pushResult.wordpress_code ?? "",
          http_status: pushResult.http_status ?? 0,
          errors: Array.isArray(pushResult.errors) ? pushResult.errors : [],
        })
        continue
      }

      const order = kioskOrders.find((candidate) => candidate.order_id === operation.entity_id)

      if (order) {
        order.status = "accepted"
        saveKioskOrder(database, order)
      }

      for (const reservationOperation of matchingReservationOperations) {
        coveredKioskReservationOperationIds.add(reservationOperation.operation_id)
        deleteQueueOperation(database, queue, reservationOperation.operation_id)

        const item = inventoryItems.find(
          (candidate) => candidate.public_id === cleanPublicId(reservationOperation.payload?.inventory_public_id),
        )

        if (item) {
          item.status = "reserved"
          item.source = "accepted"
          item.row_version += 1
          saveInventoryItem(database, item, now)
        }
      }

      deleteQueueOperation(database, queue, operation.operation_id)
      results.push({
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "accepted",
        code: pushResult.code,
        wordpress_code: pushResult.wordpress_code,
        wordpress_kiosk_order: pushResult.order,
        wordpress_reservations: pushResult.reservations,
      })
    }

    for (const operation of customerOperations) {
      if (!wordpressCustomerUpsertPush) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: "wordpress_customer_push_unavailable",
          message: "WordPress customer push is not configured on this LAN server.",
        })
        continue
      }

      const customer =
        customers.find((candidate) => candidate.customer_public_id === operation.entity_id) ?? operation.payload?.customer

      if (!customer) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "rejected",
          code: "local_customer_missing",
        })
        continue
      }

      const pushResult = await wordpressCustomerUpsertPush({
        operation: {
          ...operation,
          payload: {
            ...operation.payload,
            customer: publicCustomer(customer),
          },
        },
      })

      if (pushResult.status !== "ok") {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: pushResult.code,
          message: pushResult.message,
          wordpress_code: pushResult.wordpress_code ?? "",
          http_status: pushResult.http_status ?? 0,
          errors: Array.isArray(pushResult.errors) ? pushResult.errors : [],
        })
        continue
      }

      const localCustomer = customers.find((candidate) => candidate.customer_public_id === customer.customer_public_id)

      if (localCustomer) {
        localCustomer.wordpress_customer_id = positiveInt(pushResult.customer?.customer_id)
        localCustomer.row_version = positiveInt(pushResult.customer?.row_version) ?? localCustomer.row_version + 1
        localCustomer.display_name = cleanName(pushResult.customer?.display_name) || localCustomer.display_name
        localCustomer.first_name = cleanName(pushResult.customer?.first_name) || localCustomer.first_name
        localCustomer.last_name = cleanName(pushResult.customer?.last_name) || localCustomer.last_name
        localCustomer.email = cleanEmail(pushResult.customer?.email) || localCustomer.email
        localCustomer.lookup = localCustomer.email || localCustomer.lookup
        localCustomer.status = cleanCustomerStatus(pushResult.customer?.status)
        localCustomer.credit_balance_minor_units =
          typeof pushResult.customer?.credit?.balance_minor_units === "number"
            ? pushResult.customer.credit.balance_minor_units
            : localCustomer.credit_balance_minor_units
        localCustomer.credit_currency = cleanCurrency(pushResult.customer?.credit?.currency ?? localCustomer.credit_currency)
        localCustomer.source = "accepted"
        saveCustomer(database, localCustomer, now)
      }

      deleteQueueOperation(database, queue, operation.operation_id)
      results.push({
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "accepted",
        code: pushResult.code,
        wordpress_code: pushResult.wordpress_code,
        wordpress_customer: pushResult.customer,
      })
    }

    for (const operation of creditOperations) {
      if (!wordpressCreditPush) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: "wordpress_credit_push_unavailable",
          message: "WordPress customer credit push is not configured on this LAN server.",
        })
        continue
      }

      const ledgerEntry = creditLedgerEntries.find((entry) => entry.entry_id === operation.entity_id)
      const operationCustomerPublicId = cleanPublicId(
        ledgerEntry?.customer_public_id ?? operation.payload?.customer?.customer_public_id,
      )
      const latestCustomer = customers.find((candidate) => candidate.customer_public_id === operationCustomerPublicId)
      const wordpressCustomerId = positiveInt(
        latestCustomer?.wordpress_customer_id ?? operation.payload?.customer?.wordpress_customer_id,
      )

      if (!wordpressCustomerId) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: "wordpress_customer_id_required",
          message: "Credit operation stays queued until the customer exists in WordPress.",
        })
        continue
      }

      const pushResult = await wordpressCreditPush({
        operation: {
          ...operation,
          payload: {
            ...operation.payload,
            customer: latestCustomer ? publicCustomer(latestCustomer) : operation.payload?.customer,
          },
        },
      })

      if (pushResult.status !== "ok") {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: pushResult.code,
          message: pushResult.message,
          wordpress_code: pushResult.wordpress_code ?? "",
          http_status: pushResult.http_status ?? 0,
          errors: Array.isArray(pushResult.errors) ? pushResult.errors : [],
        })
        continue
      }

      if (ledgerEntry) {
        ledgerEntry.status = "accepted"
        ledgerEntry.source = "wordpress_credit_ledger"
        saveCreditLedgerEntry(database, ledgerEntry)
      }

      if (latestCustomer && pushResult.credit?.balance_after?.amount !== undefined) {
        latestCustomer.credit_balance_minor_units = minorUnitsFromDecimal(pushResult.credit.balance_after.amount)
        latestCustomer.credit_currency = cleanCurrency(pushResult.credit.balance_after.currency ?? latestCustomer.credit_currency)
        latestCustomer.row_version += 1
        latestCustomer.source = "accepted"
        saveCustomer(database, latestCustomer, now)
      }

      deleteQueueOperation(database, queue, operation.operation_id)
      results.push({
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "accepted",
        code: pushResult.code,
        wordpress_code: pushResult.wordpress_code,
        wordpress_credit: pushResult.credit,
      })
    }

    const acceptedCount = results.filter((result) => result.status === "accepted").length
    const retryCount = results.filter((result) => result.status === "retry").length
    const rejectedCount = results.filter((result) => result.status === "rejected").length
    const supportedOperationCount =
      inventoryOperations.length +
      eventRegistrationOperations.length +
      eventCheckinOperations.length +
      kioskOperations.length +
      coveredKioskReservationOperationIds.size +
      customerOperations.length +
      creditOperations.length

    return {
      status: "ok",
      operation_count: supportedOperationCount,
      accepted_count: acceptedCount,
      retry_count: retryCount,
      rejected_count: rejectedCount,
      unsupported_operation_count: pendingOperations.length - supportedOperationCount,
      results,
      wordpress_push_connected: true,
      wordpress_inventory_push_connected: Boolean(wordpressInventoryPush),
      wordpress_event_registration_push_connected: Boolean(wordpressEventRegistrationPush),
      wordpress_event_checkin_push_connected: Boolean(wordpressEventCheckinPush),
      wordpress_credit_push_connected: Boolean(wordpressCreditPush),
      wordpress_customer_push_connected: Boolean(wordpressCustomerUpsertPush),
      wordpress_kiosk_order_push_connected: Boolean(wordpressKioskOrderPush),
      credentials_synced_to_client: false,
      local_queue_depth: pendingQueueOperations(queue).length,
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
    deviceStatus,
    listEvents,
    createSession,
    listAccessPolicy,
    planSquarePosInventoryPull,
    recordDeviceHeartbeat,
    reserveInventory,
    pullWebsiteInventory,
    searchCustomers,
    searchInventory,
    searchScryDexCards,
    syncStatus,
    pushQueuedOperations,
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
      wordpress_public_id TEXT NOT NULL DEFAULT '',
      row_version INTEGER NOT NULL,
      provider_card_id TEXT NOT NULL DEFAULT '',
      reference_variant_id INTEGER NULL,
      provider_variant_id TEXT NOT NULL DEFAULT '',
      game TEXT NOT NULL DEFAULT 'pokemon',
      card_name TEXT NOT NULL,
      set_name TEXT NOT NULL,
      set_code TEXT NOT NULL DEFAULT '',
      card_number TEXT NOT NULL DEFAULT '',
      printed_number TEXT NOT NULL DEFAULT '',
      variant TEXT NOT NULL DEFAULT '',
      finish TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'EN',
      raw_or_graded TEXT NOT NULL DEFAULT 'raw',
      condition TEXT NOT NULL,
      barcode TEXT NOT NULL,
      price_minor_units INTEGER NOT NULL,
      currency TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      back_image_url TEXT NOT NULL DEFAULT '',
      online_visibility TEXT NOT NULL DEFAULT 'visible',
      kiosk_visibility TEXT NOT NULL DEFAULT 'visible',
      pos_visibility TEXT NOT NULL DEFAULT 'visible',
      square_catalog_item_id TEXT NOT NULL DEFAULT '',
      square_catalog_variation_id TEXT NOT NULL DEFAULT '',
      external_sync_state TEXT NOT NULL DEFAULT 'pending',
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
      slug TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS reference_cards (
      provider_card_id TEXT PRIMARY KEY,
      game TEXT NOT NULL,
      card_name TEXT NOT NULL,
      set_name TEXT NOT NULL,
      set_code TEXT NOT NULL,
      card_number TEXT NOT NULL,
      printed_number TEXT NOT NULL,
      suggested_barcode TEXT NOT NULL,
      market_price_minor_units INTEGER NOT NULL,
      currency TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      variants_json TEXT NOT NULL DEFAULT '[]',
      price_observed_at_utc TEXT NULL,
      catalog_synced_at_utc TEXT NOT NULL,
      catalog_source TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS client_devices (
      device_id TEXT PRIMARY KEY,
      device_label TEXT NOT NULL,
      mode TEXT NOT NULL,
      app_version TEXT NOT NULL,
      platform TEXT NOT NULL,
      network_status TEXT NOT NULL,
      setup_status TEXT NOT NULL,
      server_url TEXT NOT NULL,
      website_url TEXT NOT NULL,
      capabilities_json TEXT NOT NULL,
      heartbeat_interval_seconds INTEGER NOT NULL,
      first_seen_at_utc TEXT NOT NULL,
      last_seen_at_utc TEXT NOT NULL
    );
  `)

  ensureLocalSyncColumn(database, "inventory_items", "provider_card_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "wordpress_public_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "reference_variant_id", "INTEGER NULL")
  ensureLocalSyncColumn(database, "inventory_items", "provider_variant_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "game", "TEXT NOT NULL DEFAULT 'pokemon'")
  ensureLocalSyncColumn(database, "inventory_items", "set_code", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "card_number", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "printed_number", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "variant", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "finish", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "language", "TEXT NOT NULL DEFAULT 'EN'")
  ensureLocalSyncColumn(database, "inventory_items", "raw_or_graded", "TEXT NOT NULL DEFAULT 'raw'")
  ensureLocalSyncColumn(database, "inventory_items", "image_url", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "back_image_url", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "online_visibility", "TEXT NOT NULL DEFAULT 'visible'")
  ensureLocalSyncColumn(database, "inventory_items", "kiosk_visibility", "TEXT NOT NULL DEFAULT 'visible'")
  ensureLocalSyncColumn(database, "inventory_items", "pos_visibility", "TEXT NOT NULL DEFAULT 'visible'")
  ensureLocalSyncColumn(database, "inventory_items", "square_catalog_item_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "square_catalog_variation_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "external_sync_state", "TEXT NOT NULL DEFAULT 'pending'")
  ensureLocalSyncColumn(database, "reference_cards", "catalog_source", "TEXT NOT NULL DEFAULT 'wordpress_catalog_cache'")
  ensureLocalSyncColumn(database, "reference_cards", "variants_json", "TEXT NOT NULL DEFAULT '[]'")
  ensureLocalSyncColumn(database, "event_snapshots", "slug", "TEXT NOT NULL DEFAULT ''")
  database.exec(`
    UPDATE operation_queue
    SET sync_status = 'local_only'
    WHERE operation_type = 'user_access_upsert' AND sync_status = 'pending'
  `)
}

function seedLocalSyncDatabase(database, now) {
  const userCount = database.prepare("SELECT COUNT(*) AS count FROM users").get().count
  const inventoryCount = database.prepare("SELECT COUNT(*) AS count FROM inventory_items").get().count
  const customerCount = database.prepare("SELECT COUNT(*) AS count FROM customers").get().count
  const eventCount = database.prepare("SELECT COUNT(*) AS count FROM event_snapshots").get().count
  const referenceCardCount = database.prepare("SELECT COUNT(*) AS count FROM reference_cards").get().count

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

  if (Number(referenceCardCount) === 0) {
    for (const card of seedScryDexReferenceCards()) {
      saveReferenceCard(database, normalizeReferenceCard(card, card.game, now), now)
    }
  }
}

function removeSeedReferenceCards(database) {
  const statement = database.prepare("DELETE FROM reference_cards WHERE provider_card_id = ?")

  for (const providerCardId of SEED_REFERENCE_CARD_IDS) {
    statement.run(providerCardId)
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
      SELECT public_id, wordpress_public_id, row_version, provider_card_id, game, card_name, set_name,
        reference_variant_id, provider_variant_id, set_code, card_number, printed_number,
        variant, finish, language, raw_or_graded, condition, barcode, price_minor_units,
        currency, location, status, image_url, back_image_url, online_visibility, kiosk_visibility,
        pos_visibility, square_catalog_item_id, square_catalog_variation_id,
        external_sync_state, source
      FROM inventory_items
      ORDER BY public_id
    `)
    .all()
    .map((row) => ({
      public_id: row.public_id,
      wordpress_public_id: cleanPublicId(row.wordpress_public_id),
      row_version: Number(row.row_version),
      provider_card_id: row.provider_card_id ?? "",
      reference_variant_id: positiveInt(row.reference_variant_id),
      provider_variant_id: cleanPublicId(row.provider_variant_id),
      game: cleanGame(row.game),
      card_name: row.card_name,
      set_name: row.set_name,
      set_code: row.set_code ?? "",
      card_number: row.card_number ?? "",
      printed_number: row.printed_number ?? "",
      variant: cleanName(row.variant),
      finish: cleanName(row.finish),
      language: cleanName(row.language) || "EN",
      raw_or_graded: cleanRawOrGraded(row.raw_or_graded),
      condition: row.condition,
      barcode: row.barcode,
      price_minor_units: Number(row.price_minor_units),
      currency: row.currency,
      location: row.location,
      status: row.status,
      image_url: row.image_url ?? "",
      back_image_url: row.back_image_url ?? "",
      online_visibility: cleanVisibility(row.online_visibility, "visible"),
      kiosk_visibility: cleanVisibility(row.kiosk_visibility, "visible"),
      pos_visibility: cleanVisibility(row.pos_visibility, "visible"),
      square_catalog_item_id: cleanExternalId(row.square_catalog_item_id),
      square_catalog_variation_id: cleanExternalId(row.square_catalog_variation_id),
      external_sync_state: cleanExternalSyncState(row.external_sync_state),
      source: row.source,
    }))
}

function loadReferenceCards(database) {
  return database
    .prepare(`
      SELECT provider_card_id, game, card_name, set_name, set_code, card_number,
        printed_number, suggested_barcode, market_price_minor_units, currency,
        image_url, variants_json, price_observed_at_utc, catalog_synced_at_utc, catalog_source
      FROM reference_cards
      ORDER BY card_name, set_name, provider_card_id
    `)
    .all()
    .map((row) => normalizeReferenceCard(row, row.game))
}

function loadClientDevices(database) {
  return database
    .prepare(`
      SELECT device_id, device_label, mode, app_version, platform, network_status,
        setup_status, server_url, website_url, capabilities_json,
        heartbeat_interval_seconds, first_seen_at_utc, last_seen_at_utc
      FROM client_devices
      ORDER BY last_seen_at_utc DESC, device_label, device_id
    `)
    .all()
    .map((row) => ({
      device_id: cleanPublicId(row.device_id),
      device_label: cleanName(row.device_label) || cleanPublicId(row.device_id),
      mode: cleanClientDeviceMode(row.mode),
      app_version: cleanName(row.app_version),
      platform: cleanName(row.platform),
      network_status: cleanClientDeviceNetworkStatus(row.network_status),
      setup_status: cleanClientDeviceSetupStatus(row.setup_status),
      server_url: cleanHttpUrl(row.server_url),
      website_url: cleanHttpUrl(row.website_url),
      capabilities: cleanClientDeviceCapabilities(parseJson(row.capabilities_json, []), row.mode),
      heartbeat_interval_seconds: boundedInt(row.heartbeat_interval_seconds, 5, 600, 30),
      first_seen_at_utc: cleanIsoTimestamp(row.first_seen_at_utc),
      last_seen_at_utc: cleanIsoTimestamp(row.last_seen_at_utc),
    }))
    .filter((device) => device.device_id)
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
        slug, registration_status, capacity, registered_count, location_label, note, source
      FROM event_snapshots
      ORDER BY starts_at_utc, event_id
    `)
    .all()
    .map((row) => ({
      event_id: row.event_id,
      slug: cleanSlug(row.slug),
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
        public_id, wordpress_public_id, row_version, provider_card_id, game, card_name, set_name,
        reference_variant_id, provider_variant_id, set_code, card_number, printed_number,
        variant, finish, language, raw_or_graded, condition, barcode, price_minor_units,
        currency, location, status, image_url, back_image_url, online_visibility, kiosk_visibility,
        pos_visibility, square_catalog_item_id, square_catalog_variation_id,
        external_sync_state, source, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(public_id) DO UPDATE SET
        wordpress_public_id = excluded.wordpress_public_id,
        row_version = excluded.row_version,
        provider_card_id = excluded.provider_card_id,
        reference_variant_id = excluded.reference_variant_id,
        provider_variant_id = excluded.provider_variant_id,
        game = excluded.game,
        card_name = excluded.card_name,
        set_name = excluded.set_name,
        set_code = excluded.set_code,
        card_number = excluded.card_number,
        printed_number = excluded.printed_number,
        variant = excluded.variant,
        finish = excluded.finish,
        language = excluded.language,
        raw_or_graded = excluded.raw_or_graded,
        condition = excluded.condition,
        barcode = excluded.barcode,
        price_minor_units = excluded.price_minor_units,
        currency = excluded.currency,
        location = excluded.location,
        status = excluded.status,
        image_url = excluded.image_url,
        back_image_url = excluded.back_image_url,
        online_visibility = excluded.online_visibility,
        kiosk_visibility = excluded.kiosk_visibility,
        pos_visibility = excluded.pos_visibility,
        square_catalog_item_id = excluded.square_catalog_item_id,
        square_catalog_variation_id = excluded.square_catalog_variation_id,
        external_sync_state = excluded.external_sync_state,
        source = excluded.source,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      item.public_id,
      cleanPublicId(item.wordpress_public_id),
      item.row_version,
      item.provider_card_id ?? "",
      cleanGame(item.game),
      item.card_name,
      item.set_name,
      positiveInt(item.reference_variant_id),
      cleanPublicId(item.provider_variant_id),
      item.set_code ?? "",
      item.card_number ?? "",
      item.printed_number ?? "",
      cleanName(item.variant),
      cleanName(item.finish),
      cleanName(item.language) || "EN",
      cleanRawOrGraded(item.raw_or_graded),
      item.condition,
      item.barcode,
      item.price_minor_units,
      item.currency,
      item.location,
      item.status,
      item.image_url ?? "",
      item.back_image_url ?? "",
      cleanVisibility(item.online_visibility, "visible"),
      cleanVisibility(item.kiosk_visibility, "visible"),
      cleanVisibility(item.pos_visibility, "visible"),
      cleanExternalId(item.square_catalog_item_id),
      cleanExternalId(item.square_catalog_variation_id),
      cleanExternalSyncState(item.external_sync_state),
      item.source,
      now().toISOString(),
    )
}

function saveReferenceCard(database, card, now) {
  database
    .prepare(`
      INSERT INTO reference_cards (
        provider_card_id, game, card_name, set_name, set_code, card_number,
        printed_number, suggested_barcode, market_price_minor_units, currency,
        image_url, variants_json, price_observed_at_utc, catalog_synced_at_utc, catalog_source,
        updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider_card_id) DO UPDATE SET
        game = excluded.game,
        card_name = excluded.card_name,
        set_name = excluded.set_name,
        set_code = excluded.set_code,
        card_number = excluded.card_number,
        printed_number = excluded.printed_number,
        suggested_barcode = excluded.suggested_barcode,
        market_price_minor_units = excluded.market_price_minor_units,
        currency = excluded.currency,
        image_url = excluded.image_url,
        variants_json = excluded.variants_json,
        price_observed_at_utc = excluded.price_observed_at_utc,
        catalog_synced_at_utc = excluded.catalog_synced_at_utc,
        catalog_source = excluded.catalog_source,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      card.provider_card_id,
      cleanGame(card.game),
      card.card_name,
      card.set_name,
      card.set_code,
      card.card_number,
      card.printed_number,
      card.suggested_barcode,
      card.market_price_minor_units,
      card.currency,
      card.image_url,
      JSON.stringify(card.variants ?? []),
      card.price_observed_at_utc,
      card.catalog_synced_at_utc,
      card.catalog_source,
      now().toISOString(),
    )
}

function saveClientDevice(database, device) {
  database
    .prepare(`
      INSERT INTO client_devices (
        device_id, device_label, mode, app_version, platform, network_status,
        setup_status, server_url, website_url, capabilities_json,
        heartbeat_interval_seconds, first_seen_at_utc, last_seen_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        device_label = excluded.device_label,
        mode = excluded.mode,
        app_version = excluded.app_version,
        platform = excluded.platform,
        network_status = excluded.network_status,
        setup_status = excluded.setup_status,
        server_url = excluded.server_url,
        website_url = excluded.website_url,
        capabilities_json = excluded.capabilities_json,
        heartbeat_interval_seconds = excluded.heartbeat_interval_seconds,
        last_seen_at_utc = excluded.last_seen_at_utc
    `)
    .run(
      device.device_id,
      device.device_label,
      cleanClientDeviceMode(device.mode),
      device.app_version,
      device.platform,
      cleanClientDeviceNetworkStatus(device.network_status),
      cleanClientDeviceSetupStatus(device.setup_status),
      device.server_url,
      device.website_url,
      JSON.stringify(cleanClientDeviceCapabilities(device.capabilities, device.mode)),
      boundedInt(device.heartbeat_interval_seconds, 5, 600, 30),
      device.first_seen_at_utc,
      device.last_seen_at_utc,
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
        event_id, slug, row_version, title, starts_at_utc, starts_at_label,
        registration_status, capacity, registered_count, location_label, note,
        source, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO UPDATE SET
        slug = excluded.slug,
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
      cleanSlug(event.slug),
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

function appendQueueOperation(database, queue, type, entityId, payload, now, options = {}) {
  const operation = queueOperation(type, entityId, payload, now)
  operation.sync_status = cleanQueueSyncStatus(options.syncStatus ?? operation.sync_status)

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

function deleteQueueOperation(database, queue, operationId) {
  database
    .prepare("DELETE FROM operation_queue WHERE operation_id = ?")
    .run(operationId)

  const index = queue.findIndex((operation) => operation.operation_id === operationId)

  if (index >= 0) {
    queue.splice(index, 1)
  }
}

function pendingQueueOperations(queue) {
  return queue.filter((operation) => operation.sync_status === "pending")
}

function cleanQueueSyncStatus(value) {
  const status = String(value ?? "").trim().toLowerCase()

  return ["pending", "local_only"].includes(status) ? status : "pending"
}

function localInventoryStatus(value) {
  const status = String(value ?? "").trim()

  return ["available", "reserved", "conflict", "pending_intake"].includes(status) ? status : null
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
      id: "preview-manager",
      name: "Preview Manager",
      pin: "1420",
      role: "manager",
      access: [...ACCESS_SECTIONS],
      salt: "seed-preview-manager",
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
      wordpress_public_id: "",
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
      wordpress_public_id: "",
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
      slug: "event-100",
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
      slug: "event-101",
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
    wordpress_public_id: cleanPublicId(item.wordpress_public_id),
    row_version: item.row_version,
    provider_card_id: item.provider_card_id ?? "",
    reference_variant_id: positiveInt(item.reference_variant_id),
    provider_variant_id: cleanPublicId(item.provider_variant_id),
    game: cleanGame(item.game),
    card_name: item.card_name,
    set_name: item.set_name,
    set_code: item.set_code ?? "",
    card_number: item.card_number ?? "",
    printed_number: item.printed_number ?? "",
    variant: cleanName(item.variant),
    finish: cleanName(item.finish),
    language: cleanName(item.language) || "EN",
    raw_or_graded: cleanRawOrGraded(item.raw_or_graded),
    condition: item.condition,
    barcode: item.barcode,
    price_minor_units: item.price_minor_units,
    currency: item.currency,
    location: item.location,
    status: item.status,
    image_url: item.image_url ?? "",
    back_image_url: item.back_image_url ?? "",
    online_visibility: cleanVisibility(item.online_visibility, "visible"),
    kiosk_visibility: cleanVisibility(item.kiosk_visibility, "visible"),
    pos_visibility: cleanVisibility(item.pos_visibility, "visible"),
    square_catalog_item_id: cleanExternalId(item.square_catalog_item_id),
    square_catalog_variation_id: cleanExternalId(item.square_catalog_variation_id),
    external_sync_state: cleanExternalSyncState(item.external_sync_state),
    source: item.source,
  }
}

function localInventoryItemFromWordPress(row) {
  const publicId = cleanPublicId(row.public_id)
  const cardName = cleanName(row.card_name)
  const priceMinorUnits = minorUnitsFromDecimal(row.sale_price ?? row.suggested_price ?? row.market_price)
  const status = localInventoryStatus(row.status)

  if (!publicId || !cardName || priceMinorUnits <= 0 || !status) {
    return null
  }

  const locationId = Number.parseInt(String(row.location_id ?? ""), 10)
  const location = Number.isFinite(locationId) && locationId > 0
    ? `WordPress Location ${locationId}`
    : cleanName(row.location ?? row.location_label) || "Website Inventory"

  return {
    public_id: publicId,
    wordpress_public_id: publicId,
    row_version: boundedInt(row.row_version, 1, 999999999, 1),
    provider_card_id: cleanPublicId(row.provider_card_id),
    reference_variant_id: positiveInt(row.reference_variant_id),
    provider_variant_id: cleanPublicId(row.provider_variant_id),
    game: cleanGame(row.game),
    card_name: cardName,
    set_name: cleanName(row.set_name) || "Website Inventory",
    set_code: cleanName(row.set_code).toUpperCase(),
    card_number: cleanName(row.card_number),
    printed_number: cleanName(row.printed_number),
    variant: cleanName(row.variant),
    finish: cleanName(row.finish),
    language: cleanName(row.language) || "EN",
    raw_or_graded: cleanRawOrGraded(row.raw_or_graded),
    condition: cleanCondition(row.condition_code ?? row.condition),
    barcode: cleanBarcode(row.barcode ?? row.sku) || publicId,
    price_minor_units: priceMinorUnits,
    currency: cleanCurrency(row.sale_currency ?? row.currency),
    location,
    status,
    image_url: cleanHttpUrl(row.front_image_url ?? row.front_image_remote_url ?? row.image_url),
    back_image_url: cleanHttpUrl(row.back_image_url ?? row.back_image_remote_url),
    online_visibility: cleanVisibility(row.online_visibility, "visible"),
    kiosk_visibility: cleanVisibility(row.kiosk_visibility, "visible"),
    pos_visibility: cleanVisibility(row.pos_visibility, "visible"),
    square_catalog_item_id: cleanExternalId(row.square_catalog_item_id),
    square_catalog_variation_id: cleanExternalId(row.square_catalog_variation_id),
    external_sync_state: cleanExternalSyncState(row.external_sync_state),
    source: "cached",
  }
}

function localEventSnapshotFromWordPress(row) {
  const slug = cleanSlug(row.slug)
  const publicId = cleanPublicId(row.public_id)
  const numericId = Number.parseInt(String(row.id ?? row.event_id ?? ""), 10)
  const eventId = publicId || slug || (Number.isFinite(numericId) && numericId > 0 ? `wp-event-${numericId}` : "")
  const title = cleanName(row.title)
  const startsAt = cleanDateTime(row.start_datetime ?? row.starts_at_utc ?? row.start)
  const playerCap = nullableNonNegativeInt(row.player_cap ?? row.capacity)
  const registeredCount = boundedInt(row.registered_count, 0, 999999, 0)
  const seatsRemaining = nullableNonNegativeInt(row.seats_remaining)
  const capacity = playerCap ?? (seatsRemaining === null ? registeredCount : registeredCount + seatsRemaining)

  if (!eventId || !title || !startsAt) {
    return null
  }

  return {
    event_id: eventId,
    slug,
    row_version: boundedInt(row.row_version, 1, 999999999, 1),
    title,
    starts_at_utc: startsAt,
    starts_at_label: cleanName(row.starts_at_label) || eventStartLabel(startsAt),
    registration_status: cleanEventRegistrationStatus(row.registration_status),
    capacity,
    registered_count: registeredCount,
    location_label: cleanName(row.location_label ?? row.event_type ?? row.game) || "Website Event",
    note: cleanName(row.description) || "Pulled from the WordPress event calendar.",
    source: "cached",
  }
}

function squareInventoryRowForPlanner(item) {
  return {
    public_id: cleanPublicId(item.public_id),
    barcode: cleanBarcode(item.barcode),
    sku: cleanBarcode(item.barcode),
    square_catalog_item_id: cleanExternalId(item.square_catalog_item_id),
    square_catalog_variation_id: cleanExternalId(item.square_catalog_variation_id),
    status: localInventoryStatus(item.status) ?? "conflict",
    pos_visibility: cleanVisibility(item.pos_visibility, "visible"),
    row_version: boundedInt(item.row_version, 1, 999999999, 1),
  }
}

function publicCustomer(customer) {
  return {
    customer_public_id: customer.customer_public_id,
    customer_id: customer.wordpress_customer_id,
    wordpress_customer_id: customer.wordpress_customer_id,
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
    slug: cleanSlug(event.slug) || cleanSlug(event.event_id),
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

function publicClientDevice(device, now, heartbeatTimeoutSeconds) {
  const nowMs = now().getTime()
  const lastSeenMs = Date.parse(device.last_seen_at_utc)
  const lastSeenIsValid = Number.isFinite(lastSeenMs)
  const secondsSinceSeen = lastSeenIsValid ? Math.max(0, Math.floor((nowMs - lastSeenMs) / 1000)) : null
  const staleAfterMs = lastSeenIsValid ? lastSeenMs + heartbeatTimeoutSeconds * 1000 : 0
  const connectionStatus =
    lastSeenIsValid && device.network_status !== "offline" && nowMs <= staleAfterMs ? "online" : "offline"

  return {
    device_id: device.device_id,
    device_label: device.device_label,
    mode: cleanClientDeviceMode(device.mode),
    app_version: device.app_version,
    platform: device.platform,
    network_status: cleanClientDeviceNetworkStatus(device.network_status),
    setup_status: cleanClientDeviceSetupStatus(device.setup_status),
    connection_status: connectionStatus,
    capabilities: cleanClientDeviceCapabilities(device.capabilities, device.mode),
    heartbeat_interval_seconds: boundedInt(device.heartbeat_interval_seconds, 5, 600, 30),
    first_seen_at_utc: device.first_seen_at_utc,
    last_seen_at_utc: device.last_seen_at_utc,
    seconds_since_seen: secondsSinceSeen,
    stale_after_utc: staleAfterMs > 0 ? new Date(staleAfterMs).toISOString() : "",
    server_url: device.server_url,
    website_url: device.website_url,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

function buildClientDeviceSummary(devices, now, heartbeatTimeoutSeconds) {
  const publicDevices = devices
    .map((device) => publicClientDevice(device, now, heartbeatTimeoutSeconds))
    .sort((left, right) => {
      if (left.connection_status !== right.connection_status) {
        return left.connection_status === "online" ? -1 : 1
      }

      return String(right.last_seen_at_utc).localeCompare(String(left.last_seen_at_utc))
    })

  return {
    devices: publicDevices,
    device_count: publicDevices.length,
    online_count: publicDevices.filter((device) => device.connection_status === "online").length,
    offline_count: publicDevices.filter((device) => device.connection_status === "offline").length,
    setup_ready_count: publicDevices.filter((device) => device.setup_status === "ready").length,
    setup_required_count: publicDevices.filter((device) => device.setup_status === "setup_required").length,
    kiosk_count: publicDevices.filter((device) => device.mode === "kiosk").length,
    employee_count: publicDevices.filter((device) => device.mode === "employee").length,
    manager_count: publicDevices.filter((device) => device.mode === "manager").length,
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

function cleanClientDeviceMode(value) {
  const mode = String(value ?? "").trim().toLowerCase()

  return CLIENT_DEVICE_MODES.includes(mode) ? mode : "employee"
}

function cleanClientDeviceSetupStatus(value) {
  const status = String(value ?? "").trim().toLowerCase()

  return CLIENT_DEVICE_SETUP_STATUSES.includes(status) ? status : "setup_required"
}

function cleanClientDeviceNetworkStatus(value) {
  const status = String(value ?? "").trim().toLowerCase()

  return CLIENT_DEVICE_NETWORK_STATUSES.includes(status) ? status : "online"
}

function cleanClientDeviceCapabilities(value, mode) {
  const defaultCapabilities =
    cleanClientDeviceMode(mode) === "kiosk"
      ? ["Kiosk", "Status"]
      : ["Inventory", "Kiosk", "Events", "Customers", "Sync", "Status"]

  if (!Array.isArray(value)) {
    return defaultCapabilities
  }

  const capabilities = [...new Set(value.filter((section) => ACCESS_SECTIONS.includes(section)))]

  return capabilities.length > 0 ? capabilities : defaultCapabilities
}

function cleanReason(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 160) || "local reservation"
}

function cleanCondition(value) {
  const condition = String(value ?? "").trim().toUpperCase().slice(0, 16)

  return condition || "RAW"
}

function cleanVisibility(value, fallback = "visible") {
  const visibility = String(value ?? "").trim().toLowerCase()
  const fallbackVisibility = String(fallback ?? "visible").trim().toLowerCase()

  if (["hidden", "visible", "staff_only"].includes(visibility)) {
    return visibility
  }

  return ["hidden", "visible", "staff_only"].includes(fallbackVisibility) ? fallbackVisibility : "visible"
}

function cleanBarcode(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64)
}

function cleanExternalId(value) {
  return String(value ?? "").trim().slice(0, 191)
}

function cleanExternalSyncState(value) {
  const status = String(value ?? "").trim().toLowerCase()

  return ["pending", "synced", "square_synced", "failed", "conflict"].includes(status) ? status : "pending"
}

function cleanSquareEnvironment(value) {
  const environment = String(value ?? "").trim().toLowerCase()

  return ["sandbox", "test", "local", "staging"].includes(environment) ? environment : "sandbox"
}

function cleanPublicId(value) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9-_:.]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96)
}

function cleanSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 96)
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

function cleanDateTime(value) {
  const text = String(value ?? "").trim()

  if (!text) {
    return ""
  }

  const parsed = Date.parse(text)

  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : ""
}

function eventStartLabel(value) {
  const parsed = Date.parse(value)

  if (!Number.isFinite(parsed)) {
    return ""
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsed))
}

function nullableNonNegativeInt(value) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = Number.parseInt(String(value), 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function pullDomains(value) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",")
  const domains = new Set(
    raw.map((entry) => String(entry ?? "").trim().toLowerCase()).filter((entry) => ["inventory", "events"].includes(entry)),
  )

  if (domains.size === 0) {
    domains.add("inventory")
    domains.add("events")
  }

  return domains
}

function cleanCustomerStatus(value) {
  return ["active", "inactive"].includes(value) ? value : "active"
}

function cleanScryDexQuery(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80)
}

function cleanScryDexSearchText(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 4000)
}

function cleanGame(value) {
  const game = String(value ?? "").trim().toLowerCase()

  return ["pokemon", "magic", "lorcana", "one-piece"].includes(game) ? game : "pokemon"
}

function searchReferenceCards(referenceCards, needle, game) {
  const includeVariantOnlyMatches = isVariantFocusedScryDexQuery(needle)

  return referenceCards
    .filter((card) => card.game === game)
    .map((card) => ({
      card,
      score: referenceSearchScore(card, needle, { includeVariantOnlyMatches }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((entry) => entry.card)
}

function normalizeReferenceCardsFromFallback(result, game, now, needle = "") {
  if (!result || typeof result !== "object") {
    return []
  }

  const candidateCards = Array.isArray(result.cards)
    ? result.cards
    : Array.isArray(result.items)
      ? result.items
      : Array.isArray(result.data?.cards)
        ? result.data.cards
        : Array.isArray(result.data?.items)
          ? result.data.items
          : []

  return candidateCards
    .map((card) => normalizeReferenceCard(card, game, now, "wordpress_catalog_cache"))
    .filter((card) => card.provider_card_id && card.card_name)
    .sort(
      (left, right) =>
        referenceSearchScore(right, needle, { includeVariantOnlyMatches: true }) -
        referenceSearchScore(left, needle, { includeVariantOnlyMatches: true }),
    )
    .slice(0, 8)
}

function referenceSearchScore(card, needle, options = {}) {
  const normalizedNeedle = cleanScryDexQuery(needle)
  const cardName = cleanScryDexSearchText(card.card_name)
  const setName = cleanScryDexSearchText(card.set_name)
  const identifiers = cleanScryDexSearchText([
    card.provider_card_id,
    card.set_code,
    card.card_number,
    card.printed_number,
    card.suggested_barcode,
  ].join(" "))
  const variants = cleanScryDexSearchText(
    (card.variants ?? [])
      .flatMap((variant) => [
        variant.provider_variant_id,
        variant.variant,
        variant.finish,
        variant.parallel_name,
        variant.edition,
        variant.language,
      ])
      .join(" "),
  )

  if (!normalizedNeedle) {
    return 0
  }

  if (cardName === normalizedNeedle) {
    return 1000
  }

  if (cardName.startsWith(normalizedNeedle)) {
    return 900
  }

  if (cardName.includes(normalizedNeedle)) {
    return 800
  }

  if (identifiers.includes(normalizedNeedle)) {
    return 500
  }

  if (options.includeVariantOnlyMatches === true && variants.includes(normalizedNeedle)) {
    return 350
  }

  if (setName.includes(normalizedNeedle)) {
    return 100
  }

  return 0
}

function isVariantFocusedScryDexQuery(value) {
  const query = cleanScryDexQuery(value)

  return [
    "stamp",
    "foil",
    "holo",
    "reverse",
    "parallel",
    "edition",
    "first edition",
    "unlimited",
    "normal",
    "promo",
    "graded",
    "variant",
  ].some((token) => query.includes(token))
}

function normalizeReferenceCard(card, fallbackGame = "pokemon", now = () => new Date(), catalogSource = "wordpress_catalog_cache") {
  const currentTimestamp = typeof now === "function" ? now().toISOString() : new Date().toISOString()
  const providerCardId = cleanPublicId(card.provider_card_id ?? card.id ?? card.public_id)
  const set = card.set && typeof card.set === "object" ? card.set : {}
  const marketPrice = card.market_price && typeof card.market_price === "object" ? card.market_price : {}
  const images = card.images && typeof card.images === "object" ? card.images : {}
  const variants = cleanReferenceVariants(card.variants ?? parseJson(card.variants_json, []))
  const priceMinorUnits =
    card.market_price_minor_units !== undefined
      ? minorUnits(card.market_price_minor_units)
      : decimalMoneyToMinorUnits(marketPrice.amount ?? card.market_price ?? card.price)

  return {
    provider_card_id: providerCardId,
    game: cleanGame(card.game ?? fallbackGame),
    card_name: cleanName(card.card_name ?? card.name),
    set_name: cleanName(card.set_name ?? set.name),
    set_code: cleanName(card.set_code ?? set.code).toUpperCase(),
    card_number: cleanName(card.card_number ?? card.number),
    printed_number: cleanName(card.printed_number ?? card.printedNumber),
    suggested_barcode: cleanBarcode(card.suggested_barcode ?? card.sku ?? providerCardId),
    market_price_minor_units: Math.max(0, priceMinorUnits),
    currency: cleanCurrency(card.currency ?? marketPrice.currency),
    image_url: cleanHttpUrl(card.image_url ?? card.front_image_url ?? images.front ?? images.small ?? images.large),
    variants,
    price_observed_at_utc: cleanIsoTimestamp(card.price_observed_at_utc ?? card.observed_at ?? card.updated_at),
    catalog_synced_at_utc: cleanIsoTimestamp(card.catalog_synced_at_utc ?? card.synced_at_utc) || currentTimestamp,
    catalog_source: cleanCatalogSource(card.catalog_source ?? catalogSource),
  }
}

function cleanReferenceVariants(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((variant) => variant && typeof variant === "object")
    .map((variant) => ({
      reference_variant_id: positiveInt(variant.reference_variant_id),
      provider_variant_id: cleanPublicId(variant.provider_variant_id ?? variant.id),
      variant: cleanName(variant.variant ?? variant.name),
      finish: cleanName(variant.finish),
      parallel_name: cleanName(variant.parallel_name ?? variant.parallel),
      edition: cleanName(variant.edition),
      language: cleanName(variant.language),
      front_image_url: cleanHttpUrl(variant.front_image_url ?? variant.image_url),
      back_image_url: cleanHttpUrl(variant.back_image_url),
      raw_or_graded_support: cleanRawOrGradedSupport(variant.raw_or_graded_support),
      attributes: variant.attributes && typeof variant.attributes === "object" ? variant.attributes : {},
    }))
    .filter((variant) =>
      [
        variant.provider_variant_id,
        variant.variant,
        variant.finish,
        variant.parallel_name,
        variant.edition,
        variant.language,
      ].some((field) => field),
    )
    .slice(0, 24)
}

function cleanRawOrGradedSupport(value) {
  const support = String(value ?? "").trim().toLowerCase()

  return ["raw", "graded", "both"].includes(support) ? support : "both"
}

function cleanRawOrGraded(value) {
  const rawOrGraded = String(value ?? "").trim().toLowerCase()

  return ["raw", "graded"].includes(rawOrGraded) ? rawOrGraded : "raw"
}

function upsertReferenceCard(referenceCards, card) {
  const existingIndex = referenceCards.findIndex((candidate) => candidate.provider_card_id === card.provider_card_id)

  if (existingIndex >= 0) {
    referenceCards[existingIndex] = card
    return
  }

  referenceCards.push(card)
}

function decimalMoneyToMinorUnits(value) {
  const amount = Number(String(value ?? "0").replace(/[^0-9.-]+/g, ""))

  return Number.isFinite(amount) ? Math.trunc(amount * 100) : 0
}

function cleanCurrency(value) {
  const currency = String(value ?? "USD").trim().toUpperCase()

  return /^[A-Z]{3}$/.test(currency) ? currency : "USD"
}

function cleanIsoTimestamp(value) {
  const text = String(value ?? "").trim()

  if (!text || Number.isNaN(Date.parse(text))) {
    return ""
  }

  return new Date(text).toISOString()
}

function cleanCatalogSource(value) {
  return value === "local_reference_cache" ? "local_reference_cache" : "wordpress_catalog_cache"
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
      variants: [
        {
          provider_variant_id: "scrydex-pokemon-base-004-holo-unlimited",
          variant: "Unlimited Holo",
          finish: "Holofoil",
          parallel_name: "",
          edition: "Unlimited",
          language: "English",
          raw_or_graded_support: "both",
          attributes: {},
        },
        {
          provider_variant_id: "scrydex-pokemon-base-004-holo-1st-edition",
          variant: "1st Edition Holo",
          finish: "Holofoil",
          parallel_name: "",
          edition: "1st Edition",
          language: "English",
          raw_or_graded_support: "both",
          attributes: {},
        },
      ],
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
      variants: [
        {
          provider_variant_id: "scrydex-pokemon-jungle-060-yellow-cheeks",
          variant: "Yellow Cheeks",
          finish: "Regular",
          parallel_name: "",
          edition: "Unlimited",
          language: "English",
          raw_or_graded_support: "both",
          attributes: {},
        },
      ],
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
    catalog_source: cleanCatalogSource(card.catalog_source),
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

function minorUnitsFromDecimal(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""))

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0
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

function positiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function blocked(code, message, extra = {}) {
  return {
    status: "blocked",
    code,
    message,
    ...extra,
  }
}
