// Templates (typical floor plans) to start without an upload. Built with the same graph operations
// the editor uses, so walls, rooms and openings are consistent. Dimensions are centre-line metres.
import { type OeffnungArt, type Projekt, WANDDICKE, leeresProjekt } from './projekt.ts';
import { platziereOeffnung } from './oeffnungen.ts';
import { punktImPolygon } from './polygon.ts';
import { mitRaeumen, raumPolygon } from './raeume.ts';
import { fuegeWandHinzu } from './waende.ts';

type W = [x1: number, y1: number, x2: number, y2: number];
type O = [art: OeffnungArt, x: number, y: number, breite?: number, extra?: { hoehe?: number; bruestung?: number }];

interface VorlageDef {
  id: string;
  titel: string;
  beschreibung: string;
  aussen: { breite: number; tiefe: number; dicke?: number };
  innen: W[];
  raeume: Array<[name: string, x: number, y: number]>;
  oeffnungen: O[];
}

const KLEINES_FENSTER = { hoehe: 0.8, bruestung: 1.4 };

const DEFS: VorlageDef[] = [
  {
    id: '1-zimmer',
    titel: '1-Zimmer-Wohnung',
    beschreibung: 'Wohnraum mit Kochnische, Bad, Flur',
    aussen: { breite: 6.5, tiefe: 5 },
    innen: [
      [2.2, 0, 2.2, 5],
      [0, 2.4, 2.2, 2.4],
    ],
    raeume: [
      ['Bad', 1.1, 1.2],
      ['Flur', 1.1, 3.7],
      ['Wohnraum', 4.3, 2.5],
    ],
    oeffnungen: [
      ['tuer', 0, 3.7, 1.01],
      ['tuer', 1.1, 2.4, 0.76],
      ['tuer', 2.2, 3.7],
      ['fenster', 1.1, 0, 0.6, KLEINES_FENSTER],
      ['fenster', 4.3, 0, 1.26],
      ['fenster', 6.5, 2.5, 1.26],
    ],
  },
  {
    id: '2-zimmer',
    titel: '2-Zimmer-Wohnung',
    beschreibung: 'Wohnzimmer, Schlafzimmer, Küche, Bad, Flur',
    aussen: { breite: 9, tiefe: 6 },
    innen: [
      [3.6, 0, 3.6, 6],
      [0, 3.6, 3.6, 3.6],
      [2.2, 3.6, 2.2, 6],
      [6.5, 3.8, 9, 3.8],
      [6.5, 3.8, 6.5, 6],
    ],
    raeume: [
      ['Schlafzimmer', 1.8, 1.8],
      ['Bad', 1.1, 4.8],
      ['Flur', 2.9, 4.8],
      ['Wohnzimmer', 5, 2],
      ['Küche', 7.7, 4.9],
    ],
    oeffnungen: [
      ['tuer', 2.9, 6, 1.01],
      ['tuer', 2.2, 4.8, 0.76],
      ['tuer', 2.9, 3.6],
      ['tuer', 3.6, 4.8],
      ['tuer', 6.5, 4.9],
      ['fenster', 1.8, 0],
      ['fenster', 5.2, 0, 1.26],
      ['fenster', 7.6, 0, 1.26],
      ['fenster', 9, 4.9],
      ['fenster', 1.1, 6, 0.6, KLEINES_FENSTER],
      ['fenster', 5, 6],
    ],
  },
  {
    id: '3-zimmer',
    titel: '3-Zimmer-Wohnung',
    beschreibung: 'Wohnzimmer, zwei Zimmer, Küche, Bad, Abstellraum, Flur',
    aussen: { breite: 11, tiefe: 8 },
    innen: [
      [0, 3.5, 8, 3.5],
      [0, 5, 8, 5],
      [8, 0, 8, 8],
      [4, 0, 4, 3.5],
      [2.8, 5, 2.8, 8],
      [4.2, 5, 4.2, 8],
    ],
    raeume: [
      ['Schlafzimmer', 2, 1.75],
      ['Kinderzimmer', 6, 1.75],
      ['Flur', 4, 4.25],
      ['Bad', 1.4, 6.5],
      ['Abstellraum', 3.5, 6.5],
      ['Küche', 6.1, 6.5],
      ['Wohnzimmer', 9.5, 4],
    ],
    oeffnungen: [
      ['tuer', 0, 4.25, 1.01],
      ['tuer', 2, 3.5],
      ['tuer', 6, 3.5],
      ['tuer', 1.4, 5, 0.76],
      ['tuer', 3.5, 5, 0.76],
      ['tuer', 6.1, 5],
      ['tuer', 8, 4.25],
      ['fenster', 2, 0],
      ['fenster', 6, 0],
      ['fenster', 9.5, 0, 1.51],
      ['fenster', 11, 2, 1.26],
      ['fenster', 11, 6, 1.26],
      ['fenster', 1.4, 8, 0.6, KLEINES_FENSTER],
      ['fenster', 6.1, 8],
      ['fenster', 9.5, 8, 1.51],
    ],
  },
  {
    id: 'efh-eg',
    titel: 'Einfamilienhaus, Erdgeschoss',
    beschreibung: 'Wohnen und Essen, Küche, Arbeitszimmer, Diele, Gäste-WC, Hauswirtschaftsraum, Treppe',
    aussen: { breite: 12, tiefe: 10, dicke: 0.365 },
    innen: [
      [5, 0, 5, 10],
      [0, 4, 5, 4],
      [2.2, 4, 2.2, 10],
      [0, 6.5, 2.2, 6.5],
      [5, 6, 12, 6],
      [8, 6, 8, 10],
    ],
    raeume: [
      ['Arbeitszimmer', 2.5, 2],
      ['Diele', 3.6, 7],
      ['Gäste-WC', 1.1, 5.25],
      ['Hauswirtschaftsraum', 1.1, 8.25],
      ['Wohnen und Essen', 8.5, 3],
      ['Treppe', 6.5, 8],
      ['Küche', 10, 8],
    ],
    oeffnungen: [
      ['tuer', 3.6, 10, 1.135],
      ['tuer', 3.6, 4],
      ['tuer', 2.2, 5.25, 0.76],
      ['tuer', 2.2, 8.25],
      ['tuer', 5, 5, 1.01],
      ['tuer', 5, 8],
      ['tuer', 10, 6],
      ['fenster', 2.5, 0, 1.26],
      ['fenster', 7, 0, 2.01],
      ['fenster', 10, 0, 1.51],
      ['fenster', 12, 3, 1.51],
      ['fenster', 12, 8, 1.26],
      ['fenster', 0, 2, 1.26],
      ['fenster', 0, 5.25, 0.6, KLEINES_FENSTER],
      ['fenster', 0, 8.25],
      ['fenster', 10, 10, 1.26],
    ],
  },
];

export interface VorlageInfo {
  id: string;
  titel: string;
  beschreibung: string;
}

export const VORLAGEN: VorlageInfo[] = DEFS.map(({ id, titel, beschreibung }) => ({ id, titel, beschreibung }));

function baue(def: VorlageDef): Projekt {
  let p = { ...leeresProjekt(def.titel), vorlage: def.id };
  const { breite: B, tiefe: T } = def.aussen;
  const aussen = { dicke: def.aussen.dicke ?? WANDDICKE.aussen, art: 'aussen' as const };
  const innen = { dicke: WANDDICKE.innen, art: 'innen' as const };
  const rand: W[] = [
    [0, 0, B, 0],
    [B, 0, B, T],
    [B, T, 0, T],
    [0, T, 0, 0],
  ];
  for (const [x1, y1, x2, y2] of rand) p = fuegeWandHinzu(p, { x: x1, y: y1 }, { x: x2, y: y2 }, aussen).projekt;
  for (const [x1, y1, x2, y2] of def.innen) p = fuegeWandHinzu(p, { x: x1, y: y1 }, { x: x2, y: y2 }, innen).projekt;
  p = mitRaeumen(p);
  const raeume = p.raeume.map((r) => {
    const poly = raumPolygon(p, r.knoten);
    const treffer = def.raeume.find(([, x, y]) => punktImPolygon({ x, y }, poly));
    return treffer ? { ...r, name: treffer[0] } : r;
  });
  p = { ...p, raeume };
  for (const [art, x, y, breite, extra] of def.oeffnungen) {
    const r = platziereOeffnung(p, art, { x, y }, 0.05, { ...(breite ? { breite } : {}), ...extra });
    if (!r.ok) throw new Error(`Vorlage ${def.id}: ${art} bei ${x}/${y}: ${r.fehler}`);
    p = r.projekt;
  }
  return p;
}

/** A fresh copy of a template project. */
export function ladeVorlage(id: string): Projekt | null {
  const def = DEFS.find((d) => d.id === id);
  return def ? baue(def) : null;
}
