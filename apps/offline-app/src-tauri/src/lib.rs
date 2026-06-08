use keyring::{Entry, Error as KeyringError};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;

const OFFLINE_DATABASE_FILE: &str = "offline.sqlite";
const DEVICE_TOKEN_KEYRING_SERVICE: &str = "Pug Game Shop Offline Device Tokens";
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
const SQLITE_QUEUE_SELECT_PENDING_SQL: &str = concat!(
    "SELECT client_operation_id, device_id, location_id, actor_id, operation_type, ",
    "entity_type, entity_id, base_row_version, occurred_at_local, queued_at_utc, ",
    "payload_json, authorization_context_json, schema_version ",
    "FROM operation_queue WHERE status = 'pending' ORDER BY queued_at_utc DESC LIMIT ?1"
);
const SQLITE_QUEUE_PARAMETER_COUNT: u8 = 15;

#[derive(Debug, Deserialize, Serialize, Clone)]
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

#[derive(Debug, Serialize)]
struct ListOfflineOperationsResponse {
    status: &'static str,
    persistence_mode: &'static str,
    sqlite_table: &'static str,
    sqlite_database_file: &'static str,
    operation_count: usize,
    operations: Vec<OfflineOperationEnvelope>,
    queue_replay_deferred: bool,
    canonical_mutations_deferred: bool,
    direct_mysql_access: bool,
    network_write: bool,
    schema_version: u8,
}

#[derive(Debug, Deserialize, Clone)]
struct StoreDeviceTokenRequest {
    profile_id: String,
    device_public_id: String,
    device_token: String,
    expires_at_utc: Option<String>,
    scopes: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
struct DeviceTokenStatusRequest {
    profile_id: String,
    device_public_id: String,
}

#[derive(Debug, Serialize)]
struct StoreDeviceTokenResponse {
    status: &'static str,
    persistence_mode: &'static str,
    keyring_service: &'static str,
    keyring_account: String,
    profile_id: String,
    device_public_id: String,
    token_persisted: bool,
    raw_token_returned: bool,
    credentials_synced_to_app: bool,
    token_length: usize,
    scope_count: usize,
    expires_at_utc: Option<String>,
}

#[derive(Debug, Serialize)]
struct DeviceTokenStatusResponse {
    status: &'static str,
    persistence_mode: &'static str,
    keyring_service: &'static str,
    keyring_account: String,
    profile_id: String,
    device_public_id: String,
    token_present: bool,
    token_length: usize,
    raw_token_returned: bool,
    credentials_synced_to_app: bool,
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

#[tauri::command]
fn list_offline_operations(
    app: tauri::AppHandle,
    limit: Option<u16>,
) -> Result<ListOfflineOperationsResponse, String> {
    let database_path = offline_database_path(&app)?;
    let connection = open_offline_database(&database_path)?;

    list_offline_operations_with_connection(&connection, limit)
}

#[tauri::command]
fn store_device_token(
    request: StoreDeviceTokenRequest,
) -> Result<StoreDeviceTokenResponse, String> {
    let store = KeyringDeviceTokenStore;

    store_device_token_with_store(request, &store)
}

#[tauri::command]
fn get_device_token_status(
    request: DeviceTokenStatusRequest,
) -> Result<DeviceTokenStatusResponse, String> {
    let store = KeyringDeviceTokenStore;

    device_token_status_with_store(request, &store)
}

#[tauri::command]
fn delete_device_token(
    request: DeviceTokenStatusRequest,
) -> Result<DeviceTokenStatusResponse, String> {
    let store = KeyringDeviceTokenStore;

    delete_device_token_with_store(request, &store)
}

trait DeviceTokenStore {
    fn persistence_mode(&self) -> &'static str;
    fn set_token(&self, account: &str, token: &str) -> Result<(), String>;
    fn get_token(&self, account: &str) -> Result<Option<String>, String>;
    fn delete_token(&self, account: &str) -> Result<bool, String>;
}

struct KeyringDeviceTokenStore;

impl DeviceTokenStore for KeyringDeviceTokenStore {
    fn persistence_mode(&self) -> &'static str {
        "desktop_secure_store"
    }

    fn set_token(&self, account: &str, token: &str) -> Result<(), String> {
        keyring_entry(account)?
            .set_password(token)
            .map_err(|_| "device_token_secure_store_write_failed".to_string())
    }

    fn get_token(&self, account: &str) -> Result<Option<String>, String> {
        match keyring_entry(account)?.get_password() {
            Ok(token) => Ok(Some(token)),
            Err(KeyringError::NoEntry) => Ok(None),
            Err(_) => Err("device_token_secure_store_read_failed".to_string()),
        }
    }

    fn delete_token(&self, account: &str) -> Result<bool, String> {
        match keyring_entry(account)?.delete_credential() {
            Ok(()) => Ok(true),
            Err(KeyringError::NoEntry) => Ok(false),
            Err(_) => Err("device_token_secure_store_delete_failed".to_string()),
        }
    }
}

fn keyring_entry(account: &str) -> Result<Entry, String> {
    Entry::new(DEVICE_TOKEN_KEYRING_SERVICE, account)
        .map_err(|_| "device_token_secure_store_entry_failed".to_string())
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

fn list_offline_operations_with_connection(
    connection: &Connection,
    limit: Option<u16>,
) -> Result<ListOfflineOperationsResponse, String> {
    let operations = load_pending_operations(connection, limit)?;

    Ok(ListOfflineOperationsResponse {
        status: "loaded_local_queue",
        persistence_mode: "sqlite",
        sqlite_table: SQLITE_QUEUE_TABLE,
        sqlite_database_file: OFFLINE_DATABASE_FILE,
        operation_count: operations.len(),
        operations,
        queue_replay_deferred: true,
        canonical_mutations_deferred: true,
        direct_mysql_access: false,
        network_write: false,
        schema_version: 1,
    })
}

fn store_device_token_with_store(
    request: StoreDeviceTokenRequest,
    store: &impl DeviceTokenStore,
) -> Result<StoreDeviceTokenResponse, String> {
    validate_store_device_token_request(&request)?;

    let account = device_token_keyring_account(&request.profile_id, &request.device_public_id)?;
    let token = request.device_token.trim();

    store.set_token(&account, token)?;

    Ok(StoreDeviceTokenResponse {
        status: "stored_in_desktop_secure_store",
        persistence_mode: store.persistence_mode(),
        keyring_service: DEVICE_TOKEN_KEYRING_SERVICE,
        keyring_account: account,
        profile_id: request.profile_id.trim().to_string(),
        device_public_id: request.device_public_id.trim().to_string(),
        token_persisted: true,
        raw_token_returned: false,
        credentials_synced_to_app: false,
        token_length: token.len(),
        scope_count: normalized_token_scopes(&request.scopes).len(),
        expires_at_utc: normalized_optional_text(request.expires_at_utc.as_deref()),
    })
}

fn device_token_status_with_store(
    request: DeviceTokenStatusRequest,
    store: &impl DeviceTokenStore,
) -> Result<DeviceTokenStatusResponse, String> {
    let account = device_token_keyring_account(&request.profile_id, &request.device_public_id)?;
    let token = store.get_token(&account)?;
    let token_length = token.as_ref().map_or(0, |value| value.len());
    let token_present = token.is_some();

    Ok(DeviceTokenStatusResponse {
        status: if token_present {
            "device_token_available"
        } else {
            "device_token_missing"
        },
        persistence_mode: store.persistence_mode(),
        keyring_service: DEVICE_TOKEN_KEYRING_SERVICE,
        keyring_account: account,
        profile_id: request.profile_id.trim().to_string(),
        device_public_id: request.device_public_id.trim().to_string(),
        token_present,
        token_length,
        raw_token_returned: false,
        credentials_synced_to_app: false,
    })
}

fn delete_device_token_with_store(
    request: DeviceTokenStatusRequest,
    store: &impl DeviceTokenStore,
) -> Result<DeviceTokenStatusResponse, String> {
    let account = device_token_keyring_account(&request.profile_id, &request.device_public_id)?;
    let deleted = store.delete_token(&account)?;

    Ok(DeviceTokenStatusResponse {
        status: if deleted {
            "device_token_deleted"
        } else {
            "device_token_missing"
        },
        persistence_mode: store.persistence_mode(),
        keyring_service: DEVICE_TOKEN_KEYRING_SERVICE,
        keyring_account: account,
        profile_id: request.profile_id.trim().to_string(),
        device_public_id: request.device_public_id.trim().to_string(),
        token_present: false,
        token_length: 0,
        raw_token_returned: false,
        credentials_synced_to_app: false,
    })
}

fn validate_store_device_token_request(request: &StoreDeviceTokenRequest) -> Result<(), String> {
    device_token_keyring_account(&request.profile_id, &request.device_public_id)?;

    let token = request.device_token.trim();

    if token.len() < 24 {
        return Err("device_token_too_short".to_string());
    }

    if token.chars().any(char::is_whitespace) {
        return Err("device_token_contains_whitespace".to_string());
    }

    let scopes = normalized_token_scopes(&request.scopes);

    if !scopes.contains(&"offline_pull".to_string())
        || !scopes.contains(&"offline_push".to_string())
    {
        return Err("device_token_scopes_incomplete".to_string());
    }

    Ok(())
}

fn normalized_token_scopes(scopes: &[String]) -> Vec<String> {
    let mut normalized = Vec::new();

    for scope in scopes {
        let value = scope.trim().to_lowercase();

        if value.is_empty() || normalized.contains(&value) {
            continue;
        }

        normalized.push(value);
    }

    normalized
}

fn normalized_optional_text(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn device_token_keyring_account(
    profile_id: &str,
    device_public_id: &str,
) -> Result<String, String> {
    let profile = safe_key_component(profile_id);
    let device = safe_key_component(device_public_id);

    if profile.is_empty() {
        return Err("device_token_profile_id_required".to_string());
    }

    if device.is_empty() {
        return Err("device_token_device_id_required".to_string());
    }

    Ok(format!("tcg-store-offline:{}:{}", profile, device))
}

fn safe_key_component(value: &str) -> String {
    let mut output = String::new();
    let mut previous_dash = false;

    for character in value.trim().chars() {
        let next = if character.is_ascii_alphanumeric() || matches!(character, '_' | '.' | ':') {
            previous_dash = false;
            Some(character.to_ascii_lowercase())
        } else if !previous_dash {
            previous_dash = true;
            Some('-')
        } else {
            None
        };

        if let Some(character) = next {
            output.push(character);
        }
    }

    output.trim_matches('-').to_string()
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

fn load_pending_operations(
    connection: &Connection,
    limit: Option<u16>,
) -> Result<Vec<OfflineOperationEnvelope>, String> {
    ensure_operation_queue_schema(connection)?;

    let mut statement = connection
        .prepare(SQLITE_QUEUE_SELECT_PENDING_SQL)
        .map_err(|_| "offline_queue_select_failed".to_string())?;
    let mut rows = statement
        .query(params![normalized_queue_limit(limit)])
        .map_err(|_| "offline_queue_select_failed".to_string())?;
    let mut operations = Vec::new();

    while let Some(row) = rows
        .next()
        .map_err(|_| "offline_queue_row_read_failed".to_string())?
    {
        let schema_version = row
            .get::<_, i64>(12)
            .map_err(|_| "offline_queue_row_invalid".to_string())?;

        if schema_version != 1 {
            return Err("offline_queue_row_invalid".to_string());
        }

        let operation = OfflineOperationEnvelope {
            client_operation_id: row
                .get(0)
                .map_err(|_| "offline_queue_row_invalid".to_string())?,
            device_id: row
                .get(1)
                .map_err(|_| "offline_queue_row_invalid".to_string())?,
            location_id: sqlite_unsigned(
                row.get(2)
                    .map_err(|_| "offline_queue_row_invalid".to_string())?,
                "offline_queue_row_invalid",
            )?,
            actor_id: sqlite_unsigned(
                row.get(3)
                    .map_err(|_| "offline_queue_row_invalid".to_string())?,
                "offline_queue_row_invalid",
            )?,
            operation_type: row
                .get(4)
                .map_err(|_| "offline_queue_row_invalid".to_string())?,
            entity_type: row
                .get(5)
                .map_err(|_| "offline_queue_row_invalid".to_string())?,
            entity_id: row
                .get(6)
                .map_err(|_| "offline_queue_row_invalid".to_string())?,
            base_row_version: sqlite_unsigned(
                row.get(7)
                    .map_err(|_| "offline_queue_row_invalid".to_string())?,
                "offline_queue_row_invalid",
            )?,
            occurred_at_local: row
                .get(8)
                .map_err(|_| "offline_queue_row_invalid".to_string())?,
            queued_at_utc: row
                .get(9)
                .map_err(|_| "offline_queue_row_invalid".to_string())?,
            payload_json: row
                .get(10)
                .map_err(|_| "offline_queue_row_invalid".to_string())?,
            authorization_context_json: row
                .get(11)
                .map_err(|_| "offline_queue_row_invalid".to_string())?,
            schema_version: 1,
        };

        validate_operation(&operation).map_err(|_| "offline_queue_row_invalid".to_string())?;
        operations.push(operation);
    }

    Ok(operations)
}

fn normalized_queue_limit(limit: Option<u16>) -> i64 {
    i64::from(limit.unwrap_or(50).clamp(1, 100))
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

fn sqlite_unsigned(value: i64, error: &'static str) -> Result<u64, String> {
    u64::try_from(value).map_err(|_| error.to_string())
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
        .invoke_handler(tauri::generate_handler![
            queue_offline_operation,
            list_offline_operations,
            store_device_token,
            get_device_token_status,
            delete_device_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running TCG Store Offline");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::sync::Mutex;

    #[derive(Default)]
    struct MemoryDeviceTokenStore {
        tokens: Mutex<HashMap<String, String>>,
    }

    impl DeviceTokenStore for MemoryDeviceTokenStore {
        fn persistence_mode(&self) -> &'static str {
            "desktop_secure_store"
        }

        fn set_token(&self, account: &str, token: &str) -> Result<(), String> {
            self.tokens
                .lock()
                .expect("memory token store lock")
                .insert(account.to_string(), token.to_string());
            Ok(())
        }

        fn get_token(&self, account: &str) -> Result<Option<String>, String> {
            Ok(self
                .tokens
                .lock()
                .expect("memory token store lock")
                .get(account)
                .cloned())
        }

        fn delete_token(&self, account: &str) -> Result<bool, String> {
            Ok(self
                .tokens
                .lock()
                .expect("memory token store lock")
                .remove(account)
                .is_some())
        }
    }

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

    fn valid_store_device_token_request() -> StoreDeviceTokenRequest {
        StoreDeviceTokenRequest {
            profile_id: "Pug Game Shop / staging".to_string(),
            device_public_id: "device-public-123".to_string(),
            device_token: "offline-device-token-2026-abcdef".to_string(),
            expires_at_utc: Some("2026-06-08T12:00:00Z".to_string()),
            scopes: vec![
                "offline_pull".to_string(),
                "offline_push".to_string(),
                "conflicts".to_string(),
                "offline_pull".to_string(),
            ],
        }
    }

    #[test]
    fn secure_store_persists_device_token_without_returning_secret() {
        let store = MemoryDeviceTokenStore::default();
        let request = valid_store_device_token_request();

        let result = store_device_token_with_store(request.clone(), &store)
            .expect("device token should store");

        assert_eq!(result.status, "stored_in_desktop_secure_store");
        assert_eq!(result.persistence_mode, "desktop_secure_store");
        assert_eq!(result.keyring_service, DEVICE_TOKEN_KEYRING_SERVICE);
        assert_eq!(
            result.keyring_account,
            "tcg-store-offline:pug-game-shop-staging:device-public-123"
        );
        assert_eq!(result.profile_id, "Pug Game Shop / staging");
        assert_eq!(result.device_public_id, "device-public-123");
        assert!(result.token_persisted);
        assert!(!result.raw_token_returned);
        assert!(!result.credentials_synced_to_app);
        assert_eq!(result.token_length, request.device_token.len());
        assert_eq!(result.scope_count, 3);

        let status = device_token_status_with_store(
            DeviceTokenStatusRequest {
                profile_id: request.profile_id,
                device_public_id: request.device_public_id,
            },
            &store,
        )
        .expect("device token status should load");

        assert_eq!(status.status, "device_token_available");
        assert!(status.token_present);
        assert_eq!(
            status.token_length,
            "offline-device-token-2026-abcdef".len()
        );
        assert!(!status.raw_token_returned);
    }

    #[test]
    fn secure_store_delete_removes_device_token_metadata() {
        let store = MemoryDeviceTokenStore::default();
        let request = valid_store_device_token_request();
        let status_request = DeviceTokenStatusRequest {
            profile_id: request.profile_id.clone(),
            device_public_id: request.device_public_id.clone(),
        };

        store_device_token_with_store(request, &store).expect("device token should store");

        let deleted = delete_device_token_with_store(status_request.clone(), &store)
            .expect("delete should succeed");

        assert_eq!(deleted.status, "device_token_deleted");
        assert!(!deleted.token_present);
        assert_eq!(deleted.token_length, 0);
        assert!(!deleted.raw_token_returned);

        let status =
            device_token_status_with_store(status_request, &store).expect("status should succeed");

        assert_eq!(status.status, "device_token_missing");
        assert!(!status.token_present);
    }

    #[test]
    fn secure_store_rejects_invalid_device_token_requests() {
        let store = MemoryDeviceTokenStore::default();
        let mut short_token = valid_store_device_token_request();
        short_token.device_token = "short".to_string();

        assert_eq!(
            store_device_token_with_store(short_token, &store).expect_err("short token fails"),
            "device_token_too_short"
        );

        let mut missing_scope = valid_store_device_token_request();
        missing_scope.scopes = vec!["offline_pull".to_string()];

        assert_eq!(
            store_device_token_with_store(missing_scope, &store).expect_err("missing scope fails"),
            "device_token_scopes_incomplete"
        );

        let mut missing_device = valid_store_device_token_request();
        missing_device.device_public_id = " ".to_string();

        assert_eq!(
            store_device_token_with_store(missing_device, &store)
                .expect_err("missing device fails"),
            "device_token_device_id_required"
        );
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

    #[test]
    fn list_command_loads_pending_operations_from_local_queue() {
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");
        let first_operation = valid_operation();
        let mut second_operation = valid_operation();
        second_operation.client_operation_id = "offline-inventory-87-20260607120500".to_string();
        second_operation.entity_id = "87".to_string();
        second_operation.queued_at_utc = "2026-06-07T12:05:00.000Z".to_string();

        queue_offline_operation_with_connection(first_operation, &connection)
            .expect("first insert should persist");
        queue_offline_operation_with_connection(second_operation, &connection)
            .expect("second insert should persist");

        let result = list_offline_operations_with_connection(&connection, Some(10))
            .expect("list command should load rows");

        assert_eq!(result.status, "loaded_local_queue");
        assert_eq!(result.persistence_mode, "sqlite");
        assert_eq!(result.sqlite_table, "operation_queue");
        assert_eq!(result.sqlite_database_file, "offline.sqlite");
        assert_eq!(result.operation_count, 2);
        assert_eq!(
            result.operations[0].client_operation_id,
            "offline-inventory-87-20260607120500"
        );
        assert!(result.queue_replay_deferred);
        assert!(result.canonical_mutations_deferred);
        assert!(!result.direct_mysql_access);
        assert!(!result.network_write);
    }

    #[test]
    fn list_command_honors_bounded_limit() {
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");

        for index in 1..=3 {
            let mut operation = valid_operation();
            operation.client_operation_id = format!("offline-inventory-{}-20260607120000", index);
            operation.entity_id = index.to_string();

            queue_offline_operation_with_connection(operation, &connection)
                .expect("operation should persist");
        }

        let result = list_offline_operations_with_connection(&connection, Some(2))
            .expect("list command should load limited rows");

        assert_eq!(result.operation_count, 2);
    }
}
