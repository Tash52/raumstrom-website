// Pure model of the "Hinter der Wand" hero (no three.js import, unit-tested):
// opening stages, scroll mapping and the masonry layout including the cable channel (Schlitz).

export const STUFEN = ['farbe', 'putz', 'mauerwerk', 'leitung', 'dose'] as const;
export type Stufe = (typeof STUFEN)[number];
export type HeroZustand = Record<Stufe, number>;

/** Stage windows on the overall opening progress p (0 = closed wall, 1 = socket live). Overlapping on purpose. */
export const FENSTER: Record<Stufe, [number, number]> = {
  farbe: [0, 0.75],
  putz: [0.1, 0.75],
  mauerwerk: [0.3, 0.8],
  leitung: [0.35, 0.92],
  dose: [0.88, 1],
};

/** Start state at scroll 0. The poster image shows exactly this state, so the 3D swap is seamless. */
export const P_START = 0.5;

export function glatt(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function heroZustand(p: number): HeroZustand {
  const z = {} as HeroZustand;
  for (const s of STUFEN) z[s] = glatt(FENSTER[s][0], FENSTER[s][1], p);
  return z;
}

/** Scroll progress of the hero (0 at top, 1 when scrolled through) to opening progress. */
export function fortschrittAusScroll(scroll: number): number {
  const s = Math.min(1, Math.max(0, scroll));
  return P_START + (1 - P_START) * s;
}

/** Index of the stage that is currently "opening" (for the legend), last finished stage otherwise. */
export function aktiveStufe(p: number): number {
  let aktiv = 0;
  STUFEN.forEach((s, i) => {
    if (p >= FENSTER[s][0] + 0.02) aktiv = i;
  });
  return aktiv;
}

// Geometry (world units ≈ metres). Wall in the xy plane, front face towards +z.
export const WAND = { breite: 4.2, hoehe: 3, stein: { l: 0.4, h: 0.18, t: 0.24 }, fuge: 0.025 } as const;

/** Cable path: enters at the left edge, rises in the vertical installation zone, runs to the socket. */
export const KABEL_PUNKTE: ReadonlyArray<readonly [number, number]> = [
  [-2.25, -0.95],
  [-0.65, -0.95],
  [-0.65, 0.55],
  [1.05, 0.55],
];
export const DOSE = { x: 1.05, y: 0.55 } as const;
/** Half width of the cable channel. */
const KANAL = 0.07;

export interface Stein {
  x: number;
  y: number;
  l: number;
  h: number;
  /** Part of the cable channel: lifted out in the "mauerwerk" stage. */
  schlitz: boolean;
  /** 0..1 order along the cable (bricks near the entry leave first). */
  reihenfolge: number;
}

function abstandZuStrecke(px: number, py: number, a: readonly [number, number], b: readonly [number, number]) {
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return { d: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t };
}

const SEGMENT_LAENGEN = KABEL_PUNKTE.slice(1).map((p, i) => Math.hypot(p[0] - KABEL_PUNKTE[i]![0], p[1] - KABEL_PUNKTE[i]![1]));
const KABEL_LAENGE = SEGMENT_LAENGEN.reduce((a, b) => a + b, 0);

/** Distance of a point to the cable and its position along the cable (0..1). */
export function naeheZumKabel(x: number, y: number): { d: number; s: number } {
  let best = { d: Infinity, s: 0 };
  let start = 0;
  for (let i = 0; i < SEGMENT_LAENGEN.length; i++) {
    const { d, t } = abstandZuStrecke(x, y, KABEL_PUNKTE[i]!, KABEL_PUNKTE[i + 1]!);
    if (d < best.d) best = { d, s: (start + t * SEGMENT_LAENGEN[i]!) / KABEL_LAENGE };
    start += SEGMENT_LAENGEN[i]!;
  }
  return best;
}

/** Running bond masonry clipped to the wall; bricks touching the channel or the socket box are marked. */
export function mauerwerk(dichte: 'voll' | 'leicht' = 'voll'): Stein[] {
  const { breite, hoehe, stein, fuge } = WAND;
  // Light variant (small screens): bigger blocks, about half the instances.
  const l = dichte === 'voll' ? stein.l : stein.l * 1.5;
  const h = dichte === 'voll' ? stein.h : stein.h * 1.4;
  const steine: Stein[] = [];
  const reihen = Math.floor(hoehe / (h + fuge));
  const y0 = -hoehe / 2 + (hoehe - reihen * (h + fuge)) / 2 + (h + fuge) / 2;
  for (let r = 0; r < reihen; r++) {
    const y = y0 + r * (h + fuge);
    let x = -breite / 2 - (r % 2 ? l / 2 : 0);
    while (x < breite / 2) {
      const a = Math.max(x, -breite / 2);
      const b = Math.min(x + l, breite / 2);
      if (b - a > 0.06) {
        const cx = (a + b) / 2;
        const len = b - a - fuge;
        // Channel (Schlitz): bricks overlapping a corridor of ±KANAL around the cable (axis-aligned runs).
        const halbe = len / 2;
        let schlitz = false;
        let reihenfolge = 1;
        for (let i = 0; i < KABEL_PUNKTE.length - 1; i++) {
          const [ax, ay] = KABEL_PUNKTE[i]!;
          const [bx, by] = KABEL_PUNKTE[i + 1]!;
          const ueberX = Math.min(cx + halbe, Math.max(ax, bx) + KANAL) - Math.max(cx - halbe, Math.min(ax, bx) - KANAL);
          const ueberY = Math.min(y + h / 2, Math.max(ay, by) + KANAL) - Math.max(y - h / 2, Math.min(ay, by) - KANAL);
          if (ueberX > 0.01 && ueberY > 0.01) {
            schlitz = true;
            const px = Math.max(Math.min(ax, bx), Math.min(Math.max(ax, bx), cx));
            const py = Math.max(Math.min(ay, by), Math.min(Math.max(ay, by), y));
            reihenfolge = Math.min(reihenfolge, naeheZumKabel(px, py).s);
          }
        }
        if (Math.abs(cx - DOSE.x) < 0.2 + halbe && Math.abs(y - DOSE.y) < 0.2 + h / 2) {
          schlitz = true;
          reihenfolge = Math.min(reihenfolge, 1);
        }
        steine.push({ x: cx, y, l: len, h, schlitz, reihenfolge });
      }
      x += l + fuge;
    }
  }
  return steine;
}
