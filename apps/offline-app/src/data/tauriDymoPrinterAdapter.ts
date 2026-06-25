import { invoke } from "@tauri-apps/api/core"

import type { OfflineLabelPrintJob } from "./offlineWorkspace"
import { isTauriRuntime } from "./tauriQueueAdapter"

export const printDymoLabelCommandName = "print_dymo_label"

export type TauriDymoPrintResult =
  | {
      status: "ok"
      action: "dymo_label_printed"
      code: "local_dymo_label_printed"
      message: string
      label_stock: "30336 Small Multipurpose Labels"
      label_size: "1 in x 2 1/8 in"
      printer_name: string
      barcode_format: "Code128Auto"
      scan_code: string
      local_native_print_performed: true
      browser_print_dialog_required: false
      raw_credentials_returned: false
      credentials_synced_to_app: false
    }
  | {
      status: "blocked"
      action: "dymo_label_print_blocked"
      code: string
      message: string
      label_stock: "30336 Small Multipurpose Labels"
      label_size: "1 in x 2 1/8 in"
      printer_name: string
      barcode_format: "Code128Auto"
      scan_code: string
      local_native_print_performed: false
      browser_print_dialog_required: false
      raw_credentials_returned: false
      credentials_synced_to_app: false
    }

export type TauriDymoPrinterAdapter = {
  printLabel: (job: OfflineLabelPrintJob) => Promise<TauriDymoPrintResult>
}

export function createTauriDymoPrinterAdapter(): TauriDymoPrinterAdapter | undefined {
  if (!isTauriRuntime()) {
    return undefined
  }

  return {
    printLabel: (job) =>
      invoke(printDymoLabelCommandName, {
        request: {
          card_name: job.cardName,
          set_code: job.setCode,
          condition: job.condition,
          barcode: job.barcode,
          copies: 1,
        },
      }) as Promise<TauriDymoPrintResult>,
  }
}
