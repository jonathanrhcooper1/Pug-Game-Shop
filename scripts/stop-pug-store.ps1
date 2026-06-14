[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$statePath = Join-Path $repoRoot ".codex-logs\runtime\pug-store-runtime.json"

if (-not (Test-Path -LiteralPath $statePath)) {
    Write-Host "No launcher-owned Pug store processes are recorded."
    exit 0
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json

function Stop-OwnedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Entry,
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [string]$ExpectedCommandFragment
    )

    if (-not $Entry.owned -or -not $Entry.pid) {
        Write-Host "$Label was already running and was not started by this launcher."
        return
    }

    $processRecord = Get-CimInstance Win32_Process -Filter "ProcessId = $($Entry.pid)" -ErrorAction SilentlyContinue

    if (-not $processRecord) {
        Write-Host "$Label is already stopped."
        return
    }

    if (
        -not $processRecord.CommandLine -or
        -not $processRecord.CommandLine.Contains($ExpectedCommandFragment)
    ) {
        Write-Warning "$Label PID $($Entry.pid) no longer matches the expected Pug command. It was not stopped."
        return
    }

    Stop-Process -Id $Entry.pid -Force
    Write-Host "Stopped $Label."
}

Stop-OwnedProcess `
    -Entry $state.store_app `
    -Label "store app" `
    -ExpectedCommandFragment "vite"

Stop-OwnedProcess `
    -Entry $state.local_sync_server `
    -Label "LAN sync server" `
    -ExpectedCommandFragment "apps/local-sync-server/src/cli.mjs"

Remove-Item -LiteralPath $statePath -Force
Write-Host "Pug store launcher shutdown is complete."
