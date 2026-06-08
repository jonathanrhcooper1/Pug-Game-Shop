import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressCustomerUpsertPush(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressCustomerUpsertPush({ operation } = {}) {
    const body = customerUpsertBody(operation)

    if (!body.customer_public_id || (!body.display_name && !body.email)) {
      return {
        status: "blocked",
        code: "wordpress_customer_payload_invalid",
        message: "Queued customer upsert is missing a local customer ID plus name or email.",
        errors: ["customer_identity_required"],
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    }

    const endpoint = new URL(`${endpointBase}/customers`)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: authorizationHeader,
          "content-type": "application/json",
          "idempotency-key": String(operation?.operation_id ?? body.customer_public_id),
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      })
      const responseBody = await safeJson(response)
      const data = responseBody?.data && typeof responseBody.data === "object" ? responseBody.data : {}
      const customer = data.customer && typeof data.customer === "object" ? data.customer : {}

      if (!response?.ok || data.accepted !== true || !positiveInt(customer.customer_id)) {
        return {
          status: "blocked",
          code: "wordpress_customer_push_rejected",
          http_status: Number(response?.status ?? 0),
          wordpress_code: String(data?.code ?? responseBody?.error?.code ?? ""),
          message: "WordPress customer endpoint rejected this queued customer upsert.",
          errors: Array.isArray(responseBody?.error?.details?.errors) ? responseBody.error.details.errors : [],
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      return {
        status: "ok",
        code: "wordpress_customer_upserted",
        http_status: Number(response.status ?? 201),
        wordpress_code: String(data.code ?? "customer_upserted"),
        customer: customerResponseData(customer, data),
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_customer_push_unavailable",
        message: error instanceof Error ? error.message : "WordPress customer push unavailable.",
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

export function customerUpsertBody(operation = {}) {
  const payload = operation?.payload && typeof operation.payload === "object" ? operation.payload : {}
  const customer = payload.customer && typeof payload.customer === "object" ? payload.customer : {}
  const credit = customer.credit && typeof customer.credit === "object" ? customer.credit : {}

  return {
    customer_public_id: cleanId(customer.customer_public_id ?? operation.entity_id),
    display_name: cleanText(customer.display_name),
    first_name: cleanText(customer.first_name),
    last_name: cleanText(customer.last_name),
    email: cleanEmail(customer.email ?? customer.customer_lookup),
    credit_currency: cleanCurrency(credit.currency),
    status: cleanStatus(customer.status),
    source: "offline_lan_sync",
  }
}

function customerResponseData(customer, data) {
  return {
    customer_id: positiveInt(customer.customer_id) ?? 0,
    public_id: cleanId(customer.public_id),
    display_name: cleanText(customer.display_name),
    first_name: cleanText(customer.first_name),
    last_name: cleanText(customer.last_name),
    email: cleanEmail(customer.email),
    status: cleanStatus(customer.status),
    row_version: positiveInt(customer.row_version) ?? 1,
    credit: {
      balance_minor_units: moneyToMinorUnits(customer.credit_balance),
      currency: cleanCurrency(customer.credit_currency),
    },
    accepted: true,
    idempotent: Boolean(data.idempotent),
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

function moneyToMinorUnits(value) {
  const normalized = String(value ?? "0").trim()

  if (!/^-?\d+(\.\d{1,4})?$/.test(normalized)) {
    return 0
  }

  const negative = normalized.startsWith("-")
  const unsigned = normalized.replace(/^-/, "")
  const [whole, decimal = ""] = unsigned.split(".")
  const cents = Number.parseInt(decimal.padEnd(2, "0").slice(0, 2), 10) || 0
  const minorUnits = Number.parseInt(whole, 10) * 100 + cents

  return negative ? -minorUnits : minorUnits
}

function positiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function cleanStatus(value) {
  const status = String(value ?? "active").trim().toLowerCase()

  return ["active", "inactive"].includes(status) ? status : "active"
}

function cleanCurrency(value) {
  const currency = String(value ?? "USD").trim().toUpperCase()

  return /^[A-Z]{3}$/.test(currency) ? currency : "USD"
}

function cleanEmail(value) {
  const email = String(value ?? "").trim().toLowerCase().slice(0, 191)

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 191)
}

function cleanId(value) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 191)
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "10000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 10000
}
