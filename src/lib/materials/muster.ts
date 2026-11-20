// Tile and plank formats, laying patterns and their periodic repeat cell (pure TS, no DOM).
// A pattern is a lattice (two translation vectors) plus a motif (stones in one lattice cell).
// The repeat cell is an axis-aligned rectangle whose sides are lattice vectors, so a texture drawn
// for that cell tiles seamlessly (RepeatWrapping, wall/floor UVs in metres).
// Units: metres. Cell coordinates: x to the right, y down (canvas convention).

export interface P {
  x: number;
  y: number;
}

export interface Format {
  id: string;
  name: string;
  /** Long side (metres). Hexagon: distance across corners. */
  laenge: number;
  /** Short side (metres). Hexagon: equal to laenge. */
  breite: number;
  form: 'rechteck' | 'hexagon';
  /** Typical use, for the UI filter. */
  fuer: 'fliese' | 'diele';
}

export const FORMATE: readonly Format[] = [
  { id: '30x60', name: '30 × 60 cm', laenge: 0.6, breite: 0.3, form: 'rechteck', fuer: 'fliese' },
  { id: '60x60', name: '60 × 60 cm', laenge: 0.6, breite: 0.6, form: 'rechteck', fuer: 'fliese' },
  { id: '60x120', name: '60 × 120 cm', laenge: 1.2, breite: 0.6, form: 'rechteck', fuer: 'fliese' },
  { id: '120x120', name: '120 × 120 cm', laenge: 1.2, breite: 1.2, form: 'rechteck', fuer: 'fliese' },
  { id: 'metro-7-5x15', name: '7,5 × 15 cm Metro', laenge: 0.15, breite: 0.075, form: 'rechteck', fuer: 'fliese' },
  { id: 'hexagon', name: 'Hexagon (ca. 20 cm)', laenge: 0.2, breite: 0.2, form: 'hexagon', fuer: 'fliese' },
  { id: 'mosaik', name: 'Mosaik 2,5 × 2,5 cm', laenge: 0.025, breite: 0.025, form: 'rechteck', fuer: 'fliese' },
  { id: 'zellige', name: 'Zellige-Optik 10 × 10 cm', laenge: 0.1, breite: 0.1, form: 'rechteck', fuer: 'fliese' },
  { id: 'diele-lang', name: 'Landhausdiele 190 × 19 cm', laenge: 1.9, breite: 0.19, form: 'rechteck', fuer: 'diele' },
  { id: 'diele', name: 'Diele 122 × 18 cm', laenge: 1.22, breite: 0.18, form: 'rechteck', fuer: 'diele' },
  { id: 'stab', name: 'Stab 60 × 10 cm', laenge: 0.6, breite: 0.1, form: 'rechteck', fuer: 'diele' },
];

export interface Muster {
  id: string;
  name: string;
  /** Allowed for floors only (Landhausdiele). */
  nurBoden?: boolean;
}

export const MUSTER: readonly Muster[] = [
  { id: 'halbverband', name: 'Halbverband' },
  { id: 'drittelverband', name: 'Drittelverband' },
  { id: 'kreuzfuge', name: 'Kreuzfuge' },
  { id: 'diagonal', name: 'Diagonal' },
  { id: 'fischgraet', name: 'Fischgrät' },
  { id: 'chevron', name: 'Chevron' },
  { id: 'vertikal-gestapelt', name: 'Vertikal gestapelt' },
  { id: 'landhausdiele', name: 'Landhausdiele (wilder Verband)', nurBoden: true },
];

export const formatVon = (id: string | undefined): Format | undefined => FORMATE.find((f) => f.id === id);
export const musterVon = (id: string | undefined): Muster | undefined => MUSTER.find((m) => m.id === id);

export interface Stein {
  punkte: P[];
  /** Stable index for colour variation; equal for copies of the same stone across the cell border. */
  schluessel: number;
  /** Direction of the stone's long axis in degrees (0 = along x), for wood grain. */
  richtungGrad: number;
}

export interface MusterZelle {
  breite: number;
  hoehe: number;
  steine: Stein[];
  /** Extra rotation of the whole pattern in degrees (e.g. 45 for Diagonal and Fischgrät). */
  drehungGrad: number;
}

interface Gitter {
  a: P;
  b: P;
  motiv: Array<{ punkte: P[]; richtungGrad: number }>;
  breite: number;
  hoehe: number;
  drehungGrad: number;
}

const rechteck = (x: number, y: number, b: number, h: number): P[] => [
  { x, y },
  { x: x + b, y },
  { x: x + b, y: y + h },
  { x, y: y + h },
];

const LANDHAUS_VERSATZ = [0, 0.42, 0.77, 0.18, 0.6];

/** Lattice for a pattern and format. Unknown patterns fall back to Halbverband, hexagons always lay as honeycomb. */
function gitter(musterId: string, f: Format): Gitter {
  const L = f.laenge;
  const W = f.breite;
  if (f.form === 'hexagon') {
    const R = L / 2;
    const s3 = Math.sqrt(3);
    const hex = Array.from({ length: 6 }, (_, k) => {
      const w = ((30 + 60 * k) * Math.PI) / 180;
      return { x: R * Math.cos(w), y: R * Math.sin(w) };
    });
    return { a: { x: s3 * R, y: 0 }, b: { x: (s3 * R) / 2, y: 1.5 * R }, motiv: [{ punkte: hex, richtungGrad: 0 }], breite: s3 * R, hoehe: 3 * R, drehungGrad: 0 };
  }
  switch (musterId) {
    case 'kreuzfuge':
    case 'diagonal':
      return { a: { x: L, y: 0 }, b: { x: 0, y: W }, motiv: [{ punkte: rechteck(0, 0, L, W), richtungGrad: 0 }], breite: L, hoehe: W, drehungGrad: musterId === 'diagonal' ? 45 : 0 };
    case 'vertikal-gestapelt':
      return { a: { x: W, y: 0 }, b: { x: 0, y: L }, motiv: [{ punkte: rechteck(0, 0, W, L), richtungGrad: 90 }], breite: W, hoehe: L, drehungGrad: 0 };
    case 'drittelverband':
      return { a: { x: L, y: 0 }, b: { x: L / 3, y: W }, motiv: [{ punkte: rechteck(0, 0, L, W), richtungGrad: 0 }], breite: L, hoehe: 3 * W, drehungGrad: 0 };
    case 'landhausdiele':
      return {
        a: { x: L, y: 0 },
        b: { x: 0, y: LANDHAUS_VERSATZ.length * W },
        motiv: LANDHAUS_VERSATZ.map((o, j) => ({ punkte: rechteck(o * L, j * W, L, W), richtungGrad: 0 })),
        breite: L,
        hoehe: LANDHAUS_VERSATZ.length * W,
        drehungGrad: 0,
      };
    case 'fischgraet': {
      // ratio rounded to an integer multiple of the width, so the 2L x 2L cell is a lattice rectangle
      const r = Math.max(2, Math.round(L / W));
      const l = r * W;
      return {
        a: { x: W, y: W },
        b: { x: l, y: -l },
        motiv: [
          { punkte: rechteck(0, 0, l, W), richtungGrad: 0 },
          { punkte: rechteck(0, W, W, l), richtungGrad: 90 },
        ],
        breite: 2 * l,
        hoehe: 2 * l,
        drehungGrad: 45,
      };
    }
    case 'chevron': {
      const s = L / Math.SQRT2;
      const h = W * Math.SQRT2;
      return {
        a: { x: 2 * s, y: 0 },
        b: { x: 0, y: h },
        motiv: [
          { punkte: [{ x: 0, y: 0 }, { x: s, y: s }, { x: s, y: s + h }, { x: 0, y: h }], richtungGrad: 45 },
          { punkte: [{ x: s, y: s }, { x: 2 * s, y: 0 }, { x: 2 * s, y: h }, { x: s, y: s + h }], richtungGrad: -45 },
        ],
        breite: 2 * s,
        hoehe: h,
        drehungGrad: 0,
      };
    }
    default:
      return { a: { x: L, y: 0 }, b: { x: L / 2, y: W }, motiv: [{ punkte: rechteck(0, 0, L, W), richtungGrad: 0 }], breite: L, hoehe: 2 * W, drehungGrad: 0 };
  }
}

const mod = (a: number, m: number) => ((a % m) + m) % m;

function hash(...n: number[]): number {
  let h = 2166136261;
  for (const x of n) {
    h ^= Math.round(x * 1000) | 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Repeat cell of a pattern. `mindestGroesse` (metres) enlarges the cell by whole repeats, so colour
 * variation repeats less visibly; `maxGroesse` limits that (texture size).
 */
export function musterZelle(musterId: string, format: Format, mindestGroesse = 0, maxGroesse = 2.5): MusterZelle {
  const g = gitter(musterId, format);
  const nx = Math.max(1, Math.min(Math.floor(maxGroesse / g.breite) || 1, Math.ceil(mindestGroesse / g.breite)));
  const ny = Math.max(1, Math.min(Math.floor(maxGroesse / g.hoehe) || 1, Math.ceil(mindestGroesse / g.hoehe)));
  const breite = g.breite * nx;
  const hoehe = g.hoehe * ny;
  const steine: Stein[] = [];
  // enough lattice translations to cover the cell (motif can stick out of its lattice cell)
  const ausdehnung = Math.max(...g.motiv.flatMap((m) => m.punkte.map((q) => Math.hypot(q.x, q.y))));
  const kurz = Math.min(Math.hypot(g.a.x, g.a.y), Math.hypot(g.b.x, g.b.y));
  const n = Math.ceil((Math.hypot(breite, hoehe) + 2 * ausdehnung) / kurz) + 2;
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const t = { x: i * g.a.x + j * g.b.x, y: i * g.a.y + j * g.b.y };
      g.motiv.forEach((m, k) => {
        const punkte = m.punkte.map((q) => ({ x: q.x + t.x, y: q.y + t.y }));
        const xs = punkte.map((q) => q.x);
        const ys = punkte.map((q) => q.y);
        if (Math.max(...xs) <= 1e-9 || Math.min(...xs) >= breite - 1e-9 || Math.max(...ys) <= 1e-9 || Math.min(...ys) >= hoehe - 1e-9) return;
        steine.push({ punkte, schluessel: hash(k, mod(t.x, breite), mod(t.y, hoehe)), richtungGrad: m.richtungGrad });
      });
    }
  }
  return { breite, hoehe, steine, drehungGrad: g.drehungGrad };
}

/** Point in polygon (even-odd), for tests and picking. */
export function imPolygon(q: P, poly: readonly P[]): boolean {
  let innen = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) innen = !innen;
  }
  return innen;
}

/** Deterministic pseudo random number in [0, 1) from a key (colour variation, wood grain). */
export function zufall(schluessel: number, salz = 0): number {
  let x = (schluessel ^ Math.imul(salz + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
