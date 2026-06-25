import type { OfflineOperationEnvelope } from "./offlineWorkspace"
import {
  buildOfflineQueueInsertPlan,
  type OfflineSqliteQueueInsertPlan,
} from "./offlineLocalQueue"

export const offlineQueueCommandName = "queue_offline_operation"
export const offlineQueueListCommandName = "list_offline_operations"
export const offlineQueueMarkSyncedCommandName = "mark_offline_operations_synced"
export const offlineQueueVoidCommandName = "void_offline_operations"

export type OfflineQueuePersistenceMode = "preview_only" | "tauri_command"
export type OfflineQueueStatus = "previewed" | "queued" | "deferred"

export type OfflineQueueCommandAdapter = {
  invoke: (
    commandName: string,
    payload?: Record<string, unknown>,
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

export type OfflineQueueRestoreResult = {
  commandName: typeof offlineQueueListCommandName
  persistenceMode: OfflineQueuePersistenceMode
  status: "restored" | "previewed" | "deferred"
  message: string
  operations: OfflineOperationEnvelope[]
  audit: {
    directMysqlAccess: false
    networkWrite: false
    schemaVersion: 1
  }
}

export type OfflineQueueMarkSyncedResult = {
  commandName: typeof offlineQueueMarkSyncedCommandName
  acceptedOperationIds: string[]
  persistenceMode: OfflineQueuePersistenceMode
  status: "marked" | "previewed" | "deferred"
  message: string
  audit: {
    directMysqlAccess: false
    networkWrite: false
    schemaVersion: 1
  }
}

export type OfflineQueueVoidResult = {
  commandName: typeof offlineQueueVoidCommandName
  operationIds: string[]
  persistenceMode: OfflineQueuePersistenceMode
  status: "voided" | "previewed" | "deferred"
  message: string
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

export async function markOfflineOperationsSynced(
  acceptedOperationIds: string[],
  adapter?: OfflineQueueCommandAdapter,
): Promise<OfflineQueueMarkSyncedResult> {
  const safeAcceptedOperationIds = sanitizeOperationIds(acceptedOperationIds)

  if (safeAcceptedOperationIds.length === 0) {
    return {
      commandName: offlineQueueMarkSyncedCommandName,
      acceptedOperationIds: [],
      persistenceMode: "preview_only",
      status: "previewed",
      message: "No accepted local queue rows to mark synced.",
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  }

  if (!adapter) {
    return {
      commandName: offlineQueueMarkSyncedCommandName,
      acceptedOperationIds: safeAcceptedOperationIds,
      persistenceMode: "preview_only",
      status: "previewed",
      message: `${safeAcceptedOperationIds.length} accepted queue row(s) ready for desktop sync marking.`,
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  }

  try {
    await adapter.invoke(offlineQueueMarkSyncedCommandName, {
      request: {
        accepted_operation_ids: safeAcceptedOperationIds,
      },
    })

    return {
      commandName: offlineQueueMarkSyncedCommandName,
      acceptedOperationIds: safeAcceptedOperationIds,
      persistenceMode: "tauri_command",
      status: "marked",
      message: `${safeAcceptedOperationIds.length} accepted queue row(s) marked synced in the desktop queue.`,
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  } catch {
    return {
      commandName: offlineQueueMarkSyncedCommandName,
      acceptedOperationIds: safeAcceptedOperationIds,
      persistenceMode: "preview_only",
      status: "deferred",
      message: "Desktop queue sync marking is deferred.",
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  }
}

export async function voidOfflineOperations(
  operationIds: string[],
  adapter?: OfflineQueueCommandAdapter,
): Promise<OfflineQueueVoidResult> {
  const safeOperationIds = sanitizeOperationIds(operationIds)

  if (safeOperationIds.length === 0) {
    return {
      commandName: offlineQueueVoidCommandName,
      operationIds: [],
      persistenceMode: "preview_only",
      status: "previewed",
      message: "No pending local queue rows were selected for voiding.",
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  }

  if (!adapter) {
    return {
      commandName: offlineQueueVoidCommandName,
      operationIds: safeOperationIds,
      persistenceMode: "preview_only",
      status: "previewed",
      message: `${safeOperationIds.length} pending queue row(s) ready for desktop void marking.`,
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  }

  try {
    await adapter.invoke(offlineQueueVoidCommandName, {
      request: {
        operation_ids: safeOperationIds,
      },
    })

    return {
      commandName: offlineQueueVoidCommandName,
      operationIds: safeOperationIds,
      persistenceMode: "tauri_command",
      status: "voided",
      message: `${safeOperationIds.length} pending queue row(s) marked rejected in the desktop queue.`,
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  } catch {
    return {
      commandName: offlineQueueVoidCommandName,
      operationIds: safeOperationIds,
      persistenceMode: "preview_only",
      status: "deferred",
      message: "Desktop queue void marking is deferred.",
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  }
}

export async function restoreDesktopQueuedOperations(
  adapter?: OfflineQueueCommandAdapter,
  limit = 50,
): Promise<OfflineQueueRestoreResult> {
  if (!adapter) {
    return {
      commandName: offlineQueueListCommandName,
      persistenceMode: "preview_only",
      status: "previewed",
      message: "Desktop queue restore is available in the Tauri app.",
      operations: [],
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  }

  try {
    const response = await adapter.invoke(offlineQueueListCommandName, {
      limit: Math.max(1, Math.min(100, Math.trunc(limit))),
    })
    const operations = sanitizeRestoredOperations(response)

    return {
      commandName: offlineQueueListCommandName,
      persistenceMode: "tauri_command",
      status: "restored",
      message: `${operations.length} desktop queue operation(s) restored.`,
      operations,
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  } catch {
    return {
      commandName: offlineQueueListCommandName,
      persistenceMode: "preview_only",
      status: "deferred",
      message: "Desktop queue restore is deferred.",
      operations: [],
      audit: {
        directMysqlAccess: false,
        networkWrite: false,
        schemaVersion: 1,
      },
    }
  }
}

function sanitizeOperationIds(values: string[]): string[] {
  const operationIds: string[] = []

  for (const value of values) {
    const operationId = value.trim()

    if (
      !operationId ||
      operationId.length > 160 ||
      /\s/.test(operationId) ||
      hasCredentialMarker(operationId)
    ) {
      continue
    }

    if (operationIds.includes(operationId)) {
      continue
    }

    operationIds.push(operationId)

    if (operationIds.length >= 100) {
      break
    }
  }

  return operationIds
}

function sanitizeRestoredOperations(response: unknown): OfflineOperationEnvelope[] {
  const body = objectValue(response)
  const operations = Array.isArray(body?.operations) ? body.operations : []

  return operations
    .map((operation) => objectValue(operation))
    .filter((operation): operation is Record<string, unknown> => operation !== null)
    .map((operation) => {
      const payloadJson = stringValue(operation.payload_json)
      const authorizationJson = stringValue(operation.authorization_context_json)
      const locationId = numberValue(operation.location_id)
      const actorId = numberValue(operation.actor_id)
      const baseRowVersion = numberValue(operation.base_row_version)
      const operationType = stringValue(operation.operation_type)
      const entityType = stringValue(operation.entity_type)

      if (
        stringValue(operation.client_operation_id) === "" ||
        stringValue(operation.device_id) === "" ||
        stringValue(operation.entity_id) === "" ||
        locationId === null ||
        actorId === null ||
        baseRowVersion === null ||
        operation.schema_version !== 1 ||
        !["inventory_update", "inventory_reservation", "event_reservation", "event_checkin", "credit_redemption"].includes(operationType) ||
        !["inventory", "event", "customer_credit"].includes(entityType) ||
        !isJsonObjectString(payloadJson) ||
        !isJsonObjectString(authorizationJson) ||
        hasCredentialMarker(payloadJson) ||
        hasCredentialMarker(authorizationJson)
      ) {
        return null
      }

      return {
        client_operation_id: stringValue(operation.client_operation_id),
        device_id: stringValue(operation.device_id),
        location_id: locationId,
        actor_id: actorId,
        operation_type: operationType as OfflineOperationEnvelope["operation_type"],
        entity_type: entityType as OfflineOperationEnvelope["entity_type"],
        entity_id: stringValue(operation.entity_id),
        base_row_version: baseRowVersion,
        occurred_at_local: stringValue(operation.occurred_at_local),
        queued_at_utc: stringValue(operation.queued_at_utc),
        payload_json: payloadJson,
        authorization_context_json: authorizationJson,
        schema_version: 1,
      }
    })
    .filter((operation): operation is OfflineOperationEnvelope => operation !== null)
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function hasCredentialMarker(value: string): boolean {
  const normalized = value.toLowerCase()

  return ["password", "api_key", "private_key", "ssh_key", "bearer "].some((marker) =>
    normalized.includes(marker),
  )
}

function isJsonObjectString(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as unknown

    return Boolean(parsed && typeof parsed === "object" && !Array.isArray(parsed))
  } catch {
    return false
  }
}
