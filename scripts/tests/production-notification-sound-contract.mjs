import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..", "..")
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"))
const script = await readFile(path.join(root, "scripts/production-upload-notification-sound.mjs"), "utf8")

assert.equal(
  packageJson.scripts["production:upload-notification-sound"],
  "node scripts/production-upload-notification-sound.mjs",
)

for (const marker of [
  "PUG_PROD_CONFIRM_NOTIFICATION_SOUND",
  "upload-production-notification-sound",
  "PUG_NOTIFICATION_SOUND_FORCE_HTTPS",
  "assets",
  "pug-order-notification.mp3",
  "wp_insert_attachment",
  "Settings::all",
  "notification_sound_url",
  "audio_enabled",
  "employee_only",
  "credentialsPrinted: false",
]) {
  assert.ok(script.includes(marker), `Missing notification sound marker: ${marker}`)
}

for (const forbidden of ["SCRYDEX_API_KEY", "PUG_PROD_SSH_PASSWORD ="]) {
  assert.equal(script.includes(forbidden), false, `Forbidden marker found: ${forbidden}`)
}

console.log("PASS production notification sound contract")
