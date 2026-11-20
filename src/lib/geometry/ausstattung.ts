// Design and furnishing helpers (pure, no three.js, no DOM): wall sides, rooms per wall side,
// electrical points and furniture. Catalogue-agnostic: types and materials are only ids here,
// the catalogues live in src/lib/materials/ and src/lib/electro/ (planner-design).
import {
  type Einrichtung,
  type Elektro,
  type MaterialRef,
  type Projekt,
  type Raum,
  type Seite,
  type WandSeite,
  knotenMap,
  neueId,
} from './projekt.ts';
import { bereinigeAusstattung, nettoPolygon, raumAnWandseite, raumHoehe, wandZwischen } from './raeume.ts';
import { endpunkte, wandBei, wandFlaechenPunkt } from './waende.ts';
import { type Punkt, abstand, kreuz, minus } from './vektor.ts';

export interface Vektor3 {
  x: number;
  y: number;
  z: number;
}

export interface ElektroLage {
  /** Plan position (metres): wall surface point, or x/y for ceiling and floor points. */
  plan: Punkt;
  /** three.js position: (plan.x, height, plan.y). */
  position: Vektor3;
  /** Unit normal of the mounting surface in three.js coordinates (wall: into the room, ceiling: down, floor: up). */
  normale: Vektor3;
  /** Rotation around three.js +y so that a model's local +z faces along `normale` (walls; 0 for ceiling/floor). */
  drehungY: number;
}

/** Position of an electrical point in plan and 3D. null when its wall is missing. */
export function elektroLage(p: Projekt, e: Elektro, km = knotenMap(p)): ElektroLage | null {
  if (e.ort === 'wand') {
    const w = e.wandId ? p.waende.find((x) => x.id === e.wandId) : undefined;
    if (!w || !e.seite) return null;
    const f = wandFlaechenPunkt(p, w, e.seite, e.abstand, km);
    return {
      plan: f.punkt,
      position: { x: f.punkt.x, y: e.hoehe, z: f.punkt.y },
      normale: { x: f.normale.x, y: 0, z: f.normale.y },
      drehungY: Math.atan2(f.normale.x, f.normale.y),
    };
  }
  const plan = { x: e.x, y: e.y };
  if (e.ort === 'boden') return { plan, position: { x: e.x, y: 0, z: e.y }, normale: { x: 0, y: 1, z: 0 }, drehungY: 0 };
  const raum = e.raumId ? p.raeume.find((r) => r.id === e.raumId) : undefined;
  const h = raum ? raumHoehe(p, raum) : p.standardHoehe;
  return { plan, position: { x: e.x, y: h, z: e.y }, normale: { x: 0, y: -1, z: 0 }, drehungY: 0 };
}

export interface WandSeitenTreffer {
  wandId: string;
  seite: Seite;
  /** Distance along the wall from `von` (metres). */
  abstand: number;
  /** Distance of the point from the wall centre line (metres). */
  entfernung: number;
  raumId: string | null;
}

/** Wall side nearest to a plan point within `tol` metres of the centre line (e.g. for placing a socket by click). */
export function wandSeiteBei(p: Projekt, pt: Punkt, tol: number, km = knotenMap(p)): WandSeitenTreffer | null {
  const t = wandBei(p, pt, tol, km);
  if (!t) return null;
  const { a, b } = endpunkte(p, t.wand, km);
  // links = towards normale(b - a) = (-dy, dx); kreuz(b - a, pt - a) > 0 means that side
  const seite: Seite = kreuz(minus(b, a), minus(pt, a)) >= 0 ? 'links' : 'rechts';
  return { wandId: t.wand.id, seite, abstand: t.t * abstand(a, b), entfernung: t.abstand, raumId: raumAnWandseite(p, t.wand.id, seite)?.id ?? null };
}

export interface WandGestaltung {
  raumId: string | null;
  /** Effective wall finish: wall-side override, else the room's. */
  wand: MaterialRef | null;
  fliesen: MaterialRef | null;
  /** True when a wall-side override exists for this side. */
  ueberschrieben: boolean;
}

/** Effective design of one wall side (override from `wandSeiten`, else the room on that side). */
export function wirksameWandGestaltung(p: Projekt, wandId: string, seite: Seite): WandGestaltung {
  const raum = raumAnWandseite(p, wandId, seite);
  const s = p.wandSeiten.find((x) => x.wandId === wandId && x.seite === seite);
  return {
    raumId: raum?.id ?? null,
    wand: s?.wand ?? raum?.gestaltung.wand ?? null,
    fliesen: s?.fliesen ?? raum?.gestaltung.fliesen ?? null,
    ueberschrieben: Boolean(s),
  };
}

/**
 * Set or clear the override of one wall side. Fields not given stay as they are; an entry whose
 * `wand` and `fliesen` are both null is removed.
 */
export function setzeWandSeite(p: Projekt, wandId: string, seite: Seite, teil: Partial<Pick<WandSeite, 'wand' | 'fliesen'>>): Projekt {
  if (!p.waende.some((w) => w.id === wandId)) return p;
  const alt = p.wandSeiten.find((x) => x.wandId === wandId && x.seite === seite);
  const neu: WandSeite = { wandId, seite, wand: alt?.wand ?? null, fliesen: alt?.fliesen ?? null, ...teil };
  const rest = p.wandSeiten.filter((x) => x !== alt);
  return { ...p, wandSeiten: neu.wand || neu.fliesen ? [...rest, neu] : rest };
}

export interface WandAbschnitt {
  wandId: string;
  /** Side of the wall that faces the room. */
  seite: Seite;
  /** Centre-line points in room order. */
  a: Punkt;
  b: Punkt;
  /** Inner surface (clear room polygon edge) in room order. */
  innenA: Punkt;
  innenB: Punkt;
  laengeInnen: number;
  dicke: number;
}

/** Wall sections around a room in room order, with the side facing the room and the inner surface. */
export function wandAbschnitte(p: Projekt, raumId: string, km = knotenMap(p)): WandAbschnitt[] {
  const r = p.raeume.find((x) => x.id === raumId);
  if (!r) return [];
  const wz = wandZwischen(p);
  const innen = nettoPolygon(p, r.knoten, km, wz);
  const n = r.knoten.length;
  const liste: WandAbschnitt[] = [];
  for (let i = 0; i < n; i++) {
    const von = r.knoten[i]!;
    const bis = r.knoten[(i + 1) % n]!;
    const w = p.waende.find((x) => (x.von === von && x.bis === bis) || (x.von === bis && x.bis === von));
    const a = km.get(von);
    const b = km.get(bis);
    const ia = innen[i];
    const ib = innen[(i + 1) % n];
    if (!w || !a || !b || !ia || !ib) continue;
    liste.push({ wandId: w.id, seite: w.von === von ? 'links' : 'rechts', a, b, innenA: ia, innenB: ib, laengeInnen: abstand(ia, ib), dicke: w.dicke });
  }
  return liste;
}

export type ElektroEingabe =
  | { typ: string; ort: 'wand'; wandId: string; seite: Seite; abstand: number; hoehe: number }
  | { typ: string; ort: 'decke' | 'boden'; x: number; y: number };

/** Add an electrical point; derived fields (x/y on walls, raumId) are filled in. null when the wall is missing. */
export function fuegeElektroHinzu(p: Projekt, eingabe: ElektroEingabe): { projekt: Projekt; id: string } | null {
  const id = neueId('e', p.elektro);
  let e: Elektro;
  if (eingabe.ort === 'wand') {
    if (!p.waende.some((w) => w.id === eingabe.wandId)) return null;
    e = { id, typ: eingabe.typ, ort: 'wand', wandId: eingabe.wandId, seite: eingabe.seite, abstand: Math.max(0, eingabe.abstand), hoehe: eingabe.hoehe, x: 0, y: 0, raumId: null };
  } else {
    e = { id, typ: eingabe.typ, ort: eingabe.ort, wandId: null, seite: null, abstand: 0, hoehe: 0, x: eingabe.x, y: eingabe.y, raumId: null };
  }
  return { projekt: bereinigeAusstattung({ ...p, elektro: [...p.elektro, e] }), id };
}

/** Change an electrical point (e.g. move along the wall, edit height, change type); derived fields follow. */
export function aendereElektro(
  p: Projekt,
  id: string,
  teil: Partial<Pick<Elektro, 'typ' | 'abstand' | 'hoehe' | 'x' | 'y' | 'seite' | 'wandId'>>,
): Projekt {
  if (!p.elektro.some((e) => e.id === id)) return p;
  return bereinigeAusstattung({ ...p, elektro: p.elektro.map((e) => (e.id === id ? { ...e, ...teil } : e)) });
}

export const entferneElektro = (p: Projekt, id: string): Projekt => ({ ...p, elektro: p.elektro.filter((e) => e.id !== id) });

/** Electrical points per room (wall points by the room on their side, ceiling/floor points by position). */
export function elektroImRaum(p: Projekt, raumId: string): Elektro[] {
  return p.elektro.filter((e) => e.raumId === raumId);
}

/** Add a piece of furniture; `raumId` is derived from the position. */
export function fuegeEinrichtungHinzu(p: Projekt, m: Pick<Einrichtung, 'typ' | 'x' | 'y' | 'drehungGrad'>): { projekt: Projekt; id: string } {
  const id = neueId('m', p.einrichtung);
  const drehungGrad = ((m.drehungGrad % 360) + 360) % 360;
  return { projekt: bereinigeAusstattung({ ...p, einrichtung: [...p.einrichtung, { ...m, drehungGrad, id, raumId: null }] }), id };
}

export function aendereEinrichtung(p: Projekt, id: string, teil: Partial<Pick<Einrichtung, 'typ' | 'x' | 'y' | 'drehungGrad'>>): Projekt {
  if (!p.einrichtung.some((m) => m.id === id)) return p;
  const norm = teil.drehungGrad === undefined ? teil : { ...teil, drehungGrad: ((teil.drehungGrad % 360) + 360) % 360 };
  return bereinigeAusstattung({ ...p, einrichtung: p.einrichtung.map((m) => (m.id === id ? { ...m, ...norm } : m)) });
}

export const entferneEinrichtung = (p: Projekt, id: string): Projekt => ({ ...p, einrichtung: p.einrichtung.filter((m) => m.id !== id) });

/** Apply a design to rooms (style package or single choice); `stilpaket` is recorded when given. */
export function gestalteRaeume(
  p: Projekt,
  raumIds: readonly string[] | 'alle',
  teil: Partial<Raum['gestaltung']>,
  stilpaket?: string | null,
): Projekt {
  const ziel = (r: Raum) => raumIds === 'alle' || raumIds.includes(r.id);
  return {
    ...p,
    raeume: p.raeume.map((r) =>
      ziel(r) ? { ...r, gestaltung: { ...r.gestaltung, ...teil }, ...(stilpaket !== undefined ? { stilpaket } : {}) } : r,
    ),
  };
}
