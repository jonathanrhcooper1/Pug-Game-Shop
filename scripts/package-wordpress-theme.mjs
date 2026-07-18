import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const version = packageJson.version
const themeSlug = "pug-arcade-commerce-v2"
const sourcePath = "apps/storefront-theme-or-blocks/pug-arcade-commerce-v2"
const outDir = resolve(root, "dist")
const outFile = resolve(outDir, `${themeSlug}-${version}.zip`)

mkdirSync(outDir, { recursive: true })
rmSync(outFile, { force: true })

const tempIndexDir = mkdtempSync(resolve(tmpdir(), "pug-storefront-theme-package-"))
const tempIndex = resolve(tempIndexDir, "index")
const gitEnv = { ...process.env, GIT_INDEX_FILE: tempIndex }

execFileSync("git", ["read-tree", "HEAD"], {
  cwd: root,
  env: gitEnv,
  stdio: "inherit",
})

execFileSync("git", ["add", "-A", "--", sourcePath], {
  cwd: root,
  env: gitEnv,
  stdio: "inherit",
})

const tree = execFileSync("git", ["write-tree"], {
  cwd: root,
  env: gitEnv,
  encoding: "utf8",
}).trim()

execFileSync(
  "git",
  [
    "archive",
    "--format=zip",
    `--prefix=${themeSlug}/`,
    `--output=${outFile}`,
    `${tree}:${sourcePath}`,
  ],
  {
    cwd: root,
    stdio: "inherit",
  },
)
rmSync(tempIndexDir, { force: true, recursive: true })

const size = statSync(outFile).size

if (size <= 0) {
  throw new Error(`Theme package is empty: ${outFile}`)
}

console.log(JSON.stringify({ package: outFile, themeSlug, sizeBytes: size }, null, 2))
