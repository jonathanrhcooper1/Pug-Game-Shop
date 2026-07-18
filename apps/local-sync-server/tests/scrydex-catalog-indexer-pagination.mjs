import assert from "node:assert/strict"

import { createScryDexCatalogIndexer } from "../src/scrydexCatalogIndexer.mjs"

const onePieceRequests = []
const onePieceIndexer = createScryDexCatalogIndexer({
  apiKey: "test-key",
  teamId: "test-team",
  baseUrl: "https://scrydex.test",
  fetcher: async (url) => {
    onePieceRequests.push(new URL(String(url)))

    return jsonResponse({
      data: [{ id: "op-card-1", name: "Test One Piece Card" }],
    })
  },
})

const onePieceResult = await onePieceIndexer({
  game: "onepiece",
  pageSize: 999,
  maxPages: 1,
})

assert.equal(onePieceResult.status, "ok")
assert.equal(onePieceResult.card_page_size, 250)
assert.equal(onePieceResult.expansion_page_size, 250)
assert.equal(onePieceRequests[0].pathname, "/onepiece/v1/cards")
assert.equal(onePieceRequests[0].searchParams.get("page"), "1")
assert.equal(onePieceRequests[0].searchParams.get("page_size"), "250")

const pokemonRequests = []
const pokemonIndexer = createScryDexCatalogIndexer({
  apiKey: "test-key",
  teamId: "test-team",
  baseUrl: "https://scrydex.test",
  fetcher: async (url) => {
    pokemonRequests.push(new URL(String(url)))

    return jsonResponse({
      data: [{ id: "pokemon-card-1", name: "Test Pokemon Card" }],
    })
  },
})

const pokemonResult = await pokemonIndexer({
  game: "pokemon",
  pageSize: 999,
  maxPages: 1,
})

assert.equal(pokemonResult.status, "ok")
assert.equal(pokemonResult.card_page_size, 250)
assert.equal(pokemonRequests[0].pathname, "/pokemon/v1/cards")
assert.equal(pokemonRequests[0].searchParams.get("page_size"), "250")

const cappedRowsIndexer = createScryDexCatalogIndexer({
  apiKey: "test-key",
  teamId: "test-team",
  baseUrl: "https://scrydex.test",
  fetcher: async () => jsonResponse({
    data: Array.from({ length: 20 }, (_, index) => ({
      id: `capped-card-${index + 1}`,
      name: `Capped Card ${index + 1}`,
    })),
  }),
})
const cappedRowsResult = await cappedRowsIndexer({
  game: "magicthegathering",
  pageSize: 5,
  maxPages: 1,
})

assert.equal(cappedRowsResult.status, "ok")
assert.equal(cappedRowsResult.cards.reference_row_count, 5)
assert.equal(cappedRowsResult.reference_cards.length, 5)

const expansionRequests = []
const expansionIndexer = createScryDexCatalogIndexer({
  apiKey: "test-key",
  teamId: "test-team",
  baseUrl: "https://scrydex.test",
  fetcher: async (url) => {
    expansionRequests.push(new URL(String(url)))

    if (String(url).includes("/expansions?")) {
      return jsonResponse({
        data: [{ id: "op-set-1", name: "Test One Piece Set" }],
      })
    }

    return jsonResponse({
      data: [{ id: "op-card-1", name: "Test One Piece Card" }],
    })
  },
})

const expansionResult = await expansionIndexer({
  game: "onepiece",
  pageSize: 250,
  indexExpansions: true,
  maxPages: 1,
  maxExpansionPages: 1,
})

assert.equal(expansionResult.status, "ok")
assert.equal(expansionResult.expansion_page_size, 250)
assert.equal(expansionResult.card_page_size, 250)
assert.equal(expansionRequests[0].pathname, "/onepiece/v1/expansions")
assert.equal(expansionRequests[0].searchParams.get("page_size"), "250")
assert.equal(expansionRequests[1].pathname, "/onepiece/v1/expansions/op-set-1/cards")
assert.equal(expansionRequests[1].searchParams.get("page_size"), "250")

let retryAttempts = 0
const retryIndexer = createScryDexCatalogIndexer({
  apiKey: "test-key",
  teamId: "test-team",
  baseUrl: "https://scrydex.test",
  fetcher: async () => {
    retryAttempts += 1
    if (retryAttempts === 1) {
      throw new Error("fetch failed")
    }

    return jsonResponse({
      data: [{ id: "retry-card-1", name: "Retry Card" }],
    })
  },
})
const retryResult = await retryIndexer({
  game: "magicthegathering",
  maxPages: 1,
})

assert.equal(retryResult.status, "ok")
assert.equal(retryResult.cards.reference_row_count, 1)
assert.equal(retryAttempts, 2)

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  }
}
