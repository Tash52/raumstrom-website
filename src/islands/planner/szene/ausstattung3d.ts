// Furnishing layer of the 3D view, rebuilt from the project on every change (cheap, shared geometries):
// electrical points, furniture (visualisation only), installation zones, skirting boards, door frames,
// window frames and sills, lit niches, light coves and cornices. World coordinates: plan (x, y) -> (x, ?, y).
import * as THREE from 'three';
import {
  type Projekt,
  elektroLage,
  knotenMap,
  oeffnungsLage,
  raeumeAnWand,
  raumHoehe,
  wandAbschnitte,
  wandFlaechenPunkt,
  wirksameWandGestaltung,
  endpunkte,
  projiziere,
} from '../../../lib/geometry/index.ts';
import { type ElektroKategorie, alleZonen, elektroTypVon, istWaagerecht, intervallMinus } from '../../../lib/electro/index.ts';
import { type Rolle, moebelVon, stilVon } from '../../../lib/materials/index.ts';

export interface AusstattungOptionen {
  zonen: boolean;
  /** Walls lowered or hidden: wall-mounted parts are hidden too. */
  waendeSichtbar: boolean;
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const ZYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);

const KAT_FARBE: Record<ElektroKategorie, number> = {
  steckdose: 0x3d6300,
  schalter: 0x2f3e4e,
  daten: 0x5d4a8a,
  licht: 0xc58a00,
  sonstiges: 0x8a3b2e,
};

const ROLLE_FARBE: Record<Rolle, number> = {
  korpus: 0xece8e1,
  polster: 0x8c8a84,
  holz: 0xb08d62,
  weiss: 0xf6f6f4,
  metall: 0x7d8085,
  glas: 0xcfe0e6,
  akzent: 0x6f7350,
  kissen: 0xd9d2c4,
};

/** Shared materials of the layer (created once). */
const MAT = (() => {
  const m = new Map<string, THREE.Material>();
  return (key: string, mache: () => THREE.Material) => {
    let x = m.get(key);
    if (!x) m.set(key, (x = mache()));
    return x;
  };
})();

const farbMat = (farbe: THREE.ColorRepresentation, rauheit = 0.6, extra: THREE.MeshStandardMaterialParameters = {}) =>
  MAT(`f|${String(farbe)}|${rauheit}|${JSON.stringify(extra)}`, () => new THREE.MeshStandardMaterial({ color: farbe, roughness: rauheit, ...extra }));

function quader(gruppe: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, b: number, h: number, t: number, rotY = 0): THREE.Mesh {
  const m = new THREE.Mesh(BOX, mat);
  m.position.set(x, y, z);
  m.scale.set(Math.max(b, 0.001), Math.max(h, 0.001), Math.max(t, 0.001));
  m.rotation.y = rotY;
  gruppe.add(m);
  return m;
}

/** Box along a plan segment a->b (centred on the segment), height range, depth, pushed along normal n. */
function leiste(g: THREE.Object3D, mat: THREE.Material, a: { x: number; y: number }, b: { x: number; y: number }, unten: number, oben: number, tiefe: number, n: { x: number; y: number }, versatz: number) {
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  if (l < 0.01) return;
  const mx = (a.x + b.x) / 2 + n.x * versatz;
  const my = (a.y + b.y) / 2 + n.y * versatz;
  const m = quader(g, mat, mx, (unten + oben) / 2, my, l, oben - unten, tiefe, -Math.atan2(b.y - a.y, b.x - a.x));
  m.castShadow = false;
  return m;
}

export function baueAusstattung(p: Projekt, opt: AusstattungOptionen): THREE.Group {
  const g = new THREE.Group();
  g.name = 'ausstattung';
  const km = knotenMap(p);
  const wandTeile = new THREE.Group();
  wandTeile.name = 'wandteile';
  wandTeile.visible = opt.waendeSichtbar;
  g.add(wandTeile);

  // ---------- rooms: skirting, light cove, cornice ----------
  for (const r of p.raeume) {
    const h = raumHoehe(p, r);
    const abgehaengt = r.gestaltung.decke?.material === 'decke.abgehaengt' ? 0.15 : 0;
    const sockel = r.gestaltung.sockelleiste;
    for (const ab of wandAbschnitte(p, r.id, km)) {
      const L = ab.laengeInnen;
      const dx = (ab.innenB.x - ab.innenA.x) / (L || 1);
      const dy = (ab.innenB.y - ab.innenA.y) / (L || 1);
      const n = { x: -dy, y: dx }; // into the room
      const punkt = (u: number) => ({ x: ab.innenA.x + dx * u, y: ab.innenA.y + dy * u });
      if (sockel) {
        const tueren = p.oeffnungen
          .filter((o) => o.wandId === ab.wandId && o.art === 'tuer')
          .flatMap((o) => {
            const lage = oeffnungsLage(p, o, km);
            if (!lage) return [];
            const u0 = projiziere(lage.a, ab.innenA, ab.innenB).t * L;
            const u1 = projiziere(lage.b, ab.innenA, ab.innenB).t * L;
            return [[Math.min(u0, u1), Math.max(u0, u1)] as [number, number]];
          });
        const hoch = sockel.material === 'sockel.hoch' ? 0.14 : sockel.material === 'sockel.schattenfuge' ? 0.02 : 0.06;
        const mat = farbMat(sockel.farbe ?? '#f4f2ee', 0.5);
        for (const [u0, u1] of intervallMinus([0, L], tueren)) leiste(wandTeile, mat, punkt(u0), punkt(u1), 0, hoch, 0.014, n, 0.007);
      }
      if (r.gestaltung.decke?.material === 'decke.lichtvoute') {
        const mat = farbMat(0xfff1d6, 0.4, { emissive: 0xffd9a0, emissiveIntensity: 1.2 });
        leiste(wandTeile, mat, punkt(0.05), punkt(L - 0.05), h - abgehaengt - 0.14, h - abgehaengt - 0.12, 0.05, n, 0.1);
      }
      if (r.gestaltung.decke?.material === 'decke.stuck') {
        const mat = farbMat(r.gestaltung.decke.farbe ?? '#f7f5f0', 0.9);
        leiste(wandTeile, mat, punkt(0), punkt(L), h - 0.09, h - 0.005, 0.07, n, 0.035);
      }
    }
  }

  // ---------- wall sides with a lit niche ----------
  for (const w of p.waende) {
    for (const seite of ['links', 'rechts'] as const) {
      const ges = wirksameWandGestaltung(p, w.id, seite);
      if (ges.wand?.material !== 'trockenbau.nische') continue;
      const { a, b } = endpunkte(p, w, km);
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (l < 0.9) continue;
      const f = wandFlaechenPunkt(p, w, seite, l / 2, km);
      const rot = Math.atan2(f.normale.x, f.normale.y);
      const nische = new THREE.Group();
      nische.position.set(f.punkt.x + f.normale.x * 0.004, 0, f.punkt.y + f.normale.y * 0.004);
      nische.rotation.y = rot;
      quader(nische, farbMat(new THREE.Color(ges.wand.farbe ?? '#f2f0ea').multiplyScalar(0.72), 0.9), 0, 1.3, 0, 0.6, 0.8, 0.004);
      quader(nische, farbMat(0xfff1d6, 0.4, { emissive: 0xffd9a0, emissiveIntensity: 1 }), 0, 1.69, 0.003, 0.56, 0.015, 0.004);
      wandTeile.add(nische);
    }
  }

  // ---------- doors and windows: frames and sills ----------
  for (const o of p.oeffnungen) {
    const lage = oeffnungsLage(p, o, km);
    const w = p.waende.find((x) => x.id === o.wandId);
    if (!lage || !w) continue;
    const n = { x: -lage.richtung.y, y: lage.richtung.x };
    const ges = o.gestaltung;
    if (o.art === 'tuer') {
      const zarge = ges?.zarge ?? 'zarge.umfassung';
      if (zarge === 'zarge.flaechenbuendig') continue;
      const breite = zarge === 'zarge.stahl' ? 0.03 : 0.06;
      const farbe = zarge === 'zarge.stahl' ? '#9a9da1' : (ges?.farbe ?? stilVon(ges?.stil)?.farbe ?? '#f4f2ee');
      const mat = farbMat(farbe, 0.45);
      for (const s of [1, -1]) {
        const v = (w.dicke / 2 + 0.006) * s;
        const nn = { x: n.x, y: n.y };
        leiste(wandTeile, mat, { x: lage.a.x - lage.richtung.x * breite, y: lage.a.y - lage.richtung.y * breite }, lage.a, 0, o.hoehe + breite, 0.012, nn, v);
        leiste(wandTeile, mat, lage.b, { x: lage.b.x + lage.richtung.x * breite, y: lage.b.y + lage.richtung.y * breite }, 0, o.hoehe + breite, 0.012, nn, v);
        leiste(wandTeile, mat, lage.a, lage.b, o.hoehe, o.hoehe + breite, 0.012, nn, v);
      }
    } else {
      const farbe = ges?.farbe ?? stilVon(ges?.stil ?? 'fenster.kunststoff')?.farbe ?? '#f4f4f2';
      const mat = farbMat(farbe, 0.5);
      const oben = o.bruestung + o.hoehe;
      const rahmen = 0.06;
      leiste(wandTeile, mat, lage.a, lage.b, o.bruestung, o.bruestung + rahmen, 0.07, n, 0);
      leiste(wandTeile, mat, lage.a, lage.b, oben - rahmen, oben, 0.07, n, 0);
      leiste(wandTeile, mat, lage.a, { x: lage.a.x + lage.richtung.x * rahmen, y: lage.a.y + lage.richtung.y * rahmen }, o.bruestung, oben, 0.07, n, 0);
      leiste(wandTeile, mat, { x: lage.b.x - lage.richtung.x * rahmen, y: lage.b.y - lage.richtung.y * rahmen }, lage.b, o.bruestung, oben, 0.07, n, 0);
      if (o.breite > 1.1) leiste(wandTeile, mat, { x: lage.mitte.x - lage.richtung.x * 0.03, y: lage.mitte.y - lage.richtung.y * 0.03 }, { x: lage.mitte.x + lage.richtung.x * 0.03, y: lage.mitte.y + lage.richtung.y * 0.03 }, o.bruestung, oben, 0.07, n, 0);
      // sill on the room side (for exterior walls), both sides for interior walls between rooms
      const raeume = raeumeAnWand(p, o.wandId);
      const bank = ges?.fensterbank;
      const bankMat = farbMat(bank?.farbe ?? (bank?.material === 'fensterbank.kunststein' ? '#4a4b4d' : bank?.material === 'fensterbank.holz' ? '#c9ae86' : bank?.material === 'fensterbank.weiss' ? '#f3f2ee' : '#e4e0d8'), bank?.material === 'fensterbank.naturstein' || !bank ? 0.3 : 0.5);
      for (const [s, r] of [[1, raeume.links], [-1, raeume.rechts]] as const) {
        if (!r) continue;
        const a2 = { x: lage.a.x - lage.richtung.x * 0.03, y: lage.a.y - lage.richtung.y * 0.03 };
        const b2 = { x: lage.b.x + lage.richtung.x * 0.03, y: lage.b.y + lage.richtung.y * 0.03 };
        leiste(wandTeile, bankMat, a2, b2, o.bruestung - 0.03, o.bruestung, w.dicke / 2 + 0.06, { x: n.x * s, y: n.y * s }, (w.dicke / 2 + 0.06) / 2);
      }
    }
  }

  // ---------- electrical points ----------
  for (const e of p.elektro) {
    const lage = elektroLage(p, e, km);
    const typ = elektroTypVon(e.typ);
    if (!lage) continue;
    const farbe = KAT_FARBE[typ?.kategorie ?? 'sonstiges'];
    const teil = new THREE.Group();
    teil.userData = { art: 'elektro', id: e.id };
    teil.name = `elektro-${e.id}`;
    const platte = farbMat(0xf7f7f5, 0.35);
    const punkt = farbMat(farbe, 0.4, { emissive: farbe, emissiveIntensity: typ?.kategorie === 'licht' ? 0.6 : 0.25 });
    if (e.ort === 'wand') {
      const breit = e.typ.endsWith('3fach') ? 0.23 : e.typ.endsWith('2fach') || e.typ.endsWith('lan-2') ? 0.155 : e.typ === 'sonst.unterverteilung' ? 0.4 : e.typ === 'sonst.wallbox' ? 0.25 : 0.085;
      const hoch = e.typ === 'sonst.unterverteilung' ? 0.55 : e.typ === 'sonst.wallbox' ? 0.35 : 0.085;
      teil.position.set(lage.position.x + lage.normale.x * 0.006, lage.position.y, lage.position.z + lage.normale.z * 0.006);
      teil.rotation.y = lage.drehungY;
      quader(teil, platte, 0, 0, 0, breit, hoch, 0.012);
      quader(teil, punkt, 0, 0, 0.007, Math.min(breit, 0.085) * 0.45, Math.min(hoch, 0.085) * 0.45, 0.004);
      wandTeile.add(teil);
    } else {
      const raum = e.raumId ? p.raeume.find((r) => r.id === e.raumId) : undefined;
      const abgehaengt = raum?.gestaltung.decke?.material === 'decke.abgehaengt' ? 0.15 : 0;
      const y = e.ort === 'decke' ? lage.position.y - abgehaengt - 0.008 : 0.008;
      teil.position.set(lage.position.x, y, lage.position.z);
      const d = e.typ === 'licht.spot' ? 0.08 : 0.12;
      const m1 = new THREE.Mesh(ZYL, platte);
      m1.scale.set(d, 0.012, d);
      const m2 = new THREE.Mesh(ZYL, punkt);
      m2.scale.set(d * 0.45, 0.016, d * 0.45);
      teil.add(m1, m2);
      g.add(teil);
    }
  }

  // ---------- furniture (visualisation only) ----------
  for (const m of p.einrichtung) {
    const def = moebelVon(m.typ);
    if (!def) continue;
    const teil = new THREE.Group();
    teil.userData = { art: 'moebel', id: m.id };
    teil.name = `moebel-${m.id}`;
    teil.position.set(m.x, 0, m.y);
    teil.rotation.y = -THREE.MathUtils.degToRad(m.drehungGrad);
    for (const t of def.teile) {
      const mat = t.rolle === 'glas' ? farbMat(ROLLE_FARBE.glas, 0.05, { transparent: true, opacity: 0.35, depthWrite: false }) : farbMat(ROLLE_FARBE[t.rolle], t.rolle === 'metall' ? 0.35 : 0.7, t.rolle === 'metall' ? { metalness: 0.6 } : {});
      const mesh = new THREE.Mesh(t.form === 'zylinder' ? ZYL : BOX, mat);
      mesh.position.set(t.x, t.y, t.z);
      mesh.scale.set(t.b, t.h, t.t);
      mesh.castShadow = t.rolle !== 'glas';
      mesh.receiveShadow = true;
      teil.add(mesh);
    }
    g.add(teil);
  }

  // ---------- installation zones (DIN 18015-3) ----------
  if (opt.zonen) {
    const waag = farbMat(0x3d6300, 1, { transparent: true, opacity: 0.32, depthWrite: false, emissive: 0x3d6300, emissiveIntensity: 0.4 });
    const senk = farbMat(0xc58a00, 1, { transparent: true, opacity: 0.4, depthWrite: false, emissive: 0xc58a00, emissiveIntensity: 0.4 });
    const zonen = new THREE.Group();
    zonen.name = 'installationszonen';
    for (const z of alleZonen(p)) {
      const dx = z.bis.x - z.von.x;
      const dy = z.bis.y - z.von.y;
      const l = Math.hypot(dx, dy) || 1;
      const m = leiste(zonen, istWaagerecht(z.art) ? waag : senk, z.von, z.bis, z.unten, z.oben, 0.002, { x: -dy / l, y: dx / l }, istWaagerecht(z.art) ? 0.01 : 0.012);
      if (m) {
        m.userData = { zone: z.art };
        m.raycast = () => {};
      }
    }
    wandTeile.add(zonen);
  }
  // decorations (skirting, frames, zones) never catch clicks meant for the wall behind them
  g.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh || o.parent?.userData.art) return;
    (o as THREE.Mesh).receiveShadow = true;
    o.raycast = () => {};
  });
  return g;
}
