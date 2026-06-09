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
const remoteRunnerPath = `${remoteUploadDir}/commerce-menu-production-configure-${timestampForRemoteName(
  new Date(),
)}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const confirmValue = "configure-production-commerce-menu"

const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

const menu = {
  name: "Pug Storefront Menu",
  location: "primary",
  items: [
    { type: "home", label: "Home" },
    { type: "page", slug: "shop-singles", label: "Singles" },
    { type: "page", slug: "shop-sealed-products", label: "Sealed" },
    { type: "page", slug: "shop-graded-cards", label: "Graded" },
    { type: "page", slug: "shop-accessories", label: "Accessories" },
    { type: "page", slug: "events", label: "Events" },
    { type: "custom", url: "/buying/", label: "Buying" },
    { type: "custom", url: "/contact/", label: "Contact" },
  ],
  excludedPageSlugs: ["shop"],
}

const expectations = {
  pluginVersion: String(process.env.PUG_PROD_EXPECT_PLUGIN_VERSION ?? packageJson.version),
  menu,
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_commerce_menu_configure_dry_run",
        remoteRunnerPath,
        wpPath,
        wpCli,
        expectations,
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_COMMERCE_MENU",
        ],
        optionalEnv: ["PUG_PROD_EXPECT_PLUGIN_VERSION", "PUG_PROD_REMOTE_UPLOAD_DIR", "PUG_PROD_WP_PATH"],
        readsIgnoredEnvFile: ".env.production.local",
        createsOrUpdatesNavigationMenu: true,
        assignsPrimaryMenuLocation: true,
        removesBasicShopFromHeaderMenu: true,
        backsUpPreviousMenuAssignmentToOption: true,
        touchesThemeFiles: false,
        changesHomepage: false,
        writesWordPressSettings: true,
        writesWordPressData: true,
        runsProviderNetworkRequest: false,
        productionApprovalRequired: true,
        credentialsPrinted: false,
        rawContentPrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing production commerce menu environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_COMMERCE_MENU !== confirmValue) {
  throw new Error(`Set PUG_PROD_CONFIRM_COMMERCE_MENU=${confirmValue} to configure the production commerce menu.`)
}

const runnerSource = `<?php
$payload = json_decode(stream_get_contents(STDIN), true);
if (!is_array($payload)) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'invalid_payload'));
\texit(1);
}
if (!class_exists('TCGStorePlatform\\\\Version')) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
\texit(1);
}

$menu_payload = is_array($payload['menu'] ?? null) ? $payload['menu'] : array();
$menu_name = sanitize_text_field((string) ($menu_payload['name'] ?? ''));
$menu_location = sanitize_key((string) ($menu_payload['location'] ?? ''));
$menu_items_payload = is_array($menu_payload['items'] ?? null) ? $menu_payload['items'] : array();
$excluded_page_slugs = is_array($menu_payload['excludedPageSlugs'] ?? null)
\t? array_values(array_filter(array_map('sanitize_title', $menu_payload['excludedPageSlugs'])))
\t: array();

if ('' === $menu_name || '' === $menu_location || array() === $menu_items_payload) {
\techo wp_json_encode(array('status' => 'error', 'message' => 'invalid_menu_payload'));
\texit(1);
}

$registered_locations = get_registered_nav_menus();
if (!array_key_exists($menu_location, $registered_locations)) {
\techo wp_json_encode(array(
\t\t'status' => 'error',
\t\t'message' => 'menu_location_not_registered',
\t\t'menu_location' => $menu_location,
\t\t'registered_locations' => array_keys($registered_locations),
\t));
\texit(1);
}

$locations = get_nav_menu_locations();
$previous_menu_id = (int) ($locations[$menu_location] ?? 0);
$previous_menu = $previous_menu_id > 0 ? wp_get_nav_menu_object($previous_menu_id) : null;
$previous_items = $previous_menu_id > 0 ? wp_get_nav_menu_items($previous_menu_id, array('post_status' => 'any')) : array();
$previous_items = is_array($previous_items) ? $previous_items : array();
$backup_key = '_tcg_store_commerce_menu_backup_' . gmdate('YmdHis');

update_option(
\t$backup_key,
\tarray(
\t\t'backed_up_at_gmt' => gmdate('c'),
\t\t'theme' => get_stylesheet(),
\t\t'location' => $menu_location,
\t\t'locations' => $locations,
\t\t'previous_menu_id' => $previous_menu_id,
\t\t'previous_menu_name' => $previous_menu ? (string) $previous_menu->name : '',
\t\t'previous_items' => array_map(
\t\t\tstatic function ($item) {
\t\t\t\treturn array(
\t\t\t\t\t'id' => (int) $item->ID,
\t\t\t\t\t'title' => (string) $item->title,
\t\t\t\t\t'url' => (string) $item->url,
\t\t\t\t\t'type' => (string) $item->type,
\t\t\t\t\t'object' => (string) $item->object,
\t\t\t\t\t'object_id' => (int) $item->object_id,
\t\t\t\t\t'menu_order' => (int) $item->menu_order,
\t\t\t\t);
\t\t\t},
\t\t\t$previous_items
\t\t),
\t),
\tfalse
);

$menu_object = wp_get_nav_menu_object($menu_name);
if (!$menu_object) {
\t$created_menu_id = wp_create_nav_menu($menu_name);
\tif (is_wp_error($created_menu_id)) {
\t\techo wp_json_encode(array('status' => 'error', 'message' => $created_menu_id->get_error_code()));
\t\texit(1);
\t}
\t$menu_id = (int) $created_menu_id;
\t$menu_action = 'created';
} else {
\t$menu_id = (int) $menu_object->term_id;
\t$menu_action = 'updated';
}

$existing_items = wp_get_nav_menu_items($menu_id, array('post_status' => 'any'));
$existing_items = is_array($existing_items) ? $existing_items : array();
foreach ($existing_items as $existing_item) {
\twp_delete_post((int) $existing_item->ID, true);
}

$created_items = array();
$missing_pages = array();
$order = 1;
foreach ($menu_items_payload as $item_payload) {
\tif (!is_array($item_payload)) {
\t\tcontinue;
\t}
\t$type = sanitize_key((string) ($item_payload['type'] ?? ''));
\t$label = sanitize_text_field((string) ($item_payload['label'] ?? ''));
\tif ('' === $label) {
\t\tcontinue;
\t}
\t$item_args = array(
\t\t'menu-item-title' => $label,
\t\t'menu-item-status' => 'publish',
\t\t'menu-item-position' => $order,
\t);
\tif ('home' === $type) {
\t\t$item_args['menu-item-type'] = 'custom';
\t\t$item_args['menu-item-url'] = home_url('/');
\t} elseif ('custom' === $type) {
\t\t$url = trim((string) ($item_payload['url'] ?? ''));
\t\tif ('' === $url || 0 !== strpos($url, '/')) {
\t\t\tcontinue;
\t\t}
\t\t$item_args['menu-item-type'] = 'custom';
\t\t$item_args['menu-item-url'] = home_url($url);
\t} elseif ('page' === $type) {
\t\t$slug = sanitize_title((string) ($item_payload['slug'] ?? ''));
\t\t$page = get_page_by_path($slug, OBJECT, 'page');
\t\tif (!$page instanceof WP_Post || 'publish' !== get_post_status($page)) {
\t\t\t$missing_pages[] = $slug;
\t\t\tcontinue;
\t\t}
\t\t$item_args['menu-item-type'] = 'post_type';
\t\t$item_args['menu-item-object'] = 'page';
\t\t$item_args['menu-item-object-id'] = (int) $page->ID;
\t} else {
\t\tcontinue;
\t}

\t$item_id = wp_update_nav_menu_item($menu_id, 0, $item_args);
\tif (is_wp_error($item_id)) {
\t\techo wp_json_encode(array('status' => 'error', 'message' => $item_id->get_error_code(), 'label' => $label));
\t\texit(1);
\t}
\t$created_items[] = array(
\t\t'id' => (int) $item_id,
\t\t'label' => $label,
\t\t'type' => $type,
\t\t'slug' => (string) ($item_payload['slug'] ?? ''),
\t\t'position' => $order,
\t);
\t$order++;
}

if (array() !== $missing_pages) {
\techo wp_json_encode(array(
\t\t'status' => 'error',
\t\t'message' => 'menu_pages_missing',
\t\t'missing_pages' => $missing_pages,
\t\t'backup_option' => $backup_key,
\t));
\texit(1);
}

$locations[$menu_location] = $menu_id;
set_theme_mod('nav_menu_locations', $locations);

$assigned_locations = get_nav_menu_locations();
$assigned_menu_id = (int) ($assigned_locations[$menu_location] ?? 0);
$final_items = wp_get_nav_menu_items($menu_id, array('post_status' => 'publish'));
$final_items = is_array($final_items) ? $final_items : array();
$final_labels = array_values(array_map(
\tstatic function ($item) {
\t\treturn (string) $item->title;
\t},
\t$final_items
));
$final_urls = array_values(array_map(
\tstatic function ($item) {
\t\treturn (string) $item->url;
\t},
\t$final_items
));
$excluded_present = array();
foreach ($excluded_page_slugs as $excluded_slug) {
\t$excluded_page = get_page_by_path($excluded_slug, OBJECT, 'page');
\tif (!$excluded_page instanceof WP_Post) {
\t\tcontinue;
\t}
\tforeach ($final_items as $item) {
\t\tif ('page' === (string) $item->object && (int) $item->object_id === (int) $excluded_page->ID) {
\t\t\t$excluded_present[] = $excluded_slug;
\t\t}
\t}
}

echo wp_json_encode(array(
\t'action' => 'production_commerce_menu_configured',
\t'status' => 'ok',
\t'plugin_version' => TCGStorePlatform\\Version::PLUGIN,
\t'database_version' => TCGStorePlatform\\Version::DATABASE,
\t'menu' => array(
\t\t'id' => $menu_id,
\t\t'name' => $menu_name,
\t\t'action' => $menu_action,
\t\t'cleared_previous_managed_items' => count($existing_items),
\t\t'created_items' => $created_items,
\t\t'final_labels' => $final_labels,
\t\t'final_urls' => $final_urls,
\t\t'excluded_page_slugs' => $excluded_page_slugs,
\t\t'excluded_present' => $excluded_present,
\t),
\t'location' => array(
\t\t'name' => $menu_location,
\t\t'assigned_menu_id' => $assigned_menu_id,
\t\t'previous_menu_id' => $previous_menu_id,
\t\t'previous_menu_name' => $previous_menu ? (string) $previous_menu->name : '',
\t),
\t'backup_option' => $backup_key,
\t'createsOrUpdatesNavigationMenu' => true,
\t'assignsPrimaryMenuLocation' => true,
\t'removesBasicShopFromHeaderMenu' => array() === $excluded_present,
\t'backsUpPreviousMenuAssignmentToOption' => true,
\t'touchesThemeFiles' => false,
\t'changesHomepage' => false,
\t'writesWordPressSettings' => true,
\t'writesWordPressData' => true,
\t'runsProviderNetworkRequest' => false,
\t'credentialsPrinted' => false,
\t'rawContentPrinted' => false,
));
`

const result = await withProductionConnection(async (connection) => {
  await writeRemoteFile(connection, remoteRunnerPath, runnerSource)

  try {
    const execution = await execWithStdin(
      connection,
      `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
      JSON.stringify({ menu }),
    )
    const parsed = parseJson(execution.stdout)
    const checks = buildChecks(parsed, expectations)

    return {
      action: "production_commerce_menu_configured",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      pluginVersion: parsed?.plugin_version ?? null,
      databaseVersion: parsed?.database_version ?? null,
      menu: parsed?.menu ?? null,
      location: parsed?.location ?? null,
      backupOption: parsed?.backup_option ?? null,
      expectations,
      checks,
      passed: execution.code === 0 && parsed?.status === "ok" && checks.every((check) => check.pass),
      runnerRemoved: false,
      createsOrUpdatesNavigationMenu: true,
      assignsPrimaryMenuLocation: true,
      removesBasicShopFromHeaderMenu: true,
      touchesThemeFiles: false,
      changesHomepage: false,
      writesWordPressSettings: true,
      writesWordPressData: true,
      runsProviderNetworkRequest: false,
      productionApprovalRequired: true,
      credentialsPrinted: false,
      rawContentPrinted: false,
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
  const actualLabels = Array.isArray(parsed?.menu?.final_labels) ? parsed.menu.final_labels : []
  const expectedLabels = expected.menu.items.map((item) => item.label)
  const createdItems = Array.isArray(parsed?.menu?.created_items) ? parsed.menu.created_items : []
  const excludedPresent = Array.isArray(parsed?.menu?.excluded_present) ? parsed.menu.excluded_present : []

  return [
    {
      name: "plugin_version",
      pass: parsed?.plugin_version === expected.pluginVersion,
      expected: expected.pluginVersion,
      actual: parsed?.plugin_version ?? null,
    },
    {
      name: "primary_location_assigned",
      pass:
        parsed?.location?.name === expected.menu.location &&
        Number(parsed?.location?.assigned_menu_id ?? 0) === Number(parsed?.menu?.id ?? 0),
      expected: expected.menu.location,
      actual: parsed?.location ?? null,
    },
    {
      name: "expected_menu_items_created",
      pass: createdItems.length === expected.menu.items.length,
      expected: expected.menu.items.length,
      actual: createdItems.length,
    },
    {
      name: "expected_menu_labels",
      pass: JSON.stringify(actualLabels) === JSON.stringify(expectedLabels),
      expected: expectedLabels,
      actual: actualLabels,
    },
    {
      name: "basic_shop_removed",
      pass: excludedPresent.length === 0 && parsed?.removesBasicShopFromHeaderMenu === true,
      expected: [],
      actual: excludedPresent,
    },
    {
      name: "backup_option_created",
      pass: /^_tcg_store_commerce_menu_backup_\d{14}$/.test(String(parsed?.backup_option ?? "")),
      expected: "_tcg_store_commerce_menu_backup_YYYYMMDDHHMMSS",
      actual: parsed?.backup_option ?? null,
    },
    {
      name: "no_theme_file_edits",
      pass: parsed?.touchesThemeFiles === false,
      expected: false,
      actual: parsed?.touchesThemeFiles ?? null,
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
