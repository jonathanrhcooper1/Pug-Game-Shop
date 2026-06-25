# Branding And White-Label Settings

The platform supports company-specific branding so the same codebase can be
deployed for multiple trading-card businesses without changing source files.

## Current Implementation

Version `0.33.0` adds a shared branding settings contract in the WordPress
plugin:

- Company name and short name.
- Optional HTTPS logo URL.
- Optional HTTPS support URL.
- Optional receipt footer text.
- Theme color tokens:
  - `primary_color`
  - `accent_color`
  - `background_color`
  - `surface_color`
  - `text_color`
  - `success_color`
  - `warning_color`
  - `danger_color`
  - `staging_banner_color`

The Settings API screen exposes these values under the configured company
short name, which defaults to **Pug Cards > Settings**. The dashboard and
system status screens read the configured company profile.

## Shared Client Contract

`BrandingSettings::public_config()` returns a client-safe payload with:

- `company`: public company identity, URLs, and receipt copy.
- `theme`: sanitized color tokens.
- `css_variables`: CSS custom properties for UI consumers.

The payload intentionally excludes provider credentials, payment settings,
customer data, inventory data, and other private plugin settings.

CSS variable keys use the `--tcg-*` prefix, for example:

```css
--tcg-primary: #0F766E;
--tcg-accent: #F97316;
--tcg-staging-banner: #FACC15;
```

## Safety Rules

- URLs must be HTTPS or they are rejected.
- Empty logo and support URLs are allowed.
- Colors must be three- or six-digit hex values.
- Three-digit hex values are expanded to six-digit uppercase values.
- Invalid colors fall back to the previous safe value or the default token.
- Staging keeps its own branding settings and must not share production
  provider keys, payment settings, inventory state, customer credit, or POS
  configuration.

## Remaining Work

- Apply branding variables to the storefront, kiosk, staff screens, email
  templates, receipts, and staging banner once those UI surfaces are enabled.
- Expose the public branding config through a dedicated REST endpoint after
  route permission and cache behavior are accepted in staging.
- Sync branding config to the Windows offline app during device pairing and
  pull refresh. The offline app package manifest already records the required
  token list so builds fail contract checks if future app changes omit them.
