import { invoke } from "@tauri-apps/api/core"

import type { DevicePairingRequestBody } from "./offlineWorkspace"
import { isTauriRuntime } from "./tauriQueueAdapter"

export const pairOfflineDeviceCommandName = "pair_offline_device"

export type PairOfflineDeviceRequest = {
  endpoint: string
  profile_id: string
  body: DevicePairingRequestBody
}

export type PairOfflineDeviceResponse = {
  status: "paired_and_stored_in_desktop_secure_store"
  endpoint: string
  profile_id: string
  device_public_id: string
  persistence_mode: "desktop_secure_store"
  keyring_service: string
  keyring_account: string
  token_persisted: true
  token_length: number
  scope_count: number
  expires_at_utc?: string
  wordpress_status: string
  wordpress_status_code: number
  wordpress_code: string
  raw_token_returned: false
  credentials_synced_to_app: false
}

export type DevicePairingAdapter = {
  available: true
  persistenceMode: "desktop_secure_store"
  pairOfflineDevice: (request: PairOfflineDeviceRequest) => Promise<PairOfflineDeviceResponse>
}

export function createTauriDevicePairingAdapter(): DevicePairingAdapter | undefined {
  if (!isTauriRuntime()) {
    return undefined
  }

  return {
    available: true,
    persistenceMode: "desktop_secure_store",
    pairOfflineDevice: (request) =>
      invoke(pairOfflineDeviceCommandName, { request }) as Promise<PairOfflineDeviceResponse>,
  }
}
