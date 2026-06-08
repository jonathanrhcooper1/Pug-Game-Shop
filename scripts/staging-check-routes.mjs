const siteUrl = normalizeSiteUrl(process.env.PUG_STAGING_SITE_URL || process.argv[2] || "")

if (!siteUrl) {
  throw new Error("Set PUG_STAGING_SITE_URL or pass the staging site URL as the first argument.")
}

const restRootUrl = new URL("/wp-json/", siteUrl).toString()
const healthUrl = new URL("/wp-json/tcg-store/v1/health", siteUrl).toString()
const connectorManifestUrl = new URL(
  "/wp-json/tcg-store/v1/offline/connector-manifest",
  siteUrl,
).toString()
const robotsUrl = new URL("/robots.txt", siteUrl).toString()

const restRoot = await fetchJsonProbe(restRootUrl)
const health = await fetchJsonProbe(healthUrl)
const connectorManifest = await fetchJsonProbe(connectorManifestUrl)
const home = await fetchTextProbe(siteUrl)
const robots = await fetchTextProbe(robotsUrl)

const namespaceRegistered = Array.isArray(restRoot.json?.namespaces)
  ? restRoot.json.namespaces.includes("tcg-store/v1")
  : false
const healthRouteRegistered = health.status !== 404 && health.json?.code !== "rest_no_route"
const manifestPublicReady =
  connectorManifest.status === 200 &&
  connectorManifest.json?.action === "offline_connector_manifest" &&
  connectorManifest.json?.credentials_synced_to_app === false
const noindexHeaderReady = headerIncludesNoindex(home.headers["x-robots-tag"])
const noindexMetaReady = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(
  home.text,
)
const robotsBlocksPublicIndexing = /User-agent:\s*\*\s+Disallow:\s*\/(?:\s|$)/i.test(
  robots.text,
)

const checks = [
  {
    name: "wordpress_rest_root",
    pass: restRoot.status === 200,
    status: restRoot.status,
    detail: restRoot.status === 200 ? "WordPress REST root is reachable." : restRoot.detail,
  },
  {
    name: "tcg_store_namespace_registered",
    pass: namespaceRegistered,
    status: restRoot.status,
    detail: namespaceRegistered
      ? "tcg-store/v1 namespace is present in the REST index."
      : "tcg-store/v1 namespace is missing from the REST index; install/activate TCG Store Platform.",
  },
  {
    name: "authenticated_health_route_registered",
    pass: healthRouteRegistered,
    status: health.status,
    detail: healthRouteRegistered
      ? "Health route is registered. A 401/403 is acceptable without an admin nonce."
      : routeMissingGuidance(health),
  },
  {
    name: "public_connector_manifest_ready",
    pass: manifestPublicReady,
    status: connectorManifest.status,
    detail: manifestPublicReady
      ? "Public connector manifest is reachable and secret-safe."
      : routeMissingGuidance(connectorManifest),
  },
  {
    name: "staging_noindex_ready",
    pass: noindexHeaderReady || noindexMetaReady || robotsBlocksPublicIndexing,
    status: home.status,
    detail:
      noindexHeaderReady || noindexMetaReady || robotsBlocksPublicIndexing
        ? "Staging public indexing controls are visible."
        : "No noindex header/meta or full robots block was detected on the staging front end.",
  },
]

const report = {
  action: "staging_route_check",
  site_url: siteUrl,
  generated_at_utc: new Date().toISOString(),
  passed: checks.every((check) => check.pass),
  credentials_synced_to_app: false,
  checks,
  endpoints: {
    rest_root: restRootUrl,
    health: healthUrl,
    connector_manifest: connectorManifestUrl,
    robots: robotsUrl,
  },
}

console.log(JSON.stringify(report, null, 2))

if (!report.passed) {
  process.exitCode = 1
}

function normalizeSiteUrl(value) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ""
  }

  const parsed = new URL(trimmed)
  parsed.pathname = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "")
  parsed.search = ""
  parsed.hash = ""

  return parsed.toString()
}

async function fetchJsonProbe(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  })
  const text = await response.text()
  const json = parseJson(text)

  return {
    status: response.status,
    headers: headersObject(response.headers),
    json,
    detail: json?.message || response.statusText || "Request completed.",
  }
}

async function fetchTextProbe(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,text/plain",
      "Cache-Control": "no-cache",
    },
  })

  return {
    status: response.status,
    headers: headersObject(response.headers),
    text: await response.text(),
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function headersObject(headers) {
  return Object.fromEntries(
    Array.from(headers.entries()).map(([key, value]) => [key.toLowerCase(), value]),
  )
}

function headerIncludesNoindex(value) {
  return typeof value === "string" && value.toLowerCase().includes("noindex")
}

function routeMissingGuidance(probe) {
  if (probe.status === 404 || probe.json?.code === "rest_no_route") {
    return "Route is not registered. Confirm the TCG Store Platform package is installed and active on staging."
  }

  if (probe.status === 401 || probe.status === 403) {
    return "Route exists but requires authentication or a route gate."
  }

  return probe.detail || "Unexpected staging route response."
}
