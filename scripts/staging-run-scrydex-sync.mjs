import { readFileSync } from "node:fs"
import { basename } from "node:path"
import { Client } from "ssh2"
import { stagingSshConnectConfig } from "./lib/staging-ssh.mjs"

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
const dryRun = process.argv.includes("--dry-run")
const remoteUploadDir = normalizeRemoteDir(process.env.PUG_STAGING_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteRunnerPath = `${remoteUploadDir}/scrydex-sync-${timestampForRemoteName(new Date())}.php`
const wpPath = process.env.PUG_STAGING_WP_PATH ?? "/html"
const wpCli = process.env.PUG_STAGING_WP_CLI ?? "wp"

const requiredEnv = {
  PUG_STAGING_SSH_HOST: process.env.PUG_STAGING_SSH_HOST,
  PUG_STAGING_SSH_USER: process.env.PUG_STAGING_SSH_USER,
  PUG_STAGING_SSH_PASSWORD: process.env.PUG_STAGING_SSH_PASSWORD,
}

const payload = {
  action: "run_staging_scrydex_sync",
  version: packageJson.version,
  game_keys: gameKeys(process.env.SCRYDEX_SYNC_GAMES ?? "pokemon"),
  cards_page_size: clampInt(process.env.SCRYDEX_SYNC_PAGE_SIZE, 1, 250, 25),
  max_pages_per_game_run: clampInt(process.env.SCRYDEX_SYNC_MAX_PAGES, 1, 25, 1),
  execute_database_writes: true,
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "staging_scrydex_sync_dry_run",
        remoteRunnerPath,
        wpPath,
        wpCli,
        payload: {
          game_keys: payload.game_keys,
          cards_page_size: payload.cards_page_size,
          max_pages_per_game_run: payload.max_pages_per_game_run,
          execute_database_writes: payload.execute_database_writes,
        },
        requiresEnv: [
          "PUG_STAGING_SSH_HOST",
          "PUG_STAGING_SSH_USER",
          "PUG_STAGING_SSH_PASSWORD",
          "PUG_STAGING_CONFIRM_SCRYDEX_SYNC",
        ],
        optionalEnv: ["SCRYDEX_SYNC_GAMES", "SCRYDEX_SYNC_PAGE_SIZE", "SCRYDEX_SYNC_MAX_PAGES"],
        stagingOnly: true,
        boundedPages: true,
        writesWordPressSettings: true,
        writesWordPressData: true,
        runsProviderNetworkRequest: true,
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
  throw new Error(`Missing staging ScryDex sync environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_STAGING_CONFIRM_SCRYDEX_SYNC !== "run-staging-scrydex-sync") {
  throw new Error("Set PUG_STAGING_CONFIRM_SCRYDEX_SYNC=run-staging-scrydex-sync to run staging ScryDex sync.")
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
if (
	!class_exists('TCGStorePlatform\\\\Settings\\\\Settings')
	|| !class_exists('TCGStorePlatform\\\\FeatureFlags\\\\FeatureFlags')
	|| !class_exists('TCGStorePlatform\\\\ScryDex\\\\ScryDexScheduledRefreshRunner')
	|| !class_exists('TCGStorePlatform\\\\Logging\\\\Logger')
) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
	exit(1);
}
$settings = get_option(TCGStorePlatform\\Settings\\Settings::OPTION_NAME, TCGStorePlatform\\Settings\\Settings::defaults());
if (!is_array($settings)) {
	$settings = TCGStorePlatform\\Settings\\Settings::defaults();
}
$settings['scrydex_schedule'] = array(
	'enabled' => true,
	'game_keys' => array_values(array_filter(array_map('sanitize_key', (array) ($payload['game_keys'] ?? array('pokemon'))))),
	'cards_page_size' => max(1, min(250, (int) ($payload['cards_page_size'] ?? 25))),
	'max_pages_per_game_run' => max(1, min(25, (int) ($payload['max_pages_per_game_run'] ?? 1))),
	'network_requests_enabled' => true,
	'database_writes_enabled' => true,
	'execute_database_writes' => true === ($payload['execute_database_writes'] ?? false),
);
$settings = TCGStorePlatform\\Settings\\Settings::sanitize($settings);
update_option(TCGStorePlatform\\Settings\\Settings::OPTION_NAME, $settings, false);

$flags = get_option(TCGStorePlatform\\FeatureFlags\\FeatureFlags::OPTION_NAME, TCGStorePlatform\\FeatureFlags\\FeatureFlags::defaults());
if (!is_array($flags)) {
	$flags = TCGStorePlatform\\FeatureFlags\\FeatureFlags::defaults();
}
$flags['scrydex_sync'] = true;
$flags = TCGStorePlatform\\FeatureFlags\\FeatureFlags::sanitize($flags, 'staging');
update_option(TCGStorePlatform\\FeatureFlags\\FeatureFlags::OPTION_NAME, $flags, false);

$before_reference_count = 0;
$after_reference_count = 0;
global $wpdb;
$reference_table = $wpdb->prefix . 'tcg_reference_cards';
$before_reference_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$reference_table}");
$runner = new TCGStorePlatform\\ScryDex\\ScryDexScheduledRefreshRunner(new TCGStorePlatform\\Logging\\Logger());
$result = $runner->run();
$after_reference_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$reference_table}");
$runs = is_array($result['runs'] ?? null) ? $result['runs'] : array();
$run_summaries = array();
foreach ($runs as $run) {
	if (!is_array($run)) {
		continue;
	}
	$run_summaries[] = array(
		'status' => (string) ($run['status'] ?? 'unknown'),
		'page_count' => (int) ($run['page_count'] ?? 0),
		'provider_request_count' => (int) ($run['provider_request_count'] ?? 0),
		'database_writes_deferred' => true === ($run['database_writes_deferred'] ?? true),
		'continuation_available' => true === ($run['continuation_available'] ?? false),
	);
}
echo wp_json_encode(array(
	'action' => 'staging_scrydex_sync_ran',
	'status' => (string) ($result['status'] ?? 'unknown'),
	'game_keys' => $settings['scrydex_schedule']['game_keys'],
	'cards_page_size' => (int) $settings['scrydex_schedule']['cards_page_size'],
	'max_pages_per_game_run' => (int) $settings['scrydex_schedule']['max_pages_per_game_run'],
	'reference_count_before' => $before_reference_count,
	'reference_count_after' => $after_reference_count,
	'reference_count_delta' => $after_reference_count - $before_reference_count,
	'run_summaries' => $run_summaries,
	'continuation_available' => 'continuation_available' === ($result['status'] ?? ''),
	'provider_result_bodies_not_logged' => true,
	'credential_values_redacted' => true,
	'credentialsPrinted' => false,
	'rawResponsePrinted' => false,
));
`

const result = await withStagingConnection(async (connection) => {
  await writeRemoteFile(connection, remoteRunnerPath, runnerSource)

  try {
    const execution = await execWithStdin(
      connection,
      `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
      JSON.stringify(payload),
    )
    const parsed = parseJson(execution.stdout)

    return {
      action: "staging_scrydex_sync_ran",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      gameKeys: parsed?.game_keys ?? [],
      cardsPageSize: parsed?.cards_page_size ?? null,
      maxPagesPerGameRun: parsed?.max_pages_per_game_run ?? null,
      referenceCountBefore: parsed?.reference_count_before ?? null,
      referenceCountAfter: parsed?.reference_count_after ?? null,
      referenceCountDelta: parsed?.reference_count_delta ?? null,
      runSummaries: parsed?.run_summaries ?? [],
      continuationAvailable: parsed?.continuation_available ?? null,
      runnerRemoved: false,
      stagingOnly: true,
      boundedPages: true,
      writesWordPressSettings: true,
      writesWordPressData: true,
      runsProviderNetworkRequest: true,
      credentialsPrinted: false,
      rawResponsePrinted: false,
      stdoutTail: tailForLog(execution.stdout),
      stderrTail: tailForLog(execution.stderr),
    }
  } finally {
    await exec(connection, `rm -f ${shellQuote(remoteRunnerPath)}`)
  }
})

result.runnerRemoved = true

console.log(JSON.stringify(result, null, 2))

if (result.exitCode !== 0 || !["completed", "continuation_available"].includes(result.status)) {
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

function gameKeys(value) {
  const keys = String(value)
    .split(/[,\s]+/)
    .map((item) => item.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/(^-|-$)/g, ""))
    .filter(Boolean)

  return [...new Set(keys)].slice(0, 8)
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}

function tailForLog(value) {
  return String(value ?? "").trim().slice(-500)
}
