# LAN Server Codex Install Prompt

Copy/paste this whole file into Codex on the LAN server computer.

The USB should be plugged in and should contain:

```text
D:\The Pug Installers
```

Goal: install or update the Pug LAN Server, preserve existing credentials unless explicitly replacing them, install the Store App/Kiosk App installers from the same release, and verify the server can accept app heartbeats.

Do not print or expose secret values. It is okay to show key names and safe status flags.

## PowerShell Install Steps

Run this in PowerShell on the LAN server PC:

```powershell
$releaseRoot = "D:\The Pug Installers"
$installRoot = "C:\PugGameShop\LANServer"

Set-ExecutionPolicy -Scope Process Bypass -Force

Get-ChildItem -LiteralPath $releaseRoot -Force |
  Select-Object Name,Length,LastWriteTime

Test-Path "$releaseRoot\Deploy-Pug-LAN-Server-Patch.ps1"
Test-Path "$releaseRoot\pug-lan-server.zip"
Test-Path "$releaseRoot\Pug Store App-0.202.14.exe"
Test-Path "$releaseRoot\Pug Kiosk App-0.202.14.exe"

& "$releaseRoot\Deploy-Pug-LAN-Server-Patch.ps1" `
  -SourceRoot $releaseRoot
```

Only if the current server `.env` is missing or known bad, run the replace version:

```powershell
$releaseRoot = "D:\The Pug Installers"
Set-ExecutionPolicy -Scope Process Bypass -Force

& "$releaseRoot\Deploy-Pug-LAN-Server-Patch.ps1" `
  -SourceRoot $releaseRoot `
  -ReplaceLocalEnv
```

If the USB includes `LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env`, apply those credentials after the patch:

```powershell
$releaseRoot = "D:\The Pug Installers"
$installRoot = "C:\PugGameShop\LANServer"

if (Test-Path "$releaseRoot\LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env") {
  & "$releaseRoot\Apply-Pug-Middleman-Credentials.ps1" `
    -InstallRoot $installRoot `
    -CredentialFile "$releaseRoot\LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env" `
    -RestartServer
}
```

## Verify Server

Run:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -TimeoutSec 10
Invoke-RestMethod -Uri "http://127.0.0.1:8787/setup/status" -TimeoutSec 10
Invoke-RestMethod -Uri "http://127.0.0.1:8787/sync/status" -TimeoutSec 10
Invoke-RestMethod -Uri "http://127.0.0.1:8787/devices/status" -TimeoutSec 10
```

Expected:

- `health` is `ok`.
- `setup/status` reports the production website URL.
- `sync/status` returns queue counts.
- `devices/status` works, even if no apps are connected yet.
- On first startup, WordPress inventory polling bootstraps all existing website
  inventory rows before changing to live changed-row polling. With the default
  100-row page size and 5 pages per cycle, the current 830-card inventory should
  seed across about two polling cycles.

Check the latest LAN server log for:

```text
WordPress inventory polling enabled every
First run will bootstrap all existing inventory
WordPress inventory bootstrap complete; changed-since polling enabled.
```

## Install Apps On This Server PC

Run these if the server PC also needs the Store App and Kiosk App:

```powershell
$releaseRoot = "D:\The Pug Installers"

Start-Process -FilePath "$releaseRoot\Pug Store App-0.202.14.exe" -Wait
Start-Process -FilePath "$releaseRoot\Pug Kiosk App-0.202.14.exe" -Wait
```

## App Connection And Heartbeat Naming

When each Store App or Kiosk App opens, it shows a connection screen before PIN login.

Set:

- `This workstation name`: a friendly name for that computer, for example `Front Counter 1`, `Trade-In Desk`, or `Kiosk Left`.
- `LAN server IP or URL`: the server URL, for example `http://10.1.10.116:8787`.

The app still keeps its own stable generated device ID locally. The workstation name is the friendly heartbeat label that appears in the LAN server device list.

Verify connected apps:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8787/devices/status" -TimeoutSec 10 |
  ConvertTo-Json -Depth 8
```

You should see each app install as a separate device row once each app is open.

## DYMO Verification

If labels do not print locally on a workstation, run this on that workstation:

```powershell
$releaseRoot = "D:\The Pug Installers"
Set-ExecutionPolicy -Scope Process Bypass -Force

& "$releaseRoot\Diagnose-Pug-Dymo-Printing.ps1" -TestPrint
```

Send Codex the generated ZIP report if printing is still blocked.
