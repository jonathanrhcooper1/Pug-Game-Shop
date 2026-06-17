import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, extname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const version = packageJson.version
const releaseDate = "2026-06-17"
const lastUpdated = "2026-06-17"
const projectName = "The Pug Trading-Card Store Platform"
const creator = "Created by JC Electronics"

const releaseDir = resolve(root, "release-package")
const docsDir = resolve(root, "docs")
mkdirSync(releaseDir, { recursive: true })
mkdirSync(docsDir, { recursive: true })
mkdirSync(resolve(releaseDir, "env"), { recursive: true })

const modules = [
  ["WordPress website", "Public website, content pages, customer account links, and event pages.", "WordPress admin and active theme"],
  ["WooCommerce storefront", "Online catalog, cart, checkout, local pickup, product/order records, and payment gateway handoff.", "WooCommerce admin"],
  ["Trading-card inventory plugin", "Custom plugin for serialized inventory, ScryDex, customer credit, buylist, reports, REST APIs, and migrations.", "WordPress admin > TCG Store"],
  ["Serialized inventory", "One physical card equals one inventory row with its own SKU/barcode, status, location, and price floor.", "Inventory screens and REST API"],
  ["ScryDex integration", "Reference card/set/variant/price/image import, search, checkpointing, and graded-price enrichment.", "TCG Store > ScryDex Catalog"],
  ["Pricing engine", "Market price, suggested sale price, minimum sale price, daily repricing, and manager override tracking.", "Plugin pricing classes and inventory intake"],
  ["Customer credit", "Profile-bound local store credit ledger with immutable balance movements and audit history.", "Customers and reports"],
  ["Buylist/trade-in intake", "Customer sell-to-store offers, cash/credit payout lines, approval/decline/save workflows, and conversion to inventory.", "Local app trade-in screen and buylist tables"],
  ["Kiosk cart flow", "Customer-facing inventory lookup, cart hold, order submission, and staff fulfillment queue.", "Kiosk app and fulfillment APIs"],
  ["Offline/local app", "Employee app, kiosk mode, local queue, SQLite cache, LAN middleman, barcode scanning, and sync status.", "Apps and local sync server"],
  ["POS/payment connector", "Square Terminal scaffold, WooCommerce Square/GoDaddy Payments separation, and POS sale reconciliation.", "Local sync server and WooCommerce"],
  ["Events", "Local events, registration, waitlist, check-in, payment status, registration email, and optional external event linking.", "Events admin, shortcodes, REST API"],
  ["Reports/audit", "Manager reports, CSV exports, sync history, ledger, inventory, sales, fulfillment, and staff activity.", "Reports screens and REST API"],
  ["Deployment", "GitHub branch workflow, WordPress ZIP packages, local app installers, backups, and rollback notes.", "GitHub and hosting"],
]

const customTables = [
  ["tcg_schema_migrations", "Tracks database migration versions.", "MigrationRunner"],
  ["tcg_settings", "Stores plugin operational settings.", "Settings"],
  ["tcg_audit_log", "Records sensitive staff/system actions.", "AuditLogger, reports"],
  ["tcg_role_permissions", "Custom staff/manager/system permission map.", "RoleManager"],
  ["tcg_reference_sets", "ScryDex set/expansion reference data.", "ScryDex catalog"],
  ["tcg_reference_cards", "Reference card records and image/price anchors.", "ScryDex catalog, search"],
  ["tcg_reference_variants", "Card variants, finishes, and variant images.", "ScryDex catalog, search"],
  ["tcg_provider_price_observations", "Raw provider price observations and history.", "ScryDex pricing"],
  ["tcg_provider_price_points", "Normalized provider price points, including graded rows.", "Pricing/search"],
  ["tcg_inventory_locations", "Named inventory storage locations.", "Inventory"],
  ["tcg_inventory_items", "Serialized physical inventory rows.", "Inventory, WooCommerce, kiosk, POS"],
  ["tcg_inventory_movements", "Inventory movement/audit history.", "Inventory"],
  ["tcg_barcodes", "Barcode/SKU identity rows.", "Inventory labels"],
  ["tcg_price_change_log", "Sale price and repricing audit history.", "Pricing"],
  ["tcg_manager_overrides", "Manager override records and reasons.", "Overrides, reports"],
  ["tcg_reservations", "Cart/kiosk/order holds and expiry state.", "Reservations"],
  ["tcg_customers", "Customer profile and credit projection.", "Customers"],
  ["tcg_customer_contacts", "Customer lookup contact rows.", "Customers"],
  ["tcg_customer_notes", "Customer support notes.", "Customers"],
  ["tcg_customer_merge_log", "Duplicate customer merge history.", "Customers"],
  ["tcg_customer_credit_ledger", "Immutable store-credit ledger.", "Credit, reports"],
  ["tcg_buylist_submissions", "Trade-in/buylist parent record.", "Buylist"],
  ["tcg_buylist_items", "Trade-in/buylist line items.", "Buylist"],
  ["tcg_buylist_offers", "Offer totals and customer decisions.", "Buylist"],
  ["tcg_buylist_approvals", "Approval/override history.", "Buylist"],
  ["tcg_buylist_conversion_log", "Conversion of accepted items into inventory.", "Buylist, inventory"],
  ["tcg_sync_jobs", "Background sync job records.", "Sync"],
  ["tcg_sync_job_logs", "Sync job timeline messages.", "Sync"],
  ["tcg_sync_errors", "Sync failure details.", "Sync"],
  ["tcg_sync_checkpoints", "Pagination/resume checkpoints.", "ScryDex sync"],
  ["tcg_webhook_events", "Webhook delivery/audit records.", "Connectors"],
  ["tcg_offline_devices", "Registered local/offline devices.", "Offline sync"],
  ["tcg_offline_pull_cursors", "Per-device pull cursors.", "Offline sync"],
  ["tcg_offline_sync_queue", "Queued offline operations.", "Offline sync"],
  ["tcg_sync_conflicts", "Detected sync conflicts and resolution history.", "Offline sync"],
  ["tcg_payment_fee_snapshots", "Payment fee estimates/snapshots.", "Payments"],
  ["tcg_payment_provider_log", "Payment provider audit log.", "Payments"],
  ["tcg_pos_sync_log", "POS sale/refund/inventory sync log.", "POS"],
  ["tcg_events", "Local event records.", "Events"],
  ["tcg_event_templates", "Reusable event setup templates.", "Events"],
  ["tcg_event_registrations", "Player registrations and payment/check-in state.", "Events"],
  ["tcg_event_waitlist", "Waitlist positions.", "Events"],
  ["tcg_event_checkins", "Player check-in records.", "Events"],
  ["tcg_event_registration_logs", "Registration/check-in audit log.", "Events"],
]

const routeGroups = [
  ["Health", "GET", "/wp-json/tcg-store/v1/health", "Authenticated diagnostic status for scheduler, routes, providers, and dependency readiness."],
  ["Connector manifest", "GET", "/wp-json/tcg-store/v1/offline/connector-manifest", "Read-only manifest for local app pairing; never returns secrets."],
  ["Offline device", "POST", "/wp-json/tcg-store/v1/offline/devices", "Registers or validates a local/offline device when pairing is enabled."],
  ["Offline pull", "GET", "/wp-json/tcg-store/v1/offline/pull", "Pulls inventory, settings, customers, events, and conflict changes by cursor."],
  ["Offline push", "POST", "/wp-json/tcg-store/v1/offline/push", "Receives queued app operations with idempotency and conflict detection."],
  ["Conflict resolution", "POST", "/wp-json/tcg-store/v1/offline/conflicts/{id}/resolve", "Manager/system conflict resolution route."],
  ["Inventory search", "GET", "/wp-json/tcg-store/v1/inventory/search", "Searches reference and sellable inventory by card, game, set, type, and status."],
  ["Inventory intake", "POST", "/wp-json/tcg-store/v1/inventory/intake", "Creates serialized inventory rows and optional WooCommerce product sync."],
  ["Inventory sale", "POST", "/wp-json/tcg-store/v1/inventory/{inventory_id}/mark-sold", "Marks exact serialized item sold after payment/POS confirmation."],
  ["Customer upsert", "POST", "/wp-json/tcg-store/v1/customers", "Creates or updates customer profiles and contact lookup data."],
  ["Customer credit", "GET/POST", "/wp-json/tcg-store/v1/customers/{id}/credit", "Reads balance/ledger and posts authorized credit movements."],
  ["Kiosk order", "POST", "/wp-json/tcg-store/v1/kiosk/orders", "Creates kiosk pickup order with inventory holds."],
  ["Fulfillment", "GET/POST", "/wp-json/tcg-store/v1/fulfillment/orders", "Reads and updates local pickup order fulfillment state."],
  ["Events", "GET/POST", "/wp-json/tcg-store/v1/events", "Lists, creates, and updates local events where staff routes are enabled."],
  ["Event registration", "POST", "/wp-json/tcg-store/v1/events/{slug}/registrations", "Registers a player, sends confirmation email, and handles waitlist/payment state."],
  ["Event check-in", "POST", "/wp-json/tcg-store/v1/events/{event_id}/checkins", "Checks in registered players."],
  ["Reports", "GET", "/wp-json/tcg-store/v1/reports/{report}", "Manager-only report pull for app/admin dashboards."],
  ["ScryDex status", "GET", "/wp-json/tcg-store/v1/scrydex/catalog/status", "Catalog counts, coverage, and checkpoint status."],
  ["ScryDex index", "POST", "/wp-json/tcg-store/v1/scrydex/catalog/index", "Runs guarded manual catalog indexing by game/set/page."],
  ["ScryDex export", "GET", "/wp-json/tcg-store/v1/scrydex/catalog/export", "Paginated export of reference catalog tables."],
  ["Payment fee snapshot", "POST", "/wp-json/tcg-store/v1/pos-payments/fee-snapshot", "Stores payment fee estimate/snapshot for reconciliation."],
]

const credentials = [
  ["WordPress administrator", "WordPress", "Production/Staging", "WordPress user account", "Password manager", "N/A", "Administrator", "Store owner"],
  ["Hosting control panel", "GoDaddy Managed WordPress", "Production/Staging", "Hosting login", "Password manager", "N/A", "Owner/admin", "Store owner"],
  ["SSH/SFTP deployment", "Hosting", "Production/Staging", "SSH password or key", "Password manager", "PUG_PROD_SSH_HOST, PUG_PROD_SSH_USER, PUG_PROD_SSH_PASSWORD", "Deploy only", "JC Electronics/support"],
  ["Database user", "MySQL/MariaDB", "Production/Staging", "Database password", "Hosting vault", "DB_NAME, DB_USER, DB_PASSWORD, DB_HOST", "Database read/write", "Hosting owner"],
  ["WordPress application password", "WordPress REST", "Production/Staging", "Application password", "Password manager", "PUG_WORDPRESS_USERNAME, PUG_WORDPRESS_APP_PASSWORD", "Least privilege app user", "Store owner/support"],
  ["ScryDex API key", "ScryDex", "Production", "API key", "WordPress settings or local env", "SCRYDEX_API_KEY, SCRYDEX_SECONDARY_API_KEY, SCRYDEX_TEAM_ID", "Catalog/pricing API", "Store owner"],
  ["Square access token", "Square", "Sandbox/Production", "OAuth/token", "Password manager and local env", "PUG_SQUARE_ACCESS_TOKEN, SQUARE_ACCESS_TOKEN", "Payments/POS", "Store owner"],
  ["GoDaddy Payments credentials", "GoDaddy Payments", "Production/Sandbox", "Gateway credentials", "WooCommerce settings", "Gateway settings fields", "Payment gateway", "Store owner"],
  ["TopDeck API key", "TopDeck", "Production/Sandbox", "API key", "Password manager", "TOPDECK_API_KEY", "Event connector", "Store owner"],
  ["SMTP credentials", "Email provider", "Production", "SMTP user/password", "Password manager or SMTP plugin", "SMTP_HOST, SMTP_USER, SMTP_PASSWORD", "Transactional email", "Store owner"],
  ["Webhook signing secrets", "Square/TopDeck/other webhooks", "Production/Sandbox", "Signing secret", "Password manager", "SQUARE_WEBHOOK_SIGNATURE_KEY, TOPDECK_WEBHOOK_SECRET", "Webhook verification", "Store owner/support"],
  ["Offline app pairing token", "Local sync", "Local", "Pairing code/token", "WordPress settings/local vault", "PUG_OFFLINE_PAIRING_CODE", "Device registration", "Store manager"],
  ["Kiosk token", "Kiosk", "Local", "Device token", "Local secure storage", "KIOSK_DEVICE_TOKEN", "Kiosk access", "Store manager"],
  ["App signing key", "Windows app build", "Release", "Code signing key", "Secure certificate vault", "WINDOWS_CERTIFICATE_PASSWORD", "Release signing", "JC Electronics/support"],
]

const openItems = [
  ["TopDeck event creation", "Future enhancement", "The documentation treats create-event support as future unless the provider endpoint and credentials are confirmed."],
  ["Square reader live capture", "Requires hardware/account validation", "The local connector supports Terminal scaffolding; production capture must be validated with the store reader and Square account."],
  ["Dymo label printing", "Requires hardware validation", "Barcode/label data is prepared; final print workflow must be verified on the in-store printer driver."],
  ["SMTP delivery", "Requires mail provider validation", "Event registration email is implemented through WordPress mail; live delivery depends on configured SMTP/mail transport."],
  ["Full production data import volume", "Operational task", "Large ScryDex pulls should be monitored through checkpoints, logs, and provider limits."],
]

function header(title, purpose, audience) {
  return [
    `# ${title}`,
    "",
    creator,
    "",
    `Project: ${projectName}`,
    `Version: ${version}`,
    `Release date: ${releaseDate}`,
    `Last updated: ${lastUpdated}`,
    `Document purpose: ${purpose}`,
    `Audience: ${audience}`,
    "",
  ].join("\n")
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, "<br>")).join(" | ")} |`),
    "",
  ].join("\n")
}

function section(title, body) {
  return `## ${title}\n\n${body.trim()}\n\n`
}

function list(items) {
  return items.map((item) => `- ${item}`).join("\n") + "\n"
}

function steps(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n") + "\n"
}

function credentialNotice() {
  return [
    "> Security notice: Real passwords, API keys, access tokens, SSH keys, payment keys, database passwords, and private credentials are not included in this documentation or repository. Use `SECURE_CREDENTIAL_HANDOFF.md` and `CREDENTIAL_INVENTORY_TEMPLATE.md` for secure transfer and rotation tracking.",
    "",
  ].join("\n")
}

function moduleSummaryTable() {
  return table(["Module", "Purpose", "Primary location"], modules)
}

function ownerSupportTable() {
  return table(
    ["Area", "Owner responsibility", "Support responsibility"],
    [
      ["Inventory", "Review intake, locations, price floors, and aging.", "Maintain plugin routes, migrations, search, and WooCommerce product sync."],
      ["ScryDex", "Confirm sync success and investigate failed pages.", "Rotate keys, diagnose provider errors, review checkpoints."],
      ["Customer credit", "Review liability and resolve disputes.", "Maintain immutable ledger, reports, and correction procedures."],
      ["Buylist", "Review totals, cash/credit payout, and accepted items.", "Maintain intake conversion and audit records."],
      ["Events", "Monitor registrations, check-ins, capacity, and email delivery.", "Maintain event REST routes, shortcodes, and optional provider adapters."],
      ["Payments/POS", "Reconcile WooCommerce, Square/POS, and store credit.", "Maintain connector settings and logs without storing payment secrets."],
      ["Offline app", "Watch queue and conflict screens during network issues.", "Maintain app build, local server, and sync queue handling."],
      ["Backups", "Confirm scheduled backups and pre-release backups.", "Run restore drills and document rollback points."],
    ],
  )
}

function architectureMermaid() {
  return [
    "~~~mermaid",
    "flowchart LR",
    "  Customer[Customer Browser] --> Woo[WooCommerce Storefront]",
    "  Kiosk[Customer Kiosk] --> LAN[LAN Middleman Server]",
    "  Staff[Employee App] --> LAN",
    "  LAN <--> WP[WordPress Plugin REST API]",
    "  Woo <--> WP",
    "  WP --> DB[(WordPress + Custom TCG Tables)]",
    "  WP <--> Scry[ScryDex API]",
    "  WP <--> Email[SMTP / WordPress Mail]",
    "  WP <--> Pay[WooCommerce Payment Gateways]",
    "  LAN <--> Square[Square Terminal / POS Adapter]",
    "  Events[Events Pages] --> WP",
    "  Reports[Manager Reports] --> WP",
    "~~~",
    "",
  ].join("\n")
}

function flowMermaid(name, lines) {
  return ["~~~mermaid", name, ...lines, "~~~", ""].join("\n")
}

function standardTroubleshooting() {
  return table(
    ["Issue", "Symptoms", "First checks", "Resolution"],
    [
      ["Website down", "Public pages fail to load.", "Hosting status, DNS, PHP error log, recent deployments.", "Restore from hosting backup or rollback theme/plugin after confirming order and credit data safety."],
      ["Checkout failing", "Cart cannot complete or payment error shown.", "Gateway mode, WooCommerce logs, payment plugin status.", "Switch to provider sandbox only for testing; never enter live keys in docs or logs."],
      ["Card search failing", "No card results or slow results.", "Reference table counts, ScryDex status, search route health.", "Resume failed pull, rebuild reference indexes, confirm API key status."],
      ["Images missing", "Card art blank on product/search/cart.", "Reference image URLs, uploads/cache, browser console.", "Run image sync, clear cache, verify provider URLs."],
      ["Reservation stuck", "Card held after abandoned cart.", "Reservation expiry job and `tcg_reservations` rows.", "Run expiry task, release stale holds after checking active orders."],
      ["POS sale not syncing", "Square/POS sale completed but website inventory unchanged.", "Local queue, POS sync log, exact inventory id.", "Replay queued sale or manually mark sold with audit note."],
      ["Credit mismatch", "Customer disputes balance.", "Ledger entries, order/buylist references, staff user.", "Post a manager correction entry; never edit old ledger rows silently."],
      ["Kiosk offline", "Kiosk cannot submit order.", "LAN server URL, UDP discovery, device token, queue depth.", "Enter middleman IP manually and allow queue to sync after reconnect."],
      ["Event registration email missing", "Player registered but no email received.", "SMTP plugin, WordPress mail log, spam folder.", "Correct SMTP settings and resend/confirm from event record where supported."],
      ["Migration failed", "Plugin activation or update reports database error.", "Migration logs, database permissions, backup availability.", "Restore pre-release backup if needed, then rerun migration after fixing permission/schema issue."],
    ],
  )
}

function credentialRows() {
  return credentials.map((row) => [...row, "Pending rotation date", "replace_with_secure_value"])
}

function writeDoc(path, content) {
  const absolute = resolve(root, path)
  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, content.replace(/\r?\n/g, "\n").trimEnd() + "\n", "utf8")
}

const sourceFiles = enumerateSourceFiles()
const sourceIndexRows = sourceFiles.map((path) => {
  const ext = extname(path)
  const purpose =
    path.includes("apps/wordpress-plugin/src/")
      ? "WordPress plugin source"
      : path.includes("apps/local-sync-server/src/")
        ? "LAN middleman server source"
        : path.includes("apps/offline-app/src/")
          ? "Offline app frontend source"
          : path.includes("apps/offline-app/src-tauri/")
            ? "Offline app Windows shell source"
            : path.includes("apps/storefront-theme-or-blocks/")
              ? "WordPress storefront theme source"
              : path.includes("scripts/")
                ? "Build/deployment/test automation"
                : path.includes("tests/")
                  ? "End-to-end or contract test"
                  : "Project source/configuration"
  const testStatus = path.includes("/tests/") || path.includes("\\tests\\") ? "Test file" : matchingTestStatus(path)
  return [path, purpose, ext || "none", testStatus]
})

function enumerateSourceFiles() {
  const allowed = new Set([".php", ".js", ".mjs", ".ts", ".tsx", ".rs", ".json", ".css", ".sql", ".md", ".yml", ".yaml"])
  const ignored = new Set([".git", "node_modules", "vendor", "dist", "releases", "test-results", "tmp", "logs", ".codex-logs", ".codex-tmp", ".wp-env"])
  const results = []
  walk(root)
  return results.sort()

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue
      const absolute = join(directory, entry.name)
      if (entry.isDirectory()) {
        walk(absolute)
        continue
      }
      if (!entry.isFile()) continue
      const ext = extname(entry.name)
      if (!allowed.has(ext) && entry.name !== ".wp-env.json" && entry.name !== ".env.example") continue
      const rel = relative(root, absolute).replace(/\\/g, "/")
      results.push(rel)
    }
  }
}

function matchingTestStatus(path) {
  const base = path.split("/").pop()?.replace(/\.(php|js|mjs|ts|tsx|rs|css|json|sql|md)$/i, "") ?? path
  const lower = base.toLowerCase()
  const hasLikelyTest = sourceFiles.some((candidate) => candidate.toLowerCase().includes("test") && candidate.toLowerCase().includes(lower.slice(0, Math.min(14, lower.length))))
  return hasLikelyTest ? "Covered by related unit/contract test" : "Covered by package/build/smoke tests or pending targeted test"
}

const docs = new Map()

docs.set("release-package/README.md", header(
  "Release Package README",
  "Entry point for the technical handover and production release package.",
  "Owner, administrator, support technician, and developer",
) + credentialNotice() + section("Package Contents",
  list([
    "`CLIENT_HANDOVER_GUIDE.md` is the primary client-facing handover guide.",
    "`OWNER_OPERATIONS_GUIDE.md`, `ADMIN_USER_GUIDE.md`, and `STAFF_USER_GUIDE.md` cover daily business operation.",
    "`TECHNICAL_ARCHITECTURE.md`, `DATABASE_SCHEMA_GUIDE.md`, `API_AND_CONNECTOR_GUIDE.md`, and `SYNC_ENGINE_GUIDE.md` support developer and technician maintenance.",
    "`SECURE_CREDENTIAL_HANDOFF.md`, `CREDENTIAL_INVENTORY_TEMPLATE.md`, and `ENVIRONMENT_VARIABLES.md` define safe credential transfer without exposing secrets.",
    "`CODE_MAP.md`, `SOURCE_CODE_INDEX.md`, and `SOURCE_CODE_COMMENTING_REPORT.md` explain the source package.",
  ]),
) + section("Installable Release Artifact",
  "The complete installable bundle is tracked under `releases/0.202.0/the-pug-production-release-0.202.0.zip`. The bundle contains the WordPress plugin ZIP, storefront theme ZIP, LAN middleman server ZIP, employee app installer package, customer kiosk installer package, manifests, and first-read instructions.",
) + section("Recommended Reading Order",
  steps([
    "Read `CLIENT_HANDOVER_GUIDE.md` for the full business and system overview.",
    "Read `SECURE_CREDENTIAL_HANDOFF.md` before moving any live credentials.",
    "Use `INSTALLATION_AND_DEPLOYMENT_GUIDE.md` for install, upgrade, and rollback.",
    "Use `QA_TESTING_AND_RELEASE_CHECKLIST.md` before owner signoff.",
    "Use `TROUBLESHOOTING_RUNBOOK.md` for support incidents.",
  ]),
))

docs.set("release-package/CLIENT_HANDOVER_GUIDE.md", header(
  "Client Handover Guide",
  "Primary client-facing handover guide for the complete trading-card store platform.",
  "Owner, manager, administrator, support technician",
) + credentialNotice() + section("Cover",
  [
    `${creator}`,
    "",
    `Prepared for: The Pug`,
    `Prepared by: JC Electronics`,
    `Release version: ${version}`,
    `Release date: ${releaseDate}`,
    "",
    "This guide summarizes the production system, owner responsibilities, support responsibilities, launch checks, and secure handoff process.",
  ].join("\n"),
) + section("Executive Summary",
  "The platform connects the public WordPress/WooCommerce website, custom trading-card inventory plugin, in-store employee app, customer kiosk, LAN middleman server, serialized inventory model, ScryDex reference data, customer credit ledger, buylist/trade-in intake, event registration, and reporting. WordPress remains the source of truth for website inventory, online orders, customer-facing pages, and custom business tables. The local app and kiosk are designed to keep the store operating during network interruptions by caching data locally and replaying queued actions when connectivity returns.",
) + section("Major Capabilities",
  moduleSummaryTable(),
) + section("Environments",
  table(["Environment", "Purpose", "Allowed data", "Never share"],
    [
      ["Local development", "Developer validation, wp-env, app builds, contract tests.", "Fake/sample data and sandbox credentials.", "Production customer credit, live payment secrets, production database dumps without approval."],
      ["Staging", "Safe pre-production verification and owner review.", "Sanitized or copied data approved for testing.", "Live payment capture, public indexing, production-only customer actions."],
      ["Production", "Live customer website, store operation, in-store app sync, payment/order records.", "Live store data and production credentials stored only in approved secure locations.", "Debug data, fake customer orders, public test banners, secrets in files."],
    ]),
) + section("User Roles",
  table(["Role", "Purpose", "Typical permissions"],
    [
      ["Customer", "Shop online, view account, register for events.", "Public storefront and customer account pages."],
      ["Kiosk user", "Browse in-stock inventory and place pickup request.", "Kiosk-only order flow; no staff data or credit management."],
      ["Staff", "Inventory intake, customer lookup, checkout support, order fulfillment.", "Staff screens, barcode lookup, trade-in staging as configured."],
      ["Manager", "Reports, overrides, credit corrections, settings, conflict resolution.", "Manager-only actions and audit views."],
      ["Administrator", "WordPress, WooCommerce, plugin setup, user roles, deployments.", "Full site administration."],
      ["Developer/support", "Maintain source, releases, migrations, integrations, backups.", "Repository, hosting deployment, support logs with least privilege."],
    ]),
) + section("Daily Business Flow",
  steps([
    "Customer searches inventory online or on the kiosk.",
    "System shows in-stock serialized inventory and holds selected cards during cart/order flow.",
    "Staff picks cards from the fulfillment queue and confirms exact items.",
    "Customer pays online or at the store through the configured payment/POS flow.",
    "Exact inventory items move from available/held to sold, and WooCommerce or POS records are reconciled.",
    "Customer credit can be redeemed locally through the staff checkout flow with an audit entry.",
    "Trade-in/buylist items are quoted per card, accepted/declined/saved, then accepted cards convert to inventory.",
    "Event registrations are stored locally, emails are sent through WordPress mail, and check-in is handled by staff.",
  ]),
) + section("Owner Responsibilities",
  list([
    "Review ScryDex sync results and failed pages.",
    "Review price changes, price floor hits, and manager overrides.",
    "Review inventory value, aging, location accuracy, and serialized item counts.",
    "Review customer store-credit liability and disputed balances.",
    "Review buylist/trade-in cash and credit totals.",
    "Review events, capacity, registrations, and optional external event sync status.",
    "Reconcile WooCommerce, Square/POS, and payment provider reports.",
    "Confirm backups and pre-deployment rollback points.",
  ]),
) + section("Support Responsibilities",
  ownerSupportTable(),
) + section("Launch Checklist",
  checklist([
    "Production credentials configured only in approved secure storage.",
    "Payment gateway tested in the correct mode.",
    "ScryDex search, full pull/resume, and price refresh verified.",
    "Square/POS connector status verified where configured.",
    "Event registration email sent and received.",
    "Kiosk order and 30-minute hold behavior verified.",
    "Employee app inventory intake and website sync verified.",
    "Store credit issue/redeem/correction tested with fake values.",
    "Buylist accept/decline/save flow tested.",
    "No public staging banner or debug copy visible in production.",
    "Admin, manager, staff, kiosk, and customer users verified.",
    "Database and wp-content backup completed before deployment.",
  ]),
) + section("Secure Credential Handoff",
  "Credentials are delivered separately through an encrypted password manager or encrypted archive. Use `SECURE_CREDENTIAL_HANDOFF.md` for process rules and `CREDENTIAL_INVENTORY_TEMPLATE.md` to track ownership, environment, rotation, and configuration location.",
))

docs.set("release-package/OWNER_OPERATIONS_GUIDE.md", header(
  "Owner Operations Guide",
  "Daily owner procedures for operating and supervising the platform.",
  "Store owner and general manager",
) + credentialNotice() + section("Owner Dashboard Overview",
  "The owner should treat the WordPress admin, WooCommerce reports, plugin reports, local app reports, sync logs, and payment/POS dashboards as one operational picture. The website is the source of truth; the app and kiosk provide fast in-store workflows and queue safely during outages.",
) + section("Daily Opening Checklist",
  checklist([
    "Open the website and confirm public pages load.",
    "Open the local middleman server status screen and confirm it is online.",
    "Open the employee app and confirm the sync status shows connected or local-cache fallback.",
    "Check ScryDex last successful sync and any failed checkpoint.",
    "Check local queue depth and resolve urgent conflicts before selling high-demand cards.",
    "Confirm kiosk inventory loads and cart submission is available.",
    "Confirm barcode scanner and label printer are connected if used that day.",
  ]),
) + section("Daily Closing Checklist",
  checklist([
    "Review WooCommerce orders and local pickup queue.",
    "Review Square/POS receipts and compare against local checkout records.",
    "Review customer credit issued and redeemed.",
    "Review trade-in cash and credit totals.",
    "Review price floor hits and manager overrides.",
    "Confirm queued app actions are synced or documented for the next day.",
    "Confirm backup status and note any incident in the store log.",
  ]),
) + section("ScryDex Operations",
  steps([
    "Open WordPress admin > TCG Store > ScryDex Catalog.",
    "Review catalog counts for sets, cards, variants, price observations, and checkpoints.",
    "If a game or set is missing, run the manual pull for the selected game/set.",
    "If a pull fails, use the resume failed pull option so completed pages are not repeated.",
    "For price-only refresh, run the daily scheduled refresh or manual price sync, then review price change logs.",
    "If the provider is unavailable, continue store operations from cached reference data and retry later.",
  ]),
) + section("Price And Inventory Review",
  list([
    "Review price floor hits daily before opening high-value inventory to sale.",
    "Use price lock only when an owner wants a card price protected from daily repricing.",
    "Use manager overrides for below-minimum sales, conflict resolution, duplicate merges, and sensitive settings changes.",
    "Check inventory by game, set, condition, grade, grading company, location, age, and source.",
  ]),
) + section("Customer Credit Liability",
  "Customer credit is local-store credit, not a public gift card. The owner should review the liability report, compare ledger activity against buylist and checkout records, and resolve disputes with correction entries rather than editing previous ledger rows.",
) + section("Common Owner Incidents",
  standardTroubleshooting(),
))

docs.set("release-package/TECHNICAL_ARCHITECTURE.md", header(
  "Technical Architecture",
  "Architecture reference for the website, plugin, apps, sync engine, connectors, and data model.",
  "Developer, support technician, administrator",
) + credentialNotice() + section("Full System Architecture", architectureMermaid()) + section("Website And WooCommerce Architecture",
  "The storefront theme renders the branded public pages and WooCommerce templates. WooCommerce handles product records, cart and checkout surface, order state, local pickup, customer accounts, and installed gateway plugins. The custom plugin projects serialized inventory groups into WooCommerce products and uses product/cart/order hooks so exact inventory items are reserved and sold safely.",
) + section("WordPress Plugin Architecture",
  moduleSummaryTable() + "\n" + "The plugin is organized by domain folders: `Admin`, `Api/V1`, `Auth`, `Bootstrap`, `Buylist`, `Credit`, `Events`, `Inventory`, `Logging`, `Migrations`, `Offline`, `Payments`, `Pricing`, `PublicSite`, `Reports`, `Reservations`, `ScryDex`, `Settings`, `Sync`, and `WooCommerce`.",
) + section("Database Architecture",
  "Custom tables are versioned through migration classes and tracked by `tcg_schema_migrations`. Business data is retained on deactivation. Destructive cleanup must be an explicit administrative operation with backup confirmation.",
) + section("ScryDex Sync Flow",
  flowMermaid("sequenceDiagram", [
    "  participant Admin as Admin/cron",
    "  participant WP as WordPress plugin",
    "  participant API as ScryDex",
    "  participant DB as Custom tables",
    "  Admin->>WP: Start full pull or scheduled refresh",
    "  WP->>DB: Read checkpoint",
    "  WP->>API: Request game/set/page with server-side credentials",
    "  API-->>WP: Cards, variants, prices, images",
    "  WP->>DB: Normalize and persist rows",
    "  WP->>DB: Advance checkpoint and log result",
  ]),
) + section("Customer Purchase Flow",
  flowMermaid("sequenceDiagram", [
    "  participant C as Customer",
    "  participant Woo as WooCommerce",
    "  participant R as Reservation engine",
    "  participant Pay as Payment gateway",
    "  participant Inv as Inventory tables",
    "  C->>Woo: Add selected condition/card to cart",
    "  Woo->>R: Reserve exact inventory item",
    "  C->>Pay: Complete payment",
    "  Pay-->>Woo: Payment success/failure",
    "  Woo->>Inv: Mark exact item sold or release hold",
  ]),
) + section("Staff Inventory Intake Flow",
  flowMermaid("sequenceDiagram", [
    "  participant Staff as Employee app/Admin",
    "  participant Ref as Reference search",
    "  participant Inv as Inventory intake",
    "  participant Woo as WooCommerce product sync",
    "  Staff->>Ref: Search card by name/game/set",
    "  Ref-->>Staff: Matching singles/graded results",
    "  Staff->>Inv: Enter condition, location, minimum price, quantity",
    "  Inv->>Inv: Create serialized item(s) and barcode/SKU",
    "  Inv->>Woo: Project grouped product when publish is requested",
  ]),
) + section("Offline Sync Flow",
  flowMermaid("sequenceDiagram", [
    "  participant App as Employee/kiosk app",
    "  participant LAN as LAN middleman",
    "  participant WP as WordPress REST",
    "  participant DB as Custom tables",
    "  App->>LAN: Pull inventory/customers/events",
    "  LAN->>WP: Authenticated pull",
    "  WP->>DB: Read changes by cursor",
    "  App->>LAN: Queue write while online/offline",
    "  LAN->>WP: Push with idempotency",
    "  WP-->>LAN: Success or conflict",
    "  LAN-->>App: Update queue/conflict status",
  ]),
) + section("Ledger, Buylist, Events, Override, And POS Flows",
  flowMermaid("flowchart TD", [
    "  A[Trade-in quote] --> B{Customer decision}",
    "  B -->|Accept credit| C[Customer credit ledger entry]",
    "  B -->|Accept cash| D[Cash payout report entry]",
    "  B -->|Decline/save| E[Profile history]",
    "  C --> F[Accepted item conversion]",
    "  F --> G[Serialized inventory]",
    "  H[Below-minimum sale] --> I[Manager override]",
    "  I --> J[Audit log]",
    "  K[POS sale] --> L[Exact item sold]",
    "  M[Event registration] --> N[Registration email and check-in queue]",
  ]),
) + section("Security And Permission Architecture",
  "Staff, manager, administrator, customer, kiosk, and system access are separated. Sensitive writes use server-side permission checks, nonces or authenticated REST requests, idempotency keys, and audit logs. Credentials remain server-side and are never returned to the browser, kiosk, or app.",
) + section("Deployment Architecture",
  "GitHub is the source of truth for source code and release packages. Feature work happens on task branches, `develop` represents staging readiness, and `main` represents production readiness. Production deployment requires backup, package install, migration verification, active sync verification, and owner signoff.",
))

docs.set("release-package/INSTALLATION_AND_DEPLOYMENT_GUIDE.md", header(
  "Installation And Deployment Guide",
  "Install, upgrade, deploy, validate, and roll back the production platform.",
  "Administrator, developer, support technician",
) + credentialNotice() + section("System Requirements",
  table(["Component", "Requirement"],
    [
      ["WordPress", "Current supported WordPress version with REST API and WP-Cron/Action Scheduler available."],
      ["PHP", "Modern supported PHP version compatible with WordPress/WooCommerce and typed plugin classes."],
      ["Database", "MySQL or MariaDB with permissions to create and alter custom plugin tables."],
      ["WooCommerce", "Installed and active before commerce features are used."],
      ["Node.js/npm", "Required for build, packaging, local sync server, and frontend/app tests."],
      ["Windows app", "Windows workstation for employee/kiosk installer; WebView/runtime and network access to LAN server."],
      ["Barcode scanner", "Keyboard-wedge scanner preferred for POS-style input."],
      ["Label printer", "Dymo LabelWriter 550 Turbo or configured equivalent; verify driver locally."],
    ]),
) + section("WordPress Installation",
  steps([
    "Back up the production database and `wp-content`.",
    "Install `tcg-store-platform-${version}.zip` through WordPress admin or WP-CLI.",
    "Activate the plugin and verify no fatal error occurs.",
    "Run or confirm plugin migrations; the target database version is tracked in the plugin version class.",
    "Install `pug-arcade-commerce-v2-${version}.zip` and activate the theme.",
    "Configure WooCommerce currency, tax, local pickup, checkout, and payment gateway settings.",
    "Configure permalink settings and flush rewrite rules if event/product routes change.",
    "Create administrator, manager, staff, and kiosk/device users with least privilege.",
  ]),
) + section("GoDaddy Managed WordPress Notes",
  list([
    "Use staging for pre-production validation when available.",
    "Confirm upload limits before uploading large theme/release packages.",
    "Use hosting backups before plugin/theme replacement.",
    "Confirm PHP memory/time limits when running large ScryDex imports.",
    "Block public indexing on staging and keep live payment capture off outside production.",
  ]),
) + section("Environment Configuration",
  "Required variables and WordPress fields are documented in `ENVIRONMENT_VARIABLES.md`. Production values must be entered only into WordPress settings, hosting control panels, server environment files excluded from Git, or a secure password manager.",
) + section("Deployment Flow",
  steps([
    "Work from a feature branch and open a pull request.",
    "Run `npm.cmd run test:local` for plugin unit/lint/bootstrap coverage.",
    "Run app and sync tests relevant to changed modules.",
    "Run `npm.cmd run package:production-release` to build the full package.",
    "Deploy to staging or a staging clone and run smoke tests.",
    "Back up production database and `wp-content`.",
    "Install plugin/theme ZIPs, run migrations, and verify routes.",
    "Run active sync verification and checkout/kiosk smoke tests.",
    "Record rollback points and owner approval.",
  ]),
) + section("Offline App And LAN Server Installation",
  steps([
    "Install and start the LAN middleman server on a stable in-store host machine.",
    "Allow inbound LAN traffic to the configured server port and UDP discovery port.",
    "Install the employee app on staff stations.",
    "Install the customer kiosk app on kiosk stations.",
    "Let apps auto-discover the middleman; if blocked, enter `http://STORE-SERVER-IP:8787` manually.",
    "Pair devices using the configured pairing process.",
    "Verify pull inventory, push inventory, customer lookup, kiosk order, fulfillment, and queue replay.",
  ]),
) + section("Post-Install Validation",
  checklist([
    "Website and key pages load.",
    "WooCommerce checkout loads.",
    "ScryDex search returns reference cards.",
    "Catalog status route returns counts without secrets.",
    "Inventory intake creates serialized rows.",
    "WooCommerce product sync creates/updates grouped products.",
    "Kiosk submits a held order and fulfillment queue receives it.",
    "Employee app sync status and queue status are accurate.",
    "Event registration stores a record and sends a confirmation email.",
    "Payment gateway is in intended mode and records orders.",
    "Reports are manager-only.",
    "No real secrets appear in logs, docs, screenshots, or GitHub.",
  ]),
) + section("Rollback",
  "Use the pre-release database and `wp-content` backups. Do not restore an old database over production without first accounting for orders, sold inventory, customer credit ledger entries, POS sync, and offline queued actions created after the backup.",
))

docs.set("release-package/ADMIN_USER_GUIDE.md", header(
  "Admin User Guide",
  "WordPress administrator guide for configuration and support tasks.",
  "WordPress administrator and support technician",
) + credentialNotice() + section("Admin Menu Areas",
  table(["Area", "Purpose", "Typical user"],
    [
      ["TCG Store Dashboard", "Health, routes, dependencies, sync and connector status.", "Admin/manager"],
      ["Inventory", "Search, intake, product sync, Square mapping, and serialized item review.", "Admin/manager/staff"],
      ["ScryDex Catalog", "Manual index, resume, export, checkpoint review.", "Admin/manager"],
      ["Reports", "Business, inventory, credit, buylist, fulfillment, sync, POS, and audit reports.", "Manager/admin"],
      ["Events", "Local event setup, registration status, check-ins.", "Admin/manager/staff"],
      ["Settings", "Provider settings, feature flags, route runtime, store policies.", "Admin"],
    ]),
) + section("Admin Setup Steps",
  steps([
    "Confirm WooCommerce is installed and active.",
    "Confirm plugin activation and database migration status.",
    "Configure store policies, ScryDex credentials, route runtime, and offline pairing settings.",
    "Configure WooCommerce payment gateway plugins separately from customer credit.",
    "Create manager and staff users.",
    "Run a small card search and inventory intake validation.",
    "Run a kiosk/order/fulfillment validation.",
  ]),
) + section("User Management",
  "Create staff users with only the capabilities needed for counter work. Create manager users for overrides, reports, credit corrections, trade-in approval, settings, and conflict resolution. Remove access immediately when staff leave the store and rotate shared device/pairing credentials as needed.",
) + section("Admin Safety Rules",
  list([
    "Do not paste secrets into support tickets, screenshots, docs, or GitHub.",
    "Do not manually edit ledger rows; use correction entries.",
    "Do not delete inventory rows to fix a sale; update status with audit context.",
    "Do not run production migrations without a backup.",
    "Do not enable live payment capture in staging.",
  ]),
))

docs.set("release-package/STAFF_USER_GUIDE.md", header(
  "Staff User Guide",
  "Plain-language staff workflow guide for daily counter, inventory, trade-in, fulfillment, and event tasks.",
  "Store staff and managers",
) + credentialNotice() + section("Staff Login And Access",
  "Staff should use assigned accounts or approved device login codes. Do not share manager codes. If a station is left unattended, lock the app or sign out according to store policy.",
) + section("Inventory Intake",
  steps([
    "Open Inventory.",
    "Search for the card by name. Use game and set filters when results are long.",
    "Select the exact card, version, finish, condition, or graded option.",
    "Enter location, quantity, cost if known, minimum sale price, and sale price.",
    "Print or attach barcode labels if required.",
    "Confirm whether the item should publish to the website and kiosk.",
    "Save. The system creates serialized inventory rows and syncs product data when enabled.",
  ]),
) + section("Trade-In Counter Flow",
  steps([
    "Open Trade-Ins and search/select the customer by name, phone, email, or customer ID.",
    "If the customer is missing, create the customer with required contact information.",
    "Search each card and add it to the offer cart.",
    "Set condition or grade, grading company, market value, trade percentage, payout type, and manual offer if needed.",
    "Review cash total, store-credit total, and combined total with the customer.",
    "Use Save Quote if the customer wants to return later.",
    "Use Customer Declines to keep a rejected record on the profile.",
    "Use Customer Accepts to post credit/cash entries and convert accepted items into inventory.",
  ]),
) + section("Order Fulfillment",
  steps([
    "Open Fulfillment.",
    "Select a paid website pickup order or kiosk order.",
    "Pick each exact card and check it off.",
    "If an item is missing, stop and notify a manager before substituting.",
    "Mark ready for pickup when all required items are picked.",
    "Confirm the customer receives pickup instructions or staff contact as configured.",
  ]),
) + section("Customer Credit",
  "Customer credit is local-store credit only. Look up the customer, verify identity by store policy, enter the amount used, and record the Square/POS receipt or order reference. Credit changes are logged with staff identity and timestamp.",
) + section("Events",
  "Staff can register/check in players from event screens when permitted. Event registration requires first name, last name, and email. Paid events may be pay-at-store or paid through WooCommerce depending on configuration.",
))

docs.set("release-package/KIOSK_AND_OFFLINE_APP_GUIDE.md", header(
  "Kiosk And Offline App Guide",
  "Guide for the employee app, kiosk mode, local server, offline queue, pairing, and reconnect behavior.",
  "Owner, manager, staff, support technician",
) + credentialNotice() + section("Topology",
  "The employee app and kiosk communicate with the LAN middleman server. The LAN server communicates with WordPress. WordPress remains the source of truth, while the local server caches data and safely queues operations during outages.",
) + section("Modes",
  table(["Mode", "Purpose", "User"],
    [
      ["Employee", "Inventory, checkout, customers, trade-ins, fulfillment, reports, events, sync.", "Staff/manager"],
      ["Kiosk", "Customer inventory lookup and order submission.", "Customer"],
      ["Middleman server", "Local cache, queue, auto-discovery, WordPress bridge, POS connector.", "Support/admin"],
    ]),
) + section("Auto-Discovery And Manual Fallback",
  "Apps attempt auto-discovery using `pug-local-sync-discovery-v1` over UDP port `8788`. If the network blocks discovery, staff can manually enter the middleman URL, for example `http://STORE-SERVER-IP:8787`.",
) + section("Offline Behavior",
  list([
    "Read operations use the last local cache when WordPress is unreachable.",
    "Writes are queued with idempotency keys.",
    "Queued operations replay when the middleman and website reconnect.",
    "Conflicts are shown for manager resolution.",
    "Customer kiosk carts place holds only when the system can validate available stock or queue a safe hold as configured.",
  ]),
) + section("Queue And Conflict Handling",
  steps([
    "Open the sync/queue screen.",
    "Review pending operation type, customer/order/reference ids, amount, and queued time.",
    "Do not clear a queue until the matching website/order/inventory state is confirmed.",
    "Escalate duplicate sell, customer credit, and merge conflicts to a manager.",
    "After reconnect, confirm queue depth returns to zero or only known deferred items remain.",
  ]),
))

docs.set("release-package/API_AND_CONNECTOR_GUIDE.md", header(
  "API And Connector Guide",
  "Connector, REST route, request/response, retry, logging, and troubleshooting reference.",
  "Developer, support technician, administrator",
) + credentialNotice() + section("Connector Overview",
  table(["Connector", "Purpose", "Credentials", "Storage"],
    [
      ["ScryDex", "Card/set/variant/price/image reference data.", "Team ID, primary key, optional secondary key.", "WordPress settings or ignored server env."],
      ["WooCommerce", "Product, cart, checkout, order, refund/cancel hooks.", "WooCommerce internal APIs and gateway settings.", "WordPress/WooCommerce settings."],
      ["POS adapter", "Square/POS sale and inventory reconciliation.", "Provider token/location/device id where configured.", "Local server env and password manager."],
      ["Payment gateways", "Square, GoDaddy Payments, or other WooCommerce gateways.", "Gateway credentials.", "Gateway settings; never docs/GitHub."],
      ["TopDeck", "Optional event import/link/attendee sync/registration by email where supported.", "API key/token.", "WordPress settings or server env."],
      ["Email/SMTP", "Transactional messages including pickup, buylist, credit, and event registration.", "SMTP credentials or provider token.", "SMTP plugin/server env."],
      ["Offline app API", "Device pairing, pull, push, conflicts, events, customers, inventory.", "Pairing tokens and WordPress app auth.", "WordPress settings/local secure storage."],
    ]),
) + section("REST Route Summary",
  table(["Area", "Method", "Route", "Purpose"], routeGroups),
) + section("ScryDex Connector",
  "ScryDex is the primary card reference provider. The system stores provider sets, cards, variants, image URLs, price observations, normalized price points, and checkpoints. Full pulls paginate by game and set. Resume operations use the checkpoint table so a failed page can continue without restarting completed work.",
) + section("ScryDex Example",
  [
    "Request body example:",
    "",
    "~~~json",
    JSON.stringify({ game: "pokemon", set_id: "replace_with_set_id", page_size: 100, checkpoint: "replace_with_checkpoint_id" }, null, 2),
    "~~~",
    "",
    "Response example:",
    "",
    "~~~json",
    JSON.stringify({ status: "ok", imported_count: 100, continuation_checkpoint_row: { resource_type: "cards", page_number: 4 } }, null, 2),
    "~~~",
  ].join("\n"),
) + section("WooCommerce Connector",
  "WooCommerce handles storefront commerce, while the plugin controls serialized card availability. Product sync creates or updates product data, images, price selectors, condition rows, and exact inventory reservation metadata. Payments remain with installed WooCommerce payment gateways.",
) + section("POS And Payment Connectors",
  "Square/POS support is separated from payment capture. The local server can prepare/read Square Terminal status and record receipt references. WooCommerce gateway plugins handle online payment authorization/capture. Store credit is separate from gift cards and is redeemed through local staff workflows unless an owner explicitly changes policy.",
) + section("TopDeck Connector",
  "Supported documentation modes are local-only events, linked external events, imported owned events, and future create-event support only if the provider API and credentials support it. Do not assume create-event support is available until verified in code, provider documentation, and production credentials.",
) + section("Email/SMTP Connector",
  "Transactional email uses WordPress mail or the configured SMTP provider. Current email flows include event registration confirmation and can support pickup ready, buylist receipt, credit notice, and sync failure alerts where enabled.",
) + section("Offline App API",
  "The offline app API uses device pairing, signed/authenticated requests, idempotency keys, cursors, and conflict records. Secrets are never returned to app clients. Local clients receive only operational status and non-secret connector readiness.",
) + section("Troubleshooting",
  standardTroubleshooting(),
))

docs.set("release-package/DATABASE_SCHEMA_GUIDE.md", header(
  "Database Schema Guide",
  "Custom database table reference for the trading-card store platform.",
  "Developer, database administrator, support technician",
) + credentialNotice() + section("Schema Principles",
  list([
    "Custom tables are prefixed by the WordPress database prefix plus `tcg_`.",
    "Migrations are versioned and tracked.",
    "Business data is not removed during normal plugin deactivation.",
    "Ledger and audit tables are append/correction oriented.",
    "Serialized inventory keeps one physical item per row.",
    "Sync and connector logs are retained for troubleshooting and reconciliation.",
  ]),
) + section("Table Reference",
  table(["Table", "Purpose", "Primary module"], customTables),
) + section("ERD",
  flowMermaid("erDiagram", [
    "  tcg_reference_sets ||--o{ tcg_reference_cards : contains",
    "  tcg_reference_cards ||--o{ tcg_reference_variants : has",
    "  tcg_reference_cards ||--o{ tcg_inventory_items : referenced_by",
    "  tcg_inventory_items ||--o{ tcg_reservations : held_by",
    "  tcg_inventory_locations ||--o{ tcg_inventory_items : stores",
    "  tcg_customers ||--o{ tcg_customer_credit_ledger : owns",
    "  tcg_customers ||--o{ tcg_buylist_submissions : submits",
    "  tcg_buylist_submissions ||--o{ tcg_buylist_items : contains",
    "  tcg_buylist_items ||--o{ tcg_buylist_conversion_log : converts",
    "  tcg_events ||--o{ tcg_event_registrations : receives",
    "  tcg_event_registrations ||--o{ tcg_event_checkins : checks_in",
    "  tcg_sync_jobs ||--o{ tcg_sync_job_logs : logs",
    "  tcg_offline_devices ||--o{ tcg_offline_sync_queue : queues",
    "  tcg_offline_sync_queue ||--o{ tcg_sync_conflicts : may_create",
  ]),
) + section("Retention And Cleanup",
  "Do not truncate ledger, audit, order, buylist, or inventory history tables without owner approval and backups. Sync job logs may be archived after a defined retention period if support agrees and reports no longer depend on them.",
))

docs.set("release-package/SYNC_ENGINE_GUIDE.md", header(
  "Sync Engine Guide",
  "Operational and technical guide for ScryDex, website/app, LAN queue, and conflict sync.",
  "Owner, manager, support technician, developer",
) + credentialNotice() + section("Daily Schedule",
  "The reference/pricing sync is designed around a 9:00 AM America/New_York daily refresh. The schedule is visible through health/status payloads and admin screens. Manual pulls and resume actions are available for owner/support use.",
) + section("Sync Types",
  table(["Sync", "Purpose", "Trigger"],
    [
      ["Full ScryDex pull", "Import sets, cards, variants, prices, images, and checkpoints.", "Manual admin action or configured worker."],
      ["Price-only pull", "Refresh prices without rebuilding all reference records.", "Daily schedule or manual action."],
      ["Image-only pull", "Refresh image URLs/cache metadata.", "Manual support action when images are missing."],
      ["New set pull", "Import newly released expansions.", "Manual or scheduled catalog scan."],
      ["Resume failed pull", "Continue from checkpoint after provider/server interruption.", "Manual owner/support action."],
      ["Website-to-app", "Push inventory/customer/event changes into local cache.", "App/middleman pull by cursor."],
      ["App-to-website", "Replay inventory, customer, credit, buylist, event, and fulfillment writes.", "Middleman queue push."],
    ]),
) + section("Checkpoint And Pagination Rules",
  "ScryDex pagination is tracked by resource, game, set, page/cursor, committed count, and update time. A page is advanced only after successful normalization and persistence. Failed pages log errors and preserve a resume point.",
) + section("Retry, Rate Limit, And Usage Rules",
  list([
    "Retry transient network/provider failures with bounded retries.",
    "Respect provider rate limit responses and pause/resume from checkpoint.",
    "Log provider failures without exposing API keys.",
    "Avoid loading very large result sets into memory; use paginated export and processing.",
  ]),
) + section("Manager Approval Rules",
  "Normal sync does not require a manager to manually push. Manager approval is reserved for below-minimum sale, manual credit adjustment, credit void, conflict resolution, duplicate customer merge, event capacity override, and high-risk settings changes.",
) + section("Conflict Resolution",
  steps([
    "Open conflict/queue view.",
    "Review current website row and queued local row.",
    "Determine whether the action is safe, duplicate, stale, or requires correction.",
    "Resolve with a manager-level reason.",
    "Confirm resulting inventory/credit/order state and audit log.",
  ]),
))

docs.set("release-package/PRICING_AND_INVENTORY_GUIDE.md", header(
  "Pricing And Inventory Guide",
  "Business rules for serialized inventory, repricing, price floors, locations, barcodes, and WooCommerce product sync.",
  "Owner, manager, staff, support technician",
) + credentialNotice() + section("Serialized Inventory Rules",
  list([
    "One physical card equals one inventory item.",
    "Each inventory item has a unique inventory identity and optional barcode/SKU.",
    "Same card/set products may be grouped for storefront display while preserving condition/grade-specific serialized rows.",
    "Cards can be visible online, kiosk-visible, POS-visible, hidden, held, sold, returned, or pending review depending on workflow.",
  ]),
) + section("Price Rules",
  table(["Rule", "Behavior"],
    [
      ["Market value", "Pulled from ScryDex/reference data when available."],
      ["Suggested sale price", "Market price plus 10% unless store policy changes."],
      ["Normal customer price rounding", "Over $1 with cents rounds up to the nearest whole dollar."],
      ["Minimum sale price", "Required at intake and used as the floor for automatic repricing."],
      ["Price lock", "Prevents automatic repricing for owner-selected items."],
      ["Below-minimum sale", "Requires manager override and audit reason."],
      ["Trade-in value", "Market mid times per-card percentage, rounded down to whole dollars."],
    ]),
) + section("Examples",
  table(["Scenario", "Result"],
    [
      ["Market $100, suggested sale = market + 10%", "Suggested sale price $110.00."],
      ["Minimum sale price $90, market rises to $120", "Auto price may increase according to policy."],
      ["Minimum sale price $90, market falls to $95", "Auto price may fall but remains above floor."],
      ["Minimum sale price $90, market falls to $60", "Price floor prevents auto price below $90."],
      ["Price lock enabled", "Daily repricing skips the item until unlocked."],
      ["Staff attempts $80 sale with $90 minimum", "Manager override required and logged."],
    ]),
) + section("Inventory Locations",
  "Locations should be named in plain store language such as Front Case, Binder A, Bulk Back Room, Graded Display, Online Hold, or Event Prize Shelf. Multi-location logic should be used consistently so staff can pick quickly and reports remain accurate.",
) + section("WooCommerce Product Sync",
  "When inventory is published, the plugin projects card groups into WooCommerce products with images, condition/grade selectors, price display, and reservation metadata. WooCommerce stock alone is not sufficient for one-of-one cards because exact serialized item status controls availability.",
))

docs.set("release-package/CUSTOMER_CREDIT_AND_BUYLIST_GUIDE.md", header(
  "Customer Credit And Buylist Guide",
  "Customer profile, local store credit, ledger, trade-in, and buylist operating guide.",
  "Owner, manager, staff, support technician",
) + credentialNotice() + section("Customer Credit Principles",
  list([
    "Credit is profile-based local store credit, not a public gift card.",
    "Phone number is required or strongly recommended for reliable lookup.",
    "Lookups can use name, phone, email, or customer ID.",
    "Ledger entries are immutable; corrections are new manager-level entries.",
    "Online customers may view credit only where safely enabled; redemption stays local unless owner explicitly enables otherwise.",
  ]),
) + section("Ledger Entry Types",
  table(["Entry", "Effect", "Example source"],
    [
      ["Credit issued", "Increases balance.", "Accepted trade-in credit payout."],
      ["Credit used", "Decreases balance.", "Local checkout redemption with POS receipt."],
      ["Cash paid", "No credit balance change but reportable payout.", "Cash trade-in item."],
      ["Adjustment/correction", "Signed manager correction.", "Dispute resolution."],
      ["Refund to credit", "Increases balance when policy allows.", "Return/refund workflow."],
    ]),
) + section("Buylist Flow",
  flowMermaid("flowchart TD", [
    "  A[Search or create customer] --> B[Add cards to offer cart]",
    "  B --> C[Set condition or grade]",
    "  C --> D[Market value and per-card percentage]",
    "  D --> E[Choose cash or store credit per item]",
    "  E --> F{Customer decision}",
    "  F -->|Save later| G[Saved quote on profile]",
    "  F -->|Decline| H[Rejected quote on profile]",
    "  F -->|Accept| I[Ledger or cash payout record]",
    "  I --> J[Convert accepted items to inventory]",
  ]),
) + section("Dispute Handling",
  steps([
    "Search customer by phone/name/email/customer ID.",
    "Open ledger history and filter by date/order/buylist reference.",
    "Compare receipt/order/buylist line items against ledger entries.",
    "If correction is required, post a manager correction with reason and reference.",
    "Do not edit old ledger rows silently.",
  ]),
))

docs.set("release-package/EVENTS_AND_TOPDECK_GUIDE.md", header(
  "Events And TopDeck Guide",
  "Event pages, local registration, waitlist/check-in, email, and optional external event connector guide.",
  "Owner, manager, staff, support technician",
) + credentialNotice() + section("Website Event Pages",
  list([
    "Events list and detail pages show title, game, date/time, entry fee, capacity, status, and registration actions.",
    "Registrations require first name, last name, and email address.",
    "Registration confirmation email includes event details and the store address.",
    "Capacity and waitlist rules are handled by the event policy.",
    "Check-in is staff controlled.",
  ]),
) + section("Registration Flow",
  steps([
    "Customer opens event detail page.",
    "Customer enters first name, last name, email, and phone if requested.",
    "System validates registration status and capacity.",
    "System stores registration or waitlist row.",
    "System sends event registration email through configured mail transport.",
    "Staff checks player in on arrival.",
  ]),
) + section("TopDeck Modes",
  table(["Mode", "Status", "Notes"],
    [
      ["Local only", "Supported", "Events and registrations live in the store platform only."],
      ["Linked existing external event", "Optional where configured", "Store event references an existing external event id."],
      ["Imported owned external event", "Optional where configured", "Provider-owned events can be imported when credentials and endpoints support it."],
      ["Create external event", "Future/verify before use", "Do not claim this works unless provider endpoint, credentials, and code path are verified."],
    ]),
) + section("Failure Handling",
  table(["Failure", "Expected behavior"],
    [
      ["External provider down", "Local event registration can continue if local mode is active; provider sync can retry later."],
      ["Payment succeeds but external registration fails", "Order/registration should remain locally visible for staff follow-up and provider retry."],
      ["Capacity conflict", "Waitlist or rejection according to event policy; manager override must be logged."],
      ["Already registered", "Return existing status without duplicate active registration."],
    ]),
))

docs.set("release-package/POS_AND_PAYMENTS_GUIDE.md", header(
  "POS And Payments Guide",
  "Payment, POS, WooCommerce gateway, Square, GoDaddy Payments, store credit, and reconciliation guide.",
  "Owner, administrator, support technician",
) + credentialNotice() + section("Payment Separation",
  "WooCommerce payment gateways handle online payment authorization and capture. The custom platform handles serialized inventory, reservations, store credit, buylist, and reconciliation. Store credit is not implemented as a public gift card or normal coupon in the default policy.",
) + section("Provider Roles",
  table(["Provider", "Role", "Credential location"],
    [
      ["WooCommerce checkout", "Online cart, order, payment state, local pickup.", "WooCommerce settings."],
      ["Square POS/Terminal", "In-store card reader/POS reference and sale reconciliation where configured.", "Local server env/password manager; WooCommerce Square plugin for online if used."],
      ["GoDaddy Payments", "WooCommerce gateway where configured.", "WooCommerce/GoDaddy settings."],
      ["Store credit", "Local profile ledger redemption.", "Plugin/customer ledger tables; no payment secret."],
    ]),
) + section("Exact Serialized Item Sold Behavior",
  steps([
    "Cart/order reserves an exact inventory item.",
    "Payment or POS receipt confirms sale.",
    "Inventory item moves to sold with timestamp and reference.",
    "WooCommerce product group is refreshed so condition availability changes.",
    "POS/payment log records reconciliation details without storing full payment data.",
  ]),
) + section("Testing Safely",
  list([
    "Use sandbox/test mode only for payment validation outside production.",
    "Never paste live payment keys into documentation, GitHub, screenshots, or logs.",
    "Use low-value or fake inventory for end-to-end payment tests.",
    "Confirm refunds/cancellations release or review inventory according to policy.",
  ]),
))

docs.set("release-package/SECURITY_AND_PERMISSIONS_GUIDE.md", header(
  "Security And Permissions Guide",
  "Security, roles, permissions, credential storage, audit logging, and offboarding guide.",
  "Owner, administrator, support technician",
) + credentialNotice() + section("Role Matrix",
  table(["Role", "Allowed", "Restricted"],
    [
      ["Customer", "Public storefront, own account views.", "Staff screens, reports, credit redemption admin."],
      ["Kiosk", "Inventory browse and kiosk order submit.", "Customer private data, reports, settings."],
      ["Staff", "Inventory intake, fulfillment, checkout, customer lookup as configured.", "High-risk settings, manager overrides, reports unless granted."],
      ["Manager", "Reports, credit corrections, conflict resolution, buylist approval, overrides.", "Hosting/database secrets unless separately authorized."],
      ["Administrator", "WordPress/plugin/WooCommerce configuration.", "Should still use least privilege and secure credential storage."],
      ["System", "Server-to-server sync operations.", "Interactive use."],
    ]),
) + section("Security Controls",
  list([
    "Server-side permission checks on REST/admin routes.",
    "WordPress nonces for admin actions.",
    "Idempotency keys for queued writes.",
    "Webhook verification where provider webhooks are enabled.",
    "Secrets stored only in WordPress settings, server env, local secure storage, or a password manager.",
    "Audit logs for credit changes, overrides, trade-in conversion, report exports, receipt resend, and fulfillment actions where practical.",
    "Kiosk privacy by restricted role, timeout, and no staff/customer-credit screens.",
  ]),
) + section("Credential Rotation Checklist",
  checklist([
    "ScryDex API key and secondary key.",
    "TopDeck API key.",
    "Square access token and webhook signing secret.",
    "GoDaddy Payments credentials.",
    "SMTP credentials.",
    "WordPress admin passwords.",
    "WordPress application passwords.",
    "Database password.",
    "SSH/SFTP credentials or deploy keys.",
    "Offline app pairing tokens.",
    "Kiosk/device tokens.",
    "App update/code signing key if used.",
  ]),
) + section("Staff Offboarding",
  steps([
    "Disable WordPress user account.",
    "Remove app/device access if assigned.",
    "Rotate shared manager/login codes if the staff member knew them.",
    "Review recent overrides, credit changes, and trade-in activity.",
    "Document offboarding completion.",
  ]),
))

docs.set("release-package/TROUBLESHOOTING_RUNBOOK.md", header(
  "Troubleshooting Runbook",
  "Incident response guide for common website, sync, payment, inventory, event, and app failures.",
  "Owner, manager, support technician",
) + credentialNotice() + section("Incident Rules",
  list([
    "Protect business data before attempting fixes.",
    "Do not delete orders, ledger rows, inventory rows, or sync conflicts to hide an issue.",
    "Capture screenshots/log excerpts only after masking private data and secrets.",
    "Escalate payment, customer credit, and double-sell conflicts to a manager.",
  ]),
) + section("Issue And Action Table",
  standardTroubleshooting(),
) + section("Additional Incidents",
  table(["Incident", "Likely cause", "Resolve"],
    [
      ["Sync stuck on page", "Provider error, timeout, invalid payload, or checkpoint issue.", "Review sync errors, retry/resume from checkpoint, reduce page scope if needed."],
      ["Rate limited", "Provider rejected request volume.", "Pause, respect retry window, resume from checkpoint."],
      ["Manager override not working", "Role/capability mismatch or nonce/session issue.", "Confirm manager role, reload admin/app, check audit route health."],
      ["TopDeck registration failing", "Credentials, provider outage, duplicate player, capacity conflict.", "Use local registration record and retry provider sync later."],
      ["Barcode scanner not reading", "Scanner mode/keyboard layout/input focus.", "Test in a text field, reconfigure scanner suffix, verify barcode format."],
      ["Label printer not printing", "Driver, queue, label stock, app package.", "Print OS test label, then verify app label output."],
      ["High server load", "Large catalog pull, slow DB query, hosting limits.", "Pause bulk sync, check database indexes, run smaller batches."],
      ["Slow search", "Missing indexes, large result set, provider fallback timeout.", "Use filters, check reference table counts, review query plans."],
    ]),
))

docs.set("release-package/BACKUP_RESTORE_AND_RECOVERY_GUIDE.md", header(
  "Backup Restore And Recovery Guide",
  "Backup, restore, rollback, and disaster recovery procedure.",
  "Owner, administrator, support technician",
) + credentialNotice() + section("What To Back Up",
  checklist([
    "WordPress database including WooCommerce and all custom `tcg_` tables.",
    "`wp-content/uploads`, active theme, active plugin files, and custom media.",
    "Customer credit ledger and buylist tables.",
    "Inventory, reservations, orders, and POS sync logs.",
    "Events and event registrations/check-ins.",
    "Offline app local database files from in-store machines when troubleshooting.",
    "Ignored environment files and credentials through secure password manager export, not GitHub.",
  ]),
) + section("Backup Schedule",
  table(["Backup", "Frequency", "Owner"],
    [
      ["Hosting database backup", "Daily and before releases.", "Owner/admin"],
      ["wp-content backup", "Daily and before releases.", "Owner/admin"],
      ["Release package archive", "Every production release.", "Support"],
      ["Offline local DB snapshot", "Before major app repair or queue recovery.", "Support"],
      ["Credential inventory export", "After rotations, stored securely.", "Owner"],
    ]),
) + section("Restore Procedure",
  steps([
    "Stop new deployments and notify staff.",
    "Identify restore point and data created after that restore point.",
    "Export current production state before overwrite.",
    "Restore staging first when practical.",
    "Validate orders, customer credit, inventory, events, and sync queues.",
    "Restore production only after owner approval.",
    "Run smoke tests and active sync verification.",
  ]),
) + section("Critical Warning",
  "Do not restore an old database over production without considering customer credit, sold inventory, orders, POS sync, and offline queued actions created after the backup. Those records may need manual reconciliation before or after restore.",
))

docs.set("release-package/QA_TESTING_AND_RELEASE_CHECKLIST.md", header(
  "QA Testing And Release Checklist",
  "Production release validation checklist for owner and support signoff.",
  "Owner, manager, support technician, developer",
) + credentialNotice() + section("Website QA",
  checklist([
    "Home, contact, shop singles, sealed, graded, accessories, events, account, cart, checkout, and policy pages load.",
    "No public staging banner, debug copy, or development-only links are visible.",
    "Navigation links route to intended pages.",
    "Mobile, tablet, and desktop layouts are readable and usable.",
    "Product images display on listing, product, cart, and checkout views.",
  ]),
) + section("Commerce And Inventory QA",
  checklist([
    "Card search works with game, set, type, condition, and graded filters.",
    "Same card/set groups display condition/grade choices correctly.",
    "Add to cart places reservation/hold.",
    "Expired cart/hold releases inventory.",
    "Successful checkout marks exact item sold.",
    "Failed/cancelled checkout releases or reviews hold according to policy.",
    "Inventory intake creates serialized rows and optional WooCommerce product sync.",
  ]),
) + section("Operational QA",
  checklist([
    "Manager override prompts/logs required sensitive actions.",
    "Customer credit issue/redeem/correction appears in ledger.",
    "Buylist save/decline/accept flow works and accepted items convert to inventory.",
    "Kiosk order appears in fulfillment queue.",
    "Employee app reconnect replays queued operations.",
    "ScryDex full pull, price-only pull, and resume failed pull are verified.",
    "TopDeck/event behavior is verified according to configured mode.",
    "POS/payment test uses sandbox/test mode where appropriate.",
    "Email flows are received.",
    "Reports load and export for manager users only.",
    "Backups and rollback instructions are current.",
    "Owner gives final approval.",
  ]),
))

docs.set("release-package/SECURE_CREDENTIAL_HANDOFF.md", header(
  "Secure Credential Handoff",
  "Procedure for transferring and rotating credentials without exposing secrets in documentation or source control.",
  "Owner, administrator, support technician",
) + credentialNotice() + section("Credential Rule",
  "Real credentials are not included in this repository, generated documentation, screenshots, release notes, PDFs, DOCX files, logs, or example files. Real credentials must be transferred only through an approved secure channel.",
) + section("Approved Handoff Methods",
  list([
    "1Password shared vault.",
    "Bitwarden organization vault.",
    "KeePass encrypted database.",
    "Proton Pass vault.",
    "Encrypted ZIP file with password sent through a separate channel.",
    "Approved enterprise password manager.",
  ]),
) + section("Required Inventory Fields",
  table(["Field", "Description"],
    [
      ["Credential owner", "Person or organization responsible for rotation."],
      ["Credential name", "Plain label such as ScryDex production API key."],
      ["System", "WordPress, hosting, ScryDex, Square, SMTP, etc."],
      ["Environment", "Production, staging, sandbox, or local."],
      ["Account/login URL", "Where the account is managed."],
      ["Permission level", "Least privilege description."],
      ["Configured in", "WordPress field, environment variable, hosting control panel, or local secure store."],
      ["Rotation frequency", "Recommended review/rotation cycle."],
      ["Recovery method", "How ownership is recovered if the primary owner is unavailable."],
    ]),
) + section("Rotation Checklist",
  checklist(credentials.map((row) => `Rotate and update inventory for ${row[0]}.`)),
))

docs.set("release-package/CREDENTIAL_INVENTORY_TEMPLATE.md", header(
  "Credential Inventory Template",
  "Template for tracking required credentials without storing real secret values.",
  "Owner, administrator, support technician",
) + credentialNotice() + section("Inventory Table",
  table([
    "Credential Name",
    "System",
    "Environment",
    "Account/Username",
    "Login URL",
    "Secret Type",
    "Stored In",
    "WordPress Setting / Env Var",
    "Permission Level",
    "Owner",
    "Rotation Date",
    "Notes",
    "Masked Example",
  ], credentialRows()),
))

docs.set("release-package/ENVIRONMENT_VARIABLES.md", header(
  "Environment Variables",
  "Environment and settings reference with placeholders only.",
  "Administrator, support technician, developer",
) + credentialNotice() + section("Variables",
  table(["Variable / Setting", "Purpose", "Required", "Environment", "Default if missing"],
    [
      ["SCRYDEX_API_KEY", "Primary ScryDex provider key.", "Required for live provider sync.", "Production/staging/local.", "Provider sync blocked."],
      ["SCRYDEX_SECONDARY_API_KEY", "Secondary ScryDex key.", "Optional.", "Production/staging/local.", "Primary only."],
      ["SCRYDEX_TEAM_ID", "ScryDex team/account id.", "Required for ScryDex.", "Production/staging/local.", "Provider sync blocked."],
      ["TOPDECK_API_KEY", "External event provider key.", "Optional where configured.", "Production/sandbox.", "TopDeck sync disabled."],
      ["PUG_WORDPRESS_URL", "Website URL for local middleman.", "Required for local sync.", "Local server.", "WordPress connector disabled."],
      ["PUG_WORDPRESS_USERNAME", "WordPress app user.", "Optional/required for authenticated pushes.", "Local server.", "Write/pull auth disabled."],
      ["PUG_WORDPRESS_APP_PASSWORD", "WordPress app password.", "Optional/required for authenticated pushes.", "Local server.", "Write/pull auth disabled."],
      ["LOCAL_SYNC_WORDPRESS_PUSH_ENABLED", "Allows local server to push writes.", "Required for live push.", "Local server.", "false."],
      ["PUG_SQUARE_ACCESS_TOKEN", "Square connector token.", "Optional where Square Terminal is used.", "Local server.", "Square reader handoff disabled."],
      ["PUG_SQUARE_LOCATION_ID", "Square location.", "Optional where Square is used.", "Local server.", "Square connector incomplete."],
      ["PUG_SQUARE_TERMINAL_DEVICE_ID", "Square reader device id.", "Optional where Terminal is used.", "Local server.", "Manual receipt flow only."],
      ["SMTP_HOST / SMTP_USER / SMTP_PASSWORD", "Email transport.", "Required for reliable email.", "WordPress/hosting.", "WordPress host mail fallback."],
      ["PAYMENT_MODE", "Payment mode marker.", "Required by some integrations.", "Gateway/local.", "Provider default."],
      ["APP_ENV", "Environment marker.", "Recommended.", "All.", "production or local defaults by component."],
    ]),
) + section("Example Files",
  list([
    "`/.env.example` documents repository-level placeholders.",
    "`/apps/local-sync-server/.env.example` documents LAN middleman placeholders.",
    "`/release-package/env/production.env.example` is a client-safe production placeholder template.",
    "`/release-package/env/local-sync.env.example` is a client-safe local server placeholder template.",
    "`/release-package/env/offline-app.env.example` is a client-safe app placeholder template.",
  ]),
))

docs.set("release-package/CODE_MAP.md", header(
  "Code Map",
  "Source package map by folder, purpose, dependencies, tables, routes, and tests.",
  "Developer and support technician",
) + credentialNotice() + section("Major Folder Map",
  table(["Path", "Purpose", "Dependencies / related systems", "Tables / routes / tests"],
    [
      ["apps/wordpress-plugin/src/Admin", "WordPress admin screens and workspace presenters.", "WordPress admin, settings, REST nonces.", "Inventory, ScryDex, reports admin tests."],
      ["apps/wordpress-plugin/src/Api/V1", "REST controllers, route contracts, permissions, route handlers.", "WordPress REST API, capability registry.", "Routes documented in API_ROUTES.md."],
      ["apps/wordpress-plugin/src/Auth", "Roles and capabilities.", "WordPress users/roles.", "tcg_role_permissions; capability tests."],
      ["apps/wordpress-plugin/src/Bootstrap", "Plugin startup, dependencies, scheduler.", "WordPress hooks, WooCommerce, Action Scheduler.", "Bootstrap smoke tests."],
      ["apps/wordpress-plugin/src/Buylist", "Trade-in/buylist parsing, offer planning, receipt presentation.", "Customer, pricing, inventory.", "tcg_buylist_*; buylist unit tests."],
      ["apps/wordpress-plugin/src/Credit", "Customer credit posting, ledger repository, REST presenters.", "Customer profiles, audit logging.", "tcg_customer_credit_ledger; credit unit tests."],
      ["apps/wordpress-plugin/src/Events", "Event models, registration policy/service, email notification, shortcodes.", "REST, mail, WooCommerce event products where configured.", "tcg_events*, event tests."],
      ["apps/wordpress-plugin/src/Inventory", "Serialized inventory intake/search/persistence/external mappings.", "Pricing, WooCommerce, Square mapping.", "tcg_inventory_items; inventory tests."],
      ["apps/wordpress-plugin/src/Migrations", "Versioned database schemas.", "wpdb/dbDelta.", "All custom tables; schema tests."],
      ["apps/wordpress-plugin/src/Offline", "Offline pull/push, devices, cursors, conflicts.", "REST, local app, sync queue.", "tcg_offline_* and tcg_sync_conflicts."],
      ["apps/wordpress-plugin/src/Payments", "Payment/POS fee and provider logs.", "WooCommerce/Square/POS.", "tcg_payment_* and tcg_pos_sync_log."],
      ["apps/wordpress-plugin/src/Pricing", "Shared pricing rules and calculators.", "ScryDex prices, inventory intake.", "Pricing tests."],
      ["apps/wordpress-plugin/src/PublicSite", "Public inventory/search/product shelf shortcodes.", "WordPress shortcodes, WooCommerce.", "Public shortcode tests."],
      ["apps/wordpress-plugin/src/Reports", "Manager report planner and dashboard data.", "Inventory, sales, credit, buylist, sync logs.", "Reports tests."],
      ["apps/wordpress-plugin/src/ScryDex", "Provider settings, HTTP provider, normalizer, sync workers.", "ScryDex API.", "Catalog and sync tests."],
      ["apps/wordpress-plugin/src/WooCommerce", "Product writer, grouped inventory hooks, customer portal.", "WooCommerce CRUD/hooks.", "WooCommerce tests."],
      ["apps/local-sync-server/src", "LAN server, WordPress bridge, queue, Square Terminal scaffold.", "Node, SQLite/local store, WordPress REST.", "Local sync server tests."],
      ["apps/offline-app/src", "Employee/kiosk React UI and app data adapters.", "Vite, Tauri commands, LAN server.", "Offline app contract tests."],
      ["apps/offline-app/src-tauri", "Windows shell, SQLite, secure store, local commands.", "Rust/Tauri.", "Rust and command contract tests."],
      ["apps/storefront-theme-or-blocks/pug-arcade-commerce-v2", "Branded WordPress/WooCommerce theme.", "WordPress theme APIs, WooCommerce templates.", "Theme packaging and public smoke tests."],
      ["scripts", "Build, test, deployment, packaging, production verification.", "Node, npm, SSH, WP-CLI.", "Script contract tests."],
    ]),
) + section("Source Code Index",
  "See `SOURCE_CODE_INDEX.md` for a generated file-level source index. The repository itself is the source-code package; the handover documents map the code rather than duplicating every source file.",
))

docs.set("release-package/SOURCE_CODE_COMMENTING_REPORT.md", header(
  "Source Code Commenting Report",
  "Report on source review, comments/docblocks, and remaining developer review areas.",
  "Developer, support technician",
) + credentialNotice() + section("Review Scope",
  `Reviewed source package structure and indexed ${sourceIndexRows.length} source/config/test files excluding generated dependencies, build caches, logs, release binaries, and local private environment files.`,
) + section("Files Updated In This Pass",
  table(["File", "Reason", "Comment/doc impact"],
    [
      ["scripts/package-production-release.mjs", "Include storefront theme and documentation in release bundle.", "Release packaging logic now documents the docs bundle copy step with focused comments."],
      ["scripts/tests/production-release-package-contract.mjs", "Assert release package includes storefront theme and documentation markers.", "Contract coverage updated."],
      ["release-package/*", "Client handover and technical documentation.", "New documentation set."],
      ["docs/API_ROUTES.md and related docs", "Support/developer reference.", "New documentation set."],
    ]),
) + section("Existing Documentation Style",
  "The PHP source already uses class headers and targeted PHPDoc in the main domain classes. JavaScript/TypeScript modules use descriptive names and contract tests. This pass avoided broad comment churn and added documentation where release behavior changed.",
) + section("Areas Still Needing Developer Review",
  table(["Area", "Status", "Recommendation"],
    [
      ["Large inline admin JavaScript inside AdminMenu.php", "Production functional but dense.", "Future refactor into separate asset modules with JSDoc and unit tests."],
      ["Offline app App.tsx", "Feature-rich single component surface.", "Future split into route/workspace components after release stabilization."],
      ["Provider adapters", "Documented and tested by contracts.", "Review comments when adding new live provider endpoints."],
      ["TopDeck create-event support", "Future/verify before use.", "Add comments/tests only when endpoint support is confirmed."],
    ]),
) + section("Open Items",
  table(["Item", "Status", "Notes"], openItems),
))

docs.set("release-package/SOURCE_CODE_INDEX.md", header(
  "Source Code Index",
  "Generated index of source/config/test files included in the repository handover.",
  "Developer and support technician",
) + credentialNotice() + section("Index Notes",
  "The index excludes generated dependencies, build artifacts, release binaries, logs, test results, local private environment files, and cache directories. Test coverage status is inferred from file path and related contract/unit/smoke test coverage.",
) + section("Files",
  table(["Path", "Purpose", "Type", "Coverage status"], sourceIndexRows),
))

docs.set("release-package/CHANGELOG.md", header(
  "Release Package Changelog",
  "Client-facing release history for the handover documentation package.",
  "Owner, manager, support technician",
) + section(`${version} - ${releaseDate}`,
  table(["Type", "Summary"],
    [
      ["Added", "Complete technical handover, owner guide, admin/staff guide, kiosk/offline guide, connector guide, database guide, sync guide, pricing/inventory guide, credit/buylist guide, events guide, POS/payments guide, security guide, runbook, backup guide, QA checklist, credential handoff, code map, and source index."],
      ["Changed", "Production release package builder now includes plugin, theme, LAN middleman, employee app, kiosk app, and documentation bundle."],
      ["Fixed", "Release handoff now includes checksum and install-order documentation."],
      ["Security", "Credential documentation uses placeholders/masked examples only and explicitly prohibits committed secrets."],
      ["Known issues", openItems.map((row) => `${row[0]}: ${row[1]}`).join("<br>")],
    ]),
))

docs.set("release-package/REVISION_LOG.md", header(
  "Release Package Revision Log",
  "Detailed revision tracking for documentation and package handoff changes.",
  "Owner, support technician, developer",
) + section("2026-06-17 01:20 ET - Documentation Package",
  table(["File changed", "Reason", "Summary", "Module", "Migration impact", "Test impact", "Rollback"],
    [
      ["release-package/*", "Client handover package requested.", "Created owner/admin/staff/developer support guides.", "Documentation", "None", "Generated docs searched for restricted terms/secrets.", "Remove folder or revert commit."],
      ["docs/API_ROUTES.md", "Support route map requested.", "Documented REST route groups and permissions.", "API", "None", "Docs only.", "Revert file."],
      ["docs/DATABASE_TABLES.md", "Schema reference requested.", "Documented custom table purposes and modules.", "Database", "None", "Docs only.", "Revert file."],
      ["scripts/package-production-release.mjs", "Full package must include docs/theme.", "Copies theme and documentation into production release bundle.", "Release packaging", "None", "Package contract run.", "Revert script and rerun package."],
      ["scripts/tests/production-release-package-contract.mjs", "Guard package contents.", "Added markers for theme and documentation.", "Packaging tests", "None", "Contract test run.", "Revert test."],
    ]),
))

docs.set("release-package/OPEN_ITEMS.md", header(
  "Open Items",
  "Transparent list of safe-for-production, blocked, and future enhancement items.",
  "Owner, manager, support technician",
) + section("Open Items",
  table(["Item", "Classification", "Notes"], openItems),
))

docs.set("docs/SYSTEM_MAP.md", header(
  "System Map",
  "Concise system map for the production platform.",
  "Owner, administrator, support technician",
) + credentialNotice() + section("System Diagram", architectureMermaid()) + section("Modules", moduleSummaryTable()))

docs.set("docs/API_ROUTES.md", header(
  "API Routes",
  "REST route reference for support and development.",
  "Developer and support technician",
) + credentialNotice() + section("Route Groups", table(["Area", "Method", "Route", "Purpose"], routeGroups)) + section("Authentication Notes",
  "Public read routes are limited to safe storefront data. Staff, manager, system, and device routes require WordPress authentication, application passwords, nonces, device pairing, or capability checks depending on route. Secrets are never returned by status or manifest endpoints.",
))

docs.set("docs/DATABASE_TABLES.md", header(
  "Database Tables",
  "Custom table overview for support and development.",
  "Developer and database administrator",
) + credentialNotice() + section("Tables", table(["Table", "Purpose", "Primary module"], customTables)))

docs.set("docs/BACKGROUND_JOBS.md", header(
  "Background Jobs",
  "Scheduled/background job reference.",
  "Administrator and support technician",
) + credentialNotice() + section("Jobs",
  table(["Job", "Schedule/trigger", "Purpose", "Where to check"],
    [
      ["Daily platform dispatch", "Scheduled daily, 9:00 AM America/New_York target for reference refresh.", "Runs scheduled platform work including ScryDex refresh planning.", "Health route and admin dashboard."],
      ["Reservation expiry", "Scheduled/triggered by WooCommerce reservation lifecycle.", "Releases stale cart/kiosk holds.", "Reservations table and WooCommerce cart/order logs."],
      ["Manual ScryDex index", "Admin initiated.", "Full or scoped provider pull by game/set/page.", "ScryDex catalog admin and sync logs."],
      ["Resume failed pull", "Admin initiated.", "Continues from checkpoint after failure.", "Sync checkpoints and errors."],
      ["Offline queue replay", "LAN server reconnect/interval.", "Pushes queued local app actions to WordPress.", "Local server queue status and WordPress offline queue/conflict tables."],
      ["Active sync verifier", "Release validation command.", "Verifies production connector flows before signoff.", "Command output and release reports."],
    ]),
))

docs.set("docs/CONNECTOR_STATUS.md", header(
  "Connector Status",
  "Connector readiness and ownership reference.",
  "Owner, administrator, support technician",
) + credentialNotice() + section("Connector Matrix",
  table(["Connector", "Current role", "Readiness notes", "Owner"],
    [
      ["ScryDex", "Primary card/set/price/image reference.", "Configured server-side; full pulls and resume are checkpointed.", "Owner/support"],
      ["WooCommerce", "Storefront products/cart/orders/checkout.", "Active with plugin hooks for serialized item reservation.", "Admin/support"],
      ["Square/POS", "Local POS/card reader support where configured.", "Terminal connector scaffold and receipt reference flow; live reader validation requires store hardware.", "Owner/support"],
      ["GoDaddy Payments", "WooCommerce gateway where configured.", "Managed through WooCommerce/GoDaddy settings.", "Owner/admin"],
      ["TopDeck", "Optional event connector.", "Documented as optional/gated; create-event support must be verified before use.", "Owner/support"],
      ["Email/SMTP", "Transactional emails.", "WordPress mail path implemented; SMTP provider must be configured for reliable production delivery.", "Owner/admin"],
      ["Local sync", "App/kiosk bridge.", "LAN middleman, queue, discovery, and WordPress bridge included in release package.", "Support/manager"],
    ]),
))

docs.set("docs/RELEASE_NOTES.md", header(
  "Release Notes",
  "Client-facing release notes for version handoff.",
  "Owner, manager, administrator, support technician",
) + credentialNotice() + section(`Release ${version}`,
  "This release packages the production WordPress/WooCommerce trading-card store platform with the custom inventory plugin, storefront theme, local middleman server, employee app installer package, customer kiosk installer package, and full handover documentation prepared by JC Electronics.",
) + section("Major Features",
  moduleSummaryTable(),
) + section("Installation Notes",
  list([
    "Use `releases/0.202.0/the-pug-production-release-0.202.0.zip` as the complete installable handoff.",
    "Verify checksum before installation.",
    "Install plugin and theme before local app/kiosk deployment.",
    "Configure credentials through secure channels only.",
    "Run production active sync verification before owner signoff.",
  ]),
) + section("Known Limitations",
  table(["Item", "Status", "Notes"], openItems),
) + section("Support Contact",
  "Support and maintenance are provided by JC Electronics according to the active service agreement.",
))

for (const [path, content] of docs.entries()) {
  writeDoc(path, content)
}

writeDoc("release-package/env/production.env.example", [
  "# Created by JC Electronics",
  "# Production placeholder template. Do not enter real credentials in GitHub.",
  "APP_ENV=production",
  "PAYMENT_MODE=production",
  "SCRYDEX_TEAM_ID=replace_with_secure_value",
  "SCRYDEX_API_KEY=replace_with_secure_value",
  "SCRYDEX_SECONDARY_API_KEY=replace_with_secure_value",
  "TOPDECK_API_KEY=replace_with_secure_value",
  "SQUARE_ACCESS_TOKEN=replace_with_secure_value",
  "SQUARE_LOCATION_ID=replace_with_secure_value",
  "GODADDY_PAYMENTS_ACCOUNT_ID=replace_with_secure_value",
  "SMTP_HOST=smtp.example.com",
  "SMTP_USER=replace_with_secure_value",
  "SMTP_PASSWORD=replace_with_secure_value",
  "WEBHOOK_SIGNING_SECRET=replace_with_secure_value",
  "",
].join("\n"))

writeDoc("release-package/env/local-sync.env.example", [
  "# Created by JC Electronics",
  "# LAN middleman placeholder template. Do not enter real credentials in GitHub.",
  "LOCAL_SYNC_HOST=0.0.0.0",
  "LOCAL_SYNC_PORT=8787",
  "LOCAL_SYNC_SERVER_URL=http://STORE-SERVER-IP:8787",
  "LOCAL_SYNC_SQLITE_PATH=store-sync.sqlite",
  "LOCAL_SYNC_WORDPRESS_PUSH_ENABLED=false",
  "PUG_WORDPRESS_URL=https://example-store.com",
  "PUG_WORDPRESS_REST_BASE=/wp-json/tcg-store/v1",
  "PUG_WORDPRESS_USERNAME=replace_with_secure_value",
  "PUG_WORDPRESS_APP_PASSWORD=replace_with_secure_value",
  "PUG_SQUARE_ENVIRONMENT=sandbox_or_production",
  "PUG_SQUARE_LOCATION_ID=replace_with_secure_value",
  "PUG_SQUARE_ACCESS_TOKEN=replace_with_secure_value",
  "PUG_SQUARE_TERMINAL_DEVICE_ID=replace_with_secure_value",
  "",
].join("\n"))

writeDoc("release-package/env/offline-app.env.example", [
  "# Created by JC Electronics",
  "# App placeholder template. Most device secrets should be stored in the app secure store.",
  "APP_ENV=production",
  "PUG_LOCAL_SYNC_DISCOVERY_PROTOCOL=pug-local-sync-discovery-v1",
  "PUG_LOCAL_SYNC_DISCOVERY_PORT=8788",
  "PUG_LOCAL_SYNC_SERVER_URL=http://STORE-SERVER-IP:8787",
  "PUG_OFFLINE_PAIRING_CODE=replace_with_secure_value",
  "KIOSK_DEVICE_TOKEN=replace_with_secure_value",
  "",
].join("\n"))

function checklist(items) {
  return items.map((item) => `- [ ] ${item}`).join("\n") + "\n"
}
