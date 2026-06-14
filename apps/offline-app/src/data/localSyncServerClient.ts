export type LocalSyncAccessSection =
  | "Inventory"
  | "Trade-Ins"
  | "Kiosk"
  | "Queue"
  | "Events"
  | "Customers"
  | "Reports"
  | "Sync"
  | "Status"
  | "Conflicts"
  | "Settings"

export type LocalSyncUserRole = "staff" | "manager" | "owner"

export type LocalSyncUser = {
  id: string
  name: string
  role: LocalSyncUserRole
  access: LocalSyncAccessSection[]
  pin_hash_returned: false
}

export type LocalSyncSession = {
  token: string
  userId: string
  role: LocalSyncUserRole
  access: LocalSyncAccessSection[]
  expiresAtUtc: string
}

export type LocalSyncOk<T extends Record<string, unknown> = Record<string, never>> = {
  status: "ok"
} & T

export type LocalSyncBlocked = {
  status: "blocked"
  code: string
  message: string
}

export type LocalSyncUnavailable = {
  status: "unavailable"
  code: "local_sync_server_unavailable"
  message: string
}

export type LocalSyncResult<T extends Record<string, unknown> = Record<string, never>> =
  | LocalSyncOk<T>
  | LocalSyncBlocked
  | LocalSyncUnavailable

export type LocalSyncAuthResult = LocalSyncResult<{
  session: LocalSyncSession
  user: LocalSyncUser
  raw_pin_returned: false
  pin_hash_returned: false
}>

export type LocalSyncAccessPolicyResult = LocalSyncResult<{
  users: LocalSyncUser[]
  policy_source: "cached_wordpress_policy"
  pin_credentials_returned: false
}>

export type LocalSyncSetupStatusResult = LocalSyncResult<{
  action: "local_sync_server_setup_status"
  schema_version: 3
  topology: "lan_middleman_server"
  setup_screen_mode: "single_configurable_website"
  one_website_mode: true
  store_id: string
  server_url: string
  setup_status_path: "/setup/status"
  website_url: string
  website_configured: boolean
  setup_required: boolean
  rest_base_path: "/wp-json/tcg-store/v1" | string
  wordpress_rest_base: string
  local_database: "store-sync.sqlite"
  config_source: "server_environment" | "manager_app_settings" | string
  configured_at_utc: string
  wordpress_connector_restart_required: boolean
  credit_approval_threshold_minor_units: number
  wordpress_pull_configured: boolean
  wordpress_push_configured: boolean
  wordpress_inventory_push_configured: boolean
  wordpress_inventory_sale_push_configured?: boolean
  wordpress_fulfillment_pull_configured?: boolean
  wordpress_fulfillment_status_push_configured?: boolean
  wordpress_event_registration_push_configured: boolean
  wordpress_event_checkin_push_configured: boolean
  wordpress_customer_push_configured: boolean
  wordpress_credit_push_configured: boolean
  wordpress_kiosk_order_push_configured: boolean
  scrydex_catalog_proxy_configured: boolean
  credentials_synced_to_client: false
  raw_credentials_returned: false
  direct_mysql_access: false
}>

export type LocalSyncSetupConfigInput = {
  storeId?: string
  serverUrl?: string
  websiteUrl: string
  restBasePath?: string
  creditApprovalThresholdMinorUnits?: number
}

export type LocalSyncSetupConfigResult = LocalSyncResult<{
  action: "local_sync_server_setup_config_saved"
  config: {
    store_id: string
    server_url: string
    website_url: string
    rest_base_path: string
    wordpress_rest_base: string
    local_database: "store-sync.sqlite" | string
    config_source: "manager_app_settings" | string
    configured_at_utc: string
    wordpress_connector_restart_required: boolean
    credit_approval_threshold_minor_units: number
    credentials_synced_to_client: false
    raw_credentials_returned: false
    raw_credentials_accepted: false
  }
  setup_status: Extract<LocalSyncSetupStatusResult, { status: "ok" }>
  wordpress_connector_restart_required: boolean
  credentials_synced_to_client: false
  raw_credentials_returned: false
  raw_credentials_accepted: false
}>

export type LocalSyncClientDevice = {
  device_id: string
  device_label: string
  mode: "employee" | "kiosk" | "manager"
  app_version: string
  platform: string
  network_status: "online" | "offline" | "degraded"
  setup_status: "ready" | "setup_required"
  connection_status: "online" | "offline"
  capabilities: LocalSyncAccessSection[]
  heartbeat_interval_seconds: number
  first_seen_at_utc: string
  last_seen_at_utc: string
  seconds_since_seen: number | null
  stale_after_utc: string
  server_url: string
  website_url: string
  credentials_synced_to_client: false
  raw_credentials_returned: false
}

export type LocalSyncDeviceHeartbeatResult = LocalSyncResult<{
  action: "local_client_device_heartbeat"
  device: LocalSyncClientDevice
  device_count: number
  online_count: number
  offline_count: number
  setup_ready_count: number
  setup_required_count: number
  heartbeat_timeout_seconds: number
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncDeviceStatusResult = LocalSyncResult<{
  action: "local_client_device_status"
  topology: "lan_middleman_server"
  server_authority: "local_sync_server"
  heartbeat_timeout_seconds: number
  devices: LocalSyncClientDevice[]
  device_count: number
  online_count: number
  offline_count: number
  setup_ready_count: number
  setup_required_count: number
  kiosk_count: number
  employee_count: number
  manager_count: number
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncInventoryItem = {
  public_id: string
  wordpress_public_id?: string
  row_version: number
  provider_card_id: string
  reference_variant_id?: number | null
  provider_variant_id: string
  game: "pokemon" | "magicthegathering" | "magic" | "lorcana" | "onepiece" | "one-piece"
  card_name: string
  set_name: string
  set_code: string
  card_number: string
  printed_number: string
  variant: string
  finish: string
  language: string
  raw_or_graded: "raw" | "graded"
  grading_company?: string
  grade?: string
  cert_number?: string
  condition: string
  barcode: string
  price_minor_units: number
  currency: "USD"
  location: string
  status: "available" | "reserved" | "sold" | "conflict" | "pending_intake"
  image_url: string
  back_image_url: string
  online_visibility: "hidden" | "visible" | "staff_only"
  kiosk_visibility: "hidden" | "visible" | "staff_only"
  pos_visibility: "hidden" | "visible" | "staff_only"
  square_catalog_item_id: string
  square_catalog_variation_id: string
  external_sync_state: "pending" | "synced" | "square_synced" | "failed" | "conflict"
  source: "cached" | "queued" | "accepted"
}

export type LocalSyncReservation = {
  reservation_id: string
  inventory_public_id: string
  source: "employee" | "kiosk"
  hold_reason: string
  actor_id: string
  status: "queued"
  created_at_utc: string
}

export type LocalSyncInventorySearchResult = LocalSyncResult<{
  items: LocalSyncInventoryItem[]
  local_cache_source: "local_sync_server"
}>

export type LocalSyncReservationResult = LocalSyncResult<{
  item: LocalSyncInventoryItem
  reservation: LocalSyncReservation
  wordpress_acceptance_required: true
}>

export type LocalSyncAutoSyncOperationResult = {
  operation_id: string
  operation_type: string
  entity_id: string
  status: "accepted" | "retry" | "rejected"
  code?: string
  message?: string
  wordpress_code?: string
  http_status?: number
  errors?: string[]
  wordpress_inventory?: {
    public_id: string
    sku: string
    barcode: string
    status: LocalSyncInventoryItem["status"]
    price_change_log_persisted?: boolean
  }
  woocommerce_product_sync?: {
    requested: boolean
    synced: boolean
    status: string
    product_ids: number[]
    errors: string[]
    payment_capture_deferred: boolean
    square_inventory_deferred: boolean
  }
  square_payment_capture_supported?: false
  payment_capture_authority?: "official_woocommerce_square_extension"
}

export type LocalSyncInventoryIntakeResult = LocalSyncResult<{
  item: LocalSyncInventoryItem
  items: LocalSyncInventoryItem[]
  quantity_added: number
  wordpress_acceptance_required: true
  wordpress_auto_sync_performed: boolean
  wordpress_accepted_count: number
  wordpress_retry_count: number
  auto_sync_results: LocalSyncAutoSyncOperationResult[]
  local_queue_depth: number
  label_print_deferred: true
}>

export type LocalSyncStockByCondition = {
  condition: string
  quantity: number
}

export type LocalSyncScryDexPricePoint = {
  reference_variant_id?: number | null
  provider_variant_id: string
  condition_code: string
  raw_or_graded: "raw" | "graded"
  market_price_minor_units: number
  low_price_minor_units: number
  mid_price_minor_units: number
  high_price_minor_units: number
  currency: "USD"
  observed_at_utc: string
}

export type LocalSyncScryDexVariant = {
  reference_variant_id?: number | null
  provider_variant_id: string
  variant: string
  finish: string
  parallel_name: string
  edition: string
  language: string
  front_image_url?: string
  back_image_url?: string
  raw_or_graded_support: "raw" | "graded" | "both"
  attributes: Record<string, unknown>
}

export type LocalSyncScryDexCard = {
  provider_card_id: string
  game: "pokemon" | "magicthegathering" | "magic" | "lorcana" | "onepiece" | "one-piece"
  card_name: string
  set_name: string
  set_code: string
  card_number: string
  printed_number: string
  suggested_barcode: string
  market_price_minor_units: number
  currency: "USD"
  image_url: string
  catalog_source: "wordpress_catalog_cache" | "local_reference_cache"
  price_observed_at_utc: string | null
  catalog_synced_at_utc: string
  stock_available_count: number
  stock_total_count: number
  stock_by_condition: LocalSyncStockByCondition[]
  price_points: LocalSyncScryDexPricePoint[]
  variants: LocalSyncScryDexVariant[]
}

export type LocalSyncScryDexSearchResult = LocalSyncResult<{
  cards: LocalSyncScryDexCard[]
  query: string
  game: LocalSyncScryDexCard["game"]
  set_filter?: string
  result_limit?: number | "all"
  source: "wordpress_catalog_cache" | "local_reference_cache" | "wordpress_proxy"
  lookup_order: ("local_reference_cache" | "wordpress_catalog_proxy" | "scrydex_provider")[]
  local_reference_cache_hit: boolean
  wordpress_proxy_performed: boolean
  wordpress_proxy_required: boolean
  credential_storage: "wordpress_server_settings"
  credentials_synced_to_client: false
  live_provider_request_performed: boolean
}>

export type LocalSyncKioskOrderStatus = "queued" | "accepted" | "pulling" | "ready" | "completed"
export type LocalSyncFulfillmentOrderStatus = "awaiting_pull" | "pulling" | "ready_for_pickup" | "completed"

export type LocalSyncKioskOrder = {
  order_id: string
  first_name: string
  last_name: string
  customer_name: string
  status: LocalSyncKioskOrderStatus
  payment_status: "pay_at_store" | "paid"
  square_receipt_reference: string
  square_order_id: string
  paid_at_utc: string
  picked_item_ids: string[]
  picked_item_count: number
  all_items_picked: boolean
  reservation_ids: string[]
  items: Array<{
    public_id: string
    card_name: string
    set_name: string
    condition: string
    barcode: string
    location: string
    price_minor_units: number
    currency: "USD"
    status: LocalSyncInventoryItem["status"]
    row_version: number
  }>
  item_count: number
  total_minor_units: number
  currency: "USD"
  created_at_utc: string
  updated_at_utc: string
}

export type LocalSyncKioskOrderResult = LocalSyncResult<{
  order: LocalSyncKioskOrder
  reservations: LocalSyncReservation[]
}>

export type LocalSyncKioskOrderListResult = LocalSyncResult<{
  orders: LocalSyncKioskOrder[]
  order_count: number
  total_order_count: number
  shared_queue_source: "local_sync_server"
  wordpress_acceptance_required: true
  credentials_synced_to_client: false
}>

export type LocalSyncKioskOrderStatusUpdateResult = LocalSyncResult<{
  order: LocalSyncKioskOrder
  shared_queue_source: "local_sync_server"
  wordpress_status_sync_deferred: true
  inventory_mutation_performed: false
}>

export type LocalSyncKioskOrderPicksUpdateResult = LocalSyncResult<{
  order: LocalSyncKioskOrder
  shared_queue_source: "local_sync_server"
  inventory_mutation_performed: false
}>

export type LocalSyncKioskOrderPaymentUpdateResult = LocalSyncResult<{
  order: LocalSyncKioskOrder
  payment_notification: "paid_at_store_confirmed" | "already_paid"
  square_payment_capture_performed: false
  inventory_sale_finalized: true
  sale?: LocalSyncSquarePosSaleFinalizeResult
}>

export type LocalSyncFulfillmentOrder = {
  order_id: number
  order_number: string
  customer_name: string
  order_status: string
  fulfillment_status: LocalSyncFulfillmentOrderStatus
  payment_status: "paid" | string
  shipping_method_id: string
  shipping_method_title: string
  local_pickup: boolean
  item_count: number
  total_minor_units: number
  currency: "USD" | string
  paid_at_utc: string
  created_at_utc: string
  updated_at_utc: string
  source: "wordpress" | "queued"
  picked_item_ids: string[]
  picked_item_count: number
  all_items_picked: boolean
  payment_required_before_fulfillment: true
  inventory_mutation_performed_by_status: false
  items: Array<{
    order_item_id: number
    inventory_id: number
    reservation_id: number
    barcode: string
    card_name: string
    set_name: string
    condition: string
    price_minor_units: number
    currency: "USD" | string
    quantity: number
  }>
}

export type LocalSyncFulfillmentOrderListResult = LocalSyncResult<{
  orders: LocalSyncFulfillmentOrder[]
  order_count: number
  total_order_count: number
  shared_queue_source: "local_sync_server"
  website_pickup_source: "woocommerce_local_pickup"
  payment_required_before_fulfillment: true
  wordpress_refresh_performed: boolean
  wordpress_refresh_blocked: null | {
    code?: string
    message?: string
    http_status?: number
  }
  wordpress_fulfillment_pull_connected: boolean
  wordpress_fulfillment_status_push_connected: boolean
  credentials_synced_to_client: false
}>

export type LocalSyncFulfillmentOrderStatusUpdateResult = LocalSyncResult<{
  order: LocalSyncFulfillmentOrder
  shared_queue_source: "local_sync_server"
  wordpress_status_sync_deferred: boolean
  wordpress_status_sync_performed: boolean
  wordpress_status_sync_blocked: null | {
    code?: string
    message?: string
    http_status?: number
  }
  inventory_mutation_performed: false
  payment_capture_performed: false
  credentials_synced_to_client: false
}>

export type LocalSyncFulfillmentOrderPicksUpdateResult = LocalSyncResult<{
  order: LocalSyncFulfillmentOrder
  shared_queue_source: "local_sync_server"
  wordpress_status_sync_deferred: true
  inventory_mutation_performed: false
}>

export type LocalSyncTradeInOrderStatus =
  | "draft"
  | "review"
  | "approved"
  | "paid"
  | "converted"
  | "rejected"
  | "completed"

export type LocalSyncTradeInItem = {
  item_id: string
  product_type: "raw" | "graded"
  card_name: string
  set_name: string
  condition: string
  grading_company: string
  grade: string
  cert_number: string
  market_mid_minor_units: number
  trade_in_percentage_basis_points: number
  calculated_final_value_minor_units?: number
  final_value_minor_units: number
  final_value_manually_set?: boolean
  payout_type: "cash" | "credit"
  image_url: string
}

export type LocalSyncTradeInOrder = {
  order_id: string
  customer_name: string
  customer_phone: string
  customer_public_id: string
  status: LocalSyncTradeInOrderStatus
  staff_user_id: string
  staff_user_name: string
  notes: string
  items: LocalSyncTradeInItem[]
  item_count: number
  cash_total_minor_units: number
  credit_total_minor_units: number
  combined_total_minor_units: number
  currency: "USD"
  converted_at_utc: string
  converted_by_user_id: string
  created_at_utc: string
  updated_at_utc: string
  sellable_inventory_created: false
}

export type LocalSyncTradeInOrderListResult = LocalSyncResult<{
  orders: LocalSyncTradeInOrder[]
  order_count: number
  total_order_count: number
  shared_queue_source: "local_sync_server"
  sellable_inventory_created_by_draft: false
  credentials_synced_to_client: false
}>

export type LocalSyncTradeInOrderCreateResult = LocalSyncResult<{
  order: LocalSyncTradeInOrder
  sellable_inventory_created: false
  shared_queue_source: "local_sync_server"
  credentials_synced_to_client: false
}>

export type LocalSyncTradeInOrderStatusUpdateResult = LocalSyncTradeInOrderCreateResult

export type LocalSyncReportKey =
  | "customers"
  | "sales"
  | "inventory"
  | "trade_ins"
  | "fulfillment"
  | "scrydex"
  | "square_reconciliation"
  | "audit"

export type LocalSyncReportFilters = {
  dateFrom?: string
  dateTo?: string
  customerId?: number | string
  staffUserId?: number | string
  channel?: string
  game?: string
  productType?: string
  condition?: string
  grade?: string
  gradingCompany?: string
  orderStatus?: string
  source?: string
  page?: number
  pageSize?: number
}

export type LocalSyncManagerReportResult = LocalSyncResult<{
  action: "manager_report_pulled"
  report: LocalSyncReportKey
  report_status: string
  code: string
  http_status: number
  plan: Record<string, unknown>
  rows: Record<string, unknown>[]
  meta: Record<string, unknown>
  dashboard_plan: Record<string, unknown> | null
  csv_header: string
  wordpress_reports_pull_connected: boolean
  credentials_synced_to_client: false
  authorization_header_printed: false
}>

export type LocalSyncCustomer = {
  customer_public_id: string
  customer_id: number | null
  wordpress_customer_id?: number | null
  row_version: number
  display_name: string
  first_name: string
  last_name: string
  customer_lookup: string
  email: string
  status: "active" | "inactive"
  credit: {
    balance_minor_units: number
    currency: "USD"
  }
  source: "cached" | "queued" | "accepted"
}

export type LocalSyncCreditLedgerEntry = {
  entry_id: string
  customer_public_id: string
  entry_type: string
  amount_minor_units: number
  balance_before_minor_units: number
  balance_after_minor_units: number
  currency: "USD"
  status: "cached" | "pending_sync" | "accepted"
  reason: string
  source: string
  staff_user_id: string
  reference_id: string
  line_items: Array<{
    line_item_id: string
    type: string
    label: string
    amount_minor_units: number
    reference_id: string
    sale_total_minor_units: number
    square_receipt_reference: string
  }>
  created_at_utc: string
}

export type LocalSyncCustomerSearchResult = LocalSyncResult<{
  customers: LocalSyncCustomer[]
  credit_ledger_entries: LocalSyncCreditLedgerEntry[]
  local_cache_source: "local_sync_server"
  wordpress_ledger_authority: true
}>

export type LocalSyncCreateCustomerResult = LocalSyncResult<{
  customer: LocalSyncCustomer
  wordpress_acceptance_required: true
}>

export type LocalSyncCreditAdjustmentResult = LocalSyncResult<{
  customer: LocalSyncCustomer
  ledger_entry: LocalSyncCreditLedgerEntry
  manager_approved: boolean
  approval_required: boolean
  approval_threshold_minor_units: number
  wordpress_acceptance_required: true
}>

export type LocalSyncSquareCreditHandoff = {
  action: "customer_credit_square_pos_handoff"
  customer_public_id: string
  customer_id: number | null
  customer_name: string
  sale_total_minor_units: number
  credit_redeemed_minor_units: number
  square_amount_due_minor_units: number
  currency: "USD"
  square_payment_method_label: "Pug Store Credit"
  square_handoff_mode: "custom_payment_method"
  square_receipt_reference: string
  square_cashier_confirmed: boolean
  square_recorded_at_utc: string
  square_instruction: string
  pug_ledger_authority: true
  square_credit_balance_authority: false
  square_payment_capture_supported: false
  sync_required_for_ledger_posting: true
}

export type LocalSyncCreditRedemptionResult = LocalSyncResult<{
  customer: LocalSyncCustomer
  ledger_entry: LocalSyncCreditLedgerEntry
  square_handoff: LocalSyncSquareCreditHandoff
  wordpress_acceptance_required: true
  square_payment_capture_supported: false
}>

export type LocalSyncEventSnapshot = {
  event_id: string
  slug: string
  row_version: number
  title: string
  starts_at_utc: string
  starts_at_label: string
  registration_status: "open" | "waitlist" | "full" | "closed"
  capacity: number
  registered_count: number
  location_label: string
  note: string
  source: "cached" | "queued" | "accepted"
}

export type LocalSyncEventRegistration = {
  registration_id: string
  event_id: string
  attendee_label: string
  registration_status: "registered" | "waitlist"
  payment_status: "not_required" | "pay_at_store"
  status: "queued"
  created_at_utc: string
}

export type LocalSyncEventCheckin = {
  checkin_id: string
  event_id: string
  registration_public_id: string
  attendee_label: string
  checkin_method: string
  status: "queued"
  created_at_utc: string
}

export type LocalSyncEventListResult = LocalSyncResult<{
  events: LocalSyncEventSnapshot[]
  local_cache_source: "local_sync_server"
  wordpress_event_authority: true
}>

export type LocalSyncEventRegistrationResult = LocalSyncResult<{
  event: LocalSyncEventSnapshot
  registration: LocalSyncEventRegistration
  wordpress_acceptance_required: true
}>

export type LocalSyncEventCheckinResult = LocalSyncResult<{
  event: LocalSyncEventSnapshot
  checkin: LocalSyncEventCheckin
  wordpress_acceptance_required: true
}>

export type LocalSyncStatusResult = LocalSyncResult<{
  local_database: "store-sync.sqlite"
  persistence_mode: "sqlite_adapter_pending" | "sqlite"
  queue_depth: number
  kiosk_order_count: number
  fulfillment_order_count?: number
  inventory_count: number
  reference_card_count: number
  customer_count: number
  credit_ledger_entry_count: number
  event_count: number
  client_presence_enabled: true
  client_device_count: number
  online_client_device_count: number
  offline_client_device_count: number
  setup_ready_client_device_count: number
  setup_required_client_device_count: number
  heartbeat_timeout_seconds: number
  active_session_count: number
  wordpress_push_connected: boolean
  wordpress_inventory_push_connected?: boolean
  wordpress_inventory_sale_push_connected?: boolean
  wordpress_event_registration_push_connected?: boolean
  wordpress_event_checkin_push_connected?: boolean
  wordpress_credit_push_connected?: boolean
  wordpress_customer_push_connected?: boolean
  wordpress_kiosk_order_push_connected?: boolean
  wordpress_fulfillment_status_push_connected?: boolean
  wordpress_pull_connected: boolean
  wordpress_inventory_pull_connected?: boolean
  wordpress_events_pull_connected?: boolean
  wordpress_fulfillment_pull_connected?: boolean
  scrydex_lookup_order: ("local_reference_cache" | "wordpress_catalog_proxy" | "scrydex_provider")[]
  scrydex_fallback_connected: boolean
  local_operations_preserved: true
}>

export type LocalSyncPullResult = LocalSyncResult<{
  pulled_count: number
  applied_count: number
  inserted_count: number
  updated_count: number
  ignored_count: number
  items: LocalSyncInventoryItem[]
  events_pulled_count: number
  events_applied_count: number
  events_inserted_count: number
  events_updated_count: number
  events_ignored_count: number
  events: LocalSyncEventSnapshot[]
  fulfillment_pulled_count?: number
  fulfillment_applied_count?: number
  fulfillment_inserted_count?: number
  fulfillment_updated_count?: number
  fulfillment_ignored_count?: number
  fulfillment_orders?: LocalSyncFulfillmentOrder[]
  meta: {
    page: number
    page_size: number
    total: number
    has_more: boolean
  } | null
  events_meta: {
    page: number
    page_size: number
    total: number
    has_more: boolean
  } | null
  fulfillment_meta?: {
    order_count: number
  } | null
  wordpress_pull_connected: true
  wordpress_inventory_pull_connected: boolean
  wordpress_events_pull_connected: boolean
  wordpress_fulfillment_pull_connected?: boolean
  credentials_synced_to_client: false
  local_inventory_count: number
  local_event_count: number
  local_fulfillment_order_count?: number
  local_queue_depth: number
}>

export type LocalSyncPushResult = LocalSyncResult<{
  operation_count: number
  accepted_count: number
  retry_count: number
  rejected_count: number
  unsupported_operation_count: number
  results: Array<{
    operation_id: string
    operation_type: string
    entity_id: string
    status: "accepted" | "retry" | "rejected"
    code?: string
    wordpress_code?: string
    http_status?: number
    wordpress_inventory?: {
      public_id: string
      sku: string
      barcode: string
      status: LocalSyncInventoryItem["status"]
      price_change_log_persisted: boolean
    }
    woocommerce_product_sync?: {
      requested: boolean
      synced: boolean
      status: string
      product_ids: number[]
      errors: string[]
      payment_capture_deferred: boolean
      square_inventory_deferred: boolean
    }
  }>
  wordpress_push_connected: true
  wordpress_inventory_push_connected?: boolean
  wordpress_inventory_sale_push_connected?: boolean
  wordpress_event_registration_push_connected?: boolean
  wordpress_event_checkin_push_connected?: boolean
  wordpress_credit_push_connected?: boolean
  wordpress_customer_push_connected?: boolean
  wordpress_kiosk_order_push_connected?: boolean
  credentials_synced_to_client: false
  local_queue_depth: number
}>

export type LocalSyncSquarePosInventoryPullPlanResult = LocalSyncResult<{
  action: "square_pos_inventory_pull_plan"
  planner_status: "ready" | "conflict" | "rejected" | "skipped"
  code: string
  ready: boolean
  requires_manager_review: boolean
  mapped_count: number
  unresolved_count: number
  mapping_summary?: {
    total_inventory_count: number
    pos_visible_count: number
    pos_hidden_count: number
    pos_staff_only_count: number
    available_pos_visible_count: number
    ready_for_square_pull_count: number
    ready_available_count: number
    ready_zero_count: number
    review_count: number
    unmapped_pos_visible_count: number
    duplicate_scan_identity_count: number
    square_inventory_authority: "tcg_store_platform"
    square_counts_used_for: "pos_reconciliation_and_exception_detection"
  }
  square_pull_feed?: Array<{
    public_id: string
    card_name: string
    set_name: string
    condition: string
    barcode: string
    sku: string
    square_catalog_item_id: string
    square_catalog_variation_id: string
    square_location_id: string
    status: LocalSyncInventoryItem["status"]
    pos_visibility: LocalSyncInventoryItem["pos_visibility"]
    expected_serialized_quantity: string
    price_minor_units: number
    location: string
    row_version: number
    source: LocalSyncInventoryItem["source"]
  }>
  review_items?: Array<{
    public_id: string
    card_name: string
    set_name: string
    condition: string
    barcode: string
    sku: string
    scan_identity: string
    status: LocalSyncInventoryItem["status"]
    pos_visibility: LocalSyncInventoryItem["pos_visibility"]
    square_catalog_variation_id: string
    errors: string[]
    issue_labels: string[]
    next_action: string
  }>
  next_actions?: string[]
  generated_at_utc?: string
  updated_after_utc?: string
  request_plan: Record<string, unknown> | null
  barcode_mappings: Record<string, unknown>[]
  unresolved_mappings: Record<string, unknown>[]
  payment_delegation: Record<string, unknown> | null
  plugin_square_payment_capture_supported: false
  square_payment_capture_supported: false
  source_of_truth: "tcg_store_platform"
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncSquarePosInventoryCountReconciliationResult = LocalSyncResult<{
  action: "square_pos_inventory_count_reconciliation"
  reconciliation_status: "accepted" | "conflict" | "rejected"
  code: string
  ready: boolean
  requires_manager_review: boolean
  summary: {
    expected_rows_count: number
    compared_count: number
    matched_count: number
    mismatched_count: number
    missing_square_count: number
    unexpected_square_count: number
    unresolved_mapping_count: number
    expected_total_quantity: string
    actual_total_quantity: string
  }
  comparisons: Array<{
    public_id: string
    card_name: string
    set_name: string
    condition: string
    barcode: string
    sku: string
    square_catalog_item_id: string
    square_catalog_variation_id: string
    square_location_id: string
    expected_serialized_quantity: string
    actual_square_quantity: string | null
    status: "matched" | "mismatch" | "missing_square_count" | string
    issue: string
    issue_label: string
    next_action: string
    location: string
  }>
  unexpected_square_counts: Array<{
    catalogObjectId: string
    locationId: string
    quantity: string
    state: string
    calculatedAt: string
    issue: string
  }>
  unresolved_mappings: Record<string, unknown>[]
  generated_at_utc: string
  source_of_truth: "tcg_store_platform"
  square_counts_used_for: "pos_reconciliation_and_exception_detection"
  provider_inventory_write_deferred: true
  square_payment_capture_supported: false
  plugin_square_payment_capture_supported: false
  credentials_synced_to_client: false
  raw_credentials_returned: false
  next_actions: string[]
}>

export type LocalSyncSquarePosSaleFinalizeResult = LocalSyncResult<{
  action: "square_pos_sale_finalized"
  finalized_count: number
  items: LocalSyncInventoryItem[]
  operations: Array<{
    operation_id: string
    operation_type: "square_pos_sale"
    entity_id: string
    sync_status: "pending"
  }>
  square_receipt_reference: string
  square_order_id: string
  wordpress_acceptance_required: true
  wordpress_auto_sync_performed: boolean
  wordpress_accepted_count: number
  wordpress_retry_count: number
  auto_sync_results: LocalSyncAutoSyncOperationResult[]
  local_queue_depth: number
  source_of_truth: "tcg_store_platform"
  square_payment_capture_supported: false
  plugin_square_payment_capture_supported: false
  payment_capture_authority: "official_woocommerce_square_extension"
  provider_inventory_write_deferred: true
  credentials_synced_to_client: false
}>

export type LocalSyncFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type LocalSyncServerClient = {
  serverUrl: string
  getSetupStatus: () => Promise<LocalSyncSetupStatusResult>
  configureSetup: (
    sessionToken: string,
    input: LocalSyncSetupConfigInput,
  ) => Promise<LocalSyncSetupConfigResult>
  recordDeviceHeartbeat: (input: {
    deviceId: string
    deviceLabel: string
    mode: LocalSyncClientDevice["mode"]
    appVersion: string
    platform: string
    networkStatus: LocalSyncClientDevice["network_status"]
    setupStatus: LocalSyncClientDevice["setup_status"]
    serverUrl: string
    websiteUrl: string
    capabilities: LocalSyncAccessSection[]
    heartbeatIntervalSeconds?: number
  }) => Promise<LocalSyncDeviceHeartbeatResult>
  getDeviceStatus: () => Promise<LocalSyncDeviceStatusResult>
  authWithPin: (pin: string, options?: { ttlMinutes?: number }) => Promise<LocalSyncAuthResult>
  getAccessPolicy: (sessionToken: string) => Promise<LocalSyncAccessPolicyResult>
  addUser: (
    sessionToken: string,
    input: {
      name: string
      pin: string
      role: LocalSyncUserRole
      access: LocalSyncAccessSection[]
    },
  ) => Promise<LocalSyncResult<{ user: LocalSyncUser; raw_pin_returned: false; pin_hash_returned: false }>>
  updateUserAccess: (
    sessionToken: string,
    userId: string,
    input: {
      role: LocalSyncUserRole
      access: LocalSyncAccessSection[]
    },
  ) => Promise<LocalSyncResult<{ user: LocalSyncUser }>>
  searchInventory: (query: string) => Promise<LocalSyncInventorySearchResult>
  reserveInventory: (
    sessionToken: string,
    input: { inventoryPublicId: string; holdReason: string },
  ) => Promise<LocalSyncReservationResult>
  createInventoryIntake: (
    sessionToken: string,
    input: {
      cardName: string
      setName: string
      condition: string
      barcode: string
      priceMinorUnits: number
      location: string
      quantity?: number
      providerCardId?: string
      referenceVariantId?: number | null
      providerVariantId?: string
      game?: LocalSyncScryDexCard["game"]
      setCode?: string
      cardNumber?: string
      printedNumber?: string
      variant?: string
      finish?: string
      language?: string
      rawOrGraded?: "raw" | "graded"
      gradingCompany?: string
      grade?: string
      certNumber?: string
      imageUrl?: string
      backImageUrl?: string
      priceSource?: string
      priceObservedAtUtc?: string | null
      suggestedPriceMinorUnits?: number
      autoPriceMinorUnits?: number
      minimumSalePriceMinorUnits?: number
      finalPriceMinorUnits?: number
      priceOverrideReason?: string
      onlineVisibility?: LocalSyncInventoryItem["online_visibility"]
      kioskVisibility?: LocalSyncInventoryItem["kiosk_visibility"]
      posVisibility?: LocalSyncInventoryItem["pos_visibility"]
    },
  ) => Promise<LocalSyncInventoryIntakeResult>
  searchScryDexCards: (
    sessionToken: string,
    query: string,
    game?: LocalSyncScryDexCard["game"],
    options?: { limit?: number | "all"; setFilter?: string },
  ) => Promise<LocalSyncScryDexSearchResult>
  createKioskOrder: (
    input: { firstName: string; lastName: string; inventoryPublicIds: string[] },
  ) => Promise<LocalSyncKioskOrderResult>
  listKioskOrders: (
    sessionToken: string,
    input?: { limit?: number; statuses?: LocalSyncKioskOrderStatus[] },
  ) => Promise<LocalSyncKioskOrderListResult>
  updateKioskOrderStatus: (
    sessionToken: string,
    orderId: string,
    status: LocalSyncKioskOrderStatus,
  ) => Promise<LocalSyncKioskOrderStatusUpdateResult>
  updateKioskOrderPicks: (
    sessionToken: string,
    orderId: string,
    pickedItemIds: string[],
  ) => Promise<LocalSyncKioskOrderPicksUpdateResult>
  confirmKioskOrderPayment: (
    sessionToken: string,
    orderId: string,
    input: {
      squareReceiptReference: string
      squareOrderId?: string
      cashierConfirmed: boolean
    },
  ) => Promise<LocalSyncKioskOrderPaymentUpdateResult>
  listFulfillmentOrders: (
    sessionToken: string,
    input?: { limit?: number; statuses?: LocalSyncFulfillmentOrderStatus[]; refresh?: boolean },
  ) => Promise<LocalSyncFulfillmentOrderListResult>
  updateFulfillmentOrderStatus: (
    sessionToken: string,
    orderId: number,
    status: LocalSyncFulfillmentOrderStatus,
  ) => Promise<LocalSyncFulfillmentOrderStatusUpdateResult>
  updateFulfillmentOrderPicks: (
    sessionToken: string,
    orderId: number,
    pickedItemIds: string[],
  ) => Promise<LocalSyncFulfillmentOrderPicksUpdateResult>
  listTradeInOrders: (
    sessionToken: string,
    input?: {
      customer?: string
      limit?: number
      query?: string
      staffUserId?: string
      statuses?: LocalSyncTradeInOrderStatus[]
    },
  ) => Promise<LocalSyncTradeInOrderListResult>
  createTradeInOrder: (
    sessionToken: string,
    input: {
      customerName: string
      customerPhone?: string
      customerPublicId?: string
      notes?: string
      items: Array<{
        id: string
        productType: "raw" | "graded"
        cardName: string
        setName: string
        condition: string
        gradingCompany?: string
        grade?: string
        certNumber?: string
        marketMidMinorUnits: number
        percentageBasisPoints: number
        finalValueMinorUnits?: number
        payoutType: "cash" | "credit"
        imageUrl?: string
      }>
    },
  ) => Promise<LocalSyncTradeInOrderCreateResult>
  updateTradeInOrderStatus: (
    sessionToken: string,
    orderId: string,
    status: LocalSyncTradeInOrderStatus,
    input?: { notes?: string },
  ) => Promise<LocalSyncTradeInOrderStatusUpdateResult>
  getManagerReport: (
    sessionToken: string,
    report: LocalSyncReportKey,
    filters?: LocalSyncReportFilters,
  ) => Promise<LocalSyncManagerReportResult>
  searchCustomers: (query: string) => Promise<LocalSyncCustomerSearchResult>
  createCustomer: (
    sessionToken: string,
    input: { firstName: string; lastName: string; email: string },
  ) => Promise<LocalSyncCreateCustomerResult>
  createCreditAdjustment: (
    sessionToken: string,
    input: { customerPublicId: string; amountMinorUnits: number; reason: string },
  ) => Promise<LocalSyncCreditAdjustmentResult>
  createCreditRedemption: (
    sessionToken: string,
    input: {
      customerPublicId: string
      amountMinorUnits: number
      saleTotalMinorUnits: number
      reason: string
      squareReceiptReference: string
      squareCashierConfirmed: boolean
    },
  ) => Promise<LocalSyncCreditRedemptionResult>
  listEvents: () => Promise<LocalSyncEventListResult>
  createEventRegistration: (
    sessionToken: string,
    input: {
      eventId: string
      attendeeLabel: string
      paymentStatus: "not_required" | "pay_at_store"
    },
  ) => Promise<LocalSyncEventRegistrationResult>
  createEventCheckin: (
    sessionToken: string,
    input: {
      eventId: string
      attendeeLabel: string
      registrationPublicId: string
      checkinMethod: string
    },
  ) => Promise<LocalSyncEventCheckinResult>
  getSyncStatus: () => Promise<LocalSyncStatusResult>
  pullWebsiteInventory: (sessionToken: string) => Promise<LocalSyncPullResult>
  planSquarePosInventoryPull: (
    sessionToken: string,
    input?: { squareLocationId?: string; updatedAfter?: string; limit?: number },
  ) => Promise<LocalSyncSquarePosInventoryPullPlanResult>
  reconcileSquarePosInventoryCounts: (
    sessionToken: string,
    input?: {
      squareLocationId?: string
      updatedAfter?: string
      limit?: number
      counts?: Record<string, unknown>[]
      squareCountsResponse?: Record<string, unknown>
    },
  ) => Promise<LocalSyncSquarePosInventoryCountReconciliationResult>
  finalizeSquarePosSale: (
    sessionToken: string,
    input: {
      inventoryPublicIds?: string[]
      barcodes?: string[]
      items?: Array<string | Record<string, unknown>>
      squareReceiptReference: string
      squareOrderId?: string
      saleTotalMinorUnits?: number
    },
  ) => Promise<LocalSyncSquarePosSaleFinalizeResult>
  pushQueuedOperations: (sessionToken: string) => Promise<LocalSyncPushResult>
}

export function createLocalSyncServerClient(
  serverUrl: string,
  fetcher: LocalSyncFetch = fetch,
): LocalSyncServerClient {
  const baseUrl = normalizeLocalSyncServerUrl(serverUrl)

  return {
    serverUrl: baseUrl,
    getSetupStatus: () =>
      requestLocalSync(fetcher, baseUrl, "/setup/status") as Promise<LocalSyncSetupStatusResult>,
    configureSetup: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/setup/config", {
        method: "POST",
        sessionToken,
        body: {
          store_id: input.storeId ?? "",
          server_url: input.serverUrl ?? baseUrl,
          website_url: input.websiteUrl,
          rest_base_path: input.restBasePath ?? "/wp-json/tcg-store/v1",
          credit_approval_threshold_minor_units: input.creditApprovalThresholdMinorUnits,
        },
      }) as Promise<LocalSyncSetupConfigResult>,
    recordDeviceHeartbeat: (input) =>
      requestLocalSync(fetcher, baseUrl, "/devices/heartbeat", {
        method: "POST",
        body: {
          device_id: input.deviceId,
          device_label: input.deviceLabel,
          mode: input.mode,
          app_version: input.appVersion,
          platform: input.platform,
          network_status: input.networkStatus,
          setup_status: input.setupStatus,
          server_url: input.serverUrl,
          website_url: input.websiteUrl,
          capabilities: input.capabilities,
          heartbeat_interval_seconds: input.heartbeatIntervalSeconds ?? 30,
        },
      }) as Promise<LocalSyncDeviceHeartbeatResult>,
    getDeviceStatus: () =>
      requestLocalSync(fetcher, baseUrl, "/devices/status") as Promise<LocalSyncDeviceStatusResult>,
    authWithPin: (pin, options = {}) =>
      requestLocalSync(fetcher, baseUrl, "/auth/pin", {
        method: "POST",
        body: { pin, ttlMinutes: options.ttlMinutes },
      }) as Promise<LocalSyncAuthResult>,
    getAccessPolicy: (sessionToken) =>
      requestLocalSync(fetcher, baseUrl, "/users/access-policy", {
        sessionToken,
      }) as Promise<LocalSyncAccessPolicyResult>,
    addUser: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/users", {
        method: "POST",
        sessionToken,
        body: {
          name: input.name,
          pin: input.pin,
          role: input.role,
          access: input.access,
        },
      }) as Promise<LocalSyncResult<{ user: LocalSyncUser; raw_pin_returned: false; pin_hash_returned: false }>>,
    updateUserAccess: (sessionToken, userId, input) =>
      requestLocalSync(fetcher, baseUrl, `/users/${encodeURIComponent(userId)}/access`, {
        method: "PATCH",
        sessionToken,
        body: {
          role: input.role,
          access: input.access,
        },
      }) as Promise<LocalSyncResult<{ user: LocalSyncUser }>>,
    searchInventory: (query) =>
      requestLocalSync(fetcher, baseUrl, `/inventory/search?q=${encodeURIComponent(query)}`) as Promise<
        LocalSyncInventorySearchResult
      >,
    reserveInventory: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/inventory/reservations", {
        method: "POST",
        sessionToken,
        body: {
          inventory_public_id: input.inventoryPublicId,
          hold_reason: input.holdReason,
        },
      }) as Promise<LocalSyncReservationResult>,
    createInventoryIntake: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/inventory/intake", {
        method: "POST",
        sessionToken,
        body: {
          card_name: input.cardName,
          set_name: input.setName,
          condition: input.condition,
          barcode: input.barcode,
          price_minor_units: input.priceMinorUnits,
          location: input.location,
          quantity: input.quantity ?? 1,
          provider_card_id: input.providerCardId ?? "",
          reference_variant_id: input.referenceVariantId ?? null,
          provider_variant_id: input.providerVariantId ?? "",
          game: input.game ?? "pokemon",
          set_code: input.setCode ?? "",
          card_number: input.cardNumber ?? "",
          printed_number: input.printedNumber ?? "",
          variant: input.variant ?? "",
          finish: input.finish ?? "",
          language: input.language ?? "EN",
          raw_or_graded: input.rawOrGraded ?? "raw",
          grading_company: input.gradingCompany ?? "",
          grade: input.grade ?? "",
          cert_number: input.certNumber ?? "",
          image_url: input.imageUrl ?? "",
          back_image_url: input.backImageUrl ?? "",
          price_source: input.priceSource ?? "",
          price_observed_at_utc: input.priceObservedAtUtc ?? "",
          suggested_price_minor_units: input.suggestedPriceMinorUnits ?? input.priceMinorUnits,
          auto_price_minor_units: input.autoPriceMinorUnits ?? input.priceMinorUnits,
          minimum_sale_price_minor_units: input.minimumSalePriceMinorUnits ?? input.priceMinorUnits,
          final_price_minor_units: input.finalPriceMinorUnits ?? input.priceMinorUnits,
          price_override_reason: input.priceOverrideReason ?? "",
          online_visibility: input.onlineVisibility ?? "visible",
          kiosk_visibility: input.kioskVisibility ?? "visible",
          pos_visibility: input.posVisibility ?? "visible",
        },
      }) as Promise<LocalSyncInventoryIntakeResult>,
    searchScryDexCards: (sessionToken, query, game = "pokemon", options = {}) => {
      const params = new URLSearchParams({
        q: query,
        game,
        limit: String(options.limit ?? "all"),
      })

      if (options.setFilter) {
        params.set("set", options.setFilter)
      }

      return requestLocalSync(fetcher, baseUrl, `/scrydex/cards/search?${params.toString()}`, {
        sessionToken,
      }) as Promise<LocalSyncScryDexSearchResult>
    },
    createKioskOrder: (input) =>
      requestLocalSync(fetcher, baseUrl, "/kiosk/orders", {
        method: "POST",
        body: {
          first_name: input.firstName,
          last_name: input.lastName,
          inventory_public_ids: input.inventoryPublicIds,
        },
      }) as Promise<LocalSyncKioskOrderResult>,
    listKioskOrders: (sessionToken, input = {}) => {
      const statuses = (input.statuses ?? [])
        .map((status) => `status=${encodeURIComponent(status)}`)
        .join("&")
      const params = [
        `limit=${encodeURIComponent(String(input.limit ?? 25))}`,
        statuses,
      ].filter(Boolean).join("&")

      return requestLocalSync(fetcher, baseUrl, `/kiosk/orders?${params}`, {
        sessionToken,
      }) as Promise<LocalSyncKioskOrderListResult>
    },
    updateKioskOrderStatus: (sessionToken, orderId, status) =>
      requestLocalSync(fetcher, baseUrl, `/kiosk/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        sessionToken,
        body: { status },
      }) as Promise<LocalSyncKioskOrderStatusUpdateResult>,
    updateKioskOrderPicks: (sessionToken, orderId, pickedItemIds) =>
      requestLocalSync(fetcher, baseUrl, `/kiosk/orders/${encodeURIComponent(orderId)}/picks`, {
        method: "PATCH",
        sessionToken,
        body: { picked_item_ids: pickedItemIds },
      }) as Promise<LocalSyncKioskOrderPicksUpdateResult>,
    confirmKioskOrderPayment: (sessionToken, orderId, input) =>
      requestLocalSync(fetcher, baseUrl, `/kiosk/orders/${encodeURIComponent(orderId)}/payment`, {
        method: "PATCH",
        sessionToken,
        body: {
          square_receipt_reference: input.squareReceiptReference,
          square_order_id: input.squareOrderId ?? "",
          cashier_confirmed: input.cashierConfirmed,
        },
      }) as Promise<LocalSyncKioskOrderPaymentUpdateResult>,
    listFulfillmentOrders: (sessionToken, input = {}) => {
      const statuses = (input.statuses ?? [])
        .map((status) => `status=${encodeURIComponent(status)}`)
        .join("&")
      const params = [
        `limit=${encodeURIComponent(String(input.limit ?? 25))}`,
        `refresh=${encodeURIComponent(String(input.refresh ?? true))}`,
        statuses,
      ].filter(Boolean).join("&")

      return requestLocalSync(fetcher, baseUrl, `/fulfillment/orders?${params}`, {
        sessionToken,
      }) as Promise<LocalSyncFulfillmentOrderListResult>
    },
    updateFulfillmentOrderStatus: (sessionToken, orderId, status) =>
      requestLocalSync(fetcher, baseUrl, `/fulfillment/orders/${encodeURIComponent(String(orderId))}/status`, {
        method: "PATCH",
        sessionToken,
        body: { status },
      }) as Promise<LocalSyncFulfillmentOrderStatusUpdateResult>,
    updateFulfillmentOrderPicks: (sessionToken, orderId, pickedItemIds) =>
      requestLocalSync(fetcher, baseUrl, `/fulfillment/orders/${encodeURIComponent(String(orderId))}/picks`, {
        method: "PATCH",
        sessionToken,
        body: { picked_item_ids: pickedItemIds },
      }) as Promise<LocalSyncFulfillmentOrderPicksUpdateResult>,
    listTradeInOrders: (sessionToken, input = {}) => {
      const statuses = (input.statuses ?? [])
        .map((status) => `status=${encodeURIComponent(status)}`)
        .join("&")
      const params = [
        `limit=${encodeURIComponent(String(input.limit ?? 50))}`,
        statuses,
        input.query ? `q=${encodeURIComponent(input.query)}` : "",
        input.staffUserId ? `staff_user_id=${encodeURIComponent(input.staffUserId)}` : "",
        input.customer ? `customer=${encodeURIComponent(input.customer)}` : "",
      ].filter(Boolean).join("&")

      return requestLocalSync(fetcher, baseUrl, `/trade-ins/orders?${params}`, {
        sessionToken,
      }) as Promise<LocalSyncTradeInOrderListResult>
    },
    createTradeInOrder: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/trade-ins/orders", {
        method: "POST",
        sessionToken,
        body: {
          customer_name: input.customerName,
          customer_phone: input.customerPhone ?? "",
          customer_public_id: input.customerPublicId ?? "",
          notes: input.notes ?? "",
          items: input.items.map((item) => ({
            id: item.id,
            product_type: item.productType,
            card_name: item.cardName,
            set_name: item.setName,
            condition: item.condition,
            grading_company: item.gradingCompany ?? "",
            grade: item.grade ?? "",
            cert_number: item.certNumber ?? "",
            market_mid_minor_units: item.marketMidMinorUnits,
            trade_in_percentage_basis_points: item.percentageBasisPoints,
            final_value_minor_units: item.finalValueMinorUnits,
            payout_type: item.payoutType,
            image_url: item.imageUrl ?? "",
          })),
        },
      }) as Promise<LocalSyncTradeInOrderCreateResult>,
    updateTradeInOrderStatus: (sessionToken, orderId, status, input = {}) =>
      requestLocalSync(fetcher, baseUrl, `/trade-ins/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        sessionToken,
        body: { status, notes: input.notes ?? "" },
      }) as Promise<LocalSyncTradeInOrderStatusUpdateResult>,
    getManagerReport: (sessionToken, report, filters = {}) => {
      const params = new URLSearchParams()
      const entries: Array<[string, string | number | undefined]> = [
        ["date_from", filters.dateFrom],
        ["date_to", filters.dateTo],
        ["customer_id", filters.customerId],
        ["staff_user_id", filters.staffUserId],
        ["channel", filters.channel],
        ["game", filters.game],
        ["product_type", filters.productType],
        ["condition", filters.condition],
        ["grade", filters.grade],
        ["grading_company", filters.gradingCompany],
        ["order_status", filters.orderStatus],
        ["source", filters.source],
        ["page", filters.page],
        ["page_size", filters.pageSize],
      ]

      for (const [key, value] of entries) {
        if (value !== undefined && String(value).trim() !== "") {
          params.set(key, String(value))
        }
      }

      const query = params.toString()

      return requestLocalSync(fetcher, baseUrl, `/reports/${encodeURIComponent(report)}${query ? `?${query}` : ""}`, {
        sessionToken,
      }) as Promise<LocalSyncManagerReportResult>
    },
    searchCustomers: (query) =>
      requestLocalSync(fetcher, baseUrl, `/customers/search?q=${encodeURIComponent(query)}`) as Promise<
        LocalSyncCustomerSearchResult
      >,
    createCustomer: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/customers", {
        method: "POST",
        sessionToken,
        body: {
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
        },
      }) as Promise<LocalSyncCreateCustomerResult>,
    createCreditAdjustment: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/credit/adjustments", {
        method: "POST",
        sessionToken,
        body: {
          customer_public_id: input.customerPublicId,
          amount_minor_units: input.amountMinorUnits,
          reason: input.reason,
        },
      }) as Promise<LocalSyncCreditAdjustmentResult>,
    createCreditRedemption: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/credit/redemptions", {
        method: "POST",
        sessionToken,
        body: {
          customer_public_id: input.customerPublicId,
          amount_minor_units: input.amountMinorUnits,
          sale_total_minor_units: input.saleTotalMinorUnits,
          reason: input.reason,
          square_receipt_reference: input.squareReceiptReference,
          square_cashier_confirmed: input.squareCashierConfirmed,
        },
      }) as Promise<LocalSyncCreditRedemptionResult>,
    listEvents: () =>
      requestLocalSync(fetcher, baseUrl, "/events") as Promise<LocalSyncEventListResult>,
    createEventRegistration: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/events/registrations", {
        method: "POST",
        sessionToken,
        body: {
          event_id: input.eventId,
          attendee_label: input.attendeeLabel,
          payment_status: input.paymentStatus,
        },
      }) as Promise<LocalSyncEventRegistrationResult>,
    createEventCheckin: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/events/check-ins", {
        method: "POST",
        sessionToken,
        body: {
          event_id: input.eventId,
          attendee_label: input.attendeeLabel,
          registration_public_id: input.registrationPublicId,
          checkin_method: input.checkinMethod,
        },
      }) as Promise<LocalSyncEventCheckinResult>,
    getSyncStatus: () =>
      requestLocalSync(fetcher, baseUrl, "/sync/status") as Promise<LocalSyncStatusResult>,
    pullWebsiteInventory: (sessionToken) =>
      requestLocalSync(fetcher, baseUrl, "/sync/pull", {
        method: "POST",
        sessionToken,
        body: {
          domains: ["inventory", "events", "fulfillment"],
        },
      }) as Promise<LocalSyncPullResult>,
    planSquarePosInventoryPull: (sessionToken, input = {}) =>
      requestLocalSync(fetcher, baseUrl, "/pos/square/inventory-pull-plan", {
        method: "POST",
        sessionToken,
        body: {
          square_location_id: input.squareLocationId ?? "",
          updated_after: input.updatedAfter ?? "",
          limit: input.limit ?? 1000,
        },
      }) as Promise<LocalSyncSquarePosInventoryPullPlanResult>,
    reconcileSquarePosInventoryCounts: (sessionToken, input = {}) =>
      requestLocalSync(fetcher, baseUrl, "/pos/square/inventory-counts/reconcile", {
        method: "POST",
        sessionToken,
        body: {
          square_location_id: input.squareLocationId ?? "",
          updated_after: input.updatedAfter ?? "",
          limit: input.limit ?? 1000,
          counts: input.counts ?? [],
          square_counts_response: input.squareCountsResponse ?? undefined,
        },
      }) as Promise<LocalSyncSquarePosInventoryCountReconciliationResult>,
    finalizeSquarePosSale: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/pos/square/sales/finalize", {
        method: "POST",
        sessionToken,
        body: {
          inventory_public_ids: input.inventoryPublicIds ?? [],
          barcodes: input.barcodes ?? [],
          items: input.items ?? [],
          square_receipt_reference: input.squareReceiptReference,
          square_order_id: input.squareOrderId ?? "",
          sale_total_minor_units: input.saleTotalMinorUnits ?? 0,
        },
      }) as Promise<LocalSyncSquarePosSaleFinalizeResult>,
    pushQueuedOperations: (sessionToken) =>
      requestLocalSync(fetcher, baseUrl, "/sync/push", {
        method: "POST",
        sessionToken,
      }) as Promise<LocalSyncPushResult>,
  }
}

export function normalizeLocalSyncServerUrl(value: string) {
  try {
    const url = new URL(String(value).trim())

    if (!["http:", "https:"].includes(url.protocol)) {
      return "http://127.0.0.1:8787"
    }

    url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "")
    url.search = ""
    url.hash = ""

    return url.toString().replace(/\/$/, "")
  } catch {
    return "http://127.0.0.1:8787"
  }
}

async function requestLocalSync(
  fetcher: LocalSyncFetch,
  baseUrl: string,
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH"
    sessionToken?: string
    body?: Record<string, unknown>
  } = {},
): Promise<LocalSyncResult<Record<string, unknown>>> {
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    }

    if (options.sessionToken) {
      headers.authorization = `Bearer ${options.sessionToken}`
    }

    const response = await fetcher(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
    const body = await response.json() as Record<string, unknown>

    if (body.status === "ok" || body.status === "blocked") {
      return body as LocalSyncResult<Record<string, unknown>>
    }

    return {
      status: "blocked",
      code: "unexpected_local_sync_response",
      message: "The local sync server returned an unexpected response shape.",
    }
  } catch {
    return {
      status: "unavailable",
      code: "local_sync_server_unavailable",
      message: "The LAN local sync server is unavailable. Start it or check the configured host.",
    }
  }
}
