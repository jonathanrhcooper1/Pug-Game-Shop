import { invoke } from "@tauri-apps/api/core"

import type { OfflinePullRequestBody, OfflinePushBatchPayload } from "./offlineWorkspace"
import { isTauriRuntime } from "./tauriQueueAdapter"

export const offlineSyncRequestCommandName = "run_offline_sync_request"

export type OfflineSyncRequestRoute = "pull" | "push"

export type OfflineSyncCommandRequest = {
  endpoint: string
  route: OfflineSyncRequestRoute
  profile_id: string
  device_public_id: string
  body: OfflinePullRequestBody | OfflinePushBatchPayload
  idempotency_key?: string
}

export type OfflineSyncCommandResponse = {
  status: "offline_sync_request_completed" | "offline_sync_request_rejected"
  route: OfflineSyncRequestRoute
  endpoint: string
  profile_id: string
  device_public_id: string
  http_status: number
  wordpress_status: string
  wordpress_code: string
  batch_id?: string
  operation_count: number
  accepted_count: number
  conflict_count: number
  rejected_count: number
  pull_domain_count: number
  pull_record_count: number
  pull_tombstone_count: number
  cursor_count: number
  network_request_completed: boolean
  authorization_header_attached: boolean
  raw_token_returned: false
  raw_response_returned: false
  credentials_synced_to_app: false
  direct_mysql_access: false
  schema_version: 1
}

export type OfflineSyncAdapter = {
  available: true
  runOfflineSyncRequest: (
    request: OfflineSyncCommandRequest,
  ) => Promise<OfflineSyncCommandResponse>
}

export function createTauriOfflineSyncAdapter(): OfflineSyncAdapter | undefined {
  if (!isTauriRuntime()) {
    return undefined
  }

  return {
    available: true,
    runOfflineSyncRequest: (request) =>
      invoke(offlineSyncRequestCommandName, { request }) as Promise<OfflineSyncCommandResponse>,
  }
}
