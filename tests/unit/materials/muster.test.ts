// Laying patterns: every repeat cell must be covered exactly once (no gaps, no overlaps) and
// stones crossing the cell border must carry the same variation key on both sides (seamless texture).
import { describe, expect, it } from 'vitest';
import { FORMATE, MUSTER, formatVon, imPolygon, musterZelle } from '../../../src/lib/materials/index.ts';

function abdeckung(musterId: string, formatId: string) {
  const f = formatVon(formatId)!;
  const z = musterZelle(musterId, f);
  const fehler: string[] = [];
  const n = 23;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // sample points avoid exact edges
      const q = { x: ((i + 0.37) / n) * z.breite, y: ((j + 0.61) / n) * z.hoehe };
      const treffer = z.steine.filter((s) => imPolygon(q, s.punkte)).length;
      if (treffer !== 1) fehler.push(`${q.x.toFixed(3)},${q.y.toFixed(3)}: ${treffer}`);
    }
  }
  return { z, fehler };
}

describe('musterZelle', () => {
  const faelle: Array<[string, string]> = [
    ['kreuzfuge', '60x60'],
    ['halbverband', '30x60'],
    ['drittelverband', '60x120'],
    ['vertikal-gestapelt', 'metro-7-5x15'],
    ['diagonal', '60x60'],
    ['fischgraet', 'stab'],
    ['fischgraet', '30x60'],
    ['fischgraet', 'diele'],
    ['chevron', 'stab'],
    ['landhausdiele', 'diele-lang'],
    ['halbverband', 'hexagon'],
    ['kreuzfuge', 'mosaik'],
  ];
  for (const [m, f] of faelle) {
    it(`${m} / ${f} deckt die Zelle lückenlos und ohne Überlappung`, () => {
      const { z, fehler } = abdeckung(m, f);
      expect(z.breite).toBeGreaterThan(0);
      expect(z.hoehe).toBeGreaterThan(0);
      expect(fehler).toEqual([]);
    });
  }

  it('Diagonal und Fischgrät liegen um 45° gedreht, andere Muster nicht', () => {
    const f = formatVon('60x60')!;
    expect(musterZelle('diagonal', f).drehungGrad).toBe(45);
    expect(musterZelle('fischgraet', formatVon('stab')!).drehungGrad).toBe(45);
    expect(musterZelle('kreuzfuge', f).drehungGrad).toBe(0);
  });

  it('Kopien eines Steins über den Zellrand tragen denselben Schlüssel (nahtlose Farbvariation)', () => {
    const z = musterZelle('halbverband', formatVon('30x60')!);
    // stones sticking out on the left have a twin sticking out on the right, shifted by the cell width
    const links = z.steine.filter((s) => Math.min(...s.punkte.map((q) => q.x)) < -1e-9);
    expect(links.length).toBeGreaterThan(0);
    for (const s of links) {
      const x0 = Math.min(...s.punkte.map((q) => q.x)) + z.breite;
      const y0 = Math.min(...s.punkte.map((q) => q.y));
      const zwilling = z.steine.find((t) => Math.abs(Math.min(...t.punkte.map((q) => q.x)) - x0) < 1e-6 && Math.abs(Math.min(...t.punkte.map((q) => q.y)) - y0) < 1e-6);
      expect(zwilling?.schluessel).toBe(s.schluessel);
    }
  });

  it('mindestGroesse vergrößert die Zelle um ganze Wiederholungen, begrenzt durch maxGroesse', () => {
    const f = formatVon('mosaik')!;
    const z = musterZelle('kreuzfuge', f, 0.3);
    expect(z.breite).toBeCloseTo(0.3, 6);
    expect(z.steine.length).toBe(144);
    const gross = musterZelle('kreuzfuge', formatVon('120x120')!, 5, 2.5);
    expect(gross.breite).toBeCloseTo(2.4, 6);
  });

  it('kennt alle Formate und Muster aus Briefing 7.2', () => {
    for (const id of ['30x60', '60x60', '60x120', '120x120', 'metro-7-5x15', 'hexagon', 'mosaik', 'zellige']) expect(formatVon(id)).toBeDefined();
    for (const id of ['halbverband', 'drittelverband', 'kreuzfuge', 'diagonal', 'fischgraet', 'chevron', 'vertikal-gestapelt']) expect(MUSTER.some((m) => m.id === id)).toBe(true);
    expect(new Set(FORMATE.map((f) => f.id)).size).toBe(FORMATE.length);
  });
});
