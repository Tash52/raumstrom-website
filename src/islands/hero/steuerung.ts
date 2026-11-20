// Hero controller (small, in the page bundle). Decides poster vs. 3D, loads the 3D chunk only when the
// hero is visible and after the first interaction or 2 s after load (then in an idle period), maps scroll to the opening progress, and falls back
// to the poster on reduced motion, missing WebGL, weak devices or a failed FPS check.
// State for tests and debugging: [data-hero-zustand] = poster | laedt | 3d | poster-fertig | fallback.
import { abgeben, darf3D, feinerZeiger, aufReduceAenderung, merkeSchwach, nachInteraktionOderSpaeter, testSchalter, wennSichtbar } from '../../lib/motion/umgebung.ts';
import { aufPause, istPausiert, zeigePauseKnopf } from '../../lib/motion/pause.ts';
import { P_START, aktiveStufe, fortschrittAusScroll } from './wand.ts';
import type { SzenenSteuerung } from './takt.tsx';

export function initHero(): void {
  const root = document.querySelector<HTMLElement>('[data-hero]');
  const host = root?.querySelector<HTMLElement>('[data-hero-canvas]');
  if (!root || !host) return;
  const setze = (zustand: string, grund?: string) => {
    root.dataset.heroZustand = zustand;
    if (grund) root.dataset.heroGrund = grund;
  };

  const entscheidung = darf3D();
  if (!entscheidung.ok) {
    setze('poster', entscheidung.grund);
    return;
  }

  const { poster, erzwingen } = testSchalter();
  const posterP = poster === 'hero' ? Number(new URLSearchParams(location.search).get('p') ?? P_START) : null;
  const stufen = [...root.querySelectorAll<HTMLElement>('[data-hero-stufe]')];
  const s: SzenenSteuerung = {
    ziel: posterP ?? P_START,
    pausiert: istPausiert(),
    sichtbar: true,
    poster: posterP !== null,
    zeigerX: 0,
    zeigerY: 0,
  };

  let beenden: (() => void) | null = null;
  let beendet = false;
  const weg: Array<() => void> = [];
  let letzteStufe = -1;

  const scrollen = () => {
    if (s.poster) return;
    const r = root.getBoundingClientRect();
    s.ziel = fortschrittAusScroll(-r.top / Math.max(1, r.height * 0.8));
    const a = aktiveStufe(s.ziel);
    if (a !== letzteStufe) {
      letzteStufe = a;
      stufen.forEach((el, i) => {
        el.classList.toggle('ist-offen', i < a);
        el.classList.toggle('ist-aktiv', i === a);
      });
    }
    s.anstossen?.();
  };

  const abbauen = (zustand: string, grund: string) => {
    weg.splice(0).forEach((f) => f());
    root.classList.remove('hero-3d-an');
    beenden?.();
    beenden = null;
    setze(zustand, grund);
  };

  const starten = async () => {
    setze('laedt');
    try {
      const { starteHero } = await import('./start.tsx');
      await abgeben(); // chunk evaluation and scene setup in separate tasks
      if (beendet) return setze('poster', 'reduzierte-bewegung');
      const klein = window.innerWidth < 640 || (navigator.hardwareConcurrency ?? 8) <= 4;
      s.bereit = () => {
        root.classList.add('hero-3d-an');
        if (s.poster) {
          requestAnimationFrame(() => requestAnimationFrame(() => setze('poster-fertig')));
          return;
        }
        setze('3d');
        zeigePauseKnopf(root);
        scrollen();
      };
      s.urteil = (_u, fps) => {
        root.dataset.heroFps = fps.toFixed(0);
        if (erzwingen) return; // tests/tooling on software rendering
        merkeSchwach();
        abbauen('fallback', 'fps');
      };
      const ende = await starteHero(host, s, { leicht: klein && !s.poster, dpr: s.poster ? [2, 2] : klein ? [1, 1.5] : [1, 2] });
      if (beendet) {
        ende();
        return setze('poster', 'reduzierte-bewegung');
      }
      beenden = ende;
    } catch {
      abbauen('fallback', 'ladefehler');
      return;
    }

    if (s.poster) return;
    window.addEventListener('scroll', scrollen, { passive: true });
    weg.push(() => window.removeEventListener('scroll', scrollen));

    const io = new IntersectionObserver(([e]) => {
      s.sichtbar = Boolean(e?.isIntersecting);
      s.anstossen?.();
    });
    io.observe(root);
    weg.push(() => io.disconnect());

    weg.push(
      aufPause((p) => {
        s.pausiert = p;
        s.anstossen?.();
      }),
    );

    if (feinerZeiger()) {
      const zeiger = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || !s.sichtbar) return;
        s.zeigerX = (e.clientX / window.innerWidth) * 2 - 1;
        s.zeigerY = (e.clientY / window.innerHeight) * 2 - 1;
        s.anstossen?.();
      };
      window.addEventListener('pointermove', zeiger, { passive: true });
      weg.push(() => window.removeEventListener('pointermove', zeiger));
    }
  };

  aufReduceAenderung((reduce) => {
    if (!reduce) return;
    beendet = true;
    if (beenden) abbauen('poster', 'reduzierte-bewegung');
  });

  if (s.poster) {
    void starten();
    return;
  }
  // Poster is the LCP; the 3D start (chunk eval, scene, shaders) must not compete with load or TBT.
  wennSichtbar(root, () => nachInteraktionOderSpaeter(() => void starten()), '0px');
}
