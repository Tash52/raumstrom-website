// npm run trend-schema [-- --check]
// Generates src/content/trends/_schema.json from the zod schema (single source of truth
// for the website and the monthly trend routine). --check fails if the file is outdated.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { trendSchema } from '../src/lib/schemas/trend.ts';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const target = path.join(root, 'src/content/trends/_schema.json');

export function buildTrendJsonSchema() {
  const schema = z.toJSONSchema(trendSchema, { target: 'draft-2020-12', io: 'input' });
  return `${JSON.stringify({ $id: 'https://raumstrom.de/schemas/trend.json', ...schema }, null, 2)}\n`;
}

const next = buildTrendJsonSchema();
if (process.argv.includes('--check')) {
  const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (current !== next) {
    console.error('src/content/trends/_schema.json ist veraltet. Ausführen: npm run trend-schema');
    process.exit(1);
  }
  console.log('Trend-Schema aktuell.');
} else {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, next);
  console.log('src/content/trends/_schema.json geschrieben.');
}
