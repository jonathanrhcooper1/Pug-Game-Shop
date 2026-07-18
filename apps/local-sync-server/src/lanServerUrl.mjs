import { networkInterfaces as readNetworkInterfaces } from "node:os"

export function resolveLanListenHost(value) {
  const host = String(value ?? "").trim()

  return host || "0.0.0.0"
}

export function resolveLanPublicServerUrl(options = {}) {
  const configured = cleanLanPublicServerUrl(options.configuredServerUrl)

  if (configured) {
    return configured
  }

  const port = normalizePort(options.port, "8787")
  const host = advertisedLanHost(options.host, options.networkInterfaces)

  return `http://${formatHostForUrl(host)}:${port}`
}

export function cleanLanPublicServerUrl(value) {
  const text = String(value ?? "").trim()

  if (!text) {
    return ""
  }

  try {
    const url = new URL(text)

    if (!["http:", "https:"].includes(url.protocol)) {
      return ""
    }

    if (isUnusableAdvertisedHost(url.hostname)) {
      return ""
    }

    url.pathname = "/"
    url.search = ""
    url.hash = ""

    return url.toString().replace(/\/$/, "")
  } catch {
    return ""
  }
}

export function advertisedLanHost(host, injectedNetworkInterfaces) {
  const listenHost = String(host ?? "").trim()

  if (listenHost && !isUnusableAdvertisedHost(listenHost)) {
    return listenHost
  }

  const interfaces = injectedNetworkInterfaces ?? readNetworkInterfaces()

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (
        isIpv4Interface(entry) &&
        !entry.internal &&
        entry.address &&
        !isUnusableAdvertisedHost(entry.address)
      ) {
        return entry.address
      }
    }
  }

  return "127.0.0.1"
}

export function isUnusableAdvertisedHost(host) {
  const value = String(host ?? "")
    .trim()
    .replace(/^\[|\]$/g, "")
    .toLowerCase()

  if (!value) {
    return true
  }

  if (
    value === "localhost" ||
    value === "0.0.0.0" ||
    value === "::" ||
    value === "::1" ||
    value === "127.0.0.1" ||
    value.startsWith("127.")
  ) {
    return true
  }

  return [
    "store-server-ip",
    "server-ip",
    "your-server-ip",
    "replace-with",
    "replace_with",
  ].some((placeholder) => value.includes(placeholder))
}

function isIpv4Interface(entry) {
  return entry?.family === "IPv4" || entry?.family === 4
}

function normalizePort(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return fallback
  }

  return String(parsed)
}

function formatHostForUrl(host) {
  return String(host).includes(":") ? `[${host}]` : String(host)
}
