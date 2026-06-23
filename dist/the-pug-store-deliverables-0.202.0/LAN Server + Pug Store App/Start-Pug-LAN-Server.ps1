$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
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
Set-Location $ServerRoot
node apps/local-sync-server/src/cli.mjs
