import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://example.test/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath: ":memory:",
    seedDemoData: false,
    seedDemoInventory: false,
  },
})

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const auth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "9999" },
  })
  const token = auth.session.token
  const intake = await fetchJson(`${baseUrl}/inventory/intake`, {
    method: "POST",
    token,
    body: {
      card_name: "Barcode History Test",
      set_name: "Connector Test",
      condition: "NM",
      barcode: "PUG-OLD-100",
      price_minor_units: 500,
      minimum_sale_price_minor_units: 100,
      location: "Case A",
      quantity: 1,
    },
  })
  const publicId = intake.item.public_id

  const updated = await fetchJson(`${baseUrl}/inventory/items/${encodeURIComponent(publicId)}`, {
    method: "PATCH",
    token,
    body: {
      barcode: "PUG-NEW-100",
      reason: "barcode history verification",
    },
  })
  assert.equal(updated.status, "ok")
  assert.equal(updated.item.barcode, "PUG-NEW-100")

  const foundByRetiredBarcode = await fetchJson(`${baseUrl}/inventory/search?q=PUG-OLD-100`)
  assert.equal(foundByRetiredBarcode.items.length, 1)
  assert.equal(foundByRetiredBarcode.items[0].public_id, publicId)
  assert.equal(foundByRetiredBarcode.items[0].barcode, "PUG-NEW-100")

  const reusedRetiredBarcode = await fetchJson(`${baseUrl}/inventory/intake`, {
    method: "POST",
    token,
    expectedStatus: 409,
    body: {
      card_name: "Retired Barcode Reuse",
      set_name: "Connector Test",
      condition: "NM",
      barcode: "PUG-OLD-100",
      price_minor_units: 500,
      quantity: 1,
    },
  })
  assert.equal(reusedRetiredBarcode.status, "blocked")
  assert.equal(reusedRetiredBarcode.code, "duplicate_barcode")

  console.log("PASS local sync barcode uniqueness and historical lookup")
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
