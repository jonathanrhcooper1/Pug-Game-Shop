import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { listenLocalSyncHttpServer } from "./localSyncHttpServer.mjs"
import { createWordPressCatalogFallback } from "./wordpressCatalogFallback.mjs"
import { createWordPressCreditPush } from "./wordpressCreditPush.mjs"
import { createWordPressEventCheckinPush } from "./wordpressEventCheckinPush.mjs"
import { createWordPressCustomerUpsertPush } from "./wordpressCustomerUpsertPush.mjs"
import { createWordPressEventRegistrationPush } from "./wordpressEventRegistrationPush.mjs"
import { createWordPressInventoryPull } from "./wordpressInventoryPull.mjs"
import { createWordPressInventoryPush } from "./wordpressInventoryPush.mjs"
import { createWordPressKioskOrderPush } from "./wordpressKioskOrderPush.mjs"

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = resolve(appRoot, "..", "..")

loadLocalEnv([
  resolve(repoRoot, ".env.local-sync"),
  resolve(appRoot, ".env.local"),
  resolve(repoRoot, ".env.local"),
])

const host = firstEnv("LOCAL_SYNC_HOST", "PUG_LOCAL_SYNC_HOST") ?? "127.0.0.1"
const port = firstEnv("LOCAL_SYNC_PORT", "PUG_LOCAL_SYNC_PORT") ?? "8787"
const databasePath = firstEnv("LOCAL_SYNC_SQLITE_PATH", "PUG_LOCAL_SYNC_DB")
const serverUrl = firstEnv("LOCAL_SYNC_SERVER_URL", "PUG_LOCAL_SYNC_PUBLIC_URL") ?? `http://${host}:${port}`
const websiteUrl = firstEnv("PUG_WORDPRESS_URL", "LOCAL_SYNC_WORDPRESS_URL")
const restBasePath = firstEnv("PUG_WORDPRESS_REST_BASE", "LOCAL_SYNC_WORDPRESS_REST_BASE")
const wordpressPushEnabled = envFlag("LOCAL_SYNC_WORDPRESS_PUSH_ENABLED", "PUG_LOCAL_SYNC_WORDPRESS_PUSH_ENABLED")
const removeSeedReferenceCards = !envFlag("LOCAL_SYNC_ALLOW_DEMO_REFERENCE_CARDS")
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
const eventsUsername = firstEnv("PUG_WORDPRESS_EVENTS_USERNAME", "PUG_WORDPRESS_USERNAME")
const eventsApplicationPassword = firstEnv("PUG_WORDPRESS_EVENTS_APPLICATION_PASSWORD", "PUG_WORDPRESS_APP_PASSWORD")
const eventsAuthHeader = firstEnv("PUG_WORDPRESS_EVENTS_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
const creditUsername = firstEnv("PUG_WORDPRESS_CREDIT_USERNAME", "PUG_WORDPRESS_USERNAME")
const creditApplicationPassword = firstEnv("PUG_WORDPRESS_CREDIT_APPLICATION_PASSWORD", "PUG_WORDPRESS_APP_PASSWORD")
const creditAuthHeader = firstEnv("PUG_WORDPRESS_CREDIT_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
const customerUsername = firstEnv("PUG_WORDPRESS_CUSTOMERS_USERNAME", "PUG_WORDPRESS_USERNAME")
const customerApplicationPassword = firstEnv(
  "PUG_WORDPRESS_CUSTOMERS_APPLICATION_PASSWORD",
  "PUG_WORDPRESS_APP_PASSWORD",
)
const customerAuthHeader = firstEnv("PUG_WORDPRESS_CUSTOMERS_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
const kioskUsername = firstEnv("PUG_WORDPRESS_KIOSK_USERNAME", "PUG_WORDPRESS_USERNAME")
const kioskApplicationPassword = firstEnv("PUG_WORDPRESS_KIOSK_APPLICATION_PASSWORD", "PUG_WORDPRESS_APP_PASSWORD")
const kioskAuthHeader = firstEnv("PUG_WORDPRESS_KIOSK_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
const websiteCatalogFallback = createWordPressCatalogFallback({
  websiteUrl,
  restBasePath,
  authHeader: catalogAuthHeader,
  username: catalogUsername,
  applicationPassword: catalogApplicationPassword,
})
const wordpressInventoryPush = wordpressPushEnabled
  ? createWordPressInventoryPush({
      websiteUrl,
      restBasePath,
      authHeader: inventoryAuthHeader ?? catalogAuthHeader,
      username: inventoryUsername ?? catalogUsername,
      applicationPassword: inventoryApplicationPassword ?? catalogApplicationPassword,
      defaultLocationId: process.env.PUG_WORDPRESS_DEFAULT_LOCATION_ID,
    })
  : null
const wordpressInventoryPull = createWordPressInventoryPull({
  websiteUrl,
  restBasePath,
  authHeader: inventoryAuthHeader ?? catalogAuthHeader,
  username: inventoryUsername ?? catalogUsername,
  applicationPassword: inventoryApplicationPassword ?? catalogApplicationPassword,
  pageSize: process.env.PUG_WORDPRESS_PULL_PAGE_SIZE,
})
const wordpressEventRegistrationPush = wordpressPushEnabled
  ? createWordPressEventRegistrationPush({
      websiteUrl,
      restBasePath,
      authHeader: eventsAuthHeader ?? catalogAuthHeader,
      username: eventsUsername ?? catalogUsername,
      applicationPassword: eventsApplicationPassword ?? catalogApplicationPassword,
    })
  : null
const wordpressEventCheckinPush = wordpressPushEnabled
  ? createWordPressEventCheckinPush({
      websiteUrl,
      restBasePath,
      authHeader: eventsAuthHeader ?? catalogAuthHeader,
      username: eventsUsername ?? catalogUsername,
      applicationPassword: eventsApplicationPassword ?? catalogApplicationPassword,
    })
  : null
const wordpressCreditPush = wordpressPushEnabled
  ? createWordPressCreditPush({
      websiteUrl,
      restBasePath,
      authHeader: creditAuthHeader ?? catalogAuthHeader,
      username: creditUsername ?? catalogUsername,
      applicationPassword: creditApplicationPassword ?? catalogApplicationPassword,
    })
  : null
const wordpressCustomerUpsertPush = wordpressPushEnabled
  ? createWordPressCustomerUpsertPush({
      websiteUrl,
      restBasePath,
      authHeader: customerAuthHeader ?? catalogAuthHeader,
      username: customerUsername ?? catalogUsername,
      applicationPassword: customerApplicationPassword ?? catalogApplicationPassword,
    })
  : null
const wordpressKioskOrderPush = wordpressPushEnabled
  ? createWordPressKioskOrderPush({
      websiteUrl,
      restBasePath,
      authHeader: kioskAuthHeader ?? catalogAuthHeader,
      username: kioskUsername ?? catalogUsername,
      applicationPassword: kioskApplicationPassword ?? catalogApplicationPassword,
    })
  : null
const server = await listenLocalSyncHttpServer({
  host,
  port,
  serverUrl,
  websiteUrl,
  restBasePath,
  localDatabase: "store-sync.sqlite",
  storeOptions: {
    databasePath,
    removeSeedReferenceCards,
    websiteCatalogFallback,
    wordpressInventoryPull,
    wordpressInventoryPush,
    wordpressEventRegistrationPush,
    wordpressEventCheckinPush,
    wordpressCreditPush,
    wordpressCustomerUpsertPush,
    wordpressKioskOrderPush,
  },
})
const address = server.address()
const resolvedPort = typeof address === "object" && address ? address.port : port

console.log(`Pug local sync server listening on http://${host}:${resolvedPort}`)
console.log(`Website: ${websiteUrl || "not configured"}`)
console.log(`WordPress push enabled: ${wordpressPushEnabled ? "true" : "false"}`)
console.log("Credentials printed: false")

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

function firstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim()
    }
  }

  return undefined
}

function envFlag(...keys) {
  const value = firstEnv(...keys)

  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase())
}
