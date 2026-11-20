// Scene builder: project model -> three.js objects. Walls are extruded boxes, openings are cut out
// with CSG (three-bvh-csg), floors per room from the clear room polygon.
// Every mesh carries userData { art, id } so planner-design (Phase 5) can assign materials per wall/floor.
// Plan (x, y) maps to three.js (x, 0, y); height is +y.
import * as THREE from 'three';
import { Brush, Evaluator, HalfEdgeMap, SUBTRACTION } from 'three-bvh-csg';
import { MeshBVH } from 'three-mesh-bvh';
import { type Projekt, bodenFlaechen, wandKoerper } from '../../../lib/geometry/index.ts';

export type TeilArt = 'wand' | 'boden' | 'fenster' | 'tuer';
export interface TeilDaten {
  art: TeilArt;
  /** wandId, raumId or oeffnungId */
  id: string;
}

export interface Szene {
  gruppe: THREE.Group;
  mitte: THREE.Vector3;
  /** Diagonal of the bounding box (metres). */
  groesse: number;
  dispose(): void;
}

const FARBE = {
  wand: 0xf7f5f0,
  boden: 0xd9cdb8,
  glas: 0xbfd9e6,
  tuer: 0xe8e3d8,
  grund: 0xe8e3d8,
};

type CsgGeometrie = THREE.BufferGeometry & { boundsTree?: MeshBVH; halfEdges?: HalfEdgeMap; groupIndices?: Uint16Array };

/**
 * Brush whose acceleration data uses the current three-mesh-bvh option `targetLeafSize`.
 * three-bvh-csg 0.0.18 (latest) still passes the deprecated `maxLeafSize`, and three-mesh-bvh 0.9.18
 * warns once per brush (32 warnings per 3D build, QA Phase 4 B4). Same data as Brush.prepareGeometry
 * (BVH with leaf size 3, indirect; half edges; group indices), without SharedArrayBuffer conversion,
 * which only matters for worker use (and needs cross-origin isolation in browsers).
 * Remove once three-bvh-csg passes targetLeafSize itself.
 */
export class CsgKoerper extends Brush {
  #stand: { geometrie: string; index: unknown; pos: unknown; version: string } | null = null;

  override prepareGeometry(): void {
    const geometry = this.geometry as CsgGeometrie;
    const index = geometry.index;
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const version = `${index ? `${index.count}_${index.version}` : '-'}_${pos.count}_${pos.version}`;
    const alt = this.#stand;
    if (alt && alt.geometrie === geometry.uuid && alt.index === index && alt.pos === pos && alt.version === version) return;
    this.#stand = { geometrie: geometry.uuid, index, pos, version };
    geometry.boundsTree = new MeshBVH(geometry, { targetLeafSize: 3, indirect: true });
    geometry.halfEdges ??= new HalfEdgeMap();
    geometry.halfEdges.updateFrom(geometry);
    const dreiecke = (index ? index.count : pos.count) / 3;
    if (!geometry.groupIndices || geometry.groupIndices.length !== dreiecke) geometry.groupIndices = new Uint16Array(dreiecke);
    geometry.groups.forEach(({ start, count }, i) => {
      for (let t = start / 3; t < (start + count) / 3; t++) geometry.groupIndices![t] = i;
    });
  }
}

export function baueSzene(p: Projekt): Szene {
  const gruppe = new THREE.Group();
  gruppe.name = 'raumplaner-modell';
  const geometrien: THREE.BufferGeometry[] = [];
  const materialien = {
    wand: new THREE.MeshStandardMaterial({ color: FARBE.wand, roughness: 0.92 }),
    boden: new THREE.MeshStandardMaterial({ color: FARBE.boden, roughness: 0.8 }),
    glas: new THREE.MeshStandardMaterial({ color: FARBE.glas, roughness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }),
    tuer: new THREE.MeshStandardMaterial({ color: FARBE.tuer, roughness: 0.6 }),
    grund: new THREE.MeshStandardMaterial({ color: FARBE.grund, roughness: 1 }),
  };
  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  evaluator.attributes = ['position', 'normal'];

  for (const k of wandKoerper(p)) {
    const box = new THREE.BoxGeometry(k.laenge, k.hoehe, k.dicke);
    box.translate(k.laenge / 2, k.hoehe / 2, 0);
    let geo: THREE.BufferGeometry = box;
    if (k.oeffnungen.length) {
      box.deleteAttribute('uv');
      let ergebnis: Brush = new CsgKoerper(box);
      ergebnis.updateMatrixWorld();
      for (const o of k.oeffnungen) {
        // keep cut faces off the wall's own faces (coplanar faces are fragile in CSG)
        const unten = o.bruestung <= 0.001 ? -0.05 : o.bruestung;
        const oben = Math.min(o.bruestung + o.hoehe, k.hoehe - 0.03);
        if (oben - unten < 0.05) continue;
        const loch = new THREE.BoxGeometry(o.breite, oben - unten, k.dicke + 0.2);
        loch.deleteAttribute('uv');
        const b = new CsgKoerper(loch);
        b.position.set(o.von + o.breite / 2, (unten + oben) / 2, 0);
        b.updateMatrixWorld();
        const vorher = ergebnis;
        ergebnis = evaluator.evaluate(vorher, b, SUBTRACTION, new CsgKoerper());
        if (vorher.geometry !== box) vorher.geometry.dispose();
        loch.dispose();
      }
      geo = ergebnis.geometry;
      box.dispose();
    }
    geometrien.push(geo);
    const mesh = new THREE.Mesh(geo, materialien.wand);
    mesh.position.set(k.a.x, 0, k.a.y);
    mesh.rotation.y = -k.winkel;
    mesh.userData = { art: 'wand', id: k.wandId } satisfies TeilDaten;
    mesh.name = `wand-${k.wandId}`;
    gruppe.add(mesh);

    // glass panes and open door leaves (simple placeholders, styles follow in Phase 5)
    for (const o of k.oeffnungen) {
      if (o.art === 'fenster') {
        const glas = new THREE.BoxGeometry(o.breite, Math.min(o.hoehe, k.hoehe - o.bruestung - 0.03), 0.02);
        geometrien.push(glas);
        const g = new THREE.Mesh(glas, materialien.glas);
        g.position.set(o.von + o.breite / 2, o.bruestung + o.hoehe / 2, 0);
        g.userData = { art: 'fenster', id: o.id } satisfies TeilDaten;
        mesh.add(g);
      } else {
        const blattH = Math.min(o.hoehe, k.hoehe - 0.03) - 0.01;
        const blatt = new THREE.BoxGeometry(o.breite - 0.02, blattH, 0.04);
        blatt.translate((o.breite - 0.02) / 2, blattH / 2, 0);
        geometrien.push(blatt);
        const seite = o.aufschlag === 'links' ? 1 : -1; // local +z = left of the wall direction
        const angel = new THREE.Group();
        angel.position.set(o.anschlag === 'links' ? o.von + 0.01 : o.von + o.breite - 0.01, 0, (seite * k.dicke) / 2);
        angel.rotation.y = seite > 0 ? -Math.PI / 2 : Math.PI / 2;
        const t = new THREE.Mesh(blatt, materialien.tuer);
        t.userData = { art: 'tuer', id: o.id } satisfies TeilDaten;
        angel.add(t);
        mesh.add(angel);
      }
    }
  }

  for (const b of bodenFlaechen(p)) {
    if (b.polygon.length < 3) continue;
    const form = new THREE.Shape(b.polygon.map((q) => new THREE.Vector2(q.x, -q.y)));
    const geo = new THREE.ShapeGeometry(form);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0.005, 0);
    geometrien.push(geo);
    const m = new THREE.Mesh(geo, materialien.boden);
    m.userData = { art: 'boden', id: b.raumId } satisfies TeilDaten;
    m.name = `boden-${b.raumId}`;
    gruppe.add(m);
  }

  const box = new THREE.Box3().setFromObject(gruppe);
  if (box.isEmpty()) box.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 2.5, 4));
  const mitte = box.getCenter(new THREE.Vector3());
  const groesse = box.getSize(new THREE.Vector3()).length();
  const grundGeo = new THREE.PlaneGeometry(1, 1);
  grundGeo.rotateX(-Math.PI / 2);
  geometrien.push(grundGeo);
  const grund = new THREE.Mesh(grundGeo, materialien.grund);
  grund.scale.set(groesse * 3, 1, groesse * 3);
  grund.position.set(mitte.x, -0.01, mitte.z);
  gruppe.add(grund);

  return {
    gruppe,
    mitte,
    groesse,
    dispose() {
      for (const g of geometrien) g.dispose();
      for (const m of Object.values(materialien)) m.dispose();
    },
  };
}
