import type { OfflineOperationEnvelope } from "./offlineWorkspace"

export const offlineQueueTableName = "operation_queue"

export const offlineQueueInsertColumns = [
  "client_operation_id",
  "device_id",
  "location_id",
  "actor_id",
  "operation_type",
  "entity_type",
  "entity_id",
  "base_row_version",
  "occurred_at_local",
  "queued_at_utc",
  "payload_json",
  "authorization_context_json",
  "schema_version",
  "status",
  "retry_count",
] as const

export type OfflineQueueInsertValue = string | number

export type OfflineSqliteQueueInsertPlan = {
  database: "offline.sqlite"
  table: typeof offlineQueueTableName
  conflictPolicy: "client_operation_id_unique_insert_or_ignore"
  sql: string
  columns: typeof offlineQueueInsertColumns
  values: OfflineQueueInsertValue[]
  parameterCount: number
  directMysqlAccess: false
  networkWrite: false
  sqlitePersistenceDeferred: true
  queueReplayDeferred: true
  canonicalMutationsDeferred: true
}

export function buildOfflineQueueInsertPlan(
  operation: OfflineOperationEnvelope,
): OfflineSqliteQueueInsertPlan {
  const placeholders = offlineQueueInsertColumns.map(() => "?").join(", ")

  return {
    database: "offline.sqlite",
    table: offlineQueueTableName,
    conflictPolicy: "client_operation_id_unique_insert_or_ignore",
    sql: `INSERT OR IGNORE INTO ${offlineQueueTableName} (${offlineQueueInsertColumns.join(
      ", ",
    )}) VALUES (${placeholders})`,
    columns: offlineQueueInsertColumns,
    values: [
      operation.client_operation_id,
      operation.device_id,
      operation.location_id,
      operation.actor_id,
      operation.operation_type,
      operation.entity_type,
      operation.entity_id,
      operation.base_row_version,
      operation.occurred_at_local,
      operation.queued_at_utc,
      operation.payload_json,
      operation.authorization_context_json,
      operation.schema_version,
      "pending",
      0,
    ],
    parameterCount: offlineQueueInsertColumns.length,
    directMysqlAccess: false,
    networkWrite: false,
    sqlitePersistenceDeferred: true,
    queueReplayDeferred: true,
    canonicalMutationsDeferred: true,
  }
}
