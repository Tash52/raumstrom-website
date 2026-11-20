// Material catalogue (ids, normalisation, descriptions) and the style package mapping
// (fixed terms from docs/TREND-UPDATE.md -> catalogue ids, tolerant fallbacks).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ladeVorlage, materialRefSchema, mitRaeumen, parseProjekt, raumAnWandseite, serialisiere, setzeWandSeite } from '../../../src/lib/geometry/index.ts';
import {
  MATERIALIEN,
  MOEBEL,
  PALETTEN,
  type Stilpaket,
  STANDARD,
  TAPETEN,
  beschreibeRef,
  farbName,
  formatId,
  kontrast,
  materialVon,
  materialeFuer,
  moebelUmriss,
  musterId,
  normalisiereRef,
  paketGestaltung,
  putzMaterial,
  raumArt,
  raumMaterialien,
  standardRef,
  wendePaketAn,
} from '../../../src/lib/materials/index.ts';
import { scanText } from '../../../scripts/lib/wording.mjs';

const TRENDS = join(process.cwd(), 'src/content/trends');
const pakete: Stilpaket[] = readdirSync(TRENDS)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join(TRENDS, f), 'utf8')) }));

describe('Material-Katalog', () => {
  it('IDs sind eindeutig, gültige Katalog-IDs, Standards passen zum Schema', () => {
    const ids = MATERIALIEN.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MATERIALIEN) expect(materialRefSchema.safeParse(standardRef(m.id)).success, m.id).toBe(true);
    for (const id of Object.values(STANDARD)) expect(materialVon(id)).toBeDefined();
  });

  it('deckt die Optionen aus Briefing 7.2 ab (Wände, Boden, Fliesen, Decke)', () => {
    const wand = materialeFuer('wand').map((m) => m.id);
    for (const id of ['tapete.raufaser', 'tapete.vlies-glatt', 'tapete.strukturvlies', 'tapete.glasfaser', 'tapete.muster', 'putz.glatt-q3', 'putz.glatt-q4', 'putz.rau', 'putz.kalk', 'putz.lehm', 'putz.betonoptik', 'putz.mikrozement', 'paneel.akustik', 'holz.verkleidung', 'trockenbau.vorsatzschale'])
      expect(wand).toContain(id);
    const boden = materialeFuer('boden').map((m) => m.id);
    for (const id of ['boden.vinyl', 'boden.laminat', 'boden.parkett', 'fliese.matt', 'boden.teppich', 'boden.mikrozement']) expect(boden).toContain(id);
    const fliesen = materialeFuer('fliesen').map((m) => m.id);
    for (const id of ['fliese.matt', 'fliese.glaenzend', 'fliese.marmor', 'fliese.beton', 'fliese.holz', 'fliese.terrazzo']) expect(fliesen).toContain(id);
    expect(materialeFuer('decke').map((m) => m.id)).toEqual(['decke.farbe', 'decke.abgehaengt', 'decke.lichtvoute', 'decke.stuck']);
    expect(TAPETEN.length).toBeGreaterThanOrEqual(4);
  });

  it('normalisiereRef ist tolerant: unbekanntes Material -> Standard der Kategorie, ungültige Optionen fallen weg', () => {
    expect(normalisiereRef({ material: 'gibt.es-nicht' }, 'wand')!.material).toBe('farbe.matt');
    const f = normalisiereRef({ material: 'fliese.matt', format: 'quatsch', muster: 'landhausdiele', fuge: { farbe: '#ABCDEF', breiteMm: 99 }, fliesenhoehe: 'raumhoch' }, 'fliesen')!;
    expect(f.format).toBe('60x60');
    expect(f.muster).toBe('kreuzfuge');
    expect(f.fuge).toEqual({ farbe: '#abcdef', breiteMm: 30 });
    expect(f.fliesenhoehe).toBe('raumhoch');
    // a floor never carries a tiling height
    expect(normalisiereRef({ material: 'fliese.matt', fliesenhoehe: 'raumhoch' }, 'boden')!.fliesenhoehe).toBeUndefined();
    // paint has no pattern
    expect(normalisiereRef({ material: 'farbe.matt', muster: 'fischgraet', farbe: '#112233' }, 'wand')).toEqual({ material: 'farbe.matt', farbe: '#112233' });
    expect(normalisiereRef(null, 'wand')).toBeNull();
  });

  it('beschreibeRef nennt Material, Muster, Format, Farbname', () => {
    expect(beschreibeRef({ material: 'boden.parkett', muster: 'fischgraet', format: 'stab', farbe: '#c9ae86' }, farbName)).toBe('Parkett, Fischgrät, Stab 60 × 10 cm, Eiche hell');
    expect(beschreibeRef(null)).toBe('nicht festgelegt');
  });

  it('Paletten: eigene Namen, gültige Hexwerte, keine geschützten Farbsystem-Namen', () => {
    const verboten = /\b(RAL|NCS|Pantone|HKS)\b/i;
    for (const p of PALETTEN)
      for (const f of p.farben) {
        expect(f.hex).toMatch(/^#[0-9a-f]{6}$/);
        expect(f.name).not.toMatch(verboten);
      }
    const texte = [...MATERIALIEN.map((m) => `${m.name} ${m.hinweis ?? ''}`), ...MOEBEL.map((m) => m.name)].join('\n');
    expect(texte).not.toMatch(verboten);
    expect(scanText(texte)).toEqual([]);
    expect(kontrast('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });

  it('Möbel-Umriss dreht im Uhrzeigersinn (Plan, y nach unten)', () => {
    const u = moebelUmriss({ breite: 2, tiefe: 1 }, 0, 0, 90);
    // width now along y
    const xs = u.map((q) => q.x);
    const ys = u.map((q) => q.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(2, 6);
  });
});

describe('Stilpakete', () => {
  it('liest alle 8 Pakete', () => {
    expect(pakete.length).toBe(8);
  });

  it('feste Begriffe werden erkannt', () => {
    expect(putzMaterial({ art: 'putz', beschreibung: 'Kalkputz in matter Oberfläche' })).toBe('putz.kalk');
    expect(putzMaterial({ art: 'putz', beschreibung: 'Glattputz Q4, sehr fein' })).toBe('putz.glatt-q4');
    expect(putzMaterial({ art: 'tapete', beschreibung: 'Vlies glatt, matt' })).toBe('tapete.vlies-glatt');
    expect(putzMaterial({ art: 'farbe', beschreibung: 'Wandfarbe matt' })).toBe('farbe.matt');
    // tolerant: unknown description -> by art
    expect(putzMaterial({ art: 'tapete', beschreibung: 'Irgendwas Neues' })).toBe('tapete.vlies-glatt');
    expect(putzMaterial({ art: 'putz', beschreibung: 'Neuartiger Putz' })).toBe('putz.glatt-q3');
    expect(musterId('Fischgrät')).toBe('fischgraet');
    expect(musterId('vertikal gestapelt')).toBe('vertikal-gestapelt');
    expect(musterId('Landhausdiele')).toBe('landhausdiele');
    expect(musterId('Wildverband')).toBeUndefined();
    expect(formatId('30×60')).toBe('30x60');
    expect(formatId('60 x 30')).toBe('30x60');
    expect(formatId('7,5×15 Metro')).toBe('metro-7-5x15');
    expect(formatId('Zellige-Optik')).toBe('zellige');
    expect(formatId('Hexagon')).toBe('hexagon');
    expect(formatId('45×90')).toBeUndefined();
  });

  it('raumArt erkennt typische Raumnamen', () => {
    expect(raumArt('Bad')).toBe('bad');
    expect(raumArt('Gäste-WC')).toBe('wc');
    expect(raumArt('Küche')).toBe('kueche');
    expect(raumArt('Schlafzimmer')).toBe('schlafen');
    expect(raumArt('Wohnraum')).toBe('wohnen');
    expect(raumArt('Flur')).toBe('flur');
    expect(raumArt('Abstellraum')).toBe('abstell');
  });

  for (const paket of pakete) {
    it(`${paket.id}: gültige Gestaltung für Bad, Küche und Wohnraum`, () => {
      for (const art of ['bad', 'kueche', 'wohnen', 'wc', 'flur'] as const) {
        const g = paketGestaltung(paket, art);
        for (const [teil, ref] of Object.entries(g)) if (ref) expect(materialRefSchema.safeParse(ref).success, `${art}.${teil}`).toBe(true);
        expect(g.wand).not.toBeNull();
        expect(g.boden).not.toBeNull();
        expect(g.decke).not.toBeNull();
      }
      const bad = paketGestaltung(paket, 'bad');
      expect(bad.boden!.material.startsWith('fliese.')).toBe(true);
      expect(bad.fliesen).not.toBeNull();
      expect(bad.wand!.material.startsWith('tapete.')).toBe(false);
      expect(paketGestaltung(paket, 'kueche').fliesen!.fliesenhoehe).toBe('spritzschutz');
      expect(paketGestaltung(paket, 'wohnen').fliesen).toBeNull();
      expect(paketGestaltung(paket, 'wohnen').wand!.farbe).toBe(paket.wandfarben[0]!.hex.toLowerCase());
    });
  }

  it('Japandi: Kalkputz, Parkett Landhausdiele in Eiche hell, Zellige-Fliesen im Bad, Lichtvoute', () => {
    const j = pakete.find((x) => x.id === 'japandi')!;
    const w = paketGestaltung(j, 'wohnen');
    expect(w.wand!.material).toBe('putz.kalk');
    expect(w.boden).toMatchObject({ material: 'boden.parkett', muster: 'landhausdiele', format: 'diele-lang', farbe: '#c9ae86' });
    expect(w.decke!.material).toBe('decke.lichtvoute');
    expect(w.sockelleiste).toMatchObject({ material: 'sockel.holz', farbe: '#c9ae86' });
    expect(paketGestaltung(j, 'bad').fliesen).toMatchObject({ material: 'fliese.zellige', format: 'zellige', muster: 'halbverband' });
  });

  it('tolerant bei unbekannten Begriffen (Fallback statt Fehler)', () => {
    const kaputt: Stilpaket = {
      ...pakete[0]!,
      putz_tapete: { art: 'putz', beschreibung: 'Völlig neue Technik' },
      boden: { material: 'kork', farbton: { name: 'x', hex: 'nicht-hex' } },
      fliesen: { format: '45×90', farbe: { name: 'Neu', hex: '#zzzzzz' }, verlegemuster: 'Wild' },
      deckenlicht: { art: 'Pendel', farbtemperatur_k: 3000 },
    };
    const g = paketGestaltung(kaputt, 'bad');
    for (const ref of Object.values(g)) if (ref) expect(materialRefSchema.safeParse(ref).success).toBe(true);
    expect(g.fliesen!.format).toBe('60x60');
    expect(paketGestaltung(kaputt, 'wohnen').boden!.material).toBe('boden.parkett');
  });

  it('wendePaketAn: Raum oder ganze Wohnung, vermerkt das Paket, entfernt Wandseiten-Overrides, bleibt gültig und einzeln änderbar', () => {
    const p0 = ladeVorlage('2-zimmer')!;
    const bad = p0.raeume.find((r) => r.name === 'Bad')!;
    const andere = p0.raeume.find((r) => r.name !== 'Bad')!;
    const w = p0.waende[0]!;
    let p = setzeWandSeite(p0, w.id, 'links', { wand: { material: 'farbe.akzent', farbe: '#3d6300' } });
    p = setzeWandSeite(p, w.id, 'rechts', { wand: { material: 'farbe.akzent', farbe: '#3d6300' } });
    const paket = pakete.find((x) => x.id === 'hotelbad')!;
    const nurBad = mitRaeumen(wendePaketAn(p, paket, [bad.id]));
    expect(nurBad.raeume.find((r) => r.id === bad.id)!.stilpaket).toBe('hotelbad');
    expect(nurBad.raeume.find((r) => r.id === andere.id)!.stilpaket).toBeNull();
    const alle = mitRaeumen(wendePaketAn(p, paket, 'alle'));
    expect(alle.raeume.every((r) => r.stilpaket === 'hotelbad')).toBe(true);
    // only the outside face of the outer wall keeps its override (no room there)
    expect(alle.wandSeiten.length).toBeLessThan(2);
    expect(alle.wandSeiten.every((s) => raumAnWandseite(alle, s.wandId, s.seite) === null)).toBe(true);
    const r = parseProjekt(serialisiere(alle));
    expect(r.ok, r.ok ? '' : r.fehler.join('\n')).toBe(true);
    // afterwards individually changeable
    const einzeln = setzeWandSeite(alle, w.id, 'links', { wand: { material: 'farbe.matt', farbe: '#112233' } });
    expect(einzeln.wandSeiten.some((s) => s.seite === 'links' && s.wand?.farbe === '#112233')).toBe(true);
    expect(raumMaterialien(alle).every((x) => x.zeilen.some((z) => z.bereich === 'Wände'))).toBe(true);
  });
});
