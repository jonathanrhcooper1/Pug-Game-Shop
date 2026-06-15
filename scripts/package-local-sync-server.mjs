import { execFileSync } from "node:child_process"
import { mkdirSync, rmSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const outDir = resolve(root, "dist")
const outFile = resolve(outDir, "pug-local-sync-middleman-server.zip")

mkdirSync(outDir, { recursive: true })
rmSync(outFile, { force: true })

execFileSync(
  "tar",
  [
    "-a",
    "-cf",
    outFile,
    "--exclude=store-sync.sqlite",
    "--exclude=*.sqlite",
    "--exclude=*.sqlite-shm",
    "--exclude=*.sqlite-wal",
    "--exclude=*.log",
    "--exclude=.env",
    "--exclude=.env.*",
    "--exclude=.env.local",
    "--exclude=node_modules",
    "-C",
    resolve(root, "apps/local-sync-server"),
    ".",
  ],
  { stdio: "inherit" },
)

console.log(`Packaged local sync middleman server: ${outFile}`)
