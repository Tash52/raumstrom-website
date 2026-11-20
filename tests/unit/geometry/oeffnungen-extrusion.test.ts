import { describe, expect, it } from 'vitest';
import {
  OEFFNUNG_RAND,
  aendereOeffnung,
  bodenFlaechen,
  entferneWand,
  flaeche,
  oeffnungsLage,
  platziereOeffnung,
  verschiebeOeffnung,
  wandKoerper,
} from '../../../src/lib/geometry/index.ts';
import { AUSSEN, INNEN, mitWaenden, rechteck } from './hilfen.ts';

describe('Türen und Fenster', () => {
  const p0 = mitWaenden([[0, 0, 4, 0]]);

  it('setzt eine Tür mittig auf die Wand am Klickpunkt', () => {
    const r = platziereOeffnung(p0, 'tuer', { x: 2, y: 0.1 }, 0.2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.projekt.oeffnungen[0]).toMatchObject({ art: 'tuer', abstand: 2, breite: 0.885, bruestung: 0 });
  });

  it('klemmt am Wandende ein', () => {
    const r = platziereOeffnung(p0, 'fenster', { x: 0.1, y: 0 }, 0.2);
    expect(r.ok && r.projekt.oeffnungen[0]!.abstand).toBeCloseTo(1.01 / 2 + OEFFNUNG_RAND, 6);
  });

  it('lehnt Klicks neben der Wand, zu kurze Wände und Überlappungen ab', () => {
    expect(platziereOeffnung(p0, 'tuer', { x: 2, y: 1 }, 0.2).ok).toBe(false);
    expect(platziereOeffnung(mitWaenden([[0, 0, 0.6, 0]]), 'tuer', { x: 0.3, y: 0 }, 0.2).ok).toBe(false);
    const r = platziereOeffnung(p0, 'tuer', { x: 2, y: 0 }, 0.2);
    if (!r.ok) throw new Error();
    expect(platziereOeffnung(r.projekt, 'fenster', { x: 2.3, y: 0 }, 0.2).ok).toBe(false);
  });

  it('verschieben entlang der Wand und Maße ändern', () => {
    const r = platziereOeffnung(p0, 'fenster', { x: 2, y: 0 }, 0.2);
    if (!r.ok) throw new Error();
    let p = verschiebeOeffnung(r.projekt, r.id, { x: 3, y: 0.3 }, 0.1);
    expect(p.oeffnungen[0]!.abstand).toBe(3);
    p = aendereOeffnung(p, r.id, { breite: 1.5 });
    expect(p.oeffnungen[0]!.breite).toBe(1.5);
    expect(p.oeffnungen[0]!.abstand).toBe(3);
    p = aendereOeffnung(p, r.id, { abstand: 3.9 });
    expect(p.oeffnungen[0]!.abstand).toBeCloseTo(4 - 0.75 - OEFFNUNG_RAND, 6);
    const lage = oeffnungsLage(p, p.oeffnungen[0]!)!;
    expect(lage.b.x - lage.a.x).toBeCloseTo(1.5, 6);
  });

  it('Öffnungen verschwinden mit ihrer Wand', () => {
    const r = platziereOeffnung(p0, 'tuer', { x: 2, y: 0 }, 0.2);
    if (!r.ok) throw new Error();
    expect(entferneWand(r.projekt, 'w1').oeffnungen).toHaveLength(0);
  });
});

describe('3D-Extrusion (Daten)', () => {
  it('Rechteck mit 30-cm-Außenwänden: Ecken werden geschlossen', () => {
    const p = mitWaenden(rechteck(0, 0, 4, 3), AUSSEN);
    const k = wandKoerper(p);
    expect(k).toHaveLength(4);
    const oben = k.find((x) => Math.abs(x.a.y) < 1e-9 && Math.abs(x.b.y) < 1e-9)!;
    expect(oben.laenge).toBeCloseTo(4.3, 6); // 15 cm into each corner
    expect(oben.hoehe).toBe(2.5);
  });

  it('T-Anschluss: durchgehende Wand bleibt bündig, die Stichwand reicht hinein', () => {
    const p = mitWaenden([[0, 0, 6, 0], [3, 0, 3, 3]], INNEN);
    const k = wandKoerper(p);
    const stich = k.find((x) => Math.abs(x.a.x - 3) < 1e-9 && Math.abs(x.b.x - 3) < 1e-9)!;
    expect(stich.laenge).toBeCloseTo(3 + 0.115 / 2, 6);
    const haelfte = k.find((x) => x.wandId !== stich.wandId)!;
    expect(haelfte.laenge).toBeCloseTo(3, 6);
  });

  it('Öffnungen werden relativ zum verlängerten Wandkörper angegeben', () => {
    const p0 = mitWaenden(rechteck(0, 0, 4, 3), AUSSEN);
    const r = platziereOeffnung(p0, 'fenster', { x: 2, y: 0 }, 0.2);
    if (!r.ok) throw new Error();
    const oben = wandKoerper(r.projekt).find((x) => x.oeffnungen.length)!;
    const o = oben.oeffnungen[0]!;
    const start = oben.a.x < oben.b.x ? oben.a.x : oben.b.x;
    // the window centre stays at x = 2 in plan coordinates
    const mitteWelt = oben.a.x < oben.b.x ? start + o.von + o.breite / 2 : oben.a.x - (o.von + o.breite / 2);
    expect(mitteWelt).toBeCloseTo(2, 6);
    expect(o.bruestung).toBe(0.9);
  });

  it('Bodenflächen entsprechen der lichten Raumfläche', () => {
    const p = mitWaenden([...rechteck(0, 0, 6, 4), [3, 0, 3, 4]]);
    const b = bodenFlaechen(p);
    expect(b).toHaveLength(2);
    for (const f of b) expect(flaeche(f.polygon)).toBeCloseTo(p.raeume.find((r) => r.id === f.raumId)!.flaeche, 2);
  });
});
