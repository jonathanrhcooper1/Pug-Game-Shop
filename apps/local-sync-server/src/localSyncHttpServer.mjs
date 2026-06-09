import { createServer } from "node:http"

import { createLocalSyncStore } from "./localSyncStore.mjs"
import { buildLocalSyncSetupStatus } from "./localSyncServerContract.mjs"

export function createLocalSyncHttpServer(options = {}) {
  const storeOptions = options.storeOptions ?? {}
  const setupStoreOptions = {
    ...storeOptions,
    localDatabase: storeOptions.localDatabase ?? options.localDatabase,
    restBasePath: storeOptions.restBasePath ?? options.restBasePath,
    serverUrl: storeOptions.serverUrl ?? options.serverUrl,
    storeId: storeOptions.storeId ?? options.storeId,
    websiteUrl: storeOptions.websiteUrl ?? options.websiteUrl,
  }
  const store = options.store ?? createLocalSyncStore(setupStoreOptions)
  const connectorStatus = {
    wordpressPullConfigured:
      typeof storeOptions.wordpressInventoryPull === "function" || typeof storeOptions.wordpressEventsPull === "function",
    wordpressInventoryPushConnected: typeof storeOptions.wordpressInventoryPush === "function",
    wordpressInventorySalePushConnected: typeof storeOptions.wordpressInventorySalePush === "function",
    wordpressEventRegistrationPushConnected: typeof storeOptions.wordpressEventRegistrationPush === "function",
    wordpressEventCheckinPushConnected: typeof storeOptions.wordpressEventCheckinPush === "function",
    wordpressCreditPushConnected: typeof storeOptions.wordpressCreditPush === "function",
    wordpressCustomerPushConnected: typeof storeOptions.wordpressCustomerUpsertPush === "function",
    wordpressKioskOrderPushConnected: typeof storeOptions.wordpressKioskOrderPush === "function",
    scrydexCatalogProxyConfigured: typeof storeOptions.websiteCatalogFallback === "function",
  }

  const currentSetupStatus = () => {
    if (options.setupStatus) {
      return options.setupStatus
    }

    const storedConfig =
      typeof store.getSetupConfig === "function"
        ? store.getSetupConfig()
        : {}

    return buildLocalSyncSetupStatus({
      storeId: storedConfig.store_id ?? options.storeId,
      serverUrl: storedConfig.server_url ?? options.serverUrl,
      websiteUrl: storedConfig.website_url ?? options.websiteUrl,
      restBasePath: storedConfig.rest_base_path ?? options.restBasePath,
      localDatabase: storedConfig.local_database ?? options.localDatabase,
      configSource: storedConfig.config_source,
      configuredAtUtc: storedConfig.configured_at_utc,
      wordpressConnectorRestartRequired: storedConfig.wordpress_connector_restart_required,
      ...connectorStatus,
    })
  }

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://local-sync-server")
      const token = bearerToken(request.headers.authorization)

      if (request.method === "OPTIONS") {
        return sendJson(response, 204, {})
      }

      if (request.method === "GET" && url.pathname === "/health") {
        const setupStatus = currentSetupStatus()

        return sendJson(response, 200, {
          status: "ok",
          service: "pug_local_sync_server",
          local_database: "store-sync.sqlite",
          contract_version: 2,
          topology: "lan_middleman_server",
          setup_screen_mode: "single_configurable_website",
          one_website_mode: true,
          website_configured: setupStatus.website_configured,
          setup_status_path: "/setup/status",
          device_heartbeat_path: "/devices/heartbeat",
          device_status_path: "/devices/status",
        })
      }

      if (request.method === "GET" && url.pathname === "/setup/status") {
        return sendJson(response, 200, currentSetupStatus())
      }

      if (request.method === "POST" && url.pathname === "/setup/config") {
        const result = store.updateSetupConfig(token, await readJson(request))

        if (result.status !== "ok") {
          return sendStoreResult(response, result)
        }

        return sendJson(response, 200, {
          ...result,
          setup_status: currentSetupStatus(),
        })
      }

      if (request.method === "POST" && url.pathname === "/devices/heartbeat") {
        return sendStoreResult(response, store.recordDeviceHeartbeat(await readJson(request)))
      }

      if (request.method === "GET" && url.pathname === "/devices/status") {
        return sendStoreResult(response, store.deviceStatus())
      }

      if (request.method === "POST" && url.pathname === "/auth/pin") {
        return sendStoreResult(response, store.createSession(await readJson(request)))
      }

      if (request.method === "GET" && url.pathname === "/users/access-policy") {
        return sendStoreResult(response, store.listAccessPolicy(token))
      }

      if (request.method === "POST" && url.pathname === "/users") {
        return sendStoreResult(response, store.addUser(token, await readJson(request)))
      }

      const userAccessMatch = url.pathname.match(/^\/users\/([^/]+)\/access$/)

      if (request.method === "PATCH" && userAccessMatch) {
        return sendStoreResult(
          response,
          store.updateUserAccess(token, decodeURIComponent(userAccessMatch[1]), await readJson(request)),
        )
      }

      if (request.method === "GET" && url.pathname === "/inventory/search") {
        return sendStoreResult(response, store.searchInventory({ query: url.searchParams.get("q") ?? "" }))
      }

      if (request.method === "GET" && url.pathname === "/scrydex/cards/search") {
        return sendStoreResult(
          response,
          await store.searchScryDexCards(token, {
            query: url.searchParams.get("q") ?? "",
            game: url.searchParams.get("game") ?? "pokemon",
          }),
        )
      }

      if (request.method === "POST" && url.pathname === "/pos/square/inventory-pull-plan") {
        return sendStoreResult(response, store.planSquarePosInventoryPull(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/pos/square/inventory-counts/reconcile") {
        return sendStoreResult(response, store.reconcileSquarePosInventoryCounts(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/pos/square/sales/finalize") {
        return sendStoreResult(response, store.finalizeSquarePosSale(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/inventory/intake") {
        return sendStoreResult(response, store.createInventoryIntake(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/inventory/reservations") {
        return sendStoreResult(response, store.reserveInventory(token, await readJson(request)))
      }

      if (request.method === "GET" && url.pathname === "/kiosk/orders") {
        return sendStoreResult(response, store.listKioskOrders(token, {
          limit: url.searchParams.get("limit") ?? "",
          statuses: url.searchParams.getAll("status"),
        }))
      }

      if (request.method === "POST" && url.pathname === "/kiosk/orders") {
        return sendStoreResult(response, store.createKioskOrder(await readJson(request)))
      }

      const kioskStatusMatch = url.pathname.match(/^\/kiosk\/orders\/([^/]+)\/status$/)

      if (request.method === "PATCH" && kioskStatusMatch) {
        return sendStoreResult(
          response,
          store.updateKioskOrderStatus(token, decodeURIComponent(kioskStatusMatch[1]), await readJson(request)),
        )
      }

      if (request.method === "GET" && url.pathname === "/customers/search") {
        return sendStoreResult(response, store.searchCustomers({ query: url.searchParams.get("q") ?? "" }))
      }

      if (request.method === "POST" && url.pathname === "/customers") {
        return sendStoreResult(response, store.createCustomer(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/credit/adjustments") {
        return sendStoreResult(response, store.createCreditAdjustment(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/credit/redemptions") {
        return sendStoreResult(response, store.createCreditRedemption(token, await readJson(request)))
      }

      if (request.method === "GET" && url.pathname === "/events") {
        return sendStoreResult(response, store.listEvents())
      }

      if (request.method === "POST" && url.pathname === "/events/registrations") {
        return sendStoreResult(response, store.createEventRegistration(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/events/check-ins") {
        return sendStoreResult(response, store.createEventCheckin(token, await readJson(request)))
      }

      if (request.method === "GET" && url.pathname === "/sync/status") {
        return sendStoreResult(response, store.syncStatus())
      }

      if (request.method === "POST" && url.pathname === "/sync/push") {
        return sendStoreResult(response, await store.pushQueuedOperations(token))
      }

      if (request.method === "POST" && url.pathname === "/sync/pull") {
        return sendStoreResult(response, await store.pullWebsiteInventory(token, await readJson(request)))
      }

      return sendJson(response, 404, {
        status: "blocked",
        code: "route_not_found",
        message: "No local sync server route matched the request.",
      })
    } catch (error) {
      return sendJson(response, 500, {
        status: "blocked",
        code: "local_sync_server_error",
        message: error instanceof Error ? error.message : "Unknown local sync server error.",
      })
    }
  })
}

export function listenLocalSyncHttpServer(options = {}) {
  const host = options.host ?? "127.0.0.1"
  const port = Number.parseInt(String(options.port ?? "8787"), 10)
  const server = createLocalSyncHttpServer(options)

  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, host, () => {
      server.off("error", reject)
      resolve(server)
    })
  })
}

async function readJson(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

function sendStoreResult(response, result) {
  const statusCode = result.status === "ok" ? 200 : 409

  return sendJson(response, statusCode, result)
}

function sendJson(response, statusCode, body) {
  const content = JSON.stringify(body)

  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "content-length": Buffer.byteLength(content),
  })
  response.end(content)
}

function bearerToken(value) {
  const text = String(value ?? "")
  const match = text.match(/^Bearer\s+(.+)$/i)

  return match ? match[1].trim() : ""
}
