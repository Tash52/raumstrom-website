// Electrical bill of materials per room (Briefing 7.2). planner-export uses `elektroStueckliste` for the
// PDF summary in Phase 6; the planner side panel shows the same data.
import type { Projekt } from '../geometry/projekt.ts';
import { ELEKTRO_TYPEN, type ElektroKategorie, KATEGORIEN, elektroTypVon } from './katalog.ts';
import { type Zone, alleZonen, inZone } from './zonen.ts';

export interface StuecklistenPosten {
  typ: string;
  name: string;
  funktion: string;
  kategorie: ElektroKategorie | 'unbekannt';
  anzahl: number;
  /** Wall points of this type outside every installation zone (cable route to check). */
  ausserhalbZone: number;
}

export interface RaumStueckliste {
  /** null: points outside every room (e.g. exterior wall outside, terrace). */
  raumId: string | null;
  raum: string;
  posten: StuecklistenPosten[];
  summe: number;
}

const KAT_REIHENFOLGE = new Map<string, number>(KATEGORIEN.map((k, i) => [k.id, i]));
const TYP_REIHENFOLGE = new Map<string, number>(ELEKTRO_TYPEN.map((x, i) => [x.id, i]));

/** Bill of materials per room in room order, then "Außerhalb der Räume" (only if used). */
export function elektroStueckliste(p: Projekt, zonen: readonly Zone[] = alleZonen(p)): RaumStueckliste[] {
  const gruppen = new Map<string | null, Map<string, StuecklistenPosten>>();
  for (const e of p.elektro) {
    const raumId = e.raumId && p.raeume.some((r) => r.id === e.raumId) ? e.raumId : null;
    let g = gruppen.get(raumId);
    if (!g) gruppen.set(raumId, (g = new Map()));
    const typ = elektroTypVon(e.typ);
    let posten = g.get(e.typ);
    if (!posten) {
      posten = { typ: e.typ, name: typ?.name ?? e.typ, funktion: typ?.funktion ?? 'Unbekannter Typ', kategorie: typ?.kategorie ?? 'unbekannt', anzahl: 0, ausserhalbZone: 0 };
      g.set(e.typ, posten);
    }
    posten.anzahl++;
    if (inZone(e, zonen) === false) posten.ausserhalbZone++;
  }
  const sortiere = (m: Map<string, StuecklistenPosten>) =>
    [...m.values()].sort(
      (a, b) =>
        (KAT_REIHENFOLGE.get(a.kategorie) ?? 99) - (KAT_REIHENFOLGE.get(b.kategorie) ?? 99) ||
        (TYP_REIHENFOLGE.get(a.typ) ?? 999) - (TYP_REIHENFOLGE.get(b.typ) ?? 999) ||
        a.typ.localeCompare(b.typ),
    );
  const liste: RaumStueckliste[] = [];
  for (const r of p.raeume) {
    const g = gruppen.get(r.id);
    if (!g) continue;
    const posten = sortiere(g);
    liste.push({ raumId: r.id, raum: r.name, posten, summe: posten.reduce((s, x) => s + x.anzahl, 0) });
  }
  const aussen = gruppen.get(null);
  if (aussen) {
    const posten = sortiere(aussen);
    liste.push({ raumId: null, raum: 'Außerhalb der Räume', posten, summe: posten.reduce((s, x) => s + x.anzahl, 0) });
  }
  return liste;
}

/** Totals over the whole project, same order as the per-room lists. */
export function elektroGesamt(liste: readonly RaumStueckliste[]): StuecklistenPosten[] {
  const m = new Map<string, StuecklistenPosten>();
  for (const r of liste)
    for (const x of r.posten) {
      const g = m.get(x.typ);
      if (g) {
        g.anzahl += x.anzahl;
        g.ausserhalbZone += x.ausserhalbZone;
      } else m.set(x.typ, { ...x });
    }
  return [...m.values()].sort(
    (a, b) => (KAT_REIHENFOLGE.get(a.kategorie) ?? 99) - (KAT_REIHENFOLGE.get(b.kategorie) ?? 99) || (TYP_REIHENFOLGE.get(a.typ) ?? 999) - (TYP_REIHENFOLGE.get(b.typ) ?? 999),
  );
}
