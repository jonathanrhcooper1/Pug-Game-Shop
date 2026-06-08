import assert from "node:assert/strict"

import {
  createWordPressEventRegistrationPush,
  eventRegistrationBody,
} from "../src/wordpressEventRegistrationPush.mjs"

const operation = {
  operation_id: "op-event-registration-001",
  operation_type: "event_registration",
  entity_id: "event-registration-local-001",
  payload: {
    event: {
      event_id: "event-100",
      slug: "friday-commander-night",
      title: "Friday Commander Night",
    },
    registration: {
      registration_id: "event-registration-local-001",
      event_id: "event-100",
      attendee_label: "Local Event Guest",
      payment_status: "pay_at_store",
    },
  },
}

const body = eventRegistrationBody(operation)

assert.equal(body.first_name, "Local Event")
assert.equal(body.last_name, "Guest")
assert.equal(body.email, "event-registration-local-001@offline-registration.example.invalid")
assert.equal(body.idempotency_key, "op-event-registration-001")
assert.equal(body.event_slug, "friday-commander-night")
assert.equal(body.source, "offline_lan_sync")

let observedRequest = null
const push = createWordPressEventRegistrationPush({
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
        success: true,
        code: "registered",
        registration: {
          public_id: "wp-event-registration-001",
          event_id: 100,
          status: "reserved",
          payment_status: "not_required",
          email: "event-registration-local-001@offline-registration.example.invalid",
          created_at: "2026-06-08 21:50:00",
        },
      },
      { status: 201 },
    )
  },
})

assert.ok(push)

const result = await push({ operation })

assert.equal(result.status, "ok")
assert.equal(result.wordpress_code, "registered")
assert.equal(result.registration.public_id, "wp-event-registration-001")
assert.equal(result.registration.status, "reserved")
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.equal(observedRequest.url, "https://example.test/wp-json/tcg-store/v1/events/friday-commander-night/register")
assert.equal(observedRequest.headers["idempotency-key"], "op-event-registration-001")
assert.ok(observedRequest.headers.authorization.startsWith("Basic "))
assert.equal(observedRequest.body.first_name, "Local Event")
assert.equal(observedRequest.body.last_name, "Guest")

const rejectedPush = createWordPressEventRegistrationPush({
  websiteUrl: "https://example.test",
  fetcher: async () =>
    Response.json(
      {
        success: false,
        code: "validation_failed",
        errors: ["email_invalid"],
      },
      { status: 400 },
    ),
})

const rejected = await rejectedPush({ operation })

assert.equal(rejected.status, "blocked")
assert.equal(rejected.code, "wordpress_event_registration_rejected")
assert.equal(rejected.wordpress_code, "validation_failed")
assert.deepEqual(rejected.errors, ["email_invalid"])
assert.equal(rejected.credentials_synced_to_client, false)

assert.equal(createWordPressEventRegistrationPush({ websiteUrl: "" }), null)

console.log("PASS WordPress event registration push")
