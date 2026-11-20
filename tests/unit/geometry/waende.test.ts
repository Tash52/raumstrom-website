import { describe, expect, it } from 'vitest';
import {
  aendereWand,
  fuegeWandHinzu,
  leeresProjekt,
  platziereOeffnung,
  pruefeVerweise,
  setzeWandLaenge,
  skaliereProjekt,
  teileWand,
  verschiebeKnoten,
  wandLaenge,
} from '../../../src/lib/geometry/index.ts';
import { INNEN, mitWaenden, rechteck } from './hilfen.ts';

describe('Wandgraph', () => {
  it('neue Wand legt zwei Knoten an', () => {
    const r = fuegeWandHinzu(leeresProjekt(), { x: 0, y: 0 }, { x: 3, y: 0 }, INNEN);
    expect(r.projekt.knoten).toHaveLength(2);
    expect(r.projekt.waende).toHaveLength(1);
    expect(r.wandIds).toEqual(['w1']);
  });

  it('zu kurze Wände werden ignoriert', () => {
    const r = fuegeWandHinzu(leeresProjekt(), { x: 0, y: 0 }, { x: 0.01, y: 0 }, INNEN);
    expect(r.projekt.waende).toHaveLength(0);
  });

  it('Endpunkt auf bestehendem Knoten wird wiederverwendet (Andocken)', () => {
    const p = mitWaenden([[0, 0, 3, 0], [3, 0, 3, 2]]);
    expect(p.knoten).toHaveLength(3);
  });

  it('Endpunkt auf einer Wand teilt sie (T-Anschluss), Öffnungen wandern mit', () => {
    let p = mitWaenden([[0, 0, 6, 0]]);
    const r = platziereOeffnung(p, 'fenster', { x: 4.5, y: 0 }, 0.1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    p = fuegeWandHinzu(r.projekt, { x: 3, y: 0 }, { x: 3, y: 3 }, INNEN).projekt;
    expect(p.waende).toHaveLength(3);
    const o = p.oeffnungen[0]!;
    const wand = p.waende.find((w) => w.id === o.wandId)!;
    const von = p.knoten.find((k) => k.id === wand.von)!;
    expect(von.x).toBe(3);
    expect(o.abstand).toBeCloseTo(1.5, 6);
    expect(pruefeVerweise(p)).toEqual([]);
  });

  it('überlappende kollineare Wand wird nicht doppelt angelegt', () => {
    const p = mitWaenden([[0, 0, 4, 0], [2, 0, 6, 0]]);
    expect(p.waende).toHaveLength(3); // 0-2, 2-4, 4-6
    const summe = p.waende.reduce((s, w) => s + wandLaenge(p, w), 0);
    expect(summe).toBeCloseTo(6, 6);
  });

  it('dieselbe Wand zweimal zeichnen erzeugt keine Dublette', () => {
    const p = mitWaenden([[0, 0, 4, 0], [4, 0, 0, 0]]);
    expect(p.waende).toHaveLength(1);
  });

  it('teileWand nahe einem Ende liefert den vorhandenen Knoten', () => {
    const p = mitWaenden([[0, 0, 4, 0]]);
    const r = teileWand(p, 'w1', { x: 0.002, y: 0 });
    expect(r.projekt).toBe(p);
  });

  it('Knoten auf anderen Knoten ziehen verschmilzt sie, Nullwände verschwinden', () => {
    const p = mitWaenden([[0, 0, 3, 0], [3, 0, 3, 3], [0, 0.5, 0, 3]]);
    const lose = p.knoten.find((k) => k.x === 0 && k.y === 0.5)!;
    const q = verschiebeKnoten(p, lose.id, { x: 0.001, y: 0.001 });
    expect(q.knoten.find((k) => k.id === lose.id)).toBeUndefined();
    expect(pruefeVerweise(q)).toEqual([]);
    expect(q.waende).toHaveLength(3);
  });

  it('Wandlänge numerisch setzen verschiebt den Endknoten', () => {
    const p = mitWaenden([[1, 1, 4, 1]]);
    const q = setzeWandLaenge(p, 'w1', 4.25);
    expect(wandLaenge(q, q.waende[0]!)).toBeCloseTo(4.25, 6);
    expect(q.knoten.find((k) => k.id === 'k2')).toMatchObject({ x: 5.25, y: 1 });
  });

  it('Wandstärke und Art ändern', () => {
    const p = aendereWand(mitWaenden([[0, 0, 4, 0]]), 'w1', { dicke: 0.24, art: 'aussen' });
    expect(p.waende[0]).toMatchObject({ dicke: 0.24, art: 'aussen' });
  });

  it('Skalieren nach Kalibrierung', () => {
    const p = skaliereProjekt(mitWaenden(rechteck(0, 0, 2, 1)), 2.5);
    expect(p.knoten.map((k) => [k.x, k.y])).toContainEqual([5, 2.5]);
  });
});
