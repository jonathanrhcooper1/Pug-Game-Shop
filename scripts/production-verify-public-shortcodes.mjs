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
const remoteRunnerPath = `${remoteUploadDir}/public-shortcodes-production-verify-${timestampForRemoteName(
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
  inventoryQuery: String(process.env.PUG_PROD_PUBLIC_INVENTORY_QUERY ?? "Charizard").trim(),
  inventoryGame: String(process.env.PUG_PROD_PUBLIC_INVENTORY_GAME ?? "pokemon").trim(),
  inventoryLimit: clampInt(process.env.PUG_PROD_PUBLIC_INVENTORY_LIMIT, 1, 24, 4),
  eventLimit: clampInt(process.env.PUG_PROD_PUBLIC_EVENT_LIMIT, 1, 12, 2),
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_public_shortcodes_verify_dry_run",
        remoteRunnerPath,
        wpPath,
        wpCli,
        expectations,
        requiresEnv: ["PUG_PROD_SSH_HOST", "PUG_PROD_SSH_USER", "PUG_PROD_SSH_PASSWORD"],
        optionalEnv: [
          "PUG_PROD_EXPECT_PLUGIN_VERSION",
          "PUG_PROD_PUBLIC_INVENTORY_QUERY",
          "PUG_PROD_PUBLIC_INVENTORY_GAME",
          "PUG_PROD_PUBLIC_INVENTORY_LIMIT",
          "PUG_PROD_PUBLIC_EVENT_LIMIT",
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
  throw new Error(`Missing production public shortcode verify environment variables: ${missingEnv.join(", ")}`)
}

if (!expectations.inventoryQuery) {
  throw new Error("PUG_PROD_PUBLIC_INVENTORY_QUERY must not be empty.")
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
$inventory_shortcode = '[tcg_inventory_search query="' . esc_attr((string) ($payload['inventoryQuery'] ?? 'Charizard')) . '" game="' . esc_attr((string) ($payload['inventoryGame'] ?? 'pokemon')) . '" limit="' . (int) ($payload['inventoryLimit'] ?? 4) . '"]';
$events_shortcode = '[tcg_events limit="' . (int) ($payload['eventLimit'] ?? 2) . '"]';
$event_detail_shortcode = '[tcg_event_detail slug="codex-production-shortcode-smoke-missing-event"]';
$inventory_html = do_shortcode($inventory_shortcode);
$events_html = do_shortcode($events_shortcode);
$event_detail_html = do_shortcode($event_detail_shortcode);
$combined = $inventory_html . "\\n" . $events_html . "\\n" . $event_detail_html;
echo wp_json_encode(array(
	'action' => 'production_public_shortcodes_verified',
	'status' => 'ok',
	'plugin_version' => TCGStorePlatform\\Version::PLUGIN,
	'database_version' => TCGStorePlatform\\Version::DATABASE,
	'shortcodes' => array(
		'inventory' => shortcode_exists('tcg_inventory_search'),
		'events' => shortcode_exists('tcg_events'),
		'event_detail' => shortcode_exists('tcg_event_detail'),
	),
	'styles' => array(
		'inventory_registered' => wp_style_is('tcg-store-public-inventory', 'registered'),
		'inventory_enqueued' => wp_style_is('tcg-store-public-inventory', 'enqueued'),
		'events_registered' => wp_style_is('tcg-store-public-events', 'registered'),
		'events_enqueued' => wp_style_is('tcg-store-public-events', 'enqueued'),
	),
	'markup' => array(
		'inventory_length' => strlen($inventory_html),
		'events_length' => strlen($events_html),
		'event_detail_length' => strlen($event_detail_html),
		'inventory_shell' => false !== strpos($inventory_html, 'tcg-public-inventory'),
		'inventory_search_form' => false !== strpos($inventory_html, 'tcg-public-inventory__search'),
		'inventory_query_reflected' => false !== stripos(wp_strip_all_tags($inventory_html), (string) ($payload['inventoryQuery'] ?? '')),
		'events_shell' => false !== strpos($events_html, 'tcg-events'),
		'event_detail_contract' => false !== strpos($event_detail_html, 'tcg-event-detail') || '' === trim($event_detail_html),
		'raw_shortcode_left' => false !== strpos($combined, '[tcg_'),
	),
	'read_only' => true,
	'writesWordPressSettings' => false,
	'writesWordPressData' => false,
	'runsProviderNetworkRequest' => false,
	'credentialsPrinted' => false,
	'rawResponsePrinted' => false,
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
      action: "production_public_shortcodes_verified",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      pluginVersion: parsed?.plugin_version ?? null,
      databaseVersion: parsed?.database_version ?? null,
      shortcodes: parsed?.shortcodes ?? null,
      styles: parsed?.styles ?? null,
      markup: parsed?.markup ?? null,
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
  return [
    {
      name: "plugin_version",
      pass: parsed?.plugin_version === expected.pluginVersion,
      expected: expected.pluginVersion,
      actual: parsed?.plugin_version ?? null,
    },
    {
      name: "inventory_shortcode_registered",
      pass: parsed?.shortcodes?.inventory === true,
      expected: true,
      actual: parsed?.shortcodes?.inventory ?? null,
    },
    {
      name: "events_shortcode_registered",
      pass: parsed?.shortcodes?.events === true,
      expected: true,
      actual: parsed?.shortcodes?.events ?? null,
    },
    {
      name: "event_detail_shortcode_registered",
      pass: parsed?.shortcodes?.event_detail === true,
      expected: true,
      actual: parsed?.shortcodes?.event_detail ?? null,
    },
    {
      name: "inventory_markup_shell",
      pass: parsed?.markup?.inventory_shell === true && parsed?.markup?.inventory_search_form === true,
      expected: true,
      actual: {
        shell: parsed?.markup?.inventory_shell ?? null,
        searchForm: parsed?.markup?.inventory_search_form ?? null,
      },
    },
    {
      name: "inventory_style_enqueued",
      pass: parsed?.styles?.inventory_enqueued === true,
      expected: true,
      actual: parsed?.styles?.inventory_enqueued ?? null,
    },
    {
      name: "events_markup_shell",
      pass: parsed?.markup?.events_shell === true,
      expected: true,
      actual: parsed?.markup?.events_shell ?? null,
    },
    {
      name: "events_style_enqueued",
      pass: parsed?.styles?.events_enqueued === true,
      expected: true,
      actual: parsed?.styles?.events_enqueued ?? null,
    },
    {
      name: "event_detail_contract",
      pass: parsed?.markup?.event_detail_contract === true,
      expected: true,
      actual: parsed?.markup?.event_detail_contract ?? null,
    },
    {
      name: "no_raw_shortcodes_left",
      pass: parsed?.markup?.raw_shortcode_left === false,
      expected: false,
      actual: parsed?.markup?.raw_shortcode_left ?? null,
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
