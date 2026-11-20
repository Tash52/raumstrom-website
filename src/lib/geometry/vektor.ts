// 2D vector helpers for the planner (pure, no three.js). Plan coordinates in metres:
// x to the right, y downwards (same orientation as the screen and the uploaded floor plan).

export interface Punkt {
  x: number;
  y: number;
}

export const EPS = 1e-9;

export const punkt = (x: number, y: number): Punkt => ({ x, y });
export const plus = (a: Punkt, b: Punkt): Punkt => ({ x: a.x + b.x, y: a.y + b.y });
export const minus = (a: Punkt, b: Punkt): Punkt => ({ x: a.x - b.x, y: a.y - b.y });
export const mal = (a: Punkt, f: number): Punkt => ({ x: a.x * f, y: a.y * f });
export const skalar = (a: Punkt, b: Punkt): number => a.x * b.x + a.y * b.y;
export const kreuz = (a: Punkt, b: Punkt): number => a.x * b.y - a.y * b.x;
export const laenge = (a: Punkt): number => Math.hypot(a.x, a.y);
export const abstand = (a: Punkt, b: Punkt): number => Math.hypot(a.x - b.x, a.y - b.y);
export const winkel = (a: Punkt): number => Math.atan2(a.y, a.x);
export const ausWinkel = (w: number, l = 1): Punkt => ({ x: Math.cos(w) * l, y: Math.sin(w) * l });
export const gleich = (a: Punkt, b: Punkt, tol = 1e-6): boolean => abstand(a, b) <= tol;

export function normiert(a: Punkt): Punkt {
  const l = laenge(a);
  return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** Left normal in plan coordinates (rotated +90° in maths orientation). */
export const normale = (a: Punkt): Punkt => ({ x: -a.y, y: a.x });

export const lerp = (a: Punkt, b: Punkt, t: number): Punkt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Round to a step (metres). Avoids -0 and float noise like 3.4500000001. */
export function runde(wert: number, schritt = 0.001): number {
  const r = Math.round(wert / schritt) * schritt;
  const stellen = Math.max(0, Math.ceil(-Math.log10(schritt)) + 1);
  const n = Number(r.toFixed(stellen));
  return n === 0 ? 0 : n;
}

export const rundePunkt = (p: Punkt, schritt = 0.001): Punkt => ({ x: runde(p.x, schritt), y: runde(p.y, schritt) });

/** Projection of p onto segment a-b: parameter t in [0,1], the closest point and its distance. */
export function projiziere(p: Punkt, a: Punkt, b: Punkt): { t: number; punkt: Punkt; abstand: number } {
  const ab = minus(b, a);
  const l2 = skalar(ab, ab);
  const t = l2 < EPS ? 0 : Math.max(0, Math.min(1, skalar(minus(p, a), ab) / l2));
  const q = lerp(a, b, t);
  return { t, punkt: q, abstand: abstand(p, q) };
}

/**
 * Intersection of the segments p1-p2 and q1-q2. Returns the parameters along both segments,
 * or null for parallel / disjoint segments.
 */
export function schnittStrecken(p1: Punkt, p2: Punkt, q1: Punkt, q2: Punkt): { t: number; u: number; punkt: Punkt } | null {
  const r = minus(p2, p1);
  const s = minus(q2, q1);
  const nenner = kreuz(r, s);
  if (Math.abs(nenner) < EPS) return null;
  const qp = minus(q1, p1);
  const t = kreuz(qp, s) / nenner;
  const u = kreuz(qp, r) / nenner;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return { t, u, punkt: plus(p1, mal(r, t)) };
}

/** Intersection of the ray origin + t·richtung (t ≥ 0) with segment a-b. */
export function schnittStrahl(origin: Punkt, richtung: Punkt, a: Punkt, b: Punkt): { t: number; u: number; punkt: Punkt } | null {
  const s = minus(b, a);
  const nenner = kreuz(richtung, s);
  if (Math.abs(nenner) < EPS) return null;
  const qp = minus(a, origin);
  const t = kreuz(qp, s) / nenner;
  const u = kreuz(qp, richtung) / nenner;
  if (t < 0 || u < -EPS || u > 1 + EPS) return null;
  return { t, u, punkt: plus(origin, mal(richtung, t)) };
}

/** Intersection of two infinite lines (point + direction), null when parallel. */
export function schnittGeraden(p: Punkt, r: Punkt, q: Punkt, s: Punkt): Punkt | null {
  const nenner = kreuz(r, s);
  if (Math.abs(nenner) < 1e-12) return null;
  const t = kreuz(minus(q, p), s) / nenner;
  return plus(p, mal(r, t));
}
