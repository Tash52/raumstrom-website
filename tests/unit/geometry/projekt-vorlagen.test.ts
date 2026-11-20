import { describe, expect, it } from 'vitest';
import {
  PROJEKT_VERSION,
  VORLAGEN,
  formatFlaeche,
  formatLaenge,
  ladeVorlage,
  leeresProjekt,
  massstabAusStrecke,
  mitRaeumen,
  parseLaenge,
  parseProjekt,
  pruefeVerweise,
  serialisiere,
} from '../../../src/lib/geometry/index.ts';

describe('Projektmodell', () => {
  it('ist versioniert und als JSON verlustfrei wieder einlesbar', () => {
    const p = ladeVorlage('2-zimmer')!;
    expect(p.version).toBe(PROJEKT_VERSION);
    const r = parseProjekt(serialisiere(p));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.projekt).toEqual(p);
  });

  it('lehnt kaputtes JSON, neuere Versionen und falsche Verweise ab', () => {
    expect(parseProjekt('{kaputt').ok).toBe(false);
    expect(parseProjekt({ ...leeresProjekt(), version: 99 }).ok).toBe(false);
    const p = ladeVorlage('1-zimmer')!;
    const kaputt = { ...p, waende: [...p.waende, { ...p.waende[0]!, id: 'w999', von: 'k999' }] };
    const r = parseProjekt(kaputt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fehler.join()).toMatch(/unbekannten Knoten/);
  });

  it('erkennt unzulässige Werte über das Schema', () => {
    const p = ladeVorlage('1-zimmer')!;
    expect(parseProjekt({ ...p, waende: [{ ...p.waende[0]!, dicke: 5 }, ...p.waende.slice(1)] }).ok).toBe(false);
    expect(parseProjekt({ ...p, name: 'x'.repeat(200) }).ok).toBe(false);
  });

  it('lehnt nicht endliche Zahlen ab (zod 4: z.number() ohne .finite())', () => {
    const p = ladeVorlage('1-zimmer')!;
    const k0 = p.knoten[0]!;
    for (const x of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(parseProjekt({ ...p, knoten: [{ ...k0, x }, ...p.knoten.slice(1)] }).ok).toBe(false);
      expect(parseProjekt({ ...p, waende: [{ ...p.waende[0]!, dicke: x }, ...p.waende.slice(1)] }).ok).toBe(false);
      expect(parseProjekt({ ...p, raeume: p.raeume.map((r) => ({ ...r, flaeche: x })) }).ok).toBe(false);
    }
  });
});

describe('Vorlagen', () => {
  const erwartet: Record<string, number> = { '1-zimmer': 3, '2-zimmer': 5, '3-zimmer': 7, 'efh-eg': 7 };

  it.each(VORLAGEN.map((v) => v.id))('%s: Räume erkannt, Verweise gültig, Namen gesetzt', (id) => {
    const p = ladeVorlage(id)!;
    expect(pruefeVerweise(p)).toEqual([]);
    expect(p.raeume).toHaveLength(erwartet[id]!);
    expect(p.raeume.every((r) => r.flaeche > 1)).toBe(true);
    expect(p.oeffnungen.some((o) => o.art === 'tuer')).toBe(true);
    expect(p.oeffnungen.some((o) => o.art === 'fenster')).toBe(true);
    // stable: recomputing the rooms changes nothing
    expect(mitRaeumen(p)).toEqual(p);
  });

  it('2-Zimmer-Wohnung: Raumnamen und plausible Gesamtfläche', () => {
    const p = ladeVorlage('2-zimmer')!;
    expect(p.raeume.map((r) => r.name).sort()).toEqual(['Bad', 'Flur', 'Küche', 'Schlafzimmer', 'Wohnzimmer']);
    const summe = p.raeume.reduce((s, r) => s + r.flaeche, 0);
    expect(summe).toBeGreaterThan(45);
    expect(summe).toBeLessThan(54);
  });

  it('unbekannte Vorlage', () => {
    expect(ladeVorlage('schloss')).toBeNull();
  });
});

describe('Kalibrierung und Format', () => {
  it('Maßstab aus zwei Punkten und bekannter Länge (Türbreite 88,5 cm)', () => {
    const r = massstabAusStrecke({ x: 100, y: 100 }, { x: 277, y: 100 }, 0.885);
    expect(r.ok && r.meterProPixel).toBeCloseTo(0.005, 6);
  });

  it('Kalibrierung lehnt zu kurze Strecken und Länge 0 ab', () => {
    expect(massstabAusStrecke({ x: 0, y: 0 }, { x: 3, y: 0 }, 1).ok).toBe(false);
    expect(massstabAusStrecke({ x: 0, y: 0 }, { x: 300, y: 0 }, 0).ok).toBe(false);
  });

  it('Längen eingeben: Komma, Einheiten, Standard cm', () => {
    expect(parseLaenge('88,5')).toBe(0.885);
    expect(parseLaenge('3,45 m')).toBe(3.45);
    expect(parseLaenge('3450mm')).toBe(3.45);
    expect(parseLaenge('2.5', 'm')).toBe(2.5);
    expect(parseLaenge('abc')).toBeNull();
    expect(parseLaenge('-3')).toBeNull();
    expect(parseLaenge('0')).toBeNull();
  });

  it('deutsche Formatierung', () => {
    expect(formatLaenge(3.456)).toBe('3,46 m');
    expect(formatLaenge(0.885)).toBe('88,5 cm');
    expect(formatLaenge(0.9)).toBe('90 cm');
    expect(formatFlaeche(12.345)).toBe('12,3 m²');
  });
});
