import assert from "node:assert/strict"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

let squareSalesPullCalls = 0

const wordpressInventoryItems = [
  {
    public_id: "wp-square-report-1",
    row_version: 3,
    game: "pokemon",
    card_name: "Square Report Charizard",
    set_name: "Connector Test",
    condition_code: "NM",
    barcode: "PUG-SQ-SALES-01",
    sale_price: "50.00",
    sale_currency: "USD",
    status: "available",
    online_visibility: "visible",
    kiosk_visibility: "visible",
    pos_visibility: "visible",
    square_catalog_item_id: "SQ-ITEM-CHARIZARD",
    square_catalog_variation_id: "SQ-VAR-CHARIZARD",
    external_sync_state: "square_synced",
  },
]

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://example.test/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath: ":memory:",
    squareLocationId: "LOC-PUG-1",
    squareEnvironment: "production",
    wordpressInventoryPull: async () => ({
      status: "ok",
      items: wordpressInventoryItems,
      meta: {
        page: 1,
        page_size: 10,
        total: wordpressInventoryItems.length,
        has_more: false,
      },
      credentials_synced_to_client: false,
      authorization_header_printed: false,
    }),
    squareSalesReportsPuller: {
      status: () => ({
        configured: true,
        environment: "production",
        location_id_configured: true,
        access_token_configured: true,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }),
      pullSalesReport: async (input) => {
        squareSalesPullCalls += 1
        assert.equal(input.locationId, "LOC-PUG-1")
        assert.equal(input.date_from, "2026-06-01")
        assert.equal(input.date_to, "2026-06-02")

        return {
          status: "ok",
          code: "square_sales_report_pulled",
          report: "square_sales",
          environment: "production",
          location_id: "LOC-PUG-1",
          location_id_source: "configured",
          date_from_utc: "2026-06-01T00:00:00.000Z",
          date_to_utc: "2026-06-02T23:59:59.999Z",
          payment_count: 1,
          completed_payment_count: 1,
          order_count: 1,
          line_item_count: 1,
          gross_sales_minor_units: 5000,
          gross_sales: "$50.00",
          refunded_minor_units: 0,
          processing_fee_minor_units: 160,
          currency: "USD",
          rows: [
            {
              date: "2026-06-01",
              channel: "square_pos_live",
              payment_id: "PAYMENT-REPORT-1",
              payment_status: "COMPLETED",
              order_id: "ORDER-REPORT-1",
              receipt_number: "RCP-REPORT-1",
              receipt_url: "https://squareup.com/receipt/preview/PAYMENT-REPORT-1",
              payment_method: "CARD",
              card_brand: "VISA",
              card_last_4: "1111",
              team_member_id: "tm-square-1",
              location_id: "LOC-PUG-1",
              item_name: "Square Report Charizard",
              quantity: 1,
              catalog_object_id: "SQ-VAR-CHARIZARD",
              catalog_version: 172000001,
              gross_sales_minor_units: 5000,
              gross_sales: "$50.00",
              currency: "USD",
              source: "square_api_report",
            },
          ],
          summary_by_date: [],
          summary_by_item: [],
          cursor_exhausted: true,
          max_page_guard_hit: false,
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
      },
    },
  },
})

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))

try {
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const managerAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "9999" },
  })
  const staffAuth = await fetchJson(`${baseUrl}/auth/pin`, {
    method: "POST",
    body: { pin: "1234" },
  })

  await fetchJson(`${baseUrl}/sync/pull`, {
    method: "POST",
    token: managerAuth.session.token,
    body: {
      domains: ["inventory"],
      query: "Square Report",
      page: 1,
      page_size: 10,
      manual_remote_authority: true,
    },
  })

  const before = await fetchJson(`${baseUrl}/inventory/search?q=Square%20Report`)
  assert.equal(before.items.find((item) => item.barcode === "PUG-SQ-SALES-01")?.status, "available")

  const blockedStaffPull = await fetchJson(`${baseUrl}/pos/square/reports/sales/pull`, {
    method: "POST",
    token: staffAuth.session.token,
    expectedStatus: 409,
    body: {
      date_from: "2026-06-01",
      date_to: "2026-06-02",
    },
  })
  assert.equal(blockedStaffPull.status, "blocked")
  assert.equal(blockedStaffPull.code, "manager_required")

  const pull = await fetchJson(`${baseUrl}/pos/square/reports/sales/pull`, {
    method: "POST",
    token: managerAuth.session.token,
    body: {
      date_from: "2026-06-01",
      date_to: "2026-06-02",
    },
  })

  assert.equal(pull.status, "ok")
  assert.equal(pull.action, "square_sales_report_snapshot_saved")
  assert.equal(pull.payment_count, 1)
  assert.equal(pull.line_item_count, 1)
  assert.equal(pull.rows[0].channel, "square_pos")
  assert.equal(pull.rows[0].sku, "PUG-SQ-SALES-01")
  assert.equal(pull.rows[0].barcode, "PUG-SQ-SALES-01")
  assert.equal(pull.rows[0].square_catalog_variation_id, "SQ-VAR-CHARIZARD")
  assert.equal(pull.rows[0].local_reconciliation_status, "square_only_mapped")
  assert.equal(pull.customer_credit_authority, "local_store_credit_ledger_not_square")
  assert.equal(pull.inventory_mutated, false)
  assert.equal(pull.fake_sales_created, false)
  assert.equal(JSON.stringify(pull).includes("EAAA"), false)

  const after = await fetchJson(`${baseUrl}/inventory/search?q=Square%20Report`)
  assert.equal(after.items.find((item) => item.barcode === "PUG-SQ-SALES-01")?.status, "available")

  const salesReport = await fetchJson(`${baseUrl}/reports/sales?channel=square_pos`, {
    token: managerAuth.session.token,
  })
  assert.equal(salesReport.status, "ok")
  assert.equal(salesReport.report, "sales")
  assert.equal(salesReport.rows.some((row) => row.source === "square_api_report"), true)
  const squareSalesRow = salesReport.rows.find((row) => row.source === "square_api_report")
  assert.equal(squareSalesRow.barcode, "PUG-SQ-SALES-01")
  assert.equal(squareSalesRow.gross_sales_minor_units, 5000)
  assert.equal(squareSalesRow.local_reconciliation_status, "square_only_mapped")

  const reconciliationReport = await fetchJson(`${baseUrl}/reports/square_reconciliation?channel=square_pos`, {
    token: managerAuth.session.token,
  })
  assert.equal(reconciliationReport.status, "ok")
  assert.equal(reconciliationReport.report, "square_reconciliation")
  assert.equal(
    reconciliationReport.rows.some((row) => row.square_catalog_variation_id === "SQ-VAR-CHARIZARD"),
    true,
  )

  const syncStatus = await fetchJson(`${baseUrl}/sync/status`)
  assert.equal(syncStatus.square_sales_report_puller_connected, true)
  assert.equal(syncStatus.square_sales_report_puller_status.raw_credentials_returned, false)
  assert.equal(syncStatus.last_square_sales_report_pull.line_item_count, 1)
  assert.equal(syncStatus.last_square_sales_report_pull.rows, undefined)
  assert.equal(syncStatus.last_square_sales_report_pull.fake_sales_created, false)
  assert.equal(squareSalesPullCalls, 1)
  assert.equal(JSON.stringify(syncStatus).includes("EAAA"), false)

  console.log("PASS local sync Square sales reporting")
} finally {
  await new Promise((resolve) => server.close(resolve))
}

async function fetchJson(url, options = {}) {
  const headers = { "content-type": "application/json" }

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await response.json()

  assert.equal(
    response.status,
    options.expectedStatus ?? 200,
    `${url} returned ${response.status}: ${JSON.stringify(body)}`,
  )

  return body
}
