import { randomUUID } from "node:crypto"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { basename, dirname, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"

export const RECOVERY_REPORT_SCHEMA_VERSION = 1

export function parseRecoveryCliArgs(argv = []) {
  const args = [...argv]
  const dryRun = args.includes("--dry-run")
  const apply = args.includes("--apply")

  if (dryRun === apply) {
    throw recoveryError(
      "recovery_mode_required",
      "Choose exactly one mode: --dry-run for a read-only audit or --apply for an explicit repair.",
    )
  }

  const databasePath = valueAfter(args, "--database")
  const reportPath = valueAfter(args, "--report")
  const orderIds = valuesAfter(args, "--order")
  const knownFlags = new Set(["--dry-run", "--apply", "--database", "--report", "--order"])

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]

    if (!value.startsWith("--")) {
      continue
    }
    if (!knownFlags.has(value)) {
      throw recoveryError("unknown_recovery_argument", `Unknown argument: ${value}`)
    }
    if (["--database", "--report", "--order"].includes(value)) {
      index += 1
    }
  }

  return {
    mode: apply ? "apply" : "dry-run",
    apply,
    databasePath: databasePath ? resolve(databasePath) : "",
    reportPath: reportPath ? resolve(reportPath) : "",
    orderIds: [...new Set(orderIds.map(cleanId).filter(Boolean))],
  }
}

export function openRecoveryDatabase(databasePath, { readOnly = true } = {}) {
  const resolvedPath = resolve(String(databasePath ?? ""))

  if (!databasePath || !existsSync(resolvedPath)) {
    throw recoveryError("local_sync_database_missing", `Local sync database was not found: ${resolvedPath}`)
  }

  const database = new DatabaseSync(resolvedPath, { readOnly })
  database.exec("PRAGMA foreign_keys = ON;")
  database.exec("PRAGMA busy_timeout = 5000;")
  return database
}

export function assertRecoveryTables(database, tableNames) {
  const existing = new Set(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => String(row.name)),
  )
  const missing = tableNames.filter((tableName) => !existing.has(tableName))

  if (missing.length > 0) {
    throw recoveryError(
      "local_sync_schema_incomplete",
      `Required local-sync tables are missing: ${missing.join(", ")}. Start this server version once before recovery.`,
      { missing_tables: missing },
    )
  }
}

export function createSqliteBackup(databasePath, { label, outputDirectory, now = () => new Date() } = {}) {
  const resolvedPath = resolve(databasePath)
  const directory = resolve(outputDirectory ?? dirname(resolvedPath))
  mkdirSync(directory, { recursive: true })
  const timestamp = fileTimestamp(now())
  const backupPath = resolve(
    directory,
    `${label || "before-recovery"}-${timestamp}-${randomUUID().slice(0, 8)}-${basename(resolvedPath)}`,
  )
  const database = openRecoveryDatabase(resolvedPath, { readOnly: false })

  try {
    database.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`)
  } finally {
    database.close()
  }

  return {
    status: "ok",
    database_path: resolvedPath,
    backup_path: backupPath,
  }
}

export function writeRecoveryReport(reportPath, report) {
  const resolvedPath = resolve(reportPath)
  mkdirSync(dirname(resolvedPath), { recursive: true })
  writeFileSync(resolvedPath, `${JSON.stringify(report, null, 2)}\n`)
  return resolvedPath
}

export function defaultRecoveryReportPath(databasePath, action, now = () => new Date()) {
  const directory = resolve(dirname(resolve(databasePath)), "recovery-reports")
  return resolve(directory, `${action}-${fileTimestamp(now())}.json`)
}

export function recoveryError(code, message, details = {}) {
  const error = new Error(message)
  error.code = code
  error.details = details
  return error
}

export function publicRecoveryError(error) {
  return {
    status: "blocked",
    code: cleanId(error?.code) || "recovery_failed",
    message: error instanceof Error ? error.message : "Recovery operation failed.",
    ...(error?.details && typeof error.details === "object" ? error.details : {}),
  }
}

export function parseJson(value, fallback) {
  try {
    return JSON.parse(String(value ?? ""))
  } catch {
    return fallback
  }
}

export function cleanId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_.:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191)
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag)

  if (index < 0) {
    return ""
  }
  const value = args[index + 1]

  if (!value || value.startsWith("--")) {
    throw recoveryError("recovery_argument_value_required", `${flag} requires a value.`)
  }

  return value
}

function valuesAfter(args, flag) {
  const values = []

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== flag) {
      continue
    }
    const value = args[index + 1]

    if (!value || value.startsWith("--")) {
      throw recoveryError("recovery_argument_value_required", `${flag} requires a value.`)
    }
    values.push(value)
    index += 1
  }

  return values
}

function fileTimestamp(value) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")
}
