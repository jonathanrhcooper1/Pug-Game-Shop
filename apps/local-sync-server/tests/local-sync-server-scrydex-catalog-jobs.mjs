import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const calls = []
const store = createLocalSyncStore({
  databasePath: ":memory:",
  removeSeedReferenceCards: true,
  now: () => new Date("2026-06-25T12:00:00.000Z"),
  wordpressCatalogIndexer: async (input) => {
    calls.push(input)

    if (input.game === "yugioh") {
      return {
        status: "blocked",
        code: "scrydex_not_found",
        message: "ScryDex returned no Yu-Gi-Oh expansions in this test.",
        card_result: { page_count: 1, reference_row_count: 0 },
        expansion_result: { page_count: 1 },
        failed_sets: [{ expansion_id: "ygo-test", message: "Provider unavailable" }],
        failed_cards: [],
      }
    }

    return {
      status: "ok",
      code: "scrydex_game_index_complete",
      message: "Game indexed.",
      card_result: { page_count: 2, reference_row_count: 12 },
      expansion_result: { page_count: 1 },
      variants: 18,
      prices: 36,
      failed_sets: [],
      failed_cards: [],
    }
  },
})

const auth = store.createSession({ pin: "9999" })
const token = auth.session.token

const initialStatus = store.getScryDexCatalogStatus(token)
assert.equal(initialStatus.status, "ok")
assert.equal(initialStatus.action, "scrydex_catalog_status")
assert.equal(initialStatus.indexer_configured, true)
assert.equal(initialStatus.credentials_synced_to_client, false)
assert.equal(initialStatus.raw_credentials_returned, false)
assert.equal(initialStatus.totals.card_count, 0)

const started = store.startScryDexCatalogSyncJob(token, {
  games: ["pokemon", "yugioh"],
  rawOrGraded: "raw",
  pageSize: 50,
  maxPages: 3,
  maxExpansionPages: 4,
})

assert.equal(started.status, "ok")
assert.equal(started.action, "scrydex_catalog_sync_job_started")
assert.equal(started.job.status, "running")
assert.equal(started.job.game_count, 1)
assert.equal(started.job.raw_or_graded, "raw")
assert.equal(started.credentials_synced_to_client, false)
assert.equal(started.raw_credentials_returned, false)

const duplicateStart = store.startScryDexCatalogSyncJob(token, { games: ["pokemon"] })
assert.equal(duplicateStart.status, "blocked")
assert.equal(duplicateStart.code, "scrydex_catalog_sync_already_running")

const finalStatus = await waitForCompletedJob()
assert.equal(finalStatus.status, "ok")
assert.equal(finalStatus.active_job, null)
assert.equal(finalStatus.recent_jobs.length, 1)

const job = finalStatus.recent_jobs[0]
assert.equal(job.status, "completed")
assert.equal(job.completed_game_count, 1)
assert.equal(job.failed_game_count, 0)
assert.equal(job.stored_cards, 12)
assert.equal(job.variants, 18)
assert.equal(job.prices, 36)
assert.equal(job.games.find((game) => game.game === "pokemon")?.status, "ok")
assert.equal(job.games.find((game) => game.game === "yugioh"), undefined)
assert.equal(job.errors.length, 0)

assert.equal(calls.length, 1)
assert.deepEqual(calls.map((call) => call.game), ["pokemon"])
assert.equal(calls[0].pageSize, 50)
assert.equal(calls[0].maxPages, 3)
assert.equal(calls[0].maxExpansionPages, 4)
assert.equal(calls[0].indexExpansions, false)
assert.equal(calls[0].rawOrGraded, "raw")
assert.equal(calls[0].executeDatabaseWrites, true)

const unsupportedOnly = store.startScryDexCatalogSyncJob(token, {
  games: ["yugioh"],
})
assert.equal(unsupportedOnly.status, "blocked")
assert.equal(unsupportedOnly.code, "scrydex_supported_game_required")

const localIndexerStore = createLocalSyncStore({
  databasePath: ":memory:",
  removeSeedReferenceCards: true,
  now: () => new Date("2026-06-25T12:15:00.000Z"),
  scryDexCatalogIndexerMode: "local_scrydex_api",
  wordpressCatalogIndexer: async (input) => ({
    status: "ok",
    code: "scrydex_local_catalog_index_completed",
    game: input.game,
    cards: {
      status: "completed",
      page_count: 1,
      reference_row_count: 1,
      reference_cards: [
        {
          id: "scrydex-mtg-local-001",
          game: "magicthegathering",
          name: "Local Magic Test Card",
          set: { name: "Local Test Set", code: "LTS" },
          number: "1",
          images: { small: "https://img.test/local-magic.png" },
          variants: [
            {
              id: "scrydex-mtg-local-001-normal",
              variant: "normal",
              finish: "normal",
              prices: [{ condition: "Near Mint", market_price: "2.50", currency: "USD" }],
            },
          ],
        },
      ],
    },
    reference_cards: [
      {
        id: "scrydex-mtg-local-001",
        game: "magicthegathering",
        name: "Local Magic Test Card",
        set: { name: "Local Test Set", code: "LTS" },
        number: "1",
        images: { small: "https://img.test/local-magic.png" },
        variants: [
          {
            id: "scrydex-mtg-local-001-normal",
            variant: "normal",
            finish: "normal",
            prices: [{ condition: "Near Mint", market_price: "2.50", currency: "USD" }],
          },
        ],
      },
    ],
  }),
})
const localIndexerAuth = localIndexerStore.createSession({ pin: "9999" })
const localIndexerRun = await localIndexerStore.indexScryDexCatalogForSystem({
  games: ["magicthegathering"],
  skipInventoryReprice: true,
})
assert.equal(localIndexerRun.status, "ok")
assert.equal(localIndexerRun.catalog_pull.status, "skipped")
assert.equal(localIndexerRun.catalog_pull.code, "local_catalog_pull_skipped")
assert.equal(localIndexerRun.games[0].local_inserted_cards, 1)
assert.equal(localIndexerRun.local_reference_card_count, 1)
const localIndexerStatus = localIndexerStore.getScryDexCatalogStatus(localIndexerAuth.session.token)
assert.equal(localIndexerStatus.catalog_indexer_mode, "local_scrydex_api")
const localIndexedSearch = await localIndexerStore.searchScryDexCards(localIndexerAuth.session.token, {
  query: "Local Magic Test Card",
  game: "magicthegathering",
})
assert.equal(localIndexedSearch.status, "ok")
assert.equal(localIndexedSearch.source, "local_reference_cache")
assert.equal(localIndexedSearch.cards[0].provider_card_id, "scrydex-mtg-local-001")

const persistedHistoryDir = mkdtempSync(join(tmpdir(), "pug-scrydex-history-"))
const persistedHistoryPath = join(persistedHistoryDir, "store-sync.sqlite")
const persistedCalls = []
const persistedStore = createLocalSyncStore({
  databasePath: persistedHistoryPath,
  removeSeedReferenceCards: true,
  now: () => new Date("2026-06-25T12:30:00.000Z"),
  wordpressCatalogIndexer: async (input) => {
    persistedCalls.push(input)

    return {
      status: "ok",
      code: "scrydex_game_index_complete",
      message: "Game indexed.",
      card_result: { page_count: 1, reference_row_count: 7 },
      expansion_result: { page_count: 1 },
      variants: 9,
      prices: 11,
      failed_sets: [],
      failed_cards: [],
    }
  },
  wordpressCatalogExportPull: async () => ({
    status: "ok",
    pulled_count: 0,
    stored_count: 0,
    page_count: 1,
    has_more: false,
  }),
})
const persistedAuth = persistedStore.createSession({ pin: "9999" })
persistedStore.startScryDexCatalogSyncJob(persistedAuth.session.token, {
  game: "pokemon",
  squareSyncDelayMs: 0,
})
const persistedFinalStatus = await waitForStoreCompletedJob(persistedStore, persistedAuth.session.token)
assert.equal(persistedFinalStatus.recent_jobs[0].status, "completed")
assert.equal(persistedFinalStatus.recent_jobs[0].inventory_reprice.floor_clamped_count, 0)

const reopenedStore = createLocalSyncStore({
  databasePath: persistedHistoryPath,
  removeSeedReferenceCards: true,
  now: () => new Date("2026-06-25T12:31:00.000Z"),
  wordpressCatalogIndexer: async () => {
    throw new Error("history reload should not run a live indexer")
  },
})
const reopenedAuth = reopenedStore.createSession({ pin: "9999" })
const reopenedStatus = reopenedStore.getScryDexCatalogStatus(reopenedAuth.session.token)
assert.equal(reopenedStatus.status, "ok")
assert.equal(reopenedStatus.recent_jobs.length, 1)
assert.equal(reopenedStatus.recent_jobs[0].status, "completed")
assert.equal(reopenedStatus.recent_jobs[0].source, "manager_scrydex_catalog_sync_job")
assert.equal(reopenedStatus.recent_jobs[0].inventory_reprice.floor_clamped_count, 0)
assert.equal(reopenedStatus.last_sync.job_id, reopenedStatus.recent_jobs[0].job_id)

const concurrentCalls = []
const concurrentStore = createLocalSyncStore({
  databasePath: ":memory:",
  removeSeedReferenceCards: true,
  now: () => new Date(),
  wordpressCatalogIndexer: async (input) => {
    concurrentCalls.push(input)
    input.onProgress?.({
      game: input.game,
      phase: "cards",
      status: "running",
      current_expansion_id: "cards-endpoint",
      current_expansion_name: "Cards endpoint",
      provider_request_count: 2,
      card_pages: 2,
      stored_cards: 6,
      variants: 7,
      prices: 8,
      message: `Fetched ${input.game} live progress.`,
    })
    await new Promise((resolve) => setTimeout(resolve, 50))

    return {
      status: "ok",
      code: "scrydex_game_index_complete",
      message: "Game indexed.",
      card_result: { page_count: 1, reference_row_count: 3 },
      expansion_result: { page_count: 1 },
      variants: 4,
      prices: 5,
      failed_sets: [],
      failed_cards: [],
    }
  },
  wordpressCatalogExportPull: async () => ({
    status: "ok",
    rows: [],
    has_more: false,
  }),
})
const concurrentAuth = concurrentStore.createSession({ pin: "9999" })
const pokemonStart = concurrentStore.startScryDexCatalogSyncJob(concurrentAuth.session.token, { game: "pokemon" })
const lorcanaStart = concurrentStore.startScryDexCatalogSyncJob(concurrentAuth.session.token, { game: "lorcana" })
const duplicatePokemonStart = concurrentStore.startScryDexCatalogSyncJob(concurrentAuth.session.token, { game: "pokemon" })
assert.equal(pokemonStart.status, "ok")
assert.equal(lorcanaStart.status, "ok")
assert.equal(duplicatePokemonStart.status, "blocked")
assert.equal(duplicatePokemonStart.code, "scrydex_catalog_sync_already_running")
const concurrentActiveStatus = concurrentStore.getScryDexCatalogStatus(concurrentAuth.session.token)
assert.equal(concurrentActiveStatus.active_jobs.length, 2)
assert.equal(new Set(concurrentActiveStatus.active_jobs.map((job) => job.games[0].game)).size, 2)
assert.equal(concurrentActiveStatus.active_jobs[0].games[0].phase, "cards")
assert.equal(concurrentActiveStatus.active_jobs[0].games[0].card_pages, 2)
assert.equal(concurrentActiveStatus.active_jobs[0].games[0].prices, 8)
const concurrentFinalStatus = await waitForRecentJobCount(concurrentStore, concurrentAuth.session.token, 2)
assert.equal(concurrentFinalStatus.active_jobs.length, 0)
assert.equal(concurrentFinalStatus.recent_jobs.length, 2)
assert.deepEqual(new Set(concurrentCalls.map((call) => call.game)), new Set(["pokemon", "lorcana"]))

const webhookCalls = []
const webhookStore = createLocalSyncStore({
  databasePath: ":memory:",
  removeSeedReferenceCards: true,
  now: () => new Date("2026-06-25T13:00:00.000Z"),
  scryDexWebhookRelayToken: "relay-secret",
  wordpressCatalogIndexer: async (input) => {
    webhookCalls.push(input)

    return {
      status: "ok",
      code: "scrydex_expansion_index_complete",
      message: "Expansion indexed.",
      card_result: { page_count: 1, reference_row_count: 4 },
      expansion_result: { page_count: 0 },
      variants: 6,
      prices: 12,
      failed_sets: [],
      failed_cards: [],
    }
  },
  wordpressCatalogExportPull: async () => ({
    status: "ok",
    rows: [],
    has_more: false,
  }),
})

const rejectedWebhook = await webhookStore.triggerScryDexWebhookRefresh("wrong-secret", {
  id: "evt-scrydex-rejected",
  game: "pokemon",
  expansion_ids: ["sv-test"],
})
assert.equal(rejectedWebhook.status, "blocked")
assert.equal(rejectedWebhook.code, "session_required")

const webhookRefresh = await webhookStore.triggerScryDexWebhookRefresh("relay-secret", {
  id: "evt-scrydex-graded-001",
  name: "pokemon.expansions.prices.graded_updated",
  data: {
    expansion_ids: ["sv-test-1", "sv-test-2", "sv-test-1"],
  },
  pageSize: 25,
})

assert.equal(webhookRefresh.status, "ok")
assert.equal(webhookRefresh.action, "scrydex_catalog_webhook_refresh_completed")
assert.equal(webhookRefresh.webhook_event_id, "evt-scrydex-graded-001")
assert.equal(webhookRefresh.requested_by_user_id, "system-scrydex-webhook")
assert.equal(webhookRefresh.source_of_truth, "local_sync_server")
assert.equal(webhookRefresh.raw_or_graded, "graded")
assert.deepEqual(webhookRefresh.expansion_ids, ["sv-test-1", "sv-test-2"])
assert.equal(webhookRefresh.expansion_count, 2)
assert.equal(webhookRefresh.catalog_pull.status, "ok")
assert.equal(webhookRefresh.inventory_reprice.status, "ok")
assert.equal(webhookRefresh.credentials_synced_to_client, false)
assert.equal(webhookRefresh.raw_credentials_returned, false)
assert.equal(webhookCalls.length, 2)
assert.deepEqual(webhookCalls.map((call) => call.expansionId), ["sv-test-1", "sv-test-2"])
assert.equal(webhookCalls[0].game, "pokemon")
assert.equal(webhookCalls[0].rawOrGraded, "graded")
assert.equal(webhookCalls[0].pageSize, 25)
assert.equal(webhookCalls[0].maxExpansionPages, 1)
assert.equal(webhookCalls[0].indexExpansions, false)
assert.equal(webhookRefresh.expansion_runs[0].status, "ok")
assert.equal(webhookRefresh.expansion_runs[1].status, "ok")

const duplicateWebhookRefresh = await webhookStore.triggerScryDexWebhookRefresh("relay-secret", {
  id: "evt-scrydex-graded-001",
  name: "pokemon.expansions.prices.graded_updated",
  data: {
    expansion_ids: ["sv-test-1", "sv-test-2"],
  },
  pageSize: 25,
})
assert.equal(duplicateWebhookRefresh.status, "ok")
assert.equal(duplicateWebhookRefresh.action, "scrydex_catalog_webhook_refresh_already_processed")
assert.equal(duplicateWebhookRefresh.idempotent, true)
assert.equal(duplicateWebhookRefresh.duplicate, true)
assert.equal(webhookCalls.length, 2)

const stuckDownstreamStore = createLocalSyncStore({
  databasePath: ":memory:",
  removeSeedReferenceCards: true,
  now: () => new Date(),
  wordpressCatalogIndexer: async () => ({
    status: "blocked",
    code: "scrydex_provider_aborted",
    message: "This operation was aborted",
    card_result: { page_count: 0, reference_row_count: 0 },
    expansion_result: { page_count: 0 },
    variants: 0,
    prices: 0,
    failed_sets: [],
    failed_cards: [],
  }),
  wordpressCatalogExportPull: async () => new Promise(() => {}),
})
const stuckAuth = stuckDownstreamStore.createSession({ pin: "9999" })
const stuckStart = stuckDownstreamStore.startScryDexCatalogSyncJob(stuckAuth.session.token, {
  game: "pokemon",
  downstreamStallRecoveryMs: 1,
})
assert.equal(stuckStart.status, "ok")
assert.equal(stuckStart.job.status, "running")

for (let attempt = 0; attempt < 30; attempt += 1) {
  const status = stuckDownstreamStore.getScryDexCatalogStatus(stuckAuth.session.token)

  if (status.status === "ok" && status.active_job === null && status.recent_jobs.length === 1) {
    assert.equal(status.recent_jobs[0].status, "completed_with_errors")
    assert.equal(status.recent_jobs[0].downstream_phase, "catalog_pull")
    assert.equal(status.recent_jobs[0].games[0].status, "blocked")
    assert.equal(status.recent_jobs[0].errors[0].message, "This operation was aborted")
    break
  }

  await new Promise((resolve) => setTimeout(resolve, 100))

  if (attempt === 29) {
    throw new Error("Terminal ScryDex game job was not recovered from active running state.")
  }
}

console.log("PASS local sync server ScryDex catalog jobs")

async function waitForCompletedJob() {
  return waitForStoreCompletedJob(store, token)
}

async function waitForStoreCompletedJob(targetStore, targetToken) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const status = targetStore.getScryDexCatalogStatus(targetToken)

    if (status.status === "ok" && !status.active_job && status.recent_jobs.length > 0) {
      return status
    }

    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  throw new Error("ScryDex catalog sync job did not finish in time.")
}

async function waitForRecentJobCount(targetStore, targetToken, expectedCount) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const status = targetStore.getScryDexCatalogStatus(targetToken)

    if (status.status === "ok" && !status.active_job && status.recent_jobs.length >= expectedCount) {
      return status
    }

    await new Promise((resolve) => setTimeout(resolve, 20))
  }

  throw new Error("ScryDex concurrent catalog sync jobs did not finish in time.")
}
