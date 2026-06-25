param(
  [string]$OutputDirectory = (Join-Path ([Environment]::GetFolderPath("Desktop")) "Pug-Dymo-Diagnostics"),
  [string]$LanServerUrl = "",
  [string]$PrinterName = "",
  [int]$TimeoutSeconds = 6,
  [switch]$TryStartDymo,
  [switch]$TestPrint
)

$ErrorActionPreference = "Continue"

$DymoBaseUrls = @(
  "https://127.0.0.1:41951/DYMO/DLS/Printing",
  "https://localhost:41951/DYMO/DLS/Printing"
)

function New-PugDiagnosticReport {
  $Now = Get-Date

  [ordered]@{
    schema_version = 1
    tool = "Diagnose-Pug-Dymo-Printing.ps1"
    collected_at_utc = $Now.ToUniversalTime().ToString("o")
    collected_at_local = $Now.ToString("o")
    machine = [ordered]@{
      computer_name = $env:COMPUTERNAME
      user_name = $env:USERNAME
      user_domain = $env:USERDOMAIN
      is_admin = Test-IsAdmin
      powershell_version = $PSVersionTable.PSVersion.ToString()
      os_caption = ""
      os_version = ""
      os_architecture = ""
    }
    inputs = [ordered]@{
      output_directory = $OutputDirectory
      lan_server_url_provided = -not [string]::IsNullOrWhiteSpace($LanServerUrl)
      printer_name_filter = $PrinterName
      timeout_seconds = $TimeoutSeconds
      try_start_dymo = [bool]$TryStartDymo
      test_print = [bool]$TestPrint
    }
    findings = New-Object System.Collections.ArrayList
    windows = [ordered]@{}
    dymo = [ordered]@{}
    app = [ordered]@{}
    lan_server = [ordered]@{}
    summary = [ordered]@{}
  }
}

function Test-IsAdmin {
  try {
    $Identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $Principal = New-Object Security.Principal.WindowsPrincipal($Identity)
    return $Principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch {
    return $false
  }
}

function Add-Finding {
  param(
    $Report,
    [string]$Severity,
    [string]$Code,
    [string]$Message,
    [string]$NextStep = ""
  )

  [void]$Report.findings.Add([ordered]@{
    severity = $Severity
    code = $Code
    message = $Message
    next_step = $NextStep
  })
}

function Get-OsSummary {
  try {
    $Os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    return [ordered]@{
      caption = [string]$Os.Caption
      version = [string]$Os.Version
      architecture = [string]$Os.OSArchitecture
      last_boot = if ($Os.LastBootUpTime) { ([datetime]$Os.LastBootUpTime).ToString("o") } else { "" }
    }
  } catch {
    return [ordered]@{
      caption = ""
      version = ""
      architecture = ""
      last_boot = ""
      error = $_.Exception.Message
    }
  }
}

function Get-NetworkSummary {
  try {
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -ne "127.0.0.1" } |
      ForEach-Object {
        [ordered]@{
          interface = [string]$_.InterfaceAlias
          ip_address = [string]$_.IPAddress
          prefix_length = [int]$_.PrefixLength
        }
      }
  } catch {
    @([ordered]@{ error = $_.Exception.Message })
  }
}

function Get-PrinterSummary {
  $Printers = @()

  try {
    if (Get-Command Get-Printer -ErrorAction SilentlyContinue) {
      $Printers = Get-Printer -ErrorAction Stop | ForEach-Object {
        [ordered]@{
          name = [string]$_.Name
          driver_name = [string]$_.DriverName
          port_name = [string]$_.PortName
          printer_status = [string]$_.PrinterStatus
          type = [string]$_.Type
          shared = [bool]$_.Shared
          published = [bool]$_.Published
          work_offline = if ($null -ne $_.WorkOffline) { [bool]$_.WorkOffline } else { $null }
          default = if ($null -ne $_.Default) { [bool]$_.Default } else { $null }
        }
      }
    } else {
      $Printers = Get-CimInstance Win32_Printer -ErrorAction Stop | ForEach-Object {
        [ordered]@{
          name = [string]$_.Name
          driver_name = [string]$_.DriverName
          port_name = [string]$_.PortName
          printer_status = [string]$_.PrinterStatus
          type = "Win32_Printer"
          shared = [bool]$_.Shared
          published = $null
          work_offline = [bool]$_.WorkOffline
          default = [bool]$_.Default
        }
      }
    }
  } catch {
    return [ordered]@{
      status = "error"
      error = $_.Exception.Message
      printers = @()
      dymo_printers = @()
    }
  }

  $DymoPrinters = @($Printers | Where-Object {
    $_.name -match "(?i)dymo|labelwriter" -or $_.driver_name -match "(?i)dymo|labelwriter"
  })

  [ordered]@{
    status = "ok"
    printer_count = @($Printers).Count
    dymo_printer_count = @($DymoPrinters).Count
    printers = @($Printers)
    dymo_printers = @($DymoPrinters)
  }
}

function Get-ServiceSummary {
  try {
    $Spooler = Get-Service -Name Spooler -ErrorAction SilentlyContinue
    $DymoServices = Get-CimInstance Win32_Service -ErrorAction Stop | Where-Object {
      $_.Name -match "(?i)dymo" -or $_.DisplayName -match "(?i)dymo" -or $_.PathName -match "(?i)dymo"
    } | ForEach-Object {
      [ordered]@{
        name = [string]$_.Name
        display_name = [string]$_.DisplayName
        state = [string]$_.State
        start_mode = [string]$_.StartMode
        path_name = [string]$_.PathName
      }
    }

    [ordered]@{
      status = "ok"
      print_spooler = if ($Spooler) {
        [ordered]@{
          name = $Spooler.Name
          status = [string]$Spooler.Status
          can_stop = [bool]$Spooler.CanStop
        }
      } else {
        [ordered]@{ name = "Spooler"; status = "not_found"; can_stop = $false }
      }
      dymo_services = @($DymoServices)
      dymo_service_count = @($DymoServices).Count
    }
  } catch {
    [ordered]@{
      status = "error"
      error = $_.Exception.Message
      print_spooler = $null
      dymo_services = @()
      dymo_service_count = 0
    }
  }
}

function Get-ProcessSummary {
  try {
    $Processes = Get-Process -ErrorAction SilentlyContinue | Where-Object {
      $_.ProcessName -match "(?i)dymo" -or $_.Path -match "(?i)dymo"
    } | ForEach-Object {
      [ordered]@{
        name = [string]$_.ProcessName
        id = [int]$_.Id
        path = [string]$_.Path
        started = try { $_.StartTime.ToString("o") } catch { "" }
      }
    }

    [ordered]@{
      status = "ok"
      dymo_process_count = @($Processes).Count
      dymo_processes = @($Processes)
    }
  } catch {
    [ordered]@{
      status = "error"
      error = $_.Exception.Message
      dymo_process_count = 0
      dymo_processes = @()
    }
  }
}

function Get-DymoInstallSummary {
  $RegistryRoots = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
  )
  $Records = @()

  foreach ($Root in $RegistryRoots) {
    try {
      $Records += Get-ItemProperty -Path $Root -ErrorAction SilentlyContinue | Where-Object {
        $_.DisplayName -match "(?i)dymo"
      } | ForEach-Object {
        [ordered]@{
          display_name = [string]$_.DisplayName
          display_version = [string]$_.DisplayVersion
          install_location = [string]$_.InstallLocation
          install_source = [string]$_.InstallSource
          publisher = [string]$_.Publisher
        }
      }
    } catch {
      # Keep registry discovery best effort.
    }
  }

  [ordered]@{
    status = "ok"
    install_record_count = @($Records).Count
    install_records = @($Records | Sort-Object display_name, display_version -Unique)
  }
}

function Start-DymoIfRequested {
  param([hashtable]$Report)

  if (-not $TryStartDymo) {
    return [ordered]@{ attempted = $false; started = $false; notes = @("Run with -TryStartDymo to attempt launching DYMO Connect.") }
  }

  $Notes = New-Object System.Collections.ArrayList
  $Started = $false

  foreach ($Service in @($Report.windows.services.dymo_services)) {
    if ($Service.state -ne "Running" -and $Service.start_mode -ne "Disabled") {
      try {
        Start-Service -Name $Service.name -ErrorAction Stop
        [void]$Notes.Add("Started service $($Service.name).")
        $Started = $true
      } catch {
        [void]$Notes.Add("Could not start service $($Service.name): $($_.Exception.Message)")
      }
    }
  }

  $CandidateRoots = @(
    (Join-Path $env:ProgramFiles "DYMO"),
    (if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} "DYMO" } else { "" }),
    (if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Programs\DYMO Connect" } else { "" })
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  $LaunchTarget = $null
  foreach ($Root in $CandidateRoots) {
    try {
      $LaunchTarget = Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match "^(DYMOConnect|DYMO Connect|DYMO\.DLS\.Printing\.Host|DYMO\.WebApi\.Win\.Host)\.exe$" } |
        Select-Object -First 1
      if ($LaunchTarget) { break }
    } catch {
      # Best effort.
    }
  }

  if ($LaunchTarget) {
    try {
      Start-Process -FilePath $LaunchTarget.FullName -WindowStyle Minimized | Out-Null
      [void]$Notes.Add("Launched $($LaunchTarget.FullName).")
      $Started = $true
      Start-Sleep -Seconds 3
    } catch {
      [void]$Notes.Add("Could not launch $($LaunchTarget.FullName): $($_.Exception.Message)")
    }
  } else {
    [void]$Notes.Add("No DYMO Connect executable was found to launch automatically.")
  }

  [ordered]@{
    attempted = $true
    started = $Started
    notes = @($Notes)
  }
}

function Invoke-LocalHttp {
  param(
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$FormFields = $null
  )

  $PreviousCertificateCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
  $Stopwatch = [Diagnostics.Stopwatch]::StartNew()
  $Response = $null
  $Reader = $null
  $BodyText = ""

  try {
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

    $Request = [System.Net.WebRequest]::Create($Url)
    $Request.Method = $Method
    $Request.Timeout = [Math]::Max(1, $TimeoutSeconds) * 1000
    $Request.Accept = "text/plain,application/xml,text/xml,application/json,*/*"

    if ($FormFields) {
      $Pairs = @()
      foreach ($Key in $FormFields.Keys) {
        $Pairs += [System.Uri]::EscapeDataString([string]$Key) + "=" + [System.Uri]::EscapeDataString([string]$FormFields[$Key])
      }
      $BodyBytes = [Text.Encoding]::UTF8.GetBytes(($Pairs -join "&"))
      $Request.ContentType = "application/x-www-form-urlencoded; charset=utf-8"
      $Request.ContentLength = $BodyBytes.Length
      $Stream = $Request.GetRequestStream()
      $Stream.Write($BodyBytes, 0, $BodyBytes.Length)
      $Stream.Dispose()
    }

    $Response = $Request.GetResponse()
    $Reader = New-Object IO.StreamReader($Response.GetResponseStream())
    $BodyText = $Reader.ReadToEnd()
    $Stopwatch.Stop()

    [ordered]@{
      ok = $true
      url = $Url
      method = $Method
      status_code = if ($Response.PSObject.Properties.Name -contains "StatusCode") { [int]$Response.StatusCode } else { 200 }
      content_type = [string]$Response.ContentType
      elapsed_ms = [int]$Stopwatch.ElapsedMilliseconds
      body_length = $BodyText.Length
      body_preview = $BodyText.Substring(0, [Math]::Min(5000, $BodyText.Length))
      error = ""
    }
  } catch [System.Net.WebException] {
    $Stopwatch.Stop()
    $StatusCode = 0
    $ContentType = ""
    if ($_.Exception.Response) {
      try {
        $StatusCode = [int]$_.Exception.Response.StatusCode
        $ContentType = [string]$_.Exception.Response.ContentType
        $Reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
        $BodyText = $Reader.ReadToEnd()
      } catch {
        $BodyText = ""
      }
    }

    [ordered]@{
      ok = $false
      url = $Url
      method = $Method
      status_code = $StatusCode
      content_type = $ContentType
      elapsed_ms = [int]$Stopwatch.ElapsedMilliseconds
      body_length = $BodyText.Length
      body_preview = $BodyText.Substring(0, [Math]::Min(5000, $BodyText.Length))
      error = $_.Exception.Message
    }
  } catch {
    $Stopwatch.Stop()
    [ordered]@{
      ok = $false
      url = $Url
      method = $Method
      status_code = 0
      content_type = ""
      elapsed_ms = [int]$Stopwatch.ElapsedMilliseconds
      body_length = 0
      body_preview = ""
      error = $_.Exception.Message
    }
  } finally {
    if ($Reader) { $Reader.Dispose() }
    if ($Response) { $Response.Close() }
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $PreviousCertificateCallback
  }
}

function Get-XmlValue {
  param([string]$Xml, [string]$TagName)

  $Match = [regex]::Match($Xml, "<$TagName>([\s\S]*?)</$TagName>", "IgnoreCase")
  if (!$Match.Success) { return "" }
  return [System.Net.WebUtility]::HtmlDecode($Match.Groups[1].Value).Trim()
}

function Parse-DymoPrinters {
  param([string]$Xml)

  $Matches = [regex]::Matches($Xml, "<LabelWriterPrinter>([\s\S]*?)</LabelWriterPrinter>", "IgnoreCase")
  $Printers = @()

  foreach ($Match in $Matches) {
    $PrinterXml = $Match.Groups[1].Value
    $Printers += [ordered]@{
      name = Get-XmlValue -Xml $PrinterXml -TagName "Name"
      model_name = Get-XmlValue -Xml $PrinterXml -TagName "ModelName"
      is_connected = (Get-XmlValue -Xml $PrinterXml -TagName "IsConnected").Equals("True", [StringComparison]::OrdinalIgnoreCase)
      is_local = (Get-XmlValue -Xml $PrinterXml -TagName "IsLocal").Equals("True", [StringComparison]::OrdinalIgnoreCase)
      is_twin_turbo = (Get-XmlValue -Xml $PrinterXml -TagName "IsTwinTurbo").Equals("True", [StringComparison]::OrdinalIgnoreCase)
    }
  }

  @($Printers)
}

function Get-DymoEndpointSummary {
  $EndpointChecks = New-Object System.Collections.ArrayList
  $ParsedPrinters = New-Object System.Collections.ArrayList

  foreach ($BaseUrl in $DymoBaseUrls) {
    foreach ($Action in @("StatusConnected", "GetPrinters", "Check")) {
      $Result = Invoke-LocalHttp -Url "$BaseUrl/$Action"
      [void]$EndpointChecks.Add($Result)

      if ($Action -eq "GetPrinters" -and $Result.ok) {
        foreach ($Printer in @(Parse-DymoPrinters -Xml $Result.body_preview)) {
          $PrinterWithSource = [ordered]@{
            source_url = $BaseUrl
            name = $Printer.name
            model_name = $Printer.model_name
            is_connected = $Printer.is_connected
            is_local = $Printer.is_local
            is_twin_turbo = $Printer.is_twin_turbo
          }
          [void]$ParsedPrinters.Add($PrinterWithSource)
        }
      }
    }
  }

  $UniquePrinters = @($ParsedPrinters | Sort-Object source_url, name -Unique)

  [ordered]@{
    status = "ok"
    endpoints = @($EndpointChecks)
    printer_count = @($UniquePrinters).Count
    connected_printer_count = @($UniquePrinters | Where-Object { $_.is_connected }).Count
    local_printer_count = @($UniquePrinters | Where-Object { $_.is_local }).Count
    printers = @($UniquePrinters)
  }
}

function Escape-Xml {
  param([string]$Value)

  return [Security.SecurityElement]::Escape($Value)
}

function Build-DymoTestLabelXml {
  param([string]$Barcode)

  $CleanBarcode = ($Barcode -replace "[^\x20-\x7e]", "-").Trim()
  if (!$CleanBarcode) { $CleanBarcode = "PUG-DYMO-TEST" }

  return @"
<?xml version="1.0" encoding="utf-8"?>
<DesktopLabel Version="1">
  <DYMOLabel Version="4">
    <Description>The Pug DYMO diagnostic label</Description>
    <Orientation>Landscape</Orientation>
    <LabelName>Small30336</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint><X>0.045</X><Y>0.035</Y></DYMOPoint>
      <Size><Width>2.035</Width><Height>0.93</Height></Size>
    </DYMORect>
    <BorderColor>
      <SolidColorBrush>
        <Color A="1" R="0" G="0" B="0"></Color>
      </SolidColorBrush>
    </BorderColor>
    <BorderThickness>0</BorderThickness>
    <Show_Border>False</Show_Border>
    <HasFixedLength>False</HasFixedLength>
    <FixedLengthValue>0</FixedLengthValue>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>
        <TextObject>
          <Name>DiagnosticText</Name>
          <Brushes><BackgroundBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"></Color></SolidColorBrush></BackgroundBrush><BorderBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></BorderBrush><StrokeBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></StrokeBrush><FillBrush><SolidColorBrush><Color A="0" R="0" G="0" B="0"></Color></SolidColorBrush></FillBrush></Brushes>
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <HorizontalAlignment>Left</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          <FitMode>AlwaysFit</FitMode>
          <FormattedText><FitMode>AlwaysFit</FitMode><HorizontalAlignment>Left</HorizontalAlignment><VerticalAlignment>Middle</VerticalAlignment><IsVertical>False</IsVertical><LineTextSpan><TextSpan><Text>The Pug DYMO Test</Text><FontInfo><FontName>Arial</FontName><FontSize>9</FontSize><IsBold>True</IsBold><IsItalic>False</IsItalic><IsUnderline>False</IsUnderline><FontBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></FontBrush></FontInfo></TextSpan></LineTextSpan></FormattedText>
          <ObjectLayout><DYMOPoint><X>0.06</X><Y>0.05</Y></DYMOPoint><Size><Width>1.95</Width><Height>0.22</Height></Size></ObjectLayout>
        </TextObject>
        <BarcodeObject>
          <Name>DiagnosticBarcode</Name>
          <Brushes><BackgroundBrush><SolidColorBrush><Color A="1" R="1" G="1" B="1"></Color></SolidColorBrush></BackgroundBrush><BorderBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></BorderBrush><StrokeBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></StrokeBrush><FillBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></FillBrush></Brushes>
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BarcodeFormat>Code128Auto</BarcodeFormat>
          <Data><DataString>$(Escape-Xml $CleanBarcode)</DataString></Data>
          <HorizontalAlignment>Center</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          <Size>AutoFit</Size>
          <TextPosition>Bottom</TextPosition>
          <FontInfo><FontName>Arial</FontName><FontSize>6</FontSize><IsBold>True</IsBold><IsItalic>False</IsItalic><IsUnderline>False</IsUnderline><FontBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></FontBrush></FontInfo>
          <ObjectLayout><DYMOPoint><X>0.08</X><Y>0.35</Y></DYMOPoint><Size><Width>1.94</Width><Height>0.52</Height></Size></ObjectLayout>
        </BarcodeObject>
      </LabelObjects>
    </DynamicLayoutManager>
  </DYMOLabel>
  <LabelApplication>The Pug Diagnostic</LabelApplication>
  <DataTable><Columns></Columns><Rows></Rows></DataTable>
</DesktopLabel>
"@
}

function Invoke-DymoTestPrint {
  param([object]$DymoSummary)

  if (-not $TestPrint) {
    return [ordered]@{ attempted = $false; status = "skipped"; message = "Run with -TestPrint to send one local DYMO diagnostic label." }
  }

  $Printer = $null
  if ($PrinterName) {
    $Printer = @($DymoSummary.printers | Where-Object { $_.name -eq $PrinterName }) | Select-Object -First 1
  }
  if (!$Printer) {
    $Printer = @($DymoSummary.printers | Where-Object { $_.is_connected -and $_.name -match "550|LabelWriter" }) | Select-Object -First 1
  }
  if (!$Printer) {
    $Printer = @($DymoSummary.printers | Where-Object { $_.name -match "550|LabelWriter" }) | Select-Object -First 1
  }
  if (!$Printer) {
    $Printer = @($DymoSummary.printers) | Select-Object -First 1
  }

  if (!$Printer) {
    return [ordered]@{ attempted = $true; status = "blocked"; message = "No DYMO printer was listed by GetPrinters, so no test print was sent." }
  }

  $BaseUrl = $Printer.source_url
  $LabelXml = Build-DymoTestLabelXml -Barcode ("PUG-DYMO-TEST-" + (Get-Date -Format "HHmmss"))
  $Fields = @{
    printerName = $Printer.name
    printParamsXml = "<LabelWriterPrintParams><Copies>1</Copies><JobTitle>The Pug DYMO Diagnostic</JobTitle><FlowDirection>LeftToRight</FlowDirection><PrintQuality>Text</PrintQuality></LabelWriterPrintParams>"
    labelXml = $LabelXml
    labelSetXml = ""
  }

  $PrintLabel = Invoke-LocalHttp -Url "$BaseUrl/PrintLabel" -Method "POST" -FormFields $Fields
  $PrintLabel2 = $null

  if (-not $PrintLabel.ok) {
    $PrintLabel2 = Invoke-LocalHttp -Url "$BaseUrl/PrintLabel2" -Method "POST" -FormFields $Fields
  }

  [ordered]@{
    attempted = $true
    selected_printer = $Printer.name
    selected_printer_connected_flag = $Printer.is_connected
    selected_service_url = $BaseUrl
    print_label = $PrintLabel
    print_label2 = $PrintLabel2
    status = if ($PrintLabel.ok -or ($PrintLabel2 -and $PrintLabel2.ok)) { "accepted" } else { "blocked" }
    message = if ($PrintLabel.ok -or ($PrintLabel2 -and $PrintLabel2.ok)) {
      "DYMO accepted the direct local test print."
    } else {
      "DYMO did not accept the direct local test print."
    }
  }
}

function Find-AppPrinterTargetStorage {
  $Roots = @(
    (Join-Path $env:LOCALAPPDATA "com.thepug.storeapp"),
    (Join-Path $env:APPDATA "com.thepug.storeapp"),
    (Join-Path $env:LOCALAPPDATA "Pug Store App"),
    (Join-Path $env:APPDATA "Pug Store App")
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  $Matches = New-Object System.Collections.ArrayList
  foreach ($Root in $Roots) {
    try {
      $Files = Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -le 5242880 } |
        Select-Object -First 300

      foreach ($File in $Files) {
        try {
          $Text = [IO.File]::ReadAllText($File.FullName)
          if ($Text -match "pug-label-printer-target|lan_server|this_pc|auto") {
            [void]$Matches.Add([ordered]@{
              path = $File.FullName
              contains_label_target_key = $Text.Contains("pug-label-printer-target")
              contains_auto = $Text.Contains("auto")
              contains_this_pc = $Text.Contains("this_pc")
              contains_lan_server = $Text.Contains("lan_server")
            })
          }
        } catch {
          # Ignore binary/unreadable files.
        }
      }
    } catch {
      # Ignore inaccessible app data roots.
    }
  }

  [ordered]@{
    searched_roots = @($Roots)
    match_count = @($Matches).Count
    matches = @($Matches)
    note = "If contains_lan_server is true, the app may have been set to LAN server only on this Windows profile."
  }
}

function Test-LanServer {
  if ([string]::IsNullOrWhiteSpace($LanServerUrl)) {
    return [ordered]@{ attempted = $false; message = "No LAN server URL was provided." }
  }

  $Base = $LanServerUrl.Trim().TrimEnd("/")
  [ordered]@{
    attempted = $true
    base_url = $Base
    health = Invoke-LocalHttp -Url "$Base/health"
    setup_status = Invoke-LocalHttp -Url "$Base/setup/status"
    dymo_printers_without_session = Invoke-LocalHttp -Url "$Base/labels/dymo/printers"
    note = "The labels endpoint may reject without a PIN session token; that is expected. Health/setup should still show whether the LAN server is reachable."
  }
}

function Write-TextReport {
  param($Report, [string]$Path)

  $Lines = New-Object System.Collections.ArrayList
  [void]$Lines.Add("The Pug DYMO Diagnostic Report")
  [void]$Lines.Add("Collected UTC: $($Report.collected_at_utc)")
  [void]$Lines.Add("Computer: $($Report.machine.computer_name)")
  [void]$Lines.Add("User: $($Report.machine.user_domain)\$($Report.machine.user_name)")
  [void]$Lines.Add("")
  [void]$Lines.Add("Summary")
  foreach ($Key in $Report["summary"].Keys) {
    [void]$Lines.Add("- ${Key}: $($Report["summary"][$Key])")
  }
  [void]$Lines.Add("")
  [void]$Lines.Add("Findings")
  if ($Report.findings.Count -eq 0) {
    [void]$Lines.Add("- No blocking findings generated.")
  } else {
    foreach ($Finding in $Report.findings) {
      [void]$Lines.Add("- [$($Finding.severity)] $($Finding.code): $($Finding.message)")
      if ($Finding.next_step) {
        [void]$Lines.Add("  Next: $($Finding.next_step)")
      }
    }
  }
  [void]$Lines.Add("")
  [void]$Lines.Add("DYMO Endpoint Checks")
  foreach ($Endpoint in $Report.dymo.endpoints.endpoints) {
    [void]$Lines.Add("- $($Endpoint.method) $($Endpoint.url) -> ok=$($Endpoint.ok) status=$($Endpoint.status_code) elapsed_ms=$($Endpoint.elapsed_ms) error=$($Endpoint.error)")
    if ($Endpoint.body_preview) {
      $Preview = [string]$Endpoint.body_preview
      $Preview = $Preview -replace "`r|`n", " "
      [void]$Lines.Add("  Preview: $Preview")
    }
  }
  [void]$Lines.Add("")
  [void]$Lines.Add("DYMO Printers From GetPrinters")
  foreach ($Printer in $Report.dymo.endpoints.printers) {
    [void]$Lines.Add("- $($Printer.name) model=$($Printer.model_name) connected=$($Printer.is_connected) local=$($Printer.is_local) source=$($Printer.source_url)")
  }
  [void]$Lines.Add("")
  [void]$Lines.Add("Windows DYMO Printers")
  foreach ($Printer in $Report.windows.printers.dymo_printers) {
    [void]$Lines.Add("- $($Printer.name) driver=$($Printer.driver_name) port=$($Printer.port_name) status=$($Printer.printer_status) offline=$($Printer.work_offline)")
  }
  [void]$Lines.Add("")
  [void]$Lines.Add("DYMO Test Print")
  [void]$Lines.Add(($Report.dymo.test_print | ConvertTo-Json -Depth 8))

  Set-Content -LiteralPath $Path -Value ($Lines -join "`r`n") -Encoding UTF8
}

function Complete-Report {
  param($Report)

  $ServiceReachable = @($Report.dymo.endpoints.endpoints | Where-Object { $_.url -match "/GetPrinters$" -and $_.ok }).Count -gt 0
  $DymoPrinterListed = $Report.dymo.endpoints.printer_count -gt 0
  $DymoConnected = $Report.dymo.endpoints.connected_printer_count -gt 0
  $WindowsDymoCount = $Report.windows.printers.dymo_printer_count
  $SpoolerRunning = $Report.windows.services.print_spooler.status -eq "Running"
  $TestPrintAccepted = $Report.dymo.test_print.status -eq "accepted"

  $Report["summary"] = [ordered]@{
    spooler_running = $SpoolerRunning
    windows_dymo_printer_count = $WindowsDymoCount
    dymo_connect_service_reachable = $ServiceReachable
    dymo_getprinters_printer_count = $Report.dymo.endpoints.printer_count
    dymo_getprinters_connected_count = $Report.dymo.endpoints.connected_printer_count
    direct_test_print_status = $Report.dymo.test_print.status
    app_label_target_storage_matches = $Report.app.label_printer_target_storage.match_count
    likely_root_cause = ""
  }

  if (-not $SpoolerRunning) {
    Add-Finding -Report $Report -Severity "error" -Code "print_spooler_not_running" -Message "Windows Print Spooler is not running." -NextStep "Start the Print Spooler service, then rerun this diagnostic."
  }
  if ($WindowsDymoCount -eq 0) {
    Add-Finding -Report $Report -Severity "error" -Code "windows_dymo_printer_missing" -Message "Windows does not list a DYMO/LabelWriter printer." -NextStep "Install DYMO Connect and confirm the LabelWriter appears in Windows Printers & scanners."
  }
  if (-not $ServiceReachable) {
    Add-Finding -Report $Report -Severity "error" -Code "dymo_local_service_unreachable" -Message "DYMO Connect local web service did not answer on 127.0.0.1 or localhost." -NextStep "Open DYMO Connect once, allow firewall prompts, or rerun this script with -TryStartDymo."
    $Report["summary"]["likely_root_cause"] = "DYMO Connect local web service is not reachable."
  } elseif (-not $DymoPrinterListed) {
    Add-Finding -Report $Report -Severity "error" -Code "dymo_getprinters_empty" -Message "DYMO Connect answered but returned no LabelWriter printers." -NextStep "Confirm the printer is plugged in, powered, loaded with labels, and visible inside DYMO Connect."
    $Report["summary"]["likely_root_cause"] = "DYMO Connect is reachable but does not list a printer."
  } elseif (-not $DymoConnected) {
    Add-Finding -Report $Report -Severity "warning" -Code "dymo_printer_listed_not_connected" -Message "DYMO Connect lists a printer, but reports IsConnected=False." -NextStep "Check USB/power/labels and run a DYMO Connect test print. The app now still attempts local print before LAN fallback."
    $Report["summary"]["likely_root_cause"] = "DYMO lists the printer but marks it disconnected."
  }
  if ($TestPrint -and -not $TestPrintAccepted) {
    Add-Finding -Report $Report -Severity "error" -Code "direct_dymo_test_print_blocked" -Message "The local DYMO API did not accept the direct test print." -NextStep "Open the JSON report and send the print_label/print_label2 status and error details back to Codex."
    if (-not $Report["summary"]["likely_root_cause"]) {
      $Report["summary"]["likely_root_cause"] = "Direct local print request was rejected."
    }
  }
  if (-not $Report["summary"]["likely_root_cause"]) {
    $Report["summary"]["likely_root_cause"] = if ($TestPrintAccepted) {
      "Local DYMO path accepted the diagnostic print; app setting/build/version should be checked next."
    } else {
      "No hard failure found without -TestPrint; run again with -TestPrint for the final print request result."
    }
  }
}

$Report = New-PugDiagnosticReport
$Os = Get-OsSummary
$Report.machine.os_caption = $Os.caption
$Report.machine.os_version = $Os.version
$Report.machine.os_architecture = $Os.architecture
$Report.windows.os = $Os
$Report.windows.network = @(Get-NetworkSummary)
$Report.windows.printers = Get-PrinterSummary
$Report.windows.services = Get-ServiceSummary
$Report.windows.processes = Get-ProcessSummary
$Report.dymo.install = Get-DymoInstallSummary
$Report.dymo.start_attempt = Start-DymoIfRequested -Report $Report
$Report.dymo.endpoints = Get-DymoEndpointSummary
$Report.dymo.test_print = Invoke-DymoTestPrint -DymoSummary $Report.dymo.endpoints
$Report.app.label_printer_target_storage = Find-AppPrinterTargetStorage
$Report.lan_server = Test-LanServer
Complete-Report -Report $Report

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$RunDirectory = Join-Path $OutputDirectory "run-$Timestamp"
New-Item -ItemType Directory -Force -Path $RunDirectory | Out-Null

$JsonPath = Join-Path $RunDirectory "pug-dymo-diagnostic-report.json"
$TextPath = Join-Path $RunDirectory "pug-dymo-diagnostic-summary.txt"
$ZipPath = Join-Path $OutputDirectory "pug-dymo-diagnostic-report-$Timestamp.zip"

$Report | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $JsonPath -Encoding UTF8
Write-TextReport -Report $Report -Path $TextPath
Compress-Archive -Path (Join-Path $RunDirectory "*") -DestinationPath $ZipPath -Force

Write-Host ""
Write-Host "The Pug DYMO diagnostic is complete."
Write-Host "Likely root cause: $($Report["summary"]["likely_root_cause"])"
Write-Host "Summary: $TextPath"
Write-Host "JSON:    $JsonPath"
Write-Host "ZIP:     $ZipPath"
Write-Host ""
Write-Host "Send Codex the ZIP path or paste the summary text. No connector secrets are collected."
