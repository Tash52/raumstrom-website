// Scene builder (src/islands/planner/szene/bauen.ts): CSG openings without deprecation warnings
// (QA Phase 4 B4), wall faces per side with room ids, floors and ceilings with pick data (Phase 5).
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ladeVorlage, raeumeAnWand, wandKoerper } from '../../../src/lib/geometry/index.ts';
import { baueSzene, teilVon } from '../../../src/islands/planner/szene/bauen.ts';

afterEach(() => vi.restoreAllMocks());

const dreiecke = (geo: THREE.BufferGeometry) => (geo.index ? geo.index.count : geo.attributes.position!.count) / 3;

describe('Szene-Aufbau (CSG)', () => {
  it('schneidet Öffnungen ohne Konsolen-Warnung aus', () => {
    const warn = vi.spyOn(console, 'warn');
    const p = ladeVorlage('efh-eg')!;
    const szene = baueSzene(p);
    expect(warn).not.toHaveBeenCalled();

    const mitOeffnung = wandKoerper(p).filter((k) => k.oeffnungen.length > 0);
    expect(mitOeffnung.length).toBeGreaterThan(0);
    for (const k of mitOeffnung) {
      const wand = szene.gruppe.getObjectByName(`wand-${k.wandId}`)!;
      expect(wand).toBeDefined();
      // a plain box face has 2 triangles; a face with a hole has more; reveals end up in the edge mesh
      const links = (wand.getObjectByName(`wand-${k.wandId}-links`) as THREE.Mesh).geometry;
      const kante = (wand.getObjectByName(`wand-${k.wandId}-kante`) as THREE.Mesh).geometry;
      expect(dreiecke(links)).toBeGreaterThan(2);
      expect(dreiecke(kante)).toBeGreaterThan(8);
      kante.computeBoundingBox();
      expect(kante.boundingBox!.max.y).toBeCloseTo(k.hoehe, 3);
    }
    szene.dispose();
  });
});

describe('Szene-Aufbau: Pick-Daten (Vertrag planner-design)', () => {
  const p = ladeVorlage('2-zimmer')!;
  const szene = baueSzene(p);
  szene.gruppe.updateMatrixWorld(true);

  it('Wandseiten tragen Seite und Raum; Normalen und UVs passen zur Seite', () => {
    for (const w of p.waende) {
      const raeume = raeumeAnWand(p, w.id);
      for (const seite of ['links', 'rechts'] as const) {
        const m = szene.gruppe.getObjectByName(`wand-${w.id}-${seite}`) as THREE.Mesh;
        expect(m.userData).toEqual({ art: 'wand', id: w.id, seite, raumId: raeume[seite]?.id ?? null });
        const n = m.geometry.getAttribute('normal');
        expect(n.getZ(0)).toBeCloseTo(seite === 'links' ? 1 : -1, 5);
        expect(m.geometry.getAttribute('uv').count).toBe(m.geometry.getAttribute('position').count);
      }
      expect(szene.gruppe.getObjectByName(`wand-${w.id}-kante`)!.userData).toMatchObject({ art: 'wand', id: w.id, seite: null });
    }
  });

  it('Raycast auf eine Innenwand liefert Wandseite und den Raum auf dieser Seite', () => {
    // inner wall with rooms on both sides
    const w = p.waende.find((x) => raeumeAnWand(p, x.id).links && raeumeAnWand(p, x.id).rechts)!;
    const wand = szene.gruppe.getObjectByName(`wand-${w.id}`)!;
    const k = wandKoerper(p).find((x) => x.wandId === w.id)!;
    // middle of the body, above every opening, 40 cm in front of the `links` face
    const links = new THREE.Vector3(k.laenge / 2, 2.35, 0.4).applyMatrix4(wand.matrixWorld);
    const ziel = new THREE.Vector3(k.laenge / 2, 2.35, 0).applyMatrix4(wand.matrixWorld);
    const ray = new THREE.Raycaster(links, ziel.clone().sub(links).normalize());
    const treffer = ray.intersectObject(szene.gruppe, true).find((h) => teilVon(h.object)?.art === 'wand');
    expect(teilVon(treffer!.object)).toEqual({ art: 'wand', id: w.id, seite: 'links', raumId: raeumeAnWand(p, w.id).links!.id });
  });

  it('Boden und Decke je Raum; Decke zeigt nach unten und ist von oben nicht pickbar', () => {
    for (const r of p.raeume) {
      expect(szene.gruppe.getObjectByName(`boden-${r.id}`)!.userData).toEqual({ art: 'boden', id: r.id });
      const d = szene.decken.getObjectByName(`decke-${r.id}`) as THREE.Mesh;
      expect(d.userData).toEqual({ art: 'decke', id: r.id });
      expect(d.geometry.getAttribute('normal').getY(0)).toBeCloseTo(-1, 5);
    }
    const r = p.raeume[0]!;
    const d = szene.decken.getObjectByName(`decke-${r.id}`) as THREE.Mesh;
    d.geometry.computeBoundingBox();
    const mitte = d.geometry.boundingBox!.getCenter(new THREE.Vector3());
    const vonOben = new THREE.Raycaster(new THREE.Vector3(mitte.x, 20, mitte.z), new THREE.Vector3(0, -1, 0));
    expect(vonOben.intersectObject(d).length).toBe(0);
    const vonUnten = new THREE.Raycaster(new THREE.Vector3(mitte.x, 1, mitte.z), new THREE.Vector3(0, 1, 0));
    expect(vonUnten.intersectObject(d).length).toBeGreaterThan(0);
  });

  it('Decken sind ausblendbar', () => {
    const ohne = baueSzene(p, { decken: false });
    expect(ohne.decken.visible).toBe(false);
    expect(ohne.mitte.toArray()).toEqual(szene.mitte.toArray());
    ohne.dispose();
  });
});
