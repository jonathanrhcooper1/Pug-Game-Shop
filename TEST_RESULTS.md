# Test Results

Date: 2026-06-17

## Automated Test Summary

| Command | Result | Notes |
| --- | --- | --- |
| `npm run test:local` | Passed | 1039 PHP/unit tests, plugin bootstrap smoke, 648 PHP lint checks. |
| `npm run test:sync-engine` | Passed | Offline conflict policy and local sync server test suite passed. |
| `npm run test:pos-payments` | Passed | POS/Square policy and reconciliation tests passed. |
| `npm run test:api-client` | Passed | Square inventory adapter and WooCommerce product adapter tests passed. |
| `npm run test:offline-app` | Passed | TypeScript typecheck, offline app contracts, and 22 Rust tests passed. |
| `npm run test:packaging` | Passed | WordPress package, local sync package, production release, staging/production script contracts passed. |
| `npm run test:required-matrix` | Passed | Required test scaffold present: 12/12. |
| `npm run build` | Passed | Vite production build completed. Warning: one JS chunk is over 500 KB. |
| `npm run verify:no-production-secrets` | Passed | No production secret markers found. |
| `npm run package:production-release` | Passed | Production release ZIP and component packages generated. |
| `npx playwright test tests/e2e/public-production-smoke.spec.ts --project=chromium` | Passed | 11 public production smoke checks passed. |
| `npm run production:verify-public-shortcodes` | Passed | Production plugin shortcodes/styles registered and rendered. |
| `npm run production:verify-reference-search` | Passed | Production card reference search used WordPress cache then ScryDex fallback order. |
| `npm run production:verify-scrydex-catalog` | Passed | Production catalog tables and coverage verified. |
| `npm run production:verify-active-syncs` | Passed | All active syncs verified and smoke data cleaned up. |

## Production Catalog Verification

- `reference_sets`: 1300
- `reference_cards`: 147508
- `reference_variants`: 236130
- `provider_price_observations`: 125529
- `provider_price_points`: 721322
- Image coverage: 100%
- Variant coverage: 100%
- Price coverage: 85%
- Game counts: Magic 100867, Pokemon 44706, Lorcana 1234, One Piece 701

## Browser / UI Verification

- Local app at `http://127.0.0.1:1420/` opened, unlocked with the review PIN, and loaded Inventory, Trade-Ins, Checkout, Fulfillment, Queue, Events, Reports, Customers, and Settings without console errors or horizontal overflow in the sampled desktop viewport.
- Public production desktop pass covered Home, Singles, Sealed, Graded, Events, and Cart.
- Public production mobile pass covered Singles and Events at 390x844 with no horizontal overflow or console errors.

## Not Run

- Real Square card-reader capture: blocked by hardware/live payment safety.
- Real customer email delivery: blocked by audit safety rule.
- Dymo label print output: blocked by unavailable printer hardware.
- Direct production deployment: blocked by manual approval requirement.

