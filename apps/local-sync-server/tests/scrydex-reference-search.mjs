import assert from "node:assert/strict"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const fallbackQueries = []
const store = createLocalSyncStore({
  databasePath: ":memory:",
  removeSeedReferenceCards: true,
  websiteCatalogFallback: async ({ query, game, limit }) => {
    fallbackQueries.push({ query, game, limit })

    if (query === "bug catcher") {
      return {
        status: "ok",
        live_provider_request_performed: true,
        cards: [
          {
            id: "sm11-189",
            game,
            name: "Bug Catcher",
            set: {
              name: "Unified Minds",
              code: "UNM",
            },
            number: "189",
            printedNumber: "189/236",
            sku: "SM11-189",
            market_price: {
              amount: "0.20",
              currency: "USD",
            },
            images: {
              large: "https://images.scrydex.example/pokemon/sm11-189/large",
            },
            variants: [
              {
                provider_variant_id: "sm11-189:charizard-stamp-34",
                variant: "charizardStamp34",
                raw_or_graded_support: "both",
              },
              {
                provider_variant_id: "sm11-189:charizard-stamp-47",
                variant: "charizardStamp47",
                raw_or_graded_support: "both",
              },
              {
                provider_variant_id: "sm11-189:mewtwo-stamp",
                variant: "mewtwoStamp",
                raw_or_graded_support: "both",
              },
              {
                provider_variant_id: "sm11-189:pikachu-stamp",
                variant: "pikachuStamp26",
                raw_or_graded_support: "both",
              },
            ],
          },
        ],
      }
    }

    if (query === "pikachu") {
      return {
        status: "ok",
        live_provider_request_performed: true,
        cards: [
          {
            id: "svp-190",
            game,
            name: "Pikachu",
            set: {
              name: "Scarlet & Violet Promos",
              code: "SVP",
            },
            number: "190",
            printedNumber: "190/SV-P",
            sku: "SVP-190",
            market_price: {
              amount: "8.50",
              currency: "USD",
            },
            images: {
              large: "https://images.scrydex.example/pokemon/svp-190/large",
            },
          },
        ],
      }
    }

    if (query === "bulk") {
      return {
        status: "ok",
        live_provider_request_performed: true,
        cards: Array.from({ length: 10 }, (_, index) => {
          const sequence = index + 1
          const beta = sequence > 5

          return {
            id: `scrydex-pokemon-bulk-${sequence}`,
            game,
            name: `Bulk Result ${sequence}`,
            set: {
              name: beta ? "Beta Test Set" : "Alpha Test Set",
              code: beta ? "BTS" : "ATS",
            },
            number: String(sequence),
            printedNumber: `${sequence}/10`,
            sku: `BULK-${sequence}`,
            market_price: {
              amount: "1.00",
              currency: "USD",
            },
            images: {
              large: `https://images.scrydex.example/pokemon/bulk-${sequence}/large`,
            },
          }
        }),
      }
    }

    return {
      status: "ok",
      live_provider_request_performed: true,
      cards: [],
    }
  },
})

try {
  const auth = store.createSession({ pin: "9999" })
  assert.equal(auth.status, "ok")

  const noisyVariant = await store.searchScryDexCards(auth.session.token, {
    query: "bug catcher",
    game: "pokemon",
  })
  assert.equal(noisyVariant.status, "ok")
  assert.equal(noisyVariant.source, "wordpress_proxy")
  assert.equal(noisyVariant.cards[0].card_name, "Bug Catcher")
  assert.ok(noisyVariant.cards[0].variants.some((variant) => variant.variant === "pikachuStamp26"))

  const normalNameSearch = await store.searchScryDexCards(auth.session.token, {
    query: "pikachu",
    game: "pokemon",
  })
  assert.equal(normalNameSearch.status, "ok")
  assert.equal(normalNameSearch.source, "wordpress_proxy")
  assert.equal(normalNameSearch.local_reference_cache_hit, false)
  assert.equal(normalNameSearch.wordpress_proxy_performed, true)
  assert.equal(normalNameSearch.cards[0].card_name, "Pikachu")
  assert.equal(normalNameSearch.cards.some((card) => card.card_name === "Bug Catcher"), false)

  const variantFocusedSearch = await store.searchScryDexCards(auth.session.token, {
    query: "pikachuStamp",
    game: "pokemon",
  })
  assert.equal(variantFocusedSearch.status, "ok")
  assert.equal(variantFocusedSearch.source, "wordpress_catalog_cache")
  assert.equal(variantFocusedSearch.local_reference_cache_hit, true)
  assert.equal(variantFocusedSearch.cards[0].card_name, "Bug Catcher")

  const broadSearch = await store.searchScryDexCards(auth.session.token, {
    query: "bulk",
    game: "pokemon",
  })
  assert.equal(broadSearch.status, "ok")
  assert.equal(broadSearch.source, "wordpress_proxy")
  assert.equal(broadSearch.cards.length, 10)
  assert.equal(broadSearch.result_limit, "all")

  const filteredBroadSearch = await store.searchScryDexCards(auth.session.token, {
    query: "bulk",
    game: "pokemon",
    setFilter: "beta",
  })
  assert.equal(filteredBroadSearch.status, "ok")
  assert.equal(filteredBroadSearch.source, "wordpress_catalog_cache")
  assert.equal(filteredBroadSearch.cards.length, 5)
  assert.equal(filteredBroadSearch.cards.every((card) => card.set_name === "Beta Test Set"), true)

  const magicIntake = await store.createInventoryIntake(auth.session.token, {
    card_name: "Mox Jasper",
    set_name: "Tarkir: Dragonstorm",
    game: "magicthegathering",
    condition: "NM",
    price_minor_units: 1556,
    online_visibility: "visible",
  })
  assert.equal(magicIntake.status, "ok")
  assert.equal(magicIntake.item.game, "magicthegathering")
  assert.equal(magicIntake.item.price_minor_units, 1600)

  const magicAliasIntake = await store.createInventoryIntake(auth.session.token, {
    card_name: "Mox Jasper",
    set_name: "Tarkir: Dragonstorm Promos",
    game: "magic",
    condition: "NM",
    price_minor_units: 2000,
    online_visibility: "visible",
  })
  assert.equal(magicAliasIntake.status, "ok")
  assert.equal(magicAliasIntake.item.game, "magicthegathering")

  assert.deepEqual(fallbackQueries, [
    { query: "bug catcher", game: "pokemon", limit: 250 },
    { query: "pikachu", game: "pokemon", limit: 250 },
    { query: "bulk", game: "pokemon", limit: 250 },
  ])

  console.log("PASS ScryDex reference search relevance")
} finally {
  store.close()
}
