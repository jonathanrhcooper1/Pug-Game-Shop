import assert from "node:assert/strict"

import { createSquareInventoryCountsPuller } from "../src/squareInventoryCountsPuller.mjs"

let observedRequest = null

const puller = createSquareInventoryCountsPuller({
  accessToken: "EAAA-test-token-do-not-print",
  environment: "production",
  locationId: "LOC-PUG-1",
  apiVersion: "2026-05-20",
  fetcher: async (url, options) => {
    observedRequest = {
      url: String(url),
      method: options.method,
      headers: options.headers,
      body: JSON.parse(options.body),
    }

    return new Response(JSON.stringify({
      counts: [
        {
          catalog_object_id: "SQ-VAR-1",
          location_id: "LOC-PUG-1",
          state: "IN_STOCK",
          quantity: "0",
        },
      ],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  },
})

assert.equal(puller.status().configured, true)
assert.equal(puller.status().environment, "production")
assert.equal(puller.status().raw_credentials_returned, false)

const result = await puller.pullCounts({
  catalogObjectIds: ["SQ-VAR-1", "SQ-VAR-1"],
})

assert.equal(result.status, "ok")
assert.equal(result.code, "square_inventory_counts_pulled")
assert.equal(result.count_count, 1)
assert.equal(result.catalog_object_count, 1)
assert.equal(result.request_count, 1)
assert.equal(result.page_count, 1)
assert.equal(result.chunk_count, 1)
assert.equal(result.chunk_size, 100)
assert.equal(result.cursor_exhausted, true)
assert.equal(result.max_page_guard_hit, false)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(observedRequest.url, "https://connect.squareup.com/v2/inventory/counts/batch-retrieve")
assert.equal(observedRequest.method, "POST")
assert.equal(observedRequest.headers.authorization, "Bearer EAAA-test-token-do-not-print")
assert.equal(observedRequest.headers["square-version"], "2026-05-20")
assert.deepEqual(observedRequest.body.catalog_object_ids, ["SQ-VAR-1"])
assert.deepEqual(observedRequest.body.location_ids, ["LOC-PUG-1"])
assert.deepEqual(observedRequest.body.states, ["IN_STOCK"])
assert.equal(Object.hasOwn(observedRequest.body, "limit"), false)
assert.equal(Object.hasOwn(observedRequest.body, "cursor"), false)
assert.equal(JSON.stringify(result).includes("EAAA-test-token-do-not-print"), false)

const chunkRequests = []
const chunkPuller = createSquareInventoryCountsPuller({
  accessToken: "EAAA-chunk-token-do-not-print",
  environment: "production",
  locationId: "LOC-PUG-1",
  apiVersion: "2026-05-20",
  fetcher: async (url, options) => {
    const body = JSON.parse(options.body)
    chunkRequests.push({
      url: String(url),
      body,
    })

    if (body.catalog_object_ids.length === 1000 && !body.cursor) {
      return new Response(JSON.stringify({
        counts: [
          {
            catalog_object_id: "SQ-VAR-1",
            location_id: "LOC-PUG-1",
            state: "IN_STOCK",
            quantity: "1",
          },
        ],
        cursor: "SQ-CURSOR-PAGE-2",
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }

    return new Response(JSON.stringify({
      counts: body.cursor
        ? [
            {
              catalog_object_id: "SQ-VAR-2",
              location_id: "LOC-PUG-1",
              state: "IN_STOCK",
              quantity: "2",
            },
          ]
        : [],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  },
})

const chunkResult = await chunkPuller.pullCounts({
  catalogObjectIds: Array.from({ length: 1001 }, (_, index) => `SQ-VAR-${index + 1}`),
  chunkSize: 1000,
  cursor: "STALE-CURSOR",
})

assert.equal(chunkResult.status, "ok")
assert.equal(chunkResult.catalog_object_count, 1001)
assert.equal(chunkResult.count_count, 2)
assert.equal(chunkResult.cursor_exhausted, true)
assert.equal(chunkResult.square_cursor_ignored_for_catalog_object_chunks, false)
assert.equal(chunkResult.request_count, 3)
assert.equal(chunkResult.page_count, 3)
assert.equal(chunkResult.chunk_count, 2)
assert.equal(chunkResult.chunk_size, 1000)
assert.equal(chunkRequests.length, 3)
assert.equal(chunkRequests[0].body.catalog_object_ids.length, 1000)
assert.equal(chunkRequests[1].body.catalog_object_ids.length, 1000)
assert.equal(chunkRequests[1].body.cursor, "SQ-CURSOR-PAGE-2")
assert.equal(chunkRequests[2].body.catalog_object_ids.length, 1)
assert.equal(Object.hasOwn(chunkRequests[0].body, "cursor"), false)
assert.equal(Object.hasOwn(chunkRequests[2].body, "cursor"), false)
assert.equal(JSON.stringify(chunkResult).includes("EAAA-chunk-token-do-not-print"), false)

const autoLocationRequests = []
const autoLocationPuller = createSquareInventoryCountsPuller({
  accessToken: "EAAA-auto-location-token-do-not-print",
  environment: "production",
  apiVersion: "2026-05-20",
  fetcher: async (url, options) => {
    autoLocationRequests.push({
      url: String(url),
      method: options.method,
      headers: options.headers,
      body: options.body ? JSON.parse(options.body) : null,
    })

    if (String(url).endsWith("/v2/locations")) {
      return new Response(JSON.stringify({
        locations: [
          {
            id: "LOC-AUTO-1",
            status: "ACTIVE",
          },
        ],
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }

    return new Response(JSON.stringify({
      counts: [
        {
          catalog_object_id: "SQ-VAR-AUTO",
          location_id: "LOC-AUTO-1",
          state: "IN_STOCK",
          quantity: "2",
        },
      ],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  },
})

assert.equal(autoLocationPuller.status().configured, true)
assert.equal(autoLocationPuller.status().location_id_configured, false)
assert.equal(autoLocationPuller.status().location_auto_discovery_enabled, true)

const autoLocationResult = await autoLocationPuller.pullCounts({
  catalogObjectIds: ["SQ-VAR-AUTO"],
})

assert.equal(autoLocationResult.status, "ok")
assert.equal(autoLocationResult.location_id, "LOC-AUTO-1")
assert.equal(autoLocationResult.location_id_source, "discovered")
assert.equal(autoLocationResult.count_count, 1)
assert.equal(autoLocationRequests[0].url, "https://connect.squareup.com/v2/locations")
assert.equal(autoLocationRequests[0].method, "GET")
assert.equal(autoLocationRequests[1].url, "https://connect.squareup.com/v2/inventory/counts/batch-retrieve")
assert.deepEqual(autoLocationRequests[1].body.location_ids, ["LOC-AUTO-1"])
assert.equal(JSON.stringify(autoLocationResult).includes("EAAA-auto-location-token-do-not-print"), false)

console.log("PASS square inventory counts puller")
