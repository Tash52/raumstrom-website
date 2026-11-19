// Entry of the 3D chunk for the hero (dynamic import from steuerung.ts). React, R3F and three.js
// are only downloaded when this module is requested.
import { createRoot } from 'react-dom/client';
import { HeroSzene } from './HeroSzene.tsx';
import type { SzenenSteuerung } from './takt.tsx';

export function starteHero(host: HTMLElement, s: SzenenSteuerung, opt: { leicht: boolean; dpr: [number, number] }): () => void {
  const root = createRoot(host);
  root.render(<HeroSzene s={s} leicht={opt.leicht} dpr={opt.dpr} />);
  return () => root.unmount();
}
