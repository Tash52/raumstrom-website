// Launch check (Briefing Abschnitt 11.6): lists everything that is still open before launch.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { parseEnv, readDotEnv } from '../../server/env.mjs';
import {
  LEGAL_SEITEN,
  featuresSchema,
  firmaSchema,
  gewerkeSchema,
} from '../../src/lib/schemas/index.ts';
import { listFiles, rel } from './files.mjs';

export const KATEGORIEN = ['Rechtliches', 'Kontaktdaten', 'Fotos', 'Texte', 'Technik'];
const PLACEHOLDER = /\[\[PLATZHALTER:\s*([^\]]+?)\s*\]\]/g;
const PLACEHOLDER_DIRS = ['src/content', 'src/pages', 'src/components', 'src/layouts', 'src/islands', 'src/assets', 'public'];
const PLACEHOLDER_EXTS = ['.astro', '.md', '.mdoc', '.mdx', '.yaml', '.yml', '.json', '.html', '.txt', '.svg', '.tsx', '.ts'];
const FIRMA_RECHTLICH = ['firmierung', 'gesellschafter', 'rechtsform', 'steuer', 'handwerk', 'versicherung', 'redaktion'];

/**
 * @typedef {{ kategorie: string, art: string, datei: string, zeile?: number, text: string, fatal?: boolean }} Finding
 * @param {{ root: string, env?: Record<string, string | undefined> }} opts
 * @returns {Finding[]}
 */
export function runLaunchCheck({ root, env = process.env }) {
  /** @type {Finding[]} */
  const findings = [];
  const settings = (name) => path.join(root, 'src/content/settings', `${name}.yaml`);

  // 1. Settings must match their schemas (always fatal).
  const data = {};
  for (const [name, schema] of [
    ['firma', firmaSchema],
    ['features', featuresSchema],
    ['gewerke', gewerkeSchema],
  ]) {
    const file = settings(name);
    if (!existsSync(file)) {
      findings.push({ kategorie: 'Technik', art: 'Schema', datei: rel(root, file), text: 'Datei fehlt', fatal: true });
      continue;
    }
    const r = schema.safeParse(parseYaml(readFileSync(file, 'utf8')));
    if (!r.success) {
      for (const i of r.error.issues) {
        findings.push({ kategorie: 'Technik', art: 'Schema', datei: rel(root, file), text: `${i.path.join('.')}: ${i.message}`, fatal: true });
      }
    } else data[name] = r.data;
  }

  // 2. Placeholders in content and markup.
  for (const dir of PLACEHOLDER_DIRS) {
    for (const file of listFiles(path.join(root, dir), PLACEHOLDER_EXTS)) {
      const relFile = rel(root, file);
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      const firmaKeys = relFile === 'src/content/settings/firma.yaml' ? topLevelKeys(lines) : null;
      lines.forEach((line, i) => {
        for (const m of line.matchAll(PLACEHOLDER)) {
          findings.push({
            kategorie: categorize(relFile, m[1], firmaKeys?.[i]),
            art: 'Platzhalter',
            datei: relFile,
            zeile: i + 1,
            text: m[1],
          });
        }
      });
    }
  }

  // 3. Legal texts: missing pages and draft markers.
  const legalDir = path.join(root, 'src/content/legal');
  const legalFiles = listFiles(legalDir, ['.md', '.mdoc']);
  for (const seite of LEGAL_SEITEN) {
    const file = legalFiles.find((f) => path.basename(f).replace(/\.(md|mdoc)$/, '') === seite);
    if (!file) {
      findings.push({ kategorie: 'Rechtliches', art: 'Rechtstext', datei: `src/content/legal/${seite}.md`, text: 'Rechtstext fehlt' });
      continue;
    }
    const text = readFileSync(file, 'utf8');
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    const entwurf = fm ? parseYaml(fm[1])?.entwurf !== false : true;
    if (entwurf || text.includes('<!-- ENTWURF')) {
      findings.push({ kategorie: 'Rechtliches', art: 'Rechtstext-Entwurf', datei: rel(root, file), text: 'Entwurf: vor Veröffentlichung durch Rechtstexte-Service oder Anwalt prüfen lassen' });
    }
  }

  // 4. Gewerke matrix not yet checked by the Handwerkskammer.
  for (const g of data.gewerke?.gewerke ?? []) {
    if (!g.hinweis_hwk_geprueft) {
      findings.push({ kategorie: 'Rechtliches', art: 'HWK-Prüfung', datei: 'src/content/settings/gewerke.yaml', text: `${g.name}: Formulierung von der HWK Unterfranken prüfen lassen` });
    }
  }

  // 5. Places not yet confirmed as served.
  for (const o of data.firma?.einzugsgebiet.orte ?? []) {
    if (!o.bestaetigt) {
      findings.push({ kategorie: 'Kontaktdaten', art: 'Einzugsgebiet', datei: 'src/content/settings/firma.yaml', text: `${o.name}: bestätigen, dass der Ort bedient wird (bestaetigt: true)` });
    }
  }

  // 6. Server secrets (SMTP etc.) in the environment or .env.
  const merged = { ...readDotEnv(path.join(root, '.env')), ...env };
  const envResult = parseEnv(merged);
  if (!envResult.ok) {
    for (const p of envResult.problems) {
      findings.push({ kategorie: 'Technik', art: 'Umgebungsvariable', datei: '.env', text: p });
    }
  }
  if (data.features?.floorplan_ai && !merged.MISTRAL_API_KEY) {
    findings.push({ kategorie: 'Technik', art: 'Umgebungsvariable', datei: '.env', text: 'MISTRAL_API_KEY fehlt, obwohl floorplan_ai aktiv ist' });
  }

  return findings;
}

function topLevelKeys(lines) {
  let current;
  return lines.map((line) => {
    const m = /^([a-z_]+):/.exec(line);
    if (m) current = m[1];
    return current;
  });
}

function categorize(file, text, firmaKey) {
  if (firmaKey) return FIRMA_RECHTLICH.includes(firmaKey) ? 'Rechtliches' : 'Kontaktdaten';
  if (file.startsWith('src/content/legal/')) return 'Rechtliches';
  if (/foto|bild|logo|grafik/i.test(text) || file.startsWith('src/assets/')) return 'Fotos';
  return 'Texte';
}

/** Markdown checklist for PLATZHALTER.md, grouped by category. */
export function renderChecklist(findings, date = new Date()) {
  const lines = [
    '# Offene Inhalte vor dem Launch',
    '',
    `Automatisch erzeugt mit \`npm run platzhalter\` am ${date.toISOString().slice(0, 10)}. Nicht von Hand bearbeiten, sondern die genannte Datei ändern (am einfachsten per Keystatic: \`npm run dev\`, dann http://localhost:4321/keystatic) und den Befehl erneut ausführen.`,
    '',
    '`npm run check:launch` schlägt fehl, solange hier etwas offen ist.',
    '',
    '## Zu bestätigende Annahmen',
    '',
    '- [ ] Rechtsform GbR (`src/content/settings/firma.yaml`, Feld `rechtsform`)',
    '- [ ] Domain `raumstrom.de` (Feld `domain`)',
    '- [ ] Gewerke-Matrix: Ausführung eigen/partner je Gewerk (`src/content/settings/gewerke.yaml`)',
    '- [ ] Server-Secrets auf dem Server in `.env` gesetzt (Vorlage `.env.example`; `npm run check:launch` prüft sie)',
    '',
  ];
  // Environment variables differ per machine and are not part of this content checklist.
  const content = findings.filter((f) => f.art !== 'Umgebungsvariable');
  for (const k of KATEGORIEN) {
    const items = content.filter((f) => f.kategorie === k);
    if (items.length === 0) continue;
    lines.push(`## ${k} (${items.length})`, '');
    for (const f of items) {
      const where = f.zeile ? `${f.datei}:${f.zeile}` : f.datei;
      lines.push(`- [ ] ${f.text} · \`${where}\``);
    }
    lines.push('');
  }
  return lines.join('\n');
}
