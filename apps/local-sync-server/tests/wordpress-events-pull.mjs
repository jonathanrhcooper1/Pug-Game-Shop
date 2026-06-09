import assert from "node:assert/strict"

import {
  createWordPressEventsPull,
  eventsFromWordPressEventsResponse,
  eventsMetaFromWordPressEventsResponse,
} from "../src/wordpressEventsPull.mjs"

let capturedUrl = ""
const pull = createWordPressEventsPull({
  websiteUrl: "https://example.test",
  username: "sync-user",
  applicationPassword: "secret app password",
  pageSize: 20,
  fetcher: async (url, init) => {
    capturedUrl = url.toString()
    assert.equal(init.headers.accept, "application/json")
    assert.ok(init.headers.authorization.startsWith("Basic "))

    return {
      ok: true,
      status: 200,
      json: async () => ({
        events: [
          {
            id: 42,
            public_id: "event-public-42",
            slug: "friday-commander-night",
            title: "Friday Commander Night",
            start_datetime: "2026-06-12T23:00:00+00:00",
            player_cap: 24,
            registered_count: 10,
            seats_remaining: 14,
            registration_status: "open",
            event_type: "commander",
            game: "magic",
          },
        ],
      }),
    }
  },
})

assert.equal(typeof pull, "function")

const result = await pull({
  page: 2,
  filters: {
    game: "magic",
    event_type: "commander",
    registration_status: "open",
  },
})

assert.equal(result.status, "ok")
assert.equal(result.events.length, 1)
assert.equal(result.events[0].slug, "friday-commander-night")
assert.equal(result.meta.page, 2)
assert.equal(result.meta.page_size, 20)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.ok(capturedUrl.startsWith("https://example.test/wp-json/tcg-store/v1/events?"))
assert.ok(capturedUrl.includes("page=2"))
assert.ok(capturedUrl.includes("per_page=20"))
assert.ok(capturedUrl.includes("game=magic"))
assert.ok(capturedUrl.includes("event_type=commander"))
assert.ok(capturedUrl.includes("registration_status=open"))

const publicPull = createWordPressEventsPull({
  websiteUrl: "https://example.test",
  fetcher: async (url, init) => {
    assert.equal("authorization" in init.headers, false)

    return {
      ok: false,
      status: 503,
      json: async () => ({}),
    }
  },
})
const unavailable = await publicPull()

assert.equal(unavailable.status, "blocked")
assert.equal(unavailable.code, "wordpress_events_pull_http_error")
assert.equal(unavailable.http_status, 503)
assert.equal(unavailable.events.length, 0)

assert.equal(eventsFromWordPressEventsResponse({ data: { events: [{ public_id: "one" }] } }).length, 1)
assert.equal(eventsFromWordPressEventsResponse({ events: "bad" }).length, 0)
assert.deepEqual(eventsMetaFromWordPressEventsResponse({}, { page: 1, pageSize: 2, eventCount: 2 }), {
  page: 1,
  page_size: 2,
  total: 2,
  has_more: true,
})

assert.equal(createWordPressEventsPull({ websiteUrl: "" }), null)

console.log("PASS WordPress events pull")
