import { execFile as execFileCallback } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFileCallback)
const DEFAULT_DRAWER_PULSE = [0x1b, 0x70, 0x00, 0x19, 0xfa]
const RECEIPT_PRINTER_KEYWORDS = ["receipt", "thermal", "epson", "star", "square", "pos", "cash", "drawer"]

export async function getCashDrawerStatus(input = {}, options = {}) {
  const platform = options.platform ?? process.platform
  const env = options.env ?? process.env
  const configuredPrinter = cleanPrinterName(
    input.printer_name ??
      input.printerName ??
      env.PUG_CASH_DRAWER_PRINTER ??
      env.PUG_RECEIPT_PRINTER,
  )

  if (platform !== "win32") {
    return blocked("cash_drawer_windows_required", "Cash drawer kick is currently implemented for Windows receipt printers.", {
      action: "cash_drawer_status",
      configured_printer_name: configuredPrinter,
      platform,
    })
  }

  const printersResult = await listWindowsPrinters({ ...options, env })

  if (printersResult.status !== "ok") {
    return printersResult
  }

  const selectedPrinter = selectCashDrawerPrinter(printersResult.printers, configuredPrinter)

  return {
    status: "ok",
    action: "cash_drawer_status",
    configured_printer_name: configuredPrinter,
    selected_printer_name: selectedPrinter?.name ?? "",
    printer_count: printersResult.printers.length,
    printers: printersResult.printers,
    drawer_kick_supported: Boolean(selectedPrinter),
    drawer_kick_method: "windows_raw_escpos_printer_pulse",
    pulse_command: "ESC p 0 25 250",
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

export async function kickCashDrawer(input = {}, options = {}) {
  const platform = options.platform ?? process.platform
  const env = options.env ?? process.env
  const configuredPrinter = cleanPrinterName(
    input.printer_name ??
      input.printerName ??
      env.PUG_CASH_DRAWER_PRINTER ??
      env.PUG_RECEIPT_PRINTER,
  )
  const reason = cleanPublicText(input.reason, "cash_sale", 80)
  const reference = cleanPublicText(input.reference ?? input.receipt_reference ?? input.receiptReference, "", 120)

  if (platform !== "win32") {
    return blocked("cash_drawer_windows_required", "Cash drawer kick is currently implemented for Windows receipt printers.", {
      action: "cash_drawer_kick",
      configured_printer_name: configuredPrinter,
      reason,
      reference,
      platform,
    })
  }

  const printersResult = await listWindowsPrinters({ ...options, env })

  if (printersResult.status !== "ok") {
    return printersResult
  }

  const selectedPrinter = selectCashDrawerPrinter(printersResult.printers, configuredPrinter)

  if (!selectedPrinter) {
    return blocked(
      "cash_drawer_printer_not_found",
      configuredPrinter
        ? `The configured cash drawer printer "${configuredPrinter}" was not found.`
        : "No Windows receipt/default printer was found for the cash drawer kick.",
      {
        action: "cash_drawer_kick",
        configured_printer_name: configuredPrinter,
        printer_count: printersResult.printers.length,
        printers: printersResult.printers,
        reason,
        reference,
      },
    )
  }

  const writeResult = await writeEscPosPulseToWindowsPrinter(selectedPrinter.name, {
    ...options,
    reason,
    reference,
  })

  if (writeResult.status !== "ok") {
    return writeResult
  }

  return {
    status: "ok",
    action: "cash_drawer_kicked",
    printer_name: selectedPrinter.name,
    configured_printer_name: configuredPrinter,
    drawer_kick_method: "windows_raw_escpos_printer_pulse",
    pulse_command: "ESC p 0 25 250",
    reason,
    reference,
    requested_by_user_id: cleanPublicText(options.requestedByUserId, "", 80),
    requested_by_user_name: cleanPublicText(options.requestedByUserName, "", 120),
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

export function selectCashDrawerPrinter(printers = [], configuredPrinter = "") {
  const cleanConfigured = configuredPrinter.trim().toLowerCase()

  if (cleanConfigured) {
    return printers.find((printer) => printer.name.toLowerCase() === cleanConfigured) ?? null
  }

  return (
    printers.find((printer) => printer.is_default && printer.is_available && printerIsReceiptLike(printer.name)) ??
    printers.find((printer) => printer.is_available && printerIsReceiptLike(printer.name)) ??
    printers.find((printer) => printer.is_default && printer.is_available) ??
    printers.find((printer) => printer.is_available) ??
    printers[0] ??
    null
  )
}

async function listWindowsPrinters(options = {}) {
  const execFile = options.execFile ?? execFileAsync

  try {
    const { stdout } = await execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        [
          "$ErrorActionPreference = 'Stop'",
          "Get-CimInstance Win32_Printer |",
          "Select-Object Name,Default,WorkOffline,PrinterStatus |",
          "ConvertTo-Json -Compress",
        ].join("; "),
      ],
      { timeout: Number(options.timeoutMs ?? 6000) },
    )
    const parsed = parseJsonArray(stdout)
    const printers = parsed
      .map((printer) => ({
        name: cleanPrinterName(printer.Name ?? printer.name),
        is_default: Boolean(printer.Default ?? printer.default),
        is_available: !Boolean(printer.WorkOffline ?? printer.workOffline) && Number(printer.PrinterStatus ?? 0) !== 7,
        printer_status: Number(printer.PrinterStatus ?? 0),
      }))
      .filter((printer) => printer.name)

    return {
      status: "ok",
      action: "cash_drawer_printers_detected",
      printer_count: printers.length,
      printers,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  } catch (error) {
    return blocked("cash_drawer_printer_probe_failed", "Could not read Windows printers for cash drawer kick.", {
      action: "cash_drawer_printers",
      detail: safeErrorMessage(error),
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    })
  }
}

async function writeEscPosPulseToWindowsPrinter(printerName, options = {}) {
  const execFile = options.execFile ?? execFileAsync
  const pulseBytes = Array.isArray(options.pulseBytes) ? options.pulseBytes : DEFAULT_DRAWER_PULSE
  const pulseArray = pulseBytes.map((byte) => Number(byte) & 0xff).join(",")
  const encodedPrinterName = JSON.stringify(printerName)
  const jobName = `The Pug cash drawer ${cleanPublicText(options.reference, "", 60) || cleanPublicText(options.reason, "cash_sale", 60)}`
  const encodedJobName = JSON.stringify(jobName)
  const command = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, Int32 dwCount, out Int32 dwWritten);
  public static void SendBytes(string printerName, string jobName, byte[] bytes) {
    IntPtr printerHandle;
    if (!OpenPrinter(printerName, out printerHandle, IntPtr.Zero)) throw new Exception("OpenPrinter failed");
    try {
      DOCINFOA doc = new DOCINFOA();
      doc.pDocName = jobName;
      doc.pDataType = "RAW";
      if (!StartDocPrinter(printerHandle, 1, doc)) throw new Exception("StartDocPrinter failed");
      try {
        if (!StartPagePrinter(printerHandle)) throw new Exception("StartPagePrinter failed");
        try {
          int written;
          if (!WritePrinter(printerHandle, bytes, bytes.Length, out written) || written != bytes.Length) throw new Exception("WritePrinter failed");
        } finally {
          EndPagePrinter(printerHandle);
        }
      } finally {
        EndDocPrinter(printerHandle);
      }
    } finally {
      ClosePrinter(printerHandle);
    }
  }
}
"@
[RawPrinterHelper]::SendBytes(${encodedPrinterName}, ${encodedJobName}, [byte[]](${pulseArray}))
Write-Output "cash_drawer_pulse_sent"
`

  try {
    await execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { timeout: Number(options.timeoutMs ?? 8000) },
    )

    return { status: "ok" }
  } catch (error) {
    return blocked("cash_drawer_kick_failed", "The receipt printer did not accept the cash drawer kick command.", {
      action: "cash_drawer_kick",
      printer_name: printerName,
      detail: safeErrorMessage(error),
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    })
  }
}

function printerIsReceiptLike(name = "") {
  const normalized = name.toLowerCase()

  return RECEIPT_PRINTER_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function parseJsonArray(value = "") {
  if (!String(value).trim()) {
    return []
  }

  const parsed = JSON.parse(value)

  return Array.isArray(parsed) ? parsed : [parsed]
}

function cleanPrinterName(value = "") {
  return String(value ?? "").trim().replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").slice(0, 160)
}

function cleanPublicText(value = "", fallback = "", limit = 120) {
  const cleaned = String(value ?? "").trim().replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ")

  return (cleaned || fallback).slice(0, limit)
}

function safeErrorMessage(error) {
  return String(error?.stderr || error?.message || error || "Unknown cash drawer error")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 500)
}

function blocked(code, message, extra = {}) {
  return {
    status: "blocked",
    code,
    message,
    ...extra,
  }
}
