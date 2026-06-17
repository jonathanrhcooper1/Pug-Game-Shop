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
      typeof storeOptions.wordpressInventoryPull === "function" ||
      typeof storeOptions.wordpressEventsPull === "function" ||
      typeof storeOptions.wordpressFulfillmentPull === "function",
    wordpressInventoryPushConnected: typeof storeOptions.wordpressInventoryPush === "function",
    wordpressInventorySalePushConnected: typeof storeOptions.wordpressInventorySalePush === "function",
    wordpressFulfillmentPullConnected: typeof storeOptions.wordpressFulfillmentPull === "function",
    wordpressFulfillmentStatusPushConnected: typeof storeOptions.wordpressFulfillmentStatusPush === "function",
    wordpressEventUpsertPushConnected: typeof storeOptions.wordpressEventUpsertPush === "function",
    wordpressEventRegistrationPushConnected: typeof storeOptions.wordpressEventRegistrationPush === "function",
    wordpressEventCheckinPushConnected: typeof storeOptions.wordpressEventCheckinPush === "function",
    wordpressCreditPushConnected: typeof storeOptions.wordpressCreditPush === "function",
    wordpressCustomerPushConnected: typeof storeOptions.wordpressCustomerUpsertPush === "function",
    wordpressKioskOrderPushConnected: typeof storeOptions.wordpressKioskOrderPush === "function",
    wordpressReportsPullConnected: typeof storeOptions.wordpressReportsPull === "function",
    scrydexCatalogProxyConfigured: typeof storeOptions.websiteCatalogFallback === "function",
    gradedPricingProviderConfigured:
      Boolean(storeOptions.gradedPricingProviderConfigured) ||
      (typeof storeOptions.gradedPricingLookup === "function" && storeOptions.gradedPricingLookup.configured === true),
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
      creditApprovalThresholdMinorUnits: storedConfig.credit_approval_threshold_minor_units,
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
          contract_version: 4,
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
            setFilter: url.searchParams.get("set") ?? url.searchParams.get("set_filter") ?? "",
            limit: url.searchParams.get("limit") ?? "all",
            rawOrGraded: url.searchParams.get("raw_or_graded") ?? url.searchParams.get("product_type") ?? "",
          }),
        )
      }

      if (request.method === "GET" && url.pathname === "/trade-ins/graded-valuation") {
        return sendStoreResult(
          response,
          await store.lookupGradedTradeInValuation(token, {
            provider_card_id: url.searchParams.get("provider_card_id") ?? "",
            provider_variant_id: url.searchParams.get("provider_variant_id") ?? "",
            reference_variant_id: url.searchParams.get("reference_variant_id") ?? "",
            game: url.searchParams.get("game") ?? "pokemon",
            card_name: url.searchParams.get("card_name") ?? "",
            set_name: url.searchParams.get("set_name") ?? "",
            set_code: url.searchParams.get("set_code") ?? "",
            card_number: url.searchParams.get("card_number") ?? "",
            printed_number: url.searchParams.get("printed_number") ?? "",
            variant: url.searchParams.get("variant") ?? "",
            finish: url.searchParams.get("finish") ?? "",
            grading_company: url.searchParams.get("grading_company") ?? "",
            grade: url.searchParams.get("grade") ?? "",
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
        return sendStoreResult(response, await store.finalizeSquarePosSale(token, await readJson(request)))
      }

      if (request.method === "GET" && url.pathname === "/pos/square/terminal/status") {
        return sendStoreResult(response, store.getSquareTerminalStatus(token))
      }

      if (request.method === "POST" && url.pathname === "/pos/square/terminal/device-code") {
        return sendStoreResult(response, await store.createSquareTerminalDeviceCode(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/pos/square/terminal/checkouts") {
        return sendStoreResult(response, await store.createSquareTerminalCheckout(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/inventory/intake") {
        return sendStoreResult(response, await store.createInventoryIntake(token, await readJson(request)))
      }

      if (request.method === "GET" && url.pathname === "/inventory/locations") {
        return sendStoreResult(response, store.listInventoryLocations(token))
      }

      if (request.method === "POST" && url.pathname === "/inventory/locations") {
        return sendStoreResult(response, store.addInventoryLocation(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/inventory/reservations") {
        return sendStoreResult(response, store.reserveInventory(token, await readJson(request)))
      }

      if (request.method === "GET" && url.pathname === "/trade-ins/orders") {
        return sendStoreResult(response, store.listTradeInOrders(token, {
          limit: url.searchParams.get("limit") ?? "",
          statuses: url.searchParams.getAll("status"),
          query: url.searchParams.get("q") ?? "",
          staffUserId: url.searchParams.get("staff_user_id") ?? "",
          customer: url.searchParams.get("customer") ?? "",
        }))
      }

      if (request.method === "POST" && url.pathname === "/trade-ins/orders") {
        return sendStoreResult(response, store.createTradeInOrder(token, await readJson(request)))
      }

      const tradeInOrderMatch = url.pathname.match(/^\/trade-ins\/orders\/([^/]+)$/)

      if (request.method === "PATCH" && tradeInOrderMatch) {
        return sendStoreResult(
          response,
          store.updateTradeInOrder(token, decodeURIComponent(tradeInOrderMatch[1]), await readJson(request)),
        )
      }

      const tradeInStatusMatch = url.pathname.match(/^\/trade-ins\/orders\/([^/]+)\/status$/)

      if (request.method === "PATCH" && tradeInStatusMatch) {
        return sendStoreResult(
          response,
          store.updateTradeInOrderStatus(token, decodeURIComponent(tradeInStatusMatch[1]), await readJson(request)),
        )
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

      const kioskPicksMatch = url.pathname.match(/^\/kiosk\/orders\/([^/]+)\/picks$/)

      if (request.method === "PATCH" && kioskPicksMatch) {
        return sendStoreResult(
          response,
          store.updateKioskOrderPicks(token, decodeURIComponent(kioskPicksMatch[1]), await readJson(request)),
        )
      }

      const kioskPaymentMatch = url.pathname.match(/^\/kiosk\/orders\/([^/]+)\/payment$/)

      if (request.method === "PATCH" && kioskPaymentMatch) {
        return sendStoreResult(
          response,
          await store.updateKioskOrderPayment(token, decodeURIComponent(kioskPaymentMatch[1]), await readJson(request)),
        )
      }

      const kioskCustomerMatch = url.pathname.match(/^\/kiosk\/orders\/([^/]+)\/customer$/)

      if (request.method === "PATCH" && kioskCustomerMatch) {
        return sendStoreResult(
          response,
          store.updateKioskOrderCustomer(token, decodeURIComponent(kioskCustomerMatch[1]), await readJson(request)),
        )
      }

      if (request.method === "GET" && url.pathname === "/fulfillment/orders") {
        return sendStoreResult(response, await store.listFulfillmentOrders(token, {
          limit: url.searchParams.get("limit") ?? "",
          statuses: url.searchParams.getAll("status"),
          refresh: url.searchParams.get("refresh") ?? "true",
        }))
      }

      const fulfillmentStatusMatch = url.pathname.match(/^\/fulfillment\/orders\/([^/]+)\/status$/)

      if (request.method === "PATCH" && fulfillmentStatusMatch) {
        return sendStoreResult(
          response,
          await store.updateFulfillmentOrderStatus(
            token,
            decodeURIComponent(fulfillmentStatusMatch[1]),
            await readJson(request),
          ),
        )
      }

      const fulfillmentPicksMatch = url.pathname.match(/^\/fulfillment\/orders\/([^/]+)\/picks$/)

      if (request.method === "PATCH" && fulfillmentPicksMatch) {
        return sendStoreResult(
          response,
          store.updateFulfillmentOrderPicks(
            token,
            decodeURIComponent(fulfillmentPicksMatch[1]),
            await readJson(request),
          ),
        )
      }

      const reportsMatch = url.pathname.match(/^\/reports\/([^/]+)$/)

      if (request.method === "GET" && reportsMatch) {
        return sendStoreResult(
          response,
          await store.getManagerReport(token, {
            report: decodeURIComponent(reportsMatch[1]),
            filters: Object.fromEntries(url.searchParams.entries()),
          }),
        )
      }

      if (request.method === "GET" && url.pathname === "/customers/search") {
        return sendStoreResult(response, store.searchCustomers({ query: url.searchParams.get("q") ?? "" }))
      }

      const customerProfileMatch = url.pathname.match(/^\/customers\/([^/]+)\/profile$/)

      if (request.method === "GET" && customerProfileMatch) {
        return sendStoreResult(
          response,
          store.getCustomerProfile(token, decodeURIComponent(customerProfileMatch[1])),
        )
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

      if (request.method === "POST" && url.pathname === "/checkout/transactions") {
        return sendStoreResult(response, store.createCheckoutTransaction(token, await readJson(request)))
      }

      if (request.method === "GET" && url.pathname === "/events") {
        return sendStoreResult(response, store.listEvents())
      }

      if (request.method === "POST" && url.pathname === "/events") {
        return sendStoreResult(response, await store.createEvent(token, await readJson(request)))
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
