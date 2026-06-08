import { createServer } from "node:http"

import { createLocalSyncStore } from "./localSyncStore.mjs"

export function createLocalSyncHttpServer(options = {}) {
  const store = options.store ?? createLocalSyncStore(options.storeOptions)

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://local-sync-server")
      const token = bearerToken(request.headers.authorization)

      if (request.method === "OPTIONS") {
        return sendJson(response, 204, {})
      }

      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, {
          status: "ok",
          service: "pug_local_sync_server",
          local_database: "store-sync.sqlite",
          contract_version: 1,
        })
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

      if (request.method === "POST" && url.pathname === "/inventory/reservations") {
        return sendStoreResult(response, store.reserveInventory(token, await readJson(request)))
      }

      if (request.method === "POST" && url.pathname === "/kiosk/orders") {
        return sendStoreResult(response, store.createKioskOrder(await readJson(request)))
      }

      if (request.method === "GET" && url.pathname === "/sync/status") {
        return sendStoreResult(response, store.syncStatus())
      }

      if (request.method === "POST" && ["/sync/pull", "/sync/push"].includes(url.pathname)) {
        return sendJson(response, 202, {
          status: "deferred",
          route: url.pathname,
          message: "WordPress live sync worker is not connected in the local runtime scaffold yet.",
          ...store.syncStatus(),
        })
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
