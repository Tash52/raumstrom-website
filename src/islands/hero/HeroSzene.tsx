// 3D hero "Hinter der Wand": a wall in cross-section that opens layer by layer while scrolling
// (paint → plaster → masonry → cable → socket). Procedural geometry only, no external assets.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CurvePath,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LineCurve3,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Plane,
  QuadraticBezierCurve3,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type PerspectiveCamera,
} from 'three';
import { DOSE, KABEL_PUNKTE, WAND, heroZustand, mauerwerk, type HeroZustand } from './wand.ts';
import { FARBE, kabelMaterial } from './kabel-material.ts';
import { Takt, daempfung, type SzenenSteuerung } from './takt.tsx';

const B = WAND.breite;
const H = WAND.hoehe;
const T = WAND.stein.t;
const PUTZ_D = 0.07;
const FARBE_D = 0.026;
const Z_FRONT = T / 2;
const Z_FERTIG = Z_FRONT + PUTZ_D + FARBE_D;

/** Corners rounded with a small radius so the tube bends like a real cable. */
function kabelKurve(z: number): CurvePath<Vector3> {
  const pfad = new CurvePath<Vector3>();
  const r = 0.14;
  const p = KABEL_PUNKTE.map(([x, y]) => new Vector3(x, y, z));
  let start = p[0]!.clone();
  for (let i = 1; i < p.length; i++) {
    const ecke = p[i]!;
    if (i === p.length - 1) {
      pfad.add(new LineCurve3(start, ecke));
      break;
    }
    const rein = new Vector3().subVectors(ecke, p[i - 1]!).normalize();
    const raus = new Vector3().subVectors(p[i + 1]!, ecke).normalize();
    const a = ecke.clone().addScaledVector(rein, -r);
    const b = ecke.clone().addScaledVector(raus, r);
    pfad.add(new LineCurve3(start, a));
    pfad.add(new QuadraticBezierCurve3(a, ecke, b));
    start = b;
  }
  return pfad;
}

/**
 * Layer slab with a slanted, broken left edge (like a peeled cross-section), extruded towards +z.
 * Deterministic jitter so poster and live scene match.
 */
function schichtGeometrie(tiefe: number, schraege: number, saat: number): ExtrudeGeometry {
  const s = new Shape();
  const links = -B / 2 - 0.35;
  s.moveTo(links, -H / 2);
  s.lineTo(B / 2, -H / 2);
  s.lineTo(B / 2, H / 2);
  const schritte = 18;
  for (let i = 0; i <= schritte; i++) {
    const t = i / schritte; // top → bottom
    const y = H / 2 - t * H;
    const zacke = i === 0 || i === schritte ? 0 : Math.sin(i * 12.9898 + saat * 78.233) * 0.045 + Math.sin(i * 3.1 + saat) * 0.03;
    s.lineTo(links - schraege * (1 - t) + zacke, y);
  }
  s.closePath();
  return new ExtrudeGeometry(s, { depth: tiefe, bevelEnabled: false, curveSegments: 1 });
}

const KLIPP = [new Plane(new Vector3(1, 0, 0), B / 2), new Plane(new Vector3(-1, 0, 0), B / 2)];

/**
 * Where the broken edge of a layer ends up when fully opened (x of its lower left corner). The socket
 * then sits on the finished, painted wall; the cable runs under the plaster to it.
 */
const ZIEL_PUTZ = 0.5;
const ZIEL_FARBE = 0.95;
const START_KANTE = -B / 2 - 0.35;

type Anwenden = (z: HeroZustand, zeit: number) => void;

function Wand({ api, leicht }: { api: { current: Anwenden }; leicht: boolean }) {
  const steine = useMemo(() => mauerwerk(leicht ? 'leicht' : 'voll'), [leicht]);
  const steinRef = useRef<InstancedMesh>(null);
  const putzRef = useRef<Mesh>(null);
  const farbeRef = useRef<Mesh>(null);
  const kabel = useRef<Group>(null);
  const doseRef = useRef<Group>(null);

  const geo = useMemo(() => {
    const kurve = kabelKurve(-0.02);
    return {
      stein: new BoxGeometry(1, 1, 1),
      putz: schichtGeometrie(PUTZ_D, 0.55, 1),
      farbe: schichtGeometrie(FARBE_D, 0.45, 2),
      kern: new TubeGeometry(kurve, leicht ? 120 : 220, 0.034, leicht ? 8 : 12, false),
      huelle: new TubeGeometry(kurve, leicht ? 120 : 220, 0.1, leicht ? 8 : 12, false),
      dose: new CylinderGeometry(0.17, 0.17, 0.2, leicht ? 20 : 32, 1, true),
      doseBoden: new CylinderGeometry(0.17, 0.17, 0.01, leicht ? 20 : 32),
      platte: new BoxGeometry(0.42, 0.42, 0.03),
      ring: new TorusGeometry(0.12, 0.012, 8, leicht ? 32 : 48),
      punkt: new SphereGeometry(0.045, 16, 12),
      glow: new SphereGeometry(0.16, 16, 12),
    };
  }, [leicht]);

  const mat = useMemo(
    () => ({
      stein: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 }),
      fuge: new MeshStandardMaterial({ color: '#3b4147', roughness: 1 }),
      putz: new MeshStandardMaterial({ color: FARBE.putz, roughness: 0.96, clippingPlanes: KLIPP }),
      farbe: new MeshStandardMaterial({ color: FARBE.kalk, roughness: 0.8, clippingPlanes: KLIPP }),
      kern: kabelMaterial(false),
      huelle: kabelMaterial(true, 1),
      dose: new MeshStandardMaterial({ color: '#0f1215', roughness: 0.7, side: 2 }),
      platte: new MeshStandardMaterial({ color: '#fbfaf7', roughness: 0.45, transparent: true }),
      ring: new MeshStandardMaterial({ color: FARBE.graphit, roughness: 0.6, transparent: true }),
      punkt: new MeshBasicMaterial({ color: FARBE.strom, transparent: true }),
      glow: new MeshBasicMaterial({ color: FARBE.strom, transparent: true, blending: AdditiveBlending, depthWrite: false }),
    }),
    [],
  );

  // Brick colours: warm-dark Graphit with a little variation per brick.
  const farben = useMemo(() => {
    const basis = new Color(FARBE.graphit2);
    return steine.map((st) => {
      const v = (Math.sin(st.x * 12.9898 + st.y * 78.233) * 43758.5453) % 1;
      return basis.clone().offsetHSL(0, 0, Math.abs(v) * 0.045 - 0.01);
    });
  }, [steine]);
  const kanalFarbe = useMemo(() => new Color('#0b0d10'), []);
  const tmpFarbe = useMemo(() => new Color(), []);
  useLayoutEffect(() => {
    const m = steinRef.current;
    if (!m) return;
    farben.forEach((c, i) => m.setColorAt(i, c));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [farben]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mat).forEach((m) => m.dispose());
    },
    [geo, mat],
  );

  const hilf = useMemo(() => ({ o: new Object3D() }), []);

  // Imperative update, called from the frame loop.
  api.current = (z: HeroZustand, zeit: number) => {
    const m = steinRef.current;
    if (m) {
      steine.forEach((st, i) => {
        const o = hilf.o;
        // Channel bricks are cut back (milled) in sequence along the cable: depth shrinks, back face stays.
        const q = st.schlitz ? Math.min(1, Math.max(0, (z.mauerwerk - st.reihenfolge * 0.6) / 0.4)) : 0;
        const e = q * q * (3 - 2 * q);
        const tiefe = T * (1 - 0.8 * e);
        o.position.set(st.x, st.y, -T / 2 + tiefe / 2);
        o.rotation.set(0, 0, 0);
        o.scale.set(st.l, st.h, tiefe);
        if (st.schlitz) m.setColorAt(i, tmpFarbe.copy(farben[i]!).lerp(kanalFarbe, e * 0.75));
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    if (putzRef.current) putzRef.current.position.x = (ZIEL_PUTZ - START_KANTE) * z.putz;
    if (farbeRef.current) farbeRef.current.position.x = (ZIEL_FARBE - START_KANTE) * z.farbe;
    const zeichnen = z.leitung * 1.0;
    for (const k of [mat.kern, mat.huelle]) {
      k.uniforms.uZeichnen!.value = zeichnen;
      k.uniforms.uZeit!.value = zeit;
    }
    if (kabel.current) kabel.current.visible = zeichnen > 0.001;
    const d = z.dose;
    if (doseRef.current) {
      const s = 0.85 + 0.15 * d;
      doseRef.current.children[0]!.scale.setScalar(s);
      doseRef.current.children[0]!.visible = d > 0.001;
    }
    mat.platte.opacity = d;
    mat.ring.opacity = d;
    const puls = 0.75 + 0.25 * Math.sin(zeit * 2.2);
    mat.punkt.opacity = d;
    mat.glow.opacity = d * 0.38 * puls;
  };

  return (
    <group>
      {/* mortar bed behind the bricks, visible in joints and the opened channel */}
      <mesh position={[0, 0, -T / 2 + 0.01]} material={mat.fuge}>
        <boxGeometry args={[B, H, 0.02]} />
      </mesh>
      <instancedMesh ref={steinRef} args={[geo.stein, mat.stein, steine.length]} />
      <mesh ref={putzRef} geometry={geo.putz} material={mat.putz} position={[0, 0, Z_FRONT]} />
      <mesh ref={farbeRef} geometry={geo.farbe} material={mat.farbe} position={[0, 0, Z_FRONT + PUTZ_D]} />
      <group ref={kabel}>
        <mesh geometry={geo.kern} material={mat.kern} />
        <mesh geometry={geo.huelle} material={mat.huelle} renderOrder={2} />
      </group>
      <group ref={doseRef} position={[DOSE.x, DOSE.y, 0]}>
        <group>
          <mesh geometry={geo.platte} material={mat.platte} position={[0, 0, Z_FERTIG + 0.015]} />
          <mesh geometry={geo.ring} material={mat.ring} position={[0, 0, Z_FERTIG + 0.032]} />
          <mesh geometry={geo.punkt} material={mat.punkt} position={[0, 0, Z_FERTIG + 0.05]} />
          <mesh geometry={geo.glow} material={mat.glow} position={[0, 0, Z_FERTIG + 0.06]} renderOrder={3} />
        </group>
        <mesh geometry={geo.dose} material={mat.dose} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geo.doseBoden} material={mat.dose} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.1]} />
      </group>
    </group>
  );
}

const ANSICHT_BASIS = new Vector3(-1.75, 0.55, 6.5);
const BLICK = new Vector3(0.1, -0.05, 0);

function Regie({ s, startP, leicht }: { s: SzenenSteuerung; startP: number; leicht: boolean }) {
  const camera = useThree((st) => st.camera) as PerspectiveCamera;
  const p = useRef(startP);
  const zeit = useRef(0);
  const zeiger = useRef({ x: 0, y: 0 });
  const anwenden = useRef<Anwenden>(() => {});

  const schritt = (dt: number) => {
    if (s.poster) p.current = s.ziel;
    else p.current += (s.ziel - p.current) * daempfung(dt, 7);
    if (!s.pausiert && !s.poster) zeit.current += dt;
    zeiger.current.x += (s.zeigerX - zeiger.current.x) * daempfung(dt, 3);
    zeiger.current.y += (s.zeigerY - zeiger.current.y) * daempfung(dt, 3);
    camera.position.set(ANSICHT_BASIS.x + zeiger.current.x * 0.35, ANSICHT_BASIS.y - zeiger.current.y * 0.22, ANSICHT_BASIS.z);
    camera.lookAt(BLICK);
    anwenden.current(heroZustand(p.current), zeit.current);
    return Math.abs(s.ziel - p.current) > 1e-4 || Math.abs(s.zeigerX - zeiger.current.x) + Math.abs(s.zeigerY - zeiger.current.y) > 1e-3;
  };

  return (
    <>
      <Takt s={s} schritt={schritt} />
      <Wand api={anwenden} leicht={leicht} />
    </>
  );
}

export function HeroSzene({ s, leicht, dpr }: { s: SzenenSteuerung; leicht: boolean; dpr: [number, number] }) {
  return (
    <Canvas
      frameloop="demand"
      flat
      dpr={dpr}
      camera={{ position: ANSICHT_BASIS.toArray(), fov: 34, near: 0.1, far: 40 }}
      gl={{ antialias: !leicht, alpha: true, powerPreference: 'high-performance', localClippingEnabled: true } as never}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <hemisphereLight args={['#fbfaf7', '#232a31', 1.6]} />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} />
      <directionalLight position={[4, -1, 3]} intensity={0.5} color={FARBE.strom} />
      <Regie s={s} startP={s.ziel} leicht={leicht} />
    </Canvas>
  );
}
