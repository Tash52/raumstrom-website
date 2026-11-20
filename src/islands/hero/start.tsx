// Entry of the 3D chunk for the hero (dynamic import from steuerung.ts). React, R3F and three.js
// are only downloaded when this module is requested.
// Start in short tasks: geometry first (stepwise), then the React mount as a transition (time-sliced),
// then shader warm-up (Vorwaermen) before the first frame.
import { startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import { HeroSzene, baueHeroGeometrie } from './HeroSzene.tsx';
import type { SzenenSteuerung } from './takt.tsx';

export async function starteHero(host: HTMLElement, s: SzenenSteuerung, opt: { leicht: boolean; dpr: [number, number] }): Promise<() => void> {
  const bau = await baueHeroGeometrie(opt.leicht);
  const root = createRoot(host);
  startTransition(() => root.render(<HeroSzene s={s} leicht={opt.leicht} dpr={opt.dpr} bau={bau} />));
  return () => root.unmount();
}
