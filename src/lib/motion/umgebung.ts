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

/**
 * Renderer strings of CPU rasterisers. Chrome's "major performance caveat" does not cover SwiftShader
 * (headless Chrome, Lighthouse, VMs without GPU), Mesa llvmpipe/softpipe/lavapipe or Windows' Basic
 * Render Driver, so they are recognised by name and treated like "no WebGL" (poster).
 */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render driver|microsoft basic/i;

export function istSoftwareRenderer(name: string | null | undefined): boolean {
  return Boolean(name) && SOFTWARE_RENDERER.test(name!);
}

/**
 * Renderer description of a context: the unmasked string via WEBGL_debug_renderer_info where the
 * browser still offers it (Chrome, Safari), otherwise gl.RENDERER (Firefox reports a sanitised but
 * still telling name there, e.g. "llvmpipe" or "SwiftShader"). Both are checked; empty if unknown.
 */
export function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const teile: string[] = [];
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) teile.push(String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? ''));
  } catch {
    /* extension blocked (privacy settings): fall through */
  }
  try {
    teile.push(String(gl.getParameter(gl.RENDERER) ?? ''));
  } catch {
    /* ignore */
  }
  return teile.filter(Boolean).join(' | ');
}

type WebGLBefund = { ok: boolean; software: boolean; renderer: string };
const webglCache = new Map<boolean, WebGLBefund>();

/**
 * Probe WebGL 2 (three.js r163+ requires it) with one throwaway context, released right away.
 * streng: also fail on a "major performance caveat"; software renderers are reported separately.
 */
export function pruefeWebGL(streng = true): WebGLBefund {
  const cached = webglCache.get(streng);
  if (cached) return cached;
  let befund: WebGLBefund = { ok: false, software: false, renderer: '' };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: streng });
    if (gl) {
      const renderer = rendererName(gl);
      befund = { ok: true, software: istSoftwareRenderer(renderer), renderer };
    }
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    /* no WebGL */
  }
  webglCache.set(streng, befund);
  return befund;
}

/** WebGL 2 available (any renderer)? */
export function hatWebGL(streng = true): boolean {
  return pruefeWebGL(streng).ok;
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
  const gl = pruefeWebGL();
  if (!gl.ok) return { ok: false, grund: 'kein-webgl' };
  if (gl.software) return { ok: false, grund: 'software-renderer' };
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

const INTERAKTION = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/**
 * Deferred start for heavy work (3D): on the first user interaction or `verzoegerung` ms after load,
 * whichever comes first, and then only in an idle period. The interaction itself is never delayed:
 * the work is queued behind it, so it does not land in that interaction's INP.
 */
export function nachInteraktionOderSpaeter(fn: () => void, verzoegerung = 2000): () => void {
  let fertig = false;
  let timer = 0;
  const los = () => {
    if (fertig) return;
    fertig = true;
    aufraeumen();
    wennRuhig(fn, 1000);
  };
  const aufraeumen = () => {
    window.clearTimeout(timer);
    for (const t of INTERAKTION) window.removeEventListener(t, los, true);
    window.removeEventListener('load', nachLoad);
  };
  const nachLoad = () => {
    timer = window.setTimeout(los, verzoegerung);
  };
  for (const t of INTERAKTION) window.addEventListener(t, los, { capture: true, passive: true, once: true });
  if (document.readyState === 'complete') nachLoad();
  else window.addEventListener('load', nachLoad, { once: true });
  return () => {
    fertig = true;
    aufraeumen();
  };
}

/** Give the main thread back between chunks of setup work (scheduler.yield where available). */
export function abgeben(): Promise<void> {
  const sch = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (sch?.yield) return sch.yield();
  return new Promise((r) => setTimeout(r, 0));
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
