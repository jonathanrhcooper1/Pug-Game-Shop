import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const manifestPath = resolve(root, 'fixtures/seed/development-data.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function runWp(args) {
  execFileSync(npx, ['wp-env', 'run', 'cli', 'wp', ...args], {
    cwd: root,
    stdio: 'inherit',
    shell: false
  });
}

function maybeRunWp(args) {
  try {
    runWp(args);
  } catch (error) {
    console.warn(`wp-env seed skipped command: wp ${args.join(' ')}`);
    console.warn(error.message);
  }
}

const payload = JSON.stringify({
  loaded_at: new Date().toISOString(),
  fixture_version: manifest.fixture_version,
  counts: {
    cards: manifest.cards.length,
    inventory: manifest.inventory.length,
    customers: manifest.customers.length,
    credit_entries: manifest.store_credit_ledger.length,
    kiosk_carts: manifest.kiosk_carts.length,
    buylist_submissions: manifest.buylist_submissions.length,
    events: manifest.events.length,
    topdeck_events: manifest.topdeck.owned_tournaments.length
  }
});

maybeRunWp(['option', 'update', 'tcg_store_platform_dev_seed_manifest', payload, '--format=json']);
maybeRunWp(['option', 'update', 'blog_public', '0']);
maybeRunWp(['theme', 'activate', 'twentytwentyfive']);

for (const page of [
  ['Events', 'events'],
  ['Kiosk', 'kiosk'],
  ['Customer Credit', 'customer-credit']
]) {
  maybeRunWp([
    'post',
    'create',
    '--post_type=page',
    `--post_title=${page[0]}`,
    `--post_name=${page[1]}`,
    '--post_status=publish',
    '--porcelain'
  ]);
}

console.log(`Seed manifest prepared from ${manifestPath}`);
