import { describe, expect, it } from 'vitest';
import { type FangKontext, fangePunkt, punktMitLaenge, rasterWinkel } from '../../../src/lib/geometry/index.ts';

const basis = (teil: Partial<FangKontext> = {}): FangKontext => ({
  start: null,
  knoten: [],
  segmente: [],
  radius: 0.2,
  winkelFang: true,
  raster: 0.05,
  ...teil,
});

describe('Snapping 90°/45°', () => {
  it('rastet eine fast waagerechte Linie auf 0° ein und rundet die Länge aufs Raster', () => {
    const e = fangePunkt({ x: 3.02, y: 0.17 }, basis({ start: { x: 0, y: 0 } }));
    expect(e.art).toBe('winkel');
    expect(e.winkelGrad).toBe(0);
    expect(e.punkt).toEqual({ x: 3, y: 0 });
    expect(e.laenge).toBe(3);
  });

  it('rastet auf 90° (senkrecht, nach unten) ein', () => {
    const e = fangePunkt({ x: 1.1, y: 2.48 }, basis({ start: { x: 1, y: 0 } }));
    expect(e.winkelGrad).toBe(90);
    expect(e.punkt).toEqual({ x: 1, y: 2.5 });
  });

  it('rastet auf 45° ein', () => {
    const e = fangePunkt({ x: 2.1, y: 1.9 }, basis({ start: { x: 0, y: 0 } }));
    expect(e.winkelGrad).toBe(45);
    expect(e.punkt.x).toBeCloseTo(e.punkt.y, 6);
    expect(e.laenge).toBeCloseTo(2.85, 2);
  });

  it('rastet auf 135° und 270° ein', () => {
    expect(fangePunkt({ x: -2, y: 2.2 }, basis({ start: { x: 0, y: 0 } })).winkelGrad).toBe(135);
    expect(fangePunkt({ x: 0.2, y: -3 }, basis({ start: { x: 0, y: 0 } })).winkelGrad).toBe(270);
  });

  it('ohne Winkelfang bleibt die Richtung frei, nur das Raster greift', () => {
    const e = fangePunkt({ x: 3.02, y: 0.17 }, basis({ start: { x: 0, y: 0 }, winkelFang: false }));
    expect(e.art).toBe('raster');
    expect(e.punkt).toEqual({ x: 3, y: 0.15 });
  });

  it('rasterWinkel rundet auf Vielfache von 45°', () => {
    expect(rasterWinkel((40 * Math.PI) / 180)).toBeCloseTo(Math.PI / 4);
    expect(rasterWinkel((-80 * Math.PI) / 180)).toBeCloseTo(-Math.PI / 2);
  });
});

describe('Andocken', () => {
  const knoten = [{ id: 'k1', x: 4, y: 0 }, { id: 'k2', x: 4, y: 3 }];
  const segmente = [{ id: 'w1', a: { x: 4, y: 0 }, b: { x: 4, y: 3 } }];

  it('dockt magnetisch an ein Wandende im Fangradius an (vor dem Winkelfang)', () => {
    const e = fangePunkt({ x: 3.88, y: 2.9 }, basis({ start: { x: 0, y: 0 }, knoten, segmente }));
    expect(e.art).toBe('knoten');
    expect(e.knotenId).toBe('k2');
    expect(e.punkt).toEqual({ x: 4, y: 3 });
  });

  it('außerhalb des Radius kein Andocken', () => {
    const e = fangePunkt({ x: 3.5, y: 3.3 }, basis({ knoten, segmente, raster: null }));
    expect(e.art).toBe('frei');
  });

  it('beendet die eingerastete Richtung genau auf einer Wand (T-Anschluss)', () => {
    const e = fangePunkt({ x: 3.9, y: 1.53 }, basis({ start: { x: 0, y: 1.5 }, knoten, segmente }));
    expect(e.art).toBe('wand');
    expect(e.wandId).toBe('w1');
    expect(e.punkt).toEqual({ x: 4, y: 1.5 });
    expect(e.winkelGrad).toBe(0);
  });

  it('ohne Startpunkt projiziert es auf die nächste Wand', () => {
    const e = fangePunkt({ x: 4.1, y: 1.234 }, basis({ knoten, segmente }));
    expect(e.art).toBe('wand');
    expect(e.punkt).toEqual({ x: 4, y: 1.234 });
  });

  it('ignoriert ausgeschlossene Knoten (beim Ziehen eines Knotens)', () => {
    const e = fangePunkt({ x: 4.02, y: 3.01 }, basis({ knoten, segmente, ohneKnoten: new Set(['k2']), ohneWaende: new Set(['w1']) }));
    expect(e.art).toBe('raster');
  });

  it('dockt nicht an den eigenen Startpunkt', () => {
    const e = fangePunkt({ x: 4.05, y: 0.02 }, basis({ start: { x: 4, y: 0 }, knoten }));
    expect(e.knotenId).toBeUndefined();
  });
});

describe('Längeneingabe', () => {
  it('setzt den Endpunkt in eingerasteter Richtung', () => {
    expect(punktMitLaenge({ x: 1, y: 1 }, { x: 5, y: 1.3 }, 3.45, true)).toEqual({ x: 4.45, y: 1 });
  });
  it('ohne Winkelfang in exakter Richtung', () => {
    const p = punktMitLaenge({ x: 0, y: 0 }, { x: 3, y: 4 }, 10, false);
    expect(p).toEqual({ x: 6, y: 8 });
  });
});
