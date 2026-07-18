import { invoke } from "@tauri-apps/api/core"

import { isTauriRuntime } from "./tauriQueueAdapter"

export const storeDeviceTokenCommandName = "store_device_token"
export const getDeviceTokenStatusCommandName = "get_device_token_status"
export const deleteDeviceTokenCommandName = "delete_device_token"

export type DeviceTokenStatusRequest = {
  profile_id: string
  device_public_id: string
}

export type StoreDeviceTokenRequest = DeviceTokenStatusRequest & {
  device_token: string
  expires_at_utc?: string
  scopes: string[]
}

export type DeviceTokenStatusResponse = {
  status: "device_token_available" | "device_token_missing" | "device_token_deleted"
  persistence_mode: "desktop_secure_store"
  keyring_service: string
  keyring_account: string
  profile_id: string
  device_public_id: string
  token_present: boolean
  token_length: number
  raw_token_returned: false
  credentials_synced_to_app: false
}

export type StoreDeviceTokenResponse = {
  status: "stored_in_desktop_secure_store"
  persistence_mode: "desktop_secure_store"
  keyring_service: string
  keyring_account: string
  profile_id: string
  device_public_id: string
  token_persisted: true
  raw_token_returned: false
  credentials_synced_to_app: false
  token_length: number
  scope_count: number
  expires_at_utc?: string
}

export type DeviceTokenSecureStoreAdapter = {
  available: true
  persistenceMode: "desktop_secure_store"
  storeDeviceToken: (request: StoreDeviceTokenRequest) => Promise<StoreDeviceTokenResponse>
  getDeviceTokenStatus: (request: DeviceTokenStatusRequest) => Promise<DeviceTokenStatusResponse>
  deleteDeviceToken: (request: DeviceTokenStatusRequest) => Promise<DeviceTokenStatusResponse>
}

export function createTauriSecureStoreAdapter(): DeviceTokenSecureStoreAdapter | undefined {
  if (!isTauriRuntime()) {
    return undefined
  }

  return {
    available: true,
    persistenceMode: "desktop_secure_store",
    storeDeviceToken: (request) =>
      invoke(storeDeviceTokenCommandName, { request }) as Promise<StoreDeviceTokenResponse>,
    getDeviceTokenStatus: (request) =>
      invoke(getDeviceTokenStatusCommandName, { request }) as Promise<DeviceTokenStatusResponse>,
    deleteDeviceToken: (request) =>
      invoke(deleteDeviceTokenCommandName, { request }) as Promise<DeviceTokenStatusResponse>,
  }
}
