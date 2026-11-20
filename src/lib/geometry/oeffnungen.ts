// Doors and windows in walls (pure). An opening sits on one wall, measured by the distance of its centre
// from the wall's `von` node. Openings never overlap and keep OEFFNUNG_RAND to the wall ends.
import { type Oeffnung, type OeffnungArt, type Projekt, knotenMap, neueId } from './projekt.ts';
import { OEFFNUNG_RAND, endpunkte, findeWand, oeffnungenEinpassen, wandBei, wandLaenge } from './waende.ts';
import { type Punkt, abstand, minus, normiert, plus, mal } from './vektor.ts';

/** Typical sizes: door 88.5 × 201 cm (DIN 18101 rough opening), window 101 × 126 cm at 90 cm sill. */
export const OEFFNUNG_STANDARD: Record<OeffnungArt, Pick<Oeffnung, 'breite' | 'hoehe' | 'bruestung'>> = {
  tuer: { breite: 0.885, hoehe: 2.01, bruestung: 0 },
  fenster: { breite: 1.01, hoehe: 1.26, bruestung: 0.9 },
};

export type OeffnungErgebnis = { ok: true; projekt: Projekt; id: string } | { ok: false; fehler: string };

function frei(p: Projekt, wandId: string, mitte: number, breite: number, ohne?: string): boolean {
  return p.oeffnungen.every(
    (o) => o.wandId !== wandId || o.id === ohne || Math.abs(o.abstand - mitte) >= (o.breite + breite) / 2 + 0.02,
  );
}

function einpassen(l: number, breite: number, wunsch: number): number {
  const min = breite / 2 + OEFFNUNG_RAND;
  return Number(Math.min(Math.max(wunsch, min), l - min).toFixed(4));
}

/** Place a door or window on the wall nearest to `pt` (within `radius` metres). */
export function platziereOeffnung(
  p: Projekt,
  art: OeffnungArt,
  pt: Punkt,
  radius: number,
  masse: Partial<Pick<Oeffnung, 'breite' | 'hoehe' | 'bruestung'>> = {},
): OeffnungErgebnis {
  const treffer = wandBei(p, pt, radius);
  if (!treffer) return { ok: false, fehler: 'Bitte auf eine Wand setzen.' };
  const m = { ...OEFFNUNG_STANDARD[art], ...masse };
  const l = wandLaenge(p, treffer.wand);
  if (l < m.breite + 2 * OEFFNUNG_RAND) return { ok: false, fehler: 'Die Wand ist für diese Öffnung zu kurz.' };
  const mitte = einpassen(l, m.breite, treffer.t * l);
  if (!frei(p, treffer.wand.id, mitte, m.breite)) return { ok: false, fehler: 'An dieser Stelle ist bereits eine Öffnung.' };
  const o: Oeffnung = { id: neueId('o', p.oeffnungen), wandId: treffer.wand.id, art, abstand: mitte, ...m, anschlag: 'links', aufschlag: 'links', gestaltung: null };
  return { ok: true, projekt: { ...p, oeffnungen: [...p.oeffnungen, o] }, id: o.id };
}

/** Move an opening to the wall point nearest `pt` (may change to another wall within `radius`). */
export function verschiebeOeffnung(p: Projekt, id: string, pt: Punkt, radius: number): Projekt {
  const o = p.oeffnungen.find((x) => x.id === id);
  if (!o) return p;
  const km = knotenMap(p);
  const eigene = findeWand(p, o.wandId);
  const andere = wandBei(p, pt, radius, km);
  const wand = andere && wandLaenge(p, andere.wand, km) >= o.breite + 2 * OEFFNUNG_RAND ? andere.wand : eigene;
  if (!wand) return p;
  const { a, b } = endpunkte(p, wand, km);
  const l = abstand(a, b);
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * (b.x - a.x) + (pt.y - a.y) * (b.y - a.y)) / (l * l)));
  const mitte = einpassen(l, o.breite, t * l);
  if (!frei(p, wand.id, mitte, o.breite, o.id)) return p;
  return { ...p, oeffnungen: p.oeffnungen.map((x) => (x.id === id ? { ...x, wandId: wand.id, abstand: mitte } : x)) };
}

/** Change size or swing. Width is limited to the wall; overlapping changes are rejected. */
export function aendereOeffnung(
  p: Projekt,
  id: string,
  aenderung: Partial<Pick<Oeffnung, 'breite' | 'hoehe' | 'bruestung' | 'abstand' | 'anschlag' | 'aufschlag'>>,
): Projekt {
  const o = p.oeffnungen.find((x) => x.id === id);
  const w = o && findeWand(p, o.wandId);
  if (!o || !w) return p;
  const l = wandLaenge(p, w);
  const neu = { ...o, ...aenderung };
  neu.breite = Math.min(Math.max(neu.breite, 0.2), l - 2 * OEFFNUNG_RAND);
  neu.hoehe = Math.min(Math.max(neu.hoehe, 0.2), 4);
  neu.bruestung = Math.min(Math.max(neu.bruestung, 0), 3);
  neu.abstand = einpassen(l, neu.breite, neu.abstand);
  if (!frei(p, w.id, neu.abstand, neu.breite, id)) return p;
  return oeffnungenEinpassen({ ...p, oeffnungen: p.oeffnungen.map((x) => (x.id === id ? neu : x)) });
}

export function entferneOeffnung(p: Projekt, id: string): Projekt {
  return { ...p, oeffnungen: p.oeffnungen.filter((o) => o.id !== id) };
}

/** Plan points of an opening: start and end along the wall centre line, centre and wall direction. */
export function oeffnungsLage(p: Projekt, o: Oeffnung, km = knotenMap(p)): { a: Punkt; b: Punkt; mitte: Punkt; richtung: Punkt } | null {
  const w = findeWand(p, o.wandId);
  if (!w) return null;
  const { a, b } = endpunkte(p, w, km);
  const r = normiert(minus(b, a));
  const mitte = plus(a, mal(r, o.abstand));
  return { a: plus(mitte, mal(r, -o.breite / 2)), b: plus(mitte, mal(r, o.breite / 2)), mitte, richtung: r };
}
