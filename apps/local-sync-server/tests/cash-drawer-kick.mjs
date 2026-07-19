import assert from "node:assert/strict"

import { getCashDrawerStatus, kickCashDrawer, selectCashDrawerPrinter } from "../src/cashDrawerKick.mjs"

const printers = [
  { Name: "Office PDF", Default: true, WorkOffline: false, PrinterStatus: 3 },
  { Name: "Epson TM-T88 Receipt", Default: false, WorkOffline: false, PrinterStatus: 3 },
  { Name: "Offline Receipt", Default: false, WorkOffline: true, PrinterStatus: 7 },
]

const selected = selectCashDrawerPrinter(
  printers.map((printer) => ({
    name: printer.Name,
    is_default: Boolean(printer.Default),
    is_available: !printer.WorkOffline,
    printer_status: printer.PrinterStatus,
  })),
)
assert.equal(selected.name, "Epson TM-T88 Receipt")

const configured = selectCashDrawerPrinter(
  printers.map((printer) => ({
    name: printer.Name,
    is_default: Boolean(printer.Default),
    is_available: !printer.WorkOffline,
    printer_status: printer.PrinterStatus,
  })),
  "Epson TM-T88 Receipt",
)
assert.equal(configured.name, "Epson TM-T88 Receipt")

const execCalls = []
const execFile = async (command, args) => {
  execCalls.push({ command, args })

  if (args.join(" ").includes("Get-CimInstance Win32_Printer")) {
    return { stdout: JSON.stringify(printers), stderr: "" }
  }

  return { stdout: "cash_drawer_pulse_sent", stderr: "" }
}

const status = await getCashDrawerStatus({}, {
  platform: "win32",
  env: { PUG_CASH_DRAWER_PRINTER: "Epson TM-T88 Receipt" },
  execFile,
})
assert.equal(status.status, "ok")
assert.equal(status.selected_printer_name, "Epson TM-T88 Receipt")
assert.equal(status.drawer_kick_supported, true)
assert.equal(status.credentials_synced_to_client, false)

const kick = await kickCashDrawer(
  { reason: "cash_checkout", reference: "CASH-123" },
  {
    platform: "win32",
    env: { PUG_CASH_DRAWER_PRINTER: "Epson TM-T88 Receipt" },
    execFile,
    requestedByUserId: "user-1",
    requestedByUserName: "Morgan",
  },
)
assert.equal(kick.status, "ok")
assert.equal(kick.printer_name, "Epson TM-T88 Receipt")
assert.equal(kick.reason, "cash_checkout")
assert.equal(kick.reference, "CASH-123")
assert.equal(kick.requested_by_user_name, "Morgan")
assert.equal(kick.raw_credentials_returned, false)
assert.equal(execCalls.length, 3)
assert.ok(execCalls.some((call) => call.args.join(" ").includes("RawPrinterHelper")))

const blocked = await kickCashDrawer({}, { platform: "linux", env: {}, execFile })
assert.equal(blocked.status, "blocked")
assert.equal(blocked.code, "cash_drawer_windows_required")

console.log("PASS cash drawer kick")
