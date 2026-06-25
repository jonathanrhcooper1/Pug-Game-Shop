import { invoke } from "@tauri-apps/api/core"

import { isTauriRuntime } from "./tauriQueueAdapter"

export const localSyncDiscoveryCommandName = "discover_local_sync_servers"

export type LocalSyncDiscoveredServer = {
  protocol: "pug-local-sync-discovery-v1"
  service: "pug_local_sync_server"
  topology: "lan_middleman_server"
  store_id: string
  hostname: string
  server_url: string
  website_url: string
  health_path: "/health" | string
  setup_status_path: "/setup/status" | string
  manual_fallback_supported: boolean
  raw_credentials_returned: false
  credentials_synced_to_app: false
}

export type LocalSyncDiscoveryResponse = {
  status: "local_sync_discovery_completed"
  protocol: "pug-local-sync-discovery-v1"
  discovery_port: number
  timeout_ms: number
  server_count: number
  servers: LocalSyncDiscoveredServer[]
  manual_fallback_supported: true
  raw_credentials_returned: false
  credentials_synced_to_app: false
}

export type LocalSyncDiscoveryAdapter = {
  available: true
  discoverLocalSyncServers: (options?: {
    timeoutMs?: number
    discoveryPort?: number
  }) => Promise<LocalSyncDiscoveryResponse>
}

export function createTauriLocalSyncDiscoveryAdapter(): LocalSyncDiscoveryAdapter | undefined {
  if (!isTauriRuntime()) {
    return undefined
  }

  return {
    available: true,
    discoverLocalSyncServers: (options = {}) =>
      invoke(localSyncDiscoveryCommandName, {
        request: {
          timeout_ms: options.timeoutMs ?? 2500,
          discovery_port: options.discoveryPort ?? 8788,
        },
      }) as Promise<LocalSyncDiscoveryResponse>,
  }
}
