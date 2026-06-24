import { resolve } from "node:path"

import {
  createSnapshotDirectory,
  extractSquareVariationIds,
  loadOpsEnv,
  operationSummary,
  pullSquareInventoryCounts,
  pullWebsiteCatalogRows,
  pullWebsiteInventoryRows,
  readLocalTable,
  writeCsvFile,
  writeJsonFile,
} from "./lib/ops-common.mjs"

loadOpsEnv()

const outputDir = createSnapshotDirectory("inventory-snapshot")
const localInventory = readLocalTable("inventory_items")
const localCatalog = readLocalTable("reference_cards")
const localQueue = readLocalTable("operation_queue")
const websiteInventory = await pullWebsiteInventoryRows(100)
const websiteReferenceCards = await pullWebsiteCatalogRows("reference_cards", 1000)
const websitePricePoints = await pullWebsiteCatalogRows("provider_price_points", 1000)
const websitePriceObservations = await pullWebsiteCatalogRows("provider_price_observations", 1000)
const mappedSquareVariationIds = extractSquareVariationIds(localInventory.rows, websiteInventory.rows)
const squareInventory = await pullSquareInventoryCounts()
const squareMappedInventory =
  mappedSquareVariationIds.length > 0
    ? await pullSquareInventoryCounts(mappedSquareVariationIds)
    : {
        status: "skipped",
        code: "no_square_variation_ids_in_local_or_website_inventory",
        counts: [],
        count_count: 0,
        credentials_printed: false,
      }

writeJsonFile(resolve(outputDir, "local_app_inventory_items.json"), localInventory)
writeCsvFile(resolve(outputDir, "local_app_inventory_items.csv"), localInventory.rows)
writeJsonFile(resolve(outputDir, "local_app_reference_cards.json"), localCatalog)
writeCsvFile(resolve(outputDir, "local_app_reference_cards.csv"), localCatalog.rows)
writeJsonFile(resolve(outputDir, "local_app_operation_queue.json"), localQueue)
writeCsvFile(resolve(outputDir, "local_app_operation_queue.csv"), localQueue.rows)
writeJsonFile(resolve(outputDir, "website_inventory_items.json"), websiteInventory)
writeCsvFile(resolve(outputDir, "website_inventory_items.csv"), websiteInventory.rows)
writeJsonFile(resolve(outputDir, "website_reference_cards.json"), websiteReferenceCards)
writeCsvFile(resolve(outputDir, "website_reference_cards.csv"), websiteReferenceCards.rows)
writeJsonFile(resolve(outputDir, "website_provider_price_points.json"), websitePricePoints)
writeCsvFile(resolve(outputDir, "website_provider_price_points.csv"), websitePricePoints.rows)
writeJsonFile(resolve(outputDir, "website_provider_price_observations.json"), websitePriceObservations)
writeCsvFile(resolve(outputDir, "website_provider_price_observations.csv"), websitePriceObservations.rows)
writeJsonFile(resolve(outputDir, "square_inventory_counts.json"), squareInventory)
writeCsvFile(resolve(outputDir, "square_inventory_counts.csv"), squareInventory.counts ?? [])
writeJsonFile(resolve(outputDir, "square_mapped_inventory_counts.json"), squareMappedInventory)
writeCsvFile(resolve(outputDir, "square_mapped_inventory_counts.csv"), squareMappedInventory.counts ?? [])

const summary = {
  status: "ok",
  output_dir: outputDir,
  generated_at_utc: new Date().toISOString(),
  local_app_inventory_count: localInventory.rows.length,
  local_app_reference_card_count: localCatalog.rows.length,
  local_app_queue_count: localQueue.rows.length,
  website_inventory_count: websiteInventory.rows.length,
  website_reference_card_count: websiteReferenceCards.rows.length,
  website_price_point_count: websitePricePoints.rows.length,
  website_price_observation_count: websitePriceObservations.rows.length,
  square_inventory_count: squareInventory.count_count ?? (squareInventory.counts ?? []).length,
  square_mapped_inventory_count: squareMappedInventory.count_count ?? (squareMappedInventory.counts ?? []).length,
  square_variation_ids_mapped_from_local_or_website: mappedSquareVariationIds.length,
  connector_summary: operationSummary(),
  credentials_printed: false,
}

writeJsonFile(resolve(outputDir, "summary.json"), summary)
console.log(JSON.stringify(summary, null, 2))
