// Apply the project's design to a built scene (baueSzene) without rebuilding geometry: wall sides,
// floors, ceilings, door leaves (style, colour, glass cut-out, sliding door) and wall tiles as a separate
// layer clipped to the tiling height (raumhoch, halbhoch, Spritzschutz).
import * as THREE from 'three';
import { type Projekt, raumHoehe, wirksameWandGestaltung } from '../../../lib/geometry/index.ts';
import type { TeilDaten, Szene } from './bauen.ts';
import type { MaterialCache } from './materialien.ts';

export const FLIESEN_HOEHE = { halbhoch: [0, 1.2], spritzschutz: [0.9, 1.5], raumhoch: [0, 99] } as const;

/**
 * Clip a non-indexed geometry (position, normal, uv) to unten <= y <= oben and push it `versatz` metres
 * along its normals (tile layer in front of the wall face). Pure geometry, exported for tests.
 */
export function schneideHoehe(geo: THREE.BufferGeometry, unten: number, oben: number, versatz = 0): THREE.BufferGeometry {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const uv = geo.getAttribute('uv');
  type V = { p: number[]; n: number[]; t: number[] };
  const lies = (i: number): V => ({ p: [pos.getX(i), pos.getY(i), pos.getZ(i)], n: [nor.getX(i), nor.getY(i), nor.getZ(i)], t: uv ? [uv.getX(i), uv.getY(i)] : [0, 0] });
  const mix = (a: V, b: V, t: number): V => ({ p: a.p.map((x, k) => x + (b.p[k]! - x) * t), n: a.n, t: a.t.map((x, k) => x + (b.t[k]! - x) * t) });
  const schnitt = (poly: V[], innen: (v: V) => boolean, y: number): V[] => {
    const aus: V[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % poly.length]!;
      const ia = innen(a);
      const ib = innen(b);
      if (ia) aus.push(a);
      if (ia !== ib) aus.push(mix(a, b, (y - a.p[1]!) / (b.p[1]! - a.p[1]!)));
    }
    return aus;
  };
  const P: number[] = [];
  const N: number[] = [];
  const T: number[] = [];
  for (let i = 0; i + 2 < pos.count; i += 3) {
    let poly = [lies(i), lies(i + 1), lies(i + 2)];
    poly = schnitt(poly, (v) => v.p[1]! >= unten, unten);
    if (poly.length < 3) continue;
    poly = schnitt(poly, (v) => v.p[1]! <= oben, oben);
    if (poly.length < 3) continue;
    for (let k = 1; k + 1 < poly.length; k++)
      for (const v of [poly[0]!, poly[k]!, poly[k + 1]!]) {
        P.push(v.p[0]! + v.n[0]! * versatz, v.p[1]! + v.n[1]! * versatz, v.p[2]! + v.n[2]! * versatz);
        N.push(...v.n);
        T.push(...v.t);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(T, 2));
  return g;
}

interface Zustand {
  /** Clipped tile geometries per wall face and height range (reused while the geometry stays). */
  schnitte: Map<string, THREE.BufferGeometry>;
  ebenen: THREE.Object3D[];
  ur: Map<THREE.Object3D, { material?: THREE.Material | THREE.Material[]; pos?: THREE.Vector3; rotY?: number }>;
}

const zustaende = new WeakMap<Szene, Zustand>();

function zustand(s: Szene): Zustand {
  let z = zustaende.get(s);
  if (!z) zustaende.set(s, (z = { schnitte: new Map(), ebenen: [], ur: new Map() }));
  return z;
}

const GLAS = new THREE.MeshStandardMaterial({ color: 0xcfe0e6, roughness: 0.05, transparent: true, opacity: 0.4, depthWrite: false });
const SATINIERT = new THREE.MeshStandardMaterial({ color: 0xf1f3f2, roughness: 0.6, transparent: true, opacity: 0.8 });
const GLAS_GEO = new THREE.BoxGeometry(1, 1, 1);

/** Free the clipped geometries of a scene (call when the scene is disposed). */
export function entsorgeGestaltung(s: Szene): void {
  const z = zustaende.get(s);
  if (!z) return;
  for (const g of z.schnitte.values()) g.dispose();
  zustaende.delete(s);
}

export function gestalteSzene(s: Szene, p: Projekt, cache: MaterialCache): void {
  const z = zustand(s);
  cache.beginne();
  for (const e of z.ebenen) e.removeFromParent();
  z.ebenen = [];
  const raeume = new Map(p.raeume.map((r) => [r.id, r]));
  const oeffnungen = new Map(p.oeffnungen.map((o) => [o.id, o]));
  const waende = new Map(p.waende.map((w) => [w.id, w]));
  const merke = (o: THREE.Object3D) => {
    if (!z.ur.has(o)) z.ur.set(o, { material: (o as THREE.Mesh).material, pos: o.position.clone(), rotY: o.rotation.y });
    return z.ur.get(o)!;
  };

  s.gruppe.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const d = mesh.userData as Partial<TeilDaten> & { ebene?: boolean };
    if (d.ebene || !d.art) return;
    const ur = merke(mesh);
    if (d.art === 'wand') {
      if (!d.seite) return;
      const g = wirksameWandGestaltung(p, d.id!, d.seite);
      mesh.material = g.wand ? cache.hole(g.wand, 'wand') : (ur.material as THREE.Material);
      if (g.fliesen) {
        const raum = g.raumId ? raeume.get(g.raumId) : undefined;
        const h = raum ? raumHoehe(p, raum) : p.standardHoehe;
        const [u, o2] = FLIESEN_HOEHE[g.fliesen.fliesenhoehe ?? 'halbhoch'];
        const unten = u;
        const oben = Math.min(o2, h);
        const key = `${mesh.geometry.uuid}|${unten}|${oben}`;
        let geo = z.schnitte.get(key);
        if (!geo) z.schnitte.set(key, (geo = schneideHoehe(mesh.geometry, unten, oben, 0.004)));
        if (geo.getAttribute('position').count) {
          const ebene = new THREE.Mesh(geo, cache.hole(g.fliesen, 'fliesen'));
          ebene.userData = { ...mesh.userData, ebene: true };
          ebene.name = `${mesh.name}-fliesen`;
          ebene.castShadow = false;
          ebene.receiveShadow = true;
          mesh.parent!.add(ebene);
          z.ebenen.push(ebene);
        }
      }
    } else if (d.art === 'boden') {
      const r = raeume.get(d.id!);
      mesh.material = r?.gestaltung.boden ? cache.hole(r.gestaltung.boden, 'boden') : (ur.material as THREE.Material);
    } else if (d.art === 'decke') {
      const r = raeume.get(d.id!);
      mesh.material = r?.gestaltung.decke ? cache.hole(r.gestaltung.decke, 'decke') : (ur.material as THREE.Material);
      mesh.position.y = r?.gestaltung.decke?.material === 'decke.abgehaengt' ? -0.15 : 0;
    } else if (d.art === 'tuer') {
      const o = oeffnungen.get(d.id!);
      const g = o?.gestaltung;
      mesh.material = g?.stil || g?.farbe ? cache.holeTuer(g.stil, g.farbe) : (ur.material as THREE.Material);
      const angel = mesh.parent;
      const w = o ? waende.get(o.wandId) : undefined;
      if (angel && o && w) {
        const ua = merke(angel);
        if (g?.schiebetuer) {
          // sliding leaf in front of the wall on the swing side, half open
          const seite = o.aufschlag === 'links' ? 1 : -1;
          angel.rotation.y = 0;
          angel.position.set(ua.pos!.x + (o.anschlag === 'links' ? o.breite * 0.45 : -o.breite * 1.45 + 0.02), 0, seite * (w.dicke / 2 + 0.03));
        } else {
          angel.rotation.y = ua.rotY!;
          angel.position.copy(ua.pos!);
        }
      }
      const glas = g?.glas;
      if (glas && glas !== 'glas.ohne' && g?.stil !== 'tuer.ganzglas') {
        const box = (mesh.geometry.boundingBox ?? (mesh.geometry.computeBoundingBox(), mesh.geometry.boundingBox))!;
        const b = box.max.x - box.min.x;
        const h = box.max.y - box.min.y;
        const scheibe = new THREE.Mesh(GLAS_GEO, glas === 'glas.satiniert' ? SATINIERT : GLAS);
        if (glas === 'glas.schmal') {
          scheibe.scale.set(0.14, h * 0.72, 0.046);
          scheibe.position.set(box.min.x + b * 0.72, box.min.y + h * 0.52, 0);
        } else {
          scheibe.scale.set(b * 0.6, h * (glas === 'glas.satiniert' ? 0.8 : 0.62), 0.046);
          scheibe.position.set(box.min.x + b / 2, box.min.y + h * 0.55, 0);
        }
        scheibe.userData = { ...mesh.userData, ebene: true };
        mesh.add(scheibe);
        z.ebenen.push(scheibe);
      }
    }
  });
  cache.aufraeumen();
}
