// Frame loop shared by hero and journey scenes. Canvas runs with frameloop="demand": a frame is only
// rendered while something moves (pulse running, lerp not settled) and the scene is visible.
// Also runs the FPS check (lowers resolution once, then gives up so the controller shows the poster).
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { fpsWaechter, type FpsUrteil } from '../../lib/motion/fps.ts';

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

/** Frame-rate independent easing factor. */
export function daempfung(dt: number, rate = 6): number {
  return 1 - Math.exp(-dt * rate);
}
