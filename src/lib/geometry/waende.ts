// Wall graph operations (pure). Walls are edges between nodes; every operation returns a new project.
// Junctions are explicit: a wall that ends on another wall splits it (T-junction), crossing walls
// are split at the crossing. That keeps the graph planar, which room detection (raeume.ts) relies on.
import { type Knoten, type Oeffnung, type Projekt, type Wand, type WandArt, knotenMap, neueId } from './projekt.ts';
import { type Punkt, abstand, kreuz, minus, normiert, plus, mal, projiziere, rundePunkt, schnittStrecken, skalar } from './vektor.ts';

/** Two points closer than this are the same node (metres). */
export const TOLERANZ = 0.005;
/** Minimum wall length (metres). */
export const MIN_WANDLAENGE = 0.05;
/** Gap kept between an opening and the wall end (metres). */
export const OEFFNUNG_RAND = 0.05;

export interface WandOptionen {
  dicke: number;
  art: WandArt;
}

export function endpunkte(p: Projekt, w: Wand, km = knotenMap(p)): { a: Punkt; b: Punkt } {
  const a = km.get(w.von);
  const b = km.get(w.bis);
  if (!a || !b) throw new Error(`Wand ${w.id}: Knoten fehlt`);
  return { a, b };
}

export const wandLaenge = (p: Projekt, w: Wand, km = knotenMap(p)): number => {
  const { a, b } = endpunkte(p, w, km);
  return abstand(a, b);
};

export const findeWand = (p: Projekt, id: string): Wand | undefined => p.waende.find((w) => w.id === id);

export function waendeAnKnoten(p: Projekt, knotenId: string): Wand[] {
  return p.waende.filter((w) => w.von === knotenId || w.bis === knotenId);
}

export function knotenBei(p: Projekt, pt: Punkt, tol = TOLERANZ): Knoten | undefined {
  let best: Knoten | undefined;
  let d = tol;
  for (const k of p.knoten) {
    const dk = abstand(k, pt);
    if (dk <= d) {
      d = dk;
      best = k;
    }
  }
  return best;
}

/** Nearest wall to a point within `tol` (distance to the centre line). */
export function wandBei(p: Projekt, pt: Punkt, tol: number, km = knotenMap(p)): { wand: Wand; t: number; punkt: Punkt; abstand: number } | undefined {
  let best: { wand: Wand; t: number; punkt: Punkt; abstand: number } | undefined;
  for (const w of p.waende) {
    const { a, b } = endpunkte(p, w, km);
    const pr = projiziere(pt, a, b);
    if (pr.abstand <= tol && (!best || pr.abstand < best.abstand)) best = { wand: w, ...pr };
  }
  return best;
}

/** Clamp openings into their walls; drop openings on missing walls or walls that are too short. */
export function oeffnungenEinpassen(p: Projekt): Projekt {
  const km = knotenMap(p);
  const waende = new Map(p.waende.map((w) => [w.id, w]));
  const oeffnungen: Oeffnung[] = [];
  for (const o of p.oeffnungen) {
    const w = waende.get(o.wandId);
    if (!w) continue;
    const l = wandLaenge(p, w, km);
    if (l < o.breite + 2 * OEFFNUNG_RAND - 1e-9) continue;
    const min = o.breite / 2 + OEFFNUNG_RAND;
    const abstandNeu = Math.min(Math.max(o.abstand, min), l - min);
    oeffnungen.push(abstandNeu === o.abstand ? o : { ...o, abstand: Number(abstandNeu.toFixed(4)) });
  }
  return oeffnungen.length === p.oeffnungen.length && oeffnungen.every((o, i) => o === p.oeffnungen[i]) ? p : { ...p, oeffnungen };
}

/** Split a wall at the point closest to `pt`. Returns the node at the split (existing end node if close). */
export function teileWand(p: Projekt, wandId: string, pt: Punkt, tol = TOLERANZ): { projekt: Projekt; knotenId: string } {
  const w = findeWand(p, wandId);
  if (!w) throw new Error(`Wand ${wandId} fehlt`);
  const km = knotenMap(p);
  const { a, b } = endpunkte(p, w, km);
  const pr = projiziere(pt, a, b);
  if (abstand(pr.punkt, a) <= tol) return { projekt: p, knotenId: w.von };
  if (abstand(pr.punkt, b) <= tol) return { projekt: p, knotenId: w.bis };
  const kId = neueId('k', p.knoten);
  const pos = rundePunkt(pr.punkt);
  const k: Knoten = { id: kId, x: pos.x, y: pos.y };
  const w2: Wand = { ...w, id: neueId('w', p.waende), von: kId };
  const w1: Wand = { ...w, bis: kId };
  const l1 = abstand(a, pos);
  const oeffnungen = p.oeffnungen.map((o) =>
    o.wandId !== w.id || o.abstand <= l1 ? o : { ...o, wandId: w2.id, abstand: Number((o.abstand - l1).toFixed(4)) },
  );
  const waende = p.waende.flatMap((x) => (x.id === w.id ? [w1, w2] : [x]));
  return { projekt: oeffnungenEinpassen({ ...p, knoten: [...p.knoten, k], waende, oeffnungen }), knotenId: kId };
}

/** Node for a point: existing node, split of a wall the point lies on, or a new free node. */
export function knotenFuer(p: Projekt, pt: Punkt, tol = TOLERANZ): { projekt: Projekt; knotenId: string } {
  const k = knotenBei(p, pt, tol);
  if (k) return { projekt: p, knotenId: k.id };
  const w = wandBei(p, pt, tol);
  if (w) return teileWand(p, w.wand.id, pt, tol);
  const id = neueId('k', p.knoten);
  const pos = rundePunkt(pt);
  return { projekt: { ...p, knoten: [...p.knoten, { id, x: pos.x, y: pos.y }] }, knotenId: id };
}

const verbindet = (w: Wand, k1: string, k2: string) => (w.von === k1 && w.bis === k2) || (w.von === k2 && w.bis === k1);

/**
 * Add a wall from a to b. Ends dock to existing nodes or split walls they touch; walls crossed on the
 * way are split; existing nodes on the line become intermediate nodes. Overlapping existing walls are reused.
 */
export function fuegeWandHinzu(
  p: Projekt,
  a: Punkt,
  b: Punkt,
  opt: WandOptionen,
  tol = TOLERANZ,
): { projekt: Projekt; wandIds: string[]; vonId: string | null; bisId: string | null } {
  if (abstand(a, b) < MIN_WANDLAENGE) return { projekt: p, wandIds: [], vonId: null, bisId: null };
  const r1 = knotenFuer(p, a, tol);
  const r2 = knotenFuer(r1.projekt, b, tol);
  let q = r2.projekt;
  const vonId = r1.knotenId;
  const bisId = r2.knotenId;
  if (vonId === bisId) return { projekt: q, wandIds: [], vonId, bisId };

  let km = knotenMap(q);
  const A = km.get(vonId)!;
  const B = km.get(bisId)!;
  const laenge = abstand(A, B);
  const tolT = tol / laenge;
  const zwischen: Array<{ t: number; id: string }> = [
    { t: 0, id: vonId },
    { t: 1, id: bisId },
  ];

  // existing nodes on the segment interior
  for (const k of q.knoten) {
    if (k.id === vonId || k.id === bisId) continue;
    const pr = projiziere(k, A, B);
    if (pr.abstand <= tol && pr.t > tolT && pr.t < 1 - tolT) zwischen.push({ t: pr.t, id: k.id });
  }
  // proper crossings with existing walls
  for (const w of [...q.waende]) {
    if ([w.von, w.bis].some((id) => zwischen.some((z) => z.id === id))) continue;
    km = knotenMap(q);
    const wa = km.get(w.von)!;
    const wb = km.get(w.bis)!;
    const s = schnittStrecken(A, B, wa, wb);
    if (!s) continue;
    const wl = abstand(wa, wb);
    if (s.t <= tolT || s.t >= 1 - tolT || s.u * wl <= tol || (1 - s.u) * wl <= tol) continue;
    const split = teileWand(q, w.id, s.punkt, tol);
    q = split.projekt;
    zwischen.push({ t: s.t, id: split.knotenId });
  }

  zwischen.sort((x, y) => x.t - y.t);
  const kette = zwischen.filter((z, i) => i === 0 || z.id !== zwischen[i - 1]!.id);
  const wandIds: string[] = [];
  const neue: Wand[] = [];
  for (let i = 0; i + 1 < kette.length; i++) {
    const k1 = kette[i]!.id;
    const k2 = kette[i + 1]!.id;
    const vorhanden = q.waende.find((w) => verbindet(w, k1, k2)) ?? neue.find((w) => verbindet(w, k1, k2));
    if (vorhanden) {
      wandIds.push(vorhanden.id);
      continue;
    }
    const w: Wand = { id: neueId('w', [...q.waende, ...neue]), von: k1, bis: k2, dicke: opt.dicke, art: opt.art };
    neue.push(w);
    wandIds.push(w.id);
  }
  return { projekt: { ...q, waende: [...q.waende, ...neue] }, wandIds, vonId, bisId };
}

/** Remove nodes no wall uses. */
export function entferneLoseKnoten(p: Projekt): Projekt {
  const benutzt = new Set(p.waende.flatMap((w) => [w.von, w.bis]));
  const knoten = p.knoten.filter((k) => benutzt.has(k.id));
  return knoten.length === p.knoten.length ? p : { ...p, knoten };
}

/**
 * Merge the two walls at a node of degree 2 if they are collinear and of the same kind
 * (e.g. after the wall forming a T-junction was deleted). Openings keep their position.
 */
export function verschmelzeKollineare(p: Projekt, knotenId: string): Projekt {
  const ws = waendeAnKnoten(p, knotenId);
  if (ws.length !== 2) return p;
  const [w1, w2] = ws as [Wand, Wand];
  if (w1.dicke !== w2.dicke || w1.art !== w2.art) return p;
  const km = knotenMap(p);
  const x = km.get(w1.von === knotenId ? w1.bis : w1.von)!;
  const y = km.get(w2.von === knotenId ? w2.bis : w2.von)!;
  const k = km.get(knotenId)!;
  const r1 = normiert(minus(k, x));
  const r2 = normiert(minus(y, k));
  if (Math.abs(kreuz(r1, r2)) > 1e-4 || skalar(r1, r2) < 0) return p;
  // new wall x -> y keeps w1's id; positions of openings measured from x
  const neu: Wand = { ...w1, von: x.id, bis: y.id };
  const lGesamt = abstand(x, y);
  const oeffnungen = p.oeffnungen.map((o) => {
    if (o.wandId !== w1.id && o.wandId !== w2.id) return o;
    const w = o.wandId === w1.id ? w1 : w2;
    // absolute centre point of the opening along its old wall
    const { a, b } = endpunkte(p, w, km);
    const mitte = plus(a, mal(normiert(minus(b, a)), o.abstand));
    const abst = projiziere(mitte, x, y).t * lGesamt;
    return { ...o, wandId: neu.id, abstand: Number(abst.toFixed(4)) };
  });
  const waende = p.waende.filter((w) => w.id !== w2.id).map((w) => (w.id === w1.id ? neu : w));
  return { ...p, waende, oeffnungen, knoten: p.knoten.filter((n) => n.id !== knotenId) };
}

/** Delete a wall with its openings; clean up loose nodes and merge collinear rests. */
export function entferneWand(p: Projekt, wandId: string): Projekt {
  const w = findeWand(p, wandId);
  if (!w) return p;
  let q: Projekt = {
    ...p,
    waende: p.waende.filter((x) => x.id !== wandId),
    oeffnungen: p.oeffnungen.filter((o) => o.wandId !== wandId),
  };
  q = entferneLoseKnoten(q);
  for (const k of [w.von, w.bis]) if (q.knoten.some((n) => n.id === k)) q = verschmelzeKollineare(q, k);
  return q;
}

/**
 * Move a node. If it lands on another node (within tol), both are merged; walls that become
 * zero-length or duplicate are removed.
 */
export function verschiebeKnoten(p: Projekt, knotenId: string, ziel: Punkt, tol = TOLERANZ): Projekt {
  const pos = rundePunkt(ziel);
  const anderer = p.knoten.find((k) => k.id !== knotenId && abstand(k, pos) <= tol);
  if (anderer) return verbindeKnoten(p, knotenId, anderer.id);
  const knoten = p.knoten.map((k) => (k.id === knotenId ? { ...k, x: pos.x, y: pos.y } : k));
  return oeffnungenEinpassen({ ...p, knoten });
}

/** Replace node `quelle` by node `ziel` everywhere. */
export function verbindeKnoten(p: Projekt, quelle: string, ziel: string): Projekt {
  const gesehen: Wand[] = [];
  const entfernt = new Set<string>();
  for (const w of p.waende) {
    const n = { ...w, von: w.von === quelle ? ziel : w.von, bis: w.bis === quelle ? ziel : w.bis };
    if (n.von === n.bis || gesehen.some((g) => verbindet(g, n.von, n.bis))) {
      entfernt.add(w.id);
      continue;
    }
    gesehen.push(n);
  }
  const q: Projekt = {
    ...p,
    knoten: p.knoten.filter((k) => k.id !== quelle),
    waende: gesehen,
    oeffnungen: p.oeffnungen.filter((o) => !entfernt.has(o.wandId)),
  };
  return oeffnungenEinpassen(entferneLoseKnoten(q));
}

/** Set the length of a wall by moving its `bis` node along the wall direction. */
export function setzeWandLaenge(p: Projekt, wandId: string, laenge: number): Projekt {
  const w = findeWand(p, wandId);
  if (!w || !(laenge >= MIN_WANDLAENGE)) return p;
  const { a, b } = endpunkte(p, w);
  const ziel = plus(a, mal(normiert(minus(b, a)), laenge));
  return verschiebeKnoten(p, w.bis, ziel, 0);
}

export function aendereWand(p: Projekt, wandId: string, aenderung: Partial<Pick<Wand, 'dicke' | 'art'>>): Projekt {
  return { ...p, waende: p.waende.map((w) => (w.id === wandId ? { ...w, ...aenderung } : w)) };
}

/** Scale all node positions around a point (used when the floor plan scale is calibrated after drawing). */
export function skaliereProjekt(p: Projekt, faktor: number, um: Punkt = { x: 0, y: 0 }): Projekt {
  if (!(faktor > 0) || faktor === 1) return p;
  const knoten = p.knoten.map((k) => {
    const n = rundePunkt(plus(um, mal(minus(k, um), faktor)));
    return { ...k, x: n.x, y: n.y };
  });
  const oeffnungen = p.oeffnungen.map((o) => ({ ...o, abstand: Number((o.abstand * faktor).toFixed(4)) }));
  return oeffnungenEinpassen({ ...p, knoten, oeffnungen });
}
