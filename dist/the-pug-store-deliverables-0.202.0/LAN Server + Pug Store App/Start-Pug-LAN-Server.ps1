$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
function Import-PugEnvFile {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) { return }
  Get-Content -LiteralPath $Path | ForEach-Object {
    $Line = $_.Trim()
    if (!$Line -or $Line.StartsWith('#') -or !$Line.Contains('=')) { return }
    $Parts = $Line.Split('=', 2)
    $Name = $Parts[0].Trim()
    $Value = $Parts[1].Trim().Trim('"')
    if ($Name) { [Environment]::SetEnvironmentVariable($Name, $Value, 'Process') }
  }
}
Import-PugEnvFile (Join-Path $Root 'local-sync.env')
$Zip = Join-Path $Root 'pug-lan-server.zip'
$ServerRoot = Join-Path $Root 'pug-lan-server'
if (!(Test-Path $ServerRoot)) {
  Expand-Archive -LiteralPath $Zip -DestinationPath $ServerRoot -Force
}
$Node = Get-Command node -ErrorAction SilentlyContinue
if (!$Node) { throw 'Node.js 22.13+ or Node.js 24+ is required for the Pug LAN server.' }
$env:LOCAL_SYNC_HOST = if ($env:LOCAL_SYNC_HOST) { $env:LOCAL_SYNC_HOST } else { '0.0.0.0' }
$env:LOCAL_SYNC_PORT = if ($env:LOCAL_SYNC_PORT) { $env:LOCAL_SYNC_PORT } else { '8787' }
$env:LOCAL_SYNC_DISCOVERY_PORT = if ($env:LOCAL_SYNC_DISCOVERY_PORT) { $env:LOCAL_SYNC_DISCOVERY_PORT } else { '8788' }
$env:PUG_LOCAL_SYNC_DB = if ($env:PUG_LOCAL_SYNC_DB) { $env:PUG_LOCAL_SYNC_DB } else { Join-Path $ServerRoot 'store-sync.sqlite' }
function Ensure-PugFirewallRule {
  param([string]$Name, [string]$Protocol, [string]$Port)
  try {
    if (-not (Get-Command New-NetFirewallRule -ErrorAction SilentlyContinue)) { return }
    $Existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
    if ($Existing) { return }
    New-NetFirewallRule -DisplayName $Name -Direction Inbound -Action Allow -Protocol $Protocol -LocalPort $Port | Out-Null
    Write-Host "Created firewall rule: $Name"
  } catch {
    Write-Warning "Could not create firewall rule '$Name'. If other PCs cannot connect, allow $Protocol port $Port inbound."
  }
}
Ensure-PugFirewallRule -Name 'Pug LAN Server HTTP 8787' -Protocol TCP -Port $env:LOCAL_SYNC_PORT
Ensure-PugFirewallRule -Name 'Pug LAN Server Discovery 8788' -Protocol UDP -Port $env:LOCAL_SYNC_DISCOVERY_PORT
Set-Location $ServerRoot
node apps/local-sync-server/src/cli.mjs
