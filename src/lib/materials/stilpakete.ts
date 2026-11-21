// Style packages (src/content/trends/*.json) -> room design. Maps the fixed terms of docs/TREND-UPDATE.md
// onto catalogue ids, tolerant: unknown terms fall back to neutral defaults instead of failing.
// After applying, every part stays individually editable (it is just MaterialRefs in the project).
import type { MaterialRef, Projekt, Raum, RaumGestaltung } from '../geometry/projekt.ts';
import { wandAbschnitte } from '../geometry/ausstattung.ts';
import { luminanz, normHex } from './farben.ts';
import { normalisiereRef, standardRef } from './katalog.ts';

/** The part of a trend entry the planner uses (src/lib/schemas/trend.ts, filtered to aktiv on the page). */
export interface Stilpaket {
  /** Entry id (file name without .json), e.g. "japandi". */
  id: string;
  name: string;
  beschreibung: string;
  saison: string;
  wandfarben: Array<{ name: string; hex: string }>;
  putz_tapete: { art: string; beschreibung: string };
  boden: { material: string; farbton: { name: string; hex: string }; verlegemuster?: string };
  fliesen?: { format: string; farbe: { name: string; hex: string }; verlegemuster?: string; fuge?: string };
  deckenlicht: { art: string; farbtemperatur_k: number };
  elektro_vorschlag: { paket: string; punkte: string[] };
}

export type RaumArt = 'bad' | 'wc' | 'kueche' | 'flur' | 'wohnen' | 'schlafen' | 'abstell' | 'sonst';

/** Room type from the (editable) room name. */
export function raumArt(name: string): RaumArt {
  const n = name.toLowerCase();
  if (/\bwc\b|gäste-?wc|toilette/.test(n)) return 'wc';
  if (/bad|dusche|wellness/.test(n)) return 'bad';
  if (/küche|kueche|koch/.test(n)) return 'kueche';
  if (/flur|diele|eingang|gang|treppe/.test(n)) return 'flur';
  if (/schlaf|kind|gäste/.test(n)) return 'schlafen';
  if (/wohn|ess|arbeit|büro|zimmer/.test(n)) return 'wohnen';
  if (/abstell|speis|lager|hwr|hauswirtschaft|technik/.test(n)) return 'abstell';
  return 'sonst';
}

export const istNassraum = (a: RaumArt) => a === 'bad' || a === 'wc';

const umlaute = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

/** Fixed terms (TREND-UPDATE.md) for putz_tapete.beschreibung, longest first. */
const PUTZ_BEGRIFFE: Array<[string, string]> = [
  ['glattputz q3', 'putz.glatt-q3'],
  ['glattputz q4', 'putz.glatt-q4'],
  ['strukturvlies', 'tapete.strukturvlies'],
  ['mustertapete', 'tapete.muster'],
  ['mikrozement', 'putz.mikrozement'],
  ['vlies glatt', 'tapete.vlies-glatt'],
  ['betonoptik', 'putz.betonoptik'],
  ['glasfaser', 'tapete.glasfaser'],
  ['wandfarbe', 'farbe.matt'],
  ['kalkputz', 'putz.kalk'],
  ['lehmputz', 'putz.lehm'],
  ['raufaser', 'tapete.raufaser'],
  ['rauputz', 'putz.rau'],
  ['glattputz', 'putz.glatt-q3'],
];

export function putzMaterial(pt: { art: string; beschreibung: string }): string {
  const b = pt.beschreibung.trim().toLowerCase();
  const start = PUTZ_BEGRIFFE.find(([t]) => b.startsWith(t));
  if (start) return start[1];
  const enthalten = PUTZ_BEGRIFFE.find(([t]) => b.includes(t));
  if (enthalten) return enthalten[1];
  return pt.art === 'tapete' ? 'tapete.vlies-glatt' : pt.art === 'putz' ? 'putz.glatt-q3' : 'farbe.matt';
}

export function musterId(begriff: string | undefined): string | undefined {
  if (!begriff) return undefined;
  const t = umlaute(begriff).trim().replace(/\s+/g, '-');
  const bekannt = ['halbverband', 'drittelverband', 'kreuzfuge', 'diagonal', 'fischgraet', 'chevron', 'vertikal-gestapelt', 'landhausdiele'];
  return bekannt.find((m) => t === m) ?? bekannt.find((m) => t.includes(m));
}

export function formatId(begriff: string | undefined): string | undefined {
  if (!begriff) return undefined;
  const t = umlaute(begriff).replace(/\s+/g, '').replace(/[×*]/g, 'x');
  if (t.includes('metro') || t.startsWith('7,5x15') || t.startsWith('7.5x15')) return 'metro-7-5x15';
  if (t.includes('hexagon') || t.includes('sechseck')) return 'hexagon';
  if (t.includes('mosaik')) return 'mosaik';
  if (t.includes('zellige')) return 'zellige';
  const m = /^(\d+)x(\d+)/.exec(t);
  if (m) {
    const id = `${m[1]}x${m[2]}`;
    const gedreht = `${m[2]}x${m[1]}`;
    for (const k of ['30x60', '60x60', '60x120', '120x120']) if (k === id || k === gedreht) return k;
  }
  return undefined;
}

function fliesenOberflaeche(name: string, format: string | undefined): string {
  const n = umlaute(name);
  if (format === 'zellige') return 'fliese.zellige';
  if (n.includes('marmor')) return 'fliese.marmor';
  if (n.includes('beton')) return 'fliese.beton';
  if (n.includes('holz')) return 'fliese.holz';
  if (n.includes('terrazzo')) return 'fliese.terrazzo';
  if (n.includes('glanz') || n.includes('glaenz')) return 'fliese.glaenzend';
  return 'fliese.matt';
}

const hex = (s: string | undefined, ersatz: string) => (s && normHex(s)) || ersatz;

function fliesenRef(paket: Stilpaket, hoehe: MaterialRef['fliesenhoehe'] | undefined): MaterialRef | null {
  const f = paket.fliesen;
  const format = formatId(f?.format) ?? '60x60';
  const ref: MaterialRef = {
    ...standardRef(fliesenOberflaeche(f?.farbe.name ?? '', format)),
    farbe: hex(f?.farbe.hex, '#e8e4dc'),
    format,
    muster: musterId(f?.verlegemuster) ?? (format === 'metro-7-5x15' ? 'halbverband' : 'kreuzfuge'),
    fuge: { farbe: hex(f?.fuge, '#c4c2bd'), breiteMm: format === 'mosaik' || format === 'zellige' ? 2 : 3 },
  };
  if (hoehe) ref.fliesenhoehe = hoehe;
  return normalisiereRef(ref, 'fliesen');
}

function bodenRef(paket: Stilpaket, nass: boolean): MaterialRef {
  const b = paket.boden;
  const mat = umlaute(b.material);
  if (nass || mat === 'fliese') {
    const f = fliesenRef(paket, undefined)!;
    // floor tiles in the floor colour of the package (unless it is a tile package anyway)
    const ref: MaterialRef = { ...f, farbe: mat === 'fliese' ? hex(b.farbton.hex, f.farbe ?? '#b8b0a3') : f.farbe };
    if (mat === 'fliese' && musterId(b.verlegemuster)) ref.muster = musterId(b.verlegemuster);
    delete ref.fliesenhoehe;
    return normalisiereRef(ref, 'boden')!;
  }
  const id = mat === 'vinyl' ? 'boden.vinyl' : mat === 'laminat' ? 'boden.laminat' : mat === 'teppich' ? 'boden.teppich' : 'boden.parkett';
  const muster = musterId(b.verlegemuster);
  const ref: MaterialRef = { ...standardRef(id), farbe: hex(b.farbton.hex, '#c9ae86') };
  if (muster) {
    ref.muster = muster;
    ref.format = muster === 'fischgraet' || muster === 'chevron' ? 'stab' : muster === 'landhausdiele' ? 'diele-lang' : (ref.format ?? 'diele');
  }
  return normalisiereRef(ref, 'boden')!;
}

/** Design of one room from a style package (pure). */
export function paketGestaltung(paket: Stilpaket, art: RaumArt): RaumGestaltung {
  const nass = istNassraum(art);
  const wandfarbe = hex(paket.wandfarben[0]?.hex, '#f4f1ea');
  let wandId = putzMaterial(paket.putz_tapete);
  // paper wallpapers are not suitable in wet rooms: paint (silk matt) instead
  if (nass && wandId.startsWith('tapete.')) wandId = 'farbe.seidenmatt';
  const wand = normalisiereRef({ ...standardRef(wandId), farbe: wandfarbe }, 'wand');

  const boden = bodenRef(paket, nass);

  const grossformat = ['60x120', '120x120'].includes(formatId(paket.fliesen?.format) ?? '');
  const fliesen =
    art === 'bad' ? fliesenRef(paket, grossformat ? 'raumhoch' : 'halbhoch') : art === 'wc' ? fliesenRef(paket, 'halbhoch') : art === 'kueche' ? fliesenRef(paket, 'spritzschutz') : null;

  const licht = umlaute(paket.deckenlicht.art);
  const deckenId = licht.includes('voute') ? 'decke.lichtvoute' : licht.includes('stuck') ? 'decke.stuck' : 'decke.farbe';
  const hellste = [...paket.wandfarben].map((f) => hex(f.hex, '#f7f5f0')).sort((a, b) => luminanz(b) - luminanz(a))[0];
  const decke = normalisiereRef({ ...standardRef(deckenId), farbe: hellste && luminanz(hellste) > 0.7 ? hellste : '#f7f5f0' }, 'decke');

  const holzBoden = boden.material.startsWith('boden.') && boden.material !== 'boden.teppich' && boden.material !== 'boden.mikrozement';
  const sockelleiste = nass ? null : normalisiereRef(holzBoden ? { ...standardRef('sockel.holz'), farbe: boden.farbe } : standardRef('sockel.weiss'), 'sockelleiste');

  return { wand, boden, decke, fliesen, sockelleiste };
}

/**
 * Apply a style package to rooms ('alle' = whole flat). Records the package id per room and removes
 * wall-side overrides on the sides facing these rooms, so the package is visible everywhere; afterwards
 * every part can be changed individually again.
 */
export function wendePaketAn(p: Projekt, paket: Stilpaket, raumIds: readonly string[] | 'alle'): Projekt {
  const ziel = (r: Raum) => raumIds === 'alle' || raumIds.includes(r.id);
  const seiten = new Set<string>();
  for (const r of p.raeume) if (ziel(r)) for (const a of wandAbschnitte(p, r.id)) seiten.add(`${a.wandId}:${a.seite}`);
  return {
    ...p,
    raeume: p.raeume.map((r) => (ziel(r) ? { ...r, gestaltung: paketGestaltung(paket, raumArt(r.name)), stilpaket: paket.id } : r)),
    wandSeiten: p.wandSeiten.filter((s) => !seiten.has(`${s.wandId}:${s.seite}`)),
  };
}
