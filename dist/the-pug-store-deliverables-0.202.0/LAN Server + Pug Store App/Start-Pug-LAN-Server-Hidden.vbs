Set shell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
command = "powershell.exe -ExecutionPolicy Bypass -NoProfile -File """ & scriptDir & "\Start-Pug-LAN-Server.ps1"""
shell.Run command, 0, False
