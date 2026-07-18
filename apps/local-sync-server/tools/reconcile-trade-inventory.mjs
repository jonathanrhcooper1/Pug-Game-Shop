import { dirname } from "node:path"

import { loadOpsEnv, localSyncDatabasePath } from "./lib/ops-common.mjs"
import {
  createSqliteBackup,
  defaultRecoveryReportPath,
  openRecoveryDatabase,
  parseRecoveryCliArgs,
  publicRecoveryError,
  RECOVERY_REPORT_SCHEMA_VERSION,
  writeRecoveryReport,
} from "./lib/recovery-common.mjs"
import { applyTradeReconciliation, planTradeReconciliation } from "./lib/trade-reconciliation.mjs"

loadOpsEnv()

let database
let reportPath = ""
let databasePath = ""
let mode = ""
let backup = { status: "not_requested", backup_path: "" }

try {
  const args = parseRecoveryCliArgs(process.argv.slice(2))
  mode = args.mode
  databasePath = args.databasePath || localSyncDatabasePath()
  reportPath = args.reportPath || defaultRecoveryReportPath(databasePath, "trade-reconciliation")
  const planDatabase = openRecoveryDatabase(databasePath, { readOnly: true })
  const preflight = planTradeReconciliation(planDatabase, { orderIds: args.orderIds })
  planDatabase.close()

  let result = preflight
  if (args.apply && preflight.status === "ok") {
    backup = createSqliteBackup(databasePath, {
      label: "before-trade-reconciliation",
      outputDirectory: dirname(reportPath),
    })
    database = openRecoveryDatabase(databasePath, { readOnly: false })
    result = applyTradeReconciliation(database, { orderIds: args.orderIds })
  }

  const report = {
    report_schema_version: RECOVERY_REPORT_SCHEMA_VERSION,
    mode,
    apply_requested: args.apply,
    apply_performed: result.mode === "apply",
    database_path: databasePath,
    report_path: reportPath,
    backup,
    ...result,
  }
  writeRecoveryReport(reportPath, report)
  console.log(JSON.stringify(report, null, 2))

  if (report.status !== "ok") {
    process.exitCode = 1
  }
} catch (error) {
  const failure = {
    report_schema_version: RECOVERY_REPORT_SCHEMA_VERSION,
    mode,
    database_path: databasePath,
    report_path: reportPath,
    backup,
    ...publicRecoveryError(error),
  }

  if (reportPath) {
    writeRecoveryReport(reportPath, failure)
  }
  console.error(JSON.stringify(failure, null, 2))
  process.exitCode = 1
} finally {
  database?.close()
}
