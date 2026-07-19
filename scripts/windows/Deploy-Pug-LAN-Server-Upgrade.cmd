@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Deploy-Pug-LAN-Server-Upgrade.ps1" %*
set "PUG_EXIT=%ERRORLEVEL%"
if not "%PUG_EXIT%"=="0" (
  echo.
  echo The Pug LAN upgrade did not complete. Review the error above; the previous data and rollback backup were retained.
  pause
)
exit /b %PUG_EXIT%
