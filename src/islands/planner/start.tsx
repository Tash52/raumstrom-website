// Entry of the planner chunk (dynamic import from the /raumplaner/ page script only).
import { createRoot } from 'react-dom/client';
import type { Stilpaket } from '../../lib/materials/index.ts';
import { Planer } from './Planer.tsx';

export function startePlaner(host: HTMLElement, opt: { webgl: boolean; leicht: boolean; stilpakete?: Stilpaket[] }): () => void {
  const root = createRoot(host);
  root.render(<Planer webgl={opt.webgl} leicht={opt.leicht} stilpakete={opt.stilpakete ?? []} />);
  return () => root.unmount();
}
