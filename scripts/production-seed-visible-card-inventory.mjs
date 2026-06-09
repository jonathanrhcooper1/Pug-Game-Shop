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
const remoteRunnerPath = `${remoteUploadDir}/visible-card-inventory-seed-${timestampForRemoteName(new Date())}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const confirmValue = "seed-visible-card-inventory"
const perGame = boundedInt(process.env.PUG_PROD_VISIBLE_CARD_SEED_PER_GAME ?? "12", 10, 15)
const games = normalizeGames(
  process.env.PUG_PROD_VISIBLE_CARD_SEED_GAMES ?? "pokemon,magicthegathering,lorcana,onepiece",
)

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
        action: "production_visible_card_inventory_seed_dry_run",
        remoteRunnerPath,
        wpPath,
        wpCli,
        games,
        perGame,
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_VISIBLE_CARD_SEED",
        ],
        optionalEnv: ["PUG_PROD_VISIBLE_CARD_SEED_GAMES", "PUG_PROD_VISIBLE_CARD_SEED_PER_GAME"],
        readsIgnoredEnvFile: ".env.production.local",
        createsDefaultInventoryLocation: true,
        createsVisibleInventoryRows: true,
        syncsWooCommerceGroupedCardProducts: true,
        usesScryDexReferenceDatabaseOnly: true,
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
  throw new Error(`Missing production visible card seed environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_VISIBLE_CARD_SEED !== confirmValue) {
  throw new Error(`Set PUG_PROD_CONFIRM_VISIBLE_CARD_SEED=${confirmValue} to seed production inventory.`)
}

const runnerSource = `<?php
$payload = json_decode(stream_get_contents(STDIN), true);
if (!is_array($payload)) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'invalid_payload'));
\texit(1);
}
if (!class_exists('TCGStorePlatform\\\\Inventory\\\\InventoryIntakeParser')) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
\texit(1);
}

global $wpdb;
$games = array_values(array_filter(array_map('sanitize_key', (array) ($payload['games'] ?? array()))));
$per_game = max(10, min(15, absint($payload['per_game'] ?? 12)));
$result = array(
\t'action' => 'production_visible_card_inventory_seed',
\t'status' => 'ok',
\t'plugin_version' => class_exists('TCGStorePlatform\\\\Version') ? TCGStorePlatform\\Version::PLUGIN : '',
\t'database_version' => class_exists('TCGStorePlatform\\\\Version') ? TCGStorePlatform\\Version::DATABASE : '',
\t'games' => array(),
\t'created_inventory_rows' => 0,
\t'existing_inventory_rows' => 0,
\t'synced_woocommerce_products' => 0,
\t'createsDefaultInventoryLocation' => true,
\t'createsVisibleInventoryRows' => true,
\t'syncsWooCommerceGroupedCardProducts' => true,
\t'usesScryDexReferenceDatabaseOnly' => true,
\t'runsProviderNetworkRequest' => false,
\t'productionApprovalRequired' => true,
\t'credentialsPrinted' => false,
\t'rawResponsePrinted' => false,
);

$location_id = tcg_seed_default_location($wpdb);
$parser = new TCGStorePlatform\\Inventory\\InventoryIntakeParser();
$planner = new TCGStorePlatform\\Inventory\\InventoryIntakePersistencePlanner();
$repository = new TCGStorePlatform\\Inventory\\InventoryIntakeRepository($wpdb);

foreach ($games as $game) {
\t$cards = tcg_seed_candidate_cards($wpdb, $game, $per_game);
\t$game_result = array(
\t\t'game' => $game,
\t\t'selected_cards' => count($cards),
\t\t'created' => 0,
\t\t'existing' => 0,
\t\t'failed' => 0,
\t\t'synced_products' => 0,
\t\t'products' => array(),
\t\t'errors' => array(),
\t);

\tforeach ($cards as $index => $card) {
\t\t$barcode = tcg_seed_barcode($game, (int) ($card['reference_card_id'] ?? 0));
\t\t$existing = tcg_seed_inventory_by_barcode($wpdb, $barcode);
\t\t$row = $existing;

\t\tif (array() === $existing) {
\t\t\t$price_minor = max(100, (int) round((float) ($card['price'] ?? 1) * 100));
\t\t\t$payload = array(
\t\t\t\t'source' => 'scrydex_import',
\t\t\t\t'idempotency_key' => 'production-visible-seed:' . $game . ':' . (string) ($card['reference_card_id'] ?? ''),
\t\t\t\t'status' => 'available',
\t\t\t\t'game' => (string) ($card['game'] ?? $game),
\t\t\t\t'card_name' => (string) ($card['name'] ?? ''),
\t\t\t\t'set_name' => (string) ($card['set_name'] ?? ''),
\t\t\t\t'set_code' => (string) ($card['set_code'] ?? ''),
\t\t\t\t'card_number' => (string) ($card['card_number'] ?? ''),
\t\t\t\t'printed_number' => (string) ($card['printed_number'] ?? ($card['card_number'] ?? '')),
\t\t\t\t'provider_name' => (string) ($card['provider_name'] ?? 'scrydex'),
\t\t\t\t'provider_card_id' => (string) ($card['provider_card_id'] ?? ''),
\t\t\t\t'reference_card_id' => (int) ($card['reference_card_id'] ?? 0),
\t\t\t\t'reference_variant_id' => null,
\t\t\t\t'raw_or_graded' => 'raw',
\t\t\t\t'condition_code' => tcg_seed_condition($index),
\t\t\t\t'barcode' => $barcode,
\t\t\t\t'sku' => $barcode,
\t\t\t\t'sale_currency' => 'USD',
\t\t\t\t'currency' => 'USD',
\t\t\t\t'market_price_minor_units' => $price_minor,
\t\t\t\t'sale_price_minor_units' => $price_minor,
\t\t\t\t'minimum_sale_price_minor_units' => max(1, (int) floor($price_minor * 0.75)),
\t\t\t\t'location_id' => $location_id,
\t\t\t\t'online_visibility' => 'visible',
\t\t\t\t'kiosk_visibility' => 'visible',
\t\t\t\t'pos_visibility' => 'visible',
\t\t\t\t'front_image_remote_url' => (string) ($card['front_image_url'] ?? ''),
\t\t\t\t'back_image_remote_url' => (string) ($card['back_image_url'] ?? ''),
\t\t\t);
\t\t\t$validation = $parser->parse($payload, (string) $payload['idempotency_key'], null);
\t\t\tif (!$validation->is_valid() || null === $validation->request()) {
\t\t\t\t++$game_result['failed'];
\t\t\t\t$game_result['errors'][] = array('barcode' => $barcode, 'stage' => 'parse', 'errors' => $validation->errors());
\t\t\t\tcontinue;
\t\t\t}
\t\t\t$plan = $planner->plan($validation->request(), (string) $wpdb->prefix);
\t\t\tif (!$plan->is_valid()) {
\t\t\t\t++$game_result['failed'];
\t\t\t\t$game_result['errors'][] = array('barcode' => $barcode, 'stage' => 'plan', 'errors' => $plan->errors());
\t\t\t\tcontinue;
\t\t\t}
\t\t\t$created = $repository->create($plan);
\t\t\tif (!$created->is_inserted()) {
\t\t\t\t++$game_result['failed'];
\t\t\t\t$game_result['errors'][] = array('barcode' => $barcode, 'stage' => 'insert', 'errors' => $created->errors());
\t\t\t\tcontinue;
\t\t\t}
\t\t\t$row = tcg_seed_inventory_by_id($wpdb, (int) $created->insert_id());
\t\t\t++$game_result['created'];
\t\t\t++$result['created_inventory_rows'];
\t\t} else {
\t\t\t++$game_result['existing'];
\t\t\t++$result['existing_inventory_rows'];
\t\t}

\t\tif (array() === $row) {
\t\t\tcontinue;
\t\t}

\t\t$sync = tcg_seed_sync_grouped_product($wpdb, $row);
\t\tif (true === ($sync['synced'] ?? false)) {
\t\t\t++$game_result['synced_products'];
\t\t\t++$result['synced_woocommerce_products'];
\t\t}
\t\t$game_result['products'][] = array(
\t\t\t'card_name' => (string) ($row['card_name'] ?? ''),
\t\t\t'barcode' => $barcode,
\t\t\t'product_id' => (int) ($sync['product_id'] ?? 0),
\t\t\t'synced' => true === ($sync['synced'] ?? false),
\t\t\t'url' => !empty($sync['product_id']) ? get_permalink((int) $sync['product_id']) : '',
\t\t);
\t}

\t$result['games'][] = $game_result;
}

$result['passed'] = 0 === array_sum(array_map(static fn($game_result) => (int) ($game_result['failed'] ?? 0), $result['games']));

echo wp_json_encode($result);
if (!$result['passed']) {
\texit(1);
}

function tcg_seed_candidate_cards(wpdb $wpdb, string $game, int $limit): array {
\t$cards = $wpdb->prefix . 'tcg_reference_cards';
\t$prices = $wpdb->prefix . 'tcg_provider_price_points';
\t$sql = $wpdb->prepare(
\t\t"SELECT c.reference_card_id, c.provider_name, c.provider_card_id, c.game, c.name, c.set_name, c.set_code, c.card_number, c.printed_number, c.rarity, c.front_image_url, c.back_image_url, MIN(COALESCE(p.market_price, p.mid_price, p.low_price, p.high_price)) AS price
\t\tFROM {$cards} c
\t\tJOIN {$prices} p ON p.provider_name = c.provider_name AND p.provider_card_id = c.provider_card_id
\t\tWHERE c.game = %s AND COALESCE(c.front_image_url, '') <> ''
\t\tGROUP BY c.reference_card_id
\t\tHAVING price BETWEEN 1 AND 80
\t\tORDER BY COALESCE(c.release_date, '1900-01-01') DESC, c.reference_card_id DESC
\t\tLIMIT %d",
\t\t$game,
\t\t$limit
\t);
\t$rows = is_string($sql) ? $wpdb->get_results($sql, ARRAY_A) : array();

\treturn is_array($rows) ? array_values(array_filter($rows, 'is_array')) : array();
}

function tcg_seed_default_location(wpdb $wpdb): int {
\t$table = $wpdb->prefix . 'tcg_inventory_locations';
\t$existing = $wpdb->get_var($wpdb->prepare("SELECT location_id FROM {$table} WHERE code = %s LIMIT 1", 'MAIN'));
\tif ((int) $existing > 0) {
\t\treturn (int) $existing;
\t}

\t$now = gmdate('Y-m-d H:i:s.u');
\t$inserted = $wpdb->insert(
\t\t$table,
\t\tarray(
\t\t\t'public_id' => function_exists('wp_generate_uuid4') ? wp_generate_uuid4() : tcg_seed_uuid('location:main'),
\t\t\t'parent_location_id' => null,
\t\t\t'location_type' => 'store',
\t\t\t'code' => 'MAIN',
\t\t\t'name' => 'Main Store',
\t\t\t'timezone' => 'America/New_York',
\t\t\t'is_active' => 1,
\t\t\t'sort_order' => 1,
\t\t\t'created_at' => $now,
\t\t\t'updated_at' => $now,
\t\t\t'row_version' => 1,
\t\t)
\t);

\treturn false === $inserted ? 0 : (int) $wpdb->insert_id;
}

function tcg_seed_inventory_by_barcode(wpdb $wpdb, string $barcode): array {
\t$table = $wpdb->prefix . 'tcg_inventory_items';
\t$sql = $wpdb->prepare("SELECT * FROM {$table} WHERE barcode = %s LIMIT 1", $barcode);
\t$row = is_string($sql) ? $wpdb->get_row($sql, ARRAY_A) : null;

\treturn is_array($row) ? $row : array();
}

function tcg_seed_inventory_by_id(wpdb $wpdb, int $inventory_id): array {
\t$table = $wpdb->prefix . 'tcg_inventory_items';
\t$sql = $wpdb->prepare("SELECT * FROM {$table} WHERE inventory_id = %d LIMIT 1", $inventory_id);
\t$row = is_string($sql) ? $wpdb->get_row($sql, ARRAY_A) : null;

\treturn is_array($row) ? $row : array();
}

function tcg_seed_sync_grouped_product(wpdb $wpdb, array $seed_row): array {
\t$group_rows = tcg_seed_inventory_group_rows($wpdb, $seed_row);
\tif (array() === $group_rows) {
\t\t$group_rows = array($seed_row);
\t}
\t$context = array(
\t\t'environment' => function_exists('wp_get_environment_type') ? wp_get_environment_type() : 'production',
\t\t'store_currency' => (string) ($seed_row['sale_currency'] ?? 'USD'),
\t\t'production_write_approval' => 'woocommerce-product-sync',
\t);
\t$plan = (new TCGStorePlatform\\WooCommerce\\InventoryProductProjectionPlanner())->plan_group($group_rows, $context);
\t$execution = (new TCGStorePlatform\\WooCommerce\\InventoryProductProjectionExecutor(
\t\ttrue,
\t\tnew TCGStorePlatform\\WooCommerce\\WooCommerceInventoryProductWriter(),
\t\tnew TCGStorePlatform\\WooCommerce\\InventoryProductWriteRequestPlanner(),
\t\t$context
\t))->execute($plan);
\t$product_ids = $execution->product_ids();
\t$product_id = isset($product_ids[0]) ? (int) $product_ids[0] : 0;
\t$mapping = null;
\tif ($execution->is_executed() && $product_id > 0) {
\t\t$mapping = (new TCGStorePlatform\\Inventory\\InventoryExternalMappingRepository($wpdb))->mark_woocommerce_product_synced_for_inventory_ids(
\t\t\tarray_values(array_filter(array_map(static fn($row) => (int) ($row['inventory_id'] ?? 0), $group_rows))),
\t\t\t$product_id
\t\t);
\t}

\treturn array(
\t\t'synced' => $execution->is_executed() && true === ($mapping['synced'] ?? false),
\t\t'product_id' => $product_id,
\t\t'status' => $execution->status(),
\t\t'errors' => array_values(array_unique(array_merge($execution->errors(), $execution->block_reasons(), is_array($mapping) ? ($mapping['errors'] ?? array()) : array()))),
\t);
}

function tcg_seed_inventory_group_rows(wpdb $wpdb, array $seed_row): array {
\t$table = $wpdb->prefix . 'tcg_inventory_items';
\t$reference_id = absint($seed_row['reference_card_id'] ?? 0);
\tif ($reference_id > 0) {
\t\t$sql = $wpdb->prepare("SELECT * FROM {$table} WHERE reference_card_id = %d ORDER BY condition_code ASC, sale_price ASC, inventory_id ASC", $reference_id);
\t\t$rows = is_string($sql) ? $wpdb->get_results($sql, ARRAY_A) : array();
\t\treturn is_array($rows) ? array_values(array_filter($rows, 'is_array')) : array();
\t}

\treturn array($seed_row);
}

function tcg_seed_condition(int $index): string {
\t$conditions = array('NM', 'LP', 'MP');
\treturn $conditions[$index % count($conditions)];
}

function tcg_seed_barcode(string $game, int $reference_card_id): string {
\t$game = strtoupper(preg_replace('/[^A-Z0-9]+/i', '', $game) ?: 'CARD');
\treturn substr('PUG-SEED-' . $game . '-' . (string) $reference_card_id, 0, 64);
}

function tcg_seed_uuid(string $seed): string {
\t$hex = hash('sha256', $seed);
\treturn substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20, 12);
}
`

const result = await withProductionConnection(async (connection) => {
  await writeRemoteFile(connection, remoteRunnerPath, runnerSource)

  try {
    const execution = await execWithStdin(
      connection,
      `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
      JSON.stringify({ games, per_game: perGame }),
    )
    const parsed = parseJson(execution.stdout)
    const checks = buildChecks(parsed, execution.code)

    return {
      action: "production_visible_card_inventory_seed",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      pluginVersion: parsed?.plugin_version ?? null,
      databaseVersion: parsed?.database_version ?? null,
      games: parsed?.games ?? [],
      createdInventoryRows: Number(parsed?.created_inventory_rows ?? 0),
      existingInventoryRows: Number(parsed?.existing_inventory_rows ?? 0),
      syncedWooCommerceProducts: Number(parsed?.synced_woocommerce_products ?? 0),
      checks,
      passed: execution.code === 0 && parsed?.status === "ok" && checks.every((check) => check.pass),
      runnerRemoved: false,
      createsDefaultInventoryLocation: true,
      createsVisibleInventoryRows: true,
      syncsWooCommerceGroupedCardProducts: true,
      usesScryDexReferenceDatabaseOnly: true,
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

if (!result.passed) {
  process.exitCode = 1
}

function buildChecks(parsed, exitCode) {
  const gameResults = Array.isArray(parsed?.games) ? parsed.games : []
  const allProducts = gameResults.flatMap((game) => (Array.isArray(game.products) ? game.products : []))

  return [
    {
      name: "remote_execution_succeeded",
      pass: exitCode === 0 && parsed?.status === "ok",
      expected: "exit 0/status ok",
      actual: { exitCode, status: parsed?.status ?? null },
    },
    {
      name: "expected_games_seeded",
      pass: gameResults.length === games.length,
      expected: games,
      actual: gameResults.map((game) => game.game),
    },
    {
      name: "ten_to_fifteen_cards_per_game_selected",
      pass: gameResults.every((game) => Number(game.selected_cards ?? 0) >= 10 && Number(game.selected_cards ?? 0) <= 15),
      expected: `${perGame} per game`,
      actual: gameResults.map((game) => ({ game: game.game, selected: Number(game.selected_cards ?? 0) })),
    },
    {
      name: "visible_inventory_rows_available",
      pass: gameResults.every((game) => Number(game.created ?? 0) + Number(game.existing ?? 0) >= 10),
      expected: ">=10 rows per game",
      actual: gameResults.map((game) => ({
        game: game.game,
        created: Number(game.created ?? 0),
        existing: Number(game.existing ?? 0),
      })),
    },
    {
      name: "woocommerce_grouped_products_synced",
      pass: allProducts.length >= games.length * 10 && allProducts.every((product) => product.synced === true && Number(product.product_id ?? 0) > 0),
      expected: "all seeded cards have product IDs",
      actual: {
        productCount: allProducts.length,
        syncedCount: allProducts.filter((product) => product.synced === true).length,
      },
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
      .connect({
        host: requiredEnv.PUG_PROD_SSH_HOST,
        username: requiredEnv.PUG_PROD_SSH_USER,
        password: requiredEnv.PUG_PROD_SSH_PASSWORD,
        readyTimeout: Number.parseInt(String(process.env.PUG_PROD_SSH_READY_TIMEOUT_MS ?? "60000"), 10),
        algorithms: STAGING_SSH_ALGORITHMS,
      })
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

function normalizeRemoteDir(value) {
  return `/${String(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`
}

function normalizeGames(value) {
  const games = String(value)
    .split(",")
    .map((game) => game.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean)

  return games.length > 0 ? Array.from(new Set(games)) : ["pokemon", "magicthegathering", "lorcana", "onepiece"]
}

function boundedInt(value, min, max) {
  const parsed = Number.parseInt(String(value), 10)

  if (!Number.isFinite(parsed)) {
    return min
  }

  return Math.max(min, Math.min(max, parsed))
}

function parseJson(value) {
  try {
    return JSON.parse(String(value).trim())
  } catch {
    return null
  }
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
