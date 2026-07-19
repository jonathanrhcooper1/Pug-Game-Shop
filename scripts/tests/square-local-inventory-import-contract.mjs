#!/usr/bin/env node
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)))
const tempDir = path.join(repoRoot, "tmp", "square-local-inventory-import-contract")
const inputPath = path.join(tempDir, "square-catalog-sample.csv")
const outputPath = path.join(tempDir, "summary.json")

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
    ].join(","),
    [
      "mtg-token",
      "Abhorrent Oculus",
      "Near Mint",
      "MTG-001",
      "\"Magic The Gathering, Magic The Gathering > MTG Singles\"",
      "Magic The Gathering > MTG Singles",
      "15.00",
      "2",
      "visible",
    ].join(","),
    [
      "pkm-token",
      "\"Charmander (EX Crystal Guardians) (49/100)\"",
      "Light Play",
      "PKM-001",
      "\"Pokemon, Pokemon > Pokemon Singles\"",
      "Pokemon > Pokemon Singles",
      "5.00",
      "3",
      "visible",
    ].join(","),
    [
      "mtg-dash-token",
      "Bonus Round -",
      "Light Play",
      "MTG-DASH-001",
      "\"Magic The Gathering, Magic The Gathering > MTG Singles\"",
      "Magic The Gathering > MTG Singles",
      "1.00",
      "1",
      "visible",
    ].join(","),
    [
      "mtg-style-token",
      "\"Abomination, Terrifying Titan (Borderless) (MSH)\"",
      "Near Mint",
      "MTG-STYLE-001",
      "\"Magic The Gathering, Magic The Gathering > MTG Singles\"",
      "Magic The Gathering > MTG Singles",
      "2.00",
      "1",
      "visible",
    ].join(","),
    [
      "graded-token",
      "Charmander Costco Promo",
      "SGC 10",
      "PKM-GRADED-001",
      "\"Pokemon, Pokemon > Graded Pokemon\"",
      "Pokemon > Graded Pokemon",
      "50.00",
      "1",
      "visible",
    ].join(","),
    [
      "op-token",
      "Roronoa Zoro (OP15-EB04)",
      "Near Mint",
      "OP-001",
      "\"One Piece, One Piece > Singles\"",
      "One Piece > Singles",
      "18.00",
      "4",
      "visible",
    ].join(","),
    [
      "op-supply-token",
      "One Piece Sleeves",
      "Default",
      "OP-SUPPLY",
      "\"One Piece, One Piece > Supplies\"",
      "One Piece > Supplies",
      "8.00",
      "10",
      "visible",
    ].join(","),
    [
      "op-event-token",
      "One Piece Event Entry",
      "Default",
      "OP-EVENT",
      "\"One Piece, One Piece > Events\"",
      "One Piece > Events",
      "10.00",
      "12",
      "visible",
    ].join(","),
    [
      "pkm-sealed-token",
      "Battle Deck Charizard EX",
      "Default",
      "PKM-SEALED",
      "\"Pokemon, Pokemon > Pokemon Sealed\"",
      "Pokemon > Pokemon Sealed",
      "90.00",
      "6",
      "visible",
    ].join(","),
    [
      "variable-token",
      "Pikachu",
      "Near Mint",
      "PKM-VARIABLE",
      "\"Pokemon, Pokemon > Pokemon Singles\"",
      "Pokemon > Pokemon Singles",
      "variable",
      "5",
      "visible",
    ].join(","),
    [
      "pkm-plush-token",
      "Pikachu Plush",
      "Default",
      "PKM-PLUSH",
      "\"Pokemon, Pokemon > Plush\"",
      "Pokemon > Plush",
      "15.00",
      "2",
      "visible",
    ].join(","),
  ].join("\n"),
  "utf8",
)

await execFileAsync(
  process.execPath,
  [
    path.join(repoRoot, "scripts", "import-square-catalog-local-inventory.mjs"),
    "--input",
    inputPath,
    "--output",
    outputPath,
  ],
  { cwd: repoRoot },
)

const summary = JSON.parse(await readFile(outputPath, "utf8"))

assert.equal(summary.status, "dry_run")
assert.equal(summary.quantity_source_column, "AH: Current Quantity The PUG")
assert.equal(summary.planned_rows, 7)
assert.equal(summary.planned_quantity_from_ah, 17)
assert.equal(summary.variable_price_rows, 1)
assert.equal(summary.graded_rows, 1)
assert.deepEqual(summary.planned_categories, {
  "MTG Singles": 3,
  Pokemon: 3,
  "One Piece": 1,
})
assert.deepEqual(summary.planned_games, {
  magicthegathering: 3,
  pokemon: 3,
  onepiece: 1,
})
assert.deepEqual(
  summary.planned_samples.find((sample) => sample.item_name === "Bonus Round -"),
  {
    line: 4,
    item_name: "Bonus Round -",
    card_name: "Bonus Round",
    set_name: "",
    set_code: "",
    game: "magicthegathering",
    quantity: 1,
  },
)
assert.deepEqual(
  summary.planned_samples.find((sample) => sample.item_name === "Abomination, Terrifying Titan (Borderless) (MSH)"),
  {
    line: 5,
    item_name: "Abomination, Terrifying Titan (Borderless) (MSH)",
    card_name: "Abomination, Terrifying Titan",
    set_name: "",
    set_code: "MSH",
    game: "magicthegathering",
    quantity: 1,
  },
)
assert.equal(summary.skipped_reasons.one_piece_supply_excluded, 1)
assert.equal(summary.skipped_reasons.one_piece_event_excluded, 1)
assert.equal(summary.skipped_reasons.category_not_requested, 2)

await rm(tempDir, { recursive: true, force: true })

console.log("PASS square local inventory import contract")
