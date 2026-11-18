import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { renderChecklist, runLaunchCheck } from '../../scripts/lib/launch-check.mjs';
import { LEGAL_SEITEN } from '../../src/lib/schemas/index.ts';

const GOOD_ENV = {
  ALTCHA_HMAC_KEY: 'k'.repeat(40),
  CSRF_SECRET: 'c'.repeat(40),
  SMTP_HOST: 'smtp.raumstrom.de',
  SMTP_PORT: '465',
  SMTP_USER: 'anfrage',
  SMTP_PASS: 'geheimes-passwort',
  MAIL_FROM: 'anfrage@raumstrom.de',
};

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'launch-'));
  dirs.push(root);
  cpSync('src/content/settings', path.join(root, 'src/content/settings'), { recursive: true });
  return root;
}

/** Turns the fixture into a launch-ready state. */
function makeReady(root: string) {
  const s = (n: string) => path.join(root, 'src/content/settings', `${n}.yaml`);
  const fill = (v: unknown): unknown =>
    typeof v === 'string' && v.startsWith('[[PLATZHALTER')
      ? ''
      : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v;
  const firma = fill(parse(readFileSync(s('firma'), 'utf8'))) as any;
  Object.assign(firma, { firmierung: 'RAUMSTROM GbR' });
  firma.gesellschafter = [{ name: 'Erika Muster', vertretungsberechtigt: true }];
  firma.adresse = { strasse: 'Musterstraße 1', plz: '97421', ort: 'Schweinfurt', land: 'Deutschland' };
  firma.kontakt = { telefon: '+4997211234567', telefon_anzeige: '09721 123 45 67', email: 'info@raumstrom.de', anfragen_empfaenger: 'anfrage@raumstrom.de' };
  for (const k of ['kammer_anschrift', 'berufsbezeichnung']) firma.handwerk[k] = 'x';
  for (const k of ['versicherer', 'anschrift', 'geltungsraum']) firma.versicherung[k] = 'x';
  firma.redaktion = { name: 'Erika Muster', anschrift: 'Musterstraße 1, 97421 Schweinfurt' };
  firma.einzugsgebiet.beschreibung = 'Schweinfurt und Umland';
  firma.einzugsgebiet.orte.forEach((o: any) => (o.bestaetigt = true));
  firma.erreichbarkeit = [{ tage: 'Mo–Fr', zeiten: '8–17 Uhr' }];
  writeFileSync(s('firma'), stringify(firma));
  const gewerke = parse(readFileSync(s('gewerke'), 'utf8'));
  gewerke.gewerke.forEach((g: any) => (g.hinweis_hwk_geprueft = true));
  writeFileSync(s('gewerke'), stringify(gewerke));
  mkdirSync(path.join(root, 'src/content/legal'), { recursive: true });
  for (const seite of LEGAL_SEITEN) {
    writeFileSync(path.join(root, 'src/content/legal', `${seite}.md`), `---\ntitel: ${seite}\nseite: ${seite}\nstand: 2026-11-18\nentwurf: false\n---\nText\n`);
  }
}

describe('Launch-Check', () => {
  it('meldet Platzhalter, HWK-Prüfung, fehlende Rechtstexte, Orte und Secrets', () => {
    const findings = runLaunchCheck({ root: fixture(), env: {} });
    const arten = new Set(findings.map((f) => f.art));
    for (const a of ['Platzhalter', 'HWK-Prüfung', 'Rechtstext', 'Einzugsgebiet', 'Umgebungsvariable']) expect(arten).toContain(a);
    expect(findings.some((f) => f.fatal)).toBe(false);
    const tel = findings.find((f) => f.text.startsWith('Telefonnummer im Format'));
    expect(tel).toMatchObject({ kategorie: 'Kontaktdaten', datei: 'src/content/settings/firma.yaml' });
    expect(findings.find((f) => f.text.startsWith('Name des Versicherers'))?.kategorie).toBe('Rechtliches');
  });

  it('ist leer, wenn alles ausgefüllt ist', () => {
    const root = fixture();
    makeReady(root);
    expect(runLaunchCheck({ root, env: GOOD_ENV })).toEqual([]);
  });

  it('erkennt Entwurfsvermerk in Rechtstexten', () => {
    const root = fixture();
    makeReady(root);
    writeFileSync(path.join(root, 'src/content/legal/agb.md'), '---\ntitel: AGB\nseite: agb\nstand: 2026-11-18\nentwurf: false\n---\n<!-- ENTWURF – prüfen -->\n');
    expect(runLaunchCheck({ root, env: GOOD_ENV }).map((f) => f.art)).toEqual(['Rechtstext-Entwurf']);
  });

  it('Schemafehler sind immer fatal', () => {
    const root = fixture();
    writeFileSync(path.join(root, 'src/content/settings/features.yaml'), 'floorplan_ai: vielleicht\n');
    expect(runLaunchCheck({ root, env: GOOD_ENV }).some((f) => f.fatal)).toBe(true);
  });

  it('Platzhalter-Secrets zählen als fehlend, Werte werden nicht ausgegeben', () => {
    const root = fixture();
    makeReady(root);
    const findings = runLaunchCheck({ root, env: { ...GOOD_ENV, SMTP_PASS: '[[PLATZHALTER: Passwort]]' } });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.text).toBe('SMTP_PASS: ist noch ein Platzhalter');
  });

  it('Checkliste gruppiert nach Kategorien', () => {
    const md = renderChecklist(runLaunchCheck({ root: fixture(), env: {} }));
    expect(md).toMatch(/## Rechtliches \(\d+\)/);
    expect(md).toMatch(/## Kontaktdaten \(\d+\)/);
    expect(md).toContain('- [ ] ');
  });

  it('CLI: ohne Schalter Exit 1, mit --allow-placeholders Exit 0', () => {
    const env = { PATH: process.env.PATH ?? '' };
    expect(spawnSync(process.execPath, ['scripts/check-launch.mjs'], { env }).status).toBe(1);
    expect(spawnSync(process.execPath, ['scripts/check-launch.mjs', '--allow-placeholders'], { env }).status).toBe(0);
  });

  it('PLATZHALTER.md ist aktuell (npm run platzhalter)', () => {
    const today = readFileSync('PLATZHALTER.md', 'utf8').replace(/am \d{4}-\d{2}-\d{2}/, 'am X');
    const fresh = renderChecklist(runLaunchCheck({ root: process.cwd(), env: {} }).filter((f) => !f.fatal)).replace(/am \d{4}-\d{2}-\d{2}/, 'am X');
    expect(today).toBe(fresh);
  });
});

describe('Trend-Schema', () => {
  it('_schema.json ist aktuell', () => {
    expect(() => execFileSync(process.execPath, ['scripts/trend-schema.mjs', '--check'], { stdio: 'pipe' })).not.toThrow();
  });
});

describe('Launch-Check und bedingte Blöcke', () => {
  const legal = (root: string, body: string) => {
    mkdirSync(path.join(root, 'src/content/legal'), { recursive: true });
    writeFileSync(path.join(root, 'src/content/legal/datenschutz.md'), `---\ntitel: D\nseite: datenschutz\nstand: 2026-11-18\nentwurf: false\n---\n${body}`);
  };
  const setFeature = (root: string, key: string, value: boolean) => {
    const f = path.join(root, 'src/content/settings/features.yaml');
    const d = parse(readFileSync(f, 'utf8'));
    d[key] = value;
    writeFileSync(f, stringify(d));
  };
  const block = 'Text\n\n<!-- wenn features.floorplan_ai -->\n\nKI: [[PLATZHALTER: Mistral-Angaben]]\n\n<!-- VOR AKTIVIERUNG prüfen: AVV Mistral -->\n\n<!-- /wenn -->\n';

  it('Platzhalter hinter abgeschaltetem Flag zählen nicht', () => {
    const root = fixture();
    makeReady(root);
    setFeature(root, 'floorplan_ai', false);
    legal(root, block);
    expect(runLaunchCheck({ root, env: GOOD_ENV })).toEqual([]);
  });

  it('bei aktivem Flag zählen Platzhalter und VOR-AKTIVIERUNG-Hinweise', () => {
    const root = fixture();
    makeReady(root);
    setFeature(root, 'floorplan_ai', true);
    legal(root, block);
    const arten = runLaunchCheck({ root, env: { ...GOOD_ENV, MISTRAL_API_KEY: 'k' } }).map((f) => f.art);
    expect(arten).toEqual(expect.arrayContaining(['Platzhalter', 'Vor Aktivierung']));
  });

  it('leerer firma-Wert blendet Block samt Platzhalter aus', () => {
    const root = fixture();
    makeReady(root);
    legal(root, 'A\n\n<!-- wenn firma.steuer.w_idnr -->\n\nW-IdNr.: [[PLATZHALTER: W-IdNr.]]\n\n<!-- /wenn -->\n');
    expect(runLaunchCheck({ root, env: GOOD_ENV })).toEqual([]);
  });

  it('unbekannte Marker sind fatal', () => {
    const root = fixture();
    makeReady(root);
    legal(root, '{{firma.gibtsnicht}}\n');
    const f = runLaunchCheck({ root, env: GOOD_ENV });
    expect(f.some((x) => x.fatal && x.art === 'Marker')).toBe(true);
  });
});

describe('Launch-Check Domain', () => {
  it('meldet ungültige SITE_URL, akzeptiert die Domain aus firma.yaml', () => {
    const root = fixture();
    makeReady(root);
    expect(runLaunchCheck({ root, env: GOOD_ENV })).toEqual([]);
    const f = runLaunchCheck({ root, env: { ...GOOD_ENV, SITE_URL: 'http://localhost:4321' } });
    expect(new Set(f.map((x) => x.art))).toEqual(new Set(['Domain']));
    expect(f.map((x) => x.text).join(' ')).toMatch(/https.*localhost/);
  });
});
