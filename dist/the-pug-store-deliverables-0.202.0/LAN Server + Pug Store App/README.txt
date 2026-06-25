LAN Server + Pug Store App

Use this deliverable on the in-store host machine and any staff station that should connect to it.
Contents:
- pug-lan-server.zip for the LAN server source package.
- Pug Store App-0.202.0.exe for the Pug Store App installer.
- website/ contains the WordPress plugin and storefront theme ZIPs needed by the website endpoints.
- documentation/ contains the owner/admin/support handoff docs.

SQLite:
- The LAN server does not ship or install a SQLite database file.
- It requires Node 22.13+ or Node 24 with built-in node:sqlite.
- On startup it creates or reuses store-sync.sqlite unless LOCAL_SYNC_SQLITE_PATH or PUG_LOCAL_SYNC_DB points elsewhere.
- Use Start-Pug-LAN-Server-Hidden.vbs or Install-Pug-LAN-Server-Startup-Task.ps1 when you do not want a command prompt window visible.
- Use Deploy-Pug-LAN-Server-Patch.ps1 when updating the LAN server package on a different computer from this USB.

Connectivity:
- Allow inbound TCP 8787 and UDP 8788 through Windows Firewall.
- The Pug Store App auto-discovers the LAN server over UDP port 8788.
- If discovery is blocked, enter the LAN server URL manually, for example http://SERVER-IP:8787.
