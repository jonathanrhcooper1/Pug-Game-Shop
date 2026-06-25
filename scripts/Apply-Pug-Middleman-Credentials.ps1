param(
  [string]$InstallRoot = "C:\PugGameShop\LANServer",
  [string]$CredentialFile = "",
  [switch]$RestartServer = $true
)

$ErrorActionPreference = "Stop"

function Resolve-PugCredentialFile {
  param([string]$RequestedCredentialFile)

  if ($RequestedCredentialFile -and (Test-Path -LiteralPath $RequestedCredentialFile)) {
    return (Resolve-Path -LiteralPath $RequestedCredentialFile).Path
  }

  $ScriptRoot = Split-Path -Parent $MyInvocation.ScriptName
  $Candidates = @(
    (Join-Path $ScriptRoot "LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env"),
    (Join-Path $ScriptRoot "The Pug Installers\LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env"),
    "D:\The Pug Installers\LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env"
  )

  foreach ($Candidate in $Candidates) {
    if (Test-Path -LiteralPath $Candidate) {
      return (Resolve-Path -LiteralPath $Candidate).Path
    }
  }

  throw "Could not find LOCAL_SYNC_SECRETS_FOR_MIDDLEMAN.env. Put it next to this script or pass -CredentialFile."
}

function Read-PugEnvFile {
  param([string]$Path)

  $Values = [ordered]@{}

  if (!(Test-Path -LiteralPath $Path)) {
    return $Values
  }

  foreach ($Line in Get-Content -LiteralPath $Path) {
    $Trimmed = $Line.Trim()

    if (!$Trimmed -or $Trimmed.StartsWith("#") -or !$Trimmed.Contains("=")) {
      continue
    }

    $Separator = $Trimmed.IndexOf("=")
    $Key = $Trimmed.Substring(0, $Separator).Trim()
    $Value = $Trimmed.Substring($Separator + 1).Trim()

    if ($Key) {
      $Values[$Key] = $Value
    }
  }

  return $Values
}

function Write-PugEnvFile {
  param(
    [string]$Path,
    [hashtable]$ExistingValues,
    [hashtable]$PatchValues
  )

  $Output = New-Object System.Collections.Generic.List[string]
  $Written = New-Object System.Collections.Generic.HashSet[string]

  if (Test-Path -LiteralPath $Path) {
    foreach ($Line in Get-Content -LiteralPath $Path) {
      $Trimmed = $Line.Trim()

      if (!$Trimmed -or $Trimmed.StartsWith("#") -or !$Trimmed.Contains("=")) {
        $Output.Add($Line)
        continue
      }

      $Separator = $Trimmed.IndexOf("=")
      $Key = $Trimmed.Substring(0, $Separator).Trim()

      if ($PatchValues.ContainsKey($Key)) {
        $Output.Add("$Key=$($PatchValues[$Key])")
        [void]$Written.Add($Key)
      } else {
        $Output.Add($Line)
      }
    }
  }

  foreach ($Key in $PatchValues.Keys) {
    if (!$Written.Contains($Key)) {
      $Output.Add("$Key=$($PatchValues[$Key])")
    }
  }

  $Output | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Restart-PugLanServer {
  param([string]$InstallRoot)

  try {
    $Task = Get-ScheduledTask -TaskName "Pug LAN Server" -ErrorAction SilentlyContinue
    if ($Task) {
      Stop-ScheduledTask -TaskName "Pug LAN Server" -ErrorAction SilentlyContinue
      Start-Sleep -Seconds 2
      Start-ScheduledTask -TaskName "Pug LAN Server"
      return "scheduled_task_restarted"
    }
  } catch {
    Write-Warning "Scheduled task restart failed. Falling back to direct hidden start."
  }

  $HiddenStart = Join-Path $InstallRoot "Start-Pug-LAN-Server-Hidden.vbs"
  $VisibleStart = Join-Path $InstallRoot "Start-Pug-LAN-Server.ps1"

  if (Test-Path -LiteralPath $HiddenStart) {
    Start-Process -FilePath "wscript.exe" -ArgumentList "`"$HiddenStart`"" -WindowStyle Hidden
    return "hidden_start_script_launched"
  }

  if (Test-Path -LiteralPath $VisibleStart) {
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
      "-ExecutionPolicy",
      "Bypass",
      "-NoProfile",
      "-File",
      "`"$VisibleStart`""
    ) -WindowStyle Hidden
    return "visible_start_script_launched_hidden"
  }

  return "restart_script_missing"
}

function Test-PugEndpoint {
  param([string]$Url)

  try {
    return Invoke-RestMethod -Uri $Url -TimeoutSec 10
  } catch {
    return [pscustomobject]@{
      status = "blocked"
      message = $_.Exception.Message
    }
  }
}

$ResolvedCredentialFile = Resolve-PugCredentialFile -RequestedCredentialFile $CredentialFile
$EnvPath = Join-Path $InstallRoot "local-sync.env"
$EnvExamplePath = Join-Path $InstallRoot "local-sync.env.example"

if (!(Test-Path -LiteralPath $InstallRoot)) {
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
}

if (!(Test-Path -LiteralPath $EnvPath)) {
  if (Test-Path -LiteralPath $EnvExamplePath) {
    Copy-Item -LiteralPath $EnvExamplePath -Destination $EnvPath -Force
  } else {
    New-Item -ItemType File -Force -Path $EnvPath | Out-Null
  }
}

$PatchValues = Read-PugEnvFile -Path $ResolvedCredentialFile

if ($PatchValues.Count -eq 0) {
  throw "Credential file did not contain any KEY=value lines."
}

$BackupPath = Join-Path $InstallRoot ("local-sync.env.before-credentials-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
Copy-Item -LiteralPath $EnvPath -Destination $BackupPath -Force

$ExistingValues = Read-PugEnvFile -Path $EnvPath
Write-PugEnvFile -Path $EnvPath -ExistingValues $ExistingValues -PatchValues $PatchValues

$RestartResult = "not_requested"
if ($RestartServer) {
  $RestartResult = Restart-PugLanServer -InstallRoot $InstallRoot
  Start-Sleep -Seconds 5
}

$Health = Test-PugEndpoint -Url "http://127.0.0.1:8787/health"
$Setup = Test-PugEndpoint -Url "http://127.0.0.1:8787/setup/status"
$Sync = Test-PugEndpoint -Url "http://127.0.0.1:8787/sync/status"

[pscustomobject]@{
  status = "ok"
  action = "pug_middleman_credentials_applied"
  install_root = $InstallRoot
  env_path = $EnvPath
  backup_path = $BackupPath
  credential_file = $ResolvedCredentialFile
  patched_keys = @($PatchValues.Keys)
  restart_result = $RestartResult
  health_status = $Health.status
  setup_status = $Setup.status
  sync_status = $Sync.status
  square_inventory_count_pull_configured = $Setup.square_inventory_count_pull_configured
  square_sales_report_pull_configured = $Setup.square_sales_report_pull_configured
  square_inventory_count_poller_connected = $Sync.square_inventory_count_poller_connected
  square_sales_report_puller_connected = $Sync.square_sales_report_puller_connected
  square_token_configured = $Sync.square_inventory_count_poller_status.access_token_configured
  square_location_configured = $Sync.square_inventory_count_poller_status.location_id_configured
  square_location_auto_discovery_enabled = $Sync.square_inventory_count_poller_status.location_auto_discovery_enabled
  credentials_printed = $false
  raw_credentials_returned = $false
} | ConvertTo-Json -Depth 6
