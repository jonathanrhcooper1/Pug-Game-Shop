import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const script = readFileSync(resolve(root, "scripts/square-seed-pos-singles-layout.mjs"), "utf8")
const syncer = readFileSync(resolve(root, "apps/local-sync-server/src/squareCatalogInventorySyncer.mjs"), "utf8")
const cli = readFileSync(resolve(root, "apps/local-sync-server/src/cli.mjs"), "utf8")
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))

for (const marker of [
  "PUG_SQUARE_POS_LAYOUT_CONFIRM",
  "seed-square-pos-singles-layout",
  "standalone_square_pos_layout_seed_without_middleman_server",
  "Singles / MTG",
  "Singles / Lorcana",
  "Singles / Riftbound",
  "Singles / Pokemon",
  "syncer.ensureDefaultSquarePosCategories()",
  "catalog.create_mtg_test_card",
  "credentialsPrinted: false",
  "tokenStoredInRepo: false",
]) {
  assert.match(script, new RegExp(escapeRegExp(marker)), `Missing Square POS layout script marker: ${marker}`)
}

for (const marker of [
  "DEFAULT_SQUARE_POS_SINGLES_GAME_CATEGORIES",
  '"MTG", "Lorcana", "Riftbound", "Pokemon"',
  "async function ensureDefaultSquarePosCategories()",
  "moveCatalogCategoryToParent",
  "square_category_moved_under_singles",
  "square_pos_singles_layout_ready",
  "parent_category",
  "default_pos_singles_layout_enabled",
]) {
  assert.match(syncer, new RegExp(escapeRegExp(marker)), `Missing Square POS layout syncer marker: ${marker}`)
}

assert.match(cli, /ensureDefaultSquarePosCategories/, "LAN server CLI should preflight the Square POS Singles layout.")
assert.match(cli, /startWordPressInventoryPolling/, "LAN server CLI should auto-poll WordPress inventory changes.")
assert.match(cli, /PUG_WORDPRESS_INVENTORY_POLL_SECONDS/, "LAN server CLI should expose WordPress inventory poll interval config.")
assert.match(cli, /updated_after/, "LAN server CLI should poll WordPress inventory by changed-since cursor.")
assert.equal(
  packageJson.scripts["square:seed-pos-singles-layout"],
  "node scripts/square-seed-pos-singles-layout.mjs",
  "package.json should expose the Square POS Singles layout seed script.",
)

assert.doesNotMatch(script, /EAAA[a-zA-Z0-9_-]{20,}/, "Square production token must not be embedded.")
assert.doesNotMatch(script, /sq0idp-[a-zA-Z0-9_-]{10,}/, "Square application ID must not be embedded.")
assert.doesNotMatch(script, /sq0csp-[a-zA-Z0-9_-]{10,}/, "Square application secret must not be embedded.")

console.log("Square POS Singles layout contract passed.")

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
