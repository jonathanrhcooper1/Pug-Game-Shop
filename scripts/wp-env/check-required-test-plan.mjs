import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const required = [
  ['PHP/plugin logic', 'apps/wordpress-plugin/tests/run.php'],
  ['REST API tests', 'apps/wordpress-plugin/tests/Integration/Rest/README.md'],
  ['Database migration tests', 'apps/wordpress-plugin/tests/Integration/Database/README.md'],
  ['Pricing engine tests', 'packages/pricing-engine/tests/README.md'],
  ['Reservation double-sell tests', 'tests/migration/reservation-double-sell.md'],
  ['Customer credit ledger tests', 'tests/rest/customer-credit-ledger.md'],
  ['Manager override tests', 'tests/rest/manager-overrides.md'],
  ['ScryDex checkpoint/resume tests', 'packages/sync-engine/tests/scrydex-checkpoint-resume.md'],
  ['Square inventory adapter tests', 'packages/api-client/tests/square-inventory-adapter.md'],
  ['WooCommerce checkout hook tests', 'apps/wordpress-plugin/tests/Integration/WooCommerce/README.md'],
  ['Playwright E2E tests', 'tests/e2e/README.md'],
  ['Offline sync conflict tests', 'tests/offline-sync/README.md']
];

let missing = 0;

for (const [label, relativePath] of required) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) {
    console.error(`Missing required test scaffold: ${label} (${relativePath})`);
    missing += 1;
    continue;
  }

  const content = readFileSync(path, 'utf8').trim();
  if (!content) {
    console.error(`Empty required test scaffold: ${label} (${relativePath})`);
    missing += 1;
  }
}

if (missing > 0) {
  process.exit(1);
}

console.log(`Required test scaffold present: ${required.length}/${required.length}`);
