import assert from "node:assert/strict"

import {
  createWordPressEventCheckinPush,
  eventCheckinBody,
} from "../src/wordpressEventCheckinPush.mjs"

const eventCheckinOperation = {
  operation_id: "op-event-checkin-001",
  operation_type: "event_checkin",
  entity_id: "event-checkin-001",
  payload: {
    event: {
      event_id: "event-100",
      slug: "weekly-pokemon",
    },
    checkin: {
      checkin_id: "event-checkin-001",
      event_id: "event-100",
      registration_public_id: "registration-001",
      attendee_label: "Ada Lovelace",
      checkin_method: "manual_lookup",
    },
  },
}

const body = eventCheckinBody(eventCheckinOperation)

assert.equal(body.event_slug, "weekly-pokemon")
assert.equal(body.registration_public_id, "registration-001")
assert.equal(body.attendee_label, "Ada Lovelace")
assert.equal(body.checkin_method, "manual_lookup")
assert.equal(body.local_checkin_id, "event-checkin-001")
assert.equal(body.source, "offline_lan_sync")

let observedRequests = []
const push = createWordPressEventCheckinPush({
  websiteUrl: "https://example.test",
  username: "sync-user",
  applicationPassword: "secret app password",
  fetcher: async (url, init) => {
    observedRequests.push({
      url: url.toString(),
      headers: init.headers,
      body: JSON.parse(init.body),
    })

    return Response.json(
      {
        data: {
          accepted: true,
          code: "event_checked_in",
          idempotent: false,
          checkin: {
            checkin_id: 808,
            event_public_id: "event-public-100",
            event_slug: "weekly-pokemon",
            registration_id: 501,
            checkin_method: "manual_lookup",
            device_id: "offline_lan_sync",
            checked_in_at: "2026-06-08 22:15:00",
          },
        },
      },
      { status: 201 },
    )
  },
})

assert.ok(push)

const result = await push({ operation: eventCheckinOperation })

assert.equal(result.status, "ok")
assert.equal(result.wordpress_code, "event_checked_in")
assert.equal(result.checkin.checkin_id, 808)
assert.equal(result.checkin.accepted, true)
assert.equal(result.checkin.idempotent, false)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.equal(observedRequests[0].url, "https://example.test/wp-json/tcg-store/v1/events/weekly-pokemon/check-ins")
assert.equal(observedRequests[0].headers["idempotency-key"], "op-event-checkin-001")
assert.ok(observedRequests[0].headers.authorization.startsWith("Basic "))
assert.equal(observedRequests[0].body.registration_public_id, "registration-001")

const invalid = await push({
  operation: {
    operation_id: "op-event-checkin-invalid",
    operation_type: "event_checkin",
    entity_id: "event-checkin-invalid",
    payload: {
      event: {
        event_id: "",
      },
      checkin: {
        checkin_id: "",
      },
    },
  },
})

assert.equal(invalid.status, "blocked")
assert.equal(invalid.code, "wordpress_event_checkin_payload_invalid")
assert.equal(invalid.credentials_synced_to_client, false)

assert.equal(createWordPressEventCheckinPush({ websiteUrl: "https://example.test" }), null)

console.log("PASS WordPress event check-in push")
