import assert from "node:assert/strict"
import dgram from "node:dgram"

import {
  LOCAL_SYNC_DISCOVERY_PROTOCOL,
  listenLocalSyncDiscoveryResponder,
} from "../src/localSyncDiscovery.mjs"

const discoveryPort = 18788
const responder = await listenLocalSyncDiscoveryResponder({
  discoveryPort,
  serverUrl: "http://192.168.1.20:8787",
  websiteUrl: "https://cards.example.test",
  storeId: "pug-shop-test",
  hostname: "front-counter-host",
})
const client = dgram.createSocket("udp4")

try {
  const responsePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("discovery timeout")), 1_000)

    client.on("message", (message) => {
      clearTimeout(timeout)
      resolve(JSON.parse(message.toString("utf8")))
    })
  })

  client.send(
    Buffer.from(JSON.stringify({ protocol: LOCAL_SYNC_DISCOVERY_PROTOCOL }), "utf8"),
    discoveryPort,
    "127.0.0.1",
  )

  const response = await responsePromise

  assert.equal(response.status, "ok")
  assert.equal(response.protocol, LOCAL_SYNC_DISCOVERY_PROTOCOL)
  assert.equal(response.service, "pug_local_sync_server")
  assert.equal(response.topology, "lan_middleman_server")
  assert.equal(response.store_id, "pug-shop-test")
  assert.equal(response.hostname, "front-counter-host")
  assert.equal(response.server_url, "http://192.168.1.20:8787")
  assert.equal(response.website_url, "https://cards.example.test")
  assert.equal(response.health_path, "/health")
  assert.equal(response.setup_status_path, "/setup/status")
  assert.equal(response.manual_fallback_supported, true)
  assert.equal(response.raw_credentials_returned, false)
  assert.equal(response.credentials_synced_to_client, false)
} finally {
  client.close()
  responder.close()
}

console.log("PASS local sync LAN discovery")
