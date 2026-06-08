import { listenLocalSyncHttpServer } from "./localSyncHttpServer.mjs"

const host = process.env.PUG_LOCAL_SYNC_HOST ?? "127.0.0.1"
const port = process.env.PUG_LOCAL_SYNC_PORT ?? "8787"
const databasePath = process.env.PUG_LOCAL_SYNC_DB
const server = await listenLocalSyncHttpServer({ host, port, storeOptions: { databasePath } })
const address = server.address()
const resolvedPort = typeof address === "object" && address ? address.port : port

console.log(`Pug local sync server listening on http://${host}:${resolvedPort}`)
