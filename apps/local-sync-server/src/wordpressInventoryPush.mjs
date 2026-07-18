import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressInventoryPush(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)
  const defaultLocationId = positiveInt(options.defaultLocationId)
  const defaultOnlineVisibility = cleanVisibility(options.defaultOnlineVisibility, "visible")
  const defaultKioskVisibility = cleanVisibility(options.defaultKioskVisibility, "visible")
  const defaultPosVisibility = cleanVisibility(options.defaultPosVisibility, "visible")
  const autoPublishWooCommerceProducts = options.autoPublishWooCommerceProducts !== false

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressInventoryPush({ operation, item } = {}) {
    const endpoint = new URL(`${endpointBase}/inventory`)
    const body = inventoryIntakeBody(item, {
      defaultLocationId,
      defaultOnlineVisibility,
      defaultKioskVisibility,
      defaultPosVisibility,
      autoPublishWooCommerceProducts,
    })
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: authorizationHeader,
          "content-type": "application/json",
          "idempotency-key": String(operation?.operation_id ?? item?.public_id ?? ""),
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      })
      const responseBody = await safeJson(response)

      if (!response?.ok || responseBody?.status !== "created") {
        return {
          status: "blocked",
          code: "wordpress_inventory_push_rejected",
          http_status: Number(response?.status ?? 0),
          wordpress_code: String(responseBody?.code ?? ""),
          message: "WordPress inventory create rejected this queued intake item.",
          errors: Array.isArray(responseBody?.errors) ? responseBody.errors : [],
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      return {
        status: "ok",
        code: "wordpress_inventory_item_created",
        http_status: Number(response.status ?? 201),
        wordpress_code: String(responseBody.code ?? "inventory_item_created"),
        inventory: inventoryCreateResponseData(responseBody),
        woocommerce_product_sync: woocommerceProductSyncResponse(responseBody),
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_inventory_push_unavailable",
        message: error instanceof Error ? error.message : "WordPress inventory push unavailable.",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }
}

export function createWordPressInventoryUpdatePush(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressInventoryUpdatePush({ operation, item } = {}) {
    const identity = inventoryUpdateIdentity(item, operation)

    if (!identity) {
      return {
        status: "blocked",
        code: "wordpress_inventory_update_identity_required",
        message: "WordPress public inventory ID is required before updating an existing inventory row.",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    }

    const endpoint = new URL(`${endpointBase}/inventory/${encodeURIComponent(identity)}`)
    const body = inventoryUpdateBody(operation, item)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "PUT",
        headers: {
          accept: "application/json",
          authorization: authorizationHeader,
          "content-type": "application/json",
          "idempotency-key": String(operation?.operation_id ?? item?.public_id ?? ""),
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      })
      const responseBody = await safeJson(response)

      if (!response?.ok || responseBody?.status !== "updated") {
        return {
          status: "blocked",
          code: "wordpress_inventory_update_rejected",
          http_status: Number(response?.status ?? 0),
          wordpress_code: String(responseBody?.code ?? ""),
          message: "WordPress rejected this inventory update.",
          errors: Array.isArray(responseBody?.errors) ? responseBody.errors : [],
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      return {
        status: "ok",
        code: "wordpress_inventory_item_updated",
        http_status: Number(response.status ?? 200),
        wordpress_code: String(responseBody.code ?? "inventory_item_updated"),
        inventory: inventoryUpdateResponseData(responseBody),
        woocommerce_product_sync: woocommerceProductSyncResponse(responseBody),
        square_payment_capture_supported: false,
        payment_capture_authority: "official_woocommerce_square_extension",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_inventory_update_unavailable",
        message: error instanceof Error ? error.message : "WordPress inventory update unavailable.",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }
}

export function createWordPressInventorySalePush(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressInventorySalePush({ operation, item } = {}) {
    const identity = inventorySaleIdentity(item, operation)

    if (!identity) {
      return {
        status: "blocked",
        code: "wordpress_inventory_sale_identity_required",
        message: "WordPress public inventory ID is required before marking a Square POS sale sold.",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    }

    const endpoint = new URL(`${endpointBase}/inventory/${encodeURIComponent(identity)}/mark-sold`)
    const body = inventorySaleBody(operation, item)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: authorizationHeader,
          "content-type": "application/json",
          "idempotency-key": String(operation?.operation_id ?? item?.public_id ?? ""),
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      })
      const responseBody = await safeJson(response)

      if (!response?.ok || responseBody?.status !== "sold") {
        return {
          status: "blocked",
          code: "wordpress_inventory_sale_rejected",
          http_status: Number(response?.status ?? 0),
          wordpress_code: String(responseBody?.code ?? ""),
          message: "WordPress rejected this Square POS sale inventory finalization.",
          errors: Array.isArray(responseBody?.errors) ? responseBody.errors : [],
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      return {
        status: "ok",
        code: "wordpress_inventory_item_marked_sold",
        http_status: Number(response.status ?? 200),
        wordpress_code: String(responseBody.code ?? "inventory_item_marked_sold"),
        inventory: inventorySaleResponseData(responseBody),
        woocommerce_product_sync: woocommerceProductSyncResponse(responseBody),
        square_payment_capture_supported: false,
        payment_capture_authority: "official_woocommerce_square_extension",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_inventory_sale_unavailable",
        message: error instanceof Error ? error.message : "WordPress inventory sale push unavailable.",
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }
}

export function inventoryIntakeBody(item = {}, options = {}) {
  const priceMinorUnits = roundSalePriceMinorUnits(item.price_minor_units)
  const minimumSalePriceMinorUnits = roundSalePriceMinorUnits(item.minimum_sale_price_minor_units ?? priceMinorUnits)
  const marketPriceMinorUnits = boundedMinorUnits(item.market_price_minor_units ?? item.auto_price_minor_units ?? priceMinorUnits)
  const locationId = positiveInt(item.location_id ?? options.defaultLocationId)
  const actorUserId = positiveInt(item.created_by_user_id ?? item.actor_user_id)
  const actorLabel = cleanText(item.created_by_user_name || item.actor_name || item.created_by_user_id || "Unknown staff")
  const activeLocationConfigured = locationId !== null
  const onlineVisibility = cleanVisibility(item.online_visibility, options.defaultOnlineVisibility ?? "visible")
  const shouldPublishWooCommerce =
    options.autoPublishWooCommerceProducts !== false && onlineVisibility === "visible"

  const body = {
    source: "offline",
    game: cleanGame(item.game),
    card_name: cleanText(item.card_name),
    set_name: cleanText(item.set_name),
    set_code: cleanText(item.set_code),
    card_number: cleanText(item.card_number),
    printed_number: cleanText(item.printed_number),
    provider_name: item.provider_card_id ? "scrydex" : "",
    provider_card_id: cleanText(item.provider_card_id),
    reference_variant_id: positiveInt(item.reference_variant_id) ?? undefined,
    provider_variant_id: cleanText(item.provider_variant_id),
    variant: cleanText(item.variant),
    finish: cleanText(item.finish),
    language: cleanText(item.language || "EN"),
    status: activeLocationConfigured ? "available" : "pending_intake",
    raw_or_graded: cleanRawOrGraded(item.raw_or_graded),
    grading_company: cleanText(item.grading_company),
    grade: cleanText(item.grade),
    cert_number: cleanText(item.cert_number),
    condition_code: cleanText(item.condition || "RAW"),
    barcode: cleanBarcode(item.barcode),
    sku: cleanBarcode(item.barcode),
    sale_currency: "USD",
    minimum_sale_price_minor_units: minimumSalePriceMinorUnits,
    sale_price_minor_units: priceMinorUnits,
    market_price_minor_units: marketPriceMinorUnits,
    online_visibility: onlineVisibility,
    kiosk_visibility: cleanVisibility(item.kiosk_visibility, options.defaultKioskVisibility ?? "visible"),
    pos_visibility: cleanVisibility(item.pos_visibility, options.defaultPosVisibility ?? "visible"),
    square_catalog_item_id: cleanText(item.square_catalog_item_id),
    square_catalog_variation_id: cleanText(item.square_catalog_variation_id),
    square_location_id: cleanText(item.square_location_id),
    front_image_remote_url: cleanHttpUrl(item.image_url),
    back_image_remote_url: cleanHttpUrl(item.back_image_url),
    staff_notes: cleanText(`Queued from LAN sync server by ${actorLabel}; location: ${item.location ?? "Intake Queue"}`),
    sync_woocommerce_product: shouldPublishWooCommerce,
  }

  if (actorUserId !== null) {
    body.actor_user_id = actorUserId
  }

  if (activeLocationConfigured) {
    body.location_id = locationId
  }

  if (shouldPublishWooCommerce) {
    body.production_write_approval = "woocommerce-product-sync"
  }

  return body
}

function inventoryCreateResponseData(body) {
  const data = body?.data && typeof body.data === "object" ? body.data : {}

  return {
    public_id: String(data.public_id ?? ""),
    sku: String(data.sku ?? ""),
    barcode: String(data.barcode ?? ""),
    status: String(data.status ?? ""),
    price_change_log_persisted: Boolean(data.price_change_log_persisted),
    square_catalog_item_id: cleanText(data.square_catalog_item_id),
    square_catalog_variation_id: cleanText(data.square_catalog_variation_id),
    square_location_id: cleanText(data.square_location_id),
  }
}

function woocommerceProductSyncResponse(body) {
  const meta = body?.meta && typeof body.meta === "object" ? body.meta : {}
  const projections = meta.projections && typeof meta.projections === "object" ? meta.projections : {}
  const sync =
    projections.woocommerce_product_sync && typeof projections.woocommerce_product_sync === "object"
      ? projections.woocommerce_product_sync
      : meta.woocommerce_product_sync && typeof meta.woocommerce_product_sync === "object"
        ? meta.woocommerce_product_sync
        : {}

  return {
    requested: Boolean(sync.requested),
    synced: Boolean(sync.synced),
    status: String(sync.status ?? (sync.requested ? "unknown" : "deferred")),
    product_ids: Array.isArray(sync.execution?.product_ids)
      ? sync.execution.product_ids
          .map((value) => positiveInt(value))
          .filter((value) => value !== null)
      : [],
    errors: Array.isArray(sync.errors) ? sync.errors.map((value) => String(value)) : [],
    execution: safeWooCommerceExecution(sync.execution),
    payment_capture_deferred: sync.payment_capture_deferred !== false,
    square_inventory_deferred: sync.square_inventory_deferred !== false,
  }
}

function safeWooCommerceExecution(value) {
  if (!value || typeof value !== "object") {
    return {
      status: "",
      operation_results: [],
      write_request_code: "",
    }
  }

  return {
    status: String(value.status ?? ""),
    projection_code: String(value.projection_code ?? ""),
    write_request_code: String(value.woocommerce_write_request_code ?? ""),
    operation_results: Array.isArray(value.operation_results)
      ? value.operation_results.map((row) => safeWooCommerceOperationResult(row))
      : [],
  }
}

function safeWooCommerceOperationResult(value) {
  if (!value || typeof value !== "object") {
    return {}
  }

  return {
    status: String(value.status ?? ""),
    code: String(value.code ?? ""),
    operation: String(value.operation ?? ""),
    product_id: positiveInt(value.product_id),
    failure_type: String(value.failure_type ?? ""),
    failure_code: String(value.failure_code ?? ""),
    failure_reason: String(value.failure_reason ?? ""),
  }
}

function inventorySaleIdentity(item = {}, operation = {}) {
  return cleanPublicIdentity(
    item.wordpress_public_id ??
      operation.payload?.wordpress_public_id ??
      operation.payload?.inventory_public_id ??
      item.public_id ??
      operation.entity_id,
  )
}

function inventoryUpdateIdentity(item = {}, operation = {}) {
  return cleanPublicIdentity(
    item.wordpress_public_id ??
      operation.payload?.wordpress_public_id ??
      operation.payload?.inventory_public_id ??
      item.public_id ??
      operation.entity_id,
  )
}

function inventoryUpdateBody(operation = {}, item = {}) {
  const payload = operation.payload && typeof operation.payload === "object" ? operation.payload : {}
  const priceMinorUnits = roundSalePriceMinorUnits(payload.price_minor_units ?? item.price_minor_units)
  const minimumSalePriceMinorUnits = roundSalePriceMinorUnits(
    payload.minimum_sale_price_minor_units ?? item.minimum_sale_price_minor_units ?? priceMinorUnits,
  )
  const quantityOnHand = nonNegativeInteger(
    payload.quantity_on_hand ?? item.quantity_on_hand ?? (cleanInventoryStatus(payload.status ?? item.status) === "available" ? 1 : 0),
  )

  return {
    source: "offline",
    status: cleanInventoryStatus(payload.status ?? item.status),
    barcode: cleanBarcode(payload.barcode ?? item.barcode),
    sku: cleanBarcode(payload.barcode ?? item.barcode),
    sale_currency: "USD",
    minimum_sale_price_minor_units: minimumSalePriceMinorUnits,
    sale_price_minor_units: priceMinorUnits,
    pricing_source: cleanText(payload.pricing_source ?? item.pricing_source),
    quantity_on_hand: quantityOnHand,
    set_quantity: quantityOnHand,
    online_visibility: cleanVisibility(payload.online_visibility ?? item.online_visibility, "visible"),
    kiosk_visibility: cleanVisibility(payload.kiosk_visibility ?? item.kiosk_visibility, "visible"),
    pos_visibility: cleanVisibility(payload.pos_visibility ?? item.pos_visibility, "visible"),
    square_catalog_item_id: cleanText(item.square_catalog_item_id),
    square_catalog_variation_id: cleanText(item.square_catalog_variation_id),
    square_location_id: cleanText(item.square_location_id),
    staff_notes: cleanText(
      `Updated from LAN sync server by ${payload.actor_name || item.updated_by_user_name || payload.actor_id || "Unknown staff"}; reason: ${payload.reason || "staff inventory update"}; location: ${payload.location || item.location || "Inventory"}`,
    ),
    updated_by_user_id: cleanText(payload.actor_id ?? item.updated_by_user_id),
    sync_woocommerce_product: true,
    production_write_approval: "woocommerce-product-sync",
  }
}

function inventoryUpdateResponseData(body) {
  const data = body?.data && typeof body.data === "object" ? body.data : {}

  return {
    inventory_id: positiveInt(data.inventory_id),
    public_id: String(data.public_id ?? ""),
    sku: String(data.sku ?? ""),
    barcode: String(data.barcode ?? ""),
    status: String(data.status ?? ""),
    row_version: positiveInt(data.row_version),
    sale_price: String(data.sale_price ?? ""),
    sale_currency: String(data.sale_currency ?? "USD"),
    square_catalog_item_id: cleanText(data.square_catalog_item_id),
    square_catalog_variation_id: cleanText(data.square_catalog_variation_id),
    square_location_id: cleanText(data.square_location_id),
    price_change_log_persisted: Boolean(data.price_change_log_persisted),
  }
}

function inventorySaleBody(operation = {}, item = {}) {
  const payload = operation.payload && typeof operation.payload === "object" ? operation.payload : {}

  return {
    source: "square_pos",
    barcode: cleanBarcode(item.barcode ?? payload.barcode),
    square_receipt_reference: cleanText(
      payload.square_receipt_reference ??
        payload.square_ticket_reference ??
        payload.square_order_id ??
        payload.external_order_id,
    ),
    square_order_id: cleanText(payload.square_order_id ?? payload.external_order_id),
    square_cashier_confirmed: true,
    sale_total_minor_units: boundedMinorUnits(payload.sale_total_minor_units),
    sale_price_minor_units: boundedMinorUnits(payload.sale_price_minor_units ?? item.price_minor_units),
    sold_by_user_id: cleanText(payload.actor_id ?? payload.sold_by_user_id),
    sync_woocommerce_product: true,
    production_write_approval: "woocommerce-product-sync",
  }
}

function inventorySaleResponseData(body) {
  const data = body?.data && typeof body.data === "object" ? body.data : {}

  return {
    inventory_id: positiveInt(data.inventory_id),
    public_id: String(data.public_id ?? ""),
    sku: String(data.sku ?? ""),
    barcode: String(data.barcode ?? ""),
    previous_status: String(data.previous_status ?? ""),
    status: String(data.status ?? ""),
    date_sold: String(data.date_sold ?? ""),
    row_version: positiveInt(data.row_version),
    woocommerce_product_id: positiveInt(data.woocommerce_product_id),
    square_receipt_reference: String(data.square_receipt_reference ?? ""),
  }
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function secretSafeEndpoint(endpoint) {
  const safe = new URL(endpoint.toString())
  safe.searchParams.delete("token")
  safe.searchParams.delete("key")
  safe.searchParams.delete("api_key")

  return safe.toString()
}

function boundedMinorUnits(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10)

  return Number.isFinite(parsed) ? Math.max(0, Math.min(99_999_999, parsed)) : 0
}

function nonNegativeInteger(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10)

  return Number.isFinite(parsed) ? Math.max(0, Math.min(999999, parsed)) : 0
}

function roundSalePriceMinorUnits(value) {
  const amount = boundedMinorUnits(value)

  if (amount <= 100 || amount % 100 === 0) {
    return amount
  }

  return Math.ceil(amount / 100) * 100
}

function positiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function cleanRawOrGraded(value) {
  const rawOrGraded = String(value ?? "").trim().toLowerCase()

  return ["raw", "graded"].includes(rawOrGraded) ? rawOrGraded : "raw"
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "10000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 10000
}

function cleanGame(value) {
  const game = String(value ?? "pokemon").trim().toLowerCase()
  const aliases = {
    magic: "magicthegathering",
    mtg: "magicthegathering",
    "magic-the-gathering": "magicthegathering",
    onepiece: "onepiece",
    one_piece: "onepiece",
    "one-piece": "onepiece",
    "one-piece-card-game": "onepiece",
  }
  const normalizedGame = aliases[game] ?? game

  return ["pokemon", "magicthegathering", "lorcana", "onepiece"].includes(normalizedGame)
    ? normalizedGame
    : "pokemon"
}

function cleanText(value) {
  return String(value ?? "").trim().slice(0, 255)
}

function cleanVisibility(value, fallback) {
  const visibility = String(value ?? "").trim().toLowerCase()
  const fallbackVisibility = String(fallback ?? "visible").trim().toLowerCase()

  if (["hidden", "visible", "staff_only"].includes(visibility)) {
    return visibility
  }

  return ["hidden", "visible", "staff_only"].includes(fallbackVisibility) ? fallbackVisibility : "visible"
}

function cleanInventoryStatus(value) {
  const status = String(value ?? "").trim().toLowerCase()

  if (status === "conflict") {
    return "return_review"
  }

  return ["available", "reserved", "sold", "pending_intake", "return_review", "damaged", "removed"].includes(status)
    ? status
    : "available"
}

function cleanBarcode(value) {
  return cleanText(value)
    .toUpperCase()
    .replace(/[^0-9A-Z ./$+%-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

function cleanPublicIdentity(value) {
  return cleanText(value)
    .replace(/[^a-zA-Z0-9-_:.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96)
}

function cleanHttpUrl(value) {
  const raw = String(value ?? "").trim()

  if (!raw) {
    return ""
  }

  try {
    const parsed = new URL(raw)

    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : ""
  } catch {
    return ""
  }
}
