import { describe, expect, it } from 'vitest';
import {
  einruecken,
  entferneWand,
  findeFlaechen,
  flaeche,
  mitRaeumen,
  nameVorschlag,
  raumBei,
  schwerpunkt,
  verschiebeKnoten,
  wandHoehe,
  punktImPolygon,
  beschriftungsPunkt,
} from '../../../src/lib/geometry/index.ts';
import { AUSSEN, INNEN, mitWaenden, rechteck } from './hilfen.ts';

describe('Flächen', () => {
  it('Shoelace: Rechteck und L-Form', () => {
    expect(flaeche([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }])).toBe(12);
    const l = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 4 }, { x: 0, y: 4 }];
    expect(flaeche(l)).toBe(12);
  });

  it('Einrücken je Kante: Rechteck 4 × 3 mit 10 cm ergibt 3,9 × 2,9', () => {
    const r = einruecken([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }], [0.05, 0.05, 0.05, 0.05]);
    expect(flaeche(r)).toBeCloseTo(3.9 * 2.9, 6);
  });

  it('Einrücken funktioniert unabhängig von der Umlaufrichtung', () => {
    const r = einruecken([{ x: 0, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 0 }, { x: 0, y: 0 }], [0.05, 0.05, 0.05, 0.05]);
    expect(flaeche(r)).toBeCloseTo(3.9 * 2.9, 6);
  });

  it('Beschriftungspunkt liegt auch in einer U-Form innen', () => {
    const u = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];
    expect(punktImPolygon(schwerpunkt(u), u)).toBe(false);
    expect(punktImPolygon(beschriftungsPunkt(u), u)).toBe(true);
  });
});

describe('Raumerkennung', () => {
  it('ein geschlossenes Rechteck ist genau ein Raum mit lichter Fläche', () => {
    const p = mitWaenden(rechteck(0, 0, 4, 3), INNEN);
    expect(p.raeume).toHaveLength(1);
    // centre line 4 × 3, clear (4 - 0.115) × (3 - 0.115)
    expect(p.raeume[0]!.flaeche).toBeCloseTo(3.885 * 2.885, 2);
  });

  it('offener Linienzug ergibt keinen Raum', () => {
    const p = mitWaenden([[0, 0, 4, 0], [4, 0, 4, 3], [4, 3, 0, 3]]);
    expect(p.raeume).toHaveLength(0);
  });

  it('eine Trennwand (T-Anschlüsse) teilt in zwei Räume', () => {
    const p = mitWaenden([...rechteck(0, 0, 6, 4), [2.5, 0, 2.5, 4]]);
    expect(p.raeume).toHaveLength(2);
    const summe = p.raeume.reduce((s, r) => s + r.flaeche, 0);
    expect(summe).toBeCloseTo((2.5 - 0.115) * 3.885 + (3.5 - 0.115) * 3.885, 2);
  });

  it('sich kreuzende Wände werden geteilt: vier Räume', () => {
    const p = mitWaenden([...rechteck(0, 0, 4, 4), [2, 0, 2, 4], [0, 2, 4, 2]]);
    expect(p.raeume).toHaveLength(4);
    expect(p.knoten.find((k) => k.x === 2 && k.y === 2)).toBeTruthy();
  });

  it('eine lose Wand im Raum stört die Erkennung nicht', () => {
    const p = mitWaenden([...rechteck(0, 0, 5, 4), [1, 1, 2, 1]]);
    expect(p.raeume).toHaveLength(1);
    const p2 = mitWaenden([...rechteck(0, 0, 5, 4), [0, 2, 1.5, 2]]);
    expect(p2.raeume).toHaveLength(1);
  });

  it('zwei getrennte Räume nebeneinander', () => {
    const p = mitWaenden([...rechteck(0, 0, 3, 3), ...rechteck(5, 0, 3, 3)]);
    expect(p.raeume).toHaveLength(2);
  });

  it('L-förmiger Raum', () => {
    const p = mitWaenden([[0, 0, 4, 0], [4, 0, 4, 2], [4, 2, 2, 2], [2, 2, 2, 4], [2, 4, 0, 4], [0, 4, 0, 0]]);
    expect(p.raeume).toHaveLength(1);
    expect(findeFlaechen(p)).toHaveLength(1);
  });

  it('unterschiedliche Wanddicken: Außenwand 30 cm, Innenwand 11,5 cm', () => {
    let p = mitWaenden(rechteck(0, 0, 6, 4), AUSSEN);
    p = mitWaenden([[3, 0, 3, 4]], INNEN, p);
    const links = p.raeume.find((r) => raumBei(p, { x: 1, y: 1 })?.id === r.id)!;
    expect(links.flaeche).toBeCloseTo((3 - 0.15 - 0.0575) * (4 - 0.3), 2);
  });

  it('Namen bleiben beim Verschieben eines Knotens erhalten', () => {
    let p = mitWaenden([...rechteck(0, 0, 6, 4), [3, 0, 3, 4]]);
    p = { ...p, raeume: p.raeume.map((r) => ({ ...r, name: r.id === p.raeume[0]!.id ? 'Küche' : 'Bad' })) };
    const ecke = p.knoten.find((k) => k.x === 6 && k.y === 4)!;
    const q = mitRaeumen(verschiebeKnoten(p, ecke.id, { x: 7, y: 4 }));
    expect(q.raeume.map((r) => r.name).sort()).toEqual(['Bad', 'Küche']);
    expect(q.raeume.map((r) => r.id).sort()).toEqual(p.raeume.map((r) => r.id).sort());
  });

  it('Entfernen der Trennwand vereint die Räume, der größere Name bleibt', () => {
    const p = mitWaenden([...rechteck(0, 0, 6, 4), [2, 0, 2, 4]]);
    const trenn = p.waende.find((w) => {
      const a = p.knoten.find((k) => k.id === w.von)!;
      const b = p.knoten.find((k) => k.id === w.bis)!;
      return a.x === 2 && b.x === 2;
    })!;
    const q = mitRaeumen(entferneWand(p, trenn.id), p);
    expect(q.raeume).toHaveLength(1);
    expect(q.waende).toHaveLength(4); // collinear halves merged again
    const groesster = [...p.raeume].sort((a, b) => b.flaeche - a.flaeche)[0]!;
    expect(q.raeume[0]!.name).toBe(groesster.name);
  });

  it('automatische Namen nach Fläche', () => {
    expect(nameVorschlag(1.8, new Set())).toBe('Abstellraum');
    expect(nameVorschlag(5, new Set())).toBe('Bad');
    expect(nameVorschlag(12, new Set())).toBe('Zimmer');
    expect(nameVorschlag(25, new Set())).toBe('Wohnzimmer');
    expect(nameVorschlag(25, new Set(['Wohnzimmer']))).toBe('Zimmer');
    expect(nameVorschlag(12, new Set(['Zimmer', 'Zimmer 2']))).toBe('Zimmer 3');
  });

  it('Wandhöhe folgt dem höchsten angrenzenden Raum', () => {
    let p = mitWaenden([...rechteck(0, 0, 6, 4), [3, 0, 3, 4]]);
    const r = p.raeume[0]!;
    p = { ...p, raeume: p.raeume.map((x) => (x.id === r.id ? { ...x, hoehe: 3.1 } : x)) };
    const mitte = p.waende.find((w) => [w.von, w.bis].every((id) => p.knoten.find((k) => k.id === id)!.x === 3))!;
    expect(wandHoehe(p, mitte)).toBe(3.1);
    const fremd = mitWaenden([[10, 0, 12, 0]], INNEN, p);
    expect(wandHoehe(fremd, fremd.waende.at(-1)!)).toBe(2.5);
  });
});
