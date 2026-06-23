import { execFileSync } from "node:child_process"
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const outDir = resolve(root, "dist")
const outFile = resolve(outDir, "pug-lan-server.zip")
const stagingDir = resolve(root, ".codex-tmp/pug-lan-server-package")

mkdirSync(outDir, { recursive: true })
rmSync(outFile, { force: true })
rmSync(stagingDir, { recursive: true, force: true })
mkdirSync(resolve(stagingDir, "apps"), { recursive: true })
mkdirSync(resolve(stagingDir, "packages"), { recursive: true })

cpSync(resolve(root, "apps/local-sync-server"), resolve(stagingDir, "apps/local-sync-server"), {
  recursive: true,
  force: true,
})
cpSync(resolve(root, "packages/api-client"), resolve(stagingDir, "packages/api-client"), {
  recursive: true,
  force: true,
})
scrubForbidden(stagingDir)

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
    stagingDir,
    ".",
  ],
  { stdio: "inherit" },
)

console.log(`Packaged Pug LAN server: ${outFile}`)

function scrubForbidden(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name)

    if (shouldRemove(entry.name)) {
      rmSync(fullPath, { recursive: true, force: true })
      continue
    }

    if (entry.isDirectory()) {
      scrubForbidden(fullPath)
    }
  }
}

function shouldRemove(name) {
  if (
    name === "node_modules" ||
    name === ".env" ||
    name === ".env.local" ||
    name.startsWith(".env.") ||
    name === "store-sync.sqlite" ||
    name.endsWith(".sqlite") ||
    name.endsWith(".sqlite-shm") ||
    name.endsWith(".sqlite-wal") ||
    name.endsWith(".log")
  ) {
    return true
  }

  return false
}
