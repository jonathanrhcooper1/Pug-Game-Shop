# Security

## Principals

- Customer
- Kiosk device
- Staff user
- Manager user
- Administrator
- Developer/System service
- Offline staff/admin device
- External provider webhook

## Authorization

WordPress capabilities gate UI and REST actions:

`view_inventory`, `edit_inventory`, `create_inventory`, `delete_inventory`,
`print_labels`, `edit_prices`, `override_minimum_price`, `view_credit`,
`adjust_credit`, `redeem_credit`, `approve_buylist`, `manage_events`,
`sync_topdeck`, `manage_settings`, `view_reports`, and `resolve_conflicts`.

Capabilities can be location-scoped. Manager approval is a second authorization
event, not a boolean supplied by the employee request. Current local coverage
plans manager override row and audit payloads for accepted below-minimum sale
approvals, but live manager PIN/password reauthentication and writes remain
disabled until staging acceptance.

## Authentication

- WordPress UI: secure session cookie and REST nonce.
- Offline app: registered device token plus named staff login.
- Kiosk: device token restricted to public search, cart, buylist intake, event
  view/reserve, and limited customer lookup.
- Manager PIN/password: stored with `password_hash`; rate limited and audited.
- Below-minimum sale approvals: manager and employee must be distinct, and the
  reason is stored in the override row while audit payloads use a reason hash.
- External webhooks: provider signature and replay protection.

Device tokens are random high-entropy values. Only a hash and fingerprint are
stored server-side. Tokens are scoped, expiring, rotatable, and revocable.
Offline bearer-token authentication planning now normalizes request headers,
validates token shape, compares SHA-256 token hashes with `hash_equals`, and
delegates active/revoked/expired/scope checks to the shared device access
policy. Offline token lookup planning derives repository filters and short
audit fingerprints without retaining raw tokens. Offline session planning
prepares last-seen update rows and session context after an accepted device row
match. Registered-device permission planning now exposes lookup-needed, denied,
and authorized callback outcomes while keeping token hashes and raw tokens out
of audit payloads. Registered device row normalization validates future
repository rows without exposing token hashes in audit payloads. Registered
device lookup-query planning derives selected columns and active/revocation/
expiry filters from token lookup plans without exposing raw tokens in audit
payloads. Permission planning now carries lookup-query summaries without
exposing token hashes in permission audits. Registered-device lookup query
building validates table prefixes and whitelisted query contracts before
producing prepared SQL metadata, and its audits expose counts rather than raw
tokens or token hashes. Registered-device repository adaptation keeps the full
token hash inside prepared arguments only, reports query and normalization
audits without raw tokens or token hashes, and rejects malformed rows before
auth/session planners consume them. Registered-device permission resolution
keeps raw tokens and full token hashes out of resolution audits while composing
repository-backed authorization and future session update planning. Live
permission callback wiring, route-connected last-seen database writes, and
route callback wiring remain staging-gated.
Offline session update query building validates table prefixes, public device
IDs, UTC timestamps, and optimistic row-version guards before a future
last-seen write can be enabled.
Offline session update repository adaptation only consumes the validated query
plan, keeps token secrets out of update audits, and reports stale writes
without exposing bearer-token material.

## Secret Storage

Preference order:

1. Environment or constants outside the database, such as `wp-config.php`.
2. Managed secret facility supplied by the host.
3. Encrypted database value using libsodium with a master key stored outside the
   database.

Plaintext API keys must not appear in Git, logs, REST responses, browser code,
database exports, or diagnostic bundles.

## Data Protection

- TLS is required for all remote traffic.
- No payment card data is stored.
- Public responses exclude attendee email, full phone, staff notes, cost,
  minimum price, cert data when configured private, provider secrets, and
  provider team IDs.
- Logs use structured allowlists rather than dumping requests.
- Customer lookup endpoints are rate limited and return minimal results.
- Kiosk screens display phone last four only after submission.
- Data exports are permissioned and audited.

## Input And Output

- REST routes define type, enum, length, and range schemas.
- SQL uses `$wpdb->prepare` or repository abstractions with placeholders.
- HTML is escaped at output.
- File uploads validate MIME from content, size, dimensions, extension, and
  storage path.
- Remote image fetching blocks private/link-local networks and enforces size and
  content limits to reduce SSRF risk.

## Audit

Audit records include request ID, actor, manager approver where relevant, device,
location, action, entity, before/after diff or hash, timestamp, and result.

Always audited:

- Inventory and minimum-price changes.
- Price overrides.
- Credit transactions, voids, and customer merges.
- Buylist approvals.
- Event and TopDeck actions.
- POS reconciliation.
- Offline conflict resolution.
- Settings, roles, devices, and secret rotation.

## WordPress And WooCommerce

- Declare supported PHP, WordPress, and WooCommerce versions.
- Use WooCommerce CRUD APIs for HPOS compatibility.
- Protect admin actions with nonces and capabilities.
- Kiosk users cannot access wp-admin.
- Disable directory listing and direct PHP execution in private upload/cache
  locations.
- Keep Action Scheduler handlers idempotent and permission-free only for
  internal queued payloads that were validated before enqueue.

## Threat Tests

- Cross-role authorization and insecure direct-object reference.
- CSRF, replay, token theft, and revoked device use.
- SQL injection, stored/reflected XSS, unsafe upload, and SSRF.
- Race conditions on reservations, credit, capacity, and manager overrides.
- Webhook signature/timestamp failures and duplicate delivery.
- Sensitive-data leakage in logs, exports, and error responses.
