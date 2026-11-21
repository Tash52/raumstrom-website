// Materials per room as text (side panel; planner-export uses it for the PDF summary in Phase 6).
import type { MaterialRef, Projekt } from '../geometry/projekt.ts';
import { wandAbschnitte } from '../geometry/ausstattung.ts';
import { farbName } from './farben.ts';
import { beschreibeRef } from './katalog.ts';
import { moebelVon } from './moebel.ts';

export interface RaumMaterialien {
  raumId: string;
  raum: string;
  /** Rows like { bereich: "Wände", text: "Kalkputz, Haferweiß" }. Only parts that are set. */
  zeilen: Array<{ bereich: string; text: string }>;
  /** Wall sides with their own finish (accent walls, single splash-backs). */
  abweichendeWandseiten: number;
  stilpaket: string | null;
}

export function raumMaterialien(p: Projekt): RaumMaterialien[] {
  return p.raeume.map((r) => {
    const g = r.gestaltung;
    const zeilen: RaumMaterialien['zeilen'] = [];
    const add = (bereich: string, ref: MaterialRef | null) => {
      if (ref) zeilen.push({ bereich, text: beschreibeRef(ref, farbName) });
    };
    add('Wände', g.wand);
    add('Fliesen', g.fliesen);
    add('Boden', g.boden);
    add('Sockelleiste', g.sockelleiste);
    add('Decke', g.decke);
    const seiten = new Set(wandAbschnitte(p, r.id).map((a) => `${a.wandId}:${a.seite}`));
    const abweichend = p.wandSeiten.filter((s) => seiten.has(`${s.wandId}:${s.seite}`)).length;
    const moebel = p.einrichtung.filter((m) => m.raumId === r.id).map((m) => moebelVon(m.typ)?.name ?? m.typ);
    if (moebel.length) zeilen.push({ bereich: 'Einrichtung (nur Visualisierung)', text: moebel.join(', ') });
    return { raumId: r.id, raum: r.name, zeilen, abweichendeWandseiten: abweichend, stilpaket: r.stilpaket };
  });
}
