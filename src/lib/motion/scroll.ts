// Scroll-linked motion with GSAP ScrollTrigger (loaded only when motion is allowed):
// - Leitung: the cable in the left gutter of every section ([data-leitung]) draws itself while the
//   reader scrolls, so one line seems to run through the whole page; its node switches on when reached.
// - Prozess: the process cable ([data-prozess]) powers up step by step.
// Only transform/opacity and classes; without JS everything is drawn completely (static markup).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };

/** Line head sits at this viewport height; sections and process use the same value so they connect. */
const KOPF = 'top 82%';
const aufraeumen: Array<() => void> = [];

/**
 * Switch `ist-an` on once the scroll position passes `start` and keep it on down to the page end.
 * (toggleClass with end 'max' switched it off again at the very bottom, where progress is exactly 1.)
 */
function einschalten(el: HTMLElement, start: string) {
  const stellen = (self: ScrollTrigger) => el.classList.toggle('ist-an', self.progress > 0);
  ScrollTrigger.create({ trigger: el, start, end: 'max', onToggle: stellen, onRefresh: stellen });
}

function leitungen(ctx: gsap.Context) {
  ctx.add(() => {
    for (const linie of document.querySelectorAll<HTMLElement>('[data-leitung]')) {
      const section = linie.closest('section') ?? linie.parentElement!;
      // Opacity snaps in at the start so the glow is not smeared while the line has zero height.
      gsap
        .timeline({ scrollTrigger: { trigger: section, start: KOPF, end: 'bottom 82%', scrub: 0.35 } })
        .fromTo(linie, { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: 1 }, 0)
        .fromTo(linie, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.02 }, 0);
      const knoten = section.querySelector<HTMLElement>('[data-leitung-knoten]');
      if (knoten) {
        einschalten(knoten, KOPF);
      }
    }
  });
}

function prozesse(ctx: gsap.Context) {
  ctx.add(() => {
    for (const p of document.querySelectorAll<HTMLElement>('[data-prozess]')) {
      const strom = p.querySelector<HTMLElement>('[data-prozess-strom]');
      const schritte = [...p.querySelectorAll<HTMLElement>('[data-prozess-schritt]')];
      if (!strom || schritte.length < 2) continue;
      p.classList.add('prozess-aktiv');
      // Overlay runs from the first to the last node (measured, the step texts vary in height).
      const messen = () => {
        const knoten = schritte.map((s) => s.querySelector('.ablauf-knoten') ?? s);
        const w = p.getBoundingClientRect();
        const a = knoten[0]!.getBoundingClientRect();
        const b = knoten.at(-1)!.getBoundingClientRect();
        strom.style.top = `${a.top - w.top + a.height / 2}px`;
        strom.style.height = `${b.top - a.top}px`;
      };
      messen();
      ScrollTrigger.addEventListener('refreshInit', messen);
      aufraeumen.push(() => ScrollTrigger.removeEventListener('refreshInit', messen));
      gsap.fromTo(
        strom,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: schritte[0], endTrigger: schritte.at(-1), start: 'top 70%', end: 'top 70%', scrub: 0.35 },
        },
      );
      for (const s of schritte) {
        einschalten(s, 'top 70%');
      }
    }
  });
}

/** Start all scroll effects; returns teardown (restores the static drawing). */
export function initScroll(): () => void {
  const ctx = gsap.context(() => {});
  document.documentElement.classList.add('leitung-aktiv');
  leitungen(ctx);
  prozesse(ctx);
  // Fonts and lazy images change heights after start.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  return () => {
    ctx.revert();
    aufraeumen.splice(0).forEach((f) => f());
    document.documentElement.classList.remove('leitung-aktiv');
    for (const p of document.querySelectorAll('[data-prozess]')) p.classList.remove('prozess-aktiv');
    for (const el of document.querySelectorAll('[data-leitung-knoten], [data-prozess-schritt]')) el.classList.remove('ist-an');
    for (const s of document.querySelectorAll<HTMLElement>('[data-prozess-strom]')) s.style.removeProperty('height');
  };
}
