import { createHash, randomUUID, timingSafeEqual } from "node:crypto"
import { spawn, spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { fileURLToPath } from "node:url"

import {
  planSquareBarcodeSkuInventoryPull,
  planSquareInventoryCountReconciliation,
} from "../../../packages/api-client/src/squareInventoryAdapter.mjs"

export const ACCESS_SECTIONS = Object.freeze([
  "Inventory",
  "Trade-Ins",
  "ScryDex",
  "Checkout",
  "Kiosk",
  "Queue",
  "Events",
  "Customers",
  "Reports",
  "Sync",
  "Status",
  "Conflicts",
  "Settings",
])

const CLIENT_DEVICE_MODES = Object.freeze(["employee", "manager", "kiosk"])
const CLIENT_DEVICE_SETUP_STATUSES = Object.freeze(["setup_required", "configuring", "ready", "error"])
const CLIENT_DEVICE_NETWORK_STATUSES = Object.freeze(["online", "offline", "degraded"])
const DEFAULT_HEARTBEAT_TIMEOUT_SECONDS = 90
const DEFAULT_CARD_HOLD_SECONDS = 15 * 60
const SCANNER_BARCODE_MAX_LENGTH = 13
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
  const cardHoldSeconds = boundedInt(options.cardHoldSeconds, 60, 24 * 60 * 60, DEFAULT_CARD_HOLD_SECONDS)
  const websiteCatalogFallback = typeof options.websiteCatalogFallback === "function" ? options.websiteCatalogFallback : null
  const scryDexVisionIdentifier =
    options.scryDexVisionIdentifier &&
    typeof options.scryDexVisionIdentifier.identifyCardImage === "function"
      ? options.scryDexVisionIdentifier
      : null
  const scryDexWebhookRelayToken = cleanSharedSecret(
    options.scryDexWebhookRelayToken ?? options.scrydexWebhookRelayToken,
  )
  const wordpressCatalogExportPull =
    typeof options.wordpressCatalogExportPull === "function" ? options.wordpressCatalogExportPull : null
  const wordpressCatalogIndexer =
    typeof options.wordpressCatalogIndexer === "function" ? options.wordpressCatalogIndexer : null
  const wordpressCatalogIndexerFallback =
    typeof options.wordpressCatalogIndexerFallback === "function" ? options.wordpressCatalogIndexerFallback : null
  const scryDexCatalogIndexerMode = cleanExternalId(options.scryDexCatalogIndexerMode) || (
    wordpressCatalogIndexer ? "wordpress_route" : "unconfigured"
  )
  const wordpressInventoryPull = typeof options.wordpressInventoryPull === "function" ? options.wordpressInventoryPull : null
  const wordpressEventsPull = typeof options.wordpressEventsPull === "function" ? options.wordpressEventsPull : null
  const wordpressFulfillmentPull =
    typeof options.wordpressFulfillmentPull === "function" ? options.wordpressFulfillmentPull : null
  const wordpressReportsPull = typeof options.wordpressReportsPull === "function" ? options.wordpressReportsPull : null
  const wordpressInventoryPush = typeof options.wordpressInventoryPush === "function" ? options.wordpressInventoryPush : null
  const wordpressInventoryUpdatePush =
    typeof options.wordpressInventoryUpdatePush === "function" ? options.wordpressInventoryUpdatePush : null
  const wordpressInventorySalePush =
    typeof options.wordpressInventorySalePush === "function" ? options.wordpressInventorySalePush : null
  const wordpressFulfillmentStatusPush =
    typeof options.wordpressFulfillmentStatusPush === "function" ? options.wordpressFulfillmentStatusPush : null
  const wordpressEventRegistrationPush =
    typeof options.wordpressEventRegistrationPush === "function" ? options.wordpressEventRegistrationPush : null
  const wordpressEventCheckinPush =
    typeof options.wordpressEventCheckinPush === "function" ? options.wordpressEventCheckinPush : null
  const wordpressEventUpsertPush =
    typeof options.wordpressEventUpsertPush === "function" ? options.wordpressEventUpsertPush : null
  const wordpressCreditPush = typeof options.wordpressCreditPush === "function" ? options.wordpressCreditPush : null
  const wordpressCustomerUpsertPush =
    typeof options.wordpressCustomerUpsertPush === "function" ? options.wordpressCustomerUpsertPush : null
  const wordpressKioskOrderPush =
    typeof options.wordpressKioskOrderPush === "function" ? options.wordpressKioskOrderPush : null
  const fulfillmentNotifications = cleanFulfillmentNotificationSettings(
    options.fulfillmentNotifications ?? options.fulfillmentNotificationSettings,
  )
  const gradedPricingLookup = typeof options.gradedPricingLookup === "function" ? options.gradedPricingLookup : null
  const gradedPricingProviderConfigured = Boolean(options.gradedPricingProviderConfigured ?? gradedPricingLookup?.configured)
  const gradedPricingCacheTtlSeconds = boundedInt(
    options.gradedPricingCacheTtlSeconds,
    60,
    7 * 24 * 60 * 60,
    24 * 60 * 60,
  )
  const squareLocationId = cleanExternalId(options.squareLocationId) || "LOCAL-SQUARE-POS"
  const squareEnvironment = cleanSquareEnvironment(options.squareEnvironment)
  const squareTerminalConnector = options.squareTerminalConnector ?? null
  const squareCatalogInventorySyncer = options.squareCatalogInventorySyncer ?? null
  const squareInventoryCountsPuller = options.squareInventoryCountsPuller ?? null
  const squareSalesReportsPuller = options.squareSalesReportsPuller ?? null
  const databasePath = options.databasePath ?? DEFAULT_LOCAL_SYNC_DATABASE_PATH
  const resolvedDatabasePath = databasePath === ":memory:" ? ":memory:" : resolve(databasePath)
  const maintenanceRoot = resolve(
    options.maintenanceRoot ??
      resolve(dirname(resolvedDatabasePath === ":memory:" ? DEFAULT_LOCAL_SYNC_DATABASE_PATH : resolvedDatabasePath), "server-maintenance"),
  )
  const serverInstallRoot = resolve(options.serverInstallRoot ?? findPugLanInstallRoot())
  const serverPackageRoot = resolve(serverInstallRoot, "pug-lan-server")
  const serverPort = boundedInt(options.port ?? options.localSyncPort, 1, 65535, 8787)
  const restartCommand = typeof options.restartCommand === "function" ? options.restartCommand : null
  const patchApplyCommand = typeof options.patchApplyCommand === "function" ? options.patchApplyCommand : null
  const seedDemoInventory =
    options.seedDemoInventory === true ||
    (options.seedDemoInventory !== false && !options.database && databasePath === ":memory:")
  const seedDemoData =
    options.seedDemoData === true ||
    (options.seedDemoData !== false && !options.database && databasePath === ":memory:")
  const database = options.database ?? openLocalSyncDatabase(databasePath)
  migrateLocalSyncDatabase(database)
  seedLocalSyncDatabase(database, now, { seedDemoData, seedDemoInventory })
  const setupConfig = loadSetupConfig(database, {
    configuredAtUtc: now().toISOString(),
    localDatabase: options.localDatabase ?? "store-sync.sqlite",
    restBasePath: options.restBasePath,
    serverUrl: options.serverUrl,
    storeId: options.storeId,
    websiteUrl: options.websiteUrl,
  })

  if (options.removeSeedReferenceCards === true) {
    removeSeedReferenceCards(database)
  }

  const users = loadUsers(database)
  persistCurrentAccessSchema(database, users, now)
  const sessions = new Map()
  const inventoryItems = loadInventoryItems(database)
  const inventoryLocations = loadInventoryLocations(database, inventoryItems)
  const queue = loadQueue(database)
  const kioskOrders = loadKioskOrders(database)
  const fulfillmentOrders = loadFulfillmentOrders(database)
  const tradeInOrders = loadTradeInOrders(database)
  const customers = loadCustomers(database)
  const creditLedgerEntries = loadCreditLedgerEntries(database)
  const checkoutTransactions = loadCheckoutTransactions(database)
  const cashDrawerSessions = loadCashDrawerSessions(database)
  const cashDrawerMovements = loadCashDrawerMovements(database)
  const eventSnapshots = loadEventSnapshots(database)
  const referenceCards = loadReferenceCards(database)
  const clientDevices = loadClientDevices(database)
  let squareSalesReportSnapshots = loadSquareSalesReportSnapshots(database)
  const persistedScryDexCatalogSyncHistory = loadScryDexCatalogSyncHistory(database)
  let lastSquareInventoryReconciliationResult = null
  let lastWebsiteInventoryPullResult = null
  let lastScryDexCatalogSyncResult = persistedScryDexCatalogSyncHistory[0] ?? null
  let activeScryDexCatalogSyncJob = null
  const activeScryDexCatalogSyncJobs = new Map()
  const scryDexCatalogSyncHistory = [...persistedScryDexCatalogSyncHistory]
  let databaseClosed = false

  function closeStore() {
    if (databaseClosed) {
      return
    }

    if (resolvedDatabasePath !== ":memory:") {
      database.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get()
      database.exec("PRAGMA journal_mode = DELETE;")
    }

    database.close()
    databaseClosed = true
  }

  function createSession({ pin, ttlMinutes = 30 } = {}) {
    const user = users.find((candidate) => verifyPin(pin, candidate))

    if (!user) {
      return blocked("invalid_pin", "PIN did not match a cached staff or manager policy.")
    }

    const token = `ls_${randomUUID()}`
    const issuedAt = now()
    const ttlSeconds = boundedInt(ttlMinutes, 5, 240, 30) * 60
    const expiresAt = new Date(issuedAt.getTime() + ttlSeconds * 1000)
    const session = {
      token,
      userId: user.id,
      role: user.role,
      access: [...user.access],
      expiresAtUtc: expiresAt.toISOString(),
      issuedAtUtc: issuedAt.toISOString(),
      serverTimeUtc: issuedAt.toISOString(),
      ttlSeconds,
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

    if (!["manager", "owner"].includes(sessionResult.user.role)) {
      return blocked("manager_required", "A manager PIN session is required.")
    }

    return sessionResult
  }

  function requireWorkspaceAccess(token, workspace) {
    const sessionResult = requireSession(token)

    if (sessionResult.status !== "ok") {
      return sessionResult
    }

    if (!["manager", "owner"].includes(sessionResult.user.role) && !sessionResult.user.access.includes(workspace)) {
      return blocked("workspace_access_required", `This PIN cannot access ${workspace}.`)
    }

    return sessionResult
  }

  function requireScryDexWebhookAccess(token) {
    if (scryDexWebhookRelayToken && secretsMatch(token, scryDexWebhookRelayToken)) {
      return {
        status: "ok",
        user: {
          id: "system-scrydex-webhook",
          name: "ScryDex webhook relay",
          role: "system",
          access: ["ScryDex"],
        },
        session: {
          token: "server-to-server",
          userId: "system-scrydex-webhook",
          expiresAtUtc: "",
        },
      }
    }

    return requireWorkspaceAccess(token, "ScryDex")
  }

  function authorizeLabelPrinting(token) {
    const sessionResult = requireWorkspaceAccess(token, "Inventory")

    if (sessionResult.status !== "ok") {
      return sessionResult
    }

    return {
      status: "ok",
      action: "dymo_label_print_authorized",
      user_id: sessionResult.user.id,
      user_name: sessionResult.user.name,
      user_role: sessionResult.user.role,
      access_section: "Inventory",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function authorizeCashDrawer(token) {
    const sessionResult = requireWorkspaceAccess(token, "Checkout")

    if (sessionResult.status !== "ok") {
      return sessionResult
    }

    return {
      status: "ok",
      action: "cash_drawer_authorized",
      user_id: sessionResult.user.id,
      user_name: sessionResult.user.name,
      user_role: sessionResult.user.role,
      access_section: "Checkout",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function activeCashDrawerSession() {
    return cashDrawerSessions.find((session) => cleanCashDrawerSessionStatus(session.status) === "open") ?? null
  }

  function cashDrawerMovementsForSession(sessionId) {
    const cleanedSessionId = cleanPublicId(sessionId)

    return cashDrawerMovements
      .filter((movement) => cleanPublicId(movement.session_id) === cleanedSessionId)
      .sort((left, right) => String(left.created_at_utc).localeCompare(String(right.created_at_utc)))
  }

  function cashDrawerSessionSummary(session) {
    const movements = cashDrawerMovementsForSession(session.session_id)
    const totals = summarizeCashDrawerMovements(movements)
    const startingCashMinorUnits = Math.max(0, minorUnits(session.starting_cash_minor_units))
    const expectedCashMinorUnits =
      startingCashMinorUnits +
      totals.cash_sales_minor_units +
      totals.cash_added_minor_units -
      totals.cash_trade_payout_minor_units -
      totals.cash_removed_minor_units
    const endingCashMinorUnits = Math.max(0, minorUnits(session.ending_cash_minor_units))
    const status = cleanCashDrawerSessionStatus(session.status)
    const varianceMinorUnits =
      status === "closed"
        ? endingCashMinorUnits - expectedCashMinorUnits
        : Math.trunc(session.variance_minor_units ?? 0)

    return {
      ...totals,
      starting_cash_minor_units: startingCashMinorUnits,
      expected_cash_minor_units: expectedCashMinorUnits,
      ending_cash_minor_units: endingCashMinorUnits,
      variance_minor_units: varianceMinorUnits,
      movement_count: movements.length,
    }
  }

  function publicCashDrawerSession(session, { includeMovements = true } = {}) {
    if (!session) {
      return null
    }

    const summary = cashDrawerSessionSummary(session)
    const movements = includeMovements ? cashDrawerMovementsForSession(session.session_id) : []

    return {
      session_id: cleanPublicId(session.session_id),
      status: cleanCashDrawerSessionStatus(session.status),
      opened_at_utc: cleanIsoTimestamp(session.opened_at_utc),
      opened_by_user_id: cleanPublicId(session.opened_by_user_id),
      opened_by_user_name: cleanName(session.opened_by_user_name),
      starting_cash_minor_units: summary.starting_cash_minor_units,
      expected_cash_minor_units: summary.expected_cash_minor_units,
      ending_cash_minor_units: summary.ending_cash_minor_units,
      variance_minor_units: summary.variance_minor_units,
      cash_sales_minor_units: summary.cash_sales_minor_units,
      cash_trade_payout_minor_units: summary.cash_trade_payout_minor_units,
      cash_added_minor_units: summary.cash_added_minor_units,
      cash_removed_minor_units: summary.cash_removed_minor_units,
      movement_count: summary.movement_count,
      closed_at_utc: cleanIsoTimestamp(session.closed_at_utc),
      closed_by_user_id: cleanPublicId(session.closed_by_user_id),
      closed_by_user_name: cleanName(session.closed_by_user_name),
      notes: cleanOptionalReason(session.notes),
      report: parseJson(session.report_json, {}),
      movements: movements.map(publicCashDrawerMovement),
    }
  }

  function publicCashDrawerMovement(movement) {
    return {
      movement_id: cleanPublicId(movement.movement_id),
      session_id: cleanPublicId(movement.session_id),
      created_at_utc: cleanIsoTimestamp(movement.created_at_utc),
      created_by_user_id: cleanPublicId(movement.created_by_user_id),
      created_by_user_name: cleanName(movement.created_by_user_name),
      movement_type: cleanCashDrawerMovementType(movement.movement_type),
      amount_minor_units: Math.trunc(minorUnits(movement.amount_minor_units)),
      reference_type: cleanCashDrawerReferenceType(movement.reference_type),
      reference_id: cleanExternalId(movement.reference_id),
      reason: cleanOptionalReason(movement.reason),
      metadata: parseJson(movement.metadata_json, {}),
    }
  }

  function getCashDrawerSession(token) {
    const access = authorizeCashDrawer(token)

    if (access.status !== "ok") {
      return access
    }

    const active = activeCashDrawerSession()

    return {
      status: "ok",
      action: "cash_drawer_session_status",
      active_session: publicCashDrawerSession(active),
      recent_sessions: cashDrawerSessions.slice(0, 10).map((session) => publicCashDrawerSession(session, { includeMovements: false })),
      drawer_shift_authority: "local_sync_server_cash_ledger",
      square_cash_drawer_shifts_are_reporting_only: true,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function openCashDrawerSession(token, input = {}) {
    const access = authorizeCashDrawer(token)

    if (access.status !== "ok") {
      return access
    }

    const existing = activeCashDrawerSession()

    if (existing) {
      return blocked("cash_drawer_session_already_open", "Close the current cash drawer shift before opening another.", {
        active_session: publicCashDrawerSession(existing),
      })
    }

    const openedAtUtc = now().toISOString()
    const startingCashMinorUnits = Math.max(0, minorUnits(input.starting_cash_minor_units ?? input.startingCashMinorUnits))
    const session = {
      session_id: cleanPublicId(input.session_id ?? input.sessionId) || `cash-drawer-${openedAtUtc.replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`,
      opened_at_utc: openedAtUtc,
      opened_by_user_id: access.user_id,
      opened_by_user_name: access.user_name,
      starting_cash_minor_units: startingCashMinorUnits,
      ending_cash_minor_units: 0,
      variance_minor_units: 0,
      status: "open",
      closed_at_utc: "",
      closed_by_user_id: "",
      closed_by_user_name: "",
      notes: cleanOptionalReason(input.notes),
      report_json: "{}",
      row_version: 1,
      updated_at_utc: openedAtUtc,
    }

    cashDrawerSessions.unshift(session)
    saveCashDrawerSession(database, session)
    recordCashDrawerMovementInternal(session, {
      movementType: "opening_float",
      amountMinorUnits: startingCashMinorUnits,
      actorUserId: access.user_id,
      actorUserName: access.user_name,
      referenceType: "cash_drawer_session",
      referenceId: session.session_id,
      reason: cleanOptionalReason(input.notes) || "Starting cash drawer bank",
      metadata: { source: "cash_drawer_open" },
    })

    return {
      status: "ok",
      action: "cash_drawer_session_opened",
      active_session: publicCashDrawerSession(session),
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function addCashToDrawer(token, input = {}) {
    return adjustCashDrawerBankCash(token, input, "bank_cash_add")
  }

  function removeCashFromDrawer(token, input = {}) {
    return adjustCashDrawerBankCash(token, input, "bank_cash_remove")
  }

  function adjustCashDrawerBankCash(token, input, movementType) {
    const access = authorizeCashDrawer(token)

    if (access.status !== "ok") {
      return access
    }

    const active = activeCashDrawerSession()

    if (!active) {
      return blocked("cash_drawer_session_required", "Open a cash drawer shift before changing drawer cash.")
    }

    const amountMinorUnits = Math.max(0, minorUnits(input.amount_minor_units ?? input.amountMinorUnits))
    const reason = cleanOptionalReason(input.reason)

    if (amountMinorUnits <= 0 || reason.length < 3) {
      return blocked("cash_drawer_adjustment_required", "Enter a positive amount and a reason for the drawer adjustment.")
    }

    const signedAmount = movementType === "bank_cash_remove" ? -amountMinorUnits : amountMinorUnits
    const movement = recordCashDrawerMovementInternal(active, {
      movementType,
      amountMinorUnits: signedAmount,
      actorUserId: access.user_id,
      actorUserName: access.user_name,
      referenceType: cleanCashDrawerReferenceType(input.reference_type ?? input.referenceType) || "bank_cash",
      referenceId: cleanExternalId(input.reference_id ?? input.referenceId),
      reason,
      metadata: { source: movementType },
    })

    return {
      status: "ok",
      action: movementType === "bank_cash_remove" ? "cash_drawer_cash_removed" : "cash_drawer_cash_added",
      active_session: publicCashDrawerSession(active),
      movement: publicCashDrawerMovement(movement),
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function closeCashDrawerSession(token, input = {}) {
    const access = authorizeCashDrawer(token)

    if (access.status !== "ok") {
      return access
    }

    const active = activeCashDrawerSession()

    if (!active) {
      return blocked("cash_drawer_session_required", "Open a cash drawer shift before closing the day.")
    }

    const endingCashMinorUnits = Math.max(0, minorUnits(input.ending_cash_minor_units ?? input.endingCashMinorUnits))
    const closedAtUtc = now().toISOString()
    const summaryBeforeClose = cashDrawerSessionSummary(active)
    const varianceMinorUnits = endingCashMinorUnits - summaryBeforeClose.expected_cash_minor_units

    active.status = "closed"
    active.ending_cash_minor_units = endingCashMinorUnits
    active.variance_minor_units = varianceMinorUnits
    active.closed_at_utc = closedAtUtc
    active.closed_by_user_id = access.user_id
    active.closed_by_user_name = access.user_name
    active.notes = cleanOptionalReason(input.notes ?? active.notes)
    active.row_version = Math.max(1, Number(active.row_version) || 1) + 1
    active.updated_at_utc = closedAtUtc
    active.report_json = JSON.stringify({
      closed_at_utc: closedAtUtc,
      closed_by_user_id: access.user_id,
      closed_by_user_name: access.user_name,
      starting_cash_minor_units: summaryBeforeClose.starting_cash_minor_units,
      expected_cash_minor_units: summaryBeforeClose.expected_cash_minor_units,
      ending_cash_minor_units: endingCashMinorUnits,
      variance_minor_units: varianceMinorUnits,
      cash_sales_minor_units: summaryBeforeClose.cash_sales_minor_units,
      cash_trade_payout_minor_units: summaryBeforeClose.cash_trade_payout_minor_units,
      cash_added_minor_units: summaryBeforeClose.cash_added_minor_units,
      cash_removed_minor_units: summaryBeforeClose.cash_removed_minor_units,
      movement_count: summaryBeforeClose.movement_count,
      notes: active.notes,
    })

    saveCashDrawerSession(database, active)
    recordCashDrawerMovementInternal(active, {
      movementType: "closing_count",
      amountMinorUnits: endingCashMinorUnits,
      actorUserId: access.user_id,
      actorUserName: access.user_name,
      referenceType: "cash_drawer_session",
      referenceId: active.session_id,
      reason: cleanOptionalReason(input.notes) || "End-of-day drawer count",
      metadata: {
        expected_cash_minor_units: summaryBeforeClose.expected_cash_minor_units,
        variance_minor_units: varianceMinorUnits,
      },
    })
    saveCashDrawerSession(database, active)

    return {
      status: "ok",
      action: "cash_drawer_session_closed",
      closed_session: publicCashDrawerSession(active),
      printable_report_ready: true,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function checkCashDrawerPayout(token, input = {}) {
    const access = authorizeCashDrawer(token)

    if (access.status !== "ok") {
      return access
    }

    const amountMinorUnits = Math.max(0, minorUnits(input.amount_minor_units ?? input.amountMinorUnits))
    const warning = cashDrawerPayoutWarning(amountMinorUnits)

    return {
      status: "ok",
      action: "cash_drawer_payout_check",
      amount_minor_units: amountMinorUnits,
      can_pay_out: !warning,
      warning,
      active_session: publicCashDrawerSession(activeCashDrawerSession(), { includeMovements: false }),
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function cashDrawerPayoutWarning(amountMinorUnits) {
    const safeAmount = Math.max(0, minorUnits(amountMinorUnits))

    if (safeAmount <= 0) {
      return null
    }

    const active = activeCashDrawerSession()

    if (!active) {
      return {
        code: "cash_drawer_session_required",
        message: "Open a cash drawer shift before paying cash out for a trade-in.",
        amount_minor_units: safeAmount,
        expected_cash_minor_units: 0,
      }
    }

    const expectedCashMinorUnits = cashDrawerSessionSummary(active).expected_cash_minor_units

    if (safeAmount > expectedCashMinorUnits) {
      return {
        code: "cash_payout_exceeds_drawer_cash",
        message: `This trade needs ${formatMoney(safeAmount, "USD")} cash but the open drawer expects ${formatMoney(expectedCashMinorUnits, "USD")}.`,
        amount_minor_units: safeAmount,
        expected_cash_minor_units: expectedCashMinorUnits,
      }
    }

    return null
  }

  function cashDrawerWarningForTradeOrder(order) {
    return cashDrawerPayoutWarning(tradeInTotalMinorUnits(order.items, "cash"))
  }

  function recordCashDrawerMovementInternal(session, {
    movementType,
    amountMinorUnits,
    actorUserId,
    actorUserName,
    referenceType,
    referenceId,
    reason,
    metadata = {},
    idempotencyKey = "",
  }) {
    const movement_type = cleanCashDrawerMovementType(movementType)
    const cleanReferenceType = cleanCashDrawerReferenceType(referenceType)
    const cleanReferenceId = cleanExternalId(referenceId)
    const dedupeKey = cleanExternalId(idempotencyKey)
    const shouldDedupe = Boolean(cleanReferenceId || dedupeKey)
    const existing = shouldDedupe
      ? cashDrawerMovements.find((movement) =>
        cleanPublicId(movement.session_id) === cleanPublicId(session.session_id) &&
        movement.movement_type === movement_type &&
        cleanCashDrawerReferenceType(movement.reference_type) === cleanReferenceType &&
        cleanExternalId(movement.reference_id) === cleanReferenceId &&
        (!dedupeKey || cleanExternalId(parseJson(movement.metadata_json, {}).idempotency_key) === dedupeKey)
      )
      : null

    if (existing) {
      return existing
    }

    const createdAtUtc = now().toISOString()
    const movement = {
      movement_id: `cash-movement-${createdAtUtc.replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`,
      session_id: cleanPublicId(session.session_id),
      created_at_utc: createdAtUtc,
      created_by_user_id: cleanPublicId(actorUserId),
      created_by_user_name: cleanName(actorUserName) || userNameById(actorUserId, users),
      movement_type,
      amount_minor_units: Math.trunc(minorUnits(amountMinorUnits)),
      reference_type: cleanReferenceType,
      reference_id: cleanReferenceId,
      reason: cleanOptionalReason(reason),
      metadata_json: JSON.stringify({
        ...metadata,
        idempotency_key: dedupeKey,
      }),
    }

    cashDrawerMovements.unshift(movement)
    saveCashDrawerMovement(database, movement)
    const summary = cashDrawerSessionSummary(session)
    session.updated_at_utc = createdAtUtc
    session.row_version = Math.max(1, Number(session.row_version) || 1) + 1
    session.ending_cash_minor_units = cleanCashDrawerSessionStatus(session.status) === "closed"
      ? summary.ending_cash_minor_units
      : 0
    session.variance_minor_units = cleanCashDrawerSessionStatus(session.status) === "closed"
      ? summary.variance_minor_units
      : 0
    saveCashDrawerSession(database, session)

    return movement
  }

  function recordCheckoutCashDrawerMovement(transaction, actorUser) {
    const netCashMinorUnits =
      Math.max(0, minorUnits(transaction.cash_paid_minor_units)) -
      Math.max(0, minorUnits(transaction.change_due_minor_units))

    if (netCashMinorUnits <= 0) {
      return null
    }

    const active = activeCashDrawerSession()

    if (!active) {
      return {
        warning: {
          code: "cash_drawer_session_required",
          message: "Cash sale was saved, but no cash drawer shift is open for closeout reporting.",
          amount_minor_units: netCashMinorUnits,
          expected_cash_minor_units: 0,
        },
      }
    }

    const movement = recordCashDrawerMovementInternal(active, {
      movementType: "cash_sale",
      amountMinorUnits: netCashMinorUnits,
      actorUserId: actorUser.id,
      actorUserName: actorUser.name,
      referenceType: "checkout_transaction",
      referenceId: transaction.transaction_id,
      reason: `Cash retained from checkout ${transaction.square_receipt_reference}`,
      metadata: {
        transaction_id: transaction.transaction_id,
        cash_paid_minor_units: transaction.cash_paid_minor_units,
        change_due_minor_units: transaction.change_due_minor_units,
      },
      idempotencyKey: transaction.transaction_id,
    })

    return {
      movement: publicCashDrawerMovement(movement),
      active_session: publicCashDrawerSession(active, { includeMovements: false }),
    }
  }

  function recordTradeInCashDrawerMovement(order, actorUser) {
    const cashTotalMinorUnits = tradeInTotalMinorUnits(order.items, "cash")

    if (cashTotalMinorUnits <= 0) {
      return null
    }

    const warning = cashDrawerPayoutWarning(cashTotalMinorUnits)
    const active = activeCashDrawerSession()

    if (!active) {
      return { warning }
    }

    const movement = recordCashDrawerMovementInternal(active, {
      movementType: "cash_trade_payout",
      amountMinorUnits: -cashTotalMinorUnits,
      actorUserId: actorUser.id,
      actorUserName: actorUser.name,
      referenceType: "trade_in_order",
      referenceId: order.order_id,
      reason: `Cash payout for trade-in ${order.order_id}`,
      metadata: {
        order_id: order.order_id,
        customer_public_id: order.customer_public_id,
        customer_name: order.customer_name,
        item_count: cleanTradeInItems(order.items).reduce((total, item) => total + item.quantity, 0),
      },
      idempotencyKey: order.order_id,
    })

    return {
      movement: publicCashDrawerMovement(movement),
      active_session: publicCashDrawerSession(active, { includeMovements: false }),
      warning,
    }
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

  function getSetupConfig() {
    return publicSetupConfig(setupConfig)
  }

  function updateSetupConfig(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const nextConfig = cleanSetupConfig({
      storeId: input.storeId ?? input.store_id ?? setupConfig.storeId,
      serverUrl: input.serverUrl ?? input.server_url ?? setupConfig.serverUrl,
      websiteUrl: input.websiteUrl ?? input.website_url ?? setupConfig.websiteUrl,
      restBasePath: input.restBasePath ?? input.rest_base_path ?? setupConfig.restBasePath,
      localDatabase: input.localDatabase ?? input.local_database ?? setupConfig.localDatabase,
      configuredAtUtc: now().toISOString(),
      configSource: "manager_app_settings",
      wordpressConnectorRestartRequired: true,
      creditApprovalThresholdMinorUnits:
        input.creditApprovalThresholdMinorUnits ??
        input.credit_approval_threshold_minor_units ??
        setupConfig.creditApprovalThresholdMinorUnits,
    })

    if (!nextConfig.websiteUrl) {
      return blocked("website_url_required", "Enter a valid http(s) WordPress website URL before saving setup.")
    }

    Object.assign(setupConfig, nextConfig)
    saveSetupConfig(database, setupConfig)

    return {
      status: "ok",
      action: "local_sync_server_setup_config_saved",
      config: publicSetupConfig(setupConfig),
      wordpress_connector_restart_required: setupConfig.wordpressConnectorRestartRequired,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
      raw_credentials_accepted: false,
    }
  }

  function publicFulfillmentNotificationSettings() {
    return cleanFulfillmentNotificationSettings(fulfillmentNotifications)
  }

  function addUser(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const name = cleanName(input.name)
    const pin = String(input.pin ?? "")
    const role = cleanRole(input.role)
    const access = ["manager", "owner"].includes(role) ? [...ACCESS_SECTIONS] : cleanAccess(input.access)

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
    return updateUserProfile(token, userId, input)
  }

  function updateUserProfile(token, userId, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const user = users.find((candidate) => candidate.id === userId)

    if (!user) {
      return blocked("user_not_found", "No cached user policy matched that user ID.")
    }

    const name = cleanName(input.name ?? user.name)
    const role = cleanRole(input.role ?? user.role)
    const pin = String(input.pin ?? input.new_pin ?? input.newPin ?? "").trim()
    const managerCount = users.filter((candidate) => ["manager", "owner"].includes(candidate.role)).length

    if (["manager", "owner"].includes(user.role) && role === "staff" && managerCount <= 1) {
      return blocked("last_manager", "At least one manager PIN must remain active.")
    }

    if (!name) {
      return blocked("invalid_user_name", "A user name is required before saving this PIN profile.")
    }

    if (pin && !/^\d{4}$/.test(pin)) {
      return blocked("invalid_pin", "PIN changes must use exactly 4 digits.")
    }

    if (pin && users.some((candidate) => candidate.id !== user.id && verifyPin(pin, candidate))) {
      return blocked("duplicate_pin", "PIN already exists in the cached access policy.")
    }

    user.name = name
    user.role = role
    user.access = ["manager", "owner"].includes(role) ? [...ACCESS_SECTIONS] : cleanAccess(input.access ?? user.access)

    if (user.access.length === 0) {
      return blocked("access_required", "Staff users need access to at least one workspace.")
    }

    if (pin) {
      user.pinSalt = `salt-${randomUUID()}`
      user.pinHash = hashPin(pin, user.pinSalt)
    }

    saveUser(database, user, now)
    appendQueueOperation(
      database,
      queue,
      "user_access_upsert",
      user.id,
      { name: user.name, role: user.role, access: user.access, pin_changed: Boolean(pin) },
      now,
      {
        syncStatus: "local_only",
      },
    )

    return {
      status: "ok",
      user: publicUser(user),
      pin_changed: Boolean(pin),
      raw_pin_returned: false,
      pin_hash_returned: false,
    }
  }

  function removeUser(token, userId) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const index = users.findIndex((candidate) => candidate.id === userId)

    if (index < 0) {
      return blocked("user_not_found", "No cached user policy matched that user ID.")
    }

    const user = users[index]

    if (user.id === manager.user.id) {
      return blocked("cannot_remove_current_user", "Sign in as another manager before removing this PIN profile.")
    }

    const managerCount = users.filter((candidate) => ["manager", "owner"].includes(candidate.role)).length

    if (["manager", "owner"].includes(user.role) && managerCount <= 1) {
      return blocked("last_manager", "At least one manager PIN must remain active.")
    }

    users.splice(index, 1)
    for (const [sessionToken, session] of sessions.entries()) {
      if (session.userId === user.id) {
        sessions.delete(sessionToken)
      }
    }
    deleteUser(database, user.id)
    appendQueueOperation(
      database,
      queue,
      "user_access_remove",
      user.id,
      { name: user.name, role: user.role, removed_at_utc: now().toISOString() },
      now,
      {
        syncStatus: "local_only",
      },
    )

    return {
      status: "ok",
      removed_user_id: user.id,
      users: users.map(publicUser),
      raw_pin_returned: false,
      pin_hash_returned: false,
    }
  }

  function searchInventory({ query = "" } = {}) {
    cleanupExpiredLocalHolds()
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
        item.provider_variant_id,
        item.reference_variant_id,
        item.variant,
        item.finish,
        item.location,
      ].some((value) => String(value).toLowerCase().includes(needle))
    })

    return {
      status: "ok",
      items: items.map(publicInventoryItem),
      local_cache_source: "local_sync_server",
    }
  }

  function listInventoryLocations(token) {
    const session = requireWorkspaceAccess(token, "Inventory")

    if (session.status !== "ok") {
      return session
    }

    return {
      status: "ok",
      locations: [...inventoryLocations],
      location_count: inventoryLocations.length,
      source: "local_sync_server",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function addInventoryLocation(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Inventory")

    if (session.status !== "ok") {
      return session
    }

    const location = cleanInventoryLocation(input.location ?? input.name ?? input.label)

    if (!location) {
      return blocked("inventory_location_required", "Enter a location name before saving it.")
    }

    mergeInventoryLocation(database, inventoryLocations, location, now)

    return {
      status: "ok",
      location,
      locations: [...inventoryLocations],
      location_count: inventoryLocations.length,
      source: "local_sync_server",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function squareTerminalStatus() {
    if (squareTerminalConnector && typeof squareTerminalConnector.status === "function") {
      return squareTerminalConnector.status()
    }

    return {
      status: "ok",
      action: "square_terminal_status",
      environment: squareEnvironment,
      configured: false,
      token_configured: false,
      location_configured: squareLocationId !== "" && squareLocationId !== "LOCAL-SQUARE-POS",
      terminal_device_configured: false,
      can_create_device_code: false,
      can_create_terminal_checkout: false,
      payment_capture_supported: false,
      device_pairing_required: false,
      checkout_endpoint: "/v2/terminals/checkouts",
      device_code_endpoint: "/v2/devices/codes",
      payment_endpoint: "/v2/payments/{payment_id}",
      square_payment_authority: "square_terminal_api",
      pug_credit_balance_authority: "wordpress_customer_credit_ledger",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function getSquareTerminalStatus(token) {
    const session = requireWorkspaceAccess(token, "Customers")

    if (session.status !== "ok") {
      return session
    }

    return squareTerminalStatus()
  }

  async function createSquareTerminalDeviceCode(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    if (!squareTerminalConnector || typeof squareTerminalConnector.createDeviceCode !== "function") {
      return blocked(
        "square_terminal_not_configured",
        "Set PUG_SQUARE_ACCESS_TOKEN and PUG_SQUARE_LOCATION_ID on the LAN server before activating a Square reader.",
        { square_terminal: squareTerminalStatus() },
      )
    }

    return squareTerminalConnector.createDeviceCode(input)
  }

  async function createSquareTerminalCheckout(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Customers")

    if (session.status !== "ok") {
      return session
    }

    if (!squareTerminalConnector || typeof squareTerminalConnector.createCheckout !== "function") {
      return blocked(
        "square_terminal_not_configured",
        "Set PUG_SQUARE_ACCESS_TOKEN, PUG_SQUARE_LOCATION_ID, and PUG_SQUARE_TERMINAL_DEVICE_ID on the LAN server before sending checkout to the Square reader.",
        { square_terminal: squareTerminalStatus() },
      )
    }

    const checkoutResult = await squareTerminalConnector.createCheckout({
      amount_minor_units: input.amount_minor_units ?? input.amountMinorUnits,
      currency: input.currency,
      reference_id:
        input.reference_id ??
        input.referenceId ??
        input.square_receipt_reference ??
        input.squareReceiptReference ??
        input.order_id ??
        input.orderId,
      note: input.note,
      idempotency_key: input.idempotency_key ?? input.idempotencyKey,
    })

    if (checkoutResult.status !== "ok") {
      return checkoutResult
    }

    return {
      ...checkoutResult,
      requested_by_user_id: session.user.id,
      requested_by_user_name: session.user.name,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function retrieveSquareTerminalReceipt(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Checkout")

    if (session.status !== "ok") {
      return session
    }

    if (!squareTerminalConnector || typeof squareTerminalConnector.retrieveCheckoutReceipt !== "function") {
      return blocked(
        "square_terminal_receipt_lookup_not_configured",
        "Set PUG_SQUARE_ACCESS_TOKEN and PUG_SQUARE_LOCATION_ID on the LAN server before retrieving Square receipts.",
        { square_terminal: squareTerminalStatus() },
      )
    }

    const receiptResult = await squareTerminalConnector.retrieveCheckoutReceipt(input)

    if (receiptResult.status !== "ok") {
      return receiptResult
    }

    return {
      ...receiptResult,
      requested_by_user_id: session.user.id,
      requested_by_user_name: session.user.name,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function planSquarePosInventoryPull(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const generatedAtUtc = now().toISOString()
    const updatedAfterUtc = cleanIsoTimestamp(input.updated_after)
    const plannerRows = inventoryItems.map(squareInventoryRowForPlanner)
    const plan = planSquareBarcodeSkuInventoryPull(
      plannerRows,
      {
        environment: cleanSquareEnvironment(input.environment) || squareEnvironment,
        credentialEnvironment: "sandbox",
        squareLocationId: cleanExternalId(input.square_location_id) || squareLocationId,
        updatedAfter: updatedAfterUtc,
        limit: boundedInt(input.limit, 1, 1000, 1000),
      },
    )
    const barcodeMappings = Array.isArray(plan.details?.barcodeMappings)
      ? plan.details.barcodeMappings
      : []
    const unresolvedMappings = Array.isArray(plan.details?.unresolvedMappings)
      ? plan.details.unresolvedMappings
      : []
    const squarePullFeed = squarePosPullFeedRows(inventoryItems, barcodeMappings)
    const reviewItems = squarePosReviewItems(inventoryItems, unresolvedMappings)
    const mappingSummary = squarePosMappingSummary(inventoryItems, squarePullFeed, reviewItems)

    return {
      status: "ok",
      action: "square_pos_inventory_pull_plan",
      planner_status: plan.status,
      code: plan.code,
      ready: plan.status === "ready",
      requires_manager_review: plan.status === "conflict",
      mapped_count: barcodeMappings.length,
      unresolved_count: unresolvedMappings.length,
      mapping_summary: mappingSummary,
      square_pull_feed: squarePullFeed,
      review_items: reviewItems,
      next_actions: squarePosNextActions(plan.status, reviewItems, squarePullFeed),
      generated_at_utc: generatedAtUtc,
      updated_after_utc: updatedAfterUtc,
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

  function reconcileSquarePosInventoryCounts(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const generatedAtUtc = now().toISOString()
    const plannerRows = inventoryItems.map(squareInventoryRowForPlanner)
    const reconciliation = planSquareInventoryCountReconciliation(
      plannerRows,
      squareCountsPayloadFromInput(input),
      {
        environment: cleanSquareEnvironment(input.environment) || squareEnvironment,
        credentialEnvironment: "sandbox",
        squareLocationId: cleanExternalId(input.square_location_id) || squareLocationId,
        updatedAfter: cleanIsoTimestamp(input.updated_after),
        limit: boundedInt(input.limit, 1, 1000, 1000),
      },
    )
    const comparisonRows = squarePosCountComparisonRows(inventoryItems, reconciliation.details?.comparisons ?? [])
    const unexpectedCounts = Array.isArray(reconciliation.details?.unexpectedSquareCounts)
      ? reconciliation.details.unexpectedSquareCounts
      : []
    const summary = reconciliation.details?.summary ?? {
      expected_rows_count: 0,
      compared_count: 0,
      matched_count: 0,
      mismatched_count: 0,
      missing_square_count: 0,
      unexpected_square_count: 0,
      unresolved_mapping_count: 0,
      expected_total_quantity: "0",
      actual_total_quantity: "0",
    }

    return {
      status: "ok",
      action: "square_pos_inventory_count_reconciliation",
      reconciliation_status: reconciliation.status,
      code: reconciliation.code,
      ready: reconciliation.status === "accepted",
      requires_manager_review: reconciliation.status === "conflict",
      summary,
      comparisons: comparisonRows,
      unexpected_square_counts: unexpectedCounts,
      unresolved_mappings: reconciliation.details?.unresolvedMappings ?? [],
      generated_at_utc: generatedAtUtc,
      source_of_truth: "tcg_store_platform",
      square_counts_used_for: "pos_reconciliation_and_exception_detection",
      provider_inventory_write_deferred: true,
      square_payment_capture_supported: false,
      plugin_square_payment_capture_supported: false,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
      next_actions: squarePosCountReconciliationNextActions(reconciliation.status, comparisonRows, unexpectedCounts),
    }
  }

  async function reconcileSquareProviderInventoryCounts(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    return reconcileSquareProviderInventoryCountsInternal({
      actorId: manager.user.id,
      actorName: manager.user.name,
      source: cleanName(input.source) || "manager_manual_reconciliation",
      input,
    })
  }

  async function reconcileSquareProviderInventoryCountsForSystem(input = {}) {
    return reconcileSquareProviderInventoryCountsInternal({
      actorId: "square-inventory-poll",
      actorName: "Square Inventory Poll",
      source: cleanName(input.source) || "background_poll",
      input,
    })
  }

  async function reconcileSquareProviderInventoryCountsInternal({ actorId, actorName, source, input = {} }) {
    cleanupExpiredLocalHolds()

    const generatedAtUtc = now().toISOString()
    const locationId = cleanExternalId(input.square_location_id ?? input.squareLocationId) || squareLocationId
    const applyCountDeltas = Boolean(input.apply_count_deltas === true || input.applyCountDeltas === true)
    const activeGroups = squareInventoryReconciliationGroups(inventoryItems)
    const variationIds = [...activeGroups.keys()]

    if (variationIds.length === 0) {
      lastSquareInventoryReconciliationResult = {
        status: "ok",
        code: "square_inventory_reconciliation_no_mapped_inventory",
        generated_at_utc: generatedAtUtc,
        sold_count: 0,
        checked_variation_count: 0,
      }

      return {
        status: "ok",
        action: "square_provider_inventory_count_reconciliation",
        code: "square_inventory_reconciliation_no_mapped_inventory",
        message: "No POS-visible local inventory has Square variation mappings yet.",
        generated_at_utc: generatedAtUtc,
        checked_variation_count: 0,
        sold_count: 0,
        apply_count_deltas: applyCountDeltas,
        wordpress_auto_sync_performed: false,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    const inputCountsPayload = squareCountsPayloadFromInput(input)
    const hasInputCounts = squareCountsPayloadHasCounts(inputCountsPayload)
    let countsPayload = inputCountsPayload
    let pullResult = null

    if (!hasInputCounts) {
      if (!squareInventoryCountsPuller || typeof squareInventoryCountsPuller.pullCounts !== "function") {
        const result = {
          status: "blocked",
          code: "square_inventory_counts_puller_unavailable",
          message: "Square count polling is not configured on this LAN server.",
          generated_at_utc: generatedAtUtc,
          checked_variation_count: variationIds.length,
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
        lastSquareInventoryReconciliationResult = result
        return result
      }

      pullResult = await squareInventoryCountsPuller.pullCounts({
        catalogObjectIds: variationIds,
        locationId,
        updatedAfter: cleanIsoTimestamp(input.updated_after ?? input.updatedAfter),
      })

      if (pullResult.status !== "ok") {
        const result = {
          status: "blocked",
          action: "square_provider_inventory_count_reconciliation",
          code: pullResult.code || "square_inventory_counts_pull_failed",
          message: pullResult.message || "Square inventory counts could not be pulled.",
          generated_at_utc: generatedAtUtc,
          pull_status: pullResult.status,
          http_status: pullResult.http_status ?? 0,
          errors: Array.isArray(pullResult.errors) ? pullResult.errors : [],
          checked_variation_count: variationIds.length,
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
        lastSquareInventoryReconciliationResult = result
        return result
      }

      countsPayload = { counts: pullResult.counts }
    }

    const countsByVariation = squareInventoryQuantityByVariation(countsPayload, locationId)
    const comparisons = []
    const operations = []
    const soldItems = []
    let shortageCount = 0
    let overageCount = 0

    for (const [variationId, items] of activeGroups.entries()) {
      const actualQuantity = countsByVariation.has(variationId) ? countsByVariation.get(variationId) : 0
      const expectedQuantity = items.reduce((total, item) => total + inventoryQuantityOnHand(item), 0)
      const delta = actualQuantity - expectedQuantity
      const soldQuantity = delta < 0 ? Math.min(expectedQuantity, Math.abs(delta)) : 0
      const candidates = [...items].sort(squareInventorySaleCandidateSort)

      if (soldQuantity > 0) {
        shortageCount += soldQuantity
      }

      if (delta > 0) {
        overageCount += delta
      }

      let remainingSoldQuantity = applyCountDeltas ? soldQuantity : 0

      for (const item of candidates) {
        if (remainingSoldQuantity <= 0) {
          break
        }

        const previousQuantityOnHand = inventoryQuantityOnHand(item)
        const appliedSoldQuantity = Math.min(previousQuantityOnHand, remainingSoldQuantity)

        if (appliedSoldQuantity <= 0) {
          continue
        }

        item.quantity_on_hand = previousQuantityOnHand - appliedSoldQuantity
        item.status = item.quantity_on_hand > 0 ? "available" : "sold"
        item.source = "queued"
        item.external_sync_state = "pending"
        item.updated_by_user_id = actorId
        item.updated_by_user_name = actorName
        item.row_version += 1
        saveInventoryItem(database, item, now)
        soldItems.push(item)
        remainingSoldQuantity -= appliedSoldQuantity

        const operation = appendQueueOperation(database, queue, "inventory_update", item.public_id, {
          inventory_public_id: cleanPublicId(item.wordpress_public_id) || item.public_id,
          local_inventory_public_id: item.public_id,
          barcode: item.barcode,
          status: item.status,
          location: item.location,
          price_minor_units: item.price_minor_units,
          sale_price_minor_units: item.price_minor_units,
          minimum_sale_price_minor_units: item.minimum_sale_price_minor_units,
          previous_quantity_on_hand: previousQuantityOnHand,
          quantity_on_hand: item.quantity_on_hand,
          quantity_delta: item.quantity_on_hand - previousQuantityOnHand,
          quantity_update_mode: "absolute",
          sale_total_minor_units: 0,
          actor_id: actorId,
          actor_name: actorName,
          sold_at_utc: generatedAtUtc,
          sync_intent: "square_inventory_count_reconciliation_quantity_update",
          source,
          square_catalog_variation_id: variationId,
          square_location_id: locationId,
          square_actual_quantity: actualQuantity,
          local_expected_quantity_before: expectedQuantity,
          square_quantity_sold: appliedSoldQuantity,
          reason: "Square POS inventory count changed",
          wordpress_acceptance_required: true,
        }, now)
        operations.push(operation)
      }

      comparisons.push({
        square_catalog_variation_id: variationId,
        local_expected_quantity_before: expectedQuantity,
        square_actual_quantity: actualQuantity,
        sold_quantity: soldQuantity,
        delta,
        status:
          delta === 0
            ? "matched"
            : delta < 0
              ? applyCountDeltas
                ? "square_sale_delta_applied"
                : "square_shortage_read_only"
              : "square_has_extra_quantity",
        items: items.map((item) => ({
          public_id: item.public_id,
          wordpress_public_id: item.wordpress_public_id,
          barcode: item.barcode,
          card_name: item.card_name,
          status: item.status,
          quantity_on_hand: inventoryQuantityOnHand(item),
          source: item.source,
          external_sync_state: item.external_sync_state,
          updated_by_user_id: item.updated_by_user_id,
          updated_by_user_name: item.updated_by_user_name,
          updated_at_utc: item.updated_at_utc,
          diagnostic_origin: inventoryMismatchDiagnosticOrigin(item),
          diagnostic_resolution_hint: inventoryMismatchResolutionHint(item),
        })),
      })
    }

    const autoSyncResults = []

    if (wordpressInventoryUpdatePush) {
      for (const operation of operations) {
        autoSyncResults.push(await pushInventoryUpdateOperation(operation))
      }
    }

    const result = {
      status: "ok",
      action: "square_provider_inventory_count_reconciliation",
      code: applyCountDeltas ? "square_inventory_counts_reconciled" : "square_inventory_counts_compared_read_only",
      generated_at_utc: generatedAtUtc,
      source,
      location_id: locationId,
      apply_count_deltas: applyCountDeltas,
      checked_variation_count: variationIds.length,
      comparison_count: comparisons.length,
      sold_count: applyCountDeltas ? soldItems.length : 0,
      would_apply_sold_count: applyCountDeltas ? 0 : shortageCount,
      shortage_count: shortageCount,
      overage_count: overageCount,
      comparisons,
      sold_items: soldItems.map(publicInventoryItem),
      square_pull_performed: Boolean(pullResult),
      square_pull_count: Number(pullResult?.count_count ?? 0),
      square_pull_request_count: Number(pullResult?.request_count ?? 0),
      square_pull_page_count: Number(pullResult?.page_count ?? 0),
      square_pull_chunk_count: Number(pullResult?.chunk_count ?? 0),
      square_pull_chunk_size: Number(pullResult?.chunk_size ?? 0),
      square_pull_cursor_exhausted: Boolean(pullResult?.cursor_exhausted ?? true),
      square_pull_max_page_guard_hit: Boolean(pullResult?.max_page_guard_hit),
      wordpress_acceptance_required: applyCountDeltas && soldItems.length > 0,
      wordpress_auto_sync_performed: autoSyncResults.length > 0,
      wordpress_accepted_count: autoSyncResults.filter((item) => item.status === "accepted").length,
      wordpress_retry_count: autoSyncResults.filter((item) => item.status === "retry").length,
      auto_sync_results: autoSyncResults,
      local_queue_depth: pendingQueueOperations(queue).length,
      source_of_truth: "local_sync_server",
      square_counts_used_for: applyCountDeltas ? "manual_admin_delta_correction" : "read_only_mismatch_detection",
      square_payment_capture_supported: false,
      payment_capture_authority: "official_woocommerce_square_extension",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
    lastSquareInventoryReconciliationResult = {
      status: result.status,
      code: result.code,
      generated_at_utc: result.generated_at_utc,
      sold_count: result.sold_count,
      would_apply_sold_count: result.would_apply_sold_count,
      shortage_count: result.shortage_count,
      apply_count_deltas: result.apply_count_deltas,
      checked_variation_count: result.checked_variation_count,
      wordpress_accepted_count: result.wordpress_accepted_count,
      wordpress_retry_count: result.wordpress_retry_count,
      square_pull_performed: result.square_pull_performed,
      square_pull_count: result.square_pull_count,
      square_pull_request_count: result.square_pull_request_count,
      square_pull_page_count: result.square_pull_page_count,
      square_pull_chunk_count: result.square_pull_chunk_count,
      square_pull_chunk_size: result.square_pull_chunk_size,
      square_pull_cursor_exhausted: result.square_pull_cursor_exhausted,
      square_pull_max_page_guard_hit: result.square_pull_max_page_guard_hit,
      local_queue_depth: result.local_queue_depth,
    }

    return result
  }

  async function pullSquareSalesReport(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    return pullSquareSalesReportSnapshot({
      actorId: manager.user.id,
      actorName: manager.user.name,
      input,
    })
  }

  async function pullSquareSalesReportSnapshot({ actorId, actorName, input = {} }) {
    const generatedAtUtc = now().toISOString()

    if (!squareSalesReportsPuller || typeof squareSalesReportsPuller.pullSalesReport !== "function") {
      return blocked(
        "square_sales_report_puller_unavailable",
        "Square sales report polling is not configured on this LAN server.",
        {
          action: "square_sales_report_pull",
          generated_at_utc: generatedAtUtc,
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        },
      )
    }

    const pullResult = await squareSalesReportsPuller.pullSalesReport({
      date_from: input.date_from ?? input.dateFrom,
      date_to: input.date_to ?? input.dateTo,
      locationId: input.square_location_id ?? input.squareLocationId ?? squareLocationId,
    })

    if (pullResult.status !== "ok") {
      return {
        status: "blocked",
        action: "square_sales_report_pull",
        code: pullResult.code || "square_sales_report_pull_failed",
        message: pullResult.message || "Square sales report could not be pulled.",
        generated_at_utc: generatedAtUtc,
        http_status: pullResult.http_status ?? 0,
        errors: Array.isArray(pullResult.errors) ? pullResult.errors : [],
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    const snapshot = buildSquareSalesReportSnapshot(pullResult, {
      actorId,
      actorName,
      inventoryItems,
      queue,
      kioskOrders,
      checkoutTransactions,
      now,
    })
    saveSquareSalesReportSnapshot(database, snapshot)
    squareSalesReportSnapshots = [
      snapshot,
      ...squareSalesReportSnapshots.filter((candidate) => candidate.snapshot_id !== snapshot.snapshot_id),
    ].slice(0, 10)

    return {
      status: "ok",
      action: "square_sales_report_snapshot_saved",
      code: "square_sales_report_snapshot_saved",
      ...publicSquareSalesReportSnapshot(snapshot),
      payment_capture_authority: "square_payments_api_read_only",
      customer_credit_authority: "local_store_credit_ledger_not_square",
      square_payment_capture_supported: false,
      inventory_mutated: false,
      fake_sales_created: false,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function fetchScryDexFallbackCards({
    needle,
    game = "",
    rawOrGraded = "",
    forceLive = false,
    limit = null,
    normalizedSetFilter = "",
  } = {}) {
    if (!websiteCatalogFallback) {
      return {
        cards: [],
        liveProviderRequestPerformed: false,
      }
    }

    const games = game ? [game] : supportedScryDexGames()
    const cards = []
    let liveProviderRequestPerformed = false

    for (const currentGame of games) {
      const fallbackResult = await websiteCatalogFallback({
        query: needle,
        game: currentGame,
        limit: limit ?? "all",
        rawOrGraded,
        forceLive,
      })
      liveProviderRequestPerformed =
        liveProviderRequestPerformed || fallbackResult?.live_provider_request_performed === true

      cards.push(
        ...normalizeReferenceCardsFromFallback(
          fallbackResult,
          currentGame,
          now,
          needle,
          normalizedSetFilter,
          limit,
        ),
      )
    }

    const mergedCards = mergeReferenceSearchResults([], cards, needle)

    return {
      cards: limit ? mergedCards.slice(0, limit) : mergedCards,
      liveProviderRequestPerformed,
    }
  }

  async function searchScryDexCards(
    token,
    { query = "", game = "", setFilter = "", limit = "all", rawOrGraded = "", forceLive = false } = {},
  ) {
    const session = requireWorkspaceAccess(token, "Inventory")

    if (session.status !== "ok") {
      return session
    }

    const needle = cleanScryDexQuery(query)
    const normalizedGame = cleanScryDexSearchGame(game)
    const forceLiveRefresh = forceLive === true
    const normalizedSetFilter = forceLiveRefresh ? "" : cleanScryDexSearchText(setFilter)
    const resultLimit = boundedScryDexSearchLimit(limit)
    const normalizedRawOrGraded = ["raw", "graded"].includes(String(rawOrGraded ?? "").toLowerCase())
      ? String(rawOrGraded).toLowerCase()
      : ""

    if (!needle) {
      return blocked("scrydex_query_required", "Enter a card name, set, or number before searching ScryDex.")
    }

    const cachedCards = searchReferenceCards(referenceCards, needle, normalizedGame, normalizedSetFilter, resultLimit)

    if (cachedCards.length > 0 && !forceLiveRefresh) {
      if (
        resultLimit === null &&
        !normalizedSetFilter &&
        websiteCatalogFallback &&
        (cachedCards.length >= 8 || normalizedRawOrGraded === "graded")
      ) {
        const fallback = await fetchScryDexFallbackCards({
          needle,
          game: normalizedGame,
          rawOrGraded: normalizedRawOrGraded,
          forceLive: false,
          limit: null,
          normalizedSetFilter,
        })
        const fallbackCards = fallback.cards

        for (const card of fallbackCards) {
          upsertReferenceCard(referenceCards, card)
          saveReferenceCard(database, card, now)
        }

        const mergedCards = mergeReferenceSearchResults(cachedCards, fallbackCards, needle)

        return {
          status: "ok",
          cards: mergedCards.map((card) => enrichScryDexCard(card, inventoryItems)),
          query: needle,
          game: normalizedGame,
          set_filter: normalizedSetFilter,
          result_limit: "all",
          source: fallbackCards.length > cachedCards.length
            ? `${referenceCacheSource(cachedCards)}+wordpress_proxy`
            : referenceCacheSource(cachedCards),
          lookup_order: ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"],
          local_reference_cache_hit: true,
          wordpress_proxy_performed: true,
          wordpress_proxy_required: false,
          credential_storage: "wordpress_server_settings",
          credentials_synced_to_client: false,
          live_provider_request_performed: fallback.liveProviderRequestPerformed,
        }
      }

      return {
        status: "ok",
        cards: cachedCards.map((card) => enrichScryDexCard(card, inventoryItems)),
        query: needle,
        game: normalizedGame,
        set_filter: normalizedSetFilter,
        result_limit: resultLimit ?? "all",
        source: referenceCacheSource(cachedCards),
        lookup_order: ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"],
        local_reference_cache_hit: true,
        wordpress_proxy_performed: false,
        wordpress_proxy_required: false,
        credential_storage: "wordpress_server_settings",
        credentials_synced_to_client: false,
        live_provider_request_performed: false,
      }
    }

    const fallback = await fetchScryDexFallbackCards({
      needle,
      game: normalizedGame,
      rawOrGraded: normalizedRawOrGraded,
      forceLive: forceLiveRefresh,
      limit: resultLimit,
      normalizedSetFilter,
    })
    const fallbackCards = fallback.cards

    for (const card of fallbackCards) {
      upsertReferenceCard(referenceCards, card)
      saveReferenceCard(database, card, now)
    }

    const mergedCards = cachedCards.length > 0
      ? mergeReferenceSearchResults(cachedCards, fallbackCards, needle)
      : fallbackCards
    const cards = mergedCards.map((card) => enrichScryDexCard(card, inventoryItems))

    return {
      status: "ok",
      cards,
      query: needle,
      game: normalizedGame,
      set_filter: normalizedSetFilter,
      result_limit: resultLimit ?? "all",
      source: fallbackCards.length > 0
        ? cachedCards.length > 0
          ? `${referenceCacheSource(cachedCards)}+wordpress_proxy`
          : "wordpress_proxy"
        : cachedCards.length > 0
          ? referenceCacheSource(cachedCards)
          : "local_reference_cache",
      lookup_order: ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"],
      local_reference_cache_hit: cachedCards.length > 0,
      wordpress_proxy_performed: Boolean(websiteCatalogFallback),
      wordpress_proxy_required: fallbackCards.length === 0,
      credential_storage: "wordpress_server_settings",
      credentials_synced_to_client: false,
      live_provider_request_performed: fallback.liveProviderRequestPerformed,
      force_live_refresh: forceLiveRefresh,
    }
  }

  async function indexScryDexCatalog(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Inventory")

    if (session.status !== "ok") {
      return session
    }

    const mode = cleanScryDexCatalogIndexMode(input.mode)
    const normalizedRawOrGraded = ["raw", "graded"].includes(String(input.rawOrGraded ?? input.raw_or_graded ?? "").toLowerCase())
      ? String(input.rawOrGraded ?? input.raw_or_graded).toLowerCase()
      : ""

    if (mode === "card") {
      const query = cleanScryDexQuery(input.query ?? input.card_name ?? input.cardName)

      if (!query) {
        return blocked("scrydex_card_query_required", "Enter the missing card name before searching every game.")
      }

      const games = supportedScryDexGames(input.games)
      if (games.length === 0) {
        return blocked("scrydex_supported_game_required", "No supported ScryDex game was selected for live card search.")
      }
      const results = []
      const blockedResults = []

      for (const game of games) {
        const result = await searchScryDexCards(token, {
          query,
          game,
          limit: "all",
          rawOrGraded: normalizedRawOrGraded,
          forceLive: true,
        })

        if (result.status === "ok") {
          results.push(...result.cards)
        } else {
          blockedResults.push({
            game,
            code: result.code ?? "scrydex_card_search_blocked",
            message: result.message ?? "ScryDex card search was blocked.",
          })
        }
      }

      const mergedCards = mergeReferenceSearchResults([], results, query)

      return {
        status: "ok",
        action: "scrydex_missing_card_live_search_completed",
        code: "scrydex_missing_card_live_search_completed",
        query,
        games,
        cards: mergedCards,
        imported_count: mergedCards.length,
        blocked_games: blockedResults,
        lookup_order: ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"],
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    const game = cleanGame(input.game)
    const setQuery = cleanScryDexSearchText(input.setQuery ?? input.set_query ?? input.query ?? input.expansionId ?? input.expansion_id)

    if (!setQuery) {
      return blocked("scrydex_set_query_required", "Enter a set name or code before indexing a missing set.")
    }

    const liveSearch = await searchScryDexCards(token, {
      query: setQuery,
      game,
      limit: "all",
      rawOrGraded: normalizedRawOrGraded,
      forceLive: true,
    })
    const liveCards = liveSearch.status === "ok" ? liveSearch.cards : []
    const resolvedExpansionId =
      cleanProviderResourceId(input.expansionId ?? input.expansion_id) || bestExpansionIdFromCards(liveCards, setQuery)

    if (!wordpressCatalogIndexer) {
      return {
        status: "ok",
        action: "scrydex_missing_set_live_search_completed",
        code: "scrydex_catalog_index_route_unavailable",
        message:
          "The LAN server can search and import matching ScryDex cards, but the WordPress catalog index route is not configured for full-set indexing.",
        game,
        set_query: setQuery,
        expansion_id: resolvedExpansionId,
        cards: liveCards,
        imported_count: liveCards.length,
        catalog_index_status: "unavailable",
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    if (!resolvedExpansionId) {
      return {
        status: "ok",
        action: "scrydex_missing_set_live_search_completed",
        code: "scrydex_set_expansion_not_resolved",
        message:
          "ScryDex returned matching card rows, but did not expose a set code/expansion id that can be used for whole-set indexing.",
        game,
        set_query: setQuery,
        cards: liveCards,
        imported_count: liveCards.length,
        catalog_index_status: "not_resolved",
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    const indexResult = await wordpressCatalogIndexer({
      game,
      expansionId: resolvedExpansionId,
      pageSize: input.pageSize ?? input.page_size ?? 100,
      maxPages: input.maxPages ?? input.max_pages ?? 10000,
      maxExpansionPages: input.maxExpansionPages ?? input.max_expansion_pages ?? 10000,
      indexExpansions: false,
      skipCards: false,
      executeDatabaseWrites: true,
      includeUsageSnapshot: false,
    })
    const localWrite = saveScryDexCatalogReferenceCards(indexResult, game)

    if (indexResult.status !== "ok") {
      return {
        status: "ok",
        action: "scrydex_missing_set_live_search_completed",
        code: "scrydex_set_live_search_completed_catalog_index_blocked",
        message: indexResult.message ?? "ScryDex set lookup worked, but full-set indexing was blocked.",
        game,
        set_query: setQuery,
        expansion_id: resolvedExpansionId,
        cards: liveCards,
        imported_count: liveCards.length,
        catalog_index_status: "blocked",
        catalog_index_error: indexResult,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    return {
      status: "ok",
      action: "scrydex_missing_set_index_completed",
      code: "scrydex_missing_set_index_completed",
      game,
      set_query: setQuery,
      expansion_id: resolvedExpansionId,
      cards: liveCards,
      imported_count: liveCards.length,
      catalog_index_status: "completed",
      catalog_index: indexResult,
      local_catalog_write: localWrite,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function pullLatestReferenceCatalogFromWordPress(input = {}) {
    if (!wordpressCatalogExportPull) {
      return {
        status: "skipped",
        code: "wordpress_catalog_export_pull_unavailable",
        message: "WordPress catalog export is not configured on this LAN server.",
        inserted_count: 0,
        updated_count: 0,
        ignored_count: 0,
        page_count: 0,
        row_count: 0,
      }
    }

    const pageSize = boundedInt(input.pageSize ?? input.page_size, 1, 1000, 250)
    const maxPages = boundedInt(input.maxPages ?? input.max_pages, 1, 10000, 10000)
    const startedAtUtc = now().toISOString()
    let insertedCount = 0
    let updatedCount = 0
    let ignoredCount = 0
    let rowCount = 0
    let pageCount = 0
    const errors = []

    for (let page = 1; page <= maxPages; page += 1) {
      const pullResult = await wordpressCatalogExportPull({
        table: "reference_cards",
        page,
        pageSize,
      })

      if (pullResult.status !== "ok") {
        errors.push({
          page,
          code: pullResult.code ?? "wordpress_catalog_pull_failed",
          message: pullResult.message ?? "WordPress catalog pull did not complete.",
          http_status: pullResult.http_status ?? 0,
        })
        break
      }

      const rows = Array.isArray(pullResult.rows)
        ? pullResult.rows
        : Array.isArray(pullResult.cards)
          ? pullResult.cards
          : Array.isArray(pullResult.data?.rows)
            ? pullResult.data.rows
            : []
      pageCount += 1
      rowCount += rows.length

      for (const row of rows) {
        const card = normalizeReferenceCard(row, row.game ?? input.game ?? "pokemon", now, "wordpress_catalog_export")

        if (!card.provider_card_id) {
          ignoredCount += 1
          continue
        }

        const existingIndex = referenceCards.findIndex(
          (candidate) => candidate.provider_card_id === card.provider_card_id,
        )

        upsertReferenceCard(referenceCards, card)
        saveReferenceCard(database, card, now)

        if (existingIndex >= 0) {
          updatedCount += 1
        } else {
          insertedCount += 1
        }
      }

      const hasMore =
        pullResult.has_more === true ||
        pullResult.hasMore === true ||
        pullResult.meta?.has_more === true ||
        pullResult.pagination?.has_more === true

      if (!hasMore && rows.length < pageSize) {
        break
      }
    }

    return {
      status: errors.length > 0 ? "blocked" : "ok",
      action: "wordpress_reference_catalog_pulled_to_lan",
      code: errors.length > 0 ? "wordpress_catalog_pull_failed" : "wordpress_catalog_pull_completed",
      started_at_utc: startedAtUtc,
      completed_at_utc: now().toISOString(),
      page_size: pageSize,
      max_pages: maxPages,
      page_count: pageCount,
      row_count: rowCount,
      inserted_count: insertedCount,
      updated_count: updatedCount,
      ignored_count: ignoredCount,
      local_reference_card_count: referenceCards.length,
      errors,
    }
  }

  function saveScryDexCatalogReferenceCards(indexResult = {}, fallbackGame = "pokemon") {
    const rawCards = dedupeRawReferenceCards([
      ...(Array.isArray(indexResult.reference_cards) ? indexResult.reference_cards : []),
      ...(Array.isArray(indexResult.cards?.reference_cards) ? indexResult.cards.reference_cards : []),
      ...(Array.isArray(indexResult.card_result?.reference_cards) ? indexResult.card_result.reference_cards : []),
    ])
    let insertedCount = 0
    let updatedCount = 0
    let ignoredCount = 0
    let variants = 0
    let prices = 0
    const referenceCardIndexes = referenceCardIndexByProviderId(referenceCards)
    const cardsToSave = []

    for (const rawCard of rawCards) {
      const card = normalizeReferenceCard(rawCard, fallbackGame, now, "scrydex_catalog")

      if (!card.provider_card_id) {
        ignoredCount += 1
        continue
      }

      const existingIndex = referenceCardIndexes.get(card.provider_card_id)
      if (existingIndex !== undefined) {
        referenceCards[existingIndex] = card
        updatedCount += 1
      } else {
        referenceCardIndexes.set(card.provider_card_id, referenceCards.length)
        referenceCards.push(card)
        insertedCount += 1
      }

      cardsToSave.push(card)
      variants += Array.isArray(card.variants) ? card.variants.length : 0
      prices += Array.isArray(card.price_points) ? card.price_points.length : 0
    }

    saveReferenceCards(database, cardsToSave, now)

    return {
      status: "ok",
      action: "scrydex_catalog_reference_cards_saved_to_lan_sqlite",
      inserted_count: insertedCount,
      updated_count: updatedCount,
      ignored_count: ignoredCount,
      row_count: rawCards.length,
      variants,
      prices,
      local_reference_card_count: referenceCards.length,
    }
  }

  async function repriceInventoryFromReferenceCatalog(input = {}) {
    const delayMs = boundedInt(input.squareSyncDelayMs ?? input.square_sync_delay_ms, 0, 10000, 350)
    const source = cleanExternalId(input.source) || "scrydex_daily_price_reprice"
    const autoPush = input.autoPush !== false && input.auto_push !== false
    const startedAtUtc = now().toISOString()
    const referenceLookup = buildReferenceCardLookup(referenceCards)
    const results = []
    let consideredCount = 0
    let matchedCount = 0
    let changedCount = 0
    let floorClampedCount = 0
    let savedOnlyCount = 0
    let manualPriceProtectedCount = 0

    for (const item of inventoryItems) {
      if (!["available", "reserved", "pending_intake"].includes(localInventoryStatus(item.status))) {
        continue
      }

      consideredCount += 1
      const enrichment = inventoryReferenceEnrichment(referenceCards, {
        cardName: item.card_name,
        game: item.game,
        setName: item.set_name,
        setCode: item.set_code,
        cardNumber: item.card_number,
        printedNumber: item.printed_number,
        providerCardId: item.provider_card_id,
        referenceVariantId: item.reference_variant_id,
        providerVariantId: item.provider_variant_id,
        variant: item.variant,
        finish: item.finish,
        rawOrGraded: item.raw_or_graded,
        condition: item.condition,
        gradingCompany: item.grading_company,
        grade: item.grade,
      }, referenceLookup)
      const marketPriceMinorUnits = Math.max(0, minorUnits(enrichment.price_minor_units))

      if (marketPriceMinorUnits <= 0) {
        continue
      }

      matchedCount += 1
      const previousPriceMinorUnits = Math.max(0, minorUnits(item.price_minor_units))
      const previousMarketPriceMinorUnits = Math.max(0, minorUnits(item.market_price_minor_units))
      const previousAutoPriceMinorUnits = Math.max(0, minorUnits(item.auto_price_minor_units))
      const manualPriceProtected = inventoryManualPriceProtected(item)
      if (manualPriceProtected) {
        manualPriceProtectedCount += 1
      }
      const minimumSalePriceMinorUnits = Math.max(
        0,
        minorUnits(item.minimum_sale_price_minor_units ?? item.price_minor_units),
      )
      const autoPriceMinorUnits = autoRetailPriceMinorUnits(marketPriceMinorUnits)
      const nextPriceMinorUnits = roundSalePriceMinorUnits(Math.max(autoPriceMinorUnits, minimumSalePriceMinorUnits))
      const floorClamped = nextPriceMinorUnits > autoPriceMinorUnits
      const priceChanged = !manualPriceProtected && previousPriceMinorUnits !== nextPriceMinorUnits
      const marketChanged =
        previousMarketPriceMinorUnits !== marketPriceMinorUnits ||
        previousAutoPriceMinorUnits !== autoPriceMinorUnits

      if (!priceChanged && !marketChanged) {
        continue
      }

      item.market_price_minor_units = marketPriceMinorUnits
      item.auto_price_minor_units = autoPriceMinorUnits
      item.minimum_sale_price_minor_units = minimumSalePriceMinorUnits
      if (!manualPriceProtected) {
        item.price_minor_units = nextPriceMinorUnits
        item.pricing_source = "scrydex_reference_catalog_daily_sync"
      }
      item.price_observed_at_utc = now().toISOString()
      item.source = priceChanged ? "queued" : item.source
      item.external_sync_state = priceChanged ? "pending" : item.external_sync_state
      item.row_version += 1
      saveInventoryItem(database, item, now)

      if (!manualPriceProtected && floorClamped) {
        floorClampedCount += 1
      }

      if (!priceChanged) {
        savedOnlyCount += 1
        continue
      }

      changedCount += 1
      const operation = appendQueueOperation(database, queue, "inventory_update", item.public_id, {
        item: publicInventoryItem(item),
        inventory_public_id: cleanPublicId(item.wordpress_public_id) || item.public_id,
        local_inventory_public_id: item.public_id,
        barcode: item.barcode,
        status: item.status,
        location: item.location,
        price_minor_units: item.price_minor_units,
        sale_price_minor_units: item.price_minor_units,
        minimum_sale_price_minor_units: item.minimum_sale_price_minor_units,
        previous_price_minor_units: previousPriceMinorUnits,
        market_price_minor_units: item.market_price_minor_units,
        auto_price_minor_units: item.auto_price_minor_units,
        pricing_source: item.pricing_source,
        previous_quantity_on_hand: inventoryQuantityOnHand(item),
        quantity_on_hand: inventoryQuantityOnHand(item),
        quantity_delta: 0,
        quantity_update_mode: "unchanged",
        online_visibility: item.online_visibility,
        kiosk_visibility: item.kiosk_visibility,
        pos_visibility: item.pos_visibility,
        actor_id: "system",
        actor_name: "ScryDex daily sync",
        reason: floorClamped ? "ScryDex price update clamped to inventory floor" : "ScryDex price update",
        sync_intent: source,
        wordpress_acceptance_required: true,
      }, now)

      if (autoPush && wordpressInventoryUpdatePush) {
        if (results.length > 0 && delayMs > 0) {
          await sleepMs(delayMs)
        }

        results.push(await pushInventoryUpdateOperation(operation))
      } else if (consideredCount % 50 === 0) {
        await sleepMs(0)
      }
    }

    return {
      status: "ok",
      action: "scrydex_reference_catalog_inventory_reprice",
      source_of_truth: "local_sync_server",
      started_at_utc: startedAtUtc,
      completed_at_utc: now().toISOString(),
      considered_count: consideredCount,
      matched_count: matchedCount,
      changed_count: changedCount,
      saved_market_only_count: savedOnlyCount,
      manual_price_protected_count: manualPriceProtectedCount,
      floor_clamped_count: floorClampedCount,
      square_throttle_delay_ms: delayMs,
      wordpress_auto_sync_performed: results.length > 0,
      wordpress_accepted_count: results.filter((item) => item.status === "accepted").length,
      wordpress_retry_count: results.filter((item) => item.status === "retry").length,
      square_accepted_count: results.filter((item) => item.square_catalog_inventory_sync?.status === "accepted").length,
      square_retry_count: results.filter((item) => item.square_catalog_inventory_sync?.status === "retry").length,
      results,
      local_queue_depth: pendingQueueOperations(queue).length,
    }
  }

  async function indexScryDexCatalogForSystem(input = {}) {
    const onGameResult = typeof input.onGameResult === "function" ? input.onGameResult : null
    const onPhaseChange = typeof input.onPhaseChange === "function" ? input.onPhaseChange : null
    const onProgress = typeof input.onProgress === "function" ? input.onProgress : null
    const source = cleanExternalId(input.source) || "scrydex_catalog_system_index"

    if (!wordpressCatalogIndexer) {
      lastScryDexCatalogSyncResult = {
        job_id: `scrydex-system-${randomUUID()}`,
        status: "blocked",
        code: "scrydex_catalog_index_route_unavailable",
        message: "The WordPress ScryDex catalog index route is not configured on this LAN server.",
        action: "scrydex_catalog_system_index",
        started_at_utc: now().toISOString(),
        completed_at_utc: now().toISOString(),
        source,
        run_source: source,
        system_job: true,
      }
      recordScryDexCatalogSyncResult(lastScryDexCatalogSyncResult, {
        includeInRecent: input.recordHistory !== false,
      })
      return lastScryDexCatalogSyncResult
    }

    const games = supportedScryDexGames(input.games)
    if (games.length === 0) {
      return blocked("scrydex_supported_game_required", "No supported ScryDex game was selected for catalog indexing.")
    }
    const rawOrGraded =
      ["raw", "graded"].includes(String(input.rawOrGraded ?? input.raw_or_graded ?? "").toLowerCase())
        ? String(input.rawOrGraded ?? input.raw_or_graded).toLowerCase()
        : ""
    const startedAtUtc = now().toISOString()
    const gameResults = []

    for (const game of games) {
      try {
        const result = await wordpressCatalogIndexer({
          game,
          pageSize: input.pageSize ?? input.page_size ?? 100,
          maxPages: input.maxPages ?? input.max_pages ?? 10000,
          maxExpansionPages: input.maxExpansionPages ?? input.max_expansion_pages ?? 10000,
          expansionId: input.expansionId ?? input.expansion_id ?? "",
          indexExpansions: input.indexExpansions === true || input.index_expansions === true,
          skipCards: false,
          executeDatabaseWrites: true,
          includeUsageSnapshot: false,
          rawOrGraded,
          onProgress,
        })
        const localWrite = saveScryDexCatalogReferenceCards(result, game)

        const cardBlock = result.cards && typeof result.cards === "object" ? result.cards : result.card_result ?? {}
        const expansionBlock =
          result.expansion_result && typeof result.expansion_result === "object" ? result.expansion_result : {}
        const gameResult = {
          game,
          status: result.status,
          code: result.code ?? result.action ?? "",
          message: result.message ?? "",
          stored_cards: Number(cardBlock.reference_row_count ?? result.stored_cards ?? result.card_count ?? 0),
          local_inserted_cards: localWrite.inserted_count,
          local_updated_cards: localWrite.updated_count,
          local_ignored_cards: localWrite.ignored_count,
          variants: Number(result.variants ?? result.variant_count ?? localWrite.variants ?? 0),
          prices: positiveInt(result.prices ?? result.price_count) || localWrite.prices,
          expansion_pages: Number(expansionBlock.page_count ?? result.expansion_pages ?? 0),
          card_pages: Number(cardBlock.page_count ?? result.card_pages ?? 0),
          failed_sets: result.failed_sets ?? cardBlock.failed_sets ?? result.skipped_sets ?? result.expansion_errors ?? [],
          failed_cards: result.failed_cards ?? result.skipped_cards ?? result.card_errors ?? [],
        }
        gameResults.push(gameResult)
        onGameResult?.(gameResult, gameResults)
      } catch (error) {
        const gameResult = {
          game,
          status: "blocked",
          code: "scrydex_catalog_index_exception",
          message: error instanceof Error ? error.message : "Unknown ScryDex catalog index error.",
          stored_cards: 0,
          variants: 0,
          prices: 0,
          expansion_pages: 0,
          card_pages: 0,
          failed_sets: [],
          failed_cards: [],
        }
        gameResults.push(gameResult)
        onGameResult?.(gameResult, gameResults)
      }
    }

    onPhaseChange?.({
      phase: "catalog_pull",
      message: "Pulling the refreshed catalog into the LAN SQLite cache.",
    })
    const skipCatalogPull =
      input.skipLocalCatalogPull === true ||
      input.skip_local_catalog_pull === true ||
      scryDexCatalogIndexerMode === "local_scrydex_api"
    const catalogPull =
      skipCatalogPull
        ? {
            status: "skipped",
            code: "local_catalog_pull_skipped",
            message: scryDexCatalogIndexerMode === "local_scrydex_api"
              ? "LAN ScryDex indexer already saved provider rows to local SQLite."
              : "Local catalog pull was skipped by request.",
          }
        : await pullLatestReferenceCatalogFromWordPress({
            pageSize: input.catalogPageSize ?? input.catalog_page_size ?? input.pageSize ?? input.page_size ?? 250,
            maxPages: input.catalogMaxPages ?? input.catalog_max_pages ?? input.maxCatalogPages ?? 10000,
          })
    onPhaseChange?.({
      phase: "inventory_reprice",
      message: "Validating inventory prices against the refreshed catalog and floor prices.",
    })
    const inventoryReprice =
      input.skipInventoryReprice === true || input.skip_inventory_reprice === true
        ? {
            status: "skipped",
            code: "inventory_reprice_skipped",
            message: "Inventory repricing was skipped by request.",
          }
        : await repriceInventoryFromReferenceCatalog({
            source,
            squareSyncDelayMs: input.squareSyncDelayMs ?? input.square_sync_delay_ms ?? 350,
          })
    const failedCount = gameResults.filter((result) => result.status !== "ok").length
    const blockedDownstreamCount = [catalogPull, inventoryReprice].filter((result) => result.status === "blocked").length
    const completedAtUtc = now().toISOString()
    lastScryDexCatalogSyncResult = {
      job_id: `scrydex-system-${randomUUID()}`,
      status: failedCount > 0 || blockedDownstreamCount > 0 ? "blocked" : "ok",
      action: "scrydex_catalog_system_index",
      source,
      run_source: source,
      started_at_utc: startedAtUtc,
      completed_at_utc: completedAtUtc,
      raw_or_graded: rawOrGraded || "both",
      game_count: gameResults.length,
      failed_game_count: failedCount,
      stored_cards: gameResults.reduce((total, result) => total + result.stored_cards, 0),
      variants: gameResults.reduce((total, result) => total + result.variants, 0),
      prices: gameResults.reduce((total, result) => total + result.prices, 0),
      games: gameResults,
      catalog_pull: catalogPull,
      inventory_reprice: inventoryReprice,
      local_reference_card_count: referenceCards.length,
      system_job: true,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
    recordScryDexCatalogSyncResult(lastScryDexCatalogSyncResult, {
      includeInRecent: input.recordHistory !== false,
    })

    return lastScryDexCatalogSyncResult
  }

  function getScryDexCatalogStatus(token) {
    const session = requireWorkspaceAccess(token, "ScryDex")

    if (session.status !== "ok") {
      return session
    }

    return buildScryDexCatalogStatus()
  }

  function getScryDexCatalogStatusForSystem() {
    return buildScryDexCatalogStatus()
  }

  function buildScryDexCatalogStatus() {
    reconcileTerminalActiveScryDexCatalogSyncJobs()
    const activeJobs = Array.from(new Set(activeScryDexCatalogSyncJobs.values()))
    activeScryDexCatalogSyncJob = activeJobs[0] ?? null

    return {
      status: "ok",
      action: "scrydex_catalog_status",
      generated_at_utc: now().toISOString(),
      totals: buildScryDexCatalogTotals(referenceCards),
      indexer_configured: Boolean(wordpressCatalogIndexer),
      daily_sync_configured: Boolean(wordpressCatalogIndexer),
      catalog_indexer_mode: scryDexCatalogIndexerMode,
      local_catalog_indexer_configured: scryDexCatalogIndexerMode === "local_scrydex_api",
      website_catalog_indexer_fallback_configured: Boolean(wordpressCatalogIndexerFallback),
      lookup_order: ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"],
      active_job: activeScryDexCatalogSyncJob,
      active_jobs: activeJobs,
      recent_jobs: scryDexCatalogSyncHistory.slice(0, 8),
      last_sync: lastScryDexCatalogSyncResult,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function reconcileTerminalActiveScryDexCatalogSyncJob(job) {
    if (!job || job.status !== "running") {
      return
    }

    const games = Array.isArray(job.games) ? job.games : []
    const terminalGames = games.filter((game) => !["queued", "running", "indexing"].includes(String(game.status ?? "")))
    const expectedGameCount = Number(job.game_count ?? games.length)
    const allGamesTerminal = expectedGameCount > 0 && terminalGames.length >= expectedGameCount

    if (!allGamesTerminal) {
      return
    }

    if (!job.downstream_phase) {
      job.downstream_phase = "waiting_for_downstream"
      job.downstream_message = "Game indexing finished; waiting for catalog pull and pricing update."
      job.downstream_started_at_utc = now().toISOString()
      return
    }

    const downstreamStartedMs = Date.parse(String(job.downstream_started_at_utc ?? ""))
    const recoveryMs = boundedInt(job.downstream_stall_recovery_ms, 1_000, 60 * 60 * 1000, 10 * 60 * 1000)

    if (!Number.isFinite(downstreamStartedMs) || now().getTime() - downstreamStartedMs < recoveryMs) {
      return
    }

    job.completed_game_count = terminalGames.length
    job.failed_game_count = games.filter((game) => game.status !== "ok").length
    job.stored_cards = games.reduce((total, game) => total + Number(game.stored_cards ?? 0), 0)
    job.variants = games.reduce((total, game) => total + Number(game.variants ?? 0), 0)
    job.prices = games.reduce((total, game) => total + Number(game.prices ?? 0), 0)
    job.errors = games
      .filter((game) => game.status !== "ok")
      .map((game) => ({
        game: game.game,
        code: game.code || "scrydex_game_sync_failed",
        message: game.message || "ScryDex game sync did not complete.",
      }))
    job.errors.push({
      game: "",
      code: "scrydex_downstream_sync_timeout",
      message: "Catalog pull or inventory repricing did not finish after game indexing completed.",
    })
    job.status = "completed_with_errors"
    job.completed_at_utc = now().toISOString()
    job.totals_after = buildScryDexCatalogTotals(referenceCards)

    scryDexCatalogSyncHistory.unshift({ ...job })
    scryDexCatalogSyncHistory.splice(8)
    saveScryDexCatalogSyncHistoryEntry(database, compactScryDexCatalogSyncHistoryEntry(job))
    pruneScryDexCatalogSyncHistory(database)
    removeActiveScryDexCatalogSyncJob(job)
  }

  function reconcileTerminalActiveScryDexCatalogSyncJobs() {
    for (const job of new Set(activeScryDexCatalogSyncJobs.values())) {
      reconcileTerminalActiveScryDexCatalogSyncJob(job)
    }
    activeScryDexCatalogSyncJob = Array.from(new Set(activeScryDexCatalogSyncJobs.values()))[0] ?? null
  }

  function setActiveScryDexCatalogSyncJob(job) {
    for (const game of scryDexCatalogJobGameKeys(job)) {
      activeScryDexCatalogSyncJobs.set(game, job)
    }
    activeScryDexCatalogSyncJob = Array.from(new Set(activeScryDexCatalogSyncJobs.values()))[0] ?? null
  }

  function removeActiveScryDexCatalogSyncJob(job) {
    for (const [game, candidate] of activeScryDexCatalogSyncJobs.entries()) {
      if (candidate === job || candidate?.job_id === job?.job_id) {
        activeScryDexCatalogSyncJobs.delete(game)
      }
    }
    activeScryDexCatalogSyncJob = Array.from(new Set(activeScryDexCatalogSyncJobs.values()))[0] ?? null
  }

  function scryDexCatalogJobGameKeys(job) {
    const games = Array.isArray(job?.games) ? job.games.map((game) => cleanGame(game.game)).filter(Boolean) : []
    const directGame = cleanGame(job?.game)
    const keys = games.length > 0 ? games : directGame ? [directGame] : []

    return [...new Set(keys)]
  }

  function startScryDexCatalogSyncJob(token, input = {}) {
    const session = requireWorkspaceAccess(token, "ScryDex")

    if (session.status !== "ok") {
      return session
    }

    const games = supportedScryDexGames(input.games ?? input.game)
    if (games.length === 0) {
      return blocked("scrydex_supported_game_required", "Select a ScryDex-supported game before starting a catalog sync.", {
        totals: buildScryDexCatalogTotals(referenceCards),
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      })
    }
    const activeGameJobs = games
      .map((game) => activeScryDexCatalogSyncJobs.get(game))
      .filter((job, index, jobs) => job?.status === "running" && jobs.findIndex((candidate) => candidate?.job_id === job.job_id) === index)

    if (activeGameJobs.length > 0) {
      return blocked("scrydex_catalog_sync_already_running", "A ScryDex catalog sync is already running for the requested game.", {
        job: activeGameJobs[0],
        active_jobs: activeGameJobs,
        totals: buildScryDexCatalogTotals(referenceCards),
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      })
    }

    const rawOrGraded =
      ["raw", "graded"].includes(String(input.rawOrGraded ?? input.raw_or_graded ?? "").toLowerCase())
        ? String(input.rawOrGraded ?? input.raw_or_graded).toLowerCase()
        : ""
    const job = {
      job_id: `scrydex-sync-${randomUUID()}`,
      status: "running",
      action: "scrydex_catalog_sync_job",
      source: "manager_scrydex_catalog_sync_job",
      run_source: "manager_scrydex_catalog_sync_job",
      started_at_utc: now().toISOString(),
      completed_at_utc: "",
      requested_by_user_id: session.user.id,
      requested_by_user_name: session.user.name,
      raw_or_graded: rawOrGraded || "both",
      game_count: games.length,
      completed_game_count: 0,
      failed_game_count: 0,
      downstream_phase: "",
      downstream_message: "",
      downstream_started_at_utc: "",
      downstream_stall_recovery_ms: boundedInt(input.downstreamStallRecoveryMs ?? input.downstream_stall_recovery_ms, 1_000, 60 * 60 * 1000, 10 * 60 * 1000),
      stored_cards: 0,
      variants: 0,
      prices: 0,
      games: games.map((game) => ({
        game,
        status: "queued",
        code: "",
        message: "Waiting to start.",
        stored_cards: 0,
        variants: 0,
        prices: 0,
        expansion_pages: 0,
        card_pages: 0,
        failed_sets: [],
        failed_cards: [],
      })),
      errors: [],
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }

    setActiveScryDexCatalogSyncJob(job)

    const updateGameProgress = (progress = {}) => {
      const game = cleanGame(progress.game)
      if (!game) {
        return
      }

      const existing = job.games.find((candidate) => candidate.game === game) ?? {
        game,
        status: "running",
        code: "",
        message: "",
        stored_cards: 0,
        variants: 0,
        prices: 0,
        expansion_pages: 0,
        card_pages: 0,
        failed_sets: [],
        failed_cards: [],
      }
      const nextGame = {
        ...existing,
        status: cleanName(progress.status) || "running",
        phase: cleanName(progress.phase),
        message: cleanText(progress.message) || existing.message,
        current_expansion_id: cleanExternalId(progress.current_expansion_id ?? progress.expansion_id),
        current_expansion_name: cleanName(progress.current_expansion_name),
        provider_request_count: Number(progress.provider_request_count ?? existing.provider_request_count ?? 0),
        expansion_pages: Number(progress.expansion_pages ?? existing.expansion_pages ?? 0),
        expansion_rows: Number(progress.expansion_rows ?? existing.expansion_rows ?? 0),
        card_pages: Number(progress.card_pages ?? existing.card_pages ?? 0),
        stored_cards: Number(progress.stored_cards ?? existing.stored_cards ?? 0),
        variants: Number(progress.variants ?? existing.variants ?? 0),
        prices: Number(progress.prices ?? existing.prices ?? 0),
        updated_at_utc: now().toISOString(),
      }
      job.games = [
        ...job.games.filter((candidate) => candidate.game !== game),
        nextGame,
      ].sort((left, right) => games.indexOf(left.game) - games.indexOf(right.game))
      job.downstream_phase = cleanName(progress.phase) || job.downstream_phase
      job.downstream_message = cleanText(progress.message) || job.downstream_message
      job.stored_cards = job.games.reduce((total, candidate) => total + Number(candidate.stored_cards ?? 0), 0)
      job.variants = job.games.reduce((total, candidate) => total + Number(candidate.variants ?? 0), 0)
      job.prices = job.games.reduce((total, candidate) => total + Number(candidate.prices ?? 0), 0)
      job.provider_request_count = job.games.reduce(
        (total, candidate) => total + Number(candidate.provider_request_count ?? 0),
        0,
      )
    }

    void (async () => {
      try {
        const result = await indexScryDexCatalogForSystem({
          games,
          rawOrGraded,
          pageSize: input.pageSize ?? input.page_size ?? 100,
          maxPages: input.maxPages ?? input.max_pages ?? 10000,
          maxExpansionPages: input.maxExpansionPages ?? input.max_expansion_pages ?? 10000,
          indexExpansions: input.indexExpansions === true || input.index_expansions === true,
          source: "manager_scrydex_catalog_sync_job",
          recordHistory: false,
          squareSyncDelayMs: input.squareSyncDelayMs ?? input.square_sync_delay_ms ?? 350,
          onProgress: updateGameProgress,
          onPhaseChange: (phase) => {
            job.downstream_phase = cleanName(phase.phase)
            job.downstream_message = cleanText(phase.message)
            job.downstream_started_at_utc = now().toISOString()
          },
          onGameResult: (gameResult) => {
            const nextGames = job.games.filter((candidate) => candidate.game !== gameResult.game)
            job.games = [
              ...nextGames,
              {
                ...gameResult,
                failed_sets: Array.isArray(gameResult.failed_sets) ? gameResult.failed_sets : [],
                failed_cards: Array.isArray(gameResult.failed_cards) ? gameResult.failed_cards : [],
              },
            ].sort((left, right) => games.indexOf(left.game) - games.indexOf(right.game))
            job.completed_game_count = job.games.filter((candidate) => candidate.status !== "queued").length
            job.failed_game_count = job.games.filter((candidate) => candidate.status !== "ok").length
            job.stored_cards = job.games.reduce((total, candidate) => total + Number(candidate.stored_cards ?? 0), 0)
            job.variants = job.games.reduce((total, candidate) => total + Number(candidate.variants ?? 0), 0)
            job.prices = job.games.reduce((total, candidate) => total + Number(candidate.prices ?? 0), 0)
            job.errors = job.games
              .filter((candidate) => candidate.status !== "ok")
              .map((candidate) => ({
                game: candidate.game,
                code: candidate.code || "scrydex_game_sync_failed",
                message: candidate.message || "ScryDex game sync did not complete.",
              }))
          },
        })

        job.status = result.status === "ok" ? "completed" : "completed_with_errors"
        job.completed_at_utc = now().toISOString()
        job.result = result
        job.catalog_pull = result.catalog_pull
        job.inventory_reprice = result.inventory_reprice
        job.totals_after = buildScryDexCatalogTotals(referenceCards)
      } catch (error) {
        job.status = "failed"
        job.completed_at_utc = now().toISOString()
        job.errors = [
          ...job.errors,
          {
            game: "",
            code: "scrydex_catalog_sync_job_exception",
            message: error instanceof Error ? error.message : "Unknown ScryDex sync job error.",
          },
        ]
      } finally {
        recordScryDexCatalogSyncResult(job)
        removeActiveScryDexCatalogSyncJob(job)
      }
    })()

    return {
      status: "ok",
      action: "scrydex_catalog_sync_job_started",
      job,
      active_jobs: Array.from(new Set(activeScryDexCatalogSyncJobs.values())),
      totals: buildScryDexCatalogTotals(referenceCards),
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function triggerScryDexWebhookRefresh(token, input = {}) {
    const session = requireScryDexWebhookAccess(token)

    if (session.status !== "ok") {
      return session
    }

    const expansionIds = Array.from(
      new Set(
        [
          input.expansionId,
          input.expansion_id,
          ...(Array.isArray(input.expansion_ids) ? input.expansion_ids : []),
          ...(Array.isArray(input.expansionIds) ? input.expansionIds : []),
        ]
          .map(cleanProviderResourceId)
          .filter(Boolean),
      ),
    )
    const updateType = cleanName(input.updateType ?? input.update_type)
    const requestedRawOrGraded = String(input.rawOrGraded ?? input.raw_or_graded ?? "").toLowerCase()
    const rawOrGraded = ["raw", "graded"].includes(requestedRawOrGraded)
      ? requestedRawOrGraded
      : updateType.includes("graded")
        ? "graded"
        : updateType.includes("raw")
          ? "raw"
          : ""

    if (expansionIds.length === 0) {
      return blocked("scrydex_webhook_expansion_ids_missing", "ScryDex webhook refresh requires at least one expansion id.", {
        action: "scrydex_catalog_webhook_refresh_completed",
        webhook_event: cleanName(input.event ?? input.webhook_event ?? input.type),
        update_type: updateType,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      })
    }

    const games = supportedScryDexGames(input.games ?? input.game)
    const startedAtUtc = now().toISOString()
    const expansionRuns = []

    for (const expansionId of expansionIds) {
      const result = await indexScryDexCatalogForSystem({
        games,
        rawOrGraded,
        pageSize: input.pageSize ?? input.page_size ?? 100,
        maxPages: input.maxPages ?? input.max_pages ?? 10000,
        maxExpansionPages: 1,
        expansionId,
        indexExpansions: false,
        skipLocalCatalogPull: true,
        skipInventoryReprice: true,
        source: "wordpress_scrydex_webhook_trigger",
        recordHistory: false,
        squareSyncDelayMs: input.squareSyncDelayMs ?? input.square_sync_delay_ms ?? 350,
      })

      expansionRuns.push({
        expansion_id: expansionId,
        status: result.status,
        code: result.code ?? result.action ?? "",
        message: result.message ?? "",
        stored_cards: result.stored_cards ?? 0,
        variants: result.variants ?? 0,
        prices: result.prices ?? 0,
        games: result.games ?? [],
      })
    }

    const catalogPull = await pullLatestReferenceCatalogFromWordPress({
      pageSize: input.catalogPageSize ?? input.catalog_page_size ?? input.pageSize ?? input.page_size ?? 250,
      maxPages: input.catalogMaxPages ?? input.catalog_max_pages ?? input.maxCatalogPages ?? 10000,
    })
    const inventoryReprice = await repriceInventoryFromReferenceCatalog({
      source: "wordpress_scrydex_webhook_trigger",
      squareSyncDelayMs: input.squareSyncDelayMs ?? input.square_sync_delay_ms ?? 350,
    })
    const failedExpansionCount = expansionRuns.filter((run) => run.status !== "ok").length
    const downstreamBlocked = [catalogPull, inventoryReprice].some((result) => result.status === "blocked")
    const result = {
      job_id: `scrydex-webhook-${randomUUID()}`,
      status: failedExpansionCount > 0 || downstreamBlocked ? "blocked" : "ok",
      action: "scrydex_catalog_webhook_refresh_completed",
      source: "wordpress_scrydex_webhook_trigger",
      run_source: "wordpress_scrydex_webhook_trigger",
      requested_by_user_id: session.user.id,
      requested_by_user_name: session.user.name,
      source_of_truth: "local_sync_server",
      webhook_event: cleanName(input.event ?? input.webhook_event ?? input.type),
      update_type: updateType,
      raw_or_graded: rawOrGraded || "both",
      started_at_utc: startedAtUtc,
      completed_at_utc: now().toISOString(),
      game_count: games.length,
      expansion_count: expansionIds.length,
      failed_expansion_count: failedExpansionCount,
      expansion_ids: expansionIds,
      expansion_runs: expansionRuns,
      stored_cards: expansionRuns.reduce((total, run) => total + Number(run.stored_cards ?? 0), 0),
      variants: expansionRuns.reduce((total, run) => total + Number(run.variants ?? 0), 0),
      prices: expansionRuns.reduce((total, run) => total + Number(run.prices ?? 0), 0),
      catalog_pull: catalogPull,
      inventory_reprice: inventoryReprice,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
    lastScryDexCatalogSyncResult = result
    recordScryDexCatalogSyncResult(result)

    return result
  }

  function recordScryDexCatalogSyncResult(result, options = {}) {
    if (options.includeInRecent === false) {
      return
    }

    const compact = compactScryDexCatalogSyncHistoryEntry(result)

    if (!compact) {
      return
    }

    saveScryDexCatalogSyncHistoryEntry(database, compact)
    pruneScryDexCatalogSyncHistory(database)

    const existingIndex = scryDexCatalogSyncHistory.findIndex((entry) => entry.job_id === compact.job_id)

    if (existingIndex >= 0) {
      scryDexCatalogSyncHistory.splice(existingIndex, 1)
    }

    scryDexCatalogSyncHistory.unshift(compact)
    scryDexCatalogSyncHistory.splice(8)
  }

  async function identifyScryDexCardImage(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Inventory")

    if (session.status !== "ok") {
      return session
    }

    if (!scryDexVisionIdentifier) {
      return blocked(
        "scrydex_vision_not_configured",
        "ScryDex Vision is not configured on this LAN server.",
        {
          action: "scrydex_vision_card_scan",
          credential_storage: "lan_server_environment",
          credentials_synced_to_client: false,
        },
      )
    }

    const normalizedGame = cleanGame(input.game)
    const normalizedRawOrGraded = ["raw", "graded"].includes(String(input.raw_or_graded ?? input.rawOrGraded ?? "").toLowerCase())
      ? String(input.raw_or_graded ?? input.rawOrGraded).toLowerCase()
      : ""
    const visionResult = await scryDexVisionIdentifier.identifyCardImage({
      ...input,
      game: normalizedGame,
    })

    if (visionResult.status !== "ok") {
      return {
        ...visionResult,
        action: "scrydex_vision_card_scan",
        credential_storage: "lan_server_environment",
        credentials_synced_to_client: false,
      }
    }

    const searchRequest = buildScryDexSearchRequestFromVision(visionResult, normalizedGame)

    if (!searchRequest.query) {
      return {
        status: "ok",
        action: "scrydex_vision_card_scan",
        code: "scrydex_vision_no_catalog_query",
        cards: [],
        query: "",
        game: searchRequest.game,
        set_filter: "",
        result_limit: "all",
        source: "scrydex_vision",
        lookup_order: ["scrydex_vision", "local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"],
        vision: visionResult,
        message: "Vision completed, but it did not return enough card text to search the catalog.",
        credential_storage: "lan_server_environment",
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
        live_provider_request_performed: true,
      }
    }

    const searchResult = await searchScryDexCards(token, {
      query: searchRequest.query,
      game: searchRequest.game,
      setFilter: searchRequest.setFilter,
      limit: "all",
      rawOrGraded: normalizedRawOrGraded,
    })

    return {
      ...searchResult,
      action: "scrydex_vision_card_scan",
      code: searchResult.status === "ok" ? "scrydex_vision_catalog_results_ready" : searchResult.code,
      vision: visionResult,
      vision_query: searchRequest.query,
      vision_set_filter: searchRequest.setFilter,
      vision_match_count: visionResult.match_count,
      vision_provider: "scrydex_vision",
      credential_storage: "lan_server_environment",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function lookupGradedTradeInValuation(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Trade-Ins")

    if (session.status !== "ok") {
      return session
    }

    const query = cleanGradedValuationQuery(input)

    if (!query.card_name) {
      return blocked("graded_valuation_card_required", "Select a card before pulling PriceCharting graded pricing.")
    }

    if (!query.grade) {
      return blocked("graded_valuation_grade_required", "Enter the graded card grade before pulling PriceCharting pricing.")
    }

    const cacheKey = gradedValuationCacheKey(query)
    const cached = readGradedValuationCache(database, cacheKey, now)

    if (cached) {
      return {
        status: "ok",
        action: "local_sync_graded_trade_in_valuation",
        query,
        valuation: cached.valuation,
        provider_statuses: cached.provider_statuses,
        provider_request_performed: false,
        cache_hit: true,
        cache_expires_at_utc: cached.cache_expires_at_utc,
        primary_source: "pricecharting",
        fallback_source: "scrydex_reference_cache",
        pricecharting_source_used: Boolean(cached.valuation),
        scrydex_fallback_used: !cached.valuation,
        secondary_source_used: Boolean(cached.valuation),
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    if (!gradedPricingLookup) {
      return {
        status: "ok",
        action: "local_sync_graded_trade_in_valuation",
        query,
        valuation: null,
        provider_statuses: [
          {
            provider: "pricecharting",
            configured: false,
            status: "not_configured",
            detail: "PriceCharting graded lookup is not configured on this local server.",
            credentials_synced_to_client: false,
            raw_credentials_returned: false,
          },
        ],
        provider_request_performed: false,
        cache_hit: false,
        cache_expires_at_utc: "",
        primary_source: "pricecharting",
        fallback_source: "scrydex_reference_cache",
        pricecharting_source_used: false,
        scrydex_fallback_used: true,
        secondary_source_used: false,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    const lookupResult = await gradedPricingLookup(query)
    const normalized = normalizeGradedValuationLookupResult(lookupResult, now)
    const providerRequestPerformed = Boolean(lookupResult?.provider_request_performed)
    const shouldCacheLookup = providerRequestPerformed || Boolean(normalized.valuation)
    const cacheExpiresAtUtc = shouldCacheLookup
      ? new Date(now().getTime() + gradedPricingCacheTtlSeconds * 1000).toISOString()
      : ""

    if (shouldCacheLookup) {
      saveGradedValuationCache(database, {
        cache_key: cacheKey,
        query,
        valuation: normalized.valuation,
        provider_statuses: normalized.provider_statuses,
        cache_expires_at_utc: cacheExpiresAtUtc,
        updated_at_utc: now().toISOString(),
      })
    }

    return {
      status: "ok",
      action: "local_sync_graded_trade_in_valuation",
      query,
      valuation: normalized.valuation,
      provider_statuses: normalized.provider_statuses,
      provider_request_performed: providerRequestPerformed,
      cache_hit: false,
      cache_expires_at_utc: cacheExpiresAtUtc,
      primary_source: "pricecharting",
      fallback_source: "scrydex_reference_cache",
      pricecharting_source_used: Boolean(normalized.valuation),
      scrydex_fallback_used: !normalized.valuation,
      secondary_source_used: Boolean(normalized.valuation),
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
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

  async function createInventoryIntake(token, input = {}) {
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
    const gradingCompany = cleanName(input.grading_company)
    const grade = cleanName(input.grade)
    const certNumber = cleanName(input.cert_number)
    const condition = cleanCondition(input.condition ?? input.condition_code)
    const inputBarcode = cleanBarcode(input.barcode)
    if (inputBarcode && !scannerBarcodeLengthAllowed(inputBarcode)) {
      return blocked(
        "barcode_too_long_for_scanner",
        `Barcode ${inputBarcode} is ${inputBarcode.length} characters. Scanner-safe barcodes must be ${SCANNER_BARCODE_MAX_LENGTH} characters or less.`,
      )
    }

    const barcodeBase = inputBarcode || generateScannerBarcodeBase()
    const inputPriceMinorUnits = roundSalePriceMinorUnits(
      Math.max(0, minorUnits(input.price_minor_units ?? input.sale_price_minor_units)),
    )
    const location = cleanInventoryLocation(input.location ?? input.location_label) || "Intake Queue"
    const imageUrl = cleanInventoryImageUrl(input.image_url)
    const backImageUrl = cleanInventoryImageUrl(input.back_image_url)
    const onlineVisibility = cleanVisibility(input.online_visibility, "visible")
    const kioskVisibility = cleanVisibility(input.kiosk_visibility, "visible")
    const posVisibility = cleanVisibility(input.pos_visibility, "visible")
    const squareCatalogItemId = cleanExternalId(input.square_catalog_item_id)
    const squareCatalogVariationId = cleanExternalId(input.square_catalog_variation_id)
    const quantity = boundedInt(input.quantity ?? input.quantity_added, 1, 200, 1)
    const inputPriceSource = cleanName(input.price_source ?? input.pricing_source)
    const referenceEnrichment = inventoryReferenceEnrichment(referenceCards, {
      cardName,
      game,
      setName,
      setCode,
      cardNumber,
      printedNumber,
      providerCardId,
      referenceVariantId,
      providerVariantId,
      variant,
      finish,
      rawOrGraded,
      condition,
      gradingCompany,
      grade,
    })
    const referencePriceMinorUnits = referenceEnrichment.price_minor_units
    const shouldUseReferencePrice =
      inputPriceSource.includes("scrydex_required") && referencePriceMinorUnits > 0
    const requestedPriceMinorUnits = shouldUseReferencePrice
      ? roundSalePriceMinorUnits(referencePriceMinorUnits)
      : inputPriceMinorUnits
    const minimumSalePriceMinorUnits = Math.max(
      0,
      minorUnits(input.minimum_sale_price_minor_units ?? input.minimum_price_minor_units ?? requestedPriceMinorUnits),
    )
    const effectiveProviderCardId = providerCardId || referenceEnrichment.provider_card_id
    const effectiveReferenceVariantId = referenceVariantId ?? referenceEnrichment.reference_variant_id
    const effectiveProviderVariantId = providerVariantId || referenceEnrichment.provider_variant_id
    const effectiveSetName = genericInventorySetName(setName) && referenceEnrichment.set_name
      ? referenceEnrichment.set_name
      : setName
    const effectiveSetCode = setCode || referenceEnrichment.set_code
    const effectiveCardNumber = cardNumber || referenceEnrichment.card_number
    const effectivePrintedNumber = printedNumber || referenceEnrichment.printed_number
    const effectiveVariant = variant || referenceEnrichment.variant
    const effectiveFinish = finish || referenceEnrichment.finish
    const effectiveLanguage = language || referenceEnrichment.language
    const effectiveImageUrl = imageUrl || referenceEnrichment.image_url
    const effectiveBackImageUrl = backImageUrl || referenceEnrichment.back_image_url
    const suggestedPriceMinorUnits = roundSalePriceMinorUnits(Math.max(
      0,
      minorUnits(
        shouldUseReferencePrice
          ? referencePriceMinorUnits
          : input.suggested_price_minor_units ?? input.market_price_minor_units ?? requestedPriceMinorUnits,
      ),
    ))
    const autoPriceMinorUnits = roundSalePriceMinorUnits(Math.max(
      0,
      minorUnits(input.auto_price_minor_units ?? input.repriced_minor_units ?? suggestedPriceMinorUnits),
    ))
    const finalPriceMinorUnits = roundSalePriceMinorUnits(Math.max(
      minimumSalePriceMinorUnits,
      minorUnits(input.final_price_minor_units ?? requestedPriceMinorUnits),
    ))
    const priceSource =
      (shouldUseReferencePrice ? "scrydex_catalog_reference_price" : inputPriceSource) ||
      (effectiveProviderCardId || effectiveReferenceVariantId || effectiveProviderVariantId ? "scrydex_catalog" : "manual_intake")
    const priceObservedAtUtc =
      cleanIsoTimestamp(input.price_observed_at_utc ?? input.catalog_synced_at_utc) || now().toISOString()
    const syncIntent =
      cleanExternalId(input.sync_intent ?? input.syncIntent) || "offline_inventory_intake"
    const priceOverrideReason =
      finalPriceMinorUnits !== suggestedPriceMinorUnits || finalPriceMinorUnits !== requestedPriceMinorUnits
        ? cleanReason(input.price_override_reason ?? "staff_price_override")
        : cleanOptionalReason(input.price_override_reason)

    if (!cardName || finalPriceMinorUnits <= 0) {
      return blocked("invalid_inventory_intake", "Card name and positive price are required for local intake.")
    }

    const rowCount = rawOrGraded === "sealed" ? 1 : quantity
    const quantityOnHandPerRow = rawOrGraded === "sealed" ? quantity : 1
    const barcodes = Array.from({ length: rowCount }, (_, index) =>
      rowCount === 1 ? barcodeBase : scannerSafeIndexedBarcode(barcodeBase, index, rowCount),
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
      provider_card_id: effectiveProviderCardId,
      reference_variant_id: effectiveReferenceVariantId,
      provider_variant_id: effectiveProviderVariantId,
      game,
      card_name: cardName,
      set_name: effectiveSetName,
      set_code: effectiveSetCode,
      card_number: effectiveCardNumber,
      printed_number: effectivePrintedNumber,
      variant: effectiveVariant,
      finish: effectiveFinish,
      language: effectiveLanguage,
      raw_or_graded: rawOrGraded,
      grading_company: rawOrGraded === "graded" ? gradingCompany : "",
      grade: rawOrGraded === "graded" ? grade : "",
      cert_number: rawOrGraded === "graded" ? certNumber : "",
      condition,
      barcode,
      price_minor_units: finalPriceMinorUnits,
      quantity_on_hand: quantityOnHandPerRow,
      market_price_minor_units: suggestedPriceMinorUnits,
      minimum_sale_price_minor_units: minimumSalePriceMinorUnits,
      auto_price_minor_units: autoPriceMinorUnits,
      pricing_source: priceSource,
      price_observed_at_utc: priceObservedAtUtc,
      currency: "USD",
      location,
      status: "pending_intake",
      image_url: effectiveImageUrl,
      back_image_url: effectiveBackImageUrl,
      online_visibility: onlineVisibility,
      kiosk_visibility: kioskVisibility,
      pos_visibility: posVisibility,
      square_catalog_item_id: squareCatalogItemId,
      square_catalog_variation_id: squareCatalogVariationId,
      square_location_id: cleanExternalId(input.square_location_id ?? squareLocationId),
      external_sync_state: "pending",
      created_by_user_id: session.user.id,
      created_by_user_name: session.user.name,
      updated_by_user_id: session.user.id,
      updated_by_user_name: session.user.name,
      source: "queued",
    }))

    const operations = []
    mergeInventoryLocation(database, inventoryLocations, location, now)

    for (const item of items) {
      inventoryItems.push(item)
      saveInventoryItem(database, item, now)
      const operation = appendQueueOperation(database, queue, "inventory_intake", item.public_id, {
        item: publicInventoryItem(item),
        actor_id: session.user.id,
        actor_name: session.user.name,
        sync_intent: syncIntent,
        pricing: {
          source: priceSource,
          observed_at_utc: priceObservedAtUtc,
          suggested_price_minor_units: suggestedPriceMinorUnits,
          auto_price_minor_units: autoPriceMinorUnits,
          minimum_sale_price_minor_units: minimumSalePriceMinorUnits,
          final_price_minor_units: finalPriceMinorUnits,
          override_reason: priceOverrideReason,
          reference_variant_id: effectiveReferenceVariantId,
          provider_variant_id: effectiveProviderVariantId,
        },
        wordpress_acceptance_required: true,
      }, now)
      operations.push(operation)
    }

    const autoSyncResults = []

    if (wordpressInventoryPush) {
      for (const operation of operations) {
        autoSyncResults.push(await pushInventoryIntakeOperation(operation))
      }
    }

    const publicItems = items.map(publicInventoryItem)

    return {
      status: "ok",
      item: publicItems[0],
      items: publicItems,
      quantity_added: quantity,
      wordpress_acceptance_required: true,
      wordpress_auto_sync_performed: autoSyncResults.length > 0,
      wordpress_accepted_count: autoSyncResults.filter((result) => result.status === "accepted").length,
      wordpress_retry_count: autoSyncResults.filter((result) => result.status === "retry").length,
      auto_sync_results: autoSyncResults,
      local_queue_depth: pendingQueueOperations(queue).length,
      label_print_deferred: true,
    }
  }

  async function updateInventoryItem(token, publicId, input = {}) {
    const session = requireWorkspaceAccess(token, "Inventory")

    if (session.status !== "ok") {
      return session
    }

    const requestedPublicId = cleanPublicId(publicId ?? input.public_id ?? input.inventory_public_id)
    const item = inventoryItems.find((candidate) =>
      candidate.public_id === requestedPublicId ||
      cleanPublicId(candidate.wordpress_public_id) === requestedPublicId ||
      (requestedPublicId && cleanBarcode(candidate.barcode) === requestedPublicId),
    )

    if (!item) {
      return blocked("inventory_item_not_found", "No cached inventory item matched that inventory ID.")
    }

    const nextBarcode = cleanBarcode(input.barcode ?? item.barcode)

    if (
      Object.prototype.hasOwnProperty.call(input, "barcode") &&
      nextBarcode &&
      nextBarcode.toLowerCase() !== cleanBarcode(item.barcode).toLowerCase() &&
      !scannerBarcodeLengthAllowed(nextBarcode)
    ) {
      return blocked(
        "barcode_too_long_for_scanner",
        `Barcode ${nextBarcode} is ${nextBarcode.length} characters. Scanner-safe barcodes must be ${SCANNER_BARCODE_MAX_LENGTH} characters or less.`,
      )
    }
    const duplicateBarcode = nextBarcode
      ? inventoryItems.find((candidate) =>
          candidate.public_id !== item.public_id &&
          cleanBarcode(candidate.barcode).toLowerCase() === nextBarcode.toLowerCase(),
        )
      : null

    if (duplicateBarcode) {
      return blocked("duplicate_barcode", "Another cached inventory item already uses that barcode.")
    }

    let nextStatus = localInventoryStatus(input.status) ?? item.status
    const nextPriceMinorUnits = roundSalePriceMinorUnits(
      Math.max(
        0,
        minorUnits(
          input.price_minor_units ??
            input.sale_price_minor_units ??
            input.priceMinorUnits ??
            input.salePriceMinorUnits ??
            item.price_minor_units,
        ),
      ),
    )
    const nextMinimumSalePriceMinorUnits = Math.max(
      0,
      minorUnits(
        input.minimum_sale_price_minor_units ??
          input.minimumSalePriceMinorUnits ??
          input.minimum_price_minor_units ??
          input.minimumPriceMinorUnits ??
          item.minimum_sale_price_minor_units ??
          nextPriceMinorUnits,
      ),
    )

    if (nextPriceMinorUnits < nextMinimumSalePriceMinorUnits) {
      return blocked("sale_price_below_minimum", "Sale price cannot be lower than the inventory floor price.")
    }

    const nextLocation = cleanInventoryLocation(input.location ?? input.location_label ?? item.location) || item.location
    let nextOnlineVisibility = cleanVisibility(input.online_visibility ?? item.online_visibility, "visible")
    let nextKioskVisibility = cleanVisibility(input.kiosk_visibility ?? item.kiosk_visibility, "visible")
    let nextPosVisibility = cleanVisibility(input.pos_visibility ?? item.pos_visibility, "visible")
    let quantityUpdate = resolveInventoryQuantityUpdate(input, inventoryQuantityOnHand(item))

    if (quantityUpdate.status !== "ok") {
      return quantityUpdate
    }

    if (
      quantityUpdate.quantity_update_mode === "unchanged" &&
      ["sold", "removed"].includes(nextStatus) &&
      inventoryQuantityOnHand(item) > 0 &&
      !inventoryQuantityUpdateInputProvided(input)
    ) {
      quantityUpdate = {
        status: "ok",
        previous_quantity_on_hand: inventoryQuantityOnHand(item),
        quantity_on_hand: 0,
        quantity_delta: -inventoryQuantityOnHand(item),
        quantity_update_mode: "absolute",
      }
    }

    if (
      quantityUpdate.quantity_update_mode !== "unchanged" &&
      quantityUpdate.quantity_on_hand <= 0 &&
      ["available", "reserved", "pending_intake"].includes(nextStatus) &&
      !inventoryStatusUpdateInputProvided(input)
    ) {
      nextStatus = "removed"
      if (!visibilityUpdateInputProvided(input, "online")) {
        nextOnlineVisibility = "hidden"
      }
      if (!visibilityUpdateInputProvided(input, "kiosk")) {
        nextKioskVisibility = "hidden"
      }
      if (!visibilityUpdateInputProvided(input, "pos")) {
        nextPosVisibility = "hidden"
      }
    }

    if (
      quantityUpdate.quantity_update_mode !== "unchanged" &&
      quantityUpdate.quantity_on_hand > 0 &&
      ["removed", "sold"].includes(nextStatus) &&
      !inventoryStatusUpdateInputProvided(input)
    ) {
      nextStatus = "available"
      if (!visibilityUpdateInputProvided(input, "online")) {
        nextOnlineVisibility = "visible"
      }
      if (!visibilityUpdateInputProvided(input, "kiosk")) {
        nextKioskVisibility = "visible"
      }
      if (!visibilityUpdateInputProvided(input, "pos")) {
        nextPosVisibility = "visible"
      }
    }

    const syncIntent = cleanExternalId(input.sync_intent ?? input.syncIntent) || "staff_inventory_update"
    const updateReason = cleanReason(input.reason ?? input.update_reason ?? "staff inventory update")
    const previousQuantityOnHand = inventoryQuantityOnHand(item)
    const priceUpdateProvided = inventoryPriceUpdateInputProvided(input)
    const priceUpdateChanged =
      nextPriceMinorUnits !== item.price_minor_units ||
      nextMinimumSalePriceMinorUnits !== (item.minimum_sale_price_minor_units ?? item.price_minor_units)
    const shouldConsolidateQuantityGroup =
      quantityUpdate.quantity_update_mode === "absolute" &&
      shouldConsolidateInventoryQuantityGroup(input)
    const consolidationItems = shouldConsolidateQuantityGroup
      ? inventoryItems.filter((candidate) =>
          candidate.public_id !== item.public_id &&
          candidate.status === "available" &&
          sameInventoryStockBucket(candidate, item),
        )
      : []
    const previousConsolidatedQuantityOnHand =
      previousQuantityOnHand +
      consolidationItems.reduce((total, candidate) => total + inventoryQuantityOnHand(candidate), 0)
    const effectiveQuantityUpdate = shouldConsolidateQuantityGroup
      ? {
          ...quantityUpdate,
          previous_quantity_on_hand: previousConsolidatedQuantityOnHand,
          quantity_delta: quantityUpdate.quantity_on_hand - previousConsolidatedQuantityOnHand,
        }
      : quantityUpdate
    const unchanged =
      nextStatus === item.status &&
      nextPriceMinorUnits === item.price_minor_units &&
      nextMinimumSalePriceMinorUnits === (item.minimum_sale_price_minor_units ?? item.price_minor_units) &&
      nextLocation === item.location &&
      (nextBarcode || item.barcode) === item.barcode &&
      effectiveQuantityUpdate.quantity_on_hand === previousQuantityOnHand &&
      consolidationItems.length === 0 &&
      nextOnlineVisibility === item.online_visibility &&
      nextKioskVisibility === item.kiosk_visibility &&
      nextPosVisibility === item.pos_visibility

    if (unchanged) {
      return {
        status: "ok",
        action: "inventory_item_unchanged",
        item: publicInventoryItem(item),
        operation: null,
        previous_quantity_on_hand: previousQuantityOnHand,
        quantity_on_hand: previousQuantityOnHand,
        quantity_delta: 0,
        quantity_update_mode: "unchanged",
        consolidated_count: 0,
        consolidated_items: [],
        wordpress_acceptance_required: false,
        wordpress_auto_sync_performed: false,
        wordpress_accepted_count: 0,
        wordpress_retry_count: 0,
        auto_sync_results: [],
        local_queue_depth: pendingQueueOperations(queue).length,
        no_changes_detected: true,
      }
    }

    item.status = nextStatus
    item.price_minor_units = nextPriceMinorUnits
    item.minimum_sale_price_minor_units = nextMinimumSalePriceMinorUnits
    if (priceUpdateProvided && priceUpdateChanged) {
      item.pricing_source = "manual_price_override"
      item.price_observed_at_utc = now().toISOString()
    }
    item.location = nextLocation
    item.barcode = nextBarcode || item.barcode
    item.quantity_on_hand = effectiveQuantityUpdate.quantity_on_hand
    item.online_visibility = nextOnlineVisibility
    item.kiosk_visibility = nextKioskVisibility
    item.pos_visibility = nextPosVisibility
    item.source = "queued"
    item.external_sync_state = "pending"
    item.updated_by_user_id = session.user.id
    item.updated_by_user_name = session.user.name
    item.row_version += 1
    saveInventoryItem(database, item, now)
    mergeInventoryLocation(database, inventoryLocations, nextLocation, now)

    const consolidatedOperations = []
    const consolidatedItems = []

    for (const duplicate of consolidationItems) {
      const duplicatePreviousQuantityOnHand = inventoryQuantityOnHand(duplicate)

      duplicate.status = "removed"
      duplicate.quantity_on_hand = 0
      duplicate.online_visibility = "hidden"
      duplicate.kiosk_visibility = "hidden"
      duplicate.pos_visibility = "hidden"
      duplicate.source = "queued"
      duplicate.external_sync_state = "pending"
      duplicate.updated_by_user_id = session.user.id
      duplicate.updated_by_user_name = session.user.name
      duplicate.row_version += 1
      saveInventoryItem(database, duplicate, now)
      consolidatedItems.push(duplicate)

      consolidatedOperations.push(
        appendQueueOperation(database, queue, "inventory_update", duplicate.public_id, {
          item: publicInventoryItem(duplicate),
          inventory_public_id: cleanPublicId(duplicate.wordpress_public_id) || duplicate.public_id,
          local_inventory_public_id: duplicate.public_id,
          barcode: duplicate.barcode,
          status: duplicate.status,
          location: duplicate.location,
          price_minor_units: duplicate.price_minor_units,
          sale_price_minor_units: duplicate.price_minor_units,
          minimum_sale_price_minor_units: duplicate.minimum_sale_price_minor_units,
          pricing_source: duplicate.pricing_source,
          previous_quantity_on_hand: duplicatePreviousQuantityOnHand,
          quantity_on_hand: 0,
          quantity_delta: -duplicatePreviousQuantityOnHand,
          quantity_update_mode: "absolute",
          online_visibility: duplicate.online_visibility,
          kiosk_visibility: duplicate.kiosk_visibility,
          pos_visibility: duplicate.pos_visibility,
          actor_id: session.user.id,
          actor_name: session.user.name,
          reason: `${updateReason}; consolidated duplicate stock into ${item.public_id}`,
          sync_intent: "staff_inventory_group_consolidation",
          wordpress_acceptance_required: true,
        }, now),
      )
    }

    const operation = appendQueueOperation(database, queue, "inventory_update", item.public_id, {
      item: publicInventoryItem(item),
      inventory_public_id: cleanPublicId(item.wordpress_public_id) || item.public_id,
      local_inventory_public_id: item.public_id,
      barcode: item.barcode,
      status: item.status,
      location: item.location,
      price_minor_units: item.price_minor_units,
      sale_price_minor_units: item.price_minor_units,
      minimum_sale_price_minor_units: item.minimum_sale_price_minor_units,
      pricing_source: item.pricing_source,
      previous_quantity_on_hand: effectiveQuantityUpdate.previous_quantity_on_hand,
      quantity_on_hand: effectiveQuantityUpdate.quantity_on_hand,
      quantity_delta: effectiveQuantityUpdate.quantity_delta,
      quantity_update_mode: effectiveQuantityUpdate.quantity_update_mode,
      online_visibility: item.online_visibility,
      kiosk_visibility: item.kiosk_visibility,
      pos_visibility: item.pos_visibility,
      actor_id: session.user.id,
      actor_name: session.user.name,
      reason: updateReason,
      sync_intent: syncIntent,
      wordpress_acceptance_required: true,
    }, now)

    const autoSyncResults = []

    if (wordpressInventoryUpdatePush) {
      for (const syncOperation of [...consolidatedOperations, operation]) {
        autoSyncResults.push(await pushInventoryUpdateOperation(syncOperation))
      }
    }

    return {
      status: "ok",
      action: "inventory_item_updated",
      item: publicInventoryItem(item),
      operation: {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        sync_status: operation.sync_status,
      },
      previous_quantity_on_hand: effectiveQuantityUpdate.previous_quantity_on_hand,
      quantity_on_hand: effectiveQuantityUpdate.quantity_on_hand,
      quantity_delta: effectiveQuantityUpdate.quantity_delta,
      quantity_update_mode: effectiveQuantityUpdate.quantity_update_mode,
      consolidated_count: consolidatedItems.length,
      consolidated_items: consolidatedItems.map(publicInventoryItem),
      wordpress_acceptance_required: true,
      wordpress_auto_sync_performed: autoSyncResults.length > 0,
      wordpress_accepted_count: autoSyncResults.filter((result) => result.status === "accepted").length,
      wordpress_retry_count: autoSyncResults.filter((result) => result.status === "retry").length,
      auto_sync_results: autoSyncResults,
      local_queue_depth: pendingQueueOperations(queue).length,
      credentials_synced_to_client: false,
    }
  }

  async function finalizeSquarePosSale(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Inventory")

    if (session.status !== "ok") {
      return session
    }

    const squareReceiptReference = cleanExternalId(
      input.square_receipt_reference ??
        input.squareReceiptReference ??
        input.square_ticket_reference ??
        input.squareTicketReference ??
        input.square_order_id ??
        input.squareOrderId ??
        input.external_order_id ??
        input.externalOrderId,
    )
    const squareOrderId = cleanExternalId(input.square_order_id ?? input.squareOrderId ?? input.external_order_id ?? "")
    const saleTotalMinorUnits = Math.max(0, minorUnits(input.sale_total_minor_units ?? input.saleTotalMinorUnits))
    const syncIntent =
      cleanExternalId(input.sync_intent ?? input.syncIntent) || "square_pos_exact_inventory_sale"
    const scanInputs = normalizeSquareSaleScanInputs(input)

    if (!squareReceiptReference) {
      return blocked("square_reference_required", "A Square receipt, ticket, or order reference is required before removing inventory.")
    }

    if (scanInputs.length === 0) {
      return blocked("square_sale_inventory_required", "Scan or select at least one inventory barcode before finalizing a Square sale.")
    }

    const matchedItems = []
    const seenPublicIds = new Set()

    for (const scan of scanInputs) {
      const item = findInventoryItemBySaleScan(inventoryItems, scan)

      if (!item) {
        return blocked("inventory_item_not_found", `No cached inventory item matched scan ${scan}.`)
      }

      if (seenPublicIds.has(item.public_id)) {
        continue
      }

      const status = localInventoryStatus(item.status)

      if (!["available", "reserved"].includes(status)) {
        return blocked(
          "inventory_unavailable_for_square_sale",
          `${item.card_name} is ${item.status || "not available"} and cannot be finalized as sold.`,
        )
      }

      seenPublicIds.add(item.public_id)
      matchedItems.push(item)
    }

    const soldAtUtc = now().toISOString()
    const operations = []

    for (const item of matchedItems) {
      const previousQuantityOnHand = inventoryQuantityOnHand(item)
      item.status = "sold"
      item.quantity_on_hand = 0
      item.source = "queued"
      item.external_sync_state = "pending"
      item.updated_by_user_id = session.user.id
      item.updated_by_user_name = session.user.name
      item.row_version += 1
      saveInventoryItem(database, item, now)

      const operation = appendQueueOperation(database, queue, "square_pos_sale", item.public_id, {
        inventory_public_id: cleanPublicId(item.wordpress_public_id) || item.public_id,
        local_inventory_public_id: item.public_id,
        barcode: item.barcode,
        square_receipt_reference: squareReceiptReference,
        square_order_id: squareOrderId,
        sale_total_minor_units: saleTotalMinorUnits,
        sale_price_minor_units: Math.max(0, minorUnits(item.price_minor_units)),
        previous_quantity_on_hand: previousQuantityOnHand,
        quantity_on_hand: 0,
        quantity_delta: -previousQuantityOnHand,
        quantity_update_mode: "absolute",
        actor_id: session.user.id,
        actor_name: session.user.name,
        sold_at_utc: soldAtUtc,
        sync_intent: syncIntent,
      }, now)
      operations.push(operation)
    }

    const autoSyncResults = []

    if (wordpressInventorySalePush) {
      for (const operation of operations) {
        autoSyncResults.push(await pushSquareSaleOperation(operation))
      }
    }

    return {
      status: "ok",
      action: "square_pos_sale_finalized",
      finalized_count: matchedItems.length,
      items: matchedItems.map(publicInventoryItem),
      operations: operations.map((operation) => ({
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        sync_status: operation.sync_status,
      })),
      square_receipt_reference: squareReceiptReference,
      square_order_id: squareOrderId,
      wordpress_acceptance_required: true,
      wordpress_auto_sync_performed: autoSyncResults.length > 0,
      wordpress_accepted_count: autoSyncResults.filter((result) => result.status === "accepted").length,
      wordpress_retry_count: autoSyncResults.filter((result) => result.status === "retry").length,
      auto_sync_results: autoSyncResults,
      local_queue_depth: pendingQueueOperations(queue).length,
      source_of_truth: "tcg_store_platform",
      square_payment_capture_supported: false,
      plugin_square_payment_capture_supported: false,
      payment_capture_authority: "official_woocommerce_square_extension",
      provider_inventory_write_deferred: true,
      credentials_synced_to_client: false,
    }
  }

  function createKioskOrder(input = {}) {
    cleanupExpiredLocalHolds()
    const firstName = cleanName(input.first_name)
    const lastName = cleanName(input.last_name)
    const customerPublicId = cleanPublicId(input.customer_public_id ?? input.customerPublicId)
    const customerLookup = cleanName(
      input.customer_lookup ?? input.customerLookup ?? input.customer_phone ?? input.customerPhone,
    )
    const publicIds = Array.isArray(input.inventory_public_ids) ? input.inventory_public_ids : []

    if (!firstName || !lastName || publicIds.length === 0) {
      return blocked("invalid_kiosk_order", "First name, last name, and at least one item are required.")
    }

    const selectedItems = []

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

      if (cleanVisibility(item.kiosk_visibility, "visible") !== "visible") {
        return blocked("inventory_hidden_from_kiosk", "That inventory item is not visible to kiosk pickup ordering.", {
          item: publicInventoryItem(item),
        })
      }

      selectedItems.push(item)
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
      payment_status: "pay_at_store",
      square_receipt_reference: "",
      square_order_id: "",
      paid_at_utc: "",
      paid_by_user_id: "",
      customer_public_id: customerPublicId,
      customer_lookup: customerLookup,
      picked_item_ids: [],
      reservation_ids: reservations.map((reservation) => reservation.reservation_id),
      items: selectedItems.map(kioskOrderItemSnapshot),
      hold_expires_at_utc: earliestReservationExpiry(reservations),
      created_at_utc: now().toISOString(),
      updated_at_utc: now().toISOString(),
    }

    kioskOrders.push(order)
    saveKioskOrder(database, order)
    appendQueueOperation(database, queue, "kiosk_order", order.order_id, order, now)

    return {
      status: "ok",
      order: publicKioskOrder(order),
      reservations,
    }
  }

  function listKioskOrders(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Kiosk")

    if (session.status !== "ok") {
      return session
    }

    const expiryCleanup = cleanupExpiredLocalHolds()

    const limit = boundedInt(input.limit, 1, 100, 25)
    const statuses = Array.isArray(input.statuses)
      ? input.statuses.map(cleanKioskOrderStatus).filter(Boolean)
      : []
    const orders = kioskOrders
      .filter((order) => statuses.length === 0 || statuses.includes(cleanKioskOrderStatus(order.status)))
      .sort((a, b) => String(b.created_at_utc).localeCompare(String(a.created_at_utc)))
      .slice(0, limit)
      .map(publicKioskOrder)

    return {
      status: "ok",
      orders,
      order_count: orders.length,
      total_order_count: kioskOrders.length,
      expired_hold_count: expiryCleanup.expired_order_count,
      released_inventory_count: expiryCleanup.released_inventory_count,
      shared_queue_source: "local_sync_server",
      wordpress_acceptance_required: true,
      fulfillment_notifications: publicFulfillmentNotificationSettings(),
      credentials_synced_to_client: false,
    }
  }

  function getFulfillmentNotifications(token) {
    const session = requireWorkspaceAccess(token, "Kiosk")

    if (session.status !== "ok") {
      return session
    }

    return {
      status: "ok",
      action: "fulfillment_notification_settings",
      fulfillment_notifications: publicFulfillmentNotificationSettings(),
      employee_only: true,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function updateKioskOrderCustomer(token, orderId, input = {}) {
    const session = requireWorkspaceAccess(token, "Customers")

    if (session.status !== "ok") {
      return session
    }

    const order = kioskOrders.find((candidate) => candidate.order_id === cleanPublicId(orderId))

    if (!order) {
      return blocked("kiosk_order_not_found", "No shared kiosk pickup order matched that order ID.")
    }

    applyKioskOrderCustomer(order, input)
    order.updated_at_utc = now().toISOString()
    saveKioskOrder(database, order)

    return {
      status: "ok",
      order: publicKioskOrder(order),
      shared_queue_source: "local_sync_server",
      customer_profile_linked: cleanPublicId(order.customer_public_id) !== "",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function updateKioskOrderStatus(token, orderId, input = {}) {
    const session = requireWorkspaceAccess(token, "Kiosk")

    if (session.status !== "ok") {
      return session
    }

    const order = kioskOrders.find((candidate) => candidate.order_id === cleanPublicId(orderId))

    if (!order) {
      return blocked("kiosk_order_not_found", "No shared kiosk pickup order matched that order ID.")
    }

    const requestedStatus = kioskOrderStatusSlug(input.status)
    const nextStatus = cleanKioskOrderStatus(requestedStatus)

    if (!["queued", "accepted", "pulling", "ready", "completed", "expired"].includes(requestedStatus)) {
      return blocked("invalid_kiosk_order_status", "Use queued, accepted, pulling, ready, completed, or expired for kiosk pickup status.")
    }

    if (nextStatus === "completed" && order.payment_status !== "paid") {
      return blocked("kiosk_payment_required", "Enter the Square receipt and confirm payment before completing this pickup.")
    }

    if (
      ["ready", "completed"].includes(nextStatus) &&
      cleanPickedItemIds(order.picked_item_ids, order.items).length < cleanKioskOrderItems(order.items).length
    ) {
      return blocked("kiosk_items_not_picked", "Check off every card before marking this order ready or completed.")
    }

    order.status = nextStatus
    order.updated_at_utc = now().toISOString()
    saveKioskOrder(database, order)

    return {
      status: "ok",
      order: publicKioskOrder(order),
      shared_queue_source: "local_sync_server",
      wordpress_status_sync_deferred: true,
      inventory_mutation_performed: false,
    }
  }

  function updateKioskOrderPicks(token, orderId, input = {}) {
    const session = requireWorkspaceAccess(token, "Kiosk")

    if (session.status !== "ok") {
      return session
    }

    const order = kioskOrders.find((candidate) => candidate.order_id === cleanPublicId(orderId))

    if (!order) {
      return blocked("kiosk_order_not_found", "No shared kiosk pickup order matched that order ID.")
    }

    order.picked_item_ids = cleanPickedItemIds(input.picked_item_ids ?? input.pickedItemIds, order.items)
    if (order.picked_item_ids.length > 0 && ["queued", "accepted"].includes(order.status)) {
      order.status = "pulling"
    }
    order.updated_at_utc = now().toISOString()
    saveKioskOrder(database, order)

    return {
      status: "ok",
      order: publicKioskOrder(order),
      shared_queue_source: "local_sync_server",
      inventory_mutation_performed: false,
    }
  }

  async function updateKioskOrderPayment(token, orderId, input = {}) {
    const session = requireWorkspaceAccess(token, "Kiosk")

    if (session.status !== "ok") {
      return session
    }

    const order = kioskOrders.find((candidate) => candidate.order_id === cleanPublicId(orderId))

    if (!order) {
      return blocked("kiosk_order_not_found", "No shared kiosk pickup order matched that order ID.")
    }

    if (order.payment_status === "paid") {
      return {
        status: "ok",
        order: publicKioskOrder(order),
        payment_notification: "already_paid",
        square_payment_capture_performed: false,
        inventory_sale_finalized: true,
      }
    }

    const squareReceiptReference = cleanExternalId(
      input.square_receipt_reference ?? input.squareReceiptReference,
    )
    const squareOrderId = cleanExternalId(input.square_order_id ?? input.squareOrderId)

    if (!squareReceiptReference || input.cashier_confirmed !== true) {
      return blocked(
        "square_payment_confirmation_required",
        "Enter the Square receipt or ticket reference and confirm the cashier completed payment.",
      )
    }

    applyKioskOrderCustomer(order, input)

    const saleResult = await finalizeSquarePosSale(token, {
      inventory_public_ids: cleanKioskOrderItems(order.items).map((item) => item.public_id),
      square_receipt_reference: squareReceiptReference,
      square_order_id: squareOrderId,
      sale_total_minor_units: publicKioskOrder(order).total_minor_units,
    })

    if (saleResult.status !== "ok") {
      return saleResult
    }

    order.payment_status = "paid"
    order.square_receipt_reference = squareReceiptReference
    order.square_order_id = squareOrderId
    order.paid_at_utc = now().toISOString()
    order.paid_by_user_id = session.user.id
    order.status = order.picked_item_ids.length > 0 ? "pulling" : "accepted"
    order.updated_at_utc = now().toISOString()
    saveKioskOrder(database, order)

    return {
      status: "ok",
      order: publicKioskOrder(order),
      sale: saleResult,
      payment_notification: "paid_at_store_confirmed",
      square_payment_capture_performed: false,
      inventory_sale_finalized: true,
    }
  }

  function applyKioskOrderCustomer(order, input = {}) {
    const rawCustomerPublicId = cleanPublicId(
      input.customer_public_id ?? input.customerPublicId ?? input.customer_id ?? input.customerId,
    )
    const matchedCustomer = rawCustomerPublicId
      ? customers.find(
          (customer) =>
            cleanPublicId(customer.customer_public_id) === rawCustomerPublicId ||
            String(customer.wordpress_customer_id ?? "") === rawCustomerPublicId,
        )
      : null
    const customerPublicId = matchedCustomer?.customer_public_id ?? rawCustomerPublicId
    const customerLookup = cleanName(
      input.customer_lookup ??
        input.customerLookup ??
        input.customer_phone ??
        input.customerPhone ??
        matchedCustomer?.lookup ??
        matchedCustomer?.email,
    )

    if (customerPublicId) {
      order.customer_public_id = customerPublicId
    }

    if (customerLookup) {
      order.customer_lookup = customerLookup
    }
  }

  async function listFulfillmentOrders(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Kiosk")

    if (session.status !== "ok") {
      return session
    }

    const limit = boundedInt(input.limit, 1, 100, 25)
    const statuses = cleanFulfillmentStatusList(input.statuses)
    const refreshRequested = input.refresh !== false && input.refresh !== "false" && input.refresh !== "0"
    let wordpressPullResult = null
    let wordpressPullBlocked = null

    if (refreshRequested && wordpressFulfillmentPull) {
      wordpressPullResult = await wordpressFulfillmentPull({
        limit,
        statuses: statuses.length > 0 ? statuses : ["processing", "completed", "on-hold"],
      })

      if (wordpressPullResult.status === "ok") {
        if (wordpressPullResult.fulfillment_notifications) {
          Object.assign(
            fulfillmentNotifications,
            cleanFulfillmentNotificationSettings(wordpressPullResult.fulfillment_notifications),
            { source: "wordpress_fulfillment_settings" },
          )
        }

        for (const order of wordpressPullResult.orders ?? []) {
          const normalizedOrder = localFulfillmentOrderFromWordPress(order, now)

          if (!normalizedOrder) {
            continue
          }

          const existingIndex = fulfillmentOrders.findIndex((candidate) => candidate.order_id === normalizedOrder.order_id)

          if (existingIndex >= 0) {
            fulfillmentOrders[existingIndex] = {
              ...fulfillmentOrders[existingIndex],
              ...normalizedOrder,
              source: "wordpress",
              updated_at_utc: now().toISOString(),
            }
            saveFulfillmentOrder(database, fulfillmentOrders[existingIndex])
          } else {
            fulfillmentOrders.push(normalizedOrder)
            saveFulfillmentOrder(database, normalizedOrder)
          }
        }
      } else {
        wordpressPullBlocked = {
          code: wordpressPullResult.code,
          message: wordpressPullResult.message,
          http_status: wordpressPullResult.http_status ?? 0,
        }
      }
    }

    const orders = fulfillmentOrders
      .filter((order) => statuses.length === 0 || statuses.includes(cleanFulfillmentStatus(order.fulfillment_status)))
      .sort((a, b) => String(b.created_at_utc).localeCompare(String(a.created_at_utc)))
      .slice(0, limit)
      .map(publicFulfillmentOrder)

    return {
      status: "ok",
      orders,
      order_count: orders.length,
      total_order_count: fulfillmentOrders.length,
      shared_queue_source: "local_sync_server",
      website_pickup_source: "woocommerce_local_pickup",
      payment_required_before_fulfillment: true,
      wordpress_refresh_performed: Boolean(wordpressPullResult),
      wordpress_refresh_blocked: wordpressPullBlocked,
      wordpress_fulfillment_pull_connected: Boolean(wordpressFulfillmentPull),
      wordpress_fulfillment_status_push_connected: Boolean(wordpressFulfillmentStatusPush),
      fulfillment_notifications: publicFulfillmentNotificationSettings(),
      credentials_synced_to_client: false,
    }
  }

  async function updateFulfillmentOrderStatus(token, orderId, input = {}) {
    const session = requireWorkspaceAccess(token, "Kiosk")

    if (session.status !== "ok") {
      return session
    }

    const numericOrderId = positiveInt(orderId)
    const requestedStatus = cleanFulfillmentStatus(input.status)

    if (!numericOrderId) {
      return blocked("fulfillment_order_id_required", "A WooCommerce order ID is required.")
    }

    if (!requestedStatus) {
      return blocked("invalid_fulfillment_status", "Use awaiting_pull, pulling, ready_for_pickup, or completed.")
    }

    const existingOrder = fulfillmentOrders.find((candidate) => candidate.order_id === numericOrderId)
    const localFallback = existingOrder ?? {
      order_id: numericOrderId,
      order_number: String(numericOrderId),
      customer_name: "Website pickup customer",
      order_status: "processing",
      fulfillment_status: requestedStatus,
      payment_status: "paid",
      shipping_method_id: "local_pickup",
      shipping_method_title: "Local pickup",
      local_pickup: true,
      item_count: 0,
      total_minor_units: 0,
      currency: "USD",
      paid_at_utc: "",
      created_at_utc: now().toISOString(),
      updated_at_utc: now().toISOString(),
      items: [],
      source: "queued",
      picked_item_ids: [],
    }

    if (
      ["ready_for_pickup", "completed"].includes(requestedStatus) &&
      cleanPickedItemIds(localFallback.picked_item_ids, localFallback.items).length <
        cleanFulfillmentOrderItems(localFallback.items).length
    ) {
      return blocked("fulfillment_items_not_picked", "Check off every card before marking this order ready or completed.")
    }

    let pushResult = null
    let statusSyncDeferred = false

    if (wordpressFulfillmentStatusPush) {
      pushResult = await wordpressFulfillmentStatusPush({
        orderId: numericOrderId,
        status: requestedStatus,
      })
    }

    let nextOrder = {
      ...localFallback,
      fulfillment_status: requestedStatus,
      updated_at_utc: now().toISOString(),
      source: pushResult?.status === "ok" ? "wordpress" : "queued",
    }

    if (pushResult?.status === "ok" && pushResult.order) {
      nextOrder = localFulfillmentOrderFromWordPress(pushResult.order, now) ?? nextOrder
      nextOrder.picked_item_ids = cleanPickedItemIds(localFallback.picked_item_ids, nextOrder.items)
      nextOrder.updated_at_utc = now().toISOString()
      nextOrder.source = "wordpress"
    } else {
      statusSyncDeferred = true
      appendQueueOperation(database, queue, "woocommerce_fulfillment_status", `wc-order-${numericOrderId}`, {
        order_id: numericOrderId,
        status: requestedStatus,
        actor_id: session.user.id,
        sync_intent: "woocommerce_pickup_fulfillment_status",
      }, now)
    }

    const existingIndex = fulfillmentOrders.findIndex((candidate) => candidate.order_id === numericOrderId)
    if (existingIndex >= 0) {
      fulfillmentOrders[existingIndex] = nextOrder
    } else {
      fulfillmentOrders.push(nextOrder)
    }
    saveFulfillmentOrder(database, nextOrder)

    return {
      status: "ok",
      order: publicFulfillmentOrder(nextOrder),
      shared_queue_source: "local_sync_server",
      wordpress_status_sync_deferred: statusSyncDeferred,
      wordpress_status_sync_performed: pushResult?.status === "ok",
      wordpress_status_sync_blocked:
        pushResult && pushResult.status !== "ok"
          ? {
              code: pushResult.code,
              message: pushResult.message,
              http_status: pushResult.http_status ?? 0,
            }
          : null,
      inventory_mutation_performed: false,
      payment_capture_performed: false,
      credentials_synced_to_client: false,
    }
  }

  function updateFulfillmentOrderPicks(token, orderId, input = {}) {
    const session = requireWorkspaceAccess(token, "Kiosk")

    if (session.status !== "ok") {
      return session
    }

    const numericOrderId = positiveInt(orderId)
    const order = fulfillmentOrders.find((candidate) => candidate.order_id === numericOrderId)

    if (!order) {
      return blocked("fulfillment_order_not_found", "No paid website pickup order matched that ID.")
    }

    order.picked_item_ids = cleanPickedItemIds(input.picked_item_ids ?? input.pickedItemIds, order.items)
    if (order.picked_item_ids.length > 0 && order.fulfillment_status === "awaiting_pull") {
      order.fulfillment_status = "pulling"
    }
    order.updated_at_utc = now().toISOString()
    saveFulfillmentOrder(database, order)

    return {
      status: "ok",
      order: publicFulfillmentOrder(order),
      shared_queue_source: "local_sync_server",
      wordpress_status_sync_deferred: true,
      inventory_mutation_performed: false,
    }
  }

  function listTradeInOrders(token, { limit = 50, statuses = [], query = "", staffUserId = "", customer = "" } = {}) {
    const session = requireWorkspaceAccess(token, "Trade-Ins")

    if (session.status !== "ok") {
      return session
    }

    const allowedStatuses = cleanTradeInStatusList(statuses)
    const needle = String(query ?? "").trim().toLowerCase()
    const customerNeedle = String(customer ?? "").trim().toLowerCase()
    const staffNeedle = cleanPublicId(staffUserId)
    const rows = tradeInOrders
      .filter((order) => allowedStatuses.length === 0 || allowedStatuses.includes(order.status))
      .filter((order) => !staffNeedle || cleanPublicId(order.staff_user_id) === staffNeedle)
      .filter((order) => !customerNeedle || cleanName(order.customer_name).toLowerCase().includes(customerNeedle))
      .filter((order) => !needle || tradeInOrderMatchesNeedle(order, needle, users))
      .sort((a, b) => String(b.updated_at_utc).localeCompare(String(a.updated_at_utc)))
      .slice(0, boundedInt(limit, 1, 200, 50))

    return {
      status: "ok",
      orders: rows.map((order) => publicTradeInOrder(order, users)),
      order_count: rows.length,
      total_order_count: tradeInOrders.length,
      shared_queue_source: "local_sync_server",
      sellable_inventory_created_by_draft: false,
      credentials_synced_to_client: false,
    }
  }

  function createTradeInOrder(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Trade-Ins")

    if (session.status !== "ok") {
      return session
    }

    const items = cleanTradeInItems(input.items)

    if (items.length === 0) {
      return blocked("trade_in_items_required", "Add at least one card before saving a trade-in draft.")
    }

      const order = {
      order_id: `trade-${randomUUID()}`,
      customer_name: cleanName(input.customer_name ?? input.customerName) || "Walk-in customer",
      customer_phone: cleanPhone(input.customer_phone ?? input.customerPhone),
      customer_public_id: cleanPublicId(input.customer_public_id ?? input.customerPublicId),
      status: "draft",
      staff_user_id: session.user.id,
      notes: cleanOptionalReason(input.notes),
      customer_id_number: cleanTradeInCustomerIdNumber(input.customer_id_number ?? input.customerIdNumber),
      customer_id_state: cleanTradeInCustomerIdState(input.customer_id_state ?? input.customerIdState),
      customer_id_recorded_at_utc:
        cleanTradeInCustomerIdNumber(input.customer_id_number ?? input.customerIdNumber) &&
        cleanTradeInCustomerIdState(input.customer_id_state ?? input.customerIdState)
          ? now().toISOString()
          : "",
      customer_id_recorded_by_user_id:
        cleanTradeInCustomerIdNumber(input.customer_id_number ?? input.customerIdNumber) &&
        cleanTradeInCustomerIdState(input.customer_id_state ?? input.customerIdState)
          ? session.user.id
          : "",
      items,
      cash_total_minor_units: tradeInTotalMinorUnits(items, "cash"),
      credit_total_minor_units: tradeInTotalMinorUnits(items, "credit"),
      combined_total_minor_units: tradeInTotalMinorUnits(items, "cash") + tradeInTotalMinorUnits(items, "credit"),
      converted_at_utc: "",
      converted_by_user_id: "",
      created_at_utc: now().toISOString(),
      updated_at_utc: now().toISOString(),
    }

    tradeInOrders.push(order)
    saveTradeInOrder(database, order)
    const cashDrawerWarning = cashDrawerWarningForTradeOrder(order)

      return {
        status: "ok",
        order: publicTradeInOrder(order, users),
        cash_drawer_warning: cashDrawerWarning,
        sellable_inventory_created: false,
        shared_queue_source: "local_sync_server",
        credentials_synced_to_client: false,
    }
  }

  function updateTradeInOrder(token, orderId, input = {}) {
    const session = requireWorkspaceAccess(token, "Trade-Ins")

    if (session.status !== "ok") {
      return session
    }

    const publicId = cleanPublicId(orderId)
    const order = tradeInOrders.find((candidate) => candidate.order_id === publicId)

    if (!order) {
      return blocked("trade_in_order_not_found", "No trade-in order matched that ID.")
    }

    const currentStatus = cleanTradeInStatus(order.status) || "draft"

    if (!["draft", "review", "rejected"].includes(currentStatus)) {
      return blocked(
        "trade_in_update_not_allowed",
        "Only draft, review, or rejected trade-in offers can be edited. Approved records are locked as transaction history.",
      )
    }

    const items = cleanTradeInItems(input.items)

    if (items.length === 0) {
      return blocked("trade_in_items_required", "Add at least one card before saving a trade-in draft.")
    }

    order.customer_name = cleanName(input.customer_name ?? input.customerName) || order.customer_name || "Walk-in customer"
    order.customer_phone = cleanPhone(input.customer_phone ?? input.customerPhone)
    order.customer_public_id = cleanPublicId(input.customer_public_id ?? input.customerPublicId)
    order.notes = cleanOptionalReason(input.notes ?? order.notes)
    const nextCustomerIdNumber = cleanTradeInCustomerIdNumber(input.customer_id_number ?? input.customerIdNumber)
    const nextCustomerIdState = cleanTradeInCustomerIdState(input.customer_id_state ?? input.customerIdState)
    if (nextCustomerIdNumber && nextCustomerIdState) {
      order.customer_id_number = nextCustomerIdNumber
      order.customer_id_state = nextCustomerIdState
      order.customer_id_recorded_at_utc = now().toISOString()
      order.customer_id_recorded_by_user_id = session.user.id
    }
    order.items = items
    if (currentStatus === "rejected") {
      order.status = "draft"
      order.notes = order.notes || "Rejected offer reopened for customer review."
    }
    order.cash_total_minor_units = tradeInTotalMinorUnits(items, "cash")
    order.credit_total_minor_units = tradeInTotalMinorUnits(items, "credit")
    order.combined_total_minor_units = order.cash_total_minor_units + order.credit_total_minor_units
    order.updated_at_utc = now().toISOString()
    saveTradeInOrder(database, order)
    const cashDrawerWarning = cashDrawerWarningForTradeOrder(order)

    return {
      status: "ok",
      order: publicTradeInOrder(order, users),
      cash_drawer_warning: cashDrawerWarning,
      sellable_inventory_created: false,
      shared_queue_source: "local_sync_server",
      credentials_synced_to_client: false,
    }
  }

  function updateTradeInOrderStatus(token, orderId, input = {}) {
    const session = requireWorkspaceAccess(token, "Trade-Ins")

    if (session.status !== "ok") {
      return session
    }

    const publicId = cleanPublicId(orderId)
    const nextStatus = cleanTradeInStatus(input.status)
    const order = tradeInOrders.find((candidate) => candidate.order_id === publicId)

    if (!order) {
      return blocked("trade_in_order_not_found", "No trade-in order matched that ID.")
    }

    if (!nextStatus) {
      return blocked("invalid_trade_in_status", "Use draft, review, approved, paid, converted, rejected, or completed.")
    }

    if (nextStatus === "voided") {
      return blocked(
        "trade_in_void_requires_manager_action",
        "Use the manager Void / Reverse action to void a trade-in and reverse store credit.",
        {
          order: publicTradeInOrder(order, users),
          sellable_inventory_created: false,
        },
      )
    }

    const transition = tradeInStatusTransition(order, nextStatus)

    if (transition.status !== "ok") {
      return blocked(transition.code, transition.message, {
        order: publicTradeInOrder(order, users),
        sellable_inventory_created: false,
      })
    }

    const previousStatus = cleanTradeInStatus(order.status) || "draft"
    const idNumberForAcceptance = cleanTradeInCustomerIdNumber(
      input.customer_id_number ?? input.customerIdNumber ?? order.customer_id_number,
    )
    const idStateForAcceptance = cleanTradeInCustomerIdState(
      input.customer_id_state ?? input.customerIdState ?? order.customer_id_state,
    )

    if (nextStatus === "approved" && previousStatus !== "approved") {
      if (!idNumberForAcceptance || !idStateForAcceptance) {
        return blocked(
          "trade_in_customer_id_required",
          "Driver license number and state are required before accepting a trade-in offer.",
          {
            order: publicTradeInOrder(order, users),
            sellable_inventory_created: false,
          },
        )
      }

      order.customer_id_number = idNumberForAcceptance
      order.customer_id_state = idStateForAcceptance
      order.customer_id_recorded_at_utc = now().toISOString()
      order.customer_id_recorded_by_user_id = session.user.id
    }

    order.status = nextStatus
    order.notes = cleanOptionalReason(input.notes ?? order.notes)
    if (nextStatus === "converted" && !order.converted_at_utc) {
      order.converted_at_utc = now().toISOString()
      order.converted_by_user_id = session.user.id
    }
    order.updated_at_utc = now().toISOString()
    saveTradeInOrder(database, order)
    const creditApplication =
      nextStatus === "approved" && previousStatus !== "approved"
        ? applyApprovedTradeInCredit(order, session.user)
        : null
    const cashDrawer =
      nextStatus === "paid" && previousStatus !== "paid"
        ? recordTradeInCashDrawerMovement(order, session.user)
        : null

    return {
      status: "ok",
      order: publicTradeInOrder(order, users),
      credit_application: creditApplication,
      cash_drawer: cashDrawer,
      cash_drawer_warning: cashDrawer?.warning ?? cashDrawerWarningForTradeOrder(order),
      sellable_inventory_created: false,
      shared_queue_source: "local_sync_server",
      credentials_synced_to_client: false,
    }
  }

  function voidTradeInOrder(token, orderId, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const publicId = cleanPublicId(orderId)
    const order = tradeInOrders.find((candidate) => candidate.order_id === publicId)

    if (!order) {
      return blocked("trade_in_order_not_found", "No trade-in order matched that ID.")
    }

    const currentStatus = cleanTradeInStatus(order.status) || "draft"

    if (currentStatus === "voided") {
      return blocked("trade_in_already_voided", "This trade-in has already been voided.", {
        order: publicTradeInOrder(order, users),
        sellable_inventory_created: false,
      })
    }

    const reason = cleanReason(input.reason ?? input.notes ?? "manager trade-in correction")

    if (!reason) {
      return blocked("void_reason_required", "Enter a manager reason before voiding a trade-in record.")
    }

    const items = cleanTradeInItems(order.items)
    const creditItems = items.filter((item) => item.payout_type === "credit")
    const creditTotalMinorUnits = tradeInTotalMinorUnits(creditItems, "credit")
    const existingReversal = creditLedgerEntries.find(
      (entry) => entry.reference_id === order.order_id && entry.entry_type === "trade_in_credit_reversal",
    )
    let customer = null
    let ledgerEntry = null

    if (creditTotalMinorUnits > 0 && !existingReversal) {
      customer = findCustomer(customers, { customer_public_id: order.customer_public_id })

      if (!customer) {
        return blocked("trade_in_customer_not_found", "This trade-in cannot be reversed because no customer profile is attached.", {
          order: publicTradeInOrder(order, users),
          sellable_inventory_created: false,
        })
      }

      if (customer.credit_balance_minor_units < creditTotalMinorUnits) {
        return blocked(
          "insufficient_credit_to_reverse",
          "The customer's current credit balance is lower than the original trade-in credit. Create a manager correction instead.",
          {
            order: publicTradeInOrder(order, users),
            customer: publicCustomer(customer),
            credit_total_minor_units: creditTotalMinorUnits,
            sellable_inventory_created: false,
          },
        )
      }

      const balanceAfterMinorUnits = customer.credit_balance_minor_units - creditTotalMinorUnits
      customer.credit_balance_minor_units = balanceAfterMinorUnits
      customer.row_version += 1
      customer.source = "queued"
      saveCustomer(database, customer, now)

      ledgerEntry = buildCreditLedgerEntry({
        customer,
        entryType: "trade_in_credit_reversal",
        amountMinorUnits: -creditTotalMinorUnits,
        balanceAfterMinorUnits,
        reason: `Voided trade-in ${order.order_id}: ${reason}`,
        source: "manager_trade_void",
        staffUserId: manager.user.id,
        referenceId: order.order_id,
        lineItems: creditItems.map((item) => ({
          type: "trade_in_credit_reversal",
          label: `${item.card_name}${item.set_name ? ` - ${item.set_name}` : ""} (${item.condition})${item.quantity > 1 ? ` x${item.quantity}` : ""}`,
          amount_minor_units: -(item.final_value_minor_units * boundedInt(item.quantity, 1, 999, 1)),
          reference_id: item.item_id,
        })),
        now,
      })

      creditLedgerEntries.push(ledgerEntry)
      saveCreditLedgerEntry(database, ledgerEntry)
      appendQueueOperation(database, queue, "credit_adjustment", ledgerEntry.entry_id, {
        customer: publicCustomer(customer),
        ledger_entry: publicCreditLedgerEntry(ledgerEntry, users),
        trade_in_order: publicTradeInOrder(order, users),
        actor_user_id: manager.user.id,
        manager_user_id: manager.user.id,
        sync_intent: "offline_trade_in_credit_reversal",
      }, now)
    }

    const voidNote = `Voided by ${manager.user.name || manager.user.id}: ${reason}`
    order.status = "voided"
    order.notes = cleanOptionalReason(order.notes ? `${order.notes} | ${voidNote}` : voidNote)
    order.updated_at_utc = now().toISOString()
    saveTradeInOrder(database, order)

    return {
      status: "ok",
      order: publicTradeInOrder(order, users),
      credit_reversal: ledgerEntry ? publicCreditLedgerEntry(ledgerEntry, users) : null,
      customer: customer ? publicCustomer(customer) : null,
      manager_approved: true,
      credit_total_minor_units: creditTotalMinorUnits,
      reversal_already_recorded: Boolean(existingReversal),
      sellable_inventory_created: false,
      shared_queue_source: "local_sync_server",
      credentials_synced_to_client: false,
      wordpress_acceptance_required: Boolean(ledgerEntry),
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
      credit_ledger_entries: creditLedgerEntries.map((entry) => publicCreditLedgerEntry(entry, users)),
      trade_in_orders: tradeInOrders
        .filter((order) =>
          matches.some((customer) => tradeInOrderMatchesCustomer(order, customer, needle)),
        )
        .map((order) => publicTradeInOrder(order, users)),
      kiosk_orders: kioskOrders
        .filter((order) =>
          matches.some((customer) => kioskOrderMatchesCustomer(order, customer, needle)),
        )
        .map(publicKioskOrder),
      checkout_transactions: checkoutTransactions
        .filter((transaction) =>
          matches.some((customer) => checkoutTransactionMatchesCustomer(transaction, customer, needle)),
        )
        .map((transaction) => publicCheckoutTransaction(transaction, users)),
      local_cache_source: "local_sync_server",
      wordpress_ledger_authority: true,
    }
  }

  function createCheckoutTransaction(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Checkout")

    if (session.status !== "ok") {
      return session
    }

    const items = cleanCheckoutTransactionItems(input.items)
    const totalMinorUnits =
      Math.max(0, minorUnits(input.total_minor_units ?? input.totalMinorUnits)) ||
      items.reduce((total, item) => total + item.total_minor_units, 0)
    const creditUsedMinorUnits = Math.max(0, minorUnits(input.credit_used_minor_units ?? input.creditUsedMinorUnits))
    const amountDueMinorUnits = Math.max(0, totalMinorUnits - creditUsedMinorUnits)
    const tenderType = cleanCheckoutTenderType(input.tender_type ?? input.tenderType)
    const requestedCashPaidMinorUnits = Math.max(0, minorUnits(input.cash_paid_minor_units ?? input.cashPaidMinorUnits))
    const requestedCardPaidMinorUnits = Math.max(0, minorUnits(input.card_paid_minor_units ?? input.cardPaidMinorUnits))
    const cashPaidMinorUnits =
      tenderType === "cash"
        ? amountDueMinorUnits
        : tenderType === "split"
          ? Math.min(amountDueMinorUnits, requestedCashPaidMinorUnits)
          : 0
    const cardPaidMinorUnits =
      requestedCardPaidMinorUnits > 0
        ? Math.min(amountDueMinorUnits, requestedCardPaidMinorUnits)
        : tenderType === "cash"
          ? 0
          : Math.max(0, amountDueMinorUnits - cashPaidMinorUnits)
    const changeDueMinorUnits = Math.max(0, minorUnits(input.change_due_minor_units ?? input.changeDueMinorUnits))
    const squareReceiptReference = cleanExternalId(input.square_receipt_reference ?? input.squareReceiptReference)
    const receiptDelivery = cleanReceiptDelivery(input.receipt_delivery ?? input.receiptDelivery)
    const customerPublicId = cleanPublicId(input.customer_public_id ?? input.customerPublicId)
    const customer = customerPublicId
      ? customers.find((candidate) => cleanPublicId(candidate.customer_public_id) === customerPublicId)
      : null
    const customerEmail = cleanEmail(input.customer_email ?? input.customerEmail ?? customer?.email)

    if (items.length === 0) {
      return blocked("checkout_items_required", "Add at least one product or misc line before saving a checkout receipt.")
    }

    if (cardPaidMinorUnits > 0 && !squareReceiptReference) {
      return blocked("checkout_square_receipt_required", "Enter the Square receipt or ticket number before saving a card checkout.")
    }

    if (["email", "both"].includes(receiptDelivery) && !customerEmail) {
      return blocked("checkout_email_required", "Enter an email address before choosing an email receipt.")
    }

    const createdAtUtc = now().toISOString()
    const transaction = {
      transaction_id:
        cleanPublicId(input.transaction_id ?? input.transactionId) ||
        `checkout-${createdAtUtc.replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`,
      customer_public_id: customerPublicId,
      customer_lookup: cleanName(input.customer_lookup ?? input.customerLookup ?? customer?.lookup),
      customer_name: cleanName(input.customer_name ?? input.customerName ?? customer?.display_name) ||
        (input.guest_checkout || input.guestCheckout ? "Guest checkout" : "Customer checkout"),
      customer_email: customerEmail,
      guest_checkout: Boolean(input.guest_checkout ?? input.guestCheckout) || !customerPublicId,
      square_receipt_reference:
        squareReceiptReference ||
        `CASH-${createdAtUtc.replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 6)}`,
      square_order_id: cleanExternalId(input.square_order_id ?? input.squareOrderId),
      source_order_id: cleanExternalId(input.source_order_id ?? input.sourceOrderId),
      source: cleanCheckoutSource(input.source),
      receipt_delivery: receiptDelivery,
      tender_type: tenderType,
      subtotal_minor_units: Math.max(0, minorUnits(input.subtotal_minor_units ?? input.subtotalMinorUnits)) || totalMinorUnits,
      credit_used_minor_units: creditUsedMinorUnits,
      square_due_minor_units:
        Math.max(0, minorUnits(input.square_due_minor_units ?? input.squareDueMinorUnits)) ||
        cardPaidMinorUnits,
      cash_paid_minor_units: cashPaidMinorUnits,
      card_paid_minor_units: cardPaidMinorUnits,
      change_due_minor_units: changeDueMinorUnits,
      total_minor_units: totalMinorUnits,
      currency: cleanCurrency(input.currency),
      items,
      staff_user_id: session.user.id,
      staff_user_name: session.user.name,
      created_at_utc: cleanIsoTimestamp(input.created_at_utc ?? input.createdAtUtc) || createdAtUtc,
      updated_at_utc: createdAtUtc,
    }

    checkoutTransactions.unshift(transaction)
    checkoutTransactions.splice(250)
    saveCheckoutTransaction(database, transaction)
    const cashDrawer = recordCheckoutCashDrawerMovement(transaction, session.user)

    return {
      status: "ok",
      transaction: publicCheckoutTransaction(transaction, users),
      cash_drawer: cashDrawer,
      cash_drawer_warning: cashDrawer?.warning ?? null,
      customer_profile_linked: Boolean(transaction.customer_public_id),
      square_payment_capture_performed: false,
      payment_capture_authority: "square_pos_or_square_terminal",
      email_delivery_queued: ["email", "both"].includes(transaction.receipt_delivery),
      print_receipt_ready: ["print", "both"].includes(transaction.receipt_delivery),
      credentials_synced_to_client: false,
    }
  }

  function getCustomerProfile(token, customerPublicId) {
    const session = requireWorkspaceAccess(token, "Customers")

    if (session.status !== "ok") {
      return session
    }

    const publicId = cleanPublicId(customerPublicId)
    const customer = customers.find((candidate) => cleanPublicId(candidate.customer_public_id) === publicId)

    if (!customer) {
      return blocked("customer_not_found", "No cached customer matched that profile ID.")
    }

    const ledgerEntries = creditLedgerEntries
      .filter((entry) => cleanPublicId(entry.customer_public_id) === customer.customer_public_id)
      .sort((a, b) => String(b.created_at_utc).localeCompare(String(a.created_at_utc)))
    const profileTradeIns = tradeInOrders
      .filter((order) => tradeInOrderMatchesCustomer(order, customer))
      .sort((a, b) => String(b.updated_at_utc).localeCompare(String(a.updated_at_utc)))
    const profileKioskOrders = kioskOrders
      .filter((order) => kioskOrderMatchesCustomer(order, customer))
      .sort((a, b) => String(b.updated_at_utc).localeCompare(String(a.updated_at_utc)))
    const profileCheckoutTransactions = checkoutTransactions
      .filter((transaction) => checkoutTransactionMatchesCustomer(transaction, customer))
      .sort((a, b) => String(b.created_at_utc).localeCompare(String(a.created_at_utc)))
    const tradeInTotals = profileTradeIns.reduce(
      (totals, order) => {
        totals.cash_total_minor_units += tradeInTotalMinorUnits(order.items, "cash")
        totals.credit_total_minor_units += tradeInTotalMinorUnits(order.items, "credit")
        totals.combined_total_minor_units +=
          tradeInTotalMinorUnits(order.items, "cash") + tradeInTotalMinorUnits(order.items, "credit")
        totals[cleanTradeInStatus(order.status) || "draft"] =
          (totals[cleanTradeInStatus(order.status) || "draft"] ?? 0) + 1
        return totals
      },
      {
        cash_total_minor_units: 0,
        credit_total_minor_units: 0,
        combined_total_minor_units: 0,
      },
    )

    return {
      status: "ok",
      customer: publicCustomer(customer),
      credit_ledger_entries: ledgerEntries.map((entry) => publicCreditLedgerEntry(entry, users)),
      trade_in_orders: profileTradeIns.map((order) => publicTradeInOrder(order, users)),
      kiosk_orders: profileKioskOrders.map(publicKioskOrder),
      checkout_transactions: profileCheckoutTransactions.map((transaction) =>
        publicCheckoutTransaction(transaction, users),
      ),
      summary: {
        trade_in_count: profileTradeIns.length,
        checkout_transaction_count: profileCheckoutTransactions.length,
        kiosk_order_count: profileKioskOrders.length,
        completed_kiosk_order_count: profileKioskOrders.filter(
          (order) => cleanKioskOrderStatus(order.status) === "completed",
        ).length,
        ledger_entry_count: ledgerEntries.length,
        credit_balance_minor_units: Math.max(0, minorUnits(customer.credit_balance_minor_units)),
        cash_total_minor_units: tradeInTotals.cash_total_minor_units,
        credit_total_minor_units: tradeInTotals.credit_total_minor_units,
        combined_total_minor_units: tradeInTotals.combined_total_minor_units,
        status_counts: Object.fromEntries(
          ["draft", "review", "approved", "paid", "converted", "rejected", "completed"].map((status) => [
            status,
            tradeInTotals[status] ?? 0,
          ]),
        ),
      },
      local_cache_source: "local_sync_server",
      wordpress_ledger_authority: true,
      credentials_synced_to_client: false,
    }
  }

  function listEvents() {
    return {
      status: "ok",
      events: eventSnapshots.filter((event) => isActiveEventSnapshot(event, now)).map(publicEventSnapshot),
      local_cache_source: "local_sync_server",
      wordpress_event_authority: true,
    }
  }

  async function createEvent(token, input = {}) {
    const session = requireWorkspaceAccess(token, "Events")

    if (session.status !== "ok") {
      return session
    }

    const title = cleanName(input.title)
    const startsAtUtc = cleanDateTime(input.starts_at_utc ?? input.start_datetime ?? input.startsAtUtc)
    const capacity = boundedInt(input.capacity ?? input.player_cap, 1, 10000, 16)
    const entryFeeMinorUnits = Math.max(0, minorUnits(input.entry_fee_minor_units ?? input.price_minor_units))
    const registrationDeadlineUtc =
      cleanDateTime(input.registration_deadline_utc ?? input.registration_deadline) ||
      eventRegistrationDeadline(startsAtUtc, input.registration_close_value, input.registration_close_unit)

    if (!title || !startsAtUtc) {
      return blocked("invalid_event", "Event title and start date/time are required.")
    }

    const event = {
      event_id: `local-event-${randomUUID()}`,
      slug: cleanSlug(input.slug) || cleanSlug(title),
      row_version: 1,
      title,
      starts_at_utc: startsAtUtc,
      starts_at_label: eventStartLabel(startsAtUtc),
      event_type: cleanEventType(input.event_type),
      game: cleanGame(input.game),
      entry_fee_minor_units: entryFeeMinorUnits,
      registration_deadline_utc: registrationDeadlineUtc,
      woocommerce_product_id: 0,
      registration_status: "open",
      capacity,
      registered_count: 0,
      location_label: cleanName(input.location_label ?? input.location) || "The Pug",
      note: cleanOptionalReason(input.description) || "Created in the local app; WordPress remains the event authority.",
      source: "queued",
    }

    eventSnapshots.push(event)
    saveEventSnapshot(database, event, now)
    const operation = appendQueueOperation(database, queue, "event_upsert", event.event_id, {
      event: publicEventSnapshot(event),
      actor_id: session.user.id,
      actor_name: session.user.name,
      sync_intent: "offline_event_create",
    }, now)

    let autoSyncResult = null
    if (wordpressEventUpsertPush) {
      autoSyncResult = await pushEventUpsertOperation(operation)
    }

    return {
      status: "ok",
      event: publicEventSnapshot(event),
      wordpress_acceptance_required: true,
      wordpress_auto_sync_performed: autoSyncResult !== null,
      wordpress_auto_sync_result: autoSyncResult,
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

    const firstName = cleanName(input.first_name)
    const lastName = cleanName(input.last_name)
    const email = cleanEmail(input.email)
    const phone = cleanPhone(input.phone)
    const attendeeLabel =
      cleanName(input.attendee_label) ||
      cleanName(`${firstName} ${lastName}`) ||
      "Offline walk-in"
    const paymentStatus = cleanEventPaymentStatus(input.payment_status)
    const registrationStatus = event.registration_status === "waitlist" ? "waitlist" : "registered"
    const registration = {
      registration_id: `event-registration-${randomUUID()}`,
      event_id: event.event_id,
      attendee_label: attendeeLabel,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
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
    const session = requireWorkspaceAccess(token, "Customers")

    if (session.status !== "ok") {
      return session
    }

    const customer = findCustomer(customers, input)

    if (!customer) {
      return blocked("customer_not_found", "No cached customer matched that customer ID.")
    }

    const amountMinorUnits = minorUnits(input.amount_minor_units)
    const explicitReason = cleanOptionalReason(input.reason)
    const managerApproved = ["manager", "owner"].includes(session.user.role)
    const isStaffRemoval = amountMinorUnits < 0 && !managerApproved

    if (amountMinorUnits === 0) {
      return blocked("invalid_credit_amount", "Credit adjustment amount must be non-zero.")
    }

    if (!managerApproved && amountMinorUnits > 0) {
      return blocked("manager_credit_add_required", "A manager PIN is required to add customer credit.")
    }

    if (isStaffRemoval && !explicitReason) {
      return blocked("credit_removal_reason_required", "A reason is required when removing customer credit.")
    }

    const reason = explicitReason || (managerApproved ? "manager credit adjustment" : "staff credit removal")

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
      source: managerApproved ? "manager_adjustment" : "staff_credit_adjustment",
      staffUserId: session.user.id,
      referenceId: cleanExternalId(input.reference_id ?? input.referenceId) || "manual-credit-adjustment",
      lineItems: [
        {
          type: amountMinorUnits > 0 ? "credit_given" : "adjustment",
          label: reason,
          amount_minor_units: amountMinorUnits,
          reference_id: cleanExternalId(input.reference_id ?? input.referenceId) || "manual-credit-adjustment",
        },
      ],
      now,
    })
    creditLedgerEntries.push(ledgerEntry)
    saveCreditLedgerEntry(database, ledgerEntry)
    appendQueueOperation(database, queue, "credit_adjustment", ledgerEntry.entry_id, {
      customer: publicCustomer(customer),
      ledger_entry: publicCreditLedgerEntry(ledgerEntry, users),
      actor_user_id: session.user.id,
      manager_user_id: managerApproved ? session.user.id : "",
      approval_threshold_minor_units: setupConfig.creditApprovalThresholdMinorUnits,
      sync_intent: "offline_credit_adjustment",
    }, now)

    return {
      status: "ok",
      customer: publicCustomer(customer),
      ledger_entry: publicCreditLedgerEntry(ledgerEntry, users),
      manager_approved: managerApproved,
      approval_required: false,
      approval_threshold_minor_units: setupConfig.creditApprovalThresholdMinorUnits,
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
    const squareReceiptReference = cleanExternalId(
      input.square_receipt_reference ?? input.square_ticket_reference ?? input.square_payment_reference,
    )
    const squareCashierConfirmed =
      input.square_cashier_confirmed === true ||
      input.square_cashier_confirmed === 1 ||
      String(input.square_cashier_confirmed ?? "").trim().toLowerCase() === "true"

    if (amountMinorUnits <= 0) {
      return blocked("invalid_credit_amount", "Credit redemption amount must be greater than zero.")
    }

    if (saleTotalMinorUnits <= 0) {
      return blocked("square_ticket_total_required", "Square ticket total is required before using customer credit.")
    }

    if (saleTotalMinorUnits > 0 && amountMinorUnits > saleTotalMinorUnits) {
      return blocked("credit_exceeds_sale_total", "Credit redemption cannot exceed the Square sale total.")
    }

    if (!squareReceiptReference) {
      return blocked("square_reference_required", "Square receipt or ticket reference is required for customer credit reconciliation.")
    }

    if (!squareCashierConfirmed) {
      return blocked("square_cashier_confirmation_required", "Confirm the credit was applied in Square POS before staging customer credit use.")
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
      staffUserId: session.user.id,
      referenceId: squareReceiptReference,
      lineItems: [
        {
          type: "credit_used",
          label: `Square sale ${squareReceiptReference}`,
          amount_minor_units: -amountMinorUnits,
          sale_total_minor_units: saleTotalMinorUnits,
          square_receipt_reference: squareReceiptReference,
        },
      ],
      now,
    })
    const squareHandoff = buildSquareCreditHandoff(customer, amountMinorUnits, saleTotalMinorUnits, {
      receiptReference: squareReceiptReference,
      cashierConfirmed: squareCashierConfirmed,
      recordedAtUtc: now().toISOString(),
    })

    creditLedgerEntries.push(ledgerEntry)
    saveCreditLedgerEntry(database, ledgerEntry)
    appendQueueOperation(database, queue, "credit_redemption", ledgerEntry.entry_id, {
      customer: publicCustomer(customer),
      ledger_entry: publicCreditLedgerEntry(ledgerEntry, users),
      square_handoff: squareHandoff,
      actor_id: session.user.id,
      sync_intent: "offline_credit_redemption",
    }, now)

    return {
      status: "ok",
      customer: publicCustomer(customer),
      ledger_entry: publicCreditLedgerEntry(ledgerEntry, users),
      square_handoff: squareHandoff,
      wordpress_acceptance_required: true,
      square_payment_capture_supported: false,
    }
  }

  function reserveInventoryItem({ source, publicId, holdReason, actorId }) {
    cleanupExpiredLocalHolds()
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
    item.updated_by_user_id = actorId
    item.updated_by_user_name = userNameById(actorId, users)
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
      expires_at_utc: new Date(now().getTime() + cardHoldSeconds * 1000).toISOString(),
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
    const expiryCleanup = cleanupExpiredLocalHolds()
    const deviceSummary = buildClientDeviceSummary(clientDevices, now, heartbeatTimeoutSeconds)
    const scryDexCatalogStatus = buildScryDexCatalogStatus()

    return {
      status: "ok",
      local_database: "store-sync.sqlite",
      persistence_mode: "sqlite",
      queue_depth: pendingQueueOperations(queue).length,
      queue_summary: buildQueueSummary(queue),
      expired_hold_count: expiryCleanup.expired_order_count,
      released_hold_inventory_count: expiryCleanup.released_inventory_count,
      card_hold_seconds: cardHoldSeconds,
      kiosk_order_count: kioskOrders.length,
      fulfillment_order_count: fulfillmentOrders.length,
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
      wordpress_pull_connected: Boolean(
        wordpressInventoryPull || wordpressEventsPull || wordpressFulfillmentPull || wordpressCatalogExportPull,
      ),
      inventory_source_of_truth: "local_sync_server",
      wordpress_inventory_pull_authority: "manual_remote_authority_only",
      wordpress_catalog_pull_connected: Boolean(wordpressCatalogExportPull),
      wordpress_inventory_pull_connected: Boolean(wordpressInventoryPull),
      wordpress_events_pull_connected: Boolean(wordpressEventsPull),
      wordpress_fulfillment_pull_connected: Boolean(wordpressFulfillmentPull),
      wordpress_reports_pull_connected: Boolean(wordpressReportsPull),
      wordpress_push_connected: Boolean(
        wordpressInventoryPush ||
          wordpressInventorySalePush ||
          wordpressFulfillmentStatusPush ||
          wordpressEventUpsertPush ||
          wordpressEventRegistrationPush ||
          wordpressEventCheckinPush ||
          wordpressCreditPush ||
          wordpressCustomerUpsertPush ||
          wordpressKioskOrderPush,
      ),
      wordpress_inventory_push_connected: Boolean(wordpressInventoryPush),
      wordpress_inventory_sale_push_connected: Boolean(wordpressInventorySalePush),
      wordpress_fulfillment_status_push_connected: Boolean(wordpressFulfillmentStatusPush),
      wordpress_event_upsert_push_connected: Boolean(wordpressEventUpsertPush),
      wordpress_event_registration_push_connected: Boolean(wordpressEventRegistrationPush),
      wordpress_event_checkin_push_connected: Boolean(wordpressEventCheckinPush),
      wordpress_credit_push_connected: Boolean(wordpressCreditPush),
      wordpress_customer_push_connected: Boolean(wordpressCustomerUpsertPush),
      wordpress_kiosk_order_push_connected: Boolean(wordpressKioskOrderPush),
      scrydex_lookup_order: ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"],
      scrydex_fallback_connected: Boolean(websiteCatalogFallback),
      scrydex_catalog_index_connected: Boolean(wordpressCatalogIndexer),
      scrydex_catalog_status: {
        generated_at_utc: scryDexCatalogStatus.generated_at_utc,
        totals: scryDexCatalogStatus.totals,
        indexer_configured: scryDexCatalogStatus.indexer_configured,
        daily_sync_configured: scryDexCatalogStatus.daily_sync_configured,
        catalog_indexer_mode: scryDexCatalogStatus.catalog_indexer_mode,
        local_catalog_indexer_configured: scryDexCatalogStatus.local_catalog_indexer_configured,
        website_catalog_indexer_fallback_configured: scryDexCatalogStatus.website_catalog_indexer_fallback_configured,
        active_job: scryDexCatalogStatus.active_job,
        active_jobs: scryDexCatalogStatus.active_jobs,
        recent_jobs: scryDexCatalogStatus.recent_jobs,
        last_sync: scryDexCatalogStatus.last_sync,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      },
      graded_pricing_provider_connected: gradedPricingProviderConfigured,
      graded_pricing_primary_source: "pricecharting",
      graded_pricing_fallback_source: "scrydex_reference_cache",
      square_catalog_inventory_sync_connected: Boolean(squareCatalogInventorySyncer?.status?.().configured),
      square_catalog_inventory_sync_status: squareCatalogInventorySyncer?.status?.() ?? {
        configured: false,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      },
      square_inventory_count_poller_connected: Boolean(squareInventoryCountsPuller?.status?.().configured),
      square_inventory_count_poller_status: squareInventoryCountsPuller?.status?.() ?? {
        configured: false,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      },
      square_sales_report_puller_connected: Boolean(squareSalesReportsPuller?.status?.().configured),
      square_sales_report_puller_status: squareSalesReportsPuller?.status?.() ?? {
        configured: false,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      },
      last_website_inventory_pull: lastWebsiteInventoryPullResult,
      last_scrydex_catalog_sync: lastScryDexCatalogSyncResult,
      last_square_inventory_reconciliation: lastSquareInventoryReconciliationResult,
      last_square_sales_report_pull: publicSquareSalesReportSnapshot(latestSquareSalesReportSnapshot(), {
        includeRows: false,
      }),
      local_operations_preserved: true,
    }
  }

  function getServerMaintenanceStatus(token) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    return {
      status: "ok",
      action: "server_maintenance_status",
      generated_at_utc: now().toISOString(),
      server: publicServerMaintenanceConfig(),
      sqlite: sqliteMaintenanceStatus(),
      sync_status: syncStatus(),
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
      arbitrary_command_execution_available: false,
    }
  }

  function backupSqliteDatabase(token) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    if (resolvedDatabasePath === ":memory:") {
      return blocked("sqlite_backup_memory_database", "The in-memory test database cannot be backed up to a durable file.")
    }

    const backupDir = resolve(maintenanceRoot, "backups")
    mkdirSync(backupDir, { recursive: true })
    const backupPath = resolve(backupDir, `store-sync-${timestampForFile(now())}.sqlite`)

    database.exec(`VACUUM INTO ${sqliteStringLiteral(backupPath)}`)

    return {
      status: "ok",
      action: "sqlite_backup_created",
      backup_path: backupPath,
      backup_file_name: basename(backupPath),
      backup_size_bytes: fileSizeBytes(backupPath),
      database_path: resolvedDatabasePath,
      requested_by_user_id: manager.user.id,
      requested_by_user_name: manager.user.name,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function checkpointSqliteDatabase(token) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const checkpoint = database.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get()
    database.exec("PRAGMA optimize")

    return {
      status: "ok",
      action: "sqlite_checkpoint_completed",
      checkpoint,
      sqlite: sqliteMaintenanceStatus(),
      requested_by_user_id: manager.user.id,
      requested_by_user_name: manager.user.name,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function pullWebsiteForMaintenance(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const domains = pullDomains(input.domains ?? input.domain)
    const result = await pullWebsiteInventory(token, {
      ...input,
      domains: [...domains],
    })

    return {
      ...result,
      action: result.status === "ok" ? "maintenance_website_pull_completed" : "maintenance_website_pull_blocked",
      requested_by_user_id: manager.user.id,
      requested_by_user_name: manager.user.name,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function syncLocalInventoryToSquare(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    if (!squareCatalogInventorySyncer || typeof squareCatalogInventorySyncer.syncInventoryItem !== "function") {
      return blocked("square_catalog_inventory_syncer_unavailable", "Square catalog/inventory sync is not configured on this LAN server.")
    }

    const requestedIds = new Set(
      []
        .concat(input.inventory_public_ids ?? input.inventoryPublicIds ?? input.inventory_public_id ?? input.inventoryPublicId ?? [])
        .map(cleanPublicId)
        .filter(Boolean),
    )
    const includeZeroQuantity = input.include_zero_quantity === true || input.includeZeroQuantity === true
    const includeHidden = input.include_hidden === true || input.includeHidden === true
    const delayMs = boundedInt(input.delay_ms ?? input.delayMs ?? input.square_sync_delay_ms ?? input.squareSyncDelayMs, 0, 10000, 250)
    const rows = inventoryItems.filter((item) => {
      if (requestedIds.size > 0 && !requestedIds.has(cleanPublicId(item.public_id))) {
        return false
      }

      if (!includeHidden && cleanVisibility(item.pos_visibility, "visible") !== "visible") {
        return false
      }

      if (!["available", "reserved", "pending_intake"].includes(localInventoryStatus(item.status))) {
        return false
      }

      return includeZeroQuantity || inventoryQuantityOnHand(item) > 0
    })
    const results = []

    for (const item of rows) {
      if (results.length > 0 && delayMs > 0) {
        await sleepMs(delayMs)
      }

      const operation = {
        operation_id: `local-square-sync-${item.public_id}-v${boundedInt(item.row_version, 1, 999999999, 1)}`,
        operation_type: "inventory_update",
        entity_id: item.public_id,
        payload: {
          inventory_public_id: cleanPublicId(item.wordpress_public_id) || item.public_id,
          local_inventory_public_id: item.public_id,
          barcode: item.barcode,
          status: item.status,
          quantity_on_hand: inventoryQuantityOnHand(item),
          quantity_update_mode: "absolute",
          sync_intent: "local_inventory_source_of_truth_square_sync",
          source: "maintenance_square_sync_local_inventory",
          actor_id: manager.user.id,
          actor_name: manager.user.name,
          wordpress_acceptance_required: false,
        },
      }

      results.push(await syncSquareCatalogInventoryForOperation(operation, item))
    }

    return {
      status: "ok",
      action: "square_sync_local_inventory",
      source_of_truth: "local_sync_server",
      pushed_count: results.filter((item) => item.status === "accepted").length,
      retry_count: results.filter((item) => item.status === "retry").length,
      skipped_count: results.filter((item) => item.status === "skipped").length,
      considered_count: rows.length,
      delay_ms_between_items: delayMs,
      inventory_public_ids_requested: requestedIds.size,
      include_zero_quantity: includeZeroQuantity,
      include_hidden: includeHidden,
      results,
      requested_by_user_id: manager.user.id,
      requested_by_user_name: manager.user.name,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  function applyServerPatch(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const packageBase64 = String(input.package_base64 ?? input.packageBase64 ?? "").trim()
    const expectedSha256 = cleanSha256(input.sha256 ?? input.package_sha256 ?? input.packageSha256)
    const applyNow = input.apply !== false
    const restartAfterApply = input.restart !== false

    if (!packageBase64) {
      return blocked("server_patch_package_required", "Attach the pug-lan-server.zip package before applying a LAN server patch.")
    }

    let packageBytes
    try {
      packageBytes = Buffer.from(packageBase64, "base64")
    } catch {
      return blocked("server_patch_package_invalid", "The uploaded LAN server package was not valid base64.")
    }

    if (packageBytes.length < 1024 || packageBytes.length > 100 * 1024 * 1024) {
      return blocked("server_patch_package_size_invalid", "The LAN server package size was outside the expected safe range.")
    }

    const actualSha256 = createHash("sha256").update(packageBytes).digest("hex")

    if (expectedSha256 && expectedSha256 !== actualSha256) {
      return blocked("server_patch_sha256_mismatch", "The LAN server package checksum did not match the expected SHA-256.", {
        actual_sha256: actualSha256,
      })
    }

    const patchDir = resolve(maintenanceRoot, "patches")
    mkdirSync(patchDir, { recursive: true })
    const stagedZip = resolve(patchDir, `pug-lan-server-${timestampForFile(now())}.zip`)
    writeFileSync(stagedZip, packageBytes)

    const result = {
      status: "ok",
      action: "server_patch_staged",
      staged_zip_path: stagedZip,
      staged_zip_file_name: basename(stagedZip),
      staged_zip_size_bytes: packageBytes.length,
      sha256: actualSha256,
      server_install_root: serverInstallRoot,
      server_package_root: serverPackageRoot,
      applied: false,
      restart_scheduled: false,
      requested_by_user_id: manager.user.id,
      requested_by_user_name: manager.user.name,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
      arbitrary_command_execution_available: false,
    }

    if (!applyNow) {
      return result
    }

    const installedZip = resolve(serverInstallRoot, "pug-lan-server.zip")
    mkdirSync(serverInstallRoot, { recursive: true })
    copyFileSync(stagedZip, installedZip)
    const applyResult = applyLanServerZip(installedZip, serverPackageRoot)

    if (applyResult.status !== "ok") {
      return {
        ...result,
        status: "blocked",
        action: "server_patch_apply_blocked",
        code: applyResult.code,
        message: applyResult.message,
        stdout_tail: applyResult.stdout_tail,
        stderr_tail: applyResult.stderr_tail,
        applied: false,
      }
    }

    result.action = "server_patch_applied"
    result.installed_zip_path = installedZip
    result.applied = true
    result.apply_stdout_tail = applyResult.stdout_tail
    result.apply_stderr_tail = applyResult.stderr_tail

    if (restartAfterApply) {
      const restartResult = scheduleServerRestartInternal({ delaySeconds: 2, reason: "patch_applied" })
      result.restart_scheduled = restartResult.status === "ok"
      result.restart = restartResult
    }

    return result
  }

  function restartServer(token, input = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    return {
      ...scheduleServerRestartInternal({
        delaySeconds: boundedInt(input.delay_seconds ?? input.delaySeconds, 1, 60, 2),
        reason: cleanName(input.reason) || "manager_requested_restart",
      }),
      requested_by_user_id: manager.user.id,
      requested_by_user_name: manager.user.name,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
      arbitrary_command_execution_available: false,
    }
  }

  function publicServerMaintenanceConfig() {
    return {
      install_root: serverInstallRoot,
      package_root: serverPackageRoot,
      maintenance_root: maintenanceRoot,
      database_path: resolvedDatabasePath,
      port: serverPort,
      process_id: process.pid,
      restart_script_available:
        existsSync(resolve(serverInstallRoot, "Start-Pug-LAN-Server-Hidden.vbs")) ||
        existsSync(resolve(serverInstallRoot, "Start-Pug-LAN-Server.ps1")),
      update_package_expected: "pug-lan-server.zip",
    }
  }

  function sqliteMaintenanceStatus() {
    const pageCount = pragmaInteger(database, "page_count")
    const pageSize = pragmaInteger(database, "page_size")

    return {
      database_path: resolvedDatabasePath,
      page_count: pageCount,
      page_size: pageSize,
      freelist_count: pragmaInteger(database, "freelist_count"),
      approximate_size_bytes: pageCount * pageSize,
      journal_mode: pragmaValue(database, "journal_mode"),
      synchronous: pragmaValue(database, "synchronous"),
      inventory_count: inventoryItems.length,
      reference_card_count: referenceCards.length,
      queue_depth: pendingQueueOperations(queue).length,
    }
  }

  function applyLanServerZip(zipPath, destinationPath) {
    if (patchApplyCommand) {
      return patchApplyCommand({ zipPath, destinationPath })
    }

    mkdirSync(destinationPath, { recursive: true })
    const result = spawnSync(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `Expand-Archive -LiteralPath ${powerShellStringLiteral(zipPath)} -DestinationPath ${powerShellStringLiteral(destinationPath)} -Force`,
      ],
      {
        encoding: "utf8",
        windowsHide: true,
      },
    )

    if (result.status !== 0) {
      return {
        status: "blocked",
        code: "server_patch_expand_failed",
        message: "The LAN server package could not be expanded on the server PC.",
        stdout_tail: tailForMaintenance(result.stdout),
        stderr_tail: tailForMaintenance(result.stderr || result.error?.message),
      }
    }

    return {
      status: "ok",
      stdout_tail: tailForMaintenance(result.stdout),
      stderr_tail: tailForMaintenance(result.stderr),
    }
  }

  function scheduleServerRestartInternal({ delaySeconds, reason }) {
    if (restartCommand) {
      return restartCommand({ delaySeconds, reason, serverInstallRoot, serverPort, processId: process.pid })
    }

    const restartDir = resolve(maintenanceRoot, "restart")
    mkdirSync(restartDir, { recursive: true })
    const scriptPath = resolve(restartDir, `restart-${timestampForFile(now())}.ps1`)
    writeFileSync(scriptPath, restartScriptSource({
      delaySeconds,
      installRoot: serverInstallRoot,
      port: serverPort,
      processId: process.pid,
    }))

    const child = spawn(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      },
    )
    child.unref()

    return {
      status: "ok",
      action: "server_restart_scheduled",
      reason,
      delay_seconds: delaySeconds,
      restart_script_path: scriptPath,
      server_install_root: serverInstallRoot,
      port: serverPort,
      process_id: process.pid,
    }
  }

  function applyApprovedTradeInCredit(order, actorUser) {
    const items = cleanTradeInItems(order.items)
    const creditItems = items.filter((item) => item.payout_type === "credit")
    const creditTotalMinorUnits = tradeInTotalMinorUnits(creditItems, "credit")

    if (creditTotalMinorUnits <= 0) {
      return {
        applied: false,
        code: "trade_in_no_credit_lines",
        message: "Approved trade-in had no store-credit payout lines.",
      }
    }

    const customer = findCustomer(customers, { customer_public_id: order.customer_public_id })

    if (!customer) {
      return {
        applied: false,
        code: "trade_in_customer_not_found",
        message: "Approved trade-in could not apply credit because no customer profile is attached.",
      }
    }

    const existingLedgerEntry = creditLedgerEntries.find(
      (entry) => entry.reference_id === order.order_id && entry.entry_type === "buylist_credit",
    )

    if (existingLedgerEntry) {
      return {
        applied: false,
        code: "trade_in_credit_already_applied",
        message: "Store credit was already applied for this trade-in.",
        customer: publicCustomer(customer),
        ledger_entry: publicCreditLedgerEntry(existingLedgerEntry, users),
        idempotent: true,
      }
    }

    const balanceAfterMinorUnits = customer.credit_balance_minor_units + creditTotalMinorUnits
    customer.credit_balance_minor_units = balanceAfterMinorUnits
    customer.row_version += 1
    customer.source = "queued"
    saveCustomer(database, customer, now)

    const ledgerEntry = buildCreditLedgerEntry({
      customer,
      entryType: "buylist_credit",
      amountMinorUnits: creditTotalMinorUnits,
      balanceAfterMinorUnits,
      reason: `Trade-in ${order.order_id} approved for store credit`,
      source: "trade_in_approval",
      staffUserId: actorUser.id,
      referenceId: order.order_id,
      lineItems: creditItems.map((item) => ({
        type: "trade_in_credit",
        label: `${item.card_name}${item.set_name ? ` - ${item.set_name}` : ""} (${item.condition})${item.quantity > 1 ? ` x${item.quantity}` : ""}`,
        amount_minor_units: item.final_value_minor_units * boundedInt(item.quantity, 1, 999, 1),
        reference_id: item.item_id,
      })),
      now,
    })

    creditLedgerEntries.push(ledgerEntry)
    saveCreditLedgerEntry(database, ledgerEntry)
    appendQueueOperation(database, queue, "credit_adjustment", ledgerEntry.entry_id, {
      customer: publicCustomer(customer),
      ledger_entry: publicCreditLedgerEntry(ledgerEntry, users),
      trade_in_order: publicTradeInOrder(order, users),
      actor_user_id: actorUser.id,
      manager_user_id: "",
      approval_threshold_minor_units: setupConfig.creditApprovalThresholdMinorUnits,
      sync_intent: "offline_trade_in_credit_application",
    }, now)

    return {
      applied: true,
      code: "trade_in_credit_applied",
      message: "Store credit was applied to the customer profile.",
      customer: publicCustomer(customer),
      ledger_entry: publicCreditLedgerEntry(ledgerEntry, users),
      credit_total_minor_units: creditTotalMinorUnits,
      wordpress_acceptance_required: true,
    }
  }

  function latestSquareSalesReportSnapshot() {
    return squareSalesReportSnapshots[0] ?? null
  }

  function squareSalesReportRows(filters, { includeMatched = false } = {}) {
    const snapshot = latestSquareSalesReportSnapshot()

    if (!snapshot) {
      return []
    }

    return snapshot.rows
      .filter((row) => includeMatched || row.local_reconciliation_status !== "matched_local_operation")
      .filter((row) => reportDateMatches(row.date, filters))
      .filter((row) => !filters.channel || row.channel === filters.channel)
      .filter((row) => !filters.game || cleanGame(row.game) === filters.game)
      .filter((row) => !filters.product_type || row.product_type === filters.product_type)
      .filter((row) => !filters.condition || cleanCondition(row.condition) === filters.condition)
      .map((row) => ({
        date: row.date,
        channel: row.channel,
        staff_user_id: row.staff_user_id,
        staff_user_name: row.staff_user_name,
        product_type: row.product_type,
        game: row.game,
        set_name: row.set_name,
        condition: row.condition,
        card_name: row.card_name || row.item_name,
        item_name: row.item_name,
        sku: row.sku,
        barcode: row.barcode,
        square_catalog_variation_id: row.square_catalog_variation_id,
        payment_id: row.payment_id,
        order_id: row.order_id,
        receipt_number: row.receipt_number,
        receipt_url: row.receipt_url,
        payment_method: row.payment_method,
        payment_status: row.payment_status,
        quantity: row.quantity,
        gross_sales: row.gross_sales,
        gross_sales_minor_units: row.gross_sales_minor_units,
        source: row.source,
        local_reconciliation_status: row.local_reconciliation_status,
        square_sales_snapshot_id: snapshot.snapshot_id,
      }))
  }

  function squareSalesSummaryRowsForReconciliation(snapshot, filters) {
    if (!snapshot) {
      return []
    }

    return snapshot.summary_by_item
      .filter((row) => !filters.game || cleanGame(row.game) === filters.game)
      .filter((row) => !filters.product_type || row.product_type === filters.product_type)
      .map((row) => ({
        date: reportDate(snapshot.pulled_at_utc),
        channel: "square_pos",
        item_name: row.item_name,
        sku: row.sku,
        barcode: row.barcode,
        square_catalog_variation_id: row.square_catalog_variation_id,
        quantity: row.quantity,
        square_api_gross_sales: row.gross_sales,
        square_api_gross_sales_minor_units: row.gross_sales_minor_units,
        square_api_line_item_count: row.line_item_count,
        local_reconciliation_status: row.local_reconciliation_status,
        local_available_quantity: row.local_available_quantity,
        local_sold_quantity: row.local_sold_quantity,
        square_sales_snapshot_id: snapshot.snapshot_id,
        payment_capture_authority: "square_payments_api_read_only",
        inventory_authority: "tcg_store_platform",
        customer_credit_authority: "local_store_credit_ledger_not_square",
      }))
  }

  function buildLocalManagerReport(report, rawFilters = {}) {
    const reportKey = localReportKey(report)
    const filters = cleanLocalReportFilters(rawFilters)
    const rows = localReportRows(reportKey, filters)
    const pagedRows = paginateReportRows(rows, filters.page, filters.page_size)
    const meta = buildLocalReportMeta(reportKey, filters, rows)

    return {
      status: "ok",
      action: "manager_report_pulled",
      report: reportKey,
      report_status: "live_local",
      code: "local_reports_ok",
      http_status: 200,
      plan: {
        report: reportKey,
        capability: "view_reports",
        public: false,
        filters,
        source: "local_sync_server",
      },
      rows: pagedRows,
      meta,
      dashboard_plan: {
        capability: "view_reports",
        public: false,
        charts: meta.charts,
        kpi_cards: meta.kpi_cards,
        summary_cards: meta.summary_cards,
        filters,
      },
      csv_header: csvHeaderFromRows(pagedRows),
      wordpress_reports_pull_connected: false,
      local_reports_fallback_used: true,
      credentials_synced_to_client: false,
      authorization_header_printed: false,
    }
  }

  function localReportRows(reportKey, filters) {
    if (reportKey === "customers") {
      return customerReportRows(filters)
    }

    if (reportKey === "sales") {
      return salesReportRows(filters)
    }

    if (reportKey === "trade_ins") {
      return tradeInReportRows(filters)
    }

    if (reportKey === "fulfillment") {
      return fulfillmentReportRows(filters)
    }

    if (reportKey === "scrydex") {
      return scryDexReportRows(filters)
    }

    if (reportKey === "square_reconciliation") {
      return squareReconciliationReportRows(filters)
    }

    if (reportKey === "audit") {
      return auditReportRows(filters)
    }

    return inventoryReportRows(filters)
  }

  function customerReportRows(filters) {
    return customers
      .filter((customer) => !filters.customer_id || customer.customer_public_id === filters.customer_id || String(customer.wordpress_customer_id ?? "") === filters.customer_id)
      .map((customer) => {
        const ledgerRows = creditLedgerEntries.filter((entry) => entry.customer_public_id === customer.customer_public_id)
        const profileTradeIns = tradeInOrders.filter((order) => tradeInOrderMatchesCustomer(order, customer))
        const creditGiven = ledgerRows
          .filter((entry) => entry.amount_minor_units > 0)
          .reduce((total, entry) => total + entry.amount_minor_units, 0)
        const creditUsed = ledgerRows
          .filter((entry) => entry.amount_minor_units < 0)
          .reduce((total, entry) => total + Math.abs(entry.amount_minor_units), 0)

        return {
          customer_public_id: customer.customer_public_id,
          customer_id: customer.wordpress_customer_id ?? "",
          customer_name: customer.display_name,
          email: customer.email,
          lookup: customer.lookup,
          credit_balance: formatMoney(customer.credit_balance_minor_units, customer.credit_currency),
          credit_balance_minor_units: customer.credit_balance_minor_units,
          credit_given: formatMoney(creditGiven, customer.credit_currency),
          credit_used: formatMoney(creditUsed, customer.credit_currency),
          trade_in_count: profileTradeIns.length,
          ledger_entry_count: ledgerRows.length,
          status: customer.status,
          source: customer.source,
        }
      })
  }

  function salesReportRows(filters) {
    const soldInventoryRows = inventoryItems
      .filter((item) => item.status === "sold")
      .filter((item) => reportInventoryMatches(item, filters))
      .map((item) => ({
        date: "",
        channel: "square_pos",
        staff_user_id: item.updated_by_user_id || item.created_by_user_id,
        staff_user_name: item.updated_by_user_name || item.created_by_user_name,
        product_type: item.raw_or_graded === "graded" ? "graded" : "singles",
        game: item.game,
        set_name: item.set_name,
        condition: item.condition,
        card_name: item.card_name,
        quantity: 1,
        gross_sales: formatMoney(item.price_minor_units, item.currency),
        gross_sales_minor_units: item.price_minor_units,
        source: "local_square_pos",
      }))
    const kioskRows = kioskOrders
      .filter((order) => ["paid", "completed", "ready"].includes(order.status) || order.payment_status === "paid")
      .filter((order) => reportDateMatches(order.paid_at_utc || order.updated_at_utc || order.created_at_utc, filters))
      .map((order) => ({
        date: reportDate(order.paid_at_utc || order.updated_at_utc || order.created_at_utc),
        channel: "kiosk",
        staff_user_id: "",
        staff_user_name: "",
        product_type: "singles",
        game: "",
        set_name: "",
        condition: "",
        card_name: order.customer_name,
        quantity: order.item_count,
        gross_sales: formatMoney(order.total_minor_units, order.currency),
        gross_sales_minor_units: order.total_minor_units,
        source: "kiosk_pickup",
      }))
    const websiteRows = fulfillmentOrders
      .filter((order) => reportDateMatches(order.paid_at_utc || order.created_at_utc, filters))
      .map((order) => ({
        date: reportDate(order.paid_at_utc || order.created_at_utc),
        channel: order.local_pickup ? "local_pickup" : "online",
        staff_user_id: "",
        staff_user_name: "",
        product_type: "woocommerce",
        game: "",
        set_name: "",
        condition: "",
        card_name: order.order_number,
        quantity: order.item_count,
        gross_sales: formatMoney(order.total_minor_units, order.currency),
        gross_sales_minor_units: order.total_minor_units,
        source: order.source,
      }))
    const squareReportRows = squareSalesReportRows(filters, { includeMatched: false })

    return [...soldInventoryRows, ...kioskRows, ...websiteRows, ...squareReportRows]
      .filter((row) => !filters.channel || row.channel === filters.channel)
      .filter((row) => !filters.staff_user_id || cleanPublicId(row.staff_user_id) === filters.staff_user_id)
      .filter((row) => !filters.game || cleanGame(row.game) === filters.game)
  }

  function inventoryReportRows(filters) {
    const groups = new Map()
    for (const item of inventoryItems.filter((candidate) => reportInventoryMatches(candidate, filters))) {
      const key = [
        cleanGame(item.game),
        item.raw_or_graded === "graded" ? "graded" : "singles",
        cleanCondition(item.condition),
        cleanName(item.grading_company),
        cleanName(item.grade),
        item.status,
      ].join("|")
      const current = groups.get(key) ?? {
        game: cleanGame(item.game),
        product_type: item.raw_or_graded === "graded" ? "graded" : "singles",
        condition: cleanCondition(item.condition),
        grading_company: cleanName(item.grading_company),
        grade: cleanName(item.grade),
        status: item.status,
        quantity: 0,
        inventory_value_minor_units: 0,
        inventory_value: "$0.00",
        reserved_inventory: 0,
        low_stock: 0,
      }
      current.quantity += 1
      current.inventory_value_minor_units += item.price_minor_units
      current.inventory_value = formatMoney(current.inventory_value_minor_units, item.currency)
      current.reserved_inventory += item.status === "reserved" ? 1 : 0
      current.low_stock += item.status === "available" ? 0 : 1
      groups.set(key, current)
    }

    return [...groups.values()].sort((a, b) => String(a.game).localeCompare(String(b.game)))
  }

  function tradeInReportRows(filters) {
    return tradeInOrders
      .filter((order) => reportDateMatches(order.updated_at_utc || order.created_at_utc, filters))
      .filter((order) => !filters.staff_user_id || cleanPublicId(order.staff_user_id) === filters.staff_user_id)
      .filter((order) => !filters.order_status || cleanTradeInStatus(order.status) === filters.order_status)
      .filter((order) => !filters.customer_id || cleanPublicId(order.customer_public_id) === filters.customer_id)
      .filter((order) => !filters.game || cleanTradeInItems(order.items).some((item) => cleanGame(item.game) === filters.game))
      .map((order) => ({
        date: reportDate(order.updated_at_utc || order.created_at_utc),
        order_id: order.order_id,
        customer_public_id: order.customer_public_id,
        customer_name: order.customer_name,
        staff_user_id: order.staff_user_id,
        staff_user_name: userNameById(order.staff_user_id, users),
        status: cleanTradeInStatus(order.status),
        item_count: cleanTradeInItems(order.items).reduce(
          (total, item) => total + boundedInt(item.quantity, 1, 999, 1),
          0,
        ),
        cash_given: formatMoney(tradeInTotalMinorUnits(order.items, "cash"), "USD"),
        credit_given: formatMoney(tradeInTotalMinorUnits(order.items, "credit"), "USD"),
        final_value: formatMoney(
          tradeInTotalMinorUnits(order.items, "cash") + tradeInTotalMinorUnits(order.items, "credit"),
          "USD",
        ),
        cash_total_minor_units: tradeInTotalMinorUnits(order.items, "cash"),
        credit_total_minor_units: tradeInTotalMinorUnits(order.items, "credit"),
        combined_total_minor_units:
          tradeInTotalMinorUnits(order.items, "cash") + tradeInTotalMinorUnits(order.items, "credit"),
      }))
  }

  function fulfillmentReportRows(filters) {
    return [
      ...fulfillmentOrders.map((order) => ({
        date: reportDate(order.updated_at_utc || order.created_at_utc),
        source: "woocommerce",
        order_id: order.order_id,
        customer_name: order.customer_name,
        status: order.fulfillment_status,
        payment_status: order.payment_status,
        item_count: order.item_count,
        total: formatMoney(order.total_minor_units, order.currency),
        total_minor_units: order.total_minor_units,
      })),
      ...kioskOrders.map((order) => ({
        date: reportDate(order.updated_at_utc || order.created_at_utc),
        source: "kiosk",
        order_id: order.order_id,
        customer_name: order.customer_name,
        status: order.status,
        payment_status: order.payment_status,
        item_count: order.item_count,
        total: formatMoney(order.total_minor_units, order.currency),
        total_minor_units: order.total_minor_units,
      })),
    ]
      .filter((row) => reportDateMatches(row.date, filters))
      .filter((row) => !filters.order_status || String(row.status) === filters.order_status)
  }

  function scryDexReportRows(filters) {
    const groups = new Map()
    for (const card of referenceCards.filter((row) => !filters.game || cleanGame(row.game) === filters.game)) {
      const key = `${cleanGame(card.game)}|${cleanName(card.set_name)}`
      const current = groups.get(key) ?? {
        game: cleanGame(card.game),
        set_name: cleanName(card.set_name),
        card_count: 0,
        price_coverage_count: 0,
        image_coverage_count: 0,
      }
      current.card_count += 1
      current.price_coverage_count += minorUnits(card.market_price_minor_units) > 0 ? 1 : 0
      current.image_coverage_count += cleanHttpUrl(card.image_url) ? 1 : 0
      groups.set(key, current)
    }

    return [...groups.values()].slice(0, 250)
  }

  function squareReconciliationReportRows(filters) {
    const squareOperations = queue.filter((operation) => operation.operation_type === "square_pos_sale")
    const snapshot = latestSquareSalesReportSnapshot()
    const squareRows = squareSalesReportRows(filters, { includeMatched: true })
    const squareOnlyRows = squareRows.filter((row) => row.local_reconciliation_status !== "matched_local_operation")
    const squareSummaryRows = squareSalesSummaryRowsForReconciliation(snapshot, filters)

    return [
      {
        date: reportDate(now().toISOString()),
        channel: "square_pos",
        transaction_count: squareOperations.length,
        square_api_payment_count: snapshot?.payment_count ?? 0,
        square_api_line_item_count: squareRows.length,
        square_api_unmatched_line_item_count: squareOnlyRows.length,
        square_api_gross_sales: formatMoney(snapshot?.gross_sales_minor_units ?? 0, snapshot?.currency ?? "USD"),
        square_api_gross_sales_minor_units: snapshot?.gross_sales_minor_units ?? 0,
        square_sales_snapshot_id: snapshot?.snapshot_id ?? "",
        square_sales_pulled_at_utc: snapshot?.pulled_at_utc ?? "",
        sold_inventory_count: inventoryItems.filter((item) => item.status === "sold").length,
        pending_queue_count: squareOperations.filter((operation) => operation.sync_status === "pending").length,
        accepted_queue_count: squareOperations.filter((operation) => operation.sync_status === "accepted").length,
        payment_capture_authority: "square_payments_api_read_only",
        inventory_authority: "tcg_store_platform",
        customer_credit_authority: "local_store_credit_ledger_not_square",
      },
      ...squareSummaryRows,
    ].filter((row) => !filters.channel || row.channel === filters.channel)
  }

  function auditReportRows(filters) {
    return queue
      .filter((operation) => reportDateMatches(operation.queued_at_utc, filters))
      .filter((operation) => !filters.source || String(operation.operation_type).includes(filters.source))
      .map((operation) => ({
        date: reportDate(operation.queued_at_utc),
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        sync_status: operation.sync_status,
        staff_user_id: cleanPublicId(operation.payload?.actor_id ?? operation.payload?.actor_user_id),
        staff_user_name: userNameById(operation.payload?.actor_id ?? operation.payload?.actor_user_id, users),
      }))
  }

  function buildLocalReportMeta(reportKey, filters, rows) {
    const salesRows = salesReportRows(filters)
    const tradeRows = tradeInReportRows(filters)
    const inventoryRows = inventoryReportRows(filters)
    const customerRows = customerReportRows(filters)
    const grossSalesMinorUnits = salesRows.reduce((total, row) => total + minorUnits(row.gross_sales_minor_units), 0)
    const inventoryValueMinorUnits = inventoryRows.reduce((total, row) => total + minorUnits(row.inventory_value_minor_units), 0)
    const creditBalanceMinorUnits = customerRows.reduce((total, row) => total + minorUnits(row.credit_balance_minor_units), 0)
    const tradeCreditMinorUnits = tradeRows.reduce((total, row) => total + minorUnits(row.credit_total_minor_units), 0)
    const tradeCashMinorUnits = tradeRows.reduce((total, row) => total + minorUnits(row.cash_total_minor_units), 0)

    return {
      source: "local_sync_server",
      generated_at_utc: now().toISOString(),
      selected_report: reportKey,
      filters,
      total_rows: rows.length,
      page: filters.page,
      page_size: filters.page_size,
      summary_cards: [
        {
          label: "Gross sales",
          value: formatMoney(grossSalesMinorUnits, "USD"),
          detail: `${salesRows.length} local sale row(s) from Square, kiosk, and Woo pickup cache.`,
          tone: "ready",
        },
        {
          label: "Inventory value",
          value: formatMoney(inventoryValueMinorUnits, "USD"),
          detail: `${inventoryItems.length} local inventory item(s), grouped by game/type/condition.`,
          tone: "ready",
        },
        {
          label: "Credit liability",
          value: formatMoney(creditBalanceMinorUnits, "USD"),
          detail: `${customers.length} customer profile(s) with local-store-only credit.`,
          tone: "warning",
        },
        {
          label: "Trade-in payouts",
          value: formatMoney(tradeCashMinorUnits + tradeCreditMinorUnits, "USD"),
          detail: `${tradeRows.length} trade-in transaction row(s); cash ${formatMoney(tradeCashMinorUnits, "USD")}, credit ${formatMoney(tradeCreditMinorUnits, "USD")}.`,
          tone: "ready",
        },
      ],
      charts: localReportCharts(salesRows, tradeRows, inventoryRows),
      kpi_cards: [
        {
          label: "Employee accountability",
          value: `${new Set(tradeRows.map((row) => row.staff_user_id).filter(Boolean)).size} active staff`,
          detail: "Trade-ins, inventory intake, and credit ledger rows carry staff IDs.",
        },
        {
          label: "Credit redemption",
          value: formatMoney(
            creditLedgerEntries
              .filter((entry) => entry.amount_minor_units < 0)
              .reduce((total, entry) => total + Math.abs(entry.amount_minor_units), 0),
            "USD",
          ),
          detail: "Customer credit can only be redeemed by staff with a Square receipt reference.",
        },
        {
          label: "Pickup queue",
          value: `${fulfillmentOrders.length + kioskOrders.length} order(s)`,
          detail: "WooCommerce pickup and kiosk orders are tracked separately but shown in one fulfillment report.",
        },
      ],
    }
  }

  function localReportCharts(salesRows, tradeRows, inventoryRows) {
    return [
      {
        key: "employee_intake_vs_sales",
        label: "Employee intake vs sales",
        type: "bar",
        format: "money",
        labels: users.map((user) => user.name),
        series: [
          {
            label: "Trade-in value",
            values: users.map((user) =>
              tradeRows
                .filter((row) => row.staff_user_id === user.id)
                .reduce((total, row) => total + minorUnits(row.combined_total_minor_units), 0),
            ),
          },
          {
            label: "Sales",
            values: users.map((user) =>
              salesRows
                .filter((row) => row.staff_user_id === user.id)
                .reduce((total, row) => total + minorUnits(row.gross_sales_minor_units), 0),
            ),
          },
        ],
      },
      {
        key: "online_vs_in_store_sales",
        label: "Online vs in-store sales",
        type: "line",
        format: "money",
        labels: ["online", "local_pickup", "square_pos", "kiosk"],
        series: [
          {
            label: "Gross sales",
            values: ["online", "local_pickup", "square_pos", "kiosk"].map((channel) =>
              salesRows
                .filter((row) => row.channel === channel)
                .reduce((total, row) => total + minorUnits(row.gross_sales_minor_units), 0),
            ),
          },
        ],
      },
      {
        key: "trade_in_cash_vs_credit",
        label: "Trade-in cash vs credit",
        type: "stacked_bar",
        format: "money",
        labels: ["Cash", "Credit"],
        series: [
          {
            label: "Payouts",
            values: [
              tradeRows.reduce((total, row) => total + minorUnits(row.cash_total_minor_units), 0),
              tradeRows.reduce((total, row) => total + minorUnits(row.credit_total_minor_units), 0),
            ],
          },
        ],
      },
      {
        key: "inventory_by_game",
        label: "Inventory value by game",
        type: "bar",
        format: "money",
        labels: [...new Set(inventoryRows.map((row) => row.game || "other"))],
        series: [
          {
            label: "Inventory value",
            values: [...new Set(inventoryRows.map((row) => row.game || "other"))].map((game) =>
              inventoryRows
                .filter((row) => (row.game || "other") === game)
                .reduce((total, row) => total + minorUnits(row.inventory_value_minor_units), 0),
            ),
          },
        ],
      },
    ]
  }

  async function getManagerReport(token, { report = "inventory", filters = {} } = {}) {
    const manager = requireManager(token)

    if (manager.status !== "ok") {
      return manager
    }

    const reportKey = localReportKey(report)
    if (squareSalesReportRefreshRequested(reportKey, filters)) {
      await pullSquareSalesReportSnapshot({
        actorId: manager.user.id,
        actorName: manager.user.name,
        input: filters,
      })
    }

    const localReport = buildLocalManagerReport(report, filters)

    if (!wordpressReportsPull) {
      return localReport
    }

    const result = await wordpressReportsPull({ report, filters })
    const wordpressRows = Array.isArray(result.rows) ? result.rows : []

    if (result.status !== "ok" || wordpressRows.length === 0) {
      return {
        ...localReport,
        code: result.status === "ok" ? "local_reports_used_with_wordpress_plan" : "local_reports_fallback_after_wordpress_blocked",
        http_status: result.http_status ?? localReport.http_status,
        report_status: result.status === "ok" ? "live_local_with_wordpress_plan" : "live_local_wordpress_blocked",
        meta: {
          ...localReport.meta,
          wordpress_report_status: result.status ?? "blocked",
          wordpress_report_code: result.code ?? "wordpress_reports_pull_failed",
          wordpress_report_message: result.message ?? "",
          wordpress_rows_returned: wordpressRows.length,
          wordpress_plan: result.plan ?? null,
        },
        dashboard_plan: result.dashboard_plan ?? localReport.dashboard_plan,
        wordpress_reports_pull_connected: true,
      }
    }

    return {
      status: "ok",
      action: "manager_report_pulled",
      report: result.report ?? localReportKey(report),
      report_status: result.report_status ?? "planned",
      code: result.code ?? "wordpress_reports_pull_ok",
      http_status: result.http_status ?? 200,
      plan: result.plan ?? {},
      rows: wordpressRows,
      meta: {
        ...(result.meta ?? {}),
        local_summary_cards: localReport.meta.summary_cards,
        local_charts: localReport.meta.charts,
        local_kpi_cards: localReport.meta.kpi_cards,
        local_rows_available: localReport.meta.total_rows,
      },
      dashboard_plan: result.dashboard_plan ?? localReport.dashboard_plan,
      csv_header: result.csv_header || localReport.csv_header,
      wordpress_reports_pull_connected: true,
      credentials_synced_to_client: false,
      authorization_header_printed: false,
    }
  }

  async function pullWebsiteInventory(token, input = {}) {
    const session = requireSession(token)

    if (session.status !== "ok") {
      return session
    }

    return pullWebsiteInventoryForSystem(input)
  }

  async function pullWebsiteInventoryForSystem(input = {}) {
    if (!wordpressInventoryPull && !wordpressEventsPull && !wordpressFulfillmentPull && !wordpressCatalogExportPull) {
      return blocked("wordpress_pull_unavailable", "WordPress pull is not configured on this LAN server.")
    }

    const requestedDomains = pullDomains(input.domains ?? input.domain)
    const inventoryRemoteAuthority = wordpressInventoryRemoteAuthority(input)
    const inventoryPullSkippedRemoteAuthority =
      requestedDomains.has("inventory") && Boolean(wordpressInventoryPull) && !inventoryRemoteAuthority
    const shouldPullInventory = requestedDomains.has("inventory") && Boolean(wordpressInventoryPull) && inventoryRemoteAuthority
    const shouldPullEvents = requestedDomains.has("events") && Boolean(wordpressEventsPull)
    const shouldPullFulfillment = requestedDomains.has("fulfillment") && Boolean(wordpressFulfillmentPull)
    const shouldPullCatalog = requestedDomains.has("catalog") && Boolean(wordpressCatalogExportPull)
    let inventoryPullResult = null
    let eventPullResult = null
    let fulfillmentPullResult = null
    let catalogPullResult = null

    const appliedItems = []
    let insertedCount = 0
    let updatedCount = 0
    let ignoredCount = 0
    let unchangedCount = 0
    let reconciledPendingCount = 0
    let remoteQuantityIncreaseIgnoredCount = 0
    const squareSyncResults = []
    const shouldSyncWebsitePulledToSquare =
      input.square_sync !== false &&
      input.sync_square !== false &&
      Boolean(squareCatalogInventorySyncer?.status?.().configured)
    const allowRemoteInventoryQuantityIncrease = wordpressInventoryPullAllowsQuantityIncrease(input)

    if (shouldPullInventory) {
      inventoryPullResult = await wordpressInventoryPull({
        query: input.query,
        page: input.page,
        pageSize: input.page_size ?? input.pageSize,
        updatedAfter: input.updated_after ?? input.updatedAfter,
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
        const pulledHasQuantity = wordpressInventoryRowHasQuantity(row)

        if (!pulledItem) {
          ignoredCount += 1
          continue
        }

        const existingIndex = inventoryItems.findIndex(
          (candidate) =>
            candidate.public_id === pulledItem.public_id ||
            cleanPublicId(candidate.wordpress_public_id) === cleanPublicId(pulledItem.public_id) ||
            (cleanBarcode(candidate.barcode) && cleanBarcode(candidate.barcode) === cleanBarcode(pulledItem.barcode)),
        )
        const existing = existingIndex >= 0 ? inventoryItems[existingIndex] : null

        if (existing && (existing.source === "queued" || existing.status === "pending_intake")) {
          // A remote barcode match is not proof that WordPress accepted this local write.
          // Keep pending local work authoritative until its outbound operation succeeds.
          ignoredCount += 1
          continue
        }

        if (existing) {
          const pulledPublicId = cleanPublicId(pulledItem.public_id)
          const pulledWordPressPublicId = cleanPublicId(pulledItem.wordpress_public_id) || pulledPublicId
          const mergedQuantityOnHand = websitePulledInventoryQuantityOnHand(
            existing,
            pulledItem,
            pulledHasQuantity,
            allowRemoteInventoryQuantityIncrease,
          )
          const comparablePulledItem = pulledHasQuantity
            ? {
                ...pulledItem,
                quantity_on_hand: mergedQuantityOnHand,
              }
            : pulledItem
          if (websitePulledInventoryQuantityIncreaseIgnored(
            existing,
            pulledItem,
            pulledHasQuantity,
            allowRemoteInventoryQuantityIncrease,
          )) {
            remoteQuantityIncreaseIgnoredCount += 1
          }

          if (websitePulledInventoryMatchesExisting(existing, comparablePulledItem, pulledHasQuantity)) {
            unchangedCount += 1
            continue
          }

          const mergedItem = {
            ...existing,
            ...pulledItem,
            public_id: existing.public_id,
            wordpress_public_id: pulledWordPressPublicId || cleanPublicId(existing.wordpress_public_id),
            row_version: Math.max(existing.row_version + 1, pulledItem.row_version),
            quantity_on_hand: mergedQuantityOnHand,
            source: cleanPublicId(existing.wordpress_public_id) || existing.source === "accepted" ? "accepted" : "cached",
            created_by_user_id: existing.created_by_user_id || pulledItem.created_by_user_id,
            created_by_user_name: existing.created_by_user_name || pulledItem.created_by_user_name,
            square_catalog_item_id: cleanExternalId(pulledItem.square_catalog_item_id) || existing.square_catalog_item_id,
            square_catalog_variation_id:
              cleanExternalId(pulledItem.square_catalog_variation_id) || existing.square_catalog_variation_id,
          }

          inventoryItems[existingIndex] = mergedItem
          saveInventoryItem(database, mergedItem, now)
          removeInventoryDuplicateShadows(database, inventoryItems, mergedItem)
          appliedItems.push(publicInventoryItem(mergedItem))
          updatedCount += 1

          if (shouldSyncWebsitePulledToSquare && websitePulledInventoryShouldSyncSquare(existing, mergedItem, pulledHasQuantity)) {
            squareSyncResults.push(await syncSquareCatalogInventoryForWebsitePull(mergedItem))
          }
        } else {
          inventoryItems.push(pulledItem)
          saveInventoryItem(database, pulledItem, now)
          appliedItems.push(publicInventoryItem(pulledItem))
          insertedCount += 1

          if (shouldSyncWebsitePulledToSquare && pulledHasQuantity) {
            squareSyncResults.push(await syncSquareCatalogInventoryForWebsitePull(pulledItem))
          }
        }
      }
    }

    const appliedReferenceCards = []
    let catalogInsertedCount = 0
    let catalogUpdatedCount = 0
    let catalogIgnoredCount = 0

    if (shouldPullCatalog) {
      catalogPullResult = await wordpressCatalogExportPull({
        table: "reference_cards",
        page: input.catalog_page ?? input.catalogPage ?? input.page,
        pageSize: input.catalog_page_size ?? input.catalogPageSize ?? input.page_size ?? input.pageSize,
      })

      if (catalogPullResult.status !== "ok") {
        return {
          status: "blocked",
          code: catalogPullResult.code ?? "wordpress_catalog_pull_failed",
          message: catalogPullResult.message ?? "WordPress catalog pull did not complete.",
          http_status: catalogPullResult.http_status ?? 0,
          credentials_synced_to_client: false,
        }
      }

      for (const row of catalogPullResult.rows ?? []) {
        const card = normalizeReferenceCard(row, row.game ?? input.game ?? "pokemon", now, "wordpress_catalog_export")

        if (!card.provider_card_id) {
          catalogIgnoredCount += 1
          continue
        }

        const existingIndex = referenceCards.findIndex(
          (candidate) => candidate.provider_card_id === card.provider_card_id,
        )

        upsertReferenceCard(referenceCards, card)
        saveReferenceCard(database, card, now)
        appliedReferenceCards.push(card)

        if (existingIndex >= 0) {
          catalogUpdatedCount += 1
        } else {
          catalogInsertedCount += 1
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

    const appliedFulfillmentOrders = []
    let fulfillmentInsertedCount = 0
    let fulfillmentUpdatedCount = 0
    let fulfillmentIgnoredCount = 0
    const fulfillmentInventorySaleResults = []

    if (shouldPullFulfillment) {
      fulfillmentPullResult = await wordpressFulfillmentPull({
        limit: input.fulfillment_limit ?? input.fulfillmentLimit ?? input.page_size ?? input.pageSize,
        statuses: input.fulfillment_statuses ?? input.fulfillmentStatuses ?? [],
      })

      if (fulfillmentPullResult.status !== "ok") {
        return {
          status: "blocked",
          code: fulfillmentPullResult.code ?? "wordpress_fulfillment_pull_failed",
          message: fulfillmentPullResult.message ?? "WordPress fulfillment pull did not complete.",
          http_status: fulfillmentPullResult.http_status ?? 0,
          credentials_synced_to_client: false,
        }
      }

      for (const row of fulfillmentPullResult.orders ?? []) {
        const pulledOrder = localFulfillmentOrderFromWordPress(row, now)

        if (!pulledOrder) {
          fulfillmentIgnoredCount += 1
          continue
        }

        const existingIndex = fulfillmentOrders.findIndex((candidate) => candidate.order_id === pulledOrder.order_id)

        if (existingIndex >= 0) {
          const previousOrder = fulfillmentOrders[existingIndex]
          fulfillmentOrders[existingIndex] = {
            ...previousOrder,
            ...pulledOrder,
            inventory_sale_applied_at_utc:
              cleanIsoTimestamp(previousOrder.inventory_sale_applied_at_utc) ||
              cleanIsoTimestamp(pulledOrder.inventory_sale_applied_at_utc),
            source: previousOrder.source === "queued" ? "queued" : "wordpress",
            updated_at_utc: now().toISOString(),
          }
          saveFulfillmentOrder(database, fulfillmentOrders[existingIndex])
          fulfillmentInventorySaleResults.push(await applyWooCommerceSaleInventoryDelta(fulfillmentOrders[existingIndex]))
          appliedFulfillmentOrders.push(publicFulfillmentOrder(fulfillmentOrders[existingIndex]))
          fulfillmentUpdatedCount += 1
        } else {
          fulfillmentOrders.push(pulledOrder)
          saveFulfillmentOrder(database, pulledOrder)
          fulfillmentInventorySaleResults.push(await applyWooCommerceSaleInventoryDelta(pulledOrder))
          appliedFulfillmentOrders.push(publicFulfillmentOrder(pulledOrder))
          fulfillmentInsertedCount += 1
        }
      }
    }

    const result = {
      status: "ok",
      pulled_count: (inventoryPullResult?.items ?? []).length,
      applied_count: appliedItems.length,
      inserted_count: insertedCount,
      updated_count: updatedCount,
      unchanged_count: unchangedCount,
      reconciled_pending_count: reconciledPendingCount,
      ignored_count: ignoredCount,
      remote_quantity_increase_ignored_count: remoteQuantityIncreaseIgnoredCount,
      items: appliedItems,
      square_catalog_inventory_sync_performed: squareSyncResults.length > 0,
      square_catalog_inventory_sync_accepted_count: squareSyncResults.filter((item) => item.status === "accepted").length,
      square_catalog_inventory_sync_retry_count: squareSyncResults.filter((item) => item.status === "retry").length,
      square_catalog_inventory_sync_skipped_count: squareSyncResults.filter((item) => item.status === "skipped").length,
      square_catalog_inventory_sync_results: squareSyncResults,
      events_pulled_count: (eventPullResult?.events ?? []).length,
      events_applied_count: appliedEvents.length,
      events_inserted_count: eventsInsertedCount,
      events_updated_count: eventsUpdatedCount,
      events_ignored_count: eventsIgnoredCount,
      events: appliedEvents,
      fulfillment_pulled_count: (fulfillmentPullResult?.orders ?? []).length,
      fulfillment_applied_count: appliedFulfillmentOrders.length,
      fulfillment_inserted_count: fulfillmentInsertedCount,
      fulfillment_updated_count: fulfillmentUpdatedCount,
      fulfillment_ignored_count: fulfillmentIgnoredCount,
      fulfillment_inventory_sale_applied_count: fulfillmentInventorySaleResults.filter((item) => item.status === "ok").length,
      fulfillment_inventory_sale_retry_count: fulfillmentInventorySaleResults.filter((item) => item.status === "retry").length,
      fulfillment_inventory_sale_skipped_count: fulfillmentInventorySaleResults.filter((item) => item.status === "skipped").length,
      fulfillment_inventory_sale_results: fulfillmentInventorySaleResults,
      fulfillment_orders: appliedFulfillmentOrders,
      catalog_pulled_count: (catalogPullResult?.rows ?? []).length,
      catalog_applied_count: appliedReferenceCards.length,
      catalog_inserted_count: catalogInsertedCount,
      catalog_updated_count: catalogUpdatedCount,
      catalog_ignored_count: catalogIgnoredCount,
      meta: inventoryPullResult?.meta ?? null,
      catalog_meta: catalogPullResult?.meta ?? null,
      events_meta: eventPullResult?.meta ?? null,
      fulfillment_meta: fulfillmentPullResult
        ? {
            order_count: fulfillmentPullResult.order_count ?? (fulfillmentPullResult.orders ?? []).length,
          }
        : null,
      wordpress_pull_connected: true,
      wordpress_catalog_pull_connected: Boolean(wordpressCatalogExportPull),
      wordpress_inventory_pull_connected: Boolean(wordpressInventoryPull),
      inventory_source_of_truth: "local_sync_server",
      wordpress_inventory_pull_authority: "manual_remote_authority_only",
      wordpress_inventory_pull_skipped_remote_authority: inventoryPullSkippedRemoteAuthority,
      wordpress_inventory_remote_authority: inventoryRemoteAuthority,
      wordpress_events_pull_connected: Boolean(wordpressEventsPull),
      wordpress_fulfillment_pull_connected: Boolean(wordpressFulfillmentPull),
      credentials_synced_to_client: false,
      local_inventory_count: inventoryItems.length,
      local_reference_card_count: referenceCards.length,
      local_event_count: eventSnapshots.length,
      local_fulfillment_order_count: fulfillmentOrders.length,
      local_queue_depth: pendingQueueOperations(queue).length,
    }

    if (shouldPullInventory) {
      lastWebsiteInventoryPullResult = {
        status: result.status,
        generated_at_utc: now().toISOString(),
        pulled_count: result.pulled_count,
        applied_count: result.applied_count,
        inserted_count: result.inserted_count,
        updated_count: result.updated_count,
        unchanged_count: result.unchanged_count,
        ignored_count: result.ignored_count,
        remote_quantity_increase_ignored_count: result.remote_quantity_increase_ignored_count,
        square_catalog_inventory_sync_accepted_count: result.square_catalog_inventory_sync_accepted_count,
        square_catalog_inventory_sync_retry_count: result.square_catalog_inventory_sync_retry_count,
        square_catalog_inventory_sync_skipped_count: result.square_catalog_inventory_sync_skipped_count,
        local_queue_depth: result.local_queue_depth,
        updated_after: cleanIsoTimestamp(input.updated_after ?? input.updatedAfter),
      }
    }

    return result
  }

  async function pushInventoryIntakeOperation(operation) {
    if (!wordpressInventoryPush) {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "retry",
        code: "wordpress_inventory_push_unavailable",
        message: "WordPress inventory push is not configured on this LAN server.",
      }
    }

    const item = inventoryItems.find((candidate) => candidate.public_id === operation.entity_id) ?? operation.payload?.item

    if (!item) {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "rejected",
        code: "local_inventory_item_missing",
      }
    }

    const squareSync = await syncSquareCatalogInventoryForOperation(operation, item)

    if (squareSync.status === "retry") {
      return squareSync
    }

    const pushResult = await wordpressInventoryPush({ operation, item })

    if (pushResult.status !== "ok") {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "retry",
        code: pushResult.code,
        message: pushResult.message,
        wordpress_code: pushResult.wordpress_code ?? "",
        http_status: pushResult.http_status ?? 0,
        errors: Array.isArray(pushResult.errors) ? pushResult.errors : [],
      }
    }

    const localItem = inventoryItems.find((candidate) => candidate.public_id === item.public_id)

    if (localItem) {
      localItem.status = localInventoryStatus(pushResult.inventory?.status) ?? "pending_intake"
      localItem.wordpress_public_id = cleanPublicId(pushResult.inventory?.public_id)
      localItem.square_catalog_item_id =
        cleanExternalId(pushResult.inventory?.square_catalog_item_id) || localItem.square_catalog_item_id
      localItem.square_catalog_variation_id =
        cleanExternalId(pushResult.inventory?.square_catalog_variation_id) || localItem.square_catalog_variation_id
      localItem.square_location_id = cleanExternalId(pushResult.inventory?.square_location_id) || localItem.square_location_id
      localItem.source = "accepted"
      localItem.external_sync_state = "synced"
      localItem.row_version += 1
      saveInventoryItem(database, localItem, now)
    }

    deleteQueueOperation(database, queue, operation.operation_id)

    return {
      operation_id: operation.operation_id,
      operation_type: operation.operation_type,
      entity_id: operation.entity_id,
      status: "accepted",
      code: pushResult.code,
      wordpress_code: pushResult.wordpress_code,
      wordpress_inventory: pushResult.inventory,
      woocommerce_product_sync: pushResult.woocommerce_product_sync,
      square_catalog_inventory_sync: squareSync,
    }
  }

  async function syncSquareCatalogInventoryForOperation(operation, item) {
    if (!squareCatalogInventorySyncer || typeof squareCatalogInventorySyncer.syncInventoryItem !== "function") {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "skipped",
        code: "square_catalog_inventory_syncer_unavailable",
        message: "Square catalog inventory sync is not configured on this LAN server.",
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    const result = await squareCatalogInventorySyncer.syncInventoryItem({ operation, item })

    if (result.status === "skipped") {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        ...result,
      }
    }

    if (result.status !== "ok") {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "retry",
        code: result.code || "square_catalog_inventory_sync_failed",
        message: result.message || "Square catalog/inventory sync did not complete.",
        http_status: result.http_status ?? 0,
        errors: Array.isArray(result.errors) ? result.errors : [],
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    const localItem = inventoryItems.find((candidate) => candidate.public_id === item.public_id)
    const target = localItem ?? item

    target.square_catalog_item_id = cleanExternalId(result.square_catalog_item_id)
    target.square_catalog_variation_id = cleanExternalId(result.square_catalog_variation_id)
    target.square_location_id = cleanExternalId(result.square_location_id)
    target.external_sync_state = "square_synced"

    if (localItem) {
      saveInventoryItem(database, localItem, now)
    }

    return {
      operation_id: operation.operation_id,
      operation_type: operation.operation_type,
      entity_id: operation.entity_id,
      status: "accepted",
      code: result.code,
      square_catalog_item_id: target.square_catalog_item_id,
      square_catalog_variation_id: target.square_catalog_variation_id,
      square_location_id: target.square_location_id,
      square_quantity_on_hand: result.quantity_on_hand,
      item_created: result.item_created === true,
      variation_reused: result.variation_reused === true,
      payment_capture_supported: false,
      payment_capture_authority: result.payment_capture_authority ?? "square_pos_or_square_terminal",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function applyWooCommerceSaleInventoryDelta(order) {
    if (!woocommerceFulfillmentOrderShouldReduceInventory(order)) {
      return {
        status: "skipped",
        code: "woocommerce_sale_inventory_delta_not_applicable",
        order_id: positiveInt(order?.order_id),
      }
    }

    if (cleanIsoTimestamp(order.inventory_sale_applied_at_utc)) {
      return {
        status: "skipped",
        code: "woocommerce_sale_inventory_delta_already_applied",
        order_id: positiveInt(order.order_id),
        inventory_sale_applied_at_utc: cleanIsoTimestamp(order.inventory_sale_applied_at_utc),
      }
    }

    const generatedAtUtc = now().toISOString()
    const lineResults = []
    const squareSyncResults = []
    let appliedQuantity = 0
    let unmatchedQuantity = 0

    for (const lineItem of cleanFulfillmentOrderItems(order.items)) {
      let remainingQuantity = Math.max(1, boundedInt(lineItem.quantity, 1, 999, 1))
      const candidates = inventoryItems
        .filter((item) => fulfillmentLineItemMatchesInventory(lineItem, item))
        .filter((item) => inventoryQuantityOnHand(item) > 0)
        .sort(squareInventorySaleCandidateSort)

      for (const item of candidates) {
        if (remainingQuantity <= 0) {
          break
        }

        const previousQuantityOnHand = inventoryQuantityOnHand(item)
        const decrementQuantity = Math.min(previousQuantityOnHand, remainingQuantity)

        item.quantity_on_hand = previousQuantityOnHand - decrementQuantity
        item.status = item.quantity_on_hand > 0 ? "available" : "sold"
        item.source = cleanPublicId(item.wordpress_public_id) ? "accepted" : "cached"
        item.external_sync_state = "square_pending"
        item.updated_by_user_id = "woocommerce-sale"
        item.updated_by_user_name = `WooCommerce order ${cleanName(order.order_number) || order.order_id}`
        item.row_version += 1
        saveInventoryItem(database, item, now)

        const operation = {
          operation_id: `woocommerce-sale-${order.order_id}-${lineItem.order_item_id || lineResults.length + 1}-${item.public_id}`,
          operation_type: "inventory_update",
          entity_id: item.public_id,
          payload: {
            inventory_public_id: cleanPublicId(item.wordpress_public_id) || item.public_id,
            local_inventory_public_id: item.public_id,
            barcode: item.barcode,
            status: item.status,
            quantity_on_hand: item.quantity_on_hand,
            previous_quantity_on_hand: previousQuantityOnHand,
            quantity_delta: item.quantity_on_hand - previousQuantityOnHand,
            quantity_update_mode: "absolute",
            sync_intent: "woocommerce_fulfillment_sale_quantity_decrement",
            source: "woocommerce_fulfillment_pull",
            woocommerce_order_id: positiveInt(order.order_id),
            woocommerce_order_number: cleanName(order.order_number) || String(order.order_id),
            woocommerce_order_item_id: positiveInt(lineItem.order_item_id),
            wordpress_acceptance_required: false,
          },
        }
        squareSyncResults.push(await syncSquareCatalogInventoryForOperation(operation, item))
        lineResults.push({
          order_item_id: positiveInt(lineItem.order_item_id),
          inventory_public_id: item.public_id,
          barcode: item.barcode,
          previous_quantity_on_hand: previousQuantityOnHand,
          quantity_on_hand: item.quantity_on_hand,
          quantity_delta: item.quantity_on_hand - previousQuantityOnHand,
        })
        appliedQuantity += decrementQuantity
        remainingQuantity -= decrementQuantity
      }

      unmatchedQuantity += remainingQuantity
    }

    order.inventory_sale_applied_at_utc = generatedAtUtc
    order.updated_at_utc = generatedAtUtc
    saveFulfillmentOrder(database, order)

    const retryCount = squareSyncResults.filter((item) => item.status === "retry").length

    return {
      status: retryCount > 0 ? "retry" : "ok",
      code: retryCount > 0 ? "woocommerce_sale_inventory_delta_square_retry" : "woocommerce_sale_inventory_delta_applied",
      order_id: positiveInt(order.order_id),
      order_number: cleanName(order.order_number) || String(order.order_id),
      applied_quantity: appliedQuantity,
      unmatched_quantity: unmatchedQuantity,
      inventory_sale_applied_at_utc: generatedAtUtc,
      line_results: lineResults,
      square_catalog_inventory_sync_results: squareSyncResults,
      square_catalog_inventory_sync_accepted_count: squareSyncResults.filter((item) => item.status === "accepted").length,
      square_catalog_inventory_sync_retry_count: retryCount,
      source_of_truth: "local_sync_server",
      wordpress_acceptance_required: false,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function syncSquareCatalogInventoryForWebsitePull(item) {
    const wordpressPublicId = cleanPublicId(item.wordpress_public_id) || cleanPublicId(item.public_id)
    const rowVersion = boundedInt(item.row_version, 1, 999999999, 1)

    return syncSquareCatalogInventoryForOperation(
      {
        operation_id: `wordpress-pull-${wordpressPublicId || item.public_id}-v${rowVersion}`,
        operation_type: "inventory_update",
        entity_id: item.public_id,
        payload: {
          inventory_public_id: wordpressPublicId || item.public_id,
          local_inventory_public_id: item.public_id,
          barcode: item.barcode,
          status: item.status,
          quantity_on_hand: inventoryQuantityOnHand(item),
          quantity_update_mode: "absolute",
          sync_intent: "wordpress_inventory_pull_square_catalog_inventory_update",
          source: "wordpress_inventory_pull",
          wordpress_public_id: wordpressPublicId,
        },
      },
      item,
    )
  }

  async function pushInventoryUpdateOperation(operation) {
    if (!wordpressInventoryUpdatePush) {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "retry",
        code: "wordpress_inventory_update_push_unavailable",
        message: "WordPress inventory update push is not configured on this LAN server.",
      }
    }

    const item = inventoryItems.find((candidate) => candidate.public_id === operation.entity_id) ?? operation.payload?.item

    if (!item) {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "rejected",
        code: "local_inventory_item_missing",
      }
    }

    const squareSync = await syncSquareCatalogInventoryForOperation(operation, item)

    if (squareSync.status === "retry") {
      return squareSync
    }

    const pushResult = await wordpressInventoryUpdatePush({ operation, item })

    if (pushResult.status !== "ok") {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "retry",
        code: pushResult.code,
        message: pushResult.message,
        wordpress_code: pushResult.wordpress_code ?? "",
        http_status: pushResult.http_status ?? 0,
        errors: Array.isArray(pushResult.errors) ? pushResult.errors : [],
      }
    }

    const localItem = inventoryItems.find((candidate) => candidate.public_id === item.public_id)

    if (localItem) {
      localItem.status = localInventoryStatus(pushResult.inventory?.status) ?? localItem.status
      localItem.wordpress_public_id = cleanPublicId(pushResult.inventory?.public_id) || localItem.wordpress_public_id
      localItem.square_catalog_item_id =
        cleanExternalId(pushResult.inventory?.square_catalog_item_id) || localItem.square_catalog_item_id
      localItem.square_catalog_variation_id =
        cleanExternalId(pushResult.inventory?.square_catalog_variation_id) || localItem.square_catalog_variation_id
      localItem.square_location_id = cleanExternalId(pushResult.inventory?.square_location_id) || localItem.square_location_id
      localItem.source = "accepted"
      localItem.external_sync_state = "synced"
      localItem.row_version = positiveInt(pushResult.inventory?.row_version) ?? localItem.row_version + 1
      saveInventoryItem(database, localItem, now)
    }

    deleteQueueOperation(database, queue, operation.operation_id)

    return {
      operation_id: operation.operation_id,
      operation_type: operation.operation_type,
      entity_id: operation.entity_id,
      status: "accepted",
      code: pushResult.code,
      wordpress_code: pushResult.wordpress_code,
      wordpress_inventory: pushResult.inventory,
      woocommerce_product_sync: pushResult.woocommerce_product_sync,
      square_catalog_inventory_sync: squareSync,
      square_payment_capture_supported: false,
      payment_capture_authority: "official_woocommerce_square_extension",
    }
  }

  async function pushSquareSaleOperation(operation) {
    if (!wordpressInventorySalePush) {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "retry",
        code: "wordpress_inventory_sale_push_unavailable",
        message: "WordPress inventory sale push is not configured on this LAN server.",
      }
    }

    const item = inventoryItems.find((candidate) => candidate.public_id === operation.entity_id) ?? operation.payload?.item

    if (!item) {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "rejected",
        code: "local_inventory_item_missing",
      }
    }

    const pushResult = await wordpressInventorySalePush({ operation, item })

    if (pushResult.status !== "ok") {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "retry",
        code: pushResult.code,
        message: pushResult.message,
        wordpress_code: pushResult.wordpress_code ?? "",
        http_status: pushResult.http_status ?? 0,
        errors: Array.isArray(pushResult.errors) ? pushResult.errors : [],
      }
    }

    const localItem = inventoryItems.find((candidate) => candidate.public_id === item.public_id)

    if (localItem) {
      localItem.status = localInventoryStatus(pushResult.inventory?.status) ?? "sold"
      localItem.wordpress_public_id = cleanPublicId(pushResult.inventory?.public_id) || localItem.wordpress_public_id
      localItem.quantity_on_hand = Math.max(
        0,
        minorUnits(pushResult.inventory?.quantity_on_hand ?? localItem.quantity_on_hand),
      )
      localItem.source = "accepted"
      localItem.external_sync_state = "synced"
      localItem.row_version += 1
      saveInventoryItem(database, localItem, now)
    }

    const squareSync = await syncSquareCatalogInventoryForOperation(operation, localItem ?? item)

    if (squareSync.status === "retry") {
      return {
        ...squareSync,
        wordpress_code: pushResult.wordpress_code,
        wordpress_inventory: pushResult.inventory,
        woocommerce_product_sync: pushResult.woocommerce_product_sync,
      }
    }

    deleteQueueOperation(database, queue, operation.operation_id)

    return {
      operation_id: operation.operation_id,
      operation_type: operation.operation_type,
      entity_id: operation.entity_id,
      status: "accepted",
      code: pushResult.code,
      wordpress_code: pushResult.wordpress_code,
      wordpress_inventory: pushResult.inventory,
      woocommerce_product_sync: pushResult.woocommerce_product_sync,
      square_catalog_inventory_sync: squareSync,
      square_payment_capture_supported: false,
      payment_capture_authority: "official_woocommerce_square_extension",
    }
  }

  async function pushEventUpsertOperation(operation) {
    if (!wordpressEventUpsertPush) {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "retry",
        code: "wordpress_event_upsert_push_unavailable",
        message: "WordPress event creation push is not configured on this LAN server.",
      }
    }

    const event = eventSnapshots.find((candidate) => candidate.event_id === operation.entity_id) ?? operation.payload?.event

    if (!event) {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "rejected",
        code: "local_event_missing",
      }
    }

    const pushResult = await wordpressEventUpsertPush({
      operation: {
        ...operation,
        payload: {
          ...operation.payload,
          event: publicEventSnapshot(event),
        },
      },
    })

    if (pushResult.status !== "ok") {
      return {
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "retry",
        code: pushResult.code,
        message: pushResult.message,
        wordpress_code: pushResult.wordpress_code ?? "",
        http_status: pushResult.http_status ?? 0,
        errors: Array.isArray(pushResult.errors) ? pushResult.errors : [],
      }
    }

    const localEvent = eventSnapshots.find((candidate) => candidate.event_id === operation.entity_id)
    if (localEvent) {
      localEvent.slug = cleanSlug(pushResult.event?.slug) || localEvent.slug
      localEvent.row_version += 1
      localEvent.registration_status = pushResult.event?.registration_status
        ? cleanEventRegistrationStatus(pushResult.event.registration_status)
        : localEvent.registration_status
      localEvent.woocommerce_product_id = positiveInt(pushResult.event?.woocommerce_product_id) ?? 0
      localEvent.registration_deadline_utc =
        cleanIsoTimestamp(pushResult.event?.registration_deadline_utc) || localEvent.registration_deadline_utc
      localEvent.source = "accepted"
      localEvent.note = localEvent.woocommerce_product_id > 0
        ? `Accepted by WordPress with WooCommerce product #${localEvent.woocommerce_product_id}.`
        : "Accepted by WordPress."
      saveEventSnapshot(database, localEvent, now)
    }

    deleteQueueOperation(database, queue, operation.operation_id)

    return {
      operation_id: operation.operation_id,
      operation_type: operation.operation_type,
      entity_id: operation.entity_id,
      status: "accepted",
      code: pushResult.code,
      wordpress_code: pushResult.wordpress_code,
      wordpress_event: pushResult.event,
      woocommerce_product_created: Boolean(pushResult.woocommerce_product_created),
    }
  }

  async function pushQueuedOperations(token) {
    const session = requireSession(token)

    if (session.status !== "ok") {
      return session
    }

    if (
      !wordpressInventoryPush &&
      !wordpressInventoryUpdatePush &&
      !wordpressInventorySalePush &&
      !wordpressFulfillmentStatusPush &&
      !wordpressEventUpsertPush &&
      !wordpressEventRegistrationPush &&
      !wordpressEventCheckinPush &&
      !wordpressCreditPush &&
      !wordpressCustomerUpsertPush &&
      !wordpressKioskOrderPush
    ) {
      return blocked("wordpress_push_unavailable", "WordPress push is not configured on this LAN server.")
    }

    const expiryCleanup = cleanupExpiredLocalHolds()
    const pendingOperations = pendingQueueOperations(queue)
    const inventoryOperations = pendingOperations.filter((operation) => operation.operation_type === "inventory_intake")
    const inventoryUpdateOperations = pendingOperations.filter((operation) => operation.operation_type === "inventory_update")
    const squareSaleOperations = pendingOperations.filter((operation) => operation.operation_type === "square_pos_sale")
    const fulfillmentStatusOperations = pendingOperations.filter(
      (operation) => operation.operation_type === "woocommerce_fulfillment_status",
    )
    const eventUpsertOperations = pendingOperations.filter((operation) => operation.operation_type === "event_upsert")
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
      results.push(await pushInventoryIntakeOperation(operation))
    }

    for (const operation of inventoryUpdateOperations) {
      results.push(await pushInventoryUpdateOperation(operation))
    }

    for (const operation of squareSaleOperations) {
      results.push(await pushSquareSaleOperation(operation))
    }

    for (const operation of fulfillmentStatusOperations) {
      if (!wordpressFulfillmentStatusPush) {
        results.push({
          operation_id: operation.operation_id,
          operation_type: operation.operation_type,
          entity_id: operation.entity_id,
          status: "retry",
          code: "wordpress_fulfillment_status_push_unavailable",
          message: "WordPress fulfillment status push is not configured on this LAN server.",
        })
        continue
      }

      const orderId = positiveInt(operation.payload?.order_id ?? operation.entity_id)
      const nextStatus = cleanFulfillmentStatus(operation.payload?.status)
      const pushResult = await wordpressFulfillmentStatusPush({
        orderId,
        status: nextStatus,
        operationId: operation.operation_id,
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
        })
        continue
      }

      const pushedOrder = localFulfillmentOrderFromWordPress(pushResult.order, now)
      if (pushedOrder) {
        const existingIndex = fulfillmentOrders.findIndex((candidate) => candidate.order_id === pushedOrder.order_id)
        if (existingIndex >= 0) {
          fulfillmentOrders[existingIndex] = pushedOrder
        } else {
          fulfillmentOrders.push(pushedOrder)
        }
        saveFulfillmentOrder(database, pushedOrder)
      }

      deleteQueueOperation(database, queue, operation.operation_id)
      results.push({
        operation_id: operation.operation_id,
        operation_type: operation.operation_type,
        entity_id: operation.entity_id,
        status: "accepted",
        code: pushResult.code,
        wordpress_code: pushResult.wordpress_code,
        wordpress_fulfillment_order: pushResult.order,
        inventory_mutation_performed: false,
        payment_capture_performed: false,
      })
    }

    for (const operation of eventUpsertOperations) {
      results.push(await pushEventUpsertOperation(operation))
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
        if (cleanKioskOrderStatus(order.status) === "queued") {
          order.status = "accepted"
        }
        order.hold_expires_at_utc =
          earliestReservationExpiry(
            (Array.isArray(pushResult.reservations) ? pushResult.reservations : []).map((reservation) => ({
              expires_at_utc: reservation.expires_at,
            })),
          ) || order.hold_expires_at_utc
        order.updated_at_utc = now().toISOString()
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
          item.updated_by_user_id = "wordpress-sync"
          item.updated_by_user_name = "WordPress Sync"
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
      squareSaleOperations.length +
      eventRegistrationOperations.length +
      eventCheckinOperations.length +
      eventUpsertOperations.length +
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
      expired_hold_count: expiryCleanup.expired_order_count,
      released_hold_inventory_count: expiryCleanup.released_inventory_count,
      wordpress_push_connected: true,
      wordpress_inventory_push_connected: Boolean(wordpressInventoryPush),
      wordpress_inventory_sale_push_connected: Boolean(wordpressInventorySalePush),
      wordpress_event_upsert_push_connected: Boolean(wordpressEventUpsertPush),
      wordpress_event_registration_push_connected: Boolean(wordpressEventRegistrationPush),
      wordpress_event_checkin_push_connected: Boolean(wordpressEventCheckinPush),
      wordpress_credit_push_connected: Boolean(wordpressCreditPush),
      wordpress_customer_push_connected: Boolean(wordpressCustomerUpsertPush),
      wordpress_kiosk_order_push_connected: Boolean(wordpressKioskOrderPush),
      credentials_synced_to_client: false,
      local_queue_depth: pendingQueueOperations(queue).length,
    }
  }

  function cleanupExpiredLocalHolds() {
    const timestamp = now()
    const expiredReservationOperations = pendingQueueOperations(queue).filter(
      (operation) =>
        operation.operation_type === "inventory_reservation" &&
        localReservationExpired(operation, timestamp, cardHoldSeconds),
    )
    const expiredReservationIds = new Set()
    const releasedInventoryIds = new Set()

    for (const operation of expiredReservationOperations) {
      const reservationId = cleanPublicId(operation.entity_id)
      const inventoryPublicId = cleanPublicId(operation.payload?.inventory_public_id)
      expiredReservationIds.add(reservationId)

      const item = inventoryItems.find((candidate) => candidate.public_id === inventoryPublicId)
      if (item && item.status === "reserved") {
        item.status = "available"
        item.source = cleanPublicId(item.wordpress_public_id) ? "accepted" : "cached"
        item.updated_by_user_id = "hold-expiry"
        item.updated_by_user_name = "Hold Expiry"
        item.row_version += 1
        saveInventoryItem(database, item, now)
        releasedInventoryIds.add(item.public_id)
      }

      deleteQueueOperation(database, queue, operation.operation_id)
    }

    let expiredOrderCount = 0
    for (const order of kioskOrders) {
      const isActiveUnpaid = ["queued", "accepted", "pulling"].includes(cleanKioskOrderStatus(order.status)) &&
        cleanKioskPaymentStatus(order.payment_status) !== "paid"
      const orderReservationIds = new Set(
        Array.isArray(order.reservation_ids) ? order.reservation_ids.map(cleanPublicId).filter(Boolean) : [],
      )
      const orderHasExpiredReservation = [...expiredReservationIds].some((reservationId) =>
        orderReservationIds.has(reservationId),
      )
      const orderExpiredByTimestamp = localKioskOrderExpired(order, timestamp, cardHoldSeconds)

      if (!isActiveUnpaid || (!orderHasExpiredReservation && !orderExpiredByTimestamp)) {
        continue
      }

      for (const item of cleanKioskOrderItems(order.items)) {
        const localItem = inventoryItems.find((candidate) => candidate.public_id === item.public_id)
        if (localItem && localItem.status === "reserved") {
          localItem.status = "available"
          localItem.source = cleanPublicId(localItem.wordpress_public_id) ? "accepted" : "cached"
          localItem.updated_by_user_id = "hold-expiry"
          localItem.updated_by_user_name = "Hold Expiry"
          localItem.row_version += 1
          saveInventoryItem(database, localItem, now)
          releasedInventoryIds.add(localItem.public_id)
        }
      }

      order.status = "expired"
      order.updated_at_utc = timestamp.toISOString()
      saveKioskOrder(database, order)
      for (const operation of [...queue]) {
        if (operation.operation_type === "kiosk_order" && operation.entity_id === order.order_id) {
          deleteQueueOperation(database, queue, operation.operation_id)
        }
      }
      expiredOrderCount += 1
    }

    let terminalKioskOperationCount = 0
    for (const operation of [...pendingQueueOperations(queue)]) {
      if (operation.operation_type !== "kiosk_order") {
        continue
      }

      const order = kioskOrders.find((candidate) => candidate.order_id === operation.entity_id)
      if (!order || !["completed", "expired"].includes(cleanKioskOrderStatus(order.status))) {
        continue
      }

      deleteQueueOperation(database, queue, operation.operation_id)
      terminalKioskOperationCount += 1
    }

    return {
      expired_reservation_count: expiredReservationIds.size,
      expired_order_count: expiredOrderCount,
      released_inventory_count: releasedInventoryIds.size,
      terminal_kiosk_operation_count: terminalKioskOperationCount,
    }
  }

  return {
    addUser,
    authorizeCashDrawer,
    authorizeLabelPrinting,
    close: closeStore,
    addCashToDrawer,
    checkCashDrawerPayout,
    closeCashDrawerSession,
    createCreditAdjustment,
    createCreditRedemption,
    createCheckoutTransaction,
    createCustomer,
    getCustomerProfile,
    getFulfillmentNotifications,
    getCashDrawerSession,
    createEvent,
    createEventCheckin,
    createEventRegistration,
    createInventoryIntake,
    updateInventoryItem,
    createKioskOrder,
    createSquareTerminalCheckout,
    createSquareTerminalDeviceCode,
    createTradeInOrder,
    voidTradeInOrder,
    updateTradeInOrder,
    finalizeSquarePosSale,
    deviceStatus,
    getSetupConfig,
    getSquareTerminalStatus,
    retrieveSquareTerminalReceipt,
    addInventoryLocation,
    listEvents,
    listInventoryLocations,
    listKioskOrders,
    listTradeInOrders,
    getManagerReport,
    getServerMaintenanceStatus,
    pullSquareSalesReport,
    createSession,
    listAccessPolicy,
    planSquarePosInventoryPull,
    reconcileSquareProviderInventoryCounts,
    reconcileSquareProviderInventoryCountsForSystem,
    reconcileSquarePosInventoryCounts,
    applyServerPatch,
    backupSqliteDatabase,
    checkpointSqliteDatabase,
    recordDeviceHeartbeat,
    reserveInventory,
    restartServer,
    openCashDrawerSession,
    removeCashFromDrawer,
    pullWebsiteForMaintenance,
    pullWebsiteInventory,
    pullWebsiteInventoryForSystem,
    syncLocalInventoryToSquare,
    searchCustomers,
    searchInventory,
    identifyScryDexCardImage,
    indexScryDexCatalog,
    getScryDexCatalogStatus,
    getScryDexCatalogStatusForSystem,
    startScryDexCatalogSyncJob,
    triggerScryDexWebhookRefresh,
    indexScryDexCatalogForSystem,
    searchScryDexCards,
    lookupGradedTradeInValuation,
    syncStatus,
    listFulfillmentOrders,
    pushQueuedOperations,
    updateSetupConfig,
    updateFulfillmentOrderPicks,
    updateFulfillmentOrderStatus,
    updateKioskOrderPayment,
    updateKioskOrderPicks,
    updateKioskOrderCustomer,
    updateKioskOrderStatus,
    updateTradeInOrderStatus,
    updateUserAccess,
    updateUserProfile,
    removeUser,
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
      role TEXT NOT NULL CHECK (role IN ('staff', 'manager', 'owner')),
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
      grading_company TEXT NOT NULL DEFAULT '',
      grade TEXT NOT NULL DEFAULT '',
      cert_number TEXT NOT NULL DEFAULT '',
      condition TEXT NOT NULL,
      barcode TEXT NOT NULL,
      price_minor_units INTEGER NOT NULL,
      market_price_minor_units INTEGER NOT NULL DEFAULT 0,
      auto_price_minor_units INTEGER NOT NULL DEFAULT 0,
      pricing_source TEXT NOT NULL DEFAULT '',
      price_observed_at_utc TEXT NOT NULL DEFAULT '',
      quantity_on_hand INTEGER NOT NULL DEFAULT 1,
      minimum_sale_price_minor_units INTEGER NOT NULL DEFAULT 0,
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
      created_by_user_id TEXT NOT NULL DEFAULT '',
      created_by_user_name TEXT NOT NULL DEFAULT '',
      updated_by_user_id TEXT NOT NULL DEFAULT '',
      updated_by_user_name TEXT NOT NULL DEFAULT '',
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
      payment_status TEXT NOT NULL DEFAULT 'pay_at_store',
      square_receipt_reference TEXT NOT NULL DEFAULT '',
      square_order_id TEXT NOT NULL DEFAULT '',
      paid_at_utc TEXT NOT NULL DEFAULT '',
      paid_by_user_id TEXT NOT NULL DEFAULT '',
      customer_public_id TEXT NOT NULL DEFAULT '',
      customer_lookup TEXT NOT NULL DEFAULT '',
      picked_item_ids_json TEXT NOT NULL DEFAULT '[]',
      reservation_ids_json TEXT NOT NULL,
      items_json TEXT NOT NULL DEFAULT '[]',
      hold_expires_at_utc TEXT NOT NULL DEFAULT '',
      created_at_utc TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS fulfillment_orders (
      order_id INTEGER PRIMARY KEY,
      order_number TEXT NOT NULL DEFAULT '',
      customer_name TEXT NOT NULL DEFAULT '',
      order_status TEXT NOT NULL DEFAULT 'processing',
      fulfillment_status TEXT NOT NULL DEFAULT 'awaiting_pull',
      payment_status TEXT NOT NULL DEFAULT 'paid',
      shipping_method_id TEXT NOT NULL DEFAULT '',
      shipping_method_title TEXT NOT NULL DEFAULT '',
      local_pickup INTEGER NOT NULL DEFAULT 1,
      item_count INTEGER NOT NULL DEFAULT 0,
      total_minor_units INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      paid_at_utc TEXT NOT NULL DEFAULT '',
      created_at_utc TEXT NOT NULL DEFAULT '',
      updated_at_utc TEXT NOT NULL DEFAULT '',
      items_json TEXT NOT NULL DEFAULT '[]',
      picked_item_ids_json TEXT NOT NULL DEFAULT '[]',
      inventory_sale_applied_at_utc TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'wordpress'
    );

    CREATE TABLE IF NOT EXISTS checkout_transactions (
      transaction_id TEXT PRIMARY KEY,
      customer_public_id TEXT NOT NULL DEFAULT '',
      customer_lookup TEXT NOT NULL DEFAULT '',
      customer_name TEXT NOT NULL DEFAULT '',
      customer_email TEXT NOT NULL DEFAULT '',
      guest_checkout INTEGER NOT NULL DEFAULT 0,
      square_receipt_reference TEXT NOT NULL DEFAULT '',
      square_order_id TEXT NOT NULL DEFAULT '',
      source_order_id TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'local_pos',
      receipt_delivery TEXT NOT NULL DEFAULT 'print',
      tender_type TEXT NOT NULL DEFAULT 'card',
      subtotal_minor_units INTEGER NOT NULL DEFAULT 0,
      credit_used_minor_units INTEGER NOT NULL DEFAULT 0,
      square_due_minor_units INTEGER NOT NULL DEFAULT 0,
      cash_paid_minor_units INTEGER NOT NULL DEFAULT 0,
      card_paid_minor_units INTEGER NOT NULL DEFAULT 0,
      change_due_minor_units INTEGER NOT NULL DEFAULT 0,
      total_minor_units INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      items_json TEXT NOT NULL DEFAULT '[]',
      staff_user_id TEXT NOT NULL DEFAULT '',
      staff_user_name TEXT NOT NULL DEFAULT '',
      created_at_utc TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
      session_id TEXT PRIMARY KEY,
      opened_at_utc TEXT NOT NULL,
      opened_by_user_id TEXT NOT NULL DEFAULT '',
      opened_by_user_name TEXT NOT NULL DEFAULT '',
      starting_cash_minor_units INTEGER NOT NULL DEFAULT 0,
      ending_cash_minor_units INTEGER NOT NULL DEFAULT 0,
      variance_minor_units INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      closed_at_utc TEXT NOT NULL DEFAULT '',
      closed_by_user_id TEXT NOT NULL DEFAULT '',
      closed_by_user_name TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      report_json TEXT NOT NULL DEFAULT '{}',
      row_version INTEGER NOT NULL DEFAULT 1,
      updated_at_utc TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS cash_drawer_movements (
      movement_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      created_at_utc TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL DEFAULT '',
      created_by_user_name TEXT NOT NULL DEFAULT '',
      movement_type TEXT NOT NULL,
      amount_minor_units INTEGER NOT NULL DEFAULT 0,
      reference_type TEXT NOT NULL DEFAULT '',
      reference_id TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS trade_in_orders (
      order_id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL DEFAULT '',
      customer_public_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      staff_user_id TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      customer_id_number TEXT NOT NULL DEFAULT '',
      customer_id_state TEXT NOT NULL DEFAULT '',
      customer_id_recorded_at_utc TEXT NOT NULL DEFAULT '',
      customer_id_recorded_by_user_id TEXT NOT NULL DEFAULT '',
      items_json TEXT NOT NULL DEFAULT '[]',
      cash_total_minor_units INTEGER NOT NULL DEFAULT 0,
      credit_total_minor_units INTEGER NOT NULL DEFAULT 0,
      combined_total_minor_units INTEGER NOT NULL DEFAULT 0,
      converted_at_utc TEXT NOT NULL DEFAULT '',
      converted_by_user_id TEXT NOT NULL DEFAULT '',
      created_at_utc TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
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
      balance_before_minor_units INTEGER NOT NULL DEFAULT 0,
      balance_after_minor_units INTEGER NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      source TEXT NOT NULL,
      staff_user_id TEXT NOT NULL DEFAULT '',
      reference_id TEXT NOT NULL DEFAULT '',
      line_items_json TEXT NOT NULL DEFAULT '[]',
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
      event_type TEXT NOT NULL DEFAULT 'tournament',
      game TEXT NOT NULL DEFAULT 'other',
      entry_fee_minor_units INTEGER NOT NULL DEFAULT 0,
      registration_deadline_utc TEXT NOT NULL DEFAULT '',
      woocommerce_product_id INTEGER NOT NULL DEFAULT 0,
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
      price_points_json TEXT NOT NULL DEFAULT '[]',
      price_observed_at_utc TEXT NULL,
      catalog_synced_at_utc TEXT NOT NULL,
      catalog_source TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS graded_price_valuations (
      cache_key TEXT PRIMARY KEY,
      query_json TEXT NOT NULL DEFAULT '{}',
      valuation_json TEXT NOT NULL DEFAULT 'null',
      provider_statuses_json TEXT NOT NULL DEFAULT '[]',
      cache_expires_at_utc TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS server_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value_json TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS square_sales_report_snapshots (
      snapshot_id TEXT PRIMARY KEY,
      date_from_utc TEXT NOT NULL DEFAULT '',
      date_to_utc TEXT NOT NULL DEFAULT '',
      location_id TEXT NOT NULL DEFAULT '',
      report_json TEXT NOT NULL DEFAULT '{}',
      row_count INTEGER NOT NULL DEFAULT 0,
      gross_sales_minor_units INTEGER NOT NULL DEFAULT 0,
      pulled_at_utc TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scrydex_catalog_sync_history (
      job_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      started_at_utc TEXT NOT NULL DEFAULT '',
      completed_at_utc TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}'
    );
  `)

  ensureLocalSyncUserRoleConstraint(database)
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
  ensureLocalSyncColumn(database, "inventory_items", "grading_company", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "grade", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "cert_number", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "image_url", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "back_image_url", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "online_visibility", "TEXT NOT NULL DEFAULT 'visible'")
  ensureLocalSyncColumn(database, "inventory_items", "kiosk_visibility", "TEXT NOT NULL DEFAULT 'visible'")
  ensureLocalSyncColumn(database, "inventory_items", "pos_visibility", "TEXT NOT NULL DEFAULT 'visible'")
  ensureLocalSyncColumn(database, "inventory_items", "square_catalog_item_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "square_catalog_variation_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "square_location_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "external_sync_state", "TEXT NOT NULL DEFAULT 'pending'")
  ensureLocalSyncColumn(database, "inventory_items", "created_by_user_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "created_by_user_name", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "updated_by_user_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "updated_by_user_name", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "kiosk_orders", "items_json", "TEXT NOT NULL DEFAULT '[]'")
  ensureLocalSyncColumn(database, "kiosk_orders", "updated_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "kiosk_orders", "payment_status", "TEXT NOT NULL DEFAULT 'pay_at_store'")
  ensureLocalSyncColumn(database, "kiosk_orders", "square_receipt_reference", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "kiosk_orders", "square_order_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "kiosk_orders", "paid_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "kiosk_orders", "paid_by_user_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "kiosk_orders", "customer_public_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "kiosk_orders", "customer_lookup", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "kiosk_orders", "picked_item_ids_json", "TEXT NOT NULL DEFAULT '[]'")
  ensureLocalSyncColumn(database, "kiosk_orders", "hold_expires_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "fulfillment_orders", "order_number", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "fulfillment_orders", "updated_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "fulfillment_orders", "items_json", "TEXT NOT NULL DEFAULT '[]'")
  ensureLocalSyncColumn(database, "fulfillment_orders", "source", "TEXT NOT NULL DEFAULT 'wordpress'")
  ensureLocalSyncColumn(database, "fulfillment_orders", "picked_item_ids_json", "TEXT NOT NULL DEFAULT '[]'")
  ensureLocalSyncColumn(database, "fulfillment_orders", "inventory_sale_applied_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "checkout_transactions", "customer_email", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "checkout_transactions", "guest_checkout", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "checkout_transactions", "source_order_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "checkout_transactions", "receipt_delivery", "TEXT NOT NULL DEFAULT 'print'")
  ensureLocalSyncColumn(database, "checkout_transactions", "tender_type", "TEXT NOT NULL DEFAULT 'card'")
  ensureLocalSyncColumn(database, "checkout_transactions", "subtotal_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "checkout_transactions", "credit_used_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "checkout_transactions", "square_due_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "checkout_transactions", "cash_paid_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "checkout_transactions", "card_paid_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "checkout_transactions", "change_due_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "checkout_transactions", "staff_user_name", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_sessions", "opened_by_user_name", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_sessions", "ending_cash_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "cash_drawer_sessions", "variance_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "cash_drawer_sessions", "closed_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_sessions", "closed_by_user_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_sessions", "closed_by_user_name", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_sessions", "notes", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_sessions", "report_json", "TEXT NOT NULL DEFAULT '{}'")
  ensureLocalSyncColumn(database, "cash_drawer_sessions", "row_version", "INTEGER NOT NULL DEFAULT 1")
  ensureLocalSyncColumn(database, "cash_drawer_sessions", "updated_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_movements", "created_by_user_name", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_movements", "reference_type", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_movements", "reference_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_movements", "reason", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "cash_drawer_movements", "metadata_json", "TEXT NOT NULL DEFAULT '{}'")
  ensureLocalSyncColumn(database, "trade_in_orders", "customer_phone", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "trade_in_orders", "customer_public_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "trade_in_orders", "staff_user_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "trade_in_orders", "notes", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "trade_in_orders", "customer_id_number", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "trade_in_orders", "customer_id_state", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "trade_in_orders", "customer_id_recorded_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "trade_in_orders", "customer_id_recorded_by_user_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "trade_in_orders", "items_json", "TEXT NOT NULL DEFAULT '[]'")
  ensureLocalSyncColumn(database, "trade_in_orders", "cash_total_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "trade_in_orders", "credit_total_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "trade_in_orders", "combined_total_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "trade_in_orders", "converted_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "trade_in_orders", "converted_by_user_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "trade_in_orders", "updated_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "credit_ledger_entries", "balance_before_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "credit_ledger_entries", "staff_user_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "credit_ledger_entries", "reference_id", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "credit_ledger_entries", "line_items_json", "TEXT NOT NULL DEFAULT '[]'")
  database.exec("UPDATE users SET role = 'owner' WHERE id = 'preview-manager'")
  ensureLocalSyncColumn(database, "reference_cards", "catalog_source", "TEXT NOT NULL DEFAULT 'wordpress_catalog_cache'")
  ensureLocalSyncColumn(database, "reference_cards", "variants_json", "TEXT NOT NULL DEFAULT '[]'")
  ensureLocalSyncColumn(database, "reference_cards", "price_points_json", "TEXT NOT NULL DEFAULT '[]'")
  ensureLocalSyncColumn(database, "inventory_items", "quantity_on_hand", "INTEGER NOT NULL DEFAULT 1")
  ensureLocalSyncColumn(database, "inventory_items", "minimum_sale_price_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "inventory_items", "market_price_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "inventory_items", "auto_price_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "inventory_items", "pricing_source", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "inventory_items", "price_observed_at_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "event_snapshots", "slug", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "event_snapshots", "event_type", "TEXT NOT NULL DEFAULT 'tournament'")
  ensureLocalSyncColumn(database, "event_snapshots", "game", "TEXT NOT NULL DEFAULT 'other'")
  ensureLocalSyncColumn(database, "event_snapshots", "entry_fee_minor_units", "INTEGER NOT NULL DEFAULT 0")
  ensureLocalSyncColumn(database, "event_snapshots", "registration_deadline_utc", "TEXT NOT NULL DEFAULT ''")
  ensureLocalSyncColumn(database, "event_snapshots", "woocommerce_product_id", "INTEGER NOT NULL DEFAULT 0")
  database.exec(`
    UPDATE operation_queue
    SET sync_status = 'local_only'
    WHERE operation_type = 'user_access_upsert' AND sync_status = 'pending'
  `)
}

function ensureLocalSyncUserRoleConstraint(database) {
  const row = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get()

  if (String(row?.sql ?? "").includes("'owner'")) {
    return
  }

  database.exec(`
    CREATE TABLE users_role_migration (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('staff', 'manager', 'owner')),
      access_json TEXT NOT NULL,
      pin_salt TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      updated_at_utc TEXT NOT NULL
    );
    INSERT INTO users_role_migration (
      id, name, role, access_json, pin_salt, pin_hash, updated_at_utc
    )
    SELECT id, name, role, access_json, pin_salt, pin_hash, updated_at_utc
    FROM users;
    DROP TABLE users;
    ALTER TABLE users_role_migration RENAME TO users;
  `)
}

function seedLocalSyncDatabase(database, now, options = {}) {
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

  if (options.seedDemoInventory === true && Number(inventoryCount) === 0) {
    for (const item of seedInventoryItems()) {
      saveInventoryItem(database, item, now)
    }
  }

  if (options.seedDemoData === true && Number(customerCount) === 0) {
    for (const customer of seedCustomers()) {
      saveCustomer(database, customer, now)
    }

    for (const ledgerEntry of seedCreditLedgerEntries()) {
      saveCreditLedgerEntry(database, ledgerEntry)
    }
  }

  if (options.seedDemoData === true && Number(eventCount) === 0) {
    for (const event of seedEventSnapshots(now)) {
      saveEventSnapshot(database, event, now)
    }
  }

  if (options.seedDemoData === true && Number(referenceCardCount) === 0) {
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
      access: normalizeUserAccessForCurrentSchema(cleanRole(row.role), parseJson(row.access_json, [])),
      pinSalt: row.pin_salt,
      pinHash: row.pin_hash,
    }))
}

function persistCurrentAccessSchema(database, users, now) {
  for (const user of users) {
    saveUser(database, user, now)
  }
}

function loadInventoryItems(database) {
  return database
    .prepare(`
      SELECT public_id, wordpress_public_id, row_version, provider_card_id, game, card_name, set_name,
        reference_variant_id, provider_variant_id, set_code, card_number, printed_number,
        variant, finish, language, raw_or_graded, grading_company, grade, cert_number, condition, barcode, price_minor_units,
        market_price_minor_units, auto_price_minor_units, pricing_source, price_observed_at_utc,
        quantity_on_hand, minimum_sale_price_minor_units, currency, location, status, image_url, back_image_url, online_visibility, kiosk_visibility,
        pos_visibility, square_catalog_item_id, square_catalog_variation_id, square_location_id,
        external_sync_state, created_by_user_id, created_by_user_name, updated_by_user_id, updated_by_user_name, source
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
      grading_company: cleanName(row.grading_company),
      grade: cleanName(row.grade),
      cert_number: cleanName(row.cert_number),
      condition: row.condition,
      barcode: row.barcode,
      price_minor_units: Number(row.price_minor_units),
      market_price_minor_units: Math.max(0, minorUnits(row.market_price_minor_units)),
      auto_price_minor_units: Math.max(0, minorUnits(row.auto_price_minor_units)),
      pricing_source: cleanName(row.pricing_source),
      price_observed_at_utc: cleanIsoTimestamp(row.price_observed_at_utc),
      quantity_on_hand: inventoryQuantityOnHand(row),
      minimum_sale_price_minor_units: Math.max(0, minorUnits(row.minimum_sale_price_minor_units)),
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
      square_location_id: cleanExternalId(row.square_location_id),
      external_sync_state: cleanExternalSyncState(row.external_sync_state),
      created_by_user_id: cleanPublicId(row.created_by_user_id),
      created_by_user_name: cleanName(row.created_by_user_name),
      updated_by_user_id: cleanPublicId(row.updated_by_user_id),
      updated_by_user_name: cleanName(row.updated_by_user_name),
      source: row.source,
    }))
}

function loadReferenceCards(database) {
  return database
    .prepare(`
      SELECT provider_card_id, game, card_name, set_name, set_code, card_number,
        printed_number, suggested_barcode, market_price_minor_units, currency,
        image_url, variants_json, price_points_json, price_observed_at_utc, catalog_synced_at_utc, catalog_source
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

function loadSquareSalesReportSnapshots(database) {
  return database
    .prepare(`
      SELECT snapshot_id, date_from_utc, date_to_utc, location_id, report_json,
        row_count, gross_sales_minor_units, pulled_at_utc
      FROM square_sales_report_snapshots
      ORDER BY pulled_at_utc DESC, snapshot_id DESC
      LIMIT 10
    `)
    .all()
    .map((row) => normalizeSquareSalesReportSnapshot({
      ...parseJson(row.report_json, {}),
      snapshot_id: row.snapshot_id,
      date_from_utc: row.date_from_utc,
      date_to_utc: row.date_to_utc,
      location_id: row.location_id,
      line_item_count: Number(row.row_count),
      gross_sales_minor_units: Number(row.gross_sales_minor_units),
      pulled_at_utc: row.pulled_at_utc,
    }))
    .filter((snapshot) => snapshot.snapshot_id)
}

function loadScryDexCatalogSyncHistory(database) {
  return database
    .prepare(`
      SELECT job_id, status, action, source, started_at_utc, completed_at_utc, payload_json
      FROM scrydex_catalog_sync_history
      ORDER BY completed_at_utc DESC, started_at_utc DESC, job_id DESC
      LIMIT 8
    `)
    .all()
    .map((row) =>
      compactScryDexCatalogSyncHistoryEntry({
        ...parseJson(row.payload_json, {}),
        job_id: row.job_id,
        status: row.status,
        action: row.action,
        source: row.source,
        run_source: row.source,
        started_at_utc: row.started_at_utc,
        completed_at_utc: row.completed_at_utc,
      }),
    )
    .filter(Boolean)
}

function saveScryDexCatalogSyncHistoryEntry(database, entry) {
  const compact = compactScryDexCatalogSyncHistoryEntry(entry)

  if (!compact) {
    return
  }

  database
    .prepare(`
      INSERT INTO scrydex_catalog_sync_history (
        job_id, status, action, source, started_at_utc, completed_at_utc, payload_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        status = excluded.status,
        action = excluded.action,
        source = excluded.source,
        started_at_utc = excluded.started_at_utc,
        completed_at_utc = excluded.completed_at_utc,
        payload_json = excluded.payload_json
    `)
    .run(
      compact.job_id,
      compact.status,
      compact.action,
      compact.run_source || compact.source,
      compact.started_at_utc,
      compact.completed_at_utc,
      JSON.stringify(compact),
    )
}

function pruneScryDexCatalogSyncHistory(database) {
  database.exec(`
    DELETE FROM scrydex_catalog_sync_history
    WHERE job_id NOT IN (
      SELECT job_id
      FROM scrydex_catalog_sync_history
      ORDER BY completed_at_utc DESC, started_at_utc DESC, job_id DESC
      LIMIT 25
    )
  `)
}

function compactScryDexCatalogSyncHistoryEntry(input = {}) {
  const jobId = cleanPublicId(input.job_id ?? input.jobId) || cleanPublicId(input.id)

  if (!jobId) {
    return null
  }

  const source =
    cleanExternalId(input.run_source) ||
    cleanExternalId(input.source) ||
    cleanExternalId(input.source_of_truth) ||
    cleanExternalId(input.action)

  const compact = {
    job_id: jobId,
    status: cleanName(input.status),
    action: cleanName(input.action),
    source,
    run_source: source,
    code: cleanName(input.code),
    message: cleanText(input.message),
    requested_by_user_id: cleanPublicId(input.requested_by_user_id ?? input.requestedByUserId),
    requested_by_user_name: cleanName(input.requested_by_user_name ?? input.requestedByUserName),
    started_at_utc: cleanIsoTimestamp(input.started_at_utc ?? input.startedAtUtc),
    completed_at_utc: cleanIsoTimestamp(input.completed_at_utc ?? input.completedAtUtc),
    raw_or_graded: cleanName(input.raw_or_graded ?? input.rawOrGraded),
    downstream_phase: cleanName(input.downstream_phase ?? input.downstreamPhase),
    downstream_message: cleanText(input.downstream_message ?? input.downstreamMessage),
    downstream_started_at_utc: cleanIsoTimestamp(input.downstream_started_at_utc ?? input.downstreamStartedAtUtc),
    game_count: Number(input.game_count ?? input.gameCount ?? 0),
    completed_game_count: Number(input.completed_game_count ?? input.completedGameCount ?? 0),
    failed_game_count: Number(input.failed_game_count ?? input.failedGameCount ?? 0),
    expansion_count: Number(input.expansion_count ?? input.expansionCount ?? 0),
    failed_expansion_count: Number(input.failed_expansion_count ?? input.failedExpansionCount ?? 0),
    stored_cards: Number(input.stored_cards ?? input.storedCards ?? 0),
    variants: Number(input.variants ?? 0),
    prices: Number(input.prices ?? 0),
    games: compactScryDexGameResults(input.games),
    errors: compactScryDexErrors(input.errors),
    catalog_pull: compactScryDexNestedStatus(input.catalog_pull ?? input.catalogPull),
    inventory_reprice: compactScryDexInventoryReprice(input.inventory_reprice ?? input.inventoryReprice),
    totals_after: compactScryDexTotals(input.totals_after ?? input.totalsAfter),
    local_reference_card_count: Number(input.local_reference_card_count ?? input.localReferenceCardCount ?? 0),
    system_job: input.system_job === true || input.systemJob === true,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }

  if (Array.isArray(input.expansion_ids ?? input.expansionIds)) {
    compact.expansion_ids = (input.expansion_ids ?? input.expansionIds).map(cleanProviderResourceId).filter(Boolean).slice(0, 25)
  }

  if (Array.isArray(input.expansion_runs ?? input.expansionRuns)) {
    compact.expansion_runs = (input.expansion_runs ?? input.expansionRuns)
      .slice(0, 25)
      .map((run) => ({
        expansion_id: cleanProviderResourceId(run.expansion_id ?? run.expansionId),
        status: cleanName(run.status),
        code: cleanName(run.code),
        message: cleanText(run.message),
        stored_cards: Number(run.stored_cards ?? 0),
        variants: Number(run.variants ?? 0),
        prices: Number(run.prices ?? 0),
        games: compactScryDexGameResults(run.games),
      }))
  }

  return compact
}

function compactScryDexGameResults(games) {
  if (!Array.isArray(games)) {
    return []
  }

  return games.slice(0, 25).map((game) => ({
    game: cleanGame(game.game),
    status: cleanName(game.status),
    code: cleanName(game.code),
    message: cleanText(game.message),
    stored_cards: Number(game.stored_cards ?? 0),
    variants: Number(game.variants ?? 0),
    prices: Number(game.prices ?? 0),
    expansion_pages: Number(game.expansion_pages ?? 0),
    card_pages: Number(game.card_pages ?? 0),
    failed_sets: Array.isArray(game.failed_sets) ? game.failed_sets.slice(0, 10) : [],
    failed_cards: Array.isArray(game.failed_cards) ? game.failed_cards.slice(0, 10) : [],
  }))
}

function compactScryDexErrors(errors) {
  if (!Array.isArray(errors)) {
    return []
  }

  return errors.slice(0, 25).map((error) => ({
    game: cleanGame(error.game),
    code: cleanName(error.code),
    message: cleanText(error.message),
  }))
}

function compactScryDexNestedStatus(input = {}) {
  if (!input || typeof input !== "object") {
    return null
  }

  return {
    status: cleanName(input.status),
    code: cleanName(input.code),
    message: cleanText(input.message),
    pulled_count: Number(input.pulled_count ?? input.pulledCount ?? input.rows_pulled ?? input.rowsPulled ?? 0),
    stored_count: Number(input.stored_count ?? input.storedCount ?? input.stored_cards ?? input.storedCards ?? 0),
    skipped_count: Number(input.skipped_count ?? input.skippedCount ?? 0),
    page_count: Number(input.page_count ?? input.pageCount ?? 0),
    has_more: input.has_more === true || input.hasMore === true,
  }
}

function compactScryDexInventoryReprice(input = {}) {
  if (!input || typeof input !== "object") {
    return null
  }

  return {
    status: cleanName(input.status),
    action: cleanName(input.action),
    code: cleanName(input.code),
    message: cleanText(input.message),
    started_at_utc: cleanIsoTimestamp(input.started_at_utc ?? input.startedAtUtc),
    completed_at_utc: cleanIsoTimestamp(input.completed_at_utc ?? input.completedAtUtc),
    considered_count: Number(input.considered_count ?? input.consideredCount ?? 0),
    matched_count: Number(input.matched_count ?? input.matchedCount ?? 0),
    changed_count: Number(input.changed_count ?? input.changedCount ?? 0),
    saved_market_only_count: Number(input.saved_market_only_count ?? input.savedMarketOnlyCount ?? 0),
    floor_clamped_count: Number(input.floor_clamped_count ?? input.floorClampedCount ?? 0),
    wordpress_auto_sync_performed: input.wordpress_auto_sync_performed === true || input.wordpressAutoSyncPerformed === true,
    wordpress_accepted_count: Number(input.wordpress_accepted_count ?? input.wordpressAcceptedCount ?? 0),
    wordpress_retry_count: Number(input.wordpress_retry_count ?? input.wordpressRetryCount ?? 0),
    square_accepted_count: Number(input.square_accepted_count ?? input.squareAcceptedCount ?? 0),
    square_retry_count: Number(input.square_retry_count ?? input.squareRetryCount ?? 0),
    local_queue_depth: Number(input.local_queue_depth ?? input.localQueueDepth ?? 0),
  }
}

function compactScryDexTotals(input = {}) {
  if (!input || typeof input !== "object") {
    return null
  }

  return {
    card_count: Number(input.card_count ?? input.cardCount ?? 0),
    variant_count: Number(input.variant_count ?? input.variantCount ?? 0),
    price_point_count: Number(input.price_point_count ?? input.pricePointCount ?? 0),
    game_count: Number(input.game_count ?? input.gameCount ?? 0),
  }
}

function loadSetupConfig(database, defaults = {}) {
  const row = database
    .prepare("SELECT setting_value_json FROM server_settings WHERE setting_key = ?")
    .get("one_website_setup")
  const persisted = row ? parseJson(row.setting_value_json, {}) : {}
  const config = cleanSetupConfig({
    ...defaults,
    ...persisted,
    configSource: persisted.configSource ?? persisted.config_source ?? defaults.configSource ?? "server_environment",
    configuredAtUtc:
      persisted.configuredAtUtc ??
      persisted.configured_at_utc ??
      defaults.configuredAtUtc ??
      defaults.configured_at_utc,
  })

  if (!row && config.websiteUrl) {
    saveSetupConfig(database, config)
  }

  return config
}

function saveSetupConfig(database, config) {
  database
    .prepare(`
      INSERT INTO server_settings (setting_key, setting_value_json, updated_at_utc)
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value_json = excluded.setting_value_json,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run("one_website_setup", JSON.stringify(config), config.configuredAtUtc || new Date().toISOString())
}

function loadInventoryLocations(database, inventoryItems = []) {
  const row = database
    .prepare("SELECT setting_value_json FROM server_settings WHERE setting_key = ?")
    .get("inventory_locations")
  const persistedLocations = row ? parseJson(row.setting_value_json, []) : []
  const inventoryItemLocations = inventoryItems.map((item) => item.location)

  return cleanInventoryLocations([
    "Intake Queue",
    "Showcase A",
    "Showcase B",
    "Case 1",
    "Case 2",
    "Back Stock",
    ...persistedLocations,
    ...inventoryItemLocations,
  ])
}

function saveInventoryLocations(database, locations, now = () => new Date()) {
  database
    .prepare(`
      INSERT INTO server_settings (setting_key, setting_value_json, updated_at_utc)
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value_json = excluded.setting_value_json,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run("inventory_locations", JSON.stringify(cleanInventoryLocations(locations)), now().toISOString())
}

function mergeInventoryLocation(database, inventoryLocations, location, now = () => new Date()) {
  const cleaned = cleanInventoryLocation(location)

  if (!cleaned || inventoryLocations.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) {
    return
  }

  inventoryLocations.push(cleaned)
  inventoryLocations.sort((left, right) => left.localeCompare(right))
  saveInventoryLocations(database, inventoryLocations, now)
}

function publicSetupConfig(config) {
  return {
    store_id: config.storeId,
    server_url: config.serverUrl.replace(/\/$/, ""),
    website_url: config.websiteUrl,
    rest_base_path: config.restBasePath,
    wordpress_rest_base: config.websiteUrl ? `${config.websiteUrl.replace(/\/$/, "")}${config.restBasePath}` : "",
    local_database: config.localDatabase,
    config_source: config.configSource,
    configured_at_utc: config.configuredAtUtc,
    wordpress_connector_restart_required: config.wordpressConnectorRestartRequired,
    credit_approval_threshold_minor_units: config.creditApprovalThresholdMinorUnits,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
    raw_credentials_accepted: false,
  }
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
      SELECT order_id, first_name, last_name, status, payment_status, square_receipt_reference,
        square_order_id, paid_at_utc, paid_by_user_id, customer_public_id, customer_lookup, picked_item_ids_json,
        reservation_ids_json, items_json, hold_expires_at_utc, created_at_utc, updated_at_utc
      FROM kiosk_orders
      ORDER BY created_at_utc DESC, order_id
    `)
    .all()
    .map((row) => ({
      order_id: row.order_id,
      first_name: row.first_name,
      last_name: row.last_name,
      status: cleanKioskOrderStatus(row.status),
      payment_status: cleanKioskPaymentStatus(row.payment_status),
      square_receipt_reference: cleanExternalId(row.square_receipt_reference),
      square_order_id: cleanExternalId(row.square_order_id),
      paid_at_utc: cleanIsoTimestamp(row.paid_at_utc),
      paid_by_user_id: cleanPublicId(row.paid_by_user_id),
      customer_public_id: cleanPublicId(row.customer_public_id),
      customer_lookup: cleanName(row.customer_lookup),
      picked_item_ids: cleanPickedItemIds(parseJson(row.picked_item_ids_json, []), parseJson(row.items_json, [])),
      reservation_ids: parseJson(row.reservation_ids_json, []),
      items: cleanKioskOrderItems(parseJson(row.items_json, [])),
      hold_expires_at_utc: cleanIsoTimestamp(row.hold_expires_at_utc),
      created_at_utc: row.created_at_utc,
      updated_at_utc: row.updated_at_utc || row.created_at_utc,
    }))
}

function loadFulfillmentOrders(database) {
  return database
    .prepare(`
      SELECT order_id, order_number, customer_name, order_status, fulfillment_status,
        payment_status, shipping_method_id, shipping_method_title, local_pickup,
        item_count, total_minor_units, currency, paid_at_utc, created_at_utc,
        updated_at_utc, items_json, picked_item_ids_json, inventory_sale_applied_at_utc, source
      FROM fulfillment_orders
      ORDER BY created_at_utc DESC, order_id DESC
    `)
    .all()
    .map((row) => ({
      order_id: positiveInt(row.order_id),
      order_number: cleanName(row.order_number) || String(row.order_id),
      customer_name: cleanName(row.customer_name),
      order_status: cleanOrderStatus(row.order_status),
      fulfillment_status: cleanFulfillmentStatus(row.fulfillment_status) || "awaiting_pull",
      payment_status: cleanName(row.payment_status) || "paid",
      shipping_method_id: cleanName(row.shipping_method_id),
      shipping_method_title: cleanName(row.shipping_method_title),
      local_pickup: Number(row.local_pickup) === 1,
      item_count: boundedInt(row.item_count, 0, 9999, 0),
      total_minor_units: Math.max(0, minorUnits(row.total_minor_units)),
      currency: cleanCurrency(row.currency),
      paid_at_utc: cleanIsoTimestamp(row.paid_at_utc),
      created_at_utc: cleanIsoTimestamp(row.created_at_utc),
      updated_at_utc: cleanIsoTimestamp(row.updated_at_utc) || cleanIsoTimestamp(row.created_at_utc),
      items: cleanFulfillmentOrderItems(parseJson(row.items_json, [])),
      picked_item_ids: cleanPickedItemIds(
        parseJson(row.picked_item_ids_json, []),
        cleanFulfillmentOrderItems(parseJson(row.items_json, [])),
      ),
      inventory_sale_applied_at_utc: cleanIsoTimestamp(row.inventory_sale_applied_at_utc),
      source: cleanFulfillmentOrderSource(row.source),
    }))
    .filter((order) => order.order_id > 0)
}

function loadCheckoutTransactions(database) {
  return database
    .prepare(`
      SELECT transaction_id, customer_public_id, customer_lookup, customer_name, customer_email,
        guest_checkout, square_receipt_reference, square_order_id, source_order_id, source,
        receipt_delivery, tender_type, subtotal_minor_units, credit_used_minor_units, square_due_minor_units,
        cash_paid_minor_units, card_paid_minor_units, change_due_minor_units,
        total_minor_units, currency, items_json, staff_user_id, staff_user_name,
        created_at_utc, updated_at_utc
      FROM checkout_transactions
      ORDER BY created_at_utc DESC, transaction_id DESC
    `)
    .all()
    .map((row) => ({
      transaction_id: cleanPublicId(row.transaction_id),
      customer_public_id: cleanPublicId(row.customer_public_id),
      customer_lookup: cleanName(row.customer_lookup),
      customer_name: cleanName(row.customer_name),
      customer_email: cleanEmail(row.customer_email),
      guest_checkout: Number(row.guest_checkout) === 1,
      square_receipt_reference: cleanExternalId(row.square_receipt_reference),
      square_order_id: cleanExternalId(row.square_order_id),
      source_order_id: cleanExternalId(row.source_order_id),
      source: cleanCheckoutSource(row.source),
      receipt_delivery: cleanReceiptDelivery(row.receipt_delivery),
      tender_type: cleanCheckoutTenderType(row.tender_type),
      subtotal_minor_units: Math.max(0, minorUnits(row.subtotal_minor_units)),
      credit_used_minor_units: Math.max(0, minorUnits(row.credit_used_minor_units)),
      square_due_minor_units: Math.max(0, minorUnits(row.square_due_minor_units)),
      cash_paid_minor_units: Math.max(0, minorUnits(row.cash_paid_minor_units)),
      card_paid_minor_units: Math.max(0, minorUnits(row.card_paid_minor_units)),
      change_due_minor_units: Math.max(0, minorUnits(row.change_due_minor_units)),
      total_minor_units: Math.max(0, minorUnits(row.total_minor_units)),
      currency: cleanCurrency(row.currency),
      items: cleanCheckoutTransactionItems(parseJson(row.items_json, [])),
      staff_user_id: cleanPublicId(row.staff_user_id),
      staff_user_name: cleanName(row.staff_user_name),
      created_at_utc: cleanIsoTimestamp(row.created_at_utc),
      updated_at_utc: cleanIsoTimestamp(row.updated_at_utc) || cleanIsoTimestamp(row.created_at_utc),
    }))
    .filter((transaction) => transaction.transaction_id)
}

function loadCashDrawerSessions(database) {
  return database
    .prepare(`
      SELECT session_id, opened_at_utc, opened_by_user_id, opened_by_user_name,
        starting_cash_minor_units, ending_cash_minor_units, variance_minor_units, status,
        closed_at_utc, closed_by_user_id, closed_by_user_name, notes, report_json,
        row_version, updated_at_utc
      FROM cash_drawer_sessions
      ORDER BY opened_at_utc DESC, session_id DESC
    `)
    .all()
    .map((row) => ({
      session_id: cleanPublicId(row.session_id),
      opened_at_utc: cleanIsoTimestamp(row.opened_at_utc),
      opened_by_user_id: cleanPublicId(row.opened_by_user_id),
      opened_by_user_name: cleanName(row.opened_by_user_name),
      starting_cash_minor_units: Math.max(0, minorUnits(row.starting_cash_minor_units)),
      ending_cash_minor_units: Math.max(0, minorUnits(row.ending_cash_minor_units)),
      variance_minor_units: Math.trunc(minorUnits(row.variance_minor_units)),
      status: cleanCashDrawerSessionStatus(row.status),
      closed_at_utc: cleanIsoTimestamp(row.closed_at_utc),
      closed_by_user_id: cleanPublicId(row.closed_by_user_id),
      closed_by_user_name: cleanName(row.closed_by_user_name),
      notes: cleanOptionalReason(row.notes),
      report_json: JSON.stringify(parseJson(row.report_json, {})),
      row_version: Math.max(1, Number.parseInt(String(row.row_version), 10) || 1),
      updated_at_utc: cleanIsoTimestamp(row.updated_at_utc) || cleanIsoTimestamp(row.opened_at_utc),
    }))
    .filter((session) => session.session_id && session.opened_at_utc && session.status)
}

function loadCashDrawerMovements(database) {
  return database
    .prepare(`
      SELECT movement_id, session_id, created_at_utc, created_by_user_id, created_by_user_name,
        movement_type, amount_minor_units, reference_type, reference_id, reason, metadata_json
      FROM cash_drawer_movements
      ORDER BY created_at_utc DESC, movement_id DESC
    `)
    .all()
    .map((row) => ({
      movement_id: cleanPublicId(row.movement_id),
      session_id: cleanPublicId(row.session_id),
      created_at_utc: cleanIsoTimestamp(row.created_at_utc),
      created_by_user_id: cleanPublicId(row.created_by_user_id),
      created_by_user_name: cleanName(row.created_by_user_name),
      movement_type: cleanCashDrawerMovementType(row.movement_type),
      amount_minor_units: Math.trunc(minorUnits(row.amount_minor_units)),
      reference_type: cleanCashDrawerReferenceType(row.reference_type),
      reference_id: cleanExternalId(row.reference_id),
      reason: cleanOptionalReason(row.reason),
      metadata_json: JSON.stringify(parseJson(row.metadata_json, {})),
    }))
    .filter((movement) => movement.movement_id && movement.session_id && movement.created_at_utc && movement.movement_type)
}

function loadTradeInOrders(database) {
  return database
    .prepare(`
      SELECT order_id, customer_name, customer_phone, customer_public_id, status, staff_user_id,
        notes, customer_id_number, customer_id_state, customer_id_recorded_at_utc,
        customer_id_recorded_by_user_id, items_json, cash_total_minor_units, credit_total_minor_units,
        combined_total_minor_units, converted_at_utc, converted_by_user_id,
        created_at_utc, updated_at_utc
      FROM trade_in_orders
      ORDER BY updated_at_utc DESC, order_id DESC
    `)
    .all()
    .map((row) => ({
      order_id: cleanPublicId(row.order_id),
      customer_name: cleanName(row.customer_name) || "Walk-in customer",
      customer_phone: cleanPhone(row.customer_phone),
      customer_public_id: cleanPublicId(row.customer_public_id),
      status: cleanTradeInStatus(row.status) || "draft",
      staff_user_id: cleanPublicId(row.staff_user_id),
      notes: cleanOptionalReason(row.notes),
      customer_id_number: cleanTradeInCustomerIdNumber(row.customer_id_number),
      customer_id_state: cleanTradeInCustomerIdState(row.customer_id_state),
      customer_id_recorded_at_utc: cleanIsoTimestamp(row.customer_id_recorded_at_utc),
      customer_id_recorded_by_user_id: cleanPublicId(row.customer_id_recorded_by_user_id),
      items: cleanTradeInItems(parseJson(row.items_json, [])),
      cash_total_minor_units: Math.max(0, minorUnits(row.cash_total_minor_units)),
      credit_total_minor_units: Math.max(0, minorUnits(row.credit_total_minor_units)),
      combined_total_minor_units: Math.max(0, minorUnits(row.combined_total_minor_units)),
      converted_at_utc: cleanIsoTimestamp(row.converted_at_utc),
      converted_by_user_id: cleanPublicId(row.converted_by_user_id),
      created_at_utc: cleanIsoTimestamp(row.created_at_utc),
      updated_at_utc: cleanIsoTimestamp(row.updated_at_utc) || cleanIsoTimestamp(row.created_at_utc),
    }))
    .filter((order) => order.order_id)
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
        balance_before_minor_units, balance_after_minor_units, currency, status,
        reason, source, staff_user_id, reference_id, line_items_json, created_at_utc
      FROM credit_ledger_entries
      ORDER BY created_at_utc DESC, entry_id
    `)
    .all()
    .map((row) => ({
      entry_id: row.entry_id,
      customer_public_id: row.customer_public_id,
      entry_type: row.entry_type,
      amount_minor_units: Number(row.amount_minor_units),
      balance_before_minor_units: Number(row.balance_before_minor_units),
      balance_after_minor_units: Number(row.balance_after_minor_units),
      currency: row.currency,
      status: row.status,
      reason: row.reason,
      source: row.source,
      staff_user_id: cleanPublicId(row.staff_user_id),
      reference_id: cleanExternalId(row.reference_id),
      line_items: cleanCreditLedgerLineItems(parseJson(row.line_items_json, [])),
      created_at_utc: row.created_at_utc,
    }))
}

function loadEventSnapshots(database) {
  return database
    .prepare(`
      SELECT event_id, row_version, title, starts_at_utc, starts_at_label,
        slug, event_type, game, entry_fee_minor_units, registration_deadline_utc,
        woocommerce_product_id, registration_status, capacity, registered_count,
        location_label, note, source
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
      event_type: cleanEventType(row.event_type),
      game: cleanGame(row.game),
      entry_fee_minor_units: Math.max(0, minorUnits(row.entry_fee_minor_units)),
      registration_deadline_utc: cleanIsoTimestamp(row.registration_deadline_utc),
      woocommerce_product_id: positiveInt(row.woocommerce_product_id) ?? 0,
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

function deleteUser(database, userId) {
  database.prepare("DELETE FROM users WHERE id = ?").run(userId)
}

function saveInventoryItem(database, item, now) {
  database
    .prepare(`
      INSERT INTO inventory_items (
        public_id, wordpress_public_id, row_version, provider_card_id, game, card_name, set_name,
        reference_variant_id, provider_variant_id, set_code, card_number, printed_number,
        variant, finish, language, raw_or_graded, grading_company, grade, cert_number, condition, barcode, price_minor_units,
        market_price_minor_units, auto_price_minor_units, pricing_source, price_observed_at_utc,
        quantity_on_hand, minimum_sale_price_minor_units, currency, location, status, image_url, back_image_url, online_visibility, kiosk_visibility,
        pos_visibility, square_catalog_item_id, square_catalog_variation_id, square_location_id,
        external_sync_state, created_by_user_id, created_by_user_name, updated_by_user_id, updated_by_user_name,
        source, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        grading_company = excluded.grading_company,
        grade = excluded.grade,
        cert_number = excluded.cert_number,
        condition = excluded.condition,
        barcode = excluded.barcode,
        price_minor_units = excluded.price_minor_units,
        market_price_minor_units = excluded.market_price_minor_units,
        auto_price_minor_units = excluded.auto_price_minor_units,
        pricing_source = excluded.pricing_source,
        price_observed_at_utc = excluded.price_observed_at_utc,
        quantity_on_hand = excluded.quantity_on_hand,
        minimum_sale_price_minor_units = excluded.minimum_sale_price_minor_units,
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
        square_location_id = excluded.square_location_id,
        external_sync_state = excluded.external_sync_state,
        created_by_user_id = excluded.created_by_user_id,
        created_by_user_name = excluded.created_by_user_name,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_by_user_name = excluded.updated_by_user_name,
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
      cleanName(item.grading_company),
      cleanName(item.grade),
      cleanName(item.cert_number),
      item.condition,
      item.barcode,
      item.price_minor_units,
      Math.max(0, minorUnits(item.market_price_minor_units)),
      Math.max(0, minorUnits(item.auto_price_minor_units)),
      cleanName(item.pricing_source),
      cleanIsoTimestamp(item.price_observed_at_utc),
      inventoryQuantityOnHand(item),
      Math.max(0, minorUnits(item.minimum_sale_price_minor_units)),
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
      cleanExternalId(item.square_location_id),
      cleanExternalSyncState(item.external_sync_state),
      cleanPublicId(item.created_by_user_id),
      cleanName(item.created_by_user_name),
      cleanPublicId(item.updated_by_user_id),
      cleanName(item.updated_by_user_name),
      item.source,
      now().toISOString(),
    )
}

function saveTradeInOrder(database, order) {
  database
    .prepare(`
      INSERT INTO trade_in_orders (
        order_id, customer_name, customer_phone, customer_public_id, status, staff_user_id,
        notes, customer_id_number, customer_id_state, customer_id_recorded_at_utc,
        customer_id_recorded_by_user_id, items_json, cash_total_minor_units, credit_total_minor_units,
        combined_total_minor_units, converted_at_utc, converted_by_user_id,
        created_at_utc, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        customer_name = excluded.customer_name,
        customer_phone = excluded.customer_phone,
        customer_public_id = excluded.customer_public_id,
        status = excluded.status,
        staff_user_id = excluded.staff_user_id,
        notes = excluded.notes,
        customer_id_number = excluded.customer_id_number,
        customer_id_state = excluded.customer_id_state,
        customer_id_recorded_at_utc = excluded.customer_id_recorded_at_utc,
        customer_id_recorded_by_user_id = excluded.customer_id_recorded_by_user_id,
        items_json = excluded.items_json,
        cash_total_minor_units = excluded.cash_total_minor_units,
        credit_total_minor_units = excluded.credit_total_minor_units,
        combined_total_minor_units = excluded.combined_total_minor_units,
        converted_at_utc = excluded.converted_at_utc,
        converted_by_user_id = excluded.converted_by_user_id,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      order.order_id,
      order.customer_name,
      cleanPhone(order.customer_phone),
      cleanPublicId(order.customer_public_id),
      cleanTradeInStatus(order.status) || "draft",
      cleanPublicId(order.staff_user_id),
      cleanOptionalReason(order.notes),
      cleanTradeInCustomerIdNumber(order.customer_id_number),
      cleanTradeInCustomerIdState(order.customer_id_state),
      cleanIsoTimestamp(order.customer_id_recorded_at_utc),
      cleanPublicId(order.customer_id_recorded_by_user_id),
      JSON.stringify(cleanTradeInItems(order.items)),
      Math.max(0, minorUnits(order.cash_total_minor_units)),
      Math.max(0, minorUnits(order.credit_total_minor_units)),
      Math.max(0, minorUnits(order.combined_total_minor_units)),
      cleanIsoTimestamp(order.converted_at_utc),
      cleanPublicId(order.converted_by_user_id),
      order.created_at_utc,
      order.updated_at_utc,
    )
}

function referenceCardSaveStatement(database) {
  return database.prepare(`
      INSERT INTO reference_cards (
        provider_card_id, game, card_name, set_name, set_code, card_number,
        printed_number, suggested_barcode, market_price_minor_units, currency,
        image_url, variants_json, price_points_json, price_observed_at_utc, catalog_synced_at_utc, catalog_source,
        updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        price_points_json = excluded.price_points_json,
        price_observed_at_utc = excluded.price_observed_at_utc,
        catalog_synced_at_utc = excluded.catalog_synced_at_utc,
        catalog_source = excluded.catalog_source,
        updated_at_utc = excluded.updated_at_utc
    `)
}

function runReferenceCardSave(statement, card, now) {
  statement.run(
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
    JSON.stringify(card.price_points ?? []),
    card.price_observed_at_utc,
    card.catalog_synced_at_utc,
    card.catalog_source,
    now().toISOString(),
  )
}

function saveReferenceCards(database, cards, now) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return
  }

  const statement = referenceCardSaveStatement(database)
  if (typeof database.transaction !== "function") {
    for (const card of cards) {
      runReferenceCardSave(statement, card, now)
    }
    return
  }

  const saveBatch = database.transaction((batch) => {
    for (const card of batch) {
      runReferenceCardSave(statement, card, now)
    }
  })

  saveBatch(cards)
}

function saveReferenceCard(database, card, now) {
  runReferenceCardSave(referenceCardSaveStatement(database), card, now)
}

function readGradedValuationCache(database, cacheKey, now) {
  const row = database
    .prepare(
      "SELECT valuation_json, provider_statuses_json, cache_expires_at_utc FROM graded_price_valuations WHERE cache_key = ?",
    )
    .get(cacheKey)

  if (!row) {
    return null
  }

  const expiresAtMs = Date.parse(String(row.cache_expires_at_utc ?? ""))

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now().getTime()) {
    return null
  }

  return {
    valuation: normalizeGradedValuation(parseJson(row.valuation_json, null), now),
    provider_statuses: cleanGradedProviderStatuses(parseJson(row.provider_statuses_json, [])),
    cache_expires_at_utc: cleanIsoTimestamp(row.cache_expires_at_utc),
  }
}

function saveGradedValuationCache(database, cache) {
  database
    .prepare(`
      INSERT INTO graded_price_valuations (
        cache_key, query_json, valuation_json, provider_statuses_json, cache_expires_at_utc, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        query_json = excluded.query_json,
        valuation_json = excluded.valuation_json,
        provider_statuses_json = excluded.provider_statuses_json,
        cache_expires_at_utc = excluded.cache_expires_at_utc,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      cleanPublicId(cache.cache_key),
      JSON.stringify(cache.query ?? {}),
      JSON.stringify(normalizeGradedValuation(cache.valuation, () => new Date())),
      JSON.stringify(cleanGradedProviderStatuses(cache.provider_statuses)),
      cleanIsoTimestamp(cache.cache_expires_at_utc),
      cleanIsoTimestamp(cache.updated_at_utc) || new Date().toISOString(),
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

function saveSquareSalesReportSnapshot(database, snapshot) {
  const normalized = normalizeSquareSalesReportSnapshot(snapshot)

  database
    .prepare(`
      INSERT INTO square_sales_report_snapshots (
        snapshot_id, date_from_utc, date_to_utc, location_id, report_json,
        row_count, gross_sales_minor_units, pulled_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(snapshot_id) DO UPDATE SET
        date_from_utc = excluded.date_from_utc,
        date_to_utc = excluded.date_to_utc,
        location_id = excluded.location_id,
        report_json = excluded.report_json,
        row_count = excluded.row_count,
        gross_sales_minor_units = excluded.gross_sales_minor_units,
        pulled_at_utc = excluded.pulled_at_utc
    `)
    .run(
      normalized.snapshot_id,
      normalized.date_from_utc,
      normalized.date_to_utc,
      normalized.location_id,
      JSON.stringify(normalized),
      normalized.line_item_count,
      normalized.gross_sales_minor_units,
      normalized.pulled_at_utc,
    )
}

function saveKioskOrder(database, order) {
  database
    .prepare(`
      INSERT INTO kiosk_orders (
        order_id, first_name, last_name, status, payment_status, square_receipt_reference,
        square_order_id, paid_at_utc, paid_by_user_id, customer_public_id, customer_lookup,
        picked_item_ids_json, reservation_ids_json, items_json, hold_expires_at_utc, created_at_utc, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        status = excluded.status,
        payment_status = excluded.payment_status,
        square_receipt_reference = excluded.square_receipt_reference,
        square_order_id = excluded.square_order_id,
        paid_at_utc = excluded.paid_at_utc,
        paid_by_user_id = excluded.paid_by_user_id,
        customer_public_id = excluded.customer_public_id,
        customer_lookup = excluded.customer_lookup,
        picked_item_ids_json = excluded.picked_item_ids_json,
        reservation_ids_json = excluded.reservation_ids_json,
        items_json = excluded.items_json,
        hold_expires_at_utc = excluded.hold_expires_at_utc,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      order.order_id,
      order.first_name,
      order.last_name,
      cleanKioskOrderStatus(order.status),
      cleanKioskPaymentStatus(order.payment_status),
      cleanExternalId(order.square_receipt_reference),
      cleanExternalId(order.square_order_id),
      cleanIsoTimestamp(order.paid_at_utc),
      cleanPublicId(order.paid_by_user_id),
      cleanPublicId(order.customer_public_id),
      cleanName(order.customer_lookup),
      JSON.stringify(cleanPickedItemIds(order.picked_item_ids, order.items)),
      JSON.stringify(order.reservation_ids),
      JSON.stringify(cleanKioskOrderItems(order.items)),
      cleanIsoTimestamp(order.hold_expires_at_utc),
      order.created_at_utc,
      order.updated_at_utc || order.created_at_utc,
    )
}

function saveFulfillmentOrder(database, order) {
  database
    .prepare(`
      INSERT INTO fulfillment_orders (
        order_id, order_number, customer_name, order_status, fulfillment_status,
        payment_status, shipping_method_id, shipping_method_title, local_pickup,
        item_count, total_minor_units, currency, paid_at_utc, created_at_utc,
        updated_at_utc, items_json, picked_item_ids_json, inventory_sale_applied_at_utc, source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        order_number = excluded.order_number,
        customer_name = excluded.customer_name,
        order_status = excluded.order_status,
        fulfillment_status = excluded.fulfillment_status,
        payment_status = excluded.payment_status,
        shipping_method_id = excluded.shipping_method_id,
        shipping_method_title = excluded.shipping_method_title,
        local_pickup = excluded.local_pickup,
        item_count = excluded.item_count,
        total_minor_units = excluded.total_minor_units,
        currency = excluded.currency,
        paid_at_utc = excluded.paid_at_utc,
        created_at_utc = excluded.created_at_utc,
        updated_at_utc = excluded.updated_at_utc,
        items_json = excluded.items_json,
        picked_item_ids_json = excluded.picked_item_ids_json,
        inventory_sale_applied_at_utc = excluded.inventory_sale_applied_at_utc,
        source = excluded.source
    `)
    .run(
      positiveInt(order.order_id),
      cleanName(order.order_number) || String(positiveInt(order.order_id)),
      cleanName(order.customer_name),
      cleanOrderStatus(order.order_status),
      cleanFulfillmentStatus(order.fulfillment_status) || "awaiting_pull",
      cleanName(order.payment_status) || "paid",
      cleanName(order.shipping_method_id),
      cleanName(order.shipping_method_title),
      order.local_pickup === false ? 0 : 1,
      boundedInt(order.item_count ?? order.items?.length, 0, 9999, 0),
      Math.max(0, minorUnits(order.total_minor_units)),
      cleanCurrency(order.currency),
      cleanIsoTimestamp(order.paid_at_utc),
      cleanIsoTimestamp(order.created_at_utc),
      cleanIsoTimestamp(order.updated_at_utc) || cleanIsoTimestamp(order.created_at_utc),
      JSON.stringify(cleanFulfillmentOrderItems(order.items)),
      JSON.stringify(cleanPickedItemIds(order.picked_item_ids, order.items)),
      cleanIsoTimestamp(order.inventory_sale_applied_at_utc),
      cleanFulfillmentOrderSource(order.source),
    )
}

function saveCheckoutTransaction(database, transaction) {
  database
    .prepare(`
      INSERT INTO checkout_transactions (
        transaction_id, customer_public_id, customer_lookup, customer_name, customer_email,
        guest_checkout, square_receipt_reference, square_order_id, source_order_id, source,
        receipt_delivery, tender_type, subtotal_minor_units, credit_used_minor_units, square_due_minor_units,
        cash_paid_minor_units, card_paid_minor_units, change_due_minor_units,
        total_minor_units, currency, items_json, staff_user_id, staff_user_name, created_at_utc, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(transaction_id) DO UPDATE SET
        customer_public_id = excluded.customer_public_id,
        customer_lookup = excluded.customer_lookup,
        customer_name = excluded.customer_name,
        customer_email = excluded.customer_email,
        guest_checkout = excluded.guest_checkout,
        square_receipt_reference = excluded.square_receipt_reference,
        square_order_id = excluded.square_order_id,
        source_order_id = excluded.source_order_id,
        source = excluded.source,
        receipt_delivery = excluded.receipt_delivery,
        tender_type = excluded.tender_type,
        subtotal_minor_units = excluded.subtotal_minor_units,
        credit_used_minor_units = excluded.credit_used_minor_units,
        square_due_minor_units = excluded.square_due_minor_units,
        cash_paid_minor_units = excluded.cash_paid_minor_units,
        card_paid_minor_units = excluded.card_paid_minor_units,
        change_due_minor_units = excluded.change_due_minor_units,
        total_minor_units = excluded.total_minor_units,
        currency = excluded.currency,
        items_json = excluded.items_json,
        staff_user_id = excluded.staff_user_id,
        staff_user_name = excluded.staff_user_name,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      cleanPublicId(transaction.transaction_id),
      cleanPublicId(transaction.customer_public_id),
      cleanName(transaction.customer_lookup),
      cleanName(transaction.customer_name),
      cleanEmail(transaction.customer_email),
      transaction.guest_checkout ? 1 : 0,
      cleanExternalId(transaction.square_receipt_reference),
      cleanExternalId(transaction.square_order_id),
      cleanExternalId(transaction.source_order_id),
      cleanCheckoutSource(transaction.source),
      cleanReceiptDelivery(transaction.receipt_delivery),
      cleanCheckoutTenderType(transaction.tender_type),
      Math.max(0, minorUnits(transaction.subtotal_minor_units)),
      Math.max(0, minorUnits(transaction.credit_used_minor_units)),
      Math.max(0, minorUnits(transaction.square_due_minor_units)),
      Math.max(0, minorUnits(transaction.cash_paid_minor_units)),
      Math.max(0, minorUnits(transaction.card_paid_minor_units)),
      Math.max(0, minorUnits(transaction.change_due_minor_units)),
      Math.max(0, minorUnits(transaction.total_minor_units)),
      cleanCurrency(transaction.currency),
      JSON.stringify(cleanCheckoutTransactionItems(transaction.items)),
      cleanPublicId(transaction.staff_user_id),
      cleanName(transaction.staff_user_name),
      cleanIsoTimestamp(transaction.created_at_utc),
      cleanIsoTimestamp(transaction.updated_at_utc) || cleanIsoTimestamp(transaction.created_at_utc),
    )
}

function saveCashDrawerSession(database, session) {
  database
    .prepare(`
      INSERT INTO cash_drawer_sessions (
        session_id, opened_at_utc, opened_by_user_id, opened_by_user_name,
        starting_cash_minor_units, ending_cash_minor_units, variance_minor_units, status,
        closed_at_utc, closed_by_user_id, closed_by_user_name, notes, report_json,
        row_version, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        opened_at_utc = excluded.opened_at_utc,
        opened_by_user_id = excluded.opened_by_user_id,
        opened_by_user_name = excluded.opened_by_user_name,
        starting_cash_minor_units = excluded.starting_cash_minor_units,
        ending_cash_minor_units = excluded.ending_cash_minor_units,
        variance_minor_units = excluded.variance_minor_units,
        status = excluded.status,
        closed_at_utc = excluded.closed_at_utc,
        closed_by_user_id = excluded.closed_by_user_id,
        closed_by_user_name = excluded.closed_by_user_name,
        notes = excluded.notes,
        report_json = excluded.report_json,
        row_version = excluded.row_version,
        updated_at_utc = excluded.updated_at_utc
    `)
    .run(
      cleanPublicId(session.session_id),
      cleanIsoTimestamp(session.opened_at_utc),
      cleanPublicId(session.opened_by_user_id),
      cleanName(session.opened_by_user_name),
      Math.max(0, minorUnits(session.starting_cash_minor_units)),
      Math.max(0, minorUnits(session.ending_cash_minor_units)),
      Math.trunc(minorUnits(session.variance_minor_units)),
      cleanCashDrawerSessionStatus(session.status),
      cleanIsoTimestamp(session.closed_at_utc),
      cleanPublicId(session.closed_by_user_id),
      cleanName(session.closed_by_user_name),
      cleanOptionalReason(session.notes),
      JSON.stringify(parseJson(session.report_json, {})),
      Math.max(1, Number.parseInt(String(session.row_version), 10) || 1),
      cleanIsoTimestamp(session.updated_at_utc) || cleanIsoTimestamp(session.opened_at_utc),
    )
}

function saveCashDrawerMovement(database, movement) {
  database
    .prepare(`
      INSERT INTO cash_drawer_movements (
        movement_id, session_id, created_at_utc, created_by_user_id, created_by_user_name,
        movement_type, amount_minor_units, reference_type, reference_id, reason, metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(movement_id) DO UPDATE SET
        session_id = excluded.session_id,
        created_at_utc = excluded.created_at_utc,
        created_by_user_id = excluded.created_by_user_id,
        created_by_user_name = excluded.created_by_user_name,
        movement_type = excluded.movement_type,
        amount_minor_units = excluded.amount_minor_units,
        reference_type = excluded.reference_type,
        reference_id = excluded.reference_id,
        reason = excluded.reason,
        metadata_json = excluded.metadata_json
    `)
    .run(
      cleanPublicId(movement.movement_id),
      cleanPublicId(movement.session_id),
      cleanIsoTimestamp(movement.created_at_utc),
      cleanPublicId(movement.created_by_user_id),
      cleanName(movement.created_by_user_name),
      cleanCashDrawerMovementType(movement.movement_type),
      Math.trunc(minorUnits(movement.amount_minor_units)),
      cleanCashDrawerReferenceType(movement.reference_type),
      cleanExternalId(movement.reference_id),
      cleanOptionalReason(movement.reason),
      JSON.stringify(parseJson(movement.metadata_json, {})),
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
        balance_before_minor_units, balance_after_minor_units, currency, status,
        reason, source, staff_user_id, reference_id, line_items_json, created_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(entry_id) DO UPDATE SET
        amount_minor_units = excluded.amount_minor_units,
        balance_before_minor_units = excluded.balance_before_minor_units,
        balance_after_minor_units = excluded.balance_after_minor_units,
        status = excluded.status,
        reason = excluded.reason,
        source = excluded.source,
        staff_user_id = excluded.staff_user_id,
        reference_id = excluded.reference_id,
        line_items_json = excluded.line_items_json
    `)
    .run(
      entry.entry_id,
      entry.customer_public_id,
      entry.entry_type,
      entry.amount_minor_units,
      Math.max(0, minorUnits(entry.balance_before_minor_units ?? (entry.balance_after_minor_units - entry.amount_minor_units))),
      entry.balance_after_minor_units,
      entry.currency,
      entry.status,
      entry.reason,
      entry.source,
      cleanPublicId(entry.staff_user_id),
      cleanExternalId(entry.reference_id),
      JSON.stringify(cleanCreditLedgerLineItems(entry.line_items)),
      entry.created_at_utc,
    )
}

function saveEventSnapshot(database, event, now) {
  database
    .prepare(`
      INSERT INTO event_snapshots (
        event_id, slug, row_version, title, starts_at_utc, starts_at_label,
        event_type, game, entry_fee_minor_units, registration_deadline_utc,
        woocommerce_product_id, registration_status, capacity, registered_count,
        location_label, note, source, updated_at_utc
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO UPDATE SET
        slug = excluded.slug,
        row_version = excluded.row_version,
        title = excluded.title,
        starts_at_utc = excluded.starts_at_utc,
        starts_at_label = excluded.starts_at_label,
        event_type = excluded.event_type,
        game = excluded.game,
        entry_fee_minor_units = excluded.entry_fee_minor_units,
        registration_deadline_utc = excluded.registration_deadline_utc,
        woocommerce_product_id = excluded.woocommerce_product_id,
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
      cleanEventType(event.event_type),
      cleanGame(event.game),
      Math.max(0, minorUnits(event.entry_fee_minor_units)),
      cleanIsoTimestamp(event.registration_deadline_utc),
      positiveInt(event.woocommerce_product_id) ?? 0,
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

function removeInventoryDuplicateShadows(database, inventoryItems, survivor) {
  const survivorPublicId = cleanPublicId(survivor?.public_id)
  const wordpressPublicId = cleanPublicId(survivor?.wordpress_public_id) || survivorPublicId
  const barcode = cleanBarcode(survivor?.barcode)

  if (!survivorPublicId || (!wordpressPublicId && !barcode)) {
    return 0
  }

  const removePublicIds = inventoryItems
    .filter((item) => {
      const itemPublicId = cleanPublicId(item.public_id)

      if (!itemPublicId || itemPublicId === survivorPublicId) {
        return false
      }

      const itemWordPressPublicId = cleanPublicId(item.wordpress_public_id)
      const itemBarcode = cleanBarcode(item.barcode)
      const sameWordPressIdentity =
        wordpressPublicId &&
        (itemPublicId === wordpressPublicId ||
          itemWordPressPublicId === wordpressPublicId ||
          (itemWordPressPublicId && itemWordPressPublicId === survivorPublicId))
      const sameAcceptedBarcode =
        barcode &&
        itemBarcode === barcode &&
        wordpressPublicId &&
        (itemPublicId === wordpressPublicId || itemWordPressPublicId === wordpressPublicId)

      return sameWordPressIdentity || sameAcceptedBarcode
    })
    .map((item) => item.public_id)

  for (const publicId of removePublicIds) {
    database.prepare("DELETE FROM inventory_items WHERE public_id = ?").run(publicId)
    const index = inventoryItems.findIndex((item) => item.public_id === publicId)

    if (index >= 0) {
      inventoryItems.splice(index, 1)
    }
  }

  return removePublicIds.length
}

function shouldConsolidateInventoryQuantityGroup(input = {}) {
  if (!input || typeof input !== "object") {
    return false
  }

  return [
    input.consolidate_inventory_group,
    input.consolidateInventoryGroup,
    input.consolidate_quantity_group,
    input.consolidateQuantityGroup,
  ].some((value) => value === true || ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase()))
}

function sameInventoryStockBucket(left, right) {
  return inventoryStockBucketKey(left) === inventoryStockBucketKey(right)
}

function inventoryStockBucketKey(item = {}) {
  return [
    cleanGame(item.game),
    cleanName(item.card_name).toLowerCase(),
    cleanName(item.set_name).toLowerCase(),
    cleanName(item.set_code).toLowerCase(),
    cleanName(item.card_number || item.printed_number).toLowerCase(),
    cleanName(item.variant).toLowerCase(),
    cleanName(item.finish).toLowerCase(),
    (cleanName(item.language) || "EN").toLowerCase(),
    cleanRawOrGraded(item.raw_or_graded),
    cleanName(item.grading_company).toLowerCase(),
    cleanName(item.grade).toLowerCase(),
    cleanName(item.cert_number).toLowerCase(),
    cleanCondition(item.condition),
  ].join("|")
}

function pendingQueueOperations(queue) {
  return queue.filter((operation) => operation.sync_status === "pending")
}

function buildQueueSummary(queue) {
  const pendingOperations = pendingQueueOperations(queue)
  const byType = pendingOperations.reduce((counts, operation) => {
    const type = cleanName(operation.operation_type) || "unknown"
    counts[type] = (counts[type] ?? 0) + 1

    return counts
  }, {})
  const oldestQueuedAtUtc =
    pendingOperations
      .map((operation) => cleanIsoTimestamp(operation.queued_at_utc))
      .filter(Boolean)
      .sort()[0] ?? ""

  return {
    pending_count: pendingOperations.length,
    local_only_count: queue.filter((operation) => operation.sync_status === "local_only").length,
    oldest_queued_at_utc: oldestQueuedAtUtc,
    by_type: byType,
    items: pendingOperations.slice(0, 10).map(queueOperationSummary),
  }
}

function queueOperationSummary(operation) {
  const payload = operation?.payload && typeof operation.payload === "object" ? operation.payload : {}
  const customer = payload.customer && typeof payload.customer === "object" ? payload.customer : {}
  const ledgerEntry = payload.ledger_entry && typeof payload.ledger_entry === "object" ? payload.ledger_entry : {}
  const squareHandoff = payload.square_handoff && typeof payload.square_handoff === "object" ? payload.square_handoff : {}

  return {
    operation_id: cleanExternalId(operation.operation_id),
    operation_type: cleanName(operation.operation_type) || "unknown",
    entity_id: cleanExternalId(operation.entity_id),
    queued_at_utc: cleanIsoTimestamp(operation.queued_at_utc),
    sync_status: cleanQueueSyncStatus(operation.sync_status),
    sync_intent: cleanExternalId(payload.sync_intent),
    customer_public_id: cleanPublicId(
      customer.customer_public_id ?? ledgerEntry.customer_public_id ?? payload.customer_public_id,
    ),
    wordpress_customer_id: positiveInt(customer.wordpress_customer_id ?? customer.customer_id) ?? 0,
    ledger_entry_id: cleanExternalId(ledgerEntry.entry_id),
    ledger_type: cleanName(ledgerEntry.entry_type),
    amount_minor_units: minorUnits(ledgerEntry.amount_minor_units),
    square_receipt_present: "" !== cleanExternalId(squareHandoff.square_receipt_reference),
    reservation_count: Array.isArray(payload.reservation_ids) ? payload.reservation_ids.length : 0,
  }
}

function cleanQueueSyncStatus(value) {
  const status = String(value ?? "").trim().toLowerCase()

  return ["pending", "local_only"].includes(status) ? status : "pending"
}

function localInventoryStatus(value) {
  const status = String(value ?? "").trim()

  return ["available", "reserved", "sold", "conflict", "pending_intake", "return_review", "damaged", "removed"].includes(status)
    ? status
    : null
}

function resolveInventoryQuantityUpdate(input = {}, previousQuantityOnHand = 0) {
  const previousQuantity = inventoryQuantityOnHand({ quantity_on_hand: previousQuantityOnHand })
  const absoluteQuantityValue = inventoryQuantityInputValue(input, [
    "quantity_on_hand",
    "quantityOnHand",
    "set_quantity",
    "setQuantity",
  ])
  const quantityDeltaValue = inventoryQuantityInputValue(input, [
    "quantity_delta",
    "quantityDelta",
    "delta_quantity",
    "deltaQuantity",
  ])
  const hasAbsoluteQuantity = absoluteQuantityValue !== undefined
  const hasQuantityDelta = quantityDeltaValue !== undefined

  if (hasAbsoluteQuantity && hasQuantityDelta) {
    return blocked(
      "inventory_quantity_update_ambiguous",
      "Send either an absolute inventory quantity or a quantity delta, not both.",
      { previous_quantity_on_hand: previousQuantity },
    )
  }

  if (hasAbsoluteQuantity) {
    const parsedQuantity = parseInventoryQuantity(absoluteQuantityValue)

    if (parsedQuantity === null || parsedQuantity < 0) {
      return blocked(
        "invalid_inventory_quantity",
        "Inventory quantity must be a non-negative whole number.",
        { previous_quantity_on_hand: previousQuantity },
      )
    }

    const quantityOnHand = Math.min(999999, parsedQuantity)

    return {
      status: "ok",
      previous_quantity_on_hand: previousQuantity,
      quantity_on_hand: quantityOnHand,
      quantity_delta: quantityOnHand - previousQuantity,
      quantity_update_mode: "absolute",
    }
  }

  if (hasQuantityDelta) {
    const parsedDelta = parseInventoryQuantity(quantityDeltaValue)

    if (parsedDelta === null) {
      return blocked(
        "invalid_inventory_quantity_delta",
        "Inventory quantity delta must be a whole number.",
        { previous_quantity_on_hand: previousQuantity },
      )
    }

    const quantityOnHand = previousQuantity + parsedDelta

    if (quantityOnHand < 0) {
      return blocked(
        "inventory_quantity_below_zero",
        "Inventory quantity delta cannot reduce stock below zero.",
        {
          previous_quantity_on_hand: previousQuantity,
          requested_quantity_delta: parsedDelta,
        },
      )
    }

    return {
      status: "ok",
      previous_quantity_on_hand: previousQuantity,
      quantity_on_hand: Math.min(999999, quantityOnHand),
      quantity_delta: Math.min(999999, quantityOnHand) - previousQuantity,
      quantity_update_mode: "delta",
    }
  }

  return {
    status: "ok",
    previous_quantity_on_hand: previousQuantity,
    quantity_on_hand: previousQuantity,
    quantity_delta: 0,
    quantity_update_mode: "unchanged",
  }
}

function inventoryQuantityInputValue(input, keys) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      continue
    }

    const value = input[key]

    if (value === null || value === undefined || String(value).trim() === "") {
      continue
    }

    return value
  }

  return undefined
}

function inventoryQuantityUpdateInputProvided(input = {}) {
  return (
    inventoryQuantityInputValue(input, [
      "quantity_on_hand",
      "quantityOnHand",
      "set_quantity",
      "setQuantity",
    ]) !== undefined ||
    inventoryQuantityInputValue(input, [
      "quantity_delta",
      "quantityDelta",
      "delta_quantity",
      "deltaQuantity",
    ]) !== undefined
  )
}

function inventoryStatusUpdateInputProvided(input = {}) {
  if (!input || typeof input !== "object" || !Object.prototype.hasOwnProperty.call(input, "status")) {
    return false
  }

  return localInventoryStatus(input.status) !== null
}

function inventoryPriceUpdateInputProvided(input = {}) {
  if (!input || typeof input !== "object") {
    return false
  }

  return [
    "price_minor_units",
    "sale_price_minor_units",
    "priceMinorUnits",
    "salePriceMinorUnits",
    "minimum_sale_price_minor_units",
    "minimumSalePriceMinorUnits",
    "minimum_price_minor_units",
    "minimumPriceMinorUnits",
  ].some((key) => Object.prototype.hasOwnProperty.call(input, key))
}

function inventoryManualPriceProtected(item = {}) {
  const source = cleanExternalId(item.pricing_source ?? item.price_source ?? "")

  return (
    source.startsWith("manual_") ||
    source.startsWith("staff_manual_") ||
    source === "manual_price_override" ||
    source === "staff_manual_price" ||
    source === "manual_non_usd_scrydex_price_review"
  )
}

function visibilityUpdateInputProvided(input = {}, channel = "") {
  if (!input || typeof input !== "object") {
    return false
  }

  const aliases = {
    online: ["online_visibility", "onlineVisibility"],
    kiosk: ["kiosk_visibility", "kioskVisibility"],
    pos: ["pos_visibility", "posVisibility"],
  }[channel] ?? []

  return aliases.some((key) => Object.prototype.hasOwnProperty.call(input, key))
}

function parseInventoryQuantity(value) {
  const rawValue = String(value ?? "").trim()

  if (!rawValue) {
    return null
  }

  const parsed = Number(rawValue)

  return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : null
}

function inventoryQuantityOnHand(item = {}) {
  const parsedQuantity = parseInventoryQuantity(item.quantity_on_hand ?? item.quantityOnHand)

  if (parsedQuantity !== null) {
    return Math.min(999999, Math.max(0, parsedQuantity))
  }

  return ["sold", "removed"].includes(localInventoryStatus(item.status)) ? 0 : 1
}

function seedUsers() {
  return [
    buildSeedUser({
      id: "staff-front-counter",
      name: "Front Counter Staff",
      pin: "1234",
      role: "staff",
      access: ["Inventory", "Trade-Ins", "Kiosk", "Queue", "Events", "Customers", "Sync", "Status"],
      salt: "seed-staff-front-counter",
    }),
    buildSeedUser({
      id: "preview-manager",
      name: "Store Owner",
      pin: "1420",
      role: "owner",
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

function seedEventSnapshots(now = () => new Date()) {
  const firstStart = new Date(now().getTime() + 30 * 24 * 60 * 60 * 1000)
  const secondStart = new Date(now().getTime() + 32 * 24 * 60 * 60 * 1000)

  return [
    {
      event_id: "event-100",
      slug: "event-100",
      row_version: 3,
      title: "Friday Commander Night",
      starts_at_utc: firstStart.toISOString(),
      starts_at_label: firstStart.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }),
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
      starts_at_utc: secondStart.toISOString(),
      starts_at_label: secondStart.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }),
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

function userNameById(userId, users) {
  const cleanedId = cleanPublicId(userId)
  const user = (Array.isArray(users) ? users : []).find((candidate) => cleanPublicId(candidate.id) === cleanedId)

  return cleanName(user?.name) || cleanedId || "System"
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
    grading_company: cleanName(item.grading_company),
    grade: cleanName(item.grade),
    cert_number: cleanName(item.cert_number),
    condition: item.condition,
    barcode: item.barcode,
    price_minor_units: item.price_minor_units,
    sale_price_minor_units: item.price_minor_units,
    display_price_minor_units: item.price_minor_units,
    quantity_on_hand: inventoryQuantityOnHand(item),
    market_price_minor_units: Math.max(0, minorUnits(item.market_price_minor_units)),
    minimum_sale_price_minor_units: Math.max(0, minorUnits(item.minimum_sale_price_minor_units)),
    floor_price_minor_units: Math.max(0, minorUnits(item.minimum_sale_price_minor_units)),
    auto_price_minor_units: Math.max(0, minorUnits(item.auto_price_minor_units)),
    pricing_source: cleanName(item.pricing_source),
    price_observed_at_utc: cleanIsoTimestamp(item.price_observed_at_utc),
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
    square_location_id: cleanExternalId(item.square_location_id),
    external_sync_state: cleanExternalSyncState(item.external_sync_state),
    created_by_user_id: cleanPublicId(item.created_by_user_id),
    created_by_user_name: cleanName(item.created_by_user_name),
    updated_by_user_id: cleanPublicId(item.updated_by_user_id),
    updated_by_user_name: cleanName(item.updated_by_user_name),
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
    grading_company: cleanName(row.grading_company),
    grade: cleanName(row.grade),
    cert_number: cleanName(row.cert_number),
    condition: cleanCondition(row.condition_code ?? row.condition),
    barcode: cleanBarcode(row.barcode ?? row.sku) || publicId,
    price_minor_units: priceMinorUnits,
    quantity_on_hand: inventoryQuantityOnHand(row),
    minimum_sale_price_minor_units:
      row.minimum_sale_price_minor_units !== undefined && row.minimum_sale_price_minor_units !== null && row.minimum_sale_price_minor_units !== ""
        ? Math.max(0, minorUnits(row.minimum_sale_price_minor_units))
        : minorUnitsFromDecimal(row.minimum_sale_price ?? priceMinorUnits / 100),
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
    square_location_id: cleanExternalId(row.square_location_id),
    external_sync_state: cleanExternalSyncState(row.external_sync_state),
    created_by_user_id: cleanPublicId(row.created_by_user_id ?? row.created_by),
    created_by_user_name: cleanName(row.created_by_user_name) || "WordPress",
    updated_by_user_id: cleanPublicId(row.updated_by_user_id ?? row.updated_by),
    updated_by_user_name: cleanName(row.updated_by_user_name) || "WordPress",
    source: "cached",
  }
}

function wordpressInventoryRowHasQuantity(row = {}) {
  if (!row || typeof row !== "object") {
    return false
  }

  return [
    "quantity_on_hand",
    "quantityOnHand",
    "set_quantity",
    "setQuantity",
    "stock_quantity",
    "stockQuantity",
    "available_quantity",
    "availableQuantity",
  ].some(
    (key) =>
      Object.prototype.hasOwnProperty.call(row, key) &&
      String(row[key] ?? "").trim() !== "",
  )
}

function wordpressInventoryRemoteAuthority(input = {}) {
  if (!input || typeof input !== "object") {
    return false
  }

  if (
    input.remote_authority === true ||
    input.remoteAuthority === true ||
    input.manual_remote_authority === true ||
    input.manualRemoteAuthority === true ||
    input.allow_remote_inventory_authority === true ||
    input.allowRemoteInventoryAuthority === true
  ) {
    return true
  }

  const authority = cleanName(input.inventory_authority ?? input.inventoryAuthority ?? input.authority).toLowerCase()

  return ["wordpress", "remote", "manual_remote_authority", "manual remote authority"].includes(authority)
}

function wordpressInventoryPullAllowsQuantityIncrease(input = {}) {
  if (!input || typeof input !== "object") {
    return false
  }

  return [
    input.allow_remote_inventory_increase,
    input.allowRemoteInventoryIncrease,
    input.allow_remote_quantity_increase,
    input.allowRemoteQuantityIncrease,
  ].some((value) => value === true || ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase()))
}

function websitePulledInventoryQuantityOnHand(existing, pulledItem, pulledHasQuantity, allowIncrease = false) {
  const existingQuantity = inventoryQuantityOnHand(existing)

  if (!pulledHasQuantity) {
    return existingQuantity
  }

  const pulledQuantity = inventoryQuantityOnHand(pulledItem)

  return allowIncrease ? pulledQuantity : Math.min(existingQuantity, pulledQuantity)
}

function websitePulledInventoryQuantityIncreaseIgnored(existing, pulledItem, pulledHasQuantity, allowIncrease = false) {
  return (
    pulledHasQuantity &&
    !allowIncrease &&
    inventoryQuantityOnHand(pulledItem) > inventoryQuantityOnHand(existing)
  )
}

function websitePulledInventoryMatchesExisting(existing, pulledItem, pulledHasQuantity) {
  if (!existing || !pulledItem) {
    return false
  }

  const textFields = [
    "wordpress_public_id",
    "provider_card_id",
    "provider_variant_id",
    "game",
    "card_name",
    "set_name",
    "set_code",
    "card_number",
    "printed_number",
    "variant",
    "finish",
    "language",
    "raw_or_graded",
    "grading_company",
    "grade",
    "cert_number",
    "condition",
    "barcode",
    "currency",
    "location",
    "status",
    "image_url",
    "back_image_url",
    "online_visibility",
    "kiosk_visibility",
    "pos_visibility",
    "square_catalog_item_id",
    "square_catalog_variation_id",
    "square_location_id",
    "external_sync_state",
  ]

  for (const field of textFields) {
    if (String(existing[field] ?? "") !== String(pulledItem[field] ?? "")) {
      return false
    }
  }

  const numericFields = ["reference_variant_id", "price_minor_units", "minimum_sale_price_minor_units"]

  for (const field of numericFields) {
    if (Number(existing[field] ?? 0) !== Number(pulledItem[field] ?? 0)) {
      return false
    }
  }

  if (pulledHasQuantity && inventoryQuantityOnHand(existing) !== inventoryQuantityOnHand(pulledItem)) {
    return false
  }

  return true
}

function websitePulledInventoryShouldSyncSquare(existing, mergedItem, pulledHasQuantity) {
  if (!mergedItem || !pulledHasQuantity) {
    return false
  }

  if (!cleanExternalId(mergedItem.square_catalog_variation_id)) {
    return true
  }

  const fields = [
    "barcode",
    "card_name",
    "set_name",
    "set_code",
    "card_number",
    "printed_number",
    "variant",
    "finish",
    "raw_or_graded",
    "grading_company",
    "grade",
    "condition",
    "status",
    "pos_visibility",
    "currency",
  ]

  for (const field of fields) {
    if (String(existing?.[field] ?? "") !== String(mergedItem[field] ?? "")) {
      return true
    }
  }

  return (
    Number(existing?.price_minor_units ?? 0) !== Number(mergedItem.price_minor_units ?? 0) ||
    inventoryQuantityOnHand(existing) !== inventoryQuantityOnHand(mergedItem)
  )
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
    event_type: cleanEventType(row.event_type),
    game: cleanGame(row.game),
    entry_fee_minor_units: minorUnitsFromDecimal(row.entry_fee),
    registration_deadline_utc: cleanIsoTimestamp(row.registration_deadline),
    woocommerce_product_id: positiveInt(row.woocommerce_product_id) ?? 0,
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

function squarePosPullFeedRows(inventoryItems, barcodeMappings) {
  return barcodeMappings.map((mapping) => {
    const item = inventoryItemForSquareMapping(inventoryItems, mapping)
    const expectedCount = String(mapping.expectedSquareCountPull?.expected_serialized_quantity ?? "")

    return {
      public_id: cleanPublicId(mapping.publicId ?? item?.public_id),
      card_name: cleanName(item?.card_name) || "Mapped inventory item",
      set_name: cleanName(item?.set_name),
      condition: cleanCondition(item?.condition),
      barcode: cleanBarcode(mapping.barcode ?? item?.barcode),
      sku: cleanBarcode(mapping.sku ?? mapping.scanIdentity ?? item?.barcode),
      square_catalog_item_id: cleanExternalId(mapping.squareCatalogItemId ?? item?.square_catalog_item_id),
      square_catalog_variation_id: cleanExternalId(
        mapping.squareCatalogVariationId ?? item?.square_catalog_variation_id,
      ),
      square_location_id: cleanExternalId(mapping.squareLocationId),
      status: localInventoryStatus(item?.status) ?? "conflict",
      pos_visibility: cleanVisibility(item?.pos_visibility, "hidden"),
      expected_serialized_quantity: expectedCount || "0",
      price_minor_units: Math.max(0, minorUnits(item?.price_minor_units)),
      location: cleanName(item?.location),
      row_version: boundedInt(item?.row_version, 1, 999999999, 1),
      source: cleanName(item?.source) || "cached",
    }
  })
}

function squarePosReviewItems(inventoryItems, unresolvedMappings) {
  return unresolvedMappings.map((mapping) => {
    const item = inventoryItemForSquareMapping(inventoryItems, mapping)
    const errors = Array.isArray(mapping.errors)
      ? mapping.errors.map((error) => cleanName(error)).filter(Boolean)
      : []

    return {
      public_id: cleanPublicId(mapping.publicId ?? item?.public_id),
      card_name: cleanName(item?.card_name) || "Unmapped inventory item",
      set_name: cleanName(item?.set_name),
      condition: cleanCondition(item?.condition),
      barcode: cleanBarcode(mapping.barcode ?? item?.barcode),
      sku: cleanBarcode(mapping.sku ?? mapping.scanIdentity ?? item?.barcode),
      scan_identity: cleanBarcode(mapping.scanIdentity ?? mapping.sku ?? mapping.barcode ?? item?.barcode),
      status: localInventoryStatus(item?.status) ?? "conflict",
      pos_visibility: cleanVisibility(item?.pos_visibility, "hidden"),
      square_catalog_variation_id: cleanExternalId(item?.square_catalog_variation_id),
      errors,
      issue_labels: squarePosIssueLabels(errors),
      next_action: squarePosReviewNextAction(errors),
    }
  })
}

function squarePosMappingSummary(inventoryItems, squarePullFeed, reviewItems) {
  const posVisibleItems = inventoryItems.filter((item) => cleanVisibility(item.pos_visibility, "hidden") === "visible")
  const mappedPublicIds = new Set(squarePullFeed.map((row) => row.public_id).filter(Boolean))
  const duplicateScanIdentityCount = reviewItems.filter((item) => item.errors.includes("duplicate_barcode_or_sku")).length
  const unmappedVisibleCount = posVisibleItems.filter((item) => !mappedPublicIds.has(cleanPublicId(item.public_id))).length

  return {
    total_inventory_count: inventoryItems.length,
    pos_visible_count: posVisibleItems.length,
    pos_hidden_count: inventoryItems.filter((item) => cleanVisibility(item.pos_visibility, "hidden") === "hidden").length,
    pos_staff_only_count: inventoryItems.filter((item) => cleanVisibility(item.pos_visibility, "hidden") === "staff_only").length,
    available_pos_visible_count: posVisibleItems.filter((item) => localInventoryStatus(item.status) === "available").length,
    ready_for_square_pull_count: squarePullFeed.length,
    ready_available_count: squarePullFeed.filter((row) => row.expected_serialized_quantity === "1").length,
    ready_zero_count: squarePullFeed.filter((row) => row.expected_serialized_quantity === "0").length,
    review_count: reviewItems.length,
    unmapped_pos_visible_count: unmappedVisibleCount,
    duplicate_scan_identity_count: duplicateScanIdentityCount,
    square_inventory_authority: "tcg_store_platform",
    square_counts_used_for: "pos_reconciliation_and_exception_detection",
  }
}

function squarePosNextActions(plannerStatus, reviewItems, squarePullFeed) {
  const actions = []
  const errors = new Set(reviewItems.flatMap((item) => item.errors))

  if (errors.has("duplicate_barcode_or_sku")) {
    actions.push("Resolve duplicate barcode/SKU values before Square count comparison.")
  }

  if (errors.has("square_catalog_variation_id_required_for_inventory_pull")) {
    actions.push("Map POS-visible website inventory to Square catalog variations or hide it from POS until mapped.")
  }

  if (errors.has("square_location_id_required_for_inventory_pull")) {
    actions.push("Set the Square location ID in the local server or website connector settings.")
  }

  if (squarePullFeed.length === 0) {
    actions.push("Pull website inventory into the LAN cache after Square mappings are available.")
  }

  if (plannerStatus === "ready" && actions.length === 0) {
    actions.push("Ready to retrieve Square inventory counts for reconciliation; payment capture still stays in Square.")
  }

  if (plannerStatus === "conflict" && actions.length === 0) {
    actions.push("Review unmapped POS rows before using the Square pull plan.")
  }

  return actions
}

function squarePosIssueLabels(errors) {
  return errors.map((error) => {
    if (error === "duplicate_barcode_or_sku") {
      return "Duplicate barcode/SKU"
    }

    if (error === "square_catalog_variation_id_required_for_inventory_pull") {
      return "Missing Square variation"
    }

    if (error === "square_location_id_required_for_inventory_pull") {
      return "Missing Square location"
    }

    if (error === "barcode_or_sku_required") {
      return "Missing barcode/SKU"
    }

    return error.replace(/_/g, " ")
  })
}

function squarePosReviewNextAction(errors) {
  if (errors.includes("duplicate_barcode_or_sku")) {
    return "Assign a unique barcode/SKU before Square can match this row."
  }

  if (errors.includes("square_catalog_variation_id_required_for_inventory_pull")) {
    return "Create or link a Square catalog variation for this website inventory row."
  }

  if (errors.includes("square_location_id_required_for_inventory_pull")) {
    return "Configure the Square location ID before planning count pulls."
  }

  if (errors.includes("barcode_or_sku_required")) {
    return "Add a barcode/SKU so Square POS can scan and reconcile the item."
  }

  return "Review this POS inventory row before enabling Square reconciliation."
}

function normalizeSquareSaleScanInputs(input = {}) {
  const rawScans = []

  if (Array.isArray(input.inventory_public_ids)) {
    rawScans.push(...input.inventory_public_ids)
  }

  if (Array.isArray(input.inventoryPublicIds)) {
    rawScans.push(...input.inventoryPublicIds)
  }

  if (Array.isArray(input.barcodes)) {
    rawScans.push(...input.barcodes)
  }

  if (Array.isArray(input.scans)) {
    rawScans.push(...input.scans)
  }

  if (Array.isArray(input.items)) {
    for (const item of input.items) {
      if (typeof item === "string") {
        rawScans.push(item)
        continue
      }

      if (item && typeof item === "object") {
        rawScans.push(
          item.inventory_public_id ??
            item.inventoryPublicId ??
            item.wordpress_public_id ??
            item.wordpressPublicId ??
            item.public_id ??
            item.publicId ??
            item.barcode ??
            item.sku ??
            item.scan_identity ??
            item.scanIdentity,
        )
      }
    }
  }

  const seen = new Set()
  const scans = []

  for (const rawScan of rawScans) {
    const scan = cleanPublicId(rawScan) || cleanBarcode(rawScan)

    if (scan && !seen.has(scan)) {
      seen.add(scan)
      scans.push(scan)
    }
  }

  return scans
}

function findInventoryItemBySaleScan(inventoryItems, scan) {
  const publicId = cleanPublicId(scan)
  const barcode = cleanBarcode(scan)

  return inventoryItems.find((item) => cleanPublicId(item.public_id) === publicId)
    ?? inventoryItems.find((item) => cleanPublicId(item.wordpress_public_id) === publicId)
    ?? inventoryItems.find((item) => cleanBarcode(item.barcode) === barcode)
    ?? null
}

function squareCountsPayloadFromInput(input = {}) {
  if (Array.isArray(input)) {
    return { counts: input }
  }

  if (Array.isArray(input.square_counts)) {
    return { counts: input.square_counts }
  }

  if (Array.isArray(input.counts)) {
    return { counts: input.counts }
  }

  if (Array.isArray(input.inventory_counts)) {
    return { inventory_counts: input.inventory_counts }
  }

  if (input.square_counts_response && typeof input.square_counts_response === "object") {
    return input.square_counts_response
  }

  if (input.squareCountsResponse && typeof input.squareCountsResponse === "object") {
    return input.squareCountsResponse
  }

  return { counts: [] }
}

function squareCountsPayloadHasCounts(payload = {}) {
  return squareInventoryCountRowsFromPayload(payload).length > 0
}

function squareInventoryReconciliationGroups(inventoryItems) {
  const groups = new Map()

  for (const item of inventoryItems) {
    const status = localInventoryStatus(item.status)
    const variationId = cleanExternalId(item.square_catalog_variation_id)

    if (!variationId || cleanVisibility(item.pos_visibility, "hidden") !== "visible") {
      continue
    }

    if (status !== "available") {
      continue
    }

    const group = groups.get(variationId) ?? []
    group.push(item)
    groups.set(variationId, group)
  }

  return groups
}

function squareInventoryQuantityByVariation(payload = {}, preferredLocationId = "") {
  const countsByVariation = new Map()
  const normalizedPreferredLocationId = cleanExternalId(preferredLocationId)

  for (const count of squareInventoryCountRowsFromPayload(payload)) {
    if (normalizedPreferredLocationId && count.location_id && count.location_id !== normalizedPreferredLocationId) {
      continue
    }

    if (count.state && count.state !== "IN_STOCK") {
      continue
    }

    countsByVariation.set(
      count.catalog_object_id,
      (countsByVariation.get(count.catalog_object_id) ?? 0) + count.quantity,
    )
  }

  return countsByVariation
}

function squareInventoryCountRowsFromPayload(payload = {}) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.counts)
      ? payload.counts
      : Array.isArray(payload?.inventory_counts)
        ? payload.inventory_counts
        : Array.isArray(payload?.inventoryCounts)
          ? payload.inventoryCounts
          : []

  return rows
    .filter((row) => row && typeof row === "object" && !Array.isArray(row))
    .map((row) => ({
      catalog_object_id: cleanExternalId(
        row.catalog_object_id ??
          row.catalogObjectId ??
          row.catalog_object ??
          row.catalogObject ??
          row.variation_id ??
          row.variationId,
      ),
      location_id: cleanExternalId(row.location_id ?? row.locationId),
      state: cleanName(row.state).toUpperCase(),
      quantity: Math.max(0, Number.parseInt(String(row.quantity ?? row.count ?? "0"), 10) || 0),
    }))
    .filter((row) => row.catalog_object_id)
}

function squareInventorySaleCandidateSort(left, right) {
  const leftStatus = localInventoryStatus(left.status) === "available" ? 0 : 1
  const rightStatus = localInventoryStatus(right.status) === "available" ? 0 : 1

  if (leftStatus !== rightStatus) {
    return leftStatus - rightStatus
  }

  return boundedInt(left.row_version, 1, 999999999, 1) - boundedInt(right.row_version, 1, 999999999, 1)
}

function inventoryMismatchDiagnosticOrigin(item = {}) {
  const actorId = cleanPublicId(item.updated_by_user_id)
  const actorName = cleanName(item.updated_by_user_name).toLowerCase()
  const source = cleanName(item.source).toLowerCase()
  const syncState = cleanExternalId(item.external_sync_state)

  if (actorId === "hold-expiry" || actorName === "hold expiry") {
    return "hold_expiry"
  }

  if (actorId === "square-inventory-poll" || actorName.includes("square") || syncState === "square_synced") {
    return "square"
  }

  if (actorId.includes("kiosk") || actorName.includes("kiosk") || source.includes("kiosk")) {
    return "kiosk"
  }

  if (actorName === "wordpress" || source === "accepted") {
    return "website"
  }

  if (actorId || actorName) {
    return "manual_staff_adjustment"
  }

  return source || "unknown"
}

function inventoryMismatchResolutionHint(item = {}) {
  const origin = inventoryMismatchDiagnosticOrigin(item)

  if (origin === "hold_expiry") {
    return "Verify the physical card before removing stock; hold expiry restored local availability without a confirmed Square sale."
  }

  if (origin === "square") {
    return "Check Square receipt, refund, and inventory adjustment history before changing website inventory."
  }

  if (origin === "kiosk") {
    return "Check kiosk order/payment state and reservation expiry before changing stock."
  }

  if (origin === "website") {
    return "Check website order/import history and Square mapping before changing stock."
  }

  if (origin === "manual_staff_adjustment") {
    return "Check the staff adjustment reason and physical card count before changing stock."
  }

  return "Investigate sale, refund, manual adjustment, or mapping history before changing stock."
}

function squareCountReconciliationReference(variationId, generatedAtUtc) {
  const timestamp = generatedAtUtc.replace(/[^\d]/g, "").slice(0, 14)
  const suffix = cleanExternalId(variationId).slice(-14) || "UNKNOWN"

  return `SQ-COUNT-${suffix}-${timestamp}`.slice(0, 80)
}

function squarePosCountComparisonRows(inventoryItems, comparisons) {
  return comparisons.map((comparison) => {
    const item = inventoryItemForSquareMapping(inventoryItems, comparison)
    const issue = cleanName(comparison.issue)
    const status = cleanName(comparison.status) || "review"

    return {
      public_id: cleanPublicId(comparison.publicId ?? item?.public_id),
      card_name: cleanName(item?.card_name) || "Mapped inventory item",
      set_name: cleanName(item?.set_name),
      condition: cleanCondition(item?.condition),
      barcode: cleanBarcode(comparison.barcode ?? item?.barcode),
      sku: cleanBarcode(comparison.sku ?? comparison.scanIdentity ?? item?.barcode),
      square_catalog_item_id: cleanExternalId(comparison.squareCatalogItemId ?? item?.square_catalog_item_id),
      square_catalog_variation_id: cleanExternalId(
        comparison.squareCatalogVariationId ?? item?.square_catalog_variation_id,
      ),
      square_location_id: cleanExternalId(comparison.squareLocationId),
      expected_serialized_quantity: String(comparison.expectedSerializedQuantity ?? "0"),
      actual_square_quantity:
        comparison.actualSquareQuantity === null || comparison.actualSquareQuantity === undefined
          ? null
          : String(comparison.actualSquareQuantity),
      status,
      issue,
      issue_label: squarePosCountIssueLabel(issue),
      next_action: squarePosCountNextAction(status, issue),
      location: cleanName(item?.location),
    }
  })
}

function squarePosCountReconciliationNextActions(reconciliationStatus, comparisons, unexpectedCounts) {
  const actions = []

  if (comparisons.some((row) => row.status === "mismatch")) {
    actions.push("Review Square count mismatches against serialized website inventory before changing stock.")
  }

  if (comparisons.some((row) => row.status === "missing_square_count")) {
    actions.push("Confirm missing Square counts are true zeroes or link the Square variation/location.")
  }

  if (unexpectedCounts.length > 0) {
    actions.push("Investigate Square count rows that do not map back to website inventory.")
  }

  if (reconciliationStatus === "accepted" && actions.length === 0) {
    actions.push("Square counts match serialized website inventory; no inventory mutation is required.")
  }

  if (reconciliationStatus === "conflict" && actions.length === 0) {
    actions.push("Review Square reconciliation rows before updating inventory.")
  }

  return actions
}

function squarePosCountIssueLabel(issue) {
  if (issue === "square_count_missing_for_expected_variation") {
    return "Missing Square count"
  }

  if (issue === "square_count_does_not_match_serialized_inventory") {
    return "Count mismatch"
  }

  if (issue === "square_count_without_wordpress_mapping") {
    return "Unexpected Square count"
  }

  return issue ? issue.replace(/_/g, " ") : "Matched"
}

function squarePosCountNextAction(status, issue) {
  if (status === "matched") {
    return "No action; Square count matches the website serialized inventory expectation."
  }

  if (issue === "square_count_missing_for_expected_variation") {
    return "Verify the Square variation/location mapping or treat the Square value as zero for review."
  }

  if (issue === "square_count_does_not_match_serialized_inventory") {
    return "Investigate sale, refund, or manual Square adjustment before changing website inventory."
  }

  return "Review this Square count before using it for reconciliation."
}

function inventoryItemForSquareMapping(inventoryItems, mapping) {
  const publicId = cleanPublicId(mapping.publicId ?? mapping.public_id)
  const scanIdentity = cleanBarcode(mapping.scanIdentity ?? mapping.sku ?? mapping.barcode)
  const squareVariationId = cleanExternalId(mapping.squareCatalogVariationId ?? mapping.square_catalog_variation_id)

  return inventoryItems.find((item) => cleanPublicId(item.public_id) === publicId)
    ?? inventoryItems.find((item) => cleanExternalId(item.square_catalog_variation_id) === squareVariationId)
    ?? inventoryItems.find((item) => cleanBarcode(item.barcode) === scanIdentity)
    ?? null
}

function kioskOrderItemSnapshot(item) {
  return {
    public_id: cleanPublicId(item.public_id),
    card_name: cleanName(item.card_name),
    set_name: cleanName(item.set_name),
    condition: cleanCondition(item.condition),
    barcode: cleanBarcode(item.barcode),
    location: cleanName(item.location),
    price_minor_units: Math.max(0, minorUnits(item.price_minor_units)),
    currency: cleanCurrency(item.currency),
    status: localInventoryStatus(item.status) ?? "conflict",
    row_version: boundedInt(item.row_version, 1, 999999999, 1),
  }
}

function cleanKioskOrderItems(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      public_id: cleanPublicId(item.public_id ?? item.publicId),
      card_name: cleanName(item.card_name ?? item.cardName),
      set_name: cleanName(item.set_name ?? item.setName),
      condition: cleanCondition(item.condition),
      barcode: cleanBarcode(item.barcode),
      location: cleanName(item.location),
      price_minor_units: Math.max(0, minorUnits(item.price_minor_units ?? item.priceMinorUnits)),
      currency: cleanCurrency(item.currency),
      status: localInventoryStatus(item.status) ?? "conflict",
      row_version: boundedInt(item.row_version ?? item.rowVersion, 1, 999999999, 1),
    }))
    .filter((item) => item.public_id || item.card_name)
}

function cleanKioskOrderStatus(value) {
  const status = kioskOrderStatusSlug(value)

  if (["queued", "accepted", "pulling", "ready", "completed", "expired"].includes(status)) {
    return status
  }

  if (status === "reserved_for_pickup" || status === "reserved") {
    return "accepted"
  }

  return "queued"
}

function cleanKioskPaymentStatus(value) {
  return value === "paid" ? "paid" : "pay_at_store"
}

function earliestReservationExpiry(reservations) {
  const timestamps = (Array.isArray(reservations) ? reservations : [])
    .map((reservation) => cleanIsoTimestamp(reservation?.expires_at_utc ?? reservation?.expiresAtUtc))
    .filter(Boolean)
    .sort()

  return timestamps[0] ?? ""
}

function localReservationExpired(operation, nowDate, holdSeconds) {
  if (!operation || operation.sync_status !== "pending") {
    return false
  }

  const explicitExpiry = cleanIsoTimestamp(operation.payload?.expires_at_utc ?? operation.payload?.expiresAtUtc)
  if (explicitExpiry) {
    return localHoldExpiredAt(explicitExpiry, nowDate)
  }

  const queuedAt = cleanIsoTimestamp(operation.queued_at_utc ?? operation.payload?.created_at_utc)
  if (!queuedAt) {
    return false
  }

  return new Date(queuedAt).getTime() + holdSeconds * 1000 <= nowDate.getTime()
}

function localHoldExpiredAt(expiresAtUtc, nowDate) {
  const expiry = cleanIsoTimestamp(expiresAtUtc)
  if (!expiry) {
    return false
  }

  const expiryTime = new Date(expiry).getTime()

  return Number.isFinite(expiryTime) && expiryTime <= nowDate.getTime()
}

function localKioskOrderExpired(order, nowDate, holdSeconds) {
  const explicitExpiry = cleanIsoTimestamp(order?.hold_expires_at_utc ?? order?.holdExpiresAtUtc)

  if (explicitExpiry) {
    return localHoldExpiredAt(explicitExpiry, nowDate)
  }

  const createdAt = cleanIsoTimestamp(order?.created_at_utc ?? order?.createdAtUtc)
  if (!createdAt) {
    return false
  }

  const createdTime = new Date(createdAt).getTime()

  return Number.isFinite(createdTime) && createdTime + holdSeconds * 1000 <= nowDate.getTime()
}

function cleanTradeInItems(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => {
      const marketMidMinorUnits = Math.max(
        0,
        minorUnits(item.market_mid_minor_units ?? item.marketMidMinorUnits ?? item.market_price_minor_units),
      )
      const percentageBasisPoints = cleanTradeInPercentageBasisPoints(
        item.trade_in_percentage_basis_points ?? item.percentageBasisPoints,
      )
      const calculatedFinalValueMinorUnits = tradeInValueMinorUnits(marketMidMinorUnits, percentageBasisPoints)
      const explicitOfferValueMinorUnits = cleanTradeInFinalValueMinorUnits(
        item.offer_value_minor_units ?? item.offerValueMinorUnits,
      )
      const requestedFinalValueMinorUnits = cleanTradeInFinalValueMinorUnits(
        item.final_value_minor_units ?? item.finalValueMinorUnits,
      )
      const quantity = boundedInt(item.quantity ?? item.qty, 1, 999, 1)
      const finalValueMinorUnits =
        explicitOfferValueMinorUnits ?? requestedFinalValueMinorUnits ?? calculatedFinalValueMinorUnits
      const finalValueManuallySet =
        item.final_value_manually_set === true ||
        item.finalValueManuallySet === true ||
        (
          explicitOfferValueMinorUnits === null &&
          requestedFinalValueMinorUnits !== null &&
          requestedFinalValueMinorUnits !== calculatedFinalValueMinorUnits
        )

      return {
        item_id: cleanPublicId(item.item_id ?? item.id) || `trade-item-${index + 1}`,
        product_type: cleanRawOrGraded(item.product_type ?? item.productType ?? item.raw_or_graded),
        card_name: cleanName(item.card_name ?? item.cardName),
        set_name: cleanName(item.set_name ?? item.setName),
        condition: cleanCondition(item.condition),
        grading_company: cleanName(item.grading_company ?? item.gradingCompany),
        grade: cleanName(item.grade),
        cert_number: cleanName(item.cert_number ?? item.certNumber),
        market_mid_minor_units: marketMidMinorUnits,
        trade_in_percentage_basis_points: percentageBasisPoints,
        calculated_final_value_minor_units: calculatedFinalValueMinorUnits,
        offer_value_minor_units: finalValueMinorUnits,
        final_value_minor_units: finalValueMinorUnits,
        final_value_manually_set: finalValueManuallySet,
        quantity,
        final_value_source:
          explicitOfferValueMinorUnits !== null
            ? "explicit_offer"
            : finalValueManuallySet
              ? "manual_override"
              : "calculated_percentage",
        payout_type: cleanTradeInPayoutType(item.payout_type ?? item.payoutType),
        image_url: cleanHttpUrl(item.image_url ?? item.imageUrl),
        provider_card_id: cleanPublicId(item.provider_card_id ?? item.providerCardId),
        reference_variant_id: positiveInt(item.reference_variant_id ?? item.referenceVariantId),
        provider_variant_id: cleanPublicId(item.provider_variant_id ?? item.providerVariantId),
        game: cleanGame(item.game),
        set_code: cleanName(item.set_code ?? item.setCode).toUpperCase(),
        card_number: cleanName(item.card_number ?? item.cardNumber),
        printed_number: cleanName(item.printed_number ?? item.printedNumber),
        variant: cleanName(item.variant),
        finish: cleanName(item.finish),
        language: cleanName(item.language) || "EN",
        back_image_url: cleanHttpUrl(item.back_image_url ?? item.backImageUrl),
        price_source: cleanName(item.price_source ?? item.priceSource),
        price_observed_at_utc: cleanIsoTimestamp(item.price_observed_at_utc ?? item.priceObservedAtUtc),
        manual_entry:
          item.manual_entry === true ||
          item.manualEntry === true ||
          !cleanPublicId(item.provider_card_id ?? item.providerCardId),
      }
    })
    .filter((item) => item.card_name && (item.market_mid_minor_units > 0 || item.final_value_manually_set))
}

function cleanTradeInStatus(value) {
  const status = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_")

  return ["draft", "review", "approved", "paid", "converted", "rejected", "completed", "voided"].includes(status)
    ? status
    : ""
}

function cleanTradeInStatusList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.map(cleanTradeInStatus).filter(Boolean))]
}

function cleanTradeInPayoutType(value) {
  return String(value ?? "").trim().toLowerCase() === "cash" ? "cash" : "credit"
}

function cleanCashDrawerSessionStatus(value) {
  const status = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_")

  return ["open", "closed"].includes(status) ? status : "open"
}

function cleanCashDrawerMovementType(value) {
  const type = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_")

  return [
    "opening_float",
    "cash_sale",
    "cash_trade_payout",
    "bank_cash_add",
    "bank_cash_remove",
    "manual_adjustment",
    "closing_count",
    "drawer_opened",
  ].includes(type)
    ? type
    : "manual_adjustment"
}

function cleanCashDrawerReferenceType(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80)
}

function summarizeCashDrawerMovements(movements = []) {
  return (Array.isArray(movements) ? movements : []).reduce(
    (totals, movement) => {
      const amount = Math.trunc(minorUnits(movement.amount_minor_units))

      switch (cleanCashDrawerMovementType(movement.movement_type)) {
        case "cash_sale":
          totals.cash_sales_minor_units += Math.max(0, amount)
          break
        case "cash_trade_payout":
          totals.cash_trade_payout_minor_units += Math.abs(amount)
          break
        case "bank_cash_add":
          totals.cash_added_minor_units += Math.max(0, amount)
          break
        case "bank_cash_remove":
          totals.cash_removed_minor_units += Math.abs(amount)
          break
        default:
          break
      }

      return totals
    },
    {
      cash_sales_minor_units: 0,
      cash_trade_payout_minor_units: 0,
      cash_added_minor_units: 0,
      cash_removed_minor_units: 0,
    },
  )
}

function cleanTradeInPercentageBasisPoints(value) {
  const parsed = boundedInt(value, 0, 10000, 6000)

  return parsed % 500 === 0 ? parsed : Math.round(parsed / 500) * 500
}

function cleanTradeInFinalValueMinorUnits(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null
  }

  return Math.max(0, minorUnits(value))
}

function cleanTradeInCustomerIdNumber(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9\- ]/g, "")
    .slice(0, 64)
}

function cleanTradeInCustomerIdState(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2)
}

function maskTradeInCustomerIdNumber(value) {
  const cleaned = cleanTradeInCustomerIdNumber(value)

  if (!cleaned) {
    return ""
  }

  const visible = cleaned.replace(/[^a-zA-Z0-9]/g, "").slice(-4)

  return visible ? `****${visible}` : "****"
}

function tradeInValueMinorUnits(marketMidMinorUnits, percentageBasisPoints) {
  const raw = Math.floor((Math.max(0, minorUnits(marketMidMinorUnits)) * cleanTradeInPercentageBasisPoints(percentageBasisPoints)) / 10000)

  return Math.floor(raw / 100) * 100
}

function sleepMs(milliseconds) {
  const safeMilliseconds = boundedInt(milliseconds, 0, 60000, 0)

  return safeMilliseconds > 0 ? new Promise((resolve) => setTimeout(resolve, safeMilliseconds)) : Promise.resolve()
}

function autoRetailPriceMinorUnits(marketMinorUnits, markupBasisPoints = 1000) {
  const safeMarketMinorUnits = Math.max(0, minorUnits(marketMinorUnits))
  const safeMarkupBasisPoints = boundedInt(markupBasisPoints, 0, 10000, 1000)
  const rawMinorUnits = Math.round((safeMarketMinorUnits * (10000 + safeMarkupBasisPoints)) / 10000)

  return roundSalePriceMinorUnits(rawMinorUnits)
}

function tradeInTotalMinorUnits(items, payoutType) {
  return cleanTradeInItems(items)
    .filter((item) => item.payout_type === payoutType)
    .reduce((total, item) => total + item.final_value_minor_units * boundedInt(item.quantity, 1, 999, 1), 0)
}

function cleanPickedItemIds(value, items = []) {
  if (!Array.isArray(value)) {
    return []
  }

  const allowed = new Set(
    (Array.isArray(items) ? items : [])
      .flatMap((item) => cleanPickedItemIdentities(item))
      .filter(Boolean),
  )

  return [...new Set(value.map(cleanPublicId).filter((id) => id && allowed.has(id)))]
}

function cleanPickedItemIdentity(item) {
  return cleanPickedItemIdentities(item)[0] ?? ""
}

function cleanPickedItemIdentities(item) {
  const identities = []
  for (const candidate of [item?.public_id, item?.inventory_id, item?.reservation_id, item?.order_item_id]) {
    const id = cleanPublicId(candidate)
    if (id && id !== "0" && !identities.includes(id)) {
      identities.push(id)
    }
  }

  return identities
}

function kioskOrderStatusSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function publicKioskOrder(order) {
  const items = cleanKioskOrderItems(order.items)
  const totalMinorUnits = items.reduce((total, item) => total + item.price_minor_units, 0)
  const holdExpiresAtUtc = cleanIsoTimestamp(order.hold_expires_at_utc)
  const holdSecondsRemaining = holdExpiresAtUtc
    ? Math.max(0, Math.ceil((new Date(holdExpiresAtUtc).getTime() - Date.now()) / 1000))
    : 0

  return {
    order_id: cleanPublicId(order.order_id),
    first_name: cleanName(order.first_name),
    last_name: cleanName(order.last_name),
    customer_name: cleanName(`${order.first_name ?? ""} ${order.last_name ?? ""}`),
    customer_public_id: cleanPublicId(order.customer_public_id),
    customer_lookup: cleanName(order.customer_lookup),
    status: cleanKioskOrderStatus(order.status),
    payment_status: cleanKioskPaymentStatus(order.payment_status),
    square_receipt_reference: cleanExternalId(order.square_receipt_reference),
    square_order_id: cleanExternalId(order.square_order_id),
    paid_at_utc: cleanIsoTimestamp(order.paid_at_utc) || "",
    hold_expires_at_utc: holdExpiresAtUtc,
    hold_seconds_remaining: holdSecondsRemaining,
    picked_item_ids: cleanPickedItemIds(order.picked_item_ids, items),
    picked_item_count: cleanPickedItemIds(order.picked_item_ids, items).length,
    all_items_picked: items.length > 0 && cleanPickedItemIds(order.picked_item_ids, items).length === items.length,
    reservation_ids: Array.isArray(order.reservation_ids) ? order.reservation_ids.map(cleanPublicId).filter(Boolean) : [],
    items,
    item_count: items.length,
    total_minor_units: totalMinorUnits,
    currency: "USD",
    created_at_utc: cleanIsoTimestamp(order.created_at_utc) || "",
    updated_at_utc: cleanIsoTimestamp(order.updated_at_utc) || cleanIsoTimestamp(order.created_at_utc) || "",
  }
}

function localFulfillmentOrderFromWordPress(order, now = () => new Date()) {
  const orderId = positiveInt(order?.order_id)
  const items = cleanFulfillmentOrderItems(order?.items)

  if (!orderId || items.length === 0) {
    return null
  }

  const createdAtUtc = cleanIsoTimestamp(order.created_at_utc) || now().toISOString()

  return {
    order_id: orderId,
    order_number: cleanName(order.order_number) || String(orderId),
    customer_name: cleanName(order.customer_name) || "Website pickup customer",
    order_status: cleanOrderStatus(order.order_status),
    fulfillment_status: cleanFulfillmentStatus(order.fulfillment_status) || "awaiting_pull",
    payment_status: cleanName(order.payment_status) || "paid",
    shipping_method_id: cleanName(order.shipping_method_id),
    shipping_method_title: cleanName(order.shipping_method_title) || "Local pickup",
    local_pickup: order.local_pickup !== false,
    item_count: boundedInt(order.item_count ?? items.length, 0, 9999, items.length),
    total_minor_units: Math.max(0, minorUnits(order.total_minor_units)),
    currency: cleanCurrency(order.currency),
    paid_at_utc: cleanIsoTimestamp(order.paid_at_utc),
    created_at_utc: createdAtUtc,
    updated_at_utc: now().toISOString(),
    items,
    inventory_sale_applied_at_utc: cleanIsoTimestamp(order.inventory_sale_applied_at_utc),
    source: "wordpress",
    picked_item_ids: cleanPickedItemIds(order.picked_item_ids, items),
  }
}

function publicFulfillmentOrder(order) {
  const items = cleanFulfillmentOrderItems(order.items)
  const totalMinorUnits =
    Math.max(0, minorUnits(order.total_minor_units)) ||
    items.reduce((total, item) => total + item.price_minor_units * Math.max(1, item.quantity), 0)

  return {
    order_id: positiveInt(order.order_id),
    order_number: cleanName(order.order_number) || String(positiveInt(order.order_id)),
    customer_name: cleanName(order.customer_name),
    order_status: cleanOrderStatus(order.order_status),
    fulfillment_status: cleanFulfillmentStatus(order.fulfillment_status) || "awaiting_pull",
    payment_status: cleanName(order.payment_status) || "paid",
    shipping_method_id: cleanName(order.shipping_method_id),
    shipping_method_title: cleanName(order.shipping_method_title),
    local_pickup: order.local_pickup !== false,
    item_count: boundedInt(order.item_count ?? items.length, 0, 9999, items.length),
    total_minor_units: totalMinorUnits,
    currency: cleanCurrency(order.currency),
    paid_at_utc: cleanIsoTimestamp(order.paid_at_utc) || "",
    created_at_utc: cleanIsoTimestamp(order.created_at_utc) || "",
    updated_at_utc: cleanIsoTimestamp(order.updated_at_utc) || cleanIsoTimestamp(order.created_at_utc) || "",
    items,
    picked_item_ids: cleanPickedItemIds(order.picked_item_ids, items),
    picked_item_count: cleanPickedItemIds(order.picked_item_ids, items).length,
    all_items_picked: items.length > 0 && cleanPickedItemIds(order.picked_item_ids, items).length === items.length,
    inventory_sale_applied_at_utc: cleanIsoTimestamp(order.inventory_sale_applied_at_utc) || "",
    source: cleanFulfillmentOrderSource(order.source),
    payment_required_before_fulfillment: true,
    inventory_mutation_performed_by_status: false,
  }
}

function cleanCheckoutSource(value) {
  const source = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_")

  return ["local_pos", "kiosk", "website_pickup", "manual"].includes(source) ? source : "local_pos"
}

function cleanReceiptDelivery(value) {
  const delivery = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_")

  return ["print", "email", "both", "none"].includes(delivery) ? delivery : "print"
}

function cleanCheckoutTenderType(value) {
  const tenderType = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_")

  return ["card", "cash", "split"].includes(tenderType) ? tenderType : "card"
}

function cleanCheckoutTransactionItems(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index) => {
      const lineId = cleanPublicId(item?.line_id ?? item?.lineId) || `line-${index + 1}`
      const quantity = boundedInt(item?.quantity, 1, 999, 1)
      const unitPriceMinorUnits = Math.max(0, minorUnits(item?.unit_price_minor_units ?? item?.unitPriceMinorUnits))
      const totalMinorUnits =
        Math.max(0, minorUnits(item?.total_minor_units ?? item?.totalMinorUnits)) ||
        unitPriceMinorUnits * quantity

      return {
        line_id: lineId,
        type: ["inventory", "misc", "kiosk"].includes(String(item?.type ?? "").toLowerCase())
          ? String(item.type).toLowerCase()
          : "inventory",
        label: cleanName(item?.label) || "Checkout item",
        inventory_public_id: cleanPublicId(item?.inventory_public_id ?? item?.inventoryPublicId),
        barcode: cleanExternalId(item?.barcode),
        card_name: cleanName(item?.card_name ?? item?.cardName),
        set_name: cleanName(item?.set_name ?? item?.setName),
        condition: cleanName(item?.condition),
        location: cleanInventoryLocation(item?.location),
        quantity,
        unit_price_minor_units: unitPriceMinorUnits,
        total_minor_units: totalMinorUnits,
        status: cleanName(item?.status) || "sold",
      }
    })
    .filter((item) => item.label || item.inventory_public_id || item.barcode)
}

function publicCheckoutTransaction(transaction, users = []) {
  const staffUserId = cleanPublicId(transaction.staff_user_id)
  const staffUser = users.find((user) => cleanPublicId(user.id) === staffUserId)
  const items = cleanCheckoutTransactionItems(transaction.items)
  const subtotalMinorUnits =
    Math.max(0, minorUnits(transaction.subtotal_minor_units)) ||
    items.reduce((total, item) => total + item.total_minor_units, 0)
  const creditUsedMinorUnits = Math.max(0, minorUnits(transaction.credit_used_minor_units))
  const totalMinorUnits = Math.max(0, minorUnits(transaction.total_minor_units)) || subtotalMinorUnits
  const squareDueMinorUnits = Math.max(0, minorUnits(transaction.square_due_minor_units))
  const cardPaidMinorUnits = Math.max(0, minorUnits(transaction.card_paid_minor_units)) || squareDueMinorUnits

  return {
    transaction_id: cleanPublicId(transaction.transaction_id),
    customer_public_id: cleanPublicId(transaction.customer_public_id),
    customer_lookup: cleanName(transaction.customer_lookup),
    customer_name: cleanName(transaction.customer_name),
    customer_email: cleanEmail(transaction.customer_email),
    guest_checkout: Boolean(transaction.guest_checkout),
    square_receipt_reference: cleanExternalId(transaction.square_receipt_reference),
    square_order_id: cleanExternalId(transaction.square_order_id),
    source_order_id: cleanExternalId(transaction.source_order_id),
    source: cleanCheckoutSource(transaction.source),
    receipt_delivery: cleanReceiptDelivery(transaction.receipt_delivery),
    tender_type: cleanCheckoutTenderType(transaction.tender_type),
    subtotal_minor_units: subtotalMinorUnits,
    credit_used_minor_units: creditUsedMinorUnits,
    square_due_minor_units: squareDueMinorUnits,
    cash_paid_minor_units: Math.max(0, minorUnits(transaction.cash_paid_minor_units)),
    card_paid_minor_units: cardPaidMinorUnits,
    change_due_minor_units: Math.max(0, minorUnits(transaction.change_due_minor_units)),
    total_minor_units: totalMinorUnits,
    currency: cleanCurrency(transaction.currency),
    items,
    item_count: items.reduce((total, item) => total + item.quantity, 0),
    staff_user_id: staffUserId,
    staff_user_name: cleanName(transaction.staff_user_name) || (staffUser ? cleanName(staffUser.name) : ""),
    created_at_utc: cleanIsoTimestamp(transaction.created_at_utc),
    updated_at_utc: cleanIsoTimestamp(transaction.updated_at_utc) || cleanIsoTimestamp(transaction.created_at_utc),
  }
}

function publicTradeInOrder(order, users = []) {
  const items = cleanTradeInItems(order.items)
  const cashTotalMinorUnits = tradeInTotalMinorUnits(items, "cash")
  const creditTotalMinorUnits = tradeInTotalMinorUnits(items, "credit")
  const itemCount = items.reduce((total, item) => total + boundedInt(item.quantity, 1, 999, 1), 0)
  const staffUserId = cleanPublicId(order.staff_user_id)
  const staffUser = users.find((user) => cleanPublicId(user.id) === staffUserId)
  const convertedByUserId = cleanPublicId(order.converted_by_user_id)
  const convertedByUser = users.find((user) => cleanPublicId(user.id) === convertedByUserId)
  const idRecordedByUserId = cleanPublicId(order.customer_id_recorded_by_user_id)
  const idRecordedByUser = users.find((user) => cleanPublicId(user.id) === idRecordedByUserId)

  return {
    order_id: cleanPublicId(order.order_id),
    customer_name: cleanName(order.customer_name) || "Walk-in customer",
    customer_phone: cleanPhone(order.customer_phone),
    customer_public_id: cleanPublicId(order.customer_public_id),
    status: cleanTradeInStatus(order.status) || "draft",
    staff_user_id: staffUserId,
    staff_user_name: staffUser ? cleanName(staffUser.name) : "",
    notes: cleanOptionalReason(order.notes),
    customer_id_number_masked: maskTradeInCustomerIdNumber(order.customer_id_number),
    customer_id_state: cleanTradeInCustomerIdState(order.customer_id_state),
    customer_id_recorded_at_utc: cleanIsoTimestamp(order.customer_id_recorded_at_utc),
    customer_id_recorded_by_user_id: idRecordedByUserId,
    customer_id_recorded_by_user_name: idRecordedByUser ? cleanName(idRecordedByUser.name) : "",
    items,
    item_count: itemCount,
    cash_total_minor_units: cashTotalMinorUnits,
    credit_total_minor_units: creditTotalMinorUnits,
    combined_total_minor_units: cashTotalMinorUnits + creditTotalMinorUnits,
    currency: "USD",
    converted_at_utc: cleanIsoTimestamp(order.converted_at_utc),
    converted_by_user_id: convertedByUserId,
    converted_by_user_name: convertedByUser ? cleanName(convertedByUser.name) : "",
    created_at_utc: cleanIsoTimestamp(order.created_at_utc),
    updated_at_utc: cleanIsoTimestamp(order.updated_at_utc) || cleanIsoTimestamp(order.created_at_utc),
    sellable_inventory_created: false,
  }
}

function tradeInStatusTransition(order, nextStatus) {
  const currentStatus = cleanTradeInStatus(order.status) || "draft"

  if (currentStatus === nextStatus) {
    if (nextStatus === "converted") {
      return {
        status: "blocked",
        code: "trade_in_already_converted",
        message: "This trade-in has already been marked converted. Duplicate conversion is blocked.",
      }
    }

    return { status: "ok" }
  }

  if (currentStatus === "completed" || currentStatus === "voided") {
    return {
      status: "blocked",
      code: "trade_in_terminal_status",
      message: "Completed and voided trade-in records are terminal transaction records.",
    }
  }

  if (currentStatus === "converted" && nextStatus !== "completed") {
    return {
      status: "blocked",
      code: "trade_in_already_converted",
      message: "Converted trade-ins can only be moved to completed history.",
    }
  }

  if (nextStatus === "converted" && !["approved", "paid"].includes(currentStatus)) {
    return {
      status: "blocked",
      code: "trade_in_conversion_requires_approval",
      message: "Trade-ins must be approved or paid before conversion can be recorded.",
    }
  }

  if (nextStatus === "paid" && !["approved", "paid"].includes(currentStatus)) {
    return {
      status: "blocked",
      code: "trade_in_payment_requires_approval",
      message: "Approve the trade-in before marking it paid.",
    }
  }

  return { status: "ok" }
}

function tradeInOrderMatchesNeedle(order, needle, users = []) {
  if (!needle) {
    return true
  }

  const publicOrder = publicTradeInOrder(order, users)
  const searchable = [
    publicOrder.order_id,
    publicOrder.customer_name,
    publicOrder.customer_phone,
    publicOrder.customer_public_id,
    publicOrder.customer_id_number_masked,
    publicOrder.customer_id_state,
    publicOrder.customer_id_recorded_by_user_id,
    publicOrder.customer_id_recorded_by_user_name,
    publicOrder.staff_user_id,
    publicOrder.staff_user_name,
    publicOrder.status,
    publicOrder.notes,
    ...publicOrder.items.flatMap((item) => [
      item.item_id,
      item.product_type,
      item.card_name,
      item.set_name,
      item.condition,
      item.grading_company,
      item.grade,
      item.cert_number,
      item.payout_type,
    ]),
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ")

  return searchable.includes(needle)
}

function tradeInOrderMatchesCustomer(order, customer, needle = "") {
  const orderValues = [
    order.customer_public_id,
    order.customer_name,
    order.customer_phone,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
  const customerValues = [
    customer.customer_public_id,
    customer.display_name,
    customer.first_name,
    customer.last_name,
    customer.lookup,
    customer.email,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
  const searchable = [...orderValues, ...customerValues]

  const directMatch =
    cleanPublicId(order.customer_public_id) !== "" &&
    cleanPublicId(order.customer_public_id) === cleanPublicId(customer.customer_public_id)

  if (directMatch) {
    return !needle || searchable.some((value) => value.includes(needle))
  }

  return orderValues.some((orderValue) =>
    customerValues.some((customerValue) => orderValue.length >= 3 && orderValue === customerValue),
  ) && (!needle || searchable.some((value) => value.includes(needle)))
}

function kioskOrderMatchesCustomer(order, customer, needle = "") {
  const orderValues = [
    order.customer_public_id,
    order.customer_lookup,
    cleanName(`${order.first_name ?? ""} ${order.last_name ?? ""}`),
    order.first_name,
    order.last_name,
    order.square_receipt_reference,
    order.order_id,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
  const customerValues = [
    customer.customer_public_id,
    customer.display_name,
    customer.first_name,
    customer.last_name,
    customer.lookup,
    customer.email,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
  const searchable = [...orderValues, ...customerValues]
  const directMatch =
    cleanPublicId(order.customer_public_id) !== "" &&
    cleanPublicId(order.customer_public_id) === cleanPublicId(customer.customer_public_id)

  if (directMatch) {
    return !needle || searchable.some((value) => value.includes(needle))
  }

  return orderValues.some((orderValue) =>
    customerValues.some((customerValue) => orderValue.length >= 3 && orderValue === customerValue),
  ) && (!needle || searchable.some((value) => value.includes(needle)))
}

function checkoutTransactionMatchesCustomer(transaction, customer, needle = "") {
  const transactionValues = [
    transaction.customer_public_id,
    transaction.customer_lookup,
    transaction.customer_name,
    transaction.customer_email,
    transaction.square_receipt_reference,
    transaction.square_order_id,
    transaction.source_order_id,
    transaction.transaction_id,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
  const customerValues = [
    customer.customer_public_id,
    customer.display_name,
    customer.first_name,
    customer.last_name,
    customer.lookup,
    customer.email,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
  const searchable = [...transactionValues, ...customerValues]
  const directMatch =
    cleanPublicId(transaction.customer_public_id) !== "" &&
    cleanPublicId(transaction.customer_public_id) === cleanPublicId(customer.customer_public_id)

  if (directMatch) {
    return !needle || searchable.some((value) => value.includes(needle))
  }

  return transactionValues.some((transactionValue) =>
    customerValues.some((customerValue) => transactionValue.length >= 3 && transactionValue === customerValue),
  ) && (!needle || searchable.some((value) => value.includes(needle)))
}

function cleanLocalReportFilters(filters = {}) {
  const rawGame = filters.game
  const rawCondition = filters.condition

  return {
    date_from: cleanReportDate(filters.date_from ?? filters.dateFrom),
    date_to: cleanReportDate(filters.date_to ?? filters.dateTo),
    customer_id: cleanPublicId(filters.customer_id ?? filters.customerId),
    staff_user_id: cleanPublicId(filters.staff_user_id ?? filters.staffUserId),
    channel: cleanSlugValue(filters.channel),
    game: String(rawGame ?? "").trim() ? cleanGame(rawGame) : "",
    product_type: cleanSlugValue(filters.product_type ?? filters.productType),
    condition: String(rawCondition ?? "").trim() ? cleanCondition(rawCondition) : "",
    grade: cleanName(filters.grade),
    grading_company: cleanName(filters.grading_company ?? filters.gradingCompany),
    order_status: cleanTradeInStatus(filters.order_status ?? filters.orderStatus) || cleanFulfillmentStatus(filters.order_status ?? filters.orderStatus),
    source: cleanSlugValue(filters.source),
    page: boundedInt(filters.page, 1, 100000, 1),
    page_size: boundedInt(filters.page_size ?? filters.pageSize, 10, 250, 50),
  }
}

function reportInventoryMatches(item, filters) {
  return (
    (!filters.game || cleanGame(item.game) === filters.game) &&
    (!filters.product_type ||
      (filters.product_type === "graded"
        ? item.raw_or_graded === "graded"
        : filters.product_type === "singles"
          ? item.raw_or_graded !== "graded"
          : true)) &&
    (!filters.condition || cleanCondition(item.condition) === filters.condition) &&
    (!filters.grade || cleanName(item.grade) === filters.grade) &&
    (!filters.grading_company || cleanName(item.grading_company) === filters.grading_company) &&
    (!filters.source || String(item.source ?? "").toLowerCase() === filters.source)
  )
}

function reportDateMatches(value, filters) {
  if (!filters.date_from && !filters.date_to) {
    return true
  }

  const date = reportDate(value)

  if (!date) {
    return false
  }

  return (!filters.date_from || date >= filters.date_from) && (!filters.date_to || date <= filters.date_to)
}

function reportDate(value) {
  const timestamp = Date.parse(String(value ?? ""))

  if (!Number.isFinite(timestamp)) {
    return ""
  }

  return new Date(timestamp).toISOString().slice(0, 10)
}

function paginateReportRows(rows, page, pageSize) {
  const cleanPage = boundedInt(page, 1, 100000, 1)
  const cleanPageSize = boundedInt(pageSize, 10, 250, 50)
  const offset = (cleanPage - 1) * cleanPageSize

  return rows.slice(offset, offset + cleanPageSize)
}

function csvHeaderFromRows(rows) {
  const firstRow = rows.find((row) => row && typeof row === "object" && !Array.isArray(row))

  if (!firstRow) {
    return ""
  }

  return Object.keys(firstRow)
    .map((key) => `"${String(key).replace(/"/g, '""')}"`)
    .join(",") + "\n"
}

function squareSalesReportRefreshRequested(reportKey, filters = {}) {
  if (!["sales", "square_reconciliation"].includes(localReportKey(reportKey))) {
    return false
  }

  const value = filters.refresh_square ?? filters.refreshSquare ?? filters.square_refresh ?? filters.pull_square

  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase())
}

function buildSquareSalesReportSnapshot(result, context = {}) {
  const now = typeof context.now === "function" ? context.now : () => new Date()
  const pulledAtUtc = now().toISOString()
  const localMappings = squareLocalCatalogMappings(context.inventoryItems)
  const localSaleIdentities = squareLocalSaleIdentities({
    queue: context.queue,
    kioskOrders: context.kioskOrders,
    checkoutTransactions: context.checkoutTransactions,
  })
  const rows = cleanSquareSalesReportRows(result.rows)
    .map((row) => enrichSquareSalesReportRow(row, localMappings, localSaleIdentities))
  const currency = cleanCurrency(result.currency ?? rows[0]?.currency)
  const grossSalesMinorUnits = rows
    .filter((row) => row.payment_status === "COMPLETED")
    .reduce((total, row) => total + minorUnits(row.gross_sales_minor_units), 0)

  return normalizeSquareSalesReportSnapshot({
    snapshot_id: cleanPublicId(`square-sales-${pulledAtUtc.replace(/[^0-9]/g, "")}-${randomUUID().slice(0, 8)}`),
    report: "square_sales",
    environment: cleanName(result.environment),
    location_id: cleanExternalId(result.location_id),
    location_id_source: cleanName(result.location_id_source),
    date_from_utc: cleanIsoTimestamp(result.date_from_utc),
    date_to_utc: cleanIsoTimestamp(result.date_to_utc),
    pulled_at_utc: pulledAtUtc,
    pulled_by_user_id: cleanPublicId(context.actorId),
    pulled_by_user_name: cleanName(context.actorName) || "System",
    payment_count: boundedInt(result.payment_count, 0, 1_000_000, 0),
    completed_payment_count: boundedInt(result.completed_payment_count, 0, 1_000_000, 0),
    order_count: boundedInt(result.order_count, 0, 1_000_000, 0),
    line_item_count: rows.length,
    gross_sales_minor_units: grossSalesMinorUnits,
    gross_sales: formatMoney(grossSalesMinorUnits, currency),
    refunded_minor_units: Math.max(0, minorUnits(result.refunded_minor_units)),
    refunded: formatMoney(result.refunded_minor_units, currency),
    processing_fee_minor_units: Math.max(0, minorUnits(result.processing_fee_minor_units)),
    processing_fee: formatMoney(result.processing_fee_minor_units, currency),
    currency,
    rows,
    summary_by_date: summarizeSquareSalesRows(rows, (row) => row.date),
    summary_by_item: summarizeSquareSalesRows(rows, (row) =>
      [
        row.square_catalog_variation_id || "unmapped",
        row.sku || row.barcode || row.item_name,
      ].join("|"),
    ),
    cursor_exhausted: Boolean(result.cursor_exhausted),
    max_page_guard_hit: Boolean(result.max_page_guard_hit),
    payment_page_count: boundedInt(result.payment_page_count, 0, 10_000, 0),
    order_request_count: boundedInt(result.order_request_count, 0, 10_000, 0),
    payment_capture_authority: "square_payments_api_read_only",
    customer_credit_authority: "local_store_credit_ledger_not_square",
    square_payment_capture_supported: false,
    inventory_mutated: false,
    fake_sales_created: false,
  })
}

function normalizeSquareSalesReportSnapshot(snapshot = {}) {
  const rows = cleanSquareSalesReportRows(snapshot.rows)
  const currency = cleanCurrency(snapshot.currency ?? rows[0]?.currency)
  const grossSalesMinorUnits = Math.max(
    0,
    minorUnits(snapshot.gross_sales_minor_units) ||
      rows
        .filter((row) => row.payment_status === "COMPLETED")
        .reduce((total, row) => total + minorUnits(row.gross_sales_minor_units), 0),
  )

  return {
    snapshot_id: cleanPublicId(snapshot.snapshot_id),
    report: "square_sales",
    environment: cleanName(snapshot.environment),
    location_id: cleanExternalId(snapshot.location_id),
    location_id_source: cleanName(snapshot.location_id_source),
    date_from_utc: cleanIsoTimestamp(snapshot.date_from_utc),
    date_to_utc: cleanIsoTimestamp(snapshot.date_to_utc),
    pulled_at_utc: cleanIsoTimestamp(snapshot.pulled_at_utc),
    pulled_by_user_id: cleanPublicId(snapshot.pulled_by_user_id),
    pulled_by_user_name: cleanName(snapshot.pulled_by_user_name),
    payment_count: boundedInt(snapshot.payment_count, 0, 1_000_000, 0),
    completed_payment_count: boundedInt(snapshot.completed_payment_count, 0, 1_000_000, 0),
    order_count: boundedInt(snapshot.order_count, 0, 1_000_000, 0),
    line_item_count: boundedInt(snapshot.line_item_count ?? rows.length, 0, 1_000_000, rows.length),
    gross_sales_minor_units: grossSalesMinorUnits,
    gross_sales: formatMoney(grossSalesMinorUnits, currency),
    refunded_minor_units: Math.max(0, minorUnits(snapshot.refunded_minor_units)),
    refunded: formatMoney(snapshot.refunded_minor_units, currency),
    processing_fee_minor_units: Math.max(0, minorUnits(snapshot.processing_fee_minor_units)),
    processing_fee: formatMoney(snapshot.processing_fee_minor_units, currency),
    currency,
    rows,
    summary_by_date: cleanSquareSalesSummaryRows(
      Array.isArray(snapshot.summary_by_date) && snapshot.summary_by_date.length > 0
        ? snapshot.summary_by_date
        : summarizeSquareSalesRows(rows, (row) => row.date),
    ),
    summary_by_item: cleanSquareSalesSummaryRows(
      Array.isArray(snapshot.summary_by_item) && snapshot.summary_by_item.length > 0
        ? snapshot.summary_by_item
        : summarizeSquareSalesRows(rows, (row) =>
            [
              row.square_catalog_variation_id || "unmapped",
              row.sku || row.barcode || row.item_name,
            ].join("|"),
          ),
    ),
    cursor_exhausted: Boolean(snapshot.cursor_exhausted),
    max_page_guard_hit: Boolean(snapshot.max_page_guard_hit),
    payment_page_count: boundedInt(snapshot.payment_page_count, 0, 10_000, 0),
    order_request_count: boundedInt(snapshot.order_request_count, 0, 10_000, 0),
    payment_capture_authority: "square_payments_api_read_only",
    customer_credit_authority: "local_store_credit_ledger_not_square",
    square_payment_capture_supported: false,
    inventory_mutated: false,
    fake_sales_created: false,
  }
}

function publicSquareSalesReportSnapshot(snapshot, { includeRows = true } = {}) {
  if (!snapshot) {
    return null
  }

  const normalized = normalizeSquareSalesReportSnapshot(snapshot)
  const payload = {
    snapshot_id: normalized.snapshot_id,
    report: normalized.report,
    environment: normalized.environment,
    location_id: normalized.location_id,
    location_id_source: normalized.location_id_source,
    date_from_utc: normalized.date_from_utc,
    date_to_utc: normalized.date_to_utc,
    pulled_at_utc: normalized.pulled_at_utc,
    pulled_by_user_id: normalized.pulled_by_user_id,
    pulled_by_user_name: normalized.pulled_by_user_name,
    payment_count: normalized.payment_count,
    completed_payment_count: normalized.completed_payment_count,
    order_count: normalized.order_count,
    line_item_count: normalized.line_item_count,
    gross_sales_minor_units: normalized.gross_sales_minor_units,
    gross_sales: normalized.gross_sales,
    refunded_minor_units: normalized.refunded_minor_units,
    refunded: normalized.refunded,
    processing_fee_minor_units: normalized.processing_fee_minor_units,
    processing_fee: normalized.processing_fee,
    currency: normalized.currency,
    summary_by_date: normalized.summary_by_date,
    summary_by_item: normalized.summary_by_item,
    cursor_exhausted: normalized.cursor_exhausted,
    max_page_guard_hit: normalized.max_page_guard_hit,
    payment_page_count: normalized.payment_page_count,
    order_request_count: normalized.order_request_count,
    payment_capture_authority: normalized.payment_capture_authority,
    customer_credit_authority: normalized.customer_credit_authority,
    square_payment_capture_supported: false,
    inventory_mutated: false,
    fake_sales_created: false,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }

  if (includeRows) {
    payload.rows = normalized.rows
  }

  return payload
}

function squareLocalCatalogMappings(inventoryItems = []) {
  const mappings = new Map()

  for (const item of Array.isArray(inventoryItems) ? inventoryItems : []) {
    const variationId = cleanExternalId(item.square_catalog_variation_id)

    if (!variationId) {
      continue
    }

    const current = mappings.get(variationId) ?? {
      square_catalog_variation_id: variationId,
      square_catalog_item_id: cleanExternalId(item.square_catalog_item_id),
      sku: cleanBarcode(item.barcode),
      barcode: cleanBarcode(item.barcode),
      card_name: cleanName(item.card_name),
      item_name: cleanName(item.card_name),
      game: cleanGame(item.game),
      set_name: cleanName(item.set_name),
      condition: cleanCondition(item.condition),
      product_type: item.raw_or_graded === "graded" ? "graded" : "singles",
      local_available_quantity: 0,
      local_sold_quantity: 0,
    }

    if (!current.sku) {
      current.sku = cleanBarcode(item.barcode)
      current.barcode = cleanBarcode(item.barcode)
    }

    if (["available", "reserved", "pending_intake"].includes(item.status)) {
      current.local_available_quantity += inventoryQuantityOnHand(item)
    }

    if (item.status === "sold") {
      current.local_sold_quantity += inventoryQuantityOnHand(item)
    }

    mappings.set(variationId, current)
  }

  return mappings
}

function squareLocalSaleIdentities({ queue = [], kioskOrders = [], checkoutTransactions = [] } = {}) {
  const identities = new Set()

  for (const operation of Array.isArray(queue) ? queue : []) {
    if (operation.operation_type !== "square_pos_sale") {
      continue
    }

    addSquareIdentity(identities, operation.payload?.square_receipt_reference)
    addSquareIdentity(identities, operation.payload?.square_order_id)
    addSquareIdentity(identities, operation.payload?.payment_id)
  }

  for (const order of Array.isArray(kioskOrders) ? kioskOrders : []) {
    addSquareIdentity(identities, order.square_receipt_reference)
    addSquareIdentity(identities, order.square_order_id)
  }

  for (const transaction of Array.isArray(checkoutTransactions) ? checkoutTransactions : []) {
    addSquareIdentity(identities, transaction.square_receipt_reference)
    addSquareIdentity(identities, transaction.square_order_id)
  }

  return identities
}

function addSquareIdentity(identities, value) {
  const identity = cleanExternalId(value)

  if (identity) {
    identities.add(identity)
  }
}

function enrichSquareSalesReportRow(row, localMappings, localSaleIdentities) {
  const variationId = cleanExternalId(row.square_catalog_variation_id || row.catalog_object_id)
  const mapping = localMappings.get(variationId)
  const matchedLocalOperation = [
    row.payment_id,
    row.order_id,
    row.receipt_number,
  ].some((identity) => localSaleIdentities.has(cleanExternalId(identity)))
  const localStatus = matchedLocalOperation
    ? "matched_local_operation"
    : mapping
      ? "square_only_mapped"
      : "square_only_unmapped"
  const currency = cleanCurrency(row.currency)

  return {
    date: reportDate(row.date) || reportDate(row.created_at_utc),
    channel: "square_pos",
    payment_id: cleanExternalId(row.payment_id),
    payment_status: cleanName(row.payment_status).toUpperCase() || "UNKNOWN",
    order_id: cleanExternalId(row.order_id),
    receipt_number: cleanExternalId(row.receipt_number),
    receipt_url: cleanHttpUrl(row.receipt_url),
    payment_method: cleanName(row.payment_method),
    card_brand: cleanName(row.card_brand),
    card_last_4: cleanExternalId(row.card_last_4),
    team_member_id: cleanExternalId(row.team_member_id),
    staff_user_id: cleanExternalId(row.team_member_id),
    staff_user_name: cleanName(row.team_member_id),
    location_id: cleanExternalId(row.location_id),
    item_name: cleanName(row.item_name) || mapping?.item_name || "Square line item",
    card_name: mapping?.card_name ?? cleanName(row.card_name) ?? cleanName(row.item_name),
    quantity: Number(row.quantity) > 0 ? Number(row.quantity) : 1,
    catalog_object_id: variationId,
    square_catalog_variation_id: variationId,
    square_catalog_item_id: mapping?.square_catalog_item_id ?? "",
    catalog_version: positiveInt(row.catalog_version),
    sku: cleanBarcode(row.sku) || mapping?.sku || variationId,
    barcode: cleanBarcode(row.barcode) || mapping?.barcode || "",
    product_type: mapping?.product_type ?? "square_catalog",
    game: mapping?.game ?? "",
    set_name: mapping?.set_name ?? "",
    condition: mapping?.condition ?? "",
    gross_sales_minor_units: Math.max(0, minorUnits(row.gross_sales_minor_units)),
    gross_sales: formatMoney(row.gross_sales_minor_units, currency),
    currency,
    source: "square_api_report",
    local_reconciliation_status: localStatus,
    local_available_quantity: mapping?.local_available_quantity ?? 0,
    local_sold_quantity: mapping?.local_sold_quantity ?? 0,
  }
}

function cleanSquareSalesReportRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && typeof row === "object" && !Array.isArray(row))
    .map((row) => ({
      date: reportDate(row.date) || reportDate(row.created_at_utc),
      channel: cleanSlugValue(row.channel) || "square_pos",
      payment_id: cleanExternalId(row.payment_id),
      payment_status: cleanName(row.payment_status).toUpperCase() || "UNKNOWN",
      order_id: cleanExternalId(row.order_id),
      receipt_number: cleanExternalId(row.receipt_number),
      receipt_url: cleanHttpUrl(row.receipt_url),
      payment_method: cleanName(row.payment_method),
      card_brand: cleanName(row.card_brand),
      card_last_4: cleanExternalId(row.card_last_4),
      team_member_id: cleanExternalId(row.team_member_id),
      staff_user_id: cleanExternalId(row.staff_user_id ?? row.team_member_id),
      staff_user_name: cleanName(row.staff_user_name ?? row.team_member_id),
      location_id: cleanExternalId(row.location_id),
      item_name: cleanName(row.item_name) || "Square line item",
      card_name: cleanName(row.card_name ?? row.item_name),
      quantity: Number(row.quantity) > 0 ? Number(row.quantity) : 1,
      catalog_object_id: cleanExternalId(row.catalog_object_id),
      square_catalog_variation_id: cleanExternalId(row.square_catalog_variation_id ?? row.catalog_object_id),
      square_catalog_item_id: cleanExternalId(row.square_catalog_item_id),
      catalog_version: positiveInt(row.catalog_version),
      sku: cleanBarcode(row.sku),
      barcode: cleanBarcode(row.barcode),
      product_type: cleanSlugValue(row.product_type) || "square_catalog",
      game: cleanGame(row.game),
      set_name: cleanName(row.set_name),
      condition: cleanCondition(row.condition),
      gross_sales_minor_units: Math.max(0, minorUnits(row.gross_sales_minor_units)),
      gross_sales: formatMoney(row.gross_sales_minor_units, row.currency),
      currency: cleanCurrency(row.currency),
      source: cleanSlugValue(row.source) || "square_api_report",
      local_reconciliation_status: cleanSquareReconciliationStatus(row.local_reconciliation_status),
      local_available_quantity: Math.max(0, minorUnits(row.local_available_quantity)),
      local_sold_quantity: Math.max(0, minorUnits(row.local_sold_quantity)),
    }))
    .filter((row) => row.date && row.payment_id)
}

function summarizeSquareSalesRows(rows, keyFn) {
  const groups = new Map()

  for (const row of cleanSquareSalesReportRows(rows)) {
    const key = cleanName(keyFn(row)) || "unknown"
    const current = groups.get(key) ?? {
      key,
      date: row.date,
      item_name: row.item_name,
      sku: row.sku,
      barcode: row.barcode,
      square_catalog_variation_id: row.square_catalog_variation_id,
      product_type: row.product_type,
      game: row.game,
      set_name: row.set_name,
      condition: row.condition,
      local_reconciliation_status: row.local_reconciliation_status,
      local_available_quantity: row.local_available_quantity,
      local_sold_quantity: row.local_sold_quantity,
      quantity: 0,
      line_item_count: 0,
      gross_sales_minor_units: 0,
      gross_sales: "$0.00",
      currency: row.currency,
    }

    current.quantity += Number(row.quantity) || 0
    current.line_item_count += 1
    current.gross_sales_minor_units += Math.max(0, minorUnits(row.gross_sales_minor_units))
    current.gross_sales = formatMoney(current.gross_sales_minor_units, current.currency)
    current.local_reconciliation_status = mergeSquareReconciliationStatus(
      current.local_reconciliation_status,
      row.local_reconciliation_status,
    )
    groups.set(key, current)
  }

  return [...groups.values()]
}

function cleanSquareSalesSummaryRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && typeof row === "object" && !Array.isArray(row))
    .map((row) => {
      const currency = cleanCurrency(row.currency)
      const grossSalesMinorUnits = Math.max(0, minorUnits(row.gross_sales_minor_units))

      return {
        key: cleanName(row.key),
        date: reportDate(row.date),
        item_name: cleanName(row.item_name),
        sku: cleanBarcode(row.sku),
        barcode: cleanBarcode(row.barcode),
        square_catalog_variation_id: cleanExternalId(row.square_catalog_variation_id),
        product_type: cleanSlugValue(row.product_type) || "square_catalog",
        game: cleanGame(row.game),
        set_name: cleanName(row.set_name),
        condition: cleanCondition(row.condition),
        local_reconciliation_status: cleanSquareReconciliationStatus(row.local_reconciliation_status),
        local_available_quantity: Math.max(0, minorUnits(row.local_available_quantity)),
        local_sold_quantity: Math.max(0, minorUnits(row.local_sold_quantity)),
        quantity: Number(row.quantity) > 0 ? Number(row.quantity) : 0,
        line_item_count: Math.max(0, minorUnits(row.line_item_count)),
        gross_sales_minor_units: grossSalesMinorUnits,
        gross_sales: formatMoney(grossSalesMinorUnits, currency),
        currency,
      }
    })
}

function cleanSquareReconciliationStatus(value) {
  const status = cleanSlugValue(value)

  return [
    "matched_local_operation",
    "square_only_mapped",
    "square_only_unmapped",
  ].includes(status)
    ? status
    : "square_only_unmapped"
}

function mergeSquareReconciliationStatus(left, right) {
  const statuses = [cleanSquareReconciliationStatus(left), cleanSquareReconciliationStatus(right)]

  if (statuses.includes("square_only_unmapped")) {
    return "square_only_unmapped"
  }

  if (statuses.includes("square_only_mapped")) {
    return "square_only_mapped"
  }

  return "matched_local_operation"
}

function cleanReportDate(value) {
  const date = String(value ?? "").trim()

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ""
}

function cleanSlugValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "")
    .slice(0, 64)
}

function cleanSharedSecret(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\x00-\x20]+/g, "")
}

function secretsMatch(actual, expected) {
  const left = cleanSharedSecret(actual)
  const right = cleanSharedSecret(expected)

  if (!left || !right) {
    return false
  }

  const leftDigest = createHash("sha256").update(left).digest()
  const rightDigest = createHash("sha256").update(right).digest()

  return leftDigest.length === rightDigest.length && timingSafeEqual(leftDigest, rightDigest)
}

function cleanFulfillmentOrderItems(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      order_item_id: positiveInt(item.order_item_id ?? item.orderItemId),
      inventory_id: positiveInt(item.inventory_id ?? item.inventoryId),
      reservation_id: positiveInt(item.reservation_id ?? item.reservationId),
      barcode: cleanBarcode(item.barcode),
      card_name: cleanName(item.card_name ?? item.cardName),
      set_name: cleanName(item.set_name ?? item.setName),
      condition: cleanCondition(item.condition ?? item.condition_code),
      price_minor_units: Math.max(0, minorUnits(item.price_minor_units ?? item.priceMinorUnits)),
      currency: cleanCurrency(item.currency),
      quantity: boundedInt(item.quantity, 1, 999, 1),
    }))
    .filter((item) => item.inventory_id > 0 || item.reservation_id > 0 || item.card_name)
}

function woocommerceFulfillmentOrderShouldReduceInventory(order) {
  if (!order || order.local_pickup === false) {
    return false
  }

  if (cleanIsoTimestamp(order.inventory_sale_applied_at_utc)) {
    return false
  }

  const orderStatus = cleanOrderStatus(order.order_status)
  const paymentStatus = cleanName(order.payment_status).toLowerCase()

  return (
    paymentStatus === "paid" &&
    ["processing", "completed"].includes(orderStatus) &&
    cleanFulfillmentOrderItems(order.items).length > 0
  )
}

function fulfillmentLineItemMatchesInventory(lineItem, item) {
  if (!lineItem || !item) {
    return false
  }

  const lineBarcode = cleanBarcode(lineItem.barcode)
  if (lineBarcode && lineBarcode === cleanBarcode(item.barcode)) {
    return true
  }

  const lineInventoryId = positiveInt(lineItem.inventory_id)
  if (lineInventoryId && String(item.wordpress_public_id || "").includes(String(lineInventoryId))) {
    return true
  }

  const sameName = cleanScryDexQuery(lineItem.card_name) === cleanScryDexQuery(item.card_name)
  const sameSet = !cleanScryDexQuery(lineItem.set_name) || cleanScryDexQuery(lineItem.set_name) === cleanScryDexQuery(item.set_name)
  const sameCondition = !cleanCondition(lineItem.condition) || cleanCondition(lineItem.condition) === cleanCondition(item.condition)

  return sameName && sameSet && sameCondition
}

function cleanFulfillmentStatus(value) {
  const status = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "")

  return ["awaiting_pull", "pulling", "ready_for_pickup", "completed"].includes(status) ? status : ""
}

function cleanFulfillmentStatusList(value) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",")

  return raw.map(cleanFulfillmentStatus).filter(Boolean)
}

function cleanOrderStatus(value) {
  return String(value ?? "processing")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "processing"
}

function cleanFulfillmentOrderSource(value) {
  const source = String(value ?? "").trim().toLowerCase()

  return ["wordpress", "queued"].includes(source) ? source : "wordpress"
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

function publicCreditLedgerEntry(entry, users = []) {
  const staffUserId = cleanPublicId(entry.staff_user_id)
  const staffUser = users.find((user) => cleanPublicId(user.id) === staffUserId)

  return {
    entry_id: entry.entry_id,
    customer_public_id: entry.customer_public_id,
    entry_type: entry.entry_type,
    amount_minor_units: entry.amount_minor_units,
    balance_before_minor_units: entry.balance_before_minor_units,
    balance_after_minor_units: entry.balance_after_minor_units,
    currency: entry.currency,
    status: entry.status,
    reason: entry.reason,
    source: entry.source,
    staff_user_id: staffUserId,
    staff_user_name: staffUser ? cleanName(staffUser.name) : "",
    reference_id: cleanExternalId(entry.reference_id),
    line_items: cleanCreditLedgerLineItems(entry.line_items),
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
    event_type: cleanEventType(event.event_type),
    game: cleanGame(event.game),
    entry_fee_minor_units: Math.max(0, minorUnits(event.entry_fee_minor_units)),
    registration_deadline_utc: cleanIsoTimestamp(event.registration_deadline_utc),
    woocommerce_product_id: positiveInt(event.woocommerce_product_id) ?? 0,
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
  staffUserId = "",
  referenceId = "",
  lineItems = [],
  now,
}) {
  return {
    entry_id: `credit-${randomUUID()}`,
    customer_public_id: customer.customer_public_id,
    entry_type: entryType,
    amount_minor_units: amountMinorUnits,
    balance_before_minor_units: Math.max(0, balanceAfterMinorUnits - amountMinorUnits),
    balance_after_minor_units: balanceAfterMinorUnits,
    currency: customer.credit_currency,
    status: "pending_sync",
    reason,
    source,
    staff_user_id: cleanPublicId(staffUserId),
    reference_id: cleanExternalId(referenceId),
    line_items: cleanCreditLedgerLineItems(lineItems),
    created_at_utc: now().toISOString(),
  }
}

function cleanCreditLedgerLineItems(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.slice(0, 50).map((item, index) => ({
    line_item_id: cleanExternalId(item.line_item_id ?? item.lineItemId) || `line-${index + 1}`,
    type: cleanName(item.type) || "ledger_line",
    label: cleanReason(item.label ?? item.description ?? item.reason) || "Ledger line item",
    amount_minor_units: minorUnits(item.amount_minor_units ?? item.amountMinorUnits),
    reference_id: cleanExternalId(item.reference_id ?? item.referenceId),
    sale_total_minor_units: Math.max(0, minorUnits(item.sale_total_minor_units ?? item.saleTotalMinorUnits)),
    square_receipt_reference: cleanExternalId(item.square_receipt_reference ?? item.squareReceiptReference),
  }))
}

function buildSquareCreditHandoff(customer, amountMinorUnits, saleTotalMinorUnits, options = {}) {
  const receiptReference = cleanExternalId(options.receiptReference)
  const recordedAtUtc = cleanIsoTimestamp(options.recordedAtUtc) || new Date().toISOString()

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
    square_receipt_reference: receiptReference,
    square_cashier_confirmed: options.cashierConfirmed === true,
    square_recorded_at_utc: recordedAtUtc,
    square_instruction:
      `Record ${formatMoney(amountMinorUnits, customer.credit_currency)} as Pug Store Credit in Square POS, ` +
      `then collect ${formatMoney(Math.max(0, saleTotalMinorUnits - amountMinorUnits), customer.credit_currency)} ` +
      `with the customer's remaining tender. Attach Square reference ${receiptReference}.`,
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

function normalizeUserAccessForCurrentSchema(role, access) {
  if (["manager", "owner"].includes(cleanRole(role))) {
    return [...ACCESS_SECTIONS]
  }

  const cleaned = cleanAccess(access)
  const legacyFrontCounterAccess = ["Inventory", "Kiosk", "Queue", "Events", "Customers", "Sync", "Status"]
  const hadLegacyFrontCounterAccess = legacyFrontCounterAccess.every((section) => cleaned.includes(section))

  if (hadLegacyFrontCounterAccess && !cleaned.includes("Trade-Ins")) {
    return cleanAccess([...cleaned, "Trade-Ins"])
  }

  return cleaned
}

function cleanName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 80)
}

function cleanInventoryLocation(value) {
  return cleanName(value).replace(/[<>]/g, "").slice(0, 80)
}

function cleanInventoryLocations(values) {
  const locations = Array.isArray(values) ? values : []
  const seen = new Set()
  const cleaned = []

  for (const value of locations) {
    const location = cleanInventoryLocation(value)
    const key = location.toLowerCase()

    if (!location || seen.has(key)) {
      continue
    }

    seen.add(key)
    cleaned.push(location)
  }

  return cleaned.sort((left, right) => left.localeCompare(right)).slice(0, 200)
}

function cleanEmail(value) {
  const email = String(value ?? "").trim().toLowerCase().slice(0, 120)

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""
}

function cleanPhone(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\d+().\-\s]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 40)
}

function cleanRole(value) {
  return value === "owner" ? "owner" : value === "manager" ? "manager" : "staff"
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

function cleanOptionalReason(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 160)
}

function cleanCondition(value) {
  const raw = String(value ?? "").trim()
  const normalized = raw
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9+\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  const aliases = {
    m: "MT",
    mint: "MT",
    nm: "NM",
    "near mint": "NM",
    nearmint: "NM",
    "near mint or better": "NM",
    "near mint/mint": "NM",
    "near mint mint": "NM",
    lp: "LP",
    "light play": "LP",
    "light played": "LP",
    "lightly played": "LP",
    lightlyplayed: "LP",
    sp: "LP",
    "slightly played": "LP",
    mp: "MP",
    "moderate play": "MP",
    "moderate played": "MP",
    "moderately played": "MP",
    moderatelyplayed: "MP",
    hp: "HP",
    "heavy play": "HP",
    "heavy played": "HP",
    "heavily played": "HP",
    heavilyplayed: "HP",
    dmg: "DMG",
    damaged: "DMG",
    damage: "DMG",
    poor: "DMG",
    raw: "RAW",
  }
  const condition = aliases[normalized] ?? raw.toUpperCase().slice(0, 16)

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

function scannerBarcodeLengthAllowed(value) {
  return cleanBarcode(value).length <= SCANNER_BARCODE_MAX_LENGTH
}

function generateScannerBarcodeBase() {
  return `PUG-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`
}

function scannerSafeIndexedBarcode(baseBarcode, index, rowCount) {
  const base = cleanBarcode(baseBarcode) || generateScannerBarcodeBase()
  const suffixWidth = rowCount > 36 ? 2 : 1
  const suffix = (index + 1).toString(36).toUpperCase().padStart(suffixWidth, "0")
  const rootLength = Math.max(1, SCANNER_BARCODE_MAX_LENGTH - suffix.length)

  return `${base.slice(0, rootLength)}${suffix}`
}

function cleanExternalId(value) {
  return String(value ?? "").trim().slice(0, 191)
}

function cleanText(value) {
  return String(value ?? "").trim().slice(0, 1000)
}

function cleanExternalSyncState(value) {
  const status = String(value ?? "").trim().toLowerCase()

  return ["pending", "synced", "square_synced", "failed", "conflict"].includes(status) ? status : "pending"
}

function cleanSquareEnvironment(value) {
  const environment = String(value ?? "").trim().toLowerCase()

  if (["production", "prod", "live"].includes(environment)) {
    return "production"
  }

  return ["sandbox", "test", "local", "staging"].includes(environment) ? "sandbox" : "sandbox"
}

function cleanPublicId(value) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9-_:.]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96)
}

function cleanFulfillmentNotificationSettings(value = {}) {
  const settings = value && typeof value === "object" ? value : {}
  const rawUrl = String(settings.notification_sound_url ?? settings.notificationSoundUrl ?? "").trim()
  let notificationSoundUrl = ""

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl)
      notificationSoundUrl =
        ["http:", "https:"].includes(parsed.protocol) && /\.(mp3|mp4)$/i.test(parsed.pathname)
          ? parsed.toString()
          : ""
    } catch {
      notificationSoundUrl = ""
    }
  }

  return {
    audio_enabled: settings.audio_enabled !== false && settings.audioEnabled !== false,
    notification_sound_url: notificationSoundUrl,
    employee_only: true,
    ready_pickup_email_enabled:
      settings.ready_pickup_email_enabled !== false && settings.readyPickupEmailEnabled !== false,
    source: cleanExternalId(settings.source) || "local_sync_server_default",
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

function cleanStoreId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64) || "pug-game-shop"
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

function cleanInventoryImageUrl(value) {
  const candidate = String(value ?? "").trim()

  if (!candidate) {
    return ""
  }

  const httpUrl = cleanHttpUrl(candidate)

  if (httpUrl) {
    return httpUrl
  }

  return candidate.length <= 2_600_000 && /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(candidate)
    ? candidate
    : ""
}

function cleanRestBasePath(value) {
  const path = String(value ?? "").trim()

  if (!path || !path.startsWith("/")) {
    return "/wp-json/tcg-store/v1"
  }

  return path.replace(/\/+$/, "") || "/wp-json/tcg-store/v1"
}

function cleanSetupConfig(value = {}) {
  const websiteUrl = cleanHttpUrl(value.websiteUrl ?? value.website_url)
  const serverUrl = cleanHttpUrl(value.serverUrl ?? value.server_url) || "http://127.0.0.1:8787/"
  const restBasePath = cleanRestBasePath(value.restBasePath ?? value.rest_base_path)
  const configuredAtUtc = cleanIsoTimestamp(value.configuredAtUtc ?? value.configured_at_utc) || new Date().toISOString()

  return {
    storeId: cleanStoreId(value.storeId ?? value.store_id),
    serverUrl,
    websiteUrl,
    restBasePath,
    localDatabase: cleanName(value.localDatabase ?? value.local_database) || "store-sync.sqlite",
    configSource: String(value.configSource ?? value.config_source ?? "server_environment")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/(^_|_$)/g, "")
      .slice(0, 64) || "server_environment",
    configuredAtUtc,
    wordpressConnectorRestartRequired: Boolean(
      value.wordpressConnectorRestartRequired ?? value.wordpress_connector_restart_required,
    ),
    creditApprovalThresholdMinorUnits: boundedInt(
      value.creditApprovalThresholdMinorUnits ?? value.credit_approval_threshold_minor_units,
      0,
      1_000_000,
      2500,
    ),
  }
}

function cleanEventPaymentStatus(value) {
  return value === "pay_at_store" ? "pay_at_store" : "not_required"
}

function cleanEventRegistrationStatus(value) {
  return ["open", "waitlist", "full", "closed"].includes(value) ? value : "closed"
}

function cleanEventType(value) {
  const eventType = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_")

  return eventType || "tournament"
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

function eventRegistrationDeadline(startsAtUtc, value, unit) {
  const startsAt = Date.parse(startsAtUtc)

  if (!Number.isFinite(startsAt)) {
    return ""
  }

  const amount = boundedInt(value, 0, 365, 0)
  const normalizedUnit = String(unit ?? "").trim().toLowerCase()
  const multiplier =
    normalizedUnit.startsWith("day") ? 24 * 60 * 60 * 1000 :
      normalizedUnit.startsWith("hour") ? 60 * 60 * 1000 :
        normalizedUnit.startsWith("minute") ? 60 * 1000 :
          0

  return amount > 0 && multiplier > 0 ? new Date(startsAt - amount * multiplier).toISOString() : ""
}

function isActiveEventSnapshot(event, now = () => new Date()) {
  const startsAtMs = Date.parse(String(event?.starts_at_utc ?? ""))

  if (!Number.isFinite(startsAtMs)) {
    return true
  }

  return startsAtMs >= now().getTime()
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
    raw
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter((entry) => ["inventory", "events", "fulfillment", "catalog"].includes(entry)),
  )

  if (domains.size === 0) {
    domains.add("inventory")
    domains.add("events")
    domains.add("fulfillment")
  }

  return domains
}

function cleanCustomerStatus(value) {
  return ["active", "inactive"].includes(value) ? value : "active"
}

function cleanScryDexQuery(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80)
}

function cleanScryDexCollectorLookupQuery(value) {
  const query = cleanScryDexQuery(value)
    .replace(/\b(extended|full|alternate|alt|borderless|showcase|special|textured)\s+(art|arts?)\b/g, " ")
    .replace(/\b(extended|full|alternate|alt|borderless|showcase|special|textured)\b/g, " ")
    .replace(/\b(art|arts?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return query === cleanScryDexQuery(value) ? "" : query
}

function scryDexSearchNeedles(value) {
  const primary = cleanScryDexQuery(value)
  const collectorFallback = cleanScryDexCollectorLookupQuery(value)

  return [...new Set([primary, collectorFallback].filter(Boolean))]
}

function cleanScryDexSearchText(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 4000)
}

function cleanGame(value) {
  const game = String(value ?? "").trim().toLowerCase()
  const aliases = {
    magic: "magicthegathering",
    mtg: "magicthegathering",
    "magic-the-gathering": "magicthegathering",
    magic_the_gathering: "magicthegathering",
    "magic: the gathering": "magicthegathering",
    onepiece: "onepiece",
    one_piece: "onepiece",
    "one-piece": "onepiece",
    "one-piece-card-game": "onepiece",
    "one piece": "onepiece",
    yugioh: "yugioh",
    yu_gi_oh: "yugioh",
    "yu-gi-oh": "yugioh",
    "yu-gi-oh!": "yugioh",
    "yu gi oh": "yugioh",
    "yu-gi-oh-card-game": "yugioh",
  }
  const normalizedGame = aliases[game] ?? game

  return ["pokemon", "magicthegathering", "lorcana", "onepiece", "gundam", "yugioh", "riftbound"].includes(normalizedGame)
    ? normalizedGame
    : "pokemon"
}

function cleanScryDexSearchGame(value) {
  const game = String(value ?? "").trim().toLowerCase()

  if (!game || ["all", "any", "allgames", "all_games", "all-games"].includes(game)) {
    return ""
  }

  return cleanGame(value)
}

function cleanScryDexCatalogIndexMode(value) {
  const mode = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_")

  return mode === "card" ? "card" : "set"
}

function supportedScryDexGames(value) {
  const requested = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
  const games =
    requested.length > 0
      ? requested.map(cleanGame)
      : ["pokemon", "magicthegathering", "lorcana", "onepiece", "gundam", "riftbound"]

  return [...new Set(games.filter((game) => game !== "yugioh"))]
}

function buildScryDexCatalogTotals(referenceCards = []) {
  const cards = Array.isArray(referenceCards) ? referenceCards : []
  const games = new Map()
  let variantCount = 0
  let pricePointCount = 0
  let pricedCardCount = 0
  let latestCatalogSyncUtc = ""
  let latestPriceObservedUtc = ""

  for (const card of cards) {
    const game = cleanGame(card?.game)
    const variants = Array.isArray(card?.variants) ? card.variants : []
    const pricePoints = Array.isArray(card?.price_points) ? card.price_points : []
    const hasPrice =
      Number(card?.market_price_minor_units ?? 0) > 0 ||
      pricePoints.some((point) => Number(point?.market_price_minor_units ?? point?.mid_price_minor_units ?? 0) > 0)
    const gameTotals = games.get(game) ?? {
      game,
      card_count: 0,
      variant_count: 0,
      price_point_count: 0,
      priced_card_count: 0,
      latest_catalog_sync_utc: "",
      latest_price_observed_utc: "",
    }

    gameTotals.card_count += 1
    gameTotals.variant_count += variants.length
    gameTotals.price_point_count += pricePoints.length
    gameTotals.priced_card_count += hasPrice ? 1 : 0
    gameTotals.latest_catalog_sync_utc = latestIso(gameTotals.latest_catalog_sync_utc, card?.catalog_synced_at_utc)
    gameTotals.latest_price_observed_utc = latestIso(gameTotals.latest_price_observed_utc, card?.price_observed_at_utc)
    games.set(game, gameTotals)

    variantCount += variants.length
    pricePointCount += pricePoints.length
    pricedCardCount += hasPrice ? 1 : 0
    latestCatalogSyncUtc = latestIso(latestCatalogSyncUtc, card?.catalog_synced_at_utc)
    latestPriceObservedUtc = latestIso(latestPriceObservedUtc, card?.price_observed_at_utc)
  }

  const gameRows = [...games.values()].sort((left, right) => left.game.localeCompare(right.game))

  return {
    card_count: cards.length,
    variant_count: variantCount,
    price_point_count: pricePointCount,
    priced_card_count: pricedCardCount,
    game_count: gameRows.length,
    games: gameRows,
    latest_catalog_sync_utc: latestCatalogSyncUtc,
    latest_price_observed_utc: latestPriceObservedUtc,
  }
}

function latestIso(currentValue, nextValue) {
  const current = cleanIsoTimestamp(currentValue)
  const next = cleanIsoTimestamp(nextValue)

  if (!current) {
    return next
  }

  if (!next) {
    return current
  }

  return next > current ? next : current
}

function cleanProviderResourceId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191)
}

function bestExpansionIdFromCards(cards, setQuery) {
  const normalizedSetQuery = normalizeCacheText(setQuery)
  const candidates = Array.isArray(cards) ? cards : []
  const exactMatch = candidates.find((card) => {
    const setCode = normalizeCacheText(card?.set_code)
    const setName = normalizeCacheText(card?.set_name)

    return normalizedSetQuery && (setCode === normalizedSetQuery || setName === normalizedSetQuery)
  })
  const looseMatch = candidates.find((card) => {
    const setCode = normalizeCacheText(card?.set_code)
    const setName = normalizeCacheText(card?.set_name)

    return normalizedSetQuery && (setCode.includes(normalizedSetQuery) || setName.includes(normalizedSetQuery))
  })
  const selected = exactMatch ?? looseMatch ?? candidates[0]

  return cleanProviderResourceId(selected?.set_code ?? selected?.set_name ?? "")
}

function searchReferenceCards(referenceCards, needle, game, setFilter = "", limit = null) {
  const includeVariantOnlyMatches = isVariantFocusedScryDexQuery(needle)
  const matches = referenceCards
    .filter((card) => !game || card.game === game)
    .filter((card) => referenceCardMatchesSetFilter(card, setFilter))
    .map((card) => ({
      card,
      score: referenceSearchScore(card, needle, { includeVariantOnlyMatches }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)

  return (limit ? matches.slice(0, limit) : matches).map((entry) => entry.card)
}

function normalizeReferenceCardsFromFallback(result, game, now, needle = "", setFilter = "", limit = null) {
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

  const matches = candidateCards
    .map((card) => normalizeReferenceCard(card, game, now, "wordpress_catalog_cache"))
    .filter((card) => card.provider_card_id && card.card_name)
    .filter((card) => referenceCardMatchesSetFilter(card, setFilter))
    .sort(
      (left, right) =>
        referenceSearchScore(right, needle, { includeVariantOnlyMatches: true }) -
        referenceSearchScore(left, needle, { includeVariantOnlyMatches: true }),
    )

  return limit ? matches.slice(0, limit) : matches
}

function buildScryDexSearchRequestFromVision(visionResult, fallbackGame = "pokemon") {
  const matches = Array.isArray(visionResult?.matches) ? visionResult.matches : []
  const topMatch = matches[0] ?? {}
  const query =
    cleanScryDexQuery(topMatch.card_name) ||
    cleanScryDexQuery(visionResult?.top_query) ||
    cleanScryDexQuery(visionResult?.analysis?.graded_details?.cert)
  const setFilter = cleanScryDexSearchText(topMatch.set_name || topMatch.set_code)
  const game = cleanGame(topMatch.game || visionResult?.game || visionResult?.analysis?.game || fallbackGame)

  return {
    query,
    setFilter,
    game,
  }
}

function mergeReferenceSearchResults(cachedCards, fallbackCards, needle) {
  const merged = new Map()

  for (const card of [...cachedCards, ...fallbackCards]) {
    const key = referenceCardMergeKey(card)

    if (!merged.has(key)) {
      merged.set(key, card)
      continue
    }

    merged.set(key, mergeReferenceCardSnapshots(merged.get(key), card))
  }

  return Array.from(merged.values()).sort(
    (left, right) =>
      referenceSearchScore(right, needle, { includeVariantOnlyMatches: true }) -
      referenceSearchScore(left, needle, { includeVariantOnlyMatches: true }),
  )
}

function referenceCardMergeKey(card) {
  const providerId = cleanScryDexSearchText(card?.provider_card_id)

  if (providerId) {
    return `provider:${providerId}`
  }

  return [
    "card",
    cleanGame(card?.game),
    cleanScryDexSearchText(card?.card_name),
    cleanScryDexSearchText(card?.set_name),
    cleanScryDexSearchText(card?.card_number),
    cleanScryDexSearchText(card?.printed_number),
  ].join("|")
}

function mergeReferenceCardSnapshots(primary, secondary) {
  if (!primary) {
    return secondary
  }

  if (!secondary) {
    return primary
  }

  const secondaryFields = Object.fromEntries(
    Object.entries(secondary)
      .filter(([key]) => !["variants", "price_points"].includes(key))
      .filter(([, value]) => value !== "" && value !== null && value !== undefined),
  )

  return {
    ...primary,
    ...secondaryFields,
    variants: mergeReferenceVariants(primary.variants ?? [], secondary.variants ?? []),
    price_points: mergeReferencePricePoints(primary.price_points ?? [], secondary.price_points ?? []),
  }
}

function mergeReferencePricePoints(primaryPoints, secondaryPoints) {
  const points = new Map()

  for (const point of [...primaryPoints, ...secondaryPoints]) {
    if (!point || typeof point !== "object") {
      continue
    }

    const key = [
      cleanScryDexSearchText(point.provider_variant_id),
      cleanScryDexSearchText(point.reference_variant_id),
      cleanScryDexSearchText(point.condition_code),
      cleanScryDexSearchText(point.raw_or_graded),
      cleanScryDexSearchText(point.grading_company),
      cleanScryDexSearchText(point.grade),
      cleanScryDexSearchText(point.currency),
    ].join("|")

    if (!points.has(key)) {
      points.set(key, point)
      continue
    }

    points.set(key, {
      ...points.get(key),
      ...Object.fromEntries(
        Object.entries(point).filter(([, value]) => value !== "" && value !== null && value !== undefined),
      ),
    })
  }

  return Array.from(points.values())
}

function mergeReferenceVariants(primaryVariants, secondaryVariants) {
  const variants = new Map()

  for (const variant of [...primaryVariants, ...secondaryVariants]) {
    const key = [
      cleanScryDexSearchText(variant?.provider_variant_id),
      cleanScryDexSearchText(variant?.variant),
      cleanScryDexSearchText(variant?.finish),
      cleanScryDexSearchText(variant?.language),
      cleanScryDexSearchText(variant?.edition),
    ].join("|")

    if (!variants.has(key)) {
      variants.set(key, variant)
      continue
    }

    variants.set(key, {
      ...variants.get(key),
      ...Object.fromEntries(
        Object.entries(variant).filter(([, value]) => value !== "" && value !== null && value !== undefined),
      ),
    })
  }

  return Array.from(variants.values())
}

function referenceCardMatchesSetFilter(card, setFilter) {
  const normalizedFilter = cleanScryDexSearchText(setFilter)

  if (!normalizedFilter) {
    return true
  }

  return cleanScryDexSearchText([card.set_name, card.set_code].join(" ")).includes(normalizedFilter)
}

function boundedScryDexSearchLimit(value) {
  const raw = String(value ?? "all").trim().toLowerCase()

  if (!raw || raw === "all" || raw === "0") {
    return null
  }

  return boundedInt(raw, 1, 250, 250)
}

function referenceSearchScore(card, needle, options = {}) {
  const needles = scryDexSearchNeedles(needle)
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

  if (needles.length === 0) {
    return 0
  }

  return needles.reduce((bestScore, normalizedNeedle, index) => {
    const fallbackPenalty = index === 0 ? 0 : 120

    if (cardName === normalizedNeedle) {
      return Math.max(bestScore, 1000 - fallbackPenalty)
    }

    if (cardName.startsWith(normalizedNeedle)) {
      return Math.max(bestScore, 900 - fallbackPenalty)
    }

    if (cardName.includes(normalizedNeedle)) {
      return Math.max(bestScore, 800 - fallbackPenalty)
    }

    if (identifiers.includes(normalizedNeedle)) {
      return Math.max(bestScore, 500 - fallbackPenalty)
    }

    if (options.includeVariantOnlyMatches === true && variants.includes(normalizedNeedle)) {
      return Math.max(bestScore, 350 - fallbackPenalty)
    }

    if (setName.includes(normalizedNeedle)) {
      return Math.max(bestScore, 100)
    }

    return bestScore
  }, 0)
}

function isVariantFocusedScryDexQuery(value) {
  const query = cleanScryDexQuery(value)

  return [
    "stamp",
    "foil",
    "holo",
    "reverse",
    "extended",
    "full art",
    "borderless",
    "showcase",
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
  const images = bestScryDexImages(card.images)
  const setName = cleanName(card.set_name ?? set.name)
  const setCode = cleanName(card.set_code ?? set.code).toUpperCase()
  const variants = cleanReferenceVariants(card.variants ?? parseJson(card.variants_json, []), {
    setName,
    setCode,
  })
  const pricePoints = cleanReferencePricePoints(referencePricePointSources(card))
  const usdPricePoints = pricePoints.filter((point) => cleanCurrency(point.currency) === "USD")
  const priceMinorUnits =
    card.market_price_minor_units !== undefined
      ? (cleanCurrency(card.currency ?? marketPrice.currency) === "USD" ? minorUnits(card.market_price_minor_units) : 0)
      : (cleanCurrency(marketPrice.currency ?? card.currency) === "USD"
          ? decimalMoneyToMinorUnits(marketPrice.amount ?? card.market_price ?? card.price)
          : 0)
  const fallbackUsdPriceMinorUnits =
    usdPricePoints.find((point) => point.market_price_minor_units > 0)?.market_price_minor_units ??
    usdPricePoints.find((point) => point.mid_price_minor_units > 0)?.mid_price_minor_units ??
    usdPricePoints.find((point) => point.low_price_minor_units > 0)?.low_price_minor_units ??
    0
  const resolvedMarketPriceMinorUnits = Math.max(0, priceMinorUnits || fallbackUsdPriceMinorUnits)
  const resolvedCurrency = resolvedMarketPriceMinorUnits > 0 && !priceMinorUnits && fallbackUsdPriceMinorUnits > 0
    ? "USD"
    : cleanCurrency(card.currency ?? marketPrice.currency)

  return {
    provider_card_id: providerCardId,
    game: cleanGame(card.game ?? fallbackGame),
    card_name: cleanName(card.card_name ?? card.name),
    set_name: setName,
    set_code: setCode,
    card_number: cleanName(card.card_number ?? card.number),
    printed_number: cleanName(card.printed_number ?? card.printedNumber),
    suggested_barcode: cleanBarcode(card.suggested_barcode ?? card.sku ?? providerCardId),
    market_price_minor_units: resolvedMarketPriceMinorUnits,
    currency: resolvedCurrency,
    image_url: cleanHttpUrl(card.image_url ?? card.front_image_url ?? images.large ?? images.medium ?? images.small),
    variants,
    price_points: pricePoints,
    price_observed_at_utc: cleanIsoTimestamp(card.price_observed_at_utc ?? card.observed_at ?? card.updated_at),
    catalog_synced_at_utc: cleanIsoTimestamp(card.catalog_synced_at_utc ?? card.synced_at_utc) || currentTimestamp,
    catalog_source: cleanCatalogSource(card.catalog_source ?? catalogSource),
  }
}

function referencePricePointSources(card) {
  const direct = card.price_points ?? card.pricePoints ?? card.prices ?? parseJson(card.price_points_json, [])
  const points = Array.isArray(direct) ? [...direct] : []
  const variants = Array.isArray(card.variants) ? card.variants : parseJson(card.variants_json, [])

  for (const variant of variants) {
    if (!variant || typeof variant !== "object") {
      continue
    }

    const variantPrices = variant.price_points ?? variant.pricePoints ?? variant.prices
    if (!Array.isArray(variantPrices)) {
      continue
    }

    const providerVariantId = variant.provider_variant_id ?? variant.id ?? variant.variant_id ?? variant.variantId ?? ""
    for (const price of variantPrices) {
      if (price && typeof price === "object") {
        points.push({
          ...price,
          provider_variant_id: price.provider_variant_id ?? providerVariantId,
          variant: price.variant ?? variant.variant ?? variant.name ?? "",
          finish: price.finish ?? variant.finish ?? "",
        })
      }
    }
  }

  return points
}

function cleanReferencePricePoints(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((point) => point && typeof point === "object")
    .map((point) => {
      const marketPriceMinorUnits = pricePointMinorUnits(
        point.market_price_minor_units,
        point.market_price ?? point.market ?? point.market_value ?? point.marketValue ?? point.value,
      )
      const lowPriceMinorUnits = pricePointMinorUnits(
        point.low_price_minor_units,
        point.low_price ?? point.lowPrice ?? point.low ?? point.market_low ?? point.marketLow ?? point.low_value ?? point.lowValue,
      )
      const midPriceMinorUnits = pricePointMinorUnits(
        point.mid_price_minor_units,
        point.mid_price ?? point.midPrice ?? point.mid ?? point.market_mid ?? point.marketMid ?? point.mid_value ?? point.midValue,
      )
      const highPriceMinorUnits = pricePointMinorUnits(
        point.high_price_minor_units,
        point.high_price ?? point.highPrice ?? point.high ?? point.market_high ?? point.marketHigh ?? point.high_value ?? point.highValue,
      )
      const rawOrGraded = cleanRawOrGraded(
        point.raw_or_graded ?? point.rawOrGraded ?? point.type ?? (point.is_perfect === true ? "graded" : ""),
      )
      const grade = cleanName(
        point.grade ??
        point.grading_grade ??
        point.gradingGrade ??
        point.grade_label ??
        point.gradeLabel ??
        (rawOrGraded === "graded" && point.is_perfect === true ? "10" : ""),
      )

      return {
        reference_variant_id: positiveInt(point.reference_variant_id),
        provider_variant_id: cleanPublicId(point.provider_variant_id),
        condition_code: cleanCondition(point.condition_code ?? point.condition),
        raw_or_graded: rawOrGraded,
        grading_company: cleanName(point.grading_company ?? point.gradingCompany ?? point.grader ?? point.company),
        grade,
        market_price_minor_units: marketPriceMinorUnits,
        low_price_minor_units: lowPriceMinorUnits,
        mid_price_minor_units: midPriceMinorUnits,
        high_price_minor_units: highPriceMinorUnits,
        currency: cleanCurrency(point.currency),
        observed_at_utc: cleanIsoTimestamp(
          point.observed_at_utc ?? point.observed_at ?? point.source_observed_at ?? point.provider_updated_at,
        ),
      }
    })
    .filter((point) =>
      point.market_price_minor_units > 0 ||
      point.mid_price_minor_units > 0 ||
      point.low_price_minor_units > 0 ||
      point.high_price_minor_units > 0,
    )
}

function bestScryDexImages(value) {
  if (Array.isArray(value)) {
    const front = value.find((image) => cleanName(image?.type).toLowerCase() === "front") ?? value[0] ?? {}
    const back = value.find((image) => cleanName(image?.type).toLowerCase() === "back") ?? {}

    return {
      small: cleanHttpUrl(front.small ?? front.url ?? front.image_url),
      medium: cleanHttpUrl(front.medium ?? front.small ?? front.url ?? front.image_url),
      large: cleanHttpUrl(front.large ?? front.medium ?? front.small ?? front.url ?? front.image_url),
      back_small: cleanHttpUrl(back.small ?? back.url ?? back.image_url),
      back_medium: cleanHttpUrl(back.medium ?? back.small ?? back.url ?? back.image_url),
      back_large: cleanHttpUrl(back.large ?? back.medium ?? back.small ?? back.url ?? back.image_url),
    }
  }

  if (value && typeof value === "object") {
    return {
      small: cleanHttpUrl(value.small ?? value.front?.small ?? value.front),
      medium: cleanHttpUrl(value.medium ?? value.front?.medium ?? value.small ?? value.front?.small ?? value.front),
      large: cleanHttpUrl(value.large ?? value.front?.large ?? value.medium ?? value.front?.medium ?? value.small ?? value.front),
      back_small: cleanHttpUrl(value.back?.small ?? value.back_small ?? value.backImageSmall),
      back_medium: cleanHttpUrl(value.back?.medium ?? value.back_medium ?? value.backImageMedium),
      back_large: cleanHttpUrl(value.back?.large ?? value.back_large ?? value.backImageLarge),
    }
  }

  return {}
}

function pricePointMinorUnits(minorValue, decimalValue) {
  if (minorValue !== undefined && minorValue !== null && minorValue !== "") {
    return minorUnits(minorValue)
  }

  return minorUnitsFromDecimal(decimalValue)
}

function cleanReferenceVariants(value, context = {}) {
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
      front_image_url: cleanHttpUrl(
        variant.front_image_url ??
        variant.image_url ??
        bestScryDexImages(variant.images).large ??
        bestScryDexImages(variant.images).medium ??
        bestScryDexImages(variant.images).small,
      ),
      back_image_url: cleanHttpUrl(
        variant.back_image_url ??
        bestScryDexImages(variant.images).back_large ??
        bestScryDexImages(variant.images).back_medium ??
        bestScryDexImages(variant.images).back_small,
      ),
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
    .filter((variant) => !referenceVariantLooksLikeSetCode(variant, context))
    .slice(0, 24)
}

function referenceVariantLooksLikeSetCode(variant, context = {}) {
  const variantText = cleanScryDexSearchText(variant?.variant)
  const finishText = cleanScryDexSearchText(variant?.finish)
  const editionText = cleanScryDexSearchText(variant?.edition)
  const languageText = cleanScryDexSearchText(variant?.language)
  const setCode = cleanScryDexSearchText(context.setCode)
  const setName = cleanScryDexSearchText(context.setName)
  const knownFinish = new Set([
    "normal",
    "foil",
    "holofoil",
    "reverseholofoil",
    "reverse holofoil",
    "serializedfoil",
    "serialized foil",
    "etchedfoil",
    "etched foil",
    "nonfoil",
    "non foil",
  ])

  if (!variantText || knownFinish.has(variantText) || knownFinish.has(finishText)) {
    return false
  }

  if (languageText && languageText.length <= 3) {
    return false
  }

  const duplicatedShortCode = variantText === finishText && /^[a-z0-9]{2,8}$/.test(variantText)
  const matchesCurrentSet = setCode && variantText === setCode && (!finishText || finishText === setCode)
  const matchesSetName = setName && variantText === setName && (!finishText || finishText === setName)
  const onlyCodeLikeFields = [variantText, finishText, editionText].filter(Boolean).every((field) => /^[a-z0-9]{2,8}$/.test(field))

  return duplicatedShortCode || matchesCurrentSet || matchesSetName || (onlyCodeLikeFields && finishText === variantText)
}

function referenceCacheSource(cards) {
  const sources = new Set(
    (Array.isArray(cards) ? cards : [])
      .map((card) => cleanCatalogSource(card?.catalog_source))
      .filter(Boolean),
  )

  if (sources.size === 0 || sources.has("scrydex_catalog") || sources.has("local_reference_cache")) {
    return "local_reference_cache"
  }

  return "wordpress_catalog_cache"
}

function cleanRawOrGradedSupport(value) {
  const support = String(value ?? "").trim().toLowerCase()

  return ["raw", "graded", "sealed", "both"].includes(support) ? support : "both"
}

function cleanRawOrGraded(value) {
  const rawOrGraded = String(value ?? "").trim().toLowerCase()

  return ["raw", "graded", "sealed"].includes(rawOrGraded) ? rawOrGraded : "raw"
}

function upsertReferenceCard(referenceCards, card) {
  const existingIndex = referenceCards.findIndex((candidate) => candidate.provider_card_id === card.provider_card_id)

  if (existingIndex >= 0) {
    referenceCards[existingIndex] = card
    return
  }

  referenceCards.push(card)
}

function dedupeRawReferenceCards(cards = []) {
  const byProviderId = new Map()
  const withoutProviderId = []

  for (const card of Array.isArray(cards) ? cards : []) {
    const providerCardId = cleanPublicId(card?.provider_card_id ?? card?.providerCardId ?? card?.id)

    if (!providerCardId) {
      withoutProviderId.push(card)
      continue
    }

    byProviderId.set(providerCardId, card)
  }

  return [...byProviderId.values(), ...withoutProviderId]
}

function referenceCardIndexByProviderId(referenceCards = []) {
  const indexes = new Map()

  for (let index = 0; index < referenceCards.length; index += 1) {
    const providerCardId = cleanPublicId(referenceCards[index]?.provider_card_id)
    if (providerCardId) {
      indexes.set(providerCardId, index)
    }
  }

  return indexes
}

function buildReferenceCardLookup(referenceCards = []) {
  const byProviderId = new Map()
  const byGameAndName = new Map()

  for (const card of Array.isArray(referenceCards) ? referenceCards : []) {
    const providerCardId = cleanPublicId(card?.provider_card_id)
    if (providerCardId) {
      byProviderId.set(providerCardId, card)
    }

    const key = referenceCardNameLookupKey(card?.game, card?.card_name)
    if (!key) {
      continue
    }

    const cards = byGameAndName.get(key) ?? []
    cards.push(card)
    byGameAndName.set(key, cards)
  }

  return { byProviderId, byGameAndName }
}

function referenceCardNameLookupKey(game, cardName) {
  const normalizedGame = cleanGame(game)
  const normalizedName = cleanScryDexQuery(cardName)

  return normalizedGame && normalizedName ? `${normalizedGame}::${normalizedName}` : ""
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
  return ["local_reference_cache", "wordpress_catalog_export", "scrydex_catalog"].includes(value)
    ? value
    : "wordpress_catalog_cache"
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
  let stockAvailableCount = 0
  let stockTotalCount = 0

  for (const item of matchingItems) {
    const quantityOnHand = inventoryQuantityOnHand(item)

    stockTotalCount += quantityOnHand

    if (item.status === "available") {
      stockAvailableCount += quantityOnHand
    }

    if (!["available", "pending_intake", "reserved"].includes(item.status)) {
      continue
    }

    stockByCondition.set(item.condition, (stockByCondition.get(item.condition) ?? 0) + quantityOnHand)
  }

  return {
    ...card,
    catalog_source: cleanCatalogSource(card.catalog_source),
    stock_available_count: stockAvailableCount,
    stock_total_count: stockTotalCount,
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

function inventoryReferenceEnrichment(referenceCards, draft = {}, referenceLookup = null) {
  const normalizedGame = cleanGame(draft.game)
  const normalizedName = cleanScryDexQuery(draft.cardName)

  if (!normalizedName) {
    return emptyInventoryReferenceEnrichment()
  }

  const requestedProviderCardId = cleanPublicId(draft.providerCardId ?? draft.provider_card_id)
  const providerCard = requestedProviderCardId ? referenceLookup?.byProviderId?.get(requestedProviderCardId) : null
  const nameCandidates = referenceLookup?.byGameAndName?.get(referenceCardNameLookupKey(normalizedGame, normalizedName)) ?? []
  const candidateCards = providerCard ? [providerCard] : nameCandidates.length > 0 ? nameCandidates : referenceCards

  const matches = (Array.isArray(candidateCards) ? candidateCards : [])
    .filter((card) => card.game === normalizedGame)
    .map((card) => ({
      card,
      score: inventoryReferenceMatchScore(card, draft),
    }))
    .filter((entry) => entry.score >= 800)
    .sort((left, right) => right.score - left.score)

  const card = matches[0]?.card

  if (!card) {
    return emptyInventoryReferenceEnrichment()
  }

  const variant = inventoryReferenceVariant(card, draft)
  const pricePoint = inventoryReferencePricePoint(card, draft)
  const usdPricePoint = cleanCurrency(pricePoint?.currency) === "USD" ? pricePoint : null
  const cardMarketPriceMinorUnits = cleanCurrency(card.currency) === "USD" ? minorUnits(card.market_price_minor_units) : 0

  return {
    provider_card_id: cleanPublicId(card.provider_card_id),
    reference_variant_id: positiveInt(variant?.reference_variant_id),
    provider_variant_id: cleanPublicId(variant?.provider_variant_id),
    set_name: cleanName(card.set_name),
    set_code: cleanName(card.set_code).toUpperCase(),
    card_number: cleanName(card.card_number),
    printed_number: cleanName(card.printed_number || card.card_number),
    variant: cleanName(variant?.variant),
    finish: cleanName(variant?.finish),
    language: cleanName(variant?.language) || "EN",
    image_url: cleanHttpUrl(variant?.front_image_url ?? variant?.image_url) || cleanHttpUrl(card.image_url),
    back_image_url: cleanHttpUrl(variant?.back_image_url),
    price_minor_units:
      minorUnits(usdPricePoint?.market_price_minor_units) ||
      minorUnits(usdPricePoint?.mid_price_minor_units) ||
      minorUnits(usdPricePoint?.low_price_minor_units) ||
      cardMarketPriceMinorUnits,
  }
}

function emptyInventoryReferenceEnrichment() {
  return {
    provider_card_id: "",
    reference_variant_id: null,
    provider_variant_id: "",
    set_name: "",
    set_code: "",
    card_number: "",
    printed_number: "",
    variant: "",
    finish: "",
    language: "",
    image_url: "",
    back_image_url: "",
    price_minor_units: 0,
  }
}

function inventoryReferenceMatchScore(card, draft = {}) {
  const requestedProviderCardId = cleanPublicId(draft.providerCardId ?? draft.provider_card_id)
  const cardProviderId = cleanPublicId(card.provider_card_id)
  const normalizedNeedle = cleanScryDexQuery(draft.cardName)
  const cardName = cleanScryDexQuery(card.card_name)
  const setNeedle = cleanScryDexSearchText(draft.setName)
  const setText = cleanScryDexSearchText([card.set_name, card.set_code].join(" "))
  const numberNeedle = cleanScryDexSearchText([draft.cardNumber, draft.printedNumber].join(" "))
  const numberText = cleanScryDexSearchText([card.card_number, card.printed_number].join(" "))

  if (requestedProviderCardId) {
    if (cardProviderId !== requestedProviderCardId) {
      return 0
    }

    let providerScore = 2500

    if (setNeedle && setText.includes(setNeedle)) {
      providerScore += 250
    }

    if (numberNeedle && numberText && numberText.includes(numberNeedle)) {
      providerScore += 300
    }

    if (cleanHttpUrl(card.image_url)) {
      providerScore += 50
    }

    if (minorUnits(card.market_price_minor_units) > 0) {
      providerScore += 25
    }

    return providerScore
  }

  let score = 0

  if (!normalizedNeedle || !cardName) {
    return 0
  }

  if (cardName === normalizedNeedle) {
    score += 1000
  } else if (cardName.startsWith(normalizedNeedle) || normalizedNeedle.startsWith(cardName)) {
    score += 900
  } else if (cardName.includes(normalizedNeedle) || normalizedNeedle.includes(cardName)) {
    score += 800
  }

  if (score === 0) {
    return 0
  }

  if (setNeedle && !genericInventorySetName(setNeedle) && setText.includes(setNeedle)) {
    score += 250
  }

  if (numberNeedle && numberText && numberText.includes(numberNeedle)) {
    score += 300
  }

  if (cleanHttpUrl(card.image_url)) {
    score += 50
  }

  if (minorUnits(card.market_price_minor_units) > 0) {
    score += 25
  }

  return score
}

function inventoryReferenceVariant(card, draft = {}) {
  const variants = Array.isArray(card.variants) ? card.variants : []

  if (variants.length === 0) {
    return null
  }

  const providerVariantId = cleanPublicId(draft.providerVariantId ?? draft.provider_variant_id)
  const referenceVariantId = positiveInt(draft.referenceVariantId ?? draft.reference_variant_id)
  const exactProviderMatch = providerVariantId
    ? variants.find((variant) => cleanPublicId(variant?.provider_variant_id) === providerVariantId)
    : null
  const exactReferenceMatch = referenceVariantId
    ? variants.find((variant) => positiveInt(variant?.reference_variant_id) === referenceVariantId)
    : null
  const finish = cleanScryDexSearchText(draft.finish || draft.variant)
  const withImage = variants.find((variant) => cleanHttpUrl(variant?.front_image_url ?? variant?.image_url))
  const finishMatch = finish
    ? variants.find((variant) =>
        cleanScryDexSearchText([variant?.variant, variant?.finish, variant?.parallel_name].join(" ")).includes(finish),
      )
    : null

  return exactProviderMatch ?? exactReferenceMatch ?? finishMatch ?? withImage ?? variants[0]
}

function inventoryReferencePricePoint(card, draft = {}) {
  const points = Array.isArray(card.price_points) ? card.price_points : []

  if (points.length === 0) {
    return null
  }

  const condition = cleanCondition(draft.condition)
  const rawOrGraded = cleanRawOrGraded(draft.rawOrGraded)
  const gradingCompany = normalizedGradingCompanyText(draft.gradingCompany)
  const grade = cleanScryDexSearchText(draft.grade)
  const requestedGradeNumber = gradeNumber(grade)
  const selectedVariant = inventoryReferenceVariant(card, draft)
  const providerVariantId = cleanPublicId(draft.providerVariantId ?? draft.provider_variant_id ?? selectedVariant?.provider_variant_id)
  const referenceVariantId = positiveInt(draft.referenceVariantId ?? draft.reference_variant_id ?? selectedVariant?.reference_variant_id)
  const selectedVariantHasIdentity = Boolean(providerVariantId || referenceVariantId)
  const typedPoints = points.filter((point) => cleanRawOrGraded(point.raw_or_graded) === rawOrGraded)
  const typedUsdPoints = typedPoints.filter((point) => cleanCurrency(point.currency) === "USD")
  const usdPoints = points.filter((point) => cleanCurrency(point.currency) === "USD")
  const candidatePoints = typedUsdPoints.length > 0 ? typedUsdPoints : usdPoints

  if (candidatePoints.length === 0) {
    return null
  }

  const scored = candidatePoints
    .map((point) => {
      const pointProviderVariantId = cleanPublicId(point.provider_variant_id)
      const pointReferenceVariantId = positiveInt(point.reference_variant_id)
      const pointVariantHasIdentity = Boolean(pointProviderVariantId || pointReferenceVariantId)
      const variantMatches =
        (providerVariantId && pointProviderVariantId === providerVariantId) ||
        (referenceVariantId && pointReferenceVariantId === referenceVariantId)
      const pointCondition = cleanCondition(point.condition_code)
      const pointCompany = normalizedGradingCompanyText(point.grading_company)
      const pointGrade = cleanScryDexSearchText(point.grade)
      const pointGradeNumber = gradeNumber(point.grade)
      let score = 100
      let gradeGap = 99

      if (selectedVariantHasIdentity && pointVariantHasIdentity && !variantMatches) {
        return { point, score: -1, gradeGap }
      }

      if (rawOrGraded !== "graded" && condition && pointCondition && pointCondition !== condition) {
        return { point, score: -1, gradeGap }
      }

      if (providerVariantId && pointProviderVariantId === providerVariantId) {
        score += 80
      }

      if (referenceVariantId && pointReferenceVariantId === referenceVariantId) {
        score += 80
      }

      if (condition && pointCondition === condition) {
        score += 50
      } else if (!pointCondition) {
        score += 8
      }

      if (rawOrGraded !== "graded") {
        return { point, score, gradeGap }
      }

      if (gradingCompany && pointCompany && pointCompany !== gradingCompany) {
        return { point, score: -1, gradeGap }
      }

      if (gradingCompany && pointCompany === gradingCompany) {
        score += 50
      } else if (!pointCompany) {
        score += 8
      }

      if (grade && pointGrade === grade) {
        gradeGap = 0
        score += 80
      } else if (requestedGradeNumber !== null && pointGradeNumber !== null) {
        if (pointGradeNumber < requestedGradeNumber) {
          return { point, score: -1, gradeGap }
        }

        gradeGap = pointGradeNumber - requestedGradeNumber
        score += Math.max(4, 60 - Math.round(gradeGap * 20))
      } else if (grade && pointGrade) {
        return { point, score: -1, gradeGap }
      } else if (!pointGrade) {
        score += 8
      }

      return { point, score, gradeGap }
    })
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => (left.gradeGap ?? 999) - (right.gradeGap ?? 999) || right.score - left.score)

  return scored[0]?.point ?? null
}

function normalizedGradingCompanyText(value) {
  const text = cleanScryDexSearchText(value)

  if (text.includes("psa")) {
    return "psa"
  }

  if (text.includes("cgc")) {
    return "cgc"
  }

  if (text.includes("bgs") || text.includes("beckett")) {
    return "bgs"
  }

  if (text.includes("sgc")) {
    return "sgc"
  }

  if (text.includes("tag")) {
    return "tag"
  }

  return text
}

function genericInventorySetName(value) {
  const normalized = cleanScryDexSearchText(value)

  return !normalized ||
    normalized.includes("singles") ||
    normalized.includes("square category") ||
    normalized.includes("manual intake") ||
    normalized === "pokemon" ||
    normalized === "magic the gathering" ||
    normalized === "one piece" ||
    normalized === "mtg"
}

function minorUnits(value) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

function gradeNumber(value) {
  const match = cleanScryDexSearchText(value).match(/\b(?:10(?:\.0)?|[1-9](?:\.\d)?)\b/)
  const parsed = Number.parseFloat(match?.[0] ?? "")

  return Number.isFinite(parsed) ? parsed : null
}

function roundSalePriceMinorUnits(value) {
  const safeValue = Math.max(0, minorUnits(value))

  if (safeValue <= 100 || safeValue % 100 === 0) {
    return safeValue
  }

  return Math.ceil(safeValue / 100) * 100
}

function minorUnitsFromDecimal(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""))

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0
}

function formatMoney(minorUnitsValue, currency) {
  return new Intl.NumberFormat("en-US", {
    currency: safeCurrency(currency),
    style: "currency",
  }).format(Math.max(0, minorUnits(minorUnitsValue)) / 100)
}

function safeCurrency(value) {
  const currency = String(value ?? "").trim().toUpperCase()

  return /^[A-Z]{3}$/.test(currency) ? currency : "USD"
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(String(value ?? ""))
  } catch {
    return fallback
  }
}

function cleanGradedValuationQuery(input = {}) {
  return {
    provider_card_id: cleanPublicId(input.provider_card_id ?? input.providerCardId),
    provider_variant_id: cleanPublicId(input.provider_variant_id ?? input.providerVariantId),
    reference_variant_id: positiveInt(input.reference_variant_id ?? input.referenceVariantId),
    game: cleanGame(input.game),
    card_name: cleanName(input.card_name ?? input.cardName),
    set_name: cleanName(input.set_name ?? input.setName),
    set_code: cleanName(input.set_code ?? input.setCode).toUpperCase(),
    card_number: cleanName(input.card_number ?? input.cardNumber),
    printed_number: cleanName(input.printed_number ?? input.printedNumber),
    variant: cleanName(input.variant),
    finish: cleanName(input.finish),
    grading_company: cleanName(input.grading_company ?? input.gradingCompany),
    grade: cleanName(input.grade).replace(/^grade\s+/i, ""),
    source_priority: "pricecharting_primary_scrydex_fallback",
  }
}

function gradedValuationCacheKey(query = {}) {
  return createHash("sha256")
    .update(JSON.stringify({
      provider_card_id: cleanPublicId(query.provider_card_id),
      provider_variant_id: cleanPublicId(query.provider_variant_id),
      reference_variant_id: positiveInt(query.reference_variant_id),
      game: cleanGame(query.game),
      card_name: normalizeCacheText(query.card_name),
      set_name: normalizeCacheText(query.set_name),
      set_code: normalizeCacheText(query.set_code),
      card_number: normalizeCacheText(query.card_number),
      printed_number: normalizeCacheText(query.printed_number),
      grading_company: normalizeCacheText(query.grading_company),
      grade: normalizeCacheText(query.grade),
    }))
    .digest("hex")
}

function normalizeCacheText(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeGradedValuationLookupResult(result = {}, now) {
  return {
    valuation: normalizeGradedValuation(result?.valuation, now),
    provider_statuses: cleanGradedProviderStatuses(result?.providers ?? result?.provider_statuses ?? []),
  }
}

function normalizeGradedValuation(value, now) {
  if (!value || typeof value !== "object") {
    return null
  }

  const marketPriceMinorUnits = minorUnits(value.market_price_minor_units ?? value.marketPriceMinorUnits)

  if (marketPriceMinorUnits <= 0) {
    return null
  }

  return {
    provider: cleanGradedPricingProvider(value.provider),
    provider_product_id: cleanExternalId(value.provider_product_id ?? value.providerProductId),
    provider_product_name: cleanName(value.provider_product_name ?? value.providerProductName),
    provider_product_url: cleanHttpUrl(value.provider_product_url ?? value.providerProductUrl),
    grading_company: cleanName(value.grading_company ?? value.gradingCompany),
    grade: cleanName(value.grade).replace(/^grade\s+/i, ""),
    market_price_minor_units: marketPriceMinorUnits,
    currency: cleanCurrency(value.currency),
    source_label: cleanName(value.source_label ?? value.sourceLabel) || "PriceCharting graded market",
    source_detail: cleanName(value.source_detail ?? value.sourceDetail),
    confidence_score: boundedInt(value.confidence_score ?? value.confidenceScore, 0, 100, 70),
    observed_at_utc: cleanIsoTimestamp(value.observed_at_utc ?? value.observedAtUtc) || now().toISOString(),
    fetched_at_utc: cleanIsoTimestamp(value.fetched_at_utc ?? value.fetchedAtUtc) || now().toISOString(),
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

function cleanGradedProviderStatuses(value) {
  const statuses = Array.isArray(value) ? value : []

  return statuses
    .filter((status) => status && typeof status === "object")
    .map((status) => ({
      provider: cleanGradedPricingProvider(status.provider),
      configured: Boolean(status.configured),
      status: cleanName(status.status) || "unknown",
      detail: cleanName(status.detail),
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }))
    .slice(0, 8)
}

function cleanGradedPricingProvider(value) {
  const provider = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_")

  return provider || "unknown"
}

function boundedInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value), 10)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

function findPugLanInstallRoot() {
  const envRoot = process.env.PUG_LAN_SERVER_INSTALL_ROOT || process.env.LOCAL_SYNC_INSTALL_ROOT

  if (envRoot) {
    return envRoot
  }

  if (process.platform === "win32") {
    return "C:\\PugGameShop\\LANServer"
  }

  return resolve(dirname(DEFAULT_LOCAL_SYNC_DATABASE_PATH), "..")
}

function timestampForFile(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}

function fileSizeBytes(path) {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

function cleanSha256(value) {
  const hash = String(value ?? "").trim().toLowerCase()

  return /^[a-f0-9]{64}$/.test(hash) ? hash : ""
}

function sqliteStringLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function pragmaInteger(database, name) {
  const value = pragmaValue(database, name)
  const parsed = Number.parseInt(String(value ?? "0"), 10)

  return Number.isFinite(parsed) ? parsed : 0
}

function pragmaValue(database, name) {
  const allowed = new Set(["page_count", "page_size", "freelist_count", "journal_mode", "synchronous"])

  if (!allowed.has(name)) {
    return null
  }

  try {
    const row = database.prepare(`PRAGMA ${name}`).get()
    const values = Object.values(row ?? {})

    return values[0] ?? null
  } catch {
    return null
  }
}

function powerShellStringLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function tailForMaintenance(value, maxLength = 500) {
  const text = String(value ?? "").trim()

  return text.length > maxLength ? text.slice(-maxLength) : text
}

function restartScriptSource({ delaySeconds, installRoot, port, processId }) {
  const safeDelay = Math.max(1, Math.min(60, Number.parseInt(String(delaySeconds ?? 2), 10) || 2))

  return [
    "$ErrorActionPreference = 'SilentlyContinue'",
    `Start-Sleep -Seconds ${safeDelay}`,
    `$installRoot = ${powerShellStringLiteral(installRoot)}`,
    `$port = ${Math.max(1, Math.min(65535, Number.parseInt(String(port ?? 8787), 10) || 8787))}`,
    `$currentPid = ${Math.max(0, Number.parseInt(String(processId ?? 0), 10) || 0)}`,
    "try { Stop-ScheduledTask -TaskName 'Pug LAN Server' } catch {}",
    "try {",
    "  $connections = Get-NetTCPConnection -LocalPort $port -State Listen",
    "  foreach ($connection in $connections) {",
    "    if ($connection.OwningProcess -and $connection.OwningProcess -ne $PID) {",
    "      Stop-Process -Id $connection.OwningProcess -Force",
    "    }",
    "  }",
    "} catch {}",
    "if ($currentPid -gt 0 -and $currentPid -ne $PID) { try { Stop-Process -Id $currentPid -Force } catch {} }",
    "$hiddenStart = Join-Path $installRoot 'Start-Pug-LAN-Server-Hidden.vbs'",
    "$visibleStart = Join-Path $installRoot 'Start-Pug-LAN-Server.ps1'",
    "if (Test-Path -LiteralPath $hiddenStart) {",
    "  Start-Process -FilePath 'wscript.exe' -ArgumentList \"`\"$hiddenStart`\"\" -WindowStyle Hidden",
    "} elseif (Test-Path -LiteralPath $visibleStart) {",
    "  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',\"`\"$visibleStart`\"\") -WindowStyle Hidden",
    "}",
    "",
  ].join("\r\n")
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

function localReportKey(value) {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "")

  return [
    "customers",
    "sales",
    "inventory",
    "trade_ins",
    "fulfillment",
    "scrydex",
    "square_reconciliation",
    "audit",
  ].includes(key)
    ? key
    : "inventory"
}
