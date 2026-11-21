// Material catalogue of the planner (pure TS). Ids are stored in the project model as MaterialRef.material
// (src/lib/geometry/projekt.ts, katalogIdSchema). The 3D view renders them procedurally (patterns, grout,
// wood grain, wallpaper designs) plus a small set of self-hosted CC0 detail textures (public/textures/).
// Names are neutral descriptions, no brand or colour-system names.
import type { MaterialRef } from '../geometry/projekt.ts';
import { FUGENFARBEN, HOLZTOENE, normHex } from './farben.ts';
import { FORMATE, MUSTER, formatVon, musterVon } from './muster.ts';

export type Kategorie = 'wand' | 'boden' | 'fliesen' | 'decke' | 'sockelleiste' | 'fensterbank';

/**
 * CC0 detail textures (public/textures/<datei>-<px>.webp, 512/256 px plus -vorschau), loaded per category on demand.
 * WebP instead of KTX2: the Basis transcoder needs 'unsafe-eval' (embind), which the strict CSP forbids.
 */
export type Textur = 'holz' | 'marmor' | 'beton' | 'putz';

/** Procedural surface structure drawn into a canvas texture. */
export type Struktur =
  | 'glatt'
  | 'raufaser'
  | 'strukturvlies'
  | 'glasfaser'
  | 'teppich'
  | 'terrazzo'
  | 'akustik'
  | 'paneel'
  | 'holzleisten'
  | 'gipskarton'
  | 'tapete'
  | 'verlegt';

export interface Darstellung {
  rauheit: number;
  metall?: number;
  textur?: Textur;
  /** Strength of the detail texture (0..1). */
  texturStaerke?: number;
  /** Size of one detail texture repeat in metres. */
  texturGroesse?: number;
  struktur: Struktur;
  /** Lightness variation per stone/plank (0..0.3). */
  variation?: number;
  /** Draw wood grain lines on planks. */
  maserung?: boolean;
}

export interface Optionen {
  /** Colour choice: free (wheel + palettes), wood tones, or tile colours. */
  farbe?: 'frei' | 'holz';
  muster?: readonly string[];
  formate?: readonly string[];
  /** Wallpaper designs instead of laying patterns. */
  tapete?: boolean;
  fuge?: boolean;
  richtung?: boolean;
  fliesenhoehe?: boolean;
}

export interface MaterialEintrag {
  id: string;
  name: string;
  kategorien: readonly Kategorie[];
  /** Group heading in the tile selection. */
  gruppe: string;
  standard: Omit<MaterialRef, 'material'>;
  optionen: Optionen;
  darstellung: Darstellung;
  hinweis?: string;
}

export interface Tapete {
  id: string;
  name: string;
}

export const TAPETEN: readonly Tapete[] = [
  { id: 'streifen', name: 'Streifen' },
  { id: 'rauten', name: 'Rauten' },
  { id: 'boegen', name: 'Bögen' },
  { id: 'punkte', name: 'Punkte' },
  { id: 'blaetter', name: 'Blätter' },
];

const FLIESEN_FORMATE = FORMATE.filter((f) => f.fuer === 'fliese').map((f) => f.id);
const FLIESEN_MUSTER = MUSTER.filter((m) => !m.nurBoden).map((m) => m.id);
const DIELEN_MUSTER = ['landhausdiele', 'halbverband', 'drittelverband', 'kreuzfuge', 'fischgraet', 'chevron'] as const;
const FUGE_STANDARD = { farbe: FUGENFARBEN[1]!.hex, breiteMm: 3 };
const HOLZ = HOLZTOENE[0]!.hex;

const farbeWand = (id: string, name: string, rauheit: number, extra: Partial<Darstellung> = {}, hinweis?: string): MaterialEintrag => ({
  id,
  name,
  kategorien: ['wand'],
  gruppe: 'Farbe',
  standard: { farbe: '#f4f1ea' },
  optionen: { farbe: 'frei' },
  darstellung: { rauheit, struktur: 'glatt', ...extra },
  ...(hinweis ? { hinweis } : {}),
});

const putz = (id: string, name: string, farbe: string, d: Partial<Darstellung>): MaterialEintrag => ({
  id,
  name,
  kategorien: ['wand'],
  gruppe: 'Putz',
  standard: { farbe },
  optionen: { farbe: 'frei' },
  darstellung: { rauheit: 0.95, struktur: 'glatt', ...d },
});

const tapete = (id: string, name: string, struktur: Struktur, extra: Partial<MaterialEintrag> = {}): MaterialEintrag => ({
  id,
  name,
  kategorien: ['wand'],
  gruppe: 'Tapete',
  standard: { farbe: '#f2efe8' },
  optionen: { farbe: 'frei' },
  darstellung: { rauheit: 0.95, struktur },
  ...extra,
});

const fliese = (id: string, name: string, farbe: string, d: Partial<Darstellung>): MaterialEintrag => ({
  id,
  name,
  kategorien: ['fliesen', 'boden'],
  gruppe: 'Fliese',
  standard: { farbe, format: '60x60', muster: 'kreuzfuge', fuge: FUGE_STANDARD, fliesenhoehe: 'halbhoch', richtungGrad: 0 },
  optionen: { farbe: 'frei', formate: FLIESEN_FORMATE, muster: FLIESEN_MUSTER, fuge: true, fliesenhoehe: true, richtung: true },
  darstellung: { rauheit: 0.5, struktur: 'verlegt', variation: 0.04, ...d },
});

const diele = (id: string, name: string, gruppe: string, format: string, muster: string, d: Partial<Darstellung>): MaterialEintrag => ({
  id,
  name,
  kategorien: ['boden'],
  gruppe,
  standard: { farbe: HOLZ, format, muster, fuge: { farbe: '#5b4a3a', breiteMm: 0.6 }, richtungGrad: 0 },
  optionen: { farbe: 'holz', muster: DIELEN_MUSTER, richtung: true },
  darstellung: { rauheit: 0.55, struktur: 'verlegt', textur: 'holz', texturStaerke: 0.55, texturGroesse: 1.8, variation: 0.08, maserung: true, ...d },
});

export const MATERIALIEN: readonly MaterialEintrag[] = [
  // ---------- walls: paint ----------
  farbeWand('farbe.matt', 'Wandfarbe matt', 0.92),
  farbeWand('farbe.seidenmatt', 'Wandfarbe seidenmatt', 0.55),
  farbeWand('farbe.akzent', 'Akzentwand', 0.9, {}, 'Für eine einzelne Wandseite: Bereich „Fläche" wählen.'),
  // ---------- walls: wallpaper ----------
  tapete('tapete.raufaser', 'Raufaser', 'raufaser'),
  tapete('tapete.vlies-glatt', 'Vlies glatt', 'glatt', { darstellung: { rauheit: 0.9, struktur: 'glatt', textur: 'putz', texturStaerke: 0.12, texturGroesse: 1 } }),
  tapete('tapete.strukturvlies', 'Strukturvlies', 'strukturvlies'),
  tapete('tapete.glasfaser', 'Glasfaser', 'glasfaser'),
  tapete('tapete.muster', 'Mustertapete', 'tapete', {
    standard: { farbe: '#e6ddcc', muster: 'streifen' },
    optionen: { farbe: 'frei', tapete: true },
  }),
  // ---------- walls: plaster ----------
  putz('putz.glatt-q3', 'Glattputz Q3', '#f4f1ea', { rauheit: 0.9, textur: 'putz', texturStaerke: 0.15, texturGroesse: 1 }),
  putz('putz.glatt-q4', 'Glattputz Q4', '#f4f1ea', { rauheit: 0.85, textur: 'putz', texturStaerke: 0.06, texturGroesse: 1 }),
  putz('putz.rau', 'Rauputz', '#efebe3', { struktur: 'raufaser', textur: 'putz', texturStaerke: 0.5, texturGroesse: 0.6 }),
  putz('putz.kalk', 'Kalkputz', '#ede7dc', { textur: 'putz', texturStaerke: 0.45, texturGroesse: 1.2 }),
  putz('putz.lehm', 'Lehmputz', '#cdb59a', { textur: 'putz', texturStaerke: 0.55, texturGroesse: 1 }),
  putz('putz.betonoptik', 'Spachteltechnik Betonoptik', '#a9a7a2', { rauheit: 0.8, textur: 'beton', texturStaerke: 0.8, texturGroesse: 2 }),
  putz('putz.mikrozement', 'Mikrozement', '#c9c2b6', { rauheit: 0.7, textur: 'beton', texturStaerke: 0.45, texturGroesse: 2 }),
  // ---------- walls: panels, wood, drywall ----------
  {
    id: 'paneel.akustik',
    name: 'Akustikpaneel (Lamellen)',
    kategorien: ['wand'],
    gruppe: 'Paneele und Holz',
    standard: { farbe: '#8a6a4e' },
    optionen: { farbe: 'holz' },
    darstellung: { rauheit: 0.7, struktur: 'akustik', textur: 'holz', texturStaerke: 0.4, texturGroesse: 1.8 },
  },
  {
    id: 'paneel.wand',
    name: 'Wandpaneele (Kassetten)',
    kategorien: ['wand'],
    gruppe: 'Paneele und Holz',
    standard: { farbe: '#e9e4da' },
    optionen: { farbe: 'frei' },
    darstellung: { rauheit: 0.75, struktur: 'paneel' },
  },
  {
    id: 'holz.verkleidung',
    name: 'Holzverkleidung',
    kategorien: ['wand'],
    gruppe: 'Paneele und Holz',
    standard: { farbe: HOLZTOENE[1]!.hex },
    optionen: { farbe: 'holz' },
    darstellung: { rauheit: 0.6, struktur: 'holzleisten', textur: 'holz', texturStaerke: 0.6, texturGroesse: 1.8, variation: 0.06 },
  },
  {
    id: 'trockenbau.vorsatzschale',
    name: 'Vorsatzschale (Trockenbau)',
    kategorien: ['wand'],
    gruppe: 'Trockenbau',
    standard: { farbe: '#f2f0ea' },
    optionen: { farbe: 'frei' },
    darstellung: { rauheit: 0.9, struktur: 'gipskarton' },
    hinweis: 'Zusätzliche Schale vor der Wand, z. B. für Leitungen oder Dämmung.',
  },
  {
    id: 'trockenbau.nische',
    name: 'Nische mit Licht (Trockenbau)',
    kategorien: ['wand'],
    gruppe: 'Trockenbau',
    standard: { farbe: '#f2f0ea' },
    optionen: { farbe: 'frei' },
    darstellung: { rauheit: 0.9, struktur: 'glatt' },
    hinweis: 'Zeigt eine beleuchtete Nische in der Mitte der Wandseite. Raumteiler finden Sie unter Einrichtung.',
  },
  // ---------- floors ----------
  diele('boden.vinyl', 'Designboden (Vinyl)', 'Designboden und Laminat', 'diele', 'drittelverband', { rauheit: 0.5, texturStaerke: 0.45 }),
  diele('boden.laminat', 'Laminat', 'Designboden und Laminat', 'diele', 'drittelverband', { rauheit: 0.45, texturStaerke: 0.5 }),
  diele('boden.parkett', 'Parkett', 'Parkett', 'diele-lang', 'landhausdiele', { rauheit: 0.55 }),
  {
    id: 'boden.teppich',
    name: 'Teppich',
    kategorien: ['boden'],
    gruppe: 'Weitere Böden',
    standard: { farbe: '#9d978c' },
    optionen: { farbe: 'frei' },
    darstellung: { rauheit: 1, struktur: 'teppich' },
  },
  {
    id: 'boden.mikrozement',
    name: 'Mikrozement',
    kategorien: ['boden'],
    gruppe: 'Weitere Böden',
    standard: { farbe: '#bdb6aa' },
    optionen: { farbe: 'frei' },
    darstellung: { rauheit: 0.6, struktur: 'glatt', textur: 'beton', texturStaerke: 0.5, texturGroesse: 2 },
  },
  // ---------- tiles (walls and floors) ----------
  fliese('fliese.matt', 'Fliese matt', '#e8e4dc', { rauheit: 0.75 }),
  fliese('fliese.glaenzend', 'Fliese glänzend', '#f2f0eb', { rauheit: 0.15 }),
  fliese('fliese.marmor', 'Marmoroptik', '#ebe8e2', { rauheit: 0.25, textur: 'marmor', texturStaerke: 0.9, texturGroesse: 1.5, variation: 0.02 }),
  fliese('fliese.beton', 'Betonoptik', '#a8a59f', { rauheit: 0.7, textur: 'beton', texturStaerke: 0.8, texturGroesse: 2 }),
  fliese('fliese.holz', 'Holzoptik', HOLZTOENE[1]!.hex, { rauheit: 0.6, textur: 'holz', texturStaerke: 0.6, texturGroesse: 1.8, variation: 0.07, maserung: true }),
  fliese('fliese.terrazzo', 'Terrazzo-Optik', '#e3ddd2', { rauheit: 0.45, struktur: 'terrazzo' }),
  fliese('fliese.zellige', 'Zellige-Optik (handgemacht)', '#d9e1dc', { rauheit: 0.2, variation: 0.14 }),
  // ---------- ceilings ----------
  {
    id: 'decke.farbe',
    name: 'Deckenfarbe',
    kategorien: ['decke'],
    gruppe: 'Decke',
    standard: { farbe: '#f7f5f0' },
    optionen: { farbe: 'frei' },
    darstellung: { rauheit: 0.95, struktur: 'glatt' },
  },
  {
    id: 'decke.abgehaengt',
    name: 'Abgehängte Decke',
    kategorien: ['decke'],
    gruppe: 'Decke',
    standard: { farbe: '#f7f5f0' },
    optionen: { farbe: 'frei' },
    darstellung: { rauheit: 0.95, struktur: 'gipskarton' },
    hinweis: 'Etwa 15 cm tiefer, Platz für Einbauspots und Leitungen.',
  },
  {
    id: 'decke.lichtvoute',
    name: 'Decke mit Lichtvoute',
    kategorien: ['decke'],
    gruppe: 'Decke',
    standard: { farbe: '#f7f5f0' },
    optionen: { farbe: 'frei' },
    darstellung: { rauheit: 0.95, struktur: 'glatt' },
    hinweis: 'Umlaufendes indirektes Licht am Deckenrand.',
  },
  {
    id: 'decke.stuck',
    name: 'Decke mit Stuckleiste',
    kategorien: ['decke'],
    gruppe: 'Decke',
    standard: { farbe: '#f7f5f0' },
    optionen: { farbe: 'frei' },
    darstellung: { rauheit: 0.95, struktur: 'glatt' },
  },
  // ---------- skirting ----------
  {
    id: 'sockel.weiss',
    name: 'Sockelleiste weiß',
    kategorien: ['sockelleiste'],
    gruppe: 'Sockelleiste',
    standard: { farbe: '#f4f2ee' },
    optionen: {},
    darstellung: { rauheit: 0.5, struktur: 'glatt' },
  },
  {
    id: 'sockel.holz',
    name: 'Sockelleiste Holz',
    kategorien: ['sockelleiste'],
    gruppe: 'Sockelleiste',
    standard: { farbe: HOLZ },
    optionen: { farbe: 'holz' },
    darstellung: { rauheit: 0.6, struktur: 'glatt', textur: 'holz', texturStaerke: 0.4, texturGroesse: 1.8 },
  },
  {
    id: 'sockel.hoch',
    name: 'Hohe Sockelleiste (Altbau)',
    kategorien: ['sockelleiste'],
    gruppe: 'Sockelleiste',
    standard: { farbe: '#f4f2ee' },
    optionen: { farbe: 'frei' },
    darstellung: { rauheit: 0.5, struktur: 'glatt' },
  },
  {
    id: 'sockel.schattenfuge',
    name: 'Schattenfuge',
    kategorien: ['sockelleiste'],
    gruppe: 'Sockelleiste',
    standard: { farbe: '#3d3a37' },
    optionen: {},
    darstellung: { rauheit: 0.7, struktur: 'glatt' },
  },
  // ---------- window sills ----------
  {
    id: 'fensterbank.naturstein',
    name: 'Naturstein hell',
    kategorien: ['fensterbank'],
    gruppe: 'Fensterbank',
    standard: { farbe: '#e4e0d8' },
    optionen: {},
    darstellung: { rauheit: 0.3, struktur: 'glatt', textur: 'marmor', texturStaerke: 0.7, texturGroesse: 1.5 },
  },
  {
    id: 'fensterbank.holz',
    name: 'Holz',
    kategorien: ['fensterbank'],
    gruppe: 'Fensterbank',
    standard: { farbe: HOLZ },
    optionen: { farbe: 'holz' },
    darstellung: { rauheit: 0.55, struktur: 'glatt', textur: 'holz', texturStaerke: 0.5, texturGroesse: 1.8 },
  },
  {
    id: 'fensterbank.kunststein',
    name: 'Kunststein anthrazit',
    kategorien: ['fensterbank'],
    gruppe: 'Fensterbank',
    standard: { farbe: '#4a4b4d' },
    optionen: {},
    darstellung: { rauheit: 0.4, struktur: 'terrazzo' },
  },
  {
    id: 'fensterbank.weiss',
    name: 'Kunststoff weiß',
    kategorien: ['fensterbank'],
    gruppe: 'Fensterbank',
    standard: { farbe: '#f3f2ee' },
    optionen: {},
    darstellung: { rauheit: 0.4, struktur: 'glatt' },
  },
];

// ---------- doors and windows (style ids in Oeffnung.gestaltung) ----------
export interface StilEintrag {
  id: string;
  name: string;
  /** Default colour of the leaf/frame. */
  farbe?: string;
}

export const TUER_STILE: readonly StilEintrag[] = [
  { id: 'tuer.glatt', name: 'Glatt', farbe: '#f4f2ee' },
  { id: 'tuer.kassette', name: 'Kassette', farbe: '#f4f2ee' },
  { id: 'tuer.lisenen', name: 'Lisenen (Rillen)', farbe: '#f4f2ee' },
  { id: 'tuer.landhaus', name: 'Landhaus', farbe: '#ece6da' },
  { id: 'tuer.holz', name: 'Holz furniert', farbe: HOLZTOENE[1]!.hex },
  { id: 'tuer.ganzglas', name: 'Ganzglas', farbe: '#d7e3e6' },
];

export const FENSTER_STILE: readonly StilEintrag[] = [
  { id: 'fenster.kunststoff', name: 'Kunststoff weiß', farbe: '#f4f4f2' },
  { id: 'fenster.holz', name: 'Holz', farbe: HOLZTOENE[1]!.hex },
  { id: 'fenster.alu', name: 'Aluminium anthrazit', farbe: '#3f4246' },
];

export const ZARGEN: readonly StilEintrag[] = [
  { id: 'zarge.umfassung', name: 'Umfassungszarge' },
  { id: 'zarge.stahl', name: 'Stahlzarge' },
  { id: 'zarge.flaechenbuendig', name: 'Flächenbündig (verdeckt)' },
];

export const GLAESER: readonly StilEintrag[] = [
  { id: 'glas.ohne', name: 'Ohne Glas' },
  { id: 'glas.schmal', name: 'Lichtausschnitt schmal' },
  { id: 'glas.gross', name: 'Lichtausschnitt groß' },
  { id: 'glas.satiniert', name: 'Satiniertes Glas' },
];

/** Door and window colours (neutral names). */
export const OEFFNUNG_FARBEN = [
  { name: 'Weiß', hex: '#f4f2ee' },
  { name: 'Cremeweiß', hex: '#ece6da' },
  { name: 'Grau hell', hex: '#c9c8c3' },
  { name: 'Anthrazit', hex: '#3f4246' },
  { name: 'Schwarz matt', hex: '#232427' },
  ...HOLZTOENE.slice(0, 3),
] as const;

const KATALOG = new Map(MATERIALIEN.map((m) => [m.id, m]));

export const materialVon = (id: string | undefined | null): MaterialEintrag | undefined => (id ? KATALOG.get(id) : undefined);
export const materialeFuer = (k: Kategorie): MaterialEintrag[] => MATERIALIEN.filter((m) => m.kategorien.includes(k));
export const stilVon = (id: string | undefined): StilEintrag | undefined =>
  [...TUER_STILE, ...FENSTER_STILE, ...ZARGEN, ...GLAESER].find((s) => s.id === id);

/** Fallback material per category (used when an id is unknown, e.g. from an older catalogue). */
export const STANDARD: Record<Kategorie, string> = {
  wand: 'farbe.matt',
  boden: 'boden.parkett',
  fliesen: 'fliese.matt',
  decke: 'decke.farbe',
  sockelleiste: 'sockel.weiss',
  fensterbank: 'fensterbank.naturstein',
};

/** MaterialRef with the catalogue defaults of a material. */
export function standardRef(id: string): MaterialRef {
  const m = materialVon(id);
  if (!m) return { material: id };
  return { material: id, ...structuredClone(m.standard) };
}

/**
 * Tolerant normalisation: unknown material -> category default, options that do not apply are dropped,
 * invalid formats/patterns fall back to the material's defaults. The result always passes materialRefSchema.
 */
export function normalisiereRef(ref: MaterialRef | null | undefined, k: Kategorie): MaterialRef | null {
  if (!ref) return null;
  const m = materialVon(ref.material);
  const eintrag = m && m.kategorien.includes(k) ? m : materialVon(STANDARD[k])!;
  const s = eintrag.standard;
  const o = eintrag.optionen;
  const aus: MaterialRef = { material: eintrag.id };
  const farbe = (ref.farbe && normHex(ref.farbe)) || s.farbe;
  if (farbe) aus.farbe = o.farbe ? farbe : (s.farbe ?? farbe);
  if (o.tapete) aus.muster = TAPETEN.some((t) => t.id === ref.muster) ? ref.muster : s.muster;
  if (o.formate || s.format) aus.format = ref.format && formatVon(ref.format) && (!o.formate || o.formate.includes(ref.format)) ? ref.format : s.format;
  if (o.muster) aus.muster = ref.muster && musterVon(ref.muster) && o.muster.includes(ref.muster) ? ref.muster : s.muster;
  if (o.fuge || s.fuge) aus.fuge = ref.fuge && o.fuge ? { farbe: normHex(ref.fuge.farbe) ?? s.fuge!.farbe, breiteMm: Math.max(0, Math.min(30, ref.fuge.breiteMm)) } : s.fuge;
  if (o.richtung) aus.richtungGrad = Math.max(0, Math.min(360, ref.richtungGrad ?? s.richtungGrad ?? 0));
  if (o.fliesenhoehe && k === 'fliesen') aus.fliesenhoehe = ref.fliesenhoehe ?? s.fliesenhoehe;
  for (const key of Object.keys(aus) as Array<keyof MaterialRef>) if (aus[key] === undefined) delete aus[key];
  return aus;
}

const FLIESENHOEHE_NAME = { raumhoch: 'raumhoch', halbhoch: 'halbhoch', spritzschutz: 'Spritzschutz' } as const;

/** Short German description, e.g. "Parkett, Fischgrät, Stab 60 × 10 cm, Eiche hell" (side panel, PDF in Phase 6). */
export function beschreibeRef(ref: MaterialRef | null | undefined, farbName?: (hex: string) => string | null): string {
  if (!ref) return 'nicht festgelegt';
  const m = materialVon(ref.material);
  const teile: string[] = [m?.name ?? ref.material];
  if (m?.optionen.tapete && ref.muster) teile.push(TAPETEN.find((t) => t.id === ref.muster)?.name ?? ref.muster);
  else if (ref.muster && musterVon(ref.muster)) teile.push(musterVon(ref.muster)!.name);
  if (ref.format && formatVon(ref.format)) teile.push(formatVon(ref.format)!.name);
  if (ref.farbe) teile.push(farbName?.(ref.farbe) ?? ref.farbe.toUpperCase());
  if (ref.fuge && m?.optionen.fuge) teile.push(`Fuge ${String(ref.fuge.breiteMm).replace('.', ',')} mm`);
  if (ref.fliesenhoehe) teile.push(FLIESENHOEHE_NAME[ref.fliesenhoehe]);
  // laying direction in plan degrees (0° = along the plan's x axis); omitted for the default 0°
  const richtung = ref.richtungGrad === undefined ? 0 : ((Math.round(ref.richtungGrad) % 360) + 360) % 360;
  if (m?.optionen.richtung && richtung !== 0) teile.push(`Verlegerichtung ${richtung}°`);
  return teile.join(', ');
}
