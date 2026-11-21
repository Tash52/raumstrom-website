// Walk-through collision and the tile-height clipping of wall tiles (pure parts of the 3D view).
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { mitRaeumen, platziereOeffnung } from '../../../src/lib/geometry/index.ts';
import { bewege, hindernisse, kollidiert, startPunkt } from '../../../src/islands/planner/szene/rundgang.ts';
import { schneideHoehe } from '../../../src/islands/planner/szene/gestaltung3d.ts';
import { AUSSEN, mitWaenden, rechteck } from '../geometry/hilfen.ts';

describe('Rundgang', () => {
  const p0 = mitWaenden([...rechteck(0, 0, 6, 4), [3, 0, 3, 4]], AUSSEN);

  it('Wände blockieren, man gleitet an ihnen entlang', () => {
    const h = hindernisse(p0);
    expect(kollidiert(h, { x: 1.5, y: 2 })).toBe(false);
    expect(kollidiert(h, { x: 3, y: 2 })).toBe(true);
    // walking into the middle wall stops before it
    const q = bewege(h, { x: 2.4, y: 2 }, { x: 0.5, y: 0 });
    expect(q).toEqual({ x: 2.4, y: 2 });
    // diagonal: slides along y
    const s = bewege(h, { x: 2.4, y: 2 }, { x: 0.5, y: 0.3 });
    expect(s.x).toBe(2.4);
    expect(s.y).toBeCloseTo(2.3, 6);
  });

  it('durch eine Tür kommt man hindurch, durch ein Fenster nicht', () => {
    const r = platziereOeffnung(p0, 'tuer', { x: 3, y: 2 }, 0.3);
    if (!r.ok) throw new Error(r.fehler);
    const p = mitRaeumen(r.projekt);
    const h = hindernisse(p);
    let q = { x: 2.2, y: 2 };
    for (let i = 0; i < 10; i++) q = bewege(h, q, { x: 0.15, y: 0 });
    expect(q.x).toBeGreaterThan(3.4);
    const f = platziereOeffnung(p0, 'fenster', { x: 3, y: 2 }, 0.3);
    if (!f.ok) throw new Error(f.fehler);
    expect(kollidiert(hindernisse(mitRaeumen(f.projekt)), { x: 3, y: 2 })).toBe(true);
  });

  it('Startpunkt liegt im größten Raum', () => {
    const s = startPunkt(p0);
    expect(s.y).toBeCloseTo(2, 1);
  });
});

describe('Fliesenhöhe (Schnitt der Wandfläche)', () => {
  it('schneidet eine 4 × 2,5 m Fläche auf 0,9–1,5 m und versetzt sie entlang der Normalen', () => {
    const plane = new THREE.PlaneGeometry(4, 2.5).translate(2, 1.25, 0).toNonIndexed();
    const g = schneideHoehe(plane, 0.9, 1.5, 0.004);
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    expect(bb.min.y).toBeCloseTo(0.9, 6);
    expect(bb.max.y).toBeCloseTo(1.5, 6);
    expect(bb.min.z).toBeCloseTo(0.004, 6);
    // area check: 4 x 0.6
    const pos = g.getAttribute('position');
    let flaeche = 0;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      c.fromBufferAttribute(pos, i + 2);
      flaeche += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
    }
    expect(flaeche).toBeCloseTo(2.4, 6);
    // uv follows (metres)
    const uv = g.getAttribute('uv');
    expect(uv.count).toBe(pos.count);
  });
});
