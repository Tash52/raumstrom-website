// Furniture catalogue (visualisation only): stylised low-poly pieces built from boxes and cylinders.
// Local coordinates in metres: x across the width (centred), y up from the floor, z along the depth
// (centred, +z = front). Plan rotation (Einrichtung.drehungGrad, clockwise on screen) maps to
// three.js rotation.y = -drehung.

export type Rolle = 'korpus' | 'polster' | 'holz' | 'weiss' | 'metall' | 'glas' | 'akzent' | 'kissen';

export interface Teil {
  form: 'quader' | 'zylinder';
  /** Centre of the part. */
  x: number;
  y: number;
  z: number;
  /** Size (quader: b × h × t; zylinder: b = diameter, h = height). */
  b: number;
  h: number;
  t: number;
  rolle: Rolle;
}

export interface MoebelEintrag {
  id: string;
  name: string;
  /** Footprint width (x) and depth (z) in metres, for the 2D plan and placement. */
  breite: number;
  tiefe: number;
  hoehe: number;
  teile: readonly Teil[];
  /** Wet rooms or kitchens: used by the installation-zone rule ZW-m and for suggestions. */
  arbeitsflaeche?: boolean;
}

const q = (x: number, y: number, z: number, b: number, h: number, t: number, rolle: Rolle): Teil => ({ form: 'quader', x, y, z, b, h, t, rolle });
const zyl = (x: number, y: number, z: number, d: number, h: number, rolle: Rolle): Teil => ({ form: 'zylinder', x, y, z, b: d, h, t: d, rolle });

const stuhl = (x: number, z: number, vorne: 1 | -1): Teil[] => [
  q(x, 0.45, z, 0.44, 0.05, 0.44, 'holz'),
  q(x, 0.7, z - vorne * 0.2, 0.44, 0.45, 0.04, 'holz'),
  q(x, 0.22, z, 0.38, 0.44, 0.38, 'metall'),
];

export const MOEBEL: readonly MoebelEintrag[] = [
  {
    id: 'moebel.sofa',
    name: 'Sofa',
    breite: 2.2,
    tiefe: 0.95,
    hoehe: 0.82,
    teile: [
      q(0, 0.22, 0.05, 2.2, 0.3, 0.85, 'polster'),
      q(0, 0.55, -0.37, 2.2, 0.55, 0.2, 'polster'),
      q(-1.02, 0.45, 0.05, 0.16, 0.35, 0.85, 'polster'),
      q(1.02, 0.45, 0.05, 0.16, 0.35, 0.85, 'polster'),
      q(-0.47, 0.42, 0.08, 0.9, 0.12, 0.62, 'kissen'),
      q(0.47, 0.42, 0.08, 0.9, 0.12, 0.62, 'kissen'),
      q(0, 0.035, 0.05, 2.0, 0.07, 0.7, 'metall'),
    ],
  },
  {
    id: 'moebel.bett',
    name: 'Bett (160 × 200 cm)',
    breite: 1.7,
    tiefe: 2.1,
    hoehe: 1.0,
    teile: [
      q(0, 0.2, 0.05, 1.7, 0.3, 2.0, 'holz'),
      q(0, 0.43, 0.08, 1.6, 0.18, 1.94, 'weiss'),
      q(0, 0.68, -1.0, 1.7, 0.75, 0.08, 'polster'),
      q(-0.4, 0.57, -0.75, 0.6, 0.12, 0.38, 'kissen'),
      q(0.4, 0.57, -0.75, 0.6, 0.12, 0.38, 'kissen'),
      q(0, 0.53, 0.45, 1.62, 0.05, 1.1, 'akzent'),
    ],
  },
  {
    id: 'moebel.tisch',
    name: 'Esstisch mit 4 Stühlen',
    breite: 1.6,
    tiefe: 1.7,
    hoehe: 0.76,
    teile: [
      q(0, 0.74, 0, 1.6, 0.04, 0.9, 'holz'),
      q(-0.7, 0.36, -0.36, 0.06, 0.72, 0.06, 'holz'),
      q(0.7, 0.36, -0.36, 0.06, 0.72, 0.06, 'holz'),
      q(-0.7, 0.36, 0.36, 0.06, 0.72, 0.06, 'holz'),
      q(0.7, 0.36, 0.36, 0.06, 0.72, 0.06, 'holz'),
      ...stuhl(-0.4, -0.62, -1),
      ...stuhl(0.4, -0.62, -1),
      ...stuhl(-0.4, 0.62, 1),
      ...stuhl(0.4, 0.62, 1),
    ],
  },
  {
    id: 'moebel.kueche',
    name: 'Küchenzeile (280 cm)',
    breite: 2.8,
    tiefe: 0.62,
    hoehe: 2.2,
    arbeitsflaeche: true,
    teile: [
      q(0, 0.05, 0.03, 2.8, 0.1, 0.55, 'metall'),
      q(0, 0.48, 0, 2.8, 0.76, 0.6, 'korpus'),
      q(0, 0.88, 0.01, 2.8, 0.04, 0.62, 'holz'),
      q(0.55, 0.905, 0.02, 0.6, 0.01, 0.5, 'metall'),
      q(-0.6, 0.905, 0.04, 0.5, 0.012, 0.42, 'metall'),
      q(0, 1.85, -0.13, 2.8, 0.7, 0.35, 'korpus'),
    ],
  },
  {
    id: 'moebel.waschtisch',
    name: 'Waschtisch',
    breite: 0.8,
    tiefe: 0.5,
    hoehe: 1.9,
    arbeitsflaeche: true,
    teile: [
      q(0, 0.62, 0, 0.8, 0.45, 0.48, 'korpus'),
      q(0, 0.86, 0.01, 0.8, 0.04, 0.5, 'weiss'),
      zyl(0, 0.88, 0.05, 0.38, 0.03, 'weiss'),
      q(0, 0.97, -0.17, 0.04, 0.18, 0.04, 'metall'),
      q(0, 1.5, -0.235, 0.7, 0.7, 0.02, 'glas'),
    ],
  },
  {
    id: 'moebel.wc',
    name: 'WC',
    breite: 0.4,
    tiefe: 0.6,
    hoehe: 0.8,
    teile: [
      q(0, 0.6, -0.27, 0.4, 0.4, 0.06, 'weiss'),
      zyl(0, 0.2, 0.05, 0.36, 0.4, 'weiss'),
      q(0, 0.2, -0.13, 0.32, 0.4, 0.22, 'weiss'),
      zyl(0, 0.41, 0.05, 0.37, 0.025, 'weiss'),
    ],
  },
  {
    id: 'moebel.dusche',
    name: 'Dusche (90 × 90 cm)',
    breite: 0.9,
    tiefe: 0.9,
    hoehe: 2.0,
    teile: [
      q(0, 0.02, 0, 0.9, 0.04, 0.9, 'weiss'),
      q(0, 1.0, 0.44, 0.88, 1.95, 0.01, 'glas'),
      q(0.44, 1.0, 0, 0.01, 1.95, 0.88, 'glas'),
      zyl(-0.2, 1.95, -0.2, 0.25, 0.02, 'metall'),
      q(-0.2, 1.97, -0.32, 0.02, 0.02, 0.25, 'metall'),
    ],
  },
  {
    id: 'moebel.wanne',
    name: 'Badewanne (170 × 75 cm)',
    breite: 1.7,
    tiefe: 0.75,
    hoehe: 0.6,
    teile: [
      q(0, 0.28, 0, 1.7, 0.56, 0.75, 'weiss'),
      q(0, 0.5, 0, 1.5, 0.12, 0.58, 'glas'),
      q(-0.75, 0.62, 0, 0.04, 0.1, 0.04, 'metall'),
    ],
  },
  {
    id: 'moebel.schrank',
    name: 'Kleiderschrank',
    breite: 2.0,
    tiefe: 0.62,
    hoehe: 2.2,
    teile: [
      q(0, 1.1, 0, 2.0, 2.2, 0.6, 'korpus'),
      q(-0.5, 1.15, 0.305, 0.004, 1.9, 0.01, 'metall'),
      q(0, 1.15, 0.305, 0.004, 1.9, 0.01, 'metall'),
      q(0.5, 1.15, 0.305, 0.004, 1.9, 0.01, 'metall'),
    ],
  },
  {
    id: 'moebel.raumteiler',
    name: 'Raumteiler (Lamellen)',
    breite: 1.6,
    tiefe: 0.3,
    hoehe: 2.0,
    teile: [
      q(0, 0.03, 0, 1.6, 0.06, 0.3, 'holz'),
      ...Array.from({ length: 9 }, (_, i) => q(-0.72 + i * 0.18, 1.03, 0, 0.05, 1.94, 0.12, 'holz' as const)),
    ],
  },
];

const MOEBEL_KARTE = new Map(MOEBEL.map((m) => [m.id, m]));
export const moebelVon = (id: string | undefined): MoebelEintrag | undefined => (id ? MOEBEL_KARTE.get(id) : undefined);

/** Footprint corners in plan coordinates (x right, y down), for the 2D plan and hit tests. */
export function moebelUmriss(m: Pick<MoebelEintrag, 'breite' | 'tiefe'>, x: number, y: number, drehungGrad: number): Array<{ x: number; y: number }> {
  const w = (drehungGrad * Math.PI) / 180;
  const c = Math.cos(w);
  const s = Math.sin(w);
  return [
    [-m.breite / 2, -m.tiefe / 2],
    [m.breite / 2, -m.tiefe / 2],
    [m.breite / 2, m.tiefe / 2],
    [-m.breite / 2, m.tiefe / 2],
  ].map(([u, v]) => ({ x: x + u! * c - v! * s, y: y + u! * s + v! * c }));
}

/** Label shown with furniture everywhere (Briefing 7.2). */
export const NUR_VISUALISIERUNG = 'Einrichtung nur zur Visualisierung, nicht Teil des Angebots.';
