// Pointer effects for desktop (hover + fine pointer only, never touch, never with reduced motion):
// - Tilt cards with depth: linked cards (.karte-link) lean towards the pointer.
// - Magnetic buttons: primary/large buttons follow the pointer a few pixels.
// - Cursor: a ring that follows the native cursor (which stays visible) and grows over targets.
// Values go through CSS custom properties set via CSSOM (CSP: no style attributes in markup).

type Aufraeumen = () => void;

function rafDrossel(fn: () => void) {
  let geplant = 0;
  return () => {
    if (geplant) return;
    geplant = requestAnimationFrame(() => {
      geplant = 0;
      fn();
    });
  };
}

const TILT_MAX = 6; // degrees

function tilt(): Aufraeumen {
  const karten = [...document.querySelectorAll<HTMLElement>('.karte-link')];
  const weg: Aufraeumen[] = [];
  for (const karte of karten) {
    karte.dataset.tilt = '';
    let x = 0.5;
    let y = 0.5;
    const setzen = rafDrossel(() => {
      karte.style.setProperty('--tilt-x', `${((0.5 - y) * TILT_MAX * 2).toFixed(2)}deg`);
      karte.style.setProperty('--tilt-y', `${((x - 0.5) * TILT_MAX * 2).toFixed(2)}deg`);
      karte.style.setProperty('--glanz-x', `${(x * 100).toFixed(1)}%`);
      karte.style.setProperty('--glanz-y', `${(y * 100).toFixed(1)}%`);
    });
    const bewegen = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = karte.getBoundingClientRect();
      x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      karte.classList.add('tilt-aktiv');
      setzen();
    };
    const verlassen = () => {
      karte.classList.remove('tilt-aktiv');
      x = 0.5;
      y = 0.5;
      setzen();
    };
    karte.addEventListener('pointermove', bewegen);
    karte.addEventListener('pointerleave', verlassen);
    weg.push(() => {
      karte.removeEventListener('pointermove', bewegen);
      karte.removeEventListener('pointerleave', verlassen);
      karte.classList.remove('tilt-aktiv');
      delete karte.dataset.tilt;
      for (const p of ['--tilt-x', '--tilt-y', '--glanz-x', '--glanz-y']) karte.style.removeProperty(p);
    });
  }
  return () => weg.forEach((f) => f());
}

const MAGNET_ZUG = 0.28;
const MAGNET_MAX = 10; // px

function magnet(): Aufraeumen {
  const knoepfe = [...document.querySelectorAll<HTMLElement>('.btn-l, .btn-primaer, [data-magnet]')].filter(
    (b) => !b.closest('[popover]') && !b.classList.contains('btn-text'),
  );
  const weg: Aufraeumen[] = [];
  for (const b of knoepfe) {
    b.dataset.magnet = '';
    let dx = 0;
    let dy = 0;
    const setzen = rafDrossel(() => {
      b.style.setProperty('--magnet-x', `${dx.toFixed(1)}px`);
      b.style.setProperty('--magnet-y', `${dy.toFixed(1)}px`);
    });
    const bewegen = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = b.getBoundingClientRect();
      const clamp = (v: number) => Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, v));
      dx = clamp((e.clientX - (r.left + r.width / 2)) * MAGNET_ZUG);
      dy = clamp((e.clientY - (r.top + r.height / 2)) * MAGNET_ZUG);
      setzen();
    };
    const verlassen = () => {
      dx = 0;
      dy = 0;
      setzen();
    };
    b.addEventListener('pointermove', bewegen);
    b.addEventListener('pointerleave', verlassen);
    weg.push(() => {
      b.removeEventListener('pointermove', bewegen);
      b.removeEventListener('pointerleave', verlassen);
      b.style.removeProperty('--magnet-x');
      b.style.removeProperty('--magnet-y');
      delete b.dataset.magnet;
    });
  }
  return () => weg.forEach((f) => f());
}

const ZIEL = 'a[href], button:not(:disabled), [role="button"], label, summary, input[type="range"], input[type="radio"], input[type="checkbox"], select';
const TEXT = 'input:not([type="range"]):not([type="radio"]):not([type="checkbox"]), textarea, [contenteditable="true"]';

function cursor(): Aufraeumen {
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring);

  let zx = -100;
  let zy = -100;
  let x = zx;
  let y = zy;
  let laeuft = 0;
  let sichtbar = false;

  const schritt = () => {
    // Critically damped follow; stops itself once settled (no idle rAF).
    x += (zx - x) * 0.3;
    y += (zy - y) * 0.3;
    ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    laeuft = Math.abs(zx - x) + Math.abs(zy - y) > 0.3 ? requestAnimationFrame(schritt) : 0;
  };
  const bewegen = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    zx = e.clientX;
    zy = e.clientY;
    if (!sichtbar) {
      x = zx;
      y = zy;
      sichtbar = true;
      ring.classList.add('ist-sichtbar');
    }
    const t = e.target instanceof Element ? e.target : null;
    ring.classList.toggle('ist-ziel', Boolean(t?.closest(ZIEL)));
    ring.classList.toggle('ist-text', Boolean(t?.closest(TEXT)));
    if (!laeuft) laeuft = requestAnimationFrame(schritt);
  };
  const raus = () => {
    sichtbar = false;
    ring.classList.remove('ist-sichtbar');
  };
  const druck = () => ring.classList.add('ist-gedrueckt');
  const los = () => ring.classList.remove('ist-gedrueckt');
  window.addEventListener('pointermove', bewegen, { passive: true });
  document.documentElement.addEventListener('pointerleave', raus);
  window.addEventListener('pointerdown', druck, { passive: true });
  window.addEventListener('pointerup', los, { passive: true });
  return () => {
    window.removeEventListener('pointermove', bewegen);
    document.documentElement.removeEventListener('pointerleave', raus);
    window.removeEventListener('pointerdown', druck);
    window.removeEventListener('pointerup', los);
    cancelAnimationFrame(laeuft);
    ring.remove();
  };
}

export function initZeiger(): Aufraeumen {
  const teile = [tilt(), magnet(), cursor()];
  return () => teile.forEach((f) => f());
}
