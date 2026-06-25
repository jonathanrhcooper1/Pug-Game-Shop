import { hostname, platform } from "node:os"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { loadLocalEnv } from "./lib/local-env.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
loadLocalEnv([
  resolve(root, ".env.local-sync"),
  resolve(root, "apps/local-sync-server/.env.local"),
  resolve(root, ".env.local"),
])

const dryRun = process.argv.includes("--dry-run")
const localSyncServerUrl = normalizeBaseUrl(
  firstEnv("LOCAL_SYNC_SERVER_URL", "PUG_LOCAL_SYNC_PUBLIC_URL") || "http://127.0.0.1:8787",
)
const expectedWebsiteUrl = normalizeBaseUrl(
  firstEnv("LOCAL_SYNC_EXPECT_WEBSITE_URL", "PUG_WORDPRESS_URL") || "",
)
const smokeDeviceId = cleanDeviceId(
  firstEnv("LOCAL_SYNC_SMOKE_DEVICE_ID", "PUG_LOCAL_SYNC_SMOKE_DEVICE_ID")
    || `codex-local-sync-smoke-${hostname()}`,
)
const smokeDeviceLabel = cleanLabel(
  firstEnv("LOCAL_SYNC_SMOKE_DEVICE_LABEL", "PUG_LOCAL_SYNC_SMOKE_DEVICE_LABEL")
    || `Codex Local Sync Smoke ${hostname()}`,
)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "local_sync_server_smoke_dry_run",
        localSyncServerUrl,
        expectedWebsiteUrl: expectedWebsiteUrl || null,
        smokeDeviceId,
        smokeDeviceLabel,
        endpoints: ["/health", "/setup/status", "/devices/heartbeat", "/devices/status"],
        writesLocalHeartbeatOnly: true,
        mutatesWordPress: false,
        capturesPayments: false,
        credentialsPrinted: false,
        rawResponsePrinted: false,
        readsIgnoredEnvFiles: [".env.local-sync", "apps/local-sync-server/.env.local", ".env.local"],
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const health = await fetchJson("/health")

assertField(health.status, "ok", "Local sync health did not report ok.")
assertField(health.topology, "lan_middleman_server", "Local sync server topology is not the LAN middleman.")
assertField(health.setup_status_path, "/setup/status", "Local sync setup status path changed.")
assertField(health.device_heartbeat_path, "/devices/heartbeat", "Local sync heartbeat path changed.")
assertField(health.device_status_path, "/devices/status", "Local sync device status path changed.")

const setup = await fetchJson("/setup/status")

assertField(setup.status, "ok", "Local sync setup status did not report ok.")
assertField(setup.setup_screen_mode, "single_configurable_website", "Local sync setup is not in one-website mode.")
assertField(setup.one_website_mode, true, "Local sync setup is not in one-website mode.")
assertField(setup.credentials_synced_to_client, false, "Local sync setup is exposing credentials to clients.")
assertField(setup.raw_credentials_returned, false, "Local sync setup returned raw credentials.")

if (expectedWebsiteUrl) {
  assertField(
    normalizeBaseUrl(setup.website_url),
    expectedWebsiteUrl,
    `Local sync server is bound to ${setup.website_url || "no website"}, not ${expectedWebsiteUrl}.`,
  )
}

const heartbeat = await fetchJson("/devices/heartbeat", {
  method: "POST",
  body: {
    device_id: smokeDeviceId,
    device_label: smokeDeviceLabel,
    mode: "employee",
    app_version: "operator-smoke",
    platform: platform(),
    network_status: "online",
    setup_status: setup.setup_required ? "setup_required" : "ready",
    server_url: localSyncServerUrl,
    website_url: setup.website_url || expectedWebsiteUrl || "",
    capabilities: ["Inventory", "Kiosk", "Queue", "Status"],
    heartbeat_interval_seconds: 30,
  },
})

assertField(heartbeat.status, "ok", "Local sync smoke heartbeat was not accepted.")
assertField(heartbeat.device.device_id, smokeDeviceId, "Local sync smoke heartbeat returned the wrong device.")
assertField(heartbeat.device.credentials_synced_to_client, false, "Local sync heartbeat exposed credentials.")
assertField(heartbeat.credentials_synced_to_client, false, "Local sync heartbeat exposed credentials.")

const deviceStatus = await fetchJson("/devices/status")
const smokeDevice = Array.isArray(deviceStatus.devices)
  ? deviceStatus.devices.find((device) => device.device_id === smokeDeviceId)
  : null

if (!smokeDevice) {
  throw new Error("Local sync smoke device was not visible in /devices/status.")
}

assertField(deviceStatus.status, "ok", "Local sync device status did not report ok.")
assertField(deviceStatus.credentials_synced_to_client, false, "Local sync device status exposed credentials.")
assertField(smokeDevice.connection_status, "online", "Local sync smoke device is not online.")
assertField(smokeDevice.credentials_synced_to_client, false, "Local sync device row exposed credentials.")

console.log(
  JSON.stringify(
    {
      action: "local_sync_server_smoke",
      status: "ok",
      localSyncServerUrl,
      websiteUrl: setup.website_url || null,
      setupRequired: Boolean(setup.setup_required),
      deviceCount: deviceStatus.device_count,
      onlineDeviceCount: deviceStatus.online_count,
      offlineDeviceCount: deviceStatus.offline_count,
      smokeDeviceId,
      smokeDeviceMode: smokeDevice.mode,
      smokeDeviceConnectionStatus: smokeDevice.connection_status,
      writesLocalHeartbeatOnly: true,
      mutatesWordPress: false,
      capturesPayments: false,
      credentialsPrinted: false,
      rawResponsePrinted: false,
    },
    null,
    2,
  ),
)

async function fetchJson(path, options = {}) {
  const response = await fetch(`${localSyncServerUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).catch((error) => {
    throw new Error(`Local sync server is unavailable at ${localSyncServerUrl}: ${error.message}`)
  })
  const body = await response.json().catch(() => null)

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(`Local sync server returned a non-JSON response for ${path}.`)
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Local sync server returned HTTP ${response.status} for ${path}: ${body.code ?? body.status ?? "unknown"}`)
  }

  assertNoSecrets(body)

  return body
}

function assertField(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`)
  }
}

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value)

  for (const marker of [
    "pinHash",
    "pinSalt",
    '"pin":',
    '"raw_pin"',
    '"pin_hash"',
    '"pin_salt"',
    "api_key",
    "X-Api-Key",
    "private_key",
    "applicationPassword",
  ]) {
    if (serialized.includes(marker)) {
      throw new Error(`Local sync smoke response included a forbidden secret marker: ${marker}`)
    }
  }
}

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name]

    if (value && value.trim()) {
      return value.trim()
    }
  }

  return ""
}

function normalizeBaseUrl(value) {
  const text = String(value ?? "").trim()

  if (!text) {
    return ""
  }

  return text.replace(/\/+$/, "")
}

function cleanDeviceId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    || "codex-local-sync-smoke"
}

function cleanLabel(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 80) || "Codex Local Sync Smoke"
}
