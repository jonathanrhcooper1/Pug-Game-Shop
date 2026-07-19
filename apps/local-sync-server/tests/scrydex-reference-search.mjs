import assert from "node:assert/strict"

import { createLocalSyncStore } from "../src/localSyncStore.mjs"

const fallbackQueries = []
const visionRequests = []
const indexerCalls = []
const store = createLocalSyncStore({
  databasePath: ":memory:",
  removeSeedReferenceCards: true,
  wordpressCatalogIndexer: async (input) => {
    indexerCalls.push(input)

    return {
      status: "ok",
      code: "scrydex_game_index_complete",
      message: "No-op test indexer.",
      card_result: { page_count: 1, reference_row_count: 0 },
      expansion_result: { page_count: 1 },
      variants: 0,
      prices: 0,
      failed_sets: [],
      failed_cards: [],
    }
  },
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
  websiteCatalogFallback: async ({ query, game, limit, rawOrGraded = "", forceLive = false }) => {
    fallbackQueries.push({ query, game, limit, forceLive })

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

    if (query === "variant price test") {
      return {
        status: "ok",
        live_provider_request_performed: true,
        cards: [
          {
            id: "price-test-001",
            game,
            name: "Variant Price Test",
            set: {
              name: "Variant Set",
              code: "VRT",
            },
            number: "9",
            printedNumber: "9/99",
            sku: "VRT-009",
            market_price: {
              amount: "10.00",
              currency: "USD",
            },
            images: [
              {
                type: "front",
                small: "https://images.scrydex.example/pokemon/variant-price-test/small",
                medium: "https://images.scrydex.example/pokemon/variant-price-test/medium",
                large: "https://images.scrydex.example/pokemon/variant-price-test/large",
              },
            ],
            variants: [
              {
                provider_variant_id: "price-test-normal",
                variant: "normal",
                finish: "normal",
                raw_or_graded_support: "raw",
                image_url: "https://images.scrydex.example/pokemon/variant-price-test/normal",
              },
              {
                provider_variant_id: "price-test-extended",
                variant: "extended art",
                finish: "foil",
                raw_or_graded_support: "raw",
                image_url: "https://images.scrydex.example/pokemon/variant-price-test/extended",
              },
            ],
            price_points: [
              {
                provider_variant_id: "price-test-normal",
                raw_or_graded: "raw",
                condition_code: "NM",
                market_price: "10.00",
                currency: "USD",
              },
              {
                provider_variant_id: "price-test-normal",
                raw_or_graded: "raw",
                condition_code: "Lightly Played",
                market_price: "8.00",
                currency: "USD",
              },
              {
                provider_variant_id: "price-test-extended",
                raw_or_graded: "raw",
                condition_code: "NM",
                market_price: "4.50",
                currency: "USD",
              },
              {
                provider_variant_id: "price-test-extended",
                raw_or_graded: "raw",
                condition_code: "Lightly Played",
                market_price: "3.50",
                currency: "USD",
              },
              {
                raw_or_graded: "raw",
                market_price: "2.00",
                currency: "USD",
              },
            ],
          },
        ],
      }
    }

    if (query === "jp aegislash v") {
      return {
        status: "ok",
        live_provider_request_performed: true,
        cards: [
          {
            id: "swsh4_ja-80",
            game,
            name: "JP Aegislash V",
            set: {
              name: "Amazing Volt Tackle",
              code: "S4",
            },
            number: "80",
            printedNumber: "080/100",
            market_price: {
              amount: "100.00",
              currency: "JPY",
            },
            language: "Japanese",
            language_code: "JA",
            images: [
              {
                type: "front",
                small: "https://images.scrydex.example/pokemon/swsh4_ja-80/small",
                medium: "https://images.scrydex.example/pokemon/swsh4_ja-80/medium",
                large: "https://images.scrydex.example/pokemon/swsh4_ja-80/large",
              },
            ],
            variants: [
              {
                id: "swsh4_ja-80-holo",
                name: "holofoil",
                images: [
                  {
                    type: "front",
                    small: "https://images.scrydex.example/pokemon/swsh4_ja-80/holo-small",
                    medium: "https://images.scrydex.example/pokemon/swsh4_ja-80/holo-medium",
                    large: "https://images.scrydex.example/pokemon/swsh4_ja-80/holo-large",
                  },
                ],
                prices: [
                  {
                    condition: "NM",
                    market_price: "100.00",
                    currency: "JPY",
                  },
                ],
              },
            ],
          },
        ],
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

  const liveBroadSearch = await store.searchScryDexCards(auth.session.token, {
    query: "bulk",
    game: "pokemon",
    limit: "all",
    forceLive: true,
  })
  assert.equal(liveBroadSearch.status, "ok")
  assert.equal(liveBroadSearch.force_live_refresh, true)
  assert.equal(liveBroadSearch.live_provider_request_performed, true)

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

  const variantPriceSearch = await store.searchScryDexCards(auth.session.token, {
    query: "variant price test",
    game: "pokemon",
  })
  assert.equal(variantPriceSearch.status, "ok")
  assert.equal(variantPriceSearch.cards[0].provider_card_id, "price-test-001")
  assert.equal(variantPriceSearch.cards[0].image_url, "https://images.scrydex.example/pokemon/variant-price-test/large")
  assert.ok(
    variantPriceSearch.cards[0].price_points.some(
      (point) =>
        point.provider_variant_id === "price-test-extended" &&
        point.condition_code === "LP" &&
        point.market_price_minor_units === 350,
    ),
  )

  const variantPriceIntake = await store.createInventoryIntake(auth.session.token, {
    card_name: "Variant Price Test",
    set_name: "Variant Set",
    game: "pokemon",
    condition: "Lightly Played",
    provider_card_id: "price-test-001",
    provider_variant_id: "price-test-extended",
    variant: "extended art",
    finish: "foil",
    price_minor_units: 100,
    minimum_sale_price_minor_units: 100,
    online_visibility: "visible",
    kiosk_visibility: "visible",
    pos_visibility: "visible",
  })
  assert.equal(variantPriceIntake.status, "ok")
  assert.equal(variantPriceIntake.item.provider_variant_id, "price-test-extended")

  const contaminatedMappingIntake = await store.createInventoryIntake(auth.session.token, {
    card_name: "Sealed Product Box",
    set_name: "Trade-In Intake",
    game: "pokemon",
    condition: "Near Mint",
    provider_card_id: "price-test-001",
    provider_variant_id: "price-test-extended",
    finish: "foil",
    price_minor_units: 2750,
    minimum_sale_price_minor_units: 2000,
    online_visibility: "visible",
    kiosk_visibility: "visible",
    pos_visibility: "visible",
  })
  assert.equal(contaminatedMappingIntake.status, "ok")

  const bulkReviewIntake = await store.createInventoryIntake(auth.session.token, {
    card_name: "Variant Price Test",
    set_name: "Variant Set",
    game: "pokemon",
    condition: "Moderately Played",
    provider_card_id: "price-test-001",
    provider_variant_id: "price-test-extended",
    variant: "extended art",
    finish: "foil",
    price_minor_units: 100,
    minimum_sale_price_minor_units: 100,
    online_visibility: "visible",
    kiosk_visibility: "visible",
    pos_visibility: "visible",
  })
  assert.equal(bulkReviewIntake.status, "ok")

  const variantReprice = await store.indexScryDexCatalogForSystem({
    games: ["pokemon"],
    skipLocalCatalogPull: true,
    source: "variant_price_reprice_contract",
    squareSyncDelayMs: 0,
  })
  assert.equal(variantReprice.status, "ok")
  assert.equal(variantReprice.inventory_reprice.status, "ok")
  assert.equal(variantReprice.inventory_reprice.changed_count, 0)
  assert.ok(variantReprice.inventory_reprice.price_review_required_count >= 1)
  assert.equal(variantReprice.inventory_reprice.floor_clamped_count, 0)

  const contaminatedMappingInventory = store.searchInventory({ query: "Sealed Product Box" })
  assert.equal(contaminatedMappingInventory.status, "ok")
  assert.equal(contaminatedMappingInventory.items[0].price_minor_units, 2800)
  const contaminatedMappingReview = store.listPriceReviews(auth.session.token, { status: "pending" }).reviews.find(
    (review) => review.inventory_item?.card_name === "Sealed Product Box",
  )
  assert.ok(contaminatedMappingReview)
  assert.equal(contaminatedMappingReview.reason_code, "reference_identity_mismatch")
  assert.equal(contaminatedMappingReview.candidate_price_minor_units, 2800)

  const priceReviews = store.listPriceReviews(auth.session.token, { status: "pending" })
  assert.equal(priceReviews.status, "ok")
  const variantPriceReview = priceReviews.reviews.find(
    (review) =>
      review.inventory_item?.provider_variant_id === "price-test-extended" &&
      review.inventory_item?.condition === "LP",
  )
  assert.ok(variantPriceReview)
  assert.equal(variantPriceReview.current_price_minor_units, 100)
  assert.equal(variantPriceReview.candidate_price_minor_units, 400)
  assert.equal(variantPriceReview.percent_change_basis_points, 30000)

  const approvedReprice = await store.decidePriceReview(
    auth.session.token,
    variantPriceReview.review_id,
    {
      status: "approved",
      manualPriceOverride: true,
      notes: "manager manual price contract approval",
    },
  )
  assert.equal(approvedReprice.status, "ok")
  assert.equal(approvedReprice.action, "price_review_manual_price_set")
  assert.equal(approvedReprice.item.price_minor_units, 400)
  assert.equal(approvedReprice.item.pricing_source, "manual_price_override")

  const bulkReview = priceReviews.reviews.find(
    (review) =>
      review.inventory_item?.provider_variant_id === "price-test-extended" &&
      review.inventory_item?.condition === "MP",
  )
  assert.ok(bulkReview)
  const bulkApproved = await store.decidePriceReviews(auth.session.token, {
    review_ids: [bulkReview.review_id],
    status: "approved",
    notes: "bulk pricing engine contract approval",
  })
  assert.equal(bulkApproved.status, "ok")
  assert.equal(bulkApproved.action, "price_reviews_bulk_approved")
  assert.equal(bulkApproved.accepted_count, 1)

  const repriced = store.searchInventory({ query: "Variant Price Test" })
  assert.equal(repriced.status, "ok")
  const repricedVariant = repriced.items.find((item) => item.provider_variant_id === "price-test-extended")
  assert.ok(repricedVariant, "expected repriced inventory row to keep the selected provider variant")
  assert.equal(repricedVariant.market_price_minor_units, 350)
  assert.equal(repricedVariant.price_minor_units, 400)
  assert.equal(repricedVariant.minimum_sale_price_minor_units, 100)

  const manualPriceUpdate = await store.updateInventoryItem(auth.session.token, repricedVariant.public_id, {
    price_minor_units: 800,
    minimum_sale_price_minor_units: 100,
    reason: "staff manual price override regression",
    sync_intent: "staff_manual_price_visibility_update",
  })
  assert.equal(manualPriceUpdate.status, "ok")
  assert.equal(manualPriceUpdate.item.price_minor_units, 800)
  assert.equal(manualPriceUpdate.item.pricing_source, "manual_price_override")

  const manualPriceProtectedReprice = await store.indexScryDexCatalogForSystem({
    games: ["pokemon"],
    skipLocalCatalogPull: true,
    source: "manual_price_override_reprice_contract",
    squareSyncDelayMs: 0,
  })
  assert.equal(manualPriceProtectedReprice.status, "ok")
  assert.equal(manualPriceProtectedReprice.inventory_reprice.status, "ok")
  assert.equal(manualPriceProtectedReprice.inventory_reprice.changed_count, 0)
  assert.equal(manualPriceProtectedReprice.inventory_reprice.manual_price_protected_count, 1)

  const manualPriceProtectedInventory = store.searchInventory({ query: "Variant Price Test" })
  assert.equal(manualPriceProtectedInventory.status, "ok")
  const protectedVariant = manualPriceProtectedInventory.items.find(
    (item) => item.provider_variant_id === "price-test-extended",
  )
  assert.ok(protectedVariant, "expected manually priced inventory row")
  assert.equal(protectedVariant.price_minor_units, 800)
  assert.equal(protectedVariant.market_price_minor_units, 350)
  assert.equal(protectedVariant.auto_price_minor_units, 400)
  assert.equal(protectedVariant.pricing_source, "manual_price_override")

  const jpAegislashSearch = await store.searchScryDexCards(auth.session.token, {
    query: "jp aegislash v",
    game: "pokemon",
  })
  assert.equal(jpAegislashSearch.status, "ok")
  assert.equal(jpAegislashSearch.cards[0].image_url, "https://images.scrydex.example/pokemon/swsh4_ja-80/large")
  assert.equal(jpAegislashSearch.cards[0].market_price_minor_units, 0)
  assert.equal(jpAegislashSearch.cards[0].price_points.length, 1)
  assert.equal(jpAegislashSearch.cards[0].price_points[0].currency, "JPY")

  const jpAegislashIntake = await store.createInventoryIntake(auth.session.token, {
    card_name: "JP Aegislash V",
    set_name: "Amazing Volt Tackle",
    game: "pokemon",
    condition: "NM",
    provider_card_id: "swsh4_ja-80",
    provider_variant_id: "swsh4_ja-80-holo",
    price_minor_units: 100,
    minimum_sale_price_minor_units: 100,
    online_visibility: "visible",
    kiosk_visibility: "visible",
    pos_visibility: "visible",
  })
  assert.equal(jpAegislashIntake.status, "ok")

  const jpAegislashReprice = await store.indexScryDexCatalogForSystem({
    games: ["pokemon"],
    skipLocalCatalogPull: true,
    source: "jp_aegislash_yen_reprice_contract",
    squareSyncDelayMs: 0,
  })
  assert.equal(jpAegislashReprice.status, "ok")
  const jpAegislashInventory = store.searchInventory({ query: "JP Aegislash V" })
  assert.equal(jpAegislashInventory.status, "ok")
  assert.equal(jpAegislashInventory.items[0].price_minor_units, 100)
  assert.equal(jpAegislashInventory.items[0].minimum_sale_price_minor_units, 100)

  assert.deepEqual(fallbackQueries, [
    { query: "bug catcher", game: "pokemon", limit: "all", forceLive: false },
    { query: "pikachu", game: "pokemon", limit: "all", forceLive: false },
    { query: "scan target", game: "pokemon", limit: "all", forceLive: false },
    { query: "charizard ex", game: "pokemon", limit: "all", forceLive: false },
    { query: "charizard ex", game: "pokemon", limit: "all", forceLive: false },
    { query: "bulk", game: "pokemon", limit: "all", forceLive: false },
    { query: "bulk", game: "pokemon", limit: "all", forceLive: false },
    { query: "bulk", game: "pokemon", limit: "all", forceLive: true },
    { query: "variant price test", game: "pokemon", limit: "all", forceLive: false },
    { query: "jp aegislash v", game: "pokemon", limit: "all", forceLive: false },
  ])
  assert.equal(indexerCalls.length, 3)
  assert.equal(indexerCalls[0].game, "pokemon")
  assert.equal(indexerCalls[1].game, "pokemon")
  assert.equal(indexerCalls[2].game, "pokemon")

  console.log("PASS ScryDex reference search relevance")
} finally {
  store.close()
}
