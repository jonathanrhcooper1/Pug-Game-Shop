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
const confirmValue = "run-production-local-pickup-fulfillment-smoke"
const localSyncServerUrl = normalizeBaseUrl(
  firstEnv("LOCAL_SYNC_SERVER_URL", "PUG_LOCAL_SYNC_PUBLIC_URL") ?? "http://127.0.0.1:8787",
)
const managerPin = firstEnv("LOCAL_SYNC_MANAGER_PIN", "PUG_LOCAL_SYNC_MANAGER_PIN") ?? "1420"
const localDatabasePath = resolve(
  root,
  firstEnv("LOCAL_SYNC_SQLITE_PATH", "PUG_LOCAL_SYNC_DB") ?? "apps/local-sync-server/store-sync.sqlite",
)
const remoteUploadDir = normalizeRemoteDir(process.env.PUG_PROD_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteRunnerPath = `${remoteUploadDir}/local-pickup-fulfillment-smoke-${timestampForRemoteName(new Date())}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const smoke = buildSmokePayload()
const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}
const cleanup = {
  attempted: false,
  wordpress: null,
  local: null,
}
let preparedOrder = null
let smokeResult = null

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_local_pickup_fulfillment_smoke_dry_run",
        localSyncServerUrl,
        localDatabasePath,
        remoteRunnerPath,
        wpPath,
        wpCli,
        smokeId: smoke.id,
        createsTemporaryPaidWooCommerceOrder: true,
        usesWooCommerceLocalPickup: true,
        usesSerializedCardLineMetadata: true,
        invokesPaymentGateway: false,
        capturesRealPayment: false,
        verifiesLanFulfillmentPull: true,
        verifiesPullingReadyAndCompletedStatuses: true,
        cleansTemporaryWooCommerceOrder: true,
        cleansLocalFulfillmentCache: true,
        productionApprovalRequired: true,
        credentialsPrinted: false,
        rawResponsePrinted: false,
        readsIgnoredEnvFiles: [".env.production.local", ".env.local-sync", ".env.local"],
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_LOCAL_PICKUP_FULFILLMENT_SMOKE",
        ],
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing production local pickup smoke environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_LOCAL_PICKUP_FULFILLMENT_SMOKE !== confirmValue) {
  throw new Error(
    `Set PUG_PROD_CONFIRM_LOCAL_PICKUP_FULFILLMENT_SMOKE=${confirmValue} to run the production pickup smoke.`,
  )
}

if (!localSyncServerUrl) {
  throw new Error("Local sync server URL is required.")
}

try {
  preparedOrder = await runWordPressRunner({
    mode: "prepare",
    smoke_id: smoke.id,
    first_name: smoke.firstName,
    last_name: smoke.lastName,
    email: smoke.email,
    card_name: smoke.cardName,
    set_name: smoke.setName,
    barcode: smoke.barcode,
    total: smoke.total,
    inventory_id: smoke.inventoryId,
    reservation_id: smoke.reservationId,
  })

  if (
    preparedOrder?.status !== "ok" ||
    !positiveInt(preparedOrder.order_id) ||
    preparedOrder.order_paid !== true ||
    preparedOrder.local_pickup !== true
  ) {
    throw new Error(`Temporary paid pickup order preparation failed: ${preparedOrder?.message ?? "invalid response"}`)
  }

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
  const orderId = positiveInt(preparedOrder.order_id)
  const initialQueue = await localSyncRequest("/fulfillment/orders?limit=100&refresh=true", { token })
  const initialOrder = findOrder(initialQueue.orders, orderId)

  if (!initialOrder) {
    throw new Error("Temporary paid WooCommerce pickup order did not reach the LAN fulfillment queue.")
  }

  assertFulfillmentOrder(initialOrder, {
    orderId,
    status: "awaiting_pull",
    customerName: `${smoke.firstName} ${smoke.lastName}`,
    barcode: smoke.barcode,
  })

  const pulling = await updateFulfillmentStatus(token, orderId, "pulling")
  const picked = await updateFulfillmentPicks(token, orderId, pickedItemIdsForOrder(pulling.order ?? initialOrder))
  const ready = await updateFulfillmentStatus(token, orderId, "ready_for_pickup")
  const completed = await updateFulfillmentStatus(token, orderId, "completed")
  const finalQueue = await localSyncRequest("/fulfillment/orders?limit=100&refresh=true", { token })
  const finalOrder = findOrder(finalQueue.orders, orderId)

  if (!finalOrder || finalOrder.fulfillment_status !== "completed") {
    throw new Error("Completed fulfillment status did not round-trip through WordPress and the LAN cache.")
  }

  smokeResult = {
    action: "production_local_pickup_fulfillment_smoke",
    status: "ok",
    checks: {
      temporary_paid_order_created: true,
      local_pickup_shipping_present: true,
      serialized_card_metadata_present: initialOrder.items?.[0]?.barcode === smoke.barcode,
      lan_fulfillment_pull_received_order: true,
      initial_status_awaiting_pull: initialOrder.fulfillment_status === "awaiting_pull",
      pulling_status_synced: pulling.order?.fulfillment_status === "pulling",
      pick_checklist_synced: picked.order?.all_items_picked === true,
      ready_status_synced: ready.order?.fulfillment_status === "ready_for_pickup",
      completed_status_synced: completed.order?.fulfillment_status === "completed",
      completed_status_round_trip: finalOrder.fulfillment_status === "completed",
      inventory_mutation_performed_by_status: false,
      payment_capture_performed_by_status: false,
      real_payment_capture_performed: false,
    },
    summary: {
      smokeId: smoke.id,
      orderId,
      orderNumber: String(initialOrder.order_number ?? orderId),
      customerName: initialOrder.customer_name,
      itemCount: Number(initialOrder.item_count ?? 0),
      totalMinorUnits: Number(initialOrder.total_minor_units ?? 0),
      finalStatus: finalOrder.fulfillment_status,
      wordpressRefreshBlocked: finalQueue.wordpress_refresh_blocked ?? null,
      credentialsPrinted: false,
      rawResponsePrinted: false,
    },
  }
} catch (error) {
  smokeResult = {
    action: "production_local_pickup_fulfillment_smoke",
    status: "error",
    message: error instanceof Error ? error.message : "Unknown paid pickup smoke failure.",
    credentialsPrinted: false,
    rawResponsePrinted: false,
  }
} finally {
  cleanup.attempted = true

  try {
    cleanup.wordpress = await runWordPressRunner({
      mode: "cleanup",
      smoke_id: smoke.id,
      order_id: positiveInt(preparedOrder?.order_id),
    })
  } catch (error) {
    cleanup.wordpress = {
      status: "error",
      message: error instanceof Error ? error.message : "WordPress cleanup failed.",
    }
  }

  try {
    cleanup.local = cleanupLocalFulfillment(preparedOrder?.order_id, smoke.id)
  } catch (error) {
    cleanup.local = {
      status: "error",
      message: error instanceof Error ? error.message : "Local fulfillment cleanup failed.",
    }
  }
}

const finalResult = {
  ...smokeResult,
  cleanup,
}

console.log(JSON.stringify(finalResult, null, 2))

if (
  finalResult.status !== "ok" ||
  cleanup.wordpress?.status !== "ok" ||
  cleanup.local?.status !== "ok"
) {
  process.exitCode = 1
}

async function updateFulfillmentStatus(token, orderId, status) {
  const result = await localSyncRequest(`/fulfillment/orders/${orderId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  })

  if (
    result.status !== "ok" ||
    result.order?.fulfillment_status !== status ||
    result.inventory_mutation_performed !== false ||
    result.payment_capture_performed !== false
  ) {
    throw new Error(`Fulfillment status ${status} was not accepted safely.`)
  }

  return result
}

async function updateFulfillmentPicks(token, orderId, pickedItemIds) {
  const result = await localSyncRequest(`/fulfillment/orders/${orderId}/picks`, {
    method: "PATCH",
    token,
    body: { picked_item_ids: pickedItemIds },
  })

  if (
    result.status !== "ok" ||
    result.order?.all_items_picked !== true ||
    result.inventory_mutation_performed !== false
  ) {
    throw new Error(
      `Fulfillment pick checklist was not accepted safely: ${JSON.stringify({
        status: result.status,
        code: result.code,
        message: result.message,
        picked_item_ids: pickedItemIds,
        returned_picked_item_ids: result.order?.picked_item_ids,
        picked_item_count: result.order?.picked_item_count,
        all_items_picked: result.order?.all_items_picked,
        item_count: result.order?.item_count,
        inventory_mutation_performed: result.inventory_mutation_performed,
      })}`,
    )
  }

  return result
}

function pickedItemIdsForOrder(order) {
  const ids = (Array.isArray(order.items) ? order.items : [])
    .map((item) => item.public_id ?? item.inventory_id ?? item.reservation_id ?? item.order_item_id)
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)

  if (ids.length === 0) {
    throw new Error("Temporary paid WooCommerce pickup order did not expose item IDs for picking.")
  }

  return ids
}

function assertFulfillmentOrder(order, expected) {
  const item = Array.isArray(order.items) ? order.items[0] : null

  if (
    Number(order.order_id) !== expected.orderId ||
    order.fulfillment_status !== expected.status ||
    order.payment_status !== "paid" ||
    order.local_pickup !== true ||
    order.customer_name !== expected.customerName ||
    item?.barcode !== expected.barcode
  ) {
    throw new Error("LAN fulfillment order did not preserve paid pickup and serialized card metadata.")
  }
}

async function localSyncRequest(path, options = {}) {
  const response = await fetch(`${localSyncServerUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await safeJson(response)

  if (!response.ok && !body?.status) {
    return {
      status: "blocked",
      code: "local_sync_http_error",
      message: `Local sync server returned HTTP ${response.status}.`,
    }
  }

  return body
}

async function runWordPressRunner(payload) {
  return withProductionConnection(async (connection) => {
    await writeRemoteFile(connection, remoteRunnerPath, wordpressRunnerSource())
    const run = await execWithStdin(
      connection,
      `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
      JSON.stringify(payload),
    )

    if (payload.mode === "cleanup") {
      await exec(connection, `rm -f ${shellQuote(remoteRunnerPath)}`)
    }

    if (run.code !== 0) {
      throw new Error(`WordPress paid pickup runner failed: ${tailForLog(run.stderr || run.stdout)}`)
    }

    const result = parseJson(run.stdout)

    if (!result || result.status !== "ok") {
      throw new Error(`WordPress paid pickup runner returned an invalid result: ${tailForLog(run.stdout)}`)
    }

    return result
  })
}

function cleanupLocalFulfillment(orderIdValue, smokeId) {
  if (!existsSync(localDatabasePath)) {
    return {
      status: "ok",
      database_present: false,
      fulfillment_rows_deleted: 0,
      queue_rows_deleted: 0,
      credentialsPrinted: false,
    }
  }

  const orderId = positiveInt(orderIdValue)
  const database = new DatabaseSync(localDatabasePath)
  let fulfillmentRowsDeleted = 0
  let queueRowsDeleted = 0

  try {
    if (orderId > 0) {
      fulfillmentRowsDeleted = Number(
        database.prepare("DELETE FROM fulfillment_orders WHERE order_id = ?").run(orderId).changes ?? 0,
      )
      queueRowsDeleted = Number(
        database
          .prepare(
            "DELETE FROM operation_queue WHERE operation_type = 'woocommerce_fulfillment_status' AND entity_id = ?",
          )
          .run(`wc-order-${orderId}`).changes ?? 0,
      )
    }
  } finally {
    database.close()
  }

  return {
    status: "ok",
    database_present: true,
    smoke_id: smokeId,
    fulfillment_rows_deleted: fulfillmentRowsDeleted,
    queue_rows_deleted: queueRowsDeleted,
    credentialsPrinted: false,
  }
}

function wordpressRunnerSource() {
  return `<?php
$payload = json_decode(stream_get_contents(STDIN), true);
if (!is_array($payload)) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'invalid_payload'));
\texit(1);
}
if (!class_exists('WooCommerce') || !function_exists('wc_create_order') || !function_exists('wc_get_order')) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'woocommerce_unavailable'));
\texit(1);
}
$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ids'));
$admin_id = (int) ($admins[0] ?? 0);
if ($admin_id <= 0) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'administrator_required'));
\texit(1);
}
wp_set_current_user($admin_id);

$mode = sanitize_key((string) ($payload['mode'] ?? ''));
$smoke_id = sanitize_text_field((string) ($payload['smoke_id'] ?? ''));
$order_id = absint($payload['order_id'] ?? 0);

if ('' === $smoke_id) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'smoke_id_required'));
\texit(1);
}

$delete_order = static function (int $candidate_id, string $expected_smoke_id): bool {
\tif ($candidate_id <= 0) {
\t\treturn false;
\t}
\t$order = wc_get_order($candidate_id);
\tif (!is_object($order) || (string) $order->get_meta('_tcg_fulfillment_smoke_id', true) !== $expected_smoke_id) {
\t\treturn false;
\t}
\tif (method_exists($order, 'delete')) {
\t\treturn (bool) $order->delete(true);
\t}
\treturn (bool) wp_delete_post($candidate_id, true);
};

if ('cleanup' === $mode) {
\t$deleted = $delete_order($order_id, $smoke_id);
\tif (!$deleted) {
\t\t$order_ids = wc_get_orders(array(
\t\t\t'limit' => -1,
\t\t\t'return' => 'ids',
\t\t\t'status' => array('pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'trash'),
\t\t\t'meta_key' => '_tcg_fulfillment_smoke_id',
\t\t\t'meta_value' => $smoke_id,
\t\t));
\t\tforeach ((array) $order_ids as $candidate_id) {
\t\t\t$deleted = $delete_order((int) $candidate_id, $smoke_id) || $deleted;
\t\t}
\t}
\techo wp_json_encode(array(
\t\t'action' => 'production_local_pickup_fulfillment_smoke_cleanup',
\t\t'status' => 'ok',
\t\t'order_deleted' => $deleted,
\t\t'credentialsPrinted' => false,
\t));
\texit(0);
}

if ('prepare' !== $mode) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'mode_invalid'));
\texit(1);
}

$first_name = sanitize_text_field((string) ($payload['first_name'] ?? 'Codex'));
$last_name = sanitize_text_field((string) ($payload['last_name'] ?? 'Fulfillment Smoke'));
$email = sanitize_email((string) ($payload['email'] ?? ''));
$card_name = sanitize_text_field((string) ($payload['card_name'] ?? 'Codex Fulfillment Smoke Card'));
$set_name = sanitize_text_field((string) ($payload['set_name'] ?? 'Production Smoke'));
$barcode = sanitize_text_field((string) ($payload['barcode'] ?? ''));
$total = wc_format_decimal((string) ($payload['total'] ?? '1.23'), wc_get_price_decimals());
$inventory_id = absint($payload['inventory_id'] ?? 999000001);
$reservation_id = absint($payload['reservation_id'] ?? 999000002);

$order = wc_create_order(array(
\t'created_via' => 'codex_fulfillment_smoke',
\t'status' => 'pending',
));
if (!is_object($order) || !method_exists($order, 'get_id')) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'order_create_failed'));
\texit(1);
}

$order->set_billing_first_name($first_name);
$order->set_billing_last_name($last_name);
$order->set_billing_email($email);
$order->set_payment_method('codex_smoke_no_capture');
$order->set_payment_method_title('Codex smoke paid state - no gateway capture');
$order->set_transaction_id($smoke_id);
$order->update_meta_data('_tcg_fulfillment_smoke_id', $smoke_id);
$order->update_meta_data('_tcg_real_payment_capture_performed', '0');

$line = new WC_Order_Item_Product();
$line->set_name($card_name);
$line->set_quantity(1);
$line->set_subtotal($total);
$line->set_total($total);
$line->add_meta_data('_tcg_serialized_inventory', '1', true);
$line->add_meta_data('_tcg_inventory_id', (string) $inventory_id, true);
$line->add_meta_data('_tcg_reservation_id', (string) $reservation_id, true);
$line->add_meta_data('_tcg_barcode', $barcode, true);
$line->add_meta_data('_tcg_card_name', $card_name, true);
$line->add_meta_data('_tcg_set_name', $set_name, true);
$line->add_meta_data('_tcg_condition_code', 'NM', true);
$line->add_meta_data('_tcg_price_minor_units', (string) ((int) round((float) $total * 100)), true);
$line->add_meta_data('_tcg_currency', 'USD', true);
$order->add_item($line);

$shipping = new WC_Order_Item_Shipping();
$shipping->set_method_title('Pickup in store');
$shipping->set_method_id('local_pickup');
$shipping->set_total('0');
$order->add_item($shipping);

$order->calculate_totals(false);
$order->set_date_paid(time());
$order->set_status('processing');
$order->save();

$pickup_found = false;
foreach ($order->get_shipping_methods() as $shipping_item) {
\tif ('local_pickup' === (string) $shipping_item->get_method_id()) {
\t\t$pickup_found = true;
\t}
}

echo wp_json_encode(array(
\t'action' => 'production_local_pickup_fulfillment_smoke_prepare',
\t'status' => 'ok',
\t'order_id' => (int) $order->get_id(),
\t'order_number' => (string) $order->get_order_number(),
\t'order_paid' => (bool) $order->is_paid(),
\t'order_status' => (string) $order->get_status(),
\t'local_pickup' => $pickup_found,
\t'serialized_line_count' => 1,
\t'real_payment_capture_performed' => false,
\t'credentialsPrinted' => false,
));
`
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
      .connect({
        host: requiredEnv.PUG_PROD_SSH_HOST,
        username: requiredEnv.PUG_PROD_SSH_USER,
        password: requiredEnv.PUG_PROD_SSH_PASSWORD,
        readyTimeout: 60000,
        algorithms: STAGING_SSH_ALGORITHMS,
      })
  })
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
        .on("close", (code) => resolveResult({ code: Number(code ?? 0), stdout, stderr }))
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
        .on("close", (code) => resolveResult({ code: Number(code ?? 0), stdout, stderr }))
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

function buildSmokePayload() {
  const id = `CODEX-PICKUP-${timestampForRemoteName(new Date())}`

  return {
    id,
    firstName: "Codex",
    lastName: "Pickup Smoke",
    email: `codex-pickup-${id.toLowerCase()}@example.invalid`,
    cardName: "Codex Paid Pickup Smoke Card",
    setName: "Production Fulfillment Smoke",
    barcode: `${id}-CARD`,
    total: "1.23",
    inventoryId: 999000001,
    reservationId: 999000002,
  }
}

function findOrder(orders, orderId) {
  return Array.isArray(orders)
    ? orders.find((order) => Number(order?.order_id) === Number(orderId)) ?? null
    : null
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function parseJson(stdout) {
  const text = String(stdout ?? "").trim()
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

  return new URL(normalized).toString().replace(/\/+$/, "")
}

function normalizeRemoteDir(value) {
  return String(value ?? "").trim().replace(/\/+$/, "") || "/html/wp-content/uploads"
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

function positiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z"
}

function tailForLog(value, max = 500) {
  const text = String(value ?? "").trim()

  return text.length > max ? text.slice(-max) : text
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}
