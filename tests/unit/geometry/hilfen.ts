// Test helpers: build projects from wall lists.
import { type Projekt, type WandOptionen, WANDDICKE, fuegeWandHinzu, leeresProjekt, mitRaeumen } from '../../../src/lib/geometry/index.ts';

export const AUSSEN: WandOptionen = { dicke: WANDDICKE.aussen, art: 'aussen' };
export const INNEN: WandOptionen = { dicke: WANDDICKE.innen, art: 'innen' };
export type Strecke = [number, number, number, number];

export function mitWaenden(waende: Strecke[], opt = INNEN, p: Projekt = leeresProjekt()): Projekt {
  let q = p;
  for (const [x1, y1, x2, y2] of waende) q = fuegeWandHinzu(q, { x: x1, y: y1 }, { x: x2, y: y2 }, opt).projekt;
  return mitRaeumen(q);
}

export const rechteck = (x: number, y: number, b: number, t: number): Strecke[] => [
  [x, y, x + b, y],
  [x + b, y, x + b, y + t],
  [x + b, y + t, x, y + t],
  [x, y + t, x, y],
];
