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
const remoteUploadDir = normalizeRemoteDir(process.env.PUG_PROD_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteRunnerPath = `${remoteUploadDir}/scrydex-production-index-${timestampForRemoteName(new Date())}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const backupFileName = `pug-production-before-scrydex-index-${timestampForRemoteName(new Date())}.sql`

const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

const payload = {
  action: "run_production_scrydex_index",
  version: packageJson.version,
  game: gameKey(process.env.SCRYDEX_INDEX_GAME ?? "pokemon"),
  expansion_id: String(process.env.SCRYDEX_INDEX_EXPANSION_ID ?? "").trim(),
  page_size: clampInt(process.env.SCRYDEX_INDEX_PAGE_SIZE, 1, 100, 100),
  max_pages: clampInt(process.env.SCRYDEX_INDEX_MAX_PAGES, 1, 25, 10),
  rounds: clampInt(process.env.SCRYDEX_INDEX_ROUNDS, 1, 20, 1),
  execute_database_writes: true,
  index_expansions: envFlag(process.env.SCRYDEX_INDEX_EXPANSIONS, true),
  expansions_page: clampInt(process.env.SCRYDEX_INDEX_EXPANSIONS_PAGE, 1, 1000000, 1),
  max_expansion_pages: clampInt(process.env.SCRYDEX_INDEX_MAX_EXPANSION_PAGES, 1, 25, 25),
  index_by_set: envFlag(process.env.SCRYDEX_INDEX_BY_SET, true),
  set_limit: clampInt(process.env.SCRYDEX_INDEX_SET_LIMIT, 1, 100, 5),
  set_offset: clampInt(process.env.SCRYDEX_INDEX_SET_OFFSET, 0, 1000000, 0),
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_scrydex_index_dry_run",
        remoteRunnerPath,
        wpPath,
        wpCli,
        payload: {
          game: payload.game,
          expansion_id: payload.expansion_id,
          page_size: payload.page_size,
          max_pages: payload.max_pages,
          rounds: payload.rounds,
          execute_database_writes: payload.execute_database_writes,
          index_expansions: payload.index_expansions,
          expansions_page: payload.expansions_page,
          max_expansion_pages: payload.max_expansion_pages,
          index_by_set: payload.index_by_set,
          set_limit: payload.set_limit,
          set_offset: payload.set_offset,
        },
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_SCRYDEX_INDEX",
        ],
        optionalEnv: [
          "SCRYDEX_INDEX_GAME",
          "SCRYDEX_INDEX_EXPANSION_ID",
          "SCRYDEX_INDEX_PAGE_SIZE",
          "SCRYDEX_INDEX_MAX_PAGES",
          "SCRYDEX_INDEX_ROUNDS",
          "SCRYDEX_INDEX_EXPANSIONS",
          "SCRYDEX_INDEX_BY_SET",
          "SCRYDEX_INDEX_SET_LIMIT",
          "SCRYDEX_INDEX_SET_OFFSET",
        ],
        readsIgnoredEnvFile: ".env.production.local",
        createsProductionDatabaseBackup: true,
        backupLocation: "$HOME/tcg-production-backups",
        boundedPages: true,
        writesWordPressSettings: false,
        writesWordPressData: true,
        runsProviderNetworkRequest: true,
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
  throw new Error(`Missing production ScryDex index environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_SCRYDEX_INDEX !== "run-production-scrydex-index") {
  throw new Error(
    "Set PUG_PROD_CONFIRM_SCRYDEX_INDEX=run-production-scrydex-index to write ScryDex catalog rows in production.",
  )
}

const runnerSource = `<?php
$payload = json_decode(stream_get_contents(STDIN), true);
if (!is_array($payload)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'invalid_payload'));
	exit(1);
}
if (!class_exists('TCGStorePlatform\\\\Api\\\\V1\\\\ScryDexCatalogController')) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
	exit(1);
}
$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ids'));
$admin_id = (int) ($admins[0] ?? 0);
if ($admin_id <= 0) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'administrator_required'));
	exit(1);
}
wp_set_current_user($admin_id);
$rounds = max(1, min(20, (int) ($payload['rounds'] ?? 1)));
$game = sanitize_key($payload['game'] ?? 'pokemon');
$explicit_expansion_id = sanitize_key($payload['expansion_id'] ?? '');
$expansions_page = max(1, (int) ($payload['expansions_page'] ?? 1));
$index_expansions = !empty($payload['index_expansions']);
$index_by_set = !empty($payload['index_by_set']) && '' === $explicit_expansion_id;
$set_limit = max(1, min(100, (int) ($payload['set_limit'] ?? 5)));
$set_offset = max(0, (int) ($payload['set_offset'] ?? 0));
$runs = array();
$sets = array();
$last_status = 'unknown';

function tcg_production_scrydex_catalog_request(array $payload, string $game, string $expansion_id, bool $index_expansions, int $expansions_page, bool $skip_cards): array {
	$request = new WP_REST_Request('POST', '/tcg-store/v1/scrydex/catalog/index');
	$request->set_body_params(array(
		'game' => $game,
		'expansion_id' => $expansion_id,
		'page_size' => max(1, min(100, (int) ($payload['page_size'] ?? 100))),
		'max_pages' => max(1, min(25, (int) ($payload['max_pages'] ?? 10))),
		'execute_database_writes' => true,
		'index_expansions' => $index_expansions,
		'expansions_page' => $expansions_page,
		'max_expansion_pages' => max(1, min(25, (int) ($payload['max_expansion_pages'] ?? 25))),
		'skip_cards' => $skip_cards,
	));
	$response = rest_do_request($request);
	$response_data = $response->get_data();
	$data = is_array($response_data['data'] ?? null) ? $response_data['data'] : array();
	$cards = is_array($data['cards'] ?? null) ? $data['cards'] : array();
	$expansions = is_array($data['expansions'] ?? null) ? $data['expansions'] : array();
	$counts_after = is_array($data['counts_after'] ?? null) ? $data['counts_after'] : array();
	$expansion_continuation = !empty($expansions['continuation_available']);
	$card_continuation = !empty($cards['continuation_available']);

	return array(
		'http_status' => $response->get_status(),
		'cards_status' => (string) ($cards['status'] ?? 'unknown'),
		'cards_page_count' => (int) ($cards['page_count'] ?? 0),
		'cards_provider_request_count' => (int) ($cards['provider_request_count'] ?? 0),
		'cards_continuation_available' => $card_continuation,
		'expansions_status' => (string) ($expansions['status'] ?? 'skipped'),
		'expansions_provider_request_count' => (int) ($expansions['provider_request_count'] ?? 0),
		'expansions_row_count' => (int) ($expansions['row_count'] ?? 0),
		'expansions_write_count' => (int) ($expansions['write_count'] ?? 0),
		'expansions_next_page' => $expansions['next_page'] ?? null,
		'expansions_continuation_available' => $expansion_continuation,
		'counts_after' => $counts_after,
		'credential_values_redacted' => true,
		'provider_result_bodies_not_logged' => true,
	);
}

function tcg_production_scrydex_reference_sets(string $game, int $limit, int $offset): array {
	global $wpdb;
	$table = $wpdb->prefix . 'tcg_reference_sets';
	$found = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table)));
	if ($found !== $table) {
		return array();
	}

	$rows = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT provider_set_id, name FROM {$table} WHERE provider_name = %s AND game = %s ORDER BY COALESCE(release_date, '1900-01-01') ASC, provider_set_id ASC LIMIT %d OFFSET %d",
			'scrydex',
			$game,
			$limit,
			$offset
		),
		ARRAY_A
	);

	return is_array($rows) ? $rows : array();
}

if ($index_by_set && $index_expansions) {
	$expansion_run = tcg_production_scrydex_catalog_request($payload, $game, '', true, $expansions_page, true);
	$runs[] = array_merge(array('scope' => 'expansions'), $expansion_run);
	$last_status = (string) ($expansion_run['cards_status'] ?? 'skipped');
	if (!empty($expansion_run['expansions_next_page'])) {
		$expansions_page = max($expansions_page + 1, (int) $expansion_run['expansions_next_page']);
	}
}

if ($index_by_set) {
	$sets = tcg_production_scrydex_reference_sets($game, $set_limit, $set_offset);
	foreach ($sets as $set) {
		$set_id = sanitize_key($set['provider_set_id'] ?? '');
		if ('' === $set_id) {
			continue;
		}
		for ($round = 1; $round <= $rounds; ++$round) {
			$set_run = tcg_production_scrydex_catalog_request($payload, $game, $set_id, false, $expansions_page, false);
			$set_run['scope'] = 'set_cards';
			$set_run['round'] = $round;
			$set_run['expansion_id'] = $set_id;
			$set_run['expansion_name'] = (string) ($set['name'] ?? '');
			$runs[] = $set_run;
			$last_status = (string) ($set_run['cards_status'] ?? ($set_run['http_status'] === 200 ? 'completed' : 'blocked'));
			if ($set_run['http_status'] !== 200 || empty($set_run['cards_continuation_available'])) {
				break;
			}
		}
	}
} else {
	for ($round = 1; $round <= $rounds; ++$round) {
		$run = tcg_production_scrydex_catalog_request($payload, $game, $explicit_expansion_id, $index_expansions, $expansions_page, false);
		$run['scope'] = '' === $explicit_expansion_id ? 'global_cards' : 'set_cards';
		$run['round'] = $round;
		$run['expansion_id'] = $explicit_expansion_id;
		$runs[] = $run;
		$last_status = (string) ($run['cards_status'] ?? ($run['http_status'] === 200 ? 'completed' : 'blocked'));
		$expansion_continuation = !empty($run['expansions_continuation_available']);
		$card_continuation = !empty($run['cards_continuation_available']);
		if ($run['http_status'] !== 200) {
			break;
		}
		if ($expansion_continuation) {
			$expansions_page = max($expansions_page + 1, (int) ($run['expansions_next_page'] ?? ($expansions_page + 1)));
		} else {
			$index_expansions = false;
		}
		if (!$card_continuation && !$expansion_continuation) {
			break;
		}
	}
}
$status_response = rest_do_request(new WP_REST_Request('GET', '/tcg-store/v1/scrydex/catalog/status'));
$status_data = $status_response->get_data();
echo wp_json_encode(array(
	'action' => 'production_scrydex_index_ran',
	'status' => $status_response->get_status() === 200 ? $last_status : 'status_route_failed',
	'game' => $game,
	'expansion_id' => $explicit_expansion_id,
	'index_by_set' => $index_by_set,
	'set_limit' => $set_limit,
	'set_offset' => $set_offset,
	'sets_selected' => array_map(
		static function ($set) {
			return array(
				'provider_set_id' => (string) ($set['provider_set_id'] ?? ''),
				'name' => (string) ($set['name'] ?? ''),
			);
		},
		$sets
	),
	'rounds_requested' => $rounds,
	'rounds_ran' => count($runs),
	'runs' => $runs,
	'catalog_status_http_status' => $status_response->get_status(),
	'catalog_counts' => is_array($status_data['data']['counts'] ?? null) ? $status_data['data']['counts'] : array(),
	'backup_required_before_run' => true,
	'credential_values_redacted' => true,
	'provider_result_bodies_not_logged' => true,
	'credentialsPrinted' => false,
	'rawResponsePrinted' => false,
));
`

const result = await withProductionConnection(async (connection) => {
  await writeRemoteFile(connection, remoteRunnerPath, runnerSource)

  try {
    const backup = await exec(
      connection,
      [
        'BACKUP_DIR="$HOME/tcg-production-backups"',
        'mkdir -p "$BACKUP_DIR"',
        `${shellQuote(wpCli)} db export "$BACKUP_DIR/${backupFileName}" --path=${shellQuote(wpPath)}`,
      ].join(" && "),
    )

    if (backup.code !== 0) {
      throw new Error(`Production ScryDex index backup failed: ${tailForLog(backup.stderr || backup.stdout)}`)
    }

    const execution = await execWithStdin(
      connection,
      `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
      JSON.stringify(payload),
    )
    const parsed = parseJson(execution.stdout)

    return {
      action: "production_scrydex_index_ran",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      game: parsed?.game ?? payload.game,
      expansionId: parsed?.expansion_id ?? payload.expansion_id,
      indexBySet: parsed?.index_by_set ?? payload.index_by_set,
      setLimit: parsed?.set_limit ?? payload.set_limit,
      setOffset: parsed?.set_offset ?? payload.set_offset,
      setsSelected: parsed?.sets_selected ?? [],
      roundsRequested: parsed?.rounds_requested ?? payload.rounds,
      roundsRan: parsed?.rounds_ran ?? null,
      runs: parsed?.runs ?? [],
      catalogStatusHttpStatus: parsed?.catalog_status_http_status ?? null,
      catalogCounts: parsed?.catalog_counts ?? null,
      backupCreated: true,
      backupLocation: `$HOME/tcg-production-backups/${backupFileName}`,
      runnerRemoved: false,
      boundedPages: true,
      writesWordPressSettings: false,
      writesWordPressData: true,
      runsProviderNetworkRequest: true,
      productionApprovalRequired: true,
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

if (result.exitCode !== 0 || result.catalogStatusHttpStatus !== 200) {
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

function gameKey(value) {
  const key = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/(^-|-$)/g, "")

  return key || "pokemon"
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
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
