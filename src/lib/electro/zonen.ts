// Installation zones for concealed cables in walls ("Hinter der Wand"), following DIN 18015-3:
// - horizontal zones ZW-o (15 to 45 cm below the finished ceiling), ZW-u (15 to 45 cm above the finished
//   floor) and ZW-m (90 to 120 cm above the floor, only in rooms with worktops at the walls, e.g. kitchen, bath);
// - vertical zones ZS-t / ZS-f (10 to 30 cm beside the edges of doors and windows) and ZS-e (10 to 30 cm
//   from room corners), from floor to ceiling.
// Simplifications (planning aid, shown as such in the UI): edges are measured on the clear room polygon
// and on the openings' clear width, not on the shell (Rohbau); horizontal zones are interrupted where an
// opening covers their height; vertical zones are cut where they would run through an opening.
// Pure TS on the project model.
import { type Elektro, type Projekt, knotenMap } from '../geometry/projekt.ts';
import { wandAbschnitte } from '../geometry/ausstattung.ts';
import { oeffnungsLage } from '../geometry/oeffnungen.ts';
import { raumHoehe } from '../geometry/raeume.ts';
import { type Punkt, abstand, lerp, projiziere } from '../geometry/vektor.ts';
import { moebelVon } from '../materials/moebel.ts';
import { raumArt } from '../materials/stilpakete.ts';

export type ZonenArt = 'ZW-o' | 'ZW-u' | 'ZW-m' | 'ZS-t' | 'ZS-f' | 'ZS-e';

export const ZONEN_NAME: Record<ZonenArt, string> = {
  'ZW-o': 'Waagerecht oben (15–45 cm unter der Decke)',
  'ZW-u': 'Waagerecht unten (15–45 cm über dem Boden)',
  'ZW-m': 'Waagerecht mittig (90–120 cm, Räume mit Arbeitsflächen)',
  'ZS-t': 'Senkrecht neben Türen (10–30 cm)',
  'ZS-f': 'Senkrecht neben Fenstern (10–30 cm)',
  'ZS-e': 'Senkrecht an Raumecken (10–30 cm)',
};

/** Zone limits in metres (DIN 18015-3). */
export const ZONEN_MASSE = {
  waagerecht: { abstandMin: 0.15, abstandMax: 0.45, mitteUnten: 0.9, mitteOben: 1.2 },
  senkrecht: { abstandMin: 0.1, abstandMax: 0.3 },
} as const;

export interface Zone {
  art: ZonenArt;
  raumId: string;
  wandId: string;
  seite: 'links' | 'rechts';
  /** Start and end on the room's inner wall surface (plan metres), in room order. */
  von: Punkt;
  bis: Punkt;
  /** Height range above the finished floor (metres). */
  unten: number;
  oben: number;
}

export const istWaagerecht = (a: ZonenArt) => a.startsWith('ZW');

type Intervall = [number, number];

/** a minus all intervals in `weg` (sorted result, pieces shorter than 1 cm dropped). */
export function intervallMinus(a: Intervall, weg: readonly Intervall[]): Intervall[] {
  let teile: Intervall[] = [a];
  for (const [w0, w1] of weg) {
    const neu: Intervall[] = [];
    for (const [t0, t1] of teile) {
      if (w1 <= t0 || w0 >= t1) neu.push([t0, t1]);
      else {
        if (w0 > t0) neu.push([t0, w0]);
        if (w1 < t1) neu.push([w1, t1]);
      }
    }
    teile = neu;
  }
  return teile.filter(([t0, t1]) => t1 - t0 >= 0.01).sort((x, y) => x[0] - y[0]);
}

/** True when the room has worktops at the walls (kitchen, bath, or a kitchen/vanity unit placed inside). */
export function hatArbeitsflaechen(p: Projekt, raumId: string): boolean {
  const r = p.raeume.find((x) => x.id === raumId);
  if (!r) return false;
  const art = raumArt(r.name);
  if (art === 'kueche' || art === 'bad') return true;
  return p.einrichtung.some((m) => m.raumId === raumId && moebelVon(m.typ)?.arbeitsflaeche);
}

/** All wall installation zones of one room. */
export function installationsZonen(p: Projekt, raumId: string): Zone[] {
  const r = p.raeume.find((x) => x.id === raumId);
  if (!r) return [];
  const km = knotenMap(p);
  const h = raumHoehe(p, r);
  const { abstandMin: wMin, abstandMax: wMax, mitteUnten, mitteOben } = ZONEN_MASSE.waagerecht;
  const { abstandMin: sMin, abstandMax: sMax } = ZONEN_MASSE.senkrecht;
  const waagerecht: Array<[ZonenArt, number, number]> = [
    ['ZW-o', h - wMax, h - wMin],
    ['ZW-u', wMin, wMax],
  ];
  if (hatArbeitsflaechen(p, raumId) && mitteOben < h - wMax) waagerecht.push(['ZW-m', mitteUnten, mitteOben]);
  const zonen: Zone[] = [];
  for (const ab of wandAbschnitte(p, raumId, km)) {
    const L = ab.laengeInnen;
    if (L < 0.05) continue;
    const punktBei = (u: number) => lerp(ab.innenA, ab.innenB, Math.max(0, Math.min(1, u / L)));
    // openings of this wall, as intervals along the inner surface
    const oeffnungen = p.oeffnungen
      .filter((o) => o.wandId === ab.wandId)
      .flatMap((o) => {
        const lage = oeffnungsLage(p, o, km);
        if (!lage) return [];
        const u0 = projiziere(lage.a, ab.innenA, ab.innenB).t * L;
        const u1 = projiziere(lage.b, ab.innenA, ab.innenB).t * L;
        return [{ o, u0: Math.min(u0, u1), u1: Math.max(u0, u1) }];
      });
    const neu = (art: ZonenArt, u0: number, u1: number, unten: number, oben: number) =>
      zonen.push({ art, raumId, wandId: ab.wandId, seite: ab.seite, von: punktBei(u0), bis: punktBei(u1), unten, oben });

    for (const [art, unten, oben] of waagerecht) {
      const weg = oeffnungen.filter(({ o }) => o.bruestung < oben && o.bruestung + o.hoehe > unten).map(({ u0, u1 }): Intervall => [u0, u1]);
      for (const [u0, u1] of intervallMinus([0, L], weg)) neu(art, u0, u1, unten, oben);
    }
    const senkrecht: Array<[ZonenArt, number, number]> = [
      ['ZS-e', sMin, sMax],
      ['ZS-e', L - sMax, L - sMin],
    ];
    for (const { o, u0, u1 } of oeffnungen) {
      const art: ZonenArt = o.art === 'tuer' ? 'ZS-t' : 'ZS-f';
      senkrecht.push([art, u0 - sMax, u0 - sMin], [art, u1 + sMin, u1 + sMax]);
    }
    const alleOeffnungen = oeffnungen.map(({ u0, u1 }): Intervall => [u0, u1]);
    for (const [art, a0, a1] of senkrecht) {
      const geklemmt: Intervall = [Math.max(0, a0), Math.min(L, a1)];
      if (geklemmt[1] - geklemmt[0] < 0.01) continue;
      for (const [u0, u1] of intervallMinus(geklemmt, alleOeffnungen)) neu(art, u0, u1, 0, h);
    }
  }
  return zonen;
}

/** Zones of all rooms. */
export const alleZonen = (p: Projekt): Zone[] => p.raeume.flatMap((r) => installationsZonen(p, r.id));

/**
 * Whether a wall point sits inside an installation zone of its room (tolerance 2 cm).
 * null for ceiling/floor points and points without a room (zones do not apply).
 */
export function inZone(e: Elektro, zonen: readonly Zone[]): boolean | null {
  if (e.ort !== 'wand' || !e.raumId || !e.wandId) return null;
  const tol = 0.02;
  const pt = { x: e.x, y: e.y };
  return zonen.some((z) => {
    if (z.wandId !== e.wandId || z.seite !== e.seite || z.raumId !== e.raumId) return false;
    if (e.hoehe < z.unten - tol || e.hoehe > z.oben + tol) return false;
    const l = abstand(z.von, z.bis);
    if (l < 1e-9) return false;
    const pr = projiziere(pt, z.von, z.bis);
    return pr.t * l >= -tol && pr.t * l <= l + tol && pr.abstand < 0.05;
  });
}
