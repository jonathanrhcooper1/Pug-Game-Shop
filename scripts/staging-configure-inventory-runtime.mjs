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
const remoteRunnerPath = `${remoteUploadDir}/inventory-runtime-configure-${timestampForRemoteName(
  new Date(),
)}.php`

const requiredEnv = {
  PUG_STAGING_SSH_HOST: process.env.PUG_STAGING_SSH_HOST,
  PUG_STAGING_SSH_USER: process.env.PUG_STAGING_SSH_USER,
  PUG_STAGING_SSH_PASSWORD: process.env.PUG_STAGING_SSH_PASSWORD,
}

const runtimePayload = {
  action: statusOnly ? "status" : "configure",
  version: packageJson.version,
  inventory_pricing_enabled: envFlag(process.env.PUG_STAGING_INVENTORY_PRICING_ENABLED, true),
  staff_search_route_enabled: envFlag(process.env.PUG_STAGING_INVENTORY_STAFF_SEARCH_ENABLED, true),
  staff_create_route_enabled: envFlag(process.env.PUG_STAGING_INVENTORY_STAFF_CREATE_ENABLED, true),
  public_search_route_enabled: envFlag(process.env.PUG_STAGING_INVENTORY_PUBLIC_SEARCH_ENABLED, false),
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "staging_inventory_runtime_configure_dry_run",
        statusOnly,
        remoteRunnerPath,
        requiresEnv: [
          "PUG_STAGING_SSH_HOST",
          "PUG_STAGING_SSH_USER",
          "PUG_STAGING_SSH_PASSWORD",
          "PUG_STAGING_CONFIRM_INVENTORY_RUNTIME",
        ],
        optionalEnv: [
          "PUG_STAGING_INVENTORY_PRICING_ENABLED",
          "PUG_STAGING_INVENTORY_STAFF_SEARCH_ENABLED",
          "PUG_STAGING_INVENTORY_STAFF_CREATE_ENABLED",
          "PUG_STAGING_INVENTORY_PUBLIC_SEARCH_ENABLED",
        ],
        writesWordPressSettings: !statusOnly,
        writesWordPressData: false,
        enablesReferenceSearchRoute: !statusOnly && runtimePayload.staff_search_route_enabled,
        enablesInventorySearchRoute: !statusOnly && runtimePayload.staff_search_route_enabled,
        enablesInventoryCreateRoute: !statusOnly && runtimePayload.staff_create_route_enabled,
        publicSearchRemainsDisabled: !runtimePayload.public_search_route_enabled,
        deploysProduction: false,
        credentialsPrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing staging inventory runtime environment variables: ${missingEnv.join(", ")}`)
}

if (!statusOnly && process.env.PUG_STAGING_CONFIRM_INVENTORY_RUNTIME !== "configure-staging-inventory-runtime") {
  throw new Error(
    "Set PUG_STAGING_CONFIRM_INVENTORY_RUNTIME=configure-staging-inventory-runtime to update staging inventory route settings.",
  )
}

const runnerSource = `<?php
$payload = json_decode(stream_get_contents(STDIN), true);
if (!is_array($payload)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'invalid_payload'));
	exit(1);
}
if (!defined('WP_ENVIRONMENT_TYPE') || 'staging' !== WP_ENVIRONMENT_TYPE) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'staging_environment_required'));
	exit(1);
}
if (!class_exists('TCGStorePlatform\\\\Settings\\\\Settings') || !class_exists('TCGStorePlatform\\\\FeatureFlags\\\\FeatureFlags')) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
	exit(1);
}
$action = (string) ($payload['action'] ?? 'status');
if ('configure' === $action) {
	$flags = get_option(TCGStorePlatform\\FeatureFlags\\FeatureFlags::OPTION_NAME, TCGStorePlatform\\FeatureFlags\\FeatureFlags::defaults());
	if (!is_array($flags)) {
		$flags = TCGStorePlatform\\FeatureFlags\\FeatureFlags::defaults();
	}
	$flags['inventory_pricing'] = !empty($payload['inventory_pricing_enabled']);
	update_option(
		TCGStorePlatform\\FeatureFlags\\FeatureFlags::OPTION_NAME,
		TCGStorePlatform\\FeatureFlags\\FeatureFlags::sanitize($flags),
		false
	);

	$settings = get_option(TCGStorePlatform\\Settings\\Settings::OPTION_NAME, TCGStorePlatform\\Settings\\Settings::defaults());
	if (!is_array($settings)) {
		$settings = TCGStorePlatform\\Settings\\Settings::defaults();
	}
	$settings['inventory_route_runtime'] = array(
		'staff_search_route_enabled' => !empty($payload['staff_search_route_enabled']),
		'staff_create_route_enabled' => !empty($payload['staff_create_route_enabled']),
		'public_search_route_enabled' => !empty($payload['public_search_route_enabled']),
	);
	update_option(
		TCGStorePlatform\\Settings\\Settings::OPTION_NAME,
		TCGStorePlatform\\Settings\\Settings::sanitize($settings),
		false
	);
}

$settings = TCGStorePlatform\\Settings\\Settings::all();
$runtime = TCGStorePlatform\\Settings\\InventoryRouteRuntimeSettings::from_settings($settings);
$inventory_enabled = TCGStorePlatform\\FeatureFlags\\FeatureFlags::is_enabled('inventory_pricing');
$fresh_bootstrap = TCGStorePlatform\\Api\\V1\\InventoryRouteDependencyFactory::from_settings($settings)
	->bootstrapper()
	->bootstrap($inventory_enabled);

$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ids'));
wp_set_current_user((int) ($admins[0] ?? 0));
$health_response = rest_do_request('/tcg-store/v1/health');
$health_data = $health_response->get_data();

echo wp_json_encode(array(
	'action' => 'staging_inventory_runtime_configured',
	'status' => 'ok',
	'feature_flag' => array(
		'inventory_pricing_enabled' => $inventory_enabled,
	),
	'inventory_route_runtime' => $runtime,
	'fresh_bootstrap' => $fresh_bootstrap,
	'health_status' => $health_response->get_status(),
	'health_inventory_feature_enabled' => $health_data['features']['inventory_pricing']['enabled'] ?? null,
	'health_inventory_bootstrap_status' => $health_data['inventory_route_bootstrap']['status'] ?? null,
	'next_request_registers_routes' => true === ($fresh_bootstrap['should_register_routes'] ?? false),
	'writesWordPressSettings' => 'configure' === $action,
	'writesWordPressData' => false,
	'deploysProduction' => false,
	'credentialsPrinted' => false,
));
`

const result = await withStagingConnection(async (connection) => {
  await writeRemoteFile(connection, remoteRunnerPath, runnerSource)

  try {
    const execution = await execWithStdin(
      connection,
      `cd /html && wp eval-file ${shellQuote(remoteRunnerPath)}`,
      JSON.stringify(runtimePayload),
    )
    const parsed = parseJson(execution.stdout)

    return {
      action: statusOnly
        ? "staging_inventory_runtime_status_checked"
        : "staging_inventory_runtime_configured",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      featureFlag: parsed?.feature_flag ?? null,
      inventoryRouteRuntime: parsed?.inventory_route_runtime ?? null,
      freshBootstrap: parsed?.fresh_bootstrap ?? null,
      healthStatus: parsed?.health_status ?? null,
      healthInventoryFeatureEnabled: parsed?.health_inventory_feature_enabled ?? null,
      healthInventoryBootstrapStatus: parsed?.health_inventory_bootstrap_status ?? null,
      nextRequestRegistersRoutes: parsed?.next_request_registers_routes ?? null,
      runnerRemoved: false,
      writesWordPressSettings: !statusOnly,
      writesWordPressData: false,
      deploysProduction: false,
      credentialsPrinted: false,
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
