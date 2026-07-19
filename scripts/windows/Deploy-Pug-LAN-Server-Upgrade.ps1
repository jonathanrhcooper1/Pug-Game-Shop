[CmdletBinding()]
param(
    [string]$ReleaseRoot = $PSScriptRoot,
    [string]$InstallRoot = "",
    [string]$TaskName = "Pug LAN Server",
    [string]$HealthUrl = "http://127.0.0.1:8787/health",
    [ValidateRange(15, 600)]
    [int]$HealthTimeoutSeconds = 120,
    [switch]$AllowFreshInstall,
    [switch]$SkipAppInstall,
    [switch]$SkipBarcodeMigration,
    [switch]$PlanOnly,
    [switch]$Elevated
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Step {
    param([string]$Message)
    Write-Host "[Pug LAN Upgrade] $Message" -ForegroundColor Cyan
}

function Resolve-FullPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath($Path)
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Quote-ProcessArgument {
    param([string]$Value)
    return '"' + ($Value -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"'
}

function Restart-Elevated {
    $arguments = @(
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", (Quote-ProcessArgument $PSCommandPath),
        "-ReleaseRoot", (Quote-ProcessArgument $ReleaseRoot),
        "-TaskName", (Quote-ProcessArgument $TaskName),
        "-HealthUrl", (Quote-ProcessArgument $HealthUrl),
        "-HealthTimeoutSeconds", [string]$HealthTimeoutSeconds,
        "-Elevated"
    )
    if ($InstallRoot) { $arguments += @("-InstallRoot", (Quote-ProcessArgument $InstallRoot)) }
    if ($AllowFreshInstall) { $arguments += "-AllowFreshInstall" }
    if ($SkipAppInstall) { $arguments += "-SkipAppInstall" }
    if ($SkipBarcodeMigration) { $arguments += "-SkipBarcodeMigration" }
    if ($PlanOnly) { $arguments += "-PlanOnly" }

    $process = Start-Process -FilePath "powershell.exe" -ArgumentList ($arguments -join " ") -Verb RunAs -Wait -PassThru
    exit $process.ExitCode
}

function Get-TaskInstallRoot {
    param([string]$Name)
    $task = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
    if (!$task) { return "" }

    foreach ($action in @($task.Actions)) {
        $arguments = [string]$action.Arguments
        $match = [regex]::Match($arguments, '(?i)"?(?<path>[A-Z]:\\[^"\r\n]*Start-Pug-LAN-Server-Hidden\.vbs)"?')
        if ($match.Success) {
            return Split-Path -Parent $match.Groups["path"].Value
        }
    }
    return ""
}

function Import-EnvFile {
    param([string]$Path)
    $values = @{}
    if (!(Test-Path -LiteralPath $Path -PathType Leaf)) { return $values }

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (!$trimmed -or $trimmed.StartsWith("#") -or !$trimmed.Contains("=")) { continue }
        $parts = $trimmed.Split("=", 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        if ($name) { $values[$name] = $value }
    }
    return $values
}

function Get-DatabasePath {
    param([string]$Root, [string]$ServerRoot)
    $envValues = Import-EnvFile (Join-Path $Root "local-sync.env")
    $configured = [string]$envValues["PUG_LOCAL_SYNC_DB"]
    if (!$configured) { $configured = [string]$envValues["LOCAL_SYNC_SQLITE_PATH"] }
    if (!$configured) { return Resolve-FullPath (Join-Path $ServerRoot "store-sync.sqlite") }
    if ([System.IO.Path]::IsPathRooted($configured)) { return Resolve-FullPath $configured }
    return Resolve-FullPath (Join-Path $ServerRoot $configured)
}

function Get-NodePath {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) { return $node.Source }

    $codexRuntime = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\runtimes\cua_node"
    if (Test-Path -LiteralPath $codexRuntime) {
        $candidate = Get-ChildItem -LiteralPath $codexRuntime -Filter node.exe -Recurse -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTimeUtc -Descending |
            Select-Object -First 1
        if ($candidate) { return $candidate.FullName }
    }
    throw "Node.js 22.13+ or Node.js 24+ is required. Install Node.js before running this upgrade."
}

function Stop-PugProcesses {
    param([string]$Root, [string]$ServerRoot)
    $rootPattern = [regex]::Escape($Root)
    $serverPattern = [regex]::Escape($ServerRoot)
    $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $commandLine = [string]$_.CommandLine
        ($_.Name -match '^(node|node\.exe)$' -and $commandLine -match 'apps[\\/]local-sync-server[\\/]src[\\/]cli\.mjs' -and $commandLine -match $serverPattern) -or
        ($_.Name -match '^Pug Store App(\.exe)?$' -and ([string]$_.ExecutablePath -match $rootPattern -or $commandLine -match 'Pug Store App'))
    }

    foreach ($process in $processes) {
        Write-Step "Stopping $($process.Name) process $($process.ProcessId)."
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
    if ($processes) { Start-Sleep -Seconds 2 }
}

function Copy-SqliteFamily {
    param([string]$DatabasePath, [string]$Destination)
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    foreach ($suffix in @("", "-wal", "-shm")) {
        $source = "$DatabasePath$suffix"
        if (Test-Path -LiteralPath $source -PathType Leaf) {
            Copy-Item -LiteralPath $source -Destination (Join-Path $Destination ([IO.Path]::GetFileName($source))) -Force
        }
    }
}

function Assert-DatabaseBackup {
    param([string]$DatabasePath, [string]$BackupDirectory)
    if (!(Test-Path -LiteralPath $DatabasePath -PathType Leaf)) { return "" }
    $backupPath = Join-Path $BackupDirectory ([IO.Path]::GetFileName($DatabasePath))
    if (!(Test-Path -LiteralPath $backupPath -PathType Leaf)) {
        throw "Database backup was not created: $backupPath"
    }
    $sourceHash = (Get-FileHash -LiteralPath $DatabasePath -Algorithm SHA256).Hash
    $backupHash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash
    if ($sourceHash -ne $backupHash) { throw "Database backup hash verification failed." }
    return $backupHash
}

function Restore-SqliteFamily {
    param([string]$DatabasePath, [string]$BackupDirectory)
    $destinationDirectory = Split-Path -Parent $DatabasePath
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    foreach ($suffix in @("", "-wal", "-shm")) {
        $destination = "$DatabasePath$suffix"
        if (Test-Path -LiteralPath $destination -PathType Leaf) {
            Remove-Item -LiteralPath $destination -Force
        }
    }
    foreach ($backupFile in Get-ChildItem -LiteralPath $BackupDirectory -File) {
        Copy-Item -LiteralPath $backupFile.FullName -Destination (Join-Path $destinationDirectory $backupFile.Name) -Force
    }
}

function Invoke-BarcodeMigration {
    param(
        [string]$NodePath,
        [string]$ToolRoot,
        [string]$DatabasePath,
        [string]$ReportDirectory
    )
    $tool = Join-Path $ToolRoot "apps\local-sync-server\tools\migrate-barcode-aliases.mjs"
    if (!(Test-Path -LiteralPath $tool -PathType Leaf)) { throw "Barcode migration tool is missing: $tool" }

    $dryReport = Join-Path $ReportDirectory "barcode-migration-dry-run.json"
    Write-Step "Auditing barcodes without changing inventory."
    & $NodePath $tool --dry-run --database $DatabasePath --report $dryReport | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Barcode migration dry-run failed. See $dryReport" }
    $dryResult = Get-Content -LiteralPath $dryReport -Raw | ConvertFrom-Json
    if ($dryResult.status -ne "ok") { throw "Barcode migration was blocked. See $dryReport" }

    $candidateCount = [int]$dryResult.summary.barcode_aliases_to_apply
    if ($candidateCount -eq 0) {
        return [ordered]@{ candidates = 0; applied = 0; report = $dryReport; square_renames_queued = 0 }
    }

    $applyReport = Join-Path $ReportDirectory "barcode-migration-apply.json"
    Write-Step "Replacing $candidateCount unsafe barcode(s) without changing quantity."
    & $NodePath $tool --apply --database $DatabasePath --report $applyReport | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Barcode migration apply failed. See $applyReport" }
    $applyResult = Get-Content -LiteralPath $applyReport -Raw | ConvertFrom-Json
    if ($applyResult.status -ne "ok" -or [int]$applyResult.verification.unsafe_barcodes_remaining -ne 0) {
        throw "Barcode migration verification failed. See $applyReport"
    }
    return [ordered]@{
        candidates = $candidateCount
        applied = [int]$applyResult.applied.barcode_aliases_applied
        report = $applyReport
        square_renames_queued = [int]$applyResult.applied.queue_operations_created
    }
}

function Install-StoreApp {
    param([string]$Root)
    $installer = Get-ChildItem -LiteralPath $Root -Filter "Pug Store App-*.exe" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if (!$installer) { throw "Pug Store App installer was not found in $Root" }
    Write-Step "Installing $($installer.Name) silently."
    $process = Start-Process -FilePath $installer.FullName -ArgumentList "/S" -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Pug Store App installer exited with code $($process.ExitCode)." }
    return $installer.Name
}

function Install-StartupTask {
    param([string]$Root, [string]$Name)
    $hiddenScript = Join-Path $Root "Start-Pug-LAN-Server-Hidden.vbs"
    if (!(Test-Path -LiteralPath $hiddenScript -PathType Leaf)) { throw "Hidden startup script is missing." }
    $action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument ('"' + $hiddenScript + '"')
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
    Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
    Enable-ScheduledTask -TaskName $Name | Out-Null
}

function Wait-ForHealth {
    param([string]$Url, [int]$TimeoutSeconds)
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 5
            if ($response.status -eq "ok" -and $response.service -eq "pug_local_sync_server") { return $response }
        } catch {
            Start-Sleep -Seconds 2
        }
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "LAN server did not become healthy within $TimeoutSeconds seconds at $Url"
}

$releaseRootPath = Resolve-FullPath $ReleaseRoot
if (!(Test-Path -LiteralPath $releaseRootPath -PathType Container)) { throw "Release folder not found: $releaseRootPath" }

if (!$PlanOnly -and !(Test-IsAdministrator)) {
    if ($Elevated) { throw "Administrator access was requested but not granted. The upgrade made no changes." }
    Write-Step "Requesting administrator access for service and application replacement."
    Restart-Elevated
}

try { Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force -ErrorAction SilentlyContinue } catch {}

$detectedInstallRoot = if ($InstallRoot) { $InstallRoot } else { Get-TaskInstallRoot $TaskName }
if (!$detectedInstallRoot -and (Test-Path -LiteralPath (Join-Path $releaseRootPath "pug-lan-server"))) {
    $detectedInstallRoot = $releaseRootPath
}
if (!$detectedInstallRoot) {
    if (!$AllowFreshInstall) {
        throw "Existing Pug LAN installation was not found. Rerun with -InstallRoot <folder>, or use -AllowFreshInstall for a new server."
    }
    $detectedInstallRoot = Join-Path $env:ProgramData "The Pug\LAN Server"
}

$installRootPath = Resolve-FullPath $detectedInstallRoot
$serverRoot = Resolve-FullPath (Join-Path $installRootPath "pug-lan-server")
$serverZip = Resolve-FullPath (Join-Path $releaseRootPath "pug-lan-server.zip")
$environmentPath = Join-Path $installRootPath "local-sync.env"
$databasePath = Get-DatabasePath $installRootPath $serverRoot
$freshInstall = !(Test-Path -LiteralPath $serverRoot -PathType Container)
$serverPrefix = $serverRoot.TrimEnd([char[]]@('\', '/')) + [IO.Path]::DirectorySeparatorChar
$databaseInsideServer = $databasePath.StartsWith($serverPrefix, [StringComparison]::OrdinalIgnoreCase)
$databaseRelativePath = if ($databaseInsideServer) { $databasePath.Substring($serverPrefix.Length) } else { "" }

if (!(Test-Path -LiteralPath $serverZip -PathType Leaf)) { throw "LAN server package is missing: $serverZip" }
if ($freshInstall -and !$AllowFreshInstall) { throw "Existing LAN server folder was not found: $serverRoot" }
if (!$freshInstall -and !(Test-Path -LiteralPath $environmentPath -PathType Leaf)) {
    throw "Existing local-sync.env was not found. The upgrade stopped before changing anything."
}

$plan = [ordered]@{
    action = "pug_lan_server_upgrade"
    release_root = $releaseRootPath
    install_root = $installRootPath
    server_root = $serverRoot
    database_path = $databasePath
    database_exists = Test-Path -LiteralPath $databasePath -PathType Leaf
    environment_file_preserved = Test-Path -LiteralPath $environmentPath -PathType Leaf
    fresh_install = $freshInstall
    barcode_migration_enabled = !$SkipBarcodeMigration
    app_install_enabled = !$SkipAppInstall
    task_name = $TaskName
    health_url = $HealthUrl
}

if ($PlanOnly) {
    $plan | ConvertTo-Json -Depth 5
    exit 0
}

New-Item -ItemType Directory -Path $installRootPath -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $installRootPath "backups\upgrade-$timestamp"
$databaseBackupRoot = Join-Path $backupRoot "database"
$postMigrationDatabaseRoot = Join-Path $backupRoot "database-after-barcode-migration"
$stageRoot = Join-Path $installRootPath (".upgrade-stage-" + [guid]::NewGuid().ToString("N"))
$failedRoot = Join-Path $backupRoot "failed-new-server"
$oldServerBackup = Join-Path $backupRoot "server-before-upgrade"
$reportPath = Join-Path $backupRoot "deployment-report.json"
$serverReplaced = $false
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$barcodeResult = [ordered]@{ candidates = 0; applied = 0; report = ""; square_renames_queued = 0 }
$databaseHash = ""
$installedApp = "skipped"

try {
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    if ($task) {
        Write-Step "Disabling and stopping scheduled task '$TaskName'."
        Disable-ScheduledTask -TaskName $TaskName | Out-Null
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    }
    Stop-PugProcesses $installRootPath $serverRoot

    if (!$freshInstall) {
        Write-Step "Backing up the installed LAN server and its data."
        Copy-Item -LiteralPath $serverRoot -Destination $oldServerBackup -Recurse -Force
    }
    if (Test-Path -LiteralPath $environmentPath -PathType Leaf) {
        Copy-Item -LiteralPath $environmentPath -Destination (Join-Path $backupRoot "local-sync.env") -Force
    }
    if (Test-Path -LiteralPath $databasePath -PathType Leaf) {
        Copy-SqliteFamily $databasePath $databaseBackupRoot
        $databaseHash = Assert-DatabaseBackup $databasePath $databaseBackupRoot
    }

    Write-Step "Expanding and validating the new LAN server."
    Expand-Archive -LiteralPath $serverZip -DestinationPath $stageRoot -Force
    $stagedCli = Join-Path $stageRoot "apps\local-sync-server\src\cli.mjs"
    if (!(Test-Path -LiteralPath $stagedCli -PathType Leaf)) { throw "The LAN package is incomplete: cli.mjs is missing." }
    $nodePath = Get-NodePath

    if (!$SkipBarcodeMigration -and (Test-Path -LiteralPath $databasePath -PathType Leaf)) {
        $barcodeResult = Invoke-BarcodeMigration $nodePath $stageRoot $databasePath $backupRoot
    }
    if ($databaseInsideServer -and (Test-Path -LiteralPath $databasePath -PathType Leaf)) {
        Copy-SqliteFamily $databasePath $postMigrationDatabaseRoot
    }

    if (Test-Path -LiteralPath $serverRoot) {
        Move-Item -LiteralPath $serverRoot -Destination (Join-Path $backupRoot "server-replaced")
    }
    Move-Item -LiteralPath $stageRoot -Destination $serverRoot
    $serverReplaced = $true
    if ($databaseInsideServer -and (Test-Path -LiteralPath $postMigrationDatabaseRoot -PathType Container)) {
        $newDatabasePath = Join-Path $serverRoot $databaseRelativePath
        $newDatabaseDirectory = Split-Path -Parent $newDatabasePath
        New-Item -ItemType Directory -Path $newDatabaseDirectory -Force | Out-Null
        foreach ($databaseFile in Get-ChildItem -LiteralPath $postMigrationDatabaseRoot -File) {
            Copy-Item -LiteralPath $databaseFile.FullName -Destination (Join-Path $newDatabaseDirectory $databaseFile.Name) -Force
        }
    }

    foreach ($helper in @(
        "Start-Pug-LAN-Server.ps1",
        "Start-Pug-LAN-Server-Hidden.vbs",
        "Install-Pug-LAN-Server-Startup-Task.ps1",
        "Deploy-Pug-LAN-Server-Upgrade.ps1",
        "Deploy-Pug-LAN-Server-Upgrade.cmd"
    )) {
        $source = Join-Path $releaseRootPath $helper
        if (Test-Path -LiteralPath $source -PathType Leaf) {
            Copy-Item -LiteralPath $source -Destination (Join-Path $installRootPath $helper) -Force
        }
    }
    if (!(Test-Path -LiteralPath $environmentPath) -and (Test-Path -LiteralPath (Join-Path $releaseRootPath "local-sync.env"))) {
        Copy-Item -LiteralPath (Join-Path $releaseRootPath "local-sync.env") -Destination $environmentPath -Force
    }
    if (!(Test-Path -LiteralPath $environmentPath -PathType Leaf)) {
        throw "local-sync.env is required on a fresh production server. Secrets were not embedded in this release."
    }

    if (!$SkipAppInstall) { $installedApp = Install-StoreApp $releaseRootPath }
    Install-StartupTask $installRootPath $TaskName
    Write-Step "Starting the upgraded LAN server."
    Start-ScheduledTask -TaskName $TaskName
    $health = Wait-ForHealth $HealthUrl $HealthTimeoutSeconds

    $report = [ordered]@{
        status = "ok"
        completed_at_utc = [DateTime]::UtcNow.ToString("o")
        release_version = "0.203.2"
        install_root = $installRootPath
        database_path = $databasePath
        database_backup = $databaseBackupRoot
        database_backup_sha256 = $databaseHash
        environment_file_preserved = Test-Path -LiteralPath $environmentPath -PathType Leaf
        barcode_migration = $barcodeResult
        square_note = "Mapped Square variations retain their variation ID and receive the new SKU during authenticated queue delivery."
        app_installer = $installedApp
        task_name = $TaskName
        health = $health
        rollback_material = $backupRoot
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    Write-Host "Upgrade complete. Report: $reportPath" -ForegroundColor Green
    $report | ConvertTo-Json -Depth 8
} catch {
    $failure = $_
    Write-Host "Upgrade failed: $($failure.Exception.Message)" -ForegroundColor Red
    if ($serverReplaced -and (Test-Path -LiteralPath $oldServerBackup -PathType Container)) {
        Write-Step "Restoring the previous LAN server."
        Stop-PugProcesses $installRootPath $serverRoot
        if (Test-Path -LiteralPath $serverRoot) { Move-Item -LiteralPath $serverRoot -Destination $failedRoot }
        Copy-Item -LiteralPath $oldServerBackup -Destination $serverRoot -Recurse -Force
    }
    if ([int]$barcodeResult.applied -gt 0 -and (Test-Path -LiteralPath $databaseBackupRoot -PathType Container)) {
        Write-Step "Restoring the pre-migration SQLite database."
        Stop-PugProcesses $installRootPath $serverRoot
        Restore-SqliteFamily $databasePath $databaseBackupRoot
    }
    if ($task -or (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue)) {
        try {
            Enable-ScheduledTask -TaskName $TaskName | Out-Null
            Start-ScheduledTask -TaskName $TaskName
        } catch {}
    }
    throw
} finally {
    if (Test-Path -LiteralPath $stageRoot -PathType Container) {
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
    }
}
