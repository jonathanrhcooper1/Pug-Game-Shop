import { createHash, randomUUID } from "node:crypto"

export const ACCESS_SECTIONS = Object.freeze([
  "Inventory",
  "Kiosk",
  "Queue",
  "Events",
  "Customers",
  "Sync",
  "Conflicts",
  "Settings",
])

export function createLocalSyncStore(options = {}) {
  const now = options.now ?? (() => new Date())
  const users = seedUsers()
  const sessions = new Map()
  const inventoryItems = seedInventoryItems()
  const queue = []
  const kioskOrders = []

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
    queue.push(queueOperation("user_access_upsert", user.id, { role: user.role, access: user.access }))

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

    queue.push(queueOperation("user_access_upsert", user.id, { role: user.role, access: user.access }))

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

      return [item.card_name, item.set_name, item.barcode, item.public_id]
        .some((value) => String(value).toLowerCase().includes(needle))
    })

    return {
      status: "ok",
      items: items.map(publicInventoryItem),
      local_cache_source: "local_sync_server",
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

  function createKioskOrder(input = {}) {
    const firstName = cleanName(input.first_name)
    const lastName = cleanName(input.last_name)
    const publicIds = Array.isArray(input.inventory_public_ids) ? input.inventory_public_ids : []

    if (!firstName || !lastName || publicIds.length === 0) {
      return blocked("invalid_kiosk_order", "First name, last name, and at least one item are required.")
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
    queue.push(queueOperation("kiosk_order", order.order_id, order))

    return {
      status: "ok",
      order,
      reservations,
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

    const reservation = {
      reservation_id: `reservation-${randomUUID()}`,
      inventory_public_id: item.public_id,
      source,
      hold_reason: holdReason,
      actor_id: actorId,
      status: "queued",
      created_at_utc: now().toISOString(),
    }

    queue.push(queueOperation("inventory_reservation", reservation.reservation_id, reservation))

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
      persistence_mode: "sqlite_adapter_pending",
      queue_depth: queue.length,
      kiosk_order_count: kioskOrders.length,
      inventory_count: inventoryItems.length,
      active_session_count: sessions.size,
      wordpress_push_connected: false,
      local_operations_preserved: true,
    }
  }

  return {
    addUser,
    createKioskOrder,
    createSession,
    listAccessPolicy,
    reserveInventory,
    searchInventory,
    syncStatus,
    updateUserAccess,
  }
}

function seedUsers() {
  return [
    buildSeedUser({
      id: "staff-front-counter",
      name: "Front Counter Staff",
      pin: "1234",
      role: "staff",
      access: ["Inventory", "Kiosk", "Queue", "Events", "Customers", "Sync"],
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
      card_name: "Charizard",
      set_name: "Base Set",
      condition: "LP",
      barcode: "PUG-000001",
      price_minor_units: 125000,
      currency: "USD",
      location: "Showcase A",
      status: "available",
      source: "cached",
    },
    {
      public_id: "inv-1002",
      row_version: 1,
      card_name: "Pikachu",
      set_name: "Base Set",
      condition: "NM",
      barcode: "PUG-000002",
      price_minor_units: 3200,
      currency: "USD",
      location: "Case 2",
      status: "available",
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
    card_name: item.card_name,
    set_name: item.set_name,
    condition: item.condition,
    barcode: item.barcode,
    price_minor_units: item.price_minor_units,
    currency: item.currency,
    location: item.location,
    status: item.status,
    source: item.source,
  }
}

function queueOperation(type, entityId, payload) {
  return {
    operation_id: `op-${randomUUID()}`,
    operation_type: type,
    entity_id: entityId,
    payload,
    queued_at_utc: new Date().toISOString(),
    sync_status: "pending",
  }
}

function verifyPin(pin, user) {
  return /^\d{4}$/.test(String(pin ?? "")) && hashPin(pin, user.pinSalt) === user.pinHash
}

function hashPin(pin, salt) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex")
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

function cleanRole(value) {
  return value === "manager" ? "manager" : "staff"
}

function cleanReason(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 160) || "local reservation"
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
