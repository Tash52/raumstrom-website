// npm run check:launch [-- --allow-placeholders] [-- --write-platzhalter]
// Fails while anything is open. The production build runs it; staging uses --allow-placeholders.
// Schema errors always fail, also with --allow-placeholders.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KATEGORIEN, renderChecklist, runLaunchCheck } from './lib/launch-check.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const allow = process.argv.includes('--allow-placeholders');
const findings = runLaunchCheck({ root });

if (process.argv.includes('--write-platzhalter')) {
  writeFileSync(path.join(root, 'PLATZHALTER.md'), renderChecklist(findings.filter((f) => !f.fatal)));
  console.log('PLATZHALTER.md aktualisiert.');
}

const fatal = findings.filter((f) => f.fatal);
const open = findings.filter((f) => !f.fatal);

for (const k of KATEGORIEN) {
  const items = open.filter((f) => f.kategorie === k);
  if (items.length === 0) continue;
  console.log(`\n${k} (${items.length})`);
  for (const f of items) console.log(`  - [${f.art}] ${f.text}  (${f.zeile ? `${f.datei}:${f.zeile}` : f.datei})`);
}
if (fatal.length) {
  console.error('\nUngültige Einstellungen (immer ein Fehler):');
  for (const f of fatal) console.error(`  - ${f.datei}: ${f.text}`);
}

console.log(`\nLaunch-Check: ${open.length} offene(r) Punkt(e), ${fatal.length} Fehler.`);
if (fatal.length) process.exit(1);
if (open.length && !allow) {
  console.error('Produktions-Build abgebrochen. Für Staging: npm run build:staging (--allow-placeholders).');
  process.exit(1);
}
if (open.length) console.warn('Staging: offene Punkte erlaubt (--allow-placeholders). Nicht veröffentlichen.');
