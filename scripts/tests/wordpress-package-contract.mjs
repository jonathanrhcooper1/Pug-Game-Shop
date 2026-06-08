import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const zipPath = resolve(root, "dist", `tcg-store-platform-${packageJson.version}.zip`)

execFileSync("node", ["scripts/package-wordpress-plugin.mjs"], {
  cwd: root,
  stdio: "inherit",
})

const entries = execFileSync("tar", ["-tf", zipPath], {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean)

assert.ok(statSync(zipPath).size > 100_000)
assert.ok(entries.includes("tcg-store-platform/"))
assert.ok(entries.includes("tcg-store-platform/tcg-store-platform.php"))
assert.ok(entries.includes("tcg-store-platform/uninstall.php"))
assert.ok(entries.includes("tcg-store-platform/readme.txt"))
assert.ok(entries.includes("tcg-store-platform/src/Autoloader.php"))
assert.ok(entries.includes("tcg-store-platform/src/Api/V1/OfflineRouteRuntimeConfigurator.php"))
assert.ok(entries.includes("tcg-store-platform/src/Settings/OfflineRouteRuntimeSettings.php"))

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
