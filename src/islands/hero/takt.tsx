// Frame loop shared by hero and journey scenes. Canvas starts with frameloop="never" (Vorwaermen
// compiles shaders first), then runs "demand": a frame is only rendered while something moves
// (pulse running, lerp not settled) and the scene is visible. Paused + settled = no frames at all.
// Also runs the FPS check (lowers resolution once, then gives up so the controller shows the poster).
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Mesh, Object3D } from 'three';
import { fpsWaechter, type FpsUrteil } from '../../lib/motion/fps.ts';
import { abgeben } from '../../lib/motion/umgebung.ts';

export interface SzenenSteuerung {
  /** Target progress (scroll); the scene eases towards it. */
  ziel: number;
  pausiert: boolean;
  sichtbar: boolean;
  /** Poster rendering: jump to the target, no loop, no FPS check. */
  poster: boolean;
  /** Pointer position −1..1 (mouse only), for a little parallax. */
  zeigerX: number;
  zeigerY: number;
  /** Set by the scene: request a frame (after scroll, resume, visibility change). */
  anstossen?: () => void;
  /** Called by the scene after the first frames are on screen. */
  bereit?: () => void;
  /** FPS verdict "aufgeben": controller unmounts and keeps the poster. */
  urteil?: (u: FpsUrteil, fps: number) => void;
}

/** schritt(dt) advances the scene and returns true while it is still easing. */
export function Takt({ s, schritt }: { s: SzenenSteuerung; schritt: (dt: number) => boolean }) {
  const invalidate = useThree((st) => st.invalidate);
  const setDpr = useThree((st) => st.setDpr);
  const fps = useMemo(() => fpsWaechter(), []);
  const frames = useRef(0);

  useEffect(() => {
    s.anstossen = () => invalidate();
    invalidate();
    return () => {
      s.anstossen = undefined;
    };
  }, [s, invalidate]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const weiter = schritt(dt);
    frames.current++;
    if (frames.current === 3) s.bereit?.();
    const laufen = !s.poster && s.sichtbar && !s.pausiert;
    if (laufen) {
      const u = fps.frame(performance.now());
      if (u === 'aufloesung-senken') setDpr(1);
      else if (u === 'aufgeben') s.urteil?.(u, fps.schnitt);
    } else {
      fps.zuruecksetzen();
    }
    if (frames.current < 3 || laufen || (weiter && s.sichtbar)) state.invalidate();
  });
  return null;
}

/**
 * Shader warm-up before the first frame. The Canvas starts with frameloop="never"; this compiles the
 * programs mesh by mesh (compileAsync uses KHR_parallel_shader_compile where available) and yields
 * to the main thread in between, so the start is several short tasks instead of one long first frame.
 * Then it switches to "demand" and requests the first frame.
 */
export function Vorwaermen() {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const camera = useThree((st) => st.camera);
  const setFrameloop = useThree((st) => st.setFrameloop);
  const invalidate = useThree((st) => st.invalidate);

  useEffect(() => {
    let weg = false;
    void (async () => {
      const meshes: Object3D[] = [];
      scene.traverse((o) => {
        if ((o as Mesh).isMesh) meshes.push(o);
      });
      for (const m of meshes) {
        await abgeben();
        if (weg) return;
        try {
          await gl.compileAsync(m, camera, scene);
        } catch {
          /* compiled lazily on the first frame instead */
        }
      }
      await abgeben();
      if (weg) return;
      setFrameloop('demand');
      invalidate();
    })();
    return () => {
      weg = true;
    };
  }, [gl, scene, camera, setFrameloop, invalidate]);
  return null;
}

/** Frame-rate independent easing factor. */
export function daempfung(dt: number, rate = 6): number {
  return 1 - Math.exp(-dt * rate);
}
