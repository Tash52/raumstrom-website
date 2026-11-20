// Project model version 2 (Phase 5 contract for planner-design): migration, schema, wall sides,
// electrical points, furniture and their consistency after wall edits.
import { describe, expect, it } from 'vitest';
import {
  type Projekt,
  PROJEKT_VERSION,
  aendereElektro,
  aendereEinrichtung,
  bereinigeAusstattung,
  elektroLage,
  entferneWand,
  fuegeEinrichtungHinzu,
  fuegeElektroHinzu,
  fuegeWandHinzu,
  gestalteRaeume,
  ladeVorlage,
  mitRaeumen,
  parseProjekt,
  pruefeVerweise,
  raeumeAnWand,
  raumAnWandseite,
  serialisiere,
  setzeWandSeite,
  skaliereProjekt,
  teileWand,
  verschiebeKnoten,
  wandAbschnitte,
  wandSeiteBei,
  wirksameWandGestaltung,
} from '../../../src/lib/geometry/index.ts';
import { INNEN, mitWaenden, rechteck } from './hilfen.ts';

/** Two rooms 4×3 side by side, sharing the wall x = 4. */
function zweiRaeume(): Projekt {
  return mitWaenden([...rechteck(0, 0, 4, 3), ...rechteck(4, 0, 3, 3)]);
}
const mittelwand = (p: Projekt) => {
  const k = new Map(p.knoten.map((n) => [n.id, n]));
  return p.waende.find((w) => k.get(w.von)!.x === 4 && k.get(w.bis)!.x === 4)!;
};
const raumBeiX = (p: Projekt, x: number) =>
  p.raeume.find((r) => {
    const k = new Map(p.knoten.map((n) => [n.id, n]));
    const xs = r.knoten.map((id) => k.get(id)!.x);
    return Math.min(...xs) < x && x < Math.max(...xs);
  })!;

/** A version-1 file as Phase 4 wrote it. */
function alsV1(p: Projekt): Record<string, unknown> {
  const { wandSeiten: _s, elektro: _e, einrichtung: _m, ...rest } = p;
  return {
    ...rest,
    version: 1,
    raeume: p.raeume.map(({ gestaltung: _g, stilpaket: _p, ...r }) => r),
    oeffnungen: p.oeffnungen.map(({ gestaltung: _g, ...o }) => o),
  };
}

describe('Version 2 und Migration', () => {
  it('ist Version 2, v1-Dateien laden weiter (neutrale Vorgaben)', () => {
    expect(PROJEKT_VERSION).toBe(2);
    const p = ladeVorlage('2-zimmer')!;
    const v1 = alsV1(p);
    const r = parseProjekt(JSON.stringify(v1));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.projekt.version).toBe(2);
    expect(r.projekt).toEqual(p);
    expect(r.projekt.raeume.every((x) => x.gestaltung.wand === null && x.stilpaket === null)).toBe(true);
    expect(r.projekt.oeffnungen.every((o) => o.gestaltung === null)).toBe(true);
    expect([r.projekt.wandSeiten, r.projekt.elektro, r.projekt.einrichtung]).toEqual([[], [], []]);
  });

  it('kaputte v1-Dateien bleiben abgelehnt; v2 ohne neue Felder wird nicht migriert', () => {
    const v1 = alsV1(ladeVorlage('1-zimmer')!);
    expect(parseProjekt({ ...v1, raeume: 'x' }).ok).toBe(false);
    expect(parseProjekt({ ...v1, version: 2 }).ok).toBe(false);
    expect(parseProjekt({ ...v1, version: 3 }).ok).toBe(false);
  });

  it('v2 mit Gestaltung, Elektro und Möbeln ist verlustfrei serialisierbar', () => {
    let p = zweiRaeume();
    const w = mittelwand(p);
    p = gestalteRaeume(p, 'alle', { boden: { material: 'boden.eiche-landhausdiele', richtungGrad: 90, farbe: '#C8A27A' } }, 'japandi');
    p = setzeWandSeite(p, w.id, 'links', { wand: { material: 'farbe.matt', farbe: '#3d6300' } });
    p = { ...p, oeffnungen: [] };
    p = fuegeElektroHinzu(p, { typ: 'steckdose.2fach', ort: 'wand', wandId: w.id, seite: 'rechts', abstand: 1, hoehe: 0.3 })!.projekt;
    p = fuegeElektroHinzu(p, { typ: 'licht.deckenauslass', ort: 'decke', x: 2, y: 1.5 })!.projekt;
    p = fuegeEinrichtungHinzu(p, { typ: 'moebel.sofa', x: 5.5, y: 1.5, drehungGrad: -90 }).projekt;
    const r = parseProjekt(serialisiere(p));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.projekt).toEqual(p);
    expect(pruefeVerweise(p)).toEqual([]);
    expect(p.einrichtung[0]!.drehungGrad).toBe(270);
  });

  it('Schema: Katalog-IDs, Farben, Limits, Wand-/Deckenpunkte', () => {
    const p = zweiRaeume();
    const w = mittelwand(p);
    const e = fuegeElektroHinzu(p, { typ: 'steckdose.einfach', ort: 'wand', wandId: w.id, seite: 'links', abstand: 1, hoehe: 0.3 })!.projekt;
    const mitRaum = (g: object) => ({ ...p, raeume: p.raeume.map((r) => ({ ...r, gestaltung: { ...r.gestaltung, ...g } })) });
    expect(parseProjekt(mitRaum({ wand: { material: 'Farbe Weiß' } })).ok).toBe(false);
    expect(parseProjekt(mitRaum({ wand: { material: 'a'.repeat(61) } })).ok).toBe(false);
    expect(parseProjekt(mitRaum({ wand: { material: 'farbe', farbe: 'rot' } })).ok).toBe(false);
    expect(parseProjekt(mitRaum({ wand: { material: 'farbe..x' } })).ok).toBe(false);
    expect(parseProjekt(mitRaum({ fliesen: { material: 'fliese.metro', fliesenhoehe: 'halbhoch', fuge: { farbe: '#ffffff', breiteMm: 2 } } })).ok).toBe(true);
    expect(parseProjekt(mitRaum({ fliesen: { material: 'fliese.metro', fuge: { farbe: '#ffffff', breiteMm: 99 } } })).ok).toBe(false);
    // wall point without wall, ceiling point with wall
    expect(parseProjekt({ ...e, elektro: [{ ...e.elektro[0]!, wandId: null }] }).ok).toBe(false);
    expect(parseProjekt({ ...e, elektro: [{ ...e.elektro[0]!, ort: 'decke' }] }).ok).toBe(false);
    expect(parseProjekt({ ...e, elektro: [{ ...e.elektro[0]!, hoehe: 7 }] }).ok).toBe(false);
    const viele = Array.from({ length: 2001 }, (_, i) => ({ ...e.elektro[0]!, id: `e${i + 1}` }));
    expect(parseProjekt({ ...e, elektro: viele }).ok).toBe(false);
  });

  it('pruefeVerweise: unbekannte Wand/Raum, doppelte IDs und Wandseiten', () => {
    const p = zweiRaeume();
    const w = mittelwand(p);
    const e = fuegeElektroHinzu(p, { typ: 'steckdose.einfach', ort: 'wand', wandId: w.id, seite: 'links', abstand: 1, hoehe: 0.3 })!.projekt;
    expect(pruefeVerweise({ ...e, elektro: [{ ...e.elektro[0]!, wandId: 'w999' }] }).join()).toMatch(/unbekannte Wand/);
    expect(pruefeVerweise({ ...e, elektro: [{ ...e.elektro[0]!, raumId: 'r999' }] }).join()).toMatch(/unbekannten Raum/);
    expect(pruefeVerweise({ ...e, elektro: [e.elektro[0]!, e.elektro[0]!] }).join()).toMatch(/doppelt/);
    const m = fuegeEinrichtungHinzu(p, { typ: 'moebel.bett', x: 1, y: 1, drehungGrad: 0 }).projekt;
    expect(pruefeVerweise({ ...m, einrichtung: [{ ...m.einrichtung[0]!, raumId: 'r999' }] }).join()).toMatch(/unbekannten Raum/);
    const s = { wandId: w.id, seite: 'links' as const, wand: { material: 'farbe' }, fliesen: null };
    expect(pruefeVerweise({ ...p, wandSeiten: [s, s] }).join()).toMatch(/Wandseite .* doppelt/);
    expect(pruefeVerweise({ ...p, wandSeiten: [{ ...s, wandId: 'w999' }] }).join()).toMatch(/unbekannte Wand/);
  });
});

describe('Wandseite → Raum', () => {
  it('Raum links/rechts einer Wand (links = normale(bis - von))', () => {
    const p = zweiRaeume();
    const w = mittelwand(p);
    const k = new Map(p.knoten.map((n) => [n.id, n]));
    const abwaerts = k.get(w.von)!.y < k.get(w.bis)!.y; // direction (0, +1): normale = (-1, 0) -> links is x < 4
    const westen = raumBeiX(p, 2);
    const osten = raumBeiX(p, 5.5);
    const r = raeumeAnWand(p, w.id);
    expect(r.links!.id).toBe(abwaerts ? westen.id : osten.id);
    expect(r.rechts!.id).toBe(abwaerts ? osten.id : westen.id);
  });

  it('Außenwand: außen kein Raum', () => {
    const p = zweiRaeume();
    const k = new Map(p.knoten.map((n) => [n.id, n]));
    const oben = p.waende.find((w) => k.get(w.von)!.y === 0 && k.get(w.bis)!.y === 0)!;
    const r = raeumeAnWand(p, oben.id);
    expect([r.links, r.rechts].filter(Boolean)).toHaveLength(1);
    // the room lies on the side of +y (inside); find it by side test
    const treffer = wandSeiteBei(p, { x: (k.get(oben.von)!.x + k.get(oben.bis)!.x) / 2, y: 0.05 }, 0.3)!;
    expect(treffer.wandId).toBe(oben.id);
    expect(treffer.raumId).not.toBeNull();
    const aussen = wandSeiteBei(p, { x: (k.get(oben.von)!.x + k.get(oben.bis)!.x) / 2, y: -0.05 }, 0.3)!;
    expect(aussen.raumId).toBeNull();
    expect(aussen.seite).not.toBe(treffer.seite);
    expect(raumAnWandseite(p, 'w999', 'links')).toBeNull();
  });

  it('Wandabschnitte je Raum: Seite zeigt zum Raum, Innenmaß = Achsmaß minus halbe Wanddicken', () => {
    const p = zweiRaeume();
    const r = raumBeiX(p, 2);
    const ab = wandAbschnitte(p, r.id);
    expect(ab).toHaveLength(r.knoten.length);
    for (const a of ab) expect(raumAnWandseite(p, a.wandId, a.seite)!.id).toBe(r.id);
    const umfangInnen = ab.reduce((s, a) => s + a.laengeInnen, 0);
    const d = INNEN.dicke;
    expect(umfangInnen).toBeCloseTo(2 * (4 - d) + 2 * (3 - d), 6);
    expect(wandAbschnitte(p, 'r999')).toEqual([]);
  });

  it('wirksame Gestaltung: Wandseiten-Override vor Raumvorgabe, null entfernt den Eintrag', () => {
    let p = zweiRaeume();
    const w = mittelwand(p);
    const links = raeumeAnWand(p, w.id).links!;
    p = gestalteRaeume(p, [links.id], { wand: { material: 'farbe.matt', farbe: '#f4f1eb' }, fliesen: { material: 'fliese.weiss' } });
    expect(wirksameWandGestaltung(p, w.id, 'links')).toMatchObject({ raumId: links.id, wand: { farbe: '#f4f1eb' }, ueberschrieben: false });
    p = setzeWandSeite(p, w.id, 'links', { wand: { material: 'tapete.vlies' } });
    expect(wirksameWandGestaltung(p, w.id, 'links')).toMatchObject({ wand: { material: 'tapete.vlies' }, fliesen: { material: 'fliese.weiss' }, ueberschrieben: true });
    p = setzeWandSeite(p, w.id, 'links', { wand: null });
    expect(p.wandSeiten).toEqual([]);
    expect(setzeWandSeite(p, 'w999', 'links', { wand: { material: 'x' } })).toBe(p);
  });
});

describe('Elektro-Punkte', () => {
  it('Wandpunkt: Lage auf der Wandoberfläche, Höhe, Blickrichtung in den Raum', () => {
    const p0 = zweiRaeume();
    const w = mittelwand(p0);
    const k = new Map(p0.knoten.map((n) => [n.id, n]));
    const r = fuegeElektroHinzu(p0, { typ: 'schalter.aus', ort: 'wand', wandId: w.id, seite: 'links', abstand: 1, hoehe: 1.05 })!;
    const e = r.projekt.elektro[0]!;
    expect(r.id).toBe('e1');
    const a = k.get(w.von)!;
    const dir = Math.sign(k.get(w.bis)!.y - a.y); // ±1 along y
    // links normal of (0, dir) is (-dir, 0)
    expect(e.x).toBeCloseTo(4 - dir * (INNEN.dicke / 2), 4);
    expect(e.y).toBeCloseTo(a.y + dir * 1, 4);
    expect(e.raumId).toBe(raeumeAnWand(r.projekt, w.id).links!.id);
    const lage = elektroLage(r.projekt, e)!;
    expect(lage.position).toEqual({ x: e.x, y: 1.05, z: e.y });
    expect(lage.normale.x).toBeCloseTo(-dir, 9);
    // a model's local +z after rotation.y = drehungY points along the normal
    expect(Math.sin(lage.drehungY)).toBeCloseTo(lage.normale.x, 9);
    expect(Math.cos(lage.drehungY)).toBeCloseTo(lage.normale.z, 9);
    expect(fuegeElektroHinzu(p0, { typ: 'x', ort: 'wand', wandId: 'w999', seite: 'links', abstand: 0, hoehe: 0.3 })).toBeNull();
  });

  it('Decken- und Bodenpunkt: Raum aus Position, Höhe aus Raum', () => {
    let p = zweiRaeume();
    const ost = raumBeiX(p, 5.5);
    p = { ...p, raeume: p.raeume.map((r) => (r.id === ost.id ? { ...r, hoehe: 2.8 } : r)) };
    p = fuegeElektroHinzu(p, { typ: 'licht.deckenauslass', ort: 'decke', x: 5.5, y: 1.5 })!.projekt;
    p = fuegeElektroHinzu(p, { typ: 'steckdose.boden', ort: 'boden', x: 9, y: 9 })!.projekt;
    const [decke, boden] = p.elektro;
    expect(decke!.raumId).toBe(ost.id);
    expect(elektroLage(p, decke!)!.position.y).toBe(2.8);
    expect(elektroLage(p, decke!)!.normale).toEqual({ x: 0, y: -1, z: 0 });
    expect(boden!.raumId).toBeNull();
    expect(elektroLage(p, boden!)!.position).toEqual({ x: 9, y: 0, z: 9 });
  });

  it('Verschieben entlang der Wand wird auf die Wandlänge begrenzt, Höhe editierbar', () => {
    const p0 = zweiRaeume();
    const w = mittelwand(p0);
    let p = fuegeElektroHinzu(p0, { typ: 'steckdose.einfach', ort: 'wand', wandId: w.id, seite: 'rechts', abstand: 1, hoehe: 0.3 })!.projekt;
    p = aendereElektro(p, 'e1', { abstand: 50, hoehe: 1.15 });
    expect(p.elektro[0]!.abstand).toBeCloseTo(3, 6);
    expect(p.elektro[0]!.hoehe).toBe(1.15);
    expect(aendereElektro(p, 'e9', { hoehe: 1 })).toBe(p);
  });

  it('Wand löschen entfernt ihre Wandpunkte und Wandseiten; Deckenpunkte verlieren den Raum', () => {
    let p = zweiRaeume();
    const w = mittelwand(p);
    p = setzeWandSeite(p, w.id, 'links', { wand: { material: 'farbe' } });
    p = fuegeElektroHinzu(p, { typ: 'steckdose.einfach', ort: 'wand', wandId: w.id, seite: 'links', abstand: 1, hoehe: 0.3 })!.projekt;
    p = fuegeElektroHinzu(p, { typ: 'licht.deckenauslass', ort: 'decke', x: 2, y: 1.5 })!.projekt;
    p = fuegeEinrichtungHinzu(p, { typ: 'moebel.tisch', x: 2, y: 1.5, drehungGrad: 0 }).projekt;
    const vorher = p.elektro[1]!.raumId;
    // delete an outer wall of the west room: that room disappears
    const k = new Map(p.knoten.map((n) => [n.id, n]));
    const west = p.waende.find((x) => k.get(x.von)!.x === 0 && k.get(x.bis)!.x === 0)!;
    const q = mitRaeumen(entferneWand(p, west.id), p);
    expect(q.raeume).toHaveLength(1);
    expect(pruefeVerweise(q)).toEqual([]);
    // the middle wall still exists: its point stays, its room on the west side is gone
    expect(q.elektro.find((e) => e.ort === 'wand')).toMatchObject({ wandId: w.id, raumId: null });
    expect(vorher).not.toBeNull();
    expect(q.elektro.find((e) => e.ort === 'decke')!.raumId).toBeNull();
    expect(q.einrichtung[0]!.raumId).toBeNull();
    // delete the middle wall itself
    const q2 = mitRaeumen(entferneWand(p, w.id), p);
    expect(q2.elektro.some((e) => e.ort === 'wand')).toBe(false);
    expect(q2.wandSeiten).toEqual([]);
    expect(pruefeVerweise(q2)).toEqual([]);
    // merged into one big room: ceiling point and furniture now belong to it
    expect(q2.raeume).toHaveLength(1);
    expect(q2.elektro[0]!.raumId).toBe(q2.raeume[0]!.id);
  });

  it('Wand teilen: Punkte wandern auf die zweite Hälfte, Wandseiten gelten für beide', () => {
    let p = zweiRaeume();
    const w = mittelwand(p);
    p = setzeWandSeite(p, w.id, 'rechts', { fliesen: { material: 'fliese.metro', fliesenhoehe: 'spritzschutz' } });
    p = fuegeElektroHinzu(p, { typ: 'a', ort: 'wand', wandId: w.id, seite: 'links', abstand: 0.5, hoehe: 0.3 })!.projekt;
    p = fuegeElektroHinzu(p, { typ: 'b', ort: 'wand', wandId: w.id, seite: 'links', abstand: 2.5, hoehe: 0.3 })!.projekt;
    const vorher = p.elektro.map((e) => ({ x: e.x, y: e.y }));
    const split = teileWand(p, w.id, { x: 4, y: 1.5 });
    const q = mitRaeumen(split.projekt, p);
    expect(pruefeVerweise(q)).toEqual([]);
    expect(q.elektro[0]!.wandId).toBe(w.id);
    expect(q.elektro[1]!.wandId).not.toBe(w.id);
    expect(q.elektro[1]!.abstand).toBeCloseTo(1, 6);
    // positions unchanged
    q.elektro.forEach((e, i) => {
      expect(e.x).toBeCloseTo(vorher[i]!.x, 6);
      expect(e.y).toBeCloseTo(vorher[i]!.y, 6);
    });
    expect(q.wandSeiten).toHaveLength(2);
  });

  it('T-Wand löschen verschmilzt die Hälften: Punkte und Seiten bleiben an Ort und Stelle', () => {
    // west room split by a wall from (2,0) to (2,3); the walls y=0 and y=3 get T-junctions
    let p = mitWaenden([...rechteck(0, 0, 4, 3), [2, 0, 2, 3]]);
    const k = () => new Map(p.knoten.map((n) => [n.id, n]));
    const km = k();
    const oben = p.waende.filter((w) => km.get(w.von)!.y === 0 && km.get(w.bis)!.y === 0);
    expect(oben).toHaveLength(2);
    // reverse one half so the merge has to flip its side
    p = { ...p, waende: p.waende.map((w) => (w.id === oben[1]!.id ? { ...w, von: w.bis, bis: w.von } : w)) };
    p = mitRaeumen(p);
    const zweite = p.waende.find((w) => w.id === oben[1]!.id)!;
    const innen = wandSeiteBei(p, { x: (km.get(zweite.von)!.x + km.get(zweite.bis)!.x) / 2, y: 0.1 }, 0.3)!;
    p = fuegeElektroHinzu(p, { typ: 'steckdose.einfach', ort: 'wand', wandId: zweite.id, seite: innen.seite, abstand: 0.5, hoehe: 0.3 })!.projekt;
    p = setzeWandSeite(p, zweite.id, innen.seite, { wand: { material: 'farbe.akzent' } });
    const pos = { x: p.elektro[0]!.x, y: p.elektro[0]!.y };
    const t = p.waende.find((w) => km.get(w.von)!.x === 2 && km.get(w.bis)!.x === 2)!;
    const q = mitRaeumen(entferneWand(p, t.id), p);
    expect(pruefeVerweise(q)).toEqual([]);
    expect(q.raeume).toHaveLength(1);
    const e = q.elektro[0]!;
    expect(e.x).toBeCloseTo(pos.x, 6);
    expect(e.y).toBeCloseTo(pos.y, 6);
    expect(e.raumId).toBe(q.raeume[0]!.id);
    // the override still faces the room
    expect(q.wandSeiten).toHaveLength(1);
    expect(raumAnWandseite(q, q.wandSeiten[0]!.wandId, q.wandSeiten[0]!.seite)!.id).toBe(q.raeume[0]!.id);
  });

  it('Knoten verschieben: Wandpunkte folgen, Ergebnis stabil', () => {
    let p = zweiRaeume();
    const w = mittelwand(p);
    p = fuegeElektroHinzu(p, { typ: 'a', ort: 'wand', wandId: w.id, seite: 'links', abstand: 1, hoehe: 0.3 })!.projekt;
    const k = p.knoten.find((n) => n.id === w.von)!;
    const q = mitRaeumen(verschiebeKnoten(p, k.id, { x: 4.5, y: k.y }), p);
    expect(q.elektro[0]!.x).not.toBeCloseTo(p.elektro[0]!.x, 3);
    expect(bereinigeAusstattung(q)).toBe(q);
    expect(mitRaeumen(q)).toEqual(q);
  });

  it('Maßstab ändern skaliert Punkte und Möbel mit', () => {
    let p = zweiRaeume();
    p = fuegeElektroHinzu(p, { typ: 'licht', ort: 'decke', x: 2, y: 1 })!.projekt;
    p = fuegeEinrichtungHinzu(p, { typ: 'moebel.bett', x: 5, y: 2, drehungGrad: 0 }).projekt;
    const q = mitRaeumen(skaliereProjekt(p, 2));
    expect(q.elektro[0]).toMatchObject({ x: 4, y: 2 });
    expect(q.einrichtung[0]).toMatchObject({ x: 10, y: 4 });
    expect(q.einrichtung[0]!.raumId).not.toBeNull();
  });
});

describe('Einrichtung', () => {
  it('Raum aus Position, Drehung normiert', () => {
    let p = zweiRaeume();
    const r = fuegeEinrichtungHinzu(p, { typ: 'moebel.sofa', x: 2, y: 1, drehungGrad: 450 });
    p = r.projekt;
    expect(r.id).toBe('m1');
    expect(p.einrichtung[0]).toMatchObject({ raumId: raumBeiX(p, 2).id, drehungGrad: 90 });
    p = aendereEinrichtung(p, 'm1', { x: 5.5, drehungGrad: -45 });
    expect(p.einrichtung[0]).toMatchObject({ raumId: raumBeiX(p, 5.5).id, drehungGrad: 315 });
  });

  it('neue Wand teilt einen Raum: Möbel wandern in den passenden Teilraum', () => {
    let p = zweiRaeume();
    p = fuegeEinrichtungHinzu(p, { typ: 'moebel.bett', x: 1, y: 1, drehungGrad: 0 }).projekt;
    p = fuegeEinrichtungHinzu(p, { typ: 'moebel.schrank', x: 3, y: 1, drehungGrad: 0 }).projekt;
    const q = mitRaeumen(fuegeWandHinzu(p, { x: 2, y: 0 }, { x: 2, y: 3 }, INNEN).projekt, p);
    expect(q.raeume).toHaveLength(3);
    expect(q.einrichtung[0]!.raumId).not.toBe(q.einrichtung[1]!.raumId);
    expect(pruefeVerweise(q)).toEqual([]);
  });
});
