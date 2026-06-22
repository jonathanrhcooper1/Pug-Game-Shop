#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const DEFAULT_IMPORT_CATEGORY = "Pug Grading Singles"
const DEFAULT_OUTPUT_DIR = path.join("dist", "imports")

const args = parseArgs(process.argv.slice(2))
const inputPath = args.input || args.i

if (!inputPath) {
  console.error(
    "Usage: node scripts/prepare-pug-grading-singles-import.mjs --input <square-catalog.csv> [--output <normalized.csv>] [--summary <summary.json>]",
  )
  process.exit(1)
}

const outputPath =
  args.output ||
  args.o ||
  path.join(DEFAULT_OUTPUT_DIR, `pug-grading-singles-import-${timestampForFileName()}.csv`)
const summaryPath =
  args.summary ||
  path.join(
    path.dirname(outputPath),
    `${path.basename(outputPath, path.extname(outputPath))}-summary.json`,
  )
const importCategory = args.category || DEFAULT_IMPORT_CATEGORY

const rawCsv = await readFile(inputPath, "utf8")
const rows = parseCsv(rawCsv)
if (rows.length === 0) {
  throw new Error("The Square catalog CSV did not contain a header row.")
}

const [headers, ...records] = rows
const normalizedRecords = records
  .map((fields, index) => rowObject(headers, fields, index + 2))
  .filter((record) => Object.values(record).some((value) => String(value).trim() !== ""))

const singlesRows = []
const skippedRows = []

for (const record of normalizedRecords) {
  const categoryText = [
    record.Categories,
    record["Reporting Category"],
    record["Item Name"],
    record["Customer-facing Name"],
  ].join(" ")
  const normalizedCategoryText = normalizeText(categoryText)
  const isGraded = /\bgraded\b/.test(normalizedCategoryText)
  const isSingles = /\b(singles|mtg singles|pokemon singles)\b/.test(normalizedCategoryText)

  if (!isSingles || isGraded) {
    skippedRows.push({
      line: record.__line,
      reason: isGraded ? "graded_row_kept_out_of_singles_import" : "not_marked_as_singles",
      item_name: record["Item Name"] || "",
      categories: record.Categories || "",
    })
    continue
  }

  singlesRows.push(normalizeSquareCatalogSingle(record, importCategory))
}

const outputHeaders = [
  "import_category",
  "product_type",
  "game",
  "game_label",
  "card_name",
  "set_name",
  "set_code",
  "card_number",
  "variant",
  "condition",
  "finish",
  "quantity",
  "sku",
  "barcode",
  "gtin",
  "square_token",
  "square_category",
  "reporting_category",
  "price",
  "price_minor_units",
  "price_source",
  "source_item_name",
  "source_variation_name",
  "pickup_enabled",
  "online_visibility",
  "tax_name",
  "tax_enabled",
]

const outputCsv = stringifyCsv([
  outputHeaders,
  ...singlesRows.map((row) => outputHeaders.map((header) => row[header] ?? "")),
])
const summary = buildSummary({
  inputPath,
  outputPath,
  summaryPath,
  importCategory,
  totalRows: normalizedRecords.length,
  singlesRows,
  skippedRows,
})

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, outputCsv, "utf8")
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8")

console.log(
  JSON.stringify(
    {
      status: "ok",
      input: inputPath,
      output: outputPath,
      summary: summaryPath,
      total_rows: summary.total_rows,
      included_singles_rows: summary.included_singles_rows,
      variable_price_rows: summary.variable_price_rows,
      total_quantity: summary.total_quantity,
      games: summary.games,
    },
    null,
    2,
  ),
)

function normalizeSquareCatalogSingle(record, importCategory) {
  const sourceItemName = cleanString(record["Item Name"] || record["Customer-facing Name"])
  const sourceVariationName = cleanString(record["Variation Name"])
  const parsedName = parseCardName(sourceItemName)
  const price = parseMoney(record.Price)
  const quantity = parseInteger(record["Current Quantity The PUG"])
  const game = detectGame(record)
  const condition = conditionFromVariation(sourceVariationName)
  const finish = finishFromVariation(sourceVariationName)

  return {
    import_category: importCategory,
    product_type: "single",
    game: game.key,
    game_label: game.label,
    card_name: parsedName.cardName,
    set_name: parsedName.setName,
    set_code: parsedName.setCode,
    card_number: parsedName.cardNumber,
    variant: sourceVariationName || "Default",
    condition,
    finish,
    quantity,
    sku: cleanString(record.SKU),
    barcode: cleanString(record.SKU),
    gtin: cleanString(record.GTIN),
    square_token: cleanString(record.Token),
    square_category: cleanString(record.Categories),
    reporting_category: cleanString(record["Reporting Category"]),
    price: price === null ? "" : price.toFixed(2),
    price_minor_units: price === null ? "" : Math.round(price * 100),
    price_source: price === null ? "scrydex_required" : "square_catalog_export",
    source_item_name: sourceItemName,
    source_variation_name: sourceVariationName,
    pickup_enabled: truthyLabel(record["Pickup Enabled"]),
    online_visibility: cleanString(record["Square Online Item Visibility"]) || "visible",
    tax_name: "Sales Tax (9.75%)",
    tax_enabled: truthyLabel(record["Tax - Sales Tax (9.75%)"]),
  }
}

function parseCardName(sourceItemName) {
  const groups = [...sourceItemName.matchAll(/\(([^()]+)\)/g)].map((match) => cleanString(match[1]))
  const baseName = cleanString(sourceItemName.replace(/\s*\([^()]+\)\s*/g, " ")).replace(/\s+/g, " ")
  const likelyCardNumber = [...groups].reverse().find((group) => /\d+\s*\/\s*\d+/.test(group)) || ""
  const likelySetCode = [...groups].reverse().find((group) => /^[A-Z0-9]{2,10}$/.test(group)) || ""
  const likelySetName =
    groups.find((group) => group !== likelyCardNumber && group !== likelySetCode) || ""

  return {
    cardName: baseName || sourceItemName,
    setName: likelySetName,
    setCode: likelySetCode,
    cardNumber: likelyCardNumber,
  }
}

function detectGame(record) {
  const text = normalizeText([
    record.Categories,
    record["Reporting Category"],
    record["Item Name"],
    record["Customer-facing Name"],
  ].join(" "))

  if (text.includes("magic") || text.includes("mtg")) {
    return { key: "magicthegathering", label: "Magic: The Gathering" }
  }

  if (text.includes("pokemon")) {
    return { key: "pokemon", label: "Pokemon" }
  }

  return { key: "unknown", label: "Unknown" }
}

function conditionFromVariation(variationName) {
  const text = normalizeText(variationName)

  if (/\bnear mint\b|\bnm\b/.test(text)) {
    return "NM"
  }

  if (/\blight play\b|\blightly played\b|\blp\b/.test(text)) {
    return "LP"
  }

  if (/\bmoderate play\b|\bmoderately played\b|\bmp\b/.test(text)) {
    return "MP"
  }

  if (/\bheavy play\b|\bheavily played\b|\bhp\b/.test(text)) {
    return "HP"
  }

  if (/\bdamaged\b|\bdmg\b/.test(text)) {
    return "DMG"
  }

  return variationName ? variationName : "NM"
}

function finishFromVariation(variationName) {
  const text = normalizeText(variationName)

  if (text.includes("foil")) {
    return "foil"
  }

  return "normal"
}

function buildSummary({
  inputPath,
  outputPath,
  summaryPath,
  importCategory,
  totalRows,
  singlesRows,
  skippedRows,
}) {
  const games = {}
  let variablePriceRows = 0
  let pricedRows = 0
  let totalQuantity = 0

  for (const row of singlesRows) {
    games[row.game_label] = (games[row.game_label] || 0) + 1
    totalQuantity += Number(row.quantity || 0)
    if (row.price_source === "scrydex_required") {
      variablePriceRows += 1
    } else {
      pricedRows += 1
    }
  }

  return {
    status: "ok",
    purpose: "Normalize Square catalog singles into the Pug grading singles import category.",
    input_path: inputPath,
    output_path: outputPath,
    summary_path: summaryPath,
    import_category: importCategory,
    product_type: "single",
    total_rows: totalRows,
    included_singles_rows: singlesRows.length,
    skipped_rows: skippedRows.length,
    skipped_graded_rows: skippedRows.filter(
      (row) => row.reason === "graded_row_kept_out_of_singles_import",
    ).length,
    variable_price_rows: variablePriceRows,
    priced_rows: pricedRows,
    total_quantity: totalQuantity,
    games,
    warnings: [
      variablePriceRows > 0
        ? `${variablePriceRows} singles rows have Square variable pricing and should be priced from ScryDex before publish.`
        : "",
      "Graded rows are intentionally excluded so they can flow through the graded-card import path.",
    ].filter(Boolean),
  }
}

function parseArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith("--")) {
      continue
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2)
    const key = rawKey.trim()
    const nextValue = inlineValue ?? argv[index + 1]
    if (inlineValue === undefined) {
      index += 1
    }
    parsed[key] = nextValue
  }
  return parsed
}

function parseCsv(input) {
  const rows = []
  let row = []
  let field = ""
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (char !== "\r") {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function stringifyCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`
}

function csvCell(value) {
  const stringValue = String(value ?? "")
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function rowObject(headers, fields, line) {
  const record = { __line: line }
  headers.forEach((header, index) => {
    record[cleanString(header)] = cleanString(fields[index] ?? "")
  })
  return record
}

function cleanString(value) {
  return String(value ?? "").trim()
}

function normalizeText(value) {
  return cleanString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function parseMoney(value) {
  const cleaned = cleanString(value)
  if (!cleaned || cleaned.toLowerCase() === "variable") {
    return null
  }

  const parsed = Number(cleaned.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function parseInteger(value) {
  const parsed = Number.parseInt(cleanString(value).replace(/[^0-9-]/g, ""), 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function truthyLabel(value) {
  const text = normalizeText(value)
  return ["yes", "true", "1", "enabled"].includes(text) ? "yes" : "no"
}

function timestampForFileName() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}
