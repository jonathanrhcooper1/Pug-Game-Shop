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
const remoteRunnerPath = `${remoteUploadDir}/woocommerce-card-production-smoke-${timestampForRemoteName(
  new Date(),
)}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const smokeId = `CODEX-WOO-${timestampForRemoteName(new Date())}`
const confirmValue = "run-production-woocommerce-card-smoke"

const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

const expectations = {
  pluginVersion: String(process.env.PUG_PROD_EXPECT_PLUGIN_VERSION ?? packageJson.version),
  smokeId,
  temporaryProduct: true,
  temporaryInventoryRows: 2,
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_woocommerce_card_smoke_dry_run",
        remoteRunnerPath,
        wpPath,
        wpCli,
        expectations,
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_WOOCOMMERCE_CARD_SMOKE",
        ],
        optionalEnv: ["PUG_PROD_EXPECT_PLUGIN_VERSION", "PUG_PROD_REMOTE_UPLOAD_DIR", "PUG_PROD_WP_PATH"],
        readsIgnoredEnvFile: ".env.production.local",
        createsTemporaryWooCommerceProduct: true,
        createsTemporaryVisibleInventoryRows: true,
        verifiesGroupedCardProductMetadata: true,
        verifiesCardImageFallback: true,
        verifiesExactInventoryReservationRelease: true,
        verifiesExactInventoryOrderConversion: true,
        cleansTemporaryRowsAndProduct: true,
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
  throw new Error(`Missing production WooCommerce card smoke environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_WOOCOMMERCE_CARD_SMOKE !== confirmValue) {
  throw new Error(
    `Set PUG_PROD_CONFIRM_WOOCOMMERCE_CARD_SMOKE=${confirmValue} to run the production WooCommerce card smoke.`,
  )
}

const runnerSource = `<?php
if (!class_exists('TCGStorePlatform\\\\Version') || !class_exists('TCGStorePlatform\\\\WooCommerce\\\\InventoryProductProjectionPlanner')) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
\texit(1);
}

if (!class_exists('\\\\WC_Product_Simple') || !function_exists('wc_get_product')) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'woocommerce_unavailable', 'plugin_version' => TCGStorePlatform\\Version::PLUGIN));
\texit(1);
}

$admins = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ids'));
$admin_id = (int) ($admins[0] ?? 0);
if ($admin_id <= 0) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'administrator_required', 'plugin_version' => TCGStorePlatform\\Version::PLUGIN));
\texit(1);
}
wp_set_current_user($admin_id);

global $wpdb;

$smoke_id = '${smokeId}';
$inventory_table = $wpdb->prefix . 'tcg_inventory_items';
$reservations_table = $wpdb->prefix . 'tcg_reservations';
$now = gmdate('Y-m-d H:i:s');
$product_id = 0;
$order_id = 0;
$created_inventory_ids = array();
$cleanup = array(
\t'product_deleted' => false,
\t'order_deleted' => false,
\t'inventory_rows_deleted' => 0,
\t'reservation_rows_deleted' => 0,
);

$cleanup_smoke = static function () use (&$wpdb, &$inventory_table, &$reservations_table, &$smoke_id, &$product_id, &$order_id, &$cleanup) {
\tif ($order_id > 0 && function_exists('wc_get_order')) {
\t\t$order = wc_get_order($order_id);
\t\tif (is_object($order) && method_exists($order, 'delete')) {
\t\t\t$cleanup['order_deleted'] = (bool) $order->delete(true);
\t\t} else {
\t\t\t$cleanup['order_deleted'] = (bool) wp_delete_post($order_id, true);
\t\t}
\t}

\tif ($product_id > 0) {
\t\t$cleanup['product_deleted'] = (bool) wp_delete_post($product_id, true);
\t}

\t$ids = $wpdb->get_col(
\t\t$wpdb->prepare(
\t\t\t'SELECT inventory_id FROM \`' . $inventory_table . '\` WHERE barcode LIKE %s',
\t\t\t$smoke_id . '%'
\t\t)
\t);
\t$ids = is_array($ids) ? array_values(array_filter(array_map('intval', $ids))) : array();

\tif (array() !== $ids) {
\t\t$placeholders = implode(',', array_fill(0, count($ids), '%d'));
\t\t$deleted_reservations = $wpdb->query(
\t\t\t$wpdb->prepare(
\t\t\t\t'DELETE FROM \`' . $reservations_table . '\` WHERE inventory_id IN (' . $placeholders . ')',
\t\t\t\t$ids
\t\t\t)
\t\t);
\t\t$cleanup['reservation_rows_deleted'] = false === $deleted_reservations ? 0 : (int) $deleted_reservations;
\t\t$deleted_inventory = $wpdb->query(
\t\t\t$wpdb->prepare(
\t\t\t\t'DELETE FROM \`' . $inventory_table . '\` WHERE inventory_id IN (' . $placeholders . ')',
\t\t\t\t$ids
\t\t\t)
\t\t);
\t\t$cleanup['inventory_rows_deleted'] = false === $deleted_inventory ? 0 : (int) $deleted_inventory;
\t}
};

$insert_inventory = static function (string $condition, string $finish, string $price, string $barcode) use (&$wpdb, &$inventory_table, &$smoke_id, &$now) {
\t$inserted = $wpdb->insert(
\t\t$inventory_table,
\t\tarray(
\t\t\t'public_id' => wp_generate_uuid4(),
\t\t\t'provider_name' => 'scrydex',
\t\t\t'provider_card_id' => strtolower($smoke_id),
\t\t\t'game' => 'pokemon',
\t\t\t'card_name' => 'Codex Woo Live Smoke',
\t\t\t'set_name' => 'Production Smoke',
\t\t\t'set_code' => 'SMOKE',
\t\t\t'card_number' => '001',
\t\t\t'printed_number' => '001/001',
\t\t\t'variant' => 'Standard',
\t\t\t'finish' => $finish,
\t\t\t'language' => 'EN',
\t\t\t'raw_or_graded' => 'raw',
\t\t\t'condition_code' => $condition,
\t\t\t'barcode' => $barcode,
\t\t\t'sku' => $barcode,
\t\t\t'cost' => '0.0000',
\t\t\t'cost_currency' => 'USD',
\t\t\t'market_price' => $price,
\t\t\t'market_price_currency' => 'USD',
\t\t\t'suggested_price' => $price,
\t\t\t'sale_price' => $price,
\t\t\t'minimum_sale_price' => $price,
\t\t\t'sale_currency' => 'USD',
\t\t\t'pricing_source' => 'production_woocommerce_smoke',
\t\t\t'pricing_formula' => 'smoke_fixed',
\t\t\t'online_visibility' => 'visible',
\t\t\t'kiosk_visibility' => 'hidden',
\t\t\t'pos_visibility' => 'hidden',
\t\t\t'status' => 'available',
\t\t\t'external_sync_state' => 'pending',
\t\t\t'front_image_remote_url' => 'https://images.scrydex.com/pokemon/mcd24-1/large',
\t\t\t'date_acquired' => $now,
\t\t\t'date_listed' => $now,
\t\t\t'created_at' => $now,
\t\t\t'updated_at' => $now,
\t\t\t'row_version' => 1,
\t\t)
\t);

\tif (false === $inserted) {
\t\treturn null;
\t}

\treturn (int) $wpdb->insert_id;
};

try {
\t$created_inventory_ids[] = $insert_inventory('LP', 'Foil', '0.99', $smoke_id . '-LP');
\t$created_inventory_ids[] = $insert_inventory('NM', 'Foil', '1.23', $smoke_id . '-NM');
\t$created_inventory_ids = array_values(array_filter(array_map('intval', $created_inventory_ids)));

\tif (count($created_inventory_ids) !== 2) {
\t\tthrow new RuntimeException('temporary_inventory_insert_failed');
\t}

\t$placeholders = implode(',', array_fill(0, count($created_inventory_ids), '%d'));
\t$rows = $wpdb->get_results(
\t\t$wpdb->prepare(
\t\t\t'SELECT * FROM \`' . $inventory_table . '\` WHERE inventory_id IN (' . $placeholders . ') ORDER BY sale_price ASC, inventory_id ASC',
\t\t\t$created_inventory_ids
\t\t),
\t\tARRAY_A
\t);
\t$rows = is_array($rows) ? array_values(array_filter($rows, 'is_array')) : array();

\t$context = array('production_write_approval' => 'woocommerce-product-sync');
\t$plan = (new TCGStorePlatform\\WooCommerce\\InventoryProductProjectionPlanner())->plan_group($rows, $context);
\t$execution = (new TCGStorePlatform\\WooCommerce\\InventoryProductProjectionExecutor(
\t\ttrue,
\t\tnew TCGStorePlatform\\WooCommerce\\WooCommerceInventoryProductWriter(),
\t\tnull,
\t\t$context
\t))->execute($plan);
\t$operation_results = $execution->operation_results();
\t$product_id = (int) ($operation_results[0]['product_id'] ?? 0);

\tif (!$execution->is_executed() || $product_id <= 0) {
\t\tthrow new RuntimeException('woocommerce_product_projection_failed');
\t}

\t(new TCGStorePlatform\\Inventory\\InventoryExternalMappingRepository($wpdb))->mark_woocommerce_product_synced_for_inventory_ids($created_inventory_ids, $product_id);
\t$product = wc_get_product($product_id);
\tif (!$product instanceof WC_Product) {
\t\tthrow new RuntimeException('woocommerce_product_missing_after_write');
\t}

\t$options = json_decode((string) $product->get_meta('_tcg_inventory_options_json', true), true);
\t$options = is_array($options) ? array_values(array_filter($options, 'is_array')) : array();
\t$image_html = (new TCGStorePlatform\\WooCommerce\\GroupedInventoryProductHooks())->product_image('', $product, 'woocommerce_thumbnail', array(), false);
\t$hooks = new TCGStorePlatform\\WooCommerce\\GroupedInventoryProductHooks();

\t$release_option = $options[0]['option_key'] ?? '';
\t$_POST['tcg_inventory_option_key'] = $release_option;
\t$_POST['tcg_inventory_line_token'] = $smoke_id . '-release';
\t$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
\t$release_validated = $hooks->validate_add_to_cart(true, $product_id, 1, 0, array());
\t$release_cart = $hooks->reserve_add_to_cart_inventory(array(), $product_id, 0, 1);
\t$release_reservation_id = (int) ($release_cart['reservation_id'] ?? 0);
\t$release_inventory_id = (int) ($release_cart['inventory_id'] ?? 0);
\t$release_result = (new TCGStorePlatform\\Reservations\\ReservationService(new TCGStorePlatform\\Reservations\\WpdbReservationStorage($wpdb)))->release($release_reservation_id, 'production_woocommerce_smoke_release');
\t$release_inventory_status = (string) $wpdb->get_var(
\t\t$wpdb->prepare(
\t\t\t'SELECT status FROM \`' . $inventory_table . '\` WHERE inventory_id = %d LIMIT 1',
\t\t\t$release_inventory_id
\t\t)
\t);
\t$release_reservation_status = (string) $wpdb->get_var(
\t\t$wpdb->prepare(
\t\t\t'SELECT status FROM \`' . $reservations_table . '\` WHERE reservation_id = %d LIMIT 1',
\t\t\t$release_reservation_id
\t\t)
\t);

\t$convert_option = $options[1]['option_key'] ?? '';
\t$_POST['tcg_inventory_option_key'] = $convert_option;
\t$_POST['tcg_inventory_line_token'] = $smoke_id . '-convert';
\t$convert_validated = $hooks->validate_add_to_cart(true, $product_id, 1, 0, array());
\t$convert_cart = $hooks->reserve_add_to_cart_inventory(array(), $product_id, 0, 1);
\t$convert_reservation_id = (int) ($convert_cart['reservation_id'] ?? 0);
\t$convert_inventory_id = (int) ($convert_cart['inventory_id'] ?? 0);

\t$order = wc_create_order(array('created_via' => 'codex-production-woocommerce-card-smoke'));
\tif (!$order instanceof WC_Order) {
\t\tthrow new RuntimeException('woocommerce_order_create_failed');
\t}
\t$item = new WC_Order_Item_Product();
\t$item->set_product($product);
\t$item->set_quantity(1);
\t$item->set_subtotal(((int) ($convert_cart['price_snapshot_minor_units'] ?? 0)) / 100);
\t$item->set_total(((int) ($convert_cart['price_snapshot_minor_units'] ?? 0)) / 100);
\t$hooks->attach_exact_inventory_order_line_metadata($item, 'codex-smoke-cart-line', $convert_cart, $order);
\t$order->add_item($item);
\t$order->calculate_totals(false);
\t$order_id = (int) $order->save();
\t$hooks->convert_paid_order_reservations($order_id);
\t$convert_inventory_status = (string) $wpdb->get_var(
\t\t$wpdb->prepare(
\t\t\t'SELECT status FROM \`' . $inventory_table . '\` WHERE inventory_id = %d LIMIT 1',
\t\t\t$convert_inventory_id
\t\t)
\t);
\t$convert_reservation_status = (string) $wpdb->get_var(
\t\t$wpdb->prepare(
\t\t\t'SELECT status FROM \`' . $reservations_table . '\` WHERE reservation_id = %d LIMIT 1',
\t\t\t$convert_reservation_id
\t\t)
\t);

\t$result = array(
\t\t'action' => 'production_woocommerce_card_smoke',
\t\t'status' => 'ok',
\t\t'plugin_version' => TCGStorePlatform\\Version::PLUGIN,
\t\t'database_version' => TCGStorePlatform\\Version::DATABASE,
\t\t'smoke_id' => $smoke_id,
\t\t'created_inventory_ids' => $created_inventory_ids,
\t\t'product' => array(
\t\t\t'id' => $product_id,
\t\t\t'name' => $product->get_name(),
\t\t\t'sku' => $product->get_sku(),
\t\t\t'price' => $product->get_price(),
\t\t\t'stock_quantity' => (int) $product->get_stock_quantity(),
\t\t\t'stock_status' => $product->get_stock_status(),
\t\t\t'grouped_mode' => (string) $product->get_meta('_tcg_inventory_product_mode', true),
\t\t\t'image_url' => (string) $product->get_meta('_tcg_front_image_url', true),
\t\t\t'permalink' => get_permalink($product_id),
\t\t),
\t\t'options' => array_map(
\t\t\tstatic function ($option) {
\t\t\t\treturn array(
\t\t\t\t\t'condition_code' => (string) ($option['condition_code'] ?? ''),
\t\t\t\t\t'finish' => (string) ($option['finish'] ?? ''),
\t\t\t\t\t'price' => (string) ($option['price'] ?? ''),
\t\t\t\t\t'currency' => (string) ($option['currency'] ?? ''),
\t\t\t\t\t'stock_quantity' => (int) ($option['stock_quantity'] ?? 0),
\t\t\t\t);
\t\t\t},
\t\t\t$options
\t\t),
\t\t'image_html_contains_remote_url' => false !== strpos($image_html, 'https://images.scrydex.com/pokemon/mcd24-1/large'),
\t\t'release_flow' => array(
\t\t\t'validated' => (bool) $release_validated,
\t\t\t'reservation_id' => $release_reservation_id,
\t\t\t'inventory_id' => $release_inventory_id,
\t\t\t'cart_serialized' => '1' === (string) ($release_cart['tcg_serialized_inventory'] ?? ''),
\t\t\t'price_snapshot_minor_units' => (int) ($release_cart['price_snapshot_minor_units'] ?? -1),
\t\t\t'release_accepted' => $release_result->is_accepted(),
\t\t\t'release_code' => $release_result->code(),
\t\t\t'inventory_status_after_release' => $release_inventory_status,
\t\t\t'reservation_status_after_release' => $release_reservation_status,
\t\t),
\t\t'convert_flow' => array(
\t\t\t'validated' => (bool) $convert_validated,
\t\t\t'reservation_id' => $convert_reservation_id,
\t\t\t'inventory_id' => $convert_inventory_id,
\t\t\t'cart_serialized' => '1' === (string) ($convert_cart['tcg_serialized_inventory'] ?? ''),
\t\t\t'price_snapshot_minor_units' => (int) ($convert_cart['price_snapshot_minor_units'] ?? -1),
\t\t\t'order_id' => $order_id,
\t\t\t'inventory_status_after_convert' => $convert_inventory_status,
\t\t\t'reservation_status_after_convert' => $convert_reservation_status,
\t\t),
\t\t'credentialsPrinted' => false,
\t\t'rawResponsePrinted' => false,
\t);
} catch (Throwable $error) {
\t$result = array(
\t\t'action' => 'production_woocommerce_card_smoke',
\t\t'status' => 'error',
\t\t'plugin_version' => class_exists('TCGStorePlatform\\\\Version') ? TCGStorePlatform\\Version::PLUGIN : null,
\t\t'database_version' => class_exists('TCGStorePlatform\\\\Version') ? TCGStorePlatform\\Version::DATABASE : null,
\t\t'smoke_id' => $smoke_id,
\t\t'message' => $error->getMessage(),
\t\t'credentialsPrinted' => false,
\t\t'rawResponsePrinted' => false,
\t);
} finally {
\t$cleanup_smoke();
}

$result['cleanup'] = $cleanup;
$result['writesWordPressData'] = true;
$result['productionApprovalRequired'] = true;
echo wp_json_encode($result);
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
      action: "production_woocommerce_card_smoke",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      pluginVersion: parsed?.plugin_version ?? null,
      databaseVersion: parsed?.database_version ?? null,
      smokeId: parsed?.smoke_id ?? smokeId,
      product: parsed?.product ?? null,
      options: parsed?.options ?? [],
      releaseFlow: parsed?.release_flow ?? null,
      convertFlow: parsed?.convert_flow ?? null,
      cleanup: parsed?.cleanup ?? null,
      expectations,
      checks,
      passed: execution.code === 0 && parsed?.status === "ok" && checks.every((check) => check.pass),
      runnerRemoved: false,
      writesWordPressData: true,
      createsTemporaryWooCommerceProduct: true,
      createsTemporaryVisibleInventoryRows: true,
      cleansTemporaryRowsAndProduct: true,
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

if (!result.passed) {
  process.exitCode = 1
}

function buildChecks(parsed, expected) {
  const product = parsed?.product ?? {}
  const options = Array.isArray(parsed?.options) ? parsed.options : []
  const release = parsed?.release_flow ?? {}
  const convert = parsed?.convert_flow ?? {}
  const cleanup = parsed?.cleanup ?? {}

  return [
    {
      name: "plugin_version",
      pass: parsed?.plugin_version === expected.pluginVersion,
      expected: expected.pluginVersion,
      actual: parsed?.plugin_version ?? null,
    },
    {
      name: "temporary_inventory_rows_created",
      pass: Array.isArray(parsed?.created_inventory_ids) && parsed.created_inventory_ids.length === 2,
      expected: 2,
      actual: Array.isArray(parsed?.created_inventory_ids) ? parsed.created_inventory_ids.length : 0,
    },
    {
      name: "woocommerce_product_created",
      pass: Number(product.id ?? 0) > 0 && String(product.grouped_mode ?? "") === "grouped_card",
      expected: "grouped_card product",
      actual: { id: product.id ?? null, groupedMode: product.grouped_mode ?? null },
    },
    {
      name: "product_price_two_decimals",
      pass: /^\d+\.\d{2}$/.test(String(product.price ?? "")),
      expected: "two-decimal price",
      actual: product.price ?? null,
    },
    {
      name: "product_stock_and_options",
      pass:
        Number(product.stock_quantity ?? 0) === 2 &&
        options.length === 2 &&
        options.every((option) => /^\d+\.\d{2}$/.test(String(option.price ?? ""))),
      expected: "2 stock / 2 priced options",
      actual: { stock: product.stock_quantity ?? null, options: options.length },
    },
    {
      name: "product_image_fallback",
      pass:
        String(product.image_url ?? "").includes("images.scrydex.com") &&
        parsed?.image_html_contains_remote_url === true,
      expected: true,
      actual: parsed?.image_html_contains_remote_url ?? null,
    },
    {
      name: "reservation_release_flow",
      pass:
        release.validated === true &&
        release.cart_serialized === true &&
        Number(release.reservation_id ?? 0) > 0 &&
        release.release_accepted === true &&
        release.inventory_status_after_release === "available" &&
        release.reservation_status_after_release === "released",
      expected: "available/released",
      actual: {
        validated: release.validated ?? null,
        cartSerialized: release.cart_serialized ?? null,
        inventoryStatus: release.inventory_status_after_release ?? null,
        reservationStatus: release.reservation_status_after_release ?? null,
      },
    },
    {
      name: "reservation_order_conversion_flow",
      pass:
        convert.validated === true &&
        convert.cart_serialized === true &&
        Number(convert.reservation_id ?? 0) > 0 &&
        Number(convert.order_id ?? 0) > 0 &&
        convert.inventory_status_after_convert === "sold" &&
        convert.reservation_status_after_convert === "converted",
      expected: "sold/converted",
      actual: {
        validated: convert.validated ?? null,
        cartSerialized: convert.cart_serialized ?? null,
        orderId: convert.order_id ?? null,
        inventoryStatus: convert.inventory_status_after_convert ?? null,
        reservationStatus: convert.reservation_status_after_convert ?? null,
      },
    },
    {
      name: "cleanup_removed_temporary_data",
      pass:
        cleanup.product_deleted === true &&
        cleanup.order_deleted === true &&
        Number(cleanup.inventory_rows_deleted ?? 0) >= 2 &&
        Number(cleanup.reservation_rows_deleted ?? 0) >= 2,
      expected: "product/order/inventory/reservations deleted",
      actual: cleanup,
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
