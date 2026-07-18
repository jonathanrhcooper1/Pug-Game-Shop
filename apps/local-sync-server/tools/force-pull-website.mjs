import { resolve } from "node:path"

import {
  backupLocalDatabase,
  clearLocalTables,
  createOpsSession,
  createSnapshotDirectory,
  createWordPressLinkedStore,
  loadOpsEnv,
  pullAllWebsiteDomainIntoLocal,
  writeJsonFile,
} from "./lib/ops-common.mjs"

loadOpsEnv()

const args = new Set(process.argv.slice(2))
const replaceLocal = args.has("--replace-local")
const inventoryOnly = args.has("--inventory-only")
const catalogOnly = args.has("--catalog-only")
const pageSize = valueAfter("--page-size") ?? process.env.PUG_WEBSITE_FORCE_PULL_PAGE_SIZE
const maxPages = valueAfter("--max-pages") ?? process.env.PUG_WEBSITE_PULL_MAX_PAGES
const backup = backupLocalDatabase("before-website-force-pull")
const cleared = replaceLocal
  ? clearLocalTables(
      catalogOnly ? ["reference_cards"] : inventoryOnly ? ["inventory_items"] : ["inventory_items", "reference_cards"],
    )
  : { status: "skipped", cleared_tables: [] }
const { store, ...storeStatus } = createWordPressLinkedStore()
const session = await createOpsSession(store)

if (session.status !== "ok") {
  const blocked = {
    status: "blocked",
    code: session.code,
    message: session.message,
    backup,
    cleared,
    ...storeStatus,
    credentials_printed: false,
  }
  console.log(JSON.stringify(blocked, null, 2))
  process.exitCode = 1
} else {
  const domains = catalogOnly ? ["catalog"] : inventoryOnly ? ["inventory"] : ["inventory", "catalog"]
  const results = []

  for (const domain of domains) {
    const result = await pullAllWebsiteDomainIntoLocal(store, session.session.token, domain, {
      pageSize,
      maxPages,
    })
    results.push(result)

    if (result.status !== "ok") {
      break
    }
  }

  const outputDir = createSnapshotDirectory("website-force-pull")
  const summary = {
    status: results.every((result) => result.status === "ok") ? "ok" : "blocked",
    action: "force_pull_website_into_local_sync_database",
    output_dir: outputDir,
    generated_at_utc: new Date().toISOString(),
    replace_local: replaceLocal,
    backup,
    cleared,
    ...storeStatus,
    results,
    credentials_printed: false,
  }

  writeJsonFile(resolve(outputDir, "summary.json"), summary)
  console.log(JSON.stringify(summary, null, 2))

  if (summary.status !== "ok") {
    process.exitCode = 1
  }
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : undefined
}
