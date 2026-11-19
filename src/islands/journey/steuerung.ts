// Journey controller: the three pillars as a pinned, horizontally scrolling customer journey
// (desktop, motion allowed). Without that: a plain grid of cards with poster images (static markup).
// 3D turntable on top when darf3D() allows it; posters stay underneath as fallback.
// State: [data-journey-zustand] = statisch | gepinnt | laedt | 3d | poster-fertig | fallback.
import { darf3D, merkeSchwach, testSchalter, wennRuhig, wennSichtbar } from '../../lib/motion/umgebung.ts';
import { aufPause, istPausiert, zeigePauseKnopf } from '../../lib/motion/pause.ts';
import type { SzenenSteuerung } from '../hero/takt.tsx';

type Gsap = typeof import('../../lib/motion/scroll.ts');

const MQ_PIN = '(min-width: 64em) and (min-height: 37.5em) and (prefers-reduced-motion: no-preference)';

export function initJourney({ gsap, ScrollTrigger }: Gsap): void {
  const root = document.querySelector<HTMLElement>('[data-journey]');
  if (!root) return;
  const spur = root.querySelector<HTMLElement>('[data-journey-spur]');
  const buehne = root.querySelector<HTMLElement>('[data-journey-canvas]');
  const panels = [...root.querySelectorAll<HTMLElement>('[data-journey-panel]')];
  const knoten = [...root.querySelectorAll<HTMLElement>('[data-journey-knoten]')];
  if (!spur || !buehne || panels.length < 2) return;
  const n = panels.length;
  const setze = (z: string, grund?: string) => {
    root.dataset.journeyZustand = z;
    if (grund) root.dataset.journeyGrund = grund;
  };
  setze('statisch');

  const { poster } = testSchalter();
  if (poster?.startsWith('journey-')) {
    posterModus(root, buehne, Number(poster.slice(8)), setze);
    return;
  }
  if (document.documentElement.dataset.motion === 'reduce') return;

  const mm = gsap.matchMedia();
  mm.add(MQ_PIN, () => {
    root.classList.add('journey-aktiv');
    setze('gepinnt');
    const s: SzenenSteuerung = { ziel: 0, pausiert: istPausiert(), sichtbar: false, poster: false, zeigerX: 0, zeigerY: 0 };
    let aktiv = -1;
    const markieren = (t: number) => {
      const i = Math.round(t);
      if (i === aktiv) return;
      aktiv = i;
      root.dataset.aktiv = String(i);
      knoten.forEach((k, j) => {
        k.classList.toggle('ist-aktiv', j === i);
        k.classList.toggle('ist-durch', j < i);
      });
      panels.forEach((p, j) => p.classList.toggle('ist-aktiv', j === i));
    };
    markieren(0);

    const kopf = () => (document.querySelector('header.kopf')?.getBoundingClientRect().height ?? 0) + 16;
    const tween = gsap.to(spur, {
      xPercent: (-100 * (n - 1)) / n,
      ease: 'none',
      scrollTrigger: {
        trigger: root,
        pin: true,
        start: () => `top top+=${kopf()}`,
        end: () => `+=${window.innerHeight * 0.9 * (n - 1)}`,
        scrub: 0.5,
        snap: { snapTo: 1 / (n - 1), duration: { min: 0.15, max: 0.45 }, ease: 'power1.inOut', delay: 0.08 },
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          s.ziel = self.progress * (n - 1);
          markieren(s.ziel);
          s.anstossen?.();
        },
        onToggle: (self) => {
          s.sichtbar = self.isActive || isNearViewport(root);
          s.anstossen?.();
        },
      },
    });
    const st = tween.scrollTrigger!;

    // Keyboard: a focused link in a panel that is translated away scrolls its panel into place.
    const fokus = (e: FocusEvent) => {
      const i = panels.findIndex((p) => p.contains(e.target as Node));
      if (i < 0 || i === aktiv) return;
      window.scrollTo({ top: st.start + ((st.end - st.start) * i) / (n - 1), behavior: 'instant' });
    };
    root.addEventListener('focusin', fokus);

    const io = new IntersectionObserver(([e]) => {
      s.sichtbar = Boolean(e?.isIntersecting);
      s.anstossen?.();
    });
    io.observe(root);
    const ohnePause = aufPause((p) => {
      s.pausiert = p;
      s.anstossen?.();
    });

    let beenden: (() => void) | null = null;
    let abbrechen = () => {};
    const d = darf3D();
    if (d.ok) {
      abbrechen = wennSichtbar(
        root,
        () =>
          wennRuhig(async () => {
            if (!root.classList.contains('journey-aktiv')) return;
            setze('laedt');
            try {
              const { starteJourney } = await import('./start.tsx');
              s.bereit = () => {
                root.classList.add('journey-3d-an');
                setze('3d');
                zeigePauseKnopf(root);
              };
              s.urteil = () => {
                merkeSchwach();
                beenden?.();
                beenden = null;
                root.classList.remove('journey-3d-an');
                setze('fallback', 'fps');
              };
              beenden = starteJourney(buehne, s, [1, 1.75]);
            } catch {
              setze('fallback', 'ladefehler');
            }
          }),
        '60% 0px',
      );
    } else {
      root.dataset.journeyGrund = d.grund;
    }

    ScrollTrigger.refresh();
    return () => {
      abbrechen();
      beenden?.();
      io.disconnect();
      ohnePause();
      root.removeEventListener('focusin', fokus);
      root.classList.remove('journey-aktiv', 'journey-3d-an');
      panels.forEach((p) => p.classList.remove('ist-aktiv'));
      setze('statisch');
    };
  });
}

function isNearViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > -window.innerHeight * 0.5 && r.top < window.innerHeight * 1.5;
}

/** ?poster=journey-<i>: render one object alone for the poster images (tooling only). */
function posterModus(root: HTMLElement, buehne: HTMLElement, i: number, setze: (z: string) => void) {
  root.classList.add('journey-poster');
  const s: SzenenSteuerung = { ziel: i, pausiert: true, sichtbar: true, poster: true, zeigerX: 0, zeigerY: 0 };
  s.bereit = () => {
    root.classList.add('journey-3d-an');
    requestAnimationFrame(() => requestAnimationFrame(() => setze('poster-fertig')));
  };
  void import('./start.tsx').then(({ starteJourney }) => starteJourney(buehne, s, [2, 2]));
}
