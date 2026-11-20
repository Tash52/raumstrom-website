// Scene builder (src/islands/planner/szene/bauen.ts): CSG openings without deprecation warnings
// (QA Phase 4 B4: three-bvh-csg passed the deprecated maxLeafSize to three-mesh-bvh, 32× per build).
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ladeVorlage, wandKoerper } from '../../../src/lib/geometry/index.ts';
import { baueSzene } from '../../../src/islands/planner/szene/bauen.ts';

afterEach(() => vi.restoreAllMocks());

describe('Szene-Aufbau (CSG)', () => {
  it('schneidet Öffnungen ohne Konsolen-Warnung aus', () => {
    const warn = vi.spyOn(console, 'warn');
    const p = ladeVorlage('efh-eg')!;
    const szene = baueSzene(p);
    expect(warn).not.toHaveBeenCalled();

    const mitOeffnung = wandKoerper(p).filter((k) => k.oeffnungen.length > 0);
    expect(mitOeffnung.length).toBeGreaterThan(0);
    for (const k of mitOeffnung) {
      const mesh = szene.gruppe.getObjectByName(`wand-${k.wandId}`) as THREE.Mesh;
      expect(mesh).toBeDefined();
      const geo = mesh.geometry;
      // a plain box has 12 triangles; a cut wall has more, and no point lies inside the opening
      const dreiecke = (geo.index ? geo.index.count : geo.attributes.position!.count) / 3;
      expect(dreiecke).toBeGreaterThan(12);
      geo.computeBoundingBox();
      expect(geo.boundingBox!.max.y).toBeCloseTo(k.hoehe, 3);
    }
    szene.dispose();
  });
});
