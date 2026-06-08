import type { OfflineOperationEnvelope } from "./offlineWorkspace"
import {
  buildOfflineQueueInsertPlan,
  type OfflineSqliteQueueInsertPlan,
} from "./offlineLocalQueue"

export const offlineQueueCommandName = "queue_offline_operation"

export type OfflineQueuePersistenceMode = "preview_only" | "tauri_command"
export type OfflineQueueStatus = "previewed" | "queued" | "deferred"

export type OfflineQueueCommandAdapter = {
  invoke: (
    commandName: string,
    payload: { operation: OfflineOperationEnvelope },
  ) => Promise<unknown>
}

export type OfflineQueueSubmissionResult = {
  commandName: typeof offlineQueueCommandName
  operation: OfflineOperationEnvelope
  persistenceMode: OfflineQueuePersistenceMode
  status: OfflineQueueStatus
  message: string
  sqlitePlan: OfflineSqliteQueueInsertPlan
  audit: {
    directMysqlAccess: false
    networkWrite: false
    schemaVersion: 1
  }
}

export function previewOfflineOperation(
  operation: OfflineOperationEnvelope,
): OfflineQueueSubmissionResult {
  const sqlitePlan = buildOfflineQueueInsertPlan(operation)

  return {
    commandName: offlineQueueCommandName,
    operation,
    persistenceMode: "preview_only",
    status: "previewed",
    message: "Ready for desktop queue handoff.",
    sqlitePlan,
    audit: {
      directMysqlAccess: false,
      networkWrite: false,
      schemaVersion: operation.schema_version,
    },
  }
}

export async function submitOfflineOperation(
  operation: OfflineOperationEnvelope,
  adapter?: OfflineQueueCommandAdapter,
): Promise<OfflineQueueSubmissionResult> {
  if (!adapter) {
    return previewOfflineOperation(operation)
  }

  try {
    await adapter.invoke(offlineQueueCommandName, { operation })

    return {
      commandName: offlineQueueCommandName,
      operation,
      persistenceMode: "tauri_command",
      status: "queued",
      message: "Saved to the desktop queue.",
      sqlitePlan: buildOfflineQueueInsertPlan(operation),
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: operation.schema_version,
      },
    }
  } catch {
    return {
      commandName: offlineQueueCommandName,
      operation,
      persistenceMode: "preview_only",
      status: "deferred",
      message: "Queue handoff is deferred.",
      sqlitePlan: buildOfflineQueueInsertPlan(operation),
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: operation.schema_version,
      },
    }
  }
}
