// Walk-through (first person): movement with wall collision. Pure TS on the project model, no three.js.
// Walls block, door openings let you pass, windows do not.
import { type Projekt, type Punkt, beschriftungsPunkt, raumPolygon, wandKoerper, knotenMap } from '../../../lib/geometry/index.ts';

export const AUGENHOEHE = 1.6;
export const KOERPER_RADIUS = 0.2;

export interface Hindernis {
  a: Punkt;
  b: Punkt;
  laenge: number;
  halb: number;
  /** Passable intervals along a->b (door openings), metres from a. */
  durchgaenge: Array<[number, number]>;
}

export function hindernisse(p: Projekt): Hindernis[] {
  return wandKoerper(p).map((k) => ({
    a: k.a,
    b: k.b,
    laenge: k.laenge,
    halb: k.dicke / 2,
    durchgaenge: k.oeffnungen.filter((o) => o.art === 'tuer').map((o): [number, number] => [o.von, o.von + o.breite]),
  }));
}

/** True when a body of radius r at q overlaps a wall (outside its door openings). */
export function kollidiert(h: readonly Hindernis[], q: Punkt, r = KOERPER_RADIUS): boolean {
  for (const w of h) {
    const dx = (w.b.x - w.a.x) / (w.laenge || 1);
    const dy = (w.b.y - w.a.y) / (w.laenge || 1);
    const u = (q.x - w.a.x) * dx + (q.y - w.a.y) * dy;
    const v = Math.abs(-(q.x - w.a.x) * dy + (q.y - w.a.y) * dx);
    if (u < -r || u > w.laenge + r || v > w.halb + r) continue;
    // inside a door opening (with body clearance): passable
    if (w.durchgaenge.some(([u0, u1]) => u >= u0 + r * 0.5 && u <= u1 - r * 0.5)) continue;
    return true;
  }
  return false;
}

/** Move from `von` by `d`, sliding along walls (axis-separated); returns the new position. */
export function bewege(h: readonly Hindernis[], von: Punkt, d: Punkt, r = KOERPER_RADIUS): Punkt {
  const ziel = { x: von.x + d.x, y: von.y + d.y };
  if (!kollidiert(h, ziel, r)) return ziel;
  const nurX = { x: von.x + d.x, y: von.y };
  if (Math.abs(d.x) > 1e-9 && !kollidiert(h, nurX, r)) return nurX;
  const nurY = { x: von.x, y: von.y + d.y };
  if (Math.abs(d.y) > 1e-9 && !kollidiert(h, nurY, r)) return nurY;
  return von;
}

/** Start of the walk-through: label point of the given room, else of the largest room, else the origin. */
export function startPunkt(p: Projekt, raumId?: string | null): Punkt {
  const km = knotenMap(p);
  const r = p.raeume.find((x) => x.id === raumId) ?? [...p.raeume].sort((a, b) => b.flaeche - a.flaeche)[0];
  return r ? beschriftungsPunkt(raumPolygon(p, r.knoten, km)) : { x: 0, y: 0 };
}
