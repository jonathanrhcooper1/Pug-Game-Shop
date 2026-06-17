const DEFAULT_PRICECHARTING_BASE_URL = "https://www.pricecharting.com"

export function createGradedPricingLookup(options = {}) {
  const priceChartingToken = cleanSecret(options.priceChartingToken)
  const priceChartingProvider = createPriceChartingProvider({
    baseUrl: options.priceChartingBaseUrl ?? DEFAULT_PRICECHARTING_BASE_URL,
    fetcher: options.fetcher ?? fetch,
    minRequestIntervalMs: options.priceChartingMinRequestIntervalMs,
    token: priceChartingToken,
  })

  const lookup = async (input = {}) => {
    const providers = [priceChartingProvider.status()]

    if (!priceChartingProvider.configured) {
      return {
        status: "ok",
        valuation: null,
        providers,
        provider_request_performed: false,
        message: "No secondary graded pricing provider is configured.",
      }
    }

    const priceChartingResult = await priceChartingProvider.lookup(input)

    return {
      status: "ok",
      valuation: priceChartingResult.valuation,
      providers: [priceChartingResult.provider],
      provider_request_performed: priceChartingResult.provider_request_performed,
      message: priceChartingResult.message,
    }
  }

  lookup.configured = priceChartingProvider.configured

  return lookup
}

export function createPriceChartingProvider(options = {}) {
  const token = cleanSecret(options.token)
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_PRICECHARTING_BASE_URL)
  const fetcher = options.fetcher ?? fetch
  const minRequestIntervalMs = boundedInt(options.minRequestIntervalMs, 0, 60_000, 1000)
  let lastRequestAtMs = 0
  let requestGate = Promise.resolve()

  return {
    configured: token !== "",
    status: () => ({
      provider: "pricecharting",
      configured: token !== "",
      status: token ? "ready" : "not_configured",
      detail: token
        ? "PriceCharting API token is configured on the local sync server."
        : "Secondary graded comp lookup is not configured on this local server.",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }),
    lookup: async (input = {}) => {
      if (!token) {
        return {
          valuation: null,
          provider: {
            provider: "pricecharting",
            configured: false,
            status: "not_configured",
            detail: "Secondary graded comp lookup is not configured on this local server.",
            credentials_synced_to_client: false,
            raw_credentials_returned: false,
          },
          provider_request_performed: false,
          message: "PriceCharting is not configured.",
        }
      }

      const selectedKey = priceChartingCardGradePriceKey(input.grading_company, input.grade)

      if (!selectedKey) {
        return {
          valuation: null,
          provider: {
            provider: "pricecharting",
            configured: true,
            status: "unsupported_grade",
            detail: "PriceCharting current-value API does not expose an exact key for this grade.",
            credentials_synced_to_client: false,
            raw_credentials_returned: false,
          },
          provider_request_performed: false,
          message: "No PriceCharting key is available for the requested grade.",
        }
      }

      const query = priceChartingQuery(input)
      const url = new URL("/api/product", baseUrl)
      url.searchParams.set("t", token)
      url.searchParams.set("q", query)

      try {
        const response = await runRateLimitedRequest(() => fetcher(url, {
          headers: {
            accept: "application/json",
          },
          method: "GET",
        }))

        if (!response.ok) {
          return {
            valuation: null,
            provider: {
              provider: "pricecharting",
              configured: true,
              status: "error",
              detail: `PriceCharting request failed with HTTP ${response.status}.`,
              credentials_synced_to_client: false,
              raw_credentials_returned: false,
            },
            provider_request_performed: true,
            message: "PriceCharting request failed.",
          }
        }

        const payload = await response.json()
        const providerStatus = cleanPriceChartingStatus(payload.status)

        if (providerStatus !== "success") {
          return {
            valuation: null,
            provider: {
              provider: "pricecharting",
              configured: true,
              status: "no_match",
              detail: "PriceCharting did not return a successful product match.",
              credentials_synced_to_client: false,
              raw_credentials_returned: false,
            },
            provider_request_performed: true,
            message: "PriceCharting did not return a product match.",
          }
        }

        const marketPriceMinorUnits = priceChartingMinorUnits(payload[selectedKey.key])

        if (marketPriceMinorUnits <= 0) {
          return {
            valuation: null,
            provider: {
              provider: "pricecharting",
              configured: true,
              status: "no_price",
              detail: `PriceCharting matched ${cleanName(payload["product-name"])} but did not return ${selectedKey.label}.`,
              credentials_synced_to_client: false,
              raw_credentials_returned: false,
            },
            provider_request_performed: true,
            message: "PriceCharting matched the card but did not return an exact graded price.",
          }
        }

        const observedAtUtc = new Date().toISOString()
        const productId = cleanExternalId(payload.id)

        return {
          valuation: {
            provider: "pricecharting",
            provider_product_id: productId,
            provider_product_name: cleanName(payload["product-name"]),
            provider_product_url: productId ? `${baseUrl.replace(/\/$/, "")}/game/${productId}` : "",
            grading_company: cleanName(input.grading_company),
            grade: cleanGrade(input.grade),
            market_price_minor_units: marketPriceMinorUnits,
            currency: "USD",
            source_label: "PriceCharting graded market",
            source_detail: `${selectedKey.label} from PriceCharting current values.`,
            confidence_score: selectedKey.confidence,
            observed_at_utc: observedAtUtc,
            fetched_at_utc: observedAtUtc,
            credentials_synced_to_client: false,
            raw_credentials_returned: false,
          },
          provider: {
            provider: "pricecharting",
            configured: true,
            status: "ready",
            detail: `Matched ${cleanName(payload["product-name"])} using ${selectedKey.label}.`,
            credentials_synced_to_client: false,
            raw_credentials_returned: false,
          },
          provider_request_performed: true,
          message: "PriceCharting graded market value loaded.",
        }
      } catch (error) {
        return {
          valuation: null,
          provider: {
            provider: "pricecharting",
            configured: true,
            status: "error",
            detail: error instanceof Error ? error.message : "PriceCharting request failed.",
            credentials_synced_to_client: false,
            raw_credentials_returned: false,
          },
          provider_request_performed: true,
          message: "PriceCharting request failed.",
        }
      }
    },
  }

  async function runRateLimitedRequest(request) {
    const previousGate = requestGate.catch(() => {})

    requestGate = previousGate.then(async () => {
      const now = Date.now()
      const waitMs = Math.max(0, minRequestIntervalMs - (now - lastRequestAtMs))

      if (waitMs > 0) {
        await sleep(waitMs)
      }

      lastRequestAtMs = Date.now()

      return request()
    })

    return requestGate
  }
}

export function priceChartingCardGradePriceKey(gradingCompany, grade) {
  const company = cleanName(gradingCompany).toLowerCase()
  const normalizedGrade = Number.parseFloat(String(grade ?? "").replace(/[^0-9.]+/g, ""))

  if (!Number.isFinite(normalizedGrade)) {
    return null
  }

  if (normalizedGrade >= 9.95) {
    if (company.includes("bgs") || company.includes("beckett")) {
      return { key: "bgs-10-price", label: "BGS 10", confidence: 96 }
    }

    if (company.includes("cgc")) {
      return { key: "condition-17-price", label: "CGC 10", confidence: 96 }
    }

    if (company.includes("sgc")) {
      return { key: "condition-18-price", label: "SGC 10", confidence: 96 }
    }

    return { key: "manual-only-price", label: "PSA/Grade 10", confidence: company.includes("psa") ? 96 : 86 }
  }

  if (normalizedGrade >= 9.5) {
    return { key: "box-only-price", label: "Grade 9.5", confidence: 92 }
  }

  if (normalizedGrade >= 9) {
    return { key: "graded-price", label: "Grade 9", confidence: 92 }
  }

  if (normalizedGrade >= 8) {
    return { key: "new-price", label: "Grade 8/8.5", confidence: normalizedGrade === 8 ? 92 : 84 }
  }

  if (normalizedGrade >= 7) {
    return { key: "cib-price", label: "Grade 7/7.5", confidence: normalizedGrade === 7 ? 92 : 84 }
  }

  return null
}

function priceChartingQuery(input = {}) {
  return [
    cleanName(input.card_name),
    cleanName(input.set_name),
    cleanName(input.printed_number || input.card_number),
    gameSearchLabel(input.game),
    "card",
  ].filter(Boolean).join(" ")
}

function gameSearchLabel(value) {
  const game = cleanName(value).toLowerCase()

  if (game.includes("pokemon")) {
    return "pokemon"
  }

  if (game.includes("magic") || game === "mtg") {
    return "magic"
  }

  if (game.includes("lorcana")) {
    return "lorcana"
  }

  if (game.includes("onepiece") || game.includes("one piece")) {
    return "one piece"
  }

  return game
}

function priceChartingMinorUnits(value) {
  if (value === undefined || value === null || value === "") {
    return 0
  }

  const text = String(value).trim().replace(/[$,]/g, "")

  if (!text) {
    return 0
  }

  if (text.includes(".")) {
    const decimal = Number.parseFloat(text)

    return Number.isFinite(decimal) ? Math.max(0, Math.round(decimal * 100)) : 0
  }

  const cents = Number.parseInt(text, 10)

  return Number.isFinite(cents) ? Math.max(0, cents) : 0
}

function cleanPriceChartingStatus(value) {
  return String(value ?? "").trim().toLowerCase()
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(String(value ?? DEFAULT_PRICECHARTING_BASE_URL))

    return url.origin
  } catch {
    return DEFAULT_PRICECHARTING_BASE_URL
  }
}

function cleanSecret(value) {
  return String(value ?? "").trim()
}

function cleanName(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

function cleanGrade(value) {
  return cleanName(value).replace(/^grade\s+/i, "")
}

function cleanExternalId(value) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "")
}

function boundedInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
