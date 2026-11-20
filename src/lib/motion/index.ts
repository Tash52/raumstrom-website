// Motion entry (bundled module script from components/sections/Motion.astro, on every page).
// Order of cost: nothing heavy runs before load; GSAP is fetched only if motion is allowed and
// something scroll-linked actually needs it: the journey at once (it pins), section cables and the
// process cable only once one of them comes within half a viewport of the screen. Form pages (/kontakt/…) never load GSAP
// for the cables: their lines keep the static drawing, the form's LCP is not delayed (Phase 4).
// Tool pages (/raumplaner/, /planer/…) never load GSAP at all: the planner owns the main thread there
// (Befund B3, Phase 4).
// The 3D chunks load only from the hero/journey controllers.
import { initPauseKnoepfe } from './pause.ts';
import { aufReduceAenderung, feinerZeiger, reduzierteBewegung } from './umgebung.ts';
import { initZeiger } from './zeiger.ts';
import { initHero } from '../../islands/hero/steuerung.ts';
import { initSlider } from './slider.ts';

const html = document.documentElement;
html.classList.add('motion-js');
initPauseKnoepfe();
initSlider();
initHero();

/** Pages with a form: cable animation is decoration there and must not compete with the form. */
const FORMULAR_SEITE = /^\/kontakt(\/|$)/;
/** Tool pages: no scroll motion at all (neither cables nor process lists), lines stay static. */
const WERKZEUG_SEITE = /^\/(raumplaner|planer)(\/|$)/;

let ohneScroll: (() => void) | null = null;
let ohneZeiger: (() => void) | null = null;
let beobachter: IntersectionObserver | null = null;
let laedt = false;
let journeyGestartet = false;

/** Elements whose visibility starts the scroll motion (sections of the cables, process lists). */
function scrollZiele(doc: Document, pfad: string): Element[] {
  if (WERKZEUG_SEITE.test(pfad)) return [];
  const ziele: Element[] = [...doc.querySelectorAll('[data-prozess]')];
  if (!FORMULAR_SEITE.test(pfad)) {
    for (const linie of doc.querySelectorAll('[data-leitung]')) ziele.push(linie.closest('section') ?? linie.parentElement ?? linie);
  }
  return ziele;
}

async function scrollLaden() {
  if (laedt || ohneScroll) return;
  laedt = true;
  try {
    const modul = await import('./scroll.ts');
    if (reduzierteBewegung() || ohneScroll) return;
    ohneScroll = modul.initScroll();
    if (journeyGestartet || !document.querySelector('[data-journey]')) return;
    journeyGestartet = true;
    const { initJourney } = await import('../../islands/journey/steuerung.ts');
    initJourney(modul);
  } finally {
    laedt = false;
  }
}

function beobachtenBeenden() {
  beobachter?.disconnect();
  beobachter = null;
}

function starten() {
  if (reduzierteBewegung()) return;
  if (feinerZeiger() && !ohneZeiger) ohneZeiger = initZeiger();
  if (ohneScroll || laedt || beobachter) return;
  // The journey pins and lays out its panels: start at once, as before.
  if (document.querySelector('[data-journey]')) return void scrollLaden();
  const ziele = scrollZiele(document, location.pathname);
  if (!ziele.length) return;
  if (!('IntersectionObserver' in window)) return void scrollLaden();
  // Half a viewport ahead: GSAP is ready before a line or process reaches its start position,
  // so the static drawing never visibly jumps back to the scroll-linked state.
  beobachter = new IntersectionObserver(
    (eintraege) => {
      if (!eintraege.some((e) => e.isIntersecting)) return;
      beobachtenBeenden();
      void scrollLaden();
    },
    { rootMargin: '0px 0px 50% 0px' },
  );
  for (const z of ziele) beobachter.observe(z);
}

starten();

aufReduceAenderung((reduce) => {
  if (reduce) {
    beobachtenBeenden();
    ohneScroll?.();
    ohneZeiger?.();
    ohneScroll = null;
    ohneZeiger = null;
  } else {
    starten();
  }
});
