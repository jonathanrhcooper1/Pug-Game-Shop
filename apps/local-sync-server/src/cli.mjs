import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { listenLocalSyncHttpServer } from "./localSyncHttpServer.mjs"
import { createWordPressCatalogExportPull } from "./wordpressCatalogExportPull.mjs"
import { createWordPressCatalogFallback } from "./wordpressCatalogFallback.mjs"
import { createWordPressCatalogIndexer } from "./wordpressCatalogIndex.mjs"
import { createWordPressCreditPush } from "./wordpressCreditPush.mjs"
import { createWordPressEventCheckinPush } from "./wordpressEventCheckinPush.mjs"
import { createWordPressCustomerUpsertPush } from "./wordpressCustomerUpsertPush.mjs"
import { createWordPressEventRegistrationPush } from "./wordpressEventRegistrationPush.mjs"
import { createWordPressEventUpsertPush } from "./wordpressEventUpsertPush.mjs"
import { createWordPressEventsPull } from "./wordpressEventsPull.mjs"
import {
  createWordPressFulfillmentPull,
  createWordPressFulfillmentStatusPush,
} from "./wordpressFulfillmentPull.mjs"
import { createWordPressInventoryPull } from "./wordpressInventoryPull.mjs"
import {
  createWordPressInventoryPush,
  createWordPressInventorySalePush,
  createWordPressInventoryUpdatePush,
} from "./wordpressInventoryPush.mjs"
import { createWordPressKioskOrderPush } from "./wordpressKioskOrderPush.mjs"
import { createWordPressReportsPull } from "./wordpressReportsPull.mjs"
import { listenLocalSyncDiscoveryResponder } from "./localSyncDiscovery.mjs"
import { createGradedPricingLookup } from "./gradedPricingProviders.mjs"
import { createSquareInventoryCountsPuller } from "./squareInventoryCountsPuller.mjs"
import { createSquareSalesReportsPuller } from "./squareSalesReportsPuller.mjs"
import { createSquareTerminalConnector } from "./squareTerminalConnector.mjs"
import { createScryDexVisionIdentifier } from "./scrydexVisionIdentifier.mjs"
import { resolveLanListenHost, resolveLanPublicServerUrl } from "./lanServerUrl.mjs"

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const repoRoot = resolve(appRoot, "..", "..")

loadLocalEnv([
  resolve(repoRoot, ".env.local-sync"),
  resolve(appRoot, ".env.local"),
  resolve(repoRoot, ".env.local"),
])

const host = resolveLanListenHost(firstEnv("LOCAL_SYNC_HOST", "PUG_LOCAL_SYNC_HOST"))
const port = firstEnv("LOCAL_SYNC_PORT", "PUG_LOCAL_SYNC_PORT") ?? "8787"
const discoveryEnabled = !envFlag("LOCAL_SYNC_DISCOVERY_DISABLED", "PUG_LOCAL_SYNC_DISCOVERY_DISABLED")
const discoveryPort = firstEnv("LOCAL_SYNC_DISCOVERY_PORT", "PUG_LOCAL_SYNC_DISCOVERY_PORT") ?? "8788"
const databasePath = firstEnv("LOCAL_SYNC_SQLITE_PATH", "PUG_LOCAL_SYNC_DB")
const serverUrl = resolveLanPublicServerUrl({
  configuredServerUrl: firstEnv("LOCAL_SYNC_SERVER_URL", "PUG_LOCAL_SYNC_PUBLIC_URL"),
  host,
  port,
})
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
const catalogTimeoutMs =
  firstEnv("PUG_WORDPRESS_CATALOG_TIMEOUT_MS", "LOCAL_SYNC_WORDPRESS_CATALOG_TIMEOUT_MS") ?? "30000"
const inventoryUsername = firstEnv("PUG_WORDPRESS_INVENTORY_USERNAME", "PUG_WORDPRESS_USERNAME")
const inventoryApplicationPassword = firstEnv(
  "PUG_WORDPRESS_INVENTORY_APPLICATION_PASSWORD",
  "PUG_WORDPRESS_APP_PASSWORD",
)
const inventoryAuthHeader = firstEnv("PUG_WORDPRESS_INVENTORY_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
const inventoryDefaultOnlineVisibility =
  firstEnv("PUG_WORDPRESS_INVENTORY_ONLINE_VISIBILITY", "LOCAL_SYNC_INVENTORY_ONLINE_VISIBILITY") ?? "visible"
const inventoryDefaultKioskVisibility =
  firstEnv("PUG_WORDPRESS_INVENTORY_KIOSK_VISIBILITY", "LOCAL_SYNC_INVENTORY_KIOSK_VISIBILITY") ?? "visible"
const inventoryDefaultPosVisibility =
  firstEnv("PUG_WORDPRESS_INVENTORY_POS_VISIBILITY", "LOCAL_SYNC_INVENTORY_POS_VISIBILITY") ?? "visible"
const squareLocationId = firstEnv("PUG_SQUARE_LOCATION_ID", "LOCAL_SYNC_SQUARE_LOCATION_ID")
const squareEnvironment = firstEnv("PUG_SQUARE_ENVIRONMENT", "LOCAL_SYNC_SQUARE_ENVIRONMENT") ?? "sandbox"
const squareAccessToken = firstEnv("PUG_SQUARE_ACCESS_TOKEN", "LOCAL_SYNC_SQUARE_ACCESS_TOKEN")
const squareTerminalDeviceId = firstEnv("PUG_SQUARE_TERMINAL_DEVICE_ID", "LOCAL_SYNC_SQUARE_TERMINAL_DEVICE_ID")
const squareApiVersion = firstEnv("PUG_SQUARE_API_VERSION", "LOCAL_SYNC_SQUARE_API_VERSION")
const squareBaseUrl = firstEnv("PUG_SQUARE_BASE_URL", "LOCAL_SYNC_SQUARE_BASE_URL")
const squareInventoryPollDisabled = envFlag(
  "PUG_SQUARE_INVENTORY_POLL_DISABLED",
  "LOCAL_SYNC_SQUARE_INVENTORY_POLL_DISABLED",
)
const squareInventoryPollSeconds = boundedPollSeconds(
  firstEnv("PUG_SQUARE_INVENTORY_POLL_SECONDS", "LOCAL_SYNC_SQUARE_INVENTORY_POLL_SECONDS"),
)
const eventsUsername = firstEnv("PUG_WORDPRESS_EVENTS_USERNAME", "PUG_WORDPRESS_USERNAME")
const eventsApplicationPassword = firstEnv("PUG_WORDPRESS_EVENTS_APPLICATION_PASSWORD", "PUG_WORDPRESS_APP_PASSWORD")
const eventsAuthHeader = firstEnv("PUG_WORDPRESS_EVENTS_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
const fulfillmentUsername = firstEnv("PUG_WORDPRESS_FULFILLMENT_USERNAME", "PUG_WORDPRESS_USERNAME")
const fulfillmentApplicationPassword = firstEnv(
  "PUG_WORDPRESS_FULFILLMENT_APPLICATION_PASSWORD",
  "PUG_WORDPRESS_APP_PASSWORD",
)
const fulfillmentAuthHeader = firstEnv("PUG_WORDPRESS_FULFILLMENT_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
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
const reportsUsername = firstEnv("PUG_WORDPRESS_REPORTS_USERNAME", "PUG_WORDPRESS_USERNAME")
const reportsApplicationPassword = firstEnv("PUG_WORDPRESS_REPORTS_APPLICATION_PASSWORD", "PUG_WORDPRESS_APP_PASSWORD")
const reportsAuthHeader = firstEnv("PUG_WORDPRESS_REPORTS_AUTH_HEADER", "PUG_WORDPRESS_AUTH_HEADER")
const scryDexVisionIdentifier = createScryDexVisionIdentifier({
  apiKey: firstEnv("SCRYDEX_VISION_API_KEY", "PUG_SCRYDEX_VISION_API_KEY", "SCRYDEX_API_KEY", "PUG_SCRYDEX_API_KEY"),
  teamId: firstEnv("SCRYDEX_VISION_TEAM_ID", "PUG_SCRYDEX_VISION_TEAM_ID", "SCRYDEX_TEAM_ID", "PUG_SCRYDEX_TEAM_ID"),
  baseUrl: firstEnv("SCRYDEX_VISION_BASE_URL", "PUG_SCRYDEX_VISION_BASE_URL"),
  timeoutMs: firstEnv("SCRYDEX_VISION_TIMEOUT_MS", "PUG_SCRYDEX_VISION_TIMEOUT_MS"),
})
const gradedPricingLookup = createGradedPricingLookup({
  priceChartingToken: firstEnv("PUG_PRICECHARTING_API_TOKEN", "PRICECHARTING_API_TOKEN"),
  priceChartingBaseUrl: firstEnv("PUG_PRICECHARTING_BASE_URL", "PRICECHARTING_BASE_URL"),
  priceChartingMinRequestIntervalMs: firstEnv(
    "PUG_PRICECHARTING_MIN_REQUEST_INTERVAL_MS",
    "PRICECHARTING_MIN_REQUEST_INTERVAL_MS",
  ),
})
const websiteCatalogFallback = createWordPressCatalogFallback({
  websiteUrl,
  restBasePath,
  authHeader: catalogAuthHeader,
  username: catalogUsername,
  applicationPassword: catalogApplicationPassword,
  timeoutMs: catalogTimeoutMs,
})
const wordpressCatalogExportPull = createWordPressCatalogExportPull({
  websiteUrl,
  restBasePath,
  authHeader: catalogAuthHeader,
  username: catalogUsername,
  applicationPassword: catalogApplicationPassword,
  timeoutMs: catalogTimeoutMs,
  pageSize: process.env.PUG_WORDPRESS_CATALOG_PULL_PAGE_SIZE,
})
const wordpressCatalogIndexer = createWordPressCatalogIndexer({
  websiteUrl,
  restBasePath,
  authHeader: catalogAuthHeader,
  username: catalogUsername,
  applicationPassword: catalogApplicationPassword,
  timeoutMs: firstEnv("PUG_WORDPRESS_CATALOG_INDEX_TIMEOUT_MS", "LOCAL_SYNC_WORDPRESS_CATALOG_INDEX_TIMEOUT_MS") ?? "120000",
})
const wordpressInventoryPush = wordpressPushEnabled
  ? createWordPressInventoryPush({
      websiteUrl,
      restBasePath,
      authHeader: inventoryAuthHeader ?? catalogAuthHeader,
      username: inventoryUsername ?? catalogUsername,
      applicationPassword: inventoryApplicationPassword ?? catalogApplicationPassword,
      defaultLocationId: process.env.PUG_WORDPRESS_DEFAULT_LOCATION_ID,
      defaultOnlineVisibility: inventoryDefaultOnlineVisibility,
      defaultKioskVisibility: inventoryDefaultKioskVisibility,
      defaultPosVisibility: inventoryDefaultPosVisibility,
    })
  : null
const wordpressInventoryUpdatePush = wordpressPushEnabled
  ? createWordPressInventoryUpdatePush({
      websiteUrl,
      restBasePath,
      authHeader: inventoryAuthHeader ?? catalogAuthHeader,
      username: inventoryUsername ?? catalogUsername,
      applicationPassword: inventoryApplicationPassword ?? catalogApplicationPassword,
    })
  : null
const wordpressInventorySalePush = wordpressPushEnabled
  ? createWordPressInventorySalePush({
      websiteUrl,
      restBasePath,
      authHeader: inventoryAuthHeader ?? catalogAuthHeader,
      username: inventoryUsername ?? catalogUsername,
      applicationPassword: inventoryApplicationPassword ?? catalogApplicationPassword,
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
const wordpressEventsPull = createWordPressEventsPull({
  websiteUrl,
  restBasePath,
  authHeader: eventsAuthHeader ?? catalogAuthHeader,
  username: eventsUsername ?? catalogUsername,
  applicationPassword: eventsApplicationPassword ?? catalogApplicationPassword,
  pageSize: process.env.PUG_WORDPRESS_EVENTS_PULL_PAGE_SIZE ?? process.env.PUG_WORDPRESS_PULL_PAGE_SIZE,
})
const wordpressFulfillmentPull = createWordPressFulfillmentPull({
  websiteUrl,
  restBasePath,
  authHeader: fulfillmentAuthHeader ?? catalogAuthHeader,
  username: fulfillmentUsername ?? catalogUsername,
  applicationPassword: fulfillmentApplicationPassword ?? catalogApplicationPassword,
  limit: process.env.PUG_WORDPRESS_FULFILLMENT_PULL_LIMIT ?? process.env.PUG_WORDPRESS_PULL_PAGE_SIZE,
})
const wordpressFulfillmentStatusPush = createWordPressFulfillmentStatusPush({
  websiteUrl,
  restBasePath,
  authHeader: fulfillmentAuthHeader ?? catalogAuthHeader,
  username: fulfillmentUsername ?? catalogUsername,
  applicationPassword: fulfillmentApplicationPassword ?? catalogApplicationPassword,
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
const wordpressEventUpsertPush = wordpressPushEnabled
  ? createWordPressEventUpsertPush({
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
const wordpressReportsPull = createWordPressReportsPull({
  websiteUrl,
  restBasePath,
  authHeader: reportsAuthHeader ?? catalogAuthHeader,
  username: reportsUsername ?? catalogUsername,
  applicationPassword: reportsApplicationPassword ?? catalogApplicationPassword,
})
const squareTerminalConnector = createSquareTerminalConnector({
  accessToken: squareAccessToken,
  environment: squareEnvironment,
  locationId: squareLocationId,
  terminalDeviceId: squareTerminalDeviceId,
  apiVersion: squareApiVersion,
  baseUrl: squareBaseUrl,
})
const squareInventoryCountsPuller = createSquareInventoryCountsPuller({
  accessToken: squareAccessToken,
  environment: squareEnvironment,
  locationId: squareLocationId,
  apiVersion: squareApiVersion,
  baseUrl: squareBaseUrl,
})
const squareSalesReportsPuller = createSquareSalesReportsPuller({
  accessToken: squareAccessToken,
  environment: squareEnvironment,
  locationId: squareLocationId,
  apiVersion: squareApiVersion,
  baseUrl: squareBaseUrl,
  defaultLookbackDays: firstEnv("PUG_SQUARE_REPORT_LOOKBACK_DAYS", "LOCAL_SYNC_SQUARE_REPORT_LOOKBACK_DAYS"),
})
const server = await listenLocalSyncHttpServer({
  host,
  port,
  serverUrl,
  websiteUrl,
  restBasePath,
  localDatabase: "store-sync.sqlite",
  storeOptions: {
    databasePath,
    localSyncPort: port,
    maintenanceRoot: firstEnv("PUG_LAN_SERVER_MAINTENANCE_ROOT", "LOCAL_SYNC_MAINTENANCE_ROOT"),
    serverInstallRoot: firstEnv("PUG_LAN_SERVER_INSTALL_ROOT", "LOCAL_SYNC_INSTALL_ROOT"),
    removeSeedReferenceCards,
    websiteCatalogFallback,
    wordpressCatalogIndexer,
    wordpressCatalogExportPull,
    wordpressInventoryPull,
    wordpressEventsPull,
    wordpressFulfillmentPull,
    wordpressReportsPull,
    wordpressInventoryPush,
    wordpressInventoryUpdatePush,
    wordpressInventorySalePush,
    wordpressFulfillmentStatusPush,
    wordpressEventUpsertPush,
    wordpressEventRegistrationPush,
    wordpressEventCheckinPush,
    wordpressCreditPush,
    wordpressCustomerUpsertPush,
    wordpressKioskOrderPush,
    scryDexVisionIdentifier,
    gradedPricingLookup,
    gradedPricingProviderConfigured: gradedPricingLookup.configured === true,
    gradedPricingCacheTtlSeconds: firstEnv(
      "PUG_GRADED_PRICING_CACHE_TTL_SECONDS",
      "GRADED_PRICING_CACHE_TTL_SECONDS",
    ),
    squareLocationId,
    squareEnvironment,
    squareTerminalConnector,
    squareInventoryCountsPuller,
    squareSalesReportsPuller,
  },
})
const address = server.address()
const resolvedPort = typeof address === "object" && address ? address.port : port

console.log(`Pug local sync server listening on http://${host}:${resolvedPort}`)
console.log(`Website: ${websiteUrl || "not configured"}`)
console.log(`WordPress push enabled: ${wordpressPushEnabled ? "true" : "false"}`)
console.log(`ScryDex Vision configured: ${scryDexVisionIdentifier.status().configured ? "true" : "false"}`)
console.log(`Secondary graded pricing configured: ${gradedPricingLookup.configured === true ? "true" : "false"}`)
console.log(`Square Terminal configured: ${squareTerminalConnector.status().configured ? "true" : "false"}`)
console.log(`Square inventory poll configured: ${squareInventoryCountsPuller.status().configured ? "true" : "false"}`)
console.log(`Square sales report pull configured: ${squareSalesReportsPuller.status().configured ? "true" : "false"}`)
console.log("Credentials printed: false")

if (!squareInventoryPollDisabled && squareInventoryCountsPuller.status().configured) {
  startSquareInventoryPolling(server, squareInventoryPollSeconds)
} else if (squareInventoryPollDisabled) {
  console.log("Square inventory polling disabled by environment.")
} else {
  console.log("Square inventory polling not started; configure Square token and location for live POS sale detection.")
}

if (discoveryEnabled) {
  try {
    const discoveryResponder = await listenLocalSyncDiscoveryResponder({
      discoveryPort,
      serverUrl,
      websiteUrl,
      storeId: process.env.LOCAL_SYNC_STORE_ID,
    })

    server.once("close", () => discoveryResponder.close())
    console.log(`LAN discovery enabled on UDP ${discoveryResponder.discoveryPort}`)
  } catch (error) {
    console.warn(
      `LAN discovery unavailable; use manual server URL ${serverUrl}. ${
        error instanceof Error ? error.message : "Unknown discovery startup error."
      }`,
    )
  }
} else {
  console.log("LAN discovery disabled; manual server URL setup remains available.")
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

function boundedPollSeconds(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(parsed)) {
    return 15
  }

  return Math.min(300, Math.max(10, parsed))
}

function startSquareInventoryPolling(server, pollSeconds) {
  const store = server.localSyncStore

  if (!store || typeof store.reconcileSquareProviderInventoryCountsForSystem !== "function") {
    console.warn("Square inventory polling unavailable; local sync store was not attached to the HTTP server.")
    return
  }

  let running = false
  const run = async () => {
    if (running) {
      return
    }

    running = true
    try {
      const result = await store.reconcileSquareProviderInventoryCountsForSystem({
        source: "background_poll",
      })

      if (result.status === "ok" && result.sold_count > 0) {
        console.log(
          `Square inventory poll marked ${result.sold_count} item(s) sold; WordPress accepted ${result.wordpress_accepted_count}, retry ${result.wordpress_retry_count}.`,
        )
      } else if (result.status !== "ok") {
        console.warn(`Square inventory poll blocked: ${result.code || "unknown"}`)
      }
    } catch (error) {
      console.warn(`Square inventory poll failed: ${error instanceof Error ? error.message : "Unknown error."}`)
    } finally {
      running = false
    }
  }

  const interval = setInterval(run, pollSeconds * 1000)
  interval.unref?.()
  server.once("close", () => clearInterval(interval))
  console.log(`Square inventory polling enabled every ${pollSeconds}s.`)
  void run()
}
