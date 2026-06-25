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
const smokeId = `offline-pairing-${timestampForRemoteName(new Date()).toLowerCase()}-${randomToken(6)}`
const pairingCode = `PAIR-${randomToken(16)}`
const installationId = `staging-smoke-${smokeId}`
const remoteRunnerPath = `${remoteUploadDir}/offline-pairing-smoke-${timestampForRemoteName(
  new Date(),
)}.php`

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
        action: "staging_offline_pairing_smoke_dry_run",
        siteUrl: siteUrl || null,
        remoteRunnerPath,
        requiresEnv: [
          "PUG_STAGING_SITE_URL",
          "PUG_STAGING_SSH_HOST",
          "PUG_STAGING_SSH_USER",
          "PUG_STAGING_SSH_PASSWORD",
          "PUG_STAGING_CONFIRM_OFFLINE_PAIRING_SMOKE",
        ],
        temporarilyEnablesFeatureFlag: "offline_sync",
        temporarilyEnablesRoutes: ["POST /offline/devices/register"],
        keepsRoutesDisabled: [
          "POST /offline/pull",
          "POST /offline/push",
          "GET /offline/conflicts",
          "POST /offline/conflicts/{conflict_id}/resolve",
        ],
        restoresPreviousRouteAndFeatureSettings: true,
        removesSmokeDeviceRow: true,
        pairingCodePrinted: false,
        deviceTokenPrinted: false,
        credentialsPrinted: false,
        writesBusinessData: false,
        productionAllowed: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing staging offline pairing smoke environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_STAGING_CONFIRM_OFFLINE_PAIRING_SMOKE !== "run-staging-offline-pairing-smoke") {
  throw new Error(
    "Set PUG_STAGING_CONFIRM_OFFLINE_PAIRING_SMOKE=run-staging-offline-pairing-smoke to run the staging pairing smoke test.",
  )
}

const pairingUrl = new URL("/wp-json/tcg-store/v1/offline/devices/register", siteUrl).toString()
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
$backup_option = 'tcg_store_platform_pairing_smoke_backup_' . $smoke_id;

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
		'location_ids' => array(1),
		'allowed_scopes_by_mode' => array(
			'kiosk' => array(),
			'staff' => tcg_staging_pairing_smoke_scopes($payload['requested_scopes'] ?? array()),
			'admin' => array(),
		),
		'expires_at_utc' => $expires_at_utc,
	);
	$settings['offline_route_runtime'] = array(
		'device_pairing_route_enabled' => true,
		'pull_route_enabled' => false,
		'push_route_enabled' => false,
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
		'action' => 'staging_offline_pairing_smoke_setup',
		'status' => 'ok',
		'backup_option' => $backup_option,
		'manager_id' => $manager_id,
		'location_id' => 1,
		'expires_at_utc' => $expires_at_utc,
		'pairing_code_redacted' => true,
		'device_token_printed' => false,
		'pull_route_enabled' => false,
		'push_route_enabled' => false,
		'conflict_routes_enabled' => false,
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
	$public_id = trim((string) ($payload['device_id'] ?? ''));
	$deleted = 0;
	if ($wpdb instanceof wpdb && '' !== $public_id) {
		$table = $wpdb->prefix . 'tcg_offline_devices';
		$deleted = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$table} WHERE public_id = %s", array($public_id)));
	}

	echo wp_json_encode(array(
		'action' => 'staging_offline_pairing_smoke_cleanup',
		'status' => 'ok',
		'backup_found' => is_array($backup),
		'backup_removed' => true,
		'smoke_device_rows_deleted' => $deleted,
		'pairing_code_printed' => false,
		'device_token_printed' => false,
	));
	exit;
}

echo wp_json_encode(array('status' => 'error', 'message' => 'unsupported_action'));
exit(1);

function tcg_staging_pairing_smoke_scopes($value) {
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
`

let setup = null
let pairingResponse = null
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
    })
  })

  if (setup.exitCode !== 0 || setup.parsed?.status !== "ok") {
    throw new Error(`Staging pairing smoke setup failed: ${setup.stderrTail || setup.stdoutTail}`)
  }

  const pairBody = {
    pairing_code: pairingCode,
    installation_id: installationId,
    device_label: "Staging Smoke Offline App",
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
  }

  pairingResponse = await postPairingRequest(pairingUrl, pairBody)
} finally {
  cleanup = await cleanupSmokeDevice(pairingResponse?.json?.data?.device_id ?? "")
}

const token = String(pairingResponse?.json?.data?.device_token ?? "")
const report = {
  action: "staging_offline_pairing_smoke",
  siteUrl,
  pairingUrl,
  passed:
    setup?.parsed?.status === "ok" &&
    pairingResponse?.json?.status === "registered" &&
    pairingResponse?.json?.status_code === 201 &&
    pairingResponse?.json?.code === "offline_device_registered" &&
    isDeviceToken(token) &&
    cleanup?.parsed?.status === "ok" &&
    Number.parseInt(String(cleanup?.parsed?.smoke_device_rows_deleted ?? "0"), 10) >= 1,
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
    syncRoutes: pairingResponse?.json?.data?.sync_routes ?? null,
    firstSyncRequired: pairingResponse?.json?.data?.first_sync_required ?? null,
    brandingSyncRequired: pairingResponse?.json?.data?.branding_sync_required ?? null,
  },
  cleanup: cleanup?.parsed ?? null,
  remoteRunner: basename(remoteRunnerPath),
  remoteRunnerRemoved: cleanup?.runnerRemoved ?? false,
  credentialsPrinted: false,
  writesBusinessData: false,
  productionAllowed: false,
}

console.log(JSON.stringify(report, null, 2))

if (!report.passed) {
  process.exitCode = 1
}

async function cleanupSmokeDevice(deviceId) {
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

async function postPairingRequest(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
    },
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

function isDeviceToken(value) {
  return /^[a-zA-Z0-9._:-]{32,256}$/.test(String(value))
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}
