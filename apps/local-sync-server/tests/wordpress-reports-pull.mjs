import assert from "node:assert/strict"

import {
  createWordPressReportsPull,
  reportDataFromWordPressResponse,
} from "../src/wordpressReportsPull.mjs"

const sampleResponse = {
  status: "planned",
  data: {
    report: "sales",
    filters: {
      channel: "square_pos",
      staff_user_id: 22,
      page_size: 50,
    },
    columns: [
      { key: "channel", label: "Channel", type: "text" },
      { key: "gross_sales", label: "Gross Sales", type: "money" },
    ],
    rows: [
      {
        channel: "square_pos",
        gross_sales: "125.00",
      },
    ],
  },
  meta: {
    csv_header: "\"Channel\",\"Gross Sales\"\n",
    dashboard_plan: {
      capability: "view_reports",
      public: false,
    },
  },
}

const parsed = reportDataFromWordPressResponse(sampleResponse, "inventory")
assert.equal(parsed.report, "sales")
assert.equal(parsed.rows.length, 1)
assert.equal(parsed.csv_header, "\"Channel\",\"Gross Sales\"\n")
assert.equal(parsed.credentials_synced_to_client, false)
assert.equal(parsed.authorization_header_printed, false)

const observedRequests = []
const pull = createWordPressReportsPull({
  websiteUrl: "https://example.test/",
  username: "manager",
  applicationPassword: "app-password",
  fetcher: async (url, options) => {
    observedRequests.push({
      url: url.toString(),
      method: options.method ?? "GET",
      headers: options.headers,
    })

    return jsonResponse(sampleResponse)
  },
})

assert.ok(pull)
const result = await pull({
  report: "sales",
  filters: {
    channel: "square_pos",
    staffUserId: 22,
    pageSize: 999,
    game: "Pokemon!",
  },
})

assert.equal(result.status, "ok")
assert.equal(result.report, "sales")
assert.equal(result.rows.length, 1)
assert.equal(result.authorization_header_printed, false)
assert.equal(result.credentials_synced_to_client, false)
assert.equal(
  observedRequests[0].url,
  "https://example.test/wp-json/tcg-store/v1/reports/sales?staff_user_id=22&channel=square_pos&game=pokemon&page=1&page_size=250",
)
assert.equal(observedRequests[0].method, "GET")
assert.match(observedRequests[0].headers.authorization, /^Basic /)

assert.equal(createWordPressReportsPull({ websiteUrl: "https://example.test" }), null)

console.log("PASS WordPress reports pull")

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}
