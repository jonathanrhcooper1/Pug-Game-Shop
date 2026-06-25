import assert from "node:assert/strict"

import { createSquareSalesReportsPuller } from "../src/squareSalesReportsPuller.mjs"

const observedRequests = []
const puller = createSquareSalesReportsPuller({
  accessToken: "EAAA-square-sales-secret-do-not-print",
  environment: "production",
  locationId: "LOC-PUG-1",
  apiVersion: "2026-05-20",
  maxPages: 5,
  fetcher: async (url, options) => {
    const request = {
      url: String(url),
      method: options.method,
      headers: options.headers,
      body: options.body ? JSON.parse(options.body) : null,
    }
    observedRequests.push(request)

    if (String(url).startsWith("https://connect.squareup.com/v2/payments")) {
      const parsed = new URL(String(url))

      if (!parsed.searchParams.get("cursor")) {
        return jsonResponse({
          payments: [
            squarePayment({
              id: "PAYMENT-1",
              orderId: "ORDER-1",
              createdAt: "2026-06-01T14:30:00.000Z",
              amount: 5000,
              receiptNumber: "RCP-1",
            }),
          ],
          cursor: "cursor-page-2",
        })
      }

      return jsonResponse({
        payments: [
          squarePayment({
            id: "PAYMENT-2",
            orderId: "",
            createdAt: "2026-06-02T16:45:00.000Z",
            amount: 7500,
            receiptNumber: "RCP-2",
          }),
        ],
      })
    }

    if (String(url) === "https://connect.squareup.com/v2/orders/batch-retrieve") {
      return jsonResponse({
        orders: [
          {
            id: "ORDER-1",
            location_id: "LOC-PUG-1",
            created_at: "2026-06-01T14:29:00.000Z",
            updated_at: "2026-06-01T14:31:00.000Z",
            state: "COMPLETED",
            line_items: [
              {
                uid: "LINE-1",
                name: "Charizard Base Set",
                quantity: "1",
                catalog_object_id: "SQ-VAR-CHARIZARD",
                catalog_version: 172000001,
                total_money: {
                  amount: 5000,
                  currency: "USD",
                },
              },
            ],
            total_money: {
              amount: 5000,
              currency: "USD",
            },
          },
        ],
      })
    }

    return jsonResponse({ errors: [{ code: "UNEXPECTED_URL", detail: String(url) }] }, 404)
  },
})

assert.equal(puller.status().configured, true)
assert.equal(puller.status().environment, "production")
assert.equal(puller.status().raw_credentials_returned, false)

const result = await puller.pullSalesReport({
  date_from: "2026-06-01",
  date_to: "2026-06-02",
})

assert.equal(result.status, "ok")
assert.equal(result.code, "square_sales_report_pulled")
assert.equal(result.location_id, "LOC-PUG-1")
assert.equal(result.payment_count, 2)
assert.equal(result.completed_payment_count, 2)
assert.equal(result.order_count, 1)
assert.equal(result.line_item_count, 2)
assert.equal(result.gross_sales_minor_units, 12500)
assert.equal(result.rows[0].catalog_object_id, "SQ-VAR-CHARIZARD")
assert.equal(result.rows[0].receipt_url, "https://squareup.com/receipt/preview/PAYMENT-1")
assert.equal(result.rows[1].item_name, "Square payment without order line item")
assert.equal(result.summary_by_date.length, 2)
assert.equal(result.summary_by_item[0].gross_sales_minor_units, 5000)
assert.equal(result.cursor_exhausted, true)
assert.equal(result.max_page_guard_hit, false)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(result.raw_credentials_returned, false)
assert.equal(JSON.stringify(result).includes("EAAA-square-sales-secret-do-not-print"), false)

const firstPaymentRequest = new URL(observedRequests[0].url)
assert.equal(firstPaymentRequest.origin, "https://connect.squareup.com")
assert.equal(firstPaymentRequest.pathname, "/v2/payments")
assert.equal(firstPaymentRequest.searchParams.get("begin_time"), "2026-06-01T00:00:00.000Z")
assert.equal(firstPaymentRequest.searchParams.get("end_time"), "2026-06-02T23:59:59.999Z")
assert.equal(firstPaymentRequest.searchParams.get("location_id"), "LOC-PUG-1")
assert.equal(firstPaymentRequest.searchParams.get("limit"), "100")
assert.equal(observedRequests[0].headers.authorization, "Bearer EAAA-square-sales-secret-do-not-print")
assert.equal(observedRequests[0].headers["square-version"], "2026-05-20")

assert.equal(observedRequests[1].url.includes("cursor=cursor-page-2"), true)
assert.equal(observedRequests[2].url, "https://connect.squareup.com/v2/orders/batch-retrieve")
assert.equal(observedRequests[2].method, "POST")
assert.deepEqual(observedRequests[2].body, {
  location_id: "LOC-PUG-1",
  order_ids: ["ORDER-1"],
})

const unconfigured = createSquareSalesReportsPuller({ accessToken: "" })
const blocked = await unconfigured.pullSalesReport()
assert.equal(blocked.status, "blocked")
assert.equal(blocked.code, "square_sales_report_puller_unconfigured")

console.log("PASS Square sales reports puller")

function squarePayment({ id, orderId, createdAt, amount, receiptNumber }) {
  return {
    id,
    created_at: createdAt,
    updated_at: createdAt,
    amount_money: {
      amount,
      currency: "USD",
    },
    total_money: {
      amount,
      currency: "USD",
    },
    approved_money: {
      amount,
      currency: "USD",
    },
    status: "COMPLETED",
    source_type: "CARD",
    location_id: "LOC-PUG-1",
    order_id: orderId,
    receipt_number: receiptNumber,
    receipt_url: `https://squareup.com/receipt/preview/${id}`,
    card_details: {
      card: {
        card_brand: "VISA",
        last_4: "1111",
      },
    },
    processing_fee: [
      {
        amount_money: {
          amount: 160,
          currency: "USD",
        },
      },
    ],
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}
