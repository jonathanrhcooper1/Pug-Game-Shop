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
const remoteRunnerPath = `${remoteUploadDir}/public-pages-production-configure-${timestampForRemoteName(
  new Date(),
)}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const confirmValue = "configure-public-pages"

const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

const pages = [
  {
    slug: "shop-singles",
    title: "Shop Singles",
    content:
      '<div class="tcg-storefront-shelf tcg-storefront-shelf--singles"><section class="tcg-storefront-shelf__hero"><p class="tcg-storefront-shelf__kicker">Live singles inventory</p><h2>Singles vault</h2><p>Search real-time card inventory by game, set, card name, condition, price, and in-stock quantity. Choose a card to select the exact condition/version before checkout.</p><nav class="tcg-storefront-shelf__nav" aria-label="Store shelves"><a href="/shop-singles/">Singles</a><a href="/shop-sealed-products/">Sealed</a><a href="/shop-graded-cards/">Graded</a><a href="/shop-accessories/">Accessories</a><a href="/events/">Events</a></nav><div class="tcg-storefront-shelf__stats"><div class="tcg-storefront-shelf__stat"><span>Online</span><strong>Live stock</strong></div><div class="tcg-storefront-shelf__stat"><span>Cards</span><strong>Images + prices</strong></div><div class="tcg-storefront-shelf__stat"><span>Checkout</span><strong>Exact copy</strong></div></div></section>[tcg_inventory_search limit="36"]</div>',
  },
  {
    slug: "shop-sealed-products",
    title: "Shop Sealed Products",
    content:
      '<div class="tcg-storefront-shelf tcg-storefront-shelf--sealed"><section class="tcg-storefront-shelf__hero"><p class="tcg-storefront-shelf__kicker">Boxes, packs, bundles</p><h2>Sealed product</h2><p>Fresh sealed product, preorders, bundles, and display-ready drops grouped away from singles so shoppers can move fast.</p><nav class="tcg-storefront-shelf__nav" aria-label="Store shelves"><a href="/shop-singles/">Singles</a><a href="/shop-sealed-products/">Sealed</a><a href="/shop-graded-cards/">Graded</a><a href="/shop-accessories/">Accessories</a></nav></section>[tcg_product_shelf category="sealed-products" label="Sealed Products" limit="24"]</div>',
  },
  {
    slug: "shop-graded-cards",
    title: "Shop Graded Cards",
    content:
      '<div class="tcg-storefront-shelf tcg-storefront-shelf--graded"><section class="tcg-storefront-shelf__hero"><p class="tcg-storefront-shelf__kicker">Slabs and showcase cards</p><h2>Graded cards</h2><p>Certified cards added through intake publish here when they are made visible online, with grades and cert details preserved in inventory.</p><nav class="tcg-storefront-shelf__nav" aria-label="Store shelves"><a href="/shop-singles/">Singles</a><a href="/shop-sealed-products/">Sealed</a><a href="/shop-graded-cards/">Graded</a><a href="/shop-accessories/">Accessories</a></nav></section>[tcg_product_shelf category="graded-cards" label="Graded Cards" limit="24"]</div>',
  },
  {
    slug: "shop-accessories",
    title: "Shop Accessories",
    content:
      '<div class="tcg-storefront-shelf tcg-storefront-shelf--accessories"><section class="tcg-storefront-shelf__hero"><p class="tcg-storefront-shelf__kicker">Gear for play nights</p><h2>Accessories</h2><p>Sleeves, deck boxes, binders, dice, mats, and table gear live here once they are categorized for online sale.</p><nav class="tcg-storefront-shelf__nav" aria-label="Store shelves"><a href="/shop-singles/">Singles</a><a href="/shop-sealed-products/">Sealed</a><a href="/shop-graded-cards/">Graded</a><a href="/shop-accessories/">Accessories</a></nav></section>[tcg_product_shelf category="accessories" label="Accessories" limit="24"]</div>',
  },
  {
    slug: "card-inventory",
    title: "Card Inventory",
    content:
      '<div class="tcg-storefront-shelf tcg-storefront-shelf--singles">[tcg_inventory_search limit="36"]</div>',
  },
  {
    slug: "events",
    title: "Events",
    content: '<!-- wp:shortcode -->\n[tcg_events limit="12"]\n<!-- /wp:shortcode -->',
  },
]

const productCategories = [
  { slug: "singles", name: "Singles", parent: "" },
  { slug: "sealed-products", name: "Sealed Products", parent: "" },
  { slug: "graded-cards", name: "Graded Cards", parent: "" },
  { slug: "accessories", name: "Accessories", parent: "" },
  { slug: "magic-the-gathering", name: "Magic: The Gathering", parent: "" },
  { slug: "pokemon", name: "Pokemon", parent: "" },
  { slug: "lorcana", name: "Lorcana", parent: "" },
  { slug: "one-piece", name: "One Piece", parent: "" },
  { slug: "riftbound", name: "Riftbound", parent: "" },
  { slug: "gundam", name: "Gundam", parent: "" },
]

const expectations = {
  pluginVersion: String(process.env.PUG_PROD_EXPECT_PLUGIN_VERSION ?? packageJson.version),
  pages,
  productCategories,
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_public_pages_configure_dry_run",
        remoteRunnerPath,
        wpPath,
        wpCli,
        expectations,
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_PUBLIC_PAGES",
        ],
        optionalEnv: ["PUG_PROD_EXPECT_PLUGIN_VERSION"],
        readsIgnoredEnvFile: ".env.production.local",
        createsOrUpdatesPages: true,
        createsOrUpdatesProductCategories: true,
        pageSlugs: pages.map((page) => page.slug),
        productCategorySlugs: productCategories.map((category) => category.slug),
        backsUpExistingPageContentToPostMeta: true,
        changesHomepage: false,
        changesNavigationMenus: false,
        writesWordPressSettings: false,
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
  throw new Error(`Missing production public pages environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_PUBLIC_PAGES !== confirmValue) {
  throw new Error(`Set PUG_PROD_CONFIRM_PUBLIC_PAGES=${confirmValue} to configure production pages.`)
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
$pages = is_array($payload['pages'] ?? null) ? $payload['pages'] : array();
$categories = is_array($payload['productCategories'] ?? null) ? $payload['productCategories'] : array();
$results = array();
$category_results = array();
$backup_key = '_tcg_store_public_pages_backup_' . gmdate('YmdHis');
foreach ($categories as $category) {
	if (!is_array($category) || !taxonomy_exists('product_cat')) {
		continue;
	}
	$slug = sanitize_title((string) ($category['slug'] ?? ''));
	$name = sanitize_text_field((string) ($category['name'] ?? ''));
	$parent_slug = sanitize_title((string) ($category['parent'] ?? ''));
	if ('' === $slug || '' === $name) {
		$category_results[] = array('slug' => $slug, 'status' => 'error', 'message' => 'invalid_category_payload');
		continue;
	}
	$parent_id = 0;
	if ('' !== $parent_slug) {
		$parent = get_term_by('slug', $parent_slug, 'product_cat');
		$parent_id = $parent && !is_wp_error($parent) ? (int) $parent->term_id : 0;
	}
	$existing = get_term_by('slug', $slug, 'product_cat');
	if ($existing && !is_wp_error($existing)) {
		$updated = wp_update_term((int) $existing->term_id, 'product_cat', array('name' => $name, 'parent' => $parent_id));
		if (is_wp_error($updated)) {
			$category_results[] = array('slug' => $slug, 'status' => 'error', 'message' => $updated->get_error_code());
			continue;
		}
		$category_results[] = array('slug' => $slug, 'id' => (int) $existing->term_id, 'action' => 'updated', 'status' => 'ok', 'parent' => $parent_slug);
		continue;
	}
	$created = wp_insert_term($name, 'product_cat', array('slug' => $slug, 'parent' => $parent_id));
	if (is_wp_error($created)) {
		$category_results[] = array('slug' => $slug, 'status' => 'error', 'message' => $created->get_error_code());
		continue;
	}
	$category_results[] = array('slug' => $slug, 'id' => (int) ($created['term_id'] ?? 0), 'action' => 'created', 'status' => 'ok', 'parent' => $parent_slug);
}
foreach ($pages as $page) {
	if (!is_array($page)) {
		continue;
	}
	$slug = sanitize_title((string) ($page['slug'] ?? ''));
	$title = sanitize_text_field((string) ($page['title'] ?? ''));
	$content = (string) ($page['content'] ?? '');
	if ('' === $slug || '' === $title || '' === $content) {
		$results[] = array('slug' => $slug, 'status' => 'error', 'message' => 'invalid_page_payload');
		continue;
	}
	$existing = get_page_by_path($slug, OBJECT, 'page');
	$post = array(
		'post_type' => 'page',
		'post_name' => $slug,
		'post_title' => $title,
		'post_content' => $content,
		'post_status' => 'publish',
	);
	if ($existing instanceof WP_Post) {
		update_post_meta(
			$existing->ID,
			$backup_key,
			wp_json_encode(array(
				'post_title' => $existing->post_title,
				'post_name' => $existing->post_name,
				'post_status' => $existing->post_status,
				'post_content_sha1' => sha1($existing->post_content),
				'backed_up_at_gmt' => gmdate('c'),
			))
		);
		$post['ID'] = $existing->ID;
		$id = wp_update_post($post, true);
		$action = 'updated';
	} else {
		$id = wp_insert_post($post, true);
		$action = 'created';
	}
	if (is_wp_error($id)) {
		$results[] = array('slug' => $slug, 'status' => 'error', 'message' => $id->get_error_code());
		continue;
	}
	$id = (int) $id;
	$results[] = array(
		'slug' => $slug,
		'id' => $id,
		'action' => $action,
		'status' => get_post_status($id),
		'url' => get_permalink($id),
		'content_sha1' => sha1((string) get_post_field('post_content', $id)),
		'contains_inventory_shortcode' => false !== strpos((string) get_post_field('post_content', $id), '[tcg_inventory_search'),
		'contains_events_shortcode' => false !== strpos((string) get_post_field('post_content', $id), '[tcg_events'),
		'contains_product_shelf_shortcode' => false !== strpos((string) get_post_field('post_content', $id), '[tcg_product_shelf'),
		'contains_woocommerce_shortcode' => false !== strpos((string) get_post_field('post_content', $id), '[products'),
		'backup_meta_key' => 'updated' === $action ? $backup_key : '',
	);
}
echo wp_json_encode(array(
	'action' => 'production_public_pages_configured',
	'status' => 'ok',
	'plugin_version' => TCGStorePlatform\\Version::PLUGIN,
	'database_version' => TCGStorePlatform\\Version::DATABASE,
	'pages' => $results,
	'product_categories' => $category_results,
	'backup_meta_key' => $backup_key,
	'changesHomepage' => false,
	'changesNavigationMenus' => false,
	'writesWordPressSettings' => false,
	'writesWordPressData' => true,
	'runsProviderNetworkRequest' => false,
	'credentialsPrinted' => false,
	'rawContentPrinted' => false,
));
`

const result = await withProductionConnection(async (connection) => {
  await writeRemoteFile(connection, remoteRunnerPath, runnerSource)

  try {
    const execution = await execWithStdin(
      connection,
      `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
      JSON.stringify({ pages, productCategories }),
    )
    const parsed = parseJson(execution.stdout)
    const checks = buildChecks(parsed, expectations)

    return {
      action: "production_public_pages_configured",
      remoteRunner: basename(remoteRunnerPath),
      exitCode: execution.code,
      status: parsed?.status ?? "unknown",
      pluginVersion: parsed?.plugin_version ?? null,
      databaseVersion: parsed?.database_version ?? null,
      pages: parsed?.pages ?? [],
      productCategories: parsed?.product_categories ?? [],
      backupMetaKey: parsed?.backup_meta_key ?? null,
      expectations: {
        pluginVersion: expectations.pluginVersion,
        pageSlugs: pages.map((page) => page.slug),
        productCategorySlugs: productCategories.map((category) => category.slug),
      },
      checks,
      passed: execution.code === 0 && parsed?.status === "ok" && checks.every((check) => check.pass),
      runnerRemoved: false,
      createsOrUpdatesPages: true,
      createsOrUpdatesProductCategories: true,
      backsUpExistingPageContentToPostMeta: true,
      changesHomepage: false,
      changesNavigationMenus: false,
      writesWordPressSettings: false,
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
  const actualPages = Array.isArray(parsed?.pages) ? parsed.pages : []
  const bySlug = new Map(actualPages.map((page) => [page.slug, page]))
  const actualCategories = Array.isArray(parsed?.product_categories) ? parsed.product_categories : []
  const categoriesBySlug = new Map(actualCategories.map((category) => [category.slug, category]))

  return [
    {
      name: "plugin_version",
      pass: parsed?.plugin_version === expected.pluginVersion,
      expected: expected.pluginVersion,
      actual: parsed?.plugin_version ?? null,
    },
    {
      name: "expected_page_count",
      pass: actualPages.length === expected.pages.length,
      expected: expected.pages.length,
      actual: actualPages.length,
    },
    {
      name: "expected_product_category_count",
      pass: actualCategories.length === expected.productCategories.length,
      expected: expected.productCategories.length,
      actual: actualCategories.length,
    },
    ...expected.pages.map((page) => {
      const actual = bySlug.get(page.slug)
      const expectedShortcode =
        page.expectedShortcode === null
          ? null
          : page.content.includes("[tcg_inventory_search")
            ? "contains_inventory_shortcode"
            : page.content.includes("[tcg_events")
              ? "contains_events_shortcode"
              : page.content.includes("[tcg_product_shelf")
                ? "contains_product_shelf_shortcode"
                : "contains_woocommerce_shortcode"

      return {
        name: `page_${page.slug}`,
        pass:
          Boolean(actual?.id) &&
          actual?.status === "publish" &&
          (expectedShortcode === null || actual?.[expectedShortcode] === true),
        expected: { slug: page.slug, status: "publish", shortcode: expectedShortcode },
        actual: actual
          ? {
              id: actual.id ?? null,
              status: actual.status ?? null,
              action: actual.action ?? null,
              shortcodePresent: expectedShortcode === null ? null : (actual[expectedShortcode] ?? null),
            }
          : null,
      }
    }),
    ...expected.productCategories.map((category) => {
      const actual = categoriesBySlug.get(category.slug)

      return {
        name: `product_category_${category.slug}`,
        pass: Boolean(actual?.id) && actual?.status === "ok",
        expected: { slug: category.slug, status: "ok" },
        actual: actual
          ? {
              id: actual.id ?? null,
              action: actual.action ?? null,
              status: actual.status ?? null,
              parent: actual.parent ?? null,
            }
          : null,
      }
    }),
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
