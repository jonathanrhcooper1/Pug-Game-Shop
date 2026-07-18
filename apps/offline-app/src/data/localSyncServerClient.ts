export type LocalSyncAccessSection =
  | "Inventory"
  | "Trade-Ins"
  | "ScryDex"
  | "Price Review"
  | "Checkout"
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
  scrydex_vision_configured?: boolean
  graded_pricing_provider_configured?: boolean
  graded_pricing_primary_source?: "scrydex_reference_cache"
  graded_pricing_credentials_synced_to_client?: false
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
  status: "available" | "reserved" | "sold" | "conflict" | "pending_intake" | "return_review" | "damaged" | "removed"
  image_url: string
  back_image_url: string
  online_visibility: "hidden" | "visible" | "staff_only"
  kiosk_visibility: "hidden" | "visible" | "staff_only"
  pos_visibility: "hidden" | "visible" | "staff_only"
  square_catalog_item_id: string
  square_catalog_variation_id: string
  square_location_id?: string
  quantity_on_hand?: number
  market_price_minor_units?: number
  minimum_sale_price_minor_units?: number
  auto_price_minor_units?: number
  pricing_source?: string
  price_observed_at_utc?: string
  external_sync_state: "pending" | "synced" | "square_synced" | "failed" | "conflict"
  created_by_user_id: string
  created_by_user_name: string
  updated_by_user_id: string
  updated_by_user_name: string
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
  expires_at_utc: string
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

export type LocalSyncInventoryLocationListResult = LocalSyncResult<{
  locations: string[]
  location_count: number
  source: "local_sync_server"
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncInventoryLocationCreateResult = LocalSyncResult<{
  location: string
  locations: string[]
  location_count: number
  source: "local_sync_server"
  credentials_synced_to_client: false
  raw_credentials_returned: false
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

export type LocalSyncInventoryUpdateResult = LocalSyncResult<{
  action: "inventory_item_updated" | "inventory_item_unchanged"
  item: LocalSyncInventoryItem
  previous_quantity_on_hand: number
  quantity_on_hand: number
  quantity_delta: number
  quantity_update_mode: "absolute" | "delta" | "unchanged"
  consolidated_count: number
  consolidated_items: LocalSyncInventoryItem[]
  wordpress_acceptance_required: boolean
  wordpress_auto_sync_performed: boolean
  wordpress_accepted_count: number
  wordpress_retry_count: number
  auto_sync_results: LocalSyncAutoSyncOperationResult[]
  local_queue_depth: number
}>

export type LocalSyncDymoPrinter = {
  type: "LabelWriterPrinter"
  name: string
  model_name: string
  is_connected: boolean
  is_local: boolean
  is_twin_turbo: boolean
}

export type LocalSyncDymoPrinterListResult = LocalSyncResult<{
  action: "dymo_printers_detected"
  service_base_url: string
  printer_count: number
  connected_printer_count: number
  printers: LocalSyncDymoPrinter[]
  preferred_printer: LocalSyncDymoPrinter | null
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncDymoLabelPrintResult = LocalSyncResult<{
  action: "dymo_label_printed"
  label_stock: "30336 Small Multipurpose Labels"
  label_size: "1 in x 2 1/8 in"
  printer_name: string
  barcode_format: "Code128Auto"
  scan_code: string
  card_name: string
  set_code: string
  condition: string
  direct_print_performed: true
  browser_print_dialog_required: false
  requested_by_user_id: string
  requested_by_user_name: string
  credentials_synced_to_client: false
  raw_credentials_returned: false
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
  grading_company?: string
  grade?: string
  market_price_minor_units: number
  low_price_minor_units: number
  mid_price_minor_units: number
  high_price_minor_units: number
  currency: string
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
  game: "pokemon" | "magicthegathering" | "magic" | "lorcana" | "onepiece" | "one-piece" | "gundam" | "riftbound"
  card_name: string
  set_name: string
  set_code: string
  card_number: string
  printed_number: string
  suggested_barcode: string
  market_price_minor_units: number
  currency: string
  image_url: string
  catalog_source: "wordpress_catalog_cache" | "wordpress_catalog_export" | "local_reference_cache"
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

export type LocalSyncScryDexVisionScanResult = LocalSyncResult<{
  action: "scrydex_vision_card_scan"
  cards: LocalSyncScryDexCard[]
  query: string
  game: LocalSyncScryDexCard["game"]
  set_filter?: string
  result_limit?: number | "all"
  source: "wordpress_catalog_cache" | "local_reference_cache" | "wordpress_proxy" | "scrydex_vision"
  lookup_order: ("scrydex_vision" | "local_reference_cache" | "wordpress_catalog_proxy" | "scrydex_provider")[]
  local_reference_cache_hit?: boolean
  wordpress_proxy_performed?: boolean
  wordpress_proxy_required?: boolean
  credential_storage: "lan_server_environment" | "wordpress_server_settings"
  credentials_synced_to_client: false
  live_provider_request_performed: boolean
  vision?: {
    status: "ok"
    action: "scrydex_vision_card_identified"
    analysis: {
      type: string
      game: string
      language_code: string
      graded_details: {
        company: string
        grade_code: string
        grade_label: string
        grade_number: string
        year: string
        cert: string
      }
    }
    matches: Array<{
      rank: number
      score: number | null
      variant: string
      provider_card_id: string
      game: string
      card_name: string
      set_name: string
      set_code: string
      card_number: string
      printed_number: string
      image_url: string
    }>
    match_count: number
    top_query: string
    game: string
    provider: "scrydex_vision"
    credentials_synced_to_client: false
    raw_credentials_returned: false
  }
  vision_query?: string
  vision_set_filter?: string
  vision_match_count?: number
  vision_provider?: "scrydex_vision"
}>

export type LocalSyncGradedValuation = {
  provider: "pricecharting" | "psa" | "ebay" | "tcgplayer" | string
  provider_product_id: string
  provider_product_name: string
  provider_product_url: string
  grading_company: string
  grade: string
  market_price_minor_units: number
  currency: "USD"
  source_label: string
  source_detail: string
  confidence_score: number
  observed_at_utc: string
  fetched_at_utc: string
  credentials_synced_to_client: false
  raw_credentials_returned: false
}

export type LocalSyncGradedProviderStatus = {
  provider: string
  configured: boolean
  status: string
  detail: string
  credentials_synced_to_client: false
  raw_credentials_returned: false
}

export type LocalSyncGradedValuationResult = LocalSyncResult<{
  action: "local_sync_graded_trade_in_valuation"
  query: {
    provider_card_id: string
    provider_variant_id: string
    reference_variant_id: number | null
    game: LocalSyncScryDexCard["game"]
    card_name: string
    set_name: string
    set_code: string
    card_number: string
    printed_number: string
    variant: string
    finish: string
    grading_company: string
    grade: string
    source_priority: "scrydex_primary_secondary_comps"
  }
  valuation: LocalSyncGradedValuation | null
  provider_statuses: LocalSyncGradedProviderStatus[]
  provider_request_performed: boolean
  cache_hit: boolean
  cache_expires_at_utc: string
  primary_source: "scrydex_reference_cache"
  secondary_source_used: boolean
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncKioskOrderStatus = "queued" | "accepted" | "pulling" | "ready" | "completed" | "expired"
export type LocalSyncFulfillmentOrderStatus = "awaiting_pull" | "pulling" | "ready_for_pickup" | "completed"

export type LocalSyncKioskOrder = {
  order_id: string
  first_name: string
  last_name: string
  customer_name: string
  customer_public_id: string
  customer_lookup: string
  status: LocalSyncKioskOrderStatus
  payment_status: "pay_at_store" | "paid"
  square_receipt_reference: string
  square_order_id: string
  paid_at_utc: string
  hold_expires_at_utc: string
  hold_seconds_remaining: number
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

export type LocalSyncFulfillmentNotificationSettings = {
  audio_enabled: boolean
  notification_sound_url: string
  employee_only: true
  ready_pickup_email_enabled: boolean
  source: string
  credentials_synced_to_client: false
  raw_credentials_returned: false
}

export type LocalSyncFulfillmentNotificationSettingsResult = LocalSyncResult<{
  action: "fulfillment_notification_settings"
  fulfillment_notifications: LocalSyncFulfillmentNotificationSettings
  employee_only: true
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncKioskOrderListResult = LocalSyncResult<{
  orders: LocalSyncKioskOrder[]
  order_count: number
  total_order_count: number
  shared_queue_source: "local_sync_server"
  wordpress_acceptance_required: true
  fulfillment_notifications?: LocalSyncFulfillmentNotificationSettings
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

export type LocalSyncKioskOrderCustomerUpdateResult = LocalSyncResult<{
  order: LocalSyncKioskOrder
  shared_queue_source: "local_sync_server"
  customer_profile_linked: boolean
  credentials_synced_to_client: false
  raw_credentials_returned: false
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
  fulfillment_notifications?: LocalSyncFulfillmentNotificationSettings
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
  provider_card_id?: string
  reference_variant_id?: number | null
  provider_variant_id?: string
  game?: LocalSyncScryDexCard["game"]
  set_code?: string
  card_number?: string
  printed_number?: string
  variant?: string
  finish?: string
  language?: string
  back_image_url?: string
  price_source?: string
  price_observed_at_utc?: string
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
  customer_id_number_masked?: string
  customer_id_state?: string
  customer_id_recorded_at_utc?: string
  customer_id_recorded_by_user_id?: string
  customer_id_recorded_by_user_name?: string
  items: LocalSyncTradeInItem[]
  item_count: number
  cash_total_minor_units: number
  credit_total_minor_units: number
  combined_total_minor_units: number
  currency: "USD"
  converted_at_utc: string
  converted_by_user_id: string
  converted_by_user_name?: string
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
  credit_application?: LocalSyncTradeInCreditApplication | null
  sellable_inventory_created: false
  shared_queue_source: "local_sync_server"
  credentials_synced_to_client: false
}>

export type LocalSyncTradeInOrderStatusUpdateResult = LocalSyncTradeInOrderCreateResult

export type LocalSyncTradeInCreditApplication = {
  applied: boolean
  code: string
  message: string
  customer?: LocalSyncCustomer
  ledger_entry?: LocalSyncCreditLedgerEntry
  credit_total_minor_units?: number
  wordpress_acceptance_required?: true
  idempotent?: boolean
}

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
  local_reports_fallback_used?: boolean
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
  staff_user_name?: string
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

export type LocalSyncCheckoutTransaction = {
  transaction_id: string
  customer_public_id: string
  customer_lookup: string
  customer_name: string
  customer_email: string
  guest_checkout: boolean
  square_receipt_reference: string
  square_order_id: string
  source_order_id: string
  source: "local_pos" | "kiosk" | "website_pickup" | "manual"
  receipt_delivery: "print" | "email" | "both" | "none"
  tender_type: "card" | "cash" | "split"
  subtotal_minor_units: number
  credit_used_minor_units: number
  square_due_minor_units: number
  cash_paid_minor_units: number
  card_paid_minor_units: number
  change_due_minor_units: number
  total_minor_units: number
  currency: "USD"
  items: Array<{
    line_id: string
    type: "inventory" | "misc" | "kiosk"
    label: string
    inventory_public_id: string
    barcode: string
    card_name: string
    set_name: string
    condition: string
    location: string
    quantity: number
    unit_price_minor_units: number
    total_minor_units: number
    status: string
  }>
  item_count: number
  staff_user_id: string
  staff_user_name: string
  created_at_utc: string
  updated_at_utc: string
}

export type LocalSyncCustomerSearchResult = LocalSyncResult<{
  customers: LocalSyncCustomer[]
  credit_ledger_entries: LocalSyncCreditLedgerEntry[]
  trade_in_orders?: LocalSyncTradeInOrder[]
  kiosk_orders?: LocalSyncKioskOrder[]
  checkout_transactions?: LocalSyncCheckoutTransaction[]
  local_cache_source: "local_sync_server"
  wordpress_ledger_authority: true
}>

export type LocalSyncCustomerProfileResult = LocalSyncResult<{
  customer: LocalSyncCustomer
  credit_ledger_entries: LocalSyncCreditLedgerEntry[]
  trade_in_orders: LocalSyncTradeInOrder[]
  kiosk_orders: LocalSyncKioskOrder[]
  checkout_transactions: LocalSyncCheckoutTransaction[]
  summary: {
    trade_in_count: number
    checkout_transaction_count?: number
    kiosk_order_count: number
    completed_kiosk_order_count: number
    ledger_entry_count: number
    credit_balance_minor_units: number
    cash_total_minor_units: number
    credit_total_minor_units: number
    combined_total_minor_units: number
    status_counts: Record<string, number>
  }
  local_cache_source: "local_sync_server"
  wordpress_ledger_authority: true
  credentials_synced_to_client: false
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

export type LocalSyncCheckoutTransactionResult = LocalSyncResult<{
  transaction: LocalSyncCheckoutTransaction
  customer_profile_linked: boolean
  square_payment_capture_performed: false
  payment_capture_authority: "square_pos_or_square_terminal"
  email_delivery_queued: boolean
  print_receipt_ready: boolean
  credentials_synced_to_client: false
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
  event_type: string
  game: string
  entry_fee_minor_units: number
  registration_deadline_utc: string
  woocommerce_product_id: number
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
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
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

export type LocalSyncEventCreateResult = LocalSyncResult<{
  event: LocalSyncEventSnapshot
  wordpress_acceptance_required: true
  wordpress_auto_sync_performed: boolean
  wordpress_auto_sync_result: unknown
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

export type LocalSyncQueueSummaryItem = {
  operation_id: string
  operation_type: string
  entity_id: string
  queued_at_utc: string
  sync_status: "pending" | "local_only"
  sync_intent: string
  customer_public_id: string
  wordpress_customer_id: number
  ledger_entry_id: string
  ledger_type: string
  amount_minor_units: number
  square_receipt_present: boolean
  reservation_count: number
}

export type LocalSyncQueueSummary = {
  pending_count: number
  local_only_count: number
  oldest_queued_at_utc: string
  by_type: Record<string, number>
  items: LocalSyncQueueSummaryItem[]
}

export type LocalSyncScryDexCatalogJob = {
  job_id: string
  game: LocalSyncScryDexCard["game"]
  game_label: string
  status: "queued" | "running" | "completed" | "failed" | "completed_with_errors" | "blocked" | "ok"
  stage: string
  phase?: string
  message?: string
  code?: string
  current_page: number
  current_cursor: string
  current_expansion_id?: string
  current_expansion_name?: string
  provider_request_count?: number
  expansion_pages?: number
  expansion_rows?: number
  card_pages?: number
  stored_cards?: number
  variants?: number
  prices?: number
  fetched_count: number
  saved_count: number
  skipped_count: number
  failed_count: number
  total_expected: number
  started_at_utc: string
  updated_at_utc: string
  completed_at_utc: string
  last_error: string
  requested_by_user_id: string
  requested_by_user_name: string
  games?: Array<{
    game: string
    status: string
    code?: string
    message?: string
    phase?: string
    current_expansion_id?: string
    current_expansion_name?: string
    provider_request_count?: number
    expansion_pages?: number
    expansion_rows?: number
    card_pages?: number
    stored_cards?: number
    variants?: number
    prices?: number
    failed_sets?: unknown[]
    failed_cards?: unknown[]
    updated_at_utc?: string
  }>
  catalog_pull?: Record<string, unknown>
  inventory_reprice?: Record<string, unknown>
  result?: Record<string, unknown>
  events: Array<{
    at_utc: string
    status: "queued" | "running" | "completed" | "failed"
    stage: string
    message: string
  }>
}

export type LocalSyncScryDexCatalogStatusSnapshot = {
  generated_at_utc: string
  totals: {
    card_count: number
    variant_count: number
    price_point_count: number
    priced_card_count: number
    game_count: number
    latest_catalog_sync_utc: string
    latest_price_observed_utc: string
    games: Array<{
      game: string
      card_count: number
      variant_count: number
      price_point_count: number
      priced_card_count: number
      latest_catalog_sync_utc: string
      latest_price_observed_utc: string
    }>
  }
  daily_sync_configured: boolean
  active_job: LocalSyncScryDexCatalogJob | null
  active_jobs?: LocalSyncScryDexCatalogJob[]
  recent_jobs: LocalSyncScryDexCatalogJob[]
  last_sync: LocalSyncScryDexCatalogJob | null
  credentials_synced_to_client: false
  raw_credentials_returned: false
}

export type LocalSyncScryDexCatalogStatusResult = LocalSyncResult<LocalSyncScryDexCatalogStatusSnapshot>

export type LocalSyncScryDexCatalogSyncJobResult = LocalSyncResult<{
  action: "scrydex_catalog_sync_job"
  job: LocalSyncScryDexCatalogJob
  idempotent?: boolean
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncPriceReviewItem = {
  review_id: string
  decision_id: string
  review_status: "pending" | "approved" | "rejected" | "cancelled"
  review_reason: string
  notes: string
  inventory_public_id: string
  current_price_minor_units: number
  candidate_price_minor_units: number
  effective_floor_minor_units: number
  percent_change_basis_points: number
  reason_code: string
  provider_card_id: string
  provider_variant_id: string
  condition_code: string
  grading_company: string
  grade: string
  source_provider: string
  source_currency: string
  source_amount_minor_units: number
  fx_provider: string
  fx_rate: string
  converted_usd_minor_units: number
  observed_at_utc: string
  observation_payload: Record<string, unknown>
  inventory_item: LocalSyncInventoryItem | null
}

export type LocalSyncPriceReviewListResult = LocalSyncResult<{
  reviews: LocalSyncPriceReviewItem[]
  review_count: number
  pending_count: number
  source_of_truth: "local_sync_server"
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncPriceReviewDecisionResult = LocalSyncResult<{
  action: "price_review_approved" | "price_review_manual_price_set" | "price_review_rejected" | "price_review_cancelled" | "price_review_already_decided"
  idempotent: boolean
  review: LocalSyncPriceReviewItem
  item?: LocalSyncInventoryItem
  active_price_changed?: boolean
}>

export type LocalSyncBulkPriceReviewDecisionResult = LocalSyncResult<{
  action: "price_reviews_bulk_approved" | "price_reviews_bulk_rejected"
  requested_count: number
  accepted_count: number
  blocked_count: number
  results: LocalSyncPriceReviewDecisionResult[]
}>

export type LocalSyncStatusResult = LocalSyncResult<{
  local_database: "store-sync.sqlite"
  persistence_mode: "sqlite_adapter_pending" | "sqlite"
  queue_depth: number
  queue_summary?: LocalSyncQueueSummary
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
  wordpress_catalog_pull_connected?: boolean
  wordpress_inventory_pull_connected?: boolean
  wordpress_events_pull_connected?: boolean
  wordpress_fulfillment_pull_connected?: boolean
  scrydex_lookup_order: ("local_reference_cache" | "wordpress_catalog_proxy" | "scrydex_provider")[]
  scrydex_fallback_connected: boolean
  scrydex_catalog_index_connected?: boolean
  scrydex_catalog_status?: LocalSyncScryDexCatalogStatusSnapshot
  graded_pricing_provider_connected?: boolean
  graded_pricing_primary_source?: "scrydex_reference_cache"
  local_operations_preserved: true
  authoritative_schema?: {
    price_review_pending_count: number
    outbox_pending_delivery_count: number
    outbox_dead_letter_count: number
  }
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
  catalog_pulled_count?: number
  catalog_applied_count?: number
  catalog_inserted_count?: number
  catalog_updated_count?: number
  catalog_ignored_count?: number
  meta: {
    page: number
    page_size: number
    total: number
    has_more: boolean
  } | null
  catalog_meta?: {
    page: number
    page_size: number
    total: number
    has_more: boolean
    manifest?: Record<string, unknown> | null
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
  wordpress_catalog_pull_connected?: boolean
  wordpress_inventory_pull_connected: boolean
  wordpress_events_pull_connected: boolean
  wordpress_fulfillment_pull_connected?: boolean
  credentials_synced_to_client: false
  local_inventory_count: number
  local_reference_card_count?: number
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

export type LocalSyncSquareTerminalStatusResult = LocalSyncResult<{
  action: "square_terminal_status"
  environment: "sandbox" | "production"
  configured: boolean
  token_configured: boolean
  location_configured: boolean
  terminal_device_configured: boolean
  can_create_device_code: boolean
  can_create_terminal_checkout: boolean
  payment_capture_supported: boolean
  device_pairing_required: boolean
  checkout_endpoint: "/v2/terminals/checkouts"
  device_code_endpoint: "/v2/devices/codes"
  square_payment_authority: "square_terminal_api"
  pug_credit_balance_authority: "wordpress_customer_credit_ledger"
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncSquareTerminalDeviceCodeResult = LocalSyncResult<{
  action: "square_terminal_device_code_created"
  device_code: {
    id: string
    code: string
    name: string
    product_type: string
    location_id: string
    status: string
    created_at: string
    paired_at: string
  }
  pairing_instruction: string
  provider_request_performed: true
  credentials_synced_to_client: false
  raw_credentials_returned: false
}>

export type LocalSyncSquareTerminalCheckoutResult = LocalSyncResult<{
  action: "square_terminal_checkout_created"
  square_checkout: {
    id: string
    status: string
    reference_id: string
    note: string
    amount_money: {
      amount: number
      currency: "USD"
    }
    device_id: string
    payment_ids: string[]
    created_at: string
    updated_at: string
  }
  provider_request_performed: true
  payment_capture_started_on_reader: true
  pug_credit_balance_authority: "wordpress_customer_credit_ledger"
  requested_by_user_id: string
  requested_by_user_name: string
  credentials_synced_to_client: false
  raw_credentials_returned: false
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
  listInventoryLocations: (sessionToken: string) => Promise<LocalSyncInventoryLocationListResult>
  addInventoryLocation: (
    sessionToken: string,
    input: { location: string },
  ) => Promise<LocalSyncInventoryLocationCreateResult>
  listDymoPrinters: (sessionToken: string) => Promise<LocalSyncDymoPrinterListResult>
  printDymoLabel: (
    sessionToken: string,
    input: {
      cardName: string
      setCode: string
      condition: string
      barcode: string
      printerName?: string
      copies?: number
    },
  ) => Promise<LocalSyncDymoLabelPrintResult>
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
  updateInventoryItem: (
    sessionToken: string,
    inventoryPublicId: string,
    input: {
      barcode?: string
      location?: string
      status?: LocalSyncInventoryItem["status"]
      priceMinorUnits?: number
      minimumSalePriceMinorUnits?: number
      quantityDelta?: number
      quantityOnHand?: number
      onlineVisibility?: LocalSyncInventoryItem["online_visibility"]
      kioskVisibility?: LocalSyncInventoryItem["kiosk_visibility"]
      posVisibility?: LocalSyncInventoryItem["pos_visibility"]
      reason?: string
      syncIntent?:
        | "staff_inventory_update"
        | "staff_barcode_scan"
        | "staff_quantity_adjustment"
        | "staff_manual_price_visibility_update"
      consolidateInventoryGroup?: boolean
    },
  ) => Promise<LocalSyncInventoryUpdateResult>
  searchScryDexCards: (
    sessionToken: string,
    query: string,
    game?: LocalSyncScryDexCard["game"],
    options?: { limit?: number | "all"; setFilter?: string; rawOrGraded?: "raw" | "graded"; forceLive?: boolean },
  ) => Promise<LocalSyncScryDexSearchResult>
  getScryDexCatalogStatus: (sessionToken: string) => Promise<LocalSyncScryDexCatalogStatusResult>
  startScryDexCatalogSyncJob: (
    sessionToken: string,
    input: { game?: LocalSyncScryDexCard["game"]; games?: LocalSyncScryDexCard["game"][] },
  ) => Promise<LocalSyncScryDexCatalogSyncJobResult>
  listPriceReviews: (
    sessionToken: string,
    input?: { status?: LocalSyncPriceReviewItem["review_status"] | ""; limit?: number },
  ) => Promise<LocalSyncPriceReviewListResult>
  decidePriceReview: (
    sessionToken: string,
    reviewId: string,
    input: {
      status: "approved" | "rejected" | "cancelled"
      candidatePriceMinorUnits?: number
      notes?: string
      manualPriceOverride?: boolean
    },
  ) => Promise<LocalSyncPriceReviewDecisionResult>
  decidePriceReviews: (
    sessionToken: string,
    input: { reviewIds: string[]; status: "approved" | "rejected"; notes?: string },
  ) => Promise<LocalSyncBulkPriceReviewDecisionResult>
  identifyScryDexCardImage: (
    sessionToken: string,
    input: {
      imageDataUrl: string
      game?: LocalSyncScryDexCard["game"]
      rawOrGraded?: "raw" | "graded"
    },
  ) => Promise<LocalSyncScryDexVisionScanResult>
  lookupGradedTradeInValuation: (
    sessionToken: string,
    input: {
      providerCardId?: string
      providerVariantId?: string
      referenceVariantId?: number | null
      game?: LocalSyncScryDexCard["game"]
      cardName: string
      setName: string
      setCode?: string
      cardNumber?: string
      printedNumber?: string
      variant?: string
      finish?: string
      gradingCompany: string
      grade: string
    },
  ) => Promise<LocalSyncGradedValuationResult>
  createKioskOrder: (
    input: {
      firstName: string
      lastName: string
      inventoryPublicIds: string[]
      customerPublicId?: string
      customerLookup?: string
    },
  ) => Promise<LocalSyncKioskOrderResult>
  listKioskOrders: (
    sessionToken: string,
    input?: { limit?: number; statuses?: LocalSyncKioskOrderStatus[] },
  ) => Promise<LocalSyncKioskOrderListResult>
  getFulfillmentNotifications: (
    sessionToken: string,
  ) => Promise<LocalSyncFulfillmentNotificationSettingsResult>
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
      customerPublicId?: string
      customerLookup?: string
    },
  ) => Promise<LocalSyncKioskOrderPaymentUpdateResult>
  updateKioskOrderCustomer: (
    sessionToken: string,
    orderId: string,
    input: { customerPublicId: string; customerLookup?: string },
  ) => Promise<LocalSyncKioskOrderCustomerUpdateResult>
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
      customerIdNumber?: string
      customerIdState?: string
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
        backImageUrl?: string
        priceSource?: string
        priceObservedAtUtc?: string | null
      }>
    },
  ) => Promise<LocalSyncTradeInOrderCreateResult>
  updateTradeInOrder: (
    sessionToken: string,
    orderId: string,
    input: {
      customerName: string
      customerPhone?: string
      customerPublicId?: string
      customerIdNumber?: string
      customerIdState?: string
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
        backImageUrl?: string
        priceSource?: string
        priceObservedAtUtc?: string | null
      }>
    },
  ) => Promise<LocalSyncTradeInOrderCreateResult>
  updateTradeInOrderStatus: (
    sessionToken: string,
    orderId: string,
    status: LocalSyncTradeInOrderStatus,
    input?: { notes?: string; customerIdNumber?: string; customerIdState?: string },
  ) => Promise<LocalSyncTradeInOrderStatusUpdateResult>
  getManagerReport: (
    sessionToken: string,
    report: LocalSyncReportKey,
    filters?: LocalSyncReportFilters,
  ) => Promise<LocalSyncManagerReportResult>
  searchCustomers: (query: string) => Promise<LocalSyncCustomerSearchResult>
  getCustomerProfile: (
    sessionToken: string,
    customerPublicId: string,
  ) => Promise<LocalSyncCustomerProfileResult>
  createCustomer: (
    sessionToken: string,
    input: { firstName: string; lastName: string; email: string; customerLookup?: string },
  ) => Promise<LocalSyncCreateCustomerResult>
  createCreditAdjustment: (
    sessionToken: string,
    input: { customerPublicId: string; amountMinorUnits: number; reason: string },
  ) => Promise<LocalSyncCreditAdjustmentResult>
  createCheckoutTransaction: (
    sessionToken: string,
    input: {
      customerPublicId?: string
      customerLookup?: string
      customerName?: string
      customerEmail?: string
      guestCheckout?: boolean
      squareReceiptReference: string
      squareOrderId?: string
      sourceOrderId?: string
      source?: "local_pos" | "kiosk" | "website_pickup" | "manual"
      receiptDelivery?: "print" | "email" | "both" | "none"
      tenderType?: "card" | "cash" | "split"
      subtotalMinorUnits: number
      creditUsedMinorUnits?: number
      squareDueMinorUnits?: number
      cashPaidMinorUnits?: number
      cardPaidMinorUnits?: number
      changeDueMinorUnits?: number
      totalMinorUnits: number
      currency?: "USD"
      items: Array<Record<string, unknown>>
    },
  ) => Promise<LocalSyncCheckoutTransactionResult>
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
  createEvent: (
    sessionToken: string,
    input: {
      title: string
      startsAtUtc: string
      game: string
      eventType: string
      capacity: number
      priceMinorUnits: number
      registrationCloseValue: number
      registrationCloseUnit: "minutes" | "hours" | "days"
      locationLabel: string
      description: string
    },
  ) => Promise<LocalSyncEventCreateResult>
  createEventRegistration: (
    sessionToken: string,
    input: {
      eventId: string
      attendeeLabel: string
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
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
  pullWebsiteInventory: (
    sessionToken: string,
    input?: {
      domains?: ("inventory" | "events" | "fulfillment" | "catalog")[]
      catalogPage?: number
      catalogPageSize?: number
      page?: number
      pageSize?: number
    },
  ) => Promise<LocalSyncPullResult>
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
  getSquareTerminalStatus: (sessionToken: string) => Promise<LocalSyncSquareTerminalStatusResult>
  createSquareTerminalDeviceCode: (
    sessionToken: string,
    input?: { deviceName?: string; idempotencyKey?: string },
  ) => Promise<LocalSyncSquareTerminalDeviceCodeResult>
  createSquareTerminalCheckout: (
    sessionToken: string,
    input: {
      amountMinorUnits: number
      currency?: "USD"
      referenceId?: string
      note?: string
      idempotencyKey?: string
    },
  ) => Promise<LocalSyncSquareTerminalCheckoutResult>
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
    listInventoryLocations: (sessionToken) =>
      requestLocalSync(fetcher, baseUrl, "/inventory/locations", {
        sessionToken,
      }) as Promise<LocalSyncInventoryLocationListResult>,
    addInventoryLocation: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/inventory/locations", {
        method: "POST",
        sessionToken,
        body: {
          location: input.location,
        },
      }) as Promise<LocalSyncInventoryLocationCreateResult>,
    listDymoPrinters: (sessionToken) =>
      requestLocalSync(fetcher, baseUrl, "/labels/dymo/printers", {
        sessionToken,
      }) as Promise<LocalSyncDymoPrinterListResult>,
    printDymoLabel: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/labels/dymo/print", {
        method: "POST",
        sessionToken,
        body: {
          card_name: input.cardName,
          set_code: input.setCode,
          condition: input.condition,
          barcode: input.barcode,
          printer_name: input.printerName ?? "",
          copies: input.copies ?? 1,
        },
      }) as Promise<LocalSyncDymoLabelPrintResult>,
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
    updateInventoryItem: (sessionToken, inventoryPublicId, input) =>
      requestLocalSync(fetcher, baseUrl, `/inventory/items/${encodeURIComponent(inventoryPublicId)}`, {
        method: "PATCH",
        sessionToken,
        body: {
          barcode: input.barcode ?? "",
          location: input.location ?? "",
          status: input.status ?? "",
          price_minor_units: input.priceMinorUnits,
          minimum_sale_price_minor_units: input.minimumSalePriceMinorUnits,
          quantity_delta: input.quantityDelta,
          quantity_on_hand: input.quantityOnHand,
          online_visibility: input.onlineVisibility,
          kiosk_visibility: input.kioskVisibility,
          pos_visibility: input.posVisibility,
          reason: input.reason ?? "",
          sync_intent: input.syncIntent ?? "staff_inventory_update",
          consolidate_inventory_group: input.consolidateInventoryGroup ?? false,
        },
      }) as Promise<LocalSyncInventoryUpdateResult>,
    searchScryDexCards: (sessionToken, query, game = "pokemon", options = {}) => {
      const params = new URLSearchParams({
        q: query,
        game,
        limit: String(options.limit ?? "all"),
      })

      if (options.setFilter) {
        params.set("set", options.setFilter)
      }

      if (options.rawOrGraded) {
        params.set("raw_or_graded", options.rawOrGraded)
      }

      if (options.forceLive) {
        params.set("force_live", "1")
      }

      return requestLocalSync(fetcher, baseUrl, `/scrydex/cards/search?${params.toString()}`, {
        sessionToken,
      }) as Promise<LocalSyncScryDexSearchResult>
    },
    getScryDexCatalogStatus: (sessionToken) =>
      requestLocalSync(fetcher, baseUrl, "/scrydex/catalog/status", {
        sessionToken,
      }) as Promise<LocalSyncScryDexCatalogStatusResult>,
    startScryDexCatalogSyncJob: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/scrydex/catalog/sync-jobs", {
        method: "POST",
        sessionToken,
        body: {
          game: input.game,
          games: input.games,
        },
      }) as Promise<LocalSyncScryDexCatalogSyncJobResult>,
    listPriceReviews: (sessionToken, input = {}) => {
      const params = new URLSearchParams({
        status: input.status ?? "",
        limit: String(input.limit ?? 100),
      })
      return requestLocalSync(fetcher, baseUrl, `/pricing/reviews?${params.toString()}`, {
        sessionToken,
      }) as Promise<LocalSyncPriceReviewListResult>
    },
    decidePriceReview: (sessionToken, reviewId, input) =>
      requestLocalSync(fetcher, baseUrl, `/pricing/reviews/${encodeURIComponent(reviewId)}`, {
        method: "PATCH",
        sessionToken,
        body: {
          status: input.status,
          candidate_price_minor_units: input.candidatePriceMinorUnits,
          notes: input.notes ?? "",
          manual_price_override: input.manualPriceOverride === true,
        },
      }) as Promise<LocalSyncPriceReviewDecisionResult>,
    decidePriceReviews: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/pricing/reviews/bulk", {
        method: "POST",
        sessionToken,
        body: {
          review_ids: input.reviewIds,
          status: input.status,
          notes: input.notes ?? "",
        },
      }) as Promise<LocalSyncBulkPriceReviewDecisionResult>,
    identifyScryDexCardImage: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/scrydex/cards/identify-image", {
        method: "POST",
        sessionToken,
        body: {
          image_data_url: input.imageDataUrl,
          game: input.game ?? "pokemon",
          raw_or_graded: input.rawOrGraded ?? "raw",
        },
      }) as Promise<LocalSyncScryDexVisionScanResult>,
    lookupGradedTradeInValuation: (sessionToken, input) => {
      const params = new URLSearchParams({
        provider_card_id: input.providerCardId ?? "",
        provider_variant_id: input.providerVariantId ?? "",
        reference_variant_id:
          input.referenceVariantId === null || input.referenceVariantId === undefined
            ? ""
            : String(input.referenceVariantId),
        game: input.game ?? "pokemon",
        card_name: input.cardName,
        set_name: input.setName,
        set_code: input.setCode ?? "",
        card_number: input.cardNumber ?? "",
        printed_number: input.printedNumber ?? "",
        variant: input.variant ?? "",
        finish: input.finish ?? "",
        grading_company: input.gradingCompany,
        grade: input.grade,
      })

      return requestLocalSync(fetcher, baseUrl, `/trade-ins/graded-valuation?${params.toString()}`, {
        sessionToken,
      }) as Promise<LocalSyncGradedValuationResult>
    },
    createKioskOrder: (input) =>
      requestLocalSync(fetcher, baseUrl, "/kiosk/orders", {
        method: "POST",
        body: {
          first_name: input.firstName,
          last_name: input.lastName,
          inventory_public_ids: input.inventoryPublicIds,
          customer_public_id: input.customerPublicId ?? "",
          customer_lookup: input.customerLookup ?? "",
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
    getFulfillmentNotifications: (sessionToken) =>
      requestLocalSync(fetcher, baseUrl, "/notifications/fulfillment", {
        sessionToken,
      }) as Promise<LocalSyncFulfillmentNotificationSettingsResult>,
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
          customer_public_id: input.customerPublicId ?? "",
          customer_lookup: input.customerLookup ?? "",
        },
      }) as Promise<LocalSyncKioskOrderPaymentUpdateResult>,
    updateKioskOrderCustomer: (sessionToken, orderId, input) =>
      requestLocalSync(fetcher, baseUrl, `/kiosk/orders/${encodeURIComponent(orderId)}/customer`, {
        method: "PATCH",
        sessionToken,
        body: {
          customer_public_id: input.customerPublicId,
          customer_lookup: input.customerLookup ?? "",
        },
      }) as Promise<LocalSyncKioskOrderCustomerUpdateResult>,
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
          customer_id_number: input.customerIdNumber ?? "",
          customer_id_state: input.customerIdState ?? "",
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
            provider_card_id: item.providerCardId ?? "",
            reference_variant_id: item.referenceVariantId ?? null,
            provider_variant_id: item.providerVariantId ?? "",
            game: item.game ?? "",
            set_code: item.setCode ?? "",
            card_number: item.cardNumber ?? "",
            printed_number: item.printedNumber ?? "",
            variant: item.variant ?? "",
            finish: item.finish ?? "",
            language: item.language ?? "",
            back_image_url: item.backImageUrl ?? "",
            price_source: item.priceSource ?? "",
            price_observed_at_utc: item.priceObservedAtUtc ?? "",
          })),
        },
      }) as Promise<LocalSyncTradeInOrderCreateResult>,
    updateTradeInOrder: (sessionToken, orderId, input) =>
      requestLocalSync(fetcher, baseUrl, `/trade-ins/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        sessionToken,
        body: {
          customer_name: input.customerName,
          customer_phone: input.customerPhone ?? "",
          customer_public_id: input.customerPublicId ?? "",
          customer_id_number: input.customerIdNumber ?? "",
          customer_id_state: input.customerIdState ?? "",
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
            provider_card_id: item.providerCardId ?? "",
            reference_variant_id: item.referenceVariantId ?? null,
            provider_variant_id: item.providerVariantId ?? "",
            game: item.game ?? "",
            set_code: item.setCode ?? "",
            card_number: item.cardNumber ?? "",
            printed_number: item.printedNumber ?? "",
            variant: item.variant ?? "",
            finish: item.finish ?? "",
            language: item.language ?? "",
            back_image_url: item.backImageUrl ?? "",
            price_source: item.priceSource ?? "",
            price_observed_at_utc: item.priceObservedAtUtc ?? "",
          })),
        },
      }) as Promise<LocalSyncTradeInOrderCreateResult>,
    updateTradeInOrderStatus: (sessionToken, orderId, status, input = {}) =>
      requestLocalSync(fetcher, baseUrl, `/trade-ins/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        sessionToken,
        body: {
          status,
          notes: input.notes ?? "",
          customer_id_number: input.customerIdNumber ?? "",
          customer_id_state: input.customerIdState ?? "",
        },
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
    getCustomerProfile: (sessionToken, customerPublicId) =>
      requestLocalSync(fetcher, baseUrl, `/customers/${encodeURIComponent(customerPublicId)}/profile`, {
        sessionToken,
      }) as Promise<LocalSyncCustomerProfileResult>,
    createCustomer: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/customers", {
        method: "POST",
        sessionToken,
        body: {
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          customer_lookup: input.customerLookup ?? "",
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
    createCheckoutTransaction: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/checkout/transactions", {
        method: "POST",
        sessionToken,
        body: {
          customer_public_id: input.customerPublicId ?? "",
          customer_lookup: input.customerLookup ?? "",
          customer_name: input.customerName ?? "",
          customer_email: input.customerEmail ?? "",
          guest_checkout: input.guestCheckout ?? false,
          square_receipt_reference: input.squareReceiptReference,
          square_order_id: input.squareOrderId ?? "",
          source_order_id: input.sourceOrderId ?? "",
          source: input.source ?? "local_pos",
          receipt_delivery: input.receiptDelivery ?? "print",
          tender_type: input.tenderType ?? "card",
          subtotal_minor_units: input.subtotalMinorUnits,
          credit_used_minor_units: input.creditUsedMinorUnits ?? 0,
          square_due_minor_units: input.squareDueMinorUnits ?? input.totalMinorUnits,
          cash_paid_minor_units: input.cashPaidMinorUnits ?? 0,
          card_paid_minor_units: input.cardPaidMinorUnits ?? input.squareDueMinorUnits ?? input.totalMinorUnits,
          change_due_minor_units: input.changeDueMinorUnits ?? 0,
          total_minor_units: input.totalMinorUnits,
          currency: input.currency ?? "USD",
          items: input.items,
        },
      }) as Promise<LocalSyncCheckoutTransactionResult>,
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
    createEvent: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/events", {
        method: "POST",
        sessionToken,
        body: {
          title: input.title,
          starts_at_utc: input.startsAtUtc,
          game: input.game,
          event_type: input.eventType,
          capacity: input.capacity,
          price_minor_units: input.priceMinorUnits,
          registration_close_value: input.registrationCloseValue,
          registration_close_unit: input.registrationCloseUnit,
          location_label: input.locationLabel,
          description: input.description,
        },
      }) as Promise<LocalSyncEventCreateResult>,
    createEventRegistration: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/events/registrations", {
        method: "POST",
        sessionToken,
        body: {
          event_id: input.eventId,
          attendee_label: input.attendeeLabel,
          first_name: input.firstName ?? "",
          last_name: input.lastName ?? "",
          email: input.email ?? "",
          phone: input.phone ?? "",
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
    pullWebsiteInventory: (sessionToken, input = {}) =>
      requestLocalSync(fetcher, baseUrl, "/sync/pull", {
        method: "POST",
        sessionToken,
        body: {
          domains: input.domains ?? ["inventory", "events", "fulfillment"],
          catalog_page: input.catalogPage,
          catalog_page_size: input.catalogPageSize,
          page: input.page,
          page_size: input.pageSize,
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
    getSquareTerminalStatus: (sessionToken) =>
      requestLocalSync(fetcher, baseUrl, "/pos/square/terminal/status", {
        sessionToken,
      }) as Promise<LocalSyncSquareTerminalStatusResult>,
    createSquareTerminalDeviceCode: (sessionToken, input = {}) =>
      requestLocalSync(fetcher, baseUrl, "/pos/square/terminal/device-code", {
        method: "POST",
        sessionToken,
        body: {
          device_name: input.deviceName ?? "",
          idempotency_key: input.idempotencyKey ?? "",
        },
      }) as Promise<LocalSyncSquareTerminalDeviceCodeResult>,
    createSquareTerminalCheckout: (sessionToken, input) =>
      requestLocalSync(fetcher, baseUrl, "/pos/square/terminal/checkouts", {
        method: "POST",
        sessionToken,
        body: {
          amount_minor_units: input.amountMinorUnits,
          currency: input.currency ?? "USD",
          reference_id: input.referenceId ?? "",
          note: input.note ?? "",
          idempotency_key: input.idempotencyKey ?? "",
        },
      }) as Promise<LocalSyncSquareTerminalCheckoutResult>,
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
