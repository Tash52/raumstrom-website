// 3D view of the project (own lazy chunk: three.js, R3F, CSG). Renders on demand only.
// Operation: drag to orbit, two fingers / wheel to zoom, keyboard (arrows rotate/tilt, +/- zoom), buttons.
// Phase 5 (planner-design): materials per wall side/floor/ceiling, furnishing layer, picking with hover
// and selection highlight, time of day, shadows (desktop), walls lowered/hidden, dimensions, walk-through,
// screenshot. Geometry (CSG) is only rebuilt when walls/openings/rooms change, not for design edits.
// UI wording: "Ansicht" only.
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { type Projekt, beschriftungsPunkt, formatFlaeche, formatLaenge, knotenMap, raumPolygon, wandKoerper } from '../../../lib/geometry/index.ts';
import { type Ziel, gestaltStore, rundgangEingabe, useGestalt } from '../gestalten/store.ts';
import type { Treffer } from '../gestalten/treffer.ts';
import { baueAusstattung } from './ausstattung3d.ts';
import { type Szene, baueSzene, teilVon } from './bauen.ts';
import type { AnsichtBefehl } from './befehle.ts';
import { entsorgeGestaltung, gestalteSzene } from './gestaltung3d.ts';
import { MaterialCache } from './materialien.ts';
import { AUGENHOEHE, bewege, hindernisse, startPunkt } from './rundgang.ts';

interface Props {
  projekt: Projekt;
  befehl: { nr: number; b: AnsichtBefehl } | null;
  leicht: boolean;
  onBereit?: () => void;
  onTreffer?: (t: Treffer) => void;
}

const MAX_POLAR = Math.PI / 2 - 0.05;

/** Key of everything that changes the CSG geometry (design edits do not). */
export function geometrieSchluessel(p: Projekt): string {
  return JSON.stringify([
    p.standardHoehe,
    p.knoten,
    p.waende,
    p.oeffnungen.map(({ gestaltung: _g, ...o }) => o),
    p.raeume.map((r) => [r.id, r.knoten, r.hoehe]),
  ]);
}

function startPosition(s: Szene, aspekt = 1.5): THREE.Vector3 {
  // narrow (portrait) views need more distance, the field of view is vertical
  const d = Math.max(6, s.groesse * 1.05) / Math.min(1, Math.max(0.62, aspekt / 1.3));
  return new THREE.Vector3(s.mitte.x + d * 0.55, d * 0.85, s.mitte.z + d * 0.75);
}

function Steuerung({ szene, befehl, onBereit }: { szene: Szene; befehl: Props['befehl']; onBereit?: () => void }) {
  const { camera, gl, invalidate } = useThree();
  const ctrl = useRef<OrbitControls | null>(null);
  const blick = useGestalt((s) => s.blick);

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = false;
    c.maxPolarAngle = MAX_POLAR;
    c.minDistance = 1.5;
    c.maxDistance = Math.max(30, szene.groesse * 4);
    c.screenSpacePanning = false;
    c.target.copy(szene.mitte).setY(0);
    camera.position.copy(startPosition(szene, gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight)));
    camera.up.set(0, 1, 0);
    c.update();
    const neu = () => invalidate();
    c.addEventListener('change', neu);
    ctrl.current = c;
    invalidate();
    requestAnimationFrame(() => requestAnimationFrame(() => onBereit?.()));
    return () => {
      c.removeEventListener('change', neu);
      c.dispose();
      ctrl.current = null;
    };
  }, [camera, gl, invalidate, szene]); // eslint-disable-line react-hooks/exhaustive-deps

  const fuehreAus = (b: AnsichtBefehl) => {
    const c = ctrl.current;
    if (!c) return;
    const versatz = camera.position.clone().sub(c.target);
    const sph = new THREE.Spherical().setFromVector3(versatz);
    if (b.art === 'drehen') sph.theta += b.wert;
    else if (b.art === 'neigen') sph.phi = Math.min(MAX_POLAR, Math.max(0.05, sph.phi + b.wert));
    else if (b.art === 'zoom') sph.radius = Math.min(c.maxDistance, Math.max(c.minDistance, sph.radius * b.wert));
    else if (b.art === 'draufsicht') {
      sph.phi = 0.0001;
      sph.radius = Math.max(6, szene.groesse * 1.1);
    } else {
      c.target.copy(szene.mitte).setY(0);
      camera.position.copy(startPosition(szene, gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight)));
      c.update();
      invalidate();
      return;
    }
    versatz.setFromSpherical(sph);
    camera.position.copy(c.target).add(versatz);
    c.update();
    invalidate();
  };

  useEffect(() => {
    if (befehl) fuehreAus(befehl.b);
  }, [befehl]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (blick === 'drauf') fuehreAus({ art: 'draufsicht' });
    else if (blick === 'orbit') fuehreAus({ art: 'schraeg' });
  }, [blick]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/** First-person walk-through: WASD/arrow keys or touch joystick move, dragging looks around. */
function Rundgang({ projekt, onBereit }: { projekt: Projekt; onBereit?: () => void }) {
  const { camera, gl, invalidate } = useThree();
  const h = useMemo(() => hindernisse(projekt), [projekt]);
  const zustand = useRef({ pos: { x: 0, y: 0 }, gier: 0, nick: 0, tasten: new Set<string>() });

  useEffect(() => {
    const z = zustand.current;
    const ziel = gestaltStore.getState().ziel;
    const raumId = ziel && 'raumId' in ziel ? ziel.raumId : null;
    z.pos = startPunkt(projekt, raumId);
    z.gier = 0;
    z.nick = 0;
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(z.pos.x, AUGENHOEHE, z.pos.y);
    cam.rotation.set(0, 0, 0, 'YXZ');
    invalidate();
    onBereit?.();
    const huelle = gl.domElement.closest('.planer-3d');
    const bewegungsTaste = (k: string) => ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e'].includes(k);
    const runter = (e: KeyboardEvent) => {
      if (!huelle?.contains(document.activeElement)) return;
      const k = e.key.toLowerCase();
      if (!bewegungsTaste(k)) return;
      e.preventDefault();
      z.tasten.add(k);
      invalidate();
    };
    const hoch = (e: KeyboardEvent) => z.tasten.delete(e.key.toLowerCase());
    const verlassen = () => z.tasten.clear();
    let ziehen: { x: number; y: number; id: number } | null = null;
    const pd = (e: PointerEvent) => {
      ziehen = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const pm = (e: PointerEvent) => {
      if (!ziehen || ziehen.id !== e.pointerId) return;
      z.gier -= (e.clientX - ziehen.x) * 0.005;
      z.nick = Math.max(-1.2, Math.min(1.2, z.nick - (e.clientY - ziehen.y) * 0.004));
      ziehen = { x: e.clientX, y: e.clientY, id: e.pointerId };
      invalidate();
    };
    const pu = () => {
      ziehen = null;
    };
    window.addEventListener('keydown', runter);
    window.addEventListener('keyup', hoch);
    window.addEventListener('blur', verlassen);
    gl.domElement.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    return () => {
      window.removeEventListener('keydown', runter);
      window.removeEventListener('keyup', hoch);
      window.removeEventListener('blur', verlassen);
      gl.domElement.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const z = zustand.current;
    const t = z.tasten;
    const schritt = Math.min(dt, 0.05);
    let vor = rundgangEingabe.vor + (t.has('w') || t.has('arrowup') ? 1 : 0) - (t.has('s') || t.has('arrowdown') ? 1 : 0);
    let seit = rundgangEingabe.seit + (t.has('d') ? 1 : 0) - (t.has('a') ? 1 : 0);
    const drehen = rundgangEingabe.drehen + (t.has('arrowleft') || t.has('q') ? 1 : 0) - (t.has('arrowright') || t.has('e') ? 1 : 0);
    vor = Math.max(-1, Math.min(1, vor));
    seit = Math.max(-1, Math.min(1, seit));
    z.gier += drehen * 1.6 * schritt;
    if (vor || seit) {
      const v = 1.4 * schritt;
      // camera looks along -z at gier 0; plan y = three z
      const fx = -Math.sin(z.gier);
      const fy = -Math.cos(z.gier);
      const d = { x: (fx * vor - fy * seit) * v, y: (fy * vor + fx * seit) * v };
      z.pos = bewege(h, z.pos, d);
    }
    camera.position.set(z.pos.x, AUGENHOEHE, z.pos.y);
    camera.rotation.set(z.nick, z.gier, 0, 'YXZ');
    if (vor || seit || drehen) invalidate();
  });
  return null;
}

/** Sun, sky and room light by hour of day (6 to 22). */
function Licht({ szene, leicht }: { szene: Szene; leicht: boolean }) {
  const stunde = useGestalt((s) => s.tageszeit);
  const { scene, invalidate } = useThree();
  const sonne = useRef<THREE.DirectionalLight>(null);
  const werte = useMemo(() => {
    const t = Math.max(0, Math.min(1, (stunde - 6) / 14));
    const el = Math.sin(Math.PI * t) * THREE.MathUtils.degToRad(62);
    const az = THREE.MathUtils.degToRad(90 + 180 * t);
    const nacht = stunde < 6.5 || stunde > 20.25;
    const tief = 1 - Math.sin(Math.PI * t);
    const farbe = new THREE.Color('#fff4e6').lerp(new THREE.Color('#ffae70'), Math.pow(tief, 3));
    const r = Math.max(12, szene.groesse);
    return {
      position: new THREE.Vector3(szene.mitte.x + Math.sin(az) * Math.cos(el) * r, Math.max(0.5, Math.sin(el) * r), szene.mitte.z - Math.cos(az) * Math.cos(el) * r),
      sonne: nacht ? 0 : 0.6 + 2.0 * Math.sin(el),
      farbe,
      himmel: nacht ? 0.35 : 0.9 + 1.0 * Math.sin(el),
      raumlicht: nacht ? 1.1 : 0,
      hintergrund: nacht ? '#2b3038' : new THREE.Color('#f4f1eb').lerp(new THREE.Color('#ead8c2'), Math.pow(tief, 4)).getStyle(),
    };
  }, [stunde, szene]);
  useEffect(() => {
    scene.background = new THREE.Color(werte.hintergrund);
    const s = sonne.current;
    if (s) {
      s.target.position.copy(szene.mitte).setY(0);
      s.target.updateMatrixWorld();
      const halb = Math.max(8, szene.groesse * 0.65);
      Object.assign(s.shadow.camera, { left: -halb, right: halb, top: halb, bottom: -halb, near: 0.5, far: szene.groesse * 4 + 40 });
      s.shadow.camera.updateProjectionMatrix();
    }
    invalidate();
  }, [werte, scene, szene, invalidate]);
  return (
    <>
      <hemisphereLight args={['#ffffff', '#cfc6b6', werte.himmel]} />
      <directionalLight
        ref={sonne}
        position={werte.position}
        intensity={werte.sonne}
        color={werte.farbe}
        castShadow={!leicht}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-normalBias={0.03}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[szene.mitte.x - 6, 9, szene.mitte.z - 8]} intensity={0.35 + werte.raumlicht * 0.2} />
      <ambientLight color="#ffd9a8" intensity={werte.raumlicht} />
    </>
  );
}

/** Dimension labels (wall lengths, room names and areas) as DOM overlay. */
function Masse({ projekt }: { projekt: Projekt }) {
  const { gl, scene, camera, size } = useThree();
  const renderer = useMemo(() => new CSS2DRenderer(), []);
  const gruppe = useMemo(() => {
    const g = new THREE.Group();
    const km = knotenMap(projekt);
    for (const k of wandKoerper(projekt)) {
      const w = projekt.waende.find((x) => x.id === k.wandId);
      if (!w) continue;
      const a = km.get(w.von)!;
      const b = km.get(w.bis)!;
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (l < 0.4) continue;
      const div = document.createElement('div');
      div.className = 'planer-mass-label';
      div.textContent = formatLaenge(l);
      const o = new CSS2DObject(div);
      o.position.set((a.x + b.x) / 2, k.hoehe + 0.08, (a.y + b.y) / 2);
      g.add(o);
    }
    for (const r of projekt.raeume) {
      const lp = beschriftungsPunkt(raumPolygon(projekt, r.knoten, km));
      const div = document.createElement('div');
      div.className = 'planer-mass-label planer-mass-raum';
      div.textContent = `${r.name} · ${formatFlaeche(r.flaeche)}`;
      const o = new CSS2DObject(div);
      o.position.set(lp.x, 0.05, lp.y);
      g.add(o);
    }
    return g;
  }, [projekt]);
  useEffect(() => {
    const el = renderer.domElement;
    el.classList.add('planer-mass-ebene');
    gl.domElement.parentElement?.appendChild(el);
    return () => el.remove();
  }, [renderer, gl]);
  useEffect(() => renderer.setSize(size.width, size.height), [renderer, size]);
  useEffect(() => {
    scene.add(gruppe);
    return () => {
      scene.remove(gruppe);
      gruppe.traverse((o) => o instanceof CSS2DObject && o.element.remove());
    };
  }, [scene, gruppe]);
  useFrame(() => {
    gl.render(scene, camera);
    renderer.render(scene, camera);
  }, 1);
  return null;
}

const MARK = {
  hover: new THREE.MeshBasicMaterial({ color: 0xc5f01e, transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  wahl: new THREE.MeshBasicMaterial({ color: 0x3d6300, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
};

function zielObjekt(gruppe: THREE.Object3D, z: Ziel): THREE.Object3D | null {
  if (!z) return null;
  if (z.art === 'wandseite') return gruppe.getObjectByName(`wand-${z.wandId}-${z.seite}`) ?? null;
  if (z.art === 'boden') return gruppe.getObjectByName(`boden-${z.raumId}`) ?? null;
  if (z.art === 'decke') return gruppe.getObjectByName(`boden-${z.raumId}`) ?? null;
  if (z.art === 'elektro') return gruppe.getObjectByName(`elektro-${z.id}`) ?? null;
  if (z.art === 'moebel') return gruppe.getObjectByName(`moebel-${z.id}`) ?? null;
  const id = z.art === 'oeffnung' ? z.id : '';
  let treffer: THREE.Object3D | null = null;
  gruppe.traverse((o) => {
    if (!treffer && (o.userData.art === 'tuer' || o.userData.art === 'fenster') && o.userData.id === id && !o.userData.ebene) treffer = o;
  });
  return treffer;
}

/** Highlight overlay for a mesh (same geometry, same parent) or a box outline for groups. */
function markiere(obj: THREE.Object3D | null, mat: THREE.MeshBasicMaterial): THREE.Object3D | null {
  if (!obj?.parent) return null;
  const mesh = obj as THREE.Mesh;
  if (mesh.isMesh) {
    const m = new THREE.Mesh(mesh.geometry, mat);
    m.position.copy(mesh.position);
    m.quaternion.copy(mesh.quaternion);
    m.scale.copy(mesh.scale);
    m.raycast = () => {};
    m.renderOrder = 5;
    mesh.parent!.add(m);
    return m;
  }
  const box = new THREE.BoxHelper(obj, mat === MARK.wahl ? 0x3d6300 : 0x8fb000);
  box.raycast = () => {};
  obj.parent.add(box);
  // BoxHelper works in world space; the parent here is in world space too (ausstattung group at origin)
  return box;
}

function Modell({ projekt, leicht, onBereit, befehl, onTreffer }: Props) {
  const { gl, invalidate, camera, scene } = useThree();
  const schluessel = geometrieSchluessel(projekt);
  // geometry only depends on the key; the project of that moment is good enough for it
  const szene = useMemo(() => baueSzene(projekt), [schluessel]); // eslint-disable-line react-hooks/exhaustive-deps
  const cache = useMemo(() => new MaterialCache(gl, leicht, () => invalidate()), [gl, leicht, invalidate]);
  const modus = useGestalt((s) => s.modus);
  const ziel = useGestalt((s) => s.ziel);
  const zonen = useGestalt((s) => s.zonen || s.modus === 'elektro');
  const waende = useGestalt((s) => s.waende);
  const blick = useGestalt((s) => s.blick);
  const masse = useGestalt((s) => s.masse);
  const screenshot = useGestalt((s) => s.screenshot);
  const hover = useRef<THREE.Object3D | null>(null);
  const hoverMark = useRef<THREE.Object3D | null>(null);

  useEffect(
    () => () => {
      entsorgeGestaltung(szene);
      szene.dispose();
    },
    [szene],
  );
  useEffect(() => () => cache.dispose(), [cache]);

  // shadows: walls and furniture cast, floors receive, ceilings never cast (they would darken the rooms)
  useEffect(() => {
    szene.gruppe.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const art = m.userData.art;
      m.castShadow = art === 'wand' || art === 'tuer';
      m.receiveShadow = art !== 'decke';
    });
  }, [szene]);

  useEffect(() => {
    gestalteSzene(szene, projekt, cache);
    invalidate();
  }, [szene, projekt, cache, invalidate]);

  const ausstattung = useMemo(() => baueAusstattung(projekt, { zonen, waendeSichtbar: waende === 'voll' }), [projekt, zonen, waende]);

  // walls lowered (Sims-like cut-away) or hidden; ceilings only with full walls
  useEffect(() => {
    for (const c of szene.gruppe.children) {
      if (!c.name.startsWith('wand-')) continue;
      c.visible = waende !== 'aus';
      c.scale.y = waende === 'niedrig' ? 0.36 : 1;
    }
    szene.decken.visible = waende === 'voll';
    invalidate();
  }, [szene, waende, invalidate]);

  // selection highlight
  useEffect(() => {
    const ob = zielObjekt(szene.gruppe, ziel) ?? zielObjekt(ausstattung, ziel);
    const m = markiere(ob, MARK.wahl);
    invalidate();
    return () => {
      m?.removeFromParent();
      invalidate();
    };
  }, [ziel, szene, ausstattung, projekt, invalidate]);

  // screenshot (local download, nothing is uploaded)
  const ersterScreenshot = useRef(screenshot);
  useEffect(() => {
    if (screenshot === ersterScreenshot.current) return;
    hoverMark.current?.removeFromParent();
    gl.render(scene, camera);
    gl.domElement.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raumplaner-ansicht-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/png');
  }, [screenshot]); // eslint-disable-line react-hooks/exhaustive-deps

  const treffer = (e: ThreeEvent<MouseEvent | PointerEvent>): Treffer | null => {
    const o = e.object;
    const plan = { x: Math.round(e.point.x * 1000) / 1000, y: Math.round(e.point.z * 1000) / 1000 };
    for (let x: THREE.Object3D | null = o; x; x = x.parent) {
      if (x.userData.art === 'elektro') return { art: 'elektro', id: x.userData.id, plan };
      if (x.userData.art === 'moebel') return { art: 'moebel', id: x.userData.id, plan };
    }
    const t = teilVon(o);
    if (!t) return { art: 'leer', plan };
    if (t.art === 'wand') return { art: 'wand', wandId: t.id, seite: t.seite, raumId: t.raumId, plan, hoehe: e.point.y };
    if (t.art === 'boden' || t.art === 'decke') return { art: t.art, raumId: t.id, plan };
    return t.art === 'tuer' || t.art === 'fenster' ? { art: t.art, id: t.id, wandId: t.wandId, plan } : { art: 'leer', plan };
  };

  const aktivModus = modus !== 'bauen' && modus !== 'ansicht' && blick !== 'rundgang';

  return (
    <>
      <Licht szene={szene} leicht={leicht} />
      <group
        onClick={(e) => {
          if (!onTreffer || modus === 'bauen' || modus === 'ansicht' || e.delta > 6) return;
          e.stopPropagation();
          const t = treffer(e);
          if (t) onTreffer(t);
        }}
        onPointerMove={(e) => {
          if (!aktivModus || e.pointerType === 'touch') return;
          e.stopPropagation();
          let ob: THREE.Object3D = e.object;
          for (let x: THREE.Object3D | null = e.object; x; x = x.parent) if (x.userData.art === 'elektro' || x.userData.art === 'moebel') ob = x;
          if (hover.current === ob) return;
          hover.current = ob;
          hoverMark.current?.removeFromParent();
          hoverMark.current = markiere(ob.userData.art === 'grund' ? null : ob, MARK.hover);
          invalidate();
        }}
        onPointerOut={() => {
          hover.current = null;
          hoverMark.current?.removeFromParent();
          hoverMark.current = null;
          invalidate();
        }}
      >
        <primitive object={szene.gruppe} />
        <primitive object={ausstattung} />
      </group>
      {blick === 'rundgang' ? <Rundgang projekt={projekt} onBereit={onBereit} /> : <Steuerung szene={szene} befehl={befehl} onBereit={onBereit} />}
      {masse && <Masse projekt={projekt} />}
    </>
  );
}

export default function Ansicht3D(props: Props) {
  return (
    <Canvas
      frameloop="demand"
      shadows={!props.leicht}
      dpr={props.leicht ? [1, 1.25] : [1, 2]}
      gl={{ antialias: !props.leicht, powerPreference: 'high-performance' }}
      camera={{ fov: 50, near: 0.05, far: 1000, position: [8, 8, 8] }}
      aria-hidden="true"
      data-planer-3d-canvas=""
    >
      <Modell {...props} />
    </Canvas>
  );
}
