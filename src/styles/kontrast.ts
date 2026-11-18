// WCAG 2.2 contrast helpers and the list of semantic colour pairs that must pass.
// Used by tests/unit/contrast.test.ts and the /styleguide/ page (single source).

export type Kontext = 'hell' | 'dunkel';

export interface KontrastPaar {
  vorne: string; // semantic token (text, icon, border)
  hinten: string; // semantic token (surface)
  kontext: Kontext;
  min: 4.5 | 3;
  zweck: string;
}

const text = (vorne: string, zweck: string): Array<Omit<KontrastPaar, 'kontext'>> => [
  { vorne, hinten: '--surface', min: 4.5, zweck: `${zweck} auf Grundfläche` },
  { vorne, hinten: '--surface-2', min: 4.5, zweck: `${zweck} auf Zweitfläche` },
];

const proKontext: Array<Omit<KontrastPaar, 'kontext'>> = [
  ...text('--text', 'Text'),
  ...text('--text-muted', 'Gedämpfter Text'),
  ...text('--accent-text', 'Grüne Schrift / Links'),
  ...text('--error', 'Fehlermeldung'),
  { vorne: '--text', hinten: '--surface-field', min: 4.5, zweck: 'Eingabe im Feld' },
  { vorne: '--text-muted', hinten: '--surface-field', min: 4.5, zweck: 'Platzhalter / Hinweis im Feld' },
  { vorne: '--line-strong', hinten: '--surface', min: 3, zweck: 'Feldrahmen (Nicht-Text-Kontrast)' },
  { vorne: '--line-strong', hinten: '--surface-field', min: 3, zweck: 'Feldrahmen innen' },
  { vorne: '--focus', hinten: '--surface', min: 3, zweck: 'Fokusring' },
  { vorne: '--leitung', hinten: '--surface', min: 3, zweck: 'Leitung / Knoten (Grafik)' },
  { vorne: '--button-text', hinten: '--button-bg', min: 4.5, zweck: 'Primär-Button' },
  { vorne: '--on-accent', hinten: '--accent-surface', min: 4.5, zweck: 'Text auf Strom-Fläche' },
  { vorne: '--button-bg', hinten: '--surface', min: 3, zweck: 'Primär-Button-Fläche zur Umgebung' },
];

export const KONTRAST_PAARE: KontrastPaar[] = (['hell', 'dunkel'] as const).flatMap((kontext) =>
  proKontext.map((p) => ({ ...p, kontext })),
);

/** Text tokens: on light ground none of them may resolve to Strom (#C5F01E). */
export const TEXT_TOKENS = ['--text', '--text-muted', '--accent-text', '--error', '--button-text', '--on-accent'];

function channel(c: number) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminanz(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Keine 6-stellige Hex-Farbe: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function kontrast(a: string, b: string): number {
  const [hi, lo] = [luminanz(a), luminanz(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Declarations of the first rule whose selector list starts with `selector`. */
function block(css: string, selector: string): Record<string, string> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = new RegExp(`(^|\\})\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[,{]`, 'm');
  const m = re.exec(clean);
  if (!m) throw new Error(`Selektor ${selector} fehlt in tokens.css`);
  const start = clean.indexOf('{', m.index + m[0].length - 1);
  const end = clean.indexOf('}', start);
  const decls: Record<string, string> = {};
  for (const d of clean.slice(start + 1, end).split(';')) {
    const i = d.indexOf(':');
    if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim();
  }
  return decls;
}

/** Resolves the semantic tokens for a context to hex values (follows var() chains, no fallbacks). */
export function tokenWerte(css: string, kontext: Kontext): Record<string, string> {
  const root = block(css, ':root');
  const scope = kontext === 'dunkel' ? { ...root, ...block(css, '.flaeche-graphit') } : root;
  const resolve = (name: string, depth = 0): string => {
    const v = scope[name];
    if (v === undefined) throw new Error(`Token ${name} fehlt`);
    const ref = /^var\((--[a-z0-9-]+)\)$/i.exec(v);
    if (ref) {
      if (depth > 8) throw new Error(`Zyklus bei ${name}`);
      return resolve(ref[1]!, depth + 1);
    }
    return v.toLowerCase();
  };
  return Object.fromEntries(Object.keys(scope).filter((k) => k.startsWith('--')).map((k) => [k, resolve(k)]));
}

export function pruefePaare(css: string) {
  const werte = { hell: tokenWerte(css, 'hell'), dunkel: tokenWerte(css, 'dunkel') };
  return KONTRAST_PAARE.map((p) => {
    const vorne = werte[p.kontext][p.vorne]!;
    const hinten = werte[p.kontext][p.hinten]!;
    const ratio = /^#[0-9a-f]{6}$/.test(vorne) && /^#[0-9a-f]{6}$/.test(hinten) ? kontrast(vorne, hinten) : NaN;
    return { ...p, vorneHex: vorne, hintenHex: hinten, ratio, ok: ratio >= p.min };
  });
}
