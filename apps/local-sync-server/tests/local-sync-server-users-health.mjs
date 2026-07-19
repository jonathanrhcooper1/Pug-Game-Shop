import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

let catalogIndexCalls = 0

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://thepuggaming.com/",
  storeOptions: {
    databasePath: ":memory:",
    wordpressCatalogIndexer: async (input) => {
      catalogIndexCalls += 1
      assert.equal(input.game, "pokemon")

      return {
        status: "ok",
        action: "wordpress_scrydex_catalog_index_completed",
        code: "wordpress_scrydex_catalog_index_completed",
        cards: {
          page_count: 2,
          provider_request_count: 2,
          reference_row_count: 125,
          database_writes_deferred: false,
          continuation_available: false,
        },
        expansion_result: {
          page_count: 1,
        },
      }
    },
  },
})

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const managerAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "9999" },
  })

  const created = await fetchJson(`${baseUrl}/users`, {
    method: "POST",
    token: managerAuth.session.token,
    body: {
      name: "Demo Clerk",
      pin: "2468",
      role: "staff",
      access: ["Inventory", "Status"],
    },
  })

  assert.equal(created.status, "ok")
  assert.equal(created.user.name, "Demo Clerk")
  assert.equal(created.raw_pin_returned, false)
  assert.equal(created.pin_hash_returned, false)

  const updated = await fetchJson(`${baseUrl}/users/${encodeURIComponent(created.user.id)}`, {
    method: "PATCH",
    token: managerAuth.session.token,
    body: {
      name: "Front Register",
      pin: "3579",
      role: "staff",
      access: ["Inventory", "Kiosk", "Status"],
    },
  })

  assert.equal(updated.status, "ok")
  assert.equal(updated.user.name, "Front Register")
  assert.equal(updated.pin_changed, true)
  assert.equal(JSON.stringify(updated).includes("3579"), false)

  const oldPin = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "2468" },
    expectedStatus: 409,
  })

  assert.equal(oldPin.code, "invalid_pin")

  const newPin = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "3579" },
  })

  assert.equal(newPin.status, "ok")
  assert.equal(newPin.user.name, "Front Register")

  const removed = await fetchJson(`${baseUrl}/users/${encodeURIComponent(created.user.id)}`, {
    method: "DELETE",
    token: managerAuth.session.token,
  })

  assert.equal(removed.status, "ok")
  assert.equal(removed.removed_user_id, created.user.id)
  assert.equal(removed.users.some((user) => user.id === created.user.id), false)

  const removedPin = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "3579" },
    expectedStatus: 409,
  })

  assert.equal(removedPin.code, "invalid_pin")

  const removedSessionStatus = await fetchJson(`${baseUrl}/users/access-policy`, {
    token: newPin.session.token,
    expectedStatus: 409,
  })

  assert.equal(removedSessionStatus.code, "session_required")

  const scryDexRun = await server.localSyncStore.indexScryDexCatalogForSystem({
    games: ["pokemon"],
    pageSize: 100,
  })

  assert.equal(scryDexRun.status, "ok")
  assert.equal(catalogIndexCalls, 1)
  assert.equal(scryDexRun.stored_cards, 125)
  assert.equal(scryDexRun.games[0].card_pages, 2)

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)

  assert.equal(syncStatus.status, "ok")
  assert.equal(syncStatus.last_scrydex_catalog_sync.status, "ok")
  assert.equal(syncStatus.last_scrydex_catalog_sync.stored_cards, 125)
  assert.equal(JSON.stringify(syncStatus).includes("2468"), false)
  assert.equal(JSON.stringify(syncStatus).includes("3579"), false)

  console.log("PASS local sync users and health diagnostics")
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
