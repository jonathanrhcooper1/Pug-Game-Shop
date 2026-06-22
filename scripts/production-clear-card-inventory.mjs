import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"
import { STAGING_SSH_ALGORITHMS } from "./lib/staging-ssh.mjs"
import { loadLocalEnv } from "./lib/local-env.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
loadLocalEnv([resolve(root, ".env.production.local"), resolve(root, ".env.local")])

const dryRun = process.argv.includes("--dry-run")
const remoteUploadDir = normalizeRemoteDir(process.env.PUG_PROD_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteRunnerPath = `${remoteUploadDir}/clear-card-inventory-${timestampForRemoteName(new Date())}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const databaseBackupFileName = `pug-production-before-clear-card-inventory-${timestampForRemoteName(
  new Date(),
)}.sql`

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))

const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_clear_card_inventory_dry_run",
        wpPath,
        wpCli,
        remoteRunnerPath,
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_CLEAR_INVENTORY",
        ],
        readsIgnoredEnvFile: ".env.production.local",
        createsProductionDatabaseBackup: true,
        clearsCardInventoryTables: true,
        deletesGeneratedWooCommerceCardProducts: true,
        clearsQueuedOfflineConflicts: true,
        preservesScryDexReferenceCatalog: true,
        preservesCustomersOrdersAndCreditLedger: true,
        credentialsPrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing production SSH environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_CLEAR_INVENTORY !== "clear-production-card-inventory") {
  throw new Error(
    "Set PUG_PROD_CONFIRM_CLEAR_INVENTORY=clear-production-card-inventory to clear production card inventory.",
  )
}

const runnerSource = `<?php
global $wpdb;

if (!isset($wpdb) || !is_object($wpdb)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'wpdb_unavailable'));
	exit(1);
}

$prefix = $wpdb->prefix;
$tables = array(
	'inventory_items' => $prefix . 'tcg_inventory_items',
	'inventory_movements' => $prefix . 'tcg_inventory_movements',
	'barcodes' => $prefix . 'tcg_barcodes',
	'price_change_log' => $prefix . 'tcg_price_change_log',
	'manager_overrides' => $prefix . 'tcg_manager_overrides',
	'reservations' => $prefix . 'tcg_reservations',
	'offline_queue' => $prefix . 'tcg_offline_sync_queue',
	'sync_conflicts' => $prefix . 'tcg_sync_conflicts',
	'offline_pull_cursors' => $prefix . 'tcg_offline_pull_cursors',
	'reference_sets' => $prefix . 'tcg_reference_sets',
	'reference_cards' => $prefix . 'tcg_reference_cards',
	'reference_variants' => $prefix . 'tcg_reference_variants',
	'provider_price_points' => $prefix . 'tcg_provider_price_points',
);

$before = tcg_clear_inventory_counts($wpdb, $tables);
$product_ids = tcg_clear_inventory_product_ids($wpdb, $tables['inventory_items']);
$deleted_products = array();

if (function_exists('wp_suspend_cache_invalidation')) {
	wp_suspend_cache_invalidation(true);
}

foreach ($product_ids as $product_id) {
	if ($product_id <= 0) {
		continue;
	}
	$post_type = get_post_type($product_id);
	if (!in_array($post_type, array('product', 'product_variation'), true)) {
		continue;
	}
	$deleted = wp_delete_post($product_id, true);
	if ($deleted) {
		$deleted_products[] = $product_id;
		if (function_exists('wc_delete_product_transients')) {
			wc_delete_product_transients($product_id);
		}
	}
}

$deleted = array(
	'reservations' => tcg_delete_all($wpdb, $tables['reservations']),
	'price_change_log' => tcg_delete_all($wpdb, $tables['price_change_log']),
	'barcodes' => tcg_delete_all($wpdb, $tables['barcodes']),
	'inventory_movements' => tcg_delete_all($wpdb, $tables['inventory_movements']),
	'manager_overrides' => tcg_delete_where($wpdb, $tables['manager_overrides'], 'inventory_id IS NOT NULL'),
	'inventory_items' => tcg_delete_all($wpdb, $tables['inventory_items']),
	'sync_conflicts_open' => tcg_delete_where($wpdb, $tables['sync_conflicts'], "status IN ('open', 'blocking', 'conflict')"),
	'offline_queue_pending' => tcg_delete_where($wpdb, $tables['offline_queue'], "status IN ('queued', 'retry', 'conflict')"),
	'offline_inventory_pull_cursors' => tcg_delete_where($wpdb, $tables['offline_pull_cursors'], "domain = 'inventory'"),
);

if (function_exists('wc_delete_shop_order_transients')) {
	wc_delete_shop_order_transients();
}

if (function_exists('wp_suspend_cache_invalidation')) {
	wp_suspend_cache_invalidation(false);
}

$after = tcg_clear_inventory_counts($wpdb, $tables);

echo wp_json_encode(array(
	'action' => 'production_card_inventory_cleared',
	'status' => 'ok',
	'plugin_version' => '${packageJson.version}',
	'deleted_products' => count($deleted_products),
	'deleted_product_ids_sample' => array_slice($deleted_products, 0, 20),
	'deleted_rows' => $deleted,
	'before' => $before,
	'after' => $after,
	'preserved' => array(
		'reference_sets' => $after['reference_sets'],
		'reference_cards' => $after['reference_cards'],
		'reference_variants' => $after['reference_variants'],
		'provider_price_points' => $after['provider_price_points'],
		'customers_orders_credit_ledger' => true,
	),
	'credentialsPrinted' => false,
));

function tcg_table_exists(wpdb $wpdb, string $table): bool {
	return (string) $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table;
}

function tcg_count_rows(wpdb $wpdb, string $table): int {
	if (!tcg_table_exists($wpdb, $table)) {
		return 0;
	}
	return (int) $wpdb->get_var('SELECT COUNT(*) FROM ' . $table);
}

function tcg_clear_inventory_counts(wpdb $wpdb, array $tables): array {
	$counts = array();
	foreach ($tables as $key => $table) {
		$counts[$key] = tcg_count_rows($wpdb, $table);
	}
	return $counts;
}

function tcg_delete_all(wpdb $wpdb, string $table): int {
	if (!tcg_table_exists($wpdb, $table)) {
		return 0;
	}
	$result = $wpdb->query('DELETE FROM ' . $table);
	return is_int($result) ? $result : 0;
}

function tcg_delete_where(wpdb $wpdb, string $table, string $where): int {
	if (!tcg_table_exists($wpdb, $table)) {
		return 0;
	}
	$result = $wpdb->query('DELETE FROM ' . $table . ' WHERE ' . $where);
	return is_int($result) ? $result : 0;
}

function tcg_clear_inventory_product_ids(wpdb $wpdb, string $inventory_table): array {
	$ids = array();

	if (tcg_table_exists($wpdb, $inventory_table)) {
		$inventory_ids = $wpdb->get_col('SELECT DISTINCT woocommerce_product_id FROM ' . $inventory_table . ' WHERE woocommerce_product_id IS NOT NULL AND woocommerce_product_id > 0');
		foreach ($inventory_ids as $product_id) {
			$ids[] = (int) $product_id;
		}
	}

	$meta_product_ids = $wpdb->get_col(
		'SELECT DISTINCT post_id FROM ' . $wpdb->postmeta . " WHERE meta_key IN ('_tcg_serialized_inventory', '_tcg_inventory_product_mode', '_tcg_inventory_group_key', '_tcg_inventory_public_id')"
	);
	foreach ($meta_product_ids as $product_id) {
		$ids[] = (int) $product_id;
	}

	$ids = array_values(array_unique(array_filter($ids, static function ($value) {
		return (int) $value > 0;
	})));
	sort($ids);

	return $ids;
}
`

const connection = new Client()

const result = await new Promise((resolveResult, reject) => {
  connection
    .on("ready", async () => {
      try {
        const backup = await execRemote(connection, backupCommand())
        if (backup.code !== 0) {
          throw new Error(`Production backup failed: ${tailForLog(backup.stderr || backup.stdout)}`)
        }

        await writeRemoteFile(connection, remoteRunnerPath, runnerSource)
        const clear = await execRemote(
          connection,
          `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
        )
        const parsed = parseJson(clear.stdout)

        if (clear.code !== 0 || parsed?.status !== "ok") {
          throw new Error(`Production card inventory clear failed: ${tailForLog(clear.stderr || clear.stdout)}`)
        }

        resolveResult({
          ...parsed,
          databaseBackupCreated: true,
          databaseBackupLocation: `$HOME/tcg-production-backups/${databaseBackupFileName}`,
          runnerRemoved: false,
        })
      } catch (error) {
        reject(error)
      } finally {
        await execRemote(connection, `rm -f ${shellQuote(remoteRunnerPath)}`).catch(() => null)
        connection.end()
      }
    })
    .on("error", reject)
    .connect(productionSshConnectConfig(requiredEnv))
})

result.runnerRemoved = true
console.log(JSON.stringify(result, null, 2))

function backupCommand() {
  return [
    'BACKUP_DIR="$HOME/tcg-production-backups"',
    'mkdir -p "$BACKUP_DIR"',
    `${shellQuote(wpCli)} db export "$BACKUP_DIR/${databaseBackupFileName}" --path=${shellQuote(wpPath)}`,
  ].join(" && ")
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

function execRemote(connection, command) {
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
