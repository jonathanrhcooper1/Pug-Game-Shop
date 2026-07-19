import assert from "node:assert/strict"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const store = createLocalSyncStore({
  databasePath: ":memory:",
  seedDemoInventory: true,
})

try {
  const managerAuth = store.createSession({ pin: "9999" })
  assert.equal(managerAuth.status, "ok")

  const staffUser = store.addUser(managerAuth.session.token, {
    name: "Credit Counter Staff",
    pin: "2468",
    role: "staff",
    access: ["Customers"],
  })
  assert.equal(staffUser.status, "ok")

  const staffAuth = store.createSession({ pin: "2468" })
  assert.equal(staffAuth.status, "ok")

  const createdCustomer = store.createCustomer(managerAuth.session.token, {
    first_name: "Credit",
    last_name: "Adjustment",
    email: "credit.adjustment@example.test",
  })
  assert.equal(createdCustomer.status, "ok")

  const managerAdd = store.createCreditAdjustment(managerAuth.session.token, {
    customer_public_id: createdCustomer.customer.customer_public_id,
    amount_minor_units: 2000,
    reason: "manager credit setup",
  })
  assert.equal(managerAdd.status, "ok")
  assert.equal(managerAdd.customer.credit.balance_minor_units, 2000)
  assert.equal(managerAdd.manager_approved, true)

  const staffAdd = store.createCreditAdjustment(staffAuth.session.token, {
    customer_public_id: createdCustomer.customer.customer_public_id,
    amount_minor_units: 500,
    reason: "staff add should be blocked",
  })
  assert.equal(staffAdd.status, "blocked")
  assert.equal(staffAdd.code, "manager_credit_add_required")

  const missingReasonRemoval = store.createCreditAdjustment(staffAuth.session.token, {
    customer_public_id: createdCustomer.customer.customer_public_id,
    amount_minor_units: -500,
    reason: "",
  })
  assert.equal(missingReasonRemoval.status, "blocked")
  assert.equal(missingReasonRemoval.code, "credit_removal_reason_required")

  const staffRemoval = store.createCreditAdjustment(staffAuth.session.token, {
    customer_public_id: createdCustomer.customer.customer_public_id,
    amount_minor_units: -500,
    reason: "duplicate trade credit correction",
  })
  assert.equal(staffRemoval.status, "ok")
  assert.equal(staffRemoval.customer.credit.balance_minor_units, 1500)
  assert.equal(staffRemoval.manager_approved, false)
  assert.equal(staffRemoval.ledger_entry.source, "staff_credit_adjustment")
  assert.equal(staffRemoval.ledger_entry.reason, "duplicate trade credit correction")

  const overRemoval = store.createCreditAdjustment(staffAuth.session.token, {
    customer_public_id: createdCustomer.customer.customer_public_id,
    amount_minor_units: -2000,
    reason: "too much removal",
  })
  assert.equal(overRemoval.status, "blocked")
  assert.equal(overRemoval.code, "insufficient_credit")
} finally {
  store.close()
}

console.log("PASS local sync credit adjustment")
