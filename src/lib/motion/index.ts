// Motion entry (bundled module script from components/sections/Motion.astro, on every page).
// Order of cost: nothing heavy runs before load; GSAP is fetched only if motion is allowed and the
// page has something scroll-linked; the 3D chunks only from the hero/journey controllers.
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

let ohneScroll: (() => void) | null = null;
let ohneZeiger: (() => void) | null = null;
let journeyGestartet = false;

async function starten() {
  if (reduzierteBewegung()) return;
  if (feinerZeiger() && !ohneZeiger) ohneZeiger = initZeiger();
  const braucht = document.querySelector('[data-leitung], [data-prozess], [data-journey]');
  if (!braucht || ohneScroll) return;
  const modul = await import('./scroll.ts');
  if (reduzierteBewegung()) return;
  ohneScroll = modul.initScroll();
  if (journeyGestartet || !document.querySelector('[data-journey]')) return;
  journeyGestartet = true;
  const { initJourney } = await import('../../islands/journey/steuerung.ts');
  initJourney(modul);
}

void starten();

aufReduceAenderung((reduce) => {
  if (reduce) {
    ohneScroll?.();
    ohneZeiger?.();
    ohneScroll = null;
    ohneZeiger = null;
  } else {
    void starten();
  }
});
