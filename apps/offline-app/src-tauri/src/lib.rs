use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;

const OFFLINE_DATABASE_FILE: &str = "offline.sqlite";
const SQLITE_QUEUE_TABLE: &str = "operation_queue";
const SQLITE_QUEUE_CREATE_TABLE_SQL: &str = concat!(
    "CREATE TABLE IF NOT EXISTS operation_queue (",
    "client_operation_id TEXT PRIMARY KEY, ",
    "device_id TEXT NOT NULL, ",
    "location_id INTEGER NOT NULL, ",
    "actor_id INTEGER NOT NULL, ",
    "operation_type TEXT NOT NULL, ",
    "entity_type TEXT NOT NULL, ",
    "entity_id TEXT NOT NULL, ",
    "base_row_version INTEGER NOT NULL, ",
    "occurred_at_local TEXT NOT NULL, ",
    "queued_at_utc TEXT NOT NULL, ",
    "payload_json TEXT NOT NULL, ",
    "authorization_context_json TEXT NOT NULL, ",
    "schema_version INTEGER NOT NULL, ",
    "status TEXT NOT NULL DEFAULT 'pending', ",
    "retry_count INTEGER NOT NULL DEFAULT 0",
    ")"
);
const SQLITE_QUEUE_INSERT_SQL: &str = concat!(
    "INSERT OR IGNORE INTO operation_queue (",
    "client_operation_id, device_id, location_id, actor_id, operation_type, ",
    "entity_type, entity_id, base_row_version, occurred_at_local, queued_at_utc, ",
    "payload_json, authorization_context_json, schema_version, status, retry_count",
    ") VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)"
);
const SQLITE_QUEUE_PARAMETER_COUNT: u8 = 15;

#[derive(Debug, Deserialize)]
struct OfflineOperationEnvelope {
    client_operation_id: String,
    device_id: String,
    location_id: u64,
    actor_id: u64,
    operation_type: String,
    entity_type: String,
    entity_id: String,
    base_row_version: u64,
    occurred_at_local: String,
    queued_at_utc: String,
    payload_json: String,
    authorization_context_json: String,
    schema_version: u8,
}

#[derive(Debug, Serialize)]
struct QueueOfflineOperationResponse {
    status: &'static str,
    persistence_mode: &'static str,
    client_operation_id: String,
    sqlite_table: &'static str,
    sqlite_database_file: &'static str,
    sqlite_statement: &'static str,
    sqlite_parameter_count: u8,
    sqlite_rows_affected: usize,
    sqlite_persistence_deferred: bool,
    queue_replay_deferred: bool,
    canonical_mutations_deferred: bool,
    direct_mysql_access: bool,
    network_write: bool,
    schema_version: u8,
}

#[tauri::command]
fn queue_offline_operation(
    app: tauri::AppHandle,
    operation: OfflineOperationEnvelope,
) -> Result<QueueOfflineOperationResponse, String> {
    let database_path = offline_database_path(&app)?;
    let connection = open_offline_database(&database_path)?;

    queue_offline_operation_with_connection(operation, &connection)
}

fn queue_offline_operation_with_connection(
    operation: OfflineOperationEnvelope,
    connection: &Connection,
) -> Result<QueueOfflineOperationResponse, String> {
    validate_operation(&operation)?;
    let client_operation_id = operation.client_operation_id.clone();
    let outcome = persist_operation_to_queue(connection, &operation)?;

    Ok(QueueOfflineOperationResponse {
        status: outcome.status,
        persistence_mode: "sqlite",
        client_operation_id,
        sqlite_table: SQLITE_QUEUE_TABLE,
        sqlite_database_file: OFFLINE_DATABASE_FILE,
        sqlite_statement: SQLITE_QUEUE_INSERT_SQL,
        sqlite_parameter_count: SQLITE_QUEUE_PARAMETER_COUNT,
        sqlite_rows_affected: outcome.rows_affected,
        sqlite_persistence_deferred: false,
        queue_replay_deferred: true,
        canonical_mutations_deferred: true,
        direct_mysql_access: false,
        network_write: false,
        schema_version: 1,
    })
}

#[derive(Debug)]
struct QueueInsertOutcome {
    status: &'static str,
    rows_affected: usize,
}

fn offline_database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "offline_database_path_unavailable".to_string())?;

    std::fs::create_dir_all(&data_dir)
        .map_err(|_| "offline_database_directory_unavailable".to_string())?;

    Ok(data_dir.join(OFFLINE_DATABASE_FILE))
}

fn open_offline_database(path: &Path) -> Result<Connection, String> {
    Connection::open(path).map_err(|_| "offline_database_open_failed".to_string())
}

fn ensure_operation_queue_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(SQLITE_QUEUE_CREATE_TABLE_SQL)
        .map_err(|_| "offline_queue_schema_failed".to_string())
}

fn persist_operation_to_queue(
    connection: &Connection,
    operation: &OfflineOperationEnvelope,
) -> Result<QueueInsertOutcome, String> {
    ensure_operation_queue_schema(connection)?;

    let rows_affected = connection
        .execute(
            SQLITE_QUEUE_INSERT_SQL,
            params![
                operation.client_operation_id,
                operation.device_id,
                sqlite_integer(operation.location_id, "location_id_too_large")?,
                sqlite_integer(operation.actor_id, "actor_id_too_large")?,
                operation.operation_type,
                operation.entity_type,
                operation.entity_id,
                sqlite_integer(operation.base_row_version, "base_row_version_too_large")?,
                operation.occurred_at_local,
                operation.queued_at_utc,
                operation.payload_json,
                operation.authorization_context_json,
                i64::from(operation.schema_version),
                "pending",
                0_i64,
            ],
        )
        .map_err(|_| "offline_queue_insert_failed".to_string())?;

    let status = if rows_affected == 0 {
        "already_queued_local_queue"
    } else {
        "persisted_to_local_queue"
    };

    Ok(QueueInsertOutcome {
        status,
        rows_affected,
    })
}

fn sqlite_integer(value: u64, error: &'static str) -> Result<i64, String> {
    i64::try_from(value).map_err(|_| error.to_string())
}

fn validate_operation(operation: &OfflineOperationEnvelope) -> Result<(), String> {
    if operation.client_operation_id.trim().is_empty() {
        return Err("missing_client_operation_id".to_string());
    }

    if operation.device_id.trim().is_empty() {
        return Err("missing_device_id".to_string());
    }

    if operation.location_id == 0 || operation.actor_id == 0 {
        return Err("missing_actor_or_location".to_string());
    }

    let expected_entity_type = match operation.operation_type.as_str() {
        "inventory_update" | "inventory_reservation" => "inventory",
        "event_reservation" => "event",
        "credit_redemption" => "customer_credit",
        _ => return Err("unsupported_operation".to_string()),
    };

    if operation.entity_type != expected_entity_type {
        return Err("unsupported_operation".to_string());
    }

    if operation.entity_id.trim().is_empty() {
        return Err("missing_entity_id".to_string());
    }

    if operation.base_row_version == 0 {
        return Err("missing_base_row_version".to_string());
    }

    if operation.occurred_at_local.trim().is_empty() || operation.queued_at_utc.trim().is_empty() {
        return Err("missing_operation_timestamps".to_string());
    }

    serde_json::from_str::<serde_json::Value>(&operation.payload_json)
        .map_err(|_| "invalid_payload_json".to_string())?;
    serde_json::from_str::<serde_json::Value>(&operation.authorization_context_json)
        .map_err(|_| "invalid_authorization_context_json".to_string())?;

    if operation.schema_version != 1 {
        return Err("unsupported_schema_version".to_string());
    }

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![queue_offline_operation])
        .run(tauri::generate_context!())
        .expect("error while running TCG Store Offline");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_operation() -> OfflineOperationEnvelope {
        OfflineOperationEnvelope {
            client_operation_id: "offline-inventory-42-20260607120000".to_string(),
            device_id: "local-device-preview".to_string(),
            location_id: 1,
            actor_id: 1,
            operation_type: "inventory_update".to_string(),
            entity_type: "inventory".to_string(),
            entity_id: "42".to_string(),
            base_row_version: 12,
            occurred_at_local: "2026-06-07T12:00:00.000Z".to_string(),
            queued_at_utc: "2026-06-07T12:00:00.000Z".to_string(),
            payload_json: "{\"status\":\"available\"}".to_string(),
            authorization_context_json: "{\"manager_override\":false}".to_string(),
            schema_version: 1,
        }
    }

    #[test]
    fn queue_command_accepts_valid_inventory_operation() {
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");
        let result = queue_offline_operation_with_connection(valid_operation(), &connection)
            .expect("operation should validate");

        assert_eq!(result.status, "persisted_to_local_queue");
        assert_eq!(result.persistence_mode, "sqlite");
        assert_eq!(result.sqlite_table, "operation_queue");
        assert_eq!(result.sqlite_database_file, "offline.sqlite");
        assert_eq!(result.sqlite_parameter_count, 15);
        assert_eq!(result.sqlite_rows_affected, 1);
        assert!(result
            .sqlite_statement
            .starts_with("INSERT OR IGNORE INTO operation_queue"));
        assert!(!result.sqlite_persistence_deferred);
        assert!(result.queue_replay_deferred);
        assert!(result.canonical_mutations_deferred);
        assert!(!result.direct_mysql_access);
        assert!(!result.network_write);

        let stored_status: String = connection
            .query_row(
                "SELECT status FROM operation_queue WHERE client_operation_id = ?1",
                ["offline-inventory-42-20260607120000"],
                |row| row.get(0),
            )
            .expect("queued row should exist");

        assert_eq!(stored_status, "pending");
    }

    #[test]
    fn queue_command_rejects_invalid_payload_json() {
        let mut operation = valid_operation();
        operation.payload_json = "{".to_string();
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");

        assert_eq!(
            queue_offline_operation_with_connection(operation, &connection)
                .expect_err("payload should fail"),
            "invalid_payload_json"
        );
    }

    #[test]
    fn queue_command_rejects_unsupported_operation_type() {
        let mut operation = valid_operation();
        operation.operation_type = "customer_credit_update".to_string();
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");

        assert_eq!(
            queue_offline_operation_with_connection(operation, &connection)
                .expect_err("operation type should fail"),
            "unsupported_operation"
        );
    }

    #[test]
    fn queue_command_accepts_server_supported_offline_operation_types() {
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");

        for (operation_type, entity_type) in [
            ("inventory_update", "inventory"),
            ("inventory_reservation", "inventory"),
            ("event_reservation", "event"),
            ("credit_redemption", "customer_credit"),
        ] {
            let mut operation = valid_operation();
            operation.client_operation_id = format!("offline-{}-42-20260607120000", operation_type);
            operation.operation_type = operation_type.to_string();
            operation.entity_type = entity_type.to_string();

            let result = queue_offline_operation_with_connection(operation, &connection)
                .expect("operation type should validate");

            assert_eq!(result.status, "persisted_to_local_queue");
        }
    }

    #[test]
    fn queue_command_ignores_duplicate_client_operation_ids() {
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");

        let first = queue_offline_operation_with_connection(valid_operation(), &connection)
            .expect("first insert should persist");
        let second = queue_offline_operation_with_connection(valid_operation(), &connection)
            .expect("duplicate insert should be idempotent");

        assert_eq!(first.status, "persisted_to_local_queue");
        assert_eq!(first.sqlite_rows_affected, 1);
        assert_eq!(second.status, "already_queued_local_queue");
        assert_eq!(second.sqlite_rows_affected, 0);
    }
}
