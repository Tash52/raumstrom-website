// 3D view of the project (own lazy chunk: three.js, R3F, CSG). Renders on demand only.
// Operation: drag to orbit, two fingers / wheel to zoom, keyboard (arrows rotate/tilt, +/- zoom),
// and buttons. UI wording: "Ansicht" only.
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Projekt } from '../../../lib/geometry/index.ts';
import { type Szene, baueSzene } from './bauen.ts';
import type { AnsichtBefehl } from './befehle.ts';


interface Props {
  projekt: Projekt;
  befehl: { nr: number; b: AnsichtBefehl } | null;
  leicht: boolean;
  onBereit?: () => void;
}

const MAX_POLAR = Math.PI / 2 - 0.05;

function startPosition(s: Szene, aspekt = 1.5): THREE.Vector3 {
  // narrow (portrait) views need more distance, the field of view is vertical
  const d = Math.max(6, s.groesse * 1.05) / Math.min(1, Math.max(0.62, aspekt / 1.3));
  return new THREE.Vector3(s.mitte.x + d * 0.55, d * 0.85, s.mitte.z + d * 0.75);
}

function Steuerung({ szene, befehl, onBereit }: { szene: Szene; befehl: Props['befehl']; onBereit?: () => void }) {
  const { camera, gl, invalidate } = useThree();
  const ctrl = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = false;
    c.maxPolarAngle = MAX_POLAR;
    c.minDistance = 1.5;
    c.maxDistance = Math.max(30, szene.groesse * 4);
    c.screenSpacePanning = false;
    c.target.copy(szene.mitte).setY(0);
    camera.position.copy(startPosition(szene, gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight)));
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

  useEffect(() => {
    const c = ctrl.current;
    if (!c || !befehl) return;
    const b = befehl.b;
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
  }, [befehl]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function Ansicht3D({ projekt, befehl, leicht, onBereit }: Props) {
  const szene = useMemo(() => baueSzene(projekt), [projekt]);
  useEffect(() => () => szene.dispose(), [szene]);
  return (
    <Canvas
      frameloop="demand"
      dpr={leicht ? [1, 1.25] : [1, 2]}
      gl={{ antialias: !leicht, powerPreference: 'high-performance' }}
      camera={{ fov: 45, near: 0.05, far: 1000, position: startPosition(szene).toArray() }}
      aria-hidden="true"
      data-planer-3d-canvas=""
    >
      <color attach="background" args={['#f4f1eb']} />
      <hemisphereLight args={['#ffffff', '#cfc6b6', 1.9]} />
      <directionalLight position={[szene.mitte.x + 8, 14, szene.mitte.z + 5]} intensity={1.8} />
      <directionalLight position={[szene.mitte.x - 6, 9, szene.mitte.z - 8]} intensity={0.5} />
      <primitive object={szene.gruppe} />
      <Steuerung szene={szene} befehl={befehl} onBereit={onBereit} />
    </Canvas>
  );
}
