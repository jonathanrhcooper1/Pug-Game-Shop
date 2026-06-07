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
Offline device registration credential issuance now generates UUID device IDs,
one-time hex device tokens, SHA-256 token hashes, UTC issue/expiry timestamps,
and short audit fingerprints while keeping raw tokens and full hashes out of
audit payloads. Offline device registration service orchestration now keeps
the one-time token in the response path only, passes the full token hash only
to the planned insert path, and emits service audits that contain fingerprints
and component summaries rather than raw tokens or token hashes. The opt-in
registration route handler retains only that secret-free audit payload after a
controller dispatch; raw one-time tokens and full token hashes are not stored
in handler audit state. Pairing permission callback audits omit raw pairing
codes and record only a short fingerprint plus non-secret request metadata
after parser-backed validation.
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
Registered-device permission resolution can now fail closed when the opt-in
session update is stale or rejected, reducing the chance that a route trusts a
device row that changed between lookup and last-seen update.
Route-aware pull provider handoff resolves registered-device headers through
the same resolver path before explicitly injected pull reads and keeps missing
or mismatched device context fail-closed before change queries run. Default
route-connected reads and writes remain staging-gated.
Pull cursor advancement planning validates trusted device context and provider
change-set shapes before preparing future cursor rows, and keeps cursor writes
disabled until staging explicitly enables the write repository.
Pull cursor SQL planning validates the target table name, domain, timestamps,
row counts, row versions, and prepared arguments before emitting staged upsert
templates, and keeps execution deferred.
Pull cursor repository adaptation executes only prepared upsert templates from
accepted plans and remains outside default route wiring, so staged writes stay
explicit and route-connected cursor execution remains disabled.
Route-aware pull cursor advancement now resolves registered-device headers
before planning and invoking that repository, but it remains an explicitly
injected boundary and default route execution stays deferred.
Opt-in pull handler cursor advancement fails closed on rejected cursor results
or invalid provider returns, so staging cannot silently send pull data when an
explicit cursor write path rejects.
Staged pull route handler factory composition stays disabled by default and
requires explicit route execution enablement plus WordPress database
dependencies before route-aware reads or cursor writes can run in tests.
Offline push persistence SQL/repository staging validates planned queue and
conflict rows before prepared inserts execute, keeps raw request payloads inside
stored JSON fields rather than audit summaries, and remains outside default
route wiring so queue replay, conflict persistence, canonical mutations, and
route-connected writes stay disabled.
The planned permission callback adapter keeps raw bearer tokens inside the
resolver path and exposes only the redacted last resolution for future audit
logging.
Offline route registration readiness now requires explicitly injected
controller handlers, preventing default disabled controller callbacks from
becoming live routes when permission readiness metadata is staged.
Pairing permission callback construction can now be isolated from the
registered-device resolver, and registered-device pull/push callbacks still
fail closed unless that resolver is configured.
Unconfigured pairing permission adapters are no longer treated as route-ready;
they still deny direct calls but are not exposed by the permission factory.
The staged pairing route readiness planner reports handler and permission
configuration as inspection metadata only; it does not register live routes or
turn pairing writes on. Health and admin System Status expose that metadata to
authorized staff/admin users while keeping the default route handlerless,
permission-locked, and deferred.
The plan-only pairing authorizer accepts only configured SHA-256 pairing-code
hashes, manager/location allowlists, requested scopes allowed by device mode,
and unexpired UTC policy windows. Its audit payload intentionally exposes only
a short pairing-code fingerprint and policy counts, never raw pairing codes or
full hashes.
Offline pairing authorization settings follow the same rule: they normalize
stored SHA-256 hashes and policy metadata only, and raw pairing-code fields are
ignored during sanitization.
A settings-backed pairing authorizer factory now consumes only that sanitized
policy shape and falls closed if the settings provider fails.
The corresponding readiness summary exposes counts and configuration issue
codes only; raw pairing codes and full hashes stay out of health and admin
output.
Registered-device permission readiness exposes only dependency booleans,
configuration issue codes, registered-device route scope counts, and scope
names. It does not expose bearer tokens, token hashes, SQL text, prepared
arguments, or row data, and it does not enable live pull/push routes or
route-connected last-seen writes.
Registered-device sync handler readiness exposes only callback names, handler
counts, and deferred-state booleans. The staged pull/push handlers validate
request envelopes only; they do not execute queue replay, pull queries, cursor
advancement, last-seen writes, or route-connected database mutations.
Route-connected push processing requires an explicitly enabled staging factory,
registered-device authorization, injected server snapshots, and the staged
persistence repository. The default push route remains validation-only and
does not perform queue writes, conflict writes, canonical mutations, queue
replay, or live route registration.
Push server snapshot query planning validates allowlisted tables, selected
columns, lookup IDs, result keys, and deferred execution flags before emitting
prepared read templates. It does not execute snapshot reads, expose SQL
arguments in health/admin summaries, load repository rows, or mutate canonical
entities.
Push server snapshot repository loading is explicit-only: it executes prepared
templates through `$wpdb`, rejects malformed rows before push resolution, keeps
raw SQL out of health/admin summaries, and does not enable default
route-connected reads or canonical mutations.
Route-aware push snapshot provider composition receives only the authenticated
registered-device row and server timestamp from the staged push route provider,
then delegates to the allowlisted repository. It remains explicit-only and does
not enable default public route reads, queue replay, or canonical mutations.
Route-aware push operation-options composition reads only parsed operation
payload fields, normalizes event payment status against an allowlist, rejects
array/object or unsupported statuses, and does not expose SQL, customer data,
payment credentials, or provider secrets. It remains explicit-only and does not
enable default route execution, external provider queue workers, or canonical
mutations.
Existing push operation-row query planning is also allowlist-only: it targets
the `tcg_offline_sync_queue` table, selects fixed queue/result columns,
validates offline device IDs, table prefixes, and client operation IDs, and
returns prepared SQL templates without executing route-connected reads or
logging raw queue payloads.
Existing push operation-row repository loading executes only those prepared
templates when explicitly called in staging tests. It validates device IDs,
operation IDs, timestamps, row versions, and result-details JSON before
returning replay candidates, rejects duplicate or malformed rows, and keeps
default route reads, queue replay, raw queue payload logs, and canonical
mutations disabled.
Route-aware existing operation-row provider composition receives only the
authenticated registered-device row from explicitly enabled staged push
processing before calling that repository. It fails closed on missing device
context or rejected repository reads and keeps default route execution, live
route registration, queue replay workers, raw queue payload logs, and canonical
mutations disabled.
Staged replay metadata exposes only counts and client operation IDs that are
already part of the offline operation envelope. It does not expose raw queue
payload JSON, SQL templates, prepared arguments, bearer tokens, payment data,
or customer credit details.
Per-operation staged push persistence annotations expose only inserted/replayed
status derived from client operation IDs already present in the response. They
do not expose queue payload JSON, SQL templates, prepared arguments, bearer
tokens, payment data, customer credit details, or raw database row contents.
Replay response hydration uses only stored result status, result code, result
details, and resolved timestamp from normalized queue rows. It does not expose
raw operation payload JSON, SQL templates, prepared arguments, bearer tokens,
payment data, customer credit details, or raw database row contents.
Canonical mutation planning exposes only future write descriptors for accepted
operations and skip metadata for conflict/rejected operations. It does not
execute inventory, event, TopDeck, or credit-ledger writes, and it keeps route
execution, queue replay, and production route registration disabled.
The staged pull response handler returns contract-shaped empty domain responses
by default and exposes only deferred-state metadata. Injected change-set
providers fail closed on exceptions, and the handler still avoids SQL, cursor
writes, queue replay, last-seen writes, and route-connected database mutation.
The pull change-query planner exposes only table names, allowlisted columns,
payload fields, request cursors, and device-scoped conflict filters for future
repositories. It rejects invalid table prefixes and unsupported domains before
any SQL execution path exists.
Health/admin pull query readiness exposes only supported domain names and
deferred-state booleans; trusted device context handoff, SQL execution,
tombstone reads, and cursor advancement remain disabled.
Pull change-query SQL planning validates those table, column, filter, order,
cursor, and limit contracts before returning prepared templates. It still
does not execute SQL, parse opaque cursors into filters, read tombstones,
advance cursors, or enable route-connected writes.
Pull change repository adaptation executes prepared plans only when explicitly
called, validates/normalizes rows before returning pull change sets, and keeps
repository audits limited to counts, statuses, domain metadata, and deferred
flags. It does not expose row payloads in audits or enable route-connected
execution, cursor advancement, tombstone reads, or writes.
Pull change-set provider composition requires explicit registered-device
context before query planning and repository fetches occur. Provider readiness
reports only dependency/context booleans and deferred flags, and the provider
is not wired into default routes.
Pull device context planning accepts only authorized registered-device
permission resolutions scoped to `offline_pull`, matches the authenticated
device ID to the pull request, and keeps token material out of audits. Route
handoff remains deferred.
Route-connected staged push planning runs canonical mutation planning only
after persistence planning identifies replayed operations. Those replayed IDs
are skipped with `operation_replayed` so duplicate pushes cannot plan duplicate
canonical writes, and canonical entity mutations remain disabled.
Canonical mutation SQL-template planning remains inspection-only. It validates
table contracts, identifiers, row versions, deferred flags, and guard metadata
before producing templates, and it keeps repository execution and canonical
entity writes disabled.
Route-connected staged push responses expose only canonical SQL counts,
operation IDs, prepare-argument counts, and deferred execution/repository
flags. Replayed operations produce zero SQL templates, and no route-connected
canonical repository executes from this metadata.
The deferred canonical mutation repository scaffold reports only repository
status, operation IDs, prepare-argument counts, zero affected rows, and deferred
execution flags. It does not execute inventory updates, event registration
writes, customer-credit ledger writes, TopDeck workers, queue replay workers,
or production route-connected mutations.
Route-connected staged push responses now expose that deferred repository
status and zero-row result metadata, but the repository still does not execute
canonical mutations or production route-connected writes.
The canonical mutation repository execution gate adds an explicit second
approval boundary after staging. Default route processing reports blocked
execution with block reasons and transaction-adapter deferral; it does not run
SQL writes, queue replay, TopDeck workers, or production route-connected
mutations.
Transaction preflight only classifies staged canonical query kinds and reports
deferred downstream write plans. It does not prepare, execute, or commit
canonical transaction SQL.
The staged registration handler factory reports only database, repository,
pairing policy, pairing authorizer, and configuration issue readiness. It does
not expose pairing codes, full hashes, one-time device tokens, or query SQL in
health/admin output, and it will not build a handler when the database provider
or hash-only policy is incomplete.
When injected into the offline device registration service, that authorization
must pass before one-time credentials are issued or the registration repository
is called.
The injected registration route handler surfaces the same denial as a 403
response without credential data, skips repository writes, and keeps raw
pairing codes out of both response and handler audit payloads.

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
