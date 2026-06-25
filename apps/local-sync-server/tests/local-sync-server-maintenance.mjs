import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createLocalSyncHttpServer } from "../src/localSyncHttpServer.mjs"

const tempRoot = mkdtempSync(join(tmpdir(), "pug-lan-maintenance-"))
const databasePath = join(tempRoot, "store-sync.sqlite")
const maintenanceRoot = join(tempRoot, "maintenance")
const installRoot = join(tempRoot, "install")

let patchApplyCall = null
let restartCall = null

const server = createLocalSyncHttpServer({
  storeId: "Pug Game Shop",
  serverUrl: "http://127.0.0.1:8787",
  websiteUrl: "https://thepuggaming.com/",
  restBasePath: "/wp-json/tcg-store/v1",
  storeOptions: {
    databasePath,
    maintenanceRoot,
    serverInstallRoot: installRoot,
    port: 8787,
    patchApplyCommand: (input) => {
      patchApplyCall = input

      return {
        status: "ok",
        stdout_tail: "patched from test",
        stderr_tail: "",
      }
    },
    restartCommand: (input) => {
      restartCall = input

      return {
        status: "ok",
        action: "server_restart_scheduled",
        reason: input.reason,
        delay_seconds: input.delaySeconds,
        restart_script_path: join(maintenanceRoot, "restart", "restart-test.ps1"),
        server_install_root: input.serverInstallRoot,
        port: input.serverPort,
        process_id: input.processId,
      }
    },
  },
})

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject)
      resolve()
    })
  })

  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`

  const noTokenStatus = await request("GET", `${baseUrl}/server/maintenance/status`)
  assert.equal(noTokenStatus.status, "blocked")
  assert.equal(noTokenStatus.code, "session_required")

  const auth = await request("POST", `${baseUrl}/auth/pin`, { pin: "1420" })
  assert.equal(auth.status, "ok")
  const token = auth.session.token

  const status = await request("GET", `${baseUrl}/server/maintenance/status`, null, token)
  assert.equal(status.status, "ok")
  assert.equal(status.action, "server_maintenance_status")
  assert.equal(status.server.database_path, databasePath)
  assert.equal(status.server.port, 8787)
  assert.equal(status.arbitrary_command_execution_available, false)
  assert.ok(status.sqlite.inventory_count >= 0)

  const backup = await request("POST", `${baseUrl}/server/maintenance/sqlite/backup`, {}, token)
  assert.equal(backup.status, "ok")
  assert.equal(backup.action, "sqlite_backup_created")
  assert.match(backup.backup_file_name, /^store-sync-.+\.sqlite$/)
  assert.ok(backup.backup_size_bytes > 0)

  const checkpoint = await request("POST", `${baseUrl}/server/maintenance/sqlite/checkpoint`, {}, token)
  assert.equal(checkpoint.status, "ok")
  assert.equal(checkpoint.action, "sqlite_checkpoint_completed")
  assert.ok(checkpoint.sqlite.page_count >= 0)

  const missingPatch = await request("POST", `${baseUrl}/server/maintenance/patch`, {}, token)
  assert.equal(missingPatch.status, "blocked")
  assert.equal(missingPatch.code, "server_patch_package_required")

  const packageBase64 = Buffer.alloc(2048, 7).toString("base64")
  const patch = await request(
    "POST",
    `${baseUrl}/server/maintenance/patch`,
    {
      package_base64: packageBase64,
      apply: true,
      restart: true,
    },
    token,
  )
  assert.equal(patch.status, "ok")
  assert.equal(patch.action, "server_patch_applied")
  assert.equal(patch.applied, true)
  assert.equal(patch.restart_scheduled, true)
  assert.equal(patch.arbitrary_command_execution_available, false)
  assert.ok(patchApplyCall?.zipPath.endsWith("pug-lan-server.zip"))
  assert.equal(patchApplyCall.destinationPath, join(installRoot, "pug-lan-server"))
  assert.equal(restartCall?.reason, "patch_applied")

  const restart = await request(
    "POST",
    `${baseUrl}/server/maintenance/restart`,
    { delay_seconds: 3, reason: "test_restart" },
    token,
  )
  assert.equal(restart.status, "ok")
  assert.equal(restart.action, "server_restart_scheduled")
  assert.equal(restart.reason, "test_restart")
  assert.equal(restart.delay_seconds, 3)

  console.log("PASS local sync server maintenance")
} finally {
  await new Promise((resolve) => server.close(resolve))
  server.localSyncStore.close()
  rmSync(tempRoot, { recursive: true, force: true })
}

async function request(method, url, body, token) {
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  return response.json()
}
