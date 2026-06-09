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

export function inventoryIntakeBody(item = {}, options = {}) {
  const priceMinorUnits = boundedMinorUnits(item.price_minor_units)
  const locationId = positiveInt(item.location_id ?? options.defaultLocationId)
  const activeLocationConfigured = locationId !== null

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
    condition_code: cleanText(item.condition || "RAW"),
    barcode: cleanBarcode(item.barcode),
    sku: cleanBarcode(item.barcode),
    sale_currency: "USD",
    minimum_sale_price_minor_units: priceMinorUnits,
    sale_price_minor_units: priceMinorUnits,
    market_price_minor_units: priceMinorUnits,
    online_visibility: cleanVisibility(item.online_visibility, options.defaultOnlineVisibility ?? "visible"),
    kiosk_visibility: cleanVisibility(item.kiosk_visibility, options.defaultKioskVisibility ?? "visible"),
    pos_visibility: cleanVisibility(item.pos_visibility, options.defaultPosVisibility ?? "visible"),
    front_image_remote_url: cleanHttpUrl(item.image_url),
    back_image_remote_url: cleanHttpUrl(item.back_image_url),
    staff_notes: cleanText(`Queued from LAN sync server location: ${item.location ?? "Intake Queue"}`),
  }

  if (activeLocationConfigured) {
    body.location_id = locationId
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
  const game = String(value ?? "pokemon").trim()

  return ["pokemon", "magic", "lorcana", "one-piece"].includes(game) ? game : "pokemon"
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

function cleanBarcode(value) {
  return cleanText(value).replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 191)
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
