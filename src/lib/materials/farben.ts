// Colour helpers and curated palettes for the planner (pure TS, no DOM).
// All names are our own, neutral descriptions. No protected colour-system or brand names
// (no RAL, NCS, Pantone or manufacturer names), see Briefing 7.2/7.3.

export interface Farbe {
  name: string;
  /** #rrggbb (lower case) */
  hex: string;
}

export interface Palette {
  id: string;
  name: string;
  farben: readonly Farbe[];
}

export const PALETTEN: readonly Palette[] = [
  {
    id: 'hell',
    name: 'Hell und ruhig',
    farben: [
      { name: 'Kalkweiß', hex: '#f4f1ea' },
      { name: 'Haferweiß', hex: '#ede7dc' },
      { name: 'Leinen', hex: '#e6ddcc' },
      { name: 'Nebelgrau', hex: '#d9d8d2' },
      { name: 'Muschel', hex: '#ebe0d6' },
      { name: 'Papyrus', hex: '#efe8d4' },
    ],
  },
  {
    id: 'warm',
    name: 'Warm und erdig',
    farben: [
      { name: 'Sandstein', hex: '#cdbfaa' },
      { name: 'Terrakotta hell', hex: '#d4a38a' },
      { name: 'Lehmrot', hex: '#a8644a' },
      { name: 'Karamell', hex: '#b98a5e' },
      { name: 'Ocker mild', hex: '#c9a45c' },
      { name: 'Zimtbraun', hex: '#7e5a44' },
    ],
  },
  {
    id: 'natur',
    name: 'Grün und Natur',
    farben: [
      { name: 'Salbei', hex: '#a9b49a' },
      { name: 'Moosschatten', hex: '#8a8f78' },
      { name: 'Olivhain', hex: '#6f7350' },
      { name: 'Eukalyptus', hex: '#9fb1a5' },
      { name: 'Waldtief', hex: '#3f5246' },
      { name: 'Pistazie hell', hex: '#cdd3b0' },
    ],
  },
  {
    id: 'kuehl',
    name: 'Blau und kühl',
    farben: [
      { name: 'Himmelsdunst', hex: '#c9d5dc' },
      { name: 'Taubenblau', hex: '#8fa3b0' },
      { name: 'Fjordblau', hex: '#5d7686' },
      { name: 'Nachtblau', hex: '#2f3e4e' },
      { name: 'Eisgrau', hex: '#dfe3e2' },
      { name: 'Schieferblau', hex: '#4c5a66' },
    ],
  },
  {
    id: 'tief',
    name: 'Dunkel und tief',
    farben: [
      { name: 'Anthrazit warm', hex: '#3d3a37' },
      { name: 'Graphitgrau', hex: '#4a4d50' },
      { name: 'Aubergine', hex: '#4e3a45' },
      { name: 'Tannengrün', hex: '#2f4038' },
      { name: 'Mokka', hex: '#5a4638' },
      { name: 'Tintenblau', hex: '#27313d' },
    ],
  },
];

/** Wood tones for floors, skirting, cladding and doors. */
export const HOLZTOENE: readonly Farbe[] = [
  { name: 'Eiche hell', hex: '#c9ae86' },
  { name: 'Eiche natur', hex: '#b08d62' },
  { name: 'Eiche geräuchert', hex: '#7a5c42' },
  { name: 'Esche weiß geölt', hex: '#ddd0bb' },
  { name: 'Nussbaum', hex: '#6b4a35' },
  { name: 'Ahorn', hex: '#dcc49c' },
];

/** Grout colours. */
export const FUGENFARBEN: readonly Farbe[] = [
  { name: 'Weiß', hex: '#f2f0eb' },
  { name: 'Silbergrau', hex: '#c4c2bd' },
  { name: 'Zementgrau', hex: '#8f8d88' },
  { name: 'Anthrazit', hex: '#45464a' },
  { name: 'Sand', hex: '#d8cfbf' },
];

const HEX = /^#([0-9a-f]{6})$/i;

export function istHex(s: unknown): s is string {
  return typeof s === 'string' && HEX.test(s);
}

/** Normalised #rrggbb or null. Accepts #RGB and #RRGGBB. */
export function normHex(s: string): string | null {
  const t = s.trim();
  if (/^#[0-9a-f]{3}$/i.test(t)) return `#${[...t.slice(1)].map((c) => c + c).join('')}`.toLowerCase();
  return HEX.test(t) ? t.toLowerCase() : null;
}

export function hexZuRgb(hex: string): [number, number, number] {
  const n = Number.parseInt((normHex(hex) ?? '#000000').slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbZuHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix two colours (t = 0: a, t = 1: b). */
export function mische(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexZuRgb(a);
  const [r2, g2, b2] = hexZuRgb(b);
  return rgbZuHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Lighten (f > 0) or darken (f < 0) towards white/black. */
export function helligkeit(hex: string, f: number): string {
  return f >= 0 ? mische(hex, '#ffffff', f) : mische(hex, '#000000', -f);
}

/** Relative luminance (WCAG 2.x). */
export function luminanz(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexZuRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function kontrast(a: string, b: string): number {
  const [h, d] = [luminanz(a), luminanz(b)].sort((x, y) => y - x) as [number, number];
  return (h + 0.05) / (d + 0.05);
}

/** Name of a palette colour or wood tone with exactly this hex, else null. */
export function farbName(hex: string): string | null {
  const h = normHex(hex);
  if (!h) return null;
  for (const p of PALETTEN) for (const f of p.farben) if (f.hex === h) return f.name;
  for (const f of [...HOLZTOENE, ...FUGENFARBEN]) if (f.hex === h) return f.name;
  return null;
}
