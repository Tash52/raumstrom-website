// Polygon helpers (pure): area, perimeter, centroid, point-in-polygon, inward offset, label point.
import { type Punkt, EPS, abstand, minus, normale, normiert, plus, mal, schnittGeraden } from './vektor.ts';

/** Signed area (shoelace). In plan coordinates (y down) a clockwise-looking polygon is positive. */
export function vorzeichenFlaeche(pkt: readonly Punkt[]): number {
  let s = 0;
  for (let i = 0; i < pkt.length; i++) {
    const a = pkt[i]!;
    const b = pkt[(i + 1) % pkt.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export const flaeche = (pkt: readonly Punkt[]): number => Math.abs(vorzeichenFlaeche(pkt));

export function umfang(pkt: readonly Punkt[]): number {
  let u = 0;
  for (let i = 0; i < pkt.length; i++) u += abstand(pkt[i]!, pkt[(i + 1) % pkt.length]!);
  return u;
}

export function schwerpunkt(pkt: readonly Punkt[]): Punkt {
  const a = vorzeichenFlaeche(pkt);
  if (Math.abs(a) < EPS) {
    const n = Math.max(1, pkt.length);
    return { x: pkt.reduce((s, p) => s + p.x, 0) / n, y: pkt.reduce((s, p) => s + p.y, 0) / n };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pkt.length; i++) {
    const p = pkt[i]!;
    const q = pkt[(i + 1) % pkt.length]!;
    const f = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** Even-odd rule. Points exactly on the border count as inside or outside (undefined). */
export function punktImPolygon(p: Punkt, pkt: readonly Punkt[]): boolean {
  let innen = false;
  for (let i = 0, j = pkt.length - 1; i < pkt.length; j = i++) {
    const a = pkt[i]!;
    const b = pkt[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) innen = !innen;
  }
  return innen;
}

/** Make the polygon orientation positive (vorzeichenFlaeche > 0). */
export function positivOrientiert<T extends Punkt>(pkt: readonly T[]): T[] {
  return vorzeichenFlaeche(pkt) < 0 ? [...pkt].reverse() : [...pkt];
}

/**
 * Inward offset with a separate distance per edge (edge i runs from point i to point i+1),
 * mitred corners. Used for the clear (net) room area: centre-line polygon minus half the wall thickness.
 * Works for simple polygons whose offset does not change topology (normal rooms).
 */
export function einruecken(pkt: readonly Punkt[], abstaende: readonly number[]): Punkt[] {
  const n = pkt.length;
  if (n < 3) return [...pkt];
  // inward normal: for a positively oriented polygon (y down, shoelace > 0) the interior lies to the
  // left of each edge in maths orientation, i.e. along normale(richtung).
  const sign = vorzeichenFlaeche(pkt) > 0 ? 1 : -1;
  const linien = pkt.map((a, i) => {
    const b = pkt[(i + 1) % n]!;
    const r = normiert(minus(b, a));
    const nrm = mal(normale(r), sign);
    const d = abstaende[i] ?? 0;
    return { p: plus(a, mal(nrm, d)), r, nrm, d };
  });
  return pkt.map((ecke, i) => {
    const vorher = linien[(i - 1 + n) % n]!;
    const nachher = linien[i]!;
    const s = schnittGeraden(vorher.p, vorher.r, nachher.p, nachher.r);
    if (s) return s;
    // parallel (collinear edges, e.g. a wall split by a T-junction): shift the corner along the normal
    return plus(ecke, mal(nachher.nrm, (vorher.d + nachher.d) / 2));
  });
}

/**
 * A point well inside the polygon for the room label: the centroid if it is inside,
 * otherwise the middle of the widest inside interval on the horizontal line through the centroid.
 */
export function beschriftungsPunkt(pkt: readonly Punkt[]): Punkt {
  const c = schwerpunkt(pkt);
  if (punktImPolygon(c, pkt)) return c;
  const xs: number[] = [];
  for (let i = 0; i < pkt.length; i++) {
    const a = pkt[i]!;
    const b = pkt[(i + 1) % pkt.length]!;
    if (a.y > c.y !== b.y > c.y) xs.push(a.x + ((c.y - a.y) * (b.x - a.x)) / (b.y - a.y));
  }
  xs.sort((p, q) => p - q);
  let best: Punkt = pkt[0] ?? c;
  let breite = -1;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const w = xs[i + 1]! - xs[i]!;
    if (w > breite) {
      breite = w;
      best = { x: (xs[i]! + xs[i + 1]!) / 2, y: c.y };
    }
  }
  return best;
}

/** Axis-aligned bounding box. */
export function grenzen(pkt: readonly Punkt[]): { min: Punkt; max: Punkt } {
  if (!pkt.length) return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pkt) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}
