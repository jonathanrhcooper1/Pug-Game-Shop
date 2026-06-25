# Middleman Codex Deployment Prompt

Copy/paste this whole document into Codex on the LAN middleman/server PC.

The USB drive should contain `D:\The Pug Installers`. This machine is the LAN
middleman server and also has a local DYMO printer, the Pug Store App, and the
Pug Kiosk App installed or ready to install.

## Goal For Codex On The Middleman PC

Deploy the latest Pug Game Shop LAN server patch, install or update the Store
App and Kiosk App, verify the local DYMO printer path, and confirm the apps can
talk to the LAN server.

Do not print or expose any secrets. The release package already includes the
local server configuration needed for this install. If a server config already
exists, preserve it unless I explicitly ask you to replace it.

This specific `0.202.13` update is required for:

- Full existing-inventory bootstrap sync: on first LAN server startup, pull all
  current WordPress inventory pages into the middleman cache and Square before
  switching to changed-since polling. The current 830-card inventory should seed
  across about two default polling cycles.
- LAN server graded-card pricing logic: PriceCharting is the primary graded
  price source, and ScryDex/reference cache is the fallback.
- Store App graded-card trade-in UI: show staff which pricing source was used.
- Store App inventory edit fix: quantity, price, floor, and location edits must
  save on the first attempt without snapping quantity back to `1`.
- DYMO label printing fix: use newer DYMO Connect web service endpoints on the
  local PC first, then fall back to LAN/server printing only if local printing
  fails.
- DYMO local printer routing repair: if `GetPrinters` lists a local
  LabelWriter 550 Turbo but reports `IsConnected=False`, still attempt the
  local print request before using LAN fallback.
- Store/Kiosk App connection screen: each installed app keeps a stable generated
  heartbeat ID and now has a friendly workstation name field that staff can set
  before PIN login or later in Settings.
- Square POS catalog layout: the LAN server should ensure the Square categories
  `Singles`, `Singles / MTG`, `Singles / Lorcana`, `Singles / Riftbound`, and
  `Singles / Pokemon` exist, and new synced singles should land in the matching
  game category.
- LAN server install handoff: `LAN_SERVER_CODEX_INSTALL.md` is bundled as a
  shorter copy/paste prompt for Codex on the middleman computer.
- Middleman deployment instructions: newer DYMO Connect may return 404 for the
  old `/Check` endpoint; that is not by itself a printer failure.

## Step 1 - Confirm The USB Package

Run this in PowerShell:

```powershell
$releaseRoot = "D:\The Pug Installers"
Get-ChildItem -LiteralPath $releaseRoot -Force | Select-Object Name,Length,LastWriteTime
Test-Path "$releaseRoot\Deploy-Pug-LAN-Server-Patch.ps1"
Test-Path "$releaseRoot\pug-lan-server.zip"
Test-Path "$releaseRoot\Pug Store App-0.202.13.exe"
Test-Path "$releaseRoot\Pug Kiosk App-0.202.13.exe"
Test-Path "$releaseRoot\Apply-Pug-Middleman-Credentials.ps1"
Test-Path "$releaseRoot\LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env"
Test-Path "$releaseRoot\Diagnose-Pug-Dymo-Printing.ps1"
Test-Path "$releaseRoot\LAN_SERVER_CODEX_INSTALL.md"
```

Expected: all `Test-Path` commands return `True`.

Important: `LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env` contains connector secrets.
Do not print it, paste it into chat, commit it, or copy it anywhere except the
LAN server config path.

## Step 2 - Deploy The LAN Server Patch

First install/update while preserving the existing server credentials:

```powershell
$releaseRoot = "D:\The Pug Installers"
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$releaseRoot\Deploy-Pug-LAN-Server-Patch.ps1" -SourceRoot $releaseRoot
```

Only if the existing LAN server config is bad or missing and I ask you to
replace it, run:

```powershell
$releaseRoot = "D:\The Pug Installers"
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$releaseRoot\Deploy-Pug-LAN-Server-Patch.ps1" -SourceRoot $releaseRoot -ReplaceLocalEnv
```

The script should:

- Stop the old LAN server.
- Back up/preserve existing config unless `-ReplaceLocalEnv` is used.
- Install `pug-lan-server.zip` to `C:\PugGameShop\LANServer`.
- Install/start the `Pug LAN Server` scheduled task.
- Open/use TCP `8787` and UDP `8788` for the LAN apps.
- Keep the production website/Square/ScryDex/PriceCharting configuration from
  the existing `.env` unless `-ReplaceLocalEnv` is explicitly used.

## Step 2B - Apply Connector Credentials For This Release

After the LAN server patch is deployed, apply the USB credential patch into the
middleman server config. This should add/update Square settings while preserving
the existing working WordPress/ScryDex settings.

Run:

```powershell
$releaseRoot = "D:\The Pug Installers"
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$releaseRoot\Apply-Pug-Middleman-Credentials.ps1" `
  -InstallRoot "C:\PugGameShop\LANServer" `
  -CredentialFile "$releaseRoot\LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env" `
  -RestartServer
```

The script should:

- Back up `C:\PugGameShop\LANServer\local-sync.env`.
- Merge the Square connector keys from the USB credential file.
- Restart the `Pug LAN Server` scheduled task or relaunch the hidden server.
- Print only key names and safe status flags, never raw credentials.

If the script reports that Square token/location are still not configured, do
not keep editing blindly. Inspect only the key names in `local-sync.env`, not the
secret values, and make sure the USB credential file was present.

## Step 3 - Verify LAN Server Health

Run:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -TimeoutSec 10
Invoke-RestMethod -Uri "http://127.0.0.1:8787/setup/status" -TimeoutSec 10
Invoke-RestMethod -Uri "http://127.0.0.1:8787/sync/status" -TimeoutSec 10
```

Confirm the setup/status response includes:

- `graded_pricing_primary_source` = `pricecharting`
- `graded_pricing_fallback_source` = `scrydex_reference_cache`
- `square_inventory_count_pull_configured` = `true`
- `square_sales_report_pull_configured` = `true`

When the LAN server starts with Square credentials configured, watch the startup
log for:

- `Square POS Singles layout ready: Singles > MTG > Lorcana > Riftbound > Pokemon`
- `WordPress inventory polling enabled every`
- `First run will bootstrap all existing inventory`
- `WordPress inventory bootstrap complete; changed-since polling enabled.`

With default settings, the first WordPress inventory bootstrap pulls up to five
100-row pages per cycle. For the current 830-card inventory, it should seed the
first 500 rows, log that it will continue at the next page, then finish the
remaining rows on the next cycle.

Confirm the sync/status response includes:

- `square_inventory_count_poller_connected` = `true`
- `square_sales_report_puller_connected` = `true`
- `square_inventory_count_poller_status.access_token_configured` = `true`
- `square_inventory_count_poller_status.raw_credentials_returned` = `false`

Then find the server IP:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -ne "127.0.0.1" } |
  Select-Object InterfaceAlias,IPAddress
```

From another store PC, verify:

```powershell
Invoke-RestMethod -Uri "http://SERVER_IP_HERE:8787/health" -TimeoutSec 10
```

## Step 4 - Install Or Update Store App And Kiosk App

Run the installers from the USB on the middleman PC. Use normal interactive
install if silent install does not work.

```powershell
$releaseRoot = "D:\The Pug Installers"
Start-Process -FilePath "$releaseRoot\Pug Store App-0.202.13.exe" -Wait
Start-Process -FilePath "$releaseRoot\Pug Kiosk App-0.202.13.exe" -Wait
```

If the apps were already open, close and reopen them after install.

Important: every workstation that runs the Store App must also be updated to
this same `0.202.13` Store App build. If one PC still logs in and immediately
returns to the PIN screen, reinstall `Pug Store App-0.202.13.exe` on that PC,
then point it to the middleman URL `http://SERVER_IP_HERE:8787` before login.

On each app connection screen, set `This workstation name` to a unique friendly
label such as `Front Counter 1`, `Trade-In Desk`, or `Kiosk Left`. The generated
device ID remains unique per install; this name is the readable heartbeat label
shown in the LAN server device list.

After the apps open, verify the heartbeat list:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8787/devices/status" -TimeoutSec 10 |
  ConvertTo-Json -Depth 8
```

## Step 5 - Start And Verify DYMO Local Printing

This PC has the local DYMO printer attached. The current app should print to
this local printer first and only fall back to the LAN server printer if local
printing is unavailable.

Run the DYMO service helper:

```powershell
$dyMoScripts = @(
  "D:\The Pug Installers\the-pug-store-deliverables-0.202.13\Pug Store App\Start-Pug-Dymo-Local-Service.ps1",
  "D:\The Pug Installers\the-pug-store-deliverables-0.202.13\LAN Server + Pug Store App\Start-Pug-Dymo-Local-Service.ps1"
)

foreach ($script in $dyMoScripts) {
  if (Test-Path -LiteralPath $script) {
    Set-ExecutionPolicy -Scope Process Bypass -Force
    & $script
    break
  }
}
```

Check the DYMO local web service:

```powershell
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
Invoke-RestMethod -Uri "https://127.0.0.1:41951/DYMO/DLS/Printing/StatusConnected" -TimeoutSec 10
Invoke-RestMethod -Uri "https://127.0.0.1:41951/DYMO/DLS/Printing/GetPrinters" -TimeoutSec 10
```

Expected: `StatusConnected` may return a plain status response, and the attached
DYMO LabelWriter appears in `GetPrinters`. Do not treat `/Check` returning 404
as a failure on newer DYMO Connect installs. If `GetPrinters` does not show the
printer, open DYMO Connect once, confirm the printer works there, then repeat
the check.

Decision note from the remote PC inspection: DYMO Connect is listening only on
`127.0.0.1:41951`, not as a LAN print server. That means each workstation should
print to its own attached DYMO through its own local DYMO service. The LAN server
printer path is only a fallback when the local PC does not have a working DYMO
service/printer.

## Step 6 - Verify App Connection And Login

Open the Pug Store App.

- It should try auto-detecting the LAN server.
- If auto-detect fails, enter `http://SERVER_IP_HERE:8787`.
- Login with the store PIN.
- Confirm the top status shows online/connected after sync.

Open the Pug Kiosk App.

- It should also auto-detect the LAN server.
- If auto-detect fails, enter `http://SERVER_IP_HERE:8787`.
- Confirm inventory loads and the kiosk can scroll.

## Step 7 - Verify Printing From The App

In the Store App:

1. Go to Inventory.
2. Select one inventory item with a barcode/SKU.
3. Click the print barcode/label action once.
4. Confirm it prints on the DYMO attached to this PC.

If it does not print:

- Re-run the DYMO service helper above.
- Confirm DYMO Connect sees the printer.
- Confirm the app is the freshly installed `0.202.13` build.
- Check whether the app reports a local print failure before LAN fallback.
- Run the standalone diagnostic collector and send the generated ZIP report
  back to Codex:

```powershell
$releaseRoot = "D:\The Pug Installers"
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$releaseRoot\Diagnose-Pug-Dymo-Printing.ps1" `
  -LanServerUrl "http://SERVER_IP_HERE:8787" `
  -TryStartDymo
```

If DYMO Connect sees the printer but the app still fails, run one controlled
test print:

```powershell
$releaseRoot = "D:\The Pug Installers"
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$releaseRoot\Diagnose-Pug-Dymo-Printing.ps1" `
  -LanServerUrl "http://SERVER_IP_HERE:8787" `
  -TryStartDymo `
  -TestPrint
```

The script writes a summary, JSON report, and ZIP under the desktop
`Pug-Dymo-Diagnostics` folder. It does not collect connector secrets.

## Step 8 - Verify Live Sync

In the Store App:

1. Select one test inventory item.
2. Change quantity by 1.
3. Save.
4. Confirm it stays on Inventory and does not redirect to Queue.
5. Confirm queue count clears after sync.
6. Confirm the same quantity appears on the website and other app machines.
7. Change the quantity again, save, and confirm it does not snap back to `1`.
8. Change sale price/floor/location once and confirm the first save sticks.

Then run:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8787/sync/status" -TimeoutSec 10
```

If items remain queued, capture the response and inspect server logs before
making more changes.

## Step 9 - Verify Square Connector

Run:

```powershell
$sync = Invoke-RestMethod -Uri "http://127.0.0.1:8787/sync/status" -TimeoutSec 10
$sync.square_inventory_count_poller_status
$sync.square_sales_report_puller_status
$sync.last_square_inventory_reconciliation
$sync.last_square_sales_report_pull
```

Expected:

- Token configured is `true`.
- Raw credentials returned is `false`.
- Location is either explicitly configured or auto-discovery is enabled.
- Inventory polling is connected.
- Sales report pulling is connected.

If inventory polling is connected but no reconciliation has run yet, wait 20
seconds and call `/sync/status` again. The server polls Square counts on a timer.

If Square reports a token/location error, use the Square Developer dashboard to
verify the production access token is active and tied to the store location.

## Step 10 - Verify Graded Pricing Source

In the Store App:

1. Go to Trade-In.
2. Select or search a graded card.
3. Choose grading company and grade.
4. Confirm the market value panel says PriceCharting when a PriceCharting value
   is available.
5. Confirm it says ScryDex/reference fallback only when PriceCharting does not
   return a usable graded value.

If graded values are missing, verify the LAN server `.env` still has the
PriceCharting token/settings from the existing middleman configuration. Do not
print the token in the final report.

## Step 11 - Final Report Back

Tell me:

- LAN server health result.
- Server IP address.
- Whether Store App and Kiosk App installed.
- Whether app auto-detect worked or manual URL was needed.
- Whether DYMO local service returned printers.
- Whether a label printed locally.
- Whether inventory save cleared the queue and synced.
- Whether inventory quantity/price/location saved on the first try.
- Whether graded-card pricing showed PriceCharting primary or ScryDex fallback.
- Whether Square inventory count polling is connected.
- Whether Square sales report pulling is connected.
- Whether Square raw credentials were kept hidden in status responses.
- Any exact error messages.
