import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { listenLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"
import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const host = "127.0.0.1"
const port = 8787
const fixtureDirectory = mkdtempSync(join(tmpdir(), "pug-visual-qa-"))
const databasePath = join(fixtureDirectory, "visual-qa.sqlite")
const store = createLocalSyncStore({
  databasePath,
  seedDemoData: true,
  seedDemoInventory: true,
  removeSeedReferenceCards: false,
  wordpressPushEnabled: false,
  squareConfigured: false,
})

await store.indexScryDexCatalogForSystem({
  games: ["pokemon"],
  skipLocalCatalogPull: true,
  source: "visual_qa_fixture",
  squareSyncDelayMs: 0,
})

const server = await listenLocalSyncHttpServer({
  host,
  port,
  store,
  serverUrl: `http://${host}:${port}`,
  websiteUrl: "https://visual-qa.invalid",
})

console.log(`Pug visual QA server listening on http://${host}:${port}`)

function close() {
  server.close(() => {
    store.close?.()
    rmSync(fixtureDirectory, { recursive: true, force: true })
    process.exit(0)
  })
}

process.once("SIGINT", close)
process.once("SIGTERM", close)
