import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { basename, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packageJson = JSON.parse(readFileSyncText(resolve(root, "package.json")))
const distDir = resolve(root, "dist")
const releaseDir = resolve(distDir, `the-pug-store-deliverables-${packageJson.version}`)
const offlineBundleDir = resolve(root, "apps/offline-app/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis")
const fallbackOfflineBundleDir = resolve(root, "apps/offline-app/src-tauri/target/release/bundle/nsis")
const deliverableNames = ["Pug Store App", "LAN Server + Pug Store App", "Kiosk Page"]

mkdirSync(distDir, { recursive: true })
rmSync(releaseDir, { recursive: true, force: true })
mkdirSync(releaseDir, { recursive: true })

run("npm.cmd", ["run", "package:wordpress"])
run("npm.cmd", ["run", "package:wordpress-theme"])
run("npm.cmd", ["run", "package:local-sync-server"])
run("npm.cmd", ["run", "build:offline-app:windows"], { PUG_WINDOWS_APP_PROFILE: "store" })
run("npm.cmd", ["run", "build:offline-app:windows"], { PUG_WINDOWS_APP_PROFILE: "kiosk" })

const pluginZip = resolve(distDir, `tcg-store-platform-${packageJson.version}.zip`)
const themeZip = resolve(distDir, `pug-arcade-commerce-v2-${packageJson.version}.zip`)
const localServerZip = resolve(distDir, "pug-lan-server.zip")
const documentationDir = resolve(root, "release-package")
const lanServerDeployScript = resolve(root, "scripts/Deploy-Pug-LAN-Server-Patch.ps1")
const middlemanCredentialApplyScript = resolve(root, "scripts/Apply-Pug-Middleman-Credentials.ps1")
const middlemanDeploymentPrompt = resolve(root, "docs/runbooks/MIDDLEMAN_CODEX_DEPLOYMENT_PROMPT.md")
const lanServerCodexInstallPrompt = resolve(root, "docs/runbooks/LAN_SERVER_CODEX_INSTALL.md")
const dymoLocalServiceScript = resolve(root, "scripts/Start-Pug-Dymo-Local-Service.ps1")
const dymoDiagnosticScript = resolve(root, "scripts/Diagnose-Pug-Dymo-Printing.ps1")
const bundledLocalSyncEnv = findBundledLocalSyncEnv()
const pugStoreAppDir = resolve(releaseDir, "Pug Store App")
const lanServerPlusAppDir = resolve(releaseDir, "LAN Server + Pug Store App")
const kioskPageDir = resolve(releaseDir, "Kiosk Page")
const lanWebsiteDir = resolve(lanServerPlusAppDir, "website")
const lanDocumentationDir = resolve(lanServerPlusAppDir, "documentation")

mkdirSync(pugStoreAppDir, { recursive: true })
mkdirSync(lanServerPlusAppDir, { recursive: true })
mkdirSync(kioskPageDir, { recursive: true })
mkdirSync(lanWebsiteDir, { recursive: true })

copyRequired(pluginZip, resolve(lanWebsiteDir, basename(pluginZip)))
copyRequired(themeZip, resolve(lanWebsiteDir, basename(themeZip)))
copyRequired(localServerZip, resolve(lanServerPlusAppDir, basename(localServerZip)))
writeLanServerStartupFiles(lanServerPlusAppDir, basename(localServerZip))
copyRequired(lanServerDeployScript, resolve(lanServerPlusAppDir, "Deploy-Pug-LAN-Server-Patch.ps1"))
copyRequired(middlemanCredentialApplyScript, resolve(releaseDir, "Apply-Pug-Middleman-Credentials.ps1"))
copyRequired(middlemanCredentialApplyScript, resolve(lanServerPlusAppDir, "Apply-Pug-Middleman-Credentials.ps1"))
copyRequired(middlemanDeploymentPrompt, resolve(releaseDir, "MIDDLEMAN_CODEX_DEPLOYMENT_PROMPT.md"))
copyRequired(middlemanDeploymentPrompt, resolve(lanServerPlusAppDir, "MIDDLEMAN_CODEX_DEPLOYMENT_PROMPT.md"))
copyRequired(lanServerCodexInstallPrompt, resolve(releaseDir, "LAN_SERVER_CODEX_INSTALL.md"))
copyRequired(lanServerCodexInstallPrompt, resolve(lanServerPlusAppDir, "LAN_SERVER_CODEX_INSTALL.md"))
copyRequired(dymoLocalServiceScript, resolve(pugStoreAppDir, "Start-Pug-Dymo-Local-Service.ps1"))
copyRequired(dymoLocalServiceScript, resolve(lanServerPlusAppDir, "Start-Pug-Dymo-Local-Service.ps1"))
copyRequired(dymoDiagnosticScript, resolve(releaseDir, "Diagnose-Pug-Dymo-Printing.ps1"))
copyRequired(dymoDiagnosticScript, resolve(pugStoreAppDir, "Diagnose-Pug-Dymo-Printing.ps1"))
copyRequired(dymoDiagnosticScript, resolve(lanServerPlusAppDir, "Diagnose-Pug-Dymo-Printing.ps1"))
if (bundledLocalSyncEnv) {
  copyEnvFileWithoutBom(bundledLocalSyncEnv, resolve(lanServerPlusAppDir, "local-sync.env"))
}

// Bundle client handover docs with the installable package so the ZIP is a
// complete owner/admin/support handoff, not only an installer collection.
if (existsSync(documentationDir)) {
  cpSync(documentationDir, resolve(lanDocumentationDir, "release-package"), {
    recursive: true,
    force: true,
  })
}

const appInstaller = findNewestInstallerMatching([offlineBundleDir, fallbackOfflineBundleDir], "Pug Store App")
const kioskInstaller = findNewestInstallerMatching([offlineBundleDir, fallbackOfflineBundleDir], "Pug Kiosk App")
const appInstallerFileName = `Pug Store App-${packageJson.version}.exe`
const kioskInstallerFileName = `Pug Kiosk App-${packageJson.version}.exe`
const pugStoreAppManifest = buildPugStoreAppManifest(appInstaller)
const lanServerPlusAppManifest = buildLanServerPlusAppManifest(appInstaller)
const kioskPageManifest = buildKioskPageManifest(kioskInstaller)

if (appInstaller) {
  copyFileSync(appInstaller, resolve(pugStoreAppDir, appInstallerFileName))
  copyFileSync(appInstaller, resolve(lanServerPlusAppDir, appInstallerFileName))
}

if (kioskInstaller) {
  copyFileSync(kioskInstaller, resolve(kioskPageDir, kioskInstallerFileName))
}

writeFileSync(
  resolve(releaseDir, "deliverables.manifest.json"),
  JSON.stringify(
    {
      schema_version: 1,
      version: packageJson.version,
      deliverables: deliverableNames,
      deliverable_count: deliverableNames.length,
      package_names_are_customer_facing: true,
    },
    null,
    2,
  ) + "\n",
)
writeFileSync(resolve(pugStoreAppDir, "pug-store-app.install.json"), JSON.stringify(pugStoreAppManifest, null, 2) + "\n")
writeFileSync(
  resolve(lanServerPlusAppDir, "lan-server-plus-pug-store-app.install.json"),
  JSON.stringify(lanServerPlusAppManifest, null, 2) + "\n",
)
writeFileSync(resolve(kioskPageDir, "kiosk-page.install.json"), JSON.stringify(kioskPageManifest, null, 2) + "\n")
writeFileSync(
  resolve(pugStoreAppDir, "README.txt"),
  [
    "Pug Store App",
    "",
    "Use this deliverable on staff machines for inventory, customer, trade-in, fulfillment, reporting, and sync work.",
    "Install the app, then let it auto-discover the LAN server over UDP port 8788.",
    "If discovery is blocked, enter the LAN server URL manually, for example http://SERVER-IP:8787.",
    "For local DYMO label printing, run Start-Pug-Dymo-Local-Service.ps1 on any staff PC with the LabelWriter attached.",
    "If local DYMO printing still fails, run Diagnose-Pug-Dymo-Printing.ps1 and send the generated ZIP report to Codex.",
    appInstaller
      ? `Installer: ${appInstallerFileName}`
      : "Installer missing: run npm.cmd run build:offline-app:windows, then rerun npm.cmd run package:production-release.",
    "",
  ].join("\n"),
)
writeFileSync(
  resolve(lanServerPlusAppDir, "README.txt"),
  [
    "LAN Server + Pug Store App",
    "",
    "Use this deliverable on the in-store host machine and any staff station that should connect to it.",
    "Contents:",
    `- ${basename(localServerZip)} for the LAN server source package.`,
    appInstaller ? `- ${appInstallerFileName} for the Pug Store App installer.` : "- Pug Store App installer missing; build it before final handoff.",
    "- website/ contains the WordPress plugin and storefront theme ZIPs needed by the website endpoints.",
    "- documentation/ contains the owner/admin/support handoff docs.",
    "",
    "SQLite:",
    "- The LAN server does not ship or install a SQLite database file.",
    "- It requires Node 22.13+ or Node 24 with built-in node:sqlite.",
    "- On startup it creates or reuses store-sync.sqlite unless LOCAL_SYNC_SQLITE_PATH or PUG_LOCAL_SYNC_DB points elsewhere.",
    "- Use Start-Pug-LAN-Server-Hidden.vbs or Install-Pug-LAN-Server-Startup-Task.ps1 when you do not want a command prompt window visible.",
    "- Use Deploy-Pug-LAN-Server-Patch.ps1 when updating the LAN server package on a different computer from this USB.",
    "- Use Apply-Pug-Middleman-Credentials.ps1 only with the USB-only LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env file when connector credentials need to be merged into the middleman server.",
    "- Use MIDDLEMAN_CODEX_DEPLOYMENT_PROMPT.md as the Codex handoff on the middleman machine.",
    bundledLocalSyncEnv
      ? "- local-sync.env is bundled in this local deliverable and will be installed automatically by the patch script."
      : "- local-sync.env is not bundled. Add it beside Deploy-Pug-LAN-Server-Patch.ps1 only when you intentionally want hands-off credential setup.",
    "- Use Start-Pug-Dymo-Local-Service.ps1 on any PC that prints DYMO labels locally.",
    "- Use Diagnose-Pug-Dymo-Printing.ps1 on any PC where local DYMO labels do not print; the generated ZIP is safe to send back to Codex.",
    "",
    "Connectivity:",
    "- Allow inbound TCP 8787 and UDP 8788 through Windows Firewall.",
    "- The Pug Store App auto-discovers the LAN server over UDP port 8788.",
    "- If discovery is blocked, enter the LAN server URL manually, for example http://SERVER-IP:8787.",
    "",
  ].join("\n"),
)
writeFileSync(
  resolve(kioskPageDir, "README.txt"),
  [
    "Kiosk Page",
    "",
    "Use this deliverable for the customer-facing inventory lookup and pickup request app.",
    kioskInstaller ? `Installer: ${kioskInstallerFileName}` : "Installer missing: rerun npm.cmd run package:production-release after the kiosk app build succeeds.",
    "The kiosk app opens fullscreen, hides staff screens, and connects to the same LAN server as the Pug Store App.",
    "It auto-discovers the LAN server over UDP port 8788. If discovery is blocked, enter the LAN server URL manually.",
    "Verify it can load inventory, add cards to the kiosk cart, and submit a pickup request.",
    "",
  ].join("\n"),
)
writeFileSync(
  resolve(releaseDir, "README-FIRST.txt"),
  [
    "The Pug store deliverables",
    "",
    "This package contains exactly three deliverables:",
    "1. Pug Store App",
    "2. LAN Server + Pug Store App",
    "3. Kiosk Page",
    "",
    "Recommended install order:",
    "1. Open LAN Server + Pug Store App, install/verify the website ZIPs, then start the LAN server on the in-store host machine.",
    "2. Install Pug Store App on staff stations.",
    "3. Install Kiosk Page on customer-facing kiosk stations.",
    "4. On any staff PC with a DYMO LabelWriter attached, run Start-Pug-Dymo-Local-Service.ps1 and confirm the local service answers.",
    "5. If a workstation still will not print locally, run Diagnose-Pug-Dymo-Printing.ps1 on that workstation and send Codex the generated ZIP report.",
    "",
    "Connectivity:",
    "- Pug Store App auto-discovers the LAN server over UDP pug-local-sync-discovery-v1 on port 8788.",
    "- If auto-discovery is blocked, enter the LAN server URL manually, for example http://SERVER-IP:8787.",
    "- WordPress remains the source of truth; the LAN server caches and queues while offline.",
    "",
    "SQLite:",
    "- The LAN server auto-creates or reuses store-sync.sqlite through Node built-in node:sqlite.",
    "- The package does not include an existing SQLite database and does not install SQLite separately.",
    "",
    "Final release gate:",
    "Run npm.cmd run production:verify-active-syncs before signoff.",
    "",
    "Documentation:",
    "- See LAN Server + Pug Store App/documentation/release-package/README.md for owner, admin, staff, support, credential, and source-code handover guides.",
    "- See MIDDLEMAN_CODEX_DEPLOYMENT_PROMPT.md for the exact Codex instructions to patch the middleman server, Store App, Kiosk App, Square connector, and DYMO printing.",
    "",
    appInstaller
      ? `Bundled app installer: ${appInstallerFileName}`
      : "App installer was not found. Run npm.cmd run build:offline-app:windows, then rerun npm.cmd run package:production-release.",
    kioskInstaller
      ? `Bundled kiosk installer: ${kioskInstallerFileName}`
      : "Kiosk installer was not found. Rerun npm.cmd run package:production-release after the kiosk app build succeeds.",
    "",
  ].join("\n"),
)

const releaseZip = resolve(distDir, `the-pug-store-deliverables-${packageJson.version}.zip`)
rmSync(releaseZip, { force: true })
run("tar", ["-a", "-cf", releaseZip, "-C", distDir, basename(releaseDir)])

console.log(
  JSON.stringify(
    {
      action: "production_release_packaged",
      releaseDirectory: releaseDir,
      releaseZip,
      deliverables: deliverableNames,
      wordpressPluginZip: resolve(lanWebsiteDir, basename(pluginZip)),
      wordpressThemeZip: resolve(lanWebsiteDir, basename(themeZip)),
      localSyncServerZip: localServerZip,
      documentationPackage: existsSync(documentationDir) ? lanDocumentationDir : null,
      appInstaller: appInstaller ?? null,
      pugStoreAppPackage: pugStoreAppDir,
      lanServerPlusAppPackage: lanServerPlusAppDir,
      kioskPagePackage: kioskPageDir,
      deliverablesManifest: resolve(releaseDir, "deliverables.manifest.json"),
      autoDiscovery: "udp:pug-local-sync-discovery-v1:8788",
      manualMiddlemanUrlFallback: true,
    },
    null,
    2,
  ),
)

function buildPugStoreAppManifest(installerPath) {
  return {
    schema_version: 1,
    deliverable: "Pug Store App",
    version: packageJson.version,
    installer: installerPath ? appInstallerFileName : null,
    launch_mode: "staff",
    build_mode: "pug_store_app",
    fullscreen: true,
    decorations: false,
    command_prompt_window_required: false,
    dymo_local_service_helper: "Start-Pug-Dymo-Local-Service.ps1",
    dymo_diagnostic_helper: "Diagnose-Pug-Dymo-Printing.ps1",
    dymo_local_printing_url: "https://127.0.0.1:41951/DYMO/DLS/Printing/GetPrinters",
    launch_url_hint: "/",
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

function buildLanServerPlusAppManifest(installerPath) {
  return {
    schema_version: 1,
    deliverable: "LAN Server + Pug Store App",
    version: packageJson.version,
    lan_server_package: basename(localServerZip),
    app_installer: installerPath ? appInstallerFileName : null,
    app_launch_mode: "staff",
    app_fullscreen: true,
    app_decorations: false,
    command_prompt_window_required: false,
    hidden_start_helper: "Start-Pug-LAN-Server-Hidden.vbs",
    patch_deploy_helper: "Deploy-Pug-LAN-Server-Patch.ps1",
    startup_task_helper: "Install-Pug-LAN-Server-Startup-Task.ps1",
    dymo_local_service_helper: "Start-Pug-Dymo-Local-Service.ps1",
    dymo_diagnostic_helper: "Diagnose-Pug-Dymo-Printing.ps1",
    dymo_local_printing_url: "https://127.0.0.1:41951/DYMO/DLS/Printing/GetPrinters",
    website_dependencies: [basename(pluginZip), basename(themeZip)],
      local_database: "store-sync.sqlite",
      bundled_local_sync_env: Boolean(bundledLocalSyncEnv),
      sqlite_runtime: "Node built-in node:sqlite",
    sqlite_database_auto_created: true,
    sqlite_database_shipped: false,
    sqlite_separate_install_required: false,
    sync_topology: "wordpress_woocommerce_plugin <-https-> lan_server <-lan/offline-> pug_store_app",
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
    required_ports: {
      http: 8787,
      discovery_udp: 8788,
    },
  }
}

function buildKioskPageManifest(installerPath) {
  return {
    schema_version: 1,
    deliverable: "Kiosk Page",
    version: packageJson.version,
    delivery_type: "windows_desktop_kiosk_app",
    installer: installerPath ? kioskInstallerFileName : null,
    launch_mode: "customer_kiosk",
    build_mode: "kiosk",
    fullscreen: true,
    decorations: false,
    command_prompt_window_required: false,
    launch_url_hint: "?mode=kiosk",
    requires_lan_server: true,
    staff_screens_exposed: false,
    sync_topology: "kiosk_page <-lan/offline-> lan_server <-https-> wordpress_woocommerce_plugin",
    validation: [
      "Open the kiosk page on the kiosk station.",
      "Confirm inventory search loads.",
      "Add a card to the kiosk cart.",
      "Submit a pickup request and verify it reaches fulfillment.",
    ],
  }
}

function writeLanServerStartupFiles(targetDir, serverZipName) {
  writeFileSync(
    resolve(targetDir, "local-sync.env.example"),
    [
      "# Copy this file to local-sync.env and fill in the secret values before starting the LAN server.",
      "LOCAL_SYNC_HOST=0.0.0.0",
      "LOCAL_SYNC_PORT=8787",
      "# Leave blank to advertise this computer's LAN IP automatically.",
      "LOCAL_SYNC_SERVER_URL=",
      "LOCAL_SYNC_SQLITE_PATH=store-sync.sqlite",
      "LOCAL_SYNC_WORDPRESS_PUSH_ENABLED=true",
      "PUG_WORDPRESS_URL=https://thepuggaming.com",
      "PUG_WORDPRESS_REST_BASE=/wp-json/tcg-store/v1",
      "PUG_WORDPRESS_USERNAME=replace_with_secure_value",
      "PUG_WORDPRESS_APP_PASSWORD=replace_with_secure_value",
      "PUG_WORDPRESS_DEFAULT_LOCATION_ID=replace_with_secure_value",
      "SCRYDEX_VISION_API_KEY=replace_with_secure_value",
      "SCRYDEX_VISION_TEAM_ID=replace_with_secure_value",
      "SCRYDEX_VISION_BASE_URL=https://api.scrydex.com",
      "SCRYDEX_VISION_TIMEOUT_MS=15000",
      "PUG_SQUARE_ENVIRONMENT=production",
      "PUG_SQUARE_ACCESS_TOKEN=replace_with_secure_value",
      "PUG_SQUARE_LOCATION_ID=",
      "PUG_SQUARE_API_VERSION=2026-05-20",
      "PUG_SQUARE_INVENTORY_POLL_SECONDS=15",
      "PUG_SQUARE_INVENTORY_POLL_DISABLED=false",
      "PUG_SQUARE_REPORT_LOOKBACK_DAYS=7",
      "",
    ].join("\r\n"),
  )

  writeFileSync(
    resolve(targetDir, "Start-Pug-LAN-Server.ps1"),
    [
      "$ErrorActionPreference = 'Stop'",
      "$Root = Split-Path -Parent $MyInvocation.MyCommand.Path",
      "function Import-PugEnvFile {",
      "  param([string]$Path)",
      "  if (!(Test-Path -LiteralPath $Path)) { return }",
      "  Get-Content -LiteralPath $Path | ForEach-Object {",
      "    $Line = $_.Trim()",
      "    if (!$Line -or $Line.StartsWith('#') -or !$Line.Contains('=')) { return }",
      "    $Parts = $Line.Split('=', 2)",
      "    $Name = $Parts[0].Trim()",
      "    $Value = $Parts[1].Trim().Trim('\"')",
      "    if ($Name) { [Environment]::SetEnvironmentVariable($Name, $Value, 'Process') }",
      "  }",
      "}",
      "Import-PugEnvFile (Join-Path $Root 'local-sync.env')",
      `$Zip = Join-Path $Root '${serverZipName}'`,
      "$ServerRoot = Join-Path $Root 'pug-lan-server'",
      "if (!(Test-Path $ServerRoot)) {",
      "  Expand-Archive -LiteralPath $Zip -DestinationPath $ServerRoot -Force",
      "}",
      "$Node = Get-Command node -ErrorAction SilentlyContinue",
      "if (!$Node) { throw 'Node.js 22.13+ or Node.js 24+ is required for the Pug LAN server.' }",
      "$env:LOCAL_SYNC_HOST = if ($env:LOCAL_SYNC_HOST) { $env:LOCAL_SYNC_HOST } else { '0.0.0.0' }",
      "$env:LOCAL_SYNC_PORT = if ($env:LOCAL_SYNC_PORT) { $env:LOCAL_SYNC_PORT } else { '8787' }",
      "$env:LOCAL_SYNC_DISCOVERY_PORT = if ($env:LOCAL_SYNC_DISCOVERY_PORT) { $env:LOCAL_SYNC_DISCOVERY_PORT } else { '8788' }",
      "$env:PUG_LOCAL_SYNC_DB = if ($env:PUG_LOCAL_SYNC_DB) { $env:PUG_LOCAL_SYNC_DB } else { Join-Path $ServerRoot 'store-sync.sqlite' }",
      "function Ensure-PugFirewallRule {",
      "  param([string]$Name, [string]$Protocol, [string]$Port)",
      "  try {",
      "    if (-not (Get-Command New-NetFirewallRule -ErrorAction SilentlyContinue)) { return }",
      "    $Existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue",
      "    if ($Existing) { return }",
      "    New-NetFirewallRule -DisplayName $Name -Direction Inbound -Action Allow -Protocol $Protocol -LocalPort $Port | Out-Null",
      "    Write-Host \"Created firewall rule: $Name\"",
      "  } catch {",
      "    Write-Warning \"Could not create firewall rule '$Name'. If other PCs cannot connect, allow $Protocol port $Port inbound.\"",
      "  }",
      "}",
      "Ensure-PugFirewallRule -Name 'Pug LAN Server HTTP 8787' -Protocol TCP -Port $env:LOCAL_SYNC_PORT",
      "Ensure-PugFirewallRule -Name 'Pug LAN Server Discovery 8788' -Protocol UDP -Port $env:LOCAL_SYNC_DISCOVERY_PORT",
      "Set-Location $ServerRoot",
      "node apps/local-sync-server/src/cli.mjs",
      "",
    ].join("\r\n"),
  )

  writeFileSync(
    resolve(targetDir, "Start-Pug-LAN-Server-Hidden.vbs"),
    [
      "Set shell = CreateObject(\"WScript.Shell\")",
      "scriptDir = CreateObject(\"Scripting.FileSystemObject\").GetParentFolderName(WScript.ScriptFullName)",
      "command = \"powershell.exe -ExecutionPolicy Bypass -NoProfile -File \"\"\" & scriptDir & \"\\Start-Pug-LAN-Server.ps1\"\"\"",
      "shell.Run command, 0, False",
      "",
    ].join("\r\n"),
  )

  writeFileSync(
    resolve(targetDir, "Install-Pug-LAN-Server-Startup-Task.ps1"),
    [
      "$ErrorActionPreference = 'Stop'",
      "$Root = Split-Path -Parent $MyInvocation.MyCommand.Path",
      "$Script = Join-Path $Root 'Start-Pug-LAN-Server-Hidden.vbs'",
      "$Action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('\"' + $Script + '\"')",
      "$Trigger = New-ScheduledTaskTrigger -AtLogOn",
      "$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest",
      "Register-ScheduledTask -TaskName 'Pug LAN Server' -Action $Action -Trigger $Trigger -Principal $Principal -Force",
      "Write-Host 'Installed startup task: Pug LAN Server'",
      "",
    ].join("\r\n"),
  )
}

function findNewestInstallerMatching(directories, productName) {
  const normalizedProductName = productName.toLowerCase()
  const installers = directories
    .filter((directory) => existsSync(directory))
    .flatMap((directory) =>
      readdirSync(directory, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.toLowerCase().endsWith(".exe") &&
            entry.name.toLowerCase().includes(normalizedProductName),
        )
        .map((entry) => resolve(directory, entry.name)),
    )
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)

  return installers[0] ?? null
}

function findBundledLocalSyncEnv() {
  const explicit = process.env.PUG_RELEASE_LOCAL_SYNC_ENV_FILE
  const candidates = [
    explicit ? resolve(root, explicit) : "",
    resolve(root, ".local", "local-sync.env.production"),
    resolve(root, "dist", "local-sync.env"),
  ].filter(Boolean)

  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function copyRequired(source, destination) {
  if (!existsSync(source)) {
    throw new Error(`Required release artifact missing: ${source}`)
  }

  copyFileSync(source, destination)
}

function copyEnvFileWithoutBom(source, destination) {
  if (!existsSync(source)) {
    throw new Error(`Required release artifact missing: ${source}`)
  }

  writeFileSync(destination, readFileSyncText(source).replace(/^\uFEFF/, ""), "utf8")
}

function run(command, args, extraEnv = {}) {
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
    shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
  })
}

function readFileSyncText(path) {
  return readFileSync(path, "utf8")
}
