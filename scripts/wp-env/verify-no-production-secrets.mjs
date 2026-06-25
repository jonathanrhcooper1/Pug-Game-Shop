import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const blockedPatterns = [
  /production[_-]?api[_-]?key/i,
  /live[_-]?secret/i,
  /sk_live_/i,
  /sq0atp-/i,
  /scrydex_live/i
];

const ignoredDirs = new Set([
  '.codex-tmp',
  '.git',
  '.wp-env',
  'dist',
  'gen',
  'node_modules',
  'playwright-report',
  'target',
  'test-results',
  'vendor',
  'wp-content'
]);
const ignoredFiles = new Set(['verify-no-production-secrets.mjs']);
const failures = [];
const maxTextFileBytes = 5 * 1024 * 1024;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) {
      continue;
    }

    if (ignoredFiles.has(entry)) {
      continue;
    }

    const path = resolve(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path);
      continue;
    }

    if (stat.size > maxTextFileBytes) {
      continue;
    }

    const content = readFileSync(path, 'utf8');
    for (const pattern of blockedPatterns) {
      if (pattern.test(content)) {
        failures.push(path);
        break;
      }
    }
  }
}

walk(root);

if (failures.length > 0) {
  console.error('Potential production secret markers found:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('No production secret markers found.');
