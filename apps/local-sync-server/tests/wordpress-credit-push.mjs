import assert from "node:assert/strict"

import {
  createWordPressCreditPush,
  creditPostingBody,
} from "../src/wordpressCreditPush.mjs"

const adjustmentOperation = {
  operation_id: "op-credit-adjust-001",
  operation_type: "credit_adjustment",
  entity_id: "credit-ledger-local-001",
  payload: {
    customer: {
      customer_public_id: "customer-91",
      wordpress_customer_id: 91,
      credit: { currency: "USD" },
    },
    ledger_entry: {
      entry_id: "credit-ledger-local-001",
      entry_type: "manual_credit_add",
      amount_minor_units: 3000,
      currency: "USD",
      reason: "manager-approved store credit",
    },
    sync_intent: "offline_credit_adjustment",
  },
}

const adjustmentBody = creditPostingBody(adjustmentOperation)

assert.equal(adjustmentBody.amount, "30.00")
assert.equal(adjustmentBody.currency, "USD")
assert.equal(adjustmentBody.reason, "manager-approved store credit")
assert.equal(adjustmentBody.offline_operation_id, "op-credit-adjust-001")
assert.equal(adjustmentBody.metadata.local_entry_id, "credit-ledger-local-001")
assert.equal(adjustmentBody.metadata.customer_public_id, "customer-91")

let observedRequests = []
const push = createWordPressCreditPush({
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
          code: "posted",
          idempotent: false,
          customer_id: 91,
          ledger_entry_id: 501,
          balance_after: {
            amount: "276.0000",
            currency: "USD",
          },
        },
      },
      { status: 201 },
    )
  },
})

assert.ok(push)

const adjustmentResult = await push({ operation: adjustmentOperation })

assert.equal(adjustmentResult.status, "ok")
assert.equal(adjustmentResult.wordpress_code, "posted")
assert.equal(adjustmentResult.credit.ledger_entry_id, 501)
assert.equal(adjustmentResult.credentials_synced_to_client, false)
assert.equal(adjustmentResult.authorization_header_printed, false)
assert.equal(observedRequests[0].url, "https://example.test/wp-json/tcg-store/v1/customers/91/credit/adjust")
assert.equal(observedRequests[0].headers["idempotency-key"], "op-credit-adjust-001")
assert.ok(observedRequests[0].headers.authorization.startsWith("Basic "))
assert.equal(observedRequests[0].body.amount, "30.00")

const redemptionResult = await push({
  operation: {
    ...adjustmentOperation,
    operation_id: "op-credit-redeem-001",
    operation_type: "credit_redemption",
    payload: {
      ...adjustmentOperation.payload,
      ledger_entry: {
        ...adjustmentOperation.payload.ledger_entry,
        amount_minor_units: -1000,
        reason: "Square handoff credit use",
      },
    },
  },
})

assert.equal(redemptionResult.status, "ok")
assert.equal(observedRequests[1].url, "https://example.test/wp-json/tcg-store/v1/customers/91/credit/redeem")
assert.equal(observedRequests[1].body.amount, "-10.00")

const rejectedPush = createWordPressCreditPush({
  websiteUrl: "https://example.test",
  authHeader: "Bearer staging-token",
  fetcher: async () =>
    Response.json(
      {
        data: {
          accepted: false,
          code: "insufficient_credit",
        },
      },
      { status: 409 },
    ),
})

const rejected = await rejectedPush({ operation: adjustmentOperation })

assert.equal(rejected.status, "blocked")
assert.equal(rejected.code, "wordpress_credit_push_rejected")
assert.equal(rejected.wordpress_code, "insufficient_credit")
assert.equal(rejected.credentials_synced_to_client, false)

assert.equal(createWordPressCreditPush({ websiteUrl: "https://example.test" }), null)

console.log("PASS WordPress credit push")
