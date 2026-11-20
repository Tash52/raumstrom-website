// 3D stage of the "Säulen" journey: one object per pillar on a rail, scrubbed by scroll.
// 0 Modernisieren: the RAUMSTROM mark as a room (floor plan with door, cable comes in, ends in a dot)
// 1 Elektrifizieren: wallbox with charging cable
// 2 Sicher betreiben: test device with probes and a test record (Prüfprotokoll)
// Procedural geometry, no external assets.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FARBE, kabelMaterial } from '../hero/kabel-material.ts';
import { Takt, Vorwaermen, daempfung, type SzenenSteuerung } from '../hero/takt.tsx';

/** Objects sit on a rail that moves in step with the horizontal text track. */
const ABSTAND = 3.2;

function useAufraeumen(dinge: Array<BufferGeometry | Material>) {
  useEffect(() => () => dinge.forEach((d) => d.dispose()), [dinge]);
}

/** Smooth cable through the points; eckig = straight runs with small rounded corners (installation). */
function kabelGeo(punkte: Array<[number, number, number]>, r: number, eckig = false) {
  const kurve = new CatmullRomCurve3(
    punkte.map((p) => new Vector3(...p)),
    false,
    eckig ? 'catmullrom' : 'centripetal',
    eckig ? 0.02 : 0.5,
  );
  return new TubeGeometry(kurve, 128, r, 12, false);
}

function useMaterialien() {
  return useMemo(
    () => ({
      kalk: new MeshStandardMaterial({ color: FARBE.kalk, roughness: 0.85 }),
      kalkTief: new MeshStandardMaterial({ color: '#d9d3c7', roughness: 0.9 }),
      graphit: new MeshStandardMaterial({ color: FARBE.graphit, roughness: 0.55, metalness: 0.1 }),
      graphit2: new MeshStandardMaterial({ color: FARBE.graphit2, roughness: 0.6 }),
      linie: new MeshStandardMaterial({ color: '#9aa0a6', roughness: 0.8 }),
      gruen: new MeshStandardMaterial({ color: FARBE.kabelgruen, roughness: 0.6 }),
      strom: new MeshBasicMaterial({ color: FARBE.strom }),
      // Light ground: normal blending (additive glow would wash out to white on Kalk).
      glow: new MeshBasicMaterial({ color: FARBE.strom, transparent: true, opacity: 0.3, depthWrite: false }),
      kabel: kabelMaterial(false),
    }),
    [],
  );
}
type Mat = ReturnType<typeof useMaterialien>;

/** The brand mark in 3D: 48-unit grid from the SVG, 0.05 world units per unit. */
function Raum({ m }: { m: Mat }) {
  const g = useMemo(() => {
    const k = (x: number, z: number, y = 0.06): [number, number, number] => [(x - 24) * 0.05, y, (z - 24) * 0.05];
    return {
      boden: new BoxGeometry(2.1, 0.06, 2.1),
      wandLang: new BoxGeometry(1.8 + 0.2, 0.55, 0.2),
      wandKurz: new BoxGeometry(0.2, 0.55, 1.0 + 0.1),
      wandStummel: new BoxGeometry(0.2, 0.55, 0.1 + 0.1),
      kabel: kabelGeo([k(54, 33), k(40, 33), k(26.5, 33), k(25, 31.5), k(25, 22.5)], 0.05, true),
      punkt: new SphereGeometry(0.16, 24, 16),
      glow: new SphereGeometry(0.27, 24, 16),
    };
  }, []);
  useAufraeumen(Object.values(g));
  // Walls: path M42 26 V6 H6 V42 H42 V40 (door opening on the right between z 26 and 40).
  const w = (x: number) => (x - 24) * 0.05;
  return (
    <group rotation={[0.6, -0.62, 0]} scale={0.66} position={[0, -0.05, 0]}>
      <mesh geometry={g.boden} material={m.kalkTief} position={[0, -0.03, 0]} />
      <mesh geometry={g.wandLang} material={m.graphit} position={[0, 0.275, w(6)]} />
      <mesh geometry={g.wandLang} material={m.graphit} position={[0, 0.275, w(42)]} />
      <mesh geometry={g.wandKurz} material={m.graphit} position={[w(6), 0.275, w(24) - 0.0]} scale={[1, 1, 1.75]} />
      <mesh geometry={g.wandKurz} material={m.graphit} position={[w(42), 0.275, w(16)]} />
      <mesh geometry={g.wandStummel} material={m.graphit} position={[w(42), 0.275, w(41)]} />
      <mesh geometry={g.kabel} material={m.kabel} />
      <mesh geometry={g.punkt} material={m.strom} position={[w(25), 0.16, w(18)]} />
      <mesh geometry={g.glow} material={m.glow} position={[w(25), 0.16, w(18)]} renderOrder={3} />
    </group>
  );
}

function Wallbox({ m }: { m: Mat }) {
  const g = useMemo(
    () => ({
      wand: new BoxGeometry(1.7, 2.1, 0.08),
      koerper: new RoundedBoxGeometry(0.8, 1.05, 0.28, 4, 0.08),
      blende: new RoundedBoxGeometry(0.62, 0.86, 0.02, 2, 0.04),
      ring: new TorusGeometry(0.16, 0.025, 12, 48),
      punkt: new SphereGeometry(0.05, 16, 12),
      stecker: new CylinderGeometry(0.09, 0.1, 0.32, 24),
      kabel: kabelGeo(
        [
          [0, -0.52, 0.06],
          [0.05, -0.85, 0.2],
          [0.45, -1.0, 0.45],
          [0.7, -0.6, 0.55],
          [0.62, -0.2, 0.6],
        ],
        0.045,
      ),
      zuleitung: kabelGeo(
        [
          [0, 1.06, -0.02],
          [0, 0.8, -0.02],
          [0, 0.52, -0.02],
        ],
        0.035,
        true,
      ),
    }),
    [],
  );
  useAufraeumen(Object.values(g));
  return (
    <group rotation={[0.08, -0.35, 0]} scale={0.9} position={[0, 0.1, 0]}>
      <mesh geometry={g.wand} material={m.kalk} position={[0, 0, -0.18]} />
      <mesh geometry={g.zuleitung} material={m.kabel} />
      <mesh geometry={g.koerper} material={m.graphit} />
      <mesh geometry={g.blende} material={m.graphit2} position={[0, 0, 0.145]} />
      <mesh geometry={g.ring} material={m.strom} position={[0, 0.12, 0.16]} />
      <mesh geometry={g.punkt} material={m.strom} position={[0, 0.12, 0.17]} />
      <mesh geometry={g.kabel} material={m.graphit} />
      <mesh geometry={g.stecker} material={m.graphit2} position={[0.62, -0.08, 0.6]} />
      <mesh geometry={g.punkt} material={m.strom} position={[0.62, 0.09, 0.6]} />
    </group>
  );
}

function Pruefung({ m }: { m: Mat }) {
  const g = useMemo(
    () => ({
      blatt: new BoxGeometry(1.0, 1.35, 0.015),
      zeile: new BoxGeometry(0.5, 0.035, 0.01),
      haken: kabelGeo(
        [
          [-0.05, 0, 0],
          [0, -0.05, 0],
          [0.1, 0.07, 0],
        ],
        0.016,
        true,
      ),
      geraet: new RoundedBoxGeometry(0.62, 1.0, 0.2, 4, 0.07),
      schirm: new BoxGeometry(0.46, 0.32, 0.01),
      balken: new BoxGeometry(0.06, 1, 0.01),
      knopf: new CylinderGeometry(0.09, 0.09, 0.06, 24),
      // Test leads leave the top of the device and loop down on the left, probe tips at the ends.
      leitungA: kabelGeo(
        [
          [-0.14, 0.5, 0],
          [-0.2, 0.78, 0.05],
          [-0.55, 0.82, 0.15],
          [-0.72, 0.45, 0.25],
          [-0.7, 0.05, 0.3],
        ],
        0.024,
      ),
      leitungB: kabelGeo(
        [
          [0.14, 0.5, 0],
          [0.16, 0.92, 0.05],
          [-0.6, 1.0, 0.2],
          [-0.9, 0.55, 0.3],
          [-0.88, 0.0, 0.35],
        ],
        0.024,
      ),
      spitze: new CylinderGeometry(0.03, 0.012, 0.22, 12),
    }),
    [],
  );
  useAufraeumen(Object.values(g));
  const zeilen = [0.4, 0.22, 0.04, -0.14, -0.32];
  return (
    <group rotation={[0.05, -0.3, 0]} scale={0.85} position={[0.15, -0.05, 0]}>
      <group position={[0.45, 0.1, -0.35]} rotation={[0, 0, -0.06]}>
        <mesh geometry={g.blatt} material={m.kalk} />
        {zeilen.map((y) => (
          <group key={y}>
            <mesh geometry={g.zeile} material={m.linie} position={[-0.12, y, 0.012]} />
            <mesh geometry={g.haken} material={m.gruen} position={[0.27, y, 0.015]} />
          </group>
        ))}
      </group>
      <group position={[-0.35, -0.05, 0.1]} rotation={[0, 0.15, 0.04]}>
        <mesh geometry={g.geraet} material={m.graphit} />
        <mesh geometry={g.schirm} material={m.graphit2} position={[0, 0.2, 0.105]} />
        {[0.08, 0.14, 0.2, 0.12].map((h, i) => (
          <mesh key={i} geometry={g.balken} material={m.strom} position={[-0.12 + i * 0.08, 0.1 + h / 2, 0.112]} scale={[1, h, 1]} />
        ))}
        <mesh geometry={g.knopf} material={m.graphit2} position={[0, -0.18, 0.11]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={g.leitungA} material={m.graphit} />
        <mesh geometry={g.leitungB} material={m.kabel} />
        <mesh geometry={g.spitze} material={m.graphit2} position={[-0.7, -0.06, 0.3]} />
        <mesh geometry={g.spitze} material={m.strom} position={[-0.88, -0.11, 0.35]} />
      </group>
    </group>
  );
}

function Schiene({ s }: { s: SzenenSteuerung }) {
  const m = useMaterialien();
  useAufraeumen(Object.values(m));
  const objekte = useRef<Array<Group | null>>([]);
  const t = useRef(s.ziel);
  const zeit = useRef(0);

  const schritt = (dt: number) => {
    if (s.poster) t.current = s.ziel;
    else t.current += (s.ziel - t.current) * daempfung(dt, 6);
    if (!s.pausiert && !s.poster) zeit.current += dt;
    objekte.current.forEach((o, i) => {
      if (!o) return;
      const d = i - t.current; // −1 … 1 around the active object
      const abstand = Math.min(1, Math.abs(d));
      o.position.set(d * ABSTAND, Math.sin(zeit.current * 0.9 + i * 2) * 0.04, -abstand * 1.2);
      o.rotation.set(0, d * 0.7 + Math.sin(zeit.current * 0.6 + i) * 0.12, 0);
      o.scale.setScalar(1 - 0.3 * abstand);
      o.visible = s.poster ? i === Math.round(s.ziel) : Math.abs(d) < 1.4;
    });
    m.kabel.uniforms.uZeit!.value = zeit.current;
    m.glow.opacity = 0.28 + 0.1 * Math.sin(zeit.current * 2.2);
    return Math.abs(s.ziel - t.current) > 1e-4;
  };

  const inhalte = [Raum, Wallbox, Pruefung];
  return (
    <>
      <Takt s={s} schritt={schritt} />
      <group>
        {inhalte.map((Inhalt, i) => (
          <group
            key={i}
            ref={(el) => {
              objekte.current[i] = el;
            }}
          >
            <Inhalt m={m} />
          </group>
        ))}
      </group>
    </>
  );
}

export function JourneySzene({ s, dpr }: { s: SzenenSteuerung; dpr: [number, number] }) {
  return (
    <Canvas
      frameloop="never" /* Vorwaermen switches to "demand" after shader warm-up */
      flat
      dpr={dpr}
      camera={{ position: [0, 0.35, 4.6], fov: 34, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(0x000000, 0);
        camera.lookAt(0, 0, 0);
      }}
    >
      <hemisphereLight args={['#fbfaf7', '#6b6458', 1.5]} />
      <directionalLight position={[-3, 4, 5]} intensity={2.1} />
      <directionalLight position={[3, 1, -2]} intensity={0.6} />
      <Schiene s={s} />
      <Vorwaermen />
    </Canvas>
  );
}
