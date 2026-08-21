#!/usr/bin/env node
// Price-drift check: data/prices.json is the single source of truth.
// Fails (exit 1) if:
//   1. any treatment in prices.json has a null price or a `todo` key (unconfirmed lines must never ship)
//   2. any £-amount in a public .html file is not a price found in prices.json
//   3. any confirmed treatment price is missing from a page that should carry it
//
// EXCLUDED: treatment-information.html — the gated, noindexed factual page
// (its prices are deliberately not public-site prices and must never be
// added to prices.json; see project notes / compliance section of the brief).
//
// Zero dependencies. Run: npm run check
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'data', 'prices.json'), 'utf8'));
const EXCLUDE = new Set(['treatment-information.html']);
// Pages that must carry every confirmed treatment price
const MUST_CARRY = ['index.html', 'prices.html'];

let failures = [];

// 1. Unconfirmed lines are a hard failure — they must never ship silently.
for (const t of data.treatments) {
  if (t.price === null) failures.push(`UNCONFIRMED: "${t.name}" (${t.id}) has no price${t.todo ? ` — ${t.todo}` : ''}`);
  else if ('todo' in t) failures.push(`UNRESOLVED TODO on "${t.name}" (${t.id}): ${t.todo}`);
  if (typeof t.volume === 'string' && t.volume.includes('{{')) failures.push(`PLACEHOLDER volume on "${t.name}" (${t.id}): ${t.volume}`);
}

const allowed = new Set(data.treatments.filter(t => t.price !== null).map(t => t.price));
allowed.add(data.consultation.fee);

const htmlFiles = readdirSync(root).filter(f => f.endsWith('.html') && !EXCLUDE.has(f));

// 2. Every £ amount on a public page must exist in prices.json.
for (const f of htmlFiles) {
  const src = readFileSync(join(root, f), 'utf8');
  for (const m of src.matchAll(/£\s?(\d[\d,]*)/g)) {
    const n = Number(m[1].replace(/,/g, ''));
    if (!allowed.has(n)) failures.push(`DRIFT: ${f} shows £${m[1]} — not a price in prices.json`);
  }
}

// 3. Every confirmed price must appear on the pages that should carry it.
//    A treatment may override with its own `pages` list (e.g. dissolving is a
//    corrective service listed on /prices + the dermal page, not the homepage).
for (const t of data.treatments) {
  if (t.price === null) continue;
  for (const page of (t.pages ?? MUST_CARRY)) {
    const src = readFileSync(join(root, page), 'utf8');
    if (!new RegExp(`£\\s?${t.price}\\b`).test(src)) failures.push(`MISSING: ${page} does not show £${t.price} ("${t.name}" ${t.volume ?? ''})`.trim());
  }
}

if (failures.length) {
  console.error(`check-prices: ${failures.length} problem(s)\n`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`check-prices: OK — ${htmlFiles.length} pages checked against ${data.treatments.length} treatments`);
