# Open Items

Created by JC Electronics

Project: The Pug Trading-Card Store Platform
Version: 0.203.2
Release date: 2026-07-18
Last updated: 2026-07-18
Document purpose: Transparent list of safe-for-production, blocked, and future enhancement items.
Audience: Owner, manager, support technician
## Open Items

| Item | Classification | Notes |
| --- | --- | --- |
| TopDeck event creation | Future enhancement | The documentation treats create-event support as future unless the provider endpoint and credentials are confirmed. |
| Square reader live capture | Requires hardware/account validation | The local connector supports Terminal scaffolding; production capture must be validated with the store reader and Square account. |
| Dymo label printing | Requires hardware validation | Barcode/label data is prepared; final print workflow must be verified on the in-store printer driver. |
| SMTP delivery | Requires mail provider validation | Event registration email is implemented through WordPress mail; live delivery depends on configured SMTP/mail transport. |
| Full production data import volume | Operational task | Large ScryDex pulls should be monitored through checkpoints, logs, and provider limits. |
