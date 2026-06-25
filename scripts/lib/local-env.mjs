import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

export function loadLocalEnv(paths) {
  for (const envPath of paths) {
    const absolutePath = resolve(envPath)

    if (!existsSync(absolutePath)) {
      continue
    }

    const contents = readFileSync(absolutePath, "utf8")

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith("#")) {
        continue
      }

      const separator = trimmed.indexOf("=")

      if (separator <= 0) {
        continue
      }

      const key = trimmed.slice(0, separator).trim()
      const rawValue = trimmed.slice(separator + 1).trim()

      if (!key || process.env[key] !== undefined) {
        continue
      }

      process.env[key] = unquote(rawValue)
    }
  }
}

function unquote(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}
