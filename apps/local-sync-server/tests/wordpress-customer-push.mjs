import assert from "node:assert/strict"

import {
  createWordPressCustomerUpsertPush,
  customerUpsertBody,
} from "../src/wordpressCustomerUpsertPush.mjs"

const customerOperation = {
  operation_id: "op-customer-upsert-001",
  operation_type: "customer_upsert",
  entity_id: "local-customer-001",
  payload: {
    customer: {
      customer_public_id: "local-customer-001",
      display_name: "Local Customer",
      first_name: "Local",
      last_name: "Customer",
      email: "local.customer@example.test",
      status: "active",
      credit: {
        currency: "USD",
      },
    },
    sync_intent: "offline_customer_create",
  },
}

const body = customerUpsertBody(customerOperation)

assert.equal(body.customer_public_id, "local-customer-001")
assert.equal(body.display_name, "Local Customer")
assert.equal(body.first_name, "Local")
assert.equal(body.last_name, "Customer")
assert.equal(body.email, "local.customer@example.test")
assert.equal(body.credit_currency, "USD")
assert.equal(body.source, "offline_lan_sync")

let observedRequests = []
const push = createWordPressCustomerUpsertPush({
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
          code: "customer_created",
          idempotent: false,
          customer: {
            customer_id: 501,
            public_id: "9f21ecbd-7d84-46a7-b947-12bd65a6a0b0",
            display_name: "Local Customer",
            first_name: "Local",
            last_name: "Customer",
            email: "local.customer@example.test",
            status: "active",
            credit_balance: "0.0000",
            credit_currency: "USD",
            row_version: 1,
          },
        },
      },
      { status: 201 },
    )
  },
})

assert.ok(push)

const result = await push({ operation: customerOperation })

assert.equal(result.status, "ok")
assert.equal(result.wordpress_code, "customer_created")
assert.equal(result.customer.customer_id, 501)
assert.equal(result.customer.credit.balance_minor_units, 0)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.authorization_header_printed, false)
assert.equal(observedRequests[0].url, "https://example.test/wp-json/tcg-store/v1/customers")
assert.equal(observedRequests[0].headers["idempotency-key"], "op-customer-upsert-001")
assert.ok(observedRequests[0].headers.authorization.startsWith("Basic "))
assert.equal(observedRequests[0].body.customer_public_id, "local-customer-001")

const rejectedPush = createWordPressCustomerUpsertPush({
  websiteUrl: "https://example.test",
  authHeader: "Bearer staging-token",
  fetcher: async () =>
    Response.json(
      {
        error: {
          code: "tcg_customer_validation_failed",
          details: {
            errors: ["display_name_or_email_required"],
          },
        },
      },
      { status: 400 },
    ),
})

const rejected = await rejectedPush({
  operation: {
    operation_id: "op-customer-invalid",
    operation_type: "customer_upsert",
    entity_id: "invalid-customer",
    payload: {
      customer: {
        customer_public_id: "invalid-customer",
      },
    },
  },
})

assert.equal(rejected.status, "blocked")
assert.equal(rejected.code, "wordpress_customer_payload_invalid")
assert.equal(rejected.credentials_synced_to_client, false)

assert.equal(createWordPressCustomerUpsertPush({ websiteUrl: "https://example.test" }), null)

console.log("PASS WordPress customer push")
