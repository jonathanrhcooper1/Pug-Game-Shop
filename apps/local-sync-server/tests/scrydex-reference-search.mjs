import assert from "node:assert/strict"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const fallbackQueries = []
const visionRequests = []
const store = createLocalSyncStore({
  databasePath: ":memory:",
  removeSeedReferenceCards: true,
  scryDexVisionIdentifier: {
    configured: true,
    identifyCardImage: async (input) => {
      visionRequests.push(input)

      return {
        status: "ok",
        action: "scrydex_vision_card_identified",
        analysis: {
          type: "raw",
          game: "pokemon",
          language_code: "EN",
          graded_details: {},
        },
        matches: [
          {
            rank: 1,
            score: 0.94,
            provider_card_id: "vision-scan-001",
            game: "pokemon",
            card_name: "Scan Target",
            set_name: "Vision Set",
            set_code: "VIS",
            card_number: "7",
            printed_number: "7/100",
            image_url: "https://images.scrydex.example/pokemon/vision-scan-001/large",
          },
        ],
        match_count: 1,
        top_query: "scan target",
        game: "pokemon",
        provider: "scrydex_vision",
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      }
    },
  },
  websiteCatalogFallback: async ({ query, game, limit, rawOrGraded = "" }) => {
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
            prices: [
              {
                type: "graded",
                company: "PSA",
                is_perfect: true,
                market: "144.50",
                low: "120.00",
                currency: "USD",
              },
            ],
          },
        ],
      }
    }

    if (query === "scan target") {
      return {
        status: "ok",
        live_provider_request_performed: true,
        cards: [
          {
            id: "vision-scan-001",
            game,
            name: "Scan Target",
            set: {
              name: "Vision Set",
              code: "VIS",
            },
            number: "7",
            printedNumber: "7/100",
            sku: "VIS-007",
            market_price: {
              amount: "12.30",
              currency: "USD",
            },
            images: {
              large: "https://images.scrydex.example/pokemon/vision-scan-001/large",
            },
          },
        ],
      }
    }

    if (query === "charizard ex") {
      const graded = rawOrGraded === "graded"

      return {
        status: "ok",
        live_provider_request_performed: graded,
        cards: [
          {
            id: "sv3pt5-183",
            game,
            name: "Charizard ex",
            set: {
              name: "151",
              code: "MEW",
            },
            number: "183",
            printedNumber: "183/165",
            sku: "SV3PT5-183",
            market_price: {
              amount: "45.70",
              currency: "USD",
            },
            price_points: graded
              ? [
                  {
                    raw_or_graded: "graded",
                    condition_code: "graded",
                    grading_company: "SGC",
                    grade: "10",
                    market_price: "466.93",
                    currency: "USD",
                  },
                ]
              : [],
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
  assert.equal(normalNameSearch.cards[0].price_points[0].raw_or_graded, "graded")
  assert.equal(normalNameSearch.cards[0].price_points[0].grading_company, "PSA")
  assert.equal(normalNameSearch.cards[0].price_points[0].grade, "10")
  assert.equal(normalNameSearch.cards[0].price_points[0].market_price_minor_units, 14450)
  assert.equal(normalNameSearch.cards.some((card) => card.card_name === "Bug Catcher"), false)

  const visionLookup = await store.identifyScryDexCardImage(auth.session.token, {
    image_data_url: "data:image/jpeg;base64,Y2FyZA==",
    game: "pokemon",
  })
  assert.equal(visionLookup.status, "ok")
  assert.equal(visionLookup.action, "scrydex_vision_card_scan")
  assert.equal(visionLookup.vision_query, "scan target")
  assert.equal(visionLookup.vision_set_filter, "vision set")
  assert.equal(visionLookup.cards[0].card_name, "Scan Target")
  assert.equal(visionLookup.cards[0].set_name, "Vision Set")
  assert.equal(visionLookup.credentials_synced_to_client, false)
  assert.equal(visionLookup.raw_credentials_returned, false)
  assert.equal(visionRequests[0].game, "pokemon")

  const rawCharizardSearch = await store.searchScryDexCards(auth.session.token, {
    query: "charizard ex",
    game: "pokemon",
  })
  assert.equal(rawCharizardSearch.status, "ok")
  assert.equal(rawCharizardSearch.cards[0].card_name, "Charizard ex")
  assert.equal(rawCharizardSearch.cards[0].price_points.length, 0)

  const gradedCharizardSearch = await store.searchScryDexCards(auth.session.token, {
    query: "charizard ex",
    game: "pokemon",
    rawOrGraded: "graded",
  })
  assert.equal(gradedCharizardSearch.status, "ok")
  assert.equal(gradedCharizardSearch.local_reference_cache_hit, true)
  assert.equal(gradedCharizardSearch.wordpress_proxy_performed, true)
  assert.equal(gradedCharizardSearch.cards[0].price_points[0].raw_or_graded, "graded")
  assert.equal(gradedCharizardSearch.cards[0].price_points[0].grading_company, "SGC")
  assert.equal(gradedCharizardSearch.cards[0].price_points[0].grade, "10")
  assert.equal(gradedCharizardSearch.cards[0].price_points[0].market_price_minor_units, 46693)

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

  const repeatedBroadSearch = await store.searchScryDexCards(auth.session.token, {
    query: "bulk",
    game: "pokemon",
    limit: "all",
  })
  assert.equal(repeatedBroadSearch.status, "ok")
  assert.equal(repeatedBroadSearch.source, "wordpress_catalog_cache")
  assert.equal(repeatedBroadSearch.local_reference_cache_hit, true)
  assert.equal(repeatedBroadSearch.wordpress_proxy_performed, true)
  assert.equal(repeatedBroadSearch.cards.length, 10)
  assert.equal(repeatedBroadSearch.result_limit, "all")

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
    { query: "bug catcher", game: "pokemon", limit: "all" },
    { query: "pikachu", game: "pokemon", limit: "all" },
    { query: "scan target", game: "pokemon", limit: "all" },
    { query: "charizard ex", game: "pokemon", limit: "all" },
    { query: "charizard ex", game: "pokemon", limit: "all" },
    { query: "bulk", game: "pokemon", limit: "all" },
    { query: "bulk", game: "pokemon", limit: "all" },
  ])

  console.log("PASS ScryDex reference search relevance")
} finally {
  store.close()
}
