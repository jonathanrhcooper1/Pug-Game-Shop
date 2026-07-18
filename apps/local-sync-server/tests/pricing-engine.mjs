import assert from "node:assert/strict"

import {
  calculateAutomaticSalePrice,
  convertSourcePriceToUsd,
  decimalPriceToSourceMinorUnits,
  normalizePriceCurrency,
  priceChangeBasisPoints,
  priceChangeRequiresReview,
  roundCustomerSalePriceMinorUnits,
  selectExactVariantPricePoint,
} from "../src/pricingEngine.mjs"

assert.equal(roundCustomerSalePriceMinorUnits(100), 100)
assert.equal(roundCustomerSalePriceMinorUnits(101), 200)
assert.equal(roundCustomerSalePriceMinorUnits(425), 500)
assert.equal(roundCustomerSalePriceMinorUnits(1000), 1000)
assert.deepEqual(calculateAutomaticSalePrice({ sourceUsdMinorUnits: 425, effectiveFloorMinorUnits: 700 }), {
  source_usd_minor_units: 425,
  markup_basis_points: 1000,
  marked_up_minor_units: 468,
  rounded_minor_units: 500,
  effective_floor_minor_units: 700,
  floor_applied: true,
  candidate_price_minor_units: 700,
})

assert.equal(priceChangeBasisPoints(1000, 1100), 1000)
assert.equal(priceChangeRequiresReview(1000, 1100, 1000), false)
assert.equal(priceChangeRequiresReview(1000, 1101, 1000), true)
assert.equal(priceChangeRequiresReview(1000, 899, 1000), true)

assert.equal(normalizePriceCurrency("Japanese Yen"), "JPY")
assert.equal(normalizePriceCurrency("¥"), "JPY")
assert.equal(decimalPriceToSourceMinorUnits("1500", "JPY"), 1500)
assert.equal(decimalPriceToSourceMinorUnits("12.34", "USD"), 1234)

const converted = convertSourcePriceToUsd({
  sourceAmountMinorUnits: 1500,
  sourceCurrency: "JPY",
  fxQuote: { rate: 0.0067, provider: "fixture", observed_at_utc: "2026-07-18T12:00:00Z" },
  now: new Date("2026-07-18T13:00:00Z"),
})
assert.equal(converted.status, "ok")
assert.equal(converted.converted_usd_minor_units, 1005)
assert.equal(convertSourcePriceToUsd({ sourceAmountMinorUnits: 1500, sourceCurrency: "JPY" }).reason_code, "jpy_conversion_unavailable")
assert.equal(convertSourcePriceToUsd({
  sourceAmountMinorUnits: 1500,
  sourceCurrency: "JPY",
  fxQuote: { rate: 0.0067, observed_at_utc: "2026-07-01T12:00:00Z" },
  now: new Date("2026-07-18T13:00:00Z"),
}).reason_code, "fx_rate_stale")

const points = [
  point({ provider_variant_id: "other", condition_code: "NM", market_price_minor_units: 9999 }),
  point({ condition_code: "NM", market_price_minor_units: 1200 }),
  point({ condition_code: "LP", market_price_minor_units: 1000 }),
]
const lpExact = selectExactVariantPricePoint(points, {
  raw_or_graded: "raw",
  provider_variant_id: "variant-a",
  variant_count: 1,
  condition: "LP",
})
assert.equal(lpExact.status, "ok")
assert.equal(lpExact.source_amount_minor_units, 1000)
assert.equal(lpExact.condition_fallback_used, false)

const mpFallback = selectExactVariantPricePoint(points, {
  raw_or_graded: "raw",
  provider_variant_id: "variant-a",
  variant_count: 1,
  condition: "MP",
})
assert.equal(mpFallback.status, "ok")
assert.equal(mpFallback.selected_condition, "LP")
assert.equal(mpFallback.condition_fallback_used, true)

const variantBlocked = selectExactVariantPricePoint(points, {
  raw_or_graded: "raw",
  provider_variant_id: "variant-a",
  variant_count: 2,
  condition: "LP",
})
assert.equal(variantBlocked.status, "review_required")
assert.equal(variantBlocked.reason_code, "exact_variant_price_missing")

const graded = selectExactVariantPricePoint([
  point({ raw_or_graded: "graded", grading_company: "PSA", grade: "10", market_price_minor_units: 30000 }),
  point({ raw_or_graded: "graded", grading_company: "BGS", grade: "10", market_price_minor_units: 40000 }),
], {
  raw_or_graded: "graded",
  grading_company: "PSA",
  grade: "9",
  variant_count: 1,
})
assert.equal(graded.status, "ok")
assert.equal(graded.selected_grading_company, "psa")
assert.equal(graded.selected_grade, "10")
assert.equal(graded.grade_fallback_used, true)
assert.equal(graded.source_amount_minor_units, 30000)

console.log("PASS centralized pricing engine")

function point(overrides = {}) {
  return {
    provider_variant_id: "",
    reference_variant_id: null,
    condition_code: "",
    raw_or_graded: "raw",
    grading_company: "",
    grade: "",
    market_price_minor_units: 0,
    mid_price_minor_units: 0,
    low_price_minor_units: 0,
    currency: "USD",
    observed_at_utc: "2026-07-18T12:00:00Z",
    ...overrides,
  }
}
