// Snapping for the wall editor (pure). Priority: wall end nodes (magnetic docking) > the snapped
// 45°/90° direction meeting a wall > 45°/90° direction with rounded length > wall centre line > grid.
import { type Punkt, abstand, ausWinkel, minus, plus, mal, projiziere, runde, rundePunkt, schnittStrahl, skalar } from './vektor.ts';

export type FangArt = 'knoten' | 'wand' | 'winkel' | 'raster' | 'frei';

export interface FangSegment {
  id: string;
  a: Punkt;
  b: Punkt;
}

export interface FangKontext {
  /** Start of the wall being drawn (null: placing the first point). */
  start: Punkt | null;
  knoten: readonly (Punkt & { id: string })[];
  segmente: readonly FangSegment[];
  /** Capture radius in metres (screen pixels divided by zoom). */
  radius: number;
  /** Snap the direction to multiples of 45° (includes 90°). */
  winkelFang: boolean;
  /** Grid / length step in metres, null = off (then 1 cm). */
  raster: number | null;
  /** Node ids to ignore (e.g. the node being dragged). */
  ohneKnoten?: ReadonlySet<string>;
  /** Wall ids to ignore (e.g. walls attached to the dragged node). */
  ohneWaende?: ReadonlySet<string>;
}

export interface FangErgebnis {
  punkt: Punkt;
  art: FangArt;
  knotenId?: string;
  wandId?: string;
  /** Snapped direction in degrees (0 = right, 90 = down), when drawing from a start point. */
  winkelGrad?: number;
  /** Length from the start point in metres. */
  laenge?: number;
}

const GRAD = Math.PI / 180;
export const WINKEL_SCHRITT = 45;

/** Snap an angle (radians) to the nearest multiple of `schrittGrad`. */
export function rasterWinkel(w: number, schrittGrad = WINKEL_SCHRITT): number {
  const s = schrittGrad * GRAD;
  return Math.round(w / s) * s;
}

/** Normalised degrees 0..359 for display. */
export function grad(w: number): number {
  const g = Math.round(w / GRAD) % 360;
  return g < 0 ? g + 360 : g;
}

function mitLaenge(e: FangErgebnis, start: Punkt | null): FangErgebnis {
  if (!start) return e;
  const d = minus(e.punkt, start);
  return { ...e, laenge: runde(Math.hypot(d.x, d.y), 0.001), winkelGrad: e.winkelGrad ?? grad(Math.atan2(d.y, d.x)) };
}

export function fangePunkt(roh: Punkt, ctx: FangKontext): FangErgebnis {
  const { start, radius } = ctx;
  const schritt = ctx.raster ?? 0.01;

  // 1. magnetic docking to wall end nodes
  let knoten: (Punkt & { id: string }) | undefined;
  let dk = radius;
  for (const k of ctx.knoten) {
    if (ctx.ohneKnoten?.has(k.id)) continue;
    const d = abstand(k, roh);
    if (d <= dk && !(start && abstand(k, start) < 1e-6)) {
      dk = d;
      knoten = k;
    }
  }
  if (knoten) return mitLaenge({ punkt: { x: knoten.x, y: knoten.y }, art: 'knoten', knotenId: knoten.id }, start);

  const segmente = ctx.segmente.filter((s) => !ctx.ohneWaende?.has(s.id));

  // 2./3. direction snapping from the start point
  if (start && ctx.winkelFang) {
    const d = minus(roh, start);
    if (Math.hypot(d.x, d.y) > 1e-6) {
      const w = rasterWinkel(Math.atan2(d.y, d.x));
      const r = ausWinkel(w);
      // the snapped direction meets a wall near the pointer: end exactly on that wall
      let treffer: { punkt: Punkt; wandId: string; d: number } | undefined;
      for (const s of segmente) {
        const x = schnittStrahl(start, r, s.a, s.b);
        if (!x || x.t < 1e-3) continue;
        const dd = abstand(x.punkt, roh);
        if (dd <= radius && (!treffer || dd < treffer.d)) treffer = { punkt: x.punkt, wandId: s.id, d: dd };
      }
      if (treffer) return mitLaenge({ punkt: rundePunkt(treffer.punkt), art: 'wand', wandId: treffer.wandId, winkelGrad: grad(w) }, start);
      const l = Math.max(schritt, runde(skalar(d, r), schritt));
      return mitLaenge({ punkt: rundePunkt(plus(start, mal(r, l))), art: 'winkel', winkelGrad: grad(w) }, start);
    }
  }

  // 4. onto a wall centre line (T-junction)
  let wand: { punkt: Punkt; id: string; d: number } | undefined;
  for (const s of segmente) {
    const pr = projiziere(roh, s.a, s.b);
    if (pr.abstand <= radius && (!wand || pr.abstand < wand.d)) wand = { punkt: pr.punkt, id: s.id, d: pr.abstand };
  }
  if (wand) return mitLaenge({ punkt: rundePunkt(wand.punkt), art: 'wand', wandId: wand.id }, start);

  // 5. grid
  if (ctx.raster) return mitLaenge({ punkt: { x: runde(roh.x, ctx.raster), y: runde(roh.y, ctx.raster) }, art: 'raster' }, start);
  return mitLaenge({ punkt: rundePunkt(roh, 0.001), art: 'frei' }, start);
}

/** End point for a typed length: from `start` in the direction of `richtungsPunkt` (snapped if winkelFang). */
export function punktMitLaenge(start: Punkt, richtungsPunkt: Punkt, laenge: number, winkelFang: boolean): Punkt {
  const d = minus(richtungsPunkt, start);
  let w = Math.hypot(d.x, d.y) < 1e-9 ? 0 : Math.atan2(d.y, d.x);
  if (winkelFang) w = rasterWinkel(w);
  return rundePunkt(plus(start, ausWinkel(w, laenge)));
}
