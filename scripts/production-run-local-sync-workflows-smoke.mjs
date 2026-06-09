import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import { Client } from "ssh2"

import { STAGING_SSH_ALGORITHMS } from "./lib/staging-ssh.mjs"
import { loadLocalEnv } from "./lib/local-env.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
loadLocalEnv([
  resolve(root, ".env.production.local"),
  resolve(root, ".env.local-sync"),
  resolve(root, ".env.local"),
])

const dryRun = process.argv.includes("--dry-run")
const confirmValue = "run-production-local-sync-workflows-smoke"
const localSyncServerUrl = normalizeBaseUrl(
  firstEnv("LOCAL_SYNC_SERVER_URL", "PUG_LOCAL_SYNC_PUBLIC_URL") ?? "http://127.0.0.1:8787",
)
const remoteUploadDir = normalizeRemoteDir(process.env.PUG_PROD_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteRunnerPath = `${remoteUploadDir}/local-sync-production-workflows-smoke-${timestampForRemoteName(
  new Date(),
)}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const managerPin = firstEnv("LOCAL_SYNC_MANAGER_PIN", "PUG_LOCAL_SYNC_MANAGER_PIN") ?? "1420"
const localDatabasePath = resolve(
  root,
  firstEnv("LOCAL_SYNC_SQLITE_PATH", "PUG_LOCAL_SYNC_DB") ?? "apps/local-sync-server/store-sync.sqlite",
)
const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

const smoke = buildSmokePayload()
const cleanupSummary = {
  attempted: false,
  wordpress: null,
  local: null,
}
let smokeResult = null

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_local_sync_workflows_smoke_dry_run",
        localSyncServerUrl,
        remoteRunnerPath,
        wpPath,
        wpCli,
        smokeId: smoke.id,
        createsTemporaryWordPressEvent: true,
        createsHiddenInventory: true,
        createsTemporaryCustomerCredit: true,
        createsKioskReservation: true,
        createsEventRegistrationAndCheckin: true,
        cleansWordPressRowsBySmokeId: true,
        cleansLocalRowsBySmokeId: true,
        productionApprovalRequired: true,
        credentialsPrinted: false,
        rawResponsePrinted: false,
        readsIgnoredEnvFiles: [".env.production.local", ".env.local-sync", ".env.local"],
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_LOCAL_SYNC_WORKFLOWS_SMOKE",
        ],
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing production local sync workflows smoke environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_LOCAL_SYNC_WORKFLOWS_SMOKE !== confirmValue) {
  throw new Error(
    `Set PUG_PROD_CONFIRM_LOCAL_SYNC_WORKFLOWS_SMOKE=${confirmValue} to run the production local sync workflows smoke.`,
  )
}

if (!localSyncServerUrl) {
  throw new Error("Local sync server URL is required.")
}

try {
  const preparedWordPress = await prepareWordPressSmoke(smoke)
  const auth = await localSyncRequest("/auth/pin", {
    method: "POST",
    body: {
      pin: managerPin,
      ttlMinutes: 30,
    },
  })

  if (auth.status !== "ok" || !auth.session?.token) {
    throw new Error(`Local sync PIN auth failed: ${auth.code ?? auth.status}`)
  }

  const token = auth.session.token
  const eventPull = await localSyncRequest("/sync/pull", {
    method: "POST",
    token,
    body: {
      domain: "events",
      page: 1,
      page_size: 100,
    },
  })
  const pulledEvent = findEventBySlug(eventPull.events, smoke.eventSlug)

  if (!pulledEvent) {
    throw new Error("Temporary production event did not pull into the LAN event cache.")
  }

  const eventRegistration = await localSyncRequest("/events/registrations", {
    method: "POST",
    token,
    body: {
      event_id: pulledEvent.event_id,
      attendee_label: smoke.eventAttendeeLabel,
      payment_status: "pay_at_store",
    },
  })

  if (eventRegistration.status !== "ok") {
    throw new Error(`Local event registration queue failed: ${eventRegistration.code ?? eventRegistration.status}`)
  }

  const eventRegistrationPush = await localSyncRequest("/sync/push", {
    method: "POST",
    token,
    body: {},
  })
  const acceptedRegistration = findAccepted(eventRegistrationPush.results, "event_registration")
  const registrationPublicId = acceptedRegistration?.wordpress_registration?.public_id ?? ""

  if (!acceptedRegistration || !registrationPublicId) {
    throw new Error("Event registration was not accepted by WordPress.")
  }

  const eventCheckin = await localSyncRequest("/events/check-ins", {
    method: "POST",
    token,
    body: {
      event_id: pulledEvent.event_id,
      attendee_label: smoke.eventAttendeeLabel,
      registration_public_id: registrationPublicId,
      checkin_method: "manual_lookup",
    },
  })

  if (eventCheckin.status !== "ok") {
    throw new Error(`Local event check-in queue failed: ${eventCheckin.code ?? eventCheckin.status}`)
  }

  const eventCheckinPush = await localSyncRequest("/sync/push", {
    method: "POST",
    token,
    body: {},
  })
  const acceptedCheckin = findAccepted(eventCheckinPush.results, "event_checkin")

  const customer = await localSyncRequest("/customers", {
    method: "POST",
    token,
    body: {
      first_name: "Codex",
      last_name: `Smoke ${smoke.id}`,
      email: smoke.customerEmail,
    },
  })

  if (customer.status !== "ok" || !customer.customer?.customer_public_id) {
    throw new Error(`Local customer create failed: ${customer.code ?? customer.status}`)
  }

  const creditAdjustment = await localSyncRequest("/credit/adjustments", {
    method: "POST",
    token,
    body: {
      customer_public_id: customer.customer.customer_public_id,
      amount_minor_units: 2500,
      reason: `Codex production smoke credit add ${smoke.id}`,
    },
  })

  if (creditAdjustment.status !== "ok") {
    throw new Error(`Local credit adjustment failed: ${creditAdjustment.code ?? creditAdjustment.status}`)
  }

  const creditRedemption = await localSyncRequest("/credit/redemptions", {
    method: "POST",
    token,
    body: {
      customer_public_id: customer.customer.customer_public_id,
      amount_minor_units: 500,
      sale_total_minor_units: 3000,
      square_receipt_reference: `SQ-CODEX-WORKFLOW-${smoke.id}`,
      square_cashier_confirmed: true,
      reason: `Codex production smoke credit redemption ${smoke.id}`,
    },
  })

  if (creditRedemption.status !== "ok") {
    throw new Error(`Local credit redemption failed: ${creditRedemption.code ?? creditRedemption.status}`)
  }

  const customerCreditPush = await localSyncRequest("/sync/push", {
    method: "POST",
    token,
    body: {},
  })
  const acceptedCustomer = findAccepted(customerCreditPush.results, "customer_upsert")
  const acceptedCreditCount = (customerCreditPush.results ?? []).filter(
    (result) =>
      ["credit_adjustment", "credit_redemption"].includes(result.operation_type) && result.status === "accepted",
  ).length

  const hiddenIntake = await localSyncRequest("/inventory/intake", {
    method: "POST",
    token,
    body: {
      card_name: smoke.cardName,
      set_name: "Codex Production Workflow Smoke",
      condition: "RAW",
      barcode: smoke.barcode,
      price_minor_units: 321,
      location: "Production Workflow Smoke Hidden",
      quantity: 1,
      provider_card_id: "codex-local-sync-workflows-smoke",
      game: "pokemon",
      set_code: "SMOKE",
      card_number: "002",
      printed_number: "002/002",
      image_url: "https://images.scrydex.com/pokemon/mcd24-1/large",
      online_visibility: "hidden",
      kiosk_visibility: "hidden",
      pos_visibility: "hidden",
    },
  })

  if (hiddenIntake.status !== "ok" || !hiddenIntake.item?.public_id) {
    throw new Error(`Local hidden inventory intake failed: ${hiddenIntake.code ?? hiddenIntake.status}`)
  }

  const kioskIntake = await localSyncRequest("/inventory/intake", {
    method: "POST",
    token,
    body: {
      card_name: smoke.kioskCardName,
      set_name: "Codex Production Workflow Smoke",
      condition: "RAW",
      barcode: smoke.kioskBarcode,
      price_minor_units: 321,
      location: "Production Workflow Smoke Kiosk",
      quantity: 1,
      provider_card_id: "codex-local-sync-workflows-kiosk-smoke",
      game: "pokemon",
      set_code: "SMOKE",
      card_number: "003",
      printed_number: "003/003",
      image_url: "https://images.scrydex.com/pokemon/mcd24-1/large",
      online_visibility: "hidden",
      kiosk_visibility: "visible",
      pos_visibility: "hidden",
    },
  })

  if (kioskIntake.status !== "ok" || !kioskIntake.item?.public_id) {
    throw new Error(`Local kiosk inventory intake failed: ${kioskIntake.code ?? kioskIntake.status}`)
  }

  const inventoryPush = await localSyncRequest("/sync/push", {
    method: "POST",
    token,
    body: {},
  })
  const acceptedInventory = findAccepted(inventoryPush.results, "inventory_intake", hiddenIntake.item.public_id)
  const acceptedKioskInventory = findAccepted(inventoryPush.results, "inventory_intake", kioskIntake.item.public_id)

  if (!acceptedInventory || !acceptedKioskInventory) {
    throw new Error("Workflow inventory intakes were not accepted by WordPress.")
  }

  const kioskOrder = await localSyncRequest("/kiosk/orders", {
    method: "POST",
    body: {
      first_name: "Codex",
      last_name: `Smoke${smoke.id}`,
      inventory_public_ids: [kioskIntake.item.public_id],
    },
  })

  if (kioskOrder.status !== "ok") {
    throw new Error(`Local kiosk order failed: ${kioskOrder.code ?? kioskOrder.status}`)
  }

  const kioskPush = await localSyncRequest("/sync/push", {
    method: "POST",
    token,
    body: {},
  })
  const acceptedKiosk = findAccepted(kioskPush.results, "kiosk_order")

  smokeResult = {
    action: "production_local_sync_workflows_smoke",
    status: "ok",
    preparedWordPress,
    checks: buildChecks({
      preparedWordPress,
      eventPull,
      pulledEvent,
      acceptedRegistration,
      acceptedCheckin,
      acceptedCustomer,
      acceptedCreditCount,
      acceptedInventory,
      acceptedKioskInventory,
      acceptedKiosk,
    }),
    summary: {
      eventSlug: smoke.eventSlug,
      eventPulledCount: Number(eventPull.events_pulled_count ?? 0),
      eventAppliedCount: Number(eventPull.events_applied_count ?? 0),
      customerAccepted: Boolean(acceptedCustomer),
      creditAcceptedCount: acceptedCreditCount,
      customerCreditPushResults: sanitizedPushResults(customerCreditPush.results),
      inventoryAccepted: Boolean(acceptedInventory),
      kioskInventoryAccepted: Boolean(acceptedKioskInventory),
      kioskAccepted: Boolean(acceptedKiosk),
      queueDepthAfterKiosk: Number(kioskPush.local_queue_depth ?? 0),
      credentialsPrinted: false,
    },
    cleanup: cleanupSummary,
    productionApprovalRequired: true,
    credentialsPrinted: false,
    rawResponsePrinted: false,
  }
} finally {
  cleanupSummary.attempted = true
  cleanupSummary.wordpress = await cleanupWordPressSmoke(smoke)
  cleanupSummary.local = cleanupLocalSmoke(smoke)
}

if (smokeResult) {
  smokeResult.cleanup = cleanupSummary
  smokeResult.checks.push(
    {
      name: "wordpress_cleanup_deleted_temp_event",
      pass: Number(cleanupSummary.wordpress?.eventRowsDeleted ?? 0) >= 1,
      expected: ">=1",
      actual: cleanupSummary.wordpress?.eventRowsDeleted ?? null,
    },
    {
      name: "wordpress_cleanup_deleted_customer",
      pass: Number(cleanupSummary.wordpress?.customerRowsDeleted ?? 0) >= 1,
      expected: ">=1",
      actual: cleanupSummary.wordpress?.customerRowsDeleted ?? null,
    },
    {
      name: "wordpress_cleanup_deleted_inventory",
      pass: Number(cleanupSummary.wordpress?.inventoryRowsDeleted ?? 0) >= 2,
      expected: ">=2",
      actual: cleanupSummary.wordpress?.inventoryRowsDeleted ?? null,
    },
  )
  smokeResult.passed = smokeResult.status === "ok" && smokeResult.checks.every((check) => check.pass)
  console.log(JSON.stringify(smokeResult, null, 2))

  if (!smokeResult.passed) {
    process.exitCode = 1
  }
}

function buildSmokePayload() {
  const id = timestampForRemoteName(new Date()).replace(/[^0-9A-Z]/g, "")

  return {
    id,
    eventSlug: `codex-lsync-${id}`.toLowerCase(),
    eventTitle: `Codex Local Sync Smoke ${id}`,
    eventAttendeeLabel: `Codex Event Smoke ${id}`,
    customerEmail: `codex-lsync-${id.toLowerCase()}@example.invalid`,
    barcode: `CODEX-LSYNC-WF-${id}`.slice(0, 64),
    kioskBarcode: `CODEX-LSYNC-KIOSK-${id}`.slice(0, 64),
    cardName: "Codex Hidden Workflow Smoke",
    kioskCardName: "Codex Kiosk Workflow Smoke",
  }
}

async function localSyncRequest(path, options = {}) {
  const endpoint = new URL(path, `${localSyncServerUrl}/`)
  const headers = {
    accept: "application/json",
  }

  if (options.body !== undefined) {
    headers["content-type"] = "application/json"
  }

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`
  }

  const response = await fetch(endpoint, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const body = await safeJson(response)

  if (!response.ok && body?.status !== "blocked") {
    throw new Error(`Local sync request ${path} failed with HTTP ${response.status}`)
  }

  return body
}

async function prepareWordPressSmoke(smokePayload) {
  return withProductionConnection(async (connection) => {
    await writeRemoteFile(connection, remoteRunnerPath, wordpressRunnerSource())

    try {
      const execution = await execWithStdin(
        connection,
        `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
        JSON.stringify({
          mode: "prepare",
          smoke: smokePayload,
        }),
      )
      const parsed = parseJson(execution.stdout)

      if (execution.code !== 0 || parsed?.status !== "ok") {
        throw new Error(`WordPress smoke prepare failed: ${parsed?.message ?? tailForLog(execution.stderr)}`)
      }

      return {
        status: "ok",
        eventId: Number(parsed.event_id ?? 0),
        eventSlug: String(parsed.event_slug ?? ""),
        createdEvent: Boolean(parsed.created_event),
        credentialsPrinted: false,
        stderrTail: tailForLog(execution.stderr),
      }
    } finally {
      await exec(connection, `rm -f ${shellQuote(remoteRunnerPath)}`)
    }
  })
}

async function cleanupWordPressSmoke(smokePayload) {
  try {
    return await withProductionConnection(async (connection) => {
      await writeRemoteFile(connection, remoteRunnerPath, wordpressRunnerSource())

      try {
        const execution = await execWithStdin(
          connection,
          `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
          JSON.stringify({
            mode: "cleanup",
            smoke: smokePayload,
          }),
        )
        const parsed = parseJson(execution.stdout)

        return {
          status: parsed?.status ?? "unknown",
          exitCode: execution.code,
          eventRowsDeleted: Number(parsed?.event_rows_deleted ?? 0),
          eventRegistrationRowsDeleted: Number(parsed?.event_registration_rows_deleted ?? 0),
          eventCheckinRowsDeleted: Number(parsed?.event_checkin_rows_deleted ?? 0),
          eventLogRowsDeleted: Number(parsed?.event_log_rows_deleted ?? 0),
          customerRowsDeleted: Number(parsed?.customer_rows_deleted ?? 0),
          creditLedgerRowsDeleted: Number(parsed?.credit_ledger_rows_deleted ?? 0),
          inventoryRowsDeleted: Number(parsed?.inventory_rows_deleted ?? 0),
          reservationRowsDeleted: Number(parsed?.reservation_rows_deleted ?? 0),
          priceRowsDeleted: Number(parsed?.price_rows_deleted ?? 0),
          runnerRemoved: false,
          credentialsPrinted: false,
          stderrTail: tailForLog(execution.stderr),
        }
      } finally {
        await exec(connection, `rm -f ${shellQuote(remoteRunnerPath)}`)
      }
    }).then((result) => ({
      ...result,
      runnerRemoved: true,
    }))
  } catch (error) {
    return {
      status: "cleanup_failed",
      message: error instanceof Error ? error.message : "Unknown cleanup error.",
      credentialsPrinted: false,
    }
  }
}

function cleanupLocalSmoke(smokePayload) {
  if (!existsSync(localDatabasePath)) {
    return {
      status: "skipped",
      reason: "local_database_missing",
      localDatabasePath,
    }
  }

  let database

  try {
    database = new DatabaseSync(localDatabasePath)
    const like = `%${smokePayload.id}%`
    const customerRows = database.prepare("SELECT customer_public_id FROM customers WHERE email = ?").all(smokePayload.customerEmail)
    const customerPublicIds = customerRows.map((row) => String(row.customer_public_id ?? "")).filter(Boolean)
    let queueRowsDeleted = Number(database.prepare("DELETE FROM operation_queue WHERE payload_json LIKE ?").run(like).changes ?? 0)
    let creditLedgerRowsDeleted = 0

    for (const customerPublicId of customerPublicIds) {
      creditLedgerRowsDeleted += Number(
        database.prepare("DELETE FROM credit_ledger_entries WHERE customer_public_id = ?").run(customerPublicId).changes ??
          0,
      )
      queueRowsDeleted += Number(
        database.prepare("DELETE FROM operation_queue WHERE entity_id = ? OR payload_json LIKE ?").run(
          customerPublicId,
          `%${customerPublicId}%`,
        ).changes ?? 0,
      )
    }

    const customerRowsDeleted = Number(database.prepare("DELETE FROM customers WHERE email = ?").run(smokePayload.customerEmail).changes ?? 0)
    const inventoryBarcodes = [smokePayload.barcode, smokePayload.kioskBarcode].filter(Boolean)
    const inventoryRows = inventoryBarcodes.flatMap((barcode) =>
      database.prepare("SELECT public_id FROM inventory_items WHERE barcode = ?").all(barcode),
    )
    const inventoryPublicIds = inventoryRows.map((row) => String(row.public_id ?? "")).filter(Boolean)

    for (const publicId of inventoryPublicIds) {
      queueRowsDeleted += Number(
        database.prepare("DELETE FROM operation_queue WHERE entity_id = ? OR payload_json LIKE ?").run(publicId, `%${publicId}%`)
          .changes ?? 0,
      )
    }

    let inventoryRowsDeleted = 0
    for (const barcode of inventoryBarcodes) {
      inventoryRowsDeleted += Number(database.prepare("DELETE FROM inventory_items WHERE barcode = ?").run(barcode).changes ?? 0)
    }
    const kioskRowsDeleted = Number(
      database.prepare("DELETE FROM kiosk_orders WHERE first_name = ? AND last_name = ?").run("Codex", `Smoke${smokePayload.id}`)
        .changes ?? 0,
    )
    const eventRowsDeleted = Number(
      database.prepare("DELETE FROM event_snapshots WHERE slug = ?").run(smokePayload.eventSlug).changes ?? 0,
    )

    return {
      status: "ok",
      queueRowsDeleted,
      creditLedgerRowsDeleted,
      customerRowsDeleted,
      inventoryRowsDeleted,
      kioskRowsDeleted,
      eventRowsDeleted,
      serverRestartRecommended:
        customerRowsDeleted > 0 || inventoryRowsDeleted > 0 || kioskRowsDeleted > 0 || eventRowsDeleted > 0,
    }
  } catch (error) {
    return {
      status: "cleanup_failed",
      message: error instanceof Error ? error.message : "Unknown local cleanup error.",
    }
  } finally {
    database?.close()
  }
}

function findEventBySlug(events, slug) {
  return (Array.isArray(events) ? events : []).find((event) => event?.slug === slug) ?? null
}

function findAccepted(results, operationType, entityId = null) {
  return (Array.isArray(results) ? results : []).find(
    (result) =>
      result?.operation_type === operationType &&
      result?.status === "accepted" &&
      (null === entityId || String(result?.entity_id ?? "") === String(entityId)),
  )
}

function sanitizedPushResults(results) {
  return (Array.isArray(results) ? results : []).map((result) => ({
    operation_type: String(result?.operation_type ?? ""),
    status: String(result?.status ?? ""),
    code: String(result?.code ?? ""),
    wordpress_code: String(result?.wordpress_code ?? ""),
    http_status: Number(result?.http_status ?? 0),
  }))
}

function buildChecks({
  preparedWordPress,
  eventPull,
  pulledEvent,
  acceptedRegistration,
  acceptedCheckin,
  acceptedCustomer,
  acceptedCreditCount,
  acceptedInventory,
  acceptedKioskInventory,
  acceptedKiosk,
}) {
  return [
    {
      name: "wordpress_temp_event_prepared",
      pass: preparedWordPress?.status === "ok" && preparedWordPress?.eventSlug === smoke.eventSlug,
      expected: smoke.eventSlug,
      actual: preparedWordPress?.eventSlug ?? null,
    },
    {
      name: "local_sync_event_pull_connected",
      pass: eventPull?.wordpress_events_pull_connected === true,
      expected: true,
      actual: eventPull?.wordpress_events_pull_connected ?? null,
    },
    {
      name: "local_sync_event_pulled",
      pass: Boolean(pulledEvent),
      expected: true,
      actual: Boolean(pulledEvent),
    },
    {
      name: "event_registration_accepted",
      pass: Boolean(acceptedRegistration),
      expected: true,
      actual: Boolean(acceptedRegistration),
    },
    {
      name: "event_checkin_accepted",
      pass: Boolean(acceptedCheckin),
      expected: true,
      actual: Boolean(acceptedCheckin),
    },
    {
      name: "customer_accepted",
      pass: Boolean(acceptedCustomer),
      expected: true,
      actual: Boolean(acceptedCustomer),
    },
    {
      name: "credit_add_and_redemption_accepted",
      pass: acceptedCreditCount === 2,
      expected: 2,
      actual: acceptedCreditCount,
    },
    {
      name: "hidden_inventory_accepted",
      pass: Boolean(acceptedInventory),
      expected: true,
      actual: Boolean(acceptedInventory),
    },
    {
      name: "kiosk_inventory_accepted",
      pass: Boolean(acceptedKioskInventory),
      expected: true,
      actual: Boolean(acceptedKioskInventory),
    },
    {
      name: "kiosk_order_accepted",
      pass: Boolean(acceptedKiosk),
      expected: true,
      actual: Boolean(acceptedKiosk),
    },
  ]
}

function wordpressRunnerSource() {
  return `<?php
$payload = json_decode(stream_get_contents(STDIN), true);
if (!is_array($payload)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'invalid_payload'));
	exit(1);
}
global $wpdb;
if (!$wpdb instanceof wpdb) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'wpdb_required'));
	exit(1);
}
$mode = (string) ($payload['mode'] ?? '');
$smoke = is_array($payload['smoke'] ?? null) ? $payload['smoke'] : array();
$id = strtoupper(trim((string) ($smoke['id'] ?? '')));
$slug = strtolower(trim((string) ($smoke['eventSlug'] ?? '')));
$title = trim((string) ($smoke['eventTitle'] ?? ''));
$email = strtolower(trim((string) ($smoke['customerEmail'] ?? '')));
$barcode = strtoupper(trim((string) ($smoke['barcode'] ?? '')));
$kiosk_barcode = strtoupper(trim((string) ($smoke['kioskBarcode'] ?? '')));
$card_name = trim((string) ($smoke['cardName'] ?? ''));
$kiosk_card_name = trim((string) ($smoke['kioskCardName'] ?? ''));
if (
	!preg_match('/^[0-9A-Z]{8,64}$/', $id) ||
	!preg_match('/^codex-lsync-[a-z0-9]{8,64}$/', $slug) ||
	'' === $title ||
	!is_email($email) ||
	!preg_match('/^CODEX-LSYNC-WF-[A-Z0-9]{8,64}$/', $barcode) ||
	!preg_match('/^CODEX-LSYNC-KIOSK-[A-Z0-9]{8,64}$/', $kiosk_barcode)
) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'smoke_payload_invalid'));
	exit(1);
}
$tables = array(
	'events' => $wpdb->prefix . 'tcg_events',
	'registrations' => $wpdb->prefix . 'tcg_event_registrations',
	'event_logs' => $wpdb->prefix . 'tcg_event_registration_logs',
	'waitlist' => $wpdb->prefix . 'tcg_event_waitlist',
	'checkins' => $wpdb->prefix . 'tcg_event_checkins',
	'customers' => $wpdb->prefix . 'tcg_customers',
	'ledger' => $wpdb->prefix . 'tcg_customer_credit_ledger',
	'inventory' => $wpdb->prefix . 'tcg_inventory_items',
	'reservations' => $wpdb->prefix . 'tcg_reservations',
	'price_log' => $wpdb->prefix . 'tcg_price_change_log',
);
if ('prepare' === $mode) {
	$existing = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$tables['events']} WHERE slug = %s LIMIT 1", $slug), ARRAY_A);
	if (is_array($existing) && $title !== (string) ($existing['title'] ?? '')) {
		echo wp_json_encode(array('status' => 'error', 'message' => 'event_slug_collision'));
		exit(1);
	}
	if (!is_array($existing)) {
		$now = gmdate('Y-m-d H:i:s');
		$inserted = $wpdb->insert(
			$tables['events'],
			array(
				'public_id' => wp_generate_uuid4(),
				'title' => $title,
				'slug' => $slug,
				'event_type' => 'codex_smoke',
				'game' => 'pokemon',
				'format' => 'workflow smoke',
				'rules_level' => 'casual',
				'start_datetime' => gmdate('Y-m-d H:i:s', time() + 7 * DAY_IN_SECONDS),
				'end_datetime' => gmdate('Y-m-d H:i:s', time() + 7 * DAY_IN_SECONDS + 2 * HOUR_IN_SECONDS),
				'timezone' => 'America/New_York',
				'entry_fee' => '0.0000',
				'currency' => 'USD',
				'player_cap' => 8,
				'registered_count' => 0,
				'waitlist_enabled' => 0,
				'registration_status' => 'open',
				'registration_mode' => 'local_only',
				'public_visibility' => 'published',
				'featured_event' => 0,
				'allow_store_credit_payment' => 1,
				'allow_pay_at_store' => 1,
				'offline_reservation_enabled' => 1,
				'description' => 'Temporary Codex production workflow smoke event. Safe to delete.',
				'created_at' => $now,
				'updated_at' => $now,
				'row_version' => 1,
			),
			array('%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%s','%d','%d','%d','%s','%s','%s','%d','%d','%d','%d','%s','%s','%s','%d')
		);
		if (false === $inserted) {
			echo wp_json_encode(array('status' => 'error', 'message' => 'event_insert_failed'));
			exit(1);
		}
		$existing = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$tables['events']} WHERE event_id = %d LIMIT 1", (int) $wpdb->insert_id), ARRAY_A);
	}
	echo wp_json_encode(array(
		'status' => 'ok',
		'event_id' => (int) ($existing['event_id'] ?? 0),
		'event_slug' => (string) ($existing['slug'] ?? ''),
		'created_event' => true,
		'credentialsPrinted' => false,
	));
	exit(0);
}
if ('cleanup' !== $mode) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'mode_invalid'));
	exit(1);
}
$event_ids = array_map('intval', (array) $wpdb->get_col($wpdb->prepare("SELECT event_id FROM {$tables['events']} WHERE slug = %s AND title = %s", $slug, $title)));
$registration_ids = array();
if (!empty($event_ids)) {
	$placeholders = implode(',', array_fill(0, count($event_ids), '%d'));
	$registration_ids = array_map('intval', (array) $wpdb->get_col($wpdb->prepare("SELECT registration_id FROM {$tables['registrations']} WHERE event_id IN ({$placeholders})", $event_ids)));
}
$event_checkin_rows_deleted = 0;
$event_log_rows_deleted = 0;
$event_waitlist_rows_deleted = 0;
$event_registration_rows_deleted = 0;
$event_rows_deleted = 0;
if (!empty($registration_ids)) {
	$registration_placeholders = implode(',', array_fill(0, count($registration_ids), '%d'));
	$event_checkin_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tables['checkins']} WHERE registration_id IN ({$registration_placeholders})", $registration_ids));
	$event_waitlist_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tables['waitlist']} WHERE registration_id IN ({$registration_placeholders})", $registration_ids));
}
if (!empty($event_ids)) {
	$event_placeholders = implode(',', array_fill(0, count($event_ids), '%d'));
	$event_log_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tables['event_logs']} WHERE event_id IN ({$event_placeholders})", $event_ids));
	$event_registration_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tables['registrations']} WHERE event_id IN ({$event_placeholders})", $event_ids));
	$event_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tables['events']} WHERE event_id IN ({$event_placeholders})", $event_ids));
}
$customer_ids = array_map('intval', (array) $wpdb->get_col($wpdb->prepare("SELECT customer_id FROM {$tables['customers']} WHERE normalized_email = %s", $email)));
$credit_ledger_rows_deleted = 0;
$customer_rows_deleted = 0;
if (!empty($customer_ids)) {
	$customer_placeholders = implode(',', array_fill(0, count($customer_ids), '%d'));
	$credit_ledger_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tables['ledger']} WHERE customer_id IN ({$customer_placeholders})", $customer_ids));
	$customer_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tables['customers']} WHERE customer_id IN ({$customer_placeholders})", $customer_ids));
}
$inventory_rows = (array) $wpdb->get_results(
	$wpdb->prepare(
		"SELECT inventory_id, card_name, barcode, sku FROM {$tables['inventory']} WHERE barcode IN (%s, %s) OR sku IN (%s, %s)",
		array($barcode, $kiosk_barcode, $barcode, $kiosk_barcode)
	),
	ARRAY_A
);
$inventory_ids = array();
$expected_inventory_names = array(
	$barcode => $card_name,
	$kiosk_barcode => $kiosk_card_name,
);
foreach ($inventory_rows as $row) {
	$row_barcode = strtoupper((string) ($row['barcode'] ?? ''));
	$row_sku = strtoupper((string) ($row['sku'] ?? ''));
	$expected_name = $expected_inventory_names[$row_barcode] ?? $expected_inventory_names[$row_sku] ?? '';
	if ($expected_name === (string) ($row['card_name'] ?? '')) {
		$inventory_ids[] = (int) ($row['inventory_id'] ?? 0);
	}
}
$inventory_ids = array_values(array_filter($inventory_ids));
$reservation_rows_deleted = 0;
$price_rows_deleted = 0;
$inventory_rows_deleted = 0;
if (!empty($inventory_ids)) {
	$inventory_placeholders = implode(',', array_fill(0, count($inventory_ids), '%d'));
	$reservation_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tables['reservations']} WHERE inventory_id IN ({$inventory_placeholders}) OR active_inventory_id IN ({$inventory_placeholders})", array_merge($inventory_ids, $inventory_ids)));
	$price_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tables['price_log']} WHERE inventory_id IN ({$inventory_placeholders})", $inventory_ids));
	$inventory_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$tables['inventory']} WHERE inventory_id IN ({$inventory_placeholders})", $inventory_ids));
}
echo wp_json_encode(array(
	'action' => 'production_local_sync_workflows_smoke_cleanup',
	'status' => 'ok',
	'event_rows_deleted' => $event_rows_deleted,
	'event_registration_rows_deleted' => $event_registration_rows_deleted,
	'event_checkin_rows_deleted' => $event_checkin_rows_deleted,
	'event_log_rows_deleted' => $event_log_rows_deleted,
	'event_waitlist_rows_deleted' => $event_waitlist_rows_deleted,
	'customer_rows_deleted' => $customer_rows_deleted,
	'credit_ledger_rows_deleted' => $credit_ledger_rows_deleted,
	'inventory_rows_deleted' => $inventory_rows_deleted,
	'reservation_rows_deleted' => $reservation_rows_deleted,
	'price_rows_deleted' => $price_rows_deleted,
	'credentialsPrinted' => false,
));
`
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function withProductionConnection(callback) {
  const connection = new Client()

  return new Promise((resolveResult, reject) => {
    connection
      .on("ready", async () => {
        try {
          resolveResult(await callback(connection))
        } catch (error) {
          reject(error)
        } finally {
          connection.end()
        }
      })
      .on("error", reject)
      .connect(productionSshConnectConfig(requiredEnv))
  })
}

function productionSshConnectConfig(env, options = {}) {
  const readyTimeout = Number.parseInt(String(process.env.PUG_PROD_SSH_READY_TIMEOUT_MS ?? "60000"), 10)

  return {
    host: env.PUG_PROD_SSH_HOST,
    username: env.PUG_PROD_SSH_USER,
    password: env.PUG_PROD_SSH_PASSWORD,
    readyTimeout: options.readyTimeout ?? (Number.isFinite(readyTimeout) ? readyTimeout : 60000),
    algorithms: STAGING_SSH_ALGORITHMS,
  }
}

function writeRemoteFile(connection, remotePath, content) {
  return new Promise((resolveResult, reject) => {
    connection.sftp((sftpError, sftp) => {
      if (sftpError) {
        reject(sftpError)
        return
      }

      sftp.open(remotePath, "w", 0o600, (openError, handle) => {
        if (openError) {
          sftp.end()
          reject(openError)
          return
        }

        const buffer = Buffer.from(content, "utf8")
        sftp.write(handle, buffer, 0, buffer.length, 0, (writeError) => {
          sftp.close(handle, () => {
            sftp.end()
            if (writeError) {
              reject(writeError)
              return
            }

            resolveResult()
          })
        })
      })
    })
  })
}

function exec(connection, command) {
  return new Promise((resolveResult, reject) => {
    connection.exec(command, (error, stream) => {
      if (error) {
        reject(error)
        return
      }

      let stdout = ""
      let stderr = ""

      stream
        .on("close", (code) => {
          resolveResult({ code: Number(code ?? 0), stdout, stderr })
        })
        .on("data", (chunk) => {
          stdout += chunk.toString("utf8")
        })
        .stderr.on("data", (chunk) => {
          stderr += chunk.toString("utf8")
        })
    })
  })
}

function execWithStdin(connection, command, stdin) {
  return new Promise((resolveResult, reject) => {
    connection.exec(command, (error, stream) => {
      if (error) {
        reject(error)
        return
      }

      let stdout = ""
      let stderr = ""

      stream
        .on("close", (code) => {
          resolveResult({ code: Number(code ?? 0), stdout, stderr })
        })
        .on("data", (chunk) => {
          stdout += chunk.toString("utf8")
        })
        .stderr.on("data", (chunk) => {
          stderr += chunk.toString("utf8")
        })

      stream.end(stdin)
    })
  })
}

function parseJson(stdout) {
  const text = String(stdout ?? "").trim()

  if (!text) {
    return null
  }

  const first = text.indexOf("{")
  const last = text.lastIndexOf("}")

  if (first < 0 || last < first) {
    return null
  }

  return JSON.parse(text.slice(first, last + 1))
}

function normalizeBaseUrl(value) {
  const normalized = String(value ?? "").trim().replace(/\/+$/, "")

  if (!normalized) {
    return ""
  }

  const parsed = new URL(normalized)

  return parsed.toString().replace(/\/+$/, "")
}

function normalizeRemoteDir(value) {
  const normalized = String(value ?? "").trim().replace(/\/+$/, "")

  return normalized || "/html/wp-content/uploads"
}

function firstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim()
    }
  }

  return undefined
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:.]/g, "").replace("T", "T").slice(0, 15) + "Z"
}

function tailForLog(value, max = 400) {
  const text = String(value ?? "").trim()

  return text.length > max ? text.slice(-max) : text
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}
