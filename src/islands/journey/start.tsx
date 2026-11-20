// Entry of the 3D chunk for the journey (dynamic import from steuerung.ts).
import { createRoot } from 'react-dom/client';
import { JourneySzene } from './JourneySzene.tsx';
import type { SzenenSteuerung } from '../hero/takt.tsx';

export function starteJourney(host: HTMLElement, s: SzenenSteuerung, dpr: [number, number]): () => void {
  const root = createRoot(host);
  root.render(<JourneySzene s={s} dpr={dpr} />);
  return () => root.unmount();
}
