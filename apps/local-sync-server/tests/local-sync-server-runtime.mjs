import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

let websiteCatalogFallbackCalls = 0
let wordpressInventoryPullCalls = 0
let wordpressInventoryPushCalls = 0
let wordpressEventRegistrationPushCalls = 0
let wordpressCustomerUpsertPushCalls = 0
let wordpressCreditPushCalls = 0
let wordpressKioskOrderPushCalls = 0
let wordpressInventoryPullRows = []

const server = createLocalSyncHttpServer({
  storeOptions: {
    databasePath: ":memory:",
    websiteCatalogFallback: async ({ query, game, limit }) => {
      websiteCatalogFallbackCalls += 1

      assert.equal(query, "moonbreon")
      assert.equal(game, "pokemon")
      assert.equal(limit, 8)

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
            observed_at: "2026-06-08T16:00:00.000Z",
          },
        ],
      }
    },
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
    wordpressInventoryPush: async ({ operation, item }) => {
      wordpressInventoryPushCalls += 1

      assert.equal(operation.operation_type, "inventory_intake")
      assert.ok(["Mewtwo", "Local Only Pull Guard"].includes(item.card_name))
      assert.equal(item.status, "pending_intake")
      assert.equal(item.source, "queued")
      assert.match(item.image_url, /mewtwo|pull-guard-local/)

      return {
        status: "ok",
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
    body: { pin: "2468" },
  })

  assert.equal(cashierAuth.status, "ok")
  assert.equal(cashierAuth.user.name, "Test Cashier")
  assert.deepEqual(cashierAuth.user.access, ["Inventory", "Kiosk", "Queue", "Status"])

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

  const fallbackScryDexSearch = await fetchJson(`${baseUrl}/scrydex/cards/search?q=moonbreon`, {
    token: cashierAuth.session.token,
  })

  assert.equal(fallbackScryDexSearch.status, "ok")
  assert.equal(fallbackScryDexSearch.cards.length, 1)
  assert.equal(fallbackScryDexSearch.cards[0].provider_card_id, "scrydex-pokemon-evs-215")
  assert.equal(fallbackScryDexSearch.cards[0].card_name, "Umbreon VMAX")
  assert.equal(fallbackScryDexSearch.cards[0].set_name, "Evolving Skies")
  assert.equal(fallbackScryDexSearch.cards[0].suggested_barcode, "PKM-EVS-215-MOONBREON")
  assert.equal(fallbackScryDexSearch.cards[0].market_price_minor_units, 112045)
  assert.equal(fallbackScryDexSearch.cards[0].image_url, "https://images.pokemontcg.io/swsh7/215.png")
  assert.equal(fallbackScryDexSearch.source, "wordpress_proxy")
  assert.equal(fallbackScryDexSearch.local_reference_cache_hit, false)
  assert.equal(fallbackScryDexSearch.wordpress_proxy_performed, true)
  assert.equal(fallbackScryDexSearch.wordpress_proxy_required, false)
  assert.equal(fallbackScryDexSearch.live_provider_request_performed, true)
  assert.equal(websiteCatalogFallbackCalls, 1)
  assertNoSecrets(fallbackScryDexSearch)

  const cachedFallbackScryDexSearch = await fetchJson(`${baseUrl}/scrydex/cards/search?q=moonbreon`, {
    token: cashierAuth.session.token,
  })

  assert.equal(cachedFallbackScryDexSearch.status, "ok")
  assert.equal(cachedFallbackScryDexSearch.source, "wordpress_catalog_cache")
  assert.equal(cachedFallbackScryDexSearch.local_reference_cache_hit, true)
  assert.equal(cachedFallbackScryDexSearch.wordpress_proxy_performed, false)
  assert.equal(cachedFallbackScryDexSearch.live_provider_request_performed, false)
  assert.equal(cachedFallbackScryDexSearch.cards[0].provider_card_id, "scrydex-pokemon-evs-215")
  assert.equal(websiteCatalogFallbackCalls, 1)
  assertNoSecrets(cachedFallbackScryDexSearch)

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
      barcode: "PUG-SMOKE-MEWTWO",
      price_minor_units: 4200,
      location: "Intake Bin",
      quantity: 2,
      provider_card_id: "scrydex-pokemon-test-mewtwo",
      game: "pokemon",
      set_code: "BASE",
      card_number: "10",
      printed_number: "10/102",
      image_url: "https://images.example.test/mewtwo.png",
    },
  })
  assert.equal(intake.status, "ok")
  assert.equal(intake.quantity_added, 2)
  assert.equal(intake.items.length, 2)
  assert.equal(intake.item.card_name, "Mewtwo")
  assert.equal(intake.item.provider_card_id, "scrydex-pokemon-test-mewtwo")
  assert.equal(intake.item.printed_number, "10/102")
  assert.equal(intake.item.image_url, "https://images.example.test/mewtwo.png")
  assert.equal(intake.item.barcode, "PUG-SMOKE-MEWTWO-01")
  assert.equal(intake.item.status, "pending_intake")
  assert.equal(intake.item.source, "queued")
  assert.equal(intake.wordpress_acceptance_required, true)

  const duplicateIntake = await fetchJson(`${baseUrl}/inventory/intake`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      card_name: "Duplicate Mewtwo",
      barcode: "PUG-SMOKE-MEWTWO-01",
      price_minor_units: 4200,
    },
    expectedStatus: 409,
  })
  assert.equal(duplicateIntake.status, "blocked")
  assert.equal(duplicateIntake.code, "duplicate_barcode")

  const blockedPush = await fetchJson(`${baseUrl}/sync/push`, {
    method: "POST",
    token: cashierAuth.session.token,
    expectedStatus: 409,
  })
  assert.equal(blockedPush.status, "blocked")
  assert.equal(blockedPush.code, "workspace_access_required")

  const pushedIntake = await fetchJson(`${baseUrl}/sync/push`, {
    method: "POST",
    token: managerToken,
  })
  assert.equal(pushedIntake.status, "ok")
  assert.equal(pushedIntake.operation_count, 2)
  assert.equal(pushedIntake.accepted_count, 2)
  assert.equal(pushedIntake.retry_count, 0)
  assert.equal(pushedIntake.rejected_count, 0)
  assert.equal(pushedIntake.unsupported_operation_count, 1)
  assert.equal(pushedIntake.wordpress_push_connected, true)
  assert.equal(pushedIntake.credentials_synced_to_client, false)
  assert.equal(pushedIntake.local_queue_depth, 1)
  assert.equal(wordpressInventoryPushCalls, 2)
  assert.ok(pushedIntake.results.every((result) => result.status === "accepted"))

  const acceptedIntakeInventory = await fetchJson(`${baseUrl}/inventory/search?q=mewtwo`)
  assert.equal(acceptedIntakeInventory.status, "ok")
  assert.equal(acceptedIntakeInventory.items.length, 2)
  assert.equal(acceptedIntakeInventory.items[0].status, "available")
  assert.equal(acceptedIntakeInventory.items[0].source, "accepted")
  assert.equal(acceptedIntakeInventory.items[0].image_url, "https://images.example.test/mewtwo.png")

  const pendingLocalOnlyIntake = await fetchJson(`${baseUrl}/inventory/intake`, {
    method: "POST",
    token: cashierAuth.session.token,
    body: {
      card_name: "Local Only Pull Guard",
      set_name: "Preview Set",
      condition: "NM",
      barcode: "PUG-PULL-GUARD",
      price_minor_units: 1200,
      location: "Intake Bin",
      quantity: 1,
      provider_card_id: "scrydex-pokemon-pull-guard",
      game: "pokemon",
      set_code: "TEST",
      card_number: "99",
      printed_number: "99/100",
      image_url: "https://images.example.test/pull-guard-local.png",
    },
  })
  assert.equal(pendingLocalOnlyIntake.status, "ok")

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
      front_image_url: "https://images.pokemontcg.io/base1/4_hires.png",
    },
    {
      public_id: pendingLocalOnlyIntake.item.public_id,
      row_version: 9,
      provider_card_id: "scrydex-pokemon-pull-guard",
      game: "pokemon",
      card_name: "Remote Should Not Overwrite",
      set_name: "Remote Set",
      condition_code: "HP",
      barcode: "PUG-PULL-GUARD",
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
    },
  })
  assert.equal(pulledInventory.status, "ok")
  assert.equal(pulledInventory.pulled_count, 2)
  assert.equal(pulledInventory.applied_count, 1)
  assert.equal(pulledInventory.inserted_count, 1)
  assert.equal(pulledInventory.ignored_count, 1)
  assert.equal(pulledInventory.wordpress_pull_connected, true)
  assert.equal(pulledInventory.credentials_synced_to_client, false)
  assert.equal(wordpressInventoryPullCalls, 1)

  const pulledCharizardInventory = await fetchJson(`${baseUrl}/inventory/search?q=PUG-WP-CHARIZARD`)
  assert.equal(pulledCharizardInventory.status, "ok")
  assert.equal(pulledCharizardInventory.items.length, 1)
  assert.equal(pulledCharizardInventory.items[0].status, "available")
  assert.equal(pulledCharizardInventory.items[0].source, "cached")
  assert.equal(pulledCharizardInventory.items[0].price_minor_units, 25000)
  assert.equal(pulledCharizardInventory.items[0].image_url, "https://images.pokemontcg.io/base1/4_hires.png")

  const preservedPendingIntake = await fetchJson(`${baseUrl}/inventory/search?q=PUG-PULL-GUARD`)
  assert.equal(preservedPendingIntake.items[0].status, "pending_intake")
  assert.equal(preservedPendingIntake.items[0].source, "queued")
  assert.equal(preservedPendingIntake.items[0].card_name, "Local Only Pull Guard")
  assert.equal(preservedPendingIntake.items[0].image_url, "https://images.example.test/pull-guard-local.png")

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
  assert.ok(staffAuth.user.access.includes("Customers"))
  assert.ok(staffAuth.user.access.includes("Events"))

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
  assert.equal(pushedEventRegistration.operation_count, 4)
  assert.equal(pushedEventRegistration.accepted_count, 3)
  assert.equal(pushedEventRegistration.retry_count, 0)
  assert.equal(pushedEventRegistration.unsupported_operation_count, 3)
  assert.equal(pushedEventRegistration.wordpress_inventory_push_connected, true)
  assert.equal(pushedEventRegistration.wordpress_event_registration_push_connected, true)
  assert.equal(pushedEventRegistration.wordpress_kiosk_order_push_connected, true)
  assert.equal(wordpressEventRegistrationPushCalls, 1)
  assert.equal(wordpressInventoryPushCalls, 3)
  assert.equal(wordpressKioskOrderPushCalls, 1)
  assert.ok(
    pushedEventRegistration.results.some(
      (result) => result.operation_type === "event_registration" && result.status === "accepted",
    ),
  )
  assert.ok(
    pushedEventRegistration.results.some(
      (result) => result.operation_type === "inventory_intake" && result.status === "accepted",
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
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 3000,
      reason: "staff should not add credit",
    },
    expectedStatus: 409,
  })
  assert.equal(staffCreditAdjustment.status, "blocked")
  assert.equal(staffCreditAdjustment.code, "manager_required")

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

  const creditRedemption = await fetchJson(`${baseUrl}/credit/redemptions`, {
    method: "POST",
    token: staffAuth.session.token,
    body: {
      customer_public_id: createdCustomer.customer.customer_public_id,
      amount_minor_units: 1000,
      sale_total_minor_units: 4500,
      reason: "Square handoff credit use",
    },
  })
  assert.equal(creditRedemption.status, "ok")
  assert.equal(creditRedemption.customer.credit.balance_minor_units, 2000)
  assert.equal(creditRedemption.square_payment_capture_supported, false)
  assert.equal(creditRedemption.square_handoff.square_payment_method_label, "Pug Store Credit")
  assert.equal(creditRedemption.square_handoff.square_amount_due_minor_units, 3500)

  const pushedCustomerAndCredit = await fetchJson(`${baseUrl}/sync/push`, {
    method: "POST",
    token: managerToken,
  })
  assert.equal(pushedCustomerAndCredit.status, "ok")
  assert.equal(pushedCustomerAndCredit.operation_count, 3)
  assert.equal(pushedCustomerAndCredit.accepted_count, 3)
  assert.equal(pushedCustomerAndCredit.retry_count, 0)
  assert.equal(pushedCustomerAndCredit.wordpress_customer_push_connected, true)
  assert.equal(pushedCustomerAndCredit.wordpress_credit_push_connected, true)
  assert.equal(wordpressCustomerUpsertPushCalls, 1)
  assert.equal(wordpressCreditPushCalls, 2)
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
  assert.ok(syncStatus.queue_depth >= 3)
  assert.ok(syncStatus.reference_card_count >= 6)
  assert.ok(syncStatus.customer_count >= 4)
  assert.ok(syncStatus.credit_ledger_entry_count >= 5)
  assert.ok(syncStatus.event_count >= 2)
  assert.deepEqual(syncStatus.scrydex_lookup_order, ["local_reference_cache", "wordpress_catalog_proxy", "scrydex_provider"])
  assert.equal(syncStatus.scrydex_fallback_connected, true)
  assert.equal(syncStatus.wordpress_pull_connected, true)
  assert.equal(syncStatus.wordpress_push_connected, true)
  assert.equal(syncStatus.wordpress_inventory_push_connected, true)
  assert.equal(syncStatus.wordpress_event_registration_push_connected, true)
  assert.equal(syncStatus.wordpress_customer_push_connected, true)
  assert.equal(syncStatus.wordpress_credit_push_connected, true)
  assert.equal(syncStatus.wordpress_kiosk_order_push_connected, true)

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
  assert.equal(serialized.includes("1234"), false)
  assert.equal(serialized.includes("9999"), false)
  assert.equal(serialized.includes("1420"), false)
  assert.equal(serialized.includes("2468"), false)
  assert.equal(serialized.includes("api_key"), false)
  assert.equal(serialized.includes("X-Api-Key"), false)
  assert.equal(serialized.includes("private_key"), false)
}
