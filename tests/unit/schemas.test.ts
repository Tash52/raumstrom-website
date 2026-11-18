import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  featuresSchema,
  firmaSchema,
  gewerkeSchema,
  isPlaceholder,
  leistungSchema,
  legalSchema,
  orPlaceholder,
  trendSchema,
} from '../../src/lib/schemas/index.ts';
import { z } from 'zod';

const load = (name: string) => parse(readFileSync(`src/content/settings/${name}.yaml`, 'utf8'));

describe('Einstellungen im Repo', () => {
  it('firma.yaml, features.yaml, gewerke.yaml sind gültig', () => {
    expect(firmaSchema.safeParse(load('firma')).success).toBe(true);
    expect(featuresSchema.safeParse(load('features')).success).toBe(true);
    expect(gewerkeSchema.safeParse(load('gewerke')).success).toBe(true);
  });

  it('Gewerke-Startwerte entsprechen Briefing Abschnitt 2', () => {
    const { gewerke } = gewerkeSchema.parse(load('gewerke'));
    const by = Object.fromEntries(gewerke.map((g) => [g.id, g.ausfuehrung]));
    for (const id of ['demontage-entkernung', 'trockenbau', 'bodenbelag', 'koordination', 'pruefservice-dguv-v3']) expect(by[id], id).toBe('eigen');
    for (const id of ['elektroinstallation', 'wallbox-installation', 'zaehlerschrank', 'fliesen-bad', 'putz-stuck', 'malerarbeiten']) expect(by[id], id).toBe('partner');
  });

  it('Domain raumstrom.de, Rechtsform GbR, neun Orte als unbestätigte Entwürfe', () => {
    const firma = firmaSchema.parse(load('firma'));
    expect(firma.domain).toBe('raumstrom.de');
    expect(firma.rechtsform).toBe('GbR');
    expect(firma.einzugsgebiet.orte).toHaveLength(9);
    expect(firma.einzugsgebiet.orte.every((o) => !o.bestaetigt)).toBe(true);
  });
});

describe('Platzhalter', () => {
  it('erkennt nur das exakte Format', () => {
    expect(isPlaceholder('[[PLATZHALTER: Telefon]]')).toBe(true);
    expect(isPlaceholder('[[PLATZHALTER]]')).toBe(false);
    expect(isPlaceholder('PLATZHALTER: Telefon')).toBe(false);
  });
  it('orPlaceholder akzeptiert Wert oder Platzhalter, sonst nichts', () => {
    const s = orPlaceholder(z.email());
    expect(s.safeParse('info@raumstrom.de').success).toBe(true);
    expect(s.safeParse('[[PLATZHALTER: E-Mail]]').success).toBe(true);
    expect(s.safeParse('keine-mail').success).toBe(false);
  });
});

describe('Negativbeispiele', () => {
  const firma = () => structuredClone(load('firma'));

  it('lehnt ungültige Kontaktdaten ab', () => {
    const f = firma();
    f.kontakt.email = 'kaputt';
    expect(firmaSchema.safeParse(f).success).toBe(false);
    const g = firma();
    g.adresse.plz = '123';
    expect(firmaSchema.safeParse(g).success).toBe(false);
    const h = firma();
    h.handwerk.berufsrecht_url = 'http://www.gesetze-im-internet.de/hwo/';
    expect(firmaSchema.safeParse(h).success).toBe(false);
  });

  it('lehnt doppelte Gewerke-IDs und unbekannte Ausführung ab', () => {
    const g = load('gewerke');
    expect(gewerkeSchema.safeParse({ gewerke: [...g.gewerke, g.gewerke[0]] }).success).toBe(false);
    expect(gewerkeSchema.safeParse({ gewerke: [{ ...g.gewerke[0], ausfuehrung: 'subunternehmer' }] }).success).toBe(false);
  });

  it('begrenzt SEO-Titel und -Beschreibung', () => {
    const base = { titel: 'Trockenbau', meta_title: 'x'.repeat(60), meta_description: 'y'.repeat(155), kurzbeschreibung: 'k', saeule: 'modernisieren', zielgruppen: ['zuhause'] };
    expect(leistungSchema.safeParse(base).success).toBe(true);
    expect(leistungSchema.safeParse({ ...base, meta_title: 'x'.repeat(61) }).success).toBe(false);
    expect(leistungSchema.safeParse({ ...base, meta_description: 'y'.repeat(156) }).success).toBe(false);
    expect(leistungSchema.parse(base).entwurf).toBe(true);
  });

  it('Rechtstexte sind standardmäßig Entwurf', () => {
    expect(legalSchema.parse({ titel: 'Impressum', seite: 'impressum', stand: '2026-11-18' }).entwurf).toBe(true);
    expect(legalSchema.safeParse({ titel: 'X', seite: 'blog', stand: '2026-11-18' }).success).toBe(false);
  });

  it('Trend: Farben als Hex, Datum ISO', () => {
    const t = {
      name: 'Japandi', beschreibung: 'b', gueltig_ab: '2026-09-01', saison: '2026/27', trend_quelle_notiz: 'n', aktiv: true,
      wandfarben: [{ name: 'Sandbeige', hex: '#D8CBB5' }],
      putz_tapete: { art: 'putz', beschreibung: 'Kalkputz' },
      boden: { material: 'parkett', farbton: { name: 'Eiche hell', hex: '#C8A97E' } },
      deckenlicht: { art: 'Spots', farbtemperatur_k: 2700 },
      elektro_vorschlag: { paket: 'Komfort', punkte: ['USB-C-Steckdosen'] },
    };
    expect(trendSchema.safeParse(t).success).toBe(true);
    expect(trendSchema.safeParse({ ...t, wandfarben: [{ name: 'x', hex: 'red' }] }).success).toBe(false);
    expect(trendSchema.safeParse({ ...t, gueltig_ab: '01.09.2026' }).success).toBe(false);
  });
});
