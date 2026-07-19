const DEFAULT_BASE_URL = "https://api.frankfurter.dev"
const DEFAULT_PROVIDER = "ECB"

export function createExchangeRateProvider(options = {}) {
  const fetcher = options.fetcher ?? globalThis.fetch
  const baseUrl = cleanBaseUrl(options.baseUrl) || DEFAULT_BASE_URL
  const provider = cleanProvider(options.provider) || DEFAULT_PROVIDER
  const timeoutMs = boundedInteger(options.timeoutMs, 1000, 60000, 10000)

  const getRate = async ({ source_currency: sourceCurrency, target_currency: targetCurrency } = {}) => {
    const source = cleanCurrency(sourceCurrency)
    const target = cleanCurrency(targetCurrency)

    if (!source || !target || typeof fetcher !== "function") {
      return null
    }
    if (source === target) {
      return {
        rate: 1,
        provider: "identity",
        observed_at_utc: new Date().toISOString(),
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const url = new URL(
        `/v2/rate/${encodeURIComponent(source)}/${encodeURIComponent(target)}`,
        `${baseUrl}/`,
      )
      if (provider) {
        url.searchParams.set("providers", provider)
      }

      const response = await fetcher(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
      if (!response?.ok) {
        return null
      }

      const payload = await response.json()
      const rate = Number(payload?.rate)
      const observedAtUtc = quoteDateToUtc(payload?.date)
      if (
        cleanCurrency(payload?.base) !== source ||
        cleanCurrency(payload?.quote) !== target ||
        !Number.isFinite(rate) ||
        rate <= 0 ||
        !observedAtUtc
      ) {
        return null
      }

      return {
        rate,
        provider: provider ? `Frankfurter/${provider}` : "Frankfurter/blended",
        observed_at_utc: observedAtUtc,
      }
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  getRate.configured = typeof fetcher === "function"
  getRate.status = () => ({
    configured: getRate.configured,
    base_url: baseUrl,
    provider,
    credentials_required: false,
  })

  return getRate
}

function quoteDateToUtc(value) {
  const date = String(value ?? "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return ""
  }
  const parsed = Date.parse(`${date}T23:59:59.999Z`)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : ""
}

function cleanCurrency(value) {
  const currency = String(value ?? "").trim().toUpperCase()
  return /^[A-Z]{3}$/.test(currency) ? currency : ""
}

function cleanBaseUrl(value) {
  const candidate = String(value ?? "").trim().replace(/\/+$/, "")
  try {
    const url = new URL(candidate)
    return ["http:", "https:"].includes(url.protocol) ? url.toString().replace(/\/+$/, "") : ""
  } catch {
    return ""
  }
}

function cleanProvider(value) {
  return String(value ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40)
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}
