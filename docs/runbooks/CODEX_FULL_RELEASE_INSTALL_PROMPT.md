# Codex Full Release Install Prompt

Copy/paste this entire file into Codex on the middleman/LAN server PC.

You are installing The Pug Game Shop production release `0.202.14` from the USB.

USB folder:

```text
D:\The Pug Installers
```

Primary goals:

- Install/update the Pug LAN middleman server.
- Apply the USB credential handoff without printing secrets.
- Start/restart the LAN server.
- Install/update Pug Store App and Pug Kiosk App `0.202.14`.
- Verify WordPress, ScryDex, Square, Square location, Square inventory sync, Square sales sync, device heartbeats, and Square POS category layout.
- Confirm Square POS has `Singles > MTG / Lorcana / Riftbound / Pokemon`.
- Confirm the LAN server starts the first-run WordPress inventory bootstrap so
  all existing website inventory rows, including the current 830-card catalog,
  seed into the middleman cache and Square before changed-only polling begins.
- Keep the hidden USB credential handoff file off GitHub and out of chat.

Important:

- Do not print API keys, access tokens, passwords, application passwords, or full secret file contents.
- It is safe to show key names and true/false populated status.
- The Square location ID should be `LB1B9Z4GVG1BH`.
- Preserve any existing `C:\PugGameShop\LANServer\local-sync.env` unless it is missing or clearly bad.
- If the USB path is not `D:\The Pug Installers`, search removable drives for `The Pug Installers`.

## 1. Confirm USB Package

Run PowerShell:

```powershell
$releaseRoot = "D:\The Pug Installers"
$installRoot = "C:\PugGameShop\LANServer"

Set-ExecutionPolicy -Scope Process Bypass -Force

Get-ChildItem -LiteralPath $releaseRoot -Force |
  Select-Object Name,Length,LastWriteTime

$required = @(
  "Deploy-Pug-LAN-Server-Patch.ps1",
  "Apply-Pug-Middleman-Credentials.ps1",
  "Diagnose-Pug-Dymo-Printing.ps1",
  "pug-lan-server.zip",
  "Pug Store App-0.202.14.exe",
  "Pug Kiosk App-0.202.14.exe",
  "the-pug-store-deliverables-0.202.14.zip",
  "LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env"
)

foreach ($name in $required) {
  [pscustomobject]@{
    File = $name
    Present = Test-Path -LiteralPath (Join-Path $releaseRoot $name)
  }
}
```

All required files should be present.

## 2. Deploy LAN Server Patch

Install/update the LAN server while preserving existing config:

```powershell
$releaseRoot = "D:\The Pug Installers"
Set-ExecutionPolicy -Scope Process Bypass -Force

& "$releaseRoot\Deploy-Pug-LAN-Server-Patch.ps1" -SourceRoot $releaseRoot
```

Only if the server config is missing or known bad, rerun with:

```powershell
& "$releaseRoot\Deploy-Pug-LAN-Server-Patch.ps1" -SourceRoot $releaseRoot -ReplaceLocalEnv
```

Expected:

- LAN server files install to `C:\PugGameShop\LANServer`.
- Existing `local-sync.env` is backed up/preserved unless `-ReplaceLocalEnv` is used.
- SQLite database and migrations are handled by server startup.
- Windows scheduled task/service path is refreshed.
- TCP `8787` and UDP `8788` are opened or attempted.

## 3. Apply Credential Handoff

Apply credentials from the USB file. Do not print the file contents.

```powershell
$releaseRoot = "D:\The Pug Installers"
$installRoot = "C:\PugGameShop\LANServer"

& "$releaseRoot\Apply-Pug-Middleman-Credentials.ps1" `
  -InstallRoot $installRoot `
  -CredentialFile "$releaseRoot\LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env" `
  -RestartServer
```

After this, verify only safe key status:

```powershell
$envFile = "C:\PugGameShop\LANServer\local-sync.env"
$wanted = @(
  "PUG_WORDPRESS_BASE_URL",
  "PUG_WORDPRESS_USERNAME",
  "PUG_WORDPRESS_APPLICATION_PASSWORD",
  "PUG_SCRYDEX_PRIMARY_API_KEY",
  "PUG_SCRYDEX_TEAM_ID",
  "PUG_SQUARE_ACCESS_TOKEN",
  "PUG_SQUARE_LOCATION_ID",
  "LOCAL_SYNC_SQUARE_LOCATION_ID"
)

$map = @{}
Get-Content -LiteralPath $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
  $idx = $line.IndexOf("=")
  $key = $line.Substring(0, $idx).Trim()
  $value = $line.Substring($idx + 1).Trim().Trim('"')
  $map[$key] = $value
}

foreach ($key in $wanted) {
  [pscustomobject]@{
    Key = $key
    Present = $map.ContainsKey($key)
    Populated = ($map.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace($map[$key]))
    SafeValue = if ($key -like "*LOCATION_ID" -and $map.ContainsKey($key)) { $map[$key] } else { "<hidden>" }
  }
}
```

Expected:

- Square location keys are populated as `LB1B9Z4GVG1BH`.
- Secret values are hidden.

## 4. Verify LAN Server

Run:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -TimeoutSec 10
Invoke-RestMethod -Uri "http://127.0.0.1:8787/setup/status" -TimeoutSec 10
Invoke-RestMethod -Uri "http://127.0.0.1:8787/sync/status" -TimeoutSec 10
Invoke-RestMethod -Uri "http://127.0.0.1:8787/devices/status" -TimeoutSec 10
```

Expected:

- `/health` returns ok.
- `/setup/status` reports production website settings.
- Square inventory count pull is configured.
- Square sales report pull is configured.
- WordPress inventory pull is configured.
- WordPress inventory polling is enabled. First startup bootstraps all existing
  website inventory pages, then switches to changed-since inventory pulls.
- Raw credentials are not returned.

Check the latest server log if available:

```powershell
Get-ChildItem "C:\PugGameShop\LANServer" -Recurse -File |
  Where-Object { $_.Name -match "log|out|err" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 10 FullName,LastWriteTime,Length
```

Look for:

```text
Square POS Singles layout ready: Singles > MTG > Lorcana > Riftbound > Pokemon
WordPress inventory polling enabled every
First run will bootstrap all existing inventory
WordPress inventory bootstrap complete; changed-since polling enabled.
Square inventory polling enabled every
```

For the current 830-card inventory and the default 100-row page size with
`PUG_WORDPRESS_INVENTORY_POLL_MAX_PAGES=5`, the first cycle should seed up to
500 rows and then log that bootstrap is continuing at a later page. The next
cycle should finish the remaining rows. If the server is set to poll every
60 seconds, expect roughly 1-2 minutes before the bootstrap completion message.

If these messages are not visible, restart the server once and recheck
health/sync status.

Also verify `/sync/status` includes:

- `wordpress_inventory_pull_connected: true`
- `square_catalog_inventory_sync_connected: true`
- `square_inventory_count_poller_connected: true`
- `last_website_inventory_pull` after the first polling cycle

If you want the 830 rows to seed faster after the one-card test passes, set
`PUG_WORDPRESS_INVENTORY_POLL_SECONDS=15` and
`PUG_WORDPRESS_INVENTORY_POLL_MAX_PAGES=10` in `local-sync.env`, restart the
LAN server, wait for the bootstrap completion message, then return the interval
to a calmer production value if desired.

## 5. Install Store App And Kiosk App

Run:

```powershell
$releaseRoot = "D:\The Pug Installers"

Start-Process -FilePath "$releaseRoot\Pug Store App-0.202.14.exe" -Wait
Start-Process -FilePath "$releaseRoot\Pug Kiosk App-0.202.14.exe" -Wait
```

Open both apps.

Expected:

- Each app shows the pre-login server connection screen.
- Auto-detect should find the LAN server.
- If auto-detect fails, manually enter `http://SERVER_IP:8787`.
- Set a unique workstation name, such as `Front Counter 1`, `Trade Desk`, or `Kiosk Left`.

Find the server IP:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -ne "127.0.0.1" } |
  Select-Object InterfaceAlias,IPAddress
```

Verify device heartbeats:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8787/devices/status" -TimeoutSec 10 |
  ConvertTo-Json -Depth 8
```

## 6. Verify Square POS Layout

In Square Dashboard or Square POS:

- Confirm category `Singles` exists.
- Confirm child categories exist:
  - `MTG`
  - `Lorcana`
  - `Riftbound`
  - `Pokemon`
- Confirm the live test item exists under `Singles / MTG`:
  - SKU `PUG-CODEX-POS-SINGLES-MTG-20260625T185622Z`
  - Quantity `1`

If the category exists but is not shown as a front POS Favorites tile, add the existing `Singles` category to the Square POS Favorites/item grid manually on the device. The API creates the catalog/category structure; Square device front-grid layout may still be device-controlled.

## 7. Verify Sync With One Card

Use the Store App inventory intake/update flow for one test card only.

Expected:

- Save/update inventory does not redirect to sync page.
- The row syncs to the LAN server.
- The LAN server pushes the product to WordPress.
- The LAN server pushes the same SKU/barcode and quantity to Square.
- The Square item lands under `Singles / GAME`.
- The app quantity matches the LAN server result after refresh.
- If the card quantity is changed on WordPress, the LAN server pulls it on the next WordPress inventory poll and pushes that absolute quantity to Square.
- If the card quantity is changed by a Square sale, the LAN server pulls Square counts on the next Square inventory poll and pushes the absolute quantity back to WordPress/app.

Do not bulk import until one-card sync succeeds.

After the one-card path succeeds, leave the LAN server running. The first-run
bootstrap will pull every existing WordPress inventory row and push each changed
or newly seen row to Square. After bootstrap completes, only changed WordPress
rows are pulled by `updated_after`, so the server is not repeatedly scanning
the whole inventory.

## 8. DYMO Printer Check

If this PC has a local DYMO printer:

```powershell
$releaseRoot = "D:\The Pug Installers"
& "$releaseRoot\Diagnose-Pug-Dymo-Printing.ps1" -TestPrint
```

Expected:

- Local DYMO service is checked first.
- If local print fails, capture the generated ZIP report and give it back to Codex.

## 9. Final Status To Report

Report back:

- LAN server installed version.
- Whether `health`, `setup/status`, `sync/status`, and `devices/status` passed.
- Whether Square location ID is populated as `LB1B9Z4GVG1BH`.
- Whether Square POS `Singles` category tree exists.
- Whether one-card WordPress/Square sync succeeded.
- Whether Store App and Kiosk App connect.
- Whether DYMO test print passed or diagnostic ZIP was created.
