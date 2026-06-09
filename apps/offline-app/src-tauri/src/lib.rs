use keyring::{Entry, Error as KeyringError};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Duration;
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
const SQLITE_QUEUE_MARK_SYNCED_SQL: &str = concat!(
    "UPDATE operation_queue SET status = 'synced' ",
    "WHERE client_operation_id = ?1 AND status = 'pending'"
);
const SQLITE_QUEUE_VOID_SQL: &str = concat!(
    "UPDATE operation_queue SET status = 'rejected' ",
    "WHERE client_operation_id = ?1 AND status = 'pending'"
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
struct MarkOfflineOperationsSyncedRequest {
    accepted_operation_ids: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
struct VoidOfflineOperationsRequest {
    operation_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
struct MarkOfflineOperationsSyncedResponse {
    status: &'static str,
    persistence_mode: &'static str,
    sqlite_table: &'static str,
    sqlite_database_file: &'static str,
    sqlite_statement: &'static str,
    accepted_operation_count: usize,
    sqlite_rows_affected: usize,
    queue_replay_applied: bool,
    canonical_mutations_deferred: bool,
    direct_mysql_access: bool,
    network_write: bool,
    schema_version: u8,
}

#[derive(Debug, Serialize)]
struct VoidOfflineOperationsResponse {
    status: &'static str,
    persistence_mode: &'static str,
    sqlite_table: &'static str,
    sqlite_database_file: &'static str,
    sqlite_statement: &'static str,
    operation_count: usize,
    sqlite_rows_affected: usize,
    queue_void_applied: bool,
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

#[derive(Debug, Deserialize, Serialize, Clone)]
struct PairOfflineDeviceBody {
    pairing_code: String,
    installation_id: String,
    device_label: String,
    device_mode: String,
    location_id: u64,
    manager_id: u64,
    app_version: String,
    platform: String,
    capabilities: serde_json::Value,
    requested_scopes: Vec<String>,
    schema_version: u8,
}

#[derive(Debug, Deserialize, Clone)]
struct PairOfflineDeviceRequest {
    endpoint: String,
    profile_id: String,
    body: PairOfflineDeviceBody,
}

#[derive(Debug, Deserialize)]
struct WordPressDeviceRegistrationData {
    device_id: Option<String>,
    device_token: Option<String>,
    token_expires_at_utc: Option<String>,
    scopes: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct WordPressDeviceRegistrationResponse {
    status: Option<String>,
    status_code: Option<u16>,
    code: Option<String>,
    data: Option<WordPressDeviceRegistrationData>,
    errors: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
struct PairOfflineDeviceResponse {
    status: &'static str,
    endpoint: String,
    profile_id: String,
    device_public_id: String,
    persistence_mode: &'static str,
    keyring_service: &'static str,
    keyring_account: String,
    token_persisted: bool,
    token_length: usize,
    scope_count: usize,
    expires_at_utc: Option<String>,
    wordpress_status: String,
    wordpress_status_code: u16,
    wordpress_code: String,
    raw_token_returned: bool,
    credentials_synced_to_app: bool,
}

#[derive(Debug, Deserialize, Clone)]
struct OfflineSyncRequest {
    endpoint: String,
    route: String,
    profile_id: String,
    device_public_id: String,
    body: serde_json::Value,
    idempotency_key: Option<String>,
}

#[derive(Debug, Serialize)]
struct OfflineSyncRequestResponse {
    status: &'static str,
    route: String,
    endpoint: String,
    profile_id: String,
    device_public_id: String,
    http_status: u16,
    wordpress_status: String,
    wordpress_code: String,
    batch_id: Option<String>,
    operation_count: usize,
    accepted_count: usize,
    conflict_count: usize,
    rejected_count: usize,
    accepted_operation_ids: Vec<String>,
    conflict_operation_ids: Vec<String>,
    rejected_operation_ids: Vec<String>,
    pull_domain_count: usize,
    pull_record_count: usize,
    pull_tombstone_count: usize,
    pull_inventory_records: Vec<OfflineSyncInventoryRecord>,
    pull_customer_credit_records: Vec<OfflineSyncCustomerCreditRecord>,
    pull_event_records: Vec<OfflineSyncEventRecord>,
    pull_conflict_records: Vec<OfflineSyncConflictRecord>,
    cursor_count: usize,
    network_request_completed: bool,
    authorization_header_attached: bool,
    raw_token_returned: bool,
    raw_response_returned: bool,
    credentials_synced_to_app: bool,
    direct_mysql_access: bool,
    schema_version: u8,
}

#[derive(Debug, Serialize)]
struct OfflineSyncInventoryRecord {
    public_id: String,
    row_version: u64,
    card_name: String,
    set_name: String,
    card_number: String,
    condition: String,
    barcode: String,
    sale_price_minor_units: u64,
    sale_currency: String,
    location_label: String,
    status: String,
    updated_at_utc: String,
}

#[derive(Debug, Serialize)]
struct OfflineSyncCustomerCreditRecord {
    customer_id: u64,
    row_version: u64,
    label: String,
    available_minor_units: u64,
    currency: String,
    note: String,
    updated_at_utc: String,
}

#[derive(Debug, Serialize)]
struct OfflineSyncEventRecord {
    entity_id: String,
    row_version: u64,
    title: String,
    starts_at_utc: String,
    starts_at_label: String,
    registration_status: String,
    capacity: u64,
    registered_count: u64,
    location_label: String,
    note: String,
    updated_at_utc: String,
}

#[derive(Debug, Serialize)]
struct OfflineSyncConflictRecord {
    conflict_id: String,
    row_version: u64,
    title: String,
    detail: String,
    action: String,
    entity_type: String,
    entity_id: String,
    base_row_version: u64,
    operation_type: String,
    manager_override: bool,
    updated_at_utc: String,
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
fn mark_offline_operations_synced(
    app: tauri::AppHandle,
    request: MarkOfflineOperationsSyncedRequest,
) -> Result<MarkOfflineOperationsSyncedResponse, String> {
    let database_path = offline_database_path(&app)?;
    let connection = open_offline_database(&database_path)?;

    mark_offline_operations_synced_with_connection(request, &connection)
}

#[tauri::command]
fn void_offline_operations(
    app: tauri::AppHandle,
    request: VoidOfflineOperationsRequest,
) -> Result<VoidOfflineOperationsResponse, String> {
    let database_path = offline_database_path(&app)?;
    let connection = open_offline_database(&database_path)?;

    void_offline_operations_with_connection(request, &connection)
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

#[tauri::command]
async fn pair_offline_device(
    request: PairOfflineDeviceRequest,
) -> Result<PairOfflineDeviceResponse, String> {
    validate_pair_offline_device_request(&request)?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|_| "offline_device_pairing_client_failed".to_string())?;
    let response = client
        .post(request.endpoint.trim())
        .header("Accept", "application/json")
        .json(&request.body)
        .send()
        .await
        .map_err(|_| "offline_device_pairing_request_failed".to_string())?;
    let status_code = response.status().as_u16();
    let registration_response = response
        .json::<WordPressDeviceRegistrationResponse>()
        .await
        .map_err(|_| "offline_device_pairing_response_invalid".to_string())?;
    let store = KeyringDeviceTokenStore;

    pair_offline_device_from_registration_response(
        request,
        registration_response,
        status_code,
        &store,
    )
}

#[tauri::command]
async fn run_offline_sync_request(
    request: OfflineSyncRequest,
) -> Result<OfflineSyncRequestResponse, String> {
    validate_offline_sync_request(&request)?;

    let store = KeyringDeviceTokenStore;
    let device_token = offline_sync_device_token(&request, &store)?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|_| "offline_sync_client_failed".to_string())?;
    let mut builder = client
        .post(request.endpoint.trim())
        .header("Accept", "application/json")
        .header("Authorization", format!("Bearer {}", device_token))
        .json(&request.body);

    if matches!(request.route.trim(), "push" | "conflict_resolution") {
        if let Some(idempotency_key) = normalized_optional_text(request.idempotency_key.as_deref()) {
            builder = builder
                .header("idempotency-key", idempotency_key)
                .header("x-tcg-device-id", request.device_public_id.trim());
        }
    }

    let response = builder
        .send()
        .await
        .map_err(|_| "offline_sync_request_failed".to_string())?;
    let http_status = response.status().as_u16();
    let body = response
        .json::<serde_json::Value>()
        .await
        .map_err(|_| "offline_sync_response_invalid".to_string())?;

    Ok(summarize_offline_sync_response(
        &request,
        http_status,
        &body,
    ))
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

fn mark_offline_operations_synced_with_connection(
    request: MarkOfflineOperationsSyncedRequest,
    connection: &Connection,
) -> Result<MarkOfflineOperationsSyncedResponse, String> {
    let accepted_operation_ids = sanitized_operation_id_list(&request.accepted_operation_ids)?;

    ensure_operation_queue_schema(connection)?;

    let mut rows_affected = 0_usize;

    for operation_id in &accepted_operation_ids {
        rows_affected += connection
            .execute(SQLITE_QUEUE_MARK_SYNCED_SQL, params![operation_id])
            .map_err(|_| "offline_queue_mark_synced_failed".to_string())?;
    }

    Ok(MarkOfflineOperationsSyncedResponse {
        status: "marked_local_queue_synced",
        persistence_mode: "sqlite",
        sqlite_table: SQLITE_QUEUE_TABLE,
        sqlite_database_file: OFFLINE_DATABASE_FILE,
        sqlite_statement: SQLITE_QUEUE_MARK_SYNCED_SQL,
        accepted_operation_count: accepted_operation_ids.len(),
        sqlite_rows_affected: rows_affected,
        queue_replay_applied: rows_affected > 0,
        canonical_mutations_deferred: true,
        direct_mysql_access: false,
        network_write: false,
        schema_version: 1,
    })
}

fn void_offline_operations_with_connection(
    request: VoidOfflineOperationsRequest,
    connection: &Connection,
) -> Result<VoidOfflineOperationsResponse, String> {
    let operation_ids = sanitized_operation_id_list(&request.operation_ids)?;

    ensure_operation_queue_schema(connection)?;

    let mut rows_affected = 0_usize;

    for operation_id in &operation_ids {
        rows_affected += connection
            .execute(SQLITE_QUEUE_VOID_SQL, params![operation_id])
            .map_err(|_| "offline_queue_void_failed".to_string())?;
    }

    Ok(VoidOfflineOperationsResponse {
        status: "voided_local_queue_operations",
        persistence_mode: "sqlite",
        sqlite_table: SQLITE_QUEUE_TABLE,
        sqlite_database_file: OFFLINE_DATABASE_FILE,
        sqlite_statement: SQLITE_QUEUE_VOID_SQL,
        operation_count: operation_ids.len(),
        sqlite_rows_affected: rows_affected,
        queue_void_applied: rows_affected > 0,
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

fn pair_offline_device_from_registration_response(
    request: PairOfflineDeviceRequest,
    registration_response: WordPressDeviceRegistrationResponse,
    http_status_code: u16,
    store: &impl DeviceTokenStore,
) -> Result<PairOfflineDeviceResponse, String> {
    validate_pair_offline_device_request(&request)?;

    let wordpress_status = normalized_optional_text(registration_response.status.as_deref())
        .unwrap_or_else(|| "unknown".to_string());
    let wordpress_code = normalized_optional_text(registration_response.code.as_deref())
        .unwrap_or_else(|| "unknown".to_string());
    let wordpress_status_code = registration_response
        .status_code
        .unwrap_or(http_status_code);

    if !(200..300).contains(&http_status_code)
        || wordpress_status != "registered"
        || wordpress_code != "offline_device_registered"
    {
        let first_error = registration_response
            .errors
            .unwrap_or_default()
            .into_iter()
            .find(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "offline_device_pairing_rejected".to_string());

        return Err(first_error);
    }

    let data = registration_response
        .data
        .ok_or_else(|| "offline_device_pairing_data_missing".to_string())?;
    let device_public_id = normalized_optional_text(data.device_id.as_deref())
        .ok_or_else(|| "offline_device_pairing_device_id_missing".to_string())?;
    let device_token = normalized_optional_text(data.device_token.as_deref())
        .ok_or_else(|| "offline_device_pairing_token_missing".to_string())?;
    let scopes = normalized_token_scopes(&data.scopes.unwrap_or_default());
    let store_response = store_device_token_with_store(
        StoreDeviceTokenRequest {
            profile_id: request.profile_id.clone(),
            device_public_id,
            device_token,
            expires_at_utc: data.token_expires_at_utc.clone(),
            scopes,
        },
        store,
    )?;

    Ok(PairOfflineDeviceResponse {
        status: "paired_and_stored_in_desktop_secure_store",
        endpoint: request.endpoint.trim().to_string(),
        profile_id: store_response.profile_id,
        device_public_id: store_response.device_public_id,
        persistence_mode: store_response.persistence_mode,
        keyring_service: store_response.keyring_service,
        keyring_account: store_response.keyring_account,
        token_persisted: store_response.token_persisted,
        token_length: store_response.token_length,
        scope_count: store_response.scope_count,
        expires_at_utc: store_response.expires_at_utc,
        wordpress_status,
        wordpress_status_code,
        wordpress_code,
        raw_token_returned: false,
        credentials_synced_to_app: false,
    })
}

fn validate_pair_offline_device_request(request: &PairOfflineDeviceRequest) -> Result<(), String> {
    let endpoint = request.endpoint.trim();

    if request.profile_id.trim().is_empty() {
        return Err("offline_device_pairing_profile_id_required".to_string());
    }

    if endpoint.is_empty() {
        return Err("offline_device_pairing_endpoint_required".to_string());
    }

    if !endpoint.starts_with("https://")
        && !endpoint.starts_with("http://localhost")
        && !endpoint.starts_with("http://127.0.0.1")
    {
        return Err("offline_device_pairing_endpoint_https_required".to_string());
    }

    if !endpoint.ends_with("/wp-json/tcg-store/v1/offline/devices/register") {
        return Err("offline_device_pairing_endpoint_invalid".to_string());
    }

    if request.body.pairing_code.trim().is_empty() {
        return Err("offline_device_pairing_code_required".to_string());
    }

    if request.body.installation_id.trim().is_empty()
        || request.body.device_label.trim().is_empty()
        || request.body.app_version.trim().is_empty()
        || request.body.platform.trim().is_empty()
    {
        return Err("offline_device_pairing_body_incomplete".to_string());
    }

    if request.body.location_id == 0 || request.body.manager_id == 0 {
        return Err("offline_device_pairing_actor_context_required".to_string());
    }

    if request.body.schema_version != 1 {
        return Err("offline_device_pairing_schema_version_unsupported".to_string());
    }

    let scopes = normalized_token_scopes(&request.body.requested_scopes);

    if !scopes.contains(&"offline_pull".to_string())
        || !scopes.contains(&"offline_push".to_string())
    {
        return Err("offline_device_pairing_scopes_incomplete".to_string());
    }

    Ok(())
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

fn validate_offline_sync_request(request: &OfflineSyncRequest) -> Result<(), String> {
    let endpoint = request.endpoint.trim();
    let route = request.route.trim();
    let profile_id = request.profile_id.trim();
    let device_public_id = request.device_public_id.trim();

    if profile_id.is_empty() {
        return Err("offline_sync_profile_id_required".to_string());
    }

    if device_public_id.is_empty() {
        return Err("offline_sync_device_id_required".to_string());
    }

    if endpoint.is_empty() {
        return Err("offline_sync_endpoint_required".to_string());
    }

    if !endpoint.starts_with("https://")
        && !endpoint.starts_with("http://localhost")
        && !endpoint.starts_with("http://127.0.0.1")
    {
        return Err("offline_sync_endpoint_https_required".to_string());
    }

    if route != "pull" && route != "push" && route != "conflict_resolution" {
        return Err("offline_sync_route_unsupported".to_string());
    }

    if !offline_sync_endpoint_matches_route(endpoint, route) {
        return Err("offline_sync_endpoint_invalid".to_string());
    }

    let Some(body) = request.body.as_object() else {
        return Err("offline_sync_body_must_be_object".to_string());
    };

    if json_object_string(body, "device_id") != device_public_id {
        return Err("offline_sync_device_id_mismatch".to_string());
    }

    if json_object_u64(body, "schema_version") != Some(1) {
        return Err("offline_sync_schema_version_unsupported".to_string());
    }

    if route == "push" {
        if normalized_optional_text(request.idempotency_key.as_deref()).is_none() {
            return Err("offline_sync_push_idempotency_key_required".to_string());
        }

        let operations = body.get("operations").and_then(serde_json::Value::as_array);

        if operations.is_none_or(Vec::is_empty) {
            return Err("offline_sync_push_operations_required".to_string());
        }
    }

    if route == "conflict_resolution" {
        validate_offline_conflict_resolution_request(request, body, endpoint)?;
    }

    Ok(())
}

fn offline_sync_endpoint_matches_route(endpoint: &str, route: &str) -> bool {
    if route == "pull" {
        return endpoint.ends_with("/wp-json/tcg-store/v1/offline/pull");
    }

    if route == "push" {
        return endpoint.ends_with("/wp-json/tcg-store/v1/offline/push");
    }

    endpoint_conflict_id(endpoint).is_some()
}

fn validate_offline_conflict_resolution_request(
    request: &OfflineSyncRequest,
    body: &serde_json::Map<String, serde_json::Value>,
    endpoint: &str,
) -> Result<(), String> {
    let Some(idempotency_key) = normalized_optional_text(request.idempotency_key.as_deref()) else {
        return Err("offline_sync_conflict_resolution_idempotency_key_required".to_string());
    };
    let Some(endpoint_conflict_id) = endpoint_conflict_id(endpoint) else {
        return Err("offline_sync_endpoint_invalid".to_string());
    };
    let conflict_id = json_object_string(body, "conflict_id");
    let resolution_id = json_object_string(body, "resolution_id");
    let resolution_action = json_object_string(body, "resolution_action");

    if conflict_id != endpoint_conflict_id {
        return Err("offline_sync_conflict_id_mismatch".to_string());
    }

    if resolution_id != idempotency_key {
        return Err("offline_sync_conflict_resolution_id_mismatch".to_string());
    }

    if json_object_u64(body, "manager_id").is_none_or(|value| value == 0) {
        return Err("offline_sync_conflict_manager_id_required".to_string());
    }

    if json_object_u64(body, "expected_conflict_version").is_none_or(|value| value == 0) {
        return Err("offline_sync_conflict_version_required".to_string());
    }

    if !matches!(
        resolution_action.as_str(),
        "accept_server" | "accept_device" | "manager_adjust" | "retry_operation" | "dismiss"
    ) {
        return Err("offline_sync_conflict_resolution_action_unsupported".to_string());
    }

    if body
        .get("resolution_payload")
        .and_then(serde_json::Value::as_object)
        .is_none()
    {
        return Err("offline_sync_conflict_resolution_payload_required".to_string());
    }

    Ok(())
}

fn endpoint_conflict_id(endpoint: &str) -> Option<String> {
    let marker = "/wp-json/tcg-store/v1/offline/conflicts/";
    let (_, tail) = endpoint.rsplit_once(marker)?;
    let conflict_id = tail.strip_suffix("/resolve")?.trim();

    if conflict_id.is_empty()
        || !conflict_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '_' | '-'))
    {
        return None;
    }

    Some(conflict_id.to_string())
}

fn offline_sync_device_token(
    request: &OfflineSyncRequest,
    store: &impl DeviceTokenStore,
) -> Result<String, String> {
    validate_offline_sync_request(request)?;

    let account = device_token_keyring_account(&request.profile_id, &request.device_public_id)?;

    store
        .get_token(&account)?
        .filter(|token| !token.trim().is_empty())
        .ok_or_else(|| "offline_sync_device_token_missing".to_string())
}

fn summarize_offline_sync_response(
    request: &OfflineSyncRequest,
    http_status: u16,
    body: &serde_json::Value,
) -> OfflineSyncRequestResponse {
    let wordpress_status = json_path_string(body, &["status"]).unwrap_or_else(|| "unknown".to_string());
    let wordpress_code = json_path_string(body, &["code"]).unwrap_or_else(|| "unknown".to_string());
    let data = body.get("data").unwrap_or(&serde_json::Value::Null);
    let status = if (200..300).contains(&http_status) {
        "offline_sync_request_completed"
    } else {
        "offline_sync_request_rejected"
    };
    let route = request.route.trim().to_string();

    let (
        batch_id,
        operation_count,
        accepted_count,
        conflict_count,
        rejected_count,
        accepted_operation_ids,
        conflict_operation_ids,
        rejected_operation_ids,
        pull_domain_count,
        pull_record_count,
        pull_tombstone_count,
        cursor_count,
    ) = if route == "push" {
        summarize_push_sync_data(data)
    } else {
        summarize_pull_sync_data(data)
    };
    let pull_inventory_records = if route == "pull" {
        sanitized_pull_inventory_records(data)
    } else {
        Vec::new()
    };
    let pull_customer_credit_records = if route == "pull" {
        sanitized_pull_customer_credit_records(data)
    } else {
        Vec::new()
    };
    let pull_event_records = if route == "pull" {
        sanitized_pull_event_records(data)
    } else {
        Vec::new()
    };
    let pull_conflict_records = if route == "pull" {
        sanitized_pull_conflict_records(data)
    } else {
        Vec::new()
    };

    OfflineSyncRequestResponse {
        status,
        route,
        endpoint: request.endpoint.trim().to_string(),
        profile_id: request.profile_id.trim().to_string(),
        device_public_id: request.device_public_id.trim().to_string(),
        http_status,
        wordpress_status,
        wordpress_code,
        batch_id,
        operation_count,
        accepted_count,
        conflict_count,
        rejected_count,
        accepted_operation_ids,
        conflict_operation_ids,
        rejected_operation_ids,
        pull_domain_count,
        pull_record_count,
        pull_tombstone_count,
        pull_inventory_records,
        pull_customer_credit_records,
        pull_event_records,
        pull_conflict_records,
        cursor_count,
        network_request_completed: true,
        authorization_header_attached: true,
        raw_token_returned: false,
        raw_response_returned: false,
        credentials_synced_to_app: false,
        direct_mysql_access: false,
        schema_version: 1,
    }
}

fn summarize_push_sync_data(
    data: &serde_json::Value,
) -> (
    Option<String>,
    usize,
    usize,
    usize,
    usize,
    Vec<String>,
    Vec<String>,
    Vec<String>,
    usize,
    usize,
    usize,
    usize,
) {
    let results = data
        .get("results")
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default();
    let accepted_count = results
        .iter()
        .filter(|result| json_path_string(result, &["status"]).as_deref() == Some("accepted"))
        .count();
    let conflict_count = results
        .iter()
        .filter(|result| json_path_string(result, &["status"]).as_deref() == Some("conflict"))
        .count();
    let rejected_count = results
        .iter()
        .filter(|result| json_path_string(result, &["status"]).as_deref() == Some("rejected"))
        .count();
    let accepted_operation_ids = operation_ids_by_status(&results, "accepted");
    let conflict_operation_ids = operation_ids_by_status(&results, "conflict");
    let rejected_operation_ids = operation_ids_by_status(&results, "rejected");

    (
        json_path_string(data, &["batch_id"]),
        json_path_usize(data, &["operation_count"]).unwrap_or(results.len()),
        json_path_usize(data, &["counts", "accepted"]).unwrap_or(accepted_count),
        json_path_usize(data, &["counts", "conflict"]).unwrap_or(conflict_count),
        json_path_usize(data, &["counts", "rejected"]).unwrap_or(rejected_count),
        accepted_operation_ids,
        conflict_operation_ids,
        rejected_operation_ids,
        0,
        0,
        0,
        0,
    )
}

fn operation_ids_by_status(results: &[serde_json::Value], status: &str) -> Vec<String> {
    let mut ids = Vec::new();

    for result in results {
        if json_path_string(result, &["status"]).as_deref() != Some(status) {
            continue;
        }

        let Some(operation_id) = json_path_string(result, &["client_operation_id"]) else {
            continue;
        };
        let clean_operation_id = operation_id.trim();

        if clean_operation_id.is_empty() || ids.iter().any(|value| value == clean_operation_id) {
            continue;
        }

        ids.push(clean_operation_id.to_string());
    }

    ids.into_iter().take(100).collect()
}

fn sanitized_pull_inventory_records(data: &serde_json::Value) -> Vec<OfflineSyncInventoryRecord> {
    let records = data
        .get("domains")
        .and_then(|domains| domains.get("inventory"))
        .and_then(|inventory| inventory.get("data"))
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default();

    records
        .iter()
        .filter_map(sanitized_pull_inventory_record)
        .take(50)
        .collect()
}

fn sanitized_pull_inventory_record(record: &serde_json::Value) -> Option<OfflineSyncInventoryRecord> {
    if json_path_string(record, &["entity_type"]).as_deref() != Some("inventory_item") {
        return None;
    }

    let payload = record.get("payload")?.as_object()?;
    let entity_id = json_path_string(record, &["entity_id"])?;
    let public_id = json_object_string(payload, "public_id");
    let safe_public_id = if public_id.is_empty() { entity_id } else { public_id };
    let row_version = record.get("row_version")?.as_u64()?;
    let updated_at_utc = json_path_string(record, &["updated_at_utc"])?;
    let status = normalized_inventory_status(&json_object_string(payload, "status"));
    let location_label = normalized_location_label(payload);

    Some(OfflineSyncInventoryRecord {
        public_id: safe_public_id,
        row_version,
        card_name: first_non_empty_json_string(payload, &["card_name", "cardName", "name"])
            .unwrap_or_else(|| "Unknown card".to_string()),
        set_name: first_non_empty_json_string(payload, &["set_name", "setName", "set"])
            .unwrap_or_else(|| "Unknown set".to_string()),
        card_number: first_non_empty_json_string(payload, &["card_number", "cardNumber", "number"])
            .unwrap_or_default(),
        condition: first_non_empty_json_string(payload, &["condition", "condition_label"])
            .unwrap_or_else(|| "Raw".to_string()),
        barcode: json_object_string(payload, "barcode"),
        sale_price_minor_units: json_object_money_minor_units(payload),
        sale_currency: first_non_empty_json_string(payload, &["sale_currency", "currency"])
            .unwrap_or_else(|| "USD".to_string())
            .to_ascii_uppercase(),
        location_label,
        status,
        updated_at_utc,
    })
}

fn sanitized_pull_customer_credit_records(
    data: &serde_json::Value,
) -> Vec<OfflineSyncCustomerCreditRecord> {
    let records = data
        .get("domains")
        .and_then(|domains| domains.get("customer_credit"))
        .and_then(|credit| credit.get("data"))
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default();

    records
        .iter()
        .filter_map(sanitized_pull_customer_credit_record)
        .take(25)
        .collect()
}

fn sanitized_pull_customer_credit_record(
    record: &serde_json::Value,
) -> Option<OfflineSyncCustomerCreditRecord> {
    if json_path_string(record, &["entity_type"]).as_deref() != Some("customer_credit_account") {
        return None;
    }

    let payload = record.get("payload")?.as_object()?;
    let entity_id = json_path_string(record, &["entity_id"])?;
    let customer_id = payload
        .get("customer_id")
        .and_then(serde_json::Value::as_u64)
        .or_else(|| numeric_suffix(&entity_id))?;
    let row_version = record.get("row_version")?.as_u64()?;
    let updated_at_utc = json_path_string(record, &["updated_at_utc"])?;
    let label = first_non_empty_json_string(
        payload,
        &[
            "customer_label",
            "label",
            "display_name",
            "customer_name",
            "name",
        ],
    )
    .unwrap_or_else(|| format!("Customer {}", customer_id));
    let available_minor_units = json_object_money_minor_units_for(
        payload,
        &[
            "available_minor_units",
            "credit_balance_minor_units",
            "balance_minor_units",
        ],
        &["available_credit", "credit_balance", "balance"],
    );

    Some(OfflineSyncCustomerCreditRecord {
        customer_id,
        row_version,
        label,
        available_minor_units,
        currency: first_non_empty_json_string(payload, &["credit_currency", "currency"])
            .unwrap_or_else(|| "USD".to_string())
            .to_ascii_uppercase(),
        note: first_non_empty_json_string(payload, &["note", "summary"])
            .unwrap_or_else(|| {
                "Website credit balance refreshed from offline pull.".to_string()
            }),
        updated_at_utc,
    })
}

fn sanitized_pull_event_records(data: &serde_json::Value) -> Vec<OfflineSyncEventRecord> {
    let records = data
        .get("domains")
        .and_then(|domains| domains.get("events"))
        .and_then(|events| events.get("data"))
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default();

    records
        .iter()
        .filter_map(sanitized_pull_event_record)
        .take(25)
        .collect()
}

fn sanitized_pull_event_record(record: &serde_json::Value) -> Option<OfflineSyncEventRecord> {
    if json_path_string(record, &["entity_type"]).as_deref() != Some("event") {
        return None;
    }

    let payload = record.get("payload")?.as_object()?;
    let entity_id = json_path_string(record, &["entity_id"])?;
    let row_version = record.get("row_version")?.as_u64()?;
    let updated_at_utc = json_path_string(record, &["updated_at_utc"])?;
    let starts_at_utc = first_non_empty_json_string(
        payload,
        &["starts_at_utc", "start_at_utc", "start_time_utc", "event_start_utc"],
    )
    .unwrap_or_else(|| updated_at_utc.clone());
    let starts_at_label = first_non_empty_json_string(
        payload,
        &["starts_at_label", "start_label", "event_date_label"],
    )
    .unwrap_or_else(|| starts_at_utc.clone());
    let capacity = payload
        .get("capacity")
        .or_else(|| payload.get("max_players"))
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let registered_count = payload
        .get("registered_count")
        .or_else(|| payload.get("registration_count"))
        .or_else(|| payload.get("players_registered"))
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);

    Some(OfflineSyncEventRecord {
        entity_id,
        row_version,
        title: first_non_empty_json_string(payload, &["title", "event_title", "name"])
            .unwrap_or_else(|| "Untitled event".to_string()),
        starts_at_utc,
        starts_at_label,
        registration_status: normalized_event_registration_status(
            &first_non_empty_json_string(payload, &["registration_status", "status"])
                .unwrap_or_default(),
        ),
        capacity,
        registered_count,
        location_label: first_non_empty_json_string(payload, &["location_label", "location"])
            .unwrap_or_else(|| "Unassigned".to_string()),
        note: first_non_empty_json_string(payload, &["note", "summary"])
            .unwrap_or_else(|| "Website event snapshot refreshed from offline pull.".to_string()),
        updated_at_utc,
    })
}

fn sanitized_pull_conflict_records(data: &serde_json::Value) -> Vec<OfflineSyncConflictRecord> {
    let records = data
        .get("domains")
        .and_then(|domains| domains.get("conflicts"))
        .and_then(|conflicts| conflicts.get("data"))
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default();

    records
        .iter()
        .filter_map(sanitized_pull_conflict_record)
        .take(25)
        .collect()
}

fn sanitized_pull_conflict_record(record: &serde_json::Value) -> Option<OfflineSyncConflictRecord> {
    if json_path_string(record, &["entity_type"]).as_deref() != Some("sync_conflict") {
        return None;
    }

    let payload = record.get("payload")?.as_object()?;
    let conflict_id = first_non_empty_json_string(payload, &["conflict_id", "public_id", "id"])
        .or_else(|| json_path_string(record, &["entity_id"]))?;
    let row_version = record.get("row_version")?.as_u64()?;
    let updated_at_utc = json_path_string(record, &["updated_at_utc"])?;
    let entity_type = normalized_conflict_entity_type(
        &first_non_empty_json_string(payload, &["entity_type", "entity"])
            .unwrap_or_else(|| "inventory".to_string()),
    );
    let operation_type = normalized_conflict_operation_type(
        &first_non_empty_json_string(payload, &["operation_type", "operation"])
            .unwrap_or_else(|| "inventory_update".to_string()),
    );

    Some(OfflineSyncConflictRecord {
        conflict_id,
        row_version,
        title: first_non_empty_json_string(payload, &["title", "conflict_title", "summary"])
            .unwrap_or_else(|| "Offline conflict".to_string()),
        detail: first_non_empty_json_string(payload, &["detail", "conflict_detail", "message"])
            .unwrap_or_else(|| "Website conflict snapshot refreshed from offline pull.".to_string()),
        action: first_non_empty_json_string(payload, &["action", "requested_action"])
            .unwrap_or_else(|| "Review".to_string()),
        entity_type,
        entity_id: first_non_empty_json_string(payload, &["entity_id", "target_id"])
            .unwrap_or_else(|| "unknown".to_string()),
        base_row_version: payload
            .get("base_row_version")
            .or_else(|| payload.get("expected_row_version"))
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(row_version),
        operation_type,
        manager_override: payload
            .get("manager_override")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false),
        updated_at_utc,
    })
}

fn normalized_inventory_status(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "available" => "available".to_string(),
        "reserved" | "pending" | "hold" | "sold" => "reserved".to_string(),
        "conflict" | "needs_review" => "conflict".to_string(),
        _ => "available".to_string(),
    }
}

fn normalized_conflict_entity_type(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "customer_credit" | "credit" => "customer_credit".to_string(),
        "event" | "events" => "event".to_string(),
        _ => "inventory".to_string(),
    }
}

fn normalized_conflict_operation_type(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "credit_redemption" | "customer_credit_update" => "credit_redemption".to_string(),
        "event_checkin" | "event_check_in" => "event_checkin".to_string(),
        "event_reservation" | "event_registration" => "event_reservation".to_string(),
        _ => "inventory_update".to_string(),
    }
}

fn normalized_event_registration_status(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "open" | "registration_open" => "open".to_string(),
        "waitlist" | "waitlisted" => "waitlist".to_string(),
        "full" | "sold_out" => "full".to_string(),
        "closed" | "cancelled" | "canceled" => "closed".to_string(),
        _ => "open".to_string(),
    }
}

fn normalized_location_label(object: &serde_json::Map<String, serde_json::Value>) -> String {
    if let Some(label) = first_non_empty_json_string(object, &["location_label", "location"]) {
        return label;
    }

    if let Some(location_id) = object.get("location_id").and_then(serde_json::Value::as_u64) {
        return format!("Location {}", location_id);
    }

    "Unassigned".to_string()
}

fn first_non_empty_json_string(
    object: &serde_json::Map<String, serde_json::Value>,
    keys: &[&str],
) -> Option<String> {
    keys.iter()
        .find_map(|key| normalized_json_string(object.get(*key)))
}

fn normalized_json_string(value: Option<&serde_json::Value>) -> Option<String> {
    value
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn json_object_money_minor_units(object: &serde_json::Map<String, serde_json::Value>) -> u64 {
    json_object_money_minor_units_for(
        object,
        &["sale_price_minor_units", "price_minor_units"],
        &["sale_price", "price"],
    )
}

fn json_object_money_minor_units_for(
    object: &serde_json::Map<String, serde_json::Value>,
    minor_keys: &[&str],
    amount_keys: &[&str],
) -> u64 {
    if let Some(value) = minor_keys
        .iter()
        .find_map(|key| object.get(*key).and_then(serde_json::Value::as_u64))
    {
        return value;
    }

    amount_keys
        .iter()
        .find_map(|key| object.get(*key).and_then(money_value_to_minor_units))
        .unwrap_or(0)
}

fn money_value_to_minor_units(value: &serde_json::Value) -> Option<u64> {
    if let Some(number) = value.as_u64() {
        return Some(number * 100);
    }

    if let Some(number) = value.as_f64() {
        return u64::try_from((number * 100.0).round() as i128).ok();
    }

    let text = value.as_str()?.trim().trim_start_matches('$').replace(',', "");
    let parsed = text.parse::<f64>().ok()?;

    u64::try_from((parsed * 100.0).round() as i128).ok()
}

fn numeric_suffix(value: &str) -> Option<u64> {
    let suffix = value
        .rsplit(|character: char| !character.is_ascii_digit())
        .find(|part| !part.is_empty())?;

    suffix.parse::<u64>().ok()
}

fn summarize_pull_sync_data(
    data: &serde_json::Value,
) -> (
    Option<String>,
    usize,
    usize,
    usize,
    usize,
    Vec<String>,
    Vec<String>,
    Vec<String>,
    usize,
    usize,
    usize,
    usize,
) {
    let Some(domains) = data.get("domains").and_then(serde_json::Value::as_object) else {
        return (None, 0, 0, 0, 0, Vec::new(), Vec::new(), Vec::new(), 0, 0, 0, 0);
    };

    let mut record_count = 0;
    let mut tombstone_count = 0;
    let mut cursor_count = 0;

    for domain in domains.values() {
        record_count += domain
            .get("data")
            .and_then(serde_json::Value::as_array)
            .map_or(0, Vec::len);
        tombstone_count += domain
            .get("tombstones")
            .and_then(serde_json::Value::as_array)
            .map_or(0, Vec::len);

        if json_path_string(domain, &["cursor"]).is_some() {
            cursor_count += 1;
        }
    }

    (
        None,
        0,
        0,
        0,
        0,
        Vec::new(),
        Vec::new(),
        Vec::new(),
        domains.len(),
        record_count,
        tombstone_count,
        cursor_count,
    )
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

fn json_path_string(value: &serde_json::Value, path: &[&str]) -> Option<String> {
    let mut current = value;

    for key in path {
        current = current.get(key)?;
    }

    current
        .as_str()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn json_path_usize(value: &serde_json::Value, path: &[&str]) -> Option<usize> {
    let mut current = value;

    for key in path {
        current = current.get(key)?;
    }

    current.as_u64().and_then(|value| usize::try_from(value).ok())
}

fn json_object_string(object: &serde_json::Map<String, serde_json::Value>, key: &str) -> String {
    object
        .get(key)
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn json_object_u64(object: &serde_json::Map<String, serde_json::Value>, key: &str) -> Option<u64> {
    object.get(key).and_then(serde_json::Value::as_u64)
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

fn sanitized_operation_id_list(values: &[String]) -> Result<Vec<String>, String> {
    let mut operation_ids = Vec::new();

    for value in values {
        let operation_id = value.trim();

        if operation_id.is_empty() {
            continue;
        }

        let normalized = operation_id.to_ascii_lowercase();

        if operation_id.len() > 160
            || operation_id.chars().any(char::is_whitespace)
            || normalized.contains("password")
            || normalized.contains("api_key")
            || normalized.contains("private_key")
            || normalized.contains("bearer ")
        {
            return Err("offline_queue_operation_id_invalid".to_string());
        }

        if operation_ids.iter().any(|existing| existing == operation_id) {
            continue;
        }

        operation_ids.push(operation_id.to_string());

        if operation_ids.len() >= 100 {
            break;
        }
    }

    if operation_ids.is_empty() {
        return Err("offline_queue_mark_synced_ids_required".to_string());
    }

    Ok(operation_ids)
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
        "event_reservation" | "event_checkin" => "event",
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
            mark_offline_operations_synced,
            void_offline_operations,
            store_device_token,
            get_device_token_status,
            delete_device_token,
            pair_offline_device,
            run_offline_sync_request
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

    fn valid_pair_offline_device_request() -> PairOfflineDeviceRequest {
        PairOfflineDeviceRequest {
            endpoint:
                "https://vbf.2a7.myftpupload.com/wp-json/tcg-store/v1/offline/devices/register"
                    .to_string(),
            profile_id: "pug-game-shop-staging".to_string(),
            body: PairOfflineDeviceBody {
                pairing_code: "PAIR-2026-REGISTER-DEVICE".to_string(),
                installation_id: "front-counter-install".to_string(),
                device_label: "Front Counter".to_string(),
                device_mode: "staff".to_string(),
                location_id: 2,
                manager_id: 42,
                app_version: "0.164.0".to_string(),
                platform: "windows".to_string(),
                capabilities: serde_json::json!({
                    "barcode_scanner": true,
                    "label_printer": false,
                    "touchscreen": true
                }),
                requested_scopes: vec![
                    "offline_pull".to_string(),
                    "offline_push".to_string(),
                    "conflicts".to_string(),
                ],
                schema_version: 1,
            },
        }
    }

    fn registered_wordpress_pairing_response() -> WordPressDeviceRegistrationResponse {
        WordPressDeviceRegistrationResponse {
            status: Some("registered".to_string()),
            status_code: Some(201),
            code: Some("offline_device_registered".to_string()),
            data: Some(WordPressDeviceRegistrationData {
                device_id: Some("00010203-0405-4607-8809-0a0b0c0d0e0f".to_string()),
                device_token: Some(
                    "101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f".to_string(),
                ),
                token_expires_at_utc: Some("2026-06-08T12:00:00Z".to_string()),
                scopes: Some(vec![
                    "offline_pull".to_string(),
                    "offline_push".to_string(),
                    "conflicts".to_string(),
                ]),
            }),
            errors: None,
        }
    }

    fn valid_pull_sync_request() -> OfflineSyncRequest {
        OfflineSyncRequest {
            endpoint: "https://vbf.2a7.myftpupload.com/wp-json/tcg-store/v1/offline/pull"
                .to_string(),
            route: "pull".to_string(),
            profile_id: "pug-game-shop-staging".to_string(),
            device_public_id: "device-public-123".to_string(),
            body: serde_json::json!({
                "device_id": "device-public-123",
                "domains": ["inventory", "customer_credit", "events", "conflicts"],
                "cursors": {},
                "page_size": 100,
                "include_tombstones": true,
                "schema_version": 1
            }),
            idempotency_key: None,
        }
    }

    fn valid_push_sync_request() -> OfflineSyncRequest {
        OfflineSyncRequest {
            endpoint: "https://vbf.2a7.myftpupload.com/wp-json/tcg-store/v1/offline/push"
                .to_string(),
            route: "push".to_string(),
            profile_id: "pug-game-shop-staging".to_string(),
            device_public_id: "device-public-123".to_string(),
            body: serde_json::json!({
                "batch_id": "offline-batch-device-public-123-20260607120000",
                "device_id": "device-public-123",
                "operations": [
                    {
                        "client_operation_id": "op-push-route-01",
                        "device_id": "device-public-123",
                        "location_id": 2,
                        "actor_id": 42,
                        "operation_type": "inventory_reservation",
                        "entity_type": "inventory",
                        "entity_id": "inv-1001",
                        "base_row_version": 4,
                        "occurred_at_local": "2026-06-06T10:15:00-04:00",
                        "queued_at_utc": "2026-06-06T14:15:05Z",
                        "payload": {
                            "localStatus": "offline_pending_sync"
                        },
                        "authorization_context": {
                            "manager_user_id": 42
                        },
                        "schema_version": 1
                    }
                ],
                "schema_version": 1
            }),
            idempotency_key: Some("offline-batch-device-public-123-20260607120000".to_string()),
        }
    }

    fn valid_conflict_resolution_sync_request() -> OfflineSyncRequest {
        OfflineSyncRequest {
            endpoint: "https://vbf.2a7.myftpupload.com/wp-json/tcg-store/v1/offline/conflicts/conflict-inv-1004-location/resolve"
                .to_string(),
            route: "conflict_resolution".to_string(),
            profile_id: "pug-game-shop-staging".to_string(),
            device_public_id: "device-public-123".to_string(),
            body: serde_json::json!({
                "conflict_id": "conflict-inv-1004-location",
                "resolution_id": "resolve-conflict-inv-1004-location-20260607120000",
                "device_id": "device-public-123",
                "manager_id": 42,
                "resolution_action": "accept_server",
                "resolution_note": "Manager chose the website snapshot.",
                "resolved_at_utc": "2026-06-07T12:00:00Z",
                "expected_conflict_version": 2,
                "resolution_payload": {
                    "conflict_title": "Mox Amber location mismatch",
                    "source": "offline_app"
                },
                "schema_version": 1
            }),
            idempotency_key: Some(
                "resolve-conflict-inv-1004-location-20260607120000".to_string(),
            ),
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
    fn pairing_command_response_stores_device_token_without_returning_secret() {
        let store = MemoryDeviceTokenStore::default();
        let request = valid_pair_offline_device_request();

        let result = pair_offline_device_from_registration_response(
            request.clone(),
            registered_wordpress_pairing_response(),
            201,
            &store,
        )
        .expect("pairing response should store token");

        assert_eq!(result.status, "paired_and_stored_in_desktop_secure_store");
        assert_eq!(result.profile_id, "pug-game-shop-staging");
        assert_eq!(
            result.device_public_id,
            "00010203-0405-4607-8809-0a0b0c0d0e0f"
        );
        assert!(result.token_persisted);
        assert!(!result.raw_token_returned);
        assert!(!result.credentials_synced_to_app);
        assert_eq!(result.scope_count, 3);
        assert_eq!(result.wordpress_status_code, 201);

        let status = device_token_status_with_store(
            DeviceTokenStatusRequest {
                profile_id: request.profile_id,
                device_public_id: result.device_public_id,
            },
            &store,
        )
        .expect("stored token should be discoverable");

        assert!(status.token_present);
        assert!(!status.raw_token_returned);
    }

    #[test]
    fn pairing_command_response_rejects_wordpress_errors_without_storing_token() {
        let store = MemoryDeviceTokenStore::default();
        let mut response = registered_wordpress_pairing_response();
        response.status = Some("rejected".to_string());
        response.status_code = Some(403);
        response.code = Some("offline_device_pairing_authorization_denied".to_string());
        response.data = None;
        response.errors = Some(vec!["manager_not_allowed".to_string()]);

        assert_eq!(
            pair_offline_device_from_registration_response(
                valid_pair_offline_device_request(),
                response,
                403,
                &store,
            )
            .expect_err("rejected pairing should fail"),
            "manager_not_allowed"
        );
    }

    #[test]
    fn offline_sync_request_requires_stored_device_token() {
        let store = MemoryDeviceTokenStore::default();
        let request = valid_pull_sync_request();

        assert_eq!(
            offline_sync_device_token(&request, &store).expect_err("missing token should fail"),
            "offline_sync_device_token_missing"
        );

        store
            .set_token(
                "tcg-store-offline:pug-game-shop-staging:device-public-123",
                "offline-device-token-2026-abcdef",
            )
            .expect("memory token should store");

        assert_eq!(
            offline_sync_device_token(&request, &store).expect("token should load"),
            "offline-device-token-2026-abcdef"
        );
    }

    #[test]
    fn offline_sync_request_rejects_invalid_endpoint_and_body_shape() {
        let mut insecure = valid_pull_sync_request();
        insecure.endpoint = "http://example.com/wp-json/tcg-store/v1/offline/pull".to_string();

        assert_eq!(
            validate_offline_sync_request(&insecure).expect_err("https required"),
            "offline_sync_endpoint_https_required"
        );

        let mut mismatch = valid_pull_sync_request();
        mismatch.body["device_id"] = serde_json::json!("other-device");

        assert_eq!(
            validate_offline_sync_request(&mismatch).expect_err("device mismatch"),
            "offline_sync_device_id_mismatch"
        );

        let mut push_without_key = valid_push_sync_request();
        push_without_key.idempotency_key = None;

        assert_eq!(
            validate_offline_sync_request(&push_without_key).expect_err("idempotency required"),
            "offline_sync_push_idempotency_key_required"
        );
    }

    #[test]
    fn offline_sync_request_accepts_guarded_conflict_resolution_route() {
        let request = valid_conflict_resolution_sync_request();

        validate_offline_sync_request(&request).expect("conflict resolution request should pass");

        let mut missing_key = request.clone();
        missing_key.idempotency_key = None;

        assert_eq!(
            validate_offline_sync_request(&missing_key).expect_err("idempotency required"),
            "offline_sync_conflict_resolution_idempotency_key_required"
        );

        let mut conflict_mismatch = request.clone();
        conflict_mismatch.body["conflict_id"] = serde_json::json!("conflict-other");

        assert_eq!(
            validate_offline_sync_request(&conflict_mismatch)
                .expect_err("conflict id must match route"),
            "offline_sync_conflict_id_mismatch"
        );

        let mut action_unsupported = request;
        action_unsupported.body["resolution_action"] = serde_json::json!("approve");

        assert_eq!(
            validate_offline_sync_request(&action_unsupported)
                .expect_err("resolution action must be canonical"),
            "offline_sync_conflict_resolution_action_unsupported"
        );
    }

    #[test]
    fn offline_sync_pull_summary_never_returns_raw_token_or_response_body() {
        let request = valid_pull_sync_request();
        let body = serde_json::json!({
            "status": "ready",
            "status_code": 200,
            "code": "offline_pull_response_ready",
            "data": {
                "device_id": "device-public-123",
                "schema_version": 1,
                "domains": {
                    "inventory": {
                        "cursor": "inv-cursor-02",
                        "has_more": true,
                        "data": [
                            {
                                "entity_type": "inventory_item",
                                "entity_id": "inv-1001",
                                "row_version": 12,
                                "updated_at_utc": "2026-06-06T20:00:00Z",
                                "payload": {
                                    "public_id": "inv-1001",
                                    "card_name": "Charizard",
                                    "set_name": "Base Set",
                                    "card_number": "4/102",
                                    "condition": "NM",
                                    "barcode": "PKM-BASE-004-HOLO",
                                    "sale_price": "125.00",
                                    "sale_currency": "USD",
                                    "location_id": 2,
                                    "status": "available"
                                }
                            }
                        ],
                        "tombstones": []
                    },
                    "customer_credit": {
                        "cursor": "credit-cursor-01",
                        "has_more": false,
                        "data": [
                            {
                                "entity_type": "customer_credit_account",
                                "entity_id": "customer-91",
                                "row_version": 7,
                                "updated_at_utc": "2026-06-07T17:00:00Z",
                                "payload": {
                                    "customer_id": 91,
                                    "customer_label": "Customer credit",
                                    "credit_balance": "246.50",
                                    "credit_currency": "USD",
                                    "note": "Website credit balance refreshed."
                                }
                            }
                        ],
                        "tombstones": []
                    },
                    "events": {
                        "cursor": "evt-cursor-01",
                        "has_more": false,
                        "data": [
                            {
                                "entity_type": "event",
                                "entity_id": "event-100",
                                "row_version": 4,
                                "updated_at_utc": "2026-06-07T18:00:00Z",
                                "payload": {
                                    "title": "Friday Commander Night",
                                    "starts_at_utc": "2026-06-12T23:00:00Z",
                                    "starts_at_label": "Fri Jun 12, 7:00 PM",
                                    "registration_status": "open",
                                    "capacity": 24,
                                    "registered_count": 11,
                                    "location_label": "Event Room",
                                    "note": "Website event snapshot refreshed."
                                }
                            }
                        ],
                        "tombstones": [
                            {
                                "entity_type": "event",
                                "entity_id": "event-404",
                                "row_version": 2,
                                "deleted_at_utc": "2026-06-06T21:00:00Z"
                            }
                        ]
                    },
                    "conflicts": {
                        "cursor": "conflict-cursor-01",
                        "has_more": false,
                        "data": [
                            {
                                "entity_type": "sync_conflict",
                                "entity_id": "conflict-inv-1004-location",
                                "row_version": 3,
                                "updated_at_utc": "2026-06-07T19:00:00Z",
                                "payload": {
                                    "conflict_id": "conflict-inv-1004-location",
                                    "title": "Mox Amber location mismatch",
                                    "detail": "Website snapshot says Sold.",
                                    "action": "Review",
                                    "entity_type": "inventory",
                                    "entity_id": "inv-1004",
                                    "base_row_version": 17,
                                    "operation_type": "inventory_update",
                                    "manager_override": false
                                }
                            }
                        ],
                        "tombstones": []
                    }
                }
            }
        });

        let summary = summarize_offline_sync_response(&request, 200, &body);

        assert_eq!(summary.status, "offline_sync_request_completed");
        assert_eq!(summary.route, "pull");
        assert_eq!(summary.wordpress_status, "ready");
        assert_eq!(summary.wordpress_code, "offline_pull_response_ready");
        assert_eq!(summary.pull_domain_count, 4);
        assert_eq!(summary.pull_record_count, 4);
        assert_eq!(summary.pull_tombstone_count, 1);
        assert_eq!(summary.pull_inventory_records.len(), 1);
        assert_eq!(summary.pull_inventory_records[0].public_id, "inv-1001");
        assert_eq!(summary.pull_inventory_records[0].card_name, "Charizard");
        assert_eq!(summary.pull_inventory_records[0].sale_price_minor_units, 12500);
        assert_eq!(summary.pull_inventory_records[0].location_label, "Location 2");
        assert_eq!(summary.pull_inventory_records[0].status, "available");
        assert_eq!(summary.pull_customer_credit_records.len(), 1);
        assert_eq!(summary.pull_customer_credit_records[0].customer_id, 91);
        assert_eq!(summary.pull_customer_credit_records[0].row_version, 7);
        assert_eq!(
            summary.pull_customer_credit_records[0].available_minor_units,
            24650
        );
        assert_eq!(summary.pull_customer_credit_records[0].currency, "USD");
        assert_eq!(summary.pull_event_records.len(), 1);
        assert_eq!(summary.pull_event_records[0].entity_id, "event-100");
        assert_eq!(summary.pull_event_records[0].row_version, 4);
        assert_eq!(summary.pull_event_records[0].title, "Friday Commander Night");
        assert_eq!(summary.pull_event_records[0].registration_status, "open");
        assert_eq!(summary.pull_event_records[0].capacity, 24);
        assert_eq!(summary.pull_event_records[0].registered_count, 11);
        assert_eq!(summary.pull_conflict_records.len(), 1);
        assert_eq!(
            summary.pull_conflict_records[0].conflict_id,
            "conflict-inv-1004-location"
        );
        assert_eq!(summary.pull_conflict_records[0].row_version, 3);
        assert_eq!(summary.pull_conflict_records[0].entity_type, "inventory");
        assert_eq!(summary.pull_conflict_records[0].operation_type, "inventory_update");
        assert_eq!(summary.cursor_count, 4);
        assert!(summary.authorization_header_attached);
        assert!(!summary.raw_token_returned);
        assert!(!summary.raw_response_returned);
        assert!(!summary.credentials_synced_to_app);
    }

    #[test]
    fn offline_sync_push_summary_counts_operation_outcomes_without_raw_payload() {
        let request = valid_push_sync_request();
        let body = serde_json::json!({
            "status": "ready",
            "status_code": 200,
            "code": "offline_push_response_ready",
            "data": {
                "batch_id": "offline-batch-device-public-123-20260607120000",
                "operation_count": 3,
                "counts": {
                    "accepted": 1,
                    "conflict": 1,
                    "rejected": 1
                },
                "results": [
                    {"client_operation_id": "op-accepted", "status": "accepted"},
                    {"client_operation_id": "op-conflict", "status": "conflict"},
                    {"client_operation_id": "op-rejected", "status": "rejected"}
                ]
            }
        });

        let summary = summarize_offline_sync_response(&request, 200, &body);

        assert_eq!(summary.status, "offline_sync_request_completed");
        assert_eq!(summary.route, "push");
        assert_eq!(
            summary.batch_id,
            Some("offline-batch-device-public-123-20260607120000".to_string())
        );
        assert_eq!(summary.operation_count, 3);
        assert_eq!(summary.accepted_count, 1);
        assert_eq!(summary.conflict_count, 1);
        assert_eq!(summary.rejected_count, 1);
        assert_eq!(summary.accepted_operation_ids, vec!["op-accepted".to_string()]);
        assert_eq!(summary.conflict_operation_ids, vec!["op-conflict".to_string()]);
        assert_eq!(summary.rejected_operation_ids, vec!["op-rejected".to_string()]);
        assert_eq!(summary.pull_record_count, 0);
        assert!(summary.network_request_completed);
        assert!(summary.authorization_header_attached);
        assert!(!summary.raw_token_returned);
        assert!(!summary.raw_response_returned);
    }

    #[test]
    fn offline_sync_conflict_resolution_summary_never_returns_raw_payload() {
        let request = valid_conflict_resolution_sync_request();
        let body = serde_json::json!({
            "status": "ready",
            "status_code": 200,
            "code": "offline_conflict_resolution_applied",
            "data": {
                "conflict_id": "conflict-inv-1004-location",
                "resolution_id": "resolve-conflict-inv-1004-location-20260607120000",
                "status": "resolved",
                "row_version": 3,
                "schema_version": 1
            }
        });

        let summary = summarize_offline_sync_response(&request, 200, &body);

        assert_eq!(summary.status, "offline_sync_request_completed");
        assert_eq!(summary.route, "conflict_resolution");
        assert_eq!(summary.wordpress_code, "offline_conflict_resolution_applied");
        assert_eq!(summary.operation_count, 0);
        assert_eq!(summary.pull_record_count, 0);
        assert!(summary.network_request_completed);
        assert!(summary.authorization_header_attached);
        assert!(!summary.raw_token_returned);
        assert!(!summary.raw_response_returned);
        assert!(!summary.credentials_synced_to_app);
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
            ("event_checkin", "event"),
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
    fn mark_synced_command_removes_accepted_operations_from_pending_restore() {
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");
        let first_operation = valid_operation();
        let mut second_operation = valid_operation();
        second_operation.client_operation_id = "offline-inventory-accepted-20260607120500".to_string();
        second_operation.entity_id = "87".to_string();

        queue_offline_operation_with_connection(first_operation.clone(), &connection)
            .expect("first operation should queue");
        queue_offline_operation_with_connection(second_operation.clone(), &connection)
            .expect("second operation should queue");

        let mark_result = mark_offline_operations_synced_with_connection(
            MarkOfflineOperationsSyncedRequest {
                accepted_operation_ids: vec![
                    second_operation.client_operation_id.clone(),
                    second_operation.client_operation_id.clone(),
                    "not-in-local-queue".to_string(),
                ],
            },
            &connection,
        )
        .expect("accepted operation ids should mark synced");

        assert_eq!(mark_result.status, "marked_local_queue_synced");
        assert_eq!(mark_result.persistence_mode, "sqlite");
        assert_eq!(mark_result.accepted_operation_count, 2);
        assert_eq!(mark_result.sqlite_rows_affected, 1);
        assert!(mark_result.queue_replay_applied);
        assert!(mark_result.canonical_mutations_deferred);
        assert!(!mark_result.direct_mysql_access);
        assert!(!mark_result.network_write);

        let pending = list_offline_operations_with_connection(&connection, Some(10))
            .expect("pending queue should load");
        assert_eq!(pending.operation_count, 1);
        assert_eq!(
            pending.operations[0].client_operation_id,
            first_operation.client_operation_id
        );

        let stored_status: String = connection
            .query_row(
                "SELECT status FROM operation_queue WHERE client_operation_id = ?1",
                params![second_operation.client_operation_id],
                |row| row.get(0),
            )
            .expect("accepted operation should remain with synced status");
        assert_eq!(stored_status, "synced");
    }

    #[test]
    fn mark_synced_command_rejects_empty_or_unsafe_operation_ids() {
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");

        let empty_error = mark_offline_operations_synced_with_connection(
            MarkOfflineOperationsSyncedRequest {
                accepted_operation_ids: vec![" ".to_string()],
            },
            &connection,
        )
        .expect_err("empty ids should be rejected");
        assert_eq!(empty_error, "offline_queue_mark_synced_ids_required");

        let unsafe_error = mark_offline_operations_synced_with_connection(
            MarkOfflineOperationsSyncedRequest {
                accepted_operation_ids: vec!["bearer secret".to_string()],
            },
            &connection,
        )
        .expect_err("unsafe ids should be rejected");
        assert_eq!(unsafe_error, "offline_queue_operation_id_invalid");
    }

    #[test]
    fn void_command_removes_pending_operations_from_restore_without_delete() {
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");
        let first_operation = valid_operation();
        let mut second_operation = valid_operation();
        second_operation.client_operation_id = "offline-inventory-voided-20260607120500".to_string();
        second_operation.entity_id = "87".to_string();

        queue_offline_operation_with_connection(first_operation.clone(), &connection)
            .expect("first operation should queue");
        queue_offline_operation_with_connection(second_operation.clone(), &connection)
            .expect("second operation should queue");

        let void_result = void_offline_operations_with_connection(
            VoidOfflineOperationsRequest {
                operation_ids: vec![
                    second_operation.client_operation_id.clone(),
                    second_operation.client_operation_id.clone(),
                    "not-in-local-queue".to_string(),
                ],
            },
            &connection,
        )
        .expect("operation ids should mark rejected locally");

        assert_eq!(void_result.status, "voided_local_queue_operations");
        assert_eq!(void_result.persistence_mode, "sqlite");
        assert_eq!(void_result.operation_count, 2);
        assert_eq!(void_result.sqlite_rows_affected, 1);
        assert!(void_result.queue_void_applied);
        assert!(void_result.queue_replay_deferred);
        assert!(void_result.canonical_mutations_deferred);
        assert!(!void_result.direct_mysql_access);
        assert!(!void_result.network_write);

        let pending = list_offline_operations_with_connection(&connection, Some(10))
            .expect("pending queue should load");
        assert_eq!(pending.operation_count, 1);
        assert_eq!(
            pending.operations[0].client_operation_id,
            first_operation.client_operation_id
        );

        let stored_status: String = connection
            .query_row(
                "SELECT status FROM operation_queue WHERE client_operation_id = ?1",
                params![second_operation.client_operation_id],
                |row| row.get(0),
            )
            .expect("voided operation should remain with rejected status");
        assert_eq!(stored_status, "rejected");
    }

    #[test]
    fn void_command_rejects_empty_or_unsafe_operation_ids() {
        let connection = Connection::open_in_memory().expect("in-memory sqlite should open");

        let empty_error = void_offline_operations_with_connection(
            VoidOfflineOperationsRequest {
                operation_ids: vec![" ".to_string()],
            },
            &connection,
        )
        .expect_err("empty ids should be rejected");
        assert_eq!(empty_error, "offline_queue_mark_synced_ids_required");

        let unsafe_error = void_offline_operations_with_connection(
            VoidOfflineOperationsRequest {
                operation_ids: vec!["password-secret".to_string()],
            },
            &connection,
        )
        .expect_err("unsafe ids should be rejected");
        assert_eq!(unsafe_error, "offline_queue_operation_id_invalid");
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
