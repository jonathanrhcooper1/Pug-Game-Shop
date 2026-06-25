#!/usr/bin/env node
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
const remoteRunnerPath = `${remoteUploadDir}/repair-imported-inventory-${timestampForRemoteName(new Date())}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
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
  console.log(JSON.stringify({
    action: "production_repair_imported_inventory_dry_run",
    wpPath,
    wpCli,
    remoteRunnerPath,
    requiresEnv: [
      "PUG_PROD_SSH_HOST",
      "PUG_PROD_SSH_USER",
      "PUG_PROD_SSH_PASSWORD",
      "PUG_PROD_CONFIRM_REPAIR_IMPORTED_INVENTORY",
    ],
    createsAffectedRowsJsonBackup: true,
    deletesSealedRowsFromSinglesInventory: true,
    deletesGeneratedWooCommerceProductsForDeletedRows: true,
    hydratesBlankCardImagesFromScryDexReferenceTables: true,
    credentialsPrinted: false,
  }, null, 2))
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing production SSH environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_REPAIR_IMPORTED_INVENTORY !== "repair-imported-inventory") {
  throw new Error(
    "Set PUG_PROD_CONFIRM_REPAIR_IMPORTED_INVENTORY=repair-imported-inventory to repair production imported inventory.",
  )
}

const runnerSource = `<?php
global $wpdb;

if (!isset($wpdb) || !is_object($wpdb)) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'wpdb_unavailable'));
\texit(1);
}

$prefix = $wpdb->prefix;
$inventory = $prefix . 'tcg_inventory_items';
$reference = $prefix . 'tcg_reference_cards';
$timestamp = gmdate('Ymd-His');
$backup_path = WP_CONTENT_DIR . '/uploads/tcg-imported-inventory-repair-' . $timestamp . '.json';

if (!tcg_table_exists($wpdb, $inventory)) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'inventory_table_missing'));
\texit(1);
}

$sealed_where = tcg_sealed_where();
$before = array(
\t'inventory_rows' => (int) $wpdb->get_var('SELECT COUNT(*) FROM ' . $inventory),
\t'sealed_rows' => (int) $wpdb->get_var('SELECT COUNT(*) FROM ' . $inventory . ' WHERE ' . $sealed_where),
\t'blank_image_rows' => (int) $wpdb->get_var("SELECT COUNT(*) FROM " . $inventory . " WHERE COALESCE(front_image_remote_url, '') = ''"),
);

$backup_rows = $wpdb->get_results(
\t'SELECT * FROM ' . $inventory . " WHERE " . $sealed_where . " OR COALESCE(front_image_remote_url, '') = '' LIMIT 5000",
\tARRAY_A
);
file_put_contents($backup_path, wp_json_encode(array(
\t'created_at_utc' => gmdate('c'),
\t'plugin_version' => '${packageJson.version}',
\t'before' => $before,
\t'rows' => $backup_rows,
)));

$product_ids = array_map('intval', $wpdb->get_col(
\t'SELECT DISTINCT woocommerce_product_id FROM ' . $inventory . ' WHERE ' . $sealed_where . ' AND woocommerce_product_id IS NOT NULL AND woocommerce_product_id > 0'
));
$deleted_products = 0;
foreach ($product_ids as $product_id) {
\tif ($product_id > 0 && in_array(get_post_type($product_id), array('product', 'product_variation'), true)) {
\t\tif (wp_delete_post($product_id, true)) {
\t\t\t++$deleted_products;
\t\t\tif (function_exists('wc_delete_product_transients')) {
\t\t\t\twc_delete_product_transients($product_id);
\t\t\t}
\t\t}
\t}
}

$deleted_sealed_rows = (int) $wpdb->query('DELETE FROM ' . $inventory . ' WHERE ' . $sealed_where);
$hydrated_rows = 0;

if (tcg_table_exists($wpdb, $reference)) {
\t$generic_set_sql = "(LOWER(COALESCE(i.set_name, '')) = '' OR LOWER(i.set_name) IN ('pokemon', 'magic the gathering', 'one piece', 'mtg', 'manual intake') OR LOWER(i.set_name) LIKE '%singles%' OR LOWER(i.set_name) LIKE '%square category%')";
\t$hydrated_rows = (int) $wpdb->query(
\t\t"UPDATE " . $inventory . " i
\t\tJOIN (
\t\t\tSELECT game, normalized_name, MIN(reference_card_id) AS reference_card_id
\t\t\tFROM " . $reference . "
\t\t\tWHERE COALESCE(front_image_url, '') <> ''
\t\t\tGROUP BY game, normalized_name
\t\t) pick ON pick.game = i.game AND pick.normalized_name = LOWER(TRIM(i.card_name))
\t\tJOIN " . $reference . " c ON c.reference_card_id = pick.reference_card_id
\t\tSET
\t\t\ti.reference_card_id = COALESCE(i.reference_card_id, c.reference_card_id),
\t\t\ti.provider_name = IF(COALESCE(i.provider_name, '') = '', c.provider_name, i.provider_name),
\t\t\ti.provider_card_id = IF(COALESCE(i.provider_card_id, '') = '', c.provider_card_id, i.provider_card_id),
\t\t\ti.set_name = IF(" . $generic_set_sql . ", c.set_name, i.set_name),
\t\t\ti.set_code = IF(COALESCE(i.set_code, '') = '', c.set_code, i.set_code),
\t\t\ti.card_number = IF(COALESCE(i.card_number, '') = '', c.card_number, i.card_number),
\t\t\ti.printed_number = IF(COALESCE(i.printed_number, '') = '', COALESCE(c.printed_number, c.card_number), i.printed_number),
\t\t\ti.front_image_remote_url = IF(COALESCE(i.front_image_remote_url, '') = '', c.front_image_url, i.front_image_remote_url),
\t\t\ti.back_image_remote_url = IF(COALESCE(i.back_image_remote_url, '') = '', c.back_image_url, i.back_image_remote_url),
\t\t\ti.updated_at = UTC_TIMESTAMP(6),
\t\t\ti.row_version = i.row_version + 1
\t\tWHERE COALESCE(i.front_image_remote_url, '') = ''"
\t);
}

$product_image_rows = $wpdb->get_results(
\t"SELECT woocommerce_product_id, MAX(front_image_remote_url) AS image_url
\t FROM " . $inventory . "
\t WHERE woocommerce_product_id IS NOT NULL AND woocommerce_product_id > 0 AND COALESCE(front_image_remote_url, '') <> ''
\t GROUP BY woocommerce_product_id",
\tARRAY_A
);
$product_meta_updated = 0;
foreach ($product_image_rows as $row) {
\t$product_id = (int) ($row['woocommerce_product_id'] ?? 0);
\t$image_url = trim((string) ($row['image_url'] ?? ''));
\tif ($product_id > 0 && '' !== $image_url) {
\t\tupdate_post_meta($product_id, '_tcg_front_image_url', esc_url_raw($image_url));
\t\t++$product_meta_updated;
\t\tif (function_exists('wc_delete_product_transients')) {
\t\t\twc_delete_product_transients($product_id);
\t\t}
\t}
}

$after = array(
\t'inventory_rows' => (int) $wpdb->get_var('SELECT COUNT(*) FROM ' . $inventory),
\t'sealed_rows' => (int) $wpdb->get_var('SELECT COUNT(*) FROM ' . $inventory . ' WHERE ' . $sealed_where),
\t'blank_image_rows' => (int) $wpdb->get_var("SELECT COUNT(*) FROM " . $inventory . " WHERE COALESCE(front_image_remote_url, '') = ''"),
);

echo wp_json_encode(array(
\t'action' => 'production_imported_inventory_repaired',
\t'status' => 'ok',
\t'before' => $before,
\t'after' => $after,
\t'deleted_sealed_rows' => $deleted_sealed_rows,
\t'deleted_products' => $deleted_products,
\t'hydrated_rows' => $hydrated_rows,
\t'product_meta_updated' => $product_meta_updated,
\t'affected_rows_backup' => $backup_path,
\t'credentialsPrinted' => false,
));

function tcg_table_exists(wpdb $wpdb, string $table): bool {
\treturn (string) $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table;
}

function tcg_sealed_where(): string {
\t$text = "LOWER(CONCAT_WS(' ', COALESCE(set_name, ''), COALESCE(card_name, ''), COALESCE(variant, '')))";
\t$patterns = array(
\t\t"sealed",
\t\t"booster pack",
\t\t"booster box",
\t\t"booster bundle",
\t\t"sleeved booster",
\t\t"starter deck",
\t\t"battle deck",
\t\t"elite trainer box",
\t\t"trainer box",
\t\t" etb ",
\t\t" blister",
\t\t" tin",
\t\t"sleeves",
\t\t"poster collection",
\t\t"ultra premium collection",
\t\t"super-premium collection",
\t\t"super premium collection",
\t\t"premium figure collection",
\t\t"collectible tin"
\t);
\t$clauses = array();
\tforeach ($patterns as $pattern) {
\t\t$clauses[] = $text . " LIKE '%" . esc_sql($pattern) . "%'";
\t}
\treturn '(' . implode(' OR ', $clauses) . ')';
}
`

const connection = new Client()
const result = await new Promise((resolveResult, reject) => {
  connection
    .on("ready", async () => {
      try {
        await writeRemoteFile(connection, remoteRunnerPath, runnerSource)
        const repair = await execRemote(
          connection,
          `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
        )
        const parsed = parseJson(repair.stdout)

        if (repair.code !== 0 || parsed?.status !== "ok") {
          throw new Error(`Production imported inventory repair failed: ${tailForLog(repair.stderr || repair.stdout)}`)
        }

        resolveResult(parsed)
      } catch (error) {
        reject(error)
      } finally {
        await execRemote(connection, `rm -f ${shellQuote(remoteRunnerPath)}`).catch(() => null)
        connection.end()
      }
    })
    .on("error", reject)
    .connect(productionSshConnectConfig(requiredEnv, { readyTimeout: 60000 }))
})

console.log(JSON.stringify({ ...result, runnerRemoved: true }, null, 2))

function productionSshConnectConfig(env, options = {}) {
  return {
    host: env.PUG_PROD_SSH_HOST,
    username: env.PUG_PROD_SSH_USER,
    password: env.PUG_PROD_SSH_PASSWORD,
    readyTimeout: options.readyTimeout ?? 60000,
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

      const stream = sftp.createWriteStream(remotePath, { encoding: "utf8", mode: 0o600 })
      stream.on("error", reject)
      stream.on("close", resolveResult)
      stream.end(content)
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
      let code = 0

      stream
        .on("close", (exitCode) => {
          code = Number(exitCode ?? 0)
          resolveResult({ code, stdout, stderr })
        })
        .on("data", (chunk) => {
          stdout += chunk.toString("utf8")
        })

      stream.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8")
      })
    })
  })
}

function parseJson(value) {
  const trimmed = String(value ?? "").trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")

  if (start < 0 || end < start) {
    return null
  }

  return JSON.parse(trimmed.slice(start, end + 1))
}

function normalizeRemoteDir(value) {
  const dir = String(value ?? "").trim().replace(/\/+$/, "")
  return dir || "/html/wp-content/uploads"
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function tailForLog(value) {
  return String(value ?? "").slice(-1200)
}
