param(
  [string]$SourceRoot = "",
  [string]$InstallRoot = "C:\PugGameShop\LANServer",
  [switch]$ReplaceLocalEnv = $false,
  [switch]$InstallStartupTask = $true,
  [switch]$StartNow = $true,
  [switch]$StopRunningServer = $true
)

$ErrorActionPreference = "Stop"

function Resolve-PugSourceRoot {
  param([string]$RequestedSourceRoot)

  if ($RequestedSourceRoot -and (Test-Path -LiteralPath $RequestedSourceRoot)) {
    return (Resolve-Path -LiteralPath $RequestedSourceRoot).Path
  }

  return (Split-Path -Parent $MyInvocation.ScriptName)
}

function Resolve-PugLanPackageRoot {
  param([string]$Root)

  $DirectZip = Join-Path $Root "pug-lan-server.zip"
  $DirectStart = Join-Path $Root "Start-Pug-LAN-Server.ps1"
  if ((Test-Path -LiteralPath $DirectZip) -and (Test-Path -LiteralPath $DirectStart)) {
    return $Root
  }

  $ReleaseFolder = Get-ChildItem -LiteralPath $Root -Directory -Filter "the-pug-store-deliverables-*" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($ReleaseFolder) {
    $Nested = Join-Path $ReleaseFolder.FullName "LAN Server + Pug Store App"
    if (Test-Path -LiteralPath (Join-Path $Nested "pug-lan-server.zip")) {
      return $Nested
    }
  }

  $NestedDirect = Join-Path $Root "LAN Server + Pug Store App"
  if (Test-Path -LiteralPath (Join-Path $NestedDirect "pug-lan-server.zip")) {
    return $NestedDirect
  }

  throw "Could not find the LAN Server + Pug Store App package under '$Root'."
}

function Stop-PugLanServer {
  param([string]$InstallRoot, [int]$Port)

  try {
    $Task = Get-ScheduledTask -TaskName "Pug LAN Server" -ErrorAction SilentlyContinue
    if ($Task) {
      Stop-ScheduledTask -TaskName "Pug LAN Server" -ErrorAction SilentlyContinue
    }
  } catch {
    Write-Warning "Could not stop the Pug LAN Server scheduled task. Continuing."
  }

  try {
    $Connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($Connection in $Connections) {
      $Process = Get-CimInstance Win32_Process -Filter "ProcessId=$($Connection.OwningProcess)" -ErrorAction SilentlyContinue
      $CommandLine = [string]$Process.CommandLine
      if ($CommandLine -match "pug-lan-server|local-sync-server|Start-Pug-LAN-Server|PugGameShop") {
        Write-Host "Stopping existing Pug LAN server process $($Connection.OwningProcess)."
        Stop-Process -Id $Connection.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {
    Write-Warning "Could not inspect or stop the process on port $Port. Continuing."
  }
}

function Copy-PugPatchFiles {
  param([string]$PackageRoot, [string]$InstallRoot)

  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

  $Files = @(
    "pug-lan-server.zip",
    "Start-Pug-LAN-Server.ps1",
    "Start-Pug-LAN-Server-Hidden.vbs",
    "Install-Pug-LAN-Server-Startup-Task.ps1",
    "local-sync.env.example"
  )

  foreach ($File in $Files) {
    $Source = Join-Path $PackageRoot $File
    if (Test-Path -LiteralPath $Source) {
      Copy-Item -LiteralPath $Source -Destination (Join-Path $InstallRoot $File) -Force
    }
  }

  foreach ($Folder in @("website", "documentation")) {
    $Source = Join-Path $PackageRoot $Folder
    if (Test-Path -LiteralPath $Source) {
      Copy-Item -LiteralPath $Source -Destination (Join-Path $InstallRoot $Folder) -Recurse -Force
    }
  }

  $EnvPath = Join-Path $InstallRoot "local-sync.env"
  $EnvExamplePath = Join-Path $InstallRoot "local-sync.env.example"
  $BundledEnvPath = Join-Path $PackageRoot "local-sync.env"

  if (Test-Path -LiteralPath $BundledEnvPath) {
    if ((Test-Path -LiteralPath $EnvPath) -and !$ReplaceLocalEnv) {
      Write-Host "Preserved existing local-sync.env. Pass -ReplaceLocalEnv to install the bundled production connector config."
    } else {
      if (Test-Path -LiteralPath $EnvPath) {
        $BackupPath = Join-Path $InstallRoot ("local-sync.env.backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
        Copy-Item -LiteralPath $EnvPath -Destination $BackupPath -Force
        Write-Host "Backed up existing local-sync.env to $BackupPath"
      }

      Copy-Item -LiteralPath $BundledEnvPath -Destination $EnvPath -Force
      Write-Host "Installed bundled local-sync.env production connector config."
    }
  } elseif (!(Test-Path -LiteralPath $EnvPath) -and (Test-Path -LiteralPath $EnvExamplePath)) {
    Copy-Item -LiteralPath $EnvExamplePath -Destination $EnvPath -Force
    Write-Warning "Created local-sync.env from the example. Add WordPress/Square/ScryDex values or include a bundled local-sync.env before expecting live sync."
  }
}

function Expand-PugLanServer {
  param([string]$InstallRoot)

  $Zip = Join-Path $InstallRoot "pug-lan-server.zip"
  $ServerRoot = Join-Path $InstallRoot "pug-lan-server"

  if (!(Test-Path -LiteralPath $Zip)) {
    throw "Missing pug-lan-server.zip in '$InstallRoot'."
  }

  New-Item -ItemType Directory -Force -Path $ServerRoot | Out-Null
  Expand-Archive -LiteralPath $Zip -DestinationPath $ServerRoot -Force
}

function Start-PugLanServer {
  param([string]$InstallRoot)

  $HiddenStart = Join-Path $InstallRoot "Start-Pug-LAN-Server-Hidden.vbs"
  $VisibleStart = Join-Path $InstallRoot "Start-Pug-LAN-Server.ps1"

  if (Test-Path -LiteralPath $HiddenStart) {
    Start-Process -FilePath "wscript.exe" -ArgumentList "`"$HiddenStart`"" -WindowStyle Hidden
    return
  }

  Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-ExecutionPolicy",
    "Bypass",
    "-NoProfile",
    "-File",
    "`"$VisibleStart`""
  ) -WindowStyle Hidden
}

function Test-PugLanHealth {
  param([int]$Port)

  $HealthUrl = "http://127.0.0.1:$Port/health"
  for ($Attempt = 1; $Attempt -le 10; $Attempt += 1) {
    try {
      $Health = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 3
      Write-Host "LAN server health check passed: $($Health.status)"
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  Write-Warning "LAN server health check did not answer at $HealthUrl yet. Check local-sync.env, Node.js, and firewall if apps cannot connect."
}

$ResolvedSourceRoot = Resolve-PugSourceRoot -RequestedSourceRoot $SourceRoot
$PackageRoot = Resolve-PugLanPackageRoot -Root $ResolvedSourceRoot
$Port = 8787
$EnvExample = Join-Path $PackageRoot "local-sync.env.example"
if (Test-Path -LiteralPath $EnvExample) {
  $PortLine = Get-Content -LiteralPath $EnvExample | Where-Object { $_ -match "^LOCAL_SYNC_PORT=" } | Select-Object -First 1
  if ($PortLine) {
    $ParsedPort = [int]($PortLine -replace "^LOCAL_SYNC_PORT=", "")
    if ($ParsedPort -gt 0) {
      $Port = $ParsedPort
    }
  }
}

Write-Host "Deploying Pug LAN server patch..."
Write-Host "Source: $PackageRoot"
Write-Host "Install root: $InstallRoot"

if ($StopRunningServer) {
  Stop-PugLanServer -InstallRoot $InstallRoot -Port $Port
}

Copy-PugPatchFiles -PackageRoot $PackageRoot -InstallRoot $InstallRoot
Expand-PugLanServer -InstallRoot $InstallRoot

if ($InstallStartupTask) {
  $StartupScript = Join-Path $InstallRoot "Install-Pug-LAN-Server-Startup-Task.ps1"
  if (Test-Path -LiteralPath $StartupScript) {
    & powershell.exe -ExecutionPolicy Bypass -NoProfile -File $StartupScript
  }
}

if ($StartNow) {
  Start-PugLanServer -InstallRoot $InstallRoot
  Test-PugLanHealth -Port $Port
}

Write-Host "Pug LAN server patch deployment complete."
