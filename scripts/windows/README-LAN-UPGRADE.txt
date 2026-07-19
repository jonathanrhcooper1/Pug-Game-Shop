THE PUG LAN SERVER UPGRADE 0.203.2

Existing server upgrade
1. Copy the complete "LAN Server + Pug Store App" folder to the LAN server.
2. Double-click Deploy-Pug-LAN-Server-Upgrade.cmd.
3. Approve the Windows administrator prompt.
4. Wait for "Upgrade complete" and keep the displayed report path.

The launcher automatically:
- detects the current installation from the "Pug LAN Server" startup task;
- stops only the matching Pug LAN server and Store App processes;
- preserves local-sync.env without printing or replacing its secrets;
- backs up the complete old server plus SQLite, WAL, and SHM files;
- verifies the SQLite backup SHA-256 before replacement;
- audits and replaces scanner-unsafe barcodes longer than 13 characters;
- preserves every inventory quantity while queuing WordPress, Square, and kiosk updates;
- installs the new Pug Store App, restores startup, and checks /health;
- restores the prior server and pre-migration database if the upgrade fails.

If auto-detection cannot find the installation, open an Administrator command
prompt in this folder and run:

  Deploy-Pug-LAN-Server-Upgrade.cmd -InstallRoot "C:\path\to\installed\Pug LAN Server"

For a new production server, create local-sync.env in the target folder first,
then run:

  Deploy-Pug-LAN-Server-Upgrade.cmd -AllowFreshInstall -InstallRoot "C:\ProgramData\The Pug\LAN Server"

PowerShell policy
The CMD wrapper uses a process-only ExecutionPolicy Bypass. It does not change
the computer's permanent policy. A domain AppLocker or MachinePolicy block must
be approved by the Windows administrator; the installer does not weaken it.

Square barcode behavior
Mapped Square variations keep their existing Square variation ID. Their SKU is
renamed to the new 13-character barcode during the next authenticated sync queue
delivery. Square credentials and PUG_SQUARE_LOCATION_ID must already exist in
the production server's local-sync.env. Unmapped rows are created normally by
the connector. Review the deployment report's square_renames_queued value.

Backups
Nothing in the timestamped install-root\backups\upgrade-* folder is deleted by
the installer. Keep that folder until WordPress, Square, kiosk, and Store App
readback have all been checked.
