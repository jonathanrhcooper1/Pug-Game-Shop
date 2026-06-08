# Scripts

Reserved for reproducible build, release, deployment, backup-verification, and
fixture-generation scripts.

## Staging

- `npm run staging:route-check` checks the public staging REST root,
  `tcg-store/v1` namespace, authenticated health route registration signal,
  public offline connector manifest, and noindex controls without credentials
  or data mutation.
- `npm run staging:configure-scrydex` stores staging ScryDex credentials in
  WordPress settings through a temporary stdin-fed WP-CLI runner and prints only
  redacted readiness output.
- `npm run staging:configure-offline-pairing` stores staging offline connector
  pairing policy through a temporary stdin-fed WP-CLI runner, prints only
  redacted policy/route status, and keeps pull/push/conflict sync routes closed
  by default.
- `npm run staging:offline-pairing-smoke` temporarily enables only the staging
  pairing gate, posts a generated pairing request to the public REST route,
  verifies one-time credential issuance without printing tokens, removes the
  smoke device row, and restores the previous staging gates.
