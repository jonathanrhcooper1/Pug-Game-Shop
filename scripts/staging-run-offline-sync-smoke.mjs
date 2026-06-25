import { randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"
import { stagingSshConnectConfig } from "./lib/staging-ssh.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const dryRun = process.argv.includes("--dry-run")
const siteUrl = normalizeSiteUrl(process.env.PUG_STAGING_SITE_URL || firstNonFlagArgument() || "")
const remoteUploadDir = normalizeRemoteDir(
  process.env.PUG_STAGING_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads",
)
const smokeId = `offline-sync-${timestampForRemoteName(new Date()).toLowerCase()}-${randomToken(6)}`
const pairingCode = `PAIR-${randomToken(16)}`
const installationId = `staging-sync-smoke-${smokeId}`
const batchId = `batch-${smokeId}`
const clientOperationId = `op-${smokeId}`
const smokeInventoryPublicId = stagingUuid()
const smokeLocationPublicId = stagingUuid()
const smokeSku = `PUG-OFFLINE-SMOKE-${randomToken(10).toUpperCase()}`
const remoteRunnerPath = `${remoteUploadDir}/offline-sync-smoke-${timestampForRemoteName(new Date())}.php`

const requiredEnv = {
  PUG_STAGING_SSH_HOST: process.env.PUG_STAGING_SSH_HOST,
  PUG_STAGING_SSH_USER: process.env.PUG_STAGING_SSH_USER,
  PUG_STAGING_SSH_PASSWORD: process.env.PUG_STAGING_SSH_PASSWORD,
}

const requestedScopes = [
  "offline_pull",
  "offline_push",
  "inventory",
  "customer_credit",
  "events",
  "conflicts",
]

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (!siteUrl) {
  missingEnv.push("PUG_STAGING_SITE_URL or staging site URL argument")
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "staging_offline_sync_smoke_dry_run",
        siteUrl: siteUrl || null,
        remoteRunnerPath,
        requiresEnv: [
          "PUG_STAGING_SITE_URL",
          "PUG_STAGING_SSH_HOST",
          "PUG_STAGING_SSH_USER",
          "PUG_STAGING_SSH_PASSWORD",
          "PUG_STAGING_CONFIRM_OFFLINE_SYNC_SMOKE",
        ],
        temporarilyEnablesFeatureFlag: "offline_sync",
        temporarilyEnablesRoutes: [
          "POST /offline/devices/register",
          "POST /offline/pull",
          "POST /offline/push",
        ],
        keepsRoutesDisabled: [
          "GET /offline/conflicts",
          "POST /offline/conflicts/{conflict_id}/resolve",
        ],
        restoresPreviousRouteAndFeatureSettings: true,
        writesTemporarySyncQueueRows: true,
        seedsTemporaryInventoryRow: true,
        removesSmokeInventoryRow: true,
        removesSmokeLocationRow: true,
        removesSmokeQueueRows: true,
        removesSmokeConflictRows: true,
        removesSmokeDeviceRow: true,
        canonicalInventoryWrites: false,
        squareWrites: false,
        paymentCapture: false,
        pairingCodePrinted: false,
        deviceTokenPrinted: false,
        credentialsPrinted: false,
        productionAllowed: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing staging offline sync smoke environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_STAGING_CONFIRM_OFFLINE_SYNC_SMOKE !== "run-staging-offline-sync-smoke") {
  throw new Error(
    "Set PUG_STAGING_CONFIRM_OFFLINE_SYNC_SMOKE=run-staging-offline-sync-smoke to run the staging offline sync smoke test.",
  )
}

const endpoints = {
  pairing: new URL("/wp-json/tcg-store/v1/offline/devices/register", siteUrl).toString(),
  pull: new URL("/wp-json/tcg-store/v1/offline/pull", siteUrl).toString(),
  push: new URL("/wp-json/tcg-store/v1/offline/push", siteUrl).toString(),
}

const runnerSource = `<?php
$payload = json_decode(stream_get_contents(STDIN), true);
if (!is_array($payload)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'invalid_payload'));
	exit(1);
}

$environment = function_exists('wp_get_environment_type') ? wp_get_environment_type() : (defined('WP_ENVIRONMENT_TYPE') ? WP_ENVIRONMENT_TYPE : '');
if ('staging' !== $environment && (!defined('TCG_STORE_PLATFORM_STAGING_MODE') || true !== TCG_STORE_PLATFORM_STAGING_MODE)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'staging_environment_required'));
	exit(1);
}
if (!class_exists('TCGStorePlatform\\\\Settings\\\\Settings') || !class_exists('TCGStorePlatform\\\\FeatureFlags\\\\FeatureFlags')) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
	exit(1);
}

$action = (string) ($payload['action'] ?? '');
$smoke_id = sanitize_key((string) ($payload['smoke_id'] ?? ''));
if ('' === $smoke_id) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'smoke_id_required'));
	exit(1);
}
$backup_option = 'tcg_store_platform_offline_sync_smoke_backup_' . $smoke_id;

if ('setup' === $action) {
	$settings = TCGStorePlatform\\Settings\\Settings::all();
	$flags = get_option(TCGStorePlatform\\FeatureFlags\\FeatureFlags::OPTION_NAME, TCGStorePlatform\\FeatureFlags\\FeatureFlags::defaults());
	$flags = is_array($flags) ? $flags : TCGStorePlatform\\FeatureFlags\\FeatureFlags::defaults();
	$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ids'));
	$manager_id = (int) ($admins[0] ?? 0);
	if ($manager_id <= 0) {
		echo wp_json_encode(array('status' => 'error', 'message' => 'staging_admin_required'));
		exit(1);
	}

	global $wpdb;
	$inventory_public_id = trim((string) ($payload['inventory_public_id'] ?? ''));
	$location_public_id = trim((string) ($payload['location_public_id'] ?? ''));
	$sku = strtoupper(trim((string) ($payload['sku'] ?? '')));
	if (!tcg_staging_offline_sync_smoke_uuid($inventory_public_id) || !tcg_staging_offline_sync_smoke_uuid($location_public_id)) {
		echo wp_json_encode(array('status' => 'error', 'message' => 'smoke_inventory_identity_invalid'));
		exit(1);
	}
	if ('' === $sku || !preg_match('/^[A-Z0-9-]{8,64}$/', $sku)) {
		echo wp_json_encode(array('status' => 'error', 'message' => 'smoke_inventory_sku_invalid'));
		exit(1);
	}
	if (!$wpdb instanceof wpdb) {
		echo wp_json_encode(array('status' => 'error', 'message' => 'wpdb_required'));
		exit(1);
	}

	$now = gmdate('Y-m-d H:i:s') . '.000000';
	$locations_table = $wpdb->prefix . 'tcg_inventory_locations';
	$inventory_table = $wpdb->prefix . 'tcg_inventory_items';
	$price_log_table = $wpdb->prefix . 'tcg_price_change_log';

	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$price_log_table} WHERE inventory_id IN (SELECT inventory_id FROM {$inventory_table} WHERE public_id = %s OR sku = %s OR barcode = %s)",
			array($inventory_public_id, $sku, $sku)
		)
	);
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$inventory_table} WHERE public_id = %s OR sku = %s OR barcode = %s",
			array($inventory_public_id, $sku, $sku)
		)
	);
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$locations_table} WHERE public_id = %s OR code = %s",
			array($location_public_id, 'OFFLINE-SMOKE')
		)
	);

	$location_inserted = $wpdb->insert(
		$locations_table,
		array(
			'public_id' => $location_public_id,
			'location_type' => 'showcase',
			'code' => 'OFFLINE-SMOKE',
			'name' => 'Offline Sync Smoke',
			'timezone' => 'America/New_York',
			'is_active' => 1,
			'sort_order' => 999,
			'created_at' => $now,
			'updated_at' => $now,
			'row_version' => 1,
		)
	);
	if (false === $location_inserted) {
		echo wp_json_encode(array('status' => 'error', 'message' => 'smoke_location_insert_failed'));
		exit(1);
	}
	$location_id = (int) $wpdb->insert_id;
	if ($location_id <= 0) {
		echo wp_json_encode(array('status' => 'error', 'message' => 'smoke_location_id_invalid'));
		exit(1);
	}

	$inventory_inserted = $wpdb->insert(
		$inventory_table,
		array(
			'public_id' => $inventory_public_id,
			'provider_name' => 'staging_offline_sync_smoke',
			'provider_card_id' => 'offline-sync-smoke-card',
			'game' => 'pokemon',
			'card_name' => 'Offline Sync Smoke Card',
			'set_name' => 'Smoke Test Set',
			'set_code' => 'SMK',
			'card_number' => '001',
			'printed_number' => '001/001',
			'year' => 2026,
			'rarity' => 'Common',
			'rarity_code' => 'C',
			'variant' => 'Smoke',
			'finish' => 'Regular',
			'language' => 'EN',
			'raw_or_graded' => 'raw',
			'condition_code' => 'NM',
			'barcode' => $sku,
			'sku' => $sku,
			'cost' => '0.0100',
			'cost_currency' => 'USD',
			'market_price' => '1.0000',
			'market_price_currency' => 'USD',
			'suggested_price' => '1.0000',
			'sale_price' => '1.0000',
			'minimum_sale_price' => '0.0100',
			'sale_currency' => 'USD',
			'pricing_source' => 'staging_offline_sync_smoke',
			'pricing_formula' => 'manual_smoke_seed',
			'price_lock' => 0,
			'price_floor_hit' => 0,
			'location_id' => $location_id,
			'online_visibility' => 'hidden',
			'kiosk_visibility' => 'hidden',
			'pos_visibility' => 'hidden',
			'status' => 'available',
			'notes' => 'Disposable staging offline sync smoke seed.',
			'staff_notes' => 'Seeded by staging-run-offline-sync-smoke.mjs',
			'date_acquired' => $now,
			'date_listed' => $now,
			'created_by' => $manager_id,
			'updated_by' => $manager_id,
			'created_at' => $now,
			'updated_at' => $now,
			'row_version' => 1,
		)
	);
	if (false === $inventory_inserted) {
		echo wp_json_encode(array('status' => 'error', 'message' => 'smoke_inventory_insert_failed'));
		exit(1);
	}

	update_option(
		$backup_option,
		array(
			'offline_pairing_authorization' => $settings['offline_pairing_authorization'] ?? array(),
			'offline_route_runtime' => $settings['offline_route_runtime'] ?? array(),
			'offline_sync_feature' => !empty($flags['offline_sync']),
		),
		false
	);

	$expires_at_utc = gmdate('Y-m-d\\TH:i:s\\Z', time() + HOUR_IN_SECONDS);
	$settings['offline_pairing_authorization'] = array(
		'pairing_code_hashes' => array(hash('sha256', strtoupper((string) ($payload['pairing_code'] ?? '')))),
		'manager_ids' => array($manager_id),
		'location_ids' => array($location_id),
		'allowed_scopes_by_mode' => array(
			'kiosk' => array(),
			'staff' => tcg_staging_offline_sync_smoke_scopes($payload['requested_scopes'] ?? array()),
			'admin' => array(),
		),
		'expires_at_utc' => $expires_at_utc,
	);
	$settings['offline_route_runtime'] = array(
		'device_pairing_route_enabled' => true,
		'pull_route_enabled' => true,
		'push_route_enabled' => true,
		'conflict_routes_enabled' => false,
	);
	update_option(TCGStorePlatform\\Settings\\Settings::OPTION_NAME, TCGStorePlatform\\Settings\\Settings::sanitize($settings), false);

	$flags['offline_sync'] = true;
	update_option(
		TCGStorePlatform\\FeatureFlags\\FeatureFlags::OPTION_NAME,
		TCGStorePlatform\\FeatureFlags\\FeatureFlags::sanitize($flags, 'staging'),
		false
	);

	echo wp_json_encode(array(
		'action' => 'staging_offline_sync_smoke_setup',
		'status' => 'ok',
		'backup_option' => $backup_option,
		'manager_id' => $manager_id,
		'location_id' => $location_id,
		'inventory_public_id' => $inventory_public_id,
		'inventory_row_seeded' => true,
		'location_row_seeded' => true,
		'expires_at_utc' => $expires_at_utc,
		'pairing_code_redacted' => true,
		'device_token_printed' => false,
		'pull_route_enabled' => true,
		'push_route_enabled' => true,
		'conflict_routes_enabled' => false,
		'canonical_inventory_writes_enabled' => false,
	));
	exit;
}

if ('cleanup' === $action) {
	$backup = get_option($backup_option, null);
	if (is_array($backup)) {
		$settings = TCGStorePlatform\\Settings\\Settings::all();
		$settings['offline_pairing_authorization'] = is_array($backup['offline_pairing_authorization'] ?? null)
			? $backup['offline_pairing_authorization']
			: array();
		$settings['offline_route_runtime'] = is_array($backup['offline_route_runtime'] ?? null)
			? $backup['offline_route_runtime']
			: array();
		update_option(TCGStorePlatform\\Settings\\Settings::OPTION_NAME, TCGStorePlatform\\Settings\\Settings::sanitize($settings), false);

		$flags = get_option(TCGStorePlatform\\FeatureFlags\\FeatureFlags::OPTION_NAME, TCGStorePlatform\\FeatureFlags\\FeatureFlags::defaults());
		$flags = is_array($flags) ? $flags : TCGStorePlatform\\FeatureFlags\\FeatureFlags::defaults();
		$flags['offline_sync'] = !empty($backup['offline_sync_feature']);
		update_option(
			TCGStorePlatform\\FeatureFlags\\FeatureFlags::OPTION_NAME,
			TCGStorePlatform\\FeatureFlags\\FeatureFlags::sanitize($flags, 'staging'),
			false
		);
	}
	delete_option($backup_option);

	global $wpdb;
	$device_id = trim((string) ($payload['device_id'] ?? ''));
	$batch_id = trim((string) ($payload['batch_id'] ?? ''));
	$client_operation_id = trim((string) ($payload['client_operation_id'] ?? ''));
	$inventory_public_id = trim((string) ($payload['inventory_public_id'] ?? ''));
	$location_public_id = trim((string) ($payload['location_public_id'] ?? ''));
	$sku = strtoupper(trim((string) ($payload['sku'] ?? '')));
	$device_rows_deleted = 0;
	$queue_rows_deleted = 0;
	$conflict_rows_deleted = 0;
	$inventory_rows_deleted = 0;
	$location_rows_deleted = 0;
	if ($wpdb instanceof wpdb) {
		if ('' !== $client_operation_id || '' !== $batch_id || '' !== $device_id) {
			$conflict_table = $wpdb->prefix . 'tcg_sync_conflicts';
			$queue_table = $wpdb->prefix . 'tcg_offline_sync_queue';
			$conflict_rows_deleted = (int) $wpdb->query(
				$wpdb->prepare(
					"DELETE FROM {$conflict_table} WHERE client_operation_id = %s OR batch_id = %s OR device_public_id = %s",
					array($client_operation_id, $batch_id, $device_id)
				)
			);
			$queue_rows_deleted = (int) $wpdb->query(
				$wpdb->prepare(
					"DELETE FROM {$queue_table} WHERE client_operation_id = %s OR batch_id = %s OR device_public_id = %s",
					array($client_operation_id, $batch_id, $device_id)
				)
			);
		}
		if ('' !== $device_id) {
			$device_table = $wpdb->prefix . 'tcg_offline_devices';
			$device_rows_deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$device_table} WHERE public_id = %s", array($device_id)));
		}
		if ('' !== $inventory_public_id || '' !== $sku) {
			$inventory_table = $wpdb->prefix . 'tcg_inventory_items';
			$price_log_table = $wpdb->prefix . 'tcg_price_change_log';
			$wpdb->query(
				$wpdb->prepare(
					"DELETE FROM {$price_log_table} WHERE inventory_id IN (SELECT inventory_id FROM {$inventory_table} WHERE public_id = %s OR sku = %s OR barcode = %s)",
					array($inventory_public_id, $sku, $sku)
				)
			);
			$inventory_rows_deleted = (int) $wpdb->query(
				$wpdb->prepare(
					"DELETE FROM {$inventory_table} WHERE public_id = %s OR sku = %s OR barcode = %s",
					array($inventory_public_id, $sku, $sku)
				)
			);
		}
		if ('' !== $location_public_id) {
			$locations_table = $wpdb->prefix . 'tcg_inventory_locations';
			$location_rows_deleted = (int) $wpdb->query(
				$wpdb->prepare(
					"DELETE FROM {$locations_table} WHERE public_id = %s OR code = %s",
					array($location_public_id, 'OFFLINE-SMOKE')
				)
			);
		}
	}

	echo wp_json_encode(array(
		'action' => 'staging_offline_sync_smoke_cleanup',
		'status' => 'ok',
		'backup_found' => is_array($backup),
		'backup_removed' => true,
		'device_rows_deleted' => $device_rows_deleted,
		'queue_rows_deleted' => $queue_rows_deleted,
		'conflict_rows_deleted' => $conflict_rows_deleted,
		'inventory_rows_deleted' => $inventory_rows_deleted,
		'location_rows_deleted' => $location_rows_deleted,
		'pairing_code_printed' => false,
		'device_token_printed' => false,
	));
	exit;
}

echo wp_json_encode(array('status' => 'error', 'message' => 'unsupported_action'));
exit(1);

function tcg_staging_offline_sync_smoke_scopes($value) {
	$allowed = array('offline_pull', 'offline_push', 'inventory', 'customer_credit', 'events', 'conflicts');
	$items = is_array($value) ? $value : array();
	$scopes = array();
	foreach ($items as $item) {
		$scope = strtolower(trim((string) $item));
		if (in_array($scope, $allowed, true) && !in_array($scope, $scopes, true)) {
			$scopes[] = $scope;
		}
	}
	return empty($scopes) ? $allowed : $scopes;
}

function tcg_staging_offline_sync_smoke_uuid($value) {
	return is_string($value) && 1 === preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i', $value);
}
`

let setup = null
let pairingResponse = null
let pullResponse = null
let pushResponse = null
let cleanup = null
let remoteRunnerWritten = false

try {
  setup = await withStagingConnection(async (connection) => {
    await writeRemoteFile(connection, remoteRunnerPath, runnerSource)
    remoteRunnerWritten = true

    return runRemotePayload(connection, "setup", {
      smoke_id: smokeId,
      pairing_code: pairingCode,
      requested_scopes: requestedScopes,
      inventory_public_id: smokeInventoryPublicId,
      location_public_id: smokeLocationPublicId,
      sku: smokeSku,
    })
  })

  if (setup.exitCode !== 0 || setup.parsed?.status !== "ok") {
    throw new Error(`Staging offline sync smoke setup failed: ${setup.stderrTail || setup.stdoutTail}`)
  }

  pairingResponse = await postJson(endpoints.pairing, {
    pairing_code: pairingCode,
    installation_id: installationId,
    device_label: "Staging Smoke Offline Sync App",
    device_mode: "staff",
    location_id: setup.parsed.location_id,
    manager_id: setup.parsed.manager_id,
    app_version: packageJson.version,
    platform: "windows",
    capabilities: {
      barcode_scanner: true,
      label_printer: false,
      receipt_printer: false,
      touchscreen: false,
      cash_drawer: false,
    },
    requested_scopes: requestedScopes,
    schema_version: 1,
  })

  const deviceId = pairingResponse?.json?.data?.device_id ?? ""
  const token = String(pairingResponse?.json?.data?.device_token ?? "")

  pullResponse = await postJson(
    endpoints.pull,
    {
      device_id: deviceId,
      domains: ["branding", "inventory", "customer_credit", "events", "conflicts"],
      cursors: {},
      page_size: 5,
      include_tombstones: true,
      schema_version: 1,
    },
    token,
  )

  pushResponse = await postJson(
    endpoints.push,
    {
      batch_id: batchId,
      device_id: deviceId,
      operations: [
        {
          client_operation_id: clientOperationId,
          device_id: deviceId,
          location_id: setup.parsed.location_id,
          actor_id: setup.parsed.manager_id,
          operation_type: "inventory_reservation",
          entity_type: "inventory",
          entity_id: smokeInventoryPublicId,
          base_row_version: 1,
          occurred_at_local: utcNow(),
          queued_at_utc: utcNow(),
          payload: {
            localStatus: "offline_pending_sync",
            holdReason: "staging offline sync smoke",
          },
          authorization_context: {
            manager_user_id: setup.parsed.manager_id,
            source: "staging_offline_sync_smoke",
          },
          schema_version: 1,
        },
      ],
    },
    token,
    {
      "Idempotency-Key": batchId,
    },
  )
} finally {
  cleanup = await cleanupSmokeRows(pairingResponse?.json?.data?.device_id ?? "")
}

const token = String(pairingResponse?.json?.data?.device_token ?? "")
const report = {
  action: "staging_offline_sync_smoke",
  siteUrl,
  endpoints,
  passed:
    setup?.parsed?.status === "ok" &&
    pairingResponse?.json?.status === "registered" &&
    pairingResponse?.json?.code === "offline_device_registered" &&
    isDeviceToken(token) &&
    pullResponse?.json?.code === "offline_pull_response_ready" &&
    pushResponse?.json?.code === "offline_push_response_ready" &&
    pushResponse?.json?.meta?.persistence_status === "persisted" &&
    pushResponse?.json?.meta?.push_queue_persistence_deferred === false &&
    pushResponse?.json?.meta?.push_canonical_mutations_deferred === true &&
    cleanup?.parsed?.status === "ok" &&
    Number.parseInt(String(cleanup?.parsed?.device_rows_deleted ?? "0"), 10) >= 1 &&
    Number.parseInt(String(cleanup?.parsed?.queue_rows_deleted ?? "0"), 10) >= 1 &&
    Number.parseInt(String(cleanup?.parsed?.inventory_rows_deleted ?? "0"), 10) >= 1 &&
    Number.parseInt(String(cleanup?.parsed?.location_rows_deleted ?? "0"), 10) >= 1,
  setup: redactSetup(setup?.parsed),
  pairing: {
    httpStatus: pairingResponse?.status ?? null,
    status: pairingResponse?.json?.status ?? null,
    statusCode: pairingResponse?.json?.status_code ?? null,
    code: pairingResponse?.json?.code ?? null,
    deviceId: pairingResponse?.json?.data?.device_id ?? null,
    tokenReceived: isDeviceToken(token),
    tokenLength: token.length || 0,
    tokenPrinted: false,
    pairingCodePrinted: false,
  },
  pull: {
    httpStatus: pullResponse?.status ?? null,
    status: pullResponse?.json?.status ?? null,
    code: pullResponse?.json?.code ?? null,
    domainCount: Array.isArray(pullResponse?.json?.data?.domains)
      ? pullResponse.json.data.domains.length
      : null,
    changeCount: pullResponse?.json?.data?.change_count ?? null,
    cursorAdvanceAttempted: pullResponse?.json?.meta?.cursor_advance_attempted ?? null,
    rawResponsePrinted: false,
  },
  push: {
    httpStatus: pushResponse?.status ?? null,
    status: pushResponse?.json?.status ?? null,
    code: pushResponse?.json?.code ?? null,
    errors: sanitizedErrors(pushResponse?.json?.errors),
    persistenceStatus: pushResponse?.json?.meta?.persistence_status ?? null,
    operationRowsAffected: pushResponse?.json?.meta?.operation_rows_affected ?? null,
    conflictRowsAffected: pushResponse?.json?.meta?.conflict_rows_affected ?? null,
    queuePersistenceDeferred: pushResponse?.json?.meta?.push_queue_persistence_deferred ?? null,
    canonicalMutationsDeferred: pushResponse?.json?.meta?.push_canonical_mutations_deferred ?? null,
    canonicalTransactionExecutionDeferred:
      pushResponse?.json?.meta?.push_canonical_mutation_transaction_execution_deferred ?? null,
    rawResponsePrinted: false,
  },
  cleanup: cleanup?.parsed ?? null,
  remoteRunner: basename(remoteRunnerPath),
  remoteRunnerRemoved: cleanup?.runnerRemoved ?? false,
  writesTemporarySyncQueueRows: true,
  seedsTemporaryInventoryRow: true,
  removesSmokeInventoryRow: true,
  removesSmokeLocationRow: true,
  canonicalInventoryWrites: false,
  squareWrites: false,
  paymentCapture: false,
  credentialsPrinted: false,
  deviceTokenPrinted: false,
  productionAllowed: false,
}

console.log(JSON.stringify(report, null, 2))

if (!report.passed) {
  process.exitCode = 1
}

async function cleanupSmokeRows(deviceId) {
  try {
    return await withStagingConnection(async (connection) => {
      if (!remoteRunnerWritten) {
        return {
          parsed: { status: "skipped", reason: "runner_not_written" },
          runnerRemoved: true,
        }
      }

      try {
        return await runRemotePayload(connection, "cleanup", {
          smoke_id: smokeId,
          device_id: deviceId,
          batch_id: batchId,
          client_operation_id: clientOperationId,
          inventory_public_id: smokeInventoryPublicId,
          location_public_id: smokeLocationPublicId,
          sku: smokeSku,
        })
      } finally {
        await execWithStdin(connection, `rm -f ${shellQuote(remoteRunnerPath)}`, "")
      }
    }).then((result) => ({ ...result, runnerRemoved: true }))
  } catch (error) {
    return {
      parsed: {
        status: "error",
        message: error instanceof Error ? error.message : "cleanup_failed",
      },
      runnerRemoved: false,
    }
  }
}

async function runRemotePayload(connection, action, payload) {
  const execution = await execWithStdin(
    connection,
    `cd /html && wp eval-file ${shellQuote(remoteRunnerPath)}`,
    JSON.stringify({ action, ...payload }),
  )
  const parsed = parseJson(execution.stdout)

  return {
    exitCode: execution.code,
    parsed,
    stdoutTail: execution.stdout.trim().slice(-500),
    stderrTail: execution.stderr.trim().slice(-500),
  }
}

async function postJson(url, body, bearerToken = "", extraHeaders = {}) {
  const headers = {
    Accept: "application/json",
    "Cache-Control": "no-cache",
    "Content-Type": "application/json",
    ...extraHeaders,
  }

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  const text = await response.text()

  return {
    status: response.status,
    json: parseJson(text),
  }
}

function withStagingConnection(callback) {
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
      .connect(stagingSshConnectConfig(requiredEnv))
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

function redactSetup(parsed) {
  if (!parsed) {
    return null
  }

  return {
    action: parsed.action,
    status: parsed.status,
    managerId: parsed.manager_id,
    locationId: parsed.location_id,
    expiresAtUtc: parsed.expires_at_utc,
    pairingCodeRedacted: true,
    deviceTokenPrinted: false,
    pullRouteEnabled: parsed.pull_route_enabled,
    pushRouteEnabled: parsed.push_route_enabled,
    conflictRoutesEnabled: parsed.conflict_routes_enabled,
    canonicalInventoryWritesEnabled: parsed.canonical_inventory_writes_enabled,
  }
}

function normalizeSiteUrl(value) {
  const trimmed = String(value ?? "").trim()

  if (!trimmed) {
    return ""
  }

  const parsed = new URL(trimmed)
  parsed.pathname = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "")
  parsed.search = ""
  parsed.hash = ""

  return parsed.toString()
}

function firstNonFlagArgument() {
  return process.argv.slice(2).find((argument) => !argument.startsWith("-")) ?? ""
}

function normalizeRemoteDir(value) {
  return `/${String(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`
}

function parseJson(value) {
  try {
    return JSON.parse(String(value).trim())
  } catch {
    return null
  }
}

function randomToken(bytes) {
  return randomBytes(bytes).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
}

function utcNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
}

function isDeviceToken(value) {
  return /^[a-zA-Z0-9._:-]{32,256}$/.test(String(value))
}

function sanitizedErrors(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item).replace(/[A-Fa-f0-9]{64}/g, "[redacted-token]"))
    .slice(0, 10)
}

function stagingUuid() {
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const value = bytes.toString("hex")

  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20),
  ].join("-")
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}
