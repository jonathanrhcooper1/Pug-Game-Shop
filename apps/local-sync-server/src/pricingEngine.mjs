const CONDITION_ORDER = Object.freeze(["DM", "HP", "MP", "LP", "NM"])

export function roundCustomerSalePriceMinorUnits(value) {
  const amount = nonNegativeInteger(value)
  return amount <= 100 || amount % 100 === 0 ? amount : Math.ceil(amount / 100) * 100
}

export function calculateAutomaticSalePrice({
  sourceUsdMinorUnits,
  markupBasisPoints = 1000,
  effectiveFloorMinorUnits = 0,
} = {}) {
  const source = nonNegativeInteger(sourceUsdMinorUnits)
  const markup = boundedInteger(markupBasisPoints, 0, 10000, 1000)
  const floor = nonNegativeInteger(effectiveFloorMinorUnits)
  const markedUp = Math.round((source * (10000 + markup)) / 10000)
  const rounded = roundCustomerSalePriceMinorUnits(markedUp)
  const candidate = roundCustomerSalePriceMinorUnits(Math.max(rounded, floor))

  return {
    source_usd_minor_units: source,
    markup_basis_points: markup,
    marked_up_minor_units: markedUp,
    rounded_minor_units: rounded,
    effective_floor_minor_units: floor,
    floor_applied: candidate > rounded,
    candidate_price_minor_units: candidate,
  }
}

export function priceChangeBasisPoints(currentPriceMinorUnits, candidatePriceMinorUnits) {
  const current = nonNegativeInteger(currentPriceMinorUnits)
  const candidate = nonNegativeInteger(candidatePriceMinorUnits)

  if (current <= 0) {
    return candidate > 0 ? 10000 : 0
  }

  return Math.round(((candidate - current) * 10000) / current)
}

export function priceChangeRequiresReview(currentPriceMinorUnits, candidatePriceMinorUnits, thresholdBasisPoints = 1000) {
  const threshold = boundedInteger(thresholdBasisPoints, 0, 100000, 1000)
  return Math.abs(priceChangeBasisPoints(currentPriceMinorUnits, candidatePriceMinorUnits)) > threshold
}

export function normalizePriceCurrency(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")

  if (["JPY", "YEN", "JAPANESE YEN", "¥", "￥"].includes(normalized)) {
    return "JPY"
  }
  if (["USD", "US DOLLAR", "US DOLLARS", "$"].includes(normalized)) {
    return "USD"
  }
  return /^[A-Z]{3}$/.test(normalized) ? normalized : ""
}

export function decimalPriceToSourceMinorUnits(value, currency) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""))
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0
  }
  return normalizePriceCurrency(currency) === "JPY" ? Math.round(parsed) : Math.round(parsed * 100)
}

export function convertSourcePriceToUsd({ sourceAmountMinorUnits, sourceCurrency, fxQuote, now = new Date(), maxFxAgeMs = 36 * 60 * 60 * 1000 } = {}) {
  const amount = nonNegativeInteger(sourceAmountMinorUnits)
  const currency = normalizePriceCurrency(sourceCurrency)

  if (amount <= 0) {
    return { status: "review_required", reason_code: "missing_source_price" }
  }
  if (currency === "USD") {
    return {
      status: "ok",
      source_currency: "USD",
      source_amount_minor_units: amount,
      converted_usd_minor_units: amount,
      fx_provider: "",
      fx_rate: "1",
      fx_observed_at_utc: "",
    }
  }
  if (currency !== "JPY") {
    return { status: "review_required", reason_code: "unsupported_source_currency", source_currency: currency }
  }

  const rate = Number(fxQuote?.rate)
  const observedAt = Date.parse(String(fxQuote?.observed_at_utc ?? fxQuote?.observedAtUtc ?? ""))
  const currentTime = now instanceof Date ? now.getTime() : Date.parse(String(now))

  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(observedAt)) {
    return { status: "review_required", reason_code: "jpy_conversion_unavailable", source_currency: "JPY" }
  }
  if (!Number.isFinite(currentTime) || currentTime - observedAt > Math.max(0, Number(maxFxAgeMs) || 0)) {
    return { status: "review_required", reason_code: "fx_rate_stale", source_currency: "JPY" }
  }

  return {
    status: "ok",
    source_currency: "JPY",
    source_amount_minor_units: amount,
    converted_usd_minor_units: Math.max(0, Math.round(amount * rate * 100)),
    fx_provider: String(fxQuote.provider ?? "").trim(),
    fx_rate: String(rate),
    fx_observed_at_utc: new Date(observedAt).toISOString(),
  }
}

export function selectExactVariantPricePoint(points, request = {}) {
  const source = Array.isArray(points) ? points : []
  const rawOrGraded = normalizeRawOrGraded(request.raw_or_graded ?? request.rawOrGraded)
  const providerVariantId = cleanId(request.provider_variant_id ?? request.providerVariantId)
  const referenceVariantId = positiveInteger(request.reference_variant_id ?? request.referenceVariantId)
  const requestedCondition = normalizeCondition(request.condition ?? request.condition_code)
  const requestedCompany = normalizeCompany(request.grading_company ?? request.gradingCompany)
  const requestedGrade = normalizeGrade(request.grade)
  const variantCount = Math.max(0, Number.parseInt(String(request.variant_count ?? request.variantCount ?? 0), 10) || 0)
  const hasRequestedVariant = Boolean(providerVariantId || referenceVariantId)

  const variantScoped = source.filter((point) => {
    const pointType = normalizeRawOrGraded(point?.raw_or_graded ?? point?.rawOrGraded)
    if (pointType && pointType !== rawOrGraded) {
      return false
    }

    const pointProviderVariantId = cleanId(point?.provider_variant_id ?? point?.providerVariantId)
    const pointReferenceVariantId = positiveInteger(point?.reference_variant_id ?? point?.referenceVariantId)
    const pointHasVariant = Boolean(pointProviderVariantId || pointReferenceVariantId)
    const exactVariant =
      (providerVariantId && pointProviderVariantId === providerVariantId) ||
      (referenceVariantId && pointReferenceVariantId === referenceVariantId)

    if (hasRequestedVariant && pointHasVariant) {
      return Boolean(exactVariant)
    }
    if (hasRequestedVariant && !pointHasVariant) {
      return variantCount <= 1
    }
    return variantCount <= 1 || !pointHasVariant
  })

  if (variantScoped.length === 0) {
    return { status: "review_required", reason_code: "exact_variant_price_missing" }
  }

  const candidates = rawOrGraded === "graded"
    ? gradedCandidates(variantScoped, requestedCompany, requestedGrade)
    : rawConditionCandidates(variantScoped, requestedCondition)

  for (const candidate of candidates) {
    const amount = preferredPointAmount(candidate.point)
    const currency = normalizePriceCurrency(candidate.point?.currency)
    if (amount <= 0 || !currency) {
      continue
    }

    return {
      status: "ok",
      point: candidate.point,
      source_amount_minor_units: amount,
      source_currency: currency,
      requested_condition: requestedCondition,
      selected_condition: normalizeCondition(candidate.point?.condition_code ?? candidate.point?.condition),
      condition_fallback_used: candidate.fallback === true,
      condition_fallback_reason: candidate.fallback ? "next_better_condition_same_variant" : "",
      requested_grading_company: requestedCompany,
      selected_grading_company: normalizeCompany(candidate.point?.grading_company ?? candidate.point?.gradingCompany),
      requested_grade: requestedGrade,
      selected_grade: normalizeGrade(candidate.point?.grade),
      grade_fallback_used: candidate.gradeFallback === true,
      grade_fallback_reason: candidate.gradeFallback ? "next_higher_grade_same_company_and_variant" : "",
      provider_variant_id: cleanId(candidate.point?.provider_variant_id ?? candidate.point?.providerVariantId),
      reference_variant_id: positiveInteger(candidate.point?.reference_variant_id ?? candidate.point?.referenceVariantId),
      observed_at_utc: cleanTimestamp(candidate.point?.observed_at_utc ?? candidate.point?.observedAtUtc),
      source_record_id: cleanId(candidate.point?.source_record_id ?? candidate.point?.sourceRecordId ?? candidate.point?.id),
    }
  }

  return { status: "review_required", reason_code: "exact_variant_price_missing" }
}

function rawConditionCandidates(points, requestedCondition) {
  if (!requestedCondition) {
    return []
  }
  const start = CONDITION_ORDER.indexOf(requestedCondition)
  if (start < 0) {
    return []
  }

  const candidates = []
  for (let index = start; index < CONDITION_ORDER.length; index += 1) {
    const condition = CONDITION_ORDER[index]
    for (const point of points) {
      if (normalizeCondition(point?.condition_code ?? point?.condition) === condition) {
        candidates.push({ point, fallback: condition !== requestedCondition, gradeFallback: false })
      }
    }
  }
  return candidates
}

function gradedCandidates(points, requestedCompany, requestedGrade) {
  const requestedNumber = gradeNumber(requestedGrade)
  return points
    .filter((point) => !requestedCompany || normalizeCompany(point?.grading_company ?? point?.gradingCompany) === requestedCompany)
    .map((point) => ({
      point,
      pointGrade: normalizeGrade(point?.grade),
      pointNumber: gradeNumber(point?.grade),
    }))
    .filter((candidate) => {
      if (!requestedGrade) {
        return true
      }
      if (candidate.pointGrade === requestedGrade) {
        return true
      }
      return requestedNumber !== null && candidate.pointNumber !== null && candidate.pointNumber > requestedNumber
    })
    .sort((left, right) => {
      const leftExact = left.pointGrade === requestedGrade ? 0 : 1
      const rightExact = right.pointGrade === requestedGrade ? 0 : 1
      if (leftExact !== rightExact) {
        return leftExact - rightExact
      }
      return (left.pointNumber ?? 999) - (right.pointNumber ?? 999)
    })
    .map((candidate) => ({
      point: candidate.point,
      fallback: false,
      gradeFallback: Boolean(requestedGrade && candidate.pointGrade !== requestedGrade),
    }))
}

function preferredPointAmount(point = {}) {
  return [
    point.market_price_minor_units,
    point.mid_price_minor_units,
    point.low_price_minor_units,
  ].map(nonNegativeInteger).find((value) => value > 0) ?? 0
}

function normalizeCondition(value) {
  const key = String(value ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "")
  const aliases = {
    NM: "NM",
    NEARMINT: "NM",
    LP: "LP",
    LIGHTLYPLAYED: "LP",
    MP: "MP",
    MODERATELYPLAYED: "MP",
    HP: "HP",
    HEAVILYPLAYED: "HP",
    DM: "DM",
    DMG: "DM",
    DAMAGED: "DM",
  }
  return aliases[key] ?? ""
}

function normalizeRawOrGraded(value) {
  const type = String(value ?? "").trim().toLowerCase()
  return type === "graded" ? "graded" : "raw"
}

function normalizeCompany(value) {
  const company = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
  if (company.includes("beckett") || company === "bgs") return "bgs"
  if (company.includes("psa")) return "psa"
  if (company.includes("cgc")) return "cgc"
  if (company.includes("sgc")) return "sgc"
  if (company.includes("tag")) return "tag"
  return company
}

function normalizeGrade(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function gradeNumber(value) {
  const match = String(value ?? "").match(/(?:^|\s)(10|[0-9](?:\.5)?)(?:\s|$)/)
  return match ? Number(match[1]) : null
}

function cleanTimestamp(value) {
  const time = Date.parse(String(value ?? ""))
  return Number.isFinite(time) ? new Date(time).toISOString() : ""
}

function cleanId(value) {
  return String(value ?? "").trim()
}

function positiveInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function nonNegativeInteger(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}
