The Pug store deliverables

This package contains exactly three deliverables:
1. Pug Store App
2. LAN Server + Pug Store App
3. Kiosk Page

Recommended install order:
1. Open LAN Server + Pug Store App, install/verify the website ZIPs, then start the LAN server on the in-store host machine.
2. Install Pug Store App on staff stations.
3. Install Kiosk Page on customer-facing kiosk stations.

Connectivity:
- Pug Store App auto-discovers the LAN server over UDP pug-local-sync-discovery-v1 on port 8788.
- If auto-discovery is blocked, enter the LAN server URL manually, for example http://SERVER-IP:8787.
- WordPress remains the source of truth; the LAN server caches and queues while offline.

SQLite:
- The LAN server auto-creates or reuses store-sync.sqlite through Node built-in node:sqlite.
- The package does not include an existing SQLite database and does not install SQLite separately.

Final release gate:
Run npm.cmd run production:verify-active-syncs before signoff.

Documentation:
- See LAN Server + Pug Store App/documentation/release-package/README.md for owner, admin, staff, support, credential, and source-code handover guides.

Bundled app installer: Pug Store App-0.202.0.exe
Bundled kiosk installer: Pug Kiosk App-0.202.0.exe
