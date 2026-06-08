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
  "Sync Now",
  "Stage Inventory Update",
  "Adjust Qty",
  "Print Label",
  "Connector profile",
  "Test Website Connector",
  "Save Profile Draft",
  "Company",
  "No cached cards match this scan.",
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
  "top-actions",
  "title-stack",
  "scanner-row",
  "scan-beam",
  "inventory-panel",
  "detail-panel",
  "card-frame",
  "detail-actions",
  "conflict-panel",
  "connector-panel",
  "filter-tray",
  "inventory-card-grid",
  "workflow-status",
]) {
  assert.ok(styles.includes(`.${className}`), `Missing UI class: ${className}`)
}

for (const interactionMarker of [
  "handleNavSelection(item.label)",
  "scrollIntoView",
  "handleConnectorProfileChange",
  "handleSyncNowPreview",
  "setViewMode(\"grid\")",
  "setStatusFilter(status)",
  "handleConflictAction",
]) {
  assert.ok(appSource.includes(interactionMarker), `Missing interaction marker: ${interactionMarker}`)
}

for (const responsiveMarker of ["@media (max-width: 760px)", "max-width: 12em"]) {
  assert.ok(styles.includes(responsiveMarker), `Missing responsive marker: ${responsiveMarker}`)
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
