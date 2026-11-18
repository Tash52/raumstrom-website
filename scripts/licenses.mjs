// npm run licenses [-- --check]
// Writes THIRD-PARTY-LICENSES.md from package-lock.json. --check fails on licenses
// outside the allow list that are not a documented exception.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Project rule: MIT, Apache-2.0, BSD, ISC. Plus licenses that are at least as permissive. */
export const ALLOWED = new Set([
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC',
  // equally or more permissive (no attribution or copyleft beyond MIT):
  'MIT-0', '0BSD', 'BlueOak-1.0.0', 'CC0-1.0', 'Python-2.0', 'Unlicense',
]);

/**
 * Documented exceptions. `freigegeben` = approved by the operator (Plan Frage 4, 18.11.2026; lightningcss und y-provider ebenfalls 18.11.2026).
 * Match by package name (exact) or prefix ending in "*".
 */
export const EXCEPTIONS = [
  { match: 'gsap', lizenz: 'Standard no charge license', grund: 'Animation (Phase 3); kostenlos, keine OSI-Lizenz', freigegeben: true },
  { match: 'sharp', lizenz: 'Apache-2.0 (enthält libvips LGPL-3.0)', grund: 'Bildoptimierung von Astro im Build; zur Laufzeit Neukodierung von Foto-Uploads (/api/contact)', freigegeben: true },
  { match: '@img/sharp-*', lizenz: 'LGPL-3.0-or-later', grund: 'vorkompiliertes libvips für sharp, dynamisch gelinkt, unverändert (Build und Upload-Neukodierung)', freigegeben: true },
  { match: 'libheif-js', lizenz: 'LGPL-3.0', grund: 'HEIC-Decoder im Raumplaner (Phase 4) und für HEIC-Uploads im Kontaktformular (Server), unverändert, eigenes Modul', freigegeben: true },
  { match: 'heic-to', lizenz: 'LGPL-3.0', grund: 'HEIC-Decoder im Raumplaner (Phase 4)', freigegeben: true },
  { match: 'axe-core', lizenz: 'MPL-2.0', grund: 'nur Testwerkzeug, wird nicht ausgeliefert', freigegeben: true },
  { match: '@axe-core/*', lizenz: 'MPL-2.0', grund: 'nur Testwerkzeug, wird nicht ausgeliefert', freigegeben: true },
  { match: 'lightningcss*', lizenz: 'MPL-2.0', grund: 'CSS-Werkzeug von Vite 8, nur im Build, unverändert, wird nicht ausgeliefert', freigegeben: true },
  { match: 'y-provider', lizenz: 'keine Angabe', grund: 'Abhängigkeit von Keystatic (nur Entwicklung, lokal), wird nicht ausgeliefert', freigegeben: true },
];

const nameOf = (key) => key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);

export function exceptionFor(name) {
  return EXCEPTIONS.find((e) => (e.match.endsWith('*') ? name.startsWith(e.match.slice(0, -1)) : name === e.match));
}

/** Evaluates simple SPDX expressions with OR / AND and parentheses. */
export function isAllowed(expr) {
  if (!expr) return false;
  const clean = expr.replace(/[()]/g, ' ').trim();
  if (/\sOR\s/.test(clean)) return clean.split(/\s+OR\s+/).some((p) => isAllowed(p));
  if (/\sAND\s/.test(clean)) return clean.split(/\s+AND\s+/).every((p) => isAllowed(p));
  return ALLOWED.has(clean.replace(/\+$/, ''));
}

export function collect(lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'))) {
  const rows = [];
  for (const [key, v] of Object.entries(lock.packages)) {
    if (!key || v.link) continue;
    const name = nameOf(key);
    const license = typeof v.license === 'string' ? v.license : (v.license?.type ?? '');
    const exception = isAllowed(license) ? undefined : exceptionFor(name);
    rows.push({ name, version: v.version, license: license || 'keine Angabe', dev: Boolean(v.dev), optional: Boolean(v.optional), ok: isAllowed(license) || Boolean(exception), exception });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

function render(rows) {
  const prod = rows.filter((r) => !r.dev);
  const dev = rows.filter((r) => r.dev);
  const table = (list) => ['| Paket | Version | Lizenz |', '|---|---|---|', ...list.map((r) => `| ${r.name} | ${r.version} | ${r.license}${r.exception ? ' ⚑' : ''} |`)].join('\n');
  return [
    '# Drittanbieter-Lizenzen',
    '',
    'Automatisch erzeugt mit `npm run licenses` aus `package-lock.json`. Nicht von Hand bearbeiten.',
    '',
    'Projektregel: nur MIT, Apache-2.0, BSD, ISC (und gleich oder freizügigere Lizenzen: MIT-0, 0BSD, BlueOak-1.0.0, CC0-1.0, Python-2.0, Unlicense). Schriften: OFL-1.1 (Lizenztext liegt bei den Schriftdateien). Texturen: CC0.',
    '',
    '## Dokumentierte Ausnahmen (⚑)',
    '',
    '| Paket | Lizenz | Grund | Status |',
    '|---|---|---|---|',
    ...EXCEPTIONS.map((e) => `| \`${e.match}\` | ${e.lizenz} | ${e.grund} | ${e.freigegeben ? 'freigegeben' : '**Freigabe offen**'} |`),
    '',
    'LGPL-Bibliotheken werden unverändert und als austauschbare Einheit genutzt (dynamisch gelinkt bzw. eigener Chunk). MPL-2.0-Werkzeuge werden unverändert genutzt und nicht ausgeliefert.',
    '',
    `## Laufzeit- und Build-Abhängigkeiten (${prod.length})`,
    '',
    'Plattform-spezifische optionale Pakete (z. B. `@img/sharp-*`, `lightningcss-*`) werden nur für das jeweilige Betriebssystem installiert.',
    '',
    table(prod),
    '',
    `## Nur Entwicklung und Tests (${dev.length})`,
    '',
    table(dev),
    '',
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = collect();
  const bad = rows.filter((r) => !r.ok);
  if (process.argv.includes('--check')) {
    if (bad.length) {
      console.error('Nicht erlaubte Lizenzen (weder erlaubt noch dokumentierte Ausnahme):');
      for (const r of bad) console.error(`  ${r.name}@${r.version}: ${r.license}`);
      process.exit(1);
    }
    const pending = EXCEPTIONS.filter((e) => !e.freigegeben && rows.some((r) => r.exception === e));
    for (const e of pending) console.warn(`Hinweis: Ausnahme ${e.match} (${e.lizenz}) wartet auf Freigabe.`);
    console.log(`Lizenzen ok (${rows.length} Pakete).`);
  } else {
    writeFileSync(path.join(root, 'THIRD-PARTY-LICENSES.md'), render(rows));
    console.log(`THIRD-PARTY-LICENSES.md geschrieben (${rows.length} Pakete, ${bad.length} ohne Freigabe).`);
  }
}
