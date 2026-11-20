// Data for the 3D model (pure, no three.js): one box per wall along its centre line, extended into
// the neighbouring walls so corners close, plus the openings to cut out (CSG in the scene builder)
// and the floor polygons per room.
import { type OeffnungArt, type Projekt, knotenMap } from './projekt.ts';
import { nettoPolygon, raumHoehe, wandHoehe, wandZwischen } from './raeume.ts';
import { type Punkt, abstand, kreuz, minus, normiert, plus, mal, skalar } from './vektor.ts';

export interface OeffnungsKoerper {
  id: string;
  art: OeffnungArt;
  /** Distance of the opening's start from the wall body's start (metres). */
  von: number;
  breite: number;
  hoehe: number;
  bruestung: number;
  anschlag: 'links' | 'rechts';
  aufschlag: 'links' | 'rechts';
}

export interface WandKoerper {
  wandId: string;
  /** Start and end of the wall body (centre line, extended at junctions). */
  a: Punkt;
  b: Punkt;
  laenge: number;
  dicke: number;
  hoehe: number;
  /** Rotation around the vertical axis: angle of a->b in plan coordinates (radians). */
  winkel: number;
  oeffnungen: OeffnungsKoerper[];
}

export interface BodenFlaeche {
  raumId: string;
  name: string;
  polygon: Punkt[];
  hoehe: number;
}

const MAX_VERLAENGERUNG = 0.6;

/** How far a wall must reach past a junction node so the corner is closed. */
function verlaengerung(eigen: Punkt, eigeneDicke: number, nachbarn: Array<{ richtung: Punkt; dicke: number }>): number {
  // a straight continuation (e.g. the other half of a wall split by a T-junction) closes the joint already
  if (nachbarn.some((n) => Math.abs(kreuz(eigen, n.richtung)) < 0.05 && skalar(eigen, n.richtung) > 0)) return 0;
  let ext = 0;
  for (const n of nachbarn) {
    const sin = Math.abs(kreuz(eigen, n.richtung));
    if (sin < 0.05) continue; // collinear continuation: no overlap needed
    const cos = skalar(eigen, n.richtung);
    const e = n.dicke / 2 / sin + (eigeneDicke / 2) * Math.abs(cos / sin);
    ext = Math.max(ext, Math.min(e, MAX_VERLAENGERUNG));
  }
  return ext;
}

export function wandKoerper(p: Projekt): WandKoerper[] {
  const km = knotenMap(p);
  return p.waende.flatMap((w) => {
    const A = km.get(w.von);
    const B = km.get(w.bis);
    if (!A || !B) return [];
    const l = abstand(A, B);
    if (l < 1e-6) return [];
    const r = normiert(minus(B, A));
    const nachbarnAn = (knoten: string) =>
      p.waende
        .filter((x) => x.id !== w.id && (x.von === knoten || x.bis === knoten))
        .map((x) => {
          const anderer = km.get(x.von === knoten ? x.bis : x.von)!;
          const k = km.get(knoten)!;
          return { richtung: normiert(minus(anderer, k)), dicke: x.dicke };
        });
    const extA = verlaengerung(mal(r, -1), w.dicke, nachbarnAn(w.von));
    const extB = verlaengerung(r, w.dicke, nachbarnAn(w.bis));
    const a = plus(A, mal(r, -extA));
    const b = plus(B, mal(r, extB));
    const oeffnungen = p.oeffnungen
      .filter((o) => o.wandId === w.id)
      .map((o) => ({
        id: o.id,
        art: o.art,
        von: extA + o.abstand - o.breite / 2,
        breite: o.breite,
        hoehe: o.hoehe,
        bruestung: o.bruestung,
        anschlag: o.anschlag,
        aufschlag: o.aufschlag,
      }));
    return [{ wandId: w.id, a, b, laenge: l + extA + extB, dicke: w.dicke, hoehe: wandHoehe(p, w), winkel: Math.atan2(r.y, r.x), oeffnungen }];
  });
}

export function bodenFlaechen(p: Projekt): BodenFlaeche[] {
  const km = knotenMap(p);
  const wz = wandZwischen(p);
  return p.raeume.map((r) => ({ raumId: r.id, name: r.name, polygon: nettoPolygon(p, r.knoten, km, wz), hoehe: raumHoehe(p, r) }));
}
