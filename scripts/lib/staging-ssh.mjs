export const STAGING_SSH_ALGORITHMS = Object.freeze({
  kex: Object.freeze([
    "curve25519-sha256",
    "curve25519-sha256@libssh.org",
    "ecdh-sha2-nistp256",
    "ecdh-sha2-nistp384",
    "ecdh-sha2-nistp521",
    "diffie-hellman-group14-sha256",
    "diffie-hellman-group14-sha1",
  ]),
  serverHostKey: Object.freeze(["ssh-ed25519"]),
  cipher: Object.freeze([
    "chacha20-poly1305@openssh.com",
    "aes128-ctr",
    "aes192-ctr",
    "aes256-ctr",
    "aes128-gcm@openssh.com",
    "aes256-gcm@openssh.com",
  ]),
  hmac: Object.freeze([
    "hmac-sha2-256-etm@openssh.com",
    "hmac-sha2-512-etm@openssh.com",
    "hmac-sha2-256",
    "hmac-sha2-512",
  ]),
  compress: Object.freeze(["none"]),
})

export function stagingSshConnectConfig(requiredEnv, options = {}) {
  return {
    host: requiredEnv.PUG_STAGING_SSH_HOST,
    username: requiredEnv.PUG_STAGING_SSH_USER,
    password: requiredEnv.PUG_STAGING_SSH_PASSWORD,
    readyTimeout: options.readyTimeout ?? 20000,
    algorithms: STAGING_SSH_ALGORITHMS,
  }
}
