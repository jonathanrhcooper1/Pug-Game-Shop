#!/usr/bin/env node
import { setupSanitizedFixtures } from "./pug-sanitized-e2e-fixtures-lib.mjs"

const options = parseArguments(process.argv.slice(2))

setupSanitizedFixtures(options)
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(`Fixture setup failed: ${error.message}`)
    process.exitCode = 1
  })

function parseArguments(args) {
  const options = {
    apply: false,
    allowLocalWrite: false,
    allowProductionLocalDb: false,
    bootstrapIsolated: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--database") options.databasePath = args[++index]
    else if (argument === "--manifest") options.manifestPath = args[++index]
    else if (argument === "--pin") options.pin = args[++index]
    else if (argument === "--apply") options.apply = true
    else if (argument === "--allow-local-write") options.allowLocalWrite = true
    else if (argument === "--allow-production-local-db") options.allowProductionLocalDb = true
    else if (argument === "--bootstrap-isolated") options.bootstrapIsolated = true
    else if (argument !== "--dry-run") throw new Error(`Unknown argument: ${argument}`)
  }
  return options
}
