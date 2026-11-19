// Capability checks shared by all motion parts (motion-3d). Pure browser code, no imports.
// Every effect asks here first; anything that fails falls back to the static page.

const MQ_REDUCE = '(prefers-reduced-motion: reduce)';
const MQ_FEIN = '(hover: hover) and (pointer: fine)';
const MQ_FORCED = '(forced-colors: active)';

/** Session flag set by the FPS check: once a device proved too slow, no further 3D in this session. */
export const SCHWACH_KEY = 'raumstrom:3d-schwach';

export function reduzierteBewegung(): boolean {
  return window.matchMedia(MQ_REDUCE).matches || document.documentElement.dataset.motion === 'reduce';
}

/** Desktop pointer (mouse/trackpad). Touch devices get no tilt, magnet or cursor. */
export function feinerZeiger(): boolean {
  return window.matchMedia(MQ_FEIN).matches && !window.matchMedia(MQ_FORCED).matches;
}

export function aufReduceAenderung(fn: (reduce: boolean) => void): void {
  window.matchMedia(MQ_REDUCE).addEventListener('change', (e) => fn(e.matches));
}

const webglCache = new Map<boolean, boolean>();
/**
 * WebGL 2 available? (three.js r163+ requires WebGL 2.) Creates and releases one throwaway context.
 * streng: also fail on a "major performance caveat" (software rendering), which counts as weak.
 */
export function hatWebGL(streng = true): boolean {
  const cached = webglCache.get(streng);
  if (cached !== undefined) return cached;
  let ok = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: streng });
    ok = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    ok = false;
  }
  webglCache.set(streng, ok);
  return ok;
}

/**
 * Test/tooling switch: `?3d=erzwingen` skips the weak-device heuristics (not reduced motion, not a
 * missing WebGL). `?poster=<szene>` renders a fixed state for the poster images (see poster.mjs).
 */
export function testSchalter(): { erzwingen: boolean; poster: string | null } {
  const q = new URLSearchParams(location.search);
  const poster = q.get('poster');
  return { erzwingen: q.get('3d') === 'erzwingen' || poster !== null, poster };
}

type NavigatorMitHinweisen = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/**
 * Weak device heuristics before loading 3D: few cores, little memory, data saver, or an earlier
 * failed FPS check in this session. The FPS measurement after start (fps.ts) catches the rest.
 */
export function schwachesGeraet(): { schwach: boolean; grund?: string } {
  const nav = navigator as NavigatorMitHinweisen;
  if ((nav.hardwareConcurrency ?? 4) < 4) return { schwach: true, grund: 'kerne' };
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return { schwach: true, grund: 'speicher' };
  if (nav.connection?.saveData) return { schwach: true, grund: 'datensparen' };
  try {
    if (sessionStorage.getItem(SCHWACH_KEY) === '1') return { schwach: true, grund: 'fps' };
  } catch {
    /* storage blocked: ignore */
  }
  return { schwach: false };
}

export function merkeSchwach(): void {
  try {
    sessionStorage.setItem(SCHWACH_KEY, '1');
  } catch {
    /* ignore */
  }
}

export type DreiDEntscheidung = { ok: true } | { ok: false; grund: string };

/** Single decision used by hero and journey: may this page start a WebGL scene? */
export function darf3D(): DreiDEntscheidung {
  const { erzwingen, poster } = testSchalter();
  if (reduzierteBewegung() && poster === null) return { ok: false, grund: 'reduzierte-bewegung' };
  if (erzwingen) return hatWebGL(false) ? { ok: true } : { ok: false, grund: 'kein-webgl' };
  const s = schwachesGeraet();
  if (s.schwach) return { ok: false, grund: `schwaches-geraet:${s.grund}` };
  if (!hatWebGL()) return { ok: false, grund: 'kein-webgl' };
  return { ok: true };
}

/** Run after load and when the main thread is idle, so 3D never competes with LCP or first input. */
export function wennRuhig(fn: () => void, timeout = 1500): void {
  const go = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout });
    else setTimeout(fn, 200);
  };
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}

/** Resolve once the element is within `rootMargin` of the viewport (then stop observing). */
export function wennSichtbar(el: Element, fn: () => void, rootMargin = '25% 0px'): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { rootMargin },
  );
  io.observe(el);
  return () => io.disconnect();
}
