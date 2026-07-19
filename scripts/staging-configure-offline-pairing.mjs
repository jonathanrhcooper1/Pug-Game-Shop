import { readFileSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"
import { stagingSshConnectConfig } from "./lib/staging-ssh.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const dryRun = process.argv.includes("--dry-run")
const statusOnly = process.argv.includes("--status")
const remoteUploadDir = normalizeRemoteDir(
  process.env.PUG_STAGING_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads",
)
const remoteRunnerPath = `${remoteUploadDir}/offline-pairing-configure-${timestampForRemoteName(
  new Date(),
)}.php`

const requiredEnv = {
  PUG_STAGING_SSH_HOST: process.env.PUG_STAGING_SSH_HOST,
  PUG_STAGING_SSH_USER: process.env.PUG_STAGING_SSH_USER,
  PUG_STAGING_SSH_PASSWORD: process.env.PUG_STAGING_SSH_PASSWORD,
}

const deviceMode = safeChoice(
  process.env.TCG_OFFLINE_PAIRING_MODE ?? process.env.OFFLINE_PAIRING_MODE,
  ["kiosk", "staff", "admin"],
  "staff",
)
const pairingCode = String(
  process.env.TCG_OFFLINE_PAIRING_CODE ?? process.env.OFFLINE_PAIRING_CODE ?? "",
).trim()
const requestedScopes = allowedScopes(
  csvItems(process.env.TCG_OFFLINE_PAIRING_SCOPES ?? process.env.OFFLINE_PAIRING_SCOPES ?? ""),
  defaultScopesForMode(deviceMode),
)
const expiresAtUtc = utcExpiry(
  process.env.TCG_OFFLINE_PAIRING_EXPIRES_AT_UTC ??
    process.env.OFFLINE_PAIRING_EXPIRES_AT_UTC ??
    "",
  process.env.TCG_OFFLINE_PAIRING_EXPIRES_HOURS ??
    process.env.OFFLINE_PAIRING_EXPIRES_HOURS ??
    "24",
)
const pairingPayload = {
  action: statusOnly ? "status" : "configure",
  version: packageJson.version,
  pairing_code: pairingCode,
  device_mode: deviceMode,
  manager_ids: positiveIntList(
    process.env.TCG_OFFLINE_PAIRING_MANAGER_IDS ?? process.env.OFFLINE_PAIRING_MANAGER_IDS ?? "",
  ),
  location_ids: positiveIntList(
    process.env.TCG_OFFLINE_PAIRING_LOCATION_IDS ??
      process.env.OFFLINE_PAIRING_LOCATION_IDS ??
      "1",
  ),
  scopes: requestedScopes,
  expires_at_utc: expiresAtUtc,
  route_runtime: {
    device_pairing_route_enabled: true,
    pull_route_enabled: envFlag(
      process.env.TCG_OFFLINE_ENABLE_PULL_ROUTE ?? process.env.OFFLINE_ENABLE_PULL_ROUTE,
      false,
    ),
    push_route_enabled: envFlag(
      process.env.TCG_OFFLINE_ENABLE_PUSH_ROUTE ?? process.env.OFFLINE_ENABLE_PUSH_ROUTE,
      false,
    ),
    conflict_routes_enabled: envFlag(
      process.env.TCG_OFFLINE_ENABLE_CONFLICT_ROUTES ?? process.env.OFFLINE_ENABLE_CONFLICT_ROUTES,
      false,
    ),
  },
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (!statusOnly && !pairingPayload.pairing_code) {
  missingEnv.push("TCG_OFFLINE_PAIRING_CODE or OFFLINE_PAIRING_CODE")
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "staging_offline_pairing_configure_dry_run",
        statusOnly,
        remoteRunnerPath,
        requiresEnv: statusOnly
          ? ["PUG_STAGING_SSH_HOST", "PUG_STAGING_SSH_USER", "PUG_STAGING_SSH_PASSWORD"]
          : [
              "PUG_STAGING_SSH_HOST",
              "PUG_STAGING_SSH_USER",
              "PUG_STAGING_SSH_PASSWORD",
              "TCG_OFFLINE_PAIRING_CODE or OFFLINE_PAIRING_CODE",
              "PUG_STAGING_CONFIRM_OFFLINE_PAIRING",
            ],
        optionalEnv: [
          "TCG_OFFLINE_PAIRING_MODE",
          "TCG_OFFLINE_PAIRING_MANAGER_IDS",
          "TCG_OFFLINE_PAIRING_LOCATION_IDS",
          "TCG_OFFLINE_PAIRING_SCOPES",
          "TCG_OFFLINE_PAIRING_EXPIRES_HOURS",
          "TCG_OFFLINE_PAIRING_EXPIRES_AT_UTC",
          "TCG_OFFLINE_ENABLE_PULL_ROUTE",
          "TCG_OFFLINE_ENABLE_PUSH_ROUTE",
          "TCG_OFFLINE_ENABLE_CONFLICT_ROUTES",
        ],
        writesWordPressSettings: !statusOnly,
        enablesDevicePairingRoute: !statusOnly,
        enablesPullRoute: pairingPayload.route_runtime.pull_route_enabled,
        enablesPushRoute: pairingPayload.route_runtime.push_route_enabled,
        enablesConflictRoutes: pairingPayload.route_runtime.conflict_routes_enabled,
        issuesDeviceTokens: false,
        writesWordPressData: false,
        runsSyncNetworkRequest: false,
        pairingCodePrinted: false,
        pairingCodeHashPrinted: false,
        rawResponsePrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing staging offline pairing environment variables: ${missingEnv.join(", ")}`)
}

if (
  !statusOnly &&
  process.env.PUG_STAGING_CONFIRM_OFFLINE_PAIRING !== "configure-staging-offline-pairing"
) {
  throw new Error(
    "Set PUG_STAGING_CONFIRM_OFFLINE_PAIRING=configure-staging-offline-pairing to update staging offline pairing settings.",
  )
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
if (!class_exists('TCGStorePlatform\\\\Settings\\\\Settings')) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
	exit(1);
}

$settings = get_option(TCGStorePlatform\\Settings\\Settings::OPTION_NAME, TCGStorePlatform\\Settings\\Settings::defaults());
if (!is_array($settings)) {
	$settings = TCGStorePlatform\\Settings\\Settings::defaults();
}
$settings = array_merge(TCGStorePlatform\\Settings\\Settings::defaults(), $settings);

if ('configure' === ($payload['action'] ?? '')) {
	$raw_code = strtoupper(trim((string) ($payload['pairing_code'] ?? '')));
	if (1 !== preg_match('/^[A-Z0-9-]{6,32}$/', $raw_code)) {
		echo wp_json_encode(array('status' => 'error', 'message' => 'invalid_pairing_code_shape'));
		exit(1);
	}

	$mode = tcg_staging_pairing_mode($payload['device_mode'] ?? 'staff');
	$manager_ids = tcg_staging_positive_ids($payload['manager_ids'] ?? array());
	if (empty($manager_ids)) {
		$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ids'));
		if (!empty($admins)) {
			$manager_ids = array((int) $admins[0]);
		}
	}
	$location_ids = tcg_staging_positive_ids($payload['location_ids'] ?? array());
	if (empty($location_ids)) {
		$location_ids = array(1);
	}

	$scopes = tcg_staging_scopes($payload['scopes'] ?? array(), $mode);
	$expires_at_utc = tcg_staging_expiry($payload['expires_at_utc'] ?? '');
	$existing_policy = is_array($settings['offline_pairing_authorization'] ?? null)
		? $settings['offline_pairing_authorization']
		: array();
	$hashes = is_array($existing_policy['pairing_code_hashes'] ?? null)
		? $existing_policy['pairing_code_hashes']
		: array();
	$hashes[] = hash('sha256', $raw_code);
	$scopes_by_mode = is_array($existing_policy['allowed_scopes_by_mode'] ?? null)
		? $existing_policy['allowed_scopes_by_mode']
		: array();
	$scopes_by_mode[$mode] = $scopes;

	$settings['offline_pairing_authorization'] = array(
		'pairing_code_hashes' => $hashes,
		'manager_ids' => $manager_ids,
		'location_ids' => $location_ids,
		'allowed_scopes_by_mode' => $scopes_by_mode,
		'expires_at_utc' => $expires_at_utc,
	);

	$route_payload = is_array($payload['route_runtime'] ?? null) ? $payload['route_runtime'] : array();
	$route_runtime = is_array($settings['offline_route_runtime'] ?? null)
		? $settings['offline_route_runtime']
		: array();
	$settings['offline_route_runtime'] = array_merge(
		$route_runtime,
		array(
			'device_pairing_route_enabled' => !empty($route_payload['device_pairing_route_enabled']),
			'pull_route_enabled' => !empty($route_payload['pull_route_enabled']),
			'push_route_enabled' => !empty($route_payload['push_route_enabled']),
			'conflict_routes_enabled' => !empty($route_payload['conflict_routes_enabled']),
		)
	);

	$settings = TCGStorePlatform\\Settings\\Settings::sanitize($settings);
	update_option(TCGStorePlatform\\Settings\\Settings::OPTION_NAME, $settings, false);
}

$settings = TCGStorePlatform\\Settings\\Settings::all();
$policy = TCGStorePlatform\\Settings\\OfflinePairingAuthorizationSettings::policy($settings);
$route_runtime = TCGStorePlatform\\Settings\\OfflineRouteRuntimeSettings::from_settings($settings);
$configured_modes = array();
foreach (($policy['allowed_scopes_by_mode'] ?? array()) as $mode => $scopes) {
	if (is_array($scopes) && count($scopes) > 0) {
		$configured_modes[] = $mode;
	}
}

echo wp_json_encode(array(
	'action' => 'configure' === ($payload['action'] ?? '') ? 'staging_offline_pairing_configured' : 'staging_offline_pairing_status_checked',
	'status' => 'ok',
	'plugin_version' => defined('TCG_STORE_PLATFORM_VERSION') ? TCG_STORE_PLATFORM_VERSION : (string) ($payload['version'] ?? ''),
	'pairing_policy' => array(
		'pairing_code_hash_count' => count($policy['pairing_code_hashes'] ?? array()),
		'pairing_code_values_redacted' => true,
		'pairing_code_hashes_redacted' => true,
		'manager_count' => count($policy['manager_ids'] ?? array()),
		'location_count' => count($policy['location_ids'] ?? array()),
		'configured_modes' => $configured_modes,
		'expires_at_utc' => (string) ($policy['expires_at_utc'] ?? ''),
	),
	'route_runtime' => array(
		'device_pairing_route_enabled' => !empty($route_runtime['device_pairing_route_enabled']),
		'pull_route_enabled' => !empty($route_runtime['pull_route_enabled']),
		'push_route_enabled' => !empty($route_runtime['push_route_enabled']),
		'conflict_routes_enabled' => !empty($route_runtime['conflict_routes_enabled']),
	),
	'issues_device_tokens' => false,
	'writes_wordpress_data' => false,
	'runs_sync_network_request' => false,
	'pairing_code_printed' => false,
	'pairing_code_hash_printed' => false,
));

function tcg_staging_pairing_mode($value) {
	$value = strtolower(trim((string) $value));
	return in_array($value, array('kiosk', 'staff', 'admin'), true) ? $value : 'staff';
}

function tcg_staging_positive_ids($value) {
	$items = is_array($value) ? $value : preg_split('/[\\s,]+/', trim((string) $value));
	$ids = array();
	foreach (false === $items ? array() : $items as $item) {
		if (1 !== preg_match('/^\\d+$/', (string) $item)) {
			continue;
		}
		$id = (int) $item;
		if ($id > 0 && !in_array($id, $ids, true)) {
			$ids[] = $id;
		}
	}
	return $ids;
}

function tcg_staging_scopes($value, $mode) {
	$allowed = array('offline_pull', 'offline_push', 'inventory', 'kiosk', 'customer_credit', 'events', 'buylist', 'conflicts');
	$items = is_array($value) ? $value : preg_split('/[\\s,]+/', trim((string) $value));
	$scopes = array();
	foreach (false === $items ? array() : $items as $item) {
		$scope = strtolower(trim((string) $item));
		if (in_array($scope, $allowed, true) && !in_array($scope, $scopes, true)) {
			$scopes[] = $scope;
		}
	}
	if (!empty($scopes)) {
		return $scopes;
	}
	if ('kiosk' === $mode) {
		return array('offline_pull', 'offline_push', 'inventory', 'kiosk', 'events', 'conflicts');
	}
	if ('admin' === $mode) {
		return $allowed;
	}
	return array('offline_pull', 'offline_push', 'inventory', 'customer_credit', 'events', 'buylist', 'conflicts');
}

function tcg_staging_expiry($value) {
	$value = trim((string) $value);
	if (1 === preg_match('/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z$/', $value)) {
		return $value;
	}
	return gmdate('Y-m-d\\TH:i:s\\Z', time() + DAY_IN_SECONDS);
}
`

const result = await withStagingConnection(async (connection) => {
  await writeRemoteFile(connection, remoteRunnerPath, runnerSource)

  try {
    const execution = await execWithStdin(
      connection,
      `cd /html && wp eval-file ${shellQuote(remoteRunnerPath)}`,
      JSON.stringify(pairingPayload),
    )
    const parsed = parseJson(execution.stdout)

    return {
      action: statusOnly
        ? "staging_offline_pairing_status_checked"
        : "staging_offline_pairing_configured",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      pairingPolicy: parsed?.pairing_policy ?? null,
      routeRuntime: parsed?.route_runtime ?? null,
      runnerRemoved: false,
      writesWordPressSettings: !statusOnly,
      issuesDeviceTokens: false,
      writesWordPressData: false,
      runsSyncNetworkRequest: false,
      pairingCodePrinted: false,
      pairingCodeHashPrinted: false,
      rawResponsePrinted: false,
      stderrTail: execution.stderr.trim().slice(-500),
    }
  } finally {
    await execWithStdin(connection, `rm -f ${shellQuote(remoteRunnerPath)}`, "")
  }
})

result.runnerRemoved = true

console.log(JSON.stringify(result, null, 2))

if (result.exitCode !== 0 || result.status !== "ok") {
  process.exitCode = 1
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

function parseJson(value) {
  try {
    return JSON.parse(value.trim())
  } catch {
    return null
  }
}

function normalizeRemoteDir(value) {
  return `/${String(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`
}

function safeChoice(value, allowed, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase()

  return allowed.includes(normalized) ? normalized : fallback
}

function csvItems(value) {
  return String(value ?? "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function positiveIntList(value) {
  const ids = []

  for (const item of csvItems(value)) {
    if (!/^\d+$/.test(item)) {
      continue
    }

    const id = Number.parseInt(item, 10)

    if (id > 0 && !ids.includes(id)) {
      ids.push(id)
    }
  }

  return ids
}

function allowedScopes(items, fallback) {
  const allowed = new Set([
    "offline_pull",
    "offline_push",
    "inventory",
    "kiosk",
    "customer_credit",
    "events",
    "buylist",
    "conflicts",
  ])
  const scopes = []

  for (const item of items) {
    const scope = item.toLowerCase()

    if (allowed.has(scope) && !scopes.includes(scope)) {
      scopes.push(scope)
    }
  }

  return scopes.length > 0 ? scopes : fallback
}

function defaultScopesForMode(mode) {
  if (mode === "kiosk") {
    return ["offline_pull", "offline_push", "inventory", "kiosk", "events", "conflicts"]
  }

  if (mode === "admin") {
    return [
      "offline_pull",
      "offline_push",
      "inventory",
      "kiosk",
      "customer_credit",
      "events",
      "buylist",
      "conflicts",
    ]
  }

  return [
    "offline_pull",
    "offline_push",
    "inventory",
    "customer_credit",
    "events",
    "buylist",
    "conflicts",
  ]
}

function utcExpiry(value, hoursValue) {
  const normalized = String(value ?? "").trim()

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(normalized)) {
    return normalized
  }

  const hours = clampInt(hoursValue, 1, 168, 24)

  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString().replace(/\.\d+Z$/, "Z")
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

function envFlag(value, fallback) {
  if (value === undefined) {
    return fallback
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase())
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}
