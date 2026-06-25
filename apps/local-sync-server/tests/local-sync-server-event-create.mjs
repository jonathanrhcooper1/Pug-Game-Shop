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
  const auth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1234" },
  })

  const created = await fetchJson(`${baseUrl}/events`, {
    method: "POST",
    token: auth.session.token,
    body: {
      title: "Pokemon League Cup",
      starts_at_utc: "2026-06-20T18:00:00.000Z",
      game: "pokemon",
      event_type: "league_cup",
      capacity: 32,
      price_minor_units: 1500,
      registration_close_value: 2,
      registration_close_unit: "hours",
      location_label: "Main Tables",
    },
  })

  assert.equal(created.status, "ok")
  assert.equal(created.event.title, "Pokemon League Cup")
  assert.equal(created.event.entry_fee_minor_units, 1500)
  assert.equal(created.event.registration_deadline_utc, "2026-06-20T16:00:00.000Z")
  assert.equal(created.event.source, "queued")
  assert.equal(created.wordpress_acceptance_required, true)

  const events = await fetchJson(`${baseUrl}/events`)
  assert.ok(events.events.some((event) => event.event_id === created.event.event_id))

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)
  assert.equal(syncStatus.status, "ok")
  assert.equal(syncStatus.queue_depth, 1)

  console.log("PASS local sync server event create")
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
