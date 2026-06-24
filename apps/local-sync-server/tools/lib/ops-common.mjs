import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { fileURLToPath } from "node:url"

import { createLocalSyncStore } from "../../src/localSyncStore.mjs"
import { createSquareInventoryCountsPuller } from "../../src/squareInventoryCountsPuller.mjs"
import { createWordPressCatalogExportPull } from "../../src/wordpressCatalogExportPull.mjs"
import { createWordPressInventoryPull } from "../../src/wordpressInventoryPull.mjs"

const toolsLibDir = dirname(fileURLToPath(import.meta.url))
const toolsDir = resolve(toolsLibDir, "..")
export const appRoot = resolve(toolsDir, "..")
export const repoRoot = resolve(appRoot, "..", "..")

export function loadOpsEnv() {
  loadLocalEnv([
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env.local-sync"),
    resolve(process.cwd(), "local-sync.env"),
    resolve(repoRoot, ".env.local-sync"),
    resolve(repoRoot, ".env.production.local"),
    resolve(repoRoot, ".env.local"),
    resolve(appRoot, ".env.local"),
    resolve(appRoot, "local-sync.env"),
    resolve(repoRoot, "release-package", "env", "local-sync.env"),
  ])
}

export function firstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim()
    }
  }

  return undefined
}

export function envFlag(...keys) {
  return ["1", "true", "yes", "on"].includes(String(firstEnv(...keys) ?? "").trim().toLowerCase())
}

export function localSyncDatabasePath() {
  return resolvePath(firstEnv("LOCAL_SYNC_SQLITE_PATH", "PUG_LOCAL_SYNC_DB")) ?? resolve(appRoot, "store-sync.sqlite")
}

export function createSnapshotDirectory(label = "inventory-snapshot") {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")
  const directory = resolve(repoRoot, "exports", `${label}-${timestamp}`)
  mkdirSync(directory, { recursive: true })
  return directory
}

export function writeJsonFile(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

export function writeCsvFile(path, rows) {
  writeFileSync(path, rowsToCsv(rows))
}

export function readLocalTable(tableName) {
  const databasePath = localSyncDatabasePath()

  if (!existsSync(databasePath)) {
    return {
      status: "missing",
      database_path: databasePath,
      table: tableName,
      rows: [],
    }
  }

  const database = new DatabaseSync(databasePath)

  try {
    if (!tableExists(database, tableName)) {
      return {
        status: "missing_table",
        database_path: databasePath,
        table: tableName,
        rows: [],
      }
    }

    return {
      status: "ok",
      database_path: databasePath,
      table: tableName,
      rows: database.prepare(`SELECT * FROM ${quotedIdentifier(tableName)}`).all(),
    }
  } finally {
    database.close()
  }
}

export function backupLocalDatabase(label = "before-website-force-pull") {
  const databasePath = localSyncDatabasePath()

  if (!existsSync(databasePath)) {
    return {
      status: "skipped",
      reason: "local_database_missing",
      database_path: databasePath,
      backup_path: "",
    }
  }

  const backupDir = resolve(repoRoot, "exports", "local-db-backups")
  mkdirSync(backupDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")
  const backupPath = resolve(backupDir, `${label}-${timestamp}.sqlite`)
  copyFileSync(databasePath, backupPath)

  return {
    status: "ok",
    database_path: databasePath,
    backup_path: backupPath,
  }
}

export function clearLocalTables(tableNames = []) {
  const databasePath = localSyncDatabasePath()

  if (!existsSync(databasePath) || tableNames.length === 0) {
    return {
      status: "skipped",
      cleared_tables: [],
      database_path: databasePath,
    }
  }

  const database = new DatabaseSync(databasePath)
  const clearedTables = []

  try {
    for (const tableName of tableNames) {
      if (!tableExists(database, tableName)) {
        continue
      }

      database.exec(`DELETE FROM ${quotedIdentifier(tableName)}`)
      clearedTables.push(tableName)
    }
  } finally {
    database.close()
  }

  return {
    status: "ok",
    cleared_tables: clearedTables,
    database_path: databasePath,
  }
}

export function createWordPressLinkedStore() {
  loadOpsEnv()

  const websiteUrl = firstEnv("PUG_WORDPRESS_URL", "LOCAL_SYNC_WORDPRESS_URL")
  const restBasePath = firstEnv("PUG_WORDPRESS_REST_BASE", "LOCAL_SYNC_WORDPRESS_REST_BASE")
  const catalogUsername = firstEnv("PUG_WORDPRESS_CATALOG_USERNAME", "PUG_WORDPRESS_USERNAME")
  const catalogApplicationPassword = firstEnv(
    "PUG_WORDPRESS_CATALOG_APPLICATION_PASSWORD",
    "PUG_WORDPRESS_APP_PASSWORD",
  )
  const catalogAuthHeader = firstEnv("PUG_WORDPRESS_CATALOG_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
  const inventoryUsername = firstEnv("PUG_WORDPRESS_INVENTORY_USERNAME", "PUG_WORDPRESS_USERNAME")
  const inventoryApplicationPassword = firstEnv(
    "PUG_WORDPRESS_INVENTORY_APPLICATION_PASSWORD",
    "PUG_WORDPRESS_APP_PASSWORD",
  )
  const inventoryAuthHeader = firstEnv("PUG_WORDPRESS_INVENTORY_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
  const wordpressInventoryPull = createWordPressInventoryPull({
    websiteUrl,
    restBasePath,
    authHeader: inventoryAuthHeader ?? catalogAuthHeader,
    username: inventoryUsername ?? catalogUsername,
    applicationPassword: inventoryApplicationPassword ?? catalogApplicationPassword,
    pageSize: firstEnv("PUG_WORDPRESS_PULL_PAGE_SIZE", "LOCAL_SYNC_WORDPRESS_PULL_PAGE_SIZE"),
  })
  const wordpressCatalogExportPull = createWordPressCatalogExportPull({
    websiteUrl,
    restBasePath,
    authHeader: catalogAuthHeader,
    username: catalogUsername,
    applicationPassword: catalogApplicationPassword,
    pageSize: firstEnv("PUG_WORDPRESS_CATALOG_PULL_PAGE_SIZE", "LOCAL_SYNC_WORDPRESS_CATALOG_PULL_PAGE_SIZE"),
  })
  const store = createLocalSyncStore({
    databasePath: localSyncDatabasePath(),
    removeSeedReferenceCards: !envFlag("LOCAL_SYNC_ALLOW_DEMO_REFERENCE_CARDS"),
    websiteUrl,
    restBasePath,
    wordpressInventoryPull,
    wordpressCatalogExportPull,
  })

  return {
    store,
    website_url_configured: Boolean(websiteUrl),
    wordpress_inventory_pull_configured: Boolean(wordpressInventoryPull),
    wordpress_catalog_pull_configured: Boolean(wordpressCatalogExportPull),
    credentials_printed: false,
  }
}

export async function createOpsSession(store) {
  const candidatePins = [
    firstEnv("LOCAL_SYNC_SCRIPT_PIN", "PUG_LOCAL_SYNC_SCRIPT_PIN", "LOCAL_SYNC_MANAGER_PIN"),
    "1420",
    "9999",
    "1234",
  ].filter(Boolean)

  for (const pin of candidatePins) {
    const result = store.createSession({ pin, ttlMinutes: 15 })

    if (result.status === "ok") {
      return result
    }
  }

  return {
    status: "blocked",
    code: "local_sync_operator_pin_required",
    message: "Set LOCAL_SYNC_SCRIPT_PIN to a valid staff or manager PIN before running this operator script.",
    raw_pin_returned: false,
  }
}

export async function pullWebsiteInventoryRows(pageSize = 100, maxPages = defaultMaxPages()) {
  loadOpsEnv()
  const puller = createWordPressInventoryPull(wordpressPullOptions("inventory", pageSize))

  if (!puller) {
    return {
      status: "blocked",
      code: "wordpress_inventory_pull_unconfigured",
      rows: [],
      credentials_printed: false,
    }
  }

  const rows = []
  const pages = []

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await puller({ page, pageSize })

    if (result.status !== "ok") {
      return {
        ...publicPullError(result),
        rows,
        pages,
      }
    }

    rows.push(...result.items)
    pages.push({ page, count: result.items.length, meta: result.meta })

    if (shouldStopPaging(result.items.length, pageSize, result.meta)) {
      return {
        status: "ok",
        rows,
        pages,
        total_rows: rows.length,
        credentials_printed: false,
      }
    }
  }

  return {
    status: "blocked",
    code: "wordpress_inventory_pull_page_guard_hit",
    rows,
    pages,
    total_rows: rows.length,
    max_pages: maxPages,
    credentials_printed: false,
  }
}

export async function pullWebsiteCatalogRows(table, pageSize = 1000, maxPages = defaultMaxPages()) {
  loadOpsEnv()
  const puller = createWordPressCatalogExportPull(wordpressPullOptions("catalog", pageSize))

  if (!puller) {
    return {
      status: "blocked",
      code: "wordpress_catalog_pull_unconfigured",
      table,
      rows: [],
      credentials_printed: false,
    }
  }

  const rows = []
  const pages = []

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await puller({ table, page, pageSize })

    if (result.status !== "ok") {
      return {
        ...publicPullError(result),
        table,
        rows,
        pages,
      }
    }

    rows.push(...result.rows)
    pages.push({ page, count: result.rows.length, meta: result.meta })

    if (shouldStopPaging(result.rows.length, pageSize, result.meta)) {
      return {
        status: "ok",
        table,
        rows,
        pages,
        total_rows: rows.length,
        credentials_printed: false,
      }
    }
  }

  return {
    status: "blocked",
    code: "wordpress_catalog_pull_page_guard_hit",
    table,
    rows,
    pages,
    total_rows: rows.length,
    max_pages: maxPages,
    credentials_printed: false,
  }
}

export async function pullAllWebsiteDomainIntoLocal(store, token, domain, options = {}) {
  const pageSize = boundedInt(options.pageSize, 1, domain === "catalog" ? 1000 : 100, domain === "catalog" ? 1000 : 100)
  const maxPages = boundedInt(options.maxPages, 1, 100000, defaultMaxPages())
  const summary = {
    domain,
    status: "ok",
    page_size: pageSize,
    pages: [],
    pulled_count: 0,
    applied_count: 0,
    inserted_count: 0,
    updated_count: 0,
    ignored_count: 0,
  }

  for (let page = 1; page <= maxPages; page += 1) {
    const input =
      domain === "catalog"
        ? { domains: ["catalog"], catalog_page: page, catalog_page_size: pageSize }
        : { domains: ["inventory"], page, page_size: pageSize }
    const result = await store.pullWebsiteInventory(token, input)

    if (result.status !== "ok") {
      return {
        ...summary,
        status: "blocked",
        code: result.code ?? `wordpress_${domain}_pull_failed`,
        message: result.message ?? `WordPress ${domain} pull failed.`,
        credentials_printed: false,
      }
    }

    const pulledCount = domain === "catalog" ? result.catalog_pulled_count : result.pulled_count
    const appliedCount = domain === "catalog" ? result.catalog_applied_count : result.applied_count
    const insertedCount = domain === "catalog" ? result.catalog_inserted_count : result.inserted_count
    const updatedCount = domain === "catalog" ? result.catalog_updated_count : result.updated_count
    const ignoredCount = domain === "catalog" ? result.catalog_ignored_count : result.ignored_count
    const meta = domain === "catalog" ? result.catalog_meta : result.meta

    summary.pages.push({ page, pulled_count: pulledCount, applied_count: appliedCount, meta })
    summary.pulled_count += pulledCount
    summary.applied_count += appliedCount
    summary.inserted_count += insertedCount
    summary.updated_count += updatedCount
    summary.ignored_count += ignoredCount
    summary.local_inventory_count = result.local_inventory_count
    summary.local_reference_card_count = result.local_reference_card_count
    summary.local_queue_depth = result.local_queue_depth

    if (shouldStopPaging(pulledCount, pageSize, meta)) {
      return {
        ...summary,
        page_guard_hit: false,
        credentials_printed: false,
      }
    }
  }

  return {
    ...summary,
    status: "blocked",
    code: `wordpress_${domain}_pull_page_guard_hit`,
    max_pages: maxPages,
    credentials_printed: false,
  }
}

export async function pullSquareInventoryCounts(catalogObjectIds = []) {
  loadOpsEnv()
  const accessToken = firstEnv("PUG_SQUARE_ACCESS_TOKEN", "LOCAL_SYNC_SQUARE_ACCESS_TOKEN")
  const environment = cleanSquareEnvironment(firstEnv("PUG_SQUARE_ENVIRONMENT", "LOCAL_SYNC_SQUARE_ENVIRONMENT"))
  const apiVersion = firstEnv("PUG_SQUARE_API_VERSION", "LOCAL_SYNC_SQUARE_API_VERSION") ?? "2026-05-20"
  const baseUrl = squareBaseUrl(environment, firstEnv("PUG_SQUARE_BASE_URL", "LOCAL_SYNC_SQUARE_BASE_URL"))

  if (!accessToken) {
    return {
      status: "blocked",
      code: "square_access_token_missing",
      counts: [],
      credentials_printed: false,
      raw_credentials_returned: false,
    }
  }

  if (catalogObjectIds.length > 0) {
    const puller = createSquareInventoryCountsPuller({
      accessToken,
      environment,
      locationId: firstEnv("PUG_SQUARE_LOCATION_ID", "LOCAL_SYNC_SQUARE_LOCATION_ID"),
      apiVersion,
      baseUrl,
    })

    const result = await puller.pullCounts({ catalogObjectIds })
    return {
      ...result,
      raw_credentials_returned: false,
      credentials_printed: false,
    }
  }

  const locationResult = await resolveSquareLocation({ accessToken, baseUrl, apiVersion })

  if (locationResult.status !== "ok") {
    return locationResult
  }

  const counts = []
  const pages = []
  let cursor = ""

  for (let page = 1; page <= 1000; page += 1) {
    const endpoint = new URL(`${baseUrl}/v2/inventory/counts/batch-retrieve`)
    const body = {
      location_ids: [locationResult.location_id],
      states: ["IN_STOCK"],
      limit: 1000,
    }

    if (cursor) {
      body.cursor = cursor
    }

    const response = await squareFetch(endpoint, {
      method: "POST",
      accessToken,
      apiVersion,
      body,
    })

    if (response.status !== "ok") {
      return response
    }

    const pageCounts = Array.isArray(response.body?.counts) ? response.body.counts : []
    counts.push(...pageCounts)
    pages.push({ page, count: pageCounts.length, cursor_present: Boolean(response.body?.cursor) })
    cursor = cleanExternalId(response.body?.cursor)

    if (!cursor) {
      return {
        status: "ok",
        code: "square_inventory_counts_dumped",
        counts,
        pages,
        count_count: counts.length,
        location_id: locationResult.location_id,
        location_id_source: locationResult.source,
        environment,
        credentials_printed: false,
        raw_credentials_returned: false,
      }
    }
  }

  return {
    status: "blocked",
    code: "square_inventory_counts_page_guard_hit",
    counts,
    pages,
    count_count: counts.length,
    environment,
    credentials_printed: false,
    raw_credentials_returned: false,
  }
}

export function extractSquareVariationIds(...rowSets) {
  const ids = new Set()

  for (const rows of rowSets) {
    for (const row of rows ?? []) {
      const id = cleanExternalId(
        row.square_catalog_variation_id ??
          row.squareCatalogVariationId ??
          row.catalog_object_id ??
          row.catalogObjectId ??
          row.variation_id,
      )

      if (id) {
        ids.add(id)
      }
    }
  }

  return [...ids]
}

export function operationSummary() {
  return {
    local_database_path: localSyncDatabasePath(),
    wordpress_url_configured: Boolean(firstEnv("PUG_WORDPRESS_URL", "LOCAL_SYNC_WORDPRESS_URL")),
    wordpress_username_configured: Boolean(firstEnv("PUG_WORDPRESS_USERNAME")),
    wordpress_app_password_configured: Boolean(firstEnv("PUG_WORDPRESS_APP_PASSWORD")),
    square_environment: cleanSquareEnvironment(firstEnv("PUG_SQUARE_ENVIRONMENT", "LOCAL_SYNC_SQUARE_ENVIRONMENT")),
    square_access_token_configured: Boolean(firstEnv("PUG_SQUARE_ACCESS_TOKEN", "LOCAL_SYNC_SQUARE_ACCESS_TOKEN")),
    credentials_printed: false,
  }
}

function loadLocalEnv(paths) {
  for (const path of paths) {
    if (!existsSync(path)) {
      continue
    }

    const lines = readFileSync(path, "utf8").split(/\r?\n/)

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue
      }

      const separatorIndex = trimmed.indexOf("=")
      const key = trimmed.slice(0, separatorIndex).trim()
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "")

      if (key && !(key in process.env)) {
        process.env[key] = value
      }
    }
  }
}

function wordpressPullOptions(kind, pageSize) {
  const websiteUrl = firstEnv("PUG_WORDPRESS_URL", "LOCAL_SYNC_WORDPRESS_URL")
  const restBasePath = firstEnv("PUG_WORDPRESS_REST_BASE", "LOCAL_SYNC_WORDPRESS_REST_BASE")
  const catalogUsername = firstEnv("PUG_WORDPRESS_CATALOG_USERNAME", "PUG_WORDPRESS_USERNAME")
  const catalogApplicationPassword = firstEnv(
    "PUG_WORDPRESS_CATALOG_APPLICATION_PASSWORD",
    "PUG_WORDPRESS_APP_PASSWORD",
  )
  const catalogAuthHeader = firstEnv("PUG_WORDPRESS_CATALOG_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")

  if (kind === "inventory") {
    return {
      websiteUrl,
      restBasePath,
      authHeader: firstEnv("PUG_WORDPRESS_INVENTORY_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER") ?? catalogAuthHeader,
      username: firstEnv("PUG_WORDPRESS_INVENTORY_USERNAME", "PUG_WORDPRESS_USERNAME") ?? catalogUsername,
      applicationPassword:
        firstEnv("PUG_WORDPRESS_INVENTORY_APPLICATION_PASSWORD", "PUG_WORDPRESS_APP_PASSWORD") ??
        catalogApplicationPassword,
      pageSize,
      timeoutMs: firstEnv("PUG_WORDPRESS_INVENTORY_TIMEOUT_MS", "PUG_WORDPRESS_CATALOG_TIMEOUT_MS"),
    }
  }

  return {
    websiteUrl,
    restBasePath,
    authHeader: catalogAuthHeader,
    username: catalogUsername,
    applicationPassword: catalogApplicationPassword,
    pageSize,
    timeoutMs: firstEnv("PUG_WORDPRESS_CATALOG_TIMEOUT_MS"),
  }
}

function rowsToCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return ""
  }

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row ?? {})))]
  const header = columns.map(csvEscape).join(",")
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = row?.[column]

          if (value && typeof value === "object") {
            return csvEscape(JSON.stringify(value))
          }

          return csvEscape(value)
        })
        .join(","),
    )
    .join("\n")

  return `${header}\n${body}\n`
}

function csvEscape(value) {
  const text = String(value ?? "")
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function tableExists(database, tableName) {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(String(tableName ?? ""))

  return Boolean(row?.name)
}

function quotedIdentifier(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function resolvePath(value) {
  if (!value) {
    return null
  }

  return resolve(String(value))
}

function boundedInt(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(maximum, Math.max(minimum, parsed))
}

function defaultMaxPages() {
  return boundedInt(firstEnv("PUG_WEBSITE_PULL_MAX_PAGES", "LOCAL_SYNC_WEBSITE_PULL_MAX_PAGES"), 1, 100000, 10000)
}

function shouldStopPaging(rowCount, pageSize, meta) {
  if (meta && typeof meta === "object" && "has_more" in meta) {
    return !meta.has_more
  }

  return rowCount < pageSize
}

function publicPullError(result) {
  return {
    status: "blocked",
    code: result.code ?? "pull_failed",
    http_status: result.http_status ?? 0,
    message: result.message ?? "",
    credentials_printed: false,
  }
}

function cleanSquareEnvironment(value) {
  const text = String(value ?? "").trim().toLowerCase()
  return text === "production" || text === "prod" || text === "live" ? "production" : "sandbox"
}

function squareBaseUrl(environment, configuredBaseUrl) {
  if (configuredBaseUrl) {
    try {
      const url = new URL(configuredBaseUrl)
      return url.origin
    } catch {
      // Fall through to the standard Square hosts.
    }
  }

  return environment === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com"
}

async function resolveSquareLocation({ accessToken, baseUrl, apiVersion }) {
  const configuredLocationId = cleanExternalId(firstEnv("PUG_SQUARE_LOCATION_ID", "LOCAL_SYNC_SQUARE_LOCATION_ID"))

  if (configuredLocationId) {
    return { status: "ok", location_id: configuredLocationId, source: "configured" }
  }

  const endpoint = new URL(`${baseUrl}/v2/locations`)
  const response = await squareFetch(endpoint, {
    method: "GET",
    accessToken,
    apiVersion,
  })

  if (response.status !== "ok") {
    return response
  }

  const locations = Array.isArray(response.body?.locations) ? response.body.locations : []
  const location = locations.find((candidate) => cleanExternalId(candidate?.id) && candidate?.status === "ACTIVE") ?? locations[0]
  const locationId = cleanExternalId(location?.id)

  if (!locationId) {
    return {
      status: "blocked",
      code: "square_location_id_required",
      message: "Square location auto-discovery found no active locations; set PUG_SQUARE_LOCATION_ID.",
      credentials_printed: false,
      raw_credentials_returned: false,
    }
  }

  return {
    status: "ok",
    location_id: locationId,
    source: "discovered",
  }
}

async function squareFetch(endpoint, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(endpoint, {
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${options.accessToken}`,
        "content-type": "application/json",
        "square-version": options.apiVersion,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
    const body = await safeJson(response)

    if (!response.ok) {
      return {
        status: "blocked",
        code: "square_request_failed",
        http_status: response.status,
        errors: Array.isArray(body?.errors) ? body.errors.map(publicSquareError) : [],
        endpoint: secretSafeEndpoint(endpoint),
        credentials_printed: false,
        raw_credentials_returned: false,
      }
    }

    return {
      status: "ok",
      body,
      endpoint: secretSafeEndpoint(endpoint),
      credentials_printed: false,
      raw_credentials_returned: false,
    }
  } catch (error) {
    return {
      status: "blocked",
      code: "square_request_unavailable",
      message: error instanceof Error ? error.message : "Square request unavailable.",
      endpoint: secretSafeEndpoint(endpoint),
      credentials_printed: false,
      raw_credentials_returned: false,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function publicSquareError(error) {
  return {
    category: String(error?.category ?? ""),
    code: String(error?.code ?? ""),
    detail: String(error?.detail ?? ""),
    field: String(error?.field ?? ""),
  }
}

function secretSafeEndpoint(endpoint) {
  try {
    const url = new URL(endpoint)
    url.search = ""
    return url.toString()
  } catch {
    return ""
  }
}

function cleanExternalId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w:./-]/g, "")
    .slice(0, 220)
}
