[CmdletBinding()]
param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runtimeDirectory = Join-Path $repoRoot ".codex-logs\runtime"
$statePath = Join-Path $runtimeDirectory "pug-store-runtime.json"
$serverLogPath = Join-Path $runtimeDirectory "local-sync-server.log"
$serverErrorLogPath = Join-Path $runtimeDirectory "local-sync-server-error.log"
$appLogPath = Join-Path $runtimeDirectory "store-app.log"
$appErrorLogPath = Join-Path $runtimeDirectory "store-app-error.log"
$employeeUrl = "http://127.0.0.1:1420/"
$kioskUrl = "http://127.0.0.1:1420/?mode=kiosk"
$serverBaseUrl = if ($env:PUG_LOCAL_SYNC_PUBLIC_URL) {
    $env:PUG_LOCAL_SYNC_PUBLIC_URL
} elseif ($env:LOCAL_SYNC_SERVER_URL) {
    $env:LOCAL_SYNC_SERVER_URL
} else {
    "http://127.0.0.1:8787"
}
$serverBaseUrl = $serverBaseUrl.TrimEnd("/")
$healthUrl = "$serverBaseUrl/health"
$isLocalServerUrl = $serverBaseUrl -match "^https?://(127\.0\.0\.1|localhost|\[::1\])(:|/|$)"

$env:VITE_PUG_DEFAULT_LOCAL_SYNC_SERVER_URL = $serverBaseUrl

New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null

$node = Get-Command node.exe -ErrorAction Stop
$viteEntry = Join-Path $repoRoot "apps\offline-app\node_modules\vite\bin\vite.js"

if (-not (Test-Path -LiteralPath $viteEntry)) {
    throw "Offline app dependencies are missing. Run npm install from $repoRoot first."
}

function Test-HttpEndpoint {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Wait-HttpEndpoint {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [int]$Attempts = 30
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt += 1) {
        if (Test-HttpEndpoint -Url $Url) {
            return $true
        }

        Start-Sleep -Milliseconds 400
    }

    return $false
}

$serverProcess = $null
$serverOwned = $false

if ($isLocalServerUrl -and -not (Test-HttpEndpoint -Url $healthUrl)) {
    $serverProcess = Start-Process `
        -FilePath $node.Source `
        -ArgumentList @("apps/local-sync-server/src/cli.mjs") `
        -WorkingDirectory $repoRoot `
        -RedirectStandardOutput $serverLogPath `
        -RedirectStandardError $serverErrorLogPath `
        -WindowStyle Hidden `
        -PassThru
    $serverOwned = $true

    if (-not (Wait-HttpEndpoint -Url $healthUrl)) {
        throw "The LAN sync server did not become healthy. Check $serverErrorLogPath."
    }
} elseif (-not (Test-HttpEndpoint -Url $healthUrl)) {
    throw "The configured LAN sync server is not reachable at $healthUrl. Start the LAN Server or set PUG_LOCAL_SYNC_PUBLIC_URL to the correct address."
}

$appProcess = $null
$appOwned = $false

if (-not (Test-HttpEndpoint -Url $employeeUrl)) {
    $appProcess = Start-Process `
        -FilePath $node.Source `
        -ArgumentList @(
            $viteEntry,
            "--host",
            "127.0.0.1",
            "--port",
            "1420",
            "--strictPort"
        ) `
        -WorkingDirectory (Join-Path $repoRoot "apps\offline-app") `
        -RedirectStandardOutput $appLogPath `
        -RedirectStandardError $appErrorLogPath `
        -WindowStyle Hidden `
        -PassThru
    $appOwned = $true

    if (-not (Wait-HttpEndpoint -Url $employeeUrl)) {
        throw "The store app did not become available. Check $appErrorLogPath."
    }
}

$runtimeState = [ordered]@{
    started_at_utc = [DateTime]::UtcNow.ToString("o")
    repository = $repoRoot
    local_sync_server = [ordered]@{
        owned = $serverOwned
        pid = if ($serverProcess) { $serverProcess.Id } else { $null }
        url = $healthUrl
    }
    store_app = [ordered]@{
        owned = $appOwned
        pid = if ($appProcess) { $appProcess.Id } else { $null }
        url = $employeeUrl
    }
}

$runtimeState | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding UTF8

Write-Host ""
Write-Host "The Pug store system is ready." -ForegroundColor Green
Write-Host "Employee app: $employeeUrl"
Write-Host "Customer kiosk: $kioskUrl"
Write-Host "LAN sync server: $serverBaseUrl"
Write-Host ""

if (-not $NoBrowser) {
    Start-Process $employeeUrl
    Start-Process $kioskUrl
}
