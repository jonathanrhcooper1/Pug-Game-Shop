import { randomUUID } from "node:crypto"

const SQUARE_PRODUCTION_BASE_URL = "https://connect.squareup.com"
const SQUARE_SANDBOX_BASE_URL = "https://connect.squareupsandbox.com"

export function createSquareTerminalConnector(options = {}) {
  const environment = cleanSquareEnvironment(options.environment)
  const accessToken = cleanSecret(options.accessToken)
  const locationId = cleanExternalId(options.locationId)
  const terminalDeviceId = cleanExternalId(options.terminalDeviceId)
  const apiVersion = cleanApiVersion(options.apiVersion)
  const baseUrl = cleanBaseUrl(options.baseUrl) || squareBaseUrl(environment)
  const fetchImpl = options.fetchImpl ?? globalThis.fetch

  const tokenConfigured = accessToken !== ""
  const locationConfigured = locationId !== ""
  const deviceConfigured = terminalDeviceId !== ""
  const fetchConfigured = typeof fetchImpl === "function"

  function status() {
    return {
      status: "ok",
      action: "square_terminal_status",
      environment,
      configured: tokenConfigured && locationConfigured,
      token_configured: tokenConfigured,
      location_configured: locationConfigured,
      terminal_device_configured: deviceConfigured,
      can_create_device_code: tokenConfigured && locationConfigured && fetchConfigured,
      can_create_terminal_checkout: tokenConfigured && locationConfigured && deviceConfigured && fetchConfigured,
      payment_capture_supported: tokenConfigured && locationConfigured && deviceConfigured && fetchConfigured,
      device_pairing_required: tokenConfigured && locationConfigured && !deviceConfigured,
      checkout_endpoint: "/v2/terminals/checkouts",
      device_code_endpoint: "/v2/devices/codes",
      square_payment_authority: "square_terminal_api",
      pug_credit_balance_authority: "wordpress_customer_credit_ledger",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function createDeviceCode(input = {}) {
    const currentStatus = status()

    if (!currentStatus.can_create_device_code) {
      return blocked(
        "square_terminal_not_configured",
        "Set PUG_SQUARE_ACCESS_TOKEN and PUG_SQUARE_LOCATION_ID on the LAN server before activating a Square reader.",
        { square_terminal: currentStatus },
      )
    }

    const deviceName = cleanDeviceName(input.device_name ?? input.deviceName) || "The Pug Counter Reader"
    const idempotencyKey = cleanIdempotencyKey(input.idempotency_key ?? input.idempotencyKey) || randomUUID()
    const body = {
      idempotency_key: idempotencyKey,
      device_code: {
        name: deviceName,
        product_type: "TERMINAL_API",
        location_id: locationId,
      },
    }

    const result = await squareRequest("/v2/devices/codes", body)

    if (result.status !== "ok") {
      return result
    }

    const deviceCode = publicDeviceCode(result.payload?.device_code)

    return {
      status: "ok",
      action: "square_terminal_device_code_created",
      device_code: deviceCode,
      pairing_instruction:
        "Enter this device code on the Square Terminal reader. After the reader is paired, set PUG_SQUARE_TERMINAL_DEVICE_ID on the LAN server.",
      provider_request_performed: true,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function createCheckout(input = {}) {
    const currentStatus = status()

    if (!currentStatus.can_create_terminal_checkout) {
      return blocked(
        "square_terminal_not_configured",
        "Set PUG_SQUARE_ACCESS_TOKEN, PUG_SQUARE_LOCATION_ID, and PUG_SQUARE_TERMINAL_DEVICE_ID on the LAN server before sending checkout to the Square reader.",
        { square_terminal: currentStatus },
      )
    }

    const amount = Math.max(0, Number.parseInt(String(input.amount_minor_units ?? input.amountMinorUnits ?? 0), 10))
    const currency = cleanCurrency(input.currency)

    if (!Number.isFinite(amount) || amount <= 0) {
      return blocked("square_terminal_amount_required", "A positive checkout amount is required.")
    }

    const idempotencyKey = cleanIdempotencyKey(input.idempotency_key ?? input.idempotencyKey) || randomUUID()
    const referenceId = cleanExternalId(input.reference_id ?? input.referenceId)
    const note = cleanNote(input.note)
    const body = {
      idempotency_key: idempotencyKey,
      checkout: {
        amount_money: {
          amount,
          currency,
        },
        device_options: {
          device_id: terminalDeviceId,
        },
      },
    }

    if (referenceId) {
      body.checkout.reference_id = referenceId
    }

    if (note) {
      body.checkout.note = note
    }

    const result = await squareRequest("/v2/terminals/checkouts", body)

    if (result.status !== "ok") {
      return result
    }

    return {
      status: "ok",
      action: "square_terminal_checkout_created",
      square_checkout: publicTerminalCheckout(result.payload?.checkout),
      provider_request_performed: true,
      payment_capture_started_on_reader: true,
      pug_credit_balance_authority: "wordpress_customer_credit_ledger",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function squareRequest(path, body) {
    let response
    let payload

    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": apiVersion,
        },
        body: JSON.stringify(body),
      })
      payload = await response.json().catch(() => ({}))
    } catch (error) {
      return blocked(
        "square_terminal_request_failed",
        error instanceof Error ? error.message : "Square Terminal request failed.",
        {
          provider_request_performed: true,
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        },
      )
    }

    if (!response.ok) {
      return blocked(
        "square_terminal_rejected",
        squareErrorMessage(payload) || `Square Terminal returned HTTP ${response.status}.`,
        {
          http_status: response.status,
          errors: publicSquareErrors(payload),
          provider_request_performed: true,
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        },
      )
    }

    return {
      status: "ok",
      payload,
    }
  }

  return {
    status,
    createDeviceCode,
    createCheckout,
  }
}

function blocked(code, message, extra = {}) {
  return {
    status: "blocked",
    code,
    message,
    ...extra,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

function publicTerminalCheckout(checkout = {}) {
  return {
    id: cleanExternalId(checkout.id),
    status: cleanExternalId(checkout.status),
    reference_id: cleanExternalId(checkout.reference_id),
    note: cleanNote(checkout.note),
    amount_money: {
      amount: Math.max(0, Number.parseInt(String(checkout.amount_money?.amount ?? 0), 10)),
      currency: cleanCurrency(checkout.amount_money?.currency),
    },
    device_id: cleanExternalId(checkout.device_options?.device_id),
    payment_ids: Array.isArray(checkout.payment_ids)
      ? checkout.payment_ids.map(cleanExternalId).filter(Boolean)
      : [],
    created_at: cleanTimestamp(checkout.created_at),
    updated_at: cleanTimestamp(checkout.updated_at),
  }
}

function publicDeviceCode(deviceCode = {}) {
  return {
    id: cleanExternalId(deviceCode.id),
    code: cleanDeviceCode(deviceCode.code),
    name: cleanDeviceName(deviceCode.name),
    product_type: cleanExternalId(deviceCode.product_type),
    location_id: cleanExternalId(deviceCode.location_id),
    status: cleanExternalId(deviceCode.status),
    created_at: cleanTimestamp(deviceCode.created_at),
    paired_at: cleanTimestamp(deviceCode.paired_at),
  }
}

function publicSquareErrors(payload = {}) {
  const errors = Array.isArray(payload.errors) ? payload.errors : []

  return errors.slice(0, 5).map((error) => ({
    category: cleanExternalId(error.category),
    code: cleanExternalId(error.code),
    detail: cleanNote(error.detail),
  }))
}

function squareErrorMessage(payload = {}) {
  const firstError = Array.isArray(payload.errors) ? payload.errors[0] : null

  return cleanNote(firstError?.detail)
}

function squareBaseUrl(environment) {
  return environment === "production" ? SQUARE_PRODUCTION_BASE_URL : SQUARE_SANDBOX_BASE_URL
}

function cleanSquareEnvironment(value) {
  const normalized = String(value ?? "").trim().toLowerCase()

  return normalized === "production" ? "production" : "sandbox"
}

function cleanCurrency(value) {
  const currency = String(value ?? "USD").trim().toUpperCase().replace(/[^A-Z]/g, "")

  return currency.length === 3 ? currency : "USD"
}

function cleanSecret(value) {
  return String(value ?? "").trim()
}

function cleanApiVersion(value) {
  const version = String(value ?? "2026-05-21").trim()

  return /^\d{4}-\d{2}-\d{2}$/.test(version) ? version : "2026-05-21"
}

function cleanBaseUrl(value) {
  const text = String(value ?? "").trim().replace(/\/+$/, "")

  return /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(text) ? text : ""
}

function cleanExternalId(value) {
  return String(value ?? "").trim().replace(/[^\w:./# -]+/g, "").slice(0, 128)
}

function cleanIdempotencyKey(value) {
  return String(value ?? "").trim().replace(/[^\w-]+/g, "").slice(0, 64)
}

function cleanDeviceName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 64)
}

function cleanDeviceCode(value) {
  return String(value ?? "").trim().replace(/[^A-Za-z0-9-]+/g, "").slice(0, 32)
}

function cleanNote(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 256)
}

function cleanTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ""))

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : ""
}
