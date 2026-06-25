import { invoke } from "@tauri-apps/api/core"

import type { OfflineQueueCommandAdapter } from "./offlineQueueBridge"

type TauriRuntimeGlobal = typeof globalThis & {
  __TAURI_INTERNALS__?: unknown
}

export function isTauriRuntime(globalScope: TauriRuntimeGlobal = globalThis) {
  return typeof globalScope.__TAURI_INTERNALS__ !== "undefined"
}

export function createTauriQueueAdapter(): OfflineQueueCommandAdapter | undefined {
  if (!isTauriRuntime()) {
    return undefined
  }

  return {
    invoke,
  }
}
