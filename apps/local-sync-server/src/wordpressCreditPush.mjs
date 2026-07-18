import {
  catalogAuthorizationHeader,
  normalizeWordPressCatalogBaseUrl,
} from "./wordpressCatalogFallback.mjs"

export function createWordPressCreditPush(options = {}) {
  const endpointBase = normalizeWordPressCatalogBaseUrl(options.websiteUrl, options.restBasePath)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedTimeout(options.timeoutMs)
  const authorizationHeader = catalogAuthorizationHeader(options)

  if (!endpointBase || typeof fetcher !== "function" || !authorizationHeader) {
    return null
  }

  return async function wordpressCreditPush({ operation } = {}) {
    const body = creditPostingBody(operation)
    const customerId = positiveInt(
      operation?.payload?.customer?.wordpress_customer_id ??
        operation?.payload?.customer?.customer_id ??
        operation?.payload?.customer?.id,
    )
    const action = operation?.operation_type === "credit_redemption" ? "redeem" : "adjust"

    if (!customerId) {
      return {
        status: "blocked",
        code: "wordpress_customer_id_required",
        message: "Queued credit operations require an existing WordPress customer ID.",
        errors: ["wordpress_customer_id_required"],
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    }

    if (!body.amount || !body.reason) {
      return {
        status: "blocked",
        code: "wordpress_credit_payload_invalid",
        message: "Queued credit operation is missing an amount or reason.",
        errors: ["amount_or_reason_required"],
        credentials_synced_to_client: false,
        authorization_header_printed: false,
      }
    }

    const endpoint = new URL(`${endpointBase}/customers/${customerId}/credit/${action}`)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: authorizationHeader,
          "content-type": "application/json",
          "idempotency-key": String(operation?.operation_id ?? body.offline_operation_id),
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      })
      const responseBody = await safeJson(response)
      const data = responseBody?.data && typeof responseBody.data === "object" ? responseBody.data : {}

      if (!response?.ok || data.accepted !== true) {
        return {
          status: "blocked",
          code: "wordpress_credit_push_rejected",
          http_status: Number(response?.status ?? 0),
          wordpress_code: String(data?.code ?? responseBody?.error?.code ?? ""),
          message: "WordPress customer credit endpoint rejected this queued operation.",
          errors: Array.isArray(responseBody?.error?.details?.errors) ? responseBody.error.details.errors : [],
          credentials_synced_to_client: false,
          authorization_header_printed: false,
          endpoint: secretSafeEndpoint(endpoint),
        }
      }

      return {
        status: "ok",
        code: "wordpress_credit_posted",
        http_status: Number(response.status ?? 201),
        wordpress_code: String(data.code ?? "posted"),
        credit: {
          accepted: true,
          idempotent: Boolean(data.idempotent),
          customer_id: positiveInt(data.customer_id) ?? customerId,
          ledger_entry_id: positiveInt(data.ledger_entry_id) ?? 0,
          balance_after: data.balance_after ?? null,
        },
        credentials_synced_to_client: false,
        authorization_header_printed: false,
        endpoint: secretSafeEndpoint(endpoint),
      }
    } catch (error) {
      return {
        status: "blocked",
        code: "wordpress_credit_push_unavailable",
        message: error instanceof Error ? error.message : "WordPress customer credit push unavailable.",
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

export function creditPostingBody(operation = {}) {
  const payload = operation?.payload && typeof operation.payload === "object" ? operation.payload : {}
  const ledger = payload.ledger_entry && typeof payload.ledger_entry === "object" ? payload.ledger_entry : {}
  const customer = payload.customer && typeof payload.customer === "object" ? payload.customer : {}
  const amountMinorUnits = Number.parseInt(String(ledger.amount_minor_units ?? "0"), 10)

  return {
    amount: moneyFromMinorUnits(amountMinorUnits),
    currency: cleanCurrency(ledger.currency ?? customer.credit?.currency),
    reason: cleanText(ledger.reason ?? ""),
    offline_operation_id: cleanId(operation.operation_id ?? ledger.entry_id),
    metadata: {
      source: "offline_lan_sync",
      local_entry_id: cleanId(ledger.entry_id),
      customer_public_id: cleanId(customer.customer_public_id),
      local_entry_type: cleanText(ledger.entry_type ?? ""),
      square_handoff_mode: cleanText(payload.square_handoff?.square_handoff_mode ?? ""),
      square_receipt_reference: cleanText(payload.square_handoff?.square_receipt_reference ?? ""),
      square_cashier_confirmed: payload.square_handoff?.square_cashier_confirmed === true ? "true" : "false",
      square_recorded_at_utc: cleanText(payload.square_handoff?.square_recorded_at_utc ?? ""),
      sale_total_minor_units: cleanText(payload.square_handoff?.sale_total_minor_units ?? ""),
      square_amount_due_minor_units: cleanText(payload.square_handoff?.square_amount_due_minor_units ?? ""),
      sync_intent: cleanText(payload.sync_intent ?? ""),
    },
  }
}

function moneyFromMinorUnits(minorUnits) {
  if (!Number.isFinite(minorUnits) || minorUnits === 0) {
    return ""
  }

  const negative = minorUnits < 0
  const absolute = Math.abs(minorUnits)
  const whole = Math.trunc(absolute / 100)
  const cents = String(absolute % 100).padStart(2, "0")

  return `${negative ? "-" : ""}${whole}.${cents}`
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

function positiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function cleanCurrency(value) {
  const currency = String(value ?? "USD").trim().toUpperCase()

  return /^[A-Z]{3}$/.test(currency) ? currency : "USD"
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 255)
}

function cleanId(value) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 191)
}

function boundedTimeout(value) {
  const timeout = Number.parseInt(String(value ?? "10000"), 10)

  return Number.isFinite(timeout) ? Math.min(30000, Math.max(1000, timeout)) : 10000
}
