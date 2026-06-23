const DEFAULT_SQUARE_API_VERSION = "2026-05-20"
const SQUARE_PRODUCTION_BASE_URL = "https://connect.squareup.com"
const SQUARE_SANDBOX_BASE_URL = "https://connect.squareupsandbox.com"

export function createSquareInventoryCountsPuller(options = {}) {
  const accessToken = cleanSecret(options.accessToken)
  const locationId = cleanExternalId(options.locationId)
  const environment = cleanEnvironment(options.environment)
  const apiVersion = cleanApiVersion(options.apiVersion)
  const baseUrl = cleanBaseUrl(options.baseUrl) || squareBaseUrl(environment)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedInt(options.timeoutMs, 2_000, 120_000, 20_000)
  let discoveredLocationId = ""

  function status() {
    return {
      configured: Boolean(accessToken && typeof fetcher === "function"),
      environment,
      location_id_configured: Boolean(locationId),
      location_auto_discovery_enabled: !locationId,
      discovered_location_id_configured: Boolean(discoveredLocationId),
      access_token_configured: Boolean(accessToken),
      api_version: apiVersion,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function pullCounts(input = {}) {
    const requestedLocationId = cleanExternalId(input.locationId ?? input.location_id) || locationId
    const catalogObjectIds = uniqueValues(
      normalizeStringList(input.catalogObjectIds ?? input.catalog_object_ids ?? input.variationIds ?? input.variation_ids),
    )

    if (!accessToken || typeof fetcher !== "function") {
      return blocked("square_inventory_counts_puller_unconfigured", "Square inventory count polling is not configured.")
    }

    const resolvedLocation = requestedLocationId
      ? { status: "ok", location_id: requestedLocationId, source: "configured" }
      : await discoverDefaultLocationId()

    if (resolvedLocation.status !== "ok") {
      return resolvedLocation
    }

    if (catalogObjectIds.length === 0) {
      return {
        status: "ok",
        code: "square_inventory_counts_no_catalog_objects",
        counts: [],
        count_count: 0,
        catalog_object_count: 0,
        location_id: resolvedLocation.location_id,
        location_id_source: resolvedLocation.source,
        environment,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    }

    const endpoint = new URL(`${baseUrl}/v2/inventory/counts/batch-retrieve`)
    const allCounts = []
    let cursor = cleanExternalId(input.cursor)
    let page = 0

    do {
      page += 1
      const body = {
        catalog_object_ids: catalogObjectIds.slice(0, 1000),
        location_ids: [resolvedLocation.location_id],
        states: ["IN_STOCK"],
        limit: 1000,
      }

      if (cursor) {
        body.cursor = cursor
      }

      const updatedAfter = cleanIsoTimestamp(input.updatedAfter ?? input.updated_after)
      if (updatedAfter) {
        body.updated_after = updatedAfter
      }

      const controller = typeof AbortController === "function" ? new AbortController() : null
      const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

      try {
        const response = await fetcher(endpoint, {
          method: "POST",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
            "square-version": apiVersion,
          },
          body: JSON.stringify(body),
          signal: controller?.signal,
        })
        const responseBody = await safeJson(response)

        if (!response?.ok) {
          return {
            status: "blocked",
            code: "square_inventory_counts_pull_failed",
            http_status: Number(response?.status ?? 0),
            message: "Square rejected the inventory counts request.",
            errors: Array.isArray(responseBody?.errors) ? responseBody.errors.map(publicSquareError) : [],
            endpoint: secretSafeEndpoint(endpoint),
            credentials_synced_to_client: false,
            raw_credentials_returned: false,
          }
        }

        const counts = Array.isArray(responseBody?.counts) ? responseBody.counts : []
        allCounts.push(...counts)
        cursor = cleanExternalId(responseBody?.cursor)
      } catch (error) {
        return {
          status: "blocked",
          code: "square_inventory_counts_pull_unavailable",
          message: error instanceof Error ? error.message : "Square inventory counts are unavailable.",
          endpoint: secretSafeEndpoint(endpoint),
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
      } finally {
        if (timeout) {
          clearTimeout(timeout)
        }
      }
    } while (cursor && page < 20)

    return {
      status: "ok",
      code: "square_inventory_counts_pulled",
      counts: allCounts,
      count_count: allCounts.length,
      catalog_object_count: catalogObjectIds.length,
      location_id: resolvedLocation.location_id,
      location_id_source: resolvedLocation.source,
      environment,
      cursor_exhausted: !cursor,
      max_page_guard_hit: Boolean(cursor),
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function discoverDefaultLocationId() {
    if (discoveredLocationId) {
      return { status: "ok", location_id: discoveredLocationId, source: "discovered" }
    }

    const endpoint = new URL(`${baseUrl}/v2/locations`)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
          "square-version": apiVersion,
        },
        signal: controller?.signal,
      })
      const responseBody = await safeJson(response)

      if (!response?.ok) {
        return {
          status: "blocked",
          code: "square_locations_pull_failed",
          http_status: Number(response?.status ?? 0),
          message: "Square rejected the locations request; set PUG_SQUARE_LOCATION_ID manually or verify the access token.",
          errors: Array.isArray(responseBody?.errors) ? responseBody.errors.map(publicSquareError) : [],
          endpoint: secretSafeEndpoint(endpoint),
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
      }

      const locations = Array.isArray(responseBody?.locations) ? responseBody.locations : []
      const activeLocations = locations.filter((location) => cleanExternalId(location?.id))
      const preferredLocation =
        activeLocations.find((location) => cleanName(location?.status).toUpperCase() === "ACTIVE") ??
        activeLocations[0]
      const nextLocationId = cleanExternalId(preferredLocation?.id)

      if (!nextLocationId) {
        return blocked(
          "square_location_id_required",
          "Square location auto-discovery found no active locations; set PUG_SQUARE_LOCATION_ID on the LAN server.",
        )
      }

      discoveredLocationId = nextLocationId
      return { status: "ok", location_id: discoveredLocationId, source: "discovered" }
    } catch (error) {
      return {
        status: "blocked",
        code: "square_locations_pull_unavailable",
        message: error instanceof Error ? error.message : "Square locations are unavailable.",
        endpoint: secretSafeEndpoint(endpoint),
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }

  return {
    configured: status().configured,
    status,
    pullCounts,
  }
}

function squareBaseUrl(environment) {
  return environment === "production" ? SQUARE_PRODUCTION_BASE_URL : SQUARE_SANDBOX_BASE_URL
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function publicSquareError(error) {
  if (!error || typeof error !== "object") {
    return { detail: String(error ?? "") }
  }

  return {
    category: String(error.category ?? ""),
    code: String(error.code ?? ""),
    detail: String(error.detail ?? ""),
    field: String(error.field ?? ""),
  }
}

function blocked(code, message) {
  return {
    status: "blocked",
    code,
    message,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

function cleanEnvironment(value) {
  const text = String(value ?? "").trim().toLowerCase()
  return text === "production" || text === "prod" || text === "live" ? "production" : "sandbox"
}

function cleanBaseUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim())
    if (url.protocol !== "https:") {
      return ""
    }
    return url.origin
  } catch {
    return ""
  }
}

function cleanApiVersion(value) {
  const text = String(value ?? "").trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : DEFAULT_SQUARE_API_VERSION
}

function cleanSecret(value) {
  return String(value ?? "").trim()
}

function cleanExternalId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w:./-]/g, "")
    .slice(0, 220)
}

function cleanName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 220)
}

function cleanIsoTimestamp(value) {
  const text = String(value ?? "").trim()
  if (!text) {
    return ""
  }

  const timestamp = Date.parse(text)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : ""
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return value.map((item) => String(item ?? "").trim()).filter(Boolean)
}

function uniqueValues(values) {
  return [...new Set(values.map(cleanExternalId).filter(Boolean))]
}

function boundedInt(value, minimum, maximum, fallback) {
  const number = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(number)) {
    return fallback
  }

  return Math.min(maximum, Math.max(minimum, number))
}

function secretSafeEndpoint(endpoint) {
  try {
    const url = new URL(endpoint)
    url.search = ""
    return url.toString()
  } catch {
    return ""
  }
}
