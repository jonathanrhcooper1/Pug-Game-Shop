#!/usr/bin/env node
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)))
const tempDir = path.join(repoRoot, "tmp", "pug-grading-singles-import-contract")
const inputPath = path.join(tempDir, "square-catalog-sample.csv")
const outputPath = path.join(tempDir, "normalized.csv")
const summaryPath = path.join(tempDir, "normalized-summary.json")

await rm(tempDir, { recursive: true, force: true })
await mkdir(tempDir, { recursive: true })

await writeFile(
  inputPath,
  [
    [
      "Token",
      "Item Name",
      "Variation Name",
      "SKU",
      "Categories",
      "Reporting Category",
      "Price",
      "Current Quantity The PUG",
      "Square Online Item Visibility",
      "Pickup Enabled",
      "Tax - Sales Tax (9.75%)",
    ].join(","),
    [
      "mtg-token",
      "Lightning Bolt (JMP)",
      "Near Mint Foil",
      "SKU-1",
      "\"Magic The Gathering, Magic The Gathering > MTG Singles\"",
      "Magic The Gathering > MTG Singles",
      "4.00",
      "2",
      "visible",
      "yes",
      "yes",
    ].join(","),
    [
      "pkm-token",
      "\"Pikachu (Base Set) (58/102)\"",
      "Light Play",
      "SKU-2",
      "\"Pokemon, Pokemon > Pokemon Singles\"",
      "Pokemon > Pokemon Singles",
      "variable",
      "1",
      "hidden",
      "no",
      "yes",
    ].join(","),
    [
      "graded-token",
      "Charizard PSA 10",
      "PSA 10",
      "SKU-3",
      "\"Pokemon, Pokemon > Graded Pokemon, Pokemon > Pokemon Singles\"",
      "Pokemon > Graded Pokemon",
      "500.00",
      "1",
      "visible",
      "yes",
      "yes",
    ].join(","),
    [
      "supplies-token",
      "Sleeves",
      "Default",
      "SKU-4",
      "Supplies",
      "Supplies",
      "5.00",
      "3",
      "visible",
      "yes",
      "yes",
    ].join(","),
  ].join("\n"),
  "utf8",
)

await execFileAsync(
  process.execPath,
  [
    path.join(repoRoot, "scripts", "prepare-pug-grading-singles-import.mjs"),
    "--input",
    inputPath,
    "--output",
    outputPath,
    "--summary",
    summaryPath,
  ],
  { cwd: repoRoot },
)

const summary = JSON.parse(await readFile(summaryPath, "utf8"))
const csv = await readFile(outputPath, "utf8")

assert.equal(summary.import_category, "Pug Grading Singles")
assert.equal(summary.included_singles_rows, 2)
assert.equal(summary.skipped_graded_rows, 1)
assert.equal(summary.variable_price_rows, 1)
assert.equal(summary.total_quantity, 3)
assert.match(csv, /Pug Grading Singles,single,magicthegathering/)
assert.match(csv, /Pug Grading Singles,single,pokemon/)
assert.match(csv, /scrydex_required/)
assert.doesNotMatch(csv, /Charizard PSA 10/)
assert.doesNotMatch(csv, /Sleeves/)

await rm(tempDir, { recursive: true, force: true })

console.log("PASS pug grading singles import contract")
