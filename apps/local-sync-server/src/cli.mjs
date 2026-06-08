import { listenLocalSyncHttpServer } from "./localSyncHttpServer.mjs"
import { createWordPressCatalogFallback } from "./wordpressCatalogFallback.mjs"
import { createWordPressInventoryPull } from "./wordpressInventoryPull.mjs"
import { createWordPressInventoryPush } from "./wordpressInventoryPush.mjs"

const host = process.env.PUG_LOCAL_SYNC_HOST ?? "127.0.0.1"
const port = process.env.PUG_LOCAL_SYNC_PORT ?? "8787"
const databasePath = process.env.PUG_LOCAL_SYNC_DB
const websiteCatalogFallback = createWordPressCatalogFallback({
  websiteUrl: process.env.PUG_WORDPRESS_URL,
  restBasePath: process.env.PUG_WORDPRESS_REST_BASE,
  authHeader: process.env.PUG_WORDPRESS_CATALOG_AUTH_HEADER,
  username: process.env.PUG_WORDPRESS_CATALOG_USERNAME,
  applicationPassword: process.env.PUG_WORDPRESS_CATALOG_APPLICATION_PASSWORD,
})
const wordpressInventoryPush = createWordPressInventoryPush({
  websiteUrl: process.env.PUG_WORDPRESS_URL,
  restBasePath: process.env.PUG_WORDPRESS_REST_BASE,
  authHeader: process.env.PUG_WORDPRESS_INVENTORY_AUTH_HEADER ?? process.env.PUG_WORDPRESS_CATALOG_AUTH_HEADER,
  username: process.env.PUG_WORDPRESS_INVENTORY_USERNAME ?? process.env.PUG_WORDPRESS_CATALOG_USERNAME,
  applicationPassword:
    process.env.PUG_WORDPRESS_INVENTORY_APPLICATION_PASSWORD ??
    process.env.PUG_WORDPRESS_CATALOG_APPLICATION_PASSWORD,
  defaultLocationId: process.env.PUG_WORDPRESS_DEFAULT_LOCATION_ID,
})
const wordpressInventoryPull = createWordPressInventoryPull({
  websiteUrl: process.env.PUG_WORDPRESS_URL,
  restBasePath: process.env.PUG_WORDPRESS_REST_BASE,
  authHeader: process.env.PUG_WORDPRESS_INVENTORY_AUTH_HEADER ?? process.env.PUG_WORDPRESS_CATALOG_AUTH_HEADER,
  username: process.env.PUG_WORDPRESS_INVENTORY_USERNAME ?? process.env.PUG_WORDPRESS_CATALOG_USERNAME,
  applicationPassword:
    process.env.PUG_WORDPRESS_INVENTORY_APPLICATION_PASSWORD ??
    process.env.PUG_WORDPRESS_CATALOG_APPLICATION_PASSWORD,
  pageSize: process.env.PUG_WORDPRESS_PULL_PAGE_SIZE,
})
const server = await listenLocalSyncHttpServer({
  host,
  port,
  storeOptions: { databasePath, websiteCatalogFallback, wordpressInventoryPull, wordpressInventoryPush },
})
const address = server.address()
const resolvedPort = typeof address === "object" && address ? address.port : port

console.log(`Pug local sync server listening on http://${host}:${resolvedPort}`)
