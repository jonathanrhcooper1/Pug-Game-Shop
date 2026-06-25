param(
  [string]$DymoPrintersUrl = "https://127.0.0.1:41951/DYMO/DLS/Printing/GetPrinters",
  [int]$TimeoutSeconds = 5,
  [int]$StartupWaitSeconds = 20,
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

function Write-PugLine {
  param([string]$Message = "")
  Write-Host $Message
}

function Get-DymoServices {
  $Services = @()

  try {
    $Services = Get-CimInstance Win32_Service -ErrorAction Stop | Where-Object {
      $_.Name -match "(?i)dymo" -or
      $_.DisplayName -match "(?i)dymo" -or
      $_.PathName -match "(?i)dymo"
    }
  } catch {
    try {
      $Services = Get-Service -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match "(?i)dymo" -or $_.DisplayName -match "(?i)dymo"
      } | ForEach-Object {
        [pscustomobject]@{
          Name = $_.Name
          DisplayName = $_.DisplayName
          State = $_.Status
          StartMode = ""
          PathName = ""
        }
      }
    } catch {
      $Services = @()
    }
  }

  $Seen = @{}
  foreach ($Service in $Services) {
    if ($Service.Name -and -not $Seen.ContainsKey($Service.Name)) {
      $Seen[$Service.Name] = $true
      $Service
    }
  }
}

function Get-DymoProcesses {
  try {
    Get-Process -ErrorAction SilentlyContinue | Where-Object {
      $_.ProcessName -match "(?i)dymo" -or $_.Path -match "(?i)dymo"
    }
  } catch {
    @()
  }
}

function Get-DymoInstallRecords {
  $RegistryRoots = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
  )

  foreach ($Root in $RegistryRoots) {
    try {
      Get-ItemProperty -Path $Root -ErrorAction SilentlyContinue | Where-Object {
        $_.DisplayName -match "(?i)dymo"
      } | ForEach-Object {
        [pscustomobject]@{
          DisplayName = [string]$_.DisplayName
          DisplayVersion = [string]$_.DisplayVersion
          InstallLocation = [string]$_.InstallLocation
          InstallSource = [string]$_.InstallSource
        }
      }
    } catch {
      # Some registry hives are not readable for every Windows account.
    }
  }
}

function Resolve-ExistingPath {
  param([string]$Path)

  if (!$Path) {
    return $null
  }

  try {
    if (Test-Path -LiteralPath $Path) {
      return (Resolve-Path -LiteralPath $Path).Path
    }
  } catch {
    return $null
  }

  return $null
}

function Get-DymoLaunchTargets {
  param([object[]]$InstallRecords)

  $ExecutableNames = @(
    "DYMOConnect.exe",
    "DYMO Connect.exe",
    "DYMO.DLS.Printing.Host.exe",
    "DYMO.WebApi.Win.Host.exe",
    "DymoQuickPrint.exe"
  )
  $Roots = @()

  foreach ($Record in $InstallRecords) {
    $Roots += $Record.InstallLocation
    $Roots += $Record.InstallSource
  }

  $Roots += Join-Path $env:ProgramFiles "DYMO"
  if (${env:ProgramFiles(x86)}) {
    $Roots += Join-Path ${env:ProgramFiles(x86)} "DYMO"
  }
  if ($env:LOCALAPPDATA) {
    $Roots += Join-Path $env:LOCALAPPDATA "Programs\DYMO Connect"
  }

  $ResolvedRoots = @()
  foreach ($Root in $Roots) {
    $Resolved = Resolve-ExistingPath $Root
    if ($Resolved) {
      $ResolvedRoots += $Resolved
    }
  }

  $Targets = @()
  foreach ($Root in ($ResolvedRoots | Sort-Object -Unique)) {
    foreach ($Name in $ExecutableNames) {
      $DirectPath = Join-Path $Root $Name
      $ResolvedDirectPath = Resolve-ExistingPath $DirectPath
      if ($ResolvedDirectPath) {
        $Targets += [pscustomobject]@{ Path = $ResolvedDirectPath; Kind = "exe" }
      }
    }

    try {
      Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $ExecutableNames -contains $_.Name } |
        ForEach-Object {
          $Targets += [pscustomobject]@{ Path = $_.FullName; Kind = "exe" }
        }
    } catch {
      # Keep discovery best-effort; the service test below is the source of truth.
    }
  }

  $ShortcutRoots = @(
    [Environment]::GetFolderPath("CommonPrograms"),
    [Environment]::GetFolderPath("Programs"),
    [Environment]::GetFolderPath("CommonDesktopDirectory"),
    [Environment]::GetFolderPath("DesktopDirectory")
  )

  foreach ($Root in ($ShortcutRoots | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Sort-Object -Unique)) {
    try {
      Get-ChildItem -LiteralPath $Root -Recurse -File -Filter "*DYMO*Connect*.lnk" -ErrorAction SilentlyContinue |
        ForEach-Object {
          $Targets += [pscustomobject]@{ Path = $_.FullName; Kind = "shortcut" }
        }
    } catch {
      # Start menu discovery is optional.
    }
  }

  $Seen = @{}
  foreach ($Target in $Targets) {
    if ($Target.Path -and -not $Seen.ContainsKey($Target.Path)) {
      $Seen[$Target.Path] = $true
      $Target
    }
  }
}

function Start-DymoServices {
  param([object[]]$Services)

  $StartedAny = $false

  foreach ($Service in $Services) {
    $State = [string]$Service.State
    $StartMode = [string]$Service.StartMode
    $Display = if ($Service.DisplayName) { $Service.DisplayName } else { $Service.Name }

    if ($State -eq "Running") {
      Write-PugLine "DYMO service already running: $Display"
      continue
    }

    if ($StartMode -eq "Disabled") {
      Write-PugLine "DYMO service is disabled and was not started: $Display"
      continue
    }

    try {
      Write-PugLine "Starting DYMO service: $Display"
      Start-Service -Name $Service.Name -ErrorAction Stop
      $StartedAny = $true

      try {
        (Get-Service -Name $Service.Name -ErrorAction Stop).WaitForStatus("Running", [TimeSpan]::FromSeconds(10))
      } catch {
        Write-PugLine "Started request was sent, but Windows did not report the service running yet."
      }
    } catch {
      Write-PugLine "Could not start DYMO service '${Display}': $($_.Exception.Message)"
    }
  }

  return $StartedAny
}

function Start-DymoApplication {
  param([object[]]$LaunchTargets)

  $PreferredTargets = $LaunchTargets | Sort-Object @{
    Expression = {
      if ($_.Path -match "(?i)DYMOConnect|DYMO Connect") { 0 } else { 1 }
    }
  }, Path

  foreach ($Target in $PreferredTargets) {
    try {
      Write-PugLine "Starting DYMO Connect: $($Target.Path)"
      if ($Target.Kind -eq "exe" -and $Target.Path -match "(?i)Host|Service") {
        Start-Process -FilePath $Target.Path -WindowStyle Hidden | Out-Null
      } else {
        Start-Process -FilePath $Target.Path -WindowStyle Minimized | Out-Null
      }
      return $true
    } catch {
      Write-PugLine "Could not start '$($Target.Path)': $($_.Exception.Message)"
    }
  }

  return $false
}

function Invoke-DymoGetPrinters {
  param(
    [string]$Url,
    [int]$TimeoutSeconds
  )

  $PreviousCertificateCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
  $Response = $null
  $Reader = $null

  try {
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

    $Request = [System.Net.WebRequest]::Create($Url)
    $Request.Method = "GET"
    $Request.Timeout = [Math]::Max(1, $TimeoutSeconds) * 1000
    $Response = $Request.GetResponse()
    $Reader = New-Object System.IO.StreamReader($Response.GetResponseStream())
    $Body = $Reader.ReadToEnd()
    $StatusCode = 200

    if ($Response.PSObject.Properties.Name -contains "StatusCode") {
      $StatusCode = [int]$Response.StatusCode
    }

    return [pscustomobject]@{
      Ok = $true
      StatusCode = $StatusCode
      Body = $Body
      Error = ""
    }
  } catch {
    return [pscustomobject]@{
      Ok = $false
      StatusCode = 0
      Body = ""
      Error = $_.Exception.Message
    }
  } finally {
    if ($Reader) {
      $Reader.Dispose()
    }
    if ($Response) {
      $Response.Close()
    }
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $PreviousCertificateCallback
  }
}

function Get-DymoXmlValue {
  param(
    [string]$Xml,
    [string]$TagName
  )

  $Match = [regex]::Match($Xml, "<$TagName>([\s\S]*?)</$TagName>", "IgnoreCase")
  if (!$Match.Success) {
    return ""
  }

  return [System.Net.WebUtility]::HtmlDecode($Match.Groups[1].Value).Trim()
}

function Get-DymoPrinterSummary {
  param([string]$Xml)

  $PrinterMatches = [regex]::Matches($Xml, "<LabelWriterPrinter>([\s\S]*?)</LabelWriterPrinter>", "IgnoreCase")
  $Printers = @()

  foreach ($Match in $PrinterMatches) {
    $PrinterXml = $Match.Groups[1].Value
    $Printers += [pscustomobject]@{
      Name = Get-DymoXmlValue -Xml $PrinterXml -TagName "Name"
      ModelName = Get-DymoXmlValue -Xml $PrinterXml -TagName "ModelName"
      IsConnected = (Get-DymoXmlValue -Xml $PrinterXml -TagName "IsConnected") -eq "True"
    }
  }

  return [pscustomobject]@{
    Count = $Printers.Count
    ConnectedCount = @($Printers | Where-Object { $_.IsConnected }).Count
    Printers = $Printers
  }
}

function Write-DymoEndpointResult {
  param(
    [string]$Url,
    [object]$Result
  )

  $Summary = Get-DymoPrinterSummary -Xml $Result.Body
  Write-PugLine "DYMO Connect local printing service is reachable:"
  Write-PugLine "  $Url"
  Write-PugLine "HTTP status: $($Result.StatusCode)"
  Write-PugLine "Printers reported: $($Summary.Count)"
  Write-PugLine "Connected printers: $($Summary.ConnectedCount)"

  foreach ($Printer in $Summary.Printers) {
    $Connected = if ($Printer.IsConnected) { "connected" } else { "not connected" }
    $Name = if ($Printer.Name) { $Printer.Name } else { "(unnamed DYMO printer)" }
    $Model = if ($Printer.ModelName) { " $($Printer.ModelName)" } else { "" }
    Write-PugLine "  - $($Name)$($Model): $Connected"
  }

  if ($Summary.Count -eq 0) {
    Write-PugLine ""
    Write-PugLine "DYMO Connect answered, but no LabelWriter printer was returned."
    Write-PugLine "Next steps: connect and power on the LabelWriter, then open DYMO Connect once."
  } elseif ($Summary.ConnectedCount -eq 0) {
    Write-PugLine ""
    Write-PugLine "DYMO Connect answered, but no LabelWriter printer is connected."
    Write-PugLine "Next steps: check USB/power, load labels, and confirm the printer appears in DYMO Connect."
  }
}

function Wait-DymoEndpoint {
  param(
    [string]$Url,
    [int]$TimeoutSeconds,
    [int]$StartupWaitSeconds
  )

  $Deadline = (Get-Date).AddSeconds([Math]::Max(1, $StartupWaitSeconds))
  $LastResult = $null

  do {
    $LastResult = Invoke-DymoGetPrinters -Url $Url -TimeoutSeconds $TimeoutSeconds
    if ($LastResult.Ok) {
      return $LastResult
    }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $Deadline)

  return $LastResult
}

function Write-DymoNotInstalledNextSteps {
  param([string]$Url)

  Write-PugLine ""
  Write-PugLine "DYMO Connect was not found on this PC."
  Write-PugLine "Next steps:"
  Write-PugLine "1. Download and install DYMO Connect for Desktop from the DYMO support/downloads page."
  Write-PugLine "2. Connect and power on the DYMO LabelWriter 550 Turbo."
  Write-PugLine "3. Open DYMO Connect once and allow any Windows Firewall prompt."
  Write-PugLine "4. Rerun this script."
  Write-PugLine "5. The local service should answer here: $Url"
}

function Write-DymoDetectedButUnavailableSteps {
  param(
    [string]$Url,
    [string]$ErrorMessage
  )

  Write-PugLine ""
  Write-PugLine "DYMO Connect appears to be installed, but the local printing service did not answer."
  if ($ErrorMessage) {
    Write-PugLine "Last check: $ErrorMessage"
  }
  Write-PugLine "Next steps:"
  Write-PugLine "1. Open DYMO Connect from the Windows Start menu."
  Write-PugLine "2. Confirm the LabelWriter is connected, powered on, and visible in DYMO Connect."
  Write-PugLine "3. Allow DYMO Connect through Windows Firewall or endpoint security if prompted."
  Write-PugLine "4. Restart Windows if the DYMO service is stuck."
  Write-PugLine "5. Rerun this script and confirm this URL answers: $Url"
}

Write-PugLine "Checking DYMO Connect local printing service for The Pug label printing..."
Write-PugLine "Endpoint: $DymoPrintersUrl"

$InitialResult = Invoke-DymoGetPrinters -Url $DymoPrintersUrl -TimeoutSeconds $TimeoutSeconds
if ($InitialResult.Ok) {
  Write-DymoEndpointResult -Url $DymoPrintersUrl -Result $InitialResult
  exit 0
}

Write-PugLine "DYMO endpoint did not answer yet: $($InitialResult.Error)"

$Services = @(Get-DymoServices)
$Processes = @(Get-DymoProcesses)
$InstallRecords = @(Get-DymoInstallRecords)
$LaunchTargets = @(Get-DymoLaunchTargets -InstallRecords $InstallRecords)
$DymoDetected = ($Services.Count -gt 0 -or $Processes.Count -gt 0 -or $InstallRecords.Count -gt 0 -or $LaunchTargets.Count -gt 0)

if ($Services.Count -gt 0) {
  Write-PugLine "DYMO service candidates found:"
  foreach ($Service in $Services) {
    $Display = if ($Service.DisplayName) { $Service.DisplayName } else { $Service.Name }
    Write-PugLine "  - $Display [$($Service.State)]"
  }
}

if ($Processes.Count -gt 0) {
  Write-PugLine "DYMO process candidates found:"
  foreach ($Process in $Processes) {
    Write-PugLine "  - $($Process.ProcessName) (PID $($Process.Id))"
  }
}

if ($InstallRecords.Count -gt 0) {
  Write-PugLine "DYMO install records found:"
  foreach ($Record in $InstallRecords) {
    $Version = if ($Record.DisplayVersion) { " $($Record.DisplayVersion)" } else { "" }
    Write-PugLine "  - $($Record.DisplayName)$Version"
  }
}

if ($CheckOnly) {
  if (!$DymoDetected) {
    Write-DymoNotInstalledNextSteps -Url $DymoPrintersUrl
  } else {
    Write-DymoDetectedButUnavailableSteps -Url $DymoPrintersUrl -ErrorMessage $InitialResult.Error
  }
  exit 1
}

if ($Services.Count -gt 0) {
  Start-DymoServices -Services $Services | Out-Null
}

if ($LaunchTargets.Count -gt 0) {
  Start-DymoApplication -LaunchTargets $LaunchTargets | Out-Null
} elseif ($DymoDetected) {
  Write-PugLine "No DYMO Connect executable or shortcut was found to launch automatically."
}

if (!$DymoDetected) {
  Write-DymoNotInstalledNextSteps -Url $DymoPrintersUrl
  exit 1
}

Write-PugLine "Waiting for DYMO Connect local service to answer..."
$FinalResult = Wait-DymoEndpoint -Url $DymoPrintersUrl -TimeoutSeconds $TimeoutSeconds -StartupWaitSeconds $StartupWaitSeconds
if ($FinalResult.Ok) {
  Write-DymoEndpointResult -Url $DymoPrintersUrl -Result $FinalResult
  exit 0
}

Write-DymoDetectedButUnavailableSteps -Url $DymoPrintersUrl -ErrorMessage $FinalResult.Error
exit 1
