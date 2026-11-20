// Room detection (pure): closed rooms are the bounded faces of the planar wall graph.
// Dangling walls are ignored. Detected rooms keep id, name and height of matching earlier rooms,
// so renaming survives editing.
import { type Projekt, type Raum, type Wand, knotenMap, neueId } from './projekt.ts';
import { beschriftungsPunkt, einruecken, flaeche, punktImPolygon, vorzeichenFlaeche } from './polygon.ts';
import type { Punkt } from './vektor.ts';

/** Faces smaller than this (m², centre line) are not rooms (e.g. a wall drawn twice slightly offset). */
export const MIN_RAUMFLAECHE = 0.3;

const kante = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function wandZwischen(p: Projekt): Map<string, Wand> {
  return new Map(p.waende.map((w) => [kante(w.von, w.bis), w]));
}

/** Closed node cycles (positively oriented) of the wall graph, i.e. candidate rooms. */
export function findeFlaechen(p: Projekt): string[][] {
  const km = knotenMap(p);
  const nachbarn = new Map<string, Set<string>>();
  for (const w of p.waende) {
    if (!km.has(w.von) || !km.has(w.bis) || w.von === w.bis) continue;
    if (!nachbarn.has(w.von)) nachbarn.set(w.von, new Set());
    if (!nachbarn.has(w.bis)) nachbarn.set(w.bis, new Set());
    nachbarn.get(w.von)!.add(w.bis);
    nachbarn.get(w.bis)!.add(w.von);
  }
  // prune dangling walls (nodes of degree 1), repeatedly
  let geaendert = true;
  while (geaendert) {
    geaendert = false;
    for (const [k, n] of nachbarn) {
      if (n.size <= 1) {
        for (const m of n) nachbarn.get(m)?.delete(k);
        nachbarn.delete(k);
        geaendert = true;
      }
    }
  }
  const sortiert = new Map<string, string[]>();
  for (const [k, n] of nachbarn) {
    const a = km.get(k)!;
    sortiert.set(
      k,
      [...n].sort((x, y) => {
        const px = km.get(x)!;
        const py = km.get(y)!;
        return Math.atan2(px.y - a.y, px.x - a.x) - Math.atan2(py.y - a.y, py.x - a.x);
      }),
    );
  }
  const besucht = new Set<string>();
  const flaechen: string[][] = [];
  for (const [u, liste] of sortiert) {
    for (const v of liste) {
      if (besucht.has(`${u}>${v}`)) continue;
      const zyklus: string[] = [];
      let a = u;
      let b = v;
      for (let schutz = 0; schutz < 10_000; schutz++) {
        besucht.add(`${a}>${b}`);
        zyklus.push(a);
        const nb = sortiert.get(b)!;
        const i = nb.indexOf(a);
        const c = nb[(i - 1 + nb.length) % nb.length]!;
        a = b;
        b = c;
        if (a === u && b === v) break;
      }
      const pkt = zyklus.map((id) => km.get(id)!);
      if (vorzeichenFlaeche(pkt) > 0) flaechen.push(zyklus);
    }
  }
  return flaechen;
}

export function raumPolygon(p: Projekt, knotenIds: readonly string[], km = knotenMap(p)): Punkt[] {
  return knotenIds.map((id) => km.get(id)).filter((k): k is NonNullable<typeof k> => Boolean(k));
}

/** Clear room polygon: centre-line polygon moved inwards by half the thickness of each wall. */
export function nettoPolygon(p: Projekt, knotenIds: readonly string[], km = knotenMap(p), wz = wandZwischen(p)): Punkt[] {
  const pkt = raumPolygon(p, knotenIds, km);
  const d = knotenIds.map((id, i) => (wz.get(kante(id, knotenIds[(i + 1) % knotenIds.length]!))?.dicke ?? 0) / 2);
  return einruecken(pkt, d);
}

export function nettoFlaeche(p: Projekt, knotenIds: readonly string[], km = knotenMap(p), wz = wandZwischen(p)): number {
  return Number(flaeche(nettoPolygon(p, knotenIds, km, wz)).toFixed(2));
}

/** Suggested room name from the clear area; numbered when taken. Editable by the user. */
export function nameVorschlag(flaecheNetto: number, vergeben: ReadonlySet<string>): string {
  let basis: string;
  if (flaecheNetto < 2.5) basis = 'Abstellraum';
  else if (flaecheNetto < 7) basis = 'Bad';
  else if (flaecheNetto < 18 || vergeben.has('Wohnzimmer')) basis = 'Zimmer';
  else basis = 'Wohnzimmer';
  if (!vergeben.has(basis)) return basis;
  for (let i = 2; ; i++) if (!vergeben.has(`${basis} ${i}`)) return `${basis} ${i}`;
}

/**
 * Recompute the rooms of a project from its walls. Rooms whose corner set is unchanged keep everything;
 * otherwise an old room whose label point lies inside a new face hands over id, name and height.
 * `vorher`: the project before the edit (for the old room positions), defaults to `p`.
 */
export function mitRaeumen(p: Projekt, vorher: Projekt = p): Projekt {
  const km = knotenMap(p);
  const kmVorher = knotenMap(vorher);
  const wz = wandZwischen(p);
  const flaechen = findeFlaechen(p).filter((f) => flaeche(raumPolygon(p, f, km)) >= MIN_RAUMFLAECHE);
  const alt = p.raeume;
  const altPunkte = new Map(
    p.raeume.map((r) => {
      // label points from the geometry before the edit (nodes may have been removed since)
      const pkt = r.knoten.map((id) => kmVorher.get(id) ?? km.get(id)).filter(Boolean) as Punkt[];
      return [r.id, pkt.length >= 3 ? beschriftungsPunkt(pkt) : null] as const;
    }),
  );
  const schluessel = (ids: readonly string[]) => [...ids].sort().join(',');
  const vergeben = new Set<string>();
  const benutzt = new Set<string>();
  const zuordnung: Array<{ f: string[]; alt?: Raum }> = flaechen.map((f) => ({ f }));

  // 1. identical corner set
  for (const z of zuordnung) {
    const s = schluessel(z.f);
    const r = alt.find((x) => !benutzt.has(x.id) && schluessel(x.knoten) === s);
    if (r) {
      z.alt = r;
      benutzt.add(r.id);
    }
  }
  // 2. old label point inside the new face (largest old room first)
  for (const z of zuordnung) {
    if (z.alt) continue;
    const poly = raumPolygon(p, z.f, km);
    const r = alt
      .filter((x) => !benutzt.has(x.id))
      .sort((x, y) => y.flaeche - x.flaeche)
      .find((x) => {
        const lp = altPunkte.get(x.id);
        return lp && punktImPolygon(lp, poly);
      });
    if (r) {
      z.alt = r;
      benutzt.add(r.id);
    }
  }
  for (const z of zuordnung) if (z.alt) vergeben.add(z.alt.name);

  const raeume: Raum[] = [];
  // stable order: old rooms first in their order, new rooms by size
  const neueZuerstGross = [...zuordnung].sort((x, y) => {
    if (x.alt && y.alt) return p.raeume.indexOf(x.alt) - p.raeume.indexOf(y.alt);
    if (x.alt) return -1;
    if (y.alt) return 1;
    return flaeche(raumPolygon(p, y.f, km)) - flaeche(raumPolygon(p, x.f, km));
  });
  for (const z of neueZuerstGross) {
    const fl = nettoFlaeche(p, z.f, km, wz);
    if (z.alt) {
      raeume.push({ ...z.alt, knoten: z.f, flaeche: fl });
      continue;
    }
    const name = nameVorschlag(fl, vergeben);
    vergeben.add(name);
    raeume.push({ id: neueId('r', [...p.raeume, ...raeume]), name, knoten: z.f, hoehe: null, flaeche: fl });
  }
  return { ...p, raeume };
}

export const raumHoehe = (p: Projekt, r: Raum): number => r.hoehe ?? p.standardHoehe;

/** Wall height: the highest adjacent room, else the project's standard height. */
export function wandHoehe(p: Projekt, w: Wand): number {
  let h = 0;
  for (const r of p.raeume) {
    const n = r.knoten.length;
    for (let i = 0; i < n; i++) {
      if (kante(r.knoten[i]!, r.knoten[(i + 1) % n]!) === kante(w.von, w.bis)) h = Math.max(h, raumHoehe(p, r));
    }
  }
  return h || p.standardHoehe;
}

/** Room containing a point (centre-line polygon). */
export function raumBei(p: Projekt, pt: Punkt): Raum | undefined {
  const km = knotenMap(p);
  return [...p.raeume].sort((a, b) => a.flaeche - b.flaeche).find((r) => punktImPolygon(pt, raumPolygon(p, r.knoten, km)));
}
