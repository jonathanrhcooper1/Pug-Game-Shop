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
const confirmValue = "run-production-local-sync-inventory-smoke"
const localSyncServerUrl = normalizeBaseUrl(
  firstEnv("LOCAL_SYNC_SERVER_URL", "PUG_LOCAL_SYNC_PUBLIC_URL") ?? "http://127.0.0.1:8787",
)
const wordpressUrl = normalizeBaseUrl(firstEnv("PUG_WORDPRESS_URL", "LOCAL_SYNC_WORDPRESS_URL") ?? "")
const restBasePath = normalizeRestBase(firstEnv("PUG_WORDPRESS_REST_BASE", "LOCAL_SYNC_WORDPRESS_REST_BASE"))
const wpRestBase = wordpressUrl ? `${wordpressUrl}${restBasePath}` : ""
const remoteUploadDir = normalizeRemoteDir(process.env.PUG_PROD_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteRunnerPath = `${remoteUploadDir}/local-sync-production-inventory-smoke-${timestampForRemoteName(
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
const expectations = {
  localSyncServerUrl,
  wordpressUrl,
  wpRestBase,
  remoteRunnerPath,
  wpPath,
  wpCli,
  barcode: smoke.barcode,
  cardName: smoke.cardName,
  onlineVisibility: "hidden",
  kioskVisibility: "hidden",
  posVisibility: "hidden",
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_local_sync_inventory_smoke_dry_run",
        expectations,
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_LOCAL_SYNC_INVENTORY_SMOKE",
          "PUG_WORDPRESS_URL",
          "PUG_WORDPRESS_USERNAME",
          "PUG_WORDPRESS_APP_PASSWORD",
        ],
        optionalEnv: [
          "LOCAL_SYNC_SERVER_URL",
          "LOCAL_SYNC_MANAGER_PIN",
          "PUG_WORDPRESS_REST_BASE",
          "LOCAL_SYNC_SQLITE_PATH",
        ],
        readsIgnoredEnvFiles: [".env.production.local", ".env.local-sync", ".env.local"],
        createsLocalIntake: true,
        pushesToWordPress: true,
        wordpressVisibility: {
          online: "hidden",
          kiosk: "hidden",
          pos: "hidden",
        },
        cleansWordPressRowsByBarcode: true,
        cleansLocalRowsByBarcode: true,
        productionApprovalRequired: true,
        credentialsPrinted: false,
        rawResponsePrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing production local sync inventory smoke environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_LOCAL_SYNC_INVENTORY_SMOKE !== confirmValue) {
  throw new Error(
    `Set PUG_PROD_CONFIRM_LOCAL_SYNC_INVENTORY_SMOKE=${confirmValue} to run the production local sync inventory smoke.`,
  )
}

if (!localSyncServerUrl || !wordpressUrl || !wpRestBase) {
  throw new Error("Local sync server URL and WordPress URL are required.")
}

const cleanupSummary = {
  attempted: false,
  wordpress: null,
  local: null,
}
let smokeResult = null

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

  const intake = await localSyncRequest("/inventory/intake", {
    method: "POST",
    token: auth.session.token,
    body: {
      card_name: smoke.cardName,
      set_name: "Codex Production Smoke",
      condition: "RAW",
      barcode: smoke.barcode,
      price_minor_units: 123,
      location: "Production Smoke Hidden",
      quantity: 1,
      provider_card_id: "codex-local-sync-smoke",
      game: "pokemon",
      set_code: "SMOKE",
      card_number: "001",
      printed_number: "001/001",
      image_url: "https://images.scrydex.com/pokemon/mcd24-1/large",
      online_visibility: "hidden",
      kiosk_visibility: "hidden",
      pos_visibility: "hidden",
    },
  })

  if (intake.status !== "ok" || !intake.item?.public_id) {
    throw new Error(`Local sync intake failed: ${intake.code ?? intake.status}`)
  }

  const push = await localSyncRequest("/sync/push", {
    method: "POST",
    token: auth.session.token,
    body: {},
  })

  if (push.status !== "ok") {
    throw new Error(`Local sync push failed: ${push.code ?? push.status}`)
  }

  const accepted = Array.isArray(push.results)
    ? push.results.find((result) => result.entity_id === intake.item.public_id && result.status === "accepted")
    : null

  const directSearch = await wordpressInventorySearch(smoke.barcode)

  smokeResult = {
    action: "production_local_sync_inventory_smoke",
    status: accepted ? "ok" : "push_not_accepted",
    localIntake: {
      publicId: intake.item.public_id,
      barcode: intake.item.barcode,
      status: intake.item.status,
      onlineVisibility: intake.item.online_visibility,
      kioskVisibility: intake.item.kiosk_visibility,
      posVisibility: intake.item.pos_visibility,
      credentialsPrinted: false,
    },
    push: {
      acceptedCount: Number(push.accepted_count ?? 0),
      retryCount: Number(push.retry_count ?? 0),
      rejectedCount: Number(push.rejected_count ?? 0),
      unsupportedOperationCount: Number(push.unsupported_operation_count ?? 0),
      localQueueDepth: Number(push.local_queue_depth ?? 0),
      wordpressInventoryPushConnected: Boolean(push.wordpress_inventory_push_connected),
      acceptedEntity: accepted?.entity_id ?? "",
      wordpressInventory: safeWordPressInventory(accepted?.wordpress_inventory),
    },
    wordpressSearch: directSearch,
    checks: buildChecks({ intake, push, accepted, directSearch }),
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
      name: "wordpress_cleanup_deleted_smoke_row",
      pass: Number(cleanupSummary.wordpress?.inventoryRowsDeleted ?? 0) >= 1,
      expected: ">=1",
      actual: cleanupSummary.wordpress?.inventoryRowsDeleted ?? null,
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
  const barcode = `CODEX-LSYNC-${id}`.slice(0, 64)

  return {
    id,
    barcode,
    cardName: "Codex Hidden Local Sync Smoke",
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

async function wordpressInventorySearch(barcode) {
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
  endpoint.searchParams.set("status", "pending_intake")
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

async function cleanupWordPressSmoke(smokePayload) {
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
          }),
        )
        const parsed = parseJson(execution.stdout)

        return {
          status: parsed?.status ?? "unknown",
          exitCode: execution.code,
          inventoryRowsMatched: Number(parsed?.inventory_rows_matched ?? 0),
          inventoryRowsDeleted: Number(parsed?.inventory_rows_deleted ?? 0),
          priceRowsDeleted: Number(parsed?.price_rows_deleted ?? 0),
          matchedVisibility: parsed?.matched_visibility ?? null,
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
      serverRestartRecommended: inventoryRowsDeleted > 0,
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
        price_change_log_persisted: Boolean(value.price_change_log_persisted),
      }
    : null
}

function buildChecks({ intake, push, accepted, directSearch }) {
  return [
    {
      name: "local_intake_created",
      pass: intake?.status === "ok" && intake?.item?.barcode === smoke.barcode,
      expected: smoke.barcode,
      actual: intake?.item?.barcode ?? null,
    },
    {
      name: "local_visibility_hidden",
      pass:
        intake?.item?.online_visibility === "hidden" &&
        intake?.item?.kiosk_visibility === "hidden" &&
        intake?.item?.pos_visibility === "hidden",
      expected: "hidden/hidden/hidden",
      actual: `${intake?.item?.online_visibility ?? ""}/${intake?.item?.kiosk_visibility ?? ""}/${
        intake?.item?.pos_visibility ?? ""
      }`,
    },
    {
      name: "wordpress_push_connected",
      pass: push?.wordpress_inventory_push_connected === true,
      expected: true,
      actual: push?.wordpress_inventory_push_connected ?? null,
    },
    {
      name: "push_accepted_inventory_operation",
      pass: Boolean(accepted),
      expected: true,
      actual: Boolean(accepted),
    },
    {
      name: "wordpress_search_matched",
      pass: directSearch?.matched === true || directSearch?.skipped === true,
      expected: true,
      actual: directSearch?.matched ?? (directSearch?.skipped ? "skipped" : null),
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
$card_name = trim((string) ($payload['card_name'] ?? ''));
if ('' === $barcode || !preg_match('/^CODEX-LSYNC-[A-Z0-9]{8,64}$/', $barcode)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'barcode_invalid'));
	exit(1);
}
$inventory_table = $wpdb->prefix . 'tcg_inventory_items';
$price_log_table = $wpdb->prefix . 'tcg_price_change_log';
$rows = $wpdb->get_results(
	$wpdb->prepare(
		"SELECT inventory_id, public_id, barcode, sku, card_name, status, online_visibility, kiosk_visibility, pos_visibility FROM {$inventory_table} WHERE barcode = %s OR sku = %s",
		array($barcode, $barcode)
	),
	ARRAY_A
);
$matched = array();
foreach ((array) $rows as $row) {
	if ($card_name === (string) ($row['card_name'] ?? '')) {
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
$first = $matched[0] ?? array();
echo wp_json_encode(array(
	'action' => 'production_local_sync_inventory_smoke_cleanup',
	'status' => 'ok',
	'inventory_rows_matched' => count($matched),
	'inventory_rows_deleted' => $inventory_rows_deleted,
	'price_rows_deleted' => $price_rows_deleted,
	'matched_visibility' => array(
		'status' => (string) ($first['status'] ?? ''),
		'online' => (string) ($first['online_visibility'] ?? ''),
		'kiosk' => (string) ($first['kiosk_visibility'] ?? ''),
		'pos' => (string) ($first['pos_visibility'] ?? ''),
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

function tailForLog(value, maxLength = 500) {
  const text = String(value ?? "").trim()
  return text.length > maxLength ? text.slice(-maxLength) : text
}
