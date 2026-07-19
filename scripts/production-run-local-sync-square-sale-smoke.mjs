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
const confirmValue = "run-production-local-sync-square-sale-smoke"
const localSyncServerUrl = normalizeBaseUrl(
  firstEnv("LOCAL_SYNC_SERVER_URL", "PUG_LOCAL_SYNC_PUBLIC_URL") ?? "http://127.0.0.1:8787",
)
const wordpressUrl = normalizeBaseUrl(firstEnv("PUG_WORDPRESS_URL", "LOCAL_SYNC_WORDPRESS_URL") ?? "")
const restBasePath = normalizeRestBase(firstEnv("PUG_WORDPRESS_REST_BASE", "LOCAL_SYNC_WORDPRESS_REST_BASE"))
const wpRestBase = wordpressUrl ? `${wordpressUrl}${restBasePath}` : ""
const remoteUploadDir = normalizeRemoteDir(process.env.PUG_PROD_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteRunnerPath = `${remoteUploadDir}/local-sync-production-square-sale-smoke-${timestampForRemoteName(
  new Date(),
)}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const managerPin = firstEnv("LOCAL_SYNC_MANAGER_PIN", "PUG_LOCAL_SYNC_MANAGER_PIN") ?? "1420"
const wordpressUsername = firstEnv("PUG_WORDPRESS_INVENTORY_USERNAME", "PUG_WORDPRESS_USERNAME")
const wordpressApplicationPassword = firstEnv(
  "PUG_WORDPRESS_INVENTORY_APPLICATION_PASSWORD",
  "PUG_WORDPRESS_APP_PASSWORD",
)
const wordpressAuthHeader = firstEnv("PUG_WORDPRESS_INVENTORY_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
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
let cleanupWooCommerceProductIds = []

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_local_sync_square_sale_smoke_dry_run",
        localSyncServerUrl,
        wordpressUrl,
        wpRestBase,
        remoteRunnerPath,
        createsVisibleInventory: true,
        autoPublishesWooCommerceProduct: true,
        finalizesSquareSale: true,
        verifiesWordPressSoldStatus: true,
        cleansWordPressRowsByBarcode: true,
        cleansWooCommerceProductsByBarcode: true,
        cleansLocalRowsByBarcode: true,
        productionApprovalRequired: true,
        credentialsPrinted: false,
        rawResponsePrinted: false,
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_LOCAL_SYNC_SQUARE_SALE_SMOKE",
          "PUG_WORDPRESS_URL",
          "PUG_WORDPRESS_USERNAME",
          "PUG_WORDPRESS_APP_PASSWORD",
        ],
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing production Square sale smoke environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_LOCAL_SYNC_SQUARE_SALE_SMOKE !== confirmValue) {
  throw new Error(
    `Set PUG_PROD_CONFIRM_LOCAL_SYNC_SQUARE_SALE_SMOKE=${confirmValue} to run the production Square sale smoke.`,
  )
}

if (!localSyncServerUrl || !wordpressUrl || !wpRestBase) {
  throw new Error("Local sync server URL and WordPress URL are required.")
}

try {
  const auth = await localSyncRequest("/auth/pin", {
    method: "POST",
    body: {
      pin: managerPin,
      ttlMinutes: 15,
    },
  })

  if (auth.status !== "ok" || !auth.session?.token) {
    throw new Error(`Local sync PIN auth failed: ${auth.code ?? auth.status}`)
  }

  const token = auth.session.token
  const intake = await localSyncRequest("/inventory/intake", {
    method: "POST",
    token,
    body: {
      card_name: smoke.cardName,
      set_name: "Codex Square Sale Smoke",
      condition: "RAW",
      barcode: smoke.barcode,
      price_minor_units: 456,
      location: "Production Square Sale Smoke",
      quantity: 1,
      provider_card_id: `codex-local-sync-square-sale-smoke-${smoke.id}`.slice(0, 100),
      game: "pokemon",
      set_code: "SMOKE",
      card_number: "004",
      printed_number: "004/004",
      image_url: "https://images.scrydex.com/pokemon/mcd24-1/large",
      online_visibility: "visible",
      kiosk_visibility: "visible",
      pos_visibility: "visible",
    },
  })

  if (intake.status !== "ok" || !intake.item?.public_id) {
    throw new Error(`Local inventory intake failed: ${intake.code ?? intake.status}`)
  }

  let inventoryPush = pushSummaryFromAutoSync(intake, autoSyncResults(intake))
  let acceptedInventory = findAccepted(inventoryPush.results, "inventory_intake", intake.item.public_id)

  if (!acceptedInventory) {
    inventoryPush = await localSyncRequest("/sync/push", {
      method: "POST",
      token,
      body: {},
    })
    acceptedInventory = findAccepted(inventoryPush.results, "inventory_intake", intake.item.public_id)
  }

  if (!acceptedInventory) {
    throw new Error("Temporary Square sale inventory was not accepted by WordPress.")
  }

  const intakeWooSync = safeWooCommerceProductSync(acceptedInventory.woocommerce_product_sync)
  cleanupWooCommerceProductIds = intakeWooSync.productIds

  const sale = await localSyncRequest("/pos/square/sales/finalize", {
    method: "POST",
    token,
    body: {
      inventory_public_ids: [intake.item.public_id],
      barcodes: [smoke.barcode],
      square_receipt_reference: smoke.squareReceiptReference,
      square_order_id: smoke.squareOrderId,
      sale_total_minor_units: 456,
    },
  })

  if (sale.status !== "ok") {
    throw new Error(`Square sale finalize failed: ${sale.code ?? sale.status}`)
  }

  const saleAutoResults = autoSyncResults(sale)
  const acceptedSale = findAccepted(saleAutoResults, "square_pos_sale", intake.item.public_id)
  const saleWooSync = safeWooCommerceProductSync(acceptedSale?.woocommerce_product_sync)
  cleanupWooCommerceProductIds = Array.from(
    new Set([...cleanupWooCommerceProductIds, ...saleWooSync.productIds]),
  )

  const soldSearch = await wordpressInventorySearch(smoke.barcode, "sold")

  smokeResult = {
    action: "production_local_sync_square_sale_smoke",
    status: acceptedSale ? "ok" : "sale_not_accepted",
    localIntake: {
      publicId: intake.item.public_id,
      barcode: intake.item.barcode,
      status: intake.item.status,
      credentialsPrinted: false,
    },
    inventoryPush: {
      acceptedCount: Number(inventoryPush.accepted_count ?? 0),
      retryCount: Number(inventoryPush.retry_count ?? 0),
      wordpressInventoryPushConnected:
        Boolean(inventoryPush.wordpress_inventory_push_connected) || Boolean(intake.wordpress_auto_sync_performed),
      woocommerceProductSync: intakeWooSync,
    },
    squareSale: {
      finalizedCount: Number(sale.finalized_count ?? 0),
      localStatus: String(sale.items?.[0]?.status ?? ""),
      localSource: String(sale.items?.[0]?.source ?? ""),
      wordpressAutoSyncPerformed: Boolean(sale.wordpress_auto_sync_performed),
      wordpressAcceptedCount: Number(sale.wordpress_accepted_count ?? 0),
      wordpressRetryCount: Number(sale.wordpress_retry_count ?? 0),
      squareReceiptReference: String(sale.square_receipt_reference ?? ""),
      squareOrderId: String(sale.square_order_id ?? ""),
      paymentCaptureSupported: Boolean(sale.square_payment_capture_supported),
      paymentCaptureAuthority: String(sale.payment_capture_authority ?? ""),
      acceptedEntity: acceptedSale?.entity_id ?? "",
      wordpressInventory: safeWordPressInventory(acceptedSale?.wordpress_inventory),
      woocommerceProductSync: saleWooSync,
    },
    wordpressSearch: soldSearch,
    checks: buildChecks({ intake, inventoryPush, acceptedInventory, sale, acceptedSale, soldSearch, intakeWooSync, saleWooSync }),
    cleanup: cleanupSummary,
    productionApprovalRequired: true,
    credentialsPrinted: false,
    rawResponsePrinted: false,
  }
} finally {
  cleanupSummary.attempted = true
  cleanupSummary.wordpress = await cleanupWordPressSmoke(smoke, cleanupWooCommerceProductIds)
  cleanupSummary.local = cleanupLocalSmoke(smoke)
}

if (smokeResult) {
  smokeResult.cleanup = cleanupSummary
  smokeResult.checks.push(
    {
      name: "wordpress_cleanup_deleted_smoke_row",
      pass: Number(cleanupSummary.wordpress?.inventoryRowsDeleted ?? 0) >= 1,
      expected: ">=1",
      actual: cleanupSummary.wordpress?.inventoryRowsDeleted ?? null,
    },
    {
      name: "wordpress_cleanup_deleted_woocommerce_product",
      pass: Number(cleanupSummary.wordpress?.woocommerceProductsDeleted ?? 0) >= 1,
      expected: ">=1",
      actual: cleanupSummary.wordpress?.woocommerceProductsDeleted ?? null,
    },
    {
      name: "local_cleanup_deleted_smoke_row",
      pass: Number(cleanupSummary.local?.inventoryRowsDeleted ?? 0) >= 1,
      expected: ">=1",
      actual: cleanupSummary.local?.inventoryRowsDeleted ?? null,
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
  const barcode = `PUGS${id.slice(-9)}`

  return {
    id,
    barcode,
    cardName: "Codex Square Sale Smoke",
    squareReceiptReference: `SQ-CODEX-${id}`.slice(0, 64),
    squareOrderId: `SQ-ORDER-${id}`.slice(0, 64),
  }
}

function autoSyncResults(result) {
  return Array.isArray(result?.auto_sync_results) ? result.auto_sync_results : []
}

function findAccepted(results, operationType, entityId = null) {
  return (Array.isArray(results) ? results : []).find(
    (result) =>
      result?.operation_type === operationType &&
      result?.status === "accepted" &&
      (null === entityId || String(result?.entity_id ?? "") === String(entityId)),
  ) ?? null
}

function pushSummaryFromAutoSync(intake, results) {
  const acceptedCount = results.filter((result) => result?.status === "accepted").length
  const retryCount = results.filter((result) => result?.status === "retry").length
  const rejectedCount = results.filter((result) => result?.status === "rejected").length

  return {
    status: "ok",
    operation_count: results.length,
    accepted_count: Number(intake.wordpress_accepted_count ?? acceptedCount),
    retry_count: Number(intake.wordpress_retry_count ?? retryCount),
    rejected_count: rejectedCount,
    unsupported_operation_count: 0,
    local_queue_depth: Number(intake.local_queue_depth ?? retryCount + rejectedCount),
    wordpress_inventory_push_connected: Boolean(intake.wordpress_auto_sync_performed),
    results,
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

async function wordpressInventorySearch(barcode, status) {
  const authorization = safeWordPressAuthorizationHeader()

  if (!authorization) {
    return {
      skipped: true,
      reason: "wordpress_auth_missing",
      credentialsPrinted: false,
    }
  }

  const endpoint = new URL(`${wpRestBase}/inventory/search`)
  endpoint.searchParams.set("q", barcode)
  endpoint.searchParams.set("visibility", "staff")
  endpoint.searchParams.set("status", status)
  endpoint.searchParams.set("page_size", "5")

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      authorization,
    },
  })
  const body = await safeJson(response)
  const items = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body?.data?.items)
      ? body.data.items
      : []
  const match = items.find((item) => item?.barcode === barcode || item?.sku === barcode) ?? null

  return {
    skipped: false,
    httpStatus: response.status,
    requestedStatus: status,
    itemCount: items.length,
    matched: Boolean(match),
    item: match
      ? {
          public_id: String(match.public_id ?? ""),
          barcode: String(match.barcode ?? ""),
          sku: String(match.sku ?? ""),
          card_name: String(match.card_name ?? ""),
          status: String(match.status ?? ""),
          online_visibility: String(match.online_visibility ?? ""),
          kiosk_visibility: String(match.kiosk_visibility ?? ""),
          pos_visibility: String(match.pos_visibility ?? ""),
        }
      : null,
    credentialsPrinted: false,
    endpoint: secretSafeEndpoint(endpoint),
  }
}

async function cleanupWordPressSmoke(smokePayload, wooCommerceProductIds = []) {
  try {
    return await withProductionConnection(async (connection) => {
      await writeRemoteFile(connection, remoteRunnerPath, cleanupRunnerSource())

      try {
        const execution = await execWithStdin(
          connection,
          `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
          JSON.stringify({
            barcode: smokePayload.barcode,
            card_name: smokePayload.cardName,
            product_ids: wooCommerceProductIds,
          }),
        )
        const parsed = parseJson(execution.stdout)

        return {
          status: parsed?.status ?? "unknown",
          exitCode: execution.code,
          inventoryRowsMatched: Number(parsed?.inventory_rows_matched ?? 0),
          inventoryRowsDeleted: Number(parsed?.inventory_rows_deleted ?? 0),
          priceRowsDeleted: Number(parsed?.price_rows_deleted ?? 0),
          woocommerceProductsMatched: Number(parsed?.woocommerce_products_matched ?? 0),
          woocommerceProductsDeleted: Number(parsed?.woocommerce_products_deleted ?? 0),
          matchedStatus: parsed?.matched_status ?? null,
          diagnostics: parsed?.diagnostics ?? null,
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

  const maxAttempts = 5

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let database

    try {
      database = new DatabaseSync(localDatabasePath)
      database.exec("PRAGMA busy_timeout = 5000")
      const itemRows = database
        .prepare("SELECT public_id FROM inventory_items WHERE barcode = ?")
        .all(smokePayload.barcode)
      const entityIds = itemRows.map((row) => String(row.public_id ?? "")).filter(Boolean)
      let queueRowsDeleted = 0

      for (const entityId of entityIds) {
        queueRowsDeleted += Number(
          database.prepare("DELETE FROM operation_queue WHERE entity_id = ?").run(entityId).changes ?? 0,
        )
      }

      queueRowsDeleted += Number(
        database.prepare("DELETE FROM operation_queue WHERE payload_json LIKE ?").run(`%${smokePayload.barcode}%`).changes ??
          0,
      )

      const inventoryRowsDeleted = Number(
        database.prepare("DELETE FROM inventory_items WHERE barcode = ?").run(smokePayload.barcode).changes ?? 0,
      )

      return {
        status: "ok",
        inventoryRowsDeleted,
        queueRowsDeleted,
        attempts: attempt,
        serverRestartRecommended: inventoryRowsDeleted > 0,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown local cleanup error."

      if (attempt >= maxAttempts || !/locked|busy/i.test(message)) {
        return {
          status: "cleanup_failed",
          message,
          attempts: attempt,
        }
      }

      waitSync(250 * attempt)
    } finally {
      database?.close()
    }
  }

  return {
    status: "cleanup_failed",
    message: "Unknown local cleanup error.",
    attempts: maxAttempts,
  }
}

function safeWordPressAuthorizationHeader() {
  const explicit = String(wordpressAuthHeader ?? "").trim()

  if (/^(Basic|Bearer)\s+[A-Za-z0-9._~+/=-]+$/i.test(explicit)) {
    return explicit
  }

  if (!wordpressUsername || !wordpressApplicationPassword) {
    return ""
  }

  return `Basic ${Buffer.from(`${wordpressUsername}:${wordpressApplicationPassword}`, "utf8").toString("base64")}`
}

function safeWordPressInventory(value) {
  return value && typeof value === "object"
    ? {
        public_id: String(value.public_id ?? ""),
        sku: String(value.sku ?? ""),
        barcode: String(value.barcode ?? ""),
        status: String(value.status ?? ""),
        square_receipt_reference: String(value.square_receipt_reference ?? ""),
        price_change_log_persisted: Boolean(value.price_change_log_persisted),
      }
    : null
}

function safeWooCommerceProductSync(value) {
  const productIds = Array.isArray(value?.product_ids)
    ? value.product_ids
        .map((candidate) => Number.parseInt(String(candidate ?? ""), 10))
        .filter((candidate) => Number.isFinite(candidate) && candidate > 0)
    : []

  return {
    requested: Boolean(value?.requested),
    synced: Boolean(value?.synced),
    status: String(value?.status ?? (value?.requested ? "unknown" : "deferred")),
    productIds,
    errors: Array.isArray(value?.errors) ? value.errors.map((error) => String(error)) : [],
    execution: safeWooCommerceExecution(value?.execution),
    paymentCaptureDeferred: value?.payment_capture_deferred !== false,
    squareInventoryDeferred: value?.square_inventory_deferred !== false,
  }
}

function safeWooCommerceExecution(value) {
  if (!value || typeof value !== "object") {
    return {
      status: "",
      projectionCode: "",
      writeRequestCode: "",
      operationResults: [],
    }
  }

  return {
    status: String(value.status ?? ""),
    projectionCode: String(value.projection_code ?? ""),
    writeRequestCode: String(value.write_request_code ?? value.woocommerce_write_request_code ?? ""),
    operationResults: Array.isArray(value.operation_results)
      ? value.operation_results.map((row) => ({
          status: String(row?.status ?? ""),
          code: String(row?.code ?? ""),
          operation: String(row?.operation ?? ""),
          productId: Number.parseInt(String(row?.product_id ?? ""), 10) || null,
          failureType: String(row?.failure_type ?? ""),
          failureCode: String(row?.failure_code ?? ""),
          failureReason: String(row?.failure_reason ?? ""),
        }))
      : [],
  }
}

function buildChecks({ intake, inventoryPush, acceptedInventory, sale, acceptedSale, soldSearch, intakeWooSync, saleWooSync }) {
  return [
    {
      name: "local_intake_created",
      pass: intake?.status === "ok" && intake?.item?.barcode === smoke.barcode,
      expected: smoke.barcode,
      actual: intake?.item?.barcode ?? null,
    },
    {
      name: "inventory_auto_published_to_wordpress",
      pass: Boolean(acceptedInventory),
      expected: true,
      actual: Boolean(acceptedInventory),
    },
    {
      name: "inventory_auto_published_woocommerce_product",
      pass: intakeWooSync.requested === true && intakeWooSync.synced === true && intakeWooSync.productIds.length >= 1,
      expected: "requested/synced/product_id",
      actual: intakeWooSync,
    },
    {
      name: "square_sale_finalize_accepted",
      pass: sale?.status === "ok" && Boolean(acceptedSale),
      expected: true,
      actual: Boolean(acceptedSale),
    },
    {
      name: "square_sale_marked_local_item_sold",
      pass: String(sale?.items?.[0]?.status ?? "") === "sold",
      expected: "sold",
      actual: sale?.items?.[0]?.status ?? null,
    },
    {
      name: "square_sale_payment_capture_deferred",
      pass:
        sale?.square_payment_capture_supported === false &&
        String(sale?.payment_capture_authority ?? "") === "official_woocommerce_square_extension",
      expected: "capture false / official_woocommerce_square_extension",
      actual: `${sale?.square_payment_capture_supported ?? ""} / ${sale?.payment_capture_authority ?? ""}`,
    },
    {
      name: "wordpress_sale_push_synced",
      pass:
        Number(sale?.wordpress_accepted_count ?? 0) >= 1 &&
        acceptedSale?.wordpress_inventory?.status === "sold" &&
        safeWordPressInventory(acceptedSale?.wordpress_inventory)?.square_receipt_reference === smoke.squareReceiptReference,
      expected: "sold with Square reference",
      actual: safeWordPressInventory(acceptedSale?.wordpress_inventory),
    },
    {
      name: "woocommerce_sale_sync_completed",
      pass: saleWooSync.requested === true && saleWooSync.synced === true && saleWooSync.productIds.length >= 1,
      expected: "requested/synced/product_id",
      actual: saleWooSync,
    },
    {
      name: "wordpress_sold_search_matched",
      pass: soldSearch?.matched === true && soldSearch?.item?.status === "sold",
      expected: "sold",
      actual: soldSearch?.item?.status ?? (soldSearch?.skipped ? "skipped" : null),
    },
    {
      name: "manual_push_not_required_for_sale",
      pass: Number(inventoryPush?.retry_count ?? 0) === 0 && Number(sale?.wordpress_retry_count ?? 0) === 0,
      expected: "0 retries",
      actual: {
        intakeRetries: Number(inventoryPush?.retry_count ?? 0),
        saleRetries: Number(sale?.wordpress_retry_count ?? 0),
      },
    },
  ]
}

function cleanupRunnerSource() {
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
$barcode = strtoupper(trim((string) ($payload['barcode'] ?? '')));
$product_ids = array_values(array_unique(array_filter(array_map('absint', (array) ($payload['product_ids'] ?? array())))));
if ('' === $barcode || !preg_match('/^PUG[A-Z0-9]{10}$/', $barcode)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'barcode_invalid'));
	exit(1);
}
$inventory_table = $wpdb->prefix . 'tcg_inventory_items';
$price_log_table = $wpdb->prefix . 'tcg_price_change_log';
if (function_exists('wc_get_product_id_by_sku')) {
	$product_id_by_sku = absint(wc_get_product_id_by_sku($barcode));
	if ($product_id_by_sku > 0) {
		$product_ids[] = $product_id_by_sku;
	}
}
$product_meta_ids = $wpdb->get_col(
	$wpdb->prepare(
		"SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key IN ('_sku', '_tcg_barcode') AND meta_value = %s",
		$barcode
	)
);
foreach ((array) $product_meta_ids as $product_meta_id) {
	$product_meta_id = absint($product_meta_id);
	if ($product_meta_id > 0) {
		$product_ids[] = $product_meta_id;
	}
}
$product_ids = array_values(array_unique(array_filter(array_map('absint', $product_ids))));
$rows = $wpdb->get_results(
	$wpdb->prepare(
		"SELECT inventory_id, public_id, barcode, sku, card_name, status FROM {$inventory_table} WHERE barcode = %s OR sku = %s",
		$barcode,
		$barcode
	),
	ARRAY_A
);
$cleanup_last_error = (string) $wpdb->last_error;
$matched = array();
foreach ((array) $rows as $row) {
	$row_barcode = strtoupper(trim((string) ($row['barcode'] ?? '')));
	$row_sku = strtoupper(trim((string) ($row['sku'] ?? '')));
	if ($barcode === $row_barcode || $barcode === $row_sku) {
		$matched[] = $row;
	}
}
$ids = array_map(static fn($row) => (int) ($row['inventory_id'] ?? 0), $matched);
$ids = array_values(array_filter($ids));
$price_rows_deleted = 0;
$inventory_rows_deleted = 0;
if (!empty($ids)) {
	$placeholders = implode(',', array_fill(0, count($ids), '%d'));
	$price_rows_deleted = (int) $wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$price_log_table} WHERE inventory_id IN ({$placeholders})",
			$ids
		)
	);
	$inventory_rows_deleted = (int) $wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$inventory_table} WHERE inventory_id IN ({$placeholders})",
			$ids
		)
	);
}
$woocommerce_products_matched = count($product_ids);
$woocommerce_products_deleted = 0;
foreach ($product_ids as $product_id) {
	if ('product' !== get_post_type($product_id)) {
		continue;
	}
	$deleted = wp_delete_post($product_id, true);
	if ($deleted) {
		++$woocommerce_products_deleted;
	}
}
$first = $matched[0] ?? array();
echo wp_json_encode(array(
	'action' => 'production_local_sync_square_sale_smoke_cleanup',
	'status' => 'ok',
	'inventory_rows_matched' => count($matched),
	'inventory_rows_deleted' => $inventory_rows_deleted,
	'price_rows_deleted' => $price_rows_deleted,
	'woocommerce_products_matched' => $woocommerce_products_matched,
	'woocommerce_products_deleted' => $woocommerce_products_deleted,
	'matched_status' => array(
		'status' => (string) ($first['status'] ?? ''),
	),
	'diagnostics' => array(
		'inventory_table' => $inventory_table,
		'barcode_length' => strlen($barcode),
		'row_query_error' => $cleanup_last_error,
	),
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

      stream.on("data", (chunk) => {
        stdout += chunk.toString()
      })
      stream.stderr.on("data", (chunk) => {
        stderr += chunk.toString()
      })
      stream.on("close", (code) => {
        resolveResult({ code, stdout, stderr })
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

      stream.on("data", (chunk) => {
        stdout += chunk.toString()
      })
      stream.stderr.on("data", (chunk) => {
        stderr += chunk.toString()
      })
      stream.on("close", (code) => {
        resolveResult({ code, stdout, stderr })
      })
      stream.end(stdin)
    })
  })
}

function parseJson(value) {
  try {
    return JSON.parse(String(value).trim())
  } catch {
    return null
  }
}

function normalizeBaseUrl(value) {
  const raw = String(value ?? "").trim().replace(/\/+$/, "")

  if (!raw) {
    return ""
  }

  try {
    const parsed = new URL(raw)

    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString().replace(/\/+$/, "") : ""
  } catch {
    return ""
  }
}

function normalizeRestBase(value) {
  return String(value ?? "/wp-json/tcg-store/v1")
    .trim()
    .replace(/^\/?/, "/")
    .replace(/\/+$/, "")
}

function normalizeRemoteDir(value) {
  return `/${String(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`
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

function secretSafeEndpoint(endpoint) {
  const safe = new URL(endpoint.toString())
  safe.searchParams.delete("token")
  safe.searchParams.delete("key")
  safe.searchParams.delete("api_key")

  return safe.toString()
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}

function waitSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

function tailForLog(value, maxLength = 500) {
  const text = String(value ?? "").trim()
  return text.length > maxLength ? text.slice(-maxLength) : text
}
