import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const zipPath = resolve(root, "dist", `tcg-store-platform-${packageJson.version}.zip`)
const themeSlug = "pug-arcade-commerce-v2"
const themeZipPath = resolve(root, "dist", `${themeSlug}-${packageJson.version}.zip`)

assert.equal(
  packageJson.scripts["package:wordpress-theme"],
  "node scripts/package-wordpress-theme.mjs",
)

execFileSync("node", ["scripts/package-wordpress-plugin.mjs"], {
  cwd: root,
  stdio: "inherit",
})
execFileSync("node", ["scripts/package-wordpress-theme.mjs"], {
  cwd: root,
  stdio: "inherit",
})

const entries = execFileSync("tar", ["-tf", zipPath], {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean)
const themeEntries = execFileSync("tar", ["-tf", themeZipPath], {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean)

assert.ok(statSync(zipPath).size > 100_000)
assert.ok(statSync(themeZipPath).size > 100_000)
assert.ok(entries.includes("tcg-store-platform/"))
assert.ok(entries.includes("tcg-store-platform/tcg-store-platform.php"))
assert.ok(entries.includes("tcg-store-platform/uninstall.php"))
assert.ok(entries.includes("tcg-store-platform/readme.txt"))
assert.ok(entries.includes("tcg-store-platform/assets/css/customer-account-portal.css"))
assert.ok(entries.includes("tcg-store-platform/assets/css/public-events.css"))
assert.ok(entries.includes("tcg-store-platform/assets/css/public-inventory.css"))
assert.ok(entries.includes("tcg-store-platform/src/Autoloader.php"))
assert.ok(entries.includes("tcg-store-platform/src/Api/V1/OfflineRouteRuntimeConfigurator.php"))
assert.ok(entries.includes("tcg-store-platform/src/Settings/OfflineRouteRuntimeSettings.php"))
assert.ok(themeEntries.includes(`${themeSlug}/`))
assert.ok(themeEntries.includes(`${themeSlug}/style.css`))
assert.ok(themeEntries.includes(`${themeSlug}/functions.php`))
assert.ok(themeEntries.includes(`${themeSlug}/front-page.php`))
assert.ok(themeEntries.includes(`${themeSlug}/woocommerce.php`))
assert.ok(themeEntries.includes(`${themeSlug}/assets/css/main.css`))
assert.ok(themeEntries.includes(`${themeSlug}/assets/js/main.js`))
assert.ok(themeEntries.includes(`${themeSlug}/assets/img/pug-logo.webp`))
assert.ok(themeEntries.includes(`${themeSlug}/assets/img/pug-hero-arcade.png`))

const pluginHeader = execFileSync("tar", ["-xOf", zipPath, "tcg-store-platform/tcg-store-platform.php"], {
  cwd: root,
  encoding: "utf8",
})
const versionPhp = execFileSync("tar", ["-xOf", zipPath, "tcg-store-platform/src/Version.php"], {
  cwd: root,
  encoding: "utf8",
})
const scrydexController = execFileSync(
  "tar",
  ["-xOf", zipPath, "tcg-store-platform/src/Api/V1/ScryDexCatalogController.php"],
  {
    cwd: root,
    encoding: "utf8",
  },
)

assert.match(pluginHeader, new RegExp(`Version:\\s+${packageJson.version.replaceAll(".", "\\.")}`))
assert.match(versionPhp, new RegExp(`PLUGIN\\s+=\\s+'${packageJson.version.replaceAll(".", "\\.")}'`))
assert.match(scrydexController, /\/scrydex\/catalog\/export/)
assert.match(scrydexController, /catalog_integrity_summary/)
assert.match(scrydexController, /cards_with_price_points/)
assert.match(scrydexController, /daily_credit_budget_enforced'\s*=>\s*false/)

for (const forbidden of [
  "tcg-store-platform/tests/",
  "tcg-store-platform/vendor/",
  "tcg-store-platform/composer.json",
  "tcg-store-platform/phpcs.xml.dist",
]) {
  assert.equal(
    entries.some((entry) => entry === forbidden || entry.startsWith(forbidden)),
    false,
    `Package included forbidden entry: ${forbidden}`,
  )
}

console.log("PASS WordPress plugin package contract")
