import { resolve } from "node:path"

import {
  backupLocalDatabase,
  createOpsSession,
  createSnapshotDirectory,
  createWordPressLinkedStore,
  loadOpsEnv,
  pullAllWebsiteDomainIntoLocal,
  writeJsonFile,
} from "./lib/ops-common.mjs"

loadOpsEnv()

const { store, ...storeStatus } = createWordPressLinkedStore()
const session = await createOpsSession(store)

if (session.status !== "ok") {
  const blocked = {
    status: "blocked",
    code: session.code,
    message: session.message,
    ...storeStatus,
    credentials_printed: false,
  }
  console.log(JSON.stringify(blocked, null, 2))
  process.exitCode = 1
} else {
  const backup = backupLocalDatabase("before-daily-price-sync")
  const catalog = await pullAllWebsiteDomainIntoLocal(store, session.session.token, "catalog", {
    pageSize: process.env.PUG_WEBSITE_DAILY_CATALOG_PAGE_SIZE ?? 1000,
  })
  const inventory = await pullAllWebsiteDomainIntoLocal(store, session.session.token, "inventory", {
    pageSize: process.env.PUG_WEBSITE_DAILY_INVENTORY_PAGE_SIZE ?? 100,
  })
  const outputDir = createSnapshotDirectory("daily-price-sync")
  const summary = {
    status: catalog.status === "ok" && inventory.status === "ok" ? "ok" : "blocked",
    action: "daily_website_price_and_inventory_refresh",
    output_dir: outputDir,
    generated_at_utc: new Date().toISOString(),
    backup,
    ...storeStatus,
    catalog,
    inventory,
    credentials_printed: false,
  }

  writeJsonFile(resolve(outputDir, "summary.json"), summary)
  console.log(JSON.stringify(summary, null, 2))

  if (summary.status !== "ok") {
    process.exitCode = 1
  }
}
