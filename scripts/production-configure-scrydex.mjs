import { readFileSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"
import { STAGING_SSH_ALGORITHMS } from "./lib/staging-ssh.mjs"
import { loadLocalEnv } from "./lib/local-env.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
loadLocalEnv([resolve(root, ".env.production.local"), resolve(root, ".env.local")])

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const dryRun = process.argv.includes("--dry-run")
const statusOnly = process.argv.includes("--status")
const remoteUploadDir = normalizeRemoteDir(process.env.PUG_PROD_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteRunnerPath = `${remoteUploadDir}/scrydex-production-configure-${timestampForRemoteName(
  new Date(),
)}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"

const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

const providerPayload = {
  action: statusOnly ? "status" : "configure",
  version: packageJson.version,
  environment: safeChoice(process.env.SCRYDEX_ENVIRONMENT, ["production", "staging", "sandbox"], "production"),
  base_url: normalizeBaseUrl(process.env.SCRYDEX_BASE_URL ?? "https://api.scrydex.com"),
  team_id: String(process.env.SCRYDEX_TEAM_ID ?? "").trim(),
  primary_api_key: String(
    process.env.SCRYDEX_API_KEY ?? process.env.SCRYDEX_PRIMARY_API_KEY ?? "",
  ).trim(),
  secondary_api_key: String(process.env.SCRYDEX_SECONDARY_API_KEY ?? "").trim(),
  request_timeout_seconds: clampInt(process.env.SCRYDEX_REQUEST_TIMEOUT_SECONDS, 5, 60, 15),
  budget: {
    enabled: envFlag(process.env.SCRYDEX_USAGE_BUDGET_ENABLED, true),
    daily_credit_budget: clampInt(process.env.SCRYDEX_DAILY_CREDIT_BUDGET, 0, 1000000, 1000),
    minimum_remaining_credits: clampInt(
      process.env.SCRYDEX_MINIMUM_REMAINING_CREDITS,
      0,
      1000000,
      50,
    ),
    per_cards_page_credit_estimate: clampInt(
      process.env.SCRYDEX_PER_CARDS_PAGE_CREDIT_ESTIMATE,
      1,
      10000,
      1,
    ),
    usage_snapshot_max_age_minutes: clampInt(
      process.env.SCRYDEX_USAGE_SNAPSHOT_MAX_AGE_MINUTES,
      1,
      1440,
      15,
    ),
  },
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (!statusOnly && !providerPayload.team_id) {
  missingEnv.push("SCRYDEX_TEAM_ID")
}

if (!statusOnly && !providerPayload.primary_api_key) {
  missingEnv.push("SCRYDEX_API_KEY or SCRYDEX_PRIMARY_API_KEY")
}

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_scrydex_configure_dry_run",
        statusOnly,
        remoteRunnerPath,
        wpPath,
        wpCli,
        requiresEnv: statusOnly
          ? ["PUG_PROD_SSH_HOST", "PUG_PROD_SSH_USER", "PUG_PROD_SSH_PASSWORD"]
          : [
              "PUG_PROD_SSH_HOST",
              "PUG_PROD_SSH_USER",
              "PUG_PROD_SSH_PASSWORD",
              "SCRYDEX_TEAM_ID",
              "SCRYDEX_API_KEY or SCRYDEX_PRIMARY_API_KEY",
              "PUG_PROD_CONFIRM_SCRYDEX_CONFIG",
            ],
        optionalEnv: [
          "SCRYDEX_SECONDARY_API_KEY",
          "SCRYDEX_BASE_URL",
          "SCRYDEX_ENVIRONMENT",
          "SCRYDEX_DAILY_CREDIT_BUDGET",
          "SCRYDEX_MINIMUM_REMAINING_CREDITS",
        ],
        readsIgnoredEnvFile: ".env.production.local",
        writesWordPressSettings: !statusOnly,
        writesWordPressData: false,
        runsProviderNetworkRequest: false,
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
  throw new Error(`Missing production ScryDex environment variables: ${missingEnv.join(", ")}`)
}

if (!statusOnly && process.env.PUG_PROD_CONFIRM_SCRYDEX_CONFIG !== "configure-production-scrydex") {
  throw new Error(
    "Set PUG_PROD_CONFIRM_SCRYDEX_CONFIG=configure-production-scrydex to update production ScryDex settings.",
  )
}

const runnerSource = `<?php
$payload = json_decode(stream_get_contents(STDIN), true);
if (!is_array($payload)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'invalid_payload'));
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
if ('configure' === ($payload['action'] ?? '')) {
	$settings['scrydex_provider'] = array_merge(
		is_array($settings['scrydex_provider'] ?? null) ? $settings['scrydex_provider'] : array(),
		array(
			'enabled' => true,
			'environment' => (string) ($payload['environment'] ?? 'production'),
			'base_url' => (string) ($payload['base_url'] ?? 'https://api.scrydex.com'),
			'team_id' => (string) ($payload['team_id'] ?? ''),
			'primary_api_key' => (string) ($payload['primary_api_key'] ?? ''),
			'secondary_api_key' => (string) ($payload['secondary_api_key'] ?? ''),
			'request_timeout_seconds' => (int) ($payload['request_timeout_seconds'] ?? 15),
			'webhook_registration_enabled' => false,
		)
	);
	$budget = is_array($payload['budget'] ?? null) ? $payload['budget'] : array();
	$settings['scrydex_usage_budget'] = array_merge(
		is_array($settings['scrydex_usage_budget'] ?? null) ? $settings['scrydex_usage_budget'] : array(),
		array(
			'enabled' => !empty($budget['enabled']),
			'daily_credit_budget' => (int) ($budget['daily_credit_budget'] ?? 1000),
			'minimum_remaining_credits' => (int) ($budget['minimum_remaining_credits'] ?? 50),
			'per_cards_page_credit_estimate' => (int) ($budget['per_cards_page_credit_estimate'] ?? 1),
			'usage_snapshot_max_age_minutes' => (int) ($budget['usage_snapshot_max_age_minutes'] ?? 15),
		)
	);
	$settings = TCGStorePlatform\\Settings\\Settings::sanitize($settings);
	update_option(TCGStorePlatform\\Settings\\Settings::OPTION_NAME, $settings, false);
}
$settings = TCGStorePlatform\\Settings\\Settings::all();
$provider = TCGStorePlatform\\Settings\\ScryDexProviderSettings::public_status($settings);
$budget = TCGStorePlatform\\Settings\\ScryDexUsageBudgetSettings::public_status($settings);
$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ids'));
wp_set_current_user((int) ($admins[0] ?? 0));
$health = rest_do_request(new WP_REST_Request('GET', '/tcg-store/v1/health'));
$health_data = $health->get_data();
echo wp_json_encode(array(
	'action' => 'production_scrydex_configured',
	'status' => 'ok',
	'health_status' => $health->get_status(),
	'provider' => array(
		'configured' => $provider['configured'],
		'status' => $provider['status'],
		'environment' => $provider['environment'],
		'base_url' => $provider['base_url'],
		'team_id_configured' => $provider['team_id_configured'],
		'primary_key_configured' => $provider['primary_key_configured'],
		'secondary_key_configured' => $provider['secondary_key_configured'],
		'active_key_slot' => $provider['active_key_slot'],
		'active_key_fingerprint' => $provider['active_key_fingerprint'],
		'credential_values_redacted' => true,
		'configuration_issues' => $provider['configuration_issues'],
	),
	'usage_budget' => array(
		'configured' => $budget['configured'],
		'status' => $budget['status'],
		'daily_credit_budget' => $budget['daily_credit_budget'],
		'minimum_remaining_credits' => $budget['minimum_remaining_credits'],
		'per_cards_page_credit_estimate' => $budget['per_cards_page_credit_estimate'],
		'provider_usage_requests_deferred' => true,
	),
	'health_scrydex_provider_status' => $health_data['scrydex_provider']['status'] ?? null,
	'credentialsPrinted' => false,
	'writesWordPressData' => false,
	'runsProviderNetworkRequest' => false,
));
`

const result = await withProductionConnection(async (connection) => {
  await writeRemoteFile(connection, remoteRunnerPath, runnerSource)

  try {
    const execution = await execWithStdin(
      connection,
      `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
      JSON.stringify(providerPayload),
    )
    const parsed = parseJson(execution.stdout)

    return {
      action: statusOnly ? "production_scrydex_status_checked" : "production_scrydex_configured",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      provider: parsed?.provider ?? null,
      usageBudget: parsed?.usage_budget ?? null,
      healthStatus: parsed?.health_status ?? null,
      healthScryDexProviderStatus: parsed?.health_scrydex_provider_status ?? null,
      runnerRemoved: false,
      writesWordPressSettings: !statusOnly,
      writesWordPressData: false,
      runsProviderNetworkRequest: false,
      productionApprovalRequired: true,
      credentialsPrinted: false,
      rawResponsePrinted: false,
      stderrTail: tailForLog(execution.stderr),
    }
  } finally {
    await exec(connection, `rm -f ${shellQuote(remoteRunnerPath)}`)
  }
})

result.runnerRemoved = true

console.log(JSON.stringify(result, null, 2))

if (result.exitCode !== 0 || result.status !== "ok") {
  process.exitCode = 1
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
  return {
    host: env.PUG_PROD_SSH_HOST,
    username: env.PUG_PROD_SSH_USER,
    password: env.PUG_PROD_SSH_PASSWORD,
    readyTimeout: options.readyTimeout ?? 20000,
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

function normalizeRemoteDir(value) {
  return `/${String(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`
}

function normalizeBaseUrl(value) {
  const url = String(value).trim().replace(/\/+$/, "")

  if (!url || !url.startsWith("https://")) {
    return "https://api.scrydex.com"
  }

  return url
}

function safeChoice(value, allowed, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase()

  return allowed.includes(normalized) ? normalized : fallback
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

function tailForLog(value, maxLength = 500) {
  const text = String(value ?? "").trim()
  return text.length > maxLength ? text.slice(-maxLength) : text
}
