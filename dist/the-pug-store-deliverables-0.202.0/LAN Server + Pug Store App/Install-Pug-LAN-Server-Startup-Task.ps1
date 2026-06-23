$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script = Join-Path $Root 'Start-Pug-LAN-Server-Hidden.vbs'
$Action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('"' + $Script + '"')
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
Register-ScheduledTask -TaskName 'Pug LAN Server' -Action $Action -Trigger $Trigger -Principal $Principal -Force
Write-Host 'Installed startup task: Pug LAN Server'
