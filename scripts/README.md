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
