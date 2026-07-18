import assert from "node:assert/strict"

import { createWordPressScryDexWebhookRelay } from "../src/wordpressScryDexWebhookRelay.mjs"

const requests = []
const relay = createWordPressScryDexWebhookRelay({
  websiteUrl: "https://example.test",
  username: "relay-user",
  applicationPassword: "test-app-password",
  fetcher: async (endpoint, options) => {
    requests.push({ endpoint: endpoint.toString(), options })
    if (options.method === "POST") {
      return response(200, {
        data: {
          status: "ok",
          provider_event_id: "evt-1",
          processing_status: JSON.parse(options.body).status,
        },
      })
    }

    return response(200, {
      data: {
        status: "ok",
        count: 1,
        events: [{
          id: "evt-1",
          name: "pokemon.expansions.prices.raw_updated",
          data: { expansion_ids: ["sv8", "sv8", ""] },
          payload_hash: "a".repeat(64),
          processing_status: "ready_for_lan",
          relay_attempt_count: 0,
        }],
      },
    })
  },
})

assert.equal(relay.status().configured, true)
const pulled = await relay.pull({ limit: 500 })
assert.equal(pulled.status, "ok")
assert.equal(pulled.events.length, 1)
assert.deepEqual(pulled.events[0].data.expansion_ids, ["sv8"])
assert.match(requests[0].endpoint, /limit=100/)
assert.match(requests[0].options.headers.authorization, /^Basic /)
assert.equal(requests[0].endpoint.includes("test-app-password"), false)

const claimed = await relay.transition("evt-1", { status: "processing" })
assert.equal(claimed.status, "ok")
assert.equal(claimed.transition.processing_status, "processing")
assert.equal(JSON.parse(requests[1].options.body).status, "processing")

const completed = await relay.transition("evt-1", {
  status: "processed",
  resultReference: "scrydex-job-1",
})
assert.equal(completed.status, "ok")
assert.equal(completed.transition.processing_status, "processed")

const invalid = await relay.transition("bad/event", { status: "processed" })
assert.equal(invalid.code, "wordpress_scrydex_webhook_relay_event_id_invalid")
assert.equal(requests.length, 3)

console.log("PASS authenticated WordPress ScryDex webhook relay pull, claim, and acknowledgement")

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body
    },
  }
}
