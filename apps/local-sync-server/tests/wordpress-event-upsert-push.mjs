import assert from "node:assert/strict"

import {
  createWordPressEventUpsertPush,
  eventUpsertBody,
} from "../src/wordpressEventUpsertPush.mjs"

const operation = {
  operation_id: "op-event-upsert-001",
  operation_type: "event_upsert",
  entity_id: "local-event-001",
  payload: {
    actor_id: "staff-front-counter",
    actor_name: "Front Counter Staff",
    event: {
      event_id: "local-event-001",
      slug: "pokemon-league-cup",
      title: "Pokemon League Cup",
      starts_at_utc: "2026-06-20T18:00:00.000Z",
      event_type: "league_cup",
      game: "pokemon",
      capacity: 32,
      entry_fee_minor_units: 1500,
      registration_deadline_utc: "2026-06-20T16:00:00.000Z",
      location_label: "Main Tables",
      note: "Created from local app.",
    },
  },
}

const body = eventUpsertBody(operation)

assert.equal(body.title, "Pokemon League Cup")
assert.equal(body.starts_at_utc, "2026-06-20T18:00:00.000Z")
assert.equal(body.capacity, 32)
assert.equal(body.entry_fee, "15.00")
assert.equal(body.registration_deadline, "2026-06-20T16:00:00.000Z")
assert.equal(body.actor_name, "Front Counter Staff")
assert.equal(body.source, "offline_lan_sync")

let observedRequest = null
const push = createWordPressEventUpsertPush({
  websiteUrl: "https://example.test",
  username: "sync-user",
  applicationPassword: "secret app password",
  fetcher: async (url, init) => {
    observedRequest = {
      url: url.toString(),
      headers: init.headers,
      body: JSON.parse(init.body),
    }

    return Response.json(
      {
        data: {
          accepted: true,
          code: "event_created",
          woocommerce_product_created: true,
          event: {
            public_id: "event-public-001",
            slug: "pokemon-league-cup",
            title: "Pokemon League Cup",
            start_datetime: "2026-06-20T18:00:00+00:00",
            event_type: "league_cup",
            game: "pokemon",
            entry_fee: "15.00",
            registration_deadline: "2026-06-20T16:00:00+00:00",
            registration_status: "open",
            player_cap: 32,
            registered_count: 0,
            woocommerce_product_id: 8101,
          },
        },
      },
      { status: 201 },
    )
  },
})

assert.ok(push)

const result = await push({ operation })

assert.equal(result.status, "ok")
assert.equal(result.wordpress_code, "event_created")
assert.equal(result.event.slug, "pokemon-league-cup")
assert.equal(result.event.woocommerce_product_id, 8101)
assert.equal(result.event.entry_fee_minor_units, 1500)
assert.equal(result.woocommerce_product_created, true)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.equal(observedRequest.url, "https://example.test/wp-json/tcg-store/v1/events")
assert.equal(observedRequest.headers["idempotency-key"], "op-event-upsert-001")
assert.ok(observedRequest.headers.authorization.startsWith("Basic "))
assert.equal(observedRequest.body.entry_fee, "15.00")

const rejectedPush = createWordPressEventUpsertPush({
  websiteUrl: "https://example.test",
  username: "sync-user",
  applicationPassword: "secret app password",
  fetcher: async () =>
    Response.json(
      {
        error: {
          code: "event_payload_invalid",
          errors: ["title_required"],
        },
      },
      { status: 400 },
    ),
})

const rejected = await rejectedPush({ operation: { operation_id: "bad", payload: { event: {} } } })

assert.equal(rejected.status, "blocked")
assert.equal(rejected.code, "wordpress_event_payload_invalid")
assert.equal(rejected.credentials_synced_to_client, false)

assert.equal(createWordPressEventUpsertPush({ websiteUrl: "" }), null)

console.log("PASS WordPress event upsert push")
