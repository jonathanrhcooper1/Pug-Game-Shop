import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://example.test/",
  storeOptions: {
    databasePath: ":memory:",
    now: () => new Date("2026-06-09T14:00:00.000Z"),
  },
})

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const unauthorized = await fetchJson(`${baseUrl}/inventory/locations`, {
    expectedStatus: 409,
  })

  assert.equal(unauthorized.status, "blocked")
  assert.equal(unauthorized.code, "session_required")

  const auth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1234" },
  })

  const created = await fetchJson(`${baseUrl}/inventory/locations`, {
    method: "POST",
    token: auth.session.token,
    body: { location: "Case 7 - Slabs" },
  })

  assert.equal(created.status, "ok")
  assert.equal(created.location, "Case 7 - Slabs")
  assert.ok(created.locations.includes("Case 7 - Slabs"))
  assert.equal(created.credentials_synced_to_client, false)

  const list = await fetchJson(`${baseUrl}/inventory/locations`, {
    token: auth.session.token,
  })

  assert.equal(list.status, "ok")
  assert.ok(list.locations.includes("Case 7 - Slabs"))
  assert.ok(list.locations.includes("Intake Queue"))

  console.log("PASS local sync server inventory locations")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

async function fetchJson(url, options = {}) {
  const headers = { "content-type": "application/json" }

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await response.json()

  assert.equal(
    response.status,
    options.expectedStatus ?? 200,
    `${url} returned ${response.status}: ${JSON.stringify(body)}`,
  )

  return body
}
