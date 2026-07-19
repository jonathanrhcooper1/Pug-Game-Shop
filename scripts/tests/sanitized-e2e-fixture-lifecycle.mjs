import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"

import {
  cleanupSanitizedFixtures,
  FIXTURE_LOCATION,
  FIXTURE_SUITE_ID,
  setupSanitizedFixtures,
} from "../test-data/pug-sanitized-e2e-fixtures-lib.mjs"

const directory = mkdtempSync(join(tmpdir(), "pug-sanitized-e2e-"))
const databasePath = join(directory, "fixture.sqlite")
const manifestPath = join(directory, "fixture-manifest.json")

try {
  const dryRun = await setupSanitizedFixtures({ databasePath, manifestPath })
  assert.equal(dryRun.status, "dry_run")
  assert.equal(dryRun.external_writes, false)

  await assert.rejects(
    setupSanitizedFixtures({ databasePath, manifestPath, apply: true, bootstrapIsolated: true }),
    /writes are disabled/i,
  )

  const setup = await setupSanitizedFixtures({
    databasePath,
    manifestPath,
    pin: "1420",
    apply: true,
    allowLocalWrite: true,
    bootstrapIsolated: true,
  })
  assert.equal(setup.status, "ok")
  assert.equal(setup.action, "setup")
  assert.equal(setup.manifest.fixture_suite, FIXTURE_SUITE_ID)
  assert.equal(setup.manifest.safeguards.external_writes_performed, false)
  assert.equal(setup.verification.missing.length, 0)

  const database = new DatabaseSync(databasePath, { readOnly: true })
  try {
    const trade = database.prepare("SELECT items_json, status FROM trade_in_orders WHERE order_id = ?")
      .get(setup.manifest.logical_records.trade_order_id)
    const kiosk = database.prepare("SELECT status FROM kiosk_orders WHERE order_id = ?")
      .get(setup.manifest.logical_records.kiosk_order_id)
    const reservation = database.prepare("SELECT status FROM inventory_reservations WHERE reservation_id = ?")
      .get(setup.manifest.logical_records.reservation_ids[0])
    const review = database.prepare("SELECT review_status FROM price_review_items WHERE review_id = ?")
      .get(setup.manifest.logical_records.price_review_id)
    const inventory = database.prepare("SELECT status, location FROM inventory_items WHERE public_id = ?")
      .get(setup.manifest.logical_records.inventory_public_id)

    assert.equal(JSON.parse(trade.items_json).length, 2)
    assert.equal(trade.status, "draft")
    assert.equal(kiosk.status, "queued")
    assert.equal(reservation.status, "active")
    assert.equal(review.review_status, "pending")
    assert.equal(inventory.status, "reserved")
    assert.equal(inventory.location, FIXTURE_LOCATION)
  } finally {
    database.close()
  }

  const repeated = await setupSanitizedFixtures({
    databasePath,
    manifestPath,
    pin: "1420",
    apply: true,
    allowLocalWrite: true,
    bootstrapIsolated: true,
  })
  assert.equal(repeated.action, "already_setup")

  const cleanupPlan = cleanupSanitizedFixtures({ databasePath, manifestPath })
  assert.equal(cleanupPlan.status, "dry_run")
  assert.ok(cleanupPlan.verification.present.length > 0)

  const cleanup = cleanupSanitizedFixtures({
    databasePath,
    manifestPath,
    apply: true,
    allowLocalWrite: true,
  })
  assert.equal(cleanup.status, "ok")
  assert.equal(cleanup.action, "cleanup")
  assert.equal(JSON.parse(readFileSync(manifestPath, "utf8")).status, "cleaned")

  const verifyDatabase = new DatabaseSync(databasePath, { readOnly: true })
  try {
    for (const record of setup.manifest.records) {
      const key = {
        inventory_items: "public_id",
        trade_in_orders: "order_id",
        kiosk_orders: "order_id",
        operation_queue: "operation_id",
        inventory_reservations: "reservation_id",
        inventory_ledger_entries: "ledger_id",
        sync_outbox_events: "event_id",
        sync_outbox_deliveries: "delivery_id",
        price_observations: "observation_id",
        price_decisions: "decision_id",
        price_review_items: "review_id",
      }[record.table]
      assert.equal(verifyDatabase.prepare(`SELECT COUNT(*) AS count FROM ${record.table} WHERE ${key} = ?`).get(record.id).count, 0)
    }
  } finally {
    verifyDatabase.close()
  }

  const repeatedCleanup = cleanupSanitizedFixtures({
    databasePath,
    manifestPath,
    apply: true,
    allowLocalWrite: true,
  })
  assert.equal(repeatedCleanup.action, "already_cleaned")

  const configuredDatabase = new DatabaseSync(databasePath)
  try {
    configuredDatabase.prepare(`
      INSERT INTO server_settings (setting_key, setting_value_json, updated_at_utc)
      VALUES ('one_website_setup', ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value_json = excluded.setting_value_json
    `).run(JSON.stringify({ websiteUrl: "https://store.example.com" }), new Date().toISOString())
  } finally {
    configuredDatabase.close()
  }
  await assert.rejects(
    setupSanitizedFixtures({
      databasePath,
      manifestPath,
      pin: "1420",
      apply: true,
      allowLocalWrite: true,
    }),
    /configured for a public website/i,
  )

  const preexistingLocationDatabase = new DatabaseSync(databasePath)
  try {
    preexistingLocationDatabase.prepare("DELETE FROM server_settings WHERE setting_key = 'one_website_setup'").run()
    preexistingLocationDatabase.prepare(`
      INSERT INTO server_settings (setting_key, setting_value_json, updated_at_utc)
      VALUES ('inventory_locations', ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value_json = excluded.setting_value_json
    `).run(JSON.stringify([FIXTURE_LOCATION, "Permanent QA Shelf"]), new Date().toISOString())
  } finally {
    preexistingLocationDatabase.close()
  }

  const preexistingLocationSetup = await setupSanitizedFixtures({
    databasePath,
    manifestPath,
    pin: "1420",
    apply: true,
    allowLocalWrite: true,
  })
  assert.deepEqual(preexistingLocationSetup.manifest.owned_settings.inventory_locations, [])
  cleanupSanitizedFixtures({ databasePath, manifestPath, apply: true, allowLocalWrite: true })

  const locationVerificationDatabase = new DatabaseSync(databasePath, { readOnly: true })
  try {
    const locations = JSON.parse(locationVerificationDatabase.prepare(
      "SELECT setting_value_json FROM server_settings WHERE setting_key = 'inventory_locations'",
    ).get().setting_value_json)
    assert.ok(locations.includes(FIXTURE_LOCATION))
    assert.ok(locations.includes("Permanent QA Shelf"))
  } finally {
    locationVerificationDatabase.close()
  }
  console.log("PASS sanitized reversible end-to-end fixture lifecycle")
} finally {
  rmSync(directory, { recursive: true, force: true })
}
