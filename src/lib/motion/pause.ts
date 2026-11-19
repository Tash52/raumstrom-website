// Global "pause animations" switch (WCAG 2.2.2). Stops every self-running loop (cable pulse, idle
// rotation); scroll-linked motion stays user-driven. Persisted in localStorage (no cookie), synced to
// every [data-motion-pause] button via aria-pressed and to <html class="bewegung-pausiert">.

const KEY = 'raumstrom:bewegung-pausiert';
type Hoerer = (pausiert: boolean) => void;
const hoerer = new Set<Hoerer>();
let pausiert = lesen();

function lesen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function istPausiert(): boolean {
  return pausiert;
}

export function setzePausiert(wert: boolean): void {
  pausiert = wert;
  try {
    if (wert) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  anwenden();
  for (const h of hoerer) h(wert);
}

export function aufPause(h: Hoerer): () => void {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

function anwenden(): void {
  document.documentElement.classList.toggle('bewegung-pausiert', pausiert);
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-motion-pause]')) {
    b.setAttribute('aria-pressed', String(pausiert));
  }
}

/** Wire all pause buttons on the page. Buttons start `hidden` and are shown only when something moves. */
export function initPauseKnoepfe(): void {
  anwenden();
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-motion-pause]')) {
    b.addEventListener('click', () => setzePausiert(!pausiert));
  }
}

/** Show the pause button(s) inside `scope` (called once a looping animation actually runs). */
export function zeigePauseKnopf(scope: ParentNode): void {
  for (const b of scope.querySelectorAll<HTMLButtonElement>('[data-motion-pause]')) b.hidden = false;
}
