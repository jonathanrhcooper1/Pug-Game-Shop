import dgram from "node:dgram"
import { hostname } from "node:os"

import { cleanLanPublicServerUrl } from "./lanServerUrl.mjs"

export const LOCAL_SYNC_DISCOVERY_PROTOCOL = "pug-local-sync-discovery-v1"
export const LOCAL_SYNC_DISCOVERY_PORT = 8788

export function createLocalSyncDiscoveryResponder(options = {}) {
  const socket = dgram.createSocket("udp4")
  const discoveryPort = normalizePort(options.discoveryPort, LOCAL_SYNC_DISCOVERY_PORT)
  const serverUrl = cleanLanPublicServerUrl(options.serverUrl) || "http://127.0.0.1:8787"
  const websiteUrl = cleanUrl(options.websiteUrl)
  const storeId = cleanId(options.storeId) || "pug-game-shop"
  const hostName = cleanLabel(options.hostname) || hostname() || "local-sync-host"

  socket.on("message", (message, rinfo) => {
    const request = parseDiscoveryRequest(message)

    if (request.protocol !== LOCAL_SYNC_DISCOVERY_PROTOCOL) {
      return
    }

    const response = Buffer.from(
      JSON.stringify({
        status: "ok",
        protocol: LOCAL_SYNC_DISCOVERY_PROTOCOL,
        service: "pug_local_sync_server",
        topology: "lan_middleman_server",
        store_id: storeId,
        hostname: hostName,
        server_url: serverUrl,
        website_url: websiteUrl,
        health_path: "/health",
        setup_status_path: "/setup/status",
        manual_fallback_supported: true,
        raw_credentials_returned: false,
        credentials_synced_to_client: false,
      }),
      "utf8",
    )

    socket.send(response, rinfo.port, rinfo.address)
  })

  return {
    discoveryPort,
    socket,
    close: () => socket.close(),
    listen: () =>
      new Promise((resolve, reject) => {
        socket.once("error", reject)
        socket.bind(discoveryPort, "0.0.0.0", () => {
          socket.off("error", reject)
          socket.setBroadcast(true)
          resolve(socket)
        })
      }),
  }
}

export async function listenLocalSyncDiscoveryResponder(options = {}) {
  const responder = createLocalSyncDiscoveryResponder(options)
  await responder.listen()

  return responder
}

function parseDiscoveryRequest(message) {
  const text = message.toString("utf8").trim()

  try {
    const parsed = JSON.parse(text)
    return {
      protocol: String(parsed?.protocol ?? ""),
    }
  } catch {
    return {
      protocol: text,
    }
  }
}

function normalizePort(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return fallback
  }

  return parsed
}

function cleanUrl(value) {
  const text = String(value ?? "").trim()

  if (!/^https?:\/\/[^/\s]+/i.test(text)) {
    return ""
  }

  return text.replace(/\/+$/, "")
}

function cleanId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function cleanLabel(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w .:-]+/g, "")
    .slice(0, 120)
}
