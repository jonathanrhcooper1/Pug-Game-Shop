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
const remoteRunnerPath = `${remoteUploadDir}/reference-search-production-verify-${timestampForRemoteName(
  new Date(),
)}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"

const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

const expectations = {
  pluginVersion: String(process.env.PUG_PROD_EXPECT_PLUGIN_VERSION ?? packageJson.version),
  query: String(process.env.PUG_PROD_REFERENCE_SEARCH_QUERY ?? "Charizard").trim(),
  game: String(process.env.PUG_PROD_REFERENCE_SEARCH_GAME ?? "pokemon").trim(),
  limit: clampInt(process.env.PUG_PROD_REFERENCE_SEARCH_LIMIT, 1, 25, 8),
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_reference_search_verify_dry_run",
        remoteRunnerPath,
        wpPath,
        wpCli,
        expectations,
        requiresEnv: ["PUG_PROD_SSH_HOST", "PUG_PROD_SSH_USER", "PUG_PROD_SSH_PASSWORD"],
        optionalEnv: [
          "PUG_PROD_EXPECT_PLUGIN_VERSION",
          "PUG_PROD_REFERENCE_SEARCH_QUERY",
          "PUG_PROD_REFERENCE_SEARCH_GAME",
          "PUG_PROD_REFERENCE_SEARCH_LIMIT",
        ],
        readsIgnoredEnvFile: ".env.production.local",
        readOnly: true,
        writesWordPressSettings: false,
        writesWordPressData: false,
        runsProviderNetworkRequest: false,
        productionApprovalRequired: false,
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
  throw new Error(`Missing production reference search verify environment variables: ${missingEnv.join(", ")}`)
}

if (!expectations.query) {
  throw new Error("PUG_PROD_REFERENCE_SEARCH_QUERY must not be empty.")
}

const runnerSource = `<?php
$payload = json_decode(stream_get_contents(STDIN), true);
if (!is_array($payload)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'invalid_payload'));
	exit(1);
}
if (!class_exists('TCGStorePlatform\\\\Version')) {
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
$request = new WP_REST_Request('GET', '/tcg-store/v1/reference/search');
$request->set_query_params(array(
	'q' => (string) ($payload['query'] ?? 'Charizard'),
	'game' => (string) ($payload['game'] ?? 'pokemon'),
	'limit' => (int) ($payload['limit'] ?? 8),
));
$response = rest_do_request($request);
$data = $response->get_data();
$cards = is_array($data['data']['cards'] ?? null) ? $data['data']['cards'] : array();
$summaries = array();
foreach (array_slice($cards, 0, 8) as $card) {
	if (!is_array($card)) {
		continue;
	}
	$price = is_array($card['market_price'] ?? null) ? $card['market_price'] : array();
	$summaries[] = array(
		'provider_card_id' => (string) ($card['provider_card_id'] ?? ''),
		'card_name' => (string) ($card['card_name'] ?? ''),
		'set_name' => (string) ($card['set_name'] ?? ''),
		'set_code' => (string) ($card['set_code'] ?? ''),
		'card_number' => (string) ($card['card_number'] ?? ''),
		'image_present' => '' !== (string) ($card['image_url'] ?? ''),
		'market_price_amount' => (string) ($price['amount'] ?? ''),
		'market_price_minor_units' => (int) ($card['market_price_minor_units'] ?? 0),
		'variant_count' => is_array($card['variants'] ?? null) ? count($card['variants']) : 0,
		'price_point_count' => is_array($card['price_points'] ?? null) ? count($card['price_points']) : 0,
		'stock_available_count' => (int) ($card['stock_available_count'] ?? 0),
		'live_provider_request' => !empty($card['live_provider_request']),
		'credentials_in_response' => !empty($card['credentials_in_response']),
	);
}
echo wp_json_encode(array(
	'action' => 'production_reference_search_verified',
	'status' => 200 === $response->get_status() ? 'ok' : 'reference_search_route_failed',
	'plugin_version' => TCGStorePlatform\\Version::PLUGIN,
	'database_version' => TCGStorePlatform\\Version::DATABASE,
	'reference_search_http_status' => $response->get_status(),
	'query' => (string) ($payload['query'] ?? ''),
	'game' => (string) ($payload['game'] ?? ''),
	'source' => (string) ($data['data']['source'] ?? ''),
	'lookup_order' => is_array($data['data']['lookup_order'] ?? null) ? $data['data']['lookup_order'] : array(),
	'total' => (int) ($data['data']['meta']['total'] ?? 0),
	'cards' => $summaries,
	'meta' => array(
		'live_provider_request' => !empty($data['data']['meta']['live_provider_request']),
		'price_point_status' => (string) ($data['data']['meta']['price_point_status'] ?? ''),
		'stock_summary_status' => (string) ($data['data']['meta']['stock_summary_status'] ?? ''),
	),
	'credential_values_redacted' => true,
	'credentialsPrinted' => false,
	'rawResponsePrinted' => false,
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
      JSON.stringify(expectations),
    )
    const parsed = parseJson(execution.stdout)
    const checks = buildChecks(parsed, expectations)

    return {
      action: "production_reference_search_verified",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      pluginVersion: parsed?.plugin_version ?? null,
      databaseVersion: parsed?.database_version ?? null,
      referenceSearchHttpStatus: parsed?.reference_search_http_status ?? null,
      query: parsed?.query ?? expectations.query,
      game: parsed?.game ?? expectations.game,
      source: parsed?.source ?? null,
      lookupOrder: parsed?.lookup_order ?? null,
      total: parsed?.total ?? null,
      cards: parsed?.cards ?? [],
      meta: parsed?.meta ?? null,
      expectations,
      checks,
      passed: execution.code === 0 && parsed?.status === "ok" && checks.every((check) => check.pass),
      runnerRemoved: false,
      readOnly: true,
      writesWordPressSettings: false,
      writesWordPressData: false,
      runsProviderNetworkRequest: false,
      productionApprovalRequired: false,
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

if (!result.passed) {
  process.exitCode = 1
}

function buildChecks(parsed, expected) {
  const cards = Array.isArray(parsed?.cards) ? parsed.cards : []
  const firstCard = cards[0] ?? {}
  const firstName = String(firstCard.card_name ?? "")
  const price = String(firstCard.market_price_amount ?? "")

  return [
    {
      name: "plugin_version",
      pass: parsed?.plugin_version === expected.pluginVersion,
      expected: expected.pluginVersion,
      actual: parsed?.plugin_version ?? null,
    },
    {
      name: "reference_search_route",
      pass: parsed?.reference_search_http_status === 200,
      expected: 200,
      actual: parsed?.reference_search_http_status ?? null,
    },
    {
      name: "catalog_cache_source",
      pass: parsed?.source === "wordpress_catalog_cache",
      expected: "wordpress_catalog_cache",
      actual: parsed?.source ?? null,
    },
    {
      name: "results_returned",
      pass: cards.length > 0,
      expected: "> 0",
      actual: cards.length,
    },
    {
      name: "first_result_name_relevance",
      pass: firstName.toLowerCase().includes(expected.query.toLowerCase()),
      expected: expected.query,
      actual: firstName,
    },
    {
      name: "first_result_image",
      pass: firstCard.image_present === true,
      expected: true,
      actual: firstCard.image_present ?? null,
    },
    {
      name: "first_result_price_format",
      pass: price === "" || /^\d+\.\d{2}$/.test(price),
      expected: "empty or 2-decimal money string",
      actual: price,
    },
    {
      name: "no_live_provider_request",
      pass: parsed?.meta?.live_provider_request === false,
      expected: false,
      actual: parsed?.meta?.live_provider_request ?? null,
    },
    {
      name: "no_card_credentials",
      pass: cards.every((card) => card.credentials_in_response === false),
      expected: false,
      actual: cards.some((card) => card.credentials_in_response === true),
    },
  ]
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

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
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
