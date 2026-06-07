import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")

const appSource = await readFile(path.join(appRoot, "src/App.tsx"), "utf8")
const workspaceSource = await readFile(path.join(appRoot, "src/data/offlineWorkspace.ts"), "utf8")
const styles = await readFile(path.join(appRoot, "src/styles.css"), "utf8")
const appSurface = `${appSource}\n${workspaceSource}`

for (const requiredText of [
  "Offline Inventory Command",
  "Scan or search",
  "Sync queue",
  "Conflicts",
  "Customer credit",
  "Offline Mode",
  "Stage Inventory Update",
]) {
  assert.ok(appSurface.includes(requiredText), `Missing offline UI text: ${requiredText}`)
}

for (const route of [
  "/wp-json/tcg-store/v1/offline/devices/register",
  "/wp-json/tcg-store/v1/offline/pull",
  "/wp-json/tcg-store/v1/offline/push",
]) {
  assert.ok(appSurface.includes(route), `Missing sync route: ${route}`)
}

for (const className of [
  "offline-shell",
  "nav-rail",
  "scanner-row",
  "inventory-panel",
  "detail-panel",
  "conflict-panel",
]) {
  assert.ok(styles.includes(`.${className}`), `Missing UI class: ${className}`)
}

for (const color of ["#f6c760", "#79d78f", "#f07e67"]) {
  assert.ok(styles.includes(color), `Missing status/accent color: ${color}`)
}

for (const forbidden of [
  ["sk", "live", ""].join("_"),
  ["production", "api", "key"].join("-"),
  "direct_mysql_access: true",
]) {
  assert.equal(appSurface.includes(forbidden), false, `Forbidden marker found: ${forbidden}`)
  assert.equal(styles.includes(forbidden), false, `Forbidden marker found: ${forbidden}`)
}

console.log("PASS offline app UI shell contract")
