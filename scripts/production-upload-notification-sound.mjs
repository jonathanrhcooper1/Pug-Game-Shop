import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Client } from "ssh2"
import { STAGING_SSH_ALGORITHMS } from "./lib/staging-ssh.mjs"
import { loadLocalEnv } from "./lib/local-env.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
loadLocalEnv([resolve(root, ".env.production.local"), resolve(root, ".env.local")])

const dryRun = process.argv.includes("--dry-run")
const defaultSoundPath = resolve(root, "assets", "audio", "pug-order-notification.mp3")
const localSoundPath = resolve(root, String(process.env.PUG_NOTIFICATION_SOUND_FILE ?? defaultSoundPath))
const remoteUploadDir = normalizeRemoteDir(process.env.PUG_PROD_REMOTE_UPLOAD_DIR ?? "/html/wp-content/uploads")
const remoteSoundPath = `${remoteUploadDir}/pug-order-notification-${timestampForRemoteName(new Date())}.mp3`
const remoteRunnerPath = `${remoteUploadDir}/set-notification-sound-${timestampForRemoteName(new Date())}.php`
const wpPath = process.env.PUG_PROD_WP_PATH ?? "/html"
const wpCli = process.env.PUG_PROD_WP_CLI ?? "wp"
const soundTitle = process.env.PUG_NOTIFICATION_SOUND_TITLE ?? "Pug pickup order notification"
const forceHttps = envFlag(process.env.PUG_NOTIFICATION_SOUND_FORCE_HTTPS, true)

const requiredEnv = {
  PUG_PROD_SSH_HOST: process.env.PUG_PROD_SSH_HOST,
  PUG_PROD_SSH_USER: process.env.PUG_PROD_SSH_USER,
  PUG_PROD_SSH_PASSWORD: process.env.PUG_PROD_SSH_PASSWORD,
}

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        action: "production_upload_notification_sound_dry_run",
        localSoundPath,
        localSoundExists: existsSync(localSoundPath),
        remoteSoundPath,
        remoteRunnerPath,
        wpPath,
        wpCli,
        requiresEnv: [
          "PUG_PROD_SSH_HOST",
          "PUG_PROD_SSH_USER",
          "PUG_PROD_SSH_PASSWORD",
          "PUG_PROD_CONFIRM_NOTIFICATION_SOUND",
        ],
        optionalEnv: [
          "PUG_NOTIFICATION_SOUND_FILE",
          "PUG_NOTIFICATION_SOUND_TITLE",
          "PUG_NOTIFICATION_SOUND_FORCE_HTTPS",
        ],
        forcesHttpsNotificationUrl: forceHttps,
        writesWordPressMediaLibrary: true,
        updatesFulfillmentNotificationSettings: true,
        credentialsPrinted: false,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

if (missingEnv.length > 0) {
  throw new Error(`Missing production SSH environment variables: ${missingEnv.join(", ")}`)
}

if (process.env.PUG_PROD_CONFIRM_NOTIFICATION_SOUND !== "upload-production-notification-sound") {
  throw new Error(
    "Set PUG_PROD_CONFIRM_NOTIFICATION_SOUND=upload-production-notification-sound to upload the production notification sound.",
  )
}

if (!existsSync(localSoundPath) || statSync(localSoundPath).size <= 0) {
  throw new Error(`Notification sound file is missing or empty: ${localSoundPath}`)
}

const runnerSource = `<?php
$payload = json_decode(stream_get_contents(STDIN), true);
if (!is_array($payload)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'invalid_payload'));
	exit(1);
}

if (!class_exists('TCGStorePlatform\\\\Settings\\\\Settings')) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'tcg_store_platform_not_loaded'));
	exit(1);
}

$remote_path = (string) ($payload['remote_path'] ?? '');
$title = sanitize_text_field((string) ($payload['title'] ?? 'Pug pickup order notification'));

if ('' === $remote_path || !file_exists($remote_path)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'notification_file_missing'));
	exit(1);
}

$uploads = wp_get_upload_dir();
$base_dir = wp_normalize_path((string) ($uploads['basedir'] ?? ''));
$remote_normalized = wp_normalize_path($remote_path);
if ('' === $base_dir || 0 !== strpos($remote_normalized, $base_dir)) {
	echo wp_json_encode(array('status' => 'error', 'message' => 'notification_file_outside_uploads'));
	exit(1);
}

$relative = ltrim(substr($remote_normalized, strlen($base_dir)), '/');
$url = trailingslashit((string) ($uploads['baseurl'] ?? '')) . str_replace('%2F', '/', rawurlencode($relative));
$url = str_replace('%2F', '/', $url);
$filetype = wp_check_filetype(basename($remote_path), null);
$mime = (string) ($filetype['type'] ?? 'audio/mpeg');
if (!in_array($mime, array('audio/mpeg', 'video/mp4'), true)) {
	$mime = 'audio/mpeg';
}

$attachment_id = attachment_url_to_postid($url);
if ($attachment_id <= 0) {
	$attachment_id = wp_insert_attachment(
		array(
			'guid' => $url,
			'post_mime_type' => $mime,
			'post_title' => $title,
			'post_content' => '',
			'post_status' => 'inherit',
		),
		$remote_path
	);
	if (is_wp_error($attachment_id)) {
		echo wp_json_encode(array('status' => 'error', 'message' => $attachment_id->get_error_message()));
		exit(1);
	}

	require_once ABSPATH . 'wp-admin/includes/image.php';
	$metadata = wp_generate_attachment_metadata((int) $attachment_id, $remote_path);
	wp_update_attachment_metadata((int) $attachment_id, $metadata);
}

$attachment_url = wp_get_attachment_url((int) $attachment_id);
if (!is_string($attachment_url) || '' === $attachment_url) {
	$attachment_url = $url;
}
if (!empty($payload['force_https']) && function_exists('set_url_scheme')) {
	$attachment_url = set_url_scheme($attachment_url, 'https');
}

$settings = get_option(TCGStorePlatform\\Settings\\Settings::OPTION_NAME, TCGStorePlatform\\Settings\\Settings::defaults());
if (!is_array($settings)) {
	$settings = TCGStorePlatform\\Settings\\Settings::defaults();
}

$settings['fulfillment_notifications'] = array_merge(
	is_array($settings['fulfillment_notifications'] ?? null)
		? $settings['fulfillment_notifications']
		: array(),
	array(
		'audio_enabled' => true,
		'employee_only' => true,
		'notification_sound_url' => $attachment_url,
	)
);

$settings = TCGStorePlatform\\Settings\\Settings::sanitize($settings);
update_option(TCGStorePlatform\\Settings\\Settings::OPTION_NAME, $settings, false);
$settings = TCGStorePlatform\\Settings\\Settings::all();
$notifications = is_array($settings['fulfillment_notifications'] ?? null)
	? $settings['fulfillment_notifications']
	: array();

echo wp_json_encode(array(
	'action' => 'production_notification_sound_uploaded',
	'status' => 'ok',
	'attachment_id' => (int) $attachment_id,
	'attachment_url' => $attachment_url,
	'audio_enabled' => (bool) ($notifications['audio_enabled'] ?? false),
	'employee_only' => (bool) ($notifications['employee_only'] ?? true),
	'credentialsPrinted' => false,
));
`

const connection = new Client()

const result = await new Promise((resolveResult, reject) => {
  connection
    .on("ready", async () => {
      try {
        await uploadFile(connection, localSoundPath, remoteSoundPath)
        await writeRemoteFile(connection, remoteRunnerPath, runnerSource)
        const payload = JSON.stringify({
          remote_path: remoteSoundPath,
          title: soundTitle,
          force_https: forceHttps,
        })
        const setSound = await execWithStdin(
          connection,
          `${shellQuote(wpCli)} eval-file ${shellQuote(remoteRunnerPath)} --path=${shellQuote(wpPath)}`,
          payload,
        )
        const parsed = parseJson(setSound.stdout)

        if (setSound.code !== 0 || parsed?.status !== "ok") {
          throw new Error(`Production notification sound upload failed: ${tailForLog(setSound.stderr || setSound.stdout)}`)
        }

        resolveResult({
          ...parsed,
          localFile: basename(localSoundPath),
          remoteSoundPath,
          runnerRemoved: false,
          credentialsPrinted: false,
        })
      } catch (error) {
        reject(error)
      } finally {
        await execRemote(connection, `rm -f ${shellQuote(remoteRunnerPath)}`).catch(() => null)
        connection.end()
      }
    })
    .on("error", reject)
    .connect(productionSshConnectConfig(requiredEnv))
})

result.runnerRemoved = true
console.log(JSON.stringify(result, null, 2))

function productionSshConnectConfig(env, options = {}) {
  return {
    host: env.PUG_PROD_SSH_HOST,
    username: env.PUG_PROD_SSH_USER,
    password: env.PUG_PROD_SSH_PASSWORD,
    readyTimeout: options.readyTimeout ?? 20000,
    algorithms: STAGING_SSH_ALGORITHMS,
  }
}

function uploadFile(connection, localPath, remotePathValue) {
  return new Promise((resolveResult, reject) => {
    connection.sftp((sftpError, sftp) => {
      if (sftpError) {
        reject(sftpError)
        return
      }

      sftp.fastPut(localPath, remotePathValue, (uploadError) => {
        sftp.end()
        if (uploadError) {
          reject(uploadError)
          return
        }

        resolveResult()
      })
    })
  })
}

function writeRemoteFile(connection, remotePath, content) {
  return new Promise((resolveResult, reject) => {
    connection.sftp((sftpError, sftp) => {
      if (sftpError) {
        reject(sftpError)
        return
      }

      sftp.open(remotePath, "w", 0o600, (openError, handle) => {
        if (openError) {
          sftp.end()
          reject(openError)
          return
        }

        const buffer = Buffer.from(content, "utf8")
        sftp.write(handle, buffer, 0, buffer.length, 0, (writeError) => {
          sftp.close(handle, () => {
            sftp.end()
            if (writeError) {
              reject(writeError)
              return
            }

            resolveResult()
          })
        })
      })
    })
  })
}

function execRemote(connection, command) {
  return execWithStdin(connection, command, "")
}

function execWithStdin(connection, command, stdin) {
  return new Promise((resolveResult, reject) => {
    connection.exec(command, (error, stream) => {
      if (error) {
        reject(error)
        return
      }

      let stdout = ""
      let stderr = ""

      stream.on("data", (chunk) => {
        stdout += chunk.toString()
      })
      stream.stderr.on("data", (chunk) => {
        stderr += chunk.toString()
      })
      stream.on("close", (code) => {
        resolveResult({ code, stdout, stderr })
      })
      stream.end(stdin)
    })
  })
}

function parseJson(value) {
  try {
    return JSON.parse(String(value).trim())
  } catch {
    return null
  }
}

function normalizeRemoteDir(value) {
  return `/${String(value)
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/")}`
}

function envFlag(value, fallback) {
  if (value === undefined) {
    return fallback
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase())
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function timestampForRemoteName(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")
}

function tailForLog(value, maxLength = 500) {
  const text = String(value ?? "").trim()
  return text.length > maxLength ? text.slice(-maxLength) : text
}
