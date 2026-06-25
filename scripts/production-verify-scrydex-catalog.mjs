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
const remoteRunnerPath = `${remoteUploadDir}/scrydex-production-verify-${timestampForRemoteName(
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
  minCards: clampInt(process.env.SCRYDEX_VERIFY_MIN_CARDS, 0, 100000000, 1),
  minImageCoveragePercent: clampInt(process.env.SCRYDEX_VERIFY_MIN_IMAGE_COVERAGE, 0, 100, 1),
  minVariantCoveragePercent: clampInt(process.env.SCRYDEX_VERIFY_MIN_VARIANT_COVERAGE, 0, 100, 1),
  minPriceCoveragePercent: clampInt(process.env.SCRYDEX_VERIFY_MIN_PRICE_COVERAGE, 0, 100, 1),
  minPricePoints: clampInt(process.env.SCRYDEX_VERIFY_MIN_PRICE_POINTS, 0, 100000000, 1),
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_scrydex_catalog_verify_dry_run",
        remoteRunnerPath,
        wpPath,
        wpCli,
        expectations,
        requiresEnv: ["PUG_PROD_SSH_HOST", "PUG_PROD_SSH_USER", "PUG_PROD_SSH_PASSWORD"],
        optionalEnv: [
          "PUG_PROD_EXPECT_PLUGIN_VERSION",
          "SCRYDEX_VERIFY_MIN_CARDS",
          "SCRYDEX_VERIFY_MIN_IMAGE_COVERAGE",
          "SCRYDEX_VERIFY_MIN_VARIANT_COVERAGE",
          "SCRYDEX_VERIFY_MIN_PRICE_COVERAGE",
          "SCRYDEX_VERIFY_MIN_PRICE_POINTS",
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
  throw new Error(`Missing production ScryDex catalog verify environment variables: ${missingEnv.join(", ")}`)
}

const runnerSource = `<?php
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
$routes = rest_get_server()->get_routes();
$status_response = rest_do_request(new WP_REST_Request('GET', '/tcg-store/v1/scrydex/catalog/status'));
$status_data = $status_response->get_data();
$data = is_array($status_data['data'] ?? null) ? $status_data['data'] : array();
$integrity = is_array($data['integrity'] ?? null) ? $data['integrity'] : array();
$counts = is_array($data['counts'] ?? null) ? $data['counts'] : array();
echo wp_json_encode(array(
	'action' => 'production_scrydex_catalog_verified',
	'status' => $status_response->get_status() === 200 ? 'ok' : 'status_route_failed',
	'plugin_version' => TCGStorePlatform\\Version::PLUGIN,
	'database_version' => TCGStorePlatform\\Version::DATABASE,
	'scrydex_catalog_status_route_registered' => isset($routes['/tcg-store/v1/scrydex/catalog/status']),
	'scrydex_catalog_index_route_registered' => isset($routes['/tcg-store/v1/scrydex/catalog/index']),
	'scrydex_catalog_export_route_registered' => isset($routes['/tcg-store/v1/scrydex/catalog/export']),
	'catalog_status_http_status' => $status_response->get_status(),
	'catalog_counts' => $counts,
	'integrity' => array(
		'status' => (string) ($integrity['status'] ?? 'unknown'),
		'cards_checked' => (int) ($integrity['cards_checked'] ?? 0),
		'cards_with_images' => (int) ($integrity['cards_with_images'] ?? 0),
		'cards_with_variants' => (int) ($integrity['cards_with_variants'] ?? 0),
		'cards_with_price_points' => (int) ($integrity['cards_with_price_points'] ?? 0),
		'price_points_total' => (int) ($integrity['price_points_total'] ?? 0),
		'condition_price_points' => (int) ($integrity['condition_price_points'] ?? 0),
		'image_coverage_percent' => (int) ($integrity['image_coverage_percent'] ?? 0),
		'variant_coverage_percent' => (int) ($integrity['variant_coverage_percent'] ?? 0),
		'price_coverage_percent' => (int) ($integrity['price_coverage_percent'] ?? 0),
		'game_counts' => is_array($integrity['game_counts'] ?? null) ? $integrity['game_counts'] : array(),
		'latest_cards' => is_array($integrity['latest_cards'] ?? null) ? array_slice($integrity['latest_cards'], 0, 5) : array(),
		'missing_tables' => is_array($integrity['missing_tables'] ?? null) ? $integrity['missing_tables'] : array(),
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
    const execution = await exec(
      connection,
      `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
    )
    const parsed = parseJson(execution.stdout)
    const checks = buildChecks(parsed, expectations)

    return {
      action: "production_scrydex_catalog_verified",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      pluginVersion: parsed?.plugin_version ?? null,
      databaseVersion: parsed?.database_version ?? null,
      catalogStatusHttpStatus: parsed?.catalog_status_http_status ?? null,
      routes: {
        status: parsed?.scrydex_catalog_status_route_registered ?? null,
        index: parsed?.scrydex_catalog_index_route_registered ?? null,
        export: parsed?.scrydex_catalog_export_route_registered ?? null,
      },
      catalogCounts: parsed?.catalog_counts ?? null,
      integrity: parsed?.integrity ?? null,
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
  const integrity = parsed?.integrity ?? {}

  return [
    {
      name: "plugin_version",
      pass: parsed?.plugin_version === expected.pluginVersion,
      expected: expected.pluginVersion,
      actual: parsed?.plugin_version ?? null,
    },
    {
      name: "catalog_status_route",
      pass: parsed?.catalog_status_http_status === 200,
      expected: 200,
      actual: parsed?.catalog_status_http_status ?? null,
    },
    {
      name: "catalog_cards",
      pass: Number(integrity.cards_checked ?? 0) >= expected.minCards,
      expected: expected.minCards,
      actual: Number(integrity.cards_checked ?? 0),
    },
    {
      name: "image_coverage",
      pass: Number(integrity.image_coverage_percent ?? 0) >= expected.minImageCoveragePercent,
      expected: expected.minImageCoveragePercent,
      actual: Number(integrity.image_coverage_percent ?? 0),
    },
    {
      name: "variant_coverage",
      pass: Number(integrity.variant_coverage_percent ?? 0) >= expected.minVariantCoveragePercent,
      expected: expected.minVariantCoveragePercent,
      actual: Number(integrity.variant_coverage_percent ?? 0),
    },
    {
      name: "price_coverage",
      pass: Number(integrity.price_coverage_percent ?? 0) >= expected.minPriceCoveragePercent,
      expected: expected.minPriceCoveragePercent,
      actual: Number(integrity.price_coverage_percent ?? 0),
    },
    {
      name: "price_points_total",
      pass: Number(integrity.price_points_total ?? 0) >= expected.minPricePoints,
      expected: expected.minPricePoints,
      actual: Number(integrity.price_points_total ?? 0),
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
