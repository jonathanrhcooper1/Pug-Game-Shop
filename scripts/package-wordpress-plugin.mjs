import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const version = packageJson.version
const outDir = resolve(root, "dist")
const outFile = resolve(outDir, `tcg-store-platform-${version}.zip`)

mkdirSync(outDir, { recursive: true })

execFileSync(
  "git",
  [
    "archive",
    "--format=zip",
    "--prefix=tcg-store-platform/",
    `--output=${outFile}`,
    "HEAD:apps/wordpress-plugin",
    "README.md",
    "readme.txt",
    "src",
    "tcg-store-platform.php",
    "uninstall.php",
  ],
  {
    cwd: root,
    stdio: "inherit",
  },
)

const size = statSync(outFile).size

if (size <= 0) {
  throw new Error(`Package is empty: ${outFile}`)
}

console.log(JSON.stringify({ package: outFile, sizeBytes: size }, null, 2))
