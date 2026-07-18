import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

let websiteCatalogFallbackCalls = 0
let wordpressInventoryPullCalls = 0
let wordpressCatalogExportPullCalls = 0
let wordpressInventoryPushCalls = 0
let wordpressInventorySalePushCalls = 0
let wordpressEventRegistrationPushCalls = 0
let wordpressEventCheckinPushCalls = 0
let wordpressCustomerUpsertPushCalls = 0
let wordpressCreditPushCalls = 0
let wordpressKioskOrderPushCalls = 0
let wordpressInventoryPullRows = []
let wordpressCatalogExportRows = []
let wordpressEventsPullCalls = 0
let wordpressEventPullRows = []
let wordpressReportsPullCalls = 0
let gradedPricingLookupCalls = 0

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://thepuggaming.com/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath: ":memory:",
    websiteCatalogFallback: async ({ query, game, limit }) => {
      websiteCatalogFallbackCalls += 1

      assert.equal(query, "moonbreon")
      assert.equal(limit, "all")

      if (game !== "pokemon") {
        return {
          status: "ok",
          live_provider_request_performed: true,
          cards: [],
        }
      }

      return {
        status: "ok",
        live_provider_request_performed: true,
        cards: [
          {
            id: "scrydex-pokemon-evs-215",
            game: "pokemon",
            name: "Umbreon VMAX",
            set: {
              name: "Evolving Skies",
              code: "EVS",
            },
            number: "215",
            printedNumber: "215/203",
            sku: "PKM-EVS-215-MOONBREON",
            market_price: {
              amount: "1120.45",
              currency: "USD",
            },
            images: {
              small: "https://images.pokemontcg.io/swsh7/215.png",
              large: "https://images.pokemontcg.io/swsh7/215_hires.png",
            },
            variants: [
              {
                reference_variant_id: 515,
                provider_variant_id: "scrydex-pokemon-evs-215-alt-art",
                variant: "Alternate Art",
                finish: "Holofoil",
                language: "English",
              },
            ],
            price_points: [
              {
                reference_variant_id: 515,
                provider_variant_id: "scrydex-pokemon-evs-215-alt-art",
                condition_code: "NM",
                raw_or_graded: "raw",
                market_price: "1199.99",
                low_price: "1100.00",
                mid_price: "1175.50",
                high_price: "1250.00",
                currency: "USD",
                observed_at: "2026-06-08T16:00:00.000Z",
              },
            ],
            observed_at: "2026-06-08T16:00:00.000Z",
          },
        ],
      }
    },
    gradedPricingLookup: async (input) => {
      gradedPricingLookupCalls += 1

      assert.equal(input.card_name, "Charizard")
      assert.equal(input.set_name, "Base")
      assert.equal(input.grading_company, "PSA")
      assert.equal(input.grade, "10")

      return {
        status: "ok",
        valuation: {
          provider: "pricecharting",
          provider_product_id: "pokemon-base-charizard-4",
          provider_product_name: "Pokemon Base Charizard #4",
          provider_product_url: "https://www.pricecharting.com/game/pokemon-base/charizard-4",
          grading_company: "PSA",
          grade: "10",
          market_price_minor_units: 420000,
          currency: "USD",
          source_label: "PriceCharting graded market",
          source_detail: "PSA/Grade 10 from PriceCharting current values.",
          confidence_score: 96,
          observed_at_utc: "2026-06-15T20:00:00.000Z",
          fetched_at_utc: "2026-06-15T20:00:00.000Z",
        },
        providers: [
          {
            provider: "pricecharting",
            configured: true,
            status: "ready",
            detail: "Matched Pokemon Base Charizard #4 using PSA/Grade 10.",
          },
        ],
        provider_request_performed: true,
      }
    },
    gradedPricingProviderConfigured: true,
    wordpressInventoryPull: async ({ query, page, pageSize }) => {
      wordpressInventoryPullCalls += 1

      assert.equal(query, "charizard")
      assert.equal(page, 1)
      assert.equal(pageSize, 10)

      return {
        status: "ok",
        items: wordpressInventoryPullRows,
        meta: {
          page: 1,
          page_size: 10,
          total: wordpressInventoryPullRows.length,
          has_more: false,
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
    wordpressCatalogExportPull: async ({ table, page, pageSize }) => {
      wordpressCatalogExportPullCalls += 1

      assert.equal(table, "reference_cards")
      assert.equal(page, 2)
      assert.equal(pageSize, 3)

      return {
        status: "ok",
        table,
        rows: wordpressCatalogExportRows,
        meta: {
          page,
          page_size: pageSize,
          total: 9,
          has_more: true,
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
    wordpressEventsPull: async ({ page, pageSize, filters }) => {
      wordpressEventsPullCalls += 1

      assert.equal(page, 1)
      assert.equal(pageSize, 10)
      assert.deepEqual(filters, {
        game: undefined,
        format: undefined,
        event_type: undefined,
        registration_status: undefined,
      })

      return {
        status: "ok",
        events: wordpressEventPullRows,
        meta: {
          page: 1,
          page_size: 10,
          total: wordpressEventPullRows.length,
          has_more: false,
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
    wordpressInventoryPush: async ({ operation, item }) => {
      wordpressInventoryPushCalls += 1

      assert.equal(operation.operation_type, "inventory_intake")
      assert.ok(["Mewtwo", "Local Only Pull Guard"].includes(item.card_name))
      assert.equal(item.status, item.card_name === "Local Only Pull Guard" ? "pending_intake" : "available")
      assert.equal(item.source, "queued")
      assert.match(item.image_url, /mewtwo|pull-guard-local/)
      if (item.card_name === "Mewtwo") {
        assert.equal(item.online_visibility, "hidden")
        assert.equal(item.kiosk_visibility, "visible")
        assert.equal(item.pos_visibility, "staff_only")
        assert.equal(item.price_minor_units, 5000)
        assert.equal(item.minimum_sale_price_minor_units, 5000)
        assert.equal(item.market_price_minor_units, 3000)
        assert.equal(item.auto_price_minor_units, 3300)
      }

      if (item.card_name === "Local Only Pull Guard") {
        return {
          status: "blocked",
          code: "wordpress_inventory_push_fixture_unavailable",
          message: "Fixture keeps this local row queued so pull preservation can be verified.",
          errors: ["fixture_offline_fallback"],
          credentials_synced_to_client: false,
          authorization_header_printed: false,
        }
      }

      return {
        status: "ok",
        readback_verified: true,
        wordpress_readback: { public_id: `wp-${item.public_id}`, quantity_on_hand: item.quantity_on_hand },
        wordpress_verification: { verified: true },
        code: "wordpress_inventory_item_created",
        http_status: 201,
        wordpress_code: "inventory_item_created",
        inventory: {
          public_id: `wp-${item.public_id}`,
          sku: item.barcode,
          barcode: item.barcode,
          status: "available",
          price_change_log_persisted: true,
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
    wordpressInventorySalePush: async ({ operation, item }) => {
      wordpressInventorySalePushCalls += 1

      assert.equal(operation.operation_type, "square_pos_sale")
      assert.equal(item.status, "sold")
      assert.equal(item.barcode, "PUG-WP-CHARIZARD")
      assert.equal(operation.payload.square_receipt_reference, "SQ-SALE-CHARIZARD-25000")
      assert.equal(operation.payload.inventory_public_id, "wp-inventory-charizard")
      assert.equal(operation.payload.sync_intent, "square_pos_exact_inventory_sale")

      return {
        status: "ok",
        readback_verified: true,
        wordpress_readback: { public_id: "wp-inventory-charizard", quantity_on_hand: 0 },
        wordpress_verification: { verified: true },
        code: "wordpress_inventory_item_marked_sold",
        http_status: 200,
        wordpress_code: "inventory_item_marked_sold",
        inventory: {
          public_id: "wp-inventory-charizard",
          sku: "PUG-WP-CHARIZARD",
          barcode: "PUG-WP-CHARIZARD",
          previous_status: "available",
          status: "sold",
          date_sold: "2026-06-09 20:30:00",
          row_version: 5,
          square_receipt_reference: "SQ-SALE-CHARIZARD-25000",
        },
        woocommerce_product_sync: {
          requested: true,
          synced: true,
          status: "executed",
          product_ids: [9401],
          errors: [],
          payment_capture_deferred: true,
          square_inventory_deferred: true,
        },
        square_payment_capture_supported: false,
        payment_capture_authority: "official_woocommerce_square_extension",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
    wordpressEventRegistrationPush: async ({ operation }) => {
      wordpressEventRegistrationPushCalls += 1

      assert.equal(operation.operation_type, "event_registration")
      assert.equal(operation.payload.registration.attendee_label, "Local Event Guest")
      assert.equal(operation.payload.registration.status, "queued")

      return {
        status: "ok",
        code: "wordpress_event_registration_created",
        http_status: 201,
        wordpress_code: "registered",
        registration: {
          public_id: `wp-${operation.entity_id}`,
          event_id: 100,
          status: "reserved",
          payment_status: "not_required",
          email: `${operation.entity_id}@offline-registration.example.invalid`,
          created_at: "2026-06-08 21:50:00",
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
    wordpressEventCheckinPush: async ({ operation }) => {
      wordpressEventCheckinPushCalls += 1

      assert.equal(operation.operation_type, "event_checkin")
      assert.equal(operation.payload.checkin.attendee_label, "Local Event Guest")
      assert.equal(operation.payload.checkin.status, "queued")

      return {
        status: "ok",
        code: "wordpress_event_checkin_recorded",
        http_status: 201,
        wordpress_code: "event_checked_in",
        checkin: {
          checkin_id: 808,
          event_public_id: "event-public-100",
          event_slug: "weekly-pokemon",
          registration_id: 501,
          checkin_method: "manual_lookup",
          device_id: "offline_lan_sync",
          checked_in_at: "2026-06-08 22:15:00",
          accepted: true,
          idempotent: false,
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
    wordpressCustomerUpsertPush: async ({ operation }) => {
      wordpressCustomerUpsertPushCalls += 1

      assert.equal(operation.operation_type, "customer_upsert")
      assert.equal(operation.payload.customer.display_name, "Local Customer")
      assert.equal(operation.payload.customer.email, "local.customer@example.test")

      return {
        status: "ok",
        code: "wordpress_customer_upserted",
        http_status: 201,
        wordpress_code: "customer_created",
        customer: {
          customer_id: 501,
          public_id: "9f21ecbd-7d84-46a7-b947-12bd65a6a0b0",
          display_name: "Local Customer",
          first_name: "Local",
          last_name: "Customer",
          email: "local.customer@example.test",
          status: "active",
          row_version: 1,
          credit: {
            balance_minor_units: 0,
            currency: "USD",
          },
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
    wordpressCreditPush: async ({ operation }) => {
      wordpressCreditPushCalls += 1

      assert.ok(["credit_adjustment", "credit_redemption"].includes(operation.operation_type))
      assert.equal(operation.payload.customer.wordpress_customer_id, 501)

      return {
        status: "ok",
        code: "wordpress_credit_posted",
        http_status: 201,
        wordpress_code: "posted",
        credit: {
          accepted: true,
          idempotent: false,
          customer_id: 501,
          ledger_entry_id: 700 + wordpressCreditPushCalls,
          balance_after: {
            amount: operation.operation_type === "credit_adjustment" ? "30.0000" : "20.0000",
            currency: "USD",
          },
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
    wordpressKioskOrderPush: async ({ operation, inventoryPublicIds }) => {
      wordpressKioskOrderPushCalls += 1

      assert.equal(operation.operation_type, "kiosk_order")
      assert.equal(operation.payload.first_name, "Ada")
      assert.equal(operation.payload.last_name, "Lovelace")
      assert.equal(inventoryPublicIds.length, 1)
      assert.equal(inventoryPublicIds[0].startsWith("local-inventory-"), false)

      return {
        status: "ok",
        code: "wordpress_kiosk_order_reserved",
        http_status: 201,
        wordpress_code: "kiosk_order_reserved",
        order: {
          order_id: operation.entity_id,
          first_name: "Ada",
          last_name: "Lovelace",
          status: "reserved_for_pickup",
          reservation_count: 1,
        },
        reservations: [
          {
            reservation_id: 901,
            inventory_public_id: inventoryPublicIds[0],
            status: "active",
            expires_at: "2026-06-08 23:00:00",
          },
        ],
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
    wordpressReportsPull: async ({ report, filters }) => {
      wordpressReportsPullCalls += 1

      assert.equal(report, "sales")
      assert.equal(filters.channel, "square_pos")
      assert.equal(filters.staff_user_id, "22")

      return {
        status: "ok",
        code: "wordpress_reports_pull_ok",
        report: "sales",
        plan: {
          report: "sales",
          capability: "view_reports",
          public: false,
        },
        rows: [
          {
            channel: "square_pos",
            gross_sales: "125.00",
          },
        ],
        meta: {
          csv_header: "\"Channel\",\"Gross Sales\"\n",
        },
        dashboard_plan: {
          capability: "view_reports",
          public: false,
        },
        csv_header: "\"Channel\",\"Gross Sales\"\n",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    },
  },
})
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const preflight = await fetch(`${baseUrl}/auth/pin`, { method: "OPTIONS" })

  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*")
  assert.ok(preflight.headers.get("access-control-allow-methods")?.includes("POST"))
  assert.ok(preflight.headers.get("access-control-allow-headers")?.includes("authorization"))

  const health = await fetchJson(`${baseUrl}/health`)

  assert.equal(health.status, "ok")
  assert.equal(health.local_database, "store-sync.sqlite")
  assert.equal(health.topology, "lan_middleman_server")
  assert.equal(health.setup_screen_mode, "single_configurable_website")
  assert.equal(health.one_website_mode, true)
  assert.equal(health.website_configured, true)
  assert.equal(health.setup_status_path, "/setup/status")
  assert.equal(health.device_heartbeat_path, "/devices/heartbeat")
  assert.equal(health.device_status_path, "/devices/status")

  const setupStatus = await fetchJson(`${baseUrl}/setup/status`)

  assert.equal(setupStatus.status, "ok")
  assert.equal(setupStatus.action, "local_sync_server_setup_status")
  assert.equal(setupStatus.setup_screen_mode, "single_configurable_website")
  assert.equal(setupStatus.one_website_mode, true)
  assert.equal(setupStatus.setup_required, false)
  assert.equal(setupStatus.website_configured, true)
  assert.equal(setupStatus.website_url, "https://thepuggaming.com/")
  assert.equal(setupStatus.wordpress_rest_base, "https://thepuggaming.com/wp-json/tcg-store/v1")
  assert.equal(setupStatus.local_database, "store-sync.sqlite")
  assert.equal(setupStatus.wordpress_pull_configured, true)
  assert.equal(setupStatus.wordpress_push_configured, true)
  assert.equal(setupStatus.wordpress_inventory_sale_push_configured, true)
  assert.equal(setupStatus.scrydex_catalog_proxy_configured, true)
  assert.equal(setupStatus.client_presence_enabled, true)
  assert.equal(setupStatus.device_heartbeat_path, "/devices/heartbeat")
  assert.equal(setupStatus.device_status_path, "/devices/status")
  assert.equal(setupStatus.credentials_synced_to_client, false)
  assert.equal(setupStatus.raw_credentials_returned, false)
  assert.equal(setupStatus.direct_mysql_access, false)
  assertNoSecrets(setupStatus)

  const employeeHeartbeat = await fetchJson(`${baseUrl}/devices/heartbeat`, {
    method: "POST",
    body: {
      device_id: "front-counter-01",
      device_label: "Front Counter 01",
      mode: "employee",
      app_version: "0.2.0",
      platform: "windows",
      network_status: "online",
      setup_status: "ready",
      server_url: baseUrl,
      website_url: "https://thepuggaming.com/",
      capabilities: ["Inventory", "Kiosk", "Customers", "Sync", "Status", "Settings"],
      heartbeat_interval_seconds: 20,
    },
  })
  assert.equal(employeeHeartbeat.status, "ok")
  assert.equal(employeeHeartbeat.action, "local_client_device_heartbeat")
  assert.equal(employeeHeartbeat.device.device_id, "front-counter-01")
  assert.equal(employeeHeartbeat.device.mode, "employee")
  assert.equal(employeeHeartbeat.device.connection_status, "online")
  assert.equal(employeeHeartbeat.device.setup_status, "ready")
  assert.equal(employeeHeartbeat.device.credentials_synced_to_client, false)
  assert.equal(employeeHeartbeat.credentials_synced_to_client, false)
  assertNoSecrets(employeeHeartbeat)

  const kioskHeartbeat = await fetchJson(`${baseUrl}/devices/heartbeat`, {
    method: "POST",
    body: {
      device_id: "kiosk-01",
      device_label: "Kiosk 01",
      mode: "kiosk",
      app_version: "0.2.0",
      platform: "windows",
      network_status: "offline",
      setup_status: "setup_required",
      capabilities: ["Kiosk", "Status"],
    },
  })
  assert.equal(kioskHeartbeat.status, "ok")
  assert.equal(kioskHeartbeat.device.device_id, "kiosk-01")
  assert.equal(kioskHeartbeat.device.mode, "kiosk")
  assert.equal(kioskHeartbeat.device.connection_status, "offline")
  assert.equal(kioskHeartbeat.device.setup_status, "setup_required")
  assert.equal(kioskHeartbeat.device_count, 2)
  assert.equal(kioskHeartbeat.online_count, 1)
  assert.equal(kioskHeartbeat.offline_count, 1)
  assert.equal(kioskHeartbeat.setup_ready_count, 1)
  assert.equal(kioskHeartbeat.setup_required_count, 1)
  assertNoSecrets(kioskHeartbeat)

  const deviceStatus = await fetchJson(`${baseUrl}/devices/status`)
  assert.equal(deviceStatus.status, "ok")
  assert.equal(deviceStatus.action, "local_client_device_status")
  assert.equal(deviceStatus.topology, "lan_middleman_server")
  assert.equal(deviceStatus.device_count, 2)
  assert.equal(deviceStatus.online_count, 1)
  assert.equal(deviceStatus.offline_count, 1)
  assert.equal(deviceStatus.employee_count, 1)
  assert.equal(deviceStatus.kiosk_count, 1)
  assert.equal(deviceStatus.setup_ready_count, 1)
  assert.equal(deviceStatus.setup_required_count, 1)
  assert.equal(deviceStatus.credentials_synced_to_client, false)
  assert.ok(deviceStatus.devices.some((device) => device.device_id === "front-counter-01"))
  assert.ok(deviceStatus.devices.some((device) => device.device_id === "kiosk-01"))
  assertNoSecrets(deviceStatus)

  const managerAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "9999" },
  })

  assert.equal(managerAuth.status, "ok")
  assert.equal(managerAuth.user.role, "manager")
  assert.equal(managerAuth.raw_pin_returned, false)
  assert.equal(managerAuth.pin_hash_returned, false)
  assertNoSecrets(managerAuth)

  const managerToken = managerAuth.session.token
  const blockedSetupConfig = await fetchJson(`${baseUrl}/setup/config`, {
    method: "POST",
    body: {
      website_url: "https://example.invalid/",
      rest_base_path: "/wp-json/tcg-store/v1",
    },
    expectedStatus: 409,
  })
  assert.equal(blockedSetupConfig.status, "blocked")
  assert.equal(blockedSetupConfig.code, "session_required")

  const savedSetupConfig = await fetchJson(`${baseUrl}/setup/config`, {
    method: "POST",
    token: managerToken,
    body: {
      store_id: "the-pug",
      server_url: baseUrl,
      website_url: "https://cards.example.test/",
      rest_base_path: "/wp-json/tcg-store/v1",
      api_key: "must-not-be-accepted",
      password: "must-not-be-returned",
    },
  })
  assert.equal(savedSetupConfig.status, "ok")
  assert.equal(savedSetupConfig.action, "local_sync_server_setup_config_saved")
  assert.equal(savedSetupConfig.config.website_url, "https://cards.example.test/")
  assert.equal(savedSetupConfig.config.wordpress_rest_base, "https://cards.example.test/wp-json/tcg-store/v1")
  assert.equal(savedSetupConfig.config.config_source, "manager_app_settings")
  assert.equal(savedSetupConfig.config.raw_credentials_accepted, false)
  assert.equal(savedSetupConfig.wordpress_connector_restart_required, true)
  assert.equal(savedSetupConfig.setup_status.website_url, "https://cards.example.test/")
  assert.equal(savedSetupConfig.setup_status.wordpress_connector_restart_required, true)
  assertNoSecrets(savedSetupConfig)

  const updatedSetupStatus = await fetchJson(`${baseUrl}/setup/status`)
  assert.equal(updatedSetupStatus.website_url, "https://cards.example.test/")
  assert.equal(updatedSetupStatus.wordpress_rest_base, "https://cards.example.test/wp-json/tcg-store/v1")
  assert.equal(updatedSetupStatus.config_source, "manager_app_settings")
  assert.equal(updatedSetupStatus.wordpress_connector_restart_required, true)
  assertNoSecrets(updatedSetupStatus)

  const managerSalesReport = await fetchJson(`${baseUrl}/reports/sales?channel=square_pos&staff_user_id=22`, {
    token: managerToken,
  })
  assert.equal(managerSalesReport.status, "ok")
  assert.equal(managerSalesReport.action, "manager_report_pulled")
  assert.equal(managerSalesReport.report, "sales")
  assert.equal(managerSalesReport.plan.capability, "view_reports")
  assert.equal(managerSalesReport.dashboard_plan.public, false)
  assert.equal(managerSalesReport.rows.length, 1)
  assert.equal(managerSalesReport.csv_header, "\"Channel\",\"Gross Sales\"\n")
  assert.equal(managerSalesReport.wordpress_reports_pull_connected, true)
  assert.equal(managerSalesReport.credentials_synced_to_client, false)
  assert.equal(managerSalesReport.authorization_header_printed, false)
  assertNoSecrets(managerSalesReport)

  const policy = await fetchJson(`${baseUrl}/users/access-policy`, {
    token: managerToken,
  })

  assert.equal(policy.status, "ok")
  assert.equal(policy.pin_credentials_returned, false)
  assert.ok(policy.users.some((user) => user.id === "staff-front-counter"))
  assertNoSecrets(policy)

  const createdUser = await fetchJson(`${baseUrl}/users`, {
    method: "POST",
    token: managerToken,
    body: {
      name: "Test Cashier",
      pin: "2468",
      role: "staff",
      access: ["Inventory", "Kiosk", "Queue", "Status"],
    },
  })

  assert.equal(createdUser.status, "ok")
  assert.equal(createdUser.user.name, "Test Cashier")
  assert.deepEqual(createdUser.user.access, ["Inventory", "Kiosk", "Queue", "Status"])
  assertNoSecrets(createdUser)

  const cashierAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "2468", ttlMinutes: 5 },
  })

  assert.equal(cashierAuth.status, "ok")
  assert.equal(cashierAuth.user.name, "Test Cashier")
  assert.deepEqual(cashierAuth.user.access, ["Inventory", "Kiosk", "Queue", "Status"])
  assert.ok(Date.parse(cashierAuth.session.expiresAtUtc) - Date.now() <= 5 * 60_000 + 10_000)
  assert.ok(Date.parse(cashierAuth.session.expiresAtUtc) - Date.now() >= 4 * 60_000)

  const scrydexSearch = await fetchJson(`${baseUrl}/scrydex/cards/search?q=charizard`, {
    token: cashierAuth.session.token,
  })

  assert.equal(scrydexSearch.status, "ok")
  assert.equal(scrydexSearch.cards.length, 1)
  assert.equal(scrydexSearch.cards[0].card_name, "Charizard")
  assert.equal(scrydexSearch.cards[0].suggested_barcode, "PKM-BASE-004-HOLO")
  assert.equal(scrydexSearch.cards[0].catalog_source, "wordpress_catalog_cache")
  assert.ok(scrydexSearch.cards[0].image_url.includes("images.pokemontcg.io"))
  assert.equal(scrydexSearch.cards[0].stock_available_count, 1)
  assert.equal(scrydexSearch.cards[0].stock_total_count, 1)
  assert.equal(scrydexSearch.cards[0].stock_by_condition[0].condition, "LP")
  assert.equal(scrydexSearch.source, "wordpress_catalog_cache")
  assert.deepEqual(scrydexSearch.lookup_order, ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"])
  assert.equal(scrydexSearch.local_reference_cache_hit, true)
  assert.equal(scrydexSearch.wordpress_proxy_performed, false)
  assert.equal(scrydexSearch.wordpress_proxy_required, false)
  assert.equal(scrydexSearch.credential_storage, "wordpress_server_settings")
  assert.equal(scrydexSearch.credentials_synced_to_client, false)
  assert.equal(scrydexSearch.live_provider_request_performed, false)
  assertNoSecrets(scrydexSearch)

  const gradedValuation = await fetchJson(
    `${baseUrl}/trade-ins/graded-valuation?card_name=Charizard&set_name=Base&game=pokemon&card_number=4%2F102&grading_company=PSA&grade=10`,
    {
      token: managerToken,
    },
  )

  assert.equal(gradedValuation.status, "ok")
  assert.equal(gradedValuation.action, "local_sync_graded_trade_in_valuation")
  assert.equal(gradedValuation.primary_source, "pricecharting")
  assert.equal(gradedValuation.fallback_source, "scrydex_reference_cache")
  assert.equal(gradedValuation.pricecharting_source_used, true)
  assert.equal(gradedValuation.scrydex_fallback_used, false)
  assert.equal(gradedValuation.secondary_source_used, true)
  assert.equal(gradedValuation.provider_request_performed, true)
  assert.equal(gradedValuation.cache_hit, false)
  assert.equal(gradedValuation.valuation.provider, "pricecharting")
  assert.equal(gradedValuation.valuation.market_price_minor_units, 420000)
  assert.equal(gradedValuation.valuation.credentials_synced_to_client, false)
  assert.equal(gradedValuation.valuation.raw_credentials_returned, false)
  assert.equal(gradedValuation.provider_statuses[0].credentials_synced_to_client, false)
  assert.equal(gradedPricingLookupCalls, 1)
  assertNoSecrets(gradedValuation)

  const cachedGradedValuation = await fetchJson(
    `${baseUrl}/trade-ins/graded-valuation?card_name=Charizard&set_name=Base&game=pokemon&card_number=4%2F102&grading_company=PSA&grade=10`,
    {
      token: managerToken,
    },
  )

  assert.equal(cachedGradedValuation.status, "ok")
  assert.equal(cachedGradedValuation.cache_hit, true)
  assert.equal(cachedGradedValuation.provider_request_performed, false)
  assert.equal(cachedGradedValuation.valuation.market_price_minor_units, 420000)
  assert.equal(gradedPricingLookupCalls, 1)
  assertNoSecrets(cachedGradedValuation)

  const fallbackScryDexSearch = await fetchJson(`${baseUrl}/scrydex/cards/search?q=moonbreon&game=pokemon`, {
    token: cashierAuth.session.token,
  })

  assert.equal(fallbackScryDexSearch.status, "ok")
  assert.equal(fallbackScryDexSearch.cards.length, 1)
  assert.equal(fallbackScryDexSearch.cards[0].provider_card_id, "scrydex-pokemon-evs-215")
  assert.equal(fallbackScryDexSearch.cards[0].card_name, "Umbreon VMAX")
  assert.equal(fallbackScryDexSearch.cards[0].set_name, "Evolving Skies")
  assert.equal(fallbackScryDexSearch.cards[0].suggested_barcode, "PKM-EVS-215-MOONBREON")
  assert.equal(fallbackScryDexSearch.cards[0].market_price_minor_units, 112045)
  assert.equal(fallbackScryDexSearch.cards[0].image_url, "https://images.pokemontcg.io/swsh7/215_hires.png")
  assert.equal(fallbackScryDexSearch.cards[0].variants[0].reference_variant_id, 515)
  assert.equal(fallbackScryDexSearch.cards[0].price_points[0].provider_variant_id, "scrydex-pokemon-evs-215-alt-art")
  assert.equal(fallbackScryDexSearch.cards[0].price_points[0].condition_code, "NM")
  assert.equal(fallbackScryDexSearch.cards[0].price_points[0].market_price_minor_units, 119999)
  assert.equal(fallbackScryDexSearch.source, "wordpress_proxy")
  assert.equal(fallbackScryDexSearch.local_reference_cache_hit, false)
  assert.equal(fallbackScryDexSearch.wordpress_proxy_performed, true)
  assert.equal(fallbackScryDexSearch.wordpress_proxy_required, false)
  assert.equal(fallbackScryDexSearch.live_provider_request_performed, true)
  assert.equal(websiteCatalogFallbackCalls, 1)
  assertNoSecrets(fallbackScryDexSearch)

  const cachedFallbackScryDexSearch = await fetchJson(`${baseUrl}/scrydex/cards/search?q=moonbreon&game=pokemon`, {
    token: cashierAuth.session.token,
  })

  assert.equal(cachedFallbackScryDexSearch.status, "ok")
  assert.equal(cachedFallbackScryDexSearch.source, "wordpress_catalog_cache")
  assert.equal(cachedFallbackScryDexSearch.local_reference_cache_hit, true)
  assert.equal(cachedFallbackScryDexSearch.wordpress_proxy_performed, false)
  assert.equal(cachedFallbackScryDexSearch.live_provider_request_performed, false)
  assert.equal(cachedFallbackScryDexSearch.cards[0].provider_card_id, "scrydex-pokemon-evs-215")
  assert.equal(cachedFallbackScryDexSearch.cards[0].price_points[0].market_price_minor_units, 119999)
  assert.equal(websiteCatalogFallbackCalls, 1)
  assertNoSecrets(cachedFallbackScryDexSearch)

  const allGameCachedScryDexSearch = await fetchJson(`${baseUrl}/scrydex/cards/search?q=moonbreon`, {
    token: cashierAuth.session.token,
  })

  assert.equal(allGameCachedScryDexSearch.status, "ok")
  assert.equal(allGameCachedScryDexSearch.cards.length, 1)
  assert.equal(allGameCachedScryDexSearch.cards[0].provider_card_id, "scrydex-pokemon-evs-215")
  assert.equal(allGameCachedScryDexSearch.game, "")
  assert.equal(allGameCachedScryDexSearch.local_reference_cache_hit, true)
  assertNoSecrets(allGameCachedScryDexSearch)

  const missingScryDexSession = await fetchJson(`${baseUrl}/scrydex/cards/search?q=charizard`, {
    expectedStatus: 409,
  })
  assert.equal(missingScryDexSession.status, "blocked")
  assert.equal(missingScryDexSession.code, "session_required")

  const intake = await fetchJson(`${baseUrl}/inventory/intake`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      card_name: "Mewtwo",
      set_name: "Base Set",
      condition: "MP",
      barcode: "PUG-MEWTWO",
      price_minor_units: 4200,
      location: "Intake Bin",
      quantity: 2,
      provider_card_id: "scrydex-pokemon-test-mewtwo",
      reference_variant_id: 42,
      provider_variant_id: "scrydex-pokemon-test-mewtwo-reverse",
      game: "pokemon",
      set_code: "BASE",
      card_number: "10",
      printed_number: "10/102",
      variant: "Reverse Holo",
      finish: "Foil",
      language: "English",
      raw_or_graded: "raw",
      image_url: "https://images.example.test/mewtwo.png",
      back_image_url: "https://images.example.test/mewtwo-back.png",
      suggested_price_minor_units: 3000,
      auto_price_minor_units: 3300,
      minimum_sale_price_minor_units: 5000,
      final_price_minor_units: 5000,
      online_visibility: "hidden",
      kiosk_visibility: "visible",
      pos_visibility: "staff_only",
    },
  })
  assert.equal(intake.status, "ok")
  assert.equal(intake.quantity_added, 2)
  assert.equal(intake.items.length, 2)
  assert.equal(intake.item.card_name, "Mewtwo")
  assert.equal(intake.item.provider_card_id, "scrydex-pokemon-test-mewtwo")
  assert.equal(intake.item.reference_variant_id, 42)
  assert.equal(intake.item.provider_variant_id, "scrydex-pokemon-test-mewtwo-reverse")
  assert.equal(intake.item.printed_number, "10/102")
  assert.equal(intake.item.variant, "Reverse Holo")
  assert.equal(intake.item.finish, "Foil")
  assert.equal(intake.item.language, "English")
  assert.equal(intake.item.raw_or_graded, "raw")
  assert.equal(intake.item.image_url, "https://images.example.test/mewtwo.png")
  assert.equal(intake.item.back_image_url, "https://images.example.test/mewtwo-back.png")
  assert.equal(intake.item.online_visibility, "hidden")
  assert.equal(intake.item.kiosk_visibility, "visible")
  assert.equal(intake.item.pos_visibility, "staff_only")
  assert.equal(intake.item.price_minor_units, 5000)
  assert.equal(intake.item.barcode, "PUG-MEWTWO1")
  assert.equal(intake.items.every((item) => item.barcode.length <= 13), true)
  assert.equal(intake.item.status, "available")
  assert.equal(intake.item.source, "accepted")
  assert.equal(intake.wordpress_acceptance_required, true)
  assert.equal(intake.wordpress_auto_sync_performed, true)
  assert.equal(intake.wordpress_accepted_count, 2)
  assert.equal(intake.wordpress_retry_count, 0)
  assert.equal(intake.auto_sync_results.length, 2)
  assert.equal(intake.local_queue_depth, 0)
  assert.equal(wordpressInventoryPushCalls, 2)

  const duplicateIntake = await fetchJson(`${baseUrl}/inventory/intake`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      card_name: "Duplicate Mewtwo",
      barcode: "PUG-MEWTWO1",
      price_minor_units: 4200,
    },
    expectedStatus: 409,
  })
  assert.equal(duplicateIntake.status, "blocked")
  assert.equal(duplicateIntake.code, "duplicate_barcode")

  const staffPush = await fetchJson(`${baseUrl}/sync/push`, {
    method: "POST",
    token: cashierAuth.session.token,
  })
  assert.equal(staffPush.status, "ok")
  assert.equal(staffPush.operation_count, 0)

  const pushedIntake = await fetchJson(`${baseUrl}/sync/push`, {
    method: "POST",
    token: managerToken,
  })
  assert.equal(pushedIntake.status, "ok")
  assert.equal(pushedIntake.operation_count, 0)
  assert.equal(pushedIntake.accepted_count, 0)
  assert.equal(pushedIntake.retry_count, 0)
  assert.equal(pushedIntake.rejected_count, 0)
  assert.equal(pushedIntake.unsupported_operation_count, 0)
  assert.equal(pushedIntake.wordpress_push_connected, true)
  assert.equal(pushedIntake.credentials_synced_to_client, false)
  assert.equal(pushedIntake.local_queue_depth, 0)
  assert.equal(wordpressInventoryPushCalls, 2)
  assert.equal(pushedIntake.results.length, 0)

  const acceptedIntakeInventory = await fetchJson(`${baseUrl}/inventory/search?q=mewtwo`)
  assert.equal(acceptedIntakeInventory.status, "ok")
  assert.equal(acceptedIntakeInventory.items.length, 2)
  assert.equal(acceptedIntakeInventory.items[0].status, "available")
  assert.equal(acceptedIntakeInventory.items[0].source, "accepted")
  assert.ok(acceptedIntakeInventory.items[0].wordpress_public_id.startsWith("wp-local-inventory-"))
  assert.equal(acceptedIntakeInventory.items[0].image_url, "https://images.example.test/mewtwo.png")
  assert.equal(acceptedIntakeInventory.items[0].online_visibility, "hidden")
  assert.equal(acceptedIntakeInventory.items[0].kiosk_visibility, "visible")
  assert.equal(acceptedIntakeInventory.items[0].pos_visibility, "staff_only")
  const acceptedMewtwoLocalPublicId = acceptedIntakeInventory.items[0].public_id
  const acceptedMewtwoWordPressPublicId = acceptedIntakeInventory.items[0].wordpress_public_id

  const pendingLocalOnlyIntake = await fetchJson(`${baseUrl}/inventory/intake`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      card_name: "Local Only Pull Guard",
      set_name: "Preview Set",
      condition: "NM",
      barcode: "PUG-PGUARD",
      price_minor_units: 1200,
      location: "Intake Bin",
      quantity: 1,
      provider_card_id: "scrydex-pokemon-pull-guard",
      game: "pokemon",
      set_code: "TEST",
      card_number: "99",
      printed_number: "99/100",
      status: "pending_intake",
      image_url: "https://images.example.test/pull-guard-local.png",
    },
  })
  assert.equal(pendingLocalOnlyIntake.status, "ok")
  assert.equal(pendingLocalOnlyIntake.wordpress_auto_sync_performed, true)
  assert.equal(pendingLocalOnlyIntake.wordpress_accepted_count, 0)
  assert.equal(pendingLocalOnlyIntake.wordpress_retry_count, 1)
  assert.equal(pendingLocalOnlyIntake.local_queue_depth, 1)

  wordpressInventoryPullRows = [
    {
      public_id: "wp-inventory-charizard",
      row_version: 4,
      provider_card_id: "scrydex-pokemon-base-004",
      game: "pokemon",
      card_name: "Charizard",
      set_name: "Base Set",
      set_code: "BASE1",
      card_number: "4",
      printed_number: "4/102",
      condition_code: "LP",
      barcode: "PUG-WP-CHARIZARD",
      sale_price: "250.00",
      sale_currency: "USD",
      status: "available",
      location_id: 7,
      square_catalog_item_id: "SQUARE-ITEM-42",
      square_catalog_variation_id: "SQUARE-VARIATION-42",
      external_sync_state: "square_synced",
      front_image_url: "https://images.pokemontcg.io/base1/4_hires.png",
    },
    {
      public_id: acceptedMewtwoWordPressPublicId,
      row_version: 10,
      provider_card_id: "scrydex-pokemon-mewtwo",
      game: "pokemon",
      card_name: "Mewtwo",
      set_name: "Smoke Test",
      set_code: "SMOKE",
      card_number: "150",
      printed_number: "150/165",
      condition_code: "NM",
      barcode: "PUG-MEWTWO1",
      sale_price: "42.00",
      sale_currency: "USD",
      status: "available",
      location_id: 7,
      square_catalog_item_id: "SQUARE-MEWTWO-ITEM",
      square_catalog_variation_id: "SQUARE-MEWTWO-VAR",
      external_sync_state: "square_synced",
      front_image_url: "https://images.example.test/mewtwo-remote.png",
    },
    {
      public_id: pendingLocalOnlyIntake.item.public_id,
      row_version: 9,
      provider_card_id: "scrydex-pokemon-pull-guard",
      game: "pokemon",
      card_name: "Remote Should Not Overwrite",
      set_name: "Remote Set",
      condition_code: "HP",
      barcode: "PUG-PGUARD",
      sale_price: "999.99",
      sale_currency: "USD",
      status: "available",
      location_id: 7,
      front_image_url: "https://images.example.test/pull-guard-remote.png",
    },
  ]

  const pulledInventory = await fetchJson(`${baseUrl}/sync/pull`, {
    method: "POST",
    token: managerToken,
    body: {
      query: "charizard",
      page: 1,
      page_size: 10,
      domain: "inventory",
      manual_remote_authority: true,
    },
  })
  assert.equal(pulledInventory.status, "ok")
  assert.equal(pulledInventory.pulled_count, 3)
  assert.equal(pulledInventory.applied_count, 2)
  assert.equal(pulledInventory.inserted_count, 1)
  assert.equal(pulledInventory.updated_count, 1)
  assert.equal(pulledInventory.ignored_count, 1)
  assert.equal(pulledInventory.wordpress_pull_connected, true)
  assert.equal(pulledInventory.wordpress_inventory_pull_connected, true)
  assert.equal(pulledInventory.inventory_source_of_truth, "local_sync_server")
  assert.equal(pulledInventory.wordpress_inventory_pull_authority, "manual_remote_authority_only")
  assert.equal(pulledInventory.wordpress_inventory_remote_authority, true)
  assert.equal(pulledInventory.wordpress_events_pull_connected, true)
  assert.equal(pulledInventory.credentials_synced_to_client, false)
  assert.equal(wordpressInventoryPullCalls, 1)
  assert.equal(wordpressEventsPullCalls, 0)

  const pulledCharizardInventory = await fetchJson(`${baseUrl}/inventory/search?q=PUG-WP-CHARIZARD`)
  assert.equal(pulledCharizardInventory.status, "ok")
  assert.equal(pulledCharizardInventory.items.length, 1)
  assert.equal(pulledCharizardInventory.items[0].status, "available")
  assert.equal(pulledCharizardInventory.items[0].source, "cached")
  assert.equal(pulledCharizardInventory.items[0].wordpress_public_id, "wp-inventory-charizard")
  assert.equal(pulledCharizardInventory.items[0].price_minor_units, 25000)
  assert.equal(pulledCharizardInventory.items[0].image_url, "https://images.pokemontcg.io/base1/4_hires.png")
  assert.equal(pulledCharizardInventory.items[0].square_catalog_item_id, "SQUARE-ITEM-42")
  assert.equal(pulledCharizardInventory.items[0].square_catalog_variation_id, "SQUARE-VARIATION-42")
  assert.equal(pulledCharizardInventory.items[0].external_sync_state, "square_synced")

  const pulledAcceptedMewtwo = await fetchJson(`${baseUrl}/inventory/search?q=PUG-MEWTWO1`)
  assert.equal(pulledAcceptedMewtwo.status, "ok")
  assert.equal(pulledAcceptedMewtwo.items.length, 1)
  assert.equal(pulledAcceptedMewtwo.items[0].public_id, acceptedMewtwoLocalPublicId)
  assert.equal(pulledAcceptedMewtwo.items[0].wordpress_public_id, acceptedMewtwoWordPressPublicId)
  assert.equal(pulledAcceptedMewtwo.items[0].source, "accepted")
  assert.equal(pulledAcceptedMewtwo.items[0].square_catalog_variation_id, "SQUARE-MEWTWO-VAR")

  wordpressCatalogExportRows = [
    {
      provider_card_id: "scrydex-pokemon-cat-001",
      game: "pokemon",
      card_name: "Catalog Hydrated Pikachu",
      set_name: "Local Sync Export",
      set_code: "LSE",
      card_number: "1",
      market_price_minor_units: 1234,
      image_url: "https://images.example.test/catalog-pikachu.png",
      variants_json: JSON.stringify([{ provider_variant_id: "cat-001-standard", variant: "Standard" }]),
      price_points_json: JSON.stringify([{ condition_code: "NM", market_price_minor_units: 1234 }]),
    },
  ]

  const pulledCatalog = await fetchJson(`${baseUrl}/sync/pull`, {
    method: "POST",
    token: managerToken,
    body: {
      domains: ["catalog"],
      catalog_page: 2,
      catalog_page_size: 3,
    },
  })
  assert.equal(pulledCatalog.status, "ok")
  assert.equal(pulledCatalog.catalog_pulled_count, 1)
  assert.equal(pulledCatalog.catalog_applied_count, 1)
  assert.equal(pulledCatalog.catalog_inserted_count, 1)
  assert.equal(pulledCatalog.catalog_updated_count, 0)
  assert.equal(pulledCatalog.catalog_meta.page, 2)
  assert.equal(pulledCatalog.wordpress_catalog_pull_connected, true)
  assert.ok(pulledCatalog.local_reference_card_count >= 1)
  assert.equal(wordpressCatalogExportPullCalls, 1)

  const hydratedCatalogSearch = await fetchJson(`${baseUrl}/scrydex/cards/search?q=Catalog%20Hydrated&game=pokemon`, {
    token: managerToken,
  })
  assert.equal(hydratedCatalogSearch.status, "ok")
  assert.ok(
    hydratedCatalogSearch.cards.some(
      (card) => card.provider_card_id === "scrydex-pokemon-cat-001" && card.catalog_source === "wordpress_catalog_export",
    ),
    JSON.stringify(hydratedCatalogSearch.cards, null, 2),
  )

  wordpressEventPullRows = [
    {
      id: 42,
      public_id: "event-public-42",
      slug: "friday-commander-night",
      title: "Friday Commander Night",
      start_datetime: "2099-07-12T23:00:00+00:00",
      player_cap: 24,
      registered_count: 10,
      seats_remaining: 14,
      registration_status: "open",
      event_type: "commander",
      game: "magic",
      description: "Pulled from WordPress.",
    },
  ]

  const pulledEvents = await fetchJson(`${baseUrl}/sync/pull`, {
    method: "POST",
    token: managerToken,
    body: {
      domain: "events",
      page: 1,
      page_size: 10,
    },
  })
  assert.equal(pulledEvents.status, "ok")
  assert.equal(pulledEvents.events_pulled_count, 1)
  assert.equal(pulledEvents.events_applied_count, 1)
  assert.equal(pulledEvents.events_inserted_count, 1)
  assert.equal(pulledEvents.events_ignored_count, 0)
  assert.equal(pulledEvents.events[0].event_id, "event-public-42")
  assert.equal(pulledEvents.events[0].slug, "friday-commander-night")
  assert.equal(pulledEvents.events[0].registration_status, "open")
  assert.equal(pulledEvents.events[0].capacity, 24)
  assert.equal(wordpressEventsPullCalls, 1)

  const cachedEvents = await fetchJson(`${baseUrl}/events`)
  const cachedPulledEvent = cachedEvents.events.find((event) => event.event_id === "event-public-42")
  assert.equal(cachedPulledEvent.slug, "friday-commander-night")
  assert.equal(cachedPulledEvent.source, "cached")

  const staffSquarePlan = await fetchJson(`${baseUrl}/pos/square/inventory-pull-plan`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      square_location_id: "L-SANDBOX-1",
    },
    expectedStatus: 409,
  })
  assert.equal(staffSquarePlan.status, "blocked")
  assert.equal(staffSquarePlan.code, "manager_required")

  const squarePlan = await fetchJson(`${baseUrl}/pos/square/inventory-pull-plan`, {
    method: "POST",
    token: managerToken,
    body: {
      square_location_id: "L-SANDBOX-1",
      limit: 25,
    },
  })
  assert.equal(squarePlan.status, "ok")
  assert.equal(squarePlan.action, "square_pos_inventory_pull_plan")
  assert.equal(squarePlan.planner_status, "conflict")
  assert.equal(squarePlan.requires_manager_review, true)
  assert.equal(squarePlan.mapped_count, 2)
  assert.ok(squarePlan.unresolved_count > 0)
  assert.equal(squarePlan.request_plan.path, "/v2/inventory/counts/batch-retrieve")
  assert.deepEqual(squarePlan.request_plan.body.catalog_object_ids.sort(), ["SQUARE-MEWTWO-VAR", "SQUARE-VARIATION-42"])
  assert.deepEqual(squarePlan.request_plan.body.location_ids, ["L-SANDBOX-1"])
  assert.equal(squarePlan.mapping_summary.ready_for_square_pull_count, 2)
  assert.equal(squarePlan.mapping_summary.ready_available_count, 2)
  assert.ok(squarePlan.mapping_summary.review_count > 0)
  assert.equal(squarePlan.mapping_summary.square_inventory_authority, "tcg_store_platform")
  assert.equal(squarePlan.mapping_summary.square_counts_used_for, "pos_reconciliation_and_exception_detection")
  const squareFeedByBarcode = Object.fromEntries(squarePlan.square_pull_feed.map((row) => [row.barcode, row]))
  assert.equal(squareFeedByBarcode["PUG-WP-CHARIZARD"].card_name, "Charizard")
  assert.equal(squareFeedByBarcode["PUG-WP-CHARIZARD"].expected_serialized_quantity, "1")
  assert.equal(squareFeedByBarcode["PUG-MEWTWO1"].card_name, "Mewtwo")
  assert.ok(
    squarePlan.review_items.some((item) =>
      item.errors.includes("square_catalog_variation_id_required_for_inventory_pull"),
    ),
  )
  assert.ok(
    squarePlan.next_actions.some((action) =>
      action.includes("Map POS-visible website inventory to Square catalog variations"),
    ),
  )
  assert.match(squarePlan.generated_at_utc, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(squarePlan.plugin_square_payment_capture_supported, false)
  assert.equal(squarePlan.credentials_synced_to_client, false)

  const staffSquareReconciliation = await fetchJson(`${baseUrl}/pos/square/inventory-counts/reconcile`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      square_location_id: "L-SANDBOX-1",
      counts: [],
    },
    expectedStatus: 409,
  })
  assert.equal(staffSquareReconciliation.status, "blocked")
  assert.equal(staffSquareReconciliation.code, "manager_required")

  const squareCountReconciliation = await fetchJson(`${baseUrl}/pos/square/inventory-counts/reconcile`, {
    method: "POST",
    token: managerToken,
    body: {
      square_location_id: "L-SANDBOX-1",
      counts: [
        {
          catalog_object_id: "SQUARE-VARIATION-42",
          location_id: "L-SANDBOX-1",
          quantity: "2",
          state: "IN_STOCK",
        },
        {
          catalog_object_id: "SQUARE-MEWTWO-VAR",
          location_id: "L-SANDBOX-1",
          quantity: "1",
          state: "IN_STOCK",
        },
        {
          catalog_object_id: "SQUARE-UNEXPECTED-99",
          location_id: "L-SANDBOX-1",
          quantity: "1",
          state: "IN_STOCK",
        },
      ],
    },
  })
  assert.equal(squareCountReconciliation.status, "ok")
  assert.equal(squareCountReconciliation.action, "square_pos_inventory_count_reconciliation")
  assert.equal(squareCountReconciliation.reconciliation_status, "conflict")
  assert.equal(squareCountReconciliation.requires_manager_review, true)
  assert.equal(squareCountReconciliation.summary.mismatched_count, 1)
  assert.equal(squareCountReconciliation.summary.unexpected_square_count, 1)
  assert.ok(squareCountReconciliation.summary.unresolved_mapping_count > 0)
  const mismatchedSquareCount = squareCountReconciliation.comparisons.find(
    (comparison) => comparison.issue_label === "Count mismatch",
  )
  assert.ok(mismatchedSquareCount)
  assert.equal(mismatchedSquareCount.expected_serialized_quantity, "1")
  assert.equal(mismatchedSquareCount.actual_square_quantity, "2")
  assert.equal(squareCountReconciliation.unexpected_square_counts[0].catalogObjectId, "SQUARE-UNEXPECTED-99")
  assert.equal(squareCountReconciliation.provider_inventory_write_deferred, true)
  assert.equal(squareCountReconciliation.square_payment_capture_supported, false)
  assert.equal(squareCountReconciliation.credentials_synced_to_client, false)
  assert.ok(
    squareCountReconciliation.next_actions.some((action) =>
      action.includes("Review Square count mismatches"),
    ),
  )

  const preservedPendingIntake = await fetchJson(`${baseUrl}/inventory/search?q=PUG-PGUARD`)
  assert.equal(preservedPendingIntake.items[0].status, "pending_intake")
  assert.equal(preservedPendingIntake.items[0].source, "queued")
  assert.equal(preservedPendingIntake.items[0].card_name, "Local Only Pull Guard")
  assert.equal(preservedPendingIntake.items[0].image_url, "https://images.example.test/pull-guard-local.png")

  const locationInventory = await fetchJson(`${baseUrl}/inventory/search?q=WordPress Location 7`)
  assert.equal(locationInventory.status, "ok")
  assert.ok(locationInventory.items.some((item) => item.barcode === "PUG-WP-CHARIZARD"))

  const conditionInventory = await fetchJson(`${baseUrl}/inventory/search?q=LP`)
  assert.equal(conditionInventory.status, "ok")
  assert.ok(conditionInventory.items.some((item) => item.condition === "LP"))

  const inventory = await fetchJson(`${baseUrl}/inventory/search?q=charizard`)
  assert.equal(inventory.status, "ok")
  assert.ok(inventory.items.length >= 2)
  assert.ok(inventory.items.some((item) => item.barcode === "PUG-WP-CHARIZARD" && item.status === "available"))

  const reserve = await fetchJson(`${baseUrl}/inventory/reservations`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      inventory_public_id: inventory.items[0].public_id,
      hold_reason: "staff counter hold",
    },
  })

  assert.equal(reserve.status, "ok")
  assert.equal(reserve.item.status, "reserved")
  assert.equal(reserve.wordpress_acceptance_required, true)

  const duplicateReservation = await fetchJson(`${baseUrl}/inventory/reservations`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      inventory_public_id: inventory.items[0].public_id,
      hold_reason: "second counter hold",
    },
    expectedStatus: 409,
  })

  assert.equal(duplicateReservation.status, "blocked")
  assert.equal(duplicateReservation.code, "inventory_unavailable")

  const kioskInventory = await fetchJson(`${baseUrl}/inventory/search?q=pikachu`)
  const kioskOrder = await fetchJson(`${baseUrl}/kiosk/orders`, {
    method: "POST",
    body: {
      first_name: "Ada",
      last_name: "Lovelace",
      inventory_public_ids: [kioskInventory.items[0].public_id],
    },
  })

  assert.equal(kioskOrder.status, "ok")
  assert.equal(kioskOrder.order.status, "queued")
  assert.equal(kioskOrder.reservations.length, 1)

  const staffAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1234" },
  })
  assert.equal(staffAuth.status, "ok")
  assert.ok(staffAuth.user.access.includes("Kiosk"))
  assert.ok(staffAuth.user.access.includes("Customers"))
  assert.ok(staffAuth.user.access.includes("Events"))

  const staffSalesReport = await fetchJson(`${baseUrl}/reports/sales?channel=square_pos&staff_user_id=22`, {
    token: staffAuth.session.token,
    expectedStatus: 409,
  })
  assert.equal(staffSalesReport.status, "blocked")
  assert.equal(staffSalesReport.code, "manager_required")
  assertNoSecrets(staffSalesReport)

  const sharedKioskQueue = await fetchJson(`${baseUrl}/kiosk/orders?limit=10`, {
    token: staffAuth.session.token,
  })
  assert.equal(sharedKioskQueue.status, "ok")
  assert.equal(sharedKioskQueue.shared_queue_source, "local_sync_server")
  assert.equal(sharedKioskQueue.order_count, 1)
  assert.equal(sharedKioskQueue.orders[0].order_id, kioskOrder.order.order_id)
  assert.equal(sharedKioskQueue.orders[0].customer_name, "Ada Lovelace")
  assert.equal(sharedKioskQueue.orders[0].item_count, 1)
  assert.equal(sharedKioskQueue.orders[0].items[0].card_name, "Pikachu")
  assert.equal(sharedKioskQueue.orders[0].items[0].barcode, "PUG-000002")
  assert.equal(sharedKioskQueue.credentials_synced_to_client, false)

  const kioskStatusUpdate = await fetchJson(`${baseUrl}/kiosk/orders/${kioskOrder.order.order_id}/status`, {
    method: "PATCH",
    token: staffAuth.session.token,
    body: {
      status: "pulling",
    },
  })
  assert.equal(kioskStatusUpdate.status, "ok")
  assert.equal(kioskStatusUpdate.order.status, "pulling")
  assert.equal(kioskStatusUpdate.inventory_mutation_performed, false)
  assert.equal(kioskStatusUpdate.wordpress_status_sync_deferred, true)

  const refreshedKioskQueue = await fetchJson(`${baseUrl}/kiosk/orders`, {
    token: staffAuth.session.token,
  })
  assert.equal(refreshedKioskQueue.orders[0].status, "pulling")

  const eventList = await fetchJson(`${baseUrl}/events`)
  assert.equal(eventList.status, "ok")
  assert.equal(eventList.wordpress_event_authority, true)
  assert.ok(eventList.events.some((event) => event.event_id === "event-100"))

  const blockedEventRegistration = await fetchJson(`${baseUrl}/events/registrations`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      event_id: "event-100",
      attendee_label: "No Event Access",
      payment_status: "not_required",
    },
    expectedStatus: 409,
  })
  assert.equal(blockedEventRegistration.status, "blocked")
  assert.equal(blockedEventRegistration.code, "workspace_access_required")

  const eventRegistration = await fetchJson(`${baseUrl}/events/registrations`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      event_id: "event-100",
      attendee_label: "Local Event Guest",
      payment_status: "pay_at_store",
    },
  })
  assert.equal(eventRegistration.status, "ok")
  assert.equal(eventRegistration.registration.status, "queued")
  assert.equal(eventRegistration.registration.registration_status, "registered")
  assert.equal(eventRegistration.registration.payment_status, "pay_at_store")
  assert.equal(eventRegistration.event.registered_count, 11)
  assert.equal(eventRegistration.event.source, "queued")
  assert.equal(eventRegistration.wordpress_acceptance_required, true)

  const eventCheckin = await fetchJson(`${baseUrl}/events/check-ins`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      event_id: "event-100",
      attendee_label: "Local Event Guest",
      registration_public_id: "registration-event-100-local-event-guest",
      checkin_method: "manual_lookup",
    },
  })
  assert.equal(eventCheckin.status, "ok")
  assert.equal(eventCheckin.checkin.status, "queued")
  assert.equal(eventCheckin.checkin.registration_public_id, "registration-event-100-local-event-guest")
  assert.equal(eventCheckin.event.source, "queued")
  assert.equal(eventCheckin.wordpress_acceptance_required, true)

  const pushedEventRegistration = await fetchJson(`${baseUrl}/sync/push`, {
    method: "POST",
    token: managerToken,
  })
  assert.equal(pushedEventRegistration.status, "ok")
  assert.equal(pushedEventRegistration.operation_count, 5)
  assert.equal(pushedEventRegistration.accepted_count, 3)
  assert.equal(pushedEventRegistration.retry_count, 1)
  assert.equal(pushedEventRegistration.unsupported_operation_count, 1)
  assert.equal(pushedEventRegistration.wordpress_inventory_push_connected, true)
  assert.equal(pushedEventRegistration.wordpress_event_registration_push_connected, true)
  assert.equal(pushedEventRegistration.wordpress_event_checkin_push_connected, true)
  assert.equal(pushedEventRegistration.wordpress_kiosk_order_push_connected, true)
  assert.equal(wordpressEventRegistrationPushCalls, 1)
  assert.equal(wordpressEventCheckinPushCalls, 1)
  assert.equal(wordpressInventoryPushCalls, 4)
  assert.equal(wordpressKioskOrderPushCalls, 1)
  assert.ok(
    pushedEventRegistration.results.some(
      (result) => result.operation_type === "event_registration" && result.status === "accepted",
    ),
  )
  assert.ok(
    pushedEventRegistration.results.some(
      (result) => result.operation_type === "event_checkin" && result.status === "accepted",
    ),
  )
  assert.ok(
    pushedEventRegistration.results.some(
      (result) =>
        result.operation_type === "inventory_intake" &&
        result.status === "retry" &&
        result.code === "wordpress_inventory_push_fixture_unavailable",
    ),
  )
  assert.ok(
    pushedEventRegistration.results.some(
      (result) => result.operation_type === "kiosk_order" && result.status === "accepted",
    ),
  )

  const acceptedEvents = await fetchJson(`${baseUrl}/events`)
  const acceptedEvent = acceptedEvents.events.find((event) => event.event_id === "event-100")
  assert.equal(acceptedEvent.source, "accepted")

  const squareSale = await fetchJson(`${baseUrl}/pos/square/sales/finalize`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      barcodes: ["PUG-WP-CHARIZARD"],
      square_receipt_reference: "SQ-SALE-CHARIZARD-25000",
      square_order_id: "SQ-ORDER-CHARIZARD",
      sale_total_minor_units: 25000,
    },
  })
  assert.equal(squareSale.status, "ok")
  assert.equal(squareSale.action, "square_pos_sale_finalized")
  assert.equal(squareSale.finalized_count, 1)
  assert.equal(squareSale.items[0].barcode, "PUG-WP-CHARIZARD")
  assert.equal(squareSale.items[0].status, "sold")
  assert.equal(squareSale.items[0].source, "accepted")
  assert.equal(squareSale.items[0].external_sync_state, "synced")
  assert.equal(squareSale.operations[0].operation_type, "square_pos_sale")
  assert.equal(squareSale.square_receipt_reference, "SQ-SALE-CHARIZARD-25000")
  assert.equal(squareSale.wordpress_acceptance_required, true)
  assert.equal(squareSale.wordpress_auto_sync_performed, true)
  assert.equal(squareSale.wordpress_accepted_count, 1)
  assert.equal(squareSale.wordpress_retry_count, 0)
  assert.equal(squareSale.auto_sync_results.length, 1)
  assert.equal(squareSale.auto_sync_results[0].status, "accepted")
  assert.equal(squareSale.square_payment_capture_supported, false)
  assert.equal(squareSale.payment_capture_authority, "official_woocommerce_square_extension")
  assert.equal(wordpressInventorySalePushCalls, 1)

  const pushedSquareSale = await fetchJson(`${baseUrl}/sync/push`, {
    method: "POST",
    token: managerToken,
  })
  assert.equal(pushedSquareSale.status, "ok")
  assert.equal(pushedSquareSale.operation_count, 1)
  assert.equal(pushedSquareSale.accepted_count, 0)
  assert.equal(pushedSquareSale.retry_count, 1)
  assert.equal(pushedSquareSale.unsupported_operation_count, 1)
  assert.equal(pushedSquareSale.wordpress_inventory_sale_push_connected, true)
  assert.equal(wordpressInventorySalePushCalls, 1)
  assert.ok(
    pushedSquareSale.results.some(
      (result) =>
        result.operation_type === "inventory_intake" &&
        result.status === "retry" &&
        result.code === "wordpress_inventory_push_fixture_unavailable",
    ),
  )

  const soldInventory = await fetchJson(`${baseUrl}/inventory/search?q=PUG-WP-CHARIZARD`)
  assert.equal(soldInventory.status, "ok")
  assert.equal(soldInventory.items[0].status, "sold")
  assert.equal(soldInventory.items[0].source, "accepted")
  assert.equal(soldInventory.items[0].external_sync_state, "synced")

  const customerSearch = await fetchJson(`${baseUrl}/customers/search?q=morgan`)
  assert.equal(customerSearch.status, "ok")
  assert.equal(customerSearch.wordpress_ledger_authority, true)
  assert.equal(customerSearch.customers[0].display_name, "Morgan Lee")

  const createdCustomer = await fetchJson(`${baseUrl}/customers`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      first_name: "Local",
      last_name: "Customer",
      email: "local.customer@example.test",
    },
  })
  assert.equal(createdCustomer.status, "ok")
  assert.equal(createdCustomer.customer.display_name, "Local Customer")
  assert.equal(createdCustomer.customer.credit.balance_minor_units, 0)
  assert.equal(createdCustomer.wordpress_acceptance_required, true)

  const staffCreditAdjustment = await fetchJson(`${baseUrl}/credit/adjustments`, {
    method: "POST",
    token: staffAuth.session.token,
    expectedStatus: 409,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 3000,
      reason: "staff local-store credit add",
    },
  })
  assert.equal(staffCreditAdjustment.status, "blocked")
  assert.equal(staffCreditAdjustment.code, "manager_credit_add_required")

  const staffThresholdCreditAdjustment = await fetchJson(`${baseUrl}/credit/adjustments`, {
    method: "POST",
    token: staffAuth.session.token,
    expectedStatus: 409,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 2000,
      reason: "employee adjustment within configured limit",
    },
  })
  assert.equal(staffThresholdCreditAdjustment.status, "blocked")
  assert.equal(staffThresholdCreditAdjustment.code, "manager_credit_add_required")

  const creditAdjustment = await fetchJson(`${baseUrl}/credit/adjustments`, {
    method: "POST",
    token: managerToken,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 3000,
      reason: "manager-approved store credit",
    },
  })
  assert.equal(creditAdjustment.status, "ok")
  assert.equal(creditAdjustment.manager_approved, true)
  assert.equal(creditAdjustment.customer.credit.balance_minor_units, 3000)
  assert.equal(creditAdjustment.ledger_entry.status, "pending_sync")
  assert.equal(creditAdjustment.ledger_entry.balance_before_minor_units, 0)
  assert.equal(creditAdjustment.ledger_entry.balance_after_minor_units, 3000)
  assert.equal(creditAdjustment.ledger_entry.staff_user_id, managerAuth.user.id)
  assert.equal(creditAdjustment.ledger_entry.staff_user_name, managerAuth.user.name)
  assert.equal(creditAdjustment.ledger_entry.reference_id, "manual-credit-adjustment")
  assert.equal(creditAdjustment.ledger_entry.line_items[0].type, "credit_given")
  assert.equal(creditAdjustment.ledger_entry.line_items[0].amount_minor_units, 3000)

  const creditRedemption = await fetchJson(`${baseUrl}/credit/redemptions`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 1000,
      sale_total_minor_units: 4500,
      square_receipt_reference: "SQ-TEST-4500",
      square_cashier_confirmed: true,
      reason: "Square handoff credit use",
    },
  })
  assert.equal(creditRedemption.status, "ok")
  assert.equal(creditRedemption.customer.credit.balance_minor_units, 2000)
  assert.equal(creditRedemption.square_payment_capture_supported, false)
  assert.equal(creditRedemption.square_handoff.square_payment_method_label, "Pug Store Credit")
  assert.equal(creditRedemption.square_handoff.square_amount_due_minor_units, 3500)
  assert.equal(creditRedemption.square_handoff.square_receipt_reference, "SQ-TEST-4500")
  assert.equal(creditRedemption.square_handoff.square_cashier_confirmed, true)
  assert.equal(creditRedemption.ledger_entry.balance_before_minor_units, 3000)
  assert.equal(creditRedemption.ledger_entry.balance_after_minor_units, 2000)
  assert.equal(creditRedemption.ledger_entry.staff_user_id, staffAuth.user.id)
  assert.equal(creditRedemption.ledger_entry.staff_user_name, staffAuth.user.name)
  assert.equal(creditRedemption.ledger_entry.reference_id, "SQ-TEST-4500")
  assert.equal(creditRedemption.ledger_entry.line_items[0].type, "credit_used")
  assert.equal(creditRedemption.ledger_entry.line_items[0].square_receipt_reference, "SQ-TEST-4500")

  const pushedCustomerAndCredit = await fetchJson(`${baseUrl}/sync/push`, {
    method: "POST",
    token: managerToken,
  })
  assert.equal(pushedCustomerAndCredit.status, "ok")
  assert.equal(pushedCustomerAndCredit.operation_count, 4)
  assert.equal(pushedCustomerAndCredit.accepted_count, 3)
  assert.equal(pushedCustomerAndCredit.retry_count, 1)
  assert.equal(pushedCustomerAndCredit.wordpress_customer_push_connected, true)
  assert.equal(pushedCustomerAndCredit.wordpress_credit_push_connected, true)
  assert.equal(wordpressCustomerUpsertPushCalls, 1)
  assert.equal(wordpressCreditPushCalls, 2)
  assert.ok(
    pushedCustomerAndCredit.results.some(
      (result) =>
        result.operation_type === "inventory_intake" &&
        result.status === "retry" &&
        result.code === "wordpress_inventory_push_fixture_unavailable",
    ),
  )
  assert.ok(
    pushedCustomerAndCredit.results.some(
      (result) => result.operation_type === "customer_upsert" && result.status === "accepted",
    ),
  )
  assert.ok(
    pushedCustomerAndCredit.results.filter(
      (result) =>
        ["credit_adjustment", "credit_redemption"].includes(result.operation_type) && result.status === "accepted",
    ).length === 2,
  )

  const acceptedCustomerSearch = await fetchJson(`${baseUrl}/customers/search?q=local.customer`)
  const acceptedCustomer = acceptedCustomerSearch.customers.find(
    (customer) => customer.customer_public_id === createdCustomer.customer.customer_public_id,
  )
  assert.equal(acceptedCustomer.customer_id, 501)
  assert.equal(acceptedCustomer.source, "accepted")
  assert.equal(acceptedCustomer.credit.balance_minor_units, 2000)
  assert.equal(
    acceptedCustomerSearch.credit_ledger_entries.filter(
      (entry) => entry.customer_public_id === createdCustomer.customer.customer_public_id && entry.status === "accepted",
    ).length,
    2,
  )

  const overspendRedemption = await fetchJson(`${baseUrl}/credit/redemptions`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 10000,
      sale_total_minor_units: 10000,
      square_receipt_reference: "SQ-OVERSPEND-10000",
      square_cashier_confirmed: true,
      reason: "overspend should be blocked",
    },
    expectedStatus: 409,
  })
  assert.equal(overspendRedemption.status, "blocked")
  assert.equal(overspendRedemption.code, "insufficient_credit")

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)
  assert.equal(syncStatus.status, "ok")
  assert.equal(syncStatus.persistence_mode, "sqlite")
  assert.equal(syncStatus.local_operations_preserved, true)
  assert.ok(syncStatus.queue_depth >= 1)
  assert.equal(syncStatus.queue_summary.pending_count, syncStatus.queue_depth)
  assert.ok(Array.isArray(syncStatus.queue_summary.items))
  assert.ok(syncStatus.reference_card_count >= 6)
  assert.ok(syncStatus.customer_count >= 4)
  assert.ok(syncStatus.credit_ledger_entry_count >= 5)
  assert.ok(syncStatus.event_count >= 2)
  assert.equal(syncStatus.client_presence_enabled, true)
  assert.equal(syncStatus.client_device_count, 2)
  assert.equal(syncStatus.online_client_device_count, 1)
  assert.equal(syncStatus.offline_client_device_count, 1)
  assert.equal(syncStatus.setup_ready_client_device_count, 1)
  assert.equal(syncStatus.setup_required_client_device_count, 1)
  assert.deepEqual(syncStatus.scrydex_lookup_order, ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"])
  assert.equal(syncStatus.scrydex_fallback_connected, true)
  assert.equal(syncStatus.graded_pricing_provider_connected, true)
  assert.equal(syncStatus.graded_pricing_primary_source, "pricecharting")
  assert.equal(syncStatus.graded_pricing_fallback_source, "scrydex_reference_cache")
  assert.equal(syncStatus.wordpress_pull_connected, true)
  assert.equal(syncStatus.wordpress_inventory_pull_connected, true)
  assert.equal(syncStatus.wordpress_events_pull_connected, true)
  assert.equal(syncStatus.wordpress_push_connected, true)
  assert.equal(syncStatus.wordpress_inventory_push_connected, true)
  assert.equal(syncStatus.wordpress_inventory_sale_push_connected, true)
  assert.equal(syncStatus.wordpress_event_registration_push_connected, true)
  assert.equal(syncStatus.wordpress_event_checkin_push_connected, true)
  assert.equal(syncStatus.wordpress_customer_push_connected, true)
  assert.equal(syncStatus.wordpress_credit_push_connected, true)
  assert.equal(syncStatus.wordpress_kiosk_order_push_connected, true)
  assert.equal(syncStatus.wordpress_reports_pull_connected, true)
  assert.equal(wordpressReportsPullCalls, 1)

  console.log("PASS local sync server runtime")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

async function fetchJson(url, options = {}) {
  const headers = {
    "content-type": "application/json",
  }

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await response.json()
  const expectedStatus = options.expectedStatus ?? 200

  assert.equal(response.status, expectedStatus, `${url} returned ${response.status}: ${JSON.stringify(body)}`)

  return body
}

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value)

  assert.equal(serialized.includes("pinHash"), false)
  assert.equal(serialized.includes("pinSalt"), false)
  assert.equal(serialized.includes('"pin":'), false)
  assert.equal(serialized.includes('"raw_pin"'), false)
  assert.equal(serialized.includes('"pin_hash"'), false)
  assert.equal(serialized.includes('"pin_salt"'), false)
  assert.equal(serialized.includes("api_key"), false)
  assert.equal(serialized.includes("X-Api-Key"), false)
  assert.equal(serialized.includes("private_key"), false)
}
