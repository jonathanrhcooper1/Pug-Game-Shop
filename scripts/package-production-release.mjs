import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { basename, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packageJson = JSON.parse(readFileSyncText(resolve(root, "package.json")))
const distDir = resolve(root, "dist")
const releaseDir = resolve(distDir, `the-pug-production-release-${packageJson.version}`)
const offlineBundleDir = resolve(root, "apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis")
const fallbackOfflineBundleDir = resolve(root, "apps/offline-app/src-tauri/target/release/bundle/nsis")

mkdirSync(distDir, { recursive: true })
rmSync(releaseDir, { recursive: true, force: true })
mkdirSync(releaseDir, { recursive: true })

run("npm.cmd", ["run", "package:wordpress"])
run("npm.cmd", ["run", "package:wordpress-theme"])
run("npm.cmd", ["run", "package:local-sync-server"])

const pluginZip = resolve(distDir, `tcg-store-platform-${packageJson.version}.zip`)
const themeZip = resolve(distDir, `pug-arcade-commerce-v2-${packageJson.version}.zip`)
const localServerZip = resolve(distDir, "pug-local-sync-middleman-server.zip")
const employeePackageDir = resolve(releaseDir, "employee-app")
const kioskPackageDir = resolve(releaseDir, "customer-kiosk")

copyRequired(pluginZip, resolve(releaseDir, basename(pluginZip)))
copyRequired(themeZip, resolve(releaseDir, basename(themeZip)))
copyRequired(localServerZip, resolve(releaseDir, basename(localServerZip)))
mkdirSync(employeePackageDir, { recursive: true })
mkdirSync(kioskPackageDir, { recursive: true })

const appInstaller = findNewestInstaller(offlineBundleDir) ?? findNewestInstaller(fallbackOfflineBundleDir)
const employeeManifest = releaseManifest("employee-app", appInstaller)
const kioskManifest = releaseManifest("customer-kiosk", appInstaller)

if (appInstaller) {
  copyFileSync(appInstaller, resolve(releaseDir, `the-pug-local-app-${packageJson.version}.exe`))
  copyFileSync(appInstaller, resolve(employeePackageDir, `the-pug-employee-app-${packageJson.version}.exe`))
  copyFileSync(appInstaller, resolve(kioskPackageDir, `the-pug-customer-kiosk-${packageJson.version}.exe`))
}

writeFileSync(resolve(releaseDir, "employee-app.install.json"), JSON.stringify(employeeManifest, null, 2) + "\n")
writeFileSync(resolve(releaseDir, "customer-kiosk.install.json"), JSON.stringify(kioskManifest, null, 2) + "\n")
writeFileSync(resolve(employeePackageDir, "employee-app.install.json"), JSON.stringify(employeeManifest, null, 2) + "\n")
writeFileSync(resolve(kioskPackageDir, "customer-kiosk.install.json"), JSON.stringify(kioskManifest, null, 2) + "\n")
writeFileSync(
  resolve(employeePackageDir, "README.txt"),
  [
    "The Pug employee app",
    "",
    "Use this package on staff machines for inventory, customer, trade-in, fulfillment, reporting, and sync work.",
    "The app auto-discovers the local middleman server over UDP port 8788.",
    "If discovery is blocked, enter the middleman URL manually, for example http://SERVER-IP:8787.",
    "",
  ].join("\n"),
)
writeFileSync(
  resolve(kioskPackageDir, "README.txt"),
  [
    "The Pug customer kiosk",
    "",
    "Use this package on customer-facing lookup/order stations.",
    "It is configured as the kiosk package and should be paired to the same local middleman server as staff machines.",
    "The app auto-discovers the local middleman server over UDP port 8788.",
    "If discovery is blocked, enter the middleman URL manually, for example http://SERVER-IP:8787.",
    "",
  ].join("\n"),
)
writeFileSync(
  resolve(releaseDir, "README-FIRST.txt"),
  [
    "The Pug production release package",
    "",
    "Install order:",
    "1. Install/verify the WordPress plugin ZIP on production.",
    "2. Install/verify the pug-arcade-commerce-v2 theme ZIP on production.",
    "3. Install and start pug-local-sync-middleman-server.zip on the in-store host machine.",
    "4. Install employee-app/the-pug-employee-app-*.exe on staff stations.",
    "5. Install customer-kiosk/the-pug-customer-kiosk-*.exe on customer kiosk stations.",
    "",
    "Connectivity:",
    "- Employee and kiosk apps auto-discover the middleman over UDP pug-local-sync-discovery-v1 on port 8788.",
    "- If auto-discovery is blocked, enter the middleman URL manually, for example http://SERVER-IP:8787.",
    "- WordPress remains the source of truth; the LAN server caches and queues while offline.",
    "",
    "Final release gate:",
    "Run npm.cmd run production:verify-active-syncs before signoff.",
    "",
    appInstaller
      ? `Bundled app installer: the-pug-local-app-${packageJson.version}.exe`
      : "App installer was not found. Run npm.cmd run build:offline-app:windows, then rerun npm.cmd run package:production-release.",
    "",
  ].join("\n"),
)

const releaseZip = resolve(distDir, `the-pug-production-release-${packageJson.version}.zip`)
rmSync(releaseZip, { force: true })
run("tar", ["-a", "-cf", releaseZip, "-C", distDir, basename(releaseDir)])

console.log(
  JSON.stringify(
    {
      action: "production_release_packaged",
      releaseDirectory: releaseDir,
      releaseZip,
      wordpressPluginZip: pluginZip,
      wordpressThemeZip: themeZip,
      localSyncServerZip: localServerZip,
      appInstaller: appInstaller ?? null,
      employeeAppPackage: employeePackageDir,
      customerKioskPackage: kioskPackageDir,
      employeeManifest: resolve(releaseDir, "employee-app.install.json"),
      customerKioskManifest: resolve(releaseDir, "customer-kiosk.install.json"),
      autoDiscovery: "udp:pug-local-sync-discovery-v1:8788",
      manualMiddlemanUrlFallback: true,
    },
    null,
    2,
  ),
)

function releaseManifest(mode, installerPath) {
  return {
    schema_version: 1,
    app: mode,
    version: packageJson.version,
    installer: installerPath ? `the-pug-local-app-${packageJson.version}.exe` : null,
    launch_mode: mode === "customer-kiosk" ? "kiosk" : "employee",
    build_mode: mode === "customer-kiosk" ? "customer_kiosk" : "employee",
    launch_url_hint: mode === "customer-kiosk" ? "?mode=kiosk or /kiosk" : "/",
    sync_topology: "wordpress_woocommerce_plugin <-https-> local_middleman <-lan/offline-> app",
    auto_discovery: {
      protocol: "pug-local-sync-discovery-v1",
      transport: "udp",
      port: 8788,
      credentials_returned: false,
    },
    manual_fallback: {
      supported: true,
      example_url: "http://SERVER-IP:8787",
    },
    source_of_truth: "wordpress",
    offline_behavior: "local cache and durable queue until middleman/website reconnects",
  }
}

function findNewestInstaller(directory) {
  if (!existsSync(directory)) {
    return null
  }

  const installers = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".exe"))
    .map((entry) => resolve(directory, entry.name))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)

  return installers[0] ?? null
}

function copyRequired(source, destination) {
  if (!existsSync(source)) {
    throw new Error(`Required release artifact missing: ${source}`)
  }

  copyFileSync(source, destination)
}

function run(command, args) {
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
  })
}

function readFileSyncText(path) {
  return readFileSync(path, "utf8")
}
